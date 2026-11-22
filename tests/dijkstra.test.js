import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STOPS, ROADS, MAP_SCENARIOS, createMapLesson, dijkstraFrames, mapDisplay, roadInk, routeTo, shortestRoutesTo } from '../src/lessons/dijkstra.js';

test('stepping back across the clock-tower improvement restores both its old distance and its old route', () => {
  const { frames } = createMapLesson();
  const i = frames.findIndex(f => f.kind === 'road' && f.from === 'garden' && f.to === 'clock');
  const before = frames[i - 1], after = frames[i];
  assert.equal(before.distance.clock, 7);
  assert.deepEqual(routeTo(before, 'clock'), ['post', 'clock']);
  assert.equal(after.distance.clock, 3);
  assert.deepEqual(routeTo(after, 'clock'), ['post', 'garden', 'clock']);
  assert.ok(!after.settled.includes('clock'), 'an improved estimate is not a settled distance');
  const direct = ROADS.find(r => r.from === 'post' && r.to === 'clock');
  assert.equal(roadInk(direct, before), 'candidate');
  assert.equal(roadInk(direct, after), 'replaced');
});

test('a longer alternative is shown but does not overwrite the bookshop route', () => {
  const { frames } = createMapLesson();
  const i = frames.findIndex(f => f.kind === 'road' && f.from === 'clock' && f.to === 'books');
  assert.equal(frames[i].proposed, 5);
  assert.equal(frames[i].distance.books, 4);
  assert.deepEqual(frames[i].previous, frames[i - 1].previous);
  assert.deepEqual(routeTo(frames[i], 'books'), ['post', 'garden', 'books']);
});

test('each departure station settles the true minimum, and the painted tree reconstructs those distances', () => {
  // Independent distances for the five-station teaching map, in STOPS order.
  const expected = { post: [0, 3, 2, 4, 6], clock: [3, 0, 1, 2, 4], garden: [2, 1, 0, 2, 4], books: [4, 2, 2, 0, 2], pier: [6, 4, 4, 2, 0] };
  for (const { id: source } of STOPS) {
    const { frames } = createMapLesson(source);
    const finish = frames.at(-1);
    assert.equal(finish.kind, 'finish');
    assert.deepEqual(STOPS.map(({ id }) => finish.distance[id]), expected[source]);
    assert.equal(ROADS.filter(road => roadInk(road, finish) === 'fixed').length, STOPS.length - 1);
    for (const frame of frames.filter(f => f.kind === 'settle')) {
      const remaining = STOPS.filter(({ id }) => !frame.settled.includes(id));
      assert.ok(remaining.every(({ id }) => frame.distance[frame.from] <= frame.distance[id]));
      assert.equal(frame.distance[frame.from], finish.distance[frame.from]);
    }
    for (const { id } of STOPS) {
      const route = routeTo(finish, id);
      assert.equal(route[0], source);
      assert.equal(route.at(-1), id);
      const traced = ROADS.filter(road => roadInk(road, finish, route) === 'traced');
      assert.equal(traced.length, route.length - 1);
      assert.equal(traced.reduce((sum, road) => sum + road.minutes, 0), finish.distance[id]);
    }
  }
});

test('zero-minute roads can tie, unreachable stations stay at infinity, and negative roads are refused', () => {
  const stops = ['a', 'b', 'c', 'isolated'].map(id => ({ id }));
  const roads = [{ from: 'a', to: 'b', minutes: 0 }, { from: 'a', to: 'c', minutes: 1 }, { from: 'b', to: 'c', minutes: 1 }];
  const finish = dijkstraFrames(stops, roads, 'a').at(-1);
  assert.deepEqual(finish.distance, { a: 0, b: 0, c: 1, isolated: Infinity });
  assert.deepEqual(finish.settled, ['a', 'b', 'c']);
  assert.deepEqual(routeTo(finish, 'isolated'), []);
  assert.deepEqual(shortestRoutesTo(finish, roads, 'isolated'), []);
  assert.deepEqual(shortestRoutesTo(finish, roads, 'c'), [['a', 'c'], ['a', 'b', 'c']]);
  assert.ok(roads.every(road => roadInk(road, finish, []) === 'idle'));
  assert.throws(() => dijkstraFrames(stops, [{ ...roads[0], minutes: -1 }], 'a'), RangeError);
});

test('each new town example changes just one road and really changes the fastest walk to the pier', () => {
  const expected = {
    everyday: [6, [['post', 'garden', 'books', 'pier']]],
    riverside: [4, [['post', 'garden', 'pier']]],
    clock: [5, [['post', 'clock', 'books', 'pier']]],
    tie: [6, [['post', 'garden', 'pier'], ['post', 'garden', 'books', 'pier']]],
  };
  for (const { id } of MAP_SCENARIOS) {
    const lesson = createMapLesson('post', id);
    assert.deepEqual(lesson.roads.map(r => [r.from, r.to]), ROADS.map(r => [r.from, r.to]));
    assert.equal(lesson.roads.filter((r, i) => r.minutes !== ROADS[i].minutes).length, id === 'everyday' ? 0 : 1);
    const { frame, routes } = mapDisplay({ ...lesson, comparing: true });
    assert.deepEqual([frame.distance.pier, routes], expected[id]);
  }
});

test('all equal shortest routes agree with exhaustive walks for every source and destination in all four towns', () => {
  for (const { id: scenario } of MAP_SCENARIOS) for (const { id: source } of STOPS) {
    const { frames, roads } = createMapLesson(source, scenario);
    const walks = [];
    function visit(path, cost) {
      const last = path.at(-1);
      walks.push({ last, path, cost });
      for (const { from, to, minutes } of roads) {
        const next = last === from ? to : last === to ? from : null;
        if (next && !path.includes(next)) visit([...path, next], cost + minutes);
      }
    }
    visit([source], 0);
    for (const { id } of STOPS) {
      const arriving = walks.filter(w => w.last === id);
      const best = Math.min(...arriving.map(w => w.cost));
      const actual = shortestRoutesTo(frames.at(-1), roads, id);
      assert.equal(frames.at(-1).distance[id], best);
      assert.deepEqual(actual.map(p => p.join('/')).sort(), arriving.filter(w => w.cost === best).map(w => w.path.join('/')).sort());
    }
  }
});

test('comparing a tie can change the highlighted walk without changing the recorded tree or revealing future steps', () => {
  const lesson = createMapLesson('post', 'tie');
  const i = lesson.frames.findIndex(f => f.kind === 'road' && f.to === 'pier' && f.proposed === f.old);
  const step = { ...lesson, index: i, inspected: 'pier' };
  assert.deepEqual(mapDisplay(step).route, ['post', 'garden', 'pier']);
  assert.equal(roadInk(lesson.roads.find(r => r.from === 'books' && r.to === 'pier'), step.frames[i]), 'equal');
  const second = mapDisplay({ ...step, comparing: true, routeIndex: 1 });
  assert.deepEqual(second.route, ['post', 'garden', 'books', 'pier']);
  assert.equal(second.frame.previous.pier, 'garden');
  assert.equal(mapDisplay(step).frame, lesson.frames[i]);
  assert.deepEqual(mapDisplay({ ...lesson, inspected: 'pier' }).route, []);
});
