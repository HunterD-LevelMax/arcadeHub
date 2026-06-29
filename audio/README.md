# Arcade Hub — Audio

Shared UI sounds in `audio/sfx/ui/` are sourced from **Kenney "Interface Sounds"** (v1.0).

- **Author:** Kenney ([https://kenney.nl](https://kenney.nl))
- **License:** [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) — public domain, free for personal and commercial use without attribution (crediting Kenney is appreciated but not required).
- **Downloaded:** 2026-06-23 from [https://opengameart.org/content/interface-sounds](https://opengameart.org/content/interface-sounds)

See [LICENSE-kenney-interface.txt](LICENSE-kenney-interface.txt) for the original license file from the pack.

Background music tracks (`music_*.mp3`) are user-provided hub BGM, not part of the Kenney pack.

## Layout

```
audio/sfx/ui/     Shared UI feedback (tap, confirm, error, coin, …)
audio/bgm/        Hub background music (music_1–7.mp3)

games/{gameId}/
  index.html
  audio/          Game-specific sounds (shoot.ogg, eat.ogg, …)
```

Game sounds live next to each game. Shared UI sounds stay in `audio/sfx/ui/`. Resolution is handled in [`js/audio.js`](../js/audio.js) via `new URL()` relative to the current page.

**Do not duplicate game SFX under `audio/sfx/{gameId}/`.** Only `audio/sfx/ui/` and `games/{gameId}/audio/` are used at runtime.

## Background music

```
audio/bgm/
  music_1.mp3
  music_2.mp3
  music_3.mp3
  music_4.mp3
  music_5.mp3
  music_6.mp3
  music_7.mp3
```

- Plays in the **hub shell** (parent page), not inside game iframes
- Random track on first play and when each track ends (no repeat back-to-back)
- **Ducks** (lowers volume) while a game iframe is open; restores on return to hub
- Pauses when the tab/app is hidden (`visibilitychange` / `pagehide`)
- Controlled via `ArcadeAudio.playBgm()`, `stopBgm()`, `duckBgm()` / `unduckBgm()`, `suspend()` / `resume()`
- Mute toggle persists in `localStorage` key `arcadeHub_muted`

## Volume

| Context | Behavior |
|---------|----------|
| Hub UI SFX | Full user volume |
| In-game SFX | 80% of user volume (`SFX_GAME_MASTER` in `audio.js`) |
| BGM | Separate gain; ducked during gameplay |

## Adding sounds

### Game-specific

1. Add the `.ogg` file under `games/{gameId}/audio/` (use snake_case filenames, e.g. `player_hit.ogg`).
2. Call `playSfx('{gameId}.eventName')` from game code — camelCase in the id maps to snake_case on disk (`playerHit` → `player_hit.ogg`).
3. Optionally preload in the game page: `preloadSfx(['gameId.event1', 'gameId.event2'])`.

### Shared UI

1. Add the `.ogg` file under `audio/sfx/ui/`.
2. Call `playSfx('ui.tap')` or use `haptic*` helpers from [`js/haptics.js`](../js/haptics.js).

### Aliases

Some game events reuse UI sounds (e.g. `asteroids.levelUp` → `ui.success`). Register these in `ALIASES` inside `js/audio.js`.

### New BGM track

1. Add `music_N.mp3` under `audio/bgm/`.
2. Append the filename to the `BGM_TRACKS` array in `js/audio.js`.
3. Re-run `node scripts/build-precache.js` if deploying to GitHub Pages (BGM is loaded on demand, not precached by default).
