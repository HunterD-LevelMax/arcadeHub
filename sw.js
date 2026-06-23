/* Auto-generated precache list — run: node scripts/build-precache.js */
const CACHE_NAME = "arcade-hub-v1";
const PRECACHE_URLS = [
  "./audio/LICENSE-kenney-interface.txt",
  "./audio/README.md",
  "./audio/bgm/hub_loop.ogg",
  "./audio/bgm/music_1.mp3",
  "./audio/bgm/music_2.mp3",
  "./audio/bgm/music_3.mp3",
  "./audio/sfx/asteroids/explode.ogg",
  "./audio/sfx/asteroids/hit.ogg",
  "./audio/sfx/asteroids/shoot.ogg",
  "./audio/sfx/doodle/break.ogg",
  "./audio/sfx/doodle/gameover.ogg",
  "./audio/sfx/doodle/jump.ogg",
  "./audio/sfx/doodle/spring.ogg",
  "./audio/sfx/flappy/flap.ogg",
  "./audio/sfx/flappy/hit.ogg",
  "./audio/sfx/flappy/score.ogg",
  "./audio/sfx/frogger/goal.ogg",
  "./audio/sfx/frogger/hit.ogg",
  "./audio/sfx/frogger/hop.ogg",
  "./audio/sfx/frogger/splash.ogg",
  "./audio/sfx/game2048/gameover.ogg",
  "./audio/sfx/game2048/merge.ogg",
  "./audio/sfx/game2048/spawn.ogg",
  "./audio/sfx/game2048/win.ogg",
  "./audio/sfx/neonsiege/build.ogg",
  "./audio/sfx/neonsiege/core_hit.ogg",
  "./audio/sfx/neonsiege/hit.ogg",
  "./audio/sfx/neonsiege/shoot.ogg",
  "./audio/sfx/neonsiege/upgrade.ogg",
  "./audio/sfx/neonsiege/wave.ogg",
  "./audio/sfx/prismcascade/bomb.ogg",
  "./audio/sfx/prismcascade/cascade.ogg",
  "./audio/sfx/prismcascade/gameover.ogg",
  "./audio/sfx/prismcascade/match.ogg",
  "./audio/sfx/snake/die.ogg",
  "./audio/sfx/snake/eat.ogg",
  "./audio/sfx/spaceinvaders/hit.ogg",
  "./audio/sfx/spaceinvaders/player_hit.ogg",
  "./audio/sfx/spaceinvaders/shoot.ogg",
  "./audio/sfx/spaceinvaders/wave.ogg",
  "./audio/sfx/stacktower/drop.ogg",
  "./audio/sfx/stacktower/miss.ogg",
  "./audio/sfx/stacktower/perfect.ogg",
  "./audio/sfx/tetris/clear.ogg",
  "./audio/sfx/tetris/gameover.ogg",
  "./audio/sfx/tetris/move.ogg",
  "./audio/sfx/tetris/rotate.ogg",
  "./audio/sfx/tetris/tetris.ogg",
  "./audio/sfx/thrustrunner/collect.ogg",
  "./audio/sfx/thrustrunner/crash.ogg",
  "./audio/sfx/thrustrunner/thrust.ogg",
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
  "./games/asteroids.html",
  "./games/doodle.html",
  "./games/flappy.html",
  "./games/frogger.html",
  "./games/game2048.html",
  "./games/neonsiege.html",
  "./games/prismcascade.html",
  "./games/snake.html",
  "./games/spaceinvaders.html",
  "./games/stacktower.html",
  "./games/tetris.html",
  "./games/thrustrunner.html",
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
