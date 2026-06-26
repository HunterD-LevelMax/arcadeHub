(function () {
  const C = window.PrismCascadeConstants;
  const PROGRESS_KEY = 'prismcascade_progress';
  const MAX_CAMPAIGN_LEVEL = 20;

  const LEVELS = [
    {
      id: 1, name: 'First Light', mode: 'moves', moves: 22,
      goals: [{ type: 'score', target: 1400 }],
      abilities: [], obstacles: { ice: false, crate: false, obstacleEvery: 0 },
      intro: 'Match 3+ gems to score points.',
    },
    {
      id: 2, name: 'Chain Reaction', mode: 'moves', moves: 26,
      goals: [{ type: 'cascades', target: 6 }],
      abilities: [], obstacles: { ice: false, crate: false, obstacleEvery: 0 },
      intro: 'Trigger cascade chains — each combo step counts.',
    },
    {
      id: 3, name: 'Color Focus', mode: 'moves', moves: 28,
      goals: [{ type: 'color', color: 0, target: 20 }],
      abilities: [], obstacles: { ice: false, crate: false, obstacleEvery: 0 },
      intro: 'Collect cyan gems. Match 4+ for bonus crystals!',
    },
    {
      id: 4, name: 'Frostbite', mode: 'moves', moves: 20,
      goals: [{ type: 'ice', target: 5 }],
      abilities: [], obstacles: { ice: true, crate: false, obstacleEvery: 0 },
      startingObstacles: [
        { r: 2, c: 3, type: 'ice', hp: 1 },
        { r: 3, c: 5, type: 'ice', hp: 2 },
        { r: 4, c: 1, type: 'ice', hp: 1 },
        { r: 5, c: 2, type: 'ice', hp: 1 },
        { r: 6, c: 6, type: 'ice', hp: 1 },
      ],
      intro: 'Break ice by matching gems next to frozen tiles.',
    },
    {
      id: 5, name: 'Calm Prism', mode: 'time', time: 42,
      goals: [{ type: 'score', target: 2200 }],
      abilities: ['bomb', 'hammer'], startCharges: { bomb: 1, hammer: 1 },
      obstacles: { ice: false, crate: false, obstacleEvery: 0 },
      intro: 'Reach the score before time runs out. Matches add time!',
    },
    {
      id: 6, name: 'Crate Breaker', mode: 'moves', moves: 24,
      goals: [{ type: 'crate', target: 6 }],
      abilities: ['bomb', 'hammer'], startCharges: { bomb: 1, hammer: 1 },
      obstacles: { ice: false, crate: true, obstacleEvery: 0 },
      startingObstacles: [
        { r: 1, c: 1, type: 'crate', hp: 2 },
        { r: 1, c: 6, type: 'crate', hp: 2 },
        { r: 3, c: 4, type: 'crate', hp: 2 },
        { r: 4, c: 4, type: 'crate', hp: 2 },
        { r: 6, c: 2, type: 'crate', hp: 2 },
        { r: 6, c: 5, type: 'crate', hp: 2 },
      ],
      intro: 'Destroy wooden crates with adjacent matches or Hammer.',
    },
    {
      id: 7, name: 'Special Blend', mode: 'moves', moves: 28,
      goals: [{ type: 'specials', target: 4 }],
      abilities: ['bomb', 'hammer'], startCharges: { bomb: 1, hammer: 1 },
      obstacles: { ice: false, crate: false, obstacleEvery: 0 },
      intro: 'Activate bonus crystals — match 4+ to create them.',
    },
    {
      id: 8, name: 'Heat Wave', mode: 'time', time: 38,
      goals: [{ type: 'score', target: 3800 }],
      abilities: ['bomb', 'hammer', 'shuffle'], startCharges: { bomb: 1, hammer: 1 },
      obstacles: { ice: true, crate: false, obstacleEvery: 6 },
      intro: 'Score fast! Ice spreads every 6 moves.',
    },
    {
      id: 9, name: 'Dual Goal', mode: 'moves', moves: 30,
      goals: [
        { type: 'color', color: 5, target: 17 },
        { type: 'crate', target: 4 },
      ],
      abilities: ['bomb', 'hammer'], startCharges: { bomb: 1, hammer: 1 },
      obstacles: { ice: false, crate: true, obstacleEvery: 0 },
      startingObstacles: [
        { r: 2, c: 2, type: 'crate', hp: 2 },
        { r: 2, c: 6, type: 'crate', hp: 2 },
        { r: 4, c: 6, type: 'crate', hp: 2 },
        { r: 6, c: 3, type: 'crate', hp: 2 },
      ],
      intro: 'Collect purple gems AND break 4 crates.',
    },
    {
      id: 10, name: 'Cascade Crown', mode: 'time', time: 45,
      goals: [{ type: 'score', target: 5500 }],
      abilities: ['bomb', 'hammer', 'shuffle'], startCharges: { bomb: 2, hammer: 1 },
      obstacles: { ice: true, crate: true, obstacleEvery: 5 },
      startingObstacles: [
        { r: 1, c: 4, type: 'ice', hp: 2 },
        { r: 2, c: 7, type: 'crate', hp: 2 },
        { r: 3, c: 1, type: 'crate', hp: 2 },
        { r: 5, c: 6, type: 'ice', hp: 1 },
        { r: 6, c: 3, type: 'crate', hp: 2 },
        { r: 7, c: 5, type: 'ice', hp: 2 },
      ],
      intro: 'Ice, crates, and a huge score goal — act 1 finale.',
    },
    {
      id: 11, name: 'Frozen Vault', mode: 'moves', moves: 24,
      goals: [{ type: 'ice', target: 7 }],
      abilities: ['bomb', 'hammer'], startCharges: { bomb: 1, hammer: 1 },
      obstacles: { ice: true, crate: false, obstacleEvery: 7 },
      startingObstacles: [
        { r: 0, c: 3, type: 'ice', hp: 2 },
        { r: 1, c: 6, type: 'ice', hp: 1 },
        { r: 3, c: 2, type: 'ice', hp: 2 },
        { r: 4, c: 5, type: 'ice', hp: 1 },
        { r: 5, c: 0, type: 'ice', hp: 1 },
        { r: 6, c: 4, type: 'ice', hp: 2 },
        { r: 7, c: 7, type: 'ice', hp: 1 },
      ],
      intro: 'A vault of ice — and more keeps forming every 7 moves.',
    },
    {
      id: 12, name: 'Spectrum Rush', mode: 'moves', moves: 28,
      goals: [
        { type: 'color', color: 0, target: 14 },
        { type: 'color', color: 1, target: 14 },
      ],
      abilities: ['bomb', 'hammer'], startCharges: { bomb: 1, hammer: 1 },
      obstacles: { ice: false, crate: false, obstacleEvery: 0 },
      intro: 'Hunt cyan circles and magenta diamonds in the same run.',
    },
    {
      id: 13, name: 'Clockwork Combo', mode: 'time', time: 40,
      goals: [{ type: 'cascades', target: 9 }],
      abilities: ['bomb', 'hammer'], startCharges: { bomb: 1, hammer: 1 },
      obstacles: { ice: false, crate: false, obstacleEvery: 0 },
      intro: 'Chain cascades against the clock — each combo step counts.',
    },
    {
      id: 14, name: 'Lumber Yard', mode: 'moves', moves: 26,
      goals: [{ type: 'crate', target: 8 }],
      abilities: ['bomb', 'hammer', 'shuffle'], startCharges: { bomb: 1, hammer: 2 },
      obstacles: { ice: false, crate: true, obstacleEvery: 0 },
      startingObstacles: [
        { r: 0, c: 1, type: 'crate', hp: 2 },
        { r: 0, c: 6, type: 'crate', hp: 2 },
        { r: 2, c: 3, type: 'crate', hp: 2 },
        { r: 2, c: 5, type: 'crate', hp: 2 },
        { r: 4, c: 4, type: 'crate', hp: 3 },
        { r: 6, c: 1, type: 'crate', hp: 2 },
        { r: 6, c: 6, type: 'crate', hp: 2 },
        { r: 7, c: 3, type: 'crate', hp: 2 },
      ],
      intro: 'Eight crates block the yard. Hammer helps — use it wisely.',
    },
    {
      id: 15, name: 'Overcharge', mode: 'moves', moves: 28,
      goals: [{ type: 'specials', target: 5 }],
      abilities: ['bomb', 'hammer', 'shuffle'], startCharges: { bomb: 2, hammer: 1 },
      obstacles: { ice: false, crate: false, obstacleEvery: 0 },
      intro: 'Create and detonate five bonus crystals. Match 4+ to spawn them.',
    },
    {
      id: 16, name: 'Meltdown', mode: 'time', time: 34,
      goals: [{ type: 'score', target: 4800 }],
      abilities: ['bomb', 'hammer', 'shuffle'], startCharges: { bomb: 1, hammer: 1 },
      obstacles: { ice: true, crate: false, obstacleEvery: 5 },
      startingObstacles: [
        { r: 1, c: 2, type: 'ice', hp: 1 },
        { r: 2, c: 6, type: 'ice', hp: 2 },
        { r: 4, c: 0, type: 'ice', hp: 1 },
        { r: 5, c: 5, type: 'ice', hp: 2 },
        { r: 7, c: 4, type: 'ice', hp: 1 },
      ],
      intro: 'Score under pressure while ice creeps in every 5 moves.',
    },
    {
      id: 17, name: 'Three Keys', mode: 'moves', moves: 30,
      goals: [
        { type: 'score', target: 3000 },
        { type: 'cascades', target: 5 },
        { type: 'ice', target: 3 },
      ],
      abilities: ['bomb', 'hammer'], startCharges: { bomb: 1, hammer: 1 },
      obstacles: { ice: true, crate: false, obstacleEvery: 0 },
      startingObstacles: [
        { r: 2, c: 4, type: 'ice', hp: 2 },
        { r: 4, c: 1, type: 'ice', hp: 1 },
        { r: 6, c: 6, type: 'ice', hp: 2 },
      ],
      intro: 'Score, cascades, and ice breaks — complete all three.',
    },
    {
      id: 18, name: 'Arctic Depot', mode: 'moves', moves: 22,
      goals: [
        { type: 'ice', target: 6 },
        { type: 'crate', target: 5 },
      ],
      abilities: ['bomb', 'hammer', 'shuffle'], startCharges: { bomb: 1, hammer: 2 },
      obstacles: { ice: true, crate: true, obstacleEvery: 0 },
      startingObstacles: [
        { r: 1, c: 3, type: 'ice', hp: 2 },
        { r: 1, c: 5, type: 'crate', hp: 2 },
        { r: 3, c: 0, type: 'crate', hp: 2 },
        { r: 3, c: 7, type: 'ice', hp: 1 },
        { r: 5, c: 2, type: 'crate', hp: 2 },
        { r: 5, c: 6, type: 'ice', hp: 2 },
        { r: 7, c: 4, type: 'crate', hp: 2 },
      ],
      intro: 'Frozen stock and wooden crates — clear both objectives.',
    },
    {
      id: 19, name: 'Prism Siege', mode: 'time', time: 44,
      goals: [{ type: 'score', target: 6200 }],
      abilities: ['bomb', 'hammer', 'shuffle'], startCharges: { bomb: 2, hammer: 1 },
      obstacles: { ice: true, crate: true, obstacleEvery: 4 },
      startingObstacles: [
        { r: 0, c: 4, type: 'ice', hp: 2 },
        { r: 2, c: 2, type: 'crate', hp: 2 },
        { r: 3, c: 6, type: 'ice', hp: 1 },
        { r: 5, c: 1, type: 'crate', hp: 2 },
        { r: 6, c: 5, type: 'ice', hp: 2 },
        { r: 7, c: 0, type: 'crate', hp: 2 },
      ],
      intro: 'Ice and crates spawn often — race the timer for a massive score.',
    },
    {
      id: 20, name: 'Grand Prism', mode: 'moves', moves: 26,
      goals: [
        { type: 'score', target: 4500 },
        { type: 'specials', target: 3 },
        { type: 'color', color: 4, target: 12 },
      ],
      abilities: ['bomb', 'hammer', 'shuffle'], startCharges: { bomb: 2, hammer: 2 },
      obstacles: { ice: true, crate: true, obstacleEvery: 6 },
      startingObstacles: [
        { r: 1, c: 1, type: 'ice', hp: 2 },
        { r: 1, c: 6, type: 'crate', hp: 2 },
        { r: 3, c: 4, type: 'ice', hp: 1 },
        { r: 4, c: 7, type: 'crate', hp: 2 },
        { r: 6, c: 2, type: 'crate', hp: 2 },
        { r: 7, c: 5, type: 'ice', hp: 2 },
      ],
      intro: 'Campaign finale — score, specials, orange stars, and chaos.',
    },
  ];

  const INFINITE_MODE = {
    id: 'infinite', name: 'Prism Rush', mode: 'time', time: C.GAME_TIME,
    goals: [], abilities: ['bomb', 'hammer', 'shuffle'], obstacles: null,
    intro: 'Survive as long as you can. Difficulty escalates over time!',
    randomObjectives: true, useTiers: true,
  };

  function defaultProgress() {
    return { unlockedLevel: 1, stars: {}, infiniteBest: 0 };
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return defaultProgress();
      const parsed = JSON.parse(raw);
      return {
        unlockedLevel: Math.max(1, Math.min(MAX_CAMPAIGN_LEVEL, parseInt(parsed.unlockedLevel, 10) || 1)),
        stars: parsed.stars && typeof parsed.stars === 'object' ? parsed.stars : {},
        infiniteBest: parseInt(parsed.infiniteBest, 10) || 0,
      };
    } catch (_e) {
      return defaultProgress();
    }
  }

  function saveProgress(progress) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  function getLevel(id) {
    if (id === 'infinite') return INFINITE_MODE;
    return LEVELS.find((l) => l.id === id) || null;
  }

  function isLevelUnlocked(id, progress) {
    if (id === 'infinite' || id === 1) return true;
    return id <= progress.unlockedLevel;
  }

  function goalLabel(goal) {
    switch (goal.type) {
      case 'score': return `Score ${goal.target}`;
      case 'color': return `Collect ${goal.target} ${C.GEM_DEFS[goal.color].shape}s`;
      case 'cascades': return `${goal.target} cascade steps`;
      case 'ice': return `Break ${goal.target} ice`;
      case 'crate': return `Destroy ${goal.target} crates`;
      case 'specials': return `Activate ${goal.target} specials`;
      default: return 'Complete goal';
    }
  }

  function initGoalProgress(goals) {
    return goals.map((g) => ({ ...g, progress: 0, done: false }));
  }

  function calcStars(level, goalProgress, movesLeft, timeLeft, score, initialMoves, initialTime) {
    if (!goalProgress.every((g) => g.done)) return 0;
    let stars = 1;
    const resourceLeft = level.mode === 'moves'
      ? movesLeft / Math.max(1, initialMoves)
      : timeLeft / Math.max(1, initialTime);
    const scoreGoal = level.goals.find((g) => g.type === 'score');
    const scoreRatio = scoreGoal ? score / Math.max(1, scoreGoal.target) : 1;
    if (resourceLeft >= 0.3 || scoreRatio >= 1.2) stars = 2;
    if (resourceLeft >= 0.5 || scoreRatio >= 1.5) stars = 3;
    return stars;
  }

  window.PrismCascadeLevels = {
    LEVELS, INFINITE_MODE, MAX_CAMPAIGN_LEVEL, PROGRESS_KEY,
    loadProgress, saveProgress, getLevel, isLevelUnlocked,
    goalLabel, initGoalProgress, calcStars,
  };
})();
