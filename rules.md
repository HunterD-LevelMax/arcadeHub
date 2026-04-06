# ARCADE VAULT — Game Development Rules

This document describes how to create new games for the Arcade Vault project. Follow these rules to maintain consistency across all games.

---

## Project Structure

```
arcadeHub/
├── index.html          # Main page with game cards
├── games/             # Game HTML files
│   ├── flappy.html
│   ├── asteroids.html
│   ├── doodle.html
│   └── snake.html
├── style/             # CSS files
│   ├── main.css       # Main page styles
│   ├── game.css      # Common game styles (REQUIRED)
│   ├── flappy.css    # Game-specific styles
│   ├── asteroids.css
│   ├── doodle.css
│   └── snake.css
└── js/
    └── game.js       # Common utilities (REQUIRED)
```

---

## 1. Creating Game HTML File

### Location and Naming
- Create file in `games/` directory
- Name format: `snake.html`, `tetris.html`, etc.
- Use lowercase with underscores if needed

### Required HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>GAME NAME — ARCADE VAULT</title>
  <link rel="stylesheet" href="../style/game.css">
  <link rel="stylesheet" href="../style/game-name.css">
</head>
<body>

  <div class="page">
    <div class="header">
      <a href="../index.html" class="back-btn">← BACK</a>
      <div class="game-title">GAME NAME</div>
      <div class="score-display">SCORE: <span id="scoreVal">0</span></div>
    </div>

    <div class="game-container">
      <canvas id="c"></canvas>

      <div class="overlay" id="startOverlay">
        <div class="overlay-title" style="color: var(--neon-ACCENT); text-shadow: 0 0 30px var(--neon-ACCENT);">GAME NAME</div>
        <div class="overlay-sub">GAME GENRE OR DESCRIPTION</div>
        <button class="start-btn" id="startBtn">PLAY</button>
      </div>

      <div class="overlay hidden" id="gameoverOverlay">
        <div class="overlay-title" style="color: #ff3344;">GAME OVER</div>
        <div class="overlay-sub">DEATH MESSAGE</div>
        <div class="overlay-score" id="finalScore">0</div>
        <div class="overlay-best" id="bestScore">BEST: 0</div>
        <button class="start-btn" id="restartBtn">RETRY</button>
      </div>
    </div>

    <div class="footer">CONTROLS HINT</div>
  </div>

<script src="../js/game.js"></script>
<script>
  // Game code here
</script>

</body>
</html>
```

### Required IDs for UI Elements
- `scoreVal` — Current score display
- `finalScore` — Score shown on game over
- `bestScore` — Best score shown on game over
- `startOverlay` — Start screen overlay
- `gameoverOverlay` — Game over screen overlay
- `startBtn` — Play button
- `restartBtn` — Retry button

---

## 2. Creating Game CSS File

### Location and Naming
- Create file in `style/` directory
- Name format: `game-name.css` (e.g., `snake.css`, `tetris.css`)

### Required CSS Structure

```css
:root {
  --game-accent: #HEXCOLOR;
}

.back-btn { color: var(--game-accent); border-color: var(--game-accent); }
.back-btn:hover { box-shadow: 0 0 12px var(--game-accent); }
.game-title { color: var(--game-accent); text-shadow: 0 0 20px var(--game-accent); }
.score-display { color: var(--game-accent); }

canvas {
  border-color: rgba(R, G, B, 0.3);
  box-shadow: 0 0 40px rgba(R, G, B, 0.15);
  image-rendering: pixelated;
}

.overlay {
  border: 1px solid rgba(R, G, B, 0.2);
  box-shadow: 0 0 40px rgba(R, G, B, 0.1);
}

.overlay-title {
  color: var(--game-accent);
  text-shadow: 0 0 30px var(--game-accent);
}

.overlay-score {
  color: var(--game-accent);
  text-shadow: 0 0 30px var(--game-accent);
}

.start-btn {
  border-color: var(--game-accent);
  color: var(--game-accent);
}

.start-btn:hover {
  box-shadow: 0 0 30px var(--game-accent);
}
```

### Available Accent Colors
```css
--neon-cyan: #00f5ff;
--neon-magenta: #ff00ff;
--neon-yellow: #ffff00;
--neon-green: #39ff14;
```

---

## 3. JavaScript Game Code

### Required Setup

```javascript
const BASE_W = 400, BASE_H = 600;
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

initGameCommon(canvas, BASE_W, BASE_H);

function W() { return canvas.width; }
function H() { return canvas.height; }
```

### High Score System (REQUIRED)

```javascript
// Reading high score
let best = getHighScore('game_id');

// Saving new high score
if (score > best) {
  best = score;
  setHighScore('game_id', best);
}
```

### UI Object

```javascript
const ui = {
  score: document.getElementById('scoreVal'),
  finalScore: document.getElementById('finalScore'),
  bestScore: document.getElementById('bestScore'),
  startOverlay: document.getElementById('startOverlay'),
  gameoverOverlay: document.getElementById('gameoverOverlay'),
};
```

### Game State

```javascript
let gameState = {
  score: 0,
  best: getHighScore('game_id'),
  state: 'title',
};
```

### Init Function

```javascript
function init() {
  gameState.score = 0;
  gameState.state = 'title';
  ui.score.textContent = '0';
  ui.bestScore.textContent = `BEST: ${gameState.best}`;
}
```

### Button Handlers

```javascript
document.getElementById('startBtn').addEventListener('click', () => {
  gameState.state = 'playing';
  ui.startOverlay.classList.add('hidden');
});

document.getElementById('restartBtn').addEventListener('click', () => {
  init();
  gameState.state = 'playing';
  ui.gameoverOverlay.classList.add('hidden');
});
```

### Touch Controls Example

```javascript
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const x = e.touches[0].clientX - canvas.getBoundingClientRect().left;
  if (x < canvas.width / 3) {
    // Left zone
  } else if (x > canvas.width * 2 / 3) {
    // Right zone
  } else {
    // Center zone
  }
});
```

---

## 4. Adding Game to Main Page

### Game Card Template

```html
<a class="game-card" href="games/game-name.html" style="--card-accent: #HEXCOLOR; --preview-bg: #BGHEX;">
  <div class="card-accent-bar"></div>
  <div class="card-glow"></div>
  <div class="card-preview">
    <div class="preview-corner tl"></div>
    <div class="preview-corner tr"></div>
    <div class="preview-corner bl"></div>
    <div class="preview-corner br"></div>
    <div class="preview-badge">GENRE</div>
    <canvas id="gameNameCanvas"></canvas>
    <div class="preview-icon">EMOJI</div>
  </div>
  <div class="card-body">
    <div class="card-number">GAME_## / ##</div>
    <div class="card-title">GAME NAME</div>
    <div class="card-desc">DESCRIPTION</div>
    <div class="card-footer">
      <div class="card-tags">
        <span class="tag">TAG1</span>
        <span class="tag">TAG2</span>
      </div>
      <div class="play-btn">
        PLAY
        <div class="play-btn-arrow">▶</div>
      </div>
    </div>
  </div>
</a>
```

### Animated Preview

```javascript
(function() {
  const canvas = document.getElementById('gameNameCanvas');
  const card = canvas.closest('.card-preview');
  canvas.width = card.offsetWidth || 320;
  canvas.height = card.offsetHeight || 180;
  const ctx = canvas.getContext('2d');
  
  let t = 0;
  
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t++;
    // Draw animation
    requestAnimationFrame(tick);
  }
  tick();
})();
```

---

## 5. Code Style Rules

- Use `const` for constants, `let` for variables
- Use camelCase for names
- All text in English, `lang="en"`
- Use `requestAnimationFrame` for game loop
- Clear canvas each frame: `ctx.fillStyle = '#050510'; ctx.fillRect(0, 0, W(), H());`
- Use neon glow effects:
  ```javascript
  ctx.shadowColor = '#39ff14';
  ctx.shadowBlur = 10;
  ```

---

## 6. Checklist

- [ ] HTML file in `games/`
- [ ] CSS file in `style/`
- [ ] `lang="en"` in HTML
- [ ] `game.js` connected
- [ ] High score system implemented
- [ ] Touch controls (if needed)
- [ ] Card added to `index.html`
- [ ] Game numbers updated
- [ ] Animated preview added

---

## 7. Color Palette

| Color | Hex | Game |
|-------|-----|------|
| Dark BG | #050510 | All |
| Neon Cyan | #00f5ff | Asteroids |
| Neon Magenta | #ff00ff | Flappy Bird |
| Neon Green | #39ff14 | Snake, Doodle Jump |
| Neon Yellow | #ffff00 | Best Score |
| Neon Red | #ff3344 | Game Over |
