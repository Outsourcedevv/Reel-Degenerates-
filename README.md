# 🍕 Space Goobers

A silly low-poly space game you can play with friends. You deliver **one pizza** across the galaxy to
Emperor Zorblax. It is three years late. It is cold. Every planet has a boss in the way.

## Play

Open `index.html` in Chrome or Edge (double-clicking it works). You need a keyboard and mouse, and an
internet connection (the 3D engine and multiplayer load from the web).

## Play with friends

1. One person clicks **Host Game** and gets a 5-letter room code.
2. Everyone else types the code and clicks **Join Friend**.
3. The host is the captain: they fly the ship and start boss fights. Everyone gets pulled into fights together.

Each friend needs to open the game too. The easiest way is to put it online for free with GitHub Pages:
**Settings → Pages → Deploy from a branch → `main` / `(root)` → Save**. After a minute it's live at
`https://outsourcedevv.github.io/Reel-Degenerates-/`, and you can send friends that link.

## Controls

| Key | Does |
| --- | --- |
| `W` `A` `S` `D` / `Shift` | move / sprint |
| `Space` | jump (double jump with Bounce Boots) |
| `E` | talk, shop, use things |
| `1` `2` `3` `4` | Zapper, Grabby Vac, Laser Drill, Pizza Peel |
| Left click | use your tool |
| Right click | throw a Goo Grenade (boss fights) |
| `T` / `Tab` / `M` / `Esc` | chat / crew list / music / pause |

## The galaxy

Collect each planet's stuff, sell it at the shop, buy gear, beat the boss, fly to the next planet.

| # | Planet | What you do there | Boss |
| --- | --- | --- | --- |
| 1 | 🛠️ Scrapyard-9 | Vacuum junk piles with the Grabby Vac | Trashlord Gary ★ |
| 2 | 🍄 Planet Gloop | Low gravity: jump up giant mushrooms for berries | Queen Blorbina ★★ |
| 3 | 🎰 Luckstar | **Gambling:** slots, snail races, coin flips, mystery crates | Jackpot Jerry ★★★ |
| 4 | ❄️ Frostbyte | Slippery ice: mine crystals with the Laser Drill | The Abominable Snowdad ★★★★ |
| 5 | 👑 Zorblax Prime | Catch falling pepperoni meteors with the Pizza Peel | Emperor Zorblax ★★★★★ |

## For tinkerers

No build step: it's plain HTML, CSS and JavaScript using [three.js](https://threejs.org) (r128) for the
graphics and [PeerJS](https://peerjs.com) for multiplayer. Every sound and song is made in code. Saves live in
your browser, one per player name.

- `js/data.js`: planets, items, prices, bosses, jokes (the easiest file to mess with)
- `js/world.js`, `js/models.js`: planets and all the low-poly models
- `js/boss.js`: boss fights · `js/casino.js`: gambling · `js/activities.js`: collecting and meteors
- `js/main.js`: game loop, menus, multiplayer glue · `js/net.js`: networking
