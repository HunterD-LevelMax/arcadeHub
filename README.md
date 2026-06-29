# Arcade Hub

A retro neon arcade — a collection of classic browser games with a shared high-score system, in-game economy, and a unified arcade UI.

Runs as an **installable PWA** or inside an **Android WebView**. The hub uses an app shell — games open in an iframe without full page reload.

**Repository:** [github.com/HunterD-LevelMax/arcadeHub](https://github.com/HunterD-LevelMax/arcadeHub)

## Project structure

```
arcadeHub/
├── index.html                  # Hub shell (game cards, iframe, economy UI)
├── manifest.webmanifest
├── sw.js                       # Service worker (HTTPS / localhost only)
├── privacy.html
├── games/{gameId}/
│   ├── index.html              # Game page
│   └── audio/                  # Game-specific SFX (.ogg)
├── audio/
│   ├── sfx/ui/                 # Shared UI sounds
│   └── bgm/                    # Hub background music (music_1–7.mp3)
├── fonts/                      # Self-hosted Orbitron + Share Tech Mono
├── icons/                      # SVG sources + sprite.svg
├── style/
│   ├── main.css, game.css      # Hub + shared game styles
│   ├── hub/                    # Card grid, starfield
│   └── {gameId}.css            # Per-game styles
├── js/
│   ├── hub/
│   │   ├── ArcadeRouter.js     # Hub ↔ game navigation (iframe)
│   │   ├── HubPreviewManager.js
│   │   ├── HubPreviewBase.js
│   │   ├── previews.js         # Canvas preview classes per card
│   │   ├── Starfield.js
│   │   ├── HubScrollMemory.js
│   │   └── HubBootstrap.js
│   ├── economy/
│   │   ├── ArcadeModal.js
│   │   └── EconomyUI.js
│   ├── perf.js                 # Device tier + hub preview layout profiles
│   ├── arcade-icons.js         # SVG sprite (inline on file://)
│   ├── audio.js                # BGM + SFX layer
│   ├── game.js                 # Common game utilities (playSfx, arcadeBack, …)
│   ├── economy-api.js          # Coins, unlocks, rewards
│   ├── economy.js              # Hub economy wiring
│   └── haptics.js
└── scripts/
    ├── build-precache.js       # Regenerate sw.js precache list
    ├── build-icon-sprite.js    # Patch inline sprite into arcade-icons.js
    └── verify-assets.js
```

## Games

11 games are shown on the hub. **Crossy Frog** (`frogger`) is implemented but its card is commented out in `index.html`.

| # | Game ID | Title | Genre | Description |
|---|---------|-------|-------|-------------|
| 01 | `prismcascade` | **Prism Cascade** | Puzzle / Timed | Drag and swap glowing gems, chain matches into cascading combos, race the clock. |
| 02 | `neonsiege` | **Neon Siege** | Tower Defense | Build geometric towers, stop neon waves, defend the core. Featured “first goal” game. |
| 03 | `tetris` | **Space Blocks** | Puzzle / Arcade | Rotate and place falling tetrominos, clear lines, chase the highest score. |
| 04 | `snake` | **Snake** | Classic / Arcade | Eat food, grow longer, don't hit yourself or the walls. |
| 05 | `asteroids` | **Asteroids** | Shooter / Arcade | Destroy asteroids, dodge debris. Survive in open space as long as you can. |
| 06 | `flappy` | **Fly Hard** | Casual / One-tap | One tap and the bird flies. Dodge pipes, collect points, beat your high score. |
| 07 | `doodle` | **Space Hopper** | Platform / Endless | Jump higher on platforms. Moving, breaking, spring-loaded — don't let yourself fall. |
| 08 | `spaceinvaders` | **Space Aliens** | Shooter / Classic | Defend Earth from alien waves. Shoot aliens, use bombs, survive as long as possible. |
| 09 | `game2048` | **Neon 2048** | Puzzle / Strategy | Slide tiles, merge matching numbers, and chase the legendary 2048 tile. |
| 10 | `stacktower` | **Stack Tower** | One-tap / Skill | Tap to drop blocks, align perfectly, and build the tallest neon tower you can. |
| 11 | `thrustrunner` | **Thrust Runner** | Endless / Skill | Hold to thrust, release to fall. Weave through the tunnel, dodge obstacles, collect crystals. |
| — | `frogger` | **Crossy Frog** | Classic | *Hidden on hub.* Help the frog cross the road and river. Still playable via `games/frogger/index.html`. |

## Features

- Unified neon arcade UI with **lazy animated canvas previews** on game cards
- **Adaptive preview performance** — layout profiles for phone / tablet / desktop (`js/perf.js`); scroll pause; visibility-based animation on mobile
- Per-game high score tracking (`localStorage`)
- **Coin economy** — earn coins from runs, unlock games by card rarity, featured Neon Siege goal
- Hub **BGM** (7 tracks) with ducking while a game is open
- Haptic feedback support (`js/haptics.js`, optional Android bridge)
- Mobile-friendly touch controls (tap / drag / hold, depending on the game)
- **PWA** on HTTPS — installable, offline hub shell via service worker
- **`file://` friendly** — inline SVG icons, conditional font preload (for Android WebView and local opens)

## Hub previews

Each game card has a small canvas animation driven by [`js/hub/previews.js`](js/hub/previews.js) and [`js/hub/HubPreviewManager.js`](js/hub/HubPreviewManager.js).

| Layout | FPS | Animation threshold |
|--------|-----|---------------------|
| Phone (≤720px, touch) | 12 | Only cards ≥50% visible |
| Tablet (touch, wider) | 15 | Cards ≥25% visible |
| Desktop | 30 | All intersecting cards |

Previews pause while `#hubRoot` is scrolling and resume after a short debounce. The render loop uses `setTimeout` (not a perpetual `requestAnimationFrame`) to avoid idle wakeups.

## Hub navigation & browser history

Navigation is handled by [`js/hub/ArcadeRouter.js`](js/hub/ArcadeRouter.js). The hub page stays mounted; the active game loads in `#gameFrame` (`games/{gameId}/index.html`).

> [`js/router.js`](js/router.js) is a deprecated shim that loads `ArcadeRouter.js` for backward compatibility.

There are **two separate history stacks**:

| Stack | What it tracks | Managed by |
|-------|----------------|------------|
| **Parent** (`index.html`) | Hub vs which game is open (`#game/…`) | `pushState` / `replaceState` in `ArcadeRouter` |
| **Iframe** (`#gameFrame`) | Each `src` assignment to a game URL | Browser, unless iframe is reset |

Browser / Android **Back** walks the **iframe stack first**. If the iframe still holds game A and you open game B via `gameFrame.src = …`, Back shows A instead of the hub. This is independent of parent `history.state` fixes.

### How it works

| Action | What happens |
|--------|----------------|
| Open game from hub | `ArcadeRouter.openGame(id)` → `recreateGameFrame()` + load game URL |
| BACK in game | `arcadeBack()` → `parent.ArcadeRouter.backToHub()` |
| Return to hub | `showHubUi()` → hide shell + **`recreateGameFrame()`** (destroys iframe history) |
| Browser / Android back | Parent `popstate` syncs UI; iframe must have no stale entries |

`history.state` on the parent page:

- `{ arcadeHub: true }` — hub visible, URL without `#game/…`
- `{ arcadeGame: "asteroids" }` — game open, URL `#game/asteroids`

### Rules (do not break these)

**1. Always reset the iframe via `recreateGameFrame()`**

- Call it in **`showHubUi()`** when closing a game.
- Call it in **`showGameUi()`** before assigning `gameFrame.src`.

Do **not** switch games by only setting `gameFrame.src` on an existing iframe — that appends to the iframe history and Back will reopen the previous game.

Do **not** rely on `contentWindow.location.replace()` from the parent on `file://` (cross-origin between hub and `games/…`); recreating the element is the reliable approach everywhere.

**2. `backToHub()` never calls `history.back()`**

It runs `showHubUi()` (including iframe recreate) and then `replaceHubHistory()`.  
Using `history.back()` while the UI already shows the hub can land on a stale parent `#game/…` entry.

**3. Parent history when opening a game**

- From hub (`arcadeHub` state) → `pushState` so browser Back from the game returns to the hub.
- Otherwise → `replaceState` (avoid `[hub, gameA, gameB, …]` on the parent stack).

**4. `popstate` only restores a game when it matches `currentGame`**

If `event.state.arcadeGame` differs from `currentGame` (stale entry after A → hub → B), the router shows the **hub**, not the old game.

### Android WebView

See [`ANDROID.md`](ANDROID.md) for WebView settings, hardware Back, and the haptics bridge.

Do **not** use `webView.goBack()` alone when a game is open — it usually consumes **iframe** history first.

```kotlin
if (ArcadeRouter.getCurrentGame() != null) {
    ArcadeRouter.backToHub()
} else if (webView.canGoBack()) {
    webView.goBack()
} else {
    // finish activity
}
```

(Exact JS bridge names depend on your `addJavascriptInterface` setup.)

### Adding a new game

1. Create `games/{gameId}/index.html` and optional `games/{gameId}/audio/`.
2. Add a hub card with `data-game-id="{gameId}"` in `index.html`.
3. Register a canvas preview in [`js/hub/previews.js`](js/hub/previews.js) (`HubPreviewRegistry`).
4. Use `class="back-btn"` on the BACK control — `initGameBackNavigation()` in `game.js` wires it to `arcadeBack()`.
5. Do not navigate to `../../index.html` directly from the iframe when the hub shell is available.
6. Do not add extra iframe navigations (links, `location.href`) that push history inside the game frame unless you know how to reset the frame afterward.

### Local testing

- **Recommended:** local HTTP server (`npx serve .`) for PWA, service worker, and manifest.
- **`file://`:** works for hub + games in a browser or WebView. Manifest and crossorigin font preload are skipped on `file://`; icons use an inline SVG sprite from [`js/arcade-icons.js`](js/arcade-icons.js).
- **Android APK:** bundle assets under `file:///android_asset/www/` — see [`ANDROID.md`](ANDROID.md).
- **Regression check:** game A → BACK → game B → **browser Back** → must land on **hub**, not game A.

## Development

New games are added following the conventions in [`rules.md`](rules.md) (shared HTML/CSS structure, required UI element IDs, high score API, and main-page card template).

Sound layout is described in [`audio/README.md`](audio/README.md).

### Deploy checklist (GitHub Pages)

Before pushing to production:

```bash
node scripts/build-icon-sprite.js   # only if icons/ changed
node scripts/verify-assets.js
node scripts/build-precache.js      # after hub JS/CSS/asset changes
```

- All fonts live in [`fonts/`](fonts/) (no CDN).
- UI icons use [`icons/sprite.svg`](icons/sprite.svg) via [`js/arcade-icons.js`](js/arcade-icons.js).
- Service worker precaches the hub shell; games and BGM load on demand.
