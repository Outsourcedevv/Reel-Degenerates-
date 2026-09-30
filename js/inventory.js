'use strict';
/* Physical cargo tray and the landed ship's personal equipment rack.
   Models are views of SAVE / Loadout, never a second inventory. */
function inventoryPlate(parent, text, w, h, x, y, z, color = '#ead9ad') {
  const m = signMesh(text, w, h, { bg: '#172329', color, border: false });
  m.position.set(x, y, z); parent.add(m); return m;
}
function inventoryFit(model, bounds, x, y, z) {
  let box = new THREE.Box3().setFromObject(model), size = box.getSize(new V3());
  const scale = Math.min(...bounds.map((v, i) => v / Math.max(.001, size.getComponent(i))));
  model.scale.multiplyScalar(scale);
  box = new THREE.Box3().setFromObject(model);
  const mid = box.getCenter(new V3()); model.position.add(new V3(x - mid.x, y - box.min.y, z - mid.z));
  return model;
}
function inventoryModel(it, cargo = false) {
  if (cargo && cargoRes(it).crit) return buildCarriedCritter(it, .3).g;
  const model = Thumbs.model(cargo ? Thumbs.cargoKey(it) : Loadout.pic(it));
  return model ? model.o : ITEM_MODELS['res:gear']();
}
function inventoryChanged() { G.player.refreshGear(); UI.hud(); persist(); }
function inventoryStow(i) {
  if (Loadout.crit(Loadout.slots()[i])) {
    if (!Loadout.stowCrit(i)) { UI.toast('Your backpack is full. The critter stays in its slot.', 'bad'); Sound.play('error'); return false; }
  } else Loadout.clear(i);
  inventoryChanged(); Sound.play('reload'); return true;
}
function inventoryEquip(it, i) {
  if (!Loadout.owned(it) || i < 0 || i >= HOTBAR) return false;
  // Gear already on the hotbar swaps slots, including any critter in the target.
  if (Loadout.find(it) < 0 && Loadout.crit(Loadout.slots()[i]) && !Loadout.stowCrit(i)) {
    const free = Loadout.free();
    if (free < 0) { UI.toast('That slot holds a critter and your backpack is full. Free a slot first.', 'bad'); Sound.play('error'); return false; }
    Loadout.swap(i, free);
  }
  Loadout.set(i, it); inventoryChanged(); G.player.selectSlot(i, true); Sound.play('reload');
  UI.toast(Loadout.name(it) + ' equipped in slot ' + (i + 1) + '.', 'good', 2); return true;
}

const PhysicalInventory = {
  on: false, page: 0, perPage: 8, chosen: null, hovered: null, pinned: false,
  init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, .05, 40);
    this.scene.add(new THREE.HemisphereLight('#d5ebf0', '#303448', .45));
    const light = new THREE.DirectionalLight('#fff1dc', .72); light.position.set(3, 8, 5); this.scene.add(light);
    // A light tint over the live world, with the pack rendered clearly on top.
    this.tintMaterial = new THREE.ShaderMaterial({
      uniforms: { fade: { value: 0 } },
      vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform float fade; void main(){ gl_FragColor = vec4(0.035, 0.065, 0.085, fade); }',
      transparent: true, depthTest: false, depthWrite: false,
    });
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.tintMaterial);
    backdrop.frustumCulled = false; this.tintScene = new THREE.Scene(); this.tintScene.add(backdrop);
    this.ray = new THREE.Raycaster(); this.pointer = new THREE.Vector2(2, 2);
    this.caption = document.createElement('div'); this.caption.id = 'pack-caption'; this.caption.className = 'hidden'; document.body.appendChild(this.caption);
    this.caption.addEventListener('click', e => {
      const button = e.target.closest('[data-pack-act]'); if (!this.on || !button) return;
      const action = button.dataset.packAct;
      if (action === 'close') this.close();
      else if (['use', 'favourite', 'drop'].includes(action)) this[action]();
    });
    const canvas = G.renderer.domElement;
    canvas.addEventListener('pointermove', e => {
      if (!this.on) return;
      const r = canvas.getBoundingClientRect(); this.pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      this.hover();
    });
    canvas.addEventListener('pointerdown', e => {
      if (!this.on) return;
      const r = canvas.getBoundingClientRect(); this.pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      e.preventDefault(); this.hover();
      const code = 'Mouse' + e.button;
      // Keep custom mouse bindings available inside the pack.
      if (['bag', 'use', 'nade', 'reload'].some(a => Keys.map[a] === code)) {
        if (this.hovered) { this.chosen = this.hovered; this.pinned = true; }
        Input.pressed[code] = !Input.keys[code]; Input.keys[code] = true; return;
      }
      if (e.button !== 0 && e.button !== 2) return;
      this.chosen = this.hovered; this.pinned = !!this.chosen; this.describe();
      if (!this.chosen) return;
      if (e.button === 2) this.favourite();
      else if (this.chosen.kind === 'page' || this.chosen.kind === 'slot') this.use();
      else Sound.play('click');
    });
    canvas.addEventListener('dblclick', e => {
      if (!this.on || e.button !== 0 || Keys.map.use === 'Mouse0') return;
      if (this.chosen && this.chosen.kind === 'cargo' && cargoRes(this.chosen.id).crit) this.use();
    });
    canvas.addEventListener('pointerleave', () => { if (this.on) { this.hovered = null; this.pointer.set(2, 2); this.describe(); } });
    canvas.addEventListener('wheel', e => {
      if (!this.on) return; e.preventDefault();
      if (performance.now() - (this.wheelAt || 0) < 180) return;
      this.wheelAt = performance.now(); this.turnPage(Math.sign(e.deltaY));
    }, { passive: false });
  },
  open() {
    if (this.on || !G.started || G.mode !== 'planet' || G.player.dead || G.player.down || G.panel || G.world.rising) return;
    if (!this.scene) this.init();
    this.on = true; this.page = 0; this.chosen = this.hovered = null; this.pinned = false; this.pointer.set(2, 2); this.world = G.world;
    this.openedAt = performance.now(); this.openDuration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 380;
    G.player.releaseTargets(); Game.wantLock = false; clearTimeout(Game.lockT); clearTimeout(Game.grabT); Game.setSoft(false); G.locked = false;
    Input.keys = {}; Input.pressed = {}; Input.dx = Input.dy = 0;
    document.body.classList.add('pack-open'); this.caption.classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
    this.rebuild(); Game.updatePause(); Sound.play('open');
  },
  close(noLock = false) {
    if (!this.on) return;
    this.on = false; this.chosen = this.hovered = null; this.pinned = false; document.body.classList.remove('pack-open'); this.caption.classList.add('hidden');
    G.renderer.domElement.style.cursor = ''; Input.keys = {}; Input.pressed = {}; Input.dx = Input.dy = 0;
    if (this.root) { this.scene.remove(this.root); disposeObj(this.root); this.root = null; }
    Sound.play('close'); if (!noLock) Game.lock(); Game.updatePause();
  },
  signature() { return JSON.stringify([SAVE.cargo, SAVE.slots, SAVE.favourites, SAVE.cargoLvl, SAVE.vacLvl, SAVE.guns, SAVE.drill, SAVE.peel, SAVE.sightOn, SAVE.perks, SAVE.magnetLvl, SAVE.bucks]); },
  stacks() {
    const counts = new Map(); for (const id of SAVE.cargo) counts.set(id, (counts.get(id) || 0) + 1);
    return [...counts].sort((a, b) => cargoRes(b[0]).v * b[1] - cargoRes(a[0]).v * a[1] || a[0].localeCompare(b[0]));
  },
  turnPage(dir) {
    const pages = Math.max(1, Math.ceil(this.stacks().length / this.perPage));
    const next = U.clamp(this.page + dir, 0, pages - 1); if (next === this.page) return;
    this.page = next; this.chosen = this.hovered = null; this.pinned = false; this.pointer.set(2, 2); this.rebuild(); Sound.play('click');
  },
  addAction(group, action) { group.userData.inventoryAction = action; this.actions.push(group); action.group = group; return action; },
  rebuild() {
    const selected = this.chosen && this.chosen.key;
    if (this.root) { this.scene.remove(this.root); disposeObj(this.root); }
    this.root = new THREE.Group(); this.scene.add(this.root); this.actions = [];
    const root = this.root, stacks = this.stacks(), pages = Math.max(1, Math.ceil(stacks.length / this.perPage));
    this.page = Math.min(this.page, pages - 1);
    const lid = grp(root, 0, 1.88, -1.47); lid.rotation.x = -.18;
    mk(BOX(4.35, 2.6, .19), '#c46632', lid); mk(BOX(3.98, 2.23, .025), '#344047', lid, 0, 0, .11);
    for (const x of [-1.45, 1.45]) { mk(BOX(.12, 1.88, .08), '#aeb6b3', lid, x, 0, .15); mk(BOX(.38, .26, .15), '#d7b16a', lid, x, -.89, .21); }
    inventoryPlate(lid, ['FIELD PACK', SAVE.cargo.length + ' / ' + CARGO[SAVE.cargoLvl] + ' ITEMS · ' + U.bucks(Activities.cargoValue())], 2.8, .55, 0, .58, .16);
    inventoryPlate(lid, 'POCKETS ' + (this.page + 1) + ' / ' + pages + ' · STACKS OF THE SAME ITEM', 2.8, .24, 0, .1, .16);
    for (const [x, dir, name] of [[-1.75, -1, '‹'], [1.75, 1, '›']]) {
      const tab = grp(lid, x, .12, .18); inventoryPlate(tab, name, .3, .35, 0, 0, 0);
      this.addAction(tab, { key: 'page:' + dir, kind: 'page', dir, name: dir < 0 ? 'Previous pockets' : 'Next pockets' });
    }
    const passives = (SAVE.magnetLvl ? ['magnet'] : []).concat((SAVE.perks || []).filter(id => PERKS[id]).map(id => 'perk:' + id));
    passives.forEach((id, i) => {
      const group = grp(lid, (i - (passives.length - 1) / 2) * .45, -.64, .25);
      const model = Thumbs.model(id); if (model) group.add(inventoryFit(model.o, [.32, .3, .18], 0, 0, 0));
      this.addAction(group, { key: id, kind: 'passive', name: id === 'magnet' ? 'Pickup Magnet' : PERKS[id.slice(5)].name, id });
    });
    mk(BOX(4.3, .5, 2.9), '#c46632', root, 0, .3, 0); mk(BOX(4.05, .05, 2.65), '#28363e', root, 0, .58, 0);
    for (const x of [-2.08, 2.08]) mk(BOX(.14, .4, 2.82), '#d98345', root, x, .66, 0);
    for (const z of [-1.4, 1.4]) mk(BOX(4.3, .4, .14), '#d98345', root, 0, .66, z);
    mk(BOX(3.96, .3, .04), '#52636a', root, 0, .74, 0);
    for (const x of [-1, 0, 1]) mk(BOX(.035, .3, 2.6), '#52636a', root, x, .74, 0);
    for (let i = 0; i < this.perPage; i++) {
      const x = (i % 4 - 1.5), z = i < 4 ? -.67 : .67, stack = stacks[this.page * this.perPage + i];
      const group = grp(root, x, 0, z); mk(BOX(.88, .03, 1.14), '#23323a', group, 0, .62, 0);
      if (!stack) continue;
      const [id, count] = stack, r = cargoRes(id), action = this.addAction(group, { key: 'cargo:' + id, kind: 'cargo', id, count, name: r.name });
      group.add(inventoryFit(inventoryModel(id, true), [.73, .6, .68], 0, .64, -.08));
      const tag = inventoryPlate(group, [r.name, U.bucks(r.v) + ' EACH'], .88, .26, 0, .72, .45); tag.rotation.x = -.35;
      action.countBadge = inventoryPlate(group, '×' + count, .46, .27, -.21, 1.055, .42, '#fff4ce');
      action.countBadge.rotation.x = -.35;
      if (Activities.favourite(id)) inventoryPlate(group, '★', .24, .24, .32, .98, .4, '#ffd45c');
      action.ring = mk(BOX(.85, .007, 1.12), '#e3bf6b', group, 0, .642, 0); action.ring.visible = false;
    }
    if (!stacks.length) inventoryPlate(lid, ['EMPTY PACK', 'Collect loot on the planet.'], 2.8, .35, 0, -.25, .18);
    inventoryPlate(root, 'FAVOURITES STAY WITH YOU WHEN SELLING', 3.7, .23, 0, .35, 1.47);
    for (let i = 0; i < HOTBAR; i++) {
      const x = (i - 2) * .85, it = Loadout.slots()[i], group = grp(root, x, 0, 2.05);
      mk(BOX(.76, .12, .7), '#34464e', group, 0, .18, 0);
      const action = this.addAction(group, { key: 'slot:' + i, kind: 'slot', i, id: Loadout.crit(it), name: it ? Loadout.name(it) : 'Empty hotbar slot' });
      if (it && Loadout.valid(it)) { const m = inventoryModel(it); if (!Loadout.crit(it)) m.rotation.y = PI / 2; group.add(inventoryFit(m, [.65, .35, .48], 0, .25, -.07)); }
      const status = it && !Loadout.at(i) ? 'IN YOUR GRAVE' : it ? Loadout.short(it) : 'EMPTY';
      inventoryPlate(group, [Keys.name('slot' + (i + 1)) + ' · ' + status], .76, .22, 0, .32, .38);
      if (action.id && Activities.favourite(action.id)) inventoryPlate(group, '★', .18, .18, .27, .6, .2, '#ffd45c');
      action.ring = mk(BOX(.77, .012, .72), '#e3bf6b', group, 0, .249, 0); action.ring.visible = false;
    }
    this.chosen = this.actions.map(g => g.userData.inventoryAction).find(a => a.key === selected) || null;
    this.hovered = null; if (!this.chosen) this.pinned = false;
    this.layout(); this.root.updateMatrixWorld(true); this.lastSignature = this.signature(); this.describe();
  },
  hover() {
    this.layout(); this.root.updateMatrixWorld(true);
    this.ray.setFromCamera(this.pointer, this.camera);
    const hits = this.ray.intersectObjects(this.actions, true); let next = null;
    if (hits.length) { let group = hits[0].object; while (group && !group.userData.inventoryAction) group = group.parent; next = group && group.userData.inventoryAction; }
    this.hovered = next;
    if (next && !this.pinned) this.chosen = next;
    G.renderer.domElement.style.cursor = next ? 'pointer' : 'default'; this.describe();
  },
  describe() {
    const a = this.chosen, esc = U.esc;
    for (const g of this.actions) { const action = g.userData.inventoryAction; if (action.ring) action.ring.visible = action === a || action === this.hovered; }
    let detail = 'Point at an item to inspect it', controls = 'Mouse wheel: pockets';
    if (a) {
      detail = a.name;
      if (a.id && (a.kind === 'cargo' || a.kind === 'slot')) {
        const r = cargoRes(a.id); detail += (a.kind === 'cargo' ? ' · ' + a.count + ' in stack' : '') + ' · ' + U.bucks(r.v) + ' each' + (Activities.favourite(a.id) ? ' · ★ Favourite' : '');
        controls = '{nade}: favourite · {reload}: drop one';
        if (a.kind === 'slot') controls = '{use}: put in backpack · ' + controls;
        else if (r.crit) controls = '{use}: carry in a free slot · ' + controls;
      } else if (a.kind === 'slot') controls = '{use}: select slot · {reload}: stow in ship locker';
      else if (a.kind === 'page') controls = '{use}: turn pockets';
      else if (a.kind === 'passive') { detail += ' · Always active'; controls = a.id === 'magnet' ? MAGNET[SAVE.magnetLvl].range + 'm pickup radius · Ghosts excluded' : PERKS[a.id.slice(5)].desc; }
    }
    const button = (act, text) => '<button type="button" data-pack-act="' + act + '">' + esc(text) + '</button>';
    let buttons = '';
    if (a && a.id && (a.kind === 'cargo' || a.kind === 'slot')) {
      const r = cargoRes(a.id);
      if (a.kind === 'slot' || r.crit) buttons += button('use', a.kind === 'slot' ? 'Put in backpack' : 'Carry critter');
      buttons += button('favourite', Activities.favourite(a.id) ? 'Unfavourite' : 'Favourite') + button('drop', 'Drop one');
    } else if (a && a.kind === 'slot') buttons += button('use', 'Select slot') + button('drop', 'Stow gear');
    else if (a && a.kind === 'page') buttons += button('use', 'Turn pockets');
    UI.setHtml(this.caption, '<b>' + esc(detail) + '</b><span>' + keyHtml(controls) + '</span><div class="pack-actions">' + buttons + button('close', 'Close pack · ' + Keys.name('bag')) + '</div><small>Click: select · Right click: favourite · Double click: carry critter · Mouse wheel: pockets</small>');
  },
  use() {
    const a = this.chosen; if (!a) return;
    if (a.kind === 'page') { this.turnPage(a.dir); return; }
    if (a.kind === 'slot') {
      if (Loadout.crit(Loadout.slots()[a.i])) inventoryStow(a.i);
      else G.player.selectSlot(a.i, true);
    } else if (a.kind === 'cargo' && cargoRes(a.id).crit) {
      const j = SAVE.cargo.indexOf(a.id), slot = j < 0 ? -1 : Loadout.holdCrit(a.id);
      if (slot < 0) { UI.toast('Your hotbar is full. The critter stays in your pack.', 'bad'); Sound.play('error'); return; }
      SAVE.cargo.splice(j, 1); inventoryChanged(); G.player.selectSlot(slot, true); Sound.play('click');
    }
    this.rebuild();
  },
  favourite() {
    const a = this.chosen; if (!a || !a.id || (a.kind !== 'cargo' && a.kind !== 'slot')) return;
    Activities.toggleFavourite(a.id); Sound.play('click'); this.rebuild();
  },
  drop() {
    const a = this.chosen; if (!a) return;
    if (a.kind === 'cargo' && SAVE.cargo.includes(a.id)) Drops.drop([a.id]);
    else if (a.kind === 'slot') {
      const id = Loadout.crit(Loadout.slots()[a.i]);
      if (id) Drops.drop([id], a.i); else inventoryStow(a.i);
    }
    this.rebuild();
  },
  keys() {
    if (Input.hit('bag') || Input.tap('Escape')) { this.close(); return; }
    for (let i = 0; i < HOTBAR; i++) if (Input.hit('slot' + (i + 1))) { this.chosen = this.actions.map(g => g.userData.inventoryAction).find(a => a.key === 'slot:' + i); this.pinned = true; this.pointer.set(2, 2); }
    if (Input.hit('use')) this.use();
    else if (Input.hit('nade')) this.favourite();
    else if (Input.hit('reload')) this.drop();
  },
  update() {
    if (!this.on) return;
    if (G.mode !== 'planet' || G.world !== this.world || G.player.dead || G.player.down || G.player.ghost || G.panel || G.world.rising) { this.close(); return; }
    if (this.signature() !== this.lastSignature) this.rebuild();
  },
  layout() {
    const aspect = innerWidth / innerHeight; this.camera.aspect = aspect; this.camera.updateProjectionMatrix();
    const distance = Math.max(9.4, 7.6 / aspect), pitch = .57, target = new V3(0, .8, .3);
    this.camera.position.set(.14 * distance, target.y + Math.sin(pitch) * distance, target.z + Math.cos(pitch) * distance); this.camera.lookAt(target);
    this.camera.updateMatrixWorld(true);
    // Lift the pack into view and fade its tint, without replaying on item changes.
    const progress = this.openDuration ? U.clamp((performance.now() - this.openedAt) / this.openDuration, 0, 1) : 1;
    const eased = 1 - Math.pow(1 - progress, 3), remaining = 1 - eased;
    this.root.position.copy(new V3(0, 1, 0).applyQuaternion(this.camera.quaternion)).multiplyScalar(-6.8 * remaining);
    this.root.rotation.x = -.08 * remaining;
    this.tintMaterial.uniforms.fade.value = .22 * eased;
    this.caption.style.opacity = String(eased);
    this.caption.style.transform = 'translate(-50%, ' + (12 * remaining).toFixed(2) + 'px)';
  },
  render() {
    this.hover();
    const renderer = G.renderer, autoClear = renderer.autoClear;
    try {
      renderer.autoClear = false; renderer.clearDepth();
      renderer.render(this.tintScene, this.camera); renderer.render(this.scene, this.camera);
    }
    finally { renderer.autoClear = autoClear; }
  },
};

class ShipLocker {
  constructor(world) {
    this.world = world; this.page = 0; this.root = new THREE.Group(); this.root.name = 'personal-ship-locker'; this.root.userData.dynamic = true;
    // Starboard rear bulkhead, behind the ramp: clear of the seats and cockpit.
    this.root.position.set(1.49, CABIN.floor + .06, -1.98); this.root.rotation.y = -PI / 2;
    const g = this.root;
    mk(BOX(1.72, 1.97, .14), '#34454e', g, 0, .985, -.1);
    mk(BOX(1.57, 1.55, .025), '#1b2a32', g, 0, 1.06, -.015);
    for (const x of [-.82, .82]) mk(BOX(.065, 1.98, .25), '#87959a', g, x, .99, -.03);
    for (let x = -.74; x < .8; x += .15) mk(BOX(.008, 1.5, .014), '#465761', g, x, 1.08, .006);
    inventoryPlate(g, 'PERSONAL EQUIPMENT', 1.51, .14, 0, 1.87, .07);
    this.header = inventoryPlate(g, '', 1.05, .11, 0, 1.68, .07);
    for (const [x, dir] of [[-.66, -1], [.66, 1]]) {
      inventoryPlate(g, dir < 0 ? '‹' : '›', .19, .14, x, 1.68, .07);
      this.interaction(x, 1.68, .09, () => dir < 0 ? 'Previous locker rack' : 'Next locker rack', () => { this.page += dir; this.update(true); Sound.play('click'); });
    }
    this.cells = [];
    for (let i = 0; i < 4; i++) {
      const x = i % 2 ? .4 : -.4, y = i < 2 ? 1.1 : .52;
      mk(BOX(.75, .045, .38), '#455861', g, x, y - .03, .14);
      const tag = inventoryPlate(g, '', .72, .12, x, y - .05, .34);
      this.cells.push({ x, y, tag, model: null, it: null });
      this.interaction(x, y + .18, .17, () => this.cells[i].it ? 'Equip ' + Loadout.name(this.cells[i].it) + ' in slot ' + (G.player.slot + 1) : 'Empty rack — buy gear at the equipment stand', () => { const it = this.cells[i].it; if (it) inventoryEquip(it, G.player.slot); this.update(true); });
    }
    this.slots = [];
    for (let i = 0; i < HOTBAR; i++) {
      const x = (i - 2) * .31;
      mk(BOX(.28, .04, .28), '#263841', g, x, .16, .16);
      const tag = inventoryPlate(g, '', .29, .14, x, .13, .33); this.slots.push(tag);
      this.interaction(x, .16, .34, () => {
        const it = Loadout.slots()[i], name = it ? Loadout.name(it) : 'Empty';
        return 'Slot ' + (i + 1) + ': ' + name + (G.player.slot === i && it ? ' — stow' : ' — select');
      }, () => { if (G.player.slot === i && Loadout.slots()[i]) inventoryStow(i); else G.player.selectSlot(i, true); this.update(true); });
    }
    this.update(true);
  }
  interaction(x, y, z, label, use) {
    if (!this.world) return;
    this.root.updateMatrixWorld(true);
    const aim = this.root.localToWorld(new V3(x, y, z)).add(this.world.parked.position);
    const it = this.world.interact(aim.x, aim.z, 1.85, label, use, aim.y); it.aim = aim;
    it.available = () => {
      const p = G.player.pos, ship = this.world.parked.position;
      return this.world.parked.visible && p.y >= ship.y + CABIN.floor - .3 && p.y < ship.y + 4.75
        && Math.abs(p.x - ship.x) < 1.6 && p.z - ship.z > -2.85 && p.z - ship.z < 1.65;
    };
    it.locker = true;
  }
  update(force = false) {
    const all = Loadout.all(), pages = Math.max(1, Math.ceil(all.length / 4)); this.page = U.clamp(this.page, 0, pages - 1);
    const signature = JSON.stringify([all, SAVE.slots, SAVE.vacLvl, SAVE.sightOn, G.player ? G.player.slot : 0, this.page]);
    if (!force && signature === this.lastSignature) return; this.lastSignature = signature;
    updateTradeTag(this.header, [(this.page + 1) + ' / ' + pages + ' · EQUIP TO SLOT ' + ((G.player ? G.player.slot : 0) + 1)]);
    this.cells.forEach((cell, i) => {
      const it = all[this.page * 4 + i];
      if (cell.model) { this.root.remove(cell.model); disposeObj(cell.model); cell.model = null; }
      cell.it = it;
      if (it) {
        const model = inventoryModel(it); model.rotation.y = PI / 2;
        this.root.add(inventoryFit(model, [.67, .4, .28], cell.x, cell.y, .13)); cell.model = model;
      }
      updateTradeTag(cell.tag, it ? [Loadout.short(it), Loadout.find(it) >= 0 ? 'SLOT ' + (Loadout.find(it) + 1) : 'IN LOCKER'] : ['EMPTY']);
    });
    this.slots.forEach((tag, i) => updateTradeTag(tag, [Keys.name('slot' + (i + 1)) + (G.player && G.player.slot === i ? ' ◀' : ''), Loadout.at(i) ? Loadout.short(Loadout.at(i)) : Loadout.slots()[i] ? 'IN GRAVE' : 'EMPTY']));
  }
}
