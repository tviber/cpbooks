import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAP_SCENARIOS } from '../src/lessons/towns.js';
import { pointOnPath, roadPath, townLayout } from '../src/scene/town-layouts.js';

test('the courier follows each drawn road between its two stations in either direction', () => {
  for (const { id, roads } of MAP_SCENARIOS) {
    const layout = townLayout(id);
    for (const { from, to } of roads) {
      const path = roadPath(layout, from, to);
      const returning = roadPath(layout, to, from);
      assert.deepEqual(path[0], layout.stops[from]);
      assert.deepEqual(path.at(-1), layout.stops[to]);
      assert.deepEqual(returning, [...path].reverse());
      for (const progress of [0, .2, .5, .8, 1]) {
        const [ax, az] = pointOnPath(path, progress);
        const [bx, bz] = pointOnPath(returning, 1 - progress);
        assert.ok(Math.hypot(ax - bx, az - bz) < 1e-8, `${id}: ${from} ↔ ${to}`);
      }
    }
  }
});

test('no map draws a crossing that students could mistake for an extra junction', () => {
  function side([x, z], [endX, endZ], [px, pz]) {
    return (endX - x) * (pz - z) - (endZ - z) * (px - x);
  }
  for (const { id, roads } of MAP_SCENARIOS) {
    const segments = roads.flatMap(({ from, to }) => {
      const path = roadPath(townLayout(id), from, to);
      return path.slice(1).map((end, i) => [path[i], end]);
    });
    for (const [i, [a, b]] of segments.entries()) {
      for (const [c, d] of segments.slice(i + 1)) {
        const cross = side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
        assert.ok(!cross, `${id}: ${a} → ${b} crosses ${c} → ${d}`);
      }
    }
  }
});
