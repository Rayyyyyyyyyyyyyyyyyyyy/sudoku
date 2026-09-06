/**
 * 五級難度表，純資料，與控制流程分開。
 *
 * 生成端只讀這張表，不在流程裡寫死任何數字，調難度就是改這裡。
 * 不變式（由 `test/idiomDifficulty.test.js` 驗證）：
 *   - 詞條數（idiomCount）隨等級遞增（非遞減）
 *   - 提示字比例（clueRatio）隨等級遞減（非遞增）
 *   - 干擾字比例（decoyRatio）非遞減、可用詞頻層非縮小
 *
 * `minIdiomCount` / `minCrossings` 是「短缺仍可出題」的下限：生成在
 * 預算內接不到目標詞條數時，接受較小的盤面並記錄短缺，而不是無限重試。
 *
 * `clueRatioBand` 是唯一性修補後仍必須落在的提示密度區間。修補靠「多揭
 * 一格提示」達成唯一解，會把難度往下拉，這個區間就是可容忍的拉扯範圍；
 * `repairRevealLimit` 依此推導（見 `test/idiomSolve.test.js` 的量測）。
 */

export const IDIOM_TIER_COUNT = 5;

export const IDIOM_DIFFICULTY_LEVELS = [
  {
    level: 0,
    name: '入門',
    desc: '4 條最常用成語，一半以上是提示字',
    idiomCount: 4,
    minIdiomCount: 3,
    minCrossings: 2,
    clueRatio: 0.5,
    clueRatioBand: { min: 0.4, max: 0.72 },
    decoyRatio: 0,
    tiers: [0],
    repairRevealLimit: 3
  },
  {
    level: 1,
    name: '簡單',
    desc: '6 條常用成語，開始出現干擾字',
    idiomCount: 6,
    minIdiomCount: 4,
    minCrossings: 3,
    clueRatio: 0.42,
    clueRatioBand: { min: 0.32, max: 0.66 },
    decoyRatio: 0.15,
    tiers: [0, 1],
    repairRevealLimit: 4
  },
  {
    level: 2,
    name: '中等',
    desc: '8 條成語，提示字降到三成',
    idiomCount: 8,
    minIdiomCount: 5,
    minCrossings: 4,
    clueRatio: 0.34,
    clueRatioBand: { min: 0.24, max: 0.6 },
    decoyRatio: 0.25,
    tiers: [0, 1, 2],
    repairRevealLimit: 5
  },
  {
    level: 3,
    name: '困難',
    desc: '9 條成語，含次常用詞條與四成干擾字',
    idiomCount: 9,
    minIdiomCount: 6,
    minCrossings: 5,
    clueRatio: 0.26,
    clueRatioBand: { min: 0.16, max: 0.54 },
    decoyRatio: 0.4,
    tiers: [0, 1, 2, 3],
    repairRevealLimit: 6
  },
  {
    level: 4,
    name: '專家',
    desc: '10 條成語，含冷僻詞條與五成干擾字',
    idiomCount: 10,
    minIdiomCount: 7,
    minCrossings: 6,
    clueRatio: 0.18,
    clueRatioBand: { min: 0.12, max: 0.5 },
    decoyRatio: 0.5,
    tiers: [0, 1, 2, 3, 4],
    repairRevealLimit: 7
  }
];

export const IDIOM_DAILY_LEVEL = 2;

export function idiomDifficulty(level) {
  const config = IDIOM_DIFFICULTY_LEVELS[level];
  if (!config) throw new RangeError(`Unknown idiom difficulty level: ${level}`);
  return config;
}

/**
 * 難度表的單調性檢查。回傳違規清單，空陣列代表通過。
 * 公開給測試使用，也讓調表的人可以在 REPL 直接驗。
 */
export function difficultyTableViolations(levels = IDIOM_DIFFICULTY_LEVELS) {
  const violations = [];
  levels.forEach((config, position) => {
    if (config.level !== position) violations.push(`level ${position} is labelled ${config.level}`);
    if (config.minIdiomCount > config.idiomCount) violations.push(`level ${position} floor exceeds target`);
    if (config.minCrossings > config.minIdiomCount - 1) violations.push(`level ${position} needs more crossings than a tree of ${config.minIdiomCount} runs can provide`);
    if (config.clueRatio < config.clueRatioBand.min || config.clueRatio > config.clueRatioBand.max) violations.push(`level ${position} clue ratio sits outside its own band`);
    if (position === 0) return;
    const previous = levels[position - 1];
    if (config.idiomCount < previous.idiomCount) violations.push(`level ${position} idiom count decreases`);
    if (config.clueRatio > previous.clueRatio) violations.push(`level ${position} clue proportion increases`);
    if (config.decoyRatio < previous.decoyRatio) violations.push(`level ${position} decoy proportion decreases`);
    if (!previous.tiers.every((tier) => config.tiers.includes(tier))) violations.push(`level ${position} drops a frequency tier`);
  });
  return violations;
}
