(function () {
  const C = window.FroggerConstants;

  function createParticles() {
    return [];
  }

  function spawnParticles(list, x, y, color, count, type) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const spd = type === "splash" ? 1 + Math.random() * 3 : 0.5 + Math.random() * 4;
      list.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - (type === "jump" ? 3 : 0),
        alpha: 1,
        size: 2 + Math.random() * 4,
        color,
        life: 1,
        decay: 0.04 + Math.random() * 0.04,
        gravity: type === "burst" ? 0.15 : 0.05
      });
    }
  }

  function updateParticles(list) {
    list.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life -= p.decay;
      p.alpha = Math.max(0, p.life);
    });
    return list.filter((p) => p.life > 0);
  }

  function createFrog() {
    return { worldX: C.FROG_START_X, z: 0, riding: null };
  }

  function createAnim() {
    return { active: false, fromX: C.FROG_START_X, fromZ: 0, toX: C.FROG_START_X, toZ: 0, startMs: 0, dur: C.JUMP_MS };
  }

  function createGameState(best) {
    const lanes = {};
    for (let z = -1; z < 25; z++) lanes[z] = window.FroggerWorld.generateLane(z);
    return {
      frog: createFrog(),
      anim: createAnim(),
      lanes,
      state: "title",
      best,
      lives: C.LIVES_MAX,
      maxZ: 0,
      combo: 0,
      forwardStreak: 0,
      score: 0,
      lastHop: 0,
      invincibleUntil: 0,
      shake: 0
    };
  }

  window.FroggerEntities = {
    createGameState,
    createParticles,
    spawnParticles,
    updateParticles
  };
})();
