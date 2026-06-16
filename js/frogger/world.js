(function () {
  const C = window.FroggerConstants;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function laneDifficulty(z) {
    return clamp((z - 3) / 60, 0, 1);
  }

  const WATER_PATTERNS = [
    [
      { relX: 0.2, width: 1.35, type: "lily_pad" },
      { relX: 2.8, width: 1.35, type: "lily_pad" },
      { relX: 5.5, width: 3.4, type: "log" },
      { relX: 9.2, width: 1.35, type: "lily_pad" }
    ],
    [
      { relX: -0.5, width: 3.2, type: "log" },
      { relX: 3.5, width: 1.35, type: "lily_pad" },
      { relX: 6.2, width: 1.35, type: "lily_pad" },
      { relX: 8.8, width: 2.8, type: "turtle" }
    ],
    [
      { relX: 0.5, width: 1.35, type: "lily_pad" },
      { relX: 3.0, width: 2.8, type: "turtle" },
      { relX: 6.5, width: 3.4, type: "log" },
      { relX: 10.0, width: 1.35, type: "lily_pad" }
    ]
  ];

  const ROAD_PATTERNS = [
    [{ relX: 0.5, width: 1.25, kind: "car" }, { relX: 5.5, width: 1.25, kind: "car" }, { relX: 9.0, width: 2.1, kind: "truck" }],
    [{ relX: 2.0, width: 2.1, kind: "truck" }, { relX: 7.5, width: 1.25, kind: "fast" }],
    [{ relX: 1.0, width: 1.25, kind: "fast" }, { relX: 4.5, width: 1.25, kind: "car" }, { relX: 8.0, width: 1.25, kind: "car" }]
  ];

  function pickPattern(list, z) {
    return list[Math.abs(z * 7 + 3) % list.length];
  }

  function createVehicle(spec, laneSpeed, colorIndex) {
    const speedSign = laneSpeed > 0 ? 1 : -1;
    const base = Math.abs(laneSpeed);
    let speedMult = spec.kind === "fast" ? 1.35 : spec.kind === "truck" ? 0.85 : 1;
    return {
      worldX: spec.relX,
      width: spec.width,
      kind: spec.kind,
      color: C.CAR_COLORS[(colorIndex + Math.abs(Math.floor(spec.relX))) % C.CAR_COLORS.length],
      speed: speedSign * base * speedMult
    };
  }

  function createPlatform(spec, laneSpeed) {
    return {
      worldX: spec.relX,
      width: spec.width,
      type: spec.type,
      speed: laneSpeed,
      submergeTimer: spec.type === "turtle" ? 3 + Math.random() * 2 : null,
      submerged: false
    };
  }

  function maybeCoin(z, laneType) {
    if (laneType !== "grass" && laneType !== "safe") return null;
    if (Math.random() > 0.22) return null;
    return { worldX: 1 + Math.floor(Math.random() * (C.GRID_COLS - 2)), z, collected: false };
  }

  function generateLane(z) {
    if (z <= 0) return { type: "safe", z, objects: [], speed: 0, coin: null };
    if (z === 1) return { type: "grass", z, objects: [], speed: 0, coin: maybeCoin(z, "grass") };
    if (z > 0 && z % 7 === 0) return { type: "safe", z, objects: [], speed: 0, coin: null };

    const diff = laneDifficulty(z);
    const roll = Math.random();
    let type;
    if (z < 5) type = roll < 0.35 ? "road" : "grass";
    else if (z < 12) type = roll < 0.38 ? "road" : roll < 0.72 ? "water" : "grass";
    else type = roll < 0.48 ? "road" : roll < 0.78 ? "water" : "grass";

    const lane = { type, z, objects: [], speed: 0, coin: maybeCoin(z, type) };

    if (type === "road") {
      const dir = Math.random() > 0.5 ? 1 : -1;
      lane.speed = dir * (1.0 + diff * 1.8 + Math.random() * 0.35);
      pickPattern(ROAD_PATTERNS, z).forEach((spec, i) => lane.objects.push(createVehicle(spec, lane.speed, i)));
    }

    if (type === "water") {
      const dir = Math.random() > 0.5 ? 1 : -1;
      lane.speed = dir * (0.45 + diff * 0.75 + Math.random() * 0.25);
      pickPattern(WATER_PATTERNS, z).forEach((spec) => lane.objects.push(createPlatform(spec, lane.speed)));
    }

    return lane;
  }

  function ensureLanes(lanes, frogZ) {
    for (let i = 0; i <= C.LOOKAHEAD_ROWS; i++) {
      const nz = frogZ + i;
      if (!lanes[nz]) lanes[nz] = generateLane(nz);
    }
    Object.keys(lanes).forEach((key) => {
      if (Number(key) < frogZ - C.CULL_BEHIND) delete lanes[key];
    });
  }

  window.FroggerWorld = {
    clamp,
    generateLane,
    ensureLanes,

    getGridSize(canvasW, canvasH) {
      return Math.min(canvasW / C.GRID_COLS, canvasH / 14);
    },

    worldToScreen(worldX, z, camZ, canvasW, canvasH) {
      const sz = this.getGridSize(canvasW, canvasH);
      const totalW = C.GRID_COLS * sz;
      const originX = (canvasW - totalW) / 2;
      const baseY = canvasH - sz * 1.5;
      return { x: originX + worldX * sz, y: baseY - (z - camZ) * sz, sz };
    },

    updateCamera(camZ, frogZ) {
      const target = Math.max(0, frogZ - C.CAMERA_OFFSET);
      return camZ + (target - camZ) * 0.12;
    },

    updateLaneObjects(lane, dt) {
      if (!lane.speed) return;
      lane.objects.forEach((obj) => {
        obj.worldX += obj.speed * dt;
        if (obj.worldX > C.GRID_COLS + 2) obj.worldX -= C.WRAP;
        if (obj.worldX < -2) obj.worldX += C.WRAP;
        if (obj.type === "turtle" && obj.submergeTimer != null) {
          obj.submergeTimer -= dt;
          if (obj.submergeTimer <= 0) {
            obj.submerged = !obj.submerged;
            obj.submergeTimer = obj.submerged ? 1.2 + Math.random() * 0.6 : 2.8 + Math.random() * 1.5;
          }
        }
      });
    }
  };
})();
