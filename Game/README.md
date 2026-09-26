# Space Goobers

A silly low-poly space game you can play with friends. You deliver **one pizza** across the galaxy to
Emperor Zorblax. It is three years late. It is cold. Every planet has a boss in the way.

## Play

Open `index.html` in Chrome or Edge (double-clicking it works). You need a keyboard and mouse, and an
internet connection (the 3D engine and multiplayer load from the web).

Click **Play Solo** or **Host Game**, then pick a world or create a new one. When you create a world you pick a
difficulty:

| Difficulty | What changes |
| --- | --- |
| Easy | Enemies hit normally. Die and you get back up (see below). |
| Hard | Everything hits twice as hard. Critters have 1.75x the health. |
| Hardcore | Everything hits 3.5x as hard, critters have 2.5x the health and you get one life in boss fights. Solo, if you die, the world is deleted. With friends, you go down and can be revived, but if the whole crew is down at once, the world is deleted. |

 Each world is its own save, like
Minecraft worlds. When you join a friend, your stuff in their world is saved too, so it's still there next time.
Hats are the exception: once you own a hat, it's yours in every world (and when you visit friends).

When you die on a planet, you stay down until you hold left click to respawn at the ship. Everything except your
Grabby Vac (your zapper, drill, pizza peel, grenades and whatever was in your backpack) drops in a grave where you
fell. Follow its beam of light to get it all back. Only you can pick it up, and it waits for you even if you quit
and come back later. With Extra Life Insurance (sold by Dave on Zorblax Prime) you keep your gear when you die,
and only your backpack spills.

Boss fights have no lives: if you die, hold left click and jump straight back in, as many times as it takes. You
keep your stuff in boss fights. (On Hardcore, dying is still final.)

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
   until someone revives you, but if **everyone** is down at once, the world is deleted.
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
| `E` | talk, shop, use things · hold next to a downed friend to pick them up |
| `1` `2` `3` `4` | Zapper, Grabby Vac, Laser Drill, Pizza Peel |
| Left click | use your tool |
| `R` | reload (infinite batteries, but the battery pack runs out) |
| Right click | throw a Goo Grenade (boss fights) |
| `I` | backpack (drop things) and crew (send money) |
| `T` / `Tab` / `M` / `Esc` | chat / crew list / music / pause |
| `E` at the ship | get in (and get out again while it's parked on the pad) |
| Mouse · `W`/`S` · `Shift` | in the ship: steer · throttle · boost (pilot) |
| `Space` / `C` | in the ship: lift off, go up / go down (pilot) |
| `F` | in the ship: swap seats |
| `M` / `V` | in the ship: star map / camera |

## The galaxy

You start with just a Grabby Vac. Company policy: no free guns. On each planet you collect stuff, sell it at the
shop and buy gear (your first gun too). Money is tight on the first two planets, so expect to work for it. Shops
are split into Weapons, Gear, Special, Cosmetics and Sell tabs. Anything sold on more than one planet costs the same
everywhere, and you can buy any backpack straight away (no need to own the smaller one first).

Bosses don't just show up: find the planet's summoning item (they're rare, so expect to grind), use it at the boss
altar and win. Summoning uses the item up, so a rematch needs another one. Boss fights are long: bosses have a lot of
health but hit a bit softer than they look. Your ship won't start until you've beaten Trashlord Gary.

| # | Planet | What you do there | Critters | Boss | Summon it with |
| --- | --- | --- | --- | --- | --- |
| 1 | Scrapyard-9 | Vacuum junk piles | Trash Rats, Rust Crabs, Scrap Pigeons, Can Gremlins | Trashlord Gary ★ | Stinky Crown, buried in the junk |
| 2 | Planet Gloop | Low gravity berry jumping | Blobbos, Gloop Hoppers, Puffshrooms, Goo Leeches | Queen Blorbina ★★ | Royal Jelly, in the big berries on top |
| 3 | Luckstar | **Gambling** in the Luckstar Casino, the big building next to the landing pad: slots, roulette, snail races, coin flips, crates | Chip Beetles, Dice Goblins, Card Crawlers, Slot Mimics | Jackpot Jerry ★★★ | Golden Token, from crates or Mr. Chips |
| 4 | Frostbyte | Mine crystals with the Laser Drill | Snow Mites, Ice Weasels, Pengulings, Frost Pups | The Abominable Snowdad ★★★★ | Space Milk, frozen in the crystals |
| 5 | Zorblax Prime | Catch pepperoni meteors with the Pizza Peel | Lava Snails, Magma Imps, Ember Bugs, Royal Hounds | Emperor Zorblax ★★★★★ | Reheated Pizza: catch 15 meteors |

## Critters

Shy critters run away, mean ones bite. Zap them and sell them at the shop. They come in six sizes, from Tiny to
GIANT: the bigger they are, the more they're worth, but the rarer they are (and the harder they hit). Golden ones
are worth a fortune.

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

Walk up to your ship on the landing pad and press `E` to get in. Once everyone is aboard, the pilot presses `Space`
to lift off and climbs above 150 m to reach space. Press `M` for the star map and click the planet you want to go
to; a marker on screen and the radar point the way. The planets are far apart, so it's a real trip (the autopilot
takes over if it drags on). Dodge asteroids, fly through rings to refill your boost, and grab space coins. When you
arrive, fly down to the glowing landing pad and set the ship down gently. Come down faster than 8 m/s and you crash
(it costs you a repair fee). Planets you haven't unlocked yet turn you away. Passengers can look around, and `V`
switches between the seat view and a view of the whole ship.

## For tinkerers

No build step: it's plain HTML, CSS and JavaScript using [three.js](https://threejs.org) (r128) for the
graphics and [PeerJS](https://peerjs.com) for multiplayer. Graphics settings (bloom and color grading on
High, off on Low for slower computers) are in the pause menu. Every sound and song is made in code. Worlds are saved
in your browser (clearing browser data deletes them).

- `js/data.js`: planets, items, prices, bosses, jokes (the easiest file to mess with)
- `js/world.js`, `js/models.js`: planets and all the low-poly models (the casino building is `buildCasino` in `world.js`)
- `js/boss.js`: boss fights · `js/casino.js`: gambling · `js/activities.js`: collecting, meteors, summoning items
- `js/critters.js`: space critters · `js/flight.js`: the ship, cockpit, star map and landing · `js/shop.js`: shops, boss altars
- `js/items.js`: models of the items you buy, carry and win · `js/thumbs.js`: turns models into the pictures the
  menus show (shop items, backpack, hotbar, faces)
- `js/post.js`: bloom and color grading · `js/icons.js`: interface icons
- `js/main.js`: game loop, menus, multiplayer glue · `js/net.js`: networking
