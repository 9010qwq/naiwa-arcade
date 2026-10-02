(function (root, factory) {
  const levels = typeof module === 'object' && module.exports ? require('./levels.js') : root.PegLevels;
  const api = factory(levels);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PegSim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (LEVELS) {
  'use strict';
  const W = 480, H = 620, FIXED = 1 / 240, G = 360, SPEED = 520, R = 7;
  const BUCKET_Y = 580, BUCKET_WIDTH = 94, PAD_R = 9;
  const radians = n => n * Math.PI / 180;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function emit(s, type, extra) {
    s.events.push(Object.assign({ type, time: s.time }, extra || {}));
    if (s.events.length > 50) s.events.shift();
  }
  function create(levelIndex) {
    levelIndex = clamp(Math.floor(levelIndex || 0), 0, LEVELS.length - 1);
    const l = LEVELS[levelIndex];
    return { levelIndex, phase: 'ready', ballsLeft: l.balls, time: 0, ball: null,
      pegs: l.pegs.map((p, id) => Object.assign({ id, hit: false }, p)),
      pads: l.pads.map(p => Object.assign({ angle: p.baseAngle, flipUntil: 0 }, p)),
      combo: 0, bestCombo: 0, shots: 0, hits: 0, catches: 0, events: [], clearedGroups: [],
      _accumulator: 0, _stuckTime: 0, _stationaryTime: 0, _stuckAnchor: null };
  }
  function remaining(s) { return s.pegs.filter(p => p.target && !p.hit).length; }
  function bucketX(s) {
    const l = LEVELS[s.levelIndex];
    return W / 2 + Math.sin(s.time * l.bucketSpeed) * l.bucketRange;
  }
  function launch(s, angle) {
    if (s.phase !== 'ready' || s.ballsLeft <= 0) return false;
    const a = radians(clamp(Number.isFinite(angle) ? angle : 0, -68, 68));
    s.ball = { x: 240, y: 62, vx: Math.sin(a) * SPEED, vy: Math.cos(a) * SPEED, age: 0 };
    s.phase = 'flying'; s.ballsLeft--; s.shots++; s.combo = 0;
    s._stuckTime = 0; s._stationaryTime = 0; s._stuckAnchor = { x: 240, y: 62 };
    emit(s, 'launch', { x: 240, y: 62, angle: clamp(angle, -68, 68) });
    return true;
  }
  function finish(s, reason) {
    const b = s.ball;
    if (reason === 'catch') { s.ballsLeft++; s.catches++; emit(s, 'catch', { x: b.x, y: BUCKET_Y }); }
    s.pegs = s.pegs.filter(p => !p.hit);
    s.pads.forEach(p => { p.angle = p.baseAngle; p.flipUntil = 0; });
    s.ball = null;
    s.phase = remaining(s) === 0 ? 'won' : s.ballsLeft > 0 ? 'ready' : 'lost';
    emit(s, 'shotEnd', { reason, combo: s.combo, remaining: remaining(s), phase: s.phase });
    if (s.phase === 'won') emit(s, 'win', { shots: s.shots, ballsLeft: s.ballsLeft });
    if (s.phase === 'lost') emit(s, 'lose', { remaining: remaining(s) });
  }
  function mark(s, p) {
    if (p.hit) return;
    p.hit = true; s.combo++; s.bestCombo = Math.max(s.bestCombo, s.combo);
    if (p.target) s.hits++;
    emit(s, 'hit', { id: p.id, x: p.x, y: p.y, target: p.target, group: p.group, combo: s.combo });
    if (p.target && !s.clearedGroups.includes(p.group) && !s.pegs.some(q => q.target && q.group === p.group && !q.hit)) {
      s.clearedGroups.push(p.group);
      s.pads.forEach(pad => { pad.angle = -pad.angle; pad.flipUntil = s.time + 3; });
      emit(s, 'group', { group: p.group, x: p.x, y: p.y, duration: 3 });
    }
  }
  function reflect(b, nx, ny, restitution) {
    const dot = b.vx * nx + b.vy * ny;
    if (dot < 0) { b.vx -= (1 + restitution) * dot * nx; b.vy -= (1 + restitution) * dot * ny; }
  }
  function closestOnPad(b, p) {
    const dx = Math.cos(p.angle) * p.length / 2, dy = Math.sin(p.angle) * p.length / 2;
    const ax = p.x - dx, ay = p.y - dy;
    const t = clamp(((b.x - ax) * dx * 2 + (b.y - ay) * dy * 2) / (p.length * p.length), 0, 1);
    return { x: ax + t * dx * 2, y: ay + t * dy * 2 };
  }
  function tick(s, dt) {
    if (s.phase === 'won' || s.phase === 'lost') return;
    s.time += dt;
    s.pads.forEach(p => { if (p.flipUntil && s.time >= p.flipUntil) { p.angle = p.baseAngle; p.flipUntil = 0; emit(s, 'padReset', { x: p.x, y: p.y }); } });
    if (s.phase !== 'flying' || !s.ball) return;
    const b = s.ball, oldX = b.x, oldY = b.y;
    b.age += dt; b.vy += G * dt;
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > 750) { b.vx *= 750 / speed; b.vy *= 750 / speed; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < R + 14) { b.x = R + 14; b.vx = Math.abs(b.vx) * .93; }
    if (b.x > W - R - 14) { b.x = W - R - 14; b.vx = -Math.abs(b.vx) * .93; }
    if (b.y < R + 8) { b.y = R + 8; b.vy = Math.abs(b.vy) * .88; }
    for (const p of s.pegs) {
      let dx = b.x - p.x, dy = b.y - p.y;
      const rr = R + p.r, dd = dx * dx + dy * dy;
      if (dd >= rr * rr) continue;
      const d = Math.sqrt(dd) || .0001;
      if (!dx && !dy) dy = -.0001;
      const nx = dx / d, ny = dy / d;
      b.x = p.x + nx * (rr + .025); b.y = p.y + ny * (rr + .025);
      reflect(b, nx, ny, .84); mark(s, p);
      if (remaining(s) === 0) { finish(s, 'complete'); return; }
    }
    for (const p of s.pads) {
      const q = closestOnPad(b, p), dx = b.x - q.x, dy = b.y - q.y, rr = R + PAD_R;
      let d = Math.hypot(dx, dy);
      if (d >= rr) continue;
      let nx = d ? dx / d : -Math.sin(p.angle), ny = d ? dy / d : -Math.cos(p.angle);
      b.x = q.x + nx * (rr + .025); b.y = q.y + ny * (rr + .025);
      const impact = b.vx * nx + b.vy * ny;
      reflect(b, nx, ny, .95);
      if (impact < -25) emit(s, 'pad', { x: q.x, y: q.y, flipped: !!p.flipUntil });
    }
    if (oldY < BUCKET_Y && b.y >= BUCKET_Y && b.vy > 0 && Math.abs(b.x - bucketX(s)) <= BUCKET_WIDTH / 2 - R) { finish(s, 'catch'); return; }
    if (b.y > H + R) { finish(s, 'drain'); return; }
    s._stationaryTime = Math.hypot(b.x - oldX, b.y - oldY) < .2 ? s._stationaryTime + dt : 0;
    if (s._stationaryTime >= 3) { finish(s, 'stuck'); return; }
    s._stuckTime += dt;
    if (s._stuckTime >= 3) {
      const distance = Math.hypot(b.x - s._stuckAnchor.x, b.y - s._stuckAnchor.y);
      if (distance < 12) { finish(s, 'stuck'); return; }
      s._stuckTime = 0; s._stuckAnchor = { x: b.x, y: b.y };
    }
    if (b.age >= 12) finish(s, 'timeout');
  }
  function step(s, dt) {
    if (!Number.isFinite(dt)) dt = FIXED;
    s._accumulator += clamp(dt, 0, .25);
    while (s._accumulator + 1e-10 >= FIXED) { s._accumulator -= FIXED; if (s._accumulator < 0) s._accumulator = 0; tick(s, FIXED); }
    return s.events;
  }
  function firstSegment(s, angle) {
    const a = radians(clamp(Number.isFinite(angle) ? angle : 0, -68, 68));
    const b = { x: 240, y: 62, vx: Math.sin(a) * SPEED, vy: Math.cos(a) * SPEED };
    const points = [{ x: b.x, y: b.y }];
    for (let i = 0; i < 240; i++) {
      b.vy += G * FIXED; b.x += b.vx * FIXED; b.y += b.vy * FIXED;
      const hit = b.x <= R + 14 || b.x >= W - R - 14 || b.y >= BUCKET_Y || s.pegs.some(p => Math.hypot(b.x - p.x, b.y - p.y) <= p.r + R) || s.pads.some(p => { const q = closestOnPad(b, p); return Math.hypot(b.x - q.x, b.y - q.y) <= R + PAD_R; });
      if (i % 4 === 0 || hit) points.push({ x: b.x, y: b.y });
      if (hit) break;
    }
    return points;
  }
  return { create, launch, step, remaining, bucketX, firstSegment, constants: { W, H, FIXED, G, SPEED, R, BUCKET_Y, BUCKET_WIDTH, PAD_R } };
});
