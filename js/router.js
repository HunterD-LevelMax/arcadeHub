/**
 * Arcade Hub — in-app navigation (hub shell + game iframe).
 * Keeps the hub mounted; games load without full page reload.
 */
(function () {
  const SCROLL_KEY = "arcadeHub_scrollY";

  let hubRoot = null;
  let gameShell = null;
  let gameFrame = null;
  let gameLoading = null;
  let currentGame = null;
  let lastCardOpenAt = 0;

  function bindGameFrameLoad() {
    if (!gameFrame) return;
    gameFrame.addEventListener("load", () => {
      if (gameLoading && currentGame) gameLoading.classList.add("hidden");
    });
  }

  function recreateGameFrame() {
    if (!gameFrame || !gameShell) return;
    const fresh = document.createElement("iframe");
    fresh.id = "gameFrame";
    fresh.className = "game-frame";
    fresh.title = "Arcade game";
    fresh.setAttribute("allow", "autoplay");
    gameFrame.replaceWith(fresh);
    gameFrame = fresh;
    bindGameFrameLoad();
  }

  function saveHubScroll() {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY || window.pageYOffset || 0));
  }

  function restoreHubScroll() {
    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (raw === null) return;
    const y = Number(raw);
    if (!Number.isFinite(y) || y <= 0) return;
    const apply = () => window.scrollTo(0, y);
    apply();
    requestAnimationFrame(apply);
    setTimeout(apply, 50);
  }

  function duckBgm() {
    if (window.ArcadeAudio && typeof window.ArcadeAudio.duckBgm === "function") {
      window.ArcadeAudio.duckBgm();
    }
  }

  function unduckBgm() {
    if (window.ArcadeAudio && typeof window.ArcadeAudio.unduckBgm === "function") {
      window.ArcadeAudio.unduckBgm();
    }
  }

  function isGameOpenInUi() {
    return !!currentGame || (gameShell && !gameShell.classList.contains("hidden"));
  }

  function hubUrl() {
    return location.pathname + location.search;
  }

  function replaceHubHistory() {
    if (!window.history || !window.history.replaceState) return;
    history.replaceState({ arcadeHub: true }, "", hubUrl());
  }

  function showHubUi() {
    if (!gameFrame || !hubRoot || !gameShell) return;

    currentGame = null;
    gameShell.classList.add("hidden");
    gameShell.setAttribute("aria-hidden", "true");
    hubRoot.classList.remove("hub-hidden");
    if (gameLoading) gameLoading.classList.add("hidden");
    document.body.classList.remove("game-active");

    unduckBgm();
    restoreHubScroll();
    recreateGameFrame();
    if (window.HubPreviewManager && typeof HubPreviewManager.resumeAll === "function") {
      HubPreviewManager.resumeAll();
    }
    window.dispatchEvent(new CustomEvent("arcade-hub-visible"));
  }

  function gameFrameUrl(gameId) {
    const path = "games/" + gameId + "/index.html";
    try {
      const base = location.href.split("#")[0];
      return new URL(path, base).href;
    } catch (_e) {
      return path;
    }
  }

  function frameHasGame(gameId) {
    if (!gameFrame || !gameFrame.src) return false;
    const src = gameFrame.src;
    return (
      src.indexOf("/games/" + gameId + "/") !== -1 ||
      src.indexOf("/games/" + gameId + ".html") !== -1
    );
  }

  function showGameUi(gameId) {
    if (!gameId || !gameFrame || !hubRoot || !gameShell) return;

    const targetSrc = gameFrameUrl(gameId);
    const sameGame =
      currentGame === gameId &&
      !gameShell.classList.contains("hidden") &&
      frameHasGame(gameId);

    if (sameGame) return;

    saveHubScroll();
    sessionStorage.setItem("arcadeHub_lastGameId", gameId);
    currentGame = gameId;

    if (window.ArcadeAudio && typeof window.ArcadeAudio.unlock === "function") {
      window.ArcadeAudio.unlock();
    }
    duckBgm();

    hubRoot.classList.add("hub-hidden");
    gameShell.classList.remove("hidden");
    gameShell.setAttribute("aria-hidden", "false");
    if (gameLoading) gameLoading.classList.remove("hidden");
    document.body.classList.add("game-active");

    if (window.HubPreviewManager && typeof HubPreviewManager.pauseAll === "function") {
      HubPreviewManager.pauseAll();
    }

    recreateGameFrame();
    gameFrame.src = targetSrc;
  }

  function openGame(gameId) {
    if (!gameId) return;
    gameId = String(gameId).toLowerCase();

    const fromHubUi = !isGameOpenInUi();
    if (fromHubUi) {
      replaceHubHistory();
    }

    showGameUi(gameId);

    if (!window.history || !window.history.replaceState) return;
    const hash = "#game/" + gameId;
    if (history.state && history.state.arcadeGame === gameId && location.hash === hash) return;

    const payload = { arcadeGame: gameId };
    if (fromHubUi && history.state && history.state.arcadeHub) {
      history.pushState(payload, "", hash);
    } else {
      history.replaceState(payload, "", hash);
    }
  }

  function backToHub(fromPopstate) {
    if (!isGameOpenInUi()) return;
    if (fromPopstate) return;

    showHubUi();
    replaceHubHistory();
  }

  function getCurrentGame() {
    return currentGame;
  }

  function bindHubCards() {
    const TAP_SLOP_PX = 12;

    document.querySelectorAll(".game-card[data-game-id]").forEach((card) => {
      let touchStartX = 0;
      let touchStartY = 0;

      card.addEventListener("touchstart", (e) => {
        const t = e.targetTouches[0];
        if (!t) return;
        touchStartX = t.clientX;
        touchStartY = t.clientY;
      }, { passive: true });

      function onActivate(e) {
        if (card.classList.contains("locked")) return;
        const id = card.dataset.gameId;
        if (!id) return;
        if (e.cancelable) e.preventDefault();

        const now = Date.now();
        if (now - lastCardOpenAt < 400) return;
        lastCardOpenAt = now;

        openGame(id);
      }

      card.addEventListener("click", (e) => onActivate(e));
      card.addEventListener("touchend", (e) => {
        if (card.classList.contains("locked")) return;
        const t = e.changedTouches[0];
        if (!t) return;
        const dx = Math.abs(t.clientX - touchStartX);
        const dy = Math.abs(t.clientY - touchStartY);
        if (dx > TAP_SLOP_PX || dy > TAP_SLOP_PX) return;
        onActivate(e);
      }, { passive: false });
    });
  }

  function bindPopState() {
    window.addEventListener("popstate", (event) => {
      const gameId = event.state && event.state.arcadeGame;
      if (gameId) {
        const gid = String(gameId).toLowerCase();
        if (!currentGame || currentGame !== gid) {
          showHubUi();
          replaceHubHistory();
          return;
        }
        showGameUi(gid);
      } else {
        showHubUi();
        replaceHubHistory();
      }
    });
  }

  function bindHashFallback() {
    window.addEventListener("hashchange", () => {
      if (!location.hash.match(/^#game\//i) && isGameOpenInUi()) {
        showHubUi();
        replaceHubHistory();
      }
    });
  }

  function bindGameMessages() {
    window.addEventListener("message", (event) => {
      if (!event.data || event.data.type !== "arcade-hub-back") return;
      backToHub(false);
    });
  }

  function initHistory() {
    if (!window.history || !window.history.replaceState) return;

    const deepLink = location.hash.match(/^#game\/([^/?#]+)/i);
    if (deepLink) {
      const gameId = deepLink[1].toLowerCase();
      showGameUi(gameId);
      history.replaceState({ arcadeGame: gameId }, "", "#game/" + gameId);
      return;
    }

    history.replaceState({ arcadeHub: true }, "", hubUrl());
  }

  function init() {
    hubRoot = document.getElementById("hubRoot");
    gameShell = document.getElementById("gameShell");
    gameFrame = document.getElementById("gameFrame");
    gameLoading = document.getElementById("gameFrameLoading");

    if (!hubRoot || !gameShell || !gameFrame) return;

    bindGameFrameLoad();

    initHistory();
    bindHubCards();
    bindPopState();
    bindHashFallback();
    bindGameMessages();
  }

  window.ArcadeRouter = {
    openGame,
    backToHub: () => backToHub(false),
    getCurrentGame,
    saveHubScroll,
    restoreHubScroll,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

