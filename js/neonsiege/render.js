(function () {
  const B = window.NeonSiegeBalance;
  const C = window.NeonSiegeConstants;
  const Placement = window.NeonSiegePlacement;

  function perfShadows() {
    return !window.ArcadePerf || window.ArcadePerf.shadows !== false;
  }

  function perfReduced() {
    return !!(window.ArcadePerf && window.ArcadePerf.reducedEffects);
  }

  function applyShadow(ctx, color, blur) {
    if (perfShadows()) {
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
    }
  }

  class NeonSiegeRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.frame = 0;
      this._bgCanvas = null;
      this._bgKey = '';
    }

    get W() { return this.canvas.width; }
    get H() { return this.canvas.height; }

    draw(state) {
      this.frame++;
      const ctx = this.ctx;
      ctx.save();
      if (state.shake > 0.4) {
        ctx.translate(
          (Math.random() - 0.5) * state.shake,
          (Math.random() - 0.5) * state.shake
        );
      }
      this._drawBackground(state.metrics);
      this._drawMap(state);
      this._drawBuildModeRanges(state);
      this._drawPlacementGhost(state);
      state.towers.forEach((t) => this._drawTower(t, state));
      this._drawEnemies(state);
      this._drawProjectiles(state);
      this._drawParticles(state);
      this._drawRingFx(state);
      this._drawChainFx(state);
      this._drawFloatingTexts(state);
      this._drawSpawnPortal(state);
      ctx.restore();
      this._drawScreenFlash(state);
    }

    _drawBackground(m) {
      const key = [m.offsetX, m.offsetY, m.gridW, m.gridH, m.cellSize, this.W, this.H].join('|');
      if (!this._bgCanvas || this._bgKey !== key) {
        this._bgKey = key;
        if (!this._bgCanvas) this._bgCanvas = document.createElement('canvas');
        this._bgCanvas.width = this.W;
        this._bgCanvas.height = this.H;
        const bctx = this._bgCanvas.getContext('2d');
        bctx.fillStyle = '#050510';
        bctx.fillRect(0, 0, this.W, this.H);
        bctx.strokeStyle = 'rgba(255, 204, 0, 0.04)';
        bctx.lineWidth = 1;
        const step = m.cellSize;
        for (let x = m.offsetX; x <= m.offsetX + m.gridW; x += step) {
          bctx.beginPath();
          bctx.moveTo(x, m.offsetY);
          bctx.lineTo(x, m.offsetY + m.gridH);
          bctx.stroke();
        }
        for (let y = m.offsetY; y <= m.offsetY + m.gridH; y += step) {
          bctx.beginPath();
          bctx.moveTo(m.offsetX, y);
          bctx.lineTo(m.offsetX + m.gridW, y);
          bctx.stroke();
        }
      }
      this.ctx.drawImage(this._bgCanvas, 0, 0);
    }

    _slotClusterSet(mapGrid) {
      const clusters = new Set();
      for (let r = 0; r < C.GRID_ROWS; r++) {
        for (let c = 0; c < C.GRID_COLS; c++) {
          if (mapGrid[r][c] !== C.CELL_SLOT) continue;
          for (const [dr, dc] of [[0, 1], [1, 0]]) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= C.GRID_ROWS || nc >= C.GRID_COLS) continue;
            if (mapGrid[nr][nc] === C.CELL_SLOT) {
              clusters.add(r + ',' + c);
              clusters.add(nr + ',' + nc);
            }
          }
        }
      }
      return clusters;
    }

    _drawMap(state) {
      const ctx = this.ctx;
      const m = state.metrics;
      const cs = m.cellSize;
      const inset = 2;
      const pulse = 0.55 + Math.sin(this.frame * 0.08) * 0.25;
      const highlightSlots = !!state.selectedTowerType;
      const mazeMap = state.mapId === 'random';
      const junctionSet = new Set(
        (state.junctions || []).map(([jr, jc]) => jr + ',' + jc)
      );
      const occupied = state.towerOccupancy || new Set();
      const slotCluster = mazeMap ? this._slotClusterSet(state.mapGrid) : null;

      for (let r = 0; r < C.GRID_ROWS; r++) {
        for (let c = 0; c < C.GRID_COLS; c++) {
          const cell = state.mapGrid[r][c];
          const x = m.offsetX + c * cs;
          const y = m.offsetY + r * cs;
          const w = cs - inset * 2;
          const h = cs - inset * 2;

          if (cell === C.CELL_VOID) {
            if (!mazeMap) continue;
            ctx.fillStyle = 'rgba(8, 8, 20, 0.55)';
            ctx.strokeStyle = 'rgba(40, 50, 80, 0.28)';
            ctx.lineWidth = 1;
            if (typeof roundRect === 'function') roundRect(ctx, x + inset, y + inset, w, h, 3);
            else ctx.rect(x + inset, y + inset, w, h);
            ctx.fill();
            ctx.stroke();
            continue;
          }

          if (cell === C.CELL_PATH) {
            ctx.fillStyle = mazeMap ? 'rgba(255, 204, 0, 0.14)' : 'rgba(255, 204, 0, 0.22)';
            ctx.strokeStyle = mazeMap ? 'rgba(255, 204, 0, 0.58)' : 'rgba(255, 204, 0, 0.45)';
            ctx.lineWidth = mazeMap ? 1.5 : 1;
            if (typeof roundRect === 'function') roundRect(ctx, x + inset, y + inset, w, h, 4);
            else ctx.rect(x + inset, y + inset, w, h);
            ctx.fill();
            ctx.stroke();
            this._drawPathArrow(state, r, c, x, y, cs);
          } else if (cell === C.CELL_TUNNEL) {
            const tunnelPulse = 0.5 + Math.sin(this.frame * 0.1 + r * 0.5) * 0.15;
            ctx.fillStyle = `rgba(120, 40, 200, ${0.28 + tunnelPulse * 0.12})`;
            ctx.strokeStyle = `rgba(180, 80, 255, ${0.5 + tunnelPulse * 0.2})`;
            if (typeof roundRect === 'function') roundRect(ctx, x + inset, y + inset, w, h, 4);
            else ctx.rect(x + inset, y + inset, w, h);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = `rgba(200, 120, 255, ${0.25 + tunnelPulse * 0.15})`;
            ctx.font = `bold ${Math.max(7, cs * 0.18)}px Orbitron`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('▮', x + cs / 2, y + cs / 2);
          } else if (cell === C.CELL_SLOT) {
            const occupiedSlot = occupied.has(r + ',' + c);
            if (!occupiedSlot) {
              const slotKey = r + ',' + c;
              const tierInfo = highlightSlots && state.slotTiers ? state.slotTiers[slotKey] : null;
              const tier = tierInfo ? tierInfo.tier : null;
              const tierColors = tier && Placement ? Placement.TIER_COLORS[tier] : null;
              const slotPulse = mazeMap ? pulse : pulse;
              if (tierColors) {
                ctx.fillStyle = tierColors.fill + (0.08 + slotPulse * 0.06) + ')';
                ctx.strokeStyle = tierColors.stroke;
              } else {
                ctx.fillStyle = highlightSlots
                  ? `rgba(0, 245, 255, ${mazeMap ? 0.12 + slotPulse * 0.08 : 0.08 + slotPulse * 0.06})`
                  : mazeMap ? 'rgba(0, 245, 255, 0.1)' : 'rgba(0, 245, 255, 0.05)';
                ctx.strokeStyle = highlightSlots
                  ? `rgba(0, 245, 255, ${0.5 + slotPulse * 0.35})`
                  : mazeMap ? 'rgba(0, 245, 255, 0.55)' : 'rgba(0, 245, 255, 0.35)';
              }
              ctx.lineWidth = tier === 'A' ? 2 : 1.5;
              ctx.setLineDash([4, 4]);
              if (typeof roundRect === 'function') roundRect(ctx, x + inset, y + inset, w, h, 5);
              else ctx.rect(x + inset, y + inset, w, h);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.fill();
              if (mazeMap && slotCluster && slotCluster.has(r + ',' + c)) {
                ctx.strokeStyle = 'rgba(0, 245, 255, 0.28)';
                ctx.lineWidth = 1.5;
                if (typeof roundRect === 'function') roundRect(ctx, x + inset - 1, y + inset - 1, w + 2, h + 2, 6);
                else ctx.rect(x + inset - 1, y + inset - 1, w + 2, h + 2);
                ctx.stroke();
              }
              const plus = cs * 0.14;
              ctx.strokeStyle = `rgba(0, 245, 255, ${0.45 + pulse * 0.3})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(x + cs / 2 - plus, y + cs / 2);
              ctx.lineTo(x + cs / 2 + plus, y + cs / 2);
              ctx.moveTo(x + cs / 2, y + cs / 2 - plus);
              ctx.lineTo(x + cs / 2, y + cs / 2 + plus);
              ctx.stroke();
              if (tier && highlightSlots) {
                const isHover = state.hoverCell && state.hoverCell.r === r && state.hoverCell.c === c;
                if (isHover) {
                  ctx.fillStyle = tierColors ? tierColors.stroke : '#00f5ff';
                  ctx.font = `bold ${Math.max(8, cs * 0.22)}px Orbitron`;
                  ctx.textAlign = 'right';
                  ctx.textBaseline = 'top';
                  ctx.fillText(tier, x + cs - inset - 2, y + inset + 1);
                }
              }
            } else {
              ctx.fillStyle = 'rgba(20, 20, 30, 0.55)';
              if (typeof roundRect === 'function') roundRect(ctx, x + inset, y + inset, w, h, 5);
              else ctx.rect(x + inset, y + inset, w, h);
              ctx.fill();
            }
          }
        }
      }

      const goal = state.pathFinder.waypointPixels[state.pathFinder.waypointPixels.length - 1];
      if (goal) {
        this._drawCoreIcon(goal.x, goal.y, cs, state);
      }

      if (junctionSet.size > 0) {
        const jPulse = 0.6 + Math.sin(this.frame * 0.12) * 0.25;
        for (const jk of junctionSet) {
          const [jr, jc] = jk.split(',').map(Number);
          const jx = m.offsetX + jc * cs + cs / 2;
          const jy = m.offsetY + jr * cs + cs / 2;
          applyShadow(ctx, '#39ff14', 10 * jPulse);
          ctx.strokeStyle = `rgba(57, 255, 20, ${0.55 + jPulse * 0.3})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(jx, jy, cs * 0.28, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }
    }

    _drawPathArrow(state, r, c, x, y, cs) {
      const pf = state.pathFinder;
      if (!pf || !pf.routes) return;
      let next = null;
      for (const route of pf.routes) {
        const wps = route.waypoints;
        const idx = wps.findIndex(([wr, wc]) => wr === r && wc === c);
        if (idx >= 0 && idx < wps.length - 1) {
          next = wps[idx + 1];
          break;
        }
      }
      if (!next) return;
      const [nr, nc] = next;
      const dr = nr - r;
      const dc = nc - c;
      const cx = x + cs / 2;
      const cy = y + cs / 2;
      const sz = cs * 0.12;
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(255, 204, 0, 0.35)';
      ctx.beginPath();
      if (dc > 0) {
        ctx.moveTo(cx + sz, cy);
        ctx.lineTo(cx - sz * 0.5, cy - sz);
        ctx.lineTo(cx - sz * 0.5, cy + sz);
      } else if (dc < 0) {
        ctx.moveTo(cx - sz, cy);
        ctx.lineTo(cx + sz * 0.5, cy - sz);
        ctx.lineTo(cx + sz * 0.5, cy + sz);
      } else if (dr > 0) {
        ctx.moveTo(cx, cy + sz);
        ctx.lineTo(cx - sz, cy - sz * 0.5);
        ctx.lineTo(cx + sz, cy - sz * 0.5);
      } else {
        ctx.moveTo(cx, cy - sz);
        ctx.lineTo(cx - sz, cy + sz * 0.5);
        ctx.lineTo(cx + sz, cy + sz * 0.5);
      }
      ctx.closePath();
      ctx.fill();
    }

    _drawBuildModeRanges(state) {
      if (!state.selectedTowerType) return;
      const def = B.TOWER_TYPES[state.selectedTowerType];
      const stats = B.getTowerStats(state.selectedTowerType, 0);
      const cs = state.metrics.cellSize;
      const rangePx = stats.range * cs;
      const cost = def.cost;
      const canAfford = state.gold >= cost;
      const ctx = this.ctx;
      const hover = state.hoverCell;
      const pulse = 0.35 + Math.sin(this.frame * 0.1) * 0.12;
      const occupied = state.towerOccupancy || new Set();
      const reduced = perfReduced();

      for (let r = 0; r < C.GRID_ROWS; r++) {
        for (let c = 0; c < C.GRID_COLS; c++) {
          if (state.mapGrid[r][c] !== C.CELL_SLOT) continue;
          if (occupied.has(r + ',' + c)) continue;
          if (reduced && (!hover || hover.r !== r || hover.c !== c)) continue;
          const pos = state.pathFinder.cellCenter(r, c);
          const isHover = hover && hover.r === r && hover.c === c;
          const alpha = isHover ? 0.55 : 0.28;
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = canAfford ? def.color : '#ff3344';
          ctx.lineWidth = isHover ? 2 : 1;
          ctx.setLineDash(isHover ? [] : [4, 6]);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, rangePx, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          if (isHover) {
            ctx.globalAlpha = canAfford ? 0.75 : 0.45;
            ctx.fillStyle = canAfford ? def.color : '#ff3344';
            ctx.fillRect(pos.x - cs * 0.22, pos.y - cs * 0.22, cs * 0.44, cs * 0.44);
          } else {
            ctx.globalAlpha = canAfford ? 0.12 : pulse * 0.12;
            ctx.fillStyle = canAfford ? def.color : '#ff3344';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, cs * 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }
    }

    _drawPlacementGhost(state) {
      if (!state.selectedTowerType || !state.hoverCell) return;
      const { r, c } = state.hoverCell;
      if (state.mapGrid[r][c] !== C.CELL_SLOT) return;
      const occupied = state.towerOccupancy || new Set();
      if (occupied.has(r + ',' + c)) return;
      const def = B.TOWER_TYPES[state.selectedTowerType];
      const pos = state.pathFinder.cellCenter(r, c);
      const cs = state.metrics.cellSize;
      const ctx = this.ctx;
      const stats = B.getTowerStats(state.selectedTowerType, 0);
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, stats.range * cs, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    _drawCoreIcon(x, y, cs, state) {
      const ctx = this.ctx;
      const flash = state.coreFlash > 0 ? 1 + state.coreFlash * 2 : 1;
      const critical = state.baseHp <= 5;
      const pulse = critical ? 1 + Math.sin(this.frame * 0.14) * 0.25 : 1;
      const spin = this.frame * 0.04;
      const outerR = cs * (0.4 + (critical ? 0.05 * pulse : 0)) * flash;
      const midR = outerR * 0.72;
      const coreR = outerR * 0.28;

      ctx.save();
      ctx.translate(x, y);

      applyShadow(ctx, '#ff3344', (18 + (critical ? 12 : 0)) * flash * pulse);
      ctx.strokeStyle = `rgba(255, 51, 68, ${0.35 + (state.coreFlash || 0) * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, outerR + cs * 0.06, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 51, 68, ${0.22 + (state.coreFlash || 0) * 0.28})`;
      ctx.strokeStyle = '#ff3344';
      ctx.lineWidth = critical ? 2.5 : 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = spin + (Math.PI / 3) * i - Math.PI / 2;
        const px = Math.cos(a) * midR;
        const py = Math.sin(a) * midR;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.rotate(-spin * 1.6);
      ctx.strokeStyle = 'rgba(255, 120, 130, 0.85)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * midR * 0.55, Math.sin(a) * midR * 0.55);
        ctx.lineTo(Math.cos(a) * midR * 0.92, Math.sin(a) * midR * 0.92);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      applyShadow(ctx, '#ffffff', 8 * flash);
      ctx.fillStyle = critical ? '#fff' : '#ffe0e4';
      ctx.beginPath();
      ctx.arc(0, 0, coreR * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff3344';
      ctx.beginPath();
      ctx.arc(0, 0, coreR * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.restore();
    }

    _parseHexColor(hex) {
      let h = String(hex || '#ffffff').replace('#', '');
      if (h.length === 3) h = h.split('').map((c) => c + c).join('');
      const n = parseInt(h.slice(0, 6), 16);
      if (Number.isNaN(n)) return { r: 255, g: 255, b: 255 };
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    _brightenHex(hex, amount) {
      const { r, g, b } = this._parseHexColor(hex);
      const mix = (c) => Math.round(Math.min(255, c + (255 - c) * amount));
      return 'rgb(' + mix(r) + ',' + mix(g) + ',' + mix(b) + ')';
    }

    _hexAlpha(hex, alpha) {
      const { r, g, b } = this._parseHexColor(hex);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    _towerTierStyle(tier) {
      const t = Math.max(0, tier | 0);
      return {
        brighten: Math.min(0.06 + t * 0.028, 0.36),
        glowExtra: Math.min(t, 10) * 1.5,
        rings: t >= 1 ? 1 + Math.min(Math.floor(t / 3), 3) : 0,
        orbits: t >= 2 ? 1 + Math.min(Math.floor((t - 1) / 4), 2) : 0,
        core: t >= 1,
        coreScale: 0.11 + Math.min(t, 10) * 0.016,
        innerShape: t >= 3,
        spikes: t >= 4,
        halo: t >= 6,
        crown: t >= 8,
      };
    }

    _drawTowerTierDecor(ctx, tower, def, pos, r, cs, style) {
      const color = this._brightenHex(def.color, style.brighten);
      const reduced = perfReduced();

      if (style.innerShape) {
        if (def.shape === 'square') {
          const ir = r * 0.42;
          ctx.strokeStyle = this._hexAlpha(color, 0.55);
          ctx.lineWidth = 1;
          ctx.strokeRect(pos.x - ir, pos.y - ir, ir * 2, ir * 2);
        } else if (def.shape === 'diamond') {
          const ir = r * 0.5;
          ctx.strokeStyle = this._hexAlpha(color, 0.5);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - ir);
          ctx.lineTo(pos.x + ir, pos.y);
          ctx.lineTo(pos.x, pos.y + ir);
          ctx.lineTo(pos.x - ir, pos.y);
          ctx.closePath();
          ctx.stroke();
        } else {
          ctx.fillStyle = this._hexAlpha(color, 0.22);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, r * 0.52, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (style.rings > 0) {
        for (let i = 0; i < style.rings; i++) {
          const rr = r + cs * (0.035 + i * 0.048);
          ctx.strokeStyle = this._hexAlpha(def.color, 0.18 + i * 0.1);
          ctx.lineWidth = i === style.rings - 1 ? 1.5 : 1;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      if (style.core) {
        applyShadow(ctx, def.glow, 3 + style.glowExtra * 0.25);
        ctx.fillStyle = style.brighten > 0.22 ? '#ffffff' : this._hexAlpha('#ffffff', 0.82);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, Math.max(1.5, r * style.coreScale), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (style.orbits > 0) {
        const orbitR = r + cs * 0.11;
        const dotR = Math.max(1.5, cs * 0.034);
        for (let i = 0; i < style.orbits; i++) {
          const phase = reduced
            ? (i * Math.PI * 2) / style.orbits
            : this.frame * (0.028 + i * 0.012) + (i * Math.PI * 2) / style.orbits + tower.id * 0.4;
          const ox = pos.x + Math.cos(phase) * orbitR;
          const oy = pos.y + Math.sin(phase) * orbitR;
          ctx.fillStyle = color;
          applyShadow(ctx, def.glow, 5);
          ctx.beginPath();
          ctx.arc(ox, oy, dotR, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      if (style.spikes) {
        ctx.strokeStyle = this._hexAlpha(color, 0.9);
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const a = (Math.PI / 2) * i + Math.PI / 4;
          const inner = r + 1;
          const outer = r + cs * 0.13;
          ctx.beginPath();
          ctx.moveTo(pos.x + Math.cos(a) * inner, pos.y + Math.sin(a) * inner);
          ctx.lineTo(pos.x + Math.cos(a) * outer, pos.y + Math.sin(a) * outer);
          ctx.stroke();
        }
      }

      if (style.halo) {
        const pulse = reduced ? 0.86 : 0.74 + Math.sin(this.frame * 0.07 + tower.id) * 0.1;
        ctx.strokeStyle = this._hexAlpha(def.glow, 0.28);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, (r + cs * 0.09) * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (style.crown) {
        ctx.strokeStyle = this._hexAlpha('#ffffff', 0.75);
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI / 4) * i - Math.PI / 2;
          const inner = r + cs * 0.11;
          const outer = r + cs * 0.2;
          ctx.beginPath();
          ctx.moveTo(pos.x + Math.cos(a) * inner, pos.y + Math.sin(a) * inner);
          ctx.lineTo(pos.x + Math.cos(a) * outer, pos.y + Math.sin(a) * outer);
          ctx.stroke();
        }
      }
    }

    _drawTower(tower, state) {
      const def = B.TOWER_TYPES[tower.type];
      const pos = state.pathFinder.cellCenter(tower.r, tower.c);
      const cs = state.metrics.cellSize;
      const recoilScale = tower.recoil > 0 ? 1 - (tower.recoil / 0.08) * 0.08 : 1;
      const r = B.towerBodyRadius(cs, tower.tier);
      const ctx = this.ctx;
      const boosted = state.overchargeTimer > 0;
      const tierStyle = this._towerTierStyle(tower.tier);
      const bodyColor = this._brightenHex(def.color, tierStyle.brighten * 0.55);
      const bodyGlow = this._brightenHex(def.glow, tierStyle.brighten * 0.45);

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.scale(recoilScale, recoilScale);
      ctx.translate(-pos.x, -pos.y);

      if (boosted) {
        applyShadow(ctx, '#39ff14', 18);
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      applyShadow(ctx, bodyGlow, 6 + tierStyle.glowExtra);
      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = bodyColor;

      if (def.shape === 'square') {
        ctx.fillRect(pos.x - r, pos.y - r, r * 2, r * 2);
      } else if (def.shape === 'hex') {
        this._hex(pos.x, pos.y, r, bodyColor);
      } else if (def.shape === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - r);
        ctx.lineTo(pos.x + r, pos.y);
        ctx.lineTo(pos.x, pos.y + r);
        ctx.lineTo(pos.x - r, pos.y);
        ctx.closePath();
        ctx.fill();
      } else if (def.shape === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - r);
        ctx.lineTo(pos.x + r, pos.y + r * 0.8);
        ctx.lineTo(pos.x - r, pos.y + r * 0.8);
        ctx.closePath();
        ctx.fill();
      } else if (def.shape === 'coil') {
        for (let ring = 0; ring < 3; ring++) {
          const rr = r * (0.55 + ring * 0.22);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else if (def.shape === 'rail') {
        const ang = tower.aimAngle || 0;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(ang);
        ctx.fillRect(-r * 1.2, -r * 0.22, r * 2.4, r * 0.44);
        ctx.fillRect(r * 0.9, -r * 0.55, r * 0.35, r * 1.1);
        ctx.restore();
      } else if (def.shape === 'mortar') {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(pos.x - r * 0.5, pos.y - r * 0.15, r, r * 0.7);
      } else if (def.shape === 'flak') {
        for (let i = 0; i < 4; i++) {
          const a = (Math.PI / 2) * i + this.frame * 0.04;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(pos.x + Math.cos(a) * r, pos.y + Math.sin(a) * r);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else if (def.shape === 'lance') {
        const ang = tower.aimAngle || -Math.PI / 2;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(ang);
        ctx.fillRect(-r * 1.4, -r * 0.12, r * 2.8, r * 0.24);
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.5 + (tower.lanceRamp || 1) * 0.15;
        ctx.fillRect(r * 0.4, -r * 0.08, r * 0.9, r * 0.16);
        ctx.globalAlpha = 1;
        ctx.restore();
      } else if (def.shape === 'reactor') {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        const pulse = 0.6 + Math.sin(this.frame * 0.08) * 0.25;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r * 0.25, 0, Math.PI * 2);
        ctx.fill();
      } else if (def.shape === 'crypt') {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - r);
        ctx.lineTo(pos.x + r * 0.85, pos.y);
        ctx.lineTo(pos.x, pos.y + r);
        ctx.lineTo(pos.x - r * 0.85, pos.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      this._drawTowerTierDecor(ctx, tower, def, pos, r, cs, tierStyle);

      if (tower === state.selectedTower) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 3, 0, Math.PI * 2);
        ctx.stroke();
        const stats = tower.stats;
        ctx.strokeStyle = def.color + '55';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, stats.range * cs, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    _drawEnemies(state) {
      const sorted = state.enemies.slice().sort(
        (a, b) => (a.pathIndex + a.segT) - (b.pathIndex + b.segT)
      );
      sorted.forEach((e) => this._drawEnemy(e, state));
    }

    _drawEnemy(e, state) {
      const cs = state.metrics.cellSize;
      const def = B.ENEMY_TYPES[e.type];
      const sz = cs * def.size;
      const ctx = this.ctx;
      const pulse = 1 + Math.sin(this.frame * 0.12 + e.id) * 0.06;

      if (e.elite) {
        const elitePulse = 0.7 + Math.sin(this.frame * 0.1 + e.id) * 0.3;
        ctx.strokeStyle = `rgba(255, 204, 0, ${elitePulse})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, sz + 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (e.inTunnel) {
        applyShadow(ctx, '#b050ff', 12);
        ctx.strokeStyle = 'rgba(180, 80, 255, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, sz + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (e.slowTimer > 0) {
        applyShadow(ctx, '#0088ff', 14);
        ctx.strokeStyle = 'rgba(0, 136, 255, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, sz + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (e.stunTimer > 0) {
        ctx.strokeStyle = 'rgba(0, 245, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(e.x, e.y, sz + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (def.shape === 'swift') {
        for (let i = 1; i <= 2; i++) {
          const n = state.pathFinder.forRoute(e.routeId || 0).segmentNormal(Math.max(0, e.pathIndex));
          ctx.globalAlpha = 0.15 * i;
          ctx.fillStyle = def.color;
          ctx.beginPath();
          ctx.moveTo(e.x - n.x * i * 8, e.y - n.y * i * 8 - sz);
          ctx.lineTo(e.x - n.x * i * 8 + sz, e.y - n.y * i * 8 + sz);
          ctx.lineTo(e.x - n.x * i * 8 - sz, e.y - n.y * i * 8 + sz);
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      applyShadow(ctx, def.color, 10);
      ctx.fillStyle = '#0a0a14';
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 2;

      if (def.shape === 'drone') {
        const s = sz * pulse;
        ctx.fillRect(e.x - s, e.y - s, s * 2, s * 2);
        ctx.strokeRect(e.x - s, e.y - s, s * 2, s * 2);
        ctx.fillStyle = def.color;
        ctx.globalAlpha = 0.35 + Math.sin(this.frame * 0.15) * 0.15;
        ctx.fillRect(e.x - s * 0.4, e.y - s * 0.4, s * 0.8, s * 0.8);
        ctx.globalAlpha = 1;
      } else if (def.shape === 'tank') {
        this._hex(e.x, e.y, sz * 1.1 * pulse, '#0a0a14');
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 3;
        this._hexStroke(e.x, e.y, sz * 1.1 * pulse);
      } else if (def.shape === 'swift') {
        ctx.beginPath();
        ctx.moveTo(e.x, e.y - sz * pulse);
        ctx.lineTo(e.x + sz * pulse, e.y + sz);
        ctx.lineTo(e.x - sz * pulse, e.y + sz);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (def.shape === 'shield') {
        ctx.fillRect(e.x - sz, e.y - sz, sz * 2, sz * 2);
        ctx.strokeRect(e.x - sz, e.y - sz, sz * 2, sz * 2);
        if (e.shield > 0) {
          const rot = this.frame * 0.04;
          ctx.strokeStyle = '#00f5ff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(e.x, e.y, sz + 5, rot, rot + Math.PI * 1.4);
          ctx.stroke();
        }
      } else if (def.shape === 'splitter') {
        const o = sz * 0.55;
        ctx.fillRect(e.x - sz - 1, e.y - sz * 0.8, sz * 1.2, sz * 1.6);
        ctx.fillRect(e.x + 1, e.y - sz * 0.8, sz * 1.2, sz * 1.6);
        ctx.strokeRect(e.x - sz - 1, e.y - sz * 0.8, sz * 1.2, sz * 1.6);
        ctx.strokeRect(e.x + 1, e.y - sz * 0.8, sz * 1.2, sz * 1.6);
      } else if (def.shape === 'boss') {
        const s = sz * pulse;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y - s);
        ctx.lineTo(e.x + s, e.y);
        ctx.lineTo(e.x, e.y + s);
        ctx.lineTo(e.x - s, e.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        const spike = s * 0.35;
        [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) => {
          ctx.beginPath();
          ctx.moveTo(e.x + dx * s, e.y + dy * s);
          ctx.lineTo(e.x + dx * (s + spike), e.y + dy * (s + spike));
          ctx.stroke();
        });
      }
      ctx.shadowBlur = 0;

      const showHp = e.hp < e.maxHp * 0.99 || e.type === 'boss' || e.elite;
      const hasShield = e.maxShield > 0;
      if (showHp || hasShield) {
        const barW = sz * (e.type === 'boss' ? 3 : 2.2);
        const barH = e.type === 'boss' ? 5 : 4;
        let barY = e.y - sz - (e.type === 'boss' ? 12 : 9);
        if (hasShield) {
          const shieldPct = Math.max(0, e.shield / e.maxShield);
          const shieldH = 3;
          barY -= shieldH + 2;
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(e.x - barW / 2, barY, barW, shieldH);
          ctx.fillStyle = '#00f5ff';
          ctx.fillRect(e.x - barW / 2, barY, barW * shieldPct, shieldH);
        }
        if (showHp) {
          const hpPct = Math.max(0, e.hp / e.maxHp);
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(e.x - barW / 2, barY, barW, barH);
          ctx.fillStyle = hpPct > 0.5 ? '#39ff14' : hpPct > 0.25 ? '#ffcc00' : '#ff3344';
          ctx.fillRect(e.x - barW / 2, barY, barW * hpPct, barH);
        }
      }
    }

    _hex(cx, cy, r, color) {
      const ctx = this.ctx;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    _hexStroke(cx, cy, r) {
      const ctx = this.ctx;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    _drawProjectiles(state) {
      const ctx = this.ctx;
      const reduced = perfReduced();
      const drawTrails = !reduced && state.gameSpeed <= 1 && state.projectiles.length <= 24;
      state.projectiles.forEach((p) => {
        if (drawTrails && p.trail && p.trail.length > 1) {
          p.trail.forEach((pt, i) => {
            ctx.globalAlpha = (i + 1) / p.trail.length * 0.45;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1;
        }
        applyShadow(ctx, p.color, 8);
        ctx.fillStyle = p.color;
        const pr = p.kind === 'mortar' ? 5 : 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    }

    _drawParticles(state) {
      const ctx = this.ctx;
      state.particles.forEach((bag) => {
        bag.parts.forEach((p) => {
          ctx.globalAlpha = p.life / p.maxLife;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        });
      });
      ctx.globalAlpha = 1;
    }

    _drawFloatingTexts(state) {
      const ctx = this.ctx;
      state.floatingTexts.forEach((ft) => {
        ctx.globalAlpha = ft.life / ft.maxLife;
        ctx.fillStyle = ft.color;
        ctx.font = (ft.large ? 'bold 13px' : 'bold 11px') + ' Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
      });
      ctx.globalAlpha = 1;
    }

    _drawSpawnPortal(state) {
      if (state.waveActive || state.waveSpawning || state.state !== 'playing') return;
      if (state.wave === 0) return;
      const start = state.pathFinder.waypointPixels[0];
      if (!start) return;
      const pulse = 0.5 + Math.sin(this.frame * 0.1) * 0.4;
      const ctx = this.ctx;
      ctx.strokeStyle = `rgba(255, 204, 0, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(start.x, start.y, state.metrics.cellSize * (0.35 + pulse * 0.1), 0, Math.PI * 2);
      ctx.stroke();
    }

    _drawRingFx(state) {
      const ctx = this.ctx;
      (state.fxRings || []).forEach((ring) => {
        ctx.strokeStyle = ring.color;
        ctx.globalAlpha = ring.alpha;
        ctx.lineWidth = 2 + (1 - ring.alpha) * 2;
        applyShadow(ctx, ring.color, 10);
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    _drawChainFx(state) {
      const ctx = this.ctx;
      (state.chainFx || []).forEach((chain) => {
        const alpha = chain.life / chain.maxLife;
        if (chain.points.length < 2) return;
        ctx.strokeStyle = chain.color;
        ctx.globalAlpha = alpha * 0.9;
        ctx.lineWidth = 2;
        applyShadow(ctx, chain.color, 8);
        ctx.beginPath();
        ctx.moveTo(chain.points[0].x, chain.points[0].y);
        for (let i = 1; i < chain.points.length; i++) {
          ctx.lineTo(chain.points[i].x, chain.points[i].y);
        }
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    _drawScreenFlash(state) {
      const flash = state.screenFlash;
      if (!flash || flash.alpha <= 0) return;
      const ctx = this.ctx;
      ctx.fillStyle = flash.color;
      ctx.globalAlpha = flash.alpha;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.globalAlpha = 1;
    }
  }

  window.NeonSiegeRender = { NeonSiegeRenderer };
})();
