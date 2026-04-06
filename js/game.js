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

// Cookie utilities
function setCookie(name, value, days = 365) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "expires=" + date.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// High score management - saves to both localStorage and cookies
function getHighScore(gameId) {
  let score = localStorage.getItem(gameId + '_best');
  if (score === null) {
    score = getCookie(gameId + '_best');
    if (score !== null) {
      localStorage.setItem(gameId + '_best', score);
    }
  }
  return parseInt(score || '0');
}

function setHighScore(gameId, score) {
  localStorage.setItem(gameId + '_best', score);
  setCookie(gameId + '_best', score);
}
