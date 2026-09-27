'use strict';
/* =========================================================
   Game updates for the desktop app, without a new download.
   The app is a small shell around the game's web files
   (index.html, css, js, vendor). Every release also posts
   those files as one small bundle, plus a game.json saying
   which version it is. When you open the app it reads the
   latest game.json; if that game is newer, the title screen
   offers it. One click downloads the bundle, checks it,
   unpacks it into the app's data folder and restarts the
   game on it. Worlds and settings stay: they live in the
   app's storage, which is the same whichever folder the game
   runs from.
   The shell (this folder) rarely changes. When a new game
   needs a newer shell, you're sent to the Releases page for
   a fresh download instead.
   Plain Node, no Electron in here: the release script uses
   it too (see pack-game.js).
   ========================================================= */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

// bump when main.js or preload.js change in a way that new game files rely on
const SHELL = 1;
const REPO = 'Outsourcedevv/Reel-Degenerates-';
const RELEASES = `https://github.com/${REPO}/releases`;
const MANIFEST_URL = `${RELEASES}/latest/download/game.json`;
// what the game is made of: all of it, and nothing else, goes in a bundle
const GAME_PARTS = ['index.html', 'css', 'js', 'vendor'];
const SAFE_PATH = /^(index\.html|(css|js|vendor)(\/[\w.-]+)+)$/;
// where a bundle may come from: https (GitHub), or this computer (trying it out)
const OK_URL = /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)[:/])/;
const MAGIC = Buffer.from('SGBUNDLE1');
const MAX_BUNDLE = 64 * 1024 * 1024;

// '1.10.0' against '1.9.2': -1, 0 or 1
function cmpVersion(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0), pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}
// is game a newer than game b? (a higher version, or the same version built later)
function newer(a, b) {
  if (!a) return false;
  if (!b) return true;
  if (a.build && a.build === b.build) return false;
  const c = cmpVersion(a.version, b.version);
  return c > 0 || (c === 0 && Date.parse(a.time) > Date.parse(b.time));
}
const info = (g) => g && { version: g.version, build: g.build, time: g.time, title: g.title || '' };

/* ---------------- bundles: the whole game in one file ---------------- */
// every file of the game in dir: { 'js/main.js': Buffer, ... }
function readGame(dir) {
  const files = {};
  const walk = (rel) => {
    const abs = path.join(dir, rel);
    if (fs.statSync(abs).isDirectory()) {
      for (const n of fs.readdirSync(abs).sort()) if (!n.startsWith('.')) walk(rel + '/' + n);
    } else if (SAFE_PATH.test(rel)) files[rel] = fs.readFileSync(abs);
    else throw new Error(`can't bundle ${rel}: rename it (letters, numbers, dots, dashes and underscores only)`);
  };
  for (const p of GAME_PARTS) if (fs.existsSync(path.join(dir, p))) walk(p);
  if (!files['index.html']) throw new Error(`no index.html in ${dir}`);
  return files;
}
// gzip of: the magic word, the length of a header listing [path, size] for every file, the header, then the files
function packGame(files) {
  const names = Object.keys(files).sort();
  const header = Buffer.from(JSON.stringify(names.map((n) => [n, files[n].length])));
  const len = Buffer.alloc(4);
  len.writeUInt32BE(header.length);
  return zlib.gzipSync(Buffer.concat([MAGIC, len, header, ...names.map((n) => files[n])]), { level: 9 });
}
function unpackGame(gz) {
  const buf = zlib.gunzipSync(gz, { maxOutputLength: MAX_BUNDLE });
  if (!buf.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('not a game bundle');
  const hl = buf.readUInt32BE(MAGIC.length), start = MAGIC.length + 4;
  const list = JSON.parse(buf.subarray(start, start + hl).toString('utf8'));
  const files = {};
  let at = start + hl;
  for (const [name, size] of list) {
    if (typeof name !== 'string' || !SAFE_PATH.test(name) || name.split('/').includes('..') || !(size >= 0) || at + size > buf.length) throw new Error('damaged game bundle');
    files[name] = buf.subarray(at, at + size);
    at += size;
  }
  if (at !== buf.length || !files['index.html']) throw new Error('damaged game bundle');
  return files;
}
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/* ---------------- the updater ---------------- */
class Updater {
  // shipped: { version, build, time } of the game that came with the app, in shippedDir
  // dataDir: where downloaded games (and state.json, which one is in use) are kept
  // fetch: fetch(url, { signal }) → a standard Response
  constructor({ shippedDir, shipped, dataDir, fetch, manifestUrl = MANIFEST_URL }) {
    Object.assign(this, { shippedDir, shipped, dataDir, fetch, manifestUrl });
    this.state = this.load();
    this.latest = null;
    this.installing = null;
  }
  load() {
    try {
      const s = JSON.parse(fs.readFileSync(path.join(this.dataDir, 'state.json'), 'utf8'));
      return { current: s.current || null, bad: Array.isArray(s.bad) ? s.bad : [] };
    } catch (e) { return { current: null, bad: [] }; }
  }
  save() {
    fs.mkdirSync(this.dataDir, { recursive: true });
    fs.writeFileSync(path.join(this.dataDir, 'state.json'), JSON.stringify(this.state, null, 1));
  }
  isBad(g) { return !!g && this.state.bad.includes(g.build); }
  // the game to run: a downloaded one, if it's newer than the one that came with the app
  current() {
    const c = this.state.current;
    if (c && !this.isBad(c) && newer(c, this.shipped) && fs.existsSync(path.join(this.dataDir, c.dir, 'index.html'))) {
      return Object.assign({}, c, { dir: path.join(this.dataDir, c.dir), downloaded: true });
    }
    return Object.assign({}, this.shipped, { dir: this.shippedDir, downloaded: false });
  }
  // a downloaded game didn't start: never run (or offer) that build again
  markBad(g) {
    if (!g || !g.build || this.isBad(g)) return;
    this.state.bad.push(g.build);
    if (this.state.current && this.state.current.build === g.build) this.state.current = null;
    this.save();
  }
  // is there a newer game? { status: 'none' | 'available' | 'shell' (needs a fresh download) | 'error', current, latest }
  async check() {
    const cur = this.current();
    let m;
    try {
      m = await this.getJson(this.manifestUrl, 12000);
      if (!m || typeof m.version !== 'string' || !m.build || !OK_URL.test(m.url) || !/^[0-9a-f]{64}$/.test(m.sha256)) throw new Error('unexpected game.json');
    } catch (e) {
      return { status: 'error', error: e.message, current: info(cur) };
    }
    this.latest = m;
    const out = { current: info(cur), latest: info(m), notes: `${RELEASES}/tag/v${m.version}` };
    if (!newer(m, cur) || this.isBad(m)) return Object.assign(out, { status: 'none' });
    if ((m.shell || 1) > SHELL) return Object.assign(out, { status: 'shell' });
    return Object.assign(out, { status: 'available', size: m.size });
  }
  // download the newer game, check it, unpack it and make it the one to run (onProgress: 0..1)
  install(onProgress) {
    if (!this.installing) this.installing = this.doInstall(onProgress).finally(() => { this.installing = null; });
    return this.installing;
  }
  async doInstall(onProgress) {
    // (look again first: a retry always goes for what's out right now)
    const r = await this.check();
    if (r.status === 'error') throw new Error(`couldn't reach the update server (${r.error})`);
    if (r.status === 'shell') throw new Error('this version needs a fresh download of the app');
    if (r.status !== 'available') throw new Error('you already have the newest version');
    const m = this.latest;
    const gz = await this.download(m.url, m.size, onProgress);
    if (sha256(gz) !== m.sha256) throw new Error('the download was damaged, try again');
    const files = unpackGame(gz);
    // unpack next to the old one, then swap it in (a half-written game is never used)
    fs.mkdirSync(this.dataDir, { recursive: true });
    const name = `${m.version}-${m.build}`.replace(/[^\w.-]/g, '_');
    const tmp = path.join(this.dataDir, `.new-${process.pid}-${Date.now()}`);
    for (const [rel, data] of Object.entries(files)) {
      const f = path.join(tmp, ...rel.split('/'));
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, data);
    }
    const dest = path.join(this.dataDir, name);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.renameSync(tmp, dest);
    this.state.current = { version: m.version, build: m.build, time: m.time, title: m.title || '', dir: name };
    this.save();
    // (only the game in use is kept)
    for (const n of fs.readdirSync(this.dataDir)) {
      if (n !== name && n !== 'state.json') fs.rmSync(path.join(this.dataDir, n), { recursive: true, force: true });
    }
    return this.current();
  }
  async getJson(url, ms) {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
    try {
      const r = await this.fetch(url, { signal: ac.signal });
      if (!r.ok) throw new Error(`the update server said ${r.status}`);
      return await r.json();
    } finally { clearTimeout(t); }
  }
  // the whole file, reporting progress (gives up if nothing arrives for 30 seconds)
  async download(url, size, onProgress) {
    const ac = new AbortController();
    let t = setTimeout(() => ac.abort(), 30000);
    try {
      const r = await this.fetch(url, { signal: ac.signal });
      if (!r.ok) throw new Error(`the update server said ${r.status}`);
      const total = size || Number(r.headers.get('content-length')) || 0;
      const reader = r.body.getReader(), chunks = [];
      let got = 0, told = -1;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        clearTimeout(t);
        t = setTimeout(() => ac.abort(), 30000);
        chunks.push(Buffer.from(value));
        got += value.length;
        if (got > MAX_BUNDLE) throw new Error('the download is far too big');
        const p = total ? Math.min(1, got / total) : 0;
        if (onProgress && p - told >= 0.01) { told = p; onProgress(p); }
      }
      if (onProgress) onProgress(1);
      return Buffer.concat(chunks);
    } catch (e) {
      throw ac.signal.aborted ? new Error('the download stalled, check your internet and try again') : e;
    } finally { clearTimeout(t); }
  }
}

module.exports = { SHELL, REPO, RELEASES, MANIFEST_URL, GAME_PARTS, cmpVersion, newer, readGame, packGame, unpackGame, sha256, Updater };
