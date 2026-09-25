'use strict';
/* =========================================================
   Sky, liquid, planets and boss arenas
   ========================================================= */
const WATER_Y = 0;
const DECK_Y = 1.5;
const ARENA_R = 17;
const smooth = (a, b, x) => { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------------- sky: gradient dome + stars + big planets ---------------- */
const Sky = {
  init(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color('#000') }, bot: { value: new THREE.Color('#000') }, sunDir: { value: new V3(30, 55, 18).normalize() }, sunCol: { value: new THREE.Color('#fff') }, glow: { value: 0.5 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      // gradient sky plus a soft halo around the sun and a brighter band at the horizon
      fragmentShader: `uniform vec3 top; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; uniform float glow; varying vec3 vP;
        void main(){
          float h = clamp(vP.y * 1.5 + 0.18, 0.0, 1.0);
          vec3 c = mix(bot, top, pow(h, 0.75));
          float s = max(dot(normalize(vP), sunDir), 0.0);
          c += sunCol * (pow(s, 64.0) * 1.2 + pow(s, 6.0) * 0.25) * glow;
          c += bot * pow(1.0 - abs(vP.y), 8.0) * 0.12;
          gl_FragColor = vec4(c, 1.0);
        }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 14), this.mat);
    dome.renderOrder = -2; dome.frustumCulled = false;
    this.group.add(dome);
    const n = 1400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2;
      const y = Math.abs(u) * 0.95 + 0.02, rr = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(a) * rr * 820; pos[i * 3 + 1] = y * 820; pos[i * 3 + 2] = Math.sin(a) * rr * 820;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 1, fog: false, depthWrite: false });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.renderOrder = -1; this.stars.frustumCulled = false;
    this.group.add(this.stars);
    this.bodies = new THREE.Group();
    this.group.add(this.bodies);
    // low-poly clouds drifting around the horizon
    this.cloudMat = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: TOON_GRAD, fog: false, transparent: true, opacity: 0.93 });
    this.clouds = new THREE.Group();
    const rnd = U.seeded(77);
    for (let i = 0; i < 18; i++) {
      const parts = [];
      const n = 3 + Math.floor(rnd() * 4), w = 18 + rnd() * 26;
      for (let j = 0; j < n; j++) {
        const g = new THREE.IcosahedronGeometry(w * (0.35 + rnd() * 0.35), 1);
        g.scale(1, 0.55, 0.8);
        g.translate((j / (n - 1 || 1) - 0.5) * w * 1.6, rnd() * w * 0.2, (rnd() - 0.5) * w * 0.5);
        parts.push(g.index ? g.toNonIndexed() : g);
      }
      const m = new THREE.Mesh(mergeGeos(parts), this.cloudMat);
      const a = (i / 18) * Math.PI * 2 + rnd() * 0.3, d = 520 + rnd() * 160;
      m.position.set(Math.cos(a) * d, 70 + rnd() * 120, Math.sin(a) * d);
      m.lookAt(0, m.position.y, 0);
      m.renderOrder = -1;
      this.clouds.add(m);
    }
    this.group.add(this.clouds);
    // specks of dust floating around you (makes the air feel like it's there)
    const dn = 260;
    this.dustBase = new Float32Array(dn * 3);
    for (let i = 0; i < dn * 3; i++) this.dustBase[i] = Math.random() * 40;
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(dn * 3), 3));
    this.dustMat = new THREE.PointsMaterial({ color: '#ffffff', size: 0.07, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    this.dust = new THREE.Points(dg, this.dustMat);
    this.dust.frustumCulled = false;
    scene.add(this.dust);
    this.t = 0;
  },
  set(cfg) {
    this.mat.uniforms.top.value.set(cfg.sky[0]);
    this.mat.uniforms.bot.value.set(cfg.sky[1]);
    this.starMat.opacity = cfg.stars;
    const planet = (cfg.bodies || []).length > 0;
    this.clouds.visible = planet && cfg.stars < 0.7;
    this.cloudMat.color.set('#f2f2f2').lerp(new THREE.Color(cfg.fog[0]), 0.5);
    this.dust.visible = planet;
    this.dustMat.color.set(cfg.fog[0]).lerp(new THREE.Color('#ffffff'), 0.6);
    this.mat.uniforms.sunCol.value.set(cfg.sun[0]);
    this.mat.uniforms.glow.value = planet ? (cfg.stars > 0.6 ? 0.25 : 0.6) : 0.2;
    while (this.bodies.children.length) { const c = this.bodies.children[0]; this.bodies.remove(c); disposeObj(c); }
    for (const b of cfg.bodies || []) {
      const d = new V3(...b.dir).normalize().multiplyScalar(700);
      const mat = b.glow ? new THREE.MeshBasicMaterial({ color: b.color, fog: false }) : new THREE.MeshToonMaterial({ color: b.color, gradientMap: TOON_GRAD, fog: false });
      const m = new THREE.Mesh(flat(new THREE.IcosahedronGeometry(b.r, 2)), mat);
      m.position.copy(d); m.renderOrder = -1;
      this.bodies.add(m);
      if (b.ring) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(b.r * 1.35, b.r * 2.0, 48), new THREE.MeshBasicMaterial({ color: b.ring, transparent: true, opacity: 0.55, side: THREE.DoubleSide, fog: false, depthWrite: false }));
        ring.position.copy(d); ring.rotation.set(1.2, 0.3, 0.4); ring.renderOrder = -1;
        this.bodies.add(ring);
      }
    }
  },
  update(dt, cam) {
    this.group.position.copy(cam.position);
    this.stars.rotation.y += dt * 0.003;
    this.clouds.rotation.y += dt * 0.004;
    this.t += dt;
    if (this.dust.visible) {
      const p = this.dust.geometry.attributes.position.array, b = this.dustBase, c = cam.position, t = this.t;
      for (let i = 0; i < p.length; i += 3) {
        const k = i * 0.37;
        p[i] = c.x + ((((b[i] + t * 0.3 + Math.sin(t * 0.5 + k) - c.x) % 40) + 40) % 40) - 20;
        p[i + 1] = c.y + ((((b[i + 1] + Math.sin(t * 0.4 + k) * 1.5 - c.y) % 16) + 16) % 16) - 6;
        p[i + 2] = c.z + ((((b[i + 2] + t * 0.2 + Math.cos(t * 0.45 + k) - c.z) % 40) + 40) % 40) - 20;
      }
      this.dust.geometry.attributes.position.needsUpdate = true;
    }
  },
};

function setAtmosphere(cfg, bossTint) {
  Sky.set(cfg);
  const fogCol = new THREE.Color(cfg.fog[0]);
  if (bossTint) fogCol.lerp(new THREE.Color(bossTint), 0.25);
  G.scene.fog.color.copy(fogCol);
  G.scene.fog.near = cfg.fog[1];
  G.scene.fog.far = cfg.fog[2];
  G.renderer.setClearColor(fogCol);
  G.sun.color.set(cfg.sun[0]);
  G.sun.intensity = cfg.sun[1];
  G.hemi.color.set(cfg.hemi[0]);
  G.hemi.groundColor.set(cfg.hemi[1]);
  G.hemi.intensity = cfg.hemi[2];
  G.liquid.set(cfg.liquid);
  Post.setMood(bossTint || G.mode === 'boss' ? 'boss' : cfg.stars >= 1 && !(cfg.bodies || []).length ? 'space' : cfg.stars > 0.5 ? 'night' : 'day');
}

/* ---------------- liquid sea (water / goo / gold / lava) ---------------- */
function waveH(x, z, t) {
  return Math.sin(x * 0.18 + t * 1.1) * 0.16 + Math.cos(z * 0.21 + t * 0.9) * 0.14 + Math.sin((x + z) * 0.07 + t * 0.6) * 0.1;
}
class Liquid {
  constructor(scene) {
    const geo = new THREE.PlaneGeometry(340, 340, 60, 60);
    geo.rotateX(-Math.PI / 2);
    this.geo = geo;
    this.base = Float32Array.from(geo.attributes.position.array);
    this.mat = new THREE.MeshPhongMaterial({ color: '#2fb7d6', transparent: true, opacity: 0.88, shininess: 70, specular: 0x555555, flatShading: true });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.cell = 340 / 60;
  }
  set(cfg) {
    this.mat.color.set(cfg.color);
    this.mat.opacity = cfg.op;
    this.mat.emissive.set(cfg.glow ? cfg.color : '#000000');
    this.mat.emissiveIntensity = cfg.glow ? 0.45 : 0;
  }
  update(t, cx, cz) {
    const ox = Math.round(cx / this.cell) * this.cell, oz = Math.round(cz / this.cell) * this.cell;
    this.mesh.position.set(ox, WATER_Y, oz);
    const p = this.geo.attributes.position.array, b = this.base;
    for (let i = 0; i < p.length; i += 3) p[i + 1] = waveH(b[i] + ox, b[i + 2] + oz, t);
    this.geo.attributes.position.needsUpdate = true;
  }
}

/* ---------------- shared world helpers ---------------- */
function buildCounter(col) {
  const g = new THREE.Group();
  mk(BOX(3.2, 1.1, 0.9), col, g, 0, 0.55, 0);
  mk(BOX(3.4, 0.12, 1.1), '#2b1d14', g, 0, 1.15, 0);
  return g;
}

/* ---------------- a planet ---------------- */
class PlanetWorld {
  constructor(idx) {
    this.idx = idx;
    this.cfg = PLANETS[idx];
    this.group = new THREE.Group();
    this.stat = grp(this.group);
    this.dyn = grp(this.group);
    this.dyn.userData.dynamic = true;
    this.circles = []; this.boxes = []; this.caps = []; this.inter = []; this.nodes = []; this.npcs = []; this.anim = [];
    this.occupied = [];
    this.ph = idx * 1.7 + 0.4;
    this.rng = U.seeded(1000 + idx * 777);
    this.pads = [];
    this.spawn = new V3(6, 0, 5);
    this.spawnYaw = 0;

    // pads keep the ground flat under buildings
    this.addPad(0, 0, 11);
    this.addPad(16, -6, 6);
    this.addPad(0, -38, 6);
    this.addPad(-12, 10, 3);
    if (this.cfg.id === 'luck') { this.addPad(-20, -8, 12); this.addPad(-17, 17, 10); }
    if (this.cfg.id === 'zorb') {
      this.addPad(0, -52, 16);
      for (const [x, z] of [[-10, -30], [10, -30], [-22, -20], [22, -20]]) this.addPad(x, z, 2);
    }

    this.buildTerrain();
    this.buildShipArea();
    this.buildBeacon();
    this['build_' + this.cfg.id]();
    mergeStatic(this.stat);
    this.spawn.y = this.h(this.spawn.x, this.spawn.z) + 0.1;
    this.spawnYaw = Math.atan2(-(16 - this.spawn.x), -(-6 - this.spawn.z));
  }

  /* ----- terrain ----- */
  rawH(x, z) {
    const a = Math.atan2(z, x), r = Math.hypot(x, z), ph = this.ph;
    const R = 60 * (1 + 0.08 * Math.sin(3 * a + ph) + 0.05 * Math.cos(5 * a + ph * 2));
    const e = r / R;
    let base = e < 0.75 ? 2.0 : e < 1 ? 2.0 - ((e - 0.75) / 0.25) * 1.7 : 0.3 - (e - 1) * 30;
    base = Math.max(base, -6);
    const amp = this.cfg.amp;
    const n = (Math.sin(x * 0.09 + ph) * Math.cos(z * 0.08 - ph) + 0.5 * Math.sin(x * 0.21 + z * 0.17 + ph * 3)) * amp;
    const inland = U.clamp((1 - e) * 4, 0, 1);
    const calm = 0.2 + 0.8 * smooth(12, 34, r); // gentle ground around the landing site
    return base + n * inland * calm;
  }
  addPad(x, z, r) { this.pads.push({ x, z, r, h: this.rawH(x, z) }); }
  h(x, z) {
    let h = this.rawH(x, z);
    for (const p of this.pads) {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < p.r + 4) h = U.lerp(p.h, h, smooth(p.r, p.r + 4, d));
    }
    return h;
  }
  buildTerrain() {
    const S = 180, N = 90;
    let geo = new THREE.PlaneGeometry(S, S, N, N);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, this.h(p.getX(i), p.getZ(i)));
    geo = geo.toNonIndexed();
    geo.computeVertexNormals();
    const pa = geo.attributes.position, cols = new Float32Array(pa.count * 3);
    const [cLow, cHigh, cAcc] = this.cfg.ground.map((c) => new THREE.Color(c));
    const sand = new THREE.Color(this.cfg.ground[0]).lerp(new THREE.Color('#ffffff'), 0.15);
    const tmp = new THREE.Color();
    const rng = U.seeded(42 + this.idx);
    for (let i = 0; i < pa.count; i += 3) {
      const y = (pa.getY(i) + pa.getY(i + 1) + pa.getY(i + 2)) / 3;
      const cx = (pa.getX(i) + pa.getX(i + 1) + pa.getX(i + 2)) / 3, cz = (pa.getZ(i) + pa.getZ(i + 1) + pa.getZ(i + 2)) / 3;
      if (this.cfg.flat && Math.hypot(cx, cz) < 50) {
        const chk = (Math.floor(cx / 5) + Math.floor(cz / 5)) & 1;
        tmp.copy(chk ? cLow : cHigh);
        if (Math.abs(((cx % 10) + 10) % 10 - 5) < 0.35 || Math.abs(((cz % 10) + 10) % 10 - 5) < 0.35) tmp.copy(cAcc);
      } else if (y < 0.7) tmp.copy(sand).multiplyScalar(0.92 + rng() * 0.1);
      else {
        tmp.copy(cLow).lerp(cHigh, U.clamp((y - 1) / 3, 0, 1));
        if (rng() < 0.06) tmp.lerp(cAcc, 0.45);
        tmp.multiplyScalar(0.93 + rng() * 0.1);
      }
      for (let k = 0; k < 3; k++) { cols[(i + k) * 3] = tmp.r; cols[(i + k) * 3 + 1] = tmp.g; cols[(i + k) * 3 + 2] = tmp.b; }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: TOON_GRAD });
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    this.group.add(m);
  }

  /* ----- placement helpers ----- */
  place(obj, x, z, ry = 0, parent) {
    obj.position.set(x, this.h(x, z), z);
    obj.rotation.y = ry;
    (parent || this.stat).add(obj);
    return obj;
  }
  isFree(x, z, rad) {
    for (const p of this.pads) if (Math.hypot(x - p.x, z - p.z) < p.r + rad) return false;
    for (const o of this.occupied) if (Math.hypot(x - o.x, z - o.z) < o.r + rad) return false;
    return this.h(x, z) > 0.8;
  }
  scatter(n, rmin, rmax, rad, fn) {
    let placed = 0;
    for (let tries = 0; tries < n * 30 && placed < n; tries++) {
      const a = this.rng() * Math.PI * 2, r = rmin + this.rng() * (rmax - rmin);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!this.isFree(x, z, rad)) continue;
      this.occupied.push({ x, z, r: rad });
      fn(x, z, placed++);
    }
  }
  circle(x, z, r) { this.circles.push({ x, z, r }); }
  box(cx, cz, w, d, top = 99) { this.boxes.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2, top }); }
  interact(x, z, r, label, fn, y) { this.inter.push({ x, y: y == null ? this.h(x, z) + 1.2 : y, z, r, label, fn }); }
  npc(model, x, z, ry, name, tagY = 2.7) {
    this.place(model.root, x, z, ry, this.dyn);
    const tag = textSprite(name, { size: 40, bg: 'rgba(43,29,20,.7)', scale: 0.0065 });
    tag.position.set(0, tagY, 0);
    model.root.add(tag);
    this.npcs.push({ m: model, x, z, ry, t: this.rng() * 5 });
    this.circle(x, z, 0.6);
  }
  addNode(kind, x, y, z, mesh, extra = {}) {
    const n = Object.assign({ id: this.nodes.length, kind, x, y, z, mesh, taken: false, hp: 1 }, extra);
    mesh.position.set(x, y, z);
    this.dyn.add(mesh);
    this.nodes.push(n);
    return n;
  }

  /* ----- common: ship, merchant, beacon ----- */
  buildShipArea() {
    // the landing pad, and your ship parked on it (kept separate so it can fly off)
    mk(CYL(FLY.padR, FLY.padR, 0.1, 40), '#3b3f4a', this.stat, 0, this.h(0, 0) + 0.02, 0);
    tf(mk(TOR(FLY.padR - 0.5, 0.18, 4, 48), '#ffd23f', this.stat, 0, this.h(0, 0) + 0.09, 0), Math.PI / 2);
    for (const a of [0, 1, 2, 3]) tf(mk(BOX(0.35, 0.05, 2.2), '#ffd23f', this.stat, Math.sin(a * Math.PI / 2) * 8, this.h(0, 0) + 0.09, Math.cos(a * Math.PI / 2) * 8), 0, a * Math.PI / 2, 0);
    const ship = (this.parked = buildShip());
    ship.userData.dynamic = true;
    this.place(ship, 0, 0, 0);
    this.box(0, 0.5, 4.4, 11.5);
    this.interact(4.2, 0.2, 3.2, 'Board your ship', () => Flight.board());
    const shopCfg = SHOPS[this.cfg.shop];
    const counter = buildCounter(shopCfg.color);
    this.place(counter, 14.2, -6, Math.PI / 2);
    this.box(14.2, -6, 1.1, 3.4, 99);
    const stall = new THREE.Group();
    for (const [x, z] of [[-1.7, -1.6], [1.7, -1.6], [-1.7, 1.6], [1.7, 1.6]]) mk(CYL(0.1, 0.1, 3.4, 5), '#6b4a2b', stall, x, 1.7, z);
    const awn = grp(stall, 0, 3.4, 0);
    for (let i = 0; i < 6; i++) tf(mk(BOX(0.62, 0.1, 4.2), i % 2 ? '#ffffff' : shopCfg.color, awn, -1.55 + i * 0.62, 0, 0), 0, 0, 0);
    const sign = signMesh([shopCfg.npc.toUpperCase()], 3.6, 0.8, { bg: '#2b1d14', color: '#ffd23f' });
    sign.position.set(-1.9, 2.9, 0); sign.rotation.y = -Math.PI / 2; stall.add(sign);
    this.place(stall, 16, -6, 0);
    let model;
    switch (this.cfg.shop) {
      case 'scrap': model = buildRobotNPC(); break;
      case 'gloop': model = buildSnailChef(); break;
      case 'luck': model = buildAlien({ vest: '#9b5de5', bowtie: true }); break;
      case 'frost': model = buildPenguin(); break;
      default: model = buildManager();
    }
    this.npc(model, 16.2, -6, -Math.PI / 2, shopCfg.npc, 4.1);
    this.interact(13.2, -6, 3.2, `Shop at ${shopCfg.npc}`, () => Shop.open(this.cfg.shop));
  }
  // the boss altar: use the planet's summoning item here to start the fight
  buildBeacon() {
    const b = BOSSES[this.cfg.boss], s = SUMMONS[this.cfg.boss];
    const g = new THREE.Group();
    mk(CYL(2.2, 2.6, 0.6, 8), '#3b3f4a', g, 0, 0.3, 0);
    mk(CYL(0.5, 0.7, 4.5, 6), '#555a66', g, 0, 2.8, 0);
    const light = mk(OCT(0.6), '#ff3d3d', g, 0, 5.6, 0, { emissive: '#ff0000' });
    // the sign stands off to the side, so nothing hides the boss climbing out behind the altar
    mk(BOX(0.18, 2.4, 0.18), '#555a66', g, -3.6, 1.2, 0.3);
    const sign = signMesh(['BOSS ALTAR', b.name.toUpperCase(), 'USE: ' + s.name.toUpperCase()], 3.6, 1.7, { bg: '#2b1d14', colors: ['#ff4b3e', '#ffffff', '#ffd23f'], border: '#ff4b3e', double: true });
    sign.position.set(-3.6, 2.1, 0.42); g.add(sign);
    this.place(g, 0, -38, 0);
    this.circle(0, -38, 1.0);
    this.circle(-3.6, -37.7, 0.3);
    // a floating crystal marks the altar from far away
    const icon = mk(OCT(0.7), b.color, this.dyn, 0, 7.4 + this.h(0, -38), -38, { emissive: b.color });
    this.anim.push((t) => { light.rotation.y = t * 2; icon.rotation.y = t * 1.5; icon.position.y = this.h(0, -38) + 7.4 + Math.sin(t * 2) * 0.3; });
    this.interact(0, -35.5, 3.5, `Boss altar: summon ${b.name}`, () => Shop.openBoss());
  }
  // someone used the summoning item: the boss climbs out of the ground behind the altar
  summonFx(id) {
    this.clearSummon();
    const m = buildBossModel(id), z = -44, y = this.h(0, z);
    m.root.position.set(0, y - 8, z);
    // a beam of light out of the altar, visible from anywhere on the planet
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 90, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: RING_COL[id], transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beam.position.set(0, this.h(0, -38) + 45, -38);
    this.dyn.add(m.root, beam);
    this.rising = { m, beam, t: 0, y, z };
  }
  clearSummon() {
    if (!this.rising) return;
    for (const o of [this.rising.m.root, this.rising.beam]) { this.dyn.remove(o); disposeObj(o); }
    this.rising = null;
  }
  jokeSign(x, z, model) {
    const s = SIGNS[this.cfg.id];
    this.place(model, x, z, Math.atan2(-x, -z));
    this.circle(x, z, 1.1);
    this.interact(x, z, 3, `Inspect ${s.title}`, () => { UI.toast(U.pick(s.lines)); Sound.play('click'); });
  }

  /* ----- per-planet dressing ----- */
  build_scrap() {
    const rng = this.rng;
    this.jokeSign(-12, 10, buildPotty());
    this.scatter(14, 16, 54, 3.2, (x, z) => { this.place(buildJunkPile(rng), x, z, rng() * 6); this.circle(x, z, 1.8); });
    this.scatter(5, 18, 50, 2, (x, z) => { this.place(buildBrokenRobot(), x, z, rng() * 6); this.circle(x, z, 1.1); });
    this.scatter(2, 25, 45, 3, (x, z) => { this.place(buildDish(), x, z, rng() * 6); this.circle(x, z, 0.6); });
    this.scatter(2, 25, 50, 3, (x, z) => { this.place(buildCrashedRocket(), x, z, rng() * 6); this.circle(x, z, 1.2); });
    this.scatter(22, 12, 58, 1.4, (x, z) => { this.place(buildRock(rng, U.pick(['#8f6b52', '#7a5c48', '#a0826a'])), x, z, rng() * 6); });
    this.scatter(22, 9, 55, 1.2, (x, z) => {
      const m = buildScrapNode(rng);
      this.addNode('scrap', x, this.h(x, z), z, m);
    });
  }
  build_gloop() {
    const rng = this.rng;
    const caps = ['#ff5fb8', '#9b5de5', '#43e0c0', '#ffb23e', '#ff7a3d'];
    const shroom = (x, z, h, r, withBerry) => {
      const c = caps[Math.floor(rng() * caps.length)];
      this.place(buildMushroom(h, r, c), x, z, rng() * 6);
      const gy = this.h(x, z);
      const top = gy + h + 0.3 + r * 0.22;
      this.caps.push({ x, z, r: r * 0.92, top });
      this.circle(x, z, r * 0.3);
      if (withBerry) this.addNode(h > 6 ? 'bigberry' : 'berry', x, top, z, buildBerryNode(h > 6));
    };
    // staircase clusters of mushrooms you can climb
    const clusters = [[30, 10], [-28, -18], [-10, 34], [26, -30], [-38, 16]];
    clusters.forEach(([cx, cz], ci) => {
      let a = rng() * 6, h = 1.8;
      for (let i = 0; i < 6; i++) {
        const x = cx + Math.cos(a) * (2.2 + i * 0.5), z = cz + Math.sin(a) * (2.2 + i * 0.5);
        shroom(x, z, h, 2.2 + rng() * 0.8, true);
        this.occupied.push({ x, z, r: 2.5 });
        a += 1.25; h += 1.75 + rng() * 0.4;
      }
    });
    this.scatter(10, 12, 55, 3.5, (x, z) => shroom(x, z, 1.2 + rng() * 3, 1.8 + rng() * 1.8, rng() > 0.3));
    this.scatter(34, 8, 58, 1, (x, z) => this.place(buildGlowPlant(rng, U.pick(['#7dffea', '#ff9af0', '#fff36b'])), x, z));
    this.scatter(16, 12, 58, 1.5, (x, z) => this.place(buildRock(rng, U.pick(['#39a58c', '#ff7ac8', '#6a4cc0'])), x, z, rng() * 6));
    this.scatter(8, 10, 50, 1, (x, z) => this.addNode('berry', x, this.h(x, z), z, buildBerryNode(false)));
    const sign = new THREE.Group();
    mk(BOX(0.2, 2.4, 0.2), '#6b4a2b', sign, 0, 1.2, 0);
    const sm = signMesh(['LUCKSTAR CASINO →', 'NEXT PLANET!'], 2.6, 1.3, { bg: '#ff3df0', colors: ['#fff', '#ffe066'], border: '#fff' });
    sm.position.set(0, 2.4, 0.12); sign.add(sm);
    this.jokeSign(-12, 10, sign);
    // Snorbo's mushroom house behind the stall
    this.place(buildMushroom(4, 4.5, '#ff5fb8'), 22, -6);
    this.circle(22, -6, 1.5);
  }
  build_luck() {
    const rng = this.rng;
    // casino building
    const cas = new THREE.Group();
    mk(BOX(10, 8, 20), '#3b1d6a', cas, 0, 4, 0);
    mk(BOX(10.4, 0.5, 20.4), '#ffd23f', cas, 0, 8.2, 0);
    for (let i = 0; i < 5; i++) mk(BOX(0.2, 7.6, 0.2), i % 2 ? '#ff3df0' : '#3df0ff', cas, 5.05, 4, -8 + i * 4, { emissive: i % 2 ? '#aa00aa' : '#00aaaa' });
    const neon = signMesh(['LUCKSTAR', 'CASINO'], 8, 3.4, { bg: '#1a0a30', colors: ['#ff3df0', '#3df0ff'], border: '#ffd23f', glow: true });
    neon.position.set(5.12, 5.6, -2); neon.rotation.y = Math.PI / 2; cas.add(neon);
    mk(BOX(0.2, 3.2, 3), '#1a0a30', cas, 5.05, 1.6, -2);
    this.place(cas, -20, -8, 0);
    this.box(-20, -8, 10, 20);
    // slot machines
    this.slotMachines = [];
    [-15, -12.6, -10.2].forEach((z) => {
      const s = buildSlotMachine();
      this.place(s, -13.3, z, Math.PI / 2, this.dyn);
      this.slotMachines.push(s);
      this.box(-13.3, z, 1.0, 1.4);
      this.interact(-12.2, z, 2.0, 'Play Cosmic Slots', () => Casino.openSlots());
    });
    // Glorp's table
    const table = new THREE.Group();
    mk(CYL(1.2, 0.4, 1.0, 10), '#3b2414', table, 0, 0.5, 0);
    mk(CYL(1.3, 1.3, 0.1, 12), '#1e7b3a', table, 0, 1.05, 0);
    for (let i = 0; i < 5; i++) mk(CYL(0.15, 0.15, 0.06, 8), '#ffd23f', table, 0.4, 1.13 + i * 0.07, 0.3);
    this.place(table, -9.5, -1.5);
    this.circle(-9.5, -1.5, 1.3);
    const glorp = buildAlien({ vest: '#1e7b3a', shades: true });
    this.npc(glorp, -11.3, -1.5, Math.PI / 2, 'Glorp');
    this.interact(-8.4, -1.5, 2.6, 'Gamble with Glorp (Double or Nothing)', () => Casino.openGlorp());
    // crate machine
    const cm = buildCrateMachine();
    this.place(cm, -13.6, 3.5, Math.PI / 2);
    this.box(-13.6, 3.5, 1.2, 1.8);
    this.interact(-12.4, 3.5, 2.2, 'Mystery Crate ($300)', () => Casino.openCrate());
    // snail race track
    const tr = new THREE.Group();
    mk(BOX(20, 0.1, 7.2), '#f3d99b', tr, 0, 0.05, 0);
    for (let i = 0; i <= 5; i++) mk(BOX(19.6, 0.02, 0.06), '#ffffff', tr, 0, 0.12, -3 + i * 1.2);
    for (let i = 0; i < 12; i++) mk(BOX(0.3, 0.03, 0.3), i % 2 ? '#111' : '#fff', tr, 8.6 + (i % 2) * 0.3, 0.12, -3 + Math.floor(i / 2) * 1.2 + 0.3);
    for (let i = 0; i < 3; i++) mk(BOX(20, 0.5, 0.9), '#5b3a8a', tr, 0, 0.25 + i * 0.5, 4.2 + i * 0.9);
    const ts = signMesh(['SNAIL RACES', 'BET ON A SNAIL'], 5, 1.6, { bg: '#1a0a30', colors: ['#ffd23f', '#3df0ff'], border: '#ff3df0', glow: true });
    ts.position.set(0, 3.5, 4.9); ts.rotation.y = Math.PI; tr.add(ts);
    mk(BOX(0.2, 3, 0.2), '#6b4a2b', tr, -2.4, 1.5, 5); mk(BOX(0.2, 3, 0.2), '#6b4a2b', tr, 2.4, 1.5, 5);
    this.place(tr, -17, 17, 0);
    this.box(-17, 21.8, 20, 2.8, 99);
    this.track = { x0: -26, x1: -8.2, lanes: [-3, -1.8, -0.6, 0.6, 1.8].map((o) => 17 + o + 0.6), y: this.h(-17, 17) + 0.12 };
    this.snails = SNAILS.map((s, i) => {
      const m = buildSnail(s.color);
      m.scale.setScalar(1.3);
      m.position.set(this.track.x0, this.track.y, this.track.lanes[i]);
      m.rotation.y = Math.PI / 2;
      this.dyn.add(m);
      return m;
    });
    this.interact(-6.8, 14, 3.2, 'Snail Races (bet!)', () => Casino.openSnails());
    this.interact(-17, 13.2, 3.2, 'Snail Races (bet!)', () => Casino.openSnails());
    // decor
    this.jokeSign(-12, 10, (() => { const g = new THREE.Group(); mk(BOX(0.2, 2.2, 0.2), '#555', g, 0, 1.1, 0); const s = signMesh(['POSTER'], 1.6, 1.0, { bg: '#ff3df0', color: '#fff' }); s.position.set(0, 2.2, 0.12); g.add(s); return g; })());
    this.scatter(14, 14, 55, 1.5, (x, z) => { this.place(buildNeonPalm(rng), x, z); this.circle(x, z, 0.4); });
    this.scatter(6, 18, 52, 2.5, (x, z) => { const s = 1.5 + rng() * 2; this.place(buildDice(s), x, z, rng() * 6); this.circle(x, z, s * 0.7); });
    this.scatter(10, 10, 55, 1.2, (x, z) => { this.place(buildChipStack(rng), x, z); this.circle(x, z, 0.8); });
  }
  build_frost() {
    const rng = this.rng;
    const ig = buildIgloo();
    this.jokeSign(-12, 10, ig);
    this.circles.pop(); this.circle(-12, 10, 2.6);
    this.place(buildIgloo(), 21.8, -6, -Math.PI / 2);
    this.circle(21.8, -6, 2.6);
    this.scatter(3, 20, 45, 4, (x, z) => { this.place(buildIgloo(), x, z, rng() * 6); this.circle(x, z, 2.6); });
    this.scatter(42, 12, 58, 1.6, (x, z) => { this.place(buildPine(rng, true), x, z, rng() * 6); this.circle(x, z, 0.5); });
    this.scatter(7, 10, 50, 1.2, (x, z) => { this.place(buildSnowman(rng), x, z, rng() * 6); this.circle(x, z, 0.8); });
    this.scatter(18, 12, 58, 1.4, (x, z) => this.place(buildRock(rng, U.pick(['#9fb8cc', '#c9e6f5', '#8fa3b8'])), x, z, rng() * 6));
    this.scatter(16, 10, 55, 2, (x, z) => {
      this.addNode('crystal', x, this.h(x, z), z, buildCrystalNode(rng), { hp: 1 });
      this.circle(x, z, 0.9);
    });
  }
  build_zorb() {
    const rng = this.rng;
    const pal = buildPalace();
    this.place(pal, 0, -54, 0);
    this.box(0, -54, 38, 16);
    const mat = new THREE.Group();
    mk(BOX(2.4, 0.06, 1.4), '#8a6a4a', mat, 0, 0.03, 0);
    const txt = signMesh(['GO AWAY'], 2.2, 1.2, { bg: '#8a6a4a', color: '#2b1d14', border: false });
    txt.rotation.x = -Math.PI / 2; txt.position.y = 0.07; mat.add(txt);
    this.place(mat, -12, 10, 0);
    this.interact(-12, 10, 2.5, 'Inspect Doormat', () => { UI.toast(U.pick(SIGNS.zorb.lines)); Sound.play('click'); });
    for (const [x, z] of [[-10, -30], [10, -30], [-22, -20], [22, -20]]) {
      this.place(buildStatue(), x, z, Math.atan2(-x, -z));
      this.box(x, z, 2.2, 2.2);
    }
    this.scatter(20, 16, 58, 2, (x, z) => { this.place(buildSpire(rng), x, z); this.circle(x, z, 1.3); });
    this.scatter(26, 10, 58, 1.8, (x, z) => { this.place(buildLavaRock(rng), x, z, rng() * 6); this.circle(x, z, 1.0); });
    const hr = signMesh(['LATE DELIVERY CO.', 'HR POP-UP KIOSK'], 3.2, 1.2, { bg: '#dfe6ee', colors: ['#d6281b', '#2b1d14'], border: '#2b1d14' });
    hr.position.set(20.5, this.h(20, -6) + 3.4, -6); hr.rotation.y = -Math.PI / 2; this.stat.add(hr);
  }

  /* ----- physics queries ----- */
  ground(x, z, y) {
    let g = this.h(x, z);
    for (const c of this.caps) {
      const dx = x - c.x, dz = z - c.z;
      if (dx * dx + dz * dz < c.r * c.r && y >= c.top - 0.7) g = Math.max(g, c.top);
    }
    return g;
  }
  onPlatform(x, z, y) {
    for (const c of this.caps) { const dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz < c.r * c.r && y >= c.top - 0.7) return true; }
    return false;
  }
  blocked(x, z, y) {
    if (Math.hypot(x, z) > 85) return true;
    if (this.onPlatform(x, z, y)) return false;
    return this.h(x, z) < -0.6;
  }
  collide(pos, rad) {
    for (const c of this.circles) {
      if (Math.abs(pos.x - c.x) > c.r + rad || Math.abs(pos.z - c.z) > c.r + rad) continue;
      const dx = pos.x - c.x, dz = pos.z - c.z, d2 = dx * dx + dz * dz, rr = c.r + rad;
      if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); pos.x = c.x + (dx / d) * rr; pos.z = c.z + (dz / d) * rr; }
    }
    for (const b of this.boxes) {
      if (pos.y > b.top) continue;
      const cx = U.clamp(pos.x, b.x0, b.x1), cz = U.clamp(pos.z, b.z0, b.z1);
      const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= rad * rad) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); pos.x = cx + (dx / d) * rad; pos.z = cz + (dz / d) * rad; }
      else {
        const l = pos.x - b.x0, r = b.x1 - pos.x, f = pos.z - b.z0, k = b.z1 - pos.z, m = Math.min(l, r, f, k);
        if (m === l) pos.x = b.x0 - rad; else if (m === r) pos.x = b.x1 + rad; else if (m === f) pos.z = b.z0 - rad; else pos.z = b.z1 + rad;
      }
    }
  }
  surfaceAt(x, z) { return Math.max(this.h(x, z), WATER_Y); }
  // where a critter can walk: dry land, not into buildings
  walkable(x, z) {
    if (Math.hypot(x, z) > 62 || this.h(x, z) < 0.6) return false;
    for (const b of this.boxes) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return false;
    return true;
  }
  // open dry ground for a meteor to hit: not a building or rock, and not the
  // flat pads (your ship and the shop are a safe zone)
  landable(x, z) {
    if (Math.hypot(x, z) > 60 || this.h(x, z) < 0.8) return false;
    for (const p of this.pads) if (Math.hypot(x - p.x, z - p.z) < p.r + 1) return false;
    for (const b of this.boxes) if (x > b.x0 - 1 && x < b.x1 + 1 && z > b.z0 - 1 && z < b.z1 + 1) return false;
    for (const c of this.circles) if (Math.hypot(x - c.x, z - c.z) < c.r + 1.2) return false;
    return true;
  }

  update(dt, t) {
    const pp = G.player ? G.player.pos : null;
    for (const n of this.npcs) {
      n.t += dt;
      n.m.root.position.y = this.h(n.x, n.z) + Math.abs(Math.sin(n.t * 2)) * 0.04;
      if (pp && n.m.head) {
        const dx = pp.x - n.x, dz = pp.z - n.z;
        const want = Math.hypot(dx, dz) < 9 ? U.angDiff(n.ry, Math.atan2(dx, dz)) : 0;
        n.m.head.rotation.y = U.damp(n.m.head.rotation.y, U.clamp(want, -1, 1), 5, dt);
      }
      if (n.m.bulb) n.m.bulb.visible = Math.sin(t * 4) > 0;
    }
    for (const nd of this.nodes) {
      if (nd.taken) continue;
      if (nd.mesh.userData.bob) nd.mesh.userData.bob.position.y = 0.55 + Math.sin(t * 2.5 + nd.id) * 0.12;
      nd.mesh.rotation.y += dt * 0.4;
    }
    for (const f of this.anim) f(t, dt);
    if (this.rising) {
      const r = this.rising;
      r.t += dt;
      const k = Math.min(1, r.t / 2.2), e = 1 - (1 - k) * (1 - k);
      r.m.root.position.set(Math.sin(r.t * 40) * 0.1 * (1 - k), r.y - 8 * (1 - e), r.z);
      r.beam.material.opacity = 0.2 + 0.25 * Math.abs(Math.sin(r.t * 8));
      r.beam.scale.set(1 + Math.sin(r.t * 12) * 0.15, 1, 1 + Math.sin(r.t * 12) * 0.15);
      if (Math.random() < 0.6) FX.burst(new V3(U.rand(-2.5, 2.5), r.y + 0.3, r.z + U.rand(-2.5, 2.5)), this.cfg.ground[0], 1, 4);
    }
    if (this.slotMachines) this.slotMachines[0].userData.light.material.emissiveIntensity = 0.6 + Math.sin(t * 6) * 0.5;
  }
}

/* ---------------- boss arena (reskinned per planet) ---------------- */
const ARENA_SKIN = {
  scrap: { deck: '#7a6a5a', ring: '#5a4a3a', post: '#3b3f4a', rail: '#ffb23e', deco: '#8f6b52' },
  gloop: { deck: '#ff9ad5', ring: '#ff5fb8', post: '#f3e9d2', rail: '#43e0c0', deco: '#9b5de5' },
  luck:  { deck: '#2a1c48', ring: '#ffd23f', post: '#ff3df0', rail: '#3df0ff', deco: '#ffd23f', neon: true },
  frost: { deck: '#dff6ff', ring: '#9fe3ff', post: '#8fa3b8', rail: '#ffffff', deco: '#c9e6f5' },
  zorb:  { deck: '#3a2448', ring: '#ffd23f', post: '#2a1f2e', rail: '#ff5a1f', deco: '#ff5a1f', neon: true },
};
class Arena {
  constructor(idx) {
    const cfg = PLANETS[idx], sk = ARENA_SKIN[cfg.id];
    this.cfg = cfg;
    this.group = new THREE.Group();
    const st = grp(this.group);
    mk(CYL(ARENA_R, ARENA_R + 0.6, 1.6, 28), sk.deck, st, 0, DECK_Y - 0.8, 0);
    mk(CYL(ARENA_R - 2, ARENA_R - 2, 0.04, 28), sk.ring, st, 0, DECK_Y + 0.01, 0);
    mk(CYL(ARENA_R - 2.4, ARENA_R - 2.4, 0.05, 28), sk.deck, st, 0, DECK_Y + 0.02, 0);
    mk(CYL(3, 3, 0.06, 16), sk.ring, st, 0, DECK_Y + 0.03, 0);
    mk(CYL(2.6, 2.6, 0.07, 16), sk.deck, st, 0, DECK_Y + 0.035, 0);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      mk(CYL(0.2, 0.24, 1.2, 6), sk.post, st, Math.cos(a) * (ARENA_R - 0.3), DECK_Y + 0.6, Math.sin(a) * (ARENA_R - 0.3));
      if (sk.neon && i % 2 === 0) mk(SPH(0.22, 6, 5), sk.rail, st, Math.cos(a) * (ARENA_R - 0.3), DECK_Y + 1.35, Math.sin(a) * (ARENA_R - 0.3), { emissive: sk.rail });
    }
    tf(mk(TOR(ARENA_R - 0.3, 0.09, 4, 60), sk.rail, st, 0, DECK_Y + 1.15, 0, sk.neon ? { emissive: sk.rail } : undefined), Math.PI / 2);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      mk(CYL(0.6, 0.8, 8, 6), sk.post, st, Math.cos(a) * (ARENA_R - 2), DECK_Y - 5, Math.sin(a) * (ARENA_R - 2));
    }
    const rng = U.seeded(99 + idx);
    for (let i = 0; i < 14; i++) {
      const a = rng() * Math.PI * 2, r = 42 + rng() * 40;
      const h = 4 + rng() * 14;
      mk(CONE(2 + rng() * 3, h, 5), sk.deco, st, Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r);
    }
    const floor = new THREE.Mesh(new THREE.CircleGeometry(400, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(cfg.liquid.color).multiplyScalar(0.35) }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -14;
    this.group.add(floor);
    mergeStatic(st);
    this.spawns = [];
    for (const o of [0, 1, -1, 2, -2, 3, -3, 4]) { const a = Math.PI / 2 + o * 0.38; this.spawns.push(new V3(Math.cos(a) * 9, DECK_Y, Math.sin(a) * 9)); }
    this.circles = []; this.boxes = []; this.inter = []; this.nodes = [];
  }
  h() { return -12; }
  ground(x, z) { return Math.hypot(x, z) < ARENA_R + 0.3 ? DECK_Y : -12; }
  blocked(x, z) { return Math.hypot(x, z) > ARENA_R - 0.6; }
  collide() {}
  surfaceAt(x, z) { return Math.hypot(x, z) < ARENA_R + 0.3 ? DECK_Y : WATER_Y; }
  update() {}
}
