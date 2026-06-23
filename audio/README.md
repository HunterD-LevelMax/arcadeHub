# Arcade Hub — Sound Effects

All SFX in this folder are sourced from **Kenney "Interface Sounds"** (v1.0).

- **Author:** Kenney (https://kenney.nl)
- **License:** [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) — public domain, free for personal and commercial use without attribution (crediting Kenney is appreciated but not required).
- **Downloaded:** 2026-06-23 from https://opengameart.org/content/interface-sounds

See [`LICENSE-kenney-interface.txt`](LICENSE-kenney-interface.txt) for the original license file from the pack.

## Layout

```
audio/sfx/ui/     Shared UI feedback (tap, confirm, error, coin, …)
audio/bgm/        Hub background music

games/{gameId}/
  index.html
  audio/          Game-specific sounds (shoot.ogg, eat.ogg, …)
```

Game sounds live next to each game. Shared UI sounds stay in `audio/sfx/ui/`. Resolution is handled in [`js/audio.js`](../js/audio.js) via `new URL()` relative to the current page.

## Background music

```
audio/bgm/
  music_1.mp3
  music_2.mp3
  music_3.mp3
```

- User-provided background tracks for the hub shell
- Random track on first play and when each track ends (no repeat back-to-back)
- Controlled via `ArcadeAudio.playBgm()`, `stopBgm()`, `duckBgm()` / `unduckBgm()`

## Adding sounds

### Game-specific

1. Add the `.ogg` file under `games/{gameId}/audio/` (use snake_case filenames, e.g. `player_hit.ogg`).
2. Call `playSfx('{gameId}.eventName')` from game code — camelCase in the id maps to snake_case on disk (`playerHit` → `player_hit.ogg`).

### Shared UI

1. Add the `.ogg` file under `audio/sfx/ui/`.
2. Call `playSfx('ui.tap')` or use `haptic*` helpers.

### Aliases

Some game events reuse UI sounds (e.g. `asteroids.levelUp` → `ui.success`). Register these in `ALIASES` inside `js/audio.js`.
