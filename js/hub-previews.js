/**
 * @deprecated Use js/hub/HubPreviewManager.js — kept for backward compatibility.
 */
(function () {
  if (window.HubPreviewManager) return;
  const s = document.createElement('script');
  s.src = 'js/hub/HubPreviewManager.js';
  document.head.appendChild(s);
})();
