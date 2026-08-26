import assert from 'node:assert/strict';
import test from 'node:test';
import { COMPATIBILITY_FIXTURES, MODIFIERS, POKER_RULES, SPECIAL_RULES } from '../src/data/poker/compatibility.js';
import { assertZoneInvariant, cardFromCode, createRoundZones, createStandardDeck, drawToHand, moveSelected, rankChips } from '../src/lib/poker/cards.js';
import { interestFor } from '../src/lib/poker/economy.js';
import { assertRegisteredHandlers, resolveScoreOperations, scoreHand, updateModifiersAfterDiscard } from '../src/lib/poker/effects.js';
import { evaluateHand } from '../src/lib/poker/evaluate.js';
import { nextRandom, seedRandom, shuffle } from '../src/lib/poker/random.js';

const cards = (...codes) => codes.map((code, index) => cardFromCode(code, `t${index}`));

test('serialized PRNG produces identical streams and resumes at the exact next value', () => {
  let a = seedRandom(42);
  let b = seedRandom(42);
  for (let index = 0; index < 10; index += 1) {
    const nextA = nextRandom(a);
    const nextB = nextRandom(b);
    assert.equal(nextA.value, nextB.value);
    a = nextA.state;
    b = nextB.state;
  }
  const saved = JSON.parse(JSON.stringify(a));
  assert.deepEqual(nextRandom(a), nextRandom(saved));
  assert.deepEqual(shuffle([1, 2, 3, 4], seedRandom(9)), shuffle([1, 2, 3, 4], seedRandom(9)));
});

test('card transitions keep all 52 unique instances in exactly one explicit zone', () => {
  const created = createRoundZones(seedRandom(1));
  let zones = drawToHand(created.zones, 8, 8);
  assertZoneInvariant(zones);
  assert.equal(zones.hand.length, 8);
  const played = zones.hand.slice(0, 3).map((card) => card.instanceId);
  zones = moveSelected(zones, played, 'played');
  zones = drawToHand(zones, 3, 8);
  const discarded = zones.hand.slice(0, 2).map((card) => card.instanceId);
  zones = moveSelected(zones, discarded, 'discarded');
  zones = drawToHand(zones, 2, 8);
  assertZoneInvariant(zones);
  assert.deepEqual(Object.keys(zones).sort(), ['discarded', 'drawPile', 'hand', 'played']);
});

test('evaluator recognizes all nine classes, wheel, broadway, and ranking conflicts', () => {
  const cases = [
    ['high-card', cards('AS')],
    ['pair', cards('AS', 'AH', '2D', '3C')],
    ['two-pair', cards('AS', 'AH', '2D', '2C', 'KS')],
    ['three-kind', cards('AS', 'AH', 'AD', '2C', 'KS')],
    ['straight', cards('AS', '2H', '3D', '4C', '5S')],
    ['straight', cards('10S', 'JH', 'QD', 'KC', 'AS')],
    ['flush', cards('2S', '5S', '8S', 'JS', 'KS')],
    ['full-house', cards('AS', 'AH', 'AD', 'KC', 'KS')],
    ['four-kind', cards('AS', 'AH', 'AD', 'AC', 'KS')],
    ['straight-flush', cards('9S', '10S', 'JS', 'QS', 'KS')]
  ];
  cases.forEach(([expected, hand]) => assert.equal(evaluateHand(hand).type, expected));
});

test('partial hands identify only contributing cards and exclude kickers', () => {
  const hand = cards('7S', '7H', 'AD', '2C');
  const result = evaluateHand(hand);
  assert.equal(result.type, 'pair');
  assert.equal(result.contributingIds.length, 2);
  assert.equal(result.contributingIds.some((id) => id.endsWith('AD')), false);
  assert.equal(evaluateHand(cards('2S', '3H', '4D', '5C'), { fourCardStraightFlush: true }).type, 'straight');
  assert.equal(evaluateHand(cards('2S', '4H', '6D', '8C', '10S'), { gapStraight: true }).type, 'straight');
});

test('all standard-card singles and pairs obey exhaustive contribution invariants', () => {
  const deck = createStandardDeck('exhaustive');
  deck.forEach((card) => {
    const result = evaluateHand([card]);
    assert.equal(result.type, 'high-card');
    assert.deepEqual(result.contributingIds, [card.instanceId]);
  });
  for (let left = 0; left < deck.length; left += 1) {
    for (let right = left + 1; right < deck.length; right += 1) {
      const result = evaluateHand([deck[left], deck[right]]);
      const expected = deck[left].rank === deck[right].rank ? 'pair' : 'high-card';
      assert.equal(result.type, expected);
      assert.equal(result.contributingIds.length, expected === 'pair' ? 2 : 1);
    }
  }
});

test('baseline score fixtures distinguish verified flush chips and inferred straights', () => {
  const flush = COMPATIBILITY_FIXTURES.officialFlushMidscore68;
  assert.equal(flush.baseChips + flush.cards.reduce((sum, code) => sum + rankChips(cardFromCode(code).rank), 0), flush.expectedChips);
  const broadway = scoreHand({ cards: cards(...COMPATIBILITY_FIXTURES.straightBroadway.cards), randomState: seedRandom(1) });
  assert.equal(broadway.score, COMPATIBILITY_FIXTURES.straightBroadway.expected);
  const wheel = scoreHand({ cards: cards(...COMPATIBILITY_FIXTURES.straightWheel.cards), randomState: seedRandom(1) });
  assert.equal(wheel.score, COMPATIBILITY_FIXTURES.straightWheel.expected);
  assert.equal(POKER_RULES.rounding.value, 'floor');
});

test('typed operations preserve left-to-right add/multiply order and enforce bounds', () => {
  COMPATIBILITY_FIXTURES.ordered.forEach((fixture) => {
    assert.equal(resolveScoreOperations({ chips: 10, mult: 2 }, fixture.operations).score, fixture.expected);
  });
  assert.throws(() => resolveScoreOperations({ chips: 1, mult: 1 }, [{ type: 'evaluate-code' }]), /Unknown/);
  assert.throws(() => resolveScoreOperations({ chips: 1, mult: 1 }, [{ type: 'repeat-trigger', repeats: 1, operations: [{ type: 'repeat-trigger', repeats: 1, operations: [] }] }], { maxEvents: 1, maxTriggerDepth: 1 }), /limit/);
});

test('every catalog effect family is registered, deterministic, and terminates', () => {
  assert.equal(assertRegisteredHandlers(MODIFIERS, SPECIAL_RULES), true);
  const sample = cards('2H', '3H', '4C', '5S', '6D');
  MODIFIERS.forEach((item, index) => {
    const modifiers = [{ instanceId: `m-${index}`, catalogId: item.id, counters: { suit: 'hearts', storedChips: 8, storedMult: 3 } }];
    const result = scoreHand({ cards: sample, modifiers, randomState: seedRandom(100), discardsRemaining: 2, cardsInDeck: 30, roundHandCounts: { straight: 1 }, stageHandCounts: { straight: 2 } });
    assert.ok(Number.isFinite(result.score), item.id);
    assert.ok(result.trace.length > 0, item.id);
    assert.ok(result.trace.length < 256, item.id);
    assert.equal(result.modifiers.length, 1);
    assert.equal(updateModifiersAfterDiscard(modifiers, sample).length, 1);
  });
});

test('representative classifier, per-card, retrigger, and copy combination is bounded', () => {
  const modifierIds = ['all-face-classifier', 'all-played-score', 'face-card-chips', 'copy-right-effect', 'face-card-retrigger', 'low-rank-retrigger'];
  const modifiers = modifierIds.map((catalogId, index) => ({ instanceId: `combo-${index}`, catalogId, counters: {} }));
  const result = scoreHand({ cards: cards('2H', '3D', '4C', '5S', '9H'), modifiers, randomState: seedRandom(99) });
  assert.ok(result.trace.length < 256);
  assert.ok(result.chips >= 5 + 150);
});

test('copy dispatch duplicates a compatible right-side operation without recursion', () => {
  const copied = scoreHand({
    cards: cards('AS'),
    modifiers: [
      { instanceId: 'copy', catalogId: 'copy-right-effect', counters: {} },
      { instanceId: 'flat', catalogId: 'flat-mult', counters: {} }
    ],
    randomState: seedRandom(1)
  });
  assert.equal(copied.mult, 9, 'base 1 + copied 4 + original 4');
  assert.equal(copied.trace.some((event) => event.copiedBy === 'copy-right-effect'), true);
});

test('researched debuff rules suppress rank chips using rank class and cross-round logical card identity', () => {
  const face = cards('KS');
  assert.equal(scoreHand({ cards: face, randomState: seedRandom(1) }).chips, 15);
  const faceDebuffed = scoreHand({ cards: face, randomState: seedRandom(1), specialRuleId: 'face-cards-debuffed' });
  assert.equal(faceDebuffed.chips, 5);
  assert.deepEqual(faceDebuffed.trace.find((event) => event.type === 'card-debuffed'), {
    type: 'card-debuffed',
    source: face[0].instanceId,
    ruleId: 'face-cards-debuffed',
    amount: 0,
    repeat: 0,
    before: { chips: 5, mult: 1 },
    after: { chips: 5, mult: 1 }
  });
  const prior = cards('7H');
  const historyDebuffed = scoreHand({ cards: prior, randomState: seedRandom(1), specialRuleId: 'stage-played-cards-debuffed', stagePlayedCardIds: ['hearts-7'] });
  assert.equal(historyDebuffed.chips, 5);
  assert.equal(historyDebuffed.trace.some((event) => event.type === 'card-debuffed' && event.ruleId === 'stage-played-cards-debuffed'), true);
});

test('interest fixture covers all boundaries', () => {
  const fixture = COMPATIBILITY_FIXTURES.interest;
  assert.deepEqual(fixture.holdings.map((coins) => interestFor(coins)), fixture.expected);
});
