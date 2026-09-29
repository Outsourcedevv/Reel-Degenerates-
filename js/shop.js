'use strict';
/* =========================================================
   Planet shops (buy / sell / hats), galaxy map, boss panel
   ========================================================= */
const BOSS_REC = { gary: 0, blorb: 1, jerry: 2, snowdad: 3, count: 4, stormy: 5, chad: 6, zorblax: 8 };
const MAX_STARS = 8; // (boss difficulty stars: Zorblax is the only 8)
// what a gun does, in a few words (for its shop card)
function gunChips(z) {
  const rate = `${(1 / z.cd).toFixed(1)} / SEC`, mag = `${z.mag} MAG`, rl = `${z.rl}s RELOAD`;
  switch (z.type) {
    case 'squirt': return ['WATER PISTOL', `${z.dmg} DMG`, rate, `${z.mag} SQUIRTS`];
    case 'spread': return ['SHOTGUN', `${z.pellets} x ${z.dmg} DMG`, rate, `${z.mag} SHELLS`];
    case 'lob': return ['LAUNCHER', `${z.dmg} SPLASH DMG`, 'SLOWS CRITTERS', `${z.mag} GOO`];
    case 'jackpot': return ['LUCKY SHOTS', `${z.dmg} DMG`, 'x2 · 777 · JACKPOT', mag];
    case 'beam': return ['FREEZE RAY', `${Math.round(z.dmg / z.cd)} DMG / SEC`, 'FREEZES CRITTERS', `${(z.mag * z.cd).toFixed(0)}s CHARGE`];
    case 'cutter': return ['BOOMERANG', `${z.dmg} DMG PER SLICE`, 'SLICES THROUGH', `${z.mag} CUTTERS`];
    case 'homing': return ['HOMING', `${z.dmg} DMG`, rate, `${z.mag} WISPS`];
    case 'chain': return ['CHAIN LIGHTNING', `${z.dmg} DMG`, `JUMPS ${z.jumps}x`, 'STUNS CRITTERS'];
    case 'rocket': return ['ROCKETS', `${z.dmg} SPLASH DMG`, 'ROCKET JUMPS', `${z.mag} PARCELS`];
    case 'sniper': return ['SNIPER', `${z.dmg} DMG`, `${Keys.name('aim').toUpperCase()}: SCOPE`, `${z.mag} ROUNDS`];
    default: return ['BLASTER', `${z.dmg} DMG`, rate, mag, rl];
  }
}
// every shop sells the first real gun to anyone who only has the Squirt Pistol (e.g. a friend who joins on a later planet)
const STARTER_GUN = { kind: 'zap', lvl: 0, price: 200, desc: 'Your first REAL gun. Way better than that squirt pistol. Infinite batteries, tiny battery pack.' };

// (saves from before the three newer planets had already reached Zorblax Prime: it stays open for them)
function planetUnlocked(i) { return i === 0 || G.progress.includes(PLANETS[i - 1].boss) || (PLANETS[i].boss === 'zorblax' && !!SAVE.zorbOpen); }

const Shop = {
  tab: 'buy', cur: null, line: '',

  itemInfo(it) {
    // returns {name, desc, icon, chips[], owned, locked, lockMsg}
    const r = { name: it.name, desc: keyText(it.desc || ''), icon: 'box', pic: Thumbs.shopKey(it), chips: [], owned: false, locked: false, lockMsg: '' };
    switch (it.kind) {
      case 'zap': { // (any gun can be bought straight away, and every gun you buy is yours to keep: see the Loadout tab)
        const z = ZAPPERS[it.lvl];
        r.name = z.name; r.icon = 'gun';
        r.chips = gunChips(z);
        r.owned = SAVE.guns.includes(it.lvl);
        if (r.owned) r.ownedMsg = Loadout.find('gun:' + it.lvl) >= 0 ? 'ON YOUR HOTBAR' : 'IN YOUR LOCKER';
        break;
      }
      case 'cargo':
        // any backpack can be bought straight away (no need to own the smaller one first)
        r.icon = 'bag'; r.chips = [`${CARGO[it.lvl]} SLOTS`];
        r.owned = SAVE.cargoLvl >= it.lvl;
        if (SAVE.cargoLvl > it.lvl) r.ownedMsg = 'YOURS IS BIGGER';
        break;
      case 'vac': {
        const level = it.lvl || 1;
        r.name = it.name || (level === 2 ? 'Spooky Vacuum' : 'Turbo Vac');
        r.icon = 'vac'; r.chips = [`${VAC[level].range}m REACH`, `${VAC[level].speed}x SPEED`];
        r.owned = SAVE.vacLvl >= level;
        if (SAVE.vacLvl > level) r.ownedMsg = 'YOURS IS BETTER';
        break;
      }
      case 'boots': r.icon = 'boots'; r.chips = ['DOUBLE JUMP']; r.owned = SAVE.boots; break;
      case 'skates': r.icon = 'boots'; r.chips = ['SPRINT +35%']; r.owned = SAVE.skates; break;
      case 'dash': r.icon = 'boots'; r.chips = [`${Keys.name('dash').toUpperCase()}: DASH`, 'WORKS IN THE AIR']; r.owned = SAVE.dash; break;
      case 'stomp': r.icon = 'boots'; r.chips = [`${Keys.name('stomp').toUpperCase()} (IN THE AIR): SLAM`, `${STOMP.dmg} DMG SHOCKWAVE`]; r.owned = SAVE.stomp; break;
      case 'springs': r.icon = 'boots'; r.chips = ['SUPER JUMP']; r.owned = SAVE.springs; break;
      case 'cape': r.icon = 'star'; r.chips = ['HOLD SPACE: GLIDE']; r.owned = SAVE.cape; break;
      case 'jetpack': r.icon = 'rocket'; r.chips = ['HOLD SPACE: FLY', `${JET.fuel}s OF FUEL`]; r.owned = SAVE.jetpack; break;
      case 'drill': r.icon = 'drill'; r.chips = ['HOTBAR TOOL', 'MINES CRYSTALS']; r.owned = SAVE.drill; break;
      case 'peel': r.icon = 'peel'; r.chips = ['HOTBAR TOOL', 'CATCHES METEORS']; r.owned = SAVE.peel; break;
      case 'socks': r.icon = 'sock'; r.chips = ['NO SLIPPING']; r.owned = SAVE.socks; break;
      case 'armor': r.icon = 'shield'; r.chips = ['-30% DAMAGE']; r.owned = SAVE.armor; break;
      case 'life': r.icon = 'heart'; r.chips = ['KEEP YOUR GEAR WHEN YOU DIE']; r.owned = SAVE.lifeIns; break;
      case 'charm': r.icon = 'clover'; r.chips = ['+0% LUCK']; r.owned = SAVE.charm; break;
      case 'nades': r.icon = 'bomb'; r.chips = [`${NADE_DMG} DMG`, `YOU HAVE ${SAVE.nades}`]; break;
      case 'hat': r.name = HATS[it.id]; r.icon = 'hat'; r.desc = 'Cosmetic. Yours in every world. Friends will see it. Friends will judge.'; r.chips = ['COSMETIC']; r.owned = SAVE.hats.includes(it.id); break;
      case 'sight': { // (fits any gun that aims: see SIGHTS)
        const sg = SIGHTS[it.id];
        r.name = sg.name; r.icon = 'star'; r.desc = sg.desc; r.chips = sg.chips.slice();
        r.owned = (SAVE.sights || []).includes(it.id);
        if (r.owned) r.ownedMsg = 'YOURS: SEE LOADOUT';
        break;
      }
      case 'summon': r.name = SUMMONS[it.b].name; r.icon = SUMMONS[it.b].icon; r.chips = [`SUMMONS ${BOSSES[it.b].name.toUpperCase()}`]; r.owned = Summons.has(it.b); break;
    }
    return r;
  },
  // a few words about something you can hold (for the Loadout tab)
  gearChips(it) {
    const g = Loadout.gun(it);
    if (g != null) return gunChips(gunDef(g)).slice(0, 2);
    const level = Math.min(VAC.length - 1, Math.max(0, SAVE.vacLvl || 0));
    return { vac: [level === 2 ? 'SPOOKY' : level === 1 ? 'TURBO' : 'VACUUMS STUFF', `${VAC[level].range}m REACH`], drill: ['MINES CRYSTALS'], peel: ['CATCHES METEORS'] }[it] || [];
  },
  // your hotbar and your locker: put anything in any slot, take anything off (sel: the slot you clicked)
  sel: null,
  loadoutHtml() {
    const s = Loadout.slots(), sel = this.sel, locker = Loadout.locker();
    const slot = (it, i) => {
      const ok = Loadout.at(i), lost = !ok && Loadout.valid(it);
      return `<div class="lslot ${sel === i ? 'sel' : ''} ${ok ? '' : 'empty'} ${lost ? 'lost' : ''} ${G.player && G.player.slot === i ? 'out' : ''}" data-act="lsel" data-i="${i}">
        <span class="k">${U.esc(Keys.name('slot' + (i + 1)))}</span>
        <div class="ic">${ok || lost ? Thumbs.img(Loadout.pic(it), '', Loadout.icon(it)) : ''}</div>
        <b>${ok ? U.esc(Loadout.name(it)) : lost ? `${U.esc(Loadout.name(it))}<small>in your grave</small>` : 'Empty'}</b>
        ${ok ? this.sightMenu(Loadout.gun(it)) : ''}${ok || lost ? `<button class="lx" data-act="loff" data-i="${i}" title="${Loadout.crit(it) ? 'Put it in your backpack' : 'Take it off'}">${icon('close')}</button>` : ''}</div>`;
    };
    const card = (it) => `<div class="card2"><div class="ic">${Thumbs.img(Loadout.pic(it), '', Loadout.icon(it))}</div>
      <div class="info"><h4>${U.esc(Loadout.name(it))}</h4><div class="chips">${this.gearChips(it).map((c) => `<span>${U.esc(c)}</span>`).join('')}</div>${this.sightMenu(Loadout.gun(it))}</div>
      <button class="price equip" data-act="lput" data-it="${it}">${sel == null ? 'Put on hotbar' : `Put in slot ${sel + 1}`}</button></div>`;
    return `<h5 class="shead">Your hotbar</h5><div class="lbar">${s.map(slot).join('')}</div>
      <p class="tip">${sel == null ? 'Click a slot to pick it, then click something in your locker to put it there (or another slot to swap the two). The X takes a thing off.' : `Slot ${sel + 1} picked: click something in your locker to put it here, or another slot to swap them.`}</p>
      <h5 class="shead">Your locker</h5>` + (locker.length ? `<div class="cards hats">${locker.map(card).join('')}</div>` : '<p class="tip">Everything you own is on your hotbar.</p>') + this.sightsHtml() + this.perksHtml();
  },
  // Every compatible gun carries its own compact attachment menu.
  sightsHtml() { return ''; },
  sightMenu(g) {
    if (g == null || !Number.isInteger(g) || !canSight(gunDef(g))) return '';
    const haveGun = g === -1 || SAVE.guns.includes(g), on = sightOf(g);
    const row = (id, name, status, disabled) => '<button type="button" data-act="scope-pick" data-g="'+g+'" data-s="'+id+'" '+(disabled?'disabled':'')+'><span>'+U.esc(name)+'</span><small>'+U.esc(status)+'</small></button>';
    const options = row('', 'No scope', on ? 'Equip' : 'Equipped', !haveGun || !on) + Object.entries(SIGHTS).map(([id,s]) => {
      const unlocked=planetUnlocked(s.planet), owned=(SAVE.sights||[]).includes(id);
      const status=!unlocked?'Unlock '+PLANETS[s.planet].name:!haveGun?'Buy this gun first':on===id?'Equipped':owned?'Equip':'Buy & equip · '+U.bucks(s.price);
      return row(id,s.name,status,!unlocked||!haveGun||on===id||(!owned&&SAVE.bucks<s.price));
    }).join('');
    return '<details class="scope-picker" data-act="scope-menu"><summary>Scope: '+U.esc(on?SIGHTS[on].short:'None')+'</summary><div class="scope-options">'+options+'</div></details>';
  },
  pickSight(g,id) {
    if (!Number.isInteger(g) || (g!==-1&&!SAVE.guns.includes(g)) || !canSight(gunDef(g))) return false;
    if (id) {
      const s=SIGHTS[id];
      if (!s || !planetUnlocked(s.planet)) { UI.toast('Unlock that planet first.', 'bad'); return false; }
      if (!(SAVE.sights||[]).includes(id)) {
        if (SAVE.bucks<s.price) { UI.toast('Not enough bucks!', 'bad'); return false; }
        addBucks(-s.price);
        if (!SAVE.sights) SAVE.sights=[];
        SAVE.sights.push(id);
        Sound.play('buy');
      } else Sound.play('reload');
    }
    this.fitSight(g,id);
    this.line=id?SIGHTS[id].name+' fitted to '+gunDef(g).name+'.':'Scope removed.';
    return true;
  },
  // put sight id on gun g (id '': take it off)
  fitSight(g, id) {
    if (!Number.isInteger(g) || (g!==-1&&!SAVE.guns.includes(g)) || !canSight(gunDef(g))) return;
    if (id && (!SIGHTS[id] || !planetUnlocked(SIGHTS[id].planet) || !(SAVE.sights||[]).includes(id))) return;
    if (!SAVE.sightOn) SAVE.sightOn = {};
    if (id && (SAVE.sights || []).includes(id) && canSight(gunDef(g))) SAVE.sightOn[g] = id; else delete SAVE.sightOn[g];
    persist();
    G.player.refitSight();
    UI.hud();
  },
  // the special items mini bosses drop (see PERKS): yours, and the ones still out there
  perksHtml() {
    const where = (mb) => { const pl = PLANETS.find((p) => p.id === mb); return pl ? pl.name : ''; };
    return `<h5 class="shead">Mini boss prizes</h5><div class="cards hats">` + Object.entries(PERKS).map(([id, k]) => {
      const got = hasPerk(id), mb = MINIBOSSES[k.mb];
      return `<div class="card2 ${got ? 'owned' : 'locked'}"><div class="ic">${got ? Thumbs.img('perk:' + id, '', k.icon) : icon('lock')}</div>
        <div class="info"><h4>${got ? U.esc(k.name) : '???'}</h4><div class="chips"><span>${U.esc(k.chip)}</span></div>
        <p>${got ? U.esc(k.desc) : `Beat ${U.esc(mb ? mb.name : 'its mini boss')} on ${U.esc(where(k.mb))} to get it.`}</p></div>
        ${got ? `<div class="badge ok">${icon('check')} YOURS</div>` : ''}</div>`;
    }).join('') + '</div>';
  },
  loadoutAct(act, d) {
    if (act === 'sighton') {
      this.fitSight(Number(d.g), d.s);
      Sound.play('reload');
      this.line = d.s ? U.pick(['Now you can see what you\'re missing.', 'Snapped right on. Mostly.', 'Looks professional. You don\'t, but it does.']) : 'Iron sights. Old school. Brave.';
      return;
    }
    const i = Number(d.i);
    if (act === 'lsel') {
      if (this.sel == null) this.sel = i;
      else if (this.sel === i) this.sel = null;
      else { Loadout.swap(this.sel, i); this.sel = null; Sound.play('reload'); }
    } else if (act === 'loff') {
      if (Loadout.crit(Loadout.slots()[i])) { // (a critter you're carrying: into your backpack, if there's room)
        if (!Loadout.stowCrit(i)) { UI.toast('Your backpack\'s full! Sell it instead (the Sell tab).', 'bad', 2.8); Sound.play('error'); return; }
        this.line = 'Into your backpack it goes. It was starting to smell.';
      } else {
        Loadout.clear(i);
        this.line = U.pick(['Into the locker it goes. I\'ll charge you rent on that eventually.', 'Taken off. It\'ll be here. Probably.', 'Your locker. Not a trash can. Well. Kind of.']);
      }
      if (this.sel === i) this.sel = null;
    } else if (act === 'lput') {
      const at = this.sel != null ? this.sel : Loadout.free();
      if (at < 0) { UI.toast('Your hotbar is full! Take something off (the X), or click a slot to swap it out.', 'bad', 2.8); Sound.play('error'); return; }
      if (Loadout.crit(Loadout.slots()[at]) && !Loadout.stowCrit(at)) { // (the critter in that slot goes in your backpack, or another free slot)
        const f = Loadout.free();
        if (f < 0) { UI.toast('There\'s a critter in that slot and your backpack\'s full! Sell it first (the Sell tab).', 'bad', 2.8); Sound.play('error'); return; }
        Loadout.swap(at, f);
      }
      Loadout.set(at, d.it);
      this.sel = null;
      Sound.play('reload');
      this.line = U.pick(['Good choice. They all shoot the same direction.', 'Classic. Like you. A classic mistake.', 'Swapped. No refunds on the old one. It\'s still yours though.']);
    }
    G.player.refreshGear();
    UI.hud();
  },
  // you bought something to hold: onto your hotbar (and into your hands), or into your locker if it's full
  gotGear(it, first) {
    const had = Loadout.slots().slice(), i = Loadout.add(it), name = Loadout.name(it);
    if (i < 0) { UI.toast(`${name} is in your locker: your hotbar's full. Swap it in on the Loadout tab.`, 'good', 4); this.tab = 'loadout'; return; }
    G.player.refreshGear();
    G.player.selectSlot(i, true);
    const out = had[i] && had[i] !== it && Loadout.owned(had[i]) ? ` (your ${Loadout.name(had[i])} went to your locker)` : '';
    UI.toast(first ? `Your first real gun! It's on your hotbar: {slot${i + 1}}${out}. {reload} to reload.` : `${name} is on your hotbar: {slot${i + 1}}${out}.` + (it === 'peel' ? ' Stand in the landing circles!' : ''), 'good', 4);
  },
  // you bought a sight: it goes on the gun in your hands if that one aims, and on every gun of yours that aims
  // and hasn't got one yet
  gotSight(id) {
    if (!SAVE.sights) SAVE.sights = [];
    if (!SAVE.sights.includes(id)) SAVE.sights.push(id);
    if (!SAVE.sightOn) SAVE.sightOn = {};
    const guns = [-1, ...SAVE.guns].filter((g) => canSight(gunDef(g)));
    const held = G.player && G.player.tool === 'zap' && canSight(gunDef(SAVE.zap)) ? SAVE.zap : null;
    for (const g of guns) if (g === held || !sightOf(g)) SAVE.sightOn[g] = id;
    const n = guns.filter((g) => SAVE.sightOn[g] === id).length;
    G.player.refitSight();
    UI.toast(`${SIGHTS[id].name}! It's on ${n === 1 ? 'your ' + gunDef(guns.find((g) => SAVE.sightOn[g] === id)).name : n + ' of your guns'}. Hold {aim} to look through it. Swap sights on the Loadout tab.`, 'good', 4.5);
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
      case 'zap': {
        const first = !SAVE.guns.length;
        if (!SAVE.guns.includes(it.lvl)) SAVE.guns.push(it.lvl);
        this.gotGear('gun:' + it.lvl, first);
        break;
      }
      case 'summon': Summons.earn(it.b); break;
      case 'cargo': SAVE.cargoLvl = Math.max(SAVE.cargoLvl, it.lvl); UI.toast(`Backpack upgraded: ${CARGO[SAVE.cargoLvl]} slots!`, 'good', 2.5); break;
      case 'vac': SAVE.vacLvl = Math.max(SAVE.vacLvl, it.lvl || 1); G.player.refreshGear(); this.gotGear('vac'); break;
      case 'boots': SAVE.boots = true; UI.toast('Double jump unlocked! Press {jump} twice.', 'good', 3); break;
      case 'skates': SAVE.skates = true; UI.toast('Duct-Tape Skates on! Hold {sprint} to really go.', 'good', 3); break;
      case 'dash': SAVE.dash = true; UI.toast('Getaway Sneakers! Press {dash} to dash (once in the air, too).', 'good', 3.5); break;
      case 'stomp': SAVE.stomp = true; UI.toast('Yeti Stompers! Jump, then press {stomp} to slam down.', 'good', 3.5); break;
      case 'springs': SAVE.springs = true; UI.toast('Spring-Heeled Jacks! Your jumps are WAY higher now.', 'good', 3.5); break;
      case 'cape': SAVE.cape = true; UI.toast('Glider Cape! Hold {jump} while you fall to glide.', 'good', 3.5); break;
      case 'jetpack': SAVE.jetpack = true; UI.toast('Jet Pack! In the air, hold {jump} to fly. Fuel refills on the ground.', 'good', 4); break;
      case 'drill': SAVE.drill = true; this.gotGear('drill'); break;
      case 'peel': SAVE.peel = true; this.gotGear('peel'); break;
      case 'socks': SAVE.socks = true; break;
      case 'armor': SAVE.armor = true; break;
      case 'life': SAVE.lifeIns = true; break;
      case 'charm': SAVE.charm = true; UI.toast('You feel lucky. (You are not.)', '', 2.5); break;
      case 'nades': SAVE.nades += 5; break;
      case 'hat': SAVE.hats.push(it.id); SAVE.hat = it.id; break;
      case 'sight': this.gotSight(it.id); break;
    }
    this.line = 'Pleasure doing business. No refunds.';
    persist();
    UI.hud();
  },

  // which shop section an item goes in
  section(it) {
    if (it.kind === 'zap' || it.kind === 'nades' || it.kind === 'sight') return 'weapons';
    if (it.kind === 'hat') return 'looks';
    if (it.kind === 'summon' || it.kind === 'charm') return 'special';
    return 'gear';
  },
  open(shopId, tab) {
    this.cur = shopId;
    const cfg = SHOPS[shopId];
    const items = !SAVE.guns.length && !cfg.items.some((it) => it.kind === 'zap' && it.lvl === 0) ? [STARTER_GUN, ...cfg.items] : cfg.items;
    const has = (sec) => sec === 'looks' || sec === 'loadout' || items.some((it) => this.section(it) === sec);
    if (!G.panel) {
      this.line = U.pick(cfg.greet);
      this.sel = null;
      this.tab = SAVE.cargo.length || Loadout.critters().length ? 'sell' : ['weapons', 'gear', 'special', 'looks'].find(has);
    }
    if (tab) this.tab = tab;
    if (this.tab !== 'sell' && !has(this.tab)) this.tab = ['weapons', 'gear', 'special', 'looks'].find(has);
    const cap = CARGO[SAVE.cargoLvl], value = Activities.cargoValue();
    const held = Loadout.critters(), nsell = SAVE.cargo.length + held.length; // (critters you're carrying in your hotbar sell too)
    const tabs = [['weapons', 'gun', 'Weapons'], ['gear', 'boots', 'Gear'], ['special', 'star', 'Special'], ['looks', 'hat', 'Cosmetics'], ['loadout', 'bag', 'Loadout'], ['sell', 'cash', `Sell${nsell ? ` (${nsell})` : ''}`]]
      .filter(([t]) => t === 'sell' || has(t))
      .map(([t, ic, lab]) => `<button class="stab ${this.tab === t ? 'on' : ''}" data-act="tab" data-t="${t}">${icon(ic)}${lab}</button>`).join('');
    const card = (it, i) => {
      const inf = this.itemInfo(it), poor = SAVE.bucks < it.price;
      const cls = inf.owned ? 'owned' : inf.locked ? 'locked' : poor ? 'poor' : '';
      const btn = inf.owned ? `<div class="badge ok">${icon('check')} ${inf.ownedMsg || 'OWNED'}</div>`
        : inf.locked ? `<div class="badge lock">${icon('lock')} ${U.esc(inf.lockMsg)}</div>`
        : `<button class="price" data-act="buy" data-i="${i}" ${poor ? 'disabled' : ''}>${U.bucks(it.price)}</button>`;
      return `<div class="card2 ${this.tier(it.price)} ${cls}">
        <div class="ic">${Thumbs.img(inf.pic, '', inf.icon)}</div>
        <div class="info"><h4>${U.esc(inf.name)}</h4><div class="chips">${inf.chips.map((c) => `<span>${U.esc(c)}</span>`).join('')}</div><p>${U.esc(inf.desc)}</p>${it.kind === 'zap' ? this.sightMenu(it.lvl) : ''}</div>
        ${btn}</div>`;
    };
    let body = '';
    if (this.tab === 'sell') {
      const counts = {};
      for (const id of SAVE.cargo) counts[id] = (counts[id] || 0) + 1;
      const rows = Object.keys(counts).sort((a, b) => cargoRes(b).v * counts[b] - cargoRes(a).v * counts[a]).map((id) => {
        const r = cargoRes(id);
        return `<div class="srow ${r.rare ? 'rare' : ''}"><div class="ic">${Thumbs.img(Thumbs.cargoKey(id), '', r.icon)}</div>
          <div class="info"><b>${U.esc(r.name)}</b><small>${U.esc(r.desc)}</small></div>
          <div class="qty">x${counts[id]}</div><div class="each">${U.bucks(r.v)} each</div>
          <button class="price small" data-act="sell1" data-id="${U.esc(id)}">${U.bucks(Activities.pays(r.v * counts[id]))}</button></div>`;
      }).join('');
      const hrows = held.map(([i, id]) => {
        const r = cargoRes(id);
        return `<div class="srow ${r.rare ? 'rare' : ''}"><div class="ic">${Thumbs.img(Thumbs.cargoKey(id), '', r.icon)}</div>
          <div class="info"><b>${U.esc(r.name)}</b><small>Hotbar slot ${i + 1}</small></div>
          <div class="qty">x1</div><div class="each"></div>
          <button class="price small" data-act="sellslot" data-i="${i}">${U.bucks(Activities.pays(r.v))}</button></div>`;
      }).join('');
      body = nsell
        ? (held.length ? `<h5 class="shead">In your hotbar</h5><div class="srows">${hrows}</div>` + (rows ? '<h5 class="shead">In your backpack</h5>' : '') : '') +
          (rows ? `<div class="srows">${rows}</div>` : '') + `<button class="sellall" data-act="sellall">Sell everything <b>${U.bucks(Activities.pays(value + Activities.heldValue()))}</b></button>` +
          (hasPerk('dice') ? '<p class="tip">Loaded Dice: you get 25% more for everything.</p>' : '')
        : `<div class="empty"><div>${Thumbs.img('cargo:' + SAVE.cargoLvl, '', 'bag')}</div>Your backpack is empty.<br>Go vacuum, catch or zap something!</div>`;
    } else if (this.tab === 'loadout') {
      body = this.loadoutHtml();
    } else if (this.tab === 'looks') {
      // hats for sale here, then everything you own to wear
      const forSale = items.map((it, i) => [it, i]).filter(([it]) => this.section(it) === 'looks');
      const hats = ['none', ...SAVE.hats.filter((h) => h !== 'none')];
      body = (forSale.length ? `<h5 class="shead">For sale</h5><div class="cards">${forSale.map(([it, i]) => card(it, i)).join('')}</div>` : '') +
        `<h5 class="shead">Your hats</h5><div class="cards hats">` + hats.map((h) => `<div class="card2 ${SAVE.hat === h ? 'owned' : ''}"><div class="ic">${Thumbs.img(h === 'none' ? Thumbs.crewKey(G.color, 'none', G.look) : 'hat:' + h, '', 'hat')}</div>
        <div class="info"><h4>${U.esc(HATS[h])}</h4></div>
        ${SAVE.hat === h ? '<div class="badge ok">WEARING</div>' : `<button class="price" data-act="hat" data-h="${h}">Wear</button>`}</div>`).join('') + '</div>' +
        '<p class="tip">Your hats come with you to every world. More come from other shops, and from Mystery Crates on Luckstar.</p>';
    } else {
      body = '<div class="cards">' + items.map((it, i) => [it, i]).filter(([it]) => this.section(it) === this.tab).map(([it, i]) => card(it, i)).join('') + '</div>';
      if (this.tab === 'weapons') body += '<p class="tip">Every gun you buy is yours to keep. Carry as many as you like on your hotbar: pick what goes where on the <b>Loadout</b> tab.</p>';
      if (this.tab === 'special') body += '<p class="tip">Summoning items belong to the whole crew: anyone can use them at the boss altar.</p>';
    }
    const html = `<div class="shop2" style="--acc:${cfg.color}">
      <aside class="keeper">
        <div class="face">${Thumbs.img('face:' + shopId, '', null) || initials(cfg.npc)}</div>
        <div class="kname">${U.esc(cfg.npc)}</div>
        <div class="bubble">${U.esc(this.line)}</div>
        <div class="wallet"><small>YOUR BUCKS</small><b>${U.bucks(SAVE.bucks)}</b></div>
        <div class="bag"><small>BACKPACK ${SAVE.cargo.length}/${cap}${value ? ` · worth ${U.bucks(value)}` : ''}</small><div class="meter"><i style="width:${Math.min(100, (SAVE.cargo.length / cap) * 100)}%"></i></div></div>
      </aside>
      <section class="wares"><div class="stabs">${tabs}</div><div class="wbody">${body}</div></section>
    </div>`;
    const handler = (act, d) => {
      if (act === 'scope-menu') return;
      if (act === 'scope-pick') this.pickSight(Number(d.g), d.s);
      if (act === 'tab') { this.tab = d.t; }
      if (act === 'buy') this.buy(items[Number(d.i)]);
      if (act === 'sellall' || act === 'sell1' || act === 'sellslot') {
        const knots = shopId === 'zorb' && (act === 'sellall' ? SAVE.cargo.includes('knot') : d.id === 'knot');
        const v = act === 'sellall' ? Activities.sellAll() : act === 'sellslot' ? Activities.sellSlot(Number(d.i)) : Activities.sellType(d.id);
        this.line = v >= 1000 ? 'WOW. That\'s a lot of stuff. Are you okay?' : v >= 200 ? 'Nice haul. Pleasure doing business.' : 'That\'s... it? Okay.';
        if (knots) this.line = 'Are those GARLIC KNOTS? The Emperor has wanted those for three years! ...I\'ll keep them. For quality control.';
        UI.toast(`Sold for ${U.bucks(v)}!`, 'good');
      }
      if (act === 'hat') { SAVE.hat = d.h; persist(); Sound.play('buy'); }
      if (act === 'lsel' || act === 'loff' || act === 'lput' || act === 'sighton') this.loadoutAct(act, d);
      this.open(shopId);
    };
    if (G.panel) { UI.setPanel(html); UI.panelHandler = handler; }
    else UI.openPanel(html, handler);
  },

  /* ----- boss altar panel ----- */
  openBoss() {
    const p = PLANETS[G.planet], bid = p.boss, b = BOSSES[bid], sm = SUMMONS[bid];
    // everyone here joins the fight (same rule as Game.startBoss)
    const n = 1 + [...G.remotes.values()].filter((r) => r.s.m === 'planet' && r.s.p === G.planet).length;
    const hp = Math.round(b.hp * (1 + 0.65 * (n - 1)));
    const first = !SAVE.beaten.includes(bid);
    const reward = first ? b.reward : Math.round(b.reward * 0.5);
    const rec = BOSS_REC[bid];
    const have = Summons.has(bid);
    // (the guns on your hotbar: that's what you'll have in there)
    const guns = Loadout.slots().map((x, i) => Loadout.gun(Loadout.at(i))).filter((g) => g != null), best = guns.length ? Math.max(...guns) : -2;
    const gun = (guns.length ? guns.map((g) => U.esc(gunDef(g).name)).join(', ') : 'None on your hotbar!') + (best < rec ? ` <span class="pill" style="background:#ff8a80">Recommended: ${U.esc(ZAPPERS[rec].name)}</span>` : '');
    const smPic = Thumbs.img('sum:' + bid, 'inline', sm.icon);
    const btn = !have ? `<button class="btn big" disabled style="max-width:440px">${smPic} You need ${U.esc(sm.name)}</button>`
      : `<button class="btn big red" data-act="summon" style="max-width:440px">${smPic} Use ${U.esc(sm.name)} to summon!</button>`;
    UI.openPanel(`
      <h2 class="ph">Boss Altar</h2>
      <div class="boss" style="margin-top:10px">
        <div class="ico" style="background:${b.color}">${Thumbs.img('boss:' + bid, '', null) || initials(b.name)}</div>
        <div><h4>${U.esc(b.name)}</h4><div class="stars">${'★'.repeat(b.stars)}${'☆'.repeat(Math.max(0, MAX_STARS - b.stars))} ${b.diff}</div><div class="q">"${U.esc(b.quote)}"</div></div>
        <div></div>
      </div>
      <div class="npc-line" data-who="TO SUMMON: ${U.esc(sm.name.toUpperCase())}">${have ? 'You have it! Use it here to summon the boss.' : U.esc(Summons.howText(bid))}</div>
      <table class="list">
        <tr><td>Health</td><td class="r"><b>${hp.toLocaleString()}</b> ${n > 1 ? `(scaled for ${n} goobers)` : ''}</td></tr>
        <tr><td>Reward (each player)</td><td class="r"><b>${U.bucks(reward)}</b> ${first ? '' : '(rematch: half)'}</td></tr>
        <tr><td>Your guns</td><td class="r">${gun}</td></tr>
        <tr><td>Lives</td><td class="r">One${n > 1 ? `. If you go down, a friend can pick you up, or you get back up after ${DIFFS[G.diff].revive}s while one of them is still standing` : '. Solo, dying loses the fight'}${DIFFS[G.diff].perma ? ' (Hardcore: for good)' : ''}</td></tr>
        <tr><td>Gear</td><td class="r">Grenades: ${SAVE.nades}${SAVE.armor ? ' · Company Armor' : ''}</td></tr>
        <tr><td>Status</td><td class="r">${G.progress.includes(bid) ? 'Beaten (next planet unlocked)' : 'Not beaten yet'}</td></tr>
      </table>
      <p class="muted">${keyKbd('Summoning uses up the item, win or lose, and pulls in everyone on the planet. Dodge with {forward}{left}{back}{right} + {jump} (jump over the glowing shockwave rings!). Red circles on the floor mean MOVE. If everybody goes down, the boss wins.')}</p>
      ${bid === 'zorblax' ? `<p class="muted">${SAVE.peel ? keyHtml('Tip: hold out your Pizza Peel ({tool:peel}) to catch the Emperor\'s flying pizza slices.') : 'Rumor has it Dave\'s Pizza Peel can catch flying pizza.'}</p>` : ''}
      <div class="center">${btn}</div>`,
    (act) => { if (act === 'summon') Game.requestSummon(bid); });
  },
};
