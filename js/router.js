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
  let handlingHistory = false;

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
    window.dispatchEvent(new CustomEvent("arcade-hub-visible"));
  }

  function showGameUi(gameId) {
    if (!gameId || !gameFrame || !hubRoot || !gameShell) return;

    const targetSrc = "games/" + gameId + ".html";
    const sameGame =
      currentGame === gameId &&
      !gameShell.classList.contains("hidden") &&
      gameFrame.src &&
      gameFrame.src.indexOf(targetSrc) !== -1;

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

    const hadFrameNav =
      !!gameFrame.src &&
      gameFrame.src !== "about:blank" &&
      gameFrame.src.indexOf("about:") === -1;
    try {
      if (hadFrameNav && gameFrame.contentWindow) {
        gameFrame.contentWindow.location.replace(targetSrc);
      } else {
        gameFrame.src = targetSrc;
      }
    } catch (_e) {
      gameFrame.src = targetSrc;
    }
  }

  function openGame(gameId) {
    if (!gameId) return;

    const fromHubUi = !isGameOpenInUi();
    if (fromHubUi) {
      replaceHubHistory();
    }

    showGameUi(gameId);

    if (!window.history || !window.history.pushState) return;
    const hash = "#game/" + gameId;
    const state = history.state;
    if (state && state.arcadeGame === gameId && location.hash === hash) return;

    const payload = { arcadeGame: gameId };
    if (state && state.arcadeGame) {
      history.replaceState(payload, "", hash);
    } else {
      history.pushState(payload, "", hash);
    }
  }

  function backToHub(fromPopstate) {
    if (!isGameOpenInUi()) return;
    if (fromPopstate) return;

    showHubUi();

    const inGameHistory =
      (history.state && history.state.arcadeGame) || /^#game\//i.test(location.hash);

    if (inGameHistory && window.history) {
      handlingHistory = true;
      history.back();
      return;
    }

    replaceHubHistory();
  }

  function getCurrentGame() {
    return currentGame;
  }

  function bindHubCards() {
    document.querySelectorAll(".game-card[data-game-id]").forEach((card) => {
      function onActivate(e) {
        if (card.classList.contains("locked")) return;
        const id = card.dataset.gameId;
        if (!id) return;
        e.preventDefault();
        openGame(id);
      }

      card.addEventListener("click", onActivate);
      card.addEventListener("touchend", (e) => {
        if (card.classList.contains("locked")) return;
        e.preventDefault();
      }, { passive: false });
    });
  }

  function bindPopState() {
    window.addEventListener("popstate", (event) => {
      if (handlingHistory) {
        handlingHistory = false;
        return;
      }

      const gameId = event.state && event.state.arcadeGame;
      if (gameId) {
        const gid = String(gameId).toLowerCase();
        if (currentGame && currentGame !== gid) {
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

    gameFrame.addEventListener("load", () => {
      if (gameLoading && currentGame) gameLoading.classList.add("hidden");
    });

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
