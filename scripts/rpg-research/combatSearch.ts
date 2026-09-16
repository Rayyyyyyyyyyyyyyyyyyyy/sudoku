import { solveInformationGraph } from './searchProbe.mjs';
import { actions, ENEMIES, previewDepth, step } from './rules.ts';
import type { BattleInfo } from './rules.ts';

// Input deliberately excludes the runtime queue and PRNG. Free observations
// can be taken before choosing any action, including a shorter spell. Taking
// all currently available free information is weakly better than ignoring it.
export function combatModel(minHp = 1) {
  return {
    key: (state: BattleInfo) => JSON.stringify(state),
    expand: (state: BattleInfo) => {
      if (state.status !== 'active') return { kind: 'terminal', won: state.status === 'won' && state.hero.hp >= minHp };
      if (state.known.length < previewDepth(state)) {
        return { kind: 'AND', children: ENEMIES[state.enemy].intents.map((_, intent) => ({ ...state, known: [...state.known, intent] })) };
      }
      const children = actions(state).map(action => step(state, action));
      // Ordering affects search cost only; every retained AND branch is still
      // required. The heuristic uses only visible outcomes, never runtime RNG.
      const score = ({ state: next, trace }: ReturnType<typeof step>) => (state.enemyHp - next.enemyHp) * 4
        + next.hero.hp - state.hero.hp + next.hero.shield + (next.stunned ? 4 : 0)
        + (next.armorBreak - state.armorBreak) * 2
        + (next.hero.mana - state.hero.mana) * (state.hero.mana < 2 ? 10 : 1)
        + (state.enemy === 'crocodile' ? (trace?.shield ?? 0) * 2 : 0);
      children.sort((a, b) => score(b) - score(a));
      return { kind: 'OR', children: children.map(c => c.state) };
    },
  };
}
export function probeBattle(info: BattleInfo, limits = { maxEdges: 48, maxNodes: 20000 }) {
  return solveInformationGraph(info, combatModel(), limits);
}
