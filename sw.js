/* Auto-generated precache list — run: node scripts/build-precache.js */
const CACHE_NAME = "arcade-hub-v1";
const PRECACHE_URLS = [
  "./audio/LICENSE-kenney-interface.txt",
  "./audio/README.md",
  "./audio/bgm/hub_loop.ogg",
  "./audio/bgm/music_1.mp3",
  "./audio/bgm/music_2.mp3",
  "./audio/bgm/music_3.mp3",
  "./audio/bgm/music_4.mp3",
  "./audio/bgm/music_5.mp3",
  "./audio/bgm/music_6.mp3",
  "./audio/bgm/music_7.mp3",
  "./audio/sfx/ui/coin.ogg",
  "./audio/sfx/ui/confirm.ogg",
  "./audio/sfx/ui/error.ogg",
  "./audio/sfx/ui/hit.ogg",
  "./audio/sfx/ui/success.ogg",
  "./audio/sfx/ui/tap.ogg",
  "./fonts/material-symbols-outlined.woff2",
  "./fonts/orbitron-latin-400-normal.woff2",
  "./fonts/orbitron-latin-700-normal.woff2",
  "./fonts/orbitron-latin-900-normal.woff2",
  "./fonts/share-tech-mono-latin-400-normal.woff2",
  "./games/asteroids/audio/explode.ogg",
  "./games/asteroids/audio/hit.ogg",
  "./games/asteroids/audio/shoot.ogg",
  "./games/asteroids/index.html",
  "./games/doodle/audio/break.ogg",
  "./games/doodle/audio/gameover.ogg",
  "./games/doodle/audio/jump.ogg",
  "./games/doodle/audio/spring.ogg",
  "./games/doodle/index.html",
  "./games/flappy/audio/flap.ogg",
  "./games/flappy/audio/hit.ogg",
  "./games/flappy/audio/score.ogg",
  "./games/flappy/index.html",
  "./games/frogger/audio/goal.ogg",
  "./games/frogger/audio/hit.ogg",
  "./games/frogger/audio/hop.ogg",
  "./games/frogger/audio/splash.ogg",
  "./games/frogger/index.html",
  "./games/game2048/audio/gameover.ogg",
  "./games/game2048/audio/merge.ogg",
  "./games/game2048/audio/spawn.ogg",
  "./games/game2048/audio/win.ogg",
  "./games/game2048/index.html",
  "./games/neonsiege/audio/build.ogg",
  "./games/neonsiege/audio/core_hit.ogg",
  "./games/neonsiege/audio/hit.ogg",
  "./games/neonsiege/audio/shoot.ogg",
  "./games/neonsiege/audio/upgrade.ogg",
  "./games/neonsiege/audio/wave.ogg",
  "./games/neonsiege/index.html",
  "./games/prismcascade/audio/bomb.ogg",
  "./games/prismcascade/audio/cascade.ogg",
  "./games/prismcascade/audio/gameover.ogg",
  "./games/prismcascade/audio/match.ogg",
  "./games/prismcascade/index.html",
  "./games/snake/audio/die.ogg",
  "./games/snake/audio/eat.ogg",
  "./games/snake/index.html",
  "./games/spaceinvaders/audio/hit.ogg",
  "./games/spaceinvaders/audio/player_hit.ogg",
  "./games/spaceinvaders/audio/shoot.ogg",
  "./games/spaceinvaders/audio/wave.ogg",
  "./games/spaceinvaders/index.html",
  "./games/stacktower/audio/drop.ogg",
  "./games/stacktower/audio/miss.ogg",
  "./games/stacktower/audio/perfect.ogg",
  "./games/stacktower/index.html",
  "./games/tetris/audio/clear.ogg",
  "./games/tetris/audio/gameover.ogg",
  "./games/tetris/audio/move.ogg",
  "./games/tetris/audio/rotate.ogg",
  "./games/tetris/audio/tetris.ogg",
  "./games/tetris/index.html",
  "./games/thrustrunner/audio/collect.ogg",
  "./games/thrustrunner/audio/crash.ogg",
  "./games/thrustrunner/audio/thrust.ogg",
  "./games/thrustrunner/index.html",
  "./icon.png",
  "./index.html",
  "./js/audio.js",
  "./js/economy-api.js",
  "./js/economy.js",
  "./js/frogger/constants.js",
  "./js/frogger/entities.js",
  "./js/frogger/game.js",
  "./js/frogger/physics.js",
  "./js/frogger/render.js",
  "./js/frogger/world.js",
  "./js/game.js",
  "./js/haptics.js",
  "./js/main.js",
  "./js/neonsiege/balance.js",
  "./js/neonsiege/codex.js",
  "./js/neonsiege/constants.js",
  "./js/neonsiege/entities.js",
  "./js/neonsiege/game.js",
  "./js/neonsiege/input.js",
  "./js/neonsiege/mapgen.js",
  "./js/neonsiege/maps.js",
  "./js/neonsiege/path.js",
  "./js/neonsiege/render.js",
  "./js/neonsiege/systems.js",
  "./js/router.js",
  "./manifest.webmanifest",
  "./privacy.html",
  "./style/asteroids.css",
  "./style/compat.css",
  "./style/doodle.css",
  "./style/flappy.css",
  "./style/fonts.css",
  "./style/frogger.css",
  "./style/game.css",
  "./style/game2048.css",
  "./style/main.css",
  "./style/neonsiege.css",
  "./style/prismcascade.css",
  "./style/snake.css",
  "./style/spaceinvaders.css",
  "./style/stacktower.css",
  "./style/tetris.css",
  "./style/thrustrunner.css",
  "./sw.js"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn("[sw] precache partial fail", err);
      })
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
