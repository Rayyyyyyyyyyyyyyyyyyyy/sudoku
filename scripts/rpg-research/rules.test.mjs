import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actions, arrange, createBattle, evaluate, FRAGMENTS, FRAGMENT_IDS, step } from './rules.ts';
import { createLab, transition } from './run.ts';

const hero = (hp = 40) => ({ hp, maxHp: 40, mana: 10, maxMana: 10, shield: 0 });
const fixture = (spell = ['whale-steady'], enemy = 'crocodile', modifiers = []) => ({
  ...createBattle(enemy, modifiers, hero(), [spell]), known: [0, 0],
});
const act = (state, action) => {
  const result = transition(state, { ...action, revision: state.revision });
  assert.equal(result.accepted, true, result.reason);
  return result.state;
};
const five = ['living-shield', 'camel-rend', 'whale-steady', 'dead-pierce', 'elephant-roll'];

test('the laboratory contains exactly two fragments per component', () => {
  assert.equal(FRAGMENT_IDS.length, 10);
  const counts = Object.values(FRAGMENTS).reduce((n, f) => ({ ...n, [f.component]: (n[f.component] ?? 0) + 1 }), {});
  assert.deepEqual(Object.values(counts), [2, 2, 2, 2, 2]);
});

test('neutral layer permutations preserve the complete evaluation', () => {
  const a = ['living-heal', 'camel-rend', 'dead-drain', 'whale-opening', 'elephant-roll'];
  const b = ['elephant-roll', 'camel-rend', 'living-heal', 'whale-opening', 'dead-drain'];
  const info = fixture(a);
  info.hero.hp = 10;
  info.enemyHp = 2; // includes simultaneous overkill
  const x = evaluate(info, a);
  const y = evaluate(info, b);
  assert.deepEqual(x, y);
});

test('arrange keeps neutral cells and only groups camel before whale', () => {
  const input = ['whale-steady', 'living-heal', 'camel-weaken', 'dead-pierce', 'camel-rend'];
  assert.deepEqual(arrange(input), ['camel-weaken', 'living-heal', 'camel-rend', 'dead-pierce', 'whale-steady']);
  assert.deepEqual(arrange(arrange(input)), arrange(input));
});

test('each linked whale gets one bonus and only preceding armor reduction', () => {
  const info = fixture([], 'knight');
  const linked = evaluate(info, ['camel-rend', 'camel-weaken', 'whale-steady']);
  assert.equal(linked.trace.damage, 12); // 10 + 3 - (5 - 4)
  assert.deepEqual(linked.trace.links, [{ fragment: 'whale-steady', armorBreak: 4, bonus: 3 }]);
  assert.equal(evaluate(info, ['whale-steady', 'camel-rend', 'camel-weaken']).trace.damage, 5);
});

test('death speech deals useful damage against either laboratory enemy', () => {
  for (const enemy of ['knight', 'crocodile']) assert.equal(evaluate(fixture([], enemy), ['dead-pierce']).trace.damage, 4);
});

test('crocodile reflection counts layers, not hits or non-damaging lines', () => {
  const info = fixture();
  assert.equal(evaluate(info, ['elephant-roll']).trace.reflectRaw, 6);
  assert.equal(evaluate(info, ['elephant-roll', 'dead-pierce']).trace.reflectedHp, 10);
  assert.equal(evaluate(info, ['elephant-roll', 'camel-rend']).trace.reflectRaw, 6);
  const four = ['elephant-roll', 'dead-pierce', 'dead-drain', 'whale-steady'];
  assert.equal(evaluate(info, four).trace.reflectCapped, 10);
  assert.equal(evaluate(info, [...four, 'whale-opening']).trace.reflectCapped, 10);
});

test('echo is fixed and once per encounter, combined with crocodile before one cap', () => {
  const info = fixture([], 'knight', ['echo']);
  const one = evaluate(info, ['dead-pierce']);
  const many = evaluate(info, ['dead-pierce', 'elephant-roll', 'whale-steady']);
  assert.equal(one.trace.reflectRaw, 5);
  assert.equal(many.trace.reflectRaw, 5);
  assert.equal(evaluate(one.state, ['dead-pierce']).trace.reflectRaw, 0);
  assert.equal(evaluate(fixture([], 'crocodile', ['echo']), ['dead-pierce', 'elephant-roll']).trace.reflectCapped, 10);
});

test('healing and shielding precede reflection, but a lethal reflected tie is defeat', () => {
  const info = fixture(); info.hero.hp = 3; info.enemyHp = 1;
  assert.equal(evaluate(info, ['dead-pierce']).state.status, 'lost');
  const shielded = evaluate(info, ['living-shield', 'dead-pierce']);
  assert.equal(shielded.state.status, 'won');
  assert.equal(shielded.trace.reflectedHp, 0);
  assert.equal(evaluate(info, ['living-heal', 'dead-pierce']).state.hero.hp, 3);
});

test('three lines release after the enemy in the starting turn, with no extra attack', () => {
  const info = fixture(['living-heal', 'camel-rend', 'whale-steady']);
  info.hero.hp = 10;
  const result = step(info, { type: 'cast', spell: 0 });
  assert.equal(result.state.turn, 1);
  assert.equal(result.state.casting, null);
  assert.equal(result.state.hero.hp, 8); // 10 - enemy 2 + heal 6 - reflect 6
  assert.equal(result.state.hero.mana, 7);
  assert.ok(result.trace.damage > 0);
});

test('five lines require exactly two enemy opportunities and release on turn two', () => {
  const first = step(fixture(five), { type: 'cast', spell: 0 });
  assert.equal(first.trace, null);
  assert.equal(first.state.casting.remaining, 1);
  assert.deepEqual(actions(first.state), [{ type: 'continue' }]);
  const second = step(first.state, { type: 'continue' });
  assert.equal(second.state.casting, null);
  assert.equal(second.state.turn, 2);
  assert.ok(second.trace.damage > 0);
  assert.equal(second.state.hero.mana, 5);
});

test('interruption refunds half; a fully shielded hit does not interrupt', () => {
  const info = fixture(five, 'knight'); info.known = [1, 0];
  const stopped = step(info, { type: 'cast', spell: 0 });
  assert.equal(stopped.state.casting, null);
  assert.equal(stopped.trace, null);
  assert.equal(stopped.state.hero.mana, 7);
  info.hero.shield = 7;
  const protectedCast = step(info, { type: 'cast', spell: 0 });
  assert.equal(protectedCast.state.casting.remaining, 1);
  assert.equal(protectedCast.state.hero.mana, 5);
});

test('death during chanting prevents heal, release and refund', () => {
  const info = fixture(['living-heal', 'camel-rend', 'whale-steady'], 'knight');
  info.hero.hp = 1; info.known = [1];
  const result = step(info, { type: 'cast', spell: 0 });
  assert.equal(result.state.status, 'lost');
  assert.equal(result.state.casting, null);
  assert.equal(result.state.hero.hp, 0);
  assert.equal(result.state.hero.mana, 7);
  assert.equal(result.trace, null);
});

test('guard restores at most one mana and consumes a real enemy turn', () => {
  const info = fixture(); info.hero.mana = 0; info.known = [2];
  const next = step(info, { type: 'guard' }).state;
  assert.equal(next.hero.mana, 1);
  assert.equal(next.hero.hp, 40);
  assert.equal(next.turn, 1);
});

test('atomic move leaves a hole; occupied/illegal destinations change nothing', () => {
  const initial = createLab();
  const moved = act(initial, { type: 'move', fragment: 'camel-rend', spell: 1, slot: 2 });
  assert.equal(moved.position.book[0][0], null);
  assert.equal(moved.position.book[1][2], 'camel-rend');
  assert.equal(moved.position.book.flat().filter(id => id === 'camel-rend').length, 1);
  assert.deepEqual(moved.baseline, initial.baseline);
  const rejected = transition(moved, { type: 'move', fragment: 'camel-rend', spell: 2, slot: 0, revision: moved.revision });
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.state, moved);
  assert.equal(transition(moved, { type: 'enter', revision: 0 }).state, moved);
});

test('duplicate fragments and composing during combat are rejected atomically', () => {
  const initial = createLab();
  assert.equal(transition(initial, { type: 'compose', spells: [['dead-pierce'], ['dead-pierce'], []], revision: 0 }).state, initial);
  const battle = act(initial, { type: 'enter' });
  assert.equal(transition(battle, { type: 'compose', spells: [[], [], []], revision: battle.revision }).state, battle);
});

test('failed phase has no RNG; escape commits a new baseline and loses rewards', () => {
  let state = createLab();
  state = act(state, { type: 'enter' });
  const entry = structuredClone(state.entry);
  while (state.phase === 'battle') state = act(state, { type: 'fight', action: { type: 'attack' } });
  assert.equal(state.phase, 'failed');
  assert.equal(state.battle, null);
  assert.equal(state.profile.insight, 0);
  const failed = JSON.parse(JSON.stringify(state));
  const retry = act(failed, { type: 'retry' });
  assert.deepEqual(retry.position, createLab().baseline);
  state = act(failed, { type: 'escape' });
  assert.deepEqual(state.position.hero, entry.hero);
  assert.deepEqual(state.position.escaped, ['knight']);
  assert.equal(state.position.escape, false);
  assert.deepEqual(state.position, state.baseline);
  assert.equal(state.profile.insight, 0);
  state = act(state, { type: 'enter' });
  while (state.phase === 'battle') state = act(state, { type: 'fight', action: { type: 'attack' } });
  assert.equal(state.phase, 'failed');
  assert.equal(transition(state, { type: 'escape', revision: state.revision }).state, state);
  state = act(state, { type: 'retry' });
  assert.deepEqual(state.position.escaped, ['knight']);
  assert.equal(state.position.escape, false);
  assert.equal(state.position.cursor, 1);
});

test('preview then short action remembers the second intent without drawing on preview', () => {
  // Reach crocodile through the explicit failure/escape flow, not a raw fixture.
  let state = act(createLab(), { type: 'enter' });
  while (state.phase === 'battle') state = act(state, { type: 'fight', action: { type: 'attack' } });
  state = act(state, { type: 'escape' });
  state = act(state, { type: 'enter' });
  const before = structuredClone(state.battle.random);
  state = act(state, { type: 'preview', spell: 2 });
  assert.deepEqual(state.battle.random, before);
  assert.equal(state.battle.info.known.length, 2);
  const expected = state.battle.info.known[1];
  const loaded = JSON.parse(JSON.stringify(state));
  const action = { type: 'fight', action: { type: 'guard' } };
  assert.deepEqual(act(state, action), act(loaded, action));
  assert.equal(act(state, action).battle.info.known[0], expected);
});

test('mid-cast serialization and failed retry reproduce the same random stream', () => {
  let state = act(createLab(1), { type: 'enter' });
  while (state.phase === 'battle') state = act(state, { type: 'fight', action: { type: 'attack' } });
  state = act(state, { type: 'escape' });
  state = act(state, { type: 'enter' });
  const entered = structuredClone(state.battle);
  state = act(state, { type: 'preview', spell: 2 });
  state = act(state, { type: 'fight', action: { type: 'cast', spell: 2 } });
  assert.equal(state.battle.info.casting.remaining, 1);
  const loaded = JSON.parse(JSON.stringify(state));
  const finish = { type: 'fight', action: { type: 'continue' } };
  assert.deepEqual(act(state, finish), act(loaded, finish));
  state = act(state, finish);
  while (state.phase === 'battle') state = act(state, { type: 'fight', action: { type: 'attack' } });
  assert.equal(state.phase, 'failed');
  state = act(state, { type: 'retry' });
  state = act(state, { type: 'enter' });
  assert.deepEqual(state.battle, entered);
});

test('full restart preserves earned profile while resetting run assets', () => {
  const state = createLab();
  state.profile.insight = 2; state.profile.discoveries = ['enemy:knight'];
  for (const phase of ['research', 'battle', 'failed', 'complete']) {
    const started = act({ ...state, phase }, { type: 'restart' });
    assert.equal(started.profile.insight, 2);
    assert.deepEqual(started.profile.discoveries, ['enemy:knight']);
    assert.deepEqual(started.position, createLab().position);
  }
});
