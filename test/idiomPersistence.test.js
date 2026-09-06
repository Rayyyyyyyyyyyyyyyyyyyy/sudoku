import assert from 'node:assert/strict';
import test from 'node:test';
import { generatePuzzle } from '../src/lib/idiom/index.js';
import {
  IDIOM_RECORDS_KEY,
  IDIOM_SNAPSHOT_KEY,
  clearIdiomSnapshot,
  loadIdiomRecords,
  loadIdiomSnapshot,
  persistIdiomSnapshot,
  recordIdiomSolve,
  snapshotOf
} from '../src/lib/idiom/persistence.js';
import { createPlayState, idiomPlayReducer, isLocked } from '../src/lib/idiom/play.js';

/** 最小的 localStorage 替身，順便讓測試能斷言「別的 key 沒被碰過」。 */
function fakeStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    keys: () => [...data.keys()],
    raw: data
  };
}

const started = { level: 1, seed: 7919, daily: false, startedAt: 1000, elapsedMs: 4200 };

test('a snapshot round-trips the board, fills and timer', () => {
  const storage = fakeStorage();
  let state = createPlayState(generatePuzzle(1, 7919));
  const cell = state.puzzle.cells.findIndex((_, i) => !isLocked(state, i));
  state = idiomPlayReducer(state, { type: 'place', cell, slot: 0 });
  persistIdiomSnapshot(snapshotOf(state, started), storage);

  const result = loadIdiomSnapshot(storage);
  assert.equal(result.status, 'ok');
  assert.deepEqual(result.snapshot.assign, state.assign);
  assert.equal(result.snapshot.elapsedMs, 4200);
  assert.deepEqual(result.snapshot.puzzle.solution, state.puzzle.solution);
});

test('the stored board is restored rather than regenerated', () => {
  const storage = fakeStorage();
  const state = createPlayState(generatePuzzle(1, 7919));
  persistIdiomSnapshot(snapshotOf(state, started), storage);

  // 模擬語料或生成器改版：同 seed 現在會長出不同的盤。
  const drifted = generatePuzzle(1, 7919 + 1);
  const restored = loadIdiomSnapshot(storage).snapshot;
  assert.deepEqual(restored.puzzle.solution, state.puzzle.solution);
  assert.notDeepEqual(restored.puzzle.solution, drifted.solution);
});

test('an unsupported version is reported and the data is retained', () => {
  const storage = fakeStorage();
  const state = createPlayState(generatePuzzle(0, 7919));
  const snapshot = { ...snapshotOf(state, started), version: 999 };
  persistIdiomSnapshot(snapshot, storage);

  const result = loadIdiomSnapshot(storage);
  assert.equal(result.status, 'incompatible');
  assert.equal(result.reason, 'version');
  assert.notEqual(storage.getItem(IDIOM_SNAPSHOT_KEY), null, 'incompatible data must survive');
});

test('a structurally broken snapshot is incompatible, not a crash', () => {
  const storage = fakeStorage();
  const state = createPlayState(generatePuzzle(0, 7919));
  const snapshot = snapshotOf(state, started);
  snapshot.assign = snapshot.assign.slice(0, 2);
  persistIdiomSnapshot(snapshot, storage);

  const result = loadIdiomSnapshot(storage);
  assert.equal(result.status, 'incompatible');
  assert.equal(result.reason, 'shape');
});

test('an out-of-range pool index is rejected', () => {
  const storage = fakeStorage();
  const state = createPlayState(generatePuzzle(0, 7919));
  const snapshot = snapshotOf(state, started);
  snapshot.assign = snapshot.assign.map(() => snapshot.puzzle.pool.length + 5);
  persistIdiomSnapshot(snapshot, storage);
  assert.equal(loadIdiomSnapshot(storage).status, 'incompatible');
});

test('no snapshot reads as empty', () => {
  assert.equal(loadIdiomSnapshot(fakeStorage()).status, 'empty');
});

test('clearing removes only the snapshot', () => {
  const storage = fakeStorage({ [IDIOM_RECORDS_KEY]: '{"solved":3}' });
  const state = createPlayState(generatePuzzle(0, 7919));
  persistIdiomSnapshot(snapshotOf(state, started), storage);
  clearIdiomSnapshot(storage);
  assert.equal(loadIdiomSnapshot(storage).status, 'empty');
  assert.equal(loadIdiomRecords(storage).solved, 3, 'records survive clearing the active puzzle');
});

test('unavailable storage does not throw', () => {
  const hostile = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); }
  };
  const state = createPlayState(generatePuzzle(0, 7919));
  assert.equal(loadIdiomSnapshot(hostile).status, 'empty');
  assert.equal(persistIdiomSnapshot(snapshotOf(state, started), hostile), false);
  assert.doesNotThrow(() => clearIdiomSnapshot(hostile));
});

test('an unassisted completion sets the best time', () => {
  const storage = fakeStorage();
  const records = recordIdiomSolve({ level: 2, ms: 60000, reveals: 0 }, storage);
  assert.equal(records.solved, 1);
  assert.equal(records.assisted, 0);
  assert.equal(records.best[2], 60000);
});

test('an assisted completion counts but never sets the best time', () => {
  const storage = fakeStorage();
  recordIdiomSolve({ level: 2, ms: 60000, reveals: 0 }, storage);
  const records = recordIdiomSolve({ level: 2, ms: 1000, reveals: 3 }, storage);
  assert.equal(records.solved, 2);
  assert.equal(records.assisted, 1);
  assert.equal(records.count[2], 2);
  assert.equal(records.best[2], 60000, 'a revealed run must not beat an honest time');
});

test('an assisted completion on a fresh level leaves the best time unset', () => {
  const storage = fakeStorage();
  const records = recordIdiomSolve({ level: 4, ms: 5000, reveals: 1 }, storage);
  assert.equal(records.best[4], undefined);
  assert.equal(records.count[4], 1);
});

test('the streak advances on consecutive days and resets on a gap', () => {
  const storage = fakeStorage();
  const day = (iso) => new Date(`${iso}T12:00:00`);
  let records = recordIdiomSolve({ level: 0, ms: 1000, now: day('2026-09-01') }, storage);
  assert.equal(records.streak, 1);
  records = recordIdiomSolve({ level: 0, ms: 1000, now: day('2026-09-02') }, storage);
  assert.equal(records.streak, 2);
  records = recordIdiomSolve({ level: 0, ms: 1000, now: day('2026-09-02') }, storage);
  assert.equal(records.streak, 2, 'a second solve the same day does not double-count');
  records = recordIdiomSolve({ level: 0, ms: 1000, now: day('2026-09-05') }, storage);
  assert.equal(records.streak, 1, 'a missed day restarts the streak');
});

test('the daily puzzle records whether it was assisted', () => {
  const storage = fakeStorage();
  const now = new Date('2026-09-06T09:00:00');
  const records = recordIdiomSolve({ level: 2, ms: 90000, reveals: 2, isDaily: true, now }, storage);
  assert.deepEqual(records.daily['2026-09-06'], { ms: 90000, assisted: true });
});

test('the Sudoku and poker keys are never touched', () => {
  const storage = fakeStorage({
    'sudoku-drill-v1': '{"solved":9}',
    'sudoku-drill-settings-v1': '{"showErrors":true}',
    'sudoku-drill-active-game-v2': '{"seed":1}',
    'sudoku-drill-poker-active-v1': '{"phase":"selecting"}',
    'sudoku-drill-poker-records-v1': '{"runs":2}'
  });
  const before = new Map(storage.raw);
  const state = createPlayState(generatePuzzle(0, 7919));
  persistIdiomSnapshot(snapshotOf(state, started), storage);
  recordIdiomSolve({ level: 0, ms: 1000 }, storage);
  clearIdiomSnapshot(storage);

  for (const [key, value] of before) {
    assert.equal(storage.getItem(key), value, `${key} must be untouched`);
  }
  assert.deepEqual(
    storage.keys().filter((k) => !before.has(k)).sort(),
    [IDIOM_RECORDS_KEY].sort()
  );
});
