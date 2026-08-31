import { MODIFIERS, PACKS, POKER_RULES, modifierById, packById } from '../../data/poker/compatibility.js';
import { randomInt } from './random.js';

export function interestFor(coins, rule = POKER_RULES.interest.value) {
  return Math.min(Math.floor(Math.max(0, coins) / rule.step) * rule.coinsPerStep, rule.cap);
}

export function settleRound({ coins, baseReward, handsRemaining, rewardOverride = null, interestOverride = null }) {
  const base = rewardOverride ?? baseReward;
  const remainingHands = Math.max(0, handsRemaining);
  const interest = interestOverride ?? interestFor(coins);
  const total = base + remainingHands + interest;
  return { base, remainingHands, interest, total, coinsAfter: coins + total };
}

export function rerollCost(rerollCount) {
  if (!Number.isInteger(rerollCount) || rerollCount < 0) throw new Error('Invalid reroll count');
  return POKER_RULES.reroll.initialCost.value + rerollCount;
}

export function progressiveShopCost(basePrice, sequence = 1) {
  if (!Number.isFinite(basePrice) || basePrice < 0) throw new Error('Invalid base price');
  const pricing = POKER_RULES.shopPricing.value;
  const shopIndex = Math.max(0, (Number.isInteger(sequence) ? sequence : 1) - 1);
  const multiplier = Math.min(pricing.maximumMultiplier, pricing.initialMultiplier + shopIndex * pricing.multiplierStep);
  return Math.max(1, Math.ceil(basePrice * multiplier));
}

export function shopOfferCost(offer, sequence = 1) {
  const item = offer?.type === 'modifier' ? modifierById(offer.itemId) : packById(offer?.itemId);
  return item ? progressiveShopCost(item.price, sequence) : Number.POSITIVE_INFINITY;
}

function takeRandom(items, randomState) {
  const rolled = randomInt(randomState, items.length);
  return { item: items[rolled.value], state: rolled.state };
}

function takeRandomWithoutReplacement(items, randomState) {
  const picked = takeRandom(items, randomState);
  return {
    ...picked,
    remaining: items.filter((item) => item.id !== picked.item.id)
  };
}

function availableModifiers(excludedItemIds = []) {
  const excluded = new Set(excludedItemIds);
  return MODIFIERS.filter((item) => !excluded.has(item.id));
}

export function generateShopOffers(randomState, sequence = 0, excludedItemIds = []) {
  let state = randomState;
  const offers = [];
  let modifierPool = availableModifiers(excludedItemIds);
  for (let index = 0; index < POKER_RULES.shopDistribution.value.modifierOffers; index += 1) {
    const candidatePool = sequence <= 1 && index === 0
      ? modifierPool.filter((item) => progressiveShopCost(item.price, 1) <= POKER_RULES.shopPricing.value.firstShopAffordableCost)
      : modifierPool;
    const picked = takeRandom(candidatePool, state);
    state = picked.state;
    modifierPool = modifierPool.filter((item) => item.id !== picked.item.id);
    offers.push({ offerId: `shop-${sequence}-modifier-${index}-${picked.item.id}`, type: 'modifier', itemId: picked.item.id, purchased: false });
  }
  for (let index = 0; index < POKER_RULES.shopDistribution.value.packOffers; index += 1) {
    const picked = takeRandom(PACKS, state);
    state = picked.state;
    offers.push({ offerId: `shop-${sequence}-pack-${index}-${picked.item.id}`, type: 'pack', itemId: picked.item.id, purchased: false });
  }
  return { offers, randomState: state, distribution: POKER_RULES.shopDistribution.value.id };
}

export function openPack(packId, randomState, sequence = 0, excludedItemIds = []) {
  const pack = packById(packId);
  if (!pack) throw new Error(`Unknown pack: ${packId}`);
  let state = randomState;
  const choices = [];
  let modifierPool = availableModifiers(excludedItemIds);
  for (let index = 0; index < pack.revealCount; index += 1) {
    const picked = takeRandomWithoutReplacement(modifierPool, state);
    state = picked.state;
    modifierPool = picked.remaining;
    choices.push({ choiceId: `pack-${sequence}-${index}-${picked.item.id}`, itemId: picked.item.id, taken: false });
  }
  return {
    packState: { packId, choices, choicesRemaining: pack.choiceCount, canSkip: pack.canSkip, distribution: pack.distribution },
    randomState: state
  };
}

export function canBuyModifier(itemId, coins, modifierCount, capacity = POKER_RULES.modifierCapacity.value, sequence = 1) {
  const item = modifierById(itemId);
  return Boolean(item && coins >= progressiveShopCost(item.price, sequence) && modifierCount < capacity);
}
