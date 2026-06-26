/**
 * Hub scroll position memory across game sessions.
 */
(function () {
  'use strict';

  class HubScrollMemory {
    static SCROLL_KEY = 'arcadeHub_scrollY';
    static _wheelBound = false;

    static init() {
      if (/\/games\//i.test(window.location.pathname)) return;

      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }

      HubScrollMemory.bindWheelScroll();

      window.addEventListener('arcade-hub-visible', () => HubScrollMemory.restore());

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => HubScrollMemory.restore());
      } else {
        HubScrollMemory.restore();
      }
    }

    static scrollRoot() {
      return document.getElementById('hubRoot');
    }

    static bindWheelScroll() {
      if (HubScrollMemory._wheelBound) return;
      HubScrollMemory._wheelBound = true;

      document.addEventListener(
        'wheel',
        (e) => {
          if (document.body.classList.contains('game-active')) return;
          if (e.ctrlKey) return;

          const root = HubScrollMemory.scrollRoot();
          if (!root) return;

          const target = e.target;
          const onStars = target.closest && target.closest('.stars');
          const onRoot = target === root;

          if (!onStars && !onRoot) return;

          root.scrollTop += e.deltaY;
          e.preventDefault();
        },
        { passive: false }
      );
    }

    static restore() {
      if (window.ArcadeRouter && typeof ArcadeRouter.restoreHubScroll === 'function') {
        ArcadeRouter.restoreHubScroll();
        return;
      }

      const raw = sessionStorage.getItem(HubScrollMemory.SCROLL_KEY);
      if (raw === null) return;
      const y = Number(raw);
      if (!Number.isFinite(y) || y <= 0) return;

      const root = HubScrollMemory.scrollRoot();
      const apply = () => {
        if (root) root.scrollTop = y;
        else window.scrollTo(0, y);
      };
      apply();
      requestAnimationFrame(apply);
      window.addEventListener('load', apply, { once: true });
      setTimeout(apply, 100);
    }
  }

  window.HubScrollMemory = HubScrollMemory;
})();
