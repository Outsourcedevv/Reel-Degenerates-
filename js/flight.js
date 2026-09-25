'use strict';
/* =========================================================
   Flying the S.S. Late Delivery between planets.
   The captain (host) steers with the mouse; the crew rides
   along and sees the same ship. Dodge asteroids, fly through
   rings for turbo, grab space coins, reach the planet.
   ========================================================= */
const FLY = { dist: 1500, cruise: 60, max: 115, slow: 30, turbo: 180, R: 230, autopilot: 60 };
const SPACE_ATMO = {
  sky: ['#02010a', '#171040'], fog: ['#0a0620', 900, 4200], stars: 1, bodies: [],
  sun: ['#fff4e0', 1.1], hemi: ['#b9c8ff', '#241a40', 0.75], liquid: { color: '#000000', op: 0 },
};

const Flight = {
  group: null, on: false,

  info() { return { to: this.to, seed: this.seed, from: this.from }; },
  // path through the asteroid field wiggles a bit
  center(z) { return new V3(Math.sin(z * 0.004) * 60, Math.cos(z * 0.003) * 30 - 30, z); },

  start(to, seed, from) {
    this.finish();
    Object.assign(this, { on: true, to, seed, from, t: 0, speed: FLY.cruise, yaw: 0, pitch: 0, bank: 0, turbo: 1, sendT: 0, hitCd: 0, auto: false, coins: 0 });
    this.pos = new V3(0, 0, 0);
    this.tpos = this.pos.clone(); this.tyaw = 0; this.tpitch = 0;
    const g = (this.group = new THREE.Group());
    G.scene.add(g);
    const rng = U.seeded(seed);
    // the ship, pivoting around its middle
    this.ship = grp(g);
    const model = buildShip();
    model.position.set(0, -2.7, 0);
    this.ship.add(model);
    this.flames = [-1, 1].map((s) => {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3, 7), basicMat('#ffb23e'));
      f.rotation.x = -Math.PI / 2; f.position.set(s * 1.0, -0.5, -6.2);
      this.ship.add(f);
      return f;
    });
    // where we're going (and where we came from)
    const dest = PLANETS[to], orig = PLANETS[from] || PLANETS[0];
    this.target = this.center(FLY.dist + FLY.R).setY(0);
    const planet = (cfg, r, at) => {
      const m = new THREE.Mesh(flat(new THREE.IcosahedronGeometry(r, 3)), new THREE.MeshToonMaterial({ color: cfg.ground[0], gradientMap: TOON_GRAD, fog: false }));
      m.position.copy(at);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(r * 1.07, 24, 16), new THREE.MeshBasicMaterial({ color: cfg.sky[1], transparent: true, opacity: 0.35, side: THREE.BackSide, fog: false, depthWrite: false }));
      m.add(glow);
      g.add(m);
      return m;
    };
    this.planet = planet(dest, FLY.R, this.target);
    planet(orig, 180, new V3(20, -120, -330));
    // asteroid field
    const geos = [0, 1, 2].map(() => flat(new THREE.DodecahedronGeometry(1, 0)));
    const mats = ['#6d6470', '#8a7b6a', '#524a5e'].map((c) => M(c));
    this.rocks = [];
    for (let i = 0; i < 150; i++) {
      const z = 140 + rng() * (FLY.dist - 220), c = this.center(z);
      const a = rng() * Math.PI * 2, d = 6 + rng() * 85;
      const r = 2.5 + rng() * rng() * 13;
      const m = new THREE.Mesh(geos[i % 3], mats[i % 3]);
      m.position.set(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, z);
      m.scale.set(r, r * (0.7 + rng() * 0.5), r * (0.8 + rng() * 0.4));
      m.rotation.set(rng() * 6, rng() * 6, 0);
      g.add(m);
      this.rocks.push({ m, r, spin: (rng() - 0.5) * 0.8 });
    }
    // turbo rings with a trail of coins leading into each one
    this.rings = []; this.coinList = [];
    const coinGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.25, 12);
    for (let z = 170, i = 0; z < FLY.dist - 80; z += 125, i++) {
      const c = this.center(z).add(new V3((rng() - 0.5) * 30, (rng() - 0.5) * 20, 0));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(10, 0.9, 6, 28), new THREE.MeshToonMaterial({ color: '#3df0ff', emissive: '#0aa0c0', gradientMap: TOON_GRAD }));
      ring.position.copy(c);
      g.add(ring);
      this.rings.push({ m: ring, p: c, taken: false, i });
      for (let k = 1; k <= 4; k++) {
        const cm = new THREE.Mesh(coinGeo, M('#ffd23f', { emissive: '#aa7700' }));
        cm.position.set(c.x, c.y, z - k * 9);
        cm.rotation.x = Math.PI / 2;
        g.add(cm);
        this.coinList.push({ m: cm, taken: false });
      }
    }
    // space looks like space
    setAtmosphere(SPACE_ATMO);
    G.liquid.mesh.visible = false;
    G.camera.far = 5000; G.camera.updateProjectionMatrix();
    G.player.vm.visible = false;
    UI.el.hud.classList.add('flying');
    UI.show('flyhud', true);
    U.$('flyhud').querySelector('.dest').textContent = `${dest.icon} ${dest.name}`;
    Sound.play('warp');
    Sound.playMusic('space');
    UI.bigTitle('🚀 LIFTOFF', Net.isHost ? 'Mouse: steer · W/S: speed · Shift: turbo · fly through the rings!' : 'The captain is driving. Please keep your arms inside the ship.', '#7dffea', 3.2);
  },

  finish() {
    if (!this.group) return;
    G.scene.remove(this.group);
    disposeObj(this.group);
    this.group = null;
    this.on = false;
    G.liquid.mesh.visible = true;
    G.camera.far = 1500; G.camera.updateProjectionMatrix();
    UI.el.hud.classList.remove('flying');
    UI.show('flyhud', false);
    U.$('flyarrow').classList.add('hidden');
  },

  fwd(yaw, pitch) { return new V3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)); },

  update(dt) {
    if (!this.on) return;
    this.t += dt;
    if (Net.isHost) { this.pilot(dt); if (!this.on) return; } // (we may have just landed)
    else {
      // crew: glide toward where the captain says the ship is
      this.pos.lerp(this.tpos, 1 - Math.exp(-10 * dt));
      this.yaw += U.angDiff(this.yaw, this.tyaw) * Math.min(1, dt * 10);
      this.pitch = U.damp(this.pitch, this.tpitch, 10, dt);
    }
    // ship pose + flames
    this.ship.position.copy(this.pos);
    this.ship.rotation.set(-this.pitch, this.yaw, this.bank, 'YXZ');
    const thr = U.clamp((this.speed - FLY.slow) / (FLY.turbo - FLY.slow), 0.15, 1);
    for (const f of this.flames) f.scale.set(1, 0.6 + thr * 1.6 + Math.random() * 0.3, 1);
    for (const r of this.rocks) r.m.rotation.y += r.spin * dt;
    for (const c of this.coinList) if (!c.taken) c.m.rotation.z += dt * 3;
    for (const r of this.rings) if (!r.taken) r.m.rotation.z += dt * 0.8;
    this.camera(dt);
    this.hud();
  },

  // the captain's controls (and the host decides everything that happens)
  pilot(dt) {
    const can = G.locked && !G.panel && !G.chatting;
    const k = 0.0024 * G.settings.sens;
    let yawIn = 0;
    if (can) {
      yawIn = -Input.dx * k;
      this.yaw += yawIn;
      this.pitch = U.clamp(this.pitch - Input.dy * k, -1.1, 1.1);
    }
    const toT = this.target.clone().sub(this.pos);
    // Dave takes the wheel if the trip is taking forever
    // (or if we've been pointed away from the planet for a while)
    this.away = this.fwd(this.yaw, this.pitch).dot(toT.clone().normalize()) < 0.3 ? (this.away || 0) + dt : 0;
    if (!this.auto && (this.t > FLY.autopilot || this.away > 12)) { this.auto = true; UI.toast('Autopilot ON. Dave took the wheel. "I\'ll be expensing this."', 'purple', 4); }
    if (this.auto) {
      const want = Math.atan2(toT.x, toT.z), wp = Math.atan2(toT.y, Math.hypot(toT.x, toT.z));
      this.yaw += U.angDiff(this.yaw, want) * Math.min(1, dt * 1.5);
      this.pitch = U.damp(this.pitch, wp, 1.5, dt);
    }
    this.bank = U.damp(this.bank, U.clamp(-yawIn * 18, -0.7, 0.7), 5, dt);
    // throttle and turbo
    let want = FLY.cruise;
    if (can && Input.keys.KeyW) want = FLY.max;
    if (can && Input.keys.KeyS) want = FLY.slow;
    const turbo = can && (Input.keys.ShiftLeft || Input.keys.ShiftRight) && this.turbo > 0.02;
    if (turbo) { want = FLY.turbo; this.turbo = Math.max(0, this.turbo - dt * 0.35); }
    else this.turbo = Math.min(1, this.turbo + dt * 0.06);
    this.speed = U.damp(this.speed, want, turbo ? 3 : 1.5, dt);
    const f = this.fwd(this.yaw, this.pitch);
    const prev = this.pos.clone();
    this.pos.addScaledVector(f, this.speed * dt);
    // bumping into rocks
    this.hitCd -= dt;
    for (const r of this.rocks) {
      const d = r.m.position.distanceTo(this.pos);
      if (d < r.r + 3 && this.hitCd <= 0) {
        this.hitCd = 0.8;
        this.speed *= 0.35;
        this.pos.add(this.pos.clone().sub(r.m.position).normalize().multiplyScalar(r.r + 3.5 - d));
        this.event({ k: 'bonk' });
      }
    }
    // rings and coins (touching counts, from the segment we just flew)
    for (const r of this.rings) {
      if (r.taken || Math.abs(this.pos.z - r.p.z) > Math.max(8, this.speed * dt * 2)) continue;
      if (Math.hypot(this.pos.x - r.p.x, this.pos.y - r.p.y) < 10) { this.turbo = Math.min(1, this.turbo + 0.5); this.speed = Math.max(this.speed, FLY.max); this.event({ k: 'ring', i: r.i }); }
    }
    this.coinList.forEach((c, i) => { if (!c.taken && U.segSphere(prev, this.pos, c.m.position, 4)) this.event({ k: 'coin', i }); });
    // made it!
    if (this.pos.distanceTo(this.target) < FLY.R + 25) { Game.arrive(this.to); return; }
    this.sendT -= dt;
    if (this.sendT <= 0 && Net.online) {
      this.sendT = 1 / 15;
      Net.toAll({ t: 'fly', p: [U.r2(this.pos.x), U.r2(this.pos.y), U.r2(this.pos.z)], y: U.r2(this.yaw), x: U.r2(this.pitch), s: Math.round(this.speed), b: U.r2(this.bank) });
    }
  },
  // host: something happened on the trip, tell the crew
  event(m) { m.t = 'fev'; Net.toAll(m); this.onEvent(m); },
  onEvent(m) {
    if (!this.on) return;
    if (m.k === 'bonk') {
      G.shake = Math.max(G.shake, 1);
      Sound.play('boom');
      FX.burst(this.pos.clone(), '#9a8f84', 12, 8);
      UI.toast(U.pick(LINES.flyHit), 'bad', 1.6);
    } else if (m.k === 'ring') {
      const r = this.rings.find((x) => x.i === m.i);
      if (!r || r.taken) return;
      r.taken = true; r.m.visible = false;
      FX.ring(r.p.clone(), '#3df0ff', 14);
      Sound.play('boing');
      UI.toast('TURBO RING! (Hold Shift)', 'good', 1.2);
    } else if (m.k === 'coin') {
      const c = this.coinList[m.i];
      if (!c || c.taken) return;
      c.taken = true; c.m.visible = false;
      this.coins++;
      addBucks(15, true);
      UI.pickup('+ 🪙 Space Coin ($15)', '#ffd23f');
      Sound.play('coin');
    }
  },
  onSync(m) {
    if (!this.on || Net.isHost) return;
    this.tpos.set(m.p[0], m.p[1], m.p[2]);
    this.tyaw = m.y; this.tpitch = m.x; this.speed = m.s; this.bank = m.b;
  },

  camera(dt) {
    const f = this.fwd(this.yaw, this.pitch);
    const want = this.pos.clone().addScaledVector(f, -17).add(new V3(0, 5.5, 0));
    const cam = G.camera;
    if (this.t < 0.1) cam.position.copy(want);
    cam.position.lerp(want, 1 - Math.exp(-6 * dt));
    G.shake = Math.max(0, G.shake - dt * 2.2);
    const sh = G.shake * G.shake;
    cam.lookAt(this.pos.clone().addScaledVector(f, 25).add(new V3((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, 0)));
  },

  hud() {
    const d = Math.max(0, this.pos.distanceTo(this.target) - FLY.R);
    const hud = U.$('flyhud');
    hud.querySelector('.dist').textContent = `${Math.round(d)} km to go · 🪙 ${this.coins}`;
    hud.querySelector('.fill').style.width = (this.turbo * 100).toFixed(0) + '%';
    UI.hint(Net.isHost ? 'Mouse: steer · W: faster · S: slower · Shift: turbo · fly through the rings!' : 'The captain is driving. Enjoy the asteroids.');
    // arrow toward the planet when it's off screen
    const a = U.$('flyarrow');
    const p = this.target.clone().project(G.camera);
    const onScreen = p.z < 1 && Math.abs(p.x) < 0.85 && Math.abs(p.y) < 0.85;
    a.classList.toggle('hidden', onScreen);
    if (!onScreen) {
      let x = p.x, y = p.y;
      if (p.z > 1) { x = -x; y = -y; }
      const ang = Math.atan2(-y, x), r = 0.8;
      const l = Math.max(Math.abs(x), Math.abs(y)) || 1;
      a.style.left = (50 + (x / l) * r * 50).toFixed(1) + '%';
      a.style.top = (50 - (y / l) * r * 50).toFixed(1) + '%';
      a.style.transform = `translate(-50%,-50%) rotate(${ang}rad)`;
    }
  },
};
