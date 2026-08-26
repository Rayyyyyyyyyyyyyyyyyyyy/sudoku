import { modifierById, specialRuleById } from '../../data/poker/compatibility.js';
import { rankLabel, suitSymbol } from './cards.js';
import { handLabel } from './evaluate.js';

export const RARITY_LABELS = {
  common: '常見',
  uncommon: '少見',
  rare: '稀有'
};

export const SPECIAL_RULE_DESCRIPTIONS = {
  'start-with-zero-discards': '本回合沒有棄牌次數；只能靠出牌與補牌達標。',
  'stage-played-cards-debuffed': '本階段先前打出過的同花色同點數牌仍可組牌型，但不提供牌面籌碼；其他效果照常觸發。',
  'hand-size-minus-one': '本回合手牌上限減少 1 張。',
  'one-hand-only': '本回合只有 1 次出牌機會。',
  'hand-type-once': '每種牌型本回合最多打出 1 次；選到已使用的牌型時不能出牌。',
  'face-cards-debuffed': 'J、Q、K 仍可組成牌型，但不提供牌面籌碼；其他效果照常觸發。',
  'single-hand-type': '第一次出牌會鎖定牌型，之後只能打出同一種牌型。',
  'forced-selected-card': '每次出牌必須剛好選擇 1 張牌。'
};

export function rarityLabel(rarity) {
  return RARITY_LABELS[rarity] || '特殊';
}

export function specialRuleDescription(ruleId) {
  return SPECIAL_RULE_DESCRIPTIONS[ruleId] || specialRuleById(ruleId)?.display.description || '依畫面提示調整本回合策略。';
}

function cardLabel(card) {
  return card ? `${rankLabel(card.rank)}${suitSymbol(card.suit)}` : null;
}

function sourceLabel(source, cards) {
  const card = cards.get(source);
  if (card) return { kind: 'card', label: cardLabel(card) };
  const modifier = modifierById(source);
  if (modifier) return { kind: 'modifier', label: modifier.display.name };
  return { kind: 'effect', label: '牌局效果' };
}

function stateValue(event) {
  if (event.score != null) return `= ${Number(event.score).toLocaleString()}`;
  if (event.after) return `${event.after.chips} 籌碼 × ${event.after.mult} 倍率`;
  if (event.chips != null && event.mult != null) return `${event.chips} 籌碼 × ${event.mult} 倍率`;
  return '';
}

export function presentScoreTrace(trace, { cards = [] } = {}) {
  const cardsById = new Map(cards.map((card) => [card.instanceId, card]));
  return trace.map((event, index) => {
    const source = sourceLabel(event.source, cardsById);
    const base = { id: `${event.type}-${index}`, value: stateValue(event) };
    if (event.type === 'hand-base') {
      return { ...base, title: `${handLabel(event.handType)}基礎`, detail: `${event.chips} 籌碼 × ${event.mult} 倍率` };
    }
    if (event.type === 'card-debuffed') {
      const rule = specialRuleById(event.ruleId);
      return {
        ...base,
        title: `${source.label} 失效 · +0 籌碼`,
        detail: `${rule?.display.name || '特殊規則'}：${specialRuleDescription(event.ruleId)}`
      };
    }
    if (event.type === 'add-chips') {
      return { ...base, title: `${source.label} +${event.amount} 籌碼`, detail: source.kind === 'card' ? '牌面籌碼' : '效果牌觸發' };
    }
    if (event.type === 'add-mult') {
      return { ...base, title: `${source.label} +${event.amount} 倍率`, detail: '加算倍率' };
    }
    if (event.type === 'multiply-mult') {
      return { ...base, title: `${source.label} ×${event.factor} 倍率`, detail: '乘算倍率' };
    }
    if (event.type === 'hand-total') {
      return { ...base, title: `最終 ${event.chips} 籌碼 × ${event.mult} 倍率`, detail: `本手獲得 ${Number(event.score).toLocaleString()} 分` };
    }
    if (event.type === 'change-counter') {
      return { ...base, title: `${source.label} 更新計數`, detail: `${event.key} ${event.amount >= 0 ? '+' : ''}${event.amount}` };
    }
    if (event.type === 'repeat-trigger') {
      return { ...base, title: `效果再次觸發 ${event.repeats} 次`, detail: '重複觸發' };
    }
    return { ...base, title: '牌局狀態更新', detail: source.label };
  });
}
