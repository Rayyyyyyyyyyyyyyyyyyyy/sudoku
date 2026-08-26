import assert from 'node:assert/strict';
import test from 'node:test';
import { POKER_RULES } from '../src/data/poker/compatibility.js';
import {
  clearPokerSnapshot, emptyPokerRecords, loadPokerRecords, loadPokerSnapshot,
  migratePokerSnapshot, recordPokerCompletion, recordPokerRunStarted, savePokerSnapshot,
  validatePokerSnapshot
} from '../src/lib/poker/persistence.js';
import { createNewRun, currentRound, pokerRunReducer } from '../src/lib/poker/run.js';

function memoryStorage() {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
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
  state = { ...state, roundScore: currentRound(state).target - 1 };
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

test('purchase, modifier reorder, defeat, and victory snapshots remain exact and valid', () => {
  const storage = memoryStorage();
  const roundWin = (state, now) => {
    state = pokerRunReducer(state, { type: 'BEGIN_ROUND', now });
    state = { ...state, roundScore: currentRound(state).target - 1 };
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
