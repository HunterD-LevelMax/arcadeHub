(function () {
  const B = window.NeonSiegeBalance;

  function populateCodex(container) {
    if (!container) return;
    const towers = Object.entries(B.TOWER_TYPES).map(([key, t]) => `
      <div class="codex-card" style="--card-color:${t.color}">
        <div class="codex-card-title">${t.name} <span class="codex-cost">${t.cost}g</span></div>
        <div class="codex-card-desc">${t.desc}</div>
        <div class="codex-card-stat">DMG ${t.damage} · RNG ${t.range} · RATE ${t.fireRate}s</div>
      </div>
    `).join('');

    const enemies = Object.entries(B.ENEMY_TYPES).map(([key, e]) => `
      <div class="codex-card" style="--card-color:${e.color}">
        <div class="codex-card-title">${e.name} <span class="codex-wave">WAVE ${e.wave}+</span></div>
        <div class="codex-card-desc">${e.desc}${key !== 'boss' ? ' Elites (gold ring) have more HP and double gold.' : ''}</div>
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
