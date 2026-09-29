'use strict';
/* =========================================================
   Boss fights. The host runs the AI and sends attacks; every
   client simulates the hazards and checks hits on itself.

   Every attack starts with a wind-up everyone can see (the
   boss strikes a pose and glows, and the attack's name shows
   under the health bar), then goes off. Everything that can
   hurt you is marked on the floor first, shots glow and leave
   trails, and arrows around the crosshair point at danger you
   can't see.
   ========================================================= */
const MINION_KIND = { blorb: 'slime', snowdad: 'snow', count: 'bat', stormy: 'tornado', chad: 'intern', zorblax: 'guard' };
const MINION_SPD = { guard: 4.2, snow: 3.8, bat: 4.4, tornado: 4.8, intern: 3.6 };
const RING_COL = { gary: '#b8d86b', blorb: '#ff9ad5', jerry: '#ffd23f', snowdad: '#bff6ff', count: '#ff3d6e', stormy: '#b8d8ff', chad: '#3df0ff', zorblax: '#ff3df0' };
// how often a boss says something (subtitles): now and then, a random line every `every` seconds, and never
// sooner than `gap` after the last thing it said. An attack's own line only gets said `attack` of the time.
const BOSS_TALK = { every: [22, 34], gap: 14, attack: 0.35 };
// how a boss goes down (seconds): stunned stiff with sparks popping off it, then it spins up off the floor
// like a top, puffing up bigger and bigger... and goes POP (confetti, coins, its head and hands flying off).
// The fight ends `end` seconds in.
const BOSS_DIE = { stun: 0.9, spin: 1.5, end: 4.2 };
// after a win, the way home: a beam of light in the middle of the arena. Walk into it (r: how close) and you're
// beamed back to the planet; wait: seconds until it takes you anyway
const BOSS_EXIT = { r: 1.4, wait: 30, delay: 1.2, color: '#7dffea' };
const CONFETTI = ['#ff4b6e', '#ffd23f', '#3aa7ff', '#46d98a', '#b77dff', '#ffffff'];
// its last words
const BOSS_LAST = {
  gary: 'My trash... my beautiful... TRASH...', blorb: 'Tell my jellies... I loved them... wobbly...', jerry: 'The house... always... LOSES?!',
  snowdad: 'I\'m melting! ...That\'s not even a joke! I\'m actually melting!', count: 'Not like this! I haven\'t even had DINNER!',
  stormy: 'I\'m just... a light drizzle now...', chad: 'I\'m going to need... to circle back... on this...', zorblax: 'I WANT... TO SPEAK... TO YOUR... MANAGERRRR...',
};
const LANE_COL = { jerry: '#ffd23f', count: '#d6281b', stormy: '#fff36b', chad: '#3df0ff' }; // (the rest: pink lasers)
// in phase 2 attacks come faster and faster, down to this fraction of the normal wait
const MIN_COMP = { count: 0.75, stormy: 0.7, chad: 0.65, zorblax: 0.55 };
const JERRY_W = { cherry: 3, bell: 3, 7: 2, cash: 3, lemon: 3, skull: 1 };
const BOSS_DMG = 0.8; // every boss attack hits this much as hard as it's listed
const DANGER = '#ff2a2a'; // floor warnings for anything that hurts
// the glow and trail of each kind of boss shot
const SHOT_COL = {
  trash: '#c8e27a', tire: '#ffb347', goo: '#ff5fb8', coin: '#ffd23f', cherry: '#ff4a4a', lemon: '#fff06b', snow: '#e8f6ff', icicle: '#9fe8ff',
  laser: '#ff3df0', pizza: '#ffb13d', meteor: '#ff6a1f', bat: '#c07bff', breadstick: '#ffcf7a', hail: '#cfeaff', bolt: '#fff36b', email: '#8fd0ff',
  coffee: '#d6a064', slip: '#ff9ad5', card: '#ff5a7a', bigsnow: '#ffffff', lid: '#c8e27a',
  bone: '#f4efe0', dice: '#ff5a5a', parcel: '#e0b070', fries: '#ffd23f', lava: '#ff6a1f', ecto: '#7dff8a', // (mini bosses)
};
const _shotC = {};
const shotColor = (k) => _shotC[k] || (_shotC[k] = new THREE.Color(SHOT_COL[k] || '#ff6a6a'));
const ZONE_COL = { stink: '#7ccf2a', goo: '#c8127e', ice: '#5ec8ff', fire: '#ff6a1f' };
// bosses that float (no walking legs)
const FLOATS = { count: 1, stormy: 1, zorblax: 1, chad: 1, jerry: 1 };
const TAU = Math.PI * 2;
const wrap = (a) => ((a % TAU) + TAU) % TAU;
const arr3 = (v) => [U.r2(v.x), U.r2(v.y), U.r2(v.z)];

/* ---------- glowing halos and trails for everything a boss throws (all in one draw call) ---------- */
const _gv2 = new THREE.Vector2();
class GlowPoints {
  constructor(max = 1600) {
    this.max = max;
    this.trail = []; this.heads = [];
    const g = new THREE.BufferGeometry();
    const attr = (n) => new THREE.BufferAttribute(new Float32Array(max * n), n).setUsage(THREE.DynamicDrawUsage);
    this.aPos = attr(3); this.aCol = attr(3); this.aSize = attr(1); this.aAlpha = attr(1);
    g.setAttribute('position', this.aPos); g.setAttribute('tint', this.aCol); g.setAttribute('size', this.aSize); g.setAttribute('alpha', this.aAlpha);
    g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { scale: { value: 400 } },
      vertexShader: `
        attribute vec3 tint; attribute float size; attribute float alpha;
        uniform float scale; varying vec3 vT; varying float vA;
        void main() {
          vT = tint; vA = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = min(size * scale / max(0.1, -mv.z), 300.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vT; varying float vA;
        void main() {
          float r = length(gl_PointCoord - 0.5) * 2.0;
          if (r > 1.0) discard;
          float a = 1.0 - r; a *= a;
          vec3 c = mix(vT, vec3(1.0), smoothstep(0.42, 0.0, r) * 0.8);
          gl_FragColor = vec4(c, a * vA);
        }`,
      transparent: true, depthWrite: false,
    });
    this.pts = new THREE.Points(g, this.mat);
    this.pts.frustumCulled = false;
    this.pts.renderOrder = 6;
  }
  // a puff that fades out where it was left (trails, launch flashes)
  puff(p, col, size, life) { if (this.trail.length < this.max - 150) this.trail.push({ x: p.x, y: p.y, z: p.z, c: col, s: size, life, max: life }); }
  // a glow for just this frame (the halo around a shot)
  head(p, col, size, a = 0.55) { this.heads.push({ x: p.x, y: p.y, z: p.z, c: col, s: size, a }); }
  update(dt, cam) {
    G.renderer.getDrawingBufferSize(_gv2);
    this.mat.uniforms.scale.value = _gv2.y / (2 * Math.tan((cam.fov * Math.PI) / 360));
    const P = this.aPos.array, C = this.aCol.array, S = this.aSize.array, A = this.aAlpha.array;
    let n = 0;
    const put = (x, y, z, c, s, a) => { P[n * 3] = x; P[n * 3 + 1] = y; P[n * 3 + 2] = z; C[n * 3] = c.r; C[n * 3 + 1] = c.g; C[n * 3 + 2] = c.b; S[n] = s; A[n] = a; n++; };
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const t = this.trail[i];
      t.life -= dt;
      if (t.life <= 0) { this.trail[i] = this.trail[this.trail.length - 1]; this.trail.pop(); continue; }
      if (n < this.max) { const k = t.life / t.max; put(t.x, t.y, t.z, t.c, t.s * (0.35 + 0.65 * k), 0.55 * k); }
    }
    for (const h of this.heads) if (n < this.max) put(h.x, h.y, h.z, h.c, h.s, h.a);
    this.heads.length = 0;
    this.pts.geometry.setDrawRange(0, n);
    if (n) for (const a of [this.aPos, this.aCol, this.aSize, this.aAlpha]) a.needsUpdate = true;
  }
  dispose() { this.pts.geometry.dispose(); this.mat.dispose(); }
}

/* ---------- floor warnings: shared shapes and textures ---------- */
const TELE = {
  _t: {}, _disc: null,
  disc() {
    if (!this._disc) { const g = new THREE.CircleGeometry(1, 64); g.rotateX(-Math.PI / 2); g.userData.shared = true; this._disc = g; }
    return this._disc;
  },
  tex(kind) {
    if (this._t[kind]) return this._t[kind];
    let t;
    if (kind === 'wall') { // lasers and sweeping beams: a bright rim on top, fading down
      t = canvasTex(4, 64, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.1, 'rgba(255,255,255,1)'); g.addColorStop(0.16, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0.14)');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
      });
    } else if (kind === 'hot') { // shockwaves: white-hot on top, through yellow and orange to red at the floor
      t = canvasTex(4, 64, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.1, 'rgba(255,250,190,1)'); g.addColorStop(0.3, 'rgba(255,190,50,0.97)');
        g.addColorStop(0.65, 'rgba(255,80,25,0.88)'); g.addColorStop(1, 'rgba(210,10,10,0.7)');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
      });
    } else if (kind === 'chev') { // arrows marching the way something's about to go
      t = canvasTex(64, 64, (c, w, h) => {
        c.fillStyle = 'rgba(255,255,255,0.16)'; c.fillRect(0, 0, w, h);
        c.strokeStyle = '#ffffff'; c.lineWidth = 10; c.lineCap = 'butt'; c.lineJoin = 'miter';
        c.beginPath(); c.moveTo(10, 16); c.lineTo(32, 42); c.lineTo(54, 16); c.stroke();
      });
    } else if (kind === 'stripe') { // hazard stripes
      t = canvasTex(64, 64, (c, w, h) => {
        c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(0, 0, w, h);
        c.fillStyle = 'rgba(255,255,255,0.8)';
        for (let i = -2; i < 3; i++) { c.beginPath(); c.moveTo(i * 32, h); c.lineTo(i * 32 + 14, h); c.lineTo(i * 32 + 14 + h, 0); c.lineTo(i * 32 + h, 0); c.closePath(); c.fill(); }
      });
    } else { // 'swirl': a vortex
      t = canvasTex(128, 128, (c, w, h) => {
        c.translate(w / 2, h / 2); c.strokeStyle = '#ffffff'; c.lineCap = 'round';
        for (let arm = 0; arm < 4; arm++) {
          c.beginPath();
          for (let r = 4; r < 62; r += 2) { const a = arm * Math.PI / 2 + r * 0.075; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
          c.lineWidth = 7; c.globalAlpha = 0.85; c.stroke();
        }
      });
    }
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.userData.shared = true;
    this._t[kind] = t;
    return t;
  },
  // the arrows and stripes crawl along
  tick(dt) {
    if (this._t.chev) this._t.chev.offset.y = (this._t.chev.offset.y - dt * 1.7) % 1;
    if (this._t.stripe) this._t.stripe.offset.x = (this._t.stripe.offset.x + dt * 0.9) % 1;
  },
};
function teleMat(color, opacity, map) {
  return new THREE.MeshBasicMaterial({ color, map: map || null, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}
// a flat curved arrow on the floor around (0, 0): from angle a0, turning da, at radius r (angles like atan2(x, z))
function arcArrow(r, a0, da, w) {
  const n = 28, pos = [];
  const pt = (a, rr) => [Math.sin(a) * rr, 0, Math.cos(a) * rr];
  for (let i = 0; i < n; i++) {
    const a1 = a0 + da * (i / n), a2 = a0 + da * ((i + 1) / n);
    pos.push(...pt(a1, r - w), ...pt(a1, r + w), ...pt(a2, r - w), ...pt(a2, r - w), ...pt(a1, r + w), ...pt(a2, r + w));
  }
  const ae = a0 + da, s = Math.sign(da);
  pos.push(...pt(ae, r - w * 2.8), ...pt(ae, r + w * 2.8), ...pt(ae + s * (w * 3.4) / r, r));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}
// a flat strip on the floor from (0,0,0) along +z (for lanes and beams), uv v counting repeats of its width
function stripGeo(w, len, reps) {
  const g = new THREE.PlaneGeometry(w, len);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, len / 2);
  if (reps) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * reps); }
  return g;
}
// a flat band on the floor around (0, 0) from radius r0 out to r1, moved every frame with setBand
// (the red strip under a shockwave as it spreads)
function bandGeo(seg = 96) {
  const g = new THREE.BufferGeometry(), idx = [];
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((seg + 1) * 6), 3));
  for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setIndex(idx);
  g.userData.seg = seg;
  return g;
}
function setBand(g, r0, r1) {
  const p = g.attributes.position.array, seg = g.userData.seg;
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * TAU, c = Math.cos(a), s = Math.sin(a);
    p[i * 6] = c * r0; p[i * 6 + 1] = 0; p[i * 6 + 2] = s * r0;
    p[i * 6 + 3] = c * r1; p[i * 6 + 4] = 0; p[i * 6 + 5] = s * r1;
  }
  g.attributes.position.needsUpdate = true;
  g.computeBoundingSphere();
}
// take something off the scene and free what it doesn't share
function dropObj(o) {
  if (!o) return;
  if (o.parent) o.parent.remove(o);
  disposeObj(o);
}

class BossFight {
  constructor(id, seed, ids) {
    this.id = id;
    this.def = BOSSES[id];
    this.ids = ids.slice();
    const n = Math.max(1, ids.length);
    this.maxHp = Math.round(this.def.hp * (1 + 0.65 * (n - 1)));
    this.hp = this.maxHp;
    this.m = buildBossModel(id);
    G.scene.add(this.m.root);
    this.pos = new V3(0, -12, -24);
    this.rpos = this.pos.clone();
    this.tpos = this.pos.clone();
    this.rot = 0; this.trot = 0; this.rrot = 0;
    this.st = 'intro'; this.t = 0; this.phase = 1;
    this.contact = 0; this.contactDmg = 15;
    this.projs = []; this.rings = []; this.slams = []; this.lanes = [];
    this.sweeps = []; this.zones = []; this.pulls = []; this.boomers = []; this.tracks = []; this.paths = [];
    this.minions = new Map();
    this.processions = [];
    this.out = new Set();
    this.flash = 0;
    this.reel = null;
    this.over = false;
    this.hidden = false; // (Count Carbula as a cloud of mist)
    this.pz = null; // the pose being struck (a wind-up, then its follow-through)
    this.ai = { atkT: 4.6, tauntT: 6, ang: -Math.PI / 2, mv: null, sendT: 0, comp: 1, mid: 1, tgtT: 0, tgt: null, dieT: 0, queue: [], busy: 0, mk: 1, wv: 0 };
    this.speed = 0;
    this.anim = { sq: 0, sqv: 0, vy: 0, pvy: 0, lx: null, ly: 0, lz: 0, phase: 0, spin: 0, glow: 0, flinch: 0, lean: 0, twist: 0, tilt: 0, y: 0, a: [{ x: 0, z: 0 }, { x: 0, z: 0 }], l: [0, 0], hx: 0, hy: 0, open: 0, pull: 0, cape: 0, dieT: 0, smokeT: 0 };
    // where each moving part sits at rest (poses are offsets from this)
    this.rest = new Map();
    const m = this.m;
    for (const o of [m.body, m.head, m.lid, m.crown, m.board, m.lever, ...(m.arms || []), ...(m.legs || []), ...(m.cape || [])]) {
      if (o) this.rest.set(o, { rx: o.rotation.x, ry: o.rotation.y, rz: o.rotation.z, px: o.position.x, py: o.position.y, pz: o.position.z });
    }
    this.glow = new GlowPoints();
    G.scene.add(this.glow.pts);
    this.hurtDirs = [];
    const u = HI_U.boss;
    u.uFlash.value = 0; u.uGlow.value = 0; u.uRim.value.set('#ffffff'); u.uRimK.value = 0.42;
    const me = this.me();
    me.slowK = 1; me.ext.set(0, 0, 0);
  }

  /* ================= shared helpers ================= */
  me() { return G.player; }
  inFight(id) { return this.ids.includes(id); }
  targets() {
    const out = [];
    const p = this.me();
    if (this.inFight(Net.myId) && !p.dead && !p.ghost) out.push({ id: Net.myId, p: p.pos });
    for (const r of G.remotes.values()) {
      if (!this.inFight(r.id) || r.s.m !== 'boss' || r.s.d || r.s.g) continue;
      out.push({ id: r.id, p: r.tpos });
    }
    return out;
  }
  randTarget() { const t = this.targets(); return t.length ? U.pick(t) : null; }
  nearestTarget(x, z) {
    let best = null, bd = Infinity;
    for (const t of this.targets()) { const d = Math.hypot(t.p.x - x, t.p.z - z); if (d < bd) { bd = d; best = t; } }
    return best;
  }
  // the same goober the wind-up pointed at (if they're still in it), or anyone
  aimAt(id) { return this.targets().find((t) => t.id === id) || this.randTarget(); }
  face(dx, dz) { if (dx || dz) this.rot = Math.atan2(dx, dz); }
  world(o) { // local offset -> world, using the pose everyone sees
    const c = Math.cos(this.rrot), s = Math.sin(this.rrot);
    return new V3(this.rpos.x + o.x * c + o.z * s, this.rpos.y + o.y, this.rpos.z - o.x * s + o.z * c);
  }
  mouth() { return this.world(this.m.mouth); }
  center() { return this.world(this.m.hit[0].o); }
  fire(a) { this.exec(a); Net.toAll({ t: 'batk', a }); }
  later(delay, fn) { this.ai.queue.push({ at: this.t + delay, fn }); }
  randDeck(max) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * max; return new V3(Math.cos(a) * r, DECK_Y, Math.sin(a) * r); }

  /* ================= attack builders (host) ================= */
  P(p, v, k, d, r, o = {}) { return Object.assign({ p: arr3(p), v: arr3(v), k, d, r }, o); }
  aimed(from, to, n, spread, speed, kind, dmg, r, o = {}) {
    const l = [];
    const base = Math.atan2(to.x - from.x, to.z - from.z);
    const dist = Math.hypot(to.x - from.x, to.z - from.z);
    const dy = (to.y + 1.0) - from.y;
    for (let i = 0; i < n; i++) {
      const a = base + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0) + (o.jit ? (Math.random() - 0.5) * o.jit : 0);
      let vy, hs = speed;
      if (o.g) { const T = Math.max(0.4, dist / speed); vy = (dy + 0.5 * o.g * T * T) / T; }
      else { const T = dist / speed; vy = T > 0 ? dy / T : 0; hs = speed; }
      l.push(this.P(from, new V3(Math.sin(a) * hs, vy, Math.cos(a) * hs), kind, dmg, r, { g: o.g || 0, w: (o.step || 0) * i + (o.w || 0), sp: o.sp, tl: o.tl ? 1 : 0 }));
    }
    return { k: 'proj', l };
  }
  spiral(from, arms, count, dur, speed, kind, dmg, r, rotSpeed = 2.4) {
    const l = [];
    const a0 = Math.random() * TAU;
    for (let i = 0; i < count; i++) {
      const arm = i % arms, k = Math.floor(i / arms);
      const w = (k * arms / count) * dur;
      const a = a0 + (arm / arms) * TAU + w * rotSpeed;
      l.push(this.P(from, new V3(Math.sin(a) * speed, 0, Math.cos(a) * speed), kind, dmg, r, { w }));
    }
    return { k: 'proj', l };
  }
  ring(x, z, speed, dmg, w = 0, h = 0.9) { return { k: 'ring', c: [U.r2(x), U.r2(z)], s: speed, d: dmg, w, h, m: 42 }; }
  slam(x, z, r, w, dmg, o) { return Object.assign({ k: 'slam', c: [U.r2(x), U.r2(z)], r, w, d: dmg }, o); }
  lane(a, b, hw, w, dur, dmg, ar) { return { k: 'lane', a: [U.r2(a.x), U.r2(a.z)], b: [U.r2(b.x), U.r2(b.z)], hw, w, dur, d: dmg, ar: ar ? 1 : 0 }; }
  // a beam spinning around (x, z) close to the floor: jump it (a0: where it starts, sp: how fast it turns, rad/s)
  sweep(c, a0, sp, len, w, dur, dmg, h = 0.95) { return { k: 'sweep', c: [U.r2(c.x), U.r2(c.z)], a0: U.r2(a0), sp: U.r2(sp), len, w, dur, d: dmg, h }; }
  // a patch of something nasty that stays a while (sl: how much it slows you)
  zone(x, z, r, w, dur, dmg, kind, sl = 0) { return { k: 'zone', c: [U.r2(x), U.r2(z)], r, w: U.r2(w), dur, d: dmg, kind, sl, tk: 0.6 }; }
  // wind that drags you toward (x, z)
  pull(x, z, r, w, dur, f) { return { k: 'pull', c: [U.r2(x), U.r2(z)], r, w, dur, f }; }
  // a marked path that something is about to come down (just a warning, it doesn't hurt)
  path(a, b, hw, dur, col) { return { k: 'path', a: [U.r2(a.x), U.r2(a.z)], b: [U.r2(b.x), U.r2(b.z)], hw, dur, col }; }
  rain(n, kind, dmg, r, dur = 1.6) {
    const l = [];
    const tg = this.targets();
    for (let i = 0; i < n; i++) {
      let x, z;
      if (i < tg.length && Math.random() < 0.7) { x = tg[i].p.x + (Math.random() - 0.5) * 3; z = tg[i].p.z + (Math.random() - 0.5) * 3; }
      else { const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * (ARENA_R - 1.5); x = Math.cos(a) * rr; z = Math.sin(a) * rr; }
      l.push(this.P(new V3(x, DECK_Y + 24, z), new V3(0, -4, 0), kind, dmg, r, { g: 30, w: (i / n) * dur, tl: 1, sp: r + 0.9 }));
    }
    return { k: 'proj', l };
  }
  spawnMinions(n) {
    const kind = MINION_KIND[this.id];
    const hp = 26 * (1 + 0.3 * (this.ids.length - 1));
    for (let i = 0; i < n && this.minions.size < 9; i++) {
      const a = Math.random() * TAU;
      const id = this.ai.mid++;
      this.minions.set(id, { id, x: Math.cos(a) * (ARENA_R - 1.5), z: Math.sin(a) * (ARENA_R - 1.5), tx: 0, tz: 0, hp, kind, spd: MINION_SPD[kind] || 3.3, mesh: null, hitT: 0 });
    }
    this.fire({ k: 'fx', snd: 'alarm' });
  }
  jumpTo(to, dur, h, onLand) {
    this.ai.mv = { from: this.pos.clone(), to: to.clone(), t: 0, dur, h, onLand };
  }
  clampDeck(v, max) { const d = Math.hypot(v.x, v.z); if (d > max) { v.x *= max / d; v.z *= max / d; } return v; }
  // jump onto someone (a red circle shows where it'll land), then a shockwave
  hop(tp, dur, h, r, dmg, after) {
    const to = this.clampDeck(new V3(tp.x, this.pos.y, tp.z), ARENA_R - 3);
    this.fire(this.slam(to.x, to.z, r, dur, dmg));
    this.face(to.x - this.pos.x, to.z - this.pos.z);
    this.jumpTo(to, dur, h, () => {
      this.fire({ k: 'multi', l: [this.ring(to.x, to.z, 9, 12), { k: 'fx', snd: 'boom', shake: 0.8 }] });
      if (after) after();
    });
  }
  // charge in a straight line through someone (the arrows on the floor show the way)
  dashAt(tp, len, hw, w, dur, dmg, snd) {
    const from = this.pos.clone(), dir = new V3(tp.x - from.x, 0, tp.z - from.z);
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    dir.normalize();
    const to = this.clampDeck(from.clone().addScaledVector(dir, len), ARENA_R - 2.5);
    to.y = from.y;
    this.face(dir.x, dir.z);
    this.fire(this.lane(from, to, hw, w, dur, dmg, true));
    this.later(w, () => { this.fire({ k: 'fx', anim: 'charge', h: dur + 0.2, snd: snd || 'dash' }); this.jumpTo(to, dur, 0.4); });
  }
  // strike a pose everyone can see (and say what's coming), then do it. run() returns the cooldown.
  windup(name, pose, dur, run, o = {}) {
    const ai = this.ai;
    if (this.phase === 2) dur *= 0.85;
    dur = U.r2(dur);
    ai.busy = dur + 0.15;
    this.fire({ k: 'tell', n: name, p: pose, t: dur, h: o.hold || 0.45, c: o.col || RING_COL[this.id], tg: o.tg || 0 });
    this.later(dur, () => {
      const cd = run();
      ai.atkT = Math.max(0.5, (cd || 2.4) * ai.comp * U.rand(0.85, 1.15) - dur);
    });
    return -1;
  }

  /* ================= host AI ================= */
  hostUpdate(dt) {
    const ai = this.ai;
    for (let i = ai.queue.length - 1; i >= 0; i--) if (this.t >= ai.queue[i].at) { const q = ai.queue.splice(i, 1)[0]; if (this.st === 'fight' || this.st === 'intro') q.fn(); }
    if (ai.mv) {
      const mv = ai.mv;
      mv.t += dt;
      const k = U.clamp(mv.t / mv.dur, 0, 1);
      // (a jump flies straight; a glide eases in and out)
      this.pos.lerpVectors(mv.from, mv.to, mv.h > 0 ? k : k * k * (3 - 2 * k));
      this.pos.y += Math.sin(k * Math.PI) * mv.h;
      if (k >= 1) { ai.mv = null; this.pos.copy(mv.to); if (mv.onLand) mv.onLand(); }
    }
    ai.busy = Math.max(0, ai.busy - dt);
    ai.mk = U.damp(ai.mk, ai.busy > 0 ? 0.12 : 1, 5, dt); // (it slows to a stop while winding up)
    if (this.st === 'intro') this.hostIntro(dt);
    else if (this.st === 'fight') {
      if (!ai.mv) this['move_' + this.id](dt);
      ai.atkT -= dt;
      if (this.phase === 2) ai.comp = Math.max(MIN_COMP[this.id] || 0.8, ai.comp - dt * 0.01);
      if (ai.atkT <= 0 && !ai.mv && ai.busy <= 0 && this.targets().length) {
        ai.attackCount = (ai.attackCount || 0) + 1;
        const precision = ['count', 'stormy', 'chad'].includes(this.id) && ai.attackCount % 4 === 0;
        const cd = precision ? this.attackProcession() : this['attack_' + this.id]();
        ai.atkT = cd < 0 ? 99 : (cd || 2.4) * ai.comp * U.rand(0.85, 1.15); // (a wind-up sets it when the attack goes off)
      }
      ai.tauntT -= dt;
      if (ai.tauntT <= 0) {
        ai.tauntT = U.rand(BOSS_TALK.every[0], BOSS_TALK.every[1]);
        const list = this.phase === 2 && this.def.taunts2 ? this.def.taunts2.concat(this.def.taunts) : this.def.taunts;
        this.say(U.pick(list));
      }
      this.hostMinions(dt);
      if (this.checkAllOut(dt)) this.end(false);
    } else if (this.st === 'dying') {
      if (this.t - ai.dieT > BOSS_DIE.end) this.end(true);
    }
    ai.sendT -= dt;
    if (ai.sendT <= 0 && G.online) {
      ai.sendT = 1 / 12;
      Net.toAll({
        t: 'bs', p: [U.r2(this.pos.x), U.r2(this.pos.y), U.r2(this.pos.z)], r: U.r2(this.rot), hp: Math.round(this.hp), ph: this.phase, st: this.st, c: this.contact, cd: this.contactDmg, hd: this.hidden ? 1 : 0,
        mm: [...this.minions.values()].map((m) => [m.id, U.r2(m.x), U.r2(m.z)]),
      });
    }
  }
  hostIntro() {
    const ai = this.ai;
    if (ai.introDone) return;
    ai.introDone = true;
    const id = this.id;
    const roar = { k: 'fx', anim: 'roar', h: 1.1 };
    if (id === 'gary' || id === 'snowdad') {
      this.pos.set(0, id === 'gary' ? -5 : DECK_Y, -30);
      this.later(1.0, () => this.jumpTo(new V3(0, DECK_Y, -8), 1.4, 9, () => { this.fire({ k: 'multi', l: [this.ring(0, -8, 9, 10), { k: 'fx', snd: 'boom', shake: 0.8 }, roar] }); }));
    } else if (id === 'blorb') {
      this.pos.set(0, 40, -8);
      this.later(0.6, () => this.jumpTo(new V3(0, DECK_Y, -8), 1.4, 0, () => this.fire({ k: 'multi', l: [this.ring(0, -8, 8, 10), { k: 'fx', snd: 'boom', shake: 1 }, roar] })));
    } else if (id === 'jerry') {
      this.pos.set(0, DECK_Y, -30);
      this.later(0.6, () => this.jumpTo(new V3(0, DECK_Y, -12), 1.6, 6, () => this.fire({ k: 'multi', l: [{ k: 'fx', snd: 'boom', shake: 0.6 }, { k: 'fx', anim: 'pull', h: 0.8 }] })));
    } else if (id === 'count') { // floats down out of the dark, cackling
      this.pos.set(0, 30, -10);
      this.later(0.4, () => this.jumpTo(new V3(0, DECK_Y + 1.2, -10), 2.2, 0, () => this.fire({ k: 'multi', l: [{ k: 'fx', snd: 'laugh', shake: 0.6 }, roar] })));
    } else if (id === 'stormy') { // rolls in from the sky with a clap of thunder
      this.pos.set(0, 40, -10);
      this.later(0.4, () => this.jumpTo(new V3(0, DECK_Y + 4.5, -10), 2.2, 0, () => this.fire({ k: 'multi', l: [this.ring(0, -10, 9, 10), { k: 'fx', snd: 'thunder', shake: 0.8 }, roar] })));
    } else if (id === 'chad') { // jumps in on his hoverboard
      this.pos.set(0, DECK_Y + 0.5, -30);
      this.later(0.6, () => this.jumpTo(new V3(0, DECK_Y + 0.5, -12), 1.6, 6, () => this.fire({ k: 'multi', l: [this.ring(0, -12, 9, 10), { k: 'fx', snd: 'boom', shake: 0.7 }, roar] })));
    } else {
      this.pos.set(0, 40, -10);
      this.later(0.4, () => this.jumpTo(new V3(0, DECK_Y + 2.5, -10), 2.2, 0, () => this.fire({ k: 'multi', l: [{ k: 'fx', snd: 'roar', shake: 0.6 }, roar] })));
    }
    this.later(3.6, () => { this.st = 'fight'; });
  }

  /* ----- movement per boss ----- */
  walkToward(dt, spd, stopDist) {
    const ai = this.ai;
    ai.tgtT -= dt;
    if (ai.tgtT <= 0 || !ai.tgt) { ai.tgt = this.nearestTarget(this.pos.x, this.pos.z) || this.randTarget(); ai.tgtT = 4; }
    const tg = ai.tgt ? ai.tgt.p : new V3();
    const dx = tg.x - this.pos.x, dz = tg.z - this.pos.z, d = Math.hypot(dx, dz);
    this.face(dx, dz);
    // (speed up and slow down smoothly instead of starting and stopping dead)
    ai.wv = U.damp(ai.wv, d > stopDist ? spd * ai.mk : 0, 4, dt);
    if (d > 0.01) { this.pos.x += (dx / d) * ai.wv * dt; this.pos.z += (dz / d) * ai.wv * dt; }
    this.clampDeck(this.pos, ARENA_R - 2.5);
    this.pos.y = DECK_Y;
  }
  move_gary(dt) { this.walkToward(dt, this.phase === 2 ? 2.8 : 2.0, 3.2); this.contact = 2.3; this.contactDmg = 15; }
  move_blorb(dt) { this.walkToward(dt, 1.4, 3.5); this.contact = 2.8; this.contactDmg = 15; }
  move_snowdad(dt) { this.walkToward(dt, this.phase === 2 ? 4.0 : 3.0, 3.0); this.contact = 2.4; this.contactDmg = 18; }
  move_jerry(dt) {
    const ai = this.ai;
    ai.ang += dt * (this.phase === 2 ? 0.3 : 0.18) * ai.mk;
    this.pos.set(Math.cos(ai.ang) * 11.5, DECK_Y, Math.sin(ai.ang) * 11.5);
    this.face(-this.pos.x, -this.pos.z);
    this.contact = 3.0; this.contactDmg = 15;
  }
  move_zorblax(dt) {
    const ai = this.ai;
    ai.ang += dt * (this.phase === 2 ? 0.45 : 0.3) * ai.mk;
    this.pos.set(Math.cos(ai.ang) * 10, DECK_Y + 2.5, Math.sin(ai.ang) * 10);
    const tg = this.nearestTarget(this.pos.x, this.pos.z);
    if (tg) this.face(tg.p.x - this.pos.x, tg.p.z - this.pos.z);
    this.contact = 0;
  }
  // Count Carbula glides after you, hovering, and keeps just out of reach
  move_count(dt) {
    const ai = this.ai;
    ai.tgtT -= dt;
    if (ai.tgtT <= 0 || !ai.tgt) { ai.tgt = this.nearestTarget(this.pos.x, this.pos.z) || this.randTarget(); ai.tgtT = 4; }
    const tg = ai.tgt ? ai.tgt.p : new V3();
    const dx = tg.x - this.pos.x, dz = tg.z - this.pos.z, d = Math.hypot(dx, dz);
    this.face(dx, dz);
    ai.wv = U.damp(ai.wv, d > 5 ? (this.phase === 2 ? 3.4 : 2.4) * ai.mk : 0, 4, dt);
    if (d > 0.01) { this.pos.x += (dx / d) * ai.wv * dt; this.pos.z += (dz / d) * ai.wv * dt; }
    this.clampDeck(this.pos, ARENA_R - 2.5);
    this.pos.y = DECK_Y + 1.2 + Math.sin(this.t * 2) * 0.3;
    this.contact = 2.2; this.contactDmg = 16;
  }
  // Stormy circles overhead, glaring at whoever is closest
  move_stormy(dt) {
    const ai = this.ai;
    ai.ang += dt * (this.phase === 2 ? 0.4 : 0.26) * ai.mk;
    this.pos.set(Math.cos(ai.ang) * 10, DECK_Y + 4.5 + Math.sin(this.t * 1.5) * 0.4, Math.sin(ai.ang) * 10);
    const tg = this.nearestTarget(this.pos.x, this.pos.z);
    if (tg) this.face(tg.p.x - this.pos.x, tg.p.z - this.pos.z);
    this.contact = 0;
  }
  // Chad rides his hoverboard straight at you
  move_chad(dt) {
    this.walkToward(dt, this.phase === 2 ? 4.2 : 3.2, 3.6);
    this.pos.y = DECK_Y + 0.5 + Math.sin(this.t * 3) * 0.12;
    this.contact = 2.5; this.contactDmg = 18;
  }

  /* ----- attacks per boss (return a cooldown, or -1 while a wind-up is on its way) ----- */
  // Tall moving coffins, storm conductors or server racks. The entire formation
  // crosses the arena: dodge sideways into its marked empty aisle, not over it.
  attackProcession() {
    const tg = this.randTarget();
    if (!tg) return 3;
    const angle = Math.random() * TAU, c = Math.cos(angle), s = Math.sin(angle);
    const lateral = tg.p.x * c - tg.p.z * s;
    const gap = U.clamp(lateral + (Math.random() < .5 ? -5 : 5), -ARENA_R * .5, ARENA_R * .5);
    const name = { count: 'Funeral Procession', stormy: 'Lightning Conductors', chad: 'Server Migration' }[this.id];
    return this.windup(name + ' — find the glowing aisle', 'summon', .7, () => {
      const attack = { k: 'procession', angle, gap, half: this.phase === 2 ? 1.8 : 2.2, w: 2.8, speed: 8, d: 26, h: 18, theme: this.id };
      this.fire(attack);
      const duration = attack.w + (ARENA_R + 3) * 2 / attack.speed + .5;
      this.ai.busy = duration;
      return duration + 2;
    });
  }
  pickAtk(list) { return U.weighted(list.filter((e) => e[1] > 0)); }
  attack_gary() {
    const p2 = this.phase === 2;
    const a = this.pickAtk([['bags', 3], ['slam', 2], ['tires', 2], ['lid', 1.7], ['stink', p2 ? 1.8 : 1.1], ['rain', p2 ? 1.5 : 0]]);
    const tg = this.randTarget();
    if (!tg) return 2;
    const cd = p2 ? 2.0 : 2.7;
    if (a === 'bags') return this.windup('Bag Toss', 'throw', 0.6, () => {
      const l = [], tgs = this.targets();
      for (let i = 0; i < 3 && tgs.length; i++) {
        const t = tgs[i % tgs.length];
        const to = new V3(t.p.x + (Math.random() - 0.5) * 2, t.p.y - 1, t.p.z + (Math.random() - 0.5) * 2);
        l.push(...this.aimed(this.mouth(), to, 1, 0, 11, 'trash', 14, 0.55, { g: 18, w: i * 0.3, sp: 1.6, tl: 1 }).l);
      }
      this.fire({ k: 'proj', l });
      return cd;
    }, { tg: tg.id });
    if (a === 'slam') return this.windup('Can Slam', 'slam', 0.65, () => {
      this.fire({ k: 'multi', l: [this.ring(this.pos.x, this.pos.z, 9, 14, 0.05), { k: 'fx', snd: 'boom', shake: 0.5 }].concat(p2 ? [this.ring(this.pos.x, this.pos.z, 9, 14, 0.75)] : []) });
      return cd;
    });
    if (a === 'tires') return this.windup('Tire Fire', 'throw', 0.5, () => {
      const t = this.aimAt(tg.id);
      if (t) this.fire(this.aimed(this.mouth(), t.p, p2 ? 5 : 3, 0.3, 13, 'tire', 12, 0.6, { step: 0.22 }));
      return cd;
    }, { tg: tg.id });
    if (a === 'lid') return this.windup('Lid Toss', 'throw', 0.6, () => { // his lid, thrown like a boomerang (it comes back)
      const t = this.aimAt(tg.id);
      if (!t) return cd;
      const from = this.mouth(), dir = new V3(t.p.x - from.x, 0, t.p.z - from.z), d = dir.length() || 1;
      dir.divideScalar(d);
      const far = Math.min(24, d + 4), to = new V3(from.x + dir.x * far, DECK_Y + 1.1, from.z + dir.z * far);
      this.fire({ k: 'boomer', a: arr3(from), b: arr3(to), T: p2 ? 2.2 : 2.6, cv: U.r2((Math.random() < 0.5 ? -1 : 1) * 3.4), r: 0.95, d: 16, kind: 'lid', own: 'lid' });
      return cd;
    }, { tg: tg.id });
    if (a === 'stink') return this.windup('Stink Cloud', 'inhale', 0.6, () => { // green gas where you're standing (don't stay in it)
      const l = this.targets().map((t) => this.zone(t.p.x, t.p.z, 2.8, 0.9, 5, 7, 'stink'));
      for (let i = 0; i < (p2 ? 2 : 1); i++) { const p = this.randDeck(ARENA_R - 3); l.push(this.zone(p.x, p.z, 2.8, 0.9, 5, 7, 'stink')); }
      this.fire({ k: 'multi', l: l.concat([{ k: 'fx', snd: 'fizz' }]) });
      return cd;
    });
    return this.windup('Garbage Day', 'roar', 0.7, () => { this.fire(this.rain(10, 'trash', 14, 0.6)); return cd; }, { hold: 0.8 });
  }
  attack_blorb() {
    const p2 = this.phase === 2;
    const a = this.pickAtk([['bounce', 3], ['spit', 2.5], ['babies', 1.5], ['triple', p2 ? 2 : 1.2], ['puddles', 1.4], ['rain', p2 ? 1.5 : 0]]);
    const tg = this.randTarget();
    if (!tg) return 2;
    const cd = p2 ? 1.8 : 2.5;
    if (a === 'bounce') return this.windup('Belly Flop', 'crouch', 0.55, () => {
      const t = this.aimAt(tg.id);
      if (t) this.hop(t.p, 1.2, 9, 3.6, 22, () => { if (p2) this.spawnMinions(2); });
      return cd;
    }, { tg: tg.id });
    if (a === 'spit') return this.windup('Goo Spit', 'inhale', 0.55, () => {
      const t = this.aimAt(tg.id);
      if (t) this.fire(this.aimed(this.mouth(), t.p, p2 ? 9 : 7, 0.9, 11, 'goo', 10, 0.5));
      return cd;
    }, { tg: tg.id });
    if (a === 'babies') return this.windup('Royal Babies', 'summon', 0.6, () => {
      this.spawnMinions(p2 ? 4 : 3);
      this.say('My children! HUG THEM! HUG THEM TO DEATH!', BOSS_TALK.attack);
      return cd;
    });
    if (a === 'triple') return this.windup('Triple Bounce', 'crouch', 0.6, () => { // three flops in a row, each at whoever's closest
      const go = (i) => {
        const t = this.nearestTarget(this.pos.x, this.pos.z) || this.randTarget();
        if (!t) return;
        this.hop(t.p, 0.85, 7, 3.2, 18, () => { if (i < 2) this.later(0.25, () => go(i + 1)); });
      };
      go(0);
      this.ai.busy = 3.2;
      return cd + 2.6;
    });
    if (a === 'puddles') return this.windup('Goo Puddles', 'inhale', 0.55, () => { // lobbed goo that stays put and slows you down
      const from = this.mouth(), l = [], zs = [];
      const pts = this.targets().map((t) => new V3(t.p.x, DECK_Y, t.p.z));
      while (pts.length < (p2 ? 6 : 4)) pts.push(this.randDeck(ARENA_R - 2.5));
      pts.forEach((to, i) => {
        l.push(this.aimed(from, to.clone().setY(DECK_Y - 1), 1, 0, 10, 'goo', 8, 0.55, { g: 18, w: i * 0.12 }).l[0]);
        const T = Math.max(0.4, Math.hypot(to.x - from.x, to.z - from.z) / 10);
        zs.push(this.zone(to.x, to.z, 2.4, T + i * 0.12, 6, 4, 'goo', 0.5));
      });
      this.fire({ k: 'multi', l: [{ k: 'proj', l }].concat(zs) });
      return cd;
    });
    return this.windup('Goo Rain', 'roar', 0.6, () => { this.fire(this.rain(12, 'goo', 12, 0.55)); return cd; }, { hold: 0.8 });
  }
  attack_jerry() {
    const p2 = this.phase === 2;
    const a = this.pickAtk([['reels', 4], ['cards', 2], ['spot', p2 ? 2 : 1.2]]);
    const tg = this.randTarget();
    if (!tg) return 2;
    if (a === 'cards') return this.windup("Deal 'Em", 'throw', 0.45, () => { // three fans of playing cards
      const tgs = this.targets(), l = [];
      for (let v = 0; v < 3 && tgs.length; v++) { const t = tgs[v % tgs.length]; l.push(...this.aimed(this.mouth(), t.p, 5, 0.7, 15, 'card', 9, 0.45, { w: v * 0.35 }).l); }
      this.fire({ k: 'proj', l });
      return p2 ? 2.4 : 3.0;
    }, { tg: tg.id });
    if (a === 'spot') return this.windup('Lucky Spin', 'pull', 0.6, () => { // a spotlight sweeps the floor: jump it
      const t = this.aimAt(tg.id) || tg;
      const a0 = Math.atan2(t.p.x - this.pos.x, t.p.z - this.pos.z) + (Math.random() < 0.5 ? 1 : -1) * 1.2;
      const sp = (Math.random() < 0.5 ? 1 : -1) * (p2 ? 1.9 : 1.6);
      const l = [this.sweep(this.pos, a0, sp, 26, 0.9, 3.4, 18)];
      if (p2) l.push(this.sweep(this.pos, a0 + Math.PI, sp, 26, 0.9, 3.4, 18));
      this.fire({ k: 'multi', l });
      this.ai.busy = 4.3; // (he stays put while it sweeps)
      return p2 ? 3.2 : 3.8;
    }, { tg: tg.id });
    return this.windup('Spin to Win', 'pull', 0.5, () => {
      const w = Object.entries(JERRY_W).map(([s, x]) => [s, s === 'skull' && p2 ? 2 : x]);
      const syms = [0, 1, 2].map(() => U.weighted(w));
      this.fire({ k: 'reels', s: syms });
      this.later(1.5, () => {
        const jack = syms[0] === syms[1] && syms[1] === syms[2];
        const counts = {};
        syms.forEach((s) => (counts[s] = (counts[s] || 0) + (jack ? 1.5 : 1)));
        if (jack) { this.fire({ k: 'fx', text: 'JACKPOT!!', snd: 'jackpot', shake: 0.5 }); this.say('JACKPOT! FOR ME!', 0.6); }
        const l = [];
        const tg2 = this.randTarget();
        for (const [s, c] of Object.entries(counts)) {
          if (s === 'cherry') l.push(this.rain(Math.round(6 * c), 'cherry', 14, 0.6));
          if (s === 'bell') for (let i = 0; i < Math.round(c); i++) l.push(this.ring(this.pos.x, this.pos.z, 10, 14, i * 0.7));
          if (s === 'cash') l.push(this.spiral(this.mouth().setY(DECK_Y + 1.1), 2, Math.round(18 * c), 1.8, 10, 'coin', 9, 0.45));
          if (s === 'lemon' && tg2) l.push(this.aimed(this.mouth(), tg2.p, Math.round(7 * c), 0.9, 12, 'lemon', 10, 0.5));
          if (s === '7') {
            const tgs = this.targets();
            for (let i = 0; i < Math.round(2 * c); i++) {
              const t = tgs[i % tgs.length] || tg2;
              if (!t) continue;
              const an = Math.random() * Math.PI;
              const dx = Math.cos(an) * 20, dz = Math.sin(an) * 20;
              l.push(this.lane(new V3(t.p.x - dx, 0, t.p.z - dz), new V3(t.p.x + dx, 0, t.p.z + dz), 1.5, 1.1 + i * 0.25, 0.5, 22));
            }
          }
          if (s === 'skull') for (const t of this.targets()) l.push(this.slam(t.p.x, t.p.z, 3, 1.3, 25));
        }
        this.fire({ k: 'multi', l });
      });
      return p2 ? 3.0 : 3.6;
    });
  }
  attack_snowdad() {
    const p2 = this.phase === 2;
    const a = this.pickAtk([['snowballs', 3], ['flop', 2.5], ['icicles', 2], ['kids', 1.2], ['joke', 1], ['slide', 1.6], ['avalanche', p2 ? 1.8 : 1.1]]);
    const tg = this.randTarget();
    if (!tg) return 2;
    const cd = p2 ? 1.6 : 2.2;
    if (a === 'snowballs') return this.windup('Snowball Barrage', 'throw', 0.5, () => {
      const t = this.aimAt(tg.id);
      if (t) this.fire(this.aimed(this.mouth(), t.p, 5, 0.35, 15, 'snow', 10, 0.5));
      if (p2) this.later(0.6, () => { const t2 = this.randTarget(); if (t2) this.fire(this.aimed(this.mouth(), t2.p, 5, 0.35, 15, 'snow', 10, 0.5)); });
      return cd;
    }, { tg: tg.id });
    if (a === 'flop') return this.windup('Dad Flop', 'crouch', 0.55, () => {
      const t = this.aimAt(tg.id);
      if (t) this.hop(t.p, 1.1, 8, 4, 28);
      return cd;
    }, { tg: tg.id });
    if (a === 'icicles') return this.windup('Icicle Drop', 'summon', 0.55, () => { this.fire(this.rain(p2 ? 18 : 12, 'icicle', 16, 0.5)); return cd; });
    if (a === 'kids') return this.windup('Snow Kids', 'summon', 0.6, () => { this.spawnMinions(p2 ? 4 : 3); return cd; });
    if (a === 'joke') {
      this.say(U.pick(this.def.taunts), 0.6); // (it's a Dad Joke attack: he usually tells one)
      return this.windup('Dad Joke', 'slam', 0.6, () => { // (he slaps his knee so hard the floor shakes)
        this.fire({ k: 'multi', l: [this.ring(this.pos.x, this.pos.z, 9, 12, 0.05), this.ring(this.pos.x, this.pos.z, 9, 12, 0.75), { k: 'fx', snd: 'rimshot' }] });
        return cd;
      });
    }
    if (a === 'slide') return this.windup('Belly Slide', 'charge', 0.6, () => {
      const t = this.aimAt(tg.id);
      if (t) this.dashAt(t.p, 20, 1.9, 0.9, 0.55, 26, 'slide');
      return cd + 1;
    }, { tg: tg.id });
    return this.windup('Avalanche', 'slam', 0.65, () => { // giant snowballs rolling across the floor (get out of the way)
      const tgs = this.targets(), projs = [], l = [];
      for (let i = 0; i < (p2 ? 2 : 1) && tgs.length; i++) {
        const t = tgs[i % tgs.length];
        const dir = new V3(t.p.x - this.pos.x, 0, t.p.z - this.pos.z);
        if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
        dir.normalize();
        if (i > 0 && tgs.length === 1) dir.applyAxisAngle(new V3(0, 1, 0), (Math.random() < 0.5 ? -1 : 1) * 0.45);
        const from = new V3(this.pos.x + dir.x * 2.4, DECK_Y + 1.3, this.pos.z + dir.z * 2.4);
        projs.push(this.P(from, dir.clone().multiplyScalar(9.5), 'bigsnow', 22, 1.3, { w: i * 0.55, rl: 1 }));
        l.push(this.path(from, from.clone().addScaledVector(dir, 34), 1.4, 1.2 + i * 0.55, '#ffffff'));
      }
      this.fire({ k: 'multi', l: [{ k: 'proj', l: projs }].concat(l, [{ k: 'fx', snd: 'boom', shake: 0.4 }]) });
      return cd + 0.4;
    }, { tg: tg.id });
  }
  attack_zorblax() {
    const p2 = this.phase === 2;
    const a = this.pickAtk([['decree', 3], ['lasers', 2.5], ['guards', 1.3], ['meteors', 2], ['gaze', 1.8], ['wall', p2 ? 2 : 1.4], ['pizza', p2 ? 2.5 : 0], ['stomp', p2 ? 1.5 : 0]]);
    const tg = this.randTarget();
    if (!tg) return 2;
    const cd = p2 ? 1.6 : 2.3;
    if (a === 'decree') return this.windup('Royal Decree', 'spin', 0.5, () => {
      this.fire(this.spiral(new V3(this.pos.x, DECK_Y + 1.1, this.pos.z), 3, p2 ? 42 : 30, 2.2, 10, 'laser', 10, 0.45));
      return cd;
    }, { hold: 2.2 });
    if (a === 'lasers') return this.windup('Laser Court', 'point', 0.5, () => {
      const l = [], tgs = this.targets();
      for (let i = 0; i < (p2 ? 3 : 2) && tgs.length; i++) {
        const t = tgs[i % tgs.length];
        const a2 = Math.random() * Math.PI, dx = Math.cos(a2) * 20, dz = Math.sin(a2) * 20;
        l.push(this.lane(new V3(t.p.x - dx, 0, t.p.z - dz), new V3(t.p.x + dx, 0, t.p.z + dz), 1.5, 1.2 + i * 0.3, 0.5, 24));
      }
      this.fire({ k: 'multi', l });
      return cd;
    }, { tg: tg.id });
    if (a === 'guards') return this.windup('Guards!', 'summon', 0.6, () => {
      this.spawnMinions(p2 ? 4 : 3);
      const text = 'GUARDS! SEIZE THE DELIVERY PERSON!';
      this.say(text, BOSS_TALK.attack);
      return cd;
    });
    if (a === 'meteors') return this.windup('Meteor Shower', 'summon', 0.55, () => { this.fire(this.rain(p2 ? 18 : 14, 'meteor', 16, 0.6)); return cd; });
    if (a === 'gaze') return this.windup('Royal Gaze', 'point', 0.6, () => { // three eyes, one beam, and it follows you: keep moving
      const t = this.aimAt(tg.id);
      if (!t) return cd;
      const d = new V3(t.p.x - this.pos.x, 0, t.p.z - this.pos.z);
      if (d.lengthSq() < 0.01) d.set(0, 0, 1);
      d.normalize();
      this.fire({ k: 'track', tg: t.id, s: [U.r2(this.pos.x + d.x * 3), U.r2(this.pos.z + d.z * 3)], w: 0.5, dur: p2 ? 3.6 : 3.0, sp: p2 ? 6 : 5, r: 1.3, d: 14 });
      this.ai.busy = 1.2;
      return cd + 1;
    }, { tg: tg.id });
    if (a === 'wall') return this.windup('Pizza Wall', 'throw', 0.5, () => { // a wall of slices with a gap in it (find the gap, or jump)
      const l = [];
      for (let wv = 0; wv < (p2 ? 2 : 1); wv++) {
        const t = wv === 0 ? this.aimAt(tg.id) : this.randTarget();
        if (!t) continue;
        const dir = new V3(t.p.x - this.pos.x, 0, t.p.z - this.pos.z);
        if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
        dir.normalize();
        const side = new V3(dir.z, 0, -dir.x);
        const start = new V3(this.pos.x, DECK_Y + 0.7, this.pos.z).addScaledVector(dir, 1.5);
        const gap = (t.p.x - start.x) * side.x + (t.p.z - start.z) * side.z + U.rand(-2.5, 2.5);
        for (let k = -10; k <= 10; k++) {
          const off = k * 1.8;
          if (Math.abs(off - gap) < 1.9) continue;
          l.push(this.P(start.clone().addScaledVector(side, off), dir.clone().multiplyScalar(8.5), 'pizza', 12, 0.6, { w: wv * 1.3 }));
        }
      }
      this.fire({ k: 'proj', l });
      return cd + 0.5;
    }, { tg: tg.id });
    if (a === 'pizza') {
      const text = 'THIS PIZZA IS COLD!';
      this.say(text, BOSS_TALK.attack);
      return this.windup('Cold Pizza', 'throw', 0.45, () => {
        const t = this.aimAt(tg.id);
        if (t) this.fire(this.aimed(this.mouth(), t.p, 9, 1.1, 13, 'pizza', 12, 0.55));
        return cd;
      }, { tg: tg.id });
    }
    return this.windup('Throne Stomp', 'crouch', 0.5, () => {
      const t = this.aimAt(tg.id);
      if (!t) return cd;
      const to = this.clampDeck(new V3(t.p.x, DECK_Y + 2.5, t.p.z), ARENA_R - 3);
      this.fire(this.slam(to.x, to.z, 4, 1.2, 30));
      this.jumpTo(new V3(to.x, DECK_Y + 0.3, to.z), 1.2, 6, () => {
        this.fire({ k: 'multi', l: [this.ring(to.x, to.z, 11, 16), { k: 'fx', snd: 'boom', shake: 1 }] });
        this.jumpTo(new V3(to.x, DECK_Y + 2.5, to.z), 0.6, 0);
      });
      return cd;
    }, { tg: tg.id });
  }

  attack_count() {
    const p2 = this.phase === 2;
    const a = this.pickAtk([['bats', 3], ['leap', 2.2], ['bread', 2], ['spin', 1.6], ['swarm', 1.2], ['mist', 1.6], ['cage', p2 ? 2 : 1.3], ['sauce', p2 ? 1.8 : 0]]);
    const tg = this.randTarget();
    if (!tg) return 2;
    const cd = p2 ? 1.7 : 2.3;
    if (a === 'bats') return this.windup('Bat Volley', 'point', 0.45, () => { // a volley of bats at (up to) two goobers
      const l = [], tgs = this.targets();
      for (let i = 0; i < Math.min(2, tgs.length); i++) l.push(...this.aimed(this.mouth(), tgs[i].p, p2 ? 7 : 5, 0.8, 12, 'bat', 11, 0.5, { w: i * 0.4 }).l);
      this.fire({ k: 'proj', l });
      return cd;
    }, { tg: tg.id });
    if (a === 'leap') return this.windup('Vampire Leap', 'crouch', 0.5, () => { // comes down right on top of you
      const t = this.aimAt(tg.id);
      if (!t) return cd;
      const to = this.clampDeck(new V3(t.p.x, DECK_Y + 1.2, t.p.z), ARENA_R - 3);
      this.fire({ k: 'multi', l: [this.slam(to.x, to.z, 3.8, 1.1, 26), { k: 'fx', snd: 'laugh' }] });
      this.jumpTo(to, 1.1, 7, () => this.fire({ k: 'multi', l: [this.ring(to.x, to.z, 10, 14), { k: 'fx', snd: 'boom', shake: 0.8 }] }));
      return cd;
    }, { tg: tg.id });
    if (a === 'bread') return this.windup('Carb Loading', 'summon', 0.55, () => { this.fire(this.rain(p2 ? 18 : 13, 'breadstick', 14, 0.5)); return cd; });
    if (a === 'spin') return this.windup('Cape Spin', 'spin', 0.55, () => { // flings bats every which way
      this.fire(this.spiral(new V3(this.pos.x, DECK_Y + 1.2, this.pos.z), 4, p2 ? 44 : 32, 2.2, 9, 'bat', 10, 0.45, 2.8));
      return cd;
    }, { hold: 2.2 });
    if (a === 'swarm') return this.windup('Children of the Night', 'summon', 0.6, () => {
      this.spawnMinions(p2 ? 4 : 3);
      const text = 'Children of the night! Fetch me CARBS!';
      this.say(text, BOSS_TALK.attack);
      return cd;
    });
    if (a === 'mist') return this.windup('Mist Step', 'spin', 0.45, () => { // turns to mist and reappears right behind you
      const t = this.aimAt(tg.id);
      if (!t) return cd;
      const d = new V3(t.p.x - this.pos.x, 0, t.p.z - this.pos.z);
      if (d.lengthSq() < 0.01) d.set(0, 0, 1);
      d.normalize();
      const to = this.clampDeck(new V3(t.p.x + d.x * 2.6, 0, t.p.z + d.z * 2.6), ARENA_R - 2.5);
      to.y = DECK_Y + 1.2;
      this.fire({ k: 'multi', l: [{ k: 'fx', anim: 'mistout' }, this.slam(to.x, to.z, 3.4, 0.85, 26)] });
      this.ai.busy = 1.3;
      this.later(0.8, () => {
        this.pos.copy(to);
        this.face(t.p.x - to.x, t.p.z - to.z);
        this.fire({ k: 'fx', anim: 'mistin', p: arr3(to), r: U.r2(this.rot), snd: 'laugh' });
      });
      return cd + 0.6;
    }, { tg: tg.id });
    if (a === 'cage') return this.windup('Bat Cage', 'summon', 0.55, () => { // a ring of bats closes in: find the gap
      const l = [];
      for (const t of this.targets().slice(0, 2)) {
        const n = 16, R = 7, gap = Math.floor(Math.random() * n);
        for (let i = 0; i < n; i++) {
          if (i === gap || i === (gap + 1) % n) continue;
          const an = ((i + 0.5) / n) * TAU;
          const p = new V3(t.p.x + Math.sin(an) * R, DECK_Y + 1.0, t.p.z + Math.cos(an) * R);
          l.push(this.P(p, new V3(-Math.sin(an) * 7, 0, -Math.cos(an) * 7), 'bat', 11, 0.45, { hd: p2 ? 0.8 : 1.0 }));
        }
      }
      this.fire({ k: 'proj', l });
      return cd;
    });
    return this.windup('Marinara', 'point', 0.5, () => { // phase 2: rivers of marinara across the floor
      const l = [], tgs = this.targets();
      for (let i = 0; i < (tgs.length > 1 ? 3 : 2) && tgs.length; i++) {
        const t = tgs[i % tgs.length], an = Math.random() * Math.PI, dx = Math.cos(an) * 20, dz = Math.sin(an) * 20;
        l.push(this.lane(new V3(t.p.x - dx, 0, t.p.z - dz), new V3(t.p.x + dx, 0, t.p.z + dz), 1.6, 1.2 + i * 0.35, 0.6, 22));
      }
      this.fire({ k: 'multi', l });
      return cd;
    }, { tg: tg.id });
  }
  attack_stormy() {
    const p2 = this.phase === 2;
    const a = this.pickAtk([['strike', 3], ['hail', 2.2], ['gust', 2], ['bolts', 2.4], ['twisters', 1.2], ['chain', 2], ['vortex', p2 ? 1.8 : 1.2], ['front', p2 ? 1.8 : 0]]);
    const tg = this.randTarget();
    if (!tg) return 2;
    const cd = p2 ? 1.6 : 2.2;
    if (a === 'strike') return this.windup('Lightning Strike', 'point', 0.45, () => { // lightning wherever you're standing
      const l = this.targets().map((t) => this.slam(t.p.x, t.p.z, 3.2, 1.0, 26, { lt: 1 }));
      if (p2) { const r = Math.random() * (ARENA_R - 3), an = Math.random() * 6; l.push(this.slam(Math.cos(an) * r, Math.sin(an) * r, 3.2, 1.3, 26, { lt: 1 })); }
      this.fire({ k: 'multi', l: l.concat([{ k: 'fx', snd: 'thunder' }]) });
      return cd;
    });
    if (a === 'hail') return this.windup('Hailstorm', 'summon', 0.5, () => { this.fire(this.rain(p2 ? 22 : 15, 'hail', 12, 0.45)); return cd; });
    if (a === 'gust') return this.windup('Gust Front', 'slam', 0.5, () => { // gusts of wind rolling across the floor (jump them!)
      const c = this.clampDeck(new V3(this.pos.x, 0, this.pos.z), ARENA_R - 2);
      this.fire({ k: 'multi', l: [this.ring(c.x, c.z, 10, 14), this.ring(c.x, c.z, 10, 14, 0.8)].concat(p2 ? [this.ring(0, 0, 9, 14, 1.6)] : []) });
      return cd;
    });
    if (a === 'bolts') return this.windup('Bolt Throw', 'throw', 0.4, () => {
      const t = this.aimAt(tg.id);
      if (t) this.fire(this.aimed(this.mouth(), t.p, p2 ? 7 : 5, 0.6, 16, 'bolt', 11, 0.5, { step: 0.12 }));
      return cd;
    }, { tg: tg.id });
    if (a === 'twisters') return this.windup('Twisters', 'summon', 0.6, () => {
      this.spawnMinions(p2 ? 4 : 3);
      const text = 'Twisters! Go mess up their HAIR!';
      this.say(text, BOSS_TALK.attack);
      return cd;
    });
    if (a === 'chain') return this.windup('Chain Lightning', 'point', 0.5, () => { // strikes walking across the floor at you
      const t = this.aimAt(tg.id);
      if (!t) return cd;
      const dir = new V3(t.p.x - this.pos.x, 0, t.p.z - this.pos.z);
      if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
      dir.normalize();
      const l = [];
      for (let i = 0; i < (p2 ? 11 : 9); i++) {
        const d = 1 + i * 2.4, x = this.pos.x + dir.x * d, z = this.pos.z + dir.z * d;
        if (Math.hypot(x, z) > ARENA_R - 0.6) continue;
        l.push(this.slam(x, z, 2.1, 0.6 + i * 0.13, 20, { lt: 1 }));
      }
      this.fire({ k: 'multi', l: l.concat([{ k: 'fx', snd: 'thunder' }]) });
      return cd;
    }, { tg: tg.id });
    if (a === 'vortex') return this.windup('Eye of the Storm', 'spin', 0.6, () => { // the wind drags you to the middle... where the lightning lands
      const dur = p2 ? 3.6 : 3.2;
      this.fire({ k: 'multi', l: [this.pull(0, 0, 15, 0.25, dur, p2 ? 4.2 : 3.4), this.slam(0, 0, 4.6, dur + 0.2, 30, { lt: 1 })] });
      this.ai.busy = dur;
      return cd + 1;
    }, { hold: 3 });
    return this.windup('Cold Front', 'roar', 0.5, () => { // phase 2: lanes of lightning across the arena
      const l = [], tgs = this.targets();
      for (let i = 0; i < 3 && tgs.length; i++) {
        const t = tgs[i % tgs.length], an = Math.random() * Math.PI, dx = Math.cos(an) * 20, dz = Math.sin(an) * 20;
        l.push(this.lane(new V3(t.p.x - dx, 0, t.p.z - dz), new V3(t.p.x + dx, 0, t.p.z + dz), 1.5, 1.1 + i * 0.3, 0.5, 24));
      }
      this.fire({ k: 'multi', l: l.concat([{ k: 'fx', snd: 'thunder' }]) });
      return cd;
    });
  }
  attack_chad() {
    const p2 = this.phase === 2;
    const a = this.pickAtk([['emails', 3], ['review', 2.4], ['layoffs', 2], ['coffee', 2], ['interns', 1.2], ['dash', 1.6], ['pivot', 1.6], ['hustle', p2 ? 1.6 : 0], ['slips', p2 ? 2 : 0]]);
    const tg = this.randTarget();
    if (!tg) return 2;
    const cd = p2 ? 1.6 : 2.2;
    if (a === 'emails') return this.windup('Reply All', 'spin', 0.5, () => { // a spiral of emails
      this.fire({ k: 'multi', l: [this.spiral(new V3(this.pos.x, DECK_Y + 1.1, this.pos.z), 3, p2 ? 42 : 30, 2.2, 10, 'email', 10, 0.45), { k: 'fx', snd: 'ding' }] });
      return cd;
    }, { hold: 2.2 });
    if (a === 'review') return this.windup('Performance Review', 'point', 0.5, () => { // one star each (and a slam)
      this.fire({ k: 'multi', l: this.targets().map((t) => this.slam(t.p.x, t.p.z, 3.4, 1.2, 28)) });
      return cd;
    });
    if (a === 'layoffs') return this.windup('Layoffs', 'point', 0.5, () => {
      const l = [], tgs = this.targets();
      for (let i = 0; i < (p2 ? 3 : 2) && tgs.length; i++) {
        const t = tgs[i % tgs.length], an = Math.random() * Math.PI, dx = Math.cos(an) * 20, dz = Math.sin(an) * 20;
        l.push(this.lane(new V3(t.p.x - dx, 0, t.p.z - dz), new V3(t.p.x + dx, 0, t.p.z + dz), 1.5, 1.2 + i * 0.3, 0.5, 24));
      }
      this.fire({ k: 'multi', l });
      return cd;
    });
    if (a === 'coffee') return this.windup('Coffee Run', 'throw', 0.45, () => { // lobbed hot coffee (the red circles show where it lands)
      const l = [], tgs = this.targets();
      for (let i = 0; i < (p2 ? 6 : 4) && tgs.length; i++) {
        const t = tgs[i % tgs.length], to = new V3(t.p.x + (Math.random() - 0.5) * 3, t.p.y - 1, t.p.z + (Math.random() - 0.5) * 3);
        l.push(...this.aimed(this.mouth(), to, 1, 0, 11, 'coffee', 14, 0.5, { g: 18, w: i * 0.25, sp: 1.8, tl: 1 }).l);
      }
      this.fire({ k: 'proj', l });
      return cd;
    }, { tg: tg.id });
    if (a === 'interns') return this.windup('Intern Army', 'summon', 0.6, () => {
      this.spawnMinions(p2 ? 4 : 3);
      const text = 'Interns! Get me a coffee! Then get THEM!';
      this.say(text, BOSS_TALK.attack);
      return cd;
    });
    if (a === 'dash') return this.windup('Disrupt!', 'charge', 0.55, () => { // a hoverboard charge straight through you
      const t = this.aimAt(tg.id);
      if (t) this.dashAt(t.p, 18, 1.9, 1.0, 0.45, 26);
      return cd + 0.5;
    }, { tg: tg.id });
    if (a === 'pivot') return this.windup('Pivot!', 'point', 0.6, () => { // a laser pointer sweep across the whole floor: jump it
      const t = this.aimAt(tg.id) || tg;
      const a0 = Math.atan2(t.p.x - this.pos.x, t.p.z - this.pos.z) + (Math.random() < 0.5 ? 1 : -1) * 1.1;
      const sp = (Math.random() < 0.5 ? 1 : -1) * (p2 ? 2.2 : 1.9);
      const l = [this.sweep(this.pos, a0, sp, 24, 0.9, 3.2, 20)];
      if (p2) l.push(this.sweep(this.pos, a0 + Math.PI, sp, 24, 0.9, 3.2, 20));
      this.fire({ k: 'multi', l });
      this.ai.busy = 4.1;
      return cd + 1.2;
    }, { tg: tg.id });
    if (a === 'hustle') return this.windup('Hustle Culture', 'charge', 0.5, () => { // three charges in a row
      const go = (i) => {
        const t = this.nearestTarget(this.pos.x, this.pos.z) || this.randTarget();
        if (!t) return;
        this.dashAt(t.p, 16, 1.8, 0.75, 0.4, 24);
        if (i < 2) this.later(1.25, () => go(i + 1));
      };
      go(0);
      this.ai.busy = 3.9;
      return cd + 2.6;
    });
    return this.windup('Pink Slips', 'throw', 0.45, () => { // phase 2: pink slips for everyone
      const t = this.aimAt(tg.id);
      if (t) this.fire(this.aimed(this.mouth(), t.p, 9, 1.4, 12, 'slip', 12, 0.5));
      return cd;
    }, { tg: tg.id });
  }

  /* ----- minions (host) ----- */
  hostMinions(dt) {
    for (const m of this.minions.values()) {
      const t = this.nearestTarget(m.x, m.z);
      if (!t) continue;
      const dx = t.p.x - m.x, dz = t.p.z - m.z, d = Math.hypot(dx, dz);
      if (d > 0.8) { m.x += (dx / d) * m.spd * dt; m.z += (dz / d) * m.spd * dt; }
      for (const o of this.minions.values()) {
        if (o === m) continue;
        const ox = m.x - o.x, oz = m.z - o.z, od = Math.hypot(ox, oz);
        if (od < 1.1 && od > 0.01) { m.x += (ox / od) * (1.1 - od) * 0.5; m.z += (oz / od) * (1.1 - od) * 0.5; }
      }
      const r = Math.hypot(m.x, m.z);
      if (r > ARENA_R - 0.8) { m.x *= (ARENA_R - 0.8) / r; m.z *= (ARENA_R - 0.8) / r; }
      m.tx = m.x; m.tz = m.z;
    }
  }
  damageMinion(id, dmg) {
    const m = this.minions.get(id);
    if (!m) return;
    m.hp -= dmg;
    if (m.hp <= 0) this.killMinion(id);
  }
  killMinion(id) {
    const m = this.minions.get(id);
    if (!m) return;
    if (m.mesh) {
      const p = m.mesh.position.clone().setY(DECK_Y + 0.6);
      FX.burst(p, '#ffffff', 10, 4);
      this.glow.puff(p, this.ringC || (this.ringC = new THREE.Color(RING_COL[this.id])), 2.2, 0.35);
      dropObj(m.mesh);
    }
    Sound.play('splat');
    this.minions.delete(id);
  }

  /* ----- damage (host) ----- */
  damage(dmg) {
    if (this.st !== 'fight') return;
    this.hp = Math.max(0, this.hp - dmg);
    this.flash = Math.max(this.flash, 0.6);
    if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
      this.onPhase2();
    }
    if (this.hp <= 0) {
      this.st = 'dying';
      this.ai.dieT = this.t;
      this.ai.mv = null;
      this.contact = 0;
      this.hidden = false;
      for (const id of [...this.minions.keys()]) this.killMinion(id);
      this.onDying();
      Net.toAll({ t: 'bs', p: [this.pos.x, this.pos.y, this.pos.z], r: this.rot, hp: 0, ph: this.phase, st: 'dying', c: 0, cd: 0, hd: 0, mm: [] });
    }
  }
  // the boss wins once nobody in the fight is left standing (for a moment: friends' news arrives a bit late).
  // (Hardcore: everyone down at once wipes the whole world instead, see Game.checkWipe)
  checkAllOut(dt) {
    if (Game.permaDead) return false;
    const present = this.ids.filter((id) => id === Net.myId || G.remotes.has(id));
    if (!present.length) return true;
    const up = present.some((id) => (id === Net.myId ? !this.me().dead : this.standing(G.remotes.get(id))) && !this.out.has(id));
    this.downT = up ? 0 : (this.downT || 0) + (dt || 0);
    return this.downT > 1.5;
  }
  standing(r) { return !!r && r.s.m === 'boss' && !r.s.d && !r.s.g; }
  // the friends in this fight with me (still connected), and whether any of them is on their feet
  crewmates() { return [...G.remotes.values()].filter((r) => this.inFight(r.id)); }
  friendStanding() { return this.crewmates().some((r) => this.standing(r)); }
  end(won) {
    if (this.over) return;
    Net.toAll({ t: 'bend', won });
    this.finish(won);
  }

  /* ================= everyone ================= */
  exec(a) {
    switch (a.k) {
      case 'procession': this.processions.push({ s: a, t: 0, g: null, hit: false }); break;
      case 'proj':
        for (const s of a.l) this.projs.push({ s, t: -(s.w || 0), pos: new V3(...s.p), vel: new V3(...s.v), mesh: null, tele: null });
        if (a.l.length) Sound.play('throw');
        break;
      case 'ring': this.rings.push({ s: a, t: -(a.w || 0), mesh: null, hit: false }); break;
      case 'slam': this.slams.push({ s: a, t: 0, mesh: null, done: false }); break;
      case 'lane': this.lanes.push({ s: a, t: 0, mesh: null, hit: false }); break;
      case 'sweep': this.sweeps.push({ s: a, t: 0, g: null, prev: a.a0, hit: false }); break;
      case 'zone': this.zones.push({ s: a, t: 0, g: null, tick: 0, puffT: 0 }); break;
      case 'pull': this.pulls.push({ s: a, t: 0, g: null }); Sound.play('swirl'); break;
      case 'boomer':
        this.boomers.push({ s: a, t: 0, mesh: null, hit: [false, false], trailT: 0 });
        if (a.own === 'lid' && this.m.lid) this.m.lid.visible = false;
        Sound.play('whoosh');
        break;
      case 'track': this.tracks.push({ s: a, t: 0, g: null, p: null }); Sound.play('charge'); break;
      case 'path': this.paths.push({ s: a, t: 0, g: null }); break;
      case 'tell': this.onTell(a); break;
      case 'multi': for (const x of a.l) this.exec(x); break;
      case 'reels':
        this.reel = { t: 0, s: a.s };
        Sound.play('flip');
        break;
      case 'fx':
        if (a.snd) Sound.play(a.snd);
        if (a.shake) G.shake = Math.max(G.shake, a.shake * this.nearFactor(this.rpos));
        if (a.text) UI.bigTitle(a.text, '', '#ffd23f', 1.4);
        if (a.anim === 'mistout') this.vanish();
        else if (a.anim === 'mistin') this.appear(a);
        else if (a.anim) this.setPose(a.anim, 0, a.h || 0.6);
        break;
    }
  }
  nearFactor(p) { const d = Math.hypot(p.x - this.me().pos.x, p.z - this.me().pos.z); return U.clamp(1.4 - d / 20, 0.2, 1); }
  // (host) the boss says something, now and then (see BOSS_TALK). chance: how likely it is to bother
  say(text, chance = 1) {
    const ai = this.ai;
    if (Math.random() > chance || this.t - (ai.saidT == null ? -99 : ai.saidT) < BOSS_TALK.gap) return;
    ai.saidT = this.t;
    ai.tauntT = Math.max(ai.tauntT, BOSS_TALK.every[0] * 0.6); // (and the next random line waits a while)
    this.onTaunt(text); Net.toAll({ t: 'btaunt', text });
  }
  onTaunt(text) {
    UI.subtitle({ gary: 'GARY', blorb: 'QUEEN BLORBINA', jerry: 'JACKPOT JERRY', snowdad: 'SNOWDAD', count: 'COUNT CARBULA', stormy: 'STORMY', chad: 'CHAD', zorblax: 'ZORBLAX' }[this.id], text, 3);
    Sound.play({ snowdad: 'rimshot', blorb: 'blub', count: 'laugh', stormy: 'thunder', chad: 'ding' }[this.id] || 'dad');
    if (!this.pz && this.st === 'fight') this.setPose('point', 0.25, 0.5, null, true); // (a little gesture to go with it: no glow, it's not an attack)
  }
  onPhase2() {
    const line = { zorblax: '"I WANT TO SPEAK TO YOUR MANAGER!"', count: '"THE HUNGER! IT BURNS!"', stormy: '"CATEGORY SIX!"', chad: '"I\'M PIVOTING TO VIOLENCE!"' }[this.id];
    UI.bigTitle('PHASE 2', line || `${this.def.name} is ANGRY now`, '#ff6bd6', 2.6);
    UI.bossHp(this.hp / this.maxHp, true);
    Sound.play('phase');
    G.shake = 1;
    const tint = { zorblax: '#ff0000', count: '#6a0018', stormy: '#1a2040' }[this.id];
    if (tint) setAtmosphere(PLANETS[G.planet], tint);
    this.setPose('roar', 0.2, 1.4, '#ff3d3d');
    HI_U.boss.uRim.value.set('#ff7a6a'); HI_U.boss.uRimK.value = 0.55; // (it's glowing red at the edges now)
  }
  onDying() {
    Sound.play('roar');
    UI.subtitle(this.def.name.toUpperCase(), BOSS_LAST[this.id] || 'NOOOOOOO!', 2.6);
    UI.bossHp(0);
    UI.bossCall(null); this.call = null;
    for (const h of this.allHazards()) this.removeHazard(h);
    this.projs = []; this.rings = []; this.slams = []; this.lanes = [];
    this.sweeps = []; this.zones = []; this.pulls = []; this.boomers = []; this.tracks = []; this.paths = [];
    if (this.m.lid) this.m.lid.visible = true;
    this.hidden = false;
    this.pz = null;
    this.processions = [];
  }
  allHazards() { return [...this.projs, ...this.rings, ...this.slams, ...this.lanes, ...this.sweeps, ...this.zones, ...this.pulls, ...this.boomers, ...this.tracks, ...this.paths, ...this.processions]; }
  canHurt() { const p = this.me(); return this.st === 'fight' && this.inFight(Net.myId) && !p.dead && !p.ghost && p.inv <= 0; }

  // a wind-up just started (everyone): pose, glow, and say what's coming
  onTell(a) {
    const col = a.c || RING_COL[this.id];
    this.setPose(a.p, a.t, a.h || 0.45, col);
    const you = !!a.tg && a.tg === Net.myId && this.ids.length > 1; // (with friends around: it's you it's after)
    UI.bossCall(a.n, col, you);
    this.call = { t: 0, dur: Math.max(0.05, a.t) };
    Sound.play('charge');
    if (you) Sound.play('warn');
  }
  setPose(p, dur, hold, col, quiet) {
    this.pz = { p, t: 0, dur: Math.max(0.001, dur), hold: hold || 0.45, col: col || RING_COL[this.id], quiet };
    HI_U.boss.uGlowCol.value.set(this.pz.col);
  }
  // Count Carbula turns into mist (and can't be hit until he's back)
  vanish() {
    this.hidden = true;
    const c = this.center();
    FX.burst(c, '#b46bff', 16, 5);
    for (let i = 0; i < 10; i++) this.glow.puff(c.clone().add(new V3(U.rand(-1.4, 1.4), U.rand(-1.8, 1.8), U.rand(-1.4, 1.4))), shotColor('bat'), 2.4, 0.9);
    Sound.play('mist');
  }
  appear(a) {
    this.hidden = false;
    if (a.p && !Net.isHost) { this.tpos.set(a.p[0], a.p[1], a.p[2]); this.rpos.copy(this.tpos); }
    if (a.r != null) { this.rot = a.r; this.rrot = a.r; }
    this.anim.lx = null;
    const c = this.center();
    FX.burst(c, '#b46bff', 16, 5);
    for (let i = 0; i < 8; i++) this.glow.puff(c.clone().add(new V3(U.rand(-1, 1), U.rand(-1.5, 1.5), U.rand(-1, 1))), shotColor('bat'), 2.2, 0.6);
    this.setPose('slam', 0, 0.5);
  }

  update(dt) {
    this.t += dt;
    if (Net.isHost) this.hostUpdate(dt);
    // render pose
    if (Net.isHost) { this.rpos.copy(this.pos); }
    else {
      if (this.rpos.distanceTo(this.tpos) > 25) this.rpos.copy(this.tpos);
      this.rpos.x = U.damp(this.rpos.x, this.tpos.x, 10, dt);
      this.rpos.y = U.damp(this.rpos.y, this.tpos.y, 10, dt);
      this.rpos.z = U.damp(this.rpos.z, this.tpos.z, 10, dt);
    }
    this.animate(dt);
    if (this.call) { // (the wind-up's name under the health bar: fill, go off, fade)
      this.call.t += dt;
      UI.bossCallSet(this.call.t / this.call.dur);
      if (this.call.t > this.call.dur + 1.1) { UI.bossCall(null); this.call = null; }
    }
    this.updateHazards(dt);
    this.updateMinions(dt);
    this.updateExit(dt);
    this.glow.update(dt, G.camera);
    this.updateLocal(dt);
    this.threatHud(dt);
    UI.bossHp(this.hp / this.maxHp, this.phase === 2);
  }

  /* ================= animation (everyone) ================= */
  // what the current wind-up / follow-through asks of each part, as offsets from walking or standing
  poseNow(dt) {
    const P = this._P || (this._P = {});
    for (const k of ['lean', 'twist', 'sq', 'y', 'a0x', 'a0z', 'a1x', 'a1z', 'hx', 'spin', 'open', 'glow', 'shake', 'pull', 'cape']) P[k] = 0;
    P.rate = 8;
    const pz = this.pz;
    if (!pz) return P;
    pz.t += dt;
    const wind = pz.t < pz.dur;
    const k = wind ? U.clamp(pz.t / pz.dur, 0, 1) : 1, r = wind ? 0 : U.clamp((pz.t - pz.dur) / pz.hold, 0, 1);
    if (!wind && r >= 1) { this.pz = null; return P; }
    const e = k * k * (3 - 2 * k);
    P.rate = wind ? 11 : 22; // (ease into the wind-up, snap through the follow-through)
    P.glow = pz.quiet ? 0 : wind ? 0.08 + 0.3 * e * (0.75 + 0.25 * Math.sin(this.t * 30)) : 0.35 * (1 - r);
    switch (pz.p) {
      case 'throw': // the right arm goes back... and whips forward
        if (wind) { P.a1x = 2.4 * e; P.twist = -0.42 * e; P.lean = -0.08 * e; P.open = 0.5 * e; } else { P.a1x = -1.5; P.twist = 0.3; P.lean = 0.16; P.open = 0.3; }
        break;
      case 'slam': // both arms up... and down
        if (wind) { P.a0x = P.a1x = -2.8 * e; P.lean = -0.16 * e; P.sq = 0.08 * e; } else { P.a0x = P.a1x = -0.45; P.lean = 0.28; P.sq = -0.16; }
        break;
      case 'crouch': // squat down... and spring
        if (wind) { P.sq = -0.24 * e; P.lean = 0.18 * e; P.a0x = P.a1x = 0.9 * e; P.y = -0.2 * e; } else { P.sq = 0.16; P.a0x = P.a1x = -2.3; }
        break;
      case 'spin': // arms out, faster and faster
        P.a0z = P.a1z = 1.35 * e; P.spin = wind ? 2 + 10 * e : 13; P.cape = 1; P.rate = 10;
        break;
      case 'summon': // arms up and out, head back
        P.a0x = P.a1x = -2.5 * e; P.a0z = P.a1z = wind ? 0.45 * e : 1.1; P.hx = -0.35 * e; P.sq = wind ? 0.05 * e : 0.1; P.open = e; P.cape = e;
        break;
      case 'inhale': // lean back and puff up... and let it out
        if (wind) { P.lean = -0.3 * e; P.sq = 0.12 * e; P.hx = -0.3 * e; P.open = e; P.a0z = P.a1z = 0.4 * e; } else { P.lean = 0.32; P.sq = -0.1; P.hx = 0.2; P.open = 1; }
        break;
      case 'point': // point at someone
        P.a1x = wind ? -1.7 * e : -1.95; P.a1z = 0.1; P.hx = 0.08; P.lean = wind ? -0.04 * e : 0.08; P.cape = 0.4 * e;
        break;
      case 'charge': // head down, ready to go
        if (wind) { P.sq = -0.14 * e; P.lean = 0.34 * e; P.a0x = P.a1x = 1.1 * e; P.y = -0.15 * e; } else { P.lean = 0.45; P.a0x = P.a1x = 1.3; P.cape = 1; }
        break;
      case 'roar':
        P.a0x = P.a1x = -2.3 * e; P.a0z = P.a1z = 0.9 * e; P.hx = -0.5 * e; P.lean = -0.12 * e; P.open = e; P.cape = e; P.shake = wind ? 0.3 * e : 0.5 * (1 - r);
        break;
      case 'pull': // (Jerry) pulls his own lever
        P.pull = wind ? e : 1 - r; P.lean = -0.06 * e; P.a1x = -0.6 * e;
        break;
    }
    return P;
  }
  animate(dt) {
    const m = this.m, t = this.t, A = this.anim, id = this.id;
    dt = Math.max(dt, 1e-4);
    // how it's moving (works the same on every computer: it just watches where it's drawn)
    if (A.lx === null) { A.lx = this.rpos.x; A.ly = this.rpos.y; A.lz = this.rpos.z; }
    const vx = (this.rpos.x - A.lx) / dt, vy = (this.rpos.y - A.ly) / dt, vz = (this.rpos.z - A.lz) / dt;
    A.lx = this.rpos.x; A.ly = this.rpos.y; A.lz = this.rpos.z;
    this.speed = U.damp(this.speed, Math.min(20, Math.hypot(vx, vz)), 6, dt);
    A.vy = U.damp(A.vy, U.clamp(vy, -40, 40), 12, dt);
    // turn smoothly toward where it wants to face (and lean into the turn)
    const turn = U.angDiff(this.rrot, this.rot);
    this.rrot += turn * Math.min(1, dt * 7);
    A.tilt = U.damp(A.tilt, U.clamp(-turn * 0.25, -0.18, 0.18), 6, dt);
    m.root.position.copy(this.rpos);
    m.root.rotation.y = this.rrot;
    m.root.visible = !this.hidden && !A.popped;
    // squash when it lands, stretch while it flies
    if (A.pvy < -6 && A.vy > -1.5) { A.sqv -= Math.min(4, -A.pvy * 0.2); if (!FLOATS[id] || id === 'chad') FX.burst(this.rpos.clone().setY(DECK_Y + 0.2), '#ffffff', 6, 3); }
    A.pvy = A.vy;
    A.sqv += (-170 * A.sq - 15 * A.sqv) * dt;
    A.sq += A.sqv * dt;
    const stretch = U.clamp(Math.abs(A.vy) / 24, 0, 0.18);
    // the wind-up / follow-through
    const P = this.poseNow(dt);
    const R = P.rate;
    // walking (or hovering along)
    const walks = !FLOATS[id], walkK = U.clamp(this.speed / 3, 0, 1);
    A.phase += dt * (3 + this.speed * 1.6);
    const sw = Math.sin(A.phase) * walkK * (walks ? 1 : 0.25);
    const bob = walks ? Math.abs(Math.cos(A.phase)) * 0.12 * walkK : 0;
    const breathe = Math.sin(t * 1.8) * 0.018;
    // hit: flash white and flinch
    this.flash = Math.max(0, this.flash - dt * 7);
    A.flinch = Math.max(0, A.flinch - dt * 5);
    // ease every part toward where it should be
    A.lean = U.damp(A.lean, P.lean + 0.05 * walkK - A.flinch * 0.12, R, dt);
    A.twist = U.damp(A.twist, P.twist + (walks ? sw * 0.08 : 0), R, dt);
    A.y = U.damp(A.y, P.y + bob + (id === 'zorblax' ? Math.sin(t * 2) * 0.2 : id === 'jerry' ? 0.3 + Math.sin(t * 2) * 0.15 : 0), R, dt);
    A.open = U.damp(A.open, P.open, R, dt);
    A.pull = U.damp(A.pull, P.pull, 14, dt);
    A.cape = U.damp(A.cape, Math.max(P.cape, this.speed > 4 ? 0.6 : 0), 6, dt);
    A.glow = U.damp(A.glow, P.glow, 14, dt);
    // spinning attacks spin the whole body; afterwards it winds back to facing forward
    if (P.spin) A.spin += P.spin * dt;
    else A.spin = U.damp(A.spin, Math.round(A.spin / TAU) * TAU, 5, dt);
    const armSw = id === 'jerry' ? Math.sin(t * 2) * 0.15 : sw * 0.4;
    A.a[0].x = U.damp(A.a[0].x, P.a0x - armSw, R, dt);
    A.a[1].x = U.damp(A.a[1].x, P.a1x + armSw, R, dt);
    A.a[0].z = U.damp(A.a[0].z, P.a0z + (id === 'jerry' ? Math.sin(t * 2) * 0.2 : 0.04), R, dt);
    A.a[1].z = U.damp(A.a[1].z, P.a1z + (id === 'jerry' ? Math.sin(t * 2) * 0.2 : 0.04), R, dt);
    A.l[0] = U.damp(A.l[0], walks ? sw * 0.55 : Math.sin(t * 1.3) * 0.12, 10, dt);
    A.l[1] = U.damp(A.l[1], walks ? -sw * 0.55 : Math.sin(t * 1.3 + 1) * 0.12, 10, dt);
    // look at whoever's closest
    let look = 0;
    const near = this.nearestTarget(this.rpos.x, this.rpos.z);
    if (near) look = U.clamp(U.angDiff(this.rrot + A.spin, Math.atan2(near.p.x - this.rpos.x, near.p.z - this.rpos.z)), -0.75, 0.75);
    A.hy = U.damp(A.hy, look, 5, dt);
    A.hx = U.damp(A.hx, P.hx + Math.sin(t * 1.1) * 0.03, R, dt);
    // put it all on the model
    const set = (o, rx, ry, rz, py) => {
      const r = this.rest.get(o);
      if (!r) return;
      o.rotation.set(r.rx + rx, r.ry + ry, r.rz + rz);
      if (py != null) o.position.y = r.py + py;
    };
    const shake = P.shake ? (Math.random() - 0.5) * P.shake * 0.12 : 0;
    set(m.body, A.lean, A.twist + A.spin, A.tilt + shake, A.y);
    const punch = 1 + this.flash * 0.035;
    const sy = 1 + A.sq + stretch + breathe + P.sq + (id === 'blorb' ? Math.sin(A.phase * 2) * 0.05 * walkK : 0);
    const sxz = punch / Math.sqrt(Math.max(0.5, sy));
    m.body.scale.set(sxz, sy * punch, sxz);
    if (m.arms) m.arms.forEach((a, i) => set(a, A.a[i].x, 0, (i === 0 ? -1 : 1) * A.a[i].z));
    if (m.legs) m.legs.forEach((l, i) => set(l, A.l[i], 0, 0));
    if (m.head) set(m.head, A.hx, A.hy, 0);
    // (and the bits only some of them have)
    if (id === 'gary') {
      set(m.lid, 0, 0, A.open * 0.9 + Math.sin(t * 3) * 0.08, A.open * 0.25);
      m.flies.forEach((f, i) => f.position.set(Math.cos(t * 5 + i * 1.6) * 1.6, 6.3 + Math.sin(t * 7 + i) * 0.4, Math.sin(t * 5 + i * 1.6) * 1.6));
    } else if (id === 'blorb') {
      set(m.crown, Math.sin(t * 2.3) * 0.05, 0, Math.sin(t * 3) * 0.06 - A.tilt * 0.5, U.clamp(-A.vy * 0.03, -0.3, 0.4));
    } else if (id === 'jerry') {
      if (this.reel) {
        this.reel.t += dt;
        const spinning = this.reel.t < 1.3;
        if (spinning && Math.floor(this.reel.t * 14) !== this.reel.f) { this.reel.f = Math.floor(this.reel.t * 14); drawJerryReels(m.reelTex, this.reel.s, true); Sound.play('tick'); }
        if (!spinning && !this.reel.shown) { this.reel.shown = true; drawJerryReels(m.reelTex, this.reel.s, false); Sound.play('reelstop'); }
        if (spinning) A.pull = Math.max(A.pull, 1);
      }
      set(m.lever, A.pull * 0.9, 0, 0);
    } else if (id === 'count') { // the cape billows (and flares out when he swoops or spins)
      const flap = Math.sin(t * 3) * 0.06 + A.cape * 0.6;
      set(m.cape[0], Math.sin(t * 2.1) * 0.04, flap, 0); set(m.cape[1], Math.sin(t * 2.1 + 1) * 0.04, -flap, 0);
    } else if (id === 'stormy') { // it rains under him, always
      for (const d of m.rain) { d.position.y -= dt * 9; if (d.position.y < -4) d.position.y = 0.2; }
      const zz = 1 + A.glow * 0.25 + Math.random() * A.glow * 0.2;
      m.arms.forEach((a) => a.scale.set(zz, zz, zz));
    } else if (id === 'chad') { // the board tips the way he's going
      set(m.board, -0.12 * walkK - A.lean * 0.3, 0, A.tilt * 0.8, Math.sin(t * 3) * 0.08);
    }
    // the model's materials: flash when hit, glow while winding up
    const u = HI_U.boss;
    u.uFlash.value = Math.min(0.55, this.flash * 0.55);
    u.uGlow.value = A.glow;
    // defeated (see BOSS_DIE)
    if (this.st === 'dying' || (this.over && this.won)) this.deathAnim(dt, set);
  }
  // (everyone) the boss goes down: stunned, spinning up and puffing up, then POP
  deathAnim(dt, set) {
    const m = this.m, A = this.anim, u = HI_U.boss, col = RING_COL[this.id] || '#ffd23f';
    const t = (A.dieT += dt), S = BOSS_DIE.stun, T = S + BOSS_DIE.spin;
    if (t < T) {
      const k = U.clamp((t - S) / BOSS_DIE.spin, 0, 1), spin = t >= S, rise = 1.8 * k * k;
      if (spin && !A.squeal) { A.squeal = true; Sound.play('deflate'); }
      // stunned: leaning back, arms flung up, knees knocking, trembling all over. Then spinning up off the
      // floor like a top, arms flailing, puffing up bigger and bigger
      A.dieSpin = (A.dieSpin || 0) + dt * (spin ? 3 + 18 * k * k : 0);
      const tr = spin ? 0.05 : 0.12, jit = () => (Math.random() - 0.5) * tr;
      set(m.body, -0.22 * (1 - k) + jit(), A.dieSpin, (spin ? Math.sin(t * 8) * 0.3 * (1 - 0.4 * k) : 0) + jit(), 0.15 + rise);
      const puff = 1 + 0.55 * k * k + Math.sin(t * 34) * 0.05 * k;
      m.body.scale.set(puff, puff * (1 + 0.1 * Math.sin(t * 21) * k), puff);
      (m.arms || []).forEach((a, i) => set(a, spin ? Math.sin(t * 24 + i * 2.1) * 1.4 - 1 : -2.7 + Math.sin(t * 40 + i) * 0.12, 0, (i ? 1 : -1) * (spin ? 0.7 + 0.5 * Math.sin(t * 17 + i) : 0.95)));
      (m.legs || []).forEach((l, i) => set(l, Math.sin(t * (spin ? 26 : 36) + i * 3) * (spin ? 0.9 : 0.25), 0, 0));
      if (m.head) set(m.head, spin ? Math.sin(t * 19) * 0.35 : -0.5, spin ? Math.sin(t * 13) * 0.6 : Math.sin(t * 27) * 0.15, 0);
      u.uFlash.value = Math.sin(t * (spin ? 40 + 50 * k : 30)) > 0.2 ? 0.55 : 0.04;
      u.uGlow.value = 0.2 + 0.4 * k;
      // sparks popping off it, faster and faster
      A.sparkT = (A.sparkT || 0) - dt;
      if (A.sparkT <= 0) {
        A.sparkT = spin ? 0.06 : 0.12;
        const r = (this.m.hit[0].r || 2) * puff, p = this.center().add(new V3(U.rand(-r, r), rise + U.rand(-r, r), U.rand(-r, r)));
        FX.burst(p, Math.random() < 0.5 ? '#ffffff' : col, 5, 6);
        if (Math.random() < 0.4) this.glow.puff(p, new THREE.Color(col), 2.5, 0.35);
        if (!spin && Math.random() < 0.5) Sound.play('hit');
      }
      G.shake = Math.max(G.shake, (spin ? 0.3 + 0.5 * k : 0.35) * this.nearFactor(this.rpos));
      return;
    }
    if (!A.popped) this.pop(this.center().add(new V3(0, 1.8, 0)), col);
    u.uFlash.value = 0; u.uGlow.value = 0;
    // confetti keeps raining down for a moment, and its bits bounce about
    A.rainT = (A.rainT || 0) - dt;
    if (t < T + 1.8 && A.rainT <= 0) {
      A.rainT = 0.06;
      FX.burst(new V3(this.rpos.x + U.rand(-8, 8), DECK_Y + U.rand(6, 10), this.rpos.z + U.rand(-8, 8)), U.pick(CONFETTI), 3, 2);
    }
    for (const d of this.debris || []) {
      d.t += dt;
      d.v.y -= 26 * dt;
      d.o.position.addScaledVector(d.v, dt);
      d.o.rotation.x += d.w.x * dt; d.o.rotation.y += d.w.y * dt; d.o.rotation.z += d.w.z * dt;
      const p = d.o.position;
      if (p.y < DECK_Y + 0.3 && Math.hypot(p.x, p.z) < ARENA_R) {
        p.y = DECK_Y + 0.3;
        if (d.v.y < 0) {
          if (d.v.y < -3 && G.player.pos.distanceTo(p) < 30) Sound.play('thud');
          d.v.y *= -0.45; d.v.x *= 0.65; d.v.z *= 0.65; d.w.multiplyScalar(0.55);
        }
      }
      if (d.t > 2.4) d.o.scale.multiplyScalar(Math.max(0, 1 - dt * 3)); // (and shrinks away)
    }
  }
  // POP: a huge bang of confetti and coins, and its head and hands (and hat) go flying
  pop(c, col) {
    const A = this.anim, m = this.m;
    A.popped = true;
    Sound.play('kaboom'); Sound.play('party');
    G.shake = Math.max(G.shake, 1.2 * this.nearFactor(this.rpos));
    FX.burst(c, col, 40, 13); FX.burst(c, '#ffffff', 24, 10); FX.burst(c, '#ffd23f', 22, 9);
    for (const cc of CONFETTI) FX.burst(c, cc, 14, 12);
    FX.ring(new V3(c.x, DECK_Y + 0.2, c.z), col, 12); FX.ring(new V3(c.x, DECK_Y + 0.3, c.z), '#ffffff', 17);
    for (let i = 0; i < 16; i++) this.glow.puff(c.clone().add(new V3(U.rand(-3, 3), U.rand(-2, 3), U.rand(-3, 3))), new THREE.Color(U.pick([col, '#ffd23f', '#ffffff'])), 4, 0.9);
    this.debris = [];
    for (const o of [m.head, ...(m.arms || []), m.crown, m.lid, m.board, m.lever]) {
      if (!o || !o.parent) continue;
      G.scene.attach(o); // (keeping where it is: it just isn't part of the boss any more)
      this.rest.delete(o); // (so the boss's own animation leaves it alone)
      const d = o.getWorldPosition(new V3()).sub(c).setY(0);
      if (d.lengthSq() < 0.01) d.set(Math.random() - 0.5, 0, Math.random() - 0.5);
      d.normalize();
      this.debris.push({ o, t: 0, v: new V3(d.x * U.rand(5, 9), U.rand(9, 14), d.z * U.rand(5, 9)), w: new V3(U.rand(-10, 10), U.rand(-10, 10), U.rand(-10, 10)) });
    }
    m.root.visible = false;
    UI.bigTitle('DEFEATED!', this.def.win, '#7dff8a', 3.2);
  }

  surfaceY(p) { return Math.hypot(p.x, p.z) < ARENA_R + 0.3 ? DECK_Y : WATER_Y - 1; }
  hurtCheckBody(pos, r) { return U.bodyDist2(pos, this.me().pos) < r * r; }

  /* ================= hazards (everyone simulates them, each checks hits on themselves) ================= */
  updateHazards(dt) {
    const me = this.me();
    me.slowK = 1; me.ext.set(0, 0, 0);
    TELE.tick(dt);
    this.updProjs(dt, me);
    this.updRings(dt, me);
    this.updSlams(dt, me);
    this.updLanes(dt, me);
    this.updSweeps(dt, me);
    this.updZones(dt, me);
    this.updPulls(dt, me);
    this.updBoomers(dt, me);
    this.updTracks(dt, me);
    this.updPaths(dt);
    this.updProcessions(dt, me);
    // body contact
    if (this.contact > 0 && !this.hidden && this.canHurt()) {
      const d = Math.hypot(me.pos.x - this.rpos.x, me.pos.z - this.rpos.z);
      if (d < this.contact && Math.abs(me.pos.y - this.rpos.y) < 3.5) {
        this.hurt(this.contactDmg, 'body', false, this.rpos);
        const k = new V3(me.pos.x - this.rpos.x, 0, me.pos.z - this.rpos.z).normalize();
        me.vel.x += k.x * 12; me.vel.z += k.z * 12; me.vel.y = 6;
      }
    }
  }
  updProjs(dt, me) {
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i], s = p.s;
      p.t += dt;
      if (p.t < 0) continue;
      const c = shotColor(s.k);
      if (!p.mesh) {
        p.mesh = projMesh(s.k, s.r);
        p.mesh.position.copy(p.pos);
        G.scene.add(p.mesh);
        this.glow.puff(p.pos, c, s.r * 5, 0.22); // (a flash where it came from)
        p.trailT = 0;
        if (s.rl) { p.yaw = Math.atan2(p.vel.x, p.vel.z); p.roll = 0; }
        if (s.tl) {
          // predict the landing spot for the floor warning
          const g = s.g || 0;
          const vy = p.vel.y, dy = p.pos.y - DECK_Y;
          const T = g > 0 ? (vy + Math.sqrt(vy * vy + 2 * g * dy)) / g : 1;
          p.tele = this.marker(p.pos.x + p.vel.x * T, p.pos.z + p.vel.z * T, s.sp || s.r + 0.6, DANGER);
          p.teleT = T;
        }
      }
      const held = s.hd && p.t < s.hd; // (bats hanging in the air, about to close in)
      if (!held) {
        p.vel.y -= (s.g || 0) * dt;
        if (s.rl && Math.hypot(p.pos.x, p.pos.z) > ARENA_R) p.vel.y -= 30 * dt; // (rolls off the edge and drops)
        p.pos.addScaledVector(p.vel, dt);
      }
      p.mesh.position.copy(p.pos);
      if (held) p.mesh.position.y += Math.sin((p.t + i) * 9) * 0.12;
      if (s.rl) { p.roll += (dt * Math.hypot(p.vel.x, p.vel.z)) / s.r; p.mesh.rotation.set(p.roll, p.yaw, 0, 'YXZ'); }
      else if (s.k === 'card' || s.k === 'pizza' || s.k === 'slip' || s.k === 'email') p.mesh.rotation.y += dt * 12;
      else { p.mesh.rotation.x += dt * 5; p.mesh.rotation.y += dt * 7; }
      // its glow, and a trail so you can see where it came from
      this.glow.head(p.pos, c, s.r * (held ? 3.8 + Math.sin(p.t * 14) * 0.7 : 3.2), held ? 0.75 : 0.5);
      if (!held && (p.trailT -= dt) <= 0) { p.trailT = 0.035; this.glow.puff(p.pos, c, s.r * 2.3, 0.3); }
      if (p.tele) this.markerSet(p.tele, U.clamp(p.t / p.teleT, 0, 1));
      let dead = false;
      if (this.canHurt() && this.hurtCheckBody(p.pos, s.r + 0.35)) {
        if (s.k === 'pizza' && me.tool === 'peel') { this.catchSlice(p.pos); dead = true; }
        else { this.hurt(s.d, s.k, false, p.pos.clone().addScaledVector(p.vel, -0.3)); dead = !s.rl; }
      }
      if (dead) { /* hit someone */ } else if (p.pos.y <= this.surfaceY(p.pos) && !s.rl) {
        dead = true;
        if (p.pos.y > WATER_Y - 0.5) { FX.burst(p.pos, s.k === 'snow' || s.k === 'icicle' ? '#ffffff' : SHOT_COL[s.k] || RING_COL[this.id], 5, 3); this.glow.puff(p.pos, c, (s.sp || s.r) * 2.4, 0.3); }
        if (s.sp && this.canHurt() && Math.hypot(p.pos.x - me.pos.x, p.pos.z - me.pos.z) < s.sp && me.pos.y < DECK_Y + 1.5) this.hurt(s.d, s.k, false, p.pos);
      } else if (p.t > 8 || Math.abs(p.pos.x) > 60 || Math.abs(p.pos.z) > 60 || p.pos.y < WATER_Y - 6) dead = true;
      if (dead) { this.removeHazard(p); this.projs.splice(i, 1); }
    }
  }
  // shockwaves (jump them!): a white-hot glowing wall spreading out across the floor, a bright line along
  // its top, a red band on the floor under it and sparks running along it, so you see one coming from
  // anywhere, on any floor. One about to go off pulses in the middle first.
  updRings(dt, me) {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i], s = r.s;
      r.t += dt;
      if (!r.g) r.g = this.ringFx(s);
      const u = r.g.userData;
      if (r.t < 0) {
        u.wall.visible = u.top.visible = false;
        setBand(u.band.geometry, 0.3, 1.1 + 0.35 * Math.abs(Math.sin(this.t * 10)));
        u.band.material.opacity = 0.45 + 0.35 * Math.abs(Math.sin(this.t * 10));
        continue;
      }
      if (!r.boomed) {
        r.boomed = true;
        u.wall.visible = u.top.visible = true;
        FX.ring(new V3(s.c[0], DECK_Y + 0.1, s.c[1]), '#ffffff', 3);
        Sound.play('boom');
      }
      const rad = r.t * s.s, R = Math.max(0.1, rad);
      u.wall.scale.set(R, 1, R); u.top.scale.set(R, 1, R);
      setBand(u.band.geometry, Math.max(0, rad - 0.75), rad + 0.25);
      const fade = U.clamp((s.m - rad) / 8, 0, 1) * (rad > ARENA_R + 1 ? 0.55 : 1), pulse = 0.88 + 0.12 * Math.sin(this.t * 26);
      u.wall.material.opacity = 0.95 * fade * pulse;
      u.top.material.opacity = fade;
      u.band.material.opacity = 0.62 * fade;
      if (rad < ARENA_R + 0.5) for (let k = 0; k < 4; k++) {
        const a = Math.random() * TAU;
        this.glow.puff(new V3(s.c[0] + Math.cos(a) * rad, DECK_Y + 0.1 + Math.random() * s.h, s.c[1] + Math.sin(a) * rad), shotColor(k % 2 ? 'meteor' : 'lemon'), 1.1, 0.3);
      }
      if (!r.hit && this.canHurt()) {
        const d = Math.hypot(me.pos.x - s.c[0], me.pos.z - s.c[1]);
        if (Math.abs(d - rad) < 0.55 && me.pos.y < DECK_Y + s.h) { r.hit = true; this.hurt(s.d, 'ring', false, new V3(s.c[0], DECK_Y, s.c[1])); }
      }
      if (rad > s.m) { this.removeHazard(r); this.rings.splice(i, 1); }
    }
  }
  ringFx(s) {
    const g = new THREE.Group();
    g.position.set(s.c[0], DECK_Y, s.c[1]);
    const glowMat = (o) => new THREE.MeshBasicMaterial(Object.assign({ color: '#ffffff', transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false }, o));
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, s.h, 96, 1, true), glowMat({ map: TELE.tex('hot'), opacity: 0.95 }));
    wall.position.y = s.h / 2;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.08, 96, 1, true), glowMat({ opacity: 1 }));
    top.position.y = s.h - 0.03;
    const band = new THREE.Mesh(bandGeo(), teleMat(DANGER, 0.6));
    band.position.y = 0.035;
    for (const m of [wall, top, band]) m.renderOrder = 4;
    g.add(wall, top, band);
    g.userData = { wall, top, band };
    G.scene.add(g);
    return g;
  }
  updSlams(dt, me) {
    const col = RING_COL[this.id];
    for (let i = this.slams.length - 1; i >= 0; i--) {
      const sl = this.slams[i], s = sl.s;
      sl.t += dt;
      if (!sl.mesh) sl.mesh = this.marker(s.c[0], s.c[1], s.r, DANGER);
      this.markerSet(sl.mesh, U.clamp(sl.t / s.w, 0, 1));
      if (!sl.done && sl.t >= s.w) {
        sl.done = true;
        const at = new V3(s.c[0], DECK_Y + 0.1, s.c[1]);
        FX.ring(at, '#ffffff', s.r);
        FX.burst(at.clone().setY(DECK_Y + 0.5), col, 10, 6);
        this.glow.puff(at.clone().setY(DECK_Y + 0.4), shotColor(s.lt ? 'bolt' : 'meteor'), s.r * 2.2, 0.35);
        if (s.lt) { Shots.lightning([new V3(s.c[0] + U.rand(-2, 2), DECK_Y + 22, s.c[1] + U.rand(-2, 2)), at], '#fff36b'); Sound.play('zap'); }
        G.shake = Math.max(G.shake, 0.6 * this.nearFactor(at));
        if (this.canHurt() && Math.hypot(me.pos.x - s.c[0], me.pos.z - s.c[1]) < s.r && me.pos.y < DECK_Y + 2.2) this.hurt(s.d, 'slam', false, this.rpos);
      }
      if (sl.t > s.w + 0.25) { this.removeHazard(sl); this.slams.splice(i, 1); }
    }
  }
  updProcessions(dt, me) {
    for (let i = this.processions.length - 1; i >= 0; i--) {
      const a = this.processions[i], s = a.s, extent = ARENA_R + 3;
      const old = -extent + Math.max(0, a.t - s.w) * s.speed;
      a.t += dt;
      const z = -extent + Math.max(0, a.t - s.w) * s.speed;
      if (!a.g) {
        a.g = grp(G.scene); a.g.rotation.y = s.angle;
        const guide = mk(BOX(s.half * 2, .035, extent * 2), '#7dffea', a.g, s.gap, DECK_Y + .045, 0, { emissive: '#237a68' });
        const convoy = grp(a.g); a.g.userData.convoy = convoy;
        const color = { count: '#5b334c', stormy: '#536883', chad: '#303947' }[s.theme];
        for (const [lo, hi] of [[-extent, s.gap - s.half], [s.gap + s.half, extent]]) {
          const n = Math.ceil((hi - lo) / 1.7), width = (hi - lo) / n;
          for (let j = 0; j < n; j++) {
            const x = lo + width * (j + .5);
            mk(BOX(width, s.h, 1), color, convoy, x, DECK_Y + s.h / 2, 0);
            for (let y = 1; y < s.h; y += 2.5) {
              if (s.theme === 'count') {
                mk(BOX(width * .55, .13, .04), '#bca17d', convoy, x, DECK_Y + y, .52);
                mk(BOX(.12, 1, .04), '#bca17d', convoy, x, DECK_Y + y, .52);
              } else mk(BOX(width * .72, .12, .05), s.theme === 'stormy' ? '#b9eaff' : '#7dffea', convoy, x, DECK_Y + y, .52, { emissive: '#267e8a' });
            }
          }
        }
        mergeLocal(convoy);
      }
      a.g.userData.convoy.position.z = z;
      const c = Math.cos(s.angle), sn = Math.sin(s.angle);
      const x = me.pos.x * c - me.pos.z * sn, pz = me.pos.x * sn + me.pos.z * c;
      const inGap = Math.abs(x - s.gap) <= s.half - .35;
      if (a.t >= s.w && !a.hit && this.canHurt() && !inGap && pz >= old - .85 && pz <= z + .85 && me.pos.y < DECK_Y + s.h) {
        a.hit = true; this.hurt(s.d, 'procession', false, this.rpos);
      }
      if (z > extent + 1) { this.removeHazard(a); this.processions.splice(i, 1); }
    }
  }
  updLanes(dt, me) {
    for (let i = this.lanes.length - 1; i >= 0; i--) {
      const ln = this.lanes[i], s = ln.s;
      ln.t += dt;
      const ax = s.a[0], az = s.a[1], bx = s.b[0], bz = s.b[1];
      if (!ln.mesh) {
        const len = Math.hypot(bx - ax, bz - az) || 0.1, ang = Math.atan2(bx - ax, bz - az);
        const g = new THREE.Group();
        g.position.set(ax, DECK_Y + 0.05, az);
        g.rotation.y = ang;
        const fill = new THREE.Mesh(stripGeo(s.hw * 2, len, len / (s.hw * 2)), teleMat(DANGER, 0.45, TELE.tex(s.ar ? 'chev' : 'stripe')));
        g.add(fill);
        const prog = new THREE.Mesh(stripGeo(s.hw * 2, 1), teleMat(DANGER, 0.3));
        prog.position.y = 0.01; prog.scale.z = 0.001;
        g.add(prog);
        for (const sx of [-1, 1]) { const e = new THREE.Mesh(stripGeo(0.14, len), teleMat(DANGER, 0.95)); e.position.set(sx * (s.hw - 0.07), 0.02, 0); g.add(e); }
        const beam = new THREE.Mesh(new THREE.BoxGeometry(s.hw * 1.4, 1.6, len), new THREE.MeshBasicMaterial({ color: LANE_COL[this.id] || '#ff3df0', map: TELE.tex('wall'), transparent: true, opacity: 0.85, depthWrite: false }));
        beam.position.set(0, 0.8, len / 2);
        beam.visible = false;
        g.add(beam);
        g.userData = { fill, prog, beam, len };
        G.scene.add(g);
        ln.mesh = g;
      }
      const u = ln.mesh.userData;
      const active = ln.t >= s.w && ln.t < s.w + s.dur;
      const k = U.clamp(ln.t / s.w, 0, 1);
      u.prog.scale.z = Math.max(0.001, u.len * k);
      u.fill.material.opacity = active ? 0.75 : 0.3 + 0.25 * Math.abs(Math.sin(ln.t * (8 + k * 14)));
      if (active && !u.beam.visible) { u.beam.visible = true; Sound.play('zap'); G.shake = Math.max(G.shake, 0.3); }
      if (u.beam.visible) u.beam.scale.x = 1 + Math.sin(ln.t * 60) * 0.15;
      if (active && !ln.hit && this.canHurt()) {
        const vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz;
        const kk = U.clamp(((me.pos.x - ax) * vx + (me.pos.z - az) * vz) / L2, 0, 1);
        if (Math.hypot(me.pos.x - (ax + vx * kk), me.pos.z - (az + vz * kk)) < s.hw + 0.3 && me.pos.y < DECK_Y + 2) { ln.hit = true; this.hurt(s.d, 'laser', false, s.ar ? this.rpos : new V3(ax, DECK_Y, az)); }
      }
      if (ln.t > s.w + s.dur + 0.1) { this.removeHazard(ln); this.lanes.splice(i, 1); }
    }
  }
  // spinning beams: a line and a curved arrow show where it starts and which way it goes
  updSweeps(dt, me) {
    for (let i = this.sweeps.length - 1; i >= 0; i--) {
      const sw = this.sweeps[i], s = sw.s;
      sw.t += dt;
      const col = LANE_COL[this.id] || RING_COL[this.id];
      if (!sw.g) {
        const g = new THREE.Group();
        g.position.set(s.c[0], DECK_Y + 0.05, s.c[1]);
        const warn = new THREE.Group();
        const line = new THREE.Mesh(stripGeo(0.5, s.len), teleMat(DANGER, 0.8, TELE.tex('stripe')));
        line.rotation.y = s.a0;
        warn.add(line);
        const arr = new THREE.Mesh(arcArrow(s.len * 0.62, s.a0, Math.sign(s.sp) * 1.0, 0.28), teleMat(DANGER, 0.9));
        const arr2 = new THREE.Mesh(arcArrow(s.len * 0.32, s.a0, Math.sign(s.sp) * 1.0, 0.2), teleMat(DANGER, 0.9));
        warn.add(arr, arr2);
        g.add(warn);
        const beam = new THREE.Group();
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, s.h, s.len), new THREE.MeshBasicMaterial({ color: col, map: TELE.tex('wall'), transparent: true, opacity: 0.9, depthWrite: false }));
        b.position.set(0, s.h / 2, s.len / 2 + 0.6);
        const floor = new THREE.Mesh(stripGeo(1.3, s.len), teleMat(col, 0.35));
        floor.position.z = 0.6;
        beam.add(b, floor);
        beam.visible = false;
        g.add(beam);
        g.userData = { warn, beam, arr, arr2 };
        G.scene.add(g);
        sw.g = g;
      }
      const u = sw.g.userData;
      if (sw.t < s.w) { // warning: the start line and the arrows blink
        const bl = 0.45 + 0.45 * Math.abs(Math.sin(sw.t * 10));
        u.arr.material.opacity = u.arr2.material.opacity = bl;
        continue;
      }
      if (!u.beam.visible) { u.beam.visible = true; u.warn.visible = false; Sound.play('whoosh'); }
      const tt = Math.min(sw.t - s.w, s.dur), ang = s.a0 + s.sp * tt;
      u.beam.rotation.y = ang;
      const tip = new V3(s.c[0] + Math.sin(ang) * s.len, DECK_Y + s.h * 0.6, s.c[1] + Math.cos(ang) * s.len);
      this.glow.head(tip, sw.c || (sw.c = new THREE.Color(col)), 1.6, 0.8);
      // did it just sweep past me (while I was low enough)?
      if (this.canHurt() && sw.t - s.w <= s.dur) {
        const dx = me.pos.x - s.c[0], dz = me.pos.z - s.c[1], rho = Math.hypot(dx, dz), phi = Math.atan2(dx, dz);
        const moved = Math.abs(ang - sw.prev);
        const crossed = s.sp > 0 ? wrap(phi - sw.prev) <= moved : wrap(sw.prev - phi) <= moved;
        if (crossed && rho < s.len + 0.9 && rho > 0.5 && me.pos.y < DECK_Y + s.h) this.hurt(s.d, 'sweep', false, new V3(s.c[0], DECK_Y, s.c[1]));
      }
      sw.prev = ang;
      if (sw.t > s.w + s.dur + 0.15) { this.removeHazard(sw); this.sweeps.splice(i, 1); }
    }
  }
  // patches that stay a while: stink clouds, goo puddles
  updZones(dt, me) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i], s = z.s, col = ZONE_COL[s.kind] || DANGER;
      z.t += dt;
      if (!z.g) z.g = this.marker(s.c[0], s.c[1], s.r, col);
      const on = z.t >= s.w, left = s.w + s.dur - z.t;
      if (!on) this.markerSet(z.g, U.clamp(z.t / s.w, 0, 1));
      else {
        const u = z.g.userData, fade = U.clamp(left / 0.5, 0, 1);
        u.prog.scale.setScalar(s.r * (0.94 + Math.sin(z.t * 4) * 0.04));
        u.prog.material.opacity = (0.34 + Math.sin(z.t * 6) * 0.06) * fade;
        u.fill.material.opacity = 0.2 * fade; u.ring.material.opacity = 0.85 * fade;
        z.puffT -= dt;
        if (z.puffT <= 0) {
          z.puffT = 0.12;
          const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * s.r;
          this.glow.puff(new V3(s.c[0] + Math.cos(a) * r, DECK_Y + U.rand(0.2, 1.4), s.c[1] + Math.sin(a) * r), z.c || (z.c = new THREE.Color(col)), U.rand(0.9, 1.8), 0.8);
        }
        // standing in it: slowed down, and it hurts every so often
        const d = Math.hypot(me.pos.x - s.c[0], me.pos.z - s.c[1]);
        if (d < s.r && me.pos.y < DECK_Y + 1.6 && !me.dead && !me.ghost) {
          if (s.sl) me.slowK = Math.min(me.slowK, 1 - s.sl);
          z.tick -= dt;
          if (z.tick <= 0 && this.canHurt()) { z.tick = s.tk; this.hurt(s.d, 'zone'); Sound.play('sizzle'); }
        } else z.tick = Math.min(z.tick, 0.15);
      }
      if (left <= 0) { this.removeHazard(z); this.zones.splice(i, 1); }
    }
  }
  // wind that drags you toward the middle of it
  updPulls(dt, me) {
    for (let i = this.pulls.length - 1; i >= 0; i--) {
      const pl = this.pulls[i], s = pl.s;
      pl.t += dt;
      if (!pl.g) {
        const g = new THREE.Group();
        g.position.set(s.c[0], DECK_Y + 0.06, s.c[1]);
        const sw = new THREE.Mesh(TELE.disc(), teleMat('#5a6cff', 0, TELE.tex('swirl')));
        sw.scale.setScalar(s.r);
        const rg = new THREE.RingGeometry(s.r - 0.22, s.r, 96); rg.rotateX(-Math.PI / 2);
        const ring = new THREE.Mesh(rg, teleMat('#5a6cff', 0));
        g.add(sw, ring);
        g.userData = { sw, ring };
        G.scene.add(g);
        pl.g = g;
      }
      const u = pl.g.userData, on = pl.t >= s.w, left = s.w + s.dur - pl.t;
      const vis = U.clamp(pl.t / 0.4, 0, 1) * U.clamp(left / 0.4, 0, 1);
      u.sw.material.opacity = 0.6 * vis; u.ring.material.opacity = 0.85 * vis;
      u.sw.rotation.y -= dt * (on ? 3.2 : 1.2);
      if (on && left > 0) {
        if (Math.random() < 0.6) { // (streaks of wind flying inward)
          const a = Math.random() * TAU, r = s.r * U.rand(0.5, 1);
          this.glow.puff(new V3(s.c[0] + Math.cos(a) * r, DECK_Y + U.rand(0.2, 2), s.c[1] + Math.sin(a) * r), pl.c || (pl.c = new THREE.Color('#6f7dff')), 0.8, 0.4);
        }
        const dx = s.c[0] - me.pos.x, dz = s.c[1] - me.pos.z, d = Math.hypot(dx, dz);
        if (d < s.r && d > 0.3 && !me.dead && !me.ghost) {
          const f = s.f * (0.45 + 0.55 * (1 - d / s.r));
          me.ext.x += (dx / d) * f; me.ext.z += (dz / d) * f;
        }
      }
      if (left <= 0) { this.removeHazard(pl); this.pulls.splice(i, 1); }
    }
  }
  // Gary's lid: out and back like a boomerang
  updBoomers(dt, me) {
    for (let i = this.boomers.length - 1; i >= 0; i--) {
      const b = this.boomers[i], s = b.s;
      b.t += dt;
      const u = U.clamp(b.t / s.T, 0, 1), along = Math.sin(Math.PI * u), side = Math.sin(TAU * u) * s.cv;
      const A = s.a, B = s.b, dx = B[0] - A[0], dz = B[2] - A[2], L = Math.hypot(dx, dz) || 1;
      const pos = new V3(A[0] + dx * along + (dz / L) * side, A[1] + (B[1] - A[1]) * along, A[2] + dz * along - (dx / L) * side);
      if (!b.mesh) { b.mesh = projMesh(s.kind, s.r); G.scene.add(b.mesh); }
      b.mesh.position.copy(pos);
      b.mesh.rotation.y += dt * 16;
      const c = shotColor(s.kind);
      this.glow.head(pos, c, s.r * 3, 0.5);
      if ((b.trailT -= dt) <= 0) { b.trailT = 0.03; this.glow.puff(pos, c, s.r * 2, 0.35); }
      const leg = u < 0.5 ? 0 : 1;
      if (!b.hit[leg] && this.canHurt() && this.hurtCheckBody(pos, s.r + 0.35)) { b.hit[leg] = true; this.hurt(s.d, s.kind, false, pos); }
      if (u >= 1) {
        this.removeHazard(b); this.boomers.splice(i, 1);
        if (s.own === 'lid' && this.m.lid && !this.boomers.some((o) => o.s.own === 'lid')) this.m.lid.visible = true;
      }
    }
  }
  // Zorblax's gaze: a beam from his eyes that follows its target around the floor
  updTracks(dt, me) {
    for (let i = this.tracks.length - 1; i >= 0; i--) {
      const tr = this.tracks[i], s = tr.s;
      tr.t += dt;
      if (!tr.p) tr.p = new V3(s.s[0], DECK_Y, s.s[1]);
      if (!tr.g) {
        const g = new THREE.Group();
        const mk2 = this.marker(0, 0, s.r, DANGER);
        G.scene.remove(mk2);
        mk2.position.set(0, 0.05, 0);
        g.add(mk2);
        const beam = new THREE.Mesh(_beamGeo, beamMat(RING_COL[this.id]));
        const core = new THREE.Mesh(_beamGeo, beamMat('#ffffff'));
        G.scene.add(g, beam, core);
        tr.g = g; tr.beam = beam; tr.core = core; tr.mk = mk2;
      }
      // follow the target (as I see them; the target sees themselves exactly)
      const who = s.tg === Net.myId ? me.pos : G.remotes.get(s.tg) ? G.remotes.get(s.tg).tpos : null;
      const on = tr.t >= s.w && tr.t < s.w + s.dur;
      if (on && who) {
        const dx = who.x - tr.p.x, dz = who.z - tr.p.z, d = Math.hypot(dx, dz), step = s.sp * dt;
        if (d > 0.01) { tr.p.x += (dx / d) * Math.min(d, step); tr.p.z += (dz / d) * Math.min(d, step); }
      }
      tr.g.position.set(tr.p.x, DECK_Y, tr.p.z);
      this.markerSet(tr.mk, on ? 1 : U.clamp(tr.t / s.w, 0, 1));
      const eye = this.mouth().add(new V3(0, 0.6, 0));
      aimBeam(tr.beam, eye, tr.p.clone().setY(DECK_Y + 0.1), on ? 9 : 2.5 + Math.random() * 2);
      aimBeam(tr.core, eye, tr.p.clone().setY(DECK_Y + 0.1), on ? 3.5 : 0.8);
      if (on) {
        this.glow.head(tr.p.clone().setY(DECK_Y + 0.3), shotColor('laser'), 3.4, 0.8);
        if (Math.random() < 0.5) this.glow.puff(tr.p.clone().setY(DECK_Y + 0.2), shotColor('meteor'), 1.2, 0.5);
        if (this.canHurt() && Math.hypot(me.pos.x - tr.p.x, me.pos.z - tr.p.z) < s.r && me.pos.y < DECK_Y + 2) this.hurt(s.d, 'beam', false, this.rpos);
      }
      if (tr.t > s.w + s.dur) { this.removeHazard(tr); this.tracks.splice(i, 1); }
    }
  }
  // "something's coming down this way" (no damage: it's what's coming that hurts)
  updPaths(dt) {
    for (let i = this.paths.length - 1; i >= 0; i--) {
      const pa = this.paths[i], s = pa.s;
      pa.t += dt;
      if (!pa.g) {
        const ax = s.a[0], az = s.a[1], len = Math.hypot(s.b[0] - ax, s.b[1] - az) || 0.1;
        pa.g = new THREE.Mesh(stripGeo(s.hw * 2, len, len / (s.hw * 2)), teleMat(DANGER, 0.5, TELE.tex('chev')));
        pa.g.position.set(ax, DECK_Y + 0.05, az);
        pa.g.rotation.y = Math.atan2(s.b[0] - ax, s.b[1] - az);
        G.scene.add(pa.g);
      }
      pa.g.material.opacity = 0.55 * U.clamp((s.dur - pa.t) / 0.4, 0, 1);
      if (pa.t > s.dur) { this.removeHazard(pa); this.paths.splice(i, 1); }
    }
  }

  // a floor warning: a filling disc inside a blinking ring (it's full when it goes off)
  marker(x, z, r, color) {
    const g = new THREE.Group();
    g.position.set(x, DECK_Y + 0.045 + Math.random() * 0.02, z);
    const fill = new THREE.Mesh(TELE.disc(), teleMat(color, 0.14));
    fill.scale.setScalar(r);
    const prog = new THREE.Mesh(TELE.disc(), teleMat(color, 0.4));
    prog.scale.setScalar(0.01); prog.position.y = 0.008;
    const th = U.clamp(r * 0.08, 0.12, 0.26);
    const rg = new THREE.RingGeometry(r - th, r, 64); rg.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(rg, teleMat(color, 0.9));
    ring.position.y = 0.016;
    g.add(fill, prog, ring);
    g.userData = { fill, prog, ring, r };
    G.scene.add(g);
    return g;
  }
  markerSet(g, k) {
    const u = g.userData;
    u.prog.scale.setScalar(Math.max(0.01, k) * u.r);
    u.ring.material.opacity = 0.5 + 0.45 * Math.abs(Math.sin(this.t * (5 + k * 16)));
    u.fill.material.opacity = 0.1 + 0.12 * k;
  }
  teleDisc(x, z, r, color) { return this.marker(x, z, r, color); }
  removeHazard(h) {
    for (const k of ['mesh', 'tele', 'beam', 'core', 'g']) {
      if (h[k]) { dropObj(h[k]); h[k] = null; }
    }
  }

  /* ================= the HUD: where danger is coming from, and what to do about it ================= */
  threatHud(dt) {
    const me = this.me();
    if (this.st !== 'fight' || me.dead || !this.inFight(Net.myId)) { UI.threatHud(null); return; }
    const yaw = me.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const rel = (x, z) => { const dx = x - me.pos.x, dz = z - me.pos.z; return Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz); };
    const arrows = [];
    // shots that will pass close to me soon, from where I'm not looking
    const incoming = (pos, vel, col) => {
      const px = pos.x - me.pos.x, py = pos.y - (me.pos.y + 1), pzz = pos.z - me.pos.z;
      const vv = vel.x * vel.x + vel.y * vel.y + vel.z * vel.z;
      if (vv < 1) return;
      const tca = -(px * vel.x + py * vel.y + pzz * vel.z) / vv;
      if (tca < 0 || tca > 1.3) return;
      const cx = px + vel.x * tca, cy = py + vel.y * tca, cz = pzz + vel.z * tca;
      if (cx * cx + cy * cy + cz * cz > 10) return;
      const a = rel(pos.x, pos.z);
      if (Math.abs(a) < 0.5 && Math.abs(py) < 6) return; // (right in front of me: I can see it)
      arrows.push({ a, k: 1 - tca / 1.3, c: col });
    };
    for (const p of this.projs) if (p.mesh && !(p.s.hd && p.t < p.s.hd)) incoming(p.pos, p.vel, SHOT_COL[p.s.k] || '#ff5a5a');
    for (const b of this.boomers) if (b.mesh) { const v = b.mesh.position.clone().sub(b.last || b.mesh.position).divideScalar(Math.max(dt, 1e-3)); b.last = b.mesh.position.clone(); incoming(b.mesh.position, v, SHOT_COL.lid); }
    // the boss, if it's off screen
    let bossA = null;
    if (!this.hidden) {
      G.camera.updateMatrixWorld();
      const v = this.center().project(G.camera);
      if (v.z > 1 || Math.abs(v.x) > 0.92 || Math.abs(v.y) > 0.92) bossA = rel(this.rpos.x, this.rpos.z);
    }
    // what to do right now
    let cue = null;
    const onFloor = me.pos.y < DECK_Y + 0.4;
    const inCircle = (c, r) => Math.hypot(me.pos.x - c[0], me.pos.z - c[1]) < r + 0.2;
    for (const sl of this.slams) if (!sl.done && sl.t < sl.s.w && sl.s.w - sl.t < 1.0 && inCircle(sl.s.c, sl.s.r)) cue = 'MOVE!';
    for (const p of this.projs) if (p.tele && p.teleT - p.t < 0.8 && inCircle([p.tele.position.x, p.tele.position.z], p.tele.userData.r)) cue = 'MOVE!';
    for (const z of this.zones) if (inCircle(z.s.c, z.s.r) && (z.t >= z.s.w || z.s.w - z.t < 0.9)) cue = 'MOVE!';
    for (const ln of this.lanes) {
      if (ln.t >= ln.s.w) continue;
      const s = ln.s, ax = s.a[0], az = s.a[1], vx = s.b[0] - ax, vz = s.b[1] - az, L2 = vx * vx + vz * vz || 1;
      const kk = U.clamp(((me.pos.x - ax) * vx + (me.pos.z - az) * vz) / L2, 0, 1);
      if (Math.hypot(me.pos.x - (ax + vx * kk), me.pos.z - (az + vz * kk)) < s.hw + 0.3) cue = 'MOVE!';
    }
    for (const tr of this.tracks) if (tr.p && tr.s.tg === Net.myId && tr.t < tr.s.w + tr.s.dur) cue = cue || 'RUN!';
    for (const pl of this.pulls) if (pl.t >= pl.s.w && inCircle(pl.s.c, pl.s.r)) cue = cue || 'RUN!';
    if (!cue && onFloor) {
      for (const r of this.rings) {
        if (r.t < 0 || r.hit) continue;
        const d = Math.hypot(me.pos.x - r.s.c[0], me.pos.z - r.s.c[1]), gap = d - r.t * r.s.s;
        if (gap > -0.3 && gap / r.s.s < 0.6) cue = 'JUMP!';
      }
      for (const sw of this.sweeps) {
        const s = sw.s;
        if (sw.t < s.w - 0.3 || sw.t > s.w + s.dur) continue;
        const dx = me.pos.x - s.c[0], dz = me.pos.z - s.c[1];
        if (Math.hypot(dx, dz) > s.len + 0.9) continue;
        const ang = s.a0 + s.sp * Math.max(0, sw.t - s.w), phi = Math.atan2(dx, dz);
        const ahead = s.sp > 0 ? wrap(phi - ang) : wrap(ang - phi);
        if (Math.max(0, s.w - sw.t) + ahead / Math.abs(s.sp) < 0.45) cue = 'JUMP!';
      }
    }
    // where the last hits came from
    for (let i = this.hurtDirs.length - 1; i >= 0; i--) { const h = this.hurtDirs[i]; h.t += dt; if (h.t > 1.1) this.hurtDirs.splice(i, 1); }
    UI.threatHud({
      arrows, bossA, bossCol: RING_COL[this.id], cue,
      hits: this.hurtDirs.map((h) => ({ a: rel(h.x, h.z), k: 1 - h.t / 1.1 })),
    });
  }

  /* ================= minions (everyone draws them; the host moves them) ================= */
  updateMinions(dt) {
    const me = this.me();
    for (const m of this.minions.values()) {
      if (!m.mesh) {
        m.mesh = buildMinion(m.kind);
        m.mesh.position.set(m.x, DECK_Y, m.z);
        G.scene.add(m.mesh);
        FX.burst(new V3(m.x, DECK_Y + 0.5, m.z), '#ffffff', 5, 3);
        m.an = { hop: Math.random() * 6, pop: 0, yaw: 0 };
      }
      const an = m.an, mesh = m.mesh;
      const px = mesh.position.x, pz = mesh.position.z;
      mesh.position.x = U.damp(px, m.tx, 10, dt);
      mesh.position.z = U.damp(pz, m.tz, 10, dt);
      const dx = mesh.position.x - px, dz = mesh.position.z - pz, spd = Math.hypot(dx, dz) / Math.max(dt, 1e-4);
      an.hop += dt * (5 + spd * 1.6);
      an.pop = Math.min(1, an.pop + dt * 3.5);
      // pop in with a little overshoot, then hop / waddle / hover along
      const pop = an.pop < 1 ? Math.sin(an.pop * Math.PI * 0.75) / Math.sin(Math.PI * 0.75) : 1;
      const hopH = Math.abs(Math.sin(an.hop));
      let y = DECK_Y, sy = 1;
      if (m.kind === 'slime') { y += hopH * 0.35; sy = 1 + (hopH - 0.5) * 0.3; }
      else if (m.kind === 'bat') y += Math.sin(an.hop * 0.7) * 0.25;
      else if (m.kind === 'tornado') y += 0.05;
      else { y += hopH * 0.12; mesh.rotation.z = Math.sin(an.hop) * 0.12; }
      mesh.position.y = y;
      mesh.scale.set(pop / Math.sqrt(sy), pop * sy, pop / Math.sqrt(sy));
      const ud = mesh.userData;
      if (ud.wings) ud.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(this.t * 18 + m.id) * 0.8; });
      if (ud.spin) ud.spin.rotation.y += dt * 10;
      if (spd > 0.05) an.yaw += U.angDiff(an.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 10);
      mesh.rotation.y = an.yaw;
      m.hitT -= dt;
      if (this.canHurt() && Math.hypot(me.pos.x - mesh.position.x, me.pos.z - mesh.position.z) < 1.0 && me.pos.y < DECK_Y + 1.5) this.hurt(8, 'minion', false, mesh.position);
    }
  }
  // its head, for headshots: the top one of its hit spheres if it has more than one, or the top of it
  headSphere() {
    const hs = this.m.hit;
    if (hs.length > 1) { const h = hs.reduce((a, b) => (b.o.y > a.o.y ? b : a)); return { p: this.world(h.o), r: h.r, h }; }
    const h = hs[0];
    return { p: this.world(new V3(h.o.x, h.o.y + h.r * 0.55, h.o.z + h.r * 0.2)), r: h.r * 0.5, h: null };
  }
  // does a shot from p0 to p1 hit it? false, or { head: through its head }
  hitTest(p0, p1) {
    if (this.st !== 'fight' || this.hidden) return false;
    const hd = this.headSphere();
    let tb = -1;
    for (const h of this.m.hit) {
      if (h === hd.h) continue;
      const t = U.segEnter(p0, p1, this.world(h.o), h.r);
      if (t >= 0 && (tb < 0 || t < tb)) tb = t;
    }
    const th = U.segEnter(p0, p1, hd.p, hd.r);
    if (tb < 0 && th < 0) return false;
    // (a head of its own: into it without going through much of the rest first. Just one big round body:
    // anywhere up top counts)
    return { head: th >= 0 && (!hd.h || tb < 0 || (th - tb) * p0.distanceTo(p1) < 0.5) };
  }
  // the first minion a shot from p0 to p1 passes through (skip: ones this shot already hit, keyed 'm' + id)
  minionOn(p0, p1, skip) {
    for (const m of this.minions.values()) {
      if (!m.mesh || (skip && skip.has('m' + m.id))) continue;
      const c = m.mesh.position.clone(); c.y += 0.6;
      if (U.segSphere(p0, p1, c, 0.75)) return m;
    }
    return null;
  }
  hitMinion(m, dmg, quiet) {
    if (!m.mesh) return;
    const c = m.mesh.position.clone(); c.y += 0.6;
    FX.burst(c, '#ffffff', quiet ? 2 : 5, 3);
    if (!quiet) hitFeedback(c.clone().setY(c.y + 0.2), dmg, false, 36);
    if (m.an) m.an.pop = 0.72; // (a little squish)
    if (Net.isHost) this.damageMinion(m.id, dmg); else Net.toHost({ t: 'hitm', id: m.id, dmg });
  }
  hitMinions(p0, p1, dmg) { const m = this.minionOn(p0, p1); if (m) this.hitMinion(m, dmg); return !!m; }
  // quiet: no damage number or sound (the Cryo Beam hits ten times a second) · head: a headshot
  localHit(dmg, pos, quiet, head) {
    this.flash = Math.max(this.flash, quiet ? 0.3 : 1);
    if (!quiet) {
      this.anim.flinch = 1;
      hitFeedback(pos, dmg, head, dmg >= 50 ? 60 : 44, dmg >= 50 ? '#ffd23f' : '#ffffff');
    }
    FX.burst(pos, RING_COL[this.id], quiet ? 2 : 4, 3);
    if (Net.isHost) this.damage(dmg); else Net.toHost({ t: 'hitb', dmg });
  }
  // skipBoss: the shot already hit the boss directly (only the splash hits everything else)
  explosion(pos, radius, dmg, skipBoss) {
    if (!skipBoss && !this.hidden) for (const h of this.m.hit) {
      if (this.world(h.o).distanceTo(pos) < radius + h.r) { this.localHit(dmg, pos); break; }
    }
    for (const m of [...this.minions.values()]) {
      if (!m.mesh || m.mesh.position.distanceTo(pos) > radius) continue;
      if (Net.isHost) this.damageMinion(m.id, dmg); else Net.toHost({ t: 'hitm', id: m.id, dmg });
    }
  }

  // the Pizza Peel catches the Emperor's pizza slices instead of your face
  catchSlice(pos) {
    FX.text(pos.clone().add(new V3(0, 0.8, 0)), U.pick(LINES.meteorCatch), '#ffd23f', 50);
    FX.burst(pos, '#ffc94a', 6, 3);
    this.me().swing = 1;
    Sound.play('catch');
    if (U.chance(0.3)) UI.toast(U.pick(['Caught it. It IS cold, honestly.', 'Returned to sender. Sort of.', 'Delivery accepted. By you. Again.']), '', 1.6);
  }

  /* ----- the local player's life ----- */
  // bosses hit a bit softer than they used to (BOSS_DMG), but they have far more health.
  // raw = friendly fire: same damage on every difficulty. from: where it came from (for the arrow on screen)
  hurt(d, kind, raw, from) {
    const p = this.me();
    if (!this.canHurt()) return;
    d = Math.round(raw ? d : d * Game.dmgMul() * BOSS_DMG);
    if (SAVE.armor) d = Math.round(d * 0.7);
    if (hasPerk('collar')) d = Math.round(d * 0.75);
    p.hp -= d; p.inv = 0.75; p.regenT = 4;
    UI.hurt();
    G.shake = Math.max(G.shake, 0.55);
    Sound.play('hurt');
    if (from) this.hurtDirs.push({ x: from.x, z: from.z, t: 0 });
    // (your goober gets knocked about: from behind, he clutches his backside)
    const bx = from ? p.pos.x - from.x : 0, bz = from ? p.pos.z - from.z : 0, bl = Math.hypot(bx, bz) || 1;
    p.act('hurt', from && (bx * Math.sin(p.yaw) + bz * Math.cos(p.yaw)) / bl < -0.4 ? 'back' : '');
    if (kind === 'coin' && U.chance(0.5)) { addBucks(1); UI.toast('+$1 (at least you got paid)', 'gold', 1.2); }
    if (kind === 'pizza' && U.chance(0.3)) UI.toast('It IS pretty cold, honestly.', '', 1.5);
    if (p.hp <= 0) {
      // one life. With friends in the fight you go down: they can pick you up, or you get back up by
      // yourself after a while (see LocalPlayer.updateDown) as long as one of them is still standing.
      if (this.crewmates().length) p.goDown(this.def.name, null);
      else this.die();
    }
  }
  // alone in the fight and out of health: that's it, the boss wins (Hardcore: for good)
  die() {
    const p = this.me();
    p.dead = true; p.deadT = 0; p.hp = 0;
    p.stopEmote(); p.act('die');
    SAVE.stats.deaths++;
    persist();
    Sound.play('death');
    if (DIFFS[G.diff].perma) { Game.permaDeath(this.def.name); return; }
    UI.bigTitle('YOU DIED', `${this.def.name} wins this one. You only get one life in a boss fight.`, '#ff6b6b', 2.6);
  }
  updateLocal(dt) {
    const p = this.me();
    UI.php(p.hp);
    const rows = [{ name: G.name + ' (you)', hp: p.hp, out: p.ghost, down: p.down }];
    for (const r of G.remotes.values()) if (this.inFight(r.id)) rows.push({ name: r.name, hp: r.s.hp, out: !!r.s.g, down: !!r.s.dn });
    UI.team(rows);
  }

  /* ----- client sync ----- */
  onSync(m) {
    this.tpos.set(m.p[0], m.p[1], m.p[2]);
    this.rot = this.trot = m.r;
    this.hp = m.hp;
    this.contact = m.c; this.contactDmg = m.cd || 15;
    if (m.hd != null && this.st !== 'dying') this.hidden = !!m.hd;
    if (m.ph === 2 && this.phase === 1) { this.phase = 2; this.onPhase2(); }
    if (m.st === 'fight' && this.st === 'intro') this.st = 'fight';
    if (m.st === 'dying' && this.st !== 'dying' && !this.over) { this.st = 'dying'; this.onDying(); }
    const seen = new Set();
    for (const [id, x, z] of m.mm || []) {
      seen.add(id);
      let mm = this.minions.get(id);
      if (!mm) { mm = { id, x, z, tx: x, tz: z, kind: MINION_KIND[this.id], mesh: null, hitT: 0 }; this.minions.set(id, mm); }
      mm.tx = x; mm.tz = z;
    }
    for (const id of [...this.minions.keys()]) if (!seen.has(id)) this.killMinion(id);
  }

  /* ----- the end ----- */
  finish(won) {
    if (this.over) return;
    this.over = true; this.won = won;
    this.st = won ? 'dying' : 'over';
    UI.bossCall(null);
    UI.threatHud(null);
    const b = this.def;
    const first = !SAVE.beaten.includes(this.id);
    if (won) {
      const reward = first ? b.reward : Math.round(b.reward * 0.5);
      addBucks(reward);
      if (first) SAVE.beaten.push(this.id);
      const opened = !G.progress.includes(this.id) && PLANETS[G.planet + 1]; // (the next planet, if this win opened it up)
      if (!G.progress.includes(this.id)) G.progress.push(this.id);
      this.payout = { reward, planet: opened ? opened.name : null }; // (shown when you're back on the planet, see beamUp)
      SAVE.stats.bossWins++;
      persist();
      Sound.play('victory');
      // no menu: VICTORY on screen, then a beam of light appears to take you home (see openExit)
      const me = this.me();
      if (me.down) me.revive(null); // (everybody gets up to see it)
      UI.bigTitle('VICTORY!', `+${U.bucks(reward)} · ${b.win}`, '#7dff8a', 5);
      setTimeout(() => { if (G.boss === this) this.openExit(); }, BOSS_EXIT.delay * 1000);
      return;
    }
    if (Game.permaDead) return; // (Hardcore: the world's gone, see Game.permaDeath)
    // no menu: everything goes black... and you wake up back on the planet, with a hospital bill
    const bill = Math.min(1000, Math.round(SAVE.bucks * 0.1));
    addBucks(-bill);
    Sound.play('lose');
    setTimeout(() => {
      if (G.boss !== this) return;
      UI.blackout(`${b.name} wins this time...`, () => { if (!G.boss || G.boss === this) { Game.endBoss(false); G.player.wake(); } }, () => {
        UI.toast(`You wake up back on ${PLANETS[G.planet].name}. Space hospital bill: -${U.bucks(bill)}.`, 'bad', 5);
        UI.toast(`For a rematch you'll need another ${SUMMONS[this.id].name}.`, '', 5);
      });
    }, 800);
  }
  // the beam home, in the middle of the arena (with the planet's name on it)
  openExit() {
    const col = new THREE.Color(BOSS_EXIT.color), g = new THREE.Group();
    const glow = (r, op) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, 60, 32, 1, true),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    const beam = glow(BOSS_EXIT.r * 0.85, 0.22), core = glow(BOSS_EXIT.r * 0.3, 0.45);
    beam.position.y = core.position.y = 30;
    const ring = new THREE.Mesh(new THREE.RingGeometry(BOSS_EXIT.r * 0.85, BOSS_EXIT.r * 1.25, 48),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -PI / 2; ring.position.y = 0.06;
    const tag = textSprite(`BACK TO ${PLANETS[G.planet].name.toUpperCase()}`, { size: 44, color: '#ffffff', bg: 'rgba(10,60,60,.7)', scale: 0.011 });
    tag.position.y = 3.4;
    g.add(beam, core, ring, tag);
    g.position.set(0, DECK_Y, 0);
    G.scene.add(g);
    this.exit = { g, beam, core, ring, tag, t: 0, left: BOSS_EXIT.wait, sparkT: 0 };
    FX.ring(new V3(0, DECK_Y + 0.2, 0), BOSS_EXIT.color, 6);
    Sound.play('summon');
    UI.bossBar(false);
  }
  updateExit(dt) {
    const e = this.exit;
    if (!e) return;
    e.t += dt; e.left -= dt;
    const grow = U.clamp(e.t / 0.6, 0, 1); // (it shoots down out of the sky)
    e.beam.scale.set(grow, 1, grow); e.core.scale.set(grow, 1, grow);
    e.beam.material.opacity = 0.18 + 0.07 * Math.sin(e.t * 5);
    e.ring.rotation.z += dt * 1.5; e.ring.scale.setScalar(1 + 0.08 * Math.sin(e.t * 4));
    e.tag.position.y = 3.4 + Math.sin(e.t * 2) * 0.12;
    e.sparkT -= dt;
    if (e.sparkT <= 0) { // (sparkles floating up it)
      e.sparkT = 0.07;
      const a = Math.random() * PI * 2, r = Math.random() * BOSS_EXIT.r * 0.8;
      FX.burst(new V3(Math.cos(a) * r, DECK_Y + U.rand(0.2, 3), Math.sin(a) * r), Math.random() < 0.5 ? '#ffffff' : BOSS_EXIT.color, 1, 1.5);
    }
    if (e.going) return;
    const p = this.me(), inside = Math.hypot(p.pos.x - e.g.position.x, p.pos.z - e.g.position.z) < BOSS_EXIT.r && !p.dead && !p.down;
    if (inside || e.left <= 0) this.beamUp();
  }
  // into the light: a flash, and you're back on the planet (the last boss: the ending), where it says what you won
  // and which planet you can fly to now
  beamUp() {
    const e = this.exit, p = this.me(), pay = this.payout, last = this.id === 'zorblax';
    e.going = true;
    Sound.play('warp');
    FX.burst(p.pos.clone().setY(p.pos.y + 1), BOSS_EXIT.color, 30, 8);
    UI.flash();
    setTimeout(() => {
      if (G.boss !== this) return;
      Game.endBoss(last);
      if (pay && !last) setTimeout(() => UI.payout(pay.reward, pay.planet), 450);
    }, 350);
  }
  dispose() {
    if (this.exit) { G.scene.remove(this.exit.g); disposeObj(this.exit.g); this.exit = null; }
    for (const d of this.debris || []) dropObj(d.o);
    this.debris = null;
    for (const h of this.allHazards()) this.removeHazard(h);
    for (const id of [...this.minions.keys()]) { const m = this.minions.get(id); if (m.mesh) dropObj(m.mesh); }
    this.minions.clear();
    G.scene.remove(this.glow.pts);
    this.glow.dispose();
    G.scene.remove(this.m.root);
    disposeObj(this.m.root);
    const u = HI_U.boss;
    u.uFlash.value = 0; u.uGlow.value = 0;
    const me = this.me();
    me.slowK = 1; me.ext.set(0, 0, 0);
    UI.bossCall(null);
    UI.threatHud(null);
  }
}
