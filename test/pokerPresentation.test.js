import assert from 'node:assert/strict';
import test from 'node:test';
import { cardFromCode } from '../src/lib/poker/cards.js';
import { presentScoreTrace, rarityLabel, specialRuleDescription } from '../src/lib/poker/presentation.js';

test('score presentation translates hand, card, modifier, debuff, and total events', () => {
  const king = cardFromCode('KS', 'trace');
  const rows = presentScoreTrace([
    { type: 'hand-base', handType: 'high-card', chips: 5, mult: 1 },
    { type: 'card-debuffed', source: king.instanceId, ruleId: 'face-cards-debuffed', after: { chips: 5, mult: 1 } },
    { type: 'add-mult', source: 'flat-mult', amount: 4, after: { chips: 5, mult: 5 } },
    { type: 'hand-total', chips: 5, mult: 5, score: 25 }
  ], { cards: [king] });

  assert.equal(rows[0].title, '高牌基礎');
  assert.match(rows[1].title, /K♠ 失效/);
  assert.match(rows[1].detail, /J、Q、K/);
  assert.equal(rows[2].title, '基本增幅 +4 倍率');
  assert.equal(rows[3].title, '最終 5 籌碼 × 5 倍率');
  assert.equal(rows[3].value, '= 25');
  assert.equal(rows.some((row) => /hand-base|add-mult|hand-total/.test(row.title)), false);
});

test('rarity and every constrained special rule have localized operational copy', () => {
  assert.deepEqual(['common', 'uncommon', 'rare'].map(rarityLabel), ['常見', '少見', '稀有']);
  assert.match(specialRuleDescription('single-hand-type'), /第一次出牌.*鎖定/);
  assert.match(specialRuleDescription('hand-type-once'), /最多打出 1 次/);
  assert.match(specialRuleDescription('forced-selected-card'), /剛好選擇 1 張/);
  assert.match(specialRuleDescription('face-cards-debuffed'), /仍可組成牌型.*不提供牌面籌碼/);
});
