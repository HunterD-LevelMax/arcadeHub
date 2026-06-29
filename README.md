# Arcade Hub

A retro neon arcade — a collection of classic browser games with a shared high-score system, in-game economy, and a unified arcade UI.

Runs as an **installable PWA** or inside an **Android WebView**. The hub uses an app shell — games open in an iframe without full page reload.

## Project structure

```
arcadeHub/
├── index.html              # Main page with game cards
├── games/{gameId}/
│   ├── index.html          # Game page
│   └── audio/              # Game-specific SFX
├── audio/sfx/ui/           # Shared UI sounds
├── audio/bgm/              # Hub background music
├── style/                  # CSS (main.css, game.css, per-game styles)
└── js/
    ├── router.js           # Hub ↔ game navigation
    ├── audio.js            # Shared audio layer
    └── game.js             # Common game utilities (playSfx, arcadeBack, …)
```

## Games

| # | Game | Genre | Description |
|---|------|-------|-------------|
| 01 | **Prism Cascade** | Puzzle / Timed | Drag and swap glowing gems, chain matches into cascading combos, race the clock. |
| 02 | **Crossy Frog** | Classic | Help the frog cross the road and river. Avoid cars, jump on logs and get to safety. |
| 03 | **Space Blocks** | Puzzle / Arcade | Classic block puzzle game. Rotate and place falling tetrominos, clear lines and get the highest score. |
| 04 | **Snake** | Classic / Arcade | Eat food, grow longer, don't hit yourself or the walls. |
| 05 | **Asteroids** | Shooter / Arcade | Destroy asteroids, dodge debris. Survive in open space as long as you can. |
| 06 | **Fly Hard** | Casual / One-tap | One tap and the bird flies. Dodge pipes, collect points, beat your high score. |
| 07 | **Space Hopper** | Platform / Endless | Jump higher on platforms. Moving, breaking, spring-loaded — don't let yourself fall. |
| 08 | **Space Aliens** | Shooter / Classic | Defend Earth from alien waves. Shoot aliens, use bombs, survive as long as possible. |
| 09 | **Neon 2048** | Puzzle / Strategy | Slide tiles, merge matching numbers, and chase the legendary 2048 tile. |
| 10 | **Stack Tower** | One-tap / Skill | Tap to drop blocks, align perfectly, and build the tallest neon tower you can. |
| 11 | **Thrust Runner** | Endless / Skill | Hold to thrust, release to fall. Weave through the tunnel, dodge obstacles, collect crystals. |

## Features

- Unified neon arcade UI with animated canvas previews on the main hub
- Per-game high score tracking
- Shared coin economy and player profile
- Haptic feedback support
- Mobile-friendly touch controls (tap / drag / hold, depending on the game)

## Hub navigation & browser history

Navigation is handled by [`js/router.js`](js/router.js). The hub page stays mounted; the active game loads in `#gameFrame` (`games/{gameId}/index.html`).

There are **two separate history stacks**:

| Stack | What it tracks | Managed by |
|-------|----------------|------------|
| **Parent** (`index.html`) | Hub vs which game is open (`#game/…`) | `pushState` / `replaceState` in `router.js` |
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
3. Use `class="back-btn"` on the BACK control — `initGameBackNavigation()` in `game.js` wires it to `arcadeBack()`.
4. Do not navigate to `../../index.html` directly from the iframe when the hub shell is available.
5. Do not add extra iframe navigations (links, `location.href`) that push history inside the game frame unless you know how to reset the frame afterward.

### Local testing

- Use a local HTTP server (`npx serve .`) for PWA / service worker / manifest.
- `file://` has browser security limits; Android APK uses `file:///android_asset/` in WebView instead.
- Regression check: game A → BACK → game B → **browser Back** → must land on **hub**, not game A.

## Development

New games are added following the conventions in [`rules.md`](rules.md) (shared HTML/CSS structure, required UI element IDs, high score API, and main-page card template).

Sound layout is described in [`audio/README.md`](audio/README.md).

### Deploy checklist (GitHub Pages)

Before pushing to production:

```bash
node scripts/build-icon-sprite.js   # only if icons changed
node scripts/verify-assets.js
node scripts/build-precache.js
```

- All fonts live in [`fonts/`](fonts/) (no CDN).
- UI icons use [`icons/sprite.svg`](icons/sprite.svg) via [`js/arcade-icons.js`](js/arcade-icons.js).
- Service worker precaches only the hub shell; games and BGM load on demand.
