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
    mk(BOX(0.2, 0.18, 0.22), suit, arm, 0, -0.58, 0); // (gloves in the suit color, like in first person)
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
  tf(mk(DOD(r), '#3a2a3a', g, 0, r * 0.35, 0), 0, rng() * 6, 0, 1, 0.7, 1);
  // glowing cracks, kept inside the rock so nothing hangs in the air
  for (let i = 0; i < 3; i++) tf(mk(BOX(0.14, 0.14, r * 0.95), '#ff6a1f', g, (rng() - 0.5) * r * 0.5, r * 0.35 + (rng() - 0.5) * r * 0.3, (rng() - 0.5) * r * 0.5, { emissive: '#ff3a00' }), (rng() - 0.5) * 0.6, rng() * 3, 0);
  g.userData.r = r * 0.85;
  return g;
}
function buildRock(rng, color) {
  const r = 0.5 + rng() * 1.4;
  const g = new THREE.Group();
  tf(mk(DOD(r), color || '#8a8a8a', g, 0, r * 0.3, 0), rng() * 3, rng() * 3, 0, 1, 0.6 + rng() * 0.4, 1);
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
// junk you can vacuum. Lots of different kinds so the moon doesn't look copy-pasted.
const SCRAP_KINDS = ['cans', 'tv', 'tires', 'gears', 'toaster', 'barrel', 'boards', 'wheel', 'pipes', 'robohead', 'fridge', 'boot'];
function buildScrapNode(rng) {
  const g = new THREE.Group();
  const kind = SCRAP_KINDS[Math.floor(rng() * SCRAP_KINDS.length)];
  const pick = (a) => a[Math.floor(rng() * a.length)];
  const metal = pick(['#9aa3ad', '#b0b8c0', '#7a8591', '#c9ced6']);
  const paint = pick(['#d6281b', '#3a8fd8', '#3fcf6a', '#ffb23e', '#9b5de5', '#e0672a']);
  switch (kind) {
    case 'cans':
      for (let i = 0; i < 4; i++) { const a = rng() * 6, d = rng() * 0.35; mk(CYL(0.11, 0.11, 0.3, 8), pick([paint, metal, '#d8c46a']), g, Math.cos(a) * d, 0.15, Math.sin(a) * d); }
      tf(mk(CYL(0.12, 0.12, 0.12, 8), metal, g, 0.3, 0.1, -0.2), PI / 2, 0.4, 0);
      break;
    case 'tv':
      tf(mk(BOX(0.7, 0.55, 0.55), '#5a4a3a', g, 0, 0.27, 0), 0, 0, 0.12);
      mk(BOX(0.52, 0.4, 0.04), '#1a2a2a', g, 0.03, 0.29, 0.28, { emissive: '#0a2a1a' });
      for (const s of [-1, 1]) tf(mk(CYL(0.012, 0.012, 0.5, 4), metal, g, s * 0.12, 0.72, 0), 0, 0, s * 0.5);
      break;
    case 'tires':
      tf(mk(TOR(0.34, 0.14, 6, 12), '#222222', g, 0, 0.12, 0), PI / 2, 0, 0);
      tf(mk(TOR(0.3, 0.13, 6, 12), '#2e2e2e', g, 0.05, 0.36, 0.04), PI / 2, 0, 0);
      mk(CYL(0.18, 0.18, 0.04, 10), metal, g, 0.05, 0.5, 0.04);
      break;
    case 'gears':
      for (let i = 0; i < 3; i++) {
        const gr = grp(g, (rng() - 0.5) * 0.4, 0.06 + i * 0.1, (rng() - 0.5) * 0.4); gr.rotation.y = rng() * 3;
        const r = 0.16 + rng() * 0.1, c = pick(['#c9a227', metal, '#b87333']);
        mk(CYL(r, r, 0.07, 10), c, gr, 0, 0, 0);
        for (let k = 0; k < 8; k++) { const a = (k / 8) * PI * 2; mk(BOX(0.06, 0.07, 0.08), c, gr, Math.cos(a) * (r + 0.03), 0, Math.sin(a) * (r + 0.03)).rotation.y = -a; }
      }
      break;
    case 'toaster':
      mk(BOX(0.5, 0.36, 0.3), pick(['#c9ced6', '#d6281b', '#ffe066']), g, 0, 0.18, 0);
      for (const s of [-1, 1]) mk(BOX(0.36, 0.02, 0.06), '#222222', g, 0, 0.37, s * 0.07);
      tf(mk(BOX(0.28, 0.3, 0.05), '#d9a066', g, 0.05, 0.42, 0.07), 0, 0, 0.15);
      tf(mk(CYL(0.015, 0.015, 0.6, 4), '#222222', g, -0.4, 0.02, 0.1), 0, 0.5, PI / 2);
      break;
    case 'barrel':
      tf(mk(CYL(0.28, 0.28, 0.75, 8), paint, g, 0, 0.28, 0), PI / 2, rng() * 3, 0);
      mk(CYL(0.45, 0.45, 0.02, 12), '#7dff8a', g, 0.45, 0.02, 0.2, { emissive: '#1a8a2a' });
      break;
    case 'boards':
      for (let i = 0; i < 3; i++) tf(mk(BOX(0.42, 0.03, 0.3), '#1e7b3a', g, (rng() - 0.5) * 0.3, 0.04 + i * 0.04, (rng() - 0.5) * 0.3), 0, rng() * 3, 0);
      for (let i = 0; i < 5; i++) mk(BOX(0.05, 0.03, 0.05), '#ffd23f', g, (rng() - 0.5) * 0.3, 0.16, (rng() - 0.5) * 0.2);
      tf(mk(BOX(0.4, 0.03, 0.28), '#2a8f4a', g, 0.15, 0.2, 0), 0, 0.3, 0.7);
      break;
    case 'wheel':
      tf(mk(TOR(0.38, 0.03, 4, 16), '#222222', g, 0, 0.38, 0), 0, 0.3, 0.25);
      for (let k = 0; k < 4; k++) tf(mk(CYL(0.008, 0.008, 0.72, 3), metal, g, 0, 0.38, 0), 0, 0.3, 0.25 + (k / 4) * PI);
      tf(mk(CYL(0.02, 0.02, 0.5, 5), paint, g, 0.35, 0.12, 0.2), 0, 0, 1.2);
      break;
    case 'pipes':
      for (let i = 0; i < 4; i++) tf(mk(CYL(0.07, 0.07, 0.8, 6), pick([metal, '#b87333']), g, 0, 0.07 + (i % 2) * 0.12, -0.18 + i * 0.12), 0, 0, PI / 2);
      break;
    case 'robohead':
      tf(mk(BOX(0.45, 0.38, 0.4), metal, g, 0, 0.19, 0), 0, 0, 0.2);
      for (const s of [-1, 1]) mk(SPH(0.06, 6, 5), '#ff3d3d', g, s * 0.1 + 0.03, 0.24, 0.2, { emissive: '#880000' });
      mk(CYL(0.012, 0.012, 0.3, 4), metal, g, 0.05, 0.48, 0);
      tf(mk(BOX(0.1, 0.4, 0.1), metal, g, 0.4, 0.05, 0.1), 0, 0.4, PI / 2);
      break;
    case 'fridge':
      tf(mk(BOX(0.5, 0.95, 0.45), '#e8e4dc', g, 0, 0.36, 0), 0, 0, 0.35);
      tf(mk(BOX(0.04, 0.3, 0.04), '#9aa3ad', g, -0.02, 0.5, 0.24), 0, 0, 0.35);
      break;
    case 'boot':
      mk(BOX(0.22, 0.34, 0.24), '#6b4a2b', g, 0, 0.17, 0);
      mk(BOX(0.24, 0.14, 0.5), '#6b4a2b', g, 0, 0.07, 0.12);
      mk(BOX(0.26, 0.04, 0.54), '#2b1d14', g, 0, 0.02, 0.12);
      tf(mk(CYL(0.1, 0.1, 0.24, 8), metal, g, -0.32, 0.12, -0.1), PI / 2, 0.8, 0);
      break;
  }
  g.userData.kind = kind;
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
function buildCritter(kind, gold) {
  const root = new THREE.Group(), body = grp(root);
  const C = (c) => (gold ? '#ffd23f' : c); // golden critters are golden all over
  const E = gold ? { emissive: '#aa7700' } : undefined;
  const legs = [];
  const leg = (x, z, h = 0.25, col = '#3b3f4a') => { const l = grp(body, x, h, z); mk(BOX(0.07, h, 0.07), C(col), l, 0, -h / 2, 0, E); legs.push(l); };
  const eyes = (y, z, spread, r = 0.07) => { for (const s of [-1, 1]) { mk(SPH(r, 6, 5), '#ffffff', body, s * spread, y, z); mk(SPH(r * 0.55, 5, 4), '#111111', body, s * spread, y, z + r * 0.6); } };
  let hit = 0.45, hy = null, hover = 0, wings = null, rotors = null, rolls = null;
  switch (kind) {
    case 'rat':
      tf(mk(SPH(0.28, 8, 6), C('#8a7f74'), body, 0, 0.3, 0, E), 0, 0, 0, 0.9, 0.8, 1.4);
      mk(SPH(0.17, 8, 6), C('#9a8f84'), body, 0, 0.36, 0.38, E);
      mk(SPH(0.04, 5, 4), '#ff8fa3', body, 0, 0.36, 0.55);
      for (const s of [-1, 1]) mk(SPH(0.08, 6, 5), '#ff8fa3', body, s * 0.12, 0.52, 0.34);
      eyes(0.42, 0.48, 0.07, 0.04);
      tf(mk(CYL(0.02, 0.03, 0.5, 5), '#ff8fa3', body, 0, 0.3, -0.55), PI / 2 - 0.3);
      for (const [x, z] of [[-0.14, 0.2], [0.14, 0.2], [-0.14, -0.2], [0.14, -0.2]]) leg(x, z, 0.16, '#6b625a');
      break;
    case 'crab':
      tf(mk(SPH(0.34, 8, 6), C('#c8551f'), body, 0, 0.32, 0, E), 0, 0, 0, 1.3, 0.6, 1);
      for (const s of [-1, 1]) {
        mk(CYL(0.02, 0.02, 0.2, 4), C('#c8551f'), body, s * 0.1, 0.5, 0.18, E);
        mk(SPH(0.06, 6, 5), '#ffffff', body, s * 0.1, 0.62, 0.18); mk(SPH(0.03, 5, 4), '#111111', body, s * 0.1, 0.63, 0.23);
        const claw = grp(body, s * 0.42, 0.34, 0.25);
        tf(mk(BOX(0.18, 0.12, 0.24), C('#e0672a'), claw, 0, 0, 0, E), 0, s * 0.4, 0);
        legs.push(claw);
        for (let i = 0; i < 3; i++) leg(s * 0.34, -0.1 + i * 0.12, 0.2, '#9a3f14');
      }
      break;
    case 'blob':
      tf(mk(SPH(0.36, 10, 8), C('#43e0c0'), body, 0, 0.3, 0, gold ? E : { emissive: '#0a4a3a' }), 0, 0, 0, 1, 0.8, 1);
      eyes(0.38, 0.3, 0.1, 0.07);
      break;
    case 'hopper':
      tf(mk(SPH(0.32, 8, 6), C('#7ddc5a'), body, 0, 0.32, 0, E), 0, 0, 0, 1.1, 0.8, 1.2);
      for (const s of [-1, 1]) { mk(SPH(0.11, 7, 5), '#ffffff', body, s * 0.15, 0.58, 0.14); mk(SPH(0.06, 5, 4), '#111111', body, s * 0.15, 0.6, 0.23); }
      mk(BOX(0.3, 0.03, 0.05), '#2b3a1a', body, 0, 0.3, 0.38);
      for (const s of [-1, 1]) { const l = grp(body, s * 0.28, 0.25, -0.18); tf(mk(BOX(0.12, 0.3, 0.12), C('#5bbf3a'), l, 0, -0.1, 0, E), 0.7); legs.push(l); }
      leg(-0.12, 0.2, 0.2, '#5bbf3a'); leg(0.12, 0.2, 0.2, '#5bbf3a');
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
      for (const [x, y, z, r] of [[0, 0.3, 0, 0.28], [0.18, 0.36, -0.1, 0.18], [-0.18, 0.36, -0.1, 0.18], [0, 0.46, -0.12, 0.2]]) mk(ICO(r, 1), C('#f4f8ff'), body, x, y, z, E);
      eyes(0.36, 0.24, 0.09, 0.06);
      for (const [x, z] of [[-0.14, 0.1], [0.14, 0.1], [-0.14, -0.14], [0.14, -0.14]]) leg(x, z, 0.14, '#9fb8cc');
      break;
    case 'weasel':
      tf(mk(CYL(0.16, 0.16, 0.9, 7), C('#e8f0f8'), body, 0, 0.32, 0, E), PI / 2);
      mk(SPH(0.19, 8, 6), C('#f4f8ff'), body, 0, 0.4, 0.52, E);
      mk(SPH(0.04, 5, 4), '#111111', body, 0, 0.4, 0.71);
      eyes(0.47, 0.62, 0.08, 0.04);
      for (const s of [-1, 1]) mk(CONE(0.06, 0.12, 4), C('#e8f0f8'), body, s * 0.1, 0.6, 0.48, E);
      tf(mk(CYL(0.05, 0.1, 0.5, 6), '#2b3a4a', body, 0, 0.36, -0.65), PI / 2 + 0.3);
      for (const [x, z] of [[-0.12, 0.3], [0.12, 0.3], [-0.12, -0.3], [0.12, -0.3]]) leg(x, z, 0.2, '#c9d6e3');
      break;
    case 'lsnail':
      tf(mk(CYL(0.16, 0.2, 0.8, 7), C('#6a4c8a'), body, 0, 0.14, 0.05, E), PI / 2);
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
      tf(mk(HEMI(0.32, 10, 4), C('#9b5de5'), body, 0, 0.42, 0, E), 0, 0, 0, 1, 0.6, 1);
      for (let i = 0; i < 4; i++) { const a = i * 1.7; mk(SPH(0.05, 5, 4), '#ffffff', body, Math.sin(a) * 0.2, 0.55, Math.cos(a) * 0.2); }
      eyes(0.34, 0.13, 0.06, 0.045);
      leg(-0.07, 0, 0.16, '#f3e9d2'); leg(0.07, 0, 0.16, '#f3e9d2');
      break;
    case 'leech': // a long sticky slug
      for (let i = 0; i < 4; i++) mk(SPH(0.2 - i * 0.03, 8, 6), C(i % 2 ? '#2ab5a5' : '#43e0c0'), body, 0, 0.18, 0.24 - i * 0.2, gold ? E : { emissive: '#0a3a3a' });
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
      mk(ICO(0.32, 1), C('#f4f8ff'), body, 0, 0.42, 0, E);
      mk(ICO(0.22, 1), C('#f4f8ff'), body, 0, 0.72, 0.12, E);
      tf(mk(SPH(0.14, 7, 5), '#8fa3b8', body, 0, 0.7, 0.26), 0, 0, 0, 1, 0.8, 0.5);
      for (const s of [-1, 1]) { mk(SPH(0.035, 5, 4), '#111111', body, s * 0.06, 0.74, 0.32); mk(CONE(0.03, 0.08, 3), '#ffffff', body, s * 0.05, 0.62, 0.3).rotation.x = PI; }
      for (const s of [-1, 1]) { const a = grp(body, s * 0.3, 0.5, 0.05); mk(ICO(0.1, 0), C('#e8f0f8'), a, 0, -0.12, 0, E); legs.push(a); }
      leg(-0.12, 0, 0.18, '#dfe8f0'); leg(0.12, 0, 0.18, '#dfe8f0');
      break;
    case 'ember': // a little bug that is also a little fire
      tf(mk(SPH(0.22, 8, 6), C('#2a1f2e'), body, 0, 0.26, 0, E), 0, 0, 0, 1, 0.7, 1.3);
      for (let i = 0; i < 3; i++) mk(OCT(0.12 - i * 0.02), '#ff6a1f', body, (i - 1) * 0.08, 0.42 + i * 0.05, -0.05, { emissive: '#ff3a00' });
      eyes(0.32, 0.26, 0.06, 0.035);
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) leg(s * 0.2, -0.12 + i * 0.12, 0.16, '#1a1420');
      break;
    case 'hound': // the Emperor's three-eyed guard dog
      tf(mk(BOX(0.34, 0.3, 0.7), C('#6a2a8a'), body, 0, 0.42, 0, E), 0, 0, 0);
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
      tf(mk(SPH(0.22, 8, 6), C('#4a3a6a'), body, 0, 0.8, 0, E), 0, 0, 0, 1, 1.1, 1);
      mk(SPH(0.16, 8, 6), C('#5a4a7a'), body, 0, 1.02, 0.1, E);
      for (const s of [-1, 1]) {
        tf(mk(CONE(0.07, 0.2, 4), C('#5a4a7a'), body, s * 0.1, 1.2, 0.08, E), 0, 0, -s * 0.25);
        mk(SPH(0.035, 5, 4), '#ff3d3d', body, s * 0.06, 1.05, 0.24, { emissive: '#aa0000' });
        mk(CONE(0.015, 0.05, 3), '#ffffff', body, s * 0.03, 0.94, 0.24).rotation.x = PI;
        const w = grp(body, s * 0.18, 0.85, 0);
        mk(BOX(0.5, 0.03, 0.34), C('#3a2a5a'), w, s * 0.26, 0, 0, E);
        tf(mk(BOX(0.3, 0.03, 0.22), C('#3a2a5a'), w, s * 0.55, 0, -0.08, E), 0, s * 0.4, 0);
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
      for (const [x, y, z, r] of [[0, 0.75, 0, 0.3], [0.24, 0.7, -0.02, 0.2], [-0.24, 0.7, 0, 0.21], [0.1, 0.92, -0.05, 0.2], [-0.1, 0.9, 0.02, 0.18]]) mk(ICO(r, 1), C('#ffffff'), body, x, y, z, E);
      eyes(0.8, 0.26, 0.09, 0.05);
      tf(mk(SPH(0.04, 5, 4), '#ff8fa3', body, 0, 0.7, 0.28), 0, 0, 0, 1.6, 0.6, 0.6);
      for (let i = 0; i < 3; i++) mk(BOX(0.025, 0.12, 0.025), '#9fd0ff', body, -0.12 + i * 0.12, 0.35 + (i % 2) * 0.08, 0);
      break;
    case 'gull': // a seagull. It wants your lunch. Then it wants you.
      tf(mk(SPH(0.26, 8, 6), C('#f4f4f0'), body, 0, 0.42, 0, E), 0, 0, 0, 0.9, 0.85, 1.3);
      mk(SPH(0.16, 8, 6), C('#ffffff'), body, 0, 0.64, 0.22, E);
      tf(mk(CONE(0.05, 0.2, 5), '#ffd23f', body, 0, 0.6, 0.44), PI / 2);
      mk(SPH(0.03, 5, 4), '#d6281b', body, 0, 0.56, 0.5);
      eyes(0.68, 0.33, 0.08, 0.035);
      for (const s of [-1, 1]) tf(mk(BOX(0.12, 0.03, 0.03), '#2a2a30', body, s * 0.08, 0.74, 0.35), 0, 0, s * 0.45);
      wings = [];
      for (const s of [-1, 1]) { const w = grp(body, s * 0.2, 0.5, 0); mk(BOX(0.46, 0.04, 0.3), C('#9aa0a8'), w, s * 0.22, 0, -0.04, E); mk(BOX(0.16, 0.045, 0.28), '#2a2a30', w, s * 0.46, 0, -0.06); wings.push(w); }
      tf(mk(BOX(0.2, 0.04, 0.22), C('#9aa0a8'), body, 0, 0.44, -0.36, E), 0.3, 0, 0);
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
      mk(ICO(0.24, 1), C('#fff36b'), body, 0, 0.72, 0, gold ? E : { emissive: '#ccaa00' });
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
      mk(BOX(0.36, 0.14, 0.36), C('#3b3f4a'), body, 0, 1.0, 0, E);
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
      tf(mk(SPH(0.3, 8, 6), C('#8a8f98'), body, 0, 0.36, -0.05, E), 0, 0, 0, 1, 0.85, 1.35);
      mk(SPH(0.2, 8, 6), C('#9aa0a8'), body, 0, 0.5, 0.34, E);
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
      mk(BOX(0.2, 0.06, 0.8), C('#2a2d38'), body, 0, 0.16, 0, E);
      tf(mk(CYL(0.025, 0.025, 0.95, 6), C('#9aa3ad'), body, 0, 0.62, 0.36, E), -0.12, 0, 0);
      mk(BOX(0.5, 0.04, 0.04), C('#2a2d38'), body, 0, 1.08, 0.42, E);
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
  return { root, body, legs, hit, hy, hover, wings, rotors, rolls };
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
  const z = ZAPPERS[lvl] || ZAPPERS[0], color = z.color, g = new THREE.Group();
  let tip = null, wheel = null, mz = -0.4, my = 0.03; // (muzzle position)
  tf(mk(BOX(0.07, 0.18, 0.09), '#3b3f4a', g, 0, -0.1, 0.08), 0.3); // grip
  switch (z.type) {
    case 'spread': // Scrap Scattergun: two fat barrels, a pump, and a lot of duct tape
      mk(BOX(0.13, 0.12, 0.26), '#b8662e', g, 0, 0.03, 0.02);
      mk(BOX(0.09, 0.08, 0.1), '#6b4a2b', g, 0, 0.0, 0.16);
      for (const s of [-1, 1]) {
        tf(mk(CYL(0.034, 0.034, 0.34, 8), '#4a4f5a', g, s * 0.036, 0.05, -0.27), PI / 2);
        mk(TOR(0.034, 0.009, 4, 12), '#2b2f38', g, s * 0.036, 0.05, -0.44);
      }
      mk(BOX(0.09, 0.05, 0.12), '#6b4a2b', g, 0, -0.01, -0.22);
      mk(BOX(0.145, 0.035, 0.04), '#c9ced6', g, 0, 0.05, -0.15);
      for (const zz of [-0.06, 0.02, 0.1]) mk(SPH(0.012, 5, 4), '#ffd23f', g, 0.068, 0.06, zz);
      mk(BOX(0.015, 0.03, 0.015), '#2b2f38', g, 0, 0.1, -0.05);
      mz = -0.46; my = 0.05;
      break;
    case 'lob': // Goo Lobber: a fat tube with a tank of glowing goo on top
      tf(mk(CYL(0.075, 0.085, 0.44, 12), '#5b3a8a', g, 0, 0.04, -0.14), PI / 2);
      for (const zz of [-0.02, -0.3]) mk(TOR(0.082, 0.012, 4, 14), '#ffd23f', g, 0, 0.04, zz);
      tf(mk(CYL(0.1, 0.08, 0.06, 12), '#3b2a6a', g, 0, 0.04, -0.38), PI / 2);
      tf(mk(CYL(0.032, 0.032, 0.17, 10), '#ff5fb8', g, 0, 0.15, -0.1, { emissive: '#8a1060' }), PI / 2);
      tf(mk(CYL(0.042, 0.042, 0.19, 10), M('#dff6ff', { transparent: true, opacity: 0.35, depthWrite: false }), g, 0, 0.15, -0.1), PI / 2);
      for (const zz of [-0.005, -0.195]) tf(mk(CYL(0.045, 0.045, 0.02, 10), '#9aa3ad', g, 0, 0.15, zz), PI / 2);
      tip = mk(SPH(0.055, 8, 6), '#ff5fb8', g, 0, 0.04, -0.39, { emissive: '#8a1060' }); // a goo ball, loaded
      mz = -0.44; my = 0.04;
      break;
    case 'jackpot': // Jackpot Blaster: solid gold, with a tiny slot machine on the side
      tf(mk(SPH(0.1, 10, 8), '#ffd23f', g, 0, 0.03, 0.02, { emissive: '#4a3500' }), 0, 0, 0, 1, 0.95, 1.5);
      tf(mk(CYL(0.035, 0.05, 0.28, 10), '#c9a227', g, 0, 0.03, -0.2), PI / 2);
      for (let i = 0; i < 3; i++) mk(TOR(0.052, 0.013, 4, 12), '#ff3df0', g, 0, 0.03, -0.14 - i * 0.07, { emissive: '#aa00aa' });
      mk(BOX(0.03, 0.075, 0.12), '#1a1a2a', g, 0.095, 0.04, 0.01);
      ['#ff4b3e', '#ffe066', '#3df0ff'].forEach((c, i) => mk(BOX(0.012, 0.05, 0.028), c, g, 0.111, 0.04, 0.05 - i * 0.037, { emissive: c }));
      mk(CYL(0.006, 0.006, 0.09, 4), '#cccccc', g, 0.105, 0.11, 0.06);
      mk(SPH(0.018, 6, 5), '#ff3d3d', g, 0.105, 0.16, 0.06);
      mk(BOX(0.045, 0.006, 0.012), '#111111', g, 0, 0.125, 0.04); // the coin slot
      tip = mk(SPH(0.042, 6, 5), '#ffd23f', g, 0, 0.03, -0.35, { emissive: '#ffd23f' });
      break;
    case 'beam': // Cryo Beam: glowing coils and a crystal that the beam comes out of
      mk(BOX(0.11, 0.11, 0.3), '#e6f3ff', g, 0, 0.03, -0.02);
      tf(mk(CYL(0.022, 0.022, 0.32, 8), '#9fe3ff', g, 0, 0.03, -0.2, { emissive: '#1a6a8a' }), PI / 2);
      for (let i = 0; i < 4; i++) mk(TOR(0.058, 0.012, 4, 12), '#3aa7ff', g, 0, 0.03, -0.14 - i * 0.055, { emissive: '#0a4a8a' });
      for (const [x, y] of [[0, 0.1], [0.072, 0.03], [-0.072, 0.03]]) mk(BOX(x ? 0.012 : 0.07, x ? 0.07 : 0.012, 0.18), '#c9dcff', g, x, y, 0.02);
      tip = tf(mk(OCT(0.05), '#bff6ff', g, 0, 0.03, -0.39, { emissive: '#3aa7ff' }), PI / 2, 0, 0, 0.7, 2.2, 0.7);
      mz = -0.46;
      break;
    case 'cutter': // Pizza Cutter: a launcher with a cutter wheel sitting in the front (it's gone while it's out)
      mk(BOX(0.08, 0.06, 0.3), '#3b3f4a', g, 0, 0.02, -0.08);
      mk(BOX(0.05, 0.05, 0.14), '#d6281b', g, 0, 0.06, -0.2);
      for (const s of [-1, 1]) mk(BOX(0.012, 0.08, 0.08), '#9aa3ad', g, s * 0.025, 0.08, -0.3);
      wheel = buildCutterWheel(g, 0.11);
      wheel.position.set(0, 0.07, -0.33);
      mz = -0.34; my = 0.07;
      break;
    case 'homing': { // Wisp Caller: an old iron lantern on a stock, with a ghost wisp trapped inside
      mk(BOX(0.06, 0.07, 0.22), '#3a3048', g, 0, 0.0, 0.06);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mk(BOX(0.016, 0.15, 0.016), '#2a2233', g, x * 0.05, 0.06, -0.15 + z * 0.05);
      for (const y of [-0.015, 0.135]) mk(BOX(0.13, 0.02, 0.13), '#2a2233', g, 0, y, -0.15);
      tf(mk(TOR(0.03, 0.008, 4, 10), '#2a2233', g, 0, 0.17, -0.15), 0, PI / 2, 0);
      mk(SPH(0.058, 10, 8), M('#dfffe6', { transparent: true, opacity: 0.3, depthWrite: false }), g, 0, 0.06, -0.15);
      tip = mk(SPH(0.036, 8, 6), '#9dffb0', g, 0, 0.06, -0.15, { emissive: '#3aff6a' });
      tf(mk(CONE(0.035, 0.12, 6), '#2a2233', g, 0, 0.05, -0.28), -PI / 2);
      mz = -0.36; my = 0.05;
      break;
    }
    case 'chain': // Storm Caller: a copper coil gun, a ball of lightning crackling between two prongs
      mk(BOX(0.08, 0.08, 0.2), '#1d2a4a', g, 0, 0.0, 0.06);
      tf(mk(CYL(0.03, 0.03, 0.3, 8), '#9aa3ad', g, 0, 0.03, -0.14), PI / 2);
      for (let i = 0; i < 5; i++) mk(TOR(0.046 - i * 0.003, 0.012, 4, 12), '#c87533', g, 0, 0.03, -0.04 - i * 0.045, { emissive: '#3a1a00' });
      for (const s of [-1, 1]) tf(mk(BOX(0.014, 0.014, 0.16), '#c9ced6', g, s * 0.05, 0.03, -0.36), 0, -s * 0.3, 0);
      tip = mk(ICO(0.045, 1), '#dff0ff', g, 0, 0.03, -0.41, { emissive: '#6aa8ff' });
      mk(BOX(0.05, 0.04, 0.05), '#ffd23f', g, 0, 0.06, 0.1, { emissive: '#5a4000' });
      mz = -0.44;
      break;
    case 'rocket': // Same-Day Launcher: a cardboard tube with a parcel loaded in the front
      tf(mk(CYL(0.075, 0.075, 0.5, 10), '#c9a36b', g, 0, 0.05, -0.12), PI / 2);
      for (const zz of [0.1, -0.36]) tf(mk(CYL(0.082, 0.082, 0.04, 10), '#8a6a3a', g, 0, 0.05, zz), PI / 2);
      mk(BOX(0.1, 0.03, 0.12), '#fff6d0', g, 0, 0.13, -0.08);
      mk(BOX(0.04, 0.05, 0.06), '#3b3f4a', g, 0, 0.14, 0.06);
      tip = mk(BOX(0.09, 0.09, 0.09), '#ffb23e', g, 0, 0.05, -0.4, { emissive: '#3a2008' });
      mk(BOX(0.092, 0.02, 0.092), '#e8d8a0', g, 0, 0.05, -0.4);
      mz = -0.46; my = 0.05;
      break;
    default: // Pew Pew Zapper: the classic
      tf(mk(SPH(0.09, 10, 8), color, g, 0, 0.02, 0.02), 0, 0, 0, 1, 0.9, 1.4);
      tf(mk(CONE(0.03, 0.1, 4), '#e6e1dc', g, 0, 0.11, 0.04), -0.5, 0, 0, 1, 1, 0.3);
      tf(mk(CYL(0.03, 0.045, 0.26, 8), '#e6e1dc', g, 0, 0.03, -0.2), PI / 2);
      for (let i = 0; i < 3; i++) mk(TOR(0.05, 0.014, 4, 10), color, g, 0, 0.03, -0.14 - i * 0.07);
      tip = mk(SPH(0.04, 6, 5), color, g, 0, 0.03, -0.35, { emissive: color });
  }
  const muzzle = grp(g, 0, my, mz);
  // muzzle flash: a bright star that shows for a frame or two when firing
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), new THREE.MeshBasicMaterial({ map: flashTex(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  flash.position.set(0, my, mz - 0.04); flash.visible = false; flash.renderOrder = 5;
  g.add(flash);
  g.userData = { tip, muzzle, flash, wheel };
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
  const g = new THREE.Group();
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
function buildPeelVM() {
  const g = new THREE.Group();
  tf(mk(BOX(0.07, 0.18, 0.09), '#3b3f4a', g, 0, -0.1, 0.1), 0.3);
  tf(mk(CYL(0.025, 0.03, 0.34, 6), '#8a5a2b', g, 0, -0.01, -0.05), PI / 2);
  const board = grp(g, 0, 0, -0.36);
  mk(CYL(0.2, 0.2, 0.02, 14), '#d9a066', board, 0, 0, 0);
  mk(BOX(0.1, 0.02, 0.14), '#d9a066', board, 0, 0, 0.2);
  // a sad little pepperoni someone left on it
  mk(CYL(0.035, 0.035, 0.012, 8), '#c8321e', board, 0.07, 0.015, -0.04);
  const muzzle = grp(g, 0, 0, -0.5);
  g.userData = { board, muzzle };
  return g;
}

/* ---------------- first-person hands (your suit's gloves and sleeves) ---------------- */
// (the gloves are in your suit color, so they stand out against the guns; glove: that material)
const SLEEVE = '#f4f1ea', SEAL = '#30343f';
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
// the glove's wrist, the suit's seal and the sleeve, from `at` heading off along `dir` (out of view)
function forearm(g, at, dir, glove) {
  const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir);
  const put = (m, d) => { m.position.copy(at).addScaledVector(dir, d); m.quaternion.copy(q); };
  put(mk(CYL(0.045, 0.054, 0.075, 16), glove, g), 0.02);
  put(mk(TOR(0.052, 0.012, 8, 20).rotateX(Math.PI / 2), SEAL, g), 0.06); // (a ring around the wrist)
  put(mk(CYL(0.062, 0.08, 0.6, 16), SLEEVE, g), 0.365);
}
// a right hand around a pistol grip. The group sits in the middle of the grip, tilted like it: the grip
// runs along y and the fingers wrap around its front (-z). gw, gd: how wide and deep the grip is.
function buildGripHand(glove, gw = 0.07, gd = 0.09) {
  return withHi(null, () => {
    const g = new THREE.Group(), hx = gw / 2, hz = gd / 2;
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
    forearm(g, new V3(0.022, -0.03, hz + 0.03), new V3(0.42, -0.6, 0.68).normalize(), glove);
    mergeLocal(g);
    return g;
  });
}
// a left hand holding something up from underneath (a barrel, a pump, a tube): the group sits on its
// middle line; R: how far down its underside is, W: half its width
function buildSupportHand(glove, R, W) {
  return withHi(null, () => {
    const g = new THREE.Group();
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
    forearm(g, new V3(-0.02, -R - 0.032, 0.05), new V3(-0.5, -0.42, 0.76).normalize(), glove);
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
// put your hands on something you're holding (kind: 'vac', 'drill', 'peel', or a gun type; glove: the
// glove material, in your suit color)
function addHands(vm, kind, glove) {
  const spec = HAND_SPEC[kind] || {}, gp = spec.grip || HAND_SPEC.zap.grip, hands = {};
  hands.grip = buildGripHand(glove, gp[4], gp[5]);
  hands.grip.position.set(gp[0], gp[1], gp[2]);
  hands.grip.rotation.x = gp[3];
  vm.add(hands.grip);
  if (spec.support) {
    const s = spec.support;
    hands.support = buildSupportHand(glove, s[3], s[4]);
    hands.support.position.set(s[0], s[1], s[2]);
    hands.support.userData.home = hands.support.position.clone();
    vm.add(hands.support);
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
function buildPearlNode(big) {
  const g = new THREE.Group(), s = big ? 1.5 : 1;
  const b = grp(g, 0, 0.55, 0);
  tf(mk(HEMI(0.32 * s, 10, 4), '#ffd6f4', b, 0, 0, 0), PI, 0, 0, 1, 0.45, 1);
  const lid = grp(b, 0, 0, -0.28 * s); lid.rotation.x = -0.95;
  tf(mk(HEMI(0.32 * s, 10, 4), '#ffc2ea', lid, 0, 0, 0.28 * s), 0, 0, 0, 1, 0.45, 1);
  mk(SPH(0.15 * s, 10, 8), big ? '#fff3c4' : '#ffffff', b, 0, 0.1 * s, 0.03, { emissive: big ? '#aa8a3a' : '#5a5a7a' });
  g.userData.bob = b;
  glowRing(g, 0.65 * s, big ? '#ffd23f' : '#bfe8ff');
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
}
// Skipper Gale: an albatross who sails the sky (no boat)
function buildAlbatross() {
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
}
// Trench Coat Trevor: definitely one normal adult man (three raccoons)
function buildTrenchRaccoons() {
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
// a ghost you can vacuum on Spookulon (it drifts around its graveyard; see PlanetWorld.moveGhost)
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
  g.userData.body = b;
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
