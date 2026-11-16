export const MAX_CAPACITY = 16;

export function createVector(empty = false) {
  return {
    values: empty ? [] : [12, 24, 36],
    capacity: empty ? 0 : 4,
    allocation: empty ? 0 : 1,
    relocations: 0,
    moved: 0,
    writes: 0,
    reserved: false,
    inspected: false,
    operations: empty ? ['std::vector<int> v;'] : [
      'std::vector<int> v;', 'v.reserve(4);',
      'v.push_back(12);', 'v.push_back(24);', 'v.push_back(36);',
    ],
    message: empty ? '从空 vector 开始。先规划空间，再放入 8 个元素。' : '已经放入 3 个元素，还有 1 个可用槽位。试着再放入一个。',
    event: 'initial',
  };
}

export function vectorOperation(previous, operation, value) {
  const next = { ...previous, values: [...previous.values], operations: [...previous.operations] };
  next.event = operation;
  if (operation === 'push') {
    if (!Number.isInteger(value) || value < -999 || value > 999) throw new Error('元素值请输入 -999 到 999 的整数。');
    if (next.values.length >= MAX_CAPACITY) throw new Error('本实验最多展示 16 个元素；可以移除元素或重新实验。');
    if (next.values.length === next.capacity) {
      next.capacity = Math.min(MAX_CAPACITY, Math.max(1, next.capacity * 2));
      next.allocation += 1;
      next.moved += previous.values.length;
      if (previous.values.length) next.relocations += 1;
      next.event = 'reallocate';
      next.message = previous.values.length
        ? `空间满了：分配 ${next.capacity} 个槽位，迁移原有 ${previous.values.length} 个元素，再添加 ${value}。旧存储已释放，旧指针和迭代器失效。`
        : `为第一个元素分配空间，放入 ${value}。`;
    } else {
      next.message = `把 ${value} 放进索引 ${next.values.length}：size 增加 1，capacity 和原有元素的地址不变。`;
    }
    next.values.push(value);
    next.writes += 1;
    next.operations.push(`v.push_back(${value});`);
  } else if (operation === 'pop') {
    if (!next.values.length) throw new Error('vector 已经为空，不能调用 pop_back()。');
    const removed = next.values.pop();
    next.message = `移除末尾的 ${removed}，size 变为 ${next.values.length}。capacity 仍是 ${next.capacity}；预留空间没有缩小。`;
    next.operations.push('v.pop_back();');
  } else if (operation === 'reserve') {
    if (!Number.isInteger(value) || value < 0 || value > MAX_CAPACITY) throw new Error('预留容量请输入 0 到 16 的整数。');
    next.reserved = true;
    next.operations.push(`v.reserve(${value});`);
    if (value <= next.capacity) {
      next.message = `现有 capacity 为 ${next.capacity}，已经足够。reserve(${value}) 不缩小容量，也不改变 size。`;
    } else {
      next.capacity = value;
      next.allocation += 1;
      next.moved += previous.values.length;
      if (previous.values.length) next.relocations += 1;
      next.event = 'reallocate';
      next.message = `预留 ${value} 个槽位，size 仍为 ${next.values.length}。${previous.values.length ? `原有 ${previous.values.length} 个元素迁移到新存储。` : '还没有元素，因此迁移元素数为 0。'}空槽位不代表已存在的元素。`;
    }
  } else {
    throw new Error('未知操作。');
  }
  return next;
}

export function inspectElement(state, index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.values.length) throw new Error('只能访问索引小于 size 的现有元素。');
  return { value: state.values[index], index, offset: index * 4, address: `区块 ${state.allocation} + ${index * 4} B` };
}

export function appendCosts(count, strategy = 'double') {
  let capacity = 0;
  let moved = 0;
  let relocations = 0;
  for (let size = 0; size < count; size += 1) {
    if (size === capacity) {
      capacity = strategy === 'double' ? Math.max(1, capacity * 2) : capacity + 1;
      moved += size;
      if (size) relocations += 1;
    }
  }
  return { count, moved, relocations, cost: count + moved };
}
