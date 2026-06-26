(function () {
  const B = window.NeonSiegeBalance;
  const C = window.NeonSiegeConstants;

  let nextId = 1;

  function uid() {
    return nextId++;
  }

  function resetIds() {
    nextId = 1;
  }

  let _techProvider = () => ({});

  function setTechProvider(fn) {
    _techProvider = fn || (() => ({}));
  }

  class Tower {
    constructor(type, r, c) {
      this.id = uid();
      this.type = type;
      this.r = r;
      this.c = c;
      this.tier = 0;
      this.cooldown = 0;
      this.totalSpent = B.TOWER_TYPES[type].cost;
      this.recoil = 0;
      this.aimAngle = 0;
      this.targetPriority = 'first';
      this.lanceTargetId = null;
      this.lanceRamp = 1;
    }

    get stats() {
      return B.getTowerStats(this.type, this.tier, _techProvider());
    }

    upgradeCost(wave) {
      return B.getUpgradeCost(this, wave);
    }

    sellValue(salvageBonus) {
      const base = 0.5 + (salvageBonus || 0);
      return Math.floor(this.totalSpent * base);
    }
  }

  class Enemy {
    constructor(typeKey, hpMult, pathFinder, laneOffset, spawnIndex, opts) {
      opts = opts || {};
      const def = B.ENEMY_TYPES[typeKey];
      this.id = uid();
      this.type = typeKey;
      this.elite = !!opts.elite;
      let hpScale = hpMult;
      if (this.elite) hpScale *= B.ELITE_HP_MULT;
      this.hp = def.hp * hpScale;
      this.maxHp = this.hp;
      this.shield = def.shield ? def.shield * hpScale : 0;
      this.maxShield = this.shield;
      this.speed = def.speed * (opts.speedMult || 1);
      this.reward = Math.floor(def.reward * (this.elite ? B.ELITE_REWARD_MULT : 1));
      this.score = def.score;
      this.split = !!def.split;
      this.pathIndex = 0;
      this.segT = 0;
      this.routeId = opts.routeId != null ? opts.routeId : 0;
      this.laneOffset = laneOffset;
      this.spawnIndex = spawnIndex;
      this.slowTimer = 0;
      this.slowFactor = 1;
      this.stunTimer = 0;
      this.trailPhase = Math.random() * Math.PI * 2;
      this.bossPhases = 0;
      this.inTunnel = false;
      const route = pathFinder.forRoute(this.routeId);
      const pos = route.positionAt(0, 0, laneOffset);
      this.x = pos.x;
      this.y = pos.y;
      this._pathDistPx = route.distanceAt(0, 0);
      const cell = pathFinder.cellAt(this.routeId, 0, 0);
      this.inTunnel = cell.type === C.CELL_TUNNEL;
    }

    get pathDistance() {
      return this._pathDistPx != null ? this._pathDistPx : this.pathIndex + this.segT;
    }

    move(dt, pathFinder, enemies) {
      if (this.stunTimer > 0) {
        this.stunTimer -= dt;
        return false;
      }
      if (this.slowTimer > 0) {
        this.slowTimer -= dt;
        if (this.slowTimer <= 0) this.slowFactor = 1;
      }

      const route = pathFinder.forRoute(this.routeId);
      const myDist = route.distanceAt(this.pathIndex, this.segT);
      const minGapPx = C.MIN_STAGGER_DIST * pathFinder.metrics.cellSize;

      let speedMult = this.slowFactor;
      for (const other of enemies) {
        if (other.id === this.id) continue;
        if (other.routeId !== this.routeId) continue;
        const otherDist = route.distanceAt(other.pathIndex, other.segT);
        if (otherDist <= myDist) continue;
        const gap = otherDist - myDist;
        if (gap < minGapPx) {
          speedMult *= C.STAGGER_SLOW;
          break;
        }
      }

      const sec = dt / 1000;
      let movePx = this.speed * speedMult * sec;
      const segCount = route.segmentCount();

      while (movePx > 0 && this.pathIndex < segCount) {
        const segLen = route.segmentLength(this.pathIndex);
        const remain = (1 - this.segT) * segLen;
        if (movePx < remain) {
          this.segT += movePx / segLen;
          movePx = 0;
        } else {
          movePx -= remain;
          this.pathIndex++;
          this.segT = 0;
        }
      }

      const pos = route.positionAt(
        Math.min(this.pathIndex, segCount),
        this.segT,
        this.laneOffset
      );
      this.x = pos.x;
      this.y = pos.y;
      this._pathDistPx = route.distanceAt(this.pathIndex, this.segT);
      const cell = pathFinder.cellAt(this.routeId, this.pathIndex, this.segT);
      this.inTunnel = cell.type === C.CELL_TUNNEL;
      return this.pathIndex >= segCount;
    }

    takeDamage(amount, slowOpts) {
      let remaining = amount;
      if (this.shield > 0) {
        const absorbed = Math.min(this.shield, remaining);
        this.shield -= absorbed;
        remaining -= absorbed;
      }
      this.hp -= remaining;
      if (slowOpts && slowOpts.slow) {
        this.slowTimer = Math.max(this.slowTimer, slowOpts.slowMs);
        this.slowFactor = Math.min(this.slowFactor, slowOpts.slow);
      }
      return this.hp <= 0;
    }

    makeElite() {
      if (this.elite || this.type === 'boss') return;
      this.elite = true;
      const ratio = this.hp / this.maxHp;
      this.maxHp *= B.ELITE_HP_MULT;
      this.hp = this.maxHp * ratio;
      if (this.maxShield > 0) {
        this.shield *= B.ELITE_HP_MULT;
        this.maxShield = this.shield;
      }
      this.reward = Math.floor(this.reward * B.ELITE_REWARD_MULT);
    }
  }

  class Projectile {
    constructor(opts) {
      Object.assign(this, opts);
      this.id = uid();
    }
  }

  class Particle {
    constructor(x, y, color, count) {
      this.parts = [];
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 40 + Math.random() * 100;
        this.parts.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.4 + Math.random() * 0.3,
          maxLife: 0.7,
          color,
          size: 2 + Math.random() * 3,
        });
      }
    }

    update(dt) {
      const sec = dt / 1000;
      this.parts.forEach((p) => {
        p.life -= sec;
        p.x += p.vx * sec;
        p.y += p.vy * sec;
        p.vx *= 0.95;
        p.vy *= 0.95;
      });
      this.parts = this.parts.filter((p) => p.life > 0);
      return this.parts.length > 0;
    }
  }

  class FloatingText {
    constructor(x, y, text, color, large) {
      this.x = x;
      this.y = y;
      this.text = text;
      this.color = color;
      this.large = !!large;
      this.life = 1.2;
      this.maxLife = 1.2;
    }

    update(dt) {
      this.life -= dt / 1000;
      this.y -= dt * 0.03;
      return this.life > 0;
    }
  }

  class RingFx {
    constructor(x, y, color, maxRadius, duration) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.maxRadius = maxRadius;
      this.life = duration;
      this.maxLife = duration;
    }

    update(dt) {
      this.life -= dt / 1000;
      return this.life > 0;
    }

    get radius() {
      const t = 1 - this.life / this.maxLife;
      return this.maxRadius * t;
    }

    get alpha() {
      return Math.max(0, this.life / this.maxLife) * 0.85;
    }
  }

  class ChainFx {
    constructor(points, color) {
      this.points = points;
      this.color = color;
      this.life = 0.2;
      this.maxLife = 0.2;
    }

    update(dt) {
      this.life -= dt / 1000;
      return this.life > 0;
    }
  }

  class ScreenFlash {
    constructor(color, strength, duration) {
      this.color = color;
      this.strength = strength;
      this.life = duration;
      this.maxLife = duration;
    }

    update(dt) {
      this.life -= dt / 1000;
      return this.life > 0;
    }

    get alpha() {
      return (this.life / this.maxLife) * this.strength;
    }
  }

  function laneOffsetForIndex(index) {
    return 0;
  }

  window.NeonSiegeEntities = {
    Tower,
    Enemy,
    Projectile,
    Particle,
    FloatingText,
    RingFx,
    ChainFx,
    ScreenFlash,
    laneOffsetForIndex,
    resetIds,
    uid,
    setTechProvider,
  };
})();
