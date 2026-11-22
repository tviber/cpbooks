import { roadInk } from '../lessons/dijkstra.js';
import { timeLabel } from './dijkstra-view.js';
import { pointOnPath, roadPath, townLayout } from '../scene/town-layouts.js';
import { flatPoint, flatTerrain } from './flat-town.js';

// Labels stay in screen pixels, even when a class is watching on a phone.
export class MapSigns {
  constructor(container) {
    this.layer = document.createElement('div');
    this.layer.className = 'map-signs';
    this.layer.setAttribute('role', 'group');
    container.appendChild(this.layer);
  }

  setLayout(scenario) {
    if (this.theme === scenario.id) return;
    this.theme = scenario.id;
    const layout = townLayout(this.theme);
    this.layer.replaceChildren(...(this.svg ? [this.svg] : []));
    this.layer.setAttribute('aria-label', `${scenario.name}地图，${scenario.stops.length} 个站点，路段和站牌的用时单位为分钟`);
    this.stops = scenario.stops.map(stop => {
      const button = document.createElement('button');
      button.className = 'station-sign';
      button.dataset.action = 'map-inspect';
      button.dataset.stop = stop.id;
      button.innerHTML = `<span>${stop.name}</span><b></b>`;
      this.layer.appendChild(button);
      return button;
    });
    const names = Object.fromEntries(scenario.stops.map(({ id, name }) => [id, name]));
    this.weights = scenario.roads.map(({ from, to, minutes }) => {
      const tag = document.createElement('span');
      tag.className = 'road-weight';
      tag.textContent = minutes;
      tag.setAttribute('aria-label', `${names[from]}到${names[to]}，${minutes}分钟`);
      this.layer.appendChild(tag);
      return tag;
    });
    this.items = scenario.stops.map(({ id }, i) => {
      const [x, z] = layout.stops[id];
      const [dx, dz] = this.svg ? [0, 0] : layout.signOffsets?.[id] ?? [0, .78];
      return { element: this.stops[i], x: x + dx, y: .27, z: z + dz };
    });
    const paths = scenario.roads.map(({ from, to }, i) => {
      const path = roadPath(layout, from, to);
      const [x,z] = pointOnPath(path, layout.labels[`${from}-${to}`] ?? .5);
      this.items.push({ element: this.weights[i], x, y: .23, z });
      return path;
    });
    if (this.svg) {
      this.svg.innerHTML = flatTerrain(this.theme);
      this.flatLines = paths.map(path => {
        const line = document.createElementNS(this.svg.namespaceURI, 'polyline');
        line.setAttribute('points', path.map(p => p.join(',')).join(' '));
        this.svg.appendChild(line);
        return line;
      });
      this.project(flatPoint);
    }
  }

  update({ scenario, frame, inspected, route }) {
    this.setLayout(scenario);
    this.stops.forEach((button, i) => {
      const { id, name } = scenario.stops[i];
      const value = frame.distance[id];
      const fixed = frame.settled.includes(id);
      const status = fixed ? '已确定' : Number.isFinite(value) ? '暂定' : '待发现';
      button.dataset.state = fixed ? 'fixed' : Number.isFinite(value) ? 'candidate' : 'unknown';
      button.classList.toggle('current', !inspected && id === (frame.to ?? frame.from ?? frame.source) && frame.kind !== 'finish');
      button.setAttribute('aria-pressed', String(id === inspected));
      button.setAttribute('aria-label', `${name}，${status}${Number.isFinite(value) ? ` ${value} 分钟` : ''}，查看路线`);
      const rewritten = !inspected && id === frame.to && frame.improved && Number.isFinite(frame.old);
      const number = button.querySelector('b');
      if (rewritten) number.innerHTML = `<s>${frame.old}</s> → ${value}`;
      else number.textContent = `${fixed ? '✓ ' : ''}${timeLabel(value)}`;
    });
    this.weights.forEach((tag, i) => {
      const ink = roadInk(scenario.roads[i], frame, route);
      tag.dataset.ink = ink;
      this.flatLines?.[i].setAttribute('class', ink);
    });
  }

  project(projectPoint) {
    for (const { element, x, y, z } of this.items) {
      const { horizontal, vertical } = projectPoint(x, y, z);
      element.style.left = `${horizontal}%`;
      element.style.top = `${vertical}%`;
    }
  }

  // The same controls and state also work without a graphics context.
  useFlatMap() {
    this.layer.classList.add('flat-map');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '-6 -3.7 12 7.4');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    this.svg = svg;
    this.layer.prepend(svg);
  }
}
