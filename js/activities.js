'use strict';
/* =========================================================
   Planet activities: vacuuming junk, grabbing berries,
   drilling crystals, catching pepperoni meteors.
   Pickups are shared between players.
   ========================================================= */
const RESPAWN = { scrap: 30, berry: 35, bigberry: 45, crystal: 45 };

const Activities = {
  respawn: new Map(),   // host only: "planet:id" -> time it comes back
  fullT: 0,

  update(dt) {
    this.fullT -= dt;
    if (G.mode === 'planet' && G.world && G.player && !G.player.dead) {
      const p = G.player.pos, cap = CARGO[SAVE.cargoLvl];
      for (const n of G.world.nodes) {
        if (n.taken || (n.kind !== 'berry' && n.kind !== 'bigberry')) continue;
        const dx = n.x - p.x, dz = n.z - p.z, dy = n.y - p.y;
        if (dx * dx + dz * dz < 1.6 && dy > -1.2 && dy < 1.9) {
          if (SAVE.cargo.length >= cap) {
            if (this.fullT <= 0) { UI.toast(U.pick(LINES.cargoFull), 'bad', 1.6); this.fullT = 3; }
            continue;
          }
          this.collect(n);
        }
      }
    }
    if (Net.isHost) {
      for (const [key, t] of this.respawn) {
        if (G.time < t) continue;
        this.respawn.delete(key);
        const [pi, id] = key.split(':').map(Number);
        this.setNode(pi, id, false);
        Net.toAll({ t: 'node', p: pi, id, on: 1 });
      }
    }
    Drops.update(dt);
  },

  collect(n) {
    const cap = CARGO[SAVE.cargoLvl];
    const table = LOOT[n.kind];
    const count = n.kind === 'crystal' ? 2 : 1;
    const got = [];
    for (let i = 0; i < count && SAVE.cargo.length < cap; i++) {
      const id = U.weighted(table);
      SAVE.cargo.push(id);
      got.push(id);
      SAVE.stats.collected++;
    }
    this.setNode(G.planet, n.id, true);
    Net.toHost({ t: 'take', p: G.planet, id: n.id });
    const rare = this.showLoot(got);
    if (got.length) Summons.tryDrop(n.kind);
    Sound.play(rare ? 'rare' : n.kind === 'crystal' ? 'shatter' : n.kind === 'scrap' ? 'slurp' : 'pickup');
    const col = n.kind === 'crystal' ? '#9fe3ff' : n.kind === 'scrap' ? '#7dff8a' : '#c9b3ff';
    FX.burst(new V3(n.x, n.y + 0.8, n.z), col, n.kind === 'crystal' ? 16 : 8, 4);
    if (SAVE.cargo.length >= cap) UI.toast('Backpack full! Go sell stuff at the shop.', 'bad', 2.2);
    persist();
    UI.hud();
  },
  // pickup popups (and a crew-wide shout for rare stuff). Returns true if anything was rare.
  showLoot(ids) {
    let rare = false;
    for (const id of ids) {
      const r = cargoRes(id);
      UI.pickup(`+ ${r.name}  (${U.bucks(r.v)})`, r.rare ? '#ffd23f' : '#ffffff', Thumbs.cargoKey(id));
      if (r.rare) {
        rare = true;
        UI.toast(`RARE FIND! ${r.name}!`, 'gold', 3);
        UI.feed(`<b>${U.esc(G.name)}</b> found a <b>${U.esc(r.name)}</b>!`, 'ann');
        Net.relay({ t: 'ann', html: `<b>${U.esc(G.name)}</b> found a <b>${U.esc(r.name)}</b>!` });
      }
    }
    return rare;
  },

  setNode(pi, id, taken) {
    const w = G.worlds[pi];
    if (!w || !w.nodes[id]) return;
    const n = w.nodes[id];
    n.taken = taken;
    n.mesh.visible = !taken;
    if (!taken) { n.mesh.position.set(n.x, n.y, n.z); n.mesh.scale.setScalar(1); }
  },
  takenList(pi) {
    const w = G.worlds[pi];
    return w ? w.nodes.filter((n) => n.taken).map((n) => n.id) : [];
  },
  applyTaken(pi, list) {
    const w = G.worlds[pi];
    if (!w) return;
    const set = new Set(list || []);
    for (const n of w.nodes) this.setNode(pi, n.id, set.has(n.id));
  },

  // host handlers
  onTake(m) {
    const w = G.worlds[m.p];
    const n = w && w.nodes[m.id];
    if (!n) return;
    this.setNode(m.p, m.id, true);
    this.respawn.set(`${m.p}:${m.id}`, G.time + RESPAWN[n.kind]);
    Net.toAll({ t: 'node', p: m.p, id: m.id, on: 0 });
  },
  onNode(m) { this.setNode(m.p, m.id, !m.on); },

  cargoValue() { return SAVE.cargo.reduce((s, id) => s + cargoRes(id).v, 0); },
  // sell every one of one kind of thing
  sellType(id) {
    const n = SAVE.cargo.filter((x) => x === id).length;
    if (!n) return 0;
    SAVE.cargo = SAVE.cargo.filter((x) => x !== id);
    addBucks(cargoRes(id).v * n);
    Sound.play('cash');
    UI.hud();
    return cargoRes(id).v * n;
  },
  sellAll() {
    const v = this.cargoValue(), n = SAVE.cargo.length;
    if (!n) return 0;
    SAVE.cargo = [];
    addBucks(v);
    Sound.play('cash');
    UI.hud();
    return v;
  },
};

/* ---------------- Zorblax Prime: pepperoni meteor showers ----------------
   The host picks where meteors land (near whoever is on the planet) and tells
   everyone. Each player checks their own catch: be inside the landing circle with
   the Pizza Peel out when it lands. No peel = bonk. */
const METEOR_FALL = 2.6; // seconds from warning circle to impact
const METEOR_PLANET = PLANETS.findIndex((p) => p.activity === 'meteor');

const Meteors = {
  list: [], spawnT: 2,

  update(dt) {
    if (Net.isHost) this.hostSpawn(dt);
    const here = G.mode === 'planet' && G.planet === METEOR_PLANET;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const m = this.list[i];
      m.t += dt;
      const k = Math.min(1, m.t / METEOR_FALL), e = k * k; // speeds up as it falls
      m.mesh.position.set(U.lerp(m.from.x, m.x, e), U.lerp(m.from.y, m.y, e), U.lerp(m.from.z, m.z, e));
      m.mesh.userData.slice.rotation.y += dt * 9;
      for (const b of m.mesh.userData.fire.children) b.scale.setScalar(0.75 + Math.random() * 0.5);
      m.fill.scale.setScalar(Math.max(0.01, k));
      m.disc.material.opacity = 0.18 + 0.2 * k + (k > 0.7 ? 0.15 * Math.sin(m.t * 30) : 0);
      if (here) {
        m.trail -= dt;
        if (m.trail <= 0) { m.trail = 0.07; FX.burst(m.mesh.position, U.pick(['#ffb23e', '#ff6a1f', '#fff36b']), 1, 1.5); }
      }
      if (k >= 1) {
        this.list.splice(i, 1);
        this.remove(m);
        if (here) this.land(m);
      }
    }
  },

  // host: keep a shower going while anyone is walking around the planet
  hostSpawn(dt) {
    const w = G.worlds[METEOR_PLANET];
    if (!w) return;
    const on = [];
    if (G.started && G.mode === 'planet' && G.planet === METEOR_PLANET) on.push(G.player.pos);
    for (const r of G.remotes.values()) if (r.s.m === 'planet' && r.s.p === METEOR_PLANET) on.push(r.tpos);
    if (!on.length) return;
    this.spawnT -= dt;
    if (this.spawnT > 0 || this.list.length >= 3 + on.length * 2) return;
    this.spawnT = U.rand(1.3, 2.4) / Math.sqrt(on.length);
    const c = U.pick(on);
    for (let tries = 0; tries < 12; tries++) {
      const a = Math.random() * Math.PI * 2, d = U.rand(2.5, 12);
      const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
      if (!w.landable(x, z)) continue;
      const m = { t: 'met', x: U.r2(x), z: U.r2(z), big: Math.random() < 0.15 ? 1 : 0 };
      this.spawn(m);
      Net.toAll(m);
      return;
    }
  },

  spawn(m) {
    const w = G.worlds[METEOR_PLANET];
    if (!w) return;
    const big = !!m.big, r = big ? 2.4 : 1.7;
    // the warning circle floats just above the highest ground it covers
    let y = w.h(m.x, m.z);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; y = Math.max(y, w.h(m.x + Math.cos(a) * r, m.z + Math.sin(a) * r)); }
    const flat = (geo, color, opacity, lift) => {
      const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
      o.rotation.x = -Math.PI / 2; o.position.y = lift; o.renderOrder = 2;
      return o;
    };
    const tele = grp(null, m.x, y + 0.08, m.z);
    const disc = flat(new THREE.CircleGeometry(r, 28), '#ff2020', 0.2, 0);
    const fill = flat(new THREE.CircleGeometry(r, 28), '#ffb23e', 0.45, 0.01);
    fill.scale.setScalar(0.01);
    tele.add(disc, fill, flat(new THREE.RingGeometry(r * 0.9, r, 32), '#ffe066', 0.9, 0.02));
    const from = new V3(m.x + U.rand(-12, 12), y + 36, m.z + U.rand(-12, 12));
    const mesh = buildMeteor(big);
    mesh.position.copy(from);
    // point the flames back along the way it came
    mesh.quaternion.setFromUnitVectors(new V3(0, 1, 0), from.clone().sub(new V3(m.x, y, m.z)).normalize());
    w.dyn.add(tele, mesh); // part of the planet, so it hides with it
    this.list.push({ x: m.x, z: m.z, y, big, r, t: 0, trail: 0, from, mesh, tele, disc, fill });
  },

  remove(m) {
    for (const o of [m.mesh, m.tele]) { if (o.parent) o.parent.remove(o); disposeObj(o); }
  },

  land(m) {
    const p = G.player, pos = new V3(m.x, m.y + 0.3, m.z);
    const d = Math.hypot(p.pos.x - m.x, p.pos.z - m.z);
    FX.burst(pos, '#ff6a1f', m.big ? 18 : 10, 6);
    FX.ring(pos, '#ffb23e', m.r * 1.5);
    if (d < 18) { Sound.play(m.big ? 'boom' : 'splat'); G.shake = Math.max(G.shake, (m.big ? 0.5 : 0.25) * (1 - d / 18)); }
    if (p.dead || d > m.r || p.pos.y > m.y + 3) return;
    if (p.tool === 'peel') this.caught(m, pos);
    else this.bonked(m);
  },

  caught(m, pos) {
    const cap = CARGO[SAVE.cargoLvl];
    if (SAVE.cargo.length >= cap) { UI.toast('Backpack full! The pepperoni bounced off. Go sell stuff to Dave.', 'bad', 2.2); Sound.play('error'); return; }
    const got = [];
    for (let i = 0; i < (m.big ? 3 : 1) && SAVE.cargo.length < cap; i++) {
      const id = U.weighted(LOOT.meteor);
      SAVE.cargo.push(id);
      got.push(id);
      SAVE.stats.collected++;
    }
    const rare = Activities.showLoot(got);
    Summons.heatUp();
    FX.text(pos.clone().setY(pos.y + 1.6), U.pick(LINES.meteorCatch), '#ffd23f', 56);
    G.player.swing = 1;
    Sound.play(rare ? 'rare' : 'catch');
    if (SAVE.cargo.length >= cap) UI.toast('Backpack full! Go sell stuff to Dave.', 'bad', 2.2);
    persist();
    UI.hud();
  },

  bonked(m) {
    const p = G.player;
    const dx = p.pos.x - m.x, dz = p.pos.z - m.z, d = Math.hypot(dx, dz) || 1;
    p.vel.x += (dx / d) * 10; p.vel.z += (dz / d) * 10; p.vel.y = 6.5; p.onGround = false;
    G.shake = Math.max(G.shake, 0.8);
    Sound.play('bonk');
    UI.toast(U.pick(LINES.meteorBonk) + (SAVE.peel ? ' (Press 4 for the Pizza Peel!)' : ' Dave sells a Pizza Peel for catching these.'), 'purple', 2.4);
  },
};

/* ---------------- boss summoning items (shared by the whole crew) ----------------
   Bosses only show up when someone uses the planet's summoning item at the
   boss altar. You get it by doing the planet's thing: it drops from junk, big
   berries or crystals (guaranteed after a few tries), comes out of Luckstar's
   crates and shop, or (final boss) you earn it by reheating the pizza.
   These are CREW tasks: everyone's junk, berries, crystals and meteor catches
   count toward the same item, the host keeps score, and anyone can use it. */
const Summons = {
  has(b) { return (G.crew.summons[b] || 0) > 0; },
  hostHas(b) { return (SAVE.summons[b] || 0) > 0; },
  // host: the host's save holds the crew's progress; tell everyone the new state
  sync() {
    if (!Net.isHost) return;
    G.crew = { summons: Object.assign({}, SAVE.summons), heat: SAVE.heat || 0 };
    persist();
    Net.toAll({ t: 'crew', s: G.crew.summons, h: G.crew.heat });
    UI.hud();
  },
  onCrew(m) { G.crew = { summons: m.s || {}, heat: m.h || 0 }; UI.hud(); },
  // host: the crew got the item (found, bought, won or earned by somebody)
  give(b, who) {
    SAVE.summons[b] = 1;
    SAVE.pity[b] = 0;
    this.sync();
    const m = { t: 'found', b, n: who || G.name };
    Net.toAll(m);
    this.onFound(m);
  },
  onFound(m) {
    const s = SUMMONS[m.b];
    if (!s) return;
    UI.bigTitle(`${s.name}!`, `${m.n === G.name ? 'You' : m.n} got it for the crew. ${s.found}`, BOSSES[m.b].color, 3.4);
    UI.toast(`The crew has ${s.name}! Anyone can use it at the boss altar.`, 'gold', 4);
    UI.feed(`<b>${U.esc(m.n)}</b> got <b>${U.esc(s.name)}</b> for the crew! Boss fight incoming...`, 'ann');
    Sound.play('rare');
  },
  // host: summoning uses it up
  take(b) { if (!Net.isHost) return; SAVE.summons[b] = 0; this.sync(); },
  // a planet activity just paid out: maybe the summoning item was in there too (the host rolls)
  tryDrop(kind) { Net.toHost({ t: 'task', k: 'drop', kind, p: G.planet, n: G.name }); },
  // Zorblax Prime: every meteor anyone catches warms the crew's pizza up a bit
  heatUp() { Net.toHost({ t: 'task', k: 'heat', n: G.name }); },
  // bought from a shop or won from a crate
  earn(b) { Net.toHost({ t: 'task', k: 'give', b, n: G.name }); },
  // host: everybody's progress lands here
  onTask(m) {
    if (m.k === 'give') { if (SUMMONS[m.b] && !this.hostHas(m.b)) this.give(m.b, m.n); return; }
    if (m.k === 'drop') {
      const pl = PLANETS[m.p], b = pl && pl.boss, s = b && SUMMONS[b];
      if (!s || s.src !== m.kind || this.hostHas(b)) return;
      SAVE.pity[b] = (SAVE.pity[b] || 0) + 1;
      if (SAVE.pity[b] >= s.pity || Math.random() < s.chance) this.give(b, m.n);
      else persist();
      return;
    }
    if (m.k === 'heat') {
      const s = SUMMONS.zorblax;
      if (this.hostHas('zorblax')) return;
      SAVE.heat = (SAVE.heat || 0) + 1;
      if (SAVE.heat >= s.heat) { SAVE.heat = 0; this.give('zorblax', m.n); return; }
      this.sync();
      const msg = { t: 'heat', h: SAVE.heat, n: m.n };
      Net.toAll(msg);
      this.onHeat(msg);
    }
  },
  onHeat(m) { UI.toast(`${m.n === G.name ? 'You' : m.n} warmed up the pizza! (${m.h}/${SUMMONS.zorblax.heat}, everyone's catches count)`, 'gold', 2.2); },
  // the tool you still need before you can help, if any
  needs(b, short) {
    if (b === 'snowdad' && !SAVE.drill) return short ? ' (needs a Laser Drill)' : ' You\'ll need a Laser Drill from Penguin Pete.';
    if (b === 'zorblax' && !SAVE.peel) return short ? ' (needs a Pizza Peel)' : ' You\'ll need a Pizza Peel from Dave.';
    return '';
  },
  howText(b) {
    const s = SUMMONS[b];
    return s.how + (b === 'zorblax' ? ` (${G.crew.heat || 0}/${s.heat})` : '') + ' The whole crew works on this together.' + this.needs(b);
  },
  // the one-line objective under your money
  goal() {
    if (!G.started || G.mode !== 'planet') return { text: '' };
    const b = PLANETS[G.planet].boss, s = SUMMONS[b], boss = BOSSES[b];
    if (SAVE.zap < 0) return { text: `Buy your first gun from ${SHOPS[PLANETS[G.planet].shop].npc}` + (G.planet === 0 ? ' (vacuum junk and sell it)' : '') };
    if (this.has(b)) return { text: `The crew has ${s.name}. Use it at the boss altar`, ready: true };
    if (G.progress.includes(b)) {
      const next = PLANETS[G.planet + 1];
      return { text: next ? `${boss.name} beaten! Get in the ship and fly to ${next.name}` : 'Pizza delivered. The casino is still open.' };
    }
    const heat = b === 'zorblax' ? ` (crew: ${G.crew.heat || 0}/${s.heat})` : '';
    return { text: `Summon ${boss.name}: ${s.hint}${heat}${this.needs(b, true)}` };
  },
};

/* ---------------- things players drop on the ground ----------------
   Drop stuff from your backpack (press I) and it lands in front of you in a
   little crate. Anyone can walk over it to pick it up. The host keeps the list,
   so two people can't grab the same crate.
   When you die, everything but your vac lands in a grave where you fell. Only
   you can pick that one up, and it's in your save, so it waits for you (even if
   you quit and come back). Gear in a crate is written 'gear:zap:2', 'gear:drill',
   'gear:peel' or 'gear:nades:5'; everything else is a backpack entry. */
const DROP_LIFE = 600; // seconds before a crate on the ground disappears (graves never do)
const Drops = {
  list: new Map(), nextId: 1, grabT: 0, fullT: 0,
  // me: I died. Drop everything but the vac where I fell (returns the grave, or null if I had nothing).
  // With Extra Life Insurance you keep your gear, and only your backpack spills.
  graveDrop() {
    const items = [], insured = SAVE.lifeIns;
    if (!insured) {
      if (SAVE.zap >= 0) items.push('gear:zap:' + SAVE.zap);
      if (SAVE.drill) items.push('gear:drill');
      if (SAVE.peel) items.push('gear:peel');
      if (SAVE.nades > 0) items.push('gear:nades:' + SAVE.nades);
    }
    items.push(...SAVE.cargo);
    if (!items.length) return null;
    if (!insured) { SAVE.zap = -1; SAVE.drill = false; SAVE.peel = false; SAVE.nades = 0; }
    SAVE.cargo = [];
    const p = G.player.pos;
    const g = { gid: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), p: G.planet, x: U.r2(p.x), y: U.r2(p.y), z: U.r2(p.z), items };
    SAVE.graves = (SAVE.graves || []).concat(g);
    persist();
    this.sendGrave(g);
    return g;
  },
  sendGrave(g) { Net.toHost({ t: 'dropreq', items: g.items, x: g.x, y: g.y, z: g.z, p: g.p, n: G.name, grave: g.gid }); },
  // after landing (or coming back to the game): put my graves on this planet back where they were
  restoreGraves() { for (const g of SAVE.graves || []) if (g.p === G.planet) this.sendGrave(g); },
  mine(d) { return (SAVE.graves || []).some((g) => g.gid === d.grave); },
  // gear coming back out of a crate
  giveGear(e) {
    const [, k, n] = e.split(':');
    let name, pic;
    if (k === 'zap' && ZAPPERS[+n]) { SAVE.zap = Math.max(SAVE.zap, +n); name = ZAPPERS[+n].name; pic = 'zap:' + n; }
    else if (k === 'drill') { SAVE.drill = true; name = 'Laser Drill'; pic = 'drill'; }
    else if (k === 'peel') { SAVE.peel = true; name = 'Pizza Peel'; pic = 'peel'; }
    else if (k === 'nades') { SAVE.nades += +n || 0; name = `Goo Grenades x${n}`; pic = 'nade'; }
    if (name) UI.pickup('+ ' + name, '#7dff8a', pic);
  },
  // me: take these backpack entries out and drop them in front of me
  drop(entries) {
    const p = G.player;
    if (!entries.length || G.mode !== 'planet') return;
    const f = p.camDir(new V3()); f.y = 0;
    if (f.lengthSq() < 1e-6) f.set(0, 0, -1);
    f.normalize();
    const x = p.pos.x + f.x * 1.4, z = p.pos.z + f.z * 1.4;
    for (const e of entries) { const i = SAVE.cargo.indexOf(e); if (i >= 0) SAVE.cargo.splice(i, 1); }
    persist();
    UI.hud();
    Net.toHost({ t: 'dropreq', items: entries, x: U.r2(x), y: U.r2(p.pos.y), z: U.r2(z), p: G.planet, n: G.name });
    this.grabT = 1.5; // don't instantly pick your own drop back up
    Sound.play('throw');
  },
  // host: make it real and tell everyone
  onReq(m) {
    // a grave comes back whenever its owner does: never make two of the same one
    if (m.grave && [...this.list.values()].some((d) => d.grave === m.grave)) return;
    const d = { t: 'dropadd', id: this.nextId++, items: m.items, x: m.x, y: m.y, z: m.z, p: m.p, n: m.n, grave: m.grave || null };
    Net.toAll(d);
    this.add(d);
  },
  add(d) {
    const w = G.worlds[d.p];
    if (!w || this.list.has(d.id)) return;
    const mesh = d.grave ? buildGraveCrate(d.n || 'Somebody') : buildDropCrate(d.items.some((e) => cargoRes(e).rare));
    const y = w.ground(d.x, d.z, (d.y == null ? 50 : d.y) + 0.5);
    mesh.position.set(d.x, y, d.z);
    w.dyn.add(mesh);
    this.list.set(d.id, { id: d.id, items: d.items, x: d.x, y, z: d.z, p: d.p, n: d.n, grave: d.grave || null, mesh, t: 0, born: G.time });
    if (d.p === G.planet) FX.burst(new V3(d.x, y + 0.4, d.z), '#3df0ff', 6, 3);
  },
  remove(id) {
    const d = this.list.get(id);
    if (!d) return;
    if (d.mesh.parent) d.mesh.parent.remove(d.mesh);
    disposeObj(d.mesh);
    this.list.delete(id);
  },
  update(dt) {
    for (const d of this.list.values()) {
      d.t += dt;
      const b = d.mesh.userData.bob;
      b.position.y = (b.userData.y0 || 0.34) + Math.sin(d.t * 3) * 0.07;
      b.rotation.y += dt;
    }
    // host: old crates fade away (graves don't: that's somebody's stuff)
    if (Net.isHost) for (const d of [...this.list.values()]) if (!d.grave && G.time - d.born > DROP_LIFE) { const m = { t: 'droprem', id: d.id, to: null }; Net.toAll(m); this.onRem(m); }
    this.grabT -= dt; this.fullT -= dt;
    if (G.mode !== 'planet' || G.player.dead || this.grabT > 0) return;
    const p = G.player.pos;
    for (const d of this.list.values()) {
      if (d.p !== G.planet || d.pending) continue;
      if (Math.hypot(d.x - p.x, d.z - p.z) > (d.grave ? 1.6 : 1.3) || Math.abs(d.y - p.y) > 2) continue;
      if (d.grave) { if (!this.mine(d)) continue; } // only the one who died can take their stuff (and it always fits)
      else if (cargoFree() < d.items.length) {
        if (this.fullT <= 0) { this.fullT = 3; UI.toast(`No room in your backpack for ${d.items.length === 1 ? 'that' : 'those ' + d.items.length + ' things'}!`, 'bad', 1.8); }
        return;
      }
      d.pending = true;
      this.grabT = 0.4;
      Net.toHost({ t: 'dropgrab', id: d.id });
      return;
    }
  },
  // host: first come, first served
  onGrab(m, from) {
    const d = this.list.get(m.id);
    if (!d) return;
    const msg = { t: 'droprem', id: m.id, to: from, items: d.items, grave: d.grave };
    Net.toAll(msg);
    this.onRem(msg);
  },
  onRem(m) {
    const d = this.list.get(m.id);
    if (d) {
      if (d.p === G.planet) FX.burst(new V3(d.x, d.y + 0.5, d.z), '#3df0ff', 8, 3);
      this.remove(m.id);
    }
    if (m.to !== Net.myId || !m.items) return;
    const gear = m.items.filter((e) => e.startsWith('gear:')), loot = m.items.filter((e) => !e.startsWith('gear:'));
    if (m.grave) {
      // my own stuff: all of it comes back, even into a full backpack
      for (const e of loot) { SAVE.cargo.push(e); UI.pickup('+ ' + cargoRes(e).name, '#ffffff', Thumbs.cargoKey(e)); }
      SAVE.graves = (SAVE.graves || []).filter((g) => g.gid !== m.grave);
      UI.toast('You got your stuff back!', 'good', 2.5);
    } else {
      const got = loot.slice(0, Math.max(0, cargoFree()));
      for (const e of got) SAVE.cargo.push(e);
      Activities.showLoot(got);
    }
    for (const e of gear) this.giveGear(e);
    if (gear.length) G.player.refreshGear();
    Sound.play('pickup');
    persist();
    UI.hud();
  },
  // what a late joiner needs to see
  snapshot() { return [...this.list.values()].map((d) => ({ id: d.id, items: d.items, x: d.x, y: d.y, z: d.z, p: d.p, n: d.n, grave: d.grave })); },
};
