'use strict';
/* =========================================================
   Planet hazards: what mini bosses (and some critters) throw
   at you out on a planet. Like in the boss fights, every one
   is marked before it can hurt you: shots glow and leave
   trails (and anything lobbed or dropped from the sky marks
   where it'll land), circles on the ground fill up and then
   go off, shockwaves roll out across the ground (jump them),
   arrows on the ground show where something is about to
   charge, and puddles sit there slowing you down. A planet
   isn't flat like a boss arena, so every mark is laid over
   the bumps in the ground.
   Everybody plays the same hazards from the same message and
   checks hits on themselves.
   ========================================================= */
const HZ_COL = Object.assign({}, ZONE_COL, { ecto: '#7dff8a', zap: '#7fd8ff' });
// the ground (or the goo, or the clouds) at x, z
const hzFloor = (w, x, z) => Math.max(w.gh(x, z), WATER_Y);

const Hazards = {
  shots: [], slams: [], rings: [], lanes: [], zones: [],
  glow: null, planet: -1, t: 0, hurtDirs: [], shown: false,

  any() { return this.shots.length + this.slams.length + this.rings.length + this.lanes.length + this.zones.length > 0; },
  // can things hurt me right now? (not while critters are still leaving you be, and not in a shop)
  canHurt() { const p = G.player; return G.mode === 'planet' && !p.dead && !p.down && p.safeT <= 0 && !G.panel; },
  // it got me. o.sl: slows me down for that long · o.kn: knocks me up in the air. false: I was still shaking off the last hit
  hurt(d, who, from, o = {}) {
    if (!this.canHurt()) return false;
    const p = G.player, hp = p.hp;
    p.hurtPlanet(d, from ? from.x : p.pos.x, from ? from.z : p.pos.z, who || 'Something');
    if (p.hp >= hp) return false;
    if (from) this.hurtDirs.push({ x: from.x, z: from.z, t: 0 });
    if (o.sl && !p.dead) p.slowT = Math.max(p.slowT || 0, o.sl);
    if (o.kn && !p.dead) { p.vel.y = Math.max(p.vel.y, o.kn); p.onGround = false; }
    return true;
  },
  glowFx() {
    if (!this.glow) { this.glow = new GlowPoints(1200); G.scene.add(this.glow.pts); }
    return this.glow;
  },

  // a hazard from a message (who: whose it is, for "knocked out by ...")
  add(a, who) {
    if (this.planet !== G.planet) { this.clear(); this.planet = G.planet; }
    switch (a.k) {
      case 'shot':
        for (const s of a.l) this.shots.push({ s, who, t: -(s.w || 0), pos: new V3(...s.p), vel: new V3(...s.v), mesh: null, tele: null });
        if (a.l.length && !a.q) Sound.play('throw');
        break;
      case 'slam': this.slams.push({ s: a, who, t: 0, g: null, done: false }); break;
      case 'ring': this.rings.push({ s: a, who, t: -(a.w || 0), g: null, hit: false }); break;
      case 'lane': this.lanes.push({ s: a, t: 0, g: null }); break;
      case 'zone': this.zones.push({ s: a, who, t: 0, g: null, tick: 0, puffT: 0 }); break;
    }
  },
  clear() {
    for (const h of [...this.shots, ...this.slams, ...this.rings, ...this.lanes, ...this.zones]) this.drop(h);
    this.shots = []; this.slams = []; this.rings = []; this.lanes = []; this.zones = [];
    this.hurtDirs = [];
    if (this.shown && G.mode !== 'boss') UI.threatHud(null);
    this.shown = false;
  },
  drop(h) { for (const k of ['mesh', 'tele', 'g']) if (h[k]) { dropObj(h[k]); h[k] = null; } },

  update(dt) {
    if (this.planet !== G.planet) { this.clear(); this.planet = G.planet; }
    const w = G.worlds[G.planet];
    if (!w) return;
    this.t += dt;
    const on = G.mode === 'planet';
    if (on && this.any()) TELE.tick(dt);
    this.updShots(dt, w);
    this.updSlams(dt, w);
    this.updRings(dt, w);
    this.updLanes(dt);
    this.updZones(dt, w);
    if (this.glow) { this.glow.pts.visible = on; if (on) this.glow.update(dt, G.camera); }
    this.threats(dt);
  },

  /* ---------- shots: thrown, lobbed, dropped from the sky, or rolled along the ground ----------
     s: p/v where it starts and how fast, k: what it is (see projMesh), d: damage, r: how big, g: gravity,
     w: wait this long first, tl: mark where it'll land, sp: it splashes this far when it lands, z: it leaves
     a puddle (a zone) where it lands, sl: getting hit slows you down, rl: it rolls along the ground, gl: it
     skims along this high over the ground, life */
  updShots(dt, w) {
    const me = G.player, g = this.glowFx();
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const p = this.shots[i], s = p.s;
      p.t += dt;
      if (p.t < 0) continue;
      const col = shotColor(s.k);
      if (!p.mesh) {
        p.mesh = projMesh(s.k, s.r);
        p.mesh.position.copy(p.pos);
        w.dyn.add(p.mesh);
        g.puff(p.pos, col, s.r * 5, 0.22); // (a flash where it came from)
        p.trailT = 0;
        if (s.rl) { p.yaw = Math.atan2(p.vel.x, p.vel.z); p.roll = 0; }
        if (s.tl) {
          const L = this.landing(w, p.pos, p.vel, s.g || 0);
          if (L) { p.tele = this.marker(w, L.x, L.z, s.sp || s.r + 0.6, DANGER); p.teleT = L.t; p.teleC = [L.x, L.z]; }
        }
      }
      let dead = false;
      if (s.rl) { // (rolls along the ground, and stops at anything in the way)
        const nx = p.pos.x + p.vel.x * dt, nz = p.pos.z + p.vel.z * dt;
        if (!w.walkable(nx, nz, s.r * 0.6)) dead = true;
        p.pos.set(nx, hzFloor(w, nx, nz) + s.r * 0.75, nz);
        p.roll += (dt * Math.hypot(p.vel.x, p.vel.z)) / s.r;
        p.mesh.rotation.set(p.roll, p.yaw, 0, 'YXZ');
      } else if (s.gl) { // (skims along over the bumps)
        p.pos.x += p.vel.x * dt; p.pos.z += p.vel.z * dt;
        p.pos.y = U.damp(p.pos.y, hzFloor(w, p.pos.x, p.pos.z) + s.gl, 12, dt);
        p.mesh.rotation.y += dt * 7;
      } else {
        p.vel.y -= (s.g || 0) * dt;
        p.pos.addScaledVector(p.vel, dt);
        p.mesh.rotation.x += dt * 5; p.mesh.rotation.y += dt * 7;
      }
      p.mesh.position.copy(p.pos);
      // its glow, and a trail so you can see where it came from
      g.head(p.pos, col, s.r * 3.2, 0.5);
      if ((p.trailT -= dt) <= 0) { p.trailT = 0.035; g.puff(p.pos, col, s.r * 2.3, 0.3); }
      if (p.tele) this.markerSet(p.tele, U.clamp(p.t / p.teleT, 0, 1));
      // did it get me? (only I can tell: it's my head)
      if (!dead && !p.hit && this.canHurt()) {
        const c = me.pos.clone(); c.y += 0.9;
        if (c.distanceTo(p.pos) < s.r + 0.45) {
          p.hit = true;
          if (this.hurt(s.d, p.who, p.pos.clone().addScaledVector(p.vel, -0.3), { sl: s.sl }) && s.sl) UI.toast('Slowed down!', 'bad', 1);
          if (!s.rl) dead = true;
        }
      }
      const fl = hzFloor(w, p.pos.x, p.pos.z);
      if (!dead && !s.rl && !s.gl && p.pos.y <= fl) { // it landed
        dead = true;
        p.pos.y = fl + 0.05;
        FX.burst(p.pos, SHOT_COL[s.k] || '#ffffff', s.sp ? 9 : 5, s.sp ? 5 : 3);
        g.puff(p.pos, col, (s.sp || s.r) * 2.4, 0.3);
        if (s.sp) {
          FX.ring(p.pos, SHOT_COL[s.k] || '#ffffff', s.sp);
          if (!p.hit && this.canHurt() && Math.hypot(me.pos.x - p.pos.x, me.pos.z - p.pos.z) < s.sp && me.pos.y < fl + 1.6) this.hurt(s.d, p.who, p.pos, { sl: s.sl });
        }
        if (s.z) this.add(Object.assign({ k: 'zone', c: [U.r2(p.pos.x), U.r2(p.pos.z)], w: 0 }, s.z), p.who);
        if (s.z || s.k === 'goo' || s.k === 'ecto') Sound.play('splat');
      } else if (p.t > (s.life || 6) || Math.hypot(p.pos.x, p.pos.z) > PLANET_R + 40 || p.pos.y < fl - 3) dead = true;
      if (dead) {
        if (s.rl) FX.burst(p.pos, SHOT_COL[s.k] || '#ffffff', 6, 3);
        this.drop(p);
        this.shots.splice(i, 1);
      }
    }
  },
  // where something thrown from p at v (falling at g) comes down, and when
  landing(w, p, v, g) {
    const q = p.clone(), u = v.clone(), st = 1 / 30;
    for (let t = st; t < 6; t += st) {
      u.y -= g * st;
      q.addScaledVector(u, st);
      if (q.y <= hzFloor(w, q.x, q.z)) return { x: q.x, z: q.z, t };
    }
    return null;
  },

  /* ---------- marked circles: they fill up, then go off (c, r, w: how long it's marked, d, kn, sl, lt: lightning) ---------- */
  updSlams(dt, w) {
    const me = G.player;
    for (let i = this.slams.length - 1; i >= 0; i--) {
      const sl = this.slams[i], s = sl.s;
      sl.t += dt;
      if (!sl.g) sl.g = this.marker(w, s.c[0], s.c[1], s.r, s.col || DANGER);
      this.markerSet(sl.g, U.clamp(sl.t / s.w, 0, 1));
      if (!sl.done && sl.t >= s.w) {
        sl.done = true;
        const fy = hzFloor(w, s.c[0], s.c[1]), at = new V3(s.c[0], fy + 0.1, s.c[1]);
        FX.ring(at, '#ffffff', s.r);
        FX.burst(at.clone().setY(fy + 0.5), s.fx || '#ffb13d', 10, 6);
        this.glowFx().puff(at.clone().setY(fy + 0.4), shotColor(s.lt ? 'bolt' : s.fk || 'meteor'), s.r * 2.2, 0.35);
        if (s.lt) { Shots.lightning([new V3(s.c[0] + U.rand(-2, 2), fy + 24, s.c[1] + U.rand(-2, 2)), at], '#fff36b'); Sound.play('zap'); }
        else Sound.play(s.r > 2.6 ? 'boom' : 'stomp');
        G.shake = Math.max(G.shake, (s.r > 2.6 ? 0.6 : 0.3) * this.near(at));
        if (s.d && this.canHurt() && Math.hypot(me.pos.x - s.c[0], me.pos.z - s.c[1]) < s.r + 0.25 && me.pos.y < hzFloor(w, me.pos.x, me.pos.z) + 2.2) {
          if (this.hurt(s.d, sl.who, new V3(s.c[0], fy, s.c[1]), { sl: s.sl, kn: s.kn }) && s.sl) UI.toast(s.gr ? 'GRABBED! You\'re slowed down.' : 'Slowed down!', 'bad', 1.2);
        }
      }
      if (sl.t > s.w + 0.25) { this.drop(sl); this.slams.splice(i, 1); }
    }
  },
  // how much a far-off bang shakes the screen
  near(p) { const d = Math.hypot(p.x - G.player.pos.x, p.z - G.player.pos.z); return U.clamp(1.4 - d / 20, 0, 1); },

  /* ---------- shockwaves: a glowing wall rolling out across the ground. Jump it! ----------
     c, s: how fast it spreads, m: how far it goes, h: how high it is, d, w: wait first */
  updRings(dt, w) {
    const me = G.player, g = this.glowFx();
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i], s = r.s;
      r.t += dt;
      if (!r.g) r.g = this.ringFx(w);
      const u = r.g.userData;
      if (r.t < 0) { // about to go: its middle pulses
        u.wall.visible = false;
        const k = Math.abs(Math.sin(this.t * 10));
        this.loop(w, u.band.geometry, s.c[0], s.c[1], 0.3, 1.1 + 0.35 * k);
        u.band.material.opacity = 0.45 + 0.35 * k;
        continue;
      }
      if (!r.boomed) {
        r.boomed = true;
        u.wall.visible = true;
        FX.ring(new V3(s.c[0], hzFloor(w, s.c[0], s.c[1]) + 0.1, s.c[1]), '#ffffff', 3);
        Sound.play('boom');
      }
      const rad = Math.max(0.1, r.t * s.s);
      this.loop(w, u.wall.geometry, s.c[0], s.c[1], 0, rad, s.h);
      this.loop(w, u.band.geometry, s.c[0], s.c[1], Math.max(0, rad - 0.75), rad + 0.25);
      const fade = U.clamp((s.m - rad) / 5, 0, 1), pulse = 0.88 + 0.12 * Math.sin(this.t * 26);
      u.wall.material.opacity = 0.95 * fade * pulse;
      u.band.material.opacity = 0.62 * fade;
      for (let k = 0; k < 3; k++) {
        const a = Math.random() * TAU, x = s.c[0] + Math.cos(a) * rad, z = s.c[1] + Math.sin(a) * rad;
        g.puff(new V3(x, hzFloor(w, x, z) + Math.random() * s.h, z), shotColor(k % 2 ? 'meteor' : 'lemon'), 1.1, 0.3);
      }
      if (!r.hit && this.canHurt()) {
        const d = Math.hypot(me.pos.x - s.c[0], me.pos.z - s.c[1]);
        if (Math.abs(d - rad) < 0.6 && me.pos.y < hzFloor(w, me.pos.x, me.pos.z) + s.h) { r.hit = true; this.hurt(s.d, r.who, new V3(s.c[0], 0, s.c[1])); }
      }
      if (rad > s.m) { this.drop(r); this.rings.splice(i, 1); }
    }
  },
  ringFx(w) {
    const g = new THREE.Group();
    const wall = new THREE.Mesh(this.loopGeo(72, 12), new THREE.MeshBasicMaterial({ color: '#ffffff', map: TELE.tex('hot'), transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    const band = new THREE.Mesh(this.loopGeo(72), teleMat(DANGER, 0.6));
    for (const m of [wall, band]) { m.frustumCulled = false; m.renderOrder = 4; }
    g.add(wall, band);
    g.userData = { wall, band };
    w.dyn.add(g);
    return g;
  },
  // a loop of quads (moved every frame with loop()); reps: how many times the texture goes round it
  loopGeo(seg, reps) {
    const geo = new THREE.BufferGeometry(), idx = [], uv = [];
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((seg + 1) * 6), 3));
    for (let i = 0; i <= seg; i++) uv.push((i / seg) * (reps || 1), 0, (i / seg) * (reps || 1), 1);
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx);
    geo.userData.seg = seg;
    return geo;
  },
  // lay a loop around (cx, cz) over the ground: flat from radius r0 out to r1, or (h) a wall h high at r1
  loop(w, geo, cx, cz, r0, r1, h) {
    const p = geo.attributes.position.array, seg = geo.userData.seg;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * TAU, c = Math.cos(a), sn = Math.sin(a), j = i * 6;
      if (h) {
        const x = cx + c * r1, z = cz + sn * r1, y = hzFloor(w, x, z) + 0.02;
        p[j] = x; p[j + 1] = y; p[j + 2] = z; p[j + 3] = x; p[j + 4] = y + h; p[j + 5] = z;
      } else {
        const x0 = cx + c * r0, z0 = cz + sn * r0, x1 = cx + c * r1, z1 = cz + sn * r1;
        p[j] = x0; p[j + 1] = hzFloor(w, x0, z0) + 0.07; p[j + 2] = z0; p[j + 3] = x1; p[j + 4] = hzFloor(w, x1, z1) + 0.07; p[j + 5] = z1;
      }
    }
    geo.attributes.position.needsUpdate = true;
  },

  /* ---------- arrows on the ground: something is about to come this way (a, b, hw: half as wide, w, dur) ---------- */
  updLanes(dt) {
    for (let i = this.lanes.length - 1; i >= 0; i--) {
      const ln = this.lanes[i], s = ln.s;
      ln.t += dt;
      if (!ln.g) ln.g = this.laneFx(s);
      const k = U.clamp(ln.t / s.w, 0, 1), after = ln.t - s.w, dur = s.dur || 0.6;
      ln.g.material.opacity = after < 0 ? 0.3 + 0.3 * Math.abs(Math.sin(ln.t * (8 + k * 14))) : 0.6 * U.clamp(1 - after / dur, 0, 1);
      if (after > dur) { this.drop(ln); this.lanes.splice(i, 1); }
    }
  },
  laneFx(s) {
    const w = G.worlds[G.planet], ax = s.a[0], az = s.a[1];
    const len = Math.max(0.5, Math.hypot(s.b[0] - ax, s.b[1] - az)), ang = Math.atan2(s.b[0] - ax, s.b[1] - az);
    const geo = new THREE.PlaneGeometry(s.hw * 2, len, 1, Math.ceil(len));
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, len / 2);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (len / (s.hw * 2)));
    geo.rotateY(ang);
    const m = new THREE.Mesh(this.drape(w, geo, ax, az, 0.08), teleMat(DANGER, 0.5, TELE.tex('chev')));
    m.renderOrder = 3;
    w.dyn.add(m);
    return m;
  },

  /* ---------- puddles: slow you down and hurt a bit while you stand in them (c, r, w, dur, d, kind, sl, tk) ---------- */
  updZones(dt, w) {
    const me = G.player;
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i], s = z.s, col = HZ_COL[s.kind] || DANGER;
      z.t += dt;
      if (!z.g) z.g = this.marker(w, s.c[0], s.c[1], s.r, col);
      const on = z.t >= (s.w || 0), left = (s.w || 0) + s.dur - z.t;
      if (!on) this.markerSet(z.g, U.clamp(z.t / s.w, 0, 1));
      else {
        const u = z.g.userData, fade = U.clamp(left / 0.5, 0, 1);
        if (!z.full) { z.full = true; this.markerSet(z.g, 1); }
        u.prog.material.opacity = (0.36 + Math.sin(z.t * 6) * 0.06) * fade;
        u.fill.material.opacity = 0.2 * fade; u.ring.material.opacity = 0.85 * fade;
        z.puffT -= dt;
        if (z.puffT <= 0 && G.mode === 'planet') {
          z.puffT = 0.14;
          const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * s.r, x = s.c[0] + Math.cos(a) * r, zz = s.c[1] + Math.sin(a) * r;
          this.glowFx().puff(new V3(x, hzFloor(w, x, zz) + U.rand(0.2, 1.2), zz), z.c || (z.c = new THREE.Color(col)), U.rand(0.8, 1.6), 0.8);
        }
        // standing in it: slowed down, and it hurts every so often
        if (G.mode === 'planet' && !me.dead && Math.hypot(me.pos.x - s.c[0], me.pos.z - s.c[1]) < s.r && me.pos.y < hzFloor(w, me.pos.x, me.pos.z) + 1.4) {
          if (s.sl) me.slowT = Math.max(me.slowT || 0, 0.25);
          z.tick -= dt;
          if (z.tick <= 0 && s.d && this.canHurt()) { z.tick = s.tk || 0.7; if (this.hurt(s.d, z.who, null)) Sound.play('sizzle'); }
        } else z.tick = Math.min(z.tick, 0.15);
      }
      if (left <= 0) { this.drop(z); this.zones.splice(i, 1); }
    }
  },

  /* ---------- marks on the ground ---------- */
  // lay a flat shape (built around (0, 0), in x and z) over the ground at (cx, cz), lifted a little
  drape(w, geo, cx, cz, lift) {
    const p = geo.attributes.position;
    geo.userData.xz = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      geo.userData.xz[i * 2] = p.getX(i); geo.userData.xz[i * 2 + 1] = p.getZ(i);
      p.setY(i, hzFloor(w, cx + p.getX(i), cz + p.getZ(i)) + lift);
    }
    Object.assign(geo.userData, { cx, cz, lift });
    geo.translate(cx, 0, cz);
    geo.computeBoundingSphere();
    return geo;
  },
  // the same shape k times as big (still on the ground)
  redrape(w, geo, k) {
    const p = geo.attributes.position, u = geo.userData;
    for (let i = 0; i < p.count; i++) {
      const x = u.cx + u.xz[i * 2] * k, z = u.cz + u.xz[i * 2 + 1] * k;
      p.setXYZ(i, x, hzFloor(w, x, z) + u.lift, z);
    }
    p.needsUpdate = true;
  },
  // a circle of radius r on the ground: faint, with a bright edge, filling up from the middle (markerSet)
  marker(w, x, z, r, color) {
    const g = new THREE.Group();
    const disc = () => new THREE.RingGeometry(0, 1, 40, 4).rotateX(-Math.PI / 2).scale(r, 1, r);
    const fill = new THREE.Mesh(this.drape(w, disc(), x, z, 0.06), teleMat(color, 0.14));
    const prog = new THREE.Mesh(this.drape(w, disc(), x, z, 0.075), teleMat(color, 0.4));
    prog.frustumCulled = false;
    const th = U.clamp(r * 0.08, 0.12, 0.26);
    const ring = new THREE.Mesh(this.drape(w, new THREE.RingGeometry(r - th, r, 56, 1).rotateX(-Math.PI / 2), x, z, 0.09), teleMat(color, 0.9));
    for (const m of [fill, prog, ring]) m.renderOrder = 3;
    g.add(fill, prog, ring);
    g.userData = { fill, prog, ring, w, k: -1 };
    this.redrape(w, prog.geometry, 0.01);
    w.dyn.add(g);
    return g;
  },
  markerSet(g, k) {
    const u = g.userData, kk = Math.max(0.01, Math.round(k * 40) / 40);
    if (kk !== u.k) { u.k = kk; this.redrape(u.w, u.prog.geometry, kk); }
    u.ring.material.opacity = 0.5 + 0.45 * Math.abs(Math.sin(this.t * (5 + k * 16)));
    u.fill.material.opacity = 0.1 + 0.12 * k;
  },

  /* ---------- around the crosshair: shots about to hit you from where you aren't looking, the mini
     boss when it's off screen, where hits came from, and what to do (like in boss fights) ---------- */
  threats(dt) {
    const me = G.player;
    for (let i = this.hurtDirs.length - 1; i >= 0; i--) { const h = this.hurtDirs[i]; h.t += dt; if (h.t > 1.1) this.hurtDirs.splice(i, 1); }
    const mb = MiniBoss.b && MiniBoss.near ? MiniBoss.b : null;
    if (G.mode !== 'planet' || me.dead || (!this.any() && !mb && !Critters.spits.length && !this.hurtDirs.length)) {
      if (this.shown && G.mode !== 'boss') UI.threatHud(null);
      this.shown = false;
      return;
    }
    const w = G.worlds[G.planet];
    const yaw = me.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const rel = (x, z) => { const dx = x - me.pos.x, dz = z - me.pos.z; return Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz); };
    const arrows = [];
    const incoming = (pos, vel, col) => {
      const px = pos.x - me.pos.x, py = pos.y - (me.pos.y + 1), pz = pos.z - me.pos.z;
      const vv = vel.x * vel.x + vel.y * vel.y + vel.z * vel.z;
      if (vv < 1) return;
      const tca = -(px * vel.x + py * vel.y + pz * vel.z) / vv;
      if (tca < 0 || tca > 1.3) return;
      const cx = px + vel.x * tca, cy = py + vel.y * tca, cz = pz + vel.z * tca;
      if (cx * cx + cy * cy + cz * cz > 10) return;
      const a = rel(pos.x, pos.z);
      if (Math.abs(a) < 0.5 && Math.abs(py) < 6) return; // (right in front of me: I can see it)
      arrows.push({ a, k: 1 - tca / 1.3, c: col });
    };
    for (const p of this.shots) if (p.mesh) incoming(p.pos, p.vel, SHOT_COL[p.s.k] || '#ff5a5a');
    for (const s of Critters.spits) if (s.mesh) incoming(s.mesh.position, s.to.clone().sub(s.from).divideScalar(s.T), s.sp.c);
    let bossA = null;
    if (mb && mb.m) {
      G.camera.updateMatrixWorld();
      const v = MiniBoss.center(mb, w).project(G.camera);
      if (v.z > 1 || Math.abs(v.x) > 0.92 || Math.abs(v.y) > 0.92) bossA = rel(mb.rx, mb.rz);
    }
    // what to do right now
    let cue = null;
    const inCircle = (c, r) => Math.hypot(me.pos.x - c[0], me.pos.z - c[1]) < r + 0.2;
    for (const sl of this.slams) if (!sl.done && sl.s.w - sl.t < 1.0 && inCircle(sl.s.c, sl.s.r)) cue = 'MOVE!';
    for (const p of this.shots) if (p.tele && p.teleT - p.t < 0.8 && inCircle(p.teleC, p.s.sp || p.s.r + 0.6)) cue = 'MOVE!';
    for (const z of this.zones) if (inCircle(z.s.c, z.s.r) && z.s.d) cue = 'MOVE!';
    for (const ln of this.lanes) {
      if (ln.t >= ln.s.w) continue;
      const s = ln.s, ax = s.a[0], az = s.a[1], vx = s.b[0] - ax, vz = s.b[1] - az, L2 = vx * vx + vz * vz || 1;
      const kk = U.clamp(((me.pos.x - ax) * vx + (me.pos.z - az) * vz) / L2, 0, 1);
      if (Math.hypot(me.pos.x - (ax + vx * kk), me.pos.z - (az + vz * kk)) < s.hw + 0.4) cue = 'MOVE!';
    }
    if (!cue && me.onGround) {
      for (const r of this.rings) {
        if (r.t < 0 || r.hit) continue;
        const gap = Math.hypot(me.pos.x - r.s.c[0], me.pos.z - r.s.c[1]) - r.t * r.s.s;
        if (gap > -0.3 && gap / r.s.s < 0.55) cue = 'JUMP!';
      }
    }
    UI.threatHud({
      arrows, bossA, bossCol: mb ? mb.def.color : '#ff5a5a', cue,
      hits: this.hurtDirs.map((h) => ({ a: rel(h.x, h.z), k: 1 - h.t / 1.1 })),
    });
    this.shown = true;
  },
};
