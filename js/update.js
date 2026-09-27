'use strict';
/* =========================================================
   Updates, in the desktop app. When a newer version of the
   game is out, the title screen says so: one click downloads
   it (well under a megabyte) and the game restarts on the new
   version. Your worlds, settings and look stay as they are.
   (The app does the work, see desktop/updater.js. In a
   browser there's nothing to do: the page is always the
   newest one, and there's no window.desktop.)
   ========================================================= */
const Updates = {
  started: false,

  // the title screen is up: tell the app the game started fine, then look for a newer version
  init() {
    const d = window.desktop;
    if (!d || this.started) return;
    this.started = true;
    d.ready();
    if (!d.checkUpdate) return;
    d.checkUpdate().then((r) => this.show(r)).catch(() => {});
  },
  // the game didn't make it to the title screen (the app goes back to a version that works)
  failed(why) {
    const d = window.desktop;
    if (d && d.failed) d.failed(why);
  },

  show(r) {
    this.info = r;
    if (!r || (r.status !== 'available' && r.status !== 'shell')) return;
    const L = r.latest, same = r.current && r.current.version === L.version;
    const ver = `v${U.esc(L.version)}${same ? ' <small>(with fixes)</small>' : ''}`;
    const have = r.current ? `<small>You have v${U.esc(r.current.version)}</small>` : '';
    const title = L.title ? `<p class="utitle">${U.esc(L.title)}</p>` : '';
    if (r.status === 'shell') {
      this.draw(`<div class="uhead">${icon('download')}New version out</div><div class="uver">${ver} ${have}</div>${title}
        <p class="usub">This one needs a fresh download of the app (just this once).</p>
        <div class="ubtns"><button class="btn green" data-u="page">Download it</button><button class="btn small ghost" data-u="later">Later</button></div>`);
      return;
    }
    const mb = r.size ? ` (${(r.size / 1048576).toFixed(1)} MB)` : '';
    this.draw(`<div class="uhead">${icon('download')}Update available</div><div class="uver">${ver} ${have}</div>${title}
      <div class="ubtns"><button class="btn green" data-u="go">Update now${mb}</button><button class="btn small ghost" data-u="notes">What's new</button><button class="btn small ghost" data-u="later">Later</button></div>
      <p class="usub">Takes a few seconds. Your worlds and settings stay.</p>`);
  },
  draw(html) {
    const el = U.$('m-update');
    el.innerHTML = html;
    el.classList.remove('hidden');
    el.querySelectorAll('[data-u]').forEach((b) => b.addEventListener('click', () => this.act(b.dataset.u)));
  },
  act(a) {
    const d = window.desktop, L = this.info && this.info.latest;
    Sound.play('click');
    if (a === 'later') U.$('m-update').classList.add('hidden');
    else if (a === 'notes' || a === 'page') d.openReleases(a === 'notes' && L ? L.version : '');
    else if (a === 'go') this.install();
  },
  install() {
    const d = window.desktop;
    this.draw(`<div class="uhead">${icon('download')}Updating</div><div class="ubar"><div></div></div><p class="usub" id="u-msg">Downloading...</p>`);
    const bar = U.$('m-update').querySelector('.ubar div'), msg = U.$('u-msg');
    d.onProgress((p) => {
      bar.style.width = (p * 100).toFixed(0) + '%';
      msg.textContent = p < 1 ? `Downloading... ${Math.round(p * 100)}%` : 'Installing...';
    });
    d.installUpdate().then((r) => {
      if (r && r.ok) {
        bar.style.width = '100%';
        msg.textContent = 'Done! Restarting the game on the new version...';
        return;
      }
      this.draw(`<div class="uhead bad">${icon('alert')}Couldn't update</div><p class="usub">${U.esc((r && r.error) || 'Something went wrong.')}</p>
        <div class="ubtns"><button class="btn green" data-u="go">Try again</button><button class="btn small ghost" data-u="later">Later</button></div>`);
    });
  },
};
