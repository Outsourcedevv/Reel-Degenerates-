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
      const r = RES[id];
      UI.pickup(`+ ${r.icon} ${r.name}  (${U.bucks(r.v)})`, r.rare ? '#ffd23f' : '#ffffff');
      if (r.rare) {
        rare = true;
        UI.toast(`RARE FIND! ${r.icon} ${r.name}!`, 'gold', 3);
        UI.feed(`🌟 <b>${U.esc(G.name)}</b> found a <b>${U.esc(r.name)}</b>!`, 'ann');
        Net.relay({ t: 'ann', html: `🌟 <b>${U.esc(G.name)}</b> found a <b>${U.esc(r.name)}</b>!` });
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

  cargoValue() { return SAVE.cargo.reduce((s, id) => s + RES[id].v, 0); },
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
