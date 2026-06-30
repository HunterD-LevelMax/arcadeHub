(function () {
  const C = window.NeonSiegeConstants;
  const PathLib = window.NeonSiegePath;
  const COLS = C.GRID_COLS;
  const ROWS = C.GRID_ROWS;
  const LAST_ROW = ROWS - 1;
  const LAST_COL = COLS - 1;
  const OLD_ROWS = 14;
  const OLD_COLS = 12;
  const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  const MIN_PATH_LEN = Math.round(42 * ROWS / OLD_ROWS);
  const MAX_PATH_LEN = Math.round(58 * ROWS / OLD_ROWS);
  const MAX_PATH_CELLS = Math.round(65 * ROWS * COLS / (OLD_ROWS * OLD_COLS));
  const TARGET_SLOTS_MIN = Math.round(28 * ROWS * COLS / (OLD_ROWS * OLD_COLS));
  const TARGET_SLOTS_MAX = Math.round(32 * ROWS * COLS / (OLD_ROWS * OLD_COLS));
  const MAX_TOTAL_SLOTS = Math.round(34 * ROWS * COLS / (OLD_ROWS * OLD_COLS));
  const MAX_VOID_RATIO = 0.58;
  const POCKET_MAX_SIZE = Math.round(14 * ROWS * COLS / (OLD_ROWS * OLD_COLS));
  const MIN_TURNS = Math.max(8, Math.round(12 * ROWS / OLD_ROWS));
  const MIN_ROUTES = 2;
  const TUNNEL_MIN = 3;
  const TUNNEL_MAX = 7;
  const FORK_TAIL_MARGIN = Math.round(12 * ROWS / OLD_ROWS);
  const FORK_ROW_MIN = Math.round(4 * LAST_ROW / (OLD_ROWS - 1));
  const FORK_ROW_MAX = Math.round(9 * LAST_ROW / (OLD_ROWS - 1));
  const MERGE_ROW_MIN = Math.round(6 * LAST_ROW / (OLD_ROWS - 1));
  const MERGE_ROW_MAX = LAST_ROW;

  function scaleCorner(r, c) {
    return [
      Math.min(LAST_ROW, Math.round(r * LAST_ROW / (OLD_ROWS - 1))),
      Math.min(LAST_COL, Math.round(c * LAST_COL / (OLD_COLS - 1))),
    ];
  }

  function scaleCorners(corners) {
    return corners.map(([r, c]) => scaleCorner(r, c));
  }

  const PATH_TEMPLATES = [
    {
      id: 'zigzag',
      label: 'ZIGZAG',
      corners: scaleCorners([[0, 1], [0, 4], [3, 4], [3, 8], [7, 8], [7, 4], [10, 4], [10, 8], [12, 8], [13, 6]]),
      hpMod: 1,
      countMod: 0,
    },
    {
      id: 'serpent',
      label: 'SERPENT',
      corners: scaleCorners([[0, 2], [0, 9], [4, 9], [4, 3], [8, 3], [8, 10], [11, 10], [13, 5]]),
      hpMod: 1.05,
      countMod: 0,
    },
    {
      id: 'coil',
      label: 'COIL',
      corners: scaleCorners([[0, 3], [0, 7], [2, 7], [2, 2], [6, 2], [6, 10], [9, 10], [9, 4], [12, 4], [13, 7]]),
      hpMod: 1.08,
      countMod: 1,
    },
    {
      id: 'rift',
      label: 'RIFT',
      corners: scaleCorners([[0, 9], [0, 5], [2, 5], [2, 9], [5, 9], [5, 2], [9, 2], [9, 8], [12, 8], [13, 5]]),
      hpMod: 1.1,
      countMod: 0,
    },
    {
      id: 'march',
      label: 'MARCH',
      corners: scaleCorners([[0, 2], [0, 10], [3, 10], [3, 1], [6, 1], [6, 11], [9, 11], [9, 3], [12, 3], [13, 6]]),
      hpMod: 1.12,
      countMod: 1,
    },
    {
      id: 'ladder',
      label: 'LADDER',
      corners: scaleCorners([[0, 1], [0, 8], [3, 8], [3, 2], [6, 2], [6, 9], [9, 9], [9, 1], [12, 1], [13, 6]]),
      hpMod: 1.06,
      countMod: 0,
    },
    {
      id: 'delta',
      label: 'DELTA',
      corners: scaleCorners([[0, 5], [0, 2], [4, 2], [4, 9], [8, 9], [8, 1], [12, 1], [13, 6]]),
      hpMod: 1.04,
      countMod: 0,
    },
    {
      id: 'omega',
      label: 'OMEGA',
      corners: scaleCorners([[0, 6], [0, 10], [2, 10], [2, 3], [7, 3], [7, 11], [11, 11], [11, 4], [13, 4], [13, 6]]),
      hpMod: 1.07,
      countMod: 1,
    },
    {
      id: 'cross',
      label: 'CROSS',
      corners: scaleCorners([[0, 6], [3, 6], [3, 2], [6, 2], [6, 10], [9, 10], [9, 6], [13, 6]]),
      hpMod: 1.03,
      countMod: 0,
    },
    {
      id: 'pulse',
      label: 'PULSE',
      corners: scaleCorners([[0, 2], [0, 9], [4, 9], [4, 4], [9, 4], [9, 10], [12, 10], [13, 5]]),
      hpMod: 1.09,
      countMod: 1,
    },
  ];

  function key(r, c) {
    return r + ',' + c;
  }

  function parseKey(k) {
    return k.split(',').map(Number);
  }

  function mirrorCol(c) {
    return LAST_COL - c;
  }

  function mirrorCorners(corners) {
    return corners.map(([r, c]) => [r, mirrorCol(c)]);
  }

  function shiftCorners(corners, dr, dc) {
    return corners.map(([r, c]) => [r + dr, c + dc]);
  }

  function inBounds(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  function isWalkableCell(grid, r, c) {
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

  function expandCorners(corners) {
    const path = [];
    const seen = new Set();
    for (let i = 0; i < corners.length - 1; i++) {
      const seg = cellsAlongSegment(corners[i], corners[i + 1]);
      for (const cell of seg) {
        const k = key(cell[0], cell[1]);
        if (!seen.has(k)) {
          seen.add(k);
          path.push(cell);
        }
      }
    }
    return path;
  }

  function dedupePath(pathCells) {
    const out = [];
    appendPathCells(out, pathCells);
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

  function concatPaths(parts) {
    const out = [];
    for (const part of parts) {
      appendPathCells(out, part);
    }
    return out;
  }

  function blankGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(C.CELL_VOID));
  }

  function placePath(grid, pathCells) {
    pathCells.forEach(([r, c]) => {
      if (grid[r][c] === C.CELL_VOID) grid[r][c] = C.CELL_PATH;
    });
  }

  function countCells(grid) {
    let path = 0;
    let slots = 0;
    let tunnels = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r][c];
        if (cell === C.CELL_PATH) path++;
        else if (cell === C.CELL_SLOT) slots++;
        else if (cell === C.CELL_TUNNEL) tunnels++;
      }
    }
    return { path, slots, tunnels };
  }

  function countTurns(pathCells) {
    if (pathCells.length < 3) return 0;
    let turns = 0;
    for (let i = 1; i < pathCells.length - 1; i++) {
      const [pr, pc] = pathCells[i - 1];
      const [r, c] = pathCells[i];
      const [nr, nc] = pathCells[i + 1];
      const d1r = r - pr;
      const d1c = c - pc;
      const d2r = nr - r;
      const d2c = nc - c;
      if (d1r !== d2r || d1c !== d2c) turns++;
    }
    return turns;
  }

  function generateCompactSpiral() {
    const left = 2;
    const right = LAST_COL - 2;
    for (let attempt = 0; attempt < 25; attempt++) {
      let startCol = left + Math.floor(Math.random() * (right - left + 1));
      let c = startCol;
      const path = [[0, c]];
      let goingRight = true;
      const minRowSpan = 3;
      const maxRowSpan = 5;

      for (let r = 1; r <= LAST_ROW; r++) {
        if (path[path.length - 1][0] !== r) path.push([r, c]);
        if (r === LAST_ROW) {
          const goalCol = left + Math.floor(Math.random() * (right - left + 1));
          while (c !== goalCol) {
            c += Math.sign(goalCol - c);
            path.push([r, c]);
          }
        } else {
          const span = minRowSpan + Math.floor(Math.random() * (maxRowSpan - minRowSpan + 1));
          const dir = goingRight ? 1 : -1;
          for (let s = 0; s < span; s++) {
            const nc = c + dir;
            if (nc < left || nc > right) break;
            c = nc;
            path.push([r, c]);
          }
          goingRight = !goingRight;
        }
      }
      const finalPath = dedupePath(path);
      if (finalPath.length < 35 || finalPath.length > MAX_PATH_CELLS) continue;
      if (finalPath[0][0] !== 0 || finalPath[finalPath.length - 1][0] !== LAST_ROW) continue;
      if (countTurns(finalPath) < 8) continue;
      return finalPath;
    }
    return null;
  }

  function voidRatio(grid) {
    const stats = countCells(grid);
    const used = stats.path + stats.tunnels + stats.slots;
    return (ROWS * COLS - used) / (ROWS * COLS);
  }

  function isPocketEnclosed(grid, cells) {
    const cellSet = new Set(cells.map(([cr, cc]) => key(cr, cc)));
    for (const [cr, cc] of cells) {
      for (const [dr, dc] of DIRS) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (!inBounds(nr, nc)) return false;
        const nk = key(nr, nc);
        if (cellSet.has(nk)) continue;
        const cell = grid[nr][nc];
        if (cell === C.CELL_VOID) return false;
        if (cell !== C.CELL_PATH && cell !== C.CELL_TUNNEL && cell !== C.CELL_SLOT) return false;
      }
    }
    return true;
  }

  function enumerateVoidPockets(grid) {
    const visited = new Set();
    const pockets = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const k = key(r, c);
        if (grid[r][c] !== C.CELL_VOID || visited.has(k)) continue;

        const cells = [];
        const queue = [[r, c]];
        visited.add(k);
        let touchesPath = false;

        while (queue.length) {
          const [cr, cc] = queue.shift();
          cells.push([cr, cc]);
          for (const [dr, dc] of DIRS) {
            const nr = cr + dr;
            const nc = cc + dc;
            if (!inBounds(nr, nc)) continue;
            const cell = grid[nr][nc];
            if (cell === C.CELL_PATH || cell === C.CELL_TUNNEL) touchesPath = true;
            const nk = key(nr, nc);
            if (cell === C.CELL_VOID && !visited.has(nk)) {
              visited.add(nk);
              queue.push([nr, nc]);
            }
          }
        }

        if (cells.length > POCKET_MAX_SIZE) continue;
        const isEnclosed = isPocketEnclosed(grid, cells);
        pockets.push({
          cells,
          size: cells.length,
          touchesPath,
          isEnclosed,
        });
      }
    }
    return pockets;
  }

  function countEnclosedPockets(grid) {
    return enumerateVoidPockets(grid).filter((p) => p.isEnclosed).length;
  }

  function pocketSlotTarget(size, isEnclosed) {
    if (size <= 2) return 0;
    if (isEnclosed) {
      if (size <= 4) return 2;
      return Math.min(size - 1, Math.max(2, Math.ceil(size * 0.55)));
    }
    if (size <= 5) return 1 + Math.floor(Math.random() * 2);
    if (size <= 10) return 2 + Math.floor(Math.random() * 2);
    return Math.min(5, 3 + Math.floor(Math.random() * 3));
  }

  function placePocketIslandSlots(grid, routes, budget) {
    const pathSet = new Set();
    routes.forEach((route) => {
      route.forEach(([r, c]) => pathSet.add(key(r, c)));
    });

    const pockets = enumerateVoidPockets(grid).filter((p) => p.touchesPath && p.size >= 3);
    pockets.sort((a, b) => {
      if (a.isEnclosed !== b.isEnclosed) return a.isEnclosed ? -1 : 1;
      if (b.size !== a.size) return b.size - a.size;
      const maxA = Math.max(...a.cells.map((cell) => distCellToPathSet(cell, pathSet)));
      const maxB = Math.max(...b.cells.map((cell) => distCellToPathSet(cell, pathSet)));
      return maxB - maxA;
    });

    let placed = 0;
    for (const pocket of pockets) {
      if (placed >= budget) break;
      const want = pocketSlotTarget(pocket.size, pocket.isEnclosed);
      const slotsToPlace = Math.min(want, budget - placed, pocket.cells.length);
      if (slotsToPlace <= 0) continue;

      const sorted = pocket.cells.slice().sort(
        (a, b) => distCellToPathSet(b, pathSet) - distCellToPathSet(a, pathSet)
      );
      let n = 0;
      for (const [cr, cc] of sorted) {
        if (n >= slotsToPlace) break;
        if (grid[cr][cc] !== C.CELL_VOID) continue;
        grid[cr][cc] = C.CELL_SLOT;
        placed++;
        n++;
      }
    }
    return placed;
  }

  function enforceSlotBudget(grid, routes, minSlots, maxSlots) {
    let stats = countCells(grid);
    if (stats.slots <= maxSlots) return stats.slots;

    const pathSet = new Set();
    routes.forEach((route) => {
      route.forEach(([r, c]) => pathSet.add(key(r, c)));
    });

    const candidates = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] !== C.CELL_SLOT) continue;
        candidates.push({
          r,
          c,
          dist: distCellToPathSet([r, c], pathSet),
        });
      }
    }
    candidates.sort((a, b) => a.dist - b.dist);

    let toRemove = stats.slots - maxSlots;
    for (const slot of candidates) {
      if (toRemove <= 0) break;
      if (grid[slot.r][slot.c] !== C.CELL_SLOT) continue;
      grid[slot.r][slot.c] = C.CELL_VOID;
      toRemove--;
    }
    return countCells(grid).slots;
  }

  function topUpEnclosedSlots(grid, routes, need) {
    if (need <= 0) return 0;
    const pathSet = new Set();
    routes.forEach((route) => {
      route.forEach(([r, c]) => pathSet.add(key(r, c)));
    });
    const pockets = enumerateVoidPockets(grid)
      .filter((p) => p.isEnclosed)
      .sort((a, b) => b.size - a.size);
    let placed = 0;
    for (const pocket of pockets) {
      if (placed >= need) break;
      const sorted = pocket.cells.slice().sort(
        (a, b) => distCellToPathSet(b, pathSet) - distCellToPathSet(a, pathSet)
      );
      for (const [cr, cc] of sorted) {
        if (placed >= need) break;
        if (grid[cr][cc] !== C.CELL_VOID) continue;
        grid[cr][cc] = C.CELL_SLOT;
        placed++;
      }
    }
    return placed;
  }

  function generateLongCorridor() {
    for (let i = 0; i < 25; i++) {
      let pathCells = generateSerpentinePath();
      if (!pathCells) pathCells = generateWindyPath();
      if (!pathCells) continue;
      if (pathCells.length < 55) continue;
      return pathCells;
    }
    return null;
  }

  function distCellToPathSet(cell, pathSet) {
    const [cr, cc] = cell;
    let min = 999;
    for (const pk of pathSet) {
      const [pr, pc] = parseKey(pk);
      min = Math.min(min, Math.abs(cr - pr) + Math.abs(cc - pc));
    }
    return min;
  }

  function placeSlotPlatforms(grid, routes, opts) {
    opts = opts || {};
    const targetCount = opts.platformSlots != null ? opts.platformSlots : 4;
    const maxPerPocket = opts.maxPerPocket != null ? opts.maxPerPocket : 1;

    const pathSet = new Set();
    routes.forEach((route) => {
      route.forEach(([r, c]) => pathSet.add(key(r, c)));
    });

    const visited = new Set();
    const pockets = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const k = key(r, c);
        if (grid[r][c] !== C.CELL_VOID || visited.has(k)) continue;

        const pocket = [];
        const queue = [[r, c]];
        visited.add(k);
        const pathNeighborKeys = new Set();

        while (queue.length) {
          const [cr, cc] = queue.shift();
          pocket.push([cr, cc]);
          for (const [dr, dc] of DIRS) {
            const nr = cr + dr;
            const nc = cc + dc;
            if (!inBounds(nr, nc)) continue;
            const nk = key(nr, nc);
            const cell = grid[nr][nc];
            if (cell === C.CELL_PATH || cell === C.CELL_TUNNEL) {
              pathNeighborKeys.add(nk);
            } else if (cell === C.CELL_VOID && !visited.has(nk)) {
              visited.add(nk);
              queue.push([nr, nc]);
            }
          }
        }

        if (pocket.length < 2 || pocket.length > POCKET_MAX_SIZE) continue;
        if (!pathNeighborKeys.size) continue;

        pockets.push({ cells: pocket });
      }
    }

    pockets.sort((a, b) => {
      const maxA = Math.max(...a.cells.map((cell) => distCellToPathSet(cell, pathSet)));
      const maxB = Math.max(...b.cells.map((cell) => distCellToPathSet(cell, pathSet)));
      return maxB - maxA;
    });

    let placed = 0;
    for (const pocket of pockets) {
      if (placed >= targetCount) break;
      const slotsToPlace = Math.min(maxPerPocket, pocket.cells.length, targetCount - placed);
      const sorted = pocket.cells.slice().sort(
        (a, b) => distCellToPathSet(b, pathSet) - distCellToPathSet(a, pathSet)
      );
      let n = 0;
      for (const [cr, cc] of sorted) {
        if (n >= slotsToPlace) break;
        if (grid[cr][cc] !== C.CELL_VOID) continue;
        grid[cr][cc] = C.CELL_SLOT;
        placed++;
        n++;
      }
    }
    return placed;
  }

  function tryInjectThirdRoute(grid, routes, junctions) {
    if (routes.length < 2) return null;
    const altPath = routes[1];
    const forkResult = injectForkMerge(grid, altPath);
    if (!forkResult) return null;
    const allRoutes = enumerateRoutes(grid, routes[0][0], routes[0][routes[0].length - 1], 6);
    if (allRoutes.length < 3) return null;
    return {
      routes: allRoutes.slice(0, 3),
      junctions: junctions.concat(forkResult.junctions),
      shorterRoute: forkResult.shorterRoute,
    };
  }

  function linkPaths(a, b) {
    if (!a.length) return b.slice();
    const bridge = cellsAlongSegment(a[a.length - 1], b[0]);
    return concatPaths([a, bridge.slice(1), b]);
  }

  function chamberPath(innerR, innerC, innerH, innerW) {
    const top = innerR - 1;
    const left = innerC - 1;
    const bottom = innerR + innerH;
    const right = innerC + innerW;
    if (!inBounds(top, left) || !inBounds(bottom, right)) return null;
    if (bottom - top < 2 || right - left < 2) return null;

    const cells = [];
    for (let c = left; c <= right; c++) cells.push([top, c]);
    for (let r = top + 1; r <= bottom; r++) cells.push([r, right]);
    for (let c = right - 1; c >= left; c--) cells.push([bottom, c]);
    for (let r = bottom - 1; r > top; r--) cells.push([r, left]);
    return cells;
  }

  function partitionRowBands(count) {
    const start = 1;
    const end = LAST_ROW - 1;
    const bands = [];
    let row = start;
    for (let i = 0; i < count; i++) {
      const remaining = count - i;
      const rowsLeft = end - row + 1;
      const minNeed = remaining * 3;
      if (rowsLeft < minNeed) return null;
      const height = Math.min(rowsLeft - (remaining - 1) * 3, Math.max(3, Math.floor(rowsLeft / remaining)));
      bands.push({ start: row, end: row + height - 1 });
      row += height;
    }
    if (row <= end) bands[bands.length - 1].end = end;
    return bands;
  }

  function generateArenaPath() {
    for (let attempt = 0; attempt < 45; attempt++) {
      const spawnC = 1 + Math.floor(Math.random() * (COLS - 2));
      const goalC = 1 + Math.floor(Math.random() * (COLS - 2));
      const chamberCount = 2 + Math.floor(Math.random() * 2);
      const bands = partitionRowBands(chamberCount);
      if (!bands) continue;

      let path = [[0, spawnC]];
      let prevExit = spawnC;

      for (let i = 0; i < chamberCount; i++) {
        const band = bands[i];
        const bandH = band.end - band.start + 1;
        const innerH = Math.min(2 + Math.floor(Math.random() * 2), bandH - 2);
        const innerW = 3 + Math.floor(Math.random() * 3);
        const maxInnerC = COLS - innerW - 2;
        if (maxInnerC < 1) continue;
        const innerC = 1 + Math.floor(Math.random() * maxInnerC);
        const innerR = band.start + 1;
        if (innerR + innerH > band.end) continue;

        const chamber = chamberPath(innerR, innerC, innerH, innerW);
        if (!chamber) continue;

        const entry = chamber[0];
        if (i === 0) {
          path = linkPaths(path, chamber);
        } else {
          const bridgeStart = path[path.length - 1];
          const downRow = band.start;
          const midC = Math.floor((prevExit + entry[1]) / 2);
          const bridge = cellsAlongSegment(bridgeStart, [downRow, midC]);
          const toEntry = cellsAlongSegment([downRow, midC], entry);
          path = concatPaths([path, bridge.slice(1), toEntry.slice(1), chamber]);
        }
        prevExit = chamber[chamber.length - 1][1];
      }

      const last = path[path.length - 1];
      const toGoal = cellsAlongSegment(last, [LAST_ROW, goalC]);
      path = concatPaths([path, toGoal.slice(1)]);

      const finalPath = dedupePath(path);
      if (finalPath.length < MIN_PATH_LEN || finalPath.length > MAX_PATH_LEN) continue;
      if (finalPath[0][0] !== 0 || finalPath[0][1] !== spawnC) continue;
      const end = finalPath[finalPath.length - 1];
      if (end[0] !== LAST_ROW || end[1] !== goalC) continue;
      if (countTurns(finalPath) < 10) continue;
      return finalPath;
    }
    return null;
  }

  function generateSerpentinePath() {
    const left = 1;
    const right = LAST_COL - 1;

    for (let attempt = 0; attempt < 30; attempt++) {
      let startCol = left + Math.floor(Math.random() * (right - left + 1));
      let goalCol = left + Math.floor(Math.random() * (right - left + 1));
      const path = [[0, startCol]];
      let c = startCol;
      let goingRight = Math.random() < 0.5;

      for (let r = 1; r <= LAST_ROW; r++) {
        if (path[path.length - 1][0] !== r) {
          path.push([r, c]);
        }

        if (r === LAST_ROW) {
          while (c !== goalCol) {
            c += Math.sign(goalCol - c);
            path.push([r, c]);
          }
        } else {
          const span = 3 + Math.floor(Math.random() * 4);
          const dir = goingRight ? 1 : -1;
          for (let s = 0; s < span; s++) {
            const nc = c + dir;
            if (nc < left || nc > right) break;
            c = nc;
            path.push([r, c]);
          }
          goingRight = !goingRight;
        }
      }

      const finalPath = dedupePath(path);
      if (finalPath.length < MIN_PATH_LEN || finalPath.length > MAX_PATH_LEN) continue;
      if (finalPath[0][0] !== 0 || finalPath[finalPath.length - 1][0] !== LAST_ROW) continue;
      if (countTurns(finalPath) < MIN_TURNS) continue;
      return finalPath;
    }
    return null;
  }

  function tryInjectULoop(path) {
    const candidates = [];
    for (let i = 0; i < path.length - 2; i++) {
      const [r1, c1] = path[i];
      const [r2, c2] = path[i + 1];
      if (r1 !== r2) continue;
      const span = Math.abs(c2 - c1);
      if (span < 3 || span > 8) continue;
      if (r1 < 2 || r1 > LAST_ROW - 4) continue;
      candidates.push(i);
    }
    if (!candidates.length) return null;

    const i = candidates[Math.floor(Math.random() * candidates.length)];
    const [r, c1] = path[i];
    const [, c2] = path[i + 1];
    const depth = 2 + Math.floor(Math.random() * 2);
    const step = Math.sign(c2 - c1);
    const loop = [];

    for (let d = 1; d <= depth; d++) loop.push([r + d, c1]);
    const bottomR = r + depth;
    for (let c = c1 + step; c !== c2 + step; c += step) loop.push([bottomR, c]);
    for (let d = depth - 1; d >= 1; d--) loop.push([r + d, c2]);

    const merged = concatPaths([path.slice(0, i + 1), loop, path.slice(i + 1)]);
    if (merged.length > MAX_PATH_LEN) return null;
    if (merged[0][0] !== 0 || merged[merged.length - 1][0] !== LAST_ROW) return null;
    if (countTurns(merged) < MIN_TURNS) return null;
    return merged;
  }

  function generateLoopingSerpentine() {
    const arena = generateArenaPath();
    if (arena) return arena;

    let path = generateSerpentinePath();
    if (!path) return null;

    const loopCount = 1 + Math.floor(Math.random() * 2);
    for (let n = 0; n < loopCount; n++) {
      const next = tryInjectULoop(path);
      if (next) path = next;
    }

    if (path.length < MIN_PATH_LEN || path.length > MAX_PATH_LEN) return null;
    return path;
  }

  function generateWindyPath() {
    for (let attempt = 0; attempt < 30; attempt++) {
      const startCol = 1 + Math.floor(Math.random() * (COLS - 2));
      let r = 0;
      let c = startCol;
      const path = [[r, c]];
      const visited = new Set([key(r, c)]);
      let stuck = 0;

      while (r < LAST_ROW && stuck < 100) {
        const options = [];
        if (r < LAST_ROW) options.push([1, 0, 0.55]);
        if (c > 1) options.push([0, -1, 0.12]);
        if (c < LAST_COL - 1) options.push([0, 1, 0.12]);
        if (r > 0 && Math.random() < 0.06) options.push([-1, 0, 0.05]);

        let picked = null;
        const roll = Math.random();
        let acc = 0;
        const shuffled = options.slice().sort(() => Math.random() - 0.5);
        for (const [dr, dc, w] of shuffled) {
          acc += w;
          if (roll <= acc) {
            picked = [dr, dc];
            break;
          }
        }
        if (!picked) picked = [1, 0];

        const nr = r + picked[0];
        const nc = c + picked[1];
        if (!inBounds(nr, nc)) {
          stuck++;
          continue;
        }
        r = nr;
        c = nc;
        const k = key(r, c);
        if (!visited.has(k)) {
          visited.add(k);
          path.push([r, c]);
          stuck = 0;
        } else {
          stuck++;
        }
      }

      if (r < LAST_ROW) {
        while (r < LAST_ROW) {
          r++;
          const k = key(r, c);
          if (!visited.has(k)) {
            visited.add(k);
            path.push([r, c]);
          }
        }
      }

      const goalCol = 1 + Math.floor(Math.random() * (COLS - 2));
      while (c !== goalCol) {
        c += Math.sign(goalCol - c);
        const k = key(r, c);
        if (!visited.has(k)) {
          visited.add(k);
          path.push([r, c]);
        }
      }

      const finalPath = dedupePath(path);
      if (finalPath.length < MIN_PATH_LEN || finalPath.length > MAX_PATH_LEN + 10) continue;
      if (finalPath[0][0] !== 0 || finalPath[finalPath.length - 1][0] !== LAST_ROW) continue;
      if (countTurns(finalPath) < MIN_TURNS) continue;
      return finalPath;
    }
    return null;
  }

  function carveCorridor(grid, start, end) {
    const [sr, sc] = start;
    const [er, ec] = end;
    const open = new Set([key(sr, sc)]);
    const cameFrom = new Map();
    cameFrom.set(key(sr, sc), null);
    const gScore = new Map();
    gScore.set(key(sr, sc), 0);
    const fScore = new Map();
    fScore.set(key(sr, sc), Math.abs(er - sr) + Math.abs(ec - sc));

    function lowestF() {
      let bestK = null;
      let best = Infinity;
      for (const k of open) {
        const f = fScore.get(k) ?? Infinity;
        if (f < best) {
          best = f;
          bestK = k;
        }
      }
      return bestK;
    }

    while (open.size > 0) {
      const current = lowestF();
      if (!current) break;
      const [cr, cc] = parseKey(current);
      open.delete(current);
      if (cr === er && cc === ec) {
        const path = [];
        let cur = current;
        while (cur) {
          path.push(parseKey(cur));
          cur = cameFrom.get(cur);
        }
        path.reverse();
        path.forEach(([r, c]) => {
          if (grid[r][c] === C.CELL_VOID) grid[r][c] = C.CELL_PATH;
        });
        return path;
      }
      for (const [dr, dc] of DIRS) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (!inBounds(nr, nc)) continue;
        const cell = grid[nr][nc];
        if (cell !== C.CELL_VOID && !(nr === er && nc === ec)) continue;
        const nk = key(nr, nc);
        const tentative = (gScore.get(current) ?? Infinity) + 1;
        if (tentative >= (gScore.get(nk) ?? Infinity)) continue;
        cameFrom.set(nk, current);
        gScore.set(nk, tentative);
        fScore.set(nk, tentative + Math.abs(er - nr) + Math.abs(ec - nc));
        open.add(nk);
      }
    }
    return null;
  }

  function pathSetFromCells(cells) {
    const set = new Set();
    cells.forEach(([r, c]) => set.add(key(r, c)));
    return set;
  }

  function findAltAnchor(cell, prevCell, grid) {
    const [r, c] = cell;
    const options = [];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      if (grid[nr][nc] !== C.CELL_VOID) continue;
      if (prevCell && nr === prevCell[0] && nc === prevCell[1]) continue;
      options.push([nr, nc]);
    }
    if (!options.length) return null;
    return options[Math.floor(Math.random() * options.length)];
  }

  function injectForkMerge(grid, mainPath) {
    const forkCandidates = [];
    for (let i = 3; i < mainPath.length - FORK_TAIL_MARGIN; i++) {
      const [r] = mainPath[i];
      if (r >= FORK_ROW_MIN && r <= FORK_ROW_MAX) forkCandidates.push(i);
    }
    if (!forkCandidates.length) return null;

    for (let tryN = 0; tryN < 20; tryN++) {
      const forkIdx = forkCandidates[Math.floor(Math.random() * forkCandidates.length)];
      const mergeCandidates = [];
      for (let i = forkIdx + 8; i < mainPath.length - 2; i++) {
        const [r] = mainPath[i];
        if (r >= MERGE_ROW_MIN && r <= MERGE_ROW_MAX) mergeCandidates.push(i);
      }
      if (!mergeCandidates.length) continue;

      const mergeIdx = mergeCandidates[Math.floor(Math.random() * mergeCandidates.length)];
      const fork = mainPath[forkIdx];
      const merge = mainPath[mergeIdx];
      const forkPrev = mainPath[Math.max(0, forkIdx - 1)];
      const mergeNext = mainPath[Math.min(mainPath.length - 1, mergeIdx + 1)];

      const altStart = findAltAnchor(fork, forkPrev, grid);
      const altEnd = findAltAnchor(merge, mergeNext, grid);
      if (!altStart || !altEnd) continue;

      const workGrid = grid.map((row) => row.slice());
      const corridor = carveCorridor(workGrid, altStart, altEnd);
      if (!corridor || corridor.length < 4) continue;

      placePath(workGrid, cellsAlongSegment(fork, altStart));
      placePath(workGrid, corridor);
      placePath(workGrid, cellsAlongSegment(altEnd, merge));

      const entry = cellsAlongSegment(fork, altStart);
      const exit = cellsAlongSegment(altEnd, merge);
      const routeMain = mainPath.slice();
      const routeAlt = concatPaths([
        mainPath.slice(0, forkIdx + 1),
        entry,
        corridor,
        exit,
        mainPath.slice(mergeIdx),
      ]);

      if (routeMain.length < MIN_PATH_LEN || routeAlt.length < MIN_PATH_LEN) continue;
      if (routeMain.length > MAX_PATH_LEN || routeAlt.length > MAX_PATH_LEN) continue;

      const lenDiff = Math.abs(routeMain.length - routeAlt.length);
      const avgLen = (routeMain.length + routeAlt.length) / 2;
      if (lenDiff / avgLen > 0.35) continue;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          grid[r][c] = workGrid[r][c];
        }
      }

      const junctions = [fork, merge];
      return {
        routes: [routeMain, routeAlt],
        junctions,
        forkIdx,
        mergeIdx,
        shorterRoute: routeMain.length <= routeAlt.length ? 0 : 1,
      };
    }
    return null;
  }

  function enumerateRoutes(grid, spawn, goal, maxRoutes) {
    maxRoutes = maxRoutes || 4;
    const routes = [];
    const routeKeys = new Set();

    function dfs(r, c, path, visited) {
      if (routes.length >= maxRoutes) return;
      if (r === goal[0] && c === goal[1]) {
        const sig = path.map(([pr, pc]) => key(pr, pc)).join('|');
        if (!routeKeys.has(sig)) {
          routeKeys.add(sig);
          routes.push(path.slice());
        }
        return;
      }
      for (const [dr, dc] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        if (!isWalkableCell(grid, nr, nc)) continue;
        const k = key(nr, nc);
        if (visited.has(k)) continue;
        visited.add(k);
        path.push([nr, nc]);
        dfs(nr, nc, path, visited);
        path.pop();
        visited.delete(k);
      }
    }

    const startK = key(spawn[0], spawn[1]);
    dfs(spawn[0], spawn[1], [spawn.slice()], new Set([startK]));
    return routes;
  }

  function placeChokepointSlots(grid, routes, opts) {
    opts = opts || {};
    const pathSet = new Set();
    routes.forEach((route) => {
      route.forEach(([r, c]) => pathSet.add(key(r, c)));
    });

    const candidates = [];
    const seen = new Set();

    for (const k of pathSet) {
      const [r, c] = parseKey(k);
      const cell = grid[r][c];
      if (cell !== C.CELL_PATH && cell !== C.CELL_TUNNEL) continue;

      const pathNeighbors = DIRS
        .map(([dr, dc]) => [r + dr, c + dc])
        .filter(([nr, nc]) => pathSet.has(key(nr, nc)));

      let cornerScore = 0;
      if (pathNeighbors.length === 2) {
        const [a, b] = pathNeighbors;
        const d1r = a[0] - r;
        const d1c = a[1] - c;
        const d2r = b[0] - r;
        const d2c = b[1] - c;
        if (d1r * d2r + d1c * d2c === 0) cornerScore = 4;
      } else if (pathNeighbors.length >= 3) {
        cornerScore = 5;
      }

      for (const [dr, dc] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        if (grid[nr][nc] !== C.CELL_VOID) continue;
        const sk = key(nr, nc);
        if (seen.has(sk)) continue;
        seen.add(sk);
        candidates.push({ r: nr, c: nc, score: cornerScore + (pathNeighbors.length === 1 ? 1 : 2) });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    const target = opts.target != null
      ? opts.target
      : Math.max(0, TARGET_SLOTS_MAX - countCells(grid).slots);
    let placed = 0;
    for (const slot of candidates) {
      if (placed >= target) break;
      if (grid[slot.r][slot.c] !== C.CELL_VOID) continue;
      grid[slot.r][slot.c] = C.CELL_SLOT;
      placed++;
    }
    return placed;
  }

  function markTunnelSegments(grid, routes, shorterRouteId) {
    const route = routes[shorterRouteId];
    if (!route || route.length < TUNNEL_MIN + 4) return [];

    const tunnelLen = TUNNEL_MIN + Math.floor(Math.random() * (TUNNEL_MAX - TUNNEL_MIN + 1));
    const maxStart = route.length - tunnelLen - 2;
    const startIdx = 2 + Math.floor(Math.random() * Math.max(1, maxStart - 2));
    const tunnelCells = route.slice(startIdx, startIdx + tunnelLen);

    const marked = [];
    for (const [r, c] of tunnelCells) {
      if (grid[r][c] === C.CELL_PATH) {
        grid[r][c] = C.CELL_TUNNEL;
        marked.push([r, c]);
      }
    }
    return marked;
  }

  function hpModForMaze(baseHpMod, routes) {
    if (!routes || !routes.length) return baseHpMod;
    const avgLen = routes.reduce((s, r) => s + r.length, 0) / routes.length;
    let mod = baseHpMod + Math.max(0, avgLen - 45) * 0.008;
    if (routes.length > 1) mod += (routes.length - 1) * 0.03;
    return mod;
  }

  function validateGenerated(grid, spawn, goal, routes, opts) {
    opts = opts || {};
    const minRoutes = opts.minRoutes != null ? opts.minRoutes : MIN_ROUTES;
    const minPath = opts.minPathLen != null ? opts.minPathLen : MIN_PATH_LEN;
    const maxPath = opts.maxPathLen != null ? opts.maxPathLen : MAX_PATH_LEN;
    const minTurns = opts.minTurns != null ? opts.minTurns : MIN_TURNS;

    if (!spawn || !goal || !routes || routes.length < minRoutes) return false;
    if (spawn[0] !== 0 || goal[0] !== LAST_ROW) return false;
    if (!isWalkableCell(grid, spawn[0], spawn[1])) return false;
    if (!isWalkableCell(grid, goal[0], goal[1])) return false;

    for (const route of routes) {
      if (route.length < minPath || route.length > maxPath) return false;
      if (route[0][0] !== spawn[0] || route[0][1] !== spawn[1]) return false;
      const end = route[route.length - 1];
      if (end[0] !== goal[0] || end[1] !== goal[1]) return false;
    }

    if (countTurns(routes[0]) < minTurns) return false;

    const stats = countCells(grid);
    if (stats.slots < TARGET_SLOTS_MIN || stats.slots > MAX_TOTAL_SLOTS) return false;
    if (stats.path + stats.tunnels > MAX_PATH_CELLS) return false;
    if (voidRatio(grid) > MAX_VOID_RATIO) return false;

    if (opts.minEnclosedPockets != null && countEnclosedPockets(grid) < opts.minEnclosedPockets) {
      return false;
    }

    const enumerated = enumerateRoutes(grid, spawn, goal, 6);
    if (enumerated.length < minRoutes) return false;

    if (!PathLib) return true;
    try {
      new PathLib.PathFinder(grid, spawn, goal, { precomputedRoutes: routes });
      return true;
    } catch (_e) {
      return false;
    }
  }

  function buildMazeMap(mainPath, meta) {
    meta = meta || {};
    const requireFork = meta.requireFork !== false;
    const allowTunnels = meta.allowTunnels !== false;
    const minPathLen = meta.minPathLen || MIN_PATH_LEN;
    if (!mainPath || mainPath.length < minPathLen) return null;

    const spawn = mainPath[0];
    const goal = mainPath[mainPath.length - 1];
    if (spawn[0] !== 0 || goal[0] !== LAST_ROW) return null;

    const grid = blankGrid();
    placePath(grid, mainPath);

    let routes;
    let junctions;
    let shorterRoute = 0;

    if (requireFork) {
      const forkResult = injectForkMerge(grid, mainPath);
      if (!forkResult) return null;
      routes = forkResult.routes;
      junctions = forkResult.junctions;
      shorterRoute = forkResult.shorterRoute;

      if (meta.tripleFork) {
        const third = tryInjectThirdRoute(grid, routes, junctions);
        if (third) {
          routes = third.routes;
          junctions = third.junctions;
          shorterRoute = third.shorterRoute;
        }
      }
    } else {
      routes = [mainPath];
      junctions = [];
    }

    const tunnelCells = allowTunnels ? markTunnelSegments(grid, routes, shorterRoute) : [];

    const targetTotal = TARGET_SLOTS_MIN +
      Math.floor(Math.random() * (TARGET_SLOTS_MAX - TARGET_SLOTS_MIN + 1));
    const pocketBudget = Math.max(18, targetTotal - 4);

    let slotCount = placePocketIslandSlots(grid, routes, pocketBudget);

    const remaining = Math.max(0, targetTotal - countCells(grid).slots);
    if (remaining > 0) {
      slotCount += placeChokepointSlots(grid, routes, { target: remaining });
    }

    if (countCells(grid).slots < TARGET_SLOTS_MIN) {
      slotCount += topUpEnclosedSlots(
        grid, routes, TARGET_SLOTS_MIN - countCells(grid).slots
      );
    }

    if (countCells(grid).slots < TARGET_SLOTS_MIN) {
      slotCount += placeSlotPlatforms(grid, routes, {
        platformSlots: TARGET_SLOTS_MIN - countCells(grid).slots,
        maxPerPocket: 2,
      });
    }

    enforceSlotBudget(grid, routes, TARGET_SLOTS_MIN, TARGET_SLOTS_MAX);

    const valOpts = {
      minRoutes: requireFork ? MIN_ROUTES : 1,
      minPathLen: meta.minPathLen,
      maxPathLen: meta.maxPathLen,
      minTurns: meta.minTurns,
      minEnclosedPockets: meta.minEnclosedPockets,
    };
    if (!validateGenerated(grid, spawn, goal, routes, valOpts)) return null;

    const stats = countCells(grid);
    const code = meta.code || Math.floor(100 + Math.random() * 900);
    const label = meta.label || 'MAZE';
    const baseHpMod = meta.hpMod || 1.05;
    const hpMod = hpModForMaze(baseHpMod, routes);
    let rewardMod = meta.rewardMod != null ? meta.rewardMod : 1 + (hpMod - 1) * 0.55;
    let countMod = meta.countMod || 0;

    return {
      id: 'random',
      templateId: meta.templateId || 'procedural',
      themeLabel: meta.themeLabel || label,
      name: 'RANDOM ' + label + '-' + code,
      hpMod,
      countMod,
      rewardMod,
      spawn,
      goal,
      grid,
      routes,
      junctions,
      tunnelCells,
      pathLength: stats.path + stats.tunnels,
      slotCount: stats.slots,
      routeCount: routes.length,
      turnCount: countTurns(routes[0]),
      mirrored: !!meta.mirrored,
    };
  }

  function buildFromTemplate(template, opts) {
    opts = opts || {};
    let corners = template.corners.map(([r, c]) => [r, c]);
    if (opts.mirror) corners = mirrorCorners(corners);
    if (opts.colShift) corners = shiftCorners(corners, 0, opts.colShift);
    if (!corners.every(([r, c]) => inBounds(r, c))) return null;

    const pathCells = expandCorners(corners);
    if (pathCells.length < MIN_PATH_LEN - 5) return null;
    return buildMazeMap(pathCells, {
      templateId: template.id,
      label: template.label,
      hpMod: template.hpMod,
      countMod: template.countMod,
      mirrored: !!opts.mirror,
      code: opts.code || Math.floor(100 + Math.random() * 900),
    });
  }

  function tryTheme(themeId, code) {
    const baseMeta = { code, templateId: themeId };

    if (themeId === 'fortress') {
      for (let i = 0; i < 20; i++) {
        const path = generateCompactSpiral();
        if (!path) continue;
        const map = buildMazeMap(path, Object.assign({}, baseMeta, {
          themeLabel: 'FORTRESS',
          label: 'FORTRESS',
          hpMod: 0.95,
          minPathLen: 35,
          maxPathLen: 70,
          minTurns: 8,
          minEnclosedPockets: 1,
        }));
        if (map) return map;
      }
      return null;
    }

    if (themeId === 'corridor') {
      for (let i = 0; i < 20; i++) {
        const path = generateLongCorridor();
        if (!path) continue;
        const map = buildMazeMap(path, Object.assign({}, baseMeta, {
          themeLabel: 'CORRIDOR',
          label: 'CORRIDOR',
          requireFork: false,
          allowTunnels: false,
          hpMod: 1.02,
          countMod: -1,
          rewardMod: 1.15,
          minPathLen: 55,
          maxPathLen: 95,
        }));
        if (map) return map;
      }
      return null;
    }

    if (themeId === 'rift') {
      for (let i = 0; i < 25; i++) {
        let path = generateLoopingSerpentine();
        if (!path) path = generateWindyPath();
        if (!path) path = generateSerpentinePath();
        if (!path) continue;
        const map = buildMazeMap(path, Object.assign({}, baseMeta, {
          themeLabel: 'RIFT',
          label: 'RIFT',
          tripleFork: true,
          hpMod: 1.08,
          rewardMod: 1.12,
        }));
        if (map) return map;
      }
      return null;
    }

    if (themeId === 'chaos') {
      for (let i = 0; i < 25; i++) {
        let path = generateLoopingSerpentine();
        if (!path) path = generateWindyPath();
        if (!path) continue;
        const map = buildMazeMap(path, Object.assign({}, baseMeta, {
          themeLabel: 'CHAOS',
          label: 'CHAOS',
          hpMod: 1.1,
          minEnclosedPockets: 2,
        }));
        if (map) return map;
      }
      return null;
    }

    for (let i = 0; i < 20; i++) {
      let path = generateLoopingSerpentine();
      if (!path) path = generateSerpentinePath();
      if (!path) path = generateWindyPath();
      if (!path) continue;
      const map = buildMazeMap(path, Object.assign({}, baseMeta, {
        themeLabel: 'MAZE',
        label: 'MAZE',
        hpMod: 1.05,
        countMod: 0,
        minEnclosedPockets: 2,
      }));
      if (map) return map;
    }
    return null;
  }

  function generateRandomMap() {
    const code = Math.floor(100 + Math.random() * 900);
    const themes = ['maze', 'maze', 'fortress', 'fortress', 'fortress', 'corridor', 'rift', 'chaos'];
    const order = themes.slice().sort(() => Math.random() - 0.5);

    for (const themeId of order) {
      const map = tryTheme(themeId, code);
      if (map) return map;
    }

    for (let i = 0; i < 15; i++) {
      let pathCells = generateLoopingSerpentine();
      if (!pathCells) pathCells = generateSerpentinePath();
      if (!pathCells) pathCells = generateWindyPath();
      const map = buildMazeMap(pathCells, {
        templateId: 'procedural',
        themeLabel: 'MAZE',
        label: 'MAZE',
        hpMod: 1.05,
        countMod: 0,
        code,
      });
      if (map) return map;
    }

    const templateOrder = PATH_TEMPLATES.slice();
    for (let i = templateOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [templateOrder[i], templateOrder[j]] = [templateOrder[j], templateOrder[i]];
    }

    for (const template of templateOrder) {
      const mirrors = Math.random() < 0.5 ? [false, true] : [true, false];
      const shifts = [0];
      if (Math.random() < 0.45) shifts.push(-1, 1);

      for (const mirror of mirrors) {
        for (const colShift of shifts) {
          const map = buildFromTemplate(template, {
            mirror,
            colShift,
            code: Math.floor(100 + Math.random() * 900),
          });
          if (map) return map;
        }
      }
    }

    const fallback = window.NeonSiegeMaps && window.NeonSiegeMaps.get(0);
    if (fallback) {
      return {
        id: 'random',
        templateId: 'fallback',
        name: 'RANDOM GRID',
        hpMod: fallback.hpMod,
        countMod: fallback.countMod,
        rewardMod: fallback.rewardMod || 1,
        spawn: fallback.spawn.slice(),
        goal: fallback.goal.slice(),
        grid: window.NeonSiegeMaps.cloneGrid(fallback),
        routes: null,
        junctions: [],
        tunnelCells: [],
        pathLength: 0,
        slotCount: window.NeonSiegeMaps.countSlots(fallback.grid),
        routeCount: 1,
        turnCount: 0,
        mirrored: false,
      };
    }
    return null;
  }

  window.NeonSiegeMapGen = {
    PATH_TEMPLATES,
    generateRandomMap,
    generateSerpentinePath,
    generateArenaPath,
    generateLoopingSerpentine,
    generateWindyPath,
    generateCompactSpiral,
    buildMazeMap,
    buildFromTemplate,
    expandCorners,
    injectForkMerge,
    placeChokepointSlots,
    placePocketIslandSlots,
    placeSlotPlatforms,
    enumerateVoidPockets,
    enforceSlotBudget,
    markTunnelSegments,
    enumerateRoutes,
    countTurns,
    countEnclosedPockets,
    voidRatio,
  };
})();
