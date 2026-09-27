'use strict';
/* =========================================================
   Space critters: little creatures roaming every planet.
   Shy ones run away. Mean ones hunt you: they spot you from
   a way off (a red "!" and a growl), chase you down, crouch
   and POUNCE (a red mark on the ground shows where), and the
   rarer mean kind on each planet throws or spits things at
   you from a distance. Shoot one and it comes for you, and
   its friends nearby join in. Zap them, sell them. Every
   one rolls a size (bigger = rarer, tougher, worth more).
   Kill them in style for a bonus multiplier.
   The host runs their brains and tells everyone where they
   are; each player checks bites and hits on themselves.
   ========================================================= */
const CRIT_MAX = 22;       // alive at once on a planet (they're big planets)
const CRIT_SEND = 1 / 8;   // host sync rate
const GOLD_CHANCE = 0.03;
// mean critters hunting: how far they see you, how far from home they'll go, when they give up, how much faster
// they run when chasing, how long being shot makes them mad, and how far away their friends hear about it
const HUNT = { sight: 17, leash: 45, giveUp: 30, chase: 1.3, angry: 10, pack: 14 };
// the pounce: from how far, how long the crouch lasts (the warning), the leap, and how hard it hits
// (it leaps a bit further than the range it starts from: stand still and it lands on you, move and it misses)
const POUNCE = { range: 4, windup: 0.55, time: 0.36, speed: 12, cd: [2.2, 3.4], rest: 0.5, dmg: 1.4 };
const CHARGE = { range: 9.5, windup: 0.8, time: 0.6, speed: 17 }; // (Feral E-Scooters: a long, fast charge)
// throwing and spitting: from how far, how fast it flies, how often, the distance they like to keep, damage
const SPIT = { min: 3.2, max: 13, speed: 12, cd: [2.6, 3.6], keep: [6.5, 10], dmg: 0.8 };

const POUNCE_MARK = {}; // (the pounce warning's shared shapes, made the first time one's needed)

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
    if (G.mode === 'planet' && !G.player.dead) out.push({ id: Net.myId, p: G.player.pos, safe: G.player.safeT > 0 });
    for (const r of G.remotes.values()) if (r.s.m === 'planet' && r.s.p === G.planet && !r.s.d) out.push({ id: r.id, p: r.tpos, safe: !!r.s.sf });
    return out;
  },

  /* ---------- host: spawning and brains ---------- */
  host(dt) {
    const w = G.worlds[G.planet];
    if (!w) return;
    this.spawnT -= dt;
    if (this.list.size < CRIT_MAX && this.spawnT <= 0) {
      this.spawnT = this.list.size < CRIT_MAX / 2 ? 0.3 : 4;
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
      if (!w.walkable(x, z, 0.8)) continue;
      const k = U.weighted(kinds.map((d, i) => [i, d.w || 20]));
      const sz = U.weighted(SIZES.map((s, i) => [i, s.w]));
      const g = Math.random() < GOLD_CHANCE ? 1 : 0;
      const c = this.add(this.nextId++, k, g, x, z, Math.random() * 6, sz);
      c.hp = c.max = kinds[k].hp * SIZES[sz].hp * (g ? 2 : 1) * (DIFFS[G.diff] || DIFFS.easy).crit;
      c.hx = x; c.hz = z;
      FX.burst(new V3(x, w.gh(x, z) + 0.3, z), '#ffffff', 5, 2);
      return;
    }
  },
  think(c, w, ps, dt) {
    c.atkCd = (c.atkCd || 0) - dt; c.angryT = (c.angryT || 0) - dt;
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
    if (d < P.range && d > 1.3 * sz.s && c.atkCd <= 0) { c.a = 1; c.aT = P.windup; c.spd = 0; c.ry = Math.atan2(dx, dz); if (def.charge) this.beep(c); return true; }
    this.step(c, w, sz, q.p.x, q.p.z, d < 1.05 * sz.s ? 0 : run, dt);
    return true;
  },
  // it spotted someone: a red "!" over its head (and a growl, if it's you it's after and it's close)
  alert(c) {
    const w = G.worlds[G.planet];
    if (!w) return;
    const s = SIZES[c.sz].s, at = new V3(c.rx, w.gh(c.rx, c.rz) + (c.m.hit * 2 + 0.6) * s, c.rz);
    FX.text(at, '!', '#ff4b4b', 64);
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
    for (const sp of this.spits) { if (sp.mesh.parent) sp.mesh.parent.remove(sp.mesh); disposeObj(sp.mesh); }
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
  // host: throw one at q (where they are right now: keep moving and it misses)
  spit(c, def, sz, q) {
    const w = G.worlds[G.planet];
    const m = { t: 'cspit', p: G.planet, k: c.k, sz: c.sz, g: c.g,
      f: [U.r2(c.x), U.r2(w.gh(c.x, c.z) + (c.m.hit * 1.3 + 0.3) * sz.s), U.r2(c.z)], to: [U.r2(q.p.x), U.r2(w.gh(q.p.x, q.p.z) + 0.3), U.r2(q.p.z)] };
    if (Net.online) Net.toAll(m);
    this.onSpit(m);
  },
  onSpit(m) {
    const def = m.p === G.planet && this.kinds(m.p)[m.k];
    if (!def || !def.spit || !G.worlds[m.p]) return;
    const sp = def.spit, from = new V3(...m.f), to = new V3(...m.to), d = from.distanceTo(to);
    let mesh;
    if (sp.what === 'can') mesh = tf(mk(CYL(0.14, 0.14, 0.34, 8), '#b8c0c8'), Math.PI / 2, 0, 0);
    else if (sp.what === 'coin') mesh = tf(mk(CYL(0.2, 0.2, 0.05, 12), '#ffd23f', null, 0, 0, 0, { emissive: '#8a6a00' }), Math.PI / 2, 0, 0);
    else mesh = new THREE.Mesh(new THREE.SphereGeometry(sp.what === 'snow' ? 0.26 : 0.22, 10, 8), new THREE.MeshBasicMaterial({ color: sp.c }));
    mesh.castShadow = false;
    mesh.position.copy(from);
    G.worlds[m.p].dyn.add(mesh);
    const fast = !!sp.fast;
    this.spits.push({ from, to, t: 0, T: Math.max(0.2, d / (SPIT.speed * (fast ? 1.6 : 1))), arc: fast ? 0.3 : 0.2 * d, mesh, sp, trail: 0,
      dmg: def.dmg * SIZES[m.sz].dmg * (m.g ? 1.5 : 1) * SPIT.dmg, name: def.name });
    if (G.mode === 'planet' && G.player.pos.distanceTo(from) < 26) Sound.play('spit');
  },
  updateSpits(dt) {
    const p = G.player;
    for (let i = this.spits.length - 1; i >= 0; i--) {
      const s = this.spits[i];
      s.t += dt;
      const k = Math.min(1, s.t / s.T);
      s.mesh.position.lerpVectors(s.from, s.to, k);
      s.mesh.position.y += 4 * s.arc * k * (1 - k);
      s.mesh.rotation.y += dt * 9;
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
        if (s.sp.what === 'goo' || s.sp.what === 'ecto') Sound.play('splat');
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
  // the first critter a shot from p0 to p1 passes through (skip: ones this shot already hit, keyed 'c' + id)
  hitTest(p0, p1, skip) {
    const w = G.worlds[G.planet];
    for (const c of this.list.values()) {
      if (skip && skip.has('c' + c.id)) continue;
      const r = c.m.hit * SIZES[c.sz].s;
      const ctr = this.center(c, w);
      if (U.segSphere(p0, p1, ctr, r + 0.15)) return { c, ctr };
    }
    return null;
  },
  // flags: what the shooter was doing when they fired (see LocalPlayer.fireZap)
  // fx: 'goo' slows it down, 'ice' freezes it · quiet: no damage number or sound (the Cryo Beam ticks fast)
  hit(c, dmg, pos, flags, fx, quiet) {
    c.flash = 1;
    // shooting a mean one while critters are still leaving you alone: you started it
    if (G.player.safeT > 0 && this.kinds(G.planet)[c.k].mood === 'mean') { G.player.safeT = 0; UI.toast('You started it! Mean critters can bite you now.', 'bad', 2.4); }
    // remember HOW I hit it; if this hit turns out to be the kill, the style bonus comes from here
    const full = c.myHits === 0 && (Net.isHost ? c.hp >= c.max : c.pct >= 100);
    c.myHits++;
    c.style = Object.assign({}, flags || {}, { first: full && c.myHits === 1 });
    FX.burst(pos, fx === 'ice' ? '#bff6ff' : c.g ? '#ffd23f' : '#ffffff', quiet ? 2 : 4, 3);
    if (!quiet) { FX.text(pos.clone().setY(pos.y + 0.6), String(dmg), '#ffffff', 36); Sound.play('hit'); }
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
    const m = { t: 'cdie', id, by };
    Net.toAll(m);
    this.onDie(m);
  },
  onDie(m) {
    const c = this.list.get(m.id);
    if (!c) return;
    const def = this.kinds(G.planet)[c.k];
    const w = G.worlds[G.planet];
    const pos = c.m.hover ? this.center(c, w) : new V3(c.rx, w.gh(c.rx, c.rz) + 0.4 * SIZES[c.sz].s, c.rz);
    FX.burst(pos, c.g ? '#ffd23f' : '#ff9a3d', Math.round(12 * SIZES[c.sz].s), 5);
    FX.ring(pos, '#ffffff', 2 * SIZES[c.sz].s);
    Sound.play('splat');
    this.remove(m.id);
    if (m.by === Net.myId) this.loot(def, c, pos);
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
  // the one who zapped it gets the body. Yes, you sell the body.
  loot(def, c, pos) {
    const styles = this.styleOf(c);
    this.bitBy.delete(c.id);
    let mult = 1;
    for (const s of styles) mult *= STYLE[s].m;
    const maxed = mult > STYLE_MAX;
    mult = Math.min(STYLE_MAX, Math.round(mult * 100) / 100);
    if (styles.length) {
      FX.text(pos.clone().setY(pos.y + 2.3), styles.map((s) => STYLE[s].name).join(' + '), '#7dffea', 30);
      FX.text(pos.clone().setY(pos.y + 1.7), `x${mult} STYLE${maxed ? ' (MAX)' : ''}`, '#ffd23f', 44);
      UI.toast(`STYLE KILL x${mult}${maxed ? ' (max!)' : ''}: ${styles.map((s) => `${STYLE[s].name} x${STYLE[s].m}`).join(' · ')}`, 'gold', 3);
      Sound.play(mult >= 3 ? 'jackpot' : 'win');
      SAVE.stats.style = (SAVE.stats.style || 0) + 1;
    }
    if (SAVE.cargo.length >= CARGO[SAVE.cargoLvl]) { UI.toast('Backpack full! Go sell stuff, then come back for more critters.', 'bad', 2.2); return; }
    const key = critKey(def.id, c.sz, !!c.g);
    const entry = mult > 1 ? `${key}*${mult}` : key;
    SAVE.cargo.push(entry);
    SAVE.stats.collected++;
    SAVE.stats.critters = (SAVE.stats.critters || 0) + 1;
    const rare = Activities.showLoot([entry]);
    if (!styles.length) FX.text(pos.clone().setY(pos.y + 1.2), c.g ? 'GOLDEN!' : c.sz >= 4 ? SIZES[c.sz].name.toUpperCase() + '!' : 'BAGGED!', c.g ? '#ffd23f' : '#7dff8a', 50);
    if (!styles.length) Sound.play(rare ? 'rare' : 'pickup');
    persist();
    UI.hud();
  },
};
