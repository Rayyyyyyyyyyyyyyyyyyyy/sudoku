import { shuffle } from './random.js';

export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
export const ZONE_NAMES = ['drawPile', 'hand', 'played', 'discarded'];

export const rankLabel = (rank) => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[rank] || String(rank);
export const suitSymbol = (suit) => ({ clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' })[suit] || '?';

export function createStandardDeck(prefix = 'standard') {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({
    instanceId: `${prefix}-${suit}-${rank}`,
    rank,
    suit,
    debuffed: false
  })));
}

export function cardFromCode(code, prefix = 'fixture') {
  const match = /^(10|[2-9JQKA])([CDHS])$/.exec(code);
  if (!match) throw new Error(`Invalid card code: ${code}`);
  const ranks = { J: 11, Q: 12, K: 13, A: 14 };
  const suits = { C: 'clubs', D: 'diamonds', H: 'hearts', S: 'spades' };
  return {
    instanceId: `${prefix}-${code}`,
    rank: ranks[match[1]] || Number(match[1]),
    suit: suits[match[2]],
    debuffed: false
  };
}

export function createRoundZones(randomState, prefix = 'standard') {
  const result = shuffle(createStandardDeck(prefix), randomState);
  return {
    zones: { drawPile: result.items, hand: [], played: [], discarded: [] },
    randomState: result.state
  };
}

export function drawToHand(zones, count, handLimit = Infinity) {
  const next = cloneZones(zones);
  const capacity = Math.max(0, handLimit - next.hand.length);
  const drawCount = Math.min(Math.max(0, count), capacity, next.drawPile.length);
  if (drawCount) next.hand.push(...next.drawPile.splice(next.drawPile.length - drawCount, drawCount));
  assertZoneInvariant(next);
  return next;
}

export function moveSelected(zones, selectedIds, destination) {
  if (!['played', 'discarded'].includes(destination)) throw new Error(`Invalid destination: ${destination}`);
  const selected = new Set(selectedIds);
  const next = cloneZones(zones);
  const moving = next.hand.filter((card) => selected.has(card.instanceId));
  if (moving.length !== selected.size) throw new Error('Selected card is not in hand');
  next.hand = next.hand.filter((card) => !selected.has(card.instanceId));
  next[destination].push(...moving);
  assertZoneInvariant(next);
  return next;
}

export function resetRoundZones(randomState, prefix) {
  return createRoundZones(randomState, prefix);
}

export function cloneZones(zones) {
  return Object.fromEntries(ZONE_NAMES.map((name) => [name, (zones[name] || []).map((card) => ({ ...card }))]));
}

export function assertZoneInvariant(zones, expectedCount = 52) {
  const cards = ZONE_NAMES.flatMap((name) => {
    if (!Array.isArray(zones?.[name])) throw new Error(`Missing card zone ${name}`);
    return zones[name];
  });
  const ids = cards.map((card) => card?.instanceId);
  if (ids.some((id) => typeof id !== 'string') || new Set(ids).size !== ids.length) throw new Error('Every card instance must exist in exactly one zone');
  if (expectedCount != null && cards.length !== expectedCount) throw new Error(`Expected ${expectedCount} card instances, received ${cards.length}`);
  return true;
}

export function rankChips(rank) {
  if (rank === 14) return 11;
  if (rank >= 11) return 10;
  return rank;
}
