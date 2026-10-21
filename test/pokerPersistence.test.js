import assert from 'node:assert/strict';
import test from 'node:test';
import { MODIFIERS, POKER_RULES } from '../src/data/poker/compatibility.js';
import {
  POKER_RECORDS_KEY, clearPokerSnapshot, emptyPokerRecords, loadPokerRecords, loadPokerSnapshot,
  getPokerCollectionProgress, migratePokerSnapshot, parsePokerRecords, recordPokerCollection, recordPokerCompletion, recordPokerRunStarted,
  savePokerSnapshot, validatePokerSnapshot, startPokerRun, commitPokerRun, POKER_SNAPSHOT_KEY,
  loadPokerRecordsState, recoverPokerRecords
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

test('a sold first choice in a two-choice pack restores as consumed and cannot be granted twice', () => {
  let state = forceRoundWin(createNewRun({ seed: 541, now: 1 }), 2);
  state = pokerRunReducer(state, { type: 'SETTLE_ROUND', now: 6 });
  const offer = state.offers.items.find((item) => item.type === 'pack');
  state = { ...state, coins: 100, offers: { ...state.offers, items: state.offers.items.map((item) => item === offer ? { ...item, itemId: 'modifier-pack-mega' } : item) } };
  state = pokerRunReducer(state, { type: 'BUY_OFFER', offerId: offer.offerId, transactionId: 'open-two-choice-pack', now: 7 });
  const choice = state.packState.choices[0];
  const take = { type: 'TAKE_PACK_CHOICE', choiceId: choice.choiceId, transactionId: 'first-pack-choice', now: 8 };
  state = pokerRunReducer(state, take);
  state = pokerRunReducer(state, { type: 'SELL_MODIFIER', instanceId: state.modifiers[0].instanceId, transactionId: 'sell-first-choice', now: 9 });
  const storage = memoryStorage();
  savePokerSnapshot(state, storage);
  const restored = loadPokerSnapshot(storage);
  assert.deepEqual(restored, { status: 'ok', state });
  assert.equal(restored.state.modifiers.length, 0);
  assert.equal(restored.state.packState.choicesRemaining, 1);
  assert.equal(restored.state.packState.choices[0].taken, true);
  assert.equal(pokerRunReducer(restored.state, { ...take, transactionId: 'take-sold-choice-again' }), restored.state);
  rejectMutation(state, (snapshot) => {
    snapshot.modifiers = [{ instanceId: 'forged-owned', catalogId: snapshot.packState.choices[1].itemId, counters: {} }];
    return snapshot;
  }, /pack choice ownership/);
  rejectMutation(state, (snapshot) => {
    snapshot.packState.choicesRemaining = 2;
    return snapshot;
  }, /pack choices remaining/);
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
    completedRunIds: ['run-old'],
    discoveredModifierIds: []
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
  assert.deepEqual(saved, { state: shop, persisted: true });
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

test('collection accepts legacy records and filters invalid discoveries without resetting other statistics', () => {
  const legacy = { runsStarted: 12, runsWon: 5, highestCompletedScore: 12000, winStreak: 2, startedRunIds: ['old-run'], completedRunIds: ['old-run'] };
  assert.deepEqual(parsePokerRecords(legacy), { ...legacy, discoveredModifierIds: [] });
  assert.deepEqual(getPokerCollectionProgress(legacy), { collected: 0, total: MODIFIERS.length });
  const mixed = { ...legacy, discoveredModifierIds: ['flat-mult', null, 'unknown-effect', {}, 7, 'flat-mult', 'face-card-chips'] };
  assert.deepEqual(parsePokerRecords(mixed), { ...legacy, discoveredModifierIds: ['flat-mult', 'face-card-chips'] });
  assert.deepEqual(getPokerCollectionProgress(mixed), { collected: 2, total: MODIFIERS.length });
  for (const invalid of [null, 5, 'flat-mult', {}]) {
    assert.deepEqual(parsePokerRecords({ ...legacy, discoveredModifierIds: invalid }), { ...legacy, discoveredModifierIds: [] });
  }
});

test('discoveries from purchases and packs survive sale, defeat, clearing the active save, and a new run', () => {
  const storage = memoryStorage();
  const otherGames = { 'sudoku-drill-v1': '{"count":9}', 'unrelated-records': '{"wins":4}', 'unrelated-progress': 'keep-exactly' };
  Object.entries(otherGames).forEach(([key, value]) => storage.setItem(key, value));
  let state = forceRoundWin(createNewRun({ seed: 950, now: 1 }), 2);
  state = pokerRunReducer(state, { type: 'SETTLE_ROUND', now: 6 });
  state = { ...state, coins: 100 };
  recordPokerRunStarted(state.runId, storage);
  const offer = state.offers.items.find((item) => item.type === 'modifier');
  state = pokerRunReducer(state, { type: 'BUY_OFFER', offerId: offer.offerId, transactionId: 'collection-buy', now: 7 });
  recordPokerCollection(state, storage);
  const once = storage.getItem(POKER_RECORDS_KEY);
  recordPokerCollection(state, storage);
  assert.equal(storage.getItem(POKER_RECORDS_KEY), once);

  const pack = state.offers.items.find((item) => item.type === 'pack');
  state = pokerRunReducer(state, { type: 'BUY_OFFER', offerId: pack.offerId, transactionId: 'collection-pack', now: 8 });
  const choice = state.packState.choices[0];
  state = pokerRunReducer(state, { type: 'TAKE_PACK_CHOICE', choiceId: choice.choiceId, transactionId: 'collection-choice', now: 9 });
  recordPokerCollection(state, storage);
  if (state.phase === 'pack') state = pokerRunReducer(state, { type: 'SKIP_PACK', now: 10 });
  for (const owned of state.modifiers) {
    state = pokerRunReducer(state, { type: 'SELL_MODIFIER', instanceId: owned.instanceId, transactionId: `sell-${owned.instanceId}`, now: 11 });
    recordPokerCollection(state, storage);
  }
  assert.equal(state.modifiers.length, 0);
  state = pokerRunReducer(state, { type: 'CONTINUE', now: 12 });
  state = pokerRunReducer(state, { type: 'BEGIN_ROUND', now: 13 });
  while (state.phase === 'selecting') {
    state = pokerRunReducer(state, { type: 'TOGGLE_CARD', cardId: state.zones.hand[0].instanceId, now: 14 });
    state = pokerRunReducer(state, { type: 'PLAY', now: 15 });
    state = pokerRunReducer(state, { type: 'FINISH_RESOLUTION', now: 16 });
    recordPokerCollection(state, storage);
  }
  assert.equal(state.phase, 'run-lost');
  recordPokerCompletion(state, storage);
  savePokerSnapshot(state, storage);
  clearPokerSnapshot(storage);
  const fresh = createNewRun({ seed: 951, now: 20 });
  savePokerSnapshot(fresh, storage);
  recordPokerRunStarted(fresh.runId, storage);
  recordPokerCollection(fresh, storage);
  const records = loadPokerRecords(storage);
  assert.deepEqual(records.discoveredModifierIds, [offer.itemId, choice.itemId]);
  assert.equal(records.runsStarted, 2);
  assert.equal(records.highestCompletedScore, state.totalScore);
  assert.deepEqual(loadPokerSnapshot(storage).state.modifiers, []);
  Object.entries(otherGames).forEach(([key, value]) => assert.equal(storage.getItem(key), value));
});

test('invalid collection input cannot erase discoveries, run statistics, or the active snapshot', () => {
  const storage = memoryStorage();
  const records = { ...emptyPokerRecords(), runsStarted: 8, runsWon: 3, highestCompletedScore: 2200, discoveredModifierIds: ['flat-mult'] };
  storage.setItem(POKER_RECORDS_KEY, JSON.stringify(records));
  const run = createNewRun({ seed: 952, now: 1 });
  savePokerSnapshot(run, storage);
  for (const state of [null, {}, { modifiers: 'flat-mult' }, { modifiers: [null, {}, { catalogId: 'unknown' }, { catalogId: 1 }] }]) {
    assert.deepEqual(recordPokerCollection(state, storage), { records, newModifierIds: [] });
  }
  assert.deepEqual(loadPokerRecords(storage), records);
  assert.deepEqual(loadPokerSnapshot(storage).state, run);
});

test('collection reports only successful new saves and can retry after storage recovers', () => {
  const storage = memoryStorage();
  const records = { ...emptyPokerRecords(), runsStarted: 5, discoveredModifierIds: ['flat-mult'] };
  storage.setItem(POKER_RECORDS_KEY, JSON.stringify(records));
  const state = { modifiers: [{ catalogId: 'flat-mult' }, { catalogId: 'face-card-chips' }] };
  const unavailable = { ...storage, setItem() { throw new Error('quota exceeded'); } };
  assert.deepEqual(recordPokerCollection(state, unavailable), { records, newModifierIds: [] });
  assert.deepEqual(loadPokerRecords(storage), records);
  const saved = recordPokerCollection(state, storage);
  assert.deepEqual(saved.newModifierIds, ['face-card-chips']);
  assert.deepEqual(saved.records.discoveredModifierIds, ['flat-mult', 'face-card-chips']);
  assert.deepEqual(recordPokerCollection(state, storage).newModifierIds, []);
  assert.deepEqual(recordPokerCollection(state, null).newModifierIds, []);
});

test('a failed new run preserves the old snapshot and never counts a start', () => {
  const storage = memoryStorage();
  const old = createNewRun({ seed: 980, now: 1 });
  savePokerSnapshot(old, storage);
  recordPokerRunStarted(old.runId, storage);
  const before = loadPokerRecords(storage);
  const failing = { ...storage, setItem() { throw new Error('quota exceeded'); } };
  const failed = startPokerRun({ seed: 981, now: 2 }, failing);
  assert.equal(failed.persisted, false);
  assert.deepEqual(loadPokerSnapshot(storage).state, old);
  assert.deepEqual(loadPokerRecords(storage), before);
  assert.equal(startPokerRun({ seed: 981, now: 2 }, storage).state.runId, failed.state.runId);
  assert.equal(loadPokerRecords(storage).runsStarted, before.runsStarted);
  commitPokerRun(failed.state, [], storage);
  commitPokerRun(failed.state, [], storage);
  assert.equal(loadPokerRecords(storage).runsStarted, before.runsStarted + 1);
});

test('completion stays pending on a records failure and a recovered win is counted once', () => {
  const storage = memoryStorage();
  let won = createNewRun({ seed: 982, now: 1 });
  let now = 10;
  while (won.phase !== 'run-won') {
    won = forceRoundWin(won, now);
    won = pokerRunReducer(won, { type: 'SETTLE_ROUND', now: now + 4 });
    if (won.phase === 'shop') won = pokerRunReducer(won, { type: 'CONTINUE', now: now + 5 });
    now += 10;
  }
  const failing = { ...storage, setItem(key, value) {
    if (key === POKER_RECORDS_KEY) throw new Error('quota exceeded');
    storage.setItem(key, value);
  } };
  assert.equal(commitPokerRun(won, [], failing).recordsApplied, false);
  assert.equal(loadPokerSnapshot(storage).state.completion.recordsApplied, false);
  assert.equal(loadPokerRecords(storage).runsWon, 0);
  assert.equal(commitPokerRun(loadPokerSnapshot(storage).state, [], storage).recordsApplied, true);
  commitPokerRun(won, [], storage);
  assert.equal(loadPokerRecords(storage).runsWon, 1);
  assert.equal(loadPokerRecords(storage).winStreak, 1);
  assert.deepEqual(loadPokerRecords(storage).completedRunIds, [won.runId]);
});

test('a saved completion is not counted twice when its snapshot acknowledgement fails', () => {
  const storage = memoryStorage();
  const lost = { ...createNewRun({ seed: 983, now: 1 }), phase: 'run-lost', totalScore: 42 };
  assert.equal(commitPokerRun(lost, [], storage).recordsApplied, true);
  const acknowledged = pokerRunReducer(lost, { type: 'MARK_RECORDS_APPLIED', now: 2 });
  const failing = { ...storage, setItem(key, value) {
    if (key === POKER_SNAPSHOT_KEY) throw new Error('quota exceeded');
    storage.setItem(key, value);
  } };
  assert.equal(commitPokerRun(acknowledged, [], failing).persisted, false);
  const restored = loadPokerSnapshot(storage).state;
  assert.equal(restored.completion.recordsApplied, false);
  assert.equal(commitPokerRun(restored, [], storage).recordsApplied, true);
  assert.deepEqual(loadPokerRecords(storage).completedRunIds, [lost.runId]);
});

test('pending discoveries survive sale in memory and join existing records on retry', () => {
  const storage = memoryStorage();
  const run = createNewRun({ seed: 984, now: 1 });
  recordPokerRunStarted(run.runId, storage);
  storage.setItem(POKER_RECORDS_KEY, JSON.stringify({ ...loadPokerRecords(storage), runsWon: 3, discoveredModifierIds: ['flat-mult'] }));
  const owned = { ...run, modifiers: [{ instanceId: 'pending-discovery', catalogId: 'face-card-chips', counters: {} }] };
  const failing = { ...storage, setItem(key, value) {
    if (key === POKER_RECORDS_KEY) throw new Error('quota exceeded');
    storage.setItem(key, value);
  } };
  const first = commitPokerRun(owned, [], failing);
  assert.equal(first.persisted, false);
  assert.deepEqual(first.newModifierIds, []);
  const sold = commitPokerRun(run, first.pendingModifierIds, failing);
  assert.deepEqual(sold.pendingModifierIds, ['face-card-chips']);
  const retry = commitPokerRun(run, sold.pendingModifierIds, storage);
  assert.equal(retry.persisted, true);
  assert.deepEqual(retry.newModifierIds, ['face-card-chips']);
  assert.deepEqual(retry.pendingModifierIds, []);
  assert.deepEqual(loadPokerRecords(storage).discoveredModifierIds, ['flat-mult', 'face-card-chips']);
  assert.equal(loadPokerRecords(storage).runsWon, 3);
  assert.equal(loadPokerRecords(storage).runsStarted, 1);
});

test('failed records reads cannot overwrite history, and unavailable storage remains retryable', () => {
  const storage = memoryStorage();
  const run = createNewRun({ seed: 985, now: 1 });
  const before = { ...emptyPokerRecords(), runsWon: 10, discoveredModifierIds: ['flat-mult'] };
  storage.setItem(POKER_RECORDS_KEY, JSON.stringify(before));
  const unreadable = { ...storage, getItem(key) {
    if (key === POKER_RECORDS_KEY) throw new Error('storage unavailable');
    return storage.getItem(key);
  } };
  assert.equal(commitPokerRun(run, [], unreadable).persisted, false);
  assert.deepEqual(loadPokerRecords(storage), before);
  assert.equal(commitPokerRun(run, [], null).persisted, false);
  assert.equal(startPokerRun({ seed: 986, now: 2 }, null).persisted, false);
  assert.equal(commitPokerRun(run, [], storage).persisted, true);
  assert.equal(loadPokerRecords(storage).runsWon, 10);
});

test('corrupt records stay untouched until recovery backs them up, then terminal recording can finish', () => {
  const storage = memoryStorage();
  const run = { ...createNewRun({ seed: 987, now: 1 }), phase: 'run-lost', totalScore: 46 };
  savePokerSnapshot(run, storage);
  const snapshot = storage.getItem(POKER_SNAPSHOT_KEY);
  storage.setItem(POKER_RECORDS_KEY, '{');
  storage.setItem('sudoku-drill-v1', 'preserve');
  assert.deepEqual(loadPokerRecordsState(storage), { records: emptyPokerRecords(), status: 'corrupt', raw: '{' });
  assert.equal(commitPokerRun(run, [], storage).recordsApplied, false);
  const recovered = recoverPokerRecords(storage);
  assert.equal(recovered.persisted, true);
  assert.equal(storage.getItem(recovered.backupKey), '{');
  assert.equal(storage.getItem(POKER_SNAPSHOT_KEY), snapshot);
  assert.equal(storage.getItem('sudoku-drill-v1'), 'preserve');
  assert.deepEqual(loadPokerRecords(storage), emptyPokerRecords());
  assert.equal(commitPokerRun(run, [], storage).recordsApplied, true);
  commitPokerRun(run, [], storage);
  assert.deepEqual(loadPokerRecords(storage).completedRunIds, [run.runId]);
});

test('recovery never resets valid records or temporarily unreadable storage', () => {
  const storage = memoryStorage();
  const raw = JSON.stringify({ ...emptyPokerRecords(), runsWon: 5 });
  storage.setItem(POKER_RECORDS_KEY, raw);
  const noWrites = { ...storage, setItem() { assert.fail('must not write'); } };
  assert.deepEqual(recoverPokerRecords(noWrites), { persisted: true });
  const unavailable = { ...noWrites, getItem() { throw new Error('unavailable'); } };
  assert.equal(loadPokerRecordsState(unavailable).status, 'unavailable');
  assert.deepEqual(recoverPokerRecords(unavailable), { persisted: false });
  assert.deepEqual(recoverPokerRecords(null), { persisted: false });
  assert.equal(storage.getItem(POKER_RECORDS_KEY), raw);
});

test('failed backups or resets preserve the original and successful retry reuses the backup', () => {
  const storage = memoryStorage();
  storage.setItem(POKER_RECORDS_KEY, '{');
  const noBackup = { ...storage, setItem() { throw new Error('quota exceeded'); } };
  assert.equal(recoverPokerRecords(noBackup).persisted, false);
  assert.equal(storage.getItem(POKER_RECORDS_KEY), '{');
  const noReset = { ...storage, setItem(key, value) {
    if (key === POKER_RECORDS_KEY) throw new Error('quota exceeded');
    storage.setItem(key, value);
  } };
  const failed = recoverPokerRecords(noReset);
  assert.equal(failed.persisted, false);
  assert.equal(storage.getItem(failed.backupKey), '{');
  assert.equal(storage.getItem(POKER_RECORDS_KEY), '{');
  const retried = recoverPokerRecords(storage);
  assert.equal(retried.persisted, true);
  assert.equal(retried.backupKey, failed.backupKey);
  assert.equal(storage.getItem(retried.backupKey), '{');
});

test('a later recovery preserves earlier backups', () => {
  const storage = memoryStorage();
  storage.setItem(POKER_RECORDS_KEY, '{');
  const first = recoverPokerRecords(storage);
  storage.setItem(POKER_RECORDS_KEY, '[broken');
  const second = recoverPokerRecords(storage);
  assert.equal(second.persisted, true);
  assert.notEqual(first.backupKey, second.backupKey);
  assert.equal(storage.getItem(first.backupKey), '{');
  assert.equal(storage.getItem(second.backupKey), '[broken');
});
