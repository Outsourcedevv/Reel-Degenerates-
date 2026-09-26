'use strict';
/* =========================================================
   Boss fights. The host runs the AI and sends attacks; every
   client simulates the hazards and checks hits on itself.
   ========================================================= */
const MINION_KIND = { blorb: 'slime', snowdad: 'snow', zorblax: 'guard' };
const RING_COL = { gary: '#b8d86b', blorb: '#ff9ad5', jerry: '#ffd23f', snowdad: '#bff6ff', zorblax: '#ff3df0' };
const JERRY_W = { cherry: 3, bell: 3, 7: 2, cash: 3, lemon: 3, skull: 1 };
const BOSS_DMG = 0.8; // every boss attack hits this much as hard as it's listed

class BossFight {
  constructor(id, seed, ids) {
    this.id = id;
    this.def = BOSSES[id];
    this.ids = ids.slice();
    const n = Math.max(1, ids.length);
    this.maxHp = Math.round(this.def.hp * (1 + 0.65 * (n - 1)));
    this.hp = this.maxHp;
    this.m = buildBossModel(id);
    G.scene.add(this.m.root);
    this.pos = new V3(0, -12, -24);
    this.rpos = this.pos.clone();
    this.tpos = this.pos.clone();
    this.rot = 0; this.trot = 0;
    this.st = 'intro'; this.t = 0; this.phase = 1;
    this.contact = 0; this.contactDmg = 15;
    this.projs = []; this.rings = []; this.slams = []; this.lanes = [];
    this.minions = new Map();
    this.out = new Set();
    this.flash = 0;
    this.reel = null;
    this.over = false;
    this.ai = { atkT: 4.6, tauntT: 6, ang: -Math.PI / 2, mv: null, sendT: 0, comp: 1, mid: 1, tgtT: 0, tgt: null, dieT: 0, queue: [] };
    this.speed = 0;
  }

  /* ================= shared helpers ================= */
  me() { return G.player; }
  inFight(id) { return this.ids.includes(id); }
  targets() {
    const out = [];
    const p = this.me();
    if (this.inFight(Net.myId) && !p.dead && !p.ghost) out.push({ id: Net.myId, p: p.pos });
    for (const r of G.remotes.values()) {
      if (!this.inFight(r.id) || r.s.m !== 'boss' || r.s.d || r.s.g) continue;
      out.push({ id: r.id, p: r.tpos });
    }
    return out;
  }
  randTarget() { const t = this.targets(); return t.length ? U.pick(t) : null; }
  nearestTarget(x, z) {
    let best = null, bd = Infinity;
    for (const t of this.targets()) { const d = Math.hypot(t.p.x - x, t.p.z - z); if (d < bd) { bd = d; best = t; } }
    return best;
  }
  face(dx, dz) { if (dx || dz) this.rot = Math.atan2(dx, dz); }
  world(o) { // local offset -> world, using render pose
    const c = Math.cos(this.rot), s = Math.sin(this.rot);
    return new V3(this.rpos.x + o.x * c + o.z * s, this.rpos.y + o.y, this.rpos.z - o.x * s + o.z * c);
  }
  mouth() { return this.world(this.m.mouth); }
  fire(a) { this.exec(a); Net.toAll({ t: 'batk', a }); }
  later(delay, fn) { this.ai.queue.push({ at: this.t + delay, fn }); }

  /* ================= attack builders (host) ================= */
  P(p, v, k, d, r, o = {}) { return Object.assign({ p: [U.r2(p.x), U.r2(p.y), U.r2(p.z)], v: [U.r2(v.x), U.r2(v.y), U.r2(v.z)], k, d, r }, o); }
  aimed(from, to, n, spread, speed, kind, dmg, r, o = {}) {
    const l = [];
    const base = Math.atan2(to.x - from.x, to.z - from.z);
    const dist = Math.hypot(to.x - from.x, to.z - from.z);
    const dy = (to.y + 1.0) - from.y;
    for (let i = 0; i < n; i++) {
      const a = base + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0) + (o.jit ? (Math.random() - 0.5) * o.jit : 0);
      let vy, hs = speed;
      if (o.g) { const T = Math.max(0.4, dist / speed); vy = (dy + 0.5 * o.g * T * T) / T; }
      else { const T = dist / speed; vy = T > 0 ? dy / T : 0; hs = speed; }
      l.push(this.P(from, new V3(Math.sin(a) * hs, vy, Math.cos(a) * hs), kind, dmg, r, { g: o.g || 0, w: (o.step || 0) * i + (o.w || 0), sp: o.sp, tl: o.tl ? 1 : 0 }));
    }
    return { k: 'proj', l };
  }
  spiral(from, arms, count, dur, speed, kind, dmg, r, rotSpeed = 2.4) {
    const l = [];
    const a0 = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const arm = i % arms, k = Math.floor(i / arms);
      const w = (k * arms / count) * dur;
      const a = a0 + (arm / arms) * Math.PI * 2 + w * rotSpeed;
      l.push(this.P(from, new V3(Math.sin(a) * speed, 0, Math.cos(a) * speed), kind, dmg, r, { w }));
    }
    return { k: 'proj', l };
  }
  ring(x, z, speed, dmg, w = 0, h = 0.9) { return { k: 'ring', c: [U.r2(x), U.r2(z)], s: speed, d: dmg, w, h, m: 42 }; }
  slam(x, z, r, w, dmg) { return { k: 'slam', c: [U.r2(x), U.r2(z)], r, w, d: dmg }; }
  lane(a, b, hw, w, dur, dmg) { return { k: 'lane', a: [U.r2(a.x), U.r2(a.z)], b: [U.r2(b.x), U.r2(b.z)], hw, w, dur, d: dmg }; }
  rain(n, kind, dmg, r, dur = 1.6) {
    const l = [];
    const tg = this.targets();
    for (let i = 0; i < n; i++) {
      let x, z;
      if (i < tg.length && Math.random() < 0.7) { x = tg[i].p.x + (Math.random() - 0.5) * 3; z = tg[i].p.z + (Math.random() - 0.5) * 3; }
      else { const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * (ARENA_R - 1.5); x = Math.cos(a) * rr; z = Math.sin(a) * rr; }
      l.push(this.P(new V3(x, DECK_Y + 24, z), new V3(0, -4, 0), kind, dmg, r, { g: 30, w: (i / n) * dur, tl: 1, sp: r + 0.9 }));
    }
    return { k: 'proj', l };
  }
  spawnMinions(n) {
    const kind = MINION_KIND[this.id];
    const hp = 26 * (1 + 0.3 * (this.ids.length - 1));
    for (let i = 0; i < n && this.minions.size < 9; i++) {
      const a = Math.random() * Math.PI * 2;
      const id = this.ai.mid++;
      this.minions.set(id, { id, x: Math.cos(a) * (ARENA_R - 1.5), z: Math.sin(a) * (ARENA_R - 1.5), tx: 0, tz: 0, hp, kind, spd: kind === 'guard' ? 4.2 : kind === 'snow' ? 3.8 : 3.3, mesh: null, hitT: 0 });
    }
    this.fire({ k: 'fx', snd: 'alarm' });
  }
  jumpTo(to, dur, h, onLand) {
    this.ai.mv = { from: this.pos.clone(), to: to.clone(), t: 0, dur, h, onLand };
  }
  clampDeck(v, max) { const d = Math.hypot(v.x, v.z); if (d > max) { v.x *= max / d; v.z *= max / d; } return v; }

  /* ================= host AI ================= */
  hostUpdate(dt) {
    const ai = this.ai;
    for (let i = ai.queue.length - 1; i >= 0; i--) if (this.t >= ai.queue[i].at) { const q = ai.queue.splice(i, 1)[0]; if (this.st === 'fight' || this.st === 'intro') q.fn(); }
    if (ai.mv) {
      const mv = ai.mv;
      mv.t += dt;
      const k = U.clamp(mv.t / mv.dur, 0, 1);
      this.pos.lerpVectors(mv.from, mv.to, k);
      this.pos.y += Math.sin(k * Math.PI) * mv.h;
      if (k >= 1) { ai.mv = null; this.pos.copy(mv.to); if (mv.onLand) mv.onLand(); }
    }
    if (this.st === 'intro') this.hostIntro(dt);
    else if (this.st === 'fight') {
      if (!ai.mv) this['move_' + this.id](dt);
      ai.atkT -= dt;
      if (this.phase === 2) ai.comp = Math.max(this.id === 'zorblax' ? 0.55 : 0.8, ai.comp - dt * 0.01);
      if (ai.atkT <= 0 && !ai.mv && this.targets().length) {
        const cd = this['attack_' + this.id]();
        ai.atkT = (cd || 2.4) * ai.comp * U.rand(0.85, 1.15);
      }
      ai.tauntT -= dt;
      if (ai.tauntT <= 0) {
        ai.tauntT = U.rand(7, 11);
        const list = this.phase === 2 && this.def.taunts2 ? this.def.taunts2.concat(this.def.taunts) : this.def.taunts;
        const text = U.pick(list);
        this.onTaunt(text); Net.toAll({ t: 'btaunt', text });
      }
      this.hostMinions(dt);
      if (this.checkAllOut()) this.end(false);
    } else if (this.st === 'dying') {
      this.pos.y = U.damp(this.pos.y, DECK_Y - 0.6, 2, dt);
      if (this.t - ai.dieT > 3.4) this.end(true);
    }
    ai.sendT -= dt;
    if (ai.sendT <= 0 && G.online) {
      ai.sendT = 1 / 12;
      Net.toAll({
        t: 'bs', p: [U.r2(this.pos.x), U.r2(this.pos.y), U.r2(this.pos.z)], r: U.r2(this.rot), hp: Math.round(this.hp), ph: this.phase, st: this.st, c: this.contact, cd: this.contactDmg,
        mm: [...this.minions.values()].map((m) => [m.id, U.r2(m.x), U.r2(m.z)]),
      });
    }
  }
  hostIntro() {
    const t = this.t, ai = this.ai;
    if (ai.introDone) return;
    ai.introDone = true;
    const id = this.id;
    if (id === 'gary' || id === 'snowdad') {
      this.pos.set(0, id === 'gary' ? -5 : DECK_Y, -30);
      this.later(1.0, () => this.jumpTo(new V3(0, DECK_Y, -8), 1.4, 9, () => { this.fire({ k: 'multi', l: [this.ring(0, -8, 9, 10), { k: 'fx', snd: 'boom', shake: 0.8 }] }); }));
    } else if (id === 'blorb') {
      this.pos.set(0, 40, -8);
      this.later(0.6, () => this.jumpTo(new V3(0, DECK_Y, -8), 1.4, 0, () => this.fire({ k: 'multi', l: [this.ring(0, -8, 8, 10), { k: 'fx', snd: 'boom', shake: 1 }] })));
    } else if (id === 'jerry') {
      this.pos.set(0, DECK_Y, -30);
      this.later(0.6, () => this.jumpTo(new V3(0, DECK_Y, -12), 1.6, 6, () => this.fire({ k: 'fx', snd: 'boom', shake: 0.6 })));
    } else {
      this.pos.set(0, 40, -10);
      this.later(0.4, () => this.jumpTo(new V3(0, DECK_Y + 2.5, -10), 2.2, 0, () => this.fire({ k: 'fx', snd: 'roar', shake: 0.6 })));
    }
    this.later(3.6, () => { this.st = 'fight'; });
  }

  /* ----- movement per boss ----- */
  walkToward(dt, spd, stopDist) {
    const ai = this.ai;
    ai.tgtT -= dt;
    if (ai.tgtT <= 0 || !ai.tgt) { ai.tgt = this.nearestTarget(this.pos.x, this.pos.z) || this.randTarget(); ai.tgtT = 4; }
    const tg = ai.tgt ? ai.tgt.p : new V3();
    const dx = tg.x - this.pos.x, dz = tg.z - this.pos.z, d = Math.hypot(dx, dz);
    this.face(dx, dz);
    if (d > stopDist) { this.pos.x += (dx / d) * spd * dt; this.pos.z += (dz / d) * spd * dt; }
    this.clampDeck(this.pos, ARENA_R - 2.5);
    this.pos.y = DECK_Y;
  }
  move_gary(dt) { this.walkToward(dt, this.phase === 2 ? 2.8 : 2.0, 3.2); this.contact = 2.3; this.contactDmg = 15; }
  move_blorb(dt) { this.walkToward(dt, 1.4, 3.5); this.contact = 2.8; this.contactDmg = 15; }
  move_snowdad(dt) { this.walkToward(dt, this.phase === 2 ? 4.0 : 3.0, 3.0); this.contact = 2.4; this.contactDmg = 18; }
  move_jerry(dt) {
    const ai = this.ai;
    ai.ang += dt * (this.phase === 2 ? 0.3 : 0.18);
    this.pos.set(Math.cos(ai.ang) * 11.5, DECK_Y, Math.sin(ai.ang) * 11.5);
    this.face(-this.pos.x, -this.pos.z);
    this.contact = 3.0; this.contactDmg = 15;
  }
  move_zorblax(dt) {
    const ai = this.ai;
    ai.ang += dt * (this.phase === 2 ? 0.45 : 0.3);
    this.pos.set(Math.cos(ai.ang) * 10, DECK_Y + 2.5, Math.sin(ai.ang) * 10);
    const tg = this.nearestTarget(this.pos.x, this.pos.z);
    if (tg) this.face(tg.p.x - this.pos.x, tg.p.z - this.pos.z);
    this.contact = 0;
  }

  /* ----- attacks per boss (return cooldown) ----- */
  pickAtk(list) { return U.weighted(list.filter((e) => e[1] > 0)); }
  attack_gary() {
    const p2 = this.phase === 2;
    const a = this.pickAtk([['bags', 3], ['slam', 2], ['tires', 2], ['rain', p2 ? 1.5 : 0]]);
    const tg = this.randTarget();
    if (!tg) return 2;
    if (a === 'bags') {
      const l = [];
      const tgs = this.targets();
      for (let i = 0; i < 3; i++) {
        const t = tgs[i % tgs.length];
        const to = new V3(t.p.x + (Math.random() - 0.5) * 2, t.p.y - 1, t.p.z + (Math.random() - 0.5) * 2);
        l.push(...this.aimed(this.mouth(), to, 1, 0, 11, 'trash', 14, 0.55, { g: 18, w: i * 0.3, sp: 1.6, tl: 1 }).l);
      }
      this.fire({ k: 'proj', l });
    } else if (a === 'slam') {
      this.fire({ k: 'multi', l: [this.ring(this.pos.x, this.pos.z, 9, 14, 0.5), { k: 'fx', snd: 'boom', shake: 0.5, anim: 'slam' }].concat(p2 ? [this.ring(this.pos.x, this.pos.z, 9, 14, 1.2)] : []) });
    } else if (a === 'tires') {
      this.fire(this.aimed(this.mouth(), tg.p, p2 ? 5 : 3, 0.3, 13, 'tire', 12, 0.6, { step: 0.22 }));
    } else {
      this.fire({ k: 'multi', l: [this.rain(10, 'trash', 14, 0.6), { k: 'fx', text: 'GARBAGE DAY!' }] });
    }
    return p2 ? 2.0 : 2.7;
  }
  attack_blorb() {
    const p2 = this.phase === 2;
    const a = this.pickAtk([['bounce', 3], ['spit', 2.5], ['babies', 1.5], ['rain', p2 ? 1.5 : 0]]);
    const tg = this.randTarget();
    if (!tg) return 2;
    if (a === 'bounce') {
      const to = this.clampDeck(new V3(tg.p.x, DECK_Y, tg.p.z), ARENA_R - 3);
      this.fire(this.slam(to.x, to.z, 3.6, 1.2, 22));
      this.jumpTo(to, 1.2, 9, () => {
        this.fire({ k: 'multi', l: [this.ring(to.x, to.z, 8, 12), { k: 'fx', snd: 'boom', shake: 0.8 }] });
        if (p2) this.spawnMinions(2);
      });
    } else if (a === 'spit') {
      this.fire(this.aimed(this.mouth(), tg.p, p2 ? 9 : 7, 0.9, 11, 'goo', 10, 0.5));
    } else if (a === 'babies') {
      this.spawnMinions(p2 ? 4 : 3);
      this.onTaunt('My children! HUG THEM! HUG THEM TO DEATH!'); Net.toAll({ t: 'btaunt', text: 'My children! HUG THEM! HUG THEM TO DEATH!' });
    } else this.fire(this.rain(12, 'goo', 12, 0.55));
    return p2 ? 1.8 : 2.5;
  }
  attack_jerry() {
    const p2 = this.phase === 2;
    const w = Object.entries(JERRY_W).map(([s, x]) => [s, s === 'skull' && p2 ? 2 : x]);
    const syms = [0, 1, 2].map(() => U.weighted(w));
    this.fire({ k: 'reels', s: syms });
    this.later(1.5, () => {
      const jack = syms[0] === syms[1] && syms[1] === syms[2];
      const counts = {};
      syms.forEach((s) => (counts[s] = (counts[s] || 0) + (jack ? 1.5 : 1)));
      if (jack) { this.fire({ k: 'fx', text: 'JACKPOT!!', snd: 'jackpot', shake: 0.5 }); this.onTaunt('JACKPOT! FOR ME!'); Net.toAll({ t: 'btaunt', text: 'JACKPOT! FOR ME!' }); }
      const l = [];
      const tg = this.randTarget();
      for (const [s, c] of Object.entries(counts)) {
        if (s === 'cherry') l.push(this.rain(Math.round(6 * c), 'cherry', 14, 0.6));
        if (s === 'bell') for (let i = 0; i < Math.round(c); i++) l.push(this.ring(this.pos.x, this.pos.z, 10, 14, i * 0.7));
        if (s === 'cash') l.push(this.spiral(this.mouth().setY(DECK_Y + 1.1), 2, Math.round(18 * c), 1.8, 10, 'coin', 9, 0.45));
        if (s === 'lemon' && tg) l.push(this.aimed(this.mouth(), tg.p, Math.round(7 * c), 0.9, 12, 'lemon', 10, 0.5));
        if (s === '7') {
          const tgs = this.targets();
          for (let i = 0; i < Math.round(2 * c); i++) {
            const t = tgs[i % tgs.length] || tg;
            if (!t) continue;
            const a = Math.random() * Math.PI;
            const dx = Math.cos(a) * 20, dz = Math.sin(a) * 20;
            l.push(this.lane(new V3(t.p.x - dx, 0, t.p.z - dz), new V3(t.p.x + dx, 0, t.p.z + dz), 1.5, 1.1 + i * 0.25, 0.5, 22));
          }
        }
        if (s === 'skull') for (const t of this.targets()) l.push(this.slam(t.p.x, t.p.z, 3, 1.3, 25));
      }
      this.fire({ k: 'multi', l });
    });
    return p2 ? 3.0 : 3.6;
  }
  attack_snowdad() {
    const p2 = this.phase === 2;
    const a = this.pickAtk([['snowballs', 3], ['flop', 2.5], ['icicles', 2], ['kids', 1.2], ['joke', 1]]);
    const tg = this.randTarget();
    if (!tg) return 2;
    if (a === 'snowballs') {
      this.fire(this.aimed(this.mouth(), tg.p, 5, 0.35, 15, 'snow', 10, 0.5));
      if (p2) this.later(0.6, () => { const t2 = this.randTarget(); if (t2) this.fire(this.aimed(this.mouth(), t2.p, 5, 0.35, 15, 'snow', 10, 0.5)); });
    } else if (a === 'flop') {
      const to = this.clampDeck(new V3(tg.p.x, DECK_Y, tg.p.z), ARENA_R - 3);
      this.fire(this.slam(to.x, to.z, 4, 1.1, 28));
      this.jumpTo(to, 1.1, 8, () => this.fire({ k: 'multi', l: [this.ring(to.x, to.z, 11, 14), { k: 'fx', snd: 'boom', shake: 1 }] }));
    } else if (a === 'icicles') {
      this.fire(this.rain(p2 ? 18 : 12, 'icicle', 16, 0.5));
    } else if (a === 'kids') {
      this.spawnMinions(p2 ? 4 : 3);
    } else {
      const text = U.pick(this.def.taunts);
      this.onTaunt(text); Net.toAll({ t: 'btaunt', text });
      this.fire({ k: 'multi', l: [this.ring(this.pos.x, this.pos.z, 9, 12, 1.2), this.ring(this.pos.x, this.pos.z, 9, 12, 1.9)] });
    }
    return p2 ? 1.6 : 2.2;
  }
  attack_zorblax() {
    const p2 = this.phase === 2;
    const a = this.pickAtk([['decree', 3], ['lasers', 2.5], ['guards', 1.3], ['meteors', 2], ['pizza', p2 ? 2.5 : 0], ['stomp', p2 ? 1.5 : 0]]);
    const tg = this.randTarget();
    if (!tg) return 2;
    if (a === 'decree') {
      this.fire(this.spiral(new V3(this.pos.x, DECK_Y + 1.1, this.pos.z), 3, p2 ? 42 : 30, 2.2, 10, 'laser', 10, 0.45));
    } else if (a === 'lasers') {
      const l = [];
      const tgs = this.targets();
      for (let i = 0; i < (p2 ? 3 : 2); i++) {
        const t = tgs[i % tgs.length];
        const a2 = Math.random() * Math.PI, dx = Math.cos(a2) * 20, dz = Math.sin(a2) * 20;
        l.push(this.lane(new V3(t.p.x - dx, 0, t.p.z - dz), new V3(t.p.x + dx, 0, t.p.z + dz), 1.5, 1.2 + i * 0.3, 0.5, 24));
      }
      this.fire({ k: 'multi', l });
    } else if (a === 'guards') {
      this.spawnMinions(p2 ? 4 : 3);
      const text = 'GUARDS! SEIZE THE DELIVERY PERSON!';
      this.onTaunt(text); Net.toAll({ t: 'btaunt', text });
    } else if (a === 'meteors') {
      this.fire(this.rain(p2 ? 18 : 14, 'meteor', 16, 0.6));
    } else if (a === 'pizza') {
      const text = 'THIS PIZZA IS COLD!';
      this.onTaunt(text); Net.toAll({ t: 'btaunt', text });
      this.fire(this.aimed(this.mouth(), tg.p, 9, 1.1, 13, 'pizza', 12, 0.55));
    } else {
      const to = this.clampDeck(new V3(tg.p.x, DECK_Y + 2.5, tg.p.z), ARENA_R - 3);
      this.fire(this.slam(to.x, to.z, 4, 1.2, 30));
      this.jumpTo(new V3(to.x, DECK_Y + 0.3, to.z), 1.2, 6, () => {
        this.fire({ k: 'multi', l: [this.ring(to.x, to.z, 11, 16), { k: 'fx', snd: 'boom', shake: 1 }] });
        this.jumpTo(new V3(to.x, DECK_Y + 2.5, to.z), 0.6, 0);
      });
    }
    return p2 ? 1.6 : 2.3;
  }

  /* ----- minions (host) ----- */
  hostMinions(dt) {
    for (const m of this.minions.values()) {
      const t = this.nearestTarget(m.x, m.z);
      if (!t) continue;
      const dx = t.p.x - m.x, dz = t.p.z - m.z, d = Math.hypot(dx, dz);
      if (d > 0.8) { m.x += (dx / d) * m.spd * dt; m.z += (dz / d) * m.spd * dt; }
      for (const o of this.minions.values()) {
        if (o === m) continue;
        const ox = m.x - o.x, oz = m.z - o.z, od = Math.hypot(ox, oz);
        if (od < 1.1 && od > 0.01) { m.x += (ox / od) * (1.1 - od) * 0.5; m.z += (oz / od) * (1.1 - od) * 0.5; }
      }
      const r = Math.hypot(m.x, m.z);
      if (r > ARENA_R - 0.8) { m.x *= (ARENA_R - 0.8) / r; m.z *= (ARENA_R - 0.8) / r; }
      m.tx = m.x; m.tz = m.z;
    }
  }
  damageMinion(id, dmg) {
    const m = this.minions.get(id);
    if (!m) return;
    m.hp -= dmg;
    if (m.hp <= 0) this.killMinion(id);
  }
  killMinion(id) {
    const m = this.minions.get(id);
    if (!m) return;
    if (m.mesh) { FX.burst(m.mesh.position.clone().setY(DECK_Y + 0.6), '#ffffff', 10, 4); G.scene.remove(m.mesh); disposeObj(m.mesh); }
    Sound.play('splat');
    this.minions.delete(id);
  }

  /* ----- damage (host) ----- */
  damage(dmg) {
    if (this.st !== 'fight') return;
    this.hp = Math.max(0, this.hp - dmg);
    this.flash = 1;
    if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
      this.onPhase2();
    }
    if (this.hp <= 0) {
      this.st = 'dying';
      this.ai.dieT = this.t;
      this.ai.mv = null;
      this.contact = 0;
      for (const id of [...this.minions.keys()]) this.killMinion(id);
      this.onDying();
      Net.toAll({ t: 'bs', p: [this.pos.x, this.pos.y, this.pos.z], r: this.rot, hp: 0, ph: this.phase, st: 'dying', c: 0, cd: 0, mm: [] });
    }
  }
  checkAllOut() {
    const present = this.ids.filter((id) => id === Net.myId || G.remotes.has(id));
    if (!present.length) return true;
    return present.every((id) => this.out.has(id));
  }
  end(won) {
    if (this.over) return;
    Net.toAll({ t: 'bend', won });
    this.finish(won);
  }

  /* ================= everyone ================= */
  exec(a) {
    switch (a.k) {
      case 'proj':
        for (const s of a.l) this.projs.push({ s, t: -(s.w || 0), pos: new V3(...s.p), vel: new V3(...s.v), mesh: null, tele: null });
        if (a.l.length) Sound.play('throw');
        break;
      case 'ring': this.rings.push({ s: a, t: -(a.w || 0), mesh: null, hit: false }); break;
      case 'slam': this.slams.push({ s: a, t: 0, mesh: null, done: false }); break;
      case 'lane': this.lanes.push({ s: a, t: 0, mesh: null, hit: false }); break;
      case 'multi': for (const x of a.l) this.exec(x); break;
      case 'reels':
        this.reel = { t: 0, s: a.s };
        Sound.play('flip');
        break;
      case 'fx':
        if (a.snd) Sound.play(a.snd);
        if (a.shake) G.shake = Math.max(G.shake, a.shake * this.nearFactor(this.rpos));
        if (a.text) UI.bigTitle(a.text, '', '#ffd23f', 1.4);
        if (a.anim === 'slam') this.slamAnim = 0.5;
        break;
    }
  }
  nearFactor(p) { const d = Math.hypot(p.x - this.me().pos.x, p.z - this.me().pos.z); return U.clamp(1.4 - d / 20, 0.2, 1); }
  onTaunt(text) {
    UI.subtitle({ gary: 'GARY', blorb: 'QUEEN BLORBINA', jerry: 'JACKPOT JERRY', snowdad: 'SNOWDAD', zorblax: 'ZORBLAX' }[this.id], text);
    Sound.play(this.id === 'snowdad' ? 'rimshot' : this.id === 'blorb' ? 'blub' : 'dad');
  }
  onPhase2() {
    UI.bigTitle('PHASE 2', this.id === 'zorblax' ? '"I WANT TO SPEAK TO YOUR MANAGER!"' : `${this.def.name} is ANGRY now`, '#ff6bd6', 2.6);
    UI.bossHp(this.hp / this.maxHp, true);
    Sound.play('phase');
    G.shake = 1;
    if (this.id === 'zorblax') setAtmosphere(PLANETS[G.planet], '#ff0000');
  }
  onDying() {
    Sound.play('roar');
    UI.bigTitle('DEFEATED!', this.def.win, '#7dff8a', 3.2);
    UI.bossHp(0);
    for (const h of [...this.projs, ...this.rings, ...this.slams, ...this.lanes]) this.removeHazard(h);
    this.projs = []; this.rings = []; this.slams = []; this.lanes = [];
  }
  canHurt() { const p = this.me(); return this.st === 'fight' && this.inFight(Net.myId) && !p.dead && !p.ghost && p.inv <= 0; }

  update(dt) {
    this.t += dt;
    if (Net.isHost) this.hostUpdate(dt);
    // render pose
    if (Net.isHost) { this.rpos.copy(this.pos); }
    else {
      if (this.rpos.distanceTo(this.tpos) > 25) this.rpos.copy(this.tpos);
      this.rpos.x = U.damp(this.rpos.x, this.tpos.x, 10, dt);
      this.rpos.y = U.damp(this.rpos.y, this.tpos.y, 10, dt);
      this.rpos.z = U.damp(this.rpos.z, this.tpos.z, 10, dt);
      this.rot += U.angDiff(this.rot, this.trot) * Math.min(1, dt * 10);
    }
    this.animate(dt);
    this.updateHazards(dt);
    this.updateMinions(dt);
    this.updateLocal(dt);
    UI.bossHp(this.hp / this.maxHp, this.phase === 2);
  }

  animate(dt) {
    const m = this.m, t = this.t;
    const prev = this._last || this.rpos.clone();
    this.speed = U.damp(this.speed, Math.hypot(this.rpos.x - prev.x, this.rpos.z - prev.z) / Math.max(dt, 1e-4), 6, dt);
    this._last = this.rpos.clone();
    m.root.position.copy(this.rpos);
    m.root.rotation.y = this.rot;
    this.flash = Math.max(0, this.flash - dt * 6);
    const punch = 1 + this.flash * 0.06;
    m.body.scale.set(punch, punch, punch);
    const walk = Math.sin(t * 6) * U.clamp(this.speed / 3, 0, 1);
    if (m.legs) { m.legs[0].rotation.x = walk * 0.5; m.legs[1].rotation.x = -walk * 0.5; }
    if (m.arms && this.id !== 'jerry') {
      const sl = this.slamAnim > 0 ? -2.2 : 0;
      m.arms[0].rotation.x = -walk * 0.4 + sl; m.arms[1].rotation.x = walk * 0.4 + sl;
      this.slamAnim = Math.max(0, (this.slamAnim || 0) - dt);
    }
    if (this.id === 'gary') {
      m.lid.rotation.z = 0.25 + Math.sin(t * 3) * 0.08;
      m.flies.forEach((f, i) => f.position.set(Math.cos(t * 5 + i * 1.6) * 1.6, 6.3 + Math.sin(t * 7 + i) * 0.4, Math.sin(t * 5 + i * 1.6) * 1.6));
    } else if (this.id === 'blorb') {
      const air = this.rpos.y > DECK_Y + 0.6;
      const sq = air ? 1.15 : 1 + Math.sin(t * 4) * 0.06;
      m.body.scale.set(punch / Math.sqrt(sq), punch * sq, punch / Math.sqrt(sq));
    } else if (this.id === 'jerry') {
      m.body.position.y = 0.3 + Math.sin(t * 2) * 0.15;
      m.arms[0].rotation.z = Math.sin(t * 2) * 0.2; m.arms[1].rotation.z = -Math.sin(t * 2) * 0.2;
      if (this.reel) {
        this.reel.t += dt;
        const spinning = this.reel.t < 1.3;
        if (spinning && Math.floor(this.reel.t * 14) !== this.reel.f) { this.reel.f = Math.floor(this.reel.t * 14); drawJerryReels(m.reelTex, this.reel.s, true); Sound.play('tick'); }
        m.lever.rotation.x = spinning ? 0.9 : U.damp(m.lever.rotation.x, 0, 6, dt);
        if (!spinning && !this.reel.shown) { this.reel.shown = true; drawJerryReels(m.reelTex, this.reel.s, false); Sound.play('reelstop'); }
      }
    } else if (this.id === 'zorblax') {
      m.body.position.y = Math.sin(t * 2) * 0.2;
      m.head.rotation.z = Math.sin(t * 1.3) * 0.08;
    }
    if (this.st === 'dying' || (this.over && this.won)) {
      m.body.rotation.z = U.damp(m.body.rotation.z, Math.PI / 2, 2, dt);
      m.body.position.y = U.damp(m.body.position.y, 0.5, 2, dt);
    }
  }

  surfaceY(p) { return Math.hypot(p.x, p.z) < ARENA_R + 0.3 ? DECK_Y : WATER_Y - 1; }
  hurtCheckBody(pos, r) { return U.bodyDist2(pos, this.me().pos) < r * r; }

  updateHazards(dt) {
    const me = this.me();
    const col = RING_COL[this.id];
    // projectiles
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i], s = p.s;
      p.t += dt;
      if (p.t < 0) continue;
      if (!p.mesh) {
        p.mesh = projMesh(s.k, s.r);
        G.scene.add(p.mesh);
        if (s.tl) {
          // predict landing spot for the floor warning
          const g = s.g || 0;
          const vy = p.vel.y, dy = p.pos.y - DECK_Y;
          const T = g > 0 ? (vy + Math.sqrt(vy * vy + 2 * g * dy)) / g : 1;
          const lx = p.pos.x + p.vel.x * T, lz = p.pos.z + p.vel.z * T;
          p.tele = this.teleDisc(lx, lz, s.sp || s.r + 0.6, '#ff3d3d');
          p.teleT = T;
        }
      }
      p.vel.y -= (s.g || 0) * dt;
      p.pos.addScaledVector(p.vel, dt);
      p.mesh.position.copy(p.pos);
      p.mesh.rotation.x += dt * 5; p.mesh.rotation.y += dt * 7;
      if (p.tele) { p.tele.material.opacity = 0.25 + 0.35 * U.clamp(p.t / p.teleT, 0, 1); }
      let dead = false;
      if (this.canHurt() && this.hurtCheckBody(p.pos, s.r + 0.35)) {
        if (s.k === 'pizza' && me.tool === 'peel') this.catchSlice(p.pos);
        else this.hurt(s.d, s.k);
        dead = true;
      }
      else if (p.pos.y <= this.surfaceY(p.pos)) {
        dead = true;
        if (p.pos.y > WATER_Y - 0.5) FX.burst(p.pos, s.k === 'snow' || s.k === 'icicle' ? '#ffffff' : col, 5, 3);
        if (s.sp && this.canHurt() && Math.hypot(p.pos.x - me.pos.x, p.pos.z - me.pos.z) < s.sp && me.pos.y < DECK_Y + 1.5) this.hurt(s.d, s.k);
      } else if (p.t > 8 || Math.abs(p.pos.x) > 60 || Math.abs(p.pos.z) > 60) dead = true;
      if (dead) { this.removeHazard(p); this.projs.splice(i, 1); }
    }
    // shockwave rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i], s = r.s;
      r.t += dt;
      if (r.t < 0) continue;
      const rad = r.t * s.s;
      if (!r.mesh) {
        r.mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, s.h, 48, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
        r.mesh.position.set(s.c[0], DECK_Y + s.h / 2, s.c[1]);
        G.scene.add(r.mesh);
        Sound.play('boom');
      }
      r.mesh.scale.set(Math.max(0.1, rad), 1, Math.max(0.1, rad));
      r.mesh.material.opacity = 0.6 * (1 - rad / s.m);
      if (!r.hit && this.canHurt()) {
        const d = Math.hypot(me.pos.x - s.c[0], me.pos.z - s.c[1]);
        if (Math.abs(d - rad) < 0.55 && me.pos.y < DECK_Y + s.h) { r.hit = true; this.hurt(s.d, 'ring'); }
      }
      if (rad > s.m) { this.removeHazard(r); this.rings.splice(i, 1); }
    }
    // slams (red circle, then boom)
    for (let i = this.slams.length - 1; i >= 0; i--) {
      const sl = this.slams[i], s = sl.s;
      sl.t += dt;
      if (!sl.mesh) sl.mesh = this.teleDisc(s.c[0], s.c[1], s.r, '#ff2020');
      const k = U.clamp(sl.t / s.w, 0, 1);
      sl.mesh.material.opacity = 0.2 + 0.5 * k;
      if (sl.fill) sl.fill.scale.setScalar(Math.max(0.05, k));
      if (!sl.done && sl.t >= s.w) {
        sl.done = true;
        FX.ring(new V3(s.c[0], DECK_Y + 0.1, s.c[1]), '#ffffff', s.r);
        FX.burst(new V3(s.c[0], DECK_Y + 0.5, s.c[1]), col, 10, 6);
        G.shake = Math.max(G.shake, 0.6 * this.nearFactor(new V3(s.c[0], 0, s.c[1])));
        if (this.canHurt() && Math.hypot(me.pos.x - s.c[0], me.pos.z - s.c[1]) < s.r && me.pos.y < DECK_Y + 2.2) this.hurt(s.d, 'slam');
      }
      if (sl.t > s.w + 0.25) { this.removeHazard(sl); this.slams.splice(i, 1); }
    }
    // laser lanes
    for (let i = this.lanes.length - 1; i >= 0; i--) {
      const ln = this.lanes[i], s = ln.s;
      ln.t += dt;
      if (!ln.mesh) {
        const ax = s.a[0], az = s.a[1], bx = s.b[0], bz = s.b[1];
        const len = Math.hypot(bx - ax, bz - az);
        ln.mesh = new THREE.Mesh(new THREE.PlaneGeometry(s.hw * 2, len), new THREE.MeshBasicMaterial({ color: '#ff2020', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
        ln.mesh.rotation.x = -Math.PI / 2;
        ln.mesh.rotation.z = -Math.atan2(bx - ax, bz - az);
        ln.mesh.position.set((ax + bx) / 2, DECK_Y + 0.06, (az + bz) / 2);
        G.scene.add(ln.mesh);
        ln.beam = new THREE.Mesh(new THREE.BoxGeometry(s.hw * 1.4, 1.6, len), new THREE.MeshBasicMaterial({ color: this.id === 'jerry' ? '#ffd23f' : '#ff3df0', transparent: true, opacity: 0.8 }));
        ln.beam.rotation.y = Math.atan2(bx - ax, bz - az);
        ln.beam.position.set((ax + bx) / 2, DECK_Y + 0.8, (az + bz) / 2);
        ln.beam.visible = false;
        G.scene.add(ln.beam);
      }
      const active = ln.t >= s.w && ln.t < s.w + s.dur;
      ln.mesh.material.opacity = active ? 0.7 : 0.18 + 0.25 * Math.abs(Math.sin(ln.t * 12));
      if (active && !ln.beam.visible) { ln.beam.visible = true; Sound.play('zap'); G.shake = Math.max(G.shake, 0.3); }
      if (ln.beam.visible) ln.beam.scale.x = 1 + Math.sin(ln.t * 60) * 0.15;
      if (active && !ln.hit && this.canHurt()) {
        const ax = s.a[0], az = s.a[1], bx = s.b[0], bz = s.b[1];
        const vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz;
        const k = U.clamp(((me.pos.x - ax) * vx + (me.pos.z - az) * vz) / L2, 0, 1);
        if (Math.hypot(me.pos.x - (ax + vx * k), me.pos.z - (az + vz * k)) < s.hw + 0.3 && me.pos.y < DECK_Y + 2) { ln.hit = true; this.hurt(s.d, 'laser'); }
      }
      if (ln.t > s.w + s.dur + 0.1) { this.removeHazard(ln); this.lanes.splice(i, 1); }
    }
    // body contact
    if (this.contact > 0 && this.canHurt()) {
      const d = Math.hypot(me.pos.x - this.rpos.x, me.pos.z - this.rpos.z);
      if (d < this.contact && Math.abs(me.pos.y - this.rpos.y) < 3.5) {
        this.hurt(this.contactDmg, 'body');
        const k = new V3(me.pos.x - this.rpos.x, 0, me.pos.z - this.rpos.z).normalize();
        me.vel.x += k.x * 12; me.vel.z += k.z * 12; me.vel.y = 6;
      }
    }
  }
  teleDisc(x, z, r, color) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 28), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, DECK_Y + 0.05 + Math.random() * 0.02, z);
    G.scene.add(m);
    return m;
  }
  removeHazard(h) {
    for (const k of ['mesh', 'tele', 'beam']) {
      if (h[k]) { G.scene.remove(h[k]); disposeObj(h[k]); h[k] = null; }
    }
  }

  updateMinions(dt) {
    const me = this.me();
    for (const m of this.minions.values()) {
      if (!m.mesh) {
        m.mesh = buildMinion(m.kind);
        m.mesh.position.set(m.x, DECK_Y, m.z);
        G.scene.add(m.mesh);
        FX.burst(new V3(m.x, DECK_Y + 0.5, m.z), '#ffffff', 5, 3);
      }
      const px = m.mesh.position.x, pz = m.mesh.position.z;
      m.mesh.position.x = U.damp(px, m.tx, 10, dt);
      m.mesh.position.z = U.damp(pz, m.tz, 10, dt);
      m.mesh.position.y = DECK_Y + Math.abs(Math.sin(this.t * 8 + m.id)) * 0.3;
      const dx = m.mesh.position.x - px, dz = m.mesh.position.z - pz;
      if (Math.abs(dx) + Math.abs(dz) > 0.001) m.mesh.rotation.y = Math.atan2(dx, dz);
      m.hitT -= dt;
      if (this.canHurt() && Math.hypot(me.pos.x - m.mesh.position.x, me.pos.z - m.mesh.position.z) < 1.0 && me.pos.y < DECK_Y + 1.5) this.hurt(8, 'minion');
    }
  }
  hitTest(p0, p1) {
    if (this.st !== 'fight') return false;
    for (const h of this.m.hit) if (U.segSphere(p0, p1, this.world(h.o), h.r)) return true;
    return false;
  }
  // the first minion a shot from p0 to p1 passes through (skip: ones this shot already hit, keyed 'm' + id)
  minionOn(p0, p1, skip) {
    for (const m of this.minions.values()) {
      if (!m.mesh || (skip && skip.has('m' + m.id))) continue;
      const c = m.mesh.position.clone(); c.y += 0.6;
      if (U.segSphere(p0, p1, c, 0.75)) return m;
    }
    return null;
  }
  hitMinion(m, dmg, quiet) {
    if (!m.mesh) return;
    const c = m.mesh.position.clone(); c.y += 0.6;
    FX.burst(c, '#ffffff', quiet ? 2 : 5, 3);
    if (!quiet) { FX.text(c.clone().setY(c.y + 0.8), String(dmg), '#ffffff', 36); Sound.play('hit'); }
    if (Net.isHost) this.damageMinion(m.id, dmg); else Net.toHost({ t: 'hitm', id: m.id, dmg });
  }
  hitMinions(p0, p1, dmg) { const m = this.minionOn(p0, p1); if (m) this.hitMinion(m, dmg); return !!m; }
  // quiet: no damage number or sound (the Cryo Beam hits ten times a second)
  localHit(dmg, pos, quiet) {
    this.flash = 1;
    if (!quiet) {
      FX.text(pos.clone().add(new V3(0, 0.6, 0)), String(dmg), dmg >= 50 ? '#ffd23f' : '#ffffff', dmg >= 50 ? 60 : 44);
      Sound.play('hit');
      const x = UI.el.crosshair; x.classList.remove('hit'); void x.offsetWidth; x.classList.add('hit');
    }
    FX.burst(pos, RING_COL[this.id], quiet ? 2 : 4, 3);
    if (Net.isHost) this.damage(dmg); else Net.toHost({ t: 'hitb', dmg });
  }
  // skipBoss: the shot already hit the boss directly (only the splash hits everything else)
  explosion(pos, radius, dmg, skipBoss) {
    if (!skipBoss) for (const h of this.m.hit) {
      if (this.world(h.o).distanceTo(pos) < radius + h.r) { this.localHit(dmg, pos); break; }
    }
    for (const m of [...this.minions.values()]) {
      if (!m.mesh || m.mesh.position.distanceTo(pos) > radius) continue;
      if (Net.isHost) this.damageMinion(m.id, dmg); else Net.toHost({ t: 'hitm', id: m.id, dmg });
    }
  }

  // the Pizza Peel catches the Emperor's pizza slices instead of your face
  catchSlice(pos) {
    FX.text(pos.clone().add(new V3(0, 0.8, 0)), U.pick(LINES.meteorCatch), '#ffd23f', 50);
    FX.burst(pos, '#ffc94a', 6, 3);
    this.me().swing = 1;
    Sound.play('catch');
    if (U.chance(0.3)) UI.toast(U.pick(['Caught it. It IS cold, honestly.', 'Returned to sender. Sort of.', 'Delivery accepted. By you. Again.']), '', 1.6);
  }

  /* ----- the local player's life ----- */
  // bosses hit a bit softer than they used to (BOSS_DMG), but they have far more health.
  // raw = friendly fire: same damage on every difficulty
  hurt(d, kind, raw) {
    const p = this.me();
    if (!this.canHurt()) return;
    d = Math.round(raw ? d : d * Game.dmgMul() * BOSS_DMG);
    if (SAVE.armor) d = Math.round(d * 0.7);
    p.hp -= d; p.inv = 0.75; p.regenT = 4;
    UI.hurt();
    G.shake = Math.max(G.shake, 0.55);
    Sound.play('hurt');
    if (kind === 'coin' && U.chance(0.5)) { addBucks(1); UI.toast('+$1 (at least you got paid)', 'gold', 1.2); }
    if (kind === 'pizza' && U.chance(0.3)) UI.toast('It IS pretty cold, honestly.', '', 1.5);
    if (p.hp <= 0) {
      if (p.canGoDown()) p.goDown(this.def.name, () => this.die());
      else this.die();
    }
  }
  // no lives: you get back up as many times as it takes (except on Hardcore, where dying is final)
  die() {
    const p = this.me();
    p.dead = true; p.deadT = 0; p.hp = 0;
    SAVE.stats.deaths++;
    persist();
    Sound.play('death');
    if (DIFFS[G.diff].perma) { Game.permaDeath(this.def.name); return; }
    const n = this.def.name;
    // (nothing drops in a boss fight: you'd never get your gun back in here)
    UI.death(true, 'YOU DIED', U.pick(LINES.death), `<b>${U.esc(U.pick([`${n} is doing a little victory dance. Rude.`, `${n} thinks you're done. Prove it wrong.`, 'Get back in there. Respawns are free. Dignity is not.']))}</b><small>You keep your stuff in boss fights.</small>`);
    p.waitForRespawn(() => this.respawnMe());
  }
  // back into the fight (after holding left click on the death screen)
  respawnMe() {
    const p = this.me();
    p.dead = false; p.hp = 100; p.inv = 2;
    p.refill();
    const sp = U.pick(G.arena.spawns);
    p.teleport(sp, Math.atan2(-(this.rpos.x - sp.x), -(this.rpos.z - sp.z)));
    FX.burst(p.pos.clone().setY(p.pos.y + 1), '#7dff8a', 12, 4);
  }
  updateLocal(dt) {
    const p = this.me();
    UI.php(p.hp);
    const rows = [{ name: G.name + ' (you)', hp: p.hp, out: p.ghost }];
    for (const r of G.remotes.values()) if (this.inFight(r.id)) rows.push({ name: r.name, hp: r.s.hp, out: !!r.s.g });
    UI.team(rows);
  }

  /* ----- client sync ----- */
  onSync(m) {
    this.tpos.set(m.p[0], m.p[1], m.p[2]);
    this.trot = m.r;
    this.hp = m.hp;
    this.contact = m.c; this.contactDmg = m.cd || 15;
    if (m.ph === 2 && this.phase === 1) { this.phase = 2; this.onPhase2(); }
    if (m.st === 'fight' && this.st === 'intro') this.st = 'fight';
    if (m.st === 'dying' && this.st !== 'dying' && !this.over) { this.st = 'dying'; this.onDying(); }
    const seen = new Set();
    for (const [id, x, z] of m.mm || []) {
      seen.add(id);
      let mm = this.minions.get(id);
      if (!mm) { mm = { id, x, z, tx: x, tz: z, kind: MINION_KIND[this.id], mesh: null, hitT: 0 }; this.minions.set(id, mm); }
      mm.tx = x; mm.tz = z;
    }
    for (const id of [...this.minions.keys()]) if (!seen.has(id)) this.killMinion(id);
  }

  /* ----- the end ----- */
  finish(won) {
    if (this.over) return;
    this.over = true; this.won = won;
    this.st = won ? 'dying' : 'over';
    const b = this.def;
    const first = !SAVE.beaten.includes(this.id);
    let html;
    if (won) {
      const reward = first ? b.reward : Math.round(b.reward * 0.5);
      addBucks(reward);
      if (first) SAVE.beaten.push(this.id);
      if (!G.progress.includes(this.id)) G.progress.push(this.id);
      SAVE.stats.bossWins++;
      persist();
      Sound.play('victory');
      const nextIdx = G.planet + 1;
      const unlock = nextIdx < PLANETS.length ? `<p class="center" style="font-size:18px">New planet unlocked: <b>${U.esc(PLANETS[nextIdx].name)}</b>! Fly there from your ship.</p>` : '';
      html = `<h2 class="ph center" style="color:#1e9b3a;padding:0">VICTORY!</h2>
        <p class="center psub">${U.esc(b.win)}</p>
        <div class="bigmsg win">+${U.bucks(reward)}</div>${unlock}`;
    } else {
      const bill = Math.min(1000, Math.round(SAVE.bucks * 0.1));
      addBucks(-bill);
      Sound.play('lose');
      html = `<h2 class="ph center" style="color:#c8281b;padding:0">DEFEAT</h2>
        <p class="center psub">${U.esc(b.name)} wins this time. The pizza gets colder.</p>
        <div class="bigmsg lose">Space hospital bill: -${U.bucks(bill)}</div>
        <p class="center">For a rematch you'll need another <b>${U.esc(SUMMONS[this.id].name)}</b>.</p>
        <p class="center muted">Tip: upgrade your zapper at the shop, grab Goo Grenades, reload when it's safe, and jump over the rings!</p>`;
    }
    setTimeout(() => {
      if (document.pointerLockElement) document.exitPointerLock();
      UI.openPanel(html + '<div class="center" style="margin-top:12px"><button class="btn big" data-act="back" style="max-width:320px">Back to the planet ▶</button></div>',
        (act) => { if (act === 'back') UI.closePanel(); }, null, () => Game.endBoss(won && this.id === 'zorblax'));
    }, won ? 2600 : 1200);
  }
  dispose() {
    for (const h of [...this.projs, ...this.rings, ...this.slams, ...this.lanes]) this.removeHazard(h);
    for (const id of [...this.minions.keys()]) { const m = this.minions.get(id); if (m.mesh) { G.scene.remove(m.mesh); disposeObj(m.mesh); } }
    this.minions.clear();
    G.scene.remove(this.m.root);
    disposeObj(this.m.root);
  }
}
