'use strict';
/* =========================================================
   Options (title screen and pause menu): gameplay, video,
   audio and controls, like any PC game. They're kept with
   your other settings (G.settings, saved as
   spacegoobers_settings). Fullscreen / windowed is the
   desktop app's job (window.desktop): in a browser that row
   isn't there.
   Also here: the rest of what makes this a desktop game and
   not a web page (AppShell), and the "are you sure?" box
   (Ask) for quitting.
   ========================================================= */

const pct = (v) => Math.round(v * 100) + '%';
const OPT_TABS = [['game', 'Gameplay'], ['video', 'Video'], ['audio', 'Audio'], ['controls', 'Controls']];
// k: the setting (in G.settings unless it has its own get/set). choice: [[value, label], ...] (the arrows flip
// through them), range: [min, max, step, how it's shown], button: opens something. desk: only in the desktop app
const OPT_ROWS = {
  game: [
    { k: 'fov', label: 'Field of view', desc: 'How much you can see around you.', range: [60, 90, 1, (v) => v + '°'] },
    { k: 'shake', label: 'Screen shake', desc: 'Explosions, stomps and boss slams.', choice: [[1, 'Full'], [0.5, 'Reduced'], [0, 'Off']] },
    { k: 'fps', label: 'Show FPS', desc: 'Frames per second, in the top left corner.', choice: [[false, 'Off'], [true, 'On']] },
    { k: 'ff', label: 'Friendly fire', choice: [[false, 'Off'], [true, 'On']],
      get: () => !!G.ff, set: (v) => Game.setFF(v),
      why: () => (!G.started ? 'Set in the game, by the host.' : !Net.isHost ? 'The captain (host) decides.' : ''),
      desc: () => (G.online ? 'Zaps hurt your crew (75% damage).' : 'Zaps hurt your crew. Only matters when friends join.') },
  ],
  video: [
    { k: 'display', label: 'Display mode', desc: 'Or press F11 / Alt+Enter any time.', desk: true, choice: [[true, 'Fullscreen'], [false, 'Windowed']],
      get: () => Options.full, set: (v) => window.desktop.setFullscreen(v) },
    { k: 'quality', label: 'Graphics quality', desc: 'High: glow, color grading and sharper shadows. Low runs faster.', choice: [['high', 'High'], ['low', 'Low']] },
    { k: 'res', label: 'Render resolution', desc: 'Lower it if the game runs slowly.', choice: [[1, '100%'], [0.75, '75%'], [0.5, '50%']] },
  ],
  audio: [
    { k: 'master', label: 'Master volume', range: [0, 1, 0.05, pct] },
    { k: 'vol', label: 'Sound effects', range: [0, 1, 0.05, pct] },
    { k: 'music', label: 'Music', range: [0, 1, 0.05, pct] },
    { k: 'bgMute', label: 'Mute in the background', desc: 'No sound while you\'re in another window.', choice: [[false, 'Off'], [true, 'On']] },
  ],
  controls: [
    { k: 'sens', label: 'Mouse sensitivity', range: [0.2, 3, 0.1, (v) => Number(v).toFixed(1)] },
    { k: 'invert', label: 'Invert mouse', desc: 'Push the mouse up to look down.', choice: [[false, 'Off'], [true, 'On']] },
    { k: 'keys', label: 'Keybinds', desc: 'Change any key or mouse button.', button: 'Change keys' },
  ],
};
const OPT_DEFAULTS = { sens: 1, vol: 0.7, music: 0.45, master: 1, quality: 'high', res: 1, fov: 72, shake: 1, fps: false, invert: false, bgMute: false };

const Options = {
  tab: 'game',
  full: false, // (the desktop app's window is fullscreen)

  init() {
    for (const k in OPT_DEFAULTS) if (G.settings[k] === undefined) G.settings[k] = OPT_DEFAULTS[k];
    const d = window.desktop;
    if (d && d.isFullscreen) {
      d.isFullscreen().then((v) => { this.full = !!v; }).catch(() => {});
      if (d.onDisplay) d.onDisplay((v) => { this.full = !!v; this.redraw(); });
    }
    this.showFps();
  },
  rows(tab) { return OPT_ROWS[tab].filter((r) => !r.desk || (window.desktop && window.desktop.setFullscreen)); },
  get(r) { return r.get ? r.get() : G.settings[r.k]; },

  // fromPause: closing it goes back to the pause menu
  open(fromPause, tab) {
    if (tab) this.tab = tab;
    UI.openPanel(this.html(), (act, d) => this.act(act, d));
    UI.backToPause = !!fromPause;
    this.hook();
  },
  redraw() {
    const el = UI.el['panel-inner'];
    if (!G.panel || !el.querySelector('.opts')) return;
    el.querySelector('.opts').innerHTML = this.body();
    this.hook();
  },
  html() {
    const tabs = OPT_TABS.map(([t, n]) => `<button class="stab ${t === this.tab ? 'on' : ''}" data-act="otab" data-t="${t}">${n}</button>`).join('');
    return `<h2 class="ph">Options</h2><div class="stabs">${tabs}</div><div class="opts">${this.body()}</div>
      <div class="row2"><button class="btn small" data-act="odef">Reset to defaults</button><button class="btn green" data-act="close">Done</button></div>`;
  },
  body() {
    return this.rows(this.tab).map((r) => {
      const v = this.get(r), why = r.why ? r.why() : '', desc = typeof r.desc === 'function' ? r.desc() : r.desc;
      let ctl;
      if (r.range) {
        ctl = `<div class="oslide"><input type="range" data-k="${r.k}" min="${r.range[0]}" max="${r.range[1]}" step="${r.range[2]}" value="${v}" style="--f:${this.fill(r, v)}"><b>${r.range[3](v)}</b></div>`;
      } else if (r.button) {
        ctl = `<button class="btn small" data-act="o-${r.k}">${r.button}</button>`;
      } else {
        const i = Math.max(0, r.choice.findIndex((c) => c[0] === v)), off = why ? 'disabled' : '';
        const dots = r.choice.map((c, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('');
        ctl = `<div class="ochoice ${why ? 'off' : ''}"><button data-act="oprev" data-k="${r.k}" ${off}>${icon('left')}</button>
          <b data-act="onext" data-k="${r.k}">${r.choice[i][1]}<span class="odots">${dots}</span></b><button data-act="onext" data-k="${r.k}" ${off}>${icon('right')}</button></div>`;
      }
      return `<div class="orow"><div class="olab">${r.label}${why || desc ? `<small>${U.esc(why || desc)}</small>` : ''}</div>${ctl}</div>`;
    }).join('');
  },
  // how full a slider's bar is
  fill(r, v) { return ((v - r.range[0]) / (r.range[1] - r.range[0])) * 100 + '%'; },
  // the sliders change things as you drag them
  hook() {
    UI.el['panel-inner'].querySelectorAll('.oslide input').forEach((inp) => inp.addEventListener('input', () => {
      const r = this.rows(this.tab).find((q) => q.k === inp.dataset.k);
      this.set(r, Number(inp.value));
      inp.nextElementSibling.textContent = r.range[3](Number(inp.value));
      inp.style.setProperty('--f', this.fill(r, Number(inp.value)));
    }));
  },
  act(act, d) {
    if (act === 'otab') { this.tab = d.t; UI.el['panel-inner'].querySelectorAll('.stab').forEach((b) => b.classList.toggle('on', b.dataset.t === d.t)); this.redraw(); return; }
    if (act === 'o-keys') { const back = UI.backToPause; KeybindsUI.open(back); UI.reopen = () => this.open(back, 'controls'); return; }
    if (act === 'odef') {
      Object.assign(G.settings, OPT_DEFAULTS);
      for (const k in OPT_DEFAULTS) this.changed(k);
      UI.toast('Options are back to the defaults.', 'good', 1.8);
      this.redraw();
      return;
    }
    if (act !== 'oprev' && act !== 'onext') return;
    const r = this.rows(this.tab).find((q) => q.k === d.k);
    if (!r || (r.why && r.why())) return;
    const n = r.choice.length, i = Math.max(0, r.choice.findIndex((c) => c[0] === this.get(r)));
    this.set(r, r.choice[(i + (act === 'onext' ? 1 : n - 1)) % n][0]);
    this.redraw();
  },
  set(r, v) {
    if (r.set) { r.set(v); if (r.k === 'display') this.full = v; return; }
    G.settings[r.k] = v;
    this.changed(r.k);
  },
  // a setting changed: save it and make it so
  changed(k) {
    const s = G.settings;
    lsSet('spacegoobers_settings', s);
    if (k === 'quality' || k === 'res') Post.apply();
    if (k === 'vol' || k === 'music' || k === 'master' || k === 'bgMute') Sound.setVolumes();
    if (k === 'fov' && G.player) G.player.layoutVM();
    if (k === 'fps') this.showFps();
  },

  /* ----- the FPS counter ----- */
  showFps() { U.$('fps').classList.toggle('hidden', !G.settings.fps); this.fN = 0; this.fT = 0; },
  frame(dt) {
    if (!G.settings.fps) return;
    this.fN++; this.fT += dt;
    if (this.fT >= 0.5) { U.$('fps').textContent = Math.round(this.fN / this.fT) + ' FPS'; this.fN = 0; this.fT = 0; }
  },
};

/* ---------------- are you sure? (quitting) ---------------- */
const Ask = {
  init() {
    const el = U.$('confirm');
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]');
      if (!b) return;
      Sound.play('click');
      const yes = b.dataset.c === 'yes' && this.onYes;
      this.close();
      if (yes) yes();
    });
    // Esc says no (and never gets to the pause menu underneath)
    addEventListener('keydown', (e) => {
      if (e.code !== 'Escape' || !this.isOpen()) return;
      e.preventDefault(); e.stopImmediatePropagation();
      this.close();
    }, true);
  },
  open(title, text, yes, onYes) {
    const el = U.$('confirm');
    el.querySelector('h3').textContent = title;
    el.querySelector('p').textContent = text;
    el.querySelector('[data-c="yes"]').textContent = yes;
    this.onYes = onYes;
    el.classList.remove('hidden');
    Sound.play('open');
  },
  close() { U.$('confirm').classList.add('hidden'); this.onYes = null; },
  isOpen() { return !U.$('confirm').classList.contains('hidden'); },
};

/* ---------------- a game, not a web page ---------------- */
// The game runs in Chromium (the desktop app is Electron), which still does web page things out of the box:
// Ctrl + mouse wheel zooms the page, a file dropped on the window opens it instead of the game, a button you
// clicked keeps the focus (so Space presses it again). None of that here. The desktop app does its part too
// (desktop/main.js): fullscreen, no page zoom or reloading, one copy running at a time.
const AppShell = {
  desk: () => !!(window.desktop && window.desktop.quit),
  init() {
    document.body.classList.toggle('desk', this.desk());
    addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
    addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && /^(Equal|Minus|NumpadAdd|NumpadSubtract|Digit0|Numpad0|KeyP|KeyS|KeyO|KeyU|KeyF|KeyG|KeyH|KeyJ|KeyD)$/.test(e.code)) e.preventDefault();
    }, true);
    addEventListener('dragover', (e) => e.preventDefault());
    addEventListener('drop', (e) => e.preventDefault());
    addEventListener('dragstart', (e) => { if (!(e.target.closest && e.target.closest('input'))) e.preventDefault(); });
    addEventListener('mouseup', () => { const a = document.activeElement; if (a && a.tagName === 'BUTTON') a.blur(); }, true);
    // menus tick as you move over them
    document.addEventListener('mouseover', (e) => {
      const b = e.target.closest && e.target.closest('.mitem, .ochoice button, .stab');
      if (b && b !== this.hover && !b.disabled) Sound.play('hover');
      this.hover = b;
    });
    // sound off while you're in another window (if you like it that way, see Options)
    const bg = () => { const off = !!G.settings.bgMute && (document.hidden || !document.hasFocus()); if (off !== Sound.bgMuted) { Sound.bgMuted = off; Sound.setVolumes(); } };
    addEventListener('blur', bg); addEventListener('focus', bg); document.addEventListener('visibilitychange', bg);
    this.bg = bg;
  },
  quit() {
    if (!this.desk()) return;
    try { Casino.cashOut(); persist(); Net.leave(); } catch (e) { /* quitting anyway */ }
    window.desktop.quit();
  },
};
