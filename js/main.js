// Generate stars
    const starsContainer = document.getElementById('stars');
    for (let i = 0; i < 120; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.cssText = `
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        --dur: ${2 + Math.random() * 4}s;
        --delay: ${Math.random() * 4}s;
        opacity: ${0.1 + Math.random() * 0.4};
        width: ${1 + Math.random() * 2}px;
        height: ${1 + Math.random() * 2}px;
      `;
      starsContainer.appendChild(star);
    }

    // Animated preview for Asteroids card
    (function() {
      const canvas = document.getElementById('asteroidsCanvas');
      const card = canvas.closest('.card-preview');
      canvas.width = card.offsetWidth || 320;
      canvas.height = card.offsetHeight || 180;
      const ctx = canvas.getContext('2d');

      const rocks = Array.from({length: 8}, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 8 + Math.random() * 18,
        dx: (Math.random() - 0.5) * 0.6,
        dy: (Math.random() - 0.5) * 0.6,
        rot: 0,
        drot: (Math.random() - 0.5) * 0.02,
        pts: Array.from({length: 8}, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const rr = 0.7 + Math.random() * 0.6;
          return [Math.cos(a) * rr, Math.sin(a) * rr];
        })
      }));

      const bullets = Array.from({length: 3}, (_, i) => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        dx: 2 + Math.random(),
        dy: (Math.random() - 0.5) * 0.5
      }));

      function drawRock(r) {
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.rot);
        ctx.beginPath();
        r.pts.forEach(([px, py], i) => {
          const x = px * r.r, y = py * r.r;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.strokeStyle = 'rgba(0, 245, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      function tick() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        rocks.forEach(r => {
          r.x = (r.x + r.dx + canvas.width) % canvas.width;
          r.y = (r.y + r.dy + canvas.height) % canvas.height;
          r.rot += r.drot;
          drawRock(r);
        });

        bullets.forEach(b => {
          b.x = (b.x + b.dx) % (canvas.width + 10);
          ctx.beginPath();
          ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 245, 255, 0.8)';
          ctx.fill();
        });

        requestAnimationFrame(tick);
      }
      tick();
    })();

    // Animated preview for Flappy card
    (function() {
      const canvas = document.getElementById('flappyCanvas');
      const card = canvas.closest('.card-preview');
      canvas.width = card.offsetWidth || 320;
      canvas.height = card.offsetHeight || 180;
      const ctx = canvas.getContext('2d');

      const pipes = [
        { x: canvas.width * 0.55, gap: 55, gapY: 70 },
        { x: canvas.width * 0.85, gap: 55, gapY: 95 },
      ];
      let birdY = canvas.height / 2;
      let birdV = 0;
      let t = 0;

      function tick() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        t += 0.04;

        // Ground/sky gradient
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, 'rgba(15,3,24,0.0)');
        grad.addColorStop(1, 'rgba(15,3,24,0.4)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Pipes
        pipes.forEach(p => {
          p.x -= 0.7;
          if (p.x < -30) { p.x = canvas.width + 30; p.gapY = 40 + Math.random() * (canvas.height - 80); }
          ctx.fillStyle = 'rgba(255, 0, 255, 0.25)';
          ctx.strokeStyle = 'rgba(255, 0, 255, 0.6)';
          ctx.lineWidth = 1;
          // top pipe
          ctx.fillRect(p.x - 15, 0, 30, p.gapY - p.gap / 2);
          ctx.strokeRect(p.x - 15, 0, 30, p.gapY - p.gap / 2);
          // bottom pipe
          ctx.fillRect(p.x - 15, p.gapY + p.gap / 2, 30, canvas.height);
          ctx.strokeRect(p.x - 15, p.gapY + p.gap / 2, 30, canvas.height - (p.gapY + p.gap / 2));
        });

        // Simple sine bird movement
        birdY = canvas.height / 2 + Math.sin(t) * 30;

        // Bird glow
        const grd = ctx.createRadialGradient(60, birdY, 0, 60, birdY, 18);
        grd.addColorStop(0, 'rgba(255,0,255,0.3)');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.fillRect(40, birdY - 18, 40, 36);

        requestAnimationFrame(tick);
      }
      tick();
    })();
    // Animated preview for SPACE HOPPER card
    (function() {
      const canvas = document.getElementById('doodleCanvas');
      const card = canvas.closest('.card-preview');
      canvas.width = card.offsetWidth || 320;
      canvas.height = card.offsetHeight || 180;
      const ctx = canvas.getContext('2d');

      const W = canvas.width, H = canvas.height;
      const plats = [
        { x: W * 0.12, y: H * 0.82, w: 58 },
        { x: W * 0.45, y: H * 0.64, w: 58 },
        { x: W * 0.68, y: H * 0.46, w: 58 },
        { x: W * 0.20, y: H * 0.28, w: 58 },
        { x: W * 0.55, y: H * 0.12, w: 58 },
      ];
      let playerY = H * 0.68;
      let vy = -4;
      let t = 0;

      function tick() {
        ctx.clearRect(0, 0, W, H);
        t += 0.05;

        // platforms
        plats.forEach((p, i) => {
          const col = i % 2 === 0 ? '#39ff14' : '#00f5ff';
          ctx.shadowColor = col; ctx.shadowBlur = 8;
          ctx.fillStyle = col + '33';
          ctx.fillRect(p.x, p.y, p.w, 8);
          ctx.fillStyle = col;
          ctx.fillRect(p.x, p.y, p.w, 2.5);
          ctx.shadowBlur = 0;
        });

        // simple bounce sine
        playerY = H * 0.45 + Math.sin(t) * H * 0.22;
        const px = W * 0.38 + Math.sin(t * 0.7) * W * 0.1;

        // player glow
        const grd = ctx.createRadialGradient(px + 12, playerY + 16, 0, px + 12, playerY + 16, 22);
        grd.addColorStop(0, 'rgba(57,255,20,0.25)');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.fillRect(px - 10, playerY - 6, 44, 44);

        // player body
        ctx.shadowColor = '#c8ff80'; ctx.shadowBlur = 12;
        ctx.fillStyle = '#1a2e00';
        ctx.strokeStyle = '#c8ff80'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(px, playerY, 24, 28, 6);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#00f5ff';
        ctx.fillRect(px + 5, playerY + 5, 4, 4);
        ctx.fillRect(px + 14, playerY + 5, 4, 4);
        ctx.shadowBlur = 0;

        requestAnimationFrame(tick);
      }
       tick();
     })();
     
     // Animated preview for Snake card
     (function() {
       const canvas = document.getElementById('snakeCanvas');
       const card = canvas.closest('.card-preview');
       canvas.width = card.offsetWidth || 320;
       canvas.height = card.offsetHeight || 180;
       const ctx = canvas.getContext('2d');
       
       const GRID = 10;
       let snake = [
         { x: 8, y: 9 },
         { x: 7, y: 9 },
         { x: 6, y: 9 },
         { x: 5, y: 9 },
       ];
       let dir = { x: 1, y: 0 };
       let food = { x: 20, y: 9 };
       let t = 0;
       
       function tick() {
         ctx.clearRect(0, 0, canvas.width, canvas.height);
         t++;
         
         if (t % 8 === 0) {
           const head = snake[0];
           const newHead = { x: head.x + dir.x, y: head.y + dir.y };
           
           if (newHead.x < 0) newHead.x = 31;
           if (newHead.x >= 32) newHead.x = 0;
           if (newHead.y < 0) newHead.y = 17;
           if (newHead.y >= 18) newHead.y = 0;
           
           snake.unshift(newHead);
           if (newHead.x === food.x && newHead.y === food.y) {
             food = { x: Math.floor(Math.random() * 28) + 2, y: Math.floor(Math.random() * 14) + 2 };
           } else {
             snake.pop();
           }
         }
         
         // Food
         ctx.shadowColor = '#39ff14';
         ctx.shadowBlur = 6;
         ctx.fillStyle = '#39ff14';
         ctx.fillRect(food.x * GRID + 2, food.y * GRID + 2, GRID - 4, GRID - 4);
         
         // Snake
         snake.forEach((seg, i) => {
           const alpha = 1 - (i / snake.length) * 0.5;
           ctx.shadowBlur = i === 0 ? 8 : 4;
           ctx.fillStyle = `rgba(57, 255, 20, ${alpha})`;
           ctx.fillRect(seg.x * GRID + 1, seg.y * GRID + 1, GRID - 2, GRID - 2);
         });
         ctx.shadowBlur = 0;
         
         requestAnimationFrame(tick);
       }
       tick();
     })();
     
     // Animated preview for Space Tetris
     (function() {
       const canvas = document.getElementById('tetrisCanvas');
       const card = canvas.closest('.card-preview');
       canvas.width = card.offsetWidth || 320;
       canvas.height = card.offsetHeight || 180;
       const ctx = canvas.getContext('2d');
       
       const COLS = 10;
       const ROWS = 18;
       const bs = canvas.height / ROWS;
       const ox = (canvas.width - COLS * bs) / 2;
       
       const SHAPES = [
         [[1,1,1,1]],
         [[1,1],[1,1]],
         [[0,1,0],[1,1,1]],
         [[0,0,1],[1,1,1]]
       ];
       
       let grid = Array(ROWS).fill().map(() => Array(COLS).fill(-1));
       let currentShape = 0;
       let piece = SHAPES[currentShape];
       let px = Math.floor(COLS / 2);
       let py = -2;
       let t = 0;
       
       const COLORS = ['#00f5ff', '#ff00ff', '#39ff14', '#ffff00', '#ff3344'];
       
       function tick() {
         ctx.clearRect(0, 0, canvas.width, canvas.height);
         t++;
         
         if (t % 12 === 0) {
           py++;
           
           if (py + piece.length >= ROWS) {
             piece.forEach((row, y) => {
               row.forEach((val, x) => {
                 if (val && py + y >= 0) {
                   grid[py + y][px + x] = currentShape;
                 }
               });
             });
             
             for (let y = ROWS - 1; y >= 0; y--) {
               if (grid[y].every(c => c !== -1)) {
                 grid.splice(y, 1);
                 grid.unshift(Array(COLS).fill(-1));
               }
             }
             
             currentShape = Math.floor(Math.random() * SHAPES.length);
             piece = SHAPES[currentShape];
             px = Math.floor(COLS / 2) - Math.floor(piece[0].length / 2);
             py = -2;
           }
         }
         
         // Draw grid
         for (let y = 0; y < ROWS; y++) {
           for (let x = 0; x < COLS; x++) {
             if (grid[y][x] !== -1) {
               ctx.shadowBlur = 4;
               ctx.shadowColor = COLORS[grid[y][x]];
               ctx.fillStyle = COLORS[grid[y][x]];
               ctx.fillRect(ox + x * bs + 1, y * bs + 1, bs - 2, bs - 2);
             }
           }
         }
         
         // Draw current piece
         ctx.shadowBlur = 8;
         ctx.shadowColor = COLORS[currentShape];
         ctx.fillStyle = COLORS[currentShape];
         piece.forEach((row, y) => {
           row.forEach((val, x) => {
             if (val && py + y >= 0) {
               ctx.fillRect(ox + (px + x) * bs + 1, (py + y) * bs + 1, bs - 2, bs - 2);
             }
           });
         });
         
         ctx.shadowBlur = 0;
         
         requestAnimationFrame(tick);
       }
       tick();
     })();
     
      // Animated preview for Frogger
      (function() {
        const canvas = document.getElementById('froggerCanvas');
        const card = canvas.closest('.card-preview');
        canvas.width = card.offsetWidth || 320;
        canvas.height = card.offsetHeight || 180;
        const ctx = canvas.getContext('2d');
        
        const w = canvas.width, h = canvas.height;
        
        // Stars
        const stars = [];
        for (let i = 0; i < 30; i++) {
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h * 0.4,
            size: 0.3 + Math.random() * 1,
            alpha: 0.2 + Math.random() * 0.4,
            twinkle: Math.random() * Math.PI * 2
          });
        }
        
        // Moon
        const mx = w * 0.85;
        const my = 35;
        
        // Lanes
        const lanes = [
          { type: 'grass', y: 160 },
          { type: 'water', y: 130, objects: [{ x: 30, w: 50 }, { x: 120, w: 40 }] },
          { type: 'road', y: 100, objects: [{ x: 40, w: 25 }, { x: 150, w: 30 }] },
          { type: 'grass', y: 70 },
          { type: 'water', y: 40, objects: [{ x: 60, w: 45 }, { x: 180, w: 35 }] },
          { type: 'road', y: 10, objects: [{ x: 80, w: 20 }, { x: 200, w: 25 }] },
        ];
        
        let frogY = 170;
        let t = 0;
        
        function tick() {
          ctx.fillStyle = '#050510';
          ctx.fillRect(0, 0, w, h);
          t++;
          
          // Stars
          stars.forEach(s => {
            const tw = 0.5 + Math.sin(t * 0.05 + s.twinkle) * 0.5;
            ctx.fillStyle = `rgba(255,255,255,${s.alpha * tw})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
          });
          
          // Moon
          ctx.fillStyle = '#ffffcc';
          ctx.shadowColor = '#ffffcc';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(mx, my, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#050510';
          ctx.beginPath();
          ctx.arc(mx + 4, my - 2, 11, 0, Math.PI * 2);
          ctx.fill();
          
          // Lanes
          lanes.forEach(lane => {
            if (lane.type === 'grass') {
              ctx.fillStyle = '#103010';
              ctx.fillRect(0, lane.y, w, 30);
            } else if (lane.type === 'water') {
              ctx.fillStyle = '#0a2040';
              ctx.fillRect(0, lane.y, w, 30);
              lane.objects.forEach(o => {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(o.x, lane.y + 8, o.w, 14);
              });
            } else if (lane.type === 'road') {
              ctx.fillStyle = '#222';
              ctx.fillRect(0, lane.y, w, 30);
              ctx.strokeStyle = 'rgba(255,255,255,0.1)';
              ctx.setLineDash([10, 10]);
              ctx.beginPath();
              ctx.moveTo(0, lane.y + 15);
              ctx.lineTo(w, lane.y + 15);
              ctx.stroke();
              ctx.setLineDash([]);
              lane.objects.forEach(o => {
                ctx.fillStyle = '#ff3344';
                ctx.shadowColor = '#ff3344';
                ctx.shadowBlur = 4;
                ctx.fillRect(o.x, lane.y + 10, o.w, 10);
                ctx.shadowBlur = 0;
              });
            }
          });
          
          // Frog
          if (t % 50 === 0) {
            frogY -= 20;
            if (frogY < 10) frogY = 170;
          }
          const bounce = t % 50 < 10 ? 3 : 0;
          
          ctx.fillStyle = '#39ff14';
          ctx.shadowColor = '#39ff14';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.ellipse(w/2, frogY + bounce, 10, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(w/2 - 4, frogY - 5 + bounce, 3, 0, Math.PI * 2);
          ctx.arc(w/2 + 4, frogY - 5 + bounce, 3, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(w/2 - 4, frogY - 5 + bounce, 1.5, 0, Math.PI * 2);
          ctx.arc(w/2 + 4, frogY - 5 + bounce, 1.5, 0, Math.PI * 2);
          ctx.fill();
          
          requestAnimationFrame(tick);
        }
        tick();
      })();
      
      // Animated preview for SPACE ALIENS
      (function() {
        const canvas = document.getElementById('spaceinvadersCanvas');
        const card = canvas.closest('.card-preview');
        canvas.width = card.offsetWidth || 320;
        canvas.height = card.offsetHeight || 180;
        const ctx = canvas.getContext('2d');
        
        const rows = 4;
        const aw = 18, ah = 12, pad = 8;
        const maxWidth = canvas.width - 60;
        const cols = Math.max(6, Math.floor(maxWidth / (aw + pad)));
        const totalW = cols * (aw + pad) - pad;
        const startX = (canvas.width - totalW) / 2;
        
        const aliens = [];
        
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            aliens.push({
              x: startX + c * (aw + pad),
              y: 30 + r * (ah + pad),
              type: r,
            });
          }
        }
        
        let dir = 1;
        let t = 0;
        
        function tick() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          t++;
          
          // Starfield
          ctx.fillStyle = 'rgba(57, 255, 20, 0.1)';
          for (let i = 0; i < 20; i++) {
            const sx = (i * 17 + t * 0.2) % canvas.width;
            const sy = (i * 23) % canvas.height;
            ctx.fillRect(sx, sy, 1, 1);
          }
          
          // Move aliens
          if (t % 30 === 0) {
            let minX = canvas.width, maxX = 0;
            aliens.forEach(a => {
              minX = Math.min(minX, a.x);
              maxX = Math.max(maxX, a.x + aw);
            });
            if (maxX >= canvas.width - 10 || minX <= 10) dir *= -1;
            aliens.forEach(a => a.x += dir * 5);
          }
          
          // Draw aliens
          const colors = ['#ff00ff', '#ff8800', '#00f5ff', '#ffff00'];
          aliens.forEach((a, i) => {
            const col = colors[a.type % colors.length];
            ctx.shadowColor = col;
            ctx.shadowBlur = 6;
            ctx.fillStyle = col;
            
            // Simple alien shape
            const bx = a.x + aw/2;
            const by = a.y + ah/2;
            ctx.beginPath();
            ctx.moveTo(bx, by - 5);
            ctx.lineTo(bx + 6, by + 2);
            ctx.lineTo(bx + 4, by + 5);
            ctx.lineTo(bx - 4, by + 5);
            ctx.lineTo(bx - 6, by + 2);
            ctx.closePath();
            ctx.fill();
          });
          
          // Player ship
          const px = canvas.width / 2 + Math.sin(t * 0.05) * 30;
          const py = canvas.height - 25;
          ctx.shadowColor = '#39ff14';
          ctx.shadowBlur = 8;
          ctx.fillStyle = '#39ff14';
          ctx.fillRect(px - 3, py, 6, 6);
          ctx.fillRect(px - 10, py + 6, 20, 4);
          ctx.fillRect(px - 15, py + 10, 30, 2);
          
          ctx.shadowBlur = 0;
          
          requestAnimationFrame(tick);
        }
        tick();
      })();

      // Animated preview for NEON 2048
      (function() {
        const canvas = document.getElementById('game2048Canvas');
        const card = canvas.closest('.card-preview');
        canvas.width = card.offsetWidth || 320;
        canvas.height = card.offsetHeight || 180;
        const ctx = canvas.getContext('2d');

        const SIZE = 4;
        let grid = [
          [2, 4, 0, 0],
          [0, 2, 4, 0],
          [0, 0, 2, 0],
          [0, 0, 0, 0],
        ];
        let t = 0;

        const COLORS = {
          2: '#00f5ff',
          4: '#ff00ff',
          8: '#ff8800',
          16: '#39ff14',
        };

        function drawGrid() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const gap = 6;
          const cell = (canvas.width - gap * (SIZE + 1)) / SIZE;

          for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
              const value = grid[y][x];
              const px = gap + x * (cell + gap);
              const py = gap + y * (cell + gap);
              ctx.fillStyle = value ? `${COLORS[value] || '#ff8800'}33` : 'rgba(255,255,255,0.04)';
              ctx.fillRect(px, py, cell, cell);
              if (!value) continue;
              ctx.shadowColor = COLORS[value] || '#ff8800';
              ctx.shadowBlur = 8;
              ctx.fillStyle = COLORS[value] || '#ff8800';
              ctx.font = 'bold 11px Orbitron';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(value), px + cell / 2, py + cell / 2);
              ctx.shadowBlur = 0;
            }
          }
        }

        function tick() {
          t++;
          if (t % 45 === 0) {
            for (let y = 0; y < SIZE; y++) {
              const line = grid[y];
              const filtered = line.filter((v) => v !== 0);
              while (filtered.length < SIZE) filtered.push(0);
              grid[y] = filtered;
            }
            const empty = [];
            for (let y = 0; y < SIZE; y++) {
              for (let x = 0; x < SIZE; x++) {
                if (grid[y][x] === 0) empty.push({ x, y });
              }
            }
            if (empty.length) {
              const spot = empty[Math.floor(Math.random() * empty.length)];
              grid[spot.y][spot.x] = Math.random() < 0.8 ? 2 : 4;
            }
          }
          drawGrid();
          requestAnimationFrame(tick);
        }
        tick();
      })();

      // Animated preview for STACK TOWER
      (function() {
        const canvas = document.getElementById('stacktowerCanvas');
        const card = canvas.closest('.card-preview');
        canvas.width = card.offsetWidth || 320;
        canvas.height = card.offsetHeight || 180;
        const ctx = canvas.getContext('2d');

        const COLORS = ['#00f5ff', '#ff00ff', '#ff8800', '#39ff14', '#ffff00'];
        const blocks = [];
        let mover = { x: 20, w: 90, dir: 1 };
        let t = 0;

        for (let i = 0; i < 5; i++) {
          blocks.push({
            x: 40 + i * 2,
            y: canvas.height - 18 - i * 14,
            w: 90 - i * 6,
            color: COLORS[i % COLORS.length],
          });
        }

        function tick() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          t++;

          mover.x += mover.dir * 1.8;
          if (mover.x < 10 || mover.x + mover.w > canvas.width - 10) mover.dir *= -1;

          blocks.forEach((b) => {
            ctx.shadowColor = b.color;
            ctx.shadowBlur = 8;
            ctx.fillStyle = b.color + '55';
            ctx.fillRect(b.x, b.y, b.w, 12);
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, b.w, 3);
          });

          const top = blocks[blocks.length - 1];
          const y = top.y - 16;
          const color = COLORS[blocks.length % COLORS.length];
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
          ctx.fillStyle = color + '88';
          ctx.fillRect(mover.x, y, top.w, 12);
          ctx.fillStyle = color;
          ctx.fillRect(mover.x, y, top.w, 3);
          ctx.shadowBlur = 0;

          if (t % 55 === 0 && blocks.length < 8) {
            blocks.push({
              x: mover.x,
              y: top.y - 14,
              w: top.w - 4,
              color,
            });
            mover.w = top.w - 4;
          }

          requestAnimationFrame(tick);
        }
        tick();
      })();

      // Animated preview for THRUST RUNNER
      (function() {
        const canvas = document.getElementById('thrustrunnerCanvas');
        const card = canvas.closest('.card-preview');
        canvas.width = card.offsetWidth || 320;
        canvas.height = card.offsetHeight || 180;
        const ctx = canvas.getContext('2d');

        const ACCENT = '#ff6600';
        const w = canvas.width;
        const h = canvas.height;
        let t = 0;
        let scroll = 0;

        function tick() {
          ctx.clearRect(0, 0, w, h);
          t += 0.04;
          scroll += 1.2;

          const playerX = w * 0.32;
          const playerY = h / 2 + Math.sin(t) * 18;

          // Tunnel walls
          ctx.fillStyle = 'rgba(255, 102, 0, 0.35)';
          ctx.strokeStyle = 'rgba(255, 102, 0, 0.7)';
          ctx.lineWidth = 2;
          for (let i = -1; i < 12; i++) {
            const sx = ((i * 28 - scroll * 0.8) % (w + 28) + w + 28) % (w + 28) - 14;
            const topH = 28 + Math.sin(i * 0.7 + t * 0.5) * 12;
            const botH = 28 + Math.cos(i * 0.9 + t * 0.4) * 12;
            ctx.fillRect(sx, 0, 6, topH);
            ctx.fillRect(sx, h - botH, 6, botH);
          }

          // Thrust particles
          for (let i = 0; i < 4; i++) {
            const px = playerX - 16 - i * 5 - Math.sin(t * 3 + i) * 3;
            const py = playerY + Math.sin(t * 2 + i) * 4;
            ctx.fillStyle = i % 2 ? '#ffcc00' : ACCENT;
            ctx.shadowColor = ACCENT;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(px, py, 2 + Math.random(), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.shadowBlur = 0;

          // Player capsule
          ctx.shadowColor = ACCENT;
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#1a0d00';
          ctx.strokeStyle = ACCENT;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(playerX - 10, playerY - 8, 20, 16, 5);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = ACCENT;
          ctx.fillRect(playerX - 3, playerY - 4, 6, 3);
          ctx.shadowBlur = 0;

          requestAnimationFrame(tick);
        }
        tick();
      })();

      // Animated preview for PRISM CASCADE
      (function() {
        const canvas = document.getElementById('prismcascadeCanvas');
        if (!canvas) return;
        const card = canvas.closest('.card-preview');
        canvas.width = card.offsetWidth || 320;
        canvas.height = card.offsetHeight || 180;
        const ctx = canvas.getContext('2d');

        const PREVIEW_SIZE = 4;
        const GEM_COLORS = ['#00f5ff', '#ff00ff', '#39ff14', '#ffff00', '#ff8800', '#aa00ff'];
        const SHAPES = ['circle', 'diamond', 'triangle', 'hex', 'star', 'square'];
        const grid = [];
        let t = 0;
        let matchCell = { r: 1, c: 2 };
        let matchPhase = 0;
        let particles = [];

        for (let r = 0; r < PREVIEW_SIZE; r++) {
          grid[r] = [];
          for (let c = 0; c < PREVIEW_SIZE; c++) {
            grid[r][c] = (r * PREVIEW_SIZE + c) % 6;
          }
        }

        function cellPos(r, c) {
          const pad = 14;
          const size = Math.min(canvas.width, canvas.height) - pad * 2;
          const cell = size / PREVIEW_SIZE;
          return {
            x: pad + c * cell + cell / 2,
            y: pad + r * cell + cell / 2,
            s: cell * 0.72,
          };
        }

        function drawShape(type, x, y, s, color, alpha, glow) {
          ctx.save();
          ctx.globalAlpha = alpha == null ? 1 : alpha;
          ctx.shadowColor = color;
          ctx.shadowBlur = glow || 8;
          ctx.fillStyle = color;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          if (type === 'circle') {
            ctx.arc(x, y, s * 0.42, 0, Math.PI * 2);
            ctx.fill();
          } else if (type === 'diamond') {
            ctx.moveTo(x, y - s * 0.45);
            ctx.lineTo(x + s * 0.38, y);
            ctx.lineTo(x, y + s * 0.45);
            ctx.lineTo(x - s * 0.38, y);
            ctx.closePath();
            ctx.fill();
          } else if (type === 'triangle') {
            ctx.moveTo(x, y - s * 0.42);
            ctx.lineTo(x + s * 0.4, y + s * 0.32);
            ctx.lineTo(x - s * 0.4, y + s * 0.32);
            ctx.closePath();
            ctx.fill();
          } else if (type === 'hex') {
            for (let i = 0; i < 6; i++) {
              const a = (Math.PI / 3) * i - Math.PI / 6;
              const px = x + Math.cos(a) * s * 0.4;
              const py = y + Math.sin(a) * s * 0.4;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
          } else if (type === 'star') {
            for (let i = 0; i < 10; i++) {
              const a = (Math.PI / 5) * i - Math.PI / 2;
              const rad = i % 2 ? s * 0.18 : s * 0.42;
              const px = x + Math.cos(a) * rad;
              const py = y + Math.sin(a) * rad;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
          } else {
            const hs = s * 0.36;
            ctx.roundRect(x - hs, y - hs, hs * 2, hs * 2, 5);
            ctx.fill();
          }
          ctx.restore();
        }

        function spawnParticles(x, y, color) {
          for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            particles.push({
              x, y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1,
              color,
              size: 2 + Math.random() * 2,
            });
          }
        }

        function tick() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          t++;

          if (t % 90 === 0) {
            matchCell = {
              r: Math.floor(Math.random() * PREVIEW_SIZE),
              c: Math.floor(Math.random() * PREVIEW_SIZE),
            };
            matchPhase = 0;
          }

          if (matchPhase < 30) matchPhase++;

          for (let r = 0; r < PREVIEW_SIZE; r++) {
            for (let c = 0; c < PREVIEW_SIZE; c++) {
              const type = grid[r][c];
              const pos = cellPos(r, c);
              const color = GEM_COLORS[type];
              const shape = SHAPES[type];
              let alpha = 1;
              let glow = 8;
              if (r === matchCell.r && c === matchCell.c) {
                if (matchPhase > 0 && matchPhase < 12) {
                  glow = 16 + matchPhase;
                  alpha = 1;
                } else if (matchPhase >= 12 && matchPhase < 22) {
                  alpha = 1 - (matchPhase - 12) / 10;
                  glow = 20;
                } else if (matchPhase === 22) {
                  spawnParticles(pos.x, pos.y, color);
                  grid[r][c] = Math.floor(Math.random() * 6);
                }
              }
              if (alpha > 0.05) drawShape(shape, pos.x, pos.y, pos.s, color, alpha, glow);
            }
          }

          particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.04;
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
          particles = particles.filter((p) => p.life > 0);

          requestAnimationFrame(tick);
        }
        tick();
      })();



