import { appendCosts } from '../lessons/vector.js';
import { stepList, codeBlock } from './shared.js';

export function vectorView(model) {
  const state = model.vector;
  const size = state.values.length;
  const doubling = appendCosts(8);
  const linear = appendCosts(8, 'linear');
  const challengeDone = model.vectorChallenge && size >= 8 && state.moved === 0;
  const disabled = model.busy ? 'disabled' : '';
  return {
    accessible: `<div class="model-heading"><span>点击元素，查看索引与地址</span><span>示意：sizeof(int) = 4 B</span></div><div class="memory-strip" aria-label="数组槽位">${Array.from({ length: state.capacity }, (_, index) => `<button class="memory-slot ${index >= size ? 'empty' : ''} ${model.selectedIndex === index ? 'selected' : ''}" data-action="inspect" data-index="${index}" aria-label="索引 ${index}${index < size ? `，值 ${state.values[index]}` : '，预留的空槽位'}" ${disabled}><small>${index}</small><span>${index < size ? state.values[index] : '·'}</span></button>`).join('') || '<span class="empty-memory">尚未分配存储空间</span>'}</div>`,
    panel: `<div class="panel-heading"><h2>${model.vectorChallenge ? '搬家规划师' : '动手之前，猜一猜'}</h2></div>
      ${model.vectorChallenge ? `<div class="challenge-intro"><p>从空 vector 放入 <strong>8 个元素</strong>，让已有元素的迁移次数保持为 <strong>0</strong>。</p><p class="muted">先想想：什么时候预留空间最划算？</p><div class="challenge-meter"><span style="width:${Math.min(100, size / 8 * 100)}%"></span></div><p class="challenge-count">${size} / 8 个元素 · 已迁移 ${state.moved} 个</p>${challengeDone ? '<div class="success-note">✓ 挑战完成！先 reserve，再连续添加。</div>' : state.moved ? '<div class="hint-note">已经发生迁移。撤销，或者重新开始挑战。</div>' : ''}<button class="text-button" data-action="challenge-vector" ${disabled}>重新开始挑战</button><button class="text-button" data-action="exit-vector-challenge" ${disabled}>返回自由实验</button></div>` : `<div class="prediction"><p class="mini-label">先预测，再动手</p><h3>再添加一个元素，<br>需要分配新空间吗？</h3><div class="prediction-buttons"><button data-action="predict-vector" data-choice="yes" ${disabled}>需要</button><button data-action="predict-vector" data-choice="no" ${disabled}>不需要</button></div><p class="prediction-result ${model.prediction?.correct ? 'correct' : ''}">${model.prediction?.message || '看看 size 和 capacity，再做判断。'}</p></div>`}
      <details><summary>我的实验进度</summary>${stepList([
        ['认识空间', '点一个元素，分清索引、值与地址。', model.vectorMilestones.inspected],
        ['填满容量', '继续添加，直到 size 等于 capacity。', model.vectorMilestones.filled],
        ['观察搬家', '再放入一个，看看数据如何迁移。', model.vectorMilestones.migrated],
        ['试试 reserve', '预留更多槽位，观察 size 是否变化。', model.vectorMilestones.reserved],
      ])}</details>
      <div class="panel-footnote">演示采用倍增策略，最多显示 16 个槽位。C++ 标准不规定固定增长倍率，reserve(n) 只保证容量至少为 n。</div>`,
    code: codeBlock(state.operations.slice(-10)),
    codeCaption: `${state.operations.length} 行操作记录`,
    explanation: `<div class="panel-heading"><h2>怎样理解？</h2><span class="small-label">空间与代价</span></div><ul class="lesson-notes"><li><strong>size</strong> 是现有元素数量；<strong>capacity</strong> 是这块存储能容纳的元素数量。</li><li>只有索引 <code>[0, size)</code> 可访问。预留空位里还没有元素，<code>reserve</code> 不会增大 size。</li><li>扩容会分配新存储并迁移元素，原有指针、引用和迭代器失效。</li><li><code>pop_back()</code> 销毁最后一个元素，保留 capacity。</li></ul><details class="cost-details"><summary>为什么通常按倍数增长？<span>展开代价账本 ＋</span></summary><p>从空数组添加 8 个元素，按“写入 1 次 = 1 单位，迁移 1 个元素 = 1 单位”计数：</p><div class="cost-row"><span>容量翻倍</span><div><i style="width:${doubling.cost / linear.cost * 100}%"></i></div><b>${doubling.cost}</b></div><div class="cost-row linear"><span>每次只加 1</span><div><i style="width:100%"></i></div><b>${linear.cost}</b></div><p>单次扩容需要 O(n) 的迁移；连续多次尾部添加，平均到每次是摊还 O(1)。这里统计的是操作次数，不是运行毫秒数。</p></details>`,
    message: state.message,
  };
}
