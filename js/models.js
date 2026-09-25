'use strict';
/* =========================================================
   Low-poly model builders. Everything faces +Z.
   ========================================================= */
const PI = Math.PI;

/* ---------------- people ---------------- */
function buildAstronaut(o = {}) {
  const suit = o.color || '#ff7a3d', white = '#f4f1ea', dark = '#3b3f4a';
  const root = new THREE.Group();
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = grp(root, s * 0.16, 0.82, 0);
    mk(BOX(0.24, 0.62, 0.26), white, leg, 0, -0.3, 0);
    mk(BOX(0.26, 0.1, 0.28), suit, leg, 0, -0.1, 0);
    mk(BOX(0.28, 0.22, 0.34), dark, leg, 0, -0.72, 0.03);
    legs.push(leg);
  }
  mk(BOX(0.66, 0.72, 0.42), white, root, 0, 1.18, 0);
  mk(BOX(0.68, 0.16, 0.44), suit, root, 0, 0.9, 0);
  mk(BOX(0.3, 0.22, 0.05), dark, root, 0, 1.24, 0.22);
  mk(BOX(0.06, 0.06, 0.04), '#ff4b3e', root, -0.08, 1.26, 0.25);
  mk(BOX(0.06, 0.06, 0.04), '#3fcf6a', root, 0, 1.26, 0.25);
  mk(BOX(0.06, 0.06, 0.04), '#ffd23f', root, 0.08, 1.26, 0.25);
  mk(BOX(0.5, 0.6, 0.26), suit, root, 0, 1.2, -0.33);
  for (const s of [-1, 1]) mk(CYL(0.08, 0.08, 0.5, 6), '#c9ced6', root, s * 0.14, 1.22, -0.5);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = grp(root, s * 0.43, 1.48, 0);
    mk(BOX(0.2, 0.56, 0.22), white, arm, 0, -0.24, 0);
    mk(BOX(0.22, 0.1, 0.24), suit, arm, 0, -0.04, 0);
    mk(BOX(0.2, 0.18, 0.22), dark, arm, 0, -0.58, 0);
    arm.userData.hand = grp(arm, 0, -0.62, 0.06);
    arms.push(arm);
  }
  const head = grp(root, 0, 1.9, 0);
  mk(ICO(0.24, 1), o.skin || '#f2c9a0', head, 0, -0.02, 0.02);
  for (const s of [-1, 1]) {
    mk(SPH(0.075, 6, 5), '#ffffff', head, s * 0.09, 0.03, 0.2);
    mk(SPH(0.04, 5, 4), '#111111', head, s * 0.09, 0.03, 0.26);
  }
  mk(BOX(0.12, 0.03, 0.03), '#6b2d2d', head, 0, -0.11, 0.23);
  const glass = mk(SPH(0.38, 12, 9), M('#bfe8ff', { transparent: true, opacity: 0.3, depthWrite: false }), head, 0, 0, 0);
  glass.castShadow = false;
  tf(mk(TOR(0.3, 0.06, 5, 14), suit, head, 0, -0.3, 0), PI / 2);
  const hatSlot = grp(head, 0, 0.34, 0);
  const r = { root, legL: legs[0], legR: legs[1], armL: arms[0], armR: arms[1], head, hatSlot, hand: arms[1].userData.hand };
  setHat(r, o.hat || 'none');
  return r;
}

function setHat(ch, id) {
  if (ch.hatId === id) return;
  ch.hatId = id;
  while (ch.hatSlot.children.length) { const c = ch.hatSlot.children[0]; ch.hatSlot.remove(c); disposeObj(c); }
  if (id && id !== 'none') ch.hatSlot.add(buildHat(id));
}

function buildHat(id) {
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
  }
  return g;
}

// generic human-ish NPC body
function buildHumanoid(o) {
  const root = new THREE.Group();
  for (const s of [-1, 1]) {
    mk(BOX(0.24, 0.8, 0.26), o.pants || '#34405e', root, s * 0.15, 0.42, 0);
    mk(BOX(0.26, 0.14, 0.34), o.shoe || '#2a2a2a', root, s * 0.15, 0.06, 0.04);
  }
  mk(BOX(0.64, 0.74, 0.38), o.shirt || '#ffffff', root, 0, 1.18, 0);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = grp(root, s * 0.42, 1.48, 0);
    mk(BOX(0.18, 0.58, 0.2), o.sleeve || o.shirt || '#ffffff', arm, 0, -0.26, 0);
    mk(BOX(0.16, 0.16, 0.18), o.skin || '#f2c9a0', arm, 0, -0.62, 0);
    arms.push(arm);
  }
  const head = grp(root, 0, 1.86, 0);
  tf(mk(ICO(o.headR || 0.3, 1), o.skin || '#f2c9a0', head, 0, 0, 0), 0, 0, 0, 1, o.headY || 1.08, 0.95);
  return { root, head, armL: arms[0], armR: arms[1] };
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
}

function buildSnailChef() {
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
}

function buildAlien(o = {}) {
  const b = buildHumanoid({ shirt: o.vest || '#9b5de5', sleeve: '#7ddc5a', skin: '#7ddc5a', pants: '#2b2140', headR: 0.36, headY: 1.2 });
  b.head.position.y = 1.95;
  addEyes(b.head, 0.08, 0.3, 0.16, 0.085, 3);
  mk(BOX(0.2, 0.04, 0.04), '#2b3a1a', b.head, 0, -0.18, 0.32);
  for (const s of [-1, 1]) {
    tf(mk(CYL(0.02, 0.02, 0.3, 4), '#7ddc5a', b.head, s * 0.14, 0.48, 0), 0, 0, -s * 0.3);
    mk(SPH(0.06, 6, 5), '#ffd23f', b.head, s * 0.2, 0.64, 0, { emissive: '#886600' });
  }
  if (o.bowtie) {
    mk(BOX(0.28, 0.12, 0.06), '#ff3d6e', b.root, 0, 1.5, 0.21);
  }
  if (o.shades) {
    mk(BOX(0.62, 0.12, 0.06), '#111111', b.head, 0, 0.12, 0.36);
    tf(mk(TOR(0.22, 0.03, 4, 12), '#ffd23f', b.root, 0, 1.42, 0.12), PI / 2 - 0.3);
  }
  return b;
}

function buildPenguin() {
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
}

function buildManager() {
  const b = buildHumanoid({ shirt: '#ffffff', sleeve: '#ffffff', pants: '#2b2b33', skin: '#f0c29a' });
  mk(BOX(0.1, 0.5, 0.05), '#c0392b', b.root, 0, 1.25, 0.2);
  mk(BOX(0.66, 0.06, 0.4), '#2b2b33', b.root, 0, 0.84, 0);
  addEyes(b.head, 0.05, 0.25, 0.1, 0.06);
  for (const s of [-1, 1]) tf(mk(TOR(0.08, 0.015, 4, 10), '#111111', b.head, s * 0.1, 0.05, 0.3), 0, 0, 0);
  mk(BOX(0.06, 0.015, 0.02), '#111111', b.head, 0, 0.05, 0.31);
  tf(mk(BOX(0.4, 0.05, 0.3), '#6b4a2b', b.head, 0.02, 0.3, 0), 0, 0, -0.15);
  mk(BOX(0.16, 0.03, 0.03), '#6b2d2d', b.head, 0, -0.13, 0.27);
  const mug = grp(b.armR, 0, -0.66, 0.14);
  mk(CYL(0.09, 0.08, 0.18, 8), '#ffffff', mug, 0, 0, 0);
  tf(mk(TOR(0.05, 0.015, 4, 8), '#ffffff', mug, 0.1, 0, 0), 0, PI / 2, 0);
  b.armR.rotation.x = -0.9;
  return b;
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
  return root;
}

/* ---------------- the ship ---------------- */
function buildShip() {
  const g = new THREE.Group();
  const white = '#f4f1ea', red = '#ff5a36', grey = '#6d7480';
  tf(mk(CYL(1.8, 2.1, 7, 10), white, g, 0, 2.7, 0), PI / 2);
  tf(mk(CONE(1.8, 2.8, 10), red, g, 0, 2.7, 4.9), PI / 2);
  tf(mk(CYL(1.86, 1.9, 0.6, 10), red, g, 0, 2.7, 1.2), PI / 2);
  tf(mk(CYL(1.9, 2.0, 0.6, 10), red, g, 0, 2.7, -2.2), PI / 2);
  tf(mk(SPH(1.1, 10, 8), M('#7fd8ff', { transparent: true, opacity: 0.65 }), g, 0, 4.0, 2.4), 0, 0, 0, 1, 0.7, 1.4);
  for (const s of [-1, 1]) tf(mk(BOX(0.22, 2.2, 2.2), red, g, s * 2.1, 2.3, -2.8), 0, 0, -s * 0.55);
  mk(BOX(0.22, 2.0, 2.2), red, g, 0, 4.6, -2.8);
  for (const s of [-1, 1]) {
    tf(mk(CYL(0.6, 0.8, 1.2, 8), grey, g, s * 1.0, 2.2, -4.0), PI / 2);
    tf(mk(CYL(0.55, 0.55, 0.05, 8), '#ffb03a', g, s * 1.0, 2.2, -4.62, { emissive: '#ff6a00' }), PI / 2);
  }
  for (const [x, z] of [[-1.6, 2.4], [1.6, 2.4], [-1.6, -2.6], [1.6, -2.6]]) {
    tf(mk(BOX(0.18, 1.6, 0.18), grey, g, x * 1.08, 0.8, z), 0, 0, x > 0 ? 0.25 : -0.25);
    mk(CYL(0.35, 0.4, 0.14, 8), grey, g, x * 1.25, 0.07, z);
  }
  mk(BOX(0.12, 1.8, 1.4), '#3b3f4a', g, 2.06, 2.4, 0.2);
  const ramp = mk(BOX(2.6, 0.12, 1.5), '#9aa3ad', g, 3.1, 0.85, 0.2);
  ramp.rotation.z = -0.62;
  // pizza topper
  mk(BOX(0.4, 0.3, 0.4), grey, g, 0, 4.8, -0.4);
  const top = grp(g, 0, 5.4, -0.4);
  mk(BOX(2.4, 0.9, 0.5), '#ffffff', top, 0, 0, 0);
  for (const s of [-1, 1]) {
    const sg = signMesh(['PIZZA'], 2.3, 0.8, { bg: '#d6281b', border: '#ffd23f' });
    sg.position.set(0, 0, s * 0.26); if (s < 0) sg.rotation.y = PI; top.add(sg);
  }
  const side = signMesh(['LATE DELIVERY CO.', '"Always Late. Never Hot."'], 4.4, 1.3, { bg: red, border: '#ffffff', colors: ['#ffffff', '#ffe6b3'] });
  side.position.set(-2.12, 2.9, -0.6); side.rotation.y = -PI / 2; g.add(side);
  return g;
}

/* ---------------- props ---------------- */
function buildJunkPile(rng) {
  const g = new THREE.Group();
  const cols = ['#8f6b52', '#6f7b83', '#a0522d', '#5a6b4a', '#7a6a8a', '#b07a3a'];
  const n = 5 + Math.floor(rng() * 5);
  for (let i = 0; i < n; i++) {
    const t = rng(), x = (rng() - 0.5) * 3, z = (rng() - 0.5) * 3, y = rng() * 1.4;
    const c = cols[Math.floor(rng() * cols.length)];
    if (t < 0.35) tf(mk(BOX(0.6 + rng() * 0.9, 0.5 + rng() * 0.8, 0.6 + rng() * 0.9), c, g, x, y + 0.3, z), rng(), rng(), rng() * 0.5);
    else if (t < 0.6) tf(mk(TOR(0.45, 0.2, 6, 10), '#2a2a2a', g, x, y + 0.2, z), PI / 2 + (rng() - 0.5), rng() * 3, 0);
    else if (t < 0.8) tf(mk(CYL(0.4, 0.4, 1.0, 8), c, g, x, y + 0.5, z), rng() > 0.5 ? PI / 2 : 0, rng() * 3, 0);
    else tf(mk(CYL(0.12, 0.12, 2.2, 6), '#9aa3ad', g, x, y + 0.4, z), rng(), rng(), 1.2);
  }
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
  tf(mk(new THREE.SphereGeometry(1.6, 12, 6, 0, PI * 2, PI / 2, PI / 2), '#e6e1dc', d, 0, 1.2, 0), 0, 0, 0, 1, 0.4, 1);
  mk(CYL(0.05, 0.05, 1.4, 4), '#555555', d, 0, 1.3, 0);
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
  tf(mk(DOD(r), '#3a2a3a', g, 0, r * 0.5, 0), rng(), rng(), rng(), 1, 0.7, 1);
  for (let i = 0; i < 3; i++) tf(mk(BOX(0.12, 0.12, r * 1.2), '#ff6a1f', g, (rng() - 0.5) * r, r * 0.5 + (rng() - 0.5) * r * 0.4, 0, { emissive: '#ff3a00' }), rng(), rng(), 0);
  return g;
}
function buildRock(rng, color) {
  const r = 0.5 + rng() * 1.4;
  const g = new THREE.Group();
  tf(mk(DOD(r), color || '#8a8a8a', g, 0, r * 0.4, 0), rng() * 3, rng() * 3, 0, 1, 0.6 + rng() * 0.4, 1);
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

/* ---------------- collectible nodes ---------------- */
function glowRing(parent, r, col) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.8, r, 20), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -PI / 2; ring.position.y = 0.06; parent.add(ring);
  return ring;
}
function buildScrapNode(rng) {
  const g = new THREE.Group();
  tf(mk(TOR(0.22, 0.08, 5, 8), '#c9a227', g, 0.2, 0.25, 0), 0.5, 0.3, 0);
  mk(CYL(0.13, 0.13, 0.32, 8), '#b0b8c0', g, -0.25, 0.16, 0.1);
  tf(mk(BOX(0.38, 0.2, 0.28), '#8f6b52', g, 0, 0.1, -0.25), 0, rng() * 3, 0);
  tf(mk(CYL(0.05, 0.05, 0.4, 6), '#9aa3ad', g, 0.1, 0.1, 0.25), 0, 0, PI / 2);
  glowRing(g, 0.85, '#7dff8a');
  return g;
}
function buildBerryNode(big) {
  const g = new THREE.Group();
  const col = big ? '#ff9a3d' : '#7a4dff', s = big ? 1.35 : 1;
  const b = grp(g, 0, 0.55, 0);
  mk(SPH(0.22 * s, 8, 6), col, b, 0, 0, 0, { emissive: big ? '#6a2a00' : '#2a1466' });
  mk(SPH(0.17 * s, 8, 6), col, b, 0.22 * s, -0.08, 0.05, { emissive: big ? '#6a2a00' : '#2a1466' });
  mk(SPH(0.16 * s, 8, 6), col, b, -0.12 * s, -0.1, 0.18 * s, { emissive: big ? '#6a2a00' : '#2a1466' });
  tf(mk(BOX(0.25, 0.03, 0.12), '#3fcf6a', b, 0, 0.22 * s, 0), 0, 0.4, 0.3);
  g.userData.bob = b;
  glowRing(g, 0.7 * s, big ? '#ffb86b' : '#c9b3ff');
  return g;
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

/* ---------------- tools (first-person) ---------------- */
function buildZapperVM(color) {
  const g = new THREE.Group();
  tf(mk(BOX(0.07, 0.18, 0.09), '#3b3f4a', g, 0, -0.1, 0.08), 0.3);
  tf(mk(SPH(0.09, 10, 8), color, g, 0, 0.02, 0.02), 0, 0, 0, 1, 0.9, 1.4);
  tf(mk(CONE(0.03, 0.1, 4), '#e6e1dc', g, 0, 0.11, 0.04), -0.5, 0, 0, 1, 1, 0.3);
  tf(mk(CYL(0.03, 0.045, 0.26, 8), '#e6e1dc', g, 0, 0.03, -0.2), PI / 2);
  for (let i = 0; i < 3; i++) tf(mk(TOR(0.05, 0.014, 4, 10), color, g, 0, 0.03, -0.14 - i * 0.07), 0, 0, 0);
  const tip = mk(SPH(0.04, 6, 5), color, g, 0, 0.03, -0.35, { emissive: color });
  const muzzle = grp(g, 0, 0.03, -0.4);
  g.userData = { tip, muzzle };
  return g;
}
function buildVacVM() {
  const g = new THREE.Group();
  tf(mk(CYL(0.1, 0.1, 0.34, 8), '#ffd23f', g, 0.02, -0.02, 0.05), PI / 2);
  tf(mk(BOX(0.08, 0.18, 0.1), '#3b3f4a', g, 0.02, -0.15, 0.1), 0.2);
  tf(mk(CYL(0.05, 0.05, 0.34, 6), '#9aa3ad', g, 0.02, 0.0, -0.26), PI / 2);
  const noz = tf(mk(CYL(0.13, 0.06, 0.2, 8), '#3b3f4a', g, 0.02, 0.0, -0.5), PI / 2);
  const glow = mk(CYL(0.11, 0.11, 0.02, 8), '#7dff8a', g, 0.02, 0, -0.61, { emissive: '#1a8a2a' });
  glow.rotation.x = PI / 2;
  const muzzle = grp(g, 0.02, 0, -0.65);
  g.userData = { muzzle, noz, glow };
  return g;
}
function buildDrillVM() {
  const g = new THREE.Group();
  tf(mk(BOX(0.09, 0.2, 0.11), '#3b3f4a', g, 0, -0.12, 0.08), 0.25);
  mk(BOX(0.16, 0.16, 0.3), '#9fe3ff', g, 0, 0.02, 0);
  const bit = grp(g, 0, 0.02, -0.18);
  tf(mk(CONE(0.08, 0.34, 6), '#c9d2da', bit, 0, 0, -0.17), -PI / 2);
  const tip = mk(SPH(0.03, 5, 4), '#7dffff', bit, 0, 0, -0.35, { emissive: '#00aaff' });
  const muzzle = grp(g, 0, 0.02, -0.55);
  g.userData = { bit, tip, muzzle };
  return g;
}

/* ---------------- bosses (return {root, body, hit:[{o,r}], ...}) ---------------- */
function buildBossModel(id) {
  switch (id) {
    case 'gary': return buildGary();
    case 'blorb': return buildBlorb();
    case 'jerry': return buildJerry();
    case 'snowdad': return buildSnowdad();
    case 'zorblax': return buildZorblax();
  }
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
    mk(DOD(0.7), '#1f2a1f', arm, 0, -2.3, 0.2);
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
  return { root, body, hit: [{ o: new V3(0, 2.4, 0), r: 2.8 }], mouth: new V3(0, 2.2, 2.6) };
}

const JERRY_SYMS = ['🍒', '🔔', '7', '💰', '🍋', '💀'];
function drawJerryReels(tex, syms, spinning) {
  const cv = tex.userData.canvas, c = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  c.fillStyle = '#1a1a2a'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 3; i++) {
    const x = 12 + i * ((w - 24) / 3);
    c.fillStyle = '#fff8e6'; roundRect(c, x + 6, 14, (w - 24) / 3 - 12, h - 28, 18); c.fill();
    const s = spinning ? JERRY_SYMS[Math.floor(Math.random() * JERRY_SYMS.length)] : syms[i];
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (s === '7') { c.font = `bold ${h * 0.62}px ${FONT}`; c.fillStyle = '#d6281b'; }
    else { c.font = `${h * 0.5}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; c.fillStyle = '#000'; }
    c.fillText(s, x + (w - 24) / 6, h / 2 + 6);
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
  return { root, body, arms, legs, hit: [{ o: new V3(0, 3.4, 0), r: 2.4 }, { o: new V3(0, 5.6, 0.2), r: 1.3 }], mouth: new V3(0, 5.3, 1.4) };
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
function buildMinion(kind) {
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
  }
  return g;
}

/* ---------------- boss projectile meshes ---------------- */
function projMesh(kind, r) {
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
    default: mk(SPH(r, 6, 5), '#ffffff', g, 0, 0, 0, { emissive: '#666666' });
  }
  g.traverse((c) => { if (c.isMesh) c.castShadow = false; });
  return g;
}
