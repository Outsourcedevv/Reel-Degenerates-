'use strict';
/* =========================================================
   Input, local player, remote players, shots & effects
   ========================================================= */
const Input = {
  keys: {}, pressed: {}, mouseL: false, mouseR: false, clickL: false, clickR: false, dx: 0, dy: 0, wheel: 0,
  init() {
    addEventListener('keydown', (e) => {
      if (G.chatting || e.target.tagName === 'INPUT') return;
      if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('mousedown', (e) => {
      if (!G.locked) return;
      if (e.button === 0) { this.mouseL = true; this.clickL = true; }
      if (e.button === 2) { this.mouseR = true; this.clickR = true; }
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseL = false;
      if (e.button === 2) this.mouseR = false;
    });
    addEventListener('mousemove', (e) => {
      if (!G.locked) return;
      if (Math.abs(e.movementX) > 400 || Math.abs(e.movementY) > 400) return; // browser glitch spikes
      this.dx += e.movementX; this.dy += e.movementY;
    });
    addEventListener('wheel', (e) => { if (G.locked) this.wheel += Math.sign(e.deltaY); }, { passive: true });
    addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('blur', () => { this.keys = {}; this.mouseL = this.mouseR = false; });
  },
  tap(code) { return !!this.pressed[code]; },
  endFrame() { this.pressed = {}; this.clickL = this.clickR = false; this.dx = this.dy = 0; this.wheel = 0; },
};

const TOOLS = ['zap', 'vac', 'drill', 'peel'];
const RESPAWN_HOLD = 1.2; // seconds of holding left click to get back up after dying
// tools you have to buy first (only the Grabby Vac is free)
const hasTool = (t) => (t !== 'zap' || SAVE.zap >= 0) && (t !== 'drill' || SAVE.drill) && (t !== 'peel' || SAVE.peel);

class LocalPlayer {
  constructor() {
    this.pos = new V3(); this.vel = new V3();
    this.yaw = 0; this.pitch = 0;
    this.onGround = false; this.jumps = 0;
    this.tool = 'zap';
    this.hp = 100; this.inv = 0; this.regenT = 0; this.dead = false; this.ghost = false; this.down = false; this.bleedT = 0; this.reviveT = 0;
    this.cd = 0; this.nadeCd = 0; this.walkT = 0; this.recoil = 0; this.deadT = 0;
    this.swapT = 0; this.sprintK = 0; this.landK = 0; this.swayX = 0; this.swayY = 0; this.lastYaw = 0; this.lastPitch = 0; this.flashT = 0;
    this.vacT = 0; this.vacTarget = null; this.drillT = 0; this.drillTarget = null;
    this.slideSnd = 0; this.swing = 0;
    this.ammo = 0; this.reloadT = 0; this.reloadDur = 1; this.reloadMsg = '';
    this.yawLog = []; this.airH = 0; this.shakeT = 0; // for style kills and the camera shake
    this.vm = new THREE.Group();
    G.camera.add(this.vm);
    this.vmDrill = buildDrillVM();
    this.vmPeel = buildPeelVM();
    for (const o of [this.vmDrill, this.vmPeel]) this.vm.add(o);
    this.vmZap = null; this.vmVac = null;
    this.refreshGear();
  }
  world() { return G.mode === 'boss' ? G.arena : G.world; }

  // (re)build the zapper and vac in your hands to match what you own
  refreshGear() {
    for (const o of [this.vmZap, this.vmVac]) if (o) { this.vm.remove(o); disposeObj(o); }
    this.vmZap = buildZapperVM(Math.max(0, SAVE.zap));
    this.vmVac = buildVacVM(SAVE.vacLvl > 0);
    this.vm.add(this.vmZap, this.vmVac);
    this.vm.traverse((c) => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = false; } });
    this.layoutVM();
    this.refill();
    this.setTool(hasTool(this.tool) ? this.tool : hasTool('zap') ? 'zap' : 'vac', true);
  }
  // fresh battery pack (new gun, new boss fight, respawn)
  refill() {
    this.reloadT = 0;
    this.ammo = SAVE.zap >= 0 ? ZAPPERS[SAVE.zap].mag : 0;
  }
  startReload() {
    if (SAVE.zap < 0 || this.tool !== 'zap' || this.reloadT > 0 || this.ammo >= ZAPPERS[SAVE.zap].mag) return;
    if (ZAPPERS[SAVE.zap].type === 'cutter') return; // (pizza cutters don't reload: they come back)
    this.reloadT = this.reloadDur = ZAPPERS[SAVE.zap].rl;
    this.reloadMsg = U.pick(LINES.reload);
    Sound.play('reload');
  }
  // keep held tools in the lower-right corner on any screen shape
  layoutVM() {
    const d = 0.5, hh = d * Math.tan(THREE.MathUtils.degToRad(G.camera.fov / 2)), hw = hh * G.camera.aspect;
    const x = Math.min(0.24, hw * 0.55), y = -hh * 0.52;
    for (const o of [this.vmZap, this.vmVac, this.vmDrill, this.vmPeel]) { if (o) { o.position.set(x, y, -d); o.scale.setScalar(0.62); } }
  }
  setTool(t, quiet) {
    if (!hasTool(t)) {
      if (!quiet) {
        UI.toast({ zap: `No gun yet! ${SHOPS[PLANETS[G.planet].shop].npc} sells the Pew Pew Zapper.`, drill: 'No Laser Drill yet! Penguin Pete sells one on Frostbyte.', peel: 'No Pizza Peel yet! Dave sells one on Zorblax Prime.' }[t], 'bad');
        Sound.play('error');
      }
      return;
    }
    if (this.tool !== t) {
      if (!quiet) { Sound.play('click'); this.swapT = 1; }
      this.reloadT = 0; // putting the zapper away cancels a reload
    }
    this.tool = t;
    if (t === 'zap' && this.ammo <= 0) this.startReload();
    this.vmZap.visible = t === 'zap';
    this.vmVac.visible = t === 'vac';
    this.vmDrill.visible = t === 'drill';
    this.vmPeel.visible = t === 'peel';
    this.releaseTargets();
    UI.hud();
  }
  releaseTargets() {
    if (this.vacTarget && !this.vacTarget.taken) { this.vacTarget.mesh.scale.setScalar(1); this.vacTarget.mesh.position.set(this.vacTarget.x, this.vacTarget.y, this.vacTarget.z); }
    this.vacTarget = null; this.vacT = 0;
    if (this.drillTarget && !this.drillTarget.taken) this.drillTarget.mesh.position.set(this.drillTarget.x, this.drillTarget.y, this.drillTarget.z);
    this.drillTarget = null; this.drillT = 0;
    UI.action(null);
  }
  teleport(p, yaw) {
    this.pos.copy(p); this.vel.set(0, 0, 0);
    if (yaw != null) this.yaw = yaw;
    this.pitch = -0.05;
    this.onGround = false;
  }
  camDir(out) { return out.set(0, 0, -1).applyQuaternion(G.camera.quaternion); }

  update(dt) {
    const w = this.world();
    const cfg = PLANETS[G.planet];
    const canAct = G.locked && !G.panel && !G.chatting;
    // --- look
    const s = 0.0022 * G.settings.sens;
    if (G.locked && !G.panel) {
      this.yaw -= Input.dx * s;
      this.pitch = U.clamp(this.pitch - Input.dy * s, -1.5, 1.5);
    }
    // remember where you were looking lately (a full turn right before a kill is a "360")
    this.yawLog.push([G.time, this.yaw]);
    while (this.yawLog.length && G.time - this.yawLog[0][0] > 2.2) this.yawLog.shift();
    // --- tool switching
    if (canAct) {
      if (Input.tap('Digit1')) this.setTool('zap');
      if (Input.tap('Digit2')) this.setTool('vac');
      if (Input.tap('Digit3')) this.setTool('drill');
      if (Input.tap('Digit4')) this.setTool('peel');
      if (Input.tap('KeyR')) this.startReload();
      if (Input.wheel) {
        const avail = TOOLS.filter(hasTool);
        const i = (avail.indexOf(this.tool) + (Input.wheel > 0 ? 1 : -1) + avail.length) % avail.length;
        this.setTool(avail[i]);
      }
    }
    // --- movement
    let mx = 0, mz = 0;
    const frozen = this.dead;
    if (canAct && !frozen) {
      if (Input.keys.KeyW) mz += 1;
      if (Input.keys.KeyS) mz -= 1;
      if (Input.keys.KeyA) mx -= 1;
      if (Input.keys.KeyD) mx += 1;
    }
    const sprint = Input.keys.ShiftLeft || Input.keys.ShiftRight;
    const speed = (sprint ? 8.6 : 5.6) * (this.ghost ? 1.3 : 1);
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    let tx = (-sy * mz + cy * mx), tz = (-cy * mz - sy * mx);
    const len = Math.hypot(tx, tz);
    if (len > 0) { tx = (tx / len) * speed; tz = (tz / len) * speed; }
    const fric = this.onGround ? (cfg.fric < 5 && SAVE.socks ? 10 : cfg.fric) : 2.5;
    this.vel.x = U.damp(this.vel.x, tx, fric, dt);
    this.vel.z = U.damp(this.vel.z, tz, fric, dt);
    if (this.onGround && cfg.fric < 5 && !SAVE.socks && Math.hypot(this.vel.x, this.vel.z) > 3 && len === 0) {
      this.slideSnd -= dt;
      if (this.slideSnd <= 0) { Sound.play('slide'); this.slideSnd = 0.35; }
    }
    // --- jumping (double jump with Bounce Boots)
    if (canAct && !frozen && Input.tap('Space')) {
      if (this.onGround) { this.vel.y = 7.4; this.onGround = false; this.jumps = 1; Sound.play('jump'); }
      else if (SAVE.boots && this.jumps < 2) { this.vel.y = 7.0; this.jumps = 2; Sound.play('boing'); FX.burst(this.pos, '#ff9ad5', 8, 3); }
    }
    this.vel.y -= cfg.grav * dt;
    // --- integrate horizontal with collisions
    const nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
    if (!w.blocked(nx, nz, this.pos.y)) { this.pos.x = nx; this.pos.z = nz; }
    else if (!w.blocked(nx, this.pos.z, this.pos.y)) { this.pos.x = nx; this.vel.z *= 0.5; }
    else if (!w.blocked(this.pos.x, nz, this.pos.y)) { this.pos.z = nz; this.vel.x *= 0.5; }
    else { this.vel.x = 0; this.vel.z = 0; }
    w.collide(this.pos, 0.4);
    // --- vertical
    const gnd = w.ground(this.pos.x, this.pos.z, this.pos.y);
    this.pos.y += this.vel.y * dt;
    this.airH = this.pos.y - gnd;
    if (this.pos.y <= gnd) {
      if (!this.onGround && this.vel.y < -12) FX.burst(this.pos, '#ffffff', 5, 2);
      if (!this.onGround && this.vel.y < -5) this.landK = Math.min(1, -this.vel.y / 16);
      this.pos.y = gnd; this.vel.y = Math.max(0, this.vel.y);
      this.onGround = true; this.jumps = 0;
    } else if (this.pos.y > gnd + 0.08) this.onGround = false;
    if (this.pos.y < -4 && G.mode === 'planet') {
      this.teleport(G.world.spawn, G.world.spawnYaw);
      UI.toast(`You fell in the ${cfg.liquid.name}. Gross.`, 'bad');
    }
    // --- timers
    this.cd -= dt; this.nadeCd -= dt; this.inv -= dt;
    this.recoil = U.damp(this.recoil, 0, 14, dt);
    this.swing = Math.max(0, this.swing - dt * 3.5);
    this.vmPeel.rotation.x = Math.sin(this.swing * Math.PI) * 0.7;
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) { this.refill(); Sound.play('reloaded'); }
    }
    // reload animation: tip the zapper down and give the battery a wiggle
    const rk = this.reloadT > 0 ? Math.sin((1 - this.reloadT / this.reloadDur) * Math.PI) : 0;
    this.vmZap.rotation.set(-rk * 0.9, 0, rk * 0.35);
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround && hs > 0.5) this.walkT += dt * hs * 1.25;
    this.sprintK = U.damp(this.sprintK, sprint && hs > 6.5 && this.onGround ? 1 : 0, 6, dt);
    this.swapT = Math.max(0, this.swapT - dt * 4);
    this.landK = U.damp(this.landK, 0, 7, dt);
    this.flashT -= dt;
    if (this.vmZap.userData.flash) this.vmZap.userData.flash.visible = this.flashT > 0;
    this.updateBeam(dt);
    const wheel = this.vmZap.userData.wheel; // (the pizza cutter sitting in the gun, while you have one in hand)
    if (wheel) { wheel.visible = this.ammo > 0; wheel.rotation.x += dt * 3; }
    if ((G.mode === 'boss' || G.mode === 'planet') && !this.dead && !this.ghost) {
      this.regenT -= dt;
      if (this.regenT <= 0 && this.hp < 100) this.hp = Math.min(100, this.hp + (G.mode === 'boss' ? 6 : 12) * dt);
    }
    UI.planetHp(this.hp);
    // --- actions
    const busy = !canAct || this.dead || this.ghost;
    if (!busy) this.useTool(dt);
    else if (this.vacTarget || this.drillTarget) this.releaseTargets();
    if (!busy && Input.clickR) this.throwNade();
    // --- interaction prompt
    this.updateDown(dt);
    this.updateRespawn(dt, canAct);
    if (!this.checkRevive(dt, canAct)) this.checkInteract(canAct && !this.dead);
    // --- camera
    this.updateCamera(dt, hs);
    UI.ammo(this);
  }

  // critter bites (and friendly fire) on a planet; boss fights have their own damage rules.
  // raw = don't scale with the world's difficulty (friendly fire is the same on every difficulty)
  hurtPlanet(d, fx, fz, who, raw) {
    if (this.inv > 0 || this.dead) return;
    d = Math.round(d * (raw ? 1 : Game.dmgMul()));
    if (SAVE.armor) d = Math.round(d * 0.7);
    this.hp -= d; this.inv = 0.5; this.regenT = 4;
    const dx = this.pos.x - fx, dz = this.pos.z - fz, l = Math.hypot(dx, dz) || 1;
    this.vel.x += (dx / l) * 6; this.vel.z += (dz / l) * 6; this.vel.y = Math.max(this.vel.y, 3.5); this.onGround = false;
    UI.hurt();
    G.shake = Math.max(G.shake, 0.4);
    Sound.play('hurt');
    if (this.hp > 0) return;
    if (this.canGoDown()) { this.goDown(who, () => this.die(who)); return; }
    if (DIFFS[G.diff].perma) { this.dead = true; this.hp = 0; this.deadT = 0; Game.permaDeath(who); return; }
    this.die(who);
  }
  // you died on a planet (and nobody picked you up): everything but your vac drops where you fell,
  // and you lie there until you hold left click
  die(who) {
    this.down = false; this.dead = true; this.hp = 0; this.deadT = 0;
    this.releaseTargets();
    UI.show('spectate', false);
    const grave = Drops.graveDrop();
    this.refreshGear();
    SAVE.stats.deaths++;
    persist();
    UI.hud();
    Sound.play('death');
    const covered = SAVE.lifeIns ? '<small>Extra Life Insurance covered your gear. (Premiums may apply.)</small>' : '';
    UI.death(true, 'KNOCKED OUT', `${U.pick(LINES.bitten)} (${who || 'Something'}: 1, you: 0)`,
      grave ? this.dropNote(grave.items) + covered
        : SAVE.lifeIns ? 'Nothing dropped: Extra Life Insurance covered your gear, and your backpack was empty.'
        : 'You had nothing to drop. (Your Grabby Vac never leaves your side.)');
    this.waitForRespawn(() => this.respawn());
  }
  // what you dropped, for the death screen
  dropNote(items) {
    const parts = [];
    let loot = 0;
    for (const e of items) {
      if (!e.startsWith('gear:')) { loot++; continue; }
      const [, k, n] = e.split(':');
      const name = k === 'zap' ? ZAPPERS[+n].name : k === 'drill' ? 'Laser Drill' : k === 'peel' ? 'Pizza Peel' : `Goo Grenades x${n}`;
      parts.push(`<span>${Thumbs.img(k === 'zap' ? 'zap:' + n : k === 'nades' ? 'nade' : k, 'mini', null)}${U.esc(name)}</span>`);
    }
    if (loot) parts.push(`<span>${Thumbs.img('cargo:' + SAVE.cargoLvl, 'mini', null)}${loot} thing${loot > 1 ? 's' : ''} from your backpack</span>`);
    return `<b>You dropped your stuff where you fell:</b>${parts.join('')}<small>Only you can pick it up. Follow the beam of light.</small>`;
  }
  // dead: hold left click to get back up (fn does the actual respawning)
  waitForRespawn(fn) { this.waitRespawn = fn; this.respawnHold = 0; this.respawnArmed = false; }
  updateRespawn(dt, canAct) {
    if (!this.waitRespawn) return;
    if (!Input.mouseL) this.respawnArmed = true; // (let go first: dying mid-shot doesn't count as holding)
    const holding = canAct && this.respawnArmed && Input.mouseL;
    this.respawnHold = holding ? this.respawnHold + dt : Math.max(0, this.respawnHold - dt * 2);
    UI.respawnFill(this.respawnHold / RESPAWN_HOLD);
    if (this.respawnHold < RESPAWN_HOLD) return;
    const fn = this.waitRespawn;
    this.waitRespawn = null;
    UI.death(false);
    Input.mouseL = false; // (the click that got you up doesn't also fire/vacuum)
    fn();
  }
  respawn() {
    this.dead = false; this.down = false; this.hp = 100; this.inv = 2;
    this.teleport(Game.spawnPoint(), G.world.spawnYaw);
    FX.burst(this.pos.clone().setY(this.pos.y + 1), '#7dff8a', 12, 4);
    Sound.play('reloaded');
    const n = (SAVE.graves || []).filter((g) => g.p === G.planet).length;
    if (n) UI.toast(`Back at the ship. Your stuff is where you fell: follow the beam of light${n > 1 ? 's' : ''}.`, '', 4.5);
  }
  // a clean slate (starting a world, a boss fight starting or ending): alive, standing, nothing pending
  resetLife() {
    this.dead = false; this.down = false; this.ghost = false; this.hp = 100; this.inv = 0;
    this.waitRespawn = null; this.onBleedOut = null;
    UI.death(false); UI.show('spectate', false);
  }

  /* ----- going down and getting picked back up (multiplayer) ----- */
  // with friends in the game you don't die right away: you go down and they can revive you
  canGoDown() { return Net.online && [...G.remotes.values()].some((r) => !r.s.g); }
  goDown(cause, onBleedOut) {
    this.down = true; this.dead = true; this.deadT = 0; this.hp = 0;
    this.bleedT = DIFFS[G.diff].perma ? Infinity : 25;
    this.onBleedOut = onBleedOut; this.downCause = cause;
    this.releaseTargets();
    Sound.play('death');
    UI.bigTitle('YOU\'RE DOWN', `${cause ? cause + ' got you. ' : ''}A friend can pick you up: they walk over and hold E.`, '#ff6b6b', 3);
    const html = `<b>${U.esc(G.name)}</b> is down! Go pick them up (walk over and hold E).`;
    UI.feed(html, 'bad');
    Net.relay({ t: 'ann', html, cls: 'bad' });
  }
  updateDown(dt) {
    if (!this.down) return;
    const helped = this.helpT && G.time - this.helpT < 0.6; // a friend is picking you up right now
    if (!helped) this.bleedT -= dt;
    // hardcore and everyone else left the game: nobody is coming
    if (this.bleedT === Infinity && !this.canGoDown() && !Game.permaDead) { Game.permaDeath(this.downCause); return; }
    const el = UI.el.spectate;
    el.classList.remove('hidden');
    const txt = helped ? `${this.helpBy.toUpperCase()} IS PICKING YOU UP · ${Math.round(this.helpP * 100)}%`
      : this.bleedT === Infinity ? 'DOWN · WAITING FOR A FRIEND TO PICK YOU UP · IF EVERYONE GOES DOWN, THE WORLD IS GONE'
      : `DOWN · WAITING FOR A FRIEND TO PICK YOU UP · ${Math.ceil(this.bleedT)}s`;
    if (el.textContent !== txt) el.textContent = txt;
    if (this.bleedT <= 0) {
      this.down = false;
      el.classList.add('hidden');
      const cb = this.onBleedOut; this.onBleedOut = null;
      if (cb) cb();
    }
  }
  revive(by) {
    if (!this.down) return;
    this.down = false; this.dead = false; this.onBleedOut = null; this.helpT = 0;
    this.hp = 40; this.inv = 2.5; this.regenT = 2;
    UI.show('spectate', false);
    FX.burst(this.pos.clone().setY(this.pos.y + 1), '#7dff8a', 14, 4);
    Sound.play('reloaded');
    if (by) UI.toast(`${by} picked you up! Back on your feet.`, 'good', 2.5);
  }
  // a friend is lifting you up (they're holding E next to you)
  helped(by, p) { this.helpT = G.time; this.helpBy = by; this.helpP = p; }
  // walk up to a downed friend and hold E to pick them up (the bleed-out timer pauses while you do)
  checkRevive(dt, canAct) {
    let best = null, bd = 3.2;
    if (canAct && !this.dead && !this.ghost) {
      for (const r of G.remotes.values()) {
        if (!r.visible || !r.s.dn) continue;
        const d = Math.hypot(r.pos.x - this.pos.x, r.pos.z - this.pos.z);
        if (d < bd) { bd = d; best = r; }
      }
    }
    for (const r of G.remotes.values()) if (r !== best) r.lift = 0;
    if (!best) { if (this.reviveT > 0) { this.reviveT = 0; UI.action(null); } return false; }
    UI.prompt(`Hold E to pick up ${best.name}`);
    if (Input.keys.KeyE) {
      this.reviveT += dt;
      best.lift = this.reviveT / 2.5;
      UI.action(best.lift, `PICKING UP ${best.name.toUpperCase()}...`);
      this.helpSend = (this.helpSend || 0) - dt;
      if (this.helpSend <= 0) { this.helpSend = 0.25; Net.relay({ t: 'rvp', to: best.id, by: G.name, p: U.r2(best.lift) }); }
      if (this.reviveT >= 2.5) {
        this.reviveT = 0; best.lift = 0; UI.action(null);
        Net.relay({ t: 'revive', to: best.id, by: G.name });
        const html = `<b>${U.esc(G.name)}</b> picked <b>${U.esc(best.name)}</b> back up!`;
        UI.feed(html, 'good');
        Net.relay({ t: 'ann', html, cls: 'good' });
        Sound.play('pickup');
      }
    } else if (this.reviveT > 0) { this.reviveT = 0; best.lift = 0; UI.action(null); }
    return true;
  }

  useTool(dt) {
    const t = this.tool;
    if (t === 'zap') {
      if (Input.mouseL && this.cd <= 0) this.fireZap();
      return;
    }
    if (t === 'peel') {
      // the peel catches things on its own; clicking is just a very important swing
      if (Input.clickL && this.swing <= 0) { this.swing = 1; Sound.play('throw'); }
      return;
    }
    const w = this.world();
    if (t === 'vac') {
      if (!Input.mouseL) { if (this.vacTarget) this.releaseTargets(); this.vmVac.userData.noz.rotation.z = 0; return; }
      Sound.play('vac');
      this.vmVac.userData.noz.rotation.z = Math.sin(G.time * 40) * 0.05;
      const tier = VAC[SAVE.vacLvl];
      if (!this.vacTarget || this.vacTarget.taken) {
        this.vacT = 0;
        this.vacTarget = this.findNode(w, ['scrap'], tier.range, 0.88);
        if (!this.vacTarget && Input.clickL) UI.toast(G.mode === 'planet' && PLANETS[G.planet].activity === 'scrap' ? 'Point at a glowing junk pile!' : 'Nothing to vacuum here...', '', 1.4);
      }
      const n = this.vacTarget;
      if (!n) return;
      const d = Math.hypot(n.x - this.pos.x, n.z - this.pos.z);
      if (d > tier.range + 1.5) { this.releaseTargets(); return; }
      if (SAVE.cargo.length >= CARGO[SAVE.cargoLvl]) { UI.toast(U.pick(LINES.cargoFull), 'bad', 1.6); this.releaseTargets(); Input.mouseL = false; return; }
      this.vacT += dt * tier.speed;
      const k = U.clamp(this.vacT / 0.8, 0, 1);
      const muzzle = this.vmVac.userData.muzzle.getWorldPosition(new V3());
      n.mesh.position.set(U.lerp(n.x, muzzle.x, k * k), U.lerp(n.y, muzzle.y, k * k) + Math.sin(k * 3) * 0.6, U.lerp(n.z, muzzle.z, k * k));
      n.mesh.scale.setScalar(1 - k * 0.8);
      n.mesh.rotation.y += dt * 12;
      UI.action(k, 'VACUUMING...');
      if (k >= 1) { Activities.collect(n); this.vacTarget = null; this.vacT = 0; UI.action(null); }
      return;
    }
    if (t === 'drill') {
      const bit = this.vmDrill.userData.bit;
      if (!Input.mouseL) { if (this.drillTarget) this.releaseTargets(); return; }
      bit.rotation.z += dt * 30;
      if (!this.drillTarget || this.drillTarget.taken) {
        this.drillT = 0;
        this.drillTarget = this.findNode(w, ['crystal'], 5, 0.8);
        if (!this.drillTarget && Input.clickL) UI.toast(PLANETS[G.planet].activity === 'crystal' ? 'Get closer to a crystal!' : 'No crystals here...', '', 1.4);
      }
      const n = this.drillTarget;
      if (!n) return;
      if (Math.hypot(n.x - this.pos.x, n.z - this.pos.z) > 6.5) { this.releaseTargets(); return; }
      if (SAVE.cargo.length >= CARGO[SAVE.cargoLvl]) { UI.toast(U.pick(LINES.cargoFull), 'bad', 1.6); this.releaseTargets(); Input.mouseL = false; return; }
      this.drillT += dt;
      Sound.play('drill');
      n.mesh.position.set(n.x + (Math.random() - 0.5) * 0.12, n.y, n.z + (Math.random() - 0.5) * 0.12);
      if (Math.random() < 0.4) FX.burst(new V3(n.x, n.y + 1.2, n.z), '#bff6ff', 1, 3);
      UI.action(this.drillT / 1.8, 'DRILLING...');
      if (this.drillT >= 1.8) { Activities.collect(n); this.drillTarget = null; this.drillT = 0; UI.action(null); }
    }
  }
  findNode(w, kinds, range, minDot) {
    const cp = G.camera.position, dir = this.camDir(new V3());
    let best = null, bestScore = Infinity;
    for (const n of w.nodes) {
      if (n.taken || !kinds.includes(n.kind)) continue;
      const dx = n.x - cp.x, dy = n.y + 0.5 - cp.y, dz = n.z - cp.z;
      const d = Math.hypot(dx, dy, dz);
      if (d > range + 1.5) continue;
      const dot = (dx * dir.x + dy * dir.y + dz * dir.z) / d;
      if (dot < minDot) continue;
      const score = d * (2 - dot);
      if (score < bestScore) { bestScore = score; best = n; }
    }
    return best;
  }

  // pull the trigger: every gun does its own thing (see ZAPPERS)
  fireZap() {
    if (SAVE.zap < 0) return;
    const z = ZAPPERS[SAVE.zap];
    if (z.type === 'cutter') { this.throwCutter(z); return; }
    if (this.reloadT > 0) return;
    if (this.ammo <= 0) { this.startReload(); return; }
    if (z.type === 'beam') { this.beamTick(z); return; }
    this.cd = z.cd;
    this.ammo--;
    const last = this.ammo <= 0;
    if (last) this.startReload();
    const o = this.vmZap.userData.muzzle.getWorldPosition(new V3()), d = this.aimFrom(o);
    const flags = this.shotFlags(last);
    const net = { t: 'shoot', k: z.type, o: v3r(o), d: v3r(d), c: z.color };
    let color = z.color;
    if (z.type === 'spread') { // six pellets in a cone
      net.s = Math.floor(Math.random() * 1e6);
      Shots.spread(o, d, net.s, z, true, flags);
      Sound.play('shotgun'); this.recoil = 0.16; G.shake = Math.max(G.shake, 0.18);
    } else if (z.type === 'lob') { // a ball of goo on an arc
      Shots.fire('goo', o, d, true, { dmg: z.dmg, radius: z.radius, flags });
      Sound.play('lob'); this.recoil = 0.12;
    } else if (z.type === 'jackpot') { // every shot is a slot pull
      const roll = U.weighted(JACKPOT_ROLLS.map((r) => [r, r.w]));
      net.r = roll.k; color = roll.color;
      Shots.fire('zap', o, d, true, { dmg: z.dmg, color, flags, roll });
      Sound.play(roll.k === 'dud' ? 'fizz' : 'coin'); this.recoil = 0.08;
    } else {
      Shots.fire('zap', o, d, true, { dmg: z.dmg, color, flags });
      Sound.play('zap'); this.recoil = 0.08;
    }
    Net.relay(net);
    this.muzzleFlash(color);
  }
  // from the gun toward whatever the crosshair is on
  aimFrom(o) { return G.camera.position.clone().add(this.camDir(new V3()).multiplyScalar(60)).sub(o).normalize(); }
  // how you shot (for style kills: in the air, after a 360, last shot in the battery...)
  shotFlags(last) { return { air: !this.onGround && this.airH > 0.5, spin: this.spun(), last, run: this.sprintK > 0.5, low: this.hp < 25, from: this.pos.clone() }; }
  muzzleFlash(color) {
    this.flashT = 0.05;
    const fl = this.vmZap.userData.flash;
    if (fl) { fl.rotation.z = Math.random() * 6; fl.scale.setScalar(0.8 + Math.random() * 0.5); fl.material.color.set(color); }
  }
  // Cryo Beam: hold the trigger and it hits the first thing in its way, ten times a second
  beamTick(z) {
    this.cd = z.cd;
    this.ammo--;
    const last = this.ammo <= 0;
    if (last) this.startReload();
    const cam = G.camera.position, dir = this.camDir(new V3()), w = this.world();
    // follow the crosshair out until something's in the way
    const a = cam.clone(), b = new V3(), end = cam.clone().addScaledVector(dir, z.range);
    let hit = null;
    for (let d = 0.6; d <= z.range; d += 0.6) {
      b.copy(cam).addScaledVector(dir, d);
      hit = Shots.test(a, b, null);
      if (hit || (w && b.y <= w.surfaceAt(b.x, b.z))) { end.copy(b); break; }
      a.copy(b);
    }
    this.beamN = (this.beamN || 0) + 1;
    if (hit) Shots.land({ flags: this.shotFlags(last), vel: dir, color: z.color }, hit, end.clone(), z.dmg, 'ice', this.beamN % 3 !== 0);
    const o = this.vmZap.userData.muzzle.getWorldPosition(new V3());
    this.beamFrom = o; this.beamEnd = end; this.beamT = 0.14;
    Net.relay({ t: 'shoot', k: 'beam', o: v3r(o), e: v3r(end), c: z.color });
    Sound.play('beam');
    if (Math.random() < 0.6) FX.burst(end, '#bff6ff', 1, 2);
  }
  // Pizza Cutter: throw one. It flies out, slices everything in a line, and comes back to you.
  throwCutter(z) {
    if (this.ammo <= 0 || this.cd > 0) return;
    this.cd = z.cd;
    this.ammo--;
    const o = this.vmZap.userData.muzzle.getWorldPosition(new V3()), d = this.aimFrom(o);
    Shots.fire('cutter', o, d, true, { dmg: z.dmg, out: z.out, flags: this.shotFlags(false) });
    Net.relay({ t: 'shoot', k: 'cutter', o: v3r(o), d: v3r(d), c: z.color });
    Sound.play('cutter');
    this.recoil = 0.1;
  }
  // one of my pizza cutters came back (or got lost somewhere): it's ready to throw again
  cutterBack() {
    const z = ZAPPERS[SAVE.zap];
    if (z && z.type === 'cutter') this.ammo = Math.min(z.mag, this.ammo + 1);
  }
  // (the beam is drawn from the gun to wherever it hit, while you're holding it)
  updateBeam(dt) {
    this.beamT = (this.beamT || 0) - dt;
    const on = this.beamT > 0 && this.tool === 'zap' && !this.dead && !this.ghost;
    if (!this.beam) {
      if (!on) return;
      this.beam = new THREE.Mesh(_beamGeo, new THREE.MeshBasicMaterial({ color: '#bff6ff', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      this.beam.renderOrder = 6;
      G.scene.add(this.beam);
    }
    this.beam.visible = on;
    if (on) aimBeam(this.beam, this.vmZap.userData.muzzle.getWorldPosition(new V3()), this.beamEnd, 1 + Math.sin(G.time * 60) * 0.25);
  }
  // did you just turn all the way around? (in either direction, within the last couple of seconds)
  spun() {
    let m = 0;
    for (const e of this.yawLog) m = Math.max(m, Math.abs(this.yaw - e[1]));
    return m >= Math.PI * 2 * 0.92;
  }
  throwNade() {
    if (G.mode !== 'boss') { UI.toast(SAVE.nades ? 'Save your grenades for boss fights!' : 'No grenades. Chef Snorbo sells them on Gloop.', '', 1.8); return; }
    if (SAVE.nades <= 0) { UI.toast('Out of Goo Grenades!', 'bad', 1.5); Sound.play('error'); return; }
    if (this.nadeCd > 0) return;
    this.nadeCd = 0.7;
    SAVE.nades--; persist(); UI.hud();
    const o = G.camera.position.clone().add(this.camDir(new V3()).multiplyScalar(0.8));
    const d = this.camDir(new V3());
    Shots.fire('nade', o, d, true, { dmg: NADE_DMG });
    Net.relay({ t: 'nade', o: [U.r2(o.x), U.r2(o.y), U.r2(o.z)], d: [U.r2(d.x), U.r2(d.y), U.r2(d.z)] });
    Sound.play('throw');
  }

  checkInteract(can) {
    this.near = null;
    if (!can || G.mode !== 'planet' || G.world.rising) { UI.prompt(null); return; } // no shopping while a boss climbs out
    const dir = this.camDir(new V3());
    let best = null, bd = Infinity;
    for (const it of G.world.inter) {
      const dx = it.x - this.pos.x, dz = it.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > it.r) continue;
      const dot = d > 0.5 ? (dx * dir.x + dz * dir.z) / (d * Math.hypot(dir.x, dir.z) + 1e-6) : 1;
      if (dot < 0.2) continue;
      if (d < bd) { bd = d; best = it; }
    }
    this.near = best;
    UI.prompt(best ? (typeof best.label === 'function' ? best.label() : best.label) : null);
    if (best && Input.tap('KeyE')) best.fn();
  }

  updateCamera(dt, hs) {
    const cam = G.camera;
    const bob = this.onGround ? Math.sin(this.walkT * 2) * 0.05 * U.clamp(hs / 6, 0, 1) : 0;
    let eye = 1.65 + bob - this.landK * 0.22;
    if (this.dead) { this.deadT += dt; eye = U.lerp(1.65, 0.45, U.clamp(this.deadT * 2, 0, 1)); }
    cam.position.set(this.pos.x, this.pos.y + eye, this.pos.z);
    // camera shake: a smooth wobble that fades out and always settles back exactly where you aim
    // (it never touches your actual look direction)
    G.shake = U.clamp(G.shake - dt * 2.4, 0, 1.2);
    this.shakeT += dt * 22;
    const sh = Math.min(1, G.shake) ** 2 * 0.03, t = this.shakeT;
    const sx = (Math.sin(t * 1.31) + 0.5 * Math.sin(t * 2.97)) * sh, sy = (Math.cos(t * 1.73) + 0.5 * Math.sin(t * 3.71)) * sh;
    cam.rotation.set(this.pitch + sx, this.yaw + sy, this.dead ? Math.min(this.deadT * 0.6, 0.3) : 0, 'YXZ');
    // sprinting widens the view a little
    const fov = 72 + this.sprintK * 7;
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
    // viewmodel: lags behind the mouse, bobs with steps, dips on landing, drops out of view when swapping tools
    const k = Math.min(1, dt * 60);
    this.swayX = U.damp(this.swayX, U.clamp(U.angDiff(this.lastYaw, this.yaw) * 1.6 * k, -0.08, 0.08), 10, dt);
    this.swayY = U.damp(this.swayY, U.clamp((this.pitch - this.lastPitch) * 1.6 * k, -0.08, 0.08), 10, dt);
    this.lastYaw = this.yaw; this.lastPitch = this.pitch;
    const sw = this.swapT * this.swapT, run = this.sprintK;
    this.vm.visible = !this.dead && !this.ghost;
    this.vm.position.set(
      Math.cos(this.walkT) * (0.012 + run * 0.02) + this.swayX * 0.5,
      Math.abs(Math.sin(this.walkT)) * (0.012 + run * 0.02) + (this.onGround ? 0 : 0.02) - sw * 0.3 - this.landK * 0.05 - this.swayY * 0.4 - run * 0.03,
      this.recoil);
    this.vm.rotation.set(this.recoil * 1.5 - sw * 0.9 + run * 0.25 - this.swayY, this.swayX * 1.2 + run * 0.3, -this.swayX * 0.8);
  }

  netState() {
    return {
      x: U.r2(this.pos.x), y: U.r2(this.pos.y), z: U.r2(this.pos.z), yw: U.r2(this.yaw),
      vx: Math.round(this.vel.x * 10) / 10, vy: Math.round(this.vel.y * 10) / 10, vz: Math.round(this.vel.z * 10) / 10,
      og: this.onGround ? 1 : 0, st: Flight.on ? (Flight.seat === 'pilot' ? 1 : 2) : 0,
      t: TOOLS.indexOf(this.tool), h: SAVE.hat, c: G.color, n: G.name, m: G.mode, p: G.planet,
      hp: Math.round(this.hp), g: this.ghost ? 1 : 0, d: this.dead ? 1 : 0, dn: this.down ? 1 : 0, $: SAVE.bucks, zp: SAVE.zap,
      u: (this.vacTarget || this.drillTarget || (this.tool === 'zap' && Input.mouseL)) ? 1 : 0,
    };
  }
}

/* ---------------- other players ---------------- */
class RemotePlayer {
  constructor(id, s) {
    this.id = id; this.s = s; this.name = s.n;
    this.m = buildAstronaut({ color: s.c, hat: s.h });
    this.color = s.c;
    G.scene.add(this.m.root);
    this.tag = textSprite(s.n, { size: 44, bg: 'rgba(20,20,40,.55)', scale: 0.0065 });
    this.tag.position.y = 2.75;
    this.m.root.add(this.tag);
    this.ghostTag = textSprite('OUT', { size: 60, pad: 8, scale: 0.012 });
    this.ghostTag.position.y = 1.2;
    this.ghostTag.visible = false;
    this.m.root.add(this.ghostTag);
    this.zl = Math.max(0, s.zp || 0); // their zapper level (so you see the gun they really have)
    this.tools = [buildZapperVM(this.zl), buildVacVM(), buildDrillVM(), buildPeelVM()];
    this.tools.forEach((t) => this.holdTool(t));
    this.pos = new V3(s.x, s.y, s.z); this.tpos = this.pos.clone();
    this.tvel = new V3(); this.rcvT = G.time; this.lift = 0;
    this.yaw = s.yw; this.walk = 0;
    this.center = new V3();
    this.visible = true;
  }
  apply(s) {
    const prev = this.s;
    this.s = s;
    this.seen = G.time;
    this.tpos.set(s.x, s.y, s.z);
    this.tvel.set(s.vx || 0, s.og ? 0 : s.vy || 0, s.vz || 0);
    this.rcvT = G.time;
    // teleports (landing, respawning, starting a boss fight, changing planets) snap straight there
    // instead of sliding across the map, so everyone sees each other where they really are
    if (!prev || prev.m !== s.m || prev.p !== s.p || this.pos.distanceTo(this.tpos) > 3) this.snapNext = true;
    if (s.h !== this.m.hatId) setHat(this.m, s.h);
    const zl = Math.max(0, s.zp || 0);
    if (zl !== this.zl && ZAPPERS[zl]) { // they bought a better zapper
      this.zl = zl;
      this.m.hand.remove(this.tools[0]); disposeObj(this.tools[0]);
      this.tools[0] = this.holdTool(buildZapperVM(zl));
    }
    if (s.n !== this.name) {
      this.name = s.n;
      this.m.root.remove(this.tag); disposeObj(this.tag);
      this.tag = textSprite(s.n, { size: 44, bg: 'rgba(20,20,40,.55)', scale: 0.0065 });
      this.tag.position.y = 2.75; this.m.root.add(this.tag);
    }
  }
  update(dt) {
    const s = this.s;
    this.visible = s.m === G.mode && s.p === G.planet && G.mode !== 'menu' && G.mode !== 'space'; // in space everyone is inside the ship
    this.m.root.visible = this.visible;
    if (!this.visible) { this.snapNext = true; return; }
    // aim a little ahead of the last update using their velocity (updates arrive ~15 times a second)
    const ahead = Math.min(G.time - this.rcvT, 0.2);
    const tx = this.tpos.x + this.tvel.x * ahead, ty = this.tpos.y + this.tvel.y * ahead, tz = this.tpos.z + this.tvel.z * ahead;
    if (this.snapNext) { this.pos.set(tx, ty, tz); this.snapNext = false; }
    const px = this.pos.x, pz = this.pos.z;
    this.pos.x = U.damp(this.pos.x, tx, 16, dt);
    this.pos.y = U.damp(this.pos.y, ty, 16, dt);
    this.pos.z = U.damp(this.pos.z, tz, 16, dt);
    this.yaw += U.angDiff(this.yaw, s.yw) * Math.min(1, dt * 12);
    const sp = Math.hypot(this.pos.x - px, this.pos.z - pz) / Math.max(dt, 1e-4);
    this.walk += dt * sp * 1.3;
    const swing = Math.sin(this.walk * 2) * U.clamp(sp / 5, 0, 1) * 0.7;
    const r = this.m;
    r.root.position.copy(this.pos);
    r.root.rotation.y = this.yaw + Math.PI;
    r.legL.rotation.x = swing; r.legR.rotation.x = -swing;
    r.armL.rotation.x = -swing * 0.7;
    r.armR.rotation.x = U.damp(r.armR.rotation.x, -1.45 + (s.u ? Math.sin(G.time * 30) * 0.05 : 0), 10, dt);
    this.tools.forEach((t, i) => (t.visible = i === s.t));
    const ghost = !!s.g;
    r.head.visible = !ghost; r.legL.visible = !ghost; r.legR.visible = !ghost;
    this.ghostTag.visible = ghost;
    if (!this.downTag) { this.downTag = textSprite('REVIVE ME', { size: 44, color: '#ffffff', bg: 'rgba(200,30,30,.8)', scale: 0.0075, depthTest: false, order: 20 }); this.downTag.position.y = 1.6; r.root.add(this.downTag); }
    this.downTag.visible = !!s.dn && !ghost;
    if (s.dn) this.downTag.position.y = 1.5 + Math.sin(G.time * 4) * 0.1;
    r.root.children.forEach((c) => { if (c.isMesh) c.visible = !ghost; });
    r.armL.visible = r.armR.visible = !ghost;
    // knocked down: lying on the ground (and rising as a friend picks them up)
    if (s.d && !ghost) { r.root.rotation.z = U.damp(r.root.rotation.z, 1.4 * (1 - U.clamp(this.lift, 0, 1)), 6, dt); } else r.root.rotation.z = U.damp(r.root.rotation.z, 0, 8, dt);
    this.center.set(this.pos.x, this.pos.y + 1.0, this.pos.z);
  }
  // put a tool in their right hand
  holdTool(t) {
    t.rotation.x = -Math.PI / 2; t.scale.setScalar(1.2);
    this.m.hand.add(t);
    return t;
  }
  dispose() {
    G.scene.remove(this.m.root);
    disposeObj(this.m.root);
  }
}

/* ---------------- shots ----------------
   Zap bolts (plus shotgun pellets and lucky jackpot bolts), balls of goo, pizza cutters,
   boss-fight grenades, and flashes of other people's freeze beams. Your own shots do the
   damage; everyone else's are just for show (their own game does their damage). The Cryo
   Beam itself isn't a shot: see LocalPlayer.beamTick. */
const _boltGeo = new THREE.SphereGeometry(0.09, 6, 4);
const _nadeGeo = new THREE.IcosahedronGeometry(0.22, 0);
const _gooGeo = new THREE.IcosahedronGeometry(0.2, 1);
const _beamGeo = (() => { const g = new THREE.CylinderGeometry(0.03, 0.05, 1, 8, 1, true); g.translate(0, 0.5, 0); return g; })();
const _basicMats = new Map();
function basicMat(color) {
  let m = _basicMats.get(color);
  if (!m) { m = new THREE.MeshBasicMaterial({ color }); m.userData.shared = true; _basicMats.set(color, m); }
  return m;
}
const _beamMats = new Map();
function beamMat(color) {
  let m = _beamMats.get(color);
  if (!m) { m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }); m.userData.shared = true; _beamMats.set(color, m); }
  return m;
}
const v3r = (v) => [U.r2(v.x), U.r2(v.y), U.r2(v.z)];
// stretch a beam (a unit-long tube pointing up from its base) from a to b
function aimBeam(m, a, b, thick = 1) {
  const d = b.clone().sub(a), len = d.length() || 0.01;
  m.position.copy(a);
  m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.divideScalar(len));
  m.scale.set(thick, len, thick);
}
const Shots = {
  list: [], bonkCd: new Map(),
  // kind: 'zap' (bolts, pellets, lucky bolts) · 'goo' · 'cutter' · 'nade' (boss fights)
  fire(kind, o, d, local, extra = {}) {
    let mesh, speed, life, g = 0;
    if (kind === 'zap') {
      mesh = new THREE.Mesh(_boltGeo, basicMat(extra.color || '#ff4b3e'));
      if (extra.pellet) { mesh.scale.set(0.6, 0.6, 2.6); speed = 80; life = 0.3; } else { mesh.scale.set(1, 1, 4); speed = 75; life = 1.1; }
      if (extra.roll && extra.roll.k === 'jp') mesh.scale.multiplyScalar(1.8);
    } else if (kind === 'goo') { mesh = new THREE.Mesh(_gooGeo, basicMat('#ff5fb8')); speed = 30; life = 3; g = 14; }
    else if (kind === 'cutter') { mesh = new THREE.Group(); mesh.userData.spin = buildCutterWheel(mesh, 0.28); speed = 36; life = 4; }
    else { mesh = new THREE.Mesh(_nadeGeo, basicMat('#ff5fb8')); speed = 20; life = 4; g = 16; }
    mesh.position.copy(o);
    G.scene.add(mesh);
    const s = {
      kind, mesh, local, t: 0, dmg: extra.dmg || 0,
      pos: o.clone(), prev: o.clone(), vel: d.clone().multiplyScalar(speed),
      life, g, color: extra.color || '#ff5fb8',
      flags: extra.flags || null, roll: extra.roll || null, radius: extra.radius || 0,
      out: extra.out || 0.55, owner: extra.owner || null, hits: kind === 'cutter' ? new Set() : null,
    };
    if (kind === 'nade') s.vel.y += 5;
    if (kind === 'goo') s.vel.y += 2.5; // (lobbed a little upward, so it arcs)
    this.list.push(s);
    return s;
  },
  // a shotgun blast: pellets in a cone (seeded, so everyone sees the same spray)
  spread(o, d, seed, z, local, flags) {
    const rng = U.seeded(seed), right = new V3().crossVectors(d, new V3(0, 1, 0)).normalize(), up = new V3().crossVectors(right, d);
    for (let i = 0; i < z.pellets; i++) {
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * z.spread;
      const dir = d.clone().addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
      this.fire('zap', o, dir, local, { dmg: z.dmg, color: z.color, flags, pellet: true });
    }
  },
  // somebody else fired: show it (players on older versions just send plain zaps)
  remote(m, r) {
    const o = new V3(...m.o);
    if (m.k === 'beam') { if (m.e) this.beamFx(o, new V3(...m.e), m.c || '#9fe3ff'); return; }
    const d = new V3(...m.d), def = ZAPPERS.find((z) => z.type === m.k);
    if (m.k === 'spread' && def) this.spread(o, d, m.s || 1, def, false, null);
    else if (m.k === 'lob') this.fire('goo', o, d, false, { radius: def ? def.radius : 2.8 });
    else if (m.k === 'cutter') this.fire('cutter', o, d, false, { owner: r, out: def ? def.out : 0.55 });
    else if (m.k === 'jackpot') { const roll = JACKPOT_ROLLS.find((x) => x.k === m.r) || JACKPOT_ROLLS[0]; this.fire('zap', o, d, false, { color: roll.color, roll }); }
    else this.fire('zap', o, d, false, { color: m.c });
  },
  // a flicker of somebody's freeze beam
  beamFx(a, b, color) {
    const mesh = new THREE.Mesh(_beamGeo, beamMat(color));
    aimBeam(mesh, a, b);
    G.scene.add(mesh);
    this.list.push({ kind: 'beam', mesh, t: 0, life: 0.14 });
    if (Math.random() < 0.5) FX.burst(b, '#bff6ff', 1, 2);
  },
  update(dt) {
    const tmp = new V3();
    for (let i = this.list.length - 1; i >= 0; i--) {
      const s = this.list[i];
      s.t += dt; s.life -= dt;
      if (s.kind === 'beam') { if (s.life <= 0) this.remove(i); continue; }
      s.prev.copy(s.pos);
      if (s.kind === 'cutter') this.steerCutter(s);
      s.vel.y -= s.g * dt;
      s.pos.addScaledVector(s.vel, dt);
      s.mesh.position.copy(s.pos);
      if (s.kind === 'zap' || s.kind === 'cutter') s.mesh.lookAt(tmp.copy(s.pos).add(s.vel));
      else s.mesh.rotation.x += dt * 10;
      if (s.kind === 'cutter') s.mesh.userData.spin.rotation.x -= dt * 28;
      let done = false;
      const hit = s.local ? this.test(s.prev, s.pos, s.hits) : null;
      if (hit) {
        if (s.kind === 'cutter') { s.hits.add(hit.key); this.land(s, hit, s.pos.clone(), s.dmg); } // slices right through
        else { if (s.kind === 'zap') this.landBolt(s, hit); done = true; } // (goo and grenades go off)
      }
      const w = G.player && G.player.world();
      if (!done && w && s.pos.y <= w.surfaceAt(s.pos.x, s.pos.z)) {
        if (s.kind === 'cutter') { s.pos.y = w.surfaceAt(s.pos.x, s.pos.z) + 0.05; this.turnBack(s); } // bounces off the ground and heads home
        else done = true;
      }
      if (s.kind === 'cutter' && s.back && s.home < 1.3) done = true; // caught it
      if (done || s.life <= 0) this.end(s, i, done);
    }
  },
  end(s, i, impact) {
    if (s.kind === 'goo') {
      FX.burst(s.pos, '#ff5fb8', 16, 6);
      FX.ring(s.pos, '#ff9ad5', s.radius || 2.8);
      Sound.play('gloop');
      if (s.local) this.blast(s.pos, s.radius, s.dmg, s.flags, 'goo');
    } else if (s.kind === 'nade') {
      FX.burst(s.pos, '#ff5fb8', 22, 9);
      FX.ring(s.pos, '#ff9ad5', 4.5);
      Sound.play('grenade');
      if (s.local && G.boss) G.boss.explosion(s.pos, 4.5, s.dmg);
    } else if (s.kind === 'cutter') {
      if (s.local) { G.player.cutterBack(); if (s.back && s.home < 1.3) Sound.play('catch'); }
    } else if (impact) FX.burst(s.pos, s.color, 4, 3);
    this.remove(i);
  },
  remove(i) {
    const s = this.list[i];
    G.scene.remove(s.mesh);
    if (s.kind === 'cutter') disposeObj(s.mesh);
    this.list.splice(i, 1);
  },
  // a pizza cutter flies out, then heads home to whoever threw it, slicing things both ways
  steerCutter(s) {
    if (!s.back && s.t >= s.out) this.turnBack(s);
    if (!s.back) return;
    const home = s.local ? G.camera.position : s.owner && s.owner.visible ? s.owner.center : null;
    if (!home) { s.life = 0; return; }
    const d = home.clone().sub(s.pos);
    s.home = d.length();
    s.vel.copy(d.multiplyScalar(40 / (s.home || 1)));
  },
  turnBack(s) { if (!s.back) { s.back = true; s.hits.clear(); } },

  // what a shot flying from p0 to p1 runs into first (skip: things this shot already hit, by key)
  test(p0, p1, skip) {
    if (G.mode === 'boss' && G.boss) {
      if (!(skip && skip.has('boss')) && G.boss.hitTest(p0, p1)) return { k: 'boss', key: 'boss' };
      const m = G.boss.minionOn(p0, p1, skip);
      if (m) return { k: 'minion', m, key: 'm' + m.id };
      if (!G.ff) return null;
    } else if (G.mode === 'planet') {
      const ch = Critters.hitTest(p0, p1, skip);
      if (ch) return { k: 'critter', c: ch.c, ctr: ch.ctr, key: 'c' + ch.c.id };
    } else return null;
    // friends: always a (harmless) bonk on planets; in boss fights only with friendly fire on
    for (const r of G.remotes.values()) {
      if (!r.visible || r.s.g || r.s.dn || (skip && skip.has('f' + r.id))) continue;
      if (U.segSphere(p0, p1, r.center, 0.75)) return { k: 'friend', r, key: 'f' + r.id };
    }
    return null;
  },
  // my shot hit something (fx: 'goo' slows critters, 'ice' freezes them; quiet: skip the damage number)
  land(s, t, pos, dmg, fx, quiet) {
    if (t.k === 'boss') G.boss.localHit(dmg, pos, quiet);
    else if (t.k === 'minion') G.boss.hitMinion(t.m, dmg, quiet);
    else if (t.k === 'critter') Critters.hit(t.c, dmg, pos, s.flags ? Object.assign({ dist: s.flags.from.distanceTo(t.ctr) }, s.flags) : null, fx, quiet);
    else if (t.k === 'friend') this.bonkFriend(t.r, s, dmg);
  },
  // a bolt landed. Jackpot bolts show what they rolled (and 777s and jackpots go off)
  landBolt(s, hit) {
    const pos = s.pos.clone(), roll = s.roll;
    if (!roll) { this.land(s, hit, pos, s.dmg); return; }
    if (roll.text) FX.text(pos.clone().setY(pos.y + 1.1), roll.text, roll.color, roll.k === 'jp' ? 70 : 48);
    if (roll.mult > 0) this.land(s, hit, pos, Math.round(s.dmg * roll.mult));
    if (roll.blast) {
      FX.ring(pos, roll.color, roll.blast[0]); FX.burst(pos, roll.color, 14, 7);
      this.blast(pos, roll.blast[0], Math.round(s.dmg * roll.blast[1]), s.flags, null, hit.key);
    }
    if (roll.k === 'jp') { Sound.play('jackpot'); G.shake = Math.max(G.shake, 0.4); }
  },
  // a splash (goo, lucky blasts): every critter and minion in it, the boss once, and friends if
  // friendly fire is on (skip: whatever the shot already hit directly)
  blast(pos, radius, dmg, flags, fx, skip) {
    if (G.mode === 'boss' && G.boss) G.boss.explosion(pos, radius, dmg, skip === 'boss');
    else if (G.mode === 'planet') {
      const w = G.worlds[G.planet];
      for (const c of [...Critters.list.values()]) {
        if (skip === 'c' + c.id) continue;
        const r = c.m.hit * SIZES[c.sz].s, cp = new V3(c.rx, w.gh(c.rx, c.rz) + r * 0.8, c.rz);
        if (cp.distanceTo(pos) > radius + r) continue;
        Critters.hit(c, dmg, cp, flags ? Object.assign({ dist: flags.from.distanceTo(cp) }, flags) : null, fx);
      }
    }
    if (G.ff) for (const r of G.remotes.values()) {
      if (!r.visible || r.s.g || r.s.dn || skip === 'f' + r.id || r.center.distanceTo(pos) > radius + 0.6) continue;
      this.bonkFriend(r, { vel: r.center.clone().sub(pos), color: '#ff5fb8' }, dmg);
    }
  },
  // my shot hit a friend: a harmless BONK, or real damage when the host turned on friendly fire
  bonkFriend(r, s, dmg) {
    if ((this.bonkCd.get(r.id) || 0) > G.time) return; // (a beam or a shotgun doesn't bonk them ten times at once)
    this.bonkCd.set(r.id, G.time + 0.35);
    const k = new V3(s.vel.x, 0, s.vel.z).normalize();
    const d = G.ff ? Math.max(1, Math.round(dmg * 0.5)) : 0;
    Net.relay({ t: 'bonk', to: r.id, d: [U.r2(k.x), U.r2(k.z)], by: G.name, dmg: d });
    if (d) { UI.toast(`FRIENDLY FIRE! You shot ${r.name} (-${d})`, 'bad', 1.4); FX.text(r.center.clone().setY(r.center.y + 0.9), String(d), '#ff6b6b', 40); }
    else UI.toast(`${U.pick(LINES.bonk)} You zapped ${r.name}!`, 'purple', 1.4);
    Sound.play('bonk');
    FX.burst(r.center, s.color || '#ffffff', 8, 4);
  },
  clear() { for (let i = this.list.length - 1; i >= 0; i--) this.remove(i); },
};

/* ---------------- little particle effects ---------------- */
const _fxGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
const FX = {
  parts: [], rings: [], texts: [],
  burst(pos, color, n = 8, speed = 4) {
    const mat = basicMat(color);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(_fxGeo, mat);
      m.position.copy(pos);
      G.scene.add(m);
      this.parts.push({ m, v: new V3((Math.random() - 0.5) * 2, Math.random() * 1.5 + 0.3, (Math.random() - 0.5) * 2).multiplyScalar(speed), life: 0.5 + Math.random() * 0.5 });
    }
  },
  ring(pos, color, r) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.copy(pos);
    G.scene.add(m);
    this.rings.push({ m, r, t: 0 });
  },
  text(pos, str, color = '#fff', size = 46) {
    const s = textSprite(str, { size, color, stroke: '#2b1d14', pad: 8, scale: 0.012, depthTest: false, order: 20 });
    s.position.copy(pos);
    G.scene.add(s);
    this.texts.push({ s, t: 0, vx: (Math.random() - 0.5) * 1.5 });
  },
  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.v.y -= 14 * dt;
      p.m.position.addScaledVector(p.v, dt);
      p.m.rotation.x += dt * 8; p.m.rotation.y += dt * 6;
      p.life -= dt;
      p.m.scale.setScalar(Math.max(0.05, p.life * 1.4));
      if (p.life <= 0) { G.scene.remove(p.m); this.parts.splice(i, 1); }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt * 2.8;
      r.m.scale.setScalar(0.3 + r.t * r.r);
      r.m.material.opacity = Math.max(0, 0.8 * (1 - r.t));
      if (r.t >= 1) { G.scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); this.rings.splice(i, 1); }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.t += dt;
      t.s.position.y += dt * 1.8;
      t.s.position.x += t.vx * dt;
      t.s.material.opacity = Math.max(0, 1 - t.t / 0.9);
      if (t.t > 0.9) { G.scene.remove(t.s); disposeObj(t.s); this.texts.splice(i, 1); }
    }
  },
  clear() {
    for (const p of this.parts) G.scene.remove(p.m);
    for (const r of this.rings) G.scene.remove(r.m);
    for (const t of this.texts) G.scene.remove(t.s);
    this.parts = []; this.rings = []; this.texts = [];
  },
};
