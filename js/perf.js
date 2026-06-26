/**
 * Device quality tier for canvas effects (shadows, particles, etc.).
 */
(function () {
  'use strict';

  function detectTier() {
    const cores = navigator.hardwareConcurrency || 2;
    const mem = navigator.deviceMemory || 4;
    const coarse =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;

    if (cores <= 4 && mem <= 4) return 'low';
    if (coarse && cores <= 6) return 'low';
    if (cores <= 6 || mem <= 6) return 'medium';
    return 'high';
  }

  const tier = detectTier();
  const low = tier === 'low';

  function applyShadow(ctx, color, blur) {
    if (!ctx || low) return;
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
  }

  function clearShadow(ctx) {
    if (!ctx) return;
    ctx.shadowBlur = 0;
  }

  window.ArcadePerf = {
    tier,
    shadows: !low,
    reducedEffects: low,
    hubPreviewShadows: !low,
    hubStarCount: low ? 0 : (tier === 'medium' ? 60 : 120),
    hubFrameSkip: low ? 2 : 1,
    applyShadow,
    clearShadow,
  };
})();
