import assert from 'node:assert/strict';
import test from 'node:test';
import { completionReward, MEDAL_STEPS, medalProgress } from '../src/lib/sudokuRewards.js';

test('medals follow each difficulty independently and finish after twenty clears', () => {
  const stats = { count: { 0: 20, 1: 5, 2: 1, 3: 0 } };
  const bronze = medalProgress(stats, 2);
  assert.deepEqual(bronze.earned, [MEDAL_STEPS[0]]);
  assert.equal(bronze.current.name, '初勝');
  assert.equal(bronze.next.name, '熟練');
  assert.equal(bronze.remaining, 4);

  const silver = medalProgress(stats, 1);
  assert.equal(silver.current.name, '熟練');
  assert.equal(silver.remaining, 15);

  const gold = medalProgress(stats, 0);
  assert.deepEqual(gold.earned.map(({ target, tone }) => [target, tone]), [
    [1, 'bronze'], [5, 'silver'], [20, 'gold']
  ]);
  assert.equal(gold.current.name, '精通');
  assert.equal(gold.next, null);
  assert.equal(gold.remaining, 0);

  assert.deepEqual(medalProgress(stats, 3), {
    count: 0, earned: [], current: null, next: MEDAL_STEPS[0], remaining: 1
  });
});

test('the first clear earns bronze without calling the first time a broken record', () => {
  const reward = completionReward({
    before: { count: {}, best: {} },
    after: { count: { 4: 1 }, best: { 4: 240000 }, solved: 1, streak: 1 },
    level: 4,
    ms: 240000
  });

  assert.deepEqual(reward, {
    level: 4,
    ms: 240000,
    count: 1,
    firstClear: true,
    newBest: false,
    previousBest: null,
    improvementMs: 0,
    newMedals: [MEDAL_STEPS[0]],
    next: MEDAL_STEPS[1],
    remaining: 4,
    totalSolved: 1,
    streak: 1
  });
});

test('the fifth clear earns only silver and reports the actual personal improvement', () => {
  const reward = completionReward({
    before: { count: { 4: 4 }, best: { 4: 180000 }, solved: 12, streak: 2 },
    after: { count: { 4: 5 }, best: { 4: 150000 }, solved: 13, streak: 3 },
    level: 4,
    ms: 150000
  });

  assert.equal(reward.firstClear, false);
  assert.equal(reward.newBest, true);
  assert.equal(reward.previousBest, 180000);
  assert.equal(reward.improvementMs, 30000);
  assert.deepEqual(reward.newMedals, [MEDAL_STEPS[1]]);
  assert.equal(reward.remaining, 15);
  assert.equal(reward.totalSolved, 13);
  assert.equal(reward.streak, 3);
});

test('equal or slower clears celebrate completion without claiming a new record or medal', () => {
  for (const ms of [60000, 70000]) {
    const reward = completionReward({
      before: { count: { 2: 2 }, best: { 2: 60000 } },
      after: { count: { 2: 3 }, best: { 2: 60000 } },
      level: 2,
      ms
    });
    assert.equal(reward.firstClear, false);
    assert.equal(reward.newBest, false);
    assert.equal(reward.improvementMs, 0);
    assert.deepEqual(reward.newMedals, []);
    assert.equal(reward.remaining, 2);
  }
});

test('existing saves derive medals without inventing a newly crossed threshold', () => {
  const stats = { count: { 1: 21 }, best: { 1: 90000 }, solved: 42, streak: 4 };
  assert.equal(medalProgress(stats, 1).earned.length, 3);
  assert.equal(medalProgress(stats, 1).earned.length, 3);

  const reward = completionReward({ before: stats, after: stats, level: 1, ms: 90000 });
  assert.deepEqual(reward.newMedals, []);
  assert.equal(reward.next, null);
  assert.equal(reward.remaining, 0);
});

test('legacy saves without per-level counts do not infer medals from total clears or best times', () => {
  const before = { solved: 30, best: { 3: 120000 }, streak: 2 };
  assert.equal(medalProgress(before, 3).count, 0);
  assert.deepEqual(medalProgress(before, 3).earned, []);
  assert.equal(medalProgress(null, 3).remaining, 1);

  const reward = completionReward({
    before,
    after: { ...before, solved: 31, count: { 3: 1 } },
    level: 3,
    ms: 130000
  });
  assert.equal(reward.firstClear, true);
  assert.equal(reward.previousBest, 120000);
  assert.equal(reward.newBest, false);
  assert.deepEqual(reward.newMedals, [MEDAL_STEPS[0]]);
});

test('zero is a valid time while null and invalid times cannot establish a comparison', () => {
  const makeReward = (best, ms) => completionReward({
    before: { count: { 0: 1 }, best: { 0: best } },
    after: { count: { 0: 2 } },
    level: 0,
    ms
  });

  assert.equal(makeReward(1000, 0).newBest, true);
  assert.equal(makeReward(1000, 0).improvementMs, 1000);
  assert.equal(makeReward(0, 1000).previousBest, 0);
  assert.equal(makeReward(0, 1000).newBest, false);

  for (const best of [null, undefined, -1, Infinity, NaN, '1000']) {
    const reward = makeReward(best, 0);
    assert.equal(reward.previousBest, null);
    assert.equal(reward.newBest, false);
  }
  for (const ms of [null, undefined, -1, Infinity, NaN, '0']) {
    assert.equal(makeReward(1000, ms).newBest, false);
  }
});

test('a snapshot jump reports every crossed threshold without repeating earlier medals', () => {
  const reward = completionReward({
    before: { count: { 4: 1 } },
    after: { count: { 4: 20 } },
    level: 4,
    ms: 240000
  });
  assert.deepEqual(reward.newMedals.map(({ id }) => id), ['silver', 'gold']);
});

test('deriving progress and rewards does not mutate input snapshots', () => {
  const before = Object.freeze({
    count: Object.freeze({ 2: 4 }),
    best: Object.freeze({ 2: 100000 }),
    solved: 8,
    streak: 1
  });
  const after = Object.freeze({
    count: Object.freeze({ 2: 5 }),
    best: Object.freeze({ 2: 90000 }),
    solved: 9,
    streak: 2
  });
  const snapshots = JSON.stringify({ before, after });
  const progress = medalProgress(before, 2);
  progress.earned.push({ id: 'local-only' });
  completionReward({ before, after, level: 2, ms: 90000 });

  assert.equal(JSON.stringify({ before, after }), snapshots);
  assert.equal(medalProgress(before, 2).earned.length, 1);
  assert.equal(MEDAL_STEPS.length, 3);
});
