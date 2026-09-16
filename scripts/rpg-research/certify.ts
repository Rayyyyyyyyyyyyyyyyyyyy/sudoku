import { solveInformationGraph } from './searchProbe.mjs';
import { combatModel } from './combatSearch.ts';
import { actions, ENEMIES, previewDepth, step } from './rules.ts';
import type { BattleInfo } from './rules.ts';

export const SEARCH_LIMITS = { maxEdges: 32, maxNodes: 50000, collectStrategy: true };

// A concrete robust strategy and ALL its possible terminal public states.
// These states become the next node's carried-resource inputs. No mid-build
// snapshot is substituted for them, and no failed/escaped line is a witness.
export function proveWithMargin(info: BattleInfo) {
  const model = combatModel(Math.ceil(info.hero.maxHp / 4));
  const result = solveInformationGraph(info, model, SEARCH_LIMITS);
  const terminals = new Map<string, BattleInfo>();
  const seen = new Set<string>();
  if (result.verdict === 'WIN') {
    const walk = (state: BattleInfo, depth: number) => {
      const key = JSON.stringify([model.key(state), depth]);
      if (seen.has(key)) return;
      seen.add(key);
      const node = model.expand(state);
      if (node.kind === 'terminal') {
        if (!node.won) throw new Error('Broken strategy proof');
        terminals.set(JSON.stringify(state.hero), state);
      } else if (node.kind === 'AND') {
        node.children!.forEach(child => walk(child, depth - 1));
      } else {
        const selected = result.strategy?.[key];
        if (selected === undefined) throw new Error('Missing strategy witness');
        walk(node.children![selected]!, depth - 1);
      }
    };
    walk(info, SEARCH_LIMITS.maxEdges);
  }
  return { verdict: result.verdict, expanded: result.expanded, cacheHits: result.cacheHits,
    finalStates: [...terminals.values()], minHp: terminals.size ? Math.min(...[...terminals.values()].map(s => s.hero.hp)) : null };
}

export function observedOpenings(info: BattleInfo): BattleInfo[] {
  if (info.known.length >= previewDepth(info)) return [info];
  return ENEMIES[info.enemy].intents.flatMap((_, intent) => observedOpenings({ ...info, known: [...info.known, intent] }));
}
export function openingBreadth(info: BattleInfo) {
  return observedOpenings(info).map(observed => {
    const outcomes = new Map<string, BattleInfo>();
    for (const action of actions(observed)) {
      const next = step(observed, action).state;
      outcomes.set(JSON.stringify(next), next);
    }
    const checks = [...outcomes.values()].map(state => solveInformationGraph(state, combatModel(), SEARCH_LIMITS));
    return { known: observed.known, legalOutcomes: outcomes.size,
      wins: checks.filter(r => r.verdict === 'WIN').length,
      unknown: checks.filter(r => r.verdict === 'UNKNOWN').length };
  });
}

// M3 experiment: three fixed depth-1 greedy policies. Enumerate every legal
// observed intent branch for up to 12 turns (not PRNG seeds). Count terminal
// paths, including horizon exhaustion as a non-win for these bounded policies.
// A node-budget overrun makes the measure UNKNOWN instead of altering the ratio.
export function tolerance(info: BattleInfo, maxTurns = 12, maxNodes = 50000) {
  const policies = [{ damage: 4, healing: 1, shield: 1, mana: 1 },
    { damage: 8, healing: 1, shield: 0, mana: 0 },
    { damage: 2, healing: 4, shield: 1, mana: 1 }];
  return policies.map(weights => {
    const memo = new Map<string, { wins: number; paths: number }>();
    let expanded = 0;
    let exhausted = false;
    const visit = (state: BattleInfo, remaining: number): { wins: number; paths: number } => {
      if (state.status !== 'active') return { wins: state.status === 'won' ? 1 : 0, paths: 1 };
      if (remaining === 0) return { wins: 0, paths: 1 };
      const key = JSON.stringify([state, remaining]);
      const cached = memo.get(key);
      if (cached) return cached;
      if (++expanded > maxNodes) { exhausted = true; return { wins: 0, paths: 0 }; }
      let result: { wins: number; paths: number };
      if (state.known.length < previewDepth(state)) {
        result = ENEMIES[state.enemy].intents.map((_, intent) => visit({ ...state, known: [...state.known, intent] }, remaining))
          .reduce((a, b) => ({ wins: a.wins + b.wins, paths: a.paths + b.paths }), { wins: 0, paths: 0 });
      } else {
        const options = actions(state).map(action => step(state, action).state);
        const score = (next: BattleInfo) => (state.enemyHp - next.enemyHp) * weights.damage
          + (next.hero.hp - state.hero.hp) * weights.healing + next.hero.shield * weights.shield
          + (next.hero.mana - state.hero.mana) * weights.mana * (state.hero.mana < 2 ? 10 : 1)
          + (next.stunned ? 4 : 0);
        options.sort((a, b) => score(b) - score(a));
        result = visit(options[0]!, remaining - 1);
      }
      memo.set(key, result);
      return result;
    };
    const result = visit(info, maxTurns);
    return { weights, ...result, expanded, ratio: exhausted ? null : result.wins / result.paths };
  });
}
