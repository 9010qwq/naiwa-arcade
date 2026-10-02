/* Original simulation code. Character/IP rights are documented separately. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LibrarySim = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const W = 900, H = 600, STEP = 1 / 60, R = 14, CELL = 20;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const shelf = (x, y, w, h, label) => ({ x, y, w, h, label });
  const card = (x, y, id) => ({ x, y, id });
  const noise = (x, y, r, type, label, period, duration, phase) => ({ x, y, r, type, label, period, duration, phase });
  const patrol = (path, extra) => Object.assign({ kind: 'patrol', path: path.map(p => ({ x: p[0], y: p[1] })), speed: 43, range: 220, fov: 1.5 }, extra);
  const sentry = (x, y, angle, extra) => Object.assign({ kind: 'sentry', x, y, angle, speed: 46, range: 250, fov: 1.4, sweep: .5 }, extra);
  const levels = [
    {
      name: '轻声借阅区', subtitle: '先学会：笑可以，别被盯住。',
      tutorial: '点地面绕书架移动；依次拿 ①②③，再到出口。憋笑会慢行，也会憋得更快。',
      hint: '外侧走廊宽而安全；中间过道更短。翻书的白色声圈亮起时，圈内放声不会引人。',
      spawn: { x: 80, y: 520 }, exit: { x: 830, y: 75, r: 33 },
      walls: [shelf(220, 150, 160, 90, '文学'), shelf(515, 150, 160, 90, '艺术'), shelf(220, 360, 160, 85, '历史'), shelf(515, 360, 160, 85, '哲学')],
      cards: [card(100, 90, '1'), card(775, 485, '2'), card(565, 80, '3')],
      signs: [{ x: 440, y: 300, text: '禁止对《如何不笑》发笑' }],
      noise: [noise(120, 285, 110, 'page', '翻书', 9, 3.8, 0), noise(775, 490, 105, 'cart', '推车', 11, 4.2, 4), noise(440, 75, 95, 'stamp', '盖章', 8, 3.2, 2)],
      guards: [patrol([[430, 190], [430, 415]], { speed: 38, range: 180, fov: 1.3 })]
    },
    {
      name: '期刊阅览室', subtitle: '翻书、推车、盖章，都是你的掩护。',
      tutorial: '看声圈的倒计时，亮起再放声。爆笑前有预告；憋笑不能无限维持。',
      hint: '上侧与外侧是慢路；抄中间近路，要读巡逻员的视线。',
      spawn: { x: 80, y: 520 }, exit: { x: 825, y: 78, r: 33 },
      walls: [shelf(205, 150, 190, 90, '昨日新闻'), shelf(500, 150, 170, 90, '冷笑话'), shelf(205, 360, 190, 85, '时尚'), shelf(500, 360, 170, 85, '科学')],
      cards: [card(95, 80, '1'), card(785, 495, '2'), card(565, 80, '3')],
      signs: [{ x: 445, y: 305, text: '本刊每周八更新' }, { x: 770, y: 275, text: '逾期请向书道歉' }],
      noise: [noise(115, 270, 105, 'page', '翻书', 10, 3.5, 2), noise(780, 480, 100, 'cart', '推车', 12, 4.5, 7), noise(435, 75, 100, 'stamp', '盖章', 8, 3, 1)],
      guards: [patrol([[440, 160], [440, 430]], { range: 205 }), sentry(760, 305, Math.PI, { range: 215, fov: 1.15, sweep: .6 })]
    },
    {
      name: '绝对安静特藏室', subtitle: '让他去查笑声，你从另一边过去。',
      tutorial: '在书架背后放声，再离开原地。巡视员会去笑声来源调查；中间捷径就空了。',
      hint: '①后在左下标语处放声，绕左侧书架撤离，再从中门拿②。也能走最外圈。',
      spawn: { x: 75, y: 520 }, exit: { x: 825, y: 75, r: 33 },
      walls: [shelf(205, 140, 190, 95, '不可外借'), shelf(205, 365, 190, 90, '不可内借'), shelf(525, 105, 115, 150, '绝密上卷'), shelf(525, 355, 115, 150, '绝密下卷')],
      cards: [card(105, 90, '1'), card(785, 305, '2'), card(435, 80, '3')],
      signs: [{ x: 430, y: 465, text: '请在此憋笑' }, { x: 725, y: 305, text: '此处没有秘密' }],
      noise: [noise(110, 285, 105, 'page', '翻书', 10, 3.4, 1), noise(785, 490, 100, 'cart', '推车', 11, 4, 5), noise(430, 75, 95, 'stamp', '盖章', 9, 3, 0)],
      guards: [sentry(700, 305, Math.PI, { range: 330, fov: 1.6, sweep: .15, speed: 57, investigationDuration: 7.8 }), patrol([[710, 465], [815, 465]], { speed: 35, range: 170, fov: 1.1 })]
    },
    {
      name: '闭馆前最后一站', subtitle: '把借书卡带出去，笑声留到门外。',
      tutorial: '两种巡视同时出现。借噪声卸掉笑意，或用笑声把巡视员引开；最后再去出口。',
      hint: '外圈能绕开中央双人巡逻。中路更快，右侧盖章区可释放笑意，诱导前先选好撤离方向。',
      spawn: { x: 75, y: 520 }, exit: { x: 825, y: 78, r: 33 },
      walls: [shelf(205, 150, 170, 90, '失而复得'), shelf(510, 150, 170, 90, '得而复失'), shelf(205, 365, 170, 80, '明天再来'), shelf(510, 365, 170, 80, '今日闭麦')],
      cards: [card(95, 80, '1'), card(780, 505, '2'), card(435, 80, '3')],
      signs: [{ x: 430, y: 305, text: '闭馆后书会自己下班' }, { x: 780, y: 275, text: '本馆禁止突然不笑' }],
      noise: [noise(110, 280, 100, 'page', '翻书', 9, 3.4, 3), noise(435, 505, 115, 'cart', '推车', 11, 4.2, 2), noise(780, 490, 105, 'stamp', '盖章', 8, 3, 4)],
      guards: [patrol([[425, 170], [425, 415]], { speed: 47, range: 220, fov: 1.4 }), sentry(760, 300, Math.PI, { range: 250, fov: 1.2, sweep: .65 })]
    }
  ];

  // A single collision representation is shared by movement, navigation and vision.
  function blocked(level, x, y, radius = R) {
    if (x < 22 + radius || x > W - 22 - radius || y < 22 + radius || y > H - 22 - radius) return true;
    return level.walls.some(w => x > w.x - radius && x < w.x + w.w + radius && y > w.y - radius && y < w.y + w.h + radius);
  }
  function segmentRect(a, b, w, pad = 0) {
    let lo = 0, hi = 1;
    const dx = b.x - a.x, dy = b.y - a.y;
    const p = [-dx, dx, -dy, dy];
    const q = [a.x - w.x + pad, w.x + w.w + pad - a.x, a.y - w.y + pad, w.y + w.h + pad - a.y];
    for (let i = 0; i < 4; i++) {
      if (Math.abs(p[i]) < 1e-9) { if (q[i] < 0) return false; }
      else { const t = q[i] / p[i]; if (p[i] < 0) lo = Math.max(lo, t); else hi = Math.min(hi, t); if (lo > hi) return false; }
    }
    return true;
  }
  function clearLine(level, a, b, radius = 0) { return !level.walls.some(w => segmentRect(a, b, w, radius)); }
  function findPath(level, a, target, radius = R) {
    const goal = { x: clamp(target.x, 22 + radius, W - 22 - radius), y: clamp(target.y, 22 + radius, H - 22 - radius) };
    if (blocked(level, goal.x, goal.y, radius)) return null;
    if (clearLine(level, a, goal, radius + 1)) return [goal];
    const cols = W / CELL, rows = H / CELL, points = new Map();
    function nearest(p) {
      let best = null, score = Infinity;
      for (let y = Math.max(1, Math.floor(p.y / CELL) - 3); y <= Math.min(rows - 2, Math.floor(p.y / CELL) + 3); y++) {
        for (let x = Math.max(1, Math.floor(p.x / CELL) - 3); x <= Math.min(cols - 2, Math.floor(p.x / CELL) + 3); x++) {
          const n = { x: x * CELL + CELL / 2, y: y * CELL + CELL / 2, ix: x, iy: y, id: y * cols + x };
          const d = dist(n, p);
          if (d < score && !blocked(level, n.x, n.y, radius + 1) && clearLine(level, p, n, radius + 1)) { best = n; score = d; }
        }
      }
      return best;
    }
    const start = nearest(a), end = nearest(goal);
    if (!start || !end) return null;
    start.g = 0; start.f = dist(start, end); start.parent = null;
    const open = [start]; points.set(start.id, start); const closed = new Set();
    let found;
    for (let iteration = 0; open.length && iteration < 1600; iteration++) {
      let idx = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[idx].f) idx = i;
      const cur = open.splice(idx, 1)[0];
      if (cur.id === end.id) { found = cur; break; }
      closed.add(cur.id);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const ix = cur.ix + dx, iy = cur.iy + dy, id = iy * cols + ix;
        if (closed.has(id) || ix < 1 || ix >= cols - 1 || iy < 1 || iy >= rows - 1) continue;
        const n = points.get(id) || { id, ix, iy, x: ix * CELL + 10, y: iy * CELL + 10, g: Infinity };
        if (blocked(level, n.x, n.y, radius + 1) || !clearLine(level, cur, n, radius + 1)) continue;
        const g = cur.g + Math.hypot(dx, dy) * CELL;
        if (g < n.g) { n.g = g; n.f = g + dist(n, end); n.parent = cur; if (!points.has(id)) { points.set(id, n); open.push(n); } }
      }
    }
    if (!found) return null;
    const raw = [goal]; for (let n = found; n; n = n.parent) raw.unshift({ x: n.x, y: n.y });
    const smooth = []; let from = a, i = 0;
    while (i < raw.length) { let far = i; for (let j = i; j < raw.length; j++) { if (clearLine(level, from, raw[j], radius + 1)) far = j; else break; } smooth.push(raw[far]); from = raw[far]; i = far + 1; }
    return smooth.slice(0, 64);
  }
  function addEvent(s, type, x, y, text, ttl = 2.5, extra) { s.events.push(Object.assign({ id: ++s.eventId, type, x, y, text, ttl, duration: ttl }, extra)); if (s.events.length > 25) s.events.shift(); }
  function create(levelIndex = 0) {
    levelIndex = clamp(Math.floor(levelIndex), 0, levels.length - 1);
    const level = levels[levelIndex];
    const state = {
      levelIndex, level, mode: 'playing', time: 0, frame: 0, eventId: 0, events: [], cards: level.cards.map(c => Object.assign({}, c, { collected: false })), collected: 0, exitUnlocked: false,
      player: { x: level.spawn.x, y: level.spawn.y, r: R, target: null, path: [], hold: false, holding: false, moving: false, laugh: 22, burst: 0, cooldown: 0, covered: false, laughFlash: 0, angle: -Math.PI / 2 },
      guards: level.guards.map((g, id) => { const start = g.path ? g.path[0] : g; return Object.assign({}, g, { id, x: start.x, y: start.y, home: { x: start.x, y: start.y }, angle: g.angle || Math.PI / 2, baseAngle: g.angle || 0, alert: 0, mode: g.kind, route: g.path ? g.path.map(p => ({ ...p })) : [], path: [], routeIndex: 1, routeDirection: 1, seesPlayer: false, investigating: false, wait: 0, investigateLeft: 0 }); }),
      noise: level.noise.map(n => Object.assign({}, n, { active: false, remaining: 0, nextIn: 0 })),
      stats: { laughs: 0, coveredLaughs: 0, lures: 0, bursts: 0, distance: 0, elapsed: 0, maxAlert: 0 }, message: level.tutorial
    };
    updateNoise(state); return state;
  }
  function updateNoise(s) {
    for (const n of s.noise) { const t = ((s.time + n.phase) % n.period + n.period) % n.period; n.active = t < n.duration; n.remaining = n.active ? n.duration - t : 0; n.nextIn = n.active ? 0 : n.period - t; }
    s.player.covered = s.noise.some(n => n.active && dist(n, s.player) <= n.r);
  }
  function setTarget(s, x, y) {
    if (s.mode !== 'playing' || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    const path = findPath(s.level, s.player, { x, y });
    if (!path) { addEvent(s, 'blocked', x, y, '书架挡住了，请点过道', 1.1); return false; }
    s.player.path = path; s.player.target = path[path.length - 1]; return true;
  }
  function toggleHold(s) { if (s.mode === 'playing') s.player.hold = !s.player.hold; return s.player.hold; }
  function laugh(s, forced = false) {
    if (s.mode !== 'playing') return false;
    const p = s.player;
    if (!forced && p.cooldown > 0) return false;
    if (!forced && p.laugh < 8) { addEvent(s, 'empty', p.x, p.y, '暂时笑不出来', 1); return false; }
    updateNoise(s); const covered = p.covered; const strength = p.laugh;
    p.laugh = 0; p.burst = 0; p.cooldown = 2.2; p.laughFlash = 1.1; s.stats.laughs++;
    if (forced) s.stats.bursts++;
    if (covered) { s.stats.coveredLaughs++; addEvent(s, 'covered', p.x, p.y, '被噪声盖住了！', 2, { radius: 105 }); }
    else {
      const radius = forced ? 640 : 455;
      let attracted = 0;
      for (const g of s.guards) if (dist(g, p) <= radius) {
        const path = findPath(s.level, g, p, 12);
        if (!path) continue;
        g.path = path; g.investigateTarget = { x: p.x, y: p.y }; g.mode = 'investigate'; g.investigating = true; g.investigateLeft = g.investigationDuration || 6; g.wait = 0; attracted++;
      }
      if (attracted) s.stats.lures++;
      addEvent(s, forced ? 'burst' : 'laugh', p.x, p.y, forced ? '噗哈哈——快离开这里！' : attracted ? '笑声把巡视员引来了！' : '嘿嘿……', 2.4, { radius, strength, attracted });
    }
    return true;
  }
  function move(s, entity, dx, dy) {
    const ox = entity.x, oy = entity.y, r = entity.r || 12;
    if (!blocked(s.level, entity.x + dx, entity.y, r)) entity.x += dx;
    if (!blocked(s.level, entity.x, entity.y + dy, r)) entity.y += dy;
    return Math.hypot(entity.x - ox, entity.y - oy);
  }
  function follow(s, entity, speed, dt) {
    if (!entity.path.length) return 0;
    let budget = speed * dt, traveled = 0;
    for (let i = 0; i < 4 && entity.path.length && budget > 0; i++) {
      const to = entity.path[0], dx = to.x - entity.x, dy = to.y - entity.y, d = Math.hypot(dx, dy);
      if (d < .3) { entity.path.shift(); continue; }
      const use = Math.min(d, budget); entity.angle = Math.atan2(dy, dx);
      const actual = move(s, entity, dx / d * use, dy / d * use); traveled += actual; budget -= use;
      if (use >= d - .01) entity.path.shift();
      if (actual < use * .3) break;
    }
    return traveled;
  }
  function updateGuard(s, g, dt) {
    if (g.mode === 'investigate') {
      if (g.path.length) follow(s, g, g.speed * 1.22, dt);
      else { g.investigateLeft -= dt; g.angle += dt * .65; if (g.investigateLeft <= 0) { g.mode = 'return'; g.investigating = false; g.path = findPath(s.level, g, g.home, 12) || []; } }
    } else if (g.mode === 'return') {
      follow(s, g, g.speed, dt); if (!g.path.length) { g.mode = g.kind; g.routeIndex = 1; g.routeDirection = 1; }
    } else if (g.kind === 'patrol') {
      if (g.wait > 0) g.wait -= dt;
      else {
        if (!g.path.length) g.path = findPath(s.level, g, g.route[g.routeIndex], 12) || [];
        follow(s, g, g.speed, dt);
        if (!g.path.length) { g.routeDirection *= -1; g.routeIndex = g.routeIndex === 1 ? 0 : 1; g.wait = .65; }
      }
    } else g.angle = g.baseAngle + Math.sin(s.time * .48 + g.id) * g.sweep;
    const p = s.player, d = dist(g, p), facing = Math.abs(wrap(Math.atan2(p.y - g.y, p.x - g.x) - g.angle));
    g.seesPlayer = d < g.range && (d < 38 || facing < g.fov / 2) && clearLine(s.level, g, p, 0);
    if (g.seesPlayer) {
      const close = d < 78 ? 1.5 : 1;
      g.alert = clamp(g.alert + dt * (p.holding ? 14 : p.moving ? 43 : 30) * close * (p.laughFlash > .5 ? 1.5 : 1), 0, 100);
    } else g.alert = Math.max(0, g.alert - dt * 29);
    s.stats.maxAlert = Math.max(s.stats.maxAlert, g.alert);
    if (g.alert >= 100) { s.mode = 'failed'; s.message = '被盯住太久了！重来本房，借书卡入口还在。'; addEvent(s, 'failed', p.x, p.y, '嘘——请回入口！', 4); }
  }
  function tick(s, input, dt) {
    if (s.mode !== 'playing') return;
    s.time += dt; s.frame++; s.stats.elapsed = s.time;
    for (const e of s.events) e.ttl -= dt; s.events = s.events.filter(e => e.ttl > 0);
    const p = s.player; p.cooldown = Math.max(0, p.cooldown - dt); p.laughFlash = Math.max(0, p.laughFlash - dt);
    p.holding = p.hold || !!input.hold;
    const speed = p.holding ? 64 : 112;
    let dx = Number(input.x) || 0, dy = Number(input.y) || 0, moved = 0;
    const mag = Math.hypot(dx, dy);
    if (mag > .01) { dx /= Math.max(1, mag); dy /= Math.max(1, mag); p.path = []; p.target = null; p.angle = Math.atan2(dy, dx); moved = move(s, p, dx * speed * dt, dy * speed * dt); }
    else if (p.path.length) { moved = follow(s, p, speed, dt); if (!p.path.length) p.target = null; }
    p.moving = moved > .001; s.stats.distance += moved;
    updateNoise(s);
    const nearSign = s.level.signs.some(z => dist(p, z) < 80);
    const rate = (p.moving ? 2.8 : .45) + (p.holding ? 1.8 : 0) + (nearSign ? 3.4 : 0);
    p.laugh = Math.min(100, p.laugh + rate * dt);
    if (p.laugh >= 100) {
      if (!p.burst) { p.burst = 1.65; addEvent(s, 'warning', p.x, p.y, '憋不住了！快找噪声或离开视线', 1.65); }
      else { p.burst -= dt; if (p.burst <= 0) laugh(s, true); }
    }
    for (const g of s.guards) { updateGuard(s, g, dt); if (s.mode === 'failed') break; }
    if (s.mode !== 'playing') return;
    const next = s.cards[s.collected];
    if (next && dist(p, next) < 30) { next.collected = true; s.collected++; addEvent(s, 'card', next.x, next.y, '借书卡 ' + s.collected + '/3', 1.8); s.message = s.collected < 3 ? '已取第 ' + s.collected + ' 张，去下一张借书卡。' : '三张齐了！到发光出口。'; }
    s.exitUnlocked = s.collected === s.cards.length;
    if (s.exitUnlocked && dist(p, s.level.exit) < s.level.exit.r) { s.mode = 'won'; p.target = null; p.path = []; s.message = s.levelIndex === 3 ? '四间都过了。现在，可以笑出声了！' : '成功闭麦，去下一间。'; addEvent(s, 'won', p.x, p.y, '送卡成功', 5); }
  }
  function step(s, input = {}, dt = STEP) {
    if (!Number.isFinite(dt) || dt <= 0) return s;
    // The UI calls at 60 Hz; subdivision also keeps externally supplied deltas safe.
    let left = Math.min(dt, .25); while (left > 1e-8) { const slice = Math.min(STEP, left); tick(s, input, slice); left -= slice; }
    return s;
  }
  function snapshot(s) { return { level: s.levelIndex + 1, mode: s.mode, time: +s.time.toFixed(3), player: { x: +s.player.x.toFixed(2), y: +s.player.y.toFixed(2), hold: s.player.hold, holding: s.player.holding, laugh: +s.player.laugh.toFixed(2), burst: +s.player.burst.toFixed(2), covered: s.player.covered }, cards: s.collected, guards: s.guards.map(g => ({ x: +g.x.toFixed(2), y: +g.y.toFixed(2), alert: +g.alert.toFixed(2), mode: g.mode, seesPlayer: g.seesPlayer })), stats: { ...s.stats } }; }
  return { W, H, STEP, levels, create, step, laugh, setTarget, toggleHold, snapshot, findPath, clearLine, blocked };
});
