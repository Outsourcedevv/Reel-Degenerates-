'use strict';
/* =========================================================
   Space critters: little creatures roaming every planet.
   Shy ones run away. Mean ones hunt you: they spot you from
   a way off (a red "!" and a growl), chase you down, crouch
   and POUNCE (a red mark on the ground shows where), and the
   rarer mean kind on each planet throws or spits things at
   you from a distance, aiming where you're heading (some of
   the biters throw things too, now and then). Keep changing
   direction! Shoot one and it comes for you, and
   its friends nearby join in. Zap them, sell them. Every
   one rolls a size (bigger = rarer, tougher, worth more).
   Kill them in style for a bonus multiplier.
   A zapped critter goes flying, bounces, and lies there in a
   heap (legs in the air) until whoever zapped it picks it up
   (E, or the Grabby Vac). Backpack full? It waits for you,
   even if you leave the planet (or the game) and come back.
   The host runs their brains and tells everyone where they
   are; each player checks bites and hits on themselves.
   ========================================================= */
// how many are about on a planet at once, and how fast they turn up, depends on the world's difficulty (see DIFFS)
const critCap = () => (DIFFS[G.diff] || DIFFS.easy).crits;
const CRIT_SEND = 1 / 8;   // host sync rate
const GOLD_CHANCE = 0.03;
// mean critters hunting: how far they see you, how far from home they'll go, when they give up, how much faster
// they run when chasing, how long being shot makes them mad, and how far away their friends hear about it
const HUNT = { sight: 17, leash: 45, giveUp: 30, chase: 1.3, angry: 10, pack: 14 };
// the pounce: from how far, how long the crouch lasts (the warning), the leap, and how hard it hits
// (it leaps a bit further than the range it starts from: stand still and it lands on you, move and it misses)
const POUNCE = { range: 4, windup: 0.55, time: 0.36, speed: 12, cd: [2.2, 3.4], rest: 0.5, dmg: 1.4 };
const CHARGE = { range: 9.5, windup: 0.8, time: 0.6, speed: 17 }; // (Feral E-Scooters: a long, fast charge)
// throwing and spitting: from how far, how fast it flies, how often, the distance they like to keep, damage,
// and how far ahead of you they aim (1: right where you'll be if you keep going the same way)
const SPIT = { min: 3.2, max: 13, speed: 12, cd: [2.6, 3.6], keep: [6.5, 10], dmg: 0.8, lead: 0.95 };
// biters that also throw things (toss): from how far, the wind-up (it stops and rears up), and how often
const TOSS = { min: 5, max: 14, windup: 0.4, cd: [3.5, 5.5] };

const POUNCE_MARK = {}; // (the pounce warning's shared shapes, made the first time one's needed)
// zapped critters (see makeBody): gravity, how much of a bounce is left after each one, how fast they stop sliding,
// how long somebody else's catch lies around, the most of yours there can be lying around, and how close you
// have to be to pick one up
const BODY = { grav: 24, bounce: 0.42, fric: 4, keep: 120, max: 50, reach: 2.6 };
const _bq = new THREE.Quaternion(), _bv = new V3(), _bv2 = new V3();

// a critter's (or a mini boss's) head in the world, for headshots: { p, r } (m: its model, standing at `at`,
// turned ry, scaled up s)
function critterHead(m, at, ry, s) {
  const h = m.head || [0, m.hit, 0, m.hit * 0.5], c = Math.cos(ry), sn = Math.sin(ry), x = h[0] * s, z = h[2] * s;
  return { p: new V3(at.x + x * c + z * sn, at.y + h[1] * s, at.z - x * sn + z * c), r: h[3] * s };
}
const Critters = {
  list: new Map(), // id -> critter
  spits: [],       // things critters threw or spat, in the air right now
  planet: -1, nextId: 1, spawnT: 0, sendT: 0, biteCd: 0,
  kills: [],       // times of my recent kills (for double / multi kills)
  bitBy: new Map(),// critter id -> when it last bit me (for revenge)

  kinds(pi) { return CRITTERS[PLANETS[pi].id]; },

  update(dt) {
    const pi = G.planet;
    if (this.planet !== pi) { this.clear(); this.spawnT = 0; }
    this.planet = pi;
    if (Net.isHost && this.anyoneHere()) this.host(dt);
    this.animate(dt);
    this.updateBodies(dt);
    this.bites(dt);
    this.updateSpits(dt);
  },
  anyoneHere() {
    if (G.mode === 'planet') return true;
    for (const r of G.remotes.values()) if (r.s.m === 'planet' && r.s.p === G.planet) return true;
    return false;
  },
  // everyone on the planet (for fleeing and chasing). safe: they just got here, so mean critters leave them be
  players() {
    const out = [];
    if (G.mode === 'planet' && !G.player.dead) out.push({ id: Net.myId, p: G.player.pos, v: G.player.vel, safe: G.player.safeT > 0 });
    for (const r of G.remotes.values()) if (r.s.m === 'planet' && r.s.p === G.planet && !r.s.d) out.push({ id: r.id, p: r.tpos, v: r.tvel, safe: !!r.s.sf });
    return out;
  },

  /* ---------- host: spawning and brains ---------- */
  host(dt) {
    const w = G.worlds[G.planet];
    if (!w) return;
    this.spawnT -= dt;
    const cap = critCap(), rate = (DIFFS[G.diff] || DIFFS.easy).spawn;
    if (this.list.size < cap && this.spawnT <= 0) {
      this.spawnT = this.list.size < cap / 2 ? rate[0] : rate[1];
      this.spawn(w);
    }
    const ps = this.players();
    for (const c of this.list.values()) {
      // gooed (Goo Lobber): slowed down · frozen (Cryo Beam): stuck, and can't bite · shocked (lightning, stomps): stunned
      c.slowT = (c.slowT || 0) - dt; c.frozeT = (c.frozeT || 0) - dt; c.shockT = (c.shockT || 0) - dt;
      c.st = c.frozeT > 0 ? 2 : c.shockT > 0 ? 3 : c.slowT > 0 ? 1 : 0;
      this.think(c, w, ps, dt);
    }
    this.sendT -= dt;
    if (this.sendT <= 0 && Net.online) {
      this.sendT = CRIT_SEND;
      Net.toAll({ t: 'crit', p: G.planet, l: [...this.list.values()].map((c) => [c.id, c.k, c.g, U.r2(c.x), U.r2(c.z), U.r2(c.ry), Math.round((c.hp / c.max) * 100), c.sz, c.st || 0, c.a || 0, c.foe ? 1 : 0]) });
    }
  },
  spawn(w) {
    const kinds = this.kinds(G.planet);
    for (let tries = 0; tries < 20; tries++) {
      const a = Math.random() * Math.PI * 2, r = U.rand(14, PLANET_R - 6);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const sz = U.weighted(SIZES.map((s, i) => [i, s.w]));
      if (!w.walkable(x, z, Math.max(0.8, 0.3 * SIZES[sz].s))) continue; // (the big ones need room)
      const k = U.weighted(kinds.map((d, i) => [i, d.w || 20]));
      const g = Math.random() < GOLD_CHANCE ? 1 : 0;
      const c = this.add(this.nextId++, k, g, x, z, Math.random() * 6, sz);
      c.hp = c.max = kinds[k].hp * SIZES[sz].hp * (g ? 2 : 1) * (DIFFS[G.diff] || DIFFS.easy).crit;
      c.hx = x; c.hz = z;
      FX.burst(new V3(x, w.gh(x, z) + 0.3, z), '#ffffff', 5, 2);
      return;
    }
  },
  // host: one of this planet's critters, right here (a mini boss calling for backup: already mad at foe)
  spawnAt(k, x, z, sz, foe) {
    const kinds = this.kinds(G.planet), w = G.worlds[G.planet];
    const c = this.add(this.nextId++, k, 0, x, z, Math.random() * 6, sz);
    c.hp = c.max = kinds[k].hp * SIZES[sz].hp * (DIFFS[G.diff] || DIFFS.easy).crit;
    c.hx = x; c.hz = z;
    if (foe) { c.foe = foe; c.angryT = 12; c.tossCd = U.rand(1, 2.5); }
    FX.burst(new V3(x, w.gh(x, z) + 0.3, z), '#ffffff', 8, 3);
    return c;
  },
  think(c, w, ps, dt) {
    c.atkCd = (c.atkCd || 0) - dt; c.angryT = (c.angryT || 0) - dt; c.tossCd = (c.tossCd || 0) - dt;
    if (c.st === 2 || c.st === 3) { c.spd = 0; c.a = 0; return; } // frozen solid / stunned (and that stops a pounce)
    const def = this.kinds(G.planet)[c.k], sz = SIZES[c.sz];
    const speed = def.speed * sz.spd * (c.st === 1 ? 0.4 : 1);
    if (def.mood === 'mean' && this.hunt(c, w, ps, dt, def, sz, speed)) return;
    let near = null, nd = Infinity;
    if (def.mood === 'shy') {
      for (const q of ps) {
        const d = Math.hypot(q.p.x - c.x, q.p.z - c.z);
        if (d < nd) { nd = d; near = q.p; }
      }
    }
    let tx = c.tx, tz = c.tz, spd = speed * 0.45;
    if (near && nd < 8) { // run away!
      tx = c.x + (c.x - near.x); tz = c.z + (c.z - near.z); spd = speed * 1.2;
    } else {
      c.wt -= dt;
      if (c.wt <= 0 || Math.hypot(tx - c.x, tz - c.z) < 0.5) {
        c.wt = U.rand(2, 5);
        c.tx = c.hx + U.rand(-8, 8); c.tz = c.hz + U.rand(-8, 8);
        tx = c.tx; tz = c.tz;
      }
      if (c.wt > 3.5) spd = 0; // stand around sometimes
    }
    this.step(c, w, sz, tx, tz, spd, dt);
  },
  // walk toward (tx, tz) (sliding along whatever's in the way)
  step(c, w, sz, tx, tz, spd, dt, face = true) {
    const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz), rad = 0.25 * sz.s;
    if (d > 0.05 && spd > 0) {
      const mx = (dx / d) * spd * dt, mz = (dz / d) * spd * dt;
      if (w.walkable(c.x + mx, c.z + mz, rad)) { c.x += mx; c.z += mz; }
      else if (w.walkable(c.x + mx, c.z, rad)) c.x += mx;
      else if (w.walkable(c.x, c.z + mz, rad)) c.z += mz;
      else { c.wt = 0; c.tx = c.hx; c.tz = c.hz; }
      if (face) c.ry = Math.atan2(dx, dz);
    }
    c.spd = spd;
  },
  // who a mean critter goes for: whoever made it mad, or the nearest player it can see (not ones who just
  // arrived). Chases don't go on forever: it gives up when you get away, or it's strayed too far from home.
  target(c, ps) {
    if (c.angryT > 0 && c.foe) { const q = ps.find((o) => o.id === c.foe); if (q) return q; }
    const home = Math.hypot(c.x - c.hx, c.z - c.hz);
    // Once leashed, return well inside home before acquiring again. Otherwise
    // a single step over/back across the boundary repeatedly flashes an alert.
    if (home >= HUNT.leash) c.returning = true;
    if (c.returning) {
      if (home > HUNT.leash * 0.5) { c.tx = c.hx; c.tz = c.hz; c.wt = 1; return null; }
      c.returning = false;
    }
    let best = null, bd = c.foe ? HUNT.giveUp : HUNT.sight;
    if (home < HUNT.leash) {
      for (const q of ps) {
        if (q.safe) continue;
        const d = Math.hypot(q.p.x - c.x, q.p.z - c.z);
        if (d < bd) { bd = d; best = q; }
      }
    }
    return best;
  },
  // a mean critter's turn: finish a pounce, or pick someone and go for them. false: nobody to go for.
  hunt(c, w, ps, dt, def, sz, speed) {
    const P = def.charge ? Object.assign({}, POUNCE, CHARGE) : POUNCE;
    if (c.a === 1) { // crouched, about to leap: turning to keep facing you
      c.aT -= dt; c.spd = 0;
      const q = this.target(c, ps);
      if (q && c.aT > 0.15) c.ry = Math.atan2(q.p.x - c.x, q.p.z - c.z);
      if (c.aT <= 0) { c.a = 2; c.aT = P.time; c.lungeT = c.lungeDur = P.time; c.lungeSpd = P.speed; }
      return true;
    }
    if (c.a === 2) { // in the air
      c.aT -= dt;
      const nx = c.x + Math.sin(c.ry) * P.speed * dt, nz = c.z + Math.cos(c.ry) * P.speed * dt;
      if (w.walkable(nx, nz, 0.25 * sz.s)) { c.x = nx; c.z = nz; } else c.aT = 0;
      c.spd = P.speed;
      if (c.aT <= 0) { c.a = 0; c.atkCd = U.rand(P.cd[0], P.cd[1]); c.restT = P.rest; }
      return true;
    }
    if (c.a === 3) { // reared up, about to throw something
      c.aT -= dt; c.spd = 0;
      const q = this.target(c, ps);
      if (q) c.ry = Math.atan2(q.p.x - c.x, q.p.z - c.z);
      if (c.aT <= 0) { c.a = 0; if (q) this.spit(c, def, sz, q, true); }
      return true;
    }
    if (c.restT > 0) { c.restT -= dt; c.spd = 0; return true; } // (catching its breath: your chance)
    const q = this.target(c, ps);
    const was = c.foe;
    c.foe = q ? q.id : null;
    if (!q) return false;
    if (!was) this.alert(c);
    const dx = q.p.x - c.x, dz = q.p.z - c.z, d = Math.hypot(dx, dz);
    const run = speed * HUNT.chase;
    if (def.spit) {
      // throwers keep their distance, circle round you, and throw
      if (d < SPIT.max && d > SPIT.min && c.atkCd <= 0) { this.spit(c, def, sz, q); c.atkCd = U.rand(SPIT.cd[0], SPIT.cd[1]); }
      if (d > SPIT.keep[1]) this.step(c, w, sz, q.p.x, q.p.z, run, dt);
      else if (d < SPIT.keep[0]) this.step(c, w, sz, c.x - dx, c.z - dz, run * 0.8, dt, false);
      else { const s = c.id % 2 ? 1 : -1; this.step(c, w, sz, c.x + dz * s, c.z - dx * s, speed * 0.6, dt, false); }
      c.ry = Math.atan2(dx, dz);
      return true;
    }
    // (biters that throw: now and then, from a way off, they stop and throw something first)
    if (def.toss && c.tossCd <= 0 && c.atkCd <= 0 && d > TOSS.min && d < TOSS.max) { c.a = 3; c.aT = TOSS.windup; c.spd = 0; c.tossCd = U.rand(TOSS.cd[0], TOSS.cd[1]); c.ry = Math.atan2(dx, dz); return true; }
    if (d < P.range && d > 1.3 * sz.s && c.atkCd <= 0) { c.a = 1; c.aT = P.windup; c.spd = 0; c.ry = Math.atan2(dx, dz); if (def.charge) this.beep(c); return true; }
    this.step(c, w, sz, q.p.x, q.p.z, d < 1.05 * sz.s ? 0 : run, dt);
    return true;
  },
  // it spotted someone: a red "!" over its head (and a growl, if it's you it's after and it's close)
  alert(c) {
    if (c.alertAt != null && c.t - c.alertAt < 5) return;
    const w = G.worlds[G.planet];
    if (!w) return;
    c.alertAt = c.t;
    const s = SIZES[c.sz].s, at = new V3(c.rx, w.gh(c.rx, c.rz) + (c.m.hit * 2 + 0.6) * s, c.rz);
    FX.text(at, '!', '#ff4b4b', 64);
    if (!(c.tossCd > 0)) c.tossCd = U.rand(0.2, 0.7); // (biters that throw open with a throw, from where they spotted you)
    if (G.mode === 'planet' && !G.player.dead && Math.hypot(G.player.pos.x - c.rx, G.player.pos.z - c.rz) < 20) Sound.play('growl');
  },

  /* ---------- everyone ---------- */
  add(id, k, g, x, z, ry, sz = SIZE_NORMAL) {
    const w = G.worlds[G.planet], def = this.kinds(G.planet)[k];
    const m = buildCritter(def.id, !!g);
    const s = SIZES[sz] ? SIZES[sz].s : 1;
    m.root.scale.setScalar(s);
    m.root.position.set(x, w.gh(x, z), z);
    w.dyn.add(m.root);
    const c = { id, k, g, sz, x, z, ry, rx: x, rz: z, rry: ry, tx: x, tz: z, hx: x, hz: z, wt: 0, hp: def.hp, max: def.hp, pct: 100, m, t: Math.random() * 5, spd: 0, flash: 0, myHits: 0, style: null };
    this.list.set(id, c);
    return c;
  },
  remove(id) {
    const c = this.list.get(id);
    if (!c) return;
    if (c.m.root.parent) c.m.root.parent.remove(c.m.root);
    disposeObj(c.m.root);
    this.list.delete(id);
  },
  clear() {
    for (const id of [...this.list.keys()]) this.remove(id);
    for (const sp of this.spits) if (sp.mesh) { if (sp.mesh.parent) sp.mesh.parent.remove(sp.mesh); disposeObj(sp.mesh); }
    this.spits.length = 0;
  },
  // client: the host's snapshot of the planet's critters
  onSnap(m) {
    if (Net.isHost || m.p !== G.planet || !G.worlds[G.planet]) return;
    this.planet = m.p;
    const seen = new Set();
    for (const [id, k, g, x, z, ry, pct, sz, st, a, ag] of m.l) {
      seen.add(id);
      const c = this.list.get(id) || this.add(id, k, g, x, z, ry, sz == null ? SIZE_NORMAL : sz);
      c.x = x; c.z = z; c.ry = ry; c.pct = pct; c.st = st || 0;
      if (a === 2 && c.a !== 2) { // it leapt: play the leap here (so what you see is what bites you)
        const def = this.kinds(G.planet)[c.k], P = def.charge ? CHARGE : POUNCE;
        c.lungeT = c.lungeDur = P.time; c.lungeSpd = P.speed;
      }
      if (a === 1 && c.a !== 1 && this.kinds(G.planet)[c.k].charge) this.beep(c);
      if (ag && !c.ag) this.alert(c);
      c.a = a || 0; c.ag = ag || 0;
    }
    for (const id of [...this.list.keys()]) if (!seen.has(id)) this.remove(id);
  },
  animate(dt) {
    const w = G.worlds[G.planet];
    if (!w) return;
    for (const c of this.list.values()) {
      c.t += dt;
      const px = c.rx, pz = c.rz;
      if (c.lungeT > 0 && Net.isHost) { c.rx = c.x; c.rz = c.z; } // (mid-leap it's exactly where it is: that's what bites)
      else if (!(c.lungeT > 0)) { c.rx = U.damp(c.rx, c.x, 12, dt); c.rz = U.damp(c.rz, c.z, 12, dt); }
      c.rry += U.angDiff(c.rry, c.ry) * Math.min(1, dt * 10);
      const s = SIZES[c.sz].s;
      // mid-leap: (on clients) it flies along the way it faces, in an arc
      let leap = 0;
      if (c.lungeT > 0) {
        c.lungeT -= dt;
        if (!Net.isHost) {
          const nx = c.rx + Math.sin(c.ry) * c.lungeSpd * dt, nz = c.rz + Math.cos(c.ry) * c.lungeSpd * dt;
          if (w.walkable(nx, nz, 0.25 * s)) { c.rx = nx; c.rz = nz; }
        }
        const k = 1 - Math.max(0, c.lungeT) / c.lungeDur;
        leap = Math.sin(k * Math.PI) * 0.9 * s;
      }
      const moving = Math.hypot(c.rx - px, c.rz - pz) / Math.max(dt, 1e-4) > 0.3;
      const hop = c.m.body && moving && !c.m.hover && !leap ? Math.abs(Math.sin(c.t * 12 / Math.sqrt(s))) * 0.12 * s : 0;
      c.m.root.position.set(c.rx, w.gh(c.rx, c.rz) + hop + leap, c.rz);
      this.windup(c, s, dt);
      c.m.root.rotation.y = c.rry;
      c.m.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(c.t * 16 / Math.sqrt(s) + i * 2) * 0.6 : 0; });
      // fliers bob about, wings flap, rotors spin, wheels roll
      if (c.m.hover) c.m.body.position.y = Math.sin(c.t * 3) * 0.08;
      if (c.m.wings && c.st !== 2) c.m.wings.forEach((wg, i) => { wg.rotation.z = (i ? -1 : 1) * Math.sin(c.t * 16) * 0.7; });
      if (c.m.rotors && c.st !== 2) for (const r of c.m.rotors) r.rotation.y += dt * 40;
      if (c.m.rolls && moving) for (const r of c.m.rolls) r.rotation.x += dt * 14;
      if (c.zapFx && c.zapFx.visible) c.zapFx.rotation.y += dt * 9;
      c.flash = Math.max(0, c.flash - dt * 5);
      if (c.a === 1) c.m.body.scale.set(1.15, 0.72 + Math.sin(c.t * 40) * 0.04, 1.15); // (crouched, trembling)
      else if (c.a === 3) c.m.body.scale.set(0.88, 1.18 + Math.sin(c.t * 40) * 0.03, 0.88); // (reared up to throw)
      else if (c.lungeT > 0) c.m.body.scale.set(0.9, 1.05, 1.25);
      else c.m.body.scale.setScalar(1 + c.flash * 0.25);
      if (c.m.body.userData.spark) c.m.body.userData.spark.rotation.y += dt * 4;
      if ((c.st || 0) !== (c.shownSt || 0)) this.showStatus(c);
    }
  },
  // frozen critters sit in a block of ice; gooed ones have pink goo on them
  showStatus(c) {
    const st = c.st || 0, h = c.m.hit;
    c.shownSt = st;
    if (st === 2 && !c.ice) {
      c.ice = mk(BOX(h * 2.3, h * 2.1, h * 2.3), M('#bff6ff', { transparent: true, opacity: 0.5, depthWrite: false }), c.m.root, 0, h, 0);
      c.ice.castShadow = false;
    }
    if (st === 1 && !c.goo) {
      c.goo = grp(c.m.root, 0, h * 1.5, 0);
      for (const [x, z, r] of [[0.3, 0.1, 0.35], [-0.25, 0.2, 0.3], [0.05, -0.3, 0.28]]) mk(SPH(h * r, 6, 5), '#ff5fb8', c.goo, x * h, 0, z * h, { emissive: '#6a0a4a' });
    }
    if (st === 3 && !c.zapFx) {
      c.zapFx = grp(c.m.root, 0, h, 0);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; tf(mk(OCT(h * 0.14), '#bff6ff', c.zapFx, Math.cos(a) * h, (i % 2 ? 0.25 : -0.25) * h, Math.sin(a) * h, { emissive: '#3aa7ff' }), 0, 0, 0, 0.5, 2, 0.5); }
    }
    if (c.ice) c.ice.visible = st === 2;
    if (c.goo) c.goo.visible = st === 1;
    if (c.zapFx) c.zapFx.visible = st === 3;
  },
  // mean critters bite whoever they reach (each one has its own bite to catch its breath from, so a pack is
  // dangerous); each player checks their own ankles. A pounce that lands bites harder and knocks you back.
  bites(dt) {
    const p = G.player, w = G.worlds[G.planet];
    for (const c of this.list.values()) c.biteCd = (c.biteCd || 0) - dt;
    if (G.mode !== 'planet' || p.dead || G.panel || p.safeT > 0 || !w) return;
    for (const c of this.list.values()) {
      const def = this.kinds(G.planet)[c.k], sz = SIZES[c.sz];
      if (def.mood !== 'mean' || c.st === 2 || c.st === 3 || c.biteCd > 0) continue; // (frozen solid or stunned: no biting)
      const leaping = c.lungeT > 0, reach = (leaping ? 1.0 : 0.8) + (leaping ? 0.5 : 0.4) * sz.s;
      if (Math.hypot(p.pos.x - c.rx, p.pos.z - c.rz) < reach && p.pos.y < w.gh(c.rx, c.rz) + (leaping ? 2.4 : 1.6) * sz.s) {
        c.biteCd = leaping ? 1.4 : 1.1;
        this.bitBy.set(c.id, G.time);
        const hp = p.hp;
        p.hurtPlanet(def.dmg * sz.dmg * (c.g ? 1.5 : 1) * (leaping ? POUNCE.dmg : 1), c.rx, c.rz, (sz.name ? sz.name + ' ' : '') + def.name);
        if (leaping && p.hp < hp) { // (knocked flying)
          const dx = p.pos.x - c.rx, dz = p.pos.z - c.rz, l = Math.hypot(dx, dz) || 1;
          p.vel.x += (dx / l) * 5; p.vel.z += (dz / l) * 5; p.vel.y = Math.max(p.vel.y, 5);
          UI.toast(`${def.name} POUNCED on you!`, 'bad', 1.4);
        }
        return;
      }
    }
  },
  // the red mark while one's crouched to pounce: a ring under it and the path of the leap
  windup(c, s, dt) {
    const on = c.a === 1;
    if (!on && !c.tele) return;
    if (!c.tele) {
      if (!POUNCE_MARK.mat) {
        POUNCE_MARK.mat = new THREE.MeshBasicMaterial({ color: '#ff3b3b', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
        POUNCE_MARK.ring = new THREE.RingGeometry(0.75, 1.05, 24); POUNCE_MARK.ring.rotateX(-Math.PI / 2);
        POUNCE_MARK.lane = new THREE.PlaneGeometry(1, 1); POUNCE_MARK.lane.rotateX(-Math.PI / 2); POUNCE_MARK.lane.translate(0, 0, 0.5);
        for (const o of [POUNCE_MARK.mat, POUNCE_MARK.ring, POUNCE_MARK.lane]) o.userData.shared = true;
      }
      const def = this.kinds(G.planet)[c.k], P = def.charge ? CHARGE : POUNCE;
      c.tele = new THREE.Group();
      const ring = new THREE.Mesh(POUNCE_MARK.ring, POUNCE_MARK.mat), lane = new THREE.Mesh(POUNCE_MARK.lane, POUNCE_MARK.mat);
      ring.position.y = lane.position.y = 0.06;
      lane.scale.set(0.55, 1, (P.speed * P.time + 0.8) / s); // (as long as the leap, whatever size it is)
      c.tele.add(ring, lane);
      c.tele.userData.lane = lane;
      c.m.root.add(c.tele);
    }
    c.tele.visible = on;
    if (on) {
      c.windT = (c.windT || 0) + dt;
      c.tele.children[0].scale.setScalar(1 + Math.sin(c.windT * 18) * 0.08);
      POUNCE_MARK.mat.opacity = 0.45 + 0.25 * Math.abs(Math.sin(G.time * 10));
    } else c.windT = 0;
  },
  // Feral E-Scooters beep when they're about to charge
  beep(c) {
    if (G.mode === 'planet' && Math.hypot(G.player.pos.x - c.rx, G.player.pos.z - c.rz) < 25) Sound.play('warn');
  },

  /* ---------- things they throw and spit ---------- */
  // host: throw at q, aiming where they're heading (toss: a biter's occasional throw). Keep going the same
  // way and it gets you; change direction (or stop) and it misses.
  spit(c, def, sz, q, toss) {
    const w = G.worlds[G.planet], sp = toss ? def.toss : def.spit;
    const from = new V3(c.x, w.gh(c.x, c.z) + (c.m.hit * 1.3 + 0.3) * sz.s, c.z);
    const speed = SPIT.speed * (sp.fast ? 1.6 : 1), lead = sp.lead != null ? sp.lead : SPIT.lead, v = q.v || { x: 0, z: 0 };
    const n = sp.n || 1, l = [];
    // (how long it takes to get to where they'll be, not to where they are: further away takes longer)
    let T = Math.hypot(q.p.x - from.x, q.p.z - from.z) / speed;
    T = Math.hypot(q.p.x + v.x * T - from.x, q.p.z + v.z * T - from.z) / speed;
    for (let i = 0; i < n; i++) {
      const dl = (sp.gap || 0) * i, ahead = (T + dl) * lead;
      let x = q.p.x + v.x * ahead, z = q.p.z + v.z * ahead;
      if (sp.fan && n > 1) { // (spread out, around where it's aiming)
        const a = (i / (n - 1) - 0.5) * sp.fan, dx = x - from.x, dz = z - from.z, cs = Math.cos(a), sn = Math.sin(a);
        x = from.x + dx * cs + dz * sn; z = from.z - dx * sn + dz * cs;
      }
      l.push([U.r2(x), U.r2(w.gh(x, z) + 0.3), U.r2(z), U.r2(dl)]);
    }
    const m = { t: 'cspit', p: G.planet, k: c.k, sz: c.sz, g: c.g, ts: toss ? 1 : 0, f: [U.r2(from.x), U.r2(from.y), U.r2(from.z)], l };
    if (Net.online) Net.toAll(m);
    this.onSpit(m);
  },
  onSpit(m) {
    const def = m.p === G.planet && this.kinds(m.p)[m.k], sp = def && (m.ts ? def.toss : def.spit);
    if (!sp || !G.worlds[m.p] || !Array.isArray(m.l)) return;
    const from = new V3(...m.f), base = def.dmg * SIZES[m.sz].dmg * (m.g ? 1.5 : 1);
    for (const [x, y, z, dl] of m.l) {
      const to = new V3(x, y, z), d = from.distanceTo(to), fast = !!sp.fast;
      this.spits.push({ from, to, t: -(dl || 0), T: Math.max(0.2, d / (SPIT.speed * (fast ? 1.6 : 1))), arc: fast ? 0.3 : 0.2 * d, mesh: null, sp, trail: 0,
        dmg: base * SPIT.dmg, base, name: def.name });
    }
  },
  spitMesh(sp) {
    let mesh;
    if (sp.what === 'can') mesh = tf(mk(CYL(0.14, 0.14, 0.34, 8), '#b8c0c8'), Math.PI / 2, 0, 0);
    else if (sp.what === 'coin') mesh = tf(mk(CYL(0.2, 0.2, 0.05, 12), '#ffd23f', null, 0, 0, 0, { emissive: '#8a6a00' }), Math.PI / 2, 0, 0);
    else if (['dice', 'bone', 'fries', 'trash', 'lava', 'icicle'].includes(sp.what)) return projMesh(sp.what, sp.what === 'icicle' ? 0.2 : 0.26);
    else mesh = new THREE.Mesh(new THREE.SphereGeometry(sp.what === 'snow' ? 0.26 : 0.22, 10, 8), new THREE.MeshBasicMaterial({ color: sp.c }));
    mesh.castShadow = false;
    return mesh;
  },
  updateSpits(dt) {
    const p = G.player, w = G.worlds[G.planet];
    for (let i = this.spits.length - 1; i >= 0; i--) {
      const s = this.spits[i];
      s.t += dt;
      if (s.t < 0) continue; // (the next one in a burst)
      if (!s.mesh) {
        s.mesh = this.spitMesh(s.sp);
        s.mesh.position.copy(s.from);
        if (w) w.dyn.add(s.mesh);
        if (G.mode === 'planet' && p.pos.distanceTo(s.from) < 26) Sound.play('spit');
      }
      const k = Math.min(1, s.t / s.T);
      s.mesh.position.lerpVectors(s.from, s.to, k);
      s.mesh.position.y += 4 * s.arc * k * (1 - k);
      s.mesh.rotation.y += dt * 9;
      if (s.sp.what === 'bone' || s.sp.what === 'dice') s.mesh.rotation.x += dt * 11;
      s.trail -= dt;
      if (s.trail <= 0) { s.trail = 0.05; FX.burst(s.mesh.position, s.sp.c, 1, 0.5); }
      let done = k >= 1;
      // did it get me? (only you can tell: it's your head)
      if (!done && G.mode === 'planet' && !p.dead && p.safeT <= 0 && !G.panel) {
        const c = p.pos.clone(); c.y += 0.9;
        if (c.distanceTo(s.mesh.position) < 0.85) {
          done = true;
          p.hurtPlanet(s.dmg, s.from.x, s.from.z, s.name);
          if (s.sp.slow) { p.slowT = Math.max(p.slowT || 0, s.sp.slow); UI.toast(s.sp.what === 'goo' ? 'Gooed! You\'re slowed down.' : 'Snowballed! You\'re slowed down.', 'bad', 1.2); }
        }
      }
      if (done) {
        FX.burst(s.mesh.position, s.sp.c, 10, 4);
        if (s.sp.what === 'goo' || s.sp.what === 'ecto' || s.sp.what === 'lava') Sound.play('splat');
        // (some leave a puddle where they come down: the same spot for everyone)
        const pl = s.sp.pool;
        if (pl) Hazards.add({ k: 'zone', c: [U.r2(s.to.x), U.r2(s.to.z)], r: pl.r, w: 0, dur: pl.dur, d: Math.round(s.base * pl.d * 10) / 10, kind: pl.kind, sl: pl.kind === 'goo' ? 1 : 0, tk: 0.7 }, s.name);
        if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
        disposeObj(s.mesh);
        this.spits.splice(i, 1);
      }
    }
  },

  /* ---------- zapping them ---------- */
  // the middle of a critter (what shots aim at). Fliers sit higher up.
  center(c, w) {
    const s = SIZES[c.sz].s;
    return new V3(c.rx, w.gh(c.rx, c.rz) + (c.m.hy != null ? c.m.hy * s : c.m.hit * s * 0.8), c.rz);
  },
  // its head (where its eyes are, see buildCritterParts), in the world: { p, r }
  headAt(c) { return critterHead(c.m, c.m.root.position, c.rry, SIZES[c.sz].s); },
  // the first critter a shot from p0 to p1 passes through (skip: ones this shot already hit, keyed 'c' + id).
  // head: it went in through the head
  hitTest(p0, p1, skip) {
    const w = G.worlds[G.planet];
    for (const c of this.list.values()) {
      if (skip && skip.has('c' + c.id)) continue;
      const r = c.m.hit * SIZES[c.sz].s, ctr = this.center(c, w), hd = this.headAt(c);
      const k = U.bodyOrHead(p0, p1, ctr, r + 0.15, hd.p, hd.r);
      if (k >= 0) return { c, ctr, head: k === 1 };
    }
    return null;
  },
  // flags: what the shooter was doing when they fired (see LocalPlayer.fireZap)
  // fx: 'goo' slows it down, 'ice' freezes it · quiet: no damage number or sound (the Cryo Beam ticks fast)
  // head: a headshot (the damage is already doubled, see Shots.land)
  hit(c, dmg, pos, flags, fx, quiet, head) {
    c.flash = 1;
    // shooting a mean one while critters are still leaving you alone: you started it
    if (G.player.safeT > 0 && this.kinds(G.planet)[c.k].mood === 'mean') { G.player.safeT = 0; UI.toast('You started it! Mean critters can bite you now.', 'bad', 2.4); }
    // remember HOW I hit it; if this hit turns out to be the kill, the style bonus comes from here
    const full = c.myHits === 0 && (Net.isHost ? c.hp >= c.max : c.pct >= 100);
    c.myHits++;
    c.style = Object.assign({}, flags || {}, { first: full && c.myHits === 1, head: !!head });
    FX.burst(pos, fx === 'ice' ? '#bff6ff' : c.g ? '#ffd23f' : '#ffffff', quiet ? 2 : 4, 3);
    if (!quiet) hitFeedback(pos, dmg, head, 36);
    if (Net.isHost) this.damage(c.id, dmg, Net.myId, fx);
    else Net.toHost({ t: 'hitc', id: c.id, dmg, fx });
  },
  // host
  damage(id, dmg, by, fx) {
    const c = this.list.get(id);
    if (!c) return;
    c.hp -= dmg;
    if (c.hp > 0) {
      // getting shot makes shy critters bolt, and mean ones come for you (bringing their friends)
      c.wt = 0;
      if (this.kinds(G.planet)[c.k].mood === 'mean' && by) {
        for (const o of this.list.values()) {
          if (o !== c && (this.kinds(G.planet)[o.k].mood !== 'mean' || o.angryT > 0 || Math.hypot(o.x - c.x, o.z - c.z) > HUNT.pack)) continue;
          o.angryT = HUNT.angry;
          if (!o.foe) this.alert(o);
          o.foe = by;
        }
      }
      if (fx === 'goo') c.slowT = 3;
      else if (fx === 'ice') c.frozeT = 1.2;
      else if (fx === 'shock') c.shockT = 0.8;
      return;
    }
    const m = Object.assign({ t: 'cdie', id, by }, this.fling(c, by));
    Net.toAll(m);
    this.onDie(m);
    MiniBoss.onKill(c.x, c.z); // (enough of these, and something big turns up)
  },
  onDie(m) {
    const c = this.list.get(m.id);
    if (!c) return;
    const def = this.kinds(G.planet)[c.k];
    const w = G.worlds[G.planet];
    const pos = c.m.hover ? this.center(c, w) : new V3(c.rx, w.gh(c.rx, c.rz) + 0.4 * SIZES[c.sz].s, c.rz);
    FX.burst(pos, c.g ? '#ffd23f' : '#ff9a3d', Math.round(10 * SIZES[c.sz].s), 5);
    FX.ring(pos, '#ffffff', 1.6 * SIZES[c.sz].s);
    Sound.play('splat');
    this.list.delete(m.id);
    const b = this.makeBody(c, m);
    if (m.by === Net.myId) this.loot(def, c, pos, b);
  },
  // host: which way a zapped critter goes flying (away from whoever zapped it), how it spins, and how it ends
  // up lying (so everybody sees the same tumble)
  fling(c, by) {
    const q = by === Net.myId ? G.player.pos : G.remotes.get(by) ? G.remotes.get(by).tpos : null;
    let dx = q ? c.x - q.x : Math.random() - 0.5, dz = q ? c.z - q.z : Math.random() - 0.5;
    const l = Math.hypot(dx, dz) || 1, s = Math.sqrt(SIZES[c.sz].s), sp = U.rand(3.2, 5.2) / s, spin = U.rand(8, 13) / s;
    dx /= l; dz /= l;
    // tumbling end over end, away from you (plus a bit of a twist)
    return { v: [U.r2(dx * sp), U.r2(U.rand(5.5, 7.5) / Math.sqrt(s)), U.r2(dz * sp)], w: [U.r2(dz * spin + U.rand(-2, 2)), U.r2(U.rand(-3, 3)), U.r2(-dx * spin + U.rand(-2, 2))], f: Math.random() < 0.6 ? 0 : Math.random() < 0.5 ? 1 : 2 };
  },

  /* ---------- zapped critters, lying about ---------- */
  bodies: new Map(), // id -> body (every planet's: they stay in their own world, see PlanetWorld.dyn)
  // the critter c just got zapped: it goes flying (m: the host's fling), bounces and settles, and lies there.
  // opt (a mini boss going down): s its size, pop: seconds it lies there before it goes pop (nobody picks it up)
  makeBody(c, m, saved, opt = {}) {
    const w = G.worlds[saved ? saved.p : G.planet];
    if (!w) return null;
    const s = opt.s || (SIZES[c.sz] ? SIZES[c.sz].s : 1), root = c.m.root;
    for (const k of ['tele', 'ice', 'goo', 'zapFx']) if (c[k]) { root.remove(c[k]); if (k !== 'tele') disposeObj(c[k]); c[k] = null; }
    c.m.body.scale.setScalar(1);
    if (c.m.hover) c.m.body.position.y = 0;
    // the body spins round its middle: a holder there, with the critter hanging off it
    const hc = c.m.hy != null ? c.m.hy : c.m.hit * 0.8;
    const holder = new THREE.Group();
    root.position.set(0, -hc * s, 0); root.rotation.set(0, 0, 0);
    holder.add(root);
    w.dyn.add(holder);
    const b = {
      id: m ? m.id : c.id, key: saved ? saved.key : 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      p: saved ? saved.p : G.planet, k: c.k, sz: c.sz, g: c.g, m: c.m, holder, mesh: holder, kind: 'body', s,
      pos: new V3(c.rx, w.gh(c.rx, c.rz) + hc * s, c.rz), vel: new V3(), q: new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), c.rry || 0), w: new V3(),
      t: 0, rest: false, settle: 0, bounces: 0, flip: 0, mine: false, entry: null, born: G.time, twitch: U.rand(1, 3), stars: null, pop: opt.pop, color: opt.color,
      legs: c.m.legs.map((l) => ({ l, x: l.rotation.x, vx: 0, z: 0, vz: 0, tx: U.rand(-1.1, 1.1), tz: U.rand(-0.5, 0.5) })),
      wings: (c.m.wings || []).map((l, i) => ({ l, z: l.rotation.z, vz: 0, tz: (i ? -1 : 1) * 1.1 })),
    };
    b.hull = this.hull(b, hc);
    if (saved) { // (lying where you left it)
      b.pos.set(saved.x, saved.y, saved.z); b.q.set(saved.q[0], saved.q[1], saved.q[2], saved.q[3]);
      b.rest = true; b.mine = true; b.entry = saved.e; b.stars = null;
      this.priceTag(b, w);
    } else {
      const f = m && Array.isArray(m.v) ? m : this.fling(c, m && m.by);
      b.vel.set(f.v[0], f.v[1], f.v[2]); b.w.set(f.w[0], f.w[1], f.w[2]); b.flip = f.f || 0;
      b.pos.y += 0.25;
    }
    b.x = b.pos.x; b.y = b.pos.y; b.z = b.pos.z;
    holder.position.copy(b.pos); holder.quaternion.copy(b.q);
    this.bodies.set(b.key, b);
    return b;
  },
  // yours: what it'll sell for, floating over it until you bag it (see updateBodies)
  priceTag(b, w = G.worlds[b.p]) {
    if (b.tag || !b.entry || !w) return;
    const r = cargoRes(b.entry);
    b.tag = textSprite(U.bucks(r.v), { size: 40, color: '#ffe38a', stroke: 'rgba(0,0,0,.55)', scale: 0.005 });
    w.dyn.add(b.tag);
    this.placeTag(b);
  },
  // (low-key: see-through, and it fades out as you walk away)
  placeTag(b) {
    if (!b.tag) return;
    b.tag.position.set(b.pos.x, b.pos.y + 0.5 * b.s + 0.5, b.pos.z);
    const d = G.camera.position.distanceTo(b.tag.position);
    b.tag.material.opacity = 0.7 * U.clamp((26 - d) / 10, 0, 1);
  },
  // a handful of its outermost points (from its real shape): what touches the ground as it tumbles
  hull(b, hc) {
    const root = b.m.root, pts = [], dirs = [];
    for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) if (x || y || z) dirs.push(new V3(x, y, z).normalize());
    const best = dirs.map(() => -Infinity), inv = new THREE.Matrix4(), mm = new THREE.Matrix4(), v = new V3();
    root.updateWorldMatrix(true, true);
    inv.copy(root.matrixWorld).invert();
    root.traverse((o) => {
      if (!o.isMesh || !o.visible || !o.geometry || !o.geometry.attributes.position) return; // (not a hidden glow ring)
      mm.multiplyMatrices(inv, o.matrixWorld);
      const pa = o.geometry.attributes.position, step = Math.max(1, Math.floor(pa.count / 400));
      for (let i = 0; i < pa.count; i += step) {
        v.fromBufferAttribute(pa, i).applyMatrix4(mm);
        dirs.forEach((d, k) => { const dd = v.dot(d); if (dd > best[k]) { best[k] = dd; pts[k] = v.clone(); } });
      }
    });
    // (in the holder's space: the critter hangs off it, scaled)
    return pts.filter(Boolean).map((p) => p.multiplyScalar(b.s).add(new V3(0, -hc * b.s, 0)));
  },
  // how far its lowest point is above whatever's under it (and the lowest point, in pt)
  lowest(b, w, pt) {
    let low = Infinity;
    for (const h of b.hull) {
      _bv.copy(h).applyQuaternion(b.q).add(b.pos);
      const d = _bv.y - Math.max(w.ground(_bv.x, _bv.z, _bv.y + 0.6), WATER_Y);
      if (d < low) { low = d; if (pt) pt.copy(_bv); }
    }
    return low;
  },
  updateBodies(dt) {
    for (const b of [...this.bodies.values()]) {
      const w = G.worlds[b.p];
      if (!w || b.taken) continue;
      b.t += dt;
      // somebody else's catch: it goes away after a while (sinking into the ground)
      if (!b.mine && b.pop == null && G.time - b.born > BODY.keep) {
        b.holder.position.y -= dt * 0.6;
        if (G.time - b.born > BODY.keep + 3) this.dropBody(b.key);
        continue;
      }
      if (b.p !== G.planet || b.grab) { if (b.tag) b.tag.visible = false; continue; } // (another planet's, or in the Grabby Vac)
      // (lying still a long way off: not drawn, like pickups, see NODE_VIEW)
      if (b.rest && G.player) { const far = (b.pos.x - G.player.pos.x) ** 2 + (b.pos.z - G.player.pos.z) ** 2 > NODE_VIEW * NODE_VIEW; b.holder.visible = !far; if (b.tag) b.tag.visible = !far; if (far) continue; }
      if (!b.rest) this.tumble(b, w, dt);
      this.flop(b, dt);
      this.placeTag(b);
      if (b.pop != null && b.rest && (b.popT = (b.popT || 0) + dt) > b.pop) this.popBody(b);
    }
  },
  // flying, bouncing, sliding, and finally lying there
  tumble(b, w, dt) {
    b.vel.y -= BODY.grav * dt;
    const nx = b.pos.x + b.vel.x * dt, nz = b.pos.z + b.vel.z * dt;
    // (it doesn't fly off the island, or into a wall: it bounces back)
    if (w.h(nx, nz) < 0.4 || (w.blocked && w.blocked(nx, nz, b.pos.y) && !w.cfg.islands) || w.solidAt(_bv2.set(nx, b.pos.y, nz))) { b.vel.x *= -0.4; b.vel.z *= -0.4; }
    else { b.pos.x = nx; b.pos.z = nz; }
    b.pos.y += b.vel.y * dt;
    const a = b.w.length();
    if (a > 1e-4) { _bq.setFromAxisAngle(_bv2.copy(b.w).divideScalar(a), a * dt); b.q.premultiply(_bq).normalize(); }
    const low = this.lowest(b, w);
    const touching = low < 0.04;
    if (low < 0) {
      b.pos.y -= low;
      if (b.vel.y < 0) {
        const hit = -b.vel.y;
        if (hit > 2.2 && b.bounces < 4) { // a bounce: a bit less every time, and it gets knocked into a new spin
          b.bounces++;
          b.vel.y = hit * BODY.bounce;
          b.w.set(b.w.x * 0.55 + U.rand(-3, 3), b.w.y * 0.5 + U.rand(-2, 2), b.w.z * 0.55 + U.rand(-3, 3));
          for (const l of b.legs) { l.vx += U.rand(-14, 14); l.vz += U.rand(-8, 8); }
          b.squash = 0.3;
          if (b.p === G.planet && G.player.pos.distanceTo(b.pos) < 30) { Sound.play(b.bounces === 1 ? 'thud' : 'boing'); FX.burst(b.pos.clone().setY(b.pos.y - 0.2), '#e8e0d0', 4, 2); }
        } else b.vel.y = 0;
      }
    }
    if (touching) { // sliding along the ground: friction, and the spin dies down
      const k = Math.exp(-BODY.fric * dt);
      b.vel.x *= k; b.vel.z *= k; b.w.multiplyScalar(Math.exp(-3 * dt));
    }
    // (in the goo, the lava, the sea: it floats there, bobbing)
    b.squash = Math.max(0, (b.squash || 0) - dt * 2.5);
    const sq = 1 - Math.sin(b.squash / 0.3 * Math.PI) * 0.18;
    b.m.root.scale.set(b.s * (2 - sq), b.s * sq, b.s * (2 - sq));
    // nearly stopped: roll over onto its back (or its side) and lie still
    if (touching && Math.abs(b.vel.y) < 0.5 && Math.hypot(b.vel.x, b.vel.z) < 0.8 && b.t > 0.35) b.settle += dt;
    if (b.settle > 0) this.settle(b, w, dt);
    b.holder.position.copy(b.pos); b.holder.quaternion.copy(b.q);
  },
  settle(b, w, dt) {
    if (!b.restQ) {
      // keep the way it's facing, then lie it down: on its back, legs in the air (or on a side)
      _bv.set(0, 0, 1).applyQuaternion(b.q); _bv.y = 0;
      const yaw = _bv.lengthSq() > 1e-4 ? Math.atan2(_bv.x, _bv.z) : 0;
      b.restQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, [Math.PI, Math.PI / 2, -Math.PI / 2][b.flip] || Math.PI, 'YXZ'));
      b.fromQ = b.q.clone();
    }
    const k = Math.min(1, b.settle / 0.45), e = k * k * (3 - 2 * k);
    b.q.copy(b.fromQ).slerp(b.restQ, e);
    b.w.set(0, 0, 0); b.vel.x *= 0.8; b.vel.z *= 0.8; b.vel.y = 0;
    b.pos.y -= this.lowest(b, w) - 0.02; // (its lowest point just on the ground)
    if (k < 1) return;
    b.rest = true;
    b.x = b.pos.x; b.y = b.pos.y; b.z = b.pos.z;
    b.m.root.scale.setScalar(b.s);
    // knocked out cold: little stars going round over it for a bit
    const st = new THREE.Group();
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; mk(OCT(0.07), '#fff36b', st, Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32, { emissive: '#aa8800' }); }
    st.position.set(b.pos.x, b.pos.y + 0.45 * b.s + 0.35, b.pos.z);
    w.dyn.add(st);
    b.stars = st; b.starT = 5;
    if (b.mine) this.saveBodies();
  },
  // legs (and wings) flop about on springs; lying there, now and then one twitches
  flop(b, dt) {
    const K = 60, D = 7;
    for (const l of b.legs) {
      if (b.rest) { b.twitch -= dt; if (b.twitch <= 0 && b.t < 40) { b.twitch = U.rand(1.2, 3.5); l.vx += U.rand(-10, 10); } }
      l.vx += (K * (l.tx - l.x) - D * l.vx) * dt; l.x += l.vx * dt;
      l.vz += (K * (l.tz - l.z) - D * l.vz) * dt; l.z += l.vz * dt;
      l.l.rotation.set(l.x, 0, l.z);
    }
    for (const wg of b.wings) { wg.vz += (K * (wg.tz - wg.z) - D * wg.vz) * dt; wg.z += wg.vz * dt; wg.l.rotation.z = wg.z; }
    if (b.stars) {
      b.starT -= dt;
      b.stars.rotation.y += dt * 4;
      b.stars.scale.setScalar(U.clamp(b.starT, 0, 1));
      if (b.starT <= 0) { if (b.stars.parent) b.stars.parent.remove(b.stars); disposeObj(b.stars); b.stars = null; }
    }
  },
  // (a mini boss, after lying there a moment) POP: confetti and coins, and it's gone
  popBody(b) {
    const c = b.pos.clone().setY(b.pos.y + 0.3 * b.s);
    for (const col of ['#ff4b6e', '#ffd23f', '#3aa7ff', '#46d98a', '#b77dff', b.color || '#ffffff']) FX.burst(c, col, 10, 8);
    FX.burst(c, '#ffd23f', 14, 6);
    FX.ring(c, b.color || '#ffffff', 5);
    if (G.mode === 'planet' && G.player.pos.distanceTo(c) < 40) { Sound.play('party'); Sound.play('boom'); }
    if (b.onPop) b.onPop(c.clone()); // (a mini boss: its prizes burst out, see MiniBoss.dropLoot)
    this.dropBody(b.key);
  },
  dropBody(key) {
    const b = this.bodies.get(key);
    if (!b) return;
    for (const o of [b.holder, b.stars, b.tag]) if (o) { if (o.parent) o.parent.remove(o); disposeObj(o); }
    this.bodies.delete(key);
    if (b.mine) this.saveBodies();
  },
  // yours, lying still, close enough to pick up and more or less in front of you: the nearest one (or null)
  nearBody(from, dir, reach = BODY.reach) {
    let best = null, bd = Infinity;
    for (const b of this.bodies.values()) {
      if (!b.mine || !b.rest || b.taken || b.p !== G.planet) continue;
      const dx = b.pos.x - from.x, dz = b.pos.z - from.z, d = Math.hypot(dx, dz);
      if ((d > reach + 0.3 * b.s && this.edgeDist(b, from) > reach) || Math.abs(b.pos.y - from.y) > 2.4 + 0.5 * b.s) continue; // (a big one: from its edge, and its middle is up high)
      const dot = d > 0.6 ? (dx * dir.x + dz * dir.z) / (d * Math.hypot(dir.x, dir.z) + 1e-6) : 1;
      if (dot < 0.25) continue;
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  },
  // how far you are (sideways) from the nearest bit of it (see hull)
  edgeDist(b, from) {
    let best = Math.hypot(b.pos.x - from.x, b.pos.z - from.z);
    for (const h of b.hull) { _bv.copy(h).applyQuaternion(b.q).add(b.pos); best = Math.min(best, Math.hypot(_bv.x - from.x, _bv.z - from.z)); }
    return best;
  },
  // for the Grabby Vac: one of yours along where you're pointing it
  findBody(cp, dir, range, minDot) {
    let best = null, bs = Infinity;
    for (const b of this.bodies.values()) {
      if (!b.mine || !b.rest || b.taken || b.p !== G.planet) continue;
      const dx = b.x - cp.x, dy = b.y - cp.y, dz = b.z - cp.z, d = Math.hypot(dx, dy, dz);
      if (d > range + 1.5 + 0.5 * b.s) continue;
      const dot = (dx * dir.x + dy * dir.y + dz * dir.z) / d;
      if (dot < minDot) continue;
      const sc = d * (2 - dot);
      if (sc < bs) { bs = sc; best = b; }
    }
    return best;
  },
  bodyName(b) { const r = cargoRes(b.entry || ''); return r.name; },
  // bag it (E, or the Grabby Vac got it). Backpack full: you carry it in a free hotbar slot (see Loadout),
  // and if that's full too it stays right where it is
  pickBody(b) {
    if (!b || !b.mine || b.taken) return false;
    let slot = -1;
    if (SAVE.cargo.length >= CARGO[SAVE.cargoLvl]) {
      slot = Loadout.holdCrit(b.entry);
      if (slot < 0) { UI.toast('Backpack and hotbar full! Sell stuff and come back for it: it\'ll wait right here.', 'bad', 2.4); Sound.play('error'); return false; }
    } else SAVE.cargo.push(b.entry);
    b.taken = true;
    SAVE.stats.collected++;
    const rare = Activities.showLoot([b.entry]);
    const at = b.pos.clone().setY(b.pos.y + 0.4);
    FX.text(at.clone().setY(at.y + 0.8), b.g ? 'GOLDEN!' : 'BAGGED!', b.g ? '#ffd23f' : '#7dff8a', 46);
    FX.burst(at, b.g ? '#ffd23f' : '#7dff8a', 8, 3);
    Sound.play(rare ? 'rare' : 'pickup');
    if (Net.online) Net.relay({ t: 'cpick', id: b.id, p: b.p });
    this.dropBody(b.key);
    if (slot >= 0) { G.player.refreshGear(); UI.toast(`Backpack full: you're carrying it in hotbar slot ${slot + 1}. Sell it at any shop.`, '', 2.8); }
    else if (SAVE.cargo.length >= CARGO[SAVE.cargoLvl]) UI.toast('Backpack full! Sell stuff at the shop.', 'bad', 2.2);
    persist();
    UI.hud();
    return true;
  },
  // a friend picked up one of theirs
  onPick(m) { for (const b of this.bodies.values()) if (b.id === m.id && b.p === m.p && !b.mine) { this.dropBody(b.key); break; } },
  // yours lying about are in your save, so they wait for you (see restoreBodies)
  saveBodies() {
    const mine = [...this.bodies.values()].filter((b) => b.mine && b.rest && !b.taken);
    // (a lot of them left lying around: the oldest one gets dragged off by its friends)
    while (mine.length > BODY.max) { const o = mine.shift(); this.bodies.delete(o.key); for (const x of [o.holder, o.stars]) if (x) { if (x.parent) x.parent.remove(x); disposeObj(x); } }
    SAVE.bodies = mine.map((b) => ({ key: b.key, p: b.p, k: b.k, sz: b.sz, g: b.g, x: U.r2(b.x), y: U.r2(b.y), z: U.r2(b.z), q: [b.q.x, b.q.y, b.q.z, b.q.w].map((v) => Math.round(v * 1000) / 1000), e: b.entry }));
    persist();
  },
  // after landing (or coming back to the game): yours on this planet are lying where you left them
  restoreBodies() {
    const kinds = this.kinds(G.planet);
    for (const d of SAVE.bodies || []) {
      if (d.p !== G.planet || this.bodies.has(d.key) || !kinds[d.k]) continue;
      const m = buildCritter(kinds[d.k].id, !!d.g);
      m.root.scale.setScalar(SIZES[d.sz] ? SIZES[d.sz].s : 1);
      this.makeBody({ id: 0, k: d.k, sz: d.sz, g: d.g, m, rx: d.x, rz: d.z, rry: 0 }, null, d);
    }
  },

  // which style bonuses this kill earned (each is at most 2x; they stack up to STYLE_MAX)
  styleOf(c) {
    const f = c.style || {}, out = [];
    if (f.air) out.push('air');
    if (f.spin) out.push('spin');
    if (f.last) out.push('last');
    if (f.dist >= 25) out.push('long');
    else if (f.dist != null && f.dist <= 2.6) out.push('close');
    if (f.first && c.myHits === 1) out.push('one');
    if (f.run) out.push('run');
    if (f.head) out.push('head');
    if (f.low) out.push('clutch');
    const bit = this.bitBy.get(c.id);
    if (bit != null && G.time - bit < 8) out.push('revenge');
    // chains of kills, each within 3 seconds of the last
    this.kills = this.kills.filter((t) => G.time - t < 3);
    if (this.kills.length >= 2) out.push('multi3');
    else if (this.kills.length === 1) out.push('multi2');
    this.kills.push(G.time);
    return out;
  },
  // the one who zapped it gets the body. Yes, you sell the body. (It lies there until you pick it up, see pickBody)
  loot(def, c, pos, b) {
    const styles = this.styleOf(c);
    this.bitBy.delete(c.id);
    let mult = 1;
    for (const s of styles) mult *= STYLE[s].m;
    const maxed = mult > STYLE_MAX;
    mult = Math.min(STYLE_MAX, Math.round(mult * 100) / 100);
    const key = critKey(def.id, c.sz, !!c.g), entry = mult > 1 ? `${key}*${mult}` : key, worth = cargoRes(entry).v, z = SIZES[c.sz];
    // what you got: KILLED Rust Crab $22, and under it what made it worth that (its size, golden, each style bonus)
    const lines = [];
    if (z.v > 1) lines.push([z.v, z.name, 'size']);
    if (c.g) lines.push([8, 'Golden', 'gold']);
    for (const st of styles) lines.push([STYLE[st].m, STYLE[st].name, '']);
    if (maxed) lines.push([STYLE_MAX, 'style bonus capped at', 'max']);
    UI.killed(def.name, worth, lines);
    FX.text(pos.clone().setY(pos.y + 1.5), U.bucks(worth), '#ffd23f', 44);
    if (styles.length) {
      Sound.play(mult >= 3 ? 'jackpot' : 'win');
      SAVE.stats.style = (SAVE.stats.style || 0) + 1;
    } else Sound.play(c.g || z.v >= 4 ? 'rare' : 'coin');
    SAVE.stats.critters = (SAVE.stats.critters || 0) + 1;
    if (b) { b.mine = true; b.entry = entry; this.priceTag(b); }
    if (!this.pickTip) { this.pickTip = true; UI.toast('Walk over to it and press {use} to bag it (or vacuum it up)!', '', 3); }
    else if (SAVE.cargo.length >= CARGO[SAVE.cargoLvl] && G.time - (this.fullTipT || -99) > 20) { this.fullTipT = G.time; UI.toast('Backpack full: it\'ll wait right there until you\'ve sold some stuff.', 'bad', 2.6); }
    persist();
  },
};
