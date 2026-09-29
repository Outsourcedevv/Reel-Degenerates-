'use strict';
/* =========================================================
   SPACE GOOBERS — boot, menus, game loop, travel, net glue
   ========================================================= */

const Game = {
  last: 0, sendT: 0, hintT: 0, tickT: 0, summoning: false, summonAt: 0,
  arenas: {},

  async boot() {
    const lt = U.$('loading-text');
    lt.textContent = 'Warming up the pizza oven...';
    try { await Promise.race([document.fonts.load('700 40px "Chakra Petch"'), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* offline is fine */ }

    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    r.setSize(innerWidth, innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    U.$('game').appendChild(r.domElement);
    G.renderer = r;
    G.scene = new THREE.Scene();
    G.scene.fog = new THREE.Fog('#ffffff', 50, 240);
    G.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 1500);
    G.scene.add(G.camera);
    G.hemi = new THREE.HemisphereLight('#ffffff', '#444444', 0.6);
    G.scene.add(G.hemi);
    const sun = new THREE.DirectionalLight('#ffffff', 1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 160;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.06;
    G.scene.add(sun, sun.target);
    G.sun = sun;
    Sky.init(G.scene);
    G.liquid = new Liquid(G.scene);

    UI.init();
    Input.init();
    Object.assign(G.settings, lsGet('spacegoobers_settings', {}));
    Post.init();
    G.player = new LocalPlayer();
    G.player.vm.visible = false;

    lt.textContent = 'Building Scrapyard-9...';
    await new Promise((res) => setTimeout(res, 30));
    this.loadPlanet(0);

    this.setupMenu();
    this.setupPause();
    this.setupChat();
    // Close panels during the actual key event, before pause handling or the
    // next frame can reuse Escape. A direct gesture can reacquire pointer lock.
    addEventListener('keydown', (e) => {
      if (e.code !== 'Escape' || !G.panel || Keys.capturing || document.getElementById('ending')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      Input.keys.Escape = true; Input.pressed = {}; Input.dx = Input.dy = 0;
      if (!e.repeat) UI.closePanel();
    }, true);
    this.setupNet();
    addEventListener('resize', () => {
      G.camera.aspect = innerWidth / innerHeight;
      G.camera.updateProjectionMatrix();
      G.renderer.setSize(innerWidth, innerHeight);
      Post.resize();
      G.player.layoutVM();
    });
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === G.renderer.domElement) { this.everLocked = true; this.wantLock = false; this.relockTried = false; clearTimeout(this.lockT); this.fallback = false; this.setSoft(false); G.locked = true; }
      else { this.unlockedAt = performance.now(); if (!this.soft && !this.wantLock) G.locked = false; }
      this.updatePause();
    });
    // the browser wouldn't grab the mouse (some never do: fall back to free-mouse look)
    document.addEventListener('pointerlockerror', () => this.lockFailed());
    G.renderer.domElement.addEventListener('click', () => { if (G.started && !G.panel && (!G.locked || this.soft)) this.lock(); });
    // playing without the mouse grabbed (see lockFailed): the next click grabs it
    addEventListener('mousedown', () => { if (this.soft && G.started && !G.panel) this.lock(); });
    addEventListener('beforeunload', () => { Casino.cashOut(); persist(); Net.leave(); });
    U.$('loading').classList.add('hidden');
    U.$('menu').classList.remove('hidden');
    requestAnimationFrame((t) => this.loop(t));
    this.startBackgroundTicker();
    Thumbs.warmAll(); // (draw the item pictures in the background while you're in the menu)
    Updates.init(); // (in the desktop app: is there a newer version?)
  },

  /* ---------------- planets ---------------- */
  loadPlanet(i) {
    if (!G.worlds[i]) {
      const w = new PlanetWorld(i);
      G.scene.add(w.group);
      G.worlds[i] = w;
    }
    for (const k in G.worlds) G.worlds[k].group.visible = Number(k) === i;
    for (const k in this.arenas) this.arenas[k].group.visible = false;
    G.world = G.worlds[i];
    G.planet = i;
    setAtmosphere(PLANETS[i]);
  },
  spawnPoint() {
    const w = G.world, n = [...G.remotes.keys()].length;
    const a = Math.random() * Math.PI * 2, r = n ? 1.5 : 0;
    const p = w.spawn.clone();
    p.x += Math.cos(a) * r; p.z += Math.sin(a) * r;
    p.y = w.ground(p.x, p.z, 50);
    return p;
  },
  // me: I got a seat in the ship (see flight.js); sit down in it, still parked on the pad
  enterShip(seat) {
    if (G.panel) UI.closePanel(true);
    G.player.releaseTargets();
    Shots.clear();
    G.mode = 'space';
    Flight.start(G.planet, seat);
    this.lock();
  },
  // host: the ship is down on a landing pad; everybody hops out
  arrive(i) {
    if (!G.worlds[i]) { const w = new PlanetWorld(i); G.scene.add(w.group); w.group.visible = false; G.worlds[i] = w; }
    const m = { t: 'land', p: i, taken: Activities.takenList(i), loot: Activities.lootList(i) };
    Net.toAll(m);
    this.doLand(i, m.taken);
    SAVE.planet = i;
    persist();
  },
  doLand(i, taken, loot) {
    const moved = i !== G.planet;
    Flight.finish();
    Sound.play('land');
    this.loadPlanet(i);
    G.world.parked.visible = true;
    if (taken) Activities.applyTaken(i, taken);
    if (loot) Activities.applyLoot(i, loot);
    G.player.teleport(this.spawnPoint(), G.world.spawnYaw);
    G.player.updateCamera(0, 0);
    G.player.protect(GRACE.land);
    G.mode = 'planet';
    Flight.clearCrew(); // everyone's out: the seats are empty again
    Flight.parkedPilot();
    Drops.restoreGraves();
    Critters.restoreBodies();
    UI.hud();
    Sound.playMusic(PLANETS[i].music);
    if (!moved) return;
    const pl = PLANETS[i];
    setTimeout(() => UI.bigTitle(pl.name, pl.blurb, '#fff', 3.4), 600);
    setTimeout(() => { if (G.mode === 'planet' && G.planet === i) UI.guide(true, 16); }, 4000); // (as the title fades)
    if (i === 2 && !SAVE.seenCasino) { SAVE.seenCasino = true; persist(); setTimeout(() => UI.toast('GAMBLING UNLOCKED. Please gamble responsibly. (You won\'t.)', 'purple', 5), 5200); }
  },

  /* ---------------- start / menus ---------------- */
  // your astronaut's picture on the title screen
  drawLook() {
    const pic = !G.started && document.querySelector('#m-cust .pic');
    if (pic) pic.innerHTML = Thumbs.img(Thumbs.crewKey(G.color, Custom.hats().hat, G.look), '', 'person');
  },
  setupMenu() {
    const nameEl = U.$('m-name'), status = U.$('m-status');
    nameEl.value = lsGet('spacegoobers_name', '') || 'Goober' + U.randi(10, 99);
    G.color = lsGet('spacegoobers_color', null) || U.pick(ACCENT_COLORS);
    Custom.load();
    this.drawLook();
    U.$('m-cust').onclick = () => { Sound.init(); Custom.open(); };
    const readName = () => {
      const n = (nameEl.value || '').replace(/[^\w \-.'!]/g, '').trim().slice(0, 14) || 'Goober';
      G.name = n;
      lsSet('spacegoobers_name', n);
      lsSet('spacegoobers_color', G.color);
      Sound.init();
    };
    const busy = (on) => ['m-solo', 'm-host', 'm-join'].forEach((id) => (U.$(id).disabled = on));
    U.$('m-solo').onclick = () => { readName(); this.pickWorld('solo'); };
    U.$('m-host').onclick = () => { readName(); this.pickWorld('host'); };
    U.$('m-wback').onclick = () => { U.$('m-worlds').classList.add('hidden'); U.$('m-main').classList.remove('hidden'); };
    U.$('m-wnew').onclick = () => { Sound.play('click'); this.startWorld(Worlds.create(U.$('m-wname').value, this.newDiff)); };
    const drawDiff = () => {
      U.$('m-diff').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.d === this.newDiff));
      U.$('m-diffdesc').textContent = DIFFS[this.newDiff].desc;
      U.$('m-diffdesc').classList.toggle('danger', this.newDiff === 'hardcore');
    };
    this.newDiff = 'easy'; drawDiff();
    U.$('m-diff').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { this.newDiff = b.dataset.d; Sound.play('click'); drawDiff(); } });
    U.$('m-wname').addEventListener('keydown', (e) => { if (e.key === 'Enter') U.$('m-wnew').click(); });
    U.$('m-wlist').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || this.worldBusy) return;
      Sound.play('click');
      if (b.dataset.play) this.startWorld(b.dataset.play);
      if (b.dataset.del) {
        if (b.dataset.sure) { Worlds.remove(b.dataset.del); this.drawWorlds(); }
        else { b.dataset.sure = 1; b.textContent = 'Delete?'; }
      }
    });
    U.$('m-join').onclick = () => {
      readName();
      const code = U.$('m-code').value.trim().toUpperCase();
      if (code.length !== 5) { status.className = ''; status.textContent = 'Room codes are 5 letters.'; return; }
      busy(true);
      status.className = 'ok'; status.textContent = 'Looking for your friend\'s ship...';
      Net.joinGame(code, () => {
        status.textContent = 'Connected! Boarding...';
        Net.toHost({ t: 'hello', s: G.player.netState() });
        this.joinTimeout = setTimeout(() => { if (!G.started) { busy(false); status.className = ''; status.textContent = 'The host didn\'t answer. Try again?'; } }, 8000);
      }, (err) => { busy(false); status.className = ''; status.textContent = err; });
    };
    U.$('m-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') U.$('m-join').click(); });
    U.$('m-how').onclick = () => { Sound.init(); UI.showHow(); };
    U.$('m-keys').onclick = () => { Sound.init(); KeybindsUI.open(); };
  },

  /* ---------------- worlds ---------------- */
  pickWorld(mode) {
    Worlds.migrate();
    this.worldMode = mode;
    U.$('m-main').classList.add('hidden');
    U.$('m-worlds').classList.remove('hidden');
    U.$('m-wtag').textContent = mode === 'host' ? 'Pick the world your friends will join.' : 'Each world is its own adventure.';
    this.drawWorlds();
  },
  drawWorlds() {
    const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; };
    const l = Worlds.list().sort((a, b) => b.played - a.played);
    U.$('m-wlist').innerHTML = l.length ? l.map((w) => {
      const i = Worlds.info(w.id), pl = PLANETS[i.planet] || PLANETS[0];
      return `<div class="wslot"><div class="wico" style="background:${pl.sky[1]}">${Thumbs.img('planet:' + PLANETS.indexOf(pl), '', 'globe')}</div>
        <div class="winfo"><b>${U.esc(w.name)}<span class="dtag d-${Worlds.diff(w.id)}">${DIFFS[Worlds.diff(w.id)].name}</span></b><small>${pl.name} · ${i.beaten}/${PLANETS.length} bosses · ${U.bucks(i.bucks)} · ${ago(w.played)}</small></div>
        <button class="btn small green" data-play="${w.id}">Play</button><button class="btn small red" data-del="${w.id}" title="Delete world">${icon('trash')}</button></div>`;
    }).join('') : '<p class="wempty">No worlds yet. Make your first one below!</p>';
  },
  startWorld(id) {
    G.worldId = id;
    G.diff = Worlds.diff(id);
    Worlds.load(id);
    if (this.worldMode !== 'host') { this.enterGame(); return; }
    const tag = U.$('m-wtag');
    this.worldBusy = true;
    tag.textContent = 'Setting up your room...';
    Net.hostGame((code) => { this.enterGame(); UI.toast(`Room code: ${code}. Send it to your friends!`, 'good', 6); },
      (err) => { this.worldBusy = false; tag.textContent = err; });
  },

  enterGame(welcome) {
    if (G.started) return;
    // solo/host already loaded their world; guests keep their stuff per host world
    if (welcome) {
      G.worldId = welcome.world || null;
      G.diff = DIFFS[welcome.diff] ? welcome.diff : 'easy';
      if (welcome.world) loadSaveKey(Worlds.guestKey(welcome.world, G.name));
      else loadSave(G.name);
    }
    G.online = Net.online;
    G.isHost = Net.isHost;
    if (!Net.online) Net.myId = 'solo';
    let startPlanet = 0;
    if (welcome) {
      G.progress = welcome.prog || [];
      startPlanet = welcome.planet || 0;
      G.crew = welcome.crew || { summons: {}, heat: 0 };
      G.ff = !!welcome.ff;
    } else {
      G.progress = SAVE.beaten.slice();
      const sp = SAVE.planet || 0;
      startPlanet = sp < PLANETS.length && planetUnlocked(sp) ? sp : 0;
      // the crew's shared tasks live in the host's save
      G.crew = { summons: Object.assign({}, SAVE.summons), heat: SAVE.heat || 0 };
      G.ff = G.worldId ? Worlds.ff(G.worldId) : false;
    }
    this.loadPlanet(startPlanet);
    if (welcome) {
      Activities.applyTaken(startPlanet, welcome.taken);
      Activities.applyLoot(startPlanet, welcome.loot);
      for (const d of welcome.drops || []) Drops.add(d);
    }
    G.started = true;
    G.mode = 'planet';
    G.player.vm.visible = true;
    G.player.refill();
    G.player.slot = U.clamp(SAVE.hand | 0, 0, HOTBAR - 1); // (holding what you had out last time)
    G.player.refreshGear();
    G.player.resetLife();
    G.player.teleport(this.spawnPoint(), G.world.spawnYaw);
    G.player.updateCamera(0, 0);
    G.player.protect(GRACE.join);
    Drops.restoreGraves(); // (stuff you dropped when you died here last time is still waiting)
    Critters.restoreBodies(); // (and so are the critters you zapped and didn't pick up)
    U.$('menu').classList.add('hidden');
    U.$('hud').classList.remove('hidden');
    if (Net.online) {
      const rc = U.$('roomcode');
      rc.innerHTML = `ROOM <b>${Net.code}</b> ${Net.isHost ? '· captain' : ''}`;
      rc.classList.remove('hidden');
    }
    UI.hud();
    const badge = U.$('diffbadge');
    badge.textContent = DIFFS[G.diff].name.toUpperCase();
    badge.className = 'd-' + G.diff;
    if (DIFFS[G.diff].perma) setTimeout(() => UI.toast('HARDCORE: if you die, you die for good.', 'bad', 5), 3800);
    // a save from before the new planets: tell them what turned up
    if (SAVE.newPlanets) { SAVE.newPlanets = false; persist(); setTimeout(() => UI.toast('NEW: three planets turned up between Frostbyte and Zorblax Prime: Spookulon, Nimbus-9 and Gigopolis. Check the star map in your ship!', 'gold', 8), 4600); }
    Sound.init();
    Sound.setVolumes();
    Sound.playMusic(PLANETS[G.planet].music);
    if (!SAVE.seenIntro) {
      SAVE.seenIntro = true; persist();
      UI.openPanel(`<h2 class="ph">NEW DELIVERY ASSIGNMENT</h2>
        <div class="npc-line" data-who="FROM: DAVE, YOUR MANAGER">
          Deliver <b>1 large pepperoni pizza</b> to <b>Emperor Zorblax</b>, Zorblax Prime.<br>
          Order placed: <b>3 years ago</b>. Customer mood: <b>furious</b>.<br><br>
          Your ship, the S.S. Late Delivery, is mostly held together by tape. Each planet on the way has a boss guarding the route,
          because of course it does. Bosses don't just show up, though: find the thing that summons them and use it at the boss altar.<br><br>
          Company policy: no free guns (liability). You get a squirt pistol. Buy a real gun at the pawn shop.
          Do NOT gamble the company's money. (There's a casino planet. I know you.)
        </div>${UI.howHtml().replace('<h2 class="ph">How to play</h2>', '')}
        <div class="row2"><button class="btn big green" data-act="close" style="max-width:320px">Let's deliver this pizza</button></div>`);
    } else {
      this.updatePause();
      setTimeout(() => UI.bigTitle(PLANETS[G.planet].name, PLANETS[G.planet].blurb, '#fff', 3), 300);
    }
    // what to do here (once the intro note is out of the way)
    const guide = () => { if (G.panel) { setTimeout(guide, 500); return; } if (G.mode === 'planet') UI.guide(true, 16); };
    setTimeout(guide, 3400);
  },

  // how hard enemies hit in this world
  dmgMul() { return (DIFFS[G.diff] || DIFFS.easy).dmg; },
  // hardcore: you died, and that's it. Your save for this world is wiped.
  // wipe = the whole crew went down at once, so the world goes with them
  permaDeath(cause, wipe) {
    if (this.permaDead) return;
    this.permaDead = true;
    SAVE.stats.deaths++;
    const html = `<b>${U.esc(G.name)}</b> died for good${cause ? ` (${U.esc(cause)})` : ''}. Hardcore is hardcore.`;
    if (Net.online && !wipe) Net.relay({ t: 'ann', html, cls: 'bad' });
    // nothing gets saved from here on
    SAVE_KEY = null;
    try {
      if (Net.online && !Net.isHost) { if (G.worldId) localStorage.removeItem(Worlds.guestKey(G.worldId, G.name)); }
      else if (G.worldId) Worlds.remove(G.worldId);
    } catch (e) { /* storage off */ }
    Sound.play('death');
    Sound.stopMusic();
    const host = Net.online && Net.isHost, guest = Net.online && !Net.isHost;
    setTimeout(() => {
      Net.leave();
      if (document.pointerLockElement) document.exitPointerLock();
      UI.openPanel(`<div class="permadeath"><h2 class="ph center">${wipe ? 'CREW WIPED' : 'YOU DIED'}</h2>
        <p class="center psub">${wipe ? 'Everyone went down and nobody was left to revive anyone.' : (cause ? U.esc(cause) + ' got you.' : 'That was it.')} This is Hardcore, so it's permanent.</p>
        <p class="center">${wipe ? 'The world has been deleted.' : guest ? 'Your stuff in your friend\'s world is gone.' : 'Your world has been deleted.'}
        ${host && !wipe ? ' Your crew lost their captain.' : ''}</p>
        <p class="center muted">"Driver did not arrive. Pizza presumed cold." Dave has already hired your replacement.</p>
        <div class="center"><button class="btn big" data-act="menu" style="max-width:300px">Back to menu</button></div></div>`,
      (a) => { if (a === 'menu') location.reload(); }, null, () => location.reload());
    }, 1400);
  },

  lock() {
    if (!G.started || G.panel) return;
    Input.dx = Input.dy = 0;
    Input.mx = innerWidth / 2; Input.my = innerHeight / 2;
    // Keep the pause menu hidden during the asynchronous lock request.
    G.locked = true; this.updatePause();
    this.wantLock = true;
    // (while the browser makes up its mind there's no pause menu; no answer at all counts as a no)
    clearTimeout(this.lockT);
    this.lockT = setTimeout(() => this.lockFailed(), 1000);
    try {
      const p = G.renderer.domElement.requestPointerLock();
      if (p && p.catch) p.catch(() => this.lockFailed());
    } catch (e) { this.lockFailed(); }
    this.updatePause();
  },
  // the browser wouldn't grab the mouse. Right after you press Esc it won't without a click (Esc doesn't
  // count), so pressing Esc again to get back in would leave you stuck on the pause menu: instead you're
  // straight back in the game (the keys work, no pause menu), and your next click grabs the mouse. Until then
  // the mouse doesn't turn you: a loose cursor stuck at the edge of the screen would keep you spinning.
  // (A browser that never grabs the mouse at all: free-mouse look for good, see enableFallback.)
  lockFailed() {
    if (!this.wantLock || document.pointerLockElement) return;
    this.wantLock = false;
    clearTimeout(this.lockT);
    if (!this.everLocked) { this.enableFallback(); return; }
    if (!G.started || G.panel) return;
    this.setSoft(true);
    G.locked = true;
    this.updatePause();
    // (right after letting go of the mouse some browsers want a second before they'll grab it again: try once
    // more then, so you don't have to click)
    if (!this.relockTried) {
      this.relockTried = true;
      setTimeout(() => { if (this.soft && G.started && !G.panel && !G.chatting && !document.pointerLockElement) this.lock(); }, 1100);
    }
  },
  setSoft(on) {
    this.soft = !!on;
    document.body.classList.toggle('softlock', this.soft);
  },
  // Esc while playing without the mouse grabbed (free-mouse look, or waiting for a click): pause
  pause() {
    this.setSoft(false);
    G.locked = false;
    this.unlockedAt = performance.now();
    this.updatePause();
  },
  enableFallback() {
    if (!G.started || G.panel || this.everLocked) return; // lock works here, it was just a cooldown

    if (!this.fallback) UI.toast('Mouse lock isn\'t available in this browser: just move the mouse to look. Esc pauses.', '', 5);
    this.fallback = true;
    G.locked = true;
    this.updatePause();
  },
  setupPause() {
    const s = G.settings;
    const sens = U.$('s-sens'), vol = U.$('s-vol'), mus = U.$('s-mus'), q = U.$('s-q');
    sens.value = s.sens; vol.value = s.vol; mus.value = s.music; q.value = s.quality;
    q.addEventListener('change', () => { s.quality = q.value; lsSet('spacegoobers_settings', s); Post.apply(); });
    U.$('v-sens').textContent = Number(s.sens).toFixed(1);
    const save = () => {
      s.sens = Number(sens.value); s.vol = Number(vol.value); s.music = Number(mus.value);
      U.$('v-sens').textContent = s.sens.toFixed(1);
      lsSet('spacegoobers_settings', s);
      Sound.setVolumes();
    };
    [sens, vol, mus].forEach((e) => e.addEventListener('input', save));
    U.$('p-resume').onclick = () => this.lock();
    U.$('p-how').onclick = () => UI.showHow(true);
    U.$('p-keys').onclick = () => KeybindsUI.open(true);
    U.$('p-cust').onclick = () => Custom.open(true);
    U.$('p-leave').onclick = () => { persist(); Net.leave(); location.reload(); };
    U.$('s-ff').onclick = () => { Sound.play('click'); this.setFF(!G.ff); };
    // Esc on the pause menu: back to the game (the Esc that just paused it doesn't count). The mouse gets grabbed
    // when the key comes back UP: grabbed while Esc is still down, it was let go again straight away (letting go of
    // the mouse is what Esc does), which just brought the menu back
    addEventListener('keydown', (e) => {
      if (e.code !== 'Escape' || Keys.capturing || G.chatting || U.$('pause').classList.contains('hidden')) return;
      if (performance.now() - (this.unlockedAt || 0) < 350) return;
      e.preventDefault();
      Input.pressed.Escape = false; // (so this press doesn't pause it again, see keys)
      this.escResume = true;
    });
    addEventListener('keyup', (e) => {
      if (e.code !== 'Escape' || !this.escResume) return;
      this.escResume = false;
      if (!U.$('pause').classList.contains('hidden')) this.lock();
    });
  },
  updatePause() {
    const show = G.started && !G.locked && !G.panel && !G.chatting && !this.wantLock && !document.getElementById('ending');
    U.$('pause').classList.toggle('hidden', !show);
    U.$('pause-title').textContent = G.online ? 'MENU' : 'PAUSED';
    // friendly fire is the captain's call; everyone else can see how it's set
    U.$('v-ff').textContent = G.ff ? 'ON' : 'OFF';
    U.$('v-ff').className = G.ff ? 'on' : '';
    const ffb = U.$('s-ff');
    ffb.textContent = G.ff ? 'Turn off' : 'Turn on';
    ffb.classList.toggle('hidden', !Net.isHost);
    U.$('ff-note').textContent = Net.isHost ? (G.online ? 'Zaps hurt your crew (75% damage) when this is on.' : 'Only matters when friends join.') : 'The captain (host) decides.';
  },

  setupChat() {
    const inp = U.$('chatinput');
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const text = inp.value.trim().slice(0, 120);
        if (text) {
          UI.feed(`<b>${U.esc(G.name)}:</b> ${U.esc(text)}`);
          Net.relay({ t: 'chat', n: G.name, text });
          Sound.play('chat');
        }
        this.closeChat();
      } else if (e.key === 'Escape') this.closeChat();
    });
  },
  openChat() {
    G.chatting = true;
    UI.show('chat', true);
    const inp = U.$('chatinput');
    inp.value = '';
    setTimeout(() => inp.focus(), 0);
    Input.keys = {};
  },
  closeChat() {
    G.chatting = false;
    UI.show('chat', false);
    U.$('chatinput').blur();
    this.updatePause();
  },

  /* ---------------- boss fights ---------------- */
  startBoss() {
    if (!Net.isHost || G.mode !== 'planet') return;
    const ids = [Net.myId];
    for (const r of G.remotes.values()) if (r.s.m === 'planet' && r.s.p === G.planet) ids.push(r.id);
    const seed = Math.floor(Math.random() * 1e9);
    const b = PLANETS[G.planet].boss;
    Net.toAll({ t: 'bstart', b, seed, ids });
    this.beginBoss(b, seed, ids);
  },
  // this planet's arena (boss fights and duels), built the first time it's needed
  arena(i) {
    if (!this.arenas[i]) { const a = new Arena(i); G.scene.add(a.group); this.arenas[i] = a; }
    return this.arenas[i];
  },
  beginBoss(bossId, seed, ids) {
    if (G.panel) UI.closePanel(true);
    G.player.releaseTargets();
    Shots.clear(); FX.clear();
    G.mode = 'boss';
    G.world.clearSummon();
    G.world.group.visible = false;
    G.arena = this.arena(G.planet);
    G.arena.group.visible = true;
    setAtmosphere(PLANETS[G.planet]);
    const p = G.player;
    const idx = Math.max(0, ids.indexOf(Net.myId));
    p.teleport(G.arena.spawns[idx % G.arena.spawns.length], 0);
    p.resetLife(); // (even if you were lying dead on the planet: you're needed)
    p.inv = 3;
    p.refill();
    if (p.tool !== 'zap') p.takeOut('zap', true); // (a gun out, if there's one on your hotbar)
    G.boss = new BossFight(bossId, seed, ids);
    const def = BOSSES[bossId];
    UI.bossBar(true, def);
    UI.phud(true);
    UI.show('spectate', false);
    Sound.playMusic(bossId === 'zorblax' ? 'final' : 'boss');
    Sound.play('roar');
    UI.bigTitle(def.name, `${'★'.repeat(def.stars)} ${def.diff} · "${def.quote}"`, def.color, 3.6);
    this.lock();
  },
  /* ---------------- summoning ---------------- */
  // anyone holding the planet's summoning item can use it at the altar; the host runs the fight
  requestSummon(b) {
    if (!Summons.has(b)) return;
    UI.closePanel(true);
    Net.toHost({ t: 'summon', b });
  },
  // host
  onSummon(m, from) {
    const b = PLANETS[G.planet].boss, r = G.remotes.get(from), mine = from === Net.myId;
    const here = mine || (r && r.s.m === 'planet' && r.s.p === G.planet);
    if (G.mode !== 'planet' || this.summoning || m.b !== b || !here) {
      if (mine) UI.toast('Can\'t summon right now!', 'bad');
      else Net.sendTo(from, { t: 'summonno' });
      return;
    }
    this.summoning = true;
    this.summonAt = G.time + 2.6; // the fight starts once the boss has climbed out (see frame())
    Summons.take(b); // the crew's item is used up, win or lose
    const msg = { t: 'summoning', b, who: from, n: mine ? G.name : r.name };
    Net.toAll(msg);
    this.onSummoning(msg);
  },
  // everyone: the boss climbs out of the ground (anyone sitting in the parked ship hops out for it)
  onSummoning(m) {
    const s = SUMMONS[m.b], b = BOSSES[m.b];
    if (Flight.on && Flight.ph === 'atmo' && Flight.grounded) Flight.exit();
    if (G.mode !== 'planet') return;
    if (G.panel && !document.getElementById('ending')) UI.closePanel(true);
    G.world.summonFx(m.b);
    UI.bigTitle(`SUMMONING ${b.name.toUpperCase()}`, `${m.n} used ${s.name}! ${s.line}`, b.color, 2.8);
    UI.feed(`<b>${U.esc(m.n)}</b> used <b>${U.esc(s.name)}</b> at the altar!`, 'ann');
    Sound.play('summon');
    G.shake = Math.max(G.shake, 0.9);
    this.lock();
  },
  endBoss(final) {
    if (G.boss) { G.boss.dispose(); G.boss = null; }
    Shots.clear(); FX.clear();
    G.arena.group.visible = false;
    G.world.group.visible = true;
    G.mode = 'planet';
    const p = G.player;
    p.resetLife();
    p.teleport(this.spawnPoint(), G.world.spawnYaw);
    p.protect(GRACE.respawn);
    UI.bossBar(false); UI.phud(false); UI.show('spectate', false);
    setAtmosphere(PLANETS[G.planet]);
    Sound.playMusic(PLANETS[G.planet].music);
    if (Net.isHost) { SAVE.planet = G.planet; persist(); Net.toAll({ t: 'prog', prog: G.progress }); }
    UI.hud();
    if (final) setTimeout(showEnding, 400);
  },

  /* ---------------- networking glue ---------------- */
  applyState(id, s) {
    if (id === Net.myId || !s) return;
    let r = G.remotes.get(id);
    if (!r) {
      r = new RemotePlayer(id, s);
      G.remotes.set(id, r);
    }
    r.apply(s);
  },
  removeRemote(id) {
    const r = G.remotes.get(id);
    if (!r) return;
    UI.feed(`<b>${U.esc(r.name)}</b> left the crew.`, 'bad');
    r.dispose();
    G.remotes.delete(id);
    Flight.onLeave(id); // free up their seat in the ship
  },
  setupNet() {
    const N = Net;
    // --- host side
    N.on('hello', (m, from) => {
      if (!Net.isHost) return;
      this.applyState(from, m.s);
      Net.sendTo(from, {
        t: 'welcome', planet: G.planet, prog: G.progress, taken: Activities.takenList(G.planet), loot: Activities.lootList(G.planet), mode: G.mode, world: G.worldId, diff: G.diff,
        crew: G.crew, ff: G.ff, drops: Drops.snapshot(),
        snail: Casino.round && Casino.phase() === 'bet' ? { seed: Casino.round.seed, bet: Math.max(1, Casino.round.betEnd - G.time) } : null,
      });
      // the crew is already out in space: the new arrival gets a seat in the back
      const inFlight = Object.keys(Flight.crew).length && Flight.on && !(Flight.ph === 'atmo' && Flight.grounded);
      if (inFlight) { Flight.crew[from] = 'pass'; Flight.sendSeats(); }
      else Net.sendTo(from, { t: 'seats', c: Object.assign({}, Flight.crew) });
      const html = `<b>${U.esc(m.s.n)}</b> joined the crew!`;
      UI.feed(html, 'good'); Net.toAll({ t: 'ann', html, cls: 'good' }, from);
      Sound.play('chat');
    });
    N.on('st', (m, from) => { if (Net.isHost) this.applyState(from, m.s); });
    N.on('take', (m) => { if (Net.isHost) Activities.onTake(m); });
    N.on('snailreq', () => { if (Net.isHost) Casino.onRequest(); });
    N.on('hitc', (m, from) => { if (Net.isHost) Critters.damage(m.id, Math.min(400, Number(m.dmg) || 0), from, ['goo', 'ice', 'shock'].includes(m.fx) ? m.fx : null); });
    N.on('hitmb', (m, from) => { if (Net.isHost) MiniBoss.onHit(m, from); });
    N.on('summon', (m, from) => { if (Net.isHost) this.onSummon(m, from); });
    N.on('hitb', (m, from) => { if (Net.isHost && G.boss && G.boss.inFight(from)) G.boss.damage(Math.min(400, Number(m.dmg) || 0)); });
    N.on('hitm', (m) => { if (Net.isHost && G.boss) G.boss.damageMinion(m.id, Math.min(400, Number(m.dmg) || 0)); });
    N.on('pst', (m, from) => { if (G.boss && m.out) G.boss.out.add(from); });
    N.on('leave', (m) => this.removeRemote(m.id));
    N.on('revive', (m) => { if (m.to === Net.myId) G.player.revive(m.by); });
    N.on('rvp', (m) => { if (m.to === Net.myId && G.player.down) G.player.helped(m.by, m.p, m.x, m.z); });
    N.on('wipe', () => { if (!Net.isHost) this.permaDeath(null, true); });
    // the ship: who sits where (host), and the pilot asking to land
    N.on('board', (m, from) => { if (Net.isHost) Flight.onBoard(from, m.want); });
    N.on('unboard', (m, from) => { if (Net.isHost) Flight.onUnboard(from); });
    N.on('seat', (m, from) => { if (Net.isHost) Flight.onSeatReq(m, from); });
    N.on('landreq', (m, from) => { if (Net.isHost && Flight.crew[from] === 'pilot' && PLANETS[m.p]) this.arrive(m.p); });
    // crew tasks (summoning items, pizza warmth) and dropped items (host)
    N.on('task', (m) => { if (Net.isHost) Summons.onTask(m); });
    N.on('dropreq', (m) => { if (Net.isHost) Drops.onReq(m); });
    N.on('dropgrab', (m, from) => { if (Net.isHost) Drops.onGrab(m, from); });
    // --- client side
    N.on('welcome', (m) => { clearTimeout(this.joinTimeout); this.enterGame(m); if (m.snail) Casino.startRound(m.snail.seed, m.snail.bet); if (m.mode === 'boss') UI.toast('Your crew is in a boss fight! Hang tight here.', '', 5); });
    N.on('snap', (m) => {
      this.lastSnap = G.time;
      const seen = new Set();
      for (const id in m.p) { seen.add(id); this.applyState(id, m.p[id]); }
      for (const id of [...G.remotes.keys()]) if (!seen.has(id)) { G.remotes.get(id).dispose(); G.remotes.delete(id); }
    });
    N.on('seats', (m) => { if (G.started && !Net.isHost) Flight.onSeats(m); });
    N.on('fly', (m) => Flight.onSync(m));
    N.on('fev', (m) => Flight.onEvent(m));
    N.on('fph', (m) => Flight.onPhase(m));
    N.on('land', (m) => { if (G.started && !Net.isHost) this.doLand(m.p, m.taken, m.loot); });
    N.on('crew', (m) => { if (!Net.isHost) Summons.onCrew(m); });
    N.on('found', (m) => { if (!Net.isHost) Summons.onFound(m); });
    N.on('heat', (m) => { if (!Net.isHost) Summons.onHeat(m); });
    N.on('dropadd', (m) => { if (!Net.isHost) Drops.add(m); });
    N.on('droprem', (m) => { if (!Net.isHost) Drops.onRem(m); });
    N.on('cfg', (m) => {
      if (Net.isHost) return;
      if (!!m.ff !== G.ff) UI.toast(`The captain turned friendly fire ${m.ff ? 'ON. Careful where you point that thing.' : 'OFF.'}`, m.ff ? 'bad' : 'good', 3);
      G.ff = !!m.ff;
      this.updatePause();
    });
    N.on('prog', (m) => { G.progress = m.prog || []; UI.hud(); });
    N.on('summoning', (m) => { if (!Net.isHost) this.onSummoning(m); });
    N.on('summonno', () => UI.toast('Can\'t summon right now! Try again in a sec.', 'bad'));
    N.on('node', (m) => Activities.onNode(m));
    N.on('snail', (m) => Casino.startRound(m.seed, m.bet));
    N.on('met', (m) => { if (!Net.isHost) Meteors.spawn(m); });
    N.on('crit', (m) => Critters.onSnap(m));
    N.on('cdie', (m) => { if (!Net.isHost) Critters.onDie(m); });
    N.on('cpick', (m) => Critters.onPick(m));
    N.on('cspit', (m) => { if (!Net.isHost) Critters.onSpit(m); });
    N.on('mb', (m) => { if (!Net.isHost) MiniBoss.onSnap(m); });
    N.on('mbatk', (m) => { if (!Net.isHost) MiniBoss.onAtk(m); });
    N.on('mbdie', (m) => { if (!Net.isHost) MiniBoss.onDie(m); });
    N.on('bstart', (m) => {
      if (!G.started || G.mode !== 'planet') return;
      if (m.ids.includes(Net.myId)) this.beginBoss(m.b, m.seed, m.ids);
      else {
        G.world.clearSummon();
        UI.toast('Your crew is fighting the boss! Hang tight.', '', 5);
      }
    });
    N.on('bs', (m) => { if (G.boss && !Net.isHost) G.boss.onSync(m); });
    N.on('batk', (m) => { if (G.boss && !Net.isHost) G.boss.exec(m.a); });
    N.on('btaunt', (m) => { if (G.boss && !Net.isHost) G.boss.onTaunt(m.text); });
    N.on('bend', (m) => { if (G.boss && !Net.isHost) G.boss.finish(m.won); });
    N.on('hostgone', () => {
      if (this.permaDead) return;
      if (document.pointerLockElement) document.exitPointerLock();
      UI.openPanel(`<h2 class="ph">Lost the captain</h2><p class="psub">The host left the game (or their internet sneezed). Your bucks and gear are saved.</p>
        <div class="center"><button class="btn big" data-act="reload" style="max-width:300px">Back to menu</button></div>`, (a) => { if (a === 'reload') location.reload(); }, null, () => location.reload());
    });
    // --- everyone
    N.on('chat', (m) => { UI.feed(`<b>${U.esc(m.n)}:</b> ${U.esc(m.text)}`); Sound.play('chat'); });
    N.on('ann', (m) => UI.feed(m.html, m.cls || 'ann'));
    N.on('shoot', (m, from) => {
      const r = G.remotes.get(m.from || from);
      if (!r || !r.visible) return;
      Shots.remote(m, r);
      if (m.k !== 'stomp') r.anim.play('fire', m.k); // (and their goober gets kicked about by it)
    });
    N.on('nade', (m, from) => {
      const r = G.remotes.get(m.from || from);
      if (!r || !r.visible) return;
      Shots.fire('nade', new V3(...m.o), new V3(...m.d), false, {});
    });
    N.on('duel', (m) => Duel.onMsg(m));
    N.on('bonk', (m) => {
      const p = G.player;
      if (m.du) { Duel.onHit(m); return; } // (a duel: that's a real hit)
      // friendly fire is on: that actually hurt
      if (m.dmg && G.ff) {
        const fx = p.pos.x - (m.d[0] || 0), fz = p.pos.z - (m.d[1] || 0);
        if (G.mode === 'planet') p.hurtPlanet(m.dmg, fx, fz, `${m.by} (friendly fire)`, true);
        else if (G.mode === 'boss' && G.boss) G.boss.hurt(m.dmg, 'ff', true);
        UI.toast(`${m.by} shot you! (friendly fire, -${m.dmg})`, 'bad', 1.6);
        return;
      }
      if (G.mode !== 'planet') return;
      p.vel.x += (m.d[0] || 0) * 11; p.vel.z += (m.d[1] || 0) * 11; p.vel.y = 5.5; p.onGround = false;
      G.shake = Math.max(G.shake, 0.5);
      Sound.play('bonk');
      UI.toast(`${U.pick(LINES.bonk)} ${m.by} zapped you!`, 'purple', 1.6);
    });
    // a friend sent you money
    N.on('gift', (m) => {
      if (m.to !== Net.myId) return;
      const amt = Math.max(0, Math.floor(Number(m.amt) || 0));
      if (!amt) return;
      addBucks(amt);
      Sound.play('cash');
      UI.toast(`${m.by} sent you ${U.bucks(amt)}!`, 'good', 3);
    });
  },
  // send some of my money to a crewmate
  giveMoney(id, amt) {
    const r = G.remotes.get(id);
    amt = Math.floor(amt);
    if (!r || amt <= 0) return;
    if (amt > SAVE.bucks) { UI.toast('You don\'t have that much!', 'bad'); Sound.play('error'); return; }
    addBucks(-amt);
    Net.relay({ t: 'gift', to: id, amt, by: G.name });
    const html = `<b>${U.esc(G.name)}</b> sent <b>${U.esc(r.name)}</b> ${U.bucks(amt)}.`;
    UI.feed(html, 'good');
    Net.relay({ t: 'ann', html, cls: 'good' });
    Sound.play('cash');
  },
  // host: flip friendly fire for this world and tell everyone
  setFF(on) {
    if (!Net.isHost) return;
    G.ff = !!on;
    if (G.worldId) Worlds.setFF(G.worldId, G.ff);
    Net.toAll({ t: 'cfg', ff: G.ff });
    UI.toast(`Friendly fire ${G.ff ? 'ON: zaps hurt your crew now' : 'OFF: zaps just bonk'}`, G.ff ? 'bad' : 'good', 2.5);
    this.updatePause();
  },
  // hardcore with friends: if every single player is down at the same time, it's over for the world
  checkWipe(dt) {
    if (!Net.online || !Net.isHost || !DIFFS[G.diff].perma || this.permaDead || !G.remotes.size) { this.wipeT = 0; return; }
    const all = G.player.down && [...G.remotes.values()].every((r) => r.s.dn);
    this.wipeT = all ? (this.wipeT || 0) + dt : 0;
    if (this.wipeT < 1.2) return;
    Net.toAll({ t: 'wipe' });
    this.permaDeath(null, true);
  },
  netTick(dt) {
    if (!Net.online || !G.started) return;
    this.checkWipe(dt);
    // heartbeat: drop players (or the host) that went silent
    if (Net.isHost) {
      for (const r of [...G.remotes.values()]) {
        if (G.time - (r.seen || G.time) > 9) {
          const c = Net.conns.get(r.id);
          try { if (c) c.close(); } catch (e) { /* ignore */ }
          if (Net.conns.has(r.id)) Net.drop(r.id); else this.removeRemote(r.id);
        }
      }
    } else if (this.lastSnap && G.time - this.lastSnap > 12 && !this.hostGoneShown) {
      this.hostGoneShown = true;
      Net.emit({ t: 'hostgone' });
    }
    // safety net: if I somehow ended up on a different planet than the captain, catch up with them
    if (!Net.isHost && G.mode === 'planet' && Net.hostConn) {
      const h = G.remotes.get(Net.hostConn.peer);
      if (h && h.s.m === 'planet' && h.s.p !== G.planet && PLANETS[h.s.p]) {
        this.offT = (this.offT || 0) + dt;
        if (this.offT > 3) { this.offT = 0; this.doLand(h.s.p, null); UI.toast('Caught up with your crew!', '', 2.5); }
      } else this.offT = 0;
    }
    this.sendT -= dt;
    if (this.sendT > 0) return;
    this.sendT = 1 / 15;
    const s = G.player.netState();
    if (Net.isHost) {
      const p = { [Net.myId]: s };
      for (const r of G.remotes.values()) p[r.id] = r.s;
      Net.toAll({ t: 'snap', p });
    } else Net.toHost({ t: 'st', s });
  },

  /* ---------------- main loop ---------------- */
  // Browsers pause requestAnimationFrame in hidden tabs. A worker timer keeps
  // the simulation (and the host's boss AI / network) running when you alt-tab.
  startBackgroundTicker() {
    try {
      const src = 'setInterval(() => postMessage(0), 50);';
      const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      w.onmessage = () => {
        if (!document.hidden) return;
        const now = performance.now();
        if (now - (this.last || now) < 40) return;
        this.frame(now, true);
      };
    } catch (e) { /* worker not allowed here; fine */ }
  },
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    this.frame(now, false);
  },
  frame(now, hidden) {
    const dt = U.clamp((now - (this.last || now)) / 1000, 0, 0.05); // (never backwards: frame times from two clocks can disagree a hair)
    this.last = now;
    const cam = G.camera;
    const paused = !G.online && G.started && !G.locked && !G.panel && !G.chatting;
    if (!paused) {
      G.time += dt;
      this.keys();
      if (this.summoning && G.time >= this.summonAt) { this.summoning = false; this.startBoss(); }
      if (G.mode === 'menu') {
        const t = G.time * 0.05;
        cam.position.set(Math.cos(t) * 46, 20, Math.sin(t) * 46);
        cam.lookAt(0, 3, 0);
      } else if (G.mode === 'planet' || G.mode === 'boss' || G.mode === 'duel') G.player.update(dt);
      else if (G.mode === 'space') Flight.update(dt);
      if (G.mode !== 'planet' && G.mode !== 'boss' && G.mode !== 'duel' && G.player) G.player.hideBody(); // (you're in the ship, or at the menu)
      if (G.world && G.mode !== 'boss' && G.mode !== 'duel') G.world.update(dt, G.time);
      Duel.update(dt);
      if (G.boss) G.boss.update(dt);
      Activities.update(dt);
      if (G.started) { // (the host keeps critters going even while sitting in the parked ship)
        Critters.update(dt);
        MiniBoss.update(dt);
        Hazards.update(dt);
      }
      Meteors.update(dt);
      Casino.update(dt);
      Shots.update(dt);
      FX.update(dt);
      for (const r of G.remotes.values()) r.update(dt);
      this.netTick(dt);
      this.tickT -= dt;
      if (this.tickT <= 0 && G.panel && UI.panelTick) { this.tickT = 0.1; UI.panelTick(); }
      this.hintT -= dt;
      if (this.hintT <= 0 && G.started) { this.hintT = 0.25; this.updateHint(); }
      this.animHats(dt);
    } else this.netTick(dt);
    Sky.update(dt, cam);
    G.liquid.update(G.time, cam.position.x, cam.position.z);
    const f = G.mode === 'menu' ? new V3(0, 0, 0) : G.mode === 'space' ? Flight.pos : G.player.pos;
    G.sun.position.set(f.x + 30, f.y + 55, f.z + 18);
    G.sun.target.position.copy(f);
    Input.endFrame();
    if (!hidden) Post.render(cam, dt);
  },
  keys() {
    if (!G.started) return;
    if (G.panel && (Input.tap('Escape') || Input.hit('use') || (Flight.mapOpen && Input.hit('map'))) && !document.getElementById('ending')) { Input.pressed = {}; UI.closePanel(); return; }
    if (G.panel || G.chatting) return;
    if ((this.fallback || this.soft) && G.locked && Input.tap('Escape')) { this.pause(); return; }
    if (Input.hit('chat') || (Input.tap('Enter') && !Keys.bound('Enter'))) { this.openChat(); return; }
    if (Input.hit('bag') && G.mode === 'planet' && !G.player.dead) { UI.openBag(); return; }
    if (Input.hit('guide') && G.mode === 'planet') UI.guide(!UI.guideOn);
    if (G.mode !== 'planet' && UI.guideOn) UI.guide(false);
    if (Input.hit('music') && (G.mode !== 'space' || Keys.map.music !== Keys.map.map)) { // (in the ship M is the star map)
      if (Sound.music.on) { Sound.stopMusic(); UI.toast('Music off', '', 1); }
      else { Sound.playMusic(G.mode === 'boss' ? (G.boss && G.boss.id === 'zorblax' ? 'final' : 'boss') : PLANETS[G.planet].music); UI.toast('Music on', '', 1); }
    }
    UI.plist(Input.down('crew'));
  },
  // what shooting does with the gun you've got out (every gun works differently, see ZAPPERS)
  gunHint() {
    const z = gunDef(SAVE.zap);
    switch (z.type) {
      case 'squirt': return '{fire}: squirt (it\'s terrible: buy a real gun!) · {reload}: refill';
      case 'spread': return '{fire}: blast · hold {aim}: aim (tighter spread) · {reload}: reload';
      case 'lob': return '{fire}: lob goo (aim a bit high) · {reload}: reload';
      case 'jackpot': return '{fire}: shoot and pray · hold {aim}: aim · {reload}: reload';
      case 'beam': return 'Hold {fire}: freeze beam · {reload}: recharge';
      case 'cutter': return '{fire}: throw a pizza cutter (it comes back)';
      case 'homing': return '{fire}: ghost wisps (they chase things) · {reload}: reload';
      case 'chain': return '{fire}: chain lightning (it jumps between targets) · hold {aim}: aim · {reload}: reload';
      case 'rocket': return '{fire}: launch a parcel (shoot your feet to rocket-jump) · {reload}: reload';
      case 'sniper': return '{fire}: shoot · hold {aim}: look down the scope · {reload}: reload';
      default: return '{fire}: zap · hold {aim}: aim (dead on) · {reload}: reload';
    }
  },
  // "3: Laser Drill for the crystals" if it's on your hotbar ("the Laser Drill for the crystals (on your
  // hotbar: see any shop)" if it isn't)
  slotTip(tool, what) {
    const i = Loadout.findTool(tool);
    return i >= 0 ? `${Keys.name('slot' + (i + 1))}: ${what}` : `${what} (put it on your hotbar at a shop)`;
  },
  updateHint() {
    const p = G.player;
    let h = '';
    if (G.mode === 'duel') h = Duel.hint();
    else if (G.mode === 'boss') {
      if (p.ghost) h = '';
      else if (p.tool !== 'zap') h = Loadout.findTool('zap') >= 0 ? this.slotTip('zap', 'take out a gun!') : 'No gun on your hotbar! Dodge, and throw Goo Grenades ({nade})';
      else h = `${this.gunHint()} · {nade}: Goo Grenade (${SAVE.nades}) · {jump}: jump the rings!`;
      if (h && G.boss && G.boss.id === 'zorblax' && SAVE.peel) h += ' · ' + this.slotTip('peel', 'the Pizza Peel catches pizza!');
      const ex = G.boss && G.boss.exit; // (you won: the way home)
      if (ex && !p.ghost) h = `You won! Walk into the beam of light to go back to ${PLANETS[G.planet].name} (it takes you in ${Math.max(0, Math.ceil(ex.left))}s)`;
    } else if (G.mode === 'planet') {
      const act = PLANETS[G.planet].activity;
      const inCasino = act === 'casino' && G.world.inCasino(p.pos);
      if (p.tool === 'vac') h = VAC_HINT[act] || 'Hold {fire} on stuff to vacuum it up';
      else if (p.tool === 'drill') h = 'Hold {fire} on a big crystal to mine it';
      else if (p.tool === 'peel') h = act === 'meteor' ? 'Stand inside a glowing circle as the meteor comes down to catch it!' : 'The Pizza Peel catches meteors on Zorblax Prime';
      else if (!p.tool) h = `Your hands are empty (hotbar slot ${p.slot + 1}) · {slot1}-{slot5}: take something out`;
      else if (p.tool === 'crit') { const r = cargoRes(p.critEntry || ''); h = `Carrying a ${r.name} (${U.bucks(r.v)}): sell it at any shop · {bag}: put it in your backpack`; }
      else { // your gun: what it does, plus the one thing to know about this planet
        const tip = {
          scrap: this.slotTip('vac', 'Grabby Vac for the junk'), berry: 'jump up the mushrooms for berries' + (SAVE.boots ? ' (double jump!)' : ''),
          crystal: SAVE.drill ? this.slotTip('drill', 'Laser Drill for the crystals') : 'Penguin Pete sells a Laser Drill for the crystals',
          ghost: 'ghosts can\'t be shot: ' + this.slotTip('vac', 'VACUUM them'), pearl: 'stand in a glowing updraft to float up',
          deliver: 'take a delivery gig at the GigHub kiosk ({use})', meteor: SAVE.peel ? this.slotTip('peel', 'Pizza Peel for the meteors') : 'Dave sells a Pizza Peel for the meteors',
        }[act];
        h = act === 'casino' ? (inCasino ? 'Walk up to any game and press {use}' : 'Every game is in the casino next to your ship') : this.gunHint() + (tip ? ' · ' + tip : '');
      }
      if (act === 'deliver' && Gigs.cur) h = 'Get the parcel to the glowing beam before time runs out! Jump pads launch you onto roofs';
      h += ' · {guide}: what to do here';
    }
    UI.hint(h);
  },
  animHats(dt) {
    const doHat = (slot) => {
      const h = slot.children[0];
      if (!h) return;
      if (h.userData.spin) h.userData.spin.rotation.y += dt * 14;
      if (h.userData.bob) h.position.y = Math.sin(G.time * 3) * 0.04;
    };
    for (const r of G.remotes.values()) doHat(r.m.hatSlot);
    if (G.player && G.player.gb) doHat(G.player.gb.hatSlot);
  },
};

Game.boot().catch((e) => {
  console.error(e);
  U.$('loading-text').textContent = 'Something broke while loading: ' + e.message;
  Updates.failed(e.message);
});
