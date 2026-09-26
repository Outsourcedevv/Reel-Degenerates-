'use strict';
/* =========================================================
   Pictures of the real 3D models, for the interface: shop
   items, the backpack, the hotbar, crate prizes, slot symbols,
   and the faces of shopkeepers, bosses and your crew.
   Each picture is rendered once by a small offscreen renderer
   and kept (as an image URL) for as long as the game runs.
   ========================================================= */
// how to point the camera at each kind of model (yaw/pitch: where the camera sits,
// top: only frame the top part of the model, for faces)
const THUMB_LOOKS = {
  item:     { yaw: 0.5, pitch: 0.42, margin: 1.1 },
  tool:     { yaw: Math.PI / 2 + 0.45, pitch: 0.38, margin: 1.08 },
  hat:      { yaw: 0.45, pitch: 0.4, margin: 1.12 },
  hatTop:   { yaw: Math.PI - 0.5, pitch: 0.8, margin: 1.12 }, // (flat hats, seen from above)
  critter:  { yaw: 0.65, pitch: 0.32, margin: 1.08 },
  side:     { yaw: Math.PI / 2, pitch: 0.2, margin: 1.06 }, // (racing snails: seen side-on, heading left)
  front:    { yaw: 0.25, pitch: 0.18, margin: 1.1 },
  portrait: { yaw: 0.3, pitch: 0.08, margin: 1.04, top: 0.36 },
  boss:     { yaw: 0.35, pitch: 0.12, margin: 1.04, top: 0.62 },
  planet:   { yaw: 0.3, pitch: 0.3, margin: 1.02 },
};

const Thumbs = {
  SIZE: 160,
  cache: new Map(),
  queue: [],

  init() {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(this.SIZE, this.SIZE, false);
    r.setClearColor(0x000000, 0);
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#4a3d66', 0.62));
    this.key = new THREE.DirectionalLight('#ffffff', 0.72);
    this.rim = new THREE.DirectionalLight('#c9dcff', 0.35);
    this.scene.add(this.key, this.key.target, this.rim, this.rim.target);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  },

  // what a picture key shows, and how to frame it
  model(key) {
    const [k, a, b] = key.split(':');
    switch (k) {
      case 'zap': { const z = buildZapperVM(ZAPPERS[+a] ? +a : 0); z.remove(z.userData.flash); return { o: z, look: 'tool' }; }
      case 'vac': return { o: buildVacVM(a === '1'), look: 'tool' };
      case 'drill': return { o: buildDrillVM(), look: 'tool' };
      case 'peel': return { o: buildPeelVM(), look: 'tool' };
      case 'cargo': return { o: buildBackpackItem(+a || 0) };
      case 'hat': return { o: buildHat(a), look: a === 'pizza' ? 'hatTop' : 'hat' };
      case 'crit': return { o: buildCritter(a, b === 'gold').root, look: 'critter' };
      case 'snail': return { o: buildSnail(SNAILS[+a].color), look: 'side' };
      case 'face': return { o: buildShopkeeper(a).root, look: 'portrait' };
      case 'boss': return { o: buildBossModel(a).root, look: 'boss' };
      case 'astro': return { o: buildAstronaut({ color: a, hat: b || 'none' }).root, look: 'portrait' };
      case 'planet': return { o: buildPlanetGlobe(+a || 0), look: 'planet' };
      case 'sym': return { o: buildSlotSymbol(a), look: 'front' };
    }
    const f = ITEM_MODELS[key];
    return f ? { o: f() } : null;
  },

  // the picture for a key, as an image URL (rendered the first time it's asked for)
  url(key) {
    let u = this.cache.get(key);
    if (u === undefined) { u = this.render(key); this.cache.set(key, u); }
    return u;
  },
  // an <img> of it (or a line drawing if there's no model for it; fallback null: nothing)
  img(key, cls = '', fallback = 'box') {
    const u = key && this.url(key);
    return u ? `<img class="thumb ${cls}" src="${u}" alt="" draggable="false">` : fallback === null ? '' : icon(fallback, cls);
  },

  render(key) {
    let spec;
    try { spec = this.model(key); } catch (e) { console.warn('no picture for', key, e); return null; }
    if (!spec || !spec.o) return null;
    if (!this.renderer) this.init();
    const look = THUMB_LOOKS[spec.look || 'item'];
    const pivot = new THREE.Group();
    pivot.add(spec.o);
    this.scene.add(pivot);
    pivot.updateMatrixWorld(true);
    // the camera looks along -dir; frame exactly what's there
    const dir = new V3(Math.sin(look.yaw) * Math.cos(look.pitch), Math.sin(look.pitch), Math.cos(look.yaw) * Math.cos(look.pitch));
    const right = new V3().crossVectors(new V3(0, 1, 0), dir).normalize(), up = new V3().crossVectors(dir, right);
    const pts = [], v = new V3();
    let minY = Infinity, maxY = -Infinity;
    pivot.traverse((m) => {
      if (!m.isMesh || !m.visible) return;
      const pa = m.geometry.attributes.position;
      for (let i = 0; i < pa.count; i++) {
        v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld);
        pts.push(v.x, v.y, v.z);
        if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
      }
    });
    const cut = look.top ? maxY - (maxY - minY) * look.top : -Infinity; // faces: just the top of the model
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, d0 = Infinity, d1 = -Infinity;
    for (let i = 0; i < pts.length; i += 3) {
      v.set(pts[i], pts[i + 1], pts[i + 2]);
      const d = v.dot(dir);
      if (d < d0) d0 = d; if (d > d1) d1 = d;
      if (v.y < cut) continue;
      const x = v.dot(right), y = v.dot(up);
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const half = (Math.max(x1 - x0, y1 - y0) / 2) * look.margin || 1;
    // (faces sit at the top of the picture, with the shoulders cut off at the bottom)
    const cx = (x0 + x1) / 2, cy = look.top ? y1 - half * 0.98 : (y0 + y1) / 2;
    const target = new V3().addScaledVector(right, cx).addScaledVector(up, cy).addScaledVector(dir, (d0 + d1) / 2);
    const cam = this.cam, depth = d1 - d0 + 2;
    Object.assign(cam, { left: -half, right: half, top: half, bottom: -half, near: 0.01, far: depth + 2 });
    cam.position.copy(target).addScaledVector(dir, (d1 - d0) / 2 + 1);
    cam.up.copy(up);
    cam.lookAt(target);
    cam.updateProjectionMatrix();
    // key light from the upper left, a cool rim light from behind
    this.key.position.copy(target).addScaledVector(up, 2).addScaledVector(right, -1.2).addScaledVector(dir, 2);
    this.key.target.position.copy(target);
    this.rim.position.copy(target).addScaledVector(up, 1).addScaledVector(right, 1.5).addScaledVector(dir, -2);
    this.rim.target.position.copy(target);
    this.renderer.render(this.scene, cam);
    const url = this.renderer.domElement.toDataURL('image/png');
    this.scene.remove(pivot);
    disposeObj(pivot);
    return url;
  },

  // draw pictures ahead of time while the game is idle, so menus open instantly
  warm(keys) {
    for (const k of keys) if (k && !this.cache.has(k) && !this.queue.includes(k)) this.queue.push(k);
    if (this.warming || !this.queue.length) return;
    this.warming = true;
    const step = (deadline) => {
      const end = performance.now() + 8;
      while (this.queue.length && (deadline && deadline.timeRemaining ? deadline.timeRemaining() > 4 : performance.now() < end)) this.url(this.queue.shift());
      if (this.queue.length) later(step); else this.warming = false;
    };
    const later = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 500 }) : setTimeout(fn, 30));
    later(step);
  },
  // everything the interface is likely to need
  warmAll() {
    const keys = ['zap:0', 'vac:0', 'drill', 'peel', 'cargo:0', 'nade'];
    for (const s of Object.values(SHOPS)) for (const it of s.items) keys.push(this.shopKey(it));
    for (const id in SHOPS) keys.push('face:' + id);
    for (const k in ITEM_MODELS) if (k.startsWith('res:')) keys.push(k);
    for (const list of Object.values(CRITTERS)) for (const c of list) keys.push('crit:' + c.id, 'crit:' + c.id + ':gold');
    for (const k of Object.keys(HATS)) if (k !== 'none') keys.push('hat:' + k);
    for (const b in BOSSES) keys.push('boss:' + b, 'sum:' + b);
    for (const k of Object.keys(SLOT_ICON)) keys.push('sym:' + k);
    SNAILS.forEach((_, i) => keys.push('snail:' + i));
    PLANETS.forEach((_, i) => keys.push('planet:' + i));
    keys.push('prize:jackpot', 'prize:ticket', 'prize:bucks', 'prize:sock', 'prize:coupon', 'prize:iou', 'prize:rock', 'prize:sandwich', 'prize:empty');
    this.warm(keys);
  },

  /* ----- which picture goes with which thing ----- */
  shopKey(it) {
    switch (it.kind) {
      case 'zap': return 'zap:' + it.lvl;
      case 'vac': return 'vac:' + it.lvl;
      case 'cargo': return 'cargo:' + it.lvl;
      case 'hat': return 'hat:' + it.id;
      case 'summon': return 'sum:' + it.b;
      default: return it.kind; // boots, socks, armor, life, charm, nades, drill, peel
    }
  },
  // something in your backpack: 'bolt', 'crab:small*5.85', 'g_rat'...
  cargoKey(entry) {
    const key = entry.split('*')[0];
    if (RES[key] && ITEM_MODELS['res:' + key]) return 'res:' + key;
    const gold = key.startsWith('g_'), id = (gold ? key.slice(2) : key).split(':')[0];
    return 'crit:' + id + (gold ? ':gold' : '');
  },
  // your crewmates (and you): an astronaut in their color and hat
  crewKey(color, hat) { return `astro:${color || '#ffffff'}:${hat || 'none'}`; },
};
