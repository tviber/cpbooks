import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonForLocation, restoreLesson } from '../src/lessons/progress.js';

function browserState(hash, state = null, last = null) {
  globalThis.location = { hash };
  globalThis.history = { state };
  globalThis.localStorage = { getItem: () => last == null ? null : JSON.stringify(last) };
}

test('returns home to the learner’s last step and comparison route', () => {
  browserState('', null, { scenario: 'tie', source: 'camp', index: 5, target: 'summit', comparing: true, routeIndex: 1 });
  const lesson = lessonForLocation();
  assert.equal(lesson.scenario.id, 'tie');
  assert.equal(lesson.index, 5);
  assert.equal(lesson.comparing, true);
  assert.equal(lesson.routeIndex, 1);
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
  assert.equal(previous.index, 5);
  assert.equal(previous.routeIndex, 1);
  browserState('#dijkstra/clock/compare', history.state);
  assert.equal(lessonForLocation().scenario.id, 'clock');
});

test('ignores a saved source or target that does not exist in the selected map', () => {
  assert.equal(restoreLesson({ scenario: 'tie', source: 'missing', target: 'summit' }), null);
  browserState('', { lessonHash: '', dijkstra: { scenario: 'tie', source: 'camp', target: 'missing', comparing: false } });
  assert.equal(lessonForLocation().target, 'summit');
});
