export const SCENARIOS = [
  { name: '经典砍树 · 需求 7 米', heights: [20, 15, 10, 17], target: 7 },
  { name: '多要一些木材 · 10 米', heights: [20, 15, 10, 17], target: 10 },
  { name: '另一片森林 · 20 米', heights: [4, 42, 40, 26, 46], target: 20 },
  { name: '必须从地面切割', heights: [4, 3, 2, 1], target: 10 },
  { name: '木材总量不足', heights: [4, 3, 2, 1], target: 11 },
];

export function validateProblem(heights, target) {
  if (!Array.isArray(heights) || heights.length < 2 || heights.length > 6 || heights.some(height => !Number.isInteger(height) || height < 1 || height > 50)) {
    throw new Error('请输入 2 到 6 棵树的高度，每棵为 1 到 50 米的整数。');
  }
  if (!Number.isInteger(target) || target < 1 || target > 500) throw new Error('木材需求请输入 1 到 500 米的整数。');
}

export function harvestWood(heights, target, height) {
  validateProblem(heights, target);
  if (!Number.isInteger(height) || height < 0 || height > Math.max(...heights)) throw new Error('锯片高度必须是 0 到最高树高之间的整数。');
  const contributions = heights.map(tree => Math.max(tree - height, 0));
  const wood = contributions.reduce((sum, contribution) => sum + contribution, 0);
  return { height, contributions, wood, feasible: wood >= target };
}

export function createSearch(heights = [20, 15, 10, 17], target = 7) {
  validateProblem(heights, target);
  const totalWood = heights.reduce((sum, height) => sum + height, 0);
  const possible = totalWood >= target;
  return {
    heights: [...heights], target, totalWood, possible,
    lo: 0, hi: Math.max(...heights), answer: null,
    history: [], pending: null, done: !possible, mistakes: 0,
  };
}

export function midpoint(state) {
  return state.lo + Math.floor((state.hi - state.lo + 1) / 2);
}

export function probeSearch(state) {
  if (!state.possible) throw new Error('木材总量不足，即使从地面切割也无法满足需求。');
  if (state.done) throw new Error('已经找到最高可行锯片高度。可以换一道题继续。');
  if (state.pending) throw new Error('请先决定保留哪一段高度区间。');
  return { ...state, pending: harvestWood(state.heights, state.target, midpoint(state)) };
}

export function chooseHalf(state, direction) {
  if (!state.pending) throw new Error('先检验中点，再决定保留哪一段高度。');
  if (!['left', 'right'].includes(direction)) throw new Error('请选择左段或右段。');
  const correct = state.pending.feasible ? 'right' : 'left';
  if (direction !== correct) return { ...state, mistakes: state.mistakes + 1 };
  const before = [state.lo, state.hi];
  const lo = direction === 'right' ? state.pending.height : state.lo;
  const hi = direction === 'left' ? state.pending.height - 1 : state.hi;
  return {
    ...state, lo, hi, pending: null, done: lo === hi, answer: lo === hi ? lo : null,
    history: [...state.history, { ...state.pending, before, after: [lo, hi] }],
  };
}

export function solveProblem(heights, target) {
  let search = createSearch(heights, target);
  while (!search.done) {
    search = probeSearch(search);
    search = chooseHalf(search, search.pending.feasible ? 'right' : 'left');
  }
  return search;
}

export function boundaryCheck(state) {
  if (!state.done || !state.possible) return null;
  return {
    answer: harvestWood(state.heights, state.target, state.answer),
    above: state.answer < Math.max(...state.heights) ? harvestWood(state.heights, state.target, state.answer + 1) : null,
  };
}

export function forestResult(model) {
  if (model.binaryMode === 'explore') return harvestWood(model.binary.heights, model.binary.target, model.sawHeight);
  if (!model.binary.possible) return harvestWood(model.binary.heights, model.binary.target, 0);
  if (model.binary.done) return boundaryCheck(model.binary).answer;
  return model.binary.pending || model.binary.history.at(-1) || null;
}
