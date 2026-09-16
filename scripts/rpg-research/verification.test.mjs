import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, KNIGHT_BOOK, verifySlice, playContrast } from './verifySlice.mjs';
import { createBattle, evaluate, FRAGMENTS, FRAGMENT_IDS } from './rules.ts';
import { probeBattle } from './combatSearch.ts';

test('the two-node baseline and escape baseline meet the frozen slice gates', () => {
  const result = verifySlice();
  assert.equal(result.carried.length, 3); // no unsafe dominance pruning
  assert.ok(result.carried.every(r => r.entry.mana === 4));
  assert.equal(result.zeroManaWitness.nextEntry.mana, 0);
  assert.equal(result.escapedBaseline.entry.mana, 10);
  assert.equal(result.decisionEvidence.ratio, 1);
  assert.equal(result.fixedPolicies.length, 9);
});

test('proof inputs contain public information, no runtime RNG or hidden queue', () => {
  const info = createBattle('knight', [], { hp: 40, maxHp: 40, mana: 10, maxMana: 10, shield: 0 }, [['camel-rend', 'whale-steady']]);
  assert.equal(Object.hasOwn(info, 'random'), false);
  assert.equal(Object.hasOwn(info, 'queue'), false);
  assert.equal(probeBattle(info, { maxEdges: 20, maxNodes: 5000 }).verdict, 'WIN');
  assert.equal(probeBattle(info, { maxEdges: 20, maxNodes: 0 }).verdict, 'UNKNOWN');
});

test('every component pair has two-way outcome witnesses rather than a dominant fragment', () => {
  for (const component of ['living', 'dead', 'whale', 'camel', 'elephant']) {
    const [a, b] = FRAGMENT_IDS.filter(id => FRAGMENTS[id].component === component);
    let aBetter = false, bBetter = false;
    for (const enemy of ['knight', 'crocodile']) for (const hp of [1, 20, 40]) for (const fraction of [1, 0.25]) {
      const info = createBattle(enemy, [], { hp, maxHp: 40, mana: 10, maxMana: 10, shield: 0 }, []);
      info.enemyHp = Math.ceil(info.enemyHp * fraction);
      const vector = id => {
        const { state, trace } = evaluate(info, [id]);
        return [state.hero.hp, state.hero.shield, trace.damage, state.armorBreak, state.weakness, Number(state.stunned)];
      };
      const x = vector(a), y = vector(b);
      aBetter ||= x.some((v, i) => v > y[i]);
      bBetter ||= y.some((v, i) => v > x[i]);
    }
    assert.ok(aBetter && bBetter, `${component}: missing tradeoff witness`);
  }
});

test('victory is awarded once and failed replay cannot farm earned insight', () => {
  const { state: completed } = playContrast(false);
  assert.equal(completed.profile.victories, 1);
  assert.deepEqual(completed.profile.discoveries, ['enemy:knight', 'enemy:crocodile']);
  assert.equal(completed.profile.insight, 2);
  let replay = act(completed, { type: 'restart' });
  replay = act(replay, { type: 'compose', spells: KNIGHT_BOOK });
  replay = act(replay, { type: 'enter' });
  for (let i = 0; i < 3; i++) replay = act(replay, { type: 'fight', action: { type: 'cast', spell: 0 } });
  assert.equal(replay.profile.insight, 2);
  assert.equal(replay.profile.victories, 1);
});
