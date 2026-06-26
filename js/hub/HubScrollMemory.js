/**
 * Hub scroll position memory across game sessions.
 */
(function () {
  'use strict';

  class HubScrollMemory {
    static SCROLL_KEY = 'arcadeHub_scrollY';

    static init() {
      if (/\/games\//i.test(window.location.pathname)) return;

      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }

      window.addEventListener('arcade-hub-visible', () => HubScrollMemory.restore());

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => HubScrollMemory.restore());
      } else {
        HubScrollMemory.restore();
      }
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

      const apply = () => window.scrollTo(0, y);
      apply();
      requestAnimationFrame(apply);
      window.addEventListener('load', apply, { once: true });
      setTimeout(apply, 100);
    }
  }

  window.HubScrollMemory = HubScrollMemory;
})();
