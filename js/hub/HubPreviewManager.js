/**
 * Hub card canvas previews — tier-based FPS, constant timestep (scroll-safe).
 */
(function () {
  'use strict';

  function perf() {
    return window.ArcadePerf || {};
  }

  function previewFps() {
    const fps = perf().hubPreviewFps;
    return typeof fps === 'number' && fps > 0 ? fps : 30;
  }

  function previewDtMs() {
    return 1000 / previewFps();
  }

  function ioRootMargin() {
    return perf().hubIoRootMargin || '120px 0px';
  }

  function animateMinRatio() {
    const min = perf().hubPreviewAnimateMinRatio;
    return typeof min === 'number' && min >= 0 ? min : 0;
  }

  function ioScrollRoot() {
    return document.getElementById('hubRoot') || null;
  }

  class HubPreviewManager {
    constructor() {
      this._entries = [];
      this._targetMap = new Map();
      this._paused = false;
      this._scrollPaused = false;
      this._tabHidden = false;
      this._timerId = 0;
      this._loopActive = false;
      this._lastFrameAt = 0;
      this._observer = null;
      this._observerMargin = '';
      this._scrollResumeTimer = 0;
      this._scrollBound = false;

      window.addEventListener('arcade-hub-visible', () => this.resumeAll());
      window.addEventListener('arcade-preview-layout', () => this.onLayoutChange());

      document.addEventListener('visibilitychange', () => {
        this._tabHidden = document.hidden;
        if (this._tabHidden) {
          this._stopLoop();
        } else if (!this._paused && this._hasActiveEntries()) {
          this._ensureLoop();
        }
      });
    }

    hasIntersectionObserver() {
      return !!this._observer;
    }

    _shouldAnimate(entry) {
      if (!entry.visible || !entry.initialized) return false;
      return entry.intersectionRatio >= animateMinRatio();
    }

    _shouldRun(entry) {
      return (
        !this._paused &&
        !this._scrollPaused &&
        !this._tabHidden &&
        this._shouldAnimate(entry)
      );
    }

    _hasActiveEntries() {
      return this._entries.some((entry) => this._shouldRun(entry));
    }

    _renderableEntries() {
      return this._entries.filter((entry) => this._shouldRun(entry));
    }

    _stopLoop() {
      this._loopActive = false;
      if (this._timerId) {
        clearTimeout(this._timerId);
        this._timerId = 0;
      }
    }

    _ensureLoop() {
      if (this._loopActive || this._tabHidden) return;
      if (!this._hasActiveEntries()) return;
      this._loopActive = true;
      this._lastFrameAt = 0;
      this._timerId = setTimeout(() => this._loop(performance.now()), 0);
    }

    _scheduleNext(delayMs) {
      const dtMs = previewDtMs();
      const wait = typeof delayMs === 'number' ? Math.max(0, delayMs) : dtMs;
      this._timerId = setTimeout(() => this._loop(performance.now()), wait);
    }

    _renderEntry(entry, dtMs, force) {
      if (!force && !this._shouldRun(entry)) return;
      if (!entry.initialized) return;
      try {
        if (entry.instance) {
          entry.instance.render(entry.ctx, dtMs);
        } else if (entry.renderFn) {
          entry.renderFn();
        }
      } catch (_e) {
        // Ignore preview render errors.
      }
    }

    _loop(now) {
      if (!this._loopActive || this._tabHidden) return;

      const dtMs = previewDtMs();
      if (!this._lastFrameAt) this._lastFrameAt = now;
      const elapsed = now - this._lastFrameAt;

      if (elapsed >= dtMs) {
        this._lastFrameAt += dtMs;

        if (!this._paused && !this._scrollPaused && this._hasActiveEntries()) {
          const toRender = this._renderableEntries();
          for (const entry of toRender) {
            this._renderEntry(entry, dtMs);
          }
        }
      }

      if (!this._tabHidden && !this._paused && !this._scrollPaused && this._hasActiveEntries()) {
        const remaining = dtMs - (now - this._lastFrameAt);
        this._scheduleNext(remaining);
      } else {
        this._stopLoop();
      }
    }

    _isInViewport(el) {
      if (!el || !el.getBoundingClientRect) return false;
      const rect = el.getBoundingClientRect();
      const margin = 100;
      const root = ioScrollRoot();
      if (root) {
        const rootRect = root.getBoundingClientRect();
        return (
          rect.bottom >= rootRect.top - margin &&
          rect.top <= rootRect.bottom + margin &&
          rect.right >= rootRect.left - margin &&
          rect.left <= rootRect.right + margin
        );
      }
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const vw = window.innerWidth || document.documentElement.clientWidth;
      return (
        rect.bottom >= -margin &&
        rect.top <= vh + margin &&
        rect.right >= -margin &&
        rect.left <= vw + margin
      );
    }

    _setVisible(entry, visible, intersectionRatio) {
      const wasVisible = entry.visible;
      const wasAnimating = this._shouldAnimate(entry);
      entry.visible = visible;
      entry.intersectionRatio = visible ? (intersectionRatio || 0) : 0;
      const isAnimating = this._shouldAnimate(entry);

      if (visible && !entry.initialized && entry.lazyFactory) {
        this._initLazy(entry);
        return;
      }

      if (visible && entry.initialized && entry.instance) {
        if (!wasVisible) {
          if (typeof entry.instance.resize === 'function') {
            entry.instance.resize();
          }
          this._paintStatic(entry);
        }
        if (isAnimating && !wasAnimating && !this._scrollPaused && !this._paused) {
          this._ensureLoop();
        }
      }
    }

    _paintStatic(entry) {
      if (!entry.initialized || !entry.instance) return;
      this._renderEntry(entry, 0, true);
    }

    _initLazy(entry) {
      if (entry.initialized) return;
      entry.initialized = true;
      if (!entry.lazyFactory) return;

      entry.instance = entry.lazyFactory();

      const finalize = () => {
        if (!entry.instance) return;
        if (typeof entry.instance.resize === 'function') {
          entry.instance.resize();
        }
        if (entry.visible) {
          this._paintStatic(entry);
          if (this._shouldAnimate(entry) && !this._paused && !this._scrollPaused) {
            this._ensureLoop();
          }
        }
      };

      requestAnimationFrame(finalize);
    }

    _warmEntry(entry) {
      if (entry.initialized) return;
      entry.eager = true;
      entry.initialized = true;
      if (!entry.lazyFactory) return;

      entry.instance = entry.lazyFactory();
      if (entry.instance && typeof entry.instance.resize === 'function') {
        entry.instance.resize();
      }
      if (entry.instance) {
        this._renderEntry(entry, 0, true);
      }
    }

    primeInitial() {
      for (const entry of this._entries) {
        if (!entry.initialized && this._isInViewport(entry.observeTarget)) {
          this._warmEntry(entry);
        }
      }
      this.scanVisible();
      if (!this._scrollPaused) {
        this._ensureLoop();
      }
    }

    _destroyObserver() {
      if (!this._observer) return;
      this._observer.disconnect();
      this._observer = null;
      this._observerMargin = '';
    }

    _ensureObserver() {
      const margin = ioRootMargin();
      if (this._observer && this._observerMargin === margin) return;

      this._destroyObserver();
      if (!('IntersectionObserver' in window)) return;

      this._observerMargin = margin;
      this._observer = new IntersectionObserver(
        (ioEntries) => {
          for (const ioEntry of ioEntries) {
            const entry = this._targetMap.get(ioEntry.target);
            if (!entry) continue;
            this._setVisible(entry, ioEntry.isIntersecting, ioEntry.intersectionRatio);
          }
        },
        { root: ioScrollRoot(), rootMargin: margin, threshold: [0, 0.25, 0.5, 0.75] }
      );

      for (const entry of this._entries) {
        if (entry.observeTarget) this._observer.observe(entry.observeTarget);
      }
    }

    _observeTarget(target) {
      if (!target) return;
      this._ensureObserver();
      if (this._observer) this._observer.observe(target);
    }

    _addEntry(canvas, card, observeTarget, options) {
      const ctx = canvas.getContext('2d');
      const target = observeTarget || card;
      const entry = {
        canvas,
        card,
        observeTarget: target,
        ctx,
        visible: false,
        intersectionRatio: 0,
        eager: false,
        initialized: !options.lazy,
        instance: options.instance || null,
        renderFn: options.renderFn || null,
        lazyFactory: options.lazyFactory || null,
      };

      this._entries.push(entry);
      this._targetMap.set(target, entry);
      this._observeTarget(target);

      if (!this._observer) {
        this._setVisible(entry, true, 1);
      }

      return entry;
    }

    scanVisible() {
      for (const entry of this._entries) {
        const inView = this._isInViewport(entry.observeTarget);
        if (inView) {
          if (!entry.visible) {
            this._setVisible(entry, true, entry.intersectionRatio || 0.5);
          } else if (!entry.initialized && entry.lazyFactory) {
            this._initLazy(entry);
          }
        } else if (entry.visible) {
          this._setVisible(entry, false, 0);
        }
      }
    }

    bindScrollPause() {
      if (this._scrollBound) return;
      const scrollRoot = ioScrollRoot();
      if (!scrollRoot) return;
      this._scrollBound = true;

      scrollRoot.addEventListener(
        'scroll',
        () => {
          if (!this._scrollPaused) {
            this._scrollPaused = true;
            this._stopLoop();
          }
          if (this._scrollResumeTimer) clearTimeout(this._scrollResumeTimer);
          this._scrollResumeTimer = setTimeout(() => {
            this._scrollResumeTimer = 0;
            this._scrollPaused = false;
            if (!this._paused && !this._tabHidden) {
              this.resumeAll();
            }
          }, 150);
        },
        { passive: true }
      );
    }

    onLayoutChange() {
      this._destroyObserver();
      for (const entry of this._entries) {
        if (entry.initialized && entry.instance && typeof entry.instance.resize === 'function') {
          entry.instance.resize();
        }
      }
      this._ensureObserver();
      this.scanVisible();
      if (!this._paused && !this._scrollPaused) {
        this._ensureLoop();
      }
    }

    register(canvas, card, renderFn) {
      if (!canvas || !card || typeof renderFn !== 'function') return null;
      const observeTarget = canvas.closest('.game-card') || card;
      const entry = this._addEntry(canvas, card, observeTarget, { renderFn });
      if (!this._observer) entry.visible = true;
      return entry;
    }

    registerLazy(canvasId, PreviewClass) {
      const canvas = document.getElementById(canvasId);
      if (!canvas || !PreviewClass) return null;
      const card = canvas.closest('.card-preview');
      if (!card) return null;
      const observeTarget = canvas.closest('.game-card') || card;

      return this._addEntry(canvas, card, observeTarget, {
        lazy: true,
        lazyFactory: () => new PreviewClass(canvas, card),
      });
    }

    pauseAll() {
      this._paused = true;
      this._stopLoop();
    }

    resumeAll() {
      this._paused = false;
      this.scanVisible();
      const dtMs = previewDtMs();
      for (const entry of this._renderableEntries()) {
        this._renderEntry(entry, dtMs);
      }
      this._ensureLoop();
    }
  }

  window.HubPreviewManager = new HubPreviewManager();
})();
