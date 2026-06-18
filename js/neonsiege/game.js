(function () {
  const C = window.NeonSiegeConstants;
  const B = window.NeonSiegeBalance;
  const Maps = window.NeonSiegeMaps;
  const Path = window.NeonSiegePath;
  const Ent = window.NeonSiegeEntities;
  const Sys = window.NeonSiegeSystems;
  const Render = window.NeonSiegeRender;

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
      this.screenFlash = null;

      this.waveSystem = new Sys.WaveSystem();
      this.economy = new Sys.EconomySystem();
      this.combat = new Sys.CombatSystem();
      this.renderer = new Render.NeonSiegeRenderer(this.canvas);

      this.mapGrid = [];
      this.pathFinder = null;
      this.metrics = Path.computeGridMetrics(C.BASE_W, C.BASE_H);

      new window.NeonSiegeInput.InputController(this);
    }

    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.metrics = Path.computeGridMetrics(rect.width || C.BASE_W, rect.height || C.BASE_H);
      if (this.pathFinder) this.pathFinder.setMetrics(this.metrics);
      if (this.selectedTower) this.positionTowerRadial(this.selectedTower);
    }

    loadMap() {
      const mapDef = Maps.get(this.mapIndex);
      this.mapGrid = Maps.cloneGrid(mapDef);
      this.pathFinder = new Path.PathFinder(this.mapGrid, mapDef.spawn, mapDef.goal);
      this.pathFinder.setMetrics(this.metrics);
      this.currentMap = mapDef;
    }

    init() {
      Ent.resetIds();
      this.loadMap();
      this.economy.reset();
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
      this.screenFlash = null;
      this.currentWaveModifier = null;
      this.nextWaveModifier = null;
      this.nextWaveQueue = [];
      this.killStreak = 0;
      this.killStreakTimer = 0;
      this.nextWaveModifier = this.waveSystem.rollModifier(2);
      this._refreshNextWaveQueue();
      this.updateHud();
      this.updateTowerBar();
      this.updateWavePreview();
      this.updateStatusBar();
      this.hideTowerPanel();
    }

    updateHud() {
      this.ui.score.textContent = this.score;
      this.ui.gold.textContent = Math.floor(this.economy.gold);
      this.ui.wave.textContent = this.wave + (this.endless ? '+' : '');
      this.ui.hp.textContent = this.baseHp;
      this.ui.hpDisplay.classList.toggle('hp-low', this.baseHp <= 5);
      this._updateComboGlow();
      this.updateStatusBar();
    }

    _updateComboGlow() {
      if (!this.canvas) return;
      const active = this.state === 'playing' && this.economy.combo > 2 && this.economy.comboTimer > 0;
      this.canvas.classList.toggle('combo-glow', active);
    }

    _rewardMult() {
      const mod = B.getModifierDef(this.currentWaveModifier);
      return (mod && mod.rewardMult) ? mod.rewardMult : 1;
    }

    _modifierHpMult() {
      const mod = B.getModifierDef(this.currentWaveModifier);
      return (mod && mod.hpMult) ? mod.hpMult : 1;
    }

    _modifierSpeedMult() {
      const mod = B.getModifierDef(this.currentWaveModifier);
      return (mod && mod.speedMult) ? mod.speedMult : 1;
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
        event.textContent = 'NEXT ' + sec + 's';
        event.className = 'status-line status-event status-intermission';
        event.classList.remove('hidden');
      } else if (this.waveActive || this.waveSpawning) {
        event.textContent = 'WAVE';
        event.className = 'status-line status-event status-wave-active';
        event.classList.remove('hidden');
      } else if (this.baseHp <= 5 && (this.waveActive || this.waveSpawning)) {
        event.textContent = 'CRITICAL';
        event.className = 'status-line status-event status-critical';
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
      el.textContent = 'W' + nextWave + (modName ? ' ' + modName : '') + ' ' + summary;
      el.classList.remove('hidden');
    }

    updateTowerBar() {
      document.querySelectorAll('.tower-btn').forEach((btn) => {
        const type = btn.dataset.type;
        const cost = B.TOWER_TYPES[type].cost;
        btn.querySelector('.tower-cost').textContent = cost;
        btn.classList.toggle('selected', this.selectedTowerType === type);
        btn.classList.toggle('disabled', !this.economy.canAfford(cost));
      });
      const busy = this.waveActive || this.waveSpawning;
      this.ui.waveBtn.disabled = busy;
      if (busy) {
        this.ui.waveBtn.textContent = 'WAVE...';
      } else if (this.waveIntermissionActive) {
        const sec = Math.max(1, Math.ceil(this.waveIntermissionMs / 1000));
        this.ui.waveBtn.textContent = '▶ NOW (' + sec + 's)';
      } else {
        this.ui.waveBtn.textContent = 'WAVE ▶';
      }
      this.ui.overchargeBtn.disabled = this.overchargeUsed || !this.waveActive;
      this.ui.overchargeBtn.classList.toggle('used', this.overchargeUsed);
    }

    hideTowerPanel() {
      this.selectedTower = null;
      if (this.ui.towerRadial) this.ui.towerRadial.classList.add('hidden');
    }

    positionTowerRadial(tower) {
      const radial = this.ui.towerRadial;
      if (!radial || !tower) return;
      const pos = this.pathFinder.cellCenter(tower.r, tower.c);
      const half = 54;
      const x = Math.max(half, Math.min(this.canvas.width - half, pos.x));
      const y = Math.max(half, Math.min(this.canvas.height - half, pos.y));
      radial.style.left = (x / this.canvas.width) * 100 + '%';
      radial.style.top = (y / this.canvas.height) * 100 + '%';
    }

    selectTower(tower) {
      this.selectedTower = tower;
      this.selectedTowerType = null;
      this.updateTowerBar();
      const def = B.TOWER_TYPES[tower.type];
      const upCost = tower.upgradeCost();
      const radial = this.ui.towerRadial;
      if (!radial) return;

      radial.style.setProperty('--tower-color', def.color);
      this.ui.towerPanelInfo.textContent = def.name.slice(0, 3) + (tower.tier + 1);
      this.ui.upgradeLabel.textContent = upCost ? String(upCost) : 'MAX';
      this.ui.sellLabel.textContent = String(tower.sellValue());
      this.ui.upgradeBtn.disabled = !upCost || !this.economy.canAfford(upCost);
      this.ui.upgradeBtn.classList.toggle('radial-maxed', !upCost);
      this.positionTowerRadial(tower);
      radial.classList.remove('hidden');
    }

    tryPlaceTower(r, c, type) {
      if (this.mapGrid[r][c] !== C.CELL_SLOT) { if (typeof hapticError === 'function') hapticError(); return; }
      if (this.towers.some((t) => t.r === r && t.c === c)) { if (typeof hapticError === 'function') hapticError(); return; }
      const cost = B.TOWER_TYPES[type].cost;
      if (!this.economy.spend(cost)) { if (typeof hapticError === 'function') hapticError(); return; }
      this.towers.push(new Ent.Tower(type, r, c));
      if (typeof hapticTick === 'function') hapticTick();
      const pos = this.pathFinder.cellCenter(r, c);
      this.particles.push(new Ent.Particle(pos.x, pos.y, B.TOWER_TYPES[type].color, 8));
      this.fxRings.push(new Ent.RingFx(pos.x, pos.y, B.TOWER_TYPES[type].color, this.metrics.cellSize * 0.55, 0.45));
      this.selectedTowerType = null;
      this.updateTowerBar();
      this.updateHud();
    }

    upgradeTower() {
      const tower = this.selectedTower;
      if (!tower) return;
      const cost = tower.upgradeCost();
      if (!cost || !this.economy.spend(cost)) { if (typeof hapticError === 'function') hapticError(); return; }
      tower.totalSpent += cost;
      tower.tier++;
      if (typeof hapticSuccess === 'function') hapticSuccess();
      const pos = this.pathFinder.cellCenter(tower.r, tower.c);
      this.particles.push(new Ent.Particle(pos.x, pos.y, B.TOWER_TYPES[tower.type].color, 10));
      this.selectTower(tower);
      this.updateHud();
    }

    sellTower() {
      const tower = this.selectedTower;
      if (!tower) return;
      this.economy.addGold(tower.sellValue());
      this.towers = this.towers.filter((t) => t.id !== tower.id);
      if (typeof hapticTick === 'function') hapticTick();
      this.hideTowerPanel();
      this.updateHud();
      this.updateTowerBar();
    }

    startWave() {
      if (this.state !== 'playing' || this.waveActive || this.waveSpawning) return;
      this.waveIntermissionActive = false;
      this.waveIntermissionMs = 0;
      this.wave++;
      this.waveActive = true;
      this.waveSpawning = true;
      this.currentWaveModifier = this.wave > 1 ? this.nextWaveModifier : null;
      this.nextWaveModifier = this.waveSystem.rollModifier(this.wave + 1);
      this._refreshNextWaveQueue();
      this.overchargeUsed = false;
      this.economy.resetInterestCap();
      this.spawnQueue = this.waveSystem.buildQueue(
        this.wave, this.currentMap, this.endless, this.currentWaveModifier
      );
      this.spawnTimer = 0.3;
      this.spawnIndex = 0;
      if (typeof hapticMedium === 'function') hapticMedium();
      this.updateTowerBar();
      this.updateHud();
      this.updateWavePreview();
    }

    activateOvercharge() {
      if (this.state !== 'playing' || this.overchargeUsed || !this.waveActive) return;
      this.overchargeTimer = C.OVERCHARGE_MS;
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
      const lane = Ent.laneOffsetForIndex(this.spawnIndex++);
      const enemy = new Ent.Enemy(typeKey, this._hpMult(), this.pathFinder, lane, this.spawnIndex, {
        elite,
        speedMult: this._modifierSpeedMult(),
      });
      if (!elite && typeKey !== 'boss' && this.wave >= 7 && Math.random() < B.ELITE_SPAWN_CHANCE) {
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
      if (shattered) {
        this.particles.push(new Ent.Particle(enemy.x, enemy.y, '#88ddff', 6));
      }
      if (enemy.takeDamage(damage, slowOpts)) {
        this._removeEnemy(enemy, true);
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
      if (typeof hapticTick === 'function') hapticTick();

      if (enemy.split) {
        const hpMult = this.currentMap.hpMod * 0.35;
        for (let i = 0; i < 2; i++) {
          const child = new Ent.Enemy('drone', hpMult, this.pathFinder, enemy.laneOffset + (i ? 0.08 : -0.08), this.spawnIndex++);
          child.pathIndex = enemy.pathIndex;
          child.segT = enemy.segT;
          const pos = this.pathFinder.positionAt(child.pathIndex, child.segT, child.laneOffset);
          child.x = pos.x;
          child.y = pos.y;
          this.enemies.push(child);
        }
      }
      this.updateHud();
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
      this.shake = 8;
      this.updateHud();
      if (this.baseHp <= 0) this.endGame();
    }

    update(dt) {
      if (this.state !== 'playing') return;

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

      this.economy.tickInterest(dt, this.waveActive || this.waveSpawning);

      if (this.waveIntermissionActive) {
        this.waveIntermissionMs -= dt;
        if (this.waveIntermissionMs <= 0) {
          this.waveIntermissionActive = false;
          this.startWave();
        } else {
          this.updateTowerBar();
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
            if (fx.shake) self.shake = Math.max(self.shake, fx.shake);
            if (fx.particles) {
              self.particles.push(new Ent.Particle(fx.particles.x, fx.particles.y, fx.particles.color, fx.particles.n));
            }
            if (fx.ring) {
              self.fxRings.push(new Ent.RingFx(
                fx.ring.x, fx.ring.y, fx.ring.color, fx.ring.radius, fx.ring.duration
              ));
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
      if (this.screenFlash && !this.screenFlash.update(dt)) this.screenFlash = null;

      this._checkWaveComplete();
      this.updateHud();
    }

    _checkWaveComplete() {
      if (!this.waveActive || this.waveSpawning) return;
      if (this.enemies.length > 0) return;
      this.waveActive = false;
      const bonus = this.economy.waveClearBonus(this.wave);
      this.score += bonus.score;
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
      if (this.score > this.best) {
        this.best = this.score;
        if (typeof setHighScore === 'function') setHighScore(C.GAME_ID, this.best);
      }
      this.ui.victoryScore.textContent = this.score;
      this.ui.victoryOverlay.classList.remove('hidden');
      if (typeof hapticSuccess === 'function') hapticSuccess();
    }

    continueEndless() {
      this.endless = true;
      this.state = 'playing';
      this.ui.victoryOverlay.classList.add('hidden');
      this.updateWavePreview();
    }

    startPlaying() {
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
      if (this.score > this.best) {
        this.best = this.score;
        if (typeof setHighScore === 'function') setHighScore(C.GAME_ID, this.best);
      }
      this.ui.finalScore.textContent = this.score;
      this.ui.bestScore.textContent = 'BEST: ' + this.best;
      this.ui.gameoverSub.textContent = 'CORE DESTROYED';
      if (typeof awardAndShowCoins === 'function') awardAndShowCoins(C.GAME_ID, this.score);
      this.ui.gameoverOverlay.classList.remove('hidden');
    }

    draw() {
      this.renderer.draw({
        state: this.state,
        metrics: this.metrics,
        mapGrid: this.mapGrid,
        pathFinder: this.pathFinder,
        towers: this.towers,
        enemies: this.enemies,
        projectiles: this.projectiles,
        particles: this.particles,
        floatingTexts: this.floatingTexts,
        selectedTowerType: this.selectedTowerType,
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
        screenFlash: this.screenFlash,
        currentWaveModifier: this.currentWaveModifier,
        baseHp: this.baseHp,
        mapGoal: this.currentMap ? this.currentMap.goal : null,
      });
    }
  }

  window.NeonSiegeGame = NeonSiegeGame;
})();
