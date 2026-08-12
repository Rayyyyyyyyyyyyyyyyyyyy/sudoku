import { PUZZLES } from '../data/puzzles.js';

export const LEVELS = [
  { name: '入門', rating: '1.5–2.0', desc: 'SE 1.5–2.0 · 已高於基礎掃描題' },
  { name: '簡單', rating: '2.3–3.0', desc: 'SE 2.3–3.0 · 需要多步候選排除' },
  { name: '中等', rating: '3.2–4.4', desc: 'SE 3.2–4.4 · 進階技巧開始出現' },
  { name: '困難', rating: '4.5–6.6', desc: 'SE 4.5–6.6 · 複合邏輯推理' },
  { name: '專家', rating: '6.7+', desc: 'SE 6.7+ · 高強度邏輯題' }
];

// 每日題也由原本的中等提高為困難。
export const DAILY_LEVEL = 3;

/** mulberry32 — 同一個 seed 永遠選到同一題。 */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** v 能否合法填進格子 i（檢查同列、同行、同宮）。 */
export function ok(g, i, v) {
  const r = Math.floor(i / 9);
  const c = i % 9;
  const br = r - (r % 3);
  const bc = c - (c % 3);
  for (let k = 0; k < 9; k++) {
    if (g[r * 9 + k] === v || g[k * 9 + c] === v) return false;
    if (g[(br + Math.floor(k / 3)) * 9 + bc + (k % 3)] === v) return false;
  }
  return true;
}

function candidates(g, i) {
  const out = [];
  for (let v = 1; v <= 9; v++) if (ok(g, i, v)) out.push(v);
  return out;
}

/** 最少候選數優先，讓高難度題也能快速求出唯一解供完成判定。 */
function solve(g) {
  let idx = -1;
  let choices = null;
  for (let i = 0; i < 81; i++) {
    if (g[i]) continue;
    const next = candidates(g, i);
    if (!next.length) return false;
    if (!choices || next.length < choices.length) {
      idx = i;
      choices = next;
      if (next.length === 1) break;
    }
  }
  if (idx < 0) return true;
  for (const v of choices) {
    g[idx] = v;
    if (solve(g)) return true;
  }
  g[idx] = 0;
  return false;
}

/** 數解的個數，最多數到 limit；公開供題庫完整性測試使用。 */
export function countSolutions(g, limit = 2) {
  let idx = -1;
  let choices = null;
  for (let i = 0; i < 81; i++) {
    if (g[i]) continue;
    const next = candidates(g, i);
    if (!next.length) return 0;
    if (!choices || next.length < choices.length) {
      idx = i;
      choices = next;
      if (next.length === 1) break;
    }
  }
  if (idx < 0) return 1;

  let total = 0;
  for (const v of choices) {
    g[idx] = v;
    total += countSolutions(g, limit - total);
    g[idx] = 0;
    if (total >= limit) break;
  }
  return total;
}

/**
 * 從預先評級的離線題庫取題。
 * 題庫共 1,000 題，全部由 QQWing 保證唯一解、Sukaku Explainer 評級。
 */
export function generate(level, seed) {
  const pool = PUZZLES[level];
  if (!pool) throw new RangeError(`Unknown Sudoku level: ${level}`);

  const mixedSeed = (seed ^ Math.imul(level + 1, 0x9e3779b9)) >>> 0;
  const index = Math.floor(rng(mixedSeed)() * pool.length);
  const [digits, rating] = pool[index];
  const puzzle = Array.from(digits, Number);
  const solution = puzzle.slice();
  if (!solve(solution)) throw new Error(`Invalid puzzle at level ${level}, index ${index}`);
  return { puzzle, solution, rating };
}

export function randomSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

export function dailySeed(dayKey) {
  return Number(dayKey.replace(/-/g, ''));
}

/** 該格所在的列、行、宮的所有格子索引。 */
export function peersOf(i) {
  const r = Math.floor(i / 9);
  const c = i % 9;
  const br = r - (r % 3);
  const bc = c - (c % 3);
  const out = [];
  for (let k = 0; k < 9; k++) {
    out.push(r * 9 + k, k * 9 + c, (br + Math.floor(k / 3)) * 9 + bc + (k % 3));
  }
  return out;
}
