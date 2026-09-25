'use strict';
/* =========================================================
   Planet shops (buy / sell / hats), galaxy map, boss panel
   ========================================================= */
const BOSS_REC = { gary: 0, blorb: 1, jerry: 2, snowdad: 3, zorblax: 4 };
// every shop sells the starter gun to anyone without one (e.g. a friend who joins on a later planet)
const STARTER_GUN = { kind: 'zap', lvl: 0, price: 200, desc: 'Starter gun for new hires. Infinite batteries. Tiny battery pack.' };

function planetUnlocked(i) { return i === 0 || G.progress.includes(PLANETS[i - 1].boss); }

const Shop = {
  tab: 'buy', cur: null, line: '',

  itemInfo(it) {
    // returns {name, desc, icon, chips[], owned, locked, lockMsg}
    const r = { name: it.name, desc: it.desc || '', icon: '📦', chips: [], owned: false, locked: false, lockMsg: '' };
    switch (it.kind) {
      case 'zap': {
        const z = ZAPPERS[it.lvl];
        r.name = z.name; r.icon = '🔫';
        r.chips = [`⚡ ${z.dmg} dmg`, `🔥 ${(1 / z.cd).toFixed(1)}/s`, `🔋 ${z.mag} shots`, `⏱ ${z.rl}s reload`];
        r.owned = SAVE.zap >= it.lvl;
        if (!r.owned && SAVE.zap < it.lvl - 1) { r.locked = true; r.lockMsg = `Needs ${ZAPPERS[it.lvl - 1].name}`; }
        break;
      }
      case 'cargo':
        r.icon = '🎒'; r.chips = [`🎒 ${CARGO[it.lvl]} slots`];
        r.owned = SAVE.cargoLvl >= it.lvl;
        if (!r.owned && SAVE.cargoLvl < it.lvl - 1) { r.locked = true; r.lockMsg = 'Needs the smaller one'; }
        break;
      case 'vac': r.icon = '🌀'; r.chips = [`📏 ${VAC[1].range}m reach`, `⚡ ${VAC[1].speed}x speed`]; r.owned = SAVE.vacLvl >= 1; break;
      case 'boots': r.icon = '👢'; r.chips = ['⤴ double jump']; r.owned = SAVE.boots; break;
      case 'drill': r.icon = '⛏️'; r.chips = ['🔧 tool 3', '💎 mines crystals']; r.owned = SAVE.drill; break;
      case 'peel': r.icon = '🍕'; r.chips = ['🔧 tool 4', '☄️ catches meteors']; r.owned = SAVE.peel; break;
      case 'socks': r.icon = '🧦'; r.chips = ['🧊 no slipping']; r.owned = SAVE.socks; break;
      case 'armor': r.icon = '🛡️'; r.chips = ['🛡️ -30% damage']; r.owned = SAVE.armor; break;
      case 'life': r.icon = '💖'; r.chips = ['❤️ 4 boss lives']; r.owned = SAVE.lifeIns; break;
      case 'charm': r.icon = '🦶'; r.chips = ['🍀 +0% luck']; r.owned = SAVE.charm; break;
      case 'nades': r.icon = '💣'; r.chips = [`💥 ${NADE_DMG} dmg`, `🎒 you have ${SAVE.nades}`]; break;
      case 'hat': r.name = HATS[it.id]; r.icon = HAT_ICONS[it.id] || '🎩'; r.desc = 'Cosmetic. Friends will see it. Friends will judge.'; r.chips = ['✨ cosmetic']; r.owned = SAVE.hats.includes(it.id); break;
      case 'summon': r.name = SUMMONS[it.b].name; r.icon = SUMMONS[it.b].icon; r.chips = [`⚠ summons ${BOSSES[it.b].name}`]; r.owned = Summons.has(it.b); break;
    }
    return r;
  },
  // pricier stuff gets a fancier frame
  tier(price) { return price >= 5000 ? 'legend' : price >= 1500 ? 'epic' : price >= 400 ? 'rare' : 'common'; },
  buy(it) {
    const info = this.itemInfo(it);
    if (info.owned || info.locked) return;
    if (SAVE.bucks < it.price) { UI.toast('Not enough bucks!', 'bad'); Sound.play('error'); this.line = 'NO MONEY, NO SERVICE. (That\'s the whole policy.)'; return; }
    addBucks(-it.price);
    Sound.play('buy');
    switch (it.kind) {
      case 'zap':
        SAVE.zap = it.lvl; G.player.refreshGear(); G.player.setTool('zap', true);
        if (it.lvl === 0) UI.toast('Your first gun! Press 1 to hold it, R to reload.', 'good', 3.5);
        break;
      case 'summon': SAVE.summons[it.b] = 1; UI.toast(`Take it to the ⚠ boss altar to summon ${BOSSES[it.b].name}!`, 'gold', 3.5); break;
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
    const items = SAVE.zap < 0 && !cfg.items.some((it) => it.kind === 'zap' && it.lvl === 0) ? [STARTER_GUN, ...cfg.items] : cfg.items;
    if (!G.panel) { this.line = U.pick(cfg.greet); this.tab = SAVE.cargo.length ? 'sell' : 'buy'; }
    if (tab) this.tab = tab;
    const cap = CARGO[SAVE.cargoLvl], value = Activities.cargoValue();
    const tabs = [['buy', '🛒', 'Buy'], ['sell', '💰', `Sell${SAVE.cargo.length ? ` (${SAVE.cargo.length})` : ''}`], ['hats', '🎩', 'Hats']]
      .map(([t, ic, lab]) => `<button class="stab ${this.tab === t ? 'on' : ''}" data-act="tab" data-t="${t}"><span>${ic}</span>${lab}</button>`).join('');
    let body = '';
    if (this.tab === 'buy') {
      body = '<div class="cards">' + items.map((it, i) => {
        const inf = this.itemInfo(it), poor = SAVE.bucks < it.price;
        const cls = inf.owned ? 'owned' : inf.locked ? 'locked' : poor ? 'poor' : '';
        const btn = inf.owned ? '<div class="badge ok">✔ OWNED</div>'
          : inf.locked ? `<div class="badge lock">🔒 ${U.esc(inf.lockMsg)}</div>`
          : `<button class="price" data-act="buy" data-i="${i}" ${poor ? 'disabled' : ''}>${poor ? '💸 ' : ''}${U.bucks(it.price)}</button>`;
        return `<div class="card2 ${this.tier(it.price)} ${cls}">
          <div class="ic">${inf.icon}</div>
          <div class="info"><h4>${U.esc(inf.name)}</h4><div class="chips">${inf.chips.map((c) => `<span>${U.esc(c)}</span>`).join('')}</div><p>${U.esc(inf.desc)}</p></div>
          ${btn}</div>`;
      }).join('') + '</div>';
    } else if (this.tab === 'sell') {
      const counts = {};
      for (const id of SAVE.cargo) counts[id] = (counts[id] || 0) + 1;
      const rows = Object.keys(counts).sort((a, b) => RES[b].v * counts[b] - RES[a].v * counts[a]).map((id) => {
        const r = RES[id];
        return `<div class="srow ${r.rare ? 'rare' : ''}"><div class="ic">${r.icon}</div>
          <div class="info"><b>${U.esc(r.name)}</b><small>${U.esc(r.desc)}</small></div>
          <div class="qty">x${counts[id]}</div><div class="each">${U.bucks(r.v)} each</div>
          <button class="price small" data-act="sell1" data-id="${id}">${U.bucks(r.v * counts[id])}</button></div>`;
      }).join('');
      body = SAVE.cargo.length
        ? `<div class="srows">${rows}</div><button class="sellall" data-act="sellall">💰 Sell everything · <b>${U.bucks(value)}</b></button>`
        : '<div class="empty"><div>🎒</div>Your backpack is empty.<br>Go vacuum, catch or zap something!</div>';
    } else {
      const hats = ['none', ...SAVE.hats.filter((h) => h !== 'none')];
      body = '<div class="cards hats">' + hats.map((h) => `<div class="card2 ${SAVE.hat === h ? 'owned' : ''}"><div class="ic">${HAT_ICONS[h] || '🎩'}</div>
        <div class="info"><h4>${U.esc(HATS[h])}</h4></div>
        ${SAVE.hat === h ? '<div class="badge ok">WEARING</div>' : `<button class="price" data-act="hat" data-h="${h}">Wear</button>`}</div>`).join('') + '</div>' +
        '<p class="tip">More hats come from shops, and from Mystery Crates on Luckstar.</p>';
    }
    const html = `<div class="shop2" style="--acc:${cfg.color}">
      <aside class="keeper">
        <div class="face">${cfg.face}</div>
        <div class="kname">${U.esc(cfg.npc)}</div>
        <div class="bubble">${U.esc(this.line)}</div>
        <div class="wallet"><small>YOUR BUCKS</small><b>${U.bucks(SAVE.bucks)}</b></div>
        <div class="bag"><small>BACKPACK ${SAVE.cargo.length}/${cap}${value ? ` · worth ${U.bucks(value)}` : ''}</small><div class="meter"><i style="width:${Math.min(100, (SAVE.cargo.length / cap) * 100)}%"></i></div></div>
      </aside>
      <section class="wares"><div class="stabs">${tabs}</div><div class="wbody">${body}</div></section>
    </div>`;
    const handler = (act, d) => {
      if (act === 'tab') { this.tab = d.t; }
      if (act === 'buy') this.buy(items[Number(d.i)]);
      if (act === 'sellall' || act === 'sell1') {
        const knots = shopId === 'zorb' && (act === 'sellall' ? SAVE.cargo.includes('knot') : d.id === 'knot');
        const v = act === 'sellall' ? Activities.sellAll() : Activities.sellType(d.id);
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
        <div class="muted">${unlocked ? U.esc(p.how) : '???'} · Boss: ${unlocked ? `${U.esc(b.name)} (summon with ${SUMMONS[p.boss].icon} ${U.esc(SUMMONS[p.boss].name)})` : '???'}</div></div>
        <div>${btn}</div></div>`;
    }).join('');
    UI.openPanel(`<h2 class="ph">🌌 Galaxy Map</h2>
      <p class="psub">S.S. Late Delivery · Pizza status: cold · ${Net.isHost ? 'You are the captain.' : 'Only the captain (host) can fly the ship.'}</p>${rows}`,
    (act, d) => {
      if (act === 'fly' && Net.isHost) { UI.closePanel(true); Game.travel(Number(d.i)); }
    });
  },

  /* ----- boss altar panel ----- */
  openBoss() {
    const p = PLANETS[G.planet], bid = p.boss, b = BOSSES[bid], sm = SUMMONS[bid];
    // everyone here with a gun joins the fight (same rule as Game.startBoss)
    const n = 1 + [...G.remotes.values()].filter((r) => r.s.m === 'planet' && r.s.p === G.planet && !(r.s.z < 0)).length;
    const hp = Math.round(b.hp * (1 + 0.65 * (n - 1)));
    const first = !SAVE.beaten.includes(bid);
    const reward = first ? b.reward : Math.round(b.reward * 0.5);
    const rec = BOSS_REC[bid];
    const noGun = SAVE.zap < 0, have = Summons.has(bid);
    const gun = noGun ? '<span class="pill" style="background:#ff8a80">No gun! The shop sells one</span>'
      : U.esc(ZAPPERS[SAVE.zap].name) + (SAVE.zap < rec ? ` <span class="pill" style="background:#ff8a80">Recommended: ${U.esc(ZAPPERS[rec].name)}</span>` : ' ✔');
    const btn = !have ? `<button class="btn big" disabled style="max-width:440px">${sm.icon} You need ${U.esc(sm.name)}</button>`
      : noGun ? '<button class="btn big" disabled style="max-width:440px">🔫 Buy a gun first!</button>'
      : `<button class="btn big red" data-act="summon" style="max-width:440px">${sm.icon} Use ${U.esc(sm.name)} to summon!</button>`;
    UI.openPanel(`
      <h2 class="ph">⚠ Boss Altar</h2>
      <div class="boss" style="margin-top:10px">
        <div class="ico" style="background:${b.color}">${b.icon}</div>
        <div><h4>${U.esc(b.name)}</h4><div class="stars">${'★'.repeat(b.stars)}${'☆'.repeat(5 - b.stars)} ${b.diff}</div><div class="q">"${U.esc(b.quote)}"</div></div>
        <div></div>
      </div>
      <div class="npc-line" data-who="TO SUMMON: ${U.esc(sm.name.toUpperCase())} ${sm.icon}">${have ? '✔ You have it! Use it here to summon the boss.' : '❌ ' + U.esc(Summons.howText(bid))}</div>
      <table class="list">
        <tr><td>Health</td><td class="r"><b>${hp.toLocaleString()}</b> ${n > 1 ? `(scaled for ${n} goobers)` : ''}</td></tr>
        <tr><td>Reward (each player)</td><td class="r"><b>${U.bucks(reward)}</b> ${first ? '' : '(rematch: half)'}</td></tr>
        <tr><td>Your zapper</td><td class="r">${gun}</td></tr>
        <tr><td>Lives</td><td class="r">${SAVE.lifeIns ? 4 : 3} ${SAVE.armor ? '· Company Armor 🛡️' : ''} · Grenades: ${SAVE.nades}</td></tr>
        <tr><td>Status</td><td class="r">${G.progress.includes(bid) ? '✅ Beaten (next planet unlocked)' : '❌ Not beaten yet'}</td></tr>
      </table>
      <p class="muted">Summoning uses up the item, win or lose, and pulls in everyone on the planet who has a gun. Dodge with WASD + Space (jump over the shockwave rings!). Red circles on the floor mean MOVE.</p>
      ${bid === 'zorblax' ? `<p class="muted">🍕 ${SAVE.peel ? 'Tip: hold out your Pizza Peel (4) to catch the Emperor\'s flying pizza slices.' : 'Rumor has it Dave\'s Pizza Peel can catch flying pizza.'}</p>` : ''}
      <div class="center">${btn}</div>`,
    (act) => { if (act === 'summon') Game.requestSummon(bid); });
  },
};
