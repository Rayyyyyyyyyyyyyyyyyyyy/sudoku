import assert from 'node:assert/strict';
import test from 'node:test';
import { clearRemovedGameData } from '../src/lib/removedGameData.js';

test('removes only the retired games and keeps Sudoku and poker saves', () => {
  const entries = new Map([
    ['sudoku-drill-idiom-active-v1', 'idiom game'],
    ['sudoku-drill-idiom-records-v1', 'idiom records'],
    ['sudoku-drill-rpg-v1', 'rpg game'],
    ['sudoku-drill-v1', 'sudoku progress'],
    ['sudoku-drill-poker-active-v1', 'poker game'],
    ['sudoku-drill-poker-records-v1', 'poker records']
  ]);
  clearRemovedGameData({ removeItem: (key) => entries.delete(key) });
  assert.deepEqual([...entries], [
    ['sudoku-drill-v1', 'sudoku progress'],
    ['sudoku-drill-poker-active-v1', 'poker game'],
    ['sudoku-drill-poker-records-v1', 'poker records']
  ]);
});
