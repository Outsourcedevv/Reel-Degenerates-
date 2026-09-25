'use strict';
/* =========================================================
   Space critters: little creatures roaming every planet.
   Shy ones run away, mean ones chase you and bite. Zap them,
   sell them. The host runs their brains and tells everyone
   where they are; each player checks bites on themselves.
   ========================================================= */
const CRIT_MAX = 12;       // alive at once on a planet
const CRIT_SEND = 1 / 8;   // host sync rate

const Critters = {
  list: new Map(), // id -> critter
  planet: -1, nextId: 1, spawnT: 0, sendT: 0, biteCd: 0,

  kinds(pi) { return CRITTERS[PLANETS[pi].id]; },

  update(dt) {
    const pi = G.planet;
    if (this.planet !== pi) { this.clear(); this.spawnT = 0; }
    this.planet = pi;
    if (Net.isHost && this.anyoneHere()) this.host(dt);
    this.animate(dt);
    this.bites(dt);
  },
  anyoneHere() {
    if (G.mode === 'planet') return true;
    for (const r of G.remotes.values()) if (r.s.m === 'planet' && r.s.p === G.planet) return true;
    return false;
  },
  // everyone on the planet (for fleeing and chasing)
  players() {
    const out = [];
    if (G.mode === 'planet' && !G.player.dead) out.push(G.player.pos);
    for (const r of G.remotes.values()) if (r.s.m === 'planet' && r.s.p === G.planet) out.push(r.tpos);
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
    for (const c of this.list.values()) this.think(c, w, ps, dt);
    this.sendT -= dt;
    if (this.sendT <= 0 && Net.online) {
      this.sendT = CRIT_SEND;
      Net.toAll({ t: 'crit', p: G.planet, l: [...this.list.values()].map((c) => [c.id, c.k, c.g, U.r2(c.x), U.r2(c.z), U.r2(c.ry), Math.round((c.hp / c.max) * 100)]) });
    }
  },
  spawn(w) {
    for (let tries = 0; tries < 20; tries++) {
      const a = Math.random() * Math.PI * 2, r = U.rand(14, 56);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!w.landable(x, z)) continue;
      const k = Math.random() < 0.6 ? 0 : 1, g = Math.random() < 0.05 ? 1 : 0;
      const def = this.kinds(G.planet)[k];
      const c = this.add(this.nextId++, k, g, x, z, Math.random() * 6);
      c.hp = c.max = def.hp * (g ? 2 : 1);
      c.hx = x; c.hz = z;
      FX.burst(new V3(x, w.h(x, z) + 0.3, z), '#ffffff', 5, 2);
      return;
    }
  },
  think(c, w, ps, dt) {
    const def = this.kinds(G.planet)[c.k];
    let near = null, nd = Infinity;
    for (const p of ps) { const d = Math.hypot(p.x - c.x, p.z - c.z); if (d < nd) { nd = d; near = p; } }
    let tx = c.tx, tz = c.tz, spd = def.speed * 0.45;
    if (near && def.mood === 'shy' && nd < 8) { // run away!
      tx = c.x + (c.x - near.x); tz = c.z + (c.z - near.z); spd = def.speed * 1.2;
    } else if (near && def.mood === 'mean' && nd < 11 && Math.hypot(c.x - c.hx, c.z - c.hz) < 26) {
      tx = near.x; tz = near.z; spd = nd < 1.1 ? 0 : def.speed;
    } else {
      c.wt -= dt;
      if (c.wt <= 0 || Math.hypot(tx - c.x, tz - c.z) < 0.5) {
        c.wt = U.rand(2, 5);
        c.tx = c.hx + U.rand(-8, 8); c.tz = c.hz + U.rand(-8, 8);
        tx = c.tx; tz = c.tz;
      }
      if (c.wt > 3.5) spd = 0; // stand around sometimes
    }
    const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz);
    if (d > 0.05 && spd > 0) {
      const nx = c.x + (dx / d) * spd * dt, nz = c.z + (dz / d) * spd * dt;
      if (w.walkable(nx, nz)) { c.x = nx; c.z = nz; } else { c.wt = 0; c.tx = c.hx; c.tz = c.hz; }
      c.ry = Math.atan2(dx, dz);
    }
    c.spd = spd;
  },

  /* ---------- everyone ---------- */
  add(id, k, g, x, z, ry) {
    const w = G.worlds[G.planet], def = this.kinds(G.planet)[k];
    const m = buildCritter(def.id, !!g);
    m.root.position.set(x, w.h(x, z), z);
    w.dyn.add(m.root);
    const c = { id, k, g, x, z, ry, rx: x, rz: z, rry: ry, tx: x, tz: z, hx: x, hz: z, wt: 0, hp: def.hp, max: def.hp, pct: 100, m, t: Math.random() * 5, spd: 0, flash: 0 };
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
  clear() { for (const id of [...this.list.keys()]) this.remove(id); },
  // client: the host's snapshot of the planet's critters
  onSnap(m) {
    if (Net.isHost || m.p !== G.planet || !G.worlds[G.planet]) return;
    this.planet = m.p;
    const seen = new Set();
    for (const [id, k, g, x, z, ry, pct] of m.l) {
      seen.add(id);
      const c = this.list.get(id) || this.add(id, k, g, x, z, ry);
      c.x = x; c.z = z; c.ry = ry; c.pct = pct;
    }
    for (const id of [...this.list.keys()]) if (!seen.has(id)) this.remove(id);
  },
  animate(dt) {
    const w = G.worlds[G.planet];
    if (!w) return;
    for (const c of this.list.values()) {
      c.t += dt;
      const px = c.rx, pz = c.rz;
      c.rx = U.damp(c.rx, c.x, 12, dt); c.rz = U.damp(c.rz, c.z, 12, dt);
      c.rry += U.angDiff(c.rry, c.ry) * Math.min(1, dt * 10);
      const moving = Math.hypot(c.rx - px, c.rz - pz) / Math.max(dt, 1e-4) > 0.3;
      const hop = c.m.body && moving ? Math.abs(Math.sin(c.t * 12)) * 0.12 : 0;
      c.m.root.position.set(c.rx, w.h(c.rx, c.rz) + hop, c.rz);
      c.m.root.rotation.y = c.rry;
      c.m.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(c.t * 16 + i * 2) * 0.6 : 0; });
      c.flash = Math.max(0, c.flash - dt * 5);
      c.m.body.scale.setScalar(1 + c.flash * 0.25);
      if (c.m.body.userData.spark) c.m.body.userData.spark.rotation.y += dt * 4;
    }
  },
  // mean critters bite whoever they reach; each player checks their own ankles
  bites(dt) {
    this.biteCd -= dt;
    const p = G.player;
    if (G.mode !== 'planet' || p.dead || this.biteCd > 0 || G.panel) return;
    for (const c of this.list.values()) {
      const def = this.kinds(G.planet)[c.k];
      if (def.mood !== 'mean') continue;
      if (Math.hypot(p.pos.x - c.rx, p.pos.z - c.rz) < 1.2 && p.pos.y < G.worlds[G.planet].h(c.rx, c.rz) + 1.6) {
        this.biteCd = 0.9;
        p.hurtPlanet(def.dmg * (c.g ? 1.5 : 1), c.rx, c.rz, def.name);
        return;
      }
    }
  },

  /* ---------- zapping them ---------- */
  hitTest(p0, p1) {
    const w = G.worlds[G.planet];
    for (const c of this.list.values()) {
      const ctr = new V3(c.rx, w.h(c.rx, c.rz) + c.m.hit * 0.8, c.rz);
      if (U.segSphere(p0, p1, ctr, c.m.hit + 0.15)) return { c, ctr };
    }
    return null;
  },
  hit(c, dmg, pos) {
    c.flash = 1;
    FX.burst(pos, c.g ? '#ffd23f' : '#ffffff', 4, 3);
    FX.text(pos.clone().setY(pos.y + 0.6), String(dmg), '#ffffff', 36);
    Sound.play('hit');
    if (Net.isHost) this.damage(c.id, dmg, Net.myId);
    else Net.toHost({ t: 'hitc', id: c.id, dmg });
  },
  // host
  damage(id, dmg, by) {
    const c = this.list.get(id);
    if (!c) return;
    c.hp -= dmg;
    if (c.hp > 0) {
      // getting shot makes shy critters bolt and mean ones mad at you
      c.wt = 0;
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
    const pos = new V3(c.rx, w.h(c.rx, c.rz) + 0.4, c.rz);
    FX.burst(pos, c.g ? '#ffd23f' : '#ff9a3d', 12, 5);
    FX.ring(pos, '#ffffff', 2);
    Sound.play('splat');
    this.remove(m.id);
    if (m.by === Net.myId) this.loot(def, c.g, pos);
  },
  // the one who zapped it gets the body. Yes, you sell the body.
  loot(def, gold, pos) {
    if (SAVE.cargo.length >= CARGO[SAVE.cargoLvl]) { UI.toast('Backpack full! Go sell stuff, then come back for more critters.', 'bad', 2.2); return; }
    const id = (gold ? 'g_' : '') + def.id;
    SAVE.cargo.push(id);
    SAVE.stats.collected++;
    SAVE.stats.critters = (SAVE.stats.critters || 0) + 1;
    const rare = Activities.showLoot([id]);
    FX.text(pos.clone().setY(pos.y + 1.2), gold ? 'GOLDEN!' : 'BAGGED!', gold ? '#ffd23f' : '#7dff8a', 50);
    Sound.play(rare ? 'rare' : 'pickup');
    persist();
    UI.hud();
  },
};
