'use strict';
/* =========================================================
   SPACE GOOBERS — shared globals & helpers
   ========================================================= */
const V3 = THREE.Vector3;

const G = {
  mode: 'menu',          // menu | planet | boss | space
  planet: 0,             // index into PLANETS
  diff: 'easy',          // world difficulty (DIFFS)
  worldId: null,
  time: 0, paused: false,
  scene: null, camera: null, renderer: null, sun: null, hemi: null,
  player: null, world: null, worlds: {}, arena: null, boss: null, liquid: null, sky: null,
  remotes: new Map(),
  online: false, isHost: true, myId: 'solo',
  name: 'Goober', color: '#ff7a3d',
  panel: null, chatting: false, locked: false, started: false,
  progress: [],          // boss ids beaten (the host's save is the source of truth)
  crew: { summons: {}, heat: 0 }, // shared crew tasks (boss summoning items, pizza warmth), run by the host
  ff: false,             // friendly fire (a world setting the host picks)
  shake: 0,
  settings: { sens: 1, vol: 0.7, music: 0.45, quality: 'high', view: 'fp' }, // view: 'fp' first person, 'tp' third person (V)
};

const U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  damp: (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt)),
  rand: (a, b) => a + Math.random() * (b - a),
  randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  r2: (n) => Math.round(n * 100) / 100,
  bucks: (n) => (n < 0 ? '-' : '') + '$' + Math.floor(Math.abs(n)).toLocaleString('en-US'),
  esc: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  $: (id) => document.getElementById(id),
  seeded(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  angDiff(a, b) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  },
  weighted(list, rng = Math.random) { // list of [item, weight]
    let tot = 0;
    for (const e of list) tot += e[1];
    let r = rng() * tot;
    for (const e of list) { r -= e[1]; if (r <= 0) return e[0]; }
    return list[list.length - 1][0];
  },
  // does segment p0->p1 touch sphere (c, r)?
  segSphere(p0, p1, c, r) {
    const dx = p1.x - p0.x, dy = p1.y - p0.y, dz = p1.z - p0.z;
    const fx = p0.x - c.x, fy = p0.y - c.y, fz = p0.z - c.z;
    const L2 = dx * dx + dy * dy + dz * dz;
    const t = L2 > 0 ? U.clamp(-(fx * dx + fy * dy + fz * dz) / L2, 0, 1) : 0;
    const qx = fx + dx * t, qy = fy + dy * t, qz = fz + dz * t;
    return qx * qx + qy * qy + qz * qz <= r * r;
  },
  // squared distance from point p to a player's body (vertical segment from feet+0.3 to feet+1.7)
  bodyDist2(p, feet) {
    const y = U.clamp(p.y, feet.y + 0.3, feet.y + 1.7);
    const dx = p.x - feet.x, dy = p.y - y, dz = p.z - feet.z;
    return dx * dx + dy * dy + dz * dz;
  },
  hexToCss: (n) => '#' + n.toString(16).padStart(6, '0'),
};

/* ---------- materials: chunky cel-shaded toon look ---------- */
const TOON_GRAD = (() => {
  const d = new Uint8Array([125, 125, 125, 255, 195, 195, 195, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

const _mats = new Map();
function M(color, opts) {
  if (HI && HI.mat) return MH(color, opts, HI.mat);
  const key = String(color) + '|' + (opts ? JSON.stringify(opts) : '');
  let m = _mats.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: TOON_GRAD }, opts || {}));
    m.userData.shared = true;
    _mats.set(key, m);
  }
  return m;
}

/* ---------- smooth mode: round, smoothly shaded shapes (bosses, their minions and shots) ----------
   While HI is set (see withHi), the shape helpers below make many-sided shapes and rounded
   boxes, and mk() keeps their smooth normals instead of flattening them. HI.mat picks a
   material set: 'boss' / 'fx' add a rim light plus the hit flash and charge glow the boss
   fight drives (HI_U), null keeps the plain shared materials. */
let HI = null;
function withHi(mat, fn) {
  const prev = HI;
  HI = { mat };
  try { return fn(); } finally { HI = prev; }
}
// how many sides a round thing of radius r gets in smooth mode
const hiSeg = (r, lo = 12, hi = 40) => U.clamp(Math.round(12 + r * 16), lo, hi);
const smoothGeo = (geo) => { geo.userData.smooth = true; return geo; };
// keep a smooth shape's normals but drop the index (mergeLocal / mergeStatic only glue unindexed shapes)
function unindex(geo) {
  if (!geo.index) return geo;
  const g = geo.toNonIndexed();
  geo.dispose();
  g.userData.smooth = true;
  return g;
}
// a box with rounded edges and corners, flat faces (after three.js's RoundedBoxGeometry)
function roundBox(w, h, d, r, seg = 2) {
  r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
  if (r < 0.012) return new THREE.BoxGeometry(w, h, d);
  const n = seg * 2 + 1;
  const src = new THREE.BoxGeometry(1, 1, 1, n, n, n), g = src.toNonIndexed();
  src.dispose();
  const pos = g.attributes.position.array, nor = g.attributes.normal.array;
  const bx = w / 2 - r, by = h / 2 - r, bz = d / 2 - r, half = 0.5 / n, v = new V3();
  for (let i = 0; i < pos.length; i += 3) {
    const sx = Math.sign(pos[i]), sy = Math.sign(pos[i + 1]), sz = Math.sign(pos[i + 2]);
    v.set(pos[i] - sx * half, pos[i + 1] - sy * half, pos[i + 2] - sz * half).normalize();
    pos[i] = bx * sx + v.x * r; pos[i + 1] = by * sy + v.y * r; pos[i + 2] = bz * sz + v.z * r;
    nor[i] = v.x; nor[i + 1] = v.y; nor[i + 2] = v.z;
  }
  return smoothGeo(g);
}

// the smooth material sets: the usual toon shading plus a rim light, and two effects the boss
// fight turns up and down for everything in the set at once (uFlash: flash white when hit,
// uGlow: glow in the attack's color while winding up). 'crit' is the critters: their rim is an edge
// that stands out from the planet (a dark outline on bright ones, see setAtmosphere; uRimE: how far in it starts)
const HI_U = {};
for (const s of ['boss', 'fx', 'crit']) {
  HI_U[s] = { uFlash: { value: 0 }, uGlow: { value: 0 }, uGlowCol: { value: new THREE.Color('#ffffff') }, uRim: { value: new THREE.Color('#ffffff') }, uRimK: { value: s === 'boss' ? 0.42 : s === 'fx' ? 0.3 : 0 }, uRimE: { value: s === 'crit' ? 0.56 : 0.52 } };
}
const HI_FRAG_PARS = 'uniform float uFlash, uGlow, uRimK, uRimE;\nuniform vec3 uGlowCol, uRim;\n';
const HI_FRAG_MAIN = `
  float rimD = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
  outgoingLight += uRim * uRimK * smoothstep(uRimE, uRimE + 0.28, rimD);
  outgoingLight += uGlowCol * uGlow * (0.25 + 0.75 * rimD);
  outgoingLight = mix(outgoingLight, vec3(1.0), uFlash);
  gl_FragColor = vec4( outgoingLight, diffuseColor.a );`;
const _hiMats = new Map();
function MH(color, opts, set) {
  const key = set + '|' + String(color) + '|' + (opts ? JSON.stringify(opts) : '');
  let m = _hiMats.get(key);
  if (m) return m;
  m = new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: TOON_GRAD }, opts || {}));
  m.userData.shared = true;
  const u = HI_U[set];
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', HI_FRAG_PARS + 'void main() {')
      .replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', HI_FRAG_MAIN);
  };
  m.customProgramCacheKey = () => 'hi';
  _hiMats.set(key, m);
  return m;
}

/* ---------- geometry helpers ---------- */
function flat(geo) {
  let g = geo;
  if (geo.index) { g = geo.toNonIndexed(); geo.dispose(); }
  g.computeVertexNormals();
  return g;
}
function mk(geo, color, parent, x = 0, y = 0, z = 0, opts) {
  const mat = color && color.isMaterial ? color : M(color, opts);
  const m = new THREE.Mesh(geo.userData.smooth ? unindex(geo) : flat(geo), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
// set rotation / scale fluently
function tf(o, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  o.rotation.set(rx, ry, rz);
  o.scale.set(sx, sy, sz);
  return o;
}
function grp(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
}
// (in smooth mode: rounded boxes, and anything with more than 3 sides gets plenty of them;
//  3-sided cylinders and cones stay prisms and pyramids, gems stay faceted)
const BOX = (w, h, d) => HI ? roundBox(w, h, d, Math.min(0.35, Math.min(w, h, d) * 0.22)) : new THREE.BoxGeometry(w, h, d);
const CYL = (rt, rb, h, s = 8, open = false) => HI && s > 3
  ? smoothGeo(new THREE.CylinderGeometry(rt, rb, h, Math.max(s, hiSeg(Math.max(rt, rb))), 1, open))
  : new THREE.CylinderGeometry(rt, rb, h, s, 1, open);
const SPH = (r, w = 8, h = 6) => HI ? smoothGeo(new THREE.SphereGeometry(r, hiSeg(r, 16, 36), Math.round(hiSeg(r, 16, 36) * 0.7))) : new THREE.SphereGeometry(r, w, h);
const HEMI = (r, w = 10, h = 5) => HI
  ? smoothGeo(new THREE.SphereGeometry(r, hiSeg(r, 16, 36), Math.round(hiSeg(r, 16, 36) * 0.35) + 2, 0, Math.PI * 2, 0, Math.PI / 2))
  : new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2, 0, Math.PI / 2);
const ICO = (r, d = 0) => HI ? smoothGeo(new THREE.IcosahedronGeometry(r, r > 1 ? 6 : 4)) : new THREE.IcosahedronGeometry(r, d);
const DOD = (r) => new THREE.DodecahedronGeometry(r, 0);
const OCT = (r) => new THREE.OctahedronGeometry(r, 0);
const CONE = (r, h, s = 8) => HI && s > 3 ? smoothGeo(new THREE.ConeGeometry(r, h, Math.max(s, hiSeg(r)))) : new THREE.ConeGeometry(r, h, s);
const TOR = (r, t, rs = 6, ts = 14) => HI ? smoothGeo(new THREE.TorusGeometry(r, t, Math.max(rs, 10), Math.max(ts, hiSeg(r, 24, 64)))) : new THREE.TorusGeometry(r, t, rs, ts);

/* ---------- canvas textures & text ---------- */
const FONT = '"Chakra Petch", "Arial Narrow", Arial, sans-serif';
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  draw(c, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.anisotropy = 4;
  t.userData = t.userData || {};
  t.userData.canvas = cv;
  return t;
}
function textSprite(text, o = {}) {
  const size = o.size || 48, pad = o.pad == null ? 16 : o.pad;
  const font = `700 ${size}px ${FONT}`;
  const mc = document.createElement('canvas').getContext('2d');
  mc.font = font;
  const w = Math.ceil(mc.measureText(text).width) + pad * 2, h = Math.ceil(size * 1.4);
  const tex = canvasTex(w, h, (c) => {
    if (o.bg) { c.fillStyle = o.bg; roundRect(c, 0, 0, w, h, h * 0.3); c.fill(); }
    c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (o.stroke) { c.lineWidth = size * 0.18; c.strokeStyle = o.stroke; c.lineJoin = 'round'; c.strokeText(text, w / 2, h / 2 + size * 0.05); }
    c.fillStyle = o.color || '#fff';
    c.fillText(text, w / 2, h / 2 + size * 0.05);
  });
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: o.depthTest !== false, fog: false });
  const s = new THREE.Sprite(mat);
  const sc = o.scale || 0.01;
  s.scale.set(w * sc, h * sc, 1);
  s.renderOrder = o.order || 10;
  return s;
}
// a flat sign with one or more lines of text
function signMesh(lines, w, h, o = {}) {
  lines = Array.isArray(lines) ? lines : [lines];
  const px = Math.min(1024, Math.round(w * 128)), py = Math.min(1024, Math.round(h * 128));
  const tex = canvasTex(px, py, (c) => {
    c.fillStyle = o.bg || '#2b1d14';
    roundRect(c, 0, 0, px, py, Math.min(px, py) * 0.12); c.fill();
    if (o.border !== false) {
      c.lineWidth = Math.min(px, py) * 0.06; c.strokeStyle = o.border || '#ffd23f';
      roundRect(c, c.lineWidth / 2, c.lineWidth / 2, px - c.lineWidth, py - c.lineWidth, Math.min(px, py) * 0.1); c.stroke();
    }
    const n = lines.length;
    let fs = (py * 0.72) / n;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    lines.forEach((ln, i) => {
      let f = fs * (i === 0 && n > 1 ? 1.05 : 0.85);
      c.font = `700 ${f}px ${FONT}`;
      while (c.measureText(ln).width > px * 0.88 && f > 8) { f -= 2; c.font = `700 ${f}px ${FONT}`; }
      c.fillStyle = (o.colors && o.colors[i]) || o.color || '#ffffff';
      if (o.glow) { c.shadowColor = c.fillStyle; c.shadowBlur = f * 0.35; }
      c.fillText(ln, px / 2, (py / n) * (i + 0.5) + f * 0.04);
    });
  });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: !!o.transparent, side: o.double ? THREE.DoubleSide : THREE.FrontSide });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

function disposeObj(o) {
  o.traverse((c) => {
    if (c.geometry && !c.geometry.userData.shared) c.geometry.dispose();
    if (c.material && !c.material.userData.shared) {
      if (c.material.map && !c.material.map.userData.shared) c.material.map.dispose();
      c.material.dispose();
    }
  });
}

// glue several non-indexed geometries into one, flat-shaded
function mergeGeos(list) {
  let n = 0;
  for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3);
  let off = 0;
  for (const g of list) { pos.set(g.attributes.position.array, off); off += g.attributes.position.array.length; g.dispose(); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

/* ---------- merge static meshes by material (big draw-call saver) ---------- */
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  root.traverse((o) => {
    if (!o.isMesh || !o.material || !o.material.userData.shared || o.geometry.index) return;
    if (o.material.transparent) return;
    let p = o, skip = false;
    while (p && p !== root) { if (p.userData.dynamic) { skip = true; break; } p = p.parent; }
    if (skip) return;
    // (things that shouldn't take shadows, like smooth characters, stay apart from the things that do)
    const key = o.material.uuid + (o.receiveShadow ? '' : '|nr');
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, meshes: [], recv: o.receiveShadow });
    buckets.get(key).meshes.push(o);
  });
  const v = new V3(), nm = new THREE.Matrix3();
  for (const { mat, meshes, recv } of buckets.values()) {
    if (meshes.length < 2) continue;
    let count = 0;
    for (const m of meshes) count += m.geometry.attributes.position.count;
    const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3);
    let off = 0;
    for (const m of meshes) {
      const pa = m.geometry.attributes.position, na = m.geometry.attributes.normal;
      nm.getNormalMatrix(m.matrixWorld);
      for (let i = 0; i < pa.count; i++) {
        v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld);
        pos[off * 3] = v.x; pos[off * 3 + 1] = v.y; pos[off * 3 + 2] = v.z;
        v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
        nor[off * 3] = v.x; nor[off * 3 + 1] = v.y; nor[off * 3 + 2] = v.z;
        off++;
      }
      m.parent.remove(m);
      m.geometry.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.computeBoundingSphere();
    const mm = new THREE.Mesh(geo, mat);
    mm.castShadow = true; mm.receiveShadow = recv;
    root.add(mm);
  }
}
// the same trick for a model that moves around (an NPC, a snail): its parts get merged in the
// model's own space, so it can still be moved as a whole. Anything under `keep` (a head that turns,
// a wheel that spins) and any mesh flagged userData.keep stays separate.
function mergeLocal(root, keep = []) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const walk = (o) => {
    for (const c of o.children) {
      if (keep.includes(c)) continue;
      if (c.isMesh && !c.userData.keep && !c.children.length && c.material && c.material.userData.shared && !c.material.transparent && !c.geometry.index) {
        if (!buckets.has(c.material)) buckets.set(c.material, []);
        buckets.get(c.material).push(c);
      }
      walk(c);
    }
  };
  walk(root);
  const v = new V3(), rel = new THREE.Matrix4(), nm = new THREE.Matrix3();
  for (const [mat, meshes] of buckets) {
    if (meshes.length < 2) continue;
    let count = 0;
    for (const m of meshes) count += m.geometry.attributes.position.count;
    const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3);
    let off = 0, shadow = false;
    for (const m of meshes) {
      rel.multiplyMatrices(inv, m.matrixWorld);
      nm.getNormalMatrix(rel);
      const pa = m.geometry.attributes.position, na = m.geometry.attributes.normal;
      for (let i = 0; i < pa.count; i++, off++) {
        v.fromBufferAttribute(pa, i).applyMatrix4(rel);
        pos[off * 3] = v.x; pos[off * 3 + 1] = v.y; pos[off * 3 + 2] = v.z;
        v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
        nor[off * 3] = v.x; nor[off * 3 + 1] = v.y; nor[off * 3 + 2] = v.z;
      }
      shadow = shadow || m.castShadow;
      m.parent.remove(m);
      m.geometry.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.computeBoundingSphere();
    const mm = new THREE.Mesh(geo, mat);
    mm.castShadow = shadow; mm.receiveShadow = true;
    root.add(mm);
  }
  return root;
}

/* ---------- save data (per player name, in this browser) ---------- */
const SAVE_DEFAULT = {
  v: 3, // save format: 2 = with the three newer planets, 3 = you keep every gun you buy (see migrateSave)
  bucks: 100, zap: -1, cargoLvl: 0, vacLvl: 0, // zap: the gun in your hand (-1 = the free Squirt Pistol)
  guns: [], // every gun you've bought (switch between them at a shop, or press 1 again)
  drill: false, boots: false, socks: false, armor: false, lifeIns: false, charm: false, peel: false,
  skates: false, dash: false, stomp: false, springs: false, cape: false, jetpack: false, // movement gear
  nades: 0, cargo: [], hats: ['none'], hat: 'none',
  beaten: [], seenIntro: false,
  summons: {}, pity: {}, heat: 0, // boss summoning items held, tries since the last drop, pizza warmth
  fun: {}, // your best and your medal on each planet's fun thing: { rings: { best, medal }, ... } (see fun.js)
  minis: {}, // mini bosses on each planet: { gloop: { k: critters zapped toward the next one, n: how many went down } }
  graves: [], // where you died and dropped your stuff: [{gid, p, x, y, z, items}] (see Drops.graveDrop)
  stats: { collected: 0, gambled: 0, won: 0, lost: 0, deaths: 0, jackpots: 0, bossWins: 0 },
};
let SAVE = JSON.parse(JSON.stringify(SAVE_DEFAULT));
let SAVE_KEY = null;
function loadSaveKey(key) {
  SAVE_KEY = key;
  const fresh = JSON.parse(JSON.stringify(SAVE_DEFAULT));
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const d = migrateSave(JSON.parse(raw));
      SAVE = Object.assign(fresh, d);
      SAVE.stats = Object.assign(JSON.parse(JSON.stringify(SAVE_DEFAULT.stats)), d.stats || {});
    } else SAVE = fresh;
  } catch (e) { SAVE = fresh; }
  Wardrobe.apply(); // your hats come with you
}
// Saves from before Spookulon, Nimbus-9 and Gigopolis: Zorblax Prime used to be planet 4 (it's 7 now) and
// the Pizza Cutter used to be gun 5 (it's 8 now). Anyone who had already made it to Zorblax Prime keeps it open.
// Saves from before you could keep your guns only knew your best one; the shop showed every gun below it
// as owned ("yours is better"), so those are all yours now.
function migrateSave(d) {
  if (!d) return d;
  if (!(d.v >= 2)) {
    const OLD_ZORB = 4, NEW_ZORB = PLANETS.findIndex((p) => p.id === 'zorb');
    if (d.planet === OLD_ZORB) d.planet = NEW_ZORB;
    if (OLD_TO_NEW_ZAP[d.zap] != null) d.zap = OLD_TO_NEW_ZAP[d.zap];
    d.graves = (d.graves || []).map((g) => Object.assign({}, g, {
      p: g.p === OLD_ZORB ? NEW_ZORB : g.p,
      items: (g.items || []).map((e) => { const m = /^gear:zap:(\d+)$/.exec(e); return m && OLD_TO_NEW_ZAP[+m[1]] != null ? 'gear:zap:' + OLD_TO_NEW_ZAP[+m[1]] : e; }),
    }));
    if ((d.beaten || []).includes('snowdad')) { d.zorbOpen = true; d.newPlanets = true; }
    d.v = 2;
  }
  if (d.v < 3) {
    if (!Array.isArray(d.guns)) d.guns = d.zap >= 0 ? Array.from({ length: d.zap + 1 }, (_, i) => i) : [];
    d.v = 3;
  }
  return d;
}
// switch to a gun you own (-1: the Squirt Pistol)
function equipGun(i) {
  if (i !== -1 && !SAVE.guns.includes(i)) return false;
  SAVE.zap = i;
  persist();
  return true;
}
const nameKey = (name) => name.toLowerCase().replace(/\s+/g, '_');
// the old one-save-per-name format (still used if you join a host running an old version)
function loadSave(name) { loadSaveKey('spacegoobers_v1_' + nameKey(name)); }

/* ---------- worlds: separate playthroughs, like save slots ----------
   Solo and host games run in one of your worlds. When you join a friend,
   your stuff in *their* world is kept in a guest save for that world. */
const Worlds = {
  list() { return lsGet('spacegoobers_worlds', []); },
  store(l) { lsSet('spacegoobers_worlds', l); },
  key: (id) => 'spacegoobers_world_' + id,
  guestKey: (worldId, name) => 'spacegoobers_guest_' + worldId + '_' + nameKey(name),
  create(name, diff) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const l = this.list();
    l.push({ id, name: (name || '').trim().slice(0, 24) || 'World ' + (l.length + 1), created: Date.now(), played: Date.now(), diff: DIFFS[diff] ? diff : 'easy' });
    this.store(l);
    return id;
  },
  remove(id) {
    this.store(this.list().filter((w) => w.id !== id));
    try { localStorage.removeItem(this.key(id)); } catch (e) { /* ignore */ }
  },
  diff(id) { const w = this.list().find((x) => x.id === id); return (w && DIFFS[w.diff]) ? w.diff : 'easy'; },
  ff(id) { const w = this.list().find((x) => x.id === id); return !!(w && w.ff); },
  setFF(id, on) { this.store(this.list().map((w) => (w.id === id ? Object.assign(w, { ff: !!on }) : w))); },
  load(id) {
    loadSaveKey(this.key(id));
    this.store(this.list().map((w) => (w.id === id ? Object.assign(w, { played: Date.now() }) : w)));
  },
  // quick facts for the world picker
  info(id) {
    const d = migrateSave(lsGet(this.key(id), null) || {});
    return { planet: d.planet || 0, beaten: (d.beaten || []).length, bucks: d.bucks == null ? SAVE_DEFAULT.bucks : d.bucks };
  },
  // saves from before worlds existed become worlds, once
  migrate() {
    if (lsGet('spacegoobers_worlds', null) !== null) return;
    const l = [];
    try {
      // collect the keys first: adding worlds while looping shuffles localStorage's order
      const old = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('spacegoobers_v1_')) old.push(k); }
      for (const k of old) {
        const id = 'old' + l.length + Date.now().toString(36);
        localStorage.setItem(this.key(id), localStorage.getItem(k));
        const who = k.slice('spacegoobers_v1_'.length).replace(/_/g, ' ');
        l.push({ id, name: who + "'s world", created: Date.now(), played: Date.now() - l.length });
      }
    } catch (e) { /* storage off: no worlds to bring over */ }
    this.store(l);
  },
};
function persist() {
  if (!SAVE_KEY) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* private mode etc. */ }
  Wardrobe.sync();
}

/* ---------- your hats belong to YOU, not to a world ----------
   The hats you own and the one you're wearing are kept once for this browser, so they
   come with you into every world (friends' worlds too), and survive a Hardcore world
   being deleted. Only ever added to: a hat can't get lost. */
const Wardrobe = {
  KEY: 'spacegoobers_wardrobe',
  last: '',
  load() {
    const w = lsGet(this.KEY, null);
    if (w && Array.isArray(w.hats)) return w;
    // the first time: collect the hats from every save you already have (wearing the newest world's)
    const hats = new Set(['none']), played = {};
    let hat = 'none', newest = -1;
    for (const x of Worlds.list()) played[Worlds.key(x.id)] = x.played || 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !/^spacegoobers_(world|guest|v1)_/.test(k)) continue;
        const d = JSON.parse(localStorage.getItem(k) || '{}');
        for (const h of d.hats || []) if (HATS[h]) hats.add(h);
        if (d.hat && HATS[d.hat] && (played[k] || 0) > newest) { newest = played[k] || 0; hat = d.hat; }
      }
    } catch (e) { /* storage off */ }
    return { hats: [...hats], hat };
  },
  // a save was just loaded: it gets every hat you own, and your hat goes on
  apply() {
    const w = this.load();
    const hats = new Set(['none', ...(SAVE.hats || []), ...w.hats].filter((h) => HATS[h]));
    SAVE.hats = [...hats];
    SAVE.hat = hats.has(w.hat) ? w.hat : 'none';
    this.sync(true);
  },
  // (on every save) new hats, or a different one on your head: remember that for every world
  sync(force) {
    const s = SAVE.hat + '|' + SAVE.hats.join(',');
    if (s === this.last && !force) return;
    this.last = s;
    const hats = new Set([...this.load().hats, ...SAVE.hats].filter((h) => HATS[h]));
    lsSet(this.KEY, { hats: [...hats], hat: HATS[SAVE.hat] ? SAVE.hat : 'none' });
  },
};
/* ---------- backpack entries ----------
   An entry is an item id, optionally with a style multiplier baked in: "crab:big*1.5".
   cargoRes() turns an entry into what the shop needs: its name, value and icon. */
const _cargoCache = new Map();
function cargoRes(entry) {
  let r = _cargoCache.get(entry);
  if (r) return r;
  const i = entry.indexOf('*');
  const key = i < 0 ? entry : entry.slice(0, i);
  const mult = i < 0 ? 1 : Number(entry.slice(i + 1)) || 1;
  const base = RES[key] || { name: key, v: 0, icon: 'box', desc: 'No idea what this is.' };
  r = mult === 1 ? base : Object.assign({}, base, { name: `${base.name} · x${mult} style`, v: Math.round(base.v * mult), mult });
  _cargoCache.set(entry, r);
  return r;
}
const cargoFree = () => CARGO[SAVE.cargoLvl] - SAVE.cargo.length;

function addBucks(n, quiet) {
  SAVE.bucks = Math.max(0, Math.round(SAVE.bucks + n));
  if (typeof UI !== 'undefined') UI.bucks(n, quiet);
  persist();
}
function gambleStat(bet, payout) {
  SAVE.stats.gambled += bet;
  const net = payout - bet;
  if (net > 0) SAVE.stats.won += net; else SAVE.stats.lost += -net;
}
function lsGet(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
