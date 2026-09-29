'use strict';
/* =========================================================
   Low-poly model builders. Everything faces +Z.
   ========================================================= */
const PI = Math.PI;

/* ---------------- people ---------------- */
// your suit's accent color (belt, collar, gloves, backpack; the gloves you see in first person)
const ACCENT_COLORS = ['#ff7a3d', '#ff4b6e', '#3aa7ff', '#3fcf6a', '#ffd23f', '#9b5de5', '#2ad4c4', '#ff8ad8',
  '#e5383b', '#1f5fd6', '#8bd33a', '#ff9f1c', '#b3b9c4', '#2b2f38', '#ffffff', '#8a5a34'];
// everything else you can change about your astronaut (see Custom). Each part is picked by its
// place in its list, and a whole look travels as a short code: one character per part, in this order
const LOOK_PARTS = [
  { k: 'body', label: 'Suit', tab: 'suit', colors: ['#f4f1ea', '#c9ced6', '#3b3f4a', '#1f2229', '#26335c', '#f3e2c0', '#6b7a3a', '#6e2233', '#bfe3ff', '#c8f5d8', '#ddd0ff', '#ffd0e6'] },
  { k: 'pattern', label: 'Pattern', tab: 'suit', opts: ['Plain', 'Stripes', 'Racing stripe', 'Two-tone', 'Half and half', 'Shoulder pads', 'Spots'] },
  { k: 'badge', label: 'Chest badge', tab: 'suit', opts: ['Buttons', 'Star', 'Heart', 'Lightning', 'Pizza', 'Moon', 'None'] },
  { k: 'pack', label: 'Backpack', tab: 'suit', opts: ['Air tanks', 'Jet pack', 'Pizza box', 'Rocket', 'None'] },
  { k: 'visor', label: 'Helmet glass', tab: 'face', colors: ['#bfe8ff', '#5ab4ff', '#ffc23a', '#ff8ad8', '#6dff9a', '#4a5060'] },
  { k: 'skin', label: 'Skin', tab: 'face', colors: ['#f2c9a0', '#ffe0c4', '#e0ac7e', '#c68652', '#8d5a3b', '#5c3a26', '#9be07a', '#8fb8ff', '#c7a4ff'] },
  { k: 'hair', label: 'Hair', tab: 'face', opts: ['None', 'Tuft', 'Bowl cut', 'Spiky', 'Bun', 'Mohawk', 'Curly', 'Long'] },
  { k: 'hairCol', label: 'Hair color', tab: 'face', colors: ['#2b1d14', '#6b3e1f', '#c9772f', '#f0d27a', '#d9482b', '#e9e4dc', '#ff5ab4', '#3aa7ff', '#3fcf6a', '#9b5de5'] },
  { k: 'eyes', label: 'Eyes', tab: 'face', opts: ['Round', 'Happy', 'Sleepy', 'Angry', 'Big', 'Dots', 'Cyclops'] },
  { k: 'mouth', label: 'Mouth', tab: 'face', opts: ['Smile', 'Grin', 'Flat', 'Surprised', 'Tongue', 'Fangs', 'Smirk'] },
  { k: 'extra', label: 'Extra', tab: 'face', opts: ['None', 'Mustache', 'Beard', 'Freckles', 'Blush', 'Glasses', 'Clown nose'] },
];
// a look code (or a look, or nothing) -> { body: 0, pattern: 2, ... } (anything unknown: the first choice)
function lookFrom(code) {
  if (code && typeof code === 'object') code = lookCode(code);
  const l = {}, s = typeof code === 'string' ? code : '';
  LOOK_PARTS.forEach((p, i) => {
    const n = parseInt(s[i] || '0', 36);
    l[p.k] = n >= 0 && n < (p.colors || p.opts).length ? n : 0;
  });
  return l;
}
const lookCode = (l) => LOOK_PARTS.map((p) => ((l && l[p.k]) | 0).toString(36)).join('');
// one of a look's colors ('body', 'skin', 'visor', 'hairCol')
const lookColor = (code, k) => { const p = LOOK_PARTS.find((q) => q.k === k); return p.colors[lookFrom(code)[k]]; };

// the people you meet have a rounded barrel of a body (a lathe of this outline, squashed front to back)
const TORSO = [[0, 0], [0.17, 0], [0.262, 0.028], [0.316, 0.095], [0.338, 0.21], [0.343, 0.37], [0.336, 0.51], [0.312, 0.615], [0.265, 0.695], [0.195, 0.752], [0.1, 0.782], [0, 0.79]];
const TORSO_Z = 0.68;
const _Z1 = new V3(0, 0, 1);
// a smooth ball with a sensible number of sides for its size
const smoothBall = (r) => { const n = U.clamp(Math.round(8 + r * 50), 8, 22); return smoothGeo(new THREE.SphereGeometry(r, n, Math.round(n * 0.7))); };
// a capsule standing on y (a rod of length len with round ends), as one smooth shape
function capsuleGeo(r, len, sides) {
  const pts = [], k = 4, n = sides || U.clamp(Math.round(8 + r * 60), 8, 20);
  for (let i = 0; i <= k; i++) { const a = -PI / 2 + (i / k) * (PI / 2); pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * r), -len / 2 + Math.sin(a) * r)); }
  for (let i = 0; i <= k; i++) { const a = (i / k) * (PI / 2); pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * r), len / 2 + Math.sin(a) * r)); }
  return smoothGeo(new THREE.LatheGeometry(pts, n));
}
// a rounded rod from a to b inside `parent` (arms, legs, eyebrows)
function limb(parent, a, b, r, color) {
  const d = b.clone().sub(a), len = d.length() || 0.001;
  const m = mk(capsuleGeo(r, len), color, parent, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.divideScalar(len));
  return m;
}
// a flat shape pushed out into a chunky, rounded-edged badge
const badgeGeo = (shape, depth = 0.018) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.007, bevelSegments: 2, curveSegments: 12 });
function starShape(r1, r2) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * PI * 2, r = i % 2 ? r2 : r1; s[i ? 'lineTo' : 'moveTo'](Math.sin(a) * r, Math.cos(a) * r); }
  return s;
}

/* ---------------- the goober: you and your crew ---------------- */
// A tall, lanky, goofy astronaut: a pot belly, long dangly arms and legs, big boots, and a long egg of a
// head (big ears, googly eyes, a droopy nose, a lopsided mouth) that wobbles about inside a glass bubble
// on the suit. It's built in the design's meters (feet at 0, facing +Z) inside `body`, which scales it
// up to the game's size, and every joint is a pivot GooberAnim turns (see goober.js): the waist, the
// hips, knees and ankles, the shoulders and elbows, the neck, and the bits of the face.
const GOOB = {
  s: 1.2, // design meters -> game meters (2.26 m to the top of the helmet, about what it always was)
  belly: 1.2, // (game meters: where the whole goober turns when it flips, leans or falls over)
  torso: [[0.001, 0.8], [0.09, 0.805], [0.14, 0.845], [0.172, 0.92], [0.188, 1.0], [0.18, 1.08], [0.155, 1.17], [0.14, 1.26], [0.135, 1.34], [0.12, 1.4], [0.085, 1.44], [0.04, 1.465], [0.001, 1.47]],
  tz: 0.82, // (the torso is this deep, front to back, for its width)
  head: [[0.001, -0.19], [0.045, -0.185], [0.036, -0.13], [0.04, -0.1], [0.062, -0.08], [0.08, -0.045], [0.088, 0], [0.09, 0.05], [0.083, 0.1], [0.066, 0.14], [0.038, 0.165], [0.001, 0.175]],
  hz: 1.05,
  waist: 0.86, hip: 0.92, neck: 1.47, headY: 1.63, top: 0.175, // (top: of the head, above its middle)
  glass: [0, 1.66, 0.027], glassR: 0.22,
  dark: '#353945', ink: '#15151c', white: '#f4f1ea',
};
// the radius of a lathe outline ([r, y] pairs going up) at height y
function profR(prof, y) {
  if (y <= prof[0][1]) return prof[0][0];
  for (let i = 1; i < prof.length; i++) {
    const [r0, y0] = prof[i - 1], [r1, y1] = prof[i];
    if (y <= y1) return y1 > y0 ? r0 + ((r1 - r0) * (y - y0)) / (y1 - y0) : r1;
  }
  return prof[prof.length - 1][0];
}
// a point on a lathe outline's surface at angle phi (0: straight ahead) and height y, pushed out by `out`,
// and which way the surface faces there (zs: how deep the shape is for its width)
function profAt(prof, zs, phi, y, out = 0) {
  const r = profR(prof, y) + out, dr = (profR(prof, y + 0.004) - profR(prof, y - 0.004)) / 0.008;
  return { p: new V3(Math.sin(phi) * r, y, Math.cos(phi) * r * zs), n: new V3(zs * Math.sin(phi), -zs * dr, Math.cos(phi)).normalize() };
}
// the outline turned into one smooth shape (squashed front to back by zs); phi0 / len: only part of the way round
function latheGeo(prof, zs, n = 40, phi0 = 0, len = PI * 2) {
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), n, phi0, len);
  g.scale(1, 1, zs);
  return smoothGeo(g);
}
// a patch of that surface from height y0 to y1, standing out by `out` (the chest panel, the belt, stripes)
function shellGeo(prof, zs, y0, y1, out, phi0 = 0, len = PI * 2) {
  const pr = [[Math.max(0.001, profR(prof, y0) - 0.004), y0]], rows = Math.max(3, Math.round((y1 - y0) / 0.02));
  for (let i = 0; i <= rows; i++) { const y = y0 + ((y1 - y0) * i) / rows; pr.push([profR(prof, y) + out, y]); }
  pr.push([Math.max(0.001, profR(prof, y1) - 0.004), y1]);
  return latheGeo(pr, zs, Math.max(8, Math.round((40 * len) / (PI * 2))), phi0, len);
}
// a patch of the head's skin between two edges that change with the angle round it (hair, a beard): from
// phi0 round to phi1, between the heights lo(phi) and hi(phi), standing out by `out`. An edge at the top of
// the head closes it off; any other edge tucks into the head, so there's never a gap to see through.
function headPatchGeo(phi0, phi1, lo, hi, out, W = 26, H = 7) {
  const pos = [], idx = [], P = GOOB.head, zs = GOOB.hz, wrap = phi1 - phi0 > PI * 1.99;
  for (let j = 0; j <= H; j++) {
    for (let i = 0; i <= W; i++) {
      const phi = phi0 + ((phi1 - phi0) * i) / W, a = lo(phi), b = hi(phi);
      const y = a + (b - a) * Math.sin(((j / H) * PI) / 2); // (rows bunch up toward the top, where it curves)
      let r = profR(P, y) + out, yy = y;
      if (j === H && b >= GOOB.top - 0.002) { r = 0; yy = y + out; } else if (j === 0 || j === H) r = profR(P, y) - 0.003;
      pos.push(Math.sin(phi) * r, yy, Math.cos(phi) * r * zs);
    }
  }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const a = j * (W + 1) + i, b = a + W + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (wrap) { // (all the way round: no seam in the shading where the two ends meet)
    const n = g.attributes.normal, v = new V3();
    for (let j = 0; j <= H; j++) {
      const a = j * (W + 1), b = a + W;
      v.set(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
      n.setXYZ(a, v.x, v.y, v.z); n.setXYZ(b, v.x, v.y, v.z);
    }
  }
  return smoothGeo(g);
}
// a smooth tapered tube along a curve through pts (a thigh, a forearm, a smile): radius r0 -> r1, a little
// fatter in the middle (bulge)
function tubeGeo(pts, r0, r1, bulge = 0.1, T = 14, RS = 12) {
  const curve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(curve, T, 1, RS, false);
  const p = g.attributes.position, c = new V3();
  for (let i = 0; i <= T; i++) {
    curve.getPointAt(i / T, c);
    const t = i / T, r = r0 + (r1 - r0) * t + Math.sin(t * PI) * (r0 - r1) * bulge;
    for (let j = 0; j <= RS; j++) { const k = i * (RS + 1) + j; p.setXYZ(k, c.x + (p.getX(k) - c.x) * r, c.y + (p.getY(k) - c.y) * r, c.z + (p.getZ(k) - c.z) * r); }
  }
  return smoothGeo(g);
}
// a pivot at (x, y, z) in parent's space, with a group inside it laid out in the parent's space again (so
// every part keeps the design's coordinates): [pivot, inside]
function joint(parent, x, y, z) { const j = grp(parent, x, y, z); return [j, grp(j, -x, -y, -z)]; }

// o: color (your accent), look (a look code, see LOOK_PARTS), hat. Hands back every part GooberAnim moves.
function buildAstronaut(o = {}) {
  const L = lookFrom(o.look), C = (k) => lookColor(L, k);
  const acc = o.color || '#ff7a3d', suit = C('body'), skin = C('skin'), hc = C('hairCol'), dark = GOOB.dark, ink = GOOB.ink;
  const sc = new THREE.Color(skin), lips = '#' + new THREE.Color(sc.r * 0.89, sc.g * 0.79, sc.b * 0.8).getHexString();
  // (a mouth drawn as a line needs to stand out more: darker than the skin, or lighter on very dark skin)
  const line = sc.r * 0.3 + sc.g * 0.59 + sc.b * 0.11 > 0.3 ? '#' + new THREE.Color(sc.r * 0.52, sc.g * 0.3, sc.b * 0.28).getHexString() : '#e89a86';
  const r = withHi(null, () => {
    const root = new THREE.Group(), pose = grp(root, 0, GOOB.belly, 0), body = grp(pose, 0, -GOOB.belly, 0);
    body.scale.setScalar(GOOB.s);
    const ball = (rad, color, parent, x = 0, y = 0, z = 0) => mk(smoothBall(rad), color, parent, x, y, z);
    // --- legs (hip, knee, ankle), on hips that turn to walk sideways. [left (+x), right (-x)]
    const [hips, hin] = joint(body, 0, GOOB.hip, 0);
    const legs = [], shins = [], feet = [];
    for (const s of [1, -1]) {
      const c = L.pattern === 4 && s > 0 ? acc : suit; // (half and half: that side's leg too)
      const H = new V3(s * 0.075, 0.92, 0), K = new V3(s * 0.092, 0.48, 0.022), A = new V3(s * 0.092, 0.12, 0);
      const [leg, lin] = joint(hin, H.x, H.y, H.z);
      mk(tubeGeo([H, new V3(s * 0.088, 0.7, 0.01), K], 0.075, 0.063), c, lin);
      ball(0.063, c, lin, K.x, K.y, K.z);
      const [shin, sin] = joint(lin, K.x, K.y, K.z);
      mk(tubeGeo([K, new V3(s * 0.092, 0.28, 0.005), A], 0.063, 0.044), c, sin);
      ball(0.044, c, sin, A.x, A.y, A.z);
      ball(0.056, c, sin, s * 0.092, 0.48, 0.03); // (the knee)
      const [foot, fin] = joint(sin, A.x, A.y, A.z);
      tf(mk(capsuleGeo(0.07, 0.22, 18), dark, fin, s * 0.1, 0.064, 0.085), PI / 2, 0, -s * 0.12, 1.1, 1, 0.9); // a big boot, toes out
      tf(mk(TOR(0.047, 0.012, 10, 28), acc, fin, s * 0.092, 0.112, 0), PI / 2);
      legs.push(leg); shins.push(shin); feet.push(foot);
    }
    // --- the upper body, bending at the waist: a pot belly and narrow, sloping shoulders
    const [spine, up] = joint(body, 0, GOOB.waist, 0);
    const T = GOOB.torso, tz = GOOB.tz, on = (phi, y, out) => profAt(T, tz, phi, y, out);
    mk(latheGeo(T, tz, 40), suit, up);
    mk(shellGeo(T, tz, 1.12, 1.32, 0.008, -0.85, 1.7), acc, up); // the chest panel
    mk(shellGeo(T, tz, 0.88, 0.93, 0.009), acc, up); // the belt
    tf(mk(TOR(0.105, 0.022, 12, 40), acc, up, 0, 1.465, 0.01), PI / 2, 0, 0, 1, 1, 0.85); // the collar the helmet sits on
    switch (L.pattern) { // (between the suit and the panel)
      case 1: for (const y of [0.965, 1.035]) mk(shellGeo(T, tz, y, y + 0.035, 0.005), acc, up); break;
      case 2: for (const f of [0, PI]) mk(shellGeo(T, tz, 0.93, 1.45, 0.005, f - 0.11, 0.22), acc, up); break;
      case 3: mk(shellGeo(T, tz, 1.3, 1.47, 0.005), acc, up); break;
      case 4: mk(shellGeo(T, tz, 0.8, 1.47, 0.005, 0, PI), acc, up); break;
      case 6:
        for (const [phi, y] of [[-1.15, 1.25], [1.1, 1.18], [-0.35, 0.97], [0.5, 1.03], [1.45, 0.95], [-1.5, 1.08], [2.1, 1.3], [-2.2, 1.15], [2.6, 1.0], [-2.7, 1.33], [3.1, 1.16], [1.9, 1.07], [-1.9, 0.94], [0.25, 1.39], [-0.6, 1.4]]) {
          const a = on(phi, y, -0.003), d = tf(ball(0.021, acc, up), 0, 0, 0, 1, 1, 0.3);
          d.position.copy(a.p); d.quaternion.setFromUnitVectors(_Z1, a.n);
        }
        break;
    }
    // the badge on the chest panel (the old badges, shrunk to fit: every one but the buttons sits on a round
    // patch so it stands out whatever the colors)
    const bp = on(0, 1.22, 0.009), badge = grp(up);
    badge.position.copy(bp.p); badge.quaternion.setFromUnitVectors(_Z1, bp.n); badge.scale.setScalar(0.42);
    if (L.badge > 0 && L.badge < 6) {
      tf(mk(smoothGeo(new THREE.CylinderGeometry(0.125, 0.125, 0.04, 28)), '#1d2540', badge, 0, 0, -0.012), PI / 2);
      mk(TOR(0.125, 0.013, 8, 32), GOOB.white, badge, 0, 0, 0.008);
    }
    switch (L.badge) {
      case 0:
        mk(roundBox(0.3, 0.2, 0.05, 0.03), '#3b3f4a', badge, 0, 0, 0);
        ['#ff4b3e', '#3fcf6a', '#ffd23f'].forEach((c, i) => tf(ball(0.03, c, badge, -0.08 + i * 0.08, 0.01, 0.024), 0, 0, 0, 1, 1, 0.6));
        break;
      case 1: mk(badgeGeo(starShape(0.1, 0.045)), '#ffd23f', badge, 0, 0, 0); break;
      case 2: {
        const h = new THREE.Shape();
        h.moveTo(0, -0.085);
        h.bezierCurveTo(-0.05, -0.04, -0.1, -0.005, -0.1, 0.035);
        h.bezierCurveTo(-0.1, 0.075, -0.07, 0.095, -0.047, 0.095);
        h.bezierCurveTo(-0.022, 0.095, -0.006, 0.08, 0, 0.06);
        h.bezierCurveTo(0.006, 0.08, 0.022, 0.095, 0.047, 0.095);
        h.bezierCurveTo(0.07, 0.095, 0.1, 0.075, 0.1, 0.035);
        h.bezierCurveTo(0.1, -0.005, 0.05, -0.04, 0, -0.085);
        mk(badgeGeo(h), '#ff3d6e', badge, 0, 0, 0);
        break;
      }
      case 3: {
        const b = new THREE.Shape();
        [[0.035, 0.1], [-0.055, -0.005], [-0.005, -0.005], [-0.035, -0.1], [0.06, 0.02], [0.01, 0.02], [0.045, 0.1]].forEach(([x, y], i) => b[i ? 'lineTo' : 'moveTo'](x, y));
        mk(badgeGeo(b), '#ffd23f', badge, 0, 0, 0);
        break;
      }
      case 4: {
        const sl = new THREE.Shape();
        sl.moveTo(-0.085, 0.06); sl.lineTo(0.085, 0.06); sl.lineTo(0, -0.1); sl.lineTo(-0.085, 0.06);
        mk(badgeGeo(sl), '#ffc94a', badge, 0, 0, 0);
        limb(badge, new V3(-0.088, 0.068, 0.012), new V3(0.088, 0.068, 0.012), 0.022, '#d9933d');
        for (const [x, y] of [[-0.03, 0.025], [0.03, 0.02], [0, -0.035]]) tf(ball(0.02, '#d63a2a', badge, x, y, 0.026), 0, 0, 0, 1, 1, 0.35);
        break;
      }
      case 5: {
        // a crescent: the edge of one circle, then back along a smaller circle bitten out of it
        const R = 0.09, R2 = 0.078, d = 0.046, ix = (R * R - R2 * R2 + d * d) / (2 * d), iy = Math.sqrt(R * R - ix * ix);
        const m = new THREE.Shape(), a0 = Math.atan2(iy, ix), b0 = Math.atan2(iy, ix - d);
        m.absarc(0, 0, R, a0, PI * 2 - a0, false);
        m.absarc(d, 0, R2, PI * 2 - b0, b0, true);
        mk(badgeGeo(m), '#fff1b0', badge, 0, 0, 0);
        break;
      }
    }
    // the backpack (the design's own is a flat rounded pack; the rest are the old ones, shrunk to fit)
    const pk = grp(up, 0, 1.2, -0.15);
    if (L.pack === 0) {
      tf(mk(capsuleGeo(0.1, 0.16, 20), dark, pk), 0, 0, 0, 1.05, 1, 0.55);
      for (const s of [-1, 1]) {
        mk(capsuleGeo(0.032, 0.15, 14), '#c9ced6', pk, s * 0.1, -0.005, -0.035);
        mk(smoothGeo(new THREE.CylinderGeometry(0.013, 0.013, 0.03, 10)), acc, pk, s * 0.1, 0.1, -0.035);
      }
    } else if (L.pack < 4) {
      const g = grp(pk, 0, 0, -0.01);
      g.scale.setScalar(0.5);
      if (L.pack === 1) {
        mk(roundBox(0.5, 0.52, 0.2, 0.075, 2), '#5a606c', g, 0, 0.02, 0);
        mk(roundBox(0.52, 0.08, 0.21, 0.035, 2), acc, g, 0, 0.14, 0);
        for (const s of [-1, 1]) {
          mk(smoothGeo(new THREE.CylinderGeometry(0.09, 0.1, 0.4, 20)), '#c9ced6', g, s * 0.16, -0.12, -0.15);
          ball(0.09, '#c9ced6', g, s * 0.16, 0.08, -0.15);
          mk(smoothGeo(new THREE.CylinderGeometry(0.08, 0.11, 0.1, 20)), '#2a2d36', g, s * 0.16, -0.36, -0.15);
          tf(mk(TOR(0.095, 0.014, 8, 24), '#ff9a3d', g, s * 0.16, -0.41, -0.15, { emissive: '#aa4400' }), PI / 2);
        }
      } else if (L.pack === 2) {
        const box = grp(g, 0, -0.02, -0.02);
        mk(roundBox(0.6, 0.6, 0.12, 0.025, 2), '#e3b26a', box, 0, 0, 0);
        mk(roundBox(0.61, 0.03, 0.125, 0.012, 2), '#c99a55', box, 0, 0.22, 0);
        tf(mk(smoothGeo(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 28)), '#d63a2a', box, 0, -0.02, -0.062), PI / 2);
        tf(mk(smoothGeo(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 24)), '#fff3dc', box, 0, -0.02, -0.07), PI / 2);
      } else {
        const rk = grp(g, 0, -0.02, -0.13);
        mk(roundBox(0.3, 0.3, 0.16, 0.06, 2), '#5a606c', g, 0, -0.02, 0.01);
        mk(smoothGeo(new THREE.CylinderGeometry(0.13, 0.13, 0.46, 24)), '#f4f1ea', rk, 0, 0, 0);
        mk(smoothGeo(new THREE.CylinderGeometry(0.133, 0.133, 0.07, 24)), acc, rk, 0, 0.1, 0);
        mk(smoothGeo(new THREE.ConeGeometry(0.13, 0.26, 24)), acc, rk, 0, 0.36, 0);
        mk(smoothGeo(new THREE.CylinderGeometry(0.07, 0.11, 0.09, 20)), '#2a2d36', rk, 0, -0.27, 0);
        tf(ball(0.045, '#7fd8ff', rk, 0, 0.04, -0.12), 0, 0, 0, 1, 1, 0.5);
        for (let i = 0; i < 3; i++) {
          const a = PI + (i - 1) * 2.1, f = grp(rk, Math.sin(a) * 0.13, -0.16, Math.cos(a) * 0.13);
          f.rotation.y = a;
          mk(roundBox(0.024, 0.18, 0.12, 0.01, 2), acc, f, 0, 0, 0.04);
        }
      }
    }
    // a cape (only out while gliding; in game meters, like the old one)
    const cape = grp(up, 0, 1.43, -0.13);
    cape.scale.setScalar(1 / GOOB.s);
    mk(roundBox(0.5, 0.95, 0.04, 0.02), '#b8142e', cape, 0, -0.475, 0);
    mk(roundBox(0.52, 0.06, 0.06, 0.025), '#ffd23f', cape, 0, 0, 0);
    cape.visible = false;
    // --- arms (shoulder, elbow): long and dangly, mittens at the end
    const arms = [], fores = [], hands = [];
    for (const s of [1, -1]) {
      const c = (L.pattern === 4 && s > 0) || L.pattern === 3 ? acc : suit; // (two-tone: both sleeves; half and half: one)
      const P0 = new V3(s * 0.09, 1.4, 0), E = new V3(s * 0.23, 1.07, 0.01), W = new V3(s * 0.215, 0.82, 0.075);
      const [arm, ain] = joint(up, s * 0.14, 1.37, 0);
      mk(tubeGeo([P0, new V3(s * 0.15, 1.36, 0), new V3(s * 0.2, 1.22, -0.005), E], 0.058, 0.047), c, ain);
      ball(0.047, c, ain, E.x, E.y, E.z);
      if (L.pattern === 5) tf(ball(0.072, acc, ain, s * 0.165, 1.37, 0), 0, 0, -s * 0.5, 1.1, 0.72, 1.1); // (shoulder pads)
      const [fore, fin] = joint(ain, E.x, E.y, E.z);
      mk(tubeGeo([E, new V3(s * 0.225, 0.92, 0.05), W], 0.047, 0.034), c, fin);
      ball(0.034, c, fin, W.x, W.y, W.z);
      tf(mk(TOR(0.036, 0.01, 10, 26), acc, fin, W.x, W.y, W.z), PI / 2 - 0.3, 0, 0); // the cuff
      tf(ball(0.042, dark, fin, s * 0.212, 0.77, 0.085), 0, 0, 0, 0.8, 1.15, 1); // a mitten
      tf(mk(capsuleGeo(0.012, 0.03, 10), dark, fin, s * 0.184, 0.78, 0.115), 0.6, 0, -s * 0.4); // its thumb
      // what it holds: the thing's barrel runs down the forearm (its -z), its top (+y) up when the arm points
      // ahead, and it's in game meters (so tools keep their size)
      const hand = grp(fin, s * 0.212, 0.77, 0.085), z = E.clone().sub(W).normalize(), y = new V3(0, 0, 1);
      y.addScaledVector(z, -y.dot(z)).normalize();
      hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new V3().crossVectors(y, z), y, z));
      hand.scale.setScalar(1 / GOOB.s);
      arms.push(arm); fores.push(fore); hands.push(hand);
    }
    // --- the head: a long egg on a neck that wobbles it about inside the helmet (the helmet stays put)
    const [head, hin2] = joint(up, 0, GOOB.neck, 0.01);
    const face = grp(hin2, 0, GOOB.headY, 0.01);
    face.rotation.set(0.06, 0, 0.12); // (a goofy tilt)
    mk(latheGeo(GOOB.head, GOOB.hz, 36), skin, face);
    const HP = GOOB.head, hz = GOOB.hz;
    // a group on the head's skin at (angle round it, height), facing out; lift: how far out
    const onFace = (phi, y, lift = 0) => { const a = profAt(HP, hz, phi, y, lift), g = grp(face); g.position.copy(a.p); g.quaternion.setFromUnitVectors(_Z1, a.n); return g; };
    const facePt = (phi, y, lift = 0.004) => profAt(HP, hz, phi, y, lift).p;
    // a line drawn along the face through [angle, height] points (a smile, a brow)
    const faceLine = (pts, rad, color, parent = face, lift = 0.004) => {
      const ps = pts.map(([p, y]) => facePt(p, y, lift)), e = ps[ps.length - 1];
      for (const o of [mk(tubeGeo(ps, rad, rad, 0, 14, 8), color, face), ball(rad, color, face, ps[0].x, ps[0].y, ps[0].z), ball(rad, color, face, e.x, e.y, e.z)]) parent.attach(o);
    };
    // big ears that stick out (they flap)
    const ears = [];
    for (const s of [1, -1]) {
      const ear = grp(face, s * 0.084, 0, -0.01);
      tf(ball(0.038, skin, ear, s * 0.013, 0, 0), 0, s * 0.5, -s * 0.25, 0.35, 1, 0.75);
      ears.push(ear);
    }
    // eyes: each in a group that blinks, its pupil in a group that looks about. eyeAt: [x, y, z, radius]
    const eyes = [], pupils = [], eyeAt = [];
    const eyeball = (x, y, z, R, pr, shine) => {
      const g = grp(face, x, y, z);
      ball(R, GOOB.white, g);
      const pg = grp(g);
      tf(ball(pr, ink, pg, 0, -0.001, R - pr * 0.25), 0, 0, 0, 1, 1, 0.5);
      if (shine) tf(ball(pr * 0.38, '#ffffff', pg, -pr * 0.38, pr * 0.4, R + pr * 0.1), 0, 0, 0, 1, 1, 0.5);
      eyes.push(g); pupils.push(pg); eyeAt.push([x, y, z, R]);
      return g;
    };
    const flatEye = (phi, y, lift) => { const g = onFace(phi, y, lift); eyes.push(g); pupils.push(grp(g)); const a = profAt(HP, hz, phi, y); eyeAt.push([a.p.x, a.p.y, a.p.z, 0.03, true]); return g; };
    const brow = hc === '#e9e4dc' ? '#9a948c' : hc;
    switch (L.eyes) {
      case 1: // happy: shut tight, smiling
        for (const s of [1, -1]) mk(smoothGeo(new THREE.TorusGeometry(0.024, 0.006, 8, 18, PI)), ink, flatEye(s * 0.72, 0.062, 0.003), 0, -0.01, 0);
        break;
      case 2: // sleepy: heavy lids
        for (const s of [1, -1]) {
          const g = eyeball(s * 0.058, 0.063, 0.058, 0.04, 0.009);
          tf(mk(smoothGeo(new THREE.SphereGeometry(0.043, 18, 8, 0, PI * 2, 0, PI / 2)), skin, g), 0.12, 0, 0);
        }
        break;
      case 3: // angry: brows down
        for (const s of [1, -1]) {
          eyeball(s * 0.058, 0.063, 0.058, 0.04, 0.01);
          faceLine([[s * 0.22, 0.098], [s * 0.55, 0.108], [s * 0.92, 0.124]], 0.007, brow, face, 0.02);
        }
        break;
      case 4: for (const s of [1, -1]) eyeball(s * 0.061, 0.068, 0.062, 0.05, 0.017, true); break; // big
      case 5: for (const s of [1, -1]) ball(0.013, ink, flatEye(s * 0.6, 0.065, -0.004)); break; // dots
      case 6: eyeball(0, 0.075, 0.074, 0.056, 0.017, true); break; // cyclops
      default: for (const s of [1, -1]) eyeball(s * 0.058, 0.065, 0.058, 0.04, 0.0085); // round and googly
    }
    // dead: X eyes (hidden until then)
    const xeyes = grp(face);
    for (const [x, y, z, R, flat] of eyeAt) {
      const g = grp(xeyes, x, y, z + (flat ? 0.008 : R * 0.8));
      for (const a of [0.75, -0.75]) tf(mk(capsuleGeo(0.007, 0.042, 8), ink, g), 0, 0, a);
    }
    xeyes.visible = false;
    // a long droopy nose (it bounces)
    const nose = grp(face, 0, -0.012, 0.087);
    nose.attach(tf(mk(capsuleGeo(0.017, 0.035, 12), skin, face, 0, -0.025, 0.1), 1.2, 0, 0));
    nose.attach(ball(L.extra === 6 ? 0.03 : 0.024, L.extra === 6 ? '#ff2a2a' : skin, face, 0, -0.045, 0.122));
    if (L.extra === 1) for (const s of [1, -1]) nose.attach(tf(ball(0.022, hc, face, s * 0.024, -0.066, 0.084), 0, 0, s * 0.35, 1.5, 0.6, 0.7)); // (a mustache, under it)
    // the mouth: lopsided, and a wide open one for yelling (hidden until then). mo(u, v): a point on the face
    // in the mouth's own tilted frame (u across, v up)
    const MX = 0.01, MY = -0.09, MA = 0.3;
    const mo = (u, v) => { const x = MX + u * Math.cos(MA) - v * Math.sin(MA), y = MY + u * Math.sin(MA) + v * Math.cos(MA); return [Math.asin(U.clamp(x / profR(HP, y), -1, 1)), y]; };
    const mouth = grp(face, MX, MY, 0.058), yell = grp(face, MX, MY, 0.058); // (pivots at the mouth, so it opens in place)
    const openMouth = (g, sx, sy, tongue) => {
      const m = grp(face, MX, MY, 0.058);
      m.rotation.z = MA;
      tf(ball(0.024, ink, m), 0, 0, 0, 1.5 * sx, 0.75 * sy, 0.5);
      tf(mk(TOR(0.024, 0.0045, 8, 32), lips, m, 0, 0, 0.008), 0.15, 0, 0, 1.5 * sx, 0.75 * sy, 1);
      if (tongue) m.attach(tf(mk(capsuleGeo(0.011, 0.018, 10), '#ff6b8a', face, 0.026, -0.103, 0.072), 0.9, 0, 0.5, 1.3, 1, 0.55));
      g.attach(m);
      return m;
    };
    const smile = (k) => { const pts = []; for (let i = 0; i <= 8; i++) { const u = -0.04 + i * 0.01; pts.push(mo(u, -k * (1 - (u / 0.04) ** 2))); } return pts; };
    switch (L.mouth) {
      case 1: { // grin: wide open, teeth showing
        const m = openMouth(mouth, 1.15, 1.05, false);
        tf(mk(capsuleGeo(0.0055, 0.045, 8), '#ffffff', m, 0, 0.006, 0.01), 0, 0, PI / 2, 1, 1, 0.6);
        break;
      }
      case 2: faceLine([mo(-0.036, 0.002), mo(0, 0), mo(0.036, 0.002)], 0.0065, line, mouth); break; // flat
      case 3: openMouth(mouth, 0.62, 1.35, false); break; // surprised
      case 4: openMouth(mouth, 1, 1, true); break; // tongue out (the design's own)
      case 5: // fangs
        faceLine(smile(0.014), 0.0065, line, mouth);
        for (const u of [-0.015, 0.015]) { const [p, y] = mo(u, -0.014 * (1 - (u / 0.04) ** 2) - 0.008), a = profAt(HP, hz, p, y, 0.007); mouth.attach(tf(mk(smoothGeo(new THREE.ConeGeometry(0.0065, 0.017, 10)), '#ffffff', face, a.p.x, a.p.y, a.p.z), 0, 0, PI)); }
        break;
      case 6: { const pts = []; for (let i = 0; i <= 6; i++) { const u = -0.03 + i * 0.012; pts.push(mo(u, u > 0 ? 0.02 * (u / 0.042) ** 2 : 0)); } faceLine(pts, 0.0065, line, mouth); break; } // smirk
      default: faceLine(smile(0.016), 0.0065, line, mouth); // smile
    }
    openMouth(yell, 1.05, 1.5, true);
    yell.visible = false;
    // extras
    switch (L.extra) {
      case 2: { // a chinstrap beard, up to the ears
        const lo = (a) => -0.15 + 0.1 * (Math.abs(a) / 1.9) ** 2, hi = (a) => -0.108 + 0.13 * (Math.abs(a) / 1.9) ** 1.6;
        mk(headPatchGeo(-1.9, 1.9, lo, hi, 0.008, 22, 4), hc, face);
        break;
      }
      case 3: for (const s of [1, -1]) for (const [a, y] of [[0.48, 0.022], [0.6, 0.034], [0.55, 0.004], [0.7, 0.014], [0.42, 0.006]]) ball(0.0045, '#9a5a35', face).position.copy(facePt(s * a, y, 0.001)); break; // freckles
      case 4: for (const s of [1, -1]) tf(ball(0.021, '#ff8a9a', onFace(s * 0.82, 0.0, -0.004)), 0, 0, 0, 1.3, 0.8, 0.3); break; // blush
      case 5: // glasses (round, over the eyes)
        for (const [x, y, z, R] of eyeAt) {
          const rr = R + 0.007;
          mk(TOR(rr, 0.0055, 8, 28), '#22242c', face, x, y + 0.002, z + R * 0.92);
          if (eyeAt.length > 1) limb(face, new V3(x + Math.sign(x) * rr, y + 0.004, z + R * 0.88), new V3(Math.sign(x) * 0.088, 0.03, -0.012), 0.004, '#22242c');
        }
        if (eyeAt.length > 1) limb(face, new V3(eyeAt[0][0] - eyeAt[0][3] - 0.007, eyeAt[0][1] + 0.006, eyeAt[0][2] + eyeAt[0][3] * 0.95), new V3(eyeAt[1][0] + eyeAt[1][3] + 0.007, eyeAt[1][1] + 0.006, eyeAt[1][2] + eyeAt[1][3] * 0.95), 0.005, '#22242c');
        break;
    }
    // hair (inside the helmet, following the egg): cap(front edge, back edge, thickness, how fast the edge drops round the sides)
    const kF = (a, p) => ((1 - Math.cos(a)) / 2) ** p;
    const cap = (yF, yB, out = 0.01, p = 1) => mk(headPatchGeo(-PI, PI, (a) => yF + (yB - yF) * kF(a, p), () => GOOB.top, out), hc, face);
    const spike = (phi, y, h, w, flat = 1) => tf(mk(smoothGeo(new THREE.ConeGeometry(w, h, 12)), hc, onFace(phi, y, -0.004), 0, 0, h / 2), PI / 2, 0, 0, flat, 1, 1);
    switch (L.hair) {
      case 1: // a tuft, and one curl sticking up
        cap(0.13, 0.07, 0.007);
        for (const [a, y] of [[0.35, 0.16], [-0.3, 0.158]]) spike(a, y, 0.03, 0.011);
        tf(mk(smoothGeo(new THREE.TorusGeometry(0.018, 0.0055, 8, 20, PI * 1.6)), hc, face, 0.004, GOOB.top + 0.022, 0.0), 0, PI / 2, -0.4);
        break;
      case 2: cap(0.112, -0.015, 0.014, 1.6); break; // bowl cut
      case 3: // spiky
        cap(0.118, 0.02, 0.008, 1.3);
        for (const [a, y] of [[0, 0.172], [0.7, 0.155], [-0.7, 0.155], [1.7, 0.148], [-1.7, 0.148], [2.6, 0.15], [-2.6, 0.15], [PI, 0.14], [1.2, 0.128], [-1.2, 0.128], [2.2, 0.118], [-2.2, 0.118], [0, 0.14]]) spike(a, y, 0.042, 0.014);
        break;
      case 4: cap(0.118, 0.03, 0.008, 1.3); ball(0.034, hc, onFace(PI, 0.13, 0.024)); break; // bun
      case 5: for (const [a, y, h] of [[0, 0.122, 0.034], [0, 0.148, 0.046], [0, 0.168, 0.054], [PI, 0.166, 0.052], [PI, 0.145, 0.047], [PI, 0.118, 0.04], [PI, 0.085, 0.03]]) spike(a, y, h, 0.03, 0.4); break; // mohawk
      case 6: { // curly
        cap(0.12, 0.02, 0.006, 1.3);
        for (let i = 0; i < 22; i++) { const a = (i * 2.39996) % (PI * 2) - PI, y = 0.172 - (i / 22) * (0.1 + 0.05 * kF(a, 1)); ball(0.017, hc, onFace(a, y, 0.006)); }
        break;
      }
      case 7: { const e = (a) => { const t = U.clamp((Math.abs(a) - 0.95) / 1.3, 0, 1); return t * t * (3 - 2 * t); }; mk(headPatchGeo(-PI, PI, (a) => 0.112 - 0.25 * e(a), () => GOOB.top, 0.013), hc, face); break; } // long
    }
    // hands off the shadow map: the face's little bits (the head casts it)
    face.traverse((c) => { if (c.isMesh && c.parent !== face) c.castShadow = false; });
    // --- the helmet: a glass bubble on the collar, with a shine on it and the hat on top
    const helmet = grp(up, GOOB.glass[0], GOOB.glass[1], GOOB.glass[2]);
    const vis = C('visor'), op = { '#4a5060': 0.52, '#ffc23a': 0.42, '#bfe8ff': 0.28 }[vis] || 0.36;
    const glass = mk(smoothGeo(new THREE.SphereGeometry(GOOB.glassR, 30, 20)), M(vis, { transparent: true, opacity: op, depthWrite: false }), helmet);
    glass.castShadow = false;
    const sd = new V3(-0.45, 0.53, 0.72).normalize();
    const shine = tf(mk(smoothBall(0.045), M('#ffffff', { transparent: true, opacity: 0.55, depthWrite: false }), helmet), 0, 0, 0, 1.4, 0.55, 0.3);
    shine.position.copy(sd).multiplyScalar(GOOB.glassR - 0.004);
    shine.quaternion.setFromUnitVectors(_Z1, sd);
    shine.castShadow = false;
    const hatSlot = grp(helmet, 0, GOOB.glassR * 0.895, 0);
    hatSlot.scale.setScalar(GOOB.glassR / 0.38); // (hats were made for the old, bigger helmet)
    return {
      root, pose, spine, hips, legL: legs[0], legR: legs[1], shinL: shins[0], shinR: shins[1], footL: feet[0], footR: feet[1],
      armL: arms[0], armR: arms[1], foreL: fores[0], foreR: fores[1], hand: hands[1], handL: hands[0],
      head, eyes, pupils, xeyes, mouth, yell, nose, ears, helmet, hatSlot, cape,
    };
  });
  mergeParts(r.root, r);
  r.look = lookCode(L);
  setHat(r, o.hat || 'none');
  return r;
}

function setHat(ch, id) {
  if (ch.hatId === id) return;
  ch.hatId = id;
  while (ch.hatSlot.children.length) { const c = ch.hatSlot.children[0]; ch.hatSlot.remove(c); disposeObj(c); }
  if (id && id !== 'none') {
    const h = buildHat(id);
    h.traverse((c) => { if (c.isMesh) c.receiveShadow = false; }); // (smooth, like the rest of you: see mergeParts)
    ch.hatSlot.add(h);
  }
}

function buildHat(id) {
  return withHi(null, () => { // (smooth, like the heads they sit on)
    const g = new THREE.Group();
    switch (id) {
      case 'cone':
        mk(BOX(0.46, 0.05, 0.46), '#ff7b1f', g, 0, 0, 0);
        mk(CONE(0.2, 0.56, 8), '#ff7b1f', g, 0, 0.3, 0);
        mk(CYL(0.125, 0.15, 0.09, 8), '#ffffff', g, 0, 0.24, 0);
        break;
      case 'antenna':
        for (const s of [-1, 1]) {
          tf(mk(CYL(0.015, 0.015, 0.36, 4), '#3fcf6a', g, s * 0.1, 0.14, 0), 0, 0, -s * 0.35);
          mk(SPH(0.065, 6, 5), '#7dff8a', g, s * 0.17, 0.32, 0, { emissive: '#2a8a2a' });
        }
        break;
      case 'chef':
        mk(CYL(0.2, 0.2, 0.26, 10), '#ffffff', g, 0, 0.1, 0);
        tf(mk(SPH(0.27, 10, 6), '#ffffff', g, 0, 0.32, 0), 0, 0, 0, 1, 0.7, 1);
        break;
      case 'tophat':
        mk(CYL(0.4, 0.4, 0.03, 12), '#222222', g, 0, 0, 0);
        mk(CYL(0.24, 0.24, 0.48, 12), '#222222', g, 0, 0.25, 0);
        mk(CYL(0.245, 0.245, 0.08, 12), '#c0392b', g, 0, 0.06, 0);
        break;
      case 'crown':
        mk(CYL(0.22, 0.2, 0.14, 8), '#ffd23f', g, 0, 0.06, 0);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * PI * 2;
          mk(CONE(0.06, 0.16, 4), '#ffd23f', g, Math.sin(a) * 0.19, 0.2, Math.cos(a) * 0.19);
          mk(SPH(0.03, 5, 4), i % 2 ? '#ff3d6e' : '#3aa7ff', g, Math.sin(a) * 0.215, 0.07, Math.cos(a) * 0.215);
        }
        break;
      case 'viking':
        mk(HEMI(0.3), '#9aa3ad', g, 0, -0.1, 0);
        for (const s of [-1, 1]) tf(mk(CONE(0.07, 0.34, 6), '#f4ecd6', g, s * 0.32, 0.08, 0), 0, 0, -s * 1.0);
        break;
      case 'halo':
        tf(mk(TOR(0.22, 0.035, 5, 16), '#ffe66b', g, 0, 0.2, 0, { emissive: '#ffcc00' }), PI / 2);
        g.userData.bob = true;
        break;
      case 'propeller': {
        mk(HEMI(0.2), '#3aa7ff', g, 0, -0.03, 0);
        mk(CYL(0.02, 0.02, 0.16, 4), '#888888', g, 0, 0.14, 0);
        const p = grp(g, 0, 0.22, 0);
        mk(BOX(0.46, 0.02, 0.08), '#ff4b3e', p, 0, 0, 0);
        mk(BOX(0.08, 0.02, 0.46), '#ffd23f', p, 0, 0.005, 0);
        g.userData.spin = p;
        break;
      }
      case 'cowboy':
        tf(mk(CYL(0.46, 0.46, 0.04, 12), '#8b5a2b', g, 0, 0, 0), 0, 0, 0, 1, 1, 0.8);
        mk(CYL(0.19, 0.23, 0.26, 10), '#8b5a2b', g, 0, 0.15, 0);
        mk(CYL(0.235, 0.235, 0.05, 10), '#3b2414', g, 0, 0.06, 0);
        break;
      case 'pizza': {
        const s = grp(g, 0, 0.05, 0);
        s.rotation.x = -0.35;
        tf(mk(CYL(0.34, 0.34, 0.05, 3), '#ffc94a', s, 0, 0, 0.05), 0, 0, 0, 1, 1, 1.2);
        mk(BOX(0.55, 0.08, 0.1), '#d9933d', s, 0, 0.01, -0.17);
        for (const [x, z] of [[-0.08, 0.02], [0.1, 0.08], [0, 0.22]]) mk(CYL(0.05, 0.05, 0.03, 8), '#d63a2a', s, x, 0.035, z);
        break;
      }
      case 'party':
        mk(CONE(0.16, 0.46, 10), '#ff4fa3', g, 0, 0.22, 0);
        mk(CYL(0.1, 0.12, 0.06, 10), '#ffd23f', g, 0, 0.12, 0);
        mk(SPH(0.06, 6, 5), '#ffd23f', g, 0, 0.47, 0);
        break;
      case 'duck':
        tf(mk(SPH(0.2, 8, 6), '#ffd92e', g, 0, 0.1, 0), 0, 0, 0, 1, 0.8, 1.2);
        mk(SPH(0.13, 8, 6), '#ffd92e', g, 0, 0.3, 0.12);
        tf(mk(CONE(0.06, 0.14, 6), '#ff8a1f', g, 0, 0.28, 0.27), PI / 2);
        for (const s of [-1, 1]) mk(SPH(0.025, 4, 3), '#111111', g, s * 0.07, 0.34, 0.22);
        break;
      case 'bucket':
        mk(CYL(0.24, 0.28, 0.2, 10), '#6b8e4e', g, 0, 0.1, 0);
        mk(CYL(0.42, 0.42, 0.03, 12), '#6b8e4e', g, 0, 0.0, 0);
        break;
      case 'witch': {
        mk(CYL(0.46, 0.46, 0.03, 14), '#3a2a5a', g, 0, 0, 0);
        const c = grp(g, 0, 0.02, 0); c.rotation.z = -0.22;
        mk(CONE(0.23, 0.64, 10), '#3a2a5a', c, 0.02, 0.33, 0);
        mk(CYL(0.235, 0.245, 0.08, 10), '#9b5de5', g, 0, 0.06, 0);
        mk(BOX(0.1, 0.08, 0.04), '#ffd23f', g, 0, 0.06, 0.23);
        break;
      }
      case 'pumpkin':
        tf(mk(SPH(0.3, 10, 8), '#ff8a1f', g, 0, 0.12, 0), 0, 0, 0, 1, 0.8, 1);
        for (let i = 0; i < 3; i++) tf(mk(SPH(0.3, 10, 8), '#e8741a', g, 0, 0.12, 0), 0, (i / 3) * PI, 0, 0.4, 0.82, 1.03);
        mk(CYL(0.04, 0.06, 0.14, 5), '#3f6a2a', g, 0, 0.38, 0);
        for (const x of [-0.1, 0.1]) tf(mk(CONE(0.05, 0.07, 3), '#ffe066', g, x, 0.18, 0.27, { emissive: '#ffaa00' }), PI / 2, 0, 0);
        mk(BOX(0.2, 0.04, 0.03), '#ffe066', g, 0, 0.06, 0.28, { emissive: '#ffaa00' });
        break;
      case 'aviator':
        tf(mk(HEMI(0.31, 10, 5), '#8a5a2b', g, 0, -0.1, 0), 0, 0, 0, 1, 0.9, 1);
        for (const s of [-1, 1]) {
          mk(BOX(0.06, 0.3, 0.18), '#8a5a2b', g, s * 0.3, -0.18, 0);
          tf(mk(TOR(0.08, 0.025, 5, 12), '#c9a227', g, s * 0.1, 0.1, 0.25), -0.5, 0, 0);
          tf(mk(CYL(0.07, 0.07, 0.02, 10), '#7fd8ff', g, s * 0.1, 0.1, 0.25, { emissive: '#1a5a7a' }), PI / 2 - 0.5, 0, 0);
        }
        tf(mk(TOR(0.3, 0.02, 4, 16), '#3b2a1a', g, 0, 0.05, 0), PI / 2 + 0.35, 0, 0);
        break;
      case 'umbrella': {
        mk(TOR(0.22, 0.03, 4, 14), '#3b3f4a', g, 0, 0.0, 0).rotation.x = PI / 2;
        mk(CYL(0.02, 0.02, 0.4, 4), '#3b3f4a', g, 0, 0.2, 0);
        const top = grp(g, 0, 0.44, 0);
        mk(CONE(0.5, 0.24, 8), '#ff4b6e', top, 0, 0, 0);
        for (let i = 0; i < 4; i++) tf(mk(CONE(0.5, 0.24, 8, true), '#ffffff', top, 0, 0.002, 0), 0, (i / 4) * PI * 2, 0, 0.22, 1.01, 1.01);
        mk(SPH(0.04, 6, 5), '#ffd23f', top, 0, 0.14, 0);
        g.userData.spin = top;
        break;
      }
      case 'headset': // for hustling hands-free
        mk(new THREE.TorusGeometry(0.33, 0.035, 4, 18, PI), '#1a1a22', g, 0, -0.12, 0);
        for (const s of [-1, 1]) {
          tf(mk(CYL(0.12, 0.12, 0.1, 12), '#1a1a22', g, s * 0.34, -0.14, 0), 0, 0, PI / 2);
          tf(mk(TOR(0.11, 0.015, 4, 14), '#3df0ff', g, s * 0.39, -0.14, 0, { emissive: '#3df0ff' }), 0, PI / 2, 0);
        }
        rod(g, new V3(-0.36, -0.2, 0.05), new V3(-0.18, -0.46, 0.34), 0.018, '#1a1a22');
        mk(SPH(0.04, 6, 5), '#3df0ff', g, -0.16, -0.47, 0.36, { emissive: '#3df0ff' });
        break;
      case 'cap':
        mk(HEMI(0.27, 10, 5), '#ff9a1f', g, 0, -0.06, 0);
        tf(mk(CYL(0.22, 0.22, 0.03, 12), '#ff9a1f', g, 0, -0.05, 0.25), 0, 0, 0, 1, 1, 1.15);
        mk(BOX(0.14, 0.1, 0.02), '#ffffff', g, 0, 0.06, 0.25);
        mk(BOX(0.08, 0.06, 0.021), '#c9a36b', g, 0, 0.06, 0.255);
        mk(SPH(0.03, 5, 4), '#ff9a1f', g, 0, 0.22, 0);
        break;
    }
    return g;
  });
}

// (the people you meet are built smooth, like you: rounded boxes, round heads, see withHi)
// generic human-ish NPC body
function buildHumanoid(o) {
  return withHi(null, () => {
    const root = new THREE.Group(), shirt = o.shirt || '#ffffff', sleeve = o.sleeve || shirt, skin = o.skin || '#f2c9a0';
    for (const s of [-1, 1]) {
      limb(root, new V3(s * 0.15, 0.8, 0), new V3(s * 0.15, 0.2, 0), 0.115, o.pants || '#34405e');
      mk(roundBox(0.25, 0.15, 0.34, 0.065), o.shoe || '#2a2a2a', root, s * 0.15, 0.075, 0.04);
    }
    // a rounded barrel of a body (see TORSO)
    const torso = new THREE.LatheGeometry(TORSO.map(([x, y]) => new THREE.Vector2(x, y)), 32);
    torso.scale(0.93, 0.94, TORSO_Z * 0.88);
    mk(smoothGeo(torso), shirt, root, 0, 0.8, 0);
    const arms = [];
    for (const s of [-1, 1]) {
      const arm = grp(root, s * 0.4, 1.46, 0);
      mk(smoothBall(0.105), sleeve, arm, 0, -0.01, 0);
      limb(arm, new V3(0, -0.01, 0), new V3(0, -0.5, 0), 0.088, sleeve);
      tf(mk(smoothBall(0.085), skin, arm, 0, -0.6, 0.01), 0, 0, 0, 0.95, 1.1, 1);
      arms.push(arm);
    }
    const head = grp(root, 0, 1.86, 0);
    tf(mk(ICO(o.headR || 0.3, 1), skin, head, 0, 0, 0), 0, 0, 0, 1, o.headY || 1.08, 0.95);
    return { root, head, armL: arms[0], armR: arms[1] };
  });
}

function addEyes(parent, y, z, spread, r = 0.08, n = 2) {
  const xs = n === 3 ? [-spread, 0, spread] : [-spread, spread];
  xs.forEach((x, i) => {
    const yy = n === 3 && i === 1 ? y + r * 0.9 : y;
    mk(SPH(r, 7, 5), '#ffffff', parent, x, yy, z);
    mk(SPH(r * 0.5, 5, 4), '#111111', parent, x, yy, z + r * 0.75);
  });
}

function buildRobotNPC() {
  return withHi(null, () => {
    const root = new THREE.Group();
    mk(BOX(1.1, 0.4, 0.9), '#3b3f4a', root, 0, 0.25, 0);
    for (const s of [-1, 1]) tf(mk(CYL(0.22, 0.22, 0.95, 8), '#222222', root, s * 0.6, 0.25, 0), PI / 2);
    mk(BOX(0.9, 0.9, 0.7), '#ffb23e', root, 0, 0.95, 0);
    mk(BOX(0.4, 0.3, 0.05), '#2b1d14', root, 0, 1.0, 0.36);
    mk(CYL(0.1, 0.1, 0.25, 6), '#9aa3ad', root, 0, 1.52, 0);
    const head = grp(root, 0, 1.9, 0);
    mk(BOX(0.8, 0.6, 0.6), '#ffb23e', head, 0, 0, 0);
    const face = signMesh(['$ _ $'], 0.62, 0.4, { bg: '#10221a', color: '#7dff8a', border: '#333', glow: true });
    face.position.set(0, 0, 0.305); head.add(face);
    mk(CYL(0.02, 0.02, 0.35, 4), '#9aa3ad', head, 0.2, 0.45, 0);
    const bulb = mk(SPH(0.07, 6, 5), '#ff3d3d', head, 0.2, 0.64, 0, { emissive: '#aa0000' });
    const arms = [];
    for (const s of [-1, 1]) {
      const arm = grp(root, s * 0.55, 1.2, 0);
      tf(mk(BOX(0.14, 0.6, 0.14), '#9aa3ad', arm, 0, -0.25, 0.1), -0.4);
      mk(BOX(0.22, 0.12, 0.22), '#3b3f4a', arm, 0, -0.55, 0.25);
      arms.push(arm);
    }
    return { root, head, armL: arms[0], armR: arms[1], bulb };
  });
}

function buildSnailChef() {
  return withHi(null, () => {
    const root = new THREE.Group();
    tf(mk(SPH(0.6, 10, 6), '#b7e36a', root, 0, 0.3, 0.1), 0, 0, 0, 0.9, 0.5, 1.8);
    const neck = mk(CYL(0.28, 0.36, 1.1, 8), '#b7e36a', root, 0, 0.9, 0.85);
    neck.rotation.x = 0.15;
    const head = grp(root, 0, 1.55, 0.95);
    mk(SPH(0.36, 8, 6), '#b7e36a', head, 0, 0, 0);
    for (const s of [-1, 1]) {
      tf(mk(CYL(0.04, 0.05, 0.5, 5), '#b7e36a', head, s * 0.16, 0.42, 0), 0, 0, -s * 0.25);
      mk(SPH(0.1, 6, 5), '#ffffff', head, s * 0.24, 0.68, 0.02);
      mk(SPH(0.05, 5, 4), '#111111', head, s * 0.24, 0.68, 0.1);
    }
    mk(BOX(0.4, 0.07, 0.07), '#2b1d14', head, 0, -0.08, 0.34);
    for (const s of [-1, 1]) tf(mk(BOX(0.18, 0.06, 0.06), '#2b1d14', head, s * 0.24, -0.04, 0.33), 0, 0, s * 0.4);
    const hat = buildHat('chef'); hat.position.set(0, 0.28, 0); head.add(hat);
    const shell = grp(root, 0, 1.05, -0.35);
    [[0.75, 0.3, '#e4845a'], [0.5, 0.24, '#f0a070'], [0.28, 0.18, '#f7c090']].forEach(([r, t, c], i) =>
      tf(mk(TOR(r, t, 6, 14), c, shell, 0, i * 0.12, i * 0.06), 0, PI / 2, 0));
    return { root, head };
  });
}

function buildAlien(o = {}) {
  return withHi(null, () => {
    const b = buildHumanoid({ shirt: o.vest || '#9b5de5', sleeve: '#7ddc5a', skin: '#7ddc5a', pants: '#2b2140', headR: 0.36, headY: 1.2 });
    b.head.position.y = 1.95;
    addEyes(b.head, 0.08, 0.3, 0.16, 0.085, 3);
    mk(BOX(0.2, 0.04, 0.04), '#2b3a1a', b.head, 0, -0.18, 0.32);
    for (const s of [-1, 1]) {
      tf(mk(CYL(0.02, 0.02, 0.3, 4), '#7ddc5a', b.head, s * 0.14, 0.48, 0), 0, 0, -s * 0.3);
      mk(SPH(0.06, 6, 5), '#ffd23f', b.head, s * 0.2, 0.64, 0, { emissive: '#886600' });
    }
    if (o.bowtie) {
      for (const s of [-1, 1]) tf(mk(CONE(0.07, 0.15, 12), '#ff3d6e', b.root, s * 0.07, 1.44, 0.17), 0, 0, s * PI / 2, 1, 1, 0.5);
      mk(smoothBall(0.035), '#ff3d6e', b.root, 0, 1.44, 0.18);
    }
    if (o.shades) {
      mk(BOX(0.62, 0.12, 0.06), '#111111', b.head, 0, 0.12, 0.36);
      tf(mk(TOR(0.22, 0.03, 4, 12), '#ffd23f', b.root, 0, 1.42, 0.12), PI / 2 - 0.3);
    }
    return b;
  });
}

function buildPenguin() {
  return withHi(null, () => {
    const root = new THREE.Group();
    tf(mk(SPH(0.55, 10, 8), '#1d2230', root, 0, 0.8, 0), 0, 0, 0, 1, 1.4, 0.9);
    tf(mk(SPH(0.45, 10, 8), '#ffffff', root, 0, 0.75, 0.16), 0, 0, 0, 1, 1.3, 0.8);
    const head = grp(root, 0, 1.55, 0);
    mk(SPH(0.38, 10, 8), '#1d2230', head, 0, 0, 0);
    tf(mk(SPH(0.28, 8, 6), '#ffffff', head, 0, -0.04, 0.15), 0, 0, 0, 1, 0.9, 0.8);
    addEyes(head, 0.06, 0.3, 0.12, 0.065);
    tf(mk(CONE(0.1, 0.28, 6), '#ff9a1f', head, 0, -0.06, 0.42), PI / 2);
    for (const s of [-1, 1]) {
      tf(mk(BOX(0.1, 0.6, 0.3), '#1d2230', root, s * 0.55, 0.85, 0), 0, 0, s * 0.25);
      mk(BOX(0.22, 0.06, 0.32), '#ff9a1f', root, s * 0.18, 0.03, 0.12);
    }
    tf(mk(TOR(0.33, 0.09, 5, 12), '#d63a2a', root, 0, 1.25, 0), PI / 2);
    mk(BOX(0.16, 0.45, 0.06), '#d63a2a', root, 0.22, 1.0, 0.33);
    return { root, head };
  });
}

function buildManager() {
  return withHi(null, () => {
    const b = buildHumanoid({ shirt: '#ffffff', sleeve: '#ffffff', pants: '#2b2b33', skin: '#f0c29a' });
    mk(roundBox(0.1, 0.46, 0.04, 0.018), '#c0392b', b.root, 0, 1.25, 0.2);
    tf(mk(CYL(0.3, 0.29, 0.07, 24), '#2b2b33', b.root, 0, 0.86, 0), 0, 0, 0, 1, 1, 0.62);
    addEyes(b.head, 0.05, 0.25, 0.1, 0.06);
    for (const s of [-1, 1]) tf(mk(TOR(0.08, 0.015, 4, 10), '#111111', b.head, s * 0.1, 0.05, 0.3), 0, 0, 0);
    mk(BOX(0.06, 0.015, 0.02), '#111111', b.head, 0, 0.05, 0.31);
    tf(mk(smoothGeo(new THREE.SphereGeometry(0.312, 24, 10, 0, PI * 2, 0, 0.95)), '#6b4a2b', b.head, 0, 0.02, -0.03), -0.4, 0, -0.14, 1, 1.08, 0.95);
    mk(BOX(0.16, 0.03, 0.03), '#6b2d2d', b.head, 0, -0.13, 0.27);
    const mug = grp(b.armR, 0, -0.66, 0.14);
    mk(CYL(0.09, 0.08, 0.18, 8), '#ffffff', mug, 0, 0, 0);
    tf(mk(TOR(0.05, 0.015, 4, 8), '#ffffff', mug, 0.1, 0, 0), 0, PI / 2, 0);
    b.armR.rotation.x = -0.9;
    return b;
  });
}

// the shopkeeper who runs each planet's shop
function buildShopkeeper(shopId) {
  switch (shopId) {
    case 'scrap': return buildRobotNPC();
    case 'gloop': return buildSnailChef();
    case 'luck': return buildAlien({ vest: '#9b5de5', bowtie: true });
    case 'frost': return buildPenguin();
    case 'spook': return buildSheetGhost();
    case 'cloud': return buildAlbatross();
    case 'city': return buildTrenchRaccoons();
    default: return buildManager();
  }
}

function buildSnail(color) {
  const root = new THREE.Group();
  tf(mk(SPH(0.3, 8, 5), '#c9e27a', root, 0, 0.12, 0.05), 0, 0, 0, 0.8, 0.45, 1.8);
  const shell = grp(root, 0, 0.36, -0.1);
  tf(mk(TOR(0.2, 0.1, 5, 12), color, shell, 0, 0, 0), 0, PI / 2, 0);
  tf(mk(TOR(0.1, 0.07, 5, 10), '#ffffff', shell, 0, 0.03, 0.05), 0, PI / 2, 0);
  for (const s of [-1, 1]) {
    tf(mk(CYL(0.015, 0.02, 0.22, 4), '#c9e27a', root, s * 0.06, 0.32, 0.46), 0.3, 0, -s * 0.3);
    mk(SPH(0.045, 5, 4), '#111111', root, s * 0.1, 0.44, 0.5);
  }
  return mergeLocal(root);
}

/* ---------------- the ship ---------------- */
function buildShip(boardable = false) {
  const g = new THREE.Group();
  g.name = 'S.S. Late Delivery — courier shuttle';
  const ivory = '#e8e4d8', red = '#cf492e', dark = '#202b38', steel = '#8196a5', cyan = '#83e6eb', amber = '#ffbc55';
  const glow = { emissive: '#297681', emissiveIntensity: .7 };
  // Closed cross-section lofts make the nose, keel and wings solid from every
  // view. The cabin is assembled from thick panels around actual apertures.
  const loft = (rings, color, parent = g) => {
    const n = rings[0].length, vertices = rings.flat(2), indices = [];
    for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < n; i++) {
      const a = r * n + i, b = r * n + (i + 1) % n, c = b + n, d = a + n;
      indices.push(a, b, d, b, c, d);
    }
    for (let i = 1; i < n - 1; i++) {
      indices.push(0, i + 1, i);
      const end = (rings.length - 1) * n;
      indices.push(end, end + i, end + i + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices); geo.computeVertexNormals();
    return mk(geo.toNonIndexed(), color, parent, 0, 0, 0, { side: THREE.DoubleSide, flatShading: true });
  };
  const rect = (x, y0, y1, z) => [[-x,y0,z],[x,y0,z],[x,y1,z],[-x,y1,z]];
  const beam = (a, b, width, color, parent = g) => {
    const start = new V3(...a), end = new V3(...b), delta = end.clone().sub(start);
    const m = mk(BOX(width, delta.length(), width), color, parent);
    m.position.copy(start.add(end).multiplyScalar(.5));
    m.quaternion.setFromUnitVectors(new V3(0,1,0), delta.normalize());
    return m;
  };
  loft([rect(1.32,1.05,2.24,-3.25),rect(1.88,1.52,2.24,-2.6),rect(1.88,1.52,2.24,2.5),rect(.95,2.02,2.24,4.7)], dark).name = 'ship-sealed-keel';
  mk(BOX(3.6,.22,6.6), ivory, g, 0,2.19,.3);
  mk(BOX(3.27,.025,6.1), '#34404a', g, 0,2.305,.35);
  mk(BOX(.52,.03,5.1), red, g, 0,2.33,-.1);
  // Side panels and individually glazed windows; starboard middle is the hatch.
  for (const s of [-1,1]) {
    const spans = s === 1 ? [[-3.05,-1.04],[1.44,1.72]] : [[-3.05,1.72]];
    for (const [a,b] of spans) {
      mk(BOX(.2,1.05,b-a), ivory,g,s*1.78,2.8,(a+b)/2);
      mk(BOX(.23,.18,b-a), red,g,s*1.79,3.26,(a+b)/2);
      mk(BOX(.23,.4,b-a), ivory,g,s*1.78,4.52,(a+b)/2);
      mk(BOX(.08,.95,b-a), M('#5192ac',{transparent:true,opacity:.4,depthWrite:false,side:THREE.DoubleSide}),g,s*1.79,3.83,(a+b)/2);
      for (let z=a;z<=b;z+=.98) mk(BOX(.24,1.06,.095),dark,g,s*1.79,3.83,z);
      mk(BOX(.24,1.06,.095),dark,g,s*1.79,3.83,b);
    }
    for (const z of [-2.6,-1.55]) {
      mk(BOX(.06,.48,.64),steel,g,s*1.905,2.82,z);
      for (let k=0;k<3;k++) mk(BOX(.065,.04,.44),dark,g,s*1.94,2.69+k*.12,z);
    }
  }
  mk(BOX(3.55,2.48,.24),ivory,g,0,3.49,-3.03);
  mk(BOX(2.65,1.74,.1),dark,g,0,3.48,-3.2);
  mk(BOX(2.38,1.46,.06),steel,g,0,3.48,-3.28);
  for (const x of [-.93,.93]) mk(BOX(.09,1.3,.07),ivory,g,x,3.48,-3.33);
  mk(BOX(.78,.24,.08),dark,g,0,3.5,-3.33);
  for (const x of [-1.08,1.08]) for (const y of [2.86,4.1]) mk(SPH(.05,6,4),amber,g,x,y,-3.34);
  // Solid chamfered roof with a raised cargo spine.
  loft([[[-1.89,4.68,-3.16],[1.89,4.68,-3.16],[1.5,5.02,-3.16],[-1.5,5.02,-3.16]],
        [[-1.89,4.68,1.78],[1.89,4.68,1.78],[1.5,5.02,1.78],[-1.5,5.02,1.78]]],ivory).name='ship-sealed-roof';
  mk(BOX(.52,.055,4.82),red,g,0,5.035,-.69);
  for (const z of [-2.4,-1.7,-1,.6]) mk(BOX(.8,.08,.12),steel,g,0,5.1,z);
  // Broad, sloping panoramic windshield and a blunt armored nose.
  loft([rect(1.88,2.22,3.27,1.6),rect(1.58,2.15,3.28,3.65),rect(1.02,2.04,2.62,4.75)],red).name='ship-armored-nose';
  const glass = M('#4e9cb5',{transparent:true,opacity:.48,depthWrite:false,side:THREE.DoubleSide});
  const pane = (points) => {
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));
    geo.setIndex([0,1,2,0,2,3]); geo.computeVertexNormals();
    mk(geo,glass,g);
  };
  const a=[-1.78,4.76,1.72], b=[1.78,4.76,1.72], c=[1.56,3.3,3.7], d=[-1.56,3.3,3.7];
  pane([a,b,c,d]);
  pane([[-1.78,3.28,1.72],a,d,[-1.56,3.28,3.7]]);
  pane([b,[1.78,3.28,1.72],[1.56,3.28,3.7],c]);
  const canopyFrame=grp(g); canopyFrame.name='ship-cockpit-frame';
  for (const [p,q] of [[a,b],[b,c],[c,d],[d,a],[[0,4.76,1.72],[0,3.3,3.7]]]) beam(p,q,.11,dark,canopyFrame);
  for (const s of [-1,1]) {
    beam([s*1.78,3.28,1.72],[s*1.78,4.76,1.72],.11,dark,canopyFrame);
    mk(BOX(.48,.16,.1),dark,g,s*.93,2.69,4.59);
    mk(BOX(.36,.075,.11),cyan,g,s*.93,2.72,4.65,glow);
  }
  // Swept wings sit behind the hatch, clear of the boarding approach.
  for (const s of [-1,1]) {
    const outline=[[s*1.75,-1.15],[s*3.5,-1.8],[s*4.65,-3.9],[s*1.7,-3.9]];
    loft([outline.map(([x,z])=>[x,1.96,z]),outline.map(([x,z])=>[x,2.2,z])],ivory).name='ship-swept-wing';
    beam([s*2.1,2.23,-1.5],[s*4.45,2.23,-3.72],.12,red);
    const nac=grp(g,s*3.0,2.23,-3.92); nac.name=s<0?'ship-engine-left':'ship-engine-right';
    tf(mk(CYL(.66,.8,2.7,12),dark,nac),PI/2);
    tf(mk(CYL(.72,.74,1.45,12),ivory,nac,0,0,.16),PI/2);
    for (const z of [-.65,.77]) tf(mk(TOR(.73,.07,6,20),red,nac,0,0,z),0);
    tf(mk(CYL(.79,.63,.38,12),steel,nac,0,0,-1.5),PI/2);
    tf(mk(CYL(.61,.61,.04,12),dark,nac,0,0,-1.71),PI/2);
    mk(TOR(.43,.08,6,20),cyan,nac,0,0,-1.75,glow);
    tf(mk(CYL(.33,.33,.045,12),cyan,nac,0,0,-1.75,glow),PI/2);
    for (const x of [-.26,.26]) mk(BOX(.08,.12,1.25),steel,nac,x,.71,.12);
    const fin=loft([[[s*4.45,2.05,-3.95],[s*4.45,2.05,-2.1],[s*4.45,3.32,-3.7]],
                    [[s*4.58,2.05,-3.95],[s*4.58,2.05,-2.1],[s*4.58,3.32,-3.7]]],red);
    fin.name='ship-tail-fin';
    mk(SPH(.1,8,6),s<0?'#ff554b':'#74ffd2',g,s*4.54,3.2,-3.68,{emissive:s<0?'#ff554b':'#74ffd2'});
  }
  const fin=loft([[[-.07,5,-2.9],[-.07,5,-1.3],[-.07,5.72,-2.65]],[[.07,5,-2.9],[.07,5,-1.3],[.07,5.72,-2.65]]],dark);
  fin.name='ship-dorsal-fin';
  // Four shock-absorbing landing legs with broad, grounded feet.
  g.userData.landingLegs = [];
  for (const x of [-1.7,1.7]) for (const z of [-2.55,2.7]) {
    const leg = grp(g), pivot = new V3(x,1.95,z);
    leg.name = 'ship-landing-leg';
    beam([x,1.95,z],[x*1.15,.24,z+.14],.18,steel,leg);
    mk(BOX(.33,.48,.36),red,leg,x,1.22,z);
    mk(BOX(.82,.18,.96),dark,leg,x*1.15,.09,z+.14);
    mk(BOX(.62,.06,.76),steel,leg,x*1.15,.2,z+.14);
    for (const child of leg.children) child.position.sub(pivot);
    leg.position.copy(pivot);
    leg.userData.foldAngle = -Math.sign(x) * PI / 2;
    g.userData.landingLegs.push(leg);
  }
  // The complete ramp rotates at its hinge. It telescopes to hatch height
  // when stowed; deck, treads and edge rails all move as one assembly.
  const ramp=grp(g,1.6,2.24,.2), length=Math.hypot(4.6,2.3);
  ramp.name='ship-boarding-ramp'; ramp.rotation.z=-Math.atan2(2.3,4.6);
  mk(BOX(length,.12,1.92),steel,ramp,length/2,0,0);
  mk(BOX(length-.18,.025,1.65),dark,ramp,length/2,.073,0);
  for (let x=.3;x<length;x+=.4) mk(BOX(.09,.03,1.56),steel,ramp,x,.1,0);
  for (const z of [-.93,.93]) {
    const rail=mk(BOX(length,.16,.08),ivory,ramp,length/2,.13,z); rail.name='ship-ramp-handrail';
    mk(BOX(length-.25,.035,.035),cyan,ramp,length/2,.23,z,glow);
  }
  for (const z of [-.98,.98]) {
    mk(BOX(.24,2.38,.18),dark,g,1.8,3.48,z+.2).name='ship-hatch-frame';
    for(let y=2.5;y<4.5;y+=.34) mk(BOX(.25,.12,.19),amber,g,1.8,y,z+.2);
  }
  mk(BOX(.25,.16,2.18),dark,g,1.8,4.61,.2);
  ramp.userData.shipRamp={downPos:ramp.position.clone(),downRot:ramp.rotation.clone(),upPos:new V3(1.88,2.24,.2),upRot:new THREE.Euler(0,0,PI/2),upScale:new V3(2.3/length,1,1)};
  g.userData.ramp=ramp;
  // Seats stay aligned with the existing walk-in interactions.
  for (const [x,z] of [[0,2.3],[-.95,-.9],[-.95,-2]]) {
    mk(BOX(.48,.48,.48),dark,g,x,2.55,z);
    mk(BOX(.68,.16,.64),red,g,x,2.87,z);
    mk(BOX(.68,.95,.16),dark,g,x,3.4,z-.37);
    mk(BOX(.54,.64,.08),red,g,x,3.38,z-.26);
    mk(BOX(.49,.22,.2),ivory,g,x,4,z-.37);
  }
  mk(BOX(2.7,.4,.48),dark,g,0,3.08,3.14);
  for (const x of [-.78,0,.78]) tf(mk(BOX(.5,.035,.3),cyan,g,x,3.3,3.12,glow),.3);
  // Delivery identity is built into the roof pod instead of a floating topper.
  const sign=signMesh(['LATE DELIVERY','PIZZA CO.'],1.8,.64,{bg:dark,colors:['#ffffff',amber],border:red});
  sign.position.set(0,5.38,-.35); g.add(sign);
  mk(BOX(1.94,.73,.42),dark,g,0,5.36,-.58);
  const badge=signMesh(['LD-01','INTERPLANETARY COURIER'],2.25,.57,{bg:red,color:'#ffffff'});
  badge.position.set(-1.925,2.79,.1); badge.rotation.y=-PI/2; g.add(badge);
  g.userData.shipDetails={canopy:canopyFrame,fin,boardable,design:'courier-shuttle-v2'};
  return g;
}

/* ---------------- props ---------------- */
// a heap of garbage that actually sits on the ground: a bottom layer, then things stacked on top
function buildJunkPile(rng) {
  const g = new THREE.Group();
  const cols = ['#8f6b52', '#6f7b83', '#a0522d', '#5a6b4a', '#7a6a8a', '#b07a3a'];
  const col = () => cols[Math.floor(rng() * cols.length)];
  const base = [];
  const n = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2 + rng() * 0.6, d = i === 0 ? 0 : 0.7 + rng() * 0.6;
    const x = Math.cos(a) * d, z = Math.sin(a) * d, t = rng();
    let top;
    if (t < 0.4) { // crate, flat on the ground
      const w = 0.6 + rng() * 0.7, h = 0.5 + rng() * 0.6, dd = 0.6 + rng() * 0.7;
      tf(mk(BOX(w, h, dd), col(), g, x, h / 2 - 0.04, z), 0, rng() * 3, 0); top = h;
    } else if (t < 0.65) { // tire lying flat
      tf(mk(TOR(0.42, 0.18, 6, 12), '#2a2a2a', g, x, 0.16, z), PI / 2, 0, 0); top = 0.34;
    } else if (t < 0.85) { // barrel, standing up or on its side
      if (rng() < 0.5) { mk(CYL(0.38, 0.38, 1.0, 8), col(), g, x, 0.48, z); top = 0.98; }
      else { tf(mk(CYL(0.38, 0.38, 1.0, 8), col(), g, x, 0.36, z), PI / 2, rng() * 3, 0); top = 0.74; }
    } else { // a pipe leaning on the pile, one end in the dirt
      const len = 1.6 + rng() * 0.8, tilt = 0.9 + rng() * 0.3;
      const p = grp(g, x, 0, z); p.rotation.y = rng() * 6;
      tf(mk(CYL(0.1, 0.1, len, 6), '#9aa3ad', p, Math.sin(tilt) * len / 2, Math.cos(tilt) * len / 2, 0), 0, 0, -tilt);
      continue;
    }
    base.push({ x, z, top });
  }
  // a couple of things sitting on top of the bottom layer
  const extra = 1 + Math.floor(rng() * 2);
  for (let i = 0; i < extra && base.length; i++) {
    const b = base[Math.floor(rng() * base.length)];
    const h = 0.3 + rng() * 0.35;
    if (rng() < 0.5) tf(mk(BOX(0.45, h, 0.45), col(), g, b.x + (rng() - 0.5) * 0.2, b.top + h / 2 - 0.03, b.z + (rng() - 0.5) * 0.2), 0, rng() * 3, 0);
    else mk(CYL(0.16, 0.16, 0.42, 8), '#c9ced6', g, b.x, b.top + 0.2, b.z);
    b.top += h;
  }
  g.userData.r = 1.9;
  return g;
}
function buildBrokenRobot() {
  const g = new THREE.Group();
  tf(mk(BOX(1.2, 1.4, 0.9), '#7a8591', g, 0, 0.5, 0), 0, 0.3, 1.2);
  mk(BOX(0.8, 0.7, 0.7), '#7a8591', g, 1.3, 0.35, 0.6);
  mk(SPH(0.14, 6, 5), '#ff3d3d', g, 1.35, 0.45, 0.97, { emissive: '#550000' });
  tf(mk(BOX(0.2, 1.2, 0.2), '#5a636d', g, -1.0, 0.2, 0.8), 0, 0, 1.4);
  return g;
}
function buildDish() {
  const g = new THREE.Group();
  mk(CYL(0.25, 0.4, 2.4, 6), '#9aa3ad', g, 0, 1.2, 0);
  const d = grp(g, 0, 2.6, 0); d.rotation.x = -0.7;
  // An open reflector must render its concave inside as well as its back.
  // Keep this on its own material so other pale props still cull normally.
  const bowl = tf(mk(new THREE.SphereGeometry(1.6, 24, 10, 0, PI * 2, PI / 2, PI / 2), '#e6e1dc', d, 0, 1.2, 0, { side: THREE.DoubleSide }), 0, 0, 0, 1, 0.4, 1);
  bowl.name = 'satellite-reflector';
  tf(mk(TOR(1.6, 0.055, 5, 24), '#9aa3ad', d, 0, 1.2, 0), PI / 2);
  mk(CYL(0.3, 0.4, 0.25, 8), '#697684', d, 0, 0.52, 0);
  mk(CYL(0.05, 0.05, 1.4, 4), '#555555', d, 0, 1.3, 0);
  mk(CYL(0.15, 0.11, 0.25, 8), '#ffba58', d, 0, 2.05, 0);
  mk(CYL(0.5, 0.58, 0.18, 8), '#697684', g, 0, 0.09, 0);
  return g;
}
function buildCrashedRocket() {
  const g = new THREE.Group();
  const r = grp(g, 0, 1.2, 0); r.rotation.set(0.9, 0, 0.3);
  mk(CYL(0.8, 0.8, 4, 8), '#e6e1dc', r, 0, 0, 0);
  mk(CONE(0.8, 1.6, 8), '#d6281b', r, 0, 2.8, 0);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * PI * 2; tf(mk(BOX(0.12, 1.2, 1.0), '#d6281b', r, Math.sin(a) * 0.9, -1.6, Math.cos(a) * 0.9), 0, a, 0); }
  return g;
}
function buildPotty() {
  const g = new THREE.Group();
  mk(BOX(1.4, 2.4, 1.4), '#3a8fd8', g, 0, 1.2, 0);
  mk(BOX(1.5, 0.15, 1.5), '#2d6fb0', g, 0, 2.45, 0);
  mk(BOX(1.0, 2.0, 0.05), '#2d6fb0', g, 0, 1.1, 0.72);
  tf(mk(CYL(0.1, 0.1, 0.06, 8), '#ffd23f', g, 0, 1.9, 0.75), PI / 2);
  return g;
}
function buildMushroom(h, capR, cap, spots) {
  const g = new THREE.Group();
  mk(CYL(capR * 0.22, capR * 0.3, h, 8), '#f3e9d2', g, 0, h / 2, 0);
  mk(CYL(capR, capR * 0.9, 0.4, 12), cap, g, 0, h + 0.1, 0);
  tf(mk(HEMI(capR, 12, 4), cap, g, 0, h + 0.28, 0), 0, 0, 0, 1, 0.32, 1);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3, rr = capR * (0.3 + (i % 3) * 0.22);
    mk(SPH(capR * 0.12, 6, 4), spots || '#ffffff', g, Math.sin(a) * rr, h + 0.28 + capR * 0.3 * Math.sqrt(1 - (rr / capR) ** 2), Math.cos(a) * rr);
  }
  return g;
}
function buildGlowPlant(rng, col) {
  const g = new THREE.Group();
  const n = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const h = 0.6 + rng() * 1.4, x = (rng() - 0.5) * 0.8, z = (rng() - 0.5) * 0.8;
    tf(mk(CYL(0.04, 0.06, h, 4), '#2f7a6a', g, x, h / 2, z), (rng() - 0.5) * 0.4, 0, (rng() - 0.5) * 0.4);
    mk(SPH(0.16, 6, 5), col, g, x, h, z, { emissive: col });
  }
  return g;
}
function buildNeonPalm(rng) {
  const g = new THREE.Group();
  let x = 0, y = 0;
  const lean = 0.08 + rng() * 0.1;
  for (let i = 0; i < 6; i++) { mk(CYL(0.2, 0.25, 1.0, 6), i % 2 ? '#5b3a8a' : '#7a4ab0', g, x, y + 0.5, 0); x += lean; y += 0.95; }
  const col = rng() > 0.5 ? '#ff3df0' : '#3df0ff';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2, l = grp(g, x, y, 0);
    l.rotation.y = a;
    tf(mk(BOX(0.35, 0.06, 2.2), col, l, 0, -0.35, 1.0, { emissive: col }), 0.45, 0, 0);
  }
  return g;
}
function buildDice(size) {
  const g = new THREE.Group();
  mk(BOX(size, size, size), '#fdf6ec', g, 0, size / 2, 0);
  const p = size * 0.09;
  const faces = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0]];
  faces.forEach((f, fi) => {
    const pips = fi + 1;
    for (let i = 0; i < pips; i++) {
      const u = ((i % 3) - 1) * size * 0.26, v = (Math.floor(i / 3) - 0.5) * size * 0.3 * (pips > 3 ? 1 : 0);
      const pos = new V3(f[0] * size * 0.51, size / 2 + f[1] * size * 0.51, f[2] * size * 0.51);
      if (f[2]) { pos.x += u; pos.y += v; } else if (f[0]) { pos.z += u; pos.y += v; } else { pos.x += u; pos.z += v; }
      mk(BOX(f[0] ? 0.02 : p * 2, f[1] ? 0.02 : p * 2, f[2] ? 0.02 : p * 2), '#d6281b', g, pos.x, pos.y, pos.z);
    }
  });
  return g;
}
function buildChipStack(rng) {
  const g = new THREE.Group();
  const cols = ['#d6281b', '#2a6fd8', '#1d1d1d', '#3fcf6a', '#ffd23f'];
  const n = 4 + Math.floor(rng() * 8);
  for (let i = 0; i < n; i++) mk(CYL(0.7, 0.7, 0.22, 12), cols[i % cols.length], g, (rng() - 0.5) * 0.08, 0.11 + i * 0.23, 0);
  return g;
}
function buildPine(rng, snowy) {
  const g = new THREE.Group();
  const h = 3 + rng() * 3;
  mk(CYL(0.22, 0.32, h * 0.35, 6), '#6b4a2b', g, 0, h * 0.17, 0);
  for (let i = 0; i < 3; i++) {
    const r = (1.6 - i * 0.4) * (h / 5), y = h * 0.3 + i * h * 0.22;
    mk(CONE(r, h * 0.4, 7), '#2f6f55', g, 0, y + h * 0.2, 0);
    if (snowy) mk(CONE(r * 0.7, h * 0.22, 7), '#ffffff', g, 0, y + h * 0.33, 0);
  }
  return g;
}
function buildIgloo() {
  const g = new THREE.Group();
  mk(HEMI(2.6, 12, 5), '#f4fbff', g, 0, 0, 0);
  tf(mk(CYL(0.9, 0.9, 1.6, 8, false), '#e6f3fb', g, 0, 0.5, 2.6), PI / 2);
  mk(BOX(1.1, 1.0, 0.1), '#2b3a4a', g, 0, 0.5, 3.42);
  for (let i = 1; i < 4; i++) tf(mk(TOR(2.6 * Math.cos(i * 0.36), 0.04, 3, 18), '#cfe3f0', g, 0, 2.6 * Math.sin(i * 0.36), 0), PI / 2);
  return g;
}
function buildSnowman(rng) {
  const g = new THREE.Group();
  mk(ICO(0.8, 1), '#ffffff', g, 0, 0.7, 0);
  mk(ICO(0.58, 1), '#ffffff', g, 0, 1.75, 0);
  mk(ICO(0.42, 1), '#ffffff', g, 0, 2.55, 0);
  tf(mk(CONE(0.08, 0.4, 5), '#ff8a1f', g, 0, 2.55, 0.55), PI / 2);
  for (const s of [-1, 1]) {
    mk(SPH(0.05, 4, 3), '#111111', g, s * 0.14, 2.67, 0.36);
    tf(mk(CYL(0.03, 0.03, 1.0, 4), '#6b4a2b', g, s * 0.8, 1.9, 0), 0, 0, s * 1.1);
  }
  if (rng() > 0.5) { const h = buildHat('tophat'); h.position.set(0, 2.9, 0); g.add(h); }
  return g;
}
function buildSpire(rng) {
  const g = new THREE.Group();
  const h = 5 + rng() * 9;
  mk(CONE(1 + rng() * 1.2, h, 5), '#2a1f2e', g, 0, h / 2, 0);
  mk(OCT(0.4), '#ff5a1f', g, 0, h + 0.3, 0, { emissive: '#ff3a00' });
  return g;
}
function buildLavaRock(rng) {
  const g = new THREE.Group();
  const r = 0.8 + rng() * 1.6;
  const core = buildWeatheredStone(r, '#3a2a3a', r * 9, 0.7);
  core.rotation.y = rng() * 6; g.add(core);
  // glowing cracks, kept inside the rock so nothing hangs in the air
  for (let i = 0; i < 3; i++) tf(mk(BOX(0.14, 0.14, r * 0.95), '#ff6a1f', g, (rng() - 0.5) * r * 0.5, r * 0.35 + (rng() - 0.5) * r * 0.3, (rng() - 0.5) * r * 0.5, { emissive: '#ff3a00' }), (rng() - 0.5) * 0.6, rng() * 3, 0);
  g.userData.r = r * 0.85;
  return g;
}
// Closed, chipped silhouettes with coherent vertices and three shared stone tones.
// Face buckets survive mergeStatic (which does not copy vertex colors).
function buildWeatheredStone(r, color, seed, height) {
  const g = new THREE.Group(), source = new THREE.IcosahedronGeometry(1, 1);
  const p = source.attributes.position, faces = [[], [], []];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const chip = 0.86 + 0.1 * Math.sin(x * 5 + seed) * Math.cos(z * 4 - y * 3 + seed);
    p.setXYZ(i, x * r * chip, Math.max(-0.08, (y * chip + 0.8) * r * height), z * r * chip * 0.92);
  }
  for (let i = 0; i < p.count; i += 3) {
    const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / (3 * r * height);
    const tone = y < 0.42 ? 0 : (Math.sin(i * 1.7 + seed) > 0.45 ? 2 : 1);
    for (let j = i; j < i + 3; j++) faces[tone].push(p.getX(j), p.getY(j), p.getZ(j));
  }
  source.dispose();
  const base = new THREE.Color(color);
  const colors = [base.clone().multiplyScalar(0.72), base, base.clone().lerp(new THREE.Color('#fff1dc'), 0.16)];
  faces.forEach((positions, i) => {
    if (!positions.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    mk(geo, '#' + colors[i].getHexString(), g, 0, 0, 0);
  });
  return g;
}
function buildRock(rng, color) {
  const r = 0.5 + rng() * 1.4;
  // Consume the same random values as before: existing world layouts stay stable.
  const seed = rng() * 3, turn = rng() * 3, height = 0.6 + rng() * 0.4;
  const g = buildWeatheredStone(r, color || '#8a8a8a', seed, height);
  g.rotation.y = turn;
  g.userData.r = r * 0.8;
  return g;
}
function buildStatue() {
  const g = new THREE.Group();
  mk(BOX(2, 2, 2), '#5a4a6a', g, 0, 1, 0);
  mk(CYL(0.6, 0.9, 1.2, 8), '#c9b27a', g, 0, 2.6, 0);
  tf(mk(ICO(1.3, 1), '#e0c98a', g, 0, 4.2, 0), 0, 0, 0, 1, 1.15, 0.95);
  addEyes(g, 4.3, 1.1, 0.5, 0.22, 3);
  mk(CYL(0.6, 0.5, 0.5, 8), '#ffd23f', g, 0, 5.6, 0);
  return g;
}
function buildPalace() {
  const g = new THREE.Group();
  mk(BOX(34, 10, 14), '#4a2f5a', g, 0, 5, 0);
  mk(BOX(36, 1, 16), '#ffd23f', g, 0, 10.2, 0);
  tf(mk(HEMI(7, 12, 6), '#9b5de5', g, 0, 10.5, 0), 0, 0, 0, 1, 1.2, 1);
  mk(CYL(0.4, 0.4, 5, 6), '#ffd23f', g, 0, 21, 0);
  mk(OCT(1), '#ff3df0', g, 0, 24, 0, { emissive: '#aa00aa' });
  for (const s of [-1, 1]) {
    mk(CYL(2.4, 2.8, 22, 8), '#3a2448', g, s * 17, 11, 0);
    mk(CONE(3.2, 7, 8), '#9b5de5', g, s * 17, 25.5, 0);
    mk(CYL(1.6, 2, 14, 8), '#3a2448', g, s * 9, 7, 7);
    mk(CONE(2.2, 5, 8), '#9b5de5', g, s * 9, 16.5, 7);
  }
  mk(BOX(6, 7, 0.4), '#1a0f22', g, 0, 3.5, 7.1);
  for (const s of [-1, 1]) mk(BOX(2.2, 6, 0.1), '#d6281b', g, s * 5, 6, 7.2);
  return g;
}
function buildSlotMachine() {
  const g = new THREE.Group();
  mk(BOX(1.3, 1.9, 0.9), '#d6281b', g, 0, 0.95, 0);
  mk(BOX(1.4, 0.12, 1.0), '#ffd23f', g, 0, 1.95, 0);
  mk(BOX(1.1, 0.6, 0.06), '#1a1a2a', g, 0, 1.3, 0.46);
  [-0.33, 0, 0.33].forEach((x, i) => mk(BOX(0.28, 0.44, 0.04), ['#ffe066', '#7dff8a', '#ff7ac8'][i], g, x, 1.3, 0.5, { emissive: ['#886600', '#1a6a1a', '#6a1a4a'][i] }));
  g.userData.light = mk(CYL(0.25, 0.25, 0.3, 10), '#ffe066', g, 0, 2.2, 0, { emissive: '#aa8800' });
  const lever = grp(g, 0.75, 1.2, 0);
  mk(CYL(0.04, 0.04, 0.8, 5), '#cccccc', lever, 0, 0.4, 0);
  mk(SPH(0.1, 6, 5), '#ff3d3d', lever, 0, 0.82, 0);
  g.userData.lever = lever;
  mk(BOX(0.8, 0.2, 0.3), '#1a1a2a', g, 0, 0.5, 0.45);
  return g;
}
function buildCrateMachine() {
  const g = new THREE.Group();
  mk(BOX(1.8, 2.8, 1.2), '#2ab5a5', g, 0, 1.4, 0);
  mk(BOX(1.4, 1.6, 0.1), M('#bff6ff', { transparent: true, opacity: 0.45 }), g, 0, 1.7, 0.62);
  const cols = ['#ff4b3e', '#ffd23f', '#9b5de5', '#3aa7ff', '#3fcf6a'];
  for (let i = 0; i < 9; i++) mk(BOX(0.3, 0.3, 0.3), cols[i % 5], g, -0.45 + (i % 3) * 0.45, 1.1 + Math.floor(i / 3) * 0.5, 0.35);
  mk(BOX(0.6, 0.3, 0.1), '#1a1a2a', g, 0, 0.5, 0.62);
  return g;
}

// roulette table: the betting felt plus a wheel with a ball that really rolls round it (userData.ball)
function buildRouletteTable() {
  const g = new THREE.Group();
  mk(BOX(3.6, 0.9, 1.8), '#3b2414', g, 0, 0.45, 0);
  mk(BOX(3.8, 0.1, 2.0), '#2b1a10', g, 0, 0.92, 0);
  mk(BOX(3.6, 0.04, 1.8), '#1e7b3a', g, 0, 0.98, 0);
  // the number grid on the felt
  for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) mk(BOX(0.15, 0.012, 0.3), (i + j) % 2 ? '#d6281b' : '#161616', g, -0.35 + i * 0.17, 1.005, -0.4 + j * 0.34);
  mk(BOX(0.15, 0.012, 1.0), '#1f9d4a', g, -0.55, 1.005, -0.06);
  for (let k = 0; k < 6; k++) mk(CYL(0.08, 0.08, 0.08 + (k % 3) * 0.06, 10), ['#d6281b', '#2a6fd8', '#ffd23f'][k % 3], g, 1.2 + (k % 2) * 0.2, 1.04, -0.6 + Math.floor(k / 2) * 0.25);
  // the wheel, sunk into the left end of the table
  const wheel = grp(g, -1.25, 0.98, 0);
  mk(CYL(0.74, 0.8, 0.12, 28), '#6b4a2b', wheel, 0, 0.04, 0);
  mk(CYL(0.66, 0.66, 0.02, 28), '#2b1a10', wheel, 0, 0.1, 0);
  // the pockets. The wheel doesn't turn; it sits with the green zero on the far side, the same way
  // round as the wheel in the roulette window (zero at the top), so the ball lands in the same pocket in both
  const pockets = grp(wheel, 0, 0.11, 0);
  pockets.rotation.y = PI / 2;
  for (let i = 0; i < 37; i++) {
    const a = (i / 37) * PI * 2;
    const p = mk(BOX(0.2, 0.025, 0.08), i === 0 ? '#1f9d4a' : i % 2 ? '#d6281b' : '#161616', pockets, Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5);
    p.rotation.y = -a;
  }
  mk(CYL(0.36, 0.4, 0.06, 18), '#c9a227', pockets, 0, 0.02, 0);
  mk(CYL(0.04, 0.05, 0.22, 6), '#ffd23f', pockets, 0, 0.14, 0);
  for (let k = 0; k < 2; k++) tf(mk(BOX(0.46, 0.025, 0.035), '#ffd23f', pockets, 0, 0.22, 0), 0, (k / 2) * PI + PI / 4, 0);
  const ball = mk(SPH(0.045, 7, 5), '#ffffff', wheel, 0, 0.16, -0.5); // (resting in the zero)
  ball.castShadow = false;
  ball.userData.keep = true;
  mergeLocal(g); // only the ball moves, so everything else is glued into a few meshes
  g.userData = { ball, wheel };
  return g;
}
// something a player dropped on the ground, waiting to be picked up
function buildDropCrate(rare) {
  const g = new THREE.Group();
  const b = grp(g, 0, 0.32, 0);
  mk(BOX(0.42, 0.42, 0.42), rare ? '#ffd23f' : '#c9a36b', b, 0, 0, 0, rare ? { emissive: '#664400' } : undefined);
  mk(BOX(0.44, 0.07, 0.44), '#3b3f4a', b, 0, 0.13, 0);
  mk(BOX(0.07, 0.44, 0.44), '#3b3f4a', b, 0, 0, 0);
  glowRing(g, 0.62, rare ? '#ffd23f' : '#3df0ff');
  g.userData.bob = b;
  g.traverse((c) => { if (c.isMesh) c.castShadow = false; });
  return g;
}

/* ---------------- the Luckstar Casino (the building itself is put together in world.js) ---------------- */
// a glowing material of its own, so it can blink without touching anything else (it still merges with its twins)
function litMat(color, emissive) {
  const m = new THREE.MeshToonMaterial({ color, emissive, gradientMap: TOON_GRAD });
  m.userData.shared = true;
  return m;
}
// a thin bar from point a to point b
function rod(parent, a, b, r, color, opts) {
  const d = b.clone().sub(a);
  const m = mk(CYL(r, r, d.length(), 4), color, parent, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, opts);
  m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
  return m;
}
// loud casino carpet: gold diamonds on purple, with little neon dots where they meet
function casinoCarpetTex(rx, ry) {
  const t = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#2e0f52'; c.fillRect(0, 0, w, h);
    const diamond = (k) => { c.beginPath(); c.moveTo(w / 2, h / 2 - h * k); c.lineTo(w / 2 + w * k, h / 2); c.lineTo(w / 2, h / 2 + h * k); c.lineTo(w / 2 - w * k, h / 2); c.closePath(); };
    c.fillStyle = '#5a1a78'; diamond(0.36); c.fill();
    c.strokeStyle = '#d9a92a'; c.lineWidth = 7; diamond(0.5); c.stroke();
    c.strokeStyle = '#ff3df0'; c.lineWidth = 3; diamond(0.2); c.stroke();
    c.fillStyle = '#3df0ff';
    for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) { c.beginPath(); c.arc(x, y, 12, 0, PI * 2); c.fill(); }
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(w / 2, h / 2, 9, 0, PI * 2); c.fill();
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}
function buildChandelier(chain) {
  const g = new THREE.Group(), gold = '#ffd23f', warm = { emissive: '#ffcc55' }, ice = { emissive: '#5fb8ff' };
  mk(CYL(0.035, 0.035, chain, 4), '#c9a227', g, 0, 0.3 + chain / 2, 0);
  mk(SPH(0.26, 8, 6), gold, g, 0, 0.3, 0);
  tf(mk(TOR(1.35, 0.07, 5, 28), gold, g, 0, 0, 0), PI / 2);
  tf(mk(TOR(0.8, 0.06, 5, 20), gold, g, 0, 0.35, 0), PI / 2);
  const top = new V3(0, 0.3, 0);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2, c = Math.cos(a), s = Math.sin(a);
    mk(SPH(0.1, 6, 4), '#fff1b8', g, c * 1.35, 0.15, s * 1.35, warm);
    tf(mk(OCT(0.11), '#bff6ff', g, Math.cos(a + 0.26) * 1.35, -0.3, Math.sin(a + 0.26) * 1.35, ice), 0, 0, 0, 1, 1.8, 1);
    if (i % 2 === 0) rod(g, top, new V3(c * 1.35, 0, s * 1.35), 0.025, gold);
  }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2 + 0.2; mk(SPH(0.09, 6, 4), '#fff1b8', g, Math.cos(a) * 0.8, 0.48, Math.sin(a) * 0.8, warm); }
  tf(mk(OCT(0.22), '#bff6ff', g, 0, -0.35, 0, ice), 0, 0, 0, 1, 2, 1);
  return g;
}
function buildCasinoPillar(h) {
  const g = new THREE.Group();
  mk(CYL(0.42, 0.48, h, 10), '#2a1450', g, 0, h / 2, 0);
  mk(CYL(0.62, 0.66, 0.35, 10), '#ffd23f', g, 0, 0.17, 0);
  mk(CYL(0.62, 0.5, 0.4, 10), '#ffd23f', g, 0, h - 0.2, 0);
  tf(mk(TOR(0.47, 0.05, 4, 16), '#ffd23f', g, 0, 1.3, 0), PI / 2);
  tf(mk(TOR(0.47, 0.06, 4, 16), '#3df0ff', g, 0, 3.4, 0, { emissive: '#3df0ff' }), PI / 2);
  tf(mk(TOR(0.46, 0.06, 4, 16), '#ff3df0', g, 0, 3.8, 0, { emissive: '#ff3df0' }), PI / 2);
  return g;
}
// a lamp hanging over a gambling table (its chain goes up to the ceiling)
function buildHangingLamp(chain, color) {
  const g = new THREE.Group();
  mk(CYL(0.03, 0.03, chain, 4), '#c9a227', g, 0, 0.6 + chain / 2, 0);
  mk(CONE(0.85, 0.6, 12), color, g, 0, 0.3, 0);
  mk(CYL(0.72, 0.72, 0.04, 12), '#fff1b8', g, 0, 0.01, 0, { emissive: '#ffd27a' });
  return g;
}
function buildBarStool() {
  const g = new THREE.Group();
  mk(CYL(0.24, 0.3, 0.05, 10), '#c9a227', g, 0, 0.025, 0);
  mk(CYL(0.05, 0.05, 0.75, 6), '#c9a227', g, 0, 0.4, 0);
  mk(CYL(0.27, 0.25, 0.12, 12), '#b3122e', g, 0, 0.82, 0);
  return g;
}
// the giant poker chip spinning on the casino roof
function buildGiantChip() {
  const g = new THREE.Group(), disc = grp(g);
  disc.rotation.x = PI / 2; // stood up on its edge
  mk(CYL(2.4, 2.4, 0.5, 28), '#d6281b', disc, 0, 0, 0);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; tf(mk(BOX(0.55, 0.54, 0.5), '#ffffff', disc, Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2), 0, -a, 0); }
  for (const s of [-1, 1]) {
    mk(CYL(1.5, 1.5, 0.04, 24), '#ffd23f', disc, 0, s * 0.26, 0, { emissive: '#664400' });
    const t = signMesh(['$'], 2.2, 2.2, { bg: 'rgba(0,0,0,0)', color: '#d6281b', border: false, transparent: true });
    t.position.set(0, s * 0.29, 0); t.rotation.x = s > 0 ? -PI / 2 : PI / 2; disc.add(t);
  }
  return mergeLocal(g);
}

/* ---------------- collectible nodes ---------------- */
function glowRing(parent, r, col) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.8, r, 20), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -PI / 2; ring.position.y = 0.06; parent.add(ring);
  return ring;
}
function buildCrystalNode(rng) {
  const g = new THREE.Group();
  tf(mk(DOD(0.9), '#8fa3b8', g, 0, 0.3, 0), 0, rng() * 3, 0, 1.2, 0.5, 1.2);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2 + rng(), r = i === 0 ? 0 : 0.5;
    tf(mk(OCT(0.4), '#4fd2ff', g, Math.sin(a) * r, 0.9 + (i === 0 ? 0.5 : 0), Math.cos(a) * r, { emissive: '#0a5a8a' }),
      Math.sin(a) * 0.4 * (i ? 1 : 0), 0, Math.cos(a) * 0.4 * (i ? 1 : 0), 0.8, i ? 2.2 : 3, 0.8);
  }
  glowRing(g, 1.4, '#9fe3ff');
  return g;
}
// a flaming slice of space pepperoni, falling out of the sky
function buildMeteor(big) {
  const g = new THREE.Group(), s = big ? 1.6 : 1;
  const slice = grp(g);
  mk(CYL(0.75 * s, 0.75 * s, 0.22 * s, 12), '#c8321e', slice, 0, 0, 0, { emissive: '#5a0a00' });
  for (const [x, z] of [[0.3, 0.2], [-0.25, 0.3], [0.05, -0.35], [-0.35, -0.15]]) mk(CYL(0.11 * s, 0.11 * s, 0.24 * s, 6), '#7a140c', slice, x * s, 0.01, z * s);
  // comet tail of fire blobs trailing behind it (local +Y)
  const fire = grp(g);
  ['#fff36b', '#ffb23e', '#ff6a1f', '#d6281b'].forEach((col, i) => {
    const b = new THREE.Mesh(flat(ICO((0.66 - i * 0.12) * s, 0)), basicMat(col));
    b.position.y = (0.45 + i * 0.8) * s;
    fire.add(b);
  });
  g.traverse((c) => { if (c.isMesh) c.castShadow = false; });
  g.userData = { slice, fire };
  return g;
}

/* ---------------- space critters (face +Z, ~knee high) ---------------- */
// Critters are built smooth, in the 'crit' material set: they get an edge that stands out from whatever
// planet they're on (see setAtmosphere), so they never blend in. Their parts are glued into a few meshes;
// the moving bits (legs, wings, rotors, wheels, sparks) stay separate.
function buildCritter(kind, gold) {
  const m = withHi('crit', () => buildCritterParts(kind, gold));
  const keep = [...m.legs, ...(m.wings || []), ...(m.rotors || []), ...(m.rolls || [])];
  if (m.body.userData.spark) keep.push(m.body.userData.spark);
  mergeLocal(m.body, keep);
  return m;
}
// a critter someone's carrying about (from their hotbar, see Loadout): belly up with its legs in the air, about r
// across for a normal one, sitting in the middle of its group. Returns {g, size, k} (size: its box; k: how much
// bigger it is than a normal one. The big ones really are bigger: a TITANIC one about 3.5x, see CARRY_K)
const CARRY_K = 0.55; // (sizes grow by s^this in your arms: all the way to 10x wouldn't fit on the screen)
function buildCarriedCritter(entry, r) {
  const { id, sz, gold } = critOf(entry), m = buildCritter(id, gold), g = new THREE.Group(), k = Math.pow(SIZES[sz].s, CARRY_K);
  m.root.scale.setScalar(r * k / (m.hit || 0.45));
  m.root.rotation.set(0.35, 2.3, PI - 0.25);
  const box = new THREE.Box3().setFromObject(m.root), size = box.getSize(new V3());
  m.root.position.sub(box.getCenter(new V3()));
  g.add(m.root);
  return { g, size, k };
}
// a mini boss: a huge version of one of the planet's critters, with a crown, a glow on the ground under it
// and its name over its head (so you know it's not just a GIANT one)
function buildMiniBoss(def) {
  const m = buildCritter(def.base, false), s = def.s;
  m.root.scale.setScalar(s);
  const top = m.hy != null ? m.hy + m.hit * 0.9 : m.hit * 1.9;
  const crown = grp(m.body, 0, top, 0);
  withHi('crit', () => {
    mk(CYL(0.15, 0.13, 0.09, 12), '#ffcf3a', crown, 0, 0.045, 0, { emissive: '#7a5200' });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      mk(CONE(0.04, 0.12, 6), '#ffcf3a', crown, Math.sin(a) * 0.12, 0.14, Math.cos(a) * 0.12, { emissive: '#7a5200' });
      mk(SPH(0.022, 6, 5), i % 2 ? '#ff3d6e' : '#3df0ff', crown, Math.sin(a) * 0.145, 0.05, Math.cos(a) * 0.145, { emissive: i % 2 ? '#8a0020' : '#007a8a' });
    }
  });
  mergeLocal(crown);
  const aura = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.78, 40), new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
  aura.rotation.x = -PI / 2; aura.position.y = 0.04; aura.renderOrder = 3;
  m.root.add(aura);
  const tag = textSprite(def.name, { size: 44, color: '#ffffff', bg: 'rgba(120,20,30,.6)', scale: 0.009 / s });
  tag.position.y = top + 0.5;
  m.root.add(tag);
  Object.assign(m, { crown, aura, tag, top });
  return m;
}
function buildCritterParts(kind, gold) {
  const root = new THREE.Group(), body = grp(root);
  const C = (c) => (gold ? '#ffd23f' : c); // golden critters are golden all over
  const E = gold ? { emissive: '#aa7700' } : undefined;
  const legs = [];
  const leg = (x, z, h = 0.25, col = '#3b3f4a') => { const l = grp(body, x, h, z); mk(BOX(0.07, h, 0.07), C(col), l, 0, -h / 2, 0, E); legs.push(l); };
  // (its head is wherever its eyes are: see head, below)
  let head = null;
  const eyes = (y, z, spread, r = 0.07) => {
    if (!head) head = [0, y, z - 0.08, U.clamp(spread * 1.8, 0.1, 0.22)];
    for (const s of [-1, 1]) { mk(SPH(r, 6, 5), '#ffffff', body, s * spread, y, z); mk(SPH(r * 0.55, 5, 4), '#111111', body, s * spread, y, z + r * 0.6); }
  };
  let hit = 0.45, hy = null, hover = 0, wings = null, rotors = null, rolls = null;
  switch (kind) {
    case 'rat':
      tf(mk(SPH(0.28, 8, 6), C('#7d8aa6'), body, 0, 0.3, 0, E), 0, 0, 0, 0.9, 0.8, 1.4);
      mk(SPH(0.17, 8, 6), C('#95a2bd'), body, 0, 0.36, 0.38, E);
      mk(SPH(0.04, 5, 4), '#ff8fa3', body, 0, 0.36, 0.55);
      for (const s of [-1, 1]) mk(SPH(0.08, 6, 5), '#ff8fa3', body, s * 0.12, 0.52, 0.34);
      eyes(0.42, 0.48, 0.07, 0.04);
      tf(mk(CYL(0.02, 0.03, 0.5, 5), '#ff8fa3', body, 0, 0.3, -0.55), PI / 2 - 0.3);
      for (const [x, z] of [[-0.14, 0.2], [0.14, 0.2], [-0.14, -0.2], [0.14, -0.2]]) leg(x, z, 0.16, '#4a5266');
      break;
    case 'crab':
      tf(mk(SPH(0.34, 8, 6), C('#e0342a'), body, 0, 0.32, 0, E), 0, 0, 0, 1.3, 0.6, 1);
      for (const s of [-1, 1]) {
        mk(CYL(0.02, 0.02, 0.2, 4), C('#e0342a'), body, s * 0.1, 0.5, 0.18, E);
        mk(SPH(0.06, 6, 5), '#ffffff', body, s * 0.1, 0.62, 0.18); mk(SPH(0.03, 5, 4), '#111111', body, s * 0.1, 0.63, 0.23);
        const claw = grp(body, s * 0.42, 0.34, 0.25);
        tf(mk(BOX(0.18, 0.12, 0.24), C('#ff5a36'), claw, 0, 0, 0, E), 0, s * 0.4, 0);
        legs.push(claw);
        for (let i = 0; i < 3; i++) leg(s * 0.34, -0.1 + i * 0.12, 0.2, '#9a3f14');
      }
      break;
    case 'blob':
      tf(mk(SPH(0.36, 10, 8), C('#ffd83a'), body, 0, 0.3, 0, gold ? E : { emissive: '#4a3a00' }), 0, 0, 0, 1, 0.8, 1);
      eyes(0.38, 0.3, 0.1, 0.07);
      break;
    case 'hopper':
      tf(mk(SPH(0.32, 8, 6), C('#ff7a2a'), body, 0, 0.32, 0, E), 0, 0, 0, 1.1, 0.8, 1.2);
      for (const s of [-1, 1]) { mk(SPH(0.11, 7, 5), '#ffffff', body, s * 0.15, 0.58, 0.14); mk(SPH(0.06, 5, 4), '#111111', body, s * 0.15, 0.6, 0.23); }
      mk(BOX(0.3, 0.03, 0.05), '#2b3a1a', body, 0, 0.3, 0.38);
      for (const s of [-1, 1]) { const l = grp(body, s * 0.28, 0.25, -0.18); tf(mk(BOX(0.12, 0.3, 0.12), C('#d8541a'), l, 0, -0.1, 0, E), 0.7); legs.push(l); }
      leg(-0.12, 0.2, 0.2, '#d8541a'); leg(0.12, 0.2, 0.2, '#d8541a');
      break;
    case 'chipbug':
      mk(CYL(0.34, 0.34, 0.14, 12), C('#d6281b'), body, 0, 0.3, 0, E);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; mk(BOX(0.1, 0.15, 0.06), '#ffffff', body, Math.sin(a) * 0.33, 0.3, Math.cos(a) * 0.33).rotation.y = a; }
      mk(SPH(0.12, 7, 5), C('#2b1d14'), body, 0, 0.3, 0.36, E);
      eyes(0.36, 0.44, 0.06, 0.035);
      for (const s of [-1, 1]) { tf(mk(CYL(0.012, 0.012, 0.3, 4), '#2b1d14', body, s * 0.07, 0.48, 0.5), 0.8, 0, s * 0.3); for (let i = 0; i < 3; i++) leg(s * 0.28, -0.15 + i * 0.15, 0.2, '#2b1d14'); }
      break;
    case 'dice':
      mk(BOX(0.5, 0.5, 0.5), C('#ffffff'), body, 0, 0.45, 0, E);
      for (const [x, y] of [[-0.12, 0.57], [0.12, 0.33], [0, 0.45]]) mk(BOX(0.08, 0.08, 0.02), '#111111', body, x, y, 0.26);
      for (const s of [-1, 1]) { mk(BOX(0.06, 0.06, 0.02), '#d6281b', body, s * 0.13, 0.6, 0.26); tf(mk(BOX(0.12, 0.03, 0.02), '#111111', body, s * 0.13, 0.67, 0.26), 0, 0, s * 0.4); }
      leg(-0.14, 0, 0.22); leg(0.14, 0, 0.22);
      hit = 0.5;
      break;
    case 'mite':
      for (const [x, y, z, r] of [[0, 0.3, 0, 0.28], [0.18, 0.36, -0.1, 0.18], [-0.18, 0.36, -0.1, 0.18], [0, 0.46, -0.12, 0.2]]) mk(ICO(r, 1), C('#8a6cff'), body, x, y, z, E);
      eyes(0.36, 0.24, 0.09, 0.06);
      for (const [x, z] of [[-0.14, 0.1], [0.14, 0.1], [-0.14, -0.14], [0.14, -0.14]]) leg(x, z, 0.14, '#4a3aa8');
      break;
    case 'weasel':
      tf(mk(CYL(0.16, 0.16, 0.9, 7), C('#3d5a86'), body, 0, 0.32, 0, E), PI / 2);
      mk(SPH(0.19, 8, 6), C('#4f6f9e'), body, 0, 0.4, 0.52, E);
      mk(SPH(0.04, 5, 4), '#111111', body, 0, 0.4, 0.71);
      eyes(0.47, 0.62, 0.08, 0.04);
      for (const s of [-1, 1]) mk(CONE(0.06, 0.12, 4), C('#3d5a86'), body, s * 0.1, 0.6, 0.48, E);
      tf(mk(CYL(0.05, 0.1, 0.5, 6), '#1b2638', body, 0, 0.36, -0.65), PI / 2 + 0.3);
      for (const [x, z] of [[-0.12, 0.3], [0.12, 0.3], [-0.12, -0.3], [0.12, -0.3]]) leg(x, z, 0.2, '#25344d');
      break;
    case 'lsnail':
      tf(mk(CYL(0.16, 0.2, 0.8, 7), C('#a77ae0'), body, 0, 0.14, 0.05, E), PI / 2);
      mk(SPH(0.3, 8, 6), C('#ff5a1f'), body, 0, 0.42, -0.12, gold ? E : { emissive: '#aa2a00' });
      tf(mk(TOR(0.18, 0.05, 4, 10), '#ffb23e', body, 0.2, 0.42, -0.12, { emissive: '#aa5500' }), 0, PI / 2, 0);
      for (const s of [-1, 1]) { mk(CYL(0.015, 0.015, 0.2, 4), '#6a4c8a', body, s * 0.06, 0.3, 0.42); mk(SPH(0.04, 5, 4), '#111111', body, s * 0.06, 0.4, 0.42); }
      break;
    case 'imp':
      mk(BOX(0.34, 0.4, 0.26), C('#d6281b'), body, 0, 0.42, 0, E);
      mk(ICO(0.2, 1), C('#ff5a3d'), body, 0, 0.78, 0.02, E);
      for (const s of [-1, 1]) { tf(mk(CONE(0.05, 0.18, 4), '#2b1d14', body, s * 0.12, 0.98, 0), 0, 0, -s * 0.4); mk(SPH(0.045, 5, 4), '#fff36b', body, s * 0.07, 0.8, 0.19, { emissive: '#aa8800' }); }
      tf(mk(CYL(0.02, 0.02, 0.4, 4), '#2b1d14', body, 0, 0.4, -0.25), -0.8);
      for (const s of [-1, 1]) { const a = grp(body, s * 0.22, 0.58, 0); mk(BOX(0.08, 0.26, 0.08), C('#d6281b'), a, 0, -0.12, 0, E); legs.push(a); }
      leg(-0.09, 0, 0.22, '#8a1a10'); leg(0.09, 0, 0.22, '#8a1a10');
      hit = 0.55;
      break;
    case 'pigeon': // a grumpy grey bird with a hubcap for a belly
      tf(mk(SPH(0.26, 8, 6), C('#8a8f98'), body, 0, 0.36, 0, E), 0, 0, 0, 0.9, 0.9, 1.25);
      mk(CYL(0.2, 0.2, 0.05, 10), C('#c9ced6'), body, 0, 0.3, 0.12, E).rotation.x = PI / 2 - 0.3;
      mk(SPH(0.15, 8, 6), C('#6d7480'), body, 0, 0.58, 0.2, E);
      tf(mk(CONE(0.05, 0.14, 5), '#ffb23e', body, 0, 0.56, 0.38), PI / 2);
      eyes(0.62, 0.3, 0.08, 0.04);
      for (const s of [-1, 1]) tf(mk(BOX(0.05, 0.14, 0.34), C('#6d7480'), body, s * 0.22, 0.4, -0.02, E), 0, 0, s * 0.3);
      tf(mk(BOX(0.18, 0.04, 0.2), C('#6d7480'), body, 0, 0.36, -0.36, E), 0.3, 0, 0);
      leg(-0.08, 0.02, 0.2, '#ffb23e'); leg(0.08, 0.02, 0.2, '#ffb23e');
      break;
    case 'gremlin': // lives in a soup can, peeks out and bites
      mk(CYL(0.24, 0.24, 0.42, 10), C('#b0b8c0'), body, 0, 0.33, 0, E);
      mk(CYL(0.245, 0.245, 0.2, 10), C('#d6281b'), body, 0, 0.33, 0, E);
      mk(SPH(0.2, 8, 6), C('#5bbf3a'), body, 0, 0.6, 0.02, E);
      for (const s of [-1, 1]) { mk(SPH(0.06, 6, 5), '#fff36b', body, s * 0.08, 0.66, 0.16, { emissive: '#887700' }); tf(mk(CONE(0.04, 0.14, 4), C('#5bbf3a'), body, s * 0.16, 0.76, 0), 0, 0, -s * 0.6, 1, 1, 1); }
      for (const s of [-1, 1]) mk(CONE(0.025, 0.06, 3), '#ffffff', body, s * 0.05, 0.54, 0.19).rotation.x = PI;
      leg(-0.1, 0, 0.14, '#5bbf3a'); leg(0.1, 0, 0.14, '#5bbf3a');
      break;
    case 'shroomy': // a little mushroom that learned to run
      mk(CYL(0.12, 0.15, 0.3, 8), C('#f3e9d2'), body, 0, 0.3, 0, E);
      tf(mk(HEMI(0.32, 10, 4), C('#b25cff'), body, 0, 0.42, 0, E), 0, 0, 0, 1, 0.6, 1);
      for (let i = 0; i < 4; i++) { const a = i * 1.7; mk(SPH(0.05, 5, 4), '#ffffff', body, Math.sin(a) * 0.2, 0.55, Math.cos(a) * 0.2); }
      eyes(0.34, 0.13, 0.06, 0.045);
      leg(-0.07, 0, 0.16, '#f3e9d2'); leg(0.07, 0, 0.16, '#f3e9d2');
      break;
    case 'leech': // a long sticky slug
      for (let i = 0; i < 4; i++) mk(SPH(0.2 - i * 0.03, 8, 6), C(i % 2 ? '#5a24d0' : '#7d3cff'), body, 0, 0.18, 0.24 - i * 0.2, gold ? E : { emissive: '#1a0a4a' });
      mk(CYL(0.1, 0.1, 0.06, 10), '#1a2a2a', body, 0, 0.2, 0.42).rotation.x = PI / 2;
      for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; mk(CONE(0.018, 0.06, 3), '#ffffff', body, Math.cos(a) * 0.07, 0.2 + Math.sin(a) * 0.07, 0.44).rotation.x = PI / 2; }
      break;
    case 'card': // the ace of spades on little legs
      tf(mk(BOX(0.5, 0.04, 0.7), C('#fbf8f2'), body, 0, 0.3, 0, E), -0.25, 0, 0);
      mk(SPH(0.09, 6, 5), '#111111', body, 0, 0.35, 0.02);
      tf(mk(CONE(0.1, 0.16, 4), '#111111', body, 0, 0.39, 0.12), PI / 2 - 0.25, 0, 0);
      for (const s of [-1, 1]) { mk(BOX(0.08, 0.02, 0.1), '#d6281b', body, s * 0.18, 0.4, -0.25); mk(SPH(0.04, 5, 4), '#111111', body, s * 0.08, 0.42, 0.3); }
      for (const [x, z] of [[-0.18, 0.2], [0.18, 0.2], [-0.18, -0.2], [0.18, -0.2]]) leg(x, z, 0.22, '#2b1d14');
      break;
    case 'mimic': { // a tiny slot machine with a big bite
      mk(BOX(0.5, 0.55, 0.4), C('#d6281b'), body, 0, 0.42, 0, E);
      mk(BOX(0.4, 0.14, 0.03), '#1a1a2a', body, 0, 0.5, 0.21);
      [-0.12, 0, 0.12].forEach((x, i) => mk(BOX(0.08, 0.1, 0.02), ['#ffe066', '#7dff8a', '#ff7ac8'][i], body, x, 0.5, 0.225, { emissive: '#554400' }));
      mk(BOX(0.44, 0.05, 0.05), '#ffd23f', body, 0, 0.3, 0.2);
      for (let i = 0; i < 5; i++) mk(CONE(0.025, 0.07, 3), '#ffffff', body, -0.16 + i * 0.08, 0.26, 0.21).rotation.x = PI;
      for (const s of [-1, 1]) { mk(SPH(0.05, 6, 5), '#ffffff', body, s * 0.12, 0.66, 0.2); mk(SPH(0.025, 5, 4), '#111111', body, s * 0.12, 0.66, 0.24); }
      const lv = grp(body, 0.3, 0.45, 0); mk(CYL(0.02, 0.02, 0.3, 4), '#cccccc', lv, 0, 0.15, 0); mk(SPH(0.05, 5, 4), '#ff3d3d', lv, 0, 0.3, 0); legs.push(lv);
      leg(-0.14, 0, 0.18); leg(0.14, 0, 0.18);
      hit = 0.5;
      break;
    }
    case 'pengy': // Penguin Pete's small, broke cousin
      tf(mk(SPH(0.26, 8, 6), C('#1d2230'), body, 0, 0.38, 0, E), 0, 0, 0, 1, 1.3, 0.9);
      tf(mk(SPH(0.2, 8, 6), C('#ffffff'), body, 0, 0.36, 0.08, E), 0, 0, 0, 1, 1.2, 0.8);
      tf(mk(CONE(0.05, 0.12, 5), '#ff9a1f', body, 0, 0.56, 0.24), PI / 2);
      eyes(0.62, 0.18, 0.07, 0.04);
      for (const s of [-1, 1]) tf(mk(BOX(0.05, 0.28, 0.14), C('#1d2230'), body, s * 0.27, 0.38, 0, E), 0, 0, s * 0.3);
      leg(-0.08, 0.06, 0.08, '#ff9a1f'); leg(0.08, 0.06, 0.08, '#ff9a1f');
      break;
    case 'pup': // a fluffy baby yeti
      mk(ICO(0.32, 1), C('#3f8cff'), body, 0, 0.42, 0, E);
      mk(ICO(0.22, 1), C('#3f8cff'), body, 0, 0.72, 0.12, E);
      tf(mk(SPH(0.14, 7, 5), '#bcd6ff', body, 0, 0.7, 0.26), 0, 0, 0, 1, 0.8, 0.5);
      for (const s of [-1, 1]) { mk(SPH(0.035, 5, 4), '#111111', body, s * 0.06, 0.74, 0.32); mk(CONE(0.03, 0.08, 3), '#ffffff', body, s * 0.05, 0.62, 0.3).rotation.x = PI; }
      for (const s of [-1, 1]) { const a = grp(body, s * 0.3, 0.5, 0.05); mk(ICO(0.1, 0), C('#2f74e0'), a, 0, -0.12, 0, E); legs.push(a); }
      leg(-0.12, 0, 0.18, '#2560c0'); leg(0.12, 0, 0.18, '#2560c0');
      break;
    case 'ember': // a little bug that is also a little fire
      tf(mk(SPH(0.22, 8, 6), C('#a8341a'), body, 0, 0.26, 0, gold ? E : { emissive: '#4a0a00' }), 0, 0, 0, 1, 0.7, 1.3);
      for (let i = 0; i < 3; i++) mk(OCT(0.12 - i * 0.02), '#ff6a1f', body, (i - 1) * 0.08, 0.42 + i * 0.05, -0.05, { emissive: '#ff3a00' });
      eyes(0.32, 0.26, 0.06, 0.035);
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) leg(s * 0.2, -0.12 + i * 0.12, 0.16, '#1a1420');
      break;
    case 'hound': // the Emperor's three-eyed guard dog
      tf(mk(BOX(0.34, 0.3, 0.7), C('#9a44c8'), body, 0, 0.42, 0, E), 0, 0, 0);
      mk(BOX(0.28, 0.26, 0.3), C('#7ddc5a'), body, 0, 0.62, 0.42, E);
      mk(BOX(0.16, 0.12, 0.14), C('#7ddc5a'), body, 0, 0.56, 0.62, E);
      for (let i = 0; i < 3; i++) { mk(SPH(0.04, 5, 4), '#fff36b', body, -0.08 + i * 0.08, 0.7 + (i === 1 ? 0.03 : 0), 0.57, { emissive: '#887700' }); }
      for (const s of [-1, 1]) tf(mk(CONE(0.05, 0.14, 4), C('#7ddc5a'), body, s * 0.1, 0.8, 0.38, E), 0, 0, -s * 0.3);
      mk(TOR(0.16, 0.03, 4, 10), '#ffd23f', body, 0, 0.5, 0.3, { emissive: '#665500' }).rotation.x = PI / 2;
      tf(mk(CYL(0.03, 0.02, 0.36, 4), C('#6a2a8a'), body, 0, 0.55, -0.45), -0.7, 0, 0);
      for (const [x, z] of [[-0.12, 0.25], [0.12, 0.25], [-0.12, -0.25], [0.12, -0.25]]) leg(x, z, 0.28, '#4a1a6a');
      hit = 0.55;
      break;
    /* ----- Spookulon ----- */
    case 'batlet': // a space bat: flaps about just off the ground
      hover = 1; hy = 0.85; hit = 0.42; wings = [];
      tf(mk(SPH(0.22, 8, 6), C('#9b5de5'), body, 0, 0.8, 0, gold ? E : { emissive: '#2a0a4a' }), 0, 0, 0, 1, 1.1, 1);
      mk(SPH(0.16, 8, 6), C('#b07cf0'), body, 0, 1.02, 0.1, gold ? E : { emissive: '#2a0a4a' });
      for (const s of [-1, 1]) {
        tf(mk(CONE(0.07, 0.2, 4), C('#b07cf0'), body, s * 0.1, 1.2, 0.08, E), 0, 0, -s * 0.25);
        mk(SPH(0.035, 5, 4), '#ff3d3d', body, s * 0.06, 1.05, 0.24, { emissive: '#aa0000' });
        mk(CONE(0.015, 0.05, 3), '#ffffff', body, s * 0.03, 0.94, 0.24).rotation.x = PI;
        const w = grp(body, s * 0.18, 0.85, 0);
        mk(BOX(0.5, 0.03, 0.34), C('#7a3ad0'), w, s * 0.26, 0, 0, E);
        tf(mk(BOX(0.3, 0.03, 0.22), C('#7a3ad0'), w, s * 0.55, 0, -0.08, E), 0, s * 0.4, 0);
        wings.push(w);
      }
      break;
    case 'skelly': { // Skele-Tom: a skeleton in a tiny top hat
      const bone = C('#f2efe6');
      mk(SPH(0.2, 8, 6), bone, body, 0, 1.0, 0.02, E);
      mk(BOX(0.22, 0.1, 0.16), bone, body, 0, 0.86, 0.06, E);
      for (const s of [-1, 1]) mk(SPH(0.055, 5, 4), '#1a1620', body, s * 0.08, 1.02, 0.17);
      mk(CYL(0.035, 0.035, 0.36, 5), bone, body, 0, 0.62, 0, E);
      for (let i = 0; i < 3; i++) tf(mk(TOR(0.12 - i * 0.015, 0.02, 4, 10), bone, body, 0, 0.72 - i * 0.08, 0.02, E), PI / 2);
      mk(BOX(0.24, 0.06, 0.1), bone, body, 0, 0.44, 0, E);
      for (const s of [-1, 1]) { const a = grp(body, s * 0.16, 0.78, 0); mk(CYL(0.025, 0.025, 0.36, 4), bone, a, 0, -0.18, 0, E); legs.push(a); }
      leg(-0.08, 0, 0.42, '#f2efe6'); leg(0.08, 0, 0.42, '#f2efe6');
      const hat = buildHat('tophat'); hat.scale.setScalar(0.42); hat.position.set(0.03, 1.17, 0); hat.rotation.z = -0.2; body.add(hat);
      hit = 0.5; hy = 0.65;
      break;
    }
    case 'pumpkin': { // a jack-o'-lantern on little vine legs (it's always scared, so it's always lit)
      tf(mk(SPH(0.32, 10, 8), C('#ff8a1f'), body, 0, 0.5, 0, E), 0, 0, 0, 1.1, 0.85, 1);
      for (let i = 0; i < 3; i++) tf(mk(SPH(0.32, 10, 8), C('#e8741a'), body, 0, 0.5, 0, E), 0, (i / 3) * PI, 0, 0.4, 0.87, 1.12);
      mk(CYL(0.04, 0.06, 0.16, 5), '#3f6a2a', body, 0, 0.8, 0);
      const lit = { emissive: '#ffaa00' };
      for (const s of [-1, 1]) tf(mk(CONE(0.06, 0.09, 3), '#ffe066', body, s * 0.1, 0.56, 0.3, lit), PI / 2, 0, 0);
      mk(BOX(0.22, 0.05, 0.04), '#ffe066', body, 0, 0.42, 0.3, lit);
      for (const [x, z] of [[-0.18, 0.12], [0.18, 0.12], [-0.18, -0.12], [0.18, -0.12]]) leg(x, z, 0.26, '#3f6a2a');
      hit = 0.42; hy = 0.5;
      break;
    }
    case 'grub': // a pale grave grub with far too many teeth
      for (let i = 0; i < 5; i++) mk(SPH(0.19 - i * 0.025, 8, 6), C(i % 2 ? '#c9b8c0' : '#dccad2'), body, 0, 0.17 - i * 0.01, 0.26 - i * 0.17, E);
      mk(CYL(0.1, 0.12, 0.06, 10), '#3a1a24', body, 0, 0.2, 0.44).rotation.x = PI / 2;
      for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; mk(CONE(0.02, 0.06, 3), '#ffffff', body, Math.cos(a) * 0.08, 0.2 + Math.sin(a) * 0.08, 0.46).rotation.x = PI / 2; }
      for (const s of [-1, 1]) mk(SPH(0.04, 5, 4), '#111111', body, s * 0.1, 0.3, 0.36);
      hit = 0.4; hy = 0.22;
      break;
    /* ----- Nimbus-9 ----- */
    case 'puff': // a tiny cloud with a face (it drizzles when it's sad)
      hover = 1; hy = 0.78; hit = 0.42;
      for (const [x, y, z, r] of [[0, 0.75, 0, 0.3], [0.24, 0.7, -0.02, 0.2], [-0.24, 0.7, 0, 0.21], [0.1, 0.92, -0.05, 0.2], [-0.1, 0.9, 0.02, 0.18]]) mk(ICO(r, 1), C('#7f8cc4'), body, x, y, z, E);
      eyes(0.8, 0.26, 0.09, 0.05);
      tf(mk(SPH(0.04, 5, 4), '#ff8fa3', body, 0, 0.7, 0.28), 0, 0, 0, 1.6, 0.6, 0.6);
      for (let i = 0; i < 3; i++) mk(BOX(0.025, 0.12, 0.025), '#9fd0ff', body, -0.12 + i * 0.12, 0.35 + (i % 2) * 0.08, 0);
      break;
    case 'gull': // a seagull. It wants your lunch. Then it wants you.
      tf(mk(SPH(0.26, 8, 6), C('#8d95a4'), body, 0, 0.42, 0, E), 0, 0, 0, 0.9, 0.85, 1.3);
      mk(SPH(0.16, 8, 6), C('#dde1e8'), body, 0, 0.64, 0.22, E);
      tf(mk(CONE(0.05, 0.2, 5), '#ffd23f', body, 0, 0.6, 0.44), PI / 2);
      mk(SPH(0.03, 5, 4), '#d6281b', body, 0, 0.56, 0.5);
      eyes(0.68, 0.33, 0.08, 0.035);
      for (const s of [-1, 1]) tf(mk(BOX(0.12, 0.03, 0.03), '#2a2a30', body, s * 0.08, 0.74, 0.35), 0, 0, s * 0.45);
      wings = [];
      for (const s of [-1, 1]) { const w = grp(body, s * 0.2, 0.5, 0); mk(BOX(0.46, 0.04, 0.3), C('#4f5664'), w, s * 0.22, 0, -0.04, E); mk(BOX(0.16, 0.045, 0.28), '#1e1e24', w, s * 0.46, 0, -0.06); wings.push(w); }
      tf(mk(BOX(0.2, 0.04, 0.22), C('#4f5664'), body, 0, 0.44, -0.36, E), 0.3, 0, 0);
      leg(-0.08, 0.02, 0.22, '#ff9a3d'); leg(0.08, 0.02, 0.22, '#ff9a3d');
      break;
    case 'kite': { // a kite that broke its string and never looked back
      hover = 1; hy = 1.0;
      const k = grp(body, 0, 1.0, 0); k.rotation.x = -0.3;
      tf(mk(OCT(0.45), C('#ff4b6e'), k, 0, 0, 0, E), 0, 0, 0, 0.8, 1.1, 0.1);
      tf(mk(OCT(0.46), C('#ffd23f'), k, 0, 0, -0.01, E), 0, 0, 0, 0.4, 1.12, 0.09);
      mk(BOX(0.02, 0.9, 0.02), '#6b4a2b', k, 0, 0, 0.05);
      mk(BOX(0.66, 0.02, 0.02), '#6b4a2b', k, 0, 0.12, 0.05);
      for (const s of [-1, 1]) { mk(SPH(0.05, 6, 5), '#ffffff', k, s * 0.1, 0.1, 0.07); mk(SPH(0.025, 5, 4), '#111111', k, s * 0.1, 0.1, 0.1); }
      for (let i = 0; i < 4; i++) {
        const t = grp(body, 0, 0.56 - i * 0.12, -0.12 - i * 0.05);
        mk(BOX(0.012, 0.13, 0.012), '#ffffff', t, 0, 0, 0);
        tf(mk(CONE(0.05, 0.1, 3), C(['#3aa7ff', '#46d98a'][i % 2]), t, 0, -0.06, 0, E), 0, 0, PI / 2, 1, 1, 0.3);
        legs.push(t);
      }
      break;
    }
    case 'spark': { // a little ball of lightning with a big attitude
      hover = 1; hy = 0.72; hit = 0.42;
      mk(ICO(0.24, 1), C('#ffc400'), body, 0, 0.72, 0, gold ? E : { emissive: '#aa6a00' });
      const sp = grp(body, 0, 0.72, 0);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; tf(mk(OCT(0.07), '#bff6ff', sp, Math.cos(a) * 0.36, i % 2 ? 0.1 : -0.1, Math.sin(a) * 0.36, { emissive: '#3aa7ff' }), 0, 0, 0, 0.6, 2.2, 0.6); }
      body.userData.spark = sp;
      eyes(0.78, 0.2, 0.08, 0.05);
      for (const s of [-1, 1]) tf(mk(BOX(0.1, 0.03, 0.03), '#2a2a30', body, s * 0.08, 0.88, 0.22), 0, 0, s * 0.5);
      break;
    }
    /* ----- Gigopolis ----- */
    case 'drone': // quit its delivery job, kept the parcel
      hover = 1; hy = 1.0; rotors = [];
      mk(BOX(0.36, 0.14, 0.36), C('#ffc629'), body, 0, 1.0, 0, E);
      mk(SPH(0.07, 6, 5), '#ff3d3d', body, 0, 0.98, 0.19, { emissive: '#aa0000' });
      for (const a of [PI / 4, -PI / 4]) tf(mk(BOX(0.95, 0.04, 0.05), C('#6d7480'), body, 0, 1.04, 0, E), 0, a, 0);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const r = grp(body, x * 0.33, 1.12, z * 0.33);
        mk(CYL(0.02, 0.02, 0.08, 4), '#3b3f4a', r, 0, -0.04, 0);
        mk(BOX(0.36, 0.01, 0.05), '#dfe6ee', r, 0, 0, 0);
        rotors.push(r);
      }
      mk(BOX(0.22, 0.2, 0.22), '#c9a36b', body, 0, 0.72, 0);
      mk(BOX(0.23, 0.04, 0.05), '#e8d8a0', body, 0, 0.82, 0);
      mk(CYL(0.006, 0.006, 0.12, 3), '#3b3f4a', body, 0, 0.88, 0);
      break;
    case 'panda': { // a trash panda (related to Trevor? Trevor says no)
      tf(mk(SPH(0.3, 8, 6), C('#b3b8c3'), body, 0, 0.36, -0.05, E), 0, 0, 0, 1, 0.85, 1.35);
      mk(SPH(0.2, 8, 6), C('#c8ccd5'), body, 0, 0.5, 0.34, E);
      mk(BOX(0.34, 0.08, 0.08), '#2a2a30', body, 0, 0.54, 0.47);
      eyes(0.55, 0.5, 0.08, 0.035);
      tf(mk(SPH(0.08, 6, 5), C('#c9ced6'), body, 0, 0.44, 0.5, E), 0, 0, 0, 1, 0.8, 1);
      mk(SPH(0.03, 5, 4), '#111111', body, 0, 0.46, 0.58);
      for (const s of [-1, 1]) mk(CONE(0.06, 0.12, 4), C('#8a8f98'), body, s * 0.12, 0.7, 0.32, E);
      const tl = grp(body, 0, 0.42, -0.4); tl.rotation.x = 0.6;
      for (let i = 0; i < 4; i++) tf(mk(CYL(0.08, 0.07, 0.13, 8), i % 2 ? '#2a2a30' : C('#9aa0a8'), tl, 0, 0, -0.06 - i * 0.13, i % 2 ? undefined : E), PI / 2);
      for (const [x, z] of [[-0.14, 0.2], [0.14, 0.2], [-0.14, -0.26], [0.14, -0.26]]) leg(x, z, 0.2, '#2a2a30');
      hit = 0.5;
      break;
    }
    case 'intern': // Unpaid Intern Bot: works for exposure, runs from responsibility
      mk(BOX(0.34, 0.36, 0.24), C('#dfe6ee'), body, 0, 0.5, 0, E);
      mk(BOX(0.36, 0.3, 0.3), C('#dfe6ee'), body, 0, 0.88, 0, E);
      mk(BOX(0.28, 0.18, 0.02), '#1a2a3a', body, 0, 0.88, 0.16);
      for (const s of [-1, 1]) {
        tf(mk(BOX(0.06, 0.03, 0.01), '#7dfff0', body, s * 0.07, 0.92, 0.172, { emissive: '#1a8a8a' }), 0, 0, -s * 0.35);
        const a = grp(body, s * 0.22, 0.62, 0); mk(BOX(0.06, 0.22, 0.06), C('#9aa3ad'), a, 0, -0.1, 0.04, E); legs.push(a);
      }
      mk(BOX(0.08, 0.02, 0.01), '#7dfff0', body, 0, 0.84, 0.172, { emissive: '#1a8a8a' });
      mk(BOX(0.1, 0.12, 0.02), '#ffffff', body, 0, 0.48, 0.13);
      tf(mk(BOX(0.02, 0.2, 0.01), '#d6281b', body, -0.05, 0.62, 0.125), 0, 0, 0.3);
      tf(mk(BOX(0.02, 0.2, 0.01), '#d6281b', body, 0.05, 0.62, 0.125), 0, 0, -0.3);
      mk(CYL(0.05, 0.04, 0.1, 6), '#ffffff', body, 0.24, 0.46, 0.1);
      leg(-0.08, 0, 0.32, '#3b3f4a'); leg(0.08, 0, 0.32, '#3b3f4a');
      hit = 0.5;
      break;
    case 'scooter': // an abandoned e-scooter that went feral
      rolls = [];
      mk(BOX(0.2, 0.06, 0.8), C('#3ddc84'), body, 0, 0.16, 0, E);
      tf(mk(CYL(0.025, 0.025, 0.95, 6), C('#9aa3ad'), body, 0, 0.62, 0.36, E), -0.12, 0, 0);
      mk(BOX(0.5, 0.04, 0.04), C('#3ddc84'), body, 0, 1.08, 0.42, E);
      for (const s of [-1, 1]) {
        tf(mk(CYL(0.035, 0.035, 0.1, 6), '#1a1a1a', body, s * 0.26, 1.08, 0.42), 0, 0, PI / 2);
        tf(mk(BOX(0.1, 0.025, 0.03), '#1a1a1a', body, s * 0.06, 0.98, 0.47), 0, 0, s * 0.4);
      }
      mk(BOX(0.18, 0.07, 0.06), '#fff6d0', body, 0, 0.9, 0.45, { emissive: '#ffe08a' });
      mk(BOX(0.16, 0.03, 0.03), '#46d98a', body, 0, 0.2, -0.3, { emissive: '#1a8a4a' });
      for (const z of [-0.36, 0.36]) { const w = grp(body, 0, 0.1, z); tf(mk(CYL(0.1, 0.1, 0.06, 10), '#1a1a1a', w, 0, 0, 0), 0, 0, PI / 2); mk(BOX(0.065, 0.04, 0.04), '#9aa3ad', w, 0, 0.06, 0); rolls.push(w); }
      hit = 0.5; hy = 0.5;
      break;
  }
  if (gold) { const sp = mk(OCT(0.08), '#fff6b0', root, 0, 1.0, 0, { emissive: '#ffcc00' }); sp.castShadow = false; body.userData.spark = sp; }
  // head: [x, y, z, radius] of its head, for headshots (no eyes: the top front of it)
  if (!head) head = [0, (hy != null ? hy : hit * 0.8) + hit * 0.5, hit * 0.3, hit * 0.5];
  return { root, body, legs, hit, hy, hover, wings, rotors, rolls, head };
}

/* ---------------- tools (first-person) ---------------- */
// a pizza cutter wheel (in the Pizza Cutter gun, and flying through the air). Its axle points along x.
function buildCutterWheel(parent, r = 0.11) {
  const w = grp(parent);
  tf(mk(CYL(r, r, 0.014, 24), '#a4afbb', w, 0, 0, 0), 0, 0, PI / 2);
  tf(mk(CYL(r * 0.62, r * 0.62, 0.02, 20), '#7f8a96', w, 0, 0, 0), 0, 0, PI / 2);
  tf(mk(TOR(r, 0.006, 4, 24), '#f4f8fc', w, 0, 0, 0), 0, PI / 2, 0);
  tf(mk(CYL(r * 0.3, r * 0.3, 0.04, 10), '#d6281b', w, 0, 0, 0), 0, 0, PI / 2);
  return w;
}
// every gun is its own thing (see ZAPPERS). Points down -z; userData.muzzle is where shots come out.
function buildZapperVM(lvl = 0) {
  const z = gunDef(lvl), g = GunDesigns.build(z.type), muzzle = g.userData.muzzle;
  const map = flashTex(); map.userData.shared = true;
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), new THREE.MeshBasicMaterial({ map, color: z.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  flash.position.copy(muzzle.position); flash.position.z -= 0.04;
  flash.visible = false; flash.renderOrder = 5;
  g.add(flash); g.userData.flash = flash;
  return g;
}
let _flashTex = null;
function flashTex() {
  if (_flashTex) return _flashTex;
  _flashTex = canvasTex(128, 128, (c) => {
    const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr;
    c.beginPath();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, r = i % 2 ? 22 : 64; c.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); }
    c.fill();
  });
  return _flashTex;
}
// turbo: the upgraded Turbo Vac (red, racing stripe, fins, a hotter glow)
function buildVacVM(turbo) {
  if (turbo === 'spooky' || turbo === 2) return buildSpookyVacVM();
  const g = new THREE.Group();
  g.name = turbo ? 'Turbo cyclone vacuum' : 'Grabby cyclone vacuum';
  tf(mk(CYL(0.1, 0.1, 0.34, 8), turbo ? '#e0341f' : '#ffd23f', g, 0.02, -0.02, 0.05), PI / 2);
  if (turbo) {
    tf(mk(CYL(0.102, 0.102, 0.06, 8), '#ffffff', g, 0.02, -0.02, 0.05), PI / 2);
    for (const s of [-1, 1]) tf(mk(BOX(0.012, 0.09, 0.14), '#ffd23f', g, 0.02 + s * 0.1, 0.02, 0.1), 0, 0, s * 0.5);
  }
  tf(mk(BOX(0.08, 0.18, 0.1), '#3b3f4a', g, 0.02, -0.15, 0.1), 0.2);
  tf(mk(CYL(0.05, 0.05, 0.34, 6), '#9aa3ad', g, 0.02, 0.0, -0.26), PI / 2);
  const noz = tf(mk(CYL(turbo ? 0.15 : 0.13, 0.06, 0.2, 8), '#3b3f4a', g, 0.02, 0.0, -0.5), PI / 2);
  const glow = mk(CYL(0.11, 0.11, 0.02, 8), turbo ? '#7dfff0' : '#7dff8a', g, 0.02, 0, -0.61, { emissive: turbo ? '#1a8a8a' : '#1a8a2a' });
  glow.rotation.x = PI / 2;
  const muzzle = grp(g, 0.02, 0, -0.65);
  // Cyclone collector, reinforced cuffs, intake ribs and a readable charge gauge.
  mk(CYL(.095, .075, .19, 12), '#bce8e5', g, .02, .16, .04, { transparent: true, opacity: .7, depthWrite: false });
  mk(CYL(.06, .06, .16, 10), turbo ? '#ff8457' : '#7dff8a', g, .02, .16, .04, { emissive: '#235c38' });
  for (const y of [.06, .26]) mk(CYL(.106, .106, .025, 12), '#384653', g, .02, y, .04);
  for (const z of [-.16, -.27, -.38]) tf(mk(TOR(.06, .016, 5, 12), '#384653', g, .02, 0, z), 0);
  tf(mk(TOR(turbo ? .15 : .13, .018, 5, 16), turbo ? '#ffb34f' : '#e9f0dc', g, .02, 0, -.6), 0);
  mk(BOX(.018, .085, .16), '#24333c', g, .13, .005, .04);
  for (let i = 0; i < 4; i++) mk(BOX(.022, .012, .022), '#7dffea', g, .14, .005, -.01 + i * .035, { emissive: '#26736b' });
  for (const z of [-.03, .03, .09]) mk(BOX(.015, .09, .018), '#384653', g, -.086, -.02, z);
  tf(mk(TOR(.065, .018, 5, 12), '#384653', g, .02, -.13, -.005), 0, PI / 2);
  g.userData = { muzzle, noz, glow };
  return mergeLocal(g, [muzzle, noz, glow]);
}
// Spooky Vacuum: a portable ectoplasm trap. Same grip and intake anchors as
// the other vacuums, so suction effects and held-tool animation remain aligned.
function buildSpookyVacVM() {
  const g = new THREE.Group(); g.name = 'Spooky Vacuum';
  const shell = '#453450', metal = '#b3a0c2', dark = '#25232f', ecto = '#a6ffb1';
  tf(mk(BOX(.08, .18, .1), dark, g, .02, -.15, .1), .2);
  mk(BOX(.21, .18, .31), shell, g, .02, -.01, .035);
  for (const z of [-.105, .175]) mk(BOX(.235, .205, .035), metal, g, .02, -.01, z);
  const chamber = grp(g, .02, .18, .045);
  mk(CYL(.09, .09, .25, 14), '#c9fae4', chamber, 0, 0, 0, { transparent: true, opacity: .26, depthWrite: false });
  for (const y of [-.14, .14]) mk(CYL(.108, .108, .035, 12), metal, chamber, 0, y, 0);
  // A tiny captured ghost is visible through the green containment jar.
  tf(mk(SPH(.055, 10, 7), ecto, chamber, 0, .025, 0, { emissive: '#327c48' }), 0, 0, 0, 1, 1.25, 1);
  mk(CONE(.05, .09, 7), ecto, chamber, 0, -.055, 0, { emissive: '#327c48' }).rotation.z = PI;
  for (const x of [-.02, .02]) mk(SPH(.012, 6, 4), dark, chamber, x, .04, -.052);
  for (const side of [-1, 1]) mk(BOX(.018, .25, .018), shell, chamber, side * .09, 0, .025);
  tf(mk(CYL(.055, .065, .32, 10), dark, g, .02, 0, -.28), PI / 2);
  for (const z of [-.17, -.24, -.31, -.38]) mk(TOR(.06, .012, 5, 12), metal, g, .02, 0, z);
  const noz = tf(mk(CYL(.15, .06, .19, 12), shell, g, .02, 0, -.5), PI / 2);
  mk(TOR(.15, .018, 5, 16), metal, g, .02, 0, -.6);
  const glow = tf(mk(CYL(.127, .127, .012, 12), ecto, g, .02, 0, -.607, { emissive: '#397f45' }), PI / 2);
  // Toothlike intake guards and a rune on each side of the trap.
  for (const a of [0, PI / 2, PI, PI * 1.5]) {
    const tooth = mk(CONE(.019, .05, 5), '#e1d5bd', g, .02 + Math.cos(a) * .128, Math.sin(a) * .128, -.62);
    tooth.rotation.z = a + PI / 2;
  }
  for (const side of [-1, 1]) {
    const rune = grp(g, .135 * side + .02, 0, .035);
    mk(BOX(.009, .08, .014), ecto, rune, 0, 0, 0, { emissive: '#397f45' });
    mk(BOX(.009, .014, .07), ecto, rune, 0, .013, 0, { emissive: '#397f45' });
  }
  const muzzle = grp(g, .02, 0, -.65);
  g.userData = { muzzle, noz, glow };
  return mergeLocal(g, [muzzle, noz, glow]);
}
function buildDrillVM() {
  const g = new THREE.Group();
  g.name = 'Laser drill — survey rig';
  tf(mk(BOX(0.09, 0.2, 0.11), '#3b3f4a', g, 0, -0.12, 0.08), 0.25);
  mk(BOX(0.16, 0.16, 0.3), '#9fe3ff', g, 0, 0.02, 0);
  const bit = grp(g, 0, 0.02, -0.18);
  tf(mk(CONE(0.08, 0.34, 6), '#c9d2da', bit, 0, 0, -0.17), -PI / 2);
  const tip = mk(SPH(0.03, 5, 4), '#7dffff', bit, 0, 0, -0.35, { emissive: '#00aaff' });
  const muzzle = grp(g, 0, 0.02, -0.55);
  tf(mk(CYL(.11, .11, .1, 12), '#33434f', g, 0, .02, -.13), PI / 2);
  for (let i = 0; i < 4; i++) tf(mk(TOR(.075 - i * .014, .013, 5, 12), '#566879', bit, 0, 0, -.04 - i * .065), 0, .2);
  for (const side of [-1, 1]) {
    mk(BOX(.03, .19, .24), '#edf4f5', g, side * .1, .02, .015);
    for (let i = 0; i < 4; i++) mk(BOX(.04, .11, .016), '#33434f', g, side * .12, .02, -.06 + i * .045);
    mk(BOX(.035, .03, .21), '#ffb34f', g, side * .1, -.085, .01);
  }
  mk(BOX(.085, .035, .15), '#33434f', g, 0, .125, .015);
  mk(BOX(.06, .01, .1), '#7dffff', g, 0, .147, .015, { emissive: '#15778a' });
  tf(mk(CYL(.065, .065, .14, 10), '#ffb34f', g, 0, -.17, -.06), PI / 2);
  g.userData = { bit, tip, muzzle };
  mergeLocal(bit, [tip]);
  return mergeLocal(g, [bit, muzzle]);
}
function buildPeelVM() {
  const g = new THREE.Group();
  g.name = 'Pizza peel — delivery edition';
  tf(mk(BOX(0.07, 0.18, 0.09), '#3b3f4a', g, 0, -0.1, 0.1), 0.3);
  tf(mk(CYL(0.025, 0.03, 0.34, 6), '#8a5a2b', g, 0, -0.01, -0.05), PI / 2);
  const board = grp(g, 0, 0, -0.36);
  mk(CYL(0.2, 0.2, 0.02, 14), '#d9a066', board, 0, 0, 0);
  mk(BOX(0.1, 0.02, 0.14), '#d9a066', board, 0, 0, 0.2);
  // a sad little pepperoni someone left on it
  mk(CYL(0.035, 0.035, 0.012, 8), '#c8321e', board, 0.07, 0.015, -0.04);
  const muzzle = grp(g, 0, 0, -0.5);
  tf(mk(TOR(.2, .012, 5, 20), '#dde5e7', board, 0, .005, 0), PI / 2);
  for (const x of [-.11, -.055, 0, .055, .11]) mk(BOX(.009, .003, .23), '#a97445', board, x, .012, 0);
  mk(BOX(.11, .01, .14), '#dde5e7', board, 0, .016, .17);
  for (const x of [-.035, .035]) mk(CYL(.011, .011, .015, 6), '#596772', board, x, .027, .17);
  for (const z of [-.14, -.09, -.04, .01]) tf(mk(TOR(.03, .008, 4, 10), '#c44532', g, 0, -.01, z), 0);
  tf(mk(TOR(.04, .01, 5, 12), '#dde5e7', g, 0, -.04, .15), PI / 2);
  g.userData = { board, muzzle };
  mergeLocal(board);
  return mergeLocal(g, [board, muzzle]);
}

/* ---------------- first-person hands (your suit's gloves and sleeves) ---------------- */
// (dark gloves like your goober's mittens, with a cuff in your accent color; cuff: that material.
//  sleeve: your suit's material)
const SLEEVE = '#f4f1ea';
// a rounded rod from a to b (a finger, a thumb, a wrist)
function capsule(parent, a, b, r, color) {
  const d = b.clone().sub(a), len = d.length() || 0.001;
  const g = grp(parent, a.x, a.y, a.z);
  g.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.divideScalar(len));
  mk(CYL(r, r, len, 10), color, g, 0, len / 2, 0);
  mk(SPH(r), color, g, 0, len, 0);
  mk(SPH(r), color, g, 0, 0, 0);
  return g;
}
// the glove's wrist, the cuff and the sleeve, from `at` heading off along `dir` (out of view)
function forearm(g, at, dir, cuff, sleeve) {
  const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir);
  const put = (m, d) => { m.position.copy(at).addScaledVector(dir, d); m.quaternion.copy(q); };
  put(mk(CYL(0.045, 0.054, 0.075, 16), GOOB.dark, g), 0.02);
  put(mk(TOR(0.052, 0.014, 8, 20).rotateX(Math.PI / 2), cuff, g), 0.06); // (a ring round the wrist)
  put(mk(CYL(0.062, 0.08, 0.6, 16), sleeve || SLEEVE, g), 0.365);
}
// a right hand around a pistol grip. The group sits in the middle of the grip, tilted like it: the grip
// runs along y and the fingers wrap around its front (-z). gw, gd: how wide and deep the grip is.
function buildGripHand(cuff, gw = 0.07, gd = 0.09, sleeve) {
  return withHi(null, () => {
    const g = new THREE.Group(), hx = gw / 2, hz = gd / 2, glove = GOOB.dark;
    tf(mk(roundBox(0.048, 0.112, 0.122, 0.021), glove, g, hx + 0.02, 0.012, 0.006), 0, -0.12, 0); // the back of the hand, on the right side
    mk(roundBox(gw + 0.036, 0.104, 0.046, 0.019), glove, g, 0.008, 0.01, hz + 0.019); // the heel of the hand, behind
    // four fingers curled around the front (a knuckle, then across to the left side)
    for (let i = 0; i < 4; i++) {
      const y = 0.047 - i * 0.03, r = i === 3 ? 0.0125 : 0.0145;
      const k0 = new V3(hx + 0.022, y, -hz + 0.012), k1 = new V3(hx + 0.002, y - 0.002, -hz - 0.014), tip = new V3(-hx + 0.004, y - 0.006, -hz - 0.012);
      capsule(g, k0, k1, r, glove);
      capsule(g, k1, tip, r, glove);
    }
    // the thumb, along the left side toward the front
    capsule(g, new V3(-hx + 0.006, 0.062, hz + 0.016), new V3(-hx - 0.014, 0.05, -hz + 0.012), 0.017, glove);
    forearm(g, new V3(0.022, -0.03, hz + 0.03), new V3(0.42, -0.6, 0.68).normalize(), cuff, sleeve);
    mergeLocal(g);
    return g;
  });
}
// a left hand holding something up from underneath (a barrel, a pump, a tube): the group sits on its
// middle line; R: how far down its underside is, W: half its width
function buildSupportHand(cuff, R, W, sleeve) {
  return withHi(null, () => {
    const g = new THREE.Group(), glove = GOOB.dark;
    mk(roundBox(W * 2 + 0.03, 0.036, 0.104, 0.016), glove, g, -0.006, -R - 0.02, 0.006); // the palm, underneath
    // fingers curling up the right side (out a little, then hugging it; never more than a finger's length)
    const top = Math.max(-R * 0.1, -R - 0.014 + 0.08);
    for (let i = 0; i < 4; i++) {
      const z = -0.04 + i * 0.027, r = i === 0 ? 0.0125 : 0.014;
      const base = new V3(W - 0.004, -R - 0.014, z), mid = new V3(W + 0.014, (base.y + top) / 2, z - 0.004), tip = new V3(W + 0.006, top, z - 0.008);
      capsule(g, base, mid, r, glove);
      capsule(g, mid, tip, r, glove);
    }
    // the thumb, lying along the left side
    capsule(g, new V3(-W - 0.006, -R - 0.008, 0.036), new V3(-W - 0.012, Math.max(-R * 0.4, -R - 0.008 + 0.045), -0.022), 0.016, glove);
    forearm(g, new V3(-0.02, -R - 0.032, 0.05), new V3(-0.5, -0.42, 0.76).normalize(), cuff, sleeve);
    mergeLocal(g);
    return g;
  });
}
// where the hands go on each thing you can hold (in its own coordinates).
// grip: [x, y, z, tilt, width, depth] of the pistol grip (the right hand); support: [x, y, z, R, W] for the
// left hand, underneath a barrel or tube (none for one-handed guns)
const HAND_SPEC = {
  zap: { grip: [0, -0.1, 0.08, 0.3, 0.07, 0.09] },
  spread: { support: [0, -0.01, -0.22, 0.025, 0.045] },
  lob: { support: [0, 0.04, -0.2, 0.085, 0.08] },
  beam: { support: [0, 0.03, -0.1, 0.055, 0.055] },
  chain: { support: [0, 0.03, -0.13, 0.058, 0.058] },
  rocket: { support: [0, 0.05, -0.24, 0.078, 0.075] },
  cutter: { support: [0, 0.02, -0.15, 0.03, 0.04] },
  vac: { grip: [0.02, -0.15, 0.1, 0.2, 0.08, 0.1], support: [0.02, 0, -0.24, 0.05, 0.05] },
  drill: { grip: [0, -0.12, 0.08, 0.25, 0.09, 0.11], support: [0, 0.02, -0.08, 0.08, 0.08] },
  peel: { grip: [0, -0.1, 0.1, 0.3, 0.07, 0.09], support: [0, -0.01, -0.13, 0.03, 0.03] },
};
// put a tool in a goober's hand (m.hand, see buildAstronaut): its grip in the mitten, the barrel down the
// forearm. kind: 'vac', 'drill', 'peel' or 'zap' (any gun)
function gripTool(hand, t, kind) {
  const g = (HAND_SPEC[kind] && HAND_SPEC[kind].grip) || HAND_SPEC.zap.grip;
  t.rotation.set(0, 0, 0);
  t.scale.setScalar(1);
  t.position.set(-g[0], -g[1], -g[2]);
  hand.add(t);
  return t;
}
// put your hands on something you're holding (kind: 'vac', 'drill', 'peel', or a gun type; cuff, sleeve:
// the cuff and sleeve materials, in your colors)
function addHands(vm, kind, cuff, sleeve) {
  const spec = vm.userData.handSpec || HAND_SPEC[kind] || {}, gp = spec.grip || HAND_SPEC.zap.grip, hands = {};
  hands.grip = buildGripHand(cuff, gp[4], gp[5], sleeve);
  hands.grip.position.set(gp[0], gp[1], gp[2]);
  hands.grip.rotation.x = gp[3];
  vm.add(hands.grip);
  if (spec.support) {
    const s = spec.support;
    hands.support = buildSupportHand(cuff, s[3], s[4], sleeve);
    hands.support.position.set(s[0], s[1], s[2]);
    hands.support.userData.home = hands.support.position.clone();
    vm.add(hands.support);
  } else if (vm.userData.parts) { // (a one-handed gun: your other hand only comes up to reload it, see GunReload)
    hands.free = buildSupportHand(cuff, 0.03, 0.035, sleeve);
    hands.free.visible = false;
    vm.add(hands.free);
  }
  vm.userData.hands = hands;
  return hands;
}

/* ---------------- bosses (return {root, body, hit:[{o,r}], ...}) ---------------- */
// bosses are built in smooth mode (rounded shapes, smooth shading, rim light), then every
// part that moves on its own keeps its own group and the rest is glued together per group
function buildBossModel(id) {
  const m = withHi('boss', () => {
    switch (id) {
      case 'gary': return buildGary();
      case 'blorb': return buildBlorb();
      case 'jerry': return buildJerry();
      case 'snowdad': return buildSnowdad();
      case 'count': return buildCount();
      case 'stormy': return buildStormy();
      case 'chad': return buildChad();
      case 'zorblax': return buildZorblax();
    }
  });
  mergeParts(m.root, m);
  return m;
}
// glue each group's static meshes together, leaving alone the parts listed in `parts`
// (the named Object3Ds and arrays of them a model hands back for animating)
function mergeParts(root, parts) {
  const moving = new Set();
  for (const [k, v] of Object.entries(parts)) {
    if (k === 'root') continue;
    for (const o of Array.isArray(v) ? v : [v]) if (o && o.isObject3D) moving.add(o);
  }
  for (const g of [root, ...moving]) {
    if (g.isMesh) continue;
    mergeLocal(g, [...moving].filter((o) => o !== g));
  }
  // they still cast shadows, but don't take them: the toon shading does that job, and smooth
  // curved surfaces would pick up shadow speckles
  root.traverse((c) => { if (c.isMesh) c.receiveShadow = false; });
}

function buildGary() {
  const root = new THREE.Group(), body = grp(root);
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = grp(body, s * 0.9, 1.7, 0);
    mk(CYL(0.36, 0.42, 1.6, 8), '#5b6b4f', leg, 0, -0.8, 0);
    mk(BOX(0.95, 0.5, 1.3), '#3a2e26', leg, 0, -1.5, 0.25);
    legs.push(leg);
  }
  mk(CYL(1.7, 1.5, 3.4, 12), '#7f8f75', body, 0, 3.4, 0);
  for (const y of [2.3, 3.4, 4.5]) tf(mk(TOR(1.62, 0.09, 4, 16), '#66755c', body, 0, y, 0), PI / 2);
  const lid = grp(body, 0.2, 5.2, 0); lid.rotation.z = 0.25;
  mk(CYL(1.85, 1.85, 0.25, 12), '#8fa085', lid, 0, 0, 0);
  tf(mk(TOR(0.35, 0.08, 4, 10), '#66755c', lid, 0, 0.2, 0), 0, 0, 0);
  mk(CYL(0.62, 0.5, 0.55, 6), '#ffd23f', lid, 0.1, 0.45, 0);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; mk(CONE(0.12, 0.35, 4), '#ffd23f', lid, 0.1 + Math.sin(a) * 0.55, 0.85, Math.cos(a) * 0.55); }
  tf(mk(BOX(0.8, 0.08, 0.3), '#ffe066', lid, -0.9, 0.18, 0.4), 0, 0.6, 0);
  tf(mk(BOX(0.6, 0.08, 0.25), '#ffe066', lid, -0.7, 0.18, 0.7), 0, -0.4, 0);
  for (const s of [-1, 1]) mk(SPH(0.25, 6, 5), '#fff36b', body, s * 0.55, 4.8, 1.45, { emissive: '#aa9900' });
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = grp(body, s * 2.0, 4.2, 0);
    for (let i = 0; i < 3; i++) tf(mk(TOR(0.42, 0.2, 5, 10), '#2a2a2a', arm, 0, -0.35 - i * 0.6, 0), PI / 2);
    // a full trash bag for a fist (tied at the top)
    tf(mk(SPH(0.72), '#1f2a1f', arm, 0, -2.35, 0.2), 0.2, 0, 0, 1, 0.92, 1.05);
    tf(mk(CONE(0.26, 0.42, 8), '#1f2a1f', arm, 0, -1.6, 0.2), PI);
    mk(SPH(0.13), '#2c3a2c', arm, 0, -1.74, 0.2);
    arms.push(arm);
  }
  const flies = [];
  for (let i = 0; i < 4; i++) flies.push(mk(SPH(0.08, 4, 3), '#111111', root, 0, 6, 0));
  return { root, body, arms, legs, lid, flies, hit: [{ o: new V3(0, 3.4, 0), r: 2.0 }, { o: new V3(0, 5.3, 0), r: 1.4 }], mouth: new V3(0, 4.8, 1.6) };
}

function buildBlorb() {
  const root = new THREE.Group(), body = grp(root);
  tf(mk(SPH(2.8, 14, 10), '#ff5fb8', body, 0, 2.4, 0), 0, 0, 0, 1, 0.85, 1);
  tf(mk(SPH(0.7, 8, 6), '#ffc2e6', body, -1.0, 3.8, 1.6), 0, 0, 0, 1, 0.6, 0.4);
  for (const s of [-1, 1]) {
    mk(SPH(0.55, 8, 6), '#ffffff', body, s * 0.8, 3.1, 2.2);
    mk(SPH(0.28, 6, 5), '#111111', body, s * 0.8, 3.1, 2.7);
    for (let i = 0; i < 3; i++) tf(mk(BOX(0.06, 0.3, 0.06), '#111111', body, s * (0.55 + i * 0.25), 3.7, 2.35), 0, 0, s * (0.5 - i * 0.4));
  }
  tf(mk(TOR(0.42, 0.13, 5, 12), '#c81d5a', body, 0, 2.05, 2.55), 0, 0, 0, 1, 0.5, 1);
  const crown = grp(body, 0, 4.6, 0);
  mk(CYL(0.9, 0.8, 0.6, 8), '#ffd23f', crown, 0, 0, 0);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; mk(CONE(0.15, 0.45, 4), '#ffd23f', crown, Math.sin(a) * 0.85, 0.45, Math.cos(a) * 0.85); }
  mk(OCT(0.22), '#3aa7ff', crown, 0, 0.1, 0.85, { emissive: '#0a4a8a' });
  return { root, body, crown, hit: [{ o: new V3(0, 2.4, 0), r: 2.8 }], mouth: new V3(0, 2.2, 2.6) };
}

const JERRY_SYMS = ['cherry', 'bell', '7', 'cash', 'lemon', 'skull'];
// reel symbols drawn as shapes so they look the same on every computer
function drawSlotSym(c, s, x, y, u) {
  c.save(); c.translate(x, y); c.lineWidth = u * 0.08; c.strokeStyle = '#1a1a2a'; c.lineJoin = 'round';
  const disc = (px, py, r, col) => { c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fillStyle = col; c.fill(); c.stroke(); };
  if (s === 'cherry') {
    c.beginPath(); c.moveTo(-u * 0.25, u * 0.1); c.quadraticCurveTo(-u * 0.1, -u * 0.35, u * 0.15, -u * 0.45); c.moveTo(u * 0.25, u * 0.15); c.quadraticCurveTo(u * 0.2, -u * 0.2, u * 0.15, -u * 0.45);
    c.strokeStyle = '#2f7a2a'; c.stroke(); c.strokeStyle = '#1a1a2a';
    disc(-u * 0.25, u * 0.22, u * 0.2, '#d6281b'); disc(u * 0.25, u * 0.27, u * 0.2, '#d6281b');
  } else if (s === 'bell') {
    c.beginPath(); c.moveTo(-u * 0.38, u * 0.28); c.quadraticCurveTo(-u * 0.3, -u * 0.4, 0, -u * 0.42); c.quadraticCurveTo(u * 0.3, -u * 0.4, u * 0.38, u * 0.28); c.closePath();
    c.fillStyle = '#ffc21a'; c.fill(); c.stroke(); disc(0, u * 0.36, u * 0.09, '#ffc21a');
  } else if (s === 'lemon') {
    c.beginPath(); c.ellipse(0, 0, u * 0.42, u * 0.28, -0.3, 0, Math.PI * 2); c.fillStyle = '#ffe23a'; c.fill(); c.stroke();
  } else if (s === 'skull') {
    disc(0, -u * 0.08, u * 0.34, '#f2efe6'); c.fillStyle = '#f2efe6'; c.fillRect(-u * 0.18, u * 0.12, u * 0.36, u * 0.24); c.strokeRect(-u * 0.18, u * 0.12, u * 0.36, u * 0.24);
    c.fillStyle = '#1a1a2a'; c.beginPath(); c.arc(-u * 0.13, -u * 0.08, u * 0.08, 0, 7); c.arc(u * 0.13, -u * 0.08, u * 0.08, 0, 7); c.fill();
  } else {
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `900 ${u * (s === '7' ? 1.0 : 0.85)}px ${FONT}`; c.fillStyle = s === '7' ? '#d6281b' : '#1f9d4a';
    c.fillText(s === 'cash' ? '$' : s, 0, u * 0.04);
  }
  c.restore();
}
function drawJerryReels(tex, syms, spinning) {
  const cv = tex.userData.canvas, c = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  c.fillStyle = '#1a1a2a'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 3; i++) {
    const x = 12 + i * ((w - 24) / 3);
    c.fillStyle = '#fff8e6'; roundRect(c, x + 6, 14, (w - 24) / 3 - 12, h - 28, 18); c.fill();
    const s = spinning ? JERRY_SYMS[Math.floor(Math.random() * JERRY_SYMS.length)] : syms[i];
    drawSlotSym(c, s, x + (w - 24) / 6, h / 2 + 4, h * 0.62);
  }
  tex.needsUpdate = true;
}
function buildJerry() {
  const root = new THREE.Group(), body = grp(root);
  mk(CYL(2.2, 2.6, 0.8, 10), '#3b3f4a', body, 0, 0.4, 0);
  tf(mk(TOR(2.3, 0.12, 4, 20), '#3df0ff', body, 0, 0.05, 0, { emissive: '#00aacc' }), PI / 2);
  mk(BOX(4, 4.6, 2.6), '#d6281b', body, 0, 3.1, 0);
  for (const s of [-1, 1]) mk(BOX(0.25, 4.7, 2.7), '#ffd23f', body, s * 2.0, 3.1, 0);
  mk(BOX(4.3, 0.3, 2.9), '#ffd23f', body, 0, 5.45, 0);
  const tex = canvasTex(512, 224, () => {});
  drawJerryReels(tex, ['7', '7', '7'], false);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.45), new THREE.MeshBasicMaterial({ map: tex }));
  screen.position.set(0, 3.5, 1.31); body.add(screen);
  for (const s of [-1, 1]) {
    mk(BOX(0.6, 0.35, 0.1), '#fff36b', body, s * 0.85, 4.8, 1.32, { emissive: '#aa8800' });
    tf(mk(BOX(0.8, 0.14, 0.12), '#111111', body, s * 0.85, 5.1, 1.35), 0, 0, s * 0.3);
  }
  mk(BOX(2.2, 0.5, 0.3), '#1a1a2a', body, 0, 1.6, 1.31);
  const sign = signMesh(['JACKPOT!'], 4.2, 1.1, { bg: '#2b1d14', color: '#ffd23f', border: '#ff3df0', glow: true });
  sign.position.set(0, 6.3, 0.9); body.add(sign);
  mk(SPH(0.45, 8, 6), '#ffe066', body, 0, 7.0, 0.5, { emissive: '#aa8800' });
  const lever = grp(body, 2.3, 3.6, 0);
  mk(CYL(0.12, 0.12, 2.2, 6), '#cccccc', lever, 0, 1.1, 0);
  mk(SPH(0.35, 8, 6), '#ff3d3d', lever, 0, 2.3, 0);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = grp(body, s * 2.3, 2.8, 0.2);
    tf(mk(BOX(0.4, 1.8, 0.4), '#9aa3ad', arm, s * 0.3, -0.7, 0.3), 0.5, 0, s * 0.4);
    mk(BOX(0.7, 0.5, 0.5), '#3b3f4a', arm, s * 0.65, -1.6, 0.9);
    arms.push(arm);
  }
  return { root, body, arms, lever, reelTex: tex, hit: [{ o: new V3(0, 3.2, 0), r: 2.7 }], mouth: new V3(0, 1.6, 1.6) };
}

function buildSnowdad() {
  const root = new THREE.Group(), body = grp(root);
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = grp(body, s * 0.95, 1.6, 0);
    tf(mk(ICO(0.8, 0), '#f4f8ff', leg, 0, -0.7, 0), 0, 0, 0, 1, 1.3, 1);
    mk(BOX(0.9, 0.35, 1.2), '#8fa3b8', leg, 0, -1.45, 0.2);
    legs.push(leg);
  }
  tf(mk(ICO(2.2, 1), '#f4f8ff', body, 0, 3.3, 0), 0, 0, 0, 1, 1.05, 0.9);
  mk(CYL(2.05, 2.2, 2.1, 10), '#c0392b', body, 0, 3.1, 0);
  mk(CYL(2.1, 2.1, 0.3, 10), '#ffffff', body, 0, 3.4, 0);
  mk(CYL(2.12, 2.12, 0.12, 10), '#2f6f55', body, 0, 2.6, 0);
  const head = grp(body, 0, 5.6, 0.2);
  mk(ICO(1.25, 1), '#f4f8ff', head, 0, 0, 0);
  tf(mk(SPH(0.9, 8, 6), '#8fa3b8', head, 0, -0.1, 0.8), 0, 0, 0, 1, 0.85, 0.45);
  for (const s of [-1, 1]) {
    mk(SPH(0.12, 5, 4), '#111111', head, s * 0.35, 0.05, 1.15);
    tf(mk(TOR(0.26, 0.05, 4, 12), '#222222', head, s * 0.35, 0.05, 1.2), 0, 0, 0);
  }
  mk(BOX(0.25, 0.05, 0.05), '#222222', head, 0, 0.08, 1.22);
  mk(BOX(0.95, 0.2, 0.2), '#e8eef4', head, 0, -0.32, 1.15);
  mk(HEMI(0.95, 10, 4), '#2d5aa6', head, 0, 0.75, 0);
  mk(BOX(1.1, 0.1, 0.9), '#2d5aa6', head, 0, 0.76, 1.1);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = grp(body, s * 2.1, 4.3, 0);
    mk(ICO(0.75, 0), '#f4f8ff', arm, 0, -0.2, 0);
    tf(mk(ICO(0.62, 0), '#f4f8ff', arm, s * 0.2, -1.3, 0.2), 0, 0, 0, 1, 1.4, 1);
    mk(ICO(0.45, 0), '#8fa3b8', arm, s * 0.25, -2.2, 0.35);
    arms.push(arm);
  }
  const mug = grp(arms[1], 0.3, -2.3, 0.9);
  mk(CYL(0.35, 0.33, 0.65, 8), '#ffffff', mug, 0, 0, 0);
  tf(mk(TOR(0.2, 0.06, 4, 8), '#ffffff', mug, 0.4, 0, 0), 0, PI / 2, 0);
  const lbl = signMesh(['#1 DAD'], 0.55, 0.3, { bg: '#ffffff', color: '#c0392b', border: false });
  lbl.position.set(0, 0, 0.36); mug.add(lbl);
  return { root, body, arms, legs, head, hit: [{ o: new V3(0, 3.4, 0), r: 2.4 }, { o: new V3(0, 5.6, 0.2), r: 1.3 }], mouth: new V3(0, 5.3, 1.4) };
}

function buildZorblax() {
  const root = new THREE.Group(), body = grp(root);
  mk(CYL(2.4, 1.6, 0.7, 10), '#3a2a4a', body, 0, 0.5, 0);
  tf(mk(TOR(2.0, 0.14, 4, 20), '#ff3df0', body, 0, 0.1, 0, { emissive: '#aa00aa' }), PI / 2);
  mk(BOX(3.2, 0.8, 2.6), '#6a2a8a', body, 0, 1.2, 0);
  mk(BOX(3.2, 3.8, 0.5), '#6a2a8a', body, 0, 3.1, -1.1);
  mk(BOX(3.4, 0.2, 2.8), '#ffd23f', body, 0, 1.65, 0);
  for (let i = -1; i <= 1; i++) mk(CONE(0.25, 0.9, 4), '#ffd23f', body, i * 1.1, 5.4, -1.1);
  mk(CONE(1.1, 2.4, 8), '#9b5de5', body, 0, 2.7, 0);
  mk(BOX(2.4, 2.8, 0.15), '#c0392b', body, 0, 2.7, -0.75);
  mk(CYL(0.3, 0.35, 0.5, 6), '#7ddc5a', body, 0, 3.9, 0);
  const head = grp(body, 0, 4.9, 0.1);
  tf(mk(ICO(1.35, 1), '#7ddc5a', head, 0, 0, 0), 0, 0, 0, 1, 1.15, 0.95);
  addEyes(head, 0.1, 1.05, 0.55, 0.3, 3);
  for (const s of [-1, 1]) tf(mk(BOX(0.6, 0.12, 0.12), '#2b3a1a', head, s * 0.55, 0.55, 1.2), 0, 0, s * 0.35);
  mk(BOX(0.8, 0.12, 0.1), '#2b3a1a', head, 0, -0.6, 1.2);
  const crown = grp(head, 0, 1.35, 0);
  mk(CYL(0.7, 0.6, 0.5, 8), '#ffd23f', crown, 0, 0, 0);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; mk(CONE(0.12, 0.4, 4), '#ffd23f', crown, Math.sin(a) * 0.65, 0.4, Math.cos(a) * 0.65); }
  mk(OCT(0.2), '#ff3d6e', crown, 0, 0.1, 0.7, { emissive: '#880022' });
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = grp(body, s * 1.0, 3.3, 0.2);
    tf(mk(BOX(0.3, 1.2, 0.3), '#9b5de5', arm, s * 0.2, -0.5, 0.2), -0.6, 0, s * 0.3);
    mk(SPH(0.22, 6, 5), '#7ddc5a', arm, s * 0.4, -1.0, 0.65);
    arms.push(arm);
  }
  const sc = grp(arms[1], 0.45, -1.0, 0.7);
  mk(CYL(0.06, 0.06, 2.4, 6), '#ffd23f', sc, 0, 0.6, 0);
  mk(SPH(0.28, 8, 6), '#ff3df0', sc, 0, 1.9, 0, { emissive: '#aa00aa' });
  return { root, body, arms, head, hit: [{ o: new V3(0, 4.9, 0.1), r: 1.6 }, { o: new V3(0, 2.4, 0), r: 1.9 }], mouth: new V3(0, 4.4, 1.4) };
}

/* ---------------- minions ---------------- */
// (smooth like their boss; the flapping and spinning parts stay separate, the rest is glued together)
function buildMinion(kind) {
  const g = withHi('fx', () => buildMinionParts(kind));
  const ud = g.userData;
  mergeParts(g, { wings: ud.wings, spin: ud.spin, body: ud.body });
  return g;
}
function buildMinionParts(kind) {
  const g = new THREE.Group();
  if (kind === 'slime') {
    tf(mk(SPH(0.6, 8, 6), '#ff7ac8', g, 0, 0.5, 0), 0, 0, 0, 1, 0.8, 1);
    addEyes(g, 0.7, 0.45, 0.18, 0.12);
  } else if (kind === 'snow') {
    mk(ICO(0.5, 1), '#ffffff', g, 0, 0.45, 0);
    mk(ICO(0.36, 1), '#ffffff', g, 0, 1.1, 0);
    tf(mk(CONE(0.06, 0.3, 5), '#ff8a1f', g, 0, 1.1, 0.42), PI / 2);
    for (const s of [-1, 1]) mk(SPH(0.05, 4, 3), '#111111', g, s * 0.12, 1.22, 0.3);
    mk(CYL(0.37, 0.37, 0.1, 8), '#c0392b', g, 0, 0.8, 0);
  } else if (kind === 'guard') {
    mk(BOX(0.5, 0.7, 0.35), '#6a2a8a', g, 0, 0.6, 0);
    mk(ICO(0.32, 1), '#7ddc5a', g, 0, 1.2, 0);
    addEyes(g, 1.25, 0.25, 0.1, 0.07, 3);
    mk(HEMI(0.34), '#ffd23f', g, 0, 1.3, 0);
    mk(CYL(0.03, 0.03, 1.6, 4), '#9aa3ad', g, 0.35, 0.9, 0.1);
    mk(CONE(0.08, 0.25, 4), '#dfe6ee', g, 0.35, 1.8, 0.1);
  } else if (kind === 'bat') { // Count Carbula's bats (they fly a little off the floor)
    const b = grp(g, 0, 1.1, 0);
    tf(mk(SPH(0.3, 8, 6), '#3a2a5a', b, 0, 0, 0), 0, 0, 0, 1, 1.1, 1);
    for (const s of [-1, 1]) {
      tf(mk(CONE(0.1, 0.28, 4), '#3a2a5a', b, s * 0.14, 0.34, 0.04), 0, 0, -s * 0.25);
      mk(SPH(0.06, 5, 4), '#ff3d3d', b, s * 0.1, 0.08, 0.27, { emissive: '#aa0000' });
      mk(CONE(0.025, 0.08, 3), '#ffffff', b, s * 0.05, -0.1, 0.27).rotation.x = PI;
    }
    g.userData.wings = [-1, 1].map((s) => { const w = grp(b, s * 0.26, 0, 0); mk(BOX(0.8, 0.04, 0.46), '#2a1a4a', w, s * 0.4, 0, 0); mk(BOX(0.4, 0.04, 0.3), '#2a1a4a', w, s * 0.85, 0, -0.1); return w; });
  } else if (kind === 'tornado') { // Stormy's little twisters
    const t = grp(g);
    for (let i = 0; i < 6; i++) mk(TOR(0.18 + i * 0.12, 0.08 + i * 0.015, 4, 12), i % 2 ? '#9aa3b8' : '#c9d2e0', t, Math.sin(i) * 0.08, 0.2 + i * 0.3, 0).rotation.x = PI / 2;
    addEyes(t, 1.4, 0.72, 0.16, 0.1);
    g.userData.spin = t;
  } else if (kind === 'intern') { // Chad's interns: lanyards, coffee, no salary
    for (const s of [-1, 1]) mk(BOX(0.18, 0.6, 0.2), '#c9b48a', g, s * 0.13, 0.3, 0);
    mk(BOX(0.52, 0.6, 0.32), '#3a8fd8', g, 0, 0.9, 0);
    mk(BOX(0.1, 0.12, 0.02), '#ffffff', g, 0, 0.82, 0.17);
    mk(BOX(0.34, 0.03, 0.02), '#d6281b', g, 0, 1.1, 0.165).rotation.z = 0.4;
    mk(SPH(0.26, 8, 6), '#f2c9a0', g, 0, 1.45, 0);
    addEyes(g, 1.5, 0.22, 0.09, 0.06);
    mk(BOX(0.46, 0.04, 0.34), '#9aa3ad', g, 0, 1.0, 0.36);
    for (const x of [-0.13, 0.13]) mk(CYL(0.06, 0.05, 0.14, 6), '#ffffff', g, x, 1.1, 0.38);
  }
  return g;
}

/* ---------------- boss projectile meshes ---------------- */
// one smooth template per kind and size, handed out as copies that share its geometry and
// materials (so a spiral of 40 shots doesn't build 40 spheres; the shared parts are never freed, see disposeObj)
const _projTpl = new Map();
function projMesh(kind, r) {
  const key = kind + '|' + r;
  let t = _projTpl.get(key);
  if (!t) {
    t = withHi('fx', () => projParts(kind, r));
    mergeLocal(t);
    t.traverse((c) => { if (c.isMesh) c.receiveShadow = false; });
    t.traverse((c) => { if (c.geometry) c.geometry.userData.shared = true; });
    _projTpl.set(key, t);
  }
  const g = t.clone();
  g.userData.shared = true;
  return g;
}
function projParts(kind, r) {
  const g = new THREE.Group();
  switch (kind) {
    case 'trash': tf(mk(DOD(r), '#1f2a1f', g), 0, 0, 0); mk(BOX(r * 0.4, r * 0.4, r * 0.4), '#ffd23f', g, 0, r * 0.9, 0); break;
    case 'tire': tf(mk(TOR(r * 0.7, r * 0.3, 5, 10), '#222222', g), 0, PI / 2, 0); break;
    case 'goo': mk(SPH(r, 7, 5), '#ff5fb8', g, 0, 0, 0, { emissive: '#661040' }); break;
    case 'coin': tf(mk(CYL(r, r, r * 0.3, 10), '#ffd23f', g, 0, 0, 0, { emissive: '#664400' }), PI / 2); break;
    case 'cherry': mk(SPH(r * 0.7, 7, 5), '#d6281b', g, -r * 0.4, 0, 0, { emissive: '#440000' }); mk(SPH(r * 0.7, 7, 5), '#d6281b', g, r * 0.4, 0, 0, { emissive: '#440000' }); mk(CYL(0.04, 0.04, r, 4), '#3fcf6a', g, 0, r * 0.7, 0); break;
    case 'lemon': tf(mk(SPH(r, 7, 5), '#ffe066', g, 0, 0, 0, { emissive: '#554400' }), 0, 0, 0, 1.3, 1, 1); break;
    case 'snow': mk(ICO(r, 0), '#ffffff', g, 0, 0, 0); break;
    case 'icicle': tf(mk(CONE(r * 0.6, r * 3, 5), '#bff6ff', g, 0, 0, 0, { emissive: '#1a5a7a' }), PI); break;
    case 'laser': tf(mk(CYL(r * 0.5, r * 0.5, r * 3, 6), '#ff3df0', g, 0, 0, 0, { emissive: '#ff00ff' }), PI / 2); break;
    case 'pizza': tf(mk(CYL(r, r, 0.12, 3), '#ffc94a', g, 0, 0, 0, { emissive: '#443300' }), 0, 0, 0); mk(SPH(r * 0.2, 5, 4), '#d63a2a', g, 0, 0.07, 0); break;
    case 'meteor': mk(DOD(r), '#ff6a1f', g, 0, 0, 0, { emissive: '#aa2a00' }); break;
    case 'bat':
      mk(SPH(r * 0.6, 6, 5), '#3a2a5a', g, 0, 0, 0);
      for (const s of [-1, 1]) { mk(BOX(r * 1.1, 0.04, r * 0.6), '#2a1a4a', g, s * r * 0.8, 0, 0); mk(SPH(r * 0.14, 4, 3), '#ff3d3d', g, s * r * 0.2, r * 0.15, r * 0.5, { emissive: '#ff0000' }); }
      break;
    case 'breadstick': tf(mk(CYL(r * 0.35, r * 0.4, r * 3, 7), '#e0a85a', g, 0, 0, 0, { emissive: '#3a2008' }), 0, 0, 0.3); break;
    case 'hail': mk(ICO(r, 0), '#eaf6ff', g, 0, 0, 0, { emissive: '#3a5a7a' }); break;
    case 'bolt':
      for (const [y, rz] of [[r * 0.5, 0.5], [0, -0.5], [-r * 0.5, 0.5]]) tf(mk(BOX(r * 0.35, r * 0.8, r * 0.3), '#fff36b', g, 0, y, 0, { emissive: '#ffcc00' }), 0, 0, rz);
      break;
    case 'email':
      mk(BOX(r * 1.6, r * 1.1, 0.08), '#ffffff', g, 0, 0, 0, { emissive: '#4a4a4a' });
      for (const s of [-1, 1]) tf(mk(BOX(r * 0.95, 0.06, 0.1), '#3a8fd8', g, s * r * 0.38, r * 0.2, 0.01), 0, 0, s * 0.6);
      mk(SPH(r * 0.22, 5, 4), '#ff3d3d', g, r * 0.7, r * 0.45, 0.06, { emissive: '#aa0000' });
      break;
    case 'coffee':
      mk(CYL(r * 0.6, r * 0.45, r * 1.4, 8), '#ffffff', g, 0, 0, 0);
      mk(CYL(r * 0.62, r * 0.62, r * 0.25, 8), '#2a2a30', g, 0, r * 0.75, 0);
      mk(CYL(r * 0.58, r * 0.5, r * 0.5, 8), '#8a5a2b', g, 0, -r * 0.05, 0);
      break;
    case 'slip': mk(BOX(r * 1.5, 0.05, r * 1.1), '#ff9ad5', g, 0, 0, 0, { emissive: '#6a2a4a' }); break;
    case 'card': // (Jackpot Jerry deals these)
      mk(BOX(r * 1.1, 0.05, r * 1.55), '#ffffff', g, 0, 0, 0, { emissive: '#3a3a3a' });
      mk(BOX(r * 0.86, 0.06, r * 1.3), '#d6281b', g, 0, 0, 0, { emissive: '#3a0808' });
      mk(SPH(r * 0.2), '#ffffff', g, 0, 0.04, 0);
      break;
    case 'bigsnow': // (Snowdad's avalanche: it rolls)
      mk(SPH(r), '#f4f8ff', g, 0, 0, 0);
      for (const [x, y, z] of [[0.75, 0.3, 0.1], [-0.4, 0.6, 0.5], [0.1, -0.5, -0.7], [-0.6, -0.3, -0.4]]) mk(SPH(r * 0.34), '#dde7f4', g, x * r, y * r, z * r);
      break;
    case 'lid': // (Trashlord Gary's lid, thrown like a boomerang)
      mk(CYL(r, r, 0.22, 24), '#8fa085', g, 0, 0, 0);
      mk(TOR(r * 0.96, 0.07, 6, 28), '#66755c', g, 0, 0, 0).rotation.x = PI / 2;
      mk(TOR(0.28, 0.07, 6, 12), '#66755c', g, 0, 0.2, 0);
      break;
    // (what the mini bosses throw)
    case 'bone': // a cartoon bone, spinning end over end
      tf(mk(CYL(r * 0.22, r * 0.22, r * 2, 6), '#f4efe0', g, 0, 0, 0), 0, 0, PI / 2);
      for (const s of [-1, 1]) for (const k of [-1, 1]) mk(SPH(r * 0.32, 6, 5), '#f4efe0', g, s * r, k * r * 0.24, 0);
      break;
    case 'dice': { // a big fuzzy-free die, rolling
      mk(BOX(r * 1.5, r * 1.5, r * 1.5), '#ffffff', g, 0, 0, 0, { emissive: '#3a3a3a' });
      const pip = (x, y, z) => mk(SPH(r * 0.14, 5, 4), '#d6281b', g, x * r * 0.76, y * r * 0.76, z * r * 0.76);
      pip(0, 0, 1); pip(0.45, 0.45, -1); pip(-0.45, -0.45, -1); pip(1, 0.45, 0.45); pip(1, -0.45, -0.45); pip(1, 0, 0);
      pip(-1, 0.45, 0.45); pip(-1, -0.45, -0.45); pip(-1, 0.45, -0.45); pip(-1, -0.45, 0.45); pip(0.45, 1, 0.45); pip(-0.45, 1, -0.45);
      break;
    }
    case 'parcel': // a delivery box (somebody's order, probably)
      mk(BOX(r * 1.6, r * 1.2, r * 1.3), '#c89a5a', g, 0, 0, 0, { emissive: '#2a1a08' });
      mk(BOX(r * 1.62, r * 1.22, r * 0.22), '#e8d9a8', g, 0, 0, 0);
      break;
    case 'fries': // stolen lunch
      mk(BOX(r * 0.9, r * 0.8, r * 0.6), '#d6281b', g, 0, -r * 0.2, 0);
      for (let i = 0; i < 5; i++) tf(mk(BOX(r * 0.14, r * 0.9, r * 0.14), '#ffd23f', g, (i - 2) * r * 0.17, r * 0.35, (i % 2 - 0.5) * r * 0.2, { emissive: '#554400' }), 0, 0, (i - 2) * 0.12);
      break;
    case 'lava': mk(ICO(r, 1), '#ff6a1f', g, 0, 0, 0, { emissive: '#c83a00' }); break;
    case 'ecto': mk(SPH(r, 8, 6), '#7dff8a', g, 0, 0, 0, { emissive: '#1f8a3a' }); break;
    default: mk(SPH(r, 6, 5), '#ffffff', g, 0, 0, 0, { emissive: '#666666' });
  }
  g.traverse((c) => { if (c.isMesh) c.castShadow = false; });
  return g;
}

/* =========================================================
   The three newer planets: Spookulon, Nimbus-9 and Gigopolis
   ========================================================= */
// a triangular roof (a prism), ridge along x (alongZ: along z)
// (its flat underside sits r / 2 below y, the ridge r above it)
function prism(parent, len, r, color, x, y, z, alongZ, opts) {
  const g = grp(parent, x, y, z);
  if (alongZ) g.rotation.y = PI / 2;
  tf(mk(CYL(r, r, len, 3), color, g, 0, 0, 0, opts), -PI / 2, 0, PI / 2);
  return g;
}

/* ---------------- Spookulon ---------------- */
let _ripMat = null;
function ripPlate(w, h) {
  if (!_ripMat) {
    _ripMat = new THREE.MeshBasicMaterial({ map: canvasTex(128, 52, (c) => {
      c.fillStyle = '#8a8f9a'; c.fillRect(0, 0, 128, 52);
      c.font = `700 34px ${FONT}`; c.fillStyle = '#3b3f4a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('R.I.P.', 64, 28);
    }) });
    _ripMat.userData.shared = true;
  }
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), _ripMat);
}
function buildTombstone(rng, big) {
  const g = new THREE.Group(), s = big ? 1.6 : 1;
  const col = ['#8a8f9a', '#9aa0a6', '#7a7f8a', '#a8a29a'][Math.floor(rng() * 4)];
  const kind = big ? 0 : Math.floor(rng() * 4);
  const lean = grp(g); lean.rotation.set((rng() - 0.5) * 0.16, 0, (rng() - 0.5) * 0.12);
  if (kind === 0) {
    mk(BOX(0.7 * s, 0.8 * s, 0.18 * s), col, lean, 0, 0.4 * s, 0);
    tf(mk(CYL(0.35 * s, 0.35 * s, 0.18 * s, 12), col, lean, 0, 0.8 * s, 0), PI / 2);
    const p = ripPlate(0.5 * s, 0.2 * s); p.position.set(0, 0.7 * s, 0.092 * s); lean.add(p);
  } else if (kind === 1) {
    mk(BOX(0.16, 1.2, 0.16), col, lean, 0, 0.6, 0);
    mk(BOX(0.7, 0.16, 0.16), col, lean, 0, 0.88, 0);
  } else if (kind === 2) {
    mk(BOX(0.4, 1.3, 0.4), col, lean, 0, 0.65, 0);
    tf(mk(CONE(0.32, 0.4, 4), col, lean, 0, 1.5, 0), 0, PI / 4, 0);
  } else {
    mk(BOX(0.8, 0.6, 0.2), col, lean, 0, 0.3, 0);
    const p = ripPlate(0.5, 0.2); p.position.set(0, 0.36, 0.102); lean.add(p);
  }
  mk(BOX(0.9 * s, 0.08, 0.5 * s), '#5a5f68', g, 0, 0.04, 0.12 * s);
  tf(mk(SPH(0.45 * s, 8, 4), '#3a2f26', g, 0, 0, 0.8 * s), 0, 0, 0, 1, 0.22, 1.6); // (a fresh-ish mound)
  return g;
}
// a straight run of iron fence (along x), len metres long
function buildIronFence(len) {
  const g = new THREE.Group(), iron = '#2a2530';
  const n = Math.max(2, Math.round(len / 0.4));
  for (const y of [0.3, 1.0]) mk(BOX(len, 0.06, 0.06), iron, g, 0, y, 0);
  for (let i = 0; i <= n; i++) {
    const x = -len / 2 + (i / n) * len;
    mk(BOX(0.05, 1.2, 0.05), iron, g, x, 0.6, 0);
    mk(CONE(0.05, 0.16, 4), iron, g, x, 1.28, 0);
  }
  for (const s of [-1, 1]) { mk(BOX(0.18, 1.5, 0.18), '#4a4550', g, s * len / 2, 0.75, 0); mk(SPH(0.13, 6, 5), '#4a4550', g, s * len / 2, 1.58, 0); }
  return g;
}
function buildDeadTree(rng) {
  const g = new THREE.Group(), bark = '#3a3038';
  const h = 3 + rng() * 2.5;
  const trunk = grp(g); trunk.rotation.set((rng() - 0.5) * 0.15, 0, (rng() - 0.5) * 0.15);
  mk(CYL(0.12, 0.3, h, 6), bark, trunk, 0, h / 2, 0);
  const n = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const y = h * (0.45 + rng() * 0.5), l = 0.8 + rng() * 1.3;
    const b = grp(trunk, 0, y, 0); b.rotation.set(0, rng() * PI * 2, 0.6 + rng() * 0.6);
    mk(CYL(0.04, 0.09, l, 5), bark, b, 0, l / 2, 0);
    const t = grp(b, 0, l * 0.7, 0); t.rotation.z = -0.9;
    mk(CYL(0.02, 0.04, l * 0.5, 4), bark, t, 0, l * 0.25, 0);
  }
  return g;
}
function buildJackOLantern(s = 1) {
  const g = new THREE.Group();
  tf(mk(SPH(0.4 * s, 10, 8), '#ff8a1f', g, 0, 0.32 * s, 0), 0, 0, 0, 1, 0.8, 1);
  for (let i = 0; i < 4; i++) tf(mk(SPH(0.4 * s, 10, 8), '#e8741a', g, 0, 0.32 * s, 0), 0, (i / 4) * PI, 0, 0.35, 0.82, 1.02);
  mk(CYL(0.05 * s, 0.08 * s, 0.2 * s, 5), '#3f6a2a', g, 0, 0.7 * s, 0);
  const lit = { emissive: '#ffaa00' };
  for (const x of [-0.13, 0.13]) tf(mk(CONE(0.07 * s, 0.1 * s, 3), '#ffe066', g, x * s, 0.42 * s, 0.36 * s, lit), PI / 2, 0, 0);
  mk(BOX(0.3 * s, 0.07 * s, 0.05 * s), '#ffe066', g, 0, 0.22 * s, 0.37 * s, lit);
  return g;
}
function buildGasLamp() {
  const g = new THREE.Group(), iron = '#2a2530';
  mk(CYL(0.22, 0.28, 0.24, 6), iron, g, 0, 0.12, 0);
  mk(CYL(0.07, 0.1, 3.1, 6), iron, g, 0, 1.6, 0);
  mk(BOX(0.4, 0.06, 0.4), iron, g, 0, 3.18, 0);
  mk(BOX(0.3, 0.42, 0.3), '#fff1b8', g, 0, 3.42, 0, { emissive: '#ffb84a' });
  tf(mk(CONE(0.32, 0.3, 4), iron, g, 0, 3.78, 0), 0, PI / 4, 0);
  return g;
}
function buildCrypt() {
  const g = new THREE.Group(), stone = '#8a8f9a', dark = '#6a6f7a';
  mk(BOX(4.4, 0.4, 5.2), dark, g, 0, 0.2, 0);
  mk(BOX(3.6, 2.8, 4.2), stone, g, 0, 1.8, -0.3);
  prism(g, 4.6, 2.3, dark, 0, 3.2 + 1.15, -0.3, true);
  for (const s of [-1, 1]) { mk(CYL(0.22, 0.26, 2.6, 8), '#b0b4bc', g, s * 1.45, 1.7, 2.0); mk(BOX(0.6, 0.2, 0.6), dark, g, s * 1.45, 3.05, 2.0); }
  mk(BOX(3.6, 0.3, 0.8), dark, g, 0, 3.25, 2.0);
  mk(BOX(1.4, 2.0, 0.1), '#1a1620', g, 0, 1.4, 1.82);
  const sign = signMesh(['FAMILY PLOT', 'est. 1347'], 2.2, 0.6, { bg: '#6a6f7a', colors: ['#2a2530', '#2a2530'], border: false });
  sign.position.set(0, 2.85, 2.41); g.add(sign);
  mk(OCT(0.22), '#7dff8a', g, 0, 3.65, 2.35, { emissive: '#2aaa3a' });
  return g;
}
function buildMansion() {
  const g = new THREE.Group(), wall = '#4a4458', trim = '#2a2533', roof = '#2a2240', win = { emissive: '#8aff5a' };
  mk(BOX(14, 7, 9), wall, g, 0, 3.5, 0);
  mk(BOX(14.4, 0.3, 9.4), trim, g, 0, 7.1, 0);
  prism(g, 14.6, 5.3, roof, 0, 7.2 + 2.65, 0, false);
  for (const s of [-1, 1]) {
    mk(CYL(1.7, 1.7, 11, 8), wall, g, s * 7.2, 5.5, 3.2);
    mk(CONE(2.3, 5, 8), roof, g, s * 7.2, 13.5, 3.2);
    mk(CYL(0.05, 0.05, 1.6, 4), trim, g, s * 7.2, 16.6, 3.2);
    for (const y of [3.2, 6.4, 9.3]) mk(BOX(0.7, 1.1, 0.12), '#c8ff9a', g, s * 7.2, y, 4.85, win);
  }
  for (let i = 0; i < 5; i++) for (const y of [2.2, 5.2]) {
    const x = -4.8 + i * 2.4;
    if (i === 2 && y < 3) continue;
    mk(BOX(1.0, 1.4, 0.12), (i + (y > 3 ? 1 : 0)) % 3 ? '#1a1620' : '#c8ff9a', g, x, y, 4.52, (i + (y > 3 ? 1 : 0)) % 3 ? undefined : win);
    mk(BOX(1.2, 0.14, 0.2), trim, g, x, y - 0.78, 4.55);
  }
  mk(BOX(1.8, 2.8, 0.14), '#2a1a14', g, 0, 1.4, 4.53);
  mk(BOX(3, 0.3, 1.4), trim, g, 0, 0.15, 5.2);
  mk(BOX(3.4, 0.2, 1.8), trim, g, 0, 3.1, 5.3);
  tf(mk(BOX(0.7, 3, 0.7), trim, g, 4.2, 9.6, -2), 0, 0, 0.12); // a crooked chimney
  return g;
}

/* ---------------- Nimbus-9 ---------------- */
// a floating island: its top is at y = 0, with a rocky crystal underside hanging below (depth)
function buildFloatIsland(rng, r, depth) {
  const g = new THREE.Group();
  mk(CYL(r, r * 0.94, 0.6, 16), '#e8eeff', g, 0, -0.3, 0);
  mk(CYL(r * 0.94, r * 0.8, 0.5, 16), '#d3dcf0', g, 0, -0.85, 0);
  tf(mk(CONE(r * 0.82, depth, 7), '#b9a4d8', g, 0, -1.1 - depth / 2, 0), PI, rng() * 3, 0);
  tf(mk(CONE(r * 0.4, depth * 0.55, 6), '#9d86c4', g, r * 0.3, -1.1 - depth * 0.6, -r * 0.15), PI, 0, 0.2);
  for (let i = 0; i < 3; i++) {
    const a = rng() * PI * 2;
    tf(mk(OCT(0.35 + rng() * 0.25), '#ffd6f4', g, Math.cos(a) * r * 0.45, -1.4 - rng() * depth * 0.5, Math.sin(a) * r * 0.45, { emissive: '#7a3a6a' }), 0, 0, 0, 0.7, 1.8, 0.7);
  }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2 + rng() * 0.4; mk(ICO(0.45 + rng() * 0.45, 1), '#ffffff', g, Math.cos(a) * r * 0.97, -0.55 + rng() * 0.25, Math.sin(a) * r * 0.97); }
  return g;
}
// the base of an updraft (the rising column itself is animated by the world)
function buildVentBase() {
  const g = new THREE.Group();
  mk(CYL(1.35, 1.55, 0.3, 14), '#dfe8f5', g, 0, 0.15, 0);
  mk(CYL(1.05, 1.05, 0.32, 14), '#8fd0ff', g, 0, 0.16, 0, { emissive: '#3a90d0' });
  for (let i = -2; i <= 2; i++) mk(BOX(0.08, 0.34, 1.95 - Math.abs(i) * 0.3), '#b9c9e6', g, i * 0.38, 0.18, 0);
  return g;
}
function buildCloudTree(rng) {
  const g = new THREE.Group();
  const h = 2 + rng() * 2;
  tf(mk(CYL(0.12, 0.2, h, 6), '#c9b3e0', g, 0, h / 2, 0), (rng() - 0.5) * 0.2, 0, (rng() - 0.5) * 0.2);
  const col = ['#ffffff', '#ffd6f4', '#d6ecff'][Math.floor(rng() * 3)];
  for (let i = 0; i < 4; i++) mk(ICO(0.6 + rng() * 0.5, 1), col, g, (rng() - 0.5) * 1.2, h + (rng() - 0.3) * 0.8, (rng() - 0.5) * 1.2);
  return g;
}
function buildBalloon(color) {
  const g = new THREE.Group();
  tf(mk(SPH(3, 12, 10), color, g, 0, 6, 0), 0, 0, 0, 1, 1.15, 1);
  for (const y of [5.2, 6.8]) tf(mk(TOR(2.95, 0.12, 4, 24), '#ffffff', g, 0, y, 0), PI / 2);
  mk(CONE(1.2, 1.6, 10), color, g, 0, 2.6, 0).rotation.x = PI;
  mk(BOX(1.3, 0.9, 1.3), '#8a5a2b', g, 0, 0.45, 0);
  mk(BOX(1.4, 0.12, 1.4), '#6b4a2b', g, 0, 0.92, 0);
  for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) rod(g, new V3(x, 0.9, z), new V3(x * 1.4, 2.4, z * 1.4), 0.02, '#3b2a1a');
  return g;
}
// half a rainbow: bands of color bent into an arch (in the xy plane)
function buildRainbow(r) {
  const g = new THREE.Group();
  ['#ff4b3e', '#ff9a1f', '#ffe066', '#46d98a', '#3aa7ff', '#9b5de5'].forEach((c, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r - i * 0.45, 0.24, 4, 40, PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.75, depthWrite: false }));
    g.add(m);
  });
  return g;
}
function buildWeatherBoard() {
  const g = new THREE.Group();
  for (const s of [-1, 1]) mk(BOX(0.14, 2.4, 0.14), '#b9c9e6', g, s * 1.1, 1.2, 0);
  const sm = signMesh(['WEATHER REPORT', 'CLOUDY. FOREVER.'], 2.6, 1.3, { bg: '#3a8fd8', colors: ['#ffffff', '#ffe066'], border: '#ffffff' });
  sm.position.set(0, 2.1, 0.09); g.add(sm);
  mk(ICO(0.35, 1), '#ffffff', g, 1.2, 2.85, 0.1);
  mk(SPH(0.28, 8, 6), '#ffd23f', g, 0.9, 3.0, 0.05, { emissive: '#aa8800' });
  return g;
}
function buildAnemometer() {
  const g = new THREE.Group();
  mk(CYL(0.1, 0.14, 4.5, 6), '#dfe8f5', g, 0, 2.25, 0);
  const cups = grp(g, 0, 4.6, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    tf(mk(BOX(1.1, 0.05, 0.05), '#9aa3ad', cups, Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55), 0, -a, 0);
    mk(HEMI(0.16, 8, 4), '#ff4b3e', cups, Math.cos(a) * 1.1, 0, Math.sin(a) * 1.1).rotation.z = PI / 2;
  }
  g.userData.cups = cups;
  return g;
}

/* ---------------- Gigopolis ---------------- */
// building walls: one window grid, shared by every building (lit windows glow at night)
let _cityTex = null;
function cityTextures() {
  if (_cityTex) return _cityTex;
  const rng = U.seeded(515);
  const lit = [];
  for (let i = 0; i < 16; i++) lit.push(rng() < 0.45 ? ['#ffe08a', '#8af0ff', '#ff9ad5', '#fff6d0'][Math.floor(rng() * 4)] : null);
  const draw = (glow) => (c, w, h) => {
    c.fillStyle = glow ? '#000000' : '#d8dce6'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      const x = (i % 4) * 64, y = Math.floor(i / 4) * 64;
      c.fillStyle = glow ? (lit[i] || '#000000') : lit[i] ? '#fff2c0' : '#2a3448';
      c.fillRect(x + 12, y + 10, 40, 42);
      if (!glow) { c.fillStyle = '#9aa3b4'; c.fillRect(x + 8, y + 52, 48, 5); }
    }
  };
  const mkT = (glow) => { const t = canvasTex(256, 256, draw(glow)); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  _cityTex = { map: mkT(false), glow: mkT(true) };
  return _cityTex;
}
const _cityMats = new Map();
function cityWallMat(tint) {
  let m = _cityMats.get(tint);
  if (!m) {
    const t = cityTextures();
    m = new THREE.MeshToonMaterial({ color: tint, map: t.map, emissive: '#ffffff', emissiveMap: t.glow, emissiveIntensity: 0.85, gradientMap: TOON_GRAD });
    m.userData.shared = true;
    _cityMats.set(tint, m);
  }
  return m;
}
// a box of building with windows on its sides (each window cell is 2 m wide and 2.5 m tall)
function buildingBox(w, h, d, tint) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const faces = [[d, h], [d, h], [0, 0], [0, 0], [w, h], [w, h]]; // +x -x +y -y +z -z
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k, [fw, fh] = faces[f];
    uv.setXY(i, uv.getX(i) * fw / 8, uv.getY(i) * fh / 10);
  }
  const m = new THREE.Mesh(geo, cityWallMat(tint));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function buildStreetLamp() {
  const g = new THREE.Group(), pole = '#3b3f4a';
  mk(CYL(0.08, 0.11, 4.4, 6), pole, g, 0, 2.2, 0);
  mk(BOX(1.3, 0.08, 0.08), pole, g, 0.6, 4.35, 0);
  mk(BOX(0.44, 0.14, 0.28), pole, g, 1.2, 4.28, 0);
  mk(BOX(0.36, 0.04, 0.22), '#fff6d0', g, 1.2, 4.2, 0, { emissive: '#ffe08a' });
  return g;
}
function buildHydrant() {
  const g = new THREE.Group();
  mk(CYL(0.16, 0.2, 0.6, 8), '#d6281b', g, 0, 0.3, 0);
  mk(HEMI(0.17, 8, 4), '#d6281b', g, 0, 0.6, 0);
  for (const s of [-1, 1]) tf(mk(CYL(0.07, 0.07, 0.14, 6), '#ffd23f', g, s * 0.2, 0.4, 0), 0, 0, PI / 2);
  return g;
}
function buildTrashCan() {
  const g = new THREE.Group();
  mk(CYL(0.3, 0.26, 0.9, 10), '#3a5a3a', g, 0, 0.45, 0);
  mk(CYL(0.33, 0.33, 0.1, 10), '#2a4a2a', g, 0, 0.93, 0);
  mk(BOX(0.25, 0.14, 0.2), '#c9a36b', g, 0.05, 1.02, 0.02); // (somebody's leftovers)
  return g;
}
function buildBench() {
  const g = new THREE.Group();
  mk(BOX(1.8, 0.08, 0.5), '#8a5a2b', g, 0, 0.45, 0);
  mk(BOX(1.8, 0.4, 0.08), '#8a5a2b', g, 0, 0.75, -0.24);
  for (const s of [-1, 1]) mk(BOX(0.08, 0.45, 0.5), '#3b3f4a', g, s * 0.8, 0.22, 0);
  return g;
}
function buildCar(color) {
  const g = new THREE.Group();
  mk(BOX(1.9, 0.62, 4.0), color, g, 0, 0.6, 0);
  mk(BOX(1.72, 0.58, 2.1), color, g, 0, 1.18, -0.2);
  mk(BOX(1.74, 0.42, 1.9), '#1a2a3a', g, 0, 1.2, -0.2);
  mk(BOX(1.5, 0.05, 1.7), color, g, 0, 1.49, -0.2);
  for (const [x, z] of [[-0.95, 1.3], [0.95, 1.3], [-0.95, -1.3], [0.95, -1.3]]) tf(mk(CYL(0.36, 0.36, 0.3, 10), '#1a1a1a', g, x, 0.36, z), 0, 0, PI / 2);
  for (const s of [-1, 1]) {
    mk(BOX(0.36, 0.16, 0.05), '#fff6d0', g, s * 0.6, 0.72, 2.01, { emissive: '#ffe08a' });
    mk(BOX(0.36, 0.14, 0.05), '#ff3d3d', g, s * 0.6, 0.74, -2.01, { emissive: '#aa0000' });
  }
  return g;
}
function buildJumpPad() {
  const g = new THREE.Group();
  mk(CYL(1.25, 1.35, 0.2, 16), '#2f3340', g, 0, 0.1, 0);
  mk(CYL(1.0, 1.0, 0.22, 16), '#3df0ff', g, 0, 0.11, 0, { emissive: '#0aa0c0' });
  for (let i = 0; i < 3; i++) tf(mk(CONE(0.34, 0.3, 3), '#ffffff', g, 0, 0.24, -0.35 + i * 0.35, { emissive: '#8adfff' }), PI / 2, 0, 0, 1, 1, 0.25);
  return g;
}
function buildKiosk() {
  const g = new THREE.Group();
  mk(BOX(2.8, 1.1, 1.3), '#2f3340', g, 0, 0.55, 0);
  mk(BOX(3.0, 0.12, 1.5), '#ffd23f', g, 0, 1.16, 0);
  for (const [x, z] of [[-1.4, -0.6], [1.4, -0.6], [-1.4, 0.6], [1.4, 0.6]]) mk(BOX(0.12, 2.6, 0.12), '#3b3f4a', g, x, 1.3, z);
  mk(BOX(3.4, 0.25, 1.9), '#ff3df0', g, 0, 2.7, 0, { emissive: '#6a0a5a' });
  const s = signMesh(['GIGHUB', 'DELIVERY GIGS · PRESS E'], 2.8, 1.0, { bg: '#12072e', colors: ['#ffd23f', '#3df0ff'], border: '#ff3df0', glow: true });
  s.position.set(0, 3.4, 0.2); g.add(s);
  for (const [x, y, z, sz] of [[-0.9, 1.4, -0.2, 0.4], [-0.5, 1.37, 0.1, 0.34], [0.8, 1.42, -0.1, 0.46], [-0.75, 1.75, -0.1, 0.3]]) {
    mk(BOX(sz, sz * 0.8, sz), '#c9a36b', g, x, y, z);
    mk(BOX(sz * 1.02, 0.05, sz * 0.2), '#e8d8a0', g, x, y + sz * 0.4, z);
  }
  return g;
}
function buildBillboard(lines, colors, w = 6) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) mk(BOX(0.18, 3, 0.18), '#3b3f4a', g, s * w * 0.35, 1.5, 0);
  mk(BOX(w + 0.3, 2.5, 0.2), '#2a2d38', g, 0, 3.9, 0);
  const sm = signMesh(lines, w, 2.2, { bg: '#12072e', colors, border: colors[0], glow: true });
  sm.position.set(0, 3.9, 0.11); g.add(sm);
  return g;
}
function buildParkingMeter() {
  const g = new THREE.Group();
  mk(CYL(0.06, 0.07, 1.1, 6), '#6d7480', g, 0, 0.55, 0);
  mk(BOX(0.36, 0.5, 0.26), '#9aa3ad', g, 0, 1.3, 0);
  tf(mk(CYL(0.18, 0.18, 0.27, 10), '#9aa3ad', g, 0, 1.56, 0), PI / 2);
  const s = signMesh(['EXPIRED'], 0.26, 0.14, { bg: '#1a2a2a', color: '#ff4b3e', border: false, glow: true });
  s.position.set(0, 1.38, 0.132); g.add(s);
  return g;
}
function buildWaterTower() {
  const g = new THREE.Group();
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) mk(BOX(0.12, 2.2, 0.12), '#5a4a3a', g, x, 1.1, z);
  mk(CYL(1.2, 1.2, 2.2, 10), '#8a6a4a', g, 0, 3.2, 0);
  mk(CONE(1.35, 0.9, 10), '#5a4a3a', g, 0, 4.75, 0);
  return g;
}

/* ---------------- the new shopkeepers ---------------- */
// Sheets McGhost: a bedsheet with a bowtie and very good manners
function buildSheetGhost() {
  return withHi(null, () => {
    const root = new THREE.Group(), cloth = '#eef3ff', lit = { emissive: '#3a4a6a' };
    const body = grp(root, 0, 0.35, 0);
    mk(CYL(0.55, 0.78, 1.35, 12), cloth, body, 0, 0.7, 0, lit);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; tf(mk(CONE(0.16, 0.3, 5), cloth, body, Math.sin(a) * 0.68, -0.08, Math.cos(a) * 0.68, lit), PI, 0, 0); }
    for (const s of [-1, 1]) tf(mk(SPH(0.2, 7, 5), cloth, body, s * 0.72, 1.0, 0.1, lit), 0, 0, -s * 0.5, 1.4, 0.7, 0.7);
    tf(mk(BOX(0.3, 0.14, 0.08), '#b9a4ff', body, 0, 1.3, 0.56), 0, 0, 0);
    for (const s of [-1, 1]) tf(mk(CONE(0.1, 0.18, 4), '#b9a4ff', body, s * 0.14, 1.3, 0.57), 0, 0, s * PI / 2);
    const head = grp(root, 0, 1.95, 0);
    mk(SPH(0.6, 12, 10), cloth, head, 0, 0, 0, lit);
    for (const s of [-1, 1]) tf(mk(SPH(0.1, 6, 5), '#1a1a2a', head, s * 0.2, 0.08, 0.54), 0, 0, 0, 1, 1.5, 0.6);
    tf(mk(SPH(0.11, 6, 5), '#1a1a2a', head, 0, -0.18, 0.55), 0, 0, 0, 1.2, 0.8, 0.5);
    const hat = buildHat('tophat'); hat.scale.setScalar(0.75); hat.position.set(0.05, 0.5, 0); hat.rotation.z = -0.15; head.add(hat);
    return { root, head };
  });
}
// Skipper Gale: an albatross who sails the sky (no boat)
function buildAlbatross() {
  return withHi(null, () => {
    const root = new THREE.Group();
    for (const s of [-1, 1]) {
      mk(CYL(0.05, 0.05, 0.6, 5), '#ff9a3d', root, s * 0.22, 0.3, 0);
      mk(BOX(0.26, 0.05, 0.3), '#ff9a3d', root, s * 0.22, 0.03, 0.08);
    }
    tf(mk(SPH(0.62, 10, 8), '#f4f4f0', root, 0, 1.15, 0), 0, 0, 0, 1, 1.25, 0.95);
    tf(mk(SPH(0.46, 10, 8), '#ffffff', root, 0, 1.05, 0.2), 0, 0, 0, 1, 1.2, 0.8);
    for (const s of [-1, 1]) {
      const w = grp(root, s * 0.6, 1.5, -0.05);
      tf(mk(BOX(0.2, 1.1, 0.5), '#e8e8e4', w, s * 0.05, -0.45, 0), 0, 0, s * 0.18);
      tf(mk(BOX(0.18, 0.4, 0.46), '#4a4f5a', w, s * 0.12, -1.05, 0), 0, 0, s * 0.18);
    }
    tf(mk(CONE(0.26, 0.5, 3), '#3a8fd8', root, 0, 1.72, 0.3), PI, 0, 0, 1, 1, 0.5); // neckerchief
    const head = grp(root, 0, 2.15, 0.08);
    mk(SPH(0.38, 10, 8), '#ffffff', head, 0, 0, 0);
    tf(mk(CONE(0.12, 0.6, 6), '#ffd23f', head, 0, -0.08, 0.6), PI / 2, 0, 0);
    mk(SPH(0.07, 6, 5), '#e0a820', head, 0, -0.16, 0.86);
    for (const s of [-1, 1]) { mk(SPH(0.07, 6, 5), '#111111', head, s * 0.2, 0.08, 0.3); tf(mk(BOX(0.16, 0.035, 0.03), '#6d7480', head, s * 0.2, 0.18, 0.31), 0, 0, -s * 0.2); }
    mk(CYL(0.36, 0.34, 0.24, 12), '#1d2a4a', head, 0, 0.36, 0);
    mk(CYL(0.44, 0.44, 0.04, 12), '#111111', head, 0, 0.25, 0.05);
    mk(BOX(0.16, 0.12, 0.04), '#ffd23f', head, 0, 0.38, 0.36, { emissive: '#664400' });
    return { root, head };
  });
}
// Trench Coat Trevor: definitely one normal adult man (three raccoons)
function buildTrenchRaccoons() {
  return withHi(null, () => {
    const root = new THREE.Group(), coat = '#b08a5a', fur = '#8a8f98', mask = '#2a2a30';
    for (const s of [-1, 1]) mk(BOX(0.22, 0.14, 0.34), mask, root, s * 0.2, 0.07, 0.06);
    mk(CYL(0.46, 0.64, 1.9, 10), coat, root, 0, 1.1, 0);
    mk(CYL(0.43, 0.47, 0.34, 10), coat, root, 0, 2.15, 0);
    tf(mk(TOR(0.52, 0.06, 4, 16), '#6b4a2b', root, 0, 1.25, 0), PI / 2);
    for (const s of [-1, 1]) {
      tf(mk(BOX(0.18, 0.7, 0.06), '#9a7648', root, s * 0.2, 1.8, 0.44), 0, 0, s * 0.35);
      const arm = grp(root, s * 0.52, 1.95, 0);
      tf(mk(CYL(0.13, 0.16, 1.1, 8), coat, arm, 0, -0.5, 0.05), 0.2, 0, s * 0.12);
      mk(SPH(0.1, 6, 5), mask, arm, s * 0.07, -1.06, 0.16);
    }
    for (const y of [0.9, 1.45]) mk(SPH(0.04, 5, 4), '#3b2a1a', root, 0.12, y, 0.6);
    // raccoon #2, peeking out of the coat
    const r2 = grp(root, -0.05, 1.62, 0.42);
    mk(SPH(0.17, 8, 6), fur, r2, 0, 0, 0);
    mk(BOX(0.3, 0.07, 0.06), mask, r2, 0, 0.03, 0.14);
    for (const s of [-1, 1]) mk(SPH(0.03, 5, 4), '#ffffff', r2, s * 0.07, 0.04, 0.17);
    // raccoon #3, under the hem, with a tail out the back
    for (const s of [-1, 1]) mk(SPH(0.035, 5, 4), '#fff36b', root, s * 0.08, 0.3, 0.58, { emissive: '#887700' });
    const tail = grp(root, 0.1, 0.25, -0.55); tail.rotation.x = -0.7;
    for (let i = 0; i < 4; i++) mk(CYL(0.1, 0.1, 0.18, 8), i % 2 ? mask : fur, tail, 0, -0.1 - i * 0.18, 0).rotation.x = 0;
    // raccoon #1 (the head of the operation), wearing a fedora
    const head = grp(root, 0, 2.55, 0.02);
    mk(SPH(0.34, 10, 8), fur, head, 0, 0, 0);
    mk(BOX(0.62, 0.14, 0.12), mask, head, 0, 0.04, 0.26);
    for (const s of [-1, 1]) { mk(SPH(0.06, 6, 5), '#ffffff', head, s * 0.14, 0.05, 0.32); mk(SPH(0.03, 5, 4), '#111111', head, s * 0.14, 0.05, 0.37); mk(CONE(0.09, 0.18, 4), fur, head, s * 0.22, 0.32, 0); }
    tf(mk(SPH(0.14, 8, 6), '#c9ced6', head, 0, -0.12, 0.28), 0, 0, 0, 1, 0.8, 1);
    mk(SPH(0.05, 5, 4), '#111111', head, 0, -0.08, 0.41);
    mk(CYL(0.5, 0.5, 0.04, 14), '#5a4a3a', head, 0, 0.26, 0);
    mk(CYL(0.26, 0.3, 0.3, 12), '#5a4a3a', head, 0, 0.42, 0);
    mk(CYL(0.305, 0.305, 0.07, 12), '#2a2a30', head, 0, 0.32, 0);
    return { root, head };
  });
}

/* ---------------- the new bosses ---------------- */
// Count Carbula: a vampire who gave up blood for carbs. Hovers. Holds a breadstick like a sceptre.
function buildCount() {
  const root = new THREE.Group(), body = grp(root), suit = '#1a1a22', skin = '#e8e4f0';
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = grp(body, s * 0.45, 1.6, 0);
    mk(CYL(0.26, 0.3, 1.6, 8), suit, leg, 0, -0.8, 0);
    mk(BOX(0.42, 0.24, 0.8), '#0a0a10', leg, 0, -1.55, 0.15);
    legs.push(leg);
  }
  mk(CYL(0.95, 0.75, 2.2, 10), suit, body, 0, 2.7, 0);
  mk(BOX(0.66, 1.7, 0.2), '#f4f1ea', body, 0, 2.95, 0.74);
  mk(BOX(0.4, 0.34, 0.16), '#b8142e', body, 0, 3.65, 0.84);
  tf(mk(CYL(0.22, 0.22, 0.06, 12), '#ffd23f', body, 0, 3.25, 0.86, { emissive: '#664400' }), PI / 2);
  tf(mk(TOR(0.6, 0.06, 4, 16), '#b8142e', body, 0, 1.75, 0), PI / 2);
  // the cape: two curved halves hanging from the shoulders, black outside, red inside, that billow and
  // flare out (see BossFight.animate)
  const cape = [];
  for (const s of [-1, 1]) {
    const w = grp(body, s * 0.55, 3.95, -0.45);
    const t0 = s > 0 ? PI / 2 - 0.12 : PI, tl = PI / 2 + 0.12;
    for (const [r0, r1, col] of [[1.16, 2.12, '#0a0a12'], [1.1, 2.04, '#8a0f22']]) {
      mk(smoothGeo(new THREE.CylinderGeometry(r0, r1, 3.9, 20, 1, true, t0, tl)), col, w, -s * 0.55, -1.95, 0.45, { side: THREE.DoubleSide });
    }
    cape.push(w);
  }
  for (const s of [-1, 1]) tf(mk(CONE(0.62, 1.5, 3), '#8a0f22', body, s * 0.55, 4.6, -0.3), 0, 0, -s * 0.35, 1, 1, 0.3);
  const head = grp(body, 0, 4.65, 0.1);
  tf(mk(ICO(0.72, 1), skin, head, 0, 0, 0), 0, 0, 0, 0.9, 1.15, 0.9);
  tf(mk(HEMI(0.74, 12, 5), '#111118', head, 0, 0.18, -0.04), 0, 0, 0, 0.95, 0.85, 0.95);
  tf(mk(CONE(0.22, 0.42, 3), '#111118', head, 0, 0.5, 0.52), PI, 0, 0, 1, 1, 0.5); // the widow's peak
  for (const s of [-1, 1]) {
    tf(mk(CONE(0.14, 0.52, 4), skin, head, s * 0.66, 0.2, -0.05), 0, 0, -s * 1.1);
    mk(SPH(0.11, 6, 5), '#ff2040', head, s * 0.24, 0.12, 0.58, { emissive: '#aa0010' });
    tf(mk(BOX(0.32, 0.07, 0.06), '#111118', head, s * 0.24, 0.3, 0.6), 0, 0, s * 0.35);
    mk(CONE(0.045, 0.16, 4), '#ffffff', head, s * 0.1, -0.44, 0.58).rotation.x = PI;
  }
  mk(BOX(0.4, 0.06, 0.05), '#3a0a14', head, 0, -0.34, 0.6);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = grp(body, s * 1.0, 3.7, 0.05);
    tf(mk(BOX(0.36, 1.7, 0.36), suit, arm, 0, -0.8, 0.1), -0.2, 0, s * 0.08);
    for (let f = 0; f < 3; f++) tf(mk(CONE(0.05, 0.3, 4), skin, arm, s * 0.02 + (f - 1) * 0.08, -1.8, 0.35), PI - 0.3, 0, 0);
    mk(SPH(0.16, 6, 5), skin, arm, 0, -1.65, 0.28);
    arms.push(arm);
  }
  const stick = grp(arms[1], 0, -1.65, 0.3);
  tf(mk(CYL(0.1, 0.12, 2.2, 8), '#e0a85a', stick, 0, 0.6, 0.1), 0.3, 0, 0);
  for (let i = 0; i < 6; i++) mk(SPH(0.03, 4, 3), '#fff6d0', stick, (i % 2 ? 0.08 : -0.08), 0.1 + i * 0.3, 0.12 + i * 0.09);
  return { root, body, arms, cape, head, hit: [{ o: new V3(0, 2.8, 0), r: 1.6 }, { o: new V3(0, 4.65, 0.1), r: 1.0 }], mouth: new V3(0, 4.3, 0.9) }; // (he floats: no walking)
}
// Stormy McStormface: an angry storm cloud with lightning for arms
function buildStormy() {
  const root = new THREE.Group(), body = grp(root);
  for (const [x, y, z, r] of [[0, 1.7, 0, 2.2], [1.8, 1.4, 0.2, 1.6], [-1.8, 1.4, 0.1, 1.7], [0.9, 2.9, -0.2, 1.4], [-1.0, 2.8, 0, 1.5], [0, 1.1, 1.0, 1.5], [2.9, 1.0, -0.3, 1.1], [-3.0, 1.0, -0.2, 1.1], [0, 3.5, -0.5, 1.1]]) mk(ICO(r, 1), '#5a6178', body, x, y, z);
  tf(mk(ICO(2.2, 1), '#3a4058', body, 0, 0.5, 0), 0, 0, 0, 1.7, 0.35, 1.1);
  for (const s of [-1, 1]) {
    mk(SPH(0.42, 8, 6), '#ffffff', body, s * 0.72, 2.0, 1.98);
    mk(SPH(0.18, 6, 5), '#111111', body, s * 0.66, 1.94, 2.36);
    tf(mk(BOX(0.8, 0.2, 0.2), '#2a2f40', body, s * 0.75, 2.55, 2.1), 0, 0, s * 0.45);
    tf(mk(BOX(0.7, 0.16, 0.12), '#1a1a22', body, s * 0.34, 1.12, 2.42), 0, 0, -s * 0.35); // (a big frown)
  }
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = grp(body, s * 3.1, 1.3, 0.4);
    const zig = [[0, -0.5, 0.35, 0.5], [s * 0.35, -1.1, 0.25, -0.5], [s * 0.1, -1.7, 0.3, 0.5]];
    for (const [x, y, w, rz] of zig) tf(mk(BOX(w, 0.8, 0.18), '#fff36b', arm, x, y, 0, { emissive: '#ffcc00' }), 0, 0, rz);
    arms.push(arm);
  }
  const rain = [];
  const rmat = M('#9fd0ff', { transparent: true, opacity: 0.7 });
  const rng = U.seeded(7);
  for (let i = 0; i < 16; i++) { const d = mk(BOX(0.06, 0.6, 0.06), rmat, body, (rng() - 0.5) * 5, -rng() * 3.5, (rng() - 0.5) * 2.4); d.castShadow = false; rain.push(d); }
  return { root, body, arms, rain, hit: [{ o: new V3(0, 1.9, 0), r: 2.9 }], mouth: new V3(0, 1.2, 2.5) };
}
// CEO Chad Grindset: suit, sunglasses, headset, hoverboard. Has never slept.
function buildChad() {
  const root = new THREE.Group(), body = grp(root), suit = '#2a3a6a', skin = '#f0c29a';
  const board = grp(root, 0, 0.35, 0);
  mk(BOX(1.7, 0.2, 3.3), '#1a1a22', board, 0, 0, 0);
  mk(BOX(1.72, 0.06, 3.32), '#3df0ff', board, 0, -0.1, 0, { emissive: '#0aa0c0' });
  for (const z of [-1.1, 1.1]) mk(CYL(0.4, 0.5, 0.18, 12), '#3df0ff', board, 0, -0.2, z, { emissive: '#3df0ff' });
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = grp(body, s * 0.45, 2.15, 0);
    mk(CYL(0.3, 0.26, 1.6, 8), suit, leg, 0, -0.85, 0);
    mk(BOX(0.44, 0.22, 0.8), '#111111', leg, 0, -1.65, 0.12);
    legs.push(leg);
  }
  mk(BOX(1.8, 1.9, 1.0), '#1a1a22', body, 0, 3.25, 0);
  for (const s of [-1, 1]) {
    mk(BOX(0.5, 1.95, 1.08), suit, body, s * 0.78, 3.25, 0);
    tf(mk(BOX(0.25, 1.0, 0.08), '#22325a', body, s * 0.45, 3.7, 0.55), 0, 0, s * 0.25);
    tf(mk(BOX(0.7, 0.4, 0.15), '#22222a', body, s * 0.32, 3.75, 0.5), 0, 0, 0); // (pecs. He wants you to notice)
    mk(SPH(0.52, 8, 6), suit, body, s * 1.05, 4.05, 0);
  }
  const head = grp(body, 0, 4.85, 0.05);
  mk(BOX(0.95, 1.0, 0.9), skin, head, 0, 0.05, 0);
  mk(BOX(1.02, 0.4, 0.92), skin, head, 0, -0.42, 0.02);
  mk(BOX(1.0, 0.32, 0.96), '#6b4a2b', head, 0, 0.62, -0.02);
  tf(mk(BOX(0.8, 0.22, 0.5), '#6b4a2b', head, 0.1, 0.78, 0.2), -0.35, 0, -0.1);
  mk(BOX(1.04, 0.22, 0.08), '#111111', head, 0, 0.14, 0.48);
  mk(BOX(0.9, 0.04, 0.02), '#3df0ff', head, 0, 0.18, 0.53, { emissive: '#3df0ff' });
  mk(BOX(0.5, 0.1, 0.05), '#ffffff', head, 0, -0.32, 0.47);
  mk(smoothGeo(new THREE.TorusGeometry(0.55, 0.05, 8, 28, PI)), '#2a2a30', head, 0, 0.2, 0);
  for (const s of [-1, 1]) tf(mk(CYL(0.15, 0.15, 0.12, 10), '#2a2a30', head, s * 0.52, 0.12, 0), 0, 0, PI / 2);
  rod(head, new V3(-0.55, 0.05, 0.05), new V3(-0.25, -0.35, 0.55), 0.025, '#2a2a30');
  mk(SPH(0.06, 6, 5), '#3df0ff', head, -0.22, -0.37, 0.58, { emissive: '#3df0ff' });
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = grp(body, s * 1.2, 4.0, 0);
    tf(mk(BOX(0.46, 1.6, 0.46), suit, arm, s * 0.05, -0.75, 0.05), 0, 0, s * 0.1);
    mk(SPH(0.2, 6, 5), skin, arm, s * 0.08, -1.62, 0.1);
    arms.push(arm);
  }
  const phone = grp(arms[1], 0.08, -1.62, 0.3);
  mk(BOX(0.34, 0.6, 0.06), '#111111', phone, 0, 0.2, 0);
  mk(BOX(0.28, 0.5, 0.02), '#3df0ff', phone, 0, 0.2, 0.04, { emissive: '#1a8aa0' });
  const cup = grp(arms[0], -0.08, -1.62, 0.3);
  mk(CYL(0.16, 0.13, 0.46, 10), '#ffffff', cup, 0, 0.18, 0);
  mk(CYL(0.17, 0.17, 0.08, 10), '#2a2a30', cup, 0, 0.44, 0);
  mk(CYL(0.165, 0.15, 0.16, 10), '#8a5a2b', cup, 0, 0.16, 0);
  return { root, body, arms, head, board, hit: [{ o: new V3(0, 3.2, 0), r: 1.7 }, { o: new V3(0, 4.85, 0.05), r: 0.95 }], mouth: new V3(0, 4.55, 0.9) }; // (he never walks anywhere)
}
// a ghost you can vacuum on Spookulon (it drifts around its graveyard; see PlanetWorld.moveGhost), carrying
// whatever it'll drop when you do (see buildLootNode)
function buildGhostNode() {
  const g = new THREE.Group();
  const mat = M('#eef3ff', { transparent: true, opacity: 0.8, emissive: '#6a7aa8', depthWrite: false });
  const b = grp(g);
  mk(SPH(0.42, 12, 8), mat, b, 0, 0.35, 0);
  mk(CYL(0.42, 0.52, 0.55, 12), mat, b, 0, 0.02, 0);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2 + 0.3; tf(mk(CONE(0.13, 0.26, 5), mat, b, Math.sin(a) * 0.42, -0.36, Math.cos(a) * 0.42), PI, 0, 0); }
  for (const s of [-1, 1]) {
    tf(mk(SPH(0.075, 6, 5), '#1a1a2a', b, s * 0.15, 0.42, 0.37), 0, 0, 0, 1, 1.5, 0.6);
    tf(mk(SPH(0.15, 6, 5), mat, b, s * 0.5, 0.1, 0.05), 0, 0, -s * 0.7, 1, 0.55, 0.55);
  }
  tf(mk(SPH(0.09, 6, 5), '#1a1a2a', b, 0, 0.2, 0.4), 0, 0, 0, 1.1, 1.4, 0.5);
  g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  g.userData = { kind: 'ghost', body: b, holder: grp(b) }; // (holder: what it's carrying, see fillLootNode)
  return g;
}
function buildCityTree(rng) {
  const g = new THREE.Group();
  mk(BOX(1.4, 0.6, 1.4), '#6d7480', g, 0, 0.3, 0);
  mk(BOX(1.2, 0.05, 1.2), '#3a2a1a', g, 0, 0.61, 0);
  mk(CYL(0.1, 0.14, 2, 6), '#5a3a2a', g, 0, 1.6, 0);
  for (let i = 0; i < 4; i++) mk(ICO(0.55 + rng() * 0.3, 1), ['#3fcf6a', '#2fae5a'][i % 2], g, (rng() - 0.5) * 0.9, 2.7 + rng() * 0.6, (rng() - 0.5) * 0.9);
  return g;
}
function buildDumpster() {
  const g = new THREE.Group();
  mk(BOX(2.4, 1.2, 1.4), '#2f6a4a', g, 0, 0.7, 0);
  tf(mk(BOX(2.45, 0.08, 0.8), '#1f4a34', g, 0, 1.38, 0.3), -0.3, 0, 0);
  mk(BOX(2.45, 0.08, 0.7), '#1f4a34', g, 0, 1.32, -0.35);
  for (const s of [-1, 1]) mk(CYL(0.12, 0.12, 0.1, 8), '#1a1a1a', g, s * 1.0, 0.1, 0.5).rotation.z = PI / 2;
  mk(BOX(0.4, 0.3, 0.3), '#c9a36b', g, 0.5, 1.5, 0.1);
  return g;
}
