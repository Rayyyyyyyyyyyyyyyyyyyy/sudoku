import { MODIFIER_HANDLER_IDS, POKER_RULES, SPECIAL_RULE_HANDLER_IDS, modifierById } from '../../data/poker/compatibility.js';
import { rankChips } from './cards.js';
import { evaluateHand } from './evaluate.js';
import { randomInt } from './random.js';

export const SCORE_OPERATION_TYPES = ['add-chips', 'add-mult', 'multiply-mult', 'change-counter', 'repeat-trigger'];
export const SCORE_LIMITS = { maxEvents: 256, maxTriggerDepth: 8 };

export function resolveScoreOperations(initial, operations, limits = SCORE_LIMITS) {
  const context = { chips: initial.chips, mult: initial.mult, counters: { ...(initial.counters || {}) } };
  const trace = [];
  const queue = operations.map((operation) => ({ operation, depth: 0 }));
  let processed = 0;
  while (queue.length) {
    if (processed >= limits.maxEvents) throw new Error('Score event queue limit exceeded');
    const { operation, depth } = queue.shift();
    processed += 1;
    if (!SCORE_OPERATION_TYPES.includes(operation.type)) throw new Error(`Unknown score operation: ${operation.type}`);
    if (operation.type === 'repeat-trigger') {
      if (depth >= limits.maxTriggerDepth) throw new Error('Score trigger depth limit exceeded');
      const repeats = Math.max(0, Math.min(Number(operation.repeats) || 0, limits.maxEvents));
      for (let repeat = 0; repeat < repeats; repeat += 1) {
        (operation.operations || []).forEach((nested) => queue.unshift({ operation: nested, depth: depth + 1 }));
      }
      trace.push({ type: operation.type, repeats, depth });
      continue;
    }
    const before = { chips: context.chips, mult: context.mult };
    if (operation.type === 'add-chips') context.chips += Number(operation.amount) || 0;
    if (operation.type === 'add-mult') context.mult += Number(operation.amount) || 0;
    if (operation.type === 'multiply-mult') context.mult *= Number(operation.factor) || 0;
    if (operation.type === 'change-counter') context.counters[operation.key] = (context.counters[operation.key] || 0) + (Number(operation.amount) || 0);
    trace.push({ ...operation, before, after: { chips: context.chips, mult: context.mult }, depth });
  }
  context.chips = Math.max(0, context.chips);
  context.mult = Math.max(0, context.mult);
  return { ...context, score: Math.max(0, Math.floor(context.chips * context.mult)), trace };
}

function hasModifier(modifiers, handlerId) {
  return modifiers.some((owned) => modifierById(owned.catalogId)?.handlerId === handlerId);
}

function isFace(card, allFace) {
  return allFace || card.rank >= 11;
}

function modifierOperations(item, owned, event, context) {
  const p = item.params;
  const card = context.card;
  const allFace = context.allFace;
  const counters = owned.counters || {};
  switch (item.handlerId) {
    case 'owned-count-mult': return event === 'score-independent' ? [{ type: 'add-mult', amount: p.amount * context.modifiers.length, source: item.id }] : [];
    case 'rotating-suit-xmult': return event === 'on-scoring-card' && card.suit === (counters.suit || 'hearts') ? [{ type: 'multiply-mult', factor: p.factor, source: item.id }] : [];
    case 'remaining-discard-chips': return event === 'score-independent' ? [{ type: 'add-chips', amount: p.amount * context.discardsRemaining, source: item.id }] : [];
    case 'deck-remaining-chips': return event === 'score-independent' ? [{ type: 'add-chips', amount: p.amount * context.cardsInDeck, source: item.id }] : [];
    case 'repeated-hand-xmult': return event === 'score-independent' && (context.roundHandCounts[context.evaluation.type] || 0) > 0 ? [{ type: 'multiply-mult', factor: p.factor, source: item.id }] : [];
    case 'discard-suit-grow-chips': return event === 'score-independent' ? [{ type: 'add-chips', amount: counters.storedChips || 0, source: item.id }] : [];
    case 'rank-add-mult': return event === 'on-scoring-card' && p.ranks.includes(card.rank) ? [{ type: 'add-mult', amount: p.amount, source: item.id }] : [];
    case 'four-suits-combo': return event === 'after-scoring-cards' && new Set(context.scoringCards.map((candidate) => candidate.suit)).size === 4 ? [{ type: 'add-chips', amount: p.chips, source: item.id }, { type: 'multiply-mult', factor: p.factor, source: item.id }] : [];
    case 'play-grow-discard-shrink-mult': return event === 'score-independent' ? [{ type: 'add-mult', amount: counters.storedMult || 0, source: item.id }] : [];
    case 'small-play-mult': return event === 'score-independent' && context.playedCards.length < p.lessThan ? [{ type: 'add-mult', amount: p.amount, source: item.id }] : [];
    case 'flat-add-mult': return event === 'score-independent' ? [{ type: 'add-mult', amount: p.amount, source: item.id }] : [];
    case 'suit-add-mult': return event === 'on-scoring-card' && card.suit === p.suit ? [{ type: 'add-mult', amount: p.amount, source: item.id }] : [];
    case 'all-face': return [];
    case 'first-face-xmult': return event === 'on-scoring-card' && isFace(card, allFace) && context.faceOccurrence === 0 ? [{ type: 'multiply-mult', factor: p.factor, source: item.id }] : [];
    case 'face-add-chips': return event === 'on-scoring-card' && isFace(card, allFace) ? [{ type: 'add-chips', amount: p.amount, source: item.id }] : [];
    case 'club-plus-other-xmult': return event === 'score-independent' && context.scoringCards.some((candidate) => candidate.suit === 'clubs') && context.scoringCards.some((candidate) => candidate.suit !== 'clubs') ? [{ type: 'multiply-mult', factor: p.factor, source: item.id }] : [];
    case 'face-add-mult': return event === 'on-scoring-card' && isFace(card, allFace) ? [{ type: 'add-mult', amount: p.amount, source: item.id }] : [];
    case 'four-card-grow-chips': return event === 'score-independent' ? [{ type: 'add-chips', amount: counters.storedChips || 0, source: item.id }] : [];
    case 'hand-frequency-mult': return event === 'score-independent' ? [{ type: 'add-mult', amount: p.amount * (context.stageHandCounts[context.evaluation.type] || 0), source: item.id }] : [];
    case 'straight-xmult': return event === 'score-independent' && ['straight', 'straight-flush'].includes(context.evaluation.type) ? [{ type: 'multiply-mult', factor: p.factor, source: item.id }] : [];
    default: return [];
  }
}

function resolveOwnedOperations(modifiers, index, event, context, copied = false) {
  const owned = modifiers[index];
  const item = modifierById(owned.catalogId);
  if (!item) throw new Error(`Unknown modifier catalog id: ${owned.catalogId}`);
  if (!MODIFIER_HANDLER_REGISTRY[item.handlerId]) throw new Error(`Unknown modifier handler: ${item.handlerId}`);
  if (item.handlerId === 'copy-right') {
    if (copied || index + 1 >= modifiers.length) return [];
    const target = modifierById(modifiers[index + 1].catalogId);
    if (!target || target.handlerId === 'copy-right') return [];
    return resolveOwnedOperations(modifiers, index + 1, event, context, true).map((operation) => ({
      ...operation,
      copiedBy: item.id,
      copySourceInstanceId: owned.instanceId
    }));
  }
  return modifierOperations(item, owned, event, context).map((operation) => ({
    ...operation,
    sourceInstanceId: owned.instanceId
  }));
}

function appendOperations(running, operations) {
  if (!operations.length) return running;
  const resolved = resolveScoreOperations(running, operations);
  return { chips: resolved.chips, mult: resolved.mult, trace: [...running.trace, ...resolved.trace] };
}

function cardIsDebuffed(card, specialRuleId, stagePlayedCardIds) {
  if (specialRuleId === 'face-cards-debuffed' && card.rank >= 11) return true;
  return specialRuleId === 'stage-played-cards-debuffed' && stagePlayedCardIds.includes(`${card.suit}-${card.rank}`);
}

export function scoreHand({ cards, modifiers = [], randomState, discardsRemaining = 0, cardsInDeck = 0, roundHandCounts = {}, stageHandCounts = {}, specialRuleId = null, stagePlayedCardIds = [] }) {
  const allFace = hasModifier(modifiers, 'all-face');
  const evaluation = evaluateHand(cards, {
    fourCardStraightFlush: hasModifier(modifiers, 'four-card-straight-flush'),
    gapStraight: hasModifier(modifiers, 'gap-straight'),
    pairedSuits: hasModifier(modifiers, 'paired-suits')
  });
  const scoringCards = hasModifier(modifiers, 'all-played-score') ? cards : cards.filter((card) => evaluation.contributingIds.includes(card.instanceId));
  const base = POKER_RULES.handValues[evaluation.type].value;
  let running = { chips: base.chips, mult: base.mult, trace: [{ type: 'hand-base', handType: evaluation.type, chips: base.chips, mult: base.mult }] };
  let faceOccurrence = 0;
  scoringCards.forEach((card) => {
    const repeats = 1 + modifiers.reduce((count, owned) => {
      const item = modifierById(owned.catalogId);
      if (item?.handlerId === 'retrigger-ranks' && item.params.ranks.includes(card.rank)) return count + item.params.repeats;
      if (item?.handlerId === 'retrigger-face' && isFace(card, allFace)) return count + item.params.repeats;
      return count;
    }, 0);
    for (let repeat = 0; repeat < Math.min(repeats, SCORE_LIMITS.maxTriggerDepth); repeat += 1) {
      if (cardIsDebuffed(card, specialRuleId, stagePlayedCardIds)) {
        running = {
          ...running,
          trace: [...running.trace, {
            type: 'card-debuffed',
            source: card.instanceId,
            ruleId: specialRuleId,
            amount: 0,
            repeat,
            before: { chips: running.chips, mult: running.mult },
            after: { chips: running.chips, mult: running.mult }
          }]
        };
      } else running = appendOperations(running, [{ type: 'add-chips', amount: rankChips(card.rank), source: card.instanceId, repeat }]);
      const context = { card, allFace, faceOccurrence, modifiers, scoringCards, playedCards: cards, evaluation, discardsRemaining, cardsInDeck, roundHandCounts, stageHandCounts };
      modifiers.forEach((_, index) => { running = appendOperations(running, resolveOwnedOperations(modifiers, index, 'on-scoring-card', context)); });
      if (isFace(card, allFace)) faceOccurrence += 1;
    }
  });
  const context = { allFace, modifiers, scoringCards, playedCards: cards, evaluation, discardsRemaining, cardsInDeck, roundHandCounts, stageHandCounts };
  modifiers.forEach((_, index) => { running = appendOperations(running, resolveOwnedOperations(modifiers, index, 'after-scoring-cards', context)); });
  let nextRandomState = randomState;
  modifiers.forEach((owned, index) => {
    const item = modifierById(owned.catalogId);
    if (item?.handlerId === 'random-add-mult') {
      if (!nextRandomState) throw new Error('Random modifier requires serialized PRNG state');
      const rolled = randomInt(nextRandomState, item.params.max - item.params.min + 1);
      nextRandomState = rolled.state;
      running = appendOperations(running, [{
        type: 'add-mult',
        amount: item.params.min + rolled.value,
        source: item.id,
        sourceInstanceId: owned.instanceId,
        provisional: item.params.distribution
      }]);
    } else running = appendOperations(running, resolveOwnedOperations(modifiers, index, 'score-independent', context));
  });
  const updatedModifiers = modifiers.map((owned) => {
    const item = modifierById(owned.catalogId);
    const counters = { ...(owned.counters || {}) };
    if (item?.handlerId === 'play-grow-discard-shrink-mult') counters.storedMult = (counters.storedMult || 0) + item.params.amount;
    if (item?.handlerId === 'four-card-grow-chips' && cards.length === 4) counters.storedChips = (counters.storedChips || 0) + item.params.amount;
    return { ...owned, counters };
  });
  return {
    evaluation,
    scoringCardIds: scoringCards.map((card) => card.instanceId),
    chips: running.chips,
    mult: running.mult,
    score: Math.max(0, Math.floor(running.chips * running.mult)),
    trace: [...running.trace, { type: 'hand-total', chips: running.chips, mult: running.mult, score: Math.max(0, Math.floor(running.chips * running.mult)) }],
    modifiers: updatedModifiers,
    randomState: nextRandomState
  };
}

export function updateModifiersAfterDiscard(modifiers, cards) {
  return modifiers.map((owned) => {
    const item = modifierById(owned.catalogId);
    const counters = { ...(owned.counters || {}) };
    if (item?.handlerId === 'play-grow-discard-shrink-mult') counters.storedMult = Math.max(item.params.floor, (counters.storedMult || 0) - item.params.amount);
    if (item?.handlerId === 'discard-suit-grow-chips') {
      const suit = counters.suit || 'hearts';
      counters.storedChips = (counters.storedChips || 0) + cards.filter((card) => card.suit === suit).length * item.params.amount;
    }
    return { ...owned, counters };
  });
}

export const MODIFIER_HANDLER_REGISTRY = Object.fromEntries(MODIFIER_HANDLER_IDS.map((id) => [id, true]));
export const SPECIAL_RULE_HANDLER_REGISTRY = Object.fromEntries(SPECIAL_RULE_HANDLER_IDS.map((id) => [id, true]));

export function assertRegisteredHandlers(modifiers, specialRules) {
  modifiers.forEach((item) => {
    if (!MODIFIER_HANDLER_REGISTRY[item.handlerId]) throw new Error(`Unknown modifier handler: ${item.handlerId}`);
  });
  specialRules.forEach((item) => {
    if (!SPECIAL_RULE_HANDLER_REGISTRY[item.handlerId]) throw new Error(`Unknown special-rule handler: ${item.handlerId}`);
  });
  return true;
}
