import { STOPS, ROADS, routeTo, roadInk } from '../lessons/dijkstra.js';
import { timeLabel } from './dijkstra-view.js';

// Labels stay in screen pixels, even when a class is watching on a phone.
export class MapSigns {
  constructor(container) {
    this.layer = document.createElement('div');
    this.layer.className = 'map-signs';
    this.layer.setAttribute('role', 'group');
    this.layer.setAttribute('aria-label', '小镇地图，路段和站牌的用时单位为分钟');
    container.appendChild(this.layer);
    this.items = [];
    this.stops = STOPS.map(stop => {
      const button = document.createElement('button');
      button.className = 'station-sign';
      button.dataset.action = 'map-inspect';
      button.dataset.stop = stop.id;
      button.innerHTML = `<span>${stop.name}</span><b></b>`;
      this.layer.appendChild(button);
      this.items.push({ element: button, x: stop.x, y: .12, z: stop.z + .76 });
      return button;
    });
    this.weights = ROADS.map(road => {
      const a = STOPS.find(s => s.id === road.from), b = STOPS.find(s => s.id === road.to);
      const tag = document.createElement('span');
      tag.className = 'road-weight';
      tag.textContent = road.minutes;
      tag.setAttribute('aria-label', `${a.name}到${b.name}，${road.minutes}分钟`);
      this.layer.appendChild(tag);
      // Leave room for the clock's two values on the narrow phone layout.
      const t = a.id === 'post' && b.id === 'clock' ? .33 : .5;
      this.items.push({ element: tag, x: a.x + (b.x - a.x) * t, y: .08, z: a.z + (b.z - a.z) * t });
      return tag;
    });
  }

  update(frame, inspected) {
    const route = inspected ? routeTo(frame, inspected) : null;
    this.stops.forEach((button, i) => {
      const { id, name } = STOPS[i];
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
      const ink = roadInk(ROADS[i], frame, route);
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
    const project = (x, y, z) => ({ horizontal: 50 + x * 8, vertical: 48 + z * 12 });
    this.layer.classList.add('flat-map');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    this.flatLines = ROADS.map(({ from, to }) => {
      const a = STOPS.find(s => s.id === from), b = STOPS.find(s => s.id === to);
      const v = project(a.x,0,a.z), w = project(b.x,0,b.z);
      const line = document.createElementNS(svg.namespaceURI, 'line');
      for (const [key, value] of Object.entries({ x1: v.horizontal, y1: v.vertical, x2: w.horizontal, y2: w.vertical })) line.setAttribute(key, value);
      svg.appendChild(line);
      return line;
    });
    this.layer.prepend(svg);
    // A flat station sits directly on its road junction.
    this.stops.forEach((_, i) => { this.items[i].z = STOPS[i].z; });
    this.project(project);
  }
}
