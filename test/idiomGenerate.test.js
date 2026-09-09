import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { attachmentRejection, boundingBox, canAttach, latticeOccupancy, maximalStringsValid, normaliseBoard, runCellPositions } from '../src/lib/idiom/board.js';
import { buildPlacementIndex, eligibleCharacters, eligibleIdioms, idiomsAt } from '../src/lib/idiom/corpus.js';
import { IDIOM_DIFFICULTY_LEVELS, idiomDifficulty } from '../src/lib/idiom/difficulty.js';
import { GROWTH_LIMITS, generateIdiomPuzzle, growLattice, mixIdiomSeed, selectClues } from '../src/lib/idiom/generate.js';
import { seedRandom } from '../src/lib/seededRandom.js';

// 固定的小語料。引擎的所有測試都跑在這份手寫語料上，不依賴 build-time
// 產生的 `src/data/idioms.js`，那份檔案由另一條工作線產出。
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
const across = (idiom, row, col) => ({ orientation: 'across', row, col, idiom });
const down = (idiom, row, col) => ({ orientation: 'down', row, col, idiom });

test('the placement index maps every character and offset back to its idioms', () => {
  assert.equal(index.size, FIXTURE.length);
  assert.equal(index.tierCount, 5);

  let bucketed = 0;
  index.byOffset.forEach((buckets) => buckets.forEach((idioms) => { bucketed += idioms.length; }));
  assert.equal(bucketed, FIXTURE.length * 4, 'every idiom is indexed once per offset');

  FIXTURE.forEach(([surface]) => {
    for (let offset = 0; offset < 4; offset += 1) {
      assert.ok(idiomsAt(index, surface[offset], offset).includes(surface), `${surface} missing at offset ${offset}`);
    }
  });

  assert.deepEqual(idiomsAt(index, '心', 1).slice(0, 3), ['一心一意', '心心相印', '三心二意']);
  assert.deepEqual(idiomsAt(index, '心', 9), []);
  assert.deepEqual(idiomsAt(index, '龘', 0), []);

  // 詞頻層過濾只縮小候選，不會引入語料外的條目。
  const tierZero = eligibleIdioms(index, [0]);
  assert.ok(tierZero.length > 0);
  assert.ok(tierZero.every((surface) => index.tierOf.get(surface) === 0));
  assert.ok(eligibleIdioms(index, [0, 1, 2, 3, 4]).length === FIXTURE.length);
  assert.ok(eligibleCharacters(index, [0]).every((character) => tierZero.some((surface) => surface.includes(character))));
});

test('a run is attached only by sharing exactly one cell with a perpendicular run', () => {
  const board = [across('一心一意', 0, 0)];

  // 共用一格、且該格的字在橫豎兩個成語中相同。
  const crossing = down('三心二意', -1, 1);
  assert.equal(attachmentRejection(board, crossing), null);
  const shared = runCellPositions(crossing).filter((position) => {
    const cells = latticeOccupancy(board);
    return cells.has(`${position.row},${position.col}`);
  });
  assert.equal(shared.length, 1);
  assert.equal(shared[0].row, 0);
  assert.equal(shared[0].col, 1);

  // 該格的字不一致就不能放。
  assert.equal(attachmentRejection(board, down('一鳴驚人', 0, 1)), 'character-conflict');
  // 完全不接觸的詞條不算接上。
  assert.equal(attachmentRejection(board, down('天長地久', 5, 5)), 'not-attached');
  // 第一條詞條反過來：盤面空的時候不得共用任何格。
  assert.equal(attachmentRejection([], across('一心一意', 0, 0)), null);

  // 同時穿過兩條平行詞條會共用兩格，也要拒絕。
  const twoRows = [across('身體力行', 0, -3), across('水落石出', 3, 0)];
  assert.equal(attachmentRejection(twoRows, down('行雲流水', 0, 0)), 'multiple-crossings');
});

test('duplicate idioms are never placed twice on one board', () => {
  const board = [across('一心一意', 0, 0)];
  assert.equal(attachmentRejection(board, down('一心一意', 0, 0)), 'duplicate-idiom');

  for (let seed = 1; seed <= 40; seed += 1) {
    const grown = growLattice({ index, config: idiomDifficulty(2), randomState: seedRandom(seed) });
    const surfaces = grown.runs.map((run) => run.idiom);
    assert.equal(new Set(surfaces).size, surfaces.length, `seed ${seed} placed a duplicate idiom`);
  }
});

test('parallel runs are rejected unless an empty cell separates them', () => {
  const board = [across('一心一意', 0, 0), down('一日千里', 0, 0)];
  assert.ok(maximalStringsValid(board));

  // 直接貼在上一條橫向詞條下方：欄 1–3 會產生沒有宣告過的縱向兩字串。
  assert.equal(attachmentRejection(board, across('日新月異', 1, 0)), 'adjacent-parallel');
  // 隔一列就合法。
  assert.equal(attachmentRejection(board, across('千里迢迢', 2, 0)), null);
  // 共線相接（同一列緊鄰）同樣被最大字串不變式擋下。
  assert.equal(maximalStringsValid([across('一心一意', 0, 0), across('三心二意', 0, 4)]), false);

  for (let seed = 1; seed <= 40; seed += 1) {
    const grown = growLattice({ index, config: idiomDifficulty(3), randomState: seedRandom(seed) });
    assert.ok(maximalStringsValid(grown.runs), `seed ${seed} produced an undeclared adjacent string`);
  }
});

test('placements that would grow the board past nine cells are rejected', () => {
  const board = [across('一心一意', 0, 0)];
  assert.equal(attachmentRejection(board, down('一日千里', 0, 0), { maxDimension: 4 }), null);
  assert.equal(attachmentRejection(board, down('一日千里', 0, 0), { maxDimension: 3 }), 'oversized');

  for (const config of IDIOM_DIFFICULTY_LEVELS) {
    for (let seed = 1; seed <= 12; seed += 1) {
      const puzzle = generateIdiomPuzzle({ seed, level: config.level, index });
      assert.ok(puzzle.width <= 9 && puzzle.height <= 9, `level ${config.level} seed ${seed} is ${puzzle.width}x${puzzle.height}`);
    }
  }
});

test('the board is cropped to the bounding box of its occupied cells', () => {
  const runs = [across('一心一意', 3, -2), down('三心二意', 2, -1)];
  const box = boundingBox(runs);
  assert.deepEqual({ height: box.height, width: box.width }, { height: 4, width: 4 });

  const board = normaliseBoard(runs);
  assert.deepEqual({ width: board.width, height: board.height }, { width: 4, height: 4 });
  assert.equal(board.grid.length, 16);
  assert.equal(board.cells.length, 7, '4 + 4 cells sharing one crossing');
  assert.equal(board.crossings, 1);
  assert.ok(board.cells.every((cell) => cell.row >= 0 && cell.col >= 0 && cell.row < 4 && cell.col < 4));
  assert.ok(board.cells.some((cell) => cell.row === 0) && board.cells.some((cell) => cell.col === 0));

  board.runs.forEach((run) => {
    assert.equal(run.cells.length, 4);
    run.cells.forEach((cell, offset) => {
      assert.ok(cell >= 0);
      assert.equal(board.solution[cell], run.idiom[offset]);
    });
  });

  // 每個 cell index 都能經由 grid 找回同一格。
  board.cells.forEach((cell, position) => assert.equal(board.grid[cell.row * board.width + cell.col], position));
});

test('growth is bounded and records a shortfall instead of looping', () => {
  // 這份語料只共用「心」與「意」，長不到四條詞條。
  const tiny = buildPlacementIndex([['一心一意', 0], ['三心二意', 0]], 1);
  const grown = growLattice({ index: tiny, config: idiomDifficulty(0), randomState: seedRandom(7) });
  assert.equal(grown.runs.length, 2);
  assert.equal(grown.shortfall, idiomDifficulty(0).idiomCount - 2);
  assert.ok(grown.attempts <= GROWTH_LIMITS.attemptBudget);

  const puzzle = generateIdiomPuzzle({ seed: 7, level: 0, index: tiny, seedAttemptLimit: 3 });
  assert.equal(puzzle.stats.idiomCount, 2);
  assert.equal(puzzle.stats.shortfall, 2);
  assert.equal(puzzle.stats.targetIdiomCount, 4);
  assert.equal(puzzle.stats.crossings, 1);
});

test('the same seed and level reproduce the board, clues, and pool exactly', () => {
  for (const config of IDIOM_DIFFICULTY_LEVELS) {
    const first = generateIdiomPuzzle({ seed: 20260906, level: config.level, index });
    const second = generateIdiomPuzzle({ seed: 20260906, level: config.level, index });
    assert.deepEqual(first, second, `level ${config.level} is not deterministic`);
  }

  const a = generateIdiomPuzzle({ seed: 41, level: 2, index });
  const b = generateIdiomPuzzle({ seed: 42, level: 2, index });
  assert.notDeepEqual(a.solution, b.solution, 'different seeds should not collapse to one board');

  // seed 混合本身也是純函式，且會把難度分開。
  assert.equal(mixIdiomSeed(5, 1, 0), mixIdiomSeed(5, 1, 0));
  assert.notEqual(mixIdiomSeed(5, 1, 0), mixIdiomSeed(5, 2, 0));
  assert.notEqual(mixIdiomSeed(5, 1, 0), mixIdiomSeed(5, 1, 1));

  // PRNG 狀態顯式傳遞：同一個狀態餵進去必得同一組提示字。
  const board = normaliseBoard(growLattice({ index, config: idiomDifficulty(1), randomState: seedRandom(3) }).runs);
  const clues = selectClues({ board, config: idiomDifficulty(1), randomState: seedRandom(99) });
  assert.deepEqual(clues.clueMask, selectClues({ board, config: idiomDifficulty(1), randomState: seedRandom(99) }).clueMask);
});

test('the engine never reaches for Math.random', () => {
  // 生成必須是純的：同 seed 同盤。存檔與 React 綁定本來就要讀時鐘（計時、
  // 連續天數），所以分開列。每個檔案都必須被歸類，新增模組不會靜悄悄逃掉檢查。
  const PURE = ['board.js', 'corpus.js', 'difficulty.js', 'generate.js', 'index.js', 'play.js', 'solve.js'];
  const CLOCK_ALLOWED = ['persistence.js', 'useIdiomGame.js'];

  const directory = fileURLToPath(new URL('../src/lib/idiom/', import.meta.url));
  const files = readdirSync(directory).filter((name) => name.endsWith('.js'));
  assert.ok(files.length >= 5, 'expected the engine modules to be present');
  assert.deepEqual(
    files.filter((name) => !PURE.includes(name) && !CLOCK_ALLOWED.includes(name)),
    [],
    'a new module under src/lib/idiom/ must be classified as pure or clock-allowed'
  );

  files.forEach((name) => {
    // 註解裡會提到這條禁令本身，先把註解剝掉再掃描實際程式碼。
    const code = readFileSync(path.join(directory, name), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    // Math.random 對每個模組都是禁令，包含存檔與 hook。
    assert.equal(/Math\s*\.\s*random/.test(code), false, `${name} calls Math.random`);
    if (PURE.includes(name)) {
      assert.equal(/\bDate\s*\.\s*now\s*\(/.test(code), false, `${name} reads the clock during generation`);
      assert.equal(/\bnew\s+Date\s*\(/.test(code), false, `${name} constructs a Date during generation`);
    }
  });
});

test('clue selection keeps the pre-filled proportion inside the level band', () => {
  for (const config of IDIOM_DIFFICULTY_LEVELS) {
    for (let seed = 1; seed <= 20; seed += 1) {
      const puzzle = generateIdiomPuzzle({ seed, level: config.level, index });
      const clueCount = puzzle.clues.filter(Boolean).length;
      assert.equal(clueCount, puzzle.stats.clueCount);
      assert.ok(clueCount >= 1 && clueCount < puzzle.cells.length, 'a puzzle needs at least one clue and one blank');
      const ratio = clueCount / puzzle.cells.length;
      assert.ok(
        ratio >= config.clueRatioBand.min && ratio <= config.clueRatioBand.max,
        `level ${config.level} seed ${seed} clue ratio ${ratio.toFixed(3)} left the band`
      );
      // 提示格的字一律等於答案，空格才進池。
      puzzle.clues.forEach((isClue, cell) => { if (isClue) assert.equal(typeof puzzle.solution[cell], 'string'); });
    }
  }
});

test('the pool holds one entry per blanked cell, repeats included, plus decoys', () => {
  let sawRepeat = false;

  for (const config of IDIOM_DIFFICULTY_LEVELS) {
    for (let seed = 1; seed <= 20; seed += 1) {
      const puzzle = generateIdiomPuzzle({ seed, level: config.level, index });
      const blanked = puzzle.solution.filter((_, cell) => !puzzle.clues[cell]);
      assert.equal(blanked.length, puzzle.stats.blankCount);
      assert.equal(puzzle.pool.length, blanked.length + puzzle.stats.decoyCount);

      const count = (list, character) => list.filter((entry) => entry === character).length;
      new Set(blanked).forEach((character) => {
        const needed = count(blanked, character);
        if (needed > 1) sawRepeat = true;
        assert.ok(count(puzzle.pool, character) >= needed, `pool is short of ${character}`);
      });

      // 干擾字取自同層詞頻，且不與盤面上的字重複。
      const onBoard = new Set(puzzle.solution);
      const surplus = puzzle.pool.filter((character) => !onBoard.has(character));
      assert.equal(surplus.length, puzzle.stats.decoyCount);
      const allowed = new Set(eligibleCharacters(index, config.tiers));
      surplus.forEach((character) => assert.ok(allowed.has(character), `${character} is not from an eligible tier`));

      const target = Math.round(blanked.length * config.decoyRatio);
      assert.ok(puzzle.stats.decoyCount <= target, 'decoys never exceed the difficulty target');
      if (config.decoyRatio === 0) assert.equal(puzzle.stats.decoyCount, 0);
    }
  }

  assert.ok(sawRepeat, 'expected at least one board to blank the same character twice');
});

test('generated runs stay four cells long and cross only where characters agree', () => {
  for (const config of IDIOM_DIFFICULTY_LEVELS) {
    for (let seed = 1; seed <= 15; seed += 1) {
      const puzzle = generateIdiomPuzzle({ seed, level: config.level, index });
      assert.equal(puzzle.stats.crossings, puzzle.stats.idiomCount - 1, 'each attachment adds exactly one crossing');
      assert.equal(puzzle.cells.length, puzzle.stats.idiomCount * 3 + 1);

      puzzle.runs.forEach((run) => {
        assert.equal([...run.idiom].length, 4);
        assert.equal(run.cells.length, 4);
        assert.ok(index.tierOf.has(run.idiom), `${run.idiom} is not in the corpus`);
        assert.ok(config.tiers.includes(index.tierOf.get(run.idiom)), `${run.idiom} is outside the eligible tiers`);
        run.cells.forEach((cell, offset) => assert.equal(puzzle.solution[cell], run.idiom[offset]));
      });

      assert.ok(canAttach([], puzzle.runs[0]));
      assert.ok(maximalStringsValid(puzzle.runs));
    }
  }
});
