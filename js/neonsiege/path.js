(function () {
  const C = window.NeonSiegeConstants;

  function key(r, c) {
    return r + ',' + c;
  }

  function isWalkable(grid, r, c) {
    const cell = grid[r][c];
    return cell === C.CELL_PATH || cell === C.CELL_TUNNEL;
  }

  function cellsAlongSegment(a, b) {
    const out = [];
    let [r, c] = a;
    out.push([r, c]);
    while (r !== b[0]) {
      r += Math.sign(b[0] - r);
      out.push([r, c]);
    }
    while (c !== b[1]) {
      c += Math.sign(b[1] - c);
      out.push([r, c]);
    }
    return out;
  }

  function appendPathCells(out, cells) {
    for (const cell of cells) {
      if (!out.length) {
        out.push(cell);
        continue;
      }
      const last = out[out.length - 1];
      if (last[0] === cell[0] && last[1] === cell[1]) continue;
      const manhattan = Math.abs(cell[0] - last[0]) + Math.abs(cell[1] - last[1]);
      if (manhattan === 1) {
        out.push(cell);
        continue;
      }
      const bridge = cellsAlongSegment(last, cell);
      for (let i = 1; i < bridge.length; i++) {
        out.push(bridge[i]);
      }
    }
    return out;
  }

  function ensureAdjacentCells(cells) {
    const out = [];
    appendPathCells(out, cells);
    return out;
  }

  class RouteView {
    constructor(pathFinder, routeId) {
      this._pf = pathFinder;
      this.routeId = routeId;
    }

    get waypoints() {
      return this._pf.routes[this.routeId].waypoints;
    }

    get waypointPixels() {
      return this._pf.routes[this.routeId].waypointPixels;
    }

    segmentCount() {
      return Math.max(0, this.pathCellPixels.length - 1);
    }

    get pathCellPixels() {
      const route = this._pf.routes[this.routeId];
      return route.pathCellPixels && route.pathCellPixels.length
        ? route.pathCellPixels
        : route.waypointPixels;
    }

    distanceAt(pathIndex, segT) {
      let dist = 0;
      const px = this.pathCellPixels;
      const idx = Math.min(pathIndex, Math.max(0, px.length - 2));
      for (let i = 0; i < idx; i++) {
        dist += this.segmentLength(i);
      }
      if (px.length >= 2 && idx >= 0) {
        dist += Math.max(0, Math.min(1, segT)) * this.segmentLength(idx);
      }
      return dist;
    }

    positionFromDistance(dist) {
      const n = this.segmentCount();
      if (n <= 0) return { pathIndex: 0, segT: 0 };
      let rem = Math.max(0, dist);
      for (let i = 0; i < n; i++) {
        const len = this.segmentLength(i);
        if (rem <= len || i === n - 1) {
          return { pathIndex: i, segT: len > 0 ? Math.min(1, rem / len) : 0 };
        }
        rem -= len;
      }
      return { pathIndex: n - 1, segT: 1 };
    }

    offsetByCells(pathIndex, segT, cellDelta) {
      const cs = this._pf.metrics ? this._pf.metrics.cellSize : 1;
      const dist = Math.max(0, this.distanceAt(pathIndex, segT) + cellDelta * cs);
      return this.positionFromDistance(dist);
    }

    segmentNormal(index) {
      const a = this.pathCellPixels[index];
      const b = this.pathCellPixels[index + 1] || a;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      return { x: -dy / len, y: dx / len };
    }

    positionAt(pathIndex, segT, laneOffset) {
      const a = this.pathCellPixels[pathIndex];
      const b = this.pathCellPixels[pathIndex + 1] || a;
      const t = Math.max(0, Math.min(1, segT));
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      if (laneOffset && this._pf.metrics) {
        const n = this.segmentNormal(pathIndex);
        const off = laneOffset * this._pf.metrics.cellSize;
        return { x: x + n.x * off, y: y + n.y * off };
      }
      return { x, y };
    }

    segmentLength(index) {
      const a = this.pathCellPixels[index];
      const b = this.pathCellPixels[index + 1];
      if (!b) return 1;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      return Math.sqrt(dx * dx + dy * dy) || 1;
    }
  }

  class PathFinder {
    constructor(grid, spawn, goal, opts) {
      opts = opts || {};
      this.grid = grid;
      this.spawn = spawn;
      this.goal = goal;
      this.junctions = opts.junctions || [];
      this.metrics = null;
      this.routes = [];
      this._routeViews = [];
      this.build(opts.precomputedRoutes);
    }

    build(precomputedRoutes) {
      if (precomputedRoutes && precomputedRoutes.length) {
        this.routes = precomputedRoutes.map((cells) => {
          const expanded = ensureAdjacentCells(cells.slice());
          return {
            cells: expanded,
            waypoints: this._compress(expanded),
            waypointPixels: [],
            pathCellPixels: [],
          };
        });
      } else {
        const cells = ensureAdjacentCells(this._bfsCells(this.spawn, this.goal) || []);
        if (!cells || cells.length < 2) {
          throw new Error('NeonSiege: no valid path from spawn to goal');
        }
        this.routes = [{
          cells,
          waypoints: this._compress(cells),
          waypointPixels: [],
          pathCellPixels: [],
        }];
      }
      if (!this.routes.length) {
        throw new Error('NeonSiege: no valid path from spawn to goal');
      }
      this._routeViews = this.routes.map((_, i) => new RouteView(this, i));
      this.waypoints = this.routes[0].waypoints;
      this.waypointPixels = this.routes[0].waypointPixels;
    }

    forRoute(routeId) {
      return this._routeViews[routeId] || this._routeViews[0];
    }

    pickRoute(spawnIndex, waveIndex) {
      if (this.routes.length <= 1) return 0;
      const wave = waveIndex || 0;
      if (wave % 2 === 1) {
        return (spawnIndex + 1) % this.routes.length;
      }
      return spawnIndex % this.routes.length;
    }

    _bfsCells(start, end) {
      const rows = this.grid.length;
      const cols = this.grid[0].length;
      const [sr, sc] = start;
      const [er, ec] = end;
      if (!isWalkable(this.grid, sr, sc) || !isWalkable(this.grid, er, ec)) {
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
          if (!isWalkable(this.grid, nr, nc)) continue;
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
      return path;
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
      for (const route of this.routes) {
        route.waypointPixels = route.waypoints.map(([r, c]) => this.cellCenter(r, c));
        route.pathCellPixels = route.cells.map(([r, c]) => this.cellCenter(r, c));
      }
      this.waypointPixels = this.routes[0].waypointPixels;
    }

    cellCenter(r, c) {
      const m = this.metrics;
      return {
        x: m.offsetX + c * m.cellSize + m.cellSize / 2,
        y: m.offsetY + r * m.cellSize + m.cellSize / 2,
      };
    }

    cellAt(routeId, pathIndex, segT) {
      const route = this.forRoute(routeId);
      const pos = route.positionAt(pathIndex, segT, 0);
      if (!this.metrics) {
        const wp = route.waypoints[Math.min(pathIndex, route.waypoints.length - 1)];
        return { r: wp[0], c: wp[1], type: this.grid[wp[0]][wp[1]] };
      }
      const c = Math.floor((pos.x - this.metrics.offsetX) / this.metrics.cellSize);
      const r = Math.floor((pos.y - this.metrics.offsetY) / this.metrics.cellSize);
      if (r < 0 || r >= C.GRID_ROWS || c < 0 || c >= C.GRID_COLS) {
        const wp = route.waypoints[Math.min(pathIndex, route.waypoints.length - 1)];
        return { r: wp[0], c: wp[1], type: this.grid[wp[0]][wp[1]] };
      }
      return { r, c, type: this.grid[r][c] };
    }

    segmentCount() {
      return this.forRoute(0).segmentCount();
    }

    segmentNormal(index) {
      return this.forRoute(0).segmentNormal(index);
    }

    positionAt(pathIndex, segT, laneOffset) {
      return this.forRoute(0).positionAt(pathIndex, segT, laneOffset);
    }

    segmentLength(index) {
      return this.forRoute(0).segmentLength(index);
    }

    totalPathLength() {
      let sum = 0;
      const route = this.forRoute(0);
      for (let i = 0; i < route.segmentCount(); i++) {
        sum += route.segmentLength(i);
      }
      return sum;
    }

    pathDistanceToPixels(dist) {
      return this.forRoute(0).positionFromDistance(dist);
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
    RouteView,
    isWalkable,
    cellsAlongSegment,
    ensureAdjacentCells,
    computeGridMetrics,
    cellFromPointer,
  };
})();
