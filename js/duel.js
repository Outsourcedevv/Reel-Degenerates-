'use strict';
/* =========================================================
   Duels: the Duel Pit on Luckstar
   Walk up to the pit, pick a crewmate who's on Luckstar and a wager, and challenge them. If they accept, you both
   go to the arena, each pick one of the guns you own, and after 3-2-1 it's on: your shots hurt each other (full
   damage, headshots count). It's a friendly fight: going down doesn't cost you your stuff or a life, you just lose
   the bet. The loser pays the winner the wager (each game moves its own player's money: the loser pays when they
   go down, the winner gets paid when the loser's game says so; if both go down at once, it's a draw).
   Messages ('duel', to one player): ask, yes, no, ready, win, quit.
   ========================================================= */
const DUEL = {
  wagers: [25, 100, 250, 500, 1000, 2500],
  ask: 25,      // seconds to answer a challenge
  pick: 15,     // seconds to pick a gun (then you get your best one)
  count: 3,     // 3, 2, 1, FIGHT!
  back: 4,      // seconds from the end to being back on Luckstar
  gone: 4,      // seconds the other one can be missing before the duel's off
  spot: { x: -3.5, z: 13 }, // the Duel Pit (see PlanetWorld.buildDuelPit)
  start: 8,     // how far from the middle of the arena you each start
};
const Duel = {
  cur: null,    // the duel I'm in: { id, opp, oppName, wager, side, st: 'pick' | 'count' | 'fight' | 'over', t, ... }
  asked: null,  // a challenge I sent: { id, to, name, wager, t }
  inv: null,    // a challenge I got: { id, from, name, wager, t }
  sel: null, wager: 100,

  fighting() { return !!this.cur && this.cur.st === 'fight'; },
  // (picking guns, counting down, or it's over: no moving, no shooting)
  holding() { return !!this.cur && this.cur.st !== 'fight'; },
  opp() { return this.cur ? G.remotes.get(this.cur.opp) || null : null; },
  // crewmates on this planet who could take you on
  rivals() { return [...G.remotes.values()].filter((r) => r.s.m === 'planet' && r.s.p === G.planet && !r.s.g && !r.s.d && !r.s.dn); },
  send(to, m) { Net.relay(Object.assign({ t: 'duel', to }, m)); },

  /* ----- the Duel Pit ----- */
  openBooth() {
    if (!Net.online) { UI.toast('The Duel Pit needs a crewmate: host a game and invite a friend!', '', 3); return; }
    Sound.play('click');
    const render = () => {
      const rivals = this.rivals();
      if (!rivals.find((r) => r.id === this.sel)) this.sel = rivals[0] ? rivals[0].id : null;
      const r = rivals.find((x) => x.id === this.sel), a = this.asked;
      const head = '<h2 class="ph">Duel Pit</h2><p class="psub">Wager a crewmate, pick a gun each, and fight it out in the arena. It\'s friendly: going down costs you nothing but the bet. Winner takes the wager.</p>';
      if (a) return head + `<div class="empty">Waiting for <b>${U.esc(a.name)}</b> to answer your ${U.bucks(a.wager)} challenge... <b id="duel-wait"></b></div>
        <div class="row2"><button class="btn" data-act="dcancel">Never mind</button></div>`;
      if (!rivals.length) return head + '<div class="empty">Nobody here to duel.<br>Get a crewmate to land on Luckstar!</div>';
      const theirs = r ? r.s.$ || 0 : 0;
      return head + `<h5 class="shead">Who</h5><div class="dpeople">${rivals.map((x) => `<button class="btn small ${x.id === this.sel ? 'green' : ''}" data-act="dsel" data-id="${U.esc(x.id)}">${U.esc(x.name)} <small>${U.bucks(x.s.$ || 0)}</small></button>`).join('')}</div>
        <h5 class="shead">Wager</h5><div class="dpeople">${DUEL.wagers.map((w) => `<button class="btn small ${w === this.wager ? 'green' : ''}" data-act="dwager" data-a="${w}" ${w > SAVE.bucks || w > theirs ? 'disabled' : ''}>${U.bucks(w)}</button>`).join('')}</div>
        <p class="tip">You have ${U.bucks(SAVE.bucks)}${r ? `, ${U.esc(r.name)} has ${U.bucks(theirs)}` : ''}. You can only bet what you both have.</p>
        <div class="row2"><button class="btn big" data-act="dask" ${!r || this.wager > SAVE.bucks || this.wager > theirs ? 'disabled' : ''}>Challenge ${r ? U.esc(r.name) : ''} for ${U.bucks(this.wager)}</button></div>`;
    };
    const handler = (act, d) => {
      if (act === 'dsel') this.sel = d.id;
      if (act === 'dwager') this.wager = Number(d.a);
      if (act === 'dask') this.challenge();
      if (act === 'dcancel' && this.asked) { this.send(this.asked.to, { k: 'quit', id: this.asked.id }); this.asked = null; }
      UI.setPanel(render());
    };
    this.boothOpen = true;
    this.redrawBooth = () => UI.setPanel(render());
    UI.openPanel(render(), handler,
      () => { const el = U.$('duel-wait'); if (el && this.asked) el.textContent = Math.max(0, Math.ceil(DUEL.ask - (G.time - this.asked.t))) + 's'; },
      () => { this.boothOpen = false; });
  },
  challenge() {
    const r = this.rivals().find((x) => x.id === this.sel);
    if (!r || this.wager > SAVE.bucks || this.wager > (r.s.$ || 0)) return;
    const id = Net.myId + ':' + Date.now().toString(36);
    this.asked = { id, to: r.id, name: r.name, wager: this.wager, t: G.time };
    this.send(r.id, { k: 'ask', id, wager: this.wager, name: G.name });
    Sound.play('click');
  },
  // (the booth is open: show what's changed)
  refreshBooth() { if (G.panel && this.boothOpen && this.redrawBooth) this.redrawBooth(); },

  /* ----- messages ----- */
  onMsg(m) {
    if (m.to !== Net.myId) return;
    const c = this.cur;
    switch (m.k) {
      case 'ask': {
        // (busy: in a menu, a fight, the ship, or already dueling)
        const busy = c || this.inv || G.mode !== 'planet' || G.panel || G.player.dead || G.player.down;
        if (busy) { this.send(m.from, { k: 'no', id: m.id, busy: 1 }); return; }
        this.inv = { id: m.id, from: m.from, name: String(m.name || 'Someone').slice(0, 14), wager: Math.max(0, Math.round(Number(m.wager) || 0)), t: G.time };
        this.openInvite();
        Sound.play('ding');
        return;
      }
      case 'yes':
        if (!this.asked || this.asked.id !== m.id) { this.send(m.from, { k: 'quit', id: m.id }); return; } // (too late: I gave up)
        this.cur = { id: m.id, opp: m.from, oppName: this.asked.name, wager: this.asked.wager, side: 0 };
        this.asked = null;
        this.begin();
        return;
      case 'no':
        if (!this.asked || this.asked.id !== m.id) return;
        UI.toast(m.busy ? `${this.asked.name} is busy right now. Try again in a bit.` : `${this.asked.name} said no. Chicken.`, 'bad', 3);
        this.asked = null;
        this.refreshBooth();
        return;
      case 'quit':
        if (this.inv && this.inv.id === m.id) { this.inv = null; if (G.panel && this.invOpen) UI.closePanel(); UI.toast('They took the challenge back.', '', 2.5); }
        if (c && c.id === m.id && c.st !== 'over') this.cancel(`${c.oppName} left the duel. No money changes hands.`);
        return;
      case 'ready':
        if (c && c.id === m.id) { c.oppReady = true; c.oppGun = Number(m.gun); }
        return;
      case 'win':
        if (c && c.id === m.id) this.won();
        return;
    }
  },
  // somebody wants to fight you
  openInvite() {
    const v = this.inv;
    const can = SAVE.bucks >= v.wager;
    this.invOpen = true;
    UI.openPanel(`<h2 class="ph center">Duel!</h2>
      <p class="center psub"><b>${U.esc(v.name)}</b> challenges you to a duel for <b>${U.bucks(v.wager)}</b>.</p>
      <p class="center">You each pick a gun you own and fight it out in the arena. Going down costs you nothing but the bet: the winner takes ${U.bucks(v.wager)} from the loser.</p>
      ${can ? '' : `<p class="center" style="color:#ff6b6b">You need ${U.bucks(v.wager)} to take this bet (you have ${U.bucks(SAVE.bucks)}).</p>`}
      <p class="center muted" id="duel-left"></p>
      <div class="row2"><button class="btn big green" data-act="yes" ${can ? '' : 'disabled'}>Bring it on!</button><button class="btn big" data-act="no">No thanks</button></div>`,
    (act) => { if (act === 'yes') this.accept(); else if (act === 'no') UI.closePanel(); },
    () => { const el = U.$('duel-left'); if (el && this.inv) el.textContent = `(${Math.max(0, Math.ceil(DUEL.ask - (G.time - this.inv.t)))}s to answer)`; },
    () => { this.invOpen = false; if (this.inv) { this.send(this.inv.from, { k: 'no', id: this.inv.id }); this.inv = null; } }); // (closing it is a no)
  },
  accept() {
    const v = this.inv;
    if (!v || SAVE.bucks < v.wager) return;
    this.inv = null;
    this.cur = { id: v.id, opp: v.from, oppName: v.name, wager: v.wager, side: 1 };
    this.send(v.from, { k: 'yes', id: v.id });
    this.begin();
  },

  /* ----- the duel ----- */
  // both of us: off to the arena, pick a gun
  begin() {
    const c = this.cur, p = G.player;
    if (G.panel) UI.closePanel(true);
    p.releaseTargets(); p.stopEmote();
    Shots.clear();
    Object.assign(c, { st: 'pick', t: 0, missT: 0, myReady: false, oppReady: false, lastN: -1 });
    G.mode = 'duel';
    G.world.group.visible = false;
    G.arena = Game.arena(G.planet);
    G.arena.group.visible = true;
    setAtmosphere(PLANETS[G.planet]);
    p.teleport(new V3(0, DECK_Y, c.side ? -DUEL.start : DUEL.start), c.side ? Math.PI : 0);
    p.resetLife();
    p.inv = 0; p.refill();
    UI.bossBar(true, { name: c.oppName, stars: 0, diff: `DUEL · ${U.bucks(c.wager)}` });
    UI.el.hud.classList.add('induel'); // (no hotbar: you've got the one gun)
    UI.phud(true); UI.php(p.hp); UI.team([]);
    Sound.playMusic('boss');
    if (c.side === 0) { const html = `<b>${U.esc(G.name)}</b> and <b>${U.esc(c.oppName)}</b> are dueling for <b>${U.bucks(c.wager)}</b> at the Duel Pit!`; UI.feed(html, 'ann'); Net.relay({ t: 'ann', html }); }
    this.pickGun();
  },
  // every gun you own (the Squirt Pistol too), best first
  myGuns() { return [...SAVE.guns.filter((g) => ZAPPERS[g]).sort((a, b) => b - a), -1]; },
  pickGun() {
    const c = this.cur;
    const cards = this.myGuns().map((g) => {
      const z = gunDef(g);
      return `<div class="card2"><div class="ic">${Thumbs.img('zap:' + g, '', 'gun')}</div>
        <div class="info"><h4>${U.esc(z.name)}</h4><div class="chips">${gunChips(z).slice(0, 3).map((x) => `<span>${U.esc(x)}</span>`).join('')}</div></div>
        <button class="price equip" data-act="gun" data-g="${g}">Use this</button></div>`;
    }).join('');
    UI.openPanel(`<h2 class="ph">Pick your gun</h2><p class="psub">Duel with <b>${U.esc(c.oppName)}</b> for <b>${U.bucks(c.wager)}</b>. You get one gun: pick well. <span id="duel-pick"></span></p><div class="cards hats">${cards}</div>`,
      (act, d) => { if (act === 'gun') { this.choose(Number(d.g)); UI.closePanel(); } },
      () => { const el = U.$('duel-pick'); if (el && this.cur) el.textContent = `(${Math.max(0, Math.ceil(DUEL.pick - this.cur.t))}s)`; },
      () => { if (this.cur && !this.cur.myReady) this.choose(this.myGuns()[0]); }); // (closing it: your best gun)
  },
  choose(g) {
    const c = this.cur;
    if (!c || c.myReady) return;
    c.myReady = true; c.gun = g;
    G.player.duelArm(g);
    this.send(c.opp, { k: 'ready', id: c.id, gun: g });
    UI.toast(`${gunDef(g).name} it is!`, 'good', 1.6);
  },
  // I went down: I lose, and pay up
  onHit(m) {
    const c = this.cur, p = G.player;
    if (!c || m.du !== c.id || c.st !== 'fight') return;
    let d = Math.max(1, Math.round(Number(m.dmg) || 0));
    if (SAVE.armor) d = Math.round(d * 0.7);
    if (hasPerk('collar')) d = Math.round(d * 0.75);
    p.hp -= d; p.regenT = 4;
    const kx = m.d ? m.d[0] || 0 : 0, kz = m.d ? m.d[1] || 0 : 0;
    p.vel.x += kx * 3; p.vel.z += kz * 3;
    p.act('hurt');
    UI.hurt(); Sound.play('hurt');
    G.shake = Math.max(G.shake, 0.35);
    if (p.hp <= 0) this.lose();
  },
  lose() {
    const c = this.cur, p = G.player;
    c.st = 'over'; c.t = 0; c.lost = true;
    p.hp = 0; p.dead = true; p.deadT = 0; p.stopEmote(); p.act('die');
    c.paid = Math.min(c.wager, SAVE.bucks);
    addBucks(-c.paid);
    persist();
    this.send(c.opp, { k: 'win', id: c.id });
    UI.bigTitle('YOU LOSE', `${c.oppName} wins the duel. -${U.bucks(c.paid)}`, '#ff6b6b', 3.2);
    Sound.play('lose');
  },
  won() {
    const c = this.cur;
    addBucks(c.wager);
    persist();
    if (c.lost) { // (we both went down: my loss and my win cancel out)
      UI.bigTitle('DRAW!', 'You both went down at once. Nobody pays.', '#ffd23f', 3.2);
      return;
    }
    c.st = 'over'; c.t = 0;
    UI.bigTitle('YOU WIN!', `You beat ${c.oppName}. +${U.bucks(c.wager)}`, '#7dff8a', 3.2);
    Sound.play('victory');
    const html = `<b>${U.esc(G.name)}</b> won the duel against <b>${U.esc(c.oppName)}</b> (${U.bucks(c.wager)})!`;
    UI.feed(html, 'good'); Net.relay({ t: 'ann', html, cls: 'good' });
  },
  // the duel's off (someone left): nobody pays
  cancel(why) {
    UI.toast(why, '', 3.5);
    if (this.cur && this.cur.st !== 'over') this.send(this.cur.opp, { k: 'quit', id: this.cur.id });
    this.finish();
  },
  // back to Luckstar, next to the Duel Pit
  finish() {
    const c = this.cur, p = G.player;
    this.cur = null;
    if (G.panel) UI.closePanel(true);
    if (G.mode !== 'duel') return;
    G.mode = 'planet';
    if (G.arena) G.arena.group.visible = false;
    G.world.group.visible = true;
    Shots.clear();
    UI.bossBar(false); UI.phud(false);
    UI.el.hud.classList.remove('induel');
    p.resetLife();
    const a = (c && c.side ? 0.6 : -0.6) + Math.PI / 2, x = DUEL.spot.x + Math.cos(a) * 3.5, z = DUEL.spot.z + Math.sin(a) * 3.5;
    p.teleport(new V3(x, G.world.ground(x, z, 50), z), Math.atan2(x - DUEL.spot.x, z - DUEL.spot.z));
    p.protect(GRACE.respawn);
    p.refreshGear(); // (your hotbar, as it was)
    setAtmosphere(PLANETS[G.planet]);
    Sound.playMusic(PLANETS[G.planet].music);
    Game.lock();
    UI.hud();
  },

  /* ----- every frame ----- */
  update(dt) {
    if (this.asked && G.time - this.asked.t > DUEL.ask) { UI.toast(`${this.asked.name} didn't answer.`, '', 2.5); this.send(this.asked.to, { k: 'quit', id: this.asked.id }); this.asked = null; this.refreshBooth(); }
    if (this.inv && G.time - this.inv.t > DUEL.ask) { if (this.invOpen) UI.closePanel(); else { this.send(this.inv.from, { k: 'no', id: this.inv.id }); this.inv = null; } }
    const c = this.cur;
    if (!c) return;
    c.t += dt;
    // (they left the game, or they're not in the arena any more)
    const r = this.opp();
    c.missT = r && (r.s.m === 'duel' || c.st === 'pick') ? 0 : c.missT + dt;
    if (c.st !== 'over' && (!r || c.missT > DUEL.gone)) { this.cancel(`${c.oppName} left the duel. No money changes hands.`); return; }
    if (c.st === 'pick') {
      if (!c.myReady && c.t > DUEL.pick) { if (G.panel) UI.closePanel(); else this.choose(this.myGuns()[0]); }
      if (c.myReady && !c.oppReady && c.t > DUEL.pick + 8) { this.cancel(`${c.oppName} never picked a gun. No money changes hands.`); return; }
      if (c.myReady && c.oppReady) { c.st = 'count'; c.t = 0; c.lastN = -1; }
      else if (c.myReady && G.time - (c.waitT || 0) > 3) { c.waitT = G.time; UI.bigTitle('READY', `Waiting for ${c.oppName} to pick a gun...`, '#ffffff', 3); }
    } else if (c.st === 'count') {
      const n = DUEL.count - Math.floor(c.t);
      if (n !== c.lastN) {
        c.lastN = n;
        if (n > 0) { UI.bigTitle(String(n), `${gunDef(c.gun).name} vs ${c.oppName}'s ${gunDef(c.oppGun).name}`, '#ffffff', 1); Sound.play('tick'); }
        else { c.st = 'fight'; c.t = 0; UI.bigTitle('FIGHT!', `Winner takes ${U.bucks(c.wager)}`, '#ff6b6b', 1.4); Sound.play('roar'); }
      }
    } else if (c.st === 'over' && c.t > DUEL.back) { this.finish(); return; }
    if (r) UI.bossHp((r.s.hp || 0) / 100);
    UI.php(G.player.hp);
  },
  hint() {
    const c = this.cur;
    if (!c) return '';
    if (c.st === 'pick') return c.myReady ? `Waiting for ${c.oppName} to pick a gun...` : 'Pick your gun!';
    if (c.st === 'count') return 'Get ready...';
    if (c.st === 'over') return 'Heading back to Luckstar...';
    return `DUEL vs ${c.oppName} for ${U.bucks(c.wager)} · {reload}: reload · first one down loses`;
  },
};
