'use strict';
/* =========================================================
   Controls: which key (or mouse button) does what.
   Every action has one key. Change them on the Keybinds
   screen (pause menu or title screen); they're kept in this
   browser. Esc is always pause, and Enter always opens the
   chat unless you gave it another job.
   Text anywhere in the game can say {jump} or {use} and
   shows the key that's really bound (see keyText), and
   "({tool:vac})" shows the hotbar key the Grabby Vac is on
   (and nothing at all while it isn't on your hotbar).
   ========================================================= */
// action: [what it's called, default key, section of the Keybinds screen, where it works]
// (where: 'foot' walking about, 'ship' flying the ship, 'any' both. Two actions can share a key if
// they never work in the same place, like M: music on foot, the star map in the ship)
const KEY_ACTIONS = {
  forward: ['Move forward (ship: speed up)', 'KeyW', 'move', 'any'],
  back: ['Move back (ship: slow down)', 'KeyS', 'move', 'any'],
  left: ['Move left', 'KeyA', 'move', 'foot'],
  right: ['Move right', 'KeyD', 'move', 'foot'],
  jump: ['Jump (ship: lift off / up)', 'Space', 'move', 'any'],
  sprint: ['Sprint (ship: turbo)', 'ShiftLeft', 'move', 'any'],
  dash: ['Dash (Getaway Sneakers)', 'KeyF', 'move', 'foot'],
  stomp: ['Ground pound (ship: down)', 'KeyC', 'move', 'any'],
  fire: ['Shoot / use what you\'re holding', 'Mouse0', 'act', 'foot'],
  aim: ['Aim down the sights (hold)', 'Mouse2', 'act', 'foot'],
  nade: ['Throw a Goo Grenade', 'KeyQ', 'act', 'foot'],
  reload: ['Reload', 'KeyR', 'act', 'foot'],
  use: ['Talk / use / pick up (ship: get out)', 'KeyE', 'act', 'any'],
  emote: ['Emote', 'KeyG', 'act', 'foot'],
  slot1: ['Hotbar slot 1', 'Digit1', 'slots', 'foot'],
  slot2: ['Hotbar slot 2', 'Digit2', 'slots', 'foot'],
  slot3: ['Hotbar slot 3', 'Digit3', 'slots', 'foot'],
  slot4: ['Hotbar slot 4', 'Digit4', 'slots', 'foot'],
  slot5: ['Hotbar slot 5', 'Digit5', 'slots', 'foot'],
  bag: ['Backpack & crew', 'KeyI', 'menu', 'foot'],
  guide: ['What to do on this planet', 'KeyH', 'menu', 'foot'],
  chat: ['Chat', 'KeyT', 'menu', 'any'],
  crew: ['Crew list (hold)', 'Tab', 'menu', 'any'],
  music: ['Music on / off', 'KeyM', 'menu', 'foot'],
  map: ['Star map', 'KeyM', 'ship', 'ship'],
  swap: ['Swap seats', 'KeyF', 'ship', 'ship'],
  view: ['Look at the ship from outside (in the back)', 'KeyV', 'ship', 'ship'],
};
// (keys that used to be the default: a saved set of keys from before still has them, and gets the new ones)
const KEY_OLD = { 1: { nade: 'Mouse2', dash: 'KeyQ' } };
const KEY_V = 2;
const KEY_GROUPS = [['move', 'Moving'], ['act', 'Doing stuff'], ['slots', 'Hotbar'], ['menu', 'Menus & chat'], ['ship', 'The ship']];
// (both Shift keys, both Ctrl keys... count as the same key)
const normKey = (c) => (c === 'ShiftRight' ? 'ShiftLeft' : c === 'ControlRight' ? 'ControlLeft' : c === 'AltRight' ? 'AltLeft' : c === 'MetaRight' ? 'MetaLeft' : c);
const KEY_NAMES = {
  Space: 'Space', ShiftLeft: 'Shift', ControlLeft: 'Ctrl', AltLeft: 'Alt', MetaLeft: 'Meta', Tab: 'Tab', CapsLock: 'Caps Lock',
  Enter: 'Enter', Backspace: 'Backspace', Escape: 'Esc', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  Mouse0: 'Left click', Mouse1: 'Middle click', Mouse2: 'Right click', Mouse3: 'Mouse 4', Mouse4: 'Mouse 5',
  Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', IntlBackslash: '\\', Semicolon: ';',
  Quote: '\'', Comma: ',', Period: '.', Slash: '/', Insert: 'Insert', Delete: 'Del', Home: 'Home', End: 'End', PageUp: 'PgUp', PageDown: 'PgDn',
  NumpadAdd: 'Num +', NumpadSubtract: 'Num -', NumpadMultiply: 'Num *', NumpadDivide: 'Num /', NumpadDecimal: 'Num .', NumpadEnter: 'Num Enter',
};

const Keys = {
  KEY: 'spacegoobers_keys',
  map: {},        // action -> key code ('KeyW', 'Space', 'Mouse0'...)
  byCode: new Map(),
  capturing: null, // (the Keybinds screen is waiting for a key for this action)
  layout: null,    // (the keyboard's real letters, where the browser tells us: an AZERTY Z shows as Z)

  load() {
    const saved = Object.assign({}, lsGet(this.KEY, null) || {});
    for (let v = saved._v || 1; v < KEY_V; v++) for (const a in KEY_OLD[v] || {}) if (saved[a] === KEY_OLD[v][a]) delete saved[a];
    this.map = {};
    for (const a in KEY_ACTIONS) this.map[a] = typeof saved[a] === 'string' && saved[a] ? normKey(saved[a]) : KEY_ACTIONS[a][1];
    this.index();
    try { if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then((m) => { this.layout = m; }).catch(() => {}); } catch (e) { /* not here */ }
  },
  save() { lsSet(this.KEY, Object.assign({ _v: KEY_V }, this.map)); this.index(); if (typeof UI !== 'undefined' && UI.el.hud) UI.hud(); },
  index() {
    this.byCode = new Map();
    for (const a in this.map) { const c = this.map[a]; if (!this.byCode.has(c)) this.byCode.set(c, []); this.byCode.get(c).push(a); }
  },
  // does this key do anything?
  bound(code) { return this.byCode.has(normKey(code)); },
  // could these two actions ever both be wanted at the same moment?
  clash(a, b) { const wa = KEY_ACTIONS[a][3], wb = KEY_ACTIONS[b][3]; return a !== b && (wa === 'any' || wb === 'any' || wa === wb); },
  // the actions that would fight action a for this key
  clashes(a, code = this.map[a]) { return (this.byCode.get(code) || []).filter((b) => this.clash(a, b)); },
  // give action a this key. Whatever had it (and could clash) gets a's old key instead, so nothing is left
  // doubled up. Returns the actions that were swapped.
  set(a, code) {
    code = normKey(code);
    const old = this.map[a];
    if (old === code) return [];
    const swapped = this.clashes(a, code);
    for (const b of swapped) this.map[b] = old;
    this.map[a] = code;
    this.save();
    return swapped;
  },
  reset() { for (const a in KEY_ACTIONS) this.map[a] = KEY_ACTIONS[a][1]; this.save(); },
  isDefault() { return Object.keys(KEY_ACTIONS).every((a) => this.map[a] === KEY_ACTIONS[a][1]); },
  // what a key is called on screen
  label(code) {
    if (!code) return '(none)';
    const lay = this.layout && this.layout.get && this.layout.get(code);
    if (lay && /^(Key|Digit)|^(Backquote|Minus|Equal|Bracket|Semicolon|Quote|Comma|Period|Slash|Backslash|IntlBackslash)/.test(code)) return lay.length === 1 ? lay.toUpperCase() : lay;
    let m = /^Key([A-Z])$/.exec(code);
    if (m) return m[1];
    m = /^Digit(\d)$/.exec(code);
    if (m) return m[1];
    m = /^Numpad(\d)$/.exec(code);
    if (m) return 'Num ' + m[1];
    return KEY_NAMES[code] || code;
  },
  // what action a's key is called
  name(a) { return this.label(this.map[a]); },
};
Keys.load();

// the hotbar key a tool is on, in brackets (" (2)"), or nothing while it isn't on your hotbar
const toolKey = (t, html) => { const i = typeof Loadout !== 'undefined' ? Loadout.findTool(t) : -1; if (i < 0) return ''; const k = Keys.name('slot' + (i + 1)); return html ? ` (<kbd>${U.esc(k)}</kbd>)` : ` (${k})`; };
// fill in {jump}, {use}, ({tool:vac})... with the keys that really do that (see the top of this file)
function keyText(s) {
  if (typeof s !== 'string' || s.indexOf('{') < 0) return s;
  return s.replace(/ ?\(\{tool:(\w+)\}\)/g, (all, t) => toolKey(t)).replace(/\{(\w+)\}/g, (all, a) => (KEY_ACTIONS[a] ? Keys.name(a) : all));
}
// in HTML: {jump} becomes <kbd>Space</kbd>
function keyKbd(html) {
  return html.replace(/ ?\(\{tool:(\w+)\}\)/g, (all, t) => toolKey(t, true)).replace(/\{(\w+)\}/g, (all, a) => (KEY_ACTIONS[a] ? `<kbd>${U.esc(Keys.name(a))}</kbd>` : all));
}
// plain text, as HTML with the keys drawn as keys
const keyHtml = (s) => keyKbd(U.esc(s));

/* ---------------- the Keybinds screen ---------------- */
const KeybindsUI = {
  // fromPause: closing it goes back to the pause menu
  open(fromPause) {
    this.stop();
    UI.openPanel(this.html(), (act, d) => this.act(act, d), null, () => this.stop());
    UI.backToPause = !!fromPause;
  },
  html() {
    const rows = (g) => Object.keys(KEY_ACTIONS).filter((a) => KEY_ACTIONS[a][2] === g).map((a) => {
      const wait = Keys.capturing === a, clash = Keys.clashes(a).length > 0;
      return `<div class="kbrow"><span>${U.esc(KEY_ACTIONS[a][0])}</span>
        <button class="kbkey ${wait ? 'wait' : ''} ${clash ? 'clash' : ''} ${Keys.map[a] !== KEY_ACTIONS[a][1] ? 'changed' : ''}" data-act="bind" data-a="${a}">${wait ? 'Press a key...' : U.esc(Keys.name(a))}</button></div>`;
    }).join('');
    return `<h2 class="ph">Keybinds</h2>
      <p class="psub">Click a box, then press the key you want, or click the box with the mouse button you want (right, middle, side buttons). Esc cancels. Esc always pauses the game.</p>
      <div class="kbgrid">${KEY_GROUPS.map(([g, n]) => `<div class="kbgroup"><h4>${n}</h4>${rows(g)}</div>`).join('')}</div>
      <p class="tip">A key that's taken swaps over: whatever had it gets this one's old key. The mouse wheel also flips through your hotbar.</p>
      <div class="row2"><button class="btn small" data-act="kbreset" ${Keys.isDefault() ? 'disabled' : ''}>Reset to defaults</button><button class="btn green" data-act="close">Done</button></div>`;
  },
  redraw() { if (G.panel && UI.el['panel-inner'].querySelector('.kbgrid')) UI.setPanel(this.html()); },
  act(act, d) {
    if (act === 'kbreset') { this.stop(); Keys.reset(); UI.toast('Keys are back to the defaults.', 'good', 1.8); this.redraw(); return; }
    if (act !== 'bind') return;
    if (performance.now() - (this.boundAt || 0) < 350) return; // (the click that just set a mouse button)
    if (Keys.capturing === d.a) { this.stop(); this.redraw(); return; }
    this.stop();
    Keys.capturing = d.a;
    this.redraw();
    // the next key (or a mouse button pressed on this box) is the new one
    this.onKey = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (e.code === 'Escape') { this.stop(); this.redraw(); return; }
      if (!e.code) return;
      this.done(e.code);
    };
    this.onMouse = (e) => {
      const box = e.target.closest && e.target.closest('.kbkey');
      if (!box) { this.stop(); this.redraw(); return; } // (clicked somewhere else: never mind)
      if (!box.classList.contains('wait')) { this.stop(); return; } // (another box: its click picks that one next)
      // a mouse button pressed on the box. (A plain left click only counts for shooting, aiming and grenades:
      // for anything else it just means "never mind", it's too easy to do by accident.)
      if (e.button === 0 && d.a !== 'fire' && d.a !== 'nade' && d.a !== 'aim') { this.stop(); this.boundAt = performance.now(); this.redraw(); return; }
      e.preventDefault(); e.stopPropagation();
      this.boundAt = performance.now();
      this.done('Mouse' + e.button);
    };
    addEventListener('keydown', this.onKey, true);
    addEventListener('mousedown', this.onMouse, true);
  },
  done(code) {
    const a = Keys.capturing;
    this.stop();
    if (!a) return;
    const swapped = Keys.set(a, code);
    Sound.play('click');
    if (swapped.length) UI.toast(`${Keys.label(Keys.map[a])} was taken: ${swapped.map((b) => KEY_ACTIONS[b][0].replace(/ \(.*\)$/, '')).join(', ')} moved to ${Keys.name(swapped[0])}.`, '', 3);
    this.redraw();
  },
  stop() {
    Keys.capturing = null;
    if (this.onKey) removeEventListener('keydown', this.onKey, true);
    if (this.onMouse) removeEventListener('mousedown', this.onMouse, true);
    this.onKey = this.onMouse = null;
  },
};
