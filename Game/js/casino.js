'use strict';
/* =========================================================
   Luckstar casino: slots, Glorp's coin flip, mystery crates,
   roulette and multiplayer snail races. (The building they're
   all in is PlanetWorld.buildCasino in world.js.)
   ========================================================= */
const SLOT_SYMS = [['cherry', 30], ['planet', 22], ['trash', 16], ['rocket', 12], ['alien', 8], ['meteor', 6], ['gem', 4], ['pizza', 2]];
const SLOT_TRIPLE = { cherry: 6, planet: 10, rocket: 15, alien: 30, gem: 60, pizza: 250 };
const SLOT_PAIR = { cherry: 1.5, planet: 1.5, rocket: 2, alien: 2, gem: 2, pizza: 3 };
const SLOT_ICON = { cherry: 'berry', planet: 'planet', trash: 'trash', rocket: 'rocket', alien: 'alien', meteor: 'flame', gem: 'gem', pizza: 'slice' };
const slotSym = (k) => `<span class="sym sym-${k}">${Thumbs.img('sym:' + k, '', SLOT_ICON[k])}</span>`;
// a European roulette wheel, in wheel order, and which numbers are red
const ROULETTE_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const ROULETTE_RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
// the wheel itself never turns (only the ball does): it sits with the green zero at the top
const ROULETTE_A = -Math.PI / 2 - Math.PI / ROULETTE_ORDER.length;
const slotName = (k) => k.toUpperCase();
// what's in a mystery crate when you're unlucky (and what it looks like)
const CRATE_TRASH = [['A Single Space Sock', 'prize:sock'], ['Expired Coupon (for this crate)', 'prize:coupon'], ['IOU from Glorp', 'prize:iou'],
  ['A Rock. From Space.', 'prize:rock'], ['Half a Sandwich', 'prize:sandwich'], ['Nothing. The box is empty. Rude.', 'prize:empty']];

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
  slotBet: 50, spinning: false, slotAt: -1,
  openSlots(i) {
    this.spinning = false;
    this.slotAt = i == null ? -1 : i; // which machine you're sitting at (its lever gets pulled)
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
    const machine = G.world && G.world.slotMachines && G.world.slotMachines[this.slotAt];
    const lever = machine ? [machine] : [];
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

  /* ---------------- mystery crates ----------------
     Opening one spins a strip of prizes past a marker (you can see everything
     that goes by) and it slows down onto what you actually won. */
  opening: false,
  openCrate() {
    this.opening = false;
    UI.openPanel(`
      <h2 class="ph">Mystery Crate</h2>
      <p class="psub">"What's in the box?" Watch the reel. Your bucks: <b id="cr-b">${U.bucks(SAVE.bucks)}</b></p>
      <div id="cr-reels">${this.reelHtml(1, true)}</div>
      <div id="cr-res" class="grid" style="margin:10px 0 12px"></div>
      <div class="row2">
        <button class="btn big purple" data-act="open1" style="max-width:240px">Open 1 ($300)</button>
        <button class="btn big pink" data-act="open5" style="max-width:280px">Open 5 ($1,400)</button>
      </div>
      <p class="center muted">Can contain: hats, bucks, grenades, Jerry's Golden Token, garbage, or a JACKPOT. Mostly garbage.</p>`, (act) => {
      if (act === 'open1') this.crate(1, 300);
      if (act === 'open5') this.crate(5, 1400);
    });
  },
  // what a prize looks like on the reel
  crateIcon(r) { return r.tier === 'JACKPOT' ? 'crown' : r.token ? 'token' : r.tier === 'LEGENDARY' ? 'star' : r.hat ? 'hat' : r.nades ? 'bomb' : r.tier === 'TRASH' ? 'sock' : 'cash'; },
  crateCard(r) { return `<div class="ccard" style="--c:${r.col}"><div class="ci">${Thumbs.img(r.look, '', this.crateIcon(r))}</div><div class="cn">${U.esc(r.name)}</div><div class="ct">${r.tier}</div></div>`; },
  reelHtml(n, idle) {
    let h = '';
    for (let i = 0; i < n; i++) {
      const cards = idle ? Array.from({ length: 9 }, () => this.crateCard(this.rollCrate(true))).join('') : '';
      h += `<div class="reelwin ${n > 1 ? 'small' : ''}"><div class="strip" id="cstrip${i}">${cards}</div><div class="marker"></div></div>`;
    }
    return h;
  },
  // show = only for decorating the reel (never pays out)
  // (look: which picture of the prize to show, see thumbs.js)
  rollCrate(show) {
    if ((show || !Summons.has('jerry')) && Math.random() < 0.03) return { tier: 'LEGENDARY', col: '#ffb21e', name: SUMMONS.jerry.name, token: true, look: 'sum:jerry' };
    const r = Math.random();
    if (r < 0.02) return { tier: 'JACKPOT', col: '#ff3d8b', name: 'JACKPOT CRATE!', bucks: 4000, look: 'prize:jackpot' };
    if (r < 0.07) return { tier: 'LEGENDARY', col: '#ffb21e', name: 'Golden Ticket', bucks: 1000, look: 'prize:ticket' };
    if (r < 0.19) return { tier: 'RARE', col: '#4aa8ff', name: 'Goo Grenades x5', nades: 5, look: 'nades' };
    if (r < 0.43) {
      const hat = U.pick(CRATE_HATS);
      return SAVE.hats.includes(hat) ? { tier: 'DUPLICATE', col: '#9aa0a6', name: `${HATS[hat]} (dupe)`, bucks: 150, look: 'hat:' + hat } : { tier: 'EPIC', col: '#b86bff', name: HATS[hat], hat, look: 'hat:' + hat };
    }
    if (r < 0.67) return { tier: 'COMMON', col: '#5fd35f', name: 'Some Bucks', bucks: U.randi(5, 30) * 10, look: 'prize:bucks' };
    const [name, look] = U.pick(CRATE_TRASH);
    return { tier: 'TRASH', col: '#9aa0a6', name, look };
  },
  crate(n, cost) {
    if (this.opening) return;
    if (SAVE.bucks < cost) { UI.toast('Not enough bucks!', 'bad'); Sound.play('error'); return; }
    this.opening = true;
    addBucks(-cost, true);
    U.$('cr-b').textContent = U.bucks(SAVE.bucks);
    U.$('cr-res').innerHTML = '';
    // decide the prizes now (one at a time, so a 5-pack can't hold two tokens), reveal them on the reels
    const results = [];
    for (let i = 0; i < n; i++) {
      let r = this.rollCrate();
      while (r.token && results.some((x) => x.token)) r = this.rollCrate(); // only one token per pack
      results.push(r);
    }
    const order = ['TRASH', 'DUPLICATE', 'COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'JACKPOT'];
    const CARD = n > 1 ? 88 : 128, WIN_AT = 40;
    U.$('cr-reels').innerHTML = this.reelHtml(n, false);
    const strips = results.map((res, i) => {
      const cards = Array.from({ length: WIN_AT + 6 }, (_, k) => (k === WIN_AT ? res : this.rollCrate(true)));
      const el = U.$('cstrip' + i);
      el.innerHTML = cards.map((c) => this.crateCard(c)).join('');
      return el;
    });
    let longest = 0;
    requestAnimationFrame(() => strips.forEach((el, i) => {
      const win = el.parentElement.clientWidth || 600;
      const dur = 4.2 + i * 0.45;
      longest = Math.max(longest, dur);
      const land = WIN_AT * CARD + CARD / 2 + U.rand(-CARD * 0.36, CARD * 0.36); // stop somewhere on the prize card
      el.style.transition = `transform ${dur}s cubic-bezier(.08,.72,.12,1)`;
      el.style.transform = `translateX(${-(land - win / 2)}px)`;
    }));
    // a tick every time a card passes the marker
    let lastCard = -1;
    const ticker = setInterval(() => {
      const el = strips[0];
      if (!el || !el.isConnected) return;
      const x = new DOMMatrixReadOnly(getComputedStyle(el).transform).m41, win = el.parentElement.clientWidth || 600;
      const c = Math.floor((-x + win / 2) / CARD);
      if (c !== lastCard) { lastCard = c; Sound.play('tick'); }
    }, 25);
    Sound.play('flip');
    const settle = () => {
      clearInterval(ticker);
      this.opening = false;
      let payout = 0, best = null;
      for (const r of results) {
        if (r.bucks) { addBucks(r.bucks, true); payout += r.bucks; }
        if (r.nades) SAVE.nades += r.nades;
        if (r.hat && !SAVE.hats.includes(r.hat)) SAVE.hats.push(r.hat);
        if (r.token) Summons.earn('jerry');
        if (!best || order.indexOf(r.tier) > order.indexOf(best.tier)) best = r;
      }
      gambleStat(cost, payout);
      if (best.tier === 'JACKPOT') { Sound.play('jackpot'); SAVE.stats.jackpots++; bigWinFeed(`<b>${U.esc(G.name)}</b> opened a JACKPOT CRATE! (+$4,000)`); }
      else if (order.indexOf(best.tier) >= 3) Sound.play('win');
      else Sound.play('lose');
      persist();
      UI.hud();
      const res = U.$('cr-res');
      if (!res || !G.panel) { UI.toast(`Crate: ${best.tier}! ${best.name}${payout ? ` (+${U.bucks(payout)} total)` : ''}`, order.indexOf(best.tier) >= 3 ? 'good' : '', 3.5); return; }
      strips.forEach((el) => { const w = el.children[WIN_AT]; if (w) w.classList.add('won'); });
      res.innerHTML = results.map((r) => `<div class="loot" style="border-color:${r.col}">${Thumbs.img(r.look, '', null)}<div class="rn" style="color:${r.col}">${r.tier}</div><div class="nm">${U.esc(r.name)}</div>${r.bucks ? `<div>+${U.bucks(r.bucks)}</div>` : ''}${r.hat ? '<div class="muted">Wear it: any shop → Cosmetics</div>' : ''}${r.token ? '<div class="muted">For the crew: summons Jackpot Jerry at the boss altar</div>' : ''}</div>`).join('');
      U.$('cr-b').textContent = U.bucks(SAVE.bucks);
    };
    setTimeout(settle, (4.2 + (n - 1) * 0.45) * 1000 + 250);
  },

  /* ---------------- roulette ----------------
     A European wheel (one green zero). Put chips on as many bets as you like, then spin. */
  rBets: {}, rChip: 50, rSpinning: false, rLast: [],
  rBall: { a: -Math.PI / 2, r: 112 }, rWin: null, // where the ball is resting, and which pocket just won
  openRoulette(msg) {
    const reds = new Set(ROULETTE_RED);
    const total = Object.values(this.rBets).reduce((a, b) => a + b, 0);
    const chip = (key) => this.rBets[key] ? `<i>${U.bucks(this.rBets[key])}</i>` : '';
    const num = (n) => `<button class="rnum ${n === 0 ? 'g' : reds.has(n) ? 'r' : 'b'}" data-act="rb" data-k="n${n}">${n}${chip('n' + n)}</button>`;
    let grid = '';
    for (let row = 2; row >= 0; row--) for (let col = 0; col < 12; col++) grid += num(col * 3 + row + 1);
    const outside = [['red', 'RED', 2], ['black', 'BLACK', 2], ['odd', 'ODD', 2], ['even', 'EVEN', 2], ['low', '1-18', 2], ['high', '19-36', 2], ['d1', '1st 12', 3], ['d2', '2nd 12', 3], ['d3', '3rd 12', 3]]
      .map(([k, lab, x]) => `<button class="rout ${k}" data-act="rb" data-k="${k}">${lab} <small>x${x}</small>${chip(k)}</button>`).join('');
    const html = `
      <h2 class="ph">Roulette</h2>
      <p class="psub">Lady Luck 9000 runs a fair table. (Allegedly.) Your bucks: <b id="rl-b">${U.bucks(SAVE.bucks)}</b></p>
      <div class="roulette">
        <div class="rwheel"><canvas id="rlcv" width="300" height="300"></canvas><div class="rlast">${this.rLast.map((n) => `<span class="${n === 0 ? 'g' : reds.has(n) ? 'r' : 'b'}">${n}</span>`).join('')}</div></div>
        <div class="rboard">
          <div class="rgrid"><button class="rnum g zero" data-act="rb" data-k="n0">0${chip('n0')}</button><div class="rnums">${grid}</div></div>
          <div class="routs">${outside}</div>
          <div class="bets">${betOptions(this.rChip, [10, 50, 100, 500, 1000]).replace(/data-act="bet"/g, 'data-act="chip"')}</div>
          <div class="bigmsg" id="rl-msg">${msg || (total ? `Bets on the table: ${U.bucks(total)}` : 'Pick a chip, then click where to bet.')}</div>
          <div class="row2">
            <button class="btn" data-act="rclear" ${this.rSpinning || !total ? 'disabled' : ''}>Clear bets</button>
            <button class="btn big pink" data-act="rspin" style="max-width:280px" ${this.rSpinning || !total ? 'disabled' : ''}>SPIN (${U.bucks(total)})</button>
          </div>
          <p class="center muted">Single number pays 36x, dozens 3x, red/black/odd/even/halves 2x. Zero is green: it beats everything but a bet on 0.</p>
        </div>
      </div>`;
    const handler = (act, d) => {
      if (this.rSpinning) return;
      if (act === 'chip') { this.rChip = Number(d.v); this.openRoulette(); }
      if (act === 'rb') {
        const total2 = Object.values(this.rBets).reduce((a, b) => a + b, 0);
        if (total2 + this.rChip > SAVE.bucks) { UI.toast('You can\'t cover that bet!', 'bad', 1.5); Sound.play('error'); return; }
        this.rBets[d.k] = (this.rBets[d.k] || 0) + this.rChip;
        Sound.play('coin');
        this.openRoulette();
      }
      if (act === 'rclear') { this.rBets = {}; this.openRoulette(); }
      if (act === 'rspin') this.spinRoulette();
    };
    // already at the table: just redraw it (bets aren't paid until you spin, so walking away clears them)
    if (G.panel && this.atRoulette) { UI.setPanel(html); UI.panelHandler = handler; }
    else {
      UI.openPanel(html, handler, null, () => { this.atRoulette = false; if (!this.rSpinning) this.rBets = {}; });
      this.atRoulette = true;
    }
    this.drawWheel(this.rBall, this.rWin);
  },
  // win = the pocket (index in ROULETTE_ORDER) to light up
  drawWheel(ball, win) {
    const cv = U.$('rlcv');
    if (!cv) return;
    const c = cv.getContext('2d'), R = 146, cx = 150, cy = 150, n = ROULETTE_ORDER.length, step = (Math.PI * 2) / n;
    const reds = new Set(ROULETTE_RED);
    c.clearRect(0, 0, 300, 300);
    c.fillStyle = '#3b2414'; c.beginPath(); c.arc(cx, cy, R + 2, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < n; i++) {
      const v = ROULETTE_ORDER[i], a0 = ROULETTE_A + i * step;
      c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R - 8, a0, a0 + step); c.closePath();
      c.fillStyle = v === 0 ? '#1f9d4a' : reds.has(v) ? '#c8281b' : '#161616'; c.fill();
      c.strokeStyle = '#c9a227'; c.lineWidth = 1; c.stroke();
      c.save(); c.translate(cx, cy); c.rotate(a0 + step / 2); c.fillStyle = i === win ? '#ffd23f' : '#fff'; c.font = '700 11px "Chakra Petch", sans-serif'; c.textAlign = 'center'; c.fillText(String(v), R - 20, 4); c.restore();
    }
    // the winning pocket gets a gold outline
    if (win != null) {
      const a0 = ROULETTE_A + win * step;
      c.beginPath(); c.arc(cx, cy, R - 8, a0, a0 + step); c.arc(cx, cy, R - 46, a0 + step, a0, true); c.closePath();
      c.strokeStyle = '#ffd23f'; c.lineWidth = 4; c.stroke();
    }
    c.fillStyle = '#6b4a2b'; c.beginPath(); c.arc(cx, cy, R - 46, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c9a227'; c.beginPath(); c.arc(cx, cy, 26, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#ffd23f'; c.lineWidth = 5;
    for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2 + Math.PI / 4; c.beginPath(); c.moveTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8); c.lineTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40); c.stroke(); }
    if (ball) { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(cx + Math.cos(ball.a) * ball.r, cy + Math.sin(ball.a) * ball.r, 6, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#999'; c.lineWidth = 1; c.stroke(); }
  },
  spinRoulette() {
    const total = Object.values(this.rBets).reduce((a, b) => a + b, 0);
    if (!total) return;
    if (total > SAVE.bucks) { UI.toast('You can\'t cover those bets anymore!', 'bad'); this.rBets = {}; this.openRoulette(); return; }
    addBucks(-total, true);
    const bl = U.$('rl-b');
    if (bl) bl.textContent = U.bucks(SAVE.bucks);
    this.rSpinning = true;
    const bets = this.rBets;
    const result = U.randi(0, 36);
    const n = ROULETTE_ORDER.length, step = (Math.PI * 2) / n, idx = ROULETTE_ORDER.indexOf(result);
    // the wheel stays put. The ball goes round and round (from a random spot, so where it starts
    // gives nothing away), slows down, rattles over a few pockets and drops into the winning one.
    const land = ROULETTE_A + (idx + 0.5) * step, laps = Math.PI * 2 * 7 + Math.random() * Math.PI * 2;
    const DUR = 5200, t0 = performance.now();
    this.rWin = null;
    Sound.play('flip');
    const msg = U.$('rl-msg');
    if (msg) msg.textContent = 'No more bets!';
    document.querySelectorAll('[data-act=rspin],[data-act=rclear]').forEach((b) => (b.disabled = true));
    const table = G.worlds[2] && G.worlds[2].roulette;
    let lastPocket = -1;
    const frame = (now) => {
      const t = Math.min(1, (now - t0) / DUR), e = 1 - Math.pow(1 - t, 3);
      const rattle = t > 0.6 ? Math.sin((t - 0.6) * 55) * step * 0.9 * Math.max(0, (0.92 - t) / 0.32) : 0;
      const ballA = land + (1 - e) * laps + rattle;
      const drop = smooth(0.62, 0.95, t); // off the rim and down into the pockets
      const ballR = U.lerp(142, 112, drop);
      this.drawWheel({ a: ballA, r: ballR });
      const pocket = Math.floor(((ballA - ROULETTE_A) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2) / step);
      if (pocket !== lastPocket && t < 0.95) { lastPocket = pocket; if (t > 0.5 || pocket % 3 === 0) Sound.play('tick'); }
      // the wheel on the casino table does the same thing (its pockets line up with this one)
      if (table) { const r3 = U.lerp(0.62, 0.5, drop); table.userData.ball.position.set(Math.cos(ballA) * r3, 0.16, Math.sin(ballA) * r3); }
      if (t < 1) { requestAnimationFrame(frame); return; }
      this.rBall = { a: land, r: ballR }; // leave the ball sitting in the winning pocket
      this.rWin = idx;
      this.finishRoulette(result, bets, total);
    };
    requestAnimationFrame(frame);
  },
  finishRoulette(result, bets, total) {
    this.rSpinning = false;
    this.rBets = {};
    this.rLast = [result, ...this.rLast].slice(0, 8);
    const red = ROULETTE_RED.includes(result);
    const wins = (k) => {
      if (k[0] === 'n') return Number(k.slice(1)) === result ? 36 : 0;
      if (result === 0) return 0;
      if (k === 'red') return red ? 2 : 0;
      if (k === 'black') return red ? 0 : 2;
      if (k === 'odd') return result % 2 ? 2 : 0;
      if (k === 'even') return result % 2 ? 0 : 2;
      if (k === 'low') return result <= 18 ? 2 : 0;
      if (k === 'high') return result >= 19 ? 2 : 0;
      if (k === 'd1') return result <= 12 ? 3 : 0;
      if (k === 'd2') return result >= 13 && result <= 24 ? 3 : 0;
      if (k === 'd3') return result >= 25 ? 3 : 0;
      return 0;
    };
    let pay = 0;
    for (const k in bets) pay += bets[k] * wins(k);
    if (pay) addBucks(pay, true);
    gambleStat(total, pay);
    persist();
    UI.bucks(0);
    const col = result === 0 ? 'GREEN' : red ? 'RED' : 'BLACK';
    let text;
    if (pay > total) { text = `${result} ${col}! You win ${U.bucks(pay)}!`; Sound.play(pay >= total * 10 ? 'jackpot' : 'win'); if (pay >= 2000) bigWinFeed(`<b>${U.esc(G.name)}</b> won <b>${U.bucks(pay)}</b> at roulette on ${result}!`); }
    else if (pay > 0) { text = `${result} ${col}. You get ${U.bucks(pay)} back.`; Sound.play('coin'); }
    else { text = `${result} ${col}. The house wins. ${U.pick(['Lady Luck 9000 beeps smugly.', 'Your chips have been recycled.', 'Try betting on the right number next time.'])}`; Sound.play('lose'); if (total >= 1000) bigWinFeed(`<b>${U.esc(G.name)}</b> lost <b>${U.bucks(total)}</b> at roulette.`); }
    if (U.$('rlcv') && G.panel) this.openRoulette(text);
    else UI.toast(`Roulette: ${text}`, pay > total ? 'good' : pay ? '' : 'bad', 3.5);
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
    if (G.planet === 2) UI.feed('Snail race betting is OPEN! Head to the snail track in the casino. (15s)', 'ann', 8);
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
        return `<div class="lane"><div class="nm" style="color:${s.color}">${s.name}</div><div class="run"><div class="crab" style="left:${4 + frame[i] * 92}%;color:${s.color}">${Thumbs.img('snail:' + i, '', 'snail')}</div>${my ? `<div class="mybet">your bet: ${U.bucks(my)}</div>` : ''}</div><div class="odds">${r ? 'x' + r.odds[i] : ''}</div></div>`;
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
