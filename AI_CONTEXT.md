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

`package.json` currently reports version **1.11.0**. Note that visible version text elsewhere in the project may need checking for synchronization before a release.

## Current Task

### Gun model redesign integration (2026-09-27)

- All ten guns, including the free Squirt Pistol, use the user's approved low-poly designs through `js/gun-designs.js`. `buildZapperVM` remains the shared entry point for local/remote held weapons and thumbnails.
- Models are procedural and synchronous for offline/file:// and Electron compatibility. The exported concept GLBs are not runtime dependencies. No damage, prices, progression, saves, networking protocol, or casino mechanics changed.
- Design space (+X forward) is converted to the game's -Z axis and existing grip anchor. Support-hand offsets come from each model's `userData.handSpec`. Static geometry is merged by shared material; the cutter wheel stays independently animated.
- Open `tests/gun-models.html` for attachment, scale, geometry, batching, per-instance wheel, and shared flash texture disposal checks.
- Headless Edge checks passed: game boot, all ten weapons firing/ammo/reload, thumbnail rendering, local third-person and remote model construction; desktop bundle includes the new builder. A live multiplayer session and packaged Electron launch have not been tested.
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

- Date: 2026-09-27
- AI: GPT-5.6 Sol
- Reason: Initial Claude ↔ GPT/Codex handoff setup from the current GitHub repository.
