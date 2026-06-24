(function () {
  const C = window.NeonSiegeConstants;

  const TIER_COLORS = {
    A: { fill: 'rgba(57, 255, 20,', stroke: '#39ff14' },
    B: { fill: 'rgba(255, 204, 0,', stroke: '#ffcc00' },
    C: { fill: 'rgba(0, 245, 255,', stroke: '#00f5ff' },
  };

  const TIER_LABELS = {
    A: 'Slot A — strong path coverage',
    B: 'Slot B — decent placement',
    C: 'Slot C — weak coverage for this tower',
  };

  function sampleRoutePoints(waypointPixels, stepPx) {
    const samples = [];
    for (let i = 0; i < waypointPixels.length - 1; i++) {
      const a = waypointPixels[i];
      const b = waypointPixels[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const steps = Math.max(1, Math.ceil(len / stepPx));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        samples.push({ x: a.x + dx * t, y: a.y + dy * t });
      }
    }
    return samples;
  }

  function computeSlotTiers(pathFinder, mapGrid, rangeCells, occupied, towers) {
    if (!pathFinder || !pathFinder.metrics) return {};
    const cs = pathFinder.metrics.cellSize;
    const rangePx = rangeCells * cs;
    const rangeSq = rangePx * rangePx;
    const stepPx = cs * 0.25;
    const routeSamples = pathFinder.routes.map((route) =>
      sampleRoutePoints(route.waypointPixels, stepPx)
    );
    const totalRoutes = Math.max(1, routeSamples.length);

    const towerCells = new Set();
    (towers || []).forEach((t) => towerCells.add(t.r + ',' + t.c));

    const tiers = {};
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (let r = 0; r < C.GRID_ROWS; r++) {
      for (let c = 0; c < C.GRID_COLS; c++) {
        if (mapGrid[r][c] !== C.CELL_SLOT) continue;
        if (occupied && occupied.has(r + ',' + c)) continue;

        const center = pathFinder.cellCenter(r, c);
        let totalSamples = 0;
        let inRangeSamples = 0;
        let routesCovered = 0;

        routeSamples.forEach((samples) => {
          let routeHit = false;
          samples.forEach((pt) => {
            totalSamples++;
            const dx = pt.x - center.x;
            const dy = pt.y - center.y;
            if (dx * dx + dy * dy <= rangeSq) {
              inRangeSamples++;
              routeHit = true;
            }
          });
          if (routeHit) routesCovered++;
        });

        const presence = totalSamples > 0 ? inRangeSamples / totalSamples : 0;
        const coverage = routesCovered / totalRoutes;

        let proxCount = 0;
        let hasAdjTower = false;
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= C.GRID_ROWS || nc < 0 || nc >= C.GRID_COLS) continue;
          if (mapGrid[nr][nc] === C.CELL_SLOT) proxCount++;
          if (towerCells.has(nr + ',' + nc)) hasAdjTower = true;
        }
        const proximity = Math.min(1, proxCount / 4 + (hasAdjTower ? 0.25 : 0));
        const score = 0.5 * presence + 0.3 * coverage + 0.2 * proximity;
        let tier = 'C';
        if (score >= 0.62) tier = 'A';
        else if (score >= 0.35) tier = 'B';

        tiers[r + ',' + c] = { tier, score, presence, coverage, proximity };
      }
    }
    return tiers;
  }

  window.NeonSiegePlacement = {
    TIER_COLORS,
    TIER_LABELS,
    computeSlotTiers,
  };
})();
