/* Presentation only. The simulation owns every rule and all mutable game state. */
(function () {
  'use strict';

  const W = 900;
  const H = 600;
  const TAU = Math.PI * 2;
  const FONT = '"Microsoft YaHei", "PingFang SC", system-ui, sans-serif';
  const P = {
    floor: '#152c42', floor2: '#1c364c', ink: '#132b40', cream: '#f5ecd4',
    gold: '#f2c969', muted: '#99b4c5', blue: '#82b7cf', red: '#f48c7f',
  };
  let background = null;

  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function box(ctx, x, y, w, h, r, fill, stroke, lw) {
    rr(ctx, x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }

  function ellipse(ctx, x, y, rx, ry, fill) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fillStyle = fill; ctx.fill();
  }

  function label(ctx, text, x, y, size, color, align, weight) {
    ctx.font = `${weight || 500} ${size || 12}px ${FONT}`;
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color || P.cream; ctx.fillText(String(text), x, y);
  }

  function pill(ctx, text, x, y, fill, fg, size) {
    ctx.font = `600 ${size || 11}px ${FONT}`;
    const width = ctx.measureText(String(text)).width + 18;
    box(ctx, x - width / 2, y - 11, width, 22, 8, fill);
    label(ctx, text, x, y, size || 11, fg, 'center', 600);
  }

  function makeBackground() {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#102336'; ctx.fillRect(0, 0, W, H);
    box(ctx, 10, 10, W - 20, H - 20, 14, P.floor, '#496074', 1);
    const g = ctx.createRadialGradient(450, 180, 30, 450, 310, 580);
    g.addColorStop(0, '#203d52'); g.addColorStop(1, '#13293e');
    box(ctx, 19, 19, W - 38, H - 38, 9, g);

    // Woven perimeter runners suggest a quiet, longer route without drawing a solution.
    ctx.strokeStyle = '#29485b'; ctx.lineWidth = 46;
    rr(ctx, 56, 55, W - 112, H - 110, 12); ctx.stroke();
    ctx.strokeStyle = '#48606b'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
    rr(ctx, 34, 33, W - 68, H - 66, 8); ctx.stroke();
    rr(ctx, 79, 78, W - 158, H - 156, 7); ctx.stroke(); ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(180,207,215,.035)'; ctx.lineWidth = 1;
    for (let x = 20; x < W - 20; x += 45) {
      ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, H - 20); ctx.stroke();
    }
    for (let y = 20; y < H - 20; y += 45) {
      ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(W - 20, y); ctx.stroke();
    }
    // Tiny fixed grain gives the floor a quiet paper/cloth material.
    for (let i = 0; i < 850; i++) {
      const x = 24 + (i * 137.13 % 852), y = 24 + (i * 83.79 % 552);
      ctx.fillStyle = i % 2 ? 'rgba(233,227,202,.028)' : 'rgba(0,0,0,.035)';
      ctx.fillRect(x, y, 1, 1);
    }
    for (const x of [22, W - 22]) for (const y of [22, H - 22]) {
      ellipse(ctx, x, y, 2.5, 2.5, '#ad9270');
    }
    return c;
  }

  function wallRect(w) {
    return { x: w.x, y: w.y, w: w.w === undefined ? w.width : w.w,
      h: w.h === undefined ? w.height : w.h };
  }

  // Ray vs. axis-aligned rectangle, used only to clip the visible cone.
  function rayRect(ox, oy, dx, dy, r, maxDist) {
    let lo = 0, hi = maxDist;
    for (const axis of ['x', 'y']) {
      const o = axis === 'x' ? ox : oy, d = axis === 'x' ? dx : dy;
      const min = r[axis], max = min + (axis === 'x' ? r.w : r.h);
      if (Math.abs(d) < 0.000001) { if (o < min || o > max) return maxDist; }
      else {
        let a = (min - o) / d, b = (max - o) / d;
        if (a > b) { const t = a; a = b; b = t; }
        lo = Math.max(lo, a); hi = Math.min(hi, b);
        if (lo > hi) return maxDist;
      }
    }
    return lo >= 0 && lo <= maxDist ? lo : maxDist;
  }

  function guardAlert(g) {
    const value = Number(g.alert || 0);
    return Math.max(0, Math.min(1, value / 100));
  }

  function guardCone(ctx, g, walls) {
    const alert = guardAlert(g), danger = g.seesPlayer || alert > 0.55;
    const range = g.range || g.viewRange || g.sightRange || 178;
    let fov = g.fov || g.viewAngle || Math.PI * 0.52;
    if (fov > TAU) fov *= Math.PI / 180;
    const angle = g.angle || 0, points = [];
    // Close proximity is also visible behind the cone in the simulation.
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = i / 64 * TAU, dx = Math.cos(a), dy = Math.sin(a);
      let d = 38;
      for (const w of walls) d = Math.min(d, rayRect(g.x, g.y, dx, dy, w, 38));
      if (!i) ctx.moveTo(g.x + dx * d, g.y + dy * d); else ctx.lineTo(g.x + dx * d, g.y + dy * d);
    }
    ctx.closePath(); ctx.fillStyle = danger ? 'rgba(244,140,127,.07)' : 'rgba(243,225,177,.04)'; ctx.fill();
    ctx.strokeStyle = danger ? 'rgba(244,140,127,.21)' : 'rgba(243,225,177,.13)'; ctx.lineWidth = 1; ctx.stroke();
    for (let i = 0; i <= 64; i++) {
      const a = angle - fov / 2 + fov * i / 64, dx = Math.cos(a), dy = Math.sin(a);
      let d = range;
      for (const w of walls) d = Math.min(d, rayRect(g.x, g.y, dx, dy, w, range));
      d = Math.min(d, rayRect(g.x, g.y, dx, dy, {x: -10, y: -10, w: 20, h: 620}, range));
      d = Math.min(d, rayRect(g.x, g.y, dx, dy, {x: 890, y: -10, w: 20, h: 620}, range));
      d = Math.min(d, rayRect(g.x, g.y, dx, dy, {x: -10, y: -10, w: 920, h: 20}, range));
      d = Math.min(d, rayRect(g.x, g.y, dx, dy, {x: -10, y: 590, w: 920, h: 20}, range));
      points.push([g.x + dx * d, g.y + dy * d]);
    }
    const gradient = ctx.createRadialGradient(g.x, g.y, 5, g.x, g.y, range);
    gradient.addColorStop(0, danger ? 'rgba(244,140,127,.22)' : 'rgba(244,228,175,.18)');
    gradient.addColorStop(1, danger ? 'rgba(244,140,127,.06)' : 'rgba(244,228,175,.035)');
    ctx.beginPath(); ctx.moveTo(g.x, g.y);
    points.forEach(p => ctx.lineTo(p[0], p[1])); ctx.closePath();
    ctx.fillStyle = gradient; ctx.fill();
    ctx.strokeStyle = danger ? 'rgba(244,140,127,.54)' : 'rgba(243,225,177,.26)';
    ctx.lineWidth = 1; ctx.stroke();
  }

  function shelf(ctx, wall, index) {
    const r = wallRect(wall), {x, y, w, h} = r;
    if (!(w > 0 && h > 0)) return;
    box(ctx, x + 5, y + 6, w, h + 7, 7, 'rgba(5,15,26,.30)');
    box(ctx, x, y, w, h, 5, '#674f43', '#a58866', 1.3);
    box(ctx, x + 4, y + 4, w - 8, h - 8, 2, '#283b43');
    const horizontal = w >= h;
    const palette = ['#d1b281','#ac7970','#5c8b94','#c2c5ae','#647d8d','#dbc598','#8b7393'];
    if (horizontal) {
      const rows = Math.max(1, Math.floor((h - 8) / 31));
      const rowH = (h - 8) / rows;
      for (let row = 0; row < rows; row++) {
        for (let bx = x + 9, j = 0; bx < x + w - 9; j++) {
          const bw = 5 + ((j * 7 + index * 3 + row * 2) % 7);
          const bh = Math.min(rowH - 8, 17 + ((j * 11 + index) % 9));
          if (bx + bw > x + w - 7) break;
          const by = y + 5 + row * rowH + rowH - bh - 4;
          box(ctx, bx, by, bw, bh, 1, palette[(j + row * 2 + index) % palette.length]);
          ctx.fillStyle = 'rgba(246,235,200,.42)'; ctx.fillRect(bx + 1, by + 4, bw - 2, 1);
          ctx.fillStyle = 'rgba(13,29,36,.28)'; ctx.fillRect(bx + bw - 2, by, 1, bh);
          bx += bw + 2;
        }
        ctx.fillStyle = '#9f7e58'; ctx.fillRect(x + 4, y + 5 + (row + 1) * rowH - 4, w - 8, 4);
      }
    } else {
      const cols = Math.max(1, Math.floor((w - 8) / 31));
      const colW = (w - 8) / cols;
      for (let col = 0; col < cols; col++) {
        for (let by = y + 8, j = 0; by < y + h - 9; j++) {
          const bh = 5 + ((j * 7 + index * 3) % 7);
          const bw = Math.min(colW - 6, 19 + ((j * 3 + index) % 7));
          if (by + bh > y + h - 6) break;
          const bx = x + 5 + col * colW + colW - bw - 3;
          box(ctx, bx, by, bw, bh, 1, palette[(j + col * 2 + index) % palette.length]);
          ctx.fillStyle = 'rgba(246,235,200,.35)'; ctx.fillRect(bx + 4, by + 1, 1, bh - 2);
          by += bh + 2;
        }
        ctx.fillStyle = '#9f7e58'; ctx.fillRect(x + 5 + (col + 1) * colW - 4, y + 4, 4, h - 8);
      }
    }
    // Front board and catalogue plate remain aligned to the collision rectangle.
    box(ctx, x, y + h - 6, w, 6, 2, '#896849');
    ctx.strokeStyle = 'rgba(255,237,194,.25)'; ctx.beginPath();
    ctx.moveTo(x + 3, y + 2); ctx.lineTo(x + w - 3, y + 2); ctx.stroke();
    if (wall.label && w >= 62) {
      const text = String(wall.label);
      ctx.font = `600 10px ${FONT}`;
      const pw = Math.min(w - 12, ctx.measureText(text).width + 14);
      box(ctx, x + (w - pw) / 2, y + h / 2 - 8, pw, 16, 2, '#e6d7b5', '#6d5b45');
      label(ctx, text, x + w / 2, y + h / 2, 10, '#554f46', 'center', 700);
    }
  }

  function sourceIcon(ctx, type, x, y, active) {
    const c = active ? P.gold : '#9fb9c8';
    ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 1.7;
    if (/cart|trolley|推车/.test(type)) {
      ctx.beginPath(); ctx.moveTo(-13, -10); ctx.lineTo(-10, -10); ctx.lineTo(-8, 9);
      ctx.lineTo(13, 9); ctx.stroke();
      box(ctx, -7, -7, 18, 12, 2, active ? '#9c7949' : '#425e6d', c, 1);
      ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(-4, 3); ctx.moveTo(1, -5); ctx.lineTo(1, 3);
      ctx.moveTo(6, -5); ctx.lineTo(6, 3); ctx.stroke();
      ellipse(ctx, -4, 13, 2.5, 2.5, c); ellipse(ctx, 10, 13, 2.5, 2.5, c);
    } else if (/stamp|盖章/.test(type)) {
      box(ctx, -11, 5, 22, 6, 2, c);
      box(ctx, -5, -8, 10, 13, 3, c);
      box(ctx, -8, -13, 16, 7, 3, c);
      ctx.strokeStyle = active ? '#f4dc9b' : '#6c96ad';
      ctx.beginPath(); ctx.moveTo(-15, 16); ctx.lineTo(15, 16); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.quadraticCurveTo(-8, -14, -15, -9);
      ctx.lineTo(-15, 10); ctx.quadraticCurveTo(-7, 5, 0, 11);
      ctx.quadraticCurveTo(7, 5, 15, 10); ctx.lineTo(15, -9); ctx.quadraticCurveTo(8, -14, 0, -9);
      ctx.closePath(); ctx.fillStyle = active ? '#e5c77f' : '#9fb9c8'; ctx.fill();
      ctx.strokeStyle = '#355062'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 9); ctx.stroke();
      for (let j = 0; j < 3; j++) {
        ctx.beginPath(); ctx.moveTo(-11, -4 + j * 4); ctx.lineTo(-4, -3 + j * 4);
        ctx.moveTo(4, -3 + j * 4); ctx.lineTo(11, -4 + j * 4); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function noiseArea(ctx, n, time, reduced) {
    const active = !!n.active, r = n.r || n.radius || 86;
    ctx.save();
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, TAU);
    ctx.fillStyle = active ? 'rgba(242,201,105,.09)' : 'rgba(102,166,192,.026)'; ctx.fill();
    ctx.lineWidth = active ? 2 : 1;
    ctx.strokeStyle = active ? 'rgba(242,201,105,.68)' : 'rgba(125,180,205,.35)';
    ctx.setLineDash(active ? [8, 5] : [3, 7]); ctx.stroke(); ctx.setLineDash([]);
    if (active) {
      for (let i = 0; i < 3; i++) {
        const t = reduced ? (i + 1) / 3 : ((time * 0.45 + i / 3) % 1);
        ctx.beginPath(); ctx.arc(n.x, n.y, 22 + (r - 22) * t, 0, TAU);
        ctx.strokeStyle = `rgba(242,201,105,${(1 - t) * 0.26})`; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    ctx.restore();
  }

  function noiseSource(ctx, source, player, cards) {
    const overlapsCard = (cards || []).some(c => !c.collected && Math.hypot(c.x - source.x, c.y - source.y) < 40);
    // Keep cards readable when a card is intentionally placed inside a sound source.
    const n = overlapsCard ? {...source, x: source.x - 49} : source;
    const active = !!n.active, r = n.r || n.radius || 86;
    ellipse(ctx, n.x + 2, n.y + 9, 22, 9, 'rgba(4,16,26,.26)');
    ellipse(ctx, n.x, n.y, 23, 23, active ? '#4e4d3b' : '#243f54');
    ctx.beginPath(); ctx.arc(n.x, n.y, 23, 0, TAU);
    ctx.strokeStyle = active ? P.gold : '#5a8096'; ctx.lineWidth = 1.3; ctx.stroke();
    sourceIcon(ctx, String(n.type || n.kind || n.label || 'book'), n.x, n.y - 1, active);
    const nearby = Math.hypot(player.x - source.x, player.y - source.y) < r + 60;
    const title = n.label || ({book: '翻书', cart: '推车', stamp: '盖章'}[n.type]) || '噪声掩护';
    if (active) {
      const sec = Number.isFinite(n.remaining) ? ` ${Math.ceil(n.remaining)}s` : '';
      pill(ctx, `${title} · 可放声${sec}`, n.x, n.y + 38, '#e6c77f', '#243440', 11);
    } else {
      const sec = nearby && Number.isFinite(n.nextIn) ? ` · ${Math.ceil(n.nextIn)}s` : '';
      pill(ctx, title + sec, n.x, n.y + 38, '#213c51', '#a6c3d2', 11);
    }
  }

  function sign(ctx, s, index) {
    const x = s.x, y = s.y;
    const text = String(s.text || s.label || '请保持安静');
    ctx.save(); ctx.translate(x, y); ctx.rotate((index % 2 ? -1 : 1) * 0.018);
    ctx.font = `600 11px ${FONT}`;
    const w = Math.max(68, Math.min(166, ctx.measureText(text).width + 18));
    box(ctx, -w / 2 + 2, -10, w, 28, 2, 'rgba(0,0,0,.17)');
    box(ctx, -w / 2, -13, w, 28, 2, '#e4dac0');
    box(ctx, -13, -16, 26, 6, 1, 'rgba(184,171,127,.75)');
    label(ctx, text, 0, 1, 11, '#485261', 'center', 600);
    ctx.restore();
  }

  function card(ctx, card, index, time, reduced, nextIndex) {
    if (card.collected || card.taken || card.done) return;
    const next = index === nextIndex;
    ctx.save(); ctx.globalAlpha = next ? 1 : .62;
    const pulse = reduced ? 1 : 1 + Math.sin(time * 2.4 + index) * .06;
    ellipse(ctx, card.x, card.y + 7, 18, 6, 'rgba(3,15,26,.34)');
    ctx.save(); ctx.translate(card.x, card.y); ctx.scale(pulse, pulse); ctx.rotate(-.1);
    box(ctx, -16, -12, 32, 24, 3, '#f5e6bb', '#b8964c', 1);
    ctx.fillStyle = '#b5985b'; ctx.fillRect(-11, -7, 8, 2);
    ctx.fillStyle = '#d3bc80'; ctx.fillRect(-11, -2, 10, 1); ctx.fillRect(-11, 2, 10, 1);
    label(ctx, card.id || card.number || card.order || index + 1, 7, 1, 15, '#304354', 'center', 800);
    ctx.restore();
    ctx.fillStyle = '#f4d682';
    ctx.beginPath(); ctx.moveTo(card.x + 21, card.y - 15); ctx.lineTo(card.x + 24, card.y - 11);
    ctx.lineTo(card.x + 21, card.y - 7); ctx.lineTo(card.x + 18, card.y - 11); ctx.closePath(); ctx.fill();
    if (next) pill(ctx, '下一张', card.x, card.y - 29, '#e5c779', '#2d4050', 10);
    ctx.restore();
  }

  function exitDoor(ctx, exit, unlocked, time, reduced) {
    if (!exit) return;
    const r = exit.r || 25;
    ellipse(ctx, exit.x, exit.y + 6, r + 10, 16, unlocked ? 'rgba(244,207,126,.12)' : 'rgba(137,158,177,.08)');
    box(ctx, exit.x - 25, exit.y - 42, 50, 52, 6, '#304b5c', unlocked ? '#f4d682' : '#6e8797', 2);
    box(ctx, exit.x - 19, exit.y - 36, 38, 45, 3, unlocked ? '#a99161' : '#263e50');
    ctx.fillStyle = unlocked ? '#f3dfac' : '#8297a2'; ctx.fillRect(exit.x + 10, exit.y - 14, 3, 7);
    if (unlocked) {
      const a = reduced ? .4 : .3 + Math.sin(time * 2) * .1;
      ctx.fillStyle = `rgba(244,222,162,${a})`;
      ctx.beginPath(); ctx.moveTo(exit.x - 18, exit.y + 9); ctx.lineTo(exit.x + 18, exit.y + 9);
      ctx.lineTo(exit.x + 37, exit.y + 34); ctx.lineTo(exit.x - 37, exit.y + 34); ctx.fill();
      label(ctx, '→', exit.x, exit.y - 16, 25, '#fff3cd', 'center', 700);
    } else {
      box(ctx, exit.x - 6, exit.y - 18, 12, 10, 2, '#a4b1b7');
      ctx.beginPath(); ctx.arc(exit.x, exit.y - 19, 4, Math.PI, TAU); ctx.strokeStyle = '#a4b1b7'; ctx.lineWidth = 2; ctx.stroke();
    }
    pill(ctx, unlocked ? '出口已开' : '集齐借书卡', exit.x, exit.y + 32, unlocked ? '#e6c77f' : '#213c51', unlocked ? '#243440' : '#b8c9cf', 11);
  }

  function plannedPath(ctx, p) {
    const points = Array.isArray(p.path) ? p.path : [];
    if (!points.length) return;
    const dest = points[points.length - 1];
    if (!Number.isFinite(dest.x) || !Number.isFinite(dest.y)) return;
    ctx.save(); ctx.setLineDash([2, 8]); ctx.strokeStyle = 'rgba(194,214,218,.36)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); points.forEach(q => ctx.lineTo(q.x, q.y)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#b9ced3'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(dest.x, dest.y, 7, 0, TAU); ctx.stroke();
    ellipse(ctx, dest.x, dest.y, 2, 2, '#d8e3de'); ctx.restore();
  }

  function guard(ctx, g, time, reduced) {
    const a = guardAlert(g), searching = g.investigating || /investigat|search/.test(g.mode || '');
    const walking = !reduced && Array.isArray(g.path) && g.path.length > 0;
    const step = walking ? Math.sin(time * 7 + g.x * .01) * 2 : 0;
    ellipse(ctx, g.x, g.y + 4, 15, 7, 'rgba(2,12,23,.36)');
    ctx.save(); ctx.translate(g.x, g.y);
    box(ctx, -10, -2 + step, 8, 9, 3, '#14263a'); box(ctx, 3, -2 - step, 8, 9, 3, '#14263a');
    box(ctx, -13, -25, 26, 25, 8, g.kind === 'sentry' || g.kind === 'turn' ? '#9a8271' : '#7c95a1', '#b3b8b2', 1);
    ctx.fillStyle = '#ddd5bf'; ctx.beginPath(); ctx.moveTo(-6, -23); ctx.lineTo(0, -13); ctx.lineTo(6, -23); ctx.fill();
    box(ctx, 5, -19, 6, 8, 1, '#e5d9b6');
    ellipse(ctx, 0, -29, 10, 10, '#d6b79a');
    ctx.beginPath(); ctx.arc(0, -31, 10, Math.PI, TAU); ctx.fillStyle = '#303c47'; ctx.fill();
    ctx.strokeStyle = '#334552'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(-4, -29, 3.5, 0, TAU); ctx.arc(4, -29, 3.5, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-.5, -29); ctx.lineTo(.5, -29); ctx.stroke();
    // A floor pointer shows the exact view direction even when the librarian sprite is upright.
    ctx.rotate(g.angle || 0); ctx.fillStyle = a > .4 ? P.red : '#e4d5ae';
    ctx.beginPath(); ctx.moveTo(23, 0); ctx.lineTo(16, -4); ctx.lineTo(16, 4); ctx.closePath(); ctx.fill(); ctx.restore();
    if (a > .015) {
      box(ctx, g.x - 20, g.y - 53, 40, 5, 2.5, '#10293d');
      box(ctx, g.x - 20, g.y - 53, Math.max(2, 40 * a), 5, 2.5, a > .55 ? P.red : P.gold);
      label(ctx, '!', g.x + 27, g.y - 31, 20, a > .55 ? P.red : P.gold, 'center', 800);
    } else if (searching) {
      pill(ctx, '?', g.x + 22, g.y - 36, '#e4c779', '#233749', 15);
    }
  }

  function hero(ctx, p, assets, time, reduced) {
    const bursting = p.laughFlash > 0 || !!p.laughing;
    const hold = !!p.hold || !!p.holding || p.burst > 0;
    const laugh = Number(p.laugh || 0);
    const bob = reduced ? 0 : bursting ? -Math.abs(Math.sin(time * 15)) * 4 : p.moving ? Math.sin(time * 12) * 1.6 : 0;
    const r = p.r || 14;
    ellipse(ctx, p.x, p.y + 5, 19, 8, 'rgba(0,10,19,.40)');
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r + 2, r * .7, 0, 0, TAU);
    ctx.strokeStyle = p.covered ? '#f2d17f' : hold ? '#95d5e1' : '#e6dab3'; ctx.lineWidth = 2; ctx.stroke();
    if (bursting) {
      for (let i = 0; i < 2; i++) {
        const t = reduced ? .6 + i * .2 : (time * 1.5 + i / 2) % 1;
        ctx.beginPath(); ctx.arc(p.x, p.y - 12, 24 + t * 44, 0, TAU);
        ctx.strokeStyle = p.covered ? `rgba(242,209,127,${(1-t)*.6})` : `rgba(246,148,112,${(1-t)*.65})`;
        ctx.lineWidth = 2; ctx.stroke();
      }
    }
    const img = assets && assets.hero;
    if (img && img.complete && img.naturalWidth > 0) {
      const cellW = img.naturalWidth / 3, cellH = img.naturalHeight;
      const height = 76, width = height * cellW / cellH;
      const col = bursting ? 2 : hold ? 1 : 0;
      ctx.save(); ctx.translate(p.x, p.y + 10 + bob);
      if (!reduced && p.moving && !hold) ctx.rotate(Math.sin(time * 12) * .035);
      ctx.drawImage(img, col * cellW, 0, cellW, cellH, -width / 2, -height, width, height);
      ctx.restore();
    } else {
      // An explicit loading marker is never presented as final character art.
      pill(ctx, '角色载入中', p.x, p.y - 29, '#efe2be', '#33485a', 11);
    }
    if (p.burst > 0 && !bursting) {
      pill(ctx, `爆笑倒计时 ${p.burst.toFixed(1)}s`, p.x, p.y - 76, '#efac83', '#473b35', 11);
    } else if (laugh > 84 && !bursting) {
      pill(ctx, laugh >= 94 ? '快憋不住了！' : '笑意快满', p.x, p.y - 76, '#f2c679', '#473b35', 11);
    } else if (bursting) {
      pill(ctx, p.covered ? '哈哈！被盖住了' : '哈——哈哈！', p.x, p.y - 77, p.covered ? '#e8cd8a' : '#edac86', '#423a36', 12);
    } else if (p.covered) {
      pill(ctx, '噪声覆盖中', p.x, p.y - 74, '#dfc57f', '#31444d', 10);
    }
  }

  function eventText(ctx, e) {
    if (!e || !e.text || e.ttl <= 0 || !Number.isFinite(e.x) || !Number.isFinite(e.y)) return;
    ctx.save(); ctx.globalAlpha = Math.min(1, e.ttl * 2);
    pill(ctx, e.text, Math.max(72, Math.min(828, e.x)), Math.max(33, e.y - 24), '#eee1bb', '#283e50', 11);
    ctx.restore();
  }

  function draw(ctx, state, assets, options) {
    if (!ctx || !state || !state.level) return;
    const level = state.level, p = state.player;
    const time = Number(state.time || 0), reduced = !!(options && options.reducedMotion);
    const walls = level.walls || [], rects = walls.map(wallRect);
    const noise = state.noise || [], cards = state.cards || [];
    ctx.save(); ctx.clearRect(0, 0, W, H);
    if (!background) background = makeBackground();
    ctx.drawImage(background, 0, 0);

    // Subdued stamp in the carpet supplies place and chapter, not an additional HUD.
    ctx.save(); ctx.globalAlpha = .22;
    label(ctx, `阅 览 室  /  ${String((state.levelIndex || 0) + 1).padStart(2, '0')}`, 450, 573, 11, '#b8ced1', 'center', 600);
    ctx.restore();
    noise.forEach(n => noiseArea(ctx, n, time, reduced));
    (state.guards || []).forEach(g => guardCone(ctx, g, rects));
    (level.signs || []).forEach((s, i) => sign(ctx, s, i));
    if (p) plannedPath(ctx, p);

    const unlocked = typeof state.exitUnlocked === 'boolean' ? state.exitUnlocked
      : typeof state.exitOpen === 'boolean' ? state.exitOpen
      : cards.length === 0 || cards.every(c => c.collected || c.taken || c.done);
    exitDoor(ctx, level.exit, unlocked, time, reduced);
    noise.forEach(n => noiseSource(ctx, n, p || {x: -1000, y: -1000}, cards));
    cards.forEach((c, i) => card(ctx, c, i, time, reduced, state.collected || 0));

    const objects = walls.map((w, i) => ({y: w.y + (w.h || w.height || 0), draw: () => shelf(ctx, w, i)}));
    (state.guards || []).forEach(g => objects.push({y: g.y, draw: () => guard(ctx, g, time, reduced)}));
    if (p) objects.push({y: p.y + .1, draw: () => hero(ctx, p, assets, time, reduced)});
    objects.sort((a, b) => a.y - b.y).forEach(o => o.draw());
    (state.events || []).forEach(e => eventText(ctx, e));
    ctx.restore();
  }

  window.LibraryRender = Object.freeze({draw});
})();
