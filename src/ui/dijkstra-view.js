import { mapDisplay } from '../lessons/dijkstra.js';
import { escapeHtml } from './shared.js';

export const timeLabel = value => Number.isFinite(value) ? String(value) : '∞';
const options = (stops, selected) => stops.map(({ id, name }) => `<option value="${id}" ${id === selected ? 'selected' : ''}>${name}</option>`).join('');

function describe(frame, names, stops) {
  const name = names[frame.to];
  switch (frame.kind) {
    case 'queue.push': return `${name}入队 · ${frame.value} 分`;
    case 'queue.top': return `读取队首 · ${name} ${frame.value} 分`;
    case 'queue.pop': return `${name}出队 · ${frame.value} 分${frame.stale ? '（过期条目）' : ''}`;
    case 'distance.write': return `${name} · ${timeLabel(frame.old)} → ${timeLabel(frame.distance[frame.to])} 分`;
    case 'parent.write': return `${name}的前驱 ← ${stops[frame.value]?.name ?? frame.value}`;
    case 'finish': return '函数已返回';
    default: return '从初始站牌开始';
  }
}

export function dijkstraView(lesson, display = mapDisplay(lesson)) {
  const { frames, index, playing, source, scenario, routeIndex, checks } = lesson;
  const { frame, inspected, routes, route, comparing } = display;
  const { stops, roads } = scenario;
  const names = Object.fromEntries(stops.map(({ id, name }) => [id, name]));
  const hasTrace = frames.length > 1;
  const step = describe(frame, names, stops);
  const score = `验证 ${checks.filter(c => c.passed).length} / ${checks.length}`;
  const line = frame.line && lesson.executedCode.split('\n')[frame.line - 1];
  const done = index === frames.length - 1;
  const edit = '<button data-action="drawer" data-tab="code">编辑 C++</button>';
  let controls;
  if (comparing) controls = `<div class="map-step"><small>${names[source]} → ${names[inspected]}</small><strong>${timeLabel(frame.distance[inspected])} 分钟</strong></div>
    <div class="route-choices"><label for="map-target">终点</label><select id="map-target">${options(stops, inspected)}</select>
    ${routes.length > 1 ? `<button data-action="map-alternate">换条走法 ${routeIndex + 1}/${routes.length}</button>` : ''}</div>`;
  else if (hasTrace) controls = `<div class="map-step"><small>第 ${index + 1} / ${frames.length} 步</small><strong>${step}</strong></div>
    <div class="map-transport"><button id="map-back" data-action="map-back" ${index === 0 ? 'disabled' : ''}>上一步</button>
    <button id="map-play" data-action="map-play">${playing ? '暂停' : done ? '重新播放' : '播放'}</button>
    <button id="map-next" class="primary" data-action="map-next" ${done ? 'disabled' : ''}>下一步</button></div>`;
  else controls = `<div class="map-step"><small>C++17 · ${names[source]}出发</small><strong>${lesson.running ? '正在编译与验证…' : '最短路实验'}</strong></div>${edit}
    <button class="primary" data-action="map-run" ${lesson.running ? 'disabled' : ''}>运行代码</button>`;

  const summary = checks.map(c => `${c.passed ? '✓' : '×'} ${c.name}${c.message ? ` · ${c.message}` : ''}`).join('\n');
  const rows = stops.map(({ id, name }, i) => `<tr><th scope="row">${i} · ${name}</th><td>${timeLabel(frame.distance[id])}</td><td>${names[frame.previous[id]] ?? '—'}</td></tr>`).join('');
  return {
    title: `${scenario.name}的最短路。`, subtitle: `Dijkstra · ${scenario.lesson}`,
    stats: `<span class="map-count">${hasTrace ? `${score}　·　堆内 <strong>${frame.queueSize}</strong> 项` : `${stops.length} 个站点 · ${roads.length} 条道路`}</span>`,
    controls,
    message: lesson.error ? '运行失败。打开 C++ 编辑器查看诊断。' : inspected ? (route?.length ? route.map(id => names[id]).join(' → ') : '尚无完整的前驱路径。')
      : frame.stale ? `队列记录为 ${frame.value}，当前站牌为 ${frame.distance[frame.to]}。` : hasTrace ? (frame.kind === 'finish' ? score : '') : '编辑函数，或直接运行示例。',
    codeCaption: 'C++17 · 标准优先队列',
    code: '', activeLine: line ? `<span>第 ${frame.line} 行</span> <mark><code>${escapeHtml(line.trim())}</code></mark>` : '',
    explanation: `<h2>堆里的最短路</h2><p>边权非负。每次读取距离最小的候选站；若该距离仍与站牌相同，就可以沿相邻道路尝试缩短路程。旧距离也可能留在堆里，直到被取出。</p>
      <p>两个站距离相同时，比较器决定谁先出队。在双桥河谷中把示例的 <code>a.second &gt; b.second</code> 改成 <code>a.second &lt; b.second</code>，观察距离为 3 的两座桥。</p>`,
    panel: `<h3>这一刻的站牌</h3><table><thead><tr><th>编号 · 站点</th><th>用时 / 分</th><th>前驱</th></tr></thead><tbody>${rows}</tbody></table>`,
    settings: `<div class="settings-group"><label for="map-source">出发站<select id="map-source">${options(stops, source)}</select></label></div>
      <div class="settings-group"><label>第 ${index + 1} / ${frames.length} 步<input id="map-seek" type="range" min="1" max="${frames.length}" value="${index + 1}" ${hasTrace ? '' : 'disabled'}></label></div>`,
    accessible: `<details><summary>${scenario.name} · 道路用时</summary><ul>${roads.map(r => `<li>${names[r.from]} ↔ ${names[r.to]}　${r.minutes} 分钟</li>`).join('')}</ul></details>`,
    diagnostic: lesson.error || (lesson.running ? '正在编译与验证…' : summary),
  };
}

export const mapHelp = `<p>运行 C++ 后，可以逐步播放或回看每一次队列操作、距离写入和前驱写入。橙色站牌对应当前操作。✓ 表示该站曾以当时的站牌距离出队。</p><p>点击站牌查看当前前驱链。当前地图验证通过后，可在「比较路线」中浏览等长的最短路线。实验设置中可以换起点或跳步。</p>`;
