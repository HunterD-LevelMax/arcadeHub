/**
 * Общие утилиты для всех игр ARCADE VAULT
 * Все повторяющиеся функции вынесены сюда
 */

// Масштабирование канваса под экран с учетом безопасных зон UI
function scaleCanvas(canvas, gameWidth, gameHeight) {
  const UI_TOP = 48;
  const UI_BOTTOM = 24;
  const availableHeight = window.innerHeight - UI_TOP - UI_BOTTOM;
  
  const scaleX = window.innerWidth / gameWidth;
  const scaleY = availableHeight / gameHeight;
  const scale = Math.min(scaleX, scaleY);
  
  canvas.style.width = `${gameWidth * scale}px`;
  canvas.style.height = `${gameHeight * scale}px`;
}

// Двойной тап для переключения полноэкранного режима
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

// Вспомогательная функция для отрисовки скругленного прямоугольника
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

// Инициализация общих обработчиков для игры
function initGameCommon(canvas, width, height) {
  scaleCanvas(canvas, width, height);
  window.addEventListener('resize', () => scaleCanvas(canvas, width, height));
  initFullscreenDoubleTap(canvas);
}
