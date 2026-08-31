import { MODIFIERS, POKER_RULES, PRIMARY_OPPONENT_ID, modifierById, opponentById, specialRuleById } from '../../data/poker/compatibility.js';
import { assertZoneInvariant, createRoundZones, drawToHand, moveSelected } from './cards.js';
import { generateShopOffers, openPack, rerollCost, settleRound, shopOfferCost } from './economy.js';
import { scoreHand, updateModifiersAfterDiscard } from './effects.js';
import { evaluateHand, handLabel } from './evaluate.js';
import { choose, seedRandom } from './random.js';

export const POKER_PHASES = ['round-intro', 'selecting', 'resolving', 'round-won', 'shop', 'pack', 'run-lost', 'run-won'];

export function currentOpponent(state) {
  return opponentById(state.opponentId);
}

export function currentStage(state) {
  return currentOpponent(state)?.stages[state.stageIndex];
}

export function currentRound(state) {
  return currentStage(state)?.rounds[state.roundIndex];
}

function initializeOwnedForRound(modifiers, randomState) {
  let state = randomState;
  const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
  const next = modifiers.map((owned) => {
    const item = modifierById(owned.catalogId);
    if (!['rotating-suit-xmult', 'discard-suit-grow-chips'].includes(item?.handlerId)) return owned;
    const picked = choose(suits, state);
    state = picked.state;
    return { ...owned, counters: { ...(owned.counters || {}), suit: picked.item } };
  });
  return { modifiers: next, randomState: state };
}

function roundSettings(state, round) {
  let handSize = POKER_RULES.handSize.value;
  let hands = POKER_RULES.playActions.value;
  let discards = POKER_RULES.discardActions.value;
  state.modifiers.forEach((owned) => {
    const item = modifierById(owned.catalogId);
    if (item?.handlerId === 'adjust-round-actions') {
      handSize = Math.max(1, handSize + item.params.handSize);
      discards = Math.max(0, discards + item.params.discards);
    }
  });
  const rule = specialRuleById(round.specialRuleId);
  if (rule?.handlerId === 'set-round-actions') {
    if (Number.isInteger(rule.params.hands)) hands = rule.params.hands;
    if (Number.isInteger(rule.params.discards)) discards = rule.params.discards;
  }
  if (rule?.handlerId === 'adjust-hand-size') handSize = Math.max(rule.params.minimum, handSize + rule.params.delta);
  return { handSize, hands, discards };
}

function prepareRound(state) {
  const round = currentRound(state);
  if (!round) throw new Error('Run cursor points outside opponent progression');
  const owned = initializeOwnedForRound(state.modifiers, state.randomState);
  const shuffled = createRoundZones(owned.randomState, `${state.runId}-${state.stageIndex}-${state.roundIndex}`);
  const prepared = { ...state, modifiers: owned.modifiers, randomState: shuffled.randomState };
  const settings = roundSettings(prepared, round);
  const zones = drawToHand(shuffled.zones, settings.handSize, settings.handSize);
  return {
    ...prepared,
    phase: 'round-intro',
    zones,
    selection: [],
    actions: { hands: settings.hands, discards: settings.discards, handSize: settings.handSize },
    roundScore: 0,
    roundState: { usedHandTypes: {}, lockedHandType: null },
    offers: null,
    packState: null,
    pendingResolution: null,
    trace: [{ type: 'round-ready', roundId: round.id, target: round.target, ruleId: round.specialRuleId }],
    timers: { ...state.timers, phaseStartedAt: state.timers.lastCommittedAt }
  };
}

export function createNewRun({ seed, opponentId = PRIMARY_OPPONENT_ID, now = Date.now() }) {
  if (!opponentById(opponentId)) throw new Error(`Unknown opponent: ${opponentId}`);
  if (!Number.isInteger(seed)) throw new Error('Run seed must be an integer');
  const runId = `run-${opponentId}-${seed >>> 0}-${Math.floor(now)}`;
  return prepareRound({
    schemaVersion: POKER_RULES.persistenceVersion,
    rulesVersion: POKER_RULES.rulesVersion,
    runId,
    seed: seed >>> 0,
    phase: 'round-intro',
    opponentId,
    stageIndex: 0,
    roundIndex: 0,
    randomState: seedRandom(seed),
    zones: null,
    selection: [],
    actions: { hands: 0, discards: 0, handSize: 0 },
    roundScore: 0,
    totalScore: 0,
    modifiers: [],
    coins: 0,
    offers: null,
    packState: null,
    trace: [],
    roundState: { usedHandTypes: {}, lockedHandType: null },
    stageHandCounts: {},
    stagePlayedCardIds: [],
    settlement: null,
    transactionIds: [],
    completion: { settledRoundIds: [], recordsApplied: false },
    timers: { startedAt: now, phaseStartedAt: now, elapsedMs: 0, lastCommittedAt: now }
  });
}

export function actionViolation(state, actionType, evaluation = null) {
  const selected = state.selection.length;
  if (state.phase !== 'selecting') return actionType === 'PLAY' ? '目前不能出牌' : '目前不能棄牌';
  if (selected < POKER_RULES.selection.value.min) return '請先選牌';
  if (selected > POKER_RULES.selection.value.max) return `每次最多選 ${POKER_RULES.selection.value.max} 張牌`;
  if (actionType === 'PLAY' && state.actions.hands < 1) return '出牌次數已用完';
  if (actionType === 'DISCARD' && state.actions.discards < 1) return '棄牌次數已用完';
  if (actionType !== 'PLAY') return null;
  const ruleId = currentRound(state).specialRuleId;
  if (!evaluation) return null;
  if (ruleId === 'hand-type-once' && state.roundState.usedHandTypes[evaluation.type]) return `${handLabel(evaluation.type)}本回合已使用，請改選其他牌型`;
  if (ruleId === 'single-hand-type' && state.roundState.lockedHandType && state.roundState.lockedHandType !== evaluation.type) return `本回合已鎖定${handLabel(state.roundState.lockedHandType)}，請選出相同牌型`;
  return null;
}

function validSelection(state, actionType, evaluation = null) {
  return actionViolation(state, actionType, evaluation) == null;
}

function refill(zones, handSize) {
  return drawToHand(zones, Math.max(0, handSize - zones.hand.length), handSize);
}

function refillWithDrawnCardIds(zones, handSize) {
  const existingIds = new Set(zones.hand.map((card) => card.instanceId));
  const refilled = refill(zones, handSize);
  return {
    zones: refilled,
    drawnCardIds: refilled.hand.filter((card) => !existingIds.has(card.instanceId)).map((card) => card.instanceId)
  };
}

function cloneWithCommit(state, changes, action, now) {
  const committedAt = Number.isFinite(now) ? now : state.timers.lastCommittedAt;
  return {
    ...state,
    ...changes,
    lastAction: action,
    timers: {
      ...state.timers,
      elapsedMs: state.timers.elapsedMs + Math.max(0, committedAt - state.timers.lastCommittedAt),
      lastCommittedAt: committedAt
    }
  };
}

function nextCursor(state) {
  if (state.roundIndex < currentStage(state).rounds.length - 1) return { stageIndex: state.stageIndex, roundIndex: state.roundIndex + 1, stageAdvanced: false };
  if (state.stageIndex < currentOpponent(state).stages.length - 1) return { stageIndex: state.stageIndex + 1, roundIndex: 0, stageAdvanced: true };
  return null;
}

export function roundSettlementPreview(state) {
  const round = currentRound(state);
  if (!round) return null;
  const reward = settleRound({ coins: state.coins, baseReward: round.reward, handsRemaining: state.actions.hands });
  const cursor = nextCursor(state);
  return {
    ...reward,
    currentBalance: state.coins,
    resultingBalance: reward.coinsAfter,
    isFinal: cursor == null,
    nextPhase: cursor ? 'shop' : 'run-won',
    nextCursor: cursor
  };
}

function modifierClassifierOptions(modifiers) {
  const handlers = modifiers.map((owned) => modifierById(owned.catalogId)?.handlerId);
  return { fourCardStraightFlush: handlers.includes('four-card-straight-flush'), gapStraight: handlers.includes('gap-straight'), pairedSuits: handlers.includes('paired-suits') };
}

function ownedModifierIds(state) {
  return state.modifiers.map((owned) => owned.catalogId);
}

function unavailablePackModifierIds(state) {
  const offered = state.offers.items
    .filter((offer) => offer.type === 'modifier' && !offer.purchased)
    .map((offer) => offer.itemId);
  return [...new Set([...ownedModifierIds(state), ...offered])];
}

export function pokerRunReducer(state, action) {
  if (!state || !action?.type) return state;
  const now = action.now;
  switch (action.type) {
    case 'BEGIN_ROUND':
      if (state.phase !== 'round-intro') return state;
      return cloneWithCommit(state, { phase: 'selecting' }, action.type, now);
    case 'TOGGLE_CARD': {
      if (state.phase !== 'selecting' || !state.zones.hand.some((card) => card.instanceId === action.cardId)) return state;
      const selected = state.selection.includes(action.cardId);
      if (!selected && state.selection.length >= POKER_RULES.selection.value.max) return state;
      return cloneWithCommit(state, { selection: selected ? state.selection.filter((id) => id !== action.cardId) : [...state.selection, action.cardId] }, action.type, now);
    }
    case 'PLAY': {
      if (!validSelection(state, 'PLAY')) return state;
      const cards = state.zones.hand.filter((card) => state.selection.includes(card.instanceId));
      const preview = evaluateHand(cards, modifierClassifierOptions(state.modifiers));
      if (!validSelection(state, 'PLAY', preview)) return state;
      const scored = scoreHand({
        cards,
        modifiers: state.modifiers,
        randomState: state.randomState,
        discardsRemaining: state.actions.discards,
        cardsInDeck: state.zones.drawPile.length,
        roundHandCounts: state.roundState.usedHandTypes,
        stageHandCounts: state.stageHandCounts,
        specialRuleId: currentRound(state).specialRuleId,
        stagePlayedCardIds: state.stagePlayedCardIds
      });
      let zones = moveSelected(state.zones, state.selection, 'played');
      const refilled = refillWithDrawnCardIds(zones, state.actions.handSize);
      zones = refilled.zones;
      assertZoneInvariant(zones);
      const hands = state.actions.hands - 1;
      const roundScore = state.roundScore + scored.score;
      const used = { ...state.roundState.usedHandTypes, [scored.evaluation.type]: (state.roundState.usedHandTypes[scored.evaluation.type] || 0) + 1 };
      const stageCounts = { ...state.stageHandCounts, [scored.evaluation.type]: (state.stageHandCounts[scored.evaluation.type] || 0) + 1 };
      let nextPhase = roundScore >= currentRound(state).target ? 'round-won' : 'selecting';
      if (nextPhase === 'selecting' && (hands === 0 || zones.hand.length === 0)) nextPhase = 'run-lost';
      return cloneWithCommit(state, {
        phase: 'resolving',
        zones,
        selection: [],
        actions: { ...state.actions, hands },
        roundScore,
        totalScore: state.totalScore + scored.score,
        modifiers: scored.modifiers,
        randomState: scored.randomState,
        roundState: { usedHandTypes: used, lockedHandType: state.roundState.lockedHandType || (currentRound(state).specialRuleId === 'single-hand-type' ? scored.evaluation.type : null) },
        stageHandCounts: stageCounts,
        stagePlayedCardIds: [...new Set([...state.stagePlayedCardIds, ...cards.map((card) => `${card.suit}-${card.rank}`)])],
        trace: scored.trace,
        pendingResolution: {
          nextPhase,
          score: scored.score,
          handType: scored.evaluation.type,
          playedCardIds: cards.map((card) => card.instanceId),
          drawnCardIds: refilled.drawnCardIds
        }
      }, action.type, now);
    }
    case 'FINISH_RESOLUTION':
      if (state.phase !== 'resolving' || !state.pendingResolution) return state;
      return cloneWithCommit(state, { phase: state.pendingResolution.nextPhase, pendingResolution: null }, action.type, now);
    case 'DISCARD': {
      if (!validSelection(state, 'DISCARD')) return state;
      const cards = state.zones.hand.filter((card) => state.selection.includes(card.instanceId));
      let zones = moveSelected(state.zones, state.selection, 'discarded');
      const refilled = refillWithDrawnCardIds(zones, state.actions.handSize);
      zones = refilled.zones;
      const discards = state.actions.discards - 1;
      const phase = zones.hand.length === 0 && state.roundScore < currentRound(state).target ? 'run-lost' : 'selecting';
      return cloneWithCommit(state, {
        phase,
        zones,
        selection: [],
        actions: { ...state.actions, discards },
        modifiers: updateModifiersAfterDiscard(state.modifiers, cards),
        trace: [{
          type: 'discard',
          cardIds: cards.map((card) => card.instanceId),
          drawnCardIds: refilled.drawnCardIds,
          discardsRemaining: discards
        }]
      }, action.type, now);
    }
    case 'SETTLE_ROUND': {
      if (state.phase !== 'round-won') return state;
      const round = currentRound(state);
      if (state.completion.settledRoundIds.includes(round.id)) return state;
      const preview = roundSettlementPreview(state);
      const {
        nextCursor: cursor,
        base,
        remainingHands,
        interest,
        total,
        coinsAfter
      } = preview;
      const reward = { base, remainingHands, interest, total, coinsAfter };
      const completion = { ...state.completion, settledRoundIds: [...state.completion.settledRoundIds, round.id] };
      if (!cursor) return cloneWithCommit(state, { phase: 'run-won', coins: reward.coinsAfter, settlement: reward, completion, trace: [...state.trace, { type: 'settlement', ...reward }] }, action.type, now);
      const generated = generateShopOffers(state.randomState, completion.settledRoundIds.length, ownedModifierIds(state));
      return cloneWithCommit(state, {
        phase: 'shop', coins: reward.coinsAfter, settlement: reward,
        offers: { items: generated.offers, rerollCount: 0, nextCursor: cursor, distribution: generated.distribution },
        randomState: generated.randomState, completion,
        trace: [...state.trace, { type: 'settlement', ...reward }]
      }, action.type, now);
    }
    case 'REROLL_SHOP': {
      if (state.phase !== 'shop' || !state.offers || (action.transactionId && state.transactionIds.includes(action.transactionId))) return state;
      const cost = rerollCost(state.offers.rerollCount);
      if (state.coins < cost) return state;
      const rerollCount = state.offers.rerollCount + 1;
      const generated = generateShopOffers(state.randomState, state.completion.settledRoundIds.length * 100 + rerollCount, ownedModifierIds(state));
      return cloneWithCommit(state, { coins: state.coins - cost, offers: { ...state.offers, items: generated.offers, rerollCount, distribution: generated.distribution }, randomState: generated.randomState, transactionIds: action.transactionId ? [...state.transactionIds, action.transactionId] : state.transactionIds, trace: [{ type: 'shop-reroll', cost, provisional: POKER_RULES.reroll.escalation.value }] }, action.type, now);
    }
    case 'BUY_OFFER': {
      if (state.phase !== 'shop' || !state.offers || state.transactionIds.includes(action.transactionId)) return state;
      const offer = state.offers.items.find((item) => item.offerId === action.offerId && !item.purchased);
      const cost = shopOfferCost(offer, state.completion.settledRoundIds.length);
      if (!offer || state.coins < cost) return state;
      if (offer.type === 'modifier' && state.modifiers.length >= POKER_RULES.modifierCapacity.value) return state;
      if (offer.type === 'modifier' && ownedModifierIds(state).includes(offer.itemId)) return state;
      const items = state.offers.items.map((item) => item.offerId === offer.offerId ? { ...item, purchased: true } : item);
      const transactionIds = [...state.transactionIds, action.transactionId];
      if (offer.type === 'modifier') {
        const instanceId = `${state.runId}-owned-${transactionIds.length}-${offer.itemId}`;
        return cloneWithCommit(state, { coins: state.coins - cost, offers: { ...state.offers, items }, modifiers: [...state.modifiers, { instanceId, catalogId: offer.itemId, counters: {} }], transactionIds, trace: [{ type: 'purchase', offerId: offer.offerId, itemId: offer.itemId, cost }] }, action.type, now);
      }
      const opened = openPack(offer.itemId, state.randomState, transactionIds.length, unavailablePackModifierIds(state));
      return cloneWithCommit(state, { phase: 'pack', coins: state.coins - cost, offers: { ...state.offers, items }, packState: opened.packState, randomState: opened.randomState, transactionIds, trace: [{ type: 'pack-opened', offerId: offer.offerId, packId: offer.itemId, cost }] }, action.type, now);
    }
    case 'TAKE_PACK_CHOICE': {
      if (state.phase !== 'pack' || !state.packState || state.packState.choicesRemaining < 1) return state;
      if (state.modifiers.length >= POKER_RULES.modifierCapacity.value || state.transactionIds.includes(action.transactionId)) return state;
      const choice = state.packState.choices.find((item) => item.choiceId === action.choiceId && !item.taken);
      if (!choice) return state;
      if (ownedModifierIds(state).includes(choice.itemId)) return state;
      const remaining = state.packState.choicesRemaining - 1;
      const choices = state.packState.choices.map((item) => item.choiceId === choice.choiceId ? { ...item, taken: true } : item);
      const offerItems = state.offers.items.map((offer) => (
        offer.type === 'modifier' && offer.itemId === choice.itemId ? { ...offer, purchased: true } : offer
      ));
      const transactionIds = [...state.transactionIds, action.transactionId];
      return cloneWithCommit(state, {
        phase: remaining === 0 ? 'shop' : 'pack',
        offers: { ...state.offers, items: offerItems },
        modifiers: [...state.modifiers, { instanceId: `${state.runId}-owned-${transactionIds.length}-${choice.itemId}`, catalogId: choice.itemId, counters: {} }],
        packState: remaining === 0 ? null : { ...state.packState, choices, choicesRemaining: remaining },
        transactionIds,
        trace: [{ type: 'pack-choice', itemId: choice.itemId }]
      }, action.type, now);
    }
    case 'SKIP_PACK':
      if (state.phase !== 'pack' || !state.packState?.canSkip) return state;
      return cloneWithCommit(state, { phase: 'shop', packState: null, trace: [{ type: 'pack-skipped' }] }, action.type, now);
    case 'SELL_MODIFIER': {
      if (!['shop', 'selecting', 'round-intro'].includes(state.phase) || state.transactionIds.includes(action.transactionId)) return state;
      const owned = state.modifiers.find((item) => item.instanceId === action.instanceId);
      const item = owned && modifierById(owned.catalogId);
      if (!item) return state;
      return cloneWithCommit(state, { modifiers: state.modifiers.filter((candidate) => candidate.instanceId !== owned.instanceId), coins: state.coins + item.saleValue, transactionIds: [...state.transactionIds, action.transactionId], trace: [{ type: 'modifier-sold', itemId: item.id, saleValue: item.saleValue }] }, action.type, now);
    }
    case 'MOVE_MODIFIER': {
      const index = state.modifiers.findIndex((item) => item.instanceId === action.instanceId);
      const target = index + action.direction;
      if (index < 0 || ![-1, 1].includes(action.direction) || target < 0 || target >= state.modifiers.length) return state;
      const modifiers = state.modifiers.slice();
      [modifiers[index], modifiers[target]] = [modifiers[target], modifiers[index]];
      return cloneWithCommit(state, { modifiers, trace: [{ type: 'modifier-moved', instanceId: action.instanceId, from: index, to: target }] }, action.type, now);
    }
    case 'CONTINUE': {
      if (state.phase !== 'shop' || !state.offers?.nextCursor) return state;
      const cursor = state.offers.nextCursor;
      return prepareRound(cloneWithCommit(state, { ...cursor, stageHandCounts: cursor.stageAdvanced ? {} : state.stageHandCounts, stagePlayedCardIds: cursor.stageAdvanced ? [] : state.stagePlayedCardIds, offers: null, settlement: null }, action.type, now));
    }
    case 'MARK_RECORDS_APPLIED':
      if (!['run-won', 'run-lost'].includes(state.phase) || state.completion.recordsApplied) return state;
      return cloneWithCommit(state, { completion: { ...state.completion, recordsApplied: true } }, action.type, now);
    default:
      return state;
  }
}

export function projectedHand(state) {
  if (!state?.zones || state.selection.length === 0) return null;
  const cards = state.zones.hand.filter((card) => state.selection.includes(card.instanceId));
  return evaluateHand(cards, modifierClassifierOptions(state.modifiers));
}

export function actionAvailability(state) {
  const evaluation = projectedHand(state);
  const playReason = actionViolation(state, 'PLAY', evaluation);
  const discardReason = actionViolation(state, 'DISCARD');
  return {
    canPlay: playReason == null,
    canDiscard: discardReason == null,
    playReason,
    discardReason
  };
}

export function addTestModifier(state, catalogId) {
  if (!MODIFIERS.some((item) => item.id === catalogId)) throw new Error(`Unknown modifier: ${catalogId}`);
  return { ...state, modifiers: [...state.modifiers, { instanceId: `${state.runId}-test-${state.modifiers.length}`, catalogId, counters: {} }] };
}
