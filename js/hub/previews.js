/**
 * Hub card canvas preview classes — lazy-loaded by HubPreviewRegistry.
 */
(function () {
  'use strict';

  const Base = window.HubPreviewBase;
  const REF_MS = Base.REF_MS;

  class AsteroidsPreview extends Base {
    constructor(canvas, card) {
      super(canvas, card);
      this.rocks = Array.from({ length: 8 }, () => ({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: 8 + Math.random() * 18,
        dx: (Math.random() - 0.5) * 0.6,
        dy: (Math.random() - 0.5) * 0.6,
        rot: 0,
        drot: (Math.random() - 0.5) * 0.02,
        pts: Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const rr = 0.7 + Math.random() * 0.6;
          return [Math.cos(a) * rr, Math.sin(a) * rr];
        }),
      }));
      this.bullets = Array.from({ length: 3 }, () => ({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        dx: 2 + Math.random(),
        dy: (Math.random() - 0.5) * 0.5,
      }));
    }

    drawRock(ctx, r) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.rot);
      ctx.beginPath();
      r.pts.forEach(([px, py], i) => {
        const x = px * r.r;
        const y = py * r.r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    render(ctx, dtMs) {
      const s = this.dtScale(dtMs);
      ctx.clearRect(0, 0, this.width, this.height);
      this.rocks.forEach((r) => {
        r.x = (r.x + r.dx * s + this.width) % this.width;
        r.y = (r.y + r.dy * s + this.height) % this.height;
        r.rot += r.drot * s;
        this.drawRock(ctx, r);
      });
      this.bullets.forEach((b) => {
        b.x = (b.x + b.dx * s) % (this.width + 10);
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 245, 255, 0.8)';
        ctx.fill();
      });
    }
  }

  class FlappyPreview extends Base {
    constructor(canvas, card) {
      super(canvas, card);
      this.pipes = [
        { x: this.width * 0.55, gap: 55, gapY: 70 },
        { x: this.width * 0.85, gap: 55, gapY: 95 },
      ];
      this.t = 0;
      this.skyGrad = ctx => {
        const g = ctx.createLinearGradient(0, 0, 0, this.height);
        g.addColorStop(0, 'rgba(15,3,24,0.0)');
        g.addColorStop(1, 'rgba(15,3,24,0.4)');
        return g;
      };
    }

    render(ctx, dtMs) {
      const s = this.dtScale(dtMs);
      ctx.clearRect(0, 0, this.width, this.height);
      this.t += 0.04 * s;
      ctx.fillStyle = this.skyGrad(ctx);
      ctx.fillRect(0, 0, this.width, this.height);

      this.pipes.forEach((p) => {
        p.x -= 0.7 * s;
        if (p.x < -30) {
          p.x = this.width + 30;
          p.gapY = 40 + Math.random() * (this.height - 80);
        }
        ctx.fillStyle = 'rgba(255, 0, 255, 0.25)';
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.fillRect(p.x - 15, 0, 30, p.gapY - p.gap / 2);
        ctx.strokeRect(p.x - 15, 0, 30, p.gapY - p.gap / 2);
        ctx.fillRect(p.x - 15, p.gapY + p.gap / 2, 30, this.height);
        ctx.strokeRect(p.x - 15, p.gapY + p.gap / 2, 30, this.height - (p.gapY + p.gap / 2));
      });

      const birdY = this.height / 2 + Math.sin(this.t) * 30;
      const grd = ctx.createRadialGradient(60, birdY, 0, 60, birdY, 18);
      grd.addColorStop(0, 'rgba(255,0,255,0.3)');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(40, birdY - 18, 40, 36);
    }
  }

  class DoodlePreview extends Base {
    constructor(canvas, card) {
      super(canvas, card);
      this.plats = [
        { x: this.width * 0.12, y: this.height * 0.82, w: 58 },
        { x: this.width * 0.45, y: this.height * 0.64, w: 58 },
        { x: this.width * 0.68, y: this.height * 0.46, w: 58 },
        { x: this.width * 0.20, y: this.height * 0.28, w: 58 },
        { x: this.width * 0.55, y: this.height * 0.12, w: 58 },
      ];
      this.t = 0;
    }

    render(ctx, dtMs) {
      const s = this.dtScale(dtMs);
      ctx.clearRect(0, 0, this.width, this.height);
      this.t += 0.05 * s;

      this.plats.forEach((p, i) => {
        const col = i % 2 === 0 ? '#39ff14' : '#00f5ff';
        ctx.shadowColor = col;
        ctx.shadowBlur = 8;
        ctx.fillStyle = col + '33';
        ctx.fillRect(p.x, p.y, p.w, 8);
        ctx.fillStyle = col;
        ctx.fillRect(p.x, p.y, p.w, 2.5);
        ctx.shadowBlur = 0;
      });

      const playerY = this.height * 0.45 + Math.sin(this.t) * this.height * 0.22;
      const px = this.width * 0.38 + Math.sin(this.t * 0.7) * this.width * 0.1;

      const grd = ctx.createRadialGradient(px + 12, playerY + 16, 0, px + 12, playerY + 16, 22);
      grd.addColorStop(0, 'rgba(57,255,20,0.25)');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(px - 10, playerY - 6, 44, 44);

      ctx.shadowColor = '#c8ff80';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#1a2e00';
      ctx.strokeStyle = '#c8ff80';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(px, playerY, 24, 28, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#00f5ff';
      ctx.fillRect(px + 5, playerY + 5, 4, 4);
      ctx.fillRect(px + 14, playerY + 5, 4, 4);
      ctx.shadowBlur = 0;
    }
  }

  class SnakePreview extends Base {
    constructor(canvas, card) {
      super(canvas, card);
      this.GRID = 10;
      this.snake = [
        { x: 8, y: 9 },
        { x: 7, y: 9 },
        { x: 6, y: 9 },
        { x: 5, y: 9 },
      ];
      this.dir = { x: 1, y: 0 };
      this.food = { x: 20, y: 9 };
      this._moveAcc = 0;
    }

    render(ctx, dtMs) {
      ctx.clearRect(0, 0, this.width, this.height);
      this._moveAcc += dtMs;
      if (this._moveAcc >= 8 * REF_MS) {
        this._moveAcc -= 8 * REF_MS;
        const head = this.snake[0];
        const newHead = { x: head.x + this.dir.x, y: head.y + this.dir.y };
        if (newHead.x < 0) newHead.x = 31;
        if (newHead.x >= 32) newHead.x = 0;
        if (newHead.y < 0) newHead.y = 17;
        if (newHead.y >= 18) newHead.y = 0;
        this.snake.unshift(newHead);
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
          this.food = {
            x: Math.floor(Math.random() * 28) + 2,
            y: Math.floor(Math.random() * 14) + 2,
          };
        } else {
          this.snake.pop();
        }
      }

      this.applyShadow('#39ff14', 6);
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(
        this.food.x * this.GRID + 2,
        this.food.y * this.GRID + 2,
        this.GRID - 4,
        this.GRID - 4
      );

      this.snake.forEach((seg, i) => {
        const alpha = 1 - (i / this.snake.length) * 0.5;
        ctx.shadowBlur = i === 0 ? 8 : 4;
        ctx.fillStyle = `rgba(57, 255, 20, ${alpha})`;
        ctx.fillRect(seg.x * this.GRID + 1, seg.y * this.GRID + 1, this.GRID - 2, this.GRID - 2);
      });
      this.clearShadow();
    }
  }

  class TetrisPreview extends Base {
    constructor(canvas, card) {
      super(canvas, card);
      this.COLS = 10;
      this.ROWS = 18;
      this.bs = this.height / this.ROWS;
      this.ox = (this.width - this.COLS * this.bs) / 2;
      this.SHAPES = [[[1, 1, 1, 1]], [[1, 1], [1, 1]], [[0, 1, 0], [1, 1, 1]], [[0, 0, 1], [1, 1, 1]]];
      this.grid = Array(this.ROWS).fill().map(() => Array(this.COLS).fill(-1));
      this.currentShape = 0;
      this.piece = this.SHAPES[this.currentShape];
      this.px = Math.floor(this.COLS / 2);
      this.py = -2;
      this._dropAcc = 0;
      this.COLORS = ['#00f5ff', '#ff00ff', '#39ff14', '#ffff00', '#ff3344'];
    }

    render(ctx, dtMs) {
      ctx.clearRect(0, 0, this.width, this.height);
      this._dropAcc += dtMs;
      if (this._dropAcc >= 12 * REF_MS) {
        this._dropAcc -= 12 * REF_MS;
        this.py++;
        if (this.py + this.piece.length >= this.ROWS) {
          this.piece.forEach((row, y) => {
            row.forEach((val, x) => {
              if (val && this.py + y >= 0) {
                this.grid[this.py + y][this.px + x] = this.currentShape;
              }
            });
          });
          for (let y = this.ROWS - 1; y >= 0; y--) {
            if (this.grid[y].every((c) => c !== -1)) {
              this.grid.splice(y, 1);
              this.grid.unshift(Array(this.COLS).fill(-1));
            }
          }
          this.currentShape = Math.floor(Math.random() * this.SHAPES.length);
          this.piece = this.SHAPES[this.currentShape];
          this.px = Math.floor(this.COLS / 2) - Math.floor(this.piece[0].length / 2);
          this.py = -2;
        }
      }

      for (let y = 0; y < this.ROWS; y++) {
        for (let x = 0; x < this.COLS; x++) {
          if (this.grid[y][x] !== -1) {
            ctx.shadowBlur = 4;
            ctx.shadowColor = this.COLORS[this.grid[y][x]];
            ctx.fillStyle = this.COLORS[this.grid[y][x]];
            ctx.fillRect(this.ox + x * this.bs + 1, y * this.bs + 1, this.bs - 2, this.bs - 2);
          }
        }
      }

      ctx.shadowBlur = 8;
      ctx.shadowColor = this.COLORS[this.currentShape];
      ctx.fillStyle = this.COLORS[this.currentShape];
      this.piece.forEach((row, y) => {
        row.forEach((val, x) => {
          if (val && this.py + y >= 0) {
            ctx.fillRect(this.ox + (this.px + x) * this.bs + 1, (this.py + y) * this.bs + 1, this.bs - 2, this.bs - 2);
          }
        });
      });
      this.clearShadow();
    }
  }

  class FroggerPreview extends Base {
    constructor(canvas, card) {
      super(canvas, card);
      this.stars = Array.from({ length: 30 }, () => ({
        x: Math.random() * this.width,
        y: Math.random() * this.height * 0.4,
        size: 0.3 + Math.random(),
        alpha: 0.2 + Math.random() * 0.4,
        twinkle: Math.random() * Math.PI * 2,
      }));
      this.mx = this.width * 0.85;
      this.my = 35;
      this.lanes = [
        { type: 'grass', y: 160 },
        { type: 'water', y: 130, objects: [{ x: 30, w: 50 }, { x: 120, w: 40 }] },
        { type: 'road', y: 100, objects: [{ x: 40, w: 25 }, { x: 150, w: 30 }] },
        { type: 'grass', y: 70 },
        { type: 'water', y: 40, objects: [{ x: 60, w: 45 }, { x: 180, w: 35 }] },
        { type: 'road', y: 10, objects: [{ x: 80, w: 20 }, { x: 200, w: 25 }] },
      ];
      this.frogY = 170;
      this.t = 0;
      this._hopAcc = 0;
    }

    render(ctx, dtMs) {
      const s = this.dtScale(dtMs);
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, this.width, this.height);
      this.t += s;

      this.stars.forEach((st) => {
        const tw = 0.5 + Math.sin(this.t * 0.05 + st.twinkle) * 0.5;
        ctx.fillStyle = `rgba(255,255,255,${st.alpha * tw})`;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#ffffcc';
      this.applyShadow('#ffffcc', 15);
      ctx.beginPath();
      ctx.arc(this.mx, this.my, 14, 0, Math.PI * 2);
      ctx.fill();
      this.clearShadow();
      ctx.fillStyle = '#050510';
      ctx.beginPath();
      ctx.arc(this.mx + 4, this.my - 2, 11, 0, Math.PI * 2);
      ctx.fill();

      this.lanes.forEach((lane) => {
        if (lane.type === 'grass') {
          ctx.fillStyle = '#103010';
          ctx.fillRect(0, lane.y, this.width, 30);
        } else if (lane.type === 'water') {
          ctx.fillStyle = '#0a2040';
          ctx.fillRect(0, lane.y, this.width, 30);
          lane.objects.forEach((o) => {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(o.x, lane.y + 8, o.w, 14);
          });
        } else if (lane.type === 'road') {
          ctx.fillStyle = '#222';
          ctx.fillRect(0, lane.y, this.width, 30);
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.setLineDash([10, 10]);
          ctx.beginPath();
          ctx.moveTo(0, lane.y + 15);
          ctx.lineTo(this.width, lane.y + 15);
          ctx.stroke();
          ctx.setLineDash([]);
          lane.objects.forEach((o) => {
            ctx.fillStyle = '#ff3344';
            this.applyShadow('#ff3344', 4);
            ctx.fillRect(o.x, lane.y + 10, o.w, 10);
            this.clearShadow();
          });
        }
      });

      this._hopAcc += dtMs;
      if (this._hopAcc >= 50 * REF_MS) {
        this._hopAcc -= 50 * REF_MS;
        this.frogY -= 20;
        if (this.frogY < 10) this.frogY = 170;
      }
      const hopPhase = (this._hopAcc / REF_MS) % 50;
      const bounce = hopPhase < 10 ? 3 : 0;

      ctx.fillStyle = '#39ff14';
      this.applyShadow('#39ff14', 10);
      ctx.beginPath();
      ctx.ellipse(this.width / 2, this.frogY + bounce, 10, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      this.clearShadow();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.width / 2 - 4, this.frogY - 5 + bounce, 3, 0, Math.PI * 2);
      ctx.arc(this.width / 2 + 4, this.frogY - 5 + bounce, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(this.width / 2 - 4, this.frogY - 5 + bounce, 1.5, 0, Math.PI * 2);
      ctx.arc(this.width / 2 + 4, this.frogY - 5 + bounce, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  class SpaceInvadersPreview extends Base {
    constructor(canvas, card) {
      super(canvas, card);
      const rows = 4;
      const aw = 18;
      const ah = 12;
      const pad = 8;
      const maxWidth = this.width - 60;
      const cols = Math.max(6, Math.floor(maxWidth / (aw + pad)));
      const totalW = cols * (aw + pad) - pad;
      const startX = (this.width - totalW) / 2;
      this.aliens = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          this.aliens.push({ x: startX + c * (aw + pad), y: 30 + r * (ah + pad), type: r, aw, ah });
        }
      }
      this.dir = 1;
      this.t = 0;
      this._moveAcc = 0;
    }

    render(ctx, dtMs) {
      const s = this.dtScale(dtMs);
      ctx.clearRect(0, 0, this.width, this.height);
      this.t += s;

      ctx.fillStyle = 'rgba(57, 255, 20, 0.1)';
      for (let i = 0; i < 20; i++) {
        const sx = (i * 17 + this.t * 0.2) % this.width;
        const sy = (i * 23) % this.height;
        ctx.fillRect(sx, sy, 1, 1);
      }

      this._moveAcc += dtMs;
      if (this._moveAcc >= 30 * REF_MS) {
        this._moveAcc -= 30 * REF_MS;
        let minX = this.width;
        let maxX = 0;
        this.aliens.forEach((a) => {
          minX = Math.min(minX, a.x);
          maxX = Math.max(maxX, a.x + a.aw);
        });
        if (maxX >= this.width - 10 || minX <= 10) this.dir *= -1;
        this.aliens.forEach((a) => {
          a.x += this.dir * 5;
        });
      }

      const colors = ['#ff00ff', '#ff8800', '#00f5ff', '#ffff00'];
      this.aliens.forEach((a, idx) => {
        const col = colors[a.type % colors.length];
        this.applyShadow(col, 6);
        ctx.fillStyle = col;
        const bx = a.x + a.aw / 2;
        const by = a.y + a.ah / 2;
        ctx.beginPath();
        ctx.moveTo(bx, by - 5);
        ctx.lineTo(bx + 6, by + 2);
        ctx.lineTo(bx + 4, by + 5);
        ctx.lineTo(bx - 4, by + 5);
        ctx.lineTo(bx - 6, by + 2);
        ctx.closePath();
        ctx.fill();
      });

      const px = this.width / 2 + Math.sin(this.t * 0.05) * 30;
      const py = this.height - 25;
      this.applyShadow('#39ff14', 8);
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(px - 3, py, 6, 6);
      ctx.fillRect(px - 10, py + 6, 20, 4);
      ctx.fillRect(px - 15, py + 10, 30, 2);
      this.clearShadow();
    }
  }

  class Game2048Preview extends Base {
    constructor(canvas, card) {
      super(canvas, card);
      this.SIZE = 4;
      this.grid = [
        [2, 4, 0, 0],
        [0, 2, 4, 0],
        [0, 0, 2, 0],
        [0, 0, 0, 0],
      ];
      this.t = 0;
      this._spawnAcc = 0;
      this.COLORS = { 2: '#00f5ff', 4: '#ff00ff', 8: '#ff8800', 16: '#39ff14' };
    }

    drawGrid(ctx) {
      ctx.clearRect(0, 0, this.width, this.height);
      const gap = 6;
      const cell = (this.width - gap * (this.SIZE + 1)) / this.SIZE;

      for (let y = 0; y < this.SIZE; y++) {
        for (let x = 0; x < this.SIZE; x++) {
          const value = this.grid[y][x];
          const px = gap + x * (cell + gap);
          const py = gap + y * (cell + gap);
          ctx.fillStyle = value ? `${this.COLORS[value] || '#ff8800'}33` : 'rgba(255,255,255,0.04)';
          ctx.fillRect(px, py, cell, cell);
          if (!value) continue;
          this.applyShadow(this.COLORS[value] || '#ff8800', 8);
          ctx.fillStyle = this.COLORS[value] || '#ff8800';
          ctx.font = 'bold 11px Orbitron';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(value), px + cell / 2, py + cell / 2);
          this.clearShadow();
        }
      }
    }

    render(ctx, dtMs) {
      this._spawnAcc += dtMs;
      if (this._spawnAcc >= 45 * REF_MS) {
        this._spawnAcc -= 45 * REF_MS;
        for (let y = 0; y < this.SIZE; y++) {
          const filtered = this.grid[y].filter((v) => v !== 0);
          while (filtered.length < this.SIZE) filtered.push(0);
          this.grid[y] = filtered;
        }
        const empty = [];
        for (let y = 0; y < this.SIZE; y++) {
          for (let x = 0; x < this.SIZE; x++) {
            if (this.grid[y][x] === 0) empty.push({ x, y });
          }
        }
        if (empty.length) {
          const spot = empty[Math.floor(Math.random() * empty.length)];
          this.grid[spot.y][spot.x] = Math.random() < 0.8 ? 2 : 4;
        }
      }
      this.drawGrid(ctx);
    }
  }

  class StackTowerPreview extends Base {
    constructor(canvas, card) {
      super(canvas, card);
      this.COLORS = ['#00f5ff', '#ff00ff', '#ff8800', '#39ff14', '#ffff00'];
      this.blocks = [];
      this.mover = { x: 20, w: 90, dir: 1 };
      this._stackAcc = 0;
      for (let i = 0; i < 5; i++) {
        this.blocks.push({
          x: 40 + i * 2,
          y: this.height - 18 - i * 14,
          w: 90 - i * 6,
          color: this.COLORS[i % this.COLORS.length],
        });
      }
    }

    render(ctx, dtMs) {
      const s = this.dtScale(dtMs);
      ctx.clearRect(0, 0, this.width, this.height);

      this.mover.x += this.mover.dir * 1.8 * s;
      if (this.mover.x < 10 || this.mover.x + this.mover.w > this.width - 10) {
        this.mover.dir *= -1;
      }

      this.blocks.forEach((b) => {
        this.applyShadow(b.color, 8);
        ctx.fillStyle = b.color + '55';
        ctx.fillRect(b.x, b.y, b.w, 12);
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.w, 3);
      });

      const top = this.blocks[this.blocks.length - 1];
      const y = top.y - 16;
      const color = this.COLORS[this.blocks.length % this.COLORS.length];
      this.applyShadow(color, 10);
      ctx.fillStyle = color + '88';
      ctx.fillRect(this.mover.x, y, top.w, 12);
      ctx.fillStyle = color;
      ctx.fillRect(this.mover.x, y, top.w, 3);
      this.clearShadow();

      this._stackAcc += dtMs;
      if (this._stackAcc >= 55 * REF_MS && this.blocks.length < 8) {
        this._stackAcc -= 55 * REF_MS;
        this.blocks.push({ x: this.mover.x, y: top.y - 14, w: top.w - 4, color });
        this.mover.w = top.w - 4;
      }
    }
  }

  class ThrustRunnerPreview extends Base {
    constructor(canvas, card) {
      super(canvas, card);
      this.ACCENT = '#ff6600';
      this.t = 0;
      this.scroll = 0;
    }

    render(ctx, dtMs) {
      const s = this.dtScale(dtMs);
      ctx.clearRect(0, 0, this.width, this.height);
      this.t += 0.04 * s;
      this.scroll += 1.2 * s;

      const playerX = this.width * 0.32;
      const playerY = this.height / 2 + Math.sin(this.t) * 18;

      ctx.fillStyle = 'rgba(255, 102, 0, 0.35)';
      ctx.strokeStyle = 'rgba(255, 102, 0, 0.7)';
      ctx.lineWidth = 2;
      for (let i = -1; i < 12; i++) {
        const sx = ((i * 28 - this.scroll * 0.8) % (this.width + 28) + this.width + 28) % (this.width + 28) - 14;
        const topH = 28 + Math.sin(i * 0.7 + this.t * 0.5) * 12;
        const botH = 28 + Math.cos(i * 0.9 + this.t * 0.4) * 12;
        ctx.fillRect(sx, 0, 6, topH);
        ctx.fillRect(sx, this.height - botH, 6, botH);
      }

      for (let i = 0; i < 4; i++) {
        const px = playerX - 16 - i * 5 - Math.sin(this.t * 3 + i) * 3;
        const py = playerY + Math.sin(this.t * 2 + i) * 4;
        ctx.fillStyle = i % 2 ? '#ffcc00' : this.ACCENT;
        this.applyShadow(this.ACCENT, 6);
        ctx.beginPath();
        ctx.arc(px, py, 2 + Math.random(), 0, Math.PI * 2);
        ctx.fill();
      }
      this.clearShadow();

      this.applyShadow(this.ACCENT, 12);
      ctx.fillStyle = '#1a0d00';
      ctx.strokeStyle = this.ACCENT;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(playerX - 10, playerY - 8, 20, 16, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = this.ACCENT;
      ctx.fillRect(playerX - 3, playerY - 4, 6, 3);
      this.clearShadow();
    }
  }

  class PrismCascadePreview extends Base {
    constructor(canvas, card) {
      super(canvas, card);
      this.PREVIEW_SIZE = 4;
      this.GEM_COLORS = ['#00f5ff', '#ff00ff', '#39ff14', '#ffff00', '#ff8800', '#aa00ff'];
      this.SHAPES = ['circle', 'diamond', 'triangle', 'hex', 'star', 'square'];
      this.grid = [];
      this.t = 0;
      this.matchCell = { r: 1, c: 2 };
      this.matchPhase = 0;
      this.particles = [];
      this._matchAcc = 0;
      this._phaseAcc = 0;

      for (let r = 0; r < this.PREVIEW_SIZE; r++) {
        this.grid[r] = [];
        for (let c = 0; c < this.PREVIEW_SIZE; c++) {
          this.grid[r][c] = (r * this.PREVIEW_SIZE + c) % 6;
        }
      }
    }

    cellPos(r, c) {
      const pad = 14;
      const size = Math.min(this.width, this.height) - pad * 2;
      const cell = size / this.PREVIEW_SIZE;
      const offsetX = (this.width - size) / 2;
      const offsetY = (this.height - size) / 2;
      return {
        x: offsetX + c * cell + cell / 2,
        y: offsetY + r * cell + cell / 2,
        s: cell * 0.72,
      };
    }

    drawShape(ctx, type, x, y, s, color, alpha, glow) {
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      this.applyShadow(color, glow || 8);
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (type === 'circle') {
        ctx.arc(x, y, s * 0.42, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'diamond') {
        ctx.moveTo(x, y - s * 0.45);
        ctx.lineTo(x + s * 0.38, y);
        ctx.lineTo(x, y + s * 0.45);
        ctx.lineTo(x - s * 0.38, y);
        ctx.closePath();
        ctx.fill();
      } else if (type === 'triangle') {
        ctx.moveTo(x, y - s * 0.42);
        ctx.lineTo(x + s * 0.4, y + s * 0.32);
        ctx.lineTo(x - s * 0.4, y + s * 0.32);
        ctx.closePath();
        ctx.fill();
      } else if (type === 'hex') {
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          const px = x + Math.cos(a) * s * 0.4;
          const py = y + Math.sin(a) * s * 0.4;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else if (type === 'star') {
        for (let i = 0; i < 10; i++) {
          const a = (Math.PI / 5) * i - Math.PI / 2;
          const rad = i % 2 ? s * 0.18 : s * 0.42;
          const px = x + Math.cos(a) * rad;
          const py = y + Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        const hs = s * 0.36;
        ctx.roundRect(x - hs, y - hs, hs * 2, hs * 2, 5);
        ctx.fill();
      }
      ctx.restore();
    }

    spawnParticles(x, y, color) {
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color,
          size: 2 + Math.random() * 2,
        });
      }
    }

    render(ctx, dtMs) {
      const s = this.dtScale(dtMs);
      ctx.clearRect(0, 0, this.width, this.height);
      this.t += s;

      this._matchAcc += dtMs;
      if (this._matchAcc >= 90 * REF_MS) {
        this._matchAcc -= 90 * REF_MS;
        this.matchCell = {
          r: Math.floor(Math.random() * this.PREVIEW_SIZE),
          c: Math.floor(Math.random() * this.PREVIEW_SIZE),
        };
        this.matchPhase = 0;
        this._phaseAcc = 0;
      }

      if (this.matchPhase < 30) {
        this._phaseAcc += dtMs;
        while (this._phaseAcc >= REF_MS && this.matchPhase < 30) {
          this._phaseAcc -= REF_MS;
          this.matchPhase++;
        }
      }

      for (let r = 0; r < this.PREVIEW_SIZE; r++) {
        for (let c = 0; c < this.PREVIEW_SIZE; c++) {
          const type = this.grid[r][c];
          const pos = this.cellPos(r, c);
          const color = this.GEM_COLORS[type];
          const shape = this.SHAPES[type];
          let alpha = 1;
          let glow = 8;
          if (r === this.matchCell.r && c === this.matchCell.c) {
            if (this.matchPhase > 0 && this.matchPhase < 12) {
              glow = 16 + this.matchPhase;
            } else if (this.matchPhase >= 12 && this.matchPhase < 22) {
              alpha = 1 - (this.matchPhase - 12) / 10;
              glow = 20;
            } else if (this.matchPhase === 22) {
              this.spawnParticles(pos.x, pos.y, color);
              this.grid[r][c] = Math.floor(Math.random() * 6);
            }
          }
          if (alpha > 0.05) this.drawShape(ctx, shape, pos.x, pos.y, pos.s, color, alpha, glow);
        }
      }

      this.particles.forEach((p) => {
        p.x += p.vx * s;
        p.y += p.vy * s;
        p.life -= 0.04 * s;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        this.applyShadow(p.color, 6);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      this.clearShadow();
      this.particles = this.particles.filter((p) => p.life > 0);
    }
  }

  class NeonSiegePreview extends Base {
    constructor(canvas, card) {
      super(canvas, card);
      this.ACCENT = '#ffcc00';
      this.t = 0;
      this.path = [
        { x: 0.15, y: 0.18 },
        { x: 0.42, y: 0.18 },
        { x: 0.42, y: 0.38 },
        { x: 0.78, y: 0.38 },
        { x: 0.78, y: 0.58 },
        { x: 0.28, y: 0.58 },
        { x: 0.28, y: 0.78 },
        { x: 0.55, y: 0.78 },
        { x: 0.55, y: 0.88 },
      ].map((p) => ({ x: p.x * this.width, y: p.y * this.height }));
      this.tower = { x: 0.78 * this.width, y: 0.48 * this.height };
      this.enemies = [
        { seg: 0, prog: 0.2 },
        { seg: 2, prog: 0.35 },
        { seg: 4, prog: 0.5 },
        { seg: 6, prog: 0.65 },
      ];
      this.shots = [];
      this._shotAcc = 0;
    }

    pathPos(seg, prog) {
      const a = this.path[seg];
      const b = this.path[Math.min(seg + 1, this.path.length - 1)];
      return {
        x: a.x + (b.x - a.x) * prog,
        y: a.y + (b.y - a.y) * prog,
      };
    }

    render(ctx, dtMs) {
      const s = this.dtScale(dtMs);
      ctx.clearRect(0, 0, this.width, this.height);
      this.t += 0.03 * s;

      ctx.strokeStyle = 'rgba(255, 204, 0, 0.35)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(this.path[0].x, this.path[0].y);
      for (let i = 1; i < this.path.length; i++) ctx.lineTo(this.path[i].x, this.path[i].y);
      ctx.stroke();

      this.applyShadow('#00f5ff', 12);
      ctx.fillStyle = '#00f5ff';
      ctx.fillRect(this.tower.x - 8, this.tower.y - 8, 16, 16);
      this.clearShadow();

      this._shotAcc += dtMs;
      if (this._shotAcc >= 140) {
        this._shotAcc -= 140;
        this.shots.push({ x: this.tower.x, y: this.tower.y, life: 1 });
      }

      for (let i = this.shots.length - 1; i >= 0; i--) {
        const shot = this.shots[i];
        const target = this.pathPos(4, 0.45 + Math.sin(this.t) * 0.08);
        const dx = target.x - shot.x;
        const dy = target.y - shot.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        shot.x += (dx / dist) * 4 * s;
        shot.y += (dy / dist) * 4 * s;
        shot.life -= 0.02 * s;
        this.applyShadow(this.ACCENT, 8);
        ctx.fillStyle = this.ACCENT;
        ctx.beginPath();
        ctx.arc(shot.x, shot.y, 3, 0, Math.PI * 2);
        ctx.fill();
        if (shot.life <= 0 || dist < 6) this.shots.splice(i, 1);
      }
      this.clearShadow();

      this.enemies.forEach((e, idx) => {
        e.prog += (0.007 + idx * 0.0008) * s;
        const lane = (idx - 1.5) * 3;
        if (e.prog >= 1) {
          e.seg++;
          e.prog = 0;
          if (e.seg >= this.path.length - 1) {
            e.seg = 0;
            e.prog = 0;
          }
        }
        const pos = this.pathPos(e.seg, e.prog);
        const colors = ['#ff6688', '#39ff14', '#aa44ff', '#00f5ff'];
        this.applyShadow(colors[idx % 4], 8);
        ctx.fillStyle = colors[idx % 4];
        ctx.fillRect(pos.x + lane - 5, pos.y - 5, 10, 10);
      });
      this.clearShadow();

      ctx.fillStyle = 'rgba(255, 51, 68, 0.5)';
      ctx.strokeStyle = '#ff3344';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.path[this.path.length - 1].x, this.path[this.path.length - 1].y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  const PREVIEW_ENTRIES = [
    { canvasId: 'asteroidsCanvas', Preview: AsteroidsPreview },
    { canvasId: 'flappyCanvas', Preview: FlappyPreview },
    { canvasId: 'doodleCanvas', Preview: DoodlePreview },
    { canvasId: 'snakeCanvas', Preview: SnakePreview },
    { canvasId: 'tetrisCanvas', Preview: TetrisPreview },
    { canvasId: 'froggerCanvas', Preview: FroggerPreview },
    { canvasId: 'spaceinvadersCanvas', Preview: SpaceInvadersPreview },
    { canvasId: 'game2048Canvas', Preview: Game2048Preview },
    { canvasId: 'stacktowerCanvas', Preview: StackTowerPreview },
    { canvasId: 'thrustrunnerCanvas', Preview: ThrustRunnerPreview },
    { canvasId: 'prismcascadeCanvas', Preview: PrismCascadePreview },
    { canvasId: 'neonsiegeCanvas', Preview: NeonSiegePreview },
  ];

  class HubPreviewRegistry {
    static init() {
      const manager = window.HubPreviewManager;
      if (!manager) return;
      PREVIEW_ENTRIES.forEach(({ canvasId, Preview }) => {
        manager.registerLazy(canvasId, Preview);
      });

      const scan = () => manager.scanVisible();
      requestAnimationFrame(() => {
        requestAnimationFrame(scan);
      });
      window.addEventListener('load', scan, { once: true });

      let scrollTimer = 0;
      window.addEventListener(
        'scroll',
        () => {
          if (scrollTimer) return;
          scrollTimer = requestAnimationFrame(() => {
            scrollTimer = 0;
            scan();
          });
        },
        { passive: true }
      );
    }
  }

  window.HubPreviewRegistry = HubPreviewRegistry;
})();
