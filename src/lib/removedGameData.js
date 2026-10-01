const REMOVED_GAME_KEYS = [
  'sudoku-drill-idiom-active-v1',
  'sudoku-drill-idiom-records-v1',
  'sudoku-drill-rpg-v1'
];

export function clearRemovedGameData(storage) {
  let target = storage;
  if (target === undefined) {
    try {
      target = globalThis.localStorage;
    } catch {
      return;
    }
  }
  if (!target) return;
  for (const key of REMOVED_GAME_KEYS) {
    try {
      target.removeItem(key);
    } catch {
      // Storage may be unavailable; the remaining games still start normally.
    }
  }
}
