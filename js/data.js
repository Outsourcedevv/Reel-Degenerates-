'use strict';
/* =========================================================
   Game data: planets, loot, shops, bosses, jokes
   ========================================================= */

const PLANETS = [
  {
    id: 'scrap', name: 'Scrapyard-9', icon: 'gear', boss: 'gary', shop: 'scrap', activity: 'scrap', music: 'scrap',
    blurb: 'A moon made entirely of garbage. Smells like it too.',
    steps: [
      'Take out your Grabby Vac ({tool:vac}), then hold {fire} on the glowing junk to suck it up.',
      'Press {use} at the sell station to sell your junk. Look at a priced gun on the display and press {use} to buy it (your Squirt Pistol is awful).',
      'Zap critters and sell them too. Careful: the mean ones hunt you, and pounce when they crouch.',
      'Boss: Trashlord Gary. His Stinky Crown is buried in the junk. Take it to the boss altar.',
    ],
    sky: ['#ff7b54', '#ffd6a5'], fog: ['#f4b58a', 55, 240], stars: 0.25, mood: 'day',
    sun: ['#fff0d8', 1.0], hemi: ['#ffe2c4', '#7a5a44', 0.62],
    bodies: [
      { color: '#b980ff', r: 110, dir: [0.45, 0.32, -1], ring: '#ffd9f0' },
      { color: '#e6e1dc', r: 26, dir: [-0.7, 0.45, -0.6] },
    ],
    ground: ['#b88657', '#94705a', '#6f5b4e'], amp: 1.5,
    liquid: { color: '#8be03a', op: 0.93, name: 'toxic sludge' },
    grav: 20, fric: 12, pizza: 'Cold',
  },
  {
    id: 'gloop', name: 'Planet Gloop', icon: 'berry', boss: 'blorb', shop: 'gloop', activity: 'berry', music: 'gloop',
    blurb: 'Low gravity slime jungle. Everything is sticky. Everything.',
    steps: [
      'Low gravity! Jump up the giant mushrooms like stairs.',
      'Walk into berries to grab them, or suck them in from below with the Grabby Vac ({tool:vac}).',
      'Sell berries and critters to Chef Snorbo.',
      'Boss: Queen Blorbina. Royal Jelly hides in the big berries on the tallest mushrooms.',
      'For fun: the Ring Run, a glowing pad a short walk from your ship. Go through every ring as fast as you can.',
    ],
    sky: ['#5b34e8', '#ff9ad5'], fog: ['#e49ae0', 55, 230], stars: 0.55, mood: 'day', // (a bright planet, even with a few stars out)
    sun: ['#fff0ff', 0.95], hemi: ['#ffd0f2', '#2f7a6a', 0.62],
    bodies: [
      { color: '#43e0c0', r: 60, dir: [-0.5, 0.4, -1] },
      { color: '#ffe066', r: 22, dir: [0.7, 0.55, -0.5] },
      { color: '#ff7ac8', r: 12, dir: [0.2, 0.7, -0.8] },
    ],
    ground: ['#3cbfa2', '#2c8f7a', '#ff7ac8'], amp: 2.2,
    liquid: { color: '#ff5fb8', op: 0.88, name: 'pink goo' },
    grav: 11, fric: 10, pizza: 'Cold & Sticky',
  },
  {
    id: 'luck', name: 'Luckstar', icon: 'token', boss: 'jerry', shop: 'luck', activity: 'casino', music: 'luck',
    blurb: 'The casino planet. Nobody has ever left with money. Nobody.',
    steps: [
      'Every game is inside the Luckstar Casino, the big building next to your ship.',
      'Walk up to a game and press {use}: slots, roulette, snail races, coin flips and mystery crates.',
      'People drop chips everywhere. Vacuum them up ({tool:vac}) and sell them.',
      'Boss: Jackpot Jerry. Win his Golden Token from a Mystery Crate, or buy one from Mr. Chips.',
    ],
    sky: ['#070420', '#3d1570'], fog: ['#231048', 60, 250], stars: 1.0, mood: 'night',
    sun: ['#c9b3ff', 0.7], hemi: ['#8a6cff', '#2a1640', 0.7],
    bodies: [
      { color: '#ffcf3a', r: 95, dir: [0.35, 0.3, -1], ring: '#ff7ad9' },
      { color: '#ff3df0', r: 18, dir: [-0.6, 0.6, -0.4] },
    ],
    ground: ['#35245a', '#2a1c48', '#a61f9e'], amp: 0.25, flat: true,
    liquid: { color: '#ffcf3a', op: 0.96, name: 'liquid gold', glow: true },
    grav: 20, fric: 12, pizza: 'Cold (Bet On It)',
  },
  {
    id: 'frost', name: 'Frostbyte', icon: 'gem', boss: 'snowdad', shop: 'frost', activity: 'crystal', music: 'frost',
    blurb: 'Ice planet. The ground is slippery and so are the prices.',
    steps: [
      'Buy a Laser Drill from Penguin Pete. Take it out ({tool:drill}) and hold {fire} on a big crystal to mine it.',
      'Vacuum the little snow piles ({tool:vac}) for extra stuff.',
      'The ground is slippery. Heated Socks from Pete fix that.',
      'Boss: The Abominable Snowdad. His Space Milk is frozen inside the big crystals.',
      'For fun: Pete\'s Snowman Shooting Gallery, a short walk from your ship. Shoot the snowmen, NOT the penguins.',
    ],
    // (snow is bright: softer light and a slightly blue-grey snow, so it isn't a white glare you can't see anything in)
    sky: ['#5fa6e6', '#cfe4f5'], fog: ['#bcd3e8', 55, 240], stars: 0.35, mood: 'snow',
    sun: ['#fff6ea', 0.66], hemi: ['#d6e8f7', '#6d8aa6', 0.46],
    bodies: [
      { color: '#8fcaf5', r: 130, dir: [-0.4, 0.3, -1], ring: '#e8f4ff' },
    ],
    ground: ['#bcd2e6', '#d6e5f2', '#86b6d8'], amp: 2.6,
    liquid: { color: '#4fb6e8', op: 0.86, name: 'freezing water' },
    grav: 20, fric: 1.7, pizza: 'Frozen Solid',
  },
  {
    id: 'spook', name: 'Spookulon', icon: 'ghost', boss: 'count', shop: 'spook', activity: 'ghost', music: 'spook',
    blurb: 'A haunted moon. The ghosts are mostly harmless. They do NOT pay rent.',
    steps: [
      '!Ghosts can\'t be shot. You have to VACUUM them.',
      'Take out your Grabby Vac ({tool:vac}), then hold {fire} on a ghost.',
      'Keep the ghost in the middle of your screen until it\'s sucked in. It dodges and BOOs you, so stay on it.',
      'Sell what the ghosts drop at the shop. Boss: Count Carbula. One of the ghosts is haunting his Dinner Bell.',
      'For fun: the Hedge of No Return, the maze next to the boss altar. Race to the treasure in the middle.',
    ],
    sky: ['#0a0616', '#3b2a5c'], fog: ['#1f1735', 35, 185], stars: 0.95, mood: 'night',
    sun: ['#c9b8ff', 0.72], hemi: ['#a898ff', '#1d2a22', 0.66],
    bodies: [
      { color: '#f6f1d6', r: 75, dir: [0.35, 0.42, -1] },
      { color: '#7a5aa0', r: 16, dir: [-0.65, 0.55, -0.45] },
    ],
    ground: ['#44523f', '#33402f', '#7a6a9a'], amp: 1.5,
    liquid: { color: '#7dff8a', op: 0.86, name: 'ectoplasm', glow: true },
    grav: 17, fric: 12, pizza: 'Cold (and Haunted)',
  },
  {
    id: 'cloud', name: 'Nimbus-9', icon: 'star', boss: 'stormy', shop: 'cloud', activity: 'pearl', music: 'cloud',
    blurb: 'A planet made of clouds. Solid-ish clouds. Please do not look down.',
    steps: [
      'Grab Sky Pearls: walk into them, or suck them in with the Grabby Vac ({tool:vac}).',
      'Stand in a glowing updraft to float up to the next island.',
      'Fall off and the clouds bounce you back up into the sky (steer onto an island on the way down).',
      'Boss: Stormy McStormface. A Weather Balloon is tangled in the big pearls on the highest islands.',
    ],
    // (toned down: it used to be almost all white, and too bright to look at)
    sky: ['#2f7fe0', '#a4c6ec'], fog: ['#a2c0e2', 110, 420], stars: 0.1, mood: 'day',
    sun: ['#fff1dc', 0.62], hemi: ['#d9e5f5', '#6c7fa3', 0.4],
    bodies: [{ color: '#ffd9a8', r: 85, dir: [-0.55, 0.3, -1], ring: '#fff3e0' }],
    ground: ['#e3e8f0', '#d4deeb', '#eee5ec'], amp: 0.4, islands: true,
    liquid: { color: '#d4deeb', op: 0.95, name: 'clouds' },
    grav: 15, fric: 12, pizza: 'Cold & Fluffy',
  },
  {
    id: 'city', name: 'Gigopolis', icon: 'box', boss: 'chad', shop: 'city', activity: 'deliver', music: 'city',
    blurb: 'A planet-sized city where everyone has four side hustles and rent is due. Always.',
    steps: [
      'Walk up to the GigHub kiosk and press {use} to take a delivery gig.',
      'Run the parcel to the glowing beam before the timer runs out. Faster = bigger tip. Jump pads get you onto roofs.',
      'Vacuum litter off the streets ({tool:vac}) for extra cash.',
      'Boss: CEO Chad Grindset. One of your delivery customers has his Mandatory Meeting Invite.',
    ],
    sky: ['#12072e', '#ff5fa2'], fog: ['#3a1850', 60, 260], stars: 0.55, mood: 'night',
    sun: ['#ffc6e6', 0.85], hemi: ['#c9a6ff', '#2a1a3a', 0.72],
    bodies: [{ color: '#3df0ff', r: 60, dir: [0.4, 0.38, -1], ring: '#ff3df0' }],
    ground: ['#3c404c', '#2f3340', '#ffd23f'], amp: 0, city: true,
    liquid: { color: '#2ad4ff', op: 0.9, name: 'harbor water' },
    grav: 20, fric: 12, pizza: 'Cold (Surge Pricing)',
  },
  {
    id: 'zorb', name: 'Zorblax Prime', icon: 'crown', boss: 'zorblax', shop: 'zorb', activity: 'meteor', music: 'zorb',
    blurb: 'Home of Emperor Zorblax. He ordered the pizza. He is NOT happy. Also it rains pepperoni.',
    steps: [
      'Buy the Pizza Peel from Dave. Take it out ({tool:peel}), then stand inside a glowing circle to catch the pepperoni meteor.',
      'Every catch warms up the pizza. At 15 it\'s warm enough to deliver.',
      'Vacuum burnt crusts ({tool:vac}) for spare change.',
      'Boss: Emperor Zorblax. Use the Reheated Pizza at the boss altar.',
    ],
    sky: ['#1a0010', '#ff4a2a'], fog: ['#5e1520', 50, 230], stars: 0.7, mood: 'night',
    sun: ['#ffb08a', 0.9], hemi: ['#ff9a7a', '#301020', 0.6],
    bodies: [
      { color: '#ff3d1f', r: 150, dir: [0.1, 0.25, -1], glow: true },
      { color: '#6a4c8a', r: 30, dir: [-0.7, 0.5, -0.4] },
    ],
    ground: ['#46324a', '#33263a', '#ff5a1f'], amp: 1.8,
    liquid: { color: '#ff5a1f', op: 0.97, name: 'lava', glow: true },
    grav: 20, fric: 12, pizza: 'Weirdly Warm?',
  },
];

/* ---------- collectible resources ----------
   (the first two planets pay about a third of what they used to: money there is meant to be hard) */
const RES = {
  bolt:    { name: 'Rusty Bolt', v: 3, icon: 'gear', desc: 'Holds nothing together anymore.' },
  can:     { name: 'Suspicious Can', v: 5, icon: 'jar', desc: 'Label just says "FOOD?"' },
  gear:    { name: 'Bent Gear', v: 7, icon: 'gear', desc: 'Still spins. Emotionally.' },
  chip:    { name: 'Sticky Circuit Board', v: 16, icon: 'box', desc: 'Sticky with what? Do not ask.' },
  toaster: { name: 'Golden Toaster', v: 90, icon: 'star', desc: 'Only toasts one side. Worth a fortune.', rare: true },
  berry:   { name: 'Gloop Berry', v: 9, icon: 'berry', desc: 'Wiggles when you look at it.' },
  chonk:   { name: 'Chonky Gloop Berry', v: 22, icon: 'berry', desc: 'An absolute unit of a berry.' },
  gold:    { name: 'Golden Gloopberry', v: 140, icon: 'star', desc: 'Tastes like money. Literally.', rare: true },
  ice:     { name: 'Space Ice', v: 55, icon: 'gem', desc: 'Regular ice, but in SPACE.' },
  crystal: { name: 'Frost Crystal', v: 140, icon: 'gem', desc: 'Hums quietly. Might be sentient.' },
  diamond: { name: 'Space Diamond', v: 1100, icon: 'gem', desc: 'Forever. Like your delivery time.', rare: true },
  // Spookulon: what ghosts leave behind when you vacuum them
  ecto:    { name: 'Jar of Ectoplasm', v: 110, icon: 'jar', desc: 'Glows in the dark. Do not drink. (You will drink it.)' },
  sheet:   { name: 'Haunted Bedsheet', v: 170, icon: 'ghost', desc: 'Still warm. Nobody was in it.' },
  chain:   { name: 'Rattling Chain', v: 250, icon: 'gear', desc: 'Rattles by itself at 3am. Every night.' },
  phantom: { name: 'Ghost Pepper (An Actual Ghost)', v: 2400, icon: 'flame', desc: 'Spicy AND haunted. Collectors go wild for these.', rare: true },
  // Nimbus-9: floating island loot
  cotton:  { name: 'Cloud Cotton', v: 120, icon: 'star', desc: 'Fluffier than a pillow. Less useful than a pillow.' },
  pearl:   { name: 'Sky Pearl', v: 260, icon: 'gem', desc: 'Oysters grow these up here. The oysters also fly. Don\'t ask.' },
  bottle:  { name: 'Lightning in a Bottle', v: 520, icon: 'bolt', desc: 'Some say it can\'t be done. It was done. Twice.' },
  rainbow: { name: 'Rainbow Shard', v: 3200, icon: 'star', desc: 'A piece of an actual rainbow. Legally a gemstone.', rare: true },
  // Gigopolis: tips from happy customers
  giftcard:   { name: 'Gift Card', v: 150, icon: 'cash', desc: 'Balance: unknown. Probably $0. Maybe $1000.' },
  review:     { name: 'Framed 5-Star Review', v: 420, icon: 'star', desc: '"Driver was fast. Also a goober." A satisfied customer.' },
  leftover:   { name: 'Mystery Leftovers', v: 90, icon: 'box', desc: 'It\'s either pad thai or a sweater.' },
  scooterkey: { name: 'Golden Scooter Key', v: 3600, icon: 'token', desc: 'Starts a golden scooter somewhere. Where? Nobody knows.', rare: true },
  // things lying around on the other planets that the Grabby Vac picks up
  redchip:   { name: 'Red Chip', v: 25, icon: 'token', desc: 'Somebody dropped it running away from Mr. Chips.' },
  bluechip:  { name: 'Blue Chip', v: 60, icon: 'token', desc: 'Found it under a slot machine. Along with some gum.' },
  blackchip: { name: 'High Roller Chip', v: 180, icon: 'token', desc: 'Heavy. Smells like expensive cologne and bad decisions.' },
  goldchip:  { name: 'Golden Chip', v: 1400, icon: 'star', desc: 'The house will want this back. The house can\'t have it.', rare: true },
  snowball:  { name: 'Perfect Snowball', v: 30, icon: 'gem', desc: 'Perfectly round. Perfectly cold. Perfectly pointless.' },
  fish:      { name: 'Frozen Space Fish', v: 480, icon: 'gem', desc: 'It\'s looking at you. It has been looking at you for 900 years.', rare: true },
  sodacan:   { name: 'Crushed Soda Can', v: 40, icon: 'jar', desc: 'Grind Cola: now with 900% more grind.' },
  receipt:   { name: 'Very Long Receipt', v: 25, icon: 'box', desc: 'For one (1) oat milk latte. It is four meters long.' },
  crust:     { name: 'Burnt Crust', v: 70, icon: 'slice', desc: 'Re-entry is not kind to crusts.' },
  // Zorblax Prime is the last stop now, so its stuff is worth the most
  pep:     { name: 'Space Pepperoni', v: 240, icon: 'slice', desc: 'Still sizzling from re-entry.' },
  cheese:  { name: 'Cosmic Mozzarella', v: 440, icon: 'slice', desc: 'Stretchy. Suspiciously stretchy.' },
  knot:    { name: 'Golden Garlic Knot', v: 4200, icon: 'star', desc: 'The Emperor has been asking for these.', rare: true },
};
const LOOT = {
  scrap:    [['bolt', 38], ['can', 30], ['gear', 20], ['chip', 9], ['toaster', 1.6]],
  berry:    [['berry', 72], ['chonk', 25], ['gold', 2.5]],
  bigberry: [['chonk', 70], ['berry', 16], ['gold', 11]],
  crystal:  [['ice', 55], ['crystal', 40], ['diamond', 4]],
  meteor:   [['pep', 62], ['cheese', 34], ['knot', 4]],
  ghost:    [['ecto', 55], ['sheet', 30], ['chain', 13], ['phantom', 2]],
  pearl:    [['cotton', 55], ['pearl', 35], ['bottle', 8], ['rainbow', 1.5]],
  bigpearl: [['pearl', 55], ['bottle', 30], ['cotton', 5], ['rainbow', 8]],
  deliver:  [['leftover', 45], ['giftcard', 35], ['review', 18], ['scooterkey', 2]], // (a tip, now and then)
  // what the Grabby Vac finds lying around on the planets that aren't all about vacuuming
  chips:    [['redchip', 58], ['bluechip', 30], ['blackchip', 11], ['goldchip', 1]],
  snow:     [['snowball', 62], ['ice', 34], ['fish', 4]],
  litter:   [['receipt', 40], ['sodacan', 40], ['leftover', 16], ['giftcard', 4]],
  crust:    [['crust', 82], ['pep', 18]],
};
// how many things each kind of pickup gives you (everything else: one)
const LOOT_N = { crystal: 2, ghost: 2 };
// what's in a pickup (rng: whose dice. The planet's own, when it's built, so the whole crew sees the same thing)
const rollLoot = (kind, rng = Math.random) => Array.from({ length: LOOT_N[kind] || 1 }, () => U.weighted(LOOT[kind], rng));

/* ---------- gear ---------- */
/* Guns: every planet sells a different kind, and each one shoots differently (see LocalPlayer.fireZap).
   type: bolt (zaps) · spread (shotgun pellets) · lob (goo balls that splash) · jackpot (every shot is a
   slot pull) · beam (hold for a freeze ray) · homing (ghost wisps that chase things) · chain (lightning
   that jumps from target to target) · rocket (parcels that explode; rocket-jump off them) · cutter
   (pizza cutters that fly out and come back).
   dmg: per bolt / pellet / splash / beam tick / slice · cd: seconds between shots (beam: between ticks)
   mag: shots per battery (beam: ticks of charge; cutter: how many you can have out) · rl: reload seconds.
   (Ammo is infinite, but batteries need swapping.) Every gun you buy is yours to keep: put as many as you
   like on your hotbar (see Loadout), the rest wait in your locker. */
const ZAPPERS = [
  { name: 'Pew Pew Zapper',   short: 'Zapper',       type: 'bolt',    dmg: 14, cd: 0.30, mag: 12, rl: 1.3,  color: '#ff4b3e' },
  { name: 'Scrap Scattergun', short: 'Scattergun',   type: 'spread',  dmg: 8,  cd: 0.62, mag: 6,  rl: 1.4,  color: '#ffb23e', pellets: 6, spread: 0.075 },
  { name: 'Goo Lobber',       short: 'Goo Lobber',   type: 'lob',     dmg: 58, cd: 0.6,  mag: 8,  rl: 1.35, color: '#ff5fb8', radius: 2.8 },
  { name: 'Jackpot Blaster',  short: 'Jackpot',      type: 'jackpot', dmg: 28, cd: 0.25, mag: 18, rl: 1.1,  color: '#ffd23f' },
  { name: 'Cryo Beam',        short: 'Cryo Beam',    type: 'beam',    dmg: 30, cd: 0.1,  mag: 50, rl: 1.5,  color: '#9fe3ff', range: 38 },
  // (the wisps home in, so they hit a lot less hard than the guns you have to aim: seek is how close to your
  //  crosshair a target must be (1 = dead center), reach how far away they'll go after one)
  { name: 'Wisp Caller',      short: 'Wisp Caller',  type: 'homing',  dmg: 26, cd: 0.12, mag: 28, rl: 1.8,  color: '#9dffb0', speed: 24, turn: 4.2, seek: 0.9, reach: 40 },
  { name: 'Storm Caller',     short: 'Storm Caller', type: 'chain',   dmg: 120, cd: 0.3, mag: 14, rl: 1.4,  color: '#b8d8ff', range: 60, jumps: 3, hop: 9, falloff: 0.6 },
  { name: 'Same-Day Launcher', short: 'Launcher',    type: 'rocket',  dmg: 280, cd: 0.5, mag: 6,  rl: 1.6,  color: '#ffb23e', radius: 3.6 },
  { name: 'Pizza Cutter',     short: 'Pizza Cutter', type: 'cutter',  dmg: 135, cd: 0.3, mag: 3,  rl: 0,    color: '#ff6a3d', out: 0.55 },
  // (the sniper, from Spookulon: a spectral round straight down the crosshair, no travel time. Aiming (right-click)
  //  looks down its scope. New guns go on the end: saves remember guns by number)
  { name: 'Phantom Longshot', short: 'Longshot',     type: 'sniper',  dmg: 220, cd: 1.1, mag: 5,  rl: 2.2,  color: '#7dff8a', range: 160, zoom: 22 },
];
// Aiming down the sights (hold right-click, see LocalPlayer.aimK): only the guns you point and shoot. The ones
// that don't need it don't aim, and are as accurate from the hip as ever: the Goo Lobber and the Launcher (big
// splashes), the Cryo Beam (a beam), the Pizza Cutter (it's thrown) and the Wisp Caller (its wisps find their
// own way). From the hip a shot from one that aims goes somewhere inside a little circle round the crosshair,
// this wide (how far off it can be, per metre out); aimed, it goes dead on. Running or in the air, the circle's
// half as big again. The Scattergun's pellets spread out more from the hip and bunch up aimed (see HIP_CONE).
// zoom: how far the view narrows aimed (a gun's own zoom wins: the Longshot's scope)
const NO_AIM = new Set(['lob', 'rocket', 'beam', 'cutter', 'homing']);
// (the user wants hip fire a lot less accurate than aimed: at 15 m a Zapper shot from the hip lands up to 1.35 m off)
const HIP_SPREAD = { squirt: 0.12, bolt: 0.09, jackpot: 0.095, chain: 0.075, sniper: 0.16 };
const HIP_CONE = [2.2, 0.7]; // (Scattergun: its spread x this from the hip, x that aimed)
const AIM = { zoom: 52, sens: 0.75, speed: 0.65, drop: 0.07 }; // (sens: mouse speed aimed, speed: how fast you walk aimed, drop: how far under the crosshair the gun's top sits)
const canAimGun = (z) => !NO_AIM.has(z.type);
// Sights: buy them at shops and fit one to any gun that aims (not the Longshot: it has its own scope). A sight is
// yours for keeps and goes on whichever of your guns you like (the Loadout tab), one gun or all of them; it
// never drops when you die. SAVE.sights: the ones you own, SAVE.sightOn: { gun number: which sight's on it }.
// Aimed with one: zoom (the view, in degrees: 52 is plain aiming, 1.5x), speed (how quickly you aim in, x),
// walk (how fast you walk aimed: 0.65 without one), hip (the circle from the hip, x), sens (mouse speed aimed).
// The models and where they sit on each gun: buildSight / SIGHT_MOUNT in models.js
const SIGHTS = {
  dot: { price: 500, planet: 0, name: 'Blinky Red Dot', short: 'Red Dot', zoom: 52, speed: 1.8, walk: 0.85, chips: ['SNAPPY AIM', 'WALK FASTER AIMED'],
    desc: 'A little red dot right where your shots go. You aim in twice as fast and hardly slow down while you do. One size fits every gun that aims.' },
  holo: { price: 2000, planet: 2, name: 'Neon Holo Sight', short: 'Holo Sight', zoom: 45, speed: 1.3, walk: 0.72, hip: 0.7, chips: ['1.7x ZOOM', 'TIGHTER FROM THE HIP'],
    desc: 'A glowing ring to aim with. Zooms in a bit more than plain aiming, and your shots from the hip land 30% tighter too. Lights up like a slot machine.' },
  scope: { price: 3500, planet: 3, name: 'Peeper 3x Scope', short: '3x Scope', zoom: 26, speed: 0.8, walk: 0.55, sens: 0.45, chips: ['3x ZOOM', 'FOR LONG SHOTS'],
    desc: 'A proper little scope. 3x zoom for picking off critters from way over there. Slower to aim, and you shuffle along while you look through it.' },
};
const canSight = (z) => canAimGun(z) && z.type !== 'sniper';
// the sight on gun number lvl (null: none, or it isn't yours, or that gun can't take one)
const sightOf = (lvl) => { const s = SAVE.sightOn && SAVE.sightOn[lvl]; return s && SIGHTS[s] && (SAVE.sights || []).includes(s) && canSight(gunDef(lvl)) ? s : null; };
// Every new hire gets one of these for free. It's gun -1: you always have it, it never drops when you
// die, and no shop sells it. It squirts water. Slowly. (Company policy: no free REAL guns.)
const STARTER_ZAP = { name: 'Squirt Pistol', short: 'Squirter', type: 'squirt', dmg: 5, cd: 0.5, mag: 6, rl: 2.2, color: '#5fc8ff' };
// the gun at level i (-1, or anything that isn't a gun: the Squirt Pistol)
const gunDef = (i) => ZAPPERS[i] || STARTER_ZAP;
// (the Pizza Cutter used to be gun 5; saves from before the new planets get moved up, see migrateSave)
const OLD_TO_NEW_ZAP = { 5: 8 };
// the Jackpot Blaster: every shot is a slot pull (w: how often; blast: [radius, splash damage x the gun's dmg])
const JACKPOT_ROLLS = [
  { k: 'n',   w: 60, mult: 1,  color: '#ffd23f' },
  { k: 'x2',  w: 25, mult: 2,  color: '#ff4b3e', text: 'CHERRIES! x2' },
  { k: '777', w: 10, mult: 4,  color: '#3df0ff', text: '777! x4', blast: [2.2, 2] },
  { k: 'dud', w: 4,  mult: 0,  color: '#8a8f9a', text: 'DUD' },
  { k: 'jp',  w: 1,  mult: 14, color: '#ff3df0', text: 'JACKPOT!! x14', blast: [4, 6] },
];
const CARGO = [10, 20, 35, 60, 90];
const VAC = [
  { range: 7, speed: 1 },
  { range: 9.5, speed: 1.9 },
  { range: 12, speed: 2.4 },
];
const NADE_DMG = 90;

const HATS = {
  none: 'No Hat', cone: 'Traffic Cone', antenna: 'Alien Antennae', chef: 'Chef Hat', tophat: 'Fancy Top Hat',
  crown: 'Tiny Crown', viking: 'Viking Helmet', halo: 'Halo (Unearned)', propeller: 'Propeller Beanie',
  cowboy: 'Space Cowboy Hat', pizza: 'Pizza Slice', party: 'Party Hat', duck: 'Rubber Duck', bucket: 'Bucket Hat',
  witch: 'Witch Hat', pumpkin: 'Pumpkin Head', aviator: 'Aviator Goggles', umbrella: 'Umbrella Hat', headset: 'Hustle Headset', cap: 'Delivery Cap',
};
const CRATE_HATS = ['propeller', 'cowboy', 'pizza', 'party', 'duck', 'bucket'];

const SHOPS = {
  scrap: {
    npc: 'Robo-Pawn 3000', color: '#ffb23e',
    greet: ['BEEP. I BUY GARBAGE. YOU ARE... ALSO GARBAGE? JOKE. HA. HA.', 'WELCOME, CUSTOMER. PLEASE DO NOT LICK THE MERCHANDISE.', 'I HAVE BEEN ON THIS MOON FOR 400 YEARS. BUY SOMETHING.'],
    items: [
      { kind: 'zap', lvl: 0, price: 200, desc: 'Your first REAL gun. Way better than that squirt pistol. Infinite batteries, tiny battery pack.' },
      { kind: 'zap', lvl: 1, price: 350, desc: 'A shotgun built out of scrap. Six pellets a shot. Get close, then point it at the problem.' },
      { kind: 'vac', lvl: 1, price: 300, name: 'Turbo Vac', desc: 'Sucks twice as fast and reaches further.' },
      { kind: 'cargo', lvl: 1, price: 250, name: 'Bigger Backpack', desc: 'Holds 20 things. Mostly garbage.' },
      { kind: 'skates', price: 450, name: 'Duct-Tape Skates', desc: 'Roller skates held together with duct tape. Sprinting is 35% faster. Brakes sold separately. (They are not sold.)' },
      { kind: 'hat', id: 'cone', price: 120 },
      { kind: 'hat', id: 'antenna', price: 200 },
    ],
  },
  gloop: {
    npc: 'Chef Snorbo', color: '#ff7ac8',
    greet: ['Bonjour! I am a snail. I am a chef. Do not think about it too hard.', 'Berries! Bring me berries! I am making a soup. It is mostly berries.', 'You look hungry. And sticky. Mostly sticky.'],
    items: [
      { kind: 'boots', price: 600, name: 'Bounce Boots', desc: 'Double jump! Smells faintly of gummy bears.' },
      { kind: 'nades', price: 180, name: 'Goo Grenades x5', desc: 'Press {nade} to yeet in boss fights. Sticky. Explosive.' },
      { kind: 'zap', lvl: 2, price: 1400, desc: 'Lobs balls of goo that go SPLAT. Hits everything nearby and slows critters down. Aim a bit high.' },
      { kind: 'cargo', lvl: 2, price: 1100, name: 'Snail Shell Backpack', desc: 'Holds 35 things. The previous owner wants it back.' },
      { kind: 'hat', id: 'chef', price: 350 },
    ],
  },
  luck: {
    npc: 'Mr. Chips', color: '#ff3df0',
    greet: ['Welcome to Luckstar, where dreams come true! (Dreams do not come true.)', 'Psst. The slots are totally fair. I checked. With my eyes closed.', 'Buy something! Or gamble! Or both! Preferably both!'],
    items: [
      { kind: 'zap', lvl: 3, price: 4000, desc: 'Every shot is a slot pull. Usually normal. Sometimes x2. Rarely 777. Once in a blue moon: JACKPOT.' },
      { kind: 'nades', price: 180, name: 'Goo Grenades x5', desc: 'Imported from Gloop. Same price everywhere. (It\'s the law.)' },
      { kind: 'summon', b: 'jerry', price: 7500, desc: 'Summons Jackpot Jerry at the altar. Non-refundable. Like everything here.' },
      { kind: 'dash', price: 2500, name: 'Getaway Sneakers', desc: 'Press {dash} to dash. For outrunning debt collectors. Works in the air too.' },
      { kind: 'charm', price: 77, name: 'Lucky Space Foot', desc: 'Does absolutely nothing. You will feel lucky, though.' },
      { kind: 'hat', id: 'tophat', price: 900 },
      { kind: 'hat', id: 'crown', price: 5000 },
    ],
  },
  frost: {
    npc: 'Penguin Pete', color: '#9fe3ff',
    greet: ['Heh. Nice suit. Bet it\'s cold in there. It\'s cold in here too.', 'I\'m a penguin who sells drills. Don\'t make it weird.', 'Careful, the ground\'s slippery. I\'d know. I slide everywhere.'],
    items: [
      { kind: 'drill', price: 800, name: 'Laser Drill', desc: 'For mining crystals. NOT for dentistry.' },
      { kind: 'socks', price: 500, name: 'Heated Socks', desc: 'No more slipping around. Toasty toes.' },
      { kind: 'stomp', price: 4000, name: 'Yeti Stompers', desc: 'Press {stomp} in the air to slam into the ground. Squashes critters. Wakes the neighbors.' },
      { kind: 'zap', lvl: 4, price: 9000, desc: 'Hold to fire a freezing beam. Freezes critters solid. Just keep it on the boss.' },
      { kind: 'cargo', lvl: 3, price: 3800, name: 'Industrial Fridge', desc: 'Holds 60 things. You are wearing a fridge now.' },
      { kind: 'hat', id: 'viking', price: 600 },
    ],
  },
  spook: {
    npc: 'Sheets McGhost', color: '#b9a4ff',
    greet: ['Welcome to the Boo-tique! Everything here is 100% haunted, 0% refundable.', 'I\'d shake your hand, but, you know. Ghost.', 'The graveyard\'s lovely this time of year. Every year. Forever.'],
    items: [
      { kind: 'zap', lvl: 5, price: 11000, desc: 'Spits out little ghost wisps that drift after whatever is nearest your crosshair. They\'re not very bright, so point them roughly at something.' },
      { kind: 'zap', lvl: 9, price: 14500, desc: 'A haunted sniper rifle. One spectral round, straight to wherever you\'re aiming, no travel time. Hold {aim} to look down the scope. Headshots are... final.' },
      { kind: 'vac', lvl: 2, price: 6500, name: 'Spooky Vacuum', desc: 'A haunted ectoplasm trap. Reaches farther and sucks faster, with a ghost safely sealed inside.' },
      { kind: 'springs', price: 6500, name: 'Spring-Heeled Jacks', desc: 'Boots with actual bedsprings bolted on. You jump WAY higher. (Makes Bounce Boots bouncier too.)' },
      { kind: 'nades', price: 180, name: 'Goo Grenades x5', desc: 'Still sticky. Now slightly haunted.' },
      { kind: 'cargo', lvl: 4, price: 9000, name: 'Coffin Backpack', desc: 'Holds 90 things. Roomy. Pre-owned. Do not ask by whom.' },
      { kind: 'hat', id: 'witch', price: 1500 },
      { kind: 'hat', id: 'pumpkin', price: 2500 },
    ],
  },
  cloud: {
    npc: 'Skipper Gale', color: '#8fd0ff',
    greet: ['Ahoy! Welcome aboard! There is no boat. I just like saying ahoy.', 'Albatross by birth, sky-sailor by trade, shopkeeper by debt.', 'Mind the edge. The first step is a doozy. So are all the others.'],
    items: [
      { kind: 'zap', lvl: 6, price: 15000, desc: 'Calls down lightning that jumps from target to target. Three bounces, and every one still hurts. Great for crowds.' },
      { kind: 'cape', price: 9000, name: 'Glider Cape', desc: 'Hold {jump} while falling to glide. Makes falling off an island much less of a whole thing.' },
      { kind: 'nades', price: 180, name: 'Goo Grenades x5', desc: 'Aerodynamic now. (They are not.)' },
      { kind: 'hat', id: 'aviator', price: 2000 },
      { kind: 'hat', id: 'umbrella', price: 3000 },
    ],
  },
  city: {
    npc: 'Trench Coat Trevor', color: '#ffd23f',
    greet: ['Hello. I am one (1) normal adult man. Buying? Selling? Please do not look at my legs.', 'We... I mean I... have the best prices in Gigopolis. Rent is due. Buy something.', '*rustling* Ignore that. That was my coat. It does that.'],
    items: [
      { kind: 'zap', lvl: 7, price: 20000, desc: 'Launches express parcels that explode on delivery. Big splash damage. Shoot the ground under you mid-jump to rocket-jump onto a roof. (Somehow it doesn\'t hurt.)' },
      { kind: 'jetpack', price: 14000, name: 'Jet Pack', desc: 'Hold {jump} in the air to fly up. Fuel runs out fast and refills on the ground. Found in a dumpster. Works fine. Probably.' },
      { kind: 'nades', price: 180, name: 'Goo Grenades x5', desc: 'Now with next-day shipping.' },
      { kind: 'hat', id: 'headset', price: 2500 },
      { kind: 'hat', id: 'cap', price: 1200 },
    ],
  },
  zorb: {
    npc: 'Your Manager, Dave', color: '#dfe6ee',
    greet: ['Oh good, you made it. You\'re three years late. We\'ll talk about it in your review.', 'I flew here to "support" you. Also to sell you armor. From the company.', 'Remember: the customer is always right. Even when he is trying to kill you.'],
    items: [
      { kind: 'peel', price: 1200, name: 'Pizza Peel', desc: 'A giant pizza paddle. Catches meteors. Company property.' },
      { kind: 'zap', lvl: 8, price: 26000, desc: 'Throws spinning pizza cutters that slice through everything in a line, then come back. Also company property.' },
      { kind: 'armor', price: 5000, name: 'Company Armor', desc: 'Take 30% less damage. Deducted from your paycheck.' },
      { kind: 'life', price: 3000, name: 'Extra Life Insurance', desc: 'Die and keep your guns, tools and grenades. Only your backpack spills. Premiums may apply.' },
      { kind: 'nades', price: 180, name: 'Goo Grenades x5', desc: 'Expense report pending.' },
      { kind: 'hat', id: 'halo', price: 2500 },
    ],
  },
};

/* ---------- bosses ---------- */
const BOSSES = {
  gary: {
    name: 'Trashlord Gary', diff: 'EASY', stars: 1, hp: 2250, reward: 170, color: '#8a7b5a', icon: 'skull',
    quote: 'King of the landfill. Crowned by a raccoon. Still bitter about it.',
    taunts: ['I AM THE TRASH KING!', 'You call that a zap?! I\'ve been hit by harder banana peels!', 'Recycle THIS!', 'Smell my power!', 'One man\'s trash is... also me. I am the trash.'],
    win: 'Gary has been taken out. With the trash.',
  },
  blorb: {
    name: 'Queen Blorbina', diff: 'MEDIUM', stars: 2, hp: 5500, reward: 400, color: '#ff5fb8', icon: 'skull',
    quote: 'Absorbed her entire royal court. Still hungry.',
    taunts: ['You will be ABSORBED!', 'Bow before the goo!', 'Blorb blorb! (That was a threat.)', 'My children! Hug them! HUG THEM TO DEATH!', 'I am 98% goo and 2% RAGE!'],
    win: 'Queen Blorbina has been dethroned. And de-gooed.',
  },
  jerry: {
    name: 'Jackpot Jerry', diff: 'HARD', stars: 3, hp: 10000, reward: 3000, color: '#ffd23f', icon: 'skull',
    quote: 'A sentient slot machine. The house always wins. He IS the house.',
    taunts: ['Step right up and LOSE!', 'Feeling lucky? You shouldn\'t!', 'Your odds are TERRIBLE!', 'Insert coin to continue! Just kidding, you can\'t continue!', 'The house ALWAYS wins!'],
    win: 'Jackpot Jerry has cashed out. Permanently.',
  },
  snowdad: {
    name: 'The Abominable Snowdad', diff: 'VERY HARD', stars: 4, hp: 16000, reward: 6000, color: '#dff4ff', icon: 'skull',
    quote: '"Hi Doomed, I\'m Dad." He will crush you. Then make a pun about it.',
    taunts: [
      'I only know 25 letters of the alphabet. I don\'t know Y.',
      'What do you call a fake noodle? An IMPASTA!',
      'I\'m not fat. I\'m just big-boned. And made of snow.',
      'Did you hear about the guy who got hit by a snowball? He was FLAKE-ing out!',
      'Why don\'t skeletons fight? They don\'t have the GUTS. Unlike ME!',
      'Go ask your mother!',
    ],
    win: 'Snowdad is going out for milk. He will be back. (He will not be back.)',
  },
  count: {
    name: 'Count Carbula', diff: 'EXTREME', stars: 5, hp: 22000, reward: 8000, color: '#b8142e', icon: 'skull',
    quote: 'A vampire who gave up blood for carbs. Wants your pizza. Will not ask nicely.',
    taunts: ['I vant to eat your PIZZA!', 'Carbs! I must have CARBS!', 'Gluten-free? BLEH!', 'I only drink... marinara.', 'Do you have garlic knots on you? ...Please say no.', 'Bread is my life. Bread is also my death. It\'s complicated.'],
    taunts2: ['THE HUNGER! IT BURNS!', 'Four hundred years without a breadstick! FOUR HUNDRED!', 'I can smell the pepperoni on your breath!'],
    win: 'Count Carbula has been staked. With a breadstick.',
  },
  stormy: {
    name: 'Stormy McStormface', diff: 'BRUTAL', stars: 6, hp: 27000, reward: 11000, color: '#6a7bd8', icon: 'skull',
    quote: 'The internet named this storm. The storm never forgave the internet.',
    taunts: ['You call this weather?! I call it PAIN!', 'Forecast: 100% chance of YOU LOSING!', 'I\'m not crying, it\'s RAIN.', 'Hail to the king! Get it? HAIL?', 'Did you check the weather app? You should have.'],
    taunts2: ['CATEGORY SIX! I\'M MAKING UP CATEGORIES!', 'I\'LL RAIN ON EVERY PARADE!', 'THUNDER! LIGHTNING! MORE THUNDER!'],
    win: 'Stormy McStormface has blown over. Clear skies ahead.',
  },
  chad: {
    name: 'CEO Chad Grindset', diff: 'INSANE', stars: 7, hp: 33000, reward: 15000, color: '#3df0ff', icon: 'skull',
    quote: 'Wakes up at 3am. Owns 47 companies. None of them make anything.',
    taunts: ['Rise and GRIND!', 'Sleep is for the unemployed!', 'Have you considered a SIDE HUSTLE?', 'Let\'s circle back to you LOSING.', 'You\'re not fired. You\'re pre-hired... for FIRING!', 'This fight could\'ve been an email.'],
    taunts2: ['LAYOFFS! EVERYONE IS LAID OFF!', 'I\'M PIVOTING TO VIOLENCE!', 'MANDATORY OVERTIME! FOREVER!'],
    win: 'CEO Chad Grindset has been let go. Effective immediately.',
  },
  zorblax: {
    name: 'Emperor Zorblax the Unsatisfied', diff: 'UNREASONABLE', stars: 8, hp: 50000, reward: 25000, color: '#9b5de5', icon: 'skull',
    quote: 'Ordered one large pepperoni three years ago. Has been waiting ever since.',
    taunts: ['THREE YEARS! I ORDERED THIS THREE YEARS AGO!', 'I will be leaving a VERY detailed review!', 'Is that pineapple?! I can SMELL pineapple!', 'Where are my garlic knots?!', 'I DEMAND A REFUND!'],
    taunts2: ['I WANT TO SPEAK TO YOUR MANAGER!', 'ZERO STARS! NEGATIVE STARS!', 'GUARDS! THIS DELIVERY IS UNACCEPTABLE!', 'I\'M CALLING CORPORATE!'],
    win: 'Emperor Zorblax has accepted the delivery. Reluctantly.',
  },
};

/* ---------- space critters: roam each planet, zap them, sell them ----------
   mood: 'shy' ones run away, 'mean' ones chase you and bite. w = how often that kind shows up.
   spit: it keeps its distance and throws things at you (aiming where you're heading). n: how many at once,
   fan: spread out this much, gap: one after the other, lead: how far ahead of you it aims (1 = all the way),
   slow: getting hit slows you down, pool: it leaves a puddle where it lands (d: how much that hurts)
   toss: it bites, but now and then it stops and throws something at you from a way off
   3% of spawns are golden (worth 8x). Every spawn also rolls a size (see SIZES).
   (Scrapyard and Gloop critters are worth a third of what they used to be.) */
const CRITTERS = {
  scrap: [
    { id: 'rat', name: 'Trash Rat', icon: 'paw', mood: 'shy', w: 36, hp: 18, speed: 5.2, v: 8, desc: 'Lives in garbage. Loves garbage. Is garbage.' },
    { id: 'crab', name: 'Rust Crab', icon: 'paw', mood: 'mean', w: 26, hp: 40, speed: 3.2, dmg: 8, v: 15, desc: 'Pinches first, asks questions never.' },
    { id: 'pigeon', name: 'Scrap Pigeon', icon: 'paw', mood: 'shy', w: 22, hp: 14, speed: 6.2, v: 10, desc: 'Half bird, half hubcap. All attitude.' },
    { id: 'gremlin', name: 'Can Gremlin', icon: 'paw', mood: 'mean', w: 16, hp: 34, speed: 4.2, dmg: 7, v: 14, spit: { c: '#b8c0c8', what: 'can', lead: 0.5 }, desc: 'Lives in a soup can. Bites ankles for fun. Throws cans at you from a distance.' },
  ],
  gloop: [
    { id: 'blob', name: 'Blobbo', icon: 'paw', mood: 'shy', w: 36, hp: 30, speed: 4.6, v: 13, desc: 'A tiny sad slime. Sold by the pound.' },
    { id: 'hopper', name: 'Gloop Hopper', icon: 'paw', mood: 'mean', w: 26, hp: 55, speed: 4.0, dmg: 9, v: 23, desc: 'Jumps at your face. On purpose.' },
    { id: 'shroomy', name: 'Puffshroom', icon: 'paw', mood: 'shy', w: 22, hp: 36, speed: 3.4, v: 16, desc: 'A mushroom that learned to run. Badly.' },
    { id: 'leech', name: 'Goo Leech', icon: 'paw', mood: 'mean', w: 16, hp: 48, speed: 3.6, dmg: 8, v: 20, spit: { c: '#ff5fb8', what: 'goo', slow: 1.8, pool: { r: 1.6, dur: 3.5, kind: 'goo', d: 0 } }, desc: 'Sticky, slurpy, and very interested in your leg. Spits goo that slows you down (and leaves a sticky puddle).' },
  ],
  luck: [
    { id: 'chipbug', name: 'Chip Beetle', icon: 'paw', mood: 'shy', w: 36, hp: 45, speed: 5.0, v: 60, desc: 'A beetle shaped like a poker chip. Worth more than one.' },
    { id: 'dice', name: 'Dice Goblin', icon: 'paw', mood: 'mean', w: 26, hp: 80, speed: 3.8, dmg: 10, v: 110, toss: { c: '#ffffff', what: 'dice' }, desc: 'Rolled a 1 on "being friendly". Also rolls dice. At your head.' },
    { id: 'card', name: 'Card Crawler', icon: 'paw', mood: 'shy', w: 22, hp: 40, speed: 5.6, v: 70, desc: 'The ace of spades, with legs. Folds under pressure.' },
    { id: 'mimic', name: 'Slot Mimic', icon: 'paw', mood: 'mean', w: 16, hp: 95, speed: 3.4, dmg: 11, v: 140, spit: { c: '#ffd23f', what: 'coin', n: 3, fan: 0.4 }, desc: 'Looks like a tiny slot machine. Has teeth. Pays out in pain (three coins at a time, thrown hard).' },
  ],
  frost: [
    { id: 'mite', name: 'Snow Mite', icon: 'paw', mood: 'shy', w: 36, hp: 60, speed: 5.4, v: 90, desc: 'Fluffy. Cold. Surprisingly fast.' },
    { id: 'weasel', name: 'Ice Weasel', icon: 'paw', mood: 'mean', w: 26, hp: 110, speed: 4.4, dmg: 12, v: 160, toss: { c: '#bff6ff', what: 'icicle' }, desc: 'Weasels are mean. Space weasels are space mean. They throw icicles.' },
    { id: 'pengy', name: 'Penguling', icon: 'paw', mood: 'shy', w: 22, hp: 70, speed: 4.4, v: 110, desc: 'Penguin Pete\'s cousin. Owes him money.' },
    { id: 'pup', name: 'Frost Pup', icon: 'paw', mood: 'mean', w: 16, hp: 120, speed: 4.8, dmg: 12, v: 175, spit: { c: '#eef6ff', what: 'snow', slow: 1.2, n: 2, gap: 0.3 }, desc: 'A baby yeti. Snowdad\'s? Nobody asks. Throws snowballs, two at a time.' },
  ],
  spook: [
    { id: 'batlet', name: 'Space Bat', icon: 'paw', mood: 'shy', w: 36, hp: 95, speed: 6.2, v: 150, desc: 'Hangs upside down. Even in zero gravity. Show-off.' },
    { id: 'skelly', name: 'Skele-Tom', icon: 'paw', mood: 'mean', w: 26, hp: 150, speed: 4.6, dmg: 14, v: 260, toss: { c: '#f4efe0', what: 'bone' }, desc: 'A skeleton named Tom. Bone to be wild. Throws his spare bones.' },
    { id: 'pumpkin', name: 'Jack-o\'-Lander', icon: 'paw', mood: 'shy', w: 22, hp: 120, speed: 4.2, v: 190, desc: 'A pumpkin with legs. Lights up when it\'s scared. It is always scared.' },
    { id: 'grub', name: 'Grave Grub', icon: 'paw', mood: 'mean', w: 16, hp: 170, speed: 4.0, dmg: 15, v: 290, spit: { c: '#7dff8a', what: 'ecto', pool: { r: 1.5, dur: 3, kind: 'ecto', d: 0.3 } }, desc: 'Lives under tombstones. Comes out for ankles. Spits glowing gunk that burns where it lands.' },
  ],
  cloud: [
    { id: 'puff', name: 'Cloud Puff', icon: 'paw', mood: 'shy', w: 36, hp: 110, speed: 5.4, v: 190, desc: 'A tiny cloud with a face. Rains when it\'s sad.' },
    { id: 'gull', name: 'Sky Gull', icon: 'paw', mood: 'mean', w: 26, hp: 170, speed: 5.4, dmg: 15, v: 320, toss: { c: '#ffd23f', what: 'fries' }, desc: 'Steals your lunch. Then throws it at you. Then comes back for you.' },
    { id: 'kite', name: 'Wild Kite', icon: 'paw', mood: 'shy', w: 22, hp: 130, speed: 6.4, v: 240, desc: 'Broke its string years ago. Never looked back.' },
    { id: 'spark', name: 'Static Sprite', icon: 'paw', mood: 'mean', w: 16, hp: 190, speed: 4.8, dmg: 16, v: 360, spit: { c: '#7fd8ff', what: 'zap', fast: true, n: 2, gap: 0.25 }, desc: 'A little ball of lightning with a big attitude. Zaps on contact, and from a distance (twice).' },
  ],
  city: [
    { id: 'drone', name: 'Rogue Drone', icon: 'paw', mood: 'shy', w: 36, hp: 130, speed: 6.0, v: 240, desc: 'Quit its delivery job. Now it just hovers. Living the dream.' },
    { id: 'panda', name: 'Trash Panda', icon: 'paw', mood: 'mean', w: 26, hp: 200, speed: 5.0, dmg: 17, v: 380, toss: { c: '#c8e27a', what: 'trash' }, desc: 'A raccoon. Related to Trevor? Trevor says no. Trevor is lying. Throws garbage.' },
    { id: 'intern', name: 'Unpaid Intern Bot', icon: 'paw', mood: 'shy', w: 22, hp: 150, speed: 4.6, v: 290, desc: 'Works for exposure. Runs away from responsibility.' },
    { id: 'scooter', name: 'Feral E-Scooter', icon: 'paw', mood: 'mean', w: 16, hp: 230, speed: 6.6, dmg: 18, v: 440, charge: true, desc: 'Abandoned on a sidewalk. Went wild. Beeps angrily, then charges from way off.' },
  ],
  zorb: [
    { id: 'lsnail', name: 'Lava Snail', icon: 'paw', mood: 'shy', w: 36, hp: 135, speed: 3.0, v: 290, desc: 'Slow, hot, and crunchy.' },
    { id: 'imp', name: 'Magma Imp', icon: 'paw', mood: 'mean', w: 26, hp: 225, speed: 4.8, dmg: 19, v: 500, toss: { c: '#ff6a1f', what: 'lava', pool: { r: 1.4, dur: 3, kind: 'fire', d: 0.3 } }, desc: 'Works for the Emperor. Paid in lava. Throws it, too.' },
    { id: 'ember', name: 'Ember Bug', icon: 'paw', mood: 'shy', w: 22, hp: 120, speed: 5.8, v: 330, desc: 'A little bug that is also a little fire.' },
    { id: 'hound', name: 'Royal Hound', icon: 'paw', mood: 'mean', w: 16, hp: 255, speed: 5.4, dmg: 20, v: 570, spit: { c: '#ff6a1f', what: 'fire', n: 3, fan: 0.35 }, desc: 'The Emperor\'s guard dog. Three eyes, zero chill. Breathes three fireballs at a time.' },
  ],
};
/* how big a critter is. Bigger ones are rarer, and everything about them goes up together: a 10x one is worth 10x as
   much, is 10x as big, has 10x the health and bites 10x as hard. */
// v: what it's worth, how big it is (s), how much health it has (hp) and how hard it hits (dmg), all x the normal
// one · spd: how fast it goes · w: how often (out of 100): the bigger ones are rarer and rarer, all the way up to 10x.
// (New sizes go on the END: saves remember a critter's size by where it is in this list.)
const SIZES = [
  { k: 'tiny',     name: 'Tiny',     v: 0.5,  spd: 1.15, w: 16 },
  { k: 'small',    name: 'Small',    v: 0.75, spd: 1.07, w: 28 },
  { k: 'normal',   name: '',         v: 1,    spd: 1,    w: 47.64 },
  { k: 'big',      name: 'Big',      v: 2,    spd: 0.95, w: 4 },
  { k: 'huge',     name: 'Huge',     v: 4,    spd: 0.88, w: 1 },
  { k: 'giant',    name: 'GIANT',    v: 9,    spd: 0.8,  w: 0.1 },
  { k: 'large',    name: 'Large',    v: 3,    spd: 0.92, w: 1.8 },
  { k: 'hefty',    name: 'Hefty',    v: 5,    spd: 0.86, w: 0.6 },
  { k: 'massive',  name: 'Massive',  v: 6,    spd: 0.84, w: 0.4 },
  { k: 'enormous', name: 'Enormous', v: 7,    spd: 0.83, w: 0.25 },
  { k: 'colossal', name: 'COLOSSAL', v: 8,    spd: 0.82, w: 0.15 },
  { k: 'titan',    name: 'TITANIC',  v: 10,   spd: 0.78, w: 0.06 },
];
for (const z of SIZES) Object.assign(z, { s: z.v, hp: z.v, dmg: z.v });
const SIZE_NORMAL = 2;
// the backpack id for a critter of some size (normal-sized ones keep their plain id)
const critKey = (id, sz, gold) => (gold ? 'g_' : '') + id + (sz === SIZE_NORMAL ? '' : ':' + SIZES[sz].k);
// the other way round: which critter a backpack entry ('g_rat:huge*5') is: {id, sz, gold}
const critOf = (entry) => {
  const key = String(entry).split('*')[0], gold = key.startsWith('g_'), [id, k] = (gold ? key.slice(2) : key).split(':');
  const sz = k ? SIZES.findIndex((z) => z.k === k) : SIZE_NORMAL;
  return { id, sz: sz < 0 ? SIZE_NORMAL : sz, gold };
};
// every critter, in every size, golden or not, is also something you can carry and sell
for (const list of Object.values(CRITTERS)) {
  for (const c of list) {
    SIZES.forEach((z, sz) => {
      for (const gold of [false, true]) {
        const name = (gold ? 'Golden ' : '') + (z.name ? z.name + ' ' : '') + c.name;
        RES[critKey(c.id, sz, gold)] = {
          name, v: Math.max(1, Math.round(c.v * z.v * (gold ? 8 : 1))), icon: gold ? 'star' : 'paw',
          desc: gold ? 'Shiny! Somebody will pay a LOT for this.' : z.v > 1 ? `A ${z.name.toLowerCase()} one! ${c.desc}` : c.desc,
          rare: gold || z.v >= 4, crit: true, // (a critter: it can ride in your hotbar, see Loadout)
        };
      }
    });
  }
}

/* ---------- mini bosses: a huge, angry critter that can turn up once you've zapped enough of them ----------
   Once 15 critters have been zapped on a planet, every kill after that has a 4% chance of bringing its mini
   boss (not on Scrapyard-9). base: the critter it's a giant version of · s: how much bigger · dmg: how hard
   its attacks hit (before the difficulty) · keep: how far away it likes to fight from · reward: bucks for
   everyone on the planet when it goes down (more on Hard and Hardcore).
   atk: its attacks on every difficulty; hard: a new one it only does on Hard and Hardcore; hardcore: another
   new one, only on Hardcore (see ATTACKS in miniboss.js). */
const MB_AFTER = 15, MB_CHANCE = 0.04;
const MINIBOSSES = {
  gloop: {
    name: 'Sir Squelchalot', base: 'hopper', s: 4.2, hp: 1400, dmg: 9, speed: 3.6, keep: 5, reward: 220, color: '#ff7a2a',
    quote: 'A Gloop Hopper that ate every other Gloop Hopper. Still hungry. Still hopping.',
    atk: ['flop', 'goovolley'], hard: 'split', hardcore: 'geyser',
    taunts: ['SQUELCH!', 'I am the hoppiest!', 'You look like a snack. A crunchy one.', 'Hop hop hop... ON YOU!'],
  },
  luck: {
    name: 'The Pit Boss', base: 'mimic', s: 3.8, hp: 2800, dmg: 11, speed: 3.3, keep: 9, reward: 1200, color: '#ffd23f',
    quote: 'A slot machine that runs the casino floor. Card counters get counted. Then crushed.',
    atk: ['coinfan', 'diceroll'], hard: 'chiprain', hardcore: 'doubledown',
    taunts: ['Place your bets!', 'The house ALWAYS wins!', 'You\'re cut off, pal!', 'Nobody walks out of MY casino!'],
  },
  frost: {
    name: 'Mama Yeti', base: 'pup', s: 4.0, hp: 4500, dmg: 13, speed: 3.7, keep: 7, reward: 2000, color: '#bff6ff',
    quote: 'Somebody zapped her babies. Somebody is you.',
    atk: ['snowbarrage', 'groundpound'], hard: 'iciclerain', hardcore: 'avalanche',
    taunts: ['WHO ZAPPED MY BABIES?!', 'Time for a snow day. FOREVER.', 'Put on a coat! Oh wait, you won\'t need one.', 'Mama\'s MAD!'],
  },
  spook: {
    name: 'Bonejangles', base: 'skelly', s: 3.5, hp: 6000, dmg: 15, speed: 3.9, keep: 7, reward: 2800, color: '#7dff8a',
    quote: 'Skele-Tom\'s big brother. Taller hat. Worse attitude. Rattles when he laughs.',
    atk: ['bonefan', 'gravegrab'], hard: 'ectonova', hardcore: 'rise',
    taunts: ['I have a bone to pick with you!', 'Nyeh heh heh!', 'You\'ll fit right in down here.', 'Rattle rattle, you\'re in a battle!'],
  },
  cloud: {
    name: 'Thunderhead', base: 'spark', s: 4.0, hp: 8000, dmg: 16, speed: 4.2, keep: 10, reward: 3800, color: '#7fd8ff',
    quote: 'A Static Sprite that got so angry it became weather.',
    atk: ['zapbolts', 'strike'], hard: 'staticring', hardcore: 'chainstorm',
    taunts: ['KZZZZT!', 'Feel the BUZZ!', 'Forecast: YOU, crispy.', 'I\'m positively charged. You\'re negatively doomed.'],
  },
  city: {
    name: 'Scooterzilla', base: 'scooter', s: 4.0, hp: 11000, dmg: 17, speed: 4.8, keep: 10, reward: 5000, color: '#3ddc84',
    quote: 'Every abandoned e-scooter in Gigopolis, welded into one. 0 stars. Rides you.',
    atk: ['ram', 'tickets'], hard: 'swarm', hardcore: 'surge',
    taunts: ['BEEP BEEP! MOVE!', 'Your ride has arrived. It IS the ride.', 'Surge pricing is in effect!', 'Please rate your trip. Oh wait.'],
  },
  zorb: {
    name: 'Cerberoni', base: 'hound', s: 3.9, hp: 14000, dmg: 19, speed: 4.4, keep: 7, reward: 8000, color: '#ff6a1f',
    quote: 'The Emperor\'s favorite guard dog. Three eyes, three appetites, zero chill.',
    atk: ['firefan', 'pounce'], hard: 'lavapools', hardcore: 'meteors',
    taunts: ['GRRRAWR!', 'The Emperor says NO DELIVERIES!', 'Who\'s a good boy? NOT YOU!', 'I smell pepperoni. And FEAR.'],
  },
};
/* ---------- what a mini boss drops (see MiniBoss.dropLoot) ----------
   Every time: its trophy (sell it: shops pay well) and a few Goo Grenades. The first time you beat it: its special
   item, which is yours for keeps and gives you something (mb: whose it is). */
const PERKS = {
  goo:    { mb: 'gloop', name: 'Goo Gland',          icon: 'boots',  chip: 'JUMP +35%',          desc: 'Jump 35% higher (double jumps too).' },
  dice:   { mb: 'luck',  name: 'Loaded Dice',        icon: 'cash',   chip: 'SELL +25%',          desc: 'Shops pay you 25% more for everything you sell.' },
  mitts:  { mb: 'frost', name: 'Yeti Mitts',         icon: 'gun',    chip: 'RELOAD 35% FASTER',  desc: 'Reload every gun 35% faster.' },
  bone:   { mb: 'spook', name: 'Funny Bone',         icon: 'heart',  chip: 'HEALING +30%',       desc: 'Your health comes back 30% faster.' },
  storm:  { mb: 'cloud', name: 'Storm Core',         icon: 'star',   chip: 'DAMAGE +20%',        desc: 'Every gun (and grenade) hits 20% harder.' },
  wheels: { mb: 'city',  name: 'Scooter Wheels',     icon: 'boots',  chip: 'SPEED +20%',         desc: 'Walk and run 20% faster.' },
  collar: { mb: 'zorb',  name: 'Cerberoni\'s Collar', icon: 'shield', chip: 'DAMAGE TAKEN -25%',  desc: 'Take 25% less damage from everything.' },
};
const perkOf = (mb) => Object.keys(PERKS).find((k) => PERKS[k].mb === mb) || null;
const hasPerk = (id) => !!(SAVE.perks && SAVE.perks.includes(id));
// (and the trophies, in your backpack like anything else)
for (const [pid, d] of Object.entries(MINIBOSSES)) {
  RES['mbt_' + pid] = { name: `${d.name} Trophy`, v: Math.round(d.reward * 0.6), icon: 'star', rare: true, desc: `Proof you took down ${d.name}. Shops pay well for it.` };
}
// on harder worlds they're tougher, wind up faster, rest less between attacks, and pay more
const MB_DIFF = { easy: { hp: 1, pace: 1, pay: 1 }, hard: { hp: 1.4, pace: 0.9, pay: 1.5 }, hardcore: { hp: 1.8, pace: 0.8, pay: 2 } };
// the attacks a mini boss does on this difficulty
const mbAttacks = (def, diff) => def.atk.concat(diff === 'hard' || diff === 'hardcore' ? [def.hard] : [], diff === 'hardcore' ? [def.hardcore] : []);

/* ---------- style kills: bonus multipliers for zapping critters in style ----------
   Each one is at most 2x, and they stack with no limit. The bonus is baked into what the critter sells for. */
const STYLE = {
  air:    { name: 'AIRBORNE', m: 1.5, desc: 'kill it while you\'re in the air' },
  spin:   { name: '360', m: 2, desc: 'spin all the way around right before the kill' },
  last:   { name: 'LAST SHOT', m: 1.5, desc: 'kill it with the last shot in your battery' },
  long:   { name: 'LONG SHOT', m: 1.5, desc: 'kill it from 25 m away or more' },
  close:  { name: 'POINT BLANK', m: 1.25, desc: 'kill it from right up close' },
  one:    { name: 'ONE SHOT', m: 1.3, desc: 'take it down with a single hit' },
  multi2: { name: 'DOUBLE KILL', m: 1.5, desc: 'two kills within 3 seconds' },
  multi3: { name: 'MULTI KILL', m: 2, desc: 'three or more kills in a row, 3 seconds apart' },
  run:    { name: 'ON THE RUN', m: 1.2, desc: 'kill it while sprinting' },
  revenge:{ name: 'REVENGE', m: 1.5, desc: 'kill the critter that just bit you' },
  clutch: { name: 'CLUTCH', m: 1.5, desc: 'kill it while you\'re under 25 HP' },
  head:   { name: 'HEADSHOT', m: 1.5, desc: 'finish it with a shot to the head' },
  jackpot:{ name: 'JACKPOT', m: 2, desc: 'kill it with a JACKPOT shot from the Jackpot Blaster (or its blast)' },
};

/* ---------- boss summoning items: earn one on each planet, use it at the boss altar ----------
   src/chance/pity: it drops from that kind of pickup, guaranteed by the pity-th try.
   heat: the final one is earned by catching that many meteors (reheating the pizza). */
/* ---------- difficulty: picked when you make a world ---------- */
// dmg: how hard enemies hit you · crit: how much health critters have · revive: in a boss fight with friends,
// how many seconds until you get back up by yourself (as long as a friend is still standing)
// dmg: how hard enemies hit · crit: how tough critters are · crits: how many critters are about on a planet at
// once · spawn: seconds between new critters turning up [while there are less than half that many, after that]
const DIFFS = {
  easy: { name: 'Easy', regen: { planet: 10, boss: 5 }, dmg: 1, crit: 1, crits: 14, spawn: [0.7, 6.5], revive: 10, desc: 'Enemies hit normally, and there are fewer critters about. Die on a planet and you just get back up. Boss fights: one life, but friends can pick you up (or you get up after 10s).' },
  hard: { name: 'Hard', regen: { planet: 6, boss: 3 }, dmg: 2, crit: 1.75, crits: 24, spawn: [0.3, 3], revive: 15, desc: 'Everything hits twice as hard, critters are much tougher, there are more of them and they come back faster. Mini bosses have a new attack. Boss fights: one life, friends can pick you up (or you get up after 15s).' },
  hardcore: { name: 'Hardcore', regen: { planet: 3, boss: 1.5 }, dmg: 3.5, crit: 2.5, crits: 32, spawn: [0.2, 1.6], revive: 20, perma: true, desc: 'Everything hits WAY harder, critters are tanks and they\'re everywhere, mini bosses have two new attacks, and if you die, you die for good. The world is deleted. With friends in a boss fight you get back up after 20s, if one of them is still standing.' },
};

const SUMMONS = {
  gary: {
    name: 'Gary\'s Stinky Crown', icon: 'crown', src: 'scrap', chance: 0.035, pity: 30,
    hint: 'find his Stinky Crown in the junk piles',
    how: 'It\'s buried in one of the junk piles. Keep vacuuming!',
    found: 'It smells like a raccoon wore it. Because one did.',
    line: 'Something in the landfill smells it...',
  },
  blorb: {
    name: 'Royal Jelly', icon: 'jar', src: 'bigberry', chance: 0.06, pity: 16,
    hint: 'find Royal Jelly in the big berries on the tallest mushrooms',
    how: 'It hides in the big orange berries on top of the tall mushroom stacks. Start jumping!',
    found: 'Wobbly, sticky, royal. The Queen will want this back.',
    line: 'The ground starts to wobble...',
  },
  jerry: {
    name: 'Jerry\'s Golden Token', icon: 'token',
    hint: 'win his Golden Token from a Mystery Crate, or buy one from Mr. Chips',
    how: 'Win one from a Mystery Crate, or buy one from Mr. Chips.',
    found: 'Shiny! Somewhere, a slot machine just perked up.',
    line: 'DING DING DING! The whole planet lights up...',
  },
  snowdad: {
    name: 'Carton of Space Milk', icon: 'milk', src: 'crystal', chance: 0.045, pity: 24,
    hint: 'find the Space Milk frozen in the big crystals',
    how: 'It\'s frozen inside one of the big crystals. Drill them!',
    found: 'A dad somewhere just felt a disturbance.',
    line: 'Somewhere, a dad is finally coming back with the milk...',
  },
  count: {
    name: 'Count\'s Dinner Bell', icon: 'alert', src: 'ghost', chance: 0.04, pity: 22,
    hint: 'find his Dinner Bell: one of the ghosts is haunting it',
    how: 'One of the ghosts drifting around the graveyards is haunting it. Vacuum ghosts ({tool:vac}) until it turns up.',
    found: 'Ding ding! Somewhere, a vampire just got very hungry.',
    line: 'You ring the Dinner Bell. The graveyard goes very, very quiet...',
  },
  stormy: {
    name: 'Weather Balloon', icon: 'star', src: 'bigpearl', chance: 0.06, pity: 14,
    hint: 'find a Weather Balloon in the big pearls on the highest islands',
    how: 'The big glowing pearls on the highest floating islands sometimes have one tangled inside. Ride the updrafts up!',
    found: 'A weather balloon! Stormy is going to be SO mad.',
    line: 'You let the Weather Balloon go. The sky turns black...',
  },
  chad: {
    name: 'Mandatory Meeting Invite', icon: 'box', src: 'deliver', chance: 0.08, pity: 12,
    hint: 'do delivery gigs until one of the parcels is his Meeting Invite',
    how: 'Take delivery gigs at the GigHub kiosk. One of your customers will eventually be Chad\'s assistant, with a Mandatory Meeting Invite. (Everybody\'s deliveries count.)',
    found: 'It\'s a calendar invite: "MANDATORY: Q4 Synergy Beatdown." Accept it at the altar.',
    line: 'You accept the meeting. A helicopter lands on the altar...',
  },
  zorblax: {
    name: 'Reheated Pizza', icon: 'flame', heat: 15,
    hint: 'reheat the pizza by catching pepperoni meteors',
    how: 'The Emperor won\'t take a cold pizza. Catch pepperoni meteors with the Pizza Peel to reheat it.',
    found: 'The pizza is WARM. First time in three years. Deliver it. NOW.',
    line: 'You ring the palace doorbell holding a WARM pizza...',
  },
};

/* ---------- casino ---------- */
const SNAILS = [
  { name: 'Turbo', color: '#ff4b3e' },
  { name: 'Slimothy', color: '#3fcf6a' },
  { name: 'Gregory', color: '#9b5de5' },
  { name: 'Sir Oozealot', color: '#3aa7ff' },
  { name: 'Big Tony', color: '#ffd23f' },
];

/* ---------- jokes ---------- */
const LINES = {
  warp: ['Pizza temperature: still cold.', 'Are we there yet? No.', 'Estimated arrival: eventually.', 'Recalculating route... through an asteroid.',
    'Please keep your arms inside the spaceship.', 'Hyperdrive powered by one (1) AA battery.', 'Customer satisfaction: plummeting.', 'Someone left the space stove on.'],
  death: ['You died. Your suit is filing a complaint.', 'Oof. Respawning with slightly less dignity.', 'You died. The pizza survived, though.',
    'Ouch. Company insurance does not cover this.', 'You have been deleted. Temporarily.', 'Skill issue.'],
  cargoFull: ['Backpack full! Go sell your junk.', 'Your backpack is FULL. Like your inbox.', 'No room! Sell stuff at the shop.'],
  slotsLose: ['The house always wins. You are not the house.', 'So close! (Not really.)', 'Mr. Chips thanks you for your donation.',
    'Have you tried winning?', 'Your money is in a better place now.', 'Almost! Try again! (Please try again.)'],
  slotsWin: ['WINNER! Mr. Chips looks nervous.', 'Beginner\'s luck! (You are not a beginner.)', 'The machine is crying a little.'],
  glorpHi: ['Heyyy, it\'s my favorite goober! Double or nothin\'?', 'Flip a coin, win big! That\'s how coins work, right?', 'I\'ve got a coin. You\'ve got money. Let\'s make a deal.'],
  glorpWin: ['...That\'s rigged. My OWN coin is rigged against me?! Again?', 'Ugh, fine. Take it. Wanna go again?', 'Lucky! Let it ride! Come on, let it ride!'],
  glorpLose: ['Tough break, pal. Gotta spend money to lose money.', 'Ooh, so close. By which I mean not close.', 'Thanks for the donation! Very generous.'],
  bouncer: ['Welcome to the Luckstar Casino. The house always wins. You are not the house.', 'No outside pizza. ...Is that PIZZA? Fine. It\'s cold anyway.',
    'Rule one: no refunds. Rule two: see rule one.', 'The snail races are rigged. By the snails.', 'Big spender? Go on in. Small spender? Also go on in. We take everything.',
    'If Lady Luck 9000 winks at you, that\'s a bug. Please report it.', 'I\'m not allowed to say the slots are rigged. So I won\'t. ...Wink.'],
  bartender: ['What\'ll it be? We have Space Soda, Space Soda Zero, and Glorp\'s homemade "juice". Don\'t drink the juice.',
    'Tip jar\'s right there. It\'s also a slot machine. Kidding. ...Unless?', 'Rough night? Double or nothing says it gets worse.',
    'Turbo won three races in a row once. Then he took a nap for a week.', 'I used to gamble. Now I pour drinks for gamblers. The circle of life.',
    'Lady Luck 9000 and I went on a date once. She calculated our odds. We are not together.', 'Last call was three years ago. Nobody left. Nobody ever leaves.'],
  bonk: ['BONK!', 'ZAPPED!', 'Get zapped, nerd!', 'Friendly fire!'],
  meteorBonk: ['A pepperoni meteor hit you. Rude.', 'BONK. You have been topped.', 'Extra pepperoni! (On your head.)',
    'You caught it with your face. Wrong tool!', 'Ow. That one was still hot.'],
  meteorCatch: ['CAUGHT!', 'NICE CATCH!', 'SLICE!', 'TOPPED!'],
  bitten: ['You got nibbled to pieces.', 'Knocked out by a critter. Embarrassing.', 'The critters won this round.', 'Your suit has filed a complaint.'],
  flyHit: ['BONK. That was an asteroid.', 'Hull integrity: vibes.', 'Who put a rock there?!', 'Dave is adding that to your bill.'],
  reload: ['SWAPPING BATTERIES', 'BLOWING ON THE BATTERY', 'FINDING AAs', 'RELOADING'],
  boo: ['BOO!', 'Booooo!', 'OooOOooo!', 'Get off my lawn!', 'You\'re standing on my grave!'],
  ghostCaught: ['GHOST BAGGED!', 'SLURPED!', 'Into the bag you go!', 'That\'s one less roommate.'],
  gigTake: ['Parcel acquired. The clock is ticking!', 'The customer is waiting. And judging.', 'Go go go! Tips wait for no one!'],
  gigDone: ['Delivered! The customer says "finally".', 'Delivered! 5 stars! (Out of 50.)', 'Delivered! They tipped! In cash! Wow!'],
  gigLate: ['Too slow! The customer ate the box.', 'Late! They left 1 star and a frowny face.', 'Gig expired. Your rating dropped to 0.3 stars.'],
  cloudBounce: ['BOING! The clouds threw you back up.', 'Clouds: surprisingly bouncy. Please do not tell anyone.', 'You fell off the island. The clouds did not want you either.'],
};

const SIGNS = {
  scrap: { title: 'Porta-Potty', lines: ['Occupied.', 'Occupied. (It\'s a raccoon.)', 'You don\'t need to go. Your suit handles it. Gross.', 'Someone wrote "GARY WAS HERE" on the door.'] },
  gloop: { title: 'Sign', lines: ['LUCKSTAR CASINO: NEXT PLANET! You must be this brave to gamble.', 'WARNING: Do not eat the goo. (You will eat the goo.)', 'Queen Blorbina\'s palace: 200m. Please wipe your feet.'] },
  luck: { title: 'Poster', lines: ['LUCKSTAR: 0 days since someone won big.', 'Gambling problem? Call 1-800-JUST-ONE-MORE.', 'Remember: you miss 100% of the spins you don\'t spin!'] },
  frost: { title: 'Igloo', lines: ['Nobody home. A note says "Gone fishing." (Not in this game.)', 'It\'s cold inside too. Pointless.', 'There is a tiny penguin sleeping here. Let it sleep.'] },
  spook: { title: 'Tombstone', lines: ['HERE LIES DAVE\'S LAST DELIVERY DRIVER. He was also late.', 'R.I.P. Gary\'s Diet (1998-1998)', 'BRB. - The Ghost', 'Died doing what he loved: waiting on hold.'] },
  cloud: { title: 'Weather Report', lines: ['TODAY: Cloudy. TOMORROW: Cloudy. FOREVER: Cloudy.', 'Chance of Stormy McStormface: yes.', 'Updrafts: strong. Downdrafts: also strong. Do not look down.'] },
  city: { title: 'Parking Meter', lines: ['$40 for 15 minutes...', 'Accepts: exposure, vibes, equity.', '"EXPIRED." It\'s talking about you.'] },
  zorb: { title: 'Doormat', lines: ['It says "GO AWAY."', 'It says "NO SOLICITORS. NO DELIVERY DRIVERS. ESPECIALLY LATE ONES."', 'It\'s soaking wet. Somehow. On a lava planet.'] },
};

// Passive pickup magnet: one new tier is available at each planet's gear counter.
const MAGNET = [{range:0,price:0}, ...[2.5,3.5,4.5,5.5,6.5,7.5,8.5,10].map((range,i)=>({range,price:[400,900,1800,3200,5000,7500,11000,16000][i]}))];
