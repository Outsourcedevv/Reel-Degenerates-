'use strict';
/* =========================================================
   The S.S. Late Delivery, flown by hand.
   Walk up to your parked ship and board it (E). Lift off the
   pad, climb out of the atmosphere into the solar system,
   fly to another planet (radar + M map), drop into its sky
   and set the ship down on its landing pad.
   The captain (host) flies; the crew rides along in sync.
   ========================================================= */
const FLY = {
  R: 240,              // planet radius out in space
  atmoTop: 150,        // climb this high to leave a planet
  enterAlt: 120,       // arriving at a planet you start this high up
  enterDist: 150,      // ...and this far from its landing pad
  zone: 175,           // how far from the pad you can wander in the sky
  padR: 11,            // the landing pad
  hardVS: 8,           // coming down faster than this is a crash
  space: { cruise: 70, max: 150, turbo: 240 },
  hover: { fwd: 42, up: 16, sink: 3.5 },
  autopilot: 110,
};
// where the planets sit in the solar system
const SYSTEM = [new V3(0, 0, 0), new V3(1500, 120, 900), new V3(3000, -80, 300), new V3(4300, 150, 1300), new V3(5600, 0, 500)];
const SEAT = new V3(0, 3.95, 2.35); // pilot's eyes, inside the glass bubble
const SPACE_ATMO = {
  sky: ['#02010a', '#171040'], fog: ['#0a0620', 3000, 13000], stars: 1, bodies: [],
  sun: ['#fff4e0', 1.1], hemi: ['#b9c8ff', '#241a40', 0.75], liquid: { color: '#000000', op: 0 },
};

const Flight = {
  on: false, ph: null, planet: 0, view: 'cockpit', wp: 1, mapOpen: false,

  /* ---------------- getting in and out ---------------- */
  // the captain walks up to the parked ship
  board() {
    if (!Net.isHost) { UI.toast('Only the captain (the host) can fly the ship. You\'ll be taken along.', '', 3); return; }
    if (G.mode !== 'planet' || Game.summoning) return;
    const m = { t: 'launch', from: G.planet, wp: this.defaultWaypoint() };
    Net.toAll(m);
    Game.launch(m);
  },
  defaultWaypoint() {
    for (let i = 0; i < PLANETS.length; i++) if (i !== G.planet && planetUnlocked(i) && !G.progress.includes(PLANETS[i].boss)) return i;
    return G.planet + 1 < PLANETS.length && planetUnlocked(G.planet + 1) ? G.planet + 1 : (G.planet + PLANETS.length - 1) % PLANETS.length;
  },
  // everyone: sit down in the cockpit, still parked on the pad
  start(from, wp) {
    this.finish();
    Object.assign(this, { on: true, t: 0, yaw: 0, pitch: 0, bank: 0, speed: 0, grounded: true, turbo: 1, sendT: 0, hitCd: 0, crashCd: 0, auto: false, wp: wp == null ? this.wp : wp, spaceT: 0, hint: 0 });
    this.pos = new V3(); this.vel = new V3();
    this.tpos = new V3(); this.tyaw = 0; this.tpitch = 0;
    this.group = new THREE.Group();
    G.scene.add(this.group);
    this.buildShip();
    this.enterAtmo(from, true);
    UI.el.hud.classList.add('flying');
    UI.show('flyhud', true);
    G.player.vm.visible = false;
    Sound.engine(true);
    Sound.playMusic('space');
    UI.bigTitle('FLIGHT CONTROLS', Net.isHost ? 'Space: lift off · Mouse: steer · W/S: thrust · C: descend · V: camera · M: map' : 'The captain is flying. Enjoy the ride.', '#bff6ff', 4);
  },
  finish() {
    Sound.engine(false);
    if (!this.group) return;
    this.leaveAtmo();
    G.scene.remove(this.group);
    disposeObj(this.group);
    this.group = null; this.space = null;
    this.on = false; this.ph = null; this.mapOpen = false;
    UI.el.hud.classList.remove('flying');
    UI.show('flyhud', false);
    U.$('flytgt').classList.add('hidden');
    if (this.mapOpen) UI.closePanel(true);
    G.liquid.mesh.visible = true;
    G.camera.far = 1500; G.camera.fov = 72; G.camera.updateProjectionMatrix();
  },

  /* ---------------- the ship: outside model + cockpit ---------------- */
  buildShip() {
    this.pivot = grp(this.group);
    this.hull = buildShip();
    this.pivot.add(this.hull);
    this.flames = [-1, 1].map((s) => {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3, 7), basicMat('#ffb23e'));
      f.rotation.x = -Math.PI / 2; f.position.set(s * 1.0, 2.2, -6.1);
      this.hull.add(f);
      return f;
    });
    // cockpit interior (only drawn in cockpit view)
    const ck = (this.cockpit = grp(this.pivot));
    const shell = '#171c26', panel = '#10141c', trim = '#2c3444', metal = '#5b6477';
    const glow = (col) => ({ emissive: col, emissiveIntensity: 1 });
    const TILT = 0.75; // instrument panel leans back toward the pilot
    const dash = grp(ck, 0, -0.08, 0.4);
    // dashboard body, glare hood over the instruments, and the sloped panel itself
    mk(BOX(2.8, 0.55, 0.9), shell, dash, 0, 2.92, 3.45);
    mk(BOX(2.7, 0.07, 0.42), shell, dash, 0, 3.62, 3.42);
    tf(mk(BOX(2.5, 0.62, 0.05), panel, dash, 0, 3.3, 3.2), TILT, Math.PI, 0);
    // a thin light strip along the hood and the panel edge
    mk(BOX(2.5, 0.015, 0.015), '#3df0ff', dash, 0, 3.585, 3.22, glow('#3df0ff'));
    mk(BOX(2.5, 0.015, 0.015), '#ffb020', dash, 0, 3.05, 2.99, glow('#ffb020'));
    // canopy frame
    for (const s of [-1, 1]) {
      tf(mk(BOX(0.09, 1.9, 0.09), trim, ck, s * 1.2, 4.2, 3.35), 0.35, 0, s * 0.28);
      mk(BOX(0.42, 0.55, 1.9), shell, ck, s * 1.36, 3.05, 2.35);
      mk(BOX(0.3, 0.02, 1.7), '#3df0ff', ck, s * 1.36, 3.33, 2.35, glow('#1d8fa0'));
    }
    mk(BOX(2.4, 0.09, 0.09), trim, ck, 0, 5.05, 3.0);
    mk(BOX(0.07, 0.07, 1.4), trim, ck, 0, 5.1, 2.5);
    // screens on the sloped panel: radar left, flight data right, warning lights in the middle
    const onPanel = (m, x) => { m.position.set(x, 3.3, 3.2); m.rotation.set(TILT, Math.PI, 0); m.translateZ(0.035); dash.add(m); return m; };
    this.radarTex = canvasTex(128, 128, () => {});
    onPanel(new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: this.radarTex })), 0.72);
    this.dashTex = canvasTex(256, 128, () => {});
    onPanel(new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.42), new THREE.MeshBasicMaterial({ map: this.dashTex })), -0.6);
    this.lights = [];
    for (let i = 0; i < 6; i++) {
      const l = onPanel(new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.04), new THREE.MeshBasicMaterial({ color: '#223' })), -0.13 + (i % 3) * 0.13);
      l.translateY(i < 3 ? 0.1 : -0.02);
      this.lights.push(l);
    }
    // flight stick between your knees, throttle on the left console
    this.stick = grp(ck, 0, 2.75, 2.7);
    mk(CYL(0.035, 0.05, 0.5, 6), metal, this.stick, 0, 0.25, 0);
    mk(BOX(0.09, 0.16, 0.09), '#20252f', this.stick, 0, 0.55, 0);
    mk(BOX(0.03, 0.03, 0.03), '#d6281b', this.stick, 0, 0.64, 0.03, glow('#ff2a1a'));
    this.throttleL = grp(ck, 1.3, 3.33, 2.2);
    mk(BOX(0.04, 0.35, 0.04), metal, this.throttleL, 0, 0.17, 0);
    mk(BOX(0.14, 0.08, 0.1), '#20252f', this.throttleL, 0, 0.36, 0);
    ck.traverse((c) => { if (c.isMesh) c.castShadow = false; });
    this.setView(this.view);
  },
  setView(v) {
    this.view = v;
    if (!this.hull) return;
    this.hull.visible = v !== 'cockpit';
    this.cockpit.visible = v === 'cockpit';
    UI.el.hud.classList.toggle('incockpit', v === 'cockpit');
  },

  /* ---------------- atmosphere: over a planet ---------------- */
  enterAtmo(pi, parked) {
    this.leaveAtmo();
    if (this.space) this.space.visible = false;
    this.ph = 'atmo';
    this.planet = pi;
    Game.loadPlanet(pi);
    const w = G.world;
    w.parked.visible = false;
    G.liquid.mesh.visible = true;
    G.camera.far = 1500; G.camera.updateProjectionMatrix();
    // landing pad beacon so you can find it from the sky
    const beacon = (this.beacon = grp(this.group, 0, w.h(0, 0), 0));
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 260, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#3df0ff', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beam.position.y = 130; beacon.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(FLY.padR - 0.8, FLY.padR, 48), new THREE.MeshBasicMaterial({ color: '#3df0ff', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; beacon.add(ring);
    this.beaconBeam = beam;
    if (parked) {
      this.pos.set(0, w.h(0, 0), 0); this.vel.set(0, 0, 0);
      this.yaw = 0; this.pitch = 0; this.grounded = true;
    } else {
      // coming in from space: start high up, some way out, facing the pad
      const a = Math.atan2(this.arrive ? this.arrive.x : 1, this.arrive ? this.arrive.z : 1);
      const x = Math.sin(a) * FLY.enterDist, z = Math.cos(a) * FLY.enterDist;
      this.pos.set(x, w.h(x, z) + FLY.enterAlt, z);
      this.yaw = Math.atan2(-x, -z); this.pitch = -0.3;
      this.vel.set(-Math.sin(a) * 18, -4, -Math.cos(a) * 18);
      this.grounded = false;
      UI.bigTitle(PLANETS[pi].name.toUpperCase(), 'Land on the glowing pad. Come down slowly.', '#bff6ff', 3.4);
    }
    this.tpos.copy(this.pos);
  },
  leaveAtmo() {
    if (this.beacon) { this.group.remove(this.beacon); disposeObj(this.beacon); this.beacon = null; }
  },
  atmo(dt, can) {
    const w = G.worlds[this.planet];
    const k = 0.0022 * G.settings.sens;
    let yawIn = 0;
    if (can) {
      yawIn = -Input.dx * k;
      this.yaw += yawIn;
      this.pitch = U.clamp(this.pitch - Input.dy * k, -0.9, 0.5);
    }
    const key = (c) => can && Input.keys[c];
    const f = new V3(Math.sin(this.yaw), 0, Math.cos(this.yaw)), side = new V3(f.z, 0, -f.x);
    this.crashCd -= dt; this.hint -= dt;
    if (this.grounded) {
      this.vel.set(0, 0, 0);
      if (key('Space')) { this.grounded = false; this.vel.y = 6; Sound.play('warp'); UI.toast('Liftoff! Climb above 150 m to reach space.', 'good', 3); }
    } else {
      const wantF = key('KeyW') ? FLY.hover.fwd : key('KeyS') ? -12 : 0;
      const nf = U.damp(this.vel.dot(f), wantF, 1.1, dt), ns = U.damp(this.vel.dot(side), 0, 3, dt);
      const wantUp = key('Space') ? FLY.hover.up : key('KeyC') ? -FLY.hover.up : -FLY.hover.sink;
      this.vel.set(f.x * nf + side.x * ns, U.damp(this.vel.y, wantUp, 2, dt), f.z * nf + side.z * ns);
      this.pos.addScaledVector(this.vel, dt);
      // stay near the landing zone
      const r = Math.hypot(this.pos.x, this.pos.z);
      if (r > FLY.zone) {
        this.pos.x *= FLY.zone / r; this.pos.z *= FLY.zone / r;
        if (this.hint <= 0) { UI.toast('Too far from the landing zone! Turn back, or climb to space.', 'bad', 2.5); this.hint = 4; }
      }
      this.touchdown(w);
      if (this.ph !== 'atmo' || !this.on) return;
      if (this.pos.y - Math.max(w.h(this.pos.x, this.pos.z), WATER_Y) > FLY.atmoTop && this.vel.y > 0) { this.transition({ k: 'space' }); return; }
    }
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    this.bank = U.damp(this.bank, U.clamp(-yawIn * 16 - this.vel.dot(side) * 0.02, -0.5, 0.5), 5, dt);
  },
  // the ground is coming up: is this a landing or a crash?
  touchdown(w) {
    const gy = Math.max(w.h(this.pos.x, this.pos.z), WATER_Y);
    if (this.pos.y > gy) return;
    const vs = -this.vel.y, onPad = Math.hypot(this.pos.x, this.pos.z) < FLY.padR + 1.5;
    const water = w.h(this.pos.x, this.pos.z) < WATER_Y + 0.2;
    this.pos.y = gy;
    if (vs > FLY.hardVS || water || Math.hypot(this.vel.x, this.vel.z) > 16) {
      this.vel.y = 7; this.vel.x *= -0.3; this.vel.z *= -0.3;
      if (this.crashCd <= 0) { this.crashCd = 1.5; this.event({ k: 'crash', water: water ? 1 : 0, fee: Math.min(SAVE.bucks, 25) }); }
      return;
    }
    if (onPad) { Game.arrive(this.planet); return; }
    // a soft landing, just not on the pad
    this.vel.set(0, 0, 0); this.grounded = true;
    if (this.hint <= 0) { UI.toast('Wrong spot! Lift off (Space) and land on the glowing pad.', 'bad', 3); this.hint = 4; }
  },

  /* ---------------- deep space ---------------- */
  buildSpace() {
    const g = (this.space = grp(this.group));
    const rng = U.seeded(4242); // the same solar system for everyone
    PLANETS.forEach((cfg, i) => {
      const m = new THREE.Mesh(flat(new THREE.IcosahedronGeometry(FLY.R, 3)), new THREE.MeshToonMaterial({ color: cfg.ground[0], gradientMap: TOON_GRAD, fog: false }));
      m.position.copy(SYSTEM[i]);
      m.add(new THREE.Mesh(new THREE.SphereGeometry(FLY.R * 1.08, 28, 18), new THREE.MeshBasicMaterial({ color: cfg.sky[1], transparent: true, opacity: 0.3, side: THREE.BackSide, fog: false, depthWrite: false })));
      if (i === 2) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(FLY.R * 1.3, FLY.R * 1.8, 64), new THREE.MeshBasicMaterial({ color: '#ffcf3a', transparent: true, opacity: 0.45, side: THREE.DoubleSide, fog: false, depthWrite: false }));
        ring.rotation.x = 1.3; m.add(ring);
      }
      const tag = textSprite(cfg.name.toUpperCase(), { size: 60, color: '#ffffff', stroke: '#0a0718', scale: 0.9, depthTest: false, order: 30 });
      tag.position.y = FLY.R + 70; m.add(tag);
      g.add(m);
    });
    const sun = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff3c4', fog: false }));
    sun.position.set(2800, 2600, -4200); g.add(sun);
    // asteroid belts, turbo rings and coins between neighbouring planets
    const geos = [0, 1, 2].map(() => flat(new THREE.DodecahedronGeometry(1, 0)));
    const mats = ['#6d6470', '#8a7b6a', '#524a5e'].map((c) => M(c));
    const coinGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.3, 12);
    this.rocks = []; this.rings = []; this.coins = [];
    for (let s = 0; s < SYSTEM.length - 1; s++) {
      const a = SYSTEM[s], b = SYSTEM[s + 1], len = a.distanceTo(b);
      const dir = b.clone().sub(a).normalize();
      const right = new V3().crossVectors(dir, new V3(0, 1, 0)).normalize(), up2 = new V3().crossVectors(right, dir);
      for (let i = 0; i < 70; i++) {
        const tt = 0.2 + rng() * 0.6, ang = rng() * Math.PI * 2, d = 25 + rng() * 170;
        const p = a.clone().lerp(b, tt).addScaledVector(right, Math.cos(ang) * d).addScaledVector(up2, Math.sin(ang) * d);
        const r = 3 + rng() * rng() * 18;
        const m = new THREE.Mesh(geos[i % 3], mats[i % 3]);
        m.position.copy(p); m.scale.set(r, r * (0.7 + rng() * 0.5), r * (0.8 + rng() * 0.4)); m.rotation.set(rng() * 6, rng() * 6, 0);
        g.add(m);
        this.rocks.push({ m, r, spin: (rng() - 0.5) * 0.6 });
      }
      for (let d = FLY.R + 180; d < len - FLY.R - 120; d += 170) {
        const p = a.clone().addScaledVector(dir, d).addScaledVector(right, (rng() - 0.5) * 40).addScaledVector(up2, (rng() - 0.5) * 30);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(12, 1.1, 6, 32), new THREE.MeshToonMaterial({ color: '#3df0ff', emissive: '#0aa0c0', gradientMap: TOON_GRAD }));
        ring.position.copy(p); ring.lookAt(p.clone().add(dir));
        g.add(ring);
        this.rings.push({ m: ring, p, taken: false, id: this.rings.length });
        for (let c = 1; c <= 4; c++) {
          const cm = new THREE.Mesh(coinGeo, M('#ffd23f', { emissive: '#aa7700' }));
          cm.position.copy(p).addScaledVector(dir, -c * 11);
          g.add(cm);
          this.coins.push({ m: cm, taken: false });
        }
      }
    }
  },
  enterSpace(from) {
    this.leaveAtmo();
    this.ph = 'space';
    this.spaceT = 0;
    if (!this.space) this.buildSpace();
    this.space.visible = true;
    for (const k in G.worlds) G.worlds[k].group.visible = false;
    G.liquid.mesh.visible = false;
    setAtmosphere(SPACE_ATMO);
    G.camera.far = 14000; G.camera.updateProjectionMatrix();
    // pop out above the planet, heading the way we were flying
    const out = new V3(Math.sin(this.yaw), 0.35, Math.cos(this.yaw)).normalize();
    this.pos.copy(SYSTEM[from]).addScaledVector(out, FLY.R + 70);
    this.pitch = 0.1;
    this.speed = FLY.space.cruise;
    this.tpos.copy(this.pos);
    UI.bigTitle('DEEP SPACE', `Head for ${PLANETS[this.wp].name}. Press M for the map.`, '#bff6ff', 3.2);
  },
  spaceFly(dt, can) {
    this.spaceT += dt;
    const k = 0.0024 * G.settings.sens;
    let yawIn = 0;
    if (can) {
      yawIn = -Input.dx * k;
      this.yaw += yawIn;
      this.pitch = U.clamp(this.pitch - Input.dy * k, -1.2, 1.2);
    }
    const tgt = SYSTEM[this.wp];
    if (!this.auto && this.spaceT > FLY.autopilot) { this.auto = true; UI.toast('Autopilot ON. Dave took the wheel. "I\'ll be expensing this."', 'purple', 4); }
    if (this.auto) {
      const d = tgt.clone().sub(this.pos);
      this.yaw += U.angDiff(this.yaw, Math.atan2(d.x, d.z)) * Math.min(1, dt * 1.5);
      this.pitch = U.damp(this.pitch, Math.atan2(d.y, Math.hypot(d.x, d.z)), 1.5, dt);
    }
    this.bank = U.damp(this.bank, U.clamp(-yawIn * 18, -0.7, 0.7), 5, dt);
    const key = (c) => can && Input.keys[c];
    let want = key('KeyW') || this.auto ? FLY.space.max : key('KeyS') ? 15 : U.clamp(this.speed, FLY.space.cruise * 0.6, FLY.space.max);
    const turbo = key('ShiftLeft') || key('ShiftRight');
    if (turbo && this.turbo > 0.02) { want = FLY.space.turbo; this.turbo = Math.max(0, this.turbo - dt * 0.3); } else this.turbo = Math.min(1, this.turbo + dt * 0.05);
    this.speed = U.damp(this.speed, want, turbo ? 2.5 : 1.3, dt);
    const prev = this.pos.clone();
    this.pos.addScaledVector(this.fwd(), this.speed * dt);
    if (key('Space')) this.pos.y += 18 * dt;
    if (key('KeyC')) this.pos.y -= 18 * dt;
    // rocks
    this.hitCd -= dt;
    for (const r of this.rocks) {
      const d = r.m.position.distanceTo(this.pos);
      if (d < r.r + 3.5 && this.hitCd <= 0) {
        this.hitCd = 0.8; this.speed *= 0.3;
        this.pos.add(this.pos.clone().sub(r.m.position).normalize().multiplyScalar(r.r + 4 - d));
        this.event({ k: 'bonk' });
      }
    }
    for (const r of this.rings) if (!r.taken && U.segSphere(prev, this.pos, r.p, 11)) { this.turbo = Math.min(1, this.turbo + 0.5); this.speed = Math.max(this.speed, FLY.space.max); this.event({ k: 'ring', i: r.id }); }
    this.coins.forEach((c, i) => { if (!c.taken && U.segSphere(prev, this.pos, c.m.position, 5)) this.event({ k: 'coin', i }); });
    // reached a planet?
    for (let i = 0; i < SYSTEM.length; i++) {
      if (this.pos.distanceTo(SYSTEM[i]) > FLY.R + 30) continue;
      if (!planetUnlocked(i)) {
        this.pos.copy(SYSTEM[i]).add(this.pos.clone().sub(SYSTEM[i]).normalize().multiplyScalar(FLY.R + 60));
        this.yaw += Math.PI; this.speed = 20;
        this.event({ k: 'restricted', i });
        return;
      }
      this.transition({ k: 'atmo', pl: i, ax: U.r2(this.pos.x - SYSTEM[i].x), az: U.r2(this.pos.z - SYSTEM[i].z) });
      return;
    }
  },
  fwd() { return new V3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)); },

  /* ---------------- every frame ---------------- */
  update(dt) {
    if (!this.on) return;
    this.t += dt;
    const free = G.locked && !G.panel && !G.chatting;
    const can = Net.isHost && free && !this.mapOpen;
    if (free) {
      if (Input.tap('KeyV')) this.setView(this.view === 'cockpit' ? 'chase' : 'cockpit');
      if (Input.tap('KeyM')) this.toggleMap();
    }
    if (Net.isHost) {
      if (this.ph === 'atmo' && this.grounded && can && Input.tap('KeyE') && this.planet === G.planet) { Game.arrive(this.planet); return; } // step back out
      if (this.ph === 'atmo') this.atmo(dt, can); else this.spaceFly(dt, can);
      if (!this.on) return;
      this.sendT -= dt;
      if (this.sendT <= 0 && Net.online) {
        this.sendT = 1 / 15;
        Net.toAll({ t: 'fly', ph: this.ph, pl: this.planet, p: [U.r2(this.pos.x), U.r2(this.pos.y), U.r2(this.pos.z)], y: U.r2(this.yaw), x: U.r2(this.pitch), b: U.r2(this.bank), v: Math.round(this.vel.y * 10) / 10, s: Math.round(this.speed || 0), w: this.wp, g: this.grounded ? 1 : 0, tb: U.r2(this.turbo) });
      }
    } else {
      this.pos.lerp(this.tpos, 1 - Math.exp(-10 * dt));
      this.yaw += U.angDiff(this.yaw, this.tyaw) * Math.min(1, dt * 10);
      this.pitch = U.damp(this.pitch, this.tpitch, 10, dt);
    }
    // ship pose, flames, spinning stuff
    this.pivot.position.copy(this.pos);
    this.pivot.rotation.set(this.ph === 'space' ? -this.pitch : 0, this.yaw, this.bank, 'YXZ');
    const thr = this.ph === 'space' ? U.clamp((this.speed - 15) / (FLY.space.turbo - 15), 0.1, 1) : this.grounded ? 0.05 : U.clamp(0.3 + this.vel.y * 0.04 + this.speed * 0.015, 0.1, 1);
    for (const f of this.flames) f.scale.set(1, 0.4 + thr * 1.8 + Math.random() * 0.3, 1);
    Sound.engineLevel(thr);
    this.stick.rotation.set(U.clamp(-Input.dy * 0.02, -0.4, 0.4), 0, U.clamp(-Input.dx * 0.02, -0.4, 0.4));
    this.throttleL.rotation.x = -0.6 + U.clamp((this.speed || 0) / FLY.space.turbo, 0, 1) * 1.2;
    if (this.ph === 'space') {
      for (const r of this.rocks) r.m.rotation.y += r.spin * dt;
      for (const c of this.coins) if (!c.taken) c.m.rotation.y += dt * 3;
      if (this.view !== 'cockpit' && Math.random() < thr) FX.burst(this.pivot.localToWorld(new V3((Math.random() - 0.5) * 2, 2.2, -7)), '#ffb23e', 1, 2);
    } else if (this.beacon) {
      this.beaconBeam.material.opacity = 0.15 + 0.1 * Math.abs(Math.sin(this.t * 3));
      const w = G.worlds[this.planet], gh = w.h(this.pos.x, this.pos.z);
      if (!this.grounded && this.pos.y - gh < 10 && Math.random() < 0.6) FX.burst(new V3(this.pos.x + (Math.random() - 0.5) * 5, gh + 0.2, this.pos.z + (Math.random() - 0.5) * 5), '#e8ddd0', 1, 3);
    }
    this.camera(dt);
    this.hud();
  },
  // host: a phase change everyone must follow
  transition(m) { m.t = 'fph'; Net.toAll(m); this.onPhase(m); },
  onPhase(m) {
    if (!this.on) return;
    if (m.k === 'space') this.enterSpace(this.planet);
    else if (m.k === 'atmo') { this.arrive = new V3(m.ax || 1, 0, m.az || 1); this.enterAtmo(m.pl, false); }
  },
  event(m) { m.t = 'fev'; Net.toAll(m); this.onEvent(m); },
  onEvent(m) {
    if (!this.on) return;
    if (m.k === 'bonk') {
      G.shake = Math.max(G.shake, 1); Sound.play('boom');
      FX.burst(this.pos.clone(), '#9a8f84', 12, 8);
      UI.toast(U.pick(LINES.flyHit), 'bad', 1.6);
    } else if (m.k === 'crash') {
      G.shake = Math.max(G.shake, 1.2); Sound.play('boom');
      FX.burst(this.pos.clone().setY(this.pos.y + 1), m.water ? '#bfe8ff' : '#9a8f84', 16, 8);
      if (m.fee) addBucks(-m.fee);
      UI.toast(m.water ? 'SPLASH. Ships do not float. Try the pad.' : `HARD LANDING! Come down slower.${m.fee ? ` Repairs: $${m.fee}` : ''}`, 'bad', 2.5);
    } else if (m.k === 'restricted') {
      G.shake = Math.max(G.shake, 0.6); Sound.play('error');
      UI.toast(`RESTRICTED AIRSPACE: beat ${BOSSES[PLANETS[m.i - 1].boss].name} first.`, 'bad', 3);
    } else if (m.k === 'ring') {
      const r = this.rings && this.rings[m.i];
      if (!r || r.taken) return;
      r.taken = true; r.m.visible = false;
      FX.ring(r.p.clone(), '#3df0ff', 16); Sound.play('boing');
      UI.toast('TURBO RING! Hold Shift to boost.', 'good', 1.2);
    } else if (m.k === 'coin') {
      const c = this.coins && this.coins[m.i];
      if (!c || c.taken) return;
      c.taken = true; c.m.visible = false;
      addBucks(15, true);
      UI.pickup('+ Space Coin ($15)', '#ffd23f');
      Sound.play('coin');
    }
  },
  onSync(m) {
    if (!this.on || Net.isHost) return;
    if (m.ph !== this.ph || (m.ph === 'atmo' && m.pl !== this.planet)) {
      if (m.ph === 'space') this.enterSpace(this.planet); else this.enterAtmo(m.pl, !!m.g);
      this.pos.set(m.p[0], m.p[1], m.p[2]);
    }
    this.tpos.set(m.p[0], m.p[1], m.p[2]);
    this.tyaw = m.y; this.tpitch = m.x; this.bank = m.b; this.speed = m.s; this.vel.y = m.v; this.wp = m.w; this.grounded = !!m.g; this.turbo = m.tb;
  },
  setWaypoint(i) {
    if (!Net.isHost) return;
    this.wp = i;
    Sound.play('click');
    this.drawMap();
  },

  /* ---------------- camera & instruments ---------------- */
  camera(dt) {
    const cam = G.camera;
    G.shake = Math.max(0, G.shake - dt * 2.2);
    const sh = G.shake * G.shake * 0.05;
    if (this.view === 'cockpit') {
      this.pivot.updateMatrixWorld(true);
      cam.position.copy(this.pivot.localToWorld(SEAT.clone()));
      // cameras look down -Z, the ship's nose is +Z: turn around
      cam.rotation.set(this.pitch - 0.1 + (Math.random() - 0.5) * sh, this.yaw + Math.PI + (Math.random() - 0.5) * sh, -this.bank, 'YXZ');
    } else {
      const f = this.ph === 'space' ? this.fwd() : new V3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      const want = this.pos.clone().addScaledVector(f, -18).add(new V3(0, 7, 0));
      if (this.t < 0.1 || cam.position.distanceTo(want) > 80) cam.position.copy(want);
      cam.position.lerp(want, 1 - Math.exp(-6 * dt));
      cam.lookAt(this.pos.clone().addScaledVector(f, 25).add(new V3(0, 2 + this.pitch * 20, 0)));
    }
    const fov = this.ph === 'space' ? 72 + U.clamp((this.speed - FLY.space.cruise) / 10, 0, 14) : 72;
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = U.damp(cam.fov, fov, 4, dt); cam.updateProjectionMatrix(); }
  },
  target() {
    if (this.ph === 'space') return { p: SYSTEM[this.wp], name: PLANETS[this.wp].name.toUpperCase(), d: Math.max(0, this.pos.distanceTo(SYSTEM[this.wp]) - FLY.R) };
    const w = G.worlds[this.planet];
    return { p: new V3(0, w.h(0, 0) + 2, 0), name: 'LANDING PAD', d: Math.hypot(this.pos.x, this.pos.z) };
  },
  hud() {
    const hud = U.$('flyhud'), tg = this.target();
    const w = G.worlds[this.planet];
    const alt = this.ph === 'atmo' ? this.pos.y - Math.max(w.h(this.pos.x, this.pos.z), WATER_Y) : 0;
    const vs = this.ph === 'atmo' ? this.vel.y : 0;
    hud.querySelector('.dest').innerHTML = this.ph === 'space' ? `<small>DESTINATION</small>${U.esc(PLANETS[this.wp].name)}` : `<small>${this.grounded ? 'LANDED' : 'ON APPROACH'}</small>${U.esc(PLANETS[this.planet].name)}`;
    hud.querySelector('.dist').textContent = this.ph === 'space' ? `${Math.round(tg.d).toLocaleString()} m to go` : `Landing pad ${Math.round(tg.d)} m away`;
    hud.querySelector('.fill').style.width = (this.turbo * 100).toFixed(0) + '%';
    hud.querySelector('.turbo').classList.toggle('hidden', this.ph !== 'space');
    const warn = vs < -FLY.hardVS ? 'bad' : vs < -FLY.hardVS * 0.7 ? 'warn' : this.ph === 'atmo' && vs < -0.5 ? 'ok' : '';
    U.$('flyinst').innerHTML = `<div><small>SPEED</small><b>${Math.round(this.speed || 0)}</b></div>` +
      (this.ph === 'atmo' ? `<div><small>ALTITUDE</small><b>${Math.round(alt)} m</b></div><div class="${warn}"><small>DESCENT</small><b>${vs < 0 ? (-vs).toFixed(1) : '0.0'} m/s</b></div>` : `<div><small>TURBO</small><b>${Math.round(this.turbo * 100)}%</b></div>`);
    let hint;
    if (!Net.isHost) hint = 'The captain is flying · V: camera · M: map';
    else if (this.ph === 'space') hint = 'Mouse: steer · W/S: speed · Shift: turbo · Space/C: up/down · M: map · V: camera';
    else if (this.grounded) hint = this.planet === G.planet ? 'Space: lift off · E: get out · V: camera · M: map' : 'Space: lift off · V: camera';
    else hint = 'Mouse: turn · W/S: forward/back · Space: up · C: down · land slowly on the glowing pad';
    UI.hint(hint);
    // target marker (or an arrow at the screen edge pointing to it)
    const el = U.$('flytgt'), p = tg.p.clone().project(G.camera);
    const onScreen = p.z < 1 && Math.abs(p.x) < 0.92 && Math.abs(p.y) < 0.9;
    el.classList.remove('hidden');
    el.classList.toggle('edge', !onScreen);
    let x = p.x, y = p.y;
    if (p.z > 1) { x = -x; y = -y; }
    if (!onScreen) { const l = Math.max(Math.abs(x), Math.abs(y)) || 1; x = (x / l) * 0.88; y = (y / l) * 0.85; }
    el.style.left = (50 + x * 50).toFixed(1) + '%';
    el.style.top = (50 - y * 50).toFixed(1) + '%';
    el.querySelector('.arrow').style.transform = `rotate(${Math.atan2(-y, x) + Math.PI / 2}rad)`;
    el.querySelector('.lbl').textContent = `${tg.name} · ${Math.round(tg.d).toLocaleString()} m`;
    if ((this.t * 10 | 0) % 2 === 0) { this.drawRadar(); this.drawDash(alt, vs); }
  },
  // top-right radar: everything around you, with your nose pointing up
  drawRadar() {
    const draw = (ctx, size) => {
      const r = size / 2, range = this.ph === 'space' ? 3500 : 200;
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(8,14,26,.85)'; ctx.beginPath(); ctx.arc(r, r, r - 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(120,220,255,.35)'; ctx.lineWidth = 1;
      for (const k of [0.33, 0.66, 0.97]) { ctx.beginPath(); ctx.arc(r, r, (r - 2) * k, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(r, 4); ctx.lineTo(r, size - 4); ctx.moveTo(4, r); ctx.lineTo(size - 4, r); ctx.stroke();
      const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
      const dot = (wx, wz, col, rad, label, hi) => {
        const dx = wx - this.pos.x, dz = wz - this.pos.z;
        const fw = dx * sy + dz * cy, rt = -dx * cy + dz * sy; // ahead / to the right
        let px = (rt / range) * (r - 6), py = (-fw / range) * (r - 6);
        const l = Math.hypot(px, py), edge = l > r - 8;
        if (edge) { px *= (r - 8) / l; py *= (r - 8) / l; }
        const rr = edge ? 3.5 : rad;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(r + px, r + py, rr, 0, Math.PI * 2); ctx.fill();
        if (hi) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r + px, r + py, rr + 3, 0, Math.PI * 2); ctx.stroke(); }
        if (label && size > 100) { ctx.fillStyle = '#dfefff'; ctx.font = `600 ${Math.round(size / 15)}px "Chakra Petch", sans-serif`; ctx.textAlign = 'center'; ctx.fillText(label, r + px, r + py - rr - 5); }
      };
      if (this.ph === 'space') PLANETS.forEach((pl, i) => dot(SYSTEM[i].x, SYSTEM[i].z, planetUnlocked(i) ? pl.ground[0] : '#555a66', 6, i === this.wp ? pl.name.split(' ').pop().toUpperCase() : '', i === this.wp));
      else dot(0, 0, '#3df0ff', 6, 'PAD', true);
      ctx.fillStyle = '#7dff8a'; ctx.beginPath(); ctx.moveTo(r, r - 8); ctx.lineTo(r - 5, r + 6); ctx.lineTo(r + 5, r + 6); ctx.closePath(); ctx.fill();
    };
    const cv = U.$('radar');
    draw(cv.getContext('2d'), cv.width);
    if (this.radarTex) { draw(this.radarTex.userData.canvas.getContext('2d'), 128); this.radarTex.needsUpdate = true; }
  },
  drawDash(alt, vs) {
    if (!this.dashTex) return;
    const c = this.dashTex.userData.canvas.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#0b1a24'); g.addColorStop(1, '#050b10');
    c.fillStyle = g; c.fillRect(0, 0, 256, 128);
    c.strokeStyle = 'rgba(125,255,234,.25)'; c.lineWidth = 2; c.strokeRect(3, 3, 250, 122);
    const row = (y, lab, val, col) => {
      c.fillStyle = 'rgba(125,255,234,.55)'; c.font = '600 14px "Chakra Petch", sans-serif'; c.textAlign = 'left'; c.fillText(lab, 14, y);
      c.fillStyle = col || '#b9fff3'; c.font = '700 26px "Chakra Petch", sans-serif'; c.textAlign = 'right'; c.fillText(val, 242, y + 2);
    };
    const bad = vs < -FLY.hardVS;
    row(38, 'SPEED', String(Math.round(this.speed || 0)));
    row(76, this.ph === 'atmo' ? 'ALTITUDE' : 'BOOST', this.ph === 'atmo' ? `${Math.round(alt)} m` : `${Math.round(this.turbo * 100)}%`);
    row(114, this.ph === 'atmo' ? 'DESCENT' : 'TARGET', this.ph === 'atmo' ? `${Math.max(0, -vs).toFixed(1)}` : PLANETS[this.wp].name.split(' ').pop().toUpperCase(), bad ? '#ff6b6b' : null);
    this.dashTex.needsUpdate = true;
    // status lights: power, grounded, space, boost low, sink rate, blink
    const blink = (this.t * 4 | 0) % 2 === 0;
    const on = ['#46d98a', this.grounded ? '#46d98a' : '', this.ph === 'space' ? '#3ab4ff' : '', this.turbo < 0.25 ? '#ffb020' : '', bad && blink ? '#ff3b3b' : '', blink ? '#3df0ff' : ''];
    this.lights.forEach((l, i) => l.material.color.set(on[i] || '#1c2230'));
  },
  toggleMap() {
    if (this.mapOpen) { UI.closePanel(); return; }
    UI.openPanel(`<h2 class="ph">SYSTEM MAP</h2><p class="psub">${Net.isHost ? 'Click a planet to set your destination. M or Esc to close.' : 'The captain picks the destination. M or Esc to close.'}</p><canvas id="mapcv"></canvas>`,
      null, () => this.drawMap(), () => { this.mapOpen = false; });
    this.mapOpen = true;
    U.$('mapcv').addEventListener('click', (e) => this.mapClick(e));
    this.drawMap();
  },
  // the whole solar system; the captain clicks a planet to set the destination
  drawMap() {
    const cv = U.$('mapcv');
    if (!cv) return;
    const Wd = (cv.width = cv.clientWidth || 800), Ht = (cv.height = cv.clientHeight || 500);
    const c = cv.getContext('2d');
    c.clearRect(0, 0, Wd, Ht);
    const xs = SYSTEM.map((p) => p.x), zs = SYSTEM.map((p) => p.z);
    const minX = Math.min(...xs) - 600, maxX = Math.max(...xs) + 600, minZ = Math.min(...zs) - 700, maxZ = Math.max(...zs) + 700;
    const s = Math.min(Wd / (maxX - minX), Ht / (maxZ - minZ));
    const ox = (Wd - (maxX - minX) * s) / 2, oz = (Ht - (maxZ - minZ) * s) / 2;
    const P = (x, z) => [ox + (x - minX) * s, oz + (z - minZ) * s];
    this.mapHits = [];
    c.strokeStyle = 'rgba(120,220,255,.25)'; c.setLineDash([6, 8]); c.lineWidth = 2;
    c.beginPath(); SYSTEM.forEach((p, i) => { const [x, y] = P(p.x, p.z); if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.stroke(); c.setLineDash([]);
    PLANETS.forEach((pl, i) => {
      const [x, y] = P(SYSTEM[i].x, SYSTEM[i].z), open = planetUnlocked(i), rr = Math.max(14, FLY.R * s);
      c.fillStyle = open ? pl.ground[0] : '#3a3f4c';
      c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill();
      c.lineWidth = i === this.wp ? 4 : 2; c.strokeStyle = i === this.wp ? '#ffffff' : 'rgba(255,255,255,.3)'; c.stroke();
      c.fillStyle = open ? '#ffffff' : '#8a90a0'; c.font = '700 17px "Chakra Petch", sans-serif'; c.textAlign = 'center';
      c.fillText(pl.name.toUpperCase(), x, y + rr + 20);
      c.font = '500 13px "Chakra Petch", sans-serif'; c.fillStyle = '#9fb3c8';
      c.fillText(!open ? 'LOCKED' : G.progress.includes(pl.boss) ? 'BOSS DEFEATED' : 'BOSS: ' + BOSSES[pl.boss].name.toUpperCase(), x, y + rr + 36);
      this.mapHits.push({ x, y, r: rr + 12, i });
    });
    // you are here
    const here = this.ph === 'space' ? this.pos : SYSTEM[this.planet];
    const [sx, sy] = P(here.x, here.z);
    c.save(); c.translate(sx, sy); c.rotate(-this.yaw + Math.PI);
    c.fillStyle = '#7dff8a'; c.beginPath(); c.moveTo(0, -12); c.lineTo(-8, 9); c.lineTo(8, 9); c.closePath(); c.fill();
    c.restore();
  },
  mapClick(ev) {
    if (!this.mapHits) return;
    const cv = U.$('mapcv'), b = cv.getBoundingClientRect();
    const x = ev.clientX - b.left, y = ev.clientY - b.top;
    for (const h of this.mapHits) if (Math.hypot(x - h.x, y - h.y) < h.r) { if (planetUnlocked(h.i)) this.setWaypoint(h.i); else UI.toast('That planet is locked.', 'bad', 1.5); return; }
  },
};
