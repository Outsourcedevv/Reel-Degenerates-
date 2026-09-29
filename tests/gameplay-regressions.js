// Run in a fresh game browser context, after Game.startWorld (never a real save).
function runGameplayRegressions() {
  const results = [], check = (v, message) => { if (!v) throw Error(message); results.push(message); };
  const p = G.player;
  const c = { x: 45.1, z: 0, hx: 0, hz: 0, t: 10, rx: 0, rz: 0, sz: SIZE_NORMAL, m: { hit: 1 } };
  const targets = [{ id: 'test', p: new V3(44, 0, 0), safe: false }];
  check(Critters.target(c, targets) === null, 'Enemy releases target beyond leash');
  c.x = 44.9;
  check(Critters.target(c, targets) === null, 'Enemy does not reacquire at leash boundary');
  c.x = 20; targets[0].p.x = 21;
  check(!!Critters.target(c, targets), 'Enemy reacquires after returning home');
  const text = FX.text, sound = Sound.play; let alerts = 0;
  try { FX.text = () => alerts++; Sound.play = () => {}; for (let i = 0; i < 100; i++) { c.t += .016; Critters.alert(c); } }
  finally { FX.text = text; Sound.play = sound; }
  check(alerts === 1, 'Repeated alerts are suppressed');
  Game.loadPlanet(0); G.locked = true;
  p.teleport(new V3(6.3, G.world.ground(6.3, .2, 50), .2), Math.PI / 2);
  Input.keys = { [Keys.map.forward]: true }; Input.pressed = {}; Input.dx = Input.dy = 0;
  for (let i = 0; i < 65; i++) p.update(1 / 60);
  Input.keys = {};
  check(p.pos.x < 1.6 && p.pos.x > -.5, 'Player walks through hatch up the ramp');
  check(Math.abs(p.pos.y - (G.world.parked.position.y + CABIN.floor)) < .05, 'Cabin floor supports player');
  G.progress = [...new Set([...G.progress, 'gary'])];
  Flight.board('pass');
  check(Flight.on && Flight.seat === 'pass', 'Passenger seating works');
  Flight.exit();
  check(G.mode === 'planet' && p.pos.x < 1.6 && p.pos.y > G.world.parked.position.y + 2, 'Standing up returns to cabin');
  Flight.board('pilot');
  check(Flight.isPilot(), 'Pilot seating works');
  Flight.exit();
  p.yaw = -Math.PI / 2; Input.keys = { [Keys.map.forward]: true };
  for (let i = 0; i < 75; i++) p.update(1 / 60);
  Input.keys = {};
  check(p.pos.x > 6 && p.pos.y < G.world.parked.position.y + .3, 'Player walks back down ramp onto planet');
  Game.loadPlanet(4); const w = G.world, f = w.fun;
  check(f.bars.visible && f.gateBlock.top === f.top, 'Maze starts locked');
  p.teleport(new V3(f.gate.x + 1, f.goal.y, f.gate.z), 0);
  Fun.start(MAZE);
  check(!f.bars.visible && f.gateBlock.top === -Infinity && Fun.run.t === 0, 'Maze start opens gate and starts timer');
  Fun.stop();
  check(f.bars.visible && f.gateBlock.top === f.top, 'Maze gate resets after run');
  p.pos.set(f.goal.x, f.goal.y, f.goal.z); MAZE.idle(f, .016, null);
  check(p.pos.x > f.R.x1, 'Entering maze without timer returns to start');
  let doubleLid = false;
  f.chest.traverse(o => { if (o.isMesh && o.material.side === THREE.DoubleSide && o.geometry.attributes.position.count > 30) doubleLid = true; });
  check(doubleLid, 'Chest lid renders both sides');
  for (const build of [() => buildVacVM(false), () => buildVacVM(true), buildDrillVM, buildPeelVM]) {
    const a = build(), b = build();
    check(a.userData.muzzle.parent === a, a.name + ': muzzle preserved');
    const moving = a.userData.bit || a.userData.noz || a.userData.board;
    check(!!moving.parent && moving !== (b.userData.bit || b.userData.noz || b.userData.board), a.name + ': independent animated part');
    a.traverse(o => { if (o.isMesh && !Array.from(o.geometry.attributes.position.array).every(Number.isFinite)) throw Error('Invalid tool geometry'); });
    disposeObj(a); disposeObj(b);
  }
  const ship = buildShip(true), shipNames = [];
  ship.traverse(o => { if (o.name) shipNames.push(o.name); if (o.isMesh && !Array.from(o.geometry.attributes.position.array).every(Number.isFinite)) throw Error('Invalid ship geometry'); });
  check(ship.userData.shipDetails && ship.userData.shipDetails.boardable, 'Ship keeps boardable detail metadata');
  for (const name of ['ship-cockpit-frame', 'ship-engine-left', 'ship-engine-right', 'ship-dorsal-fin', 'ship-ramp-handrail']) check(shipNames.includes(name), name + ' is present');
  check(ship.children.length >= 70, 'Ship has the upgraded courier detail pass');
  disposeObj(ship);
  const flyingShip = buildShip(), ramp = flyingShip.userData.ramp;
  const ground = Math.max(G.world.h(0, 0), WATER_Y);
  const flight = { ramp, rampT: 1, ph: 'atmo', planet: G.planet, pos: new V3(0, ground + 76, 0) };
  Flight.updateRamp.call(flight, 1);
  check(flight.rampT < .01, 'Ramp retracts above 75m above terrain');
  flight.pos.y = ground + 74;
  Flight.updateRamp.call(flight, 1);
  check(flight.rampT > .99, 'Ramp deploys on descent below 75m');
  flight.ph = 'space';
  Flight.updateRamp.call(flight, 1);
  check(flight.rampT < .01, 'Ramp stays retracted in space');
  disposeObj(flyingShip);
  for (const theme of ['count', 'stormy', 'chad']) {
    const fake = Object.create(BossFight.prototype);
    fake.processions = []; fake.rpos = new V3(); fake.canHurt = () => true;
    let hits = 0; fake.hurt = () => hits++;
    const spec = { k: 'procession', angle: 0, gap: 3, half: 2, w: 2.8, speed: 8, d: 26, h: 18, theme };
    const test = (x, y) => { fake.exec(spec); const h = fake.processions[0]; h.t = spec.w + (ARENA_R + 3) / spec.speed - .03; fake.updProcessions(.06, { pos: new V3(x, DECK_Y + y, 0) }); fake.removeHazard(h); fake.processions = []; };
    test(3, 0); check(hits === 0, theme + ': aisle is safe');
    test(-3, 5); check(hits === 1, theme + ': jumping cannot bypass formation');
    const rotated = Object.assign({}, spec, { angle: Math.PI / 2 });
    fake.exec(rotated); const h = fake.processions[0];
    h.t = spec.w + (ARENA_R + 3) / spec.speed - .03;
    fake.updProcessions(.06, { pos: new V3(0, DECK_Y, -3) });
    check(hits === 1, theme + ': rotated safe aisle matches visible geometry');
    fake.updProcessions(20, { pos: new V3(0, DECK_Y, -3) });
    check(fake.processions.length === 0 && !h.g, theme + ': formation cleans up');
  }
  return results;
}
