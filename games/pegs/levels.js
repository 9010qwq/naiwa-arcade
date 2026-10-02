(function (root, factory) {
  const levels = factory();
  if (typeof module === 'object' && module.exports) module.exports = levels;
  root.PegLevels = levels;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function target(x, y, group) { return { x, y, r: 17, target: true, group }; }
  function peg(x, y) { return { x, y, r: 11, target: false, group: -1 }; }
  function pad(x, y, angle, length) { return { x, y, baseAngle: angle, length: length || 80 }; }
  return [
    {
      title: '早班开门', subtitle: '先叫醒六位小客人', balls: 6,
      tip: '拖动瞄准，松手发射。橙色小奶蛙都醒来就过关。',
      pegs: [target(166, 190, 0), target(240, 222, 0), target(314, 190, 0), target(176, 344, 1), target(240, 386, 1), target(304, 344, 1), peg(117, 276), peg(363, 276), peg(240, 298)],
      pads: [], bucketSpeed: .65, bucketRange: 140
    },
    {
      title: '接住再来', subtitle: '落进回收桶，弹珠加一', balls: 6,
      tip: '下方回收桶会返还弹珠。瞄准时可等它移动到合适位置。',
      pegs: [target(128, 192, 0), target(206, 223, 0), target(274, 223, 0), target(352, 192, 0), target(155, 360, 1), target(240, 392, 1), target(325, 360, 1), peg(105, 295), peg(375, 295), peg(240, 300)],
      pads: [], bucketSpeed: .72, bucketRange: 155
    },
    {
      title: '笑脸翻一面', subtitle: '整组笑醒，软垫翻转三秒', balls: 6,
      tip: '奶蛙脚下小点表示同组。整组醒来，会让笑脸软垫翻转。',
      pegs: [target(167, 170, 0), target(240, 204, 0), target(313, 170, 0), target(137, 315, 1), target(205, 364, 1), target(275, 364, 1), target(343, 315, 1), peg(240, 290), peg(102, 401), peg(378, 401)],
      pads: [pad(240, 451, -.22, 100)], bucketSpeed: .68, bucketRange: 145
    },
    {
      title: '左右都营业', subtitle: '先选一边，再接另一条路线', balls: 6,
      tip: '两侧各有一组。先清掉一边，后续弹珠能走得更深。',
      pegs: [target(112, 185, 0), target(166, 254, 0), target(111, 343, 0), target(178, 413, 0), target(368, 185, 1), target(314, 254, 1), target(369, 343, 1), target(302, 413, 1), peg(240, 194), peg(240, 299), peg(240, 398), peg(65, 265), peg(415, 265)],
      pads: [pad(142, 463, .3, 80), pad(338, 463, -.3, 80)], bucketSpeed: .79, bucketRange: 160
    },
    {
      title: '三排连着笑', subtitle: '让弹跳穿过错开的队伍', balls: 7,
      tip: '第一段虚线只到首次碰撞。看落点，下一发再调整。',
      pegs: [target(112, 170, 0), target(196, 202, 0), target(284, 202, 0), target(368, 170, 0), target(153, 302, 1), target(240, 335, 1), target(327, 302, 1), target(110, 424, 2), target(240, 452, 2), target(370, 424, 2), peg(75, 273), peg(405, 273), peg(240, 266), peg(174, 401), peg(306, 401)],
      pads: [pad(135, 503, -.3, 72), pad(345, 503, .3, 72)], bucketSpeed: .85, bucketRange: 163
    },
    {
      title: '全员笑醒啦', subtitle: '选好路线，完成最后一盘', balls: 7,
      tip: '三组奶蛙，三次翻垫机会。清空一组后留意新的反弹方向。',
      pegs: [target(114, 167, 0), target(181, 222, 0), target(129, 317, 0), target(95, 425, 0), target(366, 167, 1), target(299, 222, 1), target(351, 317, 1), target(385, 425, 1), target(240, 174, 2), target(240, 286, 2), target(207, 409, 2), target(273, 409, 2), peg(60, 245), peg(420, 245), peg(174, 333), peg(306, 333), peg(161, 481), peg(319, 481)],
      pads: [pad(142, 519, .28, 74), pad(338, 519, -.28, 74)], bucketSpeed: .91, bucketRange: 160
    }
  ];
});
