'use strict';
/* =========================================================
   SPACE GOOBERS — boot, menus, game loop, travel, net glue
   ========================================================= */
const COLORS = ['#ff7a3d', '#ff4b6e', '#3aa7ff', '#3fcf6a', '#ffd23f', '#9b5de5', '#2ad4c4', '#ff8ad8'];

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
    this.setupNet();
    addEventListener('resize', () => {
      G.camera.aspect = innerWidth / innerHeight;
      G.camera.updateProjectionMatrix();
      G.renderer.setSize(innerWidth, innerHeight);
      Post.resize();
      G.player.layoutVM();
    });
    document.addEventListener('pointerlockchange', () => {
      G.locked = document.pointerLockElement === G.renderer.domElement;
      if (G.locked) this.everLocked = true;
      this.updatePause();
    });
    // some browsers/embeds don't allow mouse lock: fall back to free-mouse look
    document.addEventListener('pointerlockerror', () => this.enableFallback());
    G.renderer.domElement.addEventListener('click', () => { if (G.started && !G.locked && !G.panel) this.lock(); });
    addEventListener('beforeunload', () => { Casino.cashOut(); persist(); Net.leave(); });
    U.$('loading').classList.add('hidden');
    U.$('menu').classList.remove('hidden');
    requestAnimationFrame((t) => this.loop(t));
    this.startBackgroundTicker();
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
  // host: fly everyone somewhere
  // everyone: climb into the ship's cockpit (see flight.js)
  launch(m) {
    if (G.panel) UI.closePanel(true);
    G.player.releaseTargets();
    if (G.player.down) { G.player.revive(null); UI.toast('Your crew dragged you onto the ship. The med bay patched you up.', 'good', 3); }
    Shots.clear();
    G.mode = 'space';
    Flight.start(m.from, m.wp);
    if (!Net.isHost) UI.toast('The captain is taking off. You\'re on board!', 'good', 3);
    this.lock();
  },
  // host: the ship is down on a landing pad; everybody hops out
  arrive(i) {
    if (!G.worlds[i]) { const w = new PlanetWorld(i); G.scene.add(w.group); w.group.visible = false; G.worlds[i] = w; }
    const m = { t: 'land', p: i, taken: Activities.takenList(i) };
    Net.toAll(m);
    this.doLand(i, m.taken);
    SAVE.planet = i;
    persist();
  },
  doLand(i, taken) {
    const moved = i !== G.planet;
    Flight.finish();
    Sound.play('land');
    this.loadPlanet(i);
    G.world.parked.visible = true;
    if (taken) Activities.applyTaken(i, taken);
    G.player.teleport(this.spawnPoint(), G.world.spawnYaw);
    G.mode = 'planet';
    UI.hud();
    Sound.playMusic(PLANETS[i].music);
    if (!moved) return;
    const pl = PLANETS[i];
    setTimeout(() => UI.bigTitle(pl.name, pl.blurb, '#fff', 3.4), 600);
    setTimeout(() => UI.toast(pl.how, '', 5), 2600);
    if (i === 2 && !SAVE.seenCasino) { SAVE.seenCasino = true; persist(); setTimeout(() => UI.toast('GAMBLING UNLOCKED. Please gamble responsibly. (You won\'t.)', 'purple', 5), 5200); }
  },

  /* ---------------- start / menus ---------------- */
  setupMenu() {
    const nameEl = U.$('m-name'), status = U.$('m-status');
    nameEl.value = lsGet('spacegoobers_name', '') || 'Goober' + U.randi(10, 99);
    G.color = lsGet('spacegoobers_color', null) || U.pick(COLORS);
    const sw = U.$('m-colors');
    const drawSw = () => { sw.innerHTML = COLORS.map((c) => `<div class="sw ${c === G.color ? 'sel' : ''}" data-c="${c}" style="background:${c}"></div>`).join(''); };
    drawSw();
    sw.addEventListener('click', (e) => { const c = e.target.dataset.c; if (c) { G.color = c; drawSw(); Sound.init(); Sound.play('click'); } });
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
      return `<div class="wslot"><div class="wico" style="background:${pl.sky[1]}">${icon('globe')}</div>
        <div class="winfo"><b>${U.esc(w.name)}<span class="dtag d-${Worlds.diff(w.id)}">${DIFFS[Worlds.diff(w.id)].name}</span></b><small>${pl.name} · ${i.beaten}/5 bosses · ${U.bucks(i.bucks)} · ${ago(w.played)}</small></div>
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
    } else {
      G.progress = SAVE.beaten.slice();
      const sp = SAVE.planet || 0;
      startPlanet = sp < PLANETS.length && planetUnlocked(sp) ? sp : 0;
    }
    this.loadPlanet(startPlanet);
    if (welcome) Activities.applyTaken(startPlanet, welcome.taken);
    G.started = true;
    G.mode = 'planet';
    G.player.vm.visible = true;
    G.player.refreshGear();
    G.player.setTool(hasTool('zap') ? 'zap' : 'vac', true);
    G.player.teleport(this.spawnPoint(), G.world.spawnYaw);
    G.player.updateCamera(0, 0);
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
          Company policy: no free guns (liability). Buy your own at the pawn shop.
          Do NOT gamble the company's money. (There's a casino planet. I know you.)
        </div>${UI.howHtml().replace('<h2 class="ph">How to play</h2>', '')}
        <div class="row2"><button class="btn big green" data-act="close" style="max-width:320px">Let's deliver this pizza</button></div>`);
    } else {
      this.updatePause();
      setTimeout(() => UI.bigTitle(PLANETS[G.planet].name, PLANETS[G.planet].blurb, '#fff', 3), 300);
    }
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
    if (this.fallback) { G.locked = true; this.updatePause(); return; }
    try {
      const p = G.renderer.domElement.requestPointerLock();
      if (p && p.catch) p.catch(() => this.enableFallback());
    } catch (e) { this.enableFallback(); }
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
    U.$('p-how').onclick = () => UI.showHow();
    U.$('p-leave').onclick = () => { persist(); Net.leave(); location.reload(); };
  },
  updatePause() {
    const show = G.started && !G.locked && !G.panel && !G.chatting && !document.getElementById('ending');
    U.$('pause').classList.toggle('hidden', !show);
    U.$('pause-title').textContent = G.online ? 'MENU' : 'PAUSED';
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
    for (const r of G.remotes.values()) if (r.s.m === 'planet' && r.s.p === G.planet && !(r.s.z < 0)) ids.push(r.id);
    const seed = Math.floor(Math.random() * 1e9);
    const b = PLANETS[G.planet].boss;
    Net.toAll({ t: 'bstart', b, seed, ids });
    this.beginBoss(b, seed, ids);
  },
  beginBoss(bossId, seed, ids) {
    if (G.panel) UI.closePanel(true);
    G.player.releaseTargets();
    Shots.clear(); FX.clear();
    G.mode = 'boss';
    G.world.clearSummon();
    G.world.group.visible = false;
    if (!this.arenas[G.planet]) { const a = new Arena(G.planet); G.scene.add(a.group); this.arenas[G.planet] = a; }
    G.arena = this.arenas[G.planet];
    G.arena.group.visible = true;
    setAtmosphere(PLANETS[G.planet]);
    const p = G.player;
    const idx = Math.max(0, ids.indexOf(Net.myId));
    p.teleport(G.arena.spawns[idx % G.arena.spawns.length], 0);
    if (p.down) p.revive(null);
    p.hp = 100; p.dead = false; p.ghost = false; p.inv = 3;
    p.refill();
    if (hasTool('zap')) p.setTool('zap', true);
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
    if (!Summons.has(b) || SAVE.zap < 0) return;
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
    const msg = { t: 'summoning', b, who: from, n: mine ? G.name : r.name };
    Net.toAll(msg);
    this.onSummoning(msg);
  },
  // everyone: the item gets used up and the boss climbs out of the ground
  onSummoning(m) {
    const s = SUMMONS[m.b], b = BOSSES[m.b];
    if (m.who === Net.myId) Summons.take(m.b);
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
    if (p.down) p.revive(null);
    p.hp = 100; p.dead = false; p.ghost = false; p.inv = 0;
    p.teleport(this.spawnPoint(), G.world.spawnYaw);
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
  },
  setupNet() {
    const N = Net;
    // --- host side
    N.on('hello', (m, from) => {
      if (!Net.isHost) return;
      this.applyState(from, m.s);
      Net.sendTo(from, {
        t: 'welcome', planet: G.planet, prog: G.progress, taken: Activities.takenList(G.planet), mode: G.mode, world: G.worldId, diff: G.diff,
        fl: G.mode === 'space' ? { from: Flight.planet, wp: Flight.wp } : null,
        snail: Casino.round && Casino.phase() === 'bet' ? { seed: Casino.round.seed, bet: Math.max(1, Casino.round.betEnd - G.time) } : null,
      });
      const html = `<b>${U.esc(m.s.n)}</b> joined the crew!`;
      UI.feed(html, 'good'); Net.toAll({ t: 'ann', html, cls: 'good' }, from);
      Sound.play('chat');
    });
    N.on('st', (m, from) => { if (Net.isHost) this.applyState(from, m.s); });
    N.on('take', (m) => { if (Net.isHost) Activities.onTake(m); });
    N.on('snailreq', () => { if (Net.isHost) Casino.onRequest(); });
    N.on('hitc', (m, from) => { if (Net.isHost) Critters.damage(m.id, Math.min(400, Number(m.dmg) || 0), from); });
    N.on('summon', (m, from) => { if (Net.isHost) this.onSummon(m, from); });
    N.on('hitb', (m, from) => { if (Net.isHost && G.boss && G.boss.inFight(from)) G.boss.damage(Math.min(400, Number(m.dmg) || 0)); });
    N.on('hitm', (m) => { if (Net.isHost && G.boss) G.boss.damageMinion(m.id, Math.min(400, Number(m.dmg) || 0)); });
    N.on('pst', (m, from) => { if (G.boss && m.out) G.boss.out.add(from); });
    N.on('leave', (m) => this.removeRemote(m.id));
    N.on('revive', (m) => { if (m.to === Net.myId) G.player.revive(m.by); });
    N.on('wipe', () => { if (!Net.isHost) this.permaDeath(null, true); });
    // --- client side
    N.on('welcome', (m) => { clearTimeout(this.joinTimeout); this.enterGame(m); if (m.fl) this.launch(m.fl); if (m.snail) Casino.startRound(m.snail.seed, m.snail.bet); if (m.mode === 'boss') UI.toast('Your crew is in a boss fight! Hang tight here.', '', 5); });
    N.on('snap', (m) => {
      this.lastSnap = G.time;
      const seen = new Set();
      for (const id in m.p) { seen.add(id); this.applyState(id, m.p[id]); }
      for (const id of [...G.remotes.keys()]) if (!seen.has(id)) { G.remotes.get(id).dispose(); G.remotes.delete(id); }
    });
    N.on('launch', (m) => { if (G.started && G.mode === 'planet') this.launch(m); });
    N.on('fly', (m) => Flight.onSync(m));
    N.on('fev', (m) => { if (!Net.isHost) Flight.onEvent(m); });
    N.on('fph', (m) => { if (!Net.isHost) Flight.onPhase(m); });
    N.on('land', (m) => { if (G.started) this.doLand(m.p, m.taken); });
    N.on('prog', (m) => { G.progress = m.prog || []; UI.hud(); });
    N.on('summoning', (m) => { if (!Net.isHost) this.onSummoning(m); });
    N.on('summonno', () => UI.toast('Can\'t summon right now! Try again in a sec.', 'bad'));
    N.on('node', (m) => Activities.onNode(m));
    N.on('snail', (m) => Casino.startRound(m.seed, m.bet));
    N.on('met', (m) => { if (!Net.isHost) Meteors.spawn(m); });
    N.on('crit', (m) => Critters.onSnap(m));
    N.on('cdie', (m) => { if (!Net.isHost) Critters.onDie(m); });
    N.on('bstart', (m) => {
      if (!G.started || G.mode !== 'planet') return;
      if (m.ids.includes(Net.myId)) this.beginBoss(m.b, m.seed, m.ids);
      else {
        G.world.clearSummon();
        UI.toast(SAVE.zap < 0 ? 'Your crew is fighting the boss! Buy a gun so you can join the next fight.' : 'Your crew is fighting the boss! Hang tight.', '', 5);
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
      Shots.fire('zap', new V3(...m.o), new V3(...m.d), false, { color: m.c });
    });
    N.on('nade', (m, from) => {
      const r = G.remotes.get(m.from || from);
      if (!r || !r.visible) return;
      Shots.fire('nade', new V3(...m.o), new V3(...m.d), false, {});
    });
    N.on('bonk', (m) => {
      if (G.mode !== 'planet') return;
      const p = G.player;
      p.vel.x += (m.d[0] || 0) * 11; p.vel.z += (m.d[1] || 0) * 11; p.vel.y = 5.5; p.onGround = false;
      G.shake = Math.max(G.shake, 0.5);
      Sound.play('bonk');
      UI.toast(`${U.pick(LINES.bonk)} ${m.by} zapped you!`, 'purple', 1.6);
    });
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
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
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
      } else if (G.mode === 'planet' || G.mode === 'boss') G.player.update(dt);
      else if (G.mode === 'space') Flight.update(dt);
      if (G.world && G.mode !== 'boss') G.world.update(dt, G.time);
      if (G.boss) G.boss.update(dt);
      Activities.update(dt);
      if (G.started && G.mode !== 'space') Critters.update(dt);
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
    if (G.panel && (Input.tap('Escape') || Input.tap('KeyE') || (Flight.mapOpen && Input.tap('KeyM'))) && !document.getElementById('ending')) { Input.pressed = {}; UI.closePanel(); return; }
    if (G.panel || G.chatting) return;
    if (this.fallback && G.locked && Input.tap('Escape')) { G.locked = false; this.updatePause(); return; }
    if (Input.tap('KeyT') || Input.tap('Enter')) { this.openChat(); return; }
    if (Input.tap('KeyM') && G.mode !== 'space') { // (M is the map while flying)
      if (Sound.music.on) { Sound.stopMusic(); UI.toast('Music off', '', 1); }
      else { Sound.playMusic(G.mode === 'boss' ? (G.boss && G.boss.id === 'zorblax' ? 'final' : 'boss') : PLANETS[G.planet].music); UI.toast('Music on', '', 1); }
    }
    UI.plist(!!Input.keys.Tab);
  },
  updateHint() {
    const p = G.player;
    let h = '';
    if (G.mode === 'boss') {
      if (p.ghost) h = '';
      else if (SAVE.zap < 0) h = `No gun! Right-click: Goo Grenade (${SAVE.nades}) · Space: jump the rings!`;
      else h = `Click: zap · R: reload · Right-click: Goo Grenade (${SAVE.nades}) · Space: jump the rings!`;
      if (h && G.boss && G.boss.id === 'zorblax' && SAVE.peel) h += ' · 4: Pizza Peel catches pizza!';
    } else if (G.mode === 'planet') {
      const act = PLANETS[G.planet].activity;
      if (p.tool === 'zap') h = act === 'casino' ? 'Luckstar: go gamble at the casino →' : 'Click: zap (try a friend) · R: reload · 2: Grabby Vac' + (SAVE.drill ? ' · 3: Drill' : '') + (SAVE.peel ? ' · 4: Peel' : '');
      else if (p.tool === 'vac') h = act === 'scrap' ? 'Hold click on glowing junk piles' : 'Hold click on junk (there isn\'t much here)';
      else if (p.tool === 'drill') h = 'Hold click on big crystals to mine them';
      else h = act === 'meteor' ? 'Stand inside the glowing landing circles to catch pepperoni meteors!' : 'The Pizza Peel catches meteors on Zorblax Prime';
      if (act === 'berry' && p.tool !== 'drill') h = 'Walk into berries to grab them · Jump up the mushrooms!' + (SAVE.boots ? ' (double jump!)' : '');
      if (act === 'meteor' && p.tool !== 'peel') h = SAVE.peel ? 'Pepperoni meteors! Press 4 for the Pizza Peel, then stand in the landing circles' : 'Pepperoni meteors! Buy a Pizza Peel from Dave to catch them. (Without it they bonk you.)';
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
  },
};

Game.boot().catch((e) => {
  console.error(e);
  U.$('loading-text').textContent = 'Something broke while loading: ' + e.message;
});
