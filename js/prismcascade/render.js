(function () {
  const C = window.PrismCascadeConstants;

  class PrismCascadeRenderer {
    constructor(canvas, game) {
      this.canvas = canvas;
      this.game = game;
      this.ctx = canvas.getContext("2d");
      this.gemGradCache = new Map();
    }

    easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    getSelectionScale(now) {
      const selectedAt = this.game.selectedAt || 0;
      if (!selectedAt) return 1;
      const elapsed = now - selectedAt;
      if (elapsed > C.SELECT_PULSE_MS) return 1;
      const pulseT = Math.min(1, elapsed / 120);
      const c = 1.70158;
      const easeOutBack = 1 + (c + 1) * Math.pow(pulseT - 1, 3) + c * Math.pow(pulseT - 1, 2);
      return 1 + 0.15 * (1 - elapsed / C.SELECT_PULSE_MS) * easeOutBack;
    }

    getPressScale(now) {
      const pressedAt = this.game.pressedAt || 0;
      if (!pressedAt) return 1;
      const elapsed = now - pressedAt;
      if (elapsed > C.PRESS_PULSE_MS) return 1;
      const t = elapsed / C.PRESS_PULSE_MS;
      const c = 1.70158;
      const easeOutBack = 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
      return 1 + 0.12 * easeOutBack;
    }

    traceGemPath(ctx, def, x, y, s) {
      if (def.shape === "circle") {
        ctx.arc(x, y, s * 0.38, 0, Math.PI * 2);
      } else if (def.shape === "diamond") {
        ctx.moveTo(x, y - s * 0.42);
        ctx.lineTo(x + s * 0.34, y);
        ctx.lineTo(x, y + s * 0.42);
        ctx.lineTo(x - s * 0.34, y);
        ctx.closePath();
      } else if (def.shape === "triangle") {
        ctx.moveTo(x, y - s * 0.4);
        ctx.lineTo(x + s * 0.36, y + s * 0.28);
        ctx.lineTo(x - s * 0.36, y + s * 0.28);
        ctx.closePath();
      } else if (def.shape === "hex") {
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          const px = x + Math.cos(a) * s * 0.36;
          const py = y + Math.sin(a) * s * 0.36;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else if (def.shape === "star") {
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

    getGemGradient(ctx, def, s, cache) {
      const bucket = Math.max(8, Math.round(s / 4) * 4);
      const key = def.color + ":" + bucket;
      let grad = cache.get(key);
      if (!grad) {
        grad = ctx.createRadialGradient(
          -bucket * 0.12, -bucket * 0.14, bucket * 0.05,
          0, 0, bucket * 0.42
        );
        grad.addColorStop(0, def.rim);
        grad.addColorStop(0.35, def.color);
        grad.addColorStop(1, def.core);
        cache.set(key, grad);
      }
      return grad;
    }

    drawGemShape(ctx, def, x, y, size, alpha, scale, now, r, c) {
      const PERF_SHADOWS = !window.ArcadePerf || window.ArcadePerf.shadows !== false;
      const a = alpha == null ? 1 : alpha;
      const s = size * (scale || 1);
      const shimmer = 0.5 + 0.5 * Math.sin(now * 0.003 + r + c);

      ctx.save();
      ctx.globalAlpha = a;

      ctx.fillStyle = def.pad;
      ctx.beginPath();
      ctx.arc(x, y, s * 0.47, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(x, y);
      if (PERF_SHADOWS) {
        ctx.shadowColor = def.color;
        ctx.shadowBlur = 18;
      }
      ctx.beginPath();
      this.traceGemPath(ctx, def, 0, 0, s);
      ctx.fillStyle = this.getGemGradient(ctx, def, s, this.gemGradCache);
      ctx.fill();

      ctx.save();
      ctx.clip();
      const sheen = ctx.createLinearGradient(-s * 0.45, -s * 0.45, s * 0.3, s * 0.35);
      sheen.addColorStop(0, "rgba(255, 255, 255, 0.46)");
      sheen.addColorStop(0.5, "rgba(255, 255, 255, 0.12)");
      sheen.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = sheen;
      ctx.beginPath();
      this.traceGemPath(ctx, def, -s * 0.02, -s * 0.02, s * 0.74);
      ctx.fill();

      const facetAlpha = 0.2 + shimmer * 0.2;
      ctx.fillStyle = "rgba(255, 255, 255, " + facetAlpha.toFixed(3) + ")";
      ctx.beginPath();
      this.traceGemPath(ctx, def, s * 0.08, s * 0.06, s * 0.5);
      ctx.fill();
      ctx.restore();
      ctx.restore();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      this.traceGemPath(ctx, def, x, y, s);
      ctx.stroke();

      const rimHue = Math.round((now * 0.03 + (r + c) * 6) % 360);
      ctx.strokeStyle = "hsla(" + rimHue + ", 100%, 75%, " + (0.48 + shimmer * 0.32).toFixed(3) + ")";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      this.traceGemPath(ctx, def, x, y, s);
      ctx.stroke();

      ctx.strokeStyle = def.rim;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      this.traceGemPath(ctx, def, x, y, s * (0.94 + shimmer * 0.02));
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, " + (0.24 + shimmer * 0.22).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(x - s * 0.1, y - s * 0.14, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawSpecialOverlay(ctx, special, x, y, size, alpha, now, constants) {
      const PERF_SHADOWS = !window.ArcadePerf || window.ArcadePerf.shadows !== false;
      const a = alpha == null ? 1 : alpha;
      const s = size;
      const pulse = 1 + 0.06 * Math.sin(now * 0.008);

      ctx.save();
      ctx.globalAlpha = a;

      if (special === constants.SPECIAL.NOVA) {
        ctx.strokeStyle = "#ff4466";
        ctx.lineWidth = 2.5;
        if (PERF_SHADOWS) {
          ctx.shadowColor = "#ff2244";
          ctx.shadowBlur = 16;
        }
        ctx.beginPath();
        ctx.arc(x, y, s * 0.22 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, s * 0.38 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      } else if (special === constants.SPECIAL.BEAM_H) {
        ctx.strokeStyle = "#00f5ff";
        ctx.lineWidth = 3;
        if (PERF_SHADOWS) {
          ctx.shadowColor = "#00f5ff";
          ctx.shadowBlur = 14;
        }
        ctx.beginPath();
        ctx.moveTo(x - s * 0.42, y);
        ctx.lineTo(x + s * 0.42, y);
        ctx.stroke();
      } else if (special === constants.SPECIAL.BEAM_V) {
        ctx.strokeStyle = "#00f5ff";
        ctx.lineWidth = 3;
        if (PERF_SHADOWS) {
          ctx.shadowColor = "#00f5ff";
          ctx.shadowBlur = 14;
        }
        ctx.beginPath();
        ctx.moveTo(x, y - s * 0.42);
        ctx.lineTo(x, y + s * 0.42);
        ctx.stroke();
      } else if (special === constants.SPECIAL.PRISM) {
        const hue = (now * 0.12) % 360;
        ctx.strokeStyle = "hsl(" + hue.toFixed(1) + ", 100%, 70%)";
        ctx.lineWidth = 2.5;
        if (PERF_SHADOWS) {
          ctx.shadowColor = "#ffffff";
          ctx.shadowBlur = 18;
        }
        ctx.beginPath();
        ctx.arc(x, y, s * 0.4 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      } else if (special === constants.SPECIAL.CROSS) {
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 2.5;
        if (PERF_SHADOWS) {
          ctx.shadowColor = "#ffff00";
          ctx.shadowBlur = 16;
        }
        ctx.beginPath();
        ctx.moveTo(x - s * 0.36, y);
        ctx.lineTo(x + s * 0.36, y);
        ctx.moveTo(x, y - s * 0.36);
        ctx.lineTo(x, y + s * 0.36);
        ctx.stroke();
      } else if (special === constants.SPECIAL.CHRONO) {
        ctx.strokeStyle = "#39ff14";
        ctx.lineWidth = 2;
        if (PERF_SHADOWS) {
          ctx.shadowColor = "#39ff14";
          ctx.shadowBlur = 14;
        }
        ctx.beginPath();
        ctx.arc(x, y, s * 0.28 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.restore();
    }

    drawCellSlots(ctx, m, constants, PERF_REDUCED) {
      for (let r = 0; r < constants.GRID_SIZE; r++) {
        for (let c = 0; c < constants.GRID_SIZE; c++) {
          const x = m.offsetX + c * m.cellSize;
          const y = m.offsetY + r * m.cellSize;
          const inset = 4;
          const w = m.cellSize - inset * 2;
          const h = m.cellSize - inset * 2;

          const g = ctx.createLinearGradient(x, y, x + m.cellSize, y + m.cellSize);
          if ((r + c) % 2 === 0) {
            g.addColorStop(0, "rgba(30, 16, 52, 0.92)");
            g.addColorStop(0.45, "rgba(16, 8, 34, 0.96)");
            g.addColorStop(1, "rgba(10, 4, 22, 0.96)");
          } else {
            g.addColorStop(0, "rgba(40, 18, 64, 0.9)");
            g.addColorStop(0.4, "rgba(20, 10, 40, 0.95)");
            g.addColorStop(1, "rgba(12, 6, 28, 0.95)");
          }
          ctx.fillStyle = g;
          roundRect(ctx, x + inset, y + inset, w, h, 7);
          ctx.fill();

          if (!PERF_REDUCED) {
            const gloss = ctx.createLinearGradient(x, y + inset, x, y + inset + h);
            gloss.addColorStop(0, "rgba(255, 255, 255, 0.12)");
            gloss.addColorStop(0.5, "rgba(255, 255, 255, 0.02)");
            gloss.addColorStop(1, "rgba(255, 255, 255, 0)");
            ctx.fillStyle = gloss;
            roundRect(ctx, x + inset + 1, y + inset + 1, w - 2, h * 0.48, 6);
            ctx.fill();

            ctx.strokeStyle = "rgba(170, 0, 255, 0.22)";
            ctx.lineWidth = 1;
            roundRect(ctx, x + inset, y + inset, w, h, 7);
            ctx.stroke();

            ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
            ctx.lineWidth = 1;
            roundRect(ctx, x + inset + 1, y + inset + 1, w - 2, h - 2, 6);
            ctx.stroke();
          }
        }
      }
    }

    drawCrate(ctx, x, y, size, hp) {
      ctx.save();
      const s = size;
      const half = s * 0.42;
      ctx.fillStyle = "#5a3d22";
      roundRect(ctx, x - half, y - half, half * 2, half * 2, 5);
      ctx.fill();

      const grad = ctx.createLinearGradient(x - half, y - half, x + half, y + half);
      grad.addColorStop(0, "#a9763f");
      grad.addColorStop(0.5, "#d9a066");
      grad.addColorStop(1, "#8a5c30");
      ctx.fillStyle = grad;
      roundRect(ctx, x - half * 0.88, y - half * 0.88, half * 1.76, half * 1.76, 4);
      ctx.fill();

      ctx.strokeStyle = "rgba(60, 38, 18, 0.9)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - half * 0.88, y - half * 0.88);
      ctx.lineTo(x + half * 0.88, y + half * 0.88);
      ctx.moveTo(x + half * 0.88, y - half * 0.88);
      ctx.lineTo(x - half * 0.88, y + half * 0.88);
      ctx.stroke();

      if (hp <= 1) {
        ctx.strokeStyle = "rgba(20, 10, 4, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - half * 0.4, y - half * 0.6);
        ctx.lineTo(x - half * 0.1, y);
        ctx.lineTo(x - half * 0.3, y + half * 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawIce(ctx, x, y, size, alpha, hp) {
      ctx.save();
      ctx.globalAlpha = (alpha == null ? 1 : alpha) * (hp >= 2 ? 0.62 : 0.42);
      const s = size;
      const half = s * 0.46;
      const grad = ctx.createLinearGradient(x - half, y - half, x + half, y + half);
      grad.addColorStop(0, "rgba(220, 250, 255, 0.9)");
      grad.addColorStop(0.5, "rgba(150, 220, 255, 0.55)");
      grad.addColorStop(1, "rgba(190, 240, 255, 0.85)");
      ctx.fillStyle = grad;
      roundRect(ctx, x - half, y - half, half * 2, half * 2, 6);
      ctx.fill();

      ctx.globalAlpha = (alpha == null ? 1 : alpha) * 0.9;
      ctx.strokeStyle = "#dffbff";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#bfefff";
      ctx.shadowBlur = 10;
      roundRect(ctx, x - half, y - half, half * 2, half * 2, 6);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    drawBoard(now) {
      if (!this.game || !this.game.gridMetrics) return;

      const ctx = this.ctx;
      const game = this.game;
      const m = game.gridMetrics;
      const grid = game.grid;
      const blockGrid = game.blockGrid;
      const specialGrid = game.specialGrid;
      const PERF_REDUCED = !!(window.ArcadePerf && window.ArcadePerf.reducedEffects);

      ctx.fillStyle = "rgba(10, 2, 18, 0.85)";
      roundRect(ctx, m.offsetX - 6, m.offsetY - 6, m.size + 12, m.size + 12, 10);
      ctx.fill();

      ctx.strokeStyle = "rgba(170, 0, 255, 0.45)";
      ctx.lineWidth = 2;
      roundRect(ctx, m.offsetX - 6, m.offsetY - 6, m.size + 12, m.size + 12, 10);
      ctx.stroke();

      this.drawCellSlots(ctx, m, C, PERF_REDUCED);

      ctx.strokeStyle = "rgba(170, 0, 255, 0.12)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= C.GRID_SIZE; i++) {
        const x = m.offsetX + i * m.cellSize;
        const y = m.offsetY + i * m.cellSize;
        ctx.beginPath();
        ctx.moveTo(x, m.offsetY);
        ctx.lineTo(x, m.offsetY + m.size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(m.offsetX, y);
        ctx.lineTo(m.offsetX + m.size, y);
        ctx.stroke();
      }

      const anim = game.anim;
      const clearSet = anim && anim.type === "clear" ? anim.clearSet : null;
      const animDur = anim ? anim.duration : 1;
      const clearT = anim && anim.type === "clear" ? this.easeOutCubic(Math.min(1, (now - anim.start) / animDur)) : 0;
      const swapT = anim && anim.type === "swap" ? this.easeOutCubic(Math.min(1, (now - anim.start) / animDur)) : 0;
      const fallT = anim && anim.type === "fall" ? this.easeOutCubic(Math.min(1, (now - anim.start) / animDur)) : 0;

      if (!Array.isArray(grid) || grid.length < C.GRID_SIZE) return;

      for (let r = 0; r < C.GRID_SIZE; r++) {
        if (!Array.isArray(grid[r])) continue;
        for (let c = 0; c < C.GRID_SIZE; c++) {
          let type = grid[r][c];

          if (type < 0) {
            const blk = blockGrid && blockGrid[r] ? blockGrid[r][c] : null;
            if (blk && blk.type === "crate") {
              let drawRc = r;
              if (anim && anim.type === "fall" && Array.isArray(anim.falls)) {
                const fall = anim.falls.find(function (f) {
                  return f.toR === r && f.c === c;
                });
                if (fall) {
                  const fromR = fall.fromR < 0 ? -1.2 : fall.fromR;
                  drawRc = fromR + (fall.toR - fromR) * fallT;
                }
              }
              const cx = m.offsetX + c * m.cellSize + m.cellSize / 2;
              const cy = m.offsetY + drawRc * m.cellSize + m.cellSize / 2;
              this.drawCrate(ctx, cx, cy, m.cellSize * C.GEM_SIZE_RATIO, blk.hp);
            }
            continue;
          }

          let drawR = r;
          let drawC = c;
          let alpha = 1;
          let scale = 1;

          if (anim && anim.type === "swap") {
            const r1 = anim.r1;
            const c1 = anim.c1;
            const r2 = anim.r2;
            const c2 = anim.c2;
            const reverse = anim.reverse;
            if (r === r1 && c === c1) {
              if (reverse) {
                drawR = r2 + (r1 - r2) * swapT;
                drawC = c2 + (c1 - c2) * swapT;
              } else {
                drawR = r + (r2 - r1) * swapT;
                drawC = c + (c2 - c1) * swapT;
              }
            } else if (r === r2 && c === c2) {
              if (reverse) {
                drawR = r1 + (r2 - r1) * swapT;
                drawC = c1 + (c2 - c1) * swapT;
              } else {
                drawR = r + (r1 - r2) * swapT;
                drawC = c + (c1 - c2) * swapT;
              }
            }
          }

          if (anim && anim.type === "fall" && Array.isArray(anim.falls)) {
            const fall = anim.falls.find(function (f) {
              return f.toR === r && f.c === c;
            });
            if (fall) {
              const fromR = fall.fromR < 0 ? -1.2 : fall.fromR;
              drawR = fromR + (fall.toR - fromR) * fallT;
            }
          }

          if (clearSet && clearSet.has(r + "," + c)) {
            alpha = 1 - clearT;
            scale = 1 + clearT * 0.35;
          }

          if (game.selectedCell && game.selectedCell.r === r && game.selectedCell.c === c && game.boardState === "idle") {
            scale *= this.getSelectionScale(now);
          }
          if (game.pressedCell && game.pressedCell.r === r && game.pressedCell.c === c && game.boardState === "idle") {
            scale *= this.getPressScale(now);
          }

          const pos = {
            x: m.offsetX + drawC * m.cellSize + m.cellSize / 2,
            y: m.offsetY + drawR * m.cellSize + m.cellSize / 2,
            size: m.cellSize * C.GEM_SIZE_RATIO
          };

          this.drawGemShape(ctx, C.GEM_DEFS[type], pos.x, pos.y, pos.size, alpha, scale, now, r, c);

          const special = specialGrid && specialGrid[r] ? specialGrid[r][c] : null;
          if (special && alpha > 0.05) {
            this.drawSpecialOverlay(ctx, special, pos.x, pos.y, pos.size * scale, alpha, now, C);
          }

          const blk = blockGrid && blockGrid[r] ? blockGrid[r][c] : null;
          if (blk && blk.type === "ice" && alpha > 0.05) {
            this.drawIce(ctx, pos.x, pos.y, pos.size * scale, alpha, blk.hp);
          }

          if (game.selectedCell && game.selectedCell.r === r && game.selectedCell.c === c && game.boardState === "idle") {
            ctx.save();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2.5;
            ctx.shadowColor = "#ffffff";
            ctx.shadowBlur = 14;
            roundRect(ctx, pos.x - pos.size * 0.5, pos.y - pos.size * 0.5, pos.size, pos.size, 8);
            ctx.stroke();
            ctx.strokeStyle = C.GEM_DEFS[type].color;
            ctx.shadowColor = C.GEM_DEFS[type].color;
            ctx.shadowBlur = 18;
            roundRect(ctx, pos.x - pos.size * 0.44, pos.y - pos.size * 0.44, pos.size * 0.88, pos.size * 0.88, 7);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      if (Array.isArray(game.hintCells) && game.boardState === "idle" && game.gameState && game.gameState.state === "playing") {
        const hintAlpha = 0.4 + 0.4 * Math.sin(now * 0.006);
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, " + hintAlpha.toFixed(3) + ")";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 16;
        game.hintCells.forEach(function (hc) {
          const x = m.offsetX + hc.c * m.cellSize + 4;
          const y = m.offsetY + hc.r * m.cellSize + 4;
          roundRect(ctx, x, y, m.cellSize - 8, m.cellSize - 8, 8);
          ctx.stroke();
        });
        ctx.restore();
      }

      if (anim && anim.type === "clear" && clearT >= 1) {
        anim.particlesSpawned = true;
      }
    }

    drawParticles(ctx, particles) {
      particles.forEach(function (p) {
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

    drawFloatTexts(ctx, floatTexts) {
      floatTexts.forEach(function (f) {
        ctx.save();
        ctx.globalAlpha = f.life;
        ctx.font = "bold 22px 'Orbitron', sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = f.color;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 14;
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      });
    }
  }

  window.PrismCascadeRender = { PrismCascadeRenderer: PrismCascadeRenderer };
})();
