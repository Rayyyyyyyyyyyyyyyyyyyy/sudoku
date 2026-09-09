/**
 * 由詞長出盤面：晶格生長、挖空、候選字池、唯一解修補。
 *
 * 全程用 `src/lib/seededRandom.js` 的可序列化 xorshift32，狀態顯式傳遞，
 * 模組內禁用 `Math.random()`（由 `test/idiomGenerate.test.js` 掃描原始碼驗證）。
 * 同一個 seed 與難度必然產出同一個盤面、同一組提示字與同一個候選字池。
 *
 * 流程：
 *   1. 由可用詞頻層選種子成語，橫向放在原點。
 *   2. 反覆挑一個已放置詞條的一格與偏移 0–3，查索引接上垂直方向的新詞條；
 *      連續失敗到門檻就退掉最後一條重來。整體有嘗試上限，接不到目標數就
 *      接受較小的盤面並記錄短缺。
 *   3. 裁切到外接矩形。
 *   4. 依難度挑提示字，其餘挖空。
 *   5. 以候選字池為值域驗唯一解；不唯一就多揭一格提示再驗，到上限仍不唯一
 *      就丟掉這個 seed 換下一個。
 *   6. 加入難度對應比例的干擾字，加完再驗一次唯一解。
 */

import { choose, randomInt, seedRandom, shuffle } from '../seededRandom.js';
import { MAX_DIMENSION, canAttach, latticeContext, normaliseBoard, perpendicular, runCellPositions } from './board.js';
import { IDIOM_LENGTH, eligibleCharacters, eligibleIdioms, idiomsAt } from './corpus.js';
import { idiomDifficulty } from './difficulty.js';
import { countIdiomSolutions, hasUniqueSolution } from './solve.js';

export const IDIOM_GENERATOR_VERSION = 'idiom-lattice-v1';
export const IDIOM_PUZZLE_SCHEMA_VERSION = 1;

export const GROWTH_LIMITS = {
  attemptBudget: 1200,
  stallLimit: 40,
  candidateScanLimit: 48
};

export const SEED_ATTEMPT_LIMIT = 12;

/** 由使用者 seed、難度與重試次數推出這一次生成用的 PRNG seed。 */
export function mixIdiomSeed(seed, level, attempt) {
  return ((seed >>> 0) ^ Math.imul(level + 1, 0x9e3779b9) ^ Math.imul(attempt + 1, 0x85ebca6b)) >>> 0;
}

/**
 * 晶格生長。回傳放置好的詞條、用掉的 PRNG 狀態與短缺資訊。
 * 有嘗試上限，永遠會結束。
 */
export function growLattice({ index, config, randomState, limits = GROWTH_LIMITS }) {
  const pool = eligibleIdioms(index, config.tiers);
  if (pool.length === 0) throw new Error(`No idioms available for tiers ${config.tiers.join(',')}`);

  const seedPick = choose(pool, randomState);
  let state = seedPick.state;
  let runs = [{ orientation: 'across', row: 0, col: 0, idiom: seedPick.item }];

  const eligible = new Set(pool);
  // 退掉最後一條之後不一定接得回來，所以記住看過的最大盤面，
  // 預算用完時回傳它而不是回傳當下這個可能更小的盤面。
  let best = runs;
  let attempts = 0;
  let backtracks = 0;
  let stall = 0;
  // 盤面沒變就沿用同一份佔用表與外接矩形，候選掃描才不會每個候選重建一次。
  let context = latticeContext(runs);

  while (runs.length < config.idiomCount && attempts < limits.attemptBudget) {
    attempts += 1;

    const anchorPick = randomInt(state, runs.length);
    state = anchorPick.state;
    const cellPick = randomInt(state, IDIOM_LENGTH);
    state = cellPick.state;
    const offsetPick = randomInt(state, IDIOM_LENGTH);
    state = offsetPick.state;

    const anchor = runs[anchorPick.value];
    const anchorCell = runCellPositions(anchor)[cellPick.value];
    const character = anchor.idiom[cellPick.value];
    const orientation = perpendicular(anchor.orientation);
    const offset = offsetPick.value;
    const origin = orientation === 'down'
      ? { row: anchorCell.row - offset, col: anchorCell.col }
      : { row: anchorCell.row, col: anchorCell.col - offset };

    const candidates = idiomsAt(index, character, offset).filter((surface) => eligible.has(surface) && !context.idioms.has(surface));

    let placed = null;
    if (candidates.length > 0) {
      const shuffled = shuffle(candidates, state);
      state = shuffled.state;
      const scan = shuffled.items.slice(0, limits.candidateScanLimit);
      for (const surface of scan) {
        const candidate = { orientation, row: origin.row, col: origin.col, idiom: surface };
        if (canAttach(runs, candidate, { maxDimension: MAX_DIMENSION, context })) {
          placed = candidate;
          break;
        }
      }
    }

    if (placed) {
      runs = [...runs, placed];
      context = latticeContext(runs);
      if (runs.length > best.length) best = runs;
      stall = 0;
      continue;
    }

    stall += 1;
    if (stall >= limits.stallLimit) {
      if (runs.length > 1) {
        runs = runs.slice(0, -1);
        context = latticeContext(runs);
        backtracks += 1;
      }
      stall = 0;
    }
  }

  return {
    runs: best,
    randomState: state,
    attempts,
    backtracks,
    shortfall: Math.max(0, config.idiomCount - best.length)
  };
}

function puzzleView(board, clueMask, pool) {
  return {
    runs: board.runs.map((run) => ({ cells: run.cells })),
    cellCount: board.cells.length,
    given: board.solution.map((character, cell) => (clueMask[cell] ? character : null)),
    pool
  };
}

function basePool(board, clueMask) {
  return board.solution.filter((_, cell) => !clueMask[cell]);
}

function blankCells(clueMask) {
  const output = [];
  clueMask.forEach((isClue, cell) => { if (!isClue) output.push(cell); });
  return output;
}

/** 依難度挑提示字；其餘格子挖空。至少留一格提示、至少留一格空白。 */
export function selectClues({ board, config, randomState }) {
  const total = board.cells.length;
  const wanted = Math.round(total * config.clueRatio);
  const clueCount = Math.min(total - 1, Math.max(1, wanted));
  const order = shuffle(board.cells.map((_, cell) => cell), randomState);
  const clueMask = new Array(total).fill(false);
  order.items.slice(0, clueCount).forEach((cell) => { clueMask[cell] = true; });
  return { clueMask, randomState: order.state };
}

/**
 * 唯一解修補：不唯一就在兩組解相異的格子中揭一格提示，再驗。
 * 到上限仍不唯一就回報失敗，由呼叫端丟棄這個 seed。
 */
export function repairUniqueness({ board, clueMask, index, config, randomState }) {
  let mask = clueMask.slice();
  let state = randomState;
  let reveals = 0;

  for (;;) {
    const result = countIdiomSolutions(puzzleView(board, mask, basePool(board, mask)), index, 2);
    if (result.count === 1) return { unique: true, clueMask: mask, reveals, randomState: state, reason: null };
    if (result.count === 0) return { unique: false, clueMask: mask, reveals, randomState: state, reason: 'unsolvable' };
    if (reveals >= config.repairRevealLimit) return { unique: false, clueMask: mask, reveals, randomState: state, reason: 'repair-limit' };

    const [first, second] = result.solutions;
    const differing = blankCells(mask).filter((cell) => first[cell] !== second[cell]);
    const targets = differing.length > 0 ? differing : blankCells(mask);
    if (targets.length === 0) return { unique: false, clueMask: mask, reveals, randomState: state, reason: 'nothing-to-reveal' };
    const picked = choose(targets, state);
    state = picked.state;
    mask = mask.slice();
    mask[picked.item] = true;
    reveals += 1;
  }
}

/**
 * 干擾字：取自同層詞頻、且不在盤面上出現過的字。
 * 先整組驗一次（多數情況直接通過），失敗才逐字加入並逐次驗證，
 * 任何會產生第二組解的字直接丟棄。
 */
export function addDecoys({ board, clueMask, pool, index, config, randomState }) {
  const target = Math.round(pool.length * config.decoyRatio);
  if (target <= 0) return { decoys: [], randomState, rejected: 0, verifications: 0 };

  const onBoard = new Set(board.solution);
  const candidates = eligibleCharacters(index, config.tiers).filter((character) => !onBoard.has(character));
  if (candidates.length === 0) return { decoys: [], randomState, rejected: 0, verifications: 0 };

  const shuffled = shuffle(candidates, randomState);
  const state = shuffled.state;
  const wanted = shuffled.items.slice(0, target);
  if (wanted.length === target && hasUniqueSolution(puzzleView(board, clueMask, [...pool, ...wanted]), index)) {
    return { decoys: wanted, randomState: state, rejected: 0, verifications: 1 };
  }

  const accepted = [];
  let rejected = 0;
  let verifications = 1;
  for (const character of shuffled.items) {
    if (accepted.length >= target) break;
    verifications += 1;
    if (hasUniqueSolution(puzzleView(board, clueMask, [...pool, ...accepted, character]), index)) accepted.push(character);
    else rejected += 1;
  }
  return { decoys: accepted, randomState: state, rejected, verifications };
}

function attemptPuzzle({ index, config, seed, level, attempt, acceptFloor, limits }) {
  const boardSeed = mixIdiomSeed(seed, level, attempt);
  const grown = growLattice({ index, config, randomState: seedRandom(boardSeed), limits });
  if (grown.runs.length < acceptFloor) return { puzzle: null, discardReason: 'shortfall', grown };

  const board = normaliseBoard(grown.runs);
  if (board.crossings < Math.min(config.minCrossings, acceptFloor - 1)) return { puzzle: null, discardReason: 'too-few-crossings', grown };

  const clues = selectClues({ board, config, randomState: grown.randomState });
  const repair = repairUniqueness({ board, clueMask: clues.clueMask, index, config, randomState: clues.randomState });
  if (!repair.unique) return { puzzle: null, discardReason: repair.reason, grown };

  const answerPool = basePool(board, repair.clueMask);
  const decoys = addDecoys({ board, clueMask: repair.clueMask, pool: answerPool, index, config, randomState: repair.randomState });
  const combined = [...answerPool, ...decoys.decoys];
  const finalCheck = countIdiomSolutions(puzzleView(board, repair.clueMask, combined), index, 2);
  if (finalCheck.count !== 1) return { puzzle: null, discardReason: 'decoy-ambiguity', grown };

  const displayPool = shuffle(combined, decoys.randomState);
  const clueCount = repair.clueMask.filter(Boolean).length;

  return {
    puzzle: {
      schemaVersion: IDIOM_PUZZLE_SCHEMA_VERSION,
      generator: IDIOM_GENERATOR_VERSION,
      seed: seed >>> 0,
      level,
      boardSeed,
      width: board.width,
      height: board.height,
      grid: board.grid,
      cells: board.cells,
      solution: board.solution,
      runs: board.runs,
      clues: repair.clueMask,
      pool: displayPool.items,
      stats: {
        idiomCount: board.runs.length,
        targetIdiomCount: config.idiomCount,
        shortfall: grown.shortfall,
        crossings: board.crossings,
        cellCount: board.cells.length,
        clueCount,
        clueRatio: clueCount / board.cells.length,
        targetClueRatio: config.clueRatio,
        blankCount: answerPool.length,
        decoyCount: decoys.decoys.length,
        decoysRejected: decoys.rejected,
        poolSize: displayPool.items.length,
        repairReveals: repair.reveals,
        growthAttempts: grown.attempts,
        growthBacktracks: grown.backtracks,
        seedAttempt: attempt
      }
    },
    discardReason: null,
    grown
  };
}

/**
 * 產生一個成語填字題。
 *
 * @param {{ seed: number, level: number, index: object, seedAttemptLimit?: number, limits?: object }} options
 * @returns {object} 可序列化的題目；`stats` 記錄短缺、修補次數與丟棄的 seed 數
 */
export function generateIdiomPuzzle({ seed, level, index, seedAttemptLimit = SEED_ATTEMPT_LIMIT, limits = GROWTH_LIMITS }) {
  if (!Number.isInteger(seed)) throw new Error('Idiom puzzle seed must be an integer');
  const config = idiomDifficulty(level);
  const discards = [];

  for (let attempt = 0; attempt < seedAttemptLimit; attempt += 1) {
    const last = attempt === seedAttemptLimit - 1;
    const acceptFloor = last ? 2 : config.minIdiomCount;
    const result = attemptPuzzle({ index, config, seed, level, attempt, acceptFloor, limits });
    if (result.puzzle) {
      return { ...result.puzzle, stats: { ...result.puzzle.stats, discardedSeeds: discards.length, discardReasons: discards } };
    }
    discards.push(result.discardReason);
  }

  throw new Error(`Could not generate a unique idiom puzzle for seed ${seed} at level ${level} (${discards.join(', ')})`);
}
