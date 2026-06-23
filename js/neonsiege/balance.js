(function () {
  window.NeonSiegeBalance = {
    START_GOLD: 85,
    BASE_HP_MAX: 15,
    WAVE_CLEAR_SCORE: 50,
    OVERCHARGE_FIRE_MULT: 1 / 1.7,
    ELITE_HP_MULT: 1.8,
    ELITE_REWARD_MULT: 2,
    ELITE_SPAWN_CHANCE: 0.08,
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

    hpScale(wave, mapHpMod, endless, maxWaves) {
      const endlessExtra = endless ? Math.max(0, wave - maxWaves) : 0;
      const endlessScale = endless ? 1 + endlessExtra * 0.17 : 1;
      const linear = 1 + wave * 0.085;
      const lateWave = Math.max(0, wave - 5);
      const lateSpan = Math.max(1, maxWaves - 5);
      const lateCurve = Math.pow(lateWave / lateSpan, 1.35) * 1.75;
      return mapHpMod * endlessScale * (linear + lateCurve);
    },

    speedScale(wave, endless, maxWaves) {
      const late = Math.max(0, wave - 7);
      const endlessExtra = endless ? Math.max(0, wave - maxWaves) * 0.045 : 0;
      return 1 + late * 0.016 + endlessExtra;
    },

    waveEnemyCount(wave, countMod) {
      const base = 5 + Math.floor(wave * 1.55);
      const late = wave > 8 ? Math.floor((wave - 8) * 0.7) : 0;
      return base + late + countMod;
    },

    spawnDelayForWave(waveNum) {
      if (waveNum >= 13) return 0.26;
      if (waveNum >= 9) return 0.32;
      return 0.4;
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
        desc: 'Lobs explosive shells with ground splash. Picks off groups at long range.',
      },
    },

    ENEMY_TYPES: {
      drone:    { name: 'DRONE',  hp: 40,  speed: 58,  reward: 7,  score: 10,  color: '#ff6688', shape: 'drone',    size: 0.28, desc: 'Basic unit. Balanced speed and HP.', wave: 1 },
      tank:     { name: 'TANK',   hp: 160, speed: 30,  reward: 15, score: 25,  color: '#aa44ff', shape: 'tank',     size: 0.46, desc: 'Heavy armor, slow march. Needs focused fire.', wave: 3 },
      swift:    { name: 'SWIFT',  hp: 16,  speed: 105, reward: 5,  score: 12,  color: '#39ff14', shape: 'swift',    size: 0.26, desc: 'Fragile but very fast. Frost towers counter well.', wave: 6 },
      shield:   { name: 'SHIELD', hp: 70,  speed: 48,  reward: 12, score: 20,  color: '#00f5ff', shape: 'shield',   size: 0.34, shield: 50, desc: 'Energy shield absorbs damage before HP.', wave: 8 },
      splitter: { name: 'SPLIT',  hp: 55,  speed: 52,  reward: 10, score: 18,  color: '#ff8800', shape: 'splitter', size: 0.34, split: true, desc: 'Splits into 2 mini-drones on death.', wave: 10 },
      boss:     { name: 'BOSS',   hp: 750, speed: 24,  reward: 68, score: 150, color: '#ff3344', shape: 'boss',     size: 0.52, desc: 'Massive diamond hull. Appears every 5th wave.', wave: 5 },
    },

    getTowerStats(type, tier) {
      const base = this.TOWER_TYPES[type];
      const dmgMult = 1 + tier * 0.4 + Math.max(0, tier - 1) * 0.14;
      const rangeMult = 1 + tier * 0.14 + (tier >= 3 ? 0.1 : 0);
      const rateDiv = 1 + tier * 0.11 + (tier >= 2 ? 0.07 : 0);
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
      };
    },

    getUpgradeCost(tower) {
      const base = this.TOWER_TYPES[tower.type];
      if (tower.tier >= this.MAX_TOWER_TIER) return null;
      return base.upgradeCost[tower.tier];
    },
  };
})();
