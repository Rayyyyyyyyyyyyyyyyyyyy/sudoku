import assert from 'node:assert/strict';
import test from 'node:test';
import { POKER_RULES } from '../src/data/poker/compatibility.js';
import {
  POKER_RECORDS_KEY, clearPokerSnapshot, emptyPokerRecords, loadPokerRecords, loadPokerSnapshot,
  migratePokerSnapshot, parsePokerRecords, recordPokerCompletion, recordPokerRunStarted,
  savePokerSnapshot, validatePokerSnapshot
} from '../src/lib/poker/persistence.js';
import { createNewRun, currentRound, pokerRunReducer } from '../src/lib/poker/run.js';

function memoryStorage() {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
}

function forceRoundWin(state, now) {
  state = pokerRunReducer(state, { type: 'BEGIN_ROUND', now });
  const scoreBeforePlay = currentRound(state).target - 1;
  state = { ...state, roundScore: scoreBeforePlay, totalScore: state.totalScore + scoreBeforePlay };
  state = pokerRunReducer(state, { type: 'TOGGLE_CARD', cardId: state.zones.hand[0].instanceId, now: now + 1 });
  state = pokerRunReducer(state, { type: 'PLAY', now: now + 2 });
  state = pokerRunReducer(state, { type: 'FINISH_RESOLUTION', now: now + 3 });
  return state;
}

function rejectMutation(base, mutate, pattern) {
  const result = migratePokerSnapshot(mutate(structuredClone(base)));
  assert.equal(result.status, 'incompatible');
  assert.match(result.reason, pattern);
}

test('snapshot schema round-trips exact selection, random state, zones, timers, and guards', () => {
  const storage = memoryStorage();
  let state = createNewRun({ seed: 42, now: 100 });
  state = pokerRunReducer(state, { type: 'BEGIN_ROUND', now: 101 });
  state = pokerRunReducer(state, { type: 'TOGGLE_CARD', cardId: state.zones.hand[2].instanceId, now: 102 });
  assert.equal(validatePokerSnapshot(state).ok, true);
  savePokerSnapshot(state, storage);
  assert.deepEqual(loadPokerSnapshot(storage), { status: 'ok', state });
  clearPokerSnapshot(storage);
  assert.deepEqual(loadPokerSnapshot(storage), { status: 'empty' });
});

test('stable snapshots reload after scoring, round transitions, shop, pack, reorder, loss and victory', () => {
  const storage = memoryStorage();
  let state = createNewRun({ seed: 3, now: 1 });
  const samples = [state];
  state = pokerRunReducer(state, { type: 'BEGIN_ROUND', now: 2 });
  state = pokerRunReducer(state, { type: 'TOGGLE_CARD', cardId: state.zones.hand[0].instanceId, now: 3 });
  state = { ...state, roundScore: currentRound(state).target - 1, totalScore: currentRound(state).target - 1 };
  state = pokerRunReducer(state, { type: 'PLAY', now: 4 });
  samples.push(state);
  state = pokerRunReducer(state, { type: 'FINISH_RESOLUTION', now: 4.5 });
  samples.push(state);
  state = pokerRunReducer(state, { type: 'SETTLE_ROUND', now: 5 });
  samples.push(state);
  state = { ...state, coins: 100 };
  const pack = state.offers.items.find((offer) => offer.type === 'pack');
  state = pokerRunReducer(state, { type: 'BUY_OFFER', offerId: pack.offerId, transactionId: 'pack', now: 6 });
  samples.push(state);
  state = pokerRunReducer(state, { type: 'SKIP_PACK', now: 7 });
  state = pokerRunReducer(state, { type: 'CONTINUE', now: 8 });
  samples.push(state);
  samples.forEach((sample) => {
    savePokerSnapshot(sample, storage);
    assert.deepEqual(loadPokerSnapshot(storage), { status: 'ok', state: sample });
  });
});

test('every stable reducer phase is accepted as a canonical persistence fixture', () => {
  const storage = memoryStorage();
  const phases = {};
  let state = createNewRun({ seed: 410, now: 1 });
  phases[state.phase] = state;
  state = pokerRunReducer(state, { type: 'BEGIN_ROUND', now: 2 });
  phases[state.phase] = state;
  state = { ...state, roundScore: currentRound(state).target - 1, totalScore: currentRound(state).target - 1 };
  state = pokerRunReducer(state, { type: 'TOGGLE_CARD', cardId: state.zones.hand[0].instanceId, now: 3 });
  state = pokerRunReducer(state, { type: 'PLAY', now: 4 });
  phases[state.phase] = state;
  state = pokerRunReducer(state, { type: 'FINISH_RESOLUTION', now: 5 });
  phases[state.phase] = state;
  state = pokerRunReducer(state, { type: 'SETTLE_ROUND', now: 6 });
  phases[state.phase] = state;
  state = { ...state, coins: 100 };
  const packOffer = state.offers.items.find((offer) => offer.type === 'pack');
  state = pokerRunReducer(state, { type: 'BUY_OFFER', offerId: packOffer.offerId, transactionId: 'phase-pack', now: 7 });
  phases[state.phase] = state;

  let lost = createNewRun({ seed: 411, now: 1 });
  lost = pokerRunReducer(lost, { type: 'BEGIN_ROUND', now: 2 });
  while (lost.phase === 'selecting') {
    lost = pokerRunReducer(lost, { type: 'TOGGLE_CARD', cardId: lost.zones.hand[0].instanceId, now: 3 });
    lost = pokerRunReducer(lost, { type: 'PLAY', now: 4 });
    lost = pokerRunReducer(lost, { type: 'FINISH_RESOLUTION', now: 5 });
  }
  phases[lost.phase] = lost;

  let won = createNewRun({ seed: 412, now: 1 });
  let step = 0;
  while (won.phase !== 'run-won') {
    won = forceRoundWin(won, 100 + step * 10);
    won = pokerRunReducer(won, { type: 'SETTLE_ROUND', now: 104 + step * 10 });
    if (won.phase === 'shop') won = pokerRunReducer(won, { type: 'CONTINUE', now: 105 + step * 10 });
    step += 1;
  }
  phases[won.phase] = won;

  assert.deepEqual(Object.keys(phases).sort(), ['pack', 'resolving', 'round-intro', 'round-won', 'run-lost', 'run-won', 'selecting', 'shop']);
  Object.entries(phases).forEach(([phase, sample]) => {
    assert.equal(validatePokerSnapshot(sample).ok, true, phase);
    savePokerSnapshot(sample, storage);
    assert.deepEqual(loadPokerSnapshot(storage), { status: 'ok', state: sample }, phase);
  });
});

test('canonical parser rejects invalid cursors, identities, catalogs, guards, and phase payloads', () => {
  let selecting = createNewRun({ seed: 420, now: 1 });
  selecting = pokerRunReducer(selecting, { type: 'BEGIN_ROUND', now: 2 });
  const selectedId = selecting.zones.hand[0].instanceId;
  selecting = pokerRunReducer(selecting, { type: 'TOGGLE_CARD', cardId: selectedId, now: 3 });

  rejectMutation(selecting, (state) => ({ ...state, stageIndex: 99 }), /progression cursor/);
  rejectMutation(selecting, (state) => ({ ...state, selection: [selectedId, selectedId] }), /duplicate selection/);
  rejectMutation(selecting, (state) => {
    state.zones.hand[1].instanceId = selectedId;
    return state;
  }, /exactly one zone/);
  rejectMutation(selecting, (state) => {
    state.zones.hand[0].rank = 99;
    return state;
  }, /invalid card/);
  rejectMutation(selecting, (state) => ({
    ...state,
    modifiers: [{ instanceId: 'owned-1', catalogId: 'missing-modifier', counters: {} }]
  }), /invalid modifier/);
  rejectMutation(selecting, (state) => ({
    ...state,
    modifiers: [
      { instanceId: 'owned-1', catalogId: 'flat-mult', counters: {} },
      { instanceId: 'owned-1', catalogId: 'face-card-chips', counters: {} }
    ]
  }), /duplicate modifier instance/);
  rejectMutation(selecting, (state) => ({ ...state, transactionIds: ['tx', 'tx'] }), /duplicate transaction/);
  rejectMutation(selecting, (state) => ({ ...state, completion: { ...state.completion, settledRoundIds: ['unknown'] } }), /completion guards/);
  rejectMutation(selecting, (state) => ({ ...state, pendingResolution: { nextPhase: 'shop' } }), /pending resolution is only valid/);

  let resolving = { ...selecting, roundScore: currentRound(selecting).target - 1, totalScore: currentRound(selecting).target - 1 };
  resolving = pokerRunReducer(resolving, { type: 'PLAY', now: 4 });
  rejectMutation(resolving, (state) => ({ ...state, pendingResolution: { ...state.pendingResolution, nextPhase: 'shop' } }), /pending resolution/);
  rejectMutation(resolving, (state) => ({ ...state, pendingResolution: null }), /pending resolution/);

  let shop = pokerRunReducer(pokerRunReducer(resolving, { type: 'FINISH_RESOLUTION', now: 5 }), { type: 'SETTLE_ROUND', now: 6 });
  rejectMutation(shop, (state) => ({ ...state, offers: { ...state.offers, nextCursor: { stageIndex: 8, roundIndex: 8, stageAdvanced: false } } }), /shop next cursor/);
  rejectMutation(shop, (state) => {
    state.offers.items[1].offerId = state.offers.items[0].offerId;
    return state;
  }, /duplicate shop offer/);
  rejectMutation(shop, (state) => ({ ...state, offers: null }), /shop offers/);

  shop = { ...shop, coins: 100 };
  const packOffer = shop.offers.items.find((offer) => offer.type === 'pack');
  const pack = pokerRunReducer(shop, { type: 'BUY_OFFER', offerId: packOffer.offerId, transactionId: 'open-pack', now: 7 });
  rejectMutation(pack, (state) => {
    state.packState.choices[1].choiceId = state.packState.choices[0].choiceId;
    return state;
  }, /duplicate pack choice/);
  rejectMutation(pack, (state) => ({ ...state, packState: null }), /pack state/);
});

test('canonical parser accumulates independent validation errors without exposing partial state', () => {
  const state = createNewRun({ seed: 421, now: 1 });
  const result = migratePokerSnapshot({ ...state, stageIndex: 99, transactionIds: ['same', 'same'], timers: null });
  assert.equal(result.status, 'incompatible');
  assert.equal(Object.hasOwn(result, 'state'), false);
  assert.match(result.reason, /progression cursor/);
  assert.match(result.reason, /duplicate transaction/);
  assert.match(result.reason, /invalid timers/);
});

test('purchase, modifier reorder, defeat, and victory snapshots remain exact and valid', () => {
  const storage = memoryStorage();
  const roundWin = (state, now) => {
    state = pokerRunReducer(state, { type: 'BEGIN_ROUND', now });
    const scoreBeforePlay = currentRound(state).target - 1;
    state = { ...state, roundScore: scoreBeforePlay, totalScore: state.totalScore + scoreBeforePlay };
    state = pokerRunReducer(state, { type: 'TOGGLE_CARD', cardId: state.zones.hand[0].instanceId, now: now + 1 });
    state = pokerRunReducer(state, { type: 'PLAY', now: now + 2 });
    state = pokerRunReducer(state, { type: 'FINISH_RESOLUTION', now: now + 3 });
    return pokerRunReducer(state, { type: 'SETTLE_ROUND', now: now + 4 });
  };
  let shop = roundWin(createNewRun({ seed: 55, now: 1 }), 10);
  shop = { ...shop, coins: 100 };
  const offers = shop.offers.items.filter((offer) => offer.type === 'modifier');
  offers.forEach((offer, index) => {
    shop = pokerRunReducer(shop, { type: 'BUY_OFFER', offerId: offer.offerId, transactionId: `purchase-${index}`, now: 20 + index });
  });
  shop = pokerRunReducer(shop, { type: 'MOVE_MODIFIER', instanceId: shop.modifiers[1].instanceId, direction: -1, now: 23 });

  let lost = createNewRun({ seed: 56, now: 1 });
  lost = pokerRunReducer(lost, { type: 'BEGIN_ROUND', now: 2 });
  while (lost.phase === 'selecting') {
    lost = pokerRunReducer(lost, { type: 'TOGGLE_CARD', cardId: lost.zones.hand[0].instanceId, now: 3 });
    lost = pokerRunReducer(lost, { type: 'PLAY', now: 4 });
    lost = pokerRunReducer(lost, { type: 'FINISH_RESOLUTION', now: 5 });
  }

  let won = createNewRun({ seed: 57, now: 1 });
  let step = 0;
  while (won.phase !== 'run-won') {
    won = roundWin(won, 100 + step * 10);
    if (won.phase === 'shop') won = pokerRunReducer(won, { type: 'CONTINUE', now: 105 + step * 10 });
    step += 1;
  }

  [shop, lost, won].forEach((state) => {
    assert.equal(validatePokerSnapshot(state).ok, true);
    savePokerSnapshot(state, storage);
    assert.deepEqual(loadPokerSnapshot(storage), { status: 'ok', state });
  });
});

test('incompatible recovery reports version conflict without touching records', () => {
  const state = createNewRun({ seed: 5, now: 1 });
  const result = migratePokerSnapshot({ ...state, rulesVersion: 'future-rules' });
  assert.equal(result.status, 'incompatible');
  assert.match(result.reason, /規則已更新/);
  assert.equal(POKER_RULES.persistenceVersion, 1);
});

test('packs exclude current shop modifiers and legacy overlaps remain persistable', () => {
  const storage = memoryStorage();
  let state = forceRoundWin(createNewRun({ seed: 2, now: 1 }), 2);
  state = pokerRunReducer(state, { type: 'SETTLE_ROUND', now: 6 });
  state = { ...state, coins: 100 };

  const shopModifierOffer = state.offers.items.find((offer) => offer.type === 'modifier');
  const shopModifierIds = new Set(state.offers.items.filter((offer) => offer.type === 'modifier').map((offer) => offer.itemId));
  const packOffer = state.offers.items.find((offer) => offer.type === 'pack');
  state = pokerRunReducer(state, { type: 'BUY_OFFER', offerId: packOffer.offerId, transactionId: 'overlap-pack', now: 7 });
  assert.equal(state.packState.choices.some((choice) => shopModifierIds.has(choice.itemId)), false);

  const originalChoice = state.packState.choices[0];
  const overlappingChoice = { ...originalChoice, choiceId: `legacy-${shopModifierOffer.itemId}`, itemId: shopModifierOffer.itemId };
  state = {
    ...state,
    packState: {
      ...state.packState,
      choices: state.packState.choices.map((choice, index) => index === 0 ? overlappingChoice : choice)
    }
  };

  state = pokerRunReducer(state, { type: 'TAKE_PACK_CHOICE', choiceId: overlappingChoice.choiceId, transactionId: 'overlap-choice', now: 8 });
  assert.equal(state.offers.items.find((offer) => offer.offerId === shopModifierOffer.offerId).purchased, true);
  assert.doesNotThrow(() => savePokerSnapshot(state, storage));
});

test('poker records count starts and terminal completions idempotently', () => {
  const storage = memoryStorage();
  const run = createNewRun({ seed: 6, now: 1 });
  recordPokerRunStarted(run.runId, storage);
  recordPokerRunStarted(run.runId, storage);
  let records = loadPokerRecords(storage);
  assert.equal(records.runsStarted, 1);
  const won = { ...run, phase: 'run-won', totalScore: 999 };
  recordPokerCompletion(won, storage);
  recordPokerCompletion(won, storage);
  records = loadPokerRecords(storage);
  assert.deepEqual({ runsWon: records.runsWon, highest: records.highestCompletedScore, streak: records.winStreak }, { runsWon: 1, highest: 999, streak: 1 });
  assert.notDeepEqual(records, emptyPokerRecords());
});

test('poker records normalize counters, identities, and unsupported properties before exactly-once writes', () => {
  const canonical = parsePokerRecords({
    runsStarted: -2,
    runsWon: 3,
    highestCompletedScore: Number.POSITIVE_INFINITY,
    winStreak: 1.5,
    startedRunIds: ['run-a', 'run-a', 7, '', 'run-b'],
    completedRunIds: ['run-old', null, 'run-old'],
    injected: 'not-supported'
  });
  assert.deepEqual(canonical, {
    runsStarted: 0,
    runsWon: 3,
    highestCompletedScore: 0,
    winStreak: 0,
    startedRunIds: ['run-a', 'run-b'],
    completedRunIds: ['run-old']
  });
  assert.equal(Object.hasOwn(canonical, 'injected'), false);

  const storage = memoryStorage();
  storage.setItem(POKER_RECORDS_KEY, JSON.stringify({ ...canonical, completedRunIds: ['run-final', 'run-final'], injected: true }));
  const terminal = { runId: 'run-final', phase: 'run-won', totalScore: 900 };
  recordPokerCompletion(terminal, storage);
  recordPokerCompletion(terminal, storage);
  assert.deepEqual(loadPokerRecords(storage), { ...canonical, completedRunIds: ['run-final'] });
});

test('schema-v1 legacy offer costs are removed without changing authoritative shop state', () => {
  const storage = memoryStorage();
  let shop = forceRoundWin(createNewRun({ seed: 430, now: 1 }), 2);
  shop = pokerRunReducer(shop, { type: 'SETTLE_ROUND', now: 6 });
  const legacy = {
    ...shop,
    offers: {
      ...shop.offers,
      items: shop.offers.items.map((offer, index) => ({ ...offer, cost: index === 0 ? 0 : 9999 }))
    }
  };
  const restored = migratePokerSnapshot(legacy);
  assert.equal(restored.status, 'ok');
  assert.deepEqual(restored.state.randomState, shop.randomState);
  assert.equal(restored.state.coins, shop.coins);
  assert.deepEqual(restored.state.completion, shop.completion);
  assert.deepEqual(restored.state.offers, shop.offers);
  assert.equal(restored.state.offers.items.some((offer) => Object.hasOwn(offer, 'cost')), false);
  const saved = savePokerSnapshot(legacy, storage);
  assert.deepEqual(saved, shop);
  assert.deepEqual(loadPokerSnapshot(storage), { status: 'ok', state: shop });
});

test('enriched resolving snapshots restore played and drawn identities under schema version one', () => {
  const storage = memoryStorage();
  let state = createNewRun({ seed: 88, now: 1 });
  state = pokerRunReducer(state, { type: 'BEGIN_ROUND', now: 2 });
  const playedCardIds = state.zones.hand.slice(0, 2).map((card) => card.instanceId);
  playedCardIds.forEach((cardId, index) => { state = pokerRunReducer(state, { type: 'TOGGLE_CARD', cardId, now: 3 + index }); });
  state = pokerRunReducer(state, { type: 'PLAY', now: 6 });
  assert.equal(state.schemaVersion, 1);
  assert.deepEqual(state.pendingResolution.playedCardIds, playedCardIds);
  assert.equal(state.pendingResolution.drawnCardIds.length, 2);
  savePokerSnapshot(state, storage);
  const restored = loadPokerSnapshot(storage);
  assert.deepEqual(restored, { status: 'ok', state });
  assert.deepEqual(restored.state.pendingResolution, state.pendingResolution);
});
