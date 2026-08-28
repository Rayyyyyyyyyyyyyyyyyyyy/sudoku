import assert from 'node:assert/strict';
import test from 'node:test';
import { cardFromCode } from '../src/lib/poker/cards.js';
import {
  REDUCED_MOTION_CONTINUATION_MS,
  deriveTargetProgress,
  presentScoreTrace,
  rarityLabel,
  scoreSequenceDuration,
  selectMajorScoreBeats,
  specialRuleDescription,
  summarizeScoreOverflow
} from '../src/lib/poker/presentation.js';
import {
  EMPTY_POKER_PRESENTATION,
  completeResolutionOnce,
  presentationForCommittedState
} from '../src/lib/poker/usePokerPresentation.js';

test('score presentation translates hand, card, modifier, debuff, and total events', () => {
  const king = cardFromCode('KS', 'trace');
  const rows = presentScoreTrace([
    { type: 'hand-base', handType: 'high-card', chips: 5, mult: 1 },
    { type: 'card-debuffed', source: king.instanceId, ruleId: 'face-cards-debuffed', after: { chips: 5, mult: 1 } },
    { type: 'add-mult', source: 'flat-mult', amount: 4, after: { chips: 5, mult: 5 } },
    { type: 'hand-total', chips: 5, mult: 5, score: 25 }
  ], { cards: [king] });

  assert.equal(rows[0].title, '高牌基礎');
  assert.match(rows[1].title, /K♠ 失效/);
  assert.match(rows[1].detail, /J、Q、K/);
  assert.equal(rows[2].title, '基本增幅 +4 倍率');
  assert.equal(rows[3].title, '最終 5 籌碼 × 5 倍率');
  assert.equal(rows[3].value, '= 25');
  assert.equal(rows.some((row) => /hand-base|add-mult|hand-total/.test(row.title)), false);
});

test('rarity and every constrained special rule have localized operational copy', () => {
  assert.deepEqual(['common', 'uncommon', 'rare'].map(rarityLabel), ['常見', '少見', '稀有']);
  assert.match(specialRuleDescription('single-hand-type'), /第一次出牌.*鎖定/);
  assert.match(specialRuleDescription('hand-type-once'), /最多打出 1 次/);
  assert.match(specialRuleDescription('forced-selected-card'), /剛好選擇 1 張/);
  assert.match(specialRuleDescription('face-cards-debuffed'), /仍可組成牌型.*不提供牌面籌碼/);
});

test('major beat selection is bounded, chronological, and reports deterministic overflow', () => {
  const trace = [
    { type: 'hand-base', handType: 'pair', chips: 10, mult: 2 },
    ...Array.from({ length: 9 }, (_, index) => ({ type: 'add-chips', amount: index + 1, source: `card-${index}` })),
    { type: 'hand-total', chips: 55, mult: 2, score: 110 }
  ];
  const beats = selectMajorScoreBeats(trace);
  assert.equal(beats.length, 8);
  assert.equal(beats[0].type, 'hand-base');
  assert.equal(beats.at(-1).type, 'hand-total');
  assert.deepEqual(beats.find((beat) => beat.type === 'overflow-summary'), summarizeScoreOverflow(4));
  assert.equal(beats.filter((beat) => beat.type === 'overflow-summary').length, 1);
});

test('score timing and target progress use named bounded values and committed scores', () => {
  assert.equal(scoreSequenceDuration(0), 1100);
  assert.equal(scoreSequenceDuration(8), 1800);
  assert.equal(scoreSequenceDuration(100), 1800);
  assert.equal(scoreSequenceDuration(8, true), REDUCED_MOTION_CONTINUATION_MS);
  assert.deepEqual(deriveTargetProgress({ roundScore: 125, handScore: 40, target: 100 }), {
    before: 85,
    committed: 125,
    target: 100,
    startPercent: 85,
    endPercent: 100,
    crossedTarget: true,
    excess: 25
  });
});

test('presentation transitions suppress reload history, replay resolving, supersede cues, and retain fresh cards after completion', () => {
  const round = { target: 100 };
  const discardState = {
    phase: 'selecting', lastAction: 'DISCARD', trace: [{ type: 'discard', cardIds: ['old'], drawnCardIds: ['new'] }]
  };
  assert.deepEqual(presentationForCommittedState(EMPTY_POKER_PRESENTATION, discardState, round, { initial: true }), EMPTY_POKER_PRESENTATION);
  const discardPresentation = presentationForCommittedState(EMPTY_POKER_PRESENTATION, discardState, round);
  assert.deepEqual(discardPresentation.discardCue, { cardIds: ['old'], drawnCardIds: ['new'] });
  assert.deepEqual(discardPresentation.freshCardIds, ['new']);
  const superseded = presentationForCommittedState(discardPresentation, { ...discardState, lastAction: 'TOGGLE_CARD' }, round);
  assert.equal(superseded.discardCue, null);
  assert.deepEqual(superseded.freshCardIds, []);

  const resolvingState = {
    phase: 'resolving', lastAction: 'PLAY', roundScore: 40,
    pendingResolution: { score: 20, handType: 'pair', nextPhase: 'selecting', drawnCardIds: ['fresh'] },
    trace: [{ type: 'hand-base', handType: 'pair', chips: 10, mult: 2 }, { type: 'hand-total', chips: 20, mult: 2, score: 40 }]
  };
  const resolving = presentationForCommittedState(EMPTY_POKER_PRESENTATION, resolvingState, round, { initial: true });
  assert.equal(resolving.scoreBeats.length, 2);
  assert.deepEqual(resolving.pendingDrawnCardIds, ['fresh']);
  const finished = presentationForCommittedState(resolving, { phase: 'selecting', lastAction: 'FINISH_RESOLUTION' }, round);
  assert.deepEqual(finished.freshCardIds, ['fresh']);
  const roundWonReload = presentationForCommittedState(discardPresentation, { phase: 'round-won', lastAction: 'FINISH_RESOLUTION' }, round, { initial: true });
  assert.equal(roundWonReload.discardCue, null);
  assert.deepEqual(roundWonReload.scoreBeats, []);
});

test('automatic and skipped completion claims converge exactly once', () => {
  const automatic = completeResolutionOnce(new Set(), 'resolution-1');
  assert.equal(automatic.accepted, true);
  const skippedRace = completeResolutionOnce(automatic.completedKeys, 'resolution-1');
  assert.equal(skippedRace.accepted, false);
  const nextResolution = completeResolutionOnce(skippedRace.completedKeys, 'resolution-2');
  assert.equal(nextResolution.accepted, true);
});

test('localized score rows retain exact modifier and copy-source instance identities', () => {
  const [row] = presentScoreTrace([{ type: 'add-mult', source: 'flat-mult', amount: 4, sourceInstanceId: 'owned-source', copySourceInstanceId: 'owned-copy' }]);
  assert.equal(row.sourceInstanceId, 'owned-source');
  assert.equal(row.copySourceInstanceId, 'owned-copy');
});
