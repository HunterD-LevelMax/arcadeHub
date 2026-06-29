const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const EXTRA = ["index.html", "privacy.html", "manifest.webmanifest", "icon_round.png"];
const HUB_STYLE_FILES = [
  "./style/fonts.css",
  "./style/main.css",
  "./style/compat.css",
  "./style/scrollbars.css",
  "./style/hub/cards.css",
  "./style/hub/stars.css",
];
const HUB_JS_FILES = [
  "./js/perf.js",
  "./js/haptics.js",
  "./js/arcade-icons.js",
  "./js/audio.js",
  "./js/economy-api.js",
  "./js/economy.js",
  "./js/hub/ArcadeRouter.js",
  "./js/hub/HubPreviewBase.js",
  "./js/hub/HubPreviewManager.js",
  "./js/hub/previews.js",
  "./js/hub/Starfield.js",
  "./js/hub/HubScrollMemory.js",
  "./js/hub/HubBootstrap.js",
  "./js/economy/ArcadeModal.js",
  "./js/economy/EconomyUI.js",
];
const FONT_FILES = [
  "./fonts/orbitron-latin-400-normal.woff2",
  "./fonts/orbitron-latin-700-normal.woff2",
  "./fonts/orbitron-latin-900-normal.woff2",
  "./fonts/share-tech-mono-latin-400-normal.woff2",
];
const UI_SFX = [
  "./audio/sfx/ui/coin.ogg",
  "./audio/sfx/ui/confirm.ogg",
  "./audio/sfx/ui/error.ogg",
  "./audio/sfx/ui/hit.ogg",
  "./audio/sfx/ui/success.ogg",
  "./audio/sfx/ui/tap.ogg",
];

function buildCriticalPrecache() {
  const files = new Set([
    ...EXTRA,
    ...HUB_STYLE_FILES,
    ...HUB_JS_FILES,
    ...FONT_FILES,
    "./icons/sprite.svg",
    ...UI_SFX,
  ]);

  for (const rel of files) {
    const abs = path.join(ROOT, rel.replace(/^\.\//, ""));
    if (!fs.existsSync(abs)) {
      console.warn("Missing critical asset:", rel);
    }
  }

  return [...files].sort();
}

const CRITICAL_PRECACHE = buildCriticalPrecache();

const sw = `/* Auto-generated — run: node scripts/build-precache.js */
const CACHE_NAME = "arcade-hub-v2";
const CRITICAL_PRECACHE = ${JSON.stringify(CRITICAL_PRECACHE, null, 2)};

function matchesCritical(url) {
  const pathname = url.pathname;
  return CRITICAL_PRECACHE.some((entry) => {
    const normalized = entry.replace(/^\\.\\//, "");
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
`;

fs.writeFileSync(path.join(ROOT, "sw.js"), sw);
console.log("Wrote sw.js with", CRITICAL_PRECACHE.length, "critical precache entries");
