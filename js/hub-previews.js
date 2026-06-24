/**
 * Hub card canvas previews — pause when a game is open or card is off-screen.
 */
(function () {
  'use strict';

  const previews = [];
  let paused = false;
  let observer = null;

  function shouldRun(ctrl) {
    return !paused && ctrl.visible;
  }

  function ensureObserver() {
    if (observer || !('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          previews.forEach((ctrl) => {
            if (ctrl.card === entry.target) {
              ctrl.setVisible(entry.isIntersecting);
            }
          });
        });
      },
      { root: null, rootMargin: '80px 0px', threshold: 0.05 }
    );
  }

  function observeCard(card) {
    if (!card) return;
    ensureObserver();
    if (observer) observer.observe(card);
  }

  function createLoop(canvas, card, renderFn) {
    let rafId = 0;
    let running = false;
    const ctrl = {
      visible: true,
      canvas,
      card,
      start() {
        if (running || !shouldRun(ctrl)) return;
        running = true;
        rafId = requestAnimationFrame(loop);
      },
      stop(clearCanvas) {
        running = false;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
        if (clearCanvas !== false && canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      },
      setVisible(v) {
        ctrl.visible = v;
        if (shouldRun(ctrl)) ctrl.start();
        else ctrl.stop(false);
      },
    };

    function loop() {
      if (!running) return;
      renderFn();
      rafId = requestAnimationFrame(loop);
    }

    previews.push(ctrl);
    if (!paused) ctrl.start();
    return ctrl;
  }

  function pauseAll() {
    paused = true;
    previews.forEach((ctrl) => ctrl.stop());
  }

  function resumeAll() {
    paused = false;
    previews.forEach((ctrl) => {
      if (shouldRun(ctrl)) ctrl.start();
    });
  }

  function register(canvas, card, renderFn) {
    if (!canvas || !card || typeof renderFn !== 'function') return null;
    const ctrl = createLoop(canvas, card, renderFn);
    observeCard(card);
    return ctrl;
  }

  window.HubPreviewManager = {
    register,
    pauseAll,
    resumeAll,
  };

  window.addEventListener('arcade-hub-visible', resumeAll);
})();
