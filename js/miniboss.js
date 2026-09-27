'use strict';
/* =========================================================
   Mini bosses. Zap 20 critters on a planet, and from then on
   every critter you zap there has a 2.5% chance of bringing
   the planet's mini boss (see MINIBOSSES): a huge, crowned,
   very angry version of one of its critters. It hunts you
   across the planet with attacks of its own: two on Easy, a
   new one on Hard and one more on Hardcore. Like in the boss
   fights, every attack winds up first (its name shows under
   the health bar) and everything that can hurt you is marked
   on the ground (see hazards.js). Take it down and everyone
   on the planet gets paid. Not on Scrapyard-9.
   The host runs its brain and tells everyone where it is and
   what it's doing; each player checks hits on themselves.
   ========================================================= */
const MB_SEND = 1 / 8;
const MB_SIGHT = 70;   // it comes after you from this far off (and you see its health bar)
const MB_TOUCH = 0.8;  // walking into it hurts this much (x its damage). Getting run over by a charge: more.
const MB_TURN = 3;     // how fast it turns round (rad/s): it's big, so get round the side of it

/* ---------- what each attack does (host). wind: how long the wind-up is · ok(d): can it do this from
   d m away · pose: what it does while winding up · pre: marks the ground as soon as the wind-up starts
   · go: the attack itself, returns how long until the next one ---------- */
const MB_ATTACKS = {
  /* Planet Gloop: Sir Squelchalot */
  flop: {
    name: 'BELLY FLOP', wind: 0.8, pose: 'crouch', ok: (d) => d > 3 && d < 24,
    go(M, b, q) { M.leap(b, M.lead(q, 0.5), 0.95, 5.5, 3.4, M.D(b, 1.5), { ring: [9, 11, M.D(b, 0.8)], kn: 7 }); return 2.6; },
  },
  goovolley: {
    name: 'GOO VOLLEY', wind: 0.6, pose: 'rise', ok: (d) => d < 28,
    go(M, b, q) {
      const from = M.mouth(b), to = M.aim(q, from, 12, 0.9), sd = M.side(from, to);
      M.shoot([-1, 0, 1].map((k) => M.shot(from, to.clone().addScaledVector(sd, k * 2.6), 12, 'goo', M.D(b, 0.8), 0.45,
        { g: 16, tl: 1, sl: 1.5, z: { r: 2, dur: 4, d: M.D(b, 0.3), kind: 'goo', sl: 1, tk: 0.8 } })));
      return 2.4;
    },
  },
  split: {
    name: 'SPLIT!', wind: 0.9, pose: 'crouch', ok: () => true,
    go(M, b, q) { M.summon(b, 'hopper', 3, q); M.fire(M.ring(b.x, b.z, 8, 9, M.D(b, 0.6))); return 3; },
  },
  geyser: {
    name: 'GOO GEYSERS', wind: 0.6, pose: 'rise', ok: (d) => d < 30,
    go(M, b, q) {
      for (let i = 0; i < 6; i++) M.later(b, i * 0.42, () => { const p = M.lead(M.find(q) || q, 0.8); M.fire(M.slam(p.x, p.z, 1.9, 0.8, M.D(b, 1.1), { kn: 9, col: '#ff5fb8', fx: '#ff5fb8', fk: 'goo' })); });
      return 5.2;
    },
  },

  /* Luckstar: The Pit Boss */
  coinfan: {
    name: 'COIN FAN', wind: 0.55, pose: 'rise', ok: (d) => d < 30,
    go(M, b, q) {
      const from = M.mouth(b);
      M.shoot(M.fan(from, M.aim(q, from, 17, 0), 7, 1.0, 17, 'coin', M.D(b, 0.6), 0.3));
      M.later(b, 0.4, () => { const f = M.mouth(b); M.shoot(M.fan(f, M.aim(M.find(q) || q, f, 17, 0.95), 5, 0.6, 17, 'coin', M.D(b, 0.6), 0.3)); });
      return 2.3;
    },
  },
  diceroll: {
    name: 'ROLL THE DICE', wind: 0.8, pose: 'crouch', ok: (d) => d < 30,
    // (which way the dice go is marked on the ground for the whole wind-up)
    pre(M, b, q, wind) {
      const a0 = Math.atan2(q.p.x - b.x, q.p.z - b.z);
      b.dice = [-0.35, 0, 0.35].map((o) => a0 + o);
      M.fire({ k: 'multi', l: b.dice.map((a) => M.lane(b.x, b.z, b.x + Math.sin(a) * 30, b.z + Math.cos(a) * 30, 0.9, wind, 2.4)) });
    },
    go(M, b) {
      const w = G.worlds[G.planet];
      M.shoot(b.dice.map((a) => {
        const x = b.x + Math.sin(a) * 1.8, z = b.z + Math.cos(a) * 1.8;
        return { p: [U.r2(x), U.r2(hzFloor(w, x, z) + 0.6), U.r2(z)], v: [U.r2(Math.sin(a) * 12), 0, U.r2(Math.cos(a) * 12)], k: 'dice', d: M.D(b, 1.1), r: 0.8, rl: 1, life: 3 };
      }));
      return 2.4;
    },
  },
  chiprain: {
    name: 'CHIP RAIN', wind: 0.7, pose: 'rise', ok: () => true,
    go(M, b, q) { M.rainOn(b, q, 4, 0.6, 3, 2.6, 'coin', M.D(b, 0.9), 0.35, 1.3); return 3.4; },
  },
  doubledown: {
    name: 'DOUBLE DOWN', wind: 0.7, pose: 'crouch', ok: (d) => d < 26,
    pre(M, b, q, wind) { b.path = M.dashPath(b, q.p, 18, 1.3, wind, 0.6); },
    go(M, b, q) {
      M.dashGo(b, b.path, 1.4);
      M.later(b, 0.75, () => { const q2 = M.find(q); if (q2) M.dashGo(b, M.dashPath(b, q2.p, 18, 1.3, 0.55, 0.6), 1.4, 0.55); });
      return 3.2;
    },
  },

  /* Frostbyte: Mama Yeti */
  snowbarrage: {
    name: 'SNOWBALL BARRAGE', wind: 0.5, pose: 'rise', ok: (d) => d < 30,
    go(M, b, q) {
      for (let i = 0; i < 5; i++) M.later(b, i * 0.2, () => { const f = M.mouth(b); M.shoot([M.shot(f, M.aim(M.find(q) || q, f, 18, 0.95), 18, 'snow', M.D(b, 0.55), 0.35, { g: 5, sl: 1 })], i > 0); });
      return 3.2;
    },
  },
  groundpound: {
    name: 'GROUND POUND', wind: 0.9, pose: 'rise', ok: (d) => d < 16,
    pre(M, b, q, wind) {
      M.fire({ k: 'multi', l: [M.slam(b.x, b.z, 4.6, wind, M.D(b, 1.4), { kn: 8, fx: '#ffffff', fk: 'snow' }), M.ring(b.x, b.z, 8, 15, M.D(b, 0.8), wind), M.ring(b.x, b.z, 8, 15, M.D(b, 0.8), wind + 0.6)] });
    },
    go(M) { M.fire({ k: 'fx', shake: 0.8 }); return 2.8; },
  },
  iciclerain: {
    name: 'ICICLE RAIN', wind: 0.6, pose: 'rise', ok: () => true,
    go(M, b, q) { M.rainOn(b, q, 4, 0.5, 3, 2.2, 'icicle', M.D(b, 0.9), 0.35, 1.2); return 3.4; },
  },
  avalanche: {
    name: 'AVALANCHE', wind: 0.9, pose: 'roll', ok: (d) => d < 28,
    pre(M, b, q, wind) { b.path = M.dashPath(b, q.p, 24, 1.6, wind, 1.0); },
    go(M, b) {
      const end = b.path.to;
      M.dashGo(b, b.path, 1.6);
      M.later(b, 1.05, () => { const w = G.worlds[G.planet], f = new V3(end[0], hzFloor(w, end[0], end[1]) + 1.2, end[1]); M.shoot(M.nova(f, 8, 10, 'snow', M.D(b, 0.6), 0.35)); });
      return 3.2;
    },
  },

  /* Spookulon: Bonejangles */
  bonefan: {
    name: 'BONE TOSS', wind: 0.5, pose: 'rise', ok: (d) => d < 30,
    go(M, b, q) {
      const from = M.mouth(b);
      M.shoot(M.fan(from, M.aim(q, from, 16, 0.9), 3, 0.4, 16, 'bone', M.D(b, 0.7), 0.35));
      M.later(b, 0.45, () => { const f = M.mouth(b); M.shoot(M.fan(f, M.aim(M.find(q) || q, f, 16, 0.9), 3, 0.4, 16, 'bone', M.D(b, 0.7), 0.35)); });
      return 2.3;
    },
  },
  gravegrab: {
    name: 'GRAVE GRAB', wind: 0.4, pose: 'crouch', ok: (d) => d < 32,
    go(M, b, q) { M.grab(b, 0); M.later(b, 0.6, () => M.grab(b, 0.5)); return 2.6; },
  },
  ectonova: {
    name: 'ECTO NOVA', wind: 0.8, pose: 'rise', ok: (d) => d < 22,
    go(M, b) {
      const w = G.worlds[G.planet], f = () => new V3(b.x, hzFloor(w, b.x, b.z) + 1.0, b.z);
      M.shoot(M.nova(f(), 14, 9, 'ecto', M.D(b, 0.8), 0.4));
      M.later(b, 0.55, () => M.shoot(M.nova(f(), 14, 9, 'ecto', M.D(b, 0.8), 0.4, Math.PI / 14)));
      return 2.8;
    },
  },
  rise: {
    name: 'RISE, BONEHEADS!', wind: 0.9, pose: 'rise', ok: () => true,
    go(M, b, q) { M.summon(b, 'skelly', 3, q); M.grab(b, 0.3); return 3.5; },
  },

  /* Nimbus-9: Thunderhead */
  zapbolts: {
    name: 'ZAP ZAP ZAP', wind: 0.45, pose: 'spin', ok: (d) => d < 34,
    go(M, b, q) {
      for (let i = 0; i < 4; i++) M.later(b, i * 0.18, () => { const f = M.mouth(b); M.shoot([M.shot(f, M.aim(M.find(q) || q, f, 26, 1), 26, 'bolt', M.D(b, 0.5), 0.3)], i > 0); });
      return 2.8;
    },
  },
  strike: {
    name: 'LIGHTNING STRIKE', wind: 0.5, pose: 'spin', ok: (d) => d < 34,
    go(M, b, q) {
      const l = [[q.p, 0.9], [M.lead(q, 0.6), 1.2], [M.lead(q, 1.2), 1.5]].map(([p, w]) => M.slam(p.x, p.z, 2.2, w, M.D(b, 1.2), { lt: 1, col: '#fff36b', fx: '#fff36b' }));
      M.fire({ k: 'multi', l });
      return 2.6;
    },
  },
  staticring: {
    name: 'STATIC SHOCK', wind: 0.8, pose: 'crouch', ok: (d) => d < 18,
    go(M, b) {
      M.fire({ k: 'multi', l: [M.ring(b.x, b.z, 10, 16, M.D(b, 0.8)), M.ring(b.x, b.z, 10, 16, M.D(b, 0.8), 0.6), M.zone(b.x, b.z, 3.6, 0.3, 3, M.D(b, 0.35), 'zap')] });
      return 3;
    },
  },
  chainstorm: {
    name: 'CHAIN STORM', wind: 0.5, pose: 'spin', ok: (d) => d < 36,
    go(M, b, q) {
      for (let i = 0; i < 8; i++) M.later(b, i * 0.3, () => { const p = M.lead(M.find(q) || q, 0.7); M.fire(M.slam(p.x, p.z, 1.8, 0.75, M.D(b, 1.1), { lt: 1, col: '#fff36b', fx: '#fff36b' })); });
      return 5.2;
    },
  },

  /* Gigopolis: Scooterzilla */
  ram: {
    name: 'FULL THROTTLE', wind: 0.8, pose: 'crouch', ok: (d) => d < 28,
    pre(M, b, q, wind) { b.path = M.dashPath(b, q.p, 22, 1.3, wind, 0.8); M.fire({ k: 'fx', snd: 'warn' }); },
    go(M, b) { M.dashGo(b, b.path, 1.5); return 2.3; },
  },
  tickets: {
    name: 'PARKING TICKETS', wind: 0.5, pose: 'rise', ok: (d) => d < 30,
    go(M, b, q) {
      const from = M.mouth(b);
      M.shoot(M.fan(from, M.aim(q, from, 19, 0.9), 5, 0.7, 19, 'slip', M.D(b, 0.55), 0.3));
      M.later(b, 0.35, () => { const f = M.mouth(b); M.shoot(M.fan(f, M.aim(M.find(q) || q, f, 19, 0.9), 5, 0.7, 19, 'slip', M.D(b, 0.55), 0.3)); });
      return 2.2;
    },
  },
  swarm: {
    name: 'CALLING BACKUP', wind: 0.8, pose: 'rise', ok: () => true,
    go(M, b, q) { M.summon(b, 'scooter', 3, q); M.fire({ k: 'fx', snd: 'alarm' }); return 3; },
  },
  surge: {
    name: 'SURGE PRICING', wind: 0.6, pose: 'rise', ok: () => true,
    go(M, b, q) { M.rainOn(b, q, 4, 0.5, 3, 2.4, 'parcel', M.D(b, 1.0), 0.45, 1.6); return 3.4; },
  },

  /* Zorblax Prime: Cerberoni */
  firefan: {
    name: 'TRIPLE FIREBALL', wind: 0.6, pose: 'rise', ok: (d) => d < 30,
    go(M, b, q) {
      for (let h = 0; h < 3; h++) M.later(b, h * 0.15, () => {
        const f = M.mouth(b), to = M.aim(M.find(q) || q, f, 15, 0.9);
        M.shoot(M.fan(f, to, 3, 0.45, 15, 'meteor', M.D(b, 0.7), 0.4, { g: 10, z: { r: 1.1, dur: 2.2, d: M.D(b, 0.3), kind: 'fire', tk: 0.6 } }), h > 0);
      });
      return 2.6;
    },
  },
  pounce: {
    name: 'ROYAL POUNCE', wind: 0.6, pose: 'crouch', ok: (d) => d > 3 && d < 24,
    go(M, b, q) { M.leap(b, M.lead(q, 0.4), 0.8, 4.5, 3.2, M.D(b, 1.6), { ring: [10, 12, M.D(b, 0.9)], kn: 8 }); return 2.4; },
  },
  lavapools: {
    name: 'LAVA SPIT', wind: 0.7, pose: 'rise', ok: (d) => d < 30,
    go(M, b, q) {
      const from = M.mouth(b), c = M.aim(q, from, 14, 0.8), pts = [c];
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.random(); pts.push(c.clone().add(new V3(Math.cos(a) * 3.5, 0, Math.sin(a) * 3.5))); }
      M.shoot(pts.map((to) => M.shot(from, to, 14, 'lava', M.D(b, 0.8), 0.5, { g: 16, tl: 1, z: { r: 2.4, dur: 5, d: M.D(b, 0.35), kind: 'fire', sl: 1, tk: 0.6 } })));
      return 3;
    },
  },
  meteors: {
    name: 'METEOR SHOWER', wind: 0.6, pose: 'rise', ok: () => true,
    go(M, b, q) { M.rainOn(b, q, 5, 0.5, 2, 3, 'meteor', M.D(b, 1.2), 0.6, 1.9, true); return 3.6; },
  },
};

const MiniBoss = {
  b: null,            // the mini boss on this planet, if there is one
  planet: -1, sendT: 0, near: false, barOn: false, call: null,

  /* ---------- host: does zapping this critter bring the mini boss? ---------- */
  onKill(x, z) {
    const pid = PLANETS[G.planet].id;
    if (!MINIBOSSES[pid] || this.b) return;
    const all = SAVE.minis || (SAVE.minis = {}), rec = all[pid] || (all[pid] = { k: 0, n: 0 });
    rec.k++;
    if (rec.k === MB_AFTER) this.note('The critters here are getting nervous. Something BIG could turn up now...');
    if (rec.k >= MB_AFTER && Math.random() < MB_CHANCE) { rec.k = 0; this.spawn(x, z); }
  },
  // a heads-up for everyone on the planet
  note(text) {
    const a = { k: 'note', text };
    if (Net.online) Net.toAll({ t: 'mbatk', p: G.planet, a });
    this.exec(a);
  },
  // host: it turns up, somewhere open 16 to 26 m from (x, z)
  spawn(x, z) {
    const w = G.worlds[G.planet], pid = PLANETS[G.planet].id, def = MINIBOSSES[pid];
    if (!w || !def) return false;
    const ok = (px, pz) => Math.hypot(px, pz) < PLANET_R - 8 && w.walkable(px, pz, 1.4) && w.pads.every((p) => w.padDist(p, px, pz) > 6);
    let at = null;
    for (let i = 0; i < 60 && !at; i++) {
      const a = Math.random() * TAU, r = i < 40 ? U.rand(16, 26) : U.rand(8, 40), px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (ok(px, pz)) at = [px, pz];
    }
    for (let i = 0; i < 200 && !at; i++) { const a = Math.random() * TAU, r = U.rand(10, PLANET_R - 10), px = Math.cos(a) * r, pz = Math.sin(a) * r; if (ok(px, pz)) at = [px, pz]; }
    if (!at) return false;
    const n = Math.max(1, Critters.players().length);
    const hp = Math.round(def.hp * (MB_DIFF[G.diff] || MB_DIFF.easy).hp * (1 + 0.6 * (n - 1)));
    const a = { k: 'intro', id: Date.now() % 1e7, x: U.r2(at[0]), z: U.r2(at[1]), hp };
    if (Net.online) Net.toAll({ t: 'mbatk', p: G.planet, a });
    this.exec(a);
    persist();
    return true;
  },
  make(id, x, z, hp, max) {
    const w = G.worlds[G.planet], pid = PLANETS[G.planet].id, def = MINIBOSSES[pid];
    if (!w || !def) return null;
    this.remove();
    this.planet = G.planet;
    const m = buildMiniBoss(def);
    m.root.position.set(x, hzFloor(w, x, z), z);
    w.dyn.add(m.root);
    const b = this.b = {
      id, pid, def, m, x, z, rx: x, rz: z, ry: 0, rry: 0, y: 0, hp, max, st: 'intro', en: 0, t: 0, flash: 0, seen: G.time,
      mv: null, pose: null, rise: 0, touchCd: 0,
      // (the host's side of its brain)
      clock: 0, queue: [], introT: 2.6, tgt: null, tgtT: 0, atkT: 1.2, busy: 0, last: null, slowT: 0, tauntT: U.rand(5, 8), hx: x, hz: z, hitBy: new Set(),
    };
    return b;
  },
  remove() {
    const b = this.b;
    if (!b) return;
    if (b.m.root.parent) b.m.root.parent.remove(b.m.root);
    disposeObj(b.m.root);
    this.b = null;
  },
  clear() { this.remove(); this.hud(0); },

  update(dt) {
    if (this.planet !== G.planet) { this.clear(); this.planet = G.planet; }
    const b = this.b;
    if (b) {
      if (Net.isHost) this.host(dt);
      else if (G.time - b.seen > 4) this.remove(); // (the host stopped telling us about it)
      if (this.b) this.animate(dt);
    }
    this.hud(dt);
  },

  /* ---------- host: its brain ---------- */
  host(dt) {
    const b = this.b, w = G.worlds[G.planet];
    if (!w) return;
    b.clock += dt;
    for (let i = b.queue.length - 1; i >= 0; i--) if (b.clock >= b.queue[i].at) { const q = b.queue.splice(i, 1)[0]; if (b.st === 'fight') q.fn(); }
    if (b.st === 'intro') { b.introT -= dt; if (b.introT <= 0) b.st = 'fight'; }
    else if (b.st === 'fight' && Critters.anyoneHere()) this.think(b, w, dt);
    this.sendT -= dt;
    if (this.sendT <= 0 && Net.online && this.b) {
      this.sendT = MB_SEND;
      Net.toAll({ t: 'mb', p: G.planet, id: b.id, x: U.r2(b.x), z: U.r2(b.z), ry: U.r2(b.ry), hp: Math.max(1, Math.round(b.hp)), max: b.max, st: b.st, en: b.en });
    }
  },
  think(b, w, dt) {
    b.slowT -= dt;
    if (b.mv) return; // (mid-leap or mid-charge)
    const ps = Critters.players().filter((o) => !o.safe);
    // who it's after: whoever it picked (for a while), or the nearest one it can see
    b.tgtT -= dt;
    let q = ps.find((o) => o.id === b.tgt);
    if (!q || b.tgtT <= 0) {
      let bd = MB_SIGHT;
      q = null;
      for (const o of ps) { const d = Math.hypot(o.p.x - b.x, o.p.z - b.z); if (d < bd) { bd = d; q = o; } }
      b.tgt = q ? q.id : null; b.tgtT = 5;
    }
    if (q && Math.hypot(q.p.x - b.x, q.p.z - b.z) > MB_SIGHT + 20) { q = null; b.tgt = null; }
    const spd = b.def.speed * (b.slowT > 0 ? 0.6 : 1) * (b.en ? 1.15 : 1);
    if (!q) { // nobody around: wander back home
      if (Math.hypot(b.hx - b.x, b.hz - b.z) > 4) this.step(b, w, b.hx, b.hz, spd * 0.6, dt);
      b.atkT = Math.max(b.atkT, 1);
      return;
    }
    const dx = q.p.x - b.x, dz = q.p.z - b.z, d = Math.hypot(dx, dz);
    if (b.hold > 0) b.hold -= dt; // (its charge is already marked on the ground: it keeps facing that way)
    else this.turn(b, Math.atan2(dx, dz), dt);
    if (b.busy > 0) { b.busy -= dt; return; } // (winding up: stands its ground)
    // get to where it likes to fight from
    if (d > b.def.keep) this.step(b, w, q.p.x, q.p.z, spd, dt);
    else if (d < b.def.keep * 0.5) { // (too close: back off a bit)
      const ux = d > 0.05 ? dx / d : Math.sin(b.ry), uz = d > 0.05 ? dz / d : Math.cos(b.ry);
      this.step(b, w, b.x - ux * 3, b.z - uz * 3, spd * 0.6, dt);
    }
    b.atkT -= dt;
    if (b.atkT <= 0) this.attack(b, q, d);
    b.tauntT -= dt;
    if (b.tauntT <= 0) { b.tauntT = U.rand(9, 15); this.fire({ k: 'taunt', text: U.pick(b.def.taunts) }); }
  },
  turn(b, want, dt) { const da = U.angDiff(b.ry, want), mx = MB_TURN * dt; b.ry += U.clamp(da, -mx, mx); },
  // walk toward (tx, tz), sliding along whatever's in the way
  step(b, w, tx, tz, spd, dt) {
    const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz), rad = 0.9;
    if (d < 0.05) return;
    const mx = (dx / d) * spd * dt, mz = (dz / d) * spd * dt;
    if (w.walkable(b.x + mx, b.z + mz, rad)) { b.x += mx; b.z += mz; }
    else if (w.walkable(b.x + mx, b.z, rad)) b.x += mx;
    else if (w.walkable(b.x, b.z + mz, rad)) b.z += mz;
  },
  pace() { return (MB_DIFF[G.diff] || MB_DIFF.easy).pace; },
  attack(b, q, d) {
    let list = mbAttacks(b.def, G.diff).filter((k) => k !== b.last && MB_ATTACKS[k].ok(d));
    if (!list.length) list = mbAttacks(b.def, G.diff).filter((k) => MB_ATTACKS[k].ok(d));
    if (!list.length) { b.atkT = 0.5; return; }
    const k = U.pick(list), A = MB_ATTACKS[k], wind = U.r2(A.wind * this.pace());
    b.last = k;
    b.busy = wind + 0.25;
    b.atkT = 99; // (set when it goes off)
    this.fire({ k: 'tell', n: A.name, t: wind, tg: q.id, pose: A.pose });
    if (A.pre) A.pre(this, b, q, wind);
    this.later(b, wind, () => {
      const cd = A.go(this, b, this.find(q) || q);
      b.atkT = (cd || 2.4) * this.pace() * (b.en ? 0.75 : 1) * U.rand(0.85, 1.15);
    });
  },
  later(b, t, fn) { b.queue.push({ at: b.clock + t, fn }); },
  // everyone does it (the host too)
  fire(a) {
    if (Net.online) Net.toAll({ t: 'mbatk', p: G.planet, a });
    this.exec(a);
  },
  // someone the mini boss is after, where they are right now (null: they've gone)
  find(q) { return Critters.players().find((o) => o.id === q.id) || null; },
  D(b, k) { return Math.round(b.def.dmg * k * 10) / 10; },

  /* ---------- host: attack helpers ---------- */
  // where it throws things from: its mouth, more or less
  mouth(b) {
    const w = G.worlds[G.planet], s = b.def.s, m = b.m, f = m.hit * s * 0.7;
    return new V3(b.x + Math.sin(b.ry) * f, hzFloor(w, b.x, b.z) + b.y + m.top * s * 0.75, b.z + Math.cos(b.ry) * f);
  },
  // where q will be in t seconds, if they keep going the way they're going
  lead(q, t) {
    const w = G.worlds[G.planet], v = q.v || { x: 0, z: 0 };
    const x = q.p.x + v.x * t, z = q.p.z + v.z * t;
    return new V3(x, hzFloor(w, x, z), z);
  },
  // what to throw at (their middle) so a shot at speed gets there as they do (k: how much it leads them)
  aim(q, from, speed, k) {
    const v = q.v || { x: 0, z: 0 };
    let T = Math.hypot(q.p.x - from.x, q.p.z - from.z) / speed;
    T = Math.hypot(q.p.x + v.x * T - from.x, q.p.z + v.z * T - from.z) / speed; // (where they'll be is further away)
    const p = this.lead(q, T * k);
    p.y += 0.9;
    return p;
  },
  // sideways from from -> to (for spreading shots out)
  side(from, to) { const dx = to.x - from.x, dz = to.z - from.z, l = Math.hypot(dx, dz) || 1; return new V3(dz / l, 0, -dx / l); },
  // one shot from from to to: straight, or lobbed (o.g: gravity)
  shot(from, to, speed, k, d, r, o = {}) {
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z, dist = Math.hypot(dx, dz);
    const T = Math.max(o.g ? 0.5 : 0.05, dist / speed), g = o.g || 0;
    const v = [dx / T, (dy + 0.5 * g * T * T) / T, dz / T];
    return Object.assign({ p: [U.r2(from.x), U.r2(from.y), U.r2(from.z)], v: v.map(U.r2), k, d, r, life: T + 2.5 }, o);
  },
  fan(from, to, n, spread, speed, k, d, r, o) {
    const base = Math.atan2(to.x - from.x, to.z - from.z), dist = Math.hypot(to.x - from.x, to.z - from.z), l = [];
    for (let i = 0; i < n; i++) {
      const a = base + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0);
      l.push(this.shot(from, new V3(from.x + Math.sin(a) * dist, to.y, from.z + Math.cos(a) * dist), speed, k, d, r, o));
    }
    return l;
  },
  // a ring of shots flying out every way, skimming over the ground at about chest height (a0: turned this much)
  nova(from, n, speed, k, d, r, a0 = 0) {
    const l = [];
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * TAU;
      l.push({ p: [U.r2(from.x), U.r2(from.y), U.r2(from.z)], v: [U.r2(Math.sin(a) * speed), 0, U.r2(Math.cos(a) * speed)], k, d, r, life: 2.6, gl: 1.0 });
    }
    return l;
  },
  shoot(l, quiet) { if (l.length) this.fire({ k: 'shot', l, q: quiet ? 1 : 0 }); },
  slam(x, z, r, w, d, o) { return Object.assign({ k: 'slam', c: [U.r2(x), U.r2(z)], r, w: U.r2(w), d }, o); },
  ring(x, z, s, m, d, w = 0, h = 0.9) { return { k: 'ring', c: [U.r2(x), U.r2(z)], s, m, d, w: U.r2(w), h }; },
  zone(x, z, r, w, dur, d, kind, sl = 0) { return { k: 'zone', c: [U.r2(x), U.r2(z)], r, w, dur, d, kind, sl, tk: 0.6 }; },
  lane(ax, az, bx, bz, hw, w, dur) { return { k: 'lane', a: [U.r2(ax), U.r2(az)], b: [U.r2(bx), U.r2(bz)], hw, w: U.r2(w), dur }; },
  // things dropping out of the sky around q (and them wherever they run to): waves of n, every gap seconds,
  // spread around where they're heading · all: around everyone it can reach, not just q
  rainOn(b, q, waves, gap, n, spread, k, d, r, sp, all) {
    const w = G.worlds[G.planet];
    for (let i = 0; i < waves; i++) this.later(b, i * gap, () => {
      const who = all ? Critters.players().filter((o) => !o.safe && Math.hypot(o.p.x - b.x, o.p.z - b.z) < MB_SIGHT) : [this.find(q) || q];
      const l = [];
      for (const o of who) {
        const c = this.lead(o, 0.7);
        for (let j = 0; j < n; j++) {
          const a = Math.random() * TAU, rr = j === 0 ? 0 : U.rand(0.6, 1) * spread, x = c.x + Math.cos(a) * rr, z = c.z + Math.sin(a) * rr;
          l.push({ p: [U.r2(x), U.r2(hzFloor(w, x, z) + 20), U.r2(z)], v: [0, -6, 0], k, d, r, g: 30, tl: 1, sp, w: U.r2(j * 0.12) });
        }
      }
      this.shoot(l, i > 0);
    });
  },
  // hands out of the ground under everyone it can reach (lead: under where they're heading)
  grab(b, lead) {
    const l = [];
    for (const o of Critters.players()) {
      if (o.safe || Math.hypot(o.p.x - b.x, o.p.z - b.z) > 32) continue;
      const p = this.lead(o, lead);
      l.push(this.slam(p.x, p.z, 1.7, 0.85, this.D(b, 1.0), { sl: 1.6, gr: 1, col: '#7dff8a', fx: '#7dff8a', fk: 'ecto' }));
    }
    if (l.length) this.fire({ k: 'multi', l });
  },
  // as far as it can get from where it is toward (tx, tz) (but no further than that, or len m)
  reach(b, tx, tz, len) {
    const w = G.worlds[G.planet], dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
    let x = b.x, z = b.z;
    for (let t = 0.5; t <= Math.min(len, d) + 0.01; t += 0.5) {
      const nx = b.x + ux * t, nz = b.z + uz * t;
      if (!w.walkable(nx, nz, 0.9)) break;
      x = nx; z = nz;
    }
    return [U.r2(x), U.r2(z)];
  },
  // jump onto someone: the circle it lands in is marked while it's in the air, then a shockwave rolls out
  leap(b, to, dur, h, r, d, o = {}) {
    const end = this.reach(b, to.x, to.z, 30);
    b.ry = Math.atan2(end[0] - b.x, end[1] - b.z);
    const l = [this.slam(end[0], end[1], r, dur, d, { kn: o.kn || 6 }), { k: 'move', f: [U.r2(b.x), U.r2(b.z)], to: end, w: 0, dur, h, ry: U.r2(b.ry) }];
    if (o.ring) l.push(this.ring(end[0], end[1], o.ring[0], o.ring[1], o.ring[2], dur));
    this.fire({ k: 'multi', l });
  },
  // a charge: marked on the ground for w seconds (see dashGo)
  dashPath(b, tp, len, hw, w, dur) {
    const dx = tp.x - b.x, dz = tp.z - b.z, d = Math.hypot(dx, dz) || 1;
    const to = this.reach(b, b.x + (dx / d) * len, b.z + (dz / d) * len, len);
    b.ry = Math.atan2(dx, dz);
    b.hold = w + 0.1;
    this.fire(this.lane(b.x, b.z, to[0], to[1], hw, w, dur));
    return { f: [U.r2(b.x), U.r2(b.z)], to, dur, ry: U.r2(b.ry) };
  },
  dashGo(b, path, k, w = 0) { b.ry = path.ry; this.fire({ k: 'move', f: path.f, to: path.to, w, dur: path.dur, h: 0, dash: k, ry: path.ry }); },
  // call in some of the planet's critters, already mad at q
  summon(b, kid, n, q) {
    const w = G.worlds[G.planet], k = CRITTERS[b.pid].findIndex((c) => c.id === kid);
    if (k < 0) return;
    for (let i = 0; i < n; i++) {
      for (let t = 0; t < 14; t++) {
        const a = Math.random() * TAU, r = U.rand(2.5, 5) + b.def.s * 0.4, x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r;
        if (!w.walkable(x, z, 0.5)) continue;
        Critters.spawnAt(k, x, z, U.pick([1, 2]), q ? q.id : null);
        break;
      }
    }
  },

  /* ---------- everyone ---------- */
  exec(a) {
    const b = this.b;
    switch (a.k) {
      case 'intro': this.onIntro(a); break;
      case 'note': if (G.mode === 'planet') { UI.toast(a.text, 'purple', 4); Sound.play('growl'); } break;
      case 'tell': if (b) this.onTell(b, a); break;
      case 'move':
        if (!b) break;
        b.mv = { f: a.f, to: a.to, t: -(a.w || 0), dur: a.dur, h: a.h || 0, dash: a.dash || 0 };
        if (a.ry != null) b.ry = a.ry;
        break;
      case 'taunt': if (b && this.near) { UI.subtitle(b.def.name.toUpperCase(), a.text); Sound.play('growl'); } break;
      case 'angry':
        if (!b) break;
        b.en = 1;
        if (this.near) { UI.toast(`${b.def.name} is ANGRY now!`, 'bad', 2); Sound.play('roar'); UI.bossHp(b.hp / b.max, true); }
        break;
      case 'fx':
        if (a.snd && this.near) Sound.play(a.snd);
        if (a.shake && b) G.shake = Math.max(G.shake, a.shake * Hazards.near(new V3(b.rx, 0, b.rz)));
        break;
      case 'multi': for (const x of a.l) this.exec(x); break;
      default: Hazards.add(a, b ? b.def.name : (MINIBOSSES[PLANETS[G.planet].id] || {}).name);
    }
  },
  onIntro(a) {
    const b = this.make(a.id, a.x, a.z, a.hp, a.hp);
    if (!b) return;
    b.rise = 1.8;
    const w = G.worlds[G.planet], def = b.def;
    Hazards.add({ k: 'slam', c: [a.x, a.z], r: 3.2, w: 1.8, d: 0, col: def.color, fx: def.color }, def.name);
    if (G.mode !== 'planet') return;
    const d = Math.hypot(G.player.pos.x - a.x, G.player.pos.z - a.z);
    UI.bigTitle('MINI BOSS!', `${def.name} showed up! ${d < 45 ? 'It\'s right there!' : 'Something huge is coming...'}`, def.color, 3.4);
    UI.toast(def.quote, 'purple', 5);
    Sound.play('alarm'); Sound.play('roar');
    G.shake = Math.max(G.shake, 0.5);
    FX.burst(new V3(a.x, hzFloor(w, a.x, a.z) + 0.5, a.z), def.color, 24, 7);
  },
  onTell(b, a) {
    b.pose = { k: a.pose || 'crouch', t: 0, dur: Math.max(0.05, a.t), col: new THREE.Color(b.def.color) };
    if (!this.near) return;
    const you = a.tg === Net.myId && G.remotes.size > 0;
    UI.bossCall(a.n, b.def.color, you);
    this.call = { t: 0, dur: Math.max(0.05, a.t) };
    Sound.play('charge');
    if (you) Sound.play('warn');
  },
  // client: where the host says it is
  onSnap(m) {
    if (m.p !== G.planet || !G.worlds[G.planet]) return;
    let b = this.b;
    if (!b || b.id !== m.id) { b = this.make(m.id, m.x, m.z, m.hp, m.max); if (!b) return; }
    b.x = m.x; b.z = m.z; b.hp = m.hp; b.max = m.max; b.seen = G.time;
    if (!b.mv) b.ry = m.ry;
    b.st = m.st;
    if (m.en && !b.en) this.exec({ k: 'angry' });
  },
  onAtk(m) { if (m.p === G.planet && G.worlds[G.planet]) this.exec(m.a); },

  animate(dt) {
    const b = this.b, w = G.worlds[G.planet], m = b.m, s = b.def.s;
    if (!w) return;
    b.t += dt;
    const px = b.rx, pz = b.rz;
    // a leap or a charge: everyone plays it the same (so what you see is what hits you)
    const mv = b.mv;
    if (mv) {
      const was = mv.t;
      mv.t += dt;
      if (mv.t >= 0) {
        if (was <= 0) { if (mv.dash) Sound.play('dash'); else if (mv.h) Sound.play('jump'); }
        const k = U.clamp(mv.t / mv.dur, 0, 1);
        b.rx = mv.f[0] + (mv.to[0] - mv.f[0]) * k; b.rz = mv.f[1] + (mv.to[1] - mv.f[1]) * k;
        b.y = Math.sin(k * Math.PI) * mv.h;
        if (Net.isHost) { b.x = b.rx; b.z = b.rz; }
        if (k >= 1) { b.mv = null; b.y = 0; if (Net.isHost) { b.x = mv.to[0]; b.z = mv.to[1]; } }
      }
    } else if (Net.isHost) { b.rx = b.x; b.rz = b.z; }
    else { b.rx = U.damp(b.rx, b.x, 8, dt); b.rz = U.damp(b.rz, b.z, 8, dt); }
    b.rry += U.angDiff(b.rry, b.ry) * Math.min(1, dt * 8);
    // coming up out of the ground
    let rise = 0;
    if (b.rise > 0) { b.rise -= dt; rise = -Math.max(0, b.rise / 1.8) * (m.top + 0.3) * s; if (Math.random() < 0.5) FX.burst(new V3(b.rx + U.rand(-1.5, 1.5), hzFloor(w, b.rx, b.rz) + 0.2, b.rz + U.rand(-1.5, 1.5)), '#8a6a4a', 1, 3); }
    const moving = Math.hypot(b.rx - px, b.rz - pz) / Math.max(dt, 1e-4) > 0.3;
    const hop = !m.hover && moving && !b.y ? Math.abs(Math.sin(b.t * 12 / Math.sqrt(s))) * 0.1 * s : 0;
    m.root.position.set(b.rx, hzFloor(w, b.rx, b.rz) + b.y + rise + hop, b.rz);
    m.root.rotation.y = b.rry;
    m.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(b.t * 16 / Math.sqrt(s) + i * 2) * 0.6 : 0; });
    if (m.hover) m.body.position.y = Math.sin(b.t * 3) * 0.08;
    if (m.wings) m.wings.forEach((wg, i) => { wg.rotation.z = (i ? -1 : 1) * Math.sin(b.t * 16) * 0.7; });
    if (m.rotors) for (const r of m.rotors) r.rotation.y += dt * 40;
    if (m.rolls && (moving || (mv && mv.t >= 0))) for (const r of m.rolls) r.rotation.x += dt * 14;
    if (m.body.userData.spark) m.body.userData.spark.rotation.y += dt * 4;
    // winding up: every pose says "something's coming", and it glows
    const pz2 = b.pose, winding = pz2 && pz2.t < pz2.dur;
    if (pz2) { pz2.t += dt; if (pz2.t > pz2.dur + 0.45) b.pose = null; }
    b.flash = Math.max(0, b.flash - dt * 5);
    const pop = 1 + b.flash * 0.12, tr = Math.sin(b.t * 40) * 0.03;
    m.body.rotation.set(0, 0, 0);
    if (winding && pz2.k === 'crouch') m.body.scale.set(1.15 * pop, (0.74 + tr) * pop, 1.15 * pop);
    else if (winding && pz2.k === 'rise') m.body.scale.set(0.9 * pop, (1.18 + tr) * pop, 0.9 * pop);
    else if (winding && pz2.k === 'spin') { m.body.scale.setScalar(pop); m.body.rotation.y = pz2.t * 14; }
    else if ((winding && pz2.k === 'roll') || (mv && mv.t >= 0 && mv.dash && b.pid === 'frost')) { m.body.scale.set(1.1 * pop, 0.9 * pop, 1.1 * pop); m.body.rotation.x = (winding ? pz2.t : b.t) * 12; }
    else if (mv && mv.t >= 0 && mv.dash) { m.body.scale.set(0.92 * pop, 0.95 * pop, 1.2 * pop); m.body.rotation.x = 0.25; }
    else if (mv && mv.t >= 0 && mv.h) m.body.scale.set(0.9 * pop, 1.12 * pop, 0.9 * pop);
    else m.body.scale.setScalar(pop);
    const c = this.center(b, w);
    if (winding) this.glow().head(c, pz2.col, m.hit * s * (2.2 + Math.sin(b.t * 18) * 0.4), 0.3 + 0.25 * (pz2.t / pz2.dur));
    m.aura.material.opacity = winding ? 0.45 + 0.4 * Math.abs(Math.sin(b.t * 14)) : 0.35 + 0.15 * Math.sin(b.t * 3);
    m.crown.position.y = m.top + Math.sin(b.t * 5) * 0.02;
    this.touch(b, w, dt);
  },
  glow() { return Hazards.glowFx(); },
  // walking into it hurts; getting run over by one of its charges hurts a lot
  touch(b, w, dt) {
    const me = G.player;
    b.touchCd -= dt;
    if (b.touchCd > 0 || b.st !== 'fight' || b.rise > 0 || !Hazards.canHurt()) return;
    const dash = b.mv && b.mv.t >= 0 && b.mv.dash, gy = hzFloor(w, b.rx, b.rz) + b.y;
    const r = b.m.hit * b.def.s * 0.9 + (dash ? 0.8 : 0.45), dx = me.pos.x - b.rx, dz = me.pos.z - b.rz, d = Math.hypot(dx, dz);
    if (d > r || me.pos.y > gy + b.m.top * b.def.s + 0.4 || me.pos.y < gy - 1.5) return;
    b.touchCd = 1;
    if (Hazards.hurt(b.def.dmg * (dash || MB_TOUCH), b.def.name, new V3(b.rx, 0, b.rz), { kn: dash ? 7 : 4 }) && dash) {
      me.vel.x += (dx / (d || 1)) * 8; me.vel.z += (dz / (d || 1)) * 8;
      UI.toast(`${b.def.name} ran you over!`, 'bad', 1.4);
    }
  },
  // its middle (what shots aim at)
  center(b, w) {
    const s = b.def.s, m = b.m;
    return new V3(b.rx, hzFloor(w, b.rx, b.rz) + b.y + (m.hy != null ? m.hy : m.hit * 0.8) * s, b.rz);
  },
  radius(b) { return b.m.hit * b.def.s * 1.05; },

  /* ---------- the health bar (and what it's winding up) when it's close ---------- */
  hud(dt) {
    const b = this.b, me = G.player;
    this.near = !!b && G.mode === 'planet' && Math.hypot(me.pos.x - b.rx, me.pos.z - b.rz) < MB_SIGHT + 10;
    if (G.mode === 'boss') { this.barOn = false; this.call = null; return; } // (the boss fight has the bar)
    if (this.near !== this.barOn) { this.barOn = this.near; UI.miniBar(this.near, b); }
    if (!this.near) { this.call = null; return; }
    UI.bossHp(b.hp / b.max, !!b.en);
    if (this.call) {
      this.call.t += dt;
      UI.bossCallSet(this.call.t / this.call.dur);
      if (this.call.t > this.call.dur + 1.1) { UI.bossCall(null); this.call = null; }
    }
  },

  /* ---------- zapping it ---------- */
  hitTest(p0, p1, skip) {
    const b = this.b;
    if (!b || b.rise > 0 || (skip && skip.has('mb'))) return null;
    const c = this.center(b, G.worlds[G.planet]);
    return U.segSphere(p0, p1, c, this.radius(b)) ? { k: 'mini', key: 'mb', ctr: c } : null;
  },
  // my shot hit it
  hit(dmg, pos, fx, quiet) {
    const b = this.b;
    if (!b) return;
    b.flash = quiet ? Math.max(b.flash, 0.3) : 1;
    if (G.player.safeT > 0) { G.player.safeT = 0; UI.toast('You started it! Mean critters (and mini bosses) can get you now.', 'bad', 2.4); }
    FX.burst(pos, b.def.color, quiet ? 2 : 4, 3);
    if (!quiet) {
      FX.text(pos.clone().setY(pos.y + 0.8), String(dmg), '#ffffff', 44);
      Sound.play('hit');
      const x = UI.el.crosshair; x.classList.remove('hit'); void x.offsetWidth; x.classList.add('hit');
    }
    if (Net.isHost) this.damage(dmg, Net.myId, fx);
    else { Net.toHost({ t: 'hitmb', id: b.id, dmg, fx }); b.hp = Math.max(1, b.hp - dmg); }
  },
  // a splash went off at pos
  blast(pos, radius, dmg, fx, skip) {
    const b = this.b;
    if (!b || skip === 'mb' || b.rise > 0) return;
    const c = this.center(b, G.worlds[G.planet]);
    if (c.distanceTo(pos) < radius + this.radius(b)) this.hit(dmg, c, fx);
  },
  onHit(m, from) {
    const b = this.b;
    if (b && m.id === b.id) this.damage(Math.min(400, Number(m.dmg) || 0), from, ['goo', 'ice'].includes(m.fx) ? m.fx : null);
  },
  // host
  damage(dmg, by, fx) {
    const b = this.b;
    if (!b || !(dmg > 0)) return;
    b.hp -= dmg;
    if (by) b.hitBy.add(by);
    if (fx === 'goo' || fx === 'ice') b.slowT = Math.max(b.slowT, fx === 'goo' ? 2 : 0.6); // (too big to freeze, but it does slow down)
    if (by && (!b.tgt || Math.random() < 0.1)) { b.tgt = by; b.tgtT = 5; } // (it turns on whoever's shooting it)
    if (!b.en && b.hp < b.max * 0.5 && b.hp > 0) this.fire({ k: 'angry' });
    if (b.hp <= 0) {
      const m = { t: 'mbdie', p: G.planet, id: b.id };
      Net.toAll(m);
      this.onDie(m);
    }
  },
  // it's done for: a big bang, and everyone on the planet gets paid
  onDie(m) {
    const b = this.b;
    if (!b || m.id !== b.id || m.p !== G.planet) return;
    const w = G.worlds[G.planet], def = b.def, c = this.center(b, w), gy = hzFloor(w, b.rx, b.rz);
    FX.burst(c, def.color, 30, 9); FX.burst(c, '#ffffff', 16, 6); FX.burst(c, '#ffd23f', 12, 7);
    FX.ring(new V3(b.rx, gy + 0.2, b.rz), def.color, 7); FX.ring(new V3(b.rx, gy + 0.3, b.rz), '#ffffff', 10);
    for (let i = 0; i < 14; i++) this.glow().puff(c.clone().add(new V3(U.rand(-2, 2), U.rand(-1.5, 2.5), U.rand(-2, 2))), new THREE.Color(def.color), 3, 0.9);
    this.remove();
    Hazards.clear();
    this.hud(0);
    if (Net.isHost && SAVE.minis && SAVE.minis[b.pid]) SAVE.minis[b.pid].n = (SAVE.minis[b.pid].n || 0) + 1;
    if (G.mode !== 'planet' || G.player.dead) { UI.toast(`Your crew took down ${def.name}!`, 'good', 3); return; }
    const pay = Math.round(def.reward * (MB_DIFF[G.diff] || MB_DIFF.easy).pay);
    addBucks(pay);
    SAVE.stats.minis = (SAVE.stats.minis || 0) + 1;
    persist();
    UI.hud();
    G.shake = Math.max(G.shake, 0.7 * Hazards.near(c));
    Sound.play('explode'); Sound.play('victory');
    UI.bigTitle('MINI BOSS DOWN!', `${def.name} is done for. +${U.bucks(pay)} for everyone here!`, '#7dff8a', 3.4);
  },
};
