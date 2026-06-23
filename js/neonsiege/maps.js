(function () {
  const C = window.NeonSiegeConstants;

  function blankGrid() {
    return Array.from({ length: 14 }, () => Array(12).fill(0));
  }

  function applyPath(grid, cells) {
    cells.forEach(([r, c]) => {
      grid[r][c] = C.CELL_PATH;
    });
  }

  function applySlots(grid, cells) {
    cells.forEach(([r, c]) => {
      if (grid[r][c] === C.CELL_VOID) grid[r][c] = C.CELL_SLOT;
    });
  }

  function mirrorCol(c) {
    return 11 - c;
  }

  function mirrorCells(cells) {
    return cells.map(([r, c]) => [r, mirrorCol(c)]);
  }

  // Zigzag path: top-left entry -> bottom-center core (~32 path cells)
  const NEON_GRID_PATH = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 4], [2, 4], [3, 4],
    [3, 5], [3, 6], [3, 7], [3, 8],
    [4, 8], [5, 8], [6, 8], [7, 8],
    [7, 7], [7, 6], [7, 5], [7, 4],
    [8, 4], [9, 4], [10, 4],
    [10, 5], [10, 6], [10, 7], [10, 8],
    [11, 8], [12, 8], [12, 7], [13, 7], [13, 6],
  ];

  const NEON_GRID_SLOTS = [
    [1, 2], [1, 5], [2, 3], [2, 6],
    [3, 2], [3, 9], [4, 7], [4, 9],
    [5, 2], [5, 9], [6, 3], [6, 9],
    [7, 2], [7, 9], [8, 2], [8, 5],
    [9, 2], [9, 6], [10, 2], [10, 9],
    [11, 7], [11, 9], [12, 2], [12, 6],
    [13, 4], [13, 5],
  ];

  const SPIRAL_CORE_PATH = mirrorCells(NEON_GRID_PATH);
  const SPIRAL_CORE_SLOTS = mirrorCells(NEON_GRID_SLOTS);

  function buildMap(id, name, hpMod, countMod, rewardMod, spawn, goal, pathCells, slotCells) {
    const grid = blankGrid();
    applyPath(grid, pathCells);
    applySlots(grid, slotCells);
    return { id, name, hpMod, countMod, rewardMod, spawn, goal, grid };
  }

  const MAPS = [
    buildMap(
      'neonGrid',
      'NEON GRID',
      1,
      0,
      1,
      [0, 1],
      [13, 6],
      NEON_GRID_PATH,
      NEON_GRID_SLOTS
    ),
    buildMap(
      'spiralCore',
      'SPIRAL CORE',
      1.2,
      1,
      1.15,
      [0, 10],
      [13, 5],
      SPIRAL_CORE_PATH,
      SPIRAL_CORE_SLOTS
    ),
  ];

  const RANDOM_MAP_INDEX = 2;

  function generateRandom() {
    if (window.NeonSiegeMapGen) {
      return window.NeonSiegeMapGen.generateRandomMap();
    }
    return MAPS[0];
  }

  function isRandomIndex(index) {
    return index === RANDOM_MAP_INDEX;
  }

  function validateMap(map) {
    if (!window.NeonSiegePath) return true;
    try {
      new window.NeonSiegePath.PathFinder(map.grid, map.spawn, map.goal);
      return true;
    } catch (_e) {
      return false;
    }
  }

  window.NeonSiegeMaps = {
    list: MAPS,

    get(index) {
      if (isRandomIndex(index)) return generateRandom();
      return MAPS[index] || MAPS[0];
    },

    generateRandom,
    isRandomIndex,
    RANDOM_MAP_INDEX,

    cloneGrid(map) {
      return map.grid.map((row) => row.slice());
    },

    countSlots(grid) {
      let n = 0;
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c] === C.CELL_SLOT) n++;
        }
      }
      return n;
    },

    validateAll() {
      return MAPS.every(validateMap);
    },
  };
})();
