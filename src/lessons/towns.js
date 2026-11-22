// A road's walking time is independent of its length on the illustrated page.
const stops = entries => entries.map(([id, name]) => ({ id, name }));
const roads = entries => entries.map(([from, to, minutes]) => ({ from, to, minutes }));

export const MAP_SCENARIOS = [
  {
    id: 'everyday', name: '集市街区', source: 'post', target: 'pier',
    lesson: '看钟楼的站牌怎样从 7 分钟改成 3 分钟。',
    stops: stops([['post', '邮局'], ['clock', '钟楼'], ['garden', '花园'], ['books', '书店'], ['pier', '码头']]),
    roads: roads([
      ['post', 'clock', 7], ['post', 'garden', 2], ['garden', 'clock', 1], ['garden', 'books', 2],
      ['clock', 'books', 2], ['garden', 'pier', 8], ['books', 'pier', 2],
    ]),
  },
  {
    id: 'riverside', name: '滨河栈道', source: 'ferry', target: 'beacon',
    lesson: '从渡口到灯塔，沿岸走还是沿栈道走？',
    stops: stops([['ferry', '渡口'], ['reed', '芦洲'], ['lock', '船闸'], ['dock', '船坞'], ['shoal', '沙滩'], ['beacon', '灯塔']]),
    roads: roads([
      ['ferry', 'reed', 2], ['ferry', 'lock', 4], ['reed', 'dock', 2], ['lock', 'dock', 5],
      ['lock', 'beacon', 6], ['dock', 'beacon', 3], ['dock', 'shoal', 2], ['shoal', 'beacon', 5],
    ]),
  },
  {
    id: 'clock', name: '钟楼车站', source: 'gate', target: 'platform',
    lesson: '去站台的路，少经过一站就更快吗？',
    stops: stops([['gate', '站门'], ['ticket', '票厅'], ['hall', '大厅'], ['check', '闸机'],
      ['underpass', '地道'], ['luggage', '行包房'], ['platform', '站台']]),
    roads: roads([
      ['gate', 'ticket', 2], ['gate', 'underpass', 5], ['ticket', 'hall', 2], ['ticket', 'luggage', 5],
      ['hall', 'luggage', 2], ['hall', 'check', 1], ['luggage', 'check', 4],
      ['underpass', 'platform', 6], ['check', 'platform', 2],
    ]),
  },
  {
    id: 'tie', name: '双桥河谷', source: 'camp', target: 'summit',
    lesson: '从营地到山顶，两座桥能一样快吗？',
    stops: stops([['camp', '营地'], ['pine', '松林'], ['trail', '石径'], ['truss', '桁架桥'],
      ['rope', '吊桥'], ['ridge', '山脊'], ['spring', '清泉'], ['summit', '山顶']]),
    roads: roads([
      ['camp', 'pine', 2], ['camp', 'trail', 1], ['pine', 'truss', 1], ['trail', 'rope', 2],
      ['truss', 'ridge', 3], ['rope', 'spring', 2], ['ridge', 'summit', 2], ['spring', 'summit', 3],
    ]),
  },
];
