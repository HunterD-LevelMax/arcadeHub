/**
 * Device quality tier for canvas effects (shadows, particles, etc.).
 */
(function () {
  'use strict';

  function detectTier() {
    const coarse =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;

    if (coarse) return 'low';

    const cores = navigator.hardwareConcurrency || 2;
    const mem = navigator.deviceMemory || 4;

    if (cores <= 4 && mem <= 4) return 'low';
    if (cores <= 6 || mem <= 6) return 'medium';
    return 'high';
  }

  const tier = detectTier();
  const low = tier === 'low';
  const medium = tier === 'medium';

  function applyShadow(ctx, color, blur) {
    if (!ctx || low) return;
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
  }

  function clearShadow(ctx) {
    if (!ctx) return;
    ctx.shadowBlur = 0;
  }

  if (document.documentElement) {
    document.documentElement.classList.add('perf-' + tier);
  }

  window.ArcadePerf = {
    tier,
    shadows: !low,
    reducedEffects: low,
    hubPreviewShadows: !low,
    hubStarCount: low ? 0 : (medium ? 60 : 120),
    hubFrameSkip: low ? 2 : 1,
    hubPreviewFps: low ? 6 : (medium ? 24 : 30),
    hubPreviewMaxConcurrent: low ? 1 : (medium ? 2 : 99),
    hubIoRootMargin: low ? '0px' : '120px 0px',
    applyShadow,
    clearShadow,
  };
})();
