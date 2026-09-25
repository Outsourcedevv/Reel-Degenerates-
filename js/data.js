'use strict';
/* =========================================================
   Game data: planets, loot, shops, bosses, jokes
   ========================================================= */

const PLANETS = [
  {
    id: 'scrap', name: 'Scrapyard-9', icon: '🛠️', boss: 'gary', shop: 'scrap', activity: 'scrap', music: 'scrap',
    blurb: 'A moon made entirely of garbage. Smells like it too.',
    how: 'Use the Grabby Vac (2) on glowing junk piles, then sell it to Robo-Pawn.',
    sky: ['#ff7b54', '#ffd6a5'], fog: ['#f4b58a', 55, 240], stars: 0.25,
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
    id: 'gloop', name: 'Planet Gloop', icon: '🍄', boss: 'blorb', shop: 'gloop', activity: 'berry', music: 'gloop',
    blurb: 'Low gravity slime jungle. Everything is sticky. Everything.',
    how: 'Jump up the giant mushrooms to grab Gloop Berries. Low gravity = big jumps!',
    sky: ['#5b34e8', '#ff9ad5'], fog: ['#e49ae0', 55, 230], stars: 0.55,
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
    id: 'luck', name: 'Luckstar', icon: '🎰', boss: 'jerry', shop: 'luck', activity: 'casino', music: 'luck',
    blurb: 'The casino planet. Nobody has ever left with money. Nobody.',
    how: 'GAMBLING: slots, snail races, Glorp\'s double-or-nothing and mystery crates.',
    sky: ['#070420', '#3d1570'], fog: ['#231048', 60, 250], stars: 1.0,
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
    id: 'frost', name: 'Frostbyte', icon: '❄️', boss: 'snowdad', shop: 'frost', activity: 'crystal', music: 'frost',
    blurb: 'Ice planet. The ground is slippery and so are the prices.',
    how: 'Buy a Laser Drill from Penguin Pete (3) and mine the big crystals. Heated Socks stop the slipping.',
    sky: ['#79c2ff', '#f2fbff'], fog: ['#dff2ff', 50, 220], stars: 0.35,
    sun: ['#ffffff', 1.0], hemi: ['#e8f6ff', '#9ab8d0', 0.66],
    bodies: [
      { color: '#9fd8ff', r: 130, dir: [-0.4, 0.3, -1], ring: '#ffffff' },
    ],
    ground: ['#dcecf8', '#f6fbff', '#9fd3f0'], amp: 2.6,
    liquid: { color: '#4fb6e8', op: 0.86, name: 'freezing water' },
    grav: 20, fric: 1.7, pizza: 'Frozen Solid',
  },
  {
    id: 'zorb', name: 'Zorblax Prime', icon: '👑', boss: 'zorblax', shop: 'zorb', activity: 'none', music: 'zorb',
    blurb: 'Home of Emperor Zorblax. He ordered the pizza. He is NOT happy.',
    how: 'Final stop. Gear up at Dave\'s, then deliver the pizza. Good luck.',
    sky: ['#1a0010', '#ff4a2a'], fog: ['#5e1520', 50, 230], stars: 0.7,
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

/* ---------- collectible resources ---------- */
const RES = {
  bolt:    { name: 'Rusty Bolt', v: 8, icon: '🔩', desc: 'Holds nothing together anymore.' },
  can:     { name: 'Suspicious Can', v: 14, icon: '🥫', desc: 'Label just says "FOOD?"' },
  gear:    { name: 'Bent Gear', v: 22, icon: '⚙️', desc: 'Still spins. Emotionally.' },
  chip:    { name: 'Sticky Circuit Board', v: 48, icon: '💾', desc: 'Sticky with what? Do not ask.' },
  toaster: { name: 'Golden Toaster', v: 260, icon: '🍞', desc: 'Only toasts one side. Worth a fortune.', rare: true },
  berry:   { name: 'Gloop Berry', v: 28, icon: '🫐', desc: 'Wiggles when you look at it.' },
  chonk:   { name: 'Chonky Gloop Berry', v: 65, icon: '🍇', desc: 'An absolute unit of a berry.' },
  gold:    { name: 'Golden Gloopberry', v: 420, icon: '🌟', desc: 'Tastes like money. Literally.', rare: true },
  ice:     { name: 'Space Ice', v: 55, icon: '🧊', desc: 'Regular ice, but in SPACE.' },
  crystal: { name: 'Frost Crystal', v: 140, icon: '💎', desc: 'Hums quietly. Might be sentient.' },
  diamond: { name: 'Space Diamond', v: 1100, icon: '💠', desc: 'Forever. Like your delivery time.', rare: true },
};
const LOOT = {
  scrap:    [['bolt', 38], ['can', 30], ['gear', 20], ['chip', 9], ['toaster', 1.6]],
  berry:    [['berry', 72], ['chonk', 25], ['gold', 2.5]],
  bigberry: [['chonk', 70], ['berry', 16], ['gold', 11]],
  crystal:  [['ice', 55], ['crystal', 40], ['diamond', 4]],
};

/* ---------- gear ---------- */
const ZAPPERS = [
  { name: 'Pew Pew Zapper',     dmg: 12, cd: 0.30, color: '#ff4b3e' },
  { name: 'Zapper Deluxe',      dmg: 18, cd: 0.28, color: '#3aa7ff' },
  { name: 'Goo-Powered Zapper', dmg: 27, cd: 0.27, color: '#ff5fb8' },
  { name: 'Jackpot Blaster',    dmg: 40, cd: 0.25, color: '#ffd23f' },
  { name: 'Cryo Cannon',        dmg: 58, cd: 0.23, color: '#9fe3ff' },
];
const CARGO = [10, 20, 35, 60];
const VAC = [{ range: 7, speed: 1 }, { range: 9.5, speed: 1.9 }];
const NADE_DMG = 90;

const HATS = {
  none: 'No Hat', cone: 'Traffic Cone', antenna: 'Alien Antennae', chef: 'Chef Hat', tophat: 'Fancy Top Hat',
  crown: 'Tiny Crown', viking: 'Viking Helmet', halo: 'Halo (Unearned)', propeller: 'Propeller Beanie',
  cowboy: 'Space Cowboy Hat', pizza: 'Pizza Slice', party: 'Party Hat', duck: 'Rubber Duck', bucket: 'Bucket Hat',
};
const CRATE_HATS = ['propeller', 'cowboy', 'pizza', 'party', 'duck', 'bucket'];

const SHOPS = {
  scrap: {
    npc: 'Robo-Pawn 3000', color: '#ffb23e',
    greet: ['BEEP. I BUY GARBAGE. YOU ARE... ALSO GARBAGE? JOKE. HA. HA.', 'WELCOME, CUSTOMER. PLEASE DO NOT LICK THE MERCHANDISE.', 'I HAVE BEEN ON THIS MOON FOR 400 YEARS. BUY SOMETHING.'],
    items: [
      { kind: 'zap', lvl: 1, price: 350, desc: 'Now with a second battery. (AA.)' },
      { kind: 'vac', lvl: 1, price: 300, name: 'Turbo Vac', desc: 'Sucks twice as fast and reaches further.' },
      { kind: 'cargo', lvl: 1, price: 250, name: 'Bigger Backpack', desc: 'Holds 20 things. Mostly garbage.' },
      { kind: 'hat', id: 'cone', price: 120 },
      { kind: 'hat', id: 'antenna', price: 200 },
    ],
  },
  gloop: {
    npc: 'Chef Snorbo', color: '#ff7ac8',
    greet: ['Bonjour! I am a snail. I am a chef. Do not think about it too hard.', 'Berries! Bring me berries! I am making a soup. It is mostly berries.', 'You look hungry. And sticky. Mostly sticky.'],
    items: [
      { kind: 'boots', price: 600, name: 'Bounce Boots', desc: 'Double jump! Smells faintly of gummy bears.' },
      { kind: 'nades', price: 180, name: 'Goo Grenades x5', desc: 'Right-click to yeet in boss fights. Sticky. Explosive.' },
      { kind: 'zap', lvl: 2, price: 1400, desc: 'Runs on goo. Do not ask how.' },
      { kind: 'cargo', lvl: 2, price: 1100, name: 'Snail Shell Backpack', desc: 'Holds 35 things. The previous owner wants it back.' },
      { kind: 'hat', id: 'chef', price: 350 },
    ],
  },
  luck: {
    npc: 'Mr. Chips', color: '#ff3df0',
    greet: ['Welcome to Luckstar, where dreams come true! (Dreams do not come true.)', 'Psst. The slots are totally fair. I checked. With my eyes closed.', 'Buy something! Or gamble! Or both! Preferably both!'],
    items: [
      { kind: 'zap', lvl: 3, price: 4000, desc: 'Every shot sounds like a slot machine. Every. Single. Shot.' },
      { kind: 'nades', price: 200, name: 'Goo Grenades x5', desc: 'Imported from Gloop. Tariffs included.' },
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
      { kind: 'zap', lvl: 4, price: 9000, desc: 'Freezes the air. And enemies. And your fingers.' },
      { kind: 'cargo', lvl: 3, price: 3800, name: 'Industrial Fridge', desc: 'Holds 60 things. You are wearing a fridge now.' },
      { kind: 'hat', id: 'viking', price: 600 },
    ],
  },
  zorb: {
    npc: 'Your Manager, Dave', color: '#dfe6ee',
    greet: ['Oh good, you made it. You\'re three years late. We\'ll talk about it in your review.', 'I flew here to "support" you. Also to sell you armor. From the company.', 'Remember: the customer is always right. Even when he is trying to kill you.'],
    items: [
      { kind: 'armor', price: 5000, name: 'Company Armor', desc: 'Take 30% less damage. Deducted from your paycheck.' },
      { kind: 'life', price: 3000, name: 'Extra Life Insurance', desc: '+1 life in boss fights. Premiums may apply.' },
      { kind: 'nades', price: 250, name: 'Goo Grenades x5', desc: 'Expense report pending.' },
      { kind: 'hat', id: 'halo', price: 2500 },
    ],
  },
};

/* ---------- bosses ---------- */
const BOSSES = {
  gary: {
    name: 'Trashlord Gary', diff: 'EASY', stars: 1, hp: 900, reward: 500, color: '#8a7b5a', icon: '🗑️',
    quote: 'King of the landfill. Crowned by a raccoon. Still bitter about it.',
    taunts: ['I AM THE TRASH KING!', 'You call that a zap?! I\'ve been hit by harder banana peels!', 'Recycle THIS!', 'Smell my power!', 'One man\'s trash is... also me. I am the trash.'],
    win: 'Gary has been taken out. With the trash.',
  },
  blorb: {
    name: 'Queen Blorbina', diff: 'MEDIUM', stars: 2, hp: 2200, reward: 1200, color: '#ff5fb8', icon: '👑',
    quote: 'Absorbed her entire royal court. Still hungry.',
    taunts: ['You will be ABSORBED!', 'Bow before the goo!', 'Blorb blorb! (That was a threat.)', 'My children! Hug them! HUG THEM TO DEATH!', 'I am 98% goo and 2% RAGE!'],
    win: 'Queen Blorbina has been dethroned. And de-gooed.',
  },
  jerry: {
    name: 'Jackpot Jerry', diff: 'HARD', stars: 3, hp: 4000, reward: 3000, color: '#ffd23f', icon: '🎰',
    quote: 'A sentient slot machine. The house always wins. He IS the house.',
    taunts: ['Step right up and LOSE!', 'Feeling lucky? You shouldn\'t!', 'Your odds are TERRIBLE!', 'Insert coin to continue! Just kidding, you can\'t continue!', 'The house ALWAYS wins!'],
    win: 'Jackpot Jerry has cashed out. Permanently.',
  },
  snowdad: {
    name: 'The Abominable Snowdad', diff: 'VERY HARD', stars: 4, hp: 6400, reward: 6000, color: '#dff4ff', icon: '☃️',
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
  zorblax: {
    name: 'Emperor Zorblax the Unsatisfied', diff: 'UNREASONABLE', stars: 5, hp: 10500, reward: 20000, color: '#9b5de5', icon: '👽',
    quote: 'Ordered one large pepperoni three years ago. Has been waiting ever since.',
    taunts: ['THREE YEARS! I ORDERED THIS THREE YEARS AGO!', 'I will be leaving a VERY detailed review!', 'Is that pineapple?! I can SMELL pineapple!', 'Where are my garlic knots?!', 'I DEMAND A REFUND!'],
    taunts2: ['I WANT TO SPEAK TO YOUR MANAGER!', 'ZERO STARS! NEGATIVE STARS!', 'GUARDS! THIS DELIVERY IS UNACCEPTABLE!', 'I\'M CALLING CORPORATE!'],
    win: 'Emperor Zorblax has accepted the delivery. Reluctantly.',
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
  bonk: ['BONK!', 'ZAPPED!', 'Get zapped, nerd!', 'Friendly fire!'],
};

const SIGNS = {
  scrap: { title: 'Porta-Potty', lines: ['Occupied.', 'Occupied. (It\'s a raccoon.)', 'You don\'t need to go. Your suit handles it. Gross.', 'Someone wrote "GARY WAS HERE" on the door.'] },
  gloop: { title: 'Sign', lines: ['LUCKSTAR CASINO: NEXT PLANET! You must be this brave to gamble.', 'WARNING: Do not eat the goo. (You will eat the goo.)', 'Queen Blorbina\'s palace: 200m. Please wipe your feet.'] },
  luck: { title: 'Poster', lines: ['LUCKSTAR: 0 days since someone won big.', 'Gambling problem? Call 1-800-JUST-ONE-MORE.', 'Remember: you miss 100% of the spins you don\'t spin!'] },
  frost: { title: 'Igloo', lines: ['Nobody home. A note says "Gone fishing." (Not in this game.)', 'It\'s cold inside too. Pointless.', 'There is a tiny penguin sleeping here. Let it sleep.'] },
  zorb: { title: 'Doormat', lines: ['It says "GO AWAY."', 'It says "NO SOLICITORS. NO DELIVERY DRIVERS. ESPECIALLY LATE ONES."', 'It\'s soaking wet. Somehow. On a lava planet.'] },
};
