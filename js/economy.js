(function () {
  const STORAGE_KEY = "arcade_hub_player_v1";
  const LOG_KEY = "arcade_hub_economy_log_v1";
  const DEFAULT_UNLOCKED_GAMES = ["doodle", "tetris", "snake"];
  const FIRST_LAUNCH_REWARD = 50;
  const GAME_ENTRY_REWARD = 5;
  const PLAYER_NAME = "Player 1";
  const RARITY_COST = {
    common: 30,
    rare: 50,
    epic: 70
  };

  function logEvent(type, payload) {
    const entry = {
      type,
      payload,
      at: new Date().toISOString()
    };
    console.info("[ArcadeEconomy]", entry);
    try {
      const raw = localStorage.getItem(LOG_KEY);
      const current = raw ? JSON.parse(raw) : [];
      current.push(entry);
      if (current.length > 200) current.shift();
      localStorage.setItem(LOG_KEY, JSON.stringify(current));
    } catch (_e) {
      // Ignore log storage errors.
    }
  }

  function getGameCost(card) {
    const rarity = card.dataset.rarity || "common";
    return RARITY_COST[rarity] || RARITY_COST.common;
  }

  function loadPlayerState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          playerName: PLAYER_NAME,
          coins: 0,
          firstLaunchRewarded: false,
          unlockedGames: [...DEFAULT_UNLOCKED_GAMES]
        };
      }
      const parsed = JSON.parse(raw);
      const unlocked = Array.isArray(parsed.unlockedGames) ? parsed.unlockedGames : [];
      const mergedUnlocked = Array.from(new Set([...DEFAULT_UNLOCKED_GAMES, ...unlocked]));
      return {
        playerName: parsed.playerName || PLAYER_NAME,
        coins: Number.isFinite(parsed.coins) ? parsed.coins : 0,
        firstLaunchRewarded: Boolean(parsed.firstLaunchRewarded),
        unlockedGames: mergedUnlocked
      };
    } catch (_e) {
      return {
        playerName: PLAYER_NAME,
        coins: 0,
        firstLaunchRewarded: false,
        unlockedGames: [...DEFAULT_UNLOCKED_GAMES]
      };
    }
  }

  function savePlayerState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function animateCoins() {
    const coinsEl = document.getElementById("playerCoins");
    if (!coinsEl) return;
    coinsEl.classList.remove("coin-pop");
    void coinsEl.offsetWidth;
    coinsEl.classList.add("coin-pop");
  }

  function animateUnlock(card) {
    card.classList.remove("unlock-flash");
    void card.offsetWidth;
    card.classList.add("unlock-flash");
  }

  function renderProfile(state) {
    const nameEl = document.getElementById("playerName");
    const coinsEl = document.getElementById("playerCoins");
    if (nameEl) nameEl.textContent = state.playerName;
    if (coinsEl) coinsEl.textContent = `Coins: ${state.coins}`;
  }

  function renderGameLocks(state) {
    document.querySelectorAll(".game-card[data-game-id]").forEach((card) => {
      const gameId = card.dataset.gameId;
      const unlocked = state.unlockedGames.includes(gameId);
      const cost = getGameCost(card);
      card.dataset.unlockCost = String(cost);
      card.classList.toggle("locked", !unlocked);
    });
  }

  function showModal({ title, text, showCancel = false }) {
    return new Promise((resolve) => {
      const overlay = document.getElementById("arcadeModal");
      const titleEl = document.getElementById("arcadeModalTitle");
      const textEl = document.getElementById("arcadeModalText");
      const okBtn = document.getElementById("arcadeModalOk");
      const cancelBtn = document.getElementById("arcadeModalCancel");

      titleEl.textContent = title || "ARCADE HUB";
      textEl.textContent = text || "";
      cancelBtn.style.display = showCancel ? "inline-flex" : "none";
      overlay.classList.remove("hidden");
      document.body.classList.add("modal-open");

      const close = (value) => {
        overlay.classList.add("hidden");
        document.body.classList.remove("modal-open");
        okBtn.removeEventListener("click", okHandler);
        cancelBtn.removeEventListener("click", cancelHandler);
        resolve(value);
      };

      const okHandler = () => close(true);
      const cancelHandler = () => close(false);

      okBtn.addEventListener("click", okHandler);
      cancelBtn.addEventListener("click", cancelHandler);
    });
  }

  function showInfoModal(title, text) {
    return showModal({ title, text, showCancel: false });
  }

  function showConfirmModal(title, text) {
    return showModal({ title, text, showCancel: true });
  }

  let playerState = loadPlayerState();

  if (!playerState.firstLaunchRewarded) {
    playerState.coins += FIRST_LAUNCH_REWARD;
    playerState.firstLaunchRewarded = true;
    savePlayerState(playerState);
    logEvent("first_launch_reward", { reward: FIRST_LAUNCH_REWARD, coins: playerState.coins });
    setTimeout(() => {
      showInfoModal("Welcome Bonus", "You launched Arcade Hub for the first time and received 50 coins.");
    }, 200);
  }

  renderProfile(playerState);
  renderGameLocks(playerState);

  document.querySelectorAll(".game-card[data-game-id]").forEach((card) => {
    card.addEventListener("click", async (event) => {
      const gameId = card.dataset.gameId;
      const isUnlocked = playerState.unlockedGames.includes(gameId);
      const unlockCost = getGameCost(card);

      if (!isUnlocked) {
        event.preventDefault();
        if (playerState.coins < unlockCost) {
          logEvent("unlock_failed_insufficient_coins", {
            gameId,
            unlockCost,
            coins: playerState.coins
          });
          await showInfoModal("Not enough coins", `You need ${unlockCost} coins, you have ${playerState.coins}.`);
          return;
        }

        const confirmUnlock = await showConfirmModal("Unlock game", `Open this game for ${unlockCost} coins?`);
        if (!confirmUnlock) return;

        playerState.coins -= unlockCost;
        playerState.unlockedGames.push(gameId);
        playerState.unlockedGames = Array.from(new Set(playerState.unlockedGames));
        renderProfile(playerState);
        renderGameLocks(playerState);
        savePlayerState(playerState);
        animateCoins();
        animateUnlock(card);
        logEvent("unlock_success", { gameId, unlockCost, coins: playerState.coins });
      }

      playerState.coins += GAME_ENTRY_REWARD;
      renderProfile(playerState);
      savePlayerState(playerState);
      animateCoins();
      logEvent("game_entry_reward", { gameId, reward: GAME_ENTRY_REWARD, coins: playerState.coins });
    });
  });
})();
