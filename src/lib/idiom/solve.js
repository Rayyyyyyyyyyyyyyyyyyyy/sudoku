/**
 * 盤面求解與唯一解計數。
 *
 * 值域是候選字池，不是整個字集：玩家只能把池裡的字放進空格，
 * 因此「解」的定義是「每個詞條都是語料中的成語，且所有空格用到的字
 * 都能從池中取出（含重複計數）」。這與 `src/lib/sudoku.js` 的
 * `countSolutions` 同一個思路——數到 limit 就提前結束。
 *
 * 求解器刻意不強制「同一盤不得有重複成語」。出題端保證盤面無重複，
 * 但玩家不知道這條規則，所以把重複解也算成解，唯一性因此更強。
 */

import { IDIOM_LENGTH, idiomsAt } from './corpus.js';

function poolCounts(pool) {
  const counts = new Map();
  pool.forEach((character) => counts.set(character, (counts.get(character) ?? 0) + 1));
  return counts;
}

/** 需求：這個成語填進該詞條時，各字還要從池中取幾個。 */
function demandOf(idiom, cells, filled) {
  const demand = new Map();
  for (let offset = 0; offset < IDIOM_LENGTH; offset += 1) {
    if (filled[cells[offset]] !== null) continue;
    const character = idiom[offset];
    demand.set(character, (demand.get(character) ?? 0) + 1);
  }
  return demand;
}

function fits(idiom, cells, filled, available) {
  const demand = new Map();
  for (let offset = 0; offset < IDIOM_LENGTH; offset += 1) {
    const current = filled[cells[offset]];
    const character = idiom[offset];
    if (current !== null) {
      if (current !== character) return false;
      continue;
    }
    const wanted = (demand.get(character) ?? 0) + 1;
    if ((available.get(character) ?? 0) < wanted) return false;
    demand.set(character, wanted);
  }
  return true;
}

/** 每個詞條的初始值域：先用已知的提示字查索引，全空的詞條退回全域可行表。 */
function baseDomains(puzzle, index, characterSet) {
  const feasible = () => index.idioms.filter((surface) => {
    for (const character of surface) if (!characterSet.has(character)) return false;
    return true;
  });
  let globalFeasible = null;

  return puzzle.runs.map((run) => {
    let seeded = null;
    for (let offset = 0; offset < IDIOM_LENGTH; offset += 1) {
      const given = puzzle.given[run.cells[offset]];
      if (given === null || given === undefined) continue;
      const bucket = idiomsAt(index, given, offset);
      if (seeded === null || bucket.length < seeded.length) seeded = bucket;
    }
    if (seeded === null) {
      if (globalFeasible === null) globalFeasible = feasible();
      seeded = globalFeasible;
    }
    return seeded.filter((surface) => {
      for (let offset = 0; offset < IDIOM_LENGTH; offset += 1) {
        const given = puzzle.given[run.cells[offset]];
        if (given !== null && given !== undefined) {
          if (surface[offset] !== given) return false;
        } else if (!characterSet.has(surface[offset])) return false;
      }
      return true;
    });
  });
}

/**
 * 數這個盤面在候選字池下的解數，最多數到 limit。
 *
 * @param {{ runs: Array<{cells: number[]}>, cellCount: number, given: Array<string|null>, pool: string[] }} puzzle
 * @param {object} index 放置索引
 * @param {number} [limit] 提前結束的解數上限
 * @returns {{ count: number, solutions: Array<Array<string>> }} solutions 最多留 limit 組，供修補時比對差異格
 */
export function countIdiomSolutions(puzzle, index, limit = 2) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('limit must be a positive integer');

  const filled = Array.from({ length: puzzle.cellCount }, (_, cell) => puzzle.given[cell] ?? null);
  const available = poolCounts(puzzle.pool);
  const characterSet = new Set(puzzle.pool);
  const domains = baseDomains(puzzle, index, characterSet);
  if (domains.some((domain) => domain.length === 0)) return { count: 0, solutions: [] };

  const assigned = new Array(puzzle.runs.length).fill(null);
  const solutions = [];
  let count = 0;

  const search = () => {
    let target = -1;
    let choices = null;
    for (let runId = 0; runId < puzzle.runs.length; runId += 1) {
      if (assigned[runId] !== null) continue;
      const cells = puzzle.runs[runId].cells;
      const live = domains[runId].filter((surface) => fits(surface, cells, filled, available));
      if (live.length === 0) return;
      if (choices === null || live.length < choices.length) {
        target = runId;
        choices = live;
        if (live.length === 1) break;
      }
    }
    if (target < 0) {
      count += 1;
      if (solutions.length < limit) solutions.push(filled.slice());
      return;
    }

    const cells = puzzle.runs[target].cells;
    for (const surface of choices) {
      const demand = demandOf(surface, cells, filled);
      const written = [];
      for (let offset = 0; offset < IDIOM_LENGTH; offset += 1) {
        if (filled[cells[offset]] !== null) continue;
        filled[cells[offset]] = surface[offset];
        written.push(cells[offset]);
      }
      demand.forEach((needed, character) => available.set(character, available.get(character) - needed));
      assigned[target] = surface;

      search();

      assigned[target] = null;
      demand.forEach((needed, character) => available.set(character, available.get(character) + needed));
      written.forEach((cell) => { filled[cell] = null; });
      if (count >= limit) return;
    }
  };

  search();
  return { count, solutions };
}

export function hasUniqueSolution(puzzle, index) {
  return countIdiomSolutions(puzzle, index, 2).count === 1;
}
