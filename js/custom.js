'use strict';
/* =========================================================
   Dressing up your astronaut: colors, pattern, badge,
   backpack, helmet glass, face and hair (see LOOK_PARTS),
   with a turning 3D preview. Opens from the title screen and
   the pause menu. Your look is kept in this browser and sent
   to your crew, who see exactly this.
   ========================================================= */
const Custom = {
  KEY: 'spacegoobers_look',
  tab: 'suit',

  // your saved look (a brand new player gets a random face to start with)
  load() {
    let code = lsGet(this.KEY, null);
    if (typeof code !== 'string') {
      const l = lookFrom('');
      for (const k of ['skin', 'hair', 'hairCol', 'eyes', 'mouth']) l[k] = U.randi(0, this.part(k).length - 1);
      code = lookCode(l);
      lsSet(this.KEY, code);
    }
    G.look = lookCode(lookFrom(code));
  },
  save() {
    lsSet(this.KEY, G.look);
    lsSet('spacegoobers_color', G.color);
  },
  part(k) { const p = LOOK_PARTS.find((q) => q.k === k); return p.colors || p.opts; },
  // the hats you own and the one you have on (your hats follow you from world to world, see Wardrobe)
  hats() {
    if (G.started && SAVE) return { hats: ['none', ...SAVE.hats.filter((h) => h !== 'none' && HATS[h])], hat: SAVE.hat };
    const w = Wardrobe.load();
    return { hats: ['none', ...w.hats.filter((h) => h !== 'none' && HATS[h])], hat: HATS[w.hat] ? w.hat : 'none' };
  },
  wearHat(h) {
    if (!HATS[h]) return;
    if (G.started && SAVE) { SAVE.hat = h; persist(); return; }
    const w = Wardrobe.load();
    lsSet(Wardrobe.KEY, { hats: w.hats, hat: h });
  },

  /* ----- the screen ----- */
  // fromPause: closing it goes back to the pause menu
  open(fromPause) {
    const L = lookFrom(G.look), hw = this.hats();
    const colorRow = (k, list, sel) => `<div class="swrow">${list.map((c, i) => `<button class="csw ${sel === (k === 'color' ? c : i) ? 'on' : ''}" data-act="set" data-k="${k}" data-v="${k === 'color' ? c : i}" style="background:${c}" title="${c}"></button>`).join('')}</div>`;
    const chipRow = (k, list, sel) => `<div class="chips">${list.map((n, i) => `<button class="chip ${sel === i ? 'on' : ''}" data-act="set" data-k="${k}" data-v="${i}">${U.esc(n)}</button>`).join('')}</div>`;
    const group = (tab, k, label, body, now = '') => `<div class="cgroup ${tab === this.tab ? '' : 'hidden'}" data-tab="${tab}"><h5>${label}<b data-now="${k}">${now}</b></h5>${body}</div>`;
    const part = (k) => {
      const p = LOOK_PARTS.find((q) => q.k === k);
      return group(p.tab, k, p.label, p.colors ? colorRow(k, p.colors, L[k]) : chipRow(k, p.opts, L[k]), p.opts ? U.esc(p.opts[L[k]]) : '');
    };
    const hats = `<div class="chips hatchips">${hw.hats.map((h) => `<button class="chip ${hw.hat === h ? 'on' : ''}" data-act="set" data-k="hat" data-v="${h}">${h === 'none' ? '' : Thumbs.img('hat:' + h, '', null)}${U.esc(HATS[h])}</button>`).join('')}</div>` +
      (hw.hats.length < 2 ? '<p class="tip">Shops sell hats, and Mystery Crates on Luckstar give them out. They show up here once you have some.</p>' : '');
    const body = [
      group('suit', 'color', 'Accent color', colorRow('color', ACCENT_COLORS, G.color)),
      part('body'), part('pattern'), part('badge'), part('pack'),
      part('skin'), part('hair'), part('hairCol'), part('eyes'), part('mouth'), part('extra'), part('visor'),
      group('face', 'hat', 'Hat', hats),
    ].join('');
    const tabs = [['suit', 'Suit'], ['face', 'Face & helmet']].map(([t, n]) => `<button class="stab ${t === this.tab ? 'on' : ''}" data-act="tab" data-t="${t}">${n}</button>`).join('');
    const html = `<h2 class="ph">Your astronaut</h2><p class="psub">Your crew sees you exactly like this.</p>
      <div class="cust">
        <div class="cust-view"><canvas id="custcv"></canvas><small>Drag to turn around</small></div>
        <div class="cust-side"><div class="stabs">${tabs}</div><div class="cust-body">${body}</div></div>
      </div>
      <div class="row2"><button class="btn" data-act="rand">${icon('dice')}Randomize</button><button class="btn green" data-act="close">Done</button></div>`;
    UI.openPanel(html, (act, d) => this.act(act, d), null, () => this.stopView());
    UI.backToPause = !!fromPause;
    this.startView();
  },
  act(act, d) {
    const el = UI.el['panel-inner'];
    if (act === 'tab') {
      this.tab = d.t;
      el.querySelectorAll('.stab').forEach((b) => b.classList.toggle('on', b.dataset.t === d.t));
      el.querySelectorAll('.cgroup').forEach((g) => g.classList.toggle('hidden', g.dataset.tab !== d.t));
      return;
    }
    if (act === 'set') this.set(d.k, d.v);
    if (act === 'rand') {
      const l = {};
      for (const p of LOOK_PARTS) l[p.k] = U.randi(0, (p.colors || p.opts).length - 1);
      // (mostly with a backpack, a badge and a plain-ish face: all-random tends to look like a clown)
      if (Math.random() < 0.6) l.extra = 0;
      if (l.pack === 4 && Math.random() < 0.7) l.pack = U.randi(0, 3);
      G.color = U.pick(ACCENT_COLORS);
      G.look = lookCode(l);
      for (const p of [{ k: 'color' }, ...LOOK_PARTS]) this.mark(p.k);
    }
    this.changed();
  },
  set(k, v) {
    if (k === 'color') { if (/^#[0-9a-f]{6}$/i.test(v)) G.color = v; } else if (k === 'hat') this.wearHat(v);
    else { const l = lookFrom(G.look); l[k] = Number(v) || 0; G.look = lookCode(lookFrom(l)); }
    this.mark(k);
  },
  // show which choice is picked in a row
  mark(k) {
    const el = UI.el['panel-inner'], L = lookFrom(G.look), hat = this.hats().hat;
    const now = k === 'color' ? G.color : k === 'hat' ? hat : String(L[k]);
    el.querySelectorAll(`[data-act="set"][data-k="${k}"]`).forEach((b) => b.classList.toggle('on', b.dataset.v === now));
    const p = LOOK_PARTS.find((q) => q.k === k), lab = el.querySelector(`[data-now="${k}"]`);
    if (lab && p && p.opts) lab.textContent = p.opts[L[k]];
  },
  changed() {
    this.save();
    this.pop = 1;
    this.buildModel();
    if (typeof Game !== 'undefined' && Game.drawLook) Game.drawLook();
  },

  /* ----- the turning preview (its own little renderer, only while the screen is open) ----- */
  startView() {
    const cv = U.$('custcv');
    if (!cv) return;
    let r;
    try { r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { return; }
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    r.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#ffffff', '#4a3d66', 0.62));
    const key = new THREE.DirectionalLight('#ffffff', 0.75), rim = new THREE.DirectionalLight('#c9dcff', 0.4);
    key.position.set(-2, 4, 4); rim.position.set(2.5, 2, -3);
    scene.add(key, rim);
    // a little round stand to stand on, with a soft shadow
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.08, 48), M('#262c3a'));
    stand.position.y = -0.04;
    const blob = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.002;
    scene.add(stand, blob);
    this.pivot = new THREE.Group();
    scene.add(this.pivot);
    this.cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    Object.assign(this, { r, scene, cv, yaw: 0.35, base: 0.35, zoom: this.tab === 'face' ? 1 : 0, t: 0, last: performance.now(), drag: null, pop: 0 });
    cv.onpointerdown = (e) => { this.drag = { x: e.clientX, base: this.base }; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } };
    cv.onpointermove = (e) => { if (this.drag) this.base = this.drag.base + (e.clientX - this.drag.x) * 0.012; };
    cv.onpointerup = cv.onpointercancel = () => { this.drag = null; };
    this.buildModel();
    const frame = () => { if (this.r !== r) return; this.frame(); this.raf = requestAnimationFrame(frame); };
    this.raf = requestAnimationFrame(frame);
  },
  buildModel() {
    if (!this.r) return;
    if (this.model) { this.pivot.remove(this.model.root); disposeObj(this.model.root); }
    this.model = buildAstronaut({ color: G.color, look: G.look, hat: this.hats().hat });
    this.pivot.add(this.model.root);
  },
  frame() {
    const now = performance.now(), dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now; this.t += dt;
    const cv = this.cv, w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * this.r.getPixelRatio()) || cv.height !== Math.round(h * this.r.getPixelRatio())) this.r.setSize(w, h, false);
    // turn slowly back and forth around where you dragged it; the face tab zooms in on the helmet
    this.yaw = U.damp(this.yaw, this.base + (this.drag ? 0 : Math.sin(this.t * 0.7) * 0.3), 8, dt);
    this.pivot.rotation.y = this.yaw;
    this.zoom = U.damp(this.zoom, this.tab === 'face' ? 1 : 0, 6, dt);
    const z = this.zoom, cam = this.cam;
    cam.aspect = w / h;
    cam.position.set(0, U.lerp(1.28, 1.95, z), U.lerp(6.2, 3.3, z));
    cam.lookAt(0, U.lerp(1.12, 1.8, z), 0);
    cam.updateProjectionMatrix();
    // idle: breathing, a look around, and a happy hop whenever something changes
    const m = this.model, t = this.t;
    this.pop = Math.max(0, this.pop - dt * 2.5);
    const hop = Math.sin((1 - this.pop) * Math.PI) * (this.pop > 0 ? 1 : 0);
    m.root.position.y = hop * 0.12;
    m.root.scale.set(1 + hop * 0.04, 1 - hop * 0.03 + Math.sin(t * 2.2) * 0.006, 1 + hop * 0.04);
    m.head.rotation.y = Math.sin(t * 0.9) * 0.18;
    m.head.rotation.z = Math.sin(t * 1.3) * 0.04;
    m.armL.rotation.z = -0.08 - Math.sin(t * 2.2) * 0.03 - hop * 0.5;
    m.armR.rotation.z = 0.08 + Math.sin(t * 2.2) * 0.03 + hop * 0.5;
    this.r.render(this.scene, cam);
  },
  stopView() {
    if (!this.r) return;
    cancelAnimationFrame(this.raf);
    disposeObj(this.scene);
    this.r.dispose();
    try { this.r.forceContextLoss(); } catch (e) { /* ignore */ }
    this.r = null; this.model = null; this.scene = null;
  },
};
