/**
 * Arcade Hub — SFX: per-game audio in games/{id}/audio/, shared UI in audio/sfx/ui/
 */
(function () {
  const MUTE_KEY = "arcadeHub_muted";

  const ALIASES = {
    "snake.turn": "ui.tap",
    "tetris.lock": "ui.confirm",
    "tetris.hardDrop": "ui.hit",
    "flappy.start": "ui.confirm",
    "spaceinvaders.bomb": "ui.hit",
    "game2048.slide": "ui.tap",
    "prismcascade.swap": "ui.tap",
    "prismcascade.hammer": "ui.hit",
    "prismcascade.shuffle": "ui.confirm",
    "frogger.coin": "ui.coin",
    "doodle.start": "ui.confirm",
    "doodle.land": "ui.tap",
    "doodle.bonus": "ui.coin",
    "asteroids.levelUp": "ui.success",
    "thrustrunner.powerup": "ui.success",
    "stacktower.streak": "ui.success",
    "neonsiege.gameover": "ui.error",
    "neonsiege.victory": "ui.success",
  };

  const HAPTIC_SFX = {
    tick: "ui.tap",
    light: "ui.tap",
    medium: "ui.confirm",
    heavy: "ui.hit",
    success: "ui.success",
    error: "ui.error",
  };

  const BGM_TRACKS = ["music_1.mp3", "music_2.mp3", "music_3.mp3"];

  const cache = new Map();
  let unlocked = false;
  let muted = false;
  let bgmNode = null;
  let lastBgmTrack = null;
  let bgmVolume = 0.32;
  let bgmDucked = false;
  const BGM_DUCK_RATIO = 0.2;
  let hubBgmStarted = false;
  let appSuspended = false;
  let bgmWasPlaying = false;

  function getGameId() {
    const path = window.location.pathname || "";
    const match = path.match(/\/games\/([^/]+)/i);
    if (match) return match[1].toLowerCase();
    const href = window.location.href || "";
    const hrefMatch = href.match(/\/games\/([^/]+)/i);
    return hrefMatch ? hrefMatch[1].toLowerCase() : null;
  }

  function isGamePage() {
    return !!getGameId();
  }

  function soundFileName(name) {
    return name.replace(/([A-Z])/g, "_$1").toLowerCase() + ".ogg";
  }

  function resolveUrl(rel) {
    try {
      return new URL(rel, location.href).href;
    } catch (_e) {
      return rel;
    }
  }

  function sharedUiRel(name) {
    const file = soundFileName(name);
    const prefix = isGamePage() ? "../../audio/sfx/ui/" : "audio/sfx/ui/";
    return prefix + file;
  }

  function getSrc(id) {
    if (!id) return null;
    if (ALIASES[id]) id = ALIASES[id];

    const dot = id.indexOf(".");
    if (dot === -1) return null;

    const ns = id.slice(0, dot);
    const name = id.slice(dot + 1);

    if (ns === "ui") {
      return resolveUrl(sharedUiRel(name));
    }

    const currentGame = getGameId();
    if (currentGame && currentGame === ns.toLowerCase()) {
      return resolveUrl("audio/" + soundFileName(name));
    }

    return null;
  }

  function suspendAudio() {
    if (appSuspended) return;
    appSuspended = true;
    bgmWasPlaying = !!(bgmNode && !bgmNode.paused) || (hubBgmStarted && !muted);
    if (bgmNode) bgmNode.pause();
  }

  function resumeAudio() {
    if (!appSuspended) return;
    appSuspended = false;
    if (muted || !bgmWasPlaying) return;
    if (bgmNode) {
      applyBgmVolume();
      bgmNode.play().catch(() => {});
      return;
    }
    if (!isGamePage() && hubBgmStarted) playNextBgm();
  }

  function bindAppLifecycle() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") suspendAudio();
      else if (document.visibilityState === "visible") resumeAudio();
    });
    window.addEventListener("pagehide", suspendAudio);
    window.addEventListener("pageshow", resumeAudio);
  }

  function onBgmEnded() {
    if (muted || isGamePage() || !hubBgmStarted) return;
    playNextBgm();
  }

  function pickRandomBgmTrack() {
    if (!BGM_TRACKS.length) return null;
    if (BGM_TRACKS.length === 1) return BGM_TRACKS[0];
    let track = BGM_TRACKS[0];
    for (let i = 0; i < 6; i++) {
      track = BGM_TRACKS[Math.floor(Math.random() * BGM_TRACKS.length)];
      if (track !== lastBgmTrack) break;
    }
    return track;
  }

  function getBgmSrc(file) {
    if (!file) return null;
    return resolveUrl("audio/bgm/" + file);
  }

  function applyBgmVolume() {
    if (!bgmNode) return;
    if (muted) {
      bgmNode.volume = 0;
      return;
    }
    const level = bgmDucked ? bgmVolume * BGM_DUCK_RATIO : bgmVolume;
    bgmNode.volume = Math.max(0, Math.min(1, level));
  }

  function playNextBgm() {
    if (isGamePage() || muted || appSuspended) return;
    const file = pickRandomBgmTrack();
    if (!file) return;
    if (!unlocked) unlock();

    if (bgmNode) {
      bgmNode.removeEventListener("ended", onBgmEnded);
      bgmNode.pause();
      bgmNode = null;
    }

    lastBgmTrack = file;
    bgmNode = new Audio(getBgmSrc(file));
    bgmNode.loop = false;
    bgmNode.addEventListener("ended", onBgmEnded);
    applyBgmVolume();
    bgmNode.play().catch(() => {});
    hubBgmStarted = true;
  }

  function playBgm(_id, opts) {
    if (isGamePage() || muted) return;
    if (opts && Number.isFinite(opts.volume)) bgmVolume = opts.volume;
    playNextBgm();
  }

  function stopBgm() {
    if (!bgmNode) return;
    bgmNode.removeEventListener("ended", onBgmEnded);
    bgmNode.pause();
    bgmNode.currentTime = 0;
    bgmNode = null;
    lastBgmTrack = null;
    hubBgmStarted = false;
  }

  function setBgmVolume(value) {
    if (!Number.isFinite(value)) return;
    bgmVolume = Math.max(0, Math.min(1, value));
    applyBgmVolume();
  }

  function duckBgm() {
    bgmDucked = true;
    applyBgmVolume();
  }

  function unduckBgm() {
    bgmDucked = false;
    applyBgmVolume();
  }

  function maybeStartHubBgm() {
    if (isGamePage() || muted || hubBgmStarted) return;
    playNextBgm();
  }

  function preloadBgm() {
    if (isGamePage()) return;
    BGM_TRACKS.forEach((file) => {
      const src = getBgmSrc(file);
      if (!src) return;
      const audio = new Audio(src);
      audio.preload = "auto";
    });
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
    if (muted) {
      if (bgmNode) bgmNode.pause();
    } else if (hubBgmStarted && bgmNode) {
      applyBgmVolume();
      bgmNode.play().catch(() => {});
    } else if (!isGamePage() && !hubBgmStarted) {
      maybeStartHubBgm();
    }
    window.dispatchEvent(new CustomEvent("arcade-audio-mute", { detail: { muted } }));
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
      maybeStartHubBgm();
    }).catch(() => {});
  }

  function play(id, opts) {
    if (muted || !id || appSuspended) return;
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
    if (id) play(id, { volume: kind === "tick" ? 0.42 : kind === "light" ? 0.48 : 0.62 });
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
    if (!isGamePage()) return;
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
    muted = readMuted();
    document.documentElement.classList.toggle("audio-muted", muted);
    injectGameMuteButton();
    bindMuteButtons();
    bindAppLifecycle();
    window.addEventListener("arcade-audio-mute", updateMuteButtons);
    document.addEventListener("click", () => {
      unlock().then(() => maybeStartHubBgm());
    }, { once: true, capture: true });
    document.addEventListener("touchstart", () => {
      unlock().then(() => maybeStartHubBgm());
    }, { once: true, capture: true });
    if (!isGamePage() && !muted) {
      preloadBgm();
      window.addEventListener("arcade-hub-visible", () => unduckBgm());
    }
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
    playBgm,
    stopBgm,
    setBgmVolume,
    duckBgm,
    unduckBgm,
    suspend: suspendAudio,
    resume: resumeAudio,
    ALIASES,
    BGM_TRACKS,
    getGameId,
    getSrc,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
