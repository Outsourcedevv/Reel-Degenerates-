'use strict';
/* =========================================================
   SPACE GOOBERS — shared globals & helpers
   ========================================================= */
const V3 = THREE.Vector3;

const G = {
  mode: 'menu',          // menu | planet | boss | space
  planet: 0,             // index into PLANETS
  diff: 'easy',          // world difficulty (DIFFS)
  worldId: null,
  time: 0, paused: false,
  scene: null, camera: null, renderer: null, sun: null, hemi: null,
  player: null, world: null, worlds: {}, arena: null, boss: null, liquid: null, sky: null,
  remotes: new Map(),
  online: false, isHost: true, myId: 'solo',
  name: 'Goober', color: '#ff7a3d',
  panel: null, chatting: false, locked: false, started: false,
  progress: [],          // boss ids beaten (the host's save is the source of truth)
  crew: { summons: {}, heat: 0 }, // shared crew tasks (boss summoning items, pizza warmth), run by the host
  ff: false,             // friendly fire (a world setting the host picks)
  shake: 0,
  settings: { sens: 1, vol: 0.7, music: 0.45, quality: 'high' },
};

const U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  damp: (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt)),
  rand: (a, b) => a + Math.random() * (b - a),
  randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  r2: (n) => Math.round(n * 100) / 100,
  bucks: (n) => (n < 0 ? '-' : '') + '$' + Math.floor(Math.abs(n)).toLocaleString('en-US'),
  esc: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  $: (id) => document.getElementById(id),
  seeded(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  angDiff(a, b) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  },
  weighted(list, rng = Math.random) { // list of [item, weight]
    let tot = 0;
    for (const e of list) tot += e[1];
    let r = rng() * tot;
    for (const e of list) { r -= e[1]; if (r <= 0) return e[0]; }
    return list[list.length - 1][0];
  },
  // does segment p0->p1 touch sphere (c, r)?
  segSphere(p0, p1, c, r) {
    const dx = p1.x - p0.x, dy = p1.y - p0.y, dz = p1.z - p0.z;
    const fx = p0.x - c.x, fy = p0.y - c.y, fz = p0.z - c.z;
    const L2 = dx * dx + dy * dy + dz * dz;
    const t = L2 > 0 ? U.clamp(-(fx * dx + fy * dy + fz * dz) / L2, 0, 1) : 0;
    const qx = fx + dx * t, qy = fy + dy * t, qz = fz + dz * t;
    return qx * qx + qy * qy + qz * qz <= r * r;
  },
  // squared distance from point p to a player's body (vertical segment from feet+0.3 to feet+1.7)
  bodyDist2(p, feet) {
    const y = U.clamp(p.y, feet.y + 0.3, feet.y + 1.7);
    const dx = p.x - feet.x, dy = p.y - y, dz = p.z - feet.z;
    return dx * dx + dy * dy + dz * dz;
  },
  hexToCss: (n) => '#' + n.toString(16).padStart(6, '0'),
};

/* ---------- materials: chunky cel-shaded toon look ---------- */
const TOON_GRAD = (() => {
  const d = new Uint8Array([125, 125, 125, 255, 195, 195, 195, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

const _mats = new Map();
function M(color, opts) {
  const key = String(color) + '|' + (opts ? JSON.stringify(opts) : '');
  let m = _mats.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: TOON_GRAD }, opts || {}));
    m.userData.shared = true;
    _mats.set(key, m);
  }
  return m;
}

/* ---------- geometry helpers ---------- */
function flat(geo) {
  let g = geo;
  if (geo.index) { g = geo.toNonIndexed(); geo.dispose(); }
  g.computeVertexNormals();
  return g;
}
function mk(geo, color, parent, x = 0, y = 0, z = 0, opts) {
  const mat = color && color.isMaterial ? color : M(color, opts);
  const m = new THREE.Mesh(flat(geo), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
// set rotation / scale fluently
function tf(o, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  o.rotation.set(rx, ry, rz);
  o.scale.set(sx, sy, sz);
  return o;
}
function grp(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
}
const BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const CYL = (rt, rb, h, s = 8, open = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open);
const SPH = (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
const HEMI = (r, w = 10, h = 5) => new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2, 0, Math.PI / 2);
const ICO = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
const DOD = (r) => new THREE.DodecahedronGeometry(r, 0);
const OCT = (r) => new THREE.OctahedronGeometry(r, 0);
const CONE = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s);
const TOR = (r, t, rs = 6, ts = 14) => new THREE.TorusGeometry(r, t, rs, ts);

/* ---------- canvas textures & text ---------- */
const FONT = '"Chakra Petch", "Arial Narrow", Arial, sans-serif';
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  draw(c, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.anisotropy = 4;
  t.userData = t.userData || {};
  t.userData.canvas = cv;
  return t;
}
function textSprite(text, o = {}) {
  const size = o.size || 48, pad = o.pad == null ? 16 : o.pad;
  const font = `700 ${size}px ${FONT}`;
  const mc = document.createElement('canvas').getContext('2d');
  mc.font = font;
  const w = Math.ceil(mc.measureText(text).width) + pad * 2, h = Math.ceil(size * 1.4);
  const tex = canvasTex(w, h, (c) => {
    if (o.bg) { c.fillStyle = o.bg; roundRect(c, 0, 0, w, h, h * 0.3); c.fill(); }
    c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (o.stroke) { c.lineWidth = size * 0.18; c.strokeStyle = o.stroke; c.lineJoin = 'round'; c.strokeText(text, w / 2, h / 2 + size * 0.05); }
    c.fillStyle = o.color || '#fff';
    c.fillText(text, w / 2, h / 2 + size * 0.05);
  });
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: o.depthTest !== false, fog: false });
  const s = new THREE.Sprite(mat);
  const sc = o.scale || 0.01;
  s.scale.set(w * sc, h * sc, 1);
  s.renderOrder = o.order || 10;
  return s;
}
// a flat sign with one or more lines of text
function signMesh(lines, w, h, o = {}) {
  lines = Array.isArray(lines) ? lines : [lines];
  const px = Math.min(1024, Math.round(w * 128)), py = Math.min(1024, Math.round(h * 128));
  const tex = canvasTex(px, py, (c) => {
    c.fillStyle = o.bg || '#2b1d14';
    roundRect(c, 0, 0, px, py, Math.min(px, py) * 0.12); c.fill();
    if (o.border !== false) {
      c.lineWidth = Math.min(px, py) * 0.06; c.strokeStyle = o.border || '#ffd23f';
      roundRect(c, c.lineWidth / 2, c.lineWidth / 2, px - c.lineWidth, py - c.lineWidth, Math.min(px, py) * 0.1); c.stroke();
    }
    const n = lines.length;
    let fs = (py * 0.72) / n;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    lines.forEach((ln, i) => {
      let f = fs * (i === 0 && n > 1 ? 1.05 : 0.85);
      c.font = `700 ${f}px ${FONT}`;
      while (c.measureText(ln).width > px * 0.88 && f > 8) { f -= 2; c.font = `700 ${f}px ${FONT}`; }
      c.fillStyle = (o.colors && o.colors[i]) || o.color || '#ffffff';
      if (o.glow) { c.shadowColor = c.fillStyle; c.shadowBlur = f * 0.35; }
      c.fillText(ln, px / 2, (py / n) * (i + 0.5) + f * 0.04);
    });
  });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: !!o.transparent, side: o.double ? THREE.DoubleSide : THREE.FrontSide });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

function disposeObj(o) {
  o.traverse((c) => {
    if (c.geometry) c.geometry.dispose();
    if (c.material && !c.material.userData.shared) {
      if (c.material.map) c.material.map.dispose();
      c.material.dispose();
    }
  });
}

// glue several non-indexed geometries into one, flat-shaded
function mergeGeos(list) {
  let n = 0;
  for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3);
  let off = 0;
  for (const g of list) { pos.set(g.attributes.position.array, off); off += g.attributes.position.array.length; g.dispose(); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

/* ---------- merge static meshes by material (big draw-call saver) ---------- */
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  root.traverse((o) => {
    if (!o.isMesh || !o.material || !o.material.userData.shared || o.geometry.index) return;
    if (o.material.transparent) return;
    let p = o, skip = false;
    while (p && p !== root) { if (p.userData.dynamic) { skip = true; break; } p = p.parent; }
    if (skip) return;
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(o);
  });
  const v = new V3(), nm = new THREE.Matrix3();
  for (const [mat, meshes] of buckets) {
    if (meshes.length < 2) continue;
    let count = 0;
    for (const m of meshes) count += m.geometry.attributes.position.count;
    const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3);
    let off = 0;
    for (const m of meshes) {
      const pa = m.geometry.attributes.position, na = m.geometry.attributes.normal;
      nm.getNormalMatrix(m.matrixWorld);
      for (let i = 0; i < pa.count; i++) {
        v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld);
        pos[off * 3] = v.x; pos[off * 3 + 1] = v.y; pos[off * 3 + 2] = v.z;
        v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
        nor[off * 3] = v.x; nor[off * 3 + 1] = v.y; nor[off * 3 + 2] = v.z;
        off++;
      }
      m.parent.remove(m);
      m.geometry.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.computeBoundingSphere();
    const mm = new THREE.Mesh(geo, mat);
    mm.castShadow = true; mm.receiveShadow = true;
    root.add(mm);
  }
}
// the same trick for a model that moves around (an NPC, a snail): its parts get merged in the
// model's own space, so it can still be moved as a whole. Anything under `keep` (a head that turns,
// a wheel that spins) and any mesh flagged userData.keep stays separate.
function mergeLocal(root, keep = []) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const walk = (o) => {
    for (const c of o.children) {
      if (keep.includes(c)) continue;
      if (c.isMesh && !c.userData.keep && !c.children.length && c.material && c.material.userData.shared && !c.material.transparent && !c.geometry.index) {
        if (!buckets.has(c.material)) buckets.set(c.material, []);
        buckets.get(c.material).push(c);
      }
      walk(c);
    }
  };
  walk(root);
  const v = new V3(), rel = new THREE.Matrix4(), nm = new THREE.Matrix3();
  for (const [mat, meshes] of buckets) {
    if (meshes.length < 2) continue;
    let count = 0;
    for (const m of meshes) count += m.geometry.attributes.position.count;
    const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3);
    let off = 0, shadow = false;
    for (const m of meshes) {
      rel.multiplyMatrices(inv, m.matrixWorld);
      nm.getNormalMatrix(rel);
      const pa = m.geometry.attributes.position, na = m.geometry.attributes.normal;
      for (let i = 0; i < pa.count; i++, off++) {
        v.fromBufferAttribute(pa, i).applyMatrix4(rel);
        pos[off * 3] = v.x; pos[off * 3 + 1] = v.y; pos[off * 3 + 2] = v.z;
        v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
        nor[off * 3] = v.x; nor[off * 3 + 1] = v.y; nor[off * 3 + 2] = v.z;
      }
      shadow = shadow || m.castShadow;
      m.parent.remove(m);
      m.geometry.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.computeBoundingSphere();
    const mm = new THREE.Mesh(geo, mat);
    mm.castShadow = shadow; mm.receiveShadow = true;
    root.add(mm);
  }
  return root;
}

/* ---------- save data (per player name, in this browser) ---------- */
const SAVE_DEFAULT = {
  bucks: 100, zap: -1, cargoLvl: 0, vacLvl: 0, // zap -1 = no gun yet
  drill: false, boots: false, socks: false, armor: false, lifeIns: false, charm: false, peel: false,
  nades: 0, cargo: [], hats: ['none'], hat: 'none',
  beaten: [], seenIntro: false,
  summons: {}, pity: {}, heat: 0, // boss summoning items held, tries since the last drop, pizza warmth
  graves: [], // where you died and dropped your stuff: [{gid, p, x, y, z, items}] (see Drops.graveDrop)
  stats: { collected: 0, gambled: 0, won: 0, lost: 0, deaths: 0, jackpots: 0, bossWins: 0 },
};
let SAVE = JSON.parse(JSON.stringify(SAVE_DEFAULT));
let SAVE_KEY = null;
function loadSaveKey(key) {
  SAVE_KEY = key;
  const fresh = JSON.parse(JSON.stringify(SAVE_DEFAULT));
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const d = JSON.parse(raw);
      SAVE = Object.assign(fresh, d);
      SAVE.stats = Object.assign(JSON.parse(JSON.stringify(SAVE_DEFAULT.stats)), d.stats || {});
    } else SAVE = fresh;
  } catch (e) { SAVE = fresh; }
  Wardrobe.apply(); // your hats come with you
}
const nameKey = (name) => name.toLowerCase().replace(/\s+/g, '_');
// the old one-save-per-name format (still used if you join a host running an old version)
function loadSave(name) { loadSaveKey('spacegoobers_v1_' + nameKey(name)); }

/* ---------- worlds: separate playthroughs, like save slots ----------
   Solo and host games run in one of your worlds. When you join a friend,
   your stuff in *their* world is kept in a guest save for that world. */
const Worlds = {
  list() { return lsGet('spacegoobers_worlds', []); },
  store(l) { lsSet('spacegoobers_worlds', l); },
  key: (id) => 'spacegoobers_world_' + id,
  guestKey: (worldId, name) => 'spacegoobers_guest_' + worldId + '_' + nameKey(name),
  create(name, diff) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const l = this.list();
    l.push({ id, name: (name || '').trim().slice(0, 24) || 'World ' + (l.length + 1), created: Date.now(), played: Date.now(), diff: DIFFS[diff] ? diff : 'easy' });
    this.store(l);
    return id;
  },
  remove(id) {
    this.store(this.list().filter((w) => w.id !== id));
    try { localStorage.removeItem(this.key(id)); } catch (e) { /* ignore */ }
  },
  diff(id) { const w = this.list().find((x) => x.id === id); return (w && DIFFS[w.diff]) ? w.diff : 'easy'; },
  ff(id) { const w = this.list().find((x) => x.id === id); return !!(w && w.ff); },
  setFF(id, on) { this.store(this.list().map((w) => (w.id === id ? Object.assign(w, { ff: !!on }) : w))); },
  load(id) {
    loadSaveKey(this.key(id));
    this.store(this.list().map((w) => (w.id === id ? Object.assign(w, { played: Date.now() }) : w)));
  },
  // quick facts for the world picker
  info(id) {
    const d = lsGet(this.key(id), null) || {};
    return { planet: d.planet || 0, beaten: (d.beaten || []).length, bucks: d.bucks == null ? SAVE_DEFAULT.bucks : d.bucks };
  },
  // saves from before worlds existed become worlds, once
  migrate() {
    if (lsGet('spacegoobers_worlds', null) !== null) return;
    const l = [];
    try {
      // collect the keys first: adding worlds while looping shuffles localStorage's order
      const old = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('spacegoobers_v1_')) old.push(k); }
      for (const k of old) {
        const id = 'old' + l.length + Date.now().toString(36);
        localStorage.setItem(this.key(id), localStorage.getItem(k));
        const who = k.slice('spacegoobers_v1_'.length).replace(/_/g, ' ');
        l.push({ id, name: who + "'s world", created: Date.now(), played: Date.now() - l.length });
      }
    } catch (e) { /* storage off: no worlds to bring over */ }
    this.store(l);
  },
};
function persist() {
  if (!SAVE_KEY) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* private mode etc. */ }
  Wardrobe.sync();
}

/* ---------- your hats belong to YOU, not to a world ----------
   The hats you own and the one you're wearing are kept once for this browser, so they
   come with you into every world (friends' worlds too), and survive a Hardcore world
   being deleted. Only ever added to: a hat can't get lost. */
const Wardrobe = {
  KEY: 'spacegoobers_wardrobe',
  last: '',
  load() {
    const w = lsGet(this.KEY, null);
    if (w && Array.isArray(w.hats)) return w;
    // the first time: collect the hats from every save you already have (wearing the newest world's)
    const hats = new Set(['none']), played = {};
    let hat = 'none', newest = -1;
    for (const x of Worlds.list()) played[Worlds.key(x.id)] = x.played || 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !/^spacegoobers_(world|guest|v1)_/.test(k)) continue;
        const d = JSON.parse(localStorage.getItem(k) || '{}');
        for (const h of d.hats || []) if (HATS[h]) hats.add(h);
        if (d.hat && HATS[d.hat] && (played[k] || 0) > newest) { newest = played[k] || 0; hat = d.hat; }
      }
    } catch (e) { /* storage off */ }
    return { hats: [...hats], hat };
  },
  // a save was just loaded: it gets every hat you own, and your hat goes on
  apply() {
    const w = this.load();
    const hats = new Set(['none', ...(SAVE.hats || []), ...w.hats].filter((h) => HATS[h]));
    SAVE.hats = [...hats];
    SAVE.hat = hats.has(w.hat) ? w.hat : 'none';
    this.sync(true);
  },
  // (on every save) new hats, or a different one on your head: remember that for every world
  sync(force) {
    const s = SAVE.hat + '|' + SAVE.hats.join(',');
    if (s === this.last && !force) return;
    this.last = s;
    const hats = new Set([...this.load().hats, ...SAVE.hats].filter((h) => HATS[h]));
    lsSet(this.KEY, { hats: [...hats], hat: HATS[SAVE.hat] ? SAVE.hat : 'none' });
  },
};
/* ---------- backpack entries ----------
   An entry is an item id, optionally with a style multiplier baked in: "crab:big*1.5".
   cargoRes() turns an entry into what the shop needs: its name, value and icon. */
const _cargoCache = new Map();
function cargoRes(entry) {
  let r = _cargoCache.get(entry);
  if (r) return r;
  const i = entry.indexOf('*');
  const key = i < 0 ? entry : entry.slice(0, i);
  const mult = i < 0 ? 1 : Number(entry.slice(i + 1)) || 1;
  const base = RES[key] || { name: key, v: 0, icon: 'box', desc: 'No idea what this is.' };
  r = mult === 1 ? base : Object.assign({}, base, { name: `${base.name} · x${mult} style`, v: Math.round(base.v * mult), mult });
  _cargoCache.set(entry, r);
  return r;
}
const cargoFree = () => CARGO[SAVE.cargoLvl] - SAVE.cargo.length;

function addBucks(n, quiet) {
  SAVE.bucks = Math.max(0, Math.round(SAVE.bucks + n));
  if (typeof UI !== 'undefined') UI.bucks(n, quiet);
  persist();
}
function gambleStat(bet, payout) {
  SAVE.stats.gambled += bet;
  const net = payout - bet;
  if (net > 0) SAVE.stats.won += net; else SAVE.stats.lost += -net;
}
function lsGet(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
