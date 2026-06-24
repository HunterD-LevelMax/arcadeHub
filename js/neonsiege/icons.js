(function () {
  const B = window.NeonSiegeBalance;

  function hexPoints(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      pts.push((cx + Math.cos(a) * r).toFixed(1) + ',' + (cy + Math.sin(a) * r).toFixed(1));
    }
    return pts.join(' ');
  }

  function wrapSvg(inner, viewBox) {
    return `<svg class="codex-icon" viewBox="${viewBox || '0 0 40 40'}" aria-hidden="true" overflow="visible">${inner}</svg>`;
  }

  function towerShape(shape, c) {
    const cx = 20;
    const cy = 20;
    const r = 12;
    switch (shape) {
      case 'square':
        return `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" fill="${c}"/>`;
      case 'hex':
        return `<polygon points="${hexPoints(cx, cy, r)}" fill="${c}"/>`;
      case 'diamond':
        return `<polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="${c}"/>`;
      case 'triangle':
        return `<polygon points="${cx},${cy - r} ${cx + r},${cy + r * 0.8} ${cx - r},${cy + r * 0.8}" fill="${c}"/>`;
      case 'coil':
        return [
          `<circle cx="${cx}" cy="${cy}" r="${(r * 0.55).toFixed(1)}" fill="none" stroke="${c}" stroke-width="1.8"/>`,
          `<circle cx="${cx}" cy="${cy}" r="${(r * 0.77).toFixed(1)}" fill="none" stroke="${c}" stroke-width="1.8"/>`,
          `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="1.8"/>`,
          `<circle cx="${cx}" cy="${cy}" r="${(r * 0.35).toFixed(1)}" fill="${c}"/>`,
        ].join('');
      case 'rail':
        return [
          `<rect x="${cx - r * 1.2}" y="${cy - r * 0.22}" width="${r * 2.4}" height="${r * 0.44}" fill="${c}"/>`,
          `<rect x="${cx + r * 0.9}" y="${cy - r * 0.55}" width="${r * 0.35}" height="${r * 1.1}" fill="${c}"/>`,
        ].join('');
      case 'mortar':
        return [
          `<circle cx="${cx}" cy="${cy}" r="${(r * 0.85).toFixed(1)}" fill="${c}"/>`,
          `<rect x="${cx - r * 0.5}" y="${cy - r * 0.15}" width="${r}" height="${r * 0.7}" fill="${c}"/>`,
        ].join('');
      case 'flak':
        return [
          `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - r}" stroke="${c}" stroke-width="2"/>`,
          `<line x1="${cx}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${c}" stroke-width="2"/>`,
          `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy + r}" stroke="${c}" stroke-width="2"/>`,
          `<line x1="${cx}" y1="${cy}" x2="${cx - r}" y2="${cy}" stroke="${c}" stroke-width="2"/>`,
          `<circle cx="${cx}" cy="${cy}" r="${(r * 0.35).toFixed(1)}" fill="${c}"/>`,
        ].join('');
      case 'lance':
        return `<rect x="${cx - r * 1.4}" y="${cy - r * 0.12}" width="${r * 2.8}" height="${r * 0.24}" fill="${c}"/>`;
      case 'reactor':
        return [
          `<circle cx="${cx}" cy="${cy}" r="${(r * 0.9).toFixed(1)}" fill="none" stroke="${c}" stroke-width="1.8"/>`,
          `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="1.4" opacity="0.7"/>`,
          `<circle cx="${cx}" cy="${cy}" r="${(r * 0.25).toFixed(1)}" fill="${c}"/>`,
        ].join('');
      case 'crypt':
        return `<polygon points="${cx},${cy - r} ${cx + r * 0.85},${cy} ${cx},${cy + r} ${cx - r * 0.85},${cy}" fill="${c}" stroke="${c}" stroke-width="1"/>`;
      default:
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/>`;
    }
  }

  function enemyShape(shape, c) {
    const cx = 20;
    const cy = 20;
    const sz = 11;
    const bg = '#0a0a14';
    switch (shape) {
      case 'drone':
        return [
          `<rect x="${cx - sz}" y="${cy - sz}" width="${sz * 2}" height="${sz * 2}" fill="${bg}" stroke="${c}" stroke-width="2"/>`,
          `<rect x="${cx - sz * 0.4}" y="${cy - sz * 0.4}" width="${sz * 0.8}" height="${sz * 0.8}" fill="${c}" opacity="0.45"/>`,
        ].join('');
      case 'tank':
        return `<polygon points="${hexPoints(cx, cy, sz * 1.1)}" fill="${bg}" stroke="${c}" stroke-width="2.5"/>`;
      case 'swift':
        return `<polygon points="${cx},${cy - sz} ${cx + sz},${cy + sz} ${cx - sz},${cy + sz}" fill="${bg}" stroke="${c}" stroke-width="2"/>`;
      case 'shield': {
        const shieldR = sz + 5;
        return [
          `<rect x="${cx - sz}" y="${cy - sz}" width="${sz * 2}" height="${sz * 2}" fill="${bg}" stroke="${c}" stroke-width="2"/>`,
          `<circle cx="${cx}" cy="${cy}" r="${shieldR}" fill="none" stroke="#00f5ff" stroke-width="2.5"/>`,
        ].join('');
      }
      case 'splitter': {
        const w = sz * 1.2;
        const h = sz * 1.6;
        return [
          `<rect x="${cx - sz - 1}" y="${cy - sz * 0.8}" width="${w}" height="${h}" fill="${bg}" stroke="${c}" stroke-width="2"/>`,
          `<rect x="${cx + 1}" y="${cy - sz * 0.8}" width="${w}" height="${h}" fill="${bg}" stroke="${c}" stroke-width="2"/>`,
        ].join('');
      }
      case 'boss': {
        const s = sz;
        const spike = s * 0.35;
        return [
          `<polygon points="${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}" fill="${bg}" stroke="${c}" stroke-width="2"/>`,
          `<line x1="${cx}" y1="${cy - s}" x2="${cx}" y2="${cy - s - spike}" stroke="${c}" stroke-width="2"/>`,
          `<line x1="${cx + s}" y1="${cy}" x2="${cx + s + spike}" y2="${cy}" stroke="${c}" stroke-width="2"/>`,
          `<line x1="${cx}" y1="${cy + s}" x2="${cx}" y2="${cy + s + spike}" stroke="${c}" stroke-width="2"/>`,
          `<line x1="${cx - s}" y1="${cy}" x2="${cx - s - spike}" y2="${cy}" stroke="${c}" stroke-width="2"/>`,
        ].join('');
      }
      default:
        return `<circle cx="${cx}" cy="${cy}" r="${sz}" fill="${bg}" stroke="${c}" stroke-width="2"/>`;
    }
  }

  function towerSvg(type) {
    const t = B.TOWER_TYPES[type];
    if (!t) return '';
    return wrapSvg(towerShape(t.shape, t.color));
  }

  function enemySvg(type) {
    const e = B.ENEMY_TYPES[type];
    if (!e) return '';
    const viewBox = e.shape === 'shield' ? '-4 -4 48 48' : '0 0 40 40';
    return wrapSvg(enemyShape(e.shape, e.color), viewBox);
  }

  window.NeonSiegeIcons = { towerSvg, enemySvg };
})();
