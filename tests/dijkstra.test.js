import test from 'node:test';
import assert from 'node:assert/strict';
import { createMapLesson, mapDisplay, roadInk, routeTo, traceFrames } from '../src/lessons/dijkstra.js';
import { casesFor, verify } from '../server/verify.js';

const event = (kind, node, value) => ({ kind, node, value, line: 9 });
const lesson = createMapLesson('everyday');
const frames = traceFrames(lesson, { version: 1, algorithm: 'dijkstra', scenario: 'everyday', source: 'post', events: [
  event('distance.write', 0, 0), event('distance.write', 1, 7), event('parent.write', 1, 0),
  event('distance.write', 2, 2), event('parent.write', 2, 0), event('distance.write', 1, 3), event('parent.write', 1, 2),
] });

test('distance and parent writes have independent, reversible source steps', () => {
  assert.equal(lesson.frames.length, 1);
  assert.equal(frames[5].distance.clock, 7);
  assert.equal(frames[6].distance.clock, 3);
  assert.deepEqual(routeTo(frames[6], 'clock'), ['post', 'clock']);
  assert.deepEqual(routeTo(frames[7], 'clock'), ['post', 'garden', 'clock']);
  assert.equal(roadInk(lesson.scenario.roads[2], frames[7]), 'traced');
  assert.equal(roadInk(lesson.scenario.roads[2], frames[6]), 'idle');
  assert.deepEqual(routeTo(frames[2], 'clock'), []);
  assert.deepEqual(routeTo({ ...frames[7], previous: { garden: 'clock', clock: 'garden' } }, 'clock'), []);
});

test('the verifier accepts either valid parent, rejects incorrect distances and zero-cost parent cycles', () => {
  const [, diamond, stale] = casesFor('everyday', 'post');
  for (const p of [1, 2]) assert.ok(verify(diamond, { distance: [0, 1, 1, 3], parent: [-1, 0, 0, p] }).passed);
  assert.ok(!verify(diamond, { distance: [0, 1, 1, 4], parent: [-1, 0, 0, 1] }).passed);
  assert.ok(!verify(stale, { distance: [2, 0, 0, 3, 2147483647], parent: [1, 0, -1, 0, -1] }).passed);
  const cycle = { n: 3, source: 0, edges: [[0, 1, 0], [1, 2, 0]] };
  assert.ok(!verify(cycle, { distance: [0, 0, 0], parent: [-1, 2, 1] }).passed);
});

test('comparison requires a verified result and a trace must match its map', () => {
  assert.equal(mapDisplay({ ...lesson, frames, comparing: true }).frame, frames[0]);
  assert.throws(() => traceFrames(lesson, { version: 2 }), /轨迹/);
});
