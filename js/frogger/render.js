(function () {
  const C = window.FroggerConstants;
  const P = C.PALETTE;

  function drawVoxelTop(ctx, x, y, w, h, top, side, depth) {
    const d = depth || h * 0.22;
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + d, y + h - d);
    ctx.lineTo(x + w + d, y + h - d);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w + d, y - d);
    ctx.lineTo(x + w + d, y + h - d);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = top;
    ctx.fillRect(x, y, w, h);
  }

  function drawSky(ctx, w, h, time, camZ) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, P.skyTop);
    grad.addColorStop(1, P.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    const scroll = camZ * 8 + time * 0.01;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 137 + scroll * 0.3) % (w + 120)) - 60;
      const cy = 30 + (i % 3) * 28;
      const cw = 50 + (i % 2) * 20;
      ctx.beginPath();
      ctx.arc(cx, cy, cw * 0.35, 0, Math.PI * 2);
      ctx.arc(cx + cw * 0.35, cy + 4, cw * 0.42, 0, Math.PI * 2);
      ctx.arc(cx + cw * 0.7, cy, cw * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGrassDecor(ctx, top, sz, seed) {
    for (let i = 0; i < 4 + (seed % 3); i++) {
      const gx = ((seed * 17 + i * 43) % 1000) / 1000 * ctx.canvas.width;
      const gy = top + sz * (0.25 + ((i * 19) % 50) / 100);
      ctx.fillStyle = i % 2 ? P.grassDark : P.grassTop;
      ctx.fillRect(gx, gy, sz * 0.08, sz * 0.18);
    }
  }

  function drawLane(ctx, lane, camZ, time, canvasW, canvasH) {
    const pos = window.FroggerWorld.worldToScreen(0, lane.z, camZ, canvasW, canvasH);
    const top = pos.y - pos.sz / 2;
    const sz = pos.sz;
    const w = canvasW;

    if (lane.type === "safe" || lane.type === "grass") {
      drawVoxelTop(ctx, 0, top, w, sz, lane.type === "safe" ? P.safeTop : P.grassTop, P.grassSide, sz * 0.08);
      drawGrassDecor(ctx, top, sz, lane.z * 13 + 7);
      return;
    }

    if (lane.type === "road") {
      drawVoxelTop(ctx, 0, top, w, sz, P.roadTop, P.roadSide, sz * 0.1);
      ctx.setLineDash([sz * 0.35, sz * 0.25]);
      ctx.strokeStyle = P.roadLine;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, top + sz / 2);
      ctx.lineTo(w, top + sz / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      lane.objects.forEach((car) => drawVehicle(ctx, car, lane.z, camZ, top, sz, canvasW, canvasH));
      return;
    }

    if (lane.type === "water") {
      const grad = ctx.createLinearGradient(0, top, 0, top + sz);
      grad.addColorStop(0, P.waterTop);
      grad.addColorStop(1, P.waterDeep);
      ctx.fillStyle = grad;
      ctx.fillRect(0, top, w, sz);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.05) {
        const wx = t * w;
        const wy = top + sz * 0.55 + Math.sin(t * Math.PI * 6 + time * 0.005) * sz * 0.06;
        t === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
      }
      ctx.stroke();
      lane.objects.forEach((obj) => drawPlatform(ctx, obj, lane.z, camZ, top, sz, time, canvasW, canvasH));
    }
  }

  function drawPlatform(ctx, obj, z, camZ, top, sz, time, canvasW, canvasH) {
    if (obj.submerged) return;
    const pos = window.FroggerWorld.worldToScreen(obj.worldX, z, camZ, canvasW, canvasH);
    const pw = obj.width * sz * 0.92;
    const ph = sz * 0.42;
    const px = pos.x - sz * 0.46;
    const bob = Math.sin(time * 0.006 + obj.worldX) * sz * 0.03;
    const py = top + (sz - ph) / 2 + bob;

    if (obj.type === "lily_pad") {
      ctx.fillStyle = P.lilySide;
      ctx.beginPath();
      ctx.ellipse(px + pw / 2, py + ph * 0.55, pw * 0.52, ph * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = P.lilyTop;
      ctx.beginPath();
      ctx.ellipse(px + pw / 2, py + ph * 0.5, pw * 0.45, ph * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (obj.type === "log") {
      drawVoxelTop(ctx, px, py, pw, ph, P.logTop, P.logSide, ph * 0.2);
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(px + (pw * i) / 4, py + 2);
        ctx.lineTo(px + (pw * i) / 4, py + ph - 2);
        ctx.stroke();
      }
      return;
    }

    if (obj.type === "turtle") {
      const segments = Math.max(2, Math.floor(obj.width));
      const tw = pw / segments;
      for (let i = 0; i < segments; i++) {
        const tx = px + i * tw + tw / 2;
        const ty = py + ph / 2;
        ctx.fillStyle = P.turtleSide;
        ctx.beginPath();
        ctx.ellipse(tx, ty, tw * 0.42, ph * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = P.turtleTop;
        ctx.beginPath();
        ctx.ellipse(tx, ty - ph * 0.05, tw * 0.3, ph * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawVehicle(ctx, car, z, camZ, top, sz, canvasW, canvasH) {
    const pos = window.FroggerWorld.worldToScreen(car.worldX, z, camZ, canvasW, canvasH);
    const cw = car.width * sz * 0.9;
    const ch = sz * (car.kind === "truck" ? 0.62 : 0.52);
    const cx = pos.x - sz * 0.46;
    const cy = top + (sz - ch) / 2;
    drawVoxelTop(ctx, cx, cy, cw, ch, car.color, shade(car.color, -30), ch * 0.18);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(cx + cw * 0.15, cy + ch * 0.12, cw * 0.35, ch * 0.28);
    ctx.fillStyle = "#263238";
    ctx.fillRect(cx + cw * 0.12, cy + ch - ch * 0.15, cw * 0.22, ch * 0.12);
    ctx.fillRect(cx + cw * 0.62, cy + ch - ch * 0.15, cw * 0.22, ch * 0.12);
  }

  function shade(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
    const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function drawCoin(ctx, coin, camZ, time, canvasW, canvasH) {
    if (coin.collected) return;
    const pos = window.FroggerWorld.worldToScreen(coin.worldX + 0.5, coin.z, camZ, canvasW, canvasH);
    const r = pos.sz * 0.18;
    const bob = Math.sin(time * 0.008 + coin.worldX) * pos.sz * 0.04;
    ctx.fillStyle = "#FFC107";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y + bob, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FF8F00";
    ctx.font = `bold ${Math.floor(r * 1.2)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("¢", pos.x, pos.y + bob);
  }

  function drawFrog(ctx, worldX, z, camZ, jumpT, invincible, canvasW, canvasH) {
    if (invincible && Math.floor(Date.now() / 100) % 2 === 0) ctx.globalAlpha = 0.45;
    const pos = window.FroggerWorld.worldToScreen(worldX, z, camZ, canvasW, canvasH);
    const s = pos.sz * 0.38;
    const bounce = Math.sin(jumpT * Math.PI) * s * 0.85;
    const sqX = jumpT > 0 ? 1 - Math.sin(jumpT * Math.PI) * 0.18 : 1;
    const sqY = jumpT > 0 ? 1 + Math.sin(jumpT * Math.PI) * 0.28 : 1;
    ctx.save();
    ctx.translate(pos.x, pos.y - bounce);
    ctx.globalAlpha = Math.max(0, 0.25 - bounce / (s * 6));
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, bounce + s * 0.2, s * sqX * 0.85, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = invincible && Math.floor(Date.now() / 100) % 2 === 0 ? 0.45 : 1;
    drawVoxelTop(ctx, -s * 0.55 * sqX, -s * 0.15 * sqY, s * 1.1 * sqX, s * 0.75 * sqY, "#66BB6A", "#388E3C", s * 0.12);
    for (const ex of [-s * 0.28 * sqX, s * 0.28 * sqX]) {
      drawVoxelTop(ctx, ex - s * 0.12, -s * 0.55 * sqY, s * 0.24, s * 0.22, "#FFFFFF", "#CFD8DC", s * 0.05);
      ctx.fillStyle = "#212121";
      ctx.beginPath();
      ctx.arc(ex, -s * 0.48 * sqY, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawParticles(ctx, particles) {
    particles.forEach((p) => {
      if (p.life <= 0) return;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  window.FroggerRender = { drawSky, drawLane, drawCoin, drawFrog, drawParticles };
})();
