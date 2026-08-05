export const LEVELS = [
  { name: '入門', holes: 36, desc: '36 個空格 · 一眼就能填' },
  { name: '簡單', holes: 42, desc: '42 個空格 · 靠單一候選數推進' },
  { name: '中等', holes: 47, desc: '47 個空格 · 需要一點註記' },
  { name: '困難', holes: 52, desc: '52 個空格 · 全盤都得註記' },
  { name: '專家', holes: 56, desc: '56 個空格 · 慢慢來' }
];

export const DAILY_LEVEL = 2;

/** mulberry32 — 同一個 seed 永遠得到同一題。 */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** v 能否合法填進格子 i(檢查同列、同行、同宮)。 */
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

function fill(g, pos, rand) {
  if (pos === 81) return true;
  const cand = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = 8; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = cand[i];
    cand[i] = cand[j];
    cand[j] = t;
  }
  for (const v of cand) {
    if (ok(g, pos, v)) {
      g[pos] = v;
      if (fill(g, pos + 1, rand)) return true;
      g[pos] = 0;
    }
  }
  return false;
}

/** 數解的個數,最多數到 limit 就提前收手。 */
function countSolutions(g, limit) {
  let idx = -1;
  for (let i = 0; i < 81; i++) {
    if (!g[i]) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return 1;
  let n = 0;
  for (let v = 1; v <= 9; v++) {
    if (ok(g, idx, v)) {
      g[idx] = v;
      n += countSolutions(g, limit - n);
      g[idx] = 0;
      if (n >= limit) break;
    }
  }
  return n;
}

/** 挖空後仍保證唯一解;回傳 { puzzle, solution }。 */
export function generate(level, seed) {
  const rand = rng(seed);
  const solution = new Array(81).fill(0);
  fill(solution, 0, rand);

  const puzzle = solution.slice();
  const order = Array.from({ length: 81 }, (_, i) => i);
  for (let i = 80; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = order[i];
    order[i] = order[j];
    order[j] = t;
  }

  let holes = 0;
  const target = LEVELS[level].holes;
  for (const p of order) {
    if (holes >= target) break;
    const keep = puzzle[p];
    puzzle[p] = 0;
    if (countSolutions(puzzle.slice(), 2) === 1) holes++;
    else puzzle[p] = keep;
  }
  return { puzzle, solution };
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
