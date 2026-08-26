const HANDS = [
  ['high-card', '高牌', 0], ['pair', '一對', 1], ['two-pair', '兩對', 2],
  ['three-kind', '三條', 3], ['straight', '順子', 4], ['flush', '同花', 5],
  ['full-house', '葫蘆', 6], ['four-kind', '四條', 7], ['straight-flush', '同花順', 8]
];

export const HAND_TYPES = HANDS.map(([id]) => id);
export const handLabel = (id) => HANDS.find(([candidate]) => candidate === id)?.[1] || id;

function groupedByRank(cards) {
  const groups = new Map();
  cards.forEach((card) => groups.set(card.rank, [...(groups.get(card.rank) || []), card]));
  return [...groups.entries()].map(([rank, entries]) => ({ rank, cards: entries })).sort((a, b) => b.cards.length - a.cards.length || b.rank - a.rank);
}

function normalizeRanks(cards) {
  const values = [...new Set(cards.map((card) => card.rank))];
  if (values.includes(14)) values.push(1);
  return values.sort((a, b) => a - b);
}

function straightCards(cards, length, allowGap) {
  const ranks = normalizeRanks(cards);
  let best = null;
  for (let start = 0; start < ranks.length; start += 1) {
    const sequence = [ranks[start]];
    for (let at = start + 1; at < ranks.length && sequence.length < length; at += 1) {
      const gap = ranks[at] - sequence[sequence.length - 1];
      if (gap === 1 || (allowGap && gap <= 2)) sequence.push(ranks[at]);
      else if (gap > (allowGap ? 2 : 1)) break;
    }
    if (sequence.length >= length) best = sequence.slice(-length);
  }
  if (!best) return [];
  return best.map((rank) => cards.find((card) => card.rank === (rank === 1 ? 14 : rank)));
}

function suitKey(card, pairedSuits) {
  if (!pairedSuits) return card.suit;
  return ['hearts', 'diamonds'].includes(card.suit) ? 'red' : 'black';
}

export function evaluateHand(cards, options = {}) {
  if (!Array.isArray(cards) || cards.length < 1 || cards.length > 5) throw new Error('Poker hands require one to five cards');
  const minShape = options.fourCardStraightFlush ? 4 : 5;
  const groups = groupedByRank(cards);
  const bySuit = new Map();
  cards.forEach((card) => {
    const key = suitKey(card, options.pairedSuits);
    bySuit.set(key, [...(bySuit.get(key) || []), card]);
  });
  const flushCards = [...bySuit.values()].filter((entry) => entry.length >= minShape).sort((a, b) => b.length - a.length)[0]?.slice(0, 5) || [];
  const straight = straightCards(cards, minShape, options.gapStraight);
  let straightFlush = [];
  bySuit.forEach((suited) => {
    const candidate = straightCards(suited, minShape, options.gapStraight);
    if (candidate.length > straightFlush.length) straightFlush = candidate;
  });

  let type;
  let contributing;
  if (straightFlush.length >= minShape) [type, contributing] = ['straight-flush', straightFlush];
  else if (groups[0].cards.length === 4) [type, contributing] = ['four-kind', groups[0].cards];
  else if (groups[0].cards.length === 3 && groups[1]?.cards.length === 2) [type, contributing] = ['full-house', [...groups[0].cards, ...groups[1].cards]];
  else if (flushCards.length >= minShape) [type, contributing] = ['flush', flushCards];
  else if (straight.length >= minShape) [type, contributing] = ['straight', straight];
  else if (groups[0].cards.length === 3) [type, contributing] = ['three-kind', groups[0].cards];
  else if (groups[0].cards.length === 2 && groups[1]?.cards.length === 2) [type, contributing] = ['two-pair', [...groups[0].cards, ...groups[1].cards]];
  else if (groups[0].cards.length === 2) [type, contributing] = ['pair', groups[0].cards];
  else {
    type = 'high-card';
    contributing = [cards.slice().sort((a, b) => b.rank - a.rank)[0]];
  }
  const rank = HANDS.find(([id]) => id === type)[2];
  return { type, label: handLabel(type), rank, contributingIds: contributing.map((card) => card.instanceId) };
}
