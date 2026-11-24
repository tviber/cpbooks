import { MAP_SCENARIOS } from './towns.js';
import starter from './starter-traces.json' with { type: 'json' };

export const connects = (road, a, b) => road.from === a && road.to === b || road.from === b && road.to === a;
const minutes = value => value === 2147483647 ? Infinity : value;

function initialFrame(scenario, source) {
  const values = value => Object.fromEntries(scenario.stops.map(({ id }) => [id, value]));
  return { kind: 'ready', source, distance: values(Infinity), previous: values(null), popped: [], queueSize: 0 };
}

export function createMapLesson(scenarioId, source) {
  const scenario = MAP_SCENARIOS.find(s => s.id === scenarioId) ?? MAP_SCENARIOS[0];
  source ??= scenario.source;
  const trace = starter.traces.find(t => t.scenario === scenario.id && t.source === source);
  return { source, scenario, frames: traceFrames({ source, scenario }, trace), index: 0, playing: false, inspected: null,
    comparing: false, target: source === scenario.target ? scenario.source : scenario.target, routeIndex: 0,
    runId: 'starter', executedCode: starter.code, checks: trace.checks };
}

export function traceFrames(lesson, trace) {
  const { scenario, source } = lesson;
  if (trace.version !== 1 || trace.algorithm !== 'dijkstra' || trace.scenario !== scenario.id || trace.source !== source) throw new Error('轨迹与地图不匹配');
  const frames = [initialFrame(scenario, source)];
  for (const { kind, line, node, value } of trace.events) {
    const prev = frames.at(-1);
    const id = scenario.stops[node]?.id;
    if (!id || !Number.isInteger(line) || line < 1 || !Number.isInteger(value)) throw new Error('无效的执行记录');
    const frame = { kind, source, line, to: id, value, distance: prev.distance, previous: prev.previous, popped: prev.popped, queueSize: prev.queueSize };
    switch (kind) {
      case 'distance.write':
        frame.old = prev.distance[id];
        frame.distance = { ...prev.distance, [id]: minutes(value) };
        break;
      case 'parent.write': {
        const parent = scenario.stops[value]?.id ?? null;
        frame.previous = { ...prev.previous, [id]: parent };
        if (scenario.roads.some(r => connects(r, parent, id))) frame.from = parent;
        break;
      }
      case 'queue.push': frame.queueSize++; break;
      case 'queue.top': break;
      case 'queue.pop':
        frame.queueSize--;
        frame.stale = value !== prev.distance[id];
        if (!frame.stale && !prev.popped.includes(id)) frame.popped = [...prev.popped, id];
        break;
      default: throw new Error(`未知事件 ${kind}`);
    }
    frames.push(frame);
  }
  const last = frames.at(-1);
  frames.push({ ...initialFrame(scenario, source), kind: 'finish', distance: last.distance, previous: last.previous, popped: last.popped, queueSize: last.queueSize });
  return frames;
}

export function routeTo(frame, destination) {
  if (!Number.isFinite(frame.distance[destination])) return [];
  const path = [];
  for (let id = destination; id && !path.includes(id); id = frame.previous[id]) {
    path.push(id);
    if (id === frame.source) return path.reverse();
  }
  return []; // Parent writes can lag distance writes, or student code can create a cycle.
}

export function shortestRoutesTo(frame, roads, destination) {
  if (!Number.isFinite(frame.distance[destination])) return [];
  const routes = [];
  function walk(id, suffix) {
    const path = [id, ...suffix];
    if (id === frame.source) { routes.push(path); return; }
    const parents = [];
    for (const { from, to, minutes } of roads) {
      const neighbour = from === id ? to : to === id ? from : null;
      if (!neighbour || path.includes(neighbour) || frame.distance[neighbour] + minutes !== frame.distance[id]) continue;
      if (neighbour === frame.previous[id]) parents.unshift(neighbour);
      else parents.push(neighbour);
    }
    for (const parent of parents) walk(parent, path);
  }
  walk(destination, []);
  return routes;
}

export function roadInk(road, frame, inspectedRoute = null) {
  if (inspectedRoute !== null) return inspectedRoute.some((stop, i) => i && connects(road, inspectedRoute[i - 1], stop)) ? 'traced' : 'idle';
  if (frame.kind === 'parent.write' && connects(road, frame.from, frame.to)) return 'traced';
  const child = [road.from, road.to].find(id => connects(road, frame.previous[id], id));
  return !child ? 'idle' : frame.popped.includes(child) ? 'fixed' : 'candidate';
}

export function mapDisplay(lesson) {
  const { scenario, frames, index, routeIndex } = lesson;
  const comparing = lesson.comparing && lesson.checks[0]?.passed;
  const frame = comparing ? frames.at(-1) : frames[index];
  const inspected = comparing ? lesson.target : lesson.inspected;
  const routes = !inspected ? [] : frame.kind === 'finish' && lesson.checks[0]?.passed
    ? shortestRoutesTo(frame, scenario.roads, inspected) : [routeTo(frame, inspected)];
  return { scenario, frame, comparing, inspected, routes, route: inspected ? routes[routeIndex] ?? routes[0] ?? [] : null };
}
