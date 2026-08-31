import { POKER_RULES, modifierById, opponentById, packById } from '../../data/poker/compatibility.js';
import { RANKS, SUITS, ZONE_NAMES, assertZoneInvariant } from './cards.js';
import { POKER_PHASES } from './run.js';
import { validRandomState } from './random.js';

export const POKER_SNAPSHOT_KEY = 'sudoku-drill-poker-active-v1';
export const POKER_RECORDS_KEY = 'sudoku-drill-poker-records-v1';

const TERMINAL_PHASES = ['run-lost', 'run-won'];
const RESOLUTION_NEXT_PHASES = ['selecting', 'round-won', 'run-lost'];
const HAND_TYPES = Object.keys(POKER_RULES.handValues);
const COUNTER_FIELDS = ['runsStarted', 'runsWon', 'highestCompletedScore', 'winStreak'];

function defaultStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function isObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function nonnegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function finiteNonnegative(value) {
  return Number.isFinite(value) && value >= 0;
}

function uniqueStrings(value, { allowEmpty = false } = {}) {
  return Array.isArray(value)
    && value.every((item) => typeof item === 'string' && (allowEmpty || item.length > 0))
    && new Set(value).size === value.length;
}

function pushIf(errors, invalid, message) {
  if (invalid) errors.push(message);
}

function validateCountMap(value, label, errors) {
  if (!isObject(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  Object.entries(value).forEach(([key, count]) => {
    if (!HAND_TYPES.includes(key) || !nonnegativeInteger(count)) errors.push(`${label} contains an invalid hand count`);
  });
}

function validateCards(zones, errors) {
  try {
    assertZoneInvariant(zones);
  } catch (error) {
    errors.push(error.message);
    return;
  }
  const cards = ZONE_NAMES.flatMap((name) => zones[name]);
  const identities = new Set();
  cards.forEach((card) => {
    if (!isObject(card) || !nonEmptyString(card.instanceId) || !RANKS.includes(card.rank)
      || !SUITS.includes(card.suit) || typeof card.debuffed !== 'boolean') {
      errors.push('invalid card');
      return;
    }
    identities.add(`${card.suit}-${card.rank}`);
  });
  if (identities.size !== POKER_RULES.deckSize.value) errors.push('deck contains duplicate or missing cards');
}

function validateSelection(snapshot, errors) {
  if (!uniqueStrings(snapshot.selection)) {
    errors.push('invalid or duplicate selection ids');
    return;
  }
  const handIds = new Set(Array.isArray(snapshot.zones?.hand) ? snapshot.zones.hand.map((card) => card?.instanceId) : []);
  if (snapshot.selection.some((id) => !handIds.has(id)) || snapshot.selection.length > POKER_RULES.selection.value.max) {
    errors.push('selection must reference the current hand');
  }
  if (snapshot.phase !== 'selecting' && snapshot.selection.length > 0) errors.push('selection is only valid while selecting');
}

function validateModifiers(modifiers, errors) {
  if (!Array.isArray(modifiers)) {
    errors.push('invalid modifiers');
    return;
  }
  const instanceIds = [];
  const catalogIds = [];
  modifiers.forEach((owned) => {
    if (!isObject(owned) || !nonEmptyString(owned.instanceId) || !modifierById(owned.catalogId) || !isObject(owned.counters)) {
      errors.push('invalid modifier');
      return;
    }
    instanceIds.push(owned.instanceId);
    catalogIds.push(owned.catalogId);
    Object.entries(owned.counters).forEach(([key, value]) => {
      const validSuit = key === 'suit' && SUITS.includes(value);
      const validCounter = ['storedChips', 'storedMult'].includes(key) && finiteNonnegative(value);
      if (!validSuit && !validCounter) errors.push(`invalid modifier counter ${key}`);
    });
  });
  if (new Set(instanceIds).size !== instanceIds.length) errors.push('duplicate modifier instance ids');
  if (new Set(catalogIds).size !== catalogIds.length) errors.push('duplicate modifier catalog ids');
  if (modifiers.length > POKER_RULES.modifierCapacity.value) errors.push('modifier capacity exceeded');
}

function validateTimers(timers, errors) {
  const fields = ['startedAt', 'phaseStartedAt', 'elapsedMs', 'lastCommittedAt'];
  if (!isObject(timers) || fields.some((key) => !finiteNonnegative(timers[key]))) {
    errors.push('invalid timers');
    return;
  }
  if (timers.lastCommittedAt < timers.startedAt || timers.phaseStartedAt < timers.startedAt) errors.push('inconsistent timers');
}

function validateSettlement(settlement, errors) {
  if (settlement == null) return;
  const fields = ['base', 'remainingHands', 'interest', 'total', 'coinsAfter'];
  if (!isObject(settlement) || fields.some((key) => !finiteNonnegative(settlement[key]))) errors.push('invalid settlement');
}

function expectedNextCursor(opponent, stageIndex, roundIndex) {
  if (!opponent?.stages?.[stageIndex]?.rounds?.[roundIndex]) return null;
  if (roundIndex < opponent.stages[stageIndex].rounds.length - 1) {
    return { stageIndex, roundIndex: roundIndex + 1, stageAdvanced: false };
  }
  if (stageIndex < opponent.stages.length - 1) {
    return { stageIndex: stageIndex + 1, roundIndex: 0, stageAdvanced: true };
  }
  return null;
}

function cursorMatches(actual, expected) {
  return isObject(actual) && isObject(expected)
    && actual.stageIndex === expected.stageIndex
    && actual.roundIndex === expected.roundIndex
    && actual.stageAdvanced === expected.stageAdvanced;
}

function progressionRounds(opponent) {
  return opponent?.stages?.flatMap((stage) => stage.rounds) || [];
}

function validateCompletion(snapshot, opponent, errors) {
  if (!isObject(snapshot.completion) || !uniqueStrings(snapshot.completion.settledRoundIds)
    || typeof snapshot.completion.recordsApplied !== 'boolean') {
    errors.push('invalid completion guards');
    return;
  }
  const rounds = progressionRounds(opponent);
  const currentIndex = (opponent?.stages?.slice(0, snapshot.stageIndex) || [])
    .reduce((count, stage) => count + stage.rounds.length, 0) + snapshot.roundIndex;
  const settledThroughCurrent = ['shop', 'pack', 'run-won'].includes(snapshot.phase);
  const expectedCount = snapshot.phase === 'run-won' ? rounds.length : currentIndex + (settledThroughCurrent ? 1 : 0);
  const expectedIds = rounds.slice(0, expectedCount).map((round) => round.id);
  if (snapshot.completion.settledRoundIds.length !== expectedIds.length
    || snapshot.completion.settledRoundIds.some((id, index) => id !== expectedIds[index])) {
    errors.push('completion guards do not match progression');
  }
  if (snapshot.completion.recordsApplied && !TERMINAL_PHASES.includes(snapshot.phase)) errors.push('records can only be applied for a terminal run');
}

function validateOffers(snapshot, opponent, errors) {
  const offers = snapshot.offers;
  if (!isObject(offers) || !Array.isArray(offers.items) || !nonnegativeInteger(offers.rerollCount)
    || !nonEmptyString(offers.distribution)) {
    errors.push('invalid shop offers');
    return;
  }
  const expectedCursor = expectedNextCursor(opponent, snapshot.stageIndex, snapshot.roundIndex);
  if (!expectedCursor || !cursorMatches(offers.nextCursor, expectedCursor)) errors.push('invalid shop next cursor');

  const offerIds = [];
  const itemKeys = [];
  const ownedIds = new Set(Array.isArray(snapshot.modifiers) ? snapshot.modifiers.map((owned) => owned?.catalogId) : []);
  offers.items.forEach((offer) => {
    const knownItem = offer?.type === 'modifier' ? modifierById(offer?.itemId) : offer?.type === 'pack' ? packById(offer?.itemId) : null;
    if (!isObject(offer) || !nonEmptyString(offer.offerId) || !knownItem || typeof offer.purchased !== 'boolean') {
      errors.push('invalid shop offer');
      return;
    }
    offerIds.push(offer.offerId);
    itemKeys.push(`${offer.type}:${offer.itemId}`);
    if (offer.type === 'modifier' && ownedIds.has(offer.itemId) && !offer.purchased) errors.push('shop cannot offer an already-owned modifier');
  });
  if (new Set(offerIds).size !== offerIds.length) errors.push('duplicate shop offer ids');
  if (new Set(itemKeys).size !== itemKeys.length) errors.push('duplicate shop offer items');
}

function validatePack(snapshot, errors) {
  const packState = snapshot.packState;
  const pack = packById(packState?.packId);
  if (!isObject(packState) || !pack || !Array.isArray(packState.choices)
    || !nonnegativeInteger(packState.choicesRemaining) || typeof packState.canSkip !== 'boolean'
    || !nonEmptyString(packState.distribution)) {
    errors.push('invalid pack state');
    return;
  }
  if (packState.choices.length !== pack.revealCount || packState.canSkip !== pack.canSkip
    || packState.distribution !== pack.distribution) errors.push('pack state does not match catalog');
  if (!snapshot.offers?.items?.some((offer) => offer.type === 'pack' && offer.itemId === pack.id && offer.purchased)) {
    errors.push('pack state is not linked to a purchased offer');
  }

  const choiceIds = [];
  const itemIds = [];
  const ownedIds = new Set(Array.isArray(snapshot.modifiers) ? snapshot.modifiers.map((owned) => owned?.catalogId) : []);
  let takenCount = 0;
  packState.choices.forEach((choice) => {
    if (!isObject(choice) || !nonEmptyString(choice.choiceId) || !modifierById(choice.itemId) || typeof choice.taken !== 'boolean') {
      errors.push('invalid pack choice');
      return;
    }
    choiceIds.push(choice.choiceId);
    itemIds.push(choice.itemId);
    if (choice.taken) takenCount += 1;
    if (ownedIds.has(choice.itemId) !== choice.taken) errors.push('pack choice ownership is inconsistent');
  });
  if (new Set(choiceIds).size !== choiceIds.length) errors.push('duplicate pack choice ids');
  if (new Set(itemIds).size !== itemIds.length) errors.push('duplicate pack choice items');
  if (takenCount >= pack.choiceCount || packState.choicesRemaining !== pack.choiceCount - takenCount) errors.push('invalid pack choices remaining');
}

function validateResolution(snapshot, errors) {
  const pending = snapshot.pendingResolution;
  if (!isObject(pending) || !RESOLUTION_NEXT_PHASES.includes(pending.nextPhase)
    || !finiteNonnegative(pending.score) || !HAND_TYPES.includes(pending.handType)
    || !uniqueStrings(pending.playedCardIds) || !uniqueStrings(pending.drawnCardIds)) {
    errors.push('invalid pending resolution');
    return;
  }
  const playedIds = new Set(snapshot.zones?.played?.map((card) => card.instanceId));
  const handIds = new Set(snapshot.zones?.hand?.map((card) => card.instanceId));
  if (pending.playedCardIds.some((id) => !playedIds.has(id)) || pending.drawnCardIds.some((id) => !handIds.has(id))) {
    errors.push('resolution card identities do not match zones');
  }
  const round = opponentById(snapshot.opponentId)?.stages?.[snapshot.stageIndex]?.rounds?.[snapshot.roundIndex];
  if (pending.nextPhase === 'round-won' && snapshot.roundScore < round?.target) errors.push('winning resolution is below target');
  if (pending.nextPhase === 'selecting' && snapshot.roundScore >= round?.target) errors.push('selecting resolution already reached target');
  if (pending.nextPhase === 'run-lost' && snapshot.roundScore >= round?.target) errors.push('losing resolution reached target');
}

function normalizeLegacySnapshot(snapshot) {
  const offers = isObject(snapshot.offers)
    ? { ...snapshot.offers, items: Array.isArray(snapshot.offers.items) ? snapshot.offers.items.map(({ cost: _cost, ...offer }) => offer) : snapshot.offers.items }
    : snapshot.offers;
  return { ...snapshot, offers };
}

export function parsePokerSnapshot(snapshot) {
  const errors = [];
  if (!isObject(snapshot)) return { ok: false, errors: ['snapshot must be an object'] };

  pushIf(errors, snapshot.schemaVersion !== POKER_RULES.persistenceVersion, 'persistence version mismatch');
  pushIf(errors, snapshot.rulesVersion !== POKER_RULES.rulesVersion, 'rules version mismatch');
  pushIf(errors, !nonEmptyString(snapshot.runId), 'invalid run id');
  pushIf(errors, !nonnegativeInteger(snapshot.seed) || snapshot.seed > 0xffffffff, 'invalid seed');
  pushIf(errors, !POKER_PHASES.includes(snapshot.phase), 'invalid phase');

  const opponent = opponentById(snapshot.opponentId);
  pushIf(errors, !opponent, 'invalid opponent');
  const stage = opponent?.stages?.[snapshot.stageIndex];
  const round = stage?.rounds?.[snapshot.roundIndex];
  pushIf(errors, !Number.isInteger(snapshot.stageIndex) || !Number.isInteger(snapshot.roundIndex) || !round, 'invalid progression cursor');
  pushIf(errors, !validRandomState(snapshot.randomState), 'invalid random state');

  validateCards(snapshot.zones, errors);
  validateSelection(snapshot, errors);
  if (!isObject(snapshot.actions) || !['hands', 'discards', 'handSize'].every((key) => nonnegativeInteger(snapshot.actions[key]))
    || snapshot.actions.handSize < 1 || (Array.isArray(snapshot.zones?.hand) && snapshot.zones.hand.length > snapshot.actions.handSize)) {
    errors.push('invalid actions');
  }
  if (!nonnegativeInteger(snapshot.roundScore) || !nonnegativeInteger(snapshot.totalScore)
    || !nonnegativeInteger(snapshot.coins) || snapshot.totalScore < snapshot.roundScore) errors.push('invalid score or economy');

  validateModifiers(snapshot.modifiers, errors);
  if (!Array.isArray(snapshot.trace) || snapshot.trace.some((event) => !isObject(event))) errors.push('invalid trace');
  if (!uniqueStrings(snapshot.transactionIds)) errors.push('invalid or duplicate transaction ids');
  validateTimers(snapshot.timers, errors);
  validateCompletion(snapshot, opponent, errors);
  validateSettlement(snapshot.settlement, errors);
  validateCountMap(snapshot.roundState?.usedHandTypes, 'round state', errors);
  if (!isObject(snapshot.roundState) || (snapshot.roundState.lockedHandType !== null && !HAND_TYPES.includes(snapshot.roundState.lockedHandType))) {
    errors.push('invalid round state');
  }
  validateCountMap(snapshot.stageHandCounts, 'stage hand counts', errors);
  if (!uniqueStrings(snapshot.stagePlayedCardIds)
    || snapshot.stagePlayedCardIds.some((id) => !/^(clubs|diamonds|hearts|spades)-(?:[2-9]|1[0-4])$/.test(id))) {
    errors.push('invalid stage played card ids');
  }
  if (snapshot.lastAction != null && !nonEmptyString(snapshot.lastAction)) errors.push('invalid last action');

  if (['shop', 'pack'].includes(snapshot.phase)) validateOffers(snapshot, opponent, errors);
  else if (snapshot.offers !== null) errors.push('offers are only valid in shop or pack phases');
  if (snapshot.phase === 'pack') validatePack(snapshot, errors);
  else if (snapshot.packState !== null) errors.push('pack state is only valid in pack phase');
  if (snapshot.phase === 'resolving') validateResolution(snapshot, errors);
  else if (snapshot.pendingResolution !== null) errors.push('pending resolution is only valid while resolving');

  if (snapshot.phase === 'round-won' && snapshot.roundScore < (round?.target ?? Infinity)) errors.push('round-won state is below target');
  if (['shop', 'pack', 'run-won'].includes(snapshot.phase) && snapshot.settlement == null) errors.push('settled phase requires settlement data');
  if (snapshot.phase === 'run-won' && expectedNextCursor(opponent, snapshot.stageIndex, snapshot.roundIndex) !== null) errors.push('run-won state is not at the final round');
  if (snapshot.phase === 'run-lost' && snapshot.roundScore >= (round?.target ?? 0)) errors.push('run-lost state reached target');

  return errors.length ? { ok: false, errors } : { ok: true, state: normalizeLegacySnapshot(snapshot), errors: [] };
}

export function validatePokerSnapshot(snapshot) {
  const parsed = parsePokerSnapshot(snapshot);
  return { ok: parsed.ok, errors: parsed.errors };
}

export function migratePokerSnapshot(raw) {
  if (!isObject(raw)) return { status: 'incompatible', reason: '儲存資料格式無法辨識。' };
  if (raw.schemaVersion !== POKER_RULES.persistenceVersion) return { status: 'incompatible', reason: `儲存版本 ${raw.schemaVersion ?? 'unknown'} 與目前版本不相容。` };
  if (raw.rulesVersion !== POKER_RULES.rulesVersion) return { status: 'incompatible', reason: '牌局規則已更新，舊牌局無法安全續玩。' };
  const parsed = parsePokerSnapshot(raw);
  return parsed.ok ? { status: 'ok', state: parsed.state } : { status: 'incompatible', reason: `牌局資料不完整：${parsed.errors.join('、')}` };
}

export function loadPokerSnapshot(storage = defaultStorage()) {
  if (!storage) return { status: 'empty' };
  try {
    const raw = storage.getItem(POKER_SNAPSHOT_KEY);
    if (!raw) return { status: 'empty' };
    return migratePokerSnapshot(JSON.parse(raw));
  } catch (error) {
    return { status: 'incompatible', reason: '牌局資料無法解析。' };
  }
}

export function savePokerSnapshot(snapshot, storage = defaultStorage()) {
  const parsed = parsePokerSnapshot(snapshot);
  if (!parsed.ok) throw new Error(`Refusing invalid poker snapshot: ${parsed.errors.join(', ')}`);
  if (!storage) return parsed.state;
  try { storage.setItem(POKER_SNAPSHOT_KEY, JSON.stringify(parsed.state)); } catch (error) { /* unavailable storage must not break play */ }
  return parsed.state;
}

export function clearPokerSnapshot(storage = defaultStorage()) {
  if (!storage) return;
  try { storage.removeItem(POKER_SNAPSHOT_KEY); } catch (error) { /* unavailable storage */ }
}

export function emptyPokerRecords() {
  return { runsStarted: 0, runsWon: 0, highestCompletedScore: 0, winStreak: 0, startedRunIds: [], completedRunIds: [] };
}

export function parsePokerRecords(raw) {
  const defaults = emptyPokerRecords();
  if (!isObject(raw)) return defaults;
  const records = {};
  COUNTER_FIELDS.forEach((key) => { records[key] = nonnegativeInteger(raw[key]) ? raw[key] : defaults[key]; });
  ['startedRunIds', 'completedRunIds'].forEach((key) => {
    records[key] = Array.isArray(raw[key])
      ? [...new Set(raw[key].filter(nonEmptyString))]
      : defaults[key];
  });
  return records;
}

export function loadPokerRecords(storage = defaultStorage()) {
  if (!storage) return emptyPokerRecords();
  try {
    const raw = storage.getItem(POKER_RECORDS_KEY);
    return raw ? parsePokerRecords(JSON.parse(raw)) : emptyPokerRecords();
  } catch (error) { return emptyPokerRecords(); }
}

export function savePokerRecords(records, storage = defaultStorage()) {
  const canonical = parsePokerRecords(records);
  if (storage) {
    try { storage.setItem(POKER_RECORDS_KEY, JSON.stringify(canonical)); } catch (error) { /* unavailable storage */ }
  }
  return canonical;
}

export function recordPokerRunStarted(runId, storage = defaultStorage()) {
  const records = loadPokerRecords(storage);
  if (!nonEmptyString(runId) || records.startedRunIds.includes(runId)) return records;
  return savePokerRecords({ ...records, runsStarted: records.runsStarted + 1, startedRunIds: [...records.startedRunIds, runId] }, storage);
}

export function recordPokerCompletion(state, storage = defaultStorage()) {
  if (!TERMINAL_PHASES.includes(state?.phase) || !nonEmptyString(state.runId)) return loadPokerRecords(storage);
  const records = loadPokerRecords(storage);
  if (records.completedRunIds.includes(state.runId)) return records;
  const won = state.phase === 'run-won';
  return savePokerRecords({
    ...records,
    runsWon: records.runsWon + (won ? 1 : 0),
    highestCompletedScore: Math.max(records.highestCompletedScore, nonnegativeInteger(state.totalScore) ? state.totalScore : 0),
    winStreak: won ? records.winStreak + 1 : 0,
    completedRunIds: [...records.completedRunIds, state.runId]
  }, storage);
}
