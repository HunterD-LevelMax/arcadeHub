(function () {
  const C = window.FroggerConstants;

  function aabbOverlap(aLeft, aRight, bLeft, bRight) {
    return aLeft < bRight && aRight > bLeft;
  }

  function frogBounds(worldX) {
    return { left: worldX - C.FROG_HALF_WIDTH, right: worldX + C.FROG_HALF_WIDTH };
  }

  function objectBounds(obj) {
    return { left: obj.worldX, right: obj.worldX + obj.width };
  }

  function overlapsWithWrap(frogX, obj) {
    const frog = frogBounds(frogX);
    const direct = objectBounds(obj);
    if (aabbOverlap(frog.left, frog.right, direct.left, direct.right)) return true;
    const shiftedRight = { left: direct.left + C.WRAP, right: direct.right + C.WRAP };
    if (aabbOverlap(frog.left, frog.right, shiftedRight.left, shiftedRight.right)) return true;
    const shiftedLeft = { left: direct.left - C.WRAP, right: direct.right - C.WRAP };
    return aabbOverlap(frog.left, frog.right, shiftedLeft.left, shiftedLeft.right);
  }

  function findPlatformUnder(frogX, lane) {
    if (!lane || lane.type !== "water") return null;
    for (const obj of lane.objects) {
      if (obj.submerged) continue;
      if (overlapsWithWrap(frogX, obj)) return obj;
    }
    return null;
  }

  function findVehicleHit(frogX, lane) {
    if (!lane || lane.type !== "road") return null;
    for (const obj of lane.objects) {
      if (overlapsWithWrap(frogX, obj)) return obj;
    }
    return null;
  }

  function isFrogOffScreen(frogX) {
    const b = frogBounds(frogX);
    return b.right < 0 || b.left > C.GRID_COLS;
  }

  function applyPlatformCarry(frog, lane, dt, airborne) {
    if (airborne || !lane || lane.type !== "water") {
      frog.riding = null;
      return false;
    }
    const platform = findPlatformUnder(frog.worldX, lane);
    if (!platform) {
      frog.riding = null;
      return false;
    }
    frog.riding = platform;
    frog.worldX += platform.speed * dt;
    return true;
  }

  window.FroggerPhysics = {
    overlapsWithWrap,
    findPlatformUnder,
    findVehicleHit,
    isFrogOffScreen,
    applyPlatformCarry
  };
})();
