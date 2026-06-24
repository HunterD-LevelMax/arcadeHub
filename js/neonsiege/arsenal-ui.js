(function () {
  const B = window.NeonSiegeBalance;

  function strikeCard(id, def) {
    return `
      <button type="button" class="arsenal-card md-ripple" data-strike-buy="${id}" style="--card-color:${def.color}">
        <div class="arsenal-card-top">
          <span class="arsenal-card-name">${def.name}</span>
          <span class="arsenal-cost">${def.cost}g</span>
        </div>
        <p class="arsenal-card-desc">${def.desc}</p>
        <div class="arsenal-card-foot">
          <span class="arsenal-owned"></span>
          <span class="arsenal-card-tag">Tap map during wave</span>
        </div>
      </button>
    `;
  }

  function techCard(id, def) {
    return `
      <button type="button" class="arsenal-card md-ripple" data-tech-buy="${id}" style="--card-color:#b8ff00">
        <div class="arsenal-card-top">
          <span class="arsenal-card-name">${def.name}</span>
          <span class="arsenal-stacks"></span>
          <span class="arsenal-cost">${def.baseCost}g</span>
        </div>
        <p class="arsenal-card-desc">${def.desc}</p>
        <div class="arsenal-card-foot">
          <span class="arsenal-card-tag">Max ${def.lateMax || def.max} stacks · premium after ${def.max} from W40</span>
        </div>
      </button>
    `;
  }

  function populateArsenal(body) {
    if (!body) return;
    const strikes = Object.entries(B.ARSENAL_STRIKES).map(([id, def]) => strikeCard(id, def)).join('');
    const tech = Object.entries(B.ARSENAL_TECH).map(([id, def]) => techCard(id, def)).join('');
    body.innerHTML = `
      <section class="arsenal-section">
        <div class="arsenal-section-head">
          <h3 class="arsenal-section-title">STRIKES</h3>
          <p class="arsenal-section-hint">One-time map abilities. Buy between waves, equip from the top-left HUD, then tap the battlefield. +10% cost per wave after W30.</p>
        </div>
        <div class="arsenal-cards">${strikes}</div>
      </section>
      <section class="arsenal-section">
        <div class="arsenal-section-head">
          <h3 class="arsenal-section-title">TECH UPGRADES</h3>
          <p class="arsenal-section-hint">Permanent bonuses for the rest of the run. Premium stacks after the base cap unlock at W40. Prices scale with wave.</p>
        </div>
        <div class="arsenal-cards">${tech}</div>
      </section>
    `;
  }

  window.NeonSiegeArsenalUI = { populateArsenal };
})();
