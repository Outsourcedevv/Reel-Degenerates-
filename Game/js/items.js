'use strict';
/* =========================================================
   Models of the things you carry, buy and win. The interface
   shows pictures of these (see thumbs.js) instead of drawings.
   Everything faces +Z, like the rest of the models.
   ========================================================= */

// a small printed label (drawn big and shrunk, so the text stays sharp)
function itemLabel(lines, w, h, o = {}) {
  const s = signMesh(lines, w * 4, h * 4, o);
  s.scale.setScalar(0.25);
  return s;
}
const clearLabel = (lines, w, h, color) => itemLabel(lines, w, h, { bg: 'rgba(0,0,0,0)', color, border: false, transparent: true });
const sparkle = (parent, x, y, z, s = 0.05) => mk(OCT(s), '#fff6b0', parent, x, y, z, { emissive: '#ffcc00' });

/* ---------------- backpacks (0: the one on your suit) ---------------- */
function buildBackpackItem(lvl) {
  const g = new THREE.Group();
  const straps = (z) => { for (const s of [-1, 1]) mk(BOX(0.07, 0.6, 0.04), '#2b2f38', g, s * 0.15, 0.4, z); };
  switch (lvl) {
    case 1: // Bigger Backpack: a proper hiking pack with a bedroll on top
      mk(BOX(0.56, 0.78, 0.34), '#4f7a3a', g, 0, 0.39, 0);
      tf(mk(BOX(0.58, 0.14, 0.38), '#3e612d', g, 0, 0.8, 0.02), 0.1);
      mk(BOX(0.4, 0.3, 0.1), '#5d8c45', g, 0, 0.26, 0.21);
      mk(BOX(0.42, 0.08, 0.12), '#3e612d', g, 0, 0.42, 0.22);
      for (const s of [-1, 1]) mk(BOX(0.08, 0.34, 0.24), '#5d8c45', g, s * 0.32, 0.28, 0);
      tf(mk(CYL(0.12, 0.12, 0.62, 10), '#c0392b', g, 0, 0.98, 0), 0, 0, PI / 2);
      for (const s of [-1, 1]) mk(BOX(0.04, 0.26, 0.26), '#2b1d14', g, s * 0.18, 0.98, 0);
      mk(BOX(0.08, 0.05, 0.03), '#ffd23f', g, 0, 0.38, 0.28);
      straps(-0.19);
      break;
    case 2: // Snail Shell Backpack: the previous owner wants it back
      mk(BOX(0.4, 0.5, 0.06), '#8a5a3a', g, 0, 0.42, -0.2);
      straps(-0.24);
      mk(TOR(0.28, 0.15, 8, 22), '#e4845a', g, 0, 0.45, 0);
      mk(TOR(0.16, 0.11, 8, 18), '#f0a070', g, 0.04, 0.5, 0.1);
      mk(TOR(0.07, 0.07, 8, 14), '#f7c090', g, 0.06, 0.53, 0.17);
      mk(SPH(0.06, 8, 6), '#f7c090', g, 0.07, 0.54, 0.2);
      tf(mk(SPH(0.09, 8, 6), '#b7e36a', g, -0.1, 0.06, 0.1, { emissive: '#2a4a0a' }), 0, 0, 0, 1.4, 0.4, 1); // (a little slime)
      break;
    case 3: // Industrial Fridge: you are wearing a fridge now
      mk(BOX(0.56, 0.92, 0.44), '#e8e4dc', g, 0, 0.46, 0);
      mk(BOX(0.57, 0.015, 0.45), '#b8b4ac', g, 0, 0.64, 0);
      mk(BOX(0.04, 0.16, 0.05), '#9aa3ad', g, 0.2, 0.77, 0.245);
      mk(BOX(0.04, 0.3, 0.05), '#9aa3ad', g, 0.2, 0.4, 0.245);
      tf(mk(CYL(0.06, 0.06, 0.02, 3), '#ffc94a', g, -0.12, 0.45, 0.23), PI / 2); // fridge magnets
      mk(SPH(0.035, 6, 5), '#ff3d6e', g, -0.02, 0.32, 0.23);
      mk(BOX(0.06, 0.07, 0.02), '#3a8fd8', g, -0.18, 0.26, 0.23);
      tf(mk(BOX(0.13, 0.14, 0.01), '#fff6a0', g, -0.08, 0.78, 0.225), 0, 0, 0.12); // a sticky note
      mk(BOX(0.06, 0.03, 0.02), '#7dfff0', g, -0.18, 0.86, 0.225, { emissive: '#1a8a8a' });
      for (const [x, z] of [[-0.22, -0.16], [0.22, -0.16], [-0.22, 0.16], [0.22, 0.16]]) mk(BOX(0.06, 0.04, 0.06), '#3b3f4a', g, x, 0.02, z);
      straps(-0.24);
      break;
    default: // the standard-issue pack: a box and two air tanks
      mk(BOX(0.5, 0.6, 0.26), '#ff7a3d', g, 0, 0.3, 0);
      for (const s of [-1, 1]) {
        mk(CYL(0.08, 0.08, 0.46, 10), '#c9ced6', g, s * 0.14, 0.31, 0.17);
        mk(SPH(0.08, 10, 6), '#c9ced6', g, s * 0.14, 0.54, 0.17);
        mk(CYL(0.025, 0.025, 0.08, 6), '#3b3f4a', g, s * 0.14, 0.64, 0.17);
      }
      ['#ff4b3e', '#3fcf6a', '#ffd23f'].forEach((c, i) => mk(BOX(0.06, 0.03, 0.06), c, g, -0.1 + i * 0.1, 0.61, -0.05, { emissive: c }));
      straps(-0.15);
  }
  return g;
}

/* ---------------- gear ---------------- */
function buildBootsItem() {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const b = grp(g, s * 0.15, 0.16, s * 0.04);
    b.rotation.y = s * 0.15;
    for (let i = 0; i < 3; i++) tf(mk(TOR(0.07, 0.018, 5, 12), '#c9ced6', b, 0, -0.11 + i * 0.045, 0.04), PI / 2);
    mk(BOX(0.2, 0.05, 0.42), '#2b1d14', b, 0, 0, 0.04);
    mk(BOX(0.18, 0.14, 0.36), '#ff5fb8', b, 0, 0.09, 0.05);
    mk(BOX(0.17, 0.3, 0.18), '#ff5fb8', b, 0, 0.29, -0.06);
    mk(BOX(0.185, 0.06, 0.19), '#7dff8a', b, 0, 0.44, -0.06, { emissive: '#1a6a2a' });
    for (let k = 0; k < 3; k++) mk(BOX(0.11, 0.02, 0.02), '#ffffff', b, 0, 0.15 + k * 0.07, 0.035 - k * 0.012);
  }
  return g;
}
function buildSocksItem() {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const k = grp(g, s * 0.13, 0, 0);
    k.rotation.set(0, s * 0.25, s * 0.08);
    mk(BOX(0.16, 0.4, 0.14), '#d6281b', k, 0, 0.3, 0);
    mk(BOX(0.16, 0.12, 0.3), '#d6281b', k, 0, 0.06, 0.08);
    mk(BOX(0.165, 0.06, 0.145), '#ffffff', k, 0, 0.48, 0);
    for (const y of [0.2, 0.32]) mk(BOX(0.168, 0.035, 0.148), '#ffb23e', k, 0, y, 0, { emissive: '#aa4400' });
    mk(BOX(0.17, 0.13, 0.08), '#ffffff', k, 0, 0.065, 0.2);
  }
  for (const [x, y] of [[-0.06, 0.64], [0.08, 0.72], [0, 0.82]]) mk(SPH(0.03, 6, 4), '#ffd27a', g, x, y, 0.05, { emissive: '#aa5500' });
  return g;
}
function buildArmorItem() {
  const g = new THREE.Group();
  mk(BOX(0.62, 0.72, 0.24), '#6b7280', g, 0, 0.4, 0);
  mk(BOX(0.64, 0.1, 0.26), '#4b5260', g, 0, 0.1, 0);
  for (const s of [-1, 1]) tf(mk(BOX(0.22, 0.12, 0.32), '#8a93a3', g, s * 0.34, 0.72, 0), 0, 0, -s * 0.35);
  mk(BOX(0.26, 0.1, 0.25), '#3b3f4a', g, 0, 0.78, 0);
  tf(mk(CYL(0.13, 0.13, 0.03, 16), '#d6281b', g, 0, 0.48, 0.125), PI / 2);
  tf(mk(CYL(0.08, 0.08, 0.02, 3), '#ffc94a', g, 0, 0.47, 0.145), PI / 2);
  for (const [x, y] of [[-0.25, 0.7], [0.25, 0.7], [-0.25, 0.2], [0.25, 0.2]]) mk(SPH(0.02, 5, 4), '#c9ced6', g, x, y, 0.125);
  const l = itemLabel(['LATE DELIVERY CO.'], 0.44, 0.06, { bg: '#4b5260', color: '#ffffff', border: false });
  l.position.set(0, 0.24, 0.123); g.add(l);
  return g;
}
function buildInsuranceItem() {
  const g = new THREE.Group();
  const doc = grp(g, -0.06, 0.36, -0.05);
  doc.rotation.set(-0.12, 0.15, 0.05);
  mk(BOX(0.5, 0.66, 0.02), '#f4f1ea', doc, 0, 0, 0);
  mk(BOX(0.5, 0.12, 0.022), '#3a8fd8', doc, 0, 0.27, 0);
  for (let i = 0; i < 5; i++) mk(BOX(i === 4 ? 0.18 : 0.36, 0.02, 0.023), '#9aa0a6', doc, i === 4 ? 0.09 : 0, 0.12 - i * 0.07, 0);
  const l = itemLabel(['EXTRA LIFE'], 0.4, 0.08, { bg: '#3a8fd8', color: '#ffffff', border: false });
  l.position.set(0, 0.27, 0.013); doc.add(l);
  // the life itself, with a halo
  const h = grp(g, 0.1, 0.22, 0.12);
  for (const s of [-1, 1]) mk(SPH(0.09, 10, 8), '#ff3d6e', h, s * 0.065, 0.04, 0, { emissive: '#5a0a1a' });
  tf(mk(BOX(0.13, 0.13, 0.12), '#ff3d6e', h, 0, -0.03, 0, { emissive: '#5a0a1a' }), 0, 0, PI / 4);
  tf(mk(TOR(0.09, 0.015, 5, 16), '#ffe66b', h, 0, 0.2, 0, { emissive: '#ffcc00' }), PI / 2 - 0.3);
  return g;
}
function buildLuckyFootItem() {
  const g = new THREE.Group(), foot = grp(g, 0, 0.1, 0);
  foot.rotation.set(0.3, -0.5, 0);
  tf(mk(SPH(0.16, 10, 8), '#7ddc5a', foot, 0, 0.06, 0), 0, 0, 0, 1, 0.55, 1.5);
  mk(CYL(0.08, 0.1, 0.22, 8), '#7ddc5a', foot, 0, 0.18, -0.12);
  for (const x of [-0.08, 0, 0.08]) {
    mk(SPH(0.055, 8, 6), '#6bc84a', foot, x, 0.08, 0.2);
    mk(SPH(0.025, 5, 4), '#ffd23f', foot, x, 0.1, 0.25); // toenails (painted gold, obviously)
  }
  tf(mk(TOR(0.07, 0.014, 5, 14), '#c9ced6', foot, 0, 0.33, -0.12), 0, PI / 2, 0);
  mk(TOR(0.04, 0.012, 4, 10), '#c9ced6', foot, 0, 0.42, -0.12);
  sparkle(g, 0.22, 0.38, 0.05);
  return g;
}
// a Goo Grenade: a glass ball of pink goo in a metal cage (the same pink goo you throw in boss fights)
function buildGrenadeItem() {
  const g = new THREE.Group();
  mk(SPH(0.2, 12, 10), '#ff5fb8', g, 0, 0.2, 0, { emissive: '#6a0a4a' });
  tf(mk(TOR(0.2, 0.018, 5, 20), '#9aa3ad', g, 0, 0.2, 0), PI / 2);
  tf(mk(TOR(0.2, 0.018, 5, 20), '#9aa3ad', g, 0, 0.2, 0), 0, PI / 2, 0);
  mk(CYL(0.07, 0.08, 0.08, 10), '#3b3f4a', g, 0, 0.41, 0);
  tf(mk(BOX(0.04, 0.16, 0.03), '#9aa3ad', g, 0.07, 0.36, 0), 0, 0, -0.25);
  tf(mk(TOR(0.045, 0.01, 4, 12), '#c9ced6', g, -0.09, 0.44, 0), 0, PI / 2, 0);
  for (const [x, y, z] of [[0.06, 0.26, 0.15], [-0.08, 0.14, 0.14]]) mk(SPH(0.03, 6, 4), '#ffc2e6', g, x, y, z, { emissive: '#a03a7a' });
  return g;
}
function buildGrenadesItem() {
  const g = new THREE.Group();
  for (const [x, z, r] of [[-0.2, 0, 0.3], [0.2, -0.05, -0.2], [0, 0.22, 0.1]]) { const n = buildGrenadeItem(); n.position.set(x, 0, z); n.rotation.y = r; g.add(n); }
  return g;
}

/* ---------------- boss summoning items ---------------- */
function buildStinkyCrown() {
  const g = new THREE.Group();
  const c = buildHat('crown');
  c.scale.setScalar(1.7); c.rotation.set(0.15, 0.3, -0.18); c.position.y = 0.05;
  g.add(c);
  for (const [x, y, s] of [[-0.18, 0.55, 0.05], [0.02, 0.66, 0.06], [0.2, 0.52, 0.045], [-0.06, 0.8, 0.04], [0.12, 0.86, 0.035]]) mk(SPH(s, 6, 5), '#9bd35a', g, x, y, 0, { emissive: '#2a4a0a' });
  const f = grp(g, 0.3, 0.72, 0.1); // a fly, obviously
  mk(SPH(0.03, 6, 4), '#111111', f, 0, 0, 0);
  for (const s of [-1, 1]) tf(mk(BOX(0.05, 0.005, 0.03), '#e8f4ff', f, s * 0.035, 0.02, 0), 0, 0, s * 0.4);
  return g;
}
function buildRoyalJelly() {
  const g = new THREE.Group();
  mk(CYL(0.175, 0.175, 0.28, 16), '#ff5fb8', g, 0, 0.15, 0, { emissive: '#7a1050' });
  mk(CYL(0.2, 0.2, 0.36, 16), M('#dff6ff', { transparent: true, opacity: 0.35, depthWrite: false }), g, 0, 0.18, 0);
  mk(CYL(0.21, 0.21, 0.07, 16), '#ffd23f', g, 0, 0.39, 0);
  const cr = buildHat('crown');
  cr.scale.setScalar(0.7); cr.position.y = 0.42;
  g.add(cr);
  const l = itemLabel(['ROYAL', 'JELLY'], 0.22, 0.12, { bg: '#fff6e0', colors: ['#d6281b', '#d6281b'], border: '#ffd23f' });
  l.position.set(0, 0.17, 0.205); g.add(l);
  return g;
}
function buildGoldenToken() {
  const g = new THREE.Group(), c = grp(g, 0, 0.36, 0);
  c.rotation.set(-0.1, 0.35, 0.08);
  tf(mk(CYL(0.34, 0.34, 0.07, 28), '#ffd23f', c, 0, 0, 0, { emissive: '#5a4000' }), PI / 2);
  for (const s of [-1, 1]) {
    tf(mk(TOR(0.3, 0.022, 5, 28), '#ffe98a', c, 0, 0, s * 0.036, { emissive: '#5a4000' }), 0, 0, 0);
    const j = clearLabel(['J'], 0.36, 0.36, '#9a6a00');
    j.position.z = s * 0.037; if (s < 0) j.rotation.y = PI;
    c.add(j);
  }
  sparkle(g, 0.3, 0.66, 0.1, 0.06);
  return g;
}
function buildSpaceMilk() {
  const g = new THREE.Group();
  mk(BOX(0.34, 0.46, 0.34), '#f4f8ff', g, 0, 0.23, 0);
  mk(BOX(0.345, 0.1, 0.345), '#3a8fd8', g, 0, 0.06, 0);
  tf(mk(CONE(0.245, 0.18, 4), '#f4f8ff', g, 0, 0.55, 0), 0, PI / 4, 0);
  mk(BOX(0.07, 0.08, 0.07), '#3a8fd8', g, 0, 0.66, 0);
  const l = itemLabel(['SPACE', 'MILK'], 0.28, 0.16, { bg: '#3a8fd8', colors: ['#ffffff', '#ffffff'], border: false });
  l.position.set(0, 0.29, 0.172); g.add(l);
  const m = itemLabel(['MISSING:', 'DAD'], 0.2, 0.12, { bg: '#ffffff', colors: ['#d6281b', '#111111'], border: '#111111' });
  m.position.set(0.172, 0.28, 0); m.rotation.y = PI / 2; g.add(m);
  return g;
}
function buildReheatedPizza() {
  const g = new THREE.Group();
  mk(BOX(0.7, 0.06, 0.7), '#c8a06a', g, 0, 0.03, 0);
  const lid = grp(g, 0, 0.06, -0.35);
  lid.rotation.x = -1.2;
  mk(BOX(0.7, 0.03, 0.7), '#d9b07a', lid, 0, 0, 0.35);
  const l = itemLabel(['PIZZA', '(LATE)'], 0.4, 0.22, { bg: '#d9b07a', colors: ['#d6281b', '#6b4a2b'], border: false });
  l.position.set(0, -0.017, 0.35); l.rotation.x = PI / 2; lid.add(l);
  mk(CYL(0.3, 0.3, 0.04, 20), '#ffc94a', g, 0, 0.08, 0);
  tf(mk(TOR(0.3, 0.04, 6, 24), '#d9933d', g, 0, 0.1, 0), PI / 2);
  for (const [x, z] of [[0.1, 0.08], [-0.12, 0.1], [0.02, -0.14], [-0.1, -0.08], [0.16, -0.1]]) mk(CYL(0.05, 0.05, 0.02, 10), '#d63a2a', g, x, 0.105, z);
  // it's WARM (a miracle)
  for (const [x, y, s] of [[-0.08, 0.3, 0.05], [0.06, 0.42, 0.06], [-0.02, 0.56, 0.045], [0.12, 0.3, 0.04]]) mk(SPH(s, 6, 5), '#ffffff', g, x, y, 0.05, { emissive: '#666666' });
  return g;
}

/* ---------------- things you collect and sell ---------------- */
function buildBoltItem() {
  const g = new THREE.Group(), b = grp(g, 0, 0.22, 0);
  b.rotation.set(0.3, 0.4, 1.1);
  mk(CYL(0.15, 0.15, 0.1, 6), '#a0582e', b, 0, 0.24, 0);
  mk(CYL(0.065, 0.065, 0.42, 8), '#8a5234', b, 0, 0, 0);
  for (let i = 0; i < 5; i++) tf(mk(TOR(0.066, 0.012, 4, 10), '#6e3a1e', b, 0, -0.17 + i * 0.06, 0), PI / 2);
  mk(CYL(0.12, 0.12, 0.08, 6), '#9a6a4a', b, 0, -0.1, 0);
  for (const [x, y, z] of [[0.1, 0.27, 0.09], [-0.06, 0.23, 0.12]]) mk(SPH(0.03, 5, 4), '#c8661e', b, x, y, z);
  return g;
}
function buildCanItem() {
  const g = new THREE.Group();
  mk(CYL(0.17, 0.17, 0.42, 14), '#c9ced6', g, 0, 0.21, 0);
  mk(CYL(0.172, 0.172, 0.26, 14), '#7dcf4a', g, 0, 0.2, 0);
  for (const y of [0.01, 0.41]) tf(mk(TOR(0.17, 0.012, 4, 16), '#9aa3ad', g, 0, y, 0), PI / 2);
  const l = itemLabel(['FOOD?'], 0.2, 0.09, { bg: '#7dcf4a', color: '#2b1d14', border: false });
  l.position.set(0, 0.22, 0.176); g.add(l);
  mk(SPH(0.04, 6, 5), '#7dff8a', g, 0.1, 0.43, 0.08, { emissive: '#1a8a2a' }); // it's leaking. Something green.
  tf(mk(SPH(0.08, 8, 6), '#7dff8a', g, 0.17, 0.005, 0.13, { emissive: '#1a8a2a' }), 0, 0, 0, 1.2, 0.15, 1);
  return g;
}
function buildGearItem() {
  const g = new THREE.Group(), gr = grp(g, 0, 0.32, 0);
  gr.rotation.set(PI / 2 - 0.3, 0, 0.25);
  mk(CYL(0.26, 0.26, 0.08, 16), '#c9a227', gr, 0, 0, 0);
  mk(CYL(0.08, 0.08, 0.09, 10), '#5a4a1a', gr, 0, 0, 0);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * PI * 2;
    const t = mk(BOX(0.09, 0.08, 0.09), '#c9a227', gr, Math.cos(a) * 0.29, 0, Math.sin(a) * 0.29);
    t.rotation.set(k === 3 ? 0.7 : 0, -a, 0); // one bent tooth. Still spins. Emotionally.
  }
  for (let k = 0; k < 4; k++) { const a = (k / 4) * PI * 2 + 0.4; mk(CYL(0.035, 0.035, 0.09, 8), '#8a6e14', gr, Math.cos(a) * 0.16, 0, Math.sin(a) * 0.16); }
  return g;
}
function buildCircuitItem() {
  const g = new THREE.Group(), b = grp(g, 0, 0.12, 0);
  b.rotation.set(0.55, 0.3, 0);
  mk(BOX(0.64, 0.04, 0.44), '#1e7b3a', b, 0, 0, 0);
  for (const [x, z, w, d] of [[0.02, 0.12, 0.3, 0.015], [-0.05, -0.17, 0.4, 0.015], [0.27, 0.04, 0.015, 0.25]]) mk(BOX(w, 0.042, d), '#ffd23f', b, x, 0.002, z);
  mk(BOX(0.2, 0.05, 0.16), '#1a1a1a', b, -0.12, 0.04, -0.04);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) mk(BOX(0.02, 0.02, 0.04), '#c9ced6', b, -0.2 + i * 0.053, 0.025, -0.04 + s * 0.1);
  mk(BOX(0.1, 0.04, 0.08), '#1a1a1a', b, 0.16, 0.035, 0.1);
  [['#3a8fd8', 0.18, -0.12], ['#ffd23f', 0.24, -0.02], ['#d6281b', 0.06, 0.14]].forEach(([c, x, z]) => mk(CYL(0.025, 0.025, 0.08, 8), c, b, x, 0.06, z));
  tf(mk(SPH(0.09, 8, 6), '#ff9ad5', b, 0.12, 0.06, -0.1), 0, 0, 0, 1, 0.45, 1); // sticky with what? Do not ask.
  mk(CYL(0.012, 0.02, 0.14, 5), '#ff9ad5', b, 0.12, 0.12, -0.1);
  return g;
}
function buildToasterItem() {
  const g = new THREE.Group();
  mk(BOX(0.52, 0.36, 0.32), '#ffd23f', g, 0, 0.2, 0, { emissive: '#4a3500' });
  for (const s of [-1, 1]) {
    mk(BOX(0.36, 0.02, 0.06), '#3a2a00', g, 0, 0.385, s * 0.07);
    mk(BOX(0.28, 0.22, 0.04), '#e0a868', g, 0.02 * s, 0.47, s * 0.07);
    mk(BOX(0.29, 0.03, 0.05), '#a8743a', g, 0.02 * s, 0.585, s * 0.07);
  }
  mk(BOX(0.05, 0.08, 0.06), '#3b3f4a', g, 0.285, 0.25, 0);
  for (const [x, z] of [[-0.2, -0.12], [0.2, -0.12], [-0.2, 0.12], [0.2, 0.12]]) mk(SPH(0.03, 5, 4), '#3b3f4a', g, x, 0.02, z);
  sparkle(g, -0.3, 0.52, 0.12);
  return g;
}
function buildBerryItem(kind) {
  const g = new THREE.Group();
  const col = kind === 'gold' ? '#ffd23f' : kind === 'chonk' ? '#ff7a1f' : '#7a4dff';
  const em = kind === 'gold' ? '#6a4a00' : kind === 'chonk' ? '#3a0e00' : '#2a1466';
  const s = kind === 'berry' ? 1 : 1.25;
  for (const [x, y, z, r] of [[0, 0.22, 0, 0.22], [0.22, 0.14, 0.05, 0.17], [-0.12, 0.12, 0.18, 0.16]]) {
    mk(SPH(r * s, 10, 8), col, g, x * s, y * s, z * s, { emissive: em });
    mk(SPH(r * s * 0.18, 5, 4), '#ffffff', g, (x - r * 0.35) * s, (y + r * 0.45) * s, (z + r * 0.7) * s, { emissive: '#999999' });
  }
  tf(mk(BOX(0.25, 0.03, 0.12), '#3fcf6a', g, 0, 0.44 * s, 0), 0, 0.4, 0.3);
  mk(CYL(0.012, 0.015, 0.1, 4), '#2f7a3a', g, 0.02, 0.44 * s, 0);
  if (kind === 'gold') { sparkle(g, 0.3, 0.55, 0.1); sparkle(g, -0.28, 0.3, 0.15, 0.035); }
  return g;
}
function buildIceItem() {
  const g = new THREE.Group();
  tf(mk(BOX(0.34, 0.34, 0.34), '#7fcaf0', g, 0, 0.2, 0, { emissive: '#08304a' }), 0.2, 0.5, 0.1);
  tf(mk(BOX(0.2, 0.2, 0.2), '#9ad8f6', g, 0.27, 0.11, 0.14, { emissive: '#08304a' }), 0.4, 0.2, 0.3);
  mk(BOX(0.1, 0.02, 0.02), '#ffffff', g, -0.04, 0.34, 0.16, { emissive: '#aaaaaa' });
  mk(BOX(0.02, 0.08, 0.02), '#ffffff', g, -0.1, 0.3, 0.16, { emissive: '#aaaaaa' });
  return g;
}
function buildCrystalItem() {
  const g = new THREE.Group();
  tf(mk(DOD(0.2), '#8fa3b8', g, 0, 0.06, 0), 0, 0, 0, 1.3, 0.5, 1.3);
  for (const [x, z, h, rx, rz] of [[0, 0, 3, 0, 0], [0.14, 0.04, 2, 0.1, -0.5], [-0.12, 0.06, 2.2, 0.2, 0.45], [0.02, -0.12, 1.8, -0.5, 0.1]]) tf(mk(OCT(0.12), '#4fd2ff', g, x, 0.1 + h * 0.1, z, { emissive: '#0a5a8a' }), rx, 0, rz, 0.8, h, 0.8);
  return g;
}
function buildDiamondItem() {
  const g = new THREE.Group(), d = grp(g, 0, 0.34, 0);
  d.rotation.set(0.3, 0.3, 0.1);
  mk(CYL(0.19, 0.3, 0.12, 8), '#9fe6ff', d, 0, 0.06, 0, { emissive: '#0a3a5a' });
  tf(mk(CONE(0.3, 0.34, 8), '#5fc8f0', d, 0, -0.17, 0, { emissive: '#0a3050' }), PI);
  mk(CYL(0.19, 0.19, 0.01, 8), '#e6fbff', d, 0, 0.125, 0, { emissive: '#3a7a9a' });
  sparkle(g, 0.26, 0.56, 0.1); sparkle(g, -0.24, 0.2, 0.12, 0.035);
  return g;
}
function buildPepperoniItem() {
  const g = new THREE.Group(), p = grp(g, 0, 0.22, 0);
  p.rotation.set(1.15, 0, 0.2);
  mk(CYL(0.3, 0.3, 0.07, 18), '#c8321e', p, 0, 0, 0, { emissive: '#3a0a00' });
  for (const [x, z] of [[0.12, 0.08], [-0.1, 0.12], [0.02, -0.14], [-0.14, -0.06], [0.16, -0.08]]) mk(CYL(0.035, 0.035, 0.075, 8), '#f0a090', p, x, 0.002, z);
  [['#ffb23e', -0.1, 0.52], ['#fff36b', 0.05, 0.58], ['#ff6a1f', 0.14, 0.5]].forEach(([c, x, y]) => mk(ICO(0.05, 0), c, g, x, y, 0.05, { emissive: c }));
  return g;
}
function buildMozzarellaItem() {
  const g = new THREE.Group();
  tf(mk(SPH(0.24, 12, 10), '#f6ead0', g, 0, 0.2, 0), 0, 0, 0, 1, 0.82, 1);
  tf(mk(SPH(0.12, 10, 8), '#f6ead0', g, 0.22, 0.1, 0.12), 0, 0, 0, 1, 0.7, 1);
  rod(g, new V3(0.08, 0.35, 0.05), new V3(0.26, 0.62, 0.1), 0.02, '#f6ead0');
  mk(SPH(0.035, 6, 5), '#f6ead0', g, 0.26, 0.62, 0.1);
  tf(mk(BOX(0.16, 0.02, 0.1), '#3fcf6a', g, -0.06, 0.4, 0.04), 0, 0.5, 0.2); // a basil leaf
  [[-0.22, 0.45, 0.05, '#c9b3ff'], [0.32, 0.3, -0.05, '#7dffea'], [-0.05, 0.52, 0.15, '#ffd23f']].forEach(([x, y, z, c]) => mk(OCT(0.035), c, g, x, y, z, { emissive: c }));
  return g;
}
function buildGarlicKnotItem() {
  const g = new THREE.Group();
  tf(mk(new THREE.TorusKnotGeometry(0.16, 0.07, 48, 8, 2, 3), '#e8b04a', g, 0, 0.26, 0, { emissive: '#5a3a00' }), 0.4);
  for (let i = 0; i < 10; i++) { const a = i * 2.4; mk(BOX(0.025, 0.012, 0.018), '#3fa04a', g, Math.cos(a) * 0.19, 0.26 + Math.sin(i * 1.7) * 0.08, Math.sin(a) * 0.19 + 0.05); }
  sparkle(g, 0.26, 0.5, 0.05);
  return g;
}

/* ---------------- mystery crate prizes ---------------- */
function buildJackpotPile() {
  const g = new THREE.Group();
  const coin = (x, y, z, rx = 0, rz = 0) => tf(mk(CYL(0.1, 0.1, 0.03, 14), '#ffd23f', g, x, y, z, { emissive: '#5a4000' }), rx, 0, rz);
  for (const [x, z, n] of [[-0.18, 0, 6], [0.02, 0.1, 9], [0.2, -0.04, 5]]) for (let i = 0; i < n; i++) coin(x + (i % 2) * 0.01, 0.015 + i * 0.032, z);
  coin(-0.3, 0.05, 0.2, 0.4, 0.2); coin(0.34, 0.03, 0.16, 0.2, -0.3); coin(0.1, 0.02, 0.3, 0.3, 0);
  const cr = buildHat('crown');
  cr.scale.setScalar(1.1); cr.position.set(0.02, 0.3, 0.1); cr.rotation.z = 0.2;
  g.add(cr);
  mk(OCT(0.07), '#ff3d6e', g, -0.26, 0.1, 0.12, { emissive: '#5a0a1a' });
  sparkle(g, 0.3, 0.45, 0.1);
  return g;
}
function buildGoldenTicket() {
  const g = new THREE.Group(), t = grp(g, 0, 0.25, 0);
  t.rotation.set(-0.3, 0.25, 0.12);
  mk(BOX(0.72, 0.34, 0.02), '#ffd23f', t, 0, 0, 0, { emissive: '#5a4000' });
  const l = itemLabel(['GOLDEN', 'TICKET'], 0.56, 0.26, { bg: '#ffd23f', colors: ['#7a4a00', '#7a4a00'], border: '#b8860b' });
  l.position.z = 0.012; t.add(l);
  for (const s of [-1, 1]) tf(mk(CYL(0.06, 0.06, 0.025, 12), '#7a5a10', t, s * 0.36, 0, 0), PI / 2);
  sparkle(g, 0.36, 0.45, 0.05);
  return g;
}
function buildCashStack() {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) tf(mk(BOX(0.5, 0.035, 0.26), '#3fcf6a', g, (i % 2) * 0.02, 0.02 + i * 0.037, (i % 3) * 0.01), 0, (i - 2) * 0.05, 0);
  mk(BOX(0.12, 0.2, 0.275), '#f4ecd6', g, 0, 0.1, 0);
  const l = clearLabel(['$'], 0.12, 0.12, '#1e6a3a');
  l.position.set(0.16, 0.194, 0.02); l.rotation.x = -PI / 2; g.add(l);
  tf(mk(CYL(0.08, 0.08, 0.025, 14), '#ffd23f', g, 0.3, 0.015, 0.18, { emissive: '#5a4000' }), 0, 0, 0);
  return g;
}
function buildSockItem() {
  const g = new THREE.Group(), k = grp(g, 0, 0.02, 0);
  k.rotation.set(0, 0.5, -0.25);
  mk(BOX(0.16, 0.4, 0.14), '#e8e4dc', k, 0, 0.28, 0);
  mk(BOX(0.16, 0.12, 0.3), '#e8e4dc', k, 0, 0.06, 0.08);
  for (const y of [0.4, 0.44]) mk(BOX(0.165, 0.02, 0.145), '#3a8fd8', k, 0, y, 0);
  tf(mk(CYL(0.035, 0.035, 0.02, 8), '#2b2f38', k, 0.04, 0.12, 0.232), PI / 2); // a hole in the toe. Of course.
  return g;
}
function buildPaperItem(lines, colors) {
  const g = new THREE.Group(), p = grp(g, 0, 0.22, 0);
  p.rotation.set(-0.45, 0.3, 0.1);
  mk(BOX(0.56, 0.34, 0.01), '#fff6e0', p, 0, 0, 0);
  const l = itemLabel(lines, 0.52, 0.3, { bg: '#fff6e0', colors, border: '#9a8a6a' });
  l.position.z = 0.006; p.add(l);
  return g;
}
function buildSpaceRock() {
  const g = new THREE.Group();
  tf(mk(DOD(0.26), '#8a7b6a', g, 0, 0.2, 0), 0.3, 0.5, 0, 1, 0.8, 1);
  for (const [x, y, z] of [[0.08, 0.3, 0.2], [-0.12, 0.18, 0.2], [0.18, 0.12, 0.14]]) mk(SPH(0.045, 6, 4), '#5a4d42', g, x, y, z);
  return g;
}
function buildHalfSandwich() {
  const g = new THREE.Group(), s = grp(g, 0, 0, 0);
  s.rotation.y = 0.6;
  [['#e8c888', 0.03, 0.06], ['#6bd35a', 0.075, 0.03], ['#ffd23f', 0.1, 0.02], ['#e8c888', 0.14, 0.06]].forEach(([c, y, h]) => mk(CYL(0.3, 0.3, h, 3), c, s, 0, y, 0));
  for (const [x, z] of [[0.05, 0.02], [-0.07, -0.05]]) mk(CYL(0.06, 0.06, 0.025, 10), '#d6281b', s, x, 0.088, z);
  return g;
}
function buildEmptyBox() {
  const g = new THREE.Group(), c = '#c8a06a';
  mk(BOX(0.5, 0.03, 0.5), '#8a6a44', g, 0, 0.015, 0);
  for (const s of [-1, 1]) { mk(BOX(0.5, 0.34, 0.03), c, g, 0, 0.17, s * 0.25); mk(BOX(0.03, 0.34, 0.5), c, g, s * 0.25, 0.17, 0); }
  for (const s of [-1, 1]) { const f = grp(g, 0, 0.34, s * 0.25); f.rotation.x = s * 0.9; mk(BOX(0.48, 0.02, 0.24), c, f, 0, 0, s * 0.12); }
  return g;
}

/* ---------------- slot machine symbols ---------------- */
function buildSlotSymbol(k) {
  const g = new THREE.Group();
  switch (k) {
    case 'cherry':
      for (const [x, z] of [[-0.12, 0.02], [0.12, -0.02]]) {
        mk(SPH(0.14, 10, 8), '#d6281b', g, x, 0.14, z, { emissive: '#4a0000' });
        mk(SPH(0.03, 5, 4), '#ffffff', g, x - 0.05, 0.2, z + 0.1, { emissive: '#888888' });
        rod(g, new V3(x, 0.26, z), new V3(0.02, 0.5, 0), 0.015, '#2f7a3a');
      }
      tf(mk(BOX(0.18, 0.02, 0.08), '#3fcf6a', g, 0.1, 0.52, 0), 0, 0, -0.3);
      break;
    case 'planet':
      mk(ICO(0.24, 2), '#ff7a3d', g, 0, 0.3, 0);
      tf(mk(TOR(0.24, 0.02, 4, 24), '#d9542a', g, 0, 0.36, 0), PI / 2 - 0.35, 0, 0.3);
      tf(mk(TOR(0.38, 0.03, 4, 32), '#ffd23f', g, 0, 0.3, 0, { emissive: '#4a3a00' }), PI / 2 - 0.35, 0, 0.3);
      break;
    case 'trash':
      mk(CYL(0.18, 0.15, 0.42, 12), '#7a8591', g, 0, 0.21, 0);
      for (const y of [0.12, 0.3]) tf(mk(TOR(0.17, 0.012, 4, 16), '#5a6571', g, 0, y, 0), PI / 2);
      tf(mk(CYL(0.2, 0.2, 0.04, 12), '#8a95a1', g, 0.03, 0.46, 0), 0, 0, 0.25);
      tf(mk(BOX(0.12, 0.08, 0.03), '#5a6571', g, 0.05, 0.5, 0), 0, 0, 0.25);
      tf(mk(BOX(0.05, 0.2, 0.03), '#ffe066', g, -0.1, 0.46, 0.05), 0, 0, 0.6); // a banana peel sticking out
      break;
    case 'rocket': {
      const r = grp(g, 0, 0.05, 0);
      r.rotation.z = -0.35;
      mk(CYL(0.1, 0.12, 0.4, 12), '#e8e4dc', r, 0, 0.3, 0);
      mk(CONE(0.1, 0.18, 12), '#d6281b', r, 0, 0.59, 0);
      tf(mk(CYL(0.05, 0.05, 0.02, 10), '#3aa7ff', r, 0, 0.36, 0.1, { emissive: '#0a3a6a' }), PI / 2);
      for (let i = 0; i < 3; i++) { const a = (i / 3) * PI * 2; tf(mk(BOX(0.02, 0.14, 0.1), '#d6281b', r, Math.sin(a) * 0.12, 0.14, Math.cos(a) * 0.12), 0, a, 0); }
      mk(ICO(0.07, 0), '#ffb23e', r, 0, 0.04, 0, { emissive: '#ff6a1f' });
      break;
    }
    case 'alien':
      tf(mk(SPH(0.24, 12, 10), '#7ddc5a', g, 0, 0.3, 0), 0, 0, 0, 1, 1.1, 0.95);
      for (const s of [-1, 1]) {
        tf(mk(SPH(0.075, 8, 6), '#111111', g, s * 0.09, 0.31, 0.2), 0, s * 0.3, s * 0.4, 1, 1.5, 0.6);
        rod(g, new V3(s * 0.08, 0.52, 0), new V3(s * 0.16, 0.66, 0), 0.012, '#6bc84a');
        mk(SPH(0.035, 6, 5), '#ffd23f', g, s * 0.16, 0.67, 0, { emissive: '#886600' });
      }
      break;
    case 'meteor':
      tf(mk(DOD(0.18), '#6d6470', g, -0.06, 0.18, 0), 0.4, 0.3, 0);
      [['#fff36b', 0.1, 0.3, 0.1], ['#ffb23e', 0.2, 0.4, 0.09], ['#ff6a1f', 0.29, 0.49, 0.07], ['#d6281b', 0.36, 0.56, 0.05]].forEach(([c, x, y, s]) => mk(ICO(s, 0), c, g, x, y, 0, { emissive: c }));
      break;
    case 'gem':
      tf(mk(OCT(0.25), '#b86bff', g, 0, 0.32, 0, { emissive: '#3a1a6a' }), 0, 0.4, 0, 1, 1.3, 1);
      sparkle(g, 0.2, 0.55, 0.1, 0.04);
      break;
    case 'pizza': {
      const s = grp(g, 0, 0.3, 0);
      s.rotation.set(1.1, 0, 0);
      mk(CYL(0.32, 0.32, 0.05, 3), '#ffc94a', s, 0, 0, 0);
      mk(BOX(0.52, 0.08, 0.1), '#d9933d', s, 0, 0.01, -0.17);
      for (const [x, z] of [[-0.08, 0.02], [0.1, 0.06], [0, 0.18]]) mk(CYL(0.05, 0.05, 0.03, 8), '#d63a2a', s, x, 0.035, z);
      break;
    }
  }
  return g;
}

/* ---------------- a planet, seen from space (for the world list) ---------------- */
function buildPlanetGlobe(i) {
  const cfg = PLANETS[i], g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(1, 3), pa = geo.attributes.position, cols = new Float32Array(pa.count * 3);
  const land = cfg.ground.map((c) => new THREE.Color(c)), sea = new THREE.Color(cfg.liquid.color), tmp = new THREE.Color();
  const ph = i * 1.7 + 0.4;
  for (let f = 0; f < pa.count; f += 3) {
    const x = (pa.getX(f) + pa.getX(f + 1) + pa.getX(f + 2)) / 3, y = (pa.getY(f) + pa.getY(f + 1) + pa.getY(f + 2)) / 3, z = (pa.getZ(f) + pa.getZ(f + 1) + pa.getZ(f + 2)) / 3;
    const n = Math.sin(x * 3.1 + ph) * Math.cos(y * 2.7 - ph) + 0.6 * Math.sin(z * 4.3 + x * 2.1 + ph * 2);
    if (n < -0.3) tmp.copy(sea);
    else if (n > 0.6) tmp.copy(land[2]);
    else tmp.copy(land[0]).lerp(land[1], (n + 0.3) / 0.9);
    for (let k = 0; k < 3; k++) { cols[(f + k) * 3] = tmp.r; cols[(f + k) * 3 + 1] = tmp.g; cols[(f + k) * 3 + 2] = tmp.b; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: TOON_GRAD })));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 16), new THREE.MeshBasicMaterial({ color: cfg.sky[1], transparent: true, opacity: 0.3, depthWrite: false, side: THREE.BackSide })));
  if (cfg.id === 'luck') {
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.55, 48), new THREE.MeshBasicMaterial({ color: '#ffcf3a', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.set(0.95, 0, 0.35);
    g.add(ring);
  }
  return g;
}

/* ---------------- where you died ---------------- */
// a tombstone, a crate of your stuff, a ghostly wisp, and a beam of light so you can find it again
function buildGraveCrate(name) {
  const g = new THREE.Group();
  const stone = grp(g, 0, 0, -0.28);
  mk(BOX(0.7, 0.7, 0.16), '#8a8f9a', stone, 0, 0.35, 0);
  tf(mk(CYL(0.35, 0.35, 0.16, 16), '#8a8f9a', stone, 0, 0.7, 0), PI / 2);
  const rip = itemLabel(['R.I.P.'], 0.5, 0.2, { bg: '#8a8f9a', color: '#3b3f4a', border: false });
  rip.position.set(0, 0.62, 0.082); stone.add(rip);
  mk(BOX(0.52, 0.36, 0.42), '#c9a36b', g, 0.02, 0.18, 0.18);
  mk(BOX(0.54, 0.06, 0.44), '#3b3f4a', g, 0.02, 0.3, 0.18);
  const bob = grp(g, 0, 1.3, 0);
  bob.userData.y0 = 1.3;
  mk(OCT(0.12), '#bff6ff', bob, 0, 0, 0, { emissive: '#5fb8ff' });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 16, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: '#7dfff0', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  beam.position.y = 8;
  g.add(beam);
  glowRing(g, 0.95, '#7dfff0');
  const tag = textSprite(`${name}'s stuff`, { size: 40, bg: 'rgba(20,20,40,.6)', scale: 0.0065 });
  tag.position.y = 1.75;
  g.add(tag);
  g.userData.bob = bob;
  g.traverse((c) => { if (c.isMesh) c.castShadow = false; });
  return g;
}

// every other item picture (key -> model)
const ITEM_MODELS = {
  boots: buildBootsItem, socks: buildSocksItem, armor: buildArmorItem, life: buildInsuranceItem, charm: buildLuckyFootItem,
  nade: buildGrenadeItem, nades: buildGrenadesItem,
  'sum:gary': buildStinkyCrown, 'sum:blorb': buildRoyalJelly, 'sum:jerry': buildGoldenToken, 'sum:snowdad': buildSpaceMilk, 'sum:zorblax': buildReheatedPizza,
  'res:bolt': buildBoltItem, 'res:can': buildCanItem, 'res:gear': buildGearItem, 'res:chip': buildCircuitItem, 'res:toaster': buildToasterItem,
  'res:berry': () => buildBerryItem('berry'), 'res:chonk': () => buildBerryItem('chonk'), 'res:gold': () => buildBerryItem('gold'),
  'res:ice': buildIceItem, 'res:crystal': buildCrystalItem, 'res:diamond': buildDiamondItem,
  'res:pep': buildPepperoniItem, 'res:cheese': buildMozzarellaItem, 'res:knot': buildGarlicKnotItem,
  'prize:jackpot': buildJackpotPile, 'prize:ticket': buildGoldenTicket, 'prize:bucks': buildCashStack,
  'prize:sock': buildSockItem, 'prize:rock': buildSpaceRock, 'prize:sandwich': buildHalfSandwich, 'prize:empty': buildEmptyBox,
  'prize:coupon': () => buildPaperItem(['10% OFF', 'THIS CRATE', '(EXPIRED)'], ['#d6281b', '#2b1d14', '#9a8a6a']),
  'prize:iou': () => buildPaperItem(['I.O.U.', 'one (1) money', '- Glorp'], ['#2b1d14', '#2b1d14', '#1e7b3a']),
};
