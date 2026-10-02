(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RelayRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Pure simulation: no DOM, random numbers, audio, clocks, or storage.
  // All time advances in fixed 1/120 second steps; packets retain their route.
  var FIXED_STEP = 1 / 120;
  var EPS = 1e-8;
  function route(to, travel) { return { to: to, travel: travel || 1.4 }; }
  function room(id, name, x, y, options) {
    return Object.assign({ id: id, name: name, x: x, y: y, open: true,
      starter: false, target: false, roof: false, horn: false,
      routes: [[]], routeIndex: 0, routeLabels: [], burstDelay: 0.8,
      laughDuration: 3.2, restDuration: 6, initialRest: 0 }, options || {});
  }
  function roof() { return room('R', '屋顶大蛙', 300, 75, { roof: true }); }
  function branchLevel(finale) {
    return [
      room('A', '101', 115, 530, { starter: true, horn: true,
        routes: [[route('B')], [route('D', 2.2)]],
        routeLabels: ['短链 · 直达201', '长链 · 绕行102'] }),
      room('B', '201', 115, 400, { initialRest: 8, routes: [[route('C')]] }),
      room('C', '301', 115, 245, { target: true, routes: [[route('R')]] }),
      room('D', '102', 300, 530, { routes: [[route('E', 2.2)]] }),
      room('E', '202', 300, 400, { open: !finale, routes: [[route('B', 2.2)]] }),
      room('F', '303', 485, 245, { target: true, routes: [[route('R')]] }),
      room('G', '103', 485, 530, { starter: true, routes: [[route('F', 2.4)]] }),
      roof()
    ];
  }
  var LEVELS = [
    { title: '隔壁先笑', subtitle: '一扇窗，接通整栋楼', timeLimit: 35,
      brief: '打开201的窗，再点火101。让带星的301笑起来，把笑声送上屋顶。',
      hint: '先选201开窗，再选101点火。每户爆笑0.8秒后传出一声。',
      roofRequired: 1, syncWindow: null,
      nodes: [
        room('A', '101', 115, 530, { starter: true, routes: [[route('B')]] }),
        room('B', '201', 300, 400, { open: false, routes: [[route('C')]] }),
        room('C', '301', 485, 245, { target: true, routes: [[route('R')]] }), roof()
      ] },
    { title: '等他喘口气', subtitle: '早一点，也会白笑', timeLimit: 38,
      brief: '两边的星标住户都要笑。201还要喘8秒；右边可以先出发。',
      hint: '先点103，等计时过6秒再点101。波在路上也要时间。',
      roofRequired: 1, syncWindow: null,
      nodes: [
        room('A', '101', 115, 530, { starter: true, routes: [[route('B')]] }),
        room('B', '201', 115, 400, { initialRest: 8, routes: [[route('C')]] }),
        room('C', '301', 115, 245, { target: true, routes: [[route('R')]] }),
        room('D', '103', 485, 530, { starter: true, routes: [[route('E')]] }),
        room('E', '203', 485, 400, { routes: [[route('F')]] }),
        room('F', '303', 485, 245, { target: true, routes: [[route('R')]] }), roof()
      ] },
    { title: '绕远一点', subtitle: '短链等一等，长链先出门', timeLimit: 40,
      brief: '101有两种喇叭方向。直达201要等它恢复，绕102和202则可立即出发。',
      hint: '两种都能赢：短链等6秒；或转一次101喇叭，立刻走长链。别忘103。',
      roofRequired: 1, syncWindow: null, nodes: branchLevel(false) },
    { title: '接在同一拍', subtitle: '两声上楼，落在一起', timeLimit: 42,
      brief: '屋顶要听到301和303两声，抵达间隔不超过2.5秒。左边比右边多绕两户。',
      hint: '先点101，约5秒后再点103。看的是到屋顶的时间，不是一起按下。',
      roofRequired: 2, syncWindow: 2.5,
      nodes: [
        room('A', '101', 115, 530, { starter: true, routes: [[route('B', 1.6)]] }),
        room('B', '201', 115, 400, { routes: [[route('G', 1.6)]] }),
        room('G', '202', 300, 400, { routes: [[route('C', 1.6)]] }),
        room('C', '301', 115, 245, { target: true, routes: [[route('R', 1.6)]] }),
        room('D', '103', 485, 530, { starter: true, routes: [[route('F')]] }),
        room('F', '303', 485, 245, { target: true, routes: [[route('R')]] }), roof()
      ] },
    { title: '今夜，全楼失守', subtitle: '选择路线，再对准那一拍', timeLimit: 45,
      brief: '让两个星标住户的笑声在2.5秒内到屋顶。101可走短链或长链；长链上的202关着窗。',
      hint: '短链：6秒点101，7.2秒点103。长链：开202、转101，先点101，8秒点103。',
      roofRequired: 2, syncWindow: 2.5, nodes: branchLevel(true) }
  ];

  function createGame(levelIndex) {
    var index = Math.max(0, Math.min(LEVELS.length - 1, Number(levelIndex) || 0));
    index = Math.floor(index);
    var level = LEVELS[index];
    var nodes = JSON.parse(JSON.stringify(level.nodes));
    nodes.forEach(function (node) {
      node.state = node.initialRest > 0 ? 'rest' : 'idle';
      node.remaining = node.initialRest;
      node.visited = false;
      node.emitted = false;
      node.laughElapsed = 0;
      node._restUntil = node.initialRest;
      node._activatedAt = -Infinity;
      node._laughUntil = -Infinity;
    });
    return { level: level, index: index, time: 0, status: 'ready', paused: false,
      remaining: 3, nodes: nodes, packets: [], history: [], roofHits: [], events: [],
      targetsHit: 0, totalTargets: nodes.filter(function (n) { return n.target; }).length,
      roofCount: 0, reason: '', message: level.brief, lastIgnite: -Infinity,
      lastAction: null, _accumulator: 0, _ticks: 0, _quietSince: null };
  }
  function nodeById(state, id) {
    return state.nodes.find(function (n) { return n.id === id; });
  }
  function event(state, type, id, extra) {
    state.events.push(Object.assign({ type: type, id: id || null, time: state.time }, extra || {}));
    if (state.events.length > 120) state.events.splice(0, state.events.length - 120);
  }
  function selectedRoutes(node) { return node.routes[node.routeIndex] || []; }
  function availableEdges(state) {
    var edges = [];
    state.nodes.forEach(function (source) {
      selectedRoutes(source).forEach(function (r) {
        var target = nodeById(state, r.to);
        if (!target) return;
        var reason = !source.open ? 'source-closed' : !target.open ? 'closed' :
          (!target.roof && target.state !== 'idle') ? target.state : '';
        edges.push({ from: source.id, to: target.id, travel: r.travel,
          active: !reason, blockedReason: reason });
      });
    });
    return edges;
  }
  function refreshCounts(state) {
    state.targetsHit = state.nodes.filter(function (n) { return n.target && n.visited; }).length;
    var hits = state.roofHits;
    if (state.level.syncWindow !== null) {
      hits = hits.filter(function (h) { return state.time - h.time <= state.level.syncWindow + EPS; });
    }
    state.roofCount = new Set(hits.map(function (h) { return h.from; })).size;
  }
  function activate(state, node, cause) {
    node.state = 'laugh';
    node.remaining = node.laughDuration;
    node.laughElapsed = 0;
    node._activatedAt = state.time;
    node._laughUntil = state.time + node.laughDuration;
    node.emitted = false;
    var firstVisit = !node.visited;
    node.visited = true;
    event(state, 'laugh', node.id, { cause: cause, firstVisit: firstVisit });
    if (node.target && firstVisit) state.message = node.name + '笑起来了！继续把这一声送上屋顶。';
    refreshCounts(state);
  }
  function reject(state, reason, message) {
    state.lastAction = { accepted: false, reason: reason, time: state.time };
    if (message) state.message = message;
    return false;
  }
  function accept(state, type, id) {
    state.lastAction = { accepted: true, type: type, id: id || null, time: state.time };
    return true;
  }
  function act(state, action) {
    action = action || {};
    if (action.type === 'start') {
      if (state.status !== 'ready') return reject(state, 'not-ready');
      state.status = 'playing';
      state.message = state.level.brief;
      event(state, 'start');
      return accept(state, 'start');
    }
    if (action.type === 'pause') {
      if (state.status !== 'playing') return reject(state, 'not-playing');
      state.paused = !state.paused;
      event(state, state.paused ? 'pause' : 'resume');
      return accept(state, 'pause');
    }
    if (state.status !== 'ready' && state.status !== 'playing') return reject(state, 'finished');
    if (state.paused) return reject(state, 'paused');
    var node = nodeById(state, action.id);
    if (!node || node.roof) return reject(state, 'invalid-node');
    if (action.type === 'window') {
      node.open = !node.open;
      state.message = node.name + (node.open ? '开窗了，笑声可以进出。' : '关窗了，抵达的笑声会被挡住。');
      event(state, 'window', node.id, { open: node.open });
      return accept(state, 'window', node.id);
    }
    if (action.type === 'horn') {
      if (!node.horn || node.routes.length < 2) return reject(state, 'no-horn');
      node.routeIndex = (node.routeIndex + 1) % node.routes.length;
      state.message = node.name + '改为' + (node.routeLabels[node.routeIndex] || '路线' + (node.routeIndex + 1)) + '；已发出的波继续前进。';
      event(state, 'horn', node.id, { routeIndex: node.routeIndex });
      return accept(state, 'horn', node.id);
    }
    if (action.type !== 'ignite') return reject(state, 'unknown-action');
    if (state.status !== 'playing') return reject(state, 'not-started', '先开始接力，再点火。');
    if (!node.starter) return reject(state, 'not-starter', '只有门口带火花的住户能主动点火。');
    if (state.remaining <= 0) return reject(state, 'no-matches', '三次点火已用完，看看在途的笑声。');
    if (!node.open) return reject(state, 'closed', '先打开' + node.name + '的窗；这次没有消耗点火。');
    if (node.state !== 'idle') return reject(state, node.state, node.name + '还在' + (node.state === 'laugh' ? '爆笑' : '喘气') + '；这次没有消耗点火。');
    if (state.time - state.lastIgnite < 0.5 - EPS) return reject(state, 'throttled', '隔半秒再点下一户；这次没有消耗点火。');
    state.remaining -= 1;
    state.lastIgnite = state.time;
    state._quietSince = null;
    state.message = node.name + '先笑为敬！0.8秒后传出笑声。';
    event(state, 'ignite', node.id);
    activate(state, node, 'ignite');
    return accept(state, 'ignite', node.id);
  }
  function finish(state, won, reason, message) {
    state.status = won ? 'won' : 'lost';
    state.reason = reason;
    state.message = message;
    state.paused = false;
    if (won) {
      var receiver = state.nodes.find(function (n) { return n.roof; });
      receiver.state = 'laugh';
      receiver.visited = true;
      receiver.remaining = receiver.laughDuration;
      receiver.laughElapsed = 0;
    }
    event(state, won ? 'win' : 'lose');
  }
  function tick(state) {
    state._ticks += 1;
    state.time = state._ticks * FIXED_STEP;
    // Recover before arrival: a packet landing exactly at recovery is valid.
    state.nodes.forEach(function (node) {
      if (node.roof) return;
      if (node.state === 'rest') {
        node.remaining = Math.max(0, node._restUntil - state.time);
        if (node.remaining <= EPS) {
          node.state = 'idle'; node.remaining = 0;
          event(state, 'ready', node.id);
        }
      } else if (node.state === 'laugh') {
        node.laughElapsed = state.time - node._activatedAt;
        node.remaining = Math.max(0, node._laughUntil - state.time);
        if (!node.emitted && node.laughElapsed >= node.burstDelay - EPS) {
          node.emitted = true;
          if (node.open) {
            selectedRoutes(node).forEach(function (r) {
              state.packets.push({ from: node.id, to: r.to, elapsed: 0,
                duration: r.travel, _startedAt: state.time });
            });
          }
          event(state, 'burst', node.id, { blocked: !node.open });
        }
        if (node.remaining <= EPS) {
          node.state = 'rest';
          node._restUntil = node._laughUntil + node.restDuration;
          node.remaining = Math.max(0, node._restUntil - state.time);
          event(state, 'rest', node.id);
        }
      }
    });
    var flying = [];
    var roofArrived = false;
    state.packets.forEach(function (packet) {
      packet.elapsed = Math.min(packet.duration, state.time - packet._startedAt);
      if (packet.elapsed < packet.duration - EPS) { flying.push(packet); return; }
      var target = nodeById(state, packet.to);
      var reason = !target ? 'missing' : !target.open ? 'closed' :
        !target.roof && target.state !== 'idle' ? target.state : '';
      var success = !reason;
      state.history.push({ from: packet.from, to: packet.to, success: success,
        time: state.time, reason: reason });
      if (success && target.roof) {
        state.roofHits.push({ from: packet.from, time: state.time });
        roofArrived = true;
        event(state, 'roof-hit', target.id, { from: packet.from });
      } else if (success) {
        activate(state, target, packet.from);
      } else {
        state.message = (target ? target.name : '住户') + (reason === 'closed' ? '关着窗' : reason === 'rest' ? '还在喘气' : '已经在笑') + '，这一声没有接上。';
        event(state, 'blocked', packet.to, { from: packet.from, reason: reason });
      }
    });
    state.packets = flying;
    refreshCounts(state);
    if (roofArrived) {
      if (state.targetsHit === state.totalTargets && state.roofCount >= state.level.roofRequired) {
        finish(state, true, 'roof-awake', '接上了！屋顶大蛙笑到整栋楼发亮。');
        return;
      }
      if (state.targetsHit < state.totalTargets) state.message = '屋顶听见了，还差' + (state.totalTargets - state.targetsHit) + '个星标住户。';
      else state.message = '屋顶接到一声，再一声要在2.5秒内抵达！';
    }
    if (state.time >= state.level.timeLimit - EPS) {
      finish(state, false, 'time-up', state.targetsHit < state.totalTargets ? '时间到了，还有星标住户没笑起来。看轨迹，再试一次。' : state.level.roofRequired > 1 ? '两声没接在一起。调整点火时间，再试一次。' : '笑声还没到屋顶。检查上层住户的窗，再试一次。');
      return;
    }
    var live = state.packets.length > 0 || state.nodes.some(function (n) { return !n.roof && n.state === 'laugh'; });
    if (state.remaining === 0 && !live) {
      if (state._quietSince === null) state._quietSince = state.time;
      if (state.time - state._quietSince >= 1.2 - EPS) {
        finish(state, false, 'no-propagation', '三次点火用完，笑声也停了。看上一轮轨迹，再试一次。');
      }
    } else state._quietSince = null;
  }
  function step(state, dt) {
    if (state.status !== 'playing' || state.paused || !Number.isFinite(dt) || dt <= 0) return state;
    state._accumulator += dt;
    while (state._accumulator >= FIXED_STEP - EPS && state.status === 'playing' && !state.paused) {
      state._accumulator -= FIXED_STEP;
      if (state._accumulator < 0) state._accumulator = 0;
      tick(state);
    }
    return state;
  }
  return { LEVELS: LEVELS, FIXED_STEP: FIXED_STEP, createGame: createGame,
    step: step, act: act, availableEdges: availableEdges };
});

