# ARCADE HUB — Game Development Rules

This document describes how to create new games for Arcade Hub. Follow these rules to maintain consistency across all games.

See also [`README.md`](README.md) for hub navigation and [`audio/README.md`](audio/README.md) for sound layout.

---

## Project Structure

```
arcadeHub/
├── index.html              # Hub shell (game cards, iframe, scripts)
├── games/{gameId}/
│   ├── index.html          # Game page (CANONICAL entry point)
│   └── audio/              # Game-specific SFX (.ogg)
├── style/
│   ├── main.css            # Hub styles
│   ├── game.css            # Common game styles (REQUIRED)
│   └── {gameId}.css        # Game-specific styles
├── audio/
│   ├── sfx/ui/             # Shared UI sounds
│   └── bgm/                # Hub background music (music_1–3.mp3)
└── js/
    ├── router.js           # Hub ↔ game navigation (iframe)
    ├── audio.js            # Shared audio layer
    ├── game.js             # Common utilities (REQUIRED)
    └── economy-api.js      # Coins / unlocks
```

**12 games:** `prismcascade`, `frogger`, `tetris`, `snake`, `asteroids`, `flappy`, `doodle`, `spaceinvaders`, `game2048`, `stacktower`, `thrustrunner`, `neonsiege`

---

## 1. Creating a Game Page

### Location and naming

- Create `games/{gameId}/index.html` (lowercase id, no spaces)
- Add optional `games/{gameId}/audio/` for game SFX
- Do **not** create flat `games/{gameId}.html` — the router loads folder pages only

### Required HTML structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>GAME NAME — ARCADE HUB</title>
  <link rel="stylesheet" href="../../style/game.css">
  <link rel="stylesheet" href="../../style/game-id.css">
</head>
<body>
  <div class="page">
    <div class="header">
      <a href="../../index.html" class="back-btn md-btn md-btn-outlined md-ripple">BACK</a>
      <div class="game-title">GAME NAME</div>
      <!-- score / stats -->
    </div>
    <div class="game-container">
      <canvas id="c"></canvas>
      <div class="overlay" id="startOverlay">…</div>
      <div class="overlay hidden" id="gameoverOverlay">…</div>
    </div>
    <div class="footer">CONTROLS HINT</div>
  </div>

<script src="../../js/audio.js"></script>
<script src="../../js/perf.js"></script>
<script src="../../js/game.js"></script>
<script src="../../js/economy-api.js"></script>
<script>
  // Game code here
</script>
</body>
</html>
```

The BACK link uses `class="back-btn"`. `initGameBackNavigation()` in `game.js` wires it to `arcadeBack()`, which returns to the hub shell when the game runs inside the iframe.

### Required IDs for UI elements

- `scoreVal` — current score
- `finalScore` — score on game over
- `bestScore` — best score on game over
- `startOverlay`, `gameoverOverlay`
- `startBtn`, `restartBtn`

---

## 2. Game CSS

- File: `style/{gameId}.css`
- Set `--game-accent` in `:root`
- Import patterns from an existing game CSS (e.g. `style/snake.css`)

---

## 3. JavaScript game code

### Required setup

```javascript
const BASE_W = 400, BASE_H = 600;
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// Declare all let/const used in resize callbacks BEFORE initGameCommon
initGameCommon(canvas, BASE_W, BASE_H);

function W() { return canvas.width; }
function H() { return canvas.height; }
```

**Important:** `initGameCommon()` calls `onResize` immediately. Any `let`/`const` assigned inside the resize callback must be declared **before** the `initGameCommon()` call (temporal dead zone).

### High score (required)

```javascript
let best = getHighScore('game_id');
if (score > best) {
  best = score;
  setHighScore('game_id', best);
}
```

### Audio

```javascript
preloadSfx(['gameid.event', 'gameid.gameover']);
playSfx('gameid.event');
```

Game SFX files go in `games/{gameId}/audio/`. Do **not** duplicate them under `audio/sfx/{gameId}/`.

---

## 4. Adding a game to the hub

### Game card in `index.html`

```html
<a class="game-card md-card md-ripple" data-game-id="gameid" data-rarity="common" href="#" style="--card-accent: #HEX; --preview-bg: #BG;">
  <!-- card preview with canvas id="{gameid}Canvas" -->
</a>
```

Navigation is handled by [`js/router.js`](js/router.js): `ArcadeRouter.openGame(id)` loads `games/{id}/index.html` in `#gameFrame`.

Do **not** link cards directly to `games/gameid.html`.

### Animated preview

Register canvas previews in [`js/main.js`](js/main.js) or [`js/hub-previews.js`](js/hub-previews.js). Use `HubPreviewManager.register(canvas, card, tick)` for pause/resume when games open.

---

## 5. Code style

- `const` for constants, `let` for variables, camelCase names
- All UI text in English, `lang="en"`
- Use `createGameLoop()` / `createRenderLoop()` from `game.js` where appropriate
- Neon glow: `ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 10;`

---

## 6. Checklist

- [ ] `games/{gameId}/index.html` created
- [ ] `style/{gameId}.css` created
- [ ] `games/{gameId}/audio/` for game SFX (if needed)
- [ ] `audio.js`, `perf.js`, `game.js`, `economy-api.js` included
- [ ] High score via `getHighScore` / `setHighScore`
- [ ] `class="back-btn"` on BACK control
- [ ] Hub card with `data-game-id` in `index.html`
- [ ] Canvas preview registered
- [ ] Run `node scripts/build-precache.js` after adding assets (updates `sw.js`)

---

## 7. Color palette

| Color | Hex | Usage |
|-------|-----|-------|
| Dark BG | `#050510` | All games |
| Neon Cyan | `#00f5ff` | Asteroids, accents |
| Neon Magenta | `#ff00ff` | Flappy, accents |
| Neon Green | `#39ff14` | Snake, Frogger |
| Neon Yellow | `#ffff00` | Best score, highlights |
| Neon Red | `#ff3344` | Game over |
