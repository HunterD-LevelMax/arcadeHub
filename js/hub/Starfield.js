/**
 * Hub background starfield — CSS mode on low tier, DOM stars otherwise.
 */
(function () {
  'use strict';

  class Starfield {
    static init() {
      const container = document.getElementById('stars');
      if (!container) return;

      const low = window.ArcadePerf && ArcadePerf.tier === 'low';
      if (low) {
        container.classList.add('stars--css');
        return;
      }

      const count = (window.ArcadePerf && ArcadePerf.hubStarCount) || 120;
      for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.cssText = `
          left: ${Math.random() * 100}%;
          top: ${Math.random() * 100}%;
          --dur: ${2 + Math.random() * 4}s;
          --delay: ${Math.random() * 4}s;
          opacity: ${0.1 + Math.random() * 0.4};
          width: ${1 + Math.random() * 2}px;
          height: ${1 + Math.random() * 2}px;
        `;
        container.appendChild(star);
      }
    }
  }

  window.Starfield = Starfield;
})();
