/**
 * Hub bootstrap — stars, previews, scroll memory, service worker.
 */
(function () {
  'use strict';

  class HubBootstrap {
    static registerServiceWorker() {
      if (!('serviceWorker' in navigator)) return;
      const isLocal =
        location.protocol === 'https:' ||
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1';
      if (!isLocal) return;

      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }

    static init() {
      if (window.Starfield) Starfield.init();
      if (window.HubPreviewRegistry) HubPreviewRegistry.init();
      if (window.HubScrollMemory) HubScrollMemory.init();
      HubBootstrap.registerServiceWorker();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => HubBootstrap.init());
  } else {
    HubBootstrap.init();
  }
})();
