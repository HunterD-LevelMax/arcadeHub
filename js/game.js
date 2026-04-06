/**
 * Common utilities for ARCADE VAULT games
 */

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function initFullscreenDoubleTap(canvas) {
  let lastTap = 0;
  canvas.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
    lastTap = now;
  });
}

function initGameCommon(canvas, baseWidth, baseHeight, onResize) {
  initFullscreenDoubleTap(canvas);
  
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    if (onResize) onResize();
  }
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}
