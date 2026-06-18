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
        });
      });

      document.querySelectorAll('.tower-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (g.state !== 'playing') return;
          const type = btn.dataset.type;
          g.selectedTowerType = g.selectedTowerType === type ? null : type;
          g.selectedTower = null;
          g.hideTowerPanel();
          g.updateTowerBar();
        });
      });

      g.ui.waveBtn.addEventListener('click', () => g.startWave());
      g.ui.overchargeBtn.addEventListener('click', () => g.activateOvercharge());
      g.ui.upgradeBtn.addEventListener('click', () => g.upgradeTower());
      g.ui.sellBtn.addEventListener('click', () => g.sellTower());
      document.getElementById('closePanelBtn').addEventListener('click', () => g.hideTowerPanel());

      const codexBtn = document.getElementById('codexBtn');
      const codexClose = document.getElementById('codexCloseBtn');
      if (codexBtn) codexBtn.addEventListener('click', () => g.toggleCodex());
      if (codexClose) codexClose.addEventListener('click', () => g.closeCodex());
      if (g.ui.codexOverlay) {
        g.ui.codexOverlay.addEventListener('click', (e) => {
          if (e.target === g.ui.codexOverlay) g.closeCodex();
        });
      }

      g.canvas.addEventListener('pointerdown', (e) => {
        if (g.state !== 'playing') return;
        if (g.ui.codexOverlay && !g.ui.codexOverlay.classList.contains('hidden')) return;
        e.preventDefault();
        g.resize();
        const cell = window.NeonSiegePath.cellFromPointer(e, g.canvas, g.metrics);
        if (!cell) return;
        if (g.selectedTowerType) {
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

      g.canvas.addEventListener('pointermove', (e) => {
        if (g.state !== 'playing' || !g.selectedTowerType) {
          g.hoverCell = null;
          return;
        }
        g.hoverCell = window.NeonSiegePath.cellFromPointer(e, g.canvas, g.metrics);
      });

      document.addEventListener('keydown', (e) => {
        if (g.state === 'title') return;
        const idx = C.KEYS.TOWERS.indexOf(e.code);
        if (idx >= 0 && g.state === 'playing') {
          const type = C.TOWER_ORDER[idx];
          g.selectedTowerType = g.selectedTowerType === type ? null : type;
          g.hideTowerPanel();
          g.updateTowerBar();
          e.preventDefault();
        }
        if (C.KEYS.WAVE.includes(e.code) && g.state === 'playing') {
          g.startWave();
          e.preventDefault();
        }
        if (C.KEYS.CANCEL.includes(e.code)) {
          if (g.ui.codexOverlay && !g.ui.codexOverlay.classList.contains('hidden')) {
            g.closeCodex();
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
