(function (root) {
  'use strict';

  const DIRS = Object.freeze({
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
  });
  const key = (x, y) => `${x},${y}`;

  function createState(level) {
    if (!level || !Array.isArray(level.map) || !level.map.length) throw new Error('缺少舞台地图');
    const width = level.map[0].length;
    if (level.map.some(row => row.length !== width)) throw new Error('地图各行必须等长');
    const walls = [], pits = [], goals = [], crates = [];
    let start = null, exit = null;
    for (let y = 0; y < level.map.length; y++) {
      for (let x = 0; x < width; x++) {
        const tile = level.map[y][x];
        if (!'#.SEoC*X'.includes(tile)) throw new Error(`未知地图符号 ${tile}`);
        if (tile === '#') walls.push({ x, y });
        if (tile === 'X') pits.push({ x, y });
        if (tile === 'o' || tile === '*') goals.push({ x, y });
        if (tile === 'C' || tile === '*') crates.push({ x, y });
        if (tile === 'S') { if (start) throw new Error('只能有一个录像印记'); start = { x, y }; }
        if (tile === 'E') { if (exit) throw new Error('只能有一个出口'); exit = { x, y }; }
      }
    }
    if (!start || !exit || goals.length !== crates.length || !crates.length || crates.length > 2) {
      throw new Error('地图需要起点、出口及一至两个成对箱子目标');
    }
    const dir = DIRS[level.startDir] ? level.startDir : 'down';
    return {
      level, width, height: level.map.length, walls, pits, goals, start, exit,
      player: { ...start, dir }, facing: dir, crates,
      history: [{ ...start }], moves: 0, laughs: 0, rewinds: 0,
      status: 'playing', failureReason: null, lastEvent: null
    };
  }

  function tileAt(state, x, y) {
    return x < 0 || y < 0 || x >= state.width || y >= state.height ? '#' : state.level.map[y][x];
  }
  function crateAt(state, x, y) { return state.crates.findIndex(c => c.x === x && c.y === y); }
  function isWall(state, x, y) { return tileAt(state, x, y) === '#'; }
  function isPit(state, x, y) { return tileAt(state, x, y) === 'X'; }
  function isGoal(state, x, y) { return state.goals.some(g => g.x === x && g.y === y); }
  function isWalkable(state, x, y) { return !isWall(state, x, y) && crateAt(state, x, y) === -1; }
  function isCrateBlocked(state, x, y) {
    return isWall(state, x, y) || (x === state.start.x && y === state.start.y);
  }
  function getObjectives(state) {
    return { placed: state.crates.filter(c => isGoal(state, c.x, c.y)).length, total: state.goals.length };
  }
  function isDeadCorner(state, crate) {
    if (isGoal(state, crate.x, crate.y)) return false;
    const horizontal = isCrateBlocked(state, crate.x - 1, crate.y) || isCrateBlocked(state, crate.x + 1, crate.y);
    const vertical = isCrateBlocked(state, crate.x, crate.y - 1) || isCrateBlocked(state, crate.x, crate.y + 1);
    return horizontal && vertical;
  }
  function finish(state, event) {
    if (state.status === 'playing') {
      const objectives = getObjectives(state);
      if (objectives.placed === objectives.total && state.player.x === state.exit.x && state.player.y === state.exit.y) {
        state.status = 'won';
        event = { ...event, actionType: event.type, type: 'won', message: '收工！箱子留下，奶蛙退场。' };
      }
    }
    state.lastEvent = event;
    return event;
  }
  function fail(state, reason, event) {
    state.status = 'failed'; state.failureReason = reason;
    return finish(state, { ...event, actionType: event.type, type: 'failed', reason,
      message: reason === 'pit' ? '掉进舞台洞了。重拍，一切回到开场。' : '箱子卡进死角了。重拍再试一次。' });
  }

  function act(state, action) {
    if (action === 'reset') {
      const fresh = createState(state.level);
      for (const field of Object.keys(state)) delete state[field];
      Object.assign(state, fresh);
      return finish(state, { type: 'reset', message: '重拍：奶蛙、箱子一起回到开场。' });
    }
    if (state.status !== 'playing') return { type: 'inactive', message: state.status === 'won' ? '本幕已完成。' : '重拍后继续。' };
    if (DIRS[action]) {
      state.player.dir = action; state.facing = action;
      const d = DIRS[action], from = { x: state.player.x, y: state.player.y };
      const to = { x: from.x + d.x, y: from.y + d.y };
      if (!isWalkable(state, to.x, to.y)) {
        return finish(state, { type: 'blocked', direction: action, message: crateAt(state, to.x, to.y) >= 0 ? '面朝箱子了，按「笑」推动。' : '这边没有路。' });
      }
      state.player.x = to.x; state.player.y = to.y;
      state.history.push({ ...to }); state.moves++;
      const event = { type: 'move', from, to, direction: action, message: '' };
      return isPit(state, to.x, to.y) ? fail(state, 'pit', event) : finish(state, event);
    }
    if (action === 'laugh') {
      const d = DIRS[state.player.dir];
      const bx = state.player.x + d.x, by = state.player.y + d.y;
      const index = crateAt(state, bx, by);
      if (index < 0) return finish(state, { type: 'empty-laugh', message: '笑声只能推面前紧挨着的箱子。' });
      const to = { x: bx + d.x, y: by + d.y };
      if (isCrateBlocked(state, to.x, to.y) || crateAt(state, to.x, to.y) >= 0) {
        return finish(state, { type: 'blocked', message: to.x === state.start.x && to.y === state.start.y ? '录像印记只属于奶蛙，箱子不能占用。' : '箱子后面被挡住了。' });
      }
      const from = { x: bx, y: by };
      state.crates[index] = { ...to }; state.laughs++;
      const event = { type: 'push', index, from, to, direction: state.player.dir,
        onGoal: isGoal(state, to.x, to.y), message: isGoal(state, to.x, to.y) ? '箱子就位。倒放也不会把它带走。' : '笑声留下的结果，不会随倒放消失。' };
      if (isPit(state, to.x, to.y)) return fail(state, 'pit', event);
      if (isDeadCorner(state, to)) return fail(state, 'corner', event);
      return finish(state, event);
    }
    if (action === 'rewind') {
      if (state.history.length <= 1) return finish(state, { type: 'blocked', message: '先走几步，才有录像可以倒放。' });
      const path = state.history.slice().reverse().map(p => ({ x: p.x, y: p.y }));
      const from = { x: state.player.x, y: state.player.y };
      state.player = { ...state.start, dir: DIRS[state.level.startDir] ? state.level.startDir : 'down' };
      state.facing = state.player.dir;
      state.history = [{ ...state.start }]; state.rewinds++;
      return finish(state, { type: 'rewind', from, to: { ...state.start }, path,
        message: '人回去了，箱子还在。' });
    }
    return finish(state, { type: 'invalid', message: '未知操作。' });
  }

  const api = { DIRS, createState, act, tileAt, crateAt, isWall, isPit, isGoal, isWalkable,
    isCrateBlocked, isDeadCorner, getObjectives, key };
  root.RewindEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
