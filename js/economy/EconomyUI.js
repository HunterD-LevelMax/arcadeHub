/**
 * Hub economy UI — profile, locks, unlock flow.
 */
(function () {
  'use strict';

  class EconomyUI {
    constructor() {
      const api = window.ArcadeEconomy;
      this.EXIT_REWARD_KEY = api.EXIT_REWARD_KEY;
      this.FIRST_LAUNCH_REWARD = api.FIRST_LAUNCH_REWARD;
      this.FEATURED_GAME_ID = api.FEATURED_GAME_ID;
      this.FEATURED_UNLOCK_COST = api.FEATURED_UNLOCK_COST;
      this.RARITY_LABEL = api.RARITY_LABEL;
      this.logEvent = api.logEvent;
      this.loadPlayerState = api.loadPlayerState;
      this.savePlayerState = api.savePlayerState;
      this.modal = new window.ArcadeModal();
      this.playerState = this.loadPlayerState();
    }

    getGameCost(card) {
      const gameId = card.dataset.gameId;
      const rarity = card.dataset.rarity || 'common';
      return window.ArcadeEconomy.getGameUnlockCost(gameId, rarity);
    }

    animateCoins() {
      const coinsEl = document.getElementById('playerCoins');
      if (!coinsEl) return;
      coinsEl.classList.remove('coin-pop');
      void coinsEl.offsetWidth;
      coinsEl.classList.add('coin-pop');
    }

    showExitRewardToast() {
      let data;
      try {
        const raw = sessionStorage.getItem(this.EXIT_REWARD_KEY);
        if (!raw) return;
        sessionStorage.removeItem(this.EXIT_REWARD_KEY);
        data = JSON.parse(raw);
      } catch (_e) {
        return;
      }
      if (!data || !Number.isFinite(data.earned) || data.earned <= 0) return;

      this.playerState = this.loadPlayerState();
      this.renderProfile(this.playerState);
      this.renderGameLocks(this.playerState);
      this.animateCoins();
      hapticSuccess();
      if (window.ArcadeAudio && typeof window.ArcadeAudio.play === 'function') {
        window.ArcadeAudio.play('ui.coin', { volume: 0.5 });
      }

      const toast = document.createElement('div');
      toast.className = 'exit-reward-toast';
      toast.textContent = `+${data.earned} coins saved from your last session`;
      document.body.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('visible'));
      setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
      }, 3200);
    }

    animateUnlock(card) {
      card.classList.remove('unlock-flash');
      void card.offsetWidth;
      card.classList.add('unlock-flash');
    }

    renderProfile(state) {
      const nameEl = document.getElementById('playerName');
      const coinsEl = document.getElementById('playerCoins');
      const nameText = nameEl?.querySelector('.profile-text');
      const coinsText = coinsEl?.querySelector('.profile-text');
      if (nameText) nameText.textContent = state.playerName;
      if (coinsText) coinsText.textContent = `Coins: ${state.coins}`;
      this.renderNextUnlock(state);
    }

    ensureLockOverlay(card) {
      let overlay = card.querySelector('.card-lock-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'card-lock-overlay';
        overlay.setAttribute('aria-hidden', 'true');
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
        const preview = card.querySelector('.card-preview');
        if (preview) preview.appendChild(overlay);
        else card.appendChild(overlay);
      }
      return overlay;
    }

    updatePlayButton(card, locked) {
      const playBtn = card.querySelector('.play-btn');
      if (!playBtn) return;
      if (locked) {
        playBtn.classList.add('play-btn-locked');
        playBtn.innerHTML =
          '<span class="material-symbols-outlined" aria-hidden="true">lock</span>UNLOCK';
      } else {
        playBtn.classList.remove('play-btn-locked');
        playBtn.innerHTML =
          '<span class="material-symbols-outlined" aria-hidden="true">play_arrow</span>PLAY';
      }
    }

    renderGameLocks(state) {
      document.querySelectorAll('.game-card[data-game-id]').forEach((card) => {
        const gameId = card.dataset.gameId;
        const rarity = card.dataset.rarity || 'common';
        const unlocked = state.unlockedGames.includes(gameId);
        const cost = this.getGameCost(card);
        card.dataset.unlockCost = String(cost);
        card.dataset.unlockRarity = this.RARITY_LABEL[rarity] || this.RARITY_LABEL.common;
        card.classList.toggle('locked', !unlocked);

        if (!unlocked) {
          const overlay = this.ensureLockOverlay(card);
          overlay.classList.remove('hidden');
          const rarityEl = overlay.querySelector('.card-lock-rarity');
          const featuredEl = overlay.querySelector('.card-lock-featured');
          const costEl = overlay.querySelector('.card-lock-cost');
          const isFeatured = gameId === this.FEATURED_GAME_ID;
          if (rarityEl) {
            rarityEl.textContent = isFeatured
              ? 'INTRO OFFER'
              : this.RARITY_LABEL[rarity] || this.RARITY_LABEL.common;
          }
          if (featuredEl) featuredEl.classList.toggle('hidden', !isFeatured);
          if (costEl) costEl.textContent = `${cost} COINS`;
        } else {
          const overlay = card.querySelector('.card-lock-overlay');
          if (overlay) overlay.classList.add('hidden');
        }

        this.updatePlayButton(card, !unlocked);
      });
      this.renderNextUnlock(state);
    }

    getNextUnlockTarget(state) {
      const locked = [];
      document.querySelectorAll('.game-card[data-game-id]').forEach((card) => {
        const gameId = card.dataset.gameId;
        if (state.unlockedGames.includes(gameId)) return;
        locked.push({
          gameId,
          title: card.querySelector('.card-title')?.textContent?.trim() || gameId,
          cost: this.getGameCost(card),
          rarity: card.dataset.rarity || 'common',
          featured: gameId === this.FEATURED_GAME_ID,
        });
      });
      if (locked.length === 0) return null;

      const featured = locked.find((game) => game.featured);
      if (featured) return featured;

      locked.sort((a, b) => a.cost - b.cost);
      const affordable = locked.find((game) => game.cost <= state.coins);
      return affordable || locked[0];
    }

    renderNextUnlock(state) {
      const el = document.getElementById('nextUnlock');
      if (!el) return;

      const next = this.getNextUnlockTarget(state);
      if (!next) {
        el.textContent = 'All games unlocked';
        el.className = 'next-unlock all-unlocked';
        return;
      }

      const rarity = next.featured
        ? 'FEATURED'
        : this.RARITY_LABEL[next.rarity] || this.RARITY_LABEL.common;
      const coinsNeeded = Math.max(0, next.cost - state.coins);
      el.className = 'next-unlock' + (next.featured ? ' next-unlock-featured' : '');

      if (coinsNeeded === 0) {
        el.innerHTML = `Next unlock: <strong>${next.title}</strong> · ${next.cost} coins · ${rarity}`;
      } else {
        el.innerHTML = `Next: <strong>${next.title}</strong> · ${next.cost} coins · ${rarity} · need ${coinsNeeded} more`;
      }
    }

    handleFirstLaunch() {
      if (this.playerState.firstLaunchRewarded) return;

      this.playerState.coins += this.FIRST_LAUNCH_REWARD;
      this.playerState.firstLaunchRewarded = true;
      this.savePlayerState(this.playerState);
      this.logEvent('first_launch_reward', {
        reward: this.FIRST_LAUNCH_REWARD,
        coins: this.playerState.coins,
      });
      setTimeout(() => {
        hapticSuccess();
        this.modal.showInfo(
          'Welcome Bonus',
          `You received ${this.FIRST_LAUNCH_REWARD} coins. Four games are free — play them to earn more. Your first goal: unlock NEON SIEGE for ${this.FEATURED_UNLOCK_COST} coins.`
        );
      }, 200);
    }

    bindDevCoins() {
      const devCoinsBtn = document.getElementById('devCoinsBtn');
      if (!devCoinsBtn) return;

      devCoinsBtn.addEventListener('click', () => {
        const reward = 1000;
        this.playerState.coins += reward;
        this.savePlayerState(this.playerState);
        this.renderProfile(this.playerState);
        this.renderGameLocks(this.playerState);
        this.animateCoins();
        hapticSuccess();
        this.logEvent('dev_test_coins', { reward, coins: this.playerState.coins });
      });
    }

    bindUnlockHandlers() {
      document.querySelectorAll('.game-card[data-game-id]').forEach((card) => {
        card.addEventListener('click', async (event) => {
          const gameId = card.dataset.gameId;
          const isUnlocked = this.playerState.unlockedGames.includes(gameId);
          const unlockCost = this.getGameCost(card);

          if (!isUnlocked) {
            event.preventDefault();
            if (this.playerState.coins < unlockCost) {
              this.logEvent('unlock_failed_insufficient_coins', {
                gameId,
                unlockCost,
                coins: this.playerState.coins,
              });
              hapticError();
              await this.modal.showInfo(
                'Not enough coins',
                `You need ${unlockCost} coins, you have ${this.playerState.coins}.`
              );
              return;
            }

            const rarityLabel =
              gameId === this.FEATURED_GAME_ID
                ? 'FEATURED INTRO'
                : this.RARITY_LABEL[card.dataset.rarity] || this.RARITY_LABEL.common;
            const confirmUnlock = await this.modal.showConfirm(
              'Unlock game',
              `Unlock ${card.querySelector('.card-title')?.textContent?.trim() || 'this game'} for ${unlockCost} coins?\nRarity: ${rarityLabel}`
            );
            if (!confirmUnlock) return;

            this.playerState.coins -= unlockCost;
            this.playerState.unlockedGames.push(gameId);
            this.playerState.unlockedGames = Array.from(new Set(this.playerState.unlockedGames));
            this.renderProfile(this.playerState);
            this.renderGameLocks(this.playerState);
            this.savePlayerState(this.playerState);
            this.animateCoins();
            this.animateUnlock(card);
            hapticSuccess();
            this.logEvent('unlock_success', {
              gameId,
              unlockCost,
              coins: this.playerState.coins,
            });
          }
        });
      });
    }

    onHubVisible() {
      this.playerState = this.loadPlayerState();
      this.renderProfile(this.playerState);
      this.renderGameLocks(this.playerState);
      this.showExitRewardToast();
    }

    init() {
      this.handleFirstLaunch();
      this.renderProfile(this.playerState);
      this.renderGameLocks(this.playerState);
      this.showExitRewardToast();
      this.bindDevCoins();
      this.bindUnlockHandlers();

      window.addEventListener('arcade-hub-visible', () => this.onHubVisible());
    }
  }

  window.EconomyUI = EconomyUI;
})();
