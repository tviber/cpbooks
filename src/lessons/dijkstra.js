// Road weights are minutes on an undirected road, independent of its drawn length.
export const STOPS = [
  { id: 'post', name: '邮局', x: -4.38, z: -0.10 },
  { id: 'clock', name: '钟楼', x: -1.65, z: -2.13 },
  { id: 'garden', name: '花园', x: -1.47, z: 1.88 },
  { id: 'books', name: '书店', x: 1.73, z: -1.96 },
  { id: 'pier', name: '码头', x: 4.13, z: 1.28 },
];
export const ROADS = [
  { from: 'post', to: 'clock', minutes: 7 },
  { from: 'post', to: 'garden', minutes: 2 },
  { from: 'garden', to: 'clock', minutes: 1 },
  { from: 'garden', to: 'books', minutes: 2 },
  { from: 'clock', to: 'books', minutes: 2 },
  { from: 'garden', to: 'pier', minutes: 8 },
  { from: 'books', to: 'pier', minutes: 2 },
];

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

// Shared by the paper roads, their labels and the flat map. null means no selection;
// an empty selected route means that this station hasn't been reached yet.
export function roadInk(road, frame, inspectedRoute = null) {
  const connects = (a, b) => road.from === a && road.to === b || road.to === a && road.from === b;
  if (inspectedRoute !== null) {
    return inspectedRoute.some((stop, i) => i > 0 && connects(inspectedRoute[i - 1], stop)) ? 'traced' : 'idle';
  }
  if (frame.kind === 'road') {
    if (connects(frame.from, frame.to)) return frame.improved ? 'traced' : 'rejected';
    if (frame.improved && connects(frame.oldParent, frame.to)) return 'replaced';
  }
  const child = [road.from, road.to].find(id => connects(frame.previous[id], id));
  if (child === undefined) return 'idle';
  return frame.settled.includes(child) ? 'fixed' : 'candidate';
}

export function createMapLesson(source = 'post') {
  return { source, frames: dijkstraFrames(STOPS, ROADS, source), index: 0, playing: false, inspected: null };
}
