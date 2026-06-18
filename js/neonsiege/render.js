(function () {
  const B = window.NeonSiegeBalance;
  const C = window.NeonSiegeConstants;

  class NeonSiegeRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.frame = 0;
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
      this._drawPlacementGhost(state);
      state.towers.forEach((t) => this._drawTower(t, state));
      this._drawEnemies(state);
      this._drawProjectiles(state);
      this._drawParticles(state);
      this._drawRingFx(state);
      this._drawFloatingTexts(state);
      this._drawSpawnPortal(state);
      ctx.restore();
      this._drawScreenFlash(state);
    }

    _drawBackground(m) {
      const ctx = this.ctx;
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.strokeStyle = 'rgba(255, 204, 0, 0.04)';
      ctx.lineWidth = 1;
      const step = m.cellSize;
      for (let x = m.offsetX; x <= m.offsetX + m.gridW; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, m.offsetY);
        ctx.lineTo(x, m.offsetY + m.gridH);
        ctx.stroke();
      }
      for (let y = m.offsetY; y <= m.offsetY + m.gridH; y += step) {
        ctx.beginPath();
        ctx.moveTo(m.offsetX, y);
        ctx.lineTo(m.offsetX + m.gridW, y);
        ctx.stroke();
      }
    }

    _drawMap(state) {
      const ctx = this.ctx;
      const m = state.metrics;
      const cs = m.cellSize;
      const inset = 2;
      const pulse = 0.55 + Math.sin(this.frame * 0.08) * 0.25;
      const highlightSlots = !!state.selectedTowerType;

      for (let r = 0; r < C.GRID_ROWS; r++) {
        for (let c = 0; c < C.GRID_COLS; c++) {
          const cell = state.mapGrid[r][c];
          if (cell === C.CELL_VOID) continue;
          const x = m.offsetX + c * cs;
          const y = m.offsetY + r * cs;
          const w = cs - inset * 2;
          const h = cs - inset * 2;

          if (cell === C.CELL_PATH) {
            ctx.fillStyle = 'rgba(255, 204, 0, 0.22)';
            ctx.strokeStyle = 'rgba(255, 204, 0, 0.45)';
            if (typeof roundRect === 'function') roundRect(ctx, x + inset, y + inset, w, h, 4);
            else ctx.rect(x + inset, y + inset, w, h);
            ctx.fill();
            ctx.stroke();
            this._drawPathArrow(state, r, c, x, y, cs);
          } else if (cell === C.CELL_SLOT) {
            const occupied = state.towers.some((t) => t.r === r && t.c === c);
            if (!occupied) {
              ctx.fillStyle = highlightSlots
                ? `rgba(0, 245, 255, ${0.08 + pulse * 0.06})`
                : 'rgba(0, 245, 255, 0.05)';
              ctx.strokeStyle = highlightSlots
                ? `rgba(0, 245, 255, ${0.5 + pulse * 0.35})`
                : 'rgba(0, 245, 255, 0.35)';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              if (typeof roundRect === 'function') roundRect(ctx, x + inset, y + inset, w, h, 5);
              else ctx.rect(x + inset, y + inset, w, h);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.fill();
              const plus = cs * 0.14;
              ctx.strokeStyle = `rgba(0, 245, 255, ${0.45 + pulse * 0.3})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(x + cs / 2 - plus, y + cs / 2);
              ctx.lineTo(x + cs / 2 + plus, y + cs / 2);
              ctx.moveTo(x + cs / 2, y + cs / 2 - plus);
              ctx.lineTo(x + cs / 2, y + cs / 2 + plus);
              ctx.stroke();
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
        const flash = state.coreFlash > 0 ? 1 + state.coreFlash * 2 : 1;
        const critical = state.baseHp <= 5;
        const pulse = critical ? 1 + Math.sin(this.frame * 0.14) * 0.25 : 1;
        ctx.shadowColor = '#ff3344';
        ctx.shadowBlur = (16 + (critical ? 10 : 0)) * flash * pulse;
        ctx.fillStyle = `rgba(255, 51, 68, ${0.3 + (state.coreFlash || 0) * 0.35})`;
        ctx.strokeStyle = '#ff3344';
        ctx.lineWidth = critical ? 3 : 2;
        ctx.beginPath();
        ctx.arc(goal.x, goal.y, cs * (0.38 + (critical ? 0.06 * pulse : 0)), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff3344';
        ctx.font = `bold ${Math.max(8, cs * 0.22)}px Orbitron`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CORE', goal.x, goal.y);
      }
    }

    _drawPathArrow(state, r, c, x, y, cs) {
      const wps = state.pathFinder.waypoints;
      const idx = wps.findIndex(([wr, wc]) => wr === r && wc === c);
      if (idx < 0 || idx >= wps.length - 1) return;
      const [nr, nc] = wps[idx + 1];
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

    _drawPlacementGhost(state) {
      if (!state.selectedTowerType || !state.hoverCell) return;
      const { r, c } = state.hoverCell;
      if (state.mapGrid[r][c] !== C.CELL_SLOT) return;
      if (state.towers.some((t) => t.r === r && t.c === c)) return;
      const def = B.TOWER_TYPES[state.selectedTowerType];
      const pos = state.pathFinder.cellCenter(r, c);
      const cs = state.metrics.cellSize;
      const ctx = this.ctx;
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = def.color;
      ctx.fillRect(pos.x - cs * 0.22, pos.y - cs * 0.22, cs * 0.44, cs * 0.44);
      ctx.globalAlpha = 1;
      const stats = B.getTowerStats(state.selectedTowerType, 0);
      ctx.strokeStyle = def.color + '88';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, stats.range * cs, 0, Math.PI * 2);
      ctx.stroke();
    }

    _drawTower(tower, state) {
      const def = B.TOWER_TYPES[tower.type];
      const pos = state.pathFinder.cellCenter(tower.r, tower.c);
      const cs = state.metrics.cellSize;
      const tierBoost = 1 + tower.tier * 0.12;
      const recoilScale = tower.recoil > 0 ? 1 - (tower.recoil / 0.08) * 0.08 : 1;
      const r = cs * 0.3 * tierBoost * recoilScale;
      const ctx = this.ctx;
      const boosted = state.overchargeTimer > 0;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.scale(recoilScale, recoilScale);
      ctx.translate(-pos.x, -pos.y);

      if (boosted) {
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.shadowColor = def.glow;
      ctx.shadowBlur = 10 + tower.tier * 4;
      ctx.fillStyle = def.color;
      ctx.strokeStyle = def.color;

      if (def.shape === 'square') {
        ctx.fillRect(pos.x - r, pos.y - r, r * 2, r * 2);
      } else if (def.shape === 'hex') {
        this._hex(pos.x, pos.y, r, def.color);
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
      }
      ctx.shadowBlur = 0;

      if (tower === state.selectedTower) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
        const stats = tower.stats;
        ctx.strokeStyle = def.color + '66';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, stats.range * cs, 0, Math.PI * 2);
        ctx.stroke();
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

      if (e.slowTimer > 0) {
        ctx.shadowColor = '#0088ff';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = 'rgba(0, 136, 255, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, sz + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (def.shape === 'swift') {
        for (let i = 1; i <= 2; i++) {
          const n = state.pathFinder.segmentNormal(Math.max(0, e.pathIndex));
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

      ctx.shadowColor = def.color;
      ctx.shadowBlur = 10;
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
      if (showHp) {
        const barW = sz * (e.type === 'boss' ? 3 : 2.2);
        const barH = e.type === 'boss' ? 5 : 4;
        const barY = e.y - sz - (e.type === 'boss' ? 12 : 9);
        const hpPct = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(e.x - barW / 2, barY, barW, barH);
        ctx.fillStyle = hpPct > 0.5 ? '#39ff14' : hpPct > 0.25 ? '#ffcc00' : '#ff3344';
        ctx.fillRect(e.x - barW / 2, barY, barW * hpPct, barH);
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
      state.projectiles.forEach((p) => {
        if (p.trail && p.trail.length > 1) {
          p.trail.forEach((pt, i) => {
            ctx.globalAlpha = (i + 1) / p.trail.length * 0.45;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1;
        }
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
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
        ctx.shadowColor = ring.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
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
