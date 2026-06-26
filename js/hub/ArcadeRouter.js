/**
 * Arcade Hub — in-app navigation (hub shell + game iframe).
 * Keeps the hub mounted; games load without full page reload.
 */
(function () {
  'use strict';

  class ArcadeRouter {
    constructor() {
      this.SCROLL_KEY = 'arcadeHub_scrollY';
      this.hubRoot = null;
      this.gameShell = null;
      this.gameFrame = null;
      this.gameLoading = null;
      this.currentGame = null;
      this.lastCardOpenAt = 0;
    }

    bindGameFrameLoad() {
      if (!this.gameFrame) return;
      this.gameFrame.addEventListener('load', () => {
        if (this.gameLoading && this.currentGame) {
          this.gameLoading.classList.add('hidden');
        }
      });
    }

    recreateGameFrame() {
      if (!this.gameFrame || !this.gameShell) return;
      const fresh = document.createElement('iframe');
      fresh.id = 'gameFrame';
      fresh.className = 'game-frame';
      fresh.title = 'Arcade game';
      fresh.setAttribute('allow', 'autoplay');
      this.gameFrame.replaceWith(fresh);
      this.gameFrame = fresh;
      this.bindGameFrameLoad();
    }

    saveHubScroll() {
      const root = this.hubRoot || document.getElementById('hubRoot');
      const y = root ? root.scrollTop : (window.scrollY || window.pageYOffset || 0);
      sessionStorage.setItem(this.SCROLL_KEY, String(y));
    }

    restoreHubScroll() {
      const raw = sessionStorage.getItem(this.SCROLL_KEY);
      if (raw === null) return;
      const y = Number(raw);
      if (!Number.isFinite(y) || y <= 0) return;
      const root = this.hubRoot || document.getElementById('hubRoot');
      const apply = () => {
        if (root) root.scrollTop = y;
        else window.scrollTo(0, y);
      };
      apply();
      requestAnimationFrame(apply);
      setTimeout(apply, 50);
    }

    duckBgm() {
      if (window.ArcadeAudio && typeof window.ArcadeAudio.duckBgm === 'function') {
        window.ArcadeAudio.duckBgm();
      }
    }

    unduckBgm() {
      if (window.ArcadeAudio && typeof window.ArcadeAudio.unduckBgm === 'function') {
        window.ArcadeAudio.unduckBgm();
      }
    }

    isGameOpenInUi() {
      return !!this.currentGame || (this.gameShell && !this.gameShell.classList.contains('hidden'));
    }

    hubUrl() {
      return location.pathname + location.search;
    }

    replaceHubHistory() {
      if (!window.history || !window.history.replaceState) return;
      history.replaceState({ arcadeHub: true }, '', this.hubUrl());
    }

    showHubUi() {
      if (!this.gameFrame || !this.hubRoot || !this.gameShell) return;

      this.currentGame = null;
      this.gameShell.classList.add('hidden');
      this.gameShell.setAttribute('aria-hidden', 'true');
      this.hubRoot.classList.remove('hub-hidden');
      if (this.gameLoading) this.gameLoading.classList.add('hidden');
      document.body.classList.remove('game-active');

      this.unduckBgm();
      this.restoreHubScroll();
      this.recreateGameFrame();
      if (window.HubPreviewManager && typeof HubPreviewManager.resumeAll === 'function') {
        HubPreviewManager.resumeAll();
      }
      window.dispatchEvent(new CustomEvent('arcade-hub-visible'));
    }

    gameFrameUrl(gameId) {
      const path = 'games/' + gameId + '/index.html';
      try {
        const base = location.href.split('#')[0];
        return new URL(path, base).href;
      } catch (_e) {
        return path;
      }
    }

    frameHasGame(gameId) {
      if (!this.gameFrame || !this.gameFrame.src) return false;
      const src = this.gameFrame.src;
      return (
        src.indexOf('/games/' + gameId + '/') !== -1 ||
        src.indexOf('/games/' + gameId + '.html') !== -1
      );
    }

    showGameUi(gameId) {
      if (!gameId || !this.gameFrame || !this.hubRoot || !this.gameShell) return;

      const targetSrc = this.gameFrameUrl(gameId);
      const sameGame =
        this.currentGame === gameId &&
        !this.gameShell.classList.contains('hidden') &&
        this.frameHasGame(gameId);

      if (sameGame) return;

      this.saveHubScroll();
      sessionStorage.setItem('arcadeHub_lastGameId', gameId);
      this.currentGame = gameId;

      if (window.ArcadeAudio && typeof window.ArcadeAudio.unlock === 'function') {
        window.ArcadeAudio.unlock();
      }
      this.duckBgm();

      this.hubRoot.classList.add('hub-hidden');
      this.gameShell.classList.remove('hidden');
      this.gameShell.setAttribute('aria-hidden', 'false');
      if (this.gameLoading) this.gameLoading.classList.remove('hidden');
      document.body.classList.add('game-active');

      if (window.HubPreviewManager && typeof HubPreviewManager.pauseAll === 'function') {
        HubPreviewManager.pauseAll();
      }

      this.recreateGameFrame();
      this.gameFrame.src = targetSrc;
    }

    openGame(gameId) {
      if (!gameId) return;
      gameId = String(gameId).toLowerCase();

      const fromHubUi = !this.isGameOpenInUi();
      if (fromHubUi) {
        this.replaceHubHistory();
      }

      this.showGameUi(gameId);

      if (!window.history || !window.history.replaceState) return;
      const hash = '#game/' + gameId;
      if (history.state && history.state.arcadeGame === gameId && location.hash === hash) return;

      const payload = { arcadeGame: gameId };
      if (fromHubUi && history.state && history.state.arcadeHub) {
        history.pushState(payload, '', hash);
      } else {
        history.replaceState(payload, '', hash);
      }
    }

    backToHub(fromPopstate) {
      if (!this.isGameOpenInUi()) return;
      if (fromPopstate) return;

      this.showHubUi();
      this.replaceHubHistory();
    }

    getCurrentGame() {
      return this.currentGame;
    }

    bindHubCards() {
      const TAP_SLOP_PX = 12;

      document.querySelectorAll('.game-card[data-game-id]').forEach((card) => {
        let touchStartX = 0;
        let touchStartY = 0;

        card.addEventListener(
          'touchstart',
          (e) => {
            const t = e.targetTouches[0];
            if (!t) return;
            touchStartX = t.clientX;
            touchStartY = t.clientY;
          },
          { passive: true }
        );

        const onActivate = (e) => {
          if (card.classList.contains('locked')) return;
          const id = card.dataset.gameId;
          if (!id) return;
          if (e.cancelable) e.preventDefault();

          const now = Date.now();
          if (now - this.lastCardOpenAt < 400) return;
          this.lastCardOpenAt = now;

          this.openGame(id);
        };

        card.addEventListener('click', (e) => onActivate(e));
        card.addEventListener(
          'touchend',
          (e) => {
            if (card.classList.contains('locked')) return;
            const t = e.changedTouches[0];
            if (!t) return;
            const dx = Math.abs(t.clientX - touchStartX);
            const dy = Math.abs(t.clientY - touchStartY);
            if (dx > TAP_SLOP_PX || dy > TAP_SLOP_PX) return;
            onActivate(e);
          },
          { passive: false }
        );
      });
    }

    bindPopState() {
      window.addEventListener('popstate', (event) => {
        const gameId = event.state && event.state.arcadeGame;
        if (gameId) {
          const gid = String(gameId).toLowerCase();
          if (!this.currentGame || this.currentGame !== gid) {
            this.showHubUi();
            this.replaceHubHistory();
            return;
          }
          this.showGameUi(gid);
        } else {
          this.showHubUi();
          this.replaceHubHistory();
        }
      });
    }

    bindHashFallback() {
      window.addEventListener('hashchange', () => {
        if (!location.hash.match(/^#game\//i) && this.isGameOpenInUi()) {
          this.showHubUi();
          this.replaceHubHistory();
        }
      });
    }

    bindGameMessages() {
      window.addEventListener('message', (event) => {
        if (!event.data || event.data.type !== 'arcade-hub-back') return;
        this.backToHub(false);
      });
    }

    initHistory() {
      if (!window.history || !window.history.replaceState) return;

      const deepLink = location.hash.match(/^#game\/([^/?#]+)/i);
      if (deepLink) {
        const gameId = deepLink[1].toLowerCase();
        this.showGameUi(gameId);
        history.replaceState({ arcadeGame: gameId }, '', '#game/' + gameId);
        return;
      }

      history.replaceState({ arcadeHub: true }, '', this.hubUrl());
    }

    init() {
      this.hubRoot = document.getElementById('hubRoot');
      this.gameShell = document.getElementById('gameShell');
      this.gameFrame = document.getElementById('gameFrame');
      this.gameLoading = document.getElementById('gameFrameLoading');

      if (!this.hubRoot || !this.gameShell || !this.gameFrame) return;

      this.bindGameFrameLoad();
      this.initHistory();
      this.bindHubCards();
      this.bindPopState();
      this.bindHashFallback();
      this.bindGameMessages();
    }
  }

  const router = new ArcadeRouter();

  window.ArcadeRouter = {
    openGame: (id) => router.openGame(id),
    backToHub: () => router.backToHub(false),
    getCurrentGame: () => router.getCurrentGame(),
    saveHubScroll: () => router.saveHubScroll(),
    restoreHubScroll: () => router.restoreHubScroll(),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => router.init());
  } else {
    router.init();
  }
})();
