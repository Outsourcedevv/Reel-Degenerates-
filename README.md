# Space Goobers

A silly low-poly space game you can play with friends. You deliver **one pizza** across the galaxy to
Emperor Zorblax. It is three years late. It is cold. Every planet has a boss in the way.

## Download the app

Get it from the [Releases page](https://github.com/Outsourcedevv/Reel-Degenerates-/releases/latest):

- **Windows:** `Space-Goobers-...-Setup.exe` installs it, or `...-portable.exe` runs without installing. If Windows
  says "Windows protected your PC", click **More info** then **Run anyway** (the app isn't code-signed).
- **Mac:** the `.dmg`. The first time, right-click the app and choose **Open**.
- **Linux:** the `.AppImage`.

Send your friends that link, everyone installs it, and you can play together (see below). Solo works offline;
multiplayer needs internet. Press `F11` for fullscreen.

**Updates install themselves.** You only download the app once (from 1.9 on). When a new version is out, the title
screen says so: click **Update now** and the game restarts on the new version a few seconds later. It's a small
download, usually under a megabyte, and your worlds, settings and astronaut stay as they are. Once in a while an update
needs a fresh download of the whole app; the title screen tells you when, with a button to the Releases page.

## Play in a browser

Or open `index.html` in Chrome or Edge (double-clicking it works). You need a keyboard and mouse.

Click **Play Solo** or **Host Game**, then pick a world or create a new one. When you create a world you pick a
difficulty:

| Difficulty | What changes |
| --- | --- |
| Easy | Enemies hit normally. Die on a planet and you get back up (see below). |
| Hard | Everything hits twice as hard. Critters have 1.75x the health. Mini bosses learn a new attack (and pay 1.5x). |
| Hardcore | Everything hits 3.5x as hard and critters have 2.5x the health. Mini bosses learn two new attacks (and pay 2x). Solo, if you die, the world is deleted. With friends, you go down and can be revived, but if the whole crew is down at once, the world is deleted. |

 Each world is its own save, like
Minecraft worlds. When you join a friend, your stuff in their world is saved too, so it's still there next time.
Hats are the exception: once you own a hat, it's yours in every world (and when you visit friends).

**Your astronaut** is a Space Goober: tall, lanky and goofy, with a pot belly, noodle arms, big boots and a long egg
of a head (googly eyes, a droopy nose, big ears) that wobbles about inside its glass bubble. He does everything the
goofy way: bouncy walking with floppy arms, flat-out sprinting with his mouth wide open, flailing all the way down a
long fall, a front flip on a double jump, getting knocked off his feet when something bites him, and lying on his back
kicking like a flipped bug when he's down. The bigger the gun, the harder it kicks him about. Stand still for a bit
and he fidgets: he scratches his helmet, tries to pick his nose (the glass is in the way), drums on his belly, yawns.
Your crew sees all of it. To see it yourself, press `V` for third person (or pick the camera in the pause menu), and
press `G` for an emote: wave, chicken dance, flex, floss, facepalm and faint, a different one each press (in first
person, the camera swings round so you can watch).

Click **Customize** on the title screen (or in the pause menu) to dress him up, with a preview of him goofing about
(the buttons on it try out the emotes):

- **Suit:** suit color, accent color (chest panel, belt, collar, cuffs), pattern (stripes, racing stripe,
  two-tone, half and half, shoulder pads, spots), chest badge (buttons, star, heart, lightning, pizza, moon) and
  backpack (air tanks, jet pack, pizza box, rocket, or none).
- **Face & helmet:** skin, hair and hair color, eyes, mouth, extras (mustache, beard, freckles, blush, glasses, clown
  nose), the tint of your helmet glass, and which of your hats to wear.

Your look is saved on your computer and your crew sees it (even if you change it in the middle of a game). New
players start with a random face. **Randomize** rolls a whole new astronaut.

When you die on a planet, you stay down until you hold left click to respawn at the ship. Everything except your
Grabby Vac and the free Squirt Pistol (the guns you bought, your drill, pizza peel, grenades and whatever was in
your backpack) drops in a grave where you fell. Follow its beam of light to get it all back. Only you can pick it
up, and it waits for you even if you quit and come back later. With Extra Life Insurance (sold by Dave on Zorblax
Prime) you keep your gear when you die, and only your backpack spills.

Boss fights give you **one life**, whatever the difficulty. Playing solo, if you go down, the boss wins (on
Hardcore, that's the end of the world). With friends you go down instead: a friend can walk over and hold `E` to
pick you up, or you get back up by yourself after 10 seconds (15 on Hard, 20 on Hardcore) as long as at least one of
them is still standing. If the whole crew is down at once, the boss wins. You keep your stuff in boss fights.

## Play with friends

1. One person clicks **Host Game** and gets a 5-letter room code.
2. Everyone else types the code and clicks **Join**.
3. Everybody gets in the ship themselves (`E` at the ship). The first one in is the pilot, everyone else rides
   in the back, and the ship won't lift off until the whole crew is aboard. `F` swaps seats: the pilot moves to
   the back, then anyone in the back can take the controls.
4. The crew works together: summoning items and the pizza reheating count for everyone, and anyone holding a
   summoning item can start a boss fight. Everyone on the planet who has a gun gets pulled in.
5. When you'd die with friends around, you go **down** instead. A friend walks up and holds `E` to pick you back
   up. On Easy and Hard you bleed out after 25 seconds and it counts as a normal death. On Hardcore you stay down
   until someone revives you, but if **everyone** is down at once, the world is deleted. (Boss fights work a bit
   differently, see above.)
6. Press `I` to send money to a friend (Crew & Money tab) or drop things from your backpack. Dropped stuff lands
   in a crate anyone can pick up by walking over it.
7. Friendly fire is off by default (zaps just bonk your friends). The host can turn it on in the pause menu.

Each friend needs to open the game too. The easiest way is to put it online for free with GitHub Pages:
**Settings > Pages > Deploy from a branch > `main` / `(root)` > Save**. After a minute it's live at
`https://outsourcedevv.github.io/Reel-Degenerates-/`, and you can send friends that link.

## Controls

| Key | Does |
| --- | --- |
| `W` `A` `S` `D` / `Shift` | move / sprint |
| `Space` | jump (double jump with Bounce Boots) |
| `Q` | dash (Getaway Sneakers, from Luckstar) |
| `C` in the air | ground pound (Yeti Stompers, from Frostbyte) |
| hold `Space` in the air | glide (Glider Cape, from Nimbus-9) or fly (Jet Pack, from Gigopolis) |
| `E` | talk, shop, use things · hold next to a downed friend to pick them up |
| `1` `2` `3` `4` | gun, Grabby Vac, Laser Drill, Pizza Peel · `1` again switches between the guns you own |
| Left click | use your tool |
| `R` | reload (infinite batteries, but the battery pack runs out) |
| Right click | throw a Goo Grenade (boss fights) |
| `I` | backpack (drop things) and crew (send money) |
| `V` / `G` | first or third person (see your goober) / emote (a different one each press) |
| `H` | what to do on this planet (a short guide) |
| `T` / `Tab` / `M` / `Esc` | chat / crew list / music / pause |
| `E` at the ship | get in (and get out again while it's parked on the pad) |
| Mouse · `W`/`S` · `Shift` | in the ship: aim (the ship swings round to the circle) · throttle · boost (pilot) |
| `Space` / `C` | in the ship: lift off, go up / go down (pilot) |
| `F` | in the ship: swap seats |
| `M` / `V` | in the ship: star map / look at the ship from outside (passengers) |

## The galaxy

You start with a Grabby Vac and the Squirt Pistol, a leaky water pistol that barely tickles a critter (company
policy: the cheapest gun there is). On each planet you collect stuff, sell it at the shop and buy gear (a real gun
first). Money is tight on the first two planets, so expect to work for it. Every gun you buy is yours to keep: press
`1` again to switch between them, or use **Equip** at any shop. Shops are split into Weapons, Gear, Special,
Cosmetics and Sell tabs, and you can walk up to a shop from any side. Anything sold on more than one planet costs
the same everywhere, and you can buy any backpack straight away (no need to own the smaller one first).

Every planet has a short guide to what to do there: it shows up when you arrive, and `H` brings it back. The Grabby
Vac is handy everywhere: everything you can suck up shows the actual thing you'll get, floating over a glowing ring.

Bosses don't just show up: find the planet's summoning item (they're rare, so expect to grind), use it at the boss
altar and win. Summoning uses the item up, so a rematch needs another one. Boss fights are long: bosses have a lot of
health but hit a bit softer than they look. Your ship won't start until you've beaten Trashlord Gary.

| # | Planet | What you do there | Critters | Boss | Summon it with |
| --- | --- | --- | --- | --- | --- |
| 1 | Scrapyard-9 | Vacuum junk piles | Trash Rats, Rust Crabs, Scrap Pigeons, Can Gremlins | Trashlord Gary ★ | Stinky Crown, buried in the junk |
| 2 | Planet Gloop | Low gravity berry jumping up giant mushrooms (stand on the caps, walk under them) | Blobbos, Gloop Hoppers, Puffshrooms, Goo Leeches | Queen Blorbina ★★ | Royal Jelly, in the big berries on top |
| 3 | Luckstar | **Gambling** in the Luckstar Casino, the big building next to the landing pad: slots, roulette, snail races, coin flips, crates. Vacuum up dropped chips | Chip Beetles, Dice Goblins, Card Crawlers, Slot Mimics | Jackpot Jerry ★★★ | Golden Token, from crates or Mr. Chips |
| 4 | Frostbyte | Mine crystals with the Laser Drill, vacuum snow piles | Snow Mites, Ice Weasels, Pengulings, Frost Pups | The Abominable Snowdad ★★★★ | Space Milk, frozen in the crystals |
| 5 | Spookulon | Vacuum ghosts in the graveyards (you can't shoot them; keep them in your sights: they dodge and BOO you) | Space Bats, Skele-Toms, Jack-o'-Landers, Grave Grubs | Count Carbula ★★★★★ | Count's Dinner Bell, haunted by one of the ghosts |
| 6 | Nimbus-9 | Grab Sky Pearls off floating islands; glowing updrafts carry you up (fall off and you wash up at the ship) | Cloud Puffs, Sky Gulls, Wild Kites, Static Sprites | Stormy McStormface ★★★★★★ | Weather Balloon, in the big pearls on the highest islands |
| 7 | Gigopolis | Delivery gigs: take a parcel at the GigHub kiosk and race it to a door or rooftop (jump pads get you up there). Vacuum litter | Rogue Drones, Trash Pandas, Unpaid Intern Bots, Feral E-Scooters | CEO Chad Grindset ★★★★★★★ | Mandatory Meeting Invite, from a delivery customer |
| 8 | Zorblax Prime | Catch pepperoni meteors with the Pizza Peel, vacuum burnt crusts | Lava Snails, Magma Imps, Ember Bugs, Royal Hounds | Emperor Zorblax ★★★★★★★★ | Reheated Pizza: catch 15 meteors |

### Just for fun

The planets without a thing of their own have something to play. Press `E` at the start (each planet's guide, `H`,
says where it is):

| Planet | What | Medals (each pays once per world) |
| --- | --- | --- |
| Planet Gloop | **Ring Run**: go through every glowing ring (out across the goo, up a mushroom staircase, a leap off the top) and back to the pad, against the clock. A beam shows the next ring | bronze $40 · silver $90 · gold $180 |
| Frostbyte | **Snowman Shooting Gallery**: 30 seconds of pop-up snowmen (1 point), golden snowmen (3) and penguins (don't: -2). Any gun works. Stay at the counter | $150 · $350 · $700 |
| Spookulon | **Hedge of No Return**: a maze next to the boss altar with the treasure in the middle, against the clock. Some dead ends are haunted, and you can't go over the hedges | $300 · $700 · $1,400 |

Your best is kept, and your crew hears about new medals. Friends can play at the same time, each on their own run.

### Boss fights

Every attack is telegraphed, so you can read the fight:

- **Wind-ups.** Before a boss attacks it strikes a pose (arm back to throw, arms up to slam, a crouch before it
  jumps) and glows. The attack's name shows under its health bar, with a bar that fills until it goes off. With
  friends, **AT YOU** means you're the target.
- **Red on the floor means it's about to hurt.** Circles fill up until they go off. Shockwave rings are glowing
  walls with a bright top edge and a red band on the floor, so you can see them coming from across the arena.
  Striped lanes are about to be lasered. Arrows in a lane show which way a boss is about to charge. A curved arrow
  means a beam is about to sweep around the floor.
- **What to do** flashes under your crosshair: **JUMP!** (a shockwave or a sweeping beam is about to reach you),
  **MOVE!** (you're standing in the red) or **RUN!** (something is chasing you, or the wind is dragging you).
- **Where it's coming from.** Everything a boss throws glows and leaves a trail. Arrows around your crosshair point at
  shots coming from where you aren't looking, a red arc shows which way a hit came from, and a big arrow at the edge
  of the screen points at the boss when it's off screen.

Each boss has its own set of attacks. Some of the nastier ones:

| Boss | Watch out for |
| --- | --- |
| Trashlord Gary | **Lid Toss** (his lid, thrown like a boomerang: it comes back) · **Stink Cloud** (green gas that stays put) |
| Queen Blorbina | **Triple Bounce** (three belly flops in a row) · **Goo Puddles** (lobbed goo that slows you down) |
| Jackpot Jerry | **Deal 'Em** (fans of playing cards) · **Lucky Spin** (a spotlight sweeps the floor: jump it) |
| The Abominable Snowdad | **Belly Slide** (a charge across the arena) · **Avalanche** (giant rolling snowballs) |
| Count Carbula | **Mist Step** (vanishes and reappears right behind you) · **Bat Cage** (a ring of bats closes in: find the gap) |
| Stormy McStormface | **Chain Lightning** (strikes walking across the floor at you) · **Eye of the Storm** (the wind drags you toward a lightning strike) |
| CEO Chad Grindset | **Pivot!** (a laser sweep: jump it) · **Hustle Culture** (three charges in a row) |
| Emperor Zorblax | **Royal Gaze** (an eye beam that follows you) · **Pizza Wall** (a wall of slices with one gap; the Pizza Peel catches them) |

Every planet sells a different gun, and each one shoots differently:

| Gun | Where | What it does |
| --- | --- | --- |
| Squirt Pistol | you start with it | a leaky water pistol. Buy a real gun |
| Pew Pew Zapper | Scrapyard-9 | zaps |
| Scrap Scattergun | Scrapyard-9 | six pellets a shot |
| Goo Lobber | Planet Gloop | balls of goo that splash and slow critters |
| Jackpot Blaster | Luckstar | every shot is a slot pull: x2, 777s, the odd JACKPOT |
| Cryo Beam | Frostbyte | hold to freeze things |
| Wisp Caller | Spookulon | ghost wisps that drift after whatever is nearest your crosshair (they hit softer than the guns you aim) |
| Storm Caller | Nimbus-9 | lightning that jumps from target to target (and stuns critters) |
| Same-Day Launcher | Gigopolis | exploding parcels; shoot the ground under you mid-jump to rocket-jump |
| Pizza Cutter | Zorblax Prime | spinning cutters that slice through everything and come back |

You can see your hands holding whatever you've got out, in your accent-colored gloves and suit-colored sleeves (two
hands on the bigger guns). Guns kick when they fire: your view jumps up and settles back, but a little of the kick stays, so
pull down a bit between shots. The Scattergun and the Same-Day Launcher kick hardest. The Pew Pew Zapper and the
Wisp Caller barely move.

Movement gear you can pick up along the way (you keep it when you die):

| Gear | Where | What it does |
| --- | --- | --- |
| Duct-Tape Skates | Scrapyard-9 | sprint 35% faster |
| Bounce Boots | Planet Gloop | double jump |
| Getaway Sneakers | Luckstar | `Q` to dash, once in the air too |
| Heated Socks | Frostbyte | no more slipping on the ice |
| Yeti Stompers | Frostbyte | `C` in the air slams you down with a shockwave that squashes critters |
| Spring-Heeled Jacks | Spookulon | jump way higher (Bounce Boots get bouncier too) |
| Glider Cape | Nimbus-9 | hold `Space` while you fall to glide |
| Jet Pack | Gigopolis | hold `Space` in the air to fly up; the fuel refills on the ground |

## Critters

Shy critters run away. Mean ones hunt you: a red **!** and a growl mean one has spotted you. They run you down,
and when one crouches over a red mark on the ground it's about to pounce (step aside!). The rarer mean kind on every
planet keeps its distance and throws or spits things at you, aimed at where you're heading, so keep changing
direction: Slot Mimics and Royal Hounds throw three at a time, Frost Pups and Static Sprites two in a row, Goo Leech
goo and Frost Pup snowballs slow you down, and Goo Leeches, Grave Grubs and Magma Imps leave puddles where they land.
From Luckstar on, the biters throw things too now and then (dice, icicles, bones, stolen fries, garbage, lava). Feral
E-Scooters charge from way off. Shoot a mean one and it comes for you, and its friends nearby join in. Each one bites
on its own timer, so a pack is dangerous. Zap them and sell them at the shop. When you join a game, land on a planet
or respawn, they leave you alone for a bit (watch the **SAFE** timer), unless you shoot one first. Their colors and
an outline keep them from blending into the ground. They come in six sizes, from Tiny to GIANT: the bigger they are, the more they're worth,
but the rarer they are (and the harder they hit). Golden ones are worth a fortune.

### Mini bosses

Zap 20 critters on a planet and from then on every critter you zap there has a 2.5% chance of bringing that planet's
mini boss (about 40 more kills on average; the count starts again after one turns up). Everyone on the planet gets a
heads-up at 20. Scrapyard-9 doesn't have one. A mini boss is a huge, crowned version of one of the planet's critters
that hunts you across the planet. It fights like a boss: each attack winds up with its name under the health bar,
and everything that can hurt you is marked on the ground first (circles that fill up, shockwaves to jump, arrows
where it's about to charge, marks where things will land, puddles). It has two attacks on Easy, learns a new one on
Hard and one more on Hardcore, and on harder worlds it's also tougher and quicker. Below half health it gets angry
and attacks faster. When it goes down, everyone on the planet gets paid (1.5x on Hard, 2x on Hardcore).

| Planet | Mini boss | Easy | + Hard | + Hardcore | Pays |
| --- | --- | --- | --- | --- | --- |
| Planet Gloop | Sir Squelchalot (a Gloop Hopper that ate all the others) | Belly Flop (jumps on you, then a shockwave), Goo Volley (lobbed goo, sticky puddles) | Split! (three Gloop Hoppers) | Goo Geysers (erupt under you as you run) | $220 |
| Luckstar | The Pit Boss (a slot machine that runs the floor) | Coin Fan, Roll the Dice (giant dice down marked lanes) | Chip Rain | Double Down (two charges in a row) | $1,200 |
| Frostbyte | Mama Yeti (someone zapped her babies) | Snowball Barrage, Ground Pound (two shockwaves) | Icicle Rain | Avalanche (rolls at you as a giant snowball) | $2,000 |
| Spookulon | Bonejangles (Skele-Tom's big brother) | Bone Toss, Grave Grab (hands out of the ground: they slow you) | Ecto Nova (rings of gunk to slip between) | Rise, Boneheads! (three Skele-Toms) | $2,800 |
| Nimbus-9 | Thunderhead (a Static Sprite that became weather) | Zap Zap Zap, Lightning Strike | Static Shock (shockwaves and a charged patch) | Chain Storm (lightning chasing you) | $3,800 |
| Gigopolis | Scooterzilla (every abandoned e-scooter, welded into one) | Full Throttle (a charge), Parking Tickets | Calling Backup (three Feral E-Scooters) | Surge Pricing (it rains parcels) | $5,000 |
| Zorblax Prime | Cerberoni (the Emperor's guard dog) | Triple Fireball, Royal Pounce | Lava Spit (burning puddles) | Meteor Shower | $8,000 |

### Style kills

Kill them in style for a bonus. Each bonus is at most 2x, and they stack up to 5x in total:

| Style | Bonus | How |
| --- | --- | --- |
| 360 | 2x | spin all the way around right before the kill |
| Multi Kill | 2x | three or more kills, each within 3 seconds of the last |
| Airborne | 1.5x | kill it while you're in the air |
| Last Shot | 1.5x | kill it with the last shot in your battery |
| Long Shot | 1.5x | kill it from 25 m away or more |
| Double Kill | 1.5x | two kills within 3 seconds |
| Revenge | 1.5x | kill the critter that just bit you |
| Clutch | 1.5x | kill it while you're under 25 HP |
| One Shot | 1.3x | take it down with a single hit |
| Point Blank | 1.25x | kill it from right up close |
| On The Run | 1.2x | kill it while sprinting |

## Flying

Walk up to your ship on the landing pad and press `E` to get in. The pilot flies from the cockpit. The ship is big
and doesn't flick around: move the mouse to put the aim circle where you want to go, and the ship swings round to it
at its own pace. Once everyone is aboard, the pilot presses `Space` to lift off and climbs above 150 m to reach
space. Press `M` for the star map and click the planet you want to go to; a marker on screen and the radar point the
way. The planets are far apart, so it's a real trip (the autopilot takes over if it drags on). Dodge asteroids, fly
through rings to refill your boost, and grab space coins. When you arrive, fly down to the glowing landing pad and
set the ship down gently (look down through the glass floor in front of your seat to line it up). Come down faster
than 8 m/s and you crash (it costs you a repair fee). Planets you haven't unlocked yet turn you away. Passengers
ride in the cabin behind the cockpit: big windows by every row, a screen that says where you're going and how long
it'll take, and a view of the pilot flying. They can look around, and `V` switches between their seat and a view of
the whole ship from outside.

## For tinkerers

No build step: it's plain HTML, CSS and JavaScript using [three.js](https://threejs.org) (r128) for the
graphics and [PeerJS](https://peerjs.com) for multiplayer (both bundled in `vendor/`). Graphics settings (bloom and color grading on
High, off on Low for slower computers) are in the pause menu. Every sound and song is made in code. Worlds are saved
in your browser (clearing browser data deletes them).

- `js/data.js`: planets, items, prices, bosses, jokes (the easiest file to mess with)
- `js/world.js`, `js/models.js`: planets and all the low-poly models (the casino building is `buildCasino` in `world.js`)
- `js/boss.js`: boss fights · `js/casino.js`: gambling · `js/activities.js`: collecting, meteors, delivery gigs, summoning items
- `js/fun.js`: the Ring Run, the Snowman Shooting Gallery and the Hedge of No Return (and their medals)
- `js/critters.js`: space critters · `js/miniboss.js`: mini bosses (their attacks are `MB_ATTACKS`, the rest is `MINIBOSSES` in `data.js`)
  · `js/hazards.js`: what they throw at you, marked on the ground · `js/flight.js`: the ship, cockpit, passenger cabin, star map and landing · `js/shop.js`: shops, boss altars
- `js/items.js`: models of the items you buy, carry and win · `js/thumbs.js`: turns models into the pictures the
  menus show (shop items, backpack, hotbar, faces)
- `js/custom.js`: the Customize screen (the looks themselves are `LOOK_PARTS` and `buildAstronaut` in `models.js`)
- `js/goober.js`: how your goober moves (walking, flailing, recoil, fidgets, emotes: `GooberAnim`)
- `js/post.js`: bloom and color grading · `js/icons.js`: interface icons
- `js/main.js`: game loop, menus, multiplayer glue · `js/net.js`: networking
- `desktop/`: the desktop app (Electron). `npm install` then `npm start` runs it; `npm run dist` builds installers.
  GitHub rebuilds the Windows, Mac and Linux downloads on the Releases page whenever the game changes, and posts the
  game's files as one small bundle with a `game.json` next to them. Installed apps check `game.json` when they start
  and update themselves from the bundle (`desktop/updater.js`, packed by `desktop/pack-game.js`). If a downloaded
  version won't start, the app goes back to the one it came with. `SPACE_GOOBERS_UPDATES=<a game.json address>
  npm start` tries updating from the source.
