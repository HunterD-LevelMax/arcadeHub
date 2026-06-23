/**
 * Arcade Hub — shared SFX (CC0 Kenney assets in audio/sfx/)
 */
(function () {
  const MUTE_KEY = "arcadeHub_muted";
  const BASE = "audio/sfx";

  const SOUND_MAP = {
    "ui.tap": "ui/tap.ogg",
    "ui.confirm": "ui/confirm.ogg",
    "ui.hit": "ui/hit.ogg",
    "ui.success": "ui/success.ogg",
    "ui.error": "ui/error.ogg",
    "ui.coin": "ui/coin.ogg",

    "snake.eat": "snake/eat.ogg",
    "snake.die": "snake/die.ogg",

    "flappy.flap": "flappy/flap.ogg",
    "flappy.score": "flappy/score.ogg",
    "flappy.hit": "flappy/hit.ogg",

    "spaceinvaders.shoot": "spaceinvaders/shoot.ogg",
    "spaceinvaders.hit": "spaceinvaders/hit.ogg",
    "spaceinvaders.playerHit": "spaceinvaders/player_hit.ogg",
    "spaceinvaders.wave": "spaceinvaders/wave.ogg",

    "tetris.move": "tetris/move.ogg",
    "tetris.rotate": "tetris/rotate.ogg",
    "tetris.clear": "tetris/clear.ogg",
    "tetris.tetris": "tetris/tetris.ogg",
    "tetris.gameover": "tetris/gameover.ogg",

    "prismcascade.match": "prismcascade/match.ogg",
    "prismcascade.cascade": "prismcascade/cascade.ogg",
    "prismcascade.bomb": "prismcascade/bomb.ogg",
    "prismcascade.gameover": "prismcascade/gameover.ogg",

    "frogger.hop": "frogger/hop.ogg",
    "frogger.splash": "frogger/splash.ogg",
    "frogger.hit": "frogger/hit.ogg",
    "frogger.goal": "frogger/goal.ogg",

    "asteroids.shoot": "asteroids/shoot.ogg",
    "asteroids.explode": "asteroids/explode.ogg",
    "asteroids.hit": "asteroids/hit.ogg",

    "doodle.jump": "doodle/jump.ogg",
    "doodle.spring": "doodle/spring.ogg",
    "doodle.break": "doodle/break.ogg",
    "doodle.gameover": "doodle/gameover.ogg",

    "game2048.merge": "game2048/merge.ogg",
    "game2048.spawn": "game2048/spawn.ogg",
    "game2048.win": "game2048/win.ogg",
    "game2048.gameover": "game2048/gameover.ogg",

    "stacktower.drop": "stacktower/drop.ogg",
    "stacktower.perfect": "stacktower/perfect.ogg",
    "stacktower.miss": "stacktower/miss.ogg",

    "thrustrunner.thrust": "thrustrunner/thrust.ogg",
    "thrustrunner.collect": "thrustrunner/collect.ogg",
    "thrustrunner.crash": "thrustrunner/crash.ogg",

    "neonsiege.build": "neonsiege/build.ogg",
    "neonsiege.shoot": "neonsiege/shoot.ogg",
    "neonsiege.hit": "neonsiege/hit.ogg",
    "neonsiege.wave": "neonsiege/wave.ogg",
    "neonsiege.coreHit": "neonsiege/core_hit.ogg",
    "neonsiege.upgrade": "neonsiege/upgrade.ogg",
  };

  const HAPTIC_SFX = {
    tick: "ui.tap",
    light: "ui.tap",
    medium: "ui.confirm",
    heavy: "ui.hit",
    success: "ui.success",
    error: "ui.error",
  };

  const cache = new Map();
  let unlocked = false;
  let muted = false;
  let basePath = BASE;

  function resolvePath() {
    if (/\/games\//i.test(window.location.pathname)) {
      basePath = "../" + BASE;
    } else {
      basePath = BASE;
    }
  }

  function readMuted() {
    try {
      return localStorage.getItem(MUTE_KEY) === "1";
    } catch (_e) {
      return false;
    }
  }

  function writeMuted(value) {
    try {
      localStorage.setItem(MUTE_KEY, value ? "1" : "0");
    } catch (_e) {}
    muted = value;
    document.documentElement.classList.toggle("audio-muted", muted);
    window.dispatchEvent(new CustomEvent("arcade-audio-mute", { detail: { muted } }));
  }

  function getSrc(id) {
    const rel = SOUND_MAP[id];
    if (!rel) return null;
    return basePath + "/" + rel;
  }

  function load(id) {
    if (cache.has(id)) return cache.get(id);
    const src = getSrc(id);
    if (!src) return null;
    const audio = new Audio(src);
    audio.preload = "auto";
    cache.set(id, audio);
    return audio;
  }

  function unlock() {
    if (unlocked) return Promise.resolve();
    unlocked = true;
    const silent = load("ui.tap");
    if (!silent) return Promise.resolve();
    const probe = silent.cloneNode();
    probe.volume = 0.001;
    return probe.play().then(() => {
      probe.pause();
      probe.currentTime = 0;
    }).catch(() => {});
  }

  function play(id, opts) {
    if (muted || !id) return;
    if (!unlocked) unlock();
    const master = opts && Number.isFinite(opts.volume) ? opts.volume : 1;
    const base = load(id);
    if (!base) return;
    const node = base.cloneNode();
    node.volume = Math.max(0, Math.min(1, master));
    if (opts && Number.isFinite(opts.rate)) node.playbackRate = opts.rate;
    node.play().catch(() => {});
  }

  function playForHaptic(kind) {
    const id = HAPTIC_SFX[kind];
    if (id) play(id, { volume: kind === "tick" ? 0.35 : 0.55 });
  }

  function preload(ids) {
    if (!Array.isArray(ids)) return;
    ids.forEach((id) => load(id));
  }

  function setMuted(value) {
    writeMuted(!!value);
  }

  function isMuted() {
    return muted;
  }

  function toggleMuted() {
    writeMuted(!muted);
    return muted;
  }

  function bindMuteButtons() {
    document.querySelectorAll("[data-audio-mute]").forEach((btn) => {
      if (btn.dataset.audioMuteBound === "1") return;
      btn.dataset.audioMuteBound = "1";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMuted();
        updateMuteButtons();
        unlock();
        if (!muted) play("ui.tap", { volume: 0.4 });
      });
    });
    updateMuteButtons();
  }

  function updateMuteButtons() {
    document.querySelectorAll("[data-audio-mute]").forEach((btn) => {
      const icon = btn.querySelector(".material-symbols-outlined");
      if (icon) icon.textContent = muted ? "volume_off" : "volume_up";
      btn.setAttribute("aria-pressed", muted ? "true" : "false");
      btn.title = muted ? "Unmute sound" : "Mute sound";
    });
  }

  function injectGameMuteButton() {
    if (!/\/games\//i.test(window.location.pathname)) return;
    const header = document.querySelector(".header");
    if (!header || header.querySelector("[data-audio-mute]")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "audio-mute-btn md-btn md-btn-outlined md-ripple";
    btn.dataset.audioMute = "1";
    btn.setAttribute("aria-label", "Toggle sound");
    btn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">volume_up</span>';
    header.appendChild(btn);
  }

  function init() {
    resolvePath();
    muted = readMuted();
    document.documentElement.classList.toggle("audio-muted", muted);
    injectGameMuteButton();
    bindMuteButtons();
    window.addEventListener("arcade-audio-mute", updateMuteButtons);
    document.addEventListener("click", () => unlock(), { once: true, capture: true });
    document.addEventListener("touchstart", () => unlock(), { once: true, capture: true });
  }

  window.ArcadeAudio = {
    unlock,
    play,
    playForHaptic,
    preload,
    setMuted,
    isMuted,
    toggleMuted,
    bindMuteButtons,
    SOUND_MAP,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
