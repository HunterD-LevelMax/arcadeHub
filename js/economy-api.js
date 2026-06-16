(function () {
  const STORAGE_KEY = "arcade_hub_player_v1";
  const LOG_KEY = "arcade_hub_economy_log_v1";
  const PLAYER_NAME = "Player 1";
  const DEFAULT_UNLOCKED_GAMES = ["prismcascade", "doodle", "tetris", "snake"];
  const FIRST_LAUNCH_REWARD = 50;
  const NEW_BEST_BONUS = 5;
  const DAILY_BONUS = 10;
  const FIRST_GAME_BONUS = 3;
  const SESSION_BASE = 2;
  const MIN_SCORE_FOR_BONUS = 5;
  const MIN_ROUND_MS = 15000;
  const REWARD_COOLDOWN_MS = 15000;

  const RARITY_COST = { common: 30, rare: 50, epic: 70 };
  const RARITY_LABEL = { common: "COMMON", rare: "RARE", epic: "EPIC" };

  const GAME_REWARD_CONFIG = {
    snake: { divisor: 50, cap: 15 },
    flappy: { divisor: 5, cap: 20 },
    tetris: { divisor: 500, cap: 20 },
    doodle: { divisor: 200, cap: 20 },
    game2048: { divisor: 300, cap: 20 },
    stacktower: { divisor: 3, cap: 15 },
    spaceinvaders: { divisor: 200, cap: 20 },
    asteroids: { divisor: 300, cap: 20 },
    frogger: { divisor: 100, cap: 20 },
    prismcascade: { divisor: 400, cap: 25 },
    thrustrunner: { divisor: 500, cap: 25 }
  };

  let coinSessionStart = 0;
  let coinSessionBest = 0;

  function logEvent(type, payload) {
    const entry = { type, payload, at: new Date().toISOString() };
    console.info("[ArcadeEconomy]", entry);
    try {
      const raw = localStorage.getItem(LOG_KEY);
      const current = raw ? JSON.parse(raw) : [];
      current.push(entry);
      if (current.length > 200) current.shift();
      localStorage.setItem(LOG_KEY, JSON.stringify(current));
    } catch (_e) {}
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function getDefaultPlayerState() {
    return {
      playerName: PLAYER_NAME,
      coins: 0,
      firstLaunchRewarded: false,
      unlockedGames: [...DEFAULT_UNLOCKED_GAMES],
      lastDailyRewardDate: null,
      rewardedGames: [],
      lastRewardAt: {}
    };
  }

  function loadPlayerState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getDefaultPlayerState();
      const parsed = JSON.parse(raw);
      const unlocked = Array.isArray(parsed.unlockedGames) ? parsed.unlockedGames : [];
      return {
        playerName: parsed.playerName || PLAYER_NAME,
        coins: Number.isFinite(parsed.coins) ? parsed.coins : 0,
        firstLaunchRewarded: Boolean(parsed.firstLaunchRewarded),
        unlockedGames: Array.from(new Set([...DEFAULT_UNLOCKED_GAMES, ...unlocked])),
        lastDailyRewardDate: parsed.lastDailyRewardDate || null,
        rewardedGames: Array.isArray(parsed.rewardedGames) ? parsed.rewardedGames : [],
        lastRewardAt: parsed.lastRewardAt && typeof parsed.lastRewardAt === "object" ? parsed.lastRewardAt : {}
      };
    } catch (_e) {
      return getDefaultPlayerState();
    }
  }

  function savePlayerState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getGameCostFromRarity(rarity) {
    return RARITY_COST[rarity] || RARITY_COST.common;
  }

  function calculateScoreReward(gameId, score) {
    const cfg = GAME_REWARD_CONFIG[gameId] || { divisor: 200, cap: 20 };
    const safeScore = Number.isFinite(score) ? Math.max(0, score) : 0;
    const scoreBonus = safeScore >= MIN_SCORE_FOR_BONUS ? Math.floor(safeScore / cfg.divisor) : 0;
    const total = Math.min(SESSION_BASE + scoreBonus, cfg.cap);
    return { base: SESSION_BASE, scoreBonus: Math.max(0, total - SESSION_BASE), total };
  }

  function awardSessionReward(gameId, options) {
    const score = Number.isFinite(options?.score) ? options.score : 0;
    const isNewBest = Boolean(options?.isNewBest);
    const sessionDurationMs = Number.isFinite(options?.sessionDurationMs) ? options.sessionDurationMs : 0;
    const state = loadPlayerState();
    const breakdown = { base: 0, scoreBonus: 0, newBestBonus: 0, dailyBonus: 0, firstGameBonus: 0 };
    const now = Date.now();
    const lastAt = state.lastRewardAt[gameId] || 0;

    if (now - lastAt < REWARD_COOLDOWN_MS) {
      return { earned: 0, total: state.coins, breakdown, reason: "cooldown" };
    }
    if (sessionDurationMs < MIN_ROUND_MS) {
      return { earned: 0, total: state.coins, breakdown, reason: "too_short" };
    }

    const scoreReward = calculateScoreReward(gameId, score);
    breakdown.base = scoreReward.base;
    breakdown.scoreBonus = scoreReward.scoreBonus;
    if (isNewBest) breakdown.newBestBonus = NEW_BEST_BONUS;
    const today = todayKey();
    if (state.lastDailyRewardDate !== today) {
      breakdown.dailyBonus = DAILY_BONUS;
      state.lastDailyRewardDate = today;
    }
    if (!state.rewardedGames.includes(gameId)) {
      breakdown.firstGameBonus = FIRST_GAME_BONUS;
      state.rewardedGames.push(gameId);
      state.rewardedGames = Array.from(new Set(state.rewardedGames));
    }

    const earned = breakdown.base + breakdown.scoreBonus + breakdown.newBestBonus + breakdown.dailyBonus + breakdown.firstGameBonus;
    state.coins += earned;
    state.lastRewardAt[gameId] = now;
    savePlayerState(state);
    logEvent("session_reward", { gameId, score, earned, breakdown, coins: state.coins });
    return { earned, total: state.coins, breakdown, reason: null };
  }

  function renderCoinRewardUI(reward, ids) {
    const earnedEl = document.getElementById(ids?.earned || "coinRewardEarned");
    const totalEl = document.getElementById(ids?.total || "coinRewardTotal");
    const hintEl = document.getElementById(ids?.hint || "coinRewardHint");
    const blockEl = document.getElementById(ids?.block || "coinRewardBlock");
    if (!earnedEl && !totalEl && !blockEl) return;

    if (!reward || reward.earned <= 0) {
      if (blockEl) blockEl.classList.add("hidden");
      if (hintEl) {
        if (reward?.reason === "too_short") {
          hintEl.textContent = "Play at least 15 seconds to earn coins";
          hintEl.classList.remove("hidden");
        } else if (reward?.reason === "cooldown") {
          hintEl.textContent = "Wait a moment before the next coin reward";
          hintEl.classList.remove("hidden");
        } else {
          hintEl.classList.add("hidden");
        }
      }
      return;
    }

    if (blockEl) blockEl.classList.remove("hidden");
    if (hintEl) hintEl.classList.add("hidden");
    const parts = [`+${reward.earned} COINS`];
    if (reward.breakdown.newBestBonus) parts.push(`NEW BEST +${reward.breakdown.newBestBonus}`);
    if (reward.breakdown.dailyBonus) parts.push(`DAILY +${reward.breakdown.dailyBonus}`);
    if (reward.breakdown.firstGameBonus) parts.push(`FIRST RUN +${reward.breakdown.firstGameBonus}`);
    earnedEl.textContent = parts.join(" · ");
    if (totalEl) totalEl.textContent = `TOTAL: ${reward.total}`;
  }

  function beginCoinSession(currentBest) {
    coinSessionStart = Date.now();
    coinSessionBest = Number(currentBest) || 0;
    renderCoinRewardUI({ earned: 0, total: loadPlayerState().coins, breakdown: {}, reason: null });
  }

  function awardAndShowCoins(gameId, score) {
    const reward = awardSessionReward(gameId, {
      score,
      isNewBest: score > coinSessionBest,
      sessionDurationMs: coinSessionStart ? Date.now() - coinSessionStart : 0
    });
    renderCoinRewardUI(reward);
    return reward;
  }

  window.ArcadeEconomy = {
    STORAGE_KEY,
    FIRST_LAUNCH_REWARD,
    RARITY_COST,
    RARITY_LABEL,
    logEvent,
    loadPlayerState,
    savePlayerState,
    getGameCostFromRarity,
    awardSessionReward,
    renderCoinRewardUI,
    beginCoinSession,
    awardAndShowCoins
  };
})();
