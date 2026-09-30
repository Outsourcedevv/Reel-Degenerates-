// Fresh browser test context: all player/global mutations are restored.
function testHealingAndSpooky() {
  const check = (v, message) => { if (!v) throw Error(message); };
  const old = { mode: G.mode, diff: G.diff }, results = [];
  try {
    for (const [difficulty, expected] of [['easy', [10, 5]], ['hard', [6, 3]], ['hardcore', [6, 3]]]) {
      G.diff = difficulty;
      for (const [i, mode] of ['planet', 'boss'].entries()) {
        G.mode = mode;
        const p = { hp: 20, regenT: 4, dead: false, ghost: false };
        const heal = dt => LocalPlayer.prototype.regenerate.call(p, dt);
        heal(3); check(p.hp === 20, 'Damage delay must prevent healing');
        heal(1.5); check(p.hp === 20 + expected[i] * .5, 'Only time after delay heals');
        p.hp = 20; p.regenT = 0;
        for (let frame = 0; frame < 60; frame++) heal(1 / 60);
        check(Math.abs(p.hp - 20 - expected[i]) < 1e-8, difficulty + '/' + mode + ' rate');
        p.hp = 99; heal(10); check(p.hp === 100, 'Health capped at 100');
        for (const flag of ['dead', 'ghost']) { p.hp = 20; p[flag] = true; heal(10); check(p.hp === 20, 'No healing while ' + flag); p[flag] = false; }
        results.push(difficulty + '/' + mode + ': ' + expected[i] + ' HP/s');
      }
    }
    G.mode = 'space'; const p = { hp: 20, regenT: 0 };
    LocalPlayer.prototype.regenerate.call(p, 10); check(p.hp === 20, 'No new in-flight healing');
    const a = buildSpookyVacVM(), b = buildVacVM('spooky');
    check(a.name === b.name && a.userData.muzzle.position.z === -.65, 'Spooky model entry and intake alignment');
    for (const k of ['muzzle', 'noz', 'glow']) check(a.userData[k].parent === a && a.userData[k] !== b.userData[k], 'Independent ' + k);
    let count = 0; a.traverse(o => { if (o.isMesh) { count++; check(Array.from(o.geometry.attributes.position.array).every(Number.isFinite), 'Finite model geometry'); } });
    check(count < 22, 'Spooky static geometry is batched');
    disposeObj(a); disposeObj(b); results.push('Spooky vacuum: geometry, animation attachments and batching');
    Game.loadPlanet(4);
    const item = SHOPS.spook.items.find(it => it.kind === 'vac' && it.lvl === 2);
    check(!!item, 'Spookolon shop sells the Spooky Vacuum');
    const oldBucks = SAVE.bucks, oldLevel = SAVE.vacLvl;
    SAVE.bucks = item.price + 1; SAVE.vacLvl = 1;
    G.player.refreshGear(); Shop.buy(item);
    check(SAVE.vacLvl === 2 && G.player.vmVac.name === 'Spooky Vacuum', 'Buying Spooky Vacuum equips its model');
    check(Thumbs.url('vac:2').startsWith('data:image/'), 'Spooky Vacuum thumbnail renders');
    SAVE.bucks = oldBucks; SAVE.vacLvl = oldLevel; G.player.refreshGear();
    results.push('Spookolon purchase, equip and thumbnail pass');
    return results;
  } finally { G.mode = old.mode; G.diff = old.diff; }
}
