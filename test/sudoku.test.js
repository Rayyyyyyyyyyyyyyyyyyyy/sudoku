import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PUZZLES } from '../src/data/puzzles.js';
import { SUDOKU_CHALLENGE_SOURCE } from '../src/data/sudokuChallengePuzzles.js';
import { LEVELS, PUZZLE_COUNT, PUZZLE_POOLS, countSolutions, generate } from '../src/lib/sudoku.js';

const RANGES = [
  [1.5, 2.0],
  [2.3, 3.0],
  [3.2, 4.4],
  [4.5, 6.6],
  [6.7, 9.1],
  [9.2, 9.3]
];

test('ships five original pools and every available SE 9.2+ challenge', () => {
  assert.equal(PUZZLE_POOLS.length, LEVELS.length);
  assert.equal(PUZZLE_COUNT, 1021);
  assert.deepEqual(PUZZLE_POOLS.slice(0, 5), PUZZLES);
  assert.equal(LEVELS[5].name, '極限');
  PUZZLE_POOLS.forEach((pool, level) => {
    assert.equal(pool.length, level === 5 ? 21 : 200);
    const [min, max] = RANGES[level];
    pool.forEach(([puzzle, rating]) => {
      assert.match(puzzle, /^[0-9]{81}$/);
      assert.ok(rating >= min && rating <= max, `level ${level} contains SE ${rating}`);
    });
  });
  assert.equal(SUDOKU_CHALLENGE_SOURCE.commit, 'd8c8ebaee0c08c412cfba96af1923dfa61c83317');
  assert.equal(SUDOKU_CHALLENGE_SOURCE.eligibleCount, 21);
  assert.equal(PUZZLE_POOLS[5].filter(([, rating]) => rating === 9.3).length, 1);
  assert.equal(new Set(PUZZLE_POOLS.flat().map(([digits]) => digits)).size, PUZZLE_COUNT);
});

test('every bundled puzzle has exactly one solution', () => {
  PUZZLE_POOLS.flat().forEach(([digits]) => {
    assert.equal(countSolutions(Array.from(digits, Number), 2), 1, digits);
  });
});

function assertValidSolution({ puzzle, solution }) {
  assert.equal(solution.length, 81);
  assert.ok(solution.every((digit) => Number.isInteger(digit) && digit >= 1 && digit <= 9));
  puzzle.forEach((digit, i) => {
    if (digit) assert.equal(solution[i], digit, `given at cell ${i}`);
  });
  for (let i = 0; i < 9; i++) {
    const row = solution.slice(i * 9, i * 9 + 9);
    const column = Array.from({ length: 9 }, (_, j) => solution[j * 9 + i]);
    const boxStart = Math.floor(i / 3) * 27 + (i % 3) * 3;
    const box = Array.from({ length: 9 }, (_, j) => solution[boxStart + Math.floor(j / 3) * 9 + j % 3]);
    for (const unit of [row, column, box]) assert.equal(new Set(unit).size, 9);
  }
}

test('a seed selects the same rated puzzle and a completed valid grid', () => {
  LEVELS.forEach((_, level) => {
    const first = generate(level, 123456789);
    const second = generate(level, 123456789);
    assert.deepEqual(first, second);
    assertValidSolution(first);
  });
});

test('the challenge generator can select and correctly solve every new puzzle', () => {
  const remaining = new Set(PUZZLE_POOLS[5].map(([digits]) => digits));
  for (let seed = 0; seed < 1000 && remaining.size; seed++) {
    const board = generate(5, seed);
    assertValidSolution(board);
    assert.ok(board.rating >= 9.2);
    remaining.delete(board.puzzle.join(''));
  }
  assert.equal(remaining.size, 0);
});

test('the original puzzle bytes and saved level/seed mappings remain unchanged', () => {
  const bytes = readFileSync(new URL('../src/data/puzzles.js', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    '62f72b201cc1ac2605e2982349af94b24a0d2a308dddbd391080d01d3756278c');
  // Captured before appending the challenge pool; cover uint32 seed boundaries.
  const fixtures = [
    [0, 0, '470000095300804007000607000006105400003070100020406070207000508050040030000000000'],
    [0, 1, '000502000060070080250308076000000000000403000830000095043000210900000003020907050'],
    [0, 123456789, '000502000060070080250308076000000000000403000830000095043000210900000003020907050'],
    [0, 4294967295, '080000030004962800006000900400203001100409008070050020301000209000000000800507003'],
    [1, 0, '071830000000419005000000008050000037980020041630000020300000000800357000000048150'],
    [1, 1, '900082000073001006000300100040005020100000003050800060007008000400200910000730005'],
    [1, 123456789, '100000003080070060006020800304701602200000004010000030043000120020000080801205306'],
    [1, 4294967295, '040000090000263000502090306200708004000000000080050070000419000003000100600000008'],
    [2, 0, '200010008300685002006000500000090000700106005020703060057000980600070004030409050'],
    [2, 1, '500070003000000700012049500008907000105000908000102600004510390001000000600090005'],
    [2, 123456789, '620010075001605400000307000080000040700000006003050900200060001004000800000201000'],
    [2, 4294967295, '060495020000020000000603000600907008050080030008060500500000007107802405030000010'],
    [3, 0, '005900002300405000001200060580030000000000000000060084070001500000302009400007100'],
    [3, 1, '007203060100090000003500908700000306030000080902000001301007400000040002040102600'],
    [3, 123456789, '060500000007001904090600200300050800000302000006090005008007030702800600000005040'],
    [3, 4294967295, '800000001160305078009000500200000006580000094010906020040010030000209000900060005'],
    [4, 0, '000004060873690024000800009007000030200000007040000500400002000790048213030100000'],
    [4, 1, '070200001580003002000070300010007800000000000009600040001090000400100056200005030'],
    [4, 123456789, '704000905010040070089050310000010000000708000300604001070000090032000450400030007'],
    [4, 4294967295, '400003009050607080000590000120000890003000100097000024000068000030905070900400005']
  ];
  for (const [level, seed, digits] of fixtures) assert.equal(generate(level, seed).puzzle.join(''), digits);
});
