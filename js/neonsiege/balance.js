(function () {
  window.NeonSiegeBalance = {
    START_GOLD: 85,
    BASE_HP_MAX: 15,
    INTEREST_RATE: 0.5,
    INTEREST_CAP: 12,
    WAVE_CLEAR_GOLD_BASE: 6,
    OVERCHARGE_FIRE_MULT: 1 / 1.7,
    ELITE_HP_MULT: 1.8,
    ELITE_REWARD_MULT: 2,
    ELITE_SPAWN_CHANCE: 0.08,
    SHATTER_BONUS: 0.35,
    COMBO_GOLD_THRESHOLD: 1.5,
    KILL_STREAK_WINDOW_MS: 2000,

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
      const endlessScale = endless ? 1 + (wave - maxWaves) * 0.12 : 1;
      return mapHpMod * endlessScale * (1 + wave * 0.11);
    },

    waveEnemyCount(wave, countMod) {
      return 5 + Math.floor(wave * 1.6) + countMod;
    },

    TOWER_TYPES: {
      pulse: {
        name: 'PULSE', cost: 60, color: '#00f5ff', glow: '#00f5ff',
        damage: 10, range: 2.2, fireRate: 0.4, shape: 'square',
        upgradeCost: [50, 80],
        desc: 'Fast single-target blaster. Cheap workhorse for picking off stragglers.',
      },
      nova: {
        name: 'NOVA', cost: 100, color: '#ff00ff', glow: '#ff00ff',
        damage: 24, range: 2.0, fireRate: 1.15, shape: 'hex', aoe: 1.2,
        upgradeCost: [70, 110],
        desc: 'AoE hex burst at the target. Devastating on chokepoints and crowds. Shatters slowed enemies for +35% damage.',
      },
      prism: {
        name: 'PRISM', cost: 125, color: '#ffcc00', glow: '#ffcc00',
        damage: 16, range: 2.8, fireRate: 0.75, shape: 'diamond', pierce: 3,
        upgradeCost: [85, 130],
        desc: 'Piercing beam hits up to 3 enemies in a line. Great on straight path segments.',
      },
      frost: {
        name: 'FROST', cost: 85, color: '#0088ff', glow: '#0088ff',
        damage: 5, range: 2.4, fireRate: 0.6, shape: 'triangle',
        slow: 0.5, slowMs: 1500,
        upgradeCost: [55, 95],
        desc: 'Low damage but strong slow. Extends time on path. Synergy: NOVA deals +35% to slowed targets.',
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
      const mult = 1 + tier * 0.4;
      const rangeMult = 1 + tier * 0.15;
      return {
        damage: base.damage * mult,
        range: base.range * rangeMult,
        fireRate: base.fireRate / (1 + tier * 0.1),
        aoe: base.aoe,
        pierce: base.pierce,
        slow: base.slow,
        slowMs: base.slowMs,
      };
    },

    getUpgradeCost(tower) {
      const base = this.TOWER_TYPES[tower.type];
      if (tower.tier >= 2) return null;
      return base.upgradeCost[tower.tier];
    },
  };
})();
