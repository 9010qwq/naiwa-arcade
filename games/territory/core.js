/* Territory rules. No DOM, rendering, audio or persistence. */
(function (root) {
  'use strict';
  const W = 40, H = 32, PLAYER_SPEED = 10, ENEMY_RADIUS = 0.32;
  const levels = [
    { name: '桌布一角', target: 0.60, timeLimit: 100, start: [6, 1],
      platforms: [], enemies: [[13.5, 17.5, 1.48, 1.08], [32.5, 24.5, -1.3, 1.35]],
      gas: [[9, 1], [6, 8], [17, 15], [30, 25], [26, 8]] },
    { name: '纸板半岛', target: 0.65, timeLimit: 110, start: [1, 15],
      platforms: [[2, 14, 8, 16]], enemies: [[16.5, 8.5, 1.68, 1.16], [29.5, 18.5, -1.48, 1.56], [19.5, 26.5, 1.6, -1.36]],
      gas: [[5, 15], [9, 8], [15, 23], [28, 11], [30, 25]] },
    { name: '笑占全桌', target: 0.70, timeLimit: 120, start: [18, 6],
      platforms: [[17, 2, 20, 6], [31, 23, 37, 25]], enemies: [[9.5, 12.5, 1.76, 1.35], [29.5, 9.5, -1.64, 1.68], [15.5, 25.5, 1.65, -1.72], [29.5, 19.5, -1.74, -1.38]],
      gas: [[19, 5], [8, 8], [13, 20], [25, 15], [34, 24], [26, 27]] }
  ];
  const index = (s, x, y) => y * s.width + x;
  const same = (a, b) => a.x === b.x && a.y === b.y;
  const inside = (s, x, y) => x >= 0 && y >= 0 && x < s.width && y < s.height;
  const safe = (s, x, y) => inside(s, x, y) && s.grid[index(s, x, y)] === 1;
  const center = p => ({ x: p.x + 0.5, y: p.y + 0.5 });

  function feedback(s, type, text, ttl) {
    s.message = text;
    s.feedback = { type, text, ttl: ttl === undefined ? 2.6 : ttl };
    s.eventId += 1;
  }

  function createState(levelIndex, options) {
    options = options || {};
    levelIndex = Math.max(0, Math.min(levels.length - 1, Math.floor(Number(levelIndex) || 0)));
    const level = levels[levelIndex];
    const grid = new Array(W * H).fill(0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) grid[y * W + x] = 1;
    }
    level.platforms.forEach(([x0, y0, x1, y1]) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y * W + x] = 1;
    });
    const initialWild = grid.map(v => v === 0);
    const player = { x: level.start[0], y: level.start[1] };
    return {
      width: W, height: H, levelIndex, name: level.name, grid,
      initialWild, initialWildCount: initialWild.filter(Boolean).length,
      player, anchor: { ...player }, trail: [],
      enemies: level.enemies.map(([x, y, vx, vy], i) => ({
        id: i, x, y, vx, vy, radius: ENEMY_RADIUS,
        speed: Math.hypot(vx, vy), stun: 0, repelled: 0
      })),
      gas: level.gas.map(([x, y], i) => ({ id: i, x, y, collected: false })),
      status: 'playing', elapsed: 0, timeLimit: level.timeLimit,
      lives: 3, claimed: 0, target: level.target, energy: 0, cooldown: 0,
      grace: levelIndex === 0 ? 10 : 3, invulnerable: 0, laughPulse: 0,
      closures: 0, lastClaim: 0, lastClaimAt: -10, failures: 0, eventId: 0,
      feedback: { type: 'tutorial', text: '离开绿色安全地画线，再接回安全地。', ttl: 8 },
      message: '离开绿色安全地画线，再接回安全地。',
      _moveClock: 1 / PLAYER_SPEED
    };
  }

  // Progress excludes every cell that was safe at the start of this map.
  function area(s) {
    let count = 0;
    for (let i = 0; i < s.grid.length; i++) if (s.initialWild[i] && s.grid[i] === 1) count++;
    return s.initialWildCount ? count / s.initialWildCount : 0;
  }

  function pointSegmentDistance2(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay, length2 = vx * vx + vy * vy;
    const t = length2 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / length2)) : 0;
    const x = ax + t * vx, y = ay + t * vy;
    return (px - x) ** 2 + (py - y) ** 2;
  }
  function segmentDistance2(ax, ay, bx, by, cx, cy, dx, dy) {
    const ux = bx - ax, uy = by - ay, vx = dx - cx, vy = dy - cy;
    const cross = ux * vy - uy * vx;
    if (Math.abs(cross) > 1e-10) {
      const wx = cx - ax, wy = cy - ay;
      const t = (wx * vy - wy * vx) / cross;
      const u = (wx * uy - wy * ux) / cross;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0;
    }
    return Math.min(pointSegmentDistance2(ax, ay, cx, cy, dx, dy),
      pointSegmentDistance2(bx, by, cx, cy, dx, dy),
      pointSegmentDistance2(cx, cy, ax, ay, bx, by),
      pointSegmentDistance2(dx, dy, ax, ay, bx, by));
  }
  function trailPoints(s) {
    if (!s.trail.length) return [];
    const points = [center(s.anchor), ...s.trail.map(center)];
    if (!same(s.player, s.trail[s.trail.length - 1])) points.push(center(s.player));
    return points;
  }
  function traceHits(s, ax, ay, bx, by, radius) {
    const points = trailPoints(s), threshold2 = (radius + 0.11) ** 2;
    for (let i = 1; i < points.length; i++) {
      const p = points[i - 1], q = points[i];
      if (segmentDistance2(ax, ay, bx, by, p.x, p.y, q.x, q.y) <= threshold2) return true;
    }
    return false;
  }
  function enemyOnTrail(s) {
    return s.enemies.some(e => traceHits(s, e.x, e.y, e.x, e.y, e.radius || ENEMY_RADIUS));
  }

  function collectGas(s) {
    for (const gas of s.gas) {
      if (!gas.collected && s.energy < 2 && gas.x === s.player.x && gas.y === s.player.y) {
        gas.collected = true;
        s.energy++;
        feedback(s, 'gas', '笑气 +1！空格 / 大笑把附近巡游者推开。');
      }
    }
  }

  function loseLife(s, reason) {
    if (s.status !== 'playing' || s.invulnerable > 0) return false;
    s.lives = Math.max(0, s.lives - 1);
    s.failures++;
    s.trail = [];
    s.player = { ...s.anchor };
    s._moveClock = 0;
    s.invulnerable = 1.5;
    if (s.lives === 0) {
      s.status = 'lost';
      s.lossReason = 'lives';
      feedback(s, 'lost', '三次断线。重来这一关，再圈一次！', 99);
    } else feedback(s, 'hurt', reason || '线路被撞断了。已回到安全地，原有领地保留。');
    return true;
  }

  function closeTrail(s) {
    if (s.status !== 'playing' || !s.trail.length) return false;
    if (!safe(s, s.player.x, s.player.y)) return false;
    // A closure cannot bury an enemy, including during the brief recovery shield.
    const overlapsFutureCell = s.enemies.some(e => s.trail.some(p => {
      const nx = Math.max(p.x, Math.min(p.x + 1, e.x));
      const ny = Math.max(p.y, Math.min(p.y + 1, e.y));
      return (e.x - nx) ** 2 + (e.y - ny) ** 2 < (e.radius || ENEMY_RADIUS) ** 2;
    }));
    if (enemyOnTrail(s) || overlapsFutureCell) {
      if (!loseLife(s, '接线处有巡游者，线路断了！')) {
        s.trail = [];
        s.player = { ...s.anchor };
        feedback(s, 'blocked', '巡游者正压着线路；保护期已收回这条线。');
      }
      return false;
    }
    const before = area(s);
    s.trail.forEach(p => { s.grid[index(s, p.x, p.y)] = 1; });
    const seen = new Uint8Array(s.grid.length), queue = [];
    // Seed ALL enemy components. A divided region with any enemy stays wild.
    for (const enemy of s.enemies) {
      const x = Math.floor(enemy.x), y = Math.floor(enemy.y);
      if (!inside(s, x, y)) continue;
      const i = index(s, x, y);
      if (s.grid[i] === 0 && !seen[i]) { seen[i] = 1; queue.push(i); }
    }
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head], x = i % s.width, y = Math.floor(i / s.width);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!inside(s, nx, ny)) continue;
        const ni = index(s, nx, ny);
        if (!seen[ni] && s.grid[ni] === 0) { seen[ni] = 1; queue.push(ni); }
      }
    }
    for (let i = 0; i < s.grid.length; i++) if (s.grid[i] === 0 && !seen[i]) s.grid[i] = 1;
    s.trail = [];
    s.anchor = { ...s.player };
    s.claimed = area(s);
    s.lastClaim = Math.round((s.claimed - before) * s.initialWildCount);
    s.lastClaimAt = s.elapsed;
    s.closures++;
    if (s.levelIndex === 0 && s.closures === 1) s.grace = Math.min(s.grace, 1.5);
    if (s.claimed + 1e-10 >= s.target) {
      s.status = 'won';
      feedback(s, 'won', '这块地，你笑了！', 99);
    } else feedback(s, 'claim', '接回成功！领地 +' + ((s.claimed - before) * 100).toFixed(1) + '%');
    return true;
  }

  function movePlayer(s, dx, dy) {
    if (s.status !== 'playing') return false;
    dx = Math.sign(Number(dx) || 0); dy = Math.sign(Number(dy) || 0);
    if (dx && dy) dy = 0;
    if (!dx && !dy) return false;
    const next = { x: s.player.x + dx, y: s.player.y + dy };
    if (!inside(s, next.x, next.y)) return false;
    const n = s.trail.length;
    if (n) {
      const previous = n === 1 ? s.anchor : s.trail[n - 2];
      if (same(next, previous)) {
        s.trail.pop(); s.player = next; collectGas(s); return true;
      }
      if (s.trail.some(p => same(p, next))) {
        feedback(s, 'blocked', '线路不能交叉。反方向走可以原路收线。', 1.2);
        return false;
      }
    }
    s.player = next;
    if (safe(s, next.x, next.y)) {
      if (n) closeTrail(s);
      else s.anchor = { ...next };
    } else {
      s.trail.push({ ...next });
      if (s.invulnerable <= 0 && enemyOnTrail(s)) loseLife(s, '巡游者碰到新画的线路！');
    }
    if (s.status === 'playing') collectGas(s);
    return true;
  }

  function nearestTrailPoint(s, enemy) {
    const points = trailPoints(s);
    if (!points.length) return center(s.player);
    let best = points[0], bestD = Infinity;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], dx = b.x - a.x, dy = b.y - a.y;
      const l2 = dx * dx + dy * dy;
      const t = l2 ? Math.max(0, Math.min(1, ((enemy.x - a.x) * dx + (enemy.y - a.y) * dy) / l2)) : 0;
      const p = { x: a.x + t * dx, y: a.y + t * dy };
      const d = (enemy.x - p.x) ** 2 + (enemy.y - p.y) ** 2;
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }
  function laugh(s) {
    if (s.status !== 'playing') return false;
    if (s.cooldown > 0) return false;
    if (!s.energy) { feedback(s, 'empty', '先碰到笑气泡，再放声大笑。', 1.2); return false; }
    s.energy--;
    s.cooldown = 8;
    s.laughPulse = 0.65;
    let affected = 0;
    for (const enemy of s.enemies) {
      const p = nearestTrailPoint(s, enemy);
      let dx = enemy.x - p.x, dy = enemy.y - p.y, distance = Math.hypot(dx, dy);
      if (distance > 8) continue;
      if (distance < 0.001) { dx = -enemy.vy; dy = enemy.vx; distance = Math.hypot(dx, dy) || 1; }
      const speed = enemy.speed || Math.hypot(enemy.vx, enemy.vy) || 2;
      enemy.vx = dx / distance * speed;
      enemy.vy = dy / distance * speed;
      enemy.stun = 0.18;
      enemy.repelled = 1.3;
      affected++;
    }
    feedback(s, 'laugh', affected ? '哈哈哈！附近巡游者离线后退。' : '哈哈哈！附近没有巡游者。');
    return true;
  }

  function canOccupy(s, x, y, radius) {
    if (x - radius < 0 || y - radius < 0 || x + radius >= s.width || y + radius >= s.height) return false;
    for (let gy = Math.floor(y - radius); gy <= Math.floor(y + radius); gy++) {
      for (let gx = Math.floor(x - radius); gx <= Math.floor(x + radius); gx++) {
        if (!inside(s, gx, gy) || s.grid[index(s, gx, gy)] !== 1) continue;
        const nearX = Math.max(gx, Math.min(gx + 1, x));
        const nearY = Math.max(gy, Math.min(gy + 1, y));
        if ((nearX - x) ** 2 + (nearY - y) ** 2 < radius * radius - 1e-9) return false;
      }
    }
    return true;
  }
  function moveEnemies(s, dt) {
    if (s.grace > 0) return;
    for (const e of s.enemies) {
      e.stun = Math.max(0, e.stun - dt);
      e.repelled = Math.max(0, e.repelled - dt);
      if (e.stun > 0) continue;
      const multiplier = e.repelled > 0 ? 1.35 : 1;
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(e.vx), Math.abs(e.vy)) * multiplier * dt / 0.10));
      const h = dt / steps;
      for (let j = 0; j < steps; j++) {
        const ox = e.x, oy = e.y, r = e.radius || ENEMY_RADIUS;
        const nx = e.x + e.vx * h * multiplier;
        if (canOccupy(s, nx, e.y, r)) e.x = nx;
        else e.vx *= -1;
        if (s.invulnerable <= 0 && traceHits(s, ox, oy, e.x, e.y, r)) {
          loseLife(s, '巡游者碰断了线路！已返回安全地。'); break;
        }
        const midX = e.x, midY = e.y;
        const ny = e.y + e.vy * h * multiplier;
        if (canOccupy(s, e.x, ny, r)) e.y = ny;
        else e.vy *= -1;
        if (s.invulnerable <= 0 && traceHits(s, midX, midY, e.x, e.y, r)) {
          loseLife(s, '巡游者碰断了线路！已返回安全地。'); break;
        }
      }
      if (s.status !== 'playing') return;
    }
  }

  function step(s, dt, input) {
    if (s.status !== 'playing') return s;
    dt = Math.max(0, Math.min(0.1, Number(dt) || 0));
    if (!dt) return s;
    input = input || {};
    s.elapsed += dt;
    s.cooldown = Math.max(0, s.cooldown - dt);
    s.grace = Math.max(0, s.grace - dt);
    s.invulnerable = Math.max(0, s.invulnerable - dt);
    s.laughPulse = Math.max(0, s.laughPulse - dt);
    s.feedback.ttl = Math.max(0, s.feedback.ttl - dt);
    if (s.elapsed + 1e-9 >= s.timeLimit) {
      s.elapsed = s.timeLimit;
      s.status = 'lost'; s.lossReason = 'time';
      feedback(s, 'lost', '时间到！换条更大胆的线路再来。', 99);
      return s;
    }
    if (input.laugh) laugh(s);
    let dx = Math.sign(Number(input.dx) || 0), dy = Math.sign(Number(input.dy) || 0);
    if (dx && dy) dy = 0;
    if (dx || dy) {
      s._moveClock += dt;
      while (s._moveClock + 1e-9 >= 1 / PLAYER_SPEED && s.status === 'playing') {
        s._moveClock -= 1 / PLAYER_SPEED;
        movePlayer(s, dx, dy);
      }
    } else s._moveClock = 1 / PLAYER_SPEED;
    if (s.status === 'playing') moveEnemies(s, dt);
    return s;
  }

  const api = { W, H, levels, createState, step, movePlayer, closeTrail, laugh, area, loseLife };
  root.TerritoryCore = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
