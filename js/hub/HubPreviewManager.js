/**
 * Hub card canvas previews — fixed 30 FPS, constant timestep (scroll-safe).
 */
(function () {
  'use strict';

  const PREVIEW_FPS = 30;
  const PREVIEW_DT_MS = 1000 / PREVIEW_FPS;

  class HubPreviewManager {
    constructor() {
      this._entries = [];
      this._paused = false;
      this._rafId = 0;
      this._loopActive = false;
      this._lastFrameAt = 0;
      this._observer = null;

      window.addEventListener('arcade-hub-visible', () => this.resumeAll());
    }

    _shouldRun(entry) {
      return !this._paused && entry.visible && entry.initialized;
    }

    _hasActiveEntries() {
      return this._entries.some((entry) => this._shouldRun(entry));
    }

    _ensureLoop() {
      if (this._loopActive) return;
      this._loopActive = true;
      this._lastFrameAt = 0;
      this._rafId = requestAnimationFrame((t) => this._loop(t));
    }

    _scheduleNext() {
      this._rafId = requestAnimationFrame((t) => this._loop(t));
    }

    _renderEntry(entry, dtMs) {
      if (!this._shouldRun(entry)) return;
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
      if (!this._loopActive) return;

      if (!this._lastFrameAt) this._lastFrameAt = now;
      const elapsed = now - this._lastFrameAt;

      if (elapsed >= PREVIEW_DT_MS) {
        this._lastFrameAt = now;

        if (!this._paused && this._hasActiveEntries()) {
          for (const entry of this._entries) {
            this._renderEntry(entry, PREVIEW_DT_MS);
          }
        }
      }

      if (this._paused || this._hasActiveEntries()) {
        this._scheduleNext();
      } else {
        this._loopActive = false;
        this._rafId = 0;
      }
    }

    _isInViewport(el) {
      if (!el || !el.getBoundingClientRect) return false;
      const rect = el.getBoundingClientRect();
      const margin = 100;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const vw = window.innerWidth || document.documentElement.clientWidth;
      return (
        rect.bottom >= -margin &&
        rect.top <= vh + margin &&
        rect.right >= -margin &&
        rect.left <= vw + margin
      );
    }

    _setVisible(entry, visible) {
      entry.visible = visible;
      if (visible && !entry.initialized && entry.lazyFactory) {
        this._initLazy(entry);
      } else if (visible && entry.initialized && entry.instance) {
        if (typeof entry.instance.resize === 'function') {
          entry.instance.resize();
        }
        this._renderEntry(entry, PREVIEW_DT_MS);
        this._ensureLoop();
      }
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
        if (entry.visible && !this._paused) {
          this._renderEntry(entry, PREVIEW_DT_MS);
          this._ensureLoop();
        }
      };

      requestAnimationFrame(() => {
        finalize();
        requestAnimationFrame(finalize);
      });
    }

    _ensureObserver() {
      if (this._observer || !('IntersectionObserver' in window)) return;
      this._observer = new IntersectionObserver(
        (ioEntries) => {
          ioEntries.forEach((ioEntry) => {
            this._entries.forEach((entry) => {
              if (entry.observeTarget !== ioEntry.target) return;
              this._setVisible(entry, ioEntry.isIntersecting);
            });
          });
        },
        { root: null, rootMargin: '120px 0px', threshold: 0.01 }
      );
    }

    _observeTarget(target) {
      if (!target) return;
      this._ensureObserver();
      if (this._observer) this._observer.observe(target);
    }

    _addEntry(canvas, card, observeTarget, options) {
      const ctx = canvas.getContext('2d');
      const entry = {
        canvas,
        card,
        observeTarget: observeTarget || card,
        ctx,
        visible: false,
        initialized: !options.lazy,
        instance: options.instance || null,
        renderFn: options.renderFn || null,
        lazyFactory: options.lazyFactory || null,
      };

      this._entries.push(entry);
      this._observeTarget(entry.observeTarget);

      if (!this._observer) {
        this._setVisible(entry, true);
      }

      this._ensureLoop();
      return entry;
    }

    scanVisible() {
      for (const entry of this._entries) {
        if (this._isInViewport(entry.observeTarget)) {
          this._setVisible(entry, true);
        }
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
    }

    resumeAll() {
      this._paused = false;
      this.scanVisible();
      for (const entry of this._entries) {
        if (entry.visible && entry.initialized) {
          this._renderEntry(entry, PREVIEW_DT_MS);
        }
      }
      this._ensureLoop();
    }
  }

  window.HubPreviewManager = new HubPreviewManager();
})();
