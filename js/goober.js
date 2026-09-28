'use strict';
/* =========================================================
   Goobers in motion: everything a goober does, done goofy.
   He walks with floppy noodle arms and his head bobbling
   about in its bubble, sprints like his pants are on fire,
   flails all the way down a long fall, front-flips on a
   double jump, gets knocked silly, and goes limp as a
   ragdoll when he's down (see GoobRagdoll). Stand still and
   he fidgets.
   Worked out fresh every frame from what he's doing (see
   GooberAnim.update) plus one-off moves (play), so he looks
   the same to you (while you emote, the Customize screen) as
   to your crew (from what your game sends them).
   ========================================================= */

// how hard each gun knocks him about when it goes off
const GOOB_KICK = { squirt: 0.3, bolt: 0.55, homing: 0.5, jackpot: 0.7, lob: 0.9, cutter: 0.8, beam: 0.14, chain: 1.3, spread: 1.6, rocket: 2.1 };
// guns he needs both hands for (one-handed, the other hand goes on his hip)
const GOOB_TWO_HANDED = new Set(['spread', 'lob', 'beam', 'chain', 'rocket']);
// what he gets up to when he's been standing about (seconds each)
const GOOB_FIDGETS = { scratch: 2.4, pick: 2.8, yawn: 2.6, drum: 2.4, look: 2.2, tap: 2.8, wobble: 1.8 };
// emotes (G): [seconds, name]
const GOOB_EMOTES = { wave: [2.4, 'Wave'], chicken: [4.2, 'Chicken dance'], flex: [3.2, 'Flex'], floss: [4, 'Floss'], facepalm: [2.6, 'Facepalm'], faint: [3.6, 'Faint'] };
// one-off moves and how long they take
const GOOB_ONEOFF = { jump: 0.3, flip: 0.5, land: 0.6, dash: 0.42, hurt: 0.6, reload: 0.9, throw: 0.55, swing: 0.42, die: 1.1, up: 0.8, yay: 0.8 };

// a pose: how every joint is turned. b*: the whole goober (y: up, x: pitch, z: roll, yaw, sq: squash), hy: hips
// turned, s*: waist, l*/r*: left/right thigh (tx, tz: out), knee (k), foot (f), arm (ax, ay: twist, az: out),
// elbow (e), n*: neck. Then the face: eye (how open), yell (mouth wide open), squint, xe (X eyes), px/py (pupils)
const GOOB_KEYS = ['by', 'bx', 'bz', 'byaw', 'sq', 'hy', 'sx', 'sy', 'sz', 'ltx', 'ltz', 'lk', 'lf', 'rtx', 'rtz', 'rk', 'rf',
  'lax', 'lay', 'laz', 'le', 'rax', 'ray', 'raz', 're', 'nx', 'ny', 'nz', 'eye', 'yell', 'squint', 'xe', 'px', 'py'];
function goobPose() { const p = {}; for (const k of GOOB_KEYS) p[k] = 0; p.sq = 1; p.eye = 1; return p; }
const goobEase = (x) => { x = U.clamp(x, 0, 1); return x * x * (3 - 2 * x); };
// 0 -> 1 -> 0 over d seconds: easing in over `a`, out over the last `b` (how much of a move is showing)
const goobHold = (t, d, a = 0.2, b = 0.3) => Math.min(goobEase(t / a), goobEase((d - t) / b));
const goobPulse = (t, d) => (t > 0 && t < d ? Math.sin((PI * t) / d) : 0);
// an underdamped spring (the wobbly bits): s = { x, v }
function goobSpring(s, target, k, damp, dt) {
  const n = Math.max(1, Math.ceil(dt / 0.02)), h = dt / n;
  for (let i = 0; i < n; i++) { s.v += (k * (target - s.x) - damp * s.v) * h; s.x += s.v * h; }
  return s.x;
}
// blend a joint toward v (T: the eased pose). snap: the same, but right now, without easing (fast moves)
const goobMix = (T, k, v, w) => { T[k] += (v - T[k]) * w; };
const goobSnap = (A, X, k, v, w) => { X[k] += (v - A.cur[k]) * w; };
const goobSet = (T, list, w) => { for (const [k, v] of list) T[k] += (v - T[k]) * w; };

class GooberAnim {
  // m: a goober (see buildAstronaut)
  constructor(m) {
    this.m = m;
    this.cur = goobPose(); this.tgt = goobPose(); this.raw = goobPose();
    this.t = Math.random() * 20; this.ph = 0; this.air = 0; this.fallV = 0; this.wasGround = true; this.jumpSide = 1;
    this.acts = []; this.emo = null;
    this.head = { x: 0, v: 0 }; this.headZ = { x: 0, v: 0 }; this.noseS = { x: 0, v: 0 }; this.earS = { x: 0, v: 0 };
    this.elL = { x: 0, v: 0 }; this.elR = { x: 0, v: 0 }; this.wL = 0; this.wR = 0; this.lastL = 0; this.lastR = 0;
    this.blinkT = 1 + Math.random() * 3; this.blink = 0; this.lookT = 0; this.lookY = 0; this.lookP = 0;
    this.idleT = 0; this.nextFidget = U.rand(3, 6); this.lastFidget = '';
    this.aimW = 0; this.fireT = 9; this.tumble = 0; this.hipA = 0; this.lastFwd = 0; this.lastLeft = 0; this.lastPy = 0; this.lastVy = 0;
    for (const o of [m.armL, m.armR, m.legL, m.legR]) o.rotation.order = 'XZY'; // (twist, then out to the side, then swing: out stays out)
    m.head.rotation.order = 'YXZ'; m.pose.rotation.order = 'YXZ';
  }

  // a one-off move: 'jump', 'flip', 'land' (k: how hard), 'dash', 'fire' (k: the gun's type), 'hurt' (k: 'back'
  // if it came from behind), 'reload', 'throw', 'swing', 'die', 'up' (back on his feet), 'yay', a fidget or an emote
  play(n, k) {
    if (n === 'stop') { this.emo = null; return; } // (an emote cut short)
    if (n === 'fire') {
      const kk = GOOB_KICK[k] || 0.5, f = this.acts.find((a) => a.n === 'fire');
      this.fireT = 0;
      if (f && kk < 0.2 && f.k < 0.2) { f.t = 0; return; } // (the Cryo Beam fires ten times a second: keep one going)
      this.acts = this.acts.filter((a) => a.n !== 'fire');
      this.acts.push({ n, t: 0, d: 0.28 + kk * 0.2, k: kk, g: k });
      this.head.v -= 4 * kk;
      return;
    }
    if (GOOB_EMOTES[n]) { this.emo = { n, t: 0, d: GOOB_EMOTES[n][0] }; this.acts = this.acts.filter((a) => !GOOB_FIDGETS[a.n]); return; }
    const d = GOOB_ONEOFF[n] || GOOB_FIDGETS[n];
    if (!d) return;
    if (n !== 'land') this.acts = this.acts.filter((a) => a.n !== n);
    const a = { n, t: 0, d, k: typeof k === 'number' ? k : 1, v: 0 };
    if (n === 'reload' && +k > 0) a.d = Math.min(+k, 3); // (as long as that gun takes)
    if (n === 'hurt') { a.v = k === 'back' ? 1 : Math.random() < 0.2 ? 2 : 0; this.head.v -= 12; this.headZ.v += U.rand(-8, 8); this.noseS.v += 26; this.earS.v += 20; }
    if (n === 'land') { this.head.v += 5 * a.k; this.noseS.v += 16 * a.k; this.earS.v += 14 * a.k; }
    if (n === 'die') this.emo = null;
    this.acts.push(a);
    if (GOOB_FIDGETS[n]) this.lastFidget = n;
  }
  stopEmote() { this.emo = null; }

  // st: what he's doing. vx, vy, vz: how fast he's going (world), yaw / pitch: where he's looking, ground,
  // tool ('zap', 'vac', 'drill', 'peel' or none), gun (its type), use (vacuuming, drilling, beaming), jet,
  // glide, stomp, launch (flung by a jump pad or a rocket), slide (on ice), revive (picking a friend up; reviveK: how far),
  // down, dead, lift (a friend picking him up, 0-1), sit ('pilot' / 'pass'), calm (no fidgets). Lying there
  // he goes limp if he has somewhere to lie: world (a PlanetWorld or the Arena), grav, v0 (how fast he was going when it
  // got him), pin (keep his body over there), thud (make a noise hitting the ground)
  update(dt, st) {
    dt = Math.min(dt, 0.1);
    this.t += dt;
    const T = this.tgt, X = this.raw;
    for (const k of GOOB_KEYS) { T[k] = 0; X[k] = 0; }
    T.sq = 1; T.eye = 1;
    const sy = Math.sin(st.yaw || 0), cy = Math.cos(st.yaw || 0), vx = st.vx || 0, vz = st.vz || 0, vy = st.vy || 0;
    const fwd = -vx * sy - vz * cy, left = -vx * cy + vz * sy, spd = Math.hypot(vx, vz);
    const lying = !!(st.dead || st.down);
    // --- down or out cold: he goes limp (see GoobRagdoll), and eases back out of it once he's up again
    if (lying && !this.rag && st.world) { this.rag = new GoobRagdoll(this.m, st.v0); this.acts.length = 0; this.emo = null; }
    else if (this.rag && !lying) this.rag.leaving = true;
    const limp = !!this.rag && !this.rag.leaving;
    if (limp) this.acts.length = 0;
    // --- leaving the ground and landing (a long drop lands hard)
    if (!lying && !st.sit) {
      if (this.wasGround && !st.ground && vy > 2.5) { this.play('jump'); this.jumpSide = -this.jumpSide; }
      if (!st.ground) { this.air += dt; this.fallV = Math.min(this.fallV, vy); } else {
        if (!this.wasGround && this.air > 0.14) this.play('land', U.clamp(-this.fallV / 15, 0.2, 1.3));
        this.air = 0; this.fallV = 0;
      }
    } else { this.air = 0; this.fallV = 0; }
    this.wasGround = !!st.ground;
    // (getting going or stopping tips his head, from the inside of the helmet)
    const af = (fwd - this.lastFwd) / Math.max(dt, 1e-3), al = (left - this.lastLeft) / Math.max(dt, 1e-3);
    this.lastFwd = fwd; this.lastLeft = left;
    if (!lying) { this.head.v -= U.clamp(af, -60, 60) * 0.04; this.headZ.v += U.clamp(al, -60, 60) * 0.03; }
    // --- the base pose
    if (st.sit) this.sitPose(T, X, st);
    else if (limp) this.ragPose(T, st);
    else if (lying) this.liePose(T, X, st);
    else if (!st.ground) this.airPose(T, X, st, vy, dt);
    else this.groundPose(T, X, st, spd, fwd, left, dt);
    // (flung through the air he tumbles; once it's over he rolls on round to upright)
    if (st.launch && !st.ground && !lying) this.tumble += dt * 7;
    else this.tumble = U.damp(this.tumble, Math.round(this.tumble / (PI * 2)) * PI * 2, 9, dt);
    X.bx += this.tumble;
    if (!lying && !st.sit && !st.revive) this.toolPose(T, X, st, dt, spd); // (both hands full picking a friend up)
    // --- one-off moves, then an emote (which takes over)
    for (let i = this.acts.length - 1; i >= 0; i--) {
      const a = this.acts[i];
      a.t += dt;
      if (a.t >= a.d) { this.acts.splice(i, 1); continue; }
      GOOB_MOVES[a.n](T, X, a, this, st);
    }
    if (this.emo) {
      const e = this.emo;
      e.t += dt;
      if (e.t >= e.d || lying) this.emo = null; else GOOB_MOVES[e.n](T, X, e, this, st);
    }
    // --- standing about for a while: a fidget
    const idle = !st.calm && st.ground && !lying && !st.sit && spd < 0.4 && !st.use && this.aimW < 0.7 && !this.emo && !this.acts.length;
    this.idleT = idle ? this.idleT + dt : 0;
    if (this.idleT > this.nextFidget) {
      const pick = Object.keys(GOOB_FIDGETS).filter((f) => f !== this.lastFidget);
      this.play(U.pick(pick));
      this.idleT = 0; this.nextFidget = U.rand(3.5, 8);
    }
    this.face(T, X, st, dt);
    // --- ease toward the pose, then the wobbly bits on top
    const c = this.cur, r = 1 - Math.exp(-24 * dt);
    for (const k of GOOB_KEYS) c[k] += (T[k] - c[k]) * r;
    this.apply(c, X, st, dt);
    // --- limp: the ragdoll moves him (and a hard landing rattles his head about), then lets go of him bit by bit
    const rg = this.rag;
    if (!rg) return;
    if (limp) {
      rg.update(dt, st);
      if (rg.hit > 3) {
        const k = Math.min(rg.hit, 12);
        this.head.v -= k * 1.4; this.headZ.v += U.rand(-1, 1) * k; this.noseS.v += k * 3; this.earS.v += k * 2.5;
        if (st.thud && G.time - (rg.thudT || 0) > 0.3) { rg.thudT = G.time; Sound.play(k > 7 ? 'thud' : 'boing'); }
      }
    } else if ((rg.k -= dt / RAG.out) <= 0) { this.rag = null; return; }
    rg.put(goobEase(rg.k));
  }

  // limp: only his face, and his head lolling about in the helmet the way gravity pulls it (see GoobRagdoll)
  ragPose(T, st) {
    const g = this.rag.down(_rv), t = this.t;
    T.nx = U.clamp(g.z * 0.9, -0.7, 0.7); T.nz = U.clamp(-g.x * 0.7, -0.5, 0.5);
    if (st.down) { // groggy, eyes rolling round, groaning
      T.squint = 0.5 + 0.25 * Math.sin(t * 1.7); T.yell = 0.3 * Math.max(0, Math.sin(t * 2.3));
      T.px = 0.55 * Math.sin(t * 3); T.py = 0.55 * Math.cos(t * 3);
    } else { T.xe = 1; T.yell = 0.35; } // (out cold: X eyes, tongue out)
  }

  groundPose(T, X, st, spd, fwd, left, dt) {
    const t = this.t, back = fwd < -0.4 && -fwd > Math.abs(left) * 0.7;
    this.ph += dt * spd * 2.2 * (back ? -1 : 1);
    const p = this.ph, wk = U.clamp(spd / 5.6, 0, 1.25), rn = U.clamp((spd - 6.2) / 3, 0, 1), still = 1 - U.clamp(spd / 1.2, 0, 1);
    // legs: big goofy strides, knees up high on the way through, feet slapping down
    const amp = 0.58 * wk + 0.22 * rn, kn = 0.95 * wk + 1.0 * rn;
    const leg = (q) => [-amp * Math.sin(q), 0.04 + kn * Math.max(0, Math.cos(q)) ** 1.3 + 0.12 * rn, (-0.3 * Math.sin(q) + 0.28 * Math.max(0, Math.cos(q))) * wk];
    [T.ltx, T.lk, T.lf] = leg(p);
    [T.rtx, T.rk, T.rf] = leg(p + PI);
    // hips turn toward where he's going (walking sideways or backing up), chest toward where he's looking
    const ang = spd > 0.8 ? U.clamp(back ? -Math.atan2(left, -fwd) : Math.atan2(left, Math.max(fwd, 0.05)), -1.1, 1.1) : 0;
    this.hipA = U.damp(this.hipA, ang, 10, dt);
    T.hy = this.hipA + 0.14 * Math.sin(p) * wk;
    T.sy = -this.hipA * 0.85 - 0.18 * Math.sin(p) * wk;
    // a bouncy, waddly walk: up and down (with a squash) on every step, leaning into it the faster he goes
    const c2 = Math.cos(2 * p);
    X.by += (0.07 * wk + 0.05 * rn) * c2; T.by = -0.04 * rn;
    X.sq += (0.035 * wk + 0.02 * rn) * c2;
    X.bz += 0.07 * wk * Math.sin(p);
    T.sx = 0.05 + 0.08 * wk + 0.4 * rn - (back ? 0.14 * wk : 0); X.sx += 0.05 * wk * c2;
    // noodle arms swinging along (the forearms flop, see apply); sprinting, they flail all over the place
    const aa = 0.55 * wk + 0.75 * rn;
    T.lax = aa * Math.sin(p); T.rax = -aa * Math.sin(p);
    T.laz = T.raz = 0.12 + 0.12 * wk + 0.25 * rn;
    X.laz += 0.45 * rn * Math.sin(2 * p); X.raz += 0.45 * rn * Math.sin(2 * p + 1.3);
    T.le = T.re = -0.35 - 0.2 * wk - 0.6 * rn;
    // the head bobbles along like a pigeon's, a beat behind; running flat out: head back, mouth wide open
    T.nx = -T.sx * 0.7 - 0.25 * rn; X.nx += 0.13 * wk * Math.cos(2 * p - 1.1);
    X.nz += 0.08 * wk * Math.sin(p - 0.6);
    T.yell = 0.5 * rn;
    // standing about: breathing, slouching, looking around
    if (still > 0) {
      const b = Math.sin(t * 1.9);
      T.sx += still * (0.03 + 0.018 * b); T.by += still * 0.004 * b;
      T.lax += still * 0.04 * Math.sin(t * 1.3); T.rax += still * 0.04 * Math.sin(t * 1.3 + 1);
      T.ltz += still * 0.035; T.rtz += still * 0.035; T.lk += still * 0.03; T.rk += still * 0.03;
      T.ny += still * this.lookY; T.nx += still * (-0.03 + 0.03 * Math.sin(t * 0.8)); T.nz += still * 0.06 * Math.sin(t * 0.6);
    }
    // on ice with nothing to hold onto: legs all over the place, arms windmilling
    if (st.slide) {
      T.ltz += 0.3; T.rtz += 0.3; T.ltx = -0.25 * Math.sin(t * 5); T.rtx = 0.25 * Math.sin(t * 5); T.lk = T.rk = 0.2;
      T.lax = T.rax = 0; T.laz = T.raz = 0.7; X.lax -= (t * 11) % (PI * 2); X.rax -= (t * 11 + PI) % (PI * 2);
      X.bz += 0.14 * Math.sin(t * 6); T.sx -= 0.1; T.yell = 0.7; T.eye = 1.3;
    }
    // picking a friend up: bent right over to grab them (lifting with his legs), straightening up as they come
    // up, arms out in front holding them, straining (heave... heave...)
    if (st.revive) {
      const d = 1 - goobEase(U.clamp(st.reviveK || 0, 0, 1) * 1.2);
      goobSet(T, [['sx', 0.2 + 0.75 * d], ['ltx', -0.2 - 0.6 * d], ['rtx', 0.25 - 0.3 * d], ['lk', 0.3 + 0.9 * d], ['rk', 0.2 + 0.8 * d], ['lf', 0.2 * d], ['rf', 0.3 * d],
        ['lax', -1.35 + 0.25 * d], ['rax', -1.35 + 0.25 * d], ['laz', 0.12], ['raz', 0.12], ['le', -0.65 + 0.3 * d], ['re', -0.65 + 0.3 * d], ['nx', 0.1 + 0.3 * d]], 1);
      T.by -= 0.28 * d;
      X.sx -= 0.05 * Math.sin(t * 7); X.by += 0.01 * Math.sin(t * 7);
      T.yell = Math.max(T.yell, 0.35); T.squint = Math.max(T.squint, 0.6);
    }
  }

  airPose(T, X, st, vy, dt) {
    const t = this.t, s = this.jumpSide;
    if (st.glide) { // Glider Cape: flying like a superhero, one fist out front
      goobSet(T, [['bx', 1.3], ['rax', -2.95], ['re', 0], ['raz', 0.05], ['lax', 0.25], ['laz', 0.1], ['le', -0.1], ['ltx', 0.12], ['rtx', 0.1], ['lk', 0.12], ['rk', 0.25], ['lf', 0.75], ['rf', 0.75], ['nx', -1.05], ['eye', 1.15]], 1);
      X.bz += 0.07 * Math.sin(t * 3); X.rk += 0.1 * Math.sin(t * 5); T.yell = 0.25;
      return;
    }
    if (st.jet) { // Jet Pack: legs dangling and kicking, arms out, whooo
      T.ltx = 0.1 + 0.3 * Math.sin(t * 7); T.lk = 0.5 + 0.35 * Math.sin(t * 7 + 1);
      T.rtx = 0.1 + 0.3 * Math.sin(t * 7 + PI); T.rk = 0.5 + 0.35 * Math.sin(t * 7 + PI + 1);
      T.lf = T.rf = 0.6; T.laz = T.raz = 1.1; X.laz += 0.25 * Math.sin(t * 9); X.raz += 0.25 * Math.sin(t * 9 + 0.5);
      T.lax = T.rax = -0.3; T.le = T.re = -0.3; T.bx = 0.12; T.nx = -0.2; T.yell = 0.35; T.eye = 1.15;
      return;
    }
    if (st.stomp) { // Yeti Stompers: CANNONBALL
      goobSet(T, [['ltx', -2.1], ['rtx', -2.1], ['lk', 2.4], ['rk', 2.4], ['lax', -1.2], ['rax', -1.2], ['laz', -0.15], ['raz', -0.15], ['le', -1.3], ['re', -1.3], ['sx', 0.45], ['nx', 0.35], ['yell', 1], ['squint', 0.6]], 1);
      return;
    }
    if (st.launch) { // flung: spread out like a starfish (and tumbling, see update)
      goobSet(T, [['laz', 1.35], ['raz', 1.35], ['lax', -0.3], ['rax', -0.3], ['ltz', 0.45], ['rtz', 0.45], ['lk', 0.3], ['rk', 0.3], ['yell', 1], ['eye', 1.35]], 1);
      return;
    }
    const up = U.clamp(vy / 7, 0, 1), down = U.clamp(-vy / 8, 0, 1), fl = U.clamp((this.air - 0.6) * 2, 0, 1) * down;
    // going up: one knee tucked, arms flung up (wheee)
    const a = s > 0 ? 'l' : 'r', b = s > 0 ? 'r' : 'l';
    T[a + 'tx'] = -0.3 - 0.8 * up; T[a + 'k'] = 0.35 + 1.2 * up; T[b + 'tx'] = -0.1 - 0.25 * up; T[b + 'k'] = 0.25 + 0.5 * up;
    T.lf = T.rf = 0.25;
    T.lax = T.rax = -0.4 - 1.9 * up; T.laz = T.raz = 0.4 + 0.3 * down; T.le = T.re = -0.35;
    T.sx = 0.1 - 0.15 * up; T.yell = 0.45 * up; T.eye = 1 + 0.2 * up;
    // falling a while: flailing, windmilling, bicycling, screaming
    if (fl > 0) {
      for (const k of ['lax', 'rax', 'ltx', 'rtx', 'lk', 'rk']) T[k] *= 1 - fl;
      T.laz += (0.7 - T.laz) * fl; T.raz += (0.7 - T.raz) * fl;
      X.lax -= ((t * 13) % (PI * 2)) * fl; X.rax -= ((t * 13 + PI) % (PI * 2)) * fl;
      X.ltx += (-0.6 + 0.6 * Math.sin(t * 12)) * fl; X.lk += (0.9 + 0.7 * Math.sin(t * 12 + 1.5)) * fl;
      X.rtx += (-0.6 + 0.6 * Math.sin(t * 12 + PI)) * fl; X.rk += (0.9 + 0.7 * Math.sin(t * 12 + PI + 1.5)) * fl;
      T.yell = Math.max(T.yell, fl); T.eye += 0.35 * fl; T.sx -= 0.15 * fl;
    }
  }

  liePose(T, X, st) {
    const t = this.t;
    if (this.acts.some((a) => a.n === 'die' && a.t < 0.55)) { T.laz = T.raz = 1.25; T.eye = 1.4; T.yell = 1; return; } // (spinning round first)
    const lie = 1 - U.clamp(st.lift || 0, 0, 1);
    if (st.down) { // on his back like a flipped bug, arms and legs going (somebody pick him up!)
      T.ltx = -1.25 + 0.2 * Math.sin(t * 8); T.rtx = -1.25 + 0.2 * Math.sin(t * 8 + 2);
      T.lk = 1.1 + 0.35 * Math.sin(t * 9); T.rk = 1.1 + 0.35 * Math.sin(t * 9 + 2.2);
      T.lax = -1.6 + 0.3 * Math.sin(t * 7); T.rax = -1.6 + 0.3 * Math.sin(t * 7 + 1.5); T.le = T.re = -0.7; T.laz = T.raz = 0.3;
      const help = (t % 3.2) < 1.3 ? goobPulse(t % 3.2, 1.3) : 0; // (now and then an arm waves: HELP!)
      T.rax -= 1.0 * help; T.raz += 0.5 * help * (1 + Math.sin(t * 14));
      T.ny = 0.5 * Math.sin(t * 1.3); T.yell = 0.5 + 0.3 * Math.sin(t * 5); T.eye = 1.2;
    } else { // out cold: flat on his back, arms and legs flung out, X eyes, tongue out
      T.laz = 1.3; T.raz = 1.25; T.lax = -0.3; T.rax = -0.2; T.ltz = 0.3; T.rtz = 0.25; T.lf = 0.5; T.rf = 0.5; T.nz = 0.3; T.xe = 1; T.yell = 0.35;
      const tw = Math.max(0, Math.sin(t * 2.3)) ** 12; T.lk += 0.9 * tw; T.ltx -= 0.5 * tw; // (a twitch now and then)
    }
    for (const k of GOOB_KEYS) if (k !== 'sq' && k !== 'eye') T[k] *= lie;
    T.bx = -PI / 2 * lie; T.by = -0.88 * lie;
  }

  sitPose(T, X, st) {
    const t = this.t;
    goobSet(T, [['ltx', -1.45], ['rtx', -1.45], ['lk', 0.08], ['rk', 0.08], ['lf', -0.2], ['rf', -0.2], ['ltz', 0.06], ['rtz', 0.06], ['sx', -0.06]], 1);
    if (st.sit === 'pilot') goobSet(T, [['lax', -1.05], ['rax', -1.05], ['le', -0.55], ['re', -0.55], ['laz', -0.1], ['raz', -0.1]], 1);
    else { goobSet(T, [['lax', -0.5], ['rax', -0.5], ['le', -1.0], ['re', -1.0], ['laz', 0.05], ['raz', 0.05]], 1); X.re += 0.1 * Math.max(0, Math.sin(t * 13)); }
    T.ny = this.lookY * 0.8; T.nx = 0.07 * Math.sin(t * 2.6); T.nz = 0.05 * Math.sin(t * 1.3); // (bopping along to the music)
  }

  // whatever's in his hand: the gun comes up to shoot, the vac and drill take both hands
  toolPose(T, X, st, dt, spd) {
    const t = this.t, tool = st.tool, gun = tool === 'zap', use = !!st.use;
    this.fireT += dt;
    const run = U.clamp((spd - 6.2) / 3, 0, 1);
    const want = !tool || this.emo ? 0 : gun ? (this.fireT < 1.6 || use ? 1 : 0.55) * (1 - 0.8 * run) : tool === 'crit' || use ? 1 : 0.6 * (1 - 0.7 * run);
    this.aimW = U.damp(this.aimW, want, this.fireT < 0.1 ? 30 : 7, dt);
    const w = this.aimW;
    if (w < 0.01) return;
    const pitch = st.pitch || 0, lean = T.sx + T.bx;
    T.sy *= 1 - 0.7 * w; // (square up to what he's pointing at)
    if (gun) {
      goobSet(T, [['rax', -PI / 2 - pitch * 0.95 - lean], ['raz', 0.1], ['re', -0.12], ['ray', 0]], w);
      if (GOOB_TWO_HANDED.has(st.gun)) goobSet(T, [['lax', -1.25 - pitch * 0.9 - lean], ['laz', -0.55], ['le', -0.8]], w);
      else if (spd < 1.5) goobSet(T, [['lax', 0.35], ['laz', 0.6], ['le', -1.9]], w * (1 - U.clamp(spd, 0, 1))); // (the other hand on his hip)
      T.nx += (-pitch * 0.5 - T.nx * 0.5) * w;
      return;
    }
    if (tool === 'crit') { // carrying a critter: both forearms out under it, like a tray (see carryCritter)
      goobSet(T, [['rax', -0.25 - lean], ['re', -1.35], ['raz', -0.2], ['lax', -0.25 - lean], ['le', -1.35], ['laz', -0.2]], w);
      return;
    }
    if (use && tool === 'vac') { // hanging on while it sucks: leaning back, legs braced, shaking all over
      T.sx -= 0.35; goobSet(T, [['ltx', -0.45], ['lk', 0.35], ['rtx', 0.35], ['rk', 0.15]], w);
      X.bz += 0.035 * Math.sin(t * 47); X.sy += 0.05 * Math.sin(t * 39); X.by += 0.01 * Math.sin(t * 53); X.sx += 0.07 * Math.sin(t * 9);
      T.yell = Math.max(T.yell, 0.45); T.squint = Math.max(T.squint, 0.5);
    } else if (use && tool === 'drill') { // jackhammering: rattling from his boots to his eyeballs, teeth chattering
      T.sx += 0.25; T.lk += 0.4; T.rk += 0.4; T.ltx -= 0.25; T.rtx -= 0.25; T.by -= 0.06;
      X.by += 0.016 * Math.sin(t * 71); X.nx += 0.1 * Math.sin(t * 63); X.nz += 0.08 * Math.sin(t * 57); X.rax += 0.05 * Math.sin(t * 67);
      X.px += 0.3 * Math.sin(t * 49); X.py += 0.3 * Math.sin(t * 43); T.yell = Math.sin(t * 38) > 0 ? 0.5 : 0;
    }
    // held out in front in both hands, pointing about where he's looking (the peel up like a paddle)
    const aim = (tool === 'peel' ? -0.75 : -0.95) - pitch * 0.6 - T.sx - T.bx;
    goobSet(T, [['rax', aim], ['re', -0.4], ['raz', 0.05], ['lax', aim + 0.15], ['laz', -0.45], ['le', -0.95]], w);
  }

  face(T, X, st, dt) {
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blinkT = Math.random() < 0.2 ? 0.25 : U.rand(1.8, 4.5); this.blink = 0.14; } // (sometimes twice)
    this.blink -= dt;
    this.lookT -= dt;
    if (this.lookT <= 0) { this.lookT = U.rand(1.2, 3.5); this.lookY = Math.random() < 0.35 ? 0 : U.rand(-0.7, 0.7); this.lookP = U.rand(-0.2, 0.2); }
    T.px += this.lookY * 0.35; T.py += this.lookP;
  }

  apply(c, X, st, dt) {
    const m = this.m, g = (k) => c[k] + X[k];
    const sq = U.clamp(g('sq'), 0.4, 1.6), py = GOOB.belly * sq + g('by');
    m.pose.position.set(0, py, 0);
    m.pose.rotation.set(g('bx'), g('byaw'), g('bz'));
    m.pose.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    m.hips.rotation.y = g('hy');
    m.spine.rotation.set(g('sx'), g('sy'), g('sz'));
    m.legL.rotation.set(g('ltx'), 0, g('ltz')); m.legR.rotation.set(g('rtx'), 0, -g('rtz'));
    m.shinL.rotation.x = Math.max(-0.05, g('lk')); m.shinR.rotation.x = Math.max(-0.05, g('rk'));
    m.footL.rotation.x = g('lf'); m.footR.rotation.x = g('rf');
    const lax = g('lax'), rax = g('rax');
    m.armL.rotation.set(lax, g('lay'), g('laz')); m.armR.rotation.set(rax, -g('ray'), -g('raz'));
    // floppy forearms: they trail behind the arm's swing (and flop about when it stops)
    const wl = (lax - this.lastL) / Math.max(dt, 1e-3), wr = (rax - this.lastR) / Math.max(dt, 1e-3);
    this.wL = U.damp(this.wL, U.clamp(wl, -25, 25), 20, dt); this.wR = U.damp(this.wR, U.clamp(wr, -25, 25), 20, dt);
    this.lastL = lax; this.lastR = rax;
    m.foreL.rotation.x = Math.min(0.1, goobSpring(this.elL, g('le') - 0.075 * this.wL, 190, 9, dt));
    m.foreR.rotation.x = Math.min(0.1, goobSpring(this.elR, g('re') - 0.075 * this.wR, 190, 9, dt));
    // the head wobbles about inside the helmet (and bonks it)
    const vyp = (py - this.lastPy) / Math.max(dt, 1e-3), ay = (vyp - this.lastVy) / Math.max(dt, 1e-3);
    this.lastPy = py; this.lastVy = vyp;
    if (Math.abs(ay) < 400) { this.head.v += ay * 0.006; this.noseS.v += ay * 0.02; this.earS.v -= ay * 0.02; }
    m.head.rotation.set(U.clamp(goobSpring(this.head, g('nx'), 150, 8, dt), -0.7, 0.7), g('ny'), U.clamp(goobSpring(this.headZ, g('nz'), 150, 8, dt), -0.5, 0.5));
    // a droopy nose that bounces, and ears that flap
    m.nose.rotation.x = U.clamp(goobSpring(this.noseS, 0, 240, 5, dt), -0.5, 0.7);
    const ear = U.clamp(goobSpring(this.earS, 0.1 * U.clamp(Math.hypot(st.vx || 0, st.vz || 0) / 8, 0, 1) * Math.sin(this.t * 17), 200, 6, dt), -0.6, 0.6);
    m.ears[0].rotation.z = ear; m.ears[1].rotation.z = -ear;
    // the face: blinking, looking about, squinting, yelling, X eyes
    const xe = g('xe') > 0.5, open = this.blink > 0 ? 0.1 : U.clamp(1 - g('squint'), 0.12, 1), wide = U.clamp(g('eye'), 0.6, 1.5);
    m.xeyes.visible = xe;
    for (const e of m.eyes) { e.visible = !xe; e.scale.set(wide, wide * open, wide); }
    for (const p of m.pupils) p.rotation.set(-U.clamp(g('py'), -0.6, 0.6), U.clamp(g('px'), -0.7, 0.7), 0);
    const y = g('yell');
    m.yell.visible = y > 0.22; m.mouth.visible = !m.yell.visible;
    if (m.yell.visible) m.yell.scale.set(0.8 + 0.3 * y, 0.5 + 0.7 * y, 1);
    // the cape streams out while gliding
    m.cape.visible = !!st.glide;
    if (m.cape.visible) m.cape.rotation.x = 0.18 + 0.07 * Math.sin(this.t * 18);
  }
}

/* ----- going limp: the ragdoll -----
   Down (or knocked out cold), a goober goes limp and flops about. His body (his helmet, chest, belly and bum,
   as a few balls in one piece) gets thrown by whatever got him, tips over, bounces and rolls to a stop. His
   arms and legs are chains of two links hanging off it: they trail behind as he goes, fall wherever gravity
   takes them and lie on the ground (knees and elbows only bend the way they should, and his legs don't go up
   over his head). His head lolls about in his helmet. A friend picking him up jostles him about with every
   pump. GooberAnim runs it while he's lying there, and eases him back out of it when he gets up. */
// h: the time step · bounce: how much a hard landing bounces back · mu: how grippy the ground is · k2: how hard he
// is to spin (for his weight) · out: how long getting back up takes, out of it
const RAG = { h: 1 / 180, bounce: 0.3, mu: 0.7, k2: 0.1, out: 0.45 };
// the balls his body is made of: [x, y, z, radius], from his belly (game meters)
const RAG_HULL = [[0, 0.79, 0.03, 0.26], [0, 0.36, 0, 0.17], [0, 0, 0, 0.2], [0, -0.17, 0, 0.19]];
// his eyes (in his helmet), from his belly
const RAG_EYE = new V3(0, 0.8, 0.05);
// arms and legs (the left side: the right one is the mirror image): the joints it turns at, where the elbow /
// knee is and where the hand / ankle is (design meters, see buildAstronaut), how far the link from the body can
// point forward (-) and back (+) and out to the side (radians, from pointing straight down), how far the lower
// link bends, and how fat each end is
const RAG_LIMBS = [
  { j: 'arm', k: 'fore', e: 'hand', top: [0.14, 1.37, 0], mid: [0.23, 1.07, 0.01], end: [0.212, 0.77, 0.085], x: [-3.05, 1.3], out: [-0.3, 2.9], bend: [-2.6, 0.05], r: [0.06, 0.06] },
  { j: 'leg', k: 'shin', e: 'foot', top: [0.075, 0.92, 0], mid: [0.092, 0.48, 0.022], end: [0.092, 0.12, 0], x: [-2.1, 0.55], out: [-0.2, 1.1], bend: [-0.05, 2.5], r: [0.08, 0.09] },
];
const _rq = new THREE.Quaternion(), _rq2 = new THREE.Quaternion(), _rq3 = new THREE.Quaternion(), _rqId = new THREE.Quaternion();
const _rv = new V3(), _rv2 = new V3(), _rv3 = new V3(), _ra = new V3(), _rOne = new V3(1, 1, 1), _rX = new V3(1, 0, 0);
const ragWrap = (a) => a - Math.PI * 2 * Math.floor((a + Math.PI) / (Math.PI * 2));
// a direction from pointing straight down: [forward (-) / back (+), out to the side (+x)]
const ragAng = (d) => [Math.atan2(-d.z, -d.y), Math.asin(U.clamp(d.x, -1, 1))];

class GoobRagdoll {
  // m: the goober, as he is right now. v: how fast he was going when it got him (world)
  constructor(m, v) {
    this.m = m;
    m.root.updateMatrixWorld(true);
    this.c = m.pose.getWorldPosition(new V3()); // (his belly: the middle of his body)
    this.q = m.pose.getWorldQuaternion(new THREE.Quaternion());
    this.v = v ? v.clone() : new V3();
    // he tips over the way he was thrown (backwards if nothing threw him), with a bit of a twist
    let h = Math.hypot(this.v.x, this.v.z), dx, dz;
    if (h > 0.5) { dx = this.v.x / h; dz = this.v.z / h; } else {
      _rv.set(0, 0, -1).applyQuaternion(this.q);
      const l = Math.hypot(_rv.x, _rv.z) || 1;
      dx = _rv.x / l; dz = _rv.z / l;
      this.v.x += dx * 1.4; this.v.z += dz * 1.4; h = 1.4;
    }
    const spin = 2.4 + Math.min(h, 10) * 0.3;
    this.w = new V3(dz * spin + U.rand(-0.5, 0.5), U.rand(-1.6, 1.6), -dx * spin + U.rand(-0.5, 0.5));
    this.v.y = Math.max(this.v.y, 1.6); // (knocked off his feet)
    this.acc = 0; this.still = 0; this.asleep = false; this.hit = 0; this.liftK = 0; this.t = 0; this.k = 1; this.leaving = false;
    this.limbs = [];
    for (const d of RAG_LIMBS) {
      for (const s of [1, -1]) {
        const P = (a) => new V3(a[0] * s * GOOB.s, a[1] * GOOB.s - GOOB.belly, a[2] * GOOB.s);
        const side = s > 0 ? 'L' : 'R', top = P(d.top), r1 = P(d.mid).sub(top), r2 = P(d.end).sub(P(d.mid));
        const end = d.e === 'hand' ? (s > 0 ? m.handL : m.hand) : m['foot' + side];
        const L = {
          d, s, j: m[d.j + side], k: m[d.k + side], top, L1: r1.length(), L2: r2.length(), r1: r1.normalize(), r2: r2.normalize(),
          a2: Math.atan2(-r2.z, -r2.y), qj: new THREE.Quaternion(), qk: new THREE.Quaternion(),
          p1: m[d.k + side].getWorldPosition(new V3()), p2: end.getWorldPosition(new V3()),
        };
        // (moving along with his body to start with)
        L.o1 = L.p1.clone().addScaledVector(this.v, -RAG.h); L.o2 = L.p2.clone().addScaledVector(this.v, -RAG.h);
        this.limbs.push(L);
      }
    }
  }
  // a point on his body (from his belly), in the world
  at(p, out) { return out.copy(p).applyQuaternion(this.q).add(this.c); }
  // which way is down, for his body
  down(out) { return out.set(0, -1, 0).applyQuaternion(_rq.copy(this.q).invert()); }
  wake() { this.asleep = false; this.still = 0; }

  // st: world (what he's lying on), grav, lift (a friend picking him up, 0-1), from (where that friend is
  // standing, if we know), pin (keep his body over this spot: someone else's goober, whose own game says where
  // they are)
  update(dt, st) {
    this.hit = 0;
    // (a friend's grip: it tightens as they pick him up, and lets go at once)
    const lift = st.lift > 0 ? st.lift : 0;
    if (!lift && this.liftK > 0.08) { // (dropped: he topples over as he goes, any old way)
      const a = Math.random() * Math.PI * 2, k = 2 + 3 * this.liftK;
      this.w.set(Math.cos(a) * k, U.rand(-1, 1), Math.sin(a) * k); this.v.x += Math.sin(a) * 0.6; this.v.z -= Math.cos(a) * 0.6;
      this.liftK = 0;
    }
    this.liftK = U.damp(this.liftK || 0, lift, 6, dt);
    this.from = lift > 0 ? st.from || null : null;
    this.acc = Math.min(this.acc + Math.min(dt, 0.1), RAG.h * 12);
    while (this.acc >= RAG.h) { this.acc -= RAG.h; this.step(RAG.h, st.world, st.grav || 20, st.pin); }
  }
  // a friend picking him up: they grab him and haul him up off the ground, limp as ever (his arms and legs
  // dangle, his head lolls), onto his feet in front of them. L: how far along (0-1). If they let go he flops
  // back down.
  hoist(h, w, g, L) {
    const c = this.c, v = this.v, wv = this.w;
    this.asleep = false; this.still = 0;
    const hold = goobEase(Math.min(1, L * 4)), sit = goobEase(Math.min(1, L * 1.6)), rise = goobEase((L - 0.12) / 0.88);
    // up: his weight in their hands, and up to standing height (knees still a bit wobbly)
    const ty = w.ground(c.x, c.z, c.y) + 0.25 + (GOOB.belly - 0.45) * rise + 0.025 * Math.sin(this.t * 7) * sit * (1 - rise);
    v.y += (g + 70 * (ty - c.y) - 12 * v.y) * hold * h;
    // along: pulled over in front of whoever's got him (or just held where he is)
    if (this.from) {
      const dx = c.x - this.from.x, dz = c.z - this.from.z, d = Math.hypot(dx, dz) || 1;
      const tx = this.from.x + (dx / d) * 1.05, tz = this.from.z + (dz / d) * 1.05;
      v.x += (18 * (tx - c.x) - 8 * v.x) * hold * h; v.z += (18 * (tz - c.z) - 8 * v.z) * hold * h;
    } else { const k = Math.exp(-6 * hold * h); v.x *= k; v.z *= k; }
    // and turned: sitting up first, then upright, facing whoever's got him
    const u = _rv.set(0, 1, 0).applyQuaternion(this.q), ax = _rv2.set(-u.z, 0, u.x); // (u x up)
    const s = ax.length(), ang = Math.atan2(s, u.y);
    _rv3.set(0, 0, 0);
    if (s > 1e-4) _rv3.copy(ax).multiplyScalar((ang / s) * 7 * sit);
    if (this.from && rise > 0.3) { // (the way he faces: toward them)
      const f = _rv.set(0, 0, 1).applyQuaternion(this.q), want = Math.atan2(this.from.x - c.x, this.from.z - c.z);
      _rv3.y += U.angDiff(Math.atan2(f.x, f.z), want) * 4 * rise;
    }
    wv.lerp(_rv3, 1 - Math.exp(-12 * sit * h));
  }
  step(h, w, g, pin) {
    const c = this.c, v = this.v, wv = this.w;
    this.t = (this.t || 0) + h;
    if (this.liftK > 0.01) this.hoist(h, w, g, this.liftK);
    if (!this.asleep) {
      v.y -= g * h;
      // sideways, unless something's in the way: a wall, a rock, the edge of the island (or the deck)
      const gy = w.ground(c.x, c.z, c.y), nx = c.x + v.x * h, nz = c.z + v.z * h;
      if (w.blocked(nx, nz, gy) || w.ground(nx, nz, c.y) < gy - 1.2) { v.x *= -0.3; v.z *= -0.3; } else { c.x = nx; c.z = nz; }
      if (w.collide) {
        _rv.set(c.x, gy, c.z); w.collide(_rv, 0.3);
        if (_rv.x !== c.x || _rv.z !== c.z) { c.x = _rv.x; c.z = _rv.z; v.x *= 0.5; v.z *= 0.5; }
      }
      c.y += v.y * h;
      const a = wv.length();
      if (a > 1e-5) { _rq.setFromAxisAngle(_rv.copy(wv).divideScalar(a), a * h); this.q.premultiply(_rq).normalize(); }
      wv.multiplyScalar(Math.exp(-0.4 * h));
      this.contacts(h, w);
      const fl = w.ground(c.x, c.z, c.y); // (never through the floor)
      if (!(c.y > fl - 2)) { c.y = fl + 0.4; v.set(0, 0, 0); wv.set(0, 0, 0); }
    }
    if (pin) { // (not while you're the one holding him: you know where he is)
      const k = (1 - Math.exp(-8 * h)) * (this.from ? 1 - goobEase(Math.min(1, this.liftK * 4)) : 1);
      c.x += (pin.x - c.x) * k; c.z += (pin.z - c.z) * k;
    }
    this.limbStep(h, w, g);
  }
  // the balls of his body against the ground: they stop him going through it, bounce him (a bit, off a hard
  // landing), and grip it, so he tips and rolls over instead of just sliding
  contacts(h, w) {
    const c = this.c, v = this.v, wv = this.w;
    let deep = 0, touch = false;
    for (const b of RAG_HULL) {
      const s = this.at(_rv.set(b[0], b[1], b[2]), _rv);
      const pen = w.ground(s.x, s.z, s.y + 0.3) + b[3] - s.y;
      if (pen < -0.02) continue;
      touch = true;
      if (pen <= 0) continue;
      deep = Math.max(deep, pen);
      const r = _rv2.set(s.x - c.x, s.y - b[3] - c.y, s.z - c.z); // (from his middle to where it touches)
      const vc = _rv3.crossVectors(wv, r).add(v); // (how fast that spot is going)
      if (vc.y >= 0) continue;
      const e = -vc.y > 3 ? RAG.bounce : 0;
      if (-vc.y > this.hit) this.hit = -vc.y;
      const jn = (-(1 + e) * vc.y) / (1 + (r.x * r.x + r.z * r.z) / RAG.k2);
      let jx = 0, jz = 0;
      const tl = Math.hypot(vc.x, vc.z);
      if (tl > 1e-4) {
        const ux = vc.x / tl, uz = vc.z / tl, cx = r.y * uz, cy = r.z * ux - r.x * uz, cz = -r.y * ux;
        const jt = Math.min(tl / (1 + (cx * cx + cy * cy + cz * cz) / RAG.k2), RAG.mu * jn);
        jx = -ux * jt; jz = -uz * jt;
      }
      v.x += jx; v.y += jn; v.z += jz;
      wv.addScaledVector(_rv3.set(jx, jn, jz).cross(r).negate(), 1 / RAG.k2); // (r x J)
    }
    if (deep > 0) c.y += deep;
    if (touch) { const k = Math.exp(-2.5 * h); wv.multiplyScalar(k); v.x *= Math.exp(-1.2 * h); v.z *= Math.exp(-1.2 * h); }
    // lying still for a moment: he stays put (until something moves him)
    if (touch && v.lengthSq() < 0.04 && wv.lengthSq() < 0.09) { this.still += h; if (this.still > 0.7) { this.asleep = true; v.set(0, 0, 0); wv.set(0, 0, 0); } }
    else this.still = 0;
  }
  // arms and legs: each end carries on the way it was going and falls, then the links are put back to their
  // lengths (off his body, which doesn't give), out of the ground, and turned only as far as the joints go
  limbStep(h, w, g) {
    const qi = _rq3.copy(this.q).invert();
    for (const L of this.limbs) {
      const a = this.at(L.top, _ra), d = L.d;
      for (const [p, o] of [[L.p1, L.o1], [L.p2, L.o2]]) {
        const x = p.x, y = p.y, z = p.z;
        p.x += (p.x - o.x) * 0.992; p.y += (p.y - o.y) * 0.992 - g * h * h; p.z += (p.z - o.z) * 0.992;
        o.set(x, y, z);
      }
      for (let it = 0; it < 2; it++) {
        this.keep(a, L.p1, L.L1, 0, 1);
        this.keep(L.p1, L.p2, L.L2, 0.3, 0.7);
        this.floor(w, L.p1, L.o1, d.r[0]);
        this.floor(w, L.p2, L.o2, d.r[1]);
      }
      // the joint at his body: which way the link points (from his body's point of view), only as far as it goes
      const u = _rv.copy(L.p1).sub(a).applyQuaternion(qi).normalize();
      const [ax0, az0] = ragAng(u), ax = U.clamp(ragWrap(ax0), d.x[0], d.x[1]), az = U.clamp(az0 * L.s, d.out[0], d.out[1]) * L.s;
      if (ax !== ax0 || az !== az0) u.set(Math.sin(az), -Math.cos(az) * Math.cos(ax), -Math.cos(az) * Math.sin(ax));
      L.qj.setFromUnitVectors(L.r1, u);
      const qw = _rq2.copy(this.q).multiply(L.qj);
      L.p1.copy(u).applyQuaternion(this.q).multiplyScalar(L.L1).add(a);
      // the elbow / knee: a hinge
      const u2 = _rv.copy(L.p2).sub(L.p1).applyQuaternion(_rq.copy(qw).invert());
      const bend = U.clamp(ragWrap(Math.atan2(-u2.z, -u2.y) - L.a2), d.bend[0], d.bend[1]);
      L.qk.setFromAxisAngle(_rX, bend);
      L.p2.copy(L.r2).applyQuaternion(L.qk).applyQuaternion(qw).multiplyScalar(L.L2).add(L.p1);
    }
  }
  // a link back to its length: p moves by kp of the difference, q by kq
  keep(p, q, len, kp, kq) {
    const dx = q.x - p.x, dy = q.y - p.y, dz = q.z - p.z, l = Math.hypot(dx, dy, dz) || 1e-6, f = (l - len) / l;
    p.x += dx * f * kp; p.y += dy * f * kp; p.z += dz * f * kp;
    q.x -= dx * f * kq; q.y -= dy * f * kq; q.z -= dz * f * kq;
  }
  // an end out of the ground: it stops falling and drags along it
  floor(w, p, o, r) {
    const gy = w.ground(p.x, p.z, p.y + 0.3) + r;
    if (p.y >= gy) return;
    p.y = gy; o.y = gy;
    o.x += (p.x - o.x) * 0.25; o.z += (p.z - o.z) * 0.25;
  }
  // put him how he's lying (k: how much, 1: all the way, less while he gets up), over what GooberAnim posed
  put(k) {
    const m = this.m, rq = _rq.copy(m.root.quaternion).invert();
    m.pose.position.lerp(_rv.copy(this.c).sub(m.root.position).applyQuaternion(rq), k);
    m.pose.quaternion.slerp(_rq2.copy(rq).multiply(this.q), k);
    m.pose.scale.lerp(_rOne, k);
    m.spine.quaternion.slerp(_rqId, k); m.hips.quaternion.slerp(_rqId, k);
    for (const L of this.limbs) { L.j.quaternion.slerp(L.qj, k); L.k.quaternion.slerp(L.qk, k); }
  }
}

// the moves: each one bends the pose T (eased) and X (right now, on top) while it plays. a: the move (t: how far
// in, d: how long, k: how hard, v: which way), A: the GooberAnim
const GOOB_MOVES = {
  jump(T, X, a) { X.sq += 0.16 * (1 - a.t / a.d); },
  flip(T, X, a) { // Bounce Boots: a front flip, tucked up in a ball
    const u = a.t / a.d, w = Math.sin(PI * u);
    X.bx += PI * 2 * goobEase(u);
    goobSet(T, [['ltx', -1.7], ['rtx', -1.7], ['lk', 2.2], ['rk', 2.2], ['lax', -1.0], ['rax', -1.0], ['laz', -0.25], ['raz', -0.25], ['le', -1.5], ['re', -1.5], ['nx', 0.45]], w);
    T.yell = Math.max(T.yell, 0.7 * w);
  },
  land(T, X, a) { // squash (and a wobble after a big drop)
    const k = a.k, t = a.t, e = Math.exp(-t * 6);
    X.sq -= 0.3 * k * Math.cos(t * 17) * Math.exp(-t * 7);
    T.lk += 0.9 * k * e; T.rk += 0.9 * k * e; T.ltx -= 0.5 * k * e; T.rtx -= 0.5 * k * e; T.sx += 0.3 * k * e;
    T.laz += 0.6 * k * e; T.raz += 0.6 * k * e; X.by -= 0.08 * k * e;
    if (k > 0.95) { X.bz += 0.22 * Math.sin(t * 13) * Math.exp(-t * 4); T.eye += 0.3 * e; T.yell = Math.max(T.yell, 0.8 * e); }
  },
  dash(T, X, a) { // Getaway Sneakers: leaning way forward, arms straight out behind
    const w = goobHold(a.t, a.d, 0.05, 0.15);
    goobSet(T, [['lax', 1.35], ['rax', 1.35], ['laz', 0.2], ['raz', 0.2], ['le', 0], ['re', 0]], w);
    T.sx += 0.55 * w; T.nx -= 0.5 * w; X.sq -= 0.08 * w; X.by -= 0.08 * w; T.yell = Math.max(T.yell, 0.45 * w);
  },
  fire(T, X, a) { // recoil: the bigger the gun, the more it throws him about
    const k = a.k, u = a.t / a.d, e = Math.exp((-a.t * 11) / Math.sqrt(k));
    X.rax -= 0.55 * k * e; X.re -= 0.3 * k * e; X.sx -= 0.13 * k * e; X.nx -= 0.12 * k * e;
    if (k > 1.2) {
      X.bx -= 0.1 * k * e; X.by += 0.04 * k * Math.sin(PI * u); X.ltx -= 0.35 * k * e; X.lk += 0.45 * k * e; X.laz += 0.4 * k * e;
      T.yell = Math.max(T.yell, 0.7 * e); T.eye += 0.3 * e;
    }
    if (a.g === 'squirt') X.re += 0.35 * Math.sin(PI * u); // (a limp little flick of the wrist)
  },
  hurt(T, X, a) {
    const t = a.t, d = a.d, w = Math.exp(-t * 5) * (1 - Math.exp(-t * 40)), p = Math.sin((PI * t) / d);
    T.yell = Math.max(T.yell, w);
    if (a.v === 1) { // from behind: a hop, hands clutching his backside
      goobSet(T, [['lax', 0.9], ['rax', 0.9], ['laz', 0.35], ['raz', 0.35], ['le', -1.6], ['re', -1.6]], p);
      T.sx += 0.4 * p; X.by += 0.14 * p; T.eye += 0.5 * p;
    } else if (a.v === 2) { // spun right round
      X.byaw += PI * 2 * goobEase(t / d); T.laz += 1.1 * p; T.raz += 1.1 * p; T.eye += 0.4 * p;
    } else { // knocked back off his feet: arms flung up, a leg kicking, eyes screwed shut
      X.bx -= 0.3 * w; T.sx -= 0.5 * w; X.by += 0.13 * p;
      goobSet(T, [['lax', -2.3], ['rax', -2.3], ['laz', 1.0], ['raz', 1.0], ['le', -0.3], ['re', -0.3]], w);
      T.ltx -= 0.9 * w; T.lk += 1.1 * w; T.rk += 0.4 * w;
      T.squint = Math.max(T.squint, w);
    }
  },
  reload(T, X, a) { // fiddling with the battery, then a good smack
    const t = a.t, w = goobHold(t, a.d, 0.15, 0.2), s = goobPulse(t - a.d * 0.64, 0.18);
    goobSet(T, [['rax', -0.75], ['re', -1.5], ['raz', 0.15], ['lax', -0.95], ['laz', -0.55], ['le', -1.35]], w);
    X.rax += 0.1 * Math.sin(t * 31) * w; T.nx += 0.4 * w; T.py -= 0.4 * w;
    X.lax -= 0.45 * s; X.le += 0.4 * s;
  },
  throw(T, X, a, A) { // a Goo Grenade, overarm
    const u = a.t / a.d, w = Math.sin(PI * u);
    const arm = u < 0.35 ? U.lerp(0, 1.3, u / 0.35) : u < 0.6 ? U.lerp(1.3, -2.6, (u - 0.35) / 0.25) : U.lerp(-2.6, -0.8, (u - 0.6) / 0.4);
    goobSnap(A, X, 'lax', arm, w); goobSet(T, [['le', -0.6], ['laz', 0.25]], w);
    T.sy += (u < 0.45 ? 0.45 : -0.35) * w; T.ltx -= 0.35 * w; T.yell = Math.max(T.yell, u > 0.4 ? 0.6 * w : 0);
  },
  swing(T, X, a, A) { // the Pizza Peel, like he means it
    const u = a.t / a.d, w = Math.sin(PI * Math.min(1, u * 1.3));
    const arm = u < 0.3 ? U.lerp(-1.0, -2.9, u / 0.3) : U.lerp(-2.9, -0.4, Math.min(1, (u - 0.3) / 0.3));
    goobSnap(A, X, 'rax', arm, w); goobSnap(A, X, 'lax', arm + 0.2, w); goobSet(T, [['laz', -0.4]], w);
    T.sx += (u < 0.3 ? -0.2 : 0.35) * w; T.yell = Math.max(T.yell, 0.5 * w);
  },
  die(T, X, a) { // a spin, then down like a plank (see liePose)
    if (a.t < 0.55) X.byaw += PI * 3 * goobEase(a.t / 0.55);
  },
  up(T, X, a) { // back on his feet: ta-da!
    const w = goobPulse(a.t, a.d);
    X.by += 0.18 * w; goobSet(T, [['lax', -2.6], ['rax', -2.6], ['laz', 0.5], ['raz', 0.5], ['le', -0.3], ['re', -0.3]], w);
    T.yell = Math.max(T.yell, 0.5 * w); T.eye += 0.25 * w;
  },
  yay(T, X, a) { // a happy hop
    const w = goobPulse(a.t, a.d);
    X.by += 0.12 * goobPulse(a.t, 0.45); goobSet(T, [['lax', -2.4], ['rax', -2.4], ['laz', 0.6], ['raz', 0.6], ['le', -0.4], ['re', -0.4]], w);
    T.eye += 0.25 * w; T.yell = Math.max(T.yell, 0.3 * w);
  },
  // --- fidgets
  scratch(T, X, a) { // scratches his head. Well, the helmet.
    const w = goobHold(a.t, a.d, 0.35, 0.4);
    goobSet(T, [['rax', -2.65], ['raz', 0.45], ['re', -1.95]], w);
    X.re += 0.22 * Math.sin(a.t * 26) * w; T.nz += 0.22 * w; T.ny -= 0.2 * w; T.py += 0.3 * w; T.px -= 0.3 * w;
  },
  pick(T, X, a, A) { // goes to pick his nose. Clonk. The helmet's in the way.
    const t = a.t, w = goobHold(t, a.d, 0.5, 0.45), bonk = goobPulse(t - 0.62, 0.25);
    goobSet(T, [['rax', -1.55], ['raz', -0.4], ['re', -2.05]], w);
    X.rax += 0.3 * bonk; X.re += 0.2 * bonk;
    if (t > 0.62 && !a.hit) { a.hit = 1; A.head.v -= 6; A.noseS.v += 20; }
    if (t > 1.0) { T.nx += 0.3 * w; T.ny += 0.35 * w; T.px += 0.35 * w; T.py -= 0.35 * w; T.eye -= 0.25 * w; }
  },
  yawn(T, X, a) { // a big stretch
    const w = goobHold(a.t, a.d, 0.6, 0.6);
    goobSet(T, [['lax', -2.85], ['rax', -2.85], ['laz', 0.35], ['raz', 0.35], ['le', -0.35], ['re', -0.35]], w);
    T.sx -= 0.28 * w; T.nx -= 0.3 * w; T.yell = Math.max(T.yell, w); T.squint = Math.max(T.squint, 0.85 * w); X.by += 0.04 * w;
  },
  drum(T, X, a) { // bongos on his pot belly
    const w = goobHold(a.t, a.d, 0.3, 0.35);
    goobSet(T, [['lax', -0.55], ['rax', -0.55], ['laz', -0.3], ['raz', -0.3], ['le', -1.35], ['re', -1.35]], w);
    X.le += 0.4 * Math.max(0, Math.sin(a.t * 13)) * w; X.re += 0.4 * Math.max(0, Math.sin(a.t * 13 + PI)) * w;
    T.nx += 0.4 * w; T.py -= 0.4 * w; T.yell = Math.max(T.yell, 0.3 * w); X.by += 0.012 * Math.sin(a.t * 26) * w;
  },
  look(T, X, a) { // what was that?
    const w = goobHold(a.t, a.d, 0.15, 0.3), s = Math.sin(a.t * 5.5);
    T.ny += 0.9 * s * w; T.px += 0.5 * s * w; T.eye += 0.35 * w; T.nx -= 0.1 * w;
  },
  tap(T, X, a) { // arms folded, tapping his foot. Any time now.
    const w = goobHold(a.t, a.d, 0.35, 0.35);
    goobSet(T, [['lax', -0.95], ['rax', -0.95], ['laz', -0.7], ['raz', -0.7], ['le', -1.95], ['re', -1.95]], w);
    X.lf -= 0.45 * Math.abs(Math.sin(a.t * 8)) * w; T.nz += 0.18 * w; T.ny += 0.3 * w; T.eye -= 0.2 * w;
  },
  wobble(T, X, a) { // loses his balance for a moment
    const w = goobHold(a.t, a.d, 0.15, 0.4), t = a.t;
    X.bz += 0.2 * Math.sin(t * 7) * w; T.ltx -= 0.5 * w; T.lk += 0.7 * w;
    X.lax += 1.6 * Math.sin(t * 13) * w; X.rax += 1.6 * Math.sin(t * 13 + PI) * w; T.laz += 0.9 * w; T.raz += 0.9 * w;
    T.yell = Math.max(T.yell, 0.6 * w); T.eye += 0.3 * w;
  },
  // --- emotes
  wave(T, X, a) { // hiiii!
    const w = goobHold(a.t, a.d, 0.25, 0.35), t = a.t;
    goobSet(T, [['lax', -2.7], ['le', -0.5], ['rax', 0.3], ['raz', 0.55], ['re', -1.8]], w);
    goobMix(T, 'laz', 0.35 + 0.4 * Math.sin(t * 11), w); X.le += 0.35 * Math.sin(t * 11 + 1) * w;
    T.nz -= 0.2 * w; T.yell = Math.max(T.yell, 0.3 * w); X.by += 0.035 * Math.abs(Math.sin(t * 5.5)) * w; T.eye += 0.2 * w;
  },
  chicken(T, X, a) { // the chicken dance: flapping, pecking, knees going
    const w = goobHold(a.t, a.d, 0.25, 0.4), t = a.t, b = Math.sin(t * 12);
    goobSet(T, [['lax', -0.25], ['rax', -0.25], ['le', -2.2], ['re', -2.2]], w);
    goobMix(T, 'laz', 0.55, w); goobMix(T, 'raz', 0.55, w); X.laz += 0.5 * b * w; X.raz += 0.5 * b * w;
    X.nx += 0.3 * Math.sin(t * 9) * w; T.lk += 0.25 * w; T.rk += 0.25 * w;
    X.lk += 0.25 * Math.abs(Math.sin(t * 6)) * w; X.rk += 0.25 * Math.abs(Math.sin(t * 6)) * w; X.by -= 0.05 * Math.abs(Math.sin(t * 6)) * w;
    T.sx += 0.2 * w; T.yell = Math.max(T.yell, 0.35 * w);
  },
  floss(T, X, a) { // arms swinging stiff across the front and the back, hips going the other way
    const w = goobHold(a.t, a.d, 0.25, 0.35), t = a.t, s = Math.sin(t * 8), f = Math.cos(t * 8);
    goobSet(T, [['le', -0.05], ['re', -0.05], ['lax', 0], ['rax', 0], ['laz', 0.1], ['raz', 0.1]], w);
    X.laz += 0.55 * s * w; X.raz -= 0.55 * s * w; X.lax += 0.5 * f * w; X.rax -= 0.5 * f * w;
    X.bz -= 0.12 * s * w; X.hy += 0.3 * s * w; X.by += 0.03 * Math.abs(s) * w; T.lk += 0.15 * w; T.rk += 0.15 * w;
    T.yell = Math.max(T.yell, 0.3 * w); X.nx += 0.08 * Math.sin(t * 16) * w;
  },
  flex(T, X, a) { // shows off his muscles. What muscles? (they droop; he tries again)
    const w = goobHold(a.t, a.d, 0.3, 0.35), t = a.t, sag = goobEase((t - 1.1) / 0.7) * (1 - goobEase((t - 2.3) / 0.3));
    goobSet(T, [['lax', 0], ['rax', 0], ['laz', 1.45], ['raz', 1.45], ['lay', PI / 2 - PI * sag], ['ray', PI / 2 - PI * sag], ['le', -2.0], ['re', -2.0]], w);
    X.le += 0.1 * Math.sin(t * 31) * (1 - sag) * w; X.re += 0.1 * Math.sin(t * 29) * (1 - sag) * w;
    T.ny += 0.6 * sag * w; T.nx += 0.25 * sag * w; T.nz += 0.2 * sag * w; T.px += 0.5 * sag * w;
    T.sx -= 0.12 * w; T.yell = Math.max(T.yell, 0.4 * (1 - sag) * w); T.squint = Math.max(T.squint, 0.5 * (1 - sag) * w);
  },
  facepalm(T, X, a, A) { // CLONK. Then head in hand.
    const t = a.t, w = goobHold(t, a.d, 0.3, 0.45);
    goobSet(T, [['rax', -1.55], ['raz', -0.42], ['re', -2.1]], w);
    if (t > 0.42 && !a.hit) { a.hit = 1; A.head.v -= 9; A.headZ.v += 4; A.noseS.v += 20; }
    if (t > 0.42) T.squint = Math.max(T.squint, 0.9 * w);
    if (t > 0.8) { T.nx += 0.35 * w; X.ny += 0.25 * Math.sin((t - 0.8) * 7) * w; }
    T.sx += 0.15 * w;
  },
  faint(T, X, a) { // the back of his hand to his brow... and over he goes, flat as a board. Then he pops back up.
    const t = a.t, w = goobHold(t, a.d, 0.3, 0.3), fall = goobEase((t - 0.9) / 0.3) * (1 - goobEase((t - 2.8) / 0.3)), stand = 1 - fall;
    goobSet(T, [['lax', -2.45], ['laz', 0.25], ['le', -2.2]], w * stand);
    X.bz += 0.12 * Math.sin(t * 4) * stand * w; T.nx -= 0.35 * w * stand; T.eye -= 0.45 * w * stand;
    X.bx -= (PI / 2) * fall * w; X.by -= 0.88 * fall * w; T.laz += 1.2 * fall; T.raz += 1.2 * fall; T.ltz += 0.3 * fall;
    if (fall > 0.6) { T.xe = 1; T.yell = Math.max(T.yell, 0.35); X.lk += 0.4 * Math.max(0, Math.sin(t * 17)) ** 4; }
    const up = goobPulse(t - 2.95, 0.55);
    X.by += 0.22 * up; goobSet(T, [['lax', -2.6], ['rax', -2.6], ['laz', 0.5], ['raz', 0.5]], up);
  },
};
