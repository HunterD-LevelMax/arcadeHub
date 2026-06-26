(function () {
  const B = window.NeonSiegeBalance;
  const C = window.NeonSiegeConstants;
  const E = window.NeonSiegeEntities;

  class WaveSystem {
    rollModifier(waveNum) {
      return B.pickWaveModifier(waveNum);
    }

    buildQueue(waveNum, map, endless, modifierKey) {
      const queue = [];
      const mod = B.getModifierDef(modifierKey);
      const isBoss = waveNum % 5 === 0;
      let count = B.waveEnemyCount(waveNum, map.countMod);
      if (waveNum >= 6 && map.id === 'spiralCore') count += 1;
      if (mod && mod.countMult) count = Math.floor(count * mod.countMult);

      if (isBoss) {
        queue.push({ type: 'boss', delay: 0, elite: false });
        count = Math.max(3, Math.floor(count * 0.5));
      }

      const types = ['drone'];
      if (waveNum >= 3) types.push('tank');
      if (waveNum >= 6) types.push('swift');
      if (waveNum >= 8) types.push('shield');
      if (waveNum >= 10) types.push('splitter');

      const spawnBase = B.spawnDelayForWave(waveNum);
      const spawnJitter = waveNum >= 9 ? 0.22 : 0.35;
      for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        queue.push({ type, delay: spawnBase + Math.random() * spawnJitter, elite: false });
      }

      if (mod && mod.eliteCount && queue.length > 0) {
        const candidates = queue.filter((e) => e.type !== 'boss');
        for (let i = 0; i < mod.eliteCount && candidates.length > 0; i++) {
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          pick.elite = true;
        }
      }

      return queue;
    }

    preview(queue) {
      const counts = {};
      queue.forEach((e) => {
        counts[e.type] = (counts[e.type] || 0) + 1;
      });
      return Object.entries(counts).map(([type, count]) => ({
        type,
        count,
        name: B.ENEMY_TYPES[type].name,
      }));
    }

    getWaveCounterTips(queue, modifierKey) {
      const types = new Set();
      queue.forEach((e) => types.add(e.type));
      const mod = B.getModifierDef(modifierKey);
      const candidates = [];

      if (types.has('boss')) candidates.push('LANCE', 'RAIL');
      if (types.has('shield')) candidates.push('RAIL');
      if (types.has('swift') || (mod && mod.speedMult > 1)) candidates.push('FROST', 'FLAK');
      if (types.has('tank') || (mod && mod.hpMult >= 1.3)) candidates.push('LANCE', 'MORTAR');
      if (types.has('splitter') || (mod && mod.countMult >= 1.4)) candidates.push('TESLA', 'NOVA');
      if (mod && mod.eliteCount) candidates.push('LANCE');

      const out = [];
      const seen = new Set();
      for (let i = 0; i < candidates.length && out.length < 2; i++) {
        const tag = candidates[i];
        if (seen.has(tag)) continue;
        seen.add(tag);
        out.push(tag);
      }
      return out.join('·');
    }
  }

  class EconomySystem {
    constructor() {
      this.gold = B.START_GOLD;
      this.combo = 1;
      this.comboTimer = 0;
      this.lastKillTime = 0;
    }

    reset() {
      this.gold = B.START_GOLD;
      this.combo = 1;
      this.comboTimer = 0;
      this.lastKillTime = 0;
    }

    canAfford(cost) {
      return this.gold >= cost;
    }

    spend(cost) {
      if (!this.canAfford(cost)) return false;
      this.gold -= cost;
      return true;
    }

    addGold(amount) {
      this.gold += amount;
    }

    onKill(reward, scoreValue, addScoreFn, opts) {
      const rewardMult = (opts && opts.rewardMult) || 1;
      let goldGain = Math.floor(reward * rewardMult);
      const now = performance.now();
      if (now - this.lastKillTime < C.COMBO_WINDOW_MS) {
        this.combo = Math.min(C.COMBO_MAX, this.combo + 0.1);
        this.comboTimer = C.COMBO_WINDOW_MS;
      } else {
        this.combo = 1.1;
        this.comboTimer = C.COMBO_WINDOW_MS;
      }
      this.lastKillTime = now;
      if (this.combo >= B.COMBO_GOLD_THRESHOLD) {
        goldGain += Math.min(2, Math.floor((this.combo - 1) * 4));
      }
      this.gold += goldGain;
      addScoreFn(Math.floor(scoreValue * this.combo));
      return { goldGain, combo: this.combo };
    }

    tickCombo(dt) {
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) this.combo = 1;
      }
    }

    waveClearBonus(wave) {
      return { score: B.WAVE_CLEAR_SCORE, gold: B.waveClearGold(wave || 0) };
    }
  }

  class ArsenalSystem {
    constructor() {
      this.techStacks = {};
      this.strikeCharges = {};
      this.intermissionBuys = 0;
      this.armedStrike = null;
    }

    reset() {
      this.techStacks = {};
      this.strikeCharges = {};
      this.intermissionBuys = 0;
      this.armedStrike = null;
    }

    resetIntermissionBuys() {
      this.intermissionBuys = 0;
    }

    getTechStacks(id) {
      return this.techStacks[id] || 0;
    }

    getTechMods() {
      const od = this.getTechStacks('overdrive');
      const cap = this.getTechStacks('capacitor');
      return {
        damageMult: od ? 1 + od * B.ARSENAL_TECH.overdrive.damagePer : 1,
        rangeMult: cap ? 1 + cap * B.ARSENAL_TECH.capacitor.rangePer : 1,
      };
    }

    getSellBonus() {
      const stacks = this.getTechStacks('salvage');
      return stacks * B.ARSENAL_TECH.salvage.sellPer;
    }

    getOverchargeBonusMs() {
      return this.getTechStacks('reactor') * B.ARSENAL_TECH.reactor.boostMs;
    }

    totalStrikeCharges() {
      return Object.values(this.strikeCharges).reduce((a, n) => a + n, 0);
    }

    canBuyMore(wave) {
      return this.intermissionBuys < B.getArsenalBuyLimit(wave);
    }

    buyStrike(id, economy, wave) {
      if (!this.canBuyMore(wave)) return false;
      const def = B.ARSENAL_STRIKES[id];
      const cost = B.getStrikeCost(id, wave);
      if (!def || cost == null || !economy.spend(cost)) return false;
      this.strikeCharges[id] = (this.strikeCharges[id] || 0) + 1;
      this.intermissionBuys++;
      return true;
    }

    buyTech(id, economy, wave) {
      if (!this.canBuyMore(wave)) return false;
      const def = B.ARSENAL_TECH[id];
      if (!def) return false;
      const stacks = this.getTechStacks(id);
      if (stacks >= B.getTechMaxStacks(id, wave)) return false;
      const cost = B.getTechCost(id, stacks, wave);
      if (cost == null || !economy.spend(cost)) return false;
      this.techStacks[id] = stacks + 1;
      this.intermissionBuys++;
      return true;
    }

    armStrike(id) {
      if (!this.strikeCharges[id]) return false;
      this.armedStrike = id;
      return true;
    }

    disarmStrike() {
      this.armedStrike = null;
    }

    consumeStrike(id) {
      if (!this.strikeCharges[id]) return false;
      this.strikeCharges[id]--;
      if (this.strikeCharges[id] <= 0) delete this.strikeCharges[id];
      this.armedStrike = null;
      return true;
    }

    applyStrike(id, x, y, game) {
      const def = B.ARSENAL_STRIKES[id];
      if (!def) return null;
      const cs = game.metrics.cellSize;
      const fx = { rings: [], particles: [], shake: 0, flash: null };

      if (id === 'repair') {
        const maxHp = B.BASE_HP_MAX + B.CORE_HP_MAX_BONUS;
        if (game.baseHp < maxHp) {
          game.baseHp++;
          const goal = game.pathFinder.waypointPixels[game.pathFinder.waypointPixels.length - 1];
          if (goal) {
            fx.rings.push({ x: goal.x, y: goal.y, color: def.color, radius: cs * 2, duration: 0.6 });
            fx.particles.push({ x: goal.x, y: goal.y, color: def.color, n: 16 });
          }
          fx.flash = { color: def.color, strength: 0.35, duration: 0.4 };
        }
        return fx;
      }

      if (id === 'shockwave') {
        const radius = def.radius * cs;
        const dmg = B.strikeDamage(game.wave);
        const rangeSq = radius * radius;
        for (const enemy of [...game.enemies]) {
          const dx = enemy.x - x;
          const dy = enemy.y - y;
          if (dx * dx + dy * dy <= rangeSq) {
            game._onEnemyHit(enemy, dmg, null, false);
          }
        }
        fx.rings.push({ x, y, color: def.color, radius, duration: 0.45 });
        fx.particles.push({ x, y, color: def.color, n: 20 });
        fx.shake = 8;
        return fx;
      }

      if (id === 'emp') {
        const radius = def.radius * cs;
        const rangeSq = radius * radius;
        for (const enemy of game.enemies) {
          const dx = enemy.x - x;
          const dy = enemy.y - y;
          if (dx * dx + dy * dy <= rangeSq) {
            enemy.stunTimer = Math.max(enemy.stunTimer, def.stunMs);
          }
        }
        fx.rings.push({ x, y, color: def.color, radius, duration: 0.55 });
        fx.particles.push({ x, y, color: def.color, n: 14 });
        return fx;
      }

      if (id === 'cryo') {
        const radius = def.radius * cs;
        const rangeSq = radius * radius;
        for (const enemy of game.enemies) {
          const dx = enemy.x - x;
          const dy = enemy.y - y;
          if (dx * dx + dy * dy <= rangeSq) {
            enemy.slowTimer = def.slowMs;
            enemy.slowFactor = def.slow;
            game.particles.push(new E.Particle(enemy.x, enemy.y, '#88ddff', 5));
          }
        }
        fx.rings.push({ x, y, color: def.color, radius, duration: 0.5 });
        fx.particles.push({ x, y, color: def.color, n: 12 });
        return fx;
      }

      if (id === 'cluster') {
        const sorted = game.enemies.slice().sort(
          (a, b) => a.pathDistance - b.pathDistance
        );
        let startIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < sorted.length; i++) {
          const dx = sorted[i].x - x;
          const dy = sorted[i].y - y;
          const d = dx * dx + dy * dy;
          if (d < bestDist) {
            bestDist = d;
            startIdx = i;
          }
        }
        const hits = sorted.slice(startIdx, startIdx + def.hits);
        const dmg = B.strikeDamage(game.wave) * 0.65;
        hits.forEach((enemy, i) => {
          game._onEnemyHit(enemy, dmg, null, false);
          fx.rings.push({
            x: enemy.x, y: enemy.y, color: def.color,
            radius: cs * 0.9, duration: 0.3 + i * 0.05,
          });
          fx.particles.push({ x: enemy.x, y: enemy.y, color: def.color, n: 8 });
        });
        fx.shake = 5;
        return fx;
      }

      return fx;
    }
  }

  class CombatSystem {
    _cellDist(ta, tb) {
      const dr = ta.r - tb.r;
      const dc = ta.c - tb.c;
      return Math.sqrt(dr * dr + dc * dc);
    }

    _reactorMult(tower, towers) {
      let bonus = 0;
      for (const other of towers) {
        if (other.type !== 'reactor' || other.id === tower.id) continue;
        const stats = other.stats;
        if (this._cellDist(tower, other) <= stats.range) {
          bonus = Math.max(bonus, stats.auraRate || 0.18);
        }
      }
      return 1 + bonus;
    }

    _applyFastBonus(dmg, enemy, stats) {
      if (stats.fastBonus && stats.fastThreshold && enemy.speed >= stats.fastThreshold) {
        return dmg * stats.fastBonus;
      }
      return dmg;
    }

    _projectileOutOfBounds(p, metrics, pad) {
      const m = metrics;
      const margin = pad == null ? 20 : pad;
      return (
        p.x < m.offsetX - margin || p.x > m.offsetX + m.gridW + margin ||
        p.y < m.offsetY - margin || p.y > m.offsetY + m.gridH + margin
      );
    }

    _moveToward(p, tx, ty, sec, hitR) {
      const dx = tx - p.x;
      const dy = ty - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0;
      const step = p.speed * sec;
      const reach = Math.max(hitR, step * 0.5);
      if (dist <= step || dist <= reach) {
        p.x = tx;
        p.y = ty;
        return true;
      }
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
      return false;
    }

    _hitRadius(metrics, step) {
      const base = metrics.cellSize * 0.28;
      return Math.max(base, 6, step * 0.45);
    }

    _segmentHitEnemy(px, py, nx, ny, enemy, hitR) {
      const ex = enemy.x;
      const ey = enemy.y;
      const sdx = nx - px;
      const sdy = ny - py;
      const segLenSq = sdx * sdx + sdy * sdy;
      if (segLenSq < 1e-6) {
        const dx = ex - px;
        const dy = ey - py;
        return dx * dx + dy * dy <= hitR * hitR;
      }
      const t = Math.max(0, Math.min(1, ((ex - px) * sdx + (ey - py) * sdy) / segLenSq));
      const cx = px + sdx * t;
      const cy = py + sdy * t;
      const dx = ex - cx;
      const dy = ey - cy;
      return dx * dx + dy * dy <= hitR * hitR;
    }

    _updateHomingProjectile(p, enemies, sec, metrics, onHit) {
      const target = enemies.find((e) => e.id === p.targetId) || null;
      const tx = target ? target.x : p.tx;
      const ty = target ? target.y : p.ty;
      const step = p.speed * sec;
      const hitR = this._hitRadius(metrics, step);

      if (target) {
        const tdx = target.x - p.x;
        const tdy = target.y - p.y;
        const tDist = Math.sqrt(tdx * tdx + tdy * tdy);
        if (tDist <= hitR) {
          p.x = target.x;
          p.y = target.y;
          this._applyHomingHit(p, enemies, target, onHit, metrics);
          return true;
        }
      }

      const prevX = p.x;
      const prevY = p.y;
      const arrived = this._moveToward(p, tx, ty, sec, hitR);

      if (target) {
        const tdx = target.x - p.x;
        const tdy = target.y - p.y;
        if (tdx * tdx + tdy * tdy <= hitR * hitR) {
          p.x = target.x;
          p.y = target.y;
          this._applyHomingHit(p, enemies, target, onHit, metrics);
          return true;
        }
        if (this._segmentHitEnemy(prevX, prevY, p.x, p.y, target, hitR)) {
          p.x = target.x;
          p.y = target.y;
          this._applyHomingHit(p, enemies, target, onHit, metrics);
          return true;
        }
      }

      if (arrived) {
        this._applyHomingHit(p, enemies, target, onHit, metrics);
        return true;
      }

      const moved = Math.hypot(p.x - prevX, p.y - prevY);
      p._stall = moved < 0.25 ? (p._stall || 0) + 1 : 0;
      if (p._stall > 6) return true;

      return false;
    }

    _travelExceeded(p, metrics, maxCells) {
      if (p.spawnX == null || p.spawnY == null) return false;
      const limit = metrics.cellSize * maxCells;
      const dx = p.x - p.spawnX;
      const dy = p.y - p.spawnY;
      return dx * dx + dy * dy > limit * limit;
    }

    _applyHomingHit(p, enemies, target, onHit, metrics) {
      if (target || p.kind === 'rail') {
        const hitTarget = target || enemies.find((e) => {
          const ddx = e.x - p.tx;
          const ddy = e.y - p.ty;
          const hitR = metrics.cellSize * 0.35;
          return ddx * ddx + ddy * ddy < hitR * hitR;
        });
        if (hitTarget) {
          let dmg = p.damage;
          if (p.shieldBonus && hitTarget.shield > 0) dmg *= p.shieldBonus;
          dmg = this._applyFastBonus(dmg, hitTarget, {
            fastBonus: p.fastBonus,
            fastThreshold: p.fastThreshold,
          });
          onHit(hitTarget, dmg, p.slow ? { slow: p.slow, slowMs: p.slowMs } : null);
        }
      }
    }
    findTarget(tower, enemies, pathFinder, metrics) {
      const stats = tower.stats;
      const rangePx = stats.range * metrics.cellSize;
      const rangeSq = rangePx * rangePx;
      const pos = pathFinder.cellCenter(tower.r, tower.c);
      const inRange = [];
      for (const enemy of enemies) {
        const dx = enemy.x - pos.x;
        const dy = enemy.y - pos.y;
        if (dx * dx + dy * dy > rangeSq) continue;
        inRange.push(enemy);
      }
      if (!inRange.length) return null;

      const priority = tower.targetPriority || 'first';
      if (priority === 'last') {
        let best = null;
        let bestDist = Infinity;
        for (const enemy of inRange) {
          const d = enemy.pathDistance;
          if (d < bestDist) {
            best = enemy;
            bestDist = d;
          }
        }
        return best;
      }
      if (priority === 'strongest') {
        let best = null;
        let bestHp = -1;
        for (const enemy of inRange) {
          const hp = enemy.hp + enemy.shield;
          if (hp > bestHp) {
            best = enemy;
            bestHp = hp;
          }
        }
        return best;
      }
      let best = null;
      let bestDist = -1;
      for (const enemy of inRange) {
        const d = enemy.pathDistance;
        if (d > bestDist) {
          best = enemy;
          bestDist = d;
        }
      }
      return best;
    }

    fireTower(tower, target, enemies, pathFinder, metrics, overchargeActive, projectiles, hooks) {
      const def = B.TOWER_TYPES[tower.type];
      const stats = tower.stats;
      const pos = pathFinder.cellCenter(tower.r, tower.c);
      const fireMult = overchargeActive ? B.OVERCHARGE_FIRE_MULT : 1;
      const onHit = hooks.onNovaHit;

      if (B.TOWER_TYPES[tower.type].supportOnly) {
        tower.cooldown = 0.5;
        return null;
      }

      if (tower.type === 'lance') {
        if (tower.lanceTargetId !== target.id) {
          tower.lanceTargetId = target.id;
          tower.lanceRamp = 1;
        } else {
          tower.lanceRamp = Math.min(stats.rampCap || 2.5, tower.lanceRamp + (stats.rampPerSec || 0.15) * stats.fireRate);
        }
        const dmg = stats.damage * tower.lanceRamp;
        onHit(target, dmg, false);
        tower.recoil = 0.06;
        tower.aimAngle = Math.atan2(target.y - pos.y, target.x - pos.x);
        tower.cooldown = stats.fireRate * fireMult / (hooks.reactorMult(tower) || 1);
        return {
          particles: { x: target.x, y: target.y, color: def.color, n: 8 },
          ring: { x: target.x, y: target.y, color: def.color, radius: metrics.cellSize * 0.35, duration: 0.25 },
        };
      }

      if (tower.type === 'nova') {
        const rangePx = (stats.aoe || 1.2) * metrics.cellSize;
        const rangeSq = rangePx * rangePx;
        for (const enemy of [...enemies]) {
          const dx = enemy.x - target.x;
          const dy = enemy.y - target.y;
          if (dx * dx + dy * dy <= rangeSq) {
            let dmg = stats.damage;
            const shattered = enemy.slowTimer > 0;
            if (shattered) dmg *= (1 + B.SHATTER_BONUS);
            onHit(enemy, dmg, shattered);
          }
        }
        tower.recoil = 0.08;
        tower.cooldown = stats.fireRate * fireMult / (hooks.reactorMult(tower) || 1);
        return {
          shake: 4,
          particles: { x: target.x, y: target.y, color: def.color, n: 14 },
          ring: { x: target.x, y: target.y, color: def.color, radius: rangePx * 0.85, duration: 0.35 },
        };
      }

      if (tower.type === 'tesla') {
        const hit = new Set();
        const chainPx = (stats.chainRange || 1.15) * metrics.cellSize;
        let current = target;
        let dmg = stats.damage;
        const maxJumps = stats.chains || 4;
        const falloff = stats.chainFalloff || 0.68;
        const chainPoints = [{ x: pos.x, y: pos.y }];
        for (let jump = 0; jump < maxJumps && current; jump++) {
          hit.add(current.id);
          chainPoints.push({ x: current.x, y: current.y });
          onHit(current, dmg, false);
          dmg *= falloff;
          let next = null;
          let bestDist = Infinity;
          for (const enemy of enemies) {
            if (hit.has(enemy.id)) continue;
            const dx = enemy.x - current.x;
            const dy = enemy.y - current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= chainPx && dist < bestDist) {
              next = enemy;
              bestDist = dist;
            }
          }
          current = next;
        }
        tower.recoil = 0.06;
        tower.cooldown = stats.fireRate * fireMult / (hooks.reactorMult(tower) || 1);
        return {
          particles: { x: target.x, y: target.y, color: def.color, n: 10 },
          chain: { points: chainPoints, color: def.color },
        };
      }

      if (tower.type === 'prism') {
        const angle = Math.atan2(target.y - pos.y, target.x - pos.x);
        projectiles.push(new E.Projectile({
          x: pos.x, y: pos.y, angle, speed: 320,
          damage: stats.damage, color: def.color,
          pierceLeft: stats.pierce || 3, hitIds: new Set(), kind: 'prism',
          spawnX: pos.x, spawnY: pos.y, trail: [],
        }));
      } else if (tower.type === 'rail') {
        projectiles.push(new E.Projectile({
          x: pos.x, y: pos.y, tx: target.x, ty: target.y, speed: 420,
          damage: stats.damage, color: def.color, targetId: target.id,
          kind: 'rail', shieldBonus: stats.shieldBonus || 1.7,
          spawnX: pos.x, spawnY: pos.y, trail: [],
        }));
      } else if (tower.type === 'mortar') {
        projectiles.push(new E.Projectile({
          x: pos.x, y: pos.y, tx: target.x, ty: target.y, speed: 190,
          damage: stats.damage, color: def.color, kind: 'mortar',
          aoe: stats.aoe || 1.1, spawnX: pos.x, spawnY: pos.y, trail: [],
        }));
      } else {
        const isFlak = tower.type === 'flak';
        projectiles.push(new E.Projectile({
          x: pos.x, y: pos.y, tx: target.x, ty: target.y, speed: isFlak ? 340 : 280,
          damage: stats.damage, color: def.color, targetId: target.id,
          kind: tower.type,
          slow: tower.type === 'frost' ? stats.slow : 0,
          slowMs: tower.type === 'frost' ? stats.slowMs : 0,
          fastBonus: stats.fastBonus,
          fastThreshold: stats.fastThreshold,
          spawnX: pos.x, spawnY: pos.y, trail: [],
        }));
      }
      tower.recoil = tower.type === 'flak' ? 0.04 : 0.08;
      tower.aimAngle = Math.atan2(target.y - pos.y, target.x - pos.x);
      const auraMult = hooks.reactorMult ? hooks.reactorMult(tower) : 1;
      tower.cooldown = stats.fireRate * fireMult / auraMult;
      return {
        ring: { x: pos.x, y: pos.y, color: def.color, radius: metrics.cellSize * 0.22, duration: 0.2 },
      };
    }

    updateTowers(dt, towers, enemies, pathFinder, metrics, overchargeActive, projectiles, hooks) {
      const sec = dt / 1000;
      const reactorMult = (tower) => this._reactorMult(tower, towers);
      hooks.reactorMult = reactorMult;

      for (const tower of towers) {
        if (tower.recoil > 0) tower.recoil = Math.max(0, tower.recoil - sec);
        if (tower.cooldown > 0) tower.cooldown -= sec;
        if (tower.cooldown > 0) continue;
        if (B.TOWER_TYPES[tower.type].supportOnly) continue;

        let target = null;
        if (tower.cachedTargetId != null) {
          target = enemies.find((e) => e.id === tower.cachedTargetId) || null;
          if (target) {
            const pos = pathFinder.cellCenter(tower.r, tower.c);
            const dx = target.x - pos.x;
            const dy = target.y - pos.y;
            const rangePx = tower.stats.range * metrics.cellSize;
            if (dx * dx + dy * dy > rangePx * rangePx) target = null;
          }
        }
        if (!target) {
          target = this.findTarget(tower, enemies, pathFinder, metrics);
          tower.cachedTargetId = target ? target.id : null;
        }
        if (!target) continue;
        const fx = this.fireTower(
          tower, target, enemies, pathFinder, metrics,
          overchargeActive, projectiles, hooks
        );
        if (fx) hooks.onFireFx(fx);
      }
    }

    updateProjectiles(dt, projectiles, enemies, metrics, onHit) {
      const sec = dt / 1000;
      const mortarHitR = Math.max(metrics.cellSize * 0.22, 10);

      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
          projectiles.splice(i, 1);
          continue;
        }

        if (!p.trail) p.trail = [];
        if (p.trail.length < 2) p.trail.push({ x: p.x, y: p.y });
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 3) p.trail.shift();

        p.life = (p.life || 0) + dt;
        if (p.life > 1200) {
          projectiles.splice(i, 1);
          continue;
        }

        let removed = false;
        const travelCells = p.kind === 'prism' ? 22 : 10;
        if (this._travelExceeded(p, metrics, travelCells)) {
          projectiles.splice(i, 1);
          continue;
        }

        if (p.kind === 'prism') {
          const hitR = metrics.cellSize * 0.28;
          const hitSq = hitR * hitR;
          const totalStep = p.speed * sec;
          const maxSubStep = Math.max(hitR * 0.35, 3);
          let remaining = totalStep;
          while (remaining > 0 && !removed) {
            const step = Math.min(remaining, maxSubStep);
            remaining -= step;
            const prevX = p.x;
            const prevY = p.y;
            p.x += Math.cos(p.angle) * step;
            p.y += Math.sin(p.angle) * step;
            for (const enemy of enemies) {
              if (p.hitIds.has(enemy.id)) continue;
              if (this._segmentHitEnemy(prevX, prevY, p.x, p.y, enemy, hitR) ||
                  (enemy.x - p.x) ** 2 + (enemy.y - p.y) ** 2 < hitSq) {
                p.hitIds.add(enemy.id);
                onHit(enemy, p.damage, null);
                p.pierceLeft--;
                if (p.pierceLeft <= 0) {
                  projectiles.splice(i, 1);
                  removed = true;
                  break;
                }
              }
            }
          }
        } else if (p.kind === 'mortar') {
          const arrived = this._moveToward(p, p.tx, p.ty, sec, mortarHitR);
          if (arrived) {
            const rangePx = (p.aoe || 1.1) * metrics.cellSize;
            const rangeSq = rangePx * rangePx;
            for (const enemy of enemies) {
              const ex = enemy.x - p.tx;
              const ey = enemy.y - p.ty;
              if (ex * ex + ey * ey <= rangeSq) {
                onHit(enemy, p.damage, null);
              }
            }
            projectiles.splice(i, 1);
            removed = true;
          }
        } else if (this._updateHomingProjectile(p, enemies, sec, metrics, onHit)) {
          projectiles.splice(i, 1);
          removed = true;
        }

        if (!removed && this._projectileOutOfBounds(p, metrics)) {
          projectiles.splice(i, 1);
        }
      }
    }
  }

  window.NeonSiegeSystems = {
    WaveSystem,
    EconomySystem,
    CombatSystem,
    ArsenalSystem,
  };
})();
