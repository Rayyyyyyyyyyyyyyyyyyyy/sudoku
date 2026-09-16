import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { actions, createBattle, FRAGMENT_IDS, FRAGMENTS, step } from './rules.ts';
import { createLab, LAB_VERSION, transition } from './run.ts';
import { openingBreadth, proveWithMargin, SEARCH_LIMITS, tolerance } from './certify.ts';

export const KNIGHT_BOOK = [['camel-rend', 'whale-steady'], ['living-heal', 'dead-drain'], ['elephant-stop', 'living-shield']];
export const CROCODILE_BOOK = [['living-shield', 'whale-steady'], ['living-heal', 'whale-opening'], ['camel-rend', 'elephant-stop']];
export const act = (state, action) => {
  const result = transition(state, { ...action, revision: state.revision });
  assert.equal(result.accepted, true, result.reason);
  return result.state;
};

function certifyEntry(enemy, modifiers, hero, book, boss) {
  const info = createBattle(enemy, modifiers, hero, book);
  const proof = proveWithMargin(info);
  const openings = openingBreadth(info);
  const policies = tolerance(info);
  const m3 = policies.some(p => p.ratio === null) ? null : policies.reduce((n, p) => n + p.ratio, 0) / policies.length;
  const record = { enemy, modifiers, entry: hero, book, verdict: proof.verdict,
    minFinalHp: proof.minHp, expanded: proof.expanded, cacheHits: proof.cacheHits,
    minWinningOpenings: Math.min(...openings.map(o => o.wins)), openings,
    tolerance: m3, toleranceThreshold: boss ? 0.15 : 0.30, policies };
  assert.equal(proof.verdict, 'WIN', JSON.stringify(record));
  assert.ok(proof.minHp >= hero.maxHp / 4, 'M1');
  // M2 needs three proven distinct winning openings. Other openings may remain
  // UNKNOWN; they are reported and never included in the winning count.
  assert.ok(record.minWinningOpenings >= 3, 'M2');
  assert.ok(m3 !== null && m3 >= record.toleranceThreshold, 'M3');
  return { record, terminalHeroes: proof.finalStates.map(s => ({ ...s.hero, shield: 0 })) };
}

export function zeroManaWitness() {
  const book = [['camel-rend', 'whale-steady'], ['living-heal', 'living-shield'], ['dead-pierce', 'dead-drain']];
  let state = act(createLab(0), { type: 'compose', spells: book });
  state = act(state, { type: 'enter' });
  const sequence = [0, 0, 1, 1, 0];
  for (const spell of sequence) state = act(state, { type: 'fight', action: { type: 'cast', spell } });
  assert.equal(state.phase, 'research');
  assert.equal(state.position.hero.hp, 37);
  assert.equal(state.position.hero.mana, 0);
  state = act(state, { type: 'compose', spells: CROCODILE_BOOK });
  state = act(state, { type: 'enter' });
  assert.deepEqual(actions(state.battle.info), [{ type: 'attack' }, { type: 'guard' }]);
  return { seed: 0, book, spellSequence: sequence, nextEntry: state.entry.hero,
    nextLegalActions: actions(state.battle.info), scope: 'Reachable deviation; not a certified strategy entrance' };
}

export function playContrast(badCrocodile = false) {
  const decisionTurns = [];
  const record = info => {
    // Compare changes in behavior/resources, not numeric damage magnitudes or
    // button labels. These are computed successor outcomes from the evaluator.
    const outcomes = actions(info).map(action => {
      const { state: next, trace } = step(info, action);
      return JSON.stringify({ damagesEnemy: next.enemyHp < info.enemyHp,
        heals: (trace?.heal ?? 0) > 0, shields: (trace?.shield ?? 0) > 0,
        reflects: (trace?.reflectRaw ?? 0) > 0,
        manaDirection: Math.sign(next.hero.mana - info.hero.mana),
        breaksArmor: next.armorBreak > info.armorBreak, weakens: next.weakness > info.weakness,
        stuns: next.stunned, casting: next.casting !== null, status: next.status });
    });
    decisionTurns.push(new Set(outcomes).size >= 2);
  };
  let state = act(createLab(0), { type: 'compose', spells: KNIGHT_BOOK });
  state = act(state, { type: 'enter' });
  for (let i = 0; i < 3; i++) { record(state.battle.info); state = act(state, { type: 'fight', action: { type: 'cast', spell: 0 } }); }
  assert.equal(state.phase, 'research');
  state = act(state, { type: 'compose', spells: badCrocodile
    ? [['whale-steady', 'dead-pierce'], CROCODILE_BOOK[1], CROCODILE_BOOK[2]] : CROCODILE_BOOK });
  state = act(state, { type: 'enter' });
  let turns = 0;
  while (state.phase === 'battle' && turns++ < 20) {
    record(state.battle.info);
    state = act(state, { type: 'fight', action: state.position.hero.mana >= 2 ? { type: 'cast', spell: 0 } : { type: 'guard' } });
  }
  return { state, turns, decisionTurns: decisionTurns.filter(Boolean).length,
    totalTurns: decisionTurns.length, decisionRatio: decisionTurns.filter(Boolean).length / decisionTurns.length };
}

function knightContrast(linked) {
  const spell = linked ? ['camel-rend', 'whale-steady'] : ['whale-steady'];
  let state = act(createLab(0), { type: 'compose', spells: [spell, [], []] });
  state = act(state, { type: 'enter' });
  let turns = 0;
  while (state.phase === 'battle' && turns++ < 20) state = act(state, { type: 'fight',
    action: state.position.hero.mana >= spell.length ? { type: 'cast', spell: 0 } : { type: 'guard' } });
  return { phase: state.phase, turns, hp: state.position.hero.hp };
}

export function fixedPolicies() {
  const results = [];
  for (const name of ['attack', 'cast-only', 'alternate', 'highest-lines', 'living', 'dead', 'whale', 'camel', 'elephant']) {
    let state = createLab(0);
    if (['living', 'dead', 'whale', 'camel', 'elephant'].includes(name)) state = act(state,
      { type: 'compose', spells: [FRAGMENT_IDS.filter(id => FRAGMENTS[id].component === name), [], []] });
    let round = 0;
    while (round < 60 && !['failed', 'complete'].includes(state.phase)) {
      if (state.phase === 'research') { state = act(state, { type: 'enter' }); continue; }
      const info = state.battle.info;
      const available = actions(info);
      const casts = available.filter(a => a.type === 'cast').sort((a, b) => info.spells[b.spell].length - info.spells[a.spell].length || a.spell - b.spell);
      let action;
      if (info.casting) action = { type: 'continue' };
      else if (name === 'attack') action = { type: 'attack' };
      else if (name === 'alternate' && round % 2 === 0) action = { type: 'guard' };
      else action = casts[0] ?? (name === 'cast-only' ? null : { type: 'guard' });
      if (!action) break;
      if (action.type === 'cast' && info.spells[action.spell].length === 5 && info.known.length < 2) state = act(state, { type: 'preview', spell: action.spell });
      state = act(state, { type: 'fight', action });
      round++;
    }
    results.push({ name, phase: state.phase, node: state.position.cursor, turns: round, won: state.phase === 'complete' });
  }
  return results;
}

export function verifySlice() {
  const started = performance.now();
  const initial = createLab().position.hero;
  const first = certifyEntry('knight', ['silent'], initial, KNIGHT_BOOK, false);
  const carried = first.terminalHeroes.map(hero => certifyEntry('crocodile', ['echo'], hero, CROCODILE_BOOK, true).record);
  // Escaping the first encounter restores its entry assets and commits a new
  // baseline. Prove the remaining mandatory boss directly from that baseline.
  const escaped = certifyEntry('crocodile', ['echo'], initial, CROCODILE_BOOK, true).record;
  const good = playContrast(false), bad = playContrast(true);
  assert.equal(good.state.phase, 'complete');
  assert.equal(bad.state.phase, 'failed');
  assert.ok(good.decisionRatio >= 0.60);
  const knightGood = knightContrast(true), knightBad = knightContrast(false);
  assert.equal(knightGood.phase, 'research');
  assert.ok(knightBad.phase === 'failed' || (knightBad.turns - knightGood.turns) / knightBad.turns >= 0.30);
  const policies = fixedPolicies();
  assert.ok(policies.every(p => !p.won), JSON.stringify(policies));
  return { version: LAB_VERSION, scope: 'Two-node laboratory only; no full-run, empty-profile or production certification',
    limits: SEARCH_LIMITS, heuristicVersion: 'resource-aware-greedy-v1',
    decisionEvidence: { seed: 0, decisionTurns: good.decisionTurns, totalTurns: good.totalTurns, ratio: good.decisionRatio },
    baseline: first.record, carried, escapedBaseline: escaped,
    zeroManaWitness: zeroManaWitness(), contrasts: { knight: { good: knightGood, bad: knightBad },
      crocodile: { seed: 0, good: { phase: good.state.phase, hp: good.state.position.hero.hp, turns: good.turns },
        bad: { phase: bad.state.phase, hp: bad.state.position.hero.hp, turns: bad.turns } } },
    fixedPolicies: policies, elapsedMs: Math.round((performance.now() - started) * 100) / 100 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(verifySlice(), null, 2));
