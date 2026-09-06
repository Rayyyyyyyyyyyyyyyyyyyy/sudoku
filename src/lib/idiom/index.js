/**
 * 成語填字引擎的對外邊界。
 *
 * **這是唯一 import 真實語料 `src/data/idioms.js` 的模組。** 其餘模組都把
 * 索引當參數收，所以測試可以用固定的小語料，不依賴 build-time 產生的資料檔。
 */

import { IDIOMS, TIER_COUNT } from '../../data/idioms.js';
import { buildPlacementIndex } from './corpus.js';
import { IDIOM_DAILY_LEVEL, IDIOM_DIFFICULTY_LEVELS, idiomDifficulty } from './difficulty.js';
import { generateIdiomPuzzle } from './generate.js';
import { countIdiomSolutions, hasUniqueSolution } from './solve.js';

let cached = null;

/** 放置索引只建一次；語料是常數，索引也是。 */
export function idiomIndex() {
  if (!cached) cached = buildPlacementIndex(IDIOMS, TIER_COUNT);
  return cached;
}

export function generatePuzzle(level, seed) {
  return generateIdiomPuzzle({ seed, level, index: idiomIndex() });
}

/** 每日一題比照 `src/lib/sudoku.js` 的 `dailySeed`，以日期字串為 seed。 */
export function dailyIdiomSeed(dayKey) {
  return Number(String(dayKey).replace(/-/g, '')) >>> 0;
}

export { IDIOM_DAILY_LEVEL, IDIOM_DIFFICULTY_LEVELS, idiomDifficulty, countIdiomSolutions, hasUniqueSolution };
