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

      for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        queue.push({ type, delay: 0.4 + Math.random() * 0.35, elite: false });
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
  }

  class EconomySystem {
    constructor() {
      this.gold = B.START_GOLD;
      this.interestAccum = 0;
      this.interestEarned = 0;
      this.combo = 1;
      this.comboTimer = 0;
      this.lastKillTime = 0;
    }

    reset() {
      this.gold = B.START_GOLD;
      this.interestAccum = 0;
      this.interestEarned = 0;
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

    tickInterest(dt, waveActive) {
      if (waveActive) return;
      this.interestAccum += dt / 1000;
      if (this.interestAccum >= 1 && this.interestEarned < B.INTEREST_CAP) {
        this.interestAccum -= 1;
        this.gold += B.INTEREST_RATE;
        this.interestEarned += B.INTEREST_RATE;
      }
    }

    resetInterestCap() {
      this.interestEarned = 0;
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
        goldGain += Math.min(3, Math.floor((this.combo - 1) * 4));
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
      const gold = B.WAVE_CLEAR_GOLD_BASE + wave;
      this.gold += gold;
      return { gold, score: 50 };
    }
  }

  class CombatSystem {
    findTarget(tower, enemies, pathFinder, metrics) {
      const stats = tower.stats;
      const rangePx = stats.range * metrics.cellSize;
      const pos = pathFinder.cellCenter(tower.r, tower.c);
      let best = null;
      let bestDist = -1;
      for (const enemy of enemies) {
        const dx = enemy.x - pos.x;
        const dy = enemy.y - pos.y;
        if (Math.sqrt(dx * dx + dy * dy) > rangePx) continue;
        const d = enemy.pathIndex + enemy.segT;
        if (d > bestDist) {
          best = enemy;
          bestDist = d;
        }
      }
      return best;
    }

    fireTower(tower, target, enemies, pathFinder, metrics, overchargeActive, projectiles, onNovaHit) {
      const def = B.TOWER_TYPES[tower.type];
      const stats = tower.stats;
      const pos = pathFinder.cellCenter(tower.r, tower.c);
      const fireMult = overchargeActive ? B.OVERCHARGE_FIRE_MULT : 1;

      if (tower.type === 'nova') {
        const rangePx = (stats.aoe || 1.2) * metrics.cellSize;
        for (const enemy of [...enemies]) {
          const dx = enemy.x - target.x;
          const dy = enemy.y - target.y;
          if (Math.sqrt(dx * dx + dy * dy) <= rangePx) {
            let dmg = stats.damage;
            const shattered = enemy.slowTimer > 0;
            if (shattered) dmg *= (1 + B.SHATTER_BONUS);
            onNovaHit(enemy, dmg, shattered);
          }
        }
        tower.recoil = 0.08;
        tower.cooldown = stats.fireRate * fireMult;
        return {
          shake: 4,
          particles: { x: target.x, y: target.y, color: def.color, n: 14 },
          ring: { x: target.x, y: target.y, color: def.color, radius: rangePx * 0.85, duration: 0.35 },
        };
      }

      if (tower.type === 'prism') {
        const angle = Math.atan2(target.y - pos.y, target.x - pos.x);
        projectiles.push(new E.Projectile({
          x: pos.x, y: pos.y, angle, speed: 320,
          damage: stats.damage, color: def.color,
          pierceLeft: stats.pierce || 3, hitIds: new Set(), kind: 'prism',
          trail: [],
        }));
      } else {
        projectiles.push(new E.Projectile({
          x: pos.x, y: pos.y, tx: target.x, ty: target.y, speed: 280,
          damage: stats.damage, color: def.color, targetId: target.id,
          kind: tower.type,
          slow: tower.type === 'frost' ? stats.slow : 0,
          slowMs: tower.type === 'frost' ? stats.slowMs : 0,
          trail: [],
        }));
      }
      tower.recoil = 0.08;
      tower.aimAngle = Math.atan2(target.y - pos.y, target.x - pos.x);
      tower.cooldown = stats.fireRate * fireMult;
      return {
        ring: { x: pos.x, y: pos.y, color: def.color, radius: metrics.cellSize * 0.22, duration: 0.2 },
      };
    }

    updateTowers(dt, towers, enemies, pathFinder, metrics, overchargeActive, projectiles, hooks) {
      const sec = dt / 1000;
      for (const tower of towers) {
        if (tower.recoil > 0) tower.recoil = Math.max(0, tower.recoil - sec);
        if (tower.cooldown > 0) tower.cooldown -= sec;
        if (tower.cooldown > 0) continue;
        const target = this.findTarget(tower, enemies, pathFinder, metrics);
        if (!target) continue;
        const fx = this.fireTower(
          tower, target, enemies, pathFinder, metrics,
          overchargeActive, projectiles, hooks.onNovaHit
        );
        if (fx) hooks.onFireFx(fx);
      }
    }

    updateProjectiles(dt, projectiles, enemies, metrics, onHit) {
      const sec = dt / 1000;
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        if (!p.trail) p.trail = [];
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 3) p.trail.shift();

        if (p.kind === 'prism') {
          p.x += Math.cos(p.angle) * p.speed * sec;
          p.y += Math.sin(p.angle) * p.speed * sec;
          for (const enemy of enemies) {
            if (p.hitIds.has(enemy.id)) continue;
            const dx = enemy.x - p.x;
            const dy = enemy.y - p.y;
            if (Math.sqrt(dx * dx + dy * dy) < metrics.cellSize * 0.28) {
              p.hitIds.add(enemy.id);
              onHit(enemy, p.damage, null);
              p.pierceLeft--;
              if (p.pierceLeft <= 0) { projectiles.splice(i, 1); break; }
            }
          }
          const m = metrics;
          if (p.x < m.offsetX - 20 || p.x > m.offsetX + m.gridW + 20 ||
              p.y < m.offsetY - 20 || p.y > m.offsetY + m.gridH + 20) {
            projectiles.splice(i, 1);
          }
        } else {
          const target = enemies.find((e) => e.id === p.targetId);
          const tx = target ? target.x : p.tx;
          const ty = target ? target.y : p.ty;
          const dx = tx - p.x;
          const dy = ty - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 8) {
            if (target) {
              onHit(target, p.damage, p.slow ? { slow: p.slow, slowMs: p.slowMs } : null);
            }
            projectiles.splice(i, 1);
          } else {
            p.x += (dx / dist) * p.speed * sec;
            p.y += (dy / dist) * p.speed * sec;
          }
        }
      }
    }
  }

  window.NeonSiegeSystems = {
    WaveSystem,
    EconomySystem,
    CombatSystem,
  };
})();
