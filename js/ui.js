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
      'spectate', 'deathscreen', 'panel', 'panel-inner', 'flyhud', 'gig', 'funhud', 'fuel', 'bosscall', 'threats', 'safe', 'guide', 'hotbar', 'hitmark', 'killmsg', 'payout'].forEach((id) => (this.el[id] = U.$(id)));
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

  // only touch the page when something actually changed (the HUD updates a lot)
  setHtml(el, html) { if (el._html !== html) { el._html = html; el.innerHTML = html; } },
  hud() {
    const cap = CARGO[SAVE.cargoLvl];
    this.setHtml(this.el.cargo, `${Thumbs.img('cargo:' + SAVE.cargoLvl, 'mini', 'bag')}<span>${SAVE.cargo.length}/${cap}</span>`);
    this.el.cargo.classList.toggle('full', SAVE.cargo.length >= cap);
    this.setHtml(this.el.nades, `${Thumbs.img('nade', 'mini', 'bomb')}<span>Goo Grenades x${SAVE.nades}</span>`);
    this.show('nades', SAVE.nades > 0);
    const pl = PLANETS[G.planet];
    let pizza = pl.pizza;
    if (pl.boss === 'zorblax') pizza = Summons.has('zorblax') ? 'WARM! (a miracle)' : G.crew.heat ? `Warming up ${G.crew.heat}/${SUMMONS.zorblax.heat}` : pizza;
    this.el.pizza.textContent = `Pizza: 3 yrs late · ${pizza}`;
    const goal = Summons.goal(), gt = keyText(goal.text);
    if (this.el.goal.textContent !== gt) this.el.goal.textContent = gt;
    this.el.goal.classList.toggle('ready', !!goal.ready);
    this.el.planetname.textContent = pl.name;
    this.bucks(0);
    // the hotbar: what's in each slot (and which one you have out), with the key that takes each one out.
    // Something you don't have right now (it's in your grave) keeps its spot, see-through.
    const p = G.player;
    this.setHtml(this.el.hotbar, Loadout.slots().map((it, i) => {
      const ok = Loadout.at(i), lost = !ok && Loadout.valid(it);
      return `<div class="slot ${p && p.slot === i ? 'on' : ''} ${ok ? '' : 'empty'} ${lost ? 'lost' : ''}"><span class="k">${U.esc(Keys.name('slot' + (i + 1)))}</span>` +
        `<span class="ic">${ok || lost ? Thumbs.img(Loadout.pic(it), '', Loadout.icon(it)) : ''}</span><small>${ok ? U.esc(Loadout.short(it)) : lost ? 'Lost' : 'Empty'}</small></div>`;
    }).join(''));
  },

  toast(msg, cls = '', dur = 2.6) {
    const t = document.createElement('div');
    t.className = 'toast ' + cls;
    t.textContent = keyText(msg);
    this.el.toasts.appendChild(t);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, dur * 1000);
  },

  feed(html, cls = '', dur = 12) {
    const m = document.createElement('div');
    m.className = 'msg ' + cls;
    m.innerHTML = keyText(html);
    this.el.feed.appendChild(m);
    while (this.el.feed.children.length > 8) this.el.feed.firstChild.remove();
    setTimeout(() => { m.classList.add('fade'); setTimeout(() => m.remove(), 1000); }, dur * 1000);
  },

  // pic: a picture key for what you picked up (see thumbs.js)
  pickup(text, color = '#fff', pic) {
    const p = document.createElement('div');
    p.className = 'pickup';
    p.style.color = color;
    p.innerHTML = (pic ? Thumbs.img(pic, 'mini', null) : '') + `<span>${U.esc(text)}</span>`;
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

  // everything goes black (text: a line in the dark), mid() happens while it is, then your eyes blink open
  // (see #blackout) and after() once you can see again
  blackout(text, mid, after) {
    const b = U.$('blackout');
    b.querySelector('.msg').textContent = text;
    b.className = 'on'; void b.offsetWidth; b.classList.add('dark');
    clearTimeout(this._boT);
    this._boT = setTimeout(() => {
      if (mid) mid();
      b.classList.add('wake');
      this._boT = setTimeout(() => { b.className = ''; if (after) after(); }, 2000);
    }, 2800);
  },
  // the whole screen flashes white for a moment
  flash() {
    const f = U.$('flash');
    if (!f) return;
    f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  },
  bigTitle(t, s = '', color = '#fff', dur = 3) {
    const b = this.el.bigtitle;
    b.querySelector('.t').textContent = t;
    b.querySelector('.t').style.color = color;
    b.querySelector('.s').innerHTML = keyKbd(U.esc(s)).replace(/<\/kbd>: /g, '</kbd> '); // (keys drawn as keys)
    b.classList.remove('hidden');
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    clearTimeout(this._bigT);
    this._bigT = setTimeout(() => b.classList.add('hidden'), dur * 1000);
  },

  prompt(text) {
    const p = this.el.prompt;
    if (!text) { if (!p.classList.contains('hidden')) p.classList.add('hidden'); return; }
    const html = `<kbd>${U.esc(Keys.name('use'))}</kbd> ${U.esc(keyText(text))}`;
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

  // the line of tips over the hotbar, with the keys drawn as keys: "{fire}: zap · {reload}: reload"
  hint(text) {
    text = text || '';
    if (this.el.hint._src === text) return;
    this.el.hint._src = text;
    this.el.hint.innerHTML = text.split(' · ').map(t => t.trim()).filter(Boolean).map((t) => `<span>${keyKbd(U.esc(t).replace(/^Mouse: /, '<kbd>Mouse</kbd> ')).replace(/<\/kbd>: /g, '</kbd> ')}</span>`).join('');
  },
  // what to do on this planet, step by step (shown when you land; H shows or hides it; dur: hide after that long).
  // A step starting with ! is the one thing you really need to know.
  guideOn: false,
  guide(on, dur) {
    const el = this.el.guide;
    clearTimeout(this._guideT);
    this.guideOn = !!on;
    el.classList.toggle('hidden', !on);
    if (!on) return;
    const pl = PLANETS[G.planet];
    const step = (s) => (s[0] === '!' ? `<li class="warn">${keyHtml(s.slice(1))}</li>` : `<li>${keyHtml(s)}</li>`);
    this.setHtml(el, `<h4>What to do on ${U.esc(pl.name)}</h4><ol>${pl.steps.map(step).join('')}</ol><small><kbd>${U.esc(Keys.name('guide'))}</kbd> hide or show this</small>`);
    if (dur) this._guideT = setTimeout(() => this.guide(false), dur * 1000);
  },
  // how much longer critters leave you alone (0: they don't, and it's hidden)
  safe(t) {
    const el = this.el.safe;
    const s = t > 0 ? Math.ceil(t) : 0;
    if (el._s === s) return;
    el._s = s;
    el.classList.toggle('hidden', !s);
    if (s) el.innerHTML = `${icon('shield')}<span><b>SAFE ${s}s</b> critters won't bite yet</span>`;
  },

  // battery counter, bottom right, while the zapper is out
  ammo(p) {
    const a = this.el.ammo;
    const show = p.tool === 'zap' && !p.dead && !p.ghost && (G.mode === 'planet' || G.mode === 'boss' || G.mode === 'duel');
    a.classList.toggle('hidden', !show);
    if (!show) return;
    const z = gunDef(SAVE.zap), mag = z.mag, rel = p.reloadT > 0;
    const key = SAVE.zap + (rel ? 'r' + Math.round((1 - p.reloadT / p.reloadDur) * 40) : p.ammo + '/' + mag);
    if (this._ammoKey === key) return;
    this._ammoKey = key;
    const low = !rel && z.type !== 'cutter' && p.ammo <= mag * 0.25;
    a.classList.toggle('reloading', rel);
    a.classList.toggle('low', low);
    // the beam shows how much charge is left; everything else counts shots (or cutters in hand)
    a.querySelector('.n').innerHTML = z.type === 'beam' ? `${rel ? 0 : Math.round((p.ammo / mag) * 100)}<small>%</small>` : `${rel ? 0 : p.ammo}<small>/${mag}</small>`;
    a.querySelector('.fill').style.width = ((rel ? 1 - p.reloadT / p.reloadDur : p.ammo / mag) * 100).toFixed(1) + '%';
    const what = { squirt: 'WATER', spread: 'SHELLS', lob: 'GOO', beam: 'FREEZE CHARGE', cutter: 'CUTTERS · THEY COME BACK', homing: 'WISPS', chain: 'CHARGE', rocket: 'PARCELS' }[z.type] || 'BATTERY';
    a.querySelector('.lbl').textContent = rel ? p.reloadMsg + '...' : low ? `PRESS ${Keys.name('reload').toUpperCase()} TO RELOAD` : z.type === 'cutter' ? what : what + ' · ∞ SPARES';
  },

  // Gigopolis: the delivery you're on (name null: none)
  gig(name, dist, t, dur) {
    const el = this.el.gig;
    if (!name) { if (!el.classList.contains('hidden')) el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const secs = Math.max(0, Math.ceil(t));
    this.setHtml(el.querySelector('.t'), `<small>DELIVER TO</small><b>${U.esc(name)}</b><span>${dist} m · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</span>`);
    el.querySelector('.fill').style.width = (U.clamp(t / dur, 0, 1) * 100).toFixed(1) + '%';
    el.classList.toggle('late', t < 6);
  },
  // a fun thing you're doing (Ring Run, shooting gallery, maze): what, the big number, a line under it, a bar
  // (frac null: no bar), warn: it's nearly over. label null: hide it.
  fun(label, big, sub, frac, warn) {
    const el = this.el.funhud;
    if (!label) { if (!el.classList.contains('hidden')) el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    this.setHtml(el.querySelector('.t'), `<small>${U.esc(label)}</small><b>${U.esc(big)}</b><span>${U.esc(sub || '')}</span>`);
    el.querySelector('.bar').classList.toggle('hidden', frac == null);
    if (frac != null) el.querySelector('.fill').style.width = (U.clamp(frac, 0, 1) * 100).toFixed(1) + '%';
    el.classList.toggle('late', !!warn);
  },
  // the Jet Pack's fuel gauge (only while it isn't full)
  fuel(frac, show) {
    const el = this.el.fuel;
    if (el.classList.contains('hidden') === show) el.classList.toggle('hidden', !show);
    if (show) { el.querySelector('.fill').style.width = (U.clamp(frac, 0, 1) * 100).toFixed(1) + '%'; el.classList.toggle('empty', frac <= 0.01); }
  },

  /* ----- panels ----- */
  openPanel(html, handler, tick, onClose) {
    if (PhysicalInventory.on) PhysicalInventory.close(true);
    if (G.panel && this.onClose) { const cb = this.onClose; this.onClose = null; cb(); }
    this.reopen = null;
    this.el['panel-inner'].innerHTML = `<button class="btn small x" data-act="close"><kbd>Esc</kbd>${icon('close')}</button>` + html;
    this.panelHandler = handler || null;
    this.panelTick = tick || null;
    this.onClose = onClose || null;
    this.el.panel.classList.remove('hidden');
    G.panel = true;
    Game.wantLock = false;
    Input.keys = {}; Input.pressed = {}; Input.dx = Input.dy = 0;
    if (document.pointerLockElement) document.exitPointerLock();
    if (typeof Game !== 'undefined' && Game.soft) { Game.setSoft(false); G.locked = false; } // (closing it grabs the mouse again)
    if (typeof Game !== 'undefined') Game.updatePause(); // the panel goes on top of the pause menu, never behind it
    Sound.play('open');
  },
  setPanel(html) {
    this.el['panel-inner'].innerHTML = `<button class="btn small x" data-act="close"><kbd>Esc</kbd>${icon('close')}</button>` + html;
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
    // opened from another screen (Keybinds from Options): back to that one
    const re = this.reopen;
    this.reopen = null;
    if (re) { re(); return; }
    // opened from the pause menu: go back to it instead of jumping into the game
    const back = this.backToPause;
    this.backToPause = false;
    if (!noLock && !back) Game.lock();
    Game.updatePause();
  },

  // you killed something: KILLED <what> <what it's worth>, and under that what made it worth that. lines:
  // [[x, what, kind]] (kind: 'size', 'gold', or a style bonus)
  killed(name, worth, lines) {
    const el = this.el.killmsg;
    if (!el) return;
    const x = (m) => Math.round(m * 100) / 100 + 'x';
    el.innerHTML = `<div class="k">Killed ${U.esc(name)} <b>${U.bucks(worth)}</b></div>` +
      lines.map(([m, what, kind]) => `<div class="l ${kind}"><i>${x(m)}</i> ${U.esc(what)}</div>`).join('');
    el.classList.remove('on');
    void el.offsetWidth; // (so it pops up again for the next one)
    el.classList.add('on');
  },
  // back from a boss win: what it paid (+$1,200), and the planet it opened up (if it did), just above your hotbar
  payout(amount, planet) {
    const el = this.el.payout;
    if (!el) return;
    el.innerHTML = `<div class="m">+${U.bucks(amount)}</div>` + (planet ? `<div class="u">New planet unlocked: <b>${U.esc(planet)}</b></div>` : '');
    el.classList.remove('on');
    void el.offsetWidth; // (so it plays again next time)
    el.classList.add('on');
    Sound.play('coin');
  },
  // a shot of yours landed: the hitmarker round the crosshair flashes (red for a headshot)
  hitmark(head) {
    const h = this.el.hitmark;
    if (!h) return;
    h.classList.remove('on', 'head');
    void h.offsetWidth; // (so it plays again, even hit after hit)
    h.classList.add('on');
    if (head) h.classList.add('head');
  },
  hurt() {
    Post.hurt(0.7);
    const h = this.el.hurt;
    h.classList.add('on');
    setTimeout(() => h.classList.remove('on'), 80);
  },

  /* ----- you died: lie there until you hold left click (see LocalPlayer.die) ----- */
  death(on, title, sub, note) {
    const d = this.el.deathscreen;
    d.classList.toggle('hidden', !on);
    this.el.hud.classList.toggle('dead', !!on);
    if (!on) return;
    d.querySelector('.t').textContent = title;
    d.querySelector('.s').textContent = sub || '';
    d.querySelector('.n').innerHTML = note || '';
    d.querySelector('.hold b').textContent = Keys.name('fire').toUpperCase();
    this.respawnFill(0);
  },
  respawnFill(f) {
    const fill = this.el.deathscreen.querySelector('.fill'), w = (U.clamp(f, 0, 1) * 100).toFixed(1) + '%';
    if (fill.style.width !== w) fill.style.width = w;
  },

  /* ----- boss HUD ----- */
  bossBar(on, def) {
    this.show('bossbar', on);
    this.el.hud.classList.toggle('inboss', on);
    if (!on) { this.bossCall(null); this.threatHud(null); return; }
    this.el.bossbar.querySelector('.name').textContent = def.name;
    this.el.bossbar.querySelector('.diff').textContent = '★'.repeat(def.stars) + ' ' + def.diff;
    this.el.bossbar.classList.remove('p2');
    this.bossHp(1);
  },
  // the same bar for a mini boss out on a planet (while you're close to it)
  miniBar(on, b) {
    this.show('bossbar', on);
    if (!on) { this.bossCall(null); return; }
    this.el.bossbar.querySelector('.name').textContent = b.def.name;
    this.el.bossbar.querySelector('.diff').textContent = `MINI BOSS · ${(DIFFS[G.diff] || DIFFS.easy).name.toUpperCase()}`;
    this.el.bossbar.classList.remove('p2');
    this.bossHp(b.hp / b.max, !!b.en);
  },
  bossHp(frac, p2) {
    const w = (U.clamp(frac, 0, 1) * 100).toFixed(1) + '%';
    this.el.bossbar.querySelector('.fill').style.width = w;
    this.el.bossbar.querySelector('.lag').style.width = w;
    if (p2) this.el.bossbar.classList.add('p2');
  },
  // what the boss is winding up, under its health bar: the name and a bar that fills until it goes off
  // (you: it's aimed at you). null hides it. The fight moves the bar along with bossCallSet (on game time,
  // so it stays in step with the attack even when the game runs slow).
  bossCall(name, col, you) {
    const b = this.el.bosscall;
    if (!b) return;
    if (!name) { b.classList.add('hidden'); return; }
    b.querySelector('.n').textContent = name;
    b.querySelector('.you').classList.toggle('hidden', !you);
    b.style.setProperty('--c', col || '#ffd23f');
    b.querySelector('.fill').style.width = '0%';
    b.classList.remove('hidden', 'go');
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  },
  // k: how far along the wind-up is (0-1); at 1 it goes off and fades out
  bossCallSet(k) {
    const b = this.el.bosscall;
    if (!b) return;
    const w = (U.clamp(k, 0, 1) * 100).toFixed(1) + '%', f = b.querySelector('.fill');
    if (f.style.width !== w) f.style.width = w;
    if (k >= 1 && !b.classList.contains('go')) b.classList.add('go');
  },
  /* the danger overlay in boss fights (drawn around the crosshair):
     arrows: shots about to pass close by from where you aren't looking · bossA: where the boss is when
     it's off screen · hits: where recent hits came from · cue: JUMP! / MOVE! / RUN!
     (angles are from straight ahead, clockwise; null clears it) */
  threatHud(d) {
    const cv = this.el.threats;
    if (!cv) return;
    const c = cv.getContext('2d');
    this.lastCue = d ? d.cue : null;
    if (!d) { if (this._thr) { c.clearRect(0, 0, cv.width, cv.height); this._thr = false; } return; }
    this._thr = true;
    if (cv.width !== innerWidth || cv.height !== innerHeight) { cv.width = innerWidth; cv.height = innerHeight; }
    const w = cv.width, h = cv.height, cx = w / 2, cy = h / 2, t = performance.now() / 1000;
    c.clearRect(0, 0, w, h);
    c.lineJoin = 'round';
    // where hits came from: red arcs close to the crosshair
    for (const hh of d.hits) {
      c.strokeStyle = `rgba(255,50,40,${0.85 * hh.k})`;
      c.lineWidth = 7;
      c.beginPath(); c.arc(cx, cy, 64, hh.a - Math.PI / 2 - 0.42, hh.a - Math.PI / 2 + 0.42); c.stroke();
    }
    // incoming shots: glowing wedges a bit further out, pointing at them
    for (const a of d.arrows) {
      const r = 104, x = cx + Math.sin(a.a) * r, y = cy - Math.cos(a.a) * r, s = 11 + 7 * a.k;
      c.save(); c.translate(x, y); c.rotate(a.a);
      c.globalAlpha = 0.45 + 0.55 * a.k;
      c.fillStyle = a.c; c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(0, -s); c.lineTo(s * 0.8, s * 0.55); c.lineTo(-s * 0.8, s * 0.55); c.closePath(); c.stroke(); c.fill();
      c.restore();
    }
    // the boss, when it's off screen: a big arrow near the edge of the screen
    if (d.bossA != null) {
      const rx = w * 0.4, ry = h * 0.38, x = cx + Math.sin(d.bossA) * rx, y = cy - Math.cos(d.bossA) * ry;
      c.save(); c.translate(x, y); c.rotate(d.bossA);
      c.globalAlpha = 0.75 + 0.25 * Math.sin(t * 6);
      c.fillStyle = d.bossCol; c.strokeStyle = 'rgba(0,0,0,0.75)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(0, -22); c.lineTo(18, 10); c.lineTo(0, 3); c.lineTo(-18, 10); c.closePath(); c.stroke(); c.fill();
      c.rotate(-d.bossA);
      c.font = `700 12px ${FONT}`; c.textAlign = 'center'; c.fillStyle = '#ffffff'; c.globalAlpha = 0.9;
      c.fillText('BOSS', 0, 30);
      c.restore();
    }
    // what to do about it, right under the crosshair
    if (d.cue) {
      const k = 1 + 0.08 * Math.sin(t * 16);
      c.save(); c.translate(cx, cy + 92); c.scale(k, k);
      c.font = `700 34px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,0.75)'; c.strokeText(d.cue, 0, 0);
      c.fillStyle = d.cue === 'JUMP!' ? '#7dfff0' : '#ff4a3a'; c.fillText(d.cue, 0, 0);
      c.restore();
    }
  },
  phud(on) { this.show('phud', on); this.el.phud.classList.remove('planet'); },
  // health bar on planets, only while you're hurt
  planetHp(hp) {
    if (G.mode !== 'planet') { this._php = null; return; }
    const show = hp < 99.5;
    if (show !== this._php) { this._php = show; this.show('phud', show); this.el.phud.classList.toggle('planet', show); }
    if (show) this.php(hp);
  },
  php(hp) {
    const f = this.el.phud;
    f.querySelector('.fill').style.width = U.clamp(hp, 0, 100) + '%';
    f.querySelector('.hp span').textContent = Math.ceil(Math.max(0, hp)) + ' HP';
    if (!f._heart) { f._heart = true; f.querySelector('.lives').innerHTML = icon('heart', 'full'); }
  },
  team(rows) {
    const html = rows.map((r) => `<div class="${r.down ? 'down' : ''}">${icon(r.out ? 'ghost' : r.hp <= 0 ? 'skull' : 'person')} ${U.esc(r.name)} ${r.out ? '(out)' : r.down ? 'DOWN' : Math.max(0, Math.round(r.hp)) + 'hp'}</div>`).join('');
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

  // How to Play: a field manual in tabs (a game's help screen, not one long page to scroll through)
  howTab: 'keys',
  // a row of the Controls tab: the key(s), then what it does
  keyRow(keys, what) { return `<div class="hk"><span class="keys">${keyKbd(keys)}</span><span>${keyKbd(what)}</span></div>`; },
  // the keys you need first (the Controls tab, and the intro note)
  basicKeys() {
    const r = (k, w) => this.keyRow(k, w);
    return `<div class="hkgrid">
      <div><h4>On foot</h4>${r('{forward}{left}{back}{right}', 'Move')}${r('{sprint}', 'Sprint')}${r('{jump}', 'Jump')}${r('{use}', 'Talk / use / pick up')}${r('{emote}', 'Emote')}</div>
      <div><h4>Guns &amp; tools</h4>${r('{fire}', 'Shoot / use what you\'re holding')}${r('{aim}', 'Aim down the sights (hold)')}${r('{reload}', 'Reload')}${r('{nade}', 'Throw a Goo Grenade')}${r('{slot1}-{slot5}', 'Hotbar (or the mouse wheel)')}</div>
      <div><h4>Pack &amp; help</h4>${r('{bag}', 'Physical backpack')}${r('{guide}', 'What to do on this planet')}${r('{chat}', 'Chat')}${r('{crew}', 'Crew list (hold)')}${r('<kbd>Esc</kbd>', 'Pause / close pack')}</div>
    </div>`;
  },
  howTabs() {
    return {
      keys: ['Controls', () => `${this.basicKeys()}
        <div class="hkgrid"><div><h4>Gear from the shops</h4>${this.keyRow('{dash}', 'Dash (Getaway Sneakers)')}${this.keyRow('{stomp}', 'Ground pound, in the air (Yeti Stompers)')}${this.keyRow('{jump}', 'Hold in the air: glide (Glider Cape) or fly (Jet Pack)')}</div>
        <div><h4>Flying the ship</h4>${this.keyRow('{forward}{back}', 'Throttle')}${this.keyRow('{jump}{stomp}', 'Up / down')}${this.keyRow('{sprint}', 'Turbo')}${this.keyRow('{map}', 'Star map')}${this.keyRow('{swap}', 'Swap seats')}</div>
        <div><h4>More</h4>${this.keyRow('{music}', 'Music on / off')}${this.keyRow('{view}', 'Riding in the back: look at the ship')}</div></div>
        <p class="tip">Change any key in <b>Options &gt; Controls</b>.</p>`],
      guns: ['Guns', () => `<div class="how1">
        <p><b>Your hotbar.</b> {slot1} to {slot5} take out what's in each slot. Walk into your landed ship and look at gear in its equipment locker. Pick a slot with its key, then {use} to equip. Look at the selected slot's label and {use} to stow it.</p>
        <p><b>Your pack.</b> {bag} opens a physical tray over the visible world. Click an item to select it, then use the Favourite, Drop one or Carry critter buttons. Right click toggles a favourite; double click a critter to carry it. Click a hotbar slot to select gear or put a critter back in the pack. {nade}, {reload} and {use} also work. Mouse wheel turns pockets. {bag} or Esc closes the pack.</p>
        <p><b>Guns.</b> From the hip your shots land somewhere inside the crosshair's circle; hold {aim} and they go dead on (you walk slower). The Goo Lobber, Launcher, Cryo Beam, Pizza Cutter and Wisp Caller don't aim: they're just as good from the hip. You start with a Squirt Pistol (it's terrible). Every planet sells a different real gun, and you keep every one you buy.</p>
        <p><b>Sights.</b> Hold a compatible gun and look at a scope on the equipment stand's lower rail. Press {use} to buy and fit it. Its planet must be unlocked; fitting an owned sight is free.</p>
        <p><b>Grabby Vac.</b> Hold {fire} on things to suck them up: junk, berries, chips, snow piles, pearls, litter, crusts, and critters you zapped. Ghosts too: it's the ONLY way to catch one, and you have to keep it in the middle of your screen.</p>
        <p><b>Laser Drill</b> (Frostbyte): hold {fire} on crystals. <b>Pizza Peel</b> (Zorblax Prime): catch pepperoni meteors. <b>Goo Grenades:</b> {nade}.</p></div>`],
      loop: ['The loop', () => `<div class="how1">
        <p><b>1. Collect and sell.</b> Grab the planet's stuff (and zap critters!), then press {use} at the sell station to sell everything except favourites. Buy equipment by looking at the priced item on its display and pressing {use}. {guide} shows what to do on the planet you're on.</p>
        <p><b>2. Gear up,</b> starting with a real gun.</p>
        <p><b>3. Summon the boss.</b> Find its summoning item (the whole crew works on it together), then use it at the boss altar.</p>
        <p><b>4. Fly on.</b> Win, then everyone gets in the ship and flies to the next planet. (It won't start until you beat Trashlord Gary.)</p>
        <p><b>Just for fun:</b> Planet Gloop has a Ring Run, Frostbyte a Snowman Shooting Gallery and Spookulon a hedge maze. Medals pay cash (each once). Gambling unlocks on planet 3, Luckstar.</p></div>`],
      critters: ['Critters', () => `<div class="how1">
        <p><b>Sizes.</b> From Tiny to GIANT: bigger ones are rarer, tougher and worth a lot more. Golden ones are worth 8x. When you arrive they leave you alone for a bit (watch the SAFE timer), unless you shoot first. Harder worlds have more of them.</p>
        <p><b>Bag them.</b> Zap one and it goes flying and lands in a heap: walk over and press {use} (or vacuum it up). Backpack full? It waits right there.</p>
        <p><b>Watch out.</b> A red ! means one spotted you. One crouching over a red mark is about to pounce: step aside. Lots of them throw things where you're heading: keep changing direction. Goo and snowballs slow you down.</p>
        <p><b>Mini bosses.</b> Zap 20 critters on a planet (not Scrapyard-9) and every one after that might bring its huge, crowned mini boss. It names each attack and marks it on the ground first. Everyone on the planet gets paid when it goes down.</p>
        <p><b>Style kills</b> pay extra and stack: in the air, after a 360, your last shot, long shots, double kills, revenge, headshots and more.</p></div>`],
      ship: ['Ship', () => `<div class="how1">
        <p>{use} at the ship to get in. The first one in flies, everyone else rides in the back. It only takes off once the whole crew is in.</p>
        <p><b>Flying:</b> move the mouse to aim and the ship swings round to the circle (it's big, it takes a moment). {jump} lift off / up, {stomp} down, {forward}/{back} throttle, {sprint} turbo, {map} star map. Look down through the glass floor to line up a landing.</p>
        <p>{swap} swap seats · {use} get out (on the pad) · in the back: {view} look at the ship from outside.</p></div>`],
      crew: ['Crew', () => `<div class="how1">
        <p><b>Friends.</b> Multiplayer &gt; Host a game, and send friends the 5-letter room code. Pause &gt; Crew & Money: send them money. Open your physical pack ({bag}) to drop loot. The host can turn on friendly fire in Options.</p>
        <p><b>Going down.</b> With friends around you go down instead of dying: a friend holds {use} on you to pick you up.</p>
        <p><b>Boss fights:</b> one life. Go down with friends around and they can pick you up, or you get back up by yourself after 10s (Hard: 15s, Hardcore: 20s) while one of them is still standing. If everybody's down, the boss wins.</p>
        <p><b>Dying on a planet</b> drops everything but your Grabby Vac (and the Squirt Pistol) where you fell. Hold {fire} to respawn, then follow the beam of light to get it back (only you can).</p></div>`],
    };
  },
  howHtml() {
    const T = this.howTabs(), tab = T[this.howTab] ? this.howTab : 'keys';
    const tabs = Object.entries(T).map(([k, [n]]) => `<button class="stab ${k === tab ? 'on' : ''}" data-act="howtab" data-t="${k}">${n}</button>`).join('');
    return `<h2 class="ph">How to play</h2><p class="psub">You deliver pizza. One pizza. It is three years late. Get it to Emperor Zorblax.</p>
      <div class="stabs">${tabs}</div><div class="howbody">${keyKbd(T[tab][1]())}</div>`;
  },
  // fromPause: closing it goes back to the pause menu
  showHow(fromPause) {
    const draw = () => this.howHtml() + '<div class="row2"><button class="btn green" data-act="close">Got it</button></div>';
    this.openPanel(draw(), (act, d) => { if (act === 'howtab') { this.howTab = d.t; this.setPanel(draw()); } });
    this.backToPause = !!fromPause;
  },

  /* ----- backpack & crew (press I) ----- */
  favouriteButton(id) { return '<button class="btn small favourite '+(Activities.favourite(id)?'on':'')+'" data-act="favourite" data-id="'+U.esc(id)+'" aria-pressed="'+Activities.favourite(id)+'">'+(Activities.favourite(id)?'★ Favourite':'☆ Favourite')+'</button>'; },
  openBag(tab) { if (tab === 'crew') this.openCrew(); else PhysicalInventory.open(); },
  openCrew() {
    const render = () => {
      const crew = [...G.remotes.values()];
      const body = !crew.length ? '<p class="psub">You are flying solo. Host a game and invite friends to share money and loot.</p>'
        : '<p class="psub">You have <b>' + U.bucks(SAVE.bucks) + '</b>. Send some to a crewmate:</p>' + crew.map(r =>
          '<div class="srow crewrow"><div class="ic">' + Thumbs.img(Thumbs.crewKey(r.s.c, r.s.h, r.s.lk), '', 'person') + '</div><div class="info"><b>' + U.esc(r.name) + '</b><small>' + U.bucks(r.s.$ || 0) + '</small></div><div class="gifts">' + [10,50,100,500].map(a => '<button class="btn small" data-act="give" data-id="' + U.esc(r.id) + '" data-a="' + a + '" ' + (SAVE.bucks < a ? 'disabled' : '') + '>' + U.bucks(a) + '</button>').join('') + '<button class="btn small green" data-act="givehalf" data-id="' + U.esc(r.id) + '" ' + (SAVE.bucks < 2 ? 'disabled' : '') + '>Half</button></div></div>').join('');
      return '<h2 class="ph">Crew & Money</h2><div class="wbody">' + body + '</div>';
    };
    this.openPanel(render(), (act,d) => {
      if (act === 'give') Game.giveMoney(d.id, Number(d.a));
      if (act === 'givehalf') Game.giveMoney(d.id, Math.floor(SAVE.bucks / 2));
      this.setPanel(render());
    });
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
      ${cr('Night Shift Catering', 'Count Carbula (Still Hungry)')}
      ${cr('Weather', 'Stormy McStormface (Blown Over)')}
      ${cr('Human Resources', 'CEO Chad Grindset (Let Go)')}
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
