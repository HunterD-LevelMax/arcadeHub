/**
 * Base class for hub card canvas previews.
 */
(function () {
  'use strict';

  class HubPreviewBase {
    constructor(canvas, card) {
      this.canvas = canvas;
      this.card = card;
      this.ctx = canvas.getContext('2d');
      this.width = 0;
      this.height = 0;
      this.resize();
    }

    resize() {
      if (!this.canvas || !this.card) return;
      const w = this.card.offsetWidth || 320;
      const h = this.card.offsetHeight || 180;
      const dprCap =
        window.ArcadePerf && typeof ArcadePerf.hubPreviewDprCap === 'number'
          ? ArcadePerf.hubPreviewDprCap
          : 1;
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      this.canvas.width = Math.max(1, Math.round(w * dpr));
      this.canvas.height = Math.max(1, Math.round(h * dpr));
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.width = w;
      this.height = h;
    }

    applyShadow(color, blur) {
      if (window.ArcadePerf && ArcadePerf.hubPreviewShadows === false) return;
      if (window.ArcadePerf && typeof ArcadePerf.applyShadow === 'function') {
        ArcadePerf.applyShadow(this.ctx, color, blur);
      } else {
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = blur;
      }
    }

    clearShadow() {
      if (window.ArcadePerf && typeof ArcadePerf.clearShadow === 'function') {
        ArcadePerf.clearShadow(this.ctx);
      } else {
        this.ctx.shadowBlur = 0;
      }
    }

    static get REF_MS() {
      return 1000 / 30;
    }

    dtScale(dtMs) {
      return dtMs / HubPreviewBase.REF_MS;
    }

    /** @param {CanvasRenderingContext2D} ctx @param {number} dtMs */
    render(ctx, dtMs = HubPreviewBase.REF_MS) {
      // Override in subclass.
    }
  }

  window.HubPreviewBase = HubPreviewBase;
})();
