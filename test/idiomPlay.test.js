import assert from 'node:assert/strict';
import test from 'node:test';
import { generatePuzzle } from '../src/lib/idiom/index.js';
import {
  charAt,
  createPlayState,
  freePoolSlots,
  idiomPlayReducer,
  isFull,
  isLocked,
  wrongCells
} from '../src/lib/idiom/play.js';

const puzzleAt = (level, seed) => generatePuzzle(level, seed);
const blanks = (state) => state.puzzle.cells.map((_, i) => i).filter((i) => !isLocked(state, i));
const slotFor = (state, cell) =>
  freePoolSlots(state).find((slot) => state.puzzle.pool[slot] === state.puzzle.solution[cell]);

/** 依答案把整盤填完，用來測完成判定與存檔往返。 */
function solve(state) {
  let next = state;
  for (const cell of blanks(next)) {
    const slot = slotFor(next, cell);
    assert.notEqual(slot, undefined, `pool is missing the answer for cell ${cell}`);
    next = idiomPlayReducer(next, { type: 'place', cell, slot });
  }
  return next;
}

test('a fresh state has nothing filled and nothing selected', () => {
  const state = createPlayState(puzzleAt(0, 7919));
  assert.equal(state.sel, -1);
  assert.equal(state.reveals, 0);
  assert.equal(state.solved, false);
  assert.equal(freePoolSlots(state).length, state.puzzle.pool.length);
  for (const cell of blanks(state)) assert.equal(charAt(state, cell), null);
});

test('clue cells show their character and cannot be changed or cleared', () => {
  const state = createPlayState(puzzleAt(0, 7919));
  const clue = state.puzzle.cells.findIndex((_, i) => state.puzzle.clues[i]);
  assert.notEqual(clue, -1);
  assert.equal(charAt(state, clue), state.puzzle.solution[clue]);
  assert.equal(idiomPlayReducer(state, { type: 'place', cell: clue, slot: 0 }), state);
  assert.equal(idiomPlayReducer(state, { type: 'clear', cell: clue }), state);
});

test('tapping a cell then a pool character fills that cell', () => {
  let state = createPlayState(puzzleAt(0, 7919));
  const cell = blanks(state)[0];
  const slot = slotFor(state, cell);
  state = idiomPlayReducer(state, { type: 'select', cell });
  state = idiomPlayReducer(state, { type: 'pick', slot });
  assert.equal(charAt(state, cell), state.puzzle.solution[cell]);
  assert.ok(!freePoolSlots(state).includes(slot), 'a used pool entry is no longer free');
});

test('picking with no selected cell does nothing', () => {
  const state = createPlayState(puzzleAt(0, 7919));
  assert.equal(idiomPlayReducer(state, { type: 'pick', slot: 0 }), state);
});

test('clearing a cell returns its character to the pool', () => {
  let state = createPlayState(puzzleAt(0, 7919));
  const cell = blanks(state)[0];
  const slot = slotFor(state, cell);
  state = idiomPlayReducer(state, { type: 'place', cell, slot });
  state = idiomPlayReducer(state, { type: 'clear', cell });
  assert.equal(charAt(state, cell), null);
  assert.ok(freePoolSlots(state).includes(slot));
});

test('replacing a character returns the previous one to the pool', () => {
  let state = createPlayState(puzzleAt(1, 7919));
  const cell = blanks(state)[0];
  const first = freePoolSlots(state)[0];
  const second = freePoolSlots(state)[1];
  state = idiomPlayReducer(state, { type: 'place', cell, slot: first });
  state = idiomPlayReducer(state, { type: 'place', cell, slot: second });
  assert.equal(state.puzzle.pool[second], charAt(state, cell));
  assert.ok(freePoolSlots(state).includes(first), 'the replaced entry goes back to the pool');
});

test('moving one entry to another cell vacates the first cell', () => {
  let state = createPlayState(puzzleAt(1, 7919));
  const [a, b] = blanks(state);
  const slot = freePoolSlots(state)[0];
  state = idiomPlayReducer(state, { type: 'place', cell: a, slot });
  state = idiomPlayReducer(state, { type: 'place', cell: b, slot });
  assert.equal(charAt(state, a), null);
  assert.equal(charAt(state, b), state.puzzle.pool[slot]);
});

test('the pool always holds enough entries to finish the board', () => {
  for (let level = 0; level <= 4; level += 1) {
    const state = createPlayState(puzzleAt(level, 7919 * (level + 1)));
    const solved = solve(state);
    assert.equal(solved.solved, true, `level ${level} could not be completed from its pool`);
  }
});

test('completion is detected without a submit action', () => {
  const solved = solve(createPlayState(puzzleAt(0, 7919)));
  assert.equal(solved.solved, true);
  assert.equal(wrongCells(solved).length, 0);
});

test('a full but incorrect board is not complete', () => {
  let state = createPlayState(puzzleAt(2, 15838));
  // 故意錯開：把每個空格填上「下一格的答案」對應的池項目。
  const open = blanks(state);
  const target = open.map((cell) => state.puzzle.solution[cell]);
  let swapped = false;
  for (let i = 0; i < open.length; i += 1) {
    const want = target[(i + 1) % open.length];
    const slot = freePoolSlots(state).find((s) => state.puzzle.pool[s] === want);
    if (slot === undefined) continue;
    state = idiomPlayReducer(state, { type: 'place', cell: open[i], slot });
    if (state.puzzle.pool[slot] !== state.puzzle.solution[open[i]]) swapped = true;
  }
  assert.ok(swapped, 'the fixture must actually place at least one wrong character');
  assert.equal(state.solved, false);
  assert.ok(wrongCells(state).length > 0);
});

test('reveal fills the answer, locks the cell and counts', () => {
  let state = createPlayState(puzzleAt(0, 7919));
  const cell = blanks(state)[0];
  state = idiomPlayReducer(state, { type: 'reveal', cell });
  assert.equal(charAt(state, cell), state.puzzle.solution[cell]);
  assert.equal(isLocked(state, cell), true);
  assert.equal(state.reveals, 1);
  assert.equal(idiomPlayReducer(state, { type: 'place', cell, slot: 0 }), state);
});

test('reveal reclaims its character when it is misplaced elsewhere', () => {
  let state = createPlayState(puzzleAt(1, 7919));
  const open = blanks(state);
  const target = open[0];
  const answer = state.puzzle.solution[target];
  const slot = state.puzzle.pool.findIndex((char) => char === answer);
  const elsewhere = open.find((cell) => cell !== target);
  state = idiomPlayReducer(state, { type: 'place', cell: elsewhere, slot });
  state = idiomPlayReducer(state, { type: 'reveal', cell: target });
  assert.equal(charAt(state, target), answer);
  const counted = state.assign.filter((s) => s === slot).length;
  assert.equal(counted, 1, 'one pool entry cannot occupy two cells');
});

test('isFull reports a filled board that may still be wrong', () => {
  let state = createPlayState(puzzleAt(0, 7919));
  assert.equal(isFull(state), false);
  state = solve(state);
  assert.equal(isFull(state), true);
});

test('restore uses the stored puzzle after generator drift and recomputes completion', () => {
  const generated = createPlayState(puzzleAt(0, 7920));
  const stored = solve(createPlayState(puzzleAt(0, 7919)));
  const restored = idiomPlayReducer(generated, {
    type: 'restore',
    state: { ...stored, solved: false }
  });
  assert.equal(restored.solved, true, 'completion is derived, not trusted from the snapshot');
  assert.equal(restored.puzzle, stored.puzzle, 'the stored puzzle is authoritative');
  assert.notEqual(restored.puzzle, generated.puzzle, 'current generation must not replace the stored puzzle');
});
