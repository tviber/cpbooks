import { forestResult } from '../lessons/binary.js';
import { codeBlock } from './shared.js';

const binaryCode = [
  'auto check = [&](long long h) {',
  '  long long wood = 0;',
  '  for (long long tree : heights)',
  '    wood += std::max(tree - h, 0LL);',
  '  return wood >= required;',
  '};',
  'if (!check(0)) return -1;',
  'long long lo = 0, hi = maxHeight;',
  'while (lo < hi) {',
  '  long long mid = lo + (hi - lo + 1) / 2;',
  '  if (check(mid)) lo = mid;',
  '  else hi = mid - 1;',
  '}',
  'return lo;',
];

export function woodSummary(result, target, recorded = false) {
  if (!result) return '<div class="wood-summary"><p class="cut-equation">按下“检验中点”，把每棵树高于锯片的部分相加。</p></div>';
  const scale = Math.max(target, result.wood, 1);
  const colors = ['#ac5d3e', '#bb7c48', '#d09a5c', '#97794e', '#b56f5d', '#bb995f'];
  return `<div class="wood-summary" data-testid="wood-summary">
    <div class="wood-heading"><span>${recorded ? '本次试砍' : '实时预览'} · H = <b data-testid="saw-height">${result.height}</b> 米</span><strong class="${result.feasible ? 'positive' : 'negative'}">${result.wood} / ${target} 米 · ${result.feasible ? '足够' : '不足'}</strong></div>
    <div class="wood-meter" aria-label="木材总长度 ${result.wood} 米，需求 ${target} 米"><div class="wood-segments">${result.contributions.map((contribution, index) => `<span style="width:${contribution / scale * 100}%;background:${colors[index]}"></span>`).join('')}</div><i style="left:calc(${target / scale * 100}% - 1px)" title="需求 ${target} 米"></i></div>
    <div class="tree-contributions">${result.contributions.map((contribution, index) => `<span><small>第 ${index + 1} 棵</small><b>${contribution}</b> 米</span>`).join('')}</div>
    <p class="cut-equation"><strong>${result.contributions.join(' + ')} = ${result.wood} 米</strong>，${result.feasible ? '足够，还可以尝试把锯片抬高。' : '不足，更高的锯片也一定不可行。'}</p>
  </div>`;
}

export function binaryView(model) {
  const state = model.binary;
  const maximum = Math.max(...state.heights);
  const isSearch = model.binaryMode === 'search';
  const result = forestResult(model);
  const recorded = isSearch || model.cutResult?.height === model.sawHeight;
  const disabled = model.busy ? 'disabled' : '';
  let codeActive = 9;
  if (!state.possible) codeActive = 6;
  else if (state.pending) codeActive = 4;
  else if (state.done) codeActive = 13;
  else if (state.history.length) codeActive = state.history.at(-1).feasible ? 10 : 11;
  if (!isSearch) codeActive = recorded ? 4 : 3;
  const verified = new Map((isSearch ? [...state.history, ...(state.pending ? [state.pending] : [])] : model.trials).map(item => [item.height, item]));
  return {
    accessible: `${woodSummary(result, state.target, recorded)}<div class="model-heading"><span>候选高度 · H = 0 表示从地面切割</span><span>${isSearch ? '淡色刻度已被排除' : '点击刻度也可调整高度'}</span></div><div class="answer-ruler" aria-label="候选高度刻度">${Array.from({ length: maximum + 1 }, (_, value) => {
      const trial = verified.get(value);
      const excluded = isSearch && (!state.possible || value < state.lo || value > state.hi);
      const winner = isSearch && state.done && state.possible && value === state.answer;
      return `<button data-action="ruler" data-value="${value}" class="ruler-cell ${excluded ? 'excluded' : ''} ${trial ? trial.feasible ? 'feasible' : 'infeasible' : ''} ${winner ? 'winner' : ''} ${!isSearch && value === model.sawHeight ? 'selected' : ''}" aria-label="高度 ${value}${trial ? trial.feasible ? '，可行' : '，不可行' : ''}" ${disabled}>${value}${trial ? `<small>${trial.feasible ? '✓' : '×'}</small>` : ''}</button>`;
    }).join('')}</div>`,
    panel: `<div class="panel-footnote">每次试砍恢复原始树高，树不需要排序。树冠只表示外形，木材按高度差计算。<br><a href="https://www.luogu.com.cn/problem/P1873" target="_blank" rel="noreferrer">题目原型：洛谷 P1873 EKO / 砍树 ↗</a></div>`,
    code: codeBlock(binaryCode, codeActive),
    codeCaption: !isSearch ? `自由试砍 · check(${model.sawHeight})` : !state.possible ? '木材总量检查' : state.pending ? `正在判定 check(${state.pending.height})` : state.done ? '返回最高可行高度' : '最大化可行值',
    explanation: `<div class="panel-heading"><h2>怎样理解？</h2><span class="small-label">单调性与边界</span></div><ul class="lesson-notes"><li>搜索的是<strong>锯片高度 H</strong>。每棵树贡献 <code>max(树高 - H, 0)</code>，相加后与需求 M 比较。</li><li>H 可行，所有更低的非负整数高度也可行。H 不可行，更高的也不可行。</li><li>木材足够：<code>lo = mid</code>，保留 mid，继续尝试抬高。木材不足：<code>hi = mid - 1</code>。</li></ul><details><summary>边界与数据范围</summary><p>最优解不一定恰好得到 M 米，只要至少达到 M。0 是合法高度；先检查 check(0)，不够则无解。</p><p>累计木材用 long long 避免 int 溢出。每轮 O(n)，整体 O(n log A)，A 为最高树高。</p></details>
      <details class="history-details" ${state.history.length ? 'open' : ''}><summary>我的判定记录<span>${state.history.length} 轮</span></summary>${state.history.length ? `<table><thead><tr><th>锯片高度</th><th>木材</th><th>判定</th><th>新范围</th></tr></thead><tbody>${state.history.map(step => `<tr><td>${step.height} 米</td><td>${step.wood} 米</td><td class="${step.feasible ? 'positive' : 'negative'}">${step.feasible ? '足够' : '不足'}</td><td>[${step.after.join(', ')}]</td></tr>`).join('')}</tbody></table>` : '<p>每次正确收缩区间，都会记录本轮锯片高度、木材总量和新范围。</p>'}</details>
      <details><summary>为什么中点要向上取整？<span>想一想 ＋</span></summary><p>例如只剩 [15, 16]，若向下取整得到 15 且可行，lo = 15 就原地不动。向上取整会检验 16，判断后区间一定缩小。</p></details>
      <details><summary>二分节省了多少次尝试？<span>比较 ＋</span></summary><p>确认总量足够后，候选高度有 ${maximum + 1} 个，二分最多需要 ${Math.ceil(Math.log2(maximum + 1))} 次中点检验。页面计数不包含最初的总量检查；顺序枚举的次数取决于答案和方向。</p></details>`,
    message: model.binaryMessage || (!state.possible ? `总木材 ${state.totalWood} 米小于需求 ${state.target} 米，没有可行高度。可以降低需求后重试。` : isSearch ? '先检验中点，再决定保留哪段高度。木材足够后，继续挑战更高的锯片。' : '先升降锯片观察橙色部分。点击“试砍”记录一次 check；每次都从原始树高重新试验。'),
  };
}
