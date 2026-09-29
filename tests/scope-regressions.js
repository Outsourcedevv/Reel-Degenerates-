// Run only in a fresh disposable game; this deliberately changes its inventory.
function runScopeRegressions() {
 SAVE.guns=[0,1,9];SAVE.bucks=10000;SAVE.sights=[];SAVE.sightOn={};G.progress=[];
 Shop.pickSight(0,'dot');
 const check=(v,m)=>{if(!v)throw Error(m)};
 check(SAVE.bucks===9500&&sightOf(0)==='dot','Buy and equip from dropdown');
 check(!sightOf(1),'Purchase must not alter another gun');
 check(!Shop.pickSight(0,'scope')&&SAVE.bucks===9500,'Locked planet blocks purchase');
 G.progress=['gary','blorb','jerry'];
 check(Shop.pickSight(0,'scope')&&SAVE.bucks===6000&&sightOf(0)==='scope','Unlocked scope purchasable from Scrapyard');
 check(Shop.pickSight(1,'scope')&&SAVE.bucks===6000,'Owned scope equips without another charge');
 check(Shop.pickSight(0,'')&&!sightOf(0),'Scope can be removed');
 SAVE.bucks=0;check(!Shop.pickSight(0,'holo')&&!SAVE.sights.includes('holo'),'Insufficient funds cannot buy');
 check(!Shop.pickSight(9,'dot'),'Built-in sniper scope remains intact');
 G.progress=[];check(!Shop.pickSight(0,'scope'),'Locked world blocks equipping even owned scope');
 check(!Object.values(SHOPS).some(s=>s.items.some(i=>i.kind==='sight')),'No separate island scope listings');
 G.progress=['gary','blorb','jerry'];SAVE.bucks=6000;Shop.tab='loadout';Shop.open('scrap');return 'Scope purchase, ownership, planet locks, equip/remove and compatibility checks passed';
}
