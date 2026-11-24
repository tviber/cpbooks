import test from 'node:test';
import assert from 'node:assert/strict';
import { attachExecution, lessonForLocation, lessonSnapshot, restoreLesson } from '../src/lessons/progress.js';
import starter from '../src/lessons/starter-traces.json' with { type: 'json' };

function browserState(hash, state = null, last = null) {
  globalThis.location = { hash };
  globalThis.history = { state };
  globalThis.localStorage = { getItem: () => last == null ? null : JSON.stringify(last) };
}

test('remembers the town and mode but discards positions from an earlier execution', () => {
  browserState('', null, { scenario: 'tie', source: 'camp', index: 5, target: 'summit', comparing: true, routeIndex: 1 });
  const lesson = lessonForLocation();
  assert.equal(lesson.scenario.id, 'tie');
  assert.equal(lesson.index, 0);
  assert.equal(lesson.comparing, true);
  assert.equal(lesson.routeIndex, 0);
});

test('opens a fresh deep link at its declared map and mode', () => {
  browserState('#dijkstra/clock/compare', null, { scenario: 'tie', source: 'camp', index: 5, target: 'summit', comparing: true });
  const lesson = lessonForLocation();
  assert.equal(lesson.scenario.id, 'clock');
  assert.equal(lesson.comparing, true);
  assert.equal(lesson.index, 0);
});

test('restores each history snapshot only when its URL matches', () => {
  browserState('#dijkstra/tie/compare', { lessonHash: '#dijkstra/tie/compare', dijkstra: { scenario: 'tie', source: 'camp', index: 5, target: 'summit', comparing: true, routeIndex: 1 } });
  const previous = lessonForLocation();
  assert.equal(previous.scenario.id, 'tie');
  assert.equal(previous.comparing, true);
  browserState('#dijkstra/clock/compare', history.state);
  assert.equal(lessonForLocation().scenario.id, 'clock');
});

test('ignores a saved source or target that does not exist in the selected map', () => {
  assert.equal(restoreLesson({ scenario: 'tie', source: 'missing', target: 'summit' }), null);
  browserState('', { lessonHash: '', dijkstra: { scenario: 'tie', source: 'camp', target: 'missing', comparing: false } });
  assert.equal(lessonForLocation().target, 'summit');
});

test('Back and Forward restore the exact run, check results, step, and comparison route', () => {
  const trace = starter.traces.find(t => t.scenario === 'tie' && t.source === 'camp');
  browserState('#dijkstra/tie');
  const lesson = lessonForLocation();
  attachExecution(lesson, trace, starter.code + '\n// first submission');
  lesson.index = 22;
  const back = lessonSnapshot(lesson);
  lesson.comparing = true;
  lesson.routeIndex = 1;
  const forward = lessonSnapshot(lesson);
  attachExecution(lesson, trace, starter.code + '\n// later submission');
  for (const saved of [back, forward]) {
    const hash = `#dijkstra/tie${saved.comparing ? '/compare' : ''}`;
    browserState(hash, { lessonHash: hash, dijkstra: saved });
    const restored = lessonForLocation();
    assert.equal(restored.frames.length, 41);
    assert.equal(restored.index, 22);
    assert.equal(restored.routeIndex, saved.routeIndex);
    assert.equal(restored.runId, back.runId);
    assert.equal(restored.executedCode, starter.code + '\n// first submission');
    assert.deepEqual(restored.checks, trace.checks);
  }
  const otherSource = restoreLesson({ ...back, source: 'pine' });
  assert.equal(otherSource.runId, 'starter');
  assert.equal(otherSource.index, 0);
});
