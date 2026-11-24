import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execute } from '../server/execute.js';
import { createMapLesson, mapDisplay, traceFrames } from '../src/lessons/dijkstra.js';

const starter = await readFile(new URL('../src/lessons/dijkstra.cpp', import.meta.url), 'utf8');
const reverseTie = starter.replace('return a.second > b.second;', 'return a.second < b.second;');
const input = code => execute({ code, scenario: 'tie', source: 'camp' });

test('AST-instrumented C++ executes, independently verifies, and traces both equal-distance heap orders', async () => {
  const [smallFirst, largeFirst] = await Promise.all([input(starter), input(reverseTie)]);
  assert.equal(smallFirst.error, undefined, JSON.stringify(smallFirst.error));
  assert.equal(largeFirst.error, undefined, JSON.stringify(largeFirst.error));
  assert.ok(smallFirst.checks.every(c => c.passed), JSON.stringify(smallFirst.checks));
  assert.ok(largeFirst.checks.every(c => c.passed), JSON.stringify(largeFirst.checks));

  const createFrames = trace => traceFrames(createMapLesson('tie', 'camp'), trace);
  const a = createFrames(smallFirst);
  const b = createFrames(largeFirst);
  const step = a.findIndex(f => f.kind === 'queue.pop' && f.value === 3);
  assert.equal(a[step].to, 'truss');
  assert.equal(b[step].to, 'rope');
  assert.equal(a[step].line, starter.split('\n').findIndex(line => line.includes('queue.pop();')) + 1);
  assert.deepEqual(a.at(-1).distance, b.at(-1).distance);
  assert.equal(a.at(-1).distance.summit, 8);
  assert.equal(mapDisplay({ ...createMapLesson('tie'), frames: b, index: step }).frame.to, 'rope');
});

test('compiler errors, uninstrumentable writes, and nonterminating code return explicit diagnostics', async () => {
  const invalid = await input('void dijkstra( {');
  assert.equal(invalid.error?.phase, 'compile');

  const alias = starter.replace('dist[v] = d + w;', 'auto& slot = dist[v]; slot = d + w;');
  const unsupported = await input(alias);
  assert.equal(unsupported.error?.phase, 'unsupported');

  const looping = starter.replace('    while (!queue.empty()) {', '    while (!queue.empty()) {\n        for (;;) {}');
  const timeout = await input(looping);
  assert.equal(timeout.error?.phase, 'timeout');
});

test('INT_MAX on the RHS records every direct write at its original line', async () => {
  const code = starter.replace('    dist[source] = 0;', '    for (int i = 0; i < graph.size(); ++i) dist[i] = INT_MAX;\n    dist[source] = 0;');
  const trace = await input(code);
  assert.ok(trace.checks?.every(c => c.passed), JSON.stringify(trace.error));
  const line = code.split('\n').findIndex(s => s.includes('= INT_MAX')) + 1;
  assert.deepEqual(trace.events.slice(0, 8), Array.from({ length: 8 }, (_, node) => ({ kind: 'distance.write', line, node, value: 2147483647 })));
});

test('a failed extra graph preserves the selected run and every other check, in either order', async () => {
  for (const failingSize of [4, 5]) {
    const code = reverseTie.replace('    dist[source] = 0;', `    if (graph.size() == ${failingSize}) throw 1;\n    dist[source] = 0;`);
    const trace = await input(code);
    assert.equal(trace.result.distance[7], 8);
    assert.equal(trace.events.find(e => e.kind === 'queue.pop' && e.value === 3).node, 4);
    assert.deepEqual(trace.checks.map(c => c.passed), [true, failingSize !== 4, failingSize !== 5]);
    const failed = trace.checks.find(c => !c.passed);
    assert.equal(failed.phase, 'runtime');
    assert.ok(failed.message);
  }
});


test('expired entries survive playback and incorrect submissions keep their own results', async () => {
  const lesson = createMapLesson('everyday');
  const trace = await execute({ code: starter, scenario: 'everyday', source: 'post' });
  const expired = traceFrames(lesson, trace).filter(f => f.stale);
  assert.deepEqual(expired.map(f => [f.to, f.value, f.distance[f.to]]), [['clock', 7, 3], ['pier', 10, 6]]);
  const wrong = await input(starter.replace('dist[v] = d + w;', 'dist[v] = d + w + 1;'));
  assert.equal(wrong.checks[0].passed, false);
  assert.ok(wrong.events.length);
  const runtime = await input(starter.replace('dist[source] = 0;', 'dist[graph.size()] = 0;'));
  assert.equal(runtime.error.phase, 'runtime');
});
