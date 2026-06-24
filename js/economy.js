(function () {
  const {
    EXIT_REWARD_KEY,
    FIRST_LAUNCH_REWARD,
    FEATURED_GAME_ID,
    FEATURED_UNLOCK_COST,
    RARITY_LABEL,
    logEvent,
    loadPlayerState,
    savePlayerState
  } = window.ArcadeEconomy;

  function getGameCost(card) {
    const gameId = card.dataset.gameId;
    const rarity = card.dataset.rarity || "common";
    return window.ArcadeEconomy.getGameUnlockCost(gameId, rarity);
  }

  function animateCoins() {
    const coinsEl = document.getElementById("playerCoins");
    if (!coinsEl) return;
    coinsEl.classList.remove("coin-pop");
    void coinsEl.offsetWidth;
    coinsEl.classList.add("coin-pop");
  }

  function showExitRewardToast() {
    let data;
    try {
      const raw = sessionStorage.getItem(EXIT_REWARD_KEY);
      if (!raw) return;
      sessionStorage.removeItem(EXIT_REWARD_KEY);
      data = JSON.parse(raw);
    } catch (_e) {
      return;
    }
    if (!data || !Number.isFinite(data.earned) || data.earned <= 0) return;

    playerState = loadPlayerState();
    renderProfile(playerState);
    renderGameLocks(playerState);
    animateCoins();
    hapticSuccess();
    if (window.ArcadeAudio && typeof window.ArcadeAudio.play === 'function') {
      window.ArcadeAudio.play('ui.coin', { volume: 0.5 });
    }

    const toast = document.createElement("div");
    toast.className = "exit-reward-toast";
    toast.textContent = `+${data.earned} coins saved from your last session`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("visible"));
    setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function animateUnlock(card) {
    card.classList.remove("unlock-flash");
    void card.offsetWidth;
    card.classList.add("unlock-flash");
  }

  function renderProfile(state) {
    const nameEl = document.getElementById("playerName");
    const coinsEl = document.getElementById("playerCoins");
    const nameText = nameEl?.querySelector(".profile-text");
    const coinsText = coinsEl?.querySelector(".profile-text");
    if (nameText) nameText.textContent = state.playerName;
    if (coinsText) coinsText.textContent = `Coins: ${state.coins}`;
    renderNextUnlock(state);
  }

  function ensureLockOverlay(card) {
    let overlay = card.querySelector(".card-lock-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "card-lock-overlay";
      overlay.setAttribute("aria-hidden", "true");
      overlay.innerHTML = `
        <div class="card-lock-badge">
          <span class="card-lock-icon-wrap">
            <span class="material-symbols-outlined card-lock-icon" aria-hidden="true">lock</span>
          </span>
          <span class="card-lock-rarity"></span>
          <span class="card-lock-featured hidden">FEATURED</span>
          <span class="card-lock-cost-wrap">
            <span class="material-symbols-outlined" aria-hidden="true">paid</span>
            <span class="card-lock-cost"></span>
          </span>
        </div>
      `;
      const preview = card.querySelector(".card-preview");
      if (preview) preview.appendChild(overlay);
      else card.appendChild(overlay);
    }
    return overlay;
  }

  function updatePlayButton(card, locked) {
    const playBtn = card.querySelector(".play-btn");
    if (!playBtn) return;
    if (locked) {
      playBtn.classList.add("play-btn-locked");
      playBtn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">lock</span>UNLOCK';
    } else {
      playBtn.classList.remove("play-btn-locked");
      playBtn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">play_arrow</span>PLAY';
    }
  }

  function renderGameLocks(state) {
    document.querySelectorAll(".game-card[data-game-id]").forEach((card) => {
      const gameId = card.dataset.gameId;
      const rarity = card.dataset.rarity || "common";
      const unlocked = state.unlockedGames.includes(gameId);
      const cost = getGameCost(card);
      card.dataset.unlockCost = String(cost);
      card.dataset.unlockRarity = RARITY_LABEL[rarity] || RARITY_LABEL.common;
      card.classList.toggle("locked", !unlocked);

      if (!unlocked) {
        const overlay = ensureLockOverlay(card);
        overlay.classList.remove("hidden");
        const rarityEl = overlay.querySelector(".card-lock-rarity");
        const featuredEl = overlay.querySelector(".card-lock-featured");
        const costEl = overlay.querySelector(".card-lock-cost");
        const isFeatured = gameId === FEATURED_GAME_ID;
        if (rarityEl) {
          rarityEl.textContent = isFeatured ? "INTRO OFFER" : (RARITY_LABEL[rarity] || RARITY_LABEL.common);
        }
        if (featuredEl) featuredEl.classList.toggle("hidden", !isFeatured);
        if (costEl) costEl.textContent = `${cost} COINS`;
      } else {
        const overlay = card.querySelector(".card-lock-overlay");
        if (overlay) overlay.classList.add("hidden");
      }

      updatePlayButton(card, !unlocked);
    });
    renderNextUnlock(state);
  }

  function getNextUnlockTarget(state) {
    const locked = [];
    document.querySelectorAll(".game-card[data-game-id]").forEach((card) => {
      const gameId = card.dataset.gameId;
      if (state.unlockedGames.includes(gameId)) return;
      locked.push({
        gameId,
        title: card.querySelector(".card-title")?.textContent?.trim() || gameId,
        cost: getGameCost(card),
        rarity: card.dataset.rarity || "common",
        featured: gameId === FEATURED_GAME_ID
      });
    });
    if (locked.length === 0) return null;

    const featured = locked.find((game) => game.featured);
    if (featured) return featured;

    locked.sort((a, b) => a.cost - b.cost);
    const affordable = locked.find((game) => game.cost <= state.coins);
    return affordable || locked[0];
  }

  function renderNextUnlock(state) {
    const el = document.getElementById("nextUnlock");
    if (!el) return;

    const next = getNextUnlockTarget(state);
    if (!next) {
      el.textContent = "All games unlocked";
      el.className = "next-unlock all-unlocked";
      return;
    }

    const rarity = next.featured
      ? "FEATURED"
      : (RARITY_LABEL[next.rarity] || RARITY_LABEL.common);
    const coinsNeeded = Math.max(0, next.cost - state.coins);
    el.className = "next-unlock" + (next.featured ? " next-unlock-featured" : "");

    if (coinsNeeded === 0) {
      el.innerHTML = `Next unlock: <strong>${next.title}</strong> · ${next.cost} coins · ${rarity}`;
    } else {
      el.innerHTML = `Next: <strong>${next.title}</strong> · ${next.cost} coins · ${rarity} · need ${coinsNeeded} more`;
    }
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

      const dismissValue = showCancel ? false : true;

      const close = (value) => {
        overlay.classList.add("hidden");
        document.body.classList.remove("modal-open");
        okBtn.removeEventListener("click", okHandler);
        cancelBtn.removeEventListener("click", cancelHandler);
        overlay.removeEventListener("click", overlayHandler);
        document.removeEventListener("keydown", keyHandler);
        resolve(value);
      };

      const okHandler = () => close(true);
      const cancelHandler = () => close(false);
      const overlayHandler = (event) => {
        if (event.target === overlay) close(dismissValue);
      };
      const keyHandler = (event) => {
        if (event.key === "Escape") close(dismissValue);
      };

      okBtn.addEventListener("click", okHandler);
      cancelBtn.addEventListener("click", cancelHandler);
      overlay.addEventListener("click", overlayHandler);
      document.addEventListener("keydown", keyHandler);
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
      hapticSuccess();
      showInfoModal(
        "Welcome Bonus",
        `You received ${FIRST_LAUNCH_REWARD} coins. Four games are free — play them to earn more. Your first goal: unlock NEON SIEGE for ${FEATURED_UNLOCK_COST} coins.`
      );
    }, 200);
  }

  renderProfile(playerState);
  renderGameLocks(playerState);
  showExitRewardToast();

  window.addEventListener("arcade-hub-visible", () => {
    playerState = loadPlayerState();
    renderProfile(playerState);
    renderGameLocks(playerState);
    showExitRewardToast();
  });

  const devCoinsBtn = document.getElementById("devCoinsBtn");
  if (devCoinsBtn) {
    devCoinsBtn.addEventListener("click", () => {
      const reward = 1000;
      playerState.coins += reward;
      savePlayerState(playerState);
      renderProfile(playerState);
      renderGameLocks(playerState);
      animateCoins();
      hapticSuccess();
      logEvent("dev_test_coins", { reward, coins: playerState.coins });
    });
  }

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
          hapticError();
          await showInfoModal("Not enough coins", `You need ${unlockCost} coins, you have ${playerState.coins}.`);
          return;
        }

        const rarityLabel = gameId === FEATURED_GAME_ID
          ? "FEATURED INTRO"
          : (RARITY_LABEL[card.dataset.rarity] || RARITY_LABEL.common);
        const confirmUnlock = await showConfirmModal(
          "Unlock game",
          `Unlock ${card.querySelector(".card-title")?.textContent?.trim() || "this game"} for ${unlockCost} coins?\nRarity: ${rarityLabel}`
        );
        if (!confirmUnlock) return;

        playerState.coins -= unlockCost;
        playerState.unlockedGames.push(gameId);
        playerState.unlockedGames = Array.from(new Set(playerState.unlockedGames));
        renderProfile(playerState);
        renderGameLocks(playerState);
        savePlayerState(playerState);
        animateCoins();
        animateUnlock(card);
        hapticSuccess();
        logEvent("unlock_success", { gameId, unlockCost, coins: playerState.coins });
      }
    });
  });
})();
