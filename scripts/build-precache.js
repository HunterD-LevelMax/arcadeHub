const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SKIP = new Set([".git", "node_modules", "scripts", ".cursor"]);
const EXTRA = ["index.html", "privacy.html", "manifest.webmanifest", "icon.png", "sw.js"];
const BGM_FILES = ["music_1.mp3", "music_2.mp3", "music_3.mp3"];

function shouldSkipDir(name) {
  return name.endsWith("_files") || name.includes("Принципы") || name === "tower_gamedesign";
}

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name) || shouldSkipDir(name)) continue;
    const full = path.join(dir, name);
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else out.add("./" + rel);
  }
}

function walkGames(out) {
  const gamesDir = path.join(ROOT, "games");
  if (!fs.existsSync(gamesDir)) return;

  for (const gameId of fs.readdirSync(gamesDir)) {
    if (SKIP.has(gameId) || shouldSkipDir(gameId)) continue;
    const gameDir = path.join(gamesDir, gameId);
    if (!fs.statSync(gameDir).isDirectory()) continue;

    const indexHtml = path.join(gameDir, "index.html");
    if (fs.existsSync(indexHtml)) {
      out.add(`./games/${gameId}/index.html`);
    }

    const audioDir = path.join(gameDir, "audio");
    if (fs.existsSync(audioDir)) walk(audioDir, out);
  }
}

function walkAudio(out) {
  const uiDir = path.join(ROOT, "audio", "sfx", "ui");
  if (fs.existsSync(uiDir)) walk(uiDir, out);

  const bgmDir = path.join(ROOT, "audio", "bgm");
  if (!fs.existsSync(bgmDir)) return;
  for (const file of BGM_FILES) {
    const full = path.join(bgmDir, file);
    if (fs.existsSync(full)) {
      out.add("./audio/bgm/" + file);
    }
  }
}

const files = new Set(EXTRA.map((f) => "./" + f));
walkGames(files);
walkAudio(files);
for (const dir of ["js", "style", "fonts"]) {
  const abs = path.join(ROOT, dir);
  if (fs.existsSync(abs)) walk(abs, files);
}

const list = [...files].sort();
const sw = `/* Auto-generated precache list — run: node scripts/build-precache.js */
const CACHE_NAME = "arcade-hub-v1";
const PRECACHE_URLS = ${JSON.stringify(list, null, 2)};

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
`;

fs.writeFileSync(path.join(ROOT, "sw.js"), sw);
console.log("Wrote sw.js with", list.length, "precache entries");
