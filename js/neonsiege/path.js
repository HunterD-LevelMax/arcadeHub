(function () {
  const C = window.NeonSiegeConstants;

  function key(r, c) {
    return r + ',' + c;
  }

  class PathFinder {
    constructor(grid, spawn, goal) {
      this.grid = grid;
      this.spawn = spawn;
      this.goal = goal;
      this.waypoints = [];
      this.waypointPixels = [];
      this.metrics = null;
      this.build();
    }

    build() {
      const path = this._bfs(this.spawn, this.goal);
      if (!path || path.length < 2) {
        throw new Error('NeonSiege: no valid path from spawn to goal');
      }
      this.waypoints = path;
    }

    _bfs(start, end) {
      const rows = this.grid.length;
      const cols = this.grid[0].length;
      const [sr, sc] = start;
      const [er, ec] = end;
      if (this.grid[sr][sc] !== C.CELL_PATH || this.grid[er][ec] !== C.CELL_PATH) {
        return null;
      }
      const queue = [[sr, sc]];
      const prev = new Map();
      prev.set(key(sr, sc), null);
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

      while (queue.length) {
        const [r, c] = queue.shift();
        if (r === er && c === ec) break;
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
          if (this.grid[nr][nc] !== C.CELL_PATH) continue;
          const k = key(nr, nc);
          if (prev.has(k)) continue;
          prev.set(k, [r, c]);
          queue.push([nr, nc]);
        }
      }
      const ek = key(er, ec);
      if (!prev.has(ek)) return null;

      const path = [];
      let cur = [er, ec];
      while (cur) {
        path.push(cur);
        cur = prev.get(key(cur[0], cur[1]));
      }
      path.reverse();
      return this._compress(path);
    }

    _compress(path) {
      if (path.length <= 2) return path;
      const out = [path[0]];
      for (let i = 1; i < path.length - 1; i++) {
        const [pr, pc] = path[i - 1];
        const [r, c] = path[i];
        const [nr, nc] = path[i + 1];
        const d1r = r - pr;
        const d1c = c - pc;
        const d2r = nr - r;
        const d2c = nc - c;
        if (d1r !== d2r || d1c !== d2c) out.push(path[i]);
      }
      out.push(path[path.length - 1]);
      return out;
    }

    setMetrics(metrics) {
      this.metrics = metrics;
      this.waypointPixels = this.waypoints.map(([r, c]) => this.cellCenter(r, c));
    }

    cellCenter(r, c) {
      const m = this.metrics;
      return {
        x: m.offsetX + c * m.cellSize + m.cellSize / 2,
        y: m.offsetY + r * m.cellSize + m.cellSize / 2,
      };
    }

    segmentCount() {
      return Math.max(0, this.waypoints.length - 1);
    }

    segmentNormal(index) {
      const a = this.waypointPixels[index];
      const b = this.waypointPixels[index + 1] || a;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      return { x: -dy / len, y: dx / len };
    }

    positionAt(pathIndex, segT, laneOffset) {
      const a = this.waypointPixels[pathIndex];
      const b = this.waypointPixels[pathIndex + 1] || a;
      const t = Math.max(0, Math.min(1, segT));
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      if (laneOffset && this.metrics) {
        const n = this.segmentNormal(pathIndex);
        const off = laneOffset * this.metrics.cellSize;
        return { x: x + n.x * off, y: y + n.y * off };
      }
      return { x, y };
    }

    segmentLength(index) {
      const a = this.waypointPixels[index];
      const b = this.waypointPixels[index + 1];
      if (!b) return 1;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      return Math.sqrt(dx * dx + dy * dy) || 1;
    }

    totalPathLength() {
      let sum = 0;
      for (let i = 0; i < this.segmentCount(); i++) {
        sum += this.segmentLength(i);
      }
      return sum;
    }

    pathDistanceToPixels(dist) {
      let rem = dist;
      for (let i = 0; i < this.segmentCount(); i++) {
        const len = this.segmentLength(i);
        if (rem <= len) {
          return { pathIndex: i, segT: rem / len };
        }
        rem -= len;
      }
      const last = this.segmentCount() - 1;
      return { pathIndex: Math.max(0, last), segT: 1 };
    }
  }

  function computeGridMetrics(canvasW, canvasH) {
    const pad = 8;
    const availW = canvasW - pad * 2;
    const availH = canvasH - pad * 2;
    const cellSize = Math.floor(Math.min(availW / C.GRID_COLS, availH / C.GRID_ROWS));
    const gridW = cellSize * C.GRID_COLS;
    const gridH = cellSize * C.GRID_ROWS;
    return {
      cellSize,
      offsetX: (canvasW - gridW) / 2,
      offsetY: (canvasH - gridH) / 2,
      gridW,
      gridH,
    };
  }

  function cellFromPointer(e, canvas, metrics) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const c = Math.floor((x - metrics.offsetX) / metrics.cellSize);
    const r = Math.floor((y - metrics.offsetY) / metrics.cellSize);
    if (r < 0 || r >= C.GRID_ROWS || c < 0 || c >= C.GRID_COLS) return null;
    return { r, c };
  }

  window.NeonSiegePath = {
    PathFinder,
    computeGridMetrics,
    cellFromPointer,
  };
})();
