(function () {
  const B = window.NeonSiegeBalance;
  const Icons = window.NeonSiegeIcons;

  function codexCard(iconHtml, color, bodyHtml) {
    return `
      <div class="codex-card" style="--card-color:${color}">
        <div class="codex-card-row">
          <div class="codex-icon-wrap">${iconHtml}</div>
          <div class="codex-card-main">${bodyHtml}</div>
        </div>
      </div>
    `;
  }

  function populateCodex(container) {
    if (!container) return;
    const towers = Object.entries(B.TOWER_TYPES).map(([key, t]) => {
      const maxTier = B.MAX_TOWER_TIER + 1;
      const lateTier = B.LATE_MAX_TOWER_TIER + 1;
      const megaTier = B.MEGA_MAX_TOWER_TIER + 1;
      const unlock = B.TOWER_UNLOCK[key];
      const unlockTag = unlock && unlock > 1 ? ' · WAVE ' + unlock + '+' : '';
      const extra = t.supportOnly ? ' · AURA'
        : t.fastBonus ? ' · ANTI-FAST'
        : t.rampCap ? ' · RAMP DMG'
        : t.deathNova ? ' · DEATH BURST'
        : t.chains ? ' · CHAIN ' + t.chains
        : t.shieldBonus ? ' · ANTI-SHIELD'
        : t.aoe ? ' · SPLASH' : '';
      const icon = Icons ? Icons.towerSvg(key) : '';
      const body = `
        <div class="codex-card-title">${t.name} <span class="codex-cost">${t.cost}g</span></div>
        <div class="codex-card-desc">${t.desc}</div>
        <div class="codex-card-stat">DMG ${t.damage} · RNG ${t.range} · RATE ${t.fireRate}s · T1–T${maxTier} · T${lateTier}@W${B.LATE_UPGRADE_WAVE} · T${megaTier}@W${B.MEGA_UPGRADE_WAVE}${extra}${unlockTag}</div>
      `;
      return codexCard(icon, t.color, body);
    }).join('');

    const enemies = Object.entries(B.ENEMY_TYPES).map(([key, e]) => {
      const icon = Icons ? Icons.enemySvg(key) : '';
      const body = `
        <div class="codex-card-title">${e.name} <span class="codex-wave">WAVE ${e.wave}+</span></div>
        <div class="codex-card-desc">${e.desc}${key !== 'boss' ? ' Elites (gold ring) have more HP and double gold.' : ' Spawns escorts and shield pulses at HP thresholds.'}</div>
        <div class="codex-card-stat">HP ${e.hp} · SPD ${e.speed}${e.shield ? ' · SHIELD' : ''}${e.split ? ' · SPLIT' : ''}</div>
      `;
      return codexCard(icon, e.color, body);
    }).join('');

    const modifiers = Object.entries(B.WAVE_MODIFIERS).map(([key, m]) => `
      <div class="codex-card" style="--card-color:#ffcc00">
        <div class="codex-card-title">${m.name}</div>
        <div class="codex-card-desc">${m.desc}</div>
      </div>
    `).join('');

    const strikes = Object.entries(B.ARSENAL_STRIKES).map(([key, s]) => `
      <div class="codex-card" style="--card-color:${s.color}">
        <div class="codex-card-title">${s.name} <span class="codex-cost">${s.cost}g</span></div>
        <div class="codex-card-desc">${s.desc} Buy between waves · tap charge · tap map during wave.</div>
      </div>
    `).join('');

    const tech = Object.entries(B.ARSENAL_TECH).map(([key, t]) => `
      <div class="codex-card" style="--card-color:#b8ff00">
        <div class="codex-card-title">${t.name}</div>
        <div class="codex-card-desc">${t.desc} Max ${t.max} stacks · cost rises each buy.</div>
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
            <div class="codex-card-title">RANDOM THEMES</div>
            <div class="codex-card-desc">Narrow corridors with dark void between lanes. Tower slot islands in pockets — 24+ build sites. MAZE (split routes), FORTRESS (compact spiral), CORRIDOR (long path, +gold), RIFT (up to 3 routes), CHAOS (extra island slots).</div>
          </div>
        </div>
      </div>
      <div class="codex-section">
        <div class="codex-section-title">ECONOMY</div>
        <div class="codex-grid">
          <div class="codex-card" style="--card-color:#ffcc00">
            <div class="codex-card-title">GOLD</div>
            <div class="codex-card-desc">Kills, combo bonus (max +2g), and wave clear bonus (8 + 4×wave). Spend on towers, upgrades, and ARSENAL between waves.</div>
          </div>
          <div class="codex-card" style="--card-color:#39ff14">
            <div class="codex-card-title">EARLY START</div>
            <div class="codex-card-desc">Start the next wave before the timer ends to earn +3g per second saved. Auto-start grants no bonus.</div>
          </div>
          <div class="codex-card" style="--card-color:#00f5ff">
            <div class="codex-card-title">PLACEMENT</div>
            <div class="codex-card-desc">When placing a tower, slots show A/B/C tiers for that tower's range. A = strong path coverage, B = decent, C = weak. Tiers depend on the selected tower.</div>
          </div>
          <div class="codex-card" style="--card-color:#ff6688">
            <div class="codex-card-title">LATE GAME</div>
            <div class="codex-card-desc">After W30 enemies gain extra HP, speed, and count each wave. Elites become more common. ARSENAL prices rise too; towers T10@W40, T15@W50.</div>
          </div>
        </div>
      </div>
      <div class="codex-section">
        <div class="codex-section-title">ARSENAL</div>
        <div class="codex-grid">${strikes}${tech}</div>
      </div>
      <div class="codex-section">
        <div class="codex-section-title">ABILITIES</div>
        <div class="codex-grid">
          <div class="codex-card" style="--card-color:#39ff14">
            <div class="codex-card-title">BOOST</div>
            <div class="codex-card-desc">During an active wave, all towers shoot ~70% faster. Duration extends with BOOST CORE tech. Once per wave.</div>
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
