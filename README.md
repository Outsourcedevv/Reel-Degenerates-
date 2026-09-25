# Space Goobers

A silly low-poly space game you can play with friends. You deliver **one pizza** across the galaxy to
Emperor Zorblax. It is three years late. It is cold. Every planet has a boss in the way.

## Play

Open `index.html` in Chrome or Edge (double-clicking it works). You need a keyboard and mouse, and an
internet connection (the 3D engine and multiplayer load from the web).

Click **Play Solo** or **Host Game**, then pick a world or create a new one. Each world is its own save, like
Minecraft worlds. When you join a friend, your stuff in their world is saved too, so it's still there next time.

## Play with friends

1. One person clicks **Host Game** and gets a 5-letter room code.
2. Everyone else types the code and clicks **Join**.
3. The host is the captain and flies the ship. Anyone holding a summoning item can start a boss fight, and
   everyone on the planet who has a gun gets pulled in.

Each friend needs to open the game too. The easiest way is to put it online for free with GitHub Pages:
**Settings > Pages > Deploy from a branch > `main` / `(root)` > Save**. After a minute it's live at
`https://outsourcedevv.github.io/Reel-Degenerates-/`, and you can send friends that link.

## Controls

| Key | Does |
| --- | --- |
| `W` `A` `S` `D` / `Shift` | move / sprint |
| `Space` | jump (double jump with Bounce Boots) |
| `E` | talk, shop, use things |
| `1` `2` `3` `4` | Zapper, Grabby Vac, Laser Drill, Pizza Peel |
| Left click | use your tool |
| `R` | reload (infinite batteries, but the battery pack runs out) |
| Right click | throw a Goo Grenade (boss fights) |
| `T` / `Tab` / `M` / `Esc` | chat / crew list / music / pause |
| `E` at the ship | climb into the cockpit |
| Mouse · `W`/`S` · `Shift` | in the ship: steer · throttle · boost |
| `Space` / `C` | in the ship: go up / go down |
| `M` / `V` | in the ship: star map / cockpit or chase camera |

## The galaxy

You start with just a Grabby Vac. Company policy: no free guns. On each planet you collect stuff, sell it at the
shop and buy gear (your first gun too). Every planet also has little space critters: shy ones run away, mean ones
bite. Zap them and sell them (golden ones are worth a fortune). Bosses don't just show up: find the planet's
summoning item, use it at the boss altar and win. Summoning uses the item up, so a rematch needs another one.

| # | Planet | What you do there | Boss | Summon it with |
| --- | --- | --- | --- | --- |
| 1 | Scrapyard-9 | Vacuum junk piles · hunt Trash Rats and Rust Crabs | Trashlord Gary ★ | Stinky Crown, buried in the junk |
| 2 | Planet Gloop | Low gravity berry jumping · hunt Blobbos and Gloop Hoppers | Queen Blorbina ★★ | Royal Jelly, in the big berries on top |
| 3 | Luckstar | **Gambling:** slots, snail races, coin flips, crates · hunt Chip Beetles and Dice Goblins | Jackpot Jerry ★★★ | Golden Token, from crates or Mr. Chips |
| 4 | Frostbyte | Mine crystals with the Laser Drill · hunt Snow Mites and Ice Weasels | The Abominable Snowdad ★★★★ | Space Milk, frozen in the crystals |
| 5 | Zorblax Prime | Catch pepperoni meteors with the Pizza Peel · hunt Lava Snails and Magma Imps | Emperor Zorblax ★★★★★ | Reheated Pizza: catch 5 meteors |

## Flying

Walk up to your ship on the landing pad and press `E` to sit in the cockpit. Press `Space` to lift off and climb
above 150 m to reach space. Press `M` for the star map and click the planet you want to go to; a marker on screen
and the radar point the way. Dodge asteroids, fly through rings to refill your boost, and grab space coins.
When you arrive, fly down to the glowing landing pad and set the ship down gently. Come down faster than 8 m/s
and you crash (it costs you a repair fee). Planets you haven't unlocked yet turn you away.

## For tinkerers

No build step: it's plain HTML, CSS and JavaScript using [three.js](https://threejs.org) (r128) for the
graphics and [PeerJS](https://peerjs.com) for multiplayer. Graphics settings (bloom and color grading on
High, off on Low for slower computers) are in the pause menu. Every sound and song is made in code. Worlds are saved
in your browser (clearing browser data deletes them).

- `js/data.js`: planets, items, prices, bosses, jokes (the easiest file to mess with)
- `js/world.js`, `js/models.js`: planets and all the low-poly models
- `js/boss.js`: boss fights · `js/casino.js`: gambling · `js/activities.js`: collecting, meteors, summoning items
- `js/critters.js`: space critters · `js/flight.js`: the ship, cockpit, star map and landing · `js/shop.js`: shops, boss altars
- `js/post.js`: bloom and color grading · `js/icons.js`: interface icons
- `js/main.js`: game loop, menus, multiplayer glue · `js/net.js`: networking
