(function () {
  const C = window.PrismCascadeConstants;
  const PROGRESS_KEY = 'prismcascade_progress';

  const LEVELS = [
    {
      id: 1, name: 'First Light', mode: 'moves', moves: 25,
      goals: [{ type: 'score', target: 1200 }],
      abilities: [], obstacles: { ice: false, crate: false, obstacleEvery: 0 },
      intro: 'Match 3+ gems to score points.',
    },
    {
      id: 2, name: 'Chain Reaction', mode: 'moves', moves: 28,
      goals: [{ type: 'cascades', target: 5 }],
      abilities: [], obstacles: { ice: false, crate: false, obstacleEvery: 0 },
      intro: 'Trigger cascade chains — each combo step counts.',
    },
    {
      id: 3, name: 'Color Focus', mode: 'moves', moves: 30,
      goals: [{ type: 'color', color: 0, target: 18 }],
      abilities: [], obstacles: { ice: false, crate: false, obstacleEvery: 0 },
      intro: 'Collect cyan gems. Match 4+ for bonus crystals!',
    },
    {
      id: 4, name: 'Frostbite', mode: 'moves', moves: 22,
      goals: [{ type: 'ice', target: 4 }],
      abilities: [], obstacles: { ice: true, crate: false, obstacleEvery: 0 },
      startingObstacles: [
        { r: 2, c: 3, type: 'ice', hp: 1 },
        { r: 3, c: 5, type: 'ice', hp: 2 },
        { r: 5, c: 2, type: 'ice', hp: 1 },
        { r: 6, c: 6, type: 'ice', hp: 1 },
      ],
      intro: 'Break ice by matching gems next to frozen tiles.',
    },
    {
      id: 5, name: 'Calm Prism', mode: 'time', time: 45,
      goals: [{ type: 'score', target: 2000 }],
      abilities: ['bomb', 'hammer'], startCharges: { bomb: 1, hammer: 1 },
      obstacles: { ice: false, crate: false, obstacleEvery: 0 },
      intro: 'Reach the score before time runs out. Matches add time!',
    },
    {
      id: 6, name: 'Crate Breaker', mode: 'moves', moves: 26,
      goals: [{ type: 'crate', target: 5 }],
      abilities: ['bomb', 'hammer'], startCharges: { bomb: 1, hammer: 1 },
      obstacles: { ice: false, crate: true, obstacleEvery: 0 },
      startingObstacles: [
        { r: 1, c: 1, type: 'crate', hp: 2 },
        { r: 1, c: 6, type: 'crate', hp: 2 },
        { r: 4, c: 4, type: 'crate', hp: 2 },
        { r: 6, c: 2, type: 'crate', hp: 2 },
        { r: 6, c: 5, type: 'crate', hp: 2 },
      ],
      intro: 'Destroy wooden crates with adjacent matches or Hammer.',
    },
    {
      id: 7, name: 'Special Blend', mode: 'moves', moves: 30,
      goals: [{ type: 'specials', target: 3 }],
      abilities: ['bomb', 'hammer'], startCharges: { bomb: 1, hammer: 1 },
      obstacles: { ice: false, crate: false, obstacleEvery: 0 },
      intro: 'Activate bonus crystals — match 4+ to create them.',
    },
    {
      id: 8, name: 'Heat Wave', mode: 'time', time: 40,
      goals: [{ type: 'score', target: 3500 }],
      abilities: ['bomb', 'hammer', 'shuffle'], startCharges: { bomb: 1, hammer: 1 },
      obstacles: { ice: true, crate: false, obstacleEvery: 6 },
      intro: 'Score fast! Ice spreads every 6 moves.',
    },
    {
      id: 9, name: 'Dual Goal', mode: 'moves', moves: 32,
      goals: [
        { type: 'color', color: 5, target: 15 },
        { type: 'crate', target: 3 },
      ],
      abilities: ['bomb', 'hammer'], startCharges: { bomb: 1, hammer: 1 },
      obstacles: { ice: false, crate: true, obstacleEvery: 0 },
      startingObstacles: [
        { r: 2, c: 2, type: 'crate', hp: 2 },
        { r: 4, c: 6, type: 'crate', hp: 2 },
        { r: 6, c: 3, type: 'crate', hp: 2 },
      ],
      intro: 'Collect purple gems AND break 3 crates.',
    },
    {
      id: 10, name: 'Cascade Crown', mode: 'time', time: 50,
      goals: [{ type: 'score', target: 5000 }],
      abilities: ['bomb', 'hammer', 'shuffle'], startCharges: { bomb: 2, hammer: 1 },
      obstacles: { ice: true, crate: true, obstacleEvery: 5 },
      startingObstacles: [
        { r: 1, c: 4, type: 'ice', hp: 2 },
        { r: 3, c: 1, type: 'crate', hp: 2 },
        { r: 5, c: 6, type: 'ice', hp: 1 },
        { r: 7, c: 3, type: 'crate', hp: 2 },
      ],
      intro: 'Final challenge — ice, crates, and a huge score goal.',
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
        unlockedLevel: Math.max(1, Math.min(10, parseInt(parsed.unlockedLevel, 10) || 1)),
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
    LEVELS, INFINITE_MODE, PROGRESS_KEY,
    loadProgress, saveProgress, getLevel, isLevelUnlocked,
    goalLabel, initGoalProgress, calcStars,
  };
})();
