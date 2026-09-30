'use strict';
/* =========================================================
   Sky, liquid, planets and boss arenas
   ========================================================= */
const WATER_Y = 0;
const DECK_Y = 1.5;
const ARENA_R = 17;
const smooth = (a, b, x) => { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// how big the planets are: an island PLANET_R across from the landing pad to the shore (Gigopolis is a flat
// city out to CITY_R, then the harbor), on a ground grid of 2 m squares. Everything scattered around (and the
// critters) spreads out over all of it.
const PLANET_R = 90, CITY_R = 92;
const LAKE_D = 0.45; // (the deepest a pond on a planet gets: see PlanetWorld.rawH)
const NODE_VIEW = 80; // (pickups further away than this aren't drawn)
const TERRAIN_S = 280, TERRAIN_N = 140; // planet ground: 280 m square, 140 x 140 grid
// the Luckstar Casino: one big hall west of the landing pad, front door facing the ship
const CASINO_HALL = { x: -29, z: 0, w: 26, d: 30, h: 8, t: 0.5, door: 2.6 };

/* ---------- Spookulon: fenced graveyards (gate: which side the way in is on) and a haunted mansion ---------- */
const SPOOK_YARDS = [
  { x: 42, z: 28, w: 16, d: 14, gate: 'w', name: 'REST IN PIECES', ghosts: 4, crypt: true },
  { x: -42, z: -22, w: 16, d: 14, gate: 'e', name: 'BONEYARD', ghosts: 4 },
  { x: -22, z: 50, w: 14, d: 12, gate: 's', name: 'THE PLOT THICKENS', ghosts: 4 },
  { x: 42, z: -36, w: 12, d: 12, gate: 'w', name: 'DEAD END', ghosts: 3 },
  { x: 62, z: -2, w: 12, d: 14, gate: 'w', name: 'NO REST FOR THE WICKED', ghosts: 3 },
  { x: -10, z: -66, w: 14, d: 12, gate: 'n', name: 'LAST STOP', ghosts: 3 },
];
const SPOOK_MANSION = { x: -54, z: 14 };

/* ---------- Nimbus-9: islands of solid-ish cloud, with nothing but more cloud in between ---------- */
const NIMBUS_ISLANDS = [
  { x: 0, z: 0, r: 27 },   // the landing island
  { x: 0, z: -43, r: 13 }, // the boss altar
  { x: 60, z: 4, r: 15 },
  { x: -60, z: 0, r: 15 },
  { x: 2, z: 62, r: 14 },
  { x: 58, z: -44, r: 13 },
  { x: -58, z: 44, r: 13 },
];
const NIMBUS_BRIDGES = [[0, -20, 0, -34, 3], [20, 2, 49, 4, 2.4], [-20, 0, -49, 0, 2.4], [1, 20, 2, 50, 2.2], [60, -9, 58, -33, 2.2], [-60, 13, -58, 33, 2.2]]; // x0, z0, x1, z1, half width
// floating islands. Low ones: an updraft on the ground (at angle va from the island) carries you up.
// High ones: the updraft is on the island below (from), heading off at angle a. big: how many big pearls
const NIMBUS_FLOATERS = [
  { x: 18, z: 16, r: 5, top: 8, va: -2.41 },
  { x: -20, z: -14, r: 5, top: 9, va: 0.6 },
  { x: 62, z: 22, r: 5, top: 8, va: -1.62 },
  { x: -62, z: -18, r: 5, top: 8, va: 1.52 },
  { from: 0, a: 0.93, r: 4.5, top: 15, big: 1 },
  { from: 1, a: -2.21, r: 4.5, top: 17, big: 1 },
  { from: 2, a: 2.09, r: 4.5, top: 16, big: 1 },
  { from: 3, a: 1.47, r: 4.5, top: 16, big: 1 },
  { from: 4, a: 2.5, r: 5, top: 23, big: 2 },
  { x: 70, z: -52, r: 5, top: 9, va: 2.55 },
  { x: -70, z: 52, r: 5, top: 9, va: -0.59 },
  { from: 9, a: -0.9, r: 4.5, top: 16, big: 1 },
  { from: 10, a: 2.2, r: 4.5, top: 16, big: 1 },
];
// the four outer islands sit a bit further out than they were drawn above (NIMBUS_SPREAD times as far from
// the landing island), and everything on them goes with them: their floating islands, the ends of the
// bridges out to them, the weather station. Then: work out where the high islands and every updraft go.
const NIMBUS_SPREAD = 1.12;
const nimbusMove = (x, z) => { // how far the island under (x, z) moved
  for (let i = 2; i < NIMBUS_ISLANDS.length; i++) {
    const s = NIMBUS_ISLANDS[i];
    if (Math.hypot(x - s.x, z - s.z) < s.r + 12) return [s.x * (NIMBUS_SPREAD - 1), s.z * (NIMBUS_SPREAD - 1)];
  }
  return [0, 0];
};
(() => {
  for (const f of NIMBUS_FLOATERS) if (f.from == null) { const [dx, dz] = nimbusMove(f.x, f.z); f.x += dx; f.z += dz; }
  for (const b of NIMBUS_BRIDGES) {
    const [ax, az] = nimbusMove(b[0], b[1]), [bx, bz] = nimbusMove(b[2], b[3]);
    // (an end that moved reaches a little further onto its island, so the bridge still meets it)
    const l = Math.hypot(b[2] - b[0], b[3] - b[1]) || 1, ux = (b[2] - b[0]) / l, uz = (b[3] - b[1]) / l;
    if (ax || az) { b[0] += ax - ux * 1.5; b[1] += az - uz * 1.5; }
    if (bx || bz) { b[2] += bx + ux * 1.5; b[3] += bz + uz * 1.5; }
  }
  for (let i = 2; i < NIMBUS_ISLANDS.length; i++) { const s = NIMBUS_ISLANDS[i]; s.x *= NIMBUS_SPREAD; s.z *= NIMBUS_SPREAD; }
  for (const f of NIMBUS_FLOATERS) {
    if (f.from == null) { f.vx = f.x + Math.cos(f.va) * (f.r + 2.4); f.vz = f.z + Math.sin(f.va) * (f.r + 2.4); continue; }
    const src = NIMBUS_FLOATERS[f.from], c = Math.cos(f.a), sn = Math.sin(f.a);
    f.vx = src.x + c * (src.r - 1.3); f.vz = src.z + sn * (src.r - 1.3);
    f.x = f.vx + c * (f.r + 2.4); f.z = f.vz + sn * (f.r + 2.4);
  }
})();
function nimbusH(x, z) {
  let best = -12;
  NIMBUS_ISLANDS.forEach((s, i) => {
    const dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
    const e = d / (s.r * (1 + 0.1 * Math.sin(3 * a + i * 1.7) + 0.05 * Math.cos(5 * a + i)));
    if (e >= 1) return;
    const bump = Math.sin(x * 0.23 + i) * Math.cos(z * 0.19 - i) * 0.35 * U.clamp((1 - e) * 3, 0, 1);
    best = Math.max(best, (e < 0.8 ? 2 : 2 - ((e - 0.8) / 0.2) * 1.7) + bump);
  });
  for (const [x0, z0, x1, z1, hw] of NIMBUS_BRIDGES) {
    const vx = x1 - x0, vz = z1 - z0, t = U.clamp(((x - x0) * vx + (z - z0) * vz) / (vx * vx + vz * vz), 0, 1);
    const d = Math.hypot(x - x0 - vx * t, z - z0 - vz * t);
    if (d < hw) best = Math.max(best, 2 - Math.max(0, d / hw - 0.6) * 3);
  }
  return best;
}

/* ---------- Gigopolis: a grid of streets and buildings (door: which side the front door is on) ---------- */
const CITY_BUILDINGS = [
  { x: 16, z: 16, w: 8, d: 7, h: 5, door: 'w', name: 'Grind Coffee', neon: 'COFFEE' },
  { x: 40, z: -6, w: 12, d: 12, h: 18, door: 'w', name: 'Unicorn Tower', neon: 'UNICORN TOWER', ad: ['HUSTLE HARDER', 'SLEEP IS A SCAM'] },
  { x: 38, z: 12, w: 10, d: 10, h: 9, door: 'w', name: 'Apartment 4B' },
  { x: -39, z: -6, w: 12, d: 12, h: 14, door: 'e', name: 'Hustle Hub Co-Working', neon: 'HUSTLE HUB', ad: ['GRINDSET ENERGY', 'NOW 900% MORE CAFFEINE'] },
  { x: -38, z: 12, w: 10, d: 10, h: 6, door: 'e', name: 'Laundromat', neon: 'WASH & FOLD' },
  { x: 12, z: 38, w: 10, d: 8, h: 7, door: 's', name: 'Pixel Pizza (Not Ours)', neon: 'PIXEL PIZZA' },
  { x: -12, z: 38, w: 12, d: 8, h: 12, door: 's', name: 'Crypto Bro Loft', neon: 'TO THE MOON', ad: ['CEO CHAD SAYS:', 'WORK MORE. EARN LESS.'] },
  { x: 0, z: 50, w: 10, d: 6, h: 10, door: 's', name: 'Bank of Gigopolis', neon: 'BANK', ad: ['RENT IS DUE', 'ALWAYS'] },
  { x: 34, z: 35, w: 8, d: 8, h: 5, door: 'w', name: 'Corner Store' },
  { x: -34, z: 35, w: 8, d: 8, h: 6, door: 'e', name: 'Payday Pawn' },
  { x: -35, z: -33, w: 8, d: 8, h: 8, door: 'e', name: 'Storage Units' },
  { x: 35, z: -33, w: 8, d: 8, h: 7, door: 'w', name: 'Startup Garage' },
  { x: -14, z: -36, w: 8, d: 10, h: 10, door: 'e', name: 'Parking Garage' },
  { x: 14, z: -36, w: 8, d: 10, h: 13, door: 'w', name: 'Tiny Apartments', neon: 'MICRO LIVING' },
  // further out (the city goes all the way to the harbor now)
  { x: 55, z: 2, w: 10, d: 14, h: 12, door: 'w', name: 'Server Farm', neon: 'THE CLOUD' },
  { x: -55, z: 2, w: 10, d: 14, h: 9, door: 'e', name: 'Mega Mall', neon: 'MEGA MALL', ad: ['EVERYTHING MUST GO', 'INCLUDING YOU'] },
  { x: 52, z: 46, w: 10, d: 10, h: 16, door: 'w', name: 'Luxury Lofts', neon: 'LOFTS' },
  { x: -52, z: 46, w: 10, d: 10, h: 7, door: 'e', name: 'Thrift Shop', neon: 'THRIFT' },
  { x: 52, z: -44, w: 10, d: 10, h: 8, door: 'w', name: 'Gains Gym', neon: 'GAINS' },
  { x: -52, z: -44, w: 10, d: 10, h: 6, door: 'e', name: 'Ramen Hut', neon: 'RAMEN' },
  { x: 76, z: 0, w: 8, d: 12, h: 5, door: 'w', name: 'Car Wash' },
  { x: -76, z: 0, w: 8, d: 12, h: 8, door: 'e', name: 'Arcade', neon: 'ARCADE' },
  { x: 0, z: 76, w: 14, d: 8, h: 22, door: 's', name: 'Grindset Plaza', neon: 'GRINDSET PLAZA', ad: ['CEO CHAD', 'IS WATCHING'] },
  { x: 0, z: -74, w: 14, d: 8, h: 7, door: 'n', name: 'Recycling Center', neon: 'RECYCLING' },
];
const CITY_ROADS = [ // x0, x1, z0, z1
  [22.5, 29.5, -85, 85], [-29.5, -22.5, -85, 85], [-85, 85, -23.5, -16.5], [-85, 85, 22.5, 29.5], [-4, 4, -34, -10],
  [62.5, 69.5, -80, 80], [-69.5, -62.5, -80, 80], [-80, 80, -63.5, -56.5], [-80, 80, 62.5, 69.5],
];
const onRoad = (x, z) => CITY_ROADS.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1);

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
  const arena = G.mode === 'boss' || G.mode === 'duel'; // (in the arena, not on the planet)
  const dim = arena && ARENA_SKIN[cfg.id] ? ARENA_SKIN[cfg.id].light || 1 : 1;
  G.sun.color.set(cfg.sun[0]);
  G.sun.intensity = cfg.sun[1] * dim;
  G.hemi.color.set(cfg.hemi[0]);
  G.hemi.groundColor.set(cfg.hemi[1]);
  G.hemi.intensity = cfg.hemi[2] * dim;
  G.liquid.set(cfg.liquid);
  G.liquid.setWorld(arena ? null : G.worlds[PLANETS.indexOf(cfg)]); // (where its shore is, for the foam)
  // how much things glow (bloom) depends on how bright the place is: bright planets bloom a lot less,
  // or their pastel ground and sunlit mushrooms turn into white glare
  const mood = cfg.mood || (cfg.stars > 0.5 ? 'night' : 'day');
  // critters get an edge that stands out: a dark outline on bright planets, a pale glow on dark ones
  const cr = HI_U.crit;
  if (mood === 'night') { cr.uRim.value.set(cfg.critEdge || '#ffffff'); cr.uRimK.value = 0.5; } else { cr.uRim.value.setRGB(-1, -1, -1); cr.uRimK.value = 0.62; }
  Post.setMood(bossTint || arena ? (mood === 'night' ? 'boss' : 'bossDay') : cfg.stars >= 1 && !(cfg.bodies || []).length ? 'space' : mood);
}

/* ---------------- liquid sea (water / goo / gold / lava) ----------------
   The sea round every planet (and the ponds on it). It bobs a little, but mostly it FLOWS: ripples
   drift across it (see LIQUID_LOOK), and foam laps at the shore, coming in in bands and washing out
   again. The foam knows where the shore is from a picture of the planet's depth (see Liquid.setWorld). */
// how each kind of liquid moves: speed (how fast its ripples drift), size (bigger: wider ripples), line: how
// much its ripple lines light up (and in what color), foam (color, how much), bob: how high it heaves
const LIQUID_LOOK = {
  water: { speed: 1, size: 1, line: ['#ffffff', 0.55], foam: ['#ffffff', 0.9], bob: 0.07 },
  goo: { speed: 0.55, size: 1.5, line: ['#ffffff', 0.3], foam: ['#ffffff', 0.55], bob: 0.05 },
  gold: { speed: 0.7, size: 1.2, line: ['#fff6c8', 0.6], foam: ['#fff3b0', 0.8], bob: 0.05 },
  lava: { speed: 0.3, size: 1.8, line: ['#ffe066', 0.85], foam: ['#2a0a00', 0.8], bob: 0.04 },
  cloud: { speed: 0.35, size: 2.4, line: ['#ffffff', 0.35], foam: ['#ffffff', 0.4], bob: 0.1 },
};
const liquidKind = (cfg) => cfg.kind || (/lava/.test(cfg.name) ? 'lava' : /cloud/.test(cfg.name) ? 'cloud' : /gold/.test(cfg.name) ? 'gold' : /goo|sludge|ecto/.test(cfg.name) ? 'goo' : 'water');
function waveH(x, z, t, k = 1) {
  return (Math.sin(x * 0.18 + t * 1.1) * 0.4 + Math.cos(z * 0.21 + t * 0.9) * 0.35 + Math.sin((x + z) * 0.07 + t * 0.6) * 0.25) * k;
}
class Liquid {
  constructor(scene) {
    const geo = new THREE.PlaneGeometry(340, 340, 60, 60);
    geo.rotateX(-Math.PI / 2);
    this.geo = geo;
    this.base = Float32Array.from(geo.attributes.position.array);
    this.mat = new THREE.MeshPhongMaterial({ color: '#2fb7d6', transparent: true, opacity: 0.88, shininess: 70, specular: 0x555555, flatShading: true });
    // (the ripples and the foam, painted on in the shader)
    this.u = {
      uTime: { value: 0 }, uDepth: { value: Liquid.deep() }, uBox: { value: new THREE.Vector4(-140, -140, 280, 280) },
      uLine: { value: new THREE.Color('#ffffff') }, uLineK: { value: 0.45 }, uFoam: { value: new THREE.Color('#ffffff') }, uFoamK: { value: 0.9 },
      uSpeed: { value: 1 }, uSize: { value: 1 },
    };
    this.mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.u);
      sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = `varying vec3 vWp;
uniform float uTime, uLineK, uFoamK, uSpeed, uSize; uniform sampler2D uDepth; uniform vec4 uBox; uniform vec3 uLine, uFoam;
` + sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', `vec4 diffuseColor = vec4( diffuse, opacity );
  {
    vec2 p = vWp.xz / uSize; float t = uTime * uSpeed;
    // two sets of ripples drifting different ways (wobbly lines where each one crosses zero)
    float w1 = abs(sin(dot(p, vec2(0.36, 0.14)) + t * 1.5 + sin(p.y * 0.21 + t * 0.9) * 1.6));
    float w2 = abs(sin(dot(p, vec2(-0.13, 0.4)) - t * 1.15 + sin(p.x * 0.17 - t * 0.7) * 1.6));
    float lines = 1.0 - smoothstep(0.0, 0.16, min(w1, w2));
    // (and broad lighter and darker swells rolling along under them)
    float shade = 0.5 + 0.5 * sin(dot(p, vec2(0.09, 0.12)) + t * 0.8 + sin(p.x * 0.05 - t * 0.3) * 2.0);
    diffuseColor.rgb *= 0.82 + 0.3 * shade;
    // foam at the shore: right at the edge, and bands of it washing in toward the land
    float d = texture2D(uDepth, (vWp.xz - uBox.xy) / uBox.zw).r * 3.0;
    float edge = 1.0 - smoothstep(0.03, 0.3, d + 0.06 * sin(uTime * 1.7 + vWp.x * 0.5 + vWp.z * 0.4));
    float band = smoothstep(0.6, 0.78, fract(d * 1.3 + uTime * 0.32 * uSpeed)) * (1.0 - smoothstep(0.3, 1.3, d));
    diffuseColor.rgb = mix(diffuseColor.rgb, uLine, lines * uLineK * (0.55 + 0.45 * shade) * smoothstep(0.1, 0.5, d + 0.3));
    diffuseColor.rgb = mix(diffuseColor.rgb, uFoam, clamp(max(edge, band * 0.9) * uFoamK, 0.0, 1.0));
  }`);
    };
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.cell = 340 / 60;
    this.bob = 0.07;
  }
  // (no shore anywhere: deep all over)
  static deep() {
    if (!Liquid._deep) { Liquid._deep = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat); Liquid._deep.needsUpdate = true; }
    return Liquid._deep;
  }
  set(cfg) {
    this.mat.color.set(cfg.color);
    this.mat.opacity = cfg.op;
    this.mat.emissive.set(cfg.glow ? cfg.color : '#000000');
    this.mat.emissiveIntensity = cfg.glow ? 0.45 : 0;
    const L = LIQUID_LOOK[liquidKind(cfg)] || LIQUID_LOOK.water;
    this.u.uLine.value.set(L.line[0]); this.u.uLineK.value = L.line[1];
    this.u.uFoam.value.set(L.foam[0]); this.u.uFoamK.value = L.foam[1];
    this.u.uSpeed.value = L.speed; this.u.uSize.value = L.size;
    this.bob = L.bob;
  }
  // where the shore is on this planet (null: nowhere, like round a boss arena): how deep the liquid is at
  // every point of the ground grid, as a picture (made once per planet)
  setWorld(w) {
    if (!w || !w.h) { this.u.uDepth.value = Liquid.deep(); return; }
    if (!w.depthTex) {
      const N = TERRAIN_N + 1, S = TERRAIN_S, c = S / TERRAIN_N, data = new Uint8Array(N * N * 4);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const d = U.clamp((WATER_Y - w.h(i * c - S / 2, j * c - S / 2)) / 3, 0, 1) * 255, k = (j * N + i) * 4;
        data[k] = data[k + 1] = data[k + 2] = d; data[k + 3] = 255;
      }
      const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
      tex.magFilter = tex.minFilter = THREE.LinearFilter;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
      w.depthTex = tex;
    }
    this.u.uDepth.value = w.depthTex;
    // (the picture's corners are the middles of the edge cells)
    const c = TERRAIN_S / TERRAIN_N;
    this.u.uBox.value.set(-TERRAIN_S / 2 - c / 2, -TERRAIN_S / 2 - c / 2, TERRAIN_S + c, TERRAIN_S + c);
  }
  update(t, cx, cz) {
    const ox = Math.round(cx / this.cell) * this.cell, oz = Math.round(cz / this.cell) * this.cell;
    this.mesh.position.set(ox, WATER_Y, oz);
    this.u.uTime.value = t;
    const p = this.geo.attributes.position.array, b = this.base, k = this.bob;
    for (let i = 0; i < p.length; i += 3) p[i + 1] = waveH(b[i] + ox, b[i + 2] + oz, t, k);
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

function equipmentStandLayout(shopId) {
  const stock = SHOPS[shopId].items.filter(it => it.kind !== 'hat'), guns = stock.filter(it => it.kind === 'zap');
  const bags = stock.filter(it => it.kind === 'cargo'), footwear = stock.filter(it => ['boots','skates','dash','stomp','springs','socks'].includes(it.kind));
  const gear = stock.filter(it => !guns.includes(it) && !bags.includes(it) && !footwear.includes(it));
  const cap = Math.min(MAGNET.length - 1, PLANETS.findIndex(p => p.shop === shopId) + 1);
  const magnet = { kind:'magnet', lvl:cap, price:MAGNET[cap].price, name:cap === 1 ? 'Pickup Magnet' : 'Magnet Upgrade ' + cap };
  gear.push(magnet);
  const gunSpan = guns.length > 1 ? 2.6 : 1.8, bay = .92;
  const width = Math.max(3.5, gunSpan + bay * (!!bags.length + !!footwear.length) + .28, gear.length * .73 + .3);
  const gunZ = (bags.length ? bay / 2 : 0) - (footwear.length ? bay / 2 : 0);
  const rackScale = .58, keeperZ = width * rackScale / 2 + .3;
  return { x:17.8, z:-5.8, width, depth:1.9, gunSpan, gunZ, guns, bags, footwear, gear, magnet,
    bagZ:-width / 2 + .5, bootZ:width / 2 - .5,
    rackScale, rackX:-.15, rackZ:-1.055, shackWidth:width * rackScale + 2.55, shackDepth:3,
    keeperX:.8, keeperZ, sellX:17.8 - .88, sellZ:-5.8 + keeperZ };
}

function tradeTagLines(it) {
  const inf = Shop.itemInfo(it);
  return [inf.name, inf.owned ? 'OWNED' : U.bucks(it.price)];
}
function updateTradeTag(tag, lines) {
  const text = lines.join('\n');
  if (tag.userData.tradeText === text) return;
  const next = signMesh(lines, tag.geometry.parameters.width, tag.geometry.parameters.height,
    { bg:'#172126', color:lines.includes('OWNED') ? '#b8dfc2' : '#eadbb6', border:false });
  tag.material.map.dispose(); tag.material.dispose(); tag.material = next.material;
  next.geometry.dispose(); tag.userData.tradeText = text;
}
function scopeTradeLines(id) {
  if (!id) return ['Iron sights', 'REMOVE SCOPE'];
  const s = SIGHTS[id], zoom = (Math.tan(((G.settings && G.settings.fov) || 72) * PI / 360) / Math.tan(s.zoom * PI / 360)).toFixed(1) + '×';
  return [s.short + ' · ' + zoom, !planetUnlocked(s.planet) ? 'LOCKED' : (SAVE.sights || []).includes(id) ? 'OWNED' : U.bucks(s.price)];
}

// A low, miniature display inside the supply shack: only this planet's stock.
function buildEquipmentStand(shopId) {
  const L = equipmentStandLayout(shopId), g = new THREE.Group(), displays = [];
  g.name = 'Compact planet equipment stand'; g.userData.dynamic = true;
  const frame = '#39464c', trim = '#95a4a6', dark = '#1a252b', accent = SHOPS[shopId].color;
  const label = (lines, w, h, x, y, z) => {
    const tag = signMesh(lines, w, h, { bg:'#172126', color:'#eadbb6', border:false });
    tag.position.set(x, y, z); tag.rotation.y = -PI / 2; g.add(tag); return tag;
  };
  const display = (model, limits, x, y, z, options = {}) => {
    inventoryFit(model, limits, x, y, z); g.add(model);
    const aim = new THREE.Box3().setFromObject(model).getCenter(new V3());
    displays.push({ x:-1.05, z, y:aim.y, aim, model, ...options });
    return displays[displays.length - 1];
  };
  mk(BOX(1.7,.08,L.width),frame,g,0,.04,0);
  mk(BOX(.09,1.6,L.width),'#293940',g,.73,.88,0);
  for (let z = -L.width / 2 + .22; z < L.width / 2; z += .45) mk(BOX(.025,1.4,.018),'#45555c',g,.67,.88,z);
  for (const z of [-L.width / 2 + .06, L.width / 2 - .06]) {
    mk(BOX(.09,2.63,.1),frame,g,.7,1.34,z);
    mk(BOX(1.7,.055,.09),trim,g,0,.1,z);
  }
  mk(BOX(.12,.28,L.width + .06),frame,g,.69,2.5,0);
  label(['FIELD EQUIPMENT'],L.width-.3,.22,.61,2.5,0);
  mk(BOX(.65,.08,L.width+.1),frame,g,.45,2.7,0);
  mk(BOX(.35,.02,L.width-.25),'#dfdccd',g,.36,2.646,0,{emissive:'#504732'});
  mk(BOX(.02,.035,L.width-.2),accent,g,.61,2.31,0);

  // Small guns lie on the central worktop; the floor bays remain visible beside it.
  mk(BOX(1.12,.12,L.gunSpan),frame,g,-.16,1.13,L.gunZ);
  for (const z of [L.gunZ-L.gunSpan/2+.08,L.gunZ+L.gunSpan/2-.08])
    for (const x of [-.62,.28]) mk(BOX(.07,1.02,.07),frame,g,x,.57,z);
  L.guns.forEach((it,i) => {
    const z = L.gunZ + (i - (L.guns.length - 1) / 2) * 1.3;
    mk(BOX(.96,.025,1.2),dark,g,-.16,1.204,z);
    const gun = GunDesigns.build(ZAPPERS[it.lvl].type); gun.rotation.z = PI / 2;
    display(gun,[.88,.3,1.1],-.16,1.23,z,{it,tag:label(tradeTagLines(it),1.22,.26,-.75,1.05,z)});
  });

  // Vacuums, tools, grenades and upgrades share one upper shelf.
  mk(BOX(.75,.08,L.width-.16),frame,g,.27,1.74,0);
  const spacing = (L.width-.22) / L.gear.length;
  L.gear.forEach((initial,i) => {
    const z = (i - (L.gear.length - 1) / 2) * spacing;
    const getItem = initial.kind === 'magnet' ? () => Shop.magnetStock(shopId) || L.magnet : () => initial;
    const model = Thumbs.model(Thumbs.shopKey(initial)).o; model.rotation.y = -PI / 2;
    mk(BOX(.59,.02,spacing-.08),dark,g,.25,1.79,z);
    display(model,[.58,.46,spacing-.12],.25,1.805,z,{getItem,tag:label(tradeTagLines(getItem()),spacing-.035,.24,-.14,1.64,z)});
  });
  L.bags.forEach((it,i) => {
    const z = L.bagZ + (i - (L.bags.length - 1) / 2) * .7, lean = new THREE.Group();
    const bag = buildBackpackItem(it.lvl); bag.rotation.y = -PI / 2; lean.add(bag); lean.rotation.z = -.15;
    display(lean,[.48,.88,.75],.43,.09,z,{it,tag:label(tradeTagLines(it),.87,.24,-.48,.25,z)});
  });
  L.footwear.forEach((it,i) => {
    const y = .13 + i * .57, x = L.footwear.length > 1 && i === 0 ? -.28 : .27;
    const boots = ITEM_MODELS[it.kind](); boots.rotation.y = -PI / 2;
    mk(BOX(.83,.06,.85),frame,g,x,y-.02,L.bootZ);
    display(boots,[.65,.46,.7],x,y+.035,L.bootZ,{it,tag:label(tradeTagLines(it),.87,.23,x-.47,y+.03,L.bootZ)});
  });

  // Scope fittings live in the stand, with the existing planet-unlock rules.
  const ids = ['',...Object.keys(SIGHTS)], span = L.gunSpan, scopeStep = span / ids.length;
  mk(BOX(.48,.07,span),frame,g,-.86,.61,L.gunZ);
  ids.forEach((id,i) => {
    const z = L.gunZ + (i - (ids.length - 1) / 2) * scopeStep;
    const scope = id ? buildSight(id) : new THREE.Group();
    if (!id) for (const zz of [-.1,.1]) mk(BOX(.1,.1,.025),trim,scope,0,.05,zz);
    scope.rotation.y = -PI / 2;
    mk(BOX(.38,.018,scopeStep-.045),dark,g,-.86,.658,z);
    display(scope,[.32,.23,scopeStep-.07],-.86,.677,z,{sight:id,tag:label(scopeTradeLines(id),scopeStep-.02,.23,-1.11,.54,z)});
  });
  g.scale.setScalar(L.rackScale);
  g.userData.displays = displays; g.userData.layout = L;
  return g;
}

function buildEquipmentShack(shopId) {
  const L = equipmentStandLayout(shopId), g = new THREE.Group(), half = L.shackWidth / 2;
  g.name = 'Planet supply shack'; g.userData.dynamic = true;
  const wood = '#75604b', pale = '#907758', frame = '#3d3934', metal = '#44525a';
  const roofColor = new THREE.Color(metal).lerp(new THREE.Color(SHOPS[shopId].color), .2);
  // Closed plank walls and a solid pitched metal roof, with the whole front open.
  mk(BOX(3.12,.07,L.shackWidth),frame,g,.14,.025,0);
  mk(BOX(.12,3.38,L.shackWidth),wood,g,1.64,1.73,0);
  for (let z = -half + .16; z < half; z += .32)
    mk(BOX(.12,3.23,Math.min(.31,half-z+.15)),Math.round((z+half)/.32)%2 ? wood : pale,g,1.58,1.66,z);
  for (const z of [-half,half]) {
    for (let i = 0; i < 12; i++) mk(BOX(2.78,.265,.12),i%3 ? wood : pale,g,.16,.18+i*.265,z);
    for (const x of [-1.19,1.56]) mk(BOX(.15,3.28,.16),frame,g,x,1.68,z);
    mk(BOX(2.78,.1,.18),frame,g,.16,.14,z);
    mk(BOX(2.78,.1,.18),frame,g,.16,2.94,z);
    const fascia = mk(BOX(2.96,.4,.16),wood,g,.16,3.23,z); fascia.rotation.z = .08;
  }
  const roof = mk(BOX(3.4,.12,L.shackWidth+.42),roofColor,g,.08,3.49,0); roof.rotation.z = .08;
  for (let z = -half-.16; z <= half+.16; z += .24) {
    const rib = mk(BOX(3.4,.035,.035),metal,g,.08,3.572,z); rib.rotation.z = .08;
  }
  mk(BOX(.13,.13,L.shackWidth+.45),frame,g,-1.6,3.37,0);
  // A modest sign and warm strip light leave the keeper's face unobstructed.
  const sign = signMesh(['FIELD SUPPLIES'],L.shackWidth-.45,.3,{bg:'#29352f',color:'#eadbb6',border:false});
  sign.position.set(-1.671,3.33,0); sign.rotation.y = -PI/2; g.add(sign);
  const name = signMesh([SHOPS[shopId].npc],1.8,.2,{bg:'#3d3329',color:'#f1e4cd',border:false});
  name.position.set(-1.42,3.1,L.keeperZ); name.rotation.y = -PI/2; g.add(name);
  mk(BOX(.1,.035,L.shackWidth-.4),'#ffe5b6',g,-1.3,3.16,0,{emissive:'#9a6531'});
  // Small back-room details help the keeper feel housed, rather than hidden by a rack.
  for (const [x,z] of [[1.03,L.keeperZ+.54],[1.03,L.keeperZ-.61]]) {
    mk(BOX(.43,.4,.38),wood,g,x,.28,z);
    for (const y of [.12,.43]) mk(BOX(.46,.055,.4),frame,g,x,y,z);
  }
  mergeLocal(g); g.userData.layout = L;
  return g;
}

function buildCompactSellStation() {
  const g = new THREE.Group(); g.name = 'Sell loot station';
  mk(BOX(.78,.72,1.64),'#537263',g,0,.4,0);
  mk(BOX(.9,.1,1.8),'#293b35',g,0,.82,0);
  for (const z of [-.71,.71]) mk(BOX(.09,.17,.12),'#a4b5ad',g,-.26,.085,z);
  mk(BOX(.59,.035,1.29),'#182923',g,-.02,.894,0);
  for (const z of [-.67,.67]) mk(BOX(.66,.095,.04),'#78978a',g,-.02,.94,z);
  const tag = signMesh(['SELL LOOT','FAVOURITES KEPT'],1.5,.43,{bg:'#18302a',color:'#d4f4dc',border:false});
  tag.rotation.y = -PI/2; tag.position.set(-.398,.47,0); g.add(tag);
  const receipt = signMesh(['SELL'],.46,.17,{bg:'#284b3b',color:'#e6eee8',border:false});
  receipt.rotation.y = -PI/2; receipt.position.set(.16,.96,.53); g.add(receipt);
  mk(BOX(.19,.12,.36),'#35413e',g,.23,.91,.53);
  g.userData.tag = tag; return g;
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
    this.plats = [];  // flat rooftops you can stand on (rectangles)
    this.vents = [];  // updrafts and jump pads (see LocalPlayer.update)
    this.occupied = [];
    this.indoors = []; // inside buildings (critters stay out)
    this.ph = idx * 1.7 + 0.4;
    this.rng = U.seeded(1000 + idx * 777);
    this.pads = [];
    this.spawn = new V3(6, 0, 5);
    this.spawnYaw = 0;

    // pads keep the ground flat under buildings
    this.addPad(0, 0, 11);
    this.addPad(16, -6, 6);
    const stand = equipmentStandLayout(this.cfg.shop);
    this.addFlat(stand.x - 2.7, stand.x + 2.2, stand.z - stand.shackWidth / 2 - .7, stand.z + stand.shackWidth / 2 + .7, this.rawH(16, -6));
    this.addPad(0, -38, 6);
    this.addPad(-12, 10, 3);
    if (this.cfg.id === 'luck') {
      // the casino floor (and the plaza out front) sits level with the landing pad
      const C = CASINO_HALL;
      this.addFlat(C.x - C.w / 2 - 2, C.x + C.w / 2 + 7, C.z - C.d / 2 - 2, C.z + C.d / 2 + 2, this.pads[0].h);
    }
    if (this.cfg.id === 'spook') {
      // flat ground for the graveyards and the mansion
      for (const y of SPOOK_YARDS) this.addFlat(y.x - y.w / 2 - 1, y.x + y.w / 2 + 1, y.z - y.d / 2 - 1, y.z + y.d / 2 + 1, this.rawH(y.x, y.z));
      const M = SPOOK_MANSION;
      this.addFlat(M.x - 6, M.x + 6, M.z - 10, M.z + 10, this.rawH(M.x, M.z));
    }
    if (this.cfg.id === 'zorb') {
      this.addPad(0, -52, 16);
      for (const [x, z] of [[-10, -30], [10, -30], [-22, -20], [22, -20]]) this.addPad(x, z, 2);
    }

    Fun.reserve(this); // (room for the planet's fun thing, before anything else gets put there)
    this.buildTerrain();
    this.buildShipArea();
    this.buildBeacon();
    this['build_' + this.cfg.id]();
    Fun.build(this);
    mergeStatic(this.stat);
    this.spawn.y = this.h(this.spawn.x, this.spawn.z) + 0.1;
    this.spawnYaw = Math.atan2(-(16 - this.spawn.x), -(-6 - this.spawn.z));
  }

  /* ----- terrain ----- */
  rawH(x, z) {
    if (this.cfg.islands) return nimbusH(x, z);
    const a = Math.atan2(z, x), r = Math.hypot(x, z), ph = this.ph;
    const R = this.cfg.city ? CITY_R : PLANET_R * (1 + 0.08 * Math.sin(3 * a + ph) + 0.05 * Math.cos(5 * a + ph * 2));
    const e = r / R;
    let base = e < 0.75 ? 2.0 : e < 1 ? 2.0 - ((e - 0.75) / 0.25) * 1.7 : 0.3 - (e - 1) * 30;
    if (this.cfg.city) base = e < 0.9 ? 2.0 : e < 1 ? 2.0 - ((e - 0.9) / 0.1) * 1.7 : 0.3 - (e - 1) * 30; // (a flat city, then the harbor)
    base = Math.max(base, -6);
    const amp = this.cfg.amp;
    const n = (Math.sin(x * 0.09 + ph) * Math.cos(z * 0.08 - ph) + 0.5 * Math.sin(x * 0.21 + z * 0.17 + ph * 3)) * amp;
    const inland = U.clamp((1 - e) * 4, 0, 1);
    const calm = 0.2 + 0.8 * smooth(12, 34, r); // gentle ground around the landing site
    const hh = base + n * inland * calm;
    // ponds and lakes on the island: never deeper than LAKE_D, so you can wade right across them (the sea
    // out past the shore gets deep, see LocalPlayer.update)
    if (hh >= 0 || e >= 0.9) return hh;
    return U.lerp(hh, -LAKE_D * (1 - Math.exp(hh / LAKE_D)), U.clamp((0.9 - e) / 0.15, 0, 1));
  }
  addPad(x, z, r) { this.pads.push({ x, z, r, h: this.rawH(x, z) }); }
  // a flat rectangle of ground at height h (for big buildings)
  addFlat(x0, x1, z0, z1, h) { this.pads.push({ x0, x1, z0, z1, h }); }
  // how far a point is from the edge of a pad (0 or less: on it)
  padDist(p, x, z) {
    if (p.r != null) return Math.hypot(x - p.x, z - p.z) - p.r;
    return Math.hypot(Math.max(p.x0 - x, 0, x - p.x1), Math.max(p.z0 - z, 0, z - p.z1));
  }
  h(x, z) {
    let h = this.rawH(x, z);
    for (const p of this.pads) {
      const d = this.padDist(p, x, z);
      if (d < 4) h = U.lerp(p.h, h, smooth(0, 4, d));
    }
    return h;
  }
  // the height of the ground you actually SEE: the terrain is drawn as flat triangles on a 2 m grid,
  // so things (and feet) go exactly on those triangles instead of hovering over the smooth curve
  gh(x, z) {
    const S = TERRAIN_S, c = S / TERRAIN_N, h0 = S / 2;
    const fx = (x + h0) / c, fz = (z + h0) / c;
    if (fx < 0 || fz < 0 || fx >= TERRAIN_N || fz >= TERRAIN_N) return this.h(x, z);
    const ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz;
    const x0 = ix * c - h0, z0 = iz * c - h0;
    const ha = this.h(x0, z0), hb = this.h(x0, z0 + c), hd = this.h(x0 + c, z0);
    if (u + v <= 1) return ha + (hd - ha) * u + (hb - ha) * v;
    const hc = this.h(x0 + c, z0 + c);
    return hc + (hb - hc) * (1 - u) + (hd - hc) * (1 - v);
  }
  buildTerrain() {
    const S = TERRAIN_S, N = TERRAIN_N;
    let geo = new THREE.PlaneGeometry(S, S, N, N);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, this.h(p.getX(i), p.getZ(i)));
    geo = geo.toNonIndexed();
    geo.computeVertexNormals();
    const pa = geo.attributes.position, cols = new Float32Array(pa.count * 3);
    const [cLow, cHigh, cAcc] = this.cfg.ground.map((c) => new THREE.Color(c));
    const sand = new THREE.Color(this.cfg.ground[0]).lerp(new THREE.Color('#ffffff'), 0.15);
    const tmp = new THREE.Color(), cEdge = new THREE.Color('#c9d2e6');
    const rng = U.seeded(42 + this.idx);
    for (let i = 0; i < pa.count; i += 3) {
      const y = (pa.getY(i) + pa.getY(i + 1) + pa.getY(i + 2)) / 3;
      const cx = (pa.getX(i) + pa.getX(i + 1) + pa.getX(i + 2)) / 3, cz = (pa.getZ(i) + pa.getZ(i + 1) + pa.getZ(i + 2)) / 3;
      if (this.cfg.city && y > 0.7) {
        // Gigopolis: asphalt roads, concrete sidewalks, and paving round the landing pad
        const r = Math.hypot(cx, cz);
        if (onRoad(cx, cz)) tmp.set('#2a2d38');
        else if (r < 14) tmp.set((Math.floor(cx / 3) + Math.floor(cz / 3)) & 1 ? '#6a6e7c' : '#5e6270');
        else tmp.set('#4e525e');
        tmp.multiplyScalar(0.94 + rng() * 0.08);
      } else if (this.cfg.islands) {
        // Nimbus-9: cloud-white tops, pinker bumps, greyer edges
        tmp.copy(y < 1.2 ? cEdge : cLow).lerp(cHigh, U.clamp((2.2 - y) * 0.6, 0, 1) * 0.5);
        if (rng() < 0.07) tmp.lerp(cAcc, 0.5);
        tmp.multiplyScalar(0.95 + rng() * 0.06);
      } else if (this.cfg.flat && Math.hypot(cx, cz) < PLANET_R * 0.84) {
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
  // put something on the ground. With a footprint radius it sits on the LOWEST ground under it
  // (and a little into the dirt), so no edge hangs in the air on a slope.
  place(obj, x, z, ry = 0, parent, rad = 0) {
    let y = this.gh(x, z);
    if (rad > 0) {
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; y = Math.min(y, this.gh(x + Math.cos(a) * rad, z + Math.sin(a) * rad)); }
      y -= 0.06;
    }
    obj.position.set(x, y, z);
    obj.rotation.y = ry;
    (parent || this.stat).add(obj);
    return obj;
  }
  isFree(x, z, rad) {
    for (const p of this.pads) if (this.padDist(p, x, z) < rad) return false;
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
  // Capture a compact convex footprint before static batching discards the
  // model hierarchy. Actual transformed vertices include rotation and scale.
  sceneryCollider(model) {
    model.updateWorldMatrix(true, true);
    const points = [], v = new V3(); let bot = Infinity, top = -Infinity;
    model.traverse(o => {
      if (!o.isMesh) return;
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
        points.push({ x: v.x, z: v.z }); bot = Math.min(bot, v.y); top = Math.max(top, v.y);
      }
    });
    points.sort((a,b) => a.x-b.x || a.z-b.z);
    const unique = points.filter((p,i) => !i || p.x !== points[i-1].x || p.z !== points[i-1].z);
    if (unique.length < 3) return;
    const cross = (a,b,c) => (b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
    const half = list => { const h=[]; for (const p of list) { while(h.length>1 && cross(h[h.length-2],h[h.length-1],p)<=0) h.pop(); h.push(p); } h.pop(); return h; };
    const hull = half(unique).concat(half(unique.slice().reverse()));
    const x = (unique[0].x+unique[unique.length-1].x)/2;
    const z = (Math.min(...hull.map(p=>p.z))+Math.max(...hull.map(p=>p.z)))/2;
    const r = Math.max(...hull.map(p=>Math.hypot(p.x-x,p.z-z)));
    this.circles.push({x,z,r,bot,top,hull});
  }
  sceneryPush(c, x, z, rad) {
    if (Math.abs(x-c.x)>c.r+rad || Math.abs(z-c.z)>c.r+rad) return null;
    let inside=true, best=Infinity, qx=0, qz=0, nx=0, nz=0;
    for(let i=0;i<c.hull.length;i++) {
      const a=c.hull[i], b=c.hull[(i+1)%c.hull.length], dx=b.x-a.x, dz=b.z-a.z, len2=dx*dx+dz*dz;
      if(dx*(z-a.z)-dz*(x-a.x)<-1e-8) inside=false;
      const t=U.clamp(((x-a.x)*dx+(z-a.z)*dz)/len2,0,1), px=a.x+t*dx, pz=a.z+t*dz;
      const d2=(x-px)**2+(z-pz)**2;
      if(d2<best) {best=d2;qx=px;qz=pz;const len=Math.sqrt(len2);nx=dz/len;nz=-dx/len;}
    }
    if(!inside && best>=rad*rad) return null;
    const d=Math.sqrt(best);
    if(d>1e-8) {nx=(inside?qx-x:x-qx)/d;nz=(inside?qz-z:z-qz)/d;}
    return {x:qx+nx*(rad+.0001),z:qz+nz*(rad+.0001)};
  }
  // a giant mushroom's physics (see buildMushroom: a stem h tall, then a domed cap of radius r). You stand on
  // the dome itself, the stem only stops you below the cap (so you can walk right to the middle of the cap,
  // where the berry is), you can't walk into the cap's rim head first (see blocked), and jumping up under a
  // tall one bumps your head (see ceiling). Returns the height of the top of the dome.
  mushroom(x, z, h, r) {
    const gy = this.gh(x, z), rim = gy + h + 0.28, dome = r * 0.32;
    this.caps.push({ x, z, r: r * 0.97, R: r, rim, dome, top: rim + dome, bot: gy + h - 0.1 });
    this.circles.push({ x, z, r: r * 0.28, top: gy + h - 0.3 });
    return rim + dome;
  }
  // solid: shots stop at it too (buildings)
  box(cx, cz, w, d, top = 99, solid = false) { this.boxes.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2, top, solid }); }
  interact(x, z, r, label, fn, y) { const it={ x, y: y == null ? this.h(x, z) + 1.2 : y, z, r, label, fn };this.inter.push(it);return it; }
  npc(model, x, z, ry, name, tagY = 2.7) {
    this.place(model.root, x, z, ry, this.dyn);
    if (tagY !== false) {
      const tag = textSprite(name, { size: 40, bg: 'rgba(43,29,20,.7)', scale: 0.0065 });
      tag.position.set(0, tagY, 0);
      model.root.add(tag);
    }
    // glue the body into a few meshes (fewer draw calls). The head turns to look at you, so it gets its own.
    if (model.bulb) model.bulb.userData.keep = true;
    mergeLocal(model.root, model.head ? [model.head] : []);
    if (model.head) mergeLocal(model.head);
    // (they're smooth and round: their toon shading does the shading, and taking shadows would speckle them)
    model.root.traverse((c) => { if (c.isMesh) c.receiveShadow = false; });
    this.npcs.push({ m: model, x, z, ry, t: this.rng() * 5 });
    this.circle(x, z, 0.6);
  }
  // something to collect. What's in it (loot) is decided right away, from the planet's own dice so everyone
  // in the crew sees the same thing, and (without a mesh of its own) it looks like exactly that
  addNode(kind, x, y, z, mesh, extra = {}) {
    const n = Object.assign({ id: this.nodes.length, kind, x, y, z, mesh, taken: false, hp: 1 }, extra);
    if (LOOT[kind]) n.loot = rollLoot(kind, this.rng);
    if (!mesh) n.mesh = mesh = buildLootNode(kind, n.loot);
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
    const ship = (this.parked = buildShip(true));
    ship.userData.dynamic = true;
    this.place(ship, 0, 0, 0);
    this.locker = new ShipLocker(this);
    ship.add(this.locker.root);
    this.anim.push(() => this.locker.update());
    this.box(1.48, -1.98, .36, 1.74, ship.position.y + CABIN.floor + 2.3);
    // Hull walls leave the ramp aperture open; the underbody blocks walking
    // underneath the cabin while allowing players on its raised floor through.
    this.box(0, .3, 3.3, 5.9, ship.position.y + CABIN.floor - .71);
    this.box(-1.8, .2, .3, 6.6);
    this.box(1.8, -2.25, .3, 2.5);
    this.box(1.8, 2.45, .3, 2.1);
    this.box(0, -3.55, 3.9, .3);
    this.box(0, 4.7, 3.9, 2.4);
    const seatY = ship.position.y + CABIN.floor + 1.2;
    this.interact(0, 2.3, 1.3, () => Flight.boardLabel('pilot'), () => Flight.board('pilot'), seatY);
    this.interact(-.95, -1.5, 1.3, () => Flight.boardLabel('pass'), () => Flight.board('pass'), seatY);
    const shopCfg = SHOPS[this.cfg.shop], L = equipmentStandLayout(this.cfg.shop);
    this.place(this.equipmentShack = buildEquipmentShack(this.cfg.shop),L.x,L.z);
    const stand = (this.equipmentStand = buildEquipmentStand(this.cfg.shop));
    this.place(stand,L.x+L.rackX,L.z+L.rackZ); stand.position.y += .06;
    const ground = stand.position.y;
    const scale = L.rackScale, half = L.shackWidth / 2, shackGround = this.equipmentShack.position.y;
    this.box(stand.position.x+.27*scale,stand.position.z,.94*scale,L.width*scale,ground+1.79*scale);
    this.box(stand.position.x-.86*scale,stand.position.z+L.gunZ*scale,.48*scale,L.gunSpan*scale,ground+.67*scale);
    this.box(L.x+1.58,L.z,.12,L.shackWidth,shackGround+3.28,true);
    for (const z of [-half,half]) this.box(L.x+.16,L.z+z,2.9,.16,shackGround+3.28,true);
    this.plats.push({x0:L.x-1.615,x1:L.x+1.775,z0:L.z-half-.21,z1:L.z+half+.21,
      top:shackGround+3.55,bot:shackGround+3.43,slopeX:Math.tan(.08)});
    this.indoors.push({x0:L.x-1.25,x1:L.x+1.65,z0:L.z-half,z1:L.z+half});
    const keeper = buildShopkeeper(this.cfg.shop);
    this.npc(keeper,L.x+L.keeperX,L.z+L.keeperZ,-PI/2,shopCfg.npc,false);
    const talk = this.interact(L.x-.2,L.z+L.keeperZ,2.2,'Talk to '+shopCfg.npc,()=>UI.toast(U.pick(shopCfg.greet),'',3));
    talk.aim = keeper.root.localToWorld(new V3(0,1.9,.25));
    stand.updateMatrixWorld(true);
    for (const d of stand.userData.displays) {
      const getItem = d.getItem || (() => d.it), isSight = d.sight !== undefined;
      const aim = stand.localToWorld(d.aim.clone());
      const interaction = this.interact(stand.position.x+d.x*scale,stand.position.z+d.z*scale,2.25,
        () => isSight ? Shop.sightLabel(d.sight) : Shop.displayLabel(getItem()),
        () => isSight ? Shop.useSight(d.sight) : Shop.useDisplay(getItem()),aim.y);
      interaction.aim = aim; interaction.trade = true;
    }
    const sell = (this.sellStation = buildCompactSellStation()); this.place(sell,L.sellX,L.sellZ); sell.position.y += .06;
    this.box(L.sellX,L.sellZ,.9,1.8,sell.position.y+.99);
    const seller = this.interact(L.sellX-.5,L.sellZ,2.3,()=>Shop.sellLabel(),()=>Shop.sellAtStation(),sell.position.y+.9);
    seller.aim = new V3(L.sellX-.4,sell.position.y+.47,L.sellZ); seller.trade = true;
    let lastTags = -1;
    this.anim.push(t => {
      const tick = Math.floor(t * 2); if (tick === lastTags) return; lastTags = tick;
      for (const d of stand.userData.displays) updateTradeTag(d.tag,d.sight !== undefined ? scopeTradeLines(d.sight) : tradeTagLines(d.getItem ? d.getItem() : d.it));
      updateTradeTag(sell.userData.tag,['SELL LOOT',U.bucks(Activities.pays(Activities.sellableValue())),'FAVOURITES KEPT']);
    });
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
    this.interact(0, -38, 4.6, `Boss altar: summon ${b.name}`, () => Shop.openBoss()); // (from any side)
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
  // a rock that sits in the dirt and that you bump into instead of walking through
  rock(x, z, color) {
    const r = buildRock(this.rng, color);
    this.place(r, x, z, this.rng() * 6, null, r.userData.r * 0.6);
    this.sceneryCollider(r);
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
    this.scatter(26, 16, 84, 3.2, (x, z) => { this.place(buildJunkPile(rng), x, z, rng() * 6, null, 1.6); this.circle(x, z, 1.7); });
    this.scatter(9, 18, 80, 2, (x, z) => { this.place(buildBrokenRobot(), x, z, rng() * 6, null, 1.2); this.circle(x, z, 1.1); });
    this.scatter(4, 25, 75, 3, (x, z) => { this.place(buildDish(), x, z, rng() * 6, null, 0.5); this.circle(x, z, 0.6); });
    this.scatter(4, 25, 80, 3, (x, z) => { this.place(buildCrashedRocket(), x, z, rng() * 6, null, 1); this.circle(x, z, 1.2); });
    this.scatter(44, 12, 88, 1.8, (x, z) => this.rock(x, z, U.pick(['#8f6b52', '#7a5c48', '#a0826a'])));
    this.scatter(34, 9, 84, 1.2, (x, z) => this.addNode('scrap', x, this.gh(x, z) - 0.03, z));
  }
  build_gloop() {
    const rng = this.rng;
    const caps = ['#ff5fb8', '#9b5de5', '#43e0c0', '#ffb23e', '#ff7a3d'];
    const shroom = (x, z, h, r, withBerry) => {
      const c = caps[Math.floor(rng() * caps.length)];
      this.place(buildMushroom(h, r, c), x, z, rng() * 6);
      const top = this.mushroom(x, z, h, r);
      if (withBerry) this.addNode(h > 6 ? 'bigberry' : 'berry', x, top, z);
      return top;
    };
    // staircase clusters of mushrooms you can climb (remembered, bottom step first: the Ring Run goes up one)
    const clusters = [[40, 14], [-38, -24], [-14, 46], [36, -40], [-52, 22], [60, 30], [-52, -38], [16, 64]];
    this.climbs = [];
    clusters.forEach(([cx, cz], ci) => {
      let a = rng() * 6, h = 1.8;
      const steps = [];
      this.climbs.push({ x: cx, z: cz, steps });
      for (let i = 0; i < 6; i++) {
        const x = cx + Math.cos(a) * (2.2 + i * 0.5), z = cz + Math.sin(a) * (2.2 + i * 0.5), r = 2.2 + rng() * 0.8;
        steps.push({ x, z, r, top: shroom(x, z, h, r, true) });
        this.occupied.push({ x, z, r: 2.5 });
        a += 1.25; h += 1.75 + rng() * 0.4;
      }
    });
    this.scatter(20, 12, 84, 3.5, (x, z) => shroom(x, z, 1.2 + rng() * 3, 1.8 + rng() * 1.8, rng() > 0.3));
    this.scatter(64, 8, 88, 1, (x, z) => this.place(buildGlowPlant(rng, U.pick(['#7dffea', '#ff9af0', '#fff36b'])), x, z, 0, null, 0.4));
    this.scatter(32, 12, 88, 1.8, (x, z) => this.rock(x, z, U.pick(['#39a58c', '#ff7ac8', '#6a4cc0'])));
    this.scatter(14, 10, 80, 1, (x, z) => this.addNode('berry', x, this.gh(x, z), z));
    const sign = new THREE.Group();
    mk(BOX(0.2, 2.4, 0.2), '#6b4a2b', sign, 0, 1.2, 0);
    const sm = signMesh(['LUCKSTAR CASINO →', 'NEXT PLANET!'], 2.6, 1.3, { bg: '#ff3df0', colors: ['#fff', '#ffe066'], border: '#fff' });
    sm.position.set(0, 2.4, 0.12); sign.add(sm);
    this.jokeSign(-12, 10, sign);
    // Snorbo's mushroom house behind the stall (you can climb that one too)
    this.place(buildMushroom(4, 4.5, '#ff5fb8'), 22, -6);
    this.mushroom(22, -6, 4, 4.5);
  }
  build_luck() {
    const rng = this.rng;
    this.buildCasino();
    this.buildDuelPit(DUEL.spot.x, DUEL.spot.z);
    // decor around the rest of the island
    this.jokeSign(-12, 10, (() => { const g = new THREE.Group(); mk(BOX(0.2, 2.2, 0.2), '#555', g, 0, 1.1, 0); const s = signMesh(['POSTER'], 1.6, 1.0, { bg: '#ff3df0', color: '#fff' }); s.position.set(0, 2.2, 0.12); g.add(s); return g; })());
    this.scatter(26, 14, 84, 1.5, (x, z) => { this.place(buildNeonPalm(rng), x, z, 0, null, 0.3); this.circle(x, z, 0.4); });
    this.scatter(11, 18, 80, 2.5, (x, z) => { const s = 1.5 + rng() * 2; const m=this.place(buildDice(s), x, z, rng() * 6, null, s * 0.5); this.sceneryCollider(m); });
    this.scatter(18, 10, 84, 1.2, (x, z) => { this.place(buildChipStack(rng), x, z, 0, null, 0.7); this.circle(x, z, 0.8); });
    // chips people dropped, lying all over the place (inside the casino too): vacuum them up
    this.scatter(14, 12, 82, 1, (x, z) => this.addNode('chips', x, this.gh(x, z) - 0.02, z));
    const C = CASINO_HALL, fy = this.h(C.x, C.z);
    for (const [lx, lz] of [[-2.5, 0.8], [5, -1.6], [9.5, 2.2], [-5.6, -2.4], [3.2, -10.6], [-8.5, 5.4]]) this.addNode('chips', C.x + lx, fy + 0.03, C.z + lz);
  }
  // the Duel Pit: a roped-off ring with a referee. Talk to him to wager a crewmate (see Duel)
  buildDuelPit(x, z) {
    const g = new THREE.Group(), R = 2.6, GOLD = '#ffd23f';
    mk(CYL(R + 0.3, R + 0.4, 0.3, 24), '#2a1450', g, 0, 0.15, 0);
    mk(CYL(R, R, 0.04, 24), '#b3122e', g, 0, 0.32, 0);
    tf(mk(TOR(R, 0.05, 5, 32), GOLD, g, 0, 0.33, 0), Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, px = Math.cos(a) * R, pz = Math.sin(a) * R;
      mk(CYL(0.07, 0.08, 1.3, 6), GOLD, g, px, 0.95, pz);
      mk(SPH(0.11, 6, 5), i % 2 ? '#ff3df0' : '#3df0ff', g, px, 1.65, pz, { emissive: i % 2 ? '#ff3df0' : '#3df0ff' });
      if (i !== 2) { // (a gap on the side facing the pad, to walk in)
        const b = ((i + 1) / 8) * Math.PI * 2, mx = (px + Math.cos(b) * R) / 2, mz = (pz + Math.sin(b) * R) / 2;
        for (const y of [0.8, 1.25]) tf(mk(BOX(2 * R * Math.sin(Math.PI / 8), 0.05, 0.05), '#ff3df0', g, mx, y, mz, { emissive: '#8a1070' }), 0, -(a + b) / 2 + Math.PI / 2, 0);
      }
      this.circle(x + px, z + pz, 0.18);
    }
    const sign = grp(g, 0, 0, -R - 0.6);
    mk(BOX(0.16, 3.4, 0.16), '#3b3f4a', sign, -1.5, 1.7, 0);
    mk(BOX(0.16, 3.4, 0.16), '#3b3f4a', sign, 1.5, 1.7, 0);
    const sm = signMesh(['DUEL PIT', 'WAGER A FRIEND · WINNER TAKES IT'], 3.4, 1.3, { bg: '#1a0a30', colors: ['#ff3df0', '#ffd23f'], border: GOLD, glow: true });
    sm.position.set(0, 3.2, 0.1); sign.add(sm);
    this.box(x, z - R - 0.6, 3.4, 0.3);
    this.place(g, x, z, 0, null, R);
    const ref = buildAlien({ vest: '#f4f4f4', shades: true });
    this.npc(ref, x + 1.6, z - 1.2, -Math.PI / 4, 'Referee Rex', 2.5);
    this.interact(x, z, 3.6, 'Duel Pit: wager a crewmate', () => Duel.openBooth());
  }
  // The Luckstar Casino: one big hall with every game inside. The front door faces the landing pad.
  // Everything is laid out in the hall's own coordinates (lx, lz), with the door on the +x side.
  buildCasino() {
    const C = CASINO_HALL, W = C.w, D = C.d, H = C.h, T = C.t, DR = C.door;
    const inX = W / 2 - T, inZ = D / 2 - T; // the inside faces of the walls
    const fy = this.h(C.x, C.z);
    const X = (lx) => C.x + lx, Z = (lz) => C.z + lz;
    const S = grp(this.stat, C.x, fy, C.z); // walls and furniture (merged, casts shadows)
    // roof, ceiling and lights: merged on their own and cast no shadows, so the sun still lights the hall
    const noShadow = grp(this.group), N = grp(noShadow, C.x, fy, C.z);
    const col = (lx, lz, w, d) => this.box(X(lx), Z(lz), w, d);
    const post = (lx, lz, r) => this.circle(X(lx), Z(lz), r);
    const put = (obj, lx, y, lz, parent = S) => { obj.position.set(lx, y, lz); parent.add(obj); return obj; };
    const GOLD = '#ffd23f', NIGHT = '#1a0a30';
    const neon = (c) => ({ emissive: c });
    const sign = (lines, w, h, lx, y, lz, ry, colors, border, parent = S) => {
      const s = signMesh(lines, w, h, { bg: NIGHT, colors, border: border || GOLD, glow: true });
      s.position.set(lx, y, lz); s.rotation.y = ry; parent.add(s);
      return s;
    };
    this.indoors.push({ x0: X(-W / 2), x1: X(W / 2), z0: Z(-D / 2), z1: Z(D / 2) });
    this.casinoIn = { x0: X(-inX), x1: X(inX), z0: Z(-inZ), z1: Z(inZ) };

    /* ---------- walls, floor and roof ---------- */
    const WALL = '#3b1d6a', PANEL = '#24103f', seg = inZ - DR;
    mk(BOX(W, H, T), WALL, S, 0, H / 2, -D / 2 + T / 2);
    mk(BOX(W, H, T), WALL, S, 0, H / 2, D / 2 - T / 2);
    mk(BOX(T, H, 2 * inZ), WALL, S, -W / 2 + T / 2, H / 2, 0);
    for (const s of [-1, 1]) mk(BOX(T, H, seg), WALL, S, W / 2 - T / 2, H / 2, s * (DR + seg / 2));
    mk(BOX(T, H - 4.6, 2 * DR), WALL, S, W / 2 - T / 2, 4.6 + (H - 4.6) / 2, 0); // over the door
    col(0, -D / 2 + T / 2, W, T); col(0, D / 2 - T / 2, W, T); col(-W / 2 + T / 2, 0, T, D);
    for (const s of [-1, 1]) col(W / 2 - T / 2, s * (DR + (D / 2 - DR) / 2), T, D / 2 - DR);
    // dark panelling with a gold rail round the inside
    for (const s of [-1, 1]) {
      mk(BOX(2 * inX, 1.2, 0.06), PANEL, S, 0, 0.6, s * (inZ - 0.03));
      mk(BOX(2 * inX, 0.1, 0.12), GOLD, S, 0, 1.25, s * (inZ - 0.06));
      mk(BOX(0.06, 1.2, seg), PANEL, S, inX - 0.03, 0.6, s * (DR + seg / 2));
      mk(BOX(0.12, 0.1, seg), GOLD, S, inX - 0.06, 1.25, s * (DR + seg / 2));
    }
    mk(BOX(0.06, 1.2, 2 * inZ), PANEL, S, -inX + 0.03, 0.6, 0);
    mk(BOX(0.12, 0.1, 2 * inZ), GOLD, S, -inX + 0.06, 1.25, 0);
    // neon strips running round the top of the walls
    for (const [y, c] of [[7.0, '#3df0ff'], [7.4, '#ff3df0']]) {
      for (const s of [-1, 1]) {
        mk(BOX(2 * inX, 0.08, 0.08), c, N, 0, y, s * (inZ - 0.06), neon(c));
        mk(BOX(0.08, 0.08, 2 * inZ), c, N, s * (inX - 0.06), y, 0, neon(c));
      }
    }
    // the carpet (as loud as casino carpet should be) and a gold doorstep
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(2 * inX, 2 * inZ), new THREE.MeshToonMaterial({ map: casinoCarpetTex(inX / 1.5, inZ / 1.5), gradientMap: TOON_GRAD }));
    carpet.rotation.x = -Math.PI / 2; carpet.position.y = 0.03; carpet.receiveShadow = true;
    S.add(carpet);
    mk(BOX(T + 0.1, 0.05, 2 * DR), GOLD, S, W / 2 - T / 2, 0.025, 0);
    // roof with a gold edge, and little bulbs all over the ceiling
    mk(BOX(W + 0.8, 0.5, D + 0.8), PANEL, N, 0, H + 0.25, 0);
    for (const s of [-1, 1]) {
      mk(BOX(W + 1.2, 0.6, 0.4), GOLD, N, 0, H + 0.6, s * (D / 2 + 0.4));
      mk(BOX(0.4, 0.6, D + 1.2), GOLD, N, s * (W / 2 + 0.4), H + 0.6, 0);
    }
    // a gold-beamed ceiling (it glows a little by itself, or it would just look like the night sky), bulbs where the beams cross
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(2 * inX, 2 * inZ), new THREE.MeshToonMaterial({ color: '#2a1450', emissive: '#1d0b3a', gradientMap: TOON_GRAD }));
    ceil.rotation.x = Math.PI / 2; ceil.position.y = H - 0.01;
    N.add(ceil);
    const beam = { emissive: '#4a3508' };
    for (let ix = -3; ix <= 3; ix++) mk(BOX(0.22, 0.22, 2 * inZ), '#c9a227', N, ix * 3.4, H - 0.12, 0, beam);
    for (let iz = -4; iz <= 4; iz++) mk(BOX(2 * inX, 0.22, 0.22), '#c9a227', N, 0, H - 0.12, iz * 3.2, beam);
    for (let ix = -3; ix <= 3; ix++) for (let iz = -4; iz <= 4; iz++) mk(SPH(0.13, 6, 4), '#fff1b8', N, ix * 3.4, H - 0.3, iz * 3.2, { emissive: '#ffcc55' });
    // pillars holding the roof up, either side of the main aisle
    for (const [x, z] of [[-8, -3.2], [-8, 3.2], [1.5, -3.2], [1.5, 3.2]]) { put(buildCasinoPillar(H), x, 0, z); post(x, z, 0.5); }
    for (const x of [-3.4, 6.8]) put(buildChandelier(H - 6.4), x, 6.1, 0, N); // (hung where two beams cross)

    /* ---------- the front: marquee, big sign, red carpet, bouncer ---------- */
    const FX = W / 2; // the outside of the front wall
    for (const s of [-1, 1]) {
      mk(CYL(0.36, 0.42, 5.2, 10), GOLD, S, FX + 0.3, 2.6, s * (DR + 0.5));
      post(FX + 0.3, s * (DR + 0.5), 0.45);
    }
    mk(BOX(2.6, 0.45, 2 * DR + 2.6), NIGHT, S, FX + 1.3, 5.3, 0);
    mk(BOX(2.7, 0.08, 2 * DR + 2.7), GOLD, S, FX + 1.3, 5.56, 0);
    // chasing light bulbs round the marquee (two sets that take turns)
    this.bulbA = litMat('#fff4c2', '#ffcc33'); this.bulbB = litMat('#fff4c2', '#ffcc33');
    let k = 0;
    for (let z = -(DR + 1.1); z <= DR + 1.1 + 1e-6; z += 0.45) mk(SPH(0.1, 6, 4), k++ % 2 ? this.bulbB : this.bulbA, N, FX + 2.62, 5.3, z);
    for (const s of [-1, 1]) for (let x = 0.35; x < 2.5; x += 0.45) mk(SPH(0.1, 6, 4), k++ % 2 ? this.bulbB : this.bulbA, N, FX + x, 5.3, s * (DR + 1.32));
    sign(['OPEN 25 HOURS A DAY'], 7, 1.1, FX + 0.03, 6.5, 0, Math.PI / 2, ['#ffd23f']);
    // neon strips up the front
    for (const s of [-1, 1]) for (const [z, c] of [[5.2, '#ff3df0'], [8.4, '#3df0ff'], [11.6, '#ff3df0']]) mk(BOX(0.08, 7.2, 0.14), c, N, FX + 0.05, 4.0, s * z, neon(c));
    // the big sign on the roof (the back of it helps anyone who walked round the wrong side)
    const bb = grp(N, W / 2 - 1.2, H + 0.5, 0);
    mk(BOX(0.35, 5.2, 15.4), NIGHT, bb, 0, 2.9, 0);
    for (const s of [-1, 1]) mk(BOX(0.3, 0.9, 0.3), '#2a1450', bb, 0, 0.45, s * 6);
    sign(['LUCKSTAR', 'CASINO'], 15, 4.8, 0.19, 2.9, 0, Math.PI / 2, ['#ff3df0', '#3df0ff'], GOLD, bb);
    sign(['LUCKSTAR CASINO', 'THE DOOR IS ROUND THE OTHER SIDE'], 15, 4.8, -0.19, 2.9, 0, -Math.PI / 2, ['#ff3df0', '#3df0ff'], GOLD, bb);
    // a giant poker chip spinning on a front corner of the roof (where the big sign doesn't hide it)
    mk(CYL(0.8, 1.1, 0.8, 8), GOLD, N, 7, H + 0.9, -10.5);
    const chip = (this.bigChip = buildGiantChip());
    chip.position.set(X(7), fy + H + 3.7, Z(-10.5));
    chip.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    this.dyn.add(chip);
    // searchlights sweeping the sky from the front corners (you can spot the casino from anywhere)
    const beamGeo = new THREE.CylinderGeometry(7, 0.35, 110, 20, 1, true);
    beamGeo.translate(0, 55, 0);
    const beamMat = new THREE.MeshBasicMaterial({ color: '#b9a4ff', transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.searchlights = [-1, 1].map((s) => {
      mk(CYL(0.55, 0.65, 0.7, 10), '#3b3f4a', N, W / 2 - 1.6, H + 0.85, s * (D / 2 - 1.6));
      mk(CYL(0.4, 0.4, 0.1, 10), '#fff4c2', N, W / 2 - 1.6, H + 1.25, s * (D / 2 - 1.6), { emissive: '#ffe9a8' });
      const m = new THREE.Mesh(beamGeo, beamMat);
      m.position.set(X(W / 2 - 1.6), fy + H + 1.3, Z(s * (D / 2 - 1.6)));
      this.dyn.add(m);
      return { m, s, ph: s > 0 ? 0 : 2.1 };
    });
    // air conditioning (it's very hot in there, from all the money burning)
    for (const [x, z] of [[-8, -7], [-8, 6], [-3, 9]]) {
      mk(BOX(1.8, 1.0, 1.3), '#6b7280', N, x, H + 1.0, z);
      mk(CYL(0.45, 0.45, 0.06, 10), '#2b2f38', N, x, H + 1.53, z);
    }
    // red carpet with velvet ropes
    mk(BOX(6.4, 0.05, 3.2), '#b3122e', S, FX + 3.2, 0.03, 0);
    for (const s of [-1, 1]) {
      mk(BOX(6.4, 0.06, 0.12), GOLD, S, FX + 3.2, 0.035, s * 1.6);
      for (let i = 0; i < 4; i++) {
        const x = FX + 1.4 + i * 1.6;
        mk(CYL(0.19, 0.21, 0.06, 8), GOLD, S, x, 0.03, s * 2.0);
        mk(CYL(0.05, 0.06, 0.95, 6), GOLD, S, x, 0.5, s * 2.0);
        mk(SPH(0.1, 6, 5), GOLD, S, x, 1.0, s * 2.0);
        if (i < 3) mk(BOX(1.6, 0.08, 0.08), '#b3122e', S, x + 0.8, 0.82, s * 2.0);
      }
      col(FX + 3.8, s * 2.0, 5.0, 0.2);
      this.place(buildNeonPalm(this.rng), X(FX + 3.5), Z(s * 6.5), 0, null, 0.3);
      post(FX + 3.5, s * 6.5, 0.4);
    }
    const bouncer = buildAlien({ vest: '#111111', shades: true });
    bouncer.root.scale.setScalar(1.2);
    this.npc(bouncer, X(FX + 1.5), Z(DR + 1.9), Math.PI / 2, 'Big Zorp', 2.5);
    this.interact(X(FX + 2.7), Z(DR + 1.9), 3.2, 'Talk to Big Zorp (bouncer)', () => { UI.toast(`Big Zorp: "${U.pick(LINES.bouncer)}"`, '', 4); Sound.play('click'); });

    /* ---------- slots, all along the north wall ---------- */
    this.slotMachines = [];
    const slotZ = -inZ + 0.5;
    for (let i = 0; i < 8; i++) {
      const lx = -10.5 + i * 2.55;
      const sm = buildSlotMachine();
      sm.userData.lever.userData.dynamic = true; // (keep the lever its own mesh so it can still move)
      sm.position.set(lx, 0, slotZ);
      S.add(sm);
      this.slotMachines.push(sm);
      this.interact(X(lx), Z(slotZ + 1.4), 1.7, 'Play Cosmic Slots', () => Casino.openSlots(i));
    }
    col(-10.5 + 3.5 * 2.55, slotZ, 7 * 2.55 + 1.5, 1.0);
    sign(['COSMIC SLOTS', 'THE PIZZA JACKPOT PAYS x250'], 11, 2.2, -1.6, 4.4, -inZ + 0.02, 0, ['#ffd23f', '#ff3df0'], '#ff3df0');
    sign(['THE HOUSE', 'ALWAYS WINS', '(it\'s the law)'], 3, 2.2, 10.4, 2.9, -inZ + 0.02, 0, ['#ffffff', '#ffffff', '#ffd23f']);

    /* ---------- roulette, run by a very serious robot ---------- */
    const rt = (this.roulette = buildRouletteTable());
    this.place(rt, X(-4), Z(-6.8), 0, this.dyn);
    col(-4, -6.8, 3.9, 2.0);
    this.npc(buildRobotNPC(), X(-4), Z(-8.7), 0, 'Lady Luck 9000');
    this.interact(X(-4), Z(-5.0), 2.5, 'Play Roulette', () => Casino.openRoulette());
    put(buildHangingLamp(H - 5.0, '#ff3df0'), -4, 4.4, -6.8, N);

    /* ---------- Glorp's coin table ---------- */
    const gt = grp(S, 5.5, 0, -6.8);
    mk(CYL(1.2, 0.4, 1.0, 10), '#3b2414', gt, 0, 0.5, 0);
    mk(CYL(1.3, 1.3, 0.1, 12), '#1e7b3a', gt, 0, 1.05, 0);
    for (let i = 0; i < 5; i++) mk(CYL(0.15, 0.15, 0.06, 8), GOLD, gt, 0.4, 1.13 + i * 0.07, 0.3);
    post(5.5, -6.8, 1.3);
    this.npc(buildAlien({ vest: '#1e7b3a', shades: true }), X(5.5), Z(-8.6), 0, 'Glorp');
    this.interact(X(5.5), Z(-5.2), 2.4, 'Gamble with Glorp (Double or Nothing)', () => Casino.openGlorp());
    put(buildHangingLamp(H - 5.0, '#3df0ff'), 5.5, 4.4, -6.8, N);
    const gs = grp(S, 7.9, 0, -7.7);
    mk(BOX(0.08, 1.2, 0.08), GOLD, gs, 0, 0.6, 0);
    sign(['GLORP\'S COIN', '100% FAIR*', '*not a legal guarantee'], 1.5, 1.0, 0, 1.6, 0.05, 0, ['#ffd23f', '#ffffff', '#9aa0a6'], GOLD, gs);
    post(7.9, -7.7, 0.2);

    /* ---------- mystery crate machines either side of the door ---------- */
    for (const s of [-1, 1]) {
      const cm = buildCrateMachine();
      cm.position.set(inX - 0.65, 0, s * 7); cm.rotation.y = -Math.PI / 2;
      S.add(cm);
      col(inX - 0.65, s * 7, 1.3, 1.9);
      this.interact(X(inX - 2.1), Z(s * 7), 2.2, 'Mystery Crate ($300)', () => Casino.openCrate());
      sign(['MYSTERY', 'CRATES'], 2.4, 1.1, inX - 0.02, 3.7, s * 7, -Math.PI / 2, ['#3df0ff', '#ffd23f'], '#3df0ff');
      put(buildNeonPalm(this.rng), 10, 0, s * 3.8); // (the palms by the door are just for show)
      post(10, s * 3.8, 0.4);
    }
    sign(['THANKS FOR', 'YOUR MONEY!'], 5, 1.6, inX - 0.02, 5.9, 0, -Math.PI / 2, ['#ff3df0', '#3df0ff']);

    /* ---------- the snail derby along the south wall ---------- */
    const TX = -2, TZ = 9.4, RZ = TZ - 3.55; // track centre, and the railing along its front
    const tr = grp(S, TX, 0, TZ);
    mk(BOX(19, 0.1, 6.4), '#f3d99b', tr, 0, 0.05, 0);
    for (let i = 0; i <= 5; i++) mk(BOX(18.6, 0.02, 0.06), '#ffffff', tr, 0, 0.11, -3 + i * 1.2);
    mk(BOX(0.12, 0.02, 6.0), '#ffffff', tr, -8.2, 0.11, 0);
    for (let r = 0; r < 20; r++) for (let c = 0; c < 2; c++) mk(BOX(0.3, 0.02, 0.3), (r + c) % 2 ? '#111111' : '#ffffff', tr, 7.1 + c * 0.3, 0.115, -2.85 + r * 0.3);
    for (const [x, label, c] of [[-8.2, 'START', '#3fcf6a'], [7.25, 'FINISH', '#ff4b3e']]) {
      for (const s of [-1, 1]) mk(BOX(0.18, 2.3, 0.18), c, tr, x, 1.15, s * 3.3);
      mk(BOX(0.25, 0.45, 6.8), NIGHT, tr, x, 2.4, 0);
      sign([label], 1.6, 0.45, x, 2.4, -3.45, Math.PI, [c], c, tr);
    }
    // railing in front, stands at the back (full of very invested fans)
    for (let x = -9.6; x <= 9.6 + 1e-6; x += 1.92) mk(CYL(0.06, 0.06, 1.0, 6), GOLD, tr, x, 0.5, -3.55);
    mk(BOX(19.3, 0.08, 0.08), GOLD, tr, 0, 1.02, -3.55);
    mk(BOX(19.3, 0.06, 0.06), '#b3122e', tr, 0, 0.6, -3.55);
    for (const s of [-1, 1]) {
      for (let z = -1.85; z <= 3.3; z += 1.7) mk(CYL(0.06, 0.06, 1.0, 6), GOLD, tr, s * 9.65, 0.5, z);
      mk(BOX(0.08, 0.08, 6.8), GOLD, tr, s * 9.65, 1.02, -0.15);
    }
    col((-inX + TX + 9.8) / 2, (RZ - 0.1 + inZ) / 2, TX + 9.8 + inX, inZ - RZ + 0.1);
    mk(BOX(19, 0.5, 0.9), '#5b3a8a', S, TX, 0.25, inZ - 1.35);
    mk(BOX(19, 1.0, 0.9), '#4a2a7a', S, TX, 0.5, inZ - 0.45);
    const vests = ['#ff4b3e', '#3fcf6a', '#3aa7ff', '#ffd23f', '#ff7ac8', '#9b5de5'];
    [[-8, 0.5, inZ - 1.35], [-3.5, 0.5, inZ - 1.35], [2.5, 0.5, inZ - 1.35], [-6, 1.0, inZ - 0.45], [-1, 1.0, inZ - 0.45], [3, 1.0, inZ - 0.45]].forEach(([x, y, z], i) => {
      const fan = buildAlien({ vest: vests[i], bowtie: i % 2 === 0 });
      fan.armL.rotation.x = i % 3 === 0 ? -2.8 : -0.4;
      fan.armR.rotation.x = i % 2 ? -2.8 : -0.2;
      fan.root.position.set(x, y, z); fan.root.rotation.y = Math.PI;
      fan.root.traverse((c) => { if (c.isMesh) c.receiveShadow = false; }); // (smooth and round: the toon shading shades them)
      S.add(fan.root);
    });
    sign(['SNAIL DERBY', 'BET ON A SNAIL. WIN BIG!*'], 10, 2.6, TX, 5.0, inZ - 0.02, Math.PI, ['#ffd23f', '#3df0ff'], '#ff3df0');
    sign(['*you will not win big'], 3.2, 0.5, TX + 7.8, 3.0, inZ - 0.02, Math.PI, ['#9aa0a6'], '#9aa0a6');
    // two betting podiums at the rail
    for (const bx of [-6.5, 3]) {
      mk(BOX(1.4, 1.15, 0.7), NIGHT, S, bx, 0.575, RZ - 0.45);
      mk(BOX(1.5, 0.08, 0.8), GOLD, S, bx, 1.17, RZ - 0.45);
      sign(['PLACE', 'BETS'], 1.2, 0.8, bx, 0.62, RZ - 0.81, Math.PI, ['#ffd23f', '#3df0ff']);
      col(bx, RZ - 0.45, 1.4, 0.7);
      this.interact(X(bx), Z(RZ - 1.3), 2.4, 'Snail Races (bet!)', () => Casino.openSnails());
    }
    this.track = { x0: X(TX - 8.2), x1: X(TX + 7.2), lanes: [-2.4, -1.2, 0, 1.2, 2.4].map((o) => Z(TZ + o)), y: fy + 0.12 };
    this.snails = SNAILS.map((s, i) => {
      const m = buildSnail(s.color);
      m.scale.setScalar(1.3);
      m.position.set(this.track.x0, this.track.y, this.track.lanes[i]);
      m.rotation.y = Math.PI / 2;
      this.dyn.add(m);
      return m;
    });

    /* ---------- the Lucky Lounge (a bar) at the back ---------- */
    const BX = -inX + 1.9;
    mk(BOX(0.9, 1.1, 7), '#6b3a2a', S, BX, 0.55, 0);
    mk(BOX(1.2, 0.1, 7.4), '#2b1d14', S, BX, 1.15, 0);
    mk(BOX(0.06, 0.06, 7), GOLD, S, BX + 0.55, 0.3, 0);
    col(BX, 0, 1.0, 7.2);
    const bottles = [['#3df0ff', '#0a8aa0'], ['#ff3df0', '#a0108a'], ['#7dff8a', '#1a8a2a'], ['#ffd23f', '#a07a0a']];
    for (const y of [1.6, 2.3, 3.0]) {
      mk(BOX(0.45, 0.07, 6.4), '#2b1d14', S, -inX + 0.25, y, 0);
      let b = Math.round(y * 10);
      for (let z = -2.9; z <= 2.9 + 1e-6; z += 0.45) { const [c, e] = bottles[b++ % 4]; mk(CYL(0.07, 0.08, 0.34, 6), c, S, -inX + 0.25, y + 0.21, z, { emissive: e }); }
    }
    for (const z of [-2.6, -1.3, 1.3, 2.6]) { put(buildBarStool(), BX + 1.05, 0, z); post(BX + 1.05, z, 0.28); }
    this.npc(buildAlien({ vest: '#ffffff', bowtie: true }), X(-inX + 0.95), Z(0), Math.PI / 2, 'Zeke');
    this.interact(X(BX + 1.2), Z(0), 2.3, 'Talk to Zeke (bartender)', () => { UI.toast(`Zeke: "${U.pick(LINES.bartender)}"`, '', 4); Sound.play('click'); });
    sign(['THE LUCKY LOUNGE'], 7, 1.3, -inX + 0.02, 4.5, 0, Math.PI / 2, ['#ff3df0']);
    sign(['NO REFUNDS'], 3, 0.9, -inX + 0.02, 2.7, -8.5, Math.PI / 2, ['#ff4b3e'], '#ff4b3e');
    sign(['PLEASE DO NOT', 'FEED THE SNAILS'], 3, 1.3, -inX + 0.02, 2.9, 8, Math.PI / 2, ['#ffffff', '#3fcf6a']);

    mergeStatic(noShadow);
    noShadow.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  }
  // is this spot inside the casino hall?
  inCasino(p) {
    const r = this.casinoIn;
    return !!r && p.x > r.x0 && p.x < r.x1 && p.z > r.z0 && p.z < r.z1;
  }
  build_frost() {
    const rng = this.rng;
    const ig = buildIgloo();
    this.jokeSign(-12, 10, ig);
    this.circles.pop(); this.circle(-12, 10, 2.6);
    // Keep the igloo entrance clear of the supply shack's new back wall.
    this.place(buildIgloo(), 24.8, -6, -Math.PI / 2, null, 2.4);
    this.circle(24.8, -6, 2.6);
    this.scatter(6, 20, 72, 4, (x, z) => { this.place(buildIgloo(), x, z, rng() * 6, null, 2.4); this.circle(x, z, 2.6); });
    this.scatter(80, 12, 88, 1.6, (x, z) => { this.place(buildPine(rng, true), x, z, rng() * 6, null, 0.4); this.circle(x, z, 0.5); });
    this.scatter(12, 10, 80, 1.2, (x, z) => { this.place(buildSnowman(rng), x, z, rng() * 6, null, 0.6); this.circle(x, z, 0.8); });
    this.scatter(34, 12, 88, 1.8, (x, z) => this.rock(x, z, U.pick(['#8ea8bf', '#a9c4d8', '#7f94aa'])));
    // little snow piles with something frozen in them: vacuum them up
    this.scatter(18, 10, 84, 1.2, (x, z) => this.addNode('snow', x, this.gh(x, z) - 0.02, z));
    this.scatter(26, 10, 84, 2, (x, z) => {
      let y = this.gh(x, z);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; y = Math.min(y, this.gh(x + Math.cos(a) * 0.9, z + Math.sin(a) * 0.9)); }
      this.addNode('crystal', x, y - 0.05, z, buildCrystalNode(rng), { hp: 1 });
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
    this.scatter(38, 16, 88, 2, (x, z) => { this.place(buildSpire(rng), x, z, 0, null, 1); this.circle(x, z, 1.3); });
    this.scatter(50, 10, 88, 1.8, (x, z) => { const r = buildLavaRock(rng); this.place(r, x, z, rng() * 6, null, r.userData.r * 0.6); this.sceneryCollider(r); });
    // what the meteors leave behind: vacuum it up
    this.scatter(16, 12, 84, 1.2, (x, z) => this.addNode('crust', x, this.gh(x, z) - 0.02, z));
    const hr = signMesh(['LATE DELIVERY CO.', 'HR POP-UP KIOSK'], 3.2, 1.2, { bg: '#dfe6ee', colors: ['#d6281b', '#2b1d14'], border: '#2b1d14' });
    hr.position.set(20.5, this.h(20, -6) + 3.4, -6); hr.rotation.y = -Math.PI / 2; this.stat.add(hr);
  }

  /* ----- Spookulon: graveyards full of ghosts, and a haunted mansion ----- */
  build_spook() {
    const rng = this.rng;
    this.jokeSign(-12, 10, buildTombstone(rng, true));
    this.circles.pop(); this.circle(-12, 10, 0.8);
    SPOOK_YARDS.forEach((y) => this.graveyard(y));
    // the mansion on the hill, looking at the landing pad
    const M = SPOOK_MANSION;
    this.place(buildMansion(), M.x, M.z, PI / 2, null, 3);
    this.box(M.x + 0.2, M.z, 9.6, 18);
    this.occupied.push({ x: M.x, z: M.z, r: 10 });
    for (let i = 0; i < 2; i++) this.addNode('ghost', M.x, 0, M.z, null, { orbit: { cx: M.x + 1, cz: M.z, r: 10 + i * 2, spd: i ? -0.16 : 0.2, ph: i * 3, h: 2.2 + i } });
    // a spooky lit path down to the altar, and lanterns by the shop
    for (const z of [-15, -24, -32]) for (const x of [-3.6, 3.6]) { this.place(buildGasLamp(), x, z, 0, null, 0.2); this.circle(x, z, 0.25); }
    for (const z of [-8.8, -3.2]) { this.place(buildJackOLantern(1.2), 12.8, z, -PI / 2, null, 0.3); this.circle(12.8, z, 0.45); }
    this.scatter(20, 12, 86, 1, (x, z) => { const m=this.place(buildTombstone(rng), x, z, rng() * 6, null, 0.4); this.sceneryCollider(m); });
    this.scatter(30, 14, 86, 1.4, (x, z) => { this.place(buildDeadTree(rng), x, z, rng() * 6, null, 0.25); this.circle(x, z, 0.35); });
    this.scatter(26, 10, 84, 0.9, (x, z) => { const s = 0.8 + rng() * 0.9; this.place(buildJackOLantern(s), x, z, rng() * 6, null, 0.3 * s); this.circle(x, z, 0.4 * s); });
    this.scatter(48, 8, 88, 0.8, (x, z) => this.place(buildGlowPlant(rng, U.pick(['#7dff8a', '#b9a4ff', '#ff8a1f'])), x, z, 0, null, 0.4));
    this.scatter(30, 12, 88, 1.8, (x, z) => this.rock(x, z, U.pick(['#4a4458', '#3a3448', '#5a5468'])));
    // bats circling high over everything
    this.skyBats = [];
    for (let i = 0; i < 11; i++) {
      const m = projMesh('bat', 0.5);
      this.dyn.add(m);
      this.skyBats.push({ m, r: 24 + rng() * 42, a: rng() * 6, spd: (rng() < 0.5 ? -1 : 1) * (0.18 + rng() * 0.15), y: 14 + rng() * 12 });
    }
    this.anim.push((t, dt) => {
      for (const b of this.skyBats) {
        b.a += dt * b.spd;
        b.m.position.set(Math.cos(b.a) * b.r, b.y + Math.sin(t * 1.3 + b.r) * 1.5, Math.sin(b.a) * b.r);
        b.m.rotation.set(0, Math.atan2(-Math.sin(b.a) * b.spd, Math.cos(b.a) * b.spd), Math.sin(t * 14 + b.r) * 0.4);
      }
    });
  }
  // a fenced graveyard: rows of tombstones, lanterns, a dead tree, and ghosts drifting over it all
  graveyard(y) {
    const rng = this.rng, x0 = y.x - y.w / 2, x1 = y.x + y.w / 2, z0 = y.z - y.d / 2, z1 = y.z + y.d / 2, gy = this.h(y.x, y.z);
    const GATE = 3;
    const fence = (cx, cz, len, alongZ) => {
      const f = buildIronFence(len);
      f.position.set(cx, gy, cz); if (alongZ) f.rotation.y = PI / 2;
      this.stat.add(f);
      this.box(cx, cz, alongZ ? 0.24 : len, alongZ ? len : 0.24, gy + 1.35);
    };
    // four sides; the gate side is two runs with a gap in the middle
    const sides = { n: [y.x, z1, y.w, false], s: [y.x, z0, y.w, false], e: [x1, y.z, y.d, true], w: [x0, y.z, y.d, true] };
    for (const [k, [cx, cz, len, alongZ]] of Object.entries(sides)) {
      if (k !== y.gate) { fence(cx, cz, len, alongZ); continue; }
      const half = (len - GATE) / 2, off = GATE / 2 + half / 2;
      fence(cx + (alongZ ? 0 : -off), cz + (alongZ ? -off : 0), half, alongZ);
      fence(cx + (alongZ ? 0 : off), cz + (alongZ ? off : 0), half, alongZ);
    }
    // the arch over the gate, with the graveyard's name
    const [gx, gz, , gAlongZ] = sides[y.gate];
    const arch = grp(this.stat, gx, gy, gz); if (gAlongZ) arch.rotation.y = PI / 2;
    for (const s of [-1, 1]) { mk(BOX(0.24, 2.9, 0.24), '#4a4550', arch, s * (GATE / 2 + 0.1), 1.45, 0); mk(SPH(0.16, 6, 5), '#4a4550', arch, s * (GATE / 2 + 0.1), 3.0, 0); }
    mk(new THREE.TorusGeometry(GATE / 2 + 0.1, 0.06, 4, 16, PI), '#2a2530', arch, 0, 2.5, 0);
    const sign = signMesh([y.name], 3.2, 0.5, { bg: '#2a2530', color: '#b9a4ff', border: '#4a4550', glow: true, double: true });
    sign.position.set(0, 2.55, 0); arch.add(sign);
    // tombstones in rows, with an aisle up the middle from the gate
    const aisleX = y.gate === 'e' || y.gate === 'w';
    const lamps = [[x0 + 0.8, z0 + 0.8], [x1 - 0.8, z1 - 0.8]], tree = [x0 + 1, z1 - 1];
    for (let zz = z0 + 1.6; zz < z1 - 1.2; zz += 2.3) {
      for (let xx = x0 + 1.5; xx < x1 - 1.2; xx += 2.1) {
        if ((aisleX ? Math.abs(zz - y.z) : Math.abs(xx - y.x)) < 1.8 || rng() < 0.2) continue;
        if (y.crypt && xx > x1 - 5.5 && Math.abs(zz - y.z) < 3.4) continue;
        if ([...lamps, tree].some(([ax, az]) => Math.hypot(xx - ax, zz - az) < 1.6)) continue;
        // (they all face the path)
        this.place(buildTombstone(rng), xx + (rng() - 0.5) * 0.4, zz, (aisleX ? (zz < y.z ? 0 : PI) : (xx < y.x ? PI / 2 : -PI / 2)) + (rng() - 0.5) * 0.3, null, 0.4);
        this.circle(xx, zz, 0.45);
      }
    }
    if (y.crypt) { this.place(buildCrypt(), x1 - 3, y.z, -PI / 2, null, 2); this.box(x1 - 3, y.z, 5.2, 4.4, 99, true); }
    for (const [lx, lz] of lamps) { this.place(buildGasLamp(), lx, lz, 0, null, 0.2); this.circle(lx, lz, 0.25); }
    this.place(buildDeadTree(rng), tree[0], tree[1], rng() * 6, null, 0.25); this.circle(tree[0], tree[1], 0.35);
    this.occupied.push({ x: y.x, z: y.z, r: Math.max(y.w, y.d) / 2 + 1 });
    // the ghosts
    const maxR = Math.min(y.w, y.d) / 2 - 1.5;
    for (let i = 0; i < y.ghosts; i++) {
      const r = 1.8 + (i / Math.max(1, y.ghosts - 1)) * (maxR - 1.8);
      this.addNode('ghost', y.x, 0, y.z, null, { orbit: { cx: y.x, cz: y.z, r, spd: (i % 2 ? -1 : 1) * (0.22 + rng() * 0.2), ph: rng() * 6, h: 1.3 + rng() * 0.6 } });
    }
  }

  /* ----- Nimbus-9: islands in the sky, updrafts, and pearls ----- */
  build_cloud() {
    const rng = this.rng;
    this.jokeSign(-12, 10, buildWeatherBoard());
    this.ventFx = [];
    NIMBUS_FLOATERS.forEach((f) => {
      // the island itself (the top is solid; its sides stop you too, but you can pass underneath)
      const depth = Math.min(f.r * 1.5, f.top - 4.5);
      const isl = buildFloatIsland(rng, f.r, depth);
      isl.position.set(f.x, f.top, f.z);
      this.stat.add(isl);
      this.caps.push({ x: f.x, z: f.z, r: f.r * 0.97, top: f.top });
      this.circles.push({ x: f.x, z: f.z, r: f.r * 0.9, top: f.top - 0.55, bot: f.top - 1.2 - depth * 0.6 });
      // the updraft that carries you up to it
      const y0 = f.from == null ? this.h(f.vx, f.vz) : NIMBUS_FLOATERS[f.from].top;
      if (f.from == null && y0 < 1.4) console.warn('updraft off the edge', f);
      this.vent(f.vx, y0, f.vz, f.top + 3);
      // pearls up top (the high islands have the big ones)
      const small = f.big ? (f.big > 1 ? 0 : 1) : 2;
      for (let i = 0; i < (f.big || 0); i++) { const a = i * PI + 0.4; this.addNode('bigpearl', f.x + (f.big > 1 ? Math.cos(a) * 1.6 : 0), f.top, f.z + (f.big > 1 ? Math.sin(a) * 1.6 : 0)); }
      for (let i = 0; i < small; i++) { const a = rng() * 6, d = f.r * (0.35 + rng() * 0.25); this.addNode('pearl', f.x + Math.cos(a) * d, f.top, f.z + Math.sin(a) * d); }
      if (!f.big) { const a = rng() * 6, tx = f.x + Math.cos(a) * f.r * 0.55, tz = f.z + Math.sin(a) * f.r * 0.55; const tr = buildCloudTree(rng); tr.position.set(tx, f.top, tz); this.stat.add(tr); this.circles.push({ x: tx, z: tz, r: 0.3, top: f.top + 4, bot: f.top - 0.3 }); }
    });
    // pearls lying around on the ground islands too
    this.scatter(20, 8, 80, 1.2, (x, z) => this.addNode('pearl', x, this.gh(x, z), z));
    this.scatter(30, 10, 80, 1.4, (x, z) => { this.place(buildCloudTree(rng), x, z, rng() * 6, null, 0.2); this.circle(x, z, 0.3); });
    this.scatter(20, 12, 80, 1.8, (x, z) => this.rock(x, z, U.pick(['#e2ebfa', '#ffd6f4', '#d6ecff'])));
    // a rainbow over the bridge to the altar, a weather station on the north island
    const rb = buildRainbow(7.5); rb.position.set(0, 1.6, -27); this.stat.add(rb);
    const [ax, az] = [4 + 2 * (NIMBUS_SPREAD - 1), 65 + 62 * (NIMBUS_SPREAD - 1)]; // (on the north island, wherever it is)
    const an = buildAnemometer(); this.place(an, ax, az, 0, null, 0.2); this.circle(ax, az, 0.3);
    this.anim.push((t, dt) => { an.userData.cups.rotation.y += dt * 4; });
    // hot air balloons drifting round the planet
    this.balloons = ['#ff4b6e', '#ffd23f', '#3aa7ff', '#46d98a'].map((c, i) => {
      const m = buildBalloon(c);
      this.dyn.add(m);
      return { m, r: 84 + i * 8, a: i * 1.6, spd: (i % 2 ? -1 : 1) * 0.015, y: 16 + i * 5 };
    });
    this.anim.push((t, dt) => {
      for (const b of this.balloons) { b.a += dt * b.spd; b.m.position.set(Math.cos(b.a) * b.r, b.y + Math.sin(t * 0.3 + b.r) * 2, Math.sin(b.a) * b.r); }
      for (const v of this.ventFx) {
        v.rings.forEach((r, i) => {
          const k = (t * 0.45 + i / v.rings.length) % 1;
          r.position.y = v.y0 + 0.3 + k * v.h;
          r.scale.setScalar(0.7 + k * 0.4);
          r.material.opacity = 0.55 * (1 - k);
        });
      }
    });
  }
  // an updraft from (x, y0, z) up to top: its base, a soft column and rings rising up it
  vent(x, y0, z, top) {
    const base = buildVentBase();
    base.position.set(x, y0 - 0.05, z);
    this.stat.add(base);
    const h = top - y0;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, h, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    col.position.set(x, y0 + h / 2, z);
    this.dyn.add(col);
    const rings = [];
    for (let i = 0; i < 4; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.05, 4, 20), new THREE.MeshBasicMaterial({ color: '#dff6ff', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
      r.rotation.x = PI / 2; r.position.set(x, y0, z);
      this.dyn.add(r);
      rings.push(r);
    }
    this.ventFx.push({ rings, y0, h });
    this.vents.push({ x, z, r: 1.25, y0, top });
  }

  /* ----- Gigopolis: streets, buildings you can get on top of, and delivery gigs ----- */
  build_city() {
    const rng = this.rng, gy = this.h(0, 0);
    this.jokeSign(-12, 10, buildParkingMeter());
    this.circles.pop(); this.circle(-12, 10, 0.3);
    // road markings: yellow dashes down the middle, zebra crossings at the junctions
    const dash = (x, z, alongZ) => mk(BOX(alongZ ? 0.18 : 1.6, 0.02, alongZ ? 1.6 : 0.18), '#ffd23f', this.stat, x, gy + 0.02, z);
    const AVE = [-66, -26, 26, 66], ST = [-60, -20, 26, 66]; // (avenues run along z, streets along x)
    for (let v = -82; v <= 82; v += 3.2) {
      const nearZ = ST.some((z) => Math.abs(v - z) < 4.5), nearX = AVE.some((x) => Math.abs(v - x) < 4.5);
      for (const x of AVE) if (!nearZ && Math.hypot(x, v) < CITY_R - 10) dash(x, v, true);
      for (const z of ST) if (!nearX && Math.hypot(v, z) < CITY_R - 10) dash(v, z, false);
    }
    for (let z = -32; z < -12; z += 3.2) dash(0, z, true);
    for (const x of AVE) for (const z of ST) {
      if (Math.hypot(x, z) > CITY_R - 12) continue;
      for (let i = -2; i <= 2; i++) {
        mk(BOX(0.5, 0.02, 2.4), '#e8e8e8', this.stat, x + i * 1.2, gy + 0.02, z + (z > 0 ? -4.9 : 4.9));
        mk(BOX(2.4, 0.02, 0.5), '#e8e8e8', this.stat, x + (x > 0 ? -4.9 : 4.9), gy + 0.02, z + i * 1.2);
      }
    }
    // the buildings
    this.gigSpots = [];
    CITY_BUILDINGS.forEach((b, i) => this.cityBlock(b, i));
    // GigHub: take delivery gigs here
    const kx = -15, kz = -6;
    this.place(buildKiosk(), kx, kz, PI / 2, null, 1.2);
    this.box(kx, kz, 1.5, 3.1);
    this.npc(buildAlien({ vest: '#ff3df0' }), kx - 1.3, kz, PI / 2, 'Dispatch Dot', 2.7);
    this.gigKiosk = { x: kx, z: kz };
    this.interact(kx, kz, 4.2, () => Gigs.label(), () => Gigs.take()); // (from any side of the kiosk)
    // street furniture
    for (const [x, z] of [[20.5, -30], [20.5, 12], [20.5, 40], [-20.5, -30], [-20.5, 14], [-20.5, 40], [31.5, -12], [31.5, 20.5], [-31.5, -12], [-31.5, 20.5], [5.8, -16], [-5.8, -26], [5.8, -30]]) {
      this.place(buildStreetLamp(), x, z, x > 0 ? PI : 0, null, 0.2); this.circle(x, z, 0.25);
    }
    const cars = ['#d6281b', '#3a8fd8', '#ffd23f', '#46d98a', '#ff9ad5', '#f4f1ea'];
    [[28.2, 4, true], [-28.2, -8, true], [-28.2, 44, true], [28.2, -44, true], [-10, 24.8, false], [10, 27.3, false], [-42, -18.3, false], [44, -21.7, false]].forEach(([x, z, alongZ], i) => {
      this.place(buildCar(cars[i % cars.length]), x, z, alongZ ? (x > 0 ? 0 : PI) : (z > 0 ? PI / 2 : -PI / 2), null, 1);
      this.box(x, z, alongZ ? 2.0 : 4.1, alongZ ? 4.1 : 2.0, gy + 1.6);
    });
    for (let i = 0; i < 4; i++) {
      const a = 0.8 + i * (PI / 2), x = Math.cos(a) * 13, z = Math.sin(a) * 13;
      this.place(buildBench(), x, z, Math.atan2(-x, -z), null, 0.8); this.circle(x, z, 0.8);
      const tx = Math.cos(a + 0.16) * 13, tz = Math.sin(a + 0.16) * 13;
      this.place(buildTrashCan(), tx, tz, 0, null, 0.3); this.circle(tx, tz, 0.35);
    }
    for (const [px, pz] of [[12, 8], [-8, 13], [-8, -13], [6.5, -13.5]]) { this.place(buildCityTree(rng), px, pz, 0, null, 0.7); this.box(px, pz, 1.4, 1.4, gy + 0.6); }
    for (const [x, z] of [[21.5, 4], [-21.5, 30.5], [30.5, -15.5], [-21.5, -15.5]]) { this.place(buildHydrant(), x, z, 0, null, 0.2); this.circle(x, z, 0.25); }
    this.place(buildDumpster(), -38, 20, 0, null, 1.2); this.box(-38, 20, 2.6, 1.6, gy + 1.4);
    // litter all over the streets: vacuum it up
    this.scatter(18, 10, 84, 1.2, (x, z) => this.addNode('litter', x, this.gh(x, z) - 0.02, z));
  }
  // one building: walls with windows, a rooftop you can stand on (jump pad to get up), a front door
  cityBlock(b, i) {
    const gy = this.h(b.x, b.z), top = gy + b.h;
    const wall = buildingBox(b.w, b.h + 1, b.d, ['#c9d2e6', '#e6d2c9', '#d2e6d0', '#e6e0c9', '#d9c9e6'][i % 5]);
    wall.position.set(b.x, gy + (b.h - 1) / 2, b.z);
    this.group.add(wall);
    this.box(b.x, b.z, b.w, b.d, top - 0.05, true);
    this.plats.push({ x0: b.x - b.w / 2, x1: b.x + b.w / 2, z0: b.z - b.d / 2, z1: b.z + b.d / 2, top });
    this.occupied.push({ x: b.x, z: b.z, r: Math.hypot(b.w, b.d) / 2 + 1 });
    // the roof: a low wall round the edge (it stops you walking off), air conditioners, a stair hut
    const R = grp(this.stat, b.x, top, b.z);
    mk(BOX(b.w - 0.1, 0.12, b.d - 0.1), '#4a4e5a', R, 0, 0.06, 0);
    for (const s of [-1, 1]) {
      mk(BOX(b.w, 0.6, 0.25), '#8a8f9a', R, 0, 0.3, s * (b.d / 2 - 0.125));
      mk(BOX(0.25, 0.6, b.d), '#8a8f9a', R, s * (b.w / 2 - 0.125), 0.3, 0);
      this.box(b.x, b.z + s * (b.d / 2 - 0.125), b.w, 0.25, top + 0.6);
      this.box(b.x + s * (b.w / 2 - 0.125), b.z, 0.25, b.d, top + 0.6);
    }
    const hx = b.w / 2 - 1.3, hz = b.d / 2 - 1.3;
    mk(BOX(1.6, 2.2, 1.6), '#6d7480', R, -hx + 0.3, 1.1, -hz + 0.3);
    mk(BOX(0.9, 1.7, 0.06), '#3b3f4a', R, -hx + 0.3, 0.9, -hz + 1.12);
    this.box(b.x - hx + 0.3, b.z - hz + 0.3, 1.6, 1.6, top + 2.2);
    mk(BOX(1.2, 0.8, 1.0), '#b0b8c0', R, hx - 0.3, 0.4, -hz + 0.4);
    mk(CYL(0.36, 0.36, 0.06, 10), '#3b3f4a', R, hx - 0.3, 0.82, -hz + 0.4);
    this.box(b.x + hx - 0.3, b.z - hz + 0.4, 1.2, 1.0, top + 0.8);
    if (i % 3 === 1) { const wt = buildWaterTower(); wt.position.set(hx - 0.8, 0, hz - 0.8); R.add(wt); this.box(b.x + hx - 0.8, b.z + hz - 0.8, 2.4, 2.4, top + 5); }
    // a drop zone in the middle (roof deliveries go here)
    mk(CYL(0.9, 0.9, 0.04, 16), '#ffd23f', R, 0, 0.14, 0, { emissive: '#6a5000' });
    // the front door, with the shop's name over it, and a jump pad up to the roof next to it
    const F = { n: [0, 1], s: [0, -1], e: [1, 0], w: [-1, 0] }[b.door];
    const fx = b.x + F[0] * b.w / 2, fz = b.z + F[1] * b.d / 2, along = F[0] ? b.d : b.w;
    const door = grp(this.stat, fx, gy, fz); door.rotation.y = Math.atan2(F[0], F[1]);
    mk(BOX(1.6, 2.4, 0.12), '#1a1d26', door, 0, 1.2, 0.02);
    mk(BOX(2.6, 0.14, 1.1), ['#d6281b', '#3a8fd8', '#46d98a', '#ffd23f', '#ff3df0'][i % 5], door, 0, 2.75, 0.55);
    const sign = signMesh([b.name.toUpperCase()], Math.min(along - 1, 4.4), 0.7, { bg: '#12072e', color: '#fff6d0', border: '#ffd23f', glow: true });
    sign.position.set(0, 3.5, 0.08); door.add(sign);
    if (b.neon) {
      const n = signMesh([b.neon], Math.min(along * 0.8, 9), Math.min(1.8, b.h * 0.18), { bg: '#12072e', color: ['#ff3df0', '#3df0ff', '#ffd23f'][i % 3], border: false, glow: true });
      n.position.set(0, b.h - 1.4, 0.08); door.add(n);
    }
    if (b.ad) {
      const ad = buildBillboard(b.ad, ['#ffd23f', '#3df0ff'], Math.min(along - 2, 7));
      ad.position.set(-F[0] * 0.5, 0, -F[1] * 0.5); ad.rotation.y = Math.atan2(F[0], F[1]); R.add(ad);
    }
    this.gigSpots.push({ x: fx + F[0] * 1.6, z: fz + F[1] * 1.6, y: gy, name: b.name, roof: false });
    this.gigSpots.push({ x: b.x, z: b.z, y: top, name: b.name + ' (roof)', roof: true });
    const side = along / 2 - 1.6, px = fx + F[0] * 1.8 + (F[0] ? 0 : side), pz = fz + F[1] * 1.8 + (F[0] ? side : 0);
    this.place(buildJumpPad(), px, pz, Math.atan2(-F[0], -F[1]), null, 1.2);
    this.vents.push({ x: px, z: pz, r: 1.1, y0: gy, top: top + 2.6, pad: true, dx: -F[0], dz: -F[1] });
  }

  /* ----- physics queries ----- */
  // how high the top of a cap is right here (a mushroom's dome, or a floating island's flat top), or
  // -Infinity if this spot isn't over it
  capAt(c, x, z) {
    const dx = x - c.x, dz = z - c.z, d2 = dx * dx + dz * dz;
    if (d2 >= c.r * c.r) return -Infinity;
    return c.dome ? c.rim + c.dome * Math.sqrt(Math.max(0, 1 - d2 / (c.R * c.R))) : c.top;
  }
  ground(x, z, y) {
    let g = this.gh(x, z);
    if (this.parked && this.parked.visible) {
      const base = this.parked.position.y;
      const floor = Math.abs(x) < 1.65 && z > -2.7 && z < 3.5 ? base + CABIN.floor :
        x >= 1.6 && x <= 6.2 && Math.abs(z - .2) < 1 ? base + CABIN.floor * (6.2 - x) / 4.6 : -Infinity;
      if (y >= floor - .7) g = Math.max(g, floor);
    }
    for (const c of this.caps) { const t = this.capAt(c, x, z); if (y >= t - 0.7) g = Math.max(g, t); }
    for (const p of this.plats) {
      const top = p.top + (p.slopeX || 0) * (x - (p.x0 + p.x1) / 2);
      if (x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1 && y >= top - 0.7) g = Math.max(g, top);
    }
    return g;
  }
  // the lowest mushroom cap over the head of someone standing at y (Infinity: open sky)
  ceiling(x, z, y) {
    let c0 = Infinity;
    if (this.parked && this.parked.visible && Math.abs(x) < 1.4 && z > -2.7 && z < 3.5) {
      const base = this.parked.position.y;
      if (y >= base + CABIN.floor - .3 && y < base + 4.5)
        c0 = base + 4.68; // underside of the remodeled shuttle's solid roof
    }
    for (const p of this.plats) {
      if (p.bot == null || x <= p.x0 || x >= p.x1 || z <= p.z0 || z >= p.z1) continue;
      const bot = p.bot + (p.slopeX || 0) * (x - (p.x0 + p.x1) / 2);
      if (y + 1.8 <= bot + .05) c0 = Math.min(c0, bot);
    }
    for (const c of this.caps) {
      if (c.bot == null || y + 1.8 > c.bot + 0.05) continue;
      const dx = x - c.x, dz = z - c.z;
      if (dx * dx + dz * dz < c.R * c.R * 0.9) c0 = Math.min(c0, c.bot);
    }
    return c0;
  }
  onPlatform(x, z, y) {
    for (const c of this.caps) { const t = this.capAt(c, x, z); if (t > -Infinity && y >= t - 0.7) return true; }
    for (const p of this.plats) {
      const top = p.top + (p.slopeX || 0) * (x - (p.x0 + p.x1) / 2);
      if (x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1 && y >= top - 0.7) return true;
    }
    return false;
  }
  blocked(x, z, y) {
    if (Math.hypot(x, z) > PLANET_R * 1.5) return true;
    // a mushroom cap in the way of your head (walking into a low one, or under one as the ground rises):
    // you stop there, instead of walking through it. Above its rim, you're climbing onto it.
    for (const c of this.caps) {
      if (c.bot == null) continue;
      const dx = x - c.x, dz = z - c.z, rr = c.R * 0.95 + 0.35;
      if (dx * dx + dz * dz > rr * rr) continue;
      const feet = Math.max(y, this.gh(x, z));
      if (feet + 1.8 > c.bot && feet < c.rim - 0.5) return true;
    }
    // (no walls in the water: wade into a pond, or out into the sea until it's too deep, see LocalPlayer.update.
    // On Nimbus-9 you can walk right off the edge. Don't.)
    return false;
  }
  // is this point inside a building? (shots stop there)
  solidAt(p) {
    for (const b of this.boxes) if (b.solid && p.y < b.top && p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1) return true;
    return false;
  }
  collide(pos, rad) {
    for (const c of this.circles) {
      if (Math.abs(pos.x - c.x) > c.r + rad || Math.abs(pos.z - c.z) > c.r + rad) continue;
      if (c.top != null && (pos.y > c.top || pos.y + 1.8 < c.bot)) continue; // (a floating island: only its sides)
      if (c.hull) { const push=this.sceneryPush(c,pos.x,pos.z,rad); if(push) {pos.x=push.x;pos.z=push.z;} continue; }
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
  // where a critter can walk: dry land, not into buildings, rocks or trees
  walkable(x, z, rad = 0.3) {
    if (Math.hypot(x, z) > PLANET_R + 2 || this.h(x, z) < 0.6) return false;
    for (const b of this.boxes) if (x > b.x0 - rad && x < b.x1 + rad && z > b.z0 - rad && z < b.z1 + rad) return false;
    for (const b of this.indoors) if (x > b.x0 - rad && x < b.x1 + rad && z > b.z0 - rad && z < b.z1 + rad) return false;
    for (const c of this.circles) { if(c.hull) {if(this.sceneryPush(c,x,z,rad)) return false;continue;} if (c.bot != null) continue; const dx = x - c.x, dz = z - c.z, r = c.r + rad; if (dx * dx + dz * dz < r * r) return false; }
    return true;
  }
  // open dry ground for a meteor to hit: not a building or rock, and not the
  // flat pads (your ship and the shop are a safe zone)
  landable(x, z) {
    if (Math.hypot(x, z) > PLANET_R || this.h(x, z) < 0.8) return false;
    for (const p of this.pads) if (this.padDist(p, x, z) < 1) return false;
    for (const b of this.boxes) if (x > b.x0 - 1 && x < b.x1 + 1 && z > b.z0 - 1 && z < b.z1 + 1) return false;
    for (const c of this.circles) if (Math.hypot(x - c.x, z - c.z) < c.r + 1.2) return false;
    return true;
  }

  update(dt, t) {
    const pp = G.player ? G.player.pos : null;
    for (const n of this.npcs) {
      n.t += dt;
      n.m.root.position.y = this.gh(n.x, n.z) + Math.abs(Math.sin(n.t * 2)) * 0.04;
      if (pp && n.m.head) {
        const dx = pp.x - n.x, dz = pp.z - n.z;
        const want = Math.hypot(dx, dz) < 9 ? U.angDiff(n.ry, Math.atan2(dx, dz)) : 0;
        n.m.head.rotation.y = U.damp(n.m.head.rotation.y, U.clamp(want, -1, 1), 5, dt);
      }
      if (n.m.bulb) n.m.bulb.visible = Math.sin(t * 4) > 0;
    }
    for (const nd of this.nodes) {
      if (nd.taken) continue;
      if (pp) nd.mesh.visible = (nd.x - pp.x) ** 2 + (nd.z - pp.z) ** 2 < NODE_VIEW * NODE_VIEW;
      if (nd.orbit) { if (!nd.grab) this.moveGhost(nd); continue; }
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
    if (this.bulbA) {
      const on = Math.floor(t * 3) % 2 === 0; // the marquee bulbs chase each other
      this.bulbA.emissiveIntensity = on ? 1.5 : 0.15;
      this.bulbB.emissiveIntensity = on ? 0.15 : 1.5;
      this.bigChip.rotation.y += dt * 0.7;
      for (const sl of this.searchlights) sl.m.rotation.set(sl.s * (0.28 + 0.14 * Math.sin(t * 0.37 + sl.ph)), 0, -0.3 + 0.38 * Math.sin(t * 0.5 + sl.ph));
      this.casinoMusic(dt);
    }
  }
  // a ghost drifts round and round its graveyard. It goes by the clock, so everyone sees about the same thing.
  moveGhost(n) {
    const o = n.orbit, a = (Date.now() / 1000) * o.spd + o.ph;
    n.x = o.cx + Math.cos(a) * o.r; n.z = o.cz + Math.sin(a) * o.r;
    n.y = this.gh(n.x, n.z) + o.h + Math.sin(a * 3.1) * 0.3;
    n.mesh.position.set(n.x, n.y, n.z);
    n.mesh.rotation.y = Math.atan2(-Math.sin(a) * o.spd, Math.cos(a) * o.spd);
    n.mesh.userData.body.rotation.z = Math.sin(a * 4) * 0.15;
  }
  // inside the casino the music turns into lounge jazz (only if the music is on at all)
  casinoMusic(dt) {
    this.musicT = (this.musicT || 0) - dt;
    if (this.musicT > 0) return;
    this.musicT = 0.4;
    const on = Sound.music.on, want = G.mode === 'planet' && this.inCasino(G.player.pos) ? 'lounge' : this.cfg.music;
    if (on && on !== want && (on === 'lounge' || on === this.cfg.music)) Sound.playMusic(want);
  }
}

/* ---------------- boss arena (reskinned per planet) ---------------- */
const ARENA_SKIN = {
  scrap: { deck: '#7a6a5a', ring: '#5a4a3a', post: '#3b3f4a', rail: '#ffb23e', deco: '#8f6b52' },
  gloop: { deck: '#9a58c4', ring: '#ff5fb8', post: '#f3e9d2', rail: '#43e0c0', deco: '#9b5de5' }, // (the arena floors contrast with their bosses)
  luck:  { deck: '#2a1c48', ring: '#ffd23f', post: '#ff3df0', rail: '#3df0ff', deco: '#ffd23f', neon: true },
  frost: { deck: '#8ec0e0', ring: '#e8f8ff', post: '#5d7a96', rail: '#ffffff', deco: '#c9e6f5' }, // (Frostbyte's own light is soft enough now that a white boss isn't lost in the glare)
  zorb:  { deck: '#3a2448', ring: '#ffd23f', post: '#2a1f2e', rail: '#ff5a1f', deco: '#ff5a1f', neon: true },
  spook: { deck: '#3a3348', ring: '#7dff8a', post: '#2a2238', rail: '#b9a4ff', deco: '#44523f', neon: true },
  cloud: { deck: '#aebfe6', ring: '#ffffff', post: '#8e9cc4', rail: '#ffd6f4', deco: '#ffffff', light: 0.8 },
  city:  { deck: '#3c404c', ring: '#ffd23f', post: '#2f3340', rail: '#3df0ff', deco: '#5a4a7a', neon: true },
};
class Arena {
  constructor(idx) {
    const cfg = PLANETS[idx], sk = ARENA_SKIN[cfg.id];
    this.cfg = cfg;
    this.group = new THREE.Group();
    const st = grp(this.group);
    // (built smooth and round, like the bosses that fight on it)
    withHi(null, () => {
      mk(CYL(ARENA_R, ARENA_R + 0.6, 1.6, 128), sk.deck, st, 0, DECK_Y - 0.8, 0);
      tf(mk(TOR(ARENA_R + 0.02, 0.1, 8, 160), sk.deck, st, 0, DECK_Y - 0.08, 0), Math.PI / 2); // (a rounded lip on the edge)
      mk(CYL(ARENA_R - 2, ARENA_R - 2, 0.04, 128), sk.ring, st, 0, DECK_Y + 0.01, 0);
      mk(CYL(ARENA_R - 2.4, ARENA_R - 2.4, 0.05, 128), sk.deck, st, 0, DECK_Y + 0.02, 0);
      mk(CYL(3, 3, 0.06, 48), sk.ring, st, 0, DECK_Y + 0.03, 0);
      mk(CYL(2.6, 2.6, 0.07, 48), sk.deck, st, 0, DECK_Y + 0.035, 0);
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        mk(CYL(0.2, 0.24, 1.2, 6), sk.post, st, Math.cos(a) * (ARENA_R - 0.3), DECK_Y + 0.6, Math.sin(a) * (ARENA_R - 0.3));
        mk(SPH(0.24), sk.post, st, Math.cos(a) * (ARENA_R - 0.3), DECK_Y + 1.2, Math.sin(a) * (ARENA_R - 0.3));
        if (sk.neon && i % 2 === 0) mk(SPH(0.22, 6, 5), sk.rail, st, Math.cos(a) * (ARENA_R - 0.3), DECK_Y + 1.35, Math.sin(a) * (ARENA_R - 0.3), { emissive: sk.rail });
      }
      tf(mk(TOR(ARENA_R - 0.3, 0.09, 8, 180), sk.rail, st, 0, DECK_Y + 1.15, 0, sk.neon ? { emissive: sk.rail } : undefined), Math.PI / 2);
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
    });
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
