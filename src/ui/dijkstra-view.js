import { connects, mapDisplay } from '../lessons/dijkstra.js';
import { codeBlock } from './shared.js';

export const timeLabel = value => Number.isFinite(value) ? String(value) : '∞';
const stopOptions = (stops, selected) => stops.map(({ id, name }) => `<option value="${id}" ${id === selected ? 'selected' : ''}>${name}</option>`).join('');

function explainChoice(frame, stops, names) {
  const chosen = names[frame.from];
  if (frame.from === frame.source) return `只有起点${chosen}的用时已知，先给它盖上 ✓。`;
  const candidates = stops.filter(({ id }) => (id === frame.from || !frame.settled.includes(id)) && Number.isFinite(frame.distance[id]));
  candidates.sort((a, b) => frame.distance[a.id] - frame.distance[b.id]);
  if (candidates.length === 1) return `剩余站里，只有${chosen}的用时已知。现在可以确定它的最短时间。`;
  const comparison = candidates.map(({ name, id }, i) => {
    const sign = i === 0 ? '' : frame.distance[candidates[i - 1].id] === frame.distance[id] ? ' = ' : ' < ';
    return `${sign}${name} ${frame.distance[id]}`;
  }).join('');
  return `${comparison}（分）。路段耗时非负，从其他候选站绕行也不会更快。`;
}

const code = [
  'int n = graph.size();',
  'vector<long long> dist(n, LLONG_MAX);',
  'vector<int> parent(n, -1);',
  'vector<bool> fixed(n, false);',
  'dist[source] = 0;',
  'while (true) {',
  '  int u = -1;',
  '  for (int i = 0; i < n; ++i)',
  '    if (!fixed[i] && (u < 0 || dist[i] < dist[u]))',
  '      u = i;',
  '  if (u < 0 || dist[u] == LLONG_MAX) break;',
  '  fixed[u] = true;',
  '  for (auto [v, w] : graph[u]) {',
  '    if (fixed[v]) continue;',
  '    long long t = dist[u] + w;',
  '    if (t < dist[v]) {',
  '      dist[v] = t;',
  '      parent[v] = u;',
  '    }',
  '  }',
  '}',
];

function describeFrame(frame, stops, names) {
  if (frame.kind === 'start') return {
    title: `从${names[frame.source]}出发`,
    message: '起点记 0，其余站先记 ∞，表示还没找到路线。', line: 4,
  };
  if (frame.kind === 'settle') return {
    title: `确定${names[frame.from]} · ${frame.distance[frame.from]} 分钟`,
    message: explainChoice(frame, stops, names), line: 11,
  };
  if (frame.kind === 'finish') return {
    title: '最短路线已连成树',
    message: '点一块站牌，查看从起点到这里的完整路线。', line: 10,
  };
  const equation = `${frame.distance[frame.from]} + ${frame.minutes} = ${frame.proposed}`;
  const destination = names[frame.to];
  const via = `经${names[frame.from]}到${destination}`;
  if (!Number.isFinite(frame.old)) return {
    title: `${destination}　∞ → ${frame.proposed}`,
    message: `${via}需 ${equation} 分钟。先记下这条路线，之后还可能缩短。`, line: 16,
  };
  if (frame.improved) return {
    title: `${destination}　${frame.old} → ${frame.proposed}`,
    message: `${via}只需 ${equation} 分钟，比原来的 ${frame.old} 分钟快。上一站改为${names[frame.from]}。`, line: 17,
  };
  if (frame.proposed === frame.old) return {
    title: `到${destination}，两条路一样快`,
    message: `${via}需 ${equation} 分钟，与已有路线相同。这段代码只在更短时改写，所以上一站不变。`, line: 15,
  };
  return {
    title: `${destination}保留 ${frame.old} 分钟`,
    message: `${via}需 ${equation} 分钟。已有路线是 ${frame.old} 分钟，保留原来的走法。`, line: 15,
  };
}

export function dijkstraView(lesson, display = mapDisplay(lesson)) {
  const { frames, index, playing, source, scenario, comparing, routeIndex } = lesson;
  const { frame, inspected, routes, route } = display;
  const { stops, roads } = scenario;
  const names = Object.fromEntries(stops.map(({ id, name }) => [id, name]));
  const step = describeFrame(frame, stops, names);
  const done = index === frames.length - 1;
  const subtitle = source === scenario.source ? scenario.lesson : `从${names[source]}出发，比较到各站的最短时间。`;
  const travelTimes = (route ?? []).slice(1).map((id, i) => roads.find(road => connects(road, route[i], id)).minutes);
  let message = step.message;
  if (inspected) {
    const known = Number.isFinite(frame.distance[inspected]);
    const status = frame.settled.includes(inspected) ? '最短' : '暂定';
    message = known ? route.map(id => names[id]).join(' → ') : `到${names[inspected]}的路线还未发现，站牌暂记 ∞。`;
    if (known && !comparing) message += `　·　${status} ${frame.distance[inspected]} 分钟${routes.length > 1 ? `（${routes.length} 条并列）` : ''}`;
  }
  const rows = stops.map(({ id, name }) => {
    const value = frame.distance[id];
    const status = frame.settled.includes(id) ? '已确定' : Number.isFinite(value) ? '暂定' : '待发现';
    return `<tr><th scope="row">${name}</th><td>${timeLabel(value)}</td><td>${frame.previous[id] ? names[frame.previous[id]] : '—'}</td><td>${status}</td></tr>`;
  }).join('');
  return {
    title: `${scenario.name}的最短路。`,
    subtitle: `Dijkstra · ${subtitle}`,
    stats: `<span class="map-count">${comparing ? `最短 <strong>${frame.distance[inspected]}</strong> 分钟` : `已确定 <strong>${frame.settled.length}<small> / ${stops.length}</small></strong> 站`}</span>`,
    controls: comparing ? `<div class="map-step"><small>${names[source]} → ${names[inspected]}</small><strong>${routes.length > 1 ? `${routes.length} 条并列最短路` : '最短路线'}</strong></div>
      <div class="route-choices"><label for="map-target">终点</label><select id="map-target" name="map-target">${stopOptions(stops, inspected)}</select>
      ${routes.length > 1 ? `<button class="primary" id="map-alternate" data-action="map-alternate" aria-label="换条走法，当前第 ${routeIndex + 1} 条等长路线，共 ${routes.length} 条">换条走法 <small>${routeIndex + 1} / ${routes.length}</small></button>` : ''}</div>
      <div class="route-sum">${travelTimes.length > 1 ? `${travelTimes.join(' + ')} = ` : ''}<b>${frame.distance[inspected]}</b> 分钟</div>`
      : `<div class="map-step"><small>第 ${index + 1} / ${frames.length} 步</small><strong>${inspected ? `到${names[inspected]}的路线` : step.title}</strong></div>
      <div class="map-transport"><button id="map-back" data-action="map-back" ${index === 0 ? 'disabled' : ''}>上一步</button>
      <button id="map-play" class="${done ? 'primary' : ''}" data-action="map-play"><span class="play-symbol" aria-hidden="true">${playing ? 'Ⅱ' : '▶'}</span>${playing ? '暂停' : done ? '重新播放' : '自动演示'}</button>
      ${done && routes.length > 1 ? `<button id="map-alternate" class="primary" data-action="map-alternate">换条走法 ${routeIndex + 1}/${routes.length}</button>` : `<button id="map-next" class="${done ? '' : 'primary'}" data-action="map-next" ${done ? 'disabled' : ''}>下一步</button>`}</div>`,
    message,
    codeCaption: comparing ? 'C++17 · 每站的 parent 只记录一种最短走法' : 'C++17 · 邻接表，线性扫描选出最近的一站',
    code: codeBlock(code, step.line),
    explanation: `<div class="panel-heading"><h2>为什么可以盖章？</h2></div>
      <p>站牌上写的是从起点出发、目前找到的最短时间。每轮在所有还没盖章的站里，选时间最小的一个。</p>
      <p>起点先盖章。之后，沿任意一条路线，找出第一个还没盖章的站。它的前一站已盖章，也检查过通往它的路，所以走到这里已经至少花了这个站牌上的时间。这个数至少等于本轮最小值，再走非负的路段也不会变小。</p>
      <details><summary>什么是松弛？</summary><p>已走时间加上下一段路的时间，如果比邻站的记录更小，就同时改写它的时间和上一站。在集市里，从邮局直达钟楼要 7 分钟，经过花园只要 2 + 1 = 3 分钟。</p></details>
      <details><summary>为什么会有并列的最短路？</summary><p>双桥河谷里，营地到山顶走吊桥需要 1 + 2 + 2 + 3 = 8 分钟，走桁架桥需要 2 + 1 + 3 + 2 = 8 分钟。两条都是最短路。</p><p>C++ 示例的 parent 只保留一种走法。比较路线时，从终点沿满足 dist[u] + w = dist[v] 的道路反向找回起点，就能看到其他等长的走法。</p></details>
      <details><summary>不同的图也适用吗？</summary><p>道路可以单向，边权可以为 0。若有负权，这个盖章规则就失去保证。不可达的站保留 ∞。多个候选时间相同时任选其一，都能得到正确距离。</p><p>本页线性扫描选站，耗时 O(V² + E)。稀疏图常用最小堆加速选站。</p></details>`,
    panel: `<h3>这一刻的站牌</h3><table><thead><tr><th>站点</th><th>总用时 / 分</th><th>记录的上一站</th><th>状态</th></tr></thead><tbody>${rows}</tbody></table>`,
    settings: `<div class="settings-group"><h3>换个起点看地图</h3><label for="map-source">出发站<select id="map-source" name="map-source">${stopOptions(stops, source)}</select></label></div>
      <div class="settings-group"><label>${comparing ? '返回逐步推演' : '跳步'} · 第 ${index + 1} 步<input id="map-seek" type="range" min="1" max="${frames.length}" value="${index + 1}" aria-label="演示步骤"></label></div>`,
    accessible: `<details><summary>${scenario.name} · 道路用时</summary><ul>${roads.map(({ from, to, minutes }) => `<li>${names[from]} ↔ ${names[to]}　${minutes} 分钟</li>`).join('')}</ul></details>`,
  };
}

export const mapHelp = `<p class="manual-lead">用下一步翻看路线，用上一步比较改写前的站牌。</p>
  <ol><li><strong>读地图。</strong>圆牌是走一段路的分钟数。方形站牌是从起点到这里的总分钟数，∞ 表示还没找到路线，✓ 表示最短时间已确定。</li>
  <li><strong>看路线。</strong>橙色标出正在比较的道路。点地标或站牌可以查看当前走法，再点一次返回演示。</li>
  <li><strong>比较路线。</strong>选一个终点，查看到它的最短走法。有并列路线时，点「换条走法」逐条看。切换场景会从新地图的出发站开始。</li>
  <li><strong>换起点。</strong>实验设置里可以从其他站重新出发，也可以跳到某一步。打开讲解可以对照这一刻的站牌和 C++ 代码。</li></ol>`;
