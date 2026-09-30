'use strict';
/* =========================================================
   Achievements. On Steam they're Steam achievements (the
   desktop app passes them on, see desktop/steam.js, and
   Steam shows its own pop-up); everywhere else the game keeps
   its own list and shows its own pop-up. Either way the
   Achievements screen (title screen, pause menu) lists them.
   The ids are the API names set up on the Steamworks site:
   add every one of these there, with the same name and
   description (see STEAM.md).
   Most are checked from your save (check, run with the HUD),
   so ones earned before achievements existed turn up too;
   the rest are unlocked as they happen (unlock).
   ========================================================= */
const ACHIEVEMENTS = [
  // the delivery: a boss on every planet
  { id: 'BOSS_GARY', name: 'Taking Out the Trash', desc: 'Beat Trashlord Gary.', pic: 'boss:gary' },
  { id: 'BOSS_BLORB', name: 'Off With Her Goo', desc: 'Beat Queen Blorbina.', pic: 'boss:blorb' },
  { id: 'BOSS_JERRY', name: 'The House Always Loses', desc: 'Beat Jackpot Jerry.', pic: 'boss:jerry' },
  { id: 'BOSS_SNOWDAD', name: 'Dad Joke Overload', desc: 'Beat the Abominable Snowdad.', pic: 'boss:snowdad' },
  { id: 'BOSS_COUNT', name: 'Stake Holder', desc: 'Beat Count Carbula.', pic: 'boss:count' },
  { id: 'BOSS_STORMY', name: 'Clear Skies Ahead', desc: 'Beat Stormy McStormface.', pic: 'boss:stormy' },
  { id: 'BOSS_CHAD', name: 'Hostile Takeover', desc: 'Beat CEO Chad Grindset.', pic: 'boss:chad' },
  { id: 'BOSS_ZORBLAX', name: 'Delivered (Cold)', desc: 'Get the pizza to Emperor Zorblax. Finally.', pic: 'boss:zorblax' },
  { id: 'HARDCORE_BOSS', name: 'No Take-Backs', desc: 'Beat a boss on a Hardcore world.', pic: 'sum:gary' },
  // gearing up
  { id: 'FIRST_GUN', name: 'Liability Waiver', desc: 'Buy your first real gun.', pic: 'zap:0' },
  { id: 'ALL_GUNS', name: 'Walking Armory', desc: 'Own every gun in the galaxy.', pic: 'zap:9' },
  { id: 'SIGHT', name: 'Eyes on the Prize', desc: 'Buy a sight for a gun.', pic: 'sight:scope' },
  { id: 'RICH', name: 'Tip Jar', desc: 'Have $10,000 at once.', pic: 'prize:bucks' },
  { id: 'FIRST_FLIGHT', name: 'Late Departure', desc: 'Fly the ship to another planet.', pic: 'planet:1' },
  // critters
  { id: 'HEADSHOT', name: 'Right in the Eyestalks', desc: 'Zap a critter with a headshot.', pic: 'crit:crab' },
  { id: 'GIANT', name: 'The Bigger They Are', desc: 'Zap a GIANT critter.', pic: 'crit:hopper' },
  { id: 'GOLDEN', name: 'Gold Digger', desc: 'Zap a golden critter.', pic: 'crit:rat:gold' },
  { id: 'STYLE', name: 'Show-Off', desc: 'Zap a critter with three style bonuses at once.', pic: 'crit:dice' },
  { id: 'MINI_BOSS', name: 'Big Game Hunter', desc: 'Take down a mini boss.', pic: 'crit:blob:gold' },
  { id: 'GHOST', name: 'Spirit Vacuum', desc: 'Vacuum up a ghost on Spookulon.', pic: 'res:phantom' },
  // crew and fun
  { id: 'REVIVE', name: 'Get Up, Goober', desc: 'Pick a downed friend back up.', pic: 'life' },
  { id: 'DUEL', name: 'Pit Boss', desc: 'Win a duel in the Luckstar Duel Pit.', pic: 'zap:3' },
  { id: 'JACKPOT', name: 'Company Money', desc: 'Hit a jackpot at the Luckstar Casino.', pic: 'prize:jackpot' },
  { id: 'GOLD_MEDAL', name: 'Overachiever', desc: 'Win a gold medal in a just-for-fun challenge.', pic: 'prize:ticket' },
];
const ACH = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

const Achieve = {
  KEY: 'spacegoobers_achievements',
  got: {},        // (earned here: { id: when })
  steam: false,   // (the desktop app is connected to Steam: Steam's list is the one that counts)
  onSteam: {},
  known: false,

  init() {
    this.got = lsGet(this.KEY, {}) || {};
    const d = window.desktop;
    this.ready = (d && d.steam ? d.steam() : Promise.resolve(null)).then((s) => {
      this.steam = !!(s && s.on);
      this.info = s || null;
      if (!this.steam) return null;
      if (s.name) Game.steamName(s.name);
      return d.achieved(ACHIEVEMENTS.map((a) => a.id)).then((has) => { ACHIEVEMENTS.forEach((a, i) => { if (has[i]) this.onSteam[a.id] = true; }); });
    }).catch(() => { this.steam = false; }).then(() => { this.known = true; });
    // the Steam overlay's shortcut (Shift+Tab): it's the overlay's, not the game's (Tab alone opens your backpack),
    // and the game lets go of the mouse so you can use it (it pauses)
    addEventListener('keydown', (e) => {
      if (!this.steam || e.code !== 'Tab' || !e.shiftKey) return;
      Input.pressed.Tab = false; Input.keys.Tab = false;
      if (document.pointerLockElement) document.exitPointerLock();
    });
  },
  has(id) { return this.steam ? !!this.onSteam[id] : !!this.got[id]; },
  count() { return ACHIEVEMENTS.filter((a) => this.has(a.id)).length; },

  unlock(id) {
    if (!ACH[id] || (this.known && this.has(id))) return;
    this.ready.then(() => {
      if (this.has(id)) return;
      this.got[id] = this.got[id] || Date.now();
      lsSet(this.KEY, this.got);
      if (this.steam) { this.onSteam[id] = true; window.desktop.achieve(id); } // (Steam shows it)
      else this.popup(ACH[id]);
    });
  },

  // what your save shows (run with the HUD, so it's never far behind)
  check() {
    if (!G.started || !SAVE) return;
    const beaten = SAVE.beaten || [];
    for (const b of beaten) this.unlock('BOSS_' + String(b).toUpperCase());
    if (beaten.length && DIFFS[G.diff] && DIFFS[G.diff].perma) this.unlock('HARDCORE_BOSS');
    const guns = SAVE.guns || [];
    if (guns.some((g) => g >= 0)) this.unlock('FIRST_GUN');
    if (ZAPPERS.every((z, i) => guns.includes(i))) this.unlock('ALL_GUNS');
    if ((SAVE.sights || []).length) this.unlock('SIGHT');
    if (SAVE.bucks >= 10000) this.unlock('RICH');
    if (Object.values(SAVE.fun || {}).some((r) => r && r.medal >= 3)) this.unlock('GOLD_MEDAL');
    const st = SAVE.stats || {};
    if (st.jackpots > 0) this.unlock('JACKPOT');
    if (st.minis > 0) this.unlock('MINI_BOSS');
  },
  // you zapped a critter (see Critters.loot): its size, golden, and the style bonuses it came with
  zapped(c, styles) {
    if (styles.includes('head')) this.unlock('HEADSHOT');
    if (SIZES[c.sz] && SIZES[c.sz].v >= 9) this.unlock('GIANT');
    if (c.g) this.unlock('GOLDEN');
    if (styles.length >= 3) this.unlock('STYLE');
  },

  /* ----- "Achievement unlocked" (not on Steam: Steam shows its own) ----- */
  popup(a) {
    (this.queue = this.queue || []).push(a);
    if (!this.showing) this.next();
  },
  next() {
    const a = this.queue.shift();
    if (!a) { this.showing = false; return; }
    this.showing = true;
    let el = document.getElementById('achieve');
    if (!el) { el = document.createElement('div'); el.id = 'achieve'; document.body.appendChild(el); }
    // (a pile of them at once, like the first time an old save loads: one card for the lot)
    const more = this.queue.length >= 2 ? this.queue.splice(0).length : 0;
    el.innerHTML = more
      ? `<div class="pic">${Thumbs.img(a.pic, '', 'star')}</div><div class="txt"><small>Achievements unlocked</small><b>${more + 1} achievements</b><span>${U.esc(a.name)} and ${more} more. See Achievements.</span></div>`
      : `<div class="pic">${Thumbs.img(a.pic, '', 'star')}</div><div class="txt"><small>Achievement unlocked</small><b>${U.esc(a.name)}</b><span>${U.esc(a.desc)}</span></div>`;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    Sound.play('rare');
    setTimeout(() => { el.classList.remove('on'); setTimeout(() => this.next(), 450); }, 4800);
  },

  /* ----- the Achievements screen ----- */
  // fromPause: closing it goes back to the pause menu
  open(fromPause) {
    const n = this.count(), all = ACHIEVEMENTS.length;
    const cards = ACHIEVEMENTS.map((a) => `<div class="ach ${this.has(a.id) ? 'got' : ''}"><div class="pic">${Thumbs.img(a.pic, '', 'star')}</div>
      <div class="txt"><b>${U.esc(a.name)}</b><small>${U.esc(a.desc)}</small></div>${this.has(a.id) ? `<span class="tick">${icon('check')}</span>` : `<span class="tick">${icon('lock')}</span>`}</div>`).join('');
    UI.openPanel(`<h2 class="ph">Achievements</h2><p class="psub">${n} of ${all} unlocked${this.steam ? ' · on Steam' : ''}.</p>
      <div class="achbar"><i style="width:${(n / all) * 100}%"></i></div><div class="achs">${cards}</div>
      <div class="row2">${this.steam ? '<button class="btn small" data-act="steamach">Open in Steam</button>' : ''}<button class="btn green" data-act="close">Done</button></div>`,
    (act) => { if (act === 'steamach' && window.desktop && window.desktop.steamAchievements) window.desktop.steamAchievements(); });
    UI.backToPause = !!fromPause;
  },
};
