/**
 * Device quality tier for canvas effects (shadows, particles, etc.).
 */
(function () {
  'use strict';

  const HUB_PHONE_MAX_WIDTH = 720;

  const PREVIEW_LAYOUT_SETTINGS = {
    phone: {
      hubPreviewFps: 12,
      hubPreviewDprCap: 1,
      hubIoRootMargin: '80px 0px',
      hubPreviewAnimateMinRatio: 0.5,
    },
    tablet: {
      hubPreviewFps: 15,
      hubPreviewDprCap: 1,
      hubIoRootMargin: '120px 0px',
      hubPreviewAnimateMinRatio: 0.25,
    },
    desktop: {
      hubPreviewFps: 30,
      hubPreviewDprCap: 2,
      hubIoRootMargin: '120px 0px',
      hubPreviewAnimateMinRatio: 0,
    },
  };

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

  function hubPreviewLayout() {
    const coarse =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;
    const w = window.innerWidth || document.documentElement.clientWidth || 0;
    if (!coarse) return 'desktop';
    if (w <= HUB_PHONE_MAX_WIDTH) return 'phone';
    return 'tablet';
  }

  function applyPreviewLayout(target) {
    const layout = hubPreviewLayout();
    const settings = PREVIEW_LAYOUT_SETTINGS[layout] || PREVIEW_LAYOUT_SETTINGS.desktop;
    Object.assign(target, settings);
    target.hubPreviewLayout = layout;
    return layout;
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

  const arcadePerf = {
    tier,
    shadows: !low,
    reducedEffects: low,
    hubPreviewShadows: !low,
    hubStarCount: low ? 0 : (medium ? 60 : 120),
    hubFrameSkip: low ? 2 : 1,
    applyShadow,
    clearShadow,
    hubPreviewLayout: 'desktop',
    hubPreviewFps: 30,
    hubPreviewDprCap: 2,
    hubIoRootMargin: '120px 0px',
    hubPreviewAnimateMinRatio: 0,
    refreshPreviewLayout() {
      applyPreviewLayout(arcadePerf);
      window.dispatchEvent(new CustomEvent('arcade-preview-layout', {
        detail: { layout: arcadePerf.hubPreviewLayout },
      }));
      return arcadePerf.hubPreviewLayout;
    },
  };

  applyPreviewLayout(arcadePerf);
  window.ArcadePerf = arcadePerf;
})();
