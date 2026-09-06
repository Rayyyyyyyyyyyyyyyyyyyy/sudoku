import assert from 'node:assert/strict';
import test from 'node:test';
import {
  IDIOM_DAILY_LEVEL,
  IDIOM_DIFFICULTY_LEVELS,
  IDIOM_TIER_COUNT,
  difficultyTableViolations,
  idiomDifficulty
} from '../src/lib/idiom/difficulty.js';

test('the shipped difficulty table has no invariant violations', () => {
  assert.deepEqual(difficultyTableViolations(), []);
});

test('there are five levels, labelled 0 to 4', () => {
  assert.equal(IDIOM_DIFFICULTY_LEVELS.length, 5);
  IDIOM_DIFFICULTY_LEVELS.forEach((config, level) => assert.equal(config.level, level));
});

test('idiom count is non-decreasing and clue proportion non-increasing as level rises', () => {
  for (let level = 1; level < IDIOM_DIFFICULTY_LEVELS.length; level += 1) {
    const previous = IDIOM_DIFFICULTY_LEVELS[level - 1];
    const current = IDIOM_DIFFICULTY_LEVELS[level];
    assert.ok(current.idiomCount >= previous.idiomCount, `level ${level} idiom count decreased`);
    assert.ok(current.clueRatio <= previous.clueRatio, `level ${level} clue proportion increased`);
  }
});

test('decoy proportion is non-decreasing and eligible tiers never shrink', () => {
  for (let level = 1; level < IDIOM_DIFFICULTY_LEVELS.length; level += 1) {
    const previous = IDIOM_DIFFICULTY_LEVELS[level - 1];
    const current = IDIOM_DIFFICULTY_LEVELS[level];
    assert.ok(current.decoyRatio >= previous.decoyRatio, `level ${level} decoy proportion decreased`);
    for (const tier of previous.tiers) {
      assert.ok(current.tiers.includes(tier), `level ${level} dropped tier ${tier}`);
    }
  }
});

test('every level names only tiers the corpus actually has', () => {
  for (const config of IDIOM_DIFFICULTY_LEVELS) {
    for (const tier of config.tiers) {
      assert.ok(Number.isInteger(tier) && tier >= 0 && tier < IDIOM_TIER_COUNT, `bad tier ${tier}`);
    }
  }
});

test('each level can still produce a board when generation falls short', () => {
  for (const config of IDIOM_DIFFICULTY_LEVELS) {
    assert.ok(config.minIdiomCount <= config.idiomCount, `level ${config.level} floor exceeds target`);
    assert.ok(config.minIdiomCount >= 3, `level ${config.level} floor is too small to be a lattice`);
    // 交叉數上限是樹狀連接：n 條詞條最少 n-1 個交叉才連得起來。
    assert.ok(
      config.minCrossings <= config.minIdiomCount - 1,
      `level ${config.level} needs more crossings than ${config.minIdiomCount} runs can provide`
    );
  }
});

test('the configured clue ratio sits inside its own repair band', () => {
  for (const config of IDIOM_DIFFICULTY_LEVELS) {
    const { min, max } = config.clueRatioBand;
    assert.ok(min < max, `level ${config.level} has an empty band`);
    assert.ok(
      config.clueRatio >= min && config.clueRatio <= max,
      `level ${config.level} clue ratio ${config.clueRatio} is outside [${min}, ${max}]`
    );
  }
});

test('the violation checker actually catches a broken table', () => {
  const broken = IDIOM_DIFFICULTY_LEVELS.map((config) => ({ ...config }));
  broken[2] = { ...broken[2], idiomCount: 1, clueRatio: 0.99 };
  const violations = difficultyTableViolations(broken);
  assert.ok(violations.length > 0, 'a table with a decreasing idiom count must be rejected');
});

test('idiomDifficulty returns the level and rejects unknown ones', () => {
  assert.equal(idiomDifficulty(0).level, 0);
  assert.equal(idiomDifficulty(4).level, 4);
  assert.throws(() => idiomDifficulty(5), RangeError);
  assert.throws(() => idiomDifficulty(-1), RangeError);
});

test('the daily level is one of the shipped levels', () => {
  assert.ok(IDIOM_DIFFICULTY_LEVELS.some((config) => config.level === IDIOM_DAILY_LEVEL));
});
