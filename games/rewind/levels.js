(function (root) {
  'use strict';
  const levels = [
    {
      id: 1, title: '人回去，祸还在', subtitle: '把入口笑堵上，再倒放退场。',
      hint: '从右侧绕到箱子下方，朝上笑。箱子到圈里后，按倒放回录像印记。',
      startDir: 'right', expectedSeconds: 40,
      map: [
        '#######',
        '#SE####',
        '##.o.##',
        '###C.##',
        '###..##',
        '#######'
      ]
    },
    {
      id: 2, title: '笑声也会拐弯', subtitle: '先向右留点后果，再换个位置笑。',
      hint: '绕到箱子左边，先把它笑到右侧路口；倒放回来，从下方向上笑。',
      startDir: 'left', expectedSeconds: 40,
      map: [
        '########',
        '###E.o##',
        '###.C.S#',
        '#####..#',
        '########'
      ]
    },
    {
      id: 3, title: '两个门，一声回放', subtitle: '两边都能进。最后，两边都会堵。',
      hint: '两只箱子都往上推到圈里。左右顺序随你，可以全部完成再倒放。',
      startDir: 'left', expectedSeconds: 45,
      map: [
        '#########',
        '#..S.E..#',
        '##.###.##',
        '##.o.o.##',
        '###C.C###',
        '###...###',
        '#########'
      ]
    },
    {
      id: 4, title: '再笑一次就过了', subtitle: '笑两次到位，第三次可就掉下去了。',
      hint: '从右边绕到底下。第一次笑后向前一步，再笑到圈里便倒放。第三次会把箱子推进洞。',
      startDir: 'right', expectedSeconds: 40,
      map: [
        '#######',
        '#SEX###',
        '##.o.##',
        '###..##',
        '###C.##',
        '###..##',
        '#######'
      ]
    },
    {
      id: 5, title: '双倍后果', subtitle: '上面一次，下面一次。出口留给自己。',
      hint: '两只箱子都先向右笑到路口。每次倒放回来，再从外侧把它转进目标圈。上下顺序都行。',
      startDir: 'left', expectedSeconds: 50,
      map: [
        '#########',
        '###..o###',
        '###.C..S#',
        '#####..##',
        '###E...##',
        '#####..##',
        '###.C...#',
        '###..o###',
        '#########'
      ]
    }
  ];
  root.RewindLevels = levels;
  if (typeof module !== 'undefined' && module.exports) module.exports = levels;
})(typeof globalThis !== 'undefined' ? globalThis : window);
