import test from 'node:test';
import assert from 'node:assert/strict';
import { createVector, vectorOperation, inspectElement, appendCosts } from '../src/lessons/vector.js';
import { createSearch, probeSearch, chooseHalf, harvestWood, solveProblem, boundaryCheck, forestResult, validateProblem } from '../src/lessons/binary.js';

test('vector: append within capacity preserves storage; overflow migrates all live elements', () => {
  const original = createVector();
  const filled = vectorOperation(original, 'push', 48);
  assert.equal(filled.capacity, 4);
  assert.equal(filled.allocation, original.allocation);
  const expanded = vectorOperation(filled, 'push', 60);
  assert.deepEqual(expanded.values, [12, 24, 36, 48, 60]);
  assert.equal(expanded.capacity, 8);
  assert.equal(expanded.moved, 4);
  assert.equal(expanded.relocations, 1);
  assert.notEqual(expanded.allocation, original.allocation);
  assert.deepEqual(original.values, [12, 24, 36]);
  assert.equal(inspectElement(expanded, 2).offset, 8);
  assert.throws(() => inspectElement(expanded, 5));
});

test('vector: reserve constructs no elements, never shrinks; pop preserves capacity', () => {
  let state = vectorOperation(createVector(true), 'reserve', 8);
  assert.equal(state.values.length, 0);
  assert.equal(state.moved, 0);
  for (let index = 0; index < 8; index += 1) state = vectorOperation(state, 'push', index);
  assert.equal(state.relocations, 0);
  assert.equal(state.moved, 0);
  state = vectorOperation(state, 'pop');
  state = vectorOperation(state, 'reserve', 4);
  assert.equal(state.capacity, 8);
  assert.equal(state.values.length, 7);
  assert.throws(() => vectorOperation(createVector(true), 'pop'));
  assert.throws(() => vectorOperation(state, 'push', NaN));
});

test('geometric growth total cost is linear without claiming every prefix is 2n', () => {
  assert.equal(appendCosts(8).cost, 15);
  assert.equal(appendCosts(8, 'linear').cost, 36);
  assert.equal(appendCosts(1000).cost, 2023);
  assert.equal(appendCosts(1000, 'linear').cost, 500500);
  for (let count = 1; count <= 1024; count += 1) assert.ok(appendCosts(count).cost < 3 * count);
});

test('forest: wood is positive height difference; every trial uses original trees', () => {
  const heights = [20, 15, 10, 17];
  assert.deepEqual(harvestWood(heights, 7, 15).contributions, [5, 0, 0, 2]);
  assert.equal(harvestWood(heights, 7, 16).wood, 5);
  assert.equal(harvestWood(heights, 7, 16).feasible, false);
  assert.equal(harvestWood(heights, 7, 14).wood, 10);
  assert.equal(harvestWood(heights, 7, 0).wood, 62);
  assert.equal(harvestWood(heights, 7, 20).wood, 0);
  assert.deepEqual(heights, [20, 15, 10, 17]);
  assert.throws(() => harvestWood(heights, 7, -1));
  assert.throws(() => harvestWood(heights, 7, 21));
  assert.throws(() => harvestWood(heights, 7, NaN));
});

test('forest: incorrect half preserves pending check and the feasible answer interval', () => {
  const probed = probeSearch(createSearch());
  assert.equal(probed.pending.height, 10);
  assert.equal(probed.pending.wood, 22);
  const mistake = chooseHalf(probed, 'left');
  assert.equal(mistake.lo, 0);
  assert.equal(mistake.hi, 20);
  assert.equal(mistake.mistakes, 1);
  assert.equal(mistake.pending, probed.pending);
  const correct = chooseHalf(mistake, 'right');
  assert.equal(correct.lo, 10);
  assert.equal(correct.hi, 20);
  assert.equal(correct.pending, null);
  assert.throws(() => probeSearch(probed));
  assert.throws(() => chooseHalf(createSearch(), 'left'));
});

test('forest: classic paths, increased demand, non-exact totals, and a second sample', () => {
  const original = solveProblem([20, 15, 10, 17], 7);
  assert.equal(original.answer, 15);
  assert.deepEqual(original.history.map(step => step.height), [10, 15, 18, 16]);
  assert.equal(boundaryCheck(original).answer.wood, 7);
  assert.equal(boundaryCheck(original).above.wood, 5);
  assert.equal(solveProblem([20, 15, 10, 17], 10).answer, 14);
  assert.equal(solveProblem([4, 42, 40, 26, 46], 20).answer, 36);
  const excess = solveProblem([5, 5], 3);
  assert.equal(excess.answer, 3);
  assert.equal(boundaryCheck(excess).answer.wood, 4);
});

test('forest: zero is a legal optimum, impossible is null, and view state cannot borrow exploration results', () => {
  const ground = solveProblem([4, 3, 2, 1], 10);
  const impossible = solveProblem([4, 3, 2, 1], 11);
  assert.equal(ground.answer, 0);
  assert.equal(ground.possible, true);
  assert.equal(impossible.answer, null);
  assert.equal(impossible.possible, false);
  assert.equal(impossible.history.length, 0);
  assert.throws(() => probeSearch(impossible));
  assert.equal(boundaryCheck(impossible), null);
  assert.equal(forestResult({ binary: ground, binaryMode: 'search', sawHeight: 3 }).height, 0);
  const pending = probeSearch(createSearch());
  assert.equal(forestResult({ binary: pending, binaryMode: 'search', sawHeight: 14 }).height, 10);
  assert.equal(forestResult({ binary: pending, binaryMode: 'explore', sawHeight: 14 }).height, 14);
  const lastProbeIsFailure = solveProblem([20, 15, 10, 17], 7);
  assert.equal(lastProbeIsFailure.history.at(-1).height, 16);
  assert.equal(forestResult({ binary: lastProbeIsFailure, binaryMode: 'search' }).height, 15);
});

test('forest binary search agrees with exhaustive search, including zero and impossible requirements', () => {
  for (let first = 1; first <= 9; first += 1) {
    for (let second = 1; second <= 9; second += 1) {
      for (let target = 1; target <= first + second + 5; target += 1) {
        const heights = [first, second, 3];
        const maximum = Math.max(...heights);
        let expected = null;
        let previousWood = Infinity;
        for (let height = 0; height <= maximum; height += 1) {
          const result = harvestWood(heights, target, height);
          if (result.feasible) expected = height;
          assert.ok(result.wood <= previousWood);
          previousWood = result.wood;
        }
        const result = solveProblem(heights, target);
        assert.equal(result.answer, expected);
        assert.ok(result.history.length <= Math.ceil(Math.log2(maximum + 1)));
        for (const step of result.history) {
          assert.ok(step.after[1] - step.after[0] < step.before[1] - step.before[0]);
          assert.ok(step.after[0] <= expected && expected <= step.after[1]);
        }
      }
    }
  }
});

test('forest custom inputs are bounded and preserve tree order', () => {
  validateProblem([50, 1, 40, 3, 20, 2], 500);
  assert.deepEqual(createSearch([20, 10, 15], 7).heights, [20, 10, 15]);
  for (const heights of [[], [4], [0, 3], [51, 3], [2.5, 3], [NaN, 2], Array(7).fill(3)]) {
    assert.throws(() => validateProblem(heights, 7));
  }
  for (const target of [0, -1, 501, 2.5, NaN]) assert.throws(() => validateProblem([20, 10], target));
});
