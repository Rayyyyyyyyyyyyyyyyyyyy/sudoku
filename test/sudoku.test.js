import assert from 'node:assert/strict';
import test from 'node:test';
import { PUZZLES } from '../src/data/puzzles.js';
import { LEVELS, countSolutions, generate } from '../src/lib/sudoku.js';

const RANGES = [
  [1.5, 2.0],
  [2.3, 3.0],
  [3.2, 4.4],
  [4.5, 6.6],
  [6.7, Infinity]
];

test('ships 200 correctly graded puzzles in every difficulty', () => {
  assert.equal(PUZZLES.length, LEVELS.length);
  PUZZLES.forEach((pool, level) => {
    assert.equal(pool.length, 200);
    const [min, max] = RANGES[level];
    pool.forEach(([puzzle, rating]) => {
      assert.match(puzzle, /^[0-9]{81}$/);
      assert.ok(rating >= min && rating <= max, `level ${level} contains SE ${rating}`);
    });
  });
});

test('every bundled puzzle has exactly one solution', () => {
  PUZZLES.flat().forEach(([digits]) => {
    assert.equal(countSolutions(Array.from(digits, Number), 2), 1, digits);
  });
});

test('a seed selects the same rated puzzle and a completed valid grid', () => {
  LEVELS.forEach((_, level) => {
    const first = generate(level, 123456789);
    const second = generate(level, 123456789);
    assert.deepEqual(first, second);
    assert.ok(first.solution.every((digit) => digit >= 1 && digit <= 9));
    assert.equal(countSolutions(first.solution.slice(), 2), 1);
  });
});
