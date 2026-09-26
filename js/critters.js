'use strict';
/* =========================================================
   Space critters: little creatures roaming every planet.
   Shy ones run away, mean ones chase you and bite. Zap them,
   sell them. Every one rolls a size (bigger = rarer, tougher,
   worth more). Kill them in style for a bonus multiplier.
   The host runs their brains and tells everyone where they
   are; each player checks bites on themselves.
   ========================================================= */
const CRIT_MAX = 14;       // alive at once on a planet
const CRIT_SEND = 1 / 8;   // host sync rate
const GOLD_CHANCE = 0.03;

const Critters = {
  list: new Map(), // id -> critter
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
    for (const r of G.remotes.values()) if (r.s.m === 'planet' && r.s.p === G.planet && !r.s.d) out.push(r.tpos);
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
      // gooed (Goo Lobber): slowed down · frozen (Cryo Beam): stuck, and can't bite
      c.slowT = (c.slowT || 0) - dt; c.frozeT = (c.frozeT || 0) - dt;
      c.st = c.frozeT > 0 ? 2 : c.slowT > 0 ? 1 : 0;
      this.think(c, w, ps, dt);
    }
    this.sendT -= dt;
    if (this.sendT <= 0 && Net.online) {
      this.sendT = CRIT_SEND;
      Net.toAll({ t: 'crit', p: G.planet, l: [...this.list.values()].map((c) => [c.id, c.k, c.g, U.r2(c.x), U.r2(c.z), U.r2(c.ry), Math.round((c.hp / c.max) * 100), c.sz, c.st || 0]) });
    }
  },
  spawn(w) {
    const kinds = this.kinds(G.planet);
    for (let tries = 0; tries < 20; tries++) {
      const a = Math.random() * Math.PI * 2, r = U.rand(14, 56);
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
    if (c.st === 2) { c.spd = 0; return; } // frozen solid
    const def = this.kinds(G.planet)[c.k], sz = SIZES[c.sz];
    let near = null, nd = Infinity;
    for (const p of ps) { const d = Math.hypot(p.x - c.x, p.z - c.z); if (d < nd) { nd = d; near = p; } }
    const speed = def.speed * sz.spd * (c.st === 1 ? 0.4 : 1);
    let tx = c.tx, tz = c.tz, spd = speed * 0.45;
    if (near && def.mood === 'shy' && nd < 8) { // run away!
      tx = c.x + (c.x - near.x); tz = c.z + (c.z - near.z); spd = speed * 1.2;
    } else if (near && def.mood === 'mean' && nd < 11 && Math.hypot(c.x - c.hx, c.z - c.hz) < 26) {
      tx = near.x; tz = near.z; spd = nd < 1.1 * sz.s ? 0 : speed;
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
      if (w.walkable(nx, nz, 0.25 * sz.s)) { c.x = nx; c.z = nz; } else { c.wt = 0; c.tx = c.hx; c.tz = c.hz; }
      c.ry = Math.atan2(dx, dz);
    }
    c.spd = spd;
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
  clear() { for (const id of [...this.list.keys()]) this.remove(id); },
  // client: the host's snapshot of the planet's critters
  onSnap(m) {
    if (Net.isHost || m.p !== G.planet || !G.worlds[G.planet]) return;
    this.planet = m.p;
    const seen = new Set();
    for (const [id, k, g, x, z, ry, pct, sz, st] of m.l) {
      seen.add(id);
      const c = this.list.get(id) || this.add(id, k, g, x, z, ry, sz == null ? SIZE_NORMAL : sz);
      c.x = x; c.z = z; c.ry = ry; c.pct = pct; c.st = st || 0;
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
      const s = SIZES[c.sz].s;
      const hop = c.m.body && moving ? Math.abs(Math.sin(c.t * 12 / Math.sqrt(s))) * 0.12 * s : 0;
      c.m.root.position.set(c.rx, w.gh(c.rx, c.rz) + hop, c.rz);
      c.m.root.rotation.y = c.rry;
      c.m.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(c.t * 16 / Math.sqrt(s) + i * 2) * 0.6 : 0; });
      c.flash = Math.max(0, c.flash - dt * 5);
      c.m.body.scale.setScalar(1 + c.flash * 0.25);
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
    if (c.ice) c.ice.visible = st === 2;
    if (c.goo) c.goo.visible = st === 1;
  },
  // mean critters bite whoever they reach; each player checks their own ankles
  bites(dt) {
    this.biteCd -= dt;
    const p = G.player;
    if (G.mode !== 'planet' || p.dead || this.biteCd > 0 || G.panel) return;
    for (const c of this.list.values()) {
      const def = this.kinds(G.planet)[c.k], sz = SIZES[c.sz];
      if (def.mood !== 'mean' || c.st === 2) continue; // (frozen solid: no biting)
      if (Math.hypot(p.pos.x - c.rx, p.pos.z - c.rz) < 0.8 + 0.4 * sz.s && p.pos.y < G.worlds[G.planet].gh(c.rx, c.rz) + 1.6 * sz.s) {
        this.biteCd = 0.9;
        this.bitBy.set(c.id, G.time);
        p.hurtPlanet(def.dmg * sz.dmg * (c.g ? 1.5 : 1), c.rx, c.rz, (sz.name ? sz.name + ' ' : '') + def.name);
        return;
      }
    }
  },

  /* ---------- zapping them ---------- */
  // the first critter a shot from p0 to p1 passes through (skip: ones this shot already hit, keyed 'c' + id)
  hitTest(p0, p1, skip) {
    const w = G.worlds[G.planet];
    for (const c of this.list.values()) {
      if (skip && skip.has('c' + c.id)) continue;
      const r = c.m.hit * SIZES[c.sz].s;
      const ctr = new V3(c.rx, w.gh(c.rx, c.rz) + r * 0.8, c.rz);
      if (U.segSphere(p0, p1, ctr, r + 0.15)) return { c, ctr };
    }
    return null;
  },
  // flags: what the shooter was doing when they fired (see LocalPlayer.fireZap)
  // fx: 'goo' slows it down, 'ice' freezes it · quiet: no damage number or sound (the Cryo Beam ticks fast)
  hit(c, dmg, pos, flags, fx, quiet) {
    c.flash = 1;
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
      // getting shot makes shy critters bolt and mean ones mad at you
      c.wt = 0;
      if (fx === 'goo') c.slowT = 3;
      else if (fx === 'ice') c.frozeT = 1.2;
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
    const pos = new V3(c.rx, w.gh(c.rx, c.rz) + 0.4 * SIZES[c.sz].s, c.rz);
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
