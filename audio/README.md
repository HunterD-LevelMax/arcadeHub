# Arcade Hub — Sound Effects

All SFX in this folder are sourced from **Kenney "Interface Sounds"** (v1.0).

- **Author:** Kenney (https://kenney.nl)
- **License:** [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) — public domain, free for personal and commercial use without attribution (crediting Kenney is appreciated but not required).
- **Downloaded:** 2026-06-23 from https://opengameart.org/content/interface-sounds

See [`LICENSE-kenney-interface.txt`](LICENSE-kenney-interface.txt) for the original license file from the pack.

## Layout

```
audio/sfx/
  ui/           Shared UI feedback (tap, confirm, error, …)
  snake/        Game-specific sounds
  flappy/
  …
```

Files are renamed short `.ogg` clips mapped in [`js/audio.js`](../js/audio.js).

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

1. Add the `.ogg` file under `audio/sfx/<game>/`.
2. Register the id in `SOUND_MAP` inside `js/audio.js`.
3. Call `ArcadeAudio.play('game.event')` from game code or rely on `haptic*` bridge for UI sounds.
