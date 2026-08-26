import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MODIFIERS, MODIFIER_HANDLER_IDS, OPPONENTS, PACKS, POKER_RULES,
  SPECIAL_RULES, validateCatalogs
} from '../src/data/poker/compatibility.js';

test('versioned compatibility data validates and ships the primary 3-stage/9-round run', () => {
  const validation = validateCatalogs();
  assert.deepEqual(validation, { ok: true, errors: [] });
  assert.match(POKER_RULES.rulesVersion, /1\.0\.3\.1551/);
  const primary = OPPONENTS.find((opponent) => opponent.primary);
  assert.equal(primary.stages.length, 3);
  assert.equal(primary.stages.flatMap((stage) => stage.rounds).length, 9);
  assert.deepEqual(primary.stages.flatMap((stage) => stage.rounds.map((round) => round.type)), ['small', 'big', 'special', 'small', 'big', 'special', 'small', 'big', 'special']);
  assert.equal(OPPONENTS.filter((opponent) => !opponent.primary).every((opponent) => opponent.stages.length === 1), true);
});

test('catalog validation rejects duplicates, unknown handlers, impossible pack choices, and missing display data', () => {
  const duplicate = validateCatalogs({ modifiers: [...MODIFIERS, MODIFIERS[0]] });
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.errors.join('\n'), /duplicate id/);

  const unknown = validateCatalogs({ modifiers: [{ ...MODIFIERS[0], handlerId: 'evaluate-this-code' }] });
  assert.match(unknown.errors.join('\n'), /invalid handler/);

  const pack = validateCatalogs({ packs: [{ ...PACKS[0], choiceCount: 99 }] });
  assert.match(pack.errors.join('\n'), /impossible choice/);

  const display = validateCatalogs({ specialRules: [{ ...SPECIAL_RULES[0], display: null }] });
  assert.match(display.errors.join('\n'), /missing display/);
});

test('all 33 neutral modifiers carry stable typed metadata and use registered handler families', () => {
  assert.equal(MODIFIERS.length, 33);
  assert.equal(new Set(MODIFIERS.map((item) => item.id)).size, 33);
  MODIFIERS.forEach((item) => {
    assert.ok(MODIFIER_HANDLER_IDS.includes(item.handlerId), item.id);
    assert.ok(item.trigger && item.params && item.display.name && item.display.description, item.id);
    assert.equal(item.verificationStatus, 'inferred');
    assert.ok(Number.isFinite(item.price) && Number.isFinite(item.saleValue), item.id);
    assert.ok(item.provenance);
  });
});

test('pack and special-rule catalogs remain separate and mark provisional distributions', () => {
  assert.equal(PACKS.length, 3);
  assert.equal(SPECIAL_RULES.length, 8);
  PACKS.forEach((pack) => {
    assert.ok(pack.choiceCount <= pack.revealCount);
    assert.equal(pack.distributionVerificationStatus, 'unknown');
    assert.match(pack.distribution, /provisional/);
  });
});
