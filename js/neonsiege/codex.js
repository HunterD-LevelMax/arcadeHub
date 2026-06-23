(function () {
  const B = window.NeonSiegeBalance;

  function populateCodex(container) {
    if (!container) return;
    const towers = Object.entries(B.TOWER_TYPES).map(([key, t]) => {
      const maxTier = B.MAX_TOWER_TIER + 1;
      const extra = t.chains ? ' · CHAIN ' + t.chains : t.shieldBonus ? ' · ANTI-SHIELD' : t.aoe ? ' · SPLASH' : '';
      return `
      <div class="codex-card" style="--card-color:${t.color}">
        <div class="codex-card-title">${t.name} <span class="codex-cost">${t.cost}g</span></div>
        <div class="codex-card-desc">${t.desc}</div>
        <div class="codex-card-stat">DMG ${t.damage} · RNG ${t.range} · RATE ${t.fireRate}s · T1–T${maxTier}${extra}</div>
      </div>
    `;
    }).join('');

    const enemies = Object.entries(B.ENEMY_TYPES).map(([key, e]) => `
      <div class="codex-card" style="--card-color:${e.color}">
        <div class="codex-card-title">${e.name} <span class="codex-wave">WAVE ${e.wave}+</span></div>
        <div class="codex-card-desc">${e.desc}${key !== 'boss' ? ' Elites (gold ring) have more HP and double gold.' : ' Spawns escorts and shield pulses at HP thresholds.'}</div>
        <div class="codex-card-stat">HP ${e.hp} · SPD ${e.speed}${e.shield ? ' · SHIELD' : ''}${e.split ? ' · SPLIT' : ''}</div>
      </div>
    `).join('');

    const modifiers = Object.entries(B.WAVE_MODIFIERS).map(([key, m]) => `
      <div class="codex-card" style="--card-color:#ffcc00">
        <div class="codex-card-title">${m.name}</div>
        <div class="codex-card-desc">${m.desc}</div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="codex-section">
        <div class="codex-section-title">MAPS</div>
        <div class="codex-grid">
          <div class="codex-card" style="--card-color:#ffcc00">
            <div class="codex-card-title">NEON GRID / SPIRAL CORE</div>
            <div class="codex-card-desc">Fixed handcrafted layouts. SPIRAL CORE is harder but +15% kill gold.</div>
          </div>
          <div class="codex-card" style="--card-color:#39ff14">
            <div class="codex-card-title">RANDOM</div>
            <div class="codex-card-desc">Procedural serpentine maze with forked routes — enemies split across lanes each wave. Scarce chokepoint slots. Purple tunnels block all tower damage.</div>
          </div>
        </div>
      </div>
      <div class="codex-section">
        <div class="codex-section-title">ECONOMY</div>
        <div class="codex-grid">
          <div class="codex-card" style="--card-color:#ffcc00">
            <div class="codex-card-title">GOLD</div>
            <div class="codex-card-desc">Gold comes only from enemy kills (and combo bonuses). No passive income between waves — spend wisely and clear waves fast.</div>
          </div>
          <div class="codex-card" style="--card-color:#ff6688">
            <div class="codex-card-title">LATE GAME</div>
            <div class="codex-card-desc">Enemy HP, speed, and spawn rate ramp after wave 5–8. Harder maps (SPIRAL, RANDOM) pay more gold per kill.</div>
          </div>
        </div>
      </div>
      <div class="codex-section">
        <div class="codex-section-title">TOWER CONTROLS</div>
        <div class="codex-grid">
          <div class="codex-card" style="--card-color:#00f5ff">
            <div class="codex-card-title">TARGET PRIORITY</div>
            <div class="codex-card-desc">Tap a tower, then the target button: FIRST (nearest core), LAST (nearest spawn), STRONG (highest HP+shield). Works on all direct-fire towers.</div>
          </div>
          <div class="codex-card" style="--card-color:#b8ff00">
            <div class="codex-card-title">UPGRADES</div>
            <div class="codex-card-desc">Every tower upgrades to T4. Higher tiers gain accelerated damage, range, and fire rate — essential for endless waves 20+.</div>
          </div>
          <div class="codex-card" style="--card-color:#ffcc00">
            <div class="codex-card-title">SPEED</div>
            <div class="codex-card-desc">1× / 2× toggle in the action bar speeds up combat during active waves.</div>
          </div>
        </div>
      </div>
      <div class="codex-section">
        <div class="codex-section-title">ABILITIES</div>
        <div class="codex-grid">
          <div class="codex-card" style="--card-color:#39ff14">
            <div class="codex-card-title">BOOST</div>
            <div class="codex-card-desc">During an active wave, all towers shoot ~70% faster for 5 seconds. One use per wave — press BOOST while enemies are on the map.</div>
            <div class="codex-card-stat">FIRE RATE ×1.7 · DURATION 5s · 1× PER WAVE</div>
          </div>
        </div>
      </div>
      <div class="codex-section">
        <div class="codex-section-title">WAVE MODIFIERS</div>
        <div class="codex-grid">${modifiers}</div>
      </div>
      <div class="codex-section">
        <div class="codex-section-title">TOWERS</div>
        <div class="codex-grid">${towers}</div>
      </div>
      <div class="codex-section">
        <div class="codex-section-title">ENEMIES</div>
        <div class="codex-grid">${enemies}</div>
      </div>
    `;
  }

  window.NeonSiegeCodex = { populateCodex };
})();
