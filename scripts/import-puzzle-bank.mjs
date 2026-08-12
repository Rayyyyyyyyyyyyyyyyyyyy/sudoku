import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const inputDir = resolve(process.argv[2] || '/tmp');
const output = resolve(process.argv[3] || 'src/data/puzzles.js');
const sourceCommit = 'd8c8ebaee0c08c412cfba96af1923dfa61c83317';

function read(name) {
  return readFileSync(resolve(inputDir, `sudoku-${name}.txt`), 'utf8')
    .trim()
    .split('\n')
    .map((line) => {
      const [, puzzle, rawRating] = line.trim().split(/\s+/);
      return [puzzle, Number(rawRating)];
    });
}

const medium = read('medium');
const hard = read('hard');
const diabolical = read('diabolical');
const all = [...medium, ...hard, ...diabolical];

// The original bank starts at SE 1.2. We intentionally begin at 1.5 so every
// level in this app is a step harder than the basic scan-only bucket.
const ranges = [
  [1.5, 2.0],
  [2.3, 3.0],
  [3.2, 4.4],
  [4.5, 6.6],
  [6.7, Infinity]
];

const pools = ranges.map(([min, max]) =>
  all.filter(([, rating]) => rating >= min && rating <= max).slice(0, 200)
);

if (pools.some((pool) => pool.length !== 200)) {
  throw new Error(`Not enough source puzzles: ${pools.map((pool) => pool.length).join(', ')}`);
}

const header = `// Generated from grantm/sudoku-exchange-puzzle-bank (public domain).\n// Each entry is [81-digit puzzle, Sukaku Explainer rating].\n// Source commit: https://github.com/grantm/sudoku-exchange-puzzle-bank/tree/${sourceCommit}\n`;
writeFileSync(output, `${header}export const PUZZLES = ${JSON.stringify(pools)};\n`);

console.log(`Wrote ${pools.reduce((sum, pool) => sum + pool.length, 0)} puzzles to ${output}`);
