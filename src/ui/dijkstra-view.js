import { connects, mapDisplay } from '../lessons/dijkstra.js';

export const timeLabel = value => Number.isFinite(value) ? String(value) : '∞';
const stopOptions = (stops, selected) => stops.map(({ id, name }) => `<option value="${id}" ${id === selected ? 'selected' : ''}>${name}</option>`).join('');

function frameTitle(frame, names) {
  if (frame.kind === 'start') return `从${names[frame.source]}出发`;
  if (frame.kind === 'settle') return `确定${names[frame.from]} · ${frame.distance[frame.from]} 分钟`;
  if (frame.kind === 'finish') return '最短路线已连成树';
  const destination = names[frame.to];
  if (frame.improved) return `${destination}　${timeLabel(frame.old)} → ${frame.proposed} 分钟`;
  if (frame.proposed === frame.old) return `到${destination}，两条路一样快`;
  return `${destination}保留 ${frame.old} 分钟`;
}

export function dijkstraView(lesson, display = mapDisplay(lesson)) {
  const { frames, index, playing, source, scenario, comparing, routeIndex } = lesson;
  const { frame, inspected, routes, route } = display;
  const { stops, roads } = scenario;
  const names = Object.fromEntries(stops.map(({ id, name }) => [id, name]));
  const done = index === frames.length - 1;
  const subtitle = source === scenario.source ? scenario.lesson : `从${names[source]}出发，比较到各站的最短时间。`;
  const travelTimes = (route ?? []).slice(1).map((id, i) => roads.find(road => connects(road, route[i], id)).minutes);
  let message = '';
  if (inspected) {
    const known = Number.isFinite(frame.distance[inspected]);
    const status = frame.settled.includes(inspected) ? '最短' : '暂定';
    message = known ? route.map(id => names[id]).join(' → ') : `到${names[inspected]}的路线还未发现，站牌暂记 ∞。`;
    if (known && !comparing) message += `　·　${status} ${frame.distance[inspected]} 分钟${routes.length > 1 ? `（${routes.length} 条并列）` : ''}`;
  }
  return {
    title: `${scenario.name}的最短路。`,
    subtitle: `Dijkstra · ${subtitle}`,
    stats: `<span class="map-count">${comparing ? `最短 <strong>${frame.distance[inspected]}</strong> 分钟` : `已确定 <strong>${frame.settled.length}<small> / ${stops.length}</small></strong> 站`}</span>`,
    controls: comparing ? `<div class="map-step"><small>${names[source]} → ${names[inspected]}</small><strong>${routes.length > 1 ? `${routes.length} 条并列最短路` : '最短路线'}</strong></div>
      <div class="route-choices"><label for="map-target">终点</label><select id="map-target" name="map-target">${stopOptions(stops, inspected)}</select>
      ${routes.length > 1 ? `<button class="primary" id="map-alternate" data-action="map-alternate" aria-label="换条走法，当前第 ${routeIndex + 1} 条等长路线，共 ${routes.length} 条">换条走法 <small>${routeIndex + 1} / ${routes.length}</small></button>` : ''}</div>
      <div class="route-sum">${travelTimes.length > 1 ? `${travelTimes.join(' + ')} = ` : ''}<b>${frame.distance[inspected]}</b> 分钟</div>`
      : `<div class="map-step"><small>第 ${index + 1} / ${frames.length} 步</small><strong>${inspected ? `到${names[inspected]}的路线` : frameTitle(frame, names)}</strong></div>
      <div class="map-transport"><button id="map-back" data-action="map-back" ${index === 0 ? 'disabled' : ''}>上一步</button>
      <button id="map-play" class="${done ? 'primary' : ''}" data-action="map-play"><span class="play-symbol" aria-hidden="true">${playing ? 'Ⅱ' : '▶'}</span>${playing ? '暂停' : done ? '重新播放' : '自动演示'}</button>
      ${done && routes.length > 1 ? `<button id="map-alternate" class="primary" data-action="map-alternate">换条走法 ${routeIndex + 1}/${routes.length}</button>` : `<button id="map-next" class="${done ? '' : 'primary'}" data-action="map-next" ${done ? 'disabled' : ''}>下一步</button>`}</div>`,
    message,
    settings: `<div class="settings-group"><h3>换个起点看地图</h3><label for="map-source">出发站<select id="map-source" name="map-source">${stopOptions(stops, source)}</select></label></div>
      <div class="settings-group"><label>${comparing ? '返回逐步推演' : '跳步'} · 第 ${index + 1} 步<input id="map-seek" type="range" min="1" max="${frames.length}" value="${index + 1}" aria-label="演示步骤"></label></div>`,
    accessible: `<details><summary>${scenario.name} · 道路用时</summary><ul>${roads.map(({ from, to, minutes }) => `<li>${names[from]} ↔ ${names[to]}　${minutes} 分钟</li>`).join('')}</ul></details>`,
  };
}
