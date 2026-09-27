'use strict';
/* =========================================================
   Something fun to do on the planets that don't have a
   thing of their own:
   - Planet Gloop: the Ring Run. Go through every glowing
     ring, up a mushroom staircase and back, against the
     clock (low gravity helps).
   - Frostbyte: Pete's Snowman Shooting Gallery. 30 seconds
     of snowmen popping out of the snow. Golden ones count
     triple. Don't shoot the penguins.
   - Spookulon: the Hedge of No Return. A maze with the
     treasure in the middle, against the clock (and some
     ghosts who think they're funny).
   Every run is your own (friends can play at the same time,
   each their own run). Runs give a bronze, silver or gold
   medal, each medal pays out once per world, your best is
   kept, and the crew hears about new medals.
   ========================================================= */
const MEDALS = [null, { name: 'BRONZE', color: '#e59a5e' }, { name: 'SILVER', color: '#d8e2ee' }, { name: 'GOLD', color: '#ffd23f' }];
const clock = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
// a glowing see-through material of your own (things that light up and fade)
const glowMat = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false });

const Fun = {
  run: null,     // the run I'm on: { d (which fun thing), w (its world), t (seconds in), ... }
  targets: [],   // things my shots can hit right now (the shooting gallery, see Shots.test)

  def(w) { return w && FUN_DEFS[w.cfg.id]; },
  // room for it on the planet, before the terrain is made and everything else is scattered around
  reserve(w) { const d = this.def(w); if (d && d.reserve) d.reserve(w); },
  build(w) { const d = this.def(w); if (d) { w.fun = {}; d.build(w, w.fun); } },
  rec(d) { return (SAVE.fun && SAVE.fun[d.id]) || { best: null, medal: 0 }; },
  // what E says at its start
  label(d) {
    if (this.run) return this.run.d === d ? `${d.name}: GO GO GO!` : `${d.name}: finish your other run first`;
    const r = this.rec(d);
    return `${d.name}: ${d.verb}` + (r.best != null ? ` (best ${d.show(r.best)}${r.medal ? `, ${MEDALS[r.medal].name}` : ''})` : '');
  },
  start(d) {
    if (this.run || G.mode !== 'planet' || G.player.dead || !G.world.fun) return;
    this.run = { d, w: G.world, f: G.world.fun, t: 0 };
    d.begin(this.run, this.run.f);
  },
  update(dt) {
    const w = G.mode === 'planet' ? G.world : null, r = this.run;
    if (w && w.fun && this.def(w).idle) this.def(w).idle(w.fun, dt, r && r.w === w ? r : null);
    if (!r) return;
    if (G.mode !== 'planet' || G.world !== r.w || G.player.dead) { this.stop(); UI.toast(`${r.d.name}: run cancelled.`, '', 2.2); return; }
    r.t += dt;
    r.d.tick(r, r.f, dt);
  },
  // a run ended with this score (times: lower is better). Medals, prizes, your best.
  finish(score) {
    const r = this.run;
    if (!r) return;
    const d = r.d, f = r.f;
    this.stop();
    const rec = Object.assign({ best: null, medal: 0 }, this.rec(d)), medals = f.medals || d.medals;
    let medal = 0;
    medals.forEach((m, i) => { if (d.low ? score <= m : score >= m) medal = i + 1; });
    const newBest = rec.best == null || (d.low ? score < rec.best : score > rec.best);
    if (newBest) rec.best = score;
    let prize = 0;
    for (let m = rec.medal + 1; m <= medal; m++) prize += d.prize[m - 1];
    const upgraded = medal > rec.medal;
    rec.medal = Math.max(rec.medal, medal);
    SAVE.fun = Object.assign({}, SAVE.fun, { [d.id]: rec });
    if (prize) addBucks(prize);
    persist();
    UI.hud();
    const M = MEDALS[medal], bits = [d.show(score) + (newBest ? ' · NEW BEST' : ` · best ${d.show(rec.best)}`)];
    if (prize) bits.push(`+${U.bucks(prize)}`);
    else if (medal) bits.push('(that medal already paid out)');
    else bits.push(`${MEDALS[1].name} is ${d.show(medals[0])}`);
    if (medal < 3 && medal) bits.push(`${MEDALS[medal + 1].name}: ${d.show(medals[medal])}`);
    UI.bigTitle(M ? `${M.name}!` : 'NO MEDAL', bits.join(' · '), M ? M.color : '#ff8a80', 3.6);
    Sound.play(medal === 3 ? 'jackpot' : medal ? 'win' : 'lose');
    if (upgraded) {
      const html = `<b>${U.esc(G.name)}</b> got <b>${M.name}</b> on the ${U.esc(d.name)} (${U.esc(d.show(score))})!`;
      UI.feed(html, 'good');
      Net.relay({ t: 'ann', html, cls: 'good' });
    }
  },
  fail(msg) {
    if (!this.run) return;
    this.stop();
    Sound.play('error');
    UI.bigTitle('RUN OVER', msg, '#ff8a80', 2.8);
  },
  stop() {
    const r = this.run;
    if (!r) return;
    this.run = null;
    r.d.end(r, r.f);
    this.targets.length = 0;
    UI.fun(null);
  },

  /* ----- my shots and the gallery's targets (see Shots) ----- */
  hitTest(p0, p1, skip) {
    for (const t of this.targets) if (t.live && !(skip && skip.has(t.key)) && U.segSphere(p0, p1, t.c, t.r)) return { k: 'fun', t, key: t.key };
    return null;
  },
  hit(t) { if (t.live && this.run && this.run.d.hit) this.run.d.hit(this.run, this.run.f, t); },
  blast(pos, radius) { for (const t of [...this.targets]) if (t.live && t.c.distanceTo(pos) < radius + t.r) this.hit(t); },
};

/* =========================================================
   Planet Gloop: the Ring Run
   ========================================================= */
const RING_RUN = {
  id: 'rings', name: 'Ring Run', verb: '{use} to start', low: true,
  prize: [40, 90, 180], medals: [90, 60, 45], // (worked out from the course, see build)
  show: clock,
  start: { x: -20, z: -8 }, climb: 1, stairs: { x: -38, z: -24 }, // (Gloop's second mushroom staircase)
  // the way the course goes, from the start pad and the staircase (dx, dz: toward it, sx, sz: sideways)
  frame() {
    const S = this.start, C = this.stairs, dx = C.x - S.x, dz = C.z - S.z, D = Math.hypot(dx, dz), ux = dx / D, uz = dz / D;
    return { S, C, D, ux, uz, sx: uz, sz: -ux, want: { x: C.x + uz * 12 - ux * 3, z: C.z - ux * 12 - uz * 3 } };
  },
  out(F, k) { return { x: F.S.x + F.ux * (F.D - 9) * k - F.sx * 3.5, z: F.S.z + F.uz * (F.D - 9) * k - F.sz * 3.5 }; },
  back(F, from, k, off) { return { x: U.lerp(from.x, F.S.x, k) + F.sx * off, z: U.lerp(from.z, F.S.z, k) + F.sz * off }; },
  reserve(w) {
    const F = this.frame(), keep = (p, r) => w.occupied.push({ x: p.x, z: p.z, r, fun: true });
    keep(F.S, 4.5); keep(F.C, 13); keep(F.want, 4);
    for (const k of [0.3, 0.68]) keep(this.out(F, k), 3);
    for (const [k, off] of [[0.3, 4], [0.66, 3]]) keep(this.back(F, F.want, k, off), 3);
  },
  build(w, f) {
    const S = this.start, gy = w.h(S.x, S.z), climb = w.climbs[this.climb];
    // the start pad and its sign
    const pad = grp(w.stat, S.x, gy, S.z);
    mk(CYL(2.6, 2.8, 0.2, 24), '#3a2a5a', pad, 0, 0.1, 0);
    mk(CYL(2.1, 2.1, 0.06, 24), '#7dffea', pad, 0, 0.22, 0, { emissive: '#2a9a8a' });
    const post = grp(w.stat, S.x + 3, gy, S.z + 1.5);
    post.rotation.y = Math.atan2(-post.position.x, -post.position.z); // (facing the landing pad)
    mk(BOX(0.18, 2.6, 0.18), '#6b4a2b', post, 0, 1.3, 0);
    const sg = signMesh(['RING RUN', 'Go through every ring, fast!'], 2.6, 1.1, { bg: '#3a2a5a', colors: ['#7dffea', '#ffd6f5'], border: '#ff9ad5', double: true });
    sg.position.set(0, 2.6, 0.12); post.add(sg);
    w.interact(S.x, S.z, 3.2, () => Fun.label(this), () => Fun.start(this));
    const pts = [], F = this.frame();
    const ground = (x, z) => {
      const p = this.freeSpot(w, x, z);
      pts.push({ x: p.x, y: w.h(p.x, p.z) + 1.5, z: p.z, R: 1.9, kind: 'gate' });
    };
    // out along one side of the way to the staircase, a halo over every step, a leap off the top
    // that lands on the other side, and back to the pad along that side
    for (const k of [0.3, 0.68]) { const p = this.out(F, k); ground(p.x, p.z); }
    for (const st of climb.steps) pts.push({ x: st.x, y: st.top + 1.1, z: st.z, R: Math.max(1.8, st.r * 0.85), kind: 'halo' });
    const peak = climb.steps[climb.steps.length - 1], want = F.want;
    let land = null, bd = Infinity;
    for (let a = 0; a < Math.PI * 2; a += 0.25) {
      const x = peak.x + Math.cos(a) * (peak.r + 7), z = peak.z + Math.sin(a) * (peak.r + 7), d = Math.hypot(x - want.x, z - want.z);
      if (d < bd && this.clear(w, x, z, 1.5)) { bd = d; land = { x, z, a }; }
    }
    if (!land) land = { x: want.x, z: want.z, a: Math.atan2(want.z - peak.z, want.x - peak.x) };
    pts.push({ x: peak.x + Math.cos(land.a) * (peak.r + 2.6), y: peak.top - 0.6, z: peak.z + Math.sin(land.a) * (peak.r + 2.6), R: 2.2, kind: 'gate' });
    for (const [k, off] of [[0.3, 4], [0.66, 3]]) { const p = this.back(F, land, k, off); ground(p.x, p.z); }
    // gates face the way you're going
    pts.forEach((p, i) => {
      const q = pts[i + 1] || { x: S.x, z: S.z }, pr = pts[i - 1] || { x: S.x, z: S.z };
      p.face = Math.atan2(q.x - pr.x, q.z - pr.z);
    });
    f.rings = pts.map((p) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(p.R, p.kind === 'halo' ? 0.12 : 0.16, 8, 40), glowMat('#ff9ad5', 0.5));
      m.position.set(p.x, p.y, p.z);
      if (p.kind === 'halo') m.rotation.x = Math.PI / 2; else m.rotation.y = p.face;
      w.dyn.add(m);
      return Object.assign(p, { m });
    });
    // a beam of light over the next ring
    f.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 40, 10, 1, true), glowMat('#7dffea', 0.25));
    f.beam.material.side = THREE.DoubleSide; f.beam.material.blending = THREE.AdditiveBlending;
    f.beam.visible = false;
    w.dyn.add(f.beam);
    // par: running the flat bits, a second and a half a step, the leap
    let len = 0, prev = S;
    for (const p of pts) { if (p.kind === 'gate') len += Math.hypot(p.x - prev.x, p.z - prev.z); prev = p; }
    len += Math.hypot(S.x - prev.x, S.z - prev.z);
    const par = len / 7.5 + climb.steps.length * 1.5 + 3;
    f.medals = [Math.ceil(par * 1.9), Math.ceil(par * 1.4), Math.ceil(par * 1.1)];
    f.limit = Math.ceil(par * 3.2);
    f.S = { x: S.x, y: gy, z: S.z };
  },
  // dry ground with nothing in the way (the room kept for the course itself doesn't count)
  clear(w, x, z, rad) {
    if (w.h(x, z) < 1.3 || w.pads.some((p) => w.padDist(p, x, z) < rad)) return false;
    return !w.occupied.some((o) => !o.fun && Math.hypot(x - o.x, z - o.z) < o.r + rad);
  },
  // the nearest clear spot around (x, z)
  freeSpot(w, x, z) {
    for (let r = 0; r < 9; r += 1.5) {
      for (let a = 0; a < Math.PI * 2; a += r ? 0.6 / (r / 1.5) : 7) {
        const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
        if (this.clear(w, px, pz, 1.6)) return { x: px, z: pz };
      }
    }
    return { x, z };
  },
  begin(r, f) {
    r.next = 0;
    f.rings.forEach((g) => { g.m.material.color.set('#b98fff'); g.m.material.opacity = 0.35; g.m.scale.setScalar(1); });
    this.light(r, f);
    Sound.play('ding');
    UI.bigTitle('GO!', `Go through all ${f.rings.length} rings, then back to the pad. Gold: ${clock(f.medals[2])}`, '#7dffea', 2.2);
  },
  light(r, f) {
    const g = f.rings[r.next];
    if (!g) { f.beam.position.set(f.S.x, f.S.y + 20, f.S.z); return; }
    g.m.material.color.set('#7dffea'); g.m.material.opacity = 1;
    f.beam.visible = true;
    f.beam.position.set(g.x, g.y + 20, g.z);
  },
  tick(r, f, dt) {
    const p = G.player.pos, cx = p.x, cy = p.y + 0.9, cz = p.z;
    const g = f.rings[r.next];
    if (g) {
      const hd = Math.hypot(cx - g.x, cz - g.z);
      const through = g.kind === 'halo' ? hd < g.R && cy > g.y - 1.3 && cy < g.y + 1.6 : hd < g.R + 0.4 && Math.abs(cy - g.y) < g.R + 0.4;
      if (through) {
        g.m.material.color.set('#46d98a'); g.m.material.opacity = 0.25;
        FX.ring(new V3(g.x, g.y, g.z), '#7dffea', g.R + 0.6);
        Sound.play('ding');
        r.next++;
        this.light(r, f);
      }
    } else if (Math.hypot(p.x - f.S.x, p.z - f.S.z) < 2.8 && Math.abs(p.y - f.S.y) < 2) { Fun.finish(r.t); return; }
    if (r.t > f.limit) { Fun.fail(`Out of time. ${f.rings.length - r.next} rings to go.`); return; }
    const left = f.rings.length - r.next;
    UI.fun('RING RUN', clock(r.t), left ? `Ring ${r.next + 1} of ${f.rings.length} · follow the beam` : 'Back to the start pad!', 1 - r.t / f.limit, f.limit - r.t < 10);
  },
  idle(f, dt, r) {
    const t = G.time;
    for (let i = 0; i < f.rings.length; i++) {
      const g = f.rings[i];
      if (r && i === r.next) g.m.scale.setScalar(1 + Math.sin(t * 8) * 0.06);
      else if (!r) g.m.material.opacity = 0.5 + 0.15 * Math.sin(t * 2 + i * 0.6);
    }
    if (f.beam.visible) f.beam.material.opacity = 0.18 + 0.08 * Math.sin(t * 6);
  },
  end(r, f) {
    f.beam.visible = false;
    f.rings.forEach((g) => { g.m.material.color.set('#ff9ad5'); g.m.scale.setScalar(1); });
  },
};

/* =========================================================
   Frostbyte: Pete's Snowman Shooting Gallery
   ========================================================= */
const GALLERY = {
  id: 'gallery', name: 'Snowman Shooting Gallery', verb: '{use} to play (30 seconds)', low: false,
  prize: [150, 350, 700], medals: [10, 18, 26],
  show: (s) => `${s} pts`,
  booth: { x: 10, z: 37 }, dur: 30,
  // where targets pop up: rows further and further out, across the field in front of the booth (+z)
  slots: [[-6, 9], [-2, 9], [2, 9], [6, 9], [-8, 14.5], [-3, 14.5], [3, 14.5], [8, 14.5], [-9, 20], [-4.5, 20], [0, 20], [4.5, 20], [9, 20]],
  reserve(w) {
    const B = this.booth;
    w.occupied.push({ x: B.x, z: B.z, r: 5 });
    for (const [lx, d] of this.slots) w.occupied.push({ x: B.x - lx, z: B.z + d, r: 2.4 });
    for (const d of [5, 11, 17, 23]) for (const lx of [-8, 0, 8]) w.occupied.push({ x: B.x - lx, z: B.z + d, r: 3 });
  },
  build(w, f) {
    const B = this.booth, gy = w.h(B.x, B.z);
    // the booth: a counter (the firing line), posts, a striped awning and a big sign
    const g = grp(w.stat, B.x, gy, B.z);
    mk(BOX(4.6, 1.05, 0.7), '#8a5a34', g, 0, 0.52, 1.3);
    mk(BOX(4.8, 0.1, 0.85), '#c98f5a', g, 0, 1.08, 1.3);
    for (const s of [-1, 1]) for (const z of [-0.8, 1.3]) mk(CYL(0.09, 0.09, 3.3, 6), '#6b4a2b', g, s * 2.2, 1.65, z);
    for (let i = 0; i < 8; i++) tf(mk(BOX(0.6, 0.08, 2.5), i % 2 ? '#ffffff' : '#3aa7ff', g, -2.1 + i * 0.6, 3.35, 0.25), 0.18, 0, 0);
    const sg = signMesh(['SNOWMAN SHOOTING GALLERY', 'Snowmen 1 · Golden 3 · Penguins -2 (DON\'T)'], 4.6, 1.2, { bg: '#1d3a5c', colors: ['#ffffff', '#bfe8ff'], border: '#3aa7ff', double: true });
    sg.position.set(0, 4.2, 1.45); sg.rotation.y = Math.PI; g.add(sg);
    w.box(B.x, B.z + 1.3, 4.6, 0.7, gy + 1.1);
    w.interact(B.x, B.z, 3.2, () => Fun.label(this), () => Fun.start(this));
    // snow mounds for the targets to pop out of
    f.slots = this.slots.map(([lx, d]) => {
      const x = B.x - lx, z = B.z + d, y = w.h(x, z);
      tf(mk(SPH(0.95, 10, 6), '#eef6ff', w.stat, x, y - 0.25, z), 0, 0, 0, 1.2, 0.45, 1.2);
      return { x, y, z, t: null };
    });
    f.B = { x: B.x, y: gy, z: B.z };
    f.models = { snow: this.target('snow'), gold: this.target('gold'), peng: this.target('peng') };
    // (a few snowmen wait in the field while nobody's playing)
    f.idleMen = [1, 6, 10, 12].map((i, k) => {
      const sl = f.slots[i], m = f.models[k === 2 ? 'peng' : 'snow'].clone();
      m.position.set(sl.x, sl.y, sl.z);
      m.rotation.y = Math.atan2(B.x - sl.x, B.z - sl.z);
      w.dyn.add(m);
      return m;
    });
  },
  // what pops up: a snowman, a golden one, or one of Pete's cousins
  target(kind) {
    const g = new THREE.Group();
    if (kind === 'peng') {
      tf(mk(SPH(0.55, 12, 9), '#1d2330', g, 0, 0.75, 0), 0, 0, 0, 1, 1.45, 0.95);
      tf(mk(SPH(0.44, 12, 9), '#f4f6fa', g, 0, 0.72, 0.16), 0, 0, 0, 1, 1.35, 0.8);
      mk(SPH(0.36, 12, 9), '#1d2330', g, 0, 1.62, 0);
      tf(mk(CONE(0.1, 0.3, 6), '#ff9a1f', g, 0, 1.58, 0.38), Math.PI / 2);
      for (const s of [-1, 1]) {
        mk(SPH(0.07, 6, 5), '#ffffff', g, s * 0.13, 1.7, 0.29);
        tf(mk(SPH(0.16, 8, 6), '#1d2330', g, s * 0.52, 0.85, 0), 0, 0, s * 0.5, 0.45, 1.3, 0.8);
        tf(mk(BOX(0.22, 0.06, 0.3), '#ff9a1f', g, s * 0.18, 0.03, 0.15), 0, 0, 0);
      }
      const sg = signMesh(['DON\'T!'], 0.8, 0.35, { bg: '#ffffff', color: '#d6281b', border: '#d6281b' });
      sg.position.set(0.55, 1.25, 0.3); sg.rotation.z = -0.2; g.add(sg);
    } else {
      const col = kind === 'gold' ? '#ffd23f' : '#ffffff', o = kind === 'gold' ? { emissive: '#8a6a00' } : undefined;
      mk(ICO(0.62, 1), col, g, 0, 0.55, 0, o);
      mk(ICO(0.45, 1), col, g, 0, 1.35, 0, o);
      mk(ICO(0.33, 1), col, g, 0, 1.98, 0, o);
      tf(mk(CONE(0.07, 0.34, 5), '#ff8a1f', g, 0, 1.98, 0.44), Math.PI / 2);
      for (const s of [-1, 1]) {
        mk(SPH(0.05, 5, 4), '#111111', g, s * 0.11, 2.08, 0.28);
        tf(mk(CYL(0.025, 0.025, 0.8, 4), '#6b4a2b', g, s * 0.62, 1.45, 0), 0, 0, s * 1.1);
      }
      if (kind === 'gold') { const h = buildHat('crown'); h.position.set(0, 2.25, 0); h.scale.setScalar(0.8); g.add(h); }
    }
    g.traverse((c) => { if (c.isMesh) c.castShadow = false; });
    return g;
  },
  begin(r, f) {
    r.score = 0; r.spawnT = 1.2; r.hits = 0; r.oops = 0;
    for (const m of f.idleMen) m.visible = false;
    Sound.play('ding');
    UI.bigTitle('SHOOT THE SNOWMEN!', 'Golden ones: 3 points. Penguins: -2. Stay at the counter.', '#bfe8ff', 2.2);
  },
  pop(r, f) {
    const free = f.slots.filter((s) => !s.t);
    if (!free.length) return;
    const s = U.pick(free), roll = Math.random(), kind = roll < 0.1 ? 'gold' : roll < 0.28 ? 'peng' : 'snow';
    const m = f.models[kind].clone();
    m.position.set(s.x, s.y - 2.3, s.z);
    m.rotation.y = Math.atan2(f.B.x - s.x, f.B.z - s.z) + (Math.random() - 0.5) * 0.4;
    r.w.dyn.add(m);
    const k = r.t / this.dur;
    s.t = { kind, m, slot: s, age: 0, stay: U.rand(1.4, 2.3) * (1 - 0.3 * k), live: true, key: 'g' + (r.n = (r.n || 0) + 1), c: new V3(s.x, s.y + 1.15, s.z), r: 0.9, down: 0 };
    Fun.targets.push(s.t);
  },
  hit(r, f, t) {
    t.live = false;
    const pts = t.kind === 'gold' ? 3 : t.kind === 'peng' ? -2 : 1;
    r.score = Math.max(0, r.score + pts);
    if (pts > 0) r.hits++; else r.oops++;
    const at = t.c.clone().setY(t.c.y + 0.9);
    FX.text(at, pts > 0 ? `+${pts}` : `${pts}`, pts > 1 ? '#ffd23f' : pts > 0 ? '#ffffff' : '#ff6b6b', 54);
    FX.burst(t.c, t.kind === 'gold' ? '#ffd23f' : t.kind === 'peng' ? '#1d2330' : '#ffffff', 14, 6);
    Sound.play(t.kind === 'gold' ? 'coin' : t.kind === 'peng' ? 'bonk' : 'splat');
    if (t.kind === 'peng') UI.toast(U.pick(['HEY! That was Pete\'s cousin! -2', 'Not the penguins! -2', 'Pete saw that. -2']), 'bad', 1.4);
  },
  tick(r, f, dt) {
    const p = G.player.pos;
    if (Math.hypot(p.x - f.B.x, p.z - f.B.z) > 4.5) { Fun.fail('You left the counter. Pete says that\'s cheating.'); return; }
    const left = this.dur - r.t;
    if (left <= 0) { Fun.finish(r.score); return; }
    r.spawnT -= dt;
    const up = f.slots.filter((s) => s.t && s.t.live).length;
    if (r.spawnT <= 0 && up < (left < 10 ? 4 : 3)) { this.pop(r, f); r.spawnT = U.rand(0.4, 0.75); }
    // targets come up out of the snow, stay a moment, and go back down (hit ones fall over)
    for (const s of f.slots) {
      const t = s.t;
      if (!t) continue;
      t.age += dt;
      if (t.live && t.age > t.stay) { t.live = false; }
      if (t.live) t.m.position.y = s.y - 2.3 + 2.3 * Math.min(1, t.age / 0.22);
      else {
        t.down += dt;
        t.m.position.y -= dt * 7;
        if (t.down > 0.4) { r.w.dyn.remove(t.m); s.t = null; }
      }
    }
    for (let i = Fun.targets.length - 1; i >= 0; i--) if (!Fun.targets[i].live) Fun.targets.splice(i, 1);
    UI.fun('SNOWMAN SHOOTING GALLERY', `${r.score} pts`, `${Math.ceil(left)}s left · don't shoot the penguins`, left / this.dur, left < 5);
  },
  end(r, f) {
    for (const s of f.slots) if (s.t) { if (s.t.m.parent) s.t.m.parent.remove(s.t.m); s.t = null; }
    for (const m of f.idleMen) m.visible = true;
  },
};

/* =========================================================
   Spookulon: the Hedge of No Return
   ========================================================= */
const MAZE = {
  id: 'maze', name: 'Hedge of No Return', verb: '{use} to start the clock', low: true,
  prize: [300, 700, 1400], medals: [120, 70, 45],
  show: clock,
  at: { x: -30, z: -44.8 }, nx: 10, nz: 7, cs: 3.2, H: 3.4,
  rect() { const { x, z } = this.at, hw = (this.nx * this.cs) / 2, hd = (this.nz * this.cs) / 2; return { x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd }; },
  reserve(w) {
    const R = this.rect();
    w.addFlat(R.x0 - 1.5, R.x1 + 4, R.z0 - 1.5, R.z1 + 1.5, Math.max(w.rawH(this.at.x, this.at.z), 1.6));
    w.occupied.push({ x: this.at.x, z: this.at.z, r: 21 }, { x: R.x1 + 2.5, z: this.at.z, r: 3.5 });
  },
  // a maze with one way to every cell (a random walk that backs up at dead ends), picked from a few
  // tries for the longest way from the gate to the treasure in the middle
  carve(rng) {
    const { nx, nz } = this, gate = [nx - 1, Math.floor(nz / 2)], goal = [Math.floor(nx / 2) - 1, Math.floor(nz / 2)];
    let best = null;
    for (let tries = 0; tries < 16; tries++) {
      const open = new Set(), seen = new Set(['0,0']), stack = [[0, 0]];
      while (stack.length) {
        const [i, j] = stack[stack.length - 1];
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([di, dj]) => [i + di, j + dj]).filter(([a, b]) => a >= 0 && b >= 0 && a < nx && b < nz && !seen.has(a + ',' + b));
        if (!nb.length) { stack.pop(); continue; }
        const [a, b] = nb[Math.floor(rng() * nb.length)];
        seen.add(a + ',' + b);
        open.add(Math.min(i, a) + ',' + Math.min(j, b) + (a !== i ? 'x' : 'z'));
        stack.push([a, b]);
      }
      const path = this.route(open, gate, goal);
      if (!best || path.length > best.path.length) best = { open, path };
    }
    return Object.assign(best, { gate, goal });
  },
  // the way from cell a to cell b (a list of cells)
  route(open, a, b) {
    const k = (c) => c[0] + ',' + c[1], prev = new Map([[k(a), null]]), q = [a];
    const can = (c, d) => (d[0] !== c[0] ? open.has(Math.min(c[0], d[0]) + ',' + c[1] + 'x') : open.has(c[0] + ',' + Math.min(c[1], d[1]) + 'z'));
    while (q.length) {
      const c = q.shift();
      if (c[0] === b[0] && c[1] === b[1]) break;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const d = [c[0] + di, c[1] + dj];
        if (d[0] < 0 || d[1] < 0 || d[0] >= this.nx || d[1] >= this.nz || prev.has(k(d)) || !can(c, d)) continue;
        prev.set(k(d), c);
        q.push(d);
      }
    }
    const path = [];
    for (let c = b; c; c = prev.get(k(c))) path.unshift(c);
    return path;
  },
  build(w, f) {
    const { nx, nz, cs, H } = this, R = this.rect(), gy = w.h(this.at.x, this.at.z), top = gy + H;
    const M = this.carve(U.seeded(4200 + w.idx));
    const cell = (i, j) => ({ x: R.x0 + (i + 0.5) * cs, z: R.z0 + (j + 0.5) * cs });
    // hedges: long runs of wall merged into one piece (and one thing to bump into) each, bushy on top
    const bumps = U.seeded(311 + w.idx);
    const hedge = (x0, z0, x1, z1) => {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, alongX = z0 === z1, len = (alongX ? x1 - x0 : z1 - z0) + 0.8;
      const wx = alongX ? len : 0.8, wz = alongX ? 0.8 : len;
      mk(BOX(wx, H, wz), '#1f3326', w.stat, cx, gy + H / 2, cz);
      mk(BOX(wx + 0.1, 0.22, wz + 0.1), '#2e4a36', w.stat, cx, top - 0.02, cz);
      for (let d = -len / 2 + 0.5; d <= len / 2 - 0.4; d += 1.1 + bumps() * 0.4) {
        const s = 0.42 + bumps() * 0.18;
        tf(mk(ICO(s, 0), bumps() < 0.5 ? '#2e4a36' : '#26402f', w.stat, cx + (alongX ? d : (bumps() - 0.5) * 0.3), top + 0.05, cz + (alongX ? (bumps() - 0.5) * 0.3 : d)), bumps() * 3, bumps() * 3, 0, 1.1, 0.6, 1.1);
      }
      w.box(cx, cz, wx, wz, top);
    };
    const wall = (i, j, dir) => { // the wall on cell (i, j)'s +x ('x') or +z ('z') side
      if (dir === 'x') return i === nx - 1 ? !(j === M.gate[1]) : !M.open.has(i + ',' + j + 'x');
      return j === nz - 1 ? true : !M.open.has(i + ',' + j + 'z');
    };
    for (let i = -1; i < nx; i++) { // walls across x, at the +x side of column i, in runs down z
      let run = null;
      for (let j = 0; j <= nz; j++) {
        const on = j < nz && (i < 0 || wall(i, j, 'x'));
        const x = R.x0 + (i + 1) * cs;
        if (on && run == null) run = R.z0 + j * cs;
        if (!on && run != null) { hedge(x, run, x, R.z0 + j * cs); run = null; }
      }
    }
    for (let j = -1; j < nz; j++) { // walls across z, at the +z side of row j, in runs along x
      let run = null;
      for (let i = 0; i <= nx; i++) {
        const on = i < nx && (j < 0 || wall(i, j, 'z'));
        const z = R.z0 + (j + 1) * cs;
        if (on && run == null) run = R.x0 + i * cs;
        if (!on && run != null) { hedge(run, z, R.x0 + i * cs, z); run = null; }
      }
    }
    // the gate: an arch with the name, lanterns, and where the clock starts
    const gz = cell(0, M.gate[1]).z, gx = R.x1;
    const arch = grp(w.stat, gx + 0.2, gy, gz);
    arch.rotation.y = Math.PI / 2;
    for (const s of [-1, 1]) { mk(BOX(0.3, H + 0.8, 0.3), '#4a4550', arch, s * 1.35, (H + 0.8) / 2, 0); this.lantern(arch, s * 2.2, 0.9); }
    const sg = signMesh(['HEDGE OF NO RETURN', 'Treasure in the middle. Clock starts at E.'], 3.8, 0.9, { bg: '#2a2530', colors: ['#b9a4ff', '#e8ddff'], border: '#4a4550', glow: true, double: true });
    sg.position.set(0, H + 0.9, 0); arch.add(sg);
    w.interact(gx + 1.8, gz, 2.6, () => Fun.label(this), () => Fun.start(this));
    f.gate = { x: gx + 1.8, z: gz };
    // the treasure in the middle
    const c = cell(M.goal[0], M.goal[1]);
    f.chest = this.chest();
    f.chest.position.set(c.x, gy, c.z);
    f.chest.rotation.y = Math.PI / 2;
    w.dyn.add(f.chest);
    f.goal = { x: c.x, y: gy, z: c.z };
    // lanterns on a few corners, and ghosts waiting at the dead ends furthest from the way through
    const onPath = new Set(M.path.map((p) => p[0] + ',' + p[1]));
    const walls = (i, j) => [wall(i, j, 'x'), wall(i, j, 'z'), i === 0 || wall(i - 1, j, 'x'), j === 0 || wall(i, j - 1, 'z')].filter(Boolean).length;
    const ends = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if (walls(i, j) === 3 && !onPath.has(i + ',' + j)) ends.push(cell(i, j));
    f.ghosts = ends.slice(0, 5).map((e) => {
      const m = buildGhostNode();
      m.visible = false;
      w.dyn.add(m);
      return { x: e.x, z: e.z, m, t: -1 };
    });
    const posts = U.seeded(77 + w.idx);
    for (let k = 0; k < 7; k++) {
      const i = 1 + Math.floor(posts() * (nx - 1)), j = 1 + Math.floor(posts() * (nz - 1));
      const lamp = grp(w.stat, R.x0 + i * cs, top, R.z0 + j * cs);
      this.lantern(lamp, 0, 0);
    }
    // times: from how long the way through is
    const L = M.path.length * cs + 3;
    f.medals = [Math.ceil(L / 3.5 + 25), Math.ceil(L / 5 + 10), Math.ceil(L / 7 + 4)];
    f.limit = f.medals[0] * 2;
    f.top = top;
    f.R = R;
  },
  lantern(parent, x, z) {
    mk(CYL(0.05, 0.05, 0.5, 5), '#2a2530', parent, x, 0.25, z);
    mk(SPH(0.22, 8, 6), '#ff8a1f', parent, x, 0.62, z, { emissive: '#ff6a00' });
  },
  // an open treasure chest, full of gold
  chest() {
    const g = new THREE.Group(), gold = { emissive: '#a07800' };
    mk(BOX(1.3, 0.7, 0.85), '#6b3d1f', g, 0, 0.35, 0);
    mk(BOX(1.36, 0.08, 0.9), '#ffd23f', g, 0, 0.7, 0, gold);
    for (const s of [-1, 1]) mk(BOX(0.12, 0.72, 0.9), '#ffd23f', g, s * 0.42, 0.35, 0, gold);
    mk(BOX(0.22, 0.24, 0.06), '#ffd23f', g, 0, 0.52, 0.44, gold);
    tf(mk(SPH(0.52, 12, 8), '#ffd23f', g, 0, 0.66, 0, { emissive: '#c99a00' }), 0, 0, 0, 1.15, 0.5, 0.72);
    for (let i = 0; i < 5; i++) tf(mk(CYL(0.11, 0.11, 0.04, 10), '#ffe066', g, -0.35 + i * 0.18, 0.84 + (i % 2) * 0.05, -0.1 + (i % 3) * 0.1, { emissive: '#c99a00' }), 0.5 * (i - 2), 0, 0.3);
    // the lid, thrown open (a half round hinged at the back)
    const lid = grp(g, 0, 0.74, -0.43);
    tf(mk(new THREE.CylinderGeometry(0.43, 0.43, 1.3, 12, 1, false, 0, Math.PI), '#6b3d1f', lid, 0, 0, 0.43), 0, 0, Math.PI / 2);
    for (const s of [-1, 1]) tf(mk(new THREE.TorusGeometry(0.44, 0.04, 4, 12, Math.PI), '#ffd23f', lid, s * 0.42, 0, 0.43, gold), 0, Math.PI / 2, 0);
    lid.rotation.x = -1.9;
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), glowMat('#ffd23f', 0.18));
    glow.position.y = 0.8; g.add(glow);
    g.userData.glow = glow;
    g.traverse((c) => { if (c.isMesh) c.castShadow = false; });
    return g;
  },
  begin(r, f) {
    r.scared = new Set();
    for (const gh of f.ghosts) { gh.t = -1; gh.m.visible = false; }
    Sound.play('ghost');
    UI.bigTitle('FIND THE TREASURE!', `It's in the middle of the maze. Gold: ${clock(f.medals[2])}`, '#b9a4ff', 2.4);
  },
  tick(r, f, dt) {
    const p = G.player.pos, R = f.R;
    const inside = p.x > R.x0 && p.x < R.x1 && p.z > R.z0 && p.z < R.z1;
    if (inside && p.y > f.top + 0.2) { Fun.fail('No going over the hedges! Walk it like everyone else.'); return; }
    if (Math.hypot(p.x - f.goal.x, p.z - f.goal.z) < 1.6) {
      FX.burst(new V3(f.goal.x, f.goal.y + 1, f.goal.z), '#ffd23f', 24, 7);
      Fun.finish(r.t);
      return;
    }
    if (r.t > f.limit) { Fun.fail('The hedge wins this time. (The treasure is in the MIDDLE.)'); return; }
    // BOO
    for (const gh of f.ghosts) {
      if (gh.t < 0 && !r.scared.has(gh) && Math.hypot(p.x - gh.x, p.z - gh.z) < 2.4) {
        r.scared.add(gh); gh.t = 0; gh.m.visible = true;
        gh.m.position.set(gh.x, f.goal.y + 0.3, gh.z);
        gh.m.lookAt(p.x, f.goal.y + 0.3, p.z);
        Sound.play('boo');
        G.shake = Math.max(G.shake, 0.35);
        FX.text(new V3(gh.x, f.goal.y + 2.6, gh.z), 'BOO!', '#e8ddff', 64);
      }
    }
    UI.fun('HEDGE OF NO RETURN', clock(r.t), 'Find the treasure in the middle', 1 - r.t / f.limit, f.limit - r.t < 15);
  },
  idle(f, dt, r) {
    f.chest.userData.glow.material.opacity = 0.12 + 0.08 * Math.sin(G.time * 3);
    for (const gh of f.ghosts) {
      if (gh.t < 0) continue;
      gh.t += dt;
      const k = gh.t;
      gh.m.scale.setScalar(k < 0.2 ? k / 0.2 * 1.3 : Math.max(0, 1.3 - (k - 0.2) * 0.5));
      gh.m.position.y += dt * (k < 0.2 ? 8 : 1.5);
      if (k > 2.6) { gh.t = -1; gh.m.visible = false; }
    }
  },
  end(r, f) {},
};

const FUN_DEFS = { gloop: RING_RUN, frost: GALLERY, spook: MAZE };
