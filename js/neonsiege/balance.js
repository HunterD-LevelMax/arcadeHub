(function () {
  window.NeonSiegeBalance = {
    START_GOLD: 95,
    BASE_HP_MAX: 15,
    CORE_HP_MAX_BONUS: 5,
    WAVE_CLEAR_SCORE: 50,
    OVERCHARGE_FIRE_MULT: 1 / 1.7,
    HP_SCALE_CAP: 14,
    ENDLESS_HP_SCALE_CAP: 2,
    ENDLESS_HP_PER_WAVE: 0.09,
    ELITE_HP_MULT: 1.8,
    ELITE_REWARD_MULT: 2,
    ELITE_SPAWN_CHANCE: 0.08,
    ELITE_SPAWN_CHANCE_LATE: 0.06,
    ELITE_SPAWN_WAVE_LATE: 20,
    SPLIT_MINI_HP_RATIO: 0.28,
    ARSENAL_BUY_LIMIT: 2,
    ARSENAL_BUY_LIMIT_W40: 3,
    ARSENAL_BUY_LIMIT_W50: 4,
    SHATTER_BONUS: 0.35,
    COMBO_GOLD_THRESHOLD: 1.5,
    KILL_STREAK_WINDOW_MS: 2000,
    TARGET_PRIORITIES: ['first', 'last', 'strongest'],
    TARGET_PRIORITY_LABELS: { first: 'FIRST', last: 'LAST', strongest: 'STRONG' },
    BOSS_PHASES: [
      { hpPct: 0.75, action: 'escort' },
      { hpPct: 0.5, action: 'shield' },
      { hpPct: 0.25, action: 'escort' },
    ],
    BOSS_ESCORT_COUNT: 2,
    BOSS_SHIELD_PULSE: 0.35,
    MAX_TOWER_TIER: 3,
    LATE_MAX_TOWER_TIER: 9,
    MEGA_MAX_TOWER_TIER: 14,
    LATE_UPGRADE_WAVE: 40,
    MEGA_UPGRADE_WAVE: 50,
    LATE_ECON_WAVE: 30,
    LATE_ECON_SCALE: 0.12,
    LATE_ECON_SCALE_W45: 0.18,
    LATE_ENEMY_HP_PER_WAVE: 0.034,
    LATE_ENEMY_SPEED_PER_WAVE: 0.011,
    LATE_ENEMY_COUNT_STEP: 0.22,
    WAVE_CLEAR_SOFT_CAP: 35,
    ENDLESS_REWARD_CAP: 0.22,
    ENDLESS_REWARD_PER_WAVE: 0.012,

    WAVE_MODIFIERS: {
      swarm: {
        name: 'SWARM',
        desc: '+40% enemy count, −20% HP.',
        countMult: 1.4,
        hpMult: 0.8,
      },
      armored: {
        name: 'ARMORED',
        desc: '+30% HP on all enemies.',
        hpMult: 1.3,
      },
      rush: {
        name: 'RUSH',
        desc: '+25% enemy movement speed.',
        speedMult: 1.25,
      },
      fortune: {
        name: 'FORTUNE',
        desc: '+50% gold from kills this wave.',
        rewardMult: 1.5,
      },
      elite: {
        name: 'ELITE',
        desc: '2 elite units with bonus HP and gold.',
        eliteCount: 2,
      },
    },

    pickWaveModifier(waveNum) {
      if (waveNum <= 1) return null;
      const keys = Object.keys(this.WAVE_MODIFIERS);
      return keys[Math.floor(Math.random() * keys.length)];
    },

    getModifierDef(key) {
      return key ? this.WAVE_MODIFIERS[key] : null;
    },

    lateWaveTier(wave) {
      const w = wave || 0;
      return w > this.LATE_ECON_WAVE ? w - this.LATE_ECON_WAVE : 0;
    },

    lateEnemyHpMult(wave) {
      const tier = this.lateWaveTier(wave);
      if (tier <= 0) return 1;
      return 1 + tier * this.LATE_ENEMY_HP_PER_WAVE;
    },

    lateEnemySpeedMult(wave) {
      const tier = this.lateWaveTier(wave);
      if (tier <= 0) return 1;
      return 1 + tier * this.LATE_ENEMY_SPEED_PER_WAVE;
    },

    hpScale(wave, mapHpMod, endless, maxWaves) {
      const endlessExtra = endless ? Math.max(0, wave - maxWaves) : 0;
      let endlessScale = endless ? 1 + endlessExtra * this.ENDLESS_HP_PER_WAVE : 1;
      if (endless) endlessScale = Math.min(this.ENDLESS_HP_SCALE_CAP, endlessScale);
      const linear = 1 + wave * 0.085;
      const lateWave = Math.max(0, wave - 5);
      const lateSpan = Math.max(1, maxWaves - 5);
      const lateCurve = Math.pow(lateWave / lateSpan, 1.35) * 1.75;
      const raw = mapHpMod * endlessScale * (linear + lateCurve);
      return Math.min(this.HP_SCALE_CAP, raw) * this.lateEnemyHpMult(wave);
    },

    eliteSpawnChance(wave) {
      const late = this.lateWaveTier(wave);
      if (late > 0) {
        return Math.min(0.14, this.ELITE_SPAWN_CHANCE_LATE + late * 0.003);
      }
      return wave >= this.ELITE_SPAWN_WAVE_LATE
        ? this.ELITE_SPAWN_CHANCE_LATE
        : this.ELITE_SPAWN_CHANCE;
    },

    waveClearGold(wave) {
      const w = wave || 0;
      if (w <= this.WAVE_CLEAR_SOFT_CAP) return 8 + w * 4;
      const capped = 8 + this.WAVE_CLEAR_SOFT_CAP * 4;
      return capped + Math.floor((w - this.WAVE_CLEAR_SOFT_CAP) * 1.5);
    },

    endlessRewardMult(wave, endless) {
      if (!endless || wave <= 18) return 1;
      return 1 + Math.min(this.ENDLESS_REWARD_CAP, (wave - 18) * this.ENDLESS_REWARD_PER_WAVE);
    },

    getArsenalBuyLimit(wave) {
      const w = wave || 0;
      if (w >= this.MEGA_UPGRADE_WAVE) return this.ARSENAL_BUY_LIMIT_W50;
      if (w >= this.LATE_UPGRADE_WAVE) return this.ARSENAL_BUY_LIMIT_W40;
      return this.ARSENAL_BUY_LIMIT;
    },

    speedScale(wave, endless, maxWaves) {
      const late = Math.max(0, wave - 7);
      const endlessExtra = endless ? Math.max(0, wave - maxWaves) * 0.045 : 0;
      return (1 + late * 0.016 + endlessExtra) * this.lateEnemySpeedMult(wave);
    },

    waveEnemyCount(wave, countMod) {
      const base = 5 + Math.floor(wave * 1.55);
      const late = wave > 8 ? Math.floor((wave - 8) * 0.7) : 0;
      const post30 = Math.floor(this.lateWaveTier(wave) * this.LATE_ENEMY_COUNT_STEP);
      return base + late + post30 + countMod;
    },

    spawnDelayForWave(waveNum) {
      let delay;
      if (waveNum >= 13) delay = 0.26;
      else if (waveNum >= 9) delay = 0.32;
      else delay = 0.4;
      const tier = this.lateWaveTier(waveNum);
      if (tier > 0) delay *= Math.max(0.78, 1 - tier * 0.004);
      return delay;
    },

    TOWER_TYPES: {
      pulse: {
        name: 'PULSE', cost: 60, color: '#00f5ff', glow: '#00f5ff',
        damage: 10, range: 2.2, fireRate: 0.4, shape: 'square',
        upgradeCost: [50, 80, 120],
        desc: 'Fast single-target blaster. Cheap workhorse for picking off stragglers.',
      },
      nova: {
        name: 'NOVA', cost: 100, color: '#ff00ff', glow: '#ff00ff',
        damage: 24, range: 2.0, fireRate: 1.15, shape: 'hex', aoe: 1.2,
        upgradeCost: [70, 110, 160],
        desc: 'AoE hex burst at the target. Devastating on chokepoints and crowds. Shatters slowed enemies for +35% damage.',
      },
      prism: {
        name: 'PRISM', cost: 125, color: '#ffcc00', glow: '#ffcc00',
        damage: 16, range: 2.8, fireRate: 0.75, shape: 'diamond', pierce: 3,
        upgradeCost: [85, 130, 185],
        desc: 'Piercing beam hits up to 3 enemies in a line. Great on straight path segments.',
      },
      frost: {
        name: 'FROST', cost: 85, color: '#0088ff', glow: '#0088ff',
        damage: 5, range: 2.4, fireRate: 0.6, shape: 'triangle',
        slow: 0.5, slowMs: 1500,
        upgradeCost: [55, 95, 140],
        desc: 'Low damage but strong slow. Extends time on path. Synergy: NOVA deals +35% to slowed targets.',
      },
      tesla: {
        name: 'TESLA', cost: 115, color: '#b8ff00', glow: '#b8ff00',
        damage: 15, range: 2.3, fireRate: 0.58, shape: 'coil',
        chains: 4, chainRange: 1.15, chainFalloff: 0.68,
        upgradeCost: [75, 115, 165],
        desc: 'Chain lightning arcs between nearby enemies. Excellent vs swarms and splitters.',
      },
      rail: {
        name: 'RAIL', cost: 140, color: '#ff4466', glow: '#ff4466',
        damage: 50, range: 3.4, fireRate: 1.6, shape: 'rail',
        shieldBonus: 1.7,
        upgradeCost: [95, 140, 200],
        desc: 'Long-range rail slug. Massive bonus damage vs shielded units and bosses.',
      },
      mortar: {
        name: 'MORTAR', cost: 130, color: '#ff8800', glow: '#ff8800',
        damage: 30, range: 3.0, fireRate: 1.2, shape: 'mortar', aoe: 1.1,
        upgradeCost: [90, 135, 190],
        unlockWave: 1,
        desc: 'Lobs explosive shells with ground splash. Picks off groups at long range.',
      },
      flak: {
        name: 'FLAK', cost: 75, color: '#66ffaa', glow: '#66ffaa',
        damage: 6, range: 2.1, fireRate: 0.18, shape: 'flak',
        fastBonus: 2.2, fastThreshold: 90,
        upgradeCost: [55, 90, 130],
        unlockWave: 1,
        desc: 'Rapid anti-air flak. ×2.2 damage vs fast units (SWIFT and rush waves).',
      },
      lance: {
        name: 'LANCE', cost: 155, color: '#ff66cc', glow: '#ff66cc',
        damage: 14, range: 3.0, fireRate: 0.55, shape: 'lance',
        rampPerSec: 0.15, rampCap: 2.5,
        upgradeCost: [100, 150, 210],
        unlockWave: 4,
        desc: 'Focus beam ramps damage on the same target up to ×2.5. Boss killer.',
      },
      reactor: {
        name: 'REACTOR', cost: 110, color: '#aaff00', glow: '#aaff00',
        damage: 0, range: 1.8, fireRate: 99, shape: 'reactor', supportOnly: true,
        auraRate: 0.18,
        upgradeCost: [70, 110, 160],
        unlockWave: 7,
        desc: 'Support aura: +18% fire rate to nearby towers (one aura per tower).',
      },
      crypt: {
        name: 'CRYPT', cost: 145, color: '#cc66ff', glow: '#cc66ff',
        damage: 22, range: 2.5, fireRate: 1.0, shape: 'crypt',
        deathNova: 0.4, deathAoe: 1.0,
        upgradeCost: [95, 140, 195],
        unlockWave: 11,
        desc: 'Dark bolts. Enemies killed in range explode for 40% tower damage.',
      },
    },

    TOWER_UNLOCK: {
      flak: 1, pulse: 1, nova: 1, prism: 1, frost: 1, tesla: 1, rail: 1, mortar: 1,
      lance: 4, reactor: 7, crypt: 11,
    },

    ARSENAL_STRIKES: {
      shockwave: {
        name: 'SHOCK', cost: 120, color: '#ff8800',
        desc: 'Circular blast — 80+20×wave damage in 2.5 cells.',
        radius: 2.5,
      },
      cluster: {
        name: 'CLUSTER', cost: 160, color: '#ff00ff',
        desc: '5 chained explosions along the path ahead of tap.',
        hits: 5,
      },
      emp: {
        name: 'EMP', cost: 140, color: '#00f5ff',
        desc: 'Stun all enemies in 3 cells for 2.5s.',
        radius: 3, stunMs: 2500,
      },
      cryo: {
        name: 'CRYO', cost: 100, color: '#0088ff',
        desc: '70% slow for 4s in 2.8 cells. Triggers NOVA shatter.',
        radius: 2.8, slow: 0.3, slowMs: 4000,
      },
      repair: {
        name: 'REPAIR', cost: 90, color: '#39ff14',
        desc: '+1 core HP (max base +5).',
      },
    },

    ARSENAL_TECH: {
      overdrive: {
        name: 'OVERDRIVE', baseCost: 150, stackCost: 50, max: 5, lateMax: 8,
        lateStackMult: 2.6,
        desc: '+8% tower damage per stack. Premium stacks after 5 from W40.',
        damagePer: 0.08,
      },
      capacitor: {
        name: 'CAPACITOR', baseCost: 130, stackCost: 40, max: 3, lateMax: 5,
        lateStackMult: 2.4,
        desc: '+6% tower range per stack. Premium stacks after 3 from W40.',
        rangePer: 0.06,
      },
      salvage: {
        name: 'SALVAGE', baseCost: 100, stackCost: 35, max: 3, lateMax: 4,
        lateStackMult: 2.2,
        desc: '+12% sell value per stack. Premium stack after 3 from W40.',
        sellPer: 0.12,
      },
      reactor: {
        name: 'BOOST CORE', baseCost: 180, stackCost: 60, max: 2, lateMax: 3,
        lateStackMult: 2.5,
        desc: 'BOOST lasts +2s per stack. Premium stack after 2 from W40.',
        boostMs: 2000,
      },
    },

    isTowerUnlocked(type, wave) {
      const unlock = this.TOWER_UNLOCK[type];
      return unlock == null || wave >= unlock;
    },

    getMaxTowerTier(wave) {
      const w = wave || 0;
      if (w >= this.MEGA_UPGRADE_WAVE) return this.MEGA_MAX_TOWER_TIER;
      if (w >= this.LATE_UPGRADE_WAVE) return this.LATE_MAX_TOWER_TIER;
      return this.MAX_TOWER_TIER;
    },

    getTechMaxStacks(techId, wave) {
      const def = this.ARSENAL_TECH[techId];
      if (!def) return 0;
      const w = wave || 0;
      if (w >= this.LATE_UPGRADE_WAVE && def.lateMax != null) return def.lateMax;
      return def.max;
    },

    lateEconomyMult(wave) {
      const w = wave || 0;
      if (w < this.LATE_ECON_WAVE) return 1;
      const scale = w >= 45 ? this.LATE_ECON_SCALE_W45 : this.LATE_ECON_SCALE;
      return 1 + (w - this.LATE_ECON_WAVE) * scale;
    },

    getStrikeCost(id, wave) {
      const def = this.ARSENAL_STRIKES[id];
      if (!def) return null;
      return Math.floor(def.cost * this.lateEconomyMult(wave));
    },

    getTechCost(techId, stacks, wave) {
      const def = this.ARSENAL_TECH[techId];
      if (!def) return null;
      const w = wave || 0;
      let base;
      if (stacks < def.max) {
        base = def.baseCost + stacks * def.stackCost;
      } else {
        const capped = def.baseCost + (def.max - 1) * def.stackCost;
        const premium = stacks - def.max + 1;
        const mult = def.lateStackMult || 2.5;
        base = capped * Math.pow(mult, premium);
      }
      return Math.floor(base * this.lateEconomyMult(w));
    },

    strikeDamage(wave) {
      return 80 + wave * 20;
    },

    ENEMY_TYPES: {
      drone:    { name: 'DRONE',  hp: 40,  speed: 58,  reward: 7,  score: 10,  color: '#ff6688', shape: 'drone',    size: 0.28, desc: 'Basic unit. Balanced speed and HP.', wave: 1 },
      tank:     { name: 'TANK',   hp: 160, speed: 30,  reward: 15, score: 25,  color: '#aa44ff', shape: 'tank',     size: 0.46, desc: 'Heavy armor, slow march. Needs focused fire.', wave: 3 },
      swift:    { name: 'SWIFT',  hp: 16,  speed: 105, reward: 5,  score: 12,  color: '#39ff14', shape: 'swift',    size: 0.26, desc: 'Fragile but very fast. Frost towers counter well.', wave: 6 },
      shield:   { name: 'SHIELD', hp: 70,  speed: 48,  reward: 12, score: 20,  color: '#00f5ff', shape: 'shield',   size: 0.34, shield: 50, desc: 'Energy shield absorbs damage before HP.', wave: 8 },
      splitter: { name: 'SPLIT',  hp: 55,  speed: 52,  reward: 10, score: 18,  color: '#ff8800', shape: 'splitter', size: 0.34, split: true, desc: 'Splits into 2 mini-drones on death.', wave: 10 },
      boss:     { name: 'BOSS',   hp: 680, speed: 24,  reward: 68, score: 150, color: '#ff3344', shape: 'boss',     size: 0.52, desc: 'Massive diamond hull. Appears every 5th wave.', wave: 5 },
    },

    getTowerStats(type, tier, techMods) {
      const base = this.TOWER_TYPES[type];
      techMods = techMods || {};
      let dmgMult = 1 + tier * 0.4 + Math.max(0, tier - 1) * 0.14;
      if (tier >= 2) dmgMult *= 1.1;
      let rangeMult = 1 + tier * 0.14 + (tier >= 3 ? 0.1 : 0);
      let rateDiv = 1 + tier * 0.11 + (tier >= 2 ? 0.07 : 0);
      if (tier >= 2) rateDiv *= 1.05;
      if (techMods.damageMult) dmgMult *= techMods.damageMult;
      if (techMods.rangeMult) rangeMult *= techMods.rangeMult;
      return {
        damage: base.damage * dmgMult,
        range: base.range * rangeMult,
        fireRate: base.fireRate / rateDiv,
        aoe: base.aoe ? base.aoe * (1 + tier * 0.1) : base.aoe,
        pierce: base.pierce ? base.pierce + Math.floor(tier / 2) : base.pierce,
        chains: base.chains ? base.chains + tier : base.chains,
        chainRange: base.chainRange,
        chainFalloff: base.chainFalloff,
        shieldBonus: base.shieldBonus,
        slow: base.slow,
        slowMs: base.slowMs ? base.slowMs + tier * 250 : base.slowMs,
        fastBonus: base.fastBonus,
        fastThreshold: base.fastThreshold,
        rampPerSec: base.rampPerSec,
        rampCap: base.rampCap,
        auraRate: base.auraRate ? base.auraRate + tier * 0.04 : base.auraRate,
        deathNova: base.deathNova ? base.deathNova + tier * 0.06 : base.deathNova,
        deathAoe: base.deathAoe ? base.deathAoe * (1 + tier * 0.08) : base.deathAoe,
        supportOnly: base.supportOnly,
      };
    },

    getUpgradeCost(tower, wave) {
      const w = wave || 0;
      const maxTier = this.getMaxTowerTier(w);
      if (tower.tier >= maxTier) return null;
      const base = this.TOWER_TYPES[tower.type];
      const costs = base.upgradeCost;
      if (tower.tier < costs.length) return costs[tower.tier];
      const last = costs[costs.length - 1];
      const extra = tower.tier - costs.length + 1;
      const pow = tower.tier >= 9 ? 1.58 : 1.42;
      let cost = Math.floor(last * Math.pow(pow, extra));
      if (w >= this.LATE_UPGRADE_WAVE) {
        cost = Math.floor(cost * (1 + (w - this.LATE_UPGRADE_WAVE) * 0.035));
      }
      if (tower.tier >= 9 && w >= this.MEGA_UPGRADE_WAVE) {
        cost = Math.floor(cost * (1 + (w - this.MEGA_UPGRADE_WAVE) * 0.06));
      }
      return cost;
    },
  };
})();
