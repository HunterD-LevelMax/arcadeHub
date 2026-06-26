(function () {
  const C = window.NeonSiegeConstants;
  const B = window.NeonSiegeBalance;

  class InputController {
    constructor(game) {
      this.game = game;
      this._bind();
    }

    _bind() {
      const g = this.game;

      document.getElementById('startBtn').addEventListener('click', () => g.startPlaying());
      document.getElementById('restartBtn').addEventListener('click', () => g.startPlaying());
      document.getElementById('victoryRetryBtn').addEventListener('click', () => g.startPlaying());
      document.getElementById('endlessBtn').addEventListener('click', () => g.continueEndless());

      document.querySelectorAll('.map-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.map-btn').forEach((b) => b.classList.remove('selected'));
          btn.classList.add('selected');
          g.mapIndex = parseInt(btn.dataset.map, 10);
          const hint = document.getElementById('randomMapHint');
          if (hint) {
            hint.classList.toggle('visible', g.mapIndex === window.NeonSiegeMaps.RANDOM_MAP_INDEX);
          }
        });
      });

      document.querySelectorAll('.tower-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (g.state !== 'playing') return;
          const type = btn.dataset.type;
          if (!B.isTowerUnlocked(type, g.wave + 1)) {
            g.showBarHint('Unlocks wave ' + (B.TOWER_UNLOCK[type] || 1));
            if (typeof hapticError === 'function') hapticError();
            return;
          }
          const cost = B.TOWER_TYPES[type].cost;
          if (!g.economy.canAfford(cost)) {
            const need = cost - Math.floor(g.economy.gold);
            g.showBarHint('Need ' + need + ' more gold for ' + B.TOWER_TYPES[type].name);
            if (typeof hapticError === 'function') hapticError();
            return;
          }
          g.hideBarHint();
          g.selectedTowerType = g.selectedTowerType === type ? null : type;
          g.selectedTower = null;
          g.hoverCell = null;
          g._invalidateSlotTiers();
          g.hideTowerPanel();
          g.updateTowerBar();
        });
      });

      g.ui.waveBtn.addEventListener('click', () => {
        if (g.ui.waveBtn.disabled) return;
        g.startWave({ manual: true });
      });
      g.ui.overchargeBtn.addEventListener('click', () => {
        if (g.overchargeUsed) {
          g.showBarHint('BOOST already used this wave');
          if (typeof hapticError === 'function') hapticError();
          return;
        }
        if (!g.waveActive) {
          g.showBarHint('BOOST works only during an active wave');
          if (typeof hapticError === 'function') hapticError();
          return;
        }
        g.hideBarHint();
        g.activateOvercharge();
      });

      if (g.ui.arsenalBtn) {
        g.ui.arsenalBtn.addEventListener('click', () => g.toggleArsenal());
      }
      const arsenalClose = document.getElementById('arsenalCloseBtn');
      if (arsenalClose) arsenalClose.addEventListener('click', () => {
        if (g.ui.arsenalOverlay) g.ui.arsenalOverlay.classList.add('hidden');
      });
      if (g.ui.arsenalOverlay) {
        g.ui.arsenalOverlay.addEventListener('click', (e) => {
          if (e.target === g.ui.arsenalOverlay) g.ui.arsenalOverlay.classList.add('hidden');
        });
      }
      document.querySelectorAll('[data-strike-buy]').forEach((btn) => {
        btn.addEventListener('click', () => g.buyArsenalStrike(btn.dataset.strikeBuy));
      });
      document.querySelectorAll('[data-tech-buy]').forEach((btn) => {
        btn.addEventListener('click', () => g.buyArsenalTech(btn.dataset.techBuy));
      });
      const strikeCharges = document.getElementById('strikeCharges');
      if (strikeCharges) {
        strikeCharges.addEventListener('click', (e) => {
          const chip = e.target.closest('[data-strike]');
          if (chip) g.armStrike(chip.dataset.strike);
        });
      }
      g.ui.upgradeBtn.addEventListener('click', () => g.upgradeTower());
      g.ui.sellBtn.addEventListener('click', () => g.sellTower());
      if (g.ui.towerStatsBtn) g.ui.towerStatsBtn.addEventListener('click', () => g.toggleTowerStats());
      if (g.ui.speedBtn) g.ui.speedBtn.addEventListener('click', () => g.toggleGameSpeed());

      const codexBtn = document.getElementById('codexBtn');
      const codexClose = document.getElementById('codexCloseBtn');
      if (codexBtn) codexBtn.addEventListener('click', () => g.toggleCodex());
      if (codexClose) codexClose.addEventListener('click', () => g.closeCodex());
      if (g.ui.codexOverlay) {
        g.ui.codexOverlay.addEventListener('click', (e) => {
          if (e.target === g.ui.codexOverlay) g.closeCodex();
        });
      }

      const towerScroll = document.querySelector('.tower-bar-scroll');
      if (towerScroll) {
        towerScroll.addEventListener('wheel', (e) => {
          if (towerScroll.scrollWidth <= towerScroll.clientWidth) return;
          towerScroll.scrollLeft += e.deltaY + e.deltaX;
          e.preventDefault();
        }, { passive: false });
      }

      const updateHover = (e) => {
        if (g.state !== 'playing' || !g.selectedTowerType) {
          g.hoverCell = null;
          g._lastHintCell = '';
          return;
        }
        const cell = window.NeonSiegePath.cellFromPointer(e, g.canvas, g.metrics);
        g.hoverCell = cell;
        const cellKey = cell ? cell.r + ',' + cell.c : '';
        if (cellKey === g._lastHintCell) return;
        g._lastHintCell = cellKey;
        if (!cell || g.mapGrid[cell.r][cell.c] !== C.CELL_SLOT) {
          g.hideBarHint();
          return;
        }
        const tiers = g._getSlotTiers();
        const info = tiers[cellKey];
        if (info && window.NeonSiegePlacement.TIER_LABELS[info.tier]) {
          g.showBarHint(window.NeonSiegePlacement.TIER_LABELS[info.tier]);
        } else {
          g.hideBarHint();
        }
      };

      g.canvas.addEventListener('pointerdown', (e) => {
        if (g.state !== 'playing') return;
        if (g.ui.codexOverlay && !g.ui.codexOverlay.classList.contains('hidden')) return;
        e.preventDefault();
        g.resize();
        const metrics = g.metrics;
        const rect = g.canvas.getBoundingClientRect();
        const scaleX = g.canvas.width / rect.width;
        const scaleY = g.canvas.height / rect.height;
        const worldX = (e.clientX - rect.left) * scaleX;
        const worldY = (e.clientY - rect.top) * scaleY;

        if (g.arsenal.armedStrike && g.waveActive) {
          g.fireArmedStrike(worldX, worldY);
          return;
        }

        const cell = window.NeonSiegePath.cellFromPointer(e, g.canvas, g.metrics);
        if (!cell) return;
        if (g.selectedTowerType) {
          g.hoverCell = cell;
          g.tryPlaceTower(cell.r, cell.c, g.selectedTowerType);
        } else {
          const tower = g.towers.find((t) => t.r === cell.r && t.c === cell.c);
          if (tower) {
            if (g.selectedTower && g.selectedTower.id === tower.id) g.hideTowerPanel();
            else g.selectTower(tower);
          } else {
            g.hideTowerPanel();
          }
        }
      });

      g.canvas.addEventListener('pointermove', updateHover);
      g.canvas.addEventListener('pointerleave', () => { g.hoverCell = null; });
      g.canvas.addEventListener('pointercancel', () => { g.hoverCell = null; });

      document.addEventListener('keydown', (e) => {
        if (g.state === 'title') return;
        const idx = C.KEYS.TOWERS.indexOf(e.code);
        if (idx >= 0 && g.state === 'playing') {
          const type = C.TOWER_ORDER[idx];
          g.selectedTowerType = g.selectedTowerType === type ? null : type;
          g._invalidateSlotTiers();
          g.hideTowerPanel();
          g.updateTowerBar();
          e.preventDefault();
        }
        if (C.KEYS.WAVE.includes(e.code) && g.state === 'playing') {
          g.startWave({ manual: true });
          e.preventDefault();
        }
        if (C.KEYS.CANCEL.includes(e.code)) {
          if (g.ui.codexOverlay && !g.ui.codexOverlay.classList.contains('hidden')) {
            g.closeCodex();
          } else if (g.arsenal.armedStrike) {
            g.arsenal.disarmStrike();
            g._updateStrikeCharges();
          } else {
            g.selectedTowerType = null;
            g.hideTowerPanel();
            g.updateTowerBar();
          }
          e.preventDefault();
        }
        if (e.code === 'KeyH' && g.state === 'playing') {
          g.toggleCodex();
          e.preventDefault();
        }
      });
    }
  }

  window.NeonSiegeInput = { InputController };
})();
