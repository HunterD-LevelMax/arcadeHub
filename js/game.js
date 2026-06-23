/**
 * Common utilities for Arcade Hub games
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

function initGameCommon(canvas, baseWidth, baseHeight, onResize) {  
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

const TARGET_FPS = 60;
const FIXED_DT = 1000 / TARGET_FPS;

function createGameLoop(update, draw) {
  let accumulator = 0;
  let lastTime = 0;
  
  function gameLoop(time) {
    if (!lastTime) lastTime = time;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    accumulator += deltaTime;
    
    while (accumulator >= FIXED_DT) {
      update(FIXED_DT);
      accumulator -= FIXED_DT;
    }
    
    draw();
    requestAnimationFrame(gameLoop);
  }
  
  requestAnimationFrame(gameLoop);
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

/**
 * Haptic feedback via Android WebView bridge (ArcadeAndroid.vibrate).
 * Kinds: tick, light, medium, heavy, success, error
 */
function playSfx(id, opts) {
  if (window.ArcadeAudio && typeof window.ArcadeAudio.play === 'function') {
    window.ArcadeAudio.play(id, opts);
  }
}

function preloadSfx(ids) {
  if (window.ArcadeAudio && typeof window.ArcadeAudio.preload === 'function') {
    window.ArcadeAudio.preload(ids);
  }
}

function unlockAudio() {
  if (window.ArcadeAudio && typeof window.ArcadeAudio.unlock === 'function') {
    window.ArcadeAudio.unlock();
  }
}

function haptic(kind) {
  try {
    if (window.ArcadeAndroid && typeof window.ArcadeAndroid.vibrate === 'function') {
      window.ArcadeAndroid.vibrate(kind || 'light');
    }
  } catch (_e) {}
  if (window.ArcadeAudio && typeof window.ArcadeAudio.playForHaptic === 'function') {
    window.ArcadeAudio.playForHaptic(kind || 'light');
  }
}

function hapticTick() { haptic('tick'); }
function hapticLight() { haptic('light'); }
function hapticMedium() { haptic('medium'); }
function hapticHeavy() { haptic('heavy'); }
function hapticSuccess() { haptic('success'); }
function hapticError() { haptic('error'); }

function beginCoinSession(currentBest, gameId, getScore) {
  if (window.ArcadeEconomy) ArcadeEconomy.beginCoinSession(currentBest, gameId, getScore);
}

function awardAndShowCoins(gameId, score) {
  if (!window.ArcadeEconomy) return null;
  const reward = ArcadeEconomy.awardAndShowCoins(gameId, score);
  if (reward && reward.earned > 0) {
    hapticSuccess();
    playSfx('ui.coin', { volume: 0.55 });
  }
  return reward;
}

function arcadeBack() {
  if (window.parent !== window) {
    try {
      if (window.parent.ArcadeRouter && typeof window.parent.ArcadeRouter.backToHub === "function") {
        window.parent.ArcadeRouter.backToHub();
        return;
      }
    } catch (_e) {}
    try {
      window.parent.postMessage({ type: "arcade-hub-back" }, "*");
    } catch (_e2) {}
    return;
  }
  location.href = "../index.html";
}

function isGamePage() {
  if (/\/games\//i.test(window.location.pathname)) return true;
  if (/\/games\//i.test(window.location.href)) return true;
  return !!document.querySelector(".back-btn");
}

function initGameBackNavigation() {
  if (!isGamePage()) return;

  document.querySelectorAll(".back-btn").forEach((btn) => {
    if (btn.dataset.backBound === "1") return;
    btn.dataset.backBound = "1";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.ArcadeEconomy && typeof ArcadeEconomy.flushCoinSession === "function") {
        ArcadeEconomy.flushCoinSession();
      }
      arcadeBack();
    });
  });
}

function initGameExitEconomy() {
  if (!isGamePage()) return;

  initGameBackNavigation();

  if (!window.ArcadeEconomy || typeof ArcadeEconomy.flushCoinSession !== "function") return;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      ArcadeEconomy.flushCoinSession();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGameExitEconomy);
} else {
  initGameExitEconomy();
}
