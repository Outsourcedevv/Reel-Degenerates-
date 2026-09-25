'use strict';
/* =========================================================
   HUD, toasts, chat feed, panels, warp effect, ending
   ========================================================= */
const UI = {
  el: {},
  panelHandler: null,
  panelTick: null,

  init() {
    ['hud', 'bucks', 'pizza', 'goal', 'ammo', 'cargo', 'nades', 'roomcode', 'planetname', 'crosshair', 'prompt', 'hint', 'actbar',
      'bossbar', 'phud', 'feed', 'chat', 'chatinput', 'toasts', 'subtitle', 'bigtitle', 'pickups', 'hurt', 'plist',
      'spectate', 'panel', 'panel-inner', 'flyhud'].forEach((id) => (this.el[id] = U.$(id)));
    this.el['panel-inner'].addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      Sound.play('click');
      if (b.dataset.act === 'close') { this.closePanel(); return; }
      if (this.panelHandler) this.panelHandler(b.dataset.act, b.dataset, b);
    });
    this.el.panel.addEventListener('mousedown', (e) => { if (e.target === this.el.panel) this.closePanel(); });
    this.el.roomcode.addEventListener('click', () => {
      try { navigator.clipboard.writeText(Net.code); this.toast('Room code copied! Send it to your friends.', 'good'); } catch (e) { /* ignore */ }
    });
  },

  show(id, on) { this.el[id].classList.toggle('hidden', !on); },

  bucks(delta, quiet) {
    const b = this.el.bucks;
    b.textContent = U.bucks(SAVE.bucks);
    if (!delta || quiet) return;
    b.classList.add('pop');
    setTimeout(() => b.classList.remove('pop'), 150);
    const f = document.createElement('div');
    f.className = 'moneyfloat';
    f.style.color = delta > 0 ? '#7dff8a' : '#ff6b6b';
    f.textContent = (delta > 0 ? '+' : '-') + U.bucks(Math.abs(delta));
    this.el.hud.appendChild(f);
    setTimeout(() => f.remove(), 1400);
  },

  hud() {
    const cap = CARGO[SAVE.cargoLvl];
    this.el.cargo.innerHTML = `${icon('bag')}<span>${SAVE.cargo.length}/${cap}</span>`;
    this.el.cargo.classList.toggle('full', SAVE.cargo.length >= cap);
    this.el.nades.innerHTML = `${icon('bomb')}<span>Goo Grenades x${SAVE.nades}</span>`;
    this.show('nades', SAVE.nades > 0);
    const pl = PLANETS[G.planet];
    let pizza = pl.pizza;
    if (pl.boss === 'zorblax') pizza = Summons.has('zorblax') ? 'WARM! (a miracle)' : SAVE.heat ? `Warming up ${SAVE.heat}/${SUMMONS.zorblax.heat}` : pizza;
    this.el.pizza.textContent = `Pizza: 3 yrs late · ${pizza}`;
    const goal = Summons.goal();
    if (this.el.goal.textContent !== goal.text) this.el.goal.textContent = goal.text;
    this.el.goal.classList.toggle('ready', !!goal.ready);
    this.el.planetname.textContent = pl.name;
    this.bucks(0);
    const p = G.player;
    document.querySelectorAll('#hotbar .slot').forEach((s) => {
      const t = s.dataset.tool;
      s.classList.toggle('on', p && p.tool === t);
      s.classList.toggle('hidden', !hasTool(t));
    });
  },

  toast(msg, cls = '', dur = 2.6) {
    const t = document.createElement('div');
    t.className = 'toast ' + cls;
    t.textContent = msg;
    this.el.toasts.appendChild(t);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, dur * 1000);
  },

  feed(html, cls = '', dur = 12) {
    const m = document.createElement('div');
    m.className = 'msg ' + cls;
    m.innerHTML = html;
    this.el.feed.appendChild(m);
    while (this.el.feed.children.length > 8) this.el.feed.firstChild.remove();
    setTimeout(() => { m.classList.add('fade'); setTimeout(() => m.remove(), 1000); }, dur * 1000);
  },

  pickup(text, color = '#fff') {
    const p = document.createElement('div');
    p.className = 'pickup';
    p.style.color = color;
    p.textContent = text;
    this.el.pickups.appendChild(p);
    while (this.el.pickups.children.length > 5) this.el.pickups.firstChild.remove();
    setTimeout(() => p.remove(), 1800);
  },

  subtitle(who, text, dur = 3.6) {
    const s = this.el.subtitle;
    s.innerHTML = `<span class="who">${U.esc(who)}:</span> ${U.esc(text)}`;
    s.classList.remove('hidden');
    clearTimeout(this._subT);
    this._subT = setTimeout(() => s.classList.add('hidden'), dur * 1000);
  },

  bigTitle(t, s = '', color = '#fff', dur = 3) {
    const b = this.el.bigtitle;
    b.querySelector('.t').textContent = t;
    b.querySelector('.t').style.color = color;
    b.querySelector('.s').textContent = s;
    b.classList.remove('hidden');
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    clearTimeout(this._bigT);
    this._bigT = setTimeout(() => b.classList.add('hidden'), dur * 1000);
  },

  prompt(text) {
    const p = this.el.prompt;
    if (!text) { if (!p.classList.contains('hidden')) p.classList.add('hidden'); return; }
    const html = `<kbd>E</kbd> ${U.esc(text)}`;
    if (p.innerHTML !== html) p.innerHTML = html;
    p.classList.remove('hidden');
  },

  action(frac, label) {
    const a = this.el.actbar;
    if (frac == null) { a.classList.add('hidden'); return; }
    a.classList.remove('hidden');
    a.querySelector('.fill').style.width = (U.clamp(frac, 0, 1) * 100).toFixed(1) + '%';
    a.querySelector('span').textContent = label || '';
  },

  hint(text) { if (this.el.hint.textContent !== text) this.el.hint.textContent = text; },

  // battery counter, bottom right, while the zapper is out
  ammo(p) {
    const a = this.el.ammo;
    const show = p.tool === 'zap' && SAVE.zap >= 0 && !p.dead && !p.ghost && (G.mode === 'planet' || G.mode === 'boss');
    a.classList.toggle('hidden', !show);
    if (!show) return;
    const mag = ZAPPERS[SAVE.zap].mag, rel = p.reloadT > 0;
    const key = rel ? 'r' + Math.round((1 - p.reloadT / p.reloadDur) * 40) : p.ammo + '/' + mag;
    if (this._ammoKey === key) return;
    this._ammoKey = key;
    a.classList.toggle('reloading', rel);
    a.classList.toggle('low', !rel && p.ammo <= mag * 0.25);
    a.querySelector('.n').innerHTML = `${rel ? 0 : p.ammo}<small>/${mag}</small>`;
    a.querySelector('.fill').style.width = ((rel ? 1 - p.reloadT / p.reloadDur : p.ammo / mag) * 100).toFixed(1) + '%';
    a.querySelector('.lbl').textContent = rel ? p.reloadMsg + '...' : p.ammo <= mag * 0.25 ? 'PRESS R TO RELOAD' : 'BATTERY · ∞ SPARES';
  },

  /* ----- panels ----- */
  openPanel(html, handler, tick, onClose) {
    if (G.panel && this.onClose) { const cb = this.onClose; this.onClose = null; cb(); }
    this.el['panel-inner'].innerHTML = `<button class="btn small x" data-act="close">${icon('close')}</button>` + html;
    this.panelHandler = handler || null;
    this.panelTick = tick || null;
    this.onClose = onClose || null;
    this.el.panel.classList.remove('hidden');
    G.panel = true;
    if (document.pointerLockElement) document.exitPointerLock();
    Sound.play('open');
  },
  setPanel(html) {
    this.el['panel-inner'].innerHTML = `<button class="btn small x" data-act="close">${icon('close')}</button>` + html;
  },
  closePanel(noLock) {
    if (!G.panel) return;
    this.el.panel.classList.add('hidden');
    this.panelHandler = null;
    this.panelTick = null;
    G.panel = null;
    Sound.play('close');
    const cb = this.onClose;
    this.onClose = null;
    if (cb) cb();
    if (!noLock) Game.lock();
  },

  hurt() {
    Post.hurt(0.7);
    const h = this.el.hurt;
    h.classList.add('on');
    setTimeout(() => h.classList.remove('on'), 80);
  },

  /* ----- boss HUD ----- */
  bossBar(on, def) {
    this.show('bossbar', on);
    this.el.hud.classList.toggle('inboss', on);
    if (!on) return;
    this.el.bossbar.querySelector('.name').textContent = def.name;
    this.el.bossbar.querySelector('.diff').textContent = '★'.repeat(def.stars) + ' ' + def.diff;
    this.el.bossbar.classList.remove('p2');
    this.bossHp(1);
  },
  bossHp(frac, p2) {
    const w = (U.clamp(frac, 0, 1) * 100).toFixed(1) + '%';
    this.el.bossbar.querySelector('.fill').style.width = w;
    this.el.bossbar.querySelector('.lag').style.width = w;
    if (p2) this.el.bossbar.classList.add('p2');
  },
  phud(on) { this.show('phud', on); this.el.phud.classList.remove('planet'); },
  // health bar on planets, only while you're hurt
  planetHp(hp) {
    if (G.mode !== 'planet') { this._php = null; return; }
    const show = hp < 99.5;
    if (show !== this._php) { this._php = show; this.show('phud', show); this.el.phud.classList.toggle('planet', show); }
    if (show) this.php(hp, 1);
  },
  php(hp, lives) {
    const f = this.el.phud;
    f.querySelector('.fill').style.width = U.clamp(hp, 0, 100) + '%';
    f.querySelector('.hp span').textContent = Math.ceil(Math.max(0, hp)) + ' HP';
    const txt = lives > 0 ? icon('heart', 'full').repeat(lives) : icon('skull');
    if (f.querySelector('.lives').innerHTML !== txt) f.querySelector('.lives').innerHTML = txt;
  },
  team(rows) {
    const html = rows.map((r) => `<div>${icon(r.out ? 'ghost' : r.hp <= 0 ? 'skull' : 'person')} ${U.esc(r.name)} ${r.out ? '(out)' : Math.max(0, Math.round(r.hp)) + 'hp'}</div>`).join('');
    const t = this.el.phud.querySelector('.team');
    if (t.innerHTML !== html) t.innerHTML = html;
  },

  plist(show) {
    this.show('plist', show);
    if (!show) return;
    const rows = [{ n: G.name + ' (you)', b: SAVE.bucks }];
    for (const r of G.remotes.values()) rows.push({ n: r.name, b: r.s.$ || 0 });
    rows.sort((a, b) => b.b - a.b);
    this.el.plist.innerHTML = `<h3>Crew ${G.online ? '· Room ' + Net.code : '· Solo'}</h3>` +
      rows.map((r, i) => `<div class="pl"><span>${i === 0 && rows.length > 1 ? icon('crown') + ' ' : ''}${U.esc(r.n)}</span><span>${U.bucks(r.b)}</span></div>`).join('');
  },

  howHtml() {
    return `<h2 class="ph">How to play</h2>
    <p class="psub">You deliver pizza. One pizza. It is three years late. Get it to Emperor Zorblax.</p>
    <div class="how">
      <div><h4>Moving</h4>
        <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move · <kbd>Shift</kbd> sprint</p>
        <p><kbd>Space</kbd> jump (double jump with Bounce Boots)</p>
        <p><kbd>E</kbd> talk / use · <kbd>Esc</kbd> pause</p>
        <p>In the ship: mouse steers, <kbd>W</kbd>/<kbd>S</kbd> throttle, <kbd>Shift</kbd> boost, <kbd>M</kbd> star map, <kbd>V</kbd> camera</p></div>
      <div><h4>Tools</h4>
        <p><kbd>1</kbd> Zapper: click to shoot, <kbd>R</kbd> reload (buy your first one at Robo-Pawn)</p>
        <p><kbd>2</kbd> Grabby Vac: hold click on glowing junk</p>
        <p><kbd>3</kbd> Laser Drill: hold click on crystals (buy on Frostbyte)</p>
        <p><kbd>4</kbd> Pizza Peel: catch pepperoni meteors (buy on Zorblax Prime)</p>
        <p><kbd>Right-click</kbd> throw Goo Grenade (boss fights)</p></div>
      <div><h4>The loop</h4>
        <p>1. Collect the planet's stuff (and zap critters!) and sell it at the shop.</p>
        <p>2. Buy gear. Guns aren't free: buy your first one!</p>
        <p>3. Find the boss's summoning item, then use it at the boss altar.</p>
        <p>4. Win, then fly your ship to the next planet.</p></div>
      <div><h4>Friends & stuff</h4>
        <p>Host a game and send friends the 5-letter code.</p>
        <p>The host is the captain and flies the ship. Anyone with a summoning item can start a boss fight.</p>
        <p>Gambling unlocks on planet 3, Luckstar.</p>
        <p><kbd>T</kbd> chat · <kbd>Tab</kbd> crew list · <kbd>M</kbd> music</p></div>
    </div>`;
  },
  showHow() {
    this.openPanel(this.howHtml() + '<div class="row2"><button class="btn" data-act="close">Got it, let\'s go</button></div>');
  },
};

/* ---------------- ending credits ---------------- */
function showEnding() {
  if (document.pointerLockElement) document.exitPointerLock();
  G.panel = true;
  Sound.playMusic('menu');
  const s = SAVE.stats;
  const cr = (a, b) => `<div class="cr"><span>${a}</span><span>${b}</span></div>`;
  const el = document.createElement('div');
  el.id = 'ending';
  el.innerHTML = `
    <button class="btn skip" data-act="done">Keep Playing</button>
    <div class="roll">
      <h1>DELIVERY COMPLETE</h1>
      <p>Emperor Zorblax opened the box.</p>
      <p>He looked at the pizza for a long time.</p>
      <p>"...It's cold."</p>
      <p style="opacity:.75">(You reheated it with a meteor. Then you fought him for ten minutes.)</p>
      <p style="font-size:44px;margin:26px 0">★☆☆☆☆</p>
      <p>Tip: <b>$0.00</b></p>
      <p>Comment: <i>"Driver was 3 years late and shot me 400 times. Pizza was cold."</i></p>
      <h2>YOUR STATS</h2>
      ${cr('Stuff collected', s.collected.toLocaleString())}
      ${cr('Bosses beaten', s.bossWins)}
      ${cr('Times died', s.deaths)}
      ${cr('Money gambled', U.bucks(s.gambled))}
      ${cr('Won gambling', U.bucks(s.won))}
      ${cr('Lost gambling', U.bucks(s.lost))}
      ${cr('Jackpots', s.jackpots)}
      <h2>CREDITS</h2>
      ${cr('Head Delivery Goober', U.esc(G.name))}
      ${cr('Emotional Support Snail', 'Gregory')}
      ${cr('Waste Management', 'Trashlord Gary (Retired)')}
      ${cr('Royal Goo Consultant', 'Queen Blorbina')}
      ${cr('Casino Compliance', 'Jackpot Jerry (Under Investigation)')}
      ${cr('Dad Jokes', 'The Abominable Snowdad')}
      ${cr('Management', 'Dave (Still Your Manager)')}
      ${cr('Pizza', 'Cold')}
      <h2>THE END?</h2>
      <p>The customer has left a review.</p>
      <p>Your manager would like to "have a quick chat."</p>
      <p>The casino is still open.</p>
      <p style="margin-top:40px;opacity:.6">Thanks for playing SPACE GOOBERS</p>
    </div>`;
  document.body.appendChild(el);
  el.querySelector('[data-act=done]').onclick = () => {
    el.remove();
    G.panel = null;
    Sound.playMusic(PLANETS[G.planet].music);
    Game.lock();
  };
}
