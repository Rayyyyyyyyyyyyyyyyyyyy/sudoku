import assert from 'node:assert/strict';
import test from 'node:test';
import { MODIFIERS, PACKS, POKER_RULES } from '../src/data/poker/compatibility.js';
import { generateShopOffers, openPack, progressiveShopCost, rerollCost, settleRound, shopOfferCost } from '../src/lib/poker/economy.js';
import { actionAvailability, addTestModifier, createNewRun, currentRound, pokerRunReducer, roundSettlementPreview } from '../src/lib/poker/run.js';
import { seedRandom } from '../src/lib/poker/random.js';

function begin(state, now = 2) {
  return pokerRunReducer(state, { type: 'BEGIN_ROUND', now });
}

function toggleFirst(state, now = 3) {
  return pokerRunReducer(state, { type: 'TOGGLE_CARD', cardId: state.zones.hand[0].instanceId, now });
}

function winCurrentRound(state, now = 10) {
  state = begin(state, now);
  state = { ...state, roundScore: currentRound(state).target - 1 };
  state = toggleFirst(state, now + 1);
  state = pokerRunReducer(state, { type: 'PLAY', now: now + 2 });
  assert.equal(state.phase, 'resolving');
  state = pokerRunReducer(state, { type: 'FINISH_RESOLUTION', now: now + 2.5 });
  assert.equal(state.phase, 'round-won');
  return pokerRunReducer(state, { type: 'SETTLE_ROUND', now: now + 3 });
}

function advanceTo(state, stageIndex, roundIndex) {
  let step = 0;
  while (state.stageIndex !== stageIndex || state.roundIndex !== roundIndex) {
    state = winCurrentRound(state, 100 + step * 10);
    if (state.phase !== 'shop') throw new Error('Target cursor is beyond this run');
    state = pokerRunReducer(state, { type: 'CONTINUE', now: 105 + step * 10 });
    step += 1;
  }
  return state;
}

test('same seed and action sequence produce identical card and run state', () => {
  let a = createNewRun({ seed: 123, now: 1 });
  let b = createNewRun({ seed: 123, now: 1 });
  ['BEGIN_ROUND', 'TOGGLE_CARD', 'PLAY', 'FINISH_RESOLUTION'].forEach((type, index) => {
    const action = type === 'TOGGLE_CARD' ? { type, cardId: a.zones.hand[0].instanceId, now: index + 2 } : { type, now: index + 2 };
    const actionB = type === 'TOGGLE_CARD' ? { ...action, cardId: b.zones.hand[0].instanceId } : action;
    a = pokerRunReducer(a, action);
    b = pokerRunReducer(b, actionB);
  });
  assert.deepEqual(a, b);
});

test('finite deck, action exhaustion, and invalid actions are enforced', () => {
  let state = begin(createNewRun({ seed: 8, now: 1 }));
  const unchanged = pokerRunReducer(state, { type: 'PLAY', now: 3 });
  assert.equal(unchanged, state);
  while (state.phase === 'selecting') {
    state = toggleFirst(state);
    state = pokerRunReducer(state, { type: 'PLAY', now: 4 });
    state = pokerRunReducer(state, { type: 'FINISH_RESOLUTION', now: 4.5 });
  }
  assert.equal(state.phase, 'run-lost');
  assert.equal(state.actions.hands, 0);
  assert.equal(state.zones.played.length, 4);
});

test('primary progression advances exactly three stages and nine rounds to victory', () => {
  let state = createNewRun({ seed: 77, now: 1 });
  let completed = 0;
  while (state.phase !== 'run-won') {
    state = winCurrentRound(state, 100 + completed * 10);
    completed += 1;
    if (state.phase === 'shop') state = pokerRunReducer(state, { type: 'CONTINUE', now: 105 + completed * 10 });
  }
  assert.equal(completed, 9);
  assert.equal(state.stageIndex, 2);
  assert.equal(state.roundIndex, 2);
  assert.equal(state.completion.settledRoundIds.length, 9);
});

test('researched special setup rules are applied to independent opponents', () => {
  const reachSpecial = (opponentId) => {
    return advanceTo(createNewRun({ seed: 4, opponentId, now: 1 }), 0, 2);
  };
  const zero = reachSpecial('zero-discard-trial');
  assert.equal(zero.actions.discards, 0);
  const small = reachSpecial('small-hand-trial');
  assert.equal(small.actions.handSize, 7);
  const single = reachSpecial('single-play-trial');
  assert.equal(single.actions.hands, 1);

  let unique = begin(reachSpecial('unique-hand-trial'));
  unique = { ...unique, roundState: { ...unique.roundState, usedHandTypes: { 'high-card': 1 } } };
  unique = toggleFirst(unique);
  assert.equal(actionAvailability(unique).canPlay, false);
  assert.match(actionAvailability(unique).playReason, /高牌本回合已使用/);
  assert.equal(pokerRunReducer(unique, { type: 'PLAY', now: 30 }), unique);

  let locked = begin(advanceTo(createNewRun({ seed: 9, now: 1 }), 1, 2));
  locked = { ...locked, roundState: { ...locked.roundState, lockedHandType: 'pair' } };
  locked = toggleFirst(locked);
  assert.equal(actionAvailability(locked).canPlay, false);
  assert.match(actionAvailability(locked).playReason, /已鎖定一對/);
  assert.equal(pokerRunReducer(locked, { type: 'PLAY', now: 31 }), locked);

  const finalRound = begin(advanceTo(createNewRun({ seed: 10, now: 1 }), 2, 2));
  assert.equal(currentRound(finalRound).specialRuleId, null);
  assert.equal(finalRound.actions.hands, POKER_RULES.playActions.value);
});

test('shop prices rise progressively and the first shop always has an affordable modifier', () => {
  MODIFIERS.forEach((item) => {
    const costs = Array.from({ length: 8 }, (_, index) => progressiveShopCost(item.price, index + 1));
    assert.deepEqual(costs, costs.slice().sort((a, b) => a - b), item.id);
  });
  for (let seed = 1; seed <= 100; seed += 1) {
    const generated = generateShopOffers(seedRandom(seed), 1);
    const firstModifier = generated.offers.find((offer) => offer.type === 'modifier');
    assert.ok(shopOfferCost(firstModifier, 1) <= POKER_RULES.shopPricing.value.firstShopAffordableCost);
    assert.equal(Object.hasOwn(firstModifier, 'cost'), false);
  }
  assert.ok(progressiveShopCost(8, 1) < progressiveShopCost(8, 8));
});

test('settlement, rerolls, offers, packs, purchases, reordering and selling are exactly once', () => {
  assert.deepEqual(settleRound({ coins: 25, baseReward: 3, handsRemaining: 2 }), { base: 3, remainingHands: 2, interest: 5, total: 10, coinsAfter: 35 });
  assert.deepEqual(settleRound({ coins: 25, baseReward: 3, handsRemaining: 2, rewardOverride: 7, interestOverride: 0 }), { base: 7, remainingHands: 2, interest: 0, total: 9, coinsAfter: 34 });
  assert.deepEqual([0, 1, 2, 3].map(rerollCost), [1, 2, 3, 4]);
  PACKS.forEach((pack) => {
    const opened = openPack(pack.id, seedRandom(2));
    assert.deepEqual(opened, openPack(pack.id, seedRandom(2)));
    assert.equal(opened.packState.choices.length, pack.revealCount);
    assert.equal(opened.packState.choicesRemaining, pack.choiceCount);
    assert.match(opened.packState.distribution, /provisional/);
  });

  let state = winCurrentRound(createNewRun({ seed: 22, now: 1 }));
  assert.equal(state.phase, 'shop');
  state = { ...state, coins: 100 };
  const modifierOffer = state.offers.items.find((offer) => offer.type === 'modifier');
  const purchase = { type: 'BUY_OFFER', offerId: modifierOffer.offerId, transactionId: 'tx-1', now: 20 };
  state = pokerRunReducer(state, purchase);
  const afterFirst = state;
  state = pokerRunReducer(state, purchase);
  assert.equal(state, afterFirst);
  assert.equal(state.modifiers.length, 1);

  const packOffer = state.offers.items.find((offer) => offer.type === 'pack');
  state = pokerRunReducer(state, { type: 'BUY_OFFER', offerId: packOffer.offerId, transactionId: 'tx-pack', now: 21 });
  assert.equal(state.phase, 'pack');
  const choice = state.packState.choices[0];
  state = pokerRunReducer(state, { type: 'TAKE_PACK_CHOICE', choiceId: choice.choiceId, transactionId: 'tx-choice', now: 22 });
  assert.equal(state.phase, 'shop');
  assert.equal(state.modifiers.length, 2);
  const second = state.modifiers[1].instanceId;
  state = pokerRunReducer(state, { type: 'MOVE_MODIFIER', instanceId: second, direction: -1, now: 23 });
  assert.equal(state.modifiers[0].instanceId, second);
  const coins = state.coins;
  state = pokerRunReducer(state, { type: 'SELL_MODIFIER', instanceId: second, transactionId: 'sell-1', now: 24 });
  assert.ok(state.coins >= coins);
  const sold = state;
  state = pokerRunReducer(state, { type: 'SELL_MODIFIER', instanceId: second, transactionId: 'sell-1', now: 25 });
  assert.equal(state, sold);
});

test('shop and pack generation never offer duplicate or already-owned modifiers', () => {
  let shop = addTestModifier(createNewRun({ seed: 18, now: 1 }), 'all-face-classifier');
  shop = winCurrentRound(shop);
  const ownedIds = new Set(shop.modifiers.map((owned) => owned.catalogId));
  const shopModifierIds = shop.offers.items.filter((offer) => offer.type === 'modifier').map((offer) => offer.itemId);
  assert.equal(shopModifierIds.some((itemId) => ownedIds.has(itemId)), false);
  assert.equal(new Set(shopModifierIds).size, shopModifierIds.length);

  const opened = openPack('modifier-pack-small', seedRandom(1), 0, ['owned-modifier-mult']);
  const choiceIds = opened.packState.choices.map((choice) => choice.itemId);
  assert.equal(choiceIds.includes('owned-modifier-mult'), false);
  assert.equal(new Set(choiceIds).size, choiceIds.length);
});

test('stale shop and pack payloads cannot grant an already-owned modifier', () => {
  let state = addTestModifier(createNewRun({ seed: 19, now: 1 }), 'all-face-classifier');
  state = {
    ...state,
    phase: 'shop',
    coins: 100,
    offers: {
      items: [{ offerId: 'legacy-duplicate', type: 'modifier', itemId: 'all-face-classifier', cost: 1, purchased: false }],
      rerollCount: 0,
      nextCursor: { stageIndex: 0, roundIndex: 1, stageAdvanced: false },
      distribution: 'legacy'
    }
  };
  const afterShop = pokerRunReducer(state, { type: 'BUY_OFFER', offerId: 'legacy-duplicate', transactionId: 'legacy-buy', now: 2 });
  assert.equal(afterShop, state);

  state = {
    ...state,
    phase: 'pack',
    packState: {
      packId: 'modifier-pack-small',
      choices: [{ choiceId: 'legacy-choice', itemId: 'all-face-classifier', taken: false }],
      choicesRemaining: 1,
      canSkip: true,
      distribution: 'legacy'
    }
  };
  const afterPack = pokerRunReducer(state, { type: 'TAKE_PACK_CHOICE', choiceId: 'legacy-choice', transactionId: 'legacy-take', now: 3 });
  assert.equal(afterPack, state);
});

test('forged persisted prices cannot change affordability or coin deduction', () => {
  let shop = winCurrentRound(createNewRun({ seed: 20, now: 1 }));
  const offer = shop.offers.items.find((item) => item.type === 'modifier');
  const authoritativeCost = shopOfferCost(offer, shop.completion.settledRoundIds.length);
  const forgedItems = shop.offers.items.map((item) => item.offerId === offer.offerId ? { ...item, cost: 0 } : item);
  shop = { ...shop, coins: authoritativeCost - 1, offers: { ...shop.offers, items: forgedItems } };
  const unavailable = pokerRunReducer(shop, { type: 'BUY_OFFER', offerId: offer.offerId, transactionId: 'forged-cheap', now: 20 });
  assert.equal(unavailable, shop);

  const startingCoins = authoritativeCost + 5;
  shop = {
    ...shop,
    coins: startingCoins,
    offers: {
      ...shop.offers,
      items: shop.offers.items.map((item) => item.offerId === offer.offerId ? { ...item, cost: 9999 } : item)
    }
  };
  const purchased = pokerRunReducer(shop, { type: 'BUY_OFFER', offerId: offer.offerId, transactionId: 'forged-expensive', now: 21 });
  assert.equal(purchased.coins, startingCoins - authoritativeCost);
  assert.equal(purchased.modifiers.at(-1).catalogId, offer.itemId);
});

test('committed play and discard metadata records ordered actual card replacements without changing randomness', () => {
  let discard = begin(createNewRun({ seed: 300, now: 1 }));
  const onlyReplacement = discard.zones.drawPile.at(-1);
  discard = {
    ...discard,
    zones: {
      ...discard.zones,
      drawPile: [onlyReplacement],
      discarded: [...discard.zones.discarded, ...discard.zones.drawPile.slice(0, -1)]
    }
  };
  const discardedIds = discard.zones.hand.slice(0, 3).map((card) => card.instanceId);
  discardedIds.forEach((cardId, index) => { discard = pokerRunReducer(discard, { type: 'TOGGLE_CARD', cardId, now: 3 + index }); });
  const discardRandomState = discard.randomState;
  discard = pokerRunReducer(discard, { type: 'DISCARD', now: 7 });
  assert.deepEqual(discard.trace[0].cardIds, discardedIds);
  assert.deepEqual(discard.trace[0].drawnCardIds, [onlyReplacement.instanceId]);
  assert.deepEqual(discard.randomState, discardRandomState);

  let play = begin(createNewRun({ seed: 301, now: 1 }));
  const selectedIds = play.zones.hand.slice(0, 2).map((card) => card.instanceId);
  selectedIds.forEach((cardId, index) => { play = pokerRunReducer(play, { type: 'TOGGLE_CARD', cardId, now: 3 + index }); });
  const playedInHandOrder = play.zones.hand.filter((card) => selectedIds.includes(card.instanceId)).map((card) => card.instanceId);
  const oldHandIds = new Set(play.zones.hand.map((card) => card.instanceId));
  const playRandomState = play.randomState;
  play = pokerRunReducer(play, { type: 'PLAY', now: 6 });
  assert.deepEqual(play.pendingResolution.playedCardIds, playedInHandOrder);
  assert.deepEqual(play.pendingResolution.drawnCardIds, play.zones.hand.filter((card) => !oldHandIds.has(card.instanceId)).map((card) => card.instanceId));
  assert.deepEqual(play.randomState, playRandomState);
});

test('duplicate and copied modifier operations retain exact owned instance provenance', () => {
  let state = createNewRun({ seed: 302, now: 1 });
  state = addTestModifier(state, 'copy-right-effect');
  state = addTestModifier(state, 'flat-mult');
  const [copy, source] = state.modifiers;
  state = begin(state);
  state = toggleFirst(state);
  state = pokerRunReducer(state, { type: 'PLAY', now: 4 });
  const modifierEvents = state.trace.filter((event) => event.source === 'flat-mult');
  assert.ok(modifierEvents.some((event) => event.sourceInstanceId === source.instanceId && event.copySourceInstanceId === copy.instanceId));
  assert.ok(modifierEvents.some((event) => event.sourceInstanceId === source.instanceId && !event.copySourceInstanceId));
});

test('round settlement preview is pure and matches the committed nonfinal and final settlement', () => {
  let nonfinal = createNewRun({ seed: 303, now: 1 });
  nonfinal = { ...nonfinal, phase: 'round-won', coins: 25, actions: { ...nonfinal.actions, hands: 2 } };
  const before = structuredClone(nonfinal);
  const preview = roundSettlementPreview(nonfinal);
  assert.deepEqual(nonfinal, before);
  assert.deepEqual({ base: preview.base, remainingHands: preview.remainingHands, interest: preview.interest, total: preview.total, current: preview.currentBalance, result: preview.resultingBalance, next: preview.nextPhase }, { base: currentRound(nonfinal).reward, remainingHands: 2, interest: 5, total: currentRound(nonfinal).reward + 7, current: 25, result: 25 + currentRound(nonfinal).reward + 7, next: 'shop' });
  const settled = pokerRunReducer(nonfinal, { type: 'SETTLE_ROUND', now: 2 });
  assert.deepEqual(settled.settlement, {
    base: preview.base,
    remainingHands: preview.remainingHands,
    interest: preview.interest,
    total: preview.total,
    coinsAfter: preview.coinsAfter
  });

  const final = { ...nonfinal, stageIndex: 2, roundIndex: 2 };
  const finalPreview = roundSettlementPreview(final);
  assert.equal(finalPreview.isFinal, true);
  assert.equal(finalPreview.nextPhase, 'run-won');
  assert.equal(final.coins, 25);
});
