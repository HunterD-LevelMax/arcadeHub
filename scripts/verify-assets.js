/**
 * Verify local fonts and icon sprite before deploy.
 * Run: node scripts/verify-assets.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const REQUIRED_FONTS = [
  "fonts/orbitron-latin-400-normal.woff2",
  "fonts/orbitron-latin-700-normal.woff2",
  "fonts/orbitron-latin-900-normal.woff2",
  "fonts/share-tech-mono-latin-400-normal.woff2",
];

const REQUIRED_ICONS = [
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

let failed = false;

function fail(message) {
  console.error("FAIL:", message);
  failed = true;
}

function ok(message) {
  console.log("OK:", message);
}

for (const rel of REQUIRED_FONTS) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    fail(`missing font ${rel}`);
  } else {
    ok(rel);
  }
}

const spritePath = path.join(ROOT, "icons", "sprite.svg");
if (!fs.existsSync(spritePath)) {
  fail("missing icons/sprite.svg — run: node scripts/build-icon-sprite.js");
} else {
  const sprite = fs.readFileSync(spritePath, "utf8");
  ok("icons/sprite.svg");
  for (const id of REQUIRED_ICONS) {
    if (!sprite.includes(`id="${id}"`)) {
      fail(`sprite missing symbol #${id}`);
    }
  }
  if (!failed) {
    ok(`all ${REQUIRED_ICONS.length} icon symbols present`);
  }
}

const legacyFont = path.join(ROOT, "fonts", "material-symbols-outlined.woff2");
if (fs.existsSync(legacyFont)) {
  fail("remove deprecated fonts/material-symbols-outlined.woff2");
}

if (failed) {
  process.exit(1);
}

console.log("All assets verified.");
