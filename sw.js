/* Auto-generated — run: node scripts/build-precache.js */
const CACHE_NAME = "arcade-hub-v2";
const CRITICAL_PRECACHE = [
  "./audio/sfx/ui/coin.ogg",
  "./audio/sfx/ui/confirm.ogg",
  "./audio/sfx/ui/error.ogg",
  "./audio/sfx/ui/hit.ogg",
  "./audio/sfx/ui/success.ogg",
  "./audio/sfx/ui/tap.ogg",
  "./fonts/orbitron-latin-400-normal.woff2",
  "./fonts/orbitron-latin-700-normal.woff2",
  "./fonts/orbitron-latin-900-normal.woff2",
  "./fonts/share-tech-mono-latin-400-normal.woff2",
  "./icons/sprite.svg",
  "./js/arcade-icons.js",
  "./js/audio.js",
  "./js/economy-api.js",
  "./js/economy.js",
  "./js/economy/ArcadeModal.js",
  "./js/economy/EconomyUI.js",
  "./js/haptics.js",
  "./js/hub/ArcadeRouter.js",
  "./js/hub/HubBootstrap.js",
  "./js/hub/HubPreviewBase.js",
  "./js/hub/HubPreviewManager.js",
  "./js/hub/HubScrollMemory.js",
  "./js/hub/Starfield.js",
  "./js/hub/previews.js",
  "./js/perf.js",
  "./style/compat.css",
  "./style/fonts.css",
  "./style/hub/cards.css",
  "./style/hub/stars.css",
  "./style/main.css",
  "./style/scrollbars.css",
  "icon_round.png",
  "index.html",
  "manifest.webmanifest",
  "privacy.html"
];

function matchesCritical(url) {
  const pathname = url.pathname;
  return CRITICAL_PRECACHE.some((entry) => {
    const normalized = entry.replace(/^\.\//, "");
    return pathname.endsWith("/" + normalized) || pathname.endsWith(normalized);
  });
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(CRITICAL_PRECACHE).catch((err) => {
        console.warn("[sw] critical precache partial fail", err);
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

  const critical = matchesCritical(url);

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

      if (critical) {
        return cached || networkFetch;
      }

      return networkFetch.then((response) => response || cached);
    })
  );
});
