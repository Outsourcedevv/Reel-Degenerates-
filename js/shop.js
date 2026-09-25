'use strict';
/* =========================================================
   Planet shops (buy / sell / hats), galaxy map, boss panel
   ========================================================= */
const BOSS_REC = { gary: 0, blorb: 1, jerry: 2, snowdad: 3, zorblax: 4 };

function planetUnlocked(i) { return i === 0 || G.progress.includes(PLANETS[i - 1].boss); }

const Shop = {
  tab: 'buy', cur: null, line: '',

  itemInfo(it) {
    // returns {name, desc, stats, owned, equipped, locked, lockMsg}
    const r = { name: it.name, desc: it.desc || '', stats: '', owned: false, locked: false, lockMsg: '' };
    switch (it.kind) {
      case 'zap': {
        const z = ZAPPERS[it.lvl];
        r.name = z.name;
        r.stats = `⚡ ${z.dmg} damage · ${(1 / z.cd).toFixed(1)} shots/sec`;
        r.owned = SAVE.zap >= it.lvl;
        if (!r.owned && SAVE.zap < it.lvl - 1) { r.locked = true; r.lockMsg = `Needs ${ZAPPERS[it.lvl - 1].name} first`; }
        break;
      }
      case 'cargo':
        r.stats = `🎒 Holds ${CARGO[it.lvl]} items`;
        r.owned = SAVE.cargoLvl >= it.lvl;
        if (!r.owned && SAVE.cargoLvl < it.lvl - 1) { r.locked = true; r.lockMsg = 'Needs the smaller backpack first'; }
        break;
      case 'vac': r.stats = `Range ${VAC[1].range}m · ${VAC[1].speed}x speed`; r.owned = SAVE.vacLvl >= 1; break;
      case 'boots': r.stats = 'Press Space in the air to jump again'; r.owned = SAVE.boots; break;
      case 'drill': r.stats = 'Tool 3 · hold click on crystals'; r.owned = SAVE.drill; break;
      case 'peel': r.stats = 'Tool 4 · catches meteors (and flying pizza)'; r.owned = SAVE.peel; break;
      case 'socks': r.stats = 'Normal grip on ice'; r.owned = SAVE.socks; break;
      case 'armor': r.stats = '-30% damage taken'; r.owned = SAVE.armor; break;
      case 'life': r.stats = '4 lives per boss fight instead of 3'; r.owned = SAVE.lifeIns; break;
      case 'charm': r.stats = '+0% luck'; r.owned = SAVE.charm; break;
      case 'nades': r.stats = `You have ${SAVE.nades}. ${NADE_DMG} damage each, big splash`; break;
      case 'hat': r.name = HATS[it.id]; r.desc = 'Cosmetic. Friends will see it. Friends will judge.'; r.owned = SAVE.hats.includes(it.id); break;
    }
    return r;
  },
  buy(it) {
    const info = this.itemInfo(it);
    if (info.owned || info.locked) return;
    if (SAVE.bucks < it.price) { UI.toast('Not enough bucks!', 'bad'); Sound.play('error'); this.line = 'NO MONEY, NO SERVICE. (That\'s the whole policy.)'; return; }
    addBucks(-it.price);
    Sound.play('buy');
    switch (it.kind) {
      case 'zap': SAVE.zap = it.lvl; G.player.refreshGear(); G.player.setTool('zap', true); break;
      case 'cargo': SAVE.cargoLvl = it.lvl; break;
      case 'vac': SAVE.vacLvl = 1; break;
      case 'boots': SAVE.boots = true; UI.toast('Double jump unlocked! Press Space twice.', 'good', 3); break;
      case 'drill': SAVE.drill = true; G.player.refreshGear(); G.player.setTool('drill', true); UI.toast('Laser Drill equipped! (Press 3)', 'good', 3); break;
      case 'peel': SAVE.peel = true; G.player.refreshGear(); G.player.setTool('peel', true); UI.toast('Pizza Peel equipped! (Press 4) Stand in the landing circles!', 'good', 3); break;
      case 'socks': SAVE.socks = true; break;
      case 'armor': SAVE.armor = true; break;
      case 'life': SAVE.lifeIns = true; break;
      case 'charm': SAVE.charm = true; UI.toast('You feel lucky. (You are not.)', '', 2.5); break;
      case 'nades': SAVE.nades += 5; break;
      case 'hat': SAVE.hats.push(it.id); SAVE.hat = it.id; break;
    }
    this.line = 'Pleasure doing business. No refunds.';
    persist();
    UI.hud();
  },

  open(shopId, tab) {
    this.cur = shopId;
    const cfg = SHOPS[shopId];
    if (!G.panel) { this.line = U.pick(cfg.greet); this.tab = SAVE.cargo.length ? 'sell' : 'buy'; }
    if (tab) this.tab = tab;
    const tabs = ['buy', 'sell', 'hats'].map((t) => `<button class="btn small ${this.tab === t ? 'sel' : ''}" data-act="tab" data-t="${t}">${{ buy: '🛒 Buy', sell: `💰 Sell (${SAVE.cargo.length})`, hats: '🎩 Hats' }[t]}</button>`).join('');
    let body = '';
    if (this.tab === 'buy') {
      body = '<div class="grid">' + cfg.items.map((it, i) => {
        const inf = this.itemInfo(it);
        const cls = inf.owned ? 'owned' : inf.locked ? 'locked' : '';
        const btn = inf.owned ? '<button class="btn small" disabled>✔ Owned</button>'
          : inf.locked ? `<button class="btn small" disabled>🔒 ${U.esc(inf.lockMsg)}</button>`
          : `<button class="btn small green" data-act="buy" data-i="${i}" ${SAVE.bucks < it.price ? 'disabled' : ''}>Buy ${U.bucks(it.price)}</button>`;
        return `<div class="item ${cls}"><h4>${U.esc(inf.name)}</h4><div class="stats">${inf.stats}</div><div class="desc">${U.esc(inf.desc)}</div>${btn}</div>`;
      }).join('') + '</div>';
    } else if (this.tab === 'sell') {
      const counts = {};
      for (const id of SAVE.cargo) counts[id] = (counts[id] || 0) + 1;
      const rows = Object.keys(counts).sort((a, b) => RES[b].v - RES[a].v).map((id) => {
        const r = RES[id];
        return `<tr><td>${r.icon} ${U.esc(r.name)}<div class="muted">${U.esc(r.desc)}</div></td><td class="r">x${counts[id]}</td><td class="r">${U.bucks(r.v)}</td><td class="r"><b>${U.bucks(r.v * counts[id])}</b></td></tr>`;
      }).join('');
      body = SAVE.cargo.length
        ? `<table class="list"><tr><th>Item</th><th class="r">Qty</th><th class="r">Each</th><th class="r">Total</th></tr>${rows}</table>
           <div class="center" style="margin-top:14px"><button class="btn big green" data-act="sellall" style="max-width:340px">💰 Sell everything for ${U.bucks(Activities.cargoValue())}</button></div>`
        : '<p class="center" style="font-size:18px;margin:30px 0">Your backpack is empty. Go collect stuff!</p>';
    } else {
      const hats = ['none', ...SAVE.hats.filter((h) => h !== 'none')];
      body = '<div class="grid">' + hats.map((h) => `<div class="item ${SAVE.hat === h ? 'equipped' : ''}"><h4>${U.esc(HATS[h])}</h4>
        ${SAVE.hat === h ? '<button class="btn small" disabled>Wearing</button>' : `<button class="btn small" data-act="hat" data-h="${h}">Wear</button>`}</div>`).join('') + '</div>' +
        '<p class="center muted">Get more hats from shops, and from Mystery Crates on Luckstar.</p>';
    }
    const html = `<h2 class="ph">${U.esc(cfg.npc)}</h2>
      <p class="psub">Your bucks: <b>${U.bucks(SAVE.bucks)}</b> · Backpack: ${SAVE.cargo.length}/${CARGO[SAVE.cargoLvl]}</p>
      <div class="npc-line" data-who="${U.esc(cfg.npc.toUpperCase())}">${U.esc(this.line)}</div>
      <div class="tabs">${tabs}</div>${body}`;
    const handler = (act, d) => {
      if (act === 'tab') { this.tab = d.t; }
      if (act === 'buy') this.buy(cfg.items[Number(d.i)]);
      if (act === 'sellall') {
        const knots = shopId === 'zorb' && SAVE.cargo.includes('knot');
        const v = Activities.sellAll();
        this.line = v >= 1000 ? 'WOW. That\'s a lot of stuff. Are you okay?' : v >= 200 ? 'Nice haul. Pleasure doing business.' : 'That\'s... it? Okay.';
        if (knots) this.line = 'Are those GARLIC KNOTS? The Emperor has wanted those for three years! ...I\'ll keep them. For quality control.';
        UI.toast(`Sold for ${U.bucks(v)}!`, 'good');
      }
      if (act === 'hat') { SAVE.hat = d.h; persist(); Sound.play('buy'); }
      this.open(shopId);
    };
    if (G.panel) { UI.setPanel(html); UI.panelHandler = handler; }
    else UI.openPanel(html, handler);
  },

  /* ----- galaxy map ----- */
  openGalaxy() {
    const rows = PLANETS.map((p, i) => {
      const unlocked = planetUnlocked(i), here = i === G.planet, b = BOSSES[p.boss];
      const beaten = G.progress.includes(p.boss);
      let btn;
      if (here) btn = '<button class="btn small" disabled>📍 You are here</button>';
      else if (!unlocked) btn = `<button class="btn small" disabled>🔒 Beat ${U.esc(BOSSES[PLANETS[i - 1].boss].name)}</button>`;
      else if (!Net.isHost) btn = '<button class="btn small" disabled>Captain flies</button>';
      else btn = `<button class="btn small blue" data-act="fly" data-i="${i}">🚀 Fly here</button>`;
      return `<div class="boss ${unlocked ? '' : 'locked'} ${beaten ? 'beaten' : ''}">
        <div class="ico" style="background:${p.sky[1]}">${p.icon}</div>
        <div><h4>${i + 1}. ${U.esc(p.name)} ${beaten ? '✅' : ''}</h4><div class="q">${U.esc(p.blurb)}</div>
        <div class="muted">${unlocked ? U.esc(p.how) : '???'} · Boss: ${unlocked ? U.esc(b.name) : '???'}</div></div>
        <div>${btn}</div></div>`;
    }).join('');
    UI.openPanel(`<h2 class="ph">🌌 Galaxy Map</h2>
      <p class="psub">S.S. Late Delivery · Pizza status: cold · ${Net.isHost ? 'You are the captain.' : 'Only the captain (host) can fly the ship.'}</p>${rows}`,
    (act, d) => {
      if (act === 'fly' && Net.isHost) { UI.closePanel(true); Game.travel(Number(d.i)); }
    });
  },

  /* ----- boss panel ----- */
  openBoss() {
    const p = PLANETS[G.planet], b = BOSSES[p.boss];
    const n = 1 + (G.online ? G.remotes.size : 0);
    const hp = Math.round(b.hp * (1 + 0.65 * (n - 1)));
    const first = !SAVE.beaten.includes(p.boss);
    const reward = first ? b.reward : Math.round(b.reward * 0.5);
    const rec = BOSS_REC[p.boss];
    const weak = SAVE.zap < rec;
    UI.openPanel(`
      <h2 class="ph">⚠ Boss Fight</h2>
      <div class="boss" style="margin-top:10px">
        <div class="ico" style="background:${b.color}">${b.icon}</div>
        <div><h4>${U.esc(b.name)}</h4><div class="stars">${'★'.repeat(b.stars)}${'☆'.repeat(5 - b.stars)} ${b.diff}</div><div class="q">"${U.esc(b.quote)}"</div></div>
        <div></div>
      </div>
      <table class="list">
        <tr><td>Health</td><td class="r"><b>${hp.toLocaleString()}</b> ${n > 1 ? `(scaled for ${n} goobers)` : ''}</td></tr>
        <tr><td>Reward (each player)</td><td class="r"><b>${U.bucks(reward)}</b> ${first ? '' : '(repeat fight: half)'}</td></tr>
        <tr><td>Your zapper</td><td class="r">${U.esc(ZAPPERS[SAVE.zap].name)} ${weak ? `<span class="pill" style="background:#ff8a80">Recommended: ${U.esc(ZAPPERS[rec].name)}</span>` : '✔'}</td></tr>
        <tr><td>Lives</td><td class="r">${SAVE.lifeIns ? 4 : 3} ${SAVE.armor ? '· Company Armor 🛡️' : ''} · Grenades: ${SAVE.nades}</td></tr>
        <tr><td>Status</td><td class="r">${G.progress.includes(p.boss) ? '✅ Beaten (next planet unlocked)' : '❌ Not beaten yet'}</td></tr>
      </table>
      <p class="muted">Dodge with WASD + Space (jump over the shockwave rings!). Red circles on the floor mean MOVE. Everyone in the crew gets pulled in.</p>
      ${p.boss === 'zorblax' ? `<p class="muted">🍕 ${SAVE.peel ? 'Tip: hold out your Pizza Peel (4) to catch the Emperor\'s flying pizza slices.' : 'Rumor has it Dave\'s Pizza Peel can catch flying pizza.'}</p>` : ''}
      <div class="center">${Net.isHost ? '<button class="btn big red" data-act="fight" style="max-width:320px">⚔ START FIGHT</button>' : '<button class="btn big" disabled style="max-width:360px">Waiting for the captain (host) to start</button>'}</div>`,
    (act) => {
      if (act === 'fight' && Net.isHost) { UI.closePanel(); Game.startBoss(); }
    });
  },
};
