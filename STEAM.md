# Space Goobers on Steam

The desktop app talks to Steam through [steamworks.js](https://github.com/ceifa/steamworks.js): **Steam
achievements**, the **Steam overlay** (`Shift+Tab`), and your Steam name for your goober. It all switches on by itself
once the game has its App ID. Until then (and in the GitHub download, and in a browser) the game works exactly as
before and keeps its own list of achievements, with its own "Achievement unlocked" pop-up.

## 1. Put in the App ID

In `desktop/steam.json`, set `appId` to the game's App ID from the Steamworks partner site:

```json
{ "appId": 1234560, "requireSteam": false }
```

- To try it before you have one, use `480` (Valve's test app, "Spacewar") with Steam running: the game connects, and
  unlocking works (on Spacewar's own achievements, so nothing of ours shows up there).
- `requireSteam: true` makes a copy started outside Steam restart through Steam (Steam's usual check that you own
  it). Only turn it on for the build you upload to Steam: with it on, the GitHub download keeps opening Steam.
- When Steam starts the game from the library it passes the App ID along, so the Steam build works even if
  `steam.json` still says `0`.

## 2. Add the achievements on Steamworks

**App Admin > Stats & Achievements > Achievements**: add each one below. The **API name must match exactly** (it's
what the game sends). Upload the two icons for each from [`steam/achievements/`](steam/achievements) (64x64: the
first when you have it, the `_locked` one while you don't). Then **Publish** your changes on the Steamworks site.

| # | API name | Name | Description | Icons |
| --- | --- | --- | --- | --- |
| 1 | `BOSS_GARY` | Taking Out the Trash | Beat Trashlord Gary. | `BOSS_GARY.png` / `BOSS_GARY_locked.png` |
| 2 | `BOSS_BLORB` | Off With Her Goo | Beat Queen Blorbina. | `BOSS_BLORB.png` / `BOSS_BLORB_locked.png` |
| 3 | `BOSS_JERRY` | The House Always Loses | Beat Jackpot Jerry. | `BOSS_JERRY.png` / `BOSS_JERRY_locked.png` |
| 4 | `BOSS_SNOWDAD` | Dad Joke Overload | Beat the Abominable Snowdad. | `BOSS_SNOWDAD.png` / `BOSS_SNOWDAD_locked.png` |
| 5 | `BOSS_COUNT` | Stake Holder | Beat Count Carbula. | `BOSS_COUNT.png` / `BOSS_COUNT_locked.png` |
| 6 | `BOSS_STORMY` | Clear Skies Ahead | Beat Stormy McStormface. | `BOSS_STORMY.png` / `BOSS_STORMY_locked.png` |
| 7 | `BOSS_CHAD` | Hostile Takeover | Beat CEO Chad Grindset. | `BOSS_CHAD.png` / `BOSS_CHAD_locked.png` |
| 8 | `BOSS_ZORBLAX` | Delivered (Cold) | Get the pizza to Emperor Zorblax. Finally. | `BOSS_ZORBLAX.png` / `BOSS_ZORBLAX_locked.png` |
| 9 | `HARDCORE_BOSS` | No Take-Backs | Beat a boss on a Hardcore world. | `HARDCORE_BOSS.png` / `HARDCORE_BOSS_locked.png` |
| 10 | `FIRST_GUN` | Liability Waiver | Buy your first real gun. | `FIRST_GUN.png` / `FIRST_GUN_locked.png` |
| 11 | `ALL_GUNS` | Walking Armory | Own every gun in the galaxy. | `ALL_GUNS.png` / `ALL_GUNS_locked.png` |
| 12 | `SIGHT` | Eyes on the Prize | Buy a sight for a gun. | `SIGHT.png` / `SIGHT_locked.png` |
| 13 | `RICH` | Tip Jar | Have $10,000 at once. | `RICH.png` / `RICH_locked.png` |
| 14 | `FIRST_FLIGHT` | Late Departure | Fly the ship to another planet. | `FIRST_FLIGHT.png` / `FIRST_FLIGHT_locked.png` |
| 15 | `HEADSHOT` | Right in the Eyestalks | Zap a critter with a headshot. | `HEADSHOT.png` / `HEADSHOT_locked.png` |
| 16 | `GIANT` | The Bigger They Are | Zap a GIANT critter. | `GIANT.png` / `GIANT_locked.png` |
| 17 | `GOLDEN` | Gold Digger | Zap a golden critter. | `GOLDEN.png` / `GOLDEN_locked.png` |
| 18 | `STYLE` | Show-Off | Zap a critter with three style bonuses at once. | `STYLE.png` / `STYLE_locked.png` |
| 19 | `MINI_BOSS` | Big Game Hunter | Take down a mini boss. | `MINI_BOSS.png` / `MINI_BOSS_locked.png` |
| 20 | `GHOST` | Spirit Vacuum | Vacuum up a ghost on Spookulon. | `GHOST.png` / `GHOST_locked.png` |
| 21 | `REVIVE` | Get Up, Goober | Pick a downed friend back up. | `REVIVE.png` / `REVIVE_locked.png` |
| 22 | `DUEL` | Pit Boss | Win a duel in the Luckstar Duel Pit. | `DUEL.png` / `DUEL_locked.png` |
| 23 | `JACKPOT` | Company Money | Hit a jackpot at the Luckstar Casino. | `JACKPOT.png` / `JACKPOT_locked.png` |
| 24 | `GOLD_MEDAL` | Overachiever | Win a gold medal in a just-for-fun challenge. | `GOLD_MEDAL.png` / `GOLD_MEDAL_locked.png` |

The list lives in `js/achievements.js` (`ACHIEVEMENTS`). Adding one there means adding it on Steamworks too.

## 3. What happens in the game

- **Unlocking.** On Steam, achievements go straight to Steam, which shows its own pop-up. Most are worked out from
  your save (bosses beaten, guns and sights owned, $10,000, medals, jackpots, mini bosses), so ones earned before
  the Steam version turn up the first time you load that world. The rest unlock as they happen (headshots, GIANT
  and golden critters, style kills, ghosts, reviving a friend, duels, flying to another planet).
- **Achievements screen** (title screen and pause menu): all of them, with what you have. On Steam it reads Steam's
  list and has an **Open in Steam** button (the overlay's achievements page).
- **The overlay.** `Shift+Tab` opens it; the game lets go of the mouse and pauses so you can use it. The overlay
  needs the game to run its graphics in the main process (`in-process-gpu`), so that's only switched on when Steam
  starts the game.
- **Your name.** Until you pick one yourself (Customize), your goober goes by your Steam name.
- **Updates.** For now the app keeps updating itself from GitHub on Steam too (the title screen offers each new
  version, as in the GitHub download). Steam also delivers whatever build you upload. To leave updates to Steam
  alone later, `canUpdate` in `desktop/main.js` can skip them when `steam.active()` or `steam.launchedBySteam()`.

## 4. Uploading the build

Build as usual (the **Desktop app** GitHub workflow, or `npm run dist`). Upload the unpacked app to your Steam depots
(the folder `electron-builder` makes before the installer: `dist/win-unpacked`, `dist/linux-unpacked`,
`dist/mac-universal/Space Goobers.app`), with the launch option pointing at `Space Goobers.exe` (Windows),
`space-goobers` (Linux) or the `.app` (Mac). The Steam libraries (`steam_api64.dll`, `libsteam_api.so`,
`libsteam_api.dylib`) come along inside `resources/app.asar.unpacked/node_modules/steamworks.js/dist/`.

Saves (worlds, settings, look, achievements off Steam) are in the app's data folder (Windows
`%APPDATA%/Space Goobers`, Mac `~/Library/Application Support/Space Goobers`, Linux `~/.config/Space Goobers`). To
have Steam Cloud keep them, set up **Steam Cloud > Auto-Cloud** on Steamworks with that folder's `Local Storage`
subfolder.
