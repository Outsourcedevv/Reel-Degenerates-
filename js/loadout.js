'use strict';
/* =========================================================
   Your hotbar: HOTBAR slots (keys 1-5, see controls.js),
   each holding one thing: a gun (as many guns as you like),
   the Grabby Vac, the Laser Drill or the Pizza Peel. The
   rest of what you own waits in your locker. Swap things in
   and out (or take anything off) at the landed ship's locker.
   Pressing a slot's key takes out what's in that slot, and
   only that: it never flips to some other gun.
   A slot remembers what was in it even while you don't have
   that thing (you died and it's lying in your grave), and
   it's back in the same slot when you pick your stuff up.
   Things: 'gun:-1' (the Squirt Pistol), 'gun:0'... (ZAPPERS),
   'vac', 'drill', 'peel', and critters you zapped: 'crit:' and
   the backpack entry (see cargoRes). A critter rides in a slot
   when your backpack's full, or when you put it there (the
   backpack screen): you carry it about until you sell it.
   ========================================================= */
const HOTBAR = 5;
const Loadout = {
  gun(it) { const m = /^gun:(-?\d+)$/.exec(it || ''); return m ? Number(m[1]) : null; },
  // the critter in it (its backpack entry), or null
  crit(it) { return typeof it === 'string' && it.startsWith('crit:') ? it.slice(5) : null; },
  // what kind of tool it is (every gun is 'zap', every critter 'crit')
  tool(it) { return this.gun(it) != null ? 'zap' : this.crit(it) ? 'crit' : it === 'vac' || it === 'drill' || it === 'peel' ? it : null; },
  valid(it) {
    const g = this.gun(it), c = this.crit(it);
    if (c) return !!cargoRes(c).crit;
    return g != null ? g === -1 || !!ZAPPERS[g] : it === 'vac' || it === 'drill' || it === 'peel';
  },
  // do you have it right now? (a critter: as long as it's in a slot)
  owned(it) {
    if (!this.valid(it)) return false;
    if (this.crit(it)) return this.slots().includes(it);
    const g = this.gun(it);
    if (g != null) return g === -1 || SAVE.guns.includes(g);
    return it === 'vac' || (it === 'drill' && !!SAVE.drill) || (it === 'peel' && !!SAVE.peel);
  },
  name(it) {
    const g = this.gun(it), c = this.crit(it);
    if (c) return cargoRes(c).name;
    if (g != null) return gunDef(g).name;
    return { vac: SAVE.vacLvl === 2 ? 'Spooky Vacuum' : SAVE.vacLvl > 0 ? 'Turbo Grabby Vac' : 'Grabby Vac', drill: 'Laser Drill', peel: 'Pizza Peel' }[it] || '';
  },
  short(it) {
    const g = this.gun(it), c = this.crit(it);
    if (c) return (RES[c.split('*')[0]] || cargoRes(c)).name; // (without the style bonus on the end)
    return g != null ? gunDef(g).short : { vac: SAVE.vacLvl === 2 ? 'Spooky Vacuum' : 'Grabby Vac', drill: 'Laser Drill', peel: 'Pizza Peel' }[it] || '';
  },
  pic(it) { const g = this.gun(it), c = this.crit(it); return c ? Thumbs.cargoKey(c) : g != null ? 'zap:' + g + (sightOf(g) ? ':' + sightOf(g) : '') : it === 'vac' ? 'vac:' + SAVE.vacLvl : it; },
  icon(it) { return this.gun(it) != null ? 'gun' : this.crit(it) ? 'paw' : it; },
  // the critters riding on your hotbar: [[slot, entry]]
  critters() { const out = []; this.slots().forEach((it, i) => { const c = this.crit(it); if (c) out.push([i, c]); }); return out; },
  // put a critter (a backpack entry) in a free slot: the slot, or -1 (no room)
  holdCrit(entry, at = -1) {
    const s = this.slots(), i = at >= 0 && (!s[at] || !this.owned(s[at])) ? at : this.free();
    if (i < 0) return -1;
    s[i] = 'crit:' + entry;
    persist();
    return i;
  },
  // take the critter out of slot i (it's gone from your hotbar: sold, dropped, or back in your backpack)
  dropCrit(i) { const s = this.slots(); if (this.crit(s[i])) { s[i] = null; persist(); } },
  // put the critter in slot i back in your backpack (false: there's no room in there)
  stowCrit(i) {
    const c = this.crit(this.slots()[i]);
    if (!c) return true;
    if (SAVE.cargo.length >= CARGO[SAVE.cargoLvl]) return false;
    SAVE.cargo.push(c);
    this.dropCrit(i);
    return true;
  },
  // everything you own, guns first (weakest to best), then the tools
  all() {
    const l = ['gun:-1', ...SAVE.guns.filter((g) => ZAPPERS[g]).sort((a, b) => a - b).map((g) => 'gun:' + g), 'vac'];
    if (SAVE.drill) l.push('drill');
    if (SAVE.peel) l.push('peel');
    return l;
  },

  /* ----- the slots ----- */
  // a new player: the Squirt Pistol and the Grabby Vac
  initial() { return ['gun:-1', 'vac', null, null, null]; },
  // a save from before the hotbar: the gun you had out, the vac, your drill and peel, then your best other guns
  fromOld(d) {
    const s = ['gun:' + (d.zap == null ? -1 : d.zap), 'vac', d.drill ? 'drill' : null, d.peel ? 'peel' : null, null];
    const guns = (Array.isArray(d.guns) ? d.guns : []).filter((g) => ZAPPERS[g] && g !== d.zap).sort((a, b) => b - a);
    for (let i = 0; i < HOTBAR && guns.length; i++) if (!s[i]) s[i] = 'gun:' + guns.shift();
    return s;
  },
  slots() {
    let s = SAVE.slots;
    if (!Array.isArray(s)) s = SAVE.slots = this.initial();
    if (s.length !== HOTBAR) { s.length = HOTBAR; for (let i = 0; i < HOTBAR; i++) if (s[i] === undefined) s[i] = null; }
    return s;
  },
  // what's in slot i that you can actually use right now (null: nothing, or something you don't have at the moment)
  at(i) { const it = this.slots()[i]; return it && this.owned(it) ? it : null; },
  // which slot it's in (-1: your locker)
  find(it) { return this.slots().indexOf(it); },
  // the first slot with a usable one of these ('zap': any gun)
  findTool(tool) { for (let i = 0; i < HOTBAR; i++) if (this.tool(this.at(i)) === tool) return i; return -1; },
  firstUsed() { for (let i = 0; i < HOTBAR; i++) if (this.at(i)) return i; return -1; },
  // what you own that isn't on the hotbar
  locker() { const s = this.slots(); return this.all().filter((it) => !s.includes(it)); },
  // put it in slot i (if it's in another slot already, the two swap)
  set(i, it) {
    const s = this.slots();
    if (i < 0 || i >= HOTBAR || !this.owned(it)) return;
    const j = s.indexOf(it);
    if (j === i) return;
    if (j >= 0) s[j] = s[i] && this.owned(s[i]) ? s[i] : null;
    s[i] = it;
    persist();
  },
  swap(i, j) { const s = this.slots(); [s[i], s[j]] = [s[j], s[i]]; persist(); },
  clear(i) { this.slots()[i] = null; persist(); },
  // a free slot: an empty one, or one saving a spot for something you don't have right now
  free() {
    const s = this.slots();
    for (let i = 0; i < HOTBAR; i++) if (!s[i]) return i;
    for (let i = 0; i < HOTBAR; i++) if (!this.owned(s[i])) return i;
    return -1;
  },
  // you just got it (bought it): onto the hotbar if there's room. Your first real gun takes the Squirt
  // Pistol's place (the pistol goes to your locker). Returns the slot, or -1 (it's in your locker).
  add(it) {
    const s = this.slots();
    if (!this.owned(it)) return -1;
    if (s.includes(it)) return s.indexOf(it);
    const sq = s.indexOf('gun:-1');
    let i = this.gun(it) != null && sq >= 0 && !SAVE.guns.some((g) => g !== this.gun(it) && s.includes('gun:' + g)) ? sq : this.free();
    if (i < 0 && sq >= 0) i = sq; // (full: the Squirt Pistol makes room, nobody will miss it)
    if (i < 0) return -1;
    s[i] = it;
    persist();
    return i;
  },
  // you died and dropped your gear: if that leaves you without a gun, the Squirt Pistol comes out of your
  // locker (into a free slot, or the first one saving a spot for something you lost)
  afterDeath() {
    const s = this.slots();
    if (this.findTool('zap') >= 0 || s.includes('gun:-1')) return;
    const i = this.free();
    s[i >= 0 ? i : 0] = 'gun:-1';
    persist();
  },
  // you picked your grave back up: everything goes back in the slot it was in when you died (unless
  // you've put something else there since: then it goes wherever there's room)
  restore(old) {
    if (!Array.isArray(old)) return;
    const s = this.slots();
    // (a Squirt Pistol on the hotbar that wasn't there before was only standing in, see afterDeath: it goes
    // back to your locker, unless no gun came back)
    const stop = old.includes('gun:-1') ? -1 : s.indexOf('gun:-1');
    if (stop >= 0) s[stop] = null;
    old.forEach((it, i) => {
      if (!it || i >= HOTBAR || !this.owned(it) || s.includes(it)) return; // (not back, or already out again)
      if (!s[i] || !this.owned(s[i])) s[i] = it;
      else { const f = this.free(); if (f >= 0) s[f] = it; } // (you put something else there since)
    });
    if (stop >= 0 && this.findTool('zap') < 0) { const f = this.free(); s[f >= 0 ? f : stop] = 'gun:-1'; }
    persist();
  },

};
