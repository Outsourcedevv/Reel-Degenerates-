'use strict';
/* =========================================================
   Planet activities: vacuuming junk, grabbing berries,
   drilling crystals. Pickups are shared between players.
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
    let rare = false;
    for (const id of got) {
      const r = RES[id];
      UI.pickup(`+ ${r.icon} ${r.name}  (${U.bucks(r.v)})`, r.rare ? '#ffd23f' : '#ffffff');
      if (r.rare) {
        rare = true;
        UI.toast(`RARE FIND! ${r.icon} ${r.name}!`, 'gold', 3);
        UI.feed(`🌟 <b>${U.esc(G.name)}</b> found a <b>${U.esc(r.name)}</b>!`, 'ann');
        Net.relay({ t: 'ann', html: `🌟 <b>${U.esc(G.name)}</b> found a <b>${U.esc(r.name)}</b>!` });
      }
    }
    Sound.play(rare ? 'rare' : n.kind === 'crystal' ? 'shatter' : n.kind === 'scrap' ? 'slurp' : 'pickup');
    const col = n.kind === 'crystal' ? '#9fe3ff' : n.kind === 'scrap' ? '#7dff8a' : '#c9b3ff';
    FX.burst(new V3(n.x, n.y + 0.8, n.z), col, n.kind === 'crystal' ? 16 : 8, 4);
    if (SAVE.cargo.length >= cap) UI.toast('Backpack full! Go sell stuff at the shop.', 'bad', 2.2);
    persist();
    UI.hud();
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
