import { forestResult, midpoint, boundaryCheck, SCENARIOS } from '../lessons/binary.js';
import { icons } from './shared.js';

function forestDock(model) {
  const state = model.binary;
  const disabled = model.busy ? 'disabled' : '';
  const leave = `<button class="text-button dock-exit" data-action="binary-mode" data-mode="explore" ${disabled}>自由探索</button>`;
  const undo = `<button class="icon-button" data-action="undo-binary" aria-label="撤销本轮" title="撤销本轮" ${model.busy || (!state.pending && !state.history.length) ? 'disabled' : ''}>${icons.undo}</button>`;
  if (model.binaryMode === 'explore') {
    return `<label class="slider-control"><span>锯片高度 <output id="height-output">${model.sawHeight}</output><small>米</small></span><input id="saw-height" type="range" min="0" max="${Math.max(...state.heights)}" step="1" value="${model.sawHeight}" aria-label="锯片高度" ${disabled}></label><button class="primary" data-action="cut" ${disabled}>试砍 ${icons.arrow}</button><span class="dock-divider"></span><button class="text-button" data-action="binary-mode" data-mode="search" ${disabled}>开始挑战</button>`;
  }
  if (!state.possible) {
    return `<div class="dock-prompt"><span>森林只有 ${state.totalWood} 米木材</span><strong>需求超过了总量</strong></div><button class="primary" data-action="drawer" data-tab="settings">调整需求 ${icons.arrow}</button><span class="dock-divider"></span>${leave}`;
  }
  if (state.done) {
    const boundary = boundaryCheck(state);
    return `<div class="boundary-inline" data-testid="boundary-comparison"><span>H = ${state.answer}<strong>${boundary.answer.wood} 米 <small>✓</small></strong></span><span>H = ${state.answer + 1}<strong>${boundary.above.wood} 米 <small>×</small></strong></span></div><button class="primary" data-action="next-problem" ${disabled}>下一题 ${icons.arrow}</button>${undo}<span class="dock-divider"></span>${leave}`;
  }
  if (state.pending) {
    return `<div class="dock-prompt"><span>H = ${state.pending.height} 米 · ${state.pending.feasible ? '木材足够' : '木材不足'}</span><strong>接下来，保留哪一段？</strong></div><div class="half-actions"><button data-action="choose-half" data-direction="left" ${disabled}>左段 <small>[${state.lo}, ${state.pending.height - 1}]</small></button><button data-action="choose-half" data-direction="right" ${disabled}>右段 <small>[${state.pending.height}, ${state.hi}]</small></button></div>${undo}<span class="dock-divider"></span>${leave}`;
  }
  return `<div class="dock-prompt"><span>下一个中点</span><strong>${midpoint(state)} <small>米</small></strong></div><button class="primary" data-action="probe" ${disabled}>检验中点 ${icons.arrow}</button>${undo}<span class="dock-divider"></span>${leave}`;
}

function vectorDock(model) {
  const state = model.vector;
  const disabled = model.busy ? 'disabled' : '';
  const value = Number.isFinite(model.nextValue) ? model.nextValue : '';
  const undo = `<button class="icon-button" data-action="undo-vector" title="撤销上一步" aria-label="撤销上一步" ${model.busy || !model.vectorHistory.length ? 'disabled' : ''}>${icons.undo}</button>`;
  if (model.vectorChallenge && state.values.length >= 8 && !state.moved) {
    return `<div class="dock-prompt success-note"><span>挑战完成</span><strong>8 个元素，零迁移。</strong></div><button class="primary" data-action="exit-vector-challenge" ${disabled}>回到实验 ${icons.arrow}</button>${undo}`;
  }
  const actions = `<label class="element-control">元素值<input id="element-value" type="number" min="-999" max="999" step="1" value="${value}" aria-label="元素值" ${disabled}></label><button class="primary" data-action="push" ${model.busy || state.values.length === 16 ? 'disabled' : ''}>添加元素 ${icons.arrow}</button><button class="icon-button" data-action="pop" aria-label="移除末尾" title="移除末尾" ${model.busy || !state.values.length ? 'disabled' : ''}>${icons.minus}</button>${undo}`;
  if (model.vectorChallenge) {
    return `${actions}<span class="dock-divider"></span><button class="text-button" data-action="drawer" data-tab="settings" ${disabled}>预留空间</button><button class="text-button dock-exit" data-action="exit-vector-challenge" ${disabled}>退出挑战</button>`;
  }
  return `${actions}<span class="dock-divider"></span><button class="text-button" data-action="challenge-vector" ${disabled}>开始挑战</button>`;
}

function forestSettings(model) {
  const state = model.binary;
  const disabled = model.busy ? 'disabled' : '';
  return `<div class="settings-group"><h3>换一片森林</h3><label>选择题目<select id="scenario-select" aria-label="题目" ${disabled}>${SCENARIOS.map((scenario, index) => `<option value="${index}" ${model.scenarioIndex === index ? 'selected' : ''}>${scenario.name}</option>`).join('')}${model.scenarioIndex === -1 ? '<option value="-1" selected>自定义森林</option>' : ''}</select></label><p class="muted">树高：${state.heights.join('、')} 米</p><button data-action="custom-problem" ${disabled}>自定义树高 ${icons.arrow}</button></div><div class="settings-group"><h3>改变木材需求</h3><div class="field-row"><label>至少<input id="wood-target" type="number" min="1" max="500" step="1" value="${state.target}" aria-label="木材需求" ${disabled}>米</label><button class="primary" data-action="change-target" ${disabled}>更新需求</button></div><p class="muted">更新后重启搜索，树高保持不变。</p></div>`;
}

function vectorSettings(model) {
  const disabled = model.busy ? 'disabled' : '';
  const value = Number.isFinite(model.reserveValue) ? model.reserveValue : '';
  return `<div class="settings-group"><h3>提前留出空间</h3><p class="muted">reserve 预留槽位，不增加已有元素。</p><div class="field-row"><label>预留<input id="reserve-value" type="number" min="0" max="16" step="1" value="${value}" aria-label="预留容量" ${disabled}>个槽位</label><button class="primary" data-action="reserve" ${disabled}>reserve</button></div></div><div class="settings-group"><h3>直接查看元素</h3><p class="muted">点击书中房屋或下方槽位，查看索引与地址。</p></div>`;
}

export function studioView(model, detail) {
  if (model.chapter === 'vector') {
    const state = model.vector;
    const size = state.values.length;
    const complete = model.vectorChallenge && size >= 8 && !state.moved;
    let message = state.event === 'initial' ? '放入一个元素，看看空位会怎样变化。' : state.event === 'reallocate' ? `容量增至 ${state.capacity}，累计迁移 ${state.moved} 个元素。` : state.event === 'pop' ? '少了一个元素，容量保持不变。' : state.event === 'reserve' ? `capacity = ${state.capacity}，size 仍是 ${size}。` : `已放入 ${size} 个元素，还剩 ${state.capacity - size} 个空槽位。`;
    if (model.prediction) message = model.prediction.correct ? '判断正确。动手试一试。' : '再看看 size 和 capacity 的关系。';
    if (model.selectedIndex !== null) message = `v[${model.selectedIndex}] = ${state.values[model.selectedIndex]} · 示意字节偏移 +${model.selectedIndex * 4} B`;
    if (complete) message = '先预留空间，就能避免后续搬家。';
    else if (model.vectorChallenge) message = state.moved ? '已经发生迁移。可以撤销，重新规划空间。' : `已装入 ${size} / 8 个元素，迁移 ${state.moved} 个。`;
    return {
      ...detail,
      title: '给数组，留一点空间。',
      subtitle: model.vectorChallenge ? '装入 8 个元素，让已有元素的迁移次数保持为 0。' : '装入一个元素，看看什么时候需要搬家。',
      stats: `<span class="metric"><small>size</small><b data-testid="size">${size}</b></span><span class="metric"><small>capacity</small><b data-testid="capacity">${state.capacity}</b></span><span class="submetric">搬迁 <b data-testid="relocations">${state.relocations}</b> 次</span>`,
      controls: vectorDock(model), settings: vectorSettings(model), message,
    };
  }
  const state = model.binary;
  const search = model.binaryMode === 'search';
  const result = forestResult(model);
  let message = '锯片越高，收集的木材越少。';
  if (!state.possible) message = `森林共 ${state.totalWood} 米木材，无法满足 ${state.target} 米需求。`;
  else if (search && state.done) message = state.answer ? `${state.answer} 米足够，再高一米就不够。` : '0 是合法答案：必须从地面切割。';
  else if (model.binaryHint) message = state.pending?.feasible ? '木材足够，应保留右段，继续尝试更高。' : '木材不足，应保留左段，降低锯片。';
  else if (search && state.pending) message = state.pending.feasible ? '足够了，还能再高吗？' : '木材不够，锯片应该往哪边移动？';
  else if (search) message = `候选高度 [${state.lo}, ${state.hi}]，先试中间的高度。`;
  else if (model.cutResult) message = result.feasible ? `收集 ${result.wood} 米。试着把锯片再抬高一点。` : `还差 ${state.target - result.wood} 米，试着降低锯片。`;
  return {
    ...detail,
    title: '把锯片，再抬高一点。',
    subtitle: `至少收集 ${state.target} 米木材，锯片越高越好。`,
    stats: `<span class="wood-stat ${result && !result.feasible ? 'insufficient' : ''}"><small>木材</small><strong>${result?.wood ?? '—'} <em>/ ${state.target} m</em></strong>${result ? `<span class="result-word">${result.feasible ? '足够' : '不足'}</span>` : ''}</span>${search ? `<span class="search-stat"><span data-testid="range">${state.possible ? `[${state.lo}, ${state.hi}]` : '无可行高度'}</span><span>已检验 <b data-testid="checks">${state.history.length + Number(!!state.pending)}</b> 次</span>${state.done && state.possible ? `<span class="sr-only" data-testid="answer">${state.answer}</span>` : ''}</span>` : ''}`,
    controls: forestDock(model), settings: forestSettings(model), message,
  };
}
