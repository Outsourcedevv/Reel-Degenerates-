'use strict';
/* =========================================================
   Luckstar casino: slots, Glorp's coin flip, mystery crates,
   and multiplayer snail races.
   ========================================================= */
const SLOT_SYMS = [['cherry', 30], ['planet', 22], ['trash', 16], ['rocket', 12], ['alien', 8], ['meteor', 6], ['gem', 4], ['pizza', 2]];
const SLOT_TRIPLE = { cherry: 6, planet: 10, rocket: 15, alien: 30, gem: 60, pizza: 250 };
const SLOT_PAIR = { cherry: 1.5, planet: 1.5, rocket: 2, alien: 2, gem: 2, pizza: 3 };
const SLOT_ICON = { cherry: 'berry', planet: 'planet', trash: 'trash', rocket: 'rocket', alien: 'alien', meteor: 'flame', gem: 'gem', pizza: 'slice' };
const slotSym = (k) => `<span class="sym sym-${k}">${icon(SLOT_ICON[k])}</span>`;
const slotName = (k) => k.toUpperCase();

function betOptions(sel, list) {
  return list.map((b) => {
    const lab = typeof b === 'number' ? U.bucks(b) : b === 'all' ? 'ALL IN' : b;
    return `<button class="btn small ${String(sel) === String(b) ? 'sel' : ''}" data-act="bet" data-v="${b}">${lab}</button>`;
  }).join('');
}
function resolveBet(v) {
  if (v === 'all') return SAVE.bucks;
  if (v === '25%') return Math.floor(SAVE.bucks * 0.25);
  if (v === '50%') return Math.floor(SAVE.bucks * 0.5);
  return Number(v);
}
function bigWinFeed(text) {
  UI.feed(text, 'ann');
  Net.relay({ t: 'ann', html: text });
}

const Casino = {
  /* ---------------- slots ---------------- */
  slotBet: 50, spinning: false,
  openSlots() {
    this.spinning = false;
    const pay = Object.entries(SLOT_TRIPLE).map(([s, m]) => `<div>${slotSym(s).repeat(3)} <b>x${m}</b></div>`).join('') +
      `<div>${slotSym('trash').repeat(3)} <b>x0</b></div><div>${slotSym('meteor').repeat(3)} <b>-10%</b></div><div>any pair <b>x1.5-3</b></div>`;
    UI.openPanel(`
      <h2 class="ph">Cosmic Slots</h2>
      <p class="psub">Three reels. Infinite regret. Your bucks: <b id="sl-b">${U.bucks(SAVE.bucks)}</b></p>
      <div class="slotmachine">
        <div class="lights">★ SPIN TO WIN ★</div>
        <div class="reels"><div class="reelbox" id="r0">${slotSym('cherry')}</div><div class="reelbox" id="r1">${slotSym('pizza')}</div><div class="reelbox" id="r2">${slotSym('rocket')}</div></div>
        <div class="bigmsg" id="sl-msg" style="color:#fff">Pull the lever, goober.</div>
        <div class="bets" id="sl-bets">${betOptions(this.slotBet, [10, 50, 100, 500, 'all'])}</div>
        <div class="center"><button class="btn big pink" data-act="spin" style="max-width:260px">SPIN (${U.bucks(resolveBet(this.slotBet))})</button></div>
        <div class="paytable">${pay}</div>
      </div>`, (act, d) => {
      if (act === 'bet' && !this.spinning) { this.slotBet = d.v; this.openSlotsRefresh(); }
      if (act === 'spin') this.spin();
    });
  },
  openSlotsRefresh() {
    U.$('sl-bets').innerHTML = betOptions(this.slotBet, [10, 50, 100, 500, 'all']);
    document.querySelector('[data-act=spin]').textContent = `SPIN (${U.bucks(resolveBet(this.slotBet))})`;
    U.$('sl-b').textContent = U.bucks(SAVE.bucks);
  },
  spin() {
    if (this.spinning) return;
    const bet = resolveBet(this.slotBet);
    const msg = U.$('sl-msg');
    if (bet <= 0 || bet > SAVE.bucks) { msg.textContent = 'You\'re broke. Go collect stuff.'; msg.className = 'bigmsg lose'; Sound.play('error'); return; }
    this.spinning = true;
    addBucks(-bet, true);
    U.$('sl-b').textContent = U.bucks(SAVE.bucks);
    const res = [0, 1, 2].map(() => U.weighted(SLOT_SYMS));
    const boxes = [0, 1, 2].map((i) => U.$('r' + i));
    boxes.forEach((b) => { b.className = 'reelbox spin'; });
    msg.textContent = '...'; msg.className = 'bigmsg'; msg.style.color = '#fff';
    const lever = G.world && G.world.slotMachines && G.world.slotMachines.length ? G.world.slotMachines : [];
    lever.forEach((s) => (s.userData.lever.rotation.x = 0.8));
    let tick = setInterval(() => {
      boxes.forEach((b) => { if (b.classList.contains('spin')) b.innerHTML = slotSym(U.weighted(SLOT_SYMS)); });
      Sound.play('tick');
    }, 70);
    res.forEach((sym, i) => setTimeout(() => {
      const b = boxes[i];
      if (b.isConnected) {
        b.className = 'reelbox stop';
        b.innerHTML = slotSym(sym);
        Sound.play('reelstop');
      }
      if (i === 2) { clearInterval(tick); this.slotResult(res, bet); }
    }, 700 + i * 420));
    setTimeout(() => clearInterval(tick), 2200);
    setTimeout(() => lever.forEach((s) => (s.userData.lever.rotation.x = 0)), 600);
  },
  slotResult(res, bet) {
    this.spinning = false;
    const [a, b, c] = res;
    let pay = 0, text;
    if (a === b && b === c) {
      if (a === 'trash') text = 'Triple trash. You ARE the trash.';
      else if (a === 'meteor') {
        const lost = Math.floor(SAVE.bucks * 0.1);
        addBucks(-lost, true);
        text = `METEOR STRIKE! It hit your wallet. -${U.bucks(lost)}`;
      } else {
        pay = bet * SLOT_TRIPLE[a];
        text = a === 'pizza' ? `PIZZA JACKPOT!!! +${U.bucks(pay)}` : `TRIPLE ${slotName(a)}! +${U.bucks(pay)}`;
      }
    } else {
      const pair = a === b ? a : b === c ? b : a === c ? a : null;
      if (pair && SLOT_PAIR[pair]) { pay = Math.floor(bet * SLOT_PAIR[pair]); text = `Pair of ${slotName(pair)}! +${U.bucks(pay)}`; }
      else text = U.pick(LINES.slotsLose);
    }
    if (pay) addBucks(pay, true);
    gambleStat(bet, pay);
    if (a === b && b === c && a === 'pizza') {
      Sound.play('jackpot'); SAVE.stats.jackpots++;
      UI.bigTitle('JACKPOT!!!', `${G.name} won ${U.bucks(pay)}`, '#ffd23f', 3);
      bigWinFeed(`<b>${U.esc(G.name)}</b> hit the PIZZA JACKPOT for <b>${U.bucks(pay)}</b>!!!`);
    } else if (pay > bet) {
      Sound.play(pay >= bet * 10 ? 'jackpot' : 'win');
      if (pay >= 2000) bigWinFeed(`<b>${U.esc(G.name)}</b> won <b>${U.bucks(pay)}</b> on slots!`);
    } else if (pay === 0) {
      Sound.play('lose');
      if (bet >= 1000) bigWinFeed(`<b>${U.esc(G.name)}</b> just lost <b>${U.bucks(bet)}</b> on slots. Point and laugh.`);
    } else Sound.play('coin');
    persist();
    UI.bucks(0);
    const msg = U.$('sl-msg');
    // walked away mid-spin? still tell them how it went
    if (!msg || !G.panel) UI.toast(`Slots: ${res.map(slotName).join(' / ')}. ${text}`, pay > bet ? 'good' : pay ? '' : 'bad', 3.5);
    if (!msg) return;
    [0, 1, 2].forEach((i) => U.$('r' + i).classList.toggle('hot', pay > 0 && (res[i] === a && a === b || res[i] === b && b === c || res[i] === a && a === c)));
    msg.textContent = text;
    msg.className = 'bigmsg ' + (pay > bet ? 'win' : pay > 0 ? '' : 'lose');
    msg.style.color = '';
    this.openSlotsRefresh();
  },

  /* ---------------- Glorp's double or nothing ---------------- */
  glorpBet: 100, flipping: false, ride: 0, atTable: false,
  openGlorp(line) {
    const html = `
      <h2 class="ph">Glorp's Double or Nothing</h2>
      <p class="psub">Pick a side. Win double. Or don't. Your bucks: <b id="gl-b">${U.bucks(SAVE.bucks)}</b></p>
      <div class="npc-line" data-who="GLORP" id="gl-line">${U.esc(line || U.pick(LINES.glorpHi))}</div>
      <div class="coinwrap"><div class="coin" id="coin" style="transform: rotateY(${this.lastFace ? 180 : 0}deg)"><div class="face">H</div><div class="face back">T</div></div></div>
      <div class="bigmsg" id="gl-msg">${this.ride ? 'Letting it ride: ' + U.bucks(this.ride) : ''}</div>
      <div class="bets" id="gl-bets">${this.ride ? '' : betOptions(this.glorpBet, [50, 100, 500, '25%', '50%', 'all'])}</div>
      <div class="row2">
        <button class="btn big green" data-act="flip" data-side="0" style="max-width:220px">HEADS</button>
        <button class="btn big blue" data-act="flip" data-side="1" style="max-width:220px">TAILS</button>
      </div>
      ${this.ride ? '<div class="center" style="margin-top:10px"><button class="btn small" data-act="cashout">Cash out ' + U.bucks(this.ride) + '</button></div>' : ''}
      <p class="center muted">Glorp's coin is "totally fair." (47% fair.)${this.ride ? ' Walking away cashes you out.' : ''}</p>`;
    const handler = (act, d) => {
      if (act === 'bet' && !this.flipping) { this.glorpBet = d.v; U.$('gl-bets').innerHTML = betOptions(this.glorpBet, [50, 100, 500, '25%', '50%', 'all']); }
      if (act === 'flip') this.flip(Number(d.side));
      if (act === 'cashout' && !this.flipping) { const r = this.cashOut(); this.openGlorp(`Fine, fine. ${U.bucks(r)}. Don't spend it all in one place. (Spend it all here.)`); }
    };
    if (G.panel && this.atTable) { UI.setPanel(html); UI.panelHandler = handler; return; }
    UI.openPanel(html, handler, null, () => {
      this.atTable = false;
      if (this.flipping) return; // the coin is still in the air; flip() settles it
      const r = this.cashOut();
      if (r) UI.toast(`Glorp paid out your ${U.bucks(r)}. "Come back soon! Bring more money!"`, 'good', 3);
    });
    this.atTable = true;
  },
  cashOut() {
    const r = this.ride;
    if (!r) return 0;
    this.ride = 0;
    addBucks(r);
    Sound.play('cash');
    return r;
  },
  flip(side) {
    if (this.flipping) return;
    const bet = this.ride || resolveBet(this.glorpBet);
    const msg = U.$('gl-msg');
    if (!this.ride) {
      if (bet <= 0 || bet > SAVE.bucks) { msg.textContent = 'You can\'t afford that, pal.'; msg.className = 'bigmsg lose'; Sound.play('error'); return; }
      addBucks(-bet, true);
      U.$('gl-b').textContent = U.bucks(SAVE.bucks);
    }
    this.flipping = true;
    const win = Math.random() < 0.47;
    const result = win ? side : 1 - side;
    this.lastFace = result;
    const coin = U.$('coin');
    coin.style.transform = '';
    coin.style.setProperty('--end', (result ? 1980 : 1800) + 'deg');
    coin.classList.remove('flip'); void coin.offsetWidth; coin.classList.add('flip');
    Sound.play('flip');
    msg.textContent = 'Flipping...'; msg.className = 'bigmsg';
    setTimeout(() => {
      this.flipping = false;
      const face = result ? 'TAILS' : 'HEADS';
      if (win) {
        const payout = bet * 2;
        SAVE.stats.won += bet; SAVE.stats.gambled += this.ride ? 0 : bet;
        this.ride = payout;
        Sound.play('win');
        if (payout >= 5000) bigWinFeed(`<b>${U.esc(G.name)}</b> is on a streak with Glorp: <b>${U.bucks(payout)}</b> riding!`);
      } else {
        if (!this.ride) SAVE.stats.gambled += bet;
        SAVE.stats.lost += bet;
        if (bet >= 2000) bigWinFeed(`<b>${U.esc(G.name)}</b> lost <b>${U.bucks(bet)}</b> to Glorp's coin.`);
        this.ride = 0;
        Sound.play('lose');
      }
      persist();
      // walked away while the coin was in the air: settle up without reopening the table
      if (!(G.panel && this.atTable)) {
        if (win) UI.toast(`${face}! Glorp paid out your ${U.bucks(this.cashOut())}.`, 'good', 3);
        else UI.toast(`${face}. You lost ${U.bucks(bet)} to Glorp.`, 'bad', 3);
        return;
      }
      this.openGlorp(U.pick(win ? LINES.glorpWin : LINES.glorpLose));
      const m = U.$('gl-msg');
      m.textContent = win ? `${face}! You win! ${U.bucks(this.ride)} riding. Flip again or cash out?` : `${face}. You lost ${U.bucks(bet)}.`;
      m.className = 'bigmsg ' + (win ? 'win' : 'lose');
    }, 1450);
  },

  /* ---------------- mystery crates ---------------- */
  opening: false,
  openCrate() {
    this.opening = false;
    UI.openPanel(`
      <h2 class="ph">Mystery Crate</h2>
      <p class="psub">"What's in the box?" Nobody knows. Not even Mr. Chips. Your bucks: <b id="cr-b">${U.bucks(SAVE.bucks)}</b></p>
      <div class="gachabox" id="crate">${icon('box')}</div>
      <div id="cr-res" class="grid" style="margin:8px 0 12px"></div>
      <div class="row2">
        <button class="btn big purple" data-act="open1" style="max-width:240px">Open 1 ($300)</button>
        <button class="btn big pink" data-act="open5" style="max-width:280px">Open 5 ($1,400)</button>
      </div>
      <p class="center muted">Can contain: hats, bucks, grenades, Jerry's Golden Token, garbage, or a JACKPOT. Mostly garbage.</p>`, (act) => {
      if (act === 'open1') this.crate(1, 300);
      if (act === 'open5') this.crate(5, 1400);
    });
  },
  rollCrate() {
    if (!Summons.has('jerry') && Math.random() < 0.12) return { tier: 'LEGENDARY', col: '#ffb21e', name: SUMMONS.jerry.name, token: true };
    const r = Math.random();
    if (r < 0.02) return { tier: 'JACKPOT', col: '#ff3d8b', name: 'JACKPOT CRATE!', bucks: 4000 };
    if (r < 0.07) return { tier: 'LEGENDARY', col: '#ffb21e', name: 'Golden Ticket', bucks: 1000 };
    if (r < 0.19) return { tier: 'RARE', col: '#4aa8ff', name: 'Goo Grenades x5', nades: 5 };
    if (r < 0.43) {
      const hat = U.pick(CRATE_HATS);
      return SAVE.hats.includes(hat) ? { tier: 'DUPLICATE', col: '#9aa0a6', name: `${HATS[hat]} (dupe)`, bucks: 150 } : { tier: 'EPIC', col: '#b86bff', name: HATS[hat], hat };
    }
    if (r < 0.67) return { tier: 'COMMON', col: '#5fd35f', name: 'Some Bucks', bucks: U.randi(5, 30) * 10 };
    return { tier: 'TRASH', col: '#9aa0a6', name: U.pick(['A Single Space Sock', 'Expired Coupon (for this crate)', 'IOU from Glorp', 'A Rock. From Space.', 'Half a Sandwich', 'Nothing. The box is empty. Rude.']) };
  },
  crate(n, cost) {
    if (this.opening) return;
    if (SAVE.bucks < cost) { UI.toast('Not enough bucks!', 'bad'); Sound.play('error'); return; }
    this.opening = true;
    addBucks(-cost, true);
    U.$('cr-b').textContent = U.bucks(SAVE.bucks);
    const box = U.$('crate');
    box.className = 'gachabox shake';
    U.$('cr-res').innerHTML = '';
    Sound.play('drill');
    let shakes = 0;
    const shakeT = setInterval(() => { Sound.play('tick'); if (++shakes > 12) clearInterval(shakeT); }, 90);
    setTimeout(() => {
      this.opening = false;
      const results = [];
      let payout = 0, best = null;
      const order = ['TRASH', 'DUPLICATE', 'COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'JACKPOT'];
      for (let i = 0; i < n; i++) {
        const r = this.rollCrate(); // one at a time, so a 5-pack can't hold two tokens
        results.push(r);
        if (r.bucks) { addBucks(r.bucks, true); payout += r.bucks; }
        if (r.nades) SAVE.nades += r.nades;
        if (r.hat && !SAVE.hats.includes(r.hat)) SAVE.hats.push(r.hat);
        if (r.token) Summons.give('jerry');
        if (!best || order.indexOf(r.tier) > order.indexOf(best.tier)) best = r;
      }
      gambleStat(cost, payout);
      if (best.tier === 'JACKPOT') { Sound.play('jackpot'); SAVE.stats.jackpots++; bigWinFeed(`<b>${U.esc(G.name)}</b> opened a JACKPOT CRATE! (+$4,000)`); }
      else if (order.indexOf(best.tier) >= 3) Sound.play('win');
      else Sound.play('lose');
      persist();
      UI.hud();
      if (!box.isConnected || !G.panel) UI.toast(`Crate: ${best.tier}! ${best.name}${payout ? ` (+${U.bucks(payout)} total)` : ''}`, order.indexOf(best.tier) >= 3 ? 'good' : '', 3.5);
      if (!box.isConnected) return;
      box.className = 'gachabox pop';
      box.innerHTML = icon(best.tier === 'JACKPOT' ? 'crown' : best.token ? 'token' : best.tier === 'LEGENDARY' ? 'star' : best.hat ? 'hat' : best.nades ? 'bomb' : best.tier === 'TRASH' ? 'sock' : 'cash');
      U.$('cr-res').innerHTML = results.map((r) => `<div class="loot" style="border-color:${r.col}"><div class="rn" style="color:${r.col}">${r.tier}</div><div class="nm">${U.esc(r.name)}</div>${r.bucks ? `<div>+${U.bucks(r.bucks)}</div>` : ''}${r.hat ? '<div class="muted">Wear it at any shop → Hats</div>' : ''}${r.token ? '<div class="muted">Summons Jackpot Jerry at the ⚠ altar</div>' : ''}</div>`).join('');
      U.$('cr-b').textContent = U.bucks(SAVE.bucks);
    }, 1200);
  },

  /* ---------------- snail races (host-synced) ---------------- */
  round: null, bets: [], snailBet: 100, pick: null,
  simulate(stats, rngSeed) {
    const rng = U.seeded(rngSeed);
    const DT = 0.05, pos = [0, 0, 0, 0, 0], st = stats.map(() => ({ mode: 'run', t: 0 }));
    const frames = [], events = [], order = [];
    let winStep = -1;
    for (let step = 0; step < 700; step++) {
      for (let i = 0; i < 5; i++) {
        if (order.includes(i)) continue;
        const s = st[i], nm = SNAILS[i].name;
        if (s.t > 0) { s.t -= DT; if (s.t <= 0) s.mode = 'run'; }
        else {
          const r = rng();
          if (r < 0.0045) { s.mode = 'nap'; s.t = 1.6; events.push({ step, text: `${nm} fell asleep. Classic ${nm}.` }); }
          else if (r < 0.0075) { s.mode = 'wrong'; s.t = 1.0; events.push({ step, text: `${nm} is going the WRONG WAY!` }); }
          else if (r < 0.0115) { s.mode = 'boost'; s.t = 1.2; events.push({ step, text: `${nm} found a speed mushroom!` }); }
        }
        const base = stats[i].spd * (0.6 + rng() * 0.8);
        const v = s.mode === 'nap' ? 0 : s.mode === 'wrong' ? -base * 0.6 : s.mode === 'boost' ? base * 2.2 : base;
        pos[i] = Math.max(0, pos[i] + v * DT);
        if (pos[i] >= 1) {
          pos[i] = 1; order.push(i);
          if (winStep < 0) { winStep = step; events.push({ step, text: `${nm} WINS!` }); }
        }
      }
      frames.push(pos.slice());
      if (order.length === 5 || (winStep >= 0 && step > winStep + 50)) break;
    }
    return { frames, events, winner: order[0], dt: DT };
  },
  startRound(seed, betTime) {
    const rng = U.seeded(seed);
    const stats = SNAILS.map(() => ({ spd: 0.072 + rng() * 0.036 }));
    const wins = [0, 0, 0, 0, 0];
    for (let k = 0; k < 100; k++) wins[this.simulate(stats, seed * 31 + k * 7919).winner]++;
    const odds = wins.map((w) => Math.round(U.clamp(0.88 / Math.max(w / 100, 0.03), 1.3, 20) * 10) / 10);
    const sim = this.simulate(stats, seed ^ 0x5bd1e995);
    const now = G.time;
    this.round = { seed, odds, sim, betEnd: now + betTime, raceStart: now + betTime + 3, raceEnd: now + betTime + 3 + sim.frames.length * sim.dt, paid: false, evIdx: 0 };
    this.bets = [];
    this.pick = null;
    this.comment = 'Place your bets!';
    if (G.planet === 2) UI.feed('Snail race betting is OPEN! Head to the track. (15s)', 'ann', 8);
  },
  phase() {
    const r = this.round;
    if (!r) return 'idle';
    const t = G.time;
    if (t < r.betEnd) return 'bet';
    if (t < r.raceStart) return 'count';
    if (t < r.raceEnd) return 'race';
    if (t < r.raceEnd + 6) return 'done';
    return 'idle';
  },
  update(dt) {
    const ph = this.phase();
    if (ph === 'idle' && this.round) this.round = null;
    const r = this.round;
    if (r && (ph === 'race' || ph === 'done')) {
      const idx = Math.min(r.sim.frames.length - 1, Math.floor((G.time - r.raceStart) / r.sim.dt));
      while (r.evIdx < r.sim.events.length && r.sim.events[r.evIdx].step <= idx) { this.comment = r.sim.events[r.evIdx].text; r.evIdx++; }
      if (ph === 'done' && !r.paid) this.payout();
    }
    // 3D snails on Luckstar's track
    const w = G.worlds[2];
    if (w && w.snails && G.planet === 2 && G.mode === 'planet') {
      const tr = w.track;
      w.snails.forEach((m, i) => {
        let p = 0;
        if (r && (ph === 'race' || ph === 'done')) {
          const f = (G.time - r.raceStart) / r.sim.dt;
          const i0 = Math.min(r.sim.frames.length - 1, Math.floor(f)), i1 = Math.min(r.sim.frames.length - 1, i0 + 1);
          p = U.lerp(r.sim.frames[i0][i], r.sim.frames[i1][i], f - Math.floor(f));
        }
        m.position.x = U.lerp(tr.x0, tr.x1, p);
        m.position.y = tr.y + Math.abs(Math.sin(G.time * 6 + i)) * 0.05;
      });
    }
  },
  payout() {
    const r = this.round;
    r.paid = true;
    if (!this.bets.length) return;
    let total = 0, staked = 0;
    for (const b of this.bets) { staked += b.amt; if (b.snail === r.sim.winner) total += Math.floor(b.amt * r.odds[b.snail]); }
    gambleStat(staked, total);
    if (total > 0) {
      addBucks(total);
      Sound.play('win');
      UI.toast(`${SNAILS[r.sim.winner].name} won! You get ${U.bucks(total)}!`, 'good', 3.5);
      if (total >= 2000) bigWinFeed(`<b>${U.esc(G.name)}</b> won <b>${U.bucks(total)}</b> betting on ${SNAILS[r.sim.winner].name}!`);
    } else {
      Sound.play('lose');
      UI.toast(`${SNAILS[r.sim.winner].name} won. Your snail did not. -${U.bucks(staked)}`, 'bad', 3.5);
    }
    persist();
  },
  openSnails() {
    const render = () => {
      const r = this.round, ph = this.phase();
      let status;
      if (ph === 'idle') status = 'No race running. Start one! (Everyone gets 15 seconds to bet.)';
      else if (ph === 'bet') status = `Betting closes in <b>${Math.ceil(r.betEnd - G.time)}s</b>`;
      else if (ph === 'count') status = `<b>Race starts in ${Math.ceil(r.raceStart - G.time)}...</b>`;
      else if (ph === 'race') status = '<b>AND THEY\'RE OFF!</b> (slowly)';
      else status = `<b>${SNAILS[r.sim.winner].name} WINS!</b>`;
      let frame = [0, 0, 0, 0, 0];
      if (r && (ph === 'race' || ph === 'done')) frame = r.sim.frames[Math.min(r.sim.frames.length - 1, Math.floor((G.time - r.raceStart) / r.sim.dt))];
      const lanes = SNAILS.map((s, i) => {
        const my = this.bets.filter((b) => b.snail === i).reduce((a, b) => a + b.amt, 0);
        return `<div class="lane"><div class="nm" style="color:${s.color}">${s.name}</div><div class="run"><div class="crab" style="left:${4 + frame[i] * 92}%;color:${s.color}">${icon('snail')}</div>${my ? `<div class="mybet">your bet: ${U.bucks(my)}</div>` : ''}</div><div class="odds">${r ? 'x' + r.odds[i] : ''}</div></div>`;
      }).join('');
      const canBet = ph === 'bet';
      return `<h2 class="ph">Snail Races</h2>
        <p class="psub">Five snails. One dream. Your bucks: <b>${U.bucks(SAVE.bucks)}</b></p>
        <div class="track2d">${lanes}</div>
        <div class="commentary">${status}${ph === 'race' || ph === 'done' ? ' · ' + U.esc(this.comment || '') : ''}</div>
        ${ph === 'idle' ? '<div class="center"><button class="btn big green" data-act="start" style="max-width:300px">Start a race</button></div>' : ''}
        ${canBet ? `<div class="crabpick">${SNAILS.map((s, i) => `<button class="btn small ${this.pick === i ? 'sel' : ''}" data-act="pick" data-i="${i}">${s.name} (x${r.odds[i]})</button>`).join('')}</div>
          <div class="bets">${betOptions(this.snailBet, [50, 100, 500, 1000, 'all'])}</div>
          <div class="center"><button class="btn big pink" data-act="place" style="max-width:320px" ${this.pick == null ? 'disabled' : ''}>Bet ${U.bucks(resolveBet(this.snailBet))} on ${this.pick == null ? '...' : SNAILS[this.pick].name}</button></div>` : ''}`;
    };
    let last = '';
    const tick = () => {
      if (!document.querySelector('.track2d')) return;
      const html = render();
      if (html !== last) { last = html; UI.setPanel(html); }
    };
    UI.openPanel(render(), (act, d) => {
      if (act === 'start') { Net.toHost({ t: 'snailreq' }); UI.toast('Race requested!', '', 1.2); }
      if (act === 'pick') this.pick = Number(d.i);
      if (act === 'bet') this.snailBet = d.v;
      if (act === 'place') this.placeBet();
      last = '';
      tick();
    }, tick);
  },
  placeBet() {
    if (this.phase() !== 'bet' || this.pick == null) return;
    const amt = resolveBet(this.snailBet);
    if (amt <= 0 || amt > SAVE.bucks) { UI.toast('Not enough bucks!', 'bad'); Sound.play('error'); return; }
    addBucks(-amt);
    this.bets.push({ snail: this.pick, amt });
    Sound.play('coin');
    UI.toast(`Bet ${U.bucks(amt)} on ${SNAILS[this.pick].name}!`, 'good', 1.6);
  },
  // host
  onRequest() {
    if (this.phase() !== 'idle') return;
    const seed = Math.floor(Math.random() * 1e9);
    this.startRound(seed, 15);
    Net.toAll({ t: 'snail', seed, bet: 15 });
  },
};
