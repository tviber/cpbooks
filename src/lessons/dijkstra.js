import { MAP_SCENARIOS } from './towns.js';

export const connects = (road, a, b) => road.from === a && road.to === b || road.from === b && road.to === a;

// Keep a snapshot in each frame so stepping back restores the old paths and times.
export function dijkstraFrames(stops, roads, source) {
  const neighbors = new Map(stops.map(({ id }) => [id, []]));
  if (!neighbors.has(source)) throw new RangeError('起点不在地图上');
  for (const { from, to, minutes } of roads) {
    if (!Number.isFinite(minutes) || minutes < 0) throw new RangeError('Dijkstra 要求非负的有限路程');
    neighbors.get(from).push({ to, minutes });
    neighbors.get(to).push({ to: from, minutes });
  }
  const distance = Object.fromEntries(stops.map(({ id }) => [id, Infinity]));
  const previous = Object.fromEntries(stops.map(({ id }) => [id, null]));
  const settled = new Set();
  const frames = [];
  function record(kind, event = {}) {
    frames.push({ kind, source, ...event, distance: { ...distance }, previous: { ...previous }, settled: [...settled] });
  }
  distance[source] = 0;
  record('start');
  while (true) {
    let nearest = null;
    let minimum = Infinity;
    for (const { id } of stops) {
      if (!settled.has(id) && distance[id] < minimum) {
        nearest = id;
        minimum = distance[id];
      }
    }
    if (nearest === null) break;
    settled.add(nearest);
    record('settle', { from: nearest });
    for (const { to, minutes } of neighbors.get(nearest)) {
      if (settled.has(to)) continue;
      const old = distance[to];
      const oldParent = previous[to];
      const proposed = minimum + minutes;
      if (proposed < old) {
        distance[to] = proposed;
        previous[to] = nearest;
      }
      record('road', { from: nearest, to, minutes, old, oldParent, proposed, improved: proposed < old });
    }
  }
  record('finish');
  return frames;
}

export function routeTo(frame, destination) {
  if (!Number.isFinite(frame.distance[destination])) return [];
  const route = [];
  for (let stop = destination; stop !== null; stop = frame.previous[stop]) route.push(stop);
  return route.reverse();
}

// After Dijkstra finishes, a shortest path can only enter v from a neighbour u
// for which d[u] + w == d[v]. Visit the recorded parent first to match the tree.
export function shortestRoutesTo(frame, roads, destination) {
  if (!Number.isFinite(frame.distance[destination])) return [];
  const routes = [];
  function walk(id, suffix) {
    const path = [id, ...suffix];
    if (id === frame.source) { routes.push(path); return; }
    const parents = [];
    for (const { from, to, minutes } of roads) {
      const neighbour = from === id ? to : to === id ? from : null;
      // Only simple paths: zero-minute cycles must not repeat a station.
      if (neighbour === null || path.includes(neighbour) || frame.distance[neighbour] + minutes !== frame.distance[id]) continue;
      if (neighbour === frame.previous[id]) parents.unshift(neighbour);
      else parents.push(neighbour);
    }
    for (const parent of parents) walk(parent, path);
  }
  walk(destination, []);
  return routes;
}

// Shared by the paper roads, their labels and the flat map. null means no selection;
// an empty selected route means that this station hasn't been reached yet.
export function roadInk(road, frame, inspectedRoute = null) {
  if (inspectedRoute !== null) {
    return inspectedRoute.some((stop, i) => i > 0 && connects(road, inspectedRoute[i - 1], stop)) ? 'traced' : 'idle';
  }
  if (frame.kind === 'road') {
    if (connects(road, frame.from, frame.to)) return frame.improved ? 'traced' : frame.proposed === frame.old ? 'equal' : 'rejected';
    if (frame.improved && connects(road, frame.oldParent, frame.to)) return 'replaced';
  }
  const child = [road.from, road.to].find(id => connects(road, frame.previous[id], id));
  if (child === undefined) return 'idle';
  return frame.settled.includes(child) ? 'fixed' : 'candidate';
}

export function createMapLesson(scenarioId, source) {
  const scenario = MAP_SCENARIOS.find(s => s.id === scenarioId) ?? MAP_SCENARIOS[0];
  const { stops, roads } = scenario;
  source ??= scenario.source;
  return { source, scenario, frames: dijkstraFrames(stops, roads, source), index: 0, playing: false, inspected: null,
    comparing: false, target: source === scenario.target ? scenario.source : scenario.target, routeIndex: 0 };
}

export function mapDisplay(lesson) {
  const { scenario, frames, index, comparing, routeIndex } = lesson;
  const frame = comparing ? frames.at(-1) : frames[index];
  const inspected = comparing ? lesson.target : lesson.inspected;
  const routes = !inspected ? [] : frame.kind === 'finish' ? shortestRoutesTo(frame, scenario.roads, inspected) : [routeTo(frame, inspected)];
  return { scenario, frame, inspected, routes, route: inspected ? routes[routeIndex] ?? routes[0] ?? [] : null };
}
