import { MAP_SCENARIOS } from '../src/lessons/towns.js';

export const INF = 2147483647;

export function casesFor(scenarioId, sourceId) {
  const town = MAP_SCENARIOS.find(s => s.id === scenarioId);
  const ids = town?.stops.map(s => s.id) ?? [];
  if (!ids.includes(sourceId)) throw new Error('Unknown map or source station');
  return [
    { name: town.id, n: ids.length, source: ids.indexOf(sourceId), edges: town.roads.map(r => [ids.indexOf(r.from), ids.indexOf(r.to), r.minutes]) },
    { name: 'equal paths', n: 4, source: 0, edges: [[0, 1, 1], [0, 2, 1], [1, 3, 2], [2, 3, 2]] },
    { name: 'stale, zero & disconnected', n: 5, source: 2, edges: [[2, 0, 8], [2, 1, 0], [1, 0, 2], [0, 3, 1]] },
  ];
}

// Bellman-Ford and a rooted, tight-edge parent chain. No queue/trace input.
export function verify({ name, n, source, edges }, { distance, parent }) {
  const expected = Array(n).fill(INF);
  expected[source] = 0;
  for (let pass = 1; pass < n; pass++) for (const [a, b, w] of edges) {
    expected[a] = Math.min(expected[a], expected[b] + w);
    expected[b] = Math.min(expected[b], expected[a] + w);
  }
  const fail = message => ({ name, passed: false, message });
  for (let v = 0; v < n; v++) {
    if (distance[v] !== expected[v]) return fail(`dist[${v}] = ${distance[v]}, expected ${expected[v]}`);
    if (v === source || expected[v] === INF) {
      if (parent[v] !== -1) return fail(`parent[${v}] must be -1`);
      continue;
    }
    const seen = new Set();
    for (let u = v; u !== source; u = parent[u]) {
      const p = parent[u];
      const tight = edges.some(([a, b, w]) => ((u === a && p === b) || (u === b && p === a)) && expected[p] + w === expected[u]);
      if (!tight || seen.has(u)) return fail(`Invalid parent chain from station ${v}`);
      seen.add(u);
    }
  }
  return { name, passed: true };
}
