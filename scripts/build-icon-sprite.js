/**
 * Build icons/sprite.svg from Material Symbols outlined 24px SVGs.
 * Run: node scripts/build-icon-sprite.js
 * Requires network on first run; output is committed to the repo.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "icons");
const OUT_FILE = path.join(OUT_DIR, "sprite.svg");
const SRC_DIR = path.join(OUT_DIR, "src");

const ICONS = [
  "add_circle",
  "analytics",
  "arrow_back",
  "bolt",
  "check",
  "close",
  "fast_forward",
  "grid_view",
  "local_mall",
  "lock",
  "menu_book",
  "monetization_on",
  "paid",
  "person",
  "play_arrow",
  "policy",
  "refresh",
  "shuffle",
  "skip_next",
  "sports_esports",
  "upgrade",
  "videogame_asset",
  "volume_off",
  "volume_up",
];

function iconUrl(name) {
  return `https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/${name}/default/24px.svg`;
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          fetchText(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

function extractPaths(svgText) {
  const viewBoxMatch = svgText.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24";
  const paths = [];
  const pathRe = /<path\b[^>]*>/gi;
  let match;
  while ((match = pathRe.exec(svgText)) !== null) {
    paths.push(match[0]);
  }
  if (!paths.length) {
    throw new Error("No <path> found in SVG");
  }
  return { viewBox, inner: paths.join("\n      ") };
}

async function loadIcon(name) {
  const cached = path.join(SRC_DIR, `${name}.svg`);
  let svgText;
  if (fs.existsSync(cached)) {
    svgText = fs.readFileSync(cached, "utf8");
  } else {
    svgText = await fetchText(iconUrl(name));
    fs.mkdirSync(SRC_DIR, { recursive: true });
    fs.writeFileSync(cached, svgText);
  }
  return extractPaths(svgText);
}

async function main() {
  const symbols = [];
  for (const name of ICONS) {
    try {
      const { viewBox, inner } = await loadIcon(name);
      symbols.push(
        `  <symbol id="${name}" viewBox="${viewBox}">\n      ${inner}\n  </symbol>`
      );
      console.log("  +", name);
    } catch (err) {
      console.error("FAIL", name, err.message);
      process.exitCode = 1;
      return;
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const sprite = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${symbols.join("\n")}\n</svg>\n`;
  fs.writeFileSync(OUT_FILE, sprite);
  console.log("Wrote", path.relative(ROOT, OUT_FILE), `(${ICONS.length} icons)`);
}

main();
