/**
 * Replace Material Symbols icon-font spans with local SVG sprite references.
 */
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const XLINK_NS = 'http://www.w3.org/1999/xlink';

  function spriteBase() {
    const pathname = location.pathname || '';
    return pathname.includes('/games/') ? '../../icons/sprite.svg' : 'icons/sprite.svg';
  }

  function iconNameFromEl(el) {
    if (el.dataset && el.dataset.icon) return el.dataset.icon.trim();
    return (el.textContent || '').trim();
  }

  function setIcon(el, name) {
    if (!el || !name) return;
    const base = spriteBase();
    const href = `${base}#${name}`;

    el.classList.remove('material-symbols-outlined', 'filled');
    el.classList.add('arcade-icon');
    el.dataset.icon = name;
    el.textContent = '';

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', href);
    use.setAttributeNS(XLINK_NS, 'xlink:href', href);

    svg.appendChild(use);
    el.appendChild(svg);
  }

  function hydrate(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.material-symbols-outlined').forEach((el) => {
      const name = iconNameFromEl(el);
      if (name) setIcon(el, name);
    });
  }

  function startObserver() {
    if (!('MutationObserver' in window)) return;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches('.material-symbols-outlined')) {
            const name = iconNameFromEl(node);
            if (name) setIcon(node, name);
            return;
          }
          if (node.querySelectorAll) hydrate(node);
        });
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.ArcadeIcons = {
    hydrate,
    setIcon,
    spriteBase,
  };

  function boot() {
    hydrate();
    startObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
