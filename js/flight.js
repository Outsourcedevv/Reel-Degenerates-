'use strict';
/* =========================================================
   The S.S. Late Delivery, flown by hand.
   Everybody walks up to the parked ship and gets in (E). The
   first one in takes the pilot seat; everyone else rides in
   the back. Anyone can take the controls when the pilot seat
   is free (F), and the ship only lifts off once the WHOLE
   crew is aboard. Lift off the pad, climb out of the
   atmosphere, fly to another planet (radar + M map), drop
   into its sky and set the ship down on its landing pad.
   The pilot flies from the cockpit, and the ship is big: it
   swings round to where you aim at its own pace, it doesn't
   flick around. Passengers ride in the cabin behind, where
   big windows show the trip (or look from outside with V).
   The pilot's computer flies the ship; the host keeps track
   of who sits where; everyone else rides along in sync.
   ========================================================= */
const FLY = {
  R: 240,              // planet radius out in space
  atmoTop: 150,        // climb this high to leave a planet
  enterAlt: 120,       // arriving at a planet you start this high up
  enterDist: 170,      // ...and this far from its landing pad
  zone: 220,           // how far from the pad you can wander in the sky
  padR: 11,            // the landing pad
  hardVS: 8,           // coming down faster than this is a crash
  space: { cruise: 70, max: 150, turbo: 240 },
  hover: { fwd: 42, up: 16, sink: 3.5 },
  autopilot: 150,
};
// how the ship turns. The mouse moves where you WANT to point (the aim circle) and the ship swings
// round to it: never faster than `rate` (radians a second), taking a moment to start and stop
// turning (`acc`), turning harder the further off it is (`k`). The aim can't get more than `lead`
// ahead of the nose. Over a planet, up/down (`p...`) is just the pilot looking up and down.
const STEER = {
  atmo: { rate: 1.05, acc: 2.2, k: 2.0, lead: 1.0, prate: 1.5, pacc: 3.6, pitch: [-0.9, 0.5] },
  space: { rate: 0.75, acc: 1.5, k: 1.8, lead: 0.8, prate: 0.75, pacc: 1.5, pitch: [-1.2, 1.2] },
};
// where the planets sit in the solar system. They're far apart: getting between them is a real trip.
const SYSTEM = [new V3(0, 0, 0), new V3(3300, 260, 1980), new V3(6600, -180, 660), new V3(9460, 330, 2860),
  new V3(12400, -260, 4300), new V3(15500, 420, 2400), new V3(18600, -120, 4000), new V3(21600, 60, 1800)];
const SEAT = new V3(0, 4.1, 2.45);   // pilot's eyes, inside the glass bubble
// the passenger cabin: a round tube (its middle at height y, radius r) from the back wall to where
// the cockpit starts, with a floor, and windows from win[0] to win[1] high beside every row of seats
const CABIN = { y: 2.95, r: 1.8, floor: 2.3, back: -2.75, front: 1.65, win: [3.35, 4.3], rows: [0.85, -0.55, -1.98], winLen: 1.1 };
// passengers sit in the back, two by two (three in the back row); these are their eyes
const PASS_SEATS = [new V3(-0.72, 4.02, 0.85), new V3(0.72, 4.02, 0.85), new V3(-0.72, 4.02, -0.55), new V3(0.72, 4.02, -0.55), new V3(0, 4.02, -1.98), new V3(-0.9, 4.02, -1.98), new V3(0.9, 4.02, -1.98)];
const COIN_VALUE = [5, 5, 15, 15, 25, 30, 40]; // space coins between planets 1-2, 2-3, 3-4... (money is scarce early on)
const SPACE_ATMO = {
  sky: ['#02010a', '#171040'], fog: ['#0a0620', 4000, 30000], stars: 1, bodies: [],
  sun: ['#fff4e0', 1.1], hemi: ['#b9c8ff', '#241a40', 0.75], liquid: { color: '#000000', op: 0 },
};
const nameOf = (id) => (id === Net.myId ? 'you' : (G.remotes.get(id) && G.remotes.get(id).name) || 'someone');
const _camLook = new THREE.Quaternion(), _camEuler = new THREE.Euler();

// an astronaut sitting down (for whoever is in a seat)
function seatedAstronaut(color, hat, look) {
  const a = buildAstronaut({ color, hat, look });
  a.legL.rotation.x = a.legR.rotation.x = -1.45;
  a.armL.rotation.x = a.armR.rotation.x = -0.9;
  a.root.traverse((c) => { if (c.isMesh) c.castShadow = false; });
  return a;
}

const Flight = {
  on: false, ph: null, planet: 0, pview: 'seat', wp: 1, mapOpen: false,
  seat: null, crew: {}, // crew: { playerId: 'pilot' | 'pass' }, kept by the host

  isPilot() { return this.on && this.seat === 'pilot'; },
  pilotId() { for (const id in this.crew) if (this.crew[id] === 'pilot') return id; return null; },
  // players in the game who aren't in the ship yet (we don't leave anyone behind)
  missingCrew() { return [...G.remotes.values()].filter((r) => !this.crew[r.id]).map((r) => r.name); },

  /* ---------------- getting in and out ---------------- */
  boardLabel() {
    if (!G.progress.includes('gary')) return 'Ship locked: beat Trashlord Gary first';
    const pid = this.pilotId();
    return pid ? `Get in the ship (${nameOf(pid)} is in the pilot seat)` : 'Get in the ship (you\'ll be the pilot)';
  },
  board() {
    if (G.mode !== 'planet' || Game.summoning || G.player.dead) return;
    // the S.S. Late Delivery won't start until Gary stops blocking the launch lane
    if (!G.progress.includes('gary')) {
      UI.toast('The ship won\'t start. Trashlord Gary is sitting on the launch lane. Beat him first!', 'bad', 3.5);
      Sound.play('error');
      return;
    }
    Net.toHost({ t: 'board' });
  },
  // host: keeps the seating chart
  onBoard(from) {
    if (this.crew[from]) return;
    this.crew[from] = this.pilotId() ? 'pass' : 'pilot';
    this.sendSeats();
  },
  onUnboard(from) { if (!this.crew[from]) return; delete this.crew[from]; this.sendSeats(); },
  onSeatReq(m, from) {
    if (!this.crew[from]) return;
    if (m.want === 'pilot') { const pid = this.pilotId(); if (pid && pid !== from) return; this.crew[from] = 'pilot'; }
    else this.crew[from] = 'pass';
    this.sendSeats();
  },
  onLeave(id) { if (Net.isHost && this.crew[id]) { delete this.crew[id]; this.sendSeats(); } },
  clearCrew() { if (Net.isHost) { this.crew = {}; this.sendSeats(); } },
  sendSeats() { const m = { t: 'seats', c: Object.assign({}, this.crew) }; Net.toAll(m); this.onSeats(m); },
  // everyone: the host says who sits where
  onSeats(m) {
    this.crew = m.c || {};
    const mine = this.crew[Net.myId] || null;
    if (mine && !this.on) { if (G.mode === 'planet') Game.enterShip(mine); else if (Net.isHost) this.onUnboard(Net.myId); }
    else if (mine && this.on && mine !== this.seat) this.takeSeat(mine);
    else if (!mine && this.on) this.exit(true);
    this.dummies();
    this.parkedPilot();
  },
  // swap seats: take the free pilot seat, or give it up and move to the back
  requestSwap() {
    if (this.seat === 'pilot') { Net.toHost({ t: 'seat', want: 'pass' }); return; }
    const pid = this.pilotId();
    if (pid) { UI.toast(`${nameOf(pid)} is flying. They can press F to give you the seat.`, '', 2.5); return; }
    Net.toHost({ t: 'seat', want: 'pilot' });
  },
  // my seat changed while I'm aboard
  takeSeat(seat) {
    const was = this.seat;
    this.seat = seat;
    if (seat === 'pilot' && was !== 'pilot') {
      // take over from wherever the ship is right now
      this.yaw = this.tyaw; this.pitch = this.tpitch;
      this.holdAim();
      if (this.ph === 'atmo') this.vel.set(Math.sin(this.yaw) * (this.speed || 0), this.vel.y, Math.cos(this.yaw) * (this.speed || 0));
      this.sendT = 0; this.landing = false;
      UI.toast('You have the controls! ' + (this.grounded ? 'Space: lift off' : 'Mouse: steer'), 'good', 2.5);
    } else if (seat === 'pass') {
      this.tpos.copy(this.pos); this.tyaw = this.yaw; this.tpitch = this.pitch;
      UI.toast('You moved to the back seat. Enjoy the ride!', '', 2);
    }
    this.setView(seat === 'pilot' ? 'cockpit' : this.pview);
  },
  // get out of the ship (only while it's parked on the landing pad)
  exit(kicked) {
    if (!this.on) return;
    if (!kicked) Net.toHost({ t: 'unboard' });
    this.finish();
    G.mode = 'planet';
    const w = G.world;
    w.parked.visible = true;
    const p = new V3(5.6, 0, 0.2 + U.rand(-1.4, 1.4));
    p.y = w.ground(p.x, p.z, 50);
    G.player.teleport(p, -Math.PI / 2);
    G.player.updateCamera(0, 0);
    UI.hud();
    Sound.playMusic(PLANETS[G.planet].music);
    this.parkedPilot();
  },

  // everyone aboard: sit down in the ship, parked on the pad
  start(from, seat) {
    this.finish();
    Object.assign(this, { on: true, seat, t: 0, yaw: 0, pitch: 0, bank: 0, speed: 0, grounded: true, turbo: 1, sendT: 0, hitCd: 0, crashCd: 0, auto: false, spaceT: 0, hint: 0, landing: false, lookYaw: 0, lookPitch: 0, inbound: false, signT: -1 });
    this.holdAim();
    this.wp = this.defaultWaypoint();
    this.pos = new V3(); this.vel = new V3();
    this.tpos = new V3(); this.tyaw = 0; this.tpitch = 0;
    this.group = new THREE.Group();
    G.scene.add(this.group);
    this.buildShip();
    this.enterAtmo(from, true);
    UI.el.hud.classList.add('flying');
    UI.show('flyhud', true);
    G.player.vm.visible = false;
    Sound.engine(true);
    this.setView(seat === 'pilot' ? 'cockpit' : this.pview);
    this.dummies();
    UI.bigTitle(seat === 'pilot' ? 'PILOT SEAT' : 'PASSENGER SEAT',
      seat === 'pilot' ? 'Space: lift off (once everyone is in) · E: get out · F: move to the back' : 'The pilot flies · F: take the pilot seat if it\'s free · E: get out · V: look from outside',
      '#bff6ff', 4);
  },
  defaultWaypoint() {
    for (let i = 0; i < PLANETS.length; i++) if (i !== G.planet && planetUnlocked(i) && !G.progress.includes(PLANETS[i].boss)) return i;
    return G.planet + 1 < PLANETS.length && planetUnlocked(G.planet + 1) ? G.planet + 1 : (G.planet + PLANETS.length - 1) % PLANETS.length;
  },
  finish() {
    Sound.engine(false);
    if (!this.group) return;
    this.leaveAtmo();
    G.scene.remove(this.group);
    disposeObj(this.group);
    this.group = null; this.space = null; this.seatDummies = [];
    this.on = false; this.ph = null; this.seat = null;
    UI.el.hud.classList.remove('flying', 'incockpit');
    UI.show('flyhud', false);
    for (const id of ['flytgt', 'flyaim', 'flynose']) U.$(id).classList.add('hidden');
    if (this.mapOpen) UI.closePanel(true);
    this.mapOpen = false;
    G.liquid.mesh.visible = true;
    G.camera.far = 1500; G.camera.fov = 72; G.camera.updateProjectionMatrix();
  },

  /* ---------------- the ship: outside model + inside ---------------- */
  buildShip() {
    this.pivot = grp(this.group);
    this.hull = buildShip();
    this.pivot.add(this.hull);
    this.flames = [-1, 1].map((s) => {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3, 7), basicMat('#ffb23e'));
      f.rotation.x = -Math.PI / 2; f.position.set(s * 1.0, 2.2, -6.1);
      this.hull.add(f);
      return f;
    });
    // the inside (drawn when you're looking from a seat)
    const ck = (this.cockpit = grp(this.pivot));
    const shell = '#171c26', panel = '#10141c', trim = '#2c3444', metal = '#5b6477';
    const glow = (col) => ({ emissive: col, emissiveIntensity: 1 });
    const TILT = 0.75; // instrument panel leans back toward the pilot
    const FY = CABIN.floor;
    const dash = grp(ck, 0, -0.08, 0.4);
    mk(BOX(2.8, 0.55, 0.9), shell, dash, 0, 2.92, 3.45);
    mk(BOX(2.6, 0.32, 0.9), shell, dash, 0, 2.5, 3.45);
    mk(BOX(2.7, 0.07, 0.42), shell, dash, 0, 3.62, 3.42);
    tf(mk(BOX(2.5, 0.62, 0.05), panel, dash, 0, 3.3, 3.2), TILT, Math.PI, 0);
    mk(BOX(2.5, 0.015, 0.015), '#3df0ff', dash, 0, 3.585, 3.22, glow('#3df0ff'));
    mk(BOX(2.5, 0.015, 0.015), '#ffb020', dash, 0, 3.05, 2.99, glow('#ffb020'));
    for (const s of [-1, 1]) {
      tf(mk(BOX(0.09, 1.9, 0.09), trim, ck, s * 1.2, 4.2, 3.35), 0.35, 0, s * 0.28);
      mk(BOX(0.42, 1.03, 1.7), shell, ck, s * 1.36, FY + 0.51, 2.5);
      mk(BOX(0.3, 0.02, 1.5), '#3df0ff', ck, s * 1.36, 3.33, 2.5, glow('#1d8fa0'));
    }
    mk(BOX(2.4, 0.09, 0.09), trim, ck, 0, 5.05, 3.0);
    mk(BOX(0.07, 0.07, 1.4), trim, ck, 0, 5.1, 2.5);
    // the cockpit floor: solid under the pilot's chair, glass in front of it (look down through it to line up a landing)
    mk(BOX(2.3, 0.1, 0.95), '#262b34', ck, 0, FY - 0.05, 2.12);
    const floorGlass = mk(BOX(2.3, 0.03, 0.85), new THREE.MeshBasicMaterial({ color: '#8fe3ff', transparent: true, opacity: 0.14, depthWrite: false }), ck, 0, FY - 0.02, 3.02);
    floorGlass.renderOrder = 2;
    for (const z of [2.6, 3.44]) mk(BOX(2.3, 0.04, 0.05), '#3df0ff', ck, 0, FY, z, glow('#1d8fa0'));
    // the pilot's chair (the passengers see the back of it from the cabin)
    const red = '#b8372b', dark = '#252a33', white = '#aca599';
    mk(BOX(0.34, 0.5, 0.4), dark, ck, 0, FY + 0.25, 2.3);
    mk(BOX(0.66, 0.14, 0.58), red, ck, 0, 2.87, 2.3);
    tf(mk(BOX(0.66, 1.05, 0.16), red, ck, 0, 3.45, 1.94), -0.12, 0, 0);
    tf(mk(BOX(0.7, 1.08, 0.05), white, ck, 0, 3.45, 1.84), -0.12, 0, 0);
    mk(BOX(0.46, 0.32, 0.16), red, ck, 0, 4.16, 1.86);
    mk(BOX(0.47, 0.06, 0.17), white, ck, 0, 4.25, 1.86);
    this.buildCabin(ck);
    // screens on the sloped panel: radar left, flight data right, warning lights in the middle
    const onPanel = (m, x) => { m.position.set(x, 3.3, 3.2); m.rotation.set(TILT, Math.PI, 0); m.translateZ(0.035); dash.add(m); return m; };
    this.radarTex = canvasTex(128, 128, () => {});
    onPanel(new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: this.radarTex })), 0.72);
    this.dashTex = canvasTex(256, 128, () => {});
    onPanel(new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.42), new THREE.MeshBasicMaterial({ map: this.dashTex })), -0.6);
    this.lights = [];
    for (let i = 0; i < 6; i++) {
      const l = onPanel(new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.04), new THREE.MeshBasicMaterial({ color: '#223' })), -0.13 + (i % 3) * 0.13);
      l.translateY(i < 3 ? 0.1 : -0.02);
      this.lights.push(l);
    }
    // flight stick between the pilot's knees, throttle on the left console
    this.stick = grp(ck, 0, 2.75, 2.7);
    mk(CYL(0.035, 0.05, 0.5, 6), metal, this.stick, 0, 0.25, 0);
    mk(BOX(0.09, 0.16, 0.09), '#20252f', this.stick, 0, 0.55, 0);
    mk(BOX(0.03, 0.03, 0.03), '#d6281b', this.stick, 0, 0.64, 0.03, glow('#ff2a1a'));
    this.throttleL = grp(ck, 1.3, 3.33, 2.2);
    mk(BOX(0.04, 0.35, 0.04), metal, this.throttleL, 0, 0.17, 0);
    mk(BOX(0.14, 0.08, 0.1), '#20252f', this.throttleL, 0, 0.36, 0);
    mergeLocal(ck, [this.stick, this.throttleL]);
    ck.traverse((c) => { if (c.isMesh) c.castShadow = false; });
    this.crewGroup = grp(this.pivot);
    this.setView(this.seat === 'pilot' ? 'cockpit' : this.pview);
  },
  // the passenger cabin behind the cockpit (see CABIN): a round tube with big windows, three rows of
  // red seats, lights in the ceiling, a screen saying where we're going, and pizzas riding along
  buildCabin(ck) {
    const { y: CY, r: R, floor: FY, back: ZB, front: ZF } = CABIN, T = Math.PI * 2, zm = (ZB + ZF) / 2, len = ZF - ZB;
    const glow = (col, k = 1) => ({ emissive: col, emissiveIntensity: k });
    // the inside of the tube: seen from within, and never quite black (it's lit inside)
    const inner = (col, em) => M(col, { side: THREE.BackSide, emissive: em });
    // how far round the tube a height is (0: the bottom, PI: the top; the other side is 2PI minus that)
    const at = (y) => Math.acos(U.clamp((CY - y) / R, -1, 1));
    const arc = (t0, t1, z0, z1, mat, r = R) => {
      const g = new THREE.CylinderGeometry(r, r, z1 - z0, Math.max(2, Math.ceil((t1 - t0) * 10)), 1, true, t0, t1 - t0);
      g.rotateX(Math.PI / 2);
      return mk(smoothGeo(g), mat, ck, 0, CY, (z0 + z1) / 2);
    };
    const tF = at(FY), tW0 = at(CABIN.win[0]), tW1 = at(CABIN.win[1]);
    const lower = inner('#5f6879', '#14171d'), upper = inner('#747e90', '#1b1e25'), post = inner('#4d5564', '#111318');
    // floor, with a red carpet down the aisle between two glowing strips
    const halfFloor = Math.sqrt(R * R - (CY - FY) ** 2);
    mk(BOX(halfFloor * 2, 0.1, len), '#262b34', ck, 0, FY - 0.05, zm);
    mk(BOX(0.64, 0.014, len - 0.1), '#5e1f29', ck, 0, FY + 0.007, zm);
    for (const s of [-1, 1]) mk(BOX(0.035, 0.012, len - 0.1), '#3df0ff', ck, s * 0.34, FY + 0.012, zm, glow('#1d8fa0', 0.8));
    // the walls and the ceiling
    arc(tF, tW0, ZB, ZF, lower); arc(T - tW0, T - tF, ZB, ZF, lower);
    arc(tW1, T - tW1, ZB, ZF, upper);
    // a window beside every row of seats, with posts between them
    const glass = new THREE.MeshBasicMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
    const wins = CABIN.rows.map((z) => [z - CABIN.winLen / 2, z + CABIN.winLen / 2]).sort((a, b) => a[0] - b[0]);
    let z = ZB;
    for (const [w0, w1] of [...wins, [ZF, ZF]]) {
      arc(tW0, tW1, z, w0, post); arc(T - tW1, T - tW0, z, w0, post);
      if (w1 > w0) {
        arc(tW0, tW1, w0, w1, glass, R + 0.03); arc(T - tW1, T - tW0, w0, w1, glass, R + 0.03);
        // a sill under the window and a lamp strip over it
        for (const s of [-1, 1]) mk(BOX(0.16, 0.04, w1 - w0 + 0.08), '#2f3541', ck, s * (R * Math.sin(tW0) - 0.07), CABIN.win[0] - 0.01, (w0 + w1) / 2);
      }
      z = w1;
    }
    const lamp = inner('#ffe7b8', '#a88a55');
    arc(tW1 + 0.02, tW1 + 0.07, ZB, ZF, lamp, R - 0.02); arc(T - tW1 - 0.07, T - tW1 - 0.02, ZB, ZF, lamp, R - 0.02);
    arc(tF + 0.03, tF + 0.06, ZB, ZF, inner('#3df0ff', '#157080'), R - 0.02); arc(T - tF - 0.06, T - tF - 0.03, ZB, ZF, inner('#3df0ff', '#157080'), R - 0.02);
    // ribs round the tube where the window posts are, and lights down the middle of the ceiling
    const ribAt = [ZB + 0.06, ...wins.slice(1).map((w, i) => (w[0] + wins[i][1]) / 2), ZF - 0.06];
    for (const rz of ribAt) mk(new THREE.TorusGeometry(R - 0.03, 0.035, 4, 32, T - 2 * tF), '#3b424f', ck, 0, CY, rz).rotation.z = tF - Math.PI / 2;
    for (const rz of CABIN.rows) mk(BOX(0.46, 0.03, 0.9), '#ffeccb', ck, 0, CY + R - 0.03, rz, glow('#c9ad7a', 0.8));
    // the seats: padded couches with a leg rest (it's a long trip), and a little screen on the back
    const red = '#b8372b', dark = '#252a33', white = '#aca599';
    const seat = (x, sz, w, screen) => {
      mk(BOX(w * 0.5, 0.42, 0.42), dark, ck, x, FY + 0.21, sz - 0.14);
      mk(BOX(w, 0.14, 0.6), red, ck, x, 2.76, sz - 0.14);
      tf(mk(BOX(w - 0.08, 0.1, 0.62), red, ck, x, 2.7, sz + 0.47), 0.14, 0, 0);
      mk(BOX(0.12, 0.34, 0.12), dark, ck, x, FY + 0.17, sz + 0.62);
      tf(mk(BOX(w, 1.0, 0.18), red, ck, x, 3.28, sz - 0.52), -0.1, 0, 0);
      tf(mk(BOX(w + 0.04, 1.04, 0.05), white, ck, x, 3.28, sz - 0.63), -0.1, 0, 0);
      mk(BOX(w * 0.7, 0.32, 0.15), red, ck, x, 3.98, sz - 0.58);
      mk(BOX(w * 0.7 + 0.01, 0.06, 0.16), white, ck, x, 4.07, sz - 0.58);
      for (const s of [-1, 1]) mk(BOX(0.07, 0.07, 0.5), dark, ck, x + s * (w / 2 + 0.02), 2.99, sz - 0.16);
      if (screen) tf(mk(BOX(w * 0.5, 0.2, 0.02), '#1c3550', ck, x, 3.45, sz - 0.69, glow('#0f3a5e', 0.8)), -0.1, 0, 0);
    };
    CABIN.rows.forEach((rz, i) => {
      for (const p of PASS_SEATS) if (p.z === rz) seat(p.x, rz, 0.62, i < CABIN.rows.length - 1);
    });
    // no wall in front: passengers watch the pilot and the view out of the cockpit. A screen hangs
    // from the ceiling there, saying where we're going (see drawSign)
    mk(BOX(0.06, 0.26, 0.06), '#252a33', ck, 0, 4.63, 1.5);
    mk(BOX(1.04, 0.3, 0.06), '#1b1f27', ck, 0, 4.36, 1.5);
    this.signTex = canvasTex(512, 128, () => {});
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.24), new THREE.MeshBasicMaterial({ map: this.signTex }));
    sign.position.set(0, 4.36, 1.465); sign.rotation.y = Math.PI;
    ck.add(sign);
    // the back wall
    const a0 = Math.asin((FY - CY) / R), back = new THREE.Shape();
    back.moveTo(Math.cos(a0) * R, FY);
    back.absarc(0, CY, R, a0, Math.PI - a0, false);
    back.lineTo(Math.cos(a0) * R, FY);
    mk(new THREE.ExtrudeGeometry(back, { depth: 0.08, bevelEnabled: false, curveSegments: 24 }), '#687183', ck, 0, 0, ZB - 0.08);
    // on it: the company sign, a couple of warnings and a fire extinguisher. Stacks of (cold) pizzas ride beside the seats
    const brand = signMesh(['LATE DELIVERY CO.', '"Always Late. Never Hot."'], 1.5, 0.42, { bg: '#d6281b', border: '#ffffff', colors: ['#ffffff', '#ffe6b3'] });
    brand.position.set(0, 4.36, ZB + 0.01); ck.add(brand);
    for (const [x, txt] of [[-0.98, ['NO REFUNDS']], [0.98, ['KEEP HELMET ON']]]) {
      const sg = signMesh(txt, 0.36, 0.14, { bg: '#1b1f27', border: '#ffb020', color: '#ffd23f' });
      sg.position.set(x, 4.2, ZB + 0.01); ck.add(sg);
    }
    mk(CYL(0.09, 0.09, 0.46, 10), '#d6281b', ck, 1.4, 2.62, ZB + 0.12);
    mk(CYL(0.05, 0.07, 0.08, 8), '#20242c', ck, 1.4, 2.89, ZB + 0.12);
    mk(BOX(0.24, 0.05, 0.06), '#8a93a3', ck, 1.4, 2.7, ZB + 0.03);
    for (const [x, zz, n, spin] of [[-1.38, 1.2, 6, 0.08], [1.38, 1.1, 4, -0.06], [-1.4, -0.35, 3, 0.05]]) {
      const st = grp(ck, x, FY, zz);
      st.rotation.y = spin;
      for (let i = 0; i < n; i++) tf(mk(BOX(0.46, 0.07, 0.46), i % 2 ? '#e3b26a' : '#d9a55c', st, 0, 0.036 + i * 0.072, 0), 0, (i % 3) * 0.06, 0);
      mk(BOX(0.05, n * 0.072 + 0.02, 0.48), '#2b303a', st, 0, (n * 0.072) / 2, 0);
      mk(CYL(0.1, 0.1, 0.012, 14), '#d63a2a', st, 0.1, n * 0.072 + 0.006, 0.1);
    }
  },
  // views: the pilot always flies from the cockpit; passengers look around from their 'seat' or outside ('chase')
  cycleView() {
    if (this.seat === 'pilot') return;
    this.pview = this.pview === 'seat' ? 'chase' : 'seat';
    this.setView(this.pview);
  },
  setView(v) {
    this.cur = v;
    if (!this.hull) return;
    const inside = v === 'cockpit' || v === 'seat';
    this.hull.visible = !inside;
    this.cockpit.visible = inside;
    UI.el.hud.classList.toggle('incockpit', v === 'cockpit');
    this.dummies();
  },
  // everyone in a seat, drawn sitting there (you only see yourself from outside)
  dummies() {
    if (!this.crewGroup) return;
    while (this.crewGroup.children.length) { const c = this.crewGroup.children[0]; this.crewGroup.remove(c); disposeObj(c); }
    const inside = this.cur === 'cockpit' || this.cur === 'seat';
    let pi = 0;
    for (const id of Object.keys(this.crew).sort()) {
      const seat = this.crew[id], mine = id === Net.myId;
      const eye = seat === 'pilot' ? SEAT : PASS_SEATS[pi++ % PASS_SEATS.length];
      if (mine && inside) continue;
      const r = G.remotes.get(id);
      const a = seatedAstronaut(mine ? G.color : r ? r.s.c : '#ffffff', mine ? SAVE.hat : r ? r.s.h : 'none', mine ? G.look : r ? r.s.lk : '');
      a.root.position.set(eye.x, eye.y - 1.9, eye.z - 0.08);
      this.crewGroup.add(a.root);
    }
  },
  mySeatEye() {
    if (this.seat === 'pilot') return SEAT;
    const ids = Object.keys(this.crew).sort().filter((id) => this.crew[id] === 'pass');
    return PASS_SEATS[Math.max(0, ids.indexOf(Net.myId)) % PASS_SEATS.length];
  },
  // people outside can see who's sitting at the controls of the parked ship
  parkedPilot() {
    const pid = this.pilotId();
    for (const k in G.worlds) {
      const w2 = G.worlds[k];
      if (w2.parkedDummy && (w2 !== G.world || !pid || w2.parkedDummy.userData.id !== pid)) { w2.parked.remove(w2.parkedDummy); disposeObj(w2.parkedDummy); w2.parkedDummy = null; }
    }
    const w = G.world;
    if (!w || !w.parked) return;
    if (pid && !w.parkedDummy) {
      const r = G.remotes.get(pid), mine = pid === Net.myId;
      const a = seatedAstronaut(mine ? G.color : r ? r.s.c : '#ffffff', mine ? SAVE.hat : r ? r.s.h : 'none', mine ? G.look : r ? r.s.lk : '');
      a.root.position.set(SEAT.x, SEAT.y - 1.9, SEAT.z - 0.08);
      a.root.userData.id = pid;
      w.parkedDummy = a.root;
      w.parked.add(a.root);
    }
  },

  /* ---------------- atmosphere: over a planet ---------------- */
  enterAtmo(pi, parked) {
    this.leaveAtmo();
    if (this.space) this.space.visible = false;
    this.ph = 'atmo';
    this.planet = pi;
    Game.loadPlanet(pi);
    const w = G.world;
    w.parked.visible = false;
    G.liquid.mesh.visible = true;
    G.camera.far = 1500; G.camera.updateProjectionMatrix();
    // landing pad beacon so you can find it from the sky
    const beacon = (this.beacon = grp(this.group, 0, w.h(0, 0), 0));
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 260, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#3df0ff', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beam.position.y = 130; beacon.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(FLY.padR - 0.8, FLY.padR, 48), new THREE.MeshBasicMaterial({ color: '#3df0ff', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; beacon.add(ring);
    this.beaconBeam = beam;
    if (parked) {
      this.pos.set(0, w.h(0, 0), 0); this.vel.set(0, 0, 0);
      this.yaw = 0; this.pitch = 0; this.grounded = true;
    } else {
      // coming in from space: start high up, some way out, facing the pad
      const a = Math.atan2(this.arrive ? this.arrive.x : 1, this.arrive ? this.arrive.z : 1);
      const x = Math.sin(a) * FLY.enterDist, z = Math.cos(a) * FLY.enterDist;
      this.pos.set(x, w.h(x, z) + FLY.enterAlt, z);
      this.yaw = Math.atan2(-x, -z); this.pitch = -0.3;
      this.vel.set(-Math.sin(a) * 18, -4, -Math.cos(a) * 18);
      this.grounded = false; this.landing = false;
      UI.bigTitle(PLANETS[pi].name.toUpperCase(), this.isPilot() ? 'Land on the glowing pad. Come down slowly.' : 'Coming in to land...', '#bff6ff', 3.4);
    }
    this.inbound = !parked;
    this.holdAim();
    this.tpos.copy(this.pos); this.tyaw = this.yaw; this.tpitch = this.pitch;
  },
  leaveAtmo() {
    if (this.beacon) { this.group.remove(this.beacon); disposeObj(this.beacon); this.beacon = null; }
  },
  // point the aim where the ship is pointing (and stop turning): after the ship is put somewhere new
  holdAim() {
    this.aimYaw = this.yaw || 0; this.aimPitch = this.pitch || 0;
    this.yawV = 0; this.pitchV = 0;
  },
  // the mouse moves the aim; the ship swings round to it at its own pace (see STEER)
  steer(dt, can, cfg) {
    if (can) {
      const k = 0.0022 * G.settings.sens;
      this.aimYaw -= Input.dx * k;
      this.aimPitch -= Input.dy * k;
    }
    this.aimPitch = U.clamp(this.aimPitch, cfg.pitch[0], cfg.pitch[1]);
    // (the aim can't run off too far ahead of the nose)
    const ey = U.clamp(U.angDiff(this.yaw, this.aimYaw), -cfg.lead, cfg.lead);
    const ep = U.clamp(this.aimPitch - this.pitch, -cfg.lead, cfg.lead);
    this.aimYaw = this.yaw + ey; this.aimPitch = this.pitch + ep;
    const toward = (v, want, acc) => v + U.clamp(want - v, -acc * dt, acc * dt);
    this.yawV = toward(this.yawV, U.clamp(ey * cfg.k, -cfg.rate, cfg.rate), cfg.acc);
    this.pitchV = toward(this.pitchV, U.clamp(ep * cfg.k, -cfg.prate, cfg.prate), cfg.pacc);
    this.yaw += this.yawV * dt;
    this.pitch += this.pitchV * dt;
    if (this.pitch < cfg.pitch[0] || this.pitch > cfg.pitch[1]) { this.pitch = U.clamp(this.pitch, cfg.pitch[0], cfg.pitch[1]); this.pitchV = 0; }
  },
  atmo(dt, can) {
    const w = G.worlds[this.planet];
    this.steer(dt, can, STEER.atmo);
    const key = (c) => can && Input.keys[c];
    const f = new V3(Math.sin(this.yaw), 0, Math.cos(this.yaw)), side = new V3(f.z, 0, -f.x);
    this.crashCd -= dt; this.hint -= dt;
    if (this.grounded) {
      this.vel.set(0, 0, 0);
      if (key('Space')) {
        const missing = this.missingCrew();
        if (missing.length) {
          if (this.hint <= 0) { UI.toast(`Waiting for ${missing.join(', ')} to get in the ship! Nobody gets left behind.`, 'bad', 2.6); Sound.play('error'); this.hint = 2.6; }
        } else { this.grounded = false; this.vel.y = 6; this.event({ k: 'liftoff' }); }
      }
    } else {
      const wantF = key('KeyW') ? FLY.hover.fwd : key('KeyS') ? -12 : 0;
      const nf = U.damp(this.vel.dot(f), wantF, 1.1, dt), ns = U.damp(this.vel.dot(side), 0, 3, dt);
      const wantUp = key('Space') ? FLY.hover.up : key('KeyC') ? -FLY.hover.up : -FLY.hover.sink;
      this.vel.set(f.x * nf + side.x * ns, U.damp(this.vel.y, wantUp, 2, dt), f.z * nf + side.z * ns);
      this.pos.addScaledVector(this.vel, dt);
      // stay near the landing zone
      const r = Math.hypot(this.pos.x, this.pos.z);
      if (r > FLY.zone) {
        this.pos.x *= FLY.zone / r; this.pos.z *= FLY.zone / r;
        if (this.hint <= 0) { UI.toast('Too far from the landing zone! Turn back, or climb to space.', 'bad', 2.5); this.hint = 4; }
      }
      this.touchdown(w);
      if (this.ph !== 'atmo' || !this.on) return;
      if (this.pos.y - Math.max(w.h(this.pos.x, this.pos.z), WATER_Y) > FLY.atmoTop && this.vel.y > 0) { this.transition({ k: 'space' }); return; }
    }
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    // lean into turns (a little: you're sitting in it)
    this.bank = U.damp(this.bank, U.clamp(-this.yawV * 0.3 - this.vel.dot(side) * 0.02, -0.4, 0.4), 4, dt);
  },
  // the ground is coming up: is this a landing or a crash?
  touchdown(w) {
    const gy = Math.max(w.h(this.pos.x, this.pos.z), WATER_Y);
    if (this.pos.y > gy) return;
    const vs = -this.vel.y, onPad = Math.hypot(this.pos.x, this.pos.z) < FLY.padR + 1.5;
    const water = w.h(this.pos.x, this.pos.z) < WATER_Y + 0.2;
    this.pos.y = gy;
    if (vs > FLY.hardVS || water || Math.hypot(this.vel.x, this.vel.z) > 16) {
      this.vel.y = 7; this.vel.x *= -0.3; this.vel.z *= -0.3;
      if (this.crashCd <= 0) { this.crashCd = 1.5; this.event({ k: 'crash', water: water ? 1 : 0, fee: 25 }); }
      return;
    }
    this.vel.set(0, 0, 0); this.grounded = true;
    // down on the pad: everybody hops out (the host makes it official)
    if (onPad) { if (!this.landing) { this.landing = true; Net.toHost({ t: 'landreq', p: this.planet }); } return; }
    // a soft landing, just not on the pad
    if (this.hint <= 0) { UI.toast('Wrong spot! Lift off (Space) and land on the glowing pad.', 'bad', 3); this.hint = 4; }
  },

  /* ---------------- deep space ---------------- */
  buildSpace() {
    const g = (this.space = grp(this.group));
    const rng = U.seeded(4242); // the same solar system for everyone
    PLANETS.forEach((cfg, i) => {
      const m = new THREE.Mesh(flat(new THREE.IcosahedronGeometry(FLY.R, 3)), new THREE.MeshToonMaterial({ color: cfg.ground[0], gradientMap: TOON_GRAD, fog: false }));
      m.position.copy(SYSTEM[i]);
      m.add(new THREE.Mesh(new THREE.SphereGeometry(FLY.R * 1.08, 28, 18), new THREE.MeshBasicMaterial({ color: cfg.sky[1], transparent: true, opacity: 0.3, side: THREE.BackSide, fog: false, depthWrite: false })));
      const ringCol = { luck: '#ffcf3a', cloud: '#ffffff', city: '#ff3df0' }[cfg.id];
      if (ringCol) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(FLY.R * 1.3, FLY.R * 1.8, 64), new THREE.MeshBasicMaterial({ color: ringCol, transparent: true, opacity: 0.45, side: THREE.DoubleSide, fog: false, depthWrite: false }));
        ring.rotation.x = 1.3 + i * 0.07; m.add(ring);
      }
      const tag = textSprite(cfg.name.toUpperCase(), { size: 60, color: '#ffffff', stroke: '#0a0718', scale: 1.4, depthTest: false, order: 30 });
      tag.position.y = FLY.R + 90; m.add(tag);
      g.add(m);
    });
    const sun = new THREE.Mesh(new THREE.SphereGeometry(800, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff3c4', fog: false }));
    sun.position.set(10800, 5800, -9500); g.add(sun);
    // asteroid belts, turbo rings and coins between neighbouring planets
    const geos = [0, 1, 2].map(() => flat(new THREE.DodecahedronGeometry(1, 0)));
    const mats = ['#6d6470', '#8a7b6a', '#524a5e'].map((c) => M(c));
    const coinGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.3, 12);
    this.rocks = []; this.rings = []; this.coins = [];
    for (let s = 0; s < SYSTEM.length - 1; s++) {
      const a = SYSTEM[s], b = SYSTEM[s + 1], len = a.distanceTo(b);
      const dir = b.clone().sub(a).normalize();
      const right = new V3().crossVectors(dir, new V3(0, 1, 0)).normalize(), up2 = new V3().crossVectors(right, dir);
      for (let i = 0; i < 120; i++) {
        const tt = 0.15 + rng() * 0.7, ang = rng() * Math.PI * 2, d = 25 + rng() * 190;
        const p = a.clone().lerp(b, tt).addScaledVector(right, Math.cos(ang) * d).addScaledVector(up2, Math.sin(ang) * d);
        const r = 3 + rng() * rng() * 18;
        const m = new THREE.Mesh(geos[i % 3], mats[i % 3]);
        m.position.copy(p); m.scale.set(r, r * (0.7 + rng() * 0.5), r * (0.8 + rng() * 0.4)); m.rotation.set(rng() * 6, rng() * 6, 0);
        g.add(m);
        this.rocks.push({ m, r, spin: (rng() - 0.5) * 0.6 });
      }
      for (let d = FLY.R + 180; d < len - FLY.R - 120; d += 240) {
        const p = a.clone().addScaledVector(dir, d).addScaledVector(right, (rng() - 0.5) * 40).addScaledVector(up2, (rng() - 0.5) * 30);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(12, 1.1, 6, 32), new THREE.MeshToonMaterial({ color: '#3df0ff', emissive: '#0aa0c0', gradientMap: TOON_GRAD }));
        ring.position.copy(p); ring.lookAt(p.clone().add(dir));
        g.add(ring);
        this.rings.push({ m: ring, p, taken: false, id: this.rings.length });
        for (let c = 1; c <= 3; c++) {
          const cm = new THREE.Mesh(coinGeo, M('#ffd23f', { emissive: '#aa7700' }));
          cm.position.copy(p).addScaledVector(dir, -c * 12);
          g.add(cm);
          this.coins.push({ m: cm, taken: false, v: COIN_VALUE[s] || 15 });
        }
      }
    }
  },
  enterSpace(from) {
    this.leaveAtmo();
    this.ph = 'space';
    this.spaceT = 0; this.auto = false;
    if (!this.space) this.buildSpace();
    this.space.visible = true;
    for (const k in G.worlds) G.worlds[k].group.visible = false;
    G.liquid.mesh.visible = false;
    setAtmosphere(SPACE_ATMO);
    G.camera.far = 32000; G.camera.updateProjectionMatrix();
    // pop out above the planet, heading the way we were flying
    const out = new V3(Math.sin(this.yaw), 0.35, Math.cos(this.yaw)).normalize();
    this.pos.copy(SYSTEM[from]).addScaledVector(out, FLY.R + 70);
    this.pitch = 0.1;
    this.holdAim();
    this.speed = FLY.space.cruise;
    this.tpos.copy(this.pos); this.tyaw = this.yaw; this.tpitch = this.pitch;
    Sound.playMusic('space');
    UI.bigTitle('DEEP SPACE', this.isPilot() ? `Head for ${PLANETS[this.wp].name}. M: map · Shift: turbo` : `The pilot is heading for ${PLANETS[this.wp].name}. Sit back.`, '#bff6ff', 3.2);
  },
  spaceFly(dt, can) {
    this.spaceT += dt;
    const tgt = SYSTEM[this.wp];
    if (!this.auto && this.spaceT > FLY.autopilot) { this.auto = true; UI.toast('Autopilot ON. Dave took the wheel. "I\'ll be expensing this."', 'purple', 4); }
    if (this.auto) {
      // Dave aims for the destination (and turns the ship just as slowly as you would)
      const d = tgt.clone().sub(this.pos);
      this.aimYaw = this.yaw + U.angDiff(this.yaw, Math.atan2(d.x, d.z));
      this.aimPitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
    }
    this.steer(dt, can && !this.auto, STEER.space);
    this.bank = U.damp(this.bank, U.clamp(-this.yawV * 0.45, -0.45, 0.45), 4, dt);
    const key = (c) => can && Input.keys[c];
    let want = key('KeyW') || this.auto ? FLY.space.max : key('KeyS') ? 15 : U.clamp(this.speed, FLY.space.cruise * 0.6, FLY.space.max);
    const turbo = key('ShiftLeft') || key('ShiftRight');
    if (turbo && this.turbo > 0.02) { want = FLY.space.turbo; this.turbo = Math.max(0, this.turbo - dt * 0.3); } else this.turbo = Math.min(1, this.turbo + dt * 0.05);
    this.speed = U.damp(this.speed, want, turbo ? 2.5 : 1.3, dt);
    const prev = this.pos.clone();
    this.pos.addScaledVector(this.fwd(), this.speed * dt);
    if (key('Space')) this.pos.y += 18 * dt;
    if (key('KeyC')) this.pos.y -= 18 * dt;
    // rocks
    this.hitCd -= dt;
    for (const r of this.rocks) {
      const d = r.m.position.distanceTo(this.pos);
      if (d < r.r + 3.5 && this.hitCd <= 0) {
        this.hitCd = 0.8; this.speed *= 0.3;
        this.pos.add(this.pos.clone().sub(r.m.position).normalize().multiplyScalar(r.r + 4 - d));
        this.event({ k: 'bonk' });
      }
    }
    for (const r of this.rings) if (!r.taken && U.segSphere(prev, this.pos, r.p, 11)) { this.turbo = Math.min(1, this.turbo + 0.5); this.speed = Math.max(this.speed, FLY.space.max); this.event({ k: 'ring', i: r.id }); }
    this.coins.forEach((c, i) => { if (!c.taken && U.segSphere(prev, this.pos, c.m.position, 5)) this.event({ k: 'coin', i }); });
    // reached a planet?
    for (let i = 0; i < SYSTEM.length; i++) {
      if (this.pos.distanceTo(SYSTEM[i]) > FLY.R + 30) continue;
      if (!planetUnlocked(i)) {
        this.pos.copy(SYSTEM[i]).add(this.pos.clone().sub(SYSTEM[i]).normalize().multiplyScalar(FLY.R + 60));
        this.yaw += Math.PI; this.speed = 20;
        this.holdAim();
        this.event({ k: 'restricted', i });
        return;
      }
      this.transition({ k: 'atmo', pl: i, ax: U.r2(this.pos.x - SYSTEM[i].x), az: U.r2(this.pos.z - SYSTEM[i].z) });
      return;
    }
  },
  fwd() { return new V3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)); },

  /* ---------------- every frame ---------------- */
  update(dt) {
    if (!this.on) return;
    this.t += dt;
    G.player.vm.visible = false; // no gun in your hand while you're in the ship
    const free = G.locked && !G.panel && !G.chatting;
    const pilot = this.isPilot();
    const can = pilot && free && !this.mapOpen;
    if (free) {
      if (Input.tap('KeyV')) this.cycleView();
      if (Input.tap('KeyM')) this.toggleMap();
      if (Input.tap('KeyF')) this.requestSwap();
      // step out, but only while parked on the pad you took off from
      if (Input.tap('KeyE') && this.ph === 'atmo' && this.grounded && this.planet === G.planet && Math.hypot(this.pos.x, this.pos.z) < FLY.padR + 2) { this.exit(); return; }
    }
    if (pilot) {
      if (this.ph === 'atmo') this.atmo(dt, can); else this.spaceFly(dt, can);
      if (!this.on) return;
      this.sendT -= dt;
      if (this.sendT <= 0 && Net.online) {
        this.sendT = 1 / 15;
        Net.relay({ t: 'fly', ph: this.ph, pl: this.planet, p: [U.r2(this.pos.x), U.r2(this.pos.y), U.r2(this.pos.z)], y: U.r2(this.yaw), x: U.r2(this.pitch), b: U.r2(this.bank), v: Math.round(this.vel.y * 10) / 10, s: Math.round(this.speed || 0), w: this.wp, g: this.grounded ? 1 : 0, tb: U.r2(this.turbo) });
      }
    } else {
      // passengers ride along with the pilot's updates (or sit still if nobody is flying)
      this.pos.lerp(this.tpos, 1 - Math.exp(-10 * dt));
      this.yaw += U.angDiff(this.yaw, this.tyaw) * Math.min(1, dt * 10);
      this.pitch = U.damp(this.pitch, this.tpitch, 10, dt);
      if (free && !this.mapOpen) {
        const k = 0.0022 * G.settings.sens;
        this.lookYaw = U.clamp(this.lookYaw - Input.dx * k, -2.6, 2.6);
        this.lookPitch = U.clamp(this.lookPitch - Input.dy * k, -1.1, 1.1);
      }
    }
    // ship pose, flames, spinning stuff
    this.pivot.position.copy(this.pos);
    this.pivot.rotation.set(this.ph === 'space' ? -this.pitch : 0, this.yaw, this.bank, 'YXZ');
    const thr = this.ph === 'space' ? U.clamp((this.speed - 15) / (FLY.space.turbo - 15), 0.1, 1) : this.grounded ? 0.05 : U.clamp(0.3 + this.vel.y * 0.04 + this.speed * 0.015, 0.1, 1);
    for (const f of this.flames) f.scale.set(1, 0.4 + thr * 1.8 + Math.random() * 0.3, 1);
    Sound.engineLevel(thr);
    if (pilot) {
      this.stick.rotation.set(U.clamp(-this.pitchV * 0.35, -0.4, 0.4), 0, U.clamp(-this.yawV * 0.35, -0.4, 0.4));
      this.throttleL.rotation.x = -0.6 + U.clamp((this.speed || 0) / FLY.space.turbo, 0, 1) * 1.2;
    }
    if (this.ph === 'space') {
      for (const r of this.rocks) r.m.rotation.y += r.spin * dt;
      for (const c of this.coins) if (!c.taken) c.m.rotation.y += dt * 3;
      if (this.cur === 'chase' && Math.random() < thr) FX.burst(this.pivot.localToWorld(new V3((Math.random() - 0.5) * 2, 2.2, -7)), '#ffb23e', 1, 2);
    } else if (this.beacon) {
      this.beaconBeam.material.opacity = 0.15 + 0.1 * Math.abs(Math.sin(this.t * 3));
      const w = G.worlds[this.planet], gh = w.h(this.pos.x, this.pos.z);
      if (!this.grounded && this.pos.y - gh < 10 && Math.random() < 0.6) FX.burst(new V3(this.pos.x + (Math.random() - 0.5) * 5, gh + 0.2, this.pos.z + (Math.random() - 0.5) * 5), '#e8ddd0', 1, 3);
    }
    this.camera(dt);
    this.hud();
  },
  // pilot: a phase change everyone must follow
  transition(m) { m.t = 'fph'; Net.relay(m); this.onPhase(m); },
  onPhase(m) {
    if (!this.on) return;
    if (m.k === 'space') this.enterSpace(this.planet);
    else if (m.k === 'atmo') { this.arrive = new V3(m.ax || 1, 0, m.az || 1); this.enterAtmo(m.pl, false); }
  },
  event(m) { m.t = 'fev'; Net.relay(m); this.onEvent(m); },
  onEvent(m) {
    if (!this.on) return;
    if (m.k === 'liftoff') {
      Sound.play('warp');
      Sound.playMusic('space');
      UI.toast(this.isPilot() ? 'Liftoff! Climb above 150 m to reach space.' : 'Liftoff! Hold on to something.', 'good', 3);
    } else if (m.k === 'bonk') {
      G.shake = Math.max(G.shake, 1); Sound.play('boom');
      FX.burst(this.pos.clone(), '#9a8f84', 12, 8);
      UI.toast(U.pick(LINES.flyHit), 'bad', 1.6);
    } else if (m.k === 'crash') {
      G.shake = Math.max(G.shake, 1.2); Sound.play('boom');
      FX.burst(this.pos.clone().setY(this.pos.y + 1), m.water ? '#bfe8ff' : '#9a8f84', 16, 8);
      const fee = Math.min(SAVE.bucks, m.fee || 0);
      if (fee) addBucks(-fee);
      UI.toast(m.water ? 'SPLASH. Ships do not float. Try the pad.' : `HARD LANDING! Come down slower.${fee ? ` Repairs: $${fee}` : ''}`, 'bad', 2.5);
    } else if (m.k === 'restricted') {
      G.shake = Math.max(G.shake, 0.6); Sound.play('error');
      UI.toast(`RESTRICTED AIRSPACE: beat ${BOSSES[PLANETS[m.i - 1].boss].name} first.`, 'bad', 3);
    } else if (m.k === 'ring') {
      const r = this.rings && this.rings[m.i];
      if (!r || r.taken) return;
      r.taken = true; r.m.visible = false;
      FX.ring(r.p.clone(), '#3df0ff', 16); Sound.play('boing');
      UI.toast('TURBO RING! Hold Shift to boost.', 'good', 1.2);
    } else if (m.k === 'coin') {
      const c = this.coins && this.coins[m.i];
      if (!c || c.taken) return;
      c.taken = true; c.m.visible = false;
      addBucks(c.v, true);
      UI.pickup(`+ Space Coin ($${c.v})`, '#ffd23f');
      Sound.play('coin');
    }
  },
  onSync(m) {
    if (!this.on || this.isPilot()) return;
    if (m.ph !== this.ph || (m.ph === 'atmo' && m.pl !== this.planet)) {
      if (m.ph === 'space') this.enterSpace(this.planet); else this.enterAtmo(m.pl, !!m.g);
      this.pos.set(m.p[0], m.p[1], m.p[2]);
    }
    this.tpos.set(m.p[0], m.p[1], m.p[2]);
    this.tyaw = m.y; this.tpitch = m.x; this.bank = m.b; this.speed = m.s; this.vel.y = m.v; this.wp = m.w; this.grounded = !!m.g; this.turbo = m.tb;
  },
  setWaypoint(i) {
    if (!this.isPilot()) return;
    this.wp = i;
    Sound.play('click');
    this.drawMap();
  },

  /* ---------------- camera & instruments ---------------- */
  camera(dt) {
    const cam = G.camera;
    G.shake = Math.max(0, G.shake - dt * 2.2);
    this.shakeT = (this.shakeT || 0) + dt * 22;
    const sh = Math.min(1, G.shake) ** 2 * 0.03, st = this.shakeT;
    const jx = Math.sin(st * 1.31) * sh, jy = Math.cos(st * 1.73) * sh;
    if (this.cur === 'cockpit' || this.cur === 'seat') {
      this.pivot.updateMatrixWorld(true);
      cam.position.copy(this.pivot.localToWorld(this.mySeatEye().clone()));
      // you're sitting in the ship, so you tip and lean with it. Cameras look down -Z and the ship's
      // nose is +Z: turn around. The pilot looks where they steer (over a planet, the ship itself stays
      // level and only the pilot's head tips up and down); passengers can look around freely.
      const pilotPitch = this.ph === 'space' ? 0 : this.pitch;
      const ly = this.cur === 'seat' ? this.lookYaw : 0, lp = this.cur === 'seat' ? this.lookPitch : pilotPitch - 0.04;
      _camLook.setFromEuler(_camEuler.set(lp + jx, Math.PI + ly + jy, 0, 'YXZ'));
      cam.quaternion.copy(this.pivot.quaternion).multiply(_camLook);
    } else {
      // passenger outside view: circle the ship with the mouse
      const a = this.yaw + Math.PI + this.lookYaw, e = U.clamp(0.25 - this.lookPitch * 0.8, -0.4, 1.2);
      const want = this.pos.clone().add(new V3(-Math.sin(a) * Math.cos(e) * -16, 4 + Math.sin(e) * 16, -Math.cos(a) * Math.cos(e) * -16));
      if (this.t < 0.1 || cam.position.distanceTo(want) > 90) cam.position.copy(want);
      cam.position.lerp(want, 1 - Math.exp(-8 * dt));
      cam.lookAt(this.pos.clone().add(new V3(0, 2.5, 0)));
    }
    const fov = this.ph === 'space' ? 74 + U.clamp((this.speed - FLY.space.cruise) / 10, 0, 14) : this.cur === 'cockpit' ? 80 : 74;
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = U.damp(cam.fov, fov, 4, dt); cam.updateProjectionMatrix(); }
  },
  target() {
    if (this.ph === 'space') return { p: SYSTEM[this.wp], name: PLANETS[this.wp].name.toUpperCase(), d: Math.max(0, this.pos.distanceTo(SYSTEM[this.wp]) - FLY.R) };
    const w = G.worlds[this.planet];
    return { p: new V3(0, w.h(0, 0) + 2, 0), name: 'LANDING PAD', d: Math.hypot(this.pos.x, this.pos.z) };
  },
  hud() {
    const hud = U.$('flyhud'), tg = this.target();
    const w = G.worlds[this.planet];
    const alt = this.ph === 'atmo' ? this.pos.y - Math.max(w.h(this.pos.x, this.pos.z), WATER_Y) : 0;
    const vs = this.ph === 'atmo' ? this.vel.y : 0;
    const pid = this.pilotId();
    hud.querySelector('.dest').innerHTML = this.ph === 'space' ? `<small>DESTINATION</small>${U.esc(PLANETS[this.wp].name)}` : `<small>${this.grounded ? 'LANDED' : 'ON APPROACH'}</small>${U.esc(PLANETS[this.planet].name)}`;
    hud.querySelector('.dist').textContent = (this.ph === 'space' ? `${Math.round(tg.d).toLocaleString()} m to go` : `Landing pad ${Math.round(tg.d)} m away`) + ` · Pilot: ${pid ? nameOf(pid) : 'NOBODY'}`;
    hud.querySelector('.fill').style.width = (this.turbo * 100).toFixed(0) + '%';
    hud.querySelector('.turbo').classList.toggle('hidden', this.ph !== 'space');
    const warn = vs < -FLY.hardVS ? 'bad' : vs < -FLY.hardVS * 0.7 ? 'warn' : this.ph === 'atmo' && vs < -0.5 ? 'ok' : '';
    U.$('flyinst').innerHTML = `<div><small>SPEED</small><b>${Math.round(this.speed || 0)}</b></div>` +
      (this.ph === 'atmo' ? `<div><small>ALTITUDE</small><b>${Math.round(alt)} m</b></div><div class="${warn}"><small>DESCENT</small><b>${vs < 0 ? (-vs).toFixed(1) : '0.0'} m/s</b></div>` : `<div><small>TURBO</small><b>${Math.round(this.turbo * 100)}%</b></div>`);
    let hint;
    const out = this.ph === 'atmo' && this.grounded && this.planet === G.planet ? ' · E: get out' : '';
    if (!this.isPilot()) hint = pid ? `${nameOf(pid)} is flying · Mouse: look around · V: ${this.cur === 'seat' ? 'look from outside' : 'back to your seat'} · M: map${out}` : `Nobody is flying! F: take the pilot seat${out}`;
    else if (this.ph === 'space') hint = this.auto ? 'Autopilot is flying you there · W/S: speed · Shift: turbo · M: map · F: back seat' : 'Mouse: aim (the ship turns to the circle) · W/S: speed · Shift: turbo · Space/C: up/down · M: map · F: back seat';
    else if (this.grounded) {
      const missing = this.missingCrew();
      hint = (missing.length ? `Waiting for ${missing.join(', ')} to get in · ` : 'Everyone is aboard! Space: lift off · ') + `F: back seat${out}`;
    } else hint = 'Mouse: aim (the ship turns to the circle) · W/S: forward/back · Space: up · C: down · land slowly on the glowing pad';
    UI.hint(hint);
    // the pilot's aim circle (where the mouse is steering) and a dot where the nose points now
    const aimOn = this.isPilot() && this.cur === 'cockpit';
    const show = (id, on, yaw, pitch) => {
      const e = U.$(id);
      e.classList.toggle('hidden', !on);
      if (!on) return;
      const q = G.camera.position.clone().add(new V3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(60)).project(G.camera);
      e.style.left = (50 + U.clamp(q.x, -0.95, 0.95) * 50).toFixed(2) + '%';
      e.style.top = (50 - U.clamp(q.y, -0.95, 0.95) * 50).toFixed(2) + '%';
    };
    show('flyaim', aimOn, this.aimYaw, this.aimPitch);
    show('flynose', aimOn, this.yaw, this.pitch);
    // target marker (or an arrow at the screen edge pointing to it)
    const el = U.$('flytgt'), p = tg.p.clone().project(G.camera);
    const onScreen = p.z < 1 && Math.abs(p.x) < 0.92 && Math.abs(p.y) < 0.9;
    el.classList.remove('hidden');
    el.classList.toggle('edge', !onScreen);
    let x = p.x, y = p.y;
    if (p.z > 1) { x = -x; y = -y; }
    if (!onScreen) { const l = Math.max(Math.abs(x), Math.abs(y)) || 1; x = (x / l) * 0.88; y = (y / l) * 0.85; }
    el.style.left = (50 + x * 50).toFixed(1) + '%';
    el.style.top = (50 - y * 50).toFixed(1) + '%';
    el.querySelector('.arrow').style.transform = `rotate(${Math.atan2(-y, x) + Math.PI / 2}rad)`;
    el.querySelector('.lbl').textContent = `${tg.name} · ${Math.round(tg.d).toLocaleString()} m`;
    if ((this.t * 10 | 0) % 2 === 0) { this.drawRadar(); this.drawDash(alt, vs); }
    if (this.cur === 'seat' && (this.t * 4 | 0) !== this.signT) { this.signT = this.t * 4 | 0; this.drawSign(tg); }
  },
  // the screen over the cabin door: where we're going, and how far it is
  drawSign(tg) {
    if (!this.signTex) return;
    const c = this.signTex.userData.canvas.getContext('2d'), W = 512, H = 128;
    c.fillStyle = '#060c14'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(61,240,255,.35)'; c.lineWidth = 4; c.strokeRect(4, 4, W - 8, H - 8);
    const arriving = this.ph === 'atmo' && this.inbound;
    const top = arriving ? (this.grounded ? 'WE HAVE LANDED' : 'NOW ARRIVING') : 'NEXT STOP';
    const name = PLANETS[arriving ? this.planet : this.wp].name.toUpperCase();
    const eta = Math.max(1, Math.round(tg.d / Math.max(1, this.speed || 1)));
    const sub = this.ph === 'space' ? `${Math.round(tg.d).toLocaleString()} m · ETA ${eta >= 60 ? `${eta / 60 | 0}:${String(eta % 60).padStart(2, '0')}` : eta + ' s'}`
      : arriving ? 'PLEASE REMAIN SEATED' : this.grounded ? 'WAITING FOR TAKEOFF' : 'CLIMBING TO SPACE';
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillStyle = '#ffb020'; c.font = `700 24px ${FONT}`; c.fillText(top, 22, 30);
    c.fillStyle = '#7dffea'; c.font = `600 20px ${FONT}`; c.textAlign = 'right'; c.fillText(sub, W - 22, 30);
    c.textAlign = 'center'; c.fillStyle = '#ffffff'; c.font = `700 52px ${FONT}`;
    let f = 52;
    while (c.measureText(name).width > W - 40 && f > 24) { f -= 4; c.font = `700 ${f}px ${FONT}`; }
    c.fillText(name, W / 2, 84);
    if ((this.t * 2 | 0) % 2 === 0) { c.fillStyle = '#ffb020'; c.beginPath(); c.arc(W / 2 - c.measureText(name).width / 2 - 20, 84, 7, 0, Math.PI * 2); c.fill(); }
    this.signTex.needsUpdate = true;
  },
  // top-right radar: everything around you, with your nose pointing up
  drawRadar() {
    const draw = (ctx, size) => {
      const r = size / 2, range = this.ph === 'space' ? 7500 : 200;
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(8,14,26,.85)'; ctx.beginPath(); ctx.arc(r, r, r - 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(120,220,255,.35)'; ctx.lineWidth = 1;
      for (const k of [0.33, 0.66, 0.97]) { ctx.beginPath(); ctx.arc(r, r, (r - 2) * k, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(r, 4); ctx.lineTo(r, size - 4); ctx.moveTo(4, r); ctx.lineTo(size - 4, r); ctx.stroke();
      const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
      const dot = (wx, wz, col, rad, label, hi) => {
        const dx = wx - this.pos.x, dz = wz - this.pos.z;
        const fw = dx * sy + dz * cy, rt = -dx * cy + dz * sy; // ahead / to the right
        let px = (rt / range) * (r - 6), py = (-fw / range) * (r - 6);
        const l = Math.hypot(px, py), edge = l > r - 8;
        if (edge) { px *= (r - 8) / l; py *= (r - 8) / l; }
        const rr = edge ? 3.5 : rad;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(r + px, r + py, rr, 0, Math.PI * 2); ctx.fill();
        if (hi) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r + px, r + py, rr + 3, 0, Math.PI * 2); ctx.stroke(); }
        if (label && size > 100) { ctx.fillStyle = '#dfefff'; ctx.font = `600 ${Math.round(size / 15)}px "Chakra Petch", sans-serif`; ctx.textAlign = 'center'; ctx.fillText(label, r + px, r + py - rr - 5); }
      };
      if (this.ph === 'space') PLANETS.forEach((pl, i) => dot(SYSTEM[i].x, SYSTEM[i].z, planetUnlocked(i) ? pl.ground[0] : '#555a66', 6, i === this.wp ? pl.name.split(' ').pop().toUpperCase() : '', i === this.wp));
      else dot(0, 0, '#3df0ff', 6, 'PAD', true);
      ctx.fillStyle = '#7dff8a'; ctx.beginPath(); ctx.moveTo(r, r - 8); ctx.lineTo(r - 5, r + 6); ctx.lineTo(r + 5, r + 6); ctx.closePath(); ctx.fill();
    };
    const cv = U.$('radar');
    draw(cv.getContext('2d'), cv.width);
    if (this.radarTex) { draw(this.radarTex.userData.canvas.getContext('2d'), 128); this.radarTex.needsUpdate = true; }
  },
  drawDash(alt, vs) {
    if (!this.dashTex) return;
    const c = this.dashTex.userData.canvas.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#0b1a24'); g.addColorStop(1, '#050b10');
    c.fillStyle = g; c.fillRect(0, 0, 256, 128);
    c.strokeStyle = 'rgba(125,255,234,.25)'; c.lineWidth = 2; c.strokeRect(3, 3, 250, 122);
    const row = (y, lab, val, col) => {
      c.fillStyle = 'rgba(125,255,234,.55)'; c.font = '600 14px "Chakra Petch", sans-serif'; c.textAlign = 'left'; c.fillText(lab, 14, y);
      c.fillStyle = col || '#b9fff3'; c.font = '700 26px "Chakra Petch", sans-serif'; c.textAlign = 'right'; c.fillText(val, 242, y + 2);
    };
    const bad = vs < -FLY.hardVS;
    row(38, 'SPEED', String(Math.round(this.speed || 0)));
    row(76, this.ph === 'atmo' ? 'ALTITUDE' : 'BOOST', this.ph === 'atmo' ? `${Math.round(alt)} m` : `${Math.round(this.turbo * 100)}%`);
    row(114, this.ph === 'atmo' ? 'DESCENT' : 'TARGET', this.ph === 'atmo' ? `${Math.max(0, -vs).toFixed(1)}` : PLANETS[this.wp].name.split(' ').pop().toUpperCase(), bad ? '#ff6b6b' : null);
    this.dashTex.needsUpdate = true;
    // status lights: power, grounded, space, boost low, sink rate, blink
    const blink = (this.t * 4 | 0) % 2 === 0;
    const on = ['#46d98a', this.grounded ? '#46d98a' : '', this.ph === 'space' ? '#3ab4ff' : '', this.turbo < 0.25 ? '#ffb020' : '', bad && blink ? '#ff3b3b' : '', blink ? '#3df0ff' : ''];
    this.lights.forEach((l, i) => l.material.color.set(on[i] || '#1c2230'));
  },
  toggleMap() {
    if (this.mapOpen) { UI.closePanel(); return; }
    UI.openPanel(`<h2 class="ph">SYSTEM MAP</h2><p class="psub">${this.isPilot() ? 'Click a planet to set your destination. M or Esc to close.' : 'The pilot picks the destination. M or Esc to close.'}</p><canvas id="mapcv"></canvas>`,
      null, () => this.drawMap(), () => { this.mapOpen = false; });
    this.mapOpen = true;
    U.$('mapcv').addEventListener('click', (e) => this.mapClick(e));
    this.drawMap();
  },
  // the whole solar system; the pilot clicks a planet to set the destination
  drawMap() {
    const cv = U.$('mapcv');
    if (!cv) return;
    const Wd = (cv.width = cv.clientWidth || 800), Ht = (cv.height = cv.clientHeight || 500);
    const c = cv.getContext('2d');
    c.clearRect(0, 0, Wd, Ht);
    const xs = SYSTEM.map((p) => p.x), zs = SYSTEM.map((p) => p.z);
    const minX = Math.min(...xs) - 1200, maxX = Math.max(...xs) + 1200, minZ = Math.min(...zs) - 1400, maxZ = Math.max(...zs) + 1400;
    const s = Math.min(Wd / (maxX - minX), Ht / (maxZ - minZ));
    const ox = (Wd - (maxX - minX) * s) / 2, oz = (Ht - (maxZ - minZ) * s) / 2;
    const P = (x, z) => [ox + (x - minX) * s, oz + (z - minZ) * s];
    this.mapHits = [];
    c.strokeStyle = 'rgba(120,220,255,.25)'; c.setLineDash([6, 8]); c.lineWidth = 2;
    c.beginPath(); SYSTEM.forEach((p, i) => { const [x, y] = P(p.x, p.z); if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.stroke(); c.setLineDash([]);
    PLANETS.forEach((pl, i) => {
      const [x, y] = P(SYSTEM[i].x, SYSTEM[i].z), open = planetUnlocked(i), rr = Math.max(14, FLY.R * s);
      c.fillStyle = open ? pl.ground[0] : '#3a3f4c';
      c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill();
      c.lineWidth = i === this.wp ? 4 : 2; c.strokeStyle = i === this.wp ? '#ffffff' : 'rgba(255,255,255,.3)'; c.stroke();
      c.fillStyle = open ? '#ffffff' : '#8a90a0'; c.font = '700 17px "Chakra Petch", sans-serif'; c.textAlign = 'center';
      c.fillText(pl.name.toUpperCase(), x, y + rr + 20);
      c.font = '500 13px "Chakra Petch", sans-serif'; c.fillStyle = '#9fb3c8';
      c.fillText(!open ? 'LOCKED' : G.progress.includes(pl.boss) ? 'BOSS DEFEATED' : 'BOSS: ' + BOSSES[pl.boss].name.toUpperCase(), x, y + rr + 36);
      this.mapHits.push({ x, y, r: rr + 12, i });
    });
    // you are here
    const here = this.ph === 'space' ? this.pos : SYSTEM[this.planet];
    const [sx, sy] = P(here.x, here.z);
    c.save(); c.translate(sx, sy); c.rotate(-this.yaw + Math.PI);
    c.fillStyle = '#7dff8a'; c.beginPath(); c.moveTo(0, -12); c.lineTo(-8, 9); c.lineTo(8, 9); c.closePath(); c.fill();
    c.restore();
  },
  mapClick(ev) {
    if (!this.mapHits) return;
    const cv = U.$('mapcv'), b = cv.getBoundingClientRect();
    const x = ev.clientX - b.left, y = ev.clientY - b.top;
    for (const h of this.mapHits) if (Math.hypot(x - h.x, y - h.y) < h.r) {
      if (!this.isPilot()) { UI.toast('Only the pilot can pick where we go.', '', 1.5); return; }
      if (planetUnlocked(h.i)) this.setWaypoint(h.i); else UI.toast('That planet is locked.', 'bad', 1.5);
      return;
    }
  },
};
