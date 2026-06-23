const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SKIP = new Set([".git", "node_modules", "scripts", ".cursor"]);
const EXTRA = ["index.html", "privacy.html", "manifest.webmanifest", "icon.png", "sw.js"];

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = path.join(dir, name);
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else out.add("./" + rel);
  }
}

const files = new Set(EXTRA.map((f) => "./" + f));
for (const dir of ["games", "js", "style", "audio", "fonts"]) {
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
