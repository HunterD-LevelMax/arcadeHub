(function () {
  const C = window.FroggerConstants;
  const World = window.FroggerWorld;
  const Physics = window.FroggerPhysics;
  const Entities = window.FroggerEntities;
  const Render = window.FroggerRender;

  function getHighScore(key) {
    try { return parseInt(localStorage.getItem("hs_" + key), 10) || 0; } catch { return 0; }
  }

  function setHighScore(key, v) {
    try { localStorage.setItem("hs_" + key, String(v)); } catch {}
  }

  class CrossyFrogGame {
    constructor(options) {
      this.canvas = options.canvas;
      this.ctx = this.canvas.getContext("2d");
      this.container = options.container;
      this.ui = options.ui;
      this.camZ = 0;
      this.particles = Entities.createParticles();
      this.lastTime = 0;
      this.gameState = null;
    }

    resize() {
      const rect = this.container.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }

    init() {
      this.camZ = 0;
      this.particles = Entities.createParticles();
      const best = getHighScore(C.HIGH_SCORE_KEY);
      this.gameState = Entities.createGameState(best);
      this.ui.score.textContent = "0";
      this.ui.best.textContent = String(best);
      this.ui.bestScore.textContent = "BEST: " + best;
      this.updateLivesUI(C.LIVES_MAX);
      this.ui.startOverlay.classList.remove("hidden");
      this.ui.gameoverOverlay.classList.add("hidden");
      this.ui.comboDisplay.style.opacity = "0";
    }

    updateLivesUI(lives) {
      [0, 1, 2].forEach((i) => {
        const el = document.getElementById("life" + i);
        if (el) el.classList.toggle("lost", i >= lives);
      });
    }

    startSession() {
      if (typeof unlockAudio === "function") unlockAudio();
      if (window.beginCoinSession) beginCoinSession(this.gameState.best, 'frogger', () => this.gameState.maxZ);
      this.gameState.state = "playing";
      this.ui.startOverlay.classList.add("hidden");
      this.lastTime = 0;
    }

    restartSession() {
      this.ui.gameoverOverlay.classList.add("hidden");
      this.init();
      this.startSession();
    }

    spawnScorePopup(text, x, y, color) {
      const el = document.createElement("div");
      el.className = "score-popup";
      el.textContent = text;
      el.style.cssText = `left:${x}px;top:${y}px;color:${color};text-shadow:0 0 8px ${color};`;
      this.container.appendChild(el);
      setTimeout(() => el.remove(), 1000);
    }

    updateComboUI() {
      const c = this.gameState.combo;
      if (c >= 3) {
        this.ui.comboDisplay.textContent = "x" + c + " COMBO!";
        this.ui.comboDisplay.style.opacity = "1";
        this.ui.comboDisplay.style.fontSize = Math.min(14 + c * 1.5, 28) + "px";
      } else {
        this.ui.comboDisplay.style.opacity = "0";
      }
    }

    getRenderPosition() {
      const gs = this.gameState;
      const anim = gs.anim;
      if (anim.active) {
        const elapsed = performance.now() - anim.startMs;
        const prog = Math.min(elapsed / anim.dur, 1);
        return {
          worldX: anim.fromX + (anim.toX - anim.fromX) * prog,
          z: anim.fromZ + (anim.toZ - anim.fromZ) * prog,
          jumpT: prog < 1 ? prog : 0,
          airborne: prog < 1
        };
      }
      return { worldX: gs.frog.worldX, z: gs.frog.z, jumpT: 0, airborne: false };
    }

    finishJumpIfNeeded() {
      const gs = this.gameState;
      const anim = gs.anim;
      if (!anim.active) return;
      if (performance.now() - anim.startMs < anim.dur) return;

      anim.active = false;
      gs.frog.worldX = anim.toX;
      gs.frog.z = anim.toZ;
      gs.frog.riding = null;

      const lane = gs.lanes[gs.frog.z];
      if (lane && lane.type === "water") {
        const platform = Physics.findPlatformUnder(gs.frog.worldX, lane);
        if (!platform) {
          this.triggerDeath("water");
          return;
        }
        gs.frog.riding = platform;
      }

      if (lane && lane.coin && !lane.coin.collected) {
        const coinX = lane.coin.worldX + 0.5;
        if (Math.abs(gs.frog.worldX - coinX) < 0.55) {
          lane.coin.collected = true;
          gs.score += 5;
          const p = World.worldToScreen(coinX, gs.frog.z, this.camZ, this.canvas.width, this.canvas.height);
          Entities.spawnParticles(this.particles, p.x, p.y, "#FFC107", 10, "burst");
          this.spawnScorePopup("+5 COIN", p.x - 24, p.y - 28, "#FFC107");
          if (window.hapticLight) hapticLight();
        }
      }
    }

    hop(dx, dz) {
      const gs = this.gameState;
      if (gs.state !== "playing" || gs.anim.active) return;
      if (performance.now() - gs.lastHop < C.HOP_COOLDOWN_MS) return;

      const frog = gs.frog;
      const newX = frog.worldX + dx;
      const newZ = frog.z + dz;
      if (newX - C.FROG_HALF_WIDTH < 0 || newX + C.FROG_HALF_WIDTH > C.GRID_COLS) return;
      if (newZ < 0) return;

      gs.lastHop = performance.now();
      if (typeof playSfx === "function") playSfx("frogger.hop", { volume: 0.4 });
      gs.anim = {
        active: true,
        fromX: frog.worldX,
        fromZ: frog.z,
        toX: newX,
        toZ: newZ,
        startMs: performance.now(),
        dur: C.JUMP_MS
      };

      const fromPos = World.worldToScreen(frog.worldX, frog.z, this.camZ, this.canvas.width, this.canvas.height);
      Entities.spawnParticles(this.particles, fromPos.x, fromPos.y, "#66BB6A", 5, "jump");
      if (window.hapticTick) hapticTick();

      if (dz > 0) {
        const prevMax = gs.maxZ;
        gs.maxZ = Math.max(gs.maxZ, newZ);
        if (newZ > prevMax) {
          gs.combo++;
          gs.forwardStreak++;
          const pts = gs.combo >= 5 ? 5 : gs.combo >= 3 ? 2 : 1;
          gs.score += pts;
          this.ui.score.textContent = String(gs.maxZ);
          const color = pts >= 5 ? "#ffff00" : pts >= 2 ? "#ff00ff" : "#39ff14";
          this.spawnScorePopup(pts >= 5 ? "+" + pts + "!" : pts >= 2 ? "+" + pts + " COMBO" : "+1", fromPos.x - 20, fromPos.y - 30, color);
          if (window.hapticLight) hapticLight();
          if (typeof playSfx === "function") playSfx("frogger.hop", { volume: 0.35 });
          if (gs.forwardStreak === 10) {
            gs.score += 10;
            this.spawnScorePopup("PERFECT x10 +10", fromPos.x - 40, fromPos.y - 50, "#ffff00");
            if (window.hapticSuccess) hapticSuccess();
          }
        }
      } else {
        gs.combo = 0;
        gs.forwardStreak = 0;
      }
      this.updateComboUI();
      World.ensureLanes(gs.lanes, newZ);
    }

    triggerDeath(cause) {
      const gs = this.gameState;
      if (gs.state !== "playing") return;
      gs.state = "dying";
      gs.combo = 0;
      gs.forwardStreak = 0;
      this.updateComboUI();
      gs.shake = cause === "road" ? 10 : 6;
      if (window.hapticMedium) hapticMedium();
      if (typeof playSfx === "function") playSfx(cause === "road" ? "frogger.hit" : "frogger.splash", { volume: 0.6 });

      const render = this.getRenderPosition();
      const p = World.worldToScreen(render.worldX, render.z, this.camZ, this.canvas.width, this.canvas.height);
      if (cause === "road") {
        Entities.spawnParticles(this.particles, p.x, p.y, "#ff3344", 22, "burst");
        Entities.spawnParticles(this.particles, p.x, p.y, "#39ff14", 12, "burst");
      } else {
        Entities.spawnParticles(this.particles, p.x, p.y, "#00f5ff", 24, "splash");
        Entities.spawnParticles(this.particles, p.x, p.y, "#fff", 10, "splash");
      }

      gs.lives--;
      this.updateLivesUI(gs.lives);
      setTimeout(() => {
        if (gs.lives > 0) {
          gs.frog.worldX = C.FROG_START_X;
          gs.frog.z = Math.max(0, gs.maxZ);
          gs.frog.riding = null;
          gs.anim.active = false;
          gs.invincibleUntil = Date.now() + C.INVINCIBLE_MS;
          gs.state = "playing";
        } else {
          this.endGame(cause);
        }
      }, 700);
    }

    endGame(cause) {
      const gs = this.gameState;
      gs.state = "dead";
      if (window.hapticHeavy) hapticHeavy();
      if (typeof playSfx === "function") playSfx(cause === "road" ? "frogger.hit" : "frogger.splash");
      const isNew = gs.maxZ > gs.best;
      if (isNew) {
        gs.best = gs.maxZ;
        setHighScore(C.HIGH_SCORE_KEY, gs.best);
      }
      this.ui.finalScore.textContent = String(gs.maxZ);
      this.ui.bestScore.textContent = (isNew ? "NEW BEST: " : "BEST: ") + gs.best;
      this.ui.best.textContent = String(gs.best);

      const titles = { road: ["SPLAT!", "ROAD PIZZA", "SQUISHED!"], water: ["BLUB BLUB...", "POND DIVE", "DROWNED!"] };
      const msgs = { road: "FROG GOT HIT BY A CAR", water: "FROG FELL IN THE WATER" };
      const pool = titles[cause] || ["GAME OVER"];
      this.ui.deathTitle.textContent = pool[Math.floor(Math.random() * pool.length)];
      this.ui.deathTitle.style.color = cause === "road" ? "#ff3344" : "#00f5ff";
      this.ui.deathTitle.style.textShadow = cause === "road" ? "0 0 30px #ff3344" : "0 0 30px #00f5ff";
      this.ui.deathMsg.textContent = msgs[cause] || "FROG MET THEIR END";
      if (window.awardAndShowCoins) awardAndShowCoins("frogger", gs.maxZ);
      this.ui.gameoverOverlay.classList.remove("hidden");
    }

    checkCollisions(airborne) {
      const gs = this.gameState;
      if (gs.state !== "playing" || Date.now() < gs.invincibleUntil || airborne) return;
      const lane = gs.lanes[gs.frog.z];
      if (!lane) return;
      if (lane.type === "road" && Physics.findVehicleHit(gs.frog.worldX, lane)) {
        this.triggerDeath("road");
        return;
      }
      if (lane.type === "water") {
        if (!Physics.findPlatformUnder(gs.frog.worldX, lane) || Physics.isFrogOffScreen(gs.frog.worldX)) {
          this.triggerDeath("water");
        }
      }
    }

    update(dt) {
      const gs = this.gameState;
      if (gs.state !== "playing" && gs.state !== "dying") return;

      this.finishJumpIfNeeded();
      const camTarget = gs.anim.active ? gs.anim.toZ : gs.frog.z;
      this.camZ = World.updateCamera(this.camZ, camTarget);
      Object.values(gs.lanes).forEach((lane) => World.updateLaneObjects(lane, dt));

      const render = this.getRenderPosition();
      if (gs.state === "playing" && !render.airborne) {
        const lane = gs.lanes[gs.frog.z];
        Physics.applyPlatformCarry(gs.frog, lane, dt, false);
        if (gs.frog.riding && gs.frog.riding.submerged) {
          this.triggerDeath("water");
          return;
        }
        if (lane && lane.type === "water" && Physics.isFrogOffScreen(gs.frog.worldX)) {
          this.triggerDeath("water");
          return;
        }
      }

      this.particles = Entities.updateParticles(this.particles);
      if (gs.shake > 0.2) gs.shake *= 0.86;
      if (gs.state === "playing") this.checkCollisions(render.airborne);
    }

    draw(time) {
      const gs = this.gameState;
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      ctx.save();
      if (gs.shake > 0.2) ctx.translate((Math.random() - 0.5) * gs.shake, (Math.random() - 0.5) * gs.shake);

      Render.drawSky(ctx, w, h, time, this.camZ);
      Object.keys(gs.lanes).map(Number).sort((a, b) => a - b).forEach((z) => {
        const pos = World.worldToScreen(0, z, this.camZ, w, h);
        if (pos.y - pos.sz / 2 < h + pos.sz && pos.y - pos.sz / 2 > -pos.sz * 2) {
          Render.drawLane(ctx, gs.lanes[z], this.camZ, time, w, h);
          if (gs.lanes[z].coin) Render.drawCoin(ctx, gs.lanes[z].coin, this.camZ, time, w, h);
        }
      });

      const render = this.getRenderPosition();
      const invincible = Date.now() < gs.invincibleUntil;
      Render.drawFrog(ctx, render.worldX, render.z, this.camZ, render.jumpT, invincible, w, h);
      Render.drawParticles(ctx, this.particles);

      if (invincible) {
        const fp = World.worldToScreen(render.worldX, render.z, this.camZ, w, h);
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "#39ff14";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(fp.x, fp.y, fp.sz * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    loop(ts) {
      requestAnimationFrame((t) => this.loop(t));
      const dt = this.lastTime ? Math.min((ts - this.lastTime) / 1000, 0.05) : 0;
      this.lastTime = ts;
      this.update(dt);
      this.draw(ts);
    }

    bindInput() {
      document.addEventListener("keydown", (e) => {
        if (this.gameState.state !== "playing") return;
        if (["ArrowUp", "KeyW"].includes(e.code)) { this.hop(0, 1); e.preventDefault(); }
        else if (["ArrowDown", "KeyS"].includes(e.code)) { this.hop(0, -1); e.preventDefault(); }
        else if (["ArrowLeft", "KeyA"].includes(e.code)) { this.hop(-1, 0); e.preventDefault(); }
        else if (["ArrowRight", "KeyD"].includes(e.code)) { this.hop(1, 0); e.preventDefault(); }
      });

      let touchStart = null;
      this.canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }, { passive: false });
      this.canvas.addEventListener("touchend", (e) => {
        e.preventDefault();
        if (!touchStart) return;
        const dx = e.changedTouches[0].clientX - touchStart.x;
        const dy = e.changedTouches[0].clientY - touchStart.y;
        touchStart = null;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 15) { this.hop(0, 1); return; }
        if (Math.abs(dx) > Math.abs(dy)) this.hop(dx > 0 ? 1 : -1, 0);
        else this.hop(0, dy < 0 ? 1 : -1);
      }, { passive: false });

      document.getElementById("startBtn").addEventListener("click", () => this.startSession());
      document.getElementById("restartBtn").addEventListener("click", () => this.restartSession());
    }

    boot() {
      this.resize();
      window.addEventListener("resize", () => this.resize());
      this.init();
      this.bindInput();
      this.lastTime = 0;
      requestAnimationFrame((t) => this.loop(t));
    }
  }

  window.CrossyFrogGame = CrossyFrogGame;
})();
