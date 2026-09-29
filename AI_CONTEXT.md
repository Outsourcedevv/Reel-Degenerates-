# AI Context — Space Goobers

> Shared handoff file for Claude, GPT/Codex, and other coding assistants. Read this before making substantial changes and update it after meaningful work.

## Project Overview

Space Goobers is a silly low-poly 3D space adventure about delivering one very late, cold pizza across a galaxy. It supports solo and multiplayer play, multiple planets, enemies and bosses, character customization, equipment, activities, spaceship travel, world saves, and an Electron desktop build.

The repository is `Outsourcedevv/Reel-Degenerates-`, but the current game/product name is **Space Goobers**.

## User Requirements / Working Rules

- Preserve the existing goofy, comedic Space Goobers identity unless the user explicitly asks for a redesign.
- The game should remain playable solo and supports multiplayer.
- Do not casually remove existing mechanics, content, saves, customization, desktop support, or multiplayer behavior while fixing unrelated code.
- Inspect relevant existing code before changing behavior; this is an established project rather than a blank-slate rewrite.
- Keep this file updated when requirements, architecture, current tasks, major bugs, or important decisions change.
- Do not put passwords, API keys, tokens, credentials, or other secrets in this file.
- When handing work between AIs, the current repository code is the source of truth if this document becomes stale.
- Current ChatGPT work should stay on the game's non-gambling systems. `js/casino.js` and gambling-specific Luckstar mechanics are outside the current ChatGPT work scope and should be left alone unless handled elsewhere.

## Tech Stack

- HTML/CSS/vanilla JavaScript
- Three.js for 3D rendering
- PeerJS for multiplayer/networking
- Three.js post-processing including EffectComposer and UnrealBloomPass
- Electron desktop wrapper
- electron-builder for Windows/macOS/Linux packaging
- GitHub Actions for desktop/release workflow
- Browser version can run from `index.html`

No React/framework build step is used for the main game; scripts are loaded directly from `index.html`.

## Important Project Structure

- `index.html` — main page, HUD/menu markup, vendor and game script load order.
- `css/style.css` — primary game/menu/HUD styling.
- `js/main.js` — major game startup/runtime coordination.
- `js/world.js` — world/environment systems.
- `js/player.js` — player systems.
- `js/models.js` — 3D model creation/definitions.
- `js/goober.js` — Space Goober character behavior/appearance.
- `js/ui.js` — UI behavior.
- `js/custom.js` — astronaut customization.
- `js/net.js` — multiplayer/networking.
- `js/audio.js` — sound/audio systems.
- `js/items.js` — item systems.
- `js/shop.js` — shops/economy-facing UI and item purchasing systems.
- `js/critters.js` — regular enemies/creatures.
- `js/boss.js` / `js/miniboss.js` — boss combat systems.
- `js/hazards.js` — environmental/combat hazards.
- `js/flight.js` — spaceship/flight systems.
- `js/activities.js` / `js/fun.js` — planet activities/minigames.
- `js/data.js` — significant game data/configuration.
- `js/update.js` — game update behavior.
- `js/casino.js` — Luckstar gambling-specific systems; leave outside current ChatGPT work.
- `desktop/main.js` — Electron main process.
- `desktop/preload.js` — Electron preload bridge.
- `desktop/updater.js` — desktop updater.
- `desktop/pack-game.js` — desktop packaging helper.
- `.github/workflows/desktop.yml` — desktop build/release automation.
- `README.md` — extensive gameplay and project documentation.
- `package.json` — Electron/electron-builder configuration.

## Current Game State

The repository already contains a substantial playable game rather than a prototype.

Known documented systems include:

- Solo worlds and multiplayer room-code games.
- Multiple save worlds with Easy, Hard, and Hardcore difficulties.
- First- and third-person play.
- Character customization, emotes, cosmetics, suits, faces, hair, backpacks, etc.
- Guns/tools including Grabby Vac, Laser Drill, and Pizza Peel.
- Multiple planets with distinct activities, enemies, bosses, and progression.
- Boss fights with telegraphed attacks.
- Down/revive and respawn systems.
- Spaceship travel and crew seating.
- Shops, inventory/backpack, equipment and item drops.
- Planet activities/minigames.
- Browser and Electron desktop versions.
- Desktop update system and packaged Windows/macOS/Linux builds.

`package.json` currently reports version **1.12.0**. Note that visible version text elsewhere in the project may need checking for synchronization before a release.

## Current Task

### Aiming down the sights, hip-fire spread, grenades on Q (2026-09-29)

- Keys: new `aim` action (hold, default right-click), `nade` is now `Q`, `dash` moved to `F`. `Keys` saves `_v: KEY_V`; a saved set of keys from before (no `_v`) that still has an old default from `KEY_OLD` gets the new one, custom keys stay.
- `LocalPlayer.aimK` (0 hip .. 1 aimed, eased in `updateCamera`) replaces the Longshot-only `scopeK`. Any gun where `canAimGun(z)` (all but the Wisp Caller, type `homing`) aims while `aim` is held (not reloading, swapping, reviving, emoting, in menus, or before a duel's FIGHT). Aimed: FOV to `z.zoom || AIM.zoom`, mouse speed `aimSens()`, walk speed `AIM.speed`, no sprint, less bob/sway/recoil, and the held gun moves to `sightPos(g)`: centered on its muzzle line with the top of its bounding box (hands excluded) `AIM.drop` under the crosshair, applied after `GunReload.pose`. The Longshot still shows `#scope` (`body.scoped`) and hides the viewmodel.
- Hip-fire spread: `HIP_SPREAD[type]` (x1.5 running or in the air, x(1 - aimK)); `wobble(dir)` knocks each shot's direction inside that circle (bolts, lobs, rockets, jackpot, squirt, cutter, beam ticks, chain, sniper). The Scattergun's cone is `z.spread * lerp(HIP_CONE)` and is sent as `w` on its `shoot` message. The crosshair is now four `<i>` ticks whose `--gap` (`drawSpread`) shows the current spread in pixels.
- Shop descriptions now go through `keyText`, so `{dash}`/`{nade}`/`{aim}` show the real key.

### Spooky Vacuum and difficulty-scaled healing (2026-09-28)

- The Spooky Vacuum is now tier 2 of `VAC` (12m reach, 2.4x suction), sold only by the Spookulon shop for $6,500. Buying it raises `SAVE.vacLvl`, puts `vac` on the loadout, refreshes the held model and thumbnail, and sends `vl` in multiplayer state so remote players see the correct vacuum.
- Its model is a purple ectoplasm trap with a green containment jar, captured ghost, rune lights and tooth-lined intake. `buildVacVM(2)` and `buildSpookyVacVM()` share the existing muzzle/nozzle/glow attachment contract and static batching.
- Regeneration is now 10/6/3 HP/s on Easy/Hard/Hardcore and half those rates in boss fights, after the existing damage delay. The previous request for healing changes remains included.
- `tests/healing-and-spooky.js` checks rates, delays, caps, dead/ghost/in-flight exclusions, model geometry/attachments, Spookolon shop purchase/equip and thumbnail rendering.

### Gameplay fixes, walk-in ship and handheld tools (2026-09-28)

- Based on `d2cc93e`, preserving the latest carried-critters, boss exit and defeat changes. Critter chase leashes now require returning halfway home before reacquiring; alert effects have a per-critter five-second cooldown, also covering client snapshots.
- Escape closes panels in a capture-phase key handler and consumes the press before pause handling. Pointer lock is requested in that event, pending locks hide pause, and temporary failures retry on click; free-cursor fallback supports edge turning instead of a limited turning arc.
- Parked `buildShip(true)` has an open hatch, a traversable ramp, cabin floor/ceiling and pilot/passenger seating interactions inside. Flight still uses the existing seated cockpit. `board` messages optionally include `want`; standing up places the player in the cabin to walk out. Walking freely during flight is not implemented.
- Count Carbula, Stormy and Chad use a tall moving formation every fourth attack: coffins, lightning conductors or server racks. A mint aisle marks the safe lateral position; jumping cannot clear the 18-unit formation. Host-generated `procession` events use existing boss attack networking, local swept hit checks, batching and hazard cleanup. Early bosses and gambling systems are unchanged.
- Spookulon's maze has a local timer-controlled gate and start button. Ending a run closes the gate and returns the player outside; entering without a run also returns them to the start. The chest lid is double-sided.
- Grabby/Turbo Vac, Laser Drill and Pizza Peel retain their attachment/animation contracts and use richer procedural models. Static details are batched; intake, bit and peel board remain independent. User selected handheld tools first, not every prop/character.
- `tests/gameplay-regressions.js` exposes `runGameplayRegressions()` for a fresh test world. Headless Edge verifies alerts, actual ramp movement both directions, seating, maze lifecycle, tool attachments, boss gap/height/rotation/cleanup, shop Escape and fallback turning. Live multiplayer and packaged Electron have not been tested.

### Planet scenery and satellite visibility (2026-09-28)

- Based on latest v1.12 work through `2583d94`. `buildRock` and lava rock cores now use closed, weathered geometry with three shared material tones; batching retains the shading. Rock random consumption and collision radii are unchanged.
- Scrap satellite dishes used a front-sided open hemisphere, making the reflector disappear when looking into it. Its dedicated material now renders both sides; added rim, receiver and pedestal detail. Global culling remains enabled.
- `tests/planet-props.html` checks reflector rays from both sides, finite geometry, collision sizes and seeded placement compatibility. Headless Edge also reproduced the original missing interior and booted/rendered all eight planets without page errors. Browser QA only; no packaged desktop build or multiplayer session run for this change.

### v1.12: hotbar, keybinds, ragdolls, boss deaths, water, Esc (2026-09-27)

- **Hotbar** (`js/loadout.js`): 5 slots (`SAVE.slots`, save format v4; old saves get one built by `Loadout.fromOld`). Items are `'gun:<lvl>'`, `'vac'`, `'drill'`, `'peel'`. A slot key takes out that slot only (`LocalPlayer.selectSlot`); each gun's held model is built once and cached (`gunVM`), each keeps its own ammo (`setGun`). Shops have a Loadout tab (`Shop.loadoutHtml`). Lost gear keeps its slot; graves store `slots` and `Loadout.restore` puts it back.
- **Keybinds** (`js/controls.js`): every action is in `KEY_ACTIONS`; game code asks `Input.down('jump')` / `Input.hit('reload')`, never raw key codes (except Esc and Enter). UI text can say `{jump}` or `({tool:vac})` and `keyText`/`keyKbd` fill in the real keys.
- **Critter ragdolls** (`Critters.makeBody` etc. in `js/critters.js`): kills tumble and lie there until the killer presses use or vacuums them; saved in `SAVE.bodies`. The host sends the fling with `cdie`; `cpick` removes a friend's. Mini bosses reuse it and pop.
- **Boss deaths** (`BossFight.deathAnim`/`pop`, `BOSS_DIE`), fewer boss lines (`BOSS_TALK`, `BossFight.say`).
- **Water** (`Liquid` in `js/world.js`): shader ripples + shore foam from a per-planet depth texture; ponds are at most `LAKE_D` deep and `blocked()` no longer walls off water; the player wades (`LocalPlayer.wade`) and gets washed back past `WADE.deep`.
- Critter numbers/spawn rate per difficulty (`DIFFS.crits`/`spawn`), planets further apart (`SYSTEM_SPREAD`), Nimbus-9 outer islands spread (`NIMBUS_SPREAD`).
- **Goober ragdolls** (`GoobRagdoll` in `js/goober.js`): down or knocked out, `GooberAnim` goes limp: a rigid torso (a few spheres, impulse contacts against `world.ground`) plus verlet two-link arms/legs with joint limits, blended back out on getting up. Your own ragdoll drives `LocalPlayer.pos` (so the net position is the body) and the camera orbits it (`updateCamera`); a friend's is simulated locally but pinned to their net position. Friendly fire is 75% (`FF_DMG`); a revive takes `REVIVE_TIME` (5s) of holding use, during which you can't fire, reload or throw, and it hauls the ragdoll up (`GoobRagdoll.hoist`, driven by the lift progress: `RemotePlayer.lift` for the reviver, `rvp` messages with the reviver's x/z for the one being lifted, and the `lf`/`rv` net-state fields for everyone else).
- **Reload animations** (`GunReload` in `js/reloads.js`): keyframed per gun type (the gun's tilt, the left hand: the support hand, or `hands.free` added by `addHands` on one-handed guns, and the gun's moving parts that `GunDesigns.build` splits out into `userData.parts` from its `moving` table). `LocalPlayer.update` calls `GunReload.pose` every frame; at rest it shows fill levels (Squirt water, Zapper cells, Launcher parcel). `gunVM` adds a new gun to `vmGuns` before `prepVM` so `layoutVM` places it.
- **Headshots + hitmarkers**: heads are `model.head` for critters/mini bosses (from where `eyes()` puts them in `buildCritterParts`, else top front; `critterHead`), the top hit sphere of a boss (`BossFight.headSphere`), a friend's helmet (`RemotePlayer.headPos`). Hit tests return `head` (via `U.bodyOrHead`: into the head without much body first); `Shots.land` applies `HEADSHOT` and passes it on; `hitFeedback` draws the red number/sound and `UI.hitmark` flashes the `#hitmark` ticks. `LocalPlayer.aimPoint` now traces the crosshair every shot so bolts land exactly where you aim (into the head if the crosshair's on it).
- **Critters in the hotbar**: a slot can hold `'crit:<backpack entry>'` (e.g. `'crit:rat:large*3.25'`; `Loadout.crit/holdCrit/dropCrit/stowCrit/critters`). `Critters.pickBody` puts a body there when the backpack is full; the backpack panel (`UI.openBag`) moves them both ways; `Activities.sellSlot`/`sellAll`/`heldValue` sell them; `Drops.graveDrop` drops them into the grave (they don't go back in the hotbar on pickup). Held: `LocalPlayer.holdCrit` builds it on a support hand (`vmCrit`); tool `'crit'` is `TOOLS[4]`, the net state's `cr` says which critter, and `carryCritter` puts it on the goober's `spine` in front of his belly (`buildCarriedCritter`, `critOf`) while `GooberAnim.toolPose` holds both forearms under it (hidden while emoting or down). Carried critters grow by `s^CARRY_K` (a TITANIC one about 3.5x, not 10x, so it fits on screen); from `CARRY_BIG` up the goober holds it over his head (`st.carry`) and a friend's name tag moves above it.
- **Kill pop-up** (`UI.killed`, `#killmsg`): `Critters.loot` shows "Killed <name> $<worth>" and one line per multiplier (size, golden 8x, each style, the 5x cap). The style table and prices are unchanged. Your bodies carry a price tag sprite (`Critters.priceTag`/`placeTag`, `b.tag` in the world's `dyn` group) that follows them in `updateBodies`, hides while vacuumed or far off, comes back with `restoreBodies`, and goes in `dropBody`.
- **Boss win, no menu**: `BossFight.finish(true)` shows `UI.bigTitle('VICTORY!')`, gets a downed player up, and after `BOSS_EXIT.delay` opens a beam of light at the arena's center (`openExit`/`updateExit`); walking into it or waiting `BOSS_EXIT.wait` s calls `beamUp` (flash, then `Game.endBoss`, which shows the ending after Zorblax). Each player leaves on their own. A defeat has no menu either: `UI.blackout` fades to black (`#blackout`), calls `Game.endBoss(false)` and `LocalPlayer.wake` while it's black (the camera gets up off the ground over `WAKE_TIME`), then blinks the eyelids open and toasts the hospital bill and the rematch item. Hardcore (`Game.permaDead`) skips it.
- **Critter sizes**: `SIZES` now has 12 entries; the six new ones (Large 3x ... TITANIC 10x) are appended at the end because saves store the size index. Weights were rebalanced (about 8.4% bigger than normal). Use `z.v` (worth) rather than the index to ask "how big". Scale, health and damage all equal `v` (set in a loop after the table), so the biggest ones now outsize mini bosses (`MINIBOSSES[].s` is 3.5 to 4.2); spawning asks for room in proportion, and `nearBody` measures reach from the body's hull (`edgeDist`) for the big ones.
- **Ship coasting** (`Flight.coast`, `Flight.driving()`): when the pilot moves to the back seat, their game keeps simulating the ship with no input (`atmo` damps gently and holds height; `spaceFly` keeps speed) and keeps relaying `fly` syncs until someone takes the pilot seat.
- **Esc / mouse lock**: closing a panel calls `Game.lock()`; while the request is pending (`wantLock`, 1s timeout) the pause menu stays hidden. If the browser refuses (Esc isn't a user gesture, so it often does), `lockFailed` puts you in soft mode (`body.softlock`): playing, keys work, but `Input.loose()` makes mouse movement and the grabbing click do nothing until a click grabs the mouse (a loose cursor pinned to the screen edge used to spin you). `#clicklook` says so. True free-mouse look (`fallback`) is only for browsers that never grab.
- **Mini boss prizes** (`PERKS` in data.js, `MiniBoss.lootItems/dropLoot/updateLoot/give`): on `mbdie` each player on the planet (not dead) gets their own local loot when the body pops (`body.onPop`, set in `MiniBoss.onDie`; `Critters.popBody` calls it): trophy `RES.mbt_<planet>` (sellable), 3 grenades, and the planet's perk if not owned (`SAVE.perks`, `hasPerk`). Perk effects: jump (`goo`), `Activities.pays` (`dice`), reload (`mitts`), regen +30% (`bone`), `Shots.land/blast` (`storm`), speed (`wheels`), `hurtPlanet`/`BossFight.hurt`/`Duel.onHit` (`collar`). Listed on the shop's Loadout tab (`Shop.perksHtml`). `MB_AFTER` 15, `MB_CHANCE` 0.04.
- **Phantom Longshot** (`ZAPPERS[9]`, type `sniper`, appended so old saves keep their gun numbers): hitscan in `LocalPlayer.snipe` (like the Cryo Beam's trace), `Shots.tracer` for the streak (friends get `shoot` with `e`), scope when aimed (see the 2026-09-29 aiming entry: FOV to its `zoom`, `#scope` overlay). Model `sniper()` in gun-designs.js; reload reuses the Storm Caller's (`GUN_RELOADS.sniper`).
- **Duels** (`js/duel.js`, `DUEL`/`Duel`): the Duel Pit on Luckstar (`PlanetWorld.buildDuelPit`, at `DUEL.spot`). Targeted `duel` messages (ask/yes/no/ready/win/quit); `G.mode = 'duel'` uses the planet's `Game.arena()`; remotes in a duel are only visible to the one they're fighting (net state `du`). Shots hit the opponent at full damage (`Shots.test`, `bonkFriend` send `bonk` with `du`, handled by `Duel.onHit`). The loser pays locally in `Duel.lose` and sends `win`; the winner is paid in `Duel.won` (a loss then a win = draw). No graves, lives or respawns involved; `finish` puts you back by the pit and `refreshGear` restores the hotbar.
- **Third person was removed** (V and the Camera setting); only the emote camera swing and the downed camera remain. Esc closes menus and resumes from pause; if the browser refuses the pointer lock, `Game.lockFailed` resumes without it until the next click.

### Gun model redesign integration (2026-09-27)

- All ten guns, including the free Squirt Pistol, use the user's approved low-poly designs through `js/gun-designs.js`. `buildZapperVM` remains the shared entry point for local/remote held weapons and thumbnails.
- Models are procedural and synchronous for offline/file:// and Electron compatibility. The exported concept GLBs are not runtime dependencies. No damage, prices, progression, saves, networking protocol, or casino mechanics changed.
- Design space (+X forward) is converted to the game's -Z axis and existing grip anchor. Support-hand offsets come from each model's `userData.handSpec`. Static geometry is merged by shared material; the cutter wheel stays independently animated.
- Open `tests/gun-models.html` for attachment, scale, geometry, batching, per-instance wheel, and shared flash texture disposal checks.
- Headless Edge checks passed: game boot, all ten weapons firing/ammo/reload, thumbnail rendering, local third-person (since removed in v1.12) and remote model construction; desktop bundle includes the new builder. A live multiplayer session and packaged Electron launch have not been tested.
- No release/version bump is included. Existing flying pizza-cutter projectile geometry is unchanged.

Set up a reliable **Claude ↔ GPT/Codex handoff system** so development can continue with either AI without losing important project context.

This `AI_CONTEXT.md` file is the first shared handoff document.

No gameplay feature is currently being changed as part of this task.

## Important Decisions

### Shared AI context file

`AI_CONTEXT.md` lives at the repository root and acts as the shared development memory between coding assistants.

It should preserve information that is not obvious from reading the code, especially:

- user requirements
- current task
- intentional design decisions
- unresolved bugs
- failed approaches worth remembering
- important files currently being edited
- next steps

It should NOT become a transcript or duplicate the whole README/codebase.

### Code remains source of truth

An AI taking over should read this file first, then inspect the relevant current source files before editing. If this file disagrees with the code, investigate and update this document rather than blindly reverting code.

## Problems / Bugs

No specific non-gambling gameplay bug has been established in this handoff yet.

Potential maintenance item noticed during initial context creation:

- `package.json` reports version 1.11.0 while the title-menu footer in `index.html` contains `v1.10.0`. Confirm whether this is intentionally updated dynamically before changing it.

Do not treat this as confirmed user-reported breakage until the relevant update/version code has been inspected.

## Recent Changes

- GitHub repository connected to ChatGPT.
- Initial repository structure and README inspected.
- Shared `AI_CONTEXT.md` handoff system added.

## Next Steps

1. On the next coding request, read this file first.
2. Inspect the source files relevant to that request.
3. Make only the requested changes and preserve unrelated systems.
4. Test/reason about interactions with multiplayer, saves, desktop/browser modes where relevant.
5. Update this file with meaningful new requirements, decisions, bugs, completed work, and next steps.
6. Commit/push changes through the normal Git workflow.

## Instructions for Claude / GPT / Codex

Before substantial work:

1. Read `AI_CONTEXT.md`.
2. Inspect relevant current files; never rely on this summary alone.
3. Check recent changes/commits when another AI has worked on the project since your last session.
4. Preserve intentional existing behavior unless the user asks to change it.

After substantial work, update this file if any of these changed:

- current task
- user requirements
- architecture
- important design decisions
- known bugs
- failed approaches
- relevant files/components
- next steps

Keep updates concise and useful to the next AI.

## Last Updated

- Date: 2026-09-29
- AI: Claude (aiming down the sights, hip-fire spread, grenades on Q)
- Reason: Initial Claude ↔ GPT/Codex handoff setup from the current GitHub repository.
