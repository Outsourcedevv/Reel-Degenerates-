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
    const r = { name: it.name, desc: it.desc || '', icon: 'box', chips: [], owned: false, locked: false, lockMsg: '' };
    switch (it.kind) {
      case 'zap': {
        const z = ZAPPERS[it.lvl];
        r.name = z.name; r.icon = 'gun';
        r.chips = [`${z.dmg} DMG`, `${(1 / z.cd).toFixed(1)} / SEC`, `${z.mag} MAG`, `${z.rl}s RELOAD`];
        r.owned = SAVE.zap >= it.lvl;
        if (!r.owned && SAVE.zap < it.lvl - 1) { r.locked = true; r.lockMsg = `Needs ${ZAPPERS[it.lvl - 1].name}`; }
        break;
      }
      case 'cargo':
        r.icon = 'bag'; r.chips = [`${CARGO[it.lvl]} SLOTS`];
        r.owned = SAVE.cargoLvl >= it.lvl;
        if (!r.owned && SAVE.cargoLvl < it.lvl - 1) { r.locked = true; r.lockMsg = 'Needs the smaller one'; }
        break;
      case 'vac': r.icon = 'vac'; r.chips = [`${VAC[1].range}m REACH`, `${VAC[1].speed}x SPEED`]; r.owned = SAVE.vacLvl >= 1; break;
      case 'boots': r.icon = 'boots'; r.chips = ['DOUBLE JUMP']; r.owned = SAVE.boots; break;
      case 'drill': r.icon = 'drill'; r.chips = ['TOOL 3', 'MINES CRYSTALS']; r.owned = SAVE.drill; break;
      case 'peel': r.icon = 'peel'; r.chips = ['TOOL 4', 'CATCHES METEORS']; r.owned = SAVE.peel; break;
      case 'socks': r.icon = 'sock'; r.chips = ['NO SLIPPING']; r.owned = SAVE.socks; break;
      case 'armor': r.icon = 'shield'; r.chips = ['-30% DAMAGE']; r.owned = SAVE.armor; break;
      case 'life': r.icon = 'heart'; r.chips = ['4 BOSS LIVES']; r.owned = SAVE.lifeIns; break;
      case 'charm': r.icon = 'clover'; r.chips = ['+0% LUCK']; r.owned = SAVE.charm; break;
      case 'nades': r.icon = 'bomb'; r.chips = [`${NADE_DMG} DMG`, `YOU HAVE ${SAVE.nades}`]; break;
      case 'hat': r.name = HATS[it.id]; r.icon = 'hat'; r.desc = 'Cosmetic. Friends will see it. Friends will judge.'; r.chips = ['COSMETIC']; r.owned = SAVE.hats.includes(it.id); break;
      case 'summon': r.name = SUMMONS[it.b].name; r.icon = SUMMONS[it.b].icon; r.chips = [`SUMMONS ${BOSSES[it.b].name.toUpperCase()}`]; r.owned = Summons.has(it.b); break;
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
      case 'summon': SAVE.summons[it.b] = 1; UI.toast(`Take it to the boss altar to summon ${BOSSES[it.b].name}!`, 'gold', 3.5); break;
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
    const tabs = [['buy', 'cart', 'Buy'], ['sell', 'cash', `Sell${SAVE.cargo.length ? ` (${SAVE.cargo.length})` : ''}`], ['hats', 'hat', 'Hats']]
      .map(([t, ic, lab]) => `<button class="stab ${this.tab === t ? 'on' : ''}" data-act="tab" data-t="${t}">${icon(ic)}${lab}</button>`).join('');
    let body = '';
    if (this.tab === 'buy') {
      body = '<div class="cards">' + items.map((it, i) => {
        const inf = this.itemInfo(it), poor = SAVE.bucks < it.price;
        const cls = inf.owned ? 'owned' : inf.locked ? 'locked' : poor ? 'poor' : '';
        const btn = inf.owned ? `<div class="badge ok">${icon('check')} OWNED</div>`
          : inf.locked ? `<div class="badge lock">${icon('lock')} ${U.esc(inf.lockMsg)}</div>`
          : `<button class="price" data-act="buy" data-i="${i}" ${poor ? 'disabled' : ''}>${U.bucks(it.price)}</button>`;
        return `<div class="card2 ${this.tier(it.price)} ${cls}">
          <div class="ic">${icon(inf.icon)}</div>
          <div class="info"><h4>${U.esc(inf.name)}</h4><div class="chips">${inf.chips.map((c) => `<span>${U.esc(c)}</span>`).join('')}</div><p>${U.esc(inf.desc)}</p></div>
          ${btn}</div>`;
      }).join('') + '</div>';
    } else if (this.tab === 'sell') {
      const counts = {};
      for (const id of SAVE.cargo) counts[id] = (counts[id] || 0) + 1;
      const rows = Object.keys(counts).sort((a, b) => RES[b].v * counts[b] - RES[a].v * counts[a]).map((id) => {
        const r = RES[id];
        return `<div class="srow ${r.rare ? 'rare' : ''}"><div class="ic">${icon(r.icon)}</div>
          <div class="info"><b>${U.esc(r.name)}</b><small>${U.esc(r.desc)}</small></div>
          <div class="qty">x${counts[id]}</div><div class="each">${U.bucks(r.v)} each</div>
          <button class="price small" data-act="sell1" data-id="${id}">${U.bucks(r.v * counts[id])}</button></div>`;
      }).join('');
      body = SAVE.cargo.length
        ? `<div class="srows">${rows}</div><button class="sellall" data-act="sellall">Sell everything <b>${U.bucks(value)}</b></button>`
        : `<div class="empty"><div>${icon('bag')}</div>Your backpack is empty.<br>Go vacuum, catch or zap something!</div>`;
    } else {
      const hats = ['none', ...SAVE.hats.filter((h) => h !== 'none')];
      body = '<div class="cards hats">' + hats.map((h) => `<div class="card2 ${SAVE.hat === h ? 'owned' : ''}"><div class="ic">${icon('hat')}</div>
        <div class="info"><h4>${U.esc(HATS[h])}</h4></div>
        ${SAVE.hat === h ? '<div class="badge ok">WEARING</div>' : `<button class="price" data-act="hat" data-h="${h}">Wear</button>`}</div>`).join('') + '</div>' +
        '<p class="tip">More hats come from shops, and from Mystery Crates on Luckstar.</p>';
    }
    const html = `<div class="shop2" style="--acc:${cfg.color}">
      <aside class="keeper">
        <div class="face">${initials(cfg.npc)}</div>
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
      : U.esc(ZAPPERS[SAVE.zap].name) + (SAVE.zap < rec ? ` <span class="pill" style="background:#ff8a80">Recommended: ${U.esc(ZAPPERS[rec].name)}</span>` : '');
    const btn = !have ? `<button class="btn big" disabled style="max-width:440px">${icon(sm.icon)} You need ${U.esc(sm.name)}</button>`
      : noGun ? `<button class="btn big" disabled style="max-width:440px">${icon('gun')} Buy a gun first!</button>`
      : `<button class="btn big red" data-act="summon" style="max-width:440px">${icon(sm.icon)} Use ${U.esc(sm.name)} to summon!</button>`;
    UI.openPanel(`
      <h2 class="ph">Boss Altar</h2>
      <div class="boss" style="margin-top:10px">
        <div class="ico" style="background:${b.color}">${initials(b.name)}</div>
        <div><h4>${U.esc(b.name)}</h4><div class="stars">${'★'.repeat(b.stars)}${'☆'.repeat(5 - b.stars)} ${b.diff}</div><div class="q">"${U.esc(b.quote)}"</div></div>
        <div></div>
      </div>
      <div class="npc-line" data-who="TO SUMMON: ${U.esc(sm.name.toUpperCase())}">${have ? 'You have it! Use it here to summon the boss.' : U.esc(Summons.howText(bid))}</div>
      <table class="list">
        <tr><td>Health</td><td class="r"><b>${hp.toLocaleString()}</b> ${n > 1 ? `(scaled for ${n} goobers)` : ''}</td></tr>
        <tr><td>Reward (each player)</td><td class="r"><b>${U.bucks(reward)}</b> ${first ? '' : '(rematch: half)'}</td></tr>
        <tr><td>Your zapper</td><td class="r">${gun}</td></tr>
        <tr><td>Lives</td><td class="r">${SAVE.lifeIns ? 4 : 3} ${SAVE.armor ? '· Company Armor' : ''} · Grenades: ${SAVE.nades}</td></tr>
        <tr><td>Status</td><td class="r">${G.progress.includes(bid) ? 'Beaten (next planet unlocked)' : 'Not beaten yet'}</td></tr>
      </table>
      <p class="muted">Summoning uses up the item, win or lose, and pulls in everyone on the planet who has a gun. Dodge with WASD + Space (jump over the shockwave rings!). Red circles on the floor mean MOVE.</p>
      ${bid === 'zorblax' ? `<p class="muted">${SAVE.peel ? 'Tip: hold out your Pizza Peel (4) to catch the Emperor\'s flying pizza slices.' : 'Rumor has it Dave\'s Pizza Peel can catch flying pizza.'}</p>` : ''}
      <div class="center">${btn}</div>`,
    (act) => { if (act === 'summon') Game.requestSummon(bid); });
  },
};
