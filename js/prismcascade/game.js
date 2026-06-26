(function () {
  const C = window.PrismCascadeConstants;
  const L = window.PrismCascadeLevels;
  const Render = window.PrismCascadeRender;

  if (!C || !L) {
    throw new Error('PrismCascadeGame requires PrismCascadeConstants and PrismCascadeLevels.');
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function cellKey(r, c) {
    return r + ',' + c;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeOutBack(t) {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  }

  class PrismCascadeFallbackRenderer {
    constructor(game) {
      this.game = game;
      this.ctx = game.ctx;
      this.gemGradCache = new Map();
      this.PERF_SHADOWS = !window.ArcadePerf || window.ArcadePerf.shadows !== false;
      this.PERF_REDUCED = !!(window.ArcadePerf && window.ArcadePerf.reducedEffects);
    }

    traceGemPath(def, x, y, s) {
      const ctx = this.ctx;
      if (def.shape === 'circle') {
        ctx.arc(x, y, s * 0.38, 0, Math.PI * 2);
      } else if (def.shape === 'diamond') {
        ctx.moveTo(x, y - s * 0.42);
        ctx.lineTo(x + s * 0.34, y);
        ctx.lineTo(x, y + s * 0.42);
        ctx.lineTo(x - s * 0.34, y);
        ctx.closePath();
      } else if (def.shape === 'triangle') {
        ctx.moveTo(x, y - s * 0.4);
        ctx.lineTo(x + s * 0.36, y + s * 0.28);
        ctx.lineTo(x - s * 0.36, y + s * 0.28);
        ctx.closePath();
      } else if (def.shape === 'hex') {
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          const px = x + Math.cos(a) * s * 0.36;
          const py = y + Math.sin(a) * s * 0.36;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else if (def.shape === 'star') {
        for (let i = 0; i < 10; i++) {
          const a = (Math.PI / 5) * i - Math.PI / 2;
          const rad = i % 2 ? s * 0.16 : s * 0.38;
          const px = x + Math.cos(a) * rad;
          const py = y + Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        const hs = s * 0.32;
        roundRect(ctx, x - hs, y - hs, hs * 2, hs * 2, 6);
      }
    }

    getGemGradient(def, s) {
      const ctx = this.ctx;
      const bucket = Math.max(8, Math.round(s / 4) * 4);
      const key = def.color + ':' + bucket;
      let grad = this.gemGradCache.get(key);
      if (!grad) {
        grad = ctx.createRadialGradient(
          -bucket * 0.12, -bucket * 0.14, bucket * 0.05,
          0, 0, bucket * 0.42
        );
        grad.addColorStop(0, def.rim);
        grad.addColorStop(0.35, def.color);
        grad.addColorStop(1, def.core);
        this.gemGradCache.set(key, grad);
      }
      return grad;
    }

    drawGemShape(def, x, y, size, alpha, scale) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      const s = size * (scale || 1);

      ctx.fillStyle = def.pad;
      ctx.beginPath();
      ctx.arc(x, y, s * 0.46, 0, Math.PI * 2);
      ctx.fill();

      if (this.PERF_SHADOWS) {
        ctx.shadowColor = def.color;
        ctx.shadowBlur = 18;
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      this.traceGemPath(def, 0, 0, s);
      ctx.fillStyle = this.getGemGradient(def, s);
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      this.traceGemPath(def, x, y, s);
      ctx.stroke();

      ctx.strokeStyle = def.rim;
      ctx.lineWidth = 2;
      ctx.beginPath();
      this.traceGemPath(def, x, y, s);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(x - s * 0.1, y - s * 0.14, s * 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    drawSpecialOverlay(special, x, y, size, alpha, now) {
      const ctx = this.ctx;
      const S = C.SPECIAL;
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      const s = size;
      const pulse = 1 + 0.06 * Math.sin(now * 0.008);

      if (special === S.NOVA) {
        ctx.strokeStyle = '#ff4466';
        ctx.lineWidth = 2.5;
        if (this.PERF_SHADOWS) {
          ctx.shadowColor = '#ff2244';
          ctx.shadowBlur = 16;
        }
        ctx.beginPath();
        ctx.arc(x, y, s * 0.22 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, s * 0.38 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      } else if (special === S.BEAM_H) {
        ctx.strokeStyle = '#00f5ff';
        ctx.lineWidth = 3;
        if (this.PERF_SHADOWS) {
          ctx.shadowColor = '#00f5ff';
          ctx.shadowBlur = 14;
        }
        ctx.beginPath();
        ctx.moveTo(x - s * 0.42, y);
        ctx.lineTo(x + s * 0.42, y);
        ctx.stroke();
      } else if (special === S.BEAM_V) {
        ctx.strokeStyle = '#00f5ff';
        ctx.lineWidth = 3;
        if (this.PERF_SHADOWS) {
          ctx.shadowColor = '#00f5ff';
          ctx.shadowBlur = 14;
        }
        ctx.beginPath();
        ctx.moveTo(x, y - s * 0.42);
        ctx.lineTo(x, y + s * 0.42);
        ctx.stroke();
      } else if (special === S.PRISM) {
        const hue = (now * 0.12) % 360;
        ctx.strokeStyle = 'hsl(' + hue + ', 100%, 70%)';
        ctx.lineWidth = 2.5;
        if (this.PERF_SHADOWS) {
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 18;
        }
        ctx.beginPath();
        ctx.arc(x, y, s * 0.4 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      } else if (special === S.CROSS) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2.5;
        if (this.PERF_SHADOWS) {
          ctx.shadowColor = '#ffff00';
          ctx.shadowBlur = 16;
        }
        ctx.beginPath();
        ctx.moveTo(x - s * 0.36, y);
        ctx.lineTo(x + s * 0.36, y);
        ctx.moveTo(x, y - s * 0.36);
        ctx.lineTo(x, y + s * 0.36);
        ctx.stroke();
      } else if (special === S.CHRONO) {
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 2;
        if (this.PERF_SHADOWS) {
          ctx.shadowColor = '#39ff14';
          ctx.shadowBlur = 14;
        }
        ctx.beginPath();
        ctx.arc(x, y, s * 0.28 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.restore();
    }

    drawIce(x, y, size, alpha, hp) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = (alpha == null ? 1 : alpha) * (hp >= 2 ? 0.62 : 0.42);
      const half = size * 0.46;
      const grad = ctx.createLinearGradient(x - half, y - half, x + half, y + half);
      grad.addColorStop(0, 'rgba(220, 250, 255, 0.9)');
      grad.addColorStop(0.5, 'rgba(150, 220, 255, 0.55)');
      grad.addColorStop(1, 'rgba(190, 240, 255, 0.85)');
      ctx.fillStyle = grad;
      roundRect(ctx, x - half, y - half, half * 2, half * 2, 6);
      ctx.fill();
      ctx.restore();
    }

    drawCrate(x, y, size, hp) {
      const ctx = this.ctx;
      ctx.save();
      const half = size * 0.42;
      ctx.fillStyle = '#5a3d22';
      roundRect(ctx, x - half, y - half, half * 2, half * 2, 5);
      ctx.fill();
      const grad = ctx.createLinearGradient(x - half, y - half, x + half, y + half);
      grad.addColorStop(0, '#a9763f');
      grad.addColorStop(0.5, '#d9a066');
      grad.addColorStop(1, '#8a5c30');
      ctx.fillStyle = grad;
      roundRect(ctx, x - half * 0.88, y - half * 0.88, half * 1.76, half * 1.76, 4);
      ctx.fill();
      if (hp <= 1) {
        ctx.strokeStyle = 'rgba(20, 10, 4, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - half * 0.4, y - half * 0.6);
        ctx.lineTo(x - half * 0.1, y);
        ctx.lineTo(x - half * 0.3, y + half * 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawBoard(now) {
      const g = this.game;
      const ctx = this.ctx;
      const m = g.gridMetrics;
      if (!m) return;

      const border = m.border != null ? m.border : 6;
      const inset = m.cellInset != null ? m.cellInset : 4;
      const gemRatio = m.gemSizeRatio != null ? m.gemSizeRatio : C.GEM_SIZE_RATIO;

      ctx.fillStyle = 'rgba(10, 2, 18, 0.85)';
      roundRect(ctx, m.offsetX - border, m.offsetY - border, m.size + border * 2, m.size + border * 2, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(170, 0, 255, 0.45)';
      ctx.lineWidth = 2;
      roundRect(ctx, m.offsetX - border, m.offsetY - border, m.size + border * 2, m.size + border * 2, 10);
      ctx.stroke();

      for (let r = 0; r < C.GRID_SIZE; r++) {
        for (let c = 0; c < C.GRID_SIZE; c++) {
          const x = m.offsetX + c * m.cellSize;
          const y = m.offsetY + r * m.cellSize;
          const w = m.cellSize - inset * 2;
          const h = m.cellSize - inset * 2;
          ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(14, 4, 24, 0.95)' : 'rgba(22, 6, 36, 0.92)';
          roundRect(ctx, x + inset, y + inset, w, h, 7);
          ctx.fill();
          if (!this.PERF_REDUCED) {
            ctx.strokeStyle = 'rgba(170, 0, 255, 0.22)';
            ctx.lineWidth = 1;
            roundRect(ctx, x + inset, y + inset, w, h, 7);
            ctx.stroke();
          }
        }
      }

      const clearSet = g.anim && g.anim.type === 'clear' ? g.anim.clearSet : null;
      const animDur = g.anim ? g.anim.duration : 1;
      const clearT = g.anim && g.anim.type === 'clear' ? easeOutCubic(Math.min(1, (now - g.anim.start) / animDur)) : 0;
      const swapT = g.anim && g.anim.type === 'swap' ? easeOutCubic(Math.min(1, (now - g.anim.start) / animDur)) : 0;
      const fallT = g.anim && g.anim.type === 'fall' ? easeOutCubic(Math.min(1, (now - g.anim.start) / animDur)) : 0;

      for (let r = 0; r < C.GRID_SIZE; r++) {
        for (let c = 0; c < C.GRID_SIZE; c++) {
          const type = g.grid[r][c];
          if (type < 0) {
            const blk = g.blockGrid[r][c];
            if (blk && blk.type === 'crate') {
              const cx = m.offsetX + c * m.cellSize + m.cellSize / 2;
              const cy = m.offsetY + r * m.cellSize + m.cellSize / 2;
              this.drawCrate(cx, cy, m.cellSize * gemRatio, blk.hp);
            }
            continue;
          }

          let drawR = r;
          let drawC = c;
          let alpha = 1;
          let scale = 1;

          if (g.anim && g.anim.type === 'swap') {
            const a = g.anim;
            if (r === a.r1 && c === a.c1) {
              if (a.reverse) {
                drawR = a.r2 + (a.r1 - a.r2) * swapT;
                drawC = a.c2 + (a.c1 - a.c2) * swapT;
              } else {
                drawR = r + (a.r2 - a.r1) * swapT;
                drawC = c + (a.c2 - a.c1) * swapT;
              }
            } else if (r === a.r2 && c === a.c2) {
              if (a.reverse) {
                drawR = a.r1 + (a.r2 - a.r1) * swapT;
                drawC = a.c1 + (a.c2 - a.c1) * swapT;
              } else {
                drawR = r + (a.r1 - a.r2) * swapT;
                drawC = c + (a.c1 - a.c2) * swapT;
              }
            }
          }

          if (g.anim && g.anim.type === 'fall') {
            const fall = g.anim.falls.find((f) => f.toR === r && f.c === c);
            if (fall) {
              const fromR = fall.fromR < 0 ? -1.2 : fall.fromR;
              drawR = fromR + (fall.toR - fromR) * fallT;
            }
          }

          if (clearSet && clearSet.has(cellKey(r, c))) {
            alpha = 1 - clearT;
            scale = 1 + clearT * 0.35;
          }

          if (g.selectedCell && g.selectedCell.r === r && g.selectedCell.c === c && g.boardState === 'idle') {
            scale *= g.getSelectionScale(now);
          }
          if (g.pressedCell && g.pressedCell.r === r && g.pressedCell.c === c && g.boardState === 'idle') {
            scale *= g.getPressScale(now);
          }

          const x = m.offsetX + drawC * m.cellSize + m.cellSize / 2;
          const y = m.offsetY + drawR * m.cellSize + m.cellSize / 2;
          const size = m.cellSize * gemRatio;
          this.drawGemShape(C.GEM_DEFS[type], x, y, size, alpha, scale);

          const special = g.specialGrid[r][c];
          if (special && alpha > 0.05) {
            this.drawSpecialOverlay(special, x, y, size * scale, alpha, now);
          }

          const blk = g.blockGrid[r][c];
          if (blk && blk.type === 'ice' && alpha > 0.05) {
            this.drawIce(x, y, size * scale, alpha, blk.hp);
          }
        }
      }

      if (g.hintCells && g.boardState === 'idle' && g.gameState.state === 'playing') {
        const hintAlpha = 0.4 + 0.4 * Math.sin(now * 0.006);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,' + hintAlpha + ')';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 16;
        g.hintCells.forEach((hc) => {
          const x = m.offsetX + hc.c * m.cellSize + inset;
          const y = m.offsetY + hc.r * m.cellSize + inset;
          roundRect(ctx, x, y, m.cellSize - inset * 2, m.cellSize - inset * 2, 8);
          ctx.stroke();
        });
        ctx.restore();
      }
    }

    drawParticles() {
      const ctx = this.ctx;
      const particles = this.game.particles;
      particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    drawFloatTexts() {
      const ctx = this.ctx;
      const floatTexts = this.game.floatTexts;
      floatTexts.forEach((f) => {
        ctx.save();
        ctx.globalAlpha = f.life;
        ctx.font = "bold 22px 'Orbitron', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillStyle = f.color;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 14;
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      });
    }
  }

  class PrismCascadeGame {
    constructor(options) {
      options = options || {};
      this.canvas = options.canvas;
      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
      this.ui = this.resolveUI(options.ui || {});

      this.grid = [];
      this.specialGrid = [];
      this.blockGrid = [];
      this.gridMetrics = null;
      this.renderer = this.createRenderer();

      this.boardState = 'idle';
      this.anim = null;
      this.particles = [];
      this.floatTexts = [];
      this.screenShake = 0;

      this.selectedCell = null;
      this.selectedAt = 0;
      this.pressedCell = null;
      this.pressedAt = 0;
      this.pointerDown = null;
      this.dragHandled = false;

      this.timeLeft = C.GAME_TIME;
      this.timerInterval = null;
      this.elapsed = 0;
      this.moveCount = 0;
      this.currentTier = 0;

      this.charges = { bomb: 0, hammer: 0 };
      this.activeTool = null;
      this.shuffleCooldown = 0;
      this.objective = null;
      this.hintCells = null;
      this.hintPending = false;

      this.slowmoUntil = 0;
      this.reshuffleFlash = 0;
      this.lastSwapCell = null;
      this.lastActionAt = 0;

      this.progress = L.loadProgress();
      this.levelConfig = null;
      this.levelId = null;
      this.mode = 'campaign';
      this.goalProgress = [];

      this.movesLeft = 0;
      this.initialMoves = 0;
      this.initialTime = C.GAME_TIME;
      this.totalCascades = 0;
      this.iceBroken = 0;
      this.cratesDestroyed = 0;

      this.gameState = {
        score: 0,
        best: typeof getHighScore === 'function' ? getHighScore(C.GAME_ID) : 0,
        infiniteBest: this.progress.infiniteBest || 0,
        state: 'levelSelect',
      };

      this.loop = null;
      this._drawPhase = 0;

      if (this.canvas && typeof initGameCommon === 'function') {
        initGameCommon(this.canvas, C.BASE_W, C.BASE_H, () => this.resize());
      }

      if (typeof preloadSfx === 'function') {
        preloadSfx([
          'prismcascade.match',
          'prismcascade.cascade',
          'prismcascade.bomb',
          'prismcascade.gameover',
          'prismcascade.swap',
          'prismcascade.hammer',
          'prismcascade.shuffle',
        ]);
      }
    }

    resolveUI(ui) {
      const q = (id) => document.getElementById(id);
      return Object.assign({
        score: q('scoreVal'),
        timer: q('timerVal'),
        finalScore: q('finalScore'),
        bestScore: q('bestScore'),
        tierDisplay: q('tierDisplay'),
        objectiveBar: q('objectiveBar'),
        objectiveSwatch: q('objectiveSwatch'),
        objectiveProgress: q('objectiveProgress'),
        abilityBar: q('abilityBar'),
        abilityBomb: q('abilityBomb'),
        abilityHammer: q('abilityHammer'),
        abilityShuffle: q('abilityShuffle'),
        bombCharge: q('bombCharge'),
        hammerCharge: q('hammerCharge'),

        levelSelect: q('levelSelectOverlay') || q('levelSelect'),
        levelGrid: q('levelGrid'),
        introOverlay: q('introOverlay') || q('startOverlay'),
        introTitle: q('introTitle'),
        introSub: q('introSub'),
        introStartBtn: q('introStartBtn') || q('startBtn'),
        winOverlay: q('winOverlay'),
        winTitle: q('winTitle'),
        winScore: q('winScore'),
        winStars: q('winStars'),
        winNextBtn: q('winNextBtn'),
        winRetryBtn: q('winRetryBtn'),
        winMenuBtn: q('winMenuBtn'),
        gameoverOverlay: q('gameoverOverlay'),
        gameoverTitle: q('gameoverTitle'),
        gameoverSub: q('gameoverSub'),
        gameoverRetryBtn: q('gameoverRetryBtn') || q('restartBtn'),

        goalList: q('goalList'),
        goalBar: q('goalBar'),
        movesDisplay: q('movesVal'),
        modeLabel: q('modeLabel'),
      }, ui || {});
    }

    createRenderer() {
      if (Render) {
        if (typeof Render.PrismCascadeRenderer === 'function') {
          return new Render.PrismCascadeRenderer(this.canvas, this);
        }
        if (typeof Render.createRenderer === 'function') {
          return Render.createRenderer(this);
        }
        if (typeof Render === 'function') {
          return new Render(this);
        }
      }
      return new PrismCascadeFallbackRenderer(this);
    }

    W() { return this.canvas ? this.canvas.width : C.BASE_W; }
    H() { return this.canvas ? this.canvas.height : C.BASE_H; }

    resize() {
      this.gridMetrics = this.computeGridMetrics();
      if (this.renderer && typeof this.renderer.invalidateCellSlots === 'function') {
        this.renderer.invalidateCellSlots();
      }
    }

    _syncRenderLoop() {
      if (!this.loop) return;
      if (this.gameState.state === 'levelSelect') {
        if (typeof this.loop.pause === 'function') this.loop.pause();
      } else if (typeof this.loop.resume === 'function') {
        this.loop.resume();
      }
    }

    _shouldSkipDrawFrame() {
      if (!window.ArcadePerf || !window.ArcadePerf.reducedEffects) return false;
      if (this.anim || this.particles.length > 0 || this.floatTexts.length > 0 || this.screenShake > 0) {
        return false;
      }
      this._drawPhase = (this._drawPhase + 1) % 2;
      return this._drawPhase === 1;
    }

    _scaledParticleCount(count) {
      const perf = window.ArcadePerf;
      if (perf && perf.reducedEffects) return Math.max(3, Math.round(count * 0.35));
      if (perf && perf.tier === 'medium') return Math.max(4, Math.round(count * 0.65));
      return count;
    }

    computeGridMetrics() {
      const mobile =
        typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
      const pad = mobile ? 4 : 11;
      const border = mobile ? 3 : 6;
      const cellInset = mobile ? 2 : 4;
      const gemSizeRatio = mobile ? 0.9 : C.GEM_SIZE_RATIO;
      const size = Math.min(this.W() - pad * 2, this.H() - pad * 2);
      const cellSize = size / C.GRID_SIZE;
      return {
        cellSize,
        offsetX: (this.W() - size) / 2,
        offsetY: (this.H() - size) / 2,
        size,
        border,
        cellInset,
        gemSizeRatio,
      };
    }

    getDragThreshold() {
      return this.gridMetrics ? this.gridMetrics.cellSize * 0.28 : 15;
    }

    isAdjacent(a, b) {
      return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
    }

    getSelectionScale(now) {
      if (!this.selectedAt) return 1;
      const elapsed = now - this.selectedAt;
      if (elapsed > C.SELECT_PULSE_MS) return 1;
      const pulseT = Math.min(1, elapsed / 120);
      return 1 + 0.15 * (1 - elapsed / C.SELECT_PULSE_MS) * easeOutBack(pulseT);
    }

    getPressScale(now) {
      if (!this.pressedAt) return 1;
      const elapsed = now - this.pressedAt;
      if (elapsed > C.PRESS_PULSE_MS) return 1;
      return 1 + 0.12 * easeOutBack(elapsed / C.PRESS_PULSE_MS);
    }

    cellCenter(r, c) {
      const m = this.gridMetrics;
      const ratio = m.gemSizeRatio != null ? m.gemSizeRatio : C.GEM_SIZE_RATIO;
      return {
        x: m.offsetX + c * m.cellSize + m.cellSize / 2,
        y: m.offsetY + r * m.cellSize + m.cellSize / 2,
        size: m.cellSize * ratio,
      };
    }

    getCellFromPointer(e) {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      const m = this.gridMetrics;
      const c = Math.floor((x - m.offsetX) / m.cellSize);
      const r = Math.floor((y - m.offsetY) / m.cellSize);
      if (r < 0 || r >= C.GRID_SIZE || c < 0 || c >= C.GRID_SIZE) return null;
      return { r, c };
    }

    randomGemType() {
      return Math.floor(Math.random() * C.GEM_TYPES);
    }

    randomGemAvoidingMatch(board, r, c) {
      const forbidden = new Set();
      if (c >= 2 && board[r][c - 1] >= 0 && board[r][c - 1] === board[r][c - 2]) forbidden.add(board[r][c - 1]);
      if (r >= 2 && board[r - 1][c] >= 0 && board[r - 1][c] === board[r - 2][c]) forbidden.add(board[r - 1][c]);
      let type = 0;
      let guard = 0;
      do {
        type = this.randomGemType();
        guard++;
      } while (forbidden.has(type) && guard < 20);
      return type;
    }

    createEmptyBoard() {
      return Array.from({ length: C.GRID_SIZE }, () => Array(C.GRID_SIZE).fill(0));
    }

    createEmptySpecialGrid() {
      return Array.from({ length: C.GRID_SIZE }, () => Array(C.GRID_SIZE).fill(null));
    }

    createEmptyBlockGrid() {
      return Array.from({ length: C.GRID_SIZE }, () => Array(C.GRID_SIZE).fill(null));
    }

    isSolidCell(r, c) {
      return this.grid[r][c] >= 0 || (this.blockGrid[r][c] && this.blockGrid[r][c].type === 'crate');
    }

    isMovable(r, c) {
      return this.grid[r][c] >= 0 && !(this.blockGrid[r][c] && this.blockGrid[r][c].type === 'ice');
    }

    swapCells(board, r1, c1, r2, c2) {
      const t = board[r1][c1];
      board[r1][c1] = board[r2][c2];
      board[r2][c2] = t;
    }

    swapCellsBoth(r1, c1, r2, c2) {
      this.swapCells(this.grid, r1, c1, r2, c2);
      const s = this.specialGrid[r1][c1];
      this.specialGrid[r1][c1] = this.specialGrid[r2][c2];
      this.specialGrid[r2][c2] = s;
      const b = this.blockGrid[r1][c1];
      this.blockGrid[r1][c1] = this.blockGrid[r2][c2];
      this.blockGrid[r2][c2] = b;
    }

    addToClearSet(clearSet, r, c) {
      if (r >= 0 && r < C.GRID_SIZE && c >= 0 && c < C.GRID_SIZE && this.grid[r][c] >= 0) {
        clearSet.add(cellKey(r, c));
      }
    }

    addRadius(clearSet, r, c, radius) {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          this.addToClearSet(clearSet, r + dr, c + dc);
        }
      }
    }

    addRow(clearSet, r) {
      for (let c = 0; c < C.GRID_SIZE; c++) this.addToClearSet(clearSet, r, c);
    }

    addCol(clearSet, c) {
      for (let r = 0; r < C.GRID_SIZE; r++) this.addToClearSet(clearSet, r, c);
    }

    addColor(clearSet, color) {
      for (let r = 0; r < C.GRID_SIZE; r++) {
        for (let c = 0; c < C.GRID_SIZE; c++) {
          if (this.grid[r][c] === color) this.addToClearSet(clearSet, r, c);
        }
      }
    }

    triggerShake(intensity) {
      this.screenShake = Math.max(this.screenShake, intensity);
      const host = this.ui.gameContainer || (this.canvas && this.canvas.parentElement);
      if (!host) return;
      host.classList.remove('board-shake');
      void host.offsetWidth;
      host.classList.add('board-shake');
    }

    applySingleExplosion(clearSet, r, c, special, partnerColor) {
      const S = C.SPECIAL;
      switch (special) {
        case S.NOVA: this.addRadius(clearSet, r, c, C.BONUS_CONFIG.novaRadius); break;
        case S.BEAM_H: this.addRow(clearSet, r); break;
        case S.BEAM_V: this.addCol(clearSet, c); break;
        case S.PRISM: this.addColor(clearSet, partnerColor != null ? partnerColor : this.grid[r][c]); break;
        case S.CROSS: this.addRow(clearSet, r); this.addCol(clearSet, c); break;
        case S.CHRONO:
          this.addToClearSet(clearSet, r, c);
          this.addTime(C.BONUS_CONFIG.chronoTimeBonus);
          break;
        default: this.addToClearSet(clearSet, r, c);
      }
    }

    applySpecialCombo(clearSet, r1, c1, s1, r2, c2, s2) {
      const S = C.SPECIAL;
      if (s1 === S.CHRONO || s2 === S.CHRONO) {
        const other = s1 === S.CHRONO ? s2 : s1;
        const or1 = s1 === S.CHRONO ? r2 : r1;
        const oc1 = s1 === S.CHRONO ? c2 : c1;
        const or2 = s1 === S.CHRONO ? r1 : r2;
        const oc2 = s1 === S.CHRONO ? c1 : c2;
        this.applySingleExplosion(clearSet, or1, oc1, other);
        this.applySingleExplosion(clearSet, or2, oc2, other);
        this.addTime(C.BONUS_CONFIG.chronoTimeBonus * 2);
        this.addFloatText(this.W() / 2, this.H() * 0.32, 'CHRONO BLAST!', '#39ff14');
        this.triggerShake(1.2);
        return [s1, s2];
      }
      if (s1 === S.PRISM && s2 === S.PRISM) {
        for (let r = 0; r < C.GRID_SIZE; r++) {
          for (let c = 0; c < C.GRID_SIZE; c++) {
            if (this.grid[r][c] >= 0 && !this.specialGrid[r][c]) this.addToClearSet(clearSet, r, c);
          }
        }
        this.addFloatText(this.W() / 2, this.H() * 0.32, 'PRISM SURGE!', '#ffffff');
        this.triggerShake(1.5);
        return [s1, s2];
      }
      if (s1 === S.NOVA && s2 === S.NOVA) {
        const mr = Math.round((r1 + r2) / 2);
        const mc = Math.round((c1 + c2) / 2);
        this.addRadius(clearSet, mr, mc, C.BONUS_CONFIG.megaNovaRadius);
        this.addFloatText(this.W() / 2, this.H() * 0.32, 'MEGA NOVA!', '#ff4466');
        this.triggerShake(1.3);
        return [s1, s2];
      }
      if ((s1 === S.BEAM_H || s1 === S.BEAM_V) && (s2 === S.BEAM_H || s2 === S.BEAM_V)) {
        this.addRow(clearSet, r1); this.addRow(clearSet, r2); this.addCol(clearSet, c1); this.addCol(clearSet, c2);
        this.addFloatText(this.W() / 2, this.H() * 0.32, 'CROSS BEAM!', '#00f5ff');
        this.triggerShake(1.1);
        return [s1, s2];
      }
      if (s1 === S.PRISM || s2 === S.PRISM) {
        const pr = s1 === S.PRISM ? r1 : r2;
        const pc = s1 === S.PRISM ? c1 : c2;
        const color = this.grid[pr][pc];
        this.addColor(clearSet, color);
        const or = s1 === S.PRISM ? r2 : r1;
        const oc = s1 === S.PRISM ? c2 : c1;
        const other = s1 === S.PRISM ? s2 : s1;
        this.applySingleExplosion(clearSet, or, oc, other);
        this.addFloatText(this.W() / 2, this.H() * 0.32, 'PRISM COMBO!', '#ffffff');
        this.triggerShake(1.2);
        return [s1, s2];
      }
      this.applySingleExplosion(clearSet, r1, c1, s1);
      this.applySingleExplosion(clearSet, r2, c2, s2);
      this.triggerShake(0.8);
      return [s1, s2];
    }

    processSpecialExplosions(clearSet, comboPair) {
      const activations = [];
      const processed = new Set();
      if (comboPair) {
        const { r1, c1, s1, r2, c2, s2 } = comboPair;
        processed.add(cellKey(r1, c1));
        processed.add(cellKey(r2, c2));
        const comboTypes = this.applySpecialCombo(clearSet, r1, c1, s1, r2, c2, s2);
        comboTypes.forEach((t) => activations.push({ special: t, combo: true }));
      }

      let queue = [];
      const enqueueFromClearSet = () => {
        clearSet.forEach((k) => {
          if (processed.has(k)) return;
          const parts = k.split(',');
          const r = Number(parts[0]);
          const c = Number(parts[1]);
          if (this.specialGrid[r][c]) queue.push({ r, c, key: k, special: this.specialGrid[r][c] });
        });
      };

      enqueueFromClearSet();
      while (queue.length) {
        const batch = queue;
        queue = [];
        if (batch.length >= 2) {
          const a = batch[0];
          const b = batch.find((it) => it.key !== a.key) || batch[1];
          if (a && b && !processed.has(b.key)) {
            processed.add(a.key);
            processed.add(b.key);
            const comboTypes = this.applySpecialCombo(clearSet, a.r, a.c, a.special, b.r, b.c, b.special);
            comboTypes.forEach((t) => activations.push({ special: t, combo: true }));
            enqueueFromClearSet();
            continue;
          }
        }

        for (let i = 0; i < batch.length; i++) {
          const item = batch[i];
          if (processed.has(item.key)) continue;
          processed.add(item.key);
          const before = clearSet.size;
          this.applySingleExplosion(clearSet, item.r, item.c, item.special);
          activations.push({ special: item.special, r: item.r, c: item.c });
          if (clearSet.size - before > 3) this.triggerShake(0.7);
          enqueueFromClearSet();
        }
      }
      return activations;
    }

    pickSpawnCell(cells, swapOrigin) {
      if (swapOrigin) {
        const found = cells.find((c) => c.r === swapOrigin.r && c.c === swapOrigin.c);
        if (found) return found;
      }
      return cells[Math.floor(cells.length / 2)];
    }

    isGroupHorizontal(cells) {
      return cells.every((c) => c.r === cells[0].r);
    }

    detectCrossSpawns(matches) {
      const spawns = new Map();
      for (let i = 0; i < matches.length; i++) {
        for (let j = i + 1; j < matches.length; j++) {
          const a = matches[i];
          const b = matches[j];
          if (a.type !== b.type) continue;
          const shared = a.cells.filter((ca) => b.cells.some((cb) => cb.r === ca.r && cb.c === ca.c));
          if (shared.length !== 1) continue;
          const union = new Set([
            ...a.cells.map((c) => cellKey(c.r, c.c)),
            ...b.cells.map((c) => cellKey(c.r, c.c)),
          ]);
          if (union.size >= 5) {
            const pt = shared[0];
            spawns.set(cellKey(pt.r, pt.c), { r: pt.r, c: pt.c, special: C.SPECIAL.CROSS, color: a.type });
          }
        }
      }
      return spawns;
    }

    detectBonusSpawns(matches, swapOrigin) {
      const spawns = this.detectCrossSpawns(matches);
      const priority = { cross: 5, prism: 4, beam_h: 3, beam_v: 3, nova: 2, chrono: 1 };

      for (let i = 0; i < matches.length; i++) {
        const group = matches[i];
        const spawnCell = this.pickSpawnCell(group.cells, swapOrigin);
        const key = cellKey(spawnCell.r, spawnCell.c);
        if (spawns.has(key)) continue;

        let special = null;
        if (group.len >= 5) special = C.SPECIAL.PRISM;
        else if (group.len === 4) special = this.isGroupHorizontal(group.cells) ? C.SPECIAL.BEAM_H : C.SPECIAL.BEAM_V;

        if (special) {
          const existing = spawns.get(key);
          if (!existing || (priority[special] || 0) > (priority[existing.special] || 0)) {
            spawns.set(key, { r: spawnCell.r, c: spawnCell.c, special, color: group.type });
          }
        }
      }
      return spawns;
    }

    findMatches(board) {
      const groups = [];
      const specs = this.specialGrid;

      for (let r = 0; r < C.GRID_SIZE; r++) {
        let c = 0;
        while (c < C.GRID_SIZE) {
          const type = board[r][c];
          if (type < 0) { c++; continue; }
          let baseType = specs[r][c] ? null : type;
          const cells = [{ r, c }];
          c++;
          while (c < C.GRID_SIZE) {
            const t = board[r][c];
            if (t < 0) break;
            const sp = specs[r][c];
            if (sp) { cells.push({ r, c }); c++; }
            else if (baseType === null) { baseType = t; cells.push({ r, c }); c++; }
            else if (t === baseType) { cells.push({ r, c }); c++; }
            else break;
          }
          if (cells.length >= 3) {
            const matchType = baseType != null ? baseType : board[cells[0].r][cells[0].c];
            groups.push({ type: matchType, cells, len: cells.length, horizontal: true });
          }
        }
      }

      for (let c = 0; c < C.GRID_SIZE; c++) {
        let r = 0;
        while (r < C.GRID_SIZE) {
          const type = board[r][c];
          if (type < 0) { r++; continue; }
          let baseType = specs[r][c] ? null : type;
          const cells = [{ r, c }];
          r++;
          while (r < C.GRID_SIZE) {
            const t = board[r][c];
            if (t < 0) break;
            const sp = specs[r][c];
            if (sp) { cells.push({ r, c }); r++; }
            else if (baseType === null) { baseType = t; cells.push({ r, c }); r++; }
            else if (t === baseType) { cells.push({ r, c }); r++; }
            else break;
          }
          if (cells.length >= 3) {
            const matchType = baseType != null ? baseType : board[cells[0].r][cells[0].c];
            groups.push({ type: matchType, cells, len: cells.length, horizontal: false });
          }
        }
      }

      return groups;
    }

    hasValidMove(board) {
      for (let r = 0; r < C.GRID_SIZE; r++) {
        for (let c = 0; c < C.GRID_SIZE; c++) {
          if (this.specialGrid[r][c]) {
            const neighbors = [[0, 1], [1, 0], [0, -1], [-1, 0]];
            for (let i = 0; i < neighbors.length; i++) {
              const dr = neighbors[i][0];
              const dc = neighbors[i][1];
              const r2 = r + dr;
              const c2 = c + dc;
              if (r2 >= 0 && r2 < C.GRID_SIZE && c2 >= 0 && c2 < C.GRID_SIZE && board[r2][c2] >= 0) return true;
            }
          }
        }
      }

      for (let r = 0; r < C.GRID_SIZE; r++) {
        for (let c = 0; c < C.GRID_SIZE; c++) {
          const neighbors = [[0, 1], [1, 0]];
          for (let i = 0; i < neighbors.length; i++) {
            const dr = neighbors[i][0];
            const dc = neighbors[i][1];
            const r2 = r + dr;
            const c2 = c + dc;
            if (r2 >= C.GRID_SIZE || c2 >= C.GRID_SIZE) continue;
            if (!this.isMovable(r, c) || !this.isMovable(r2, c2)) continue;
            this.swapCells(board, r, c, r2, c2);
            const t1 = this.specialGrid[r][c];
            const t2 = this.specialGrid[r2][c2];
            this.specialGrid[r][c] = t2;
            this.specialGrid[r2][c2] = t1;
            const matches = this.findMatches(board);
            this.specialGrid[r][c] = t1;
            this.specialGrid[r2][c2] = t2;
            this.swapCells(board, r, c, r2, c2);
            if (matches.length > 0) return true;
          }
        }
      }
      return false;
    }

    findHintMove() {
      for (let r = 0; r < C.GRID_SIZE; r++) {
        for (let c = 0; c < C.GRID_SIZE; c++) {
          const neighbors = [[0, 1], [1, 0]];
          for (let i = 0; i < neighbors.length; i++) {
            const dr = neighbors[i][0];
            const dc = neighbors[i][1];
            const r2 = r + dr;
            const c2 = c + dc;
            if (r2 >= C.GRID_SIZE || c2 >= C.GRID_SIZE) continue;
            if (!this.isMovable(r, c) || !this.isMovable(r2, c2)) continue;
            this.swapCells(this.grid, r, c, r2, c2);
            const t1 = this.specialGrid[r][c];
            const t2 = this.specialGrid[r2][c2];
            this.specialGrid[r][c] = t2;
            this.specialGrid[r2][c2] = t1;
            const matches = this.findMatches(this.grid);
            this.specialGrid[r][c] = t1;
            this.specialGrid[r2][c2] = t2;
            this.swapCells(this.grid, r, c, r2, c2);
            if (matches.length > 0) return [{ r, c }, { r: r2, c: c2 }];
          }
        }
      }
      return null;
    }

    applyGravity(board) {
      const falls = [];
      for (let c = 0; c < C.GRID_SIZE; c++) {
        let write = C.GRID_SIZE - 1;
        for (let r = C.GRID_SIZE - 1; r >= 0; r--) {
          if (this.isSolidCell(r, c)) {
            if (write !== r) {
              falls.push({
                fromR: r,
                toR: write,
                c,
                type: board[r][c],
                special: this.specialGrid[r][c],
                block: this.blockGrid[r][c],
              });
              board[write][c] = board[r][c];
              this.specialGrid[write][c] = this.specialGrid[r][c];
              this.blockGrid[write][c] = this.blockGrid[r][c];
              board[r][c] = -1;
              this.specialGrid[r][c] = null;
              this.blockGrid[r][c] = null;
            }
            write--;
          }
        }
        for (let r = write; r >= 0; r--) {
          const type = this.randomGemType();
          board[r][c] = type;
          this.specialGrid[r][c] = null;
          this.blockGrid[r][c] = null;
          falls.push({ fromR: -1, toR: r, c, type, special: null, block: null });
        }
      }
      return falls;
    }

    isCrateCell(r, c) {
      return this.blockGrid[r][c] && this.blockGrid[r][c].type === 'crate';
    }

    shuffleBoard(board) {
      const positions = [];
      for (let r = 0; r < C.GRID_SIZE; r++) {
        for (let c = 0; c < C.GRID_SIZE; c++) {
          if (!this.isCrateCell(r, c) && board[r][c] >= 0) positions.push({ r, c });
        }
      }

      let attempts = 0;
      while (attempts < 80) {
        const flat = positions.map((p) => ({
          type: board[p.r][p.c],
          special: this.specialGrid[p.r][p.c],
          block: this.blockGrid[p.r][p.c],
        }));
        for (let i = flat.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const t = flat[i];
          flat[i] = flat[j];
          flat[j] = t;
        }
        positions.forEach((pos, idx) => {
          board[pos.r][pos.c] = flat[idx].type;
          this.specialGrid[pos.r][pos.c] = flat[idx].special;
          this.blockGrid[pos.r][pos.c] = flat[idx].block;
        });
        if (this.findMatches(board).length === 0 && this.hasValidMove(board)) return true;
        attempts++;
      }

      positions.forEach((p) => {
        this.specialGrid[p.r][p.c] = null;
        this.blockGrid[p.r][p.c] = null;
      });
      return this.fillBoardNoMatches(board);
    }

    fillBoardNoMatches(board) {
      let attempts = 0;
      do {
        for (let r = 0; r < C.GRID_SIZE; r++) {
          for (let c = 0; c < C.GRID_SIZE; c++) {
            if (this.isCrateCell(r, c)) { board[r][c] = -1; continue; }
            board[r][c] = this.randomGemAvoidingMatch(board, r, c);
          }
        }
        attempts++;
      } while ((this.findMatches(board).length > 0 || !this.hasValidMove(board)) && attempts < 60);
      return attempts < 60;
    }

    initBoard() {
      this.grid = this.createEmptyBoard();
      this.specialGrid = this.createEmptySpecialGrid();
      this.blockGrid = this.createEmptyBlockGrid();
      this.fillBoardNoMatches(this.grid);
    }

    blockParticleColor(type) {
      return type === 'crate' ? '#d9a066' : '#bfefff';
    }

    processObstacles(clearSet) {
      const damage = new Map();
      const addDmg = (r, c) => {
        if (!this.blockGrid[r][c]) return;
        const k = cellKey(r, c);
        damage.set(k, (damage.get(k) || 0) + 1);
      };
      clearSet.forEach((key) => {
        const parts = key.split(',');
        const r = Number(parts[0]);
        const c = Number(parts[1]);
        addDmg(r, c);
        const neigh = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (let i = 0; i < neigh.length; i++) {
          const nr = r + neigh[i][0];
          const nc = c + neigh[i][1];
          if (nr < 0 || nr >= C.GRID_SIZE || nc < 0 || nc >= C.GRID_SIZE) continue;
          addDmg(nr, nc);
        }
      });

      const finalClear = new Set(clearSet);
      damage.forEach((cnt, key) => {
        const parts = key.split(',');
        const r = Number(parts[0]);
        const c = Number(parts[1]);
        const b = this.blockGrid[r][c];
        if (!b) return;
        const wasIce = b.type === 'ice';
        const wasCrate = b.type === 'crate';
        const pos = this.cellCenter(r, c);
        b.hp -= cnt;
        if (b.hp <= 0) {
          this.blockGrid[r][c] = null;
          if (wasIce) this.iceBroken++;
          if (wasCrate) this.cratesDestroyed++;
          this.burstParticles(pos.x, pos.y, this.blockParticleColor(b.type), 16);
          this.triggerShake(0.4);
        } else {
          this.burstParticles(pos.x, pos.y, this.blockParticleColor(b.type), 6);
        }
        if (wasIce && finalClear.has(key)) finalClear.delete(key);
      });
      return finalClear;
    }

    freezeRandomGem() {
      const candidates = [];
      for (let r = 0; r < C.GRID_SIZE; r++) {
        for (let c = 0; c < C.GRID_SIZE; c++) {
          if (this.grid[r][c] >= 0 && !this.blockGrid[r][c] && !this.specialGrid[r][c]) candidates.push({ r, c });
        }
      }
      if (!candidates.length) return;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      this.blockGrid[pick.r][pick.c] = { type: 'ice', hp: 1 + Math.floor(Math.random() * 2) };
      if (!this.hasValidMove(this.grid)) {
        this.blockGrid[pick.r][pick.c] = null;
        return;
      }
      const pos = this.cellCenter(pick.r, pick.c);
      this.burstParticles(pos.x, pos.y, '#bfefff', 10);
      this.addFloatText(pos.x, pos.y - 16, 'FROZEN', '#bfefff');
    }

    placeCrate() {
      const candidates = [];
      for (let r = 0; r < C.GRID_SIZE; r++) {
        for (let c = 0; c < C.GRID_SIZE; c++) {
          if (this.grid[r][c] >= 0 && !this.blockGrid[r][c] && !this.specialGrid[r][c]) candidates.push({ r, c });
        }
      }
      if (!candidates.length) return;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      const savedType = this.grid[pick.r][pick.c];
      this.grid[pick.r][pick.c] = -1;
      this.blockGrid[pick.r][pick.c] = { type: 'crate', hp: 2 };
      if (!this.hasValidMove(this.grid)) {
        this.blockGrid[pick.r][pick.c] = null;
        this.grid[pick.r][pick.c] = savedType;
        return;
      }
      const pos = this.cellCenter(pick.r, pick.c);
      this.burstParticles(pos.x, pos.y, '#d9a066', 10);
      this.addFloatText(pos.x, pos.y - 16, 'CRATE', '#d9a066');
    }

    spawnObstacle(tier) {
      if (!tier) return;
      if (tier.crate && Math.random() < 0.4) this.placeCrate();
      else if (tier.ice) this.freezeRandomGem();
    }

    registerMove() {
      this.moveCount++;
      if (this.mode === 'campaign' && this.levelConfig && this.levelConfig.mode === 'moves') {
        this.movesLeft = Math.max(0, this.movesLeft - 1);
      }

      if (this.mode === 'infinite') {
        const tier = C.DIFFICULTY_TIERS[this.currentTier];
        if (tier.obstacleEvery > 0 && this.moveCount % tier.obstacleEvery === 0) this.spawnObstacle(tier);
      } else {
        const obs = this.levelConfig && this.levelConfig.obstacles;
        if (obs && obs.obstacleEvery > 0 && this.moveCount % obs.obstacleEvery === 0) {
          this.spawnObstacle(obs);
        }
      }

      this.updateHeaderUI();
    }

    updateTier() {
      if (this.mode !== 'infinite') return;
      let t = 0;
      for (let i = 0; i < C.DIFFICULTY_TIERS.length; i++) {
        if (this.elapsed >= C.DIFFICULTY_TIERS[i].atSec) t = i;
      }
      if (t !== this.currentTier) {
        this.currentTier = t;
        const tier = C.DIFFICULTY_TIERS[t];
        this.addFloatText(this.W() / 2, this.H() * 0.3, 'TIER: ' + tier.label, tier.color);
        this.updateHeaderUI();
        if (typeof haptic === 'function') haptic('medium');
      }
    }

    rollObjective() {
      const color = Math.floor(Math.random() * C.GEM_TYPES);
      const target = 12 + Math.floor(Math.random() * 9);
      this.objective = { color, target, progress: 0 };
      this.updateGoalUI();
    }

    completeObjective() {
      this.addTime(5);
      this.gameState.score += 200;
      const tool = Math.random() < 0.5 ? 'bomb' : 'hammer';
      this.charges[tool] = Math.min(9, this.charges[tool] + 1);
      this.updateAbilityUI();
      this.addFloatText(this.W() / 2, this.H() * 0.5, 'OBJECTIVE!', '#39ff14');
      if (typeof haptic === 'function') haptic('success');
      this.rollObjective();
      this.updateHeaderUI();
    }

    trackGoals(clearedColors, activations, comboLevel) {
      if (this.mode === 'infinite') {
        if (this.objective) {
          let added = 0;
          for (let i = 0; i < clearedColors.length; i++) if (clearedColors[i] === this.objective.color) added++;
          if (added > 0) {
            this.objective.progress += added;
            if (this.objective.progress >= this.objective.target) this.completeObjective();
          }
        }
        this.updateGoalUI();
        return;
      }

      if (!this.goalProgress || !this.goalProgress.length) return;
      for (let i = 0; i < this.goalProgress.length; i++) {
        const g = this.goalProgress[i];
        if (g.done) continue;
        if (g.type === 'score') {
          g.progress = this.gameState.score;
        } else if (g.type === 'color') {
          for (let k = 0; k < clearedColors.length; k++) {
            if (clearedColors[k] === g.color) g.progress += 1;
          }
        } else if (g.type === 'cascades') {
          if (comboLevel > 1) g.progress += 1;
        } else if (g.type === 'ice') {
          g.progress = this.iceBroken;
        } else if (g.type === 'crate') {
          g.progress = this.cratesDestroyed;
        } else if (g.type === 'specials') {
          g.progress += activations.length;
        }
        if (g.progress >= g.target) {
          g.progress = g.target;
          g.done = true;
        }
      }
      this.updateGoalUI();
      this.checkWin();
    }

    checkWin() {
      if (this.mode !== 'campaign' || this.gameState.state !== 'playing') return false;
      const won = this.goalProgress.length > 0 && this.goalProgress.every((g) => g.done);
      if (won) this.winLevel();
      return won;
    }

    checkLoseAfterMove() {
      if (this.mode !== 'campaign' || this.gameState.state !== 'playing') return false;
      if (this.goalProgress.every((g) => g.done)) return false;
      const outMoves = this.levelConfig && this.levelConfig.mode === 'moves' && this.movesLeft <= 0;
      const outTime = this.levelConfig && this.levelConfig.mode === 'time' && this.timeLeft <= 0;
      if (outMoves || outTime) {
        this.loseLevel();
        return true;
      }
      return false;
    }

    applyLevelConfig() {
      if (!this.levelConfig) return;
      this.mode = this.levelId === 'infinite' ? 'infinite' : 'campaign';

      this.initialMoves = this.levelConfig.moves || 0;
      this.movesLeft = this.initialMoves;
      this.initialTime = this.levelConfig.time || C.GAME_TIME;
      this.timeLeft = this.initialTime;

      this.currentTier = 0;
      this.elapsed = 0;
      this.moveCount = 0;
      this.totalCascades = 0;
      this.iceBroken = 0;
      this.cratesDestroyed = 0;

      const startCharges = (this.levelConfig.startCharges || {});
      this.charges = {
        bomb: startCharges.bomb || 0,
        hammer: startCharges.hammer || 0,
      };
      if (this.mode === 'infinite') {
        this.charges.bomb = Math.max(0, this.charges.bomb || 0);
        this.charges.hammer = Math.max(0, this.charges.hammer || 0);
      }

      this.goalProgress = L.initGoalProgress(this.levelConfig.goals || []);
      this.objective = null;
      if (this.mode === 'infinite' && this.levelConfig.randomObjectives) this.rollObjective();

      this.updateGoalUI();
      this.updateAbilityUI();
      this.updateHeaderUI();
    }

    applyStartingObstacles() {
      const starts = this.levelConfig && this.levelConfig.startingObstacles;
      if (!Array.isArray(starts) || !starts.length) return;
      for (let i = 0; i < starts.length; i++) {
        const o = starts[i];
        const r = clamp(o.r, 0, C.GRID_SIZE - 1);
        const c = clamp(o.c, 0, C.GRID_SIZE - 1);
        const type = o.type === 'crate' ? 'crate' : 'ice';
        const hp = Math.max(1, Number(o.hp) || (type === 'crate' ? 2 : 1));
        this.blockGrid[r][c] = { type, hp };
        if (type === 'crate') this.grid[r][c] = -1;
      }

      for (let r = 0; r < C.GRID_SIZE; r++) {
        for (let c = 0; c < C.GRID_SIZE; c++) {
          if (this.grid[r][c] < 0 && !(this.blockGrid[r][c] && this.blockGrid[r][c].type === 'crate')) {
            this.grid[r][c] = this.randomGemType();
          }
        }
      }
      this.fillBoardNoMatches(this.grid);
    }

    showLevelSelect() {
      this.stopTimer();
      this.gameState.state = 'levelSelect';
      this.boardState = 'idle';
      this.anim = null;
      this.activeTool = null;
      this.selectedCell = null;
      this.hintCells = null;
      this.goalProgress = [];

      if (this.ui.levelSelect) this.ui.levelSelect.classList.remove('hidden');
      if (this.ui.introOverlay) this.ui.introOverlay.classList.add('hidden');
      if (this.ui.winOverlay) this.ui.winOverlay.classList.add('hidden');
      if (this.ui.gameoverOverlay) this.ui.gameoverOverlay.classList.add('hidden');

      this.renderLevelSelect();
      this.updateHeaderUI();
      this.updateGoalUI();
      this.updateAbilityUI();
      this._syncRenderLoop();
    }

    renderLevelSelect() {
      const host = this.ui.levelGrid || this.ui.levelSelect;
      if (!host) return;
      const levels = L.LEVELS || [];

      const inf = L.INFINITE_MODE;
      const infiniteCard =
        '<button class="level-card infinite" data-level-id="infinite" type="button">' +
          '<span class="level-badge infinite-badge">∞</span>' +
          '<span class="level-body">' +
            '<span class="level-name">' + inf.name + '</span>' +
            '<span class="level-meta">Endless · escalating difficulty · high score chase</span>' +
          '</span>' +
          '<span class="level-side">' +
            '<span class="level-best">BEST ' + this.gameState.infiniteBest + '</span>' +
          '</span>' +
        '</button>';

      const cards = [infiniteCard];

      levels.forEach((lv) => {
        const unlocked = L.isLevelUnlocked(lv.id, this.progress);
        const stars = this.progress.stars[String(lv.id)] || 0;
        const goalText = (lv.goals || []).map((g) => L.goalLabel(g)).join(' · ');
        const modeText = lv.mode === 'moves' ? lv.moves + ' moves' : lv.time + 's';
        const lockHtml = unlocked ? '' : '<span class="level-lock">LOCK</span>';
        cards.push(
          '<button class="level-card' + (unlocked ? '' : ' locked') + '" data-level-id="' + lv.id + '" type="button"' + (unlocked ? '' : ' disabled') + '>' +
          '<span class="level-badge">' + lv.id + '</span>' +
          '<span class="level-body">' +
            '<span class="level-name">' + lv.name + '</span>' +
            '<span class="level-meta">' + modeText + ' · ' + goalText + '</span>' +
          '</span>' +
          '<span class="level-side">' +
            lockHtml +
            '<span class="level-stars" aria-label="' + stars + ' of 3 stars">' + '★'.repeat(stars) + '<span class="level-stars-dim">' + '☆'.repeat(Math.max(0, 3 - stars)) + '</span></span>' +
          '</span>' +
        '</button>'
        );
      });

      host.innerHTML = cards.join('');
    }

    startLevel(id) {
      const cfg = L.getLevel(id);
      if (!cfg) return;
      this.levelId = id;
      this.levelConfig = JSON.parse(JSON.stringify(cfg));

      this.gameState.score = 0;
      this.boardState = 'idle';
      this.anim = null;
      this.particles = [];
      this.floatTexts = [];
      this.screenShake = 0;

      this.selectedCell = null;
      this.selectedAt = 0;
      this.pressedCell = null;
      this.pressedAt = 0;
      this.pointerDown = null;
      this.dragHandled = false;
      this.lastSwapCell = null;
      this.lastActionAt = performance.now();
      this.hintCells = null;
      this.hintPending = false;
      this.slowmoUntil = 0;
      this.reshuffleFlash = 0;
      this.shuffleCooldown = 0;
      this.activeTool = null;

      this.initBoard();
      this.applyLevelConfig();
      this.applyStartingObstacles();

      this.gameState.state = 'playing';

      if (typeof beginCoinSession === 'function') {
        beginCoinSession(this.gameState.best, C.GAME_ID, () => this.gameState.score);
      }

      if (this.ui.levelSelect) this.ui.levelSelect.classList.add('hidden');
      if (this.ui.introOverlay) this.ui.introOverlay.classList.add('hidden');
      if (this.ui.winOverlay) this.ui.winOverlay.classList.add('hidden');
      if (this.ui.gameoverOverlay) this.ui.gameoverOverlay.classList.add('hidden');

      this.startTimer();
      this.updateHeaderUI();
      this.updateGoalUI();
      this.updateAbilityUI();
      this._syncRenderLoop();
    }

    winLevel() {
      if (this.gameState.state !== 'playing') return;
      this.gameState.state = 'won';
      this.stopTimer();
      this.boardState = 'idle';
      this.anim = null;
      this.activeTool = null;
      this.updateAbilityUI();

      const stars = L.calcStars(
        this.levelConfig,
        this.goalProgress,
        this.movesLeft,
        this.timeLeft,
        this.gameState.score,
        this.initialMoves,
        this.initialTime
      );

      const k = String(this.levelId);
      this.progress.stars[k] = Math.max(this.progress.stars[k] || 0, stars);
      if (typeof this.levelId === 'number' && this.levelId >= this.progress.unlockedLevel) {
        const maxLevel = L.MAX_CAMPAIGN_LEVEL || (L.LEVELS && L.LEVELS.length) || 20;
        this.progress.unlockedLevel = Math.min(maxLevel, this.levelId + 1);
      }
      L.saveProgress(this.progress);

      if (this.ui.winOverlay) this.ui.winOverlay.classList.remove('hidden');
      if (this.ui.winScore) this.ui.winScore.textContent = String(this.gameState.score);
      if (this.ui.winStars) this.ui.winStars.textContent = '★'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars));
      if (typeof haptic === 'function') haptic('success');
    }

    loseLevel() {
      if (this.mode === 'infinite') {
        this.endInfinite();
        return;
      }
      if (this.gameState.state !== 'playing') return;
      this.gameState.state = 'lost';
      this.stopTimer();
      this.boardState = 'idle';
      this.anim = null;
      this.pointerDown = null;
      this.selectedCell = null;
      this.selectedAt = 0;
      this.pressedCell = null;
      this.pressedAt = 0;
      this.activeTool = null;
      this.hintCells = null;
      this.updateAbilityUI();

      if (this.ui.finalScore) this.ui.finalScore.textContent = String(this.gameState.score);
      if (this.ui.gameoverSub) {
        if (this.goalProgress && this.goalProgress.length) {
          const parts = this.goalProgress.map((g) => L.goalLabel(g) + ' ' + Math.min(g.progress, g.target) + '/' + g.target);
          this.ui.gameoverSub.textContent = parts.join(' · ');
        } else {
          this.ui.gameoverSub.textContent = this.levelConfig && this.levelConfig.mode === 'time' ? "TIME'S UP" : 'OUT OF MOVES';
        }
      }
      if (this.ui.gameoverOverlay) this.ui.gameoverOverlay.classList.remove('hidden');
      if (typeof haptic === 'function') haptic('error');
      if (typeof playSfx === 'function') playSfx('prismcascade.gameover');
    }

    endInfinite() {
      if (this.gameState.state !== 'playing') return;
      this.gameState.state = 'lost';
      this.stopTimer();
      this.boardState = 'idle';
      this.anim = null;
      this.pointerDown = null;
      this.selectedCell = null;
      this.pressedCell = null;
      this.activeTool = null;
      this.hintCells = null;

      if (this.gameState.score > this.gameState.best) {
        this.gameState.best = this.gameState.score;
        if (typeof setHighScore === 'function') setHighScore(C.GAME_ID, this.gameState.best);
      }
      if (this.gameState.score > this.gameState.infiniteBest) {
        this.gameState.infiniteBest = this.gameState.score;
        this.progress.infiniteBest = this.gameState.score;
        L.saveProgress(this.progress);
      }

      if (this.ui.finalScore) this.ui.finalScore.textContent = String(this.gameState.score);
      if (this.ui.bestScore) this.ui.bestScore.textContent = 'BEST: ' + this.gameState.best;
      if (this.ui.gameoverOverlay) this.ui.gameoverOverlay.classList.remove('hidden');

      if (typeof awardAndShowCoins === 'function') awardAndShowCoins(C.GAME_ID, this.gameState.score);
      if (typeof haptic === 'function') haptic('error');
      if (typeof playSfx === 'function') playSfx('prismcascade.gameover');
    }

    updateGoalUI() {
      if (this.mode === 'infinite') {
        if (!this.ui.objectiveBar) return;
        if (!this.objective) {
          this.ui.objectiveBar.classList.add('hidden');
          return;
        }
        this.ui.objectiveBar.classList.remove('hidden');
        if (this.ui.objectiveSwatch) {
          this.ui.objectiveSwatch.style.background = C.GEM_DEFS[this.objective.color].color;
          this.ui.objectiveSwatch.style.boxShadow = '0 0 10px ' + C.GEM_DEFS[this.objective.color].color;
        }
        if (this.ui.objectiveProgress) {
          this.ui.objectiveProgress.textContent = Math.min(this.objective.progress, this.objective.target) + ' / ' + this.objective.target;
        }
        return;
      }

      if (this.ui.objectiveBar) this.ui.objectiveBar.classList.add('hidden');
      if (this.ui.goalList) {
        if (!this.goalProgress || !this.goalProgress.length) {
          this.ui.goalList.innerHTML = '';
          if (this.ui.goalBar) this.ui.goalBar.style.display = 'none';
          return;
        }
        if (this.ui.goalBar) this.ui.goalBar.style.display = '';
        const html = this.goalProgress.map((g) => {
          const txt = L.goalLabel(g);
          const pr = Math.min(g.progress, g.target);
          return '<div class=\"goal-row ' + (g.done ? 'done' : '') + '\">' +
            '<span class=\"goal-name\">' + txt + '</span>' +
            '<span class=\"goal-progress\">' + pr + '/' + g.target + '</span>' +
          '</div>';
        }).join('');
        this.ui.goalList.innerHTML = html;
      }
    }

    updateAbilityUI() {
      const enabled = this.levelConfig ? (this.levelConfig.abilities || []) : [];
      const hasBomb = this.mode === 'infinite' || enabled.indexOf('bomb') >= 0;
      const hasHammer = this.mode === 'infinite' || enabled.indexOf('hammer') >= 0;
      const hasShuffle = this.mode === 'infinite' || enabled.indexOf('shuffle') >= 0;

      if (this.ui.bombCharge) this.ui.bombCharge.textContent = this.charges.bomb;
      if (this.ui.hammerCharge) this.ui.hammerCharge.textContent = this.charges.hammer;

      if (this.ui.abilityBomb) {
        this.ui.abilityBomb.classList.toggle('hidden', !hasBomb);
        this.ui.abilityBomb.classList.toggle('armed', this.activeTool === 'bomb');
        this.ui.abilityBomb.classList.toggle('depleted', this.charges.bomb <= 0);
      }
      if (this.ui.abilityHammer) {
        this.ui.abilityHammer.classList.toggle('hidden', !hasHammer);
        this.ui.abilityHammer.classList.toggle('armed', this.activeTool === 'hammer');
        this.ui.abilityHammer.classList.toggle('depleted', this.charges.hammer <= 0);
      }
      if (this.ui.abilityShuffle) {
        this.ui.abilityShuffle.classList.toggle('hidden', !hasShuffle);
      }
    }

    updateHeaderUI() {
      if (this.ui.score) this.ui.score.textContent = String(this.gameState.score);
      if (this.ui.timer) {
        const showTimer = this.mode === 'infinite' || (this.levelConfig && this.levelConfig.mode === 'time');
        const timerParent = this.ui.timer.parentElement;
        if (timerParent) timerParent.style.display = showTimer ? '' : 'none';
        if (showTimer) this.ui.timer.textContent = String(Math.max(0, Math.floor(this.timeLeft)));
      }
      if (this.ui.movesDisplay) {
        const showMoves = this.mode === 'campaign' && this.levelConfig && this.levelConfig.mode === 'moves';
        const movesParent = this.ui.movesDisplay.parentElement;
        if (movesParent) movesParent.style.display = showMoves ? '' : 'none';
        if (showMoves) this.ui.movesDisplay.textContent = String(this.movesLeft);
      }
      if (this.ui.bestScore) this.ui.bestScore.textContent = 'BEST: ' + this.gameState.best;

      if (this.ui.tierDisplay) {
        if (this.gameState.state === 'levelSelect') {
          this.ui.tierDisplay.textContent = 'SELECT';
          this.ui.tierDisplay.style.color = '#aa00ff';
          this.ui.tierDisplay.style.borderColor = '#aa00ff';
        } else if (this.mode === 'infinite') {
          const tier = C.DIFFICULTY_TIERS[this.currentTier] || C.DIFFICULTY_TIERS[0];
          this.ui.tierDisplay.textContent = tier.label;
          this.ui.tierDisplay.style.color = tier.color;
          this.ui.tierDisplay.style.borderColor = tier.color;
        } else if (this.levelConfig) {
          this.ui.tierDisplay.textContent = 'LV ' + this.levelConfig.id;
          this.ui.tierDisplay.style.color = '#39ff14';
          this.ui.tierDisplay.style.borderColor = '#39ff14';
        }
      }
    }

    triggerSlowmo(ms) {
      this.slowmoUntil = performance.now() + ms;
    }

    resetIdle() {
      this.lastActionAt = performance.now();
      this.hintCells = null;
    }

    addFloatText(x, y, text, color) {
      this.floatTexts.push({ x, y, text, color, life: 1, vy: -0.7 });
    }

    burstParticles(x, y, color, count) {
      count = this._scaledParticleCount(count);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3;
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          life: 1,
          decay: 0.03 + Math.random() * 0.025,
          color,
          size: 2 + Math.random() * 3,
        });
      }
    }

    addTime(seconds) {
      if (seconds <= 0 || this.gameState.state !== 'playing') return;
      this.timeLeft = Math.min(C.MAX_TIME, this.timeLeft + seconds);
      this.updateHeaderUI();
      const timerEl = this.ui.timer && this.ui.timer.parentElement;
      if (timerEl) {
        timerEl.classList.remove('timer-bonus-pop');
        void timerEl.offsetWidth;
        timerEl.classList.add('timer-bonus-pop');
      }
      this.addFloatText(this.W() * 0.78, this.H() * 0.1, '+' + seconds + 's', '#39ff14');
    }

    scheduleHintMove() {
      if (this.hintPending || this.hintCells) return;
      this.hintPending = true;
      const run = () => {
        this.hintPending = false;
        if (
          this.gameState.state === 'playing' &&
          this.boardState === 'idle' &&
          !this.anim &&
          !this.activeTool &&
          !this.selectedCell &&
          !this.hintCells &&
          performance.now() - this.lastActionAt > 5000
        ) {
          this.hintCells = this.findHintMove();
        }
      };
      if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 500 });
      else setTimeout(run, 0);
    }

    spawnClearParticles(clearSet, large) {
      clearSet.forEach((key) => {
        const parts = key.split(',');
        const r = Number(parts[0]);
        const c = Number(parts[1]);
        const type = this.grid[r][c];
        if (type < 0) return;
        const pos = this.cellCenter(r, c);
        const special = this.specialGrid[r][c];
        const count = large || special ? C.BONUS_CONFIG.particleBurstLarge : 8;
        this.burstParticles(pos.x, pos.y, C.GEM_DEFS[type].color, count);
        if (special) this.burstParticles(pos.x, pos.y, '#ffffff', Math.floor(count * 0.4));
      });
    }

    updateParticles(dt) {
      const step = dt / 16.67;
      this.particles.forEach((p) => {
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.vy += 0.08 * step;
        p.life -= p.decay * step;
      });
      this.particles = this.particles.filter((p) => p.life > 0);

      this.floatTexts.forEach((f) => {
        f.y += f.vy * step;
        f.life -= 0.018 * step;
      });
      this.floatTexts = this.floatTexts.filter((f) => f.life > 0);
    }

    waitAnim(type, duration, data) {
      let dur = duration;
      if (performance.now() < this.slowmoUntil && (type === 'clear' || type === 'fall')) dur = duration * 2.2;
      return new Promise((resolve) => {
        this.anim = Object.assign({ type, start: performance.now(), duration: dur, resolve, particlesSpawned: false }, data || {});
      });
    }

    checkAnimComplete(now) {
      if (!this.anim) return;
      if (now - this.anim.start >= this.anim.duration) {
        const resolve = this.anim.resolve;
        this.anim = null;
        resolve();
      }
    }

    scoreMatches(matches, comboLevel, clearCount, activations) {
      const unique = new Set();
      let points = 0;
      for (let i = 0; i < matches.length; i++) {
        const group = matches[i];
        for (let k = 0; k < group.cells.length; k++) {
          const p = group.cells[k];
          unique.add(cellKey(p.r, p.c));
        }
        points += Math.max(0, group.len - 3) * 20;
      }
      points += unique.size * 10;
      if (clearCount != null && clearCount > unique.size) points += (clearCount - unique.size) * 15;

      let comboActivation = false;
      if (activations && activations.length > 0) {
        points = Math.floor(points * C.BONUS_CONFIG.specialScoreMult);
        for (let i = 0; i < activations.length; i++) {
          const act = activations[i];
          if (act.combo) comboActivation = true;
          const label = C.ACTIVATION_LABELS[act.special];
          if (label && !act.combo) this.addFloatText(this.W() / 2, this.H() * 0.42, label, '#ff8800');
        }
      }

      points *= comboLevel;
      this.gameState.score += points;
      this.updateHeaderUI();

      if (comboLevel === 1) this.addTime(C.TIME_BONUS_MOVE);
      else this.addTime(C.TIME_BONUS_CASCADE);

      if (comboLevel === 3) {
        const tool = Math.random() < 0.5 ? 'bomb' : 'hammer';
        this.charges[tool] = Math.min(9, this.charges[tool] + 1);
        this.updateAbilityUI();
        this.addFloatText(this.W() / 2, this.H() * 0.55, '+1 ' + tool.toUpperCase(), '#00f5ff');
      }

      if (comboActivation || comboLevel >= 5) this.triggerSlowmo(450);

      if (comboLevel > 1) {
        this.totalCascades += 1;
        this.addFloatText(this.W() / 2, this.H() * 0.38, 'COMBO x' + comboLevel, '#ffff00');
        if (comboLevel >= 5) this.addFloatText(this.W() / 2, this.H() * 0.48, 'PRISM SURGE!', '#aa00ff');
        if (typeof haptic === 'function') haptic('light');
        if (typeof playSfx === 'function') playSfx('prismcascade.cascade', { volume: 0.5 });
      } else {
        if (typeof haptic === 'function') haptic('tick');
        if (typeof playSfx === 'function') playSfx('prismcascade.match', { volume: 0.4 });
      }
    }

    async clearAndFall(clearSet, spawns) {
      this.boardState = 'resolving';
      const finalClear = this.processObstacles(clearSet);

      const clearedColors = [];
      finalClear.forEach((key) => {
        const parts = key.split(',');
        const r = Number(parts[0]);
        const c = Number(parts[1]);
        if (this.grid[r][c] >= 0) clearedColors.push(this.grid[r][c]);
      });

      const hasSpecialActivation = Array.from(finalClear).some((key) => {
        const parts = key.split(',');
        return this.specialGrid[Number(parts[0])][Number(parts[1])];
      });

      this.spawnClearParticles(finalClear, hasSpecialActivation);
      await this.waitAnim('clear', C.CLEAR_ANIM_MS, { clearSet: finalClear });

      finalClear.forEach((key) => {
        const parts = key.split(',');
        const r = Number(parts[0]);
        const c = Number(parts[1]);
        this.grid[r][c] = -1;
        this.specialGrid[r][c] = null;
      });

      (spawns || new Map()).forEach((spawn) => {
        this.grid[spawn.r][spawn.c] = spawn.color;
        this.specialGrid[spawn.r][spawn.c] = spawn.special;
        const pos = this.cellCenter(spawn.r, spawn.c);
        const label = C.SPAWN_LABELS[spawn.special];
        if (label) this.addFloatText(pos.x, pos.y - 20, label, '#aa00ff');
      });

      const falls = this.applyGravity(this.grid);
      await this.waitAnim('fall', C.FALL_ANIM_MS, { falls });

      return clearedColors;
    }

    async resolveSpecialActivation(r, c, special, partnerColor, comboLevel) {
      const clearSet = new Set([cellKey(r, c)]);
      if (special === C.SPECIAL.PRISM) this.applySingleExplosion(clearSet, r, c, special, partnerColor);
      else this.applySingleExplosion(clearSet, r, c, special);
      const activations = this.processSpecialExplosions(clearSet);
      this.scoreMatches([], comboLevel, clearSet.size, activations);
      const clearedColors = await this.clearAndFall(clearSet, new Map());
      this.trackGoals(clearedColors, activations, comboLevel);
      await this.resolveCascades(comboLevel + 1);
    }

    async resolveSpecialComboSwap(r1, c1, r2, c2, s1, s2) {
      const clearSet = new Set([cellKey(r1, c1), cellKey(r2, c2)]);
      const activations = this.processSpecialExplosions(clearSet, { r1, c1, s1, r2, c2, s2 });
      this.scoreMatches([], 1, clearSet.size, activations);
      const clearedColors = await this.clearAndFall(clearSet, new Map());
      this.trackGoals(clearedColors, activations, 1);
      await this.resolveCascades(2);
    }

    async resolveCascades(comboLevel) {
      if (this.gameState.state !== 'playing') return;
      const matches = this.findMatches(this.grid);
      if (matches.length === 0) {
        if (!this.hasValidMove(this.grid)) await this.doReshuffle();
        this.boardState = 'idle';
        this.lastSwapCell = null;
        this.resetIdle();
        this.checkWin();
        this.checkLoseAfterMove();
        return;
      }

      let spawns = this.detectBonusSpawns(matches, this.lastSwapCell);
      if (comboLevel >= C.BONUS_CONFIG.comboSpawnThreshold) {
        const candidates = [];
        matches.forEach((g) => g.cells.forEach(({ r, c }) => {
          const k = cellKey(r, c);
          if (!spawns.has(k)) candidates.push({ r, c, k, color: this.grid[r][c] });
        }));
        if (candidates.length > 0) {
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          spawns.set(pick.k, { r: pick.r, c: pick.c, special: C.SPECIAL.CHRONO, color: pick.color });
        }
      }

      const clearSet = new Set();
      matches.forEach((g) => g.cells.forEach(({ r, c }) => clearSet.add(cellKey(r, c))));
      spawns.forEach((_spawn, key) => clearSet.delete(key));
      const activations = this.processSpecialExplosions(clearSet);
      spawns.forEach((_spawn, key) => clearSet.delete(key));

      this.scoreMatches(matches, comboLevel, clearSet.size, activations);
      const clearedColors = await this.clearAndFall(clearSet, spawns);
      this.trackGoals(clearedColors, activations, comboLevel);
      await this.resolveCascades(comboLevel + 1);
    }

    async doReshuffle() {
      this.boardState = 'noMoves';
      this.addFloatText(this.W() / 2, this.H() * 0.5, 'RESHUFFLE', '#aa00ff');
      if (typeof playSfx === 'function') playSfx('prismcascade.shuffle', { volume: 0.45 });
      const host = this.ui.gameContainer || (this.canvas && this.canvas.parentElement);
      if (host) host.classList.add('reshuffle-flash');
      this.reshuffleFlash = 1;
      this.shuffleBoard(this.grid);
      await this.waitAnim('reshuffle', 400, {});
      if (host) host.classList.remove('reshuffle-flash');
      this.reshuffleFlash = 0;
    }

    async trySwap(r1, c1, r2, c2) {
      if (this.boardState !== 'idle' || this.gameState.state !== 'playing') return;
      if (!this.isMovable(r1, c1) || !this.isMovable(r2, c2)) {
        if (typeof haptic === 'function') haptic('error');
        if (this.blockGrid[r1][c1] && this.blockGrid[r1][c1].type === 'ice' || this.blockGrid[r2][c2] && this.blockGrid[r2][c2].type === 'ice') {
          const fr = this.blockGrid[r1][c1] && this.blockGrid[r1][c1].type === 'ice' ? { r: r1, c: c1 } : { r: r2, c: c2 };
          const pos = this.cellCenter(fr.r, fr.c);
          this.addFloatText(pos.x, pos.y - 16, 'FROZEN!', '#bfefff');
        }
        return;
      }

      this.boardState = 'swapping';
      this.resetIdle();
      if (typeof playSfx === 'function') playSfx('prismcascade.swap', { volume: 0.28 });

      this.lastSwapCell = { r: r2, c: c2 };
      await this.waitAnim('swap', C.SWAP_ANIM_MS, { r1, c1, r2, c2 });
      this.swapCellsBoth(r1, c1, r2, c2);

      const spec1 = this.specialGrid[r1][c1];
      const spec2 = this.specialGrid[r2][c2];

      if (spec1 && spec2) {
        this.registerMove();
        await this.resolveSpecialComboSwap(r1, c1, r2, c2, spec1, spec2);
        return;
      }

      if (spec1 || spec2) {
        const sr = spec1 ? r1 : r2;
        const sc = spec1 ? c1 : c2;
        const partnerR = spec1 ? r2 : r1;
        const partnerC = spec1 ? c2 : c1;
        const special = spec1 || spec2;
        this.registerMove();
        await this.resolveSpecialActivation(sr, sc, special, this.grid[partnerR][partnerC], 1);
        return;
      }

      const matches = this.findMatches(this.grid);
      if (matches.length === 0) {
        await this.waitAnim('swap', C.SWAP_ANIM_MS, { r1, c1, r2, c2, reverse: true });
        this.swapCellsBoth(r1, c1, r2, c2);
        this.boardState = 'idle';
        this.lastSwapCell = null;
        if (typeof haptic === 'function') haptic('error');
        return;
      }

      this.registerMove();
      this.boardState = 'resolving';
      await this.resolveCascades(1);
    }

    async useBomb(r, c) {
      if (this.boardState !== 'idle' || this.gameState.state !== 'playing') return;
      if (this.charges.bomb <= 0) { if (typeof haptic === 'function') haptic('error'); return; }
      this.charges.bomb--;
      this.updateAbilityUI();
      this.resetIdle();
      this.registerMove();
      this.boardState = 'resolving';
      this.lastSwapCell = null;
      const clearSet = new Set();
      this.applySingleExplosion(clearSet, r, c, C.SPECIAL.NOVA);
      const activations = this.processSpecialExplosions(clearSet);
      this.triggerShake(0.9);
      if (typeof haptic === 'function') haptic('heavy');
      if (typeof playSfx === 'function') playSfx('prismcascade.bomb', { volume: 0.65 });
      this.scoreMatches([], 1, clearSet.size, activations);
      const clearedColors = await this.clearAndFall(clearSet, new Map());
      this.trackGoals(clearedColors, activations, 1);
      await this.resolveCascades(1);
    }

    async useHammer(r, c) {
      if (this.boardState !== 'idle' || this.gameState.state !== 'playing') return;
      if (this.charges.hammer <= 0) { if (typeof haptic === 'function') haptic('error'); return; }
      if (this.grid[r][c] < 0 && !(this.blockGrid[r][c] && this.blockGrid[r][c].type === 'crate')) { if (typeof haptic === 'function') haptic('error'); return; }

      this.charges.hammer--;
      this.updateAbilityUI();
      this.resetIdle();
      this.registerMove();
      this.boardState = 'resolving';
      this.lastSwapCell = null;
      if (typeof haptic === 'function') haptic('medium');
      if (typeof playSfx === 'function') playSfx('prismcascade.hammer', { volume: 0.5 });

      if (this.grid[r][c] < 0 && this.blockGrid[r][c] && this.blockGrid[r][c].type === 'crate') {
        this.blockGrid[r][c] = null;
        this.cratesDestroyed++;
        const pos = this.cellCenter(r, c);
        this.burstParticles(pos.x, pos.y, '#d9a066', 16);
        const falls = this.applyGravity(this.grid);
        await this.waitAnim('fall', C.FALL_ANIM_MS, { falls });
        this.trackGoals([], [], 1);
        await this.resolveCascades(1);
        return;
      }

      const clearSet = new Set();
      this.addToClearSet(clearSet, r, c);
      const activations = this.processSpecialExplosions(clearSet);
      this.scoreMatches([], 1, clearSet.size, activations);
      const clearedColors = await this.clearAndFall(clearSet, new Map());
      this.trackGoals(clearedColors, activations, 1);
      await this.resolveCascades(1);
    }

    async useShuffle() {
      if (this.boardState !== 'idle' || this.gameState.state !== 'playing') return;
      const now = performance.now();
      if (now - this.shuffleCooldown < 1500) { if (typeof haptic === 'function') haptic('error'); return; }
      this.shuffleCooldown = now;
      this.resetIdle();
      this.timeLeft = Math.max(0, this.timeLeft - 5);
      this.updateHeaderUI();
      this.addFloatText(this.W() / 2, this.H() * 0.5, '-5s SHUFFLE', '#ff8800');
      if (typeof haptic === 'function') haptic('medium');
      if (typeof playSfx === 'function') playSfx('prismcascade.shuffle', { volume: 0.45 });
      this.boardState = 'noMoves';
      const host = this.ui.gameContainer || (this.canvas && this.canvas.parentElement);
      if (host) host.classList.add('reshuffle-flash');
      this.reshuffleFlash = 1;
      this.shuffleBoard(this.grid);
      await this.waitAnim('reshuffle', 400, {});
      if (host) host.classList.remove('reshuffle-flash');
      this.reshuffleFlash = 0;
      this.boardState = 'resolving';
      await this.resolveCascades(1);
    }

    armTool(tool) {
      if (this.gameState.state !== 'playing' || this.boardState !== 'idle') { if (typeof haptic === 'function') haptic('error'); return; }
      if (this.charges[tool] <= 0) { if (typeof haptic === 'function') haptic('error'); return; }
      this.activeTool = this.activeTool === tool ? null : tool;
      this.selectedCell = null;
      this.selectedAt = 0;
      this.resetIdle();
      this.updateAbilityUI();
      if (typeof haptic === 'function') haptic('light');
    }

    startTimer() {
      this.stopTimer();
      this.updateHeaderUI();
      this.timerInterval = setInterval(() => {
        if (this.gameState.state !== 'playing') return;
        const useTime = this.mode === 'infinite' || (this.levelConfig && this.levelConfig.mode === 'time');
        if (!useTime) return;
        this.timeLeft -= 1;
        this.elapsed += 1;
        this.updateTier();
        this.updateHeaderUI();
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.updateHeaderUI();
          if (this.mode === 'infinite') this.endInfinite();
          else this.loseLevel();
        }
      }, 1000);
    }

    stopTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }

    handleTap(cell) {
      if (this.boardState !== 'idle' || this.gameState.state !== 'playing') return;
      this.resetIdle();

      if (this.activeTool) {
        const tool = this.activeTool;
        this.activeTool = null;
        this.selectedCell = null;
        this.selectedAt = 0;
        this.updateAbilityUI();
        if (tool === 'bomb') this.useBomb(cell.r, cell.c);
        else if (tool === 'hammer') this.useHammer(cell.r, cell.c);
        return;
      }

      if (this.grid[cell.r][cell.c] < 0) { if (typeof haptic === 'function') haptic('error'); return; }
      if (this.blockGrid[cell.r][cell.c] && this.blockGrid[cell.r][cell.c].type === 'ice') {
        const pos = this.cellCenter(cell.r, cell.c);
        this.addFloatText(pos.x, pos.y - 16, 'FROZEN!', '#bfefff');
        if (typeof haptic === 'function') haptic('error');
        return;
      }

      if (!this.selectedCell) {
        this.selectedCell = { r: cell.r, c: cell.c };
        this.selectedAt = performance.now();
        if (typeof hapticLight === 'function') hapticLight();
        return;
      }

      if (this.selectedCell.r === cell.r && this.selectedCell.c === cell.c) {
        this.selectedCell = null;
        this.selectedAt = 0;
        if (typeof hapticLight === 'function') hapticLight();
        return;
      }

      if (this.isAdjacent(this.selectedCell, cell)) {
        const r1 = this.selectedCell.r;
        const c1 = this.selectedCell.c;
        this.selectedCell = null;
        this.selectedAt = 0;
        this.trySwap(r1, c1, cell.r, cell.c);
        return;
      }

      this.selectedCell = { r: cell.r, c: cell.c };
      this.selectedAt = performance.now();
      if (typeof hapticLight === 'function') hapticLight();
    }

    bindEvents() {
      if (this._eventsBound) return;
      this._eventsBound = true;

      if (this.canvas) {
        this.canvas.addEventListener('pointerdown', (e) => {
          if (this.boardState !== 'idle' || this.gameState.state !== 'playing') return;
          e.preventDefault();
          this.gridMetrics = this.computeGridMetrics();
          const cell = this.getCellFromPointer(e);
          if (!cell) return;
          this.resetIdle();
          this.pointerDown = { r: cell.r, c: cell.c, x: e.clientX, y: e.clientY, id: e.pointerId };
          this.pressedCell = { r: cell.r, c: cell.c };
          this.pressedAt = performance.now();
          this.dragHandled = false;
          this.canvas.setPointerCapture(e.pointerId);
        });

        this.canvas.addEventListener('pointermove', (e) => {
          if (!this.pointerDown || this.dragHandled || this.pointerDown.id !== e.pointerId) return;
          if (this.activeTool) return;
          const dx = e.clientX - this.pointerDown.x;
          const dy = e.clientY - this.pointerDown.y;
          const threshold = this.getDragThreshold();
          if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

          let dr = 0;
          let dc = 0;
          if (Math.abs(dx) > Math.abs(dy)) dc = dx > 0 ? 1 : -1;
          else dr = dy > 0 ? 1 : -1;

          const r2 = this.pointerDown.r + dr;
          const c2 = this.pointerDown.c + dc;
          if (r2 >= 0 && r2 < C.GRID_SIZE && c2 >= 0 && c2 < C.GRID_SIZE) {
            this.dragHandled = true;
            const r1 = this.pointerDown.r;
            const c1 = this.pointerDown.c;
            this.selectedCell = null;
            this.selectedAt = 0;
            this.pressedCell = null;
            this.pressedAt = 0;
            this.trySwap(r1, c1, r2, c2);
          }
        });

        const releasePointer = (e) => {
          if (!this.pointerDown || this.pointerDown.id !== e.pointerId) return;
          if (!this.dragHandled) {
            this.gridMetrics = this.computeGridMetrics();
            const releaseCell = this.getCellFromPointer(e);
            const cell = releaseCell || { r: this.pointerDown.r, c: this.pointerDown.c };
            this.handleTap(cell);
          }
          this.pointerDown = null;
          this.pressedCell = null;
          this.pressedAt = 0;
          try { this.canvas.releasePointerCapture(e.pointerId); } catch (_e) {}
        };

        this.canvas.addEventListener('pointerup', releasePointer);
        this.canvas.addEventListener('pointercancel', releasePointer);
      }

      if (this.ui.abilityBomb) this.ui.abilityBomb.addEventListener('click', () => this.armTool('bomb'));
      if (this.ui.abilityHammer) this.ui.abilityHammer.addEventListener('click', () => this.armTool('hammer'));
      if (this.ui.abilityShuffle) this.ui.abilityShuffle.addEventListener('click', () => this.useShuffle());

      if (this.ui.levelSelect) {
        this.ui.levelSelect.addEventListener('click', (e) => {
          const btn = e.target && e.target.closest ? e.target.closest('[data-level-id]') : null;
          if (!btn) return;
          const idRaw = btn.getAttribute('data-level-id');
          if (!idRaw) return;
          const id = idRaw === 'infinite' ? 'infinite' : Number(idRaw);
          if (id !== 'infinite' && !L.isLevelUnlocked(id, this.progress)) return;
          this.startLevel(id);
          if (typeof unlockAudio === 'function') unlockAudio();
          if (typeof haptic === 'function') haptic('medium');
        });
      }

      if (this.ui.introStartBtn) {
        this.ui.introStartBtn.addEventListener('click', () => {
          if (this.levelId != null) this.startLevel(this.levelId);
        });
      }

      if (this.ui.winNextBtn) {
        this.ui.winNextBtn.addEventListener('click', () => {
          if (typeof this.levelId !== 'number') {
            this.showLevelSelect();
            return;
          }
          const nextId = this.levelId + 1;
          if (L.getLevel(nextId) && L.isLevelUnlocked(nextId, this.progress)) this.startLevel(nextId);
          else this.showLevelSelect();
        });
      }
      if (this.ui.winRetryBtn) this.ui.winRetryBtn.addEventListener('click', () => this.startLevel(this.levelId));
      if (this.ui.winMenuBtn) this.ui.winMenuBtn.addEventListener('click', () => this.showLevelSelect());
      if (this.ui.gameoverRetryBtn) this.ui.gameoverRetryBtn.addEventListener('click', () => this.startLevel(this.levelId));
    }

    update(dt) {
      this.updateParticles(dt);
      if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - 0.08 * (dt / 16.67));

      if (this.gameState.state === 'playing' && this.boardState === 'idle' && !this.anim && !this.activeTool && !this.selectedCell) {
        if (!this.hintCells && !this.hintPending && performance.now() - this.lastActionAt > 5000) this.scheduleHintMove();
      } else if (this.hintCells && (this.selectedCell || this.activeTool || this.boardState !== 'idle')) {
        this.hintCells = null;
        this.hintPending = false;
      }
    }

    draw(now) {
      if (this._shouldSkipDrawFrame()) return;
      if (!this.gridMetrics) this.gridMetrics = this.computeGridMetrics();
      if (!this.ctx) return;
      const ctx = this.ctx;
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, this.W(), this.H());

      if (this.reshuffleFlash > 0) {
        ctx.fillStyle = 'rgba(170, 0, 255, ' + (this.reshuffleFlash * 0.12) + ')';
        ctx.fillRect(0, 0, this.W(), this.H());
      }

      let shakeX = 0;
      let shakeY = 0;
      if (this.screenShake > 0) {
        shakeX = (Math.random() - 0.5) * this.screenShake * 10;
        shakeY = (Math.random() - 0.5) * this.screenShake * 10;
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);
      this.renderer.drawBoard(now);
      if (typeof this.renderer.drawParticles === 'function') this.renderer.drawParticles(ctx, this.particles);
      if (typeof this.renderer.drawFloatTexts === 'function') this.renderer.drawFloatTexts(ctx, this.floatTexts);
      ctx.restore();

      this.checkAnimComplete(now);
    }

    init() {
      this.bindEvents();
      this.gridMetrics = this.computeGridMetrics();
      this.progress = L.loadProgress();
      this.gameState.best = typeof getHighScore === 'function' ? getHighScore(C.GAME_ID) : this.gameState.best;
      this.gameState.infiniteBest = this.progress.infiniteBest || 0;
      this.initBoard();
      this.showLevelSelect();

      if (!this.loop && typeof createGameLoop === 'function') {
        this.loop = createGameLoop(
          (dt) => this.update(dt),
          (time) => this.draw(time),
          { shouldRun: () => this.gameState.state !== 'levelSelect' }
        );
      }
      this._syncRenderLoop();
    }
  }

  window.PrismCascadeGame = PrismCascadeGame;
})();
