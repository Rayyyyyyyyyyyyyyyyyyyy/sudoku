import assert from 'node:assert/strict';
import test from 'node:test';
import { normaliseBoard } from '../src/lib/idiom/board.js';
import { buildPlacementIndex } from '../src/lib/idiom/corpus.js';
import { IDIOM_DIFFICULTY_LEVELS, idiomDifficulty } from '../src/lib/idiom/difficulty.js';
import { addDecoys, generateIdiomPuzzle, growLattice, repairUniqueness, selectClues } from '../src/lib/idiom/generate.js';
import { countIdiomSolutions, hasUniqueSolution } from '../src/lib/idiom/solve.js';
import { seedRandom } from '../src/lib/poker/random.js';

// 與 idiomGenerate.test.js 相同的手寫語料，測試不依賴 build-time 產生的資料檔。
const FIXTURE = [
  ['一心一意', 0], ['一舉兩得', 0], ['一鳴驚人', 1], ['一日千里', 1], ['一石二鳥', 2],
  ['心心相印', 1], ['心口如一', 2], ['三心二意', 0], ['天長地久', 0], ['天下無雙', 1],
  ['春暖花開', 0], ['花好月圓', 0], ['明月清風', 2], ['風和日麗', 1], ['風吹草動', 2],
  ['水到渠成', 1], ['山明水秀', 1], ['山窮水盡', 2], ['人山人海', 0], ['人心不古', 3],
  ['大顯身手', 1], ['大同小異', 1], ['小題大作', 2], ['井底之蛙', 1], ['畫龍點睛', 0],
  ['守株待兔', 1], ['亡羊補牢', 2], ['對牛彈琴', 2], ['塞翁失馬', 2], ['杯弓蛇影', 3],
  ['開門見山', 1], ['見義勇為', 2], ['千里迢迢', 2], ['日新月異', 1], ['月下老人', 2],
  ['老馬識途', 2], ['馬到成功', 0], ['成人之美', 3], ['得心應手', 1], ['手忙腳亂', 1],
  ['異口同聲', 1], ['同心協力', 0], ['力不從心', 1], ['不同凡響', 2], ['古今中外', 2],
  ['外柔內剛', 3], ['美中不足', 1], ['足智多謀', 2], ['多才多藝', 1], ['藝不壓身', 4],
  ['身體力行', 2], ['行雲流水', 1], ['水落石出', 0], ['出人意料', 2], ['料事如神', 2],
  ['神來之筆', 2], ['筆下生花', 3], ['生龍活虎', 0], ['虎頭蛇尾', 1], ['尾大不掉', 4]
];

const index = buildPlacementIndex(FIXTURE, 5);

// 真實語料由另一條工作線的 build-time script 產生。還沒出現時，
// 依賴它的測試乾淨地跳過，其餘測試照跑。
let realCorpus = null;
try {
  realCorpus = await import('../src/data/idioms.js');
} catch {
  realCorpus = null;
}
const realIndex = realCorpus ? buildPlacementIndex(realCorpus.IDIOMS, realCorpus.TIER_COUNT) : null;
const skipReal = realIndex ? false : 'src/data/idioms.js has not been generated yet';

/** 求解器只看得到詞條、提示字與候選字池，看不到答案。 */
function view(puzzle) {
  return {
    runs: puzzle.runs.map((run) => ({ cells: run.cells })),
    cellCount: puzzle.cells.length,
    given: puzzle.solution.map((character, cell) => (puzzle.clues[cell] ? character : null)),
    pool: puzzle.pool
  };
}

test('the solver treats the candidate pool as the value domain', () => {
  const single = { runs: [{ cells: [0, 1, 2, 3] }], cellCount: 4, given: [null, null, null, null], pool: ['一', '心', '一', '意'] };
  const solved = countIdiomSolutions(single, index, 2);
  assert.equal(solved.count, 1);
  assert.deepEqual(solved.solutions[0], ['一', '心', '一', '意']);

  // 池裡少一個「一」就填不出這條成語。
  assert.equal(countIdiomSolutions({ ...single, pool: ['一', '心', '意'] }, index, 2).count, 0);
  // 提示字先鎖住位置，池只補剩下的空格。
  assert.equal(countIdiomSolutions({ ...single, given: ['一', null, '一', null], pool: ['心', '意'] }, index, 2).count, 1);
  // 提示字與語料矛盾時無解。
  assert.equal(countIdiomSolutions({ ...single, given: ['龘', null, null, null], pool: ['心', '意', '一'] }, index, 2).count, 0);
});

test('solution counting stops early at the second solution', () => {
  // 這個池同時填得出 一心一意、三心二意、心口如一。
  const ambiguous = {
    runs: [{ cells: [0, 1, 2, 3] }],
    cellCount: 4,
    given: [null, null, null, null],
    pool: ['一', '一', '一', '心', '意', '三', '二', '口', '如']
  };
  assert.equal(countIdiomSolutions(ambiguous, index, 2).count, 2, 'early exit reports exactly the limit');
  assert.equal(countIdiomSolutions(ambiguous, index, 2).solutions.length, 2, 'both solutions are kept for repair');
  assert.equal(countIdiomSolutions(ambiguous, index, 9).count, 3, 'a higher limit finds all of them');
  assert.equal(hasUniqueSolution(ambiguous, index), false);
  assert.throws(() => countIdiomSolutions(ambiguous, index, 0), /positive integer/);
});

test('the solver reasons across a crossing, not one run at a time', () => {
  const board = normaliseBoard([
    { orientation: 'across', row: 0, col: 0, idiom: '一心一意' },
    { orientation: 'down', row: -1, col: 1, idiom: '三心二意' }
  ]);
  const clues = board.solution.map(() => false);
  const pool = board.solution.slice();
  const counted = countIdiomSolutions(
    { runs: board.runs.map((run) => ({ cells: run.cells })), cellCount: board.cells.length, given: clues.map(() => null), pool },
    index,
    2
  );
  assert.ok(counted.count >= 1);
  counted.solutions.forEach((solution) => {
    board.runs.forEach((run) => {
      const word = run.cells.map((cell) => solution[cell]).join('');
      assert.ok(index.tierOf.has(word), `${word} is not an idiom`);
    });
    // 共用格只消耗一個池中的字。
    assert.equal(solution.filter((character) => character !== null).length, board.cells.length);
  });
});

test('uniqueness repair reveals a discriminating cell and re-verifies', () => {
  const loose = { ...idiomDifficulty(2), clueRatio: 0.05, repairRevealLimit: 24 };
  let repaired = 0;
  let reveals = 0;

  for (let seed = 1; seed <= 30; seed += 1) {
    const grown = growLattice({ index, config: loose, randomState: seedRandom(seed) });
    const board = normaliseBoard(grown.runs);
    const clues = selectClues({ board, config: loose, randomState: grown.randomState });
    const before = countIdiomSolutions(
      { runs: board.runs.map((run) => ({ cells: run.cells })), cellCount: board.cells.length, given: board.solution.map((c, i) => (clues.clueMask[i] ? c : null)), pool: board.solution.filter((_, i) => !clues.clueMask[i]) },
      index,
      2
    );
    const repair = repairUniqueness({ board, clueMask: clues.clueMask, index, config: loose, randomState: clues.randomState });
    assert.ok(repair.unique, `seed ${seed} could not be repaired within ${loose.repairRevealLimit} reveals`);
    assert.equal(repair.clueMask.filter(Boolean).length, clues.clueMask.filter(Boolean).length + repair.reveals);
    // 修補只會加提示，不會拿掉原本的提示。
    clues.clueMask.forEach((isClue, cell) => { if (isClue) assert.ok(repair.clueMask[cell]); });

    if (before.count > 1) {
      repaired += 1;
      reveals += repair.reveals;
      assert.ok(repair.reveals > 0, `seed ${seed} was ambiguous but revealed nothing`);
    } else {
      assert.equal(repair.reveals, 0, `seed ${seed} was already unique but still revealed`);
    }
  }

  assert.ok(repaired > 0, 'the sparse-clue configuration should have produced ambiguous boards');
  assert.ok(reveals > 0);
});

test('a puzzle that cannot be repaired within the limit is discarded, not shipped', () => {
  const strict = { ...idiomDifficulty(2), clueRatio: 0.05, repairRevealLimit: 0 };
  let hitTheLimit = 0;

  for (let seed = 1; seed <= 30; seed += 1) {
    const grown = growLattice({ index, config: strict, randomState: seedRandom(seed) });
    const board = normaliseBoard(grown.runs);
    const clues = selectClues({ board, config: strict, randomState: grown.randomState });
    const repair = repairUniqueness({ board, clueMask: clues.clueMask, index, config: strict, randomState: clues.randomState });
    if (repair.unique) continue;
    hitTheLimit += 1;
    assert.equal(repair.reason, 'repair-limit');
    assert.equal(repair.reveals, 0);
  }
  assert.ok(hitTheLimit > 0, 'a zero repair budget should reject some boards');

  // 生成端遇到丟棄就換下一個 seed；連 seed 都用完時寧可失敗也不出不唯一的題。
  const single = buildPlacementIndex([['一心一意', 0]], 1);
  assert.throws(
    () => generateIdiomPuzzle({ seed: 1, level: 0, index: single, seedAttemptLimit: 4 }),
    /Could not generate a unique idiom puzzle/
  );

  // 短缺的 seed 會被丟掉並記錄，最後一次才接受較小的盤面。
  const tiny = buildPlacementIndex([['一心一意', 0], ['三心二意', 0]], 1);
  const salvaged = generateIdiomPuzzle({ seed: 5, level: 3, index: tiny, seedAttemptLimit: 4 });
  assert.equal(salvaged.stats.discardedSeeds, 3);
  assert.deepEqual(salvaged.stats.discardReasons, ['shortfall', 'shortfall', 'shortfall']);
  assert.equal(salvaged.stats.idiomCount, 2);
});

test('decoys are rejected when they introduce a second solution', () => {
  const config = idiomDifficulty(3);
  const grown = growLattice({ index, config, randomState: seedRandom(11) });
  const board = normaliseBoard(grown.runs);
  const clues = selectClues({ board, config, randomState: grown.randomState });
  const repair = repairUniqueness({ board, clueMask: clues.clueMask, index, config, randomState: clues.randomState });
  assert.ok(repair.unique);

  const pool = board.solution.filter((_, cell) => !repair.clueMask[cell]);
  const decoys = addDecoys({ board, clueMask: repair.clueMask, pool, index, config, randomState: repair.randomState });
  assert.ok(decoys.decoys.length <= Math.round(pool.length * config.decoyRatio));
  assert.ok(decoys.verifications >= 1, 'adding decoys always re-runs verification');

  const onBoard = new Set(board.solution);
  decoys.decoys.forEach((character) => assert.equal(onBoard.has(character), false));
  assert.equal(
    countIdiomSolutions(
      { runs: board.runs.map((run) => ({ cells: run.cells })), cellCount: board.cells.length, given: board.solution.map((c, i) => (repair.clueMask[i] ? c : null)), pool: [...pool, ...decoys.decoys] },
      index,
      2
    ).count,
    1
  );

  // 零干擾字的難度不做任何額外驗證。
  const none = addDecoys({ board, clueMask: repair.clueMask, pool, index, config: { ...config, decoyRatio: 0 }, randomState: repair.randomState });
  assert.deepEqual(none.decoys, []);
  assert.equal(none.verifications, 0);
});

test('every generated puzzle has exactly one solution across seeds and levels', (t) => {
  const report = [];

  for (const config of IDIOM_DIFFICULTY_LEVELS) {
    let repaired = 0;
    let reveals = 0;
    let discarded = 0;
    let outOfBand = 0;
    const started = performance.now();

    for (let seed = 1; seed <= 40; seed += 1) {
      const puzzle = generateIdiomPuzzle({ seed, level: config.level, index });
      assert.equal(countIdiomSolutions(view(puzzle), index, 2).count, 1, `level ${config.level} seed ${seed} is not unique`);
      // 真解本身一定是解，求解器不能把它排除掉。
      const solution = countIdiomSolutions(view(puzzle), index, 1).solutions[0];
      assert.deepEqual(solution, puzzle.solution);

      if (puzzle.stats.repairReveals > 0) repaired += 1;
      reveals += puzzle.stats.repairReveals;
      discarded += puzzle.stats.discardedSeeds;
      const ratio = puzzle.stats.clueRatio;
      if (ratio < config.clueRatioBand.min || ratio > config.clueRatioBand.max) outOfBand += 1;
    }

    const elapsed = performance.now() - started;
    assert.equal(outOfBand, 0, `level ${config.level} pushed clue density outside its band ${outOfBand} times`);
    report.push(`L${config.level} ${(elapsed / 40).toFixed(1)} ms/puzzle · repaired ${repaired}/40 · reveals ${reveals} · discarded seeds ${discarded}`);
  }

  report.forEach((line) => t.diagnostic(`fixture sweep ${line}`));
});

test('every generated puzzle has exactly one solution against the shipped corpus', { skip: skipReal }, (t) => {
  for (const config of IDIOM_DIFFICULTY_LEVELS) {
    let repaired = 0;
    let reveals = 0;
    let discarded = 0;
    let outOfBand = 0;
    let shortfall = 0;
    const started = performance.now();

    for (let seed = 1; seed <= 25; seed += 1) {
      const puzzle = generateIdiomPuzzle({ seed, level: config.level, index: realIndex });
      assert.equal(countIdiomSolutions(view(puzzle), realIndex, 2).count, 1, `level ${config.level} seed ${seed} is not unique`);
      if (puzzle.stats.repairReveals > 0) repaired += 1;
      reveals += puzzle.stats.repairReveals;
      discarded += puzzle.stats.discardedSeeds;
      shortfall += puzzle.stats.shortfall;
      const ratio = puzzle.stats.clueRatio;
      if (ratio < config.clueRatioBand.min || ratio > config.clueRatioBand.max) outOfBand += 1;
    }

    const elapsed = performance.now() - started;
    assert.equal(outOfBand, 0, `level ${config.level} pushed clue density outside its band ${outOfBand} times`);
    t.diagnostic(`corpus sweep L${config.level} ${(elapsed / 25).toFixed(1)} ms/puzzle · repaired ${repaired}/25 · reveals ${reveals} · discarded seeds ${discarded} · shortfall ${shortfall}`);
  }
});
