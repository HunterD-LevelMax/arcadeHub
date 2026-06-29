(function () {
  const C = window.NeonSiegeConstants;
  const B = window.NeonSiegeBalance;
  const Maps = window.NeonSiegeMaps;
  const Path = window.NeonSiegePath;
  const Ent = window.NeonSiegeEntities;
  const Sys = window.NeonSiegeSystems;
  const Render = window.NeonSiegeRender;
  const SPEED_STEPS = [1, 2, 4, 6];

  class NeonSiegeGame {
    constructor(options) {
      this.canvas = options.canvas;
      this.ui = options.ui;
      this.mapIndex = 0;
      this.state = 'title';
      this.score = 0;
      this.best = typeof getHighScore === 'function' ? getHighScore(C.GAME_ID) : 0;
      this.wave = 0;
      this.baseHp = B.BASE_HP_MAX;
      this.endless = false;
      this.waveActive = false;
      this.waveSpawning = false;
      this.spawnQueue = [];
      this.spawnTimer = 0;
      this.spawnIndex = 0;
      this.overchargeTimer = 0;
      this.overchargeUsed = false;
      this.victoryShown = false;
      this.waveIntermissionActive = false;
      this.waveIntermissionMs = 0;
      this.shake = 0;
      this.coreFlash = 0;
      this.hoverCell = null;
      this.selectedTowerType = null;
      this.selectedTower = null;
      this.nextWavePreview = [];
      this.currentWaveModifier = null;
      this.nextWaveModifier = null;
      this.nextWaveQueue = [];
      this.killStreak = 0;
      this.killStreakTimer = 0;

      this.towers = [];
      this.enemies = [];
      this.projectiles = [];
      this.particles = [];
      this.floatingTexts = [];
      this.fxRings = [];
      this.chainFx = [];
      this.screenFlash = null;

      this.waveSystem = new Sys.WaveSystem();
      this.economy = new Sys.EconomySystem();
      this.combat = new Sys.CombatSystem();
      this.arsenal = new Sys.ArsenalSystem();
      this.renderer = new Render.NeonSiegeRenderer(this.canvas);

      Ent.setTechProvider(() => this.arsenal.getTechMods());

      this.mapGrid = [];
      this.pathFinder = null;
      this.metrics = Path.computeGridMetrics(C.BASE_W, C.BASE_H);
      this.barHintTimer = null;
      this._lastGold = B.START_GOLD;
      this._slotTierCache = null;
      this._slotTierCacheKey = '';
      this._lastHintCell = '';
      this._hudScore = -1;
      this._hudGold = -1;
      this._hudWave = '';
      this._hudHp = -1;
      this.gameSpeed = 1;
      this.towerStatsOpen = false;

      new window.NeonSiegeInput.InputController(this);
      this._refreshBestDisplay();
    }

    _loadBest() {
      this.best = typeof getHighScore === 'function' ? getHighScore(C.GAME_ID) : 0;
      return this.best;
    }

    _saveBestIfNeeded() {
      const isNew = this.score > this.best;
      if (isNew) {
        this.best = this.score;
        if (typeof setHighScore === 'function') setHighScore(C.GAME_ID, this.best);
      }
      return isNew;
    }

    _refreshBestDisplay(opts) {
      opts = opts || {};
      const best = this._loadBest();

      if (this.ui.startBestScore) {
        this.ui.startBestScore.textContent = best > 0
          ? 'RECORD: ' + best.toLocaleString()
          : 'NO RECORD YET';
        this.ui.startBestScore.classList.toggle('overlay-best-empty', best <= 0);
        this.ui.startBestScore.classList.remove('overlay-best-new');
      }

      if (this.ui.bestScore) {
        const isNew = !!opts.isNewGameover;
        this.ui.bestScore.textContent = isNew
          ? 'NEW RECORD: ' + best.toLocaleString()
          : 'RECORD: ' + best.toLocaleString();
        this.ui.bestScore.classList.toggle('overlay-best-new', isNew);
        this.ui.bestScore.classList.toggle('overlay-best-empty', best <= 0 && !isNew);
      }

      if (this.ui.victoryBestScore) {
        const isNew = !!opts.isNewVictory;
        this.ui.victoryBestScore.textContent = isNew
          ? 'NEW RECORD: ' + best.toLocaleString()
          : 'RECORD: ' + best.toLocaleString();
        this.ui.victoryBestScore.classList.toggle('overlay-best-new', isNew);
        this.ui.victoryBestScore.classList.toggle('overlay-best-empty', best <= 0 && !isNew);
      }
    }

    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.metrics = Path.computeGridMetrics(rect.width || C.BASE_W, rect.height || C.BASE_H);
      if (this.pathFinder) this.pathFinder.setMetrics(this.metrics);
      if (this.selectedTower) this.positionTowerRadial(this.selectedTower);
    }

    loadMap() {
      if (Maps.isRandomIndex(this.mapIndex)) {
        this.currentMap = Maps.generateRandom();
      } else {
        this.currentMap = Maps.get(this.mapIndex);
      }
      this.mapGrid = Maps.cloneGrid(this.currentMap);
      this.pathFinder = new Path.PathFinder(
        this.mapGrid, this.currentMap.spawn, this.currentMap.goal,
        {
          precomputedRoutes: this.currentMap.routes,
          junctions: this.currentMap.junctions,
        }
      );
      this.pathFinder.setMetrics(this.metrics);
      this._invalidateSlotTiers();
      this._updateMapTitle();
      this._updateRandomMapHint();
    }

    _updateRandomMapHint() {
      const hint = document.getElementById('randomMapHint');
      if (!hint || !Maps.isRandomIndex(this.mapIndex) || !this.currentMap) return;
      const theme = this.currentMap.themeLabel || this.currentMap.templateId || 'MAZE';
      const routes = this.currentMap.routeCount || 1;
      const reward = this.currentMap.rewardMod ? Math.round((this.currentMap.rewardMod - 1) * 100) : 0;
      let text = theme.toUpperCase() + ' · ' + routes + ' route' + (routes > 1 ? 's' : '');
      const slots = this.currentMap.slotCount;
      if (slots) text += ' · ' + slots + ' slots';
      text += ' · arena loops & tower islands · 20–24 sites';
      if (reward > 0) text += ' · +' + reward + '% gold';
      if (this.currentMap.hpMod && this.currentMap.hpMod < 1) {
        text += ' · easier';
      } else if (this.currentMap.hpMod && this.currentMap.hpMod > 1.08) {
        text += ' · harder';
      }
      hint.textContent = text;
      hint.classList.add('visible');
    }

    _updateMapTitle() {
      const title = document.querySelector('.game-title');
      if (!title || !this.currentMap) return;
      if (Maps.isRandomIndex(this.mapIndex)) {
        title.textContent = this.currentMap.name || 'RANDOM';
      } else {
        title.textContent = 'NEON SIEGE';
      }
    }

    init() {
      Ent.resetIds();
      this.loadMap();
      this.economy.reset();
      this.arsenal.reset();
      this.wave = 0;
      this.baseHp = B.BASE_HP_MAX;
      this.endless = false;
      this.waveActive = false;
      this.waveSpawning = false;
      this.spawnQueue = [];
      this.spawnTimer = 0;
      this.spawnIndex = 0;
      this.overchargeTimer = 0;
      this.overchargeUsed = false;
      this.victoryShown = false;
      this.waveIntermissionActive = false;
      this.waveIntermissionMs = 0;
      this.score = 0;
      this.shake = 0;
      this.coreFlash = 0;
      this.selectedTowerType = null;
      this.selectedTower = null;
      this.towers = [];
      this.enemies = [];
      this.projectiles = [];
      this.particles = [];
      this.floatingTexts = [];
      this.fxRings = [];
      this.chainFx = [];
      this.screenFlash = null;
      this.currentWaveModifier = null;
      this.nextWaveModifier = null;
      this.nextWaveQueue = [];
      this.killStreak = 0;
      this.killStreakTimer = 0;
      this._lastGold = B.START_GOLD;
      this._hudScore = -1;
      this._hudGold = -1;
      this._hudWave = '';
      this._hudHp = -1;
      this.gameSpeed = 1;
      this._slotTierCache = null;
      this._slotTierCacheKey = '';
      this._lastHintCell = '';
      this.hideBarHint();
      this.nextWaveModifier = this.waveSystem.rollModifier(2);
      this._refreshNextWaveQueue();
      this.updateHud();
      this.updateTowerBar();
      this.updateWavePreview();
      this.updateStatusBar();
      this.hideTowerPanel();
      this.hideBarHint();
      if (this.ui.speedBtn) {
        this.ui.speedBtn.textContent = '1×';
        this.ui.speedBtn.classList.remove('speed-active');
        this.ui.speedBtn.title = 'Toggle game speed (1× / 2× / 4× / 6×)';
      }
      this._refreshBestDisplay();
    }

    updateHud() {
      const goldNow = Math.floor(this.economy.gold);
      if (goldNow !== this._lastGold && this.ui.hpDisplay) {
        const el = document.getElementById('goldVal');
        const wrap = el && el.closest('.stat-display');
        if (wrap) {
          wrap.classList.remove('gold-flash-up', 'gold-flash-down');
          void wrap.offsetWidth;
          wrap.classList.add(goldNow > this._lastGold ? 'gold-flash-up' : 'gold-flash-down');
        }
      }
      this._lastGold = goldNow;

      if (this.score !== this._hudScore) {
        this._hudScore = this.score;
        this.ui.score.textContent = this.score;
      }
      if (goldNow !== this._hudGold) {
        this._hudGold = goldNow;
        this.ui.gold.textContent = goldNow;
      }
      const waveText = this.wave + (this.endless ? '+' : '');
      if (waveText !== this._hudWave) {
        this._hudWave = waveText;
        this.ui.wave.textContent = waveText;
      }
      if (this.baseHp !== this._hudHp) {
        this._hudHp = this.baseHp;
        this.ui.hp.textContent = this.baseHp;
        this.ui.hpDisplay.classList.toggle('hp-low', this.baseHp <= 5);
      }
      this._updateComboGlow();
      this.updateStatusBar();
    }

    _updateComboGlow() {
      if (!this.canvas) return;
      const active = this.state === 'playing' && this.economy.combo > 2 && this.economy.comboTimer > 0;
      this.canvas.classList.toggle('combo-glow', active);
    }

    _rewardMult() {
      let mult = this.currentMap && this.currentMap.rewardMod ? this.currentMap.rewardMod : 1;
      const mod = B.getModifierDef(this.currentWaveModifier);
      if (mod && mod.rewardMult) mult *= mod.rewardMult;
      mult *= B.endlessRewardMult(this.wave, this.endless);
      return mult;
    }

    _modifierHpMult() {
      const mod = B.getModifierDef(this.currentWaveModifier);
      return (mod && mod.hpMult) ? mod.hpMult : 1;
    }

    _modifierSpeedMult() {
      const mod = B.getModifierDef(this.currentWaveModifier);
      return (mod && mod.speedMult) ? mod.speedMult : 1;
    }

    _waveStatusLabel() {
      let label = 'W' + this.wave;
      const mod = B.getModifierDef(this.currentWaveModifier);
      if (mod) label += ' · ' + mod.name;
      if (this.baseHp <= 5) label = 'CRITICAL · ' + label;
      return label;
    }

    updateStatusBar() {
      const bar = this.ui.statusBar;
      const event = this.ui.statusEvent;
      const combo = this.ui.combo;
      if (!bar || !event) return;

      if (this.state !== 'playing') {
        bar.classList.add('hidden');
        event.classList.add('hidden');
        if (combo) combo.classList.add('hidden');
        return;
      }
      bar.classList.remove('hidden');

      if (this.overchargeTimer > 0) {
        const sec = Math.max(1, Math.ceil(this.overchargeTimer / 1000));
        event.textContent = 'BOOST ' + sec + 's';
        event.className = 'status-line status-event status-overcharge';
        event.classList.remove('hidden');
      } else if (this.waveIntermissionActive) {
        const sec = Math.max(1, Math.ceil(this.waveIntermissionMs / 1000));
        const bonus = this._earlyStartBonus();
        event.textContent = bonus > 0 ? 'NEXT ' + sec + 's · +' + bonus + 'g' : 'NEXT ' + sec + 's';
        event.className = 'status-line status-event status-intermission';
        event.classList.remove('hidden');
      } else if (this.waveActive || this.waveSpawning) {
        event.textContent = this._waveStatusLabel();
        event.className = 'status-line status-event ' +
          (this.baseHp <= 5 ? 'status-critical' : 'status-wave-active');
        event.classList.remove('hidden');
      } else if (this.wave === 0) {
        event.textContent = 'READY';
        event.className = 'status-line status-event status-ready';
        event.classList.remove('hidden');
      } else {
        event.classList.add('hidden');
      }

      if (combo) {
        const c = this.economy.combo;
        if (c > 1 && this.economy.comboTimer > 0) {
          combo.textContent = 'x' + c.toFixed(1);
          combo.classList.remove('hidden');
        } else {
          combo.classList.add('hidden');
        }
      }

      this.ui.overchargeBtn.classList.toggle('active-charge', this.overchargeTimer > 0);
    }

    _earlyStartBonus() {
      if (!this.waveIntermissionActive || this.waveIntermissionMs <= 0) return 0;
      return Math.floor(this.waveIntermissionMs / 1000) * C.EARLY_START_GOLD_PER_SEC;
    }

    _invalidateSlotTiers() {
      this._slotTierCache = null;
      this._slotTierCacheKey = '';
    }

    _getSlotTiers() {
      if (!this.selectedTowerType || !this.pathFinder) return {};
      const stats = B.getTowerStats(this.selectedTowerType, 0, this.arsenal.getTechMods());
      const key = this.selectedTowerType + ':' + stats.range.toFixed(2) + ':' + this.towers.length;
      if (this._slotTierCacheKey === key && this._slotTierCache) return this._slotTierCache;
      const occupied = new Set(this.towers.map((t) => t.r + ',' + t.c));
      this._slotTierCache = window.NeonSiegePlacement.computeSlotTiers(
        this.pathFinder, this.mapGrid, stats.range, occupied, this.towers
      );
      this._slotTierCacheKey = key;
      return this._slotTierCache;
    }

    _refreshNextWaveQueue() {
      const nextWave = this.wave + 1;
      const modKey = nextWave <= 1 ? null : this.nextWaveModifier;
      this.nextWaveQueue = this.waveSystem.buildQueue(
        nextWave, this.currentMap, this.endless, modKey
      );
    }

    updateWavePreview() {
      const el = this.ui.wavePreview;
      if (!el) return;
      if (this.waveActive || this.waveSpawning || this.state !== 'playing') {
        el.classList.add('hidden');
        return;
      }
      const nextWave = this.wave + 1;
      const modKey = nextWave <= 1 ? null : this.nextWaveModifier;
      const parts = this.waveSystem.preview(this.nextWaveQueue);
      const modName = modKey ? B.getModifierDef(modKey).name : '';
      const summary = parts.map((p) => p.name.slice(0, 3) + '×' + p.count).join(' ');
      const tips = this.waveSystem.getWaveCounterTips(this.nextWaveQueue, modKey);
      let text = 'W' + nextWave + (modName ? ' ' + modName : '') + ' ' + summary;
      if (tips) text += ' · TIP ' + tips;
      el.textContent = text;
      el.classList.remove('hidden');
    }

    showBarHint(text) {
      const el = this.ui.barHint;
      if (!el) return;
      el.textContent = text;
      el.classList.remove('hidden');
      if (this.barHintTimer) clearTimeout(this.barHintTimer);
      this.barHintTimer = setTimeout(() => this.hideBarHint(), 2200);
    }

    hideBarHint() {
      if (this.barHintTimer) {
        clearTimeout(this.barHintTimer);
        this.barHintTimer = null;
      }
      if (this.ui.barHint) this.ui.barHint.classList.add('hidden');
    }

    updateTowerBar() {
      const nextWave = this.wave + 1;
      document.querySelectorAll('.tower-btn').forEach((btn) => {
        const type = btn.dataset.type;
        const def = B.TOWER_TYPES[type];
        const cost = def.cost;
        const unlocked = B.isTowerUnlocked(type, nextWave);
        const afford = this.economy.canAfford(cost);
        btn.querySelector('.tower-cost').textContent = cost;
        btn.classList.toggle('selected', this.selectedTowerType === type);
        btn.classList.toggle('disabled', !afford || !unlocked);
        btn.classList.toggle('locked', !unlocked);
        if (!unlocked) {
          btn.title = 'Unlocks wave ' + (B.TOWER_UNLOCK[type] || 1);
        } else if (!afford) {
          const need = cost - Math.floor(this.economy.gold);
          btn.title = 'Need ' + need + ' more gold';
        } else {
          btn.title = def.name + ' — ' + cost + 'g';
        }
      });
      const busy = this.waveActive || this.waveSpawning;
      this.ui.waveBtn.disabled = busy;
      if (busy) {
        this.ui.waveBtn.textContent = 'WAVE...';
        this.ui.waveBtn.title = 'Wave in progress';
      } else if (this.waveIntermissionActive) {
        const sec = Math.max(1, Math.ceil(this.waveIntermissionMs / 1000));
        const bonus = this._earlyStartBonus();
        this.ui.waveBtn.textContent = bonus > 0 ? '▶ NOW (+' + bonus + 'g)' : '▶ NOW (' + sec + 's)';
        this.ui.waveBtn.title = bonus > 0
          ? 'Start now for +' + bonus + 'g bonus (' + sec + 's left on timer)'
          : 'Start next wave now (' + sec + 's on timer)';
      } else {
        this.ui.waveBtn.textContent = 'WAVE ▶';
        this.ui.waveBtn.title = 'Start the next wave';
      }
      const boostBlocked = this.overchargeUsed || !this.waveActive;
      this.ui.overchargeBtn.classList.toggle('used', this.overchargeUsed);
      this.ui.overchargeBtn.classList.toggle('action-off', boostBlocked);
      if (this.overchargeUsed) {
        this.ui.overchargeBtn.title = 'BOOST already used this wave';
      } else if (!this.waveActive) {
        this.ui.overchargeBtn.title = 'BOOST — only during an active wave';
      } else {
        this.ui.overchargeBtn.title = 'All towers fire ~70% faster for ' +
          Math.round((C.OVERCHARGE_MS + this.arsenal.getOverchargeBonusMs()) / 1000) +
          's · once per wave';
      }
      this._updateArsenalBar();
      this._updateStrikeCharges();
    }

    _updateStrikeCharges() {
      const el = document.getElementById('strikeCharges');
      if (!el) return;
      const total = this.arsenal.totalStrikeCharges();
      if (total <= 0) {
        el.classList.add('hidden');
        el.innerHTML = '';
        return;
      }
      el.classList.remove('hidden');
      const parts = [];
      Object.keys(B.ARSENAL_STRIKES).forEach((id) => {
        const n = this.arsenal.strikeCharges[id] || 0;
        if (n > 0) parts.push('<span class="strike-chip" data-strike="' + id + '">' +
          B.ARSENAL_STRIKES[id].name + '×' + n + '</span>');
      });
      el.innerHTML = parts.join('');
      el.querySelectorAll('.strike-chip').forEach((chip) => {
        chip.classList.toggle('armed', this.arsenal.armedStrike === chip.dataset.strike);
      });
    }

    _updateArsenalBar() {
      const btn = this.ui.arsenalBtn;
      const overlay = this.ui.arsenalOverlay;
      const panel = this.ui.arsenalPanel;
      if (!btn) return;
      const canOpen = this.waveIntermissionActive && this.state === 'playing';
      btn.classList.toggle('action-off', !canOpen);
      const buyLimit = B.getArsenalBuyLimit(this.wave);
      btn.title = canOpen
        ? 'Open ARSENAL — buy strikes & tech (' + (buyLimit - this.arsenal.intermissionBuys) + ' left)'
        : 'ARSENAL — available between waves';
      if (overlay && !canOpen) overlay.classList.add('hidden');
      if (!panel || (overlay && overlay.classList.contains('hidden'))) return;

      const buysLeft = buyLimit - this.arsenal.intermissionBuys;
      const limitEl = document.getElementById('arsenalBuyLimit');
      if (limitEl) limitEl.textContent = buysLeft + ' purchase' + (buysLeft === 1 ? '' : 's') + ' left';
      const goldEl = document.getElementById('arsenalGold');
      if (goldEl) goldEl.textContent = Math.floor(this.economy.gold) + 'g';

      panel.querySelectorAll('[data-strike-buy]').forEach((el) => {
        const id = el.dataset.strikeBuy;
        const def = B.ARSENAL_STRIKES[id];
        const cost = B.getStrikeCost(id, this.wave);
        const afford = this.economy.canAfford(cost);
        const blocked = buysLeft <= 0;
        el.classList.toggle('disabled', !afford || blocked);
        el.querySelector('.arsenal-cost').textContent = cost + 'g';
        const ownedEl = el.querySelector('.arsenal-owned');
        const owned = this.arsenal.strikeCharges[id] || 0;
        if (ownedEl) ownedEl.textContent = owned > 0 ? 'Owned ×' + owned : '';
      });

      panel.querySelectorAll('[data-tech-buy]').forEach((el) => {
        const id = el.dataset.techBuy;
        const def = B.ARSENAL_TECH[id];
        const stacks = this.arsenal.getTechStacks(id);
        const techMax = B.getTechMaxStacks(id, this.wave);
        const maxed = stacks >= techMax;
        const techCost = B.getTechCost(id, stacks, this.wave);
        const cost = maxed ? 'MAX' : techCost + 'g';
        const afford = maxed || this.economy.canAfford(techCost);
        const blocked = buysLeft <= 0;
        el.classList.toggle('disabled', !afford || blocked || maxed);
        el.classList.toggle('maxed', maxed);
        el.querySelector('.arsenal-cost').textContent = cost;
        const stackEl = el.querySelector('.arsenal-stacks');
        if (stackEl) stackEl.textContent = stacks > 0 ? '×' + stacks + '/' + techMax : '0/' + techMax;
      });
    }

    toggleArsenal() {
      if (!this.ui.arsenalOverlay) return;
      if (!this.waveIntermissionActive || this.state !== 'playing') {
        this.showBarHint('ARSENAL opens between waves');
        return;
      }
      this.ui.arsenalOverlay.classList.toggle('hidden');
      this._updateArsenalBar();
    }

    buyArsenalStrike(id) {
      if (!this.waveIntermissionActive) return;
      if (this.arsenal.buyStrike(id, this.economy, this.wave)) {
        if (typeof hapticSuccess === 'function') hapticSuccess();
        if (typeof playSfx === 'function') playSfx('neonsiege.upgrade', { volume: 0.4 });
      } else if (typeof hapticError === 'function') hapticError();
      this._updateArsenalBar();
      this._updateStrikeCharges();
      this.updateHud();
    }

    buyArsenalTech(id) {
      if (!this.waveIntermissionActive) return;
      if (this.arsenal.buyTech(id, this.economy, this.wave)) {
        if (typeof hapticSuccess === 'function') hapticSuccess();
        if (typeof playSfx === 'function') playSfx('neonsiege.upgrade', { volume: 0.4 });
      } else if (typeof hapticError === 'function') hapticError();
      this._updateArsenalBar();
      this.updateHud();
    }

    armStrike(id) {
      if (!this.arsenal.strikeCharges[id]) return;
      if (this.arsenal.armedStrike === id) {
        this.arsenal.disarmStrike();
      } else {
        this.arsenal.armStrike(id);
        this.selectedTowerType = null;
        this.hideTowerPanel();
      }
      this._updateStrikeCharges();
      this.updateTowerBar();
    }

    fireArmedStrike(worldX, worldY) {
      const id = this.arsenal.armedStrike;
      if (!id || !this.waveActive) return false;
      if (!this.arsenal.consumeStrike(id)) return false;
      const fx = this.arsenal.applyStrike(id, worldX, worldY, this);
      if (fx) {
        if (fx.shake) this.shake = Math.max(this.shake, fx.shake);
        if (fx.flash) this.screenFlash = new Ent.ScreenFlash(fx.flash.color, fx.flash.strength, fx.flash.duration);
        (fx.rings || []).forEach((r) => {
          this.fxRings.push(new Ent.RingFx(r.x, r.y, r.color, r.radius, r.duration));
        });
        (fx.particles || []).forEach((p) => {
          this.particles.push(new Ent.Particle(p.x, p.y, p.color, p.n));
        });
      }
      if (typeof hapticHeavy === 'function') hapticHeavy();
      if (typeof playSfx === 'function') playSfx('neonsiege.strike', { volume: 0.5 });
      this._updateStrikeCharges();
      this.updateHud();
      return true;
    }

    hideTowerPanel() {
      this.selectedTower = null;
      this._setTowerStatsOpen(false);
      if (this.ui.towerRadial) this.ui.towerRadial.classList.add('hidden');
    }

    _setTowerStatsOpen(open) {
      this.towerStatsOpen = !!open;
      const popup = this.ui.towerPanelStatsPopup;
      const btn = this.ui.towerStatsBtn;
      if (popup) popup.classList.toggle('hidden', !open);
      if (btn) {
        btn.classList.toggle('tower-panel-active', open);
        btn.title = open ? 'Hide stats' : 'Tower stats';
      }
      if (this.selectedTower) {
        this.positionTowerRadial(this.selectedTower);
        requestAnimationFrame(() => this.positionTowerRadial(this.selectedTower));
      }
    }

    toggleTowerStats() {
      if (!this.selectedTower) return;
      this._setTowerStatsOpen(!this.towerStatsOpen);
      if (typeof hapticTick === 'function') hapticTick();
    }

    _formatTowerStatLines(stats) {
      const lines = [
        'DMG ' + Math.round(stats.damage),
        'RNG ' + stats.range.toFixed(1),
        'SPD ' + stats.fireRate.toFixed(2) + 's',
        'DPS ' + Math.round(stats.damage / stats.fireRate),
      ];
      if (stats.aoe) lines.push('AOE ' + stats.aoe.toFixed(1));
      if (stats.pierce) lines.push('PRC ' + stats.pierce);
      if (stats.chains) lines.push('CHN ' + stats.chains);
      return lines;
    }

    positionTowerRadial(tower) {
      const radial = this.ui.towerRadial;
      if (!radial || !tower) return;
      const pos = this.pathFinder.cellCenter(tower.r, tower.c);
      const panel = radial.querySelector('.tower-panel') || radial;
      const halfW = Math.max(100, (panel.offsetWidth || 200) / 2);
      const panelH = panel.offsetHeight || 88;
      const gap = 8;
      const margin = 6;
      const need = panelH + gap;

      const x = Math.max(halfW, Math.min(this.canvas.width - halfW, pos.x));
      const y = pos.y;
      const spaceAbove = y - margin;
      const spaceBelow = this.canvas.height - y - margin;

      let below = false;
      if (spaceAbove >= need) {
        below = false;
      } else if (spaceBelow >= need) {
        below = true;
      } else {
        below = spaceBelow > spaceAbove;
      }

      radial.classList.toggle('tower-radial-below', below);
      radial.style.left = (x / this.canvas.width) * 100 + '%';
      radial.style.top = (y / this.canvas.height) * 100 + '%';
    }

    selectTower(tower) {
      const keepStatsOpen = this.towerStatsOpen &&
        this.selectedTower && this.selectedTower.id === tower.id;
      this.selectedTower = tower;
      this.selectedTowerType = null;
      this.updateTowerBar();
      const def = B.TOWER_TYPES[tower.type];
      const upCost = tower.upgradeCost(this.wave);
      const radial = this.ui.towerRadial;
      if (!radial) return;

      radial.style.setProperty('--tower-color', def.color);
      this.ui.towerPanelInfo.textContent = def.name + ' L' + (tower.tier + 1);
      this._updateTowerRadialStats(tower);
      this._setTowerStatsOpen(keepStatsOpen);
      this.ui.upgradeLabel.textContent = upCost ? String(upCost) : 'MAX';
      this.ui.sellLabel.textContent = String(tower.sellValue(this.arsenal.getSellBonus()));
      if (upCost) {
        this.ui.upgradeBtn.title = 'Upgrade for ' + upCost + 'g';
      } else if (this.wave < B.LATE_UPGRADE_WAVE && tower.tier >= B.MAX_TOWER_TIER) {
        this.ui.upgradeBtn.title = 'T' + (B.LATE_MAX_TOWER_TIER + 1) + ' unlocks at wave ' + B.LATE_UPGRADE_WAVE;
      } else if (this.wave < B.MEGA_UPGRADE_WAVE && tower.tier >= B.LATE_MAX_TOWER_TIER) {
        this.ui.upgradeBtn.title = 'T' + (B.MEGA_MAX_TOWER_TIER + 1) + ' unlocks at wave ' + B.MEGA_UPGRADE_WAVE;
      } else {
        this.ui.upgradeBtn.title = 'Max tier';
      }
      this.ui.sellBtn.title = 'Sell for ' + tower.sellValue(this.arsenal.getSellBonus()) + 'g';
      this.ui.upgradeBtn.disabled = !upCost || !this.economy.canAfford(upCost);
      this.ui.upgradeBtn.classList.toggle('tower-panel-maxed', !upCost);
      this.positionTowerRadial(tower);
      radial.classList.remove('hidden');
      requestAnimationFrame(() => this.positionTowerRadial(tower));
    }

    _updateTowerRadialStats(tower) {
      const el = this.ui.towerPanelStats;
      if (!el) return;
      const stats = tower.stats;
      const lines = this._formatTowerStatLines(stats);
      const upCost = tower.upgradeCost(this.wave);
      if (upCost) {
        const next = B.getTowerStats(tower.type, tower.tier + 1, this.arsenal.getTechMods());
        lines.push('—');
        lines.push('NEXT ↑');
        lines.push.apply(lines, this._formatTowerStatLines(next));
      }
      el.textContent = lines.join('\n');
    }

    toggleGameSpeed() {
      if (this.state !== 'playing') return;
      const idx = SPEED_STEPS.indexOf(this.gameSpeed);
      this.gameSpeed = SPEED_STEPS[(idx + 1) % SPEED_STEPS.length];
      if (this.ui.speedBtn) {
        this.ui.speedBtn.textContent = this.gameSpeed + '×';
        this.ui.speedBtn.classList.toggle('speed-active', this.gameSpeed > 1);
        this.ui.speedBtn.title = 'Toggle game speed (1× / 2× / 4× / 6×)';
      }
      if (typeof hapticTick === 'function') hapticTick();
    }

    tryPlaceTower(r, c, type) {
      if (this.mapGrid[r][c] !== C.CELL_SLOT) { if (typeof hapticError === 'function') hapticError(); return; }
      if (this.towers.some((t) => t.r === r && t.c === c)) { if (typeof hapticError === 'function') hapticError(); return; }
      if (!B.isTowerUnlocked(type, this.wave + 1)) {
        this.showBarHint('Unlocks wave ' + (B.TOWER_UNLOCK[type] || 1));
        if (typeof hapticError === 'function') hapticError();
        return;
      }
      const cost = B.TOWER_TYPES[type].cost;
      if (!this.economy.spend(cost)) {
        const need = cost - Math.floor(this.economy.gold);
        this.showBarHint('Need ' + need + ' more gold');
        if (typeof hapticError === 'function') hapticError();
        return;
      }
      this.towers.push(new Ent.Tower(type, r, c));
      if (typeof hapticTick === 'function') hapticTick();
      if (typeof playSfx === 'function') playSfx('neonsiege.build', { volume: 0.5 });
      const pos = this.pathFinder.cellCenter(r, c);
      this.particles.push(new Ent.Particle(pos.x, pos.y, B.TOWER_TYPES[type].color, 8));
      this.fxRings.push(new Ent.RingFx(pos.x, pos.y, B.TOWER_TYPES[type].color, this.metrics.cellSize * 0.55, 0.45));
      this.selectedTowerType = null;
      this._invalidateSlotTiers();
      this.updateTowerBar();
      this.updateHud();
    }

    upgradeTower() {
      const tower = this.selectedTower;
      if (!tower) return;
      const cost = tower.upgradeCost(this.wave);
      if (!cost || !this.economy.spend(cost)) { if (typeof hapticError === 'function') hapticError(); return; }
      tower.totalSpent += cost;
      tower.tier++;
      if (typeof hapticSuccess === 'function') hapticSuccess();
      if (typeof playSfx === 'function') playSfx('neonsiege.upgrade');
      const pos = this.pathFinder.cellCenter(tower.r, tower.c);
      this.particles.push(new Ent.Particle(pos.x, pos.y, B.TOWER_TYPES[tower.type].color, 10));
      this.selectTower(tower);
      this.updateHud();
    }

    sellTower() {
      const tower = this.selectedTower;
      if (!tower) return;
      this.economy.addGold(tower.sellValue(this.arsenal.getSellBonus()));
      this.towers = this.towers.filter((t) => t.id !== tower.id);
      this._invalidateSlotTiers();
      if (typeof hapticTick === 'function') hapticTick();
      this.hideTowerPanel();
      this.updateHud();
      this.updateTowerBar();
    }

    startWave(opts) {
      opts = opts || {};
      if (this.state !== 'playing' || this.waveActive || this.waveSpawning) return;
      let earlyBonus = 0;
      if (opts.manual && this.waveIntermissionActive && this.waveIntermissionMs > 0) {
        earlyBonus = this._earlyStartBonus();
      }
      this.waveIntermissionActive = false;
      this.waveIntermissionMs = 0;
      this.wave++;
      this.waveActive = true;
      if (this.selectedTower) this.selectTower(this.selectedTower);
      this.waveSpawning = true;
      this.currentWaveModifier = this.wave > 1 ? this.nextWaveModifier : null;
      this.nextWaveModifier = this.waveSystem.rollModifier(this.wave + 1);
      this._refreshNextWaveQueue();
      this.overchargeUsed = false;
      this.arsenal.disarmStrike();
      this.spawnQueue = this.waveSystem.buildQueue(
        this.wave, this.currentMap, this.endless, this.currentWaveModifier
      );
      this.spawnTimer = 0.3;
      this.spawnIndex = 0;
      if (earlyBonus > 0) {
        this.economy.addGold(earlyBonus);
        const cx = this.metrics.offsetX + (C.GRID_COLS * this.metrics.cellSize) / 2;
        const cy = this.metrics.offsetY + (C.GRID_ROWS * this.metrics.cellSize) / 2;
        this.floatingTexts.push(new Ent.FloatingText(cx, cy, '+' + earlyBonus + 'g', '#ffcc00', true));
      }
      if (typeof hapticMedium === 'function') hapticMedium();
      if (typeof playSfx === 'function') playSfx('neonsiege.wave', { volume: 0.6 });
      this.updateTowerBar();
      this.updateHud();
      this.updateWavePreview();
    }

    activateOvercharge() {
      if (this.state !== 'playing' || this.overchargeUsed || !this.waveActive) return;
      this.overchargeTimer = C.OVERCHARGE_MS + this.arsenal.getOverchargeBonusMs();
      this.overchargeUsed = true;
      this.towers.forEach((tower) => {
        const pos = this.pathFinder.cellCenter(tower.r, tower.c);
        const def = B.TOWER_TYPES[tower.type];
        this.fxRings.push(new Ent.RingFx(
          pos.x, pos.y, def.color, this.metrics.cellSize * 0.5, 0.45
        ));
      });
      if (typeof hapticMedium === 'function') hapticMedium();
      this.updateTowerBar();
      this.updateStatusBar();
    }

    _hpMult() {
      return B.hpScale(this.wave, this.currentMap.hpMod, this.endless, C.MAX_WAVES) * this._modifierHpMult();
    }

    _spawnEnemy(entry) {
      const typeKey = typeof entry === 'string' ? entry : entry.type;
      const elite = entry && entry.elite;
      const spawnIdx = this.spawnIndex++;
      const lane = 0;
      const routeId = this.pathFinder.pickRoute(spawnIdx, this.wave);
      const enemy = new Ent.Enemy(typeKey, this._hpMult(), this.pathFinder, lane, spawnIdx, {
        elite,
        routeId,
        speedMult: this._modifierSpeedMult() * B.speedScale(this.wave, this.endless, C.MAX_WAVES),
      });
      if (!elite && typeKey !== 'boss' && this.wave >= 7 && Math.random() < B.eliteSpawnChance(this.wave)) {
        enemy.makeElite();
      }
      this.enemies.push(enemy);

      if (typeKey === 'boss') {
        const spawn = this.pathFinder.waypointPixels[0];
        if (spawn) {
          this.fxRings.push(new Ent.RingFx(
            spawn.x, spawn.y, '#ff3344', this.metrics.cellSize * 2.2, 0.8
          ));
          this.floatingTexts.push(new Ent.FloatingText(spawn.x, spawn.y - 24, 'BOSS', '#ff3344', true));
        }
      }
    }

    _onEnemyHit(enemy, damage, slowOpts, shattered) {
      if (enemy.inTunnel) return;
      if (shattered) {
        this.particles.push(new Ent.Particle(enemy.x, enemy.y, '#88ddff', 6));
      }
      const wasHp = enemy.hp;
      if (enemy.takeDamage(damage, slowOpts)) {
        this._removeEnemy(enemy, true);
        return;
      }
      if (enemy.type === 'boss' && enemy.hp < wasHp) {
        this._checkBossPhases(enemy);
      }
    }

    _checkBossPhases(boss) {
      const phases = B.BOSS_PHASES;
      const hpPct = boss.hp / boss.maxHp;
      while (boss.bossPhases < phases.length && hpPct <= phases[boss.bossPhases].hpPct) {
        this._triggerBossPhase(boss, phases[boss.bossPhases].action);
        boss.bossPhases++;
      }
    }

    _triggerBossPhase(boss, action) {
      if (action === 'shield') {
        const pulse = boss.maxHp * B.BOSS_SHIELD_PULSE;
        boss.shield = Math.max(boss.shield, pulse);
        boss.maxShield = Math.max(boss.maxShield, boss.shield);
        this.fxRings.push(new Ent.RingFx(
          boss.x, boss.y, '#00f5ff', this.metrics.cellSize * 1.4, 0.55
        ));
        this.floatingTexts.push(new Ent.FloatingText(boss.x, boss.y - 40, 'SHIELD PULSE', '#00f5ff', true));
      } else if (action === 'escort') {
        for (let i = 0; i < B.BOSS_ESCORT_COUNT; i++) {
          const child = new Ent.Enemy(
            'drone', this.currentMap.hpMod * 0.45, this.pathFinder,
            0, this.spawnIndex++,
            { speedMult: this._modifierSpeedMult(), routeId: boss.routeId }
          );
          const back = this.pathFinder.forRoute(boss.routeId)
            .offsetByCells(boss.pathIndex, boss.segT, -0.35 * (i + 1));
          child.pathIndex = back.pathIndex;
          child.segT = back.segT;
          const pos = this.pathFinder.forRoute(child.routeId).positionAt(child.pathIndex, child.segT, 0);
          child.x = pos.x;
          child.y = pos.y;
          child._pathDistPx = this.pathFinder.forRoute(child.routeId)
            .distanceAt(child.pathIndex, child.segT);
          this.enemies.push(child);
        }
        this.floatingTexts.push(new Ent.FloatingText(boss.x, boss.y - 40, 'ESCORT', '#ff6688', true));
        this.particles.push(new Ent.Particle(boss.x, boss.y, '#ff6688', 10));
      }
    }

    _registerKillStreak(x, y) {
      this.killStreakTimer = B.KILL_STREAK_WINDOW_MS;
      this.killStreak++;
      let label = null;
      if (this.killStreak === 3) label = 'MULTI';
      else if (this.killStreak === 5) label = 'RAMPAGE';
      else if (this.killStreak === 8) label = 'OVERRIDE';
      if (label) {
        this.floatingTexts.push(new Ent.FloatingText(x, y - 36, label, '#39ff14', true));
      }
    }

    _removeEnemy(enemy, killed) {
      this.enemies = this.enemies.filter((e) => e.id !== enemy.id);
      if (!killed) return;

      const killResult = this.economy.onKill(
        enemy.reward, enemy.score, (amt) => { this.score += amt; },
        { rewardMult: this._rewardMult() }
      );
      const comboTag = killResult.combo > 1.05 ? ' x' + killResult.combo.toFixed(1) : '';
      const goldText = '+' + killResult.goldGain + 'g' + comboTag;
      const color = enemy.elite ? '#ffcc00' : B.ENEMY_TYPES[enemy.type].color;
      this.floatingTexts.push(new Ent.FloatingText(enemy.x, enemy.y - 12, goldText, color, enemy.elite));
      this.particles.push(new Ent.Particle(
        enemy.x, enemy.y, enemy.elite ? '#ffcc00' : B.ENEMY_TYPES[enemy.type].color,
        enemy.elite ? 14 : 10
      ));
      this.fxRings.push(new Ent.RingFx(
        enemy.x, enemy.y, color, this.metrics.cellSize * (enemy.elite ? 0.55 : 0.4), 0.3
      ));
      this._registerKillStreak(enemy.x, enemy.y);
      this._triggerCryptNova(enemy.x, enemy.y);
      if (typeof hapticTick === 'function') hapticTick();
      if (typeof playSfx === 'function') playSfx('neonsiege.hit', { volume: 0.3 });
      if (enemy.split) {
        const hpMult = this.currentMap.hpMod * B.SPLIT_MINI_HP_RATIO;
        for (let i = 0; i < 2; i++) {
          const child = new Ent.Enemy('drone', hpMult, this.pathFinder, 0, this.spawnIndex++, {
            routeId: enemy.routeId,
          });
          const back = this.pathFinder.forRoute(enemy.routeId)
            .offsetByCells(enemy.pathIndex, enemy.segT, -0.3 * (i + 1));
          child.pathIndex = back.pathIndex;
          child.segT = back.segT;
          const pos = this.pathFinder.forRoute(child.routeId).positionAt(child.pathIndex, child.segT, 0);
          child.x = pos.x;
          child.y = pos.y;
          child._pathDistPx = this.pathFinder.forRoute(child.routeId)
            .distanceAt(child.pathIndex, child.segT);
          this.enemies.push(child);
        }
      }
      this.updateHud();
    }

    _triggerCryptNova(x, y) {
      const cs = this.metrics.cellSize;
      for (const tower of this.towers) {
        if (tower.type !== 'crypt') continue;
        const stats = tower.stats;
        const pos = this.pathFinder.cellCenter(tower.r, tower.c);
        const dx = x - pos.x;
        const dy = y - pos.y;
        const rangePx = stats.range * cs;
        if (dx * dx + dy * dy > rangePx * rangePx) continue;
        const novaDmg = stats.damage * (stats.deathNova || 0.4);
        const aoePx = (stats.deathAoe || 1) * cs;
        const rangeSq = aoePx * aoePx;
        for (const other of [...this.enemies]) {
          const ex = other.x - x;
          const ey = other.y - y;
          if (ex * ex + ey * ey <= rangeSq) {
            this._onEnemyHit(other, novaDmg, null, false);
          }
        }
        this.fxRings.push(new Ent.RingFx(x, y, B.TOWER_TYPES.crypt.color, aoePx * 0.85, 0.3));
        break;
      }
    }

    _enemyReachedCore(enemy) {
      this.enemies = this.enemies.filter((e) => e.id !== enemy.id);
      this.baseHp--;
      this.economy.combo = 1;
      this.economy.comboTimer = 0;
      this.coreFlash = 1;
      this.screenFlash = new Ent.ScreenFlash('#ff3344', 0.35, 0.35);
      const goal = this.pathFinder.waypointPixels[this.pathFinder.waypointPixels.length - 1];
      if (goal) {
        this.floatingTexts.push(new Ent.FloatingText(goal.x, goal.y - 20, '-1 CORE', '#ff3344'));
      }
      if (typeof hapticHeavy === 'function') hapticHeavy();
      if (typeof playSfx === 'function') playSfx('neonsiege.coreHit');
      this.updateHud();
      if (this.baseHp <= 0) this.endGame();
    }

    update(dt) {
      if (this.state !== 'playing') return;
      dt *= this.gameSpeed;

      if (this.overchargeTimer > 0) {
        this.overchargeTimer -= dt;
        if (this.overchargeTimer <= 0) {
          this.updateTowerBar();
          this.updateStatusBar();
        }
      }
      this.economy.tickCombo(dt);
      if (this.killStreakTimer > 0) {
        this.killStreakTimer -= dt;
        if (this.killStreakTimer <= 0) this.killStreak = 0;
      }
      if (this.shake > 0) this.shake *= 0.88;
      if (this.coreFlash > 0) this.coreFlash -= dt / 500;

      if (this.waveIntermissionActive) {
        this.waveIntermissionMs -= dt;
        if (this.waveIntermissionMs <= 0) {
          this.waveIntermissionActive = false;
          this.startWave({ manual: false });
        } else {
          this.updateTowerBar();
          this.updateStatusBar();
        }
      }

      if (this.waveSpawning) {
        this.spawnTimer -= dt / 1000;
        if (this.spawnTimer <= 0) {
          if (this.spawnQueue.length === 0) {
            this.waveSpawning = false;
          } else {
            const entry = this.spawnQueue.shift();
            this._spawnEnemy(entry);
            this.spawnTimer = entry.delay;
          }
        }
      }

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        const reached = e.move(dt, this.pathFinder, this.enemies);
        if (reached) this._enemyReachedCore(e);
      }

      const self = this;
      this.combat.updateTowers(
        dt, this.towers, this.enemies, this.pathFinder, this.metrics,
        this.overchargeTimer > 0, this.projectiles,
        {
          onNovaHit(enemy, dmg, shattered) { self._onEnemyHit(enemy, dmg, null, shattered); },
          onFireFx(fx) {
            if (typeof playSfx === 'function') playSfx('neonsiege.shoot', { volume: 0.18 });
            if (fx.shake) self.shake = Math.max(self.shake, fx.shake);
            if (fx.particles) {
              self.particles.push(new Ent.Particle(fx.particles.x, fx.particles.y, fx.particles.color, fx.particles.n));
            }
            if (fx.ring) {
              self.fxRings.push(new Ent.RingFx(
                fx.ring.x, fx.ring.y, fx.ring.color, fx.ring.radius, fx.ring.duration
              ));
            }
            if (fx.chain) {
              self.chainFx.push(new Ent.ChainFx(fx.chain.points, fx.chain.color));
            }
          },
        }
      );

      this.combat.updateProjectiles(dt, this.projectiles, this.enemies, this.metrics, (e, d, s) => {
        self._onEnemyHit(e, d, s, false);
      });

      this.particles = this.particles.filter((p) => p.update(dt));
      this.floatingTexts = this.floatingTexts.filter((ft) => ft.update(dt));
      this.fxRings = this.fxRings.filter((ring) => ring.update(dt));
      this.chainFx = this.chainFx.filter((c) => c.update(dt));
      if (this.screenFlash && !this.screenFlash.update(dt)) this.screenFlash = null;

      this._checkWaveComplete();
      this.updateHud();
      if (this.canvas) {
        this.canvas.classList.toggle('strike-armed', !!this.arsenal.armedStrike);
      }
    }

    _checkWaveComplete() {
      if (!this.waveActive || this.waveSpawning) return;
      if (this.enemies.length > 0) return;
      this.waveActive = false;
      const bonus = this.economy.waveClearBonus(this.wave);
      this.score += bonus.score;
      if (bonus.gold) {
        this.economy.addGold(bonus.gold);
      }
      const goal = this.pathFinder.waypointPixels[this.pathFinder.waypointPixels.length - 1];
      const pathPts = this.pathFinder.waypointPixels;
      for (let i = 0; i < pathPts.length; i += 3) {
        const pt = pathPts[i];
        this.particles.push(new Ent.Particle(pt.x, pt.y, '#ffcc00', 3));
      }
      if (goal) {
        this.fxRings.push(new Ent.RingFx(goal.x, goal.y, '#ffcc00', this.metrics.cellSize * 1.6, 0.7));
        this.floatingTexts.push(new Ent.FloatingText(goal.x, goal.y - 28, 'WAVE CLEAR +' + bonus.gold + 'g', '#ffcc00'));
      }
      this.screenFlash = new Ent.ScreenFlash('#ffcc00', 0.28, 0.4);
      if (typeof hapticSuccess === 'function') hapticSuccess();
      this.updateTowerBar();
      this.updateWavePreview();

      if (!this.endless && this.wave >= C.MAX_WAVES && !this.victoryShown) {
        this._showVictory();
        return;
      }
      this._beginWaveIntermission();
    }

    _beginWaveIntermission() {
      this.waveIntermissionActive = true;
      this.waveIntermissionMs = C.WAVE_INTERMISSION_MS;
      this.arsenal.resetIntermissionBuys();
      this.arsenal.disarmStrike();
      if (this.ui.arsenalOverlay) this.ui.arsenalOverlay.classList.add('hidden');
      if (this.selectedTower) this.selectTower(this.selectedTower);
      this.updateTowerBar();
      this.updateStatusBar();
    }

    openCodex() {
      if (!this.ui.codexOverlay) return;
      this.ui.codexOverlay.classList.remove('hidden');
    }

    closeCodex() {
      if (!this.ui.codexOverlay) return;
      this.ui.codexOverlay.classList.add('hidden');
    }

    toggleCodex() {
      if (!this.ui.codexOverlay) return;
      this.ui.codexOverlay.classList.toggle('hidden');
    }

    _showVictory() {
      this.victoryShown = true;
      this.state = 'victory';
      this.score += 500;
      const isNew = this._saveBestIfNeeded();
      this.ui.victoryScore.textContent = this.score.toLocaleString();
      this._refreshBestDisplay({ isNewVictory: isNew });
      if (typeof awardAndShowCoins === 'function') {
        const reward = awardAndShowCoins(C.GAME_ID, this.score);
        if (reward && window.ArcadeEconomy && window.ArcadeEconomy.renderCoinRewardUI) {
          window.ArcadeEconomy.renderCoinRewardUI(reward, {
            earned: 'victoryCoinEarned',
            total: 'victoryCoinTotal',
            hint: 'victoryCoinHint',
            block: 'victoryCoinBlock',
          });
        }
      }
      this.ui.victoryOverlay.classList.remove('hidden');
      if (typeof hapticSuccess === 'function') hapticSuccess();
      if (typeof playSfx === 'function') playSfx('neonsiege.victory', { volume: 0.65 });
    }

    continueEndless() {
      this.endless = true;
      this.state = 'playing';
      this.ui.victoryOverlay.classList.add('hidden');
      this.updateWavePreview();
    }

    startPlaying() {
      if (typeof unlockAudio === 'function') unlockAudio();
      this.init();
      this.state = 'playing';
      if (typeof beginCoinSession === 'function') {
        beginCoinSession(this.best, C.GAME_ID, () => this.score);
      }
      this.ui.startOverlay.classList.add('hidden');
      this.ui.gameoverOverlay.classList.add('hidden');
      this.ui.victoryOverlay.classList.add('hidden');
      this.resize();
    }

    endGame() {
      if (this.state === 'dead') return;
      this.state = 'dead';
      if (typeof hapticHeavy === 'function') hapticHeavy();
      if (typeof playSfx === 'function') playSfx('neonsiege.gameover', { volume: 0.6 });
      const isNew = this._saveBestIfNeeded();
      this.ui.finalScore.textContent = this.score.toLocaleString();
      this._refreshBestDisplay({ isNewGameover: isNew });
      this.ui.gameoverSub.textContent = 'CORE DESTROYED';
      if (typeof awardAndShowCoins === 'function') awardAndShowCoins(C.GAME_ID, this.score);
      this.ui.gameoverOverlay.classList.remove('hidden');
    }

    draw() {
      const towerOccupancy = new Set(this.towers.map((t) => t.r + ',' + t.c));
      this.renderer.draw({
        state: this.state,
        metrics: this.metrics,
        mapGrid: this.mapGrid,
        pathFinder: this.pathFinder,
        towers: this.towers,
        towerOccupancy,
        enemies: this.enemies,
        projectiles: this.projectiles,
        particles: this.particles,
        floatingTexts: this.floatingTexts,
        selectedTowerType: this.selectedTowerType,
        gold: Math.floor(this.economy.gold),
        selectedTower: this.selectedTower,
        hoverCell: this.hoverCell,
        waveActive: this.waveActive,
        waveSpawning: this.waveSpawning,
        waveIntermissionActive: this.waveIntermissionActive,
        wave: this.wave,
        overchargeTimer: this.overchargeTimer,
        shake: this.shake,
        coreFlash: this.coreFlash,
        fxRings: this.fxRings,
        chainFx: this.chainFx,
        screenFlash: this.screenFlash,
        gameSpeed: this.gameSpeed,
        currentWaveModifier: this.currentWaveModifier,
        baseHp: this.baseHp,
        mapGoal: this.currentMap ? this.currentMap.goal : null,
        mapId: this.currentMap ? this.currentMap.id : null,
        junctions: this.currentMap ? (this.currentMap.junctions || []) : [],
        armedStrike: this.arsenal.armedStrike,
        slotTiers: this._getSlotTiers(),
      });
    }
  }

  window.NeonSiegeGame = NeonSiegeGame;
})();
