/**
 * @deprecated Use js/hub/ArcadeRouter.js — kept for backward compatibility.
 */
(function () {
  if (window.ArcadeRouter) return;
  const s = document.createElement('script');
  s.src = 'js/hub/ArcadeRouter.js';
  document.head.appendChild(s);
})();
