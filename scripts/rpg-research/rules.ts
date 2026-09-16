// Isolated task-0 laboratory. No production imports this module and its state
// is NOT schema 3. Promote only after the specification/certification gate.
export type Component = 'living' | 'dead' | 'whale' | 'camel' | 'elephant';
export type FragmentId = keyof typeof FRAGMENTS;
export type EnemyId = keyof typeof ENEMIES;
export type Modifier = 'silent' | 'echo';
export interface Hero { hp: number; maxHp: number; mana: number; maxMana: number; shield: number }
export interface Fragment {
  component: Component; name: string; heal?: number; shield?: number;
  hits?: readonly number[]; pierce?: boolean; opening?: number;
  break?: number; weaken?: number; stun?: boolean;
}
export const COMPONENTS: Record<Component, { name: string; symbol: string; color: string }> = {
  living: { name: '活語', symbol: '○', color: '#009e73' },
  dead: { name: '死語', symbol: '◇', color: '#cc79a7' },
  whale: { name: '獵鯨呼喊', symbol: '△', color: '#0072b2' },
  camel: { name: '駱駝詛咒', symbol: '□', color: '#d55e00' },
  elephant: { name: '象鳴', symbol: '＋', color: '#e69f00' },
};
export const FRAGMENTS = {
  'living-heal': { component: 'living', name: '回生', heal: 6 },
  'living-shield': { component: 'living', name: '護身', shield: 6 },
  'dead-pierce': { component: 'dead', name: '亡言', hits: [4], pierce: true },
  'dead-drain': { component: 'dead', name: '歸息', hits: [2], pierce: true, heal: 2 },
  'whale-steady': { component: 'whale', name: '破浪', hits: [10] },
  'whale-opening': { component: 'whale', name: '追潮', hits: [7], opening: 5 },
  'camel-rend': { component: 'camel', name: '蝕甲', break: 3 },
  'camel-weaken': { component: 'camel', name: '疲咒', break: 1, weaken: 2 },
  'elephant-roll': { component: 'elephant', name: '震地', hits: [3, 3] },
  'elephant-stop': { component: 'elephant', name: '喝止', hits: [2], stun: true },
} as const satisfies Record<string, Fragment>;
export const FRAGMENT_IDS = Object.keys(FRAGMENTS) as FragmentId[];
export interface Intent { name: string; damage: number; interrupt?: boolean }
export const ENEMIES = {
  knight: { name: '空鎧騎士', hp: 32, armor: 5, reflect: 0,
    intents: [{ name: '劍劈', damage: 4 }, { name: '盾擊・打斷', damage: 7, interrupt: true }] },
  crocodile: { name: '鐵脊龍鱷', hp: 36, armor: 1, reflect: 6,
    intents: [{ name: '啃咬', damage: 2 }, { name: '尾掃', damage: 3 }, { name: '撲擊', damage: 4 }] },
} as const;

export interface BattleInfo {
  enemy: EnemyId; modifiers: Modifier[]; enemyHp: number;
  armorBreak: number; weakness: number; stunned: boolean; echoUsed: boolean;
  hero: Hero; spells: FragmentId[][]; turn: number; known: number[];
  casting: { spell: number; remaining: number; cost: number } | null;
  status: 'active' | 'won' | 'lost';
}
export type BattleAction = { type: 'attack' | 'guard' | 'continue' } | { type: 'cast'; spell: number };
export interface EffectTrace {
  damage: number; damageLayers: number; heal: number; shield: number;
  reflectRaw: number; reflectCapped: number; reflectedHp: number;
  links: { fragment: FragmentId; armorBreak: number; bonus: number }[];
}
export function castTurns(lines: number): number { return lines <= 2 ? 0 : lines <= 4 ? 1 : 2; }
export function arrange(spell: FragmentId[]): FragmentId[] {
  const ordered = spell.filter(id => FRAGMENTS[id].component === 'camel')
    .concat(spell.filter(id => FRAGMENTS[id].component === 'whale'));
  let index = 0;
  return spell.map(id => ['camel', 'whale'].includes(FRAGMENTS[id].component) ? ordered[index++]! : id);
}
export function createBattle(enemy: EnemyId, modifiers: Modifier[], hero: Hero, spells: FragmentId[][]): BattleInfo {
  return { enemy, modifiers: [...modifiers], hero: { ...hero, shield: 0 }, spells: structuredClone(spells),
    enemyHp: ENEMIES[enemy].hp, armorBreak: 0, weakness: 0, stunned: false,
    echoUsed: false, casting: null, known: [], turn: 0, status: 'active' };
}
function hurt(hero: Hero, amount: number) {
  const absorbed = Math.min(hero.shield, amount);
  hero.shield -= absorbed;
  const loss = Math.min(hero.hp, amount - absorbed);
  hero.hp -= loss;
  return loss;
}

// All layers are evaluated against one pre-effect enemy snapshot. Thus neutral
// line permutations cannot change conditional damage or overkill reflection.
// Only a whale's preceding camel layers affect its same-action armor/bonus.
export function evaluate(info: BattleInfo, spell: FragmentId[] | 'attack'): { state: BattleInfo; trace: EffectTrace } {
  const state = structuredClone(info);
  const enemy = ENEMIES[info.enemy];
  const fragments: { id: FragmentId | null; effect: Fragment }[] = spell === 'attack'
    ? [{ id: null, effect: { component: 'whale', name: '普攻', hits: [4] } }]
    : spell.map(id => ({ id, effect: FRAGMENTS[id] }));
  const trace: EffectTrace = { damage: 0, damageLayers: 0, heal: 0, shield: 0,
    reflectRaw: 0, reflectCapped: 0, reflectedHp: 0, links: [] };
  let precedingBreak = 0;
  let precedingCamels = 0;
  let totalBreak = 0;
  for (const { id, effect } of fragments) {
    trace.heal += effect.heal ?? 0;
    trace.shield += effect.shield ?? 0;
    totalBreak += effect.break ?? 0;
    state.weakness = Math.min(ENEMIES[info.enemy].intents.reduce((n, i) => Math.max(n, i.damage), 0),
      state.weakness + (effect.weaken ?? 0));
    state.stunned ||= effect.stun ?? false;
    const linked = id !== null && effect.component === 'whale' && precedingCamels > 0;
    const armor = effect.pierce ? 0 : Math.max(0, enemy.armor - info.armorBreak - (linked ? precedingBreak : 0));
    const opening = info.enemyHp > enemy.hp / 2 ? effect.opening ?? 0 : 0;
    const damage = (effect.hits ?? []).reduce((sum, hit, index) => sum + Math.max(1,
      hit + (index === 0 ? opening + (linked ? 3 : 0) : 0) - armor), 0);
    trace.damage += damage;
    if (damage > 0) trace.damageLayers += 1;
    if (linked) trace.links.push({ fragment: id!, armorBreak: precedingBreak, bonus: 3 });
    if (effect.component === 'camel') { precedingCamels += 1; precedingBreak += effect.break ?? 0; }
  }
  state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + trace.heal);
  state.hero.shield = Math.min(state.hero.maxHp, state.hero.shield + trace.shield);
  state.enemyHp = Math.max(0, state.enemyHp - trace.damage);
  state.armorBreak = Math.min(enemy.armor, state.armorBreak + totalBreak);
  trace.reflectRaw = enemy.reflect * trace.damageLayers;
  if (trace.damage > 0 && state.modifiers.includes('echo') && !state.echoUsed) {
    trace.reflectRaw += 5;
    state.echoUsed = true;
  }
  trace.reflectCapped = Math.min(Math.floor(state.hero.maxHp / 4), trace.reflectRaw);
  trace.reflectedHp = hurt(state.hero, trace.reflectCapped);
  // Reflection resolves even on a killing blow; player death wins ties.
  if (state.hero.hp === 0) state.status = 'lost';
  else if (state.enemyHp === 0) state.status = 'won';
  if (state.status !== 'active') state.casting = null;
  return { state, trace };
}

export function canCast(info: BattleInfo, spell: number): boolean {
  const lines = info.spells[spell]?.length ?? 0;
  return info.status === 'active' && !info.casting && lines > 0 && info.hero.mana >= lines
    && !(info.modifiers.includes('silent') && castTurns(lines) > 0);
}
export function previewDepth(info: BattleInfo): number {
  return Math.max(1, ...info.spells.map((spell, i) => canCast(info, i) ? castTurns(spell.length) : 0));
}
export function actions(info: BattleInfo): BattleAction[] {
  if (info.status !== 'active') return [];
  if (info.casting) return [{ type: 'continue' }];
  return [{ type: 'attack' }, { type: 'guard' }, ...info.spells.flatMap((_, spell) =>
    canCast(info, spell) ? [{ type: 'cast' as const, spell }] : [])];
}
export function legalAction(info: BattleInfo, action: BattleAction): boolean {
  return actions(info).some(a => a.type === action.type && (a.type !== 'cast' || (action.type === 'cast' && a.spell === action.spell)));
}

// Pure public-information transition, shared by runtime and adversarial search.
// The caller supplies only already revealed catalog intent IDs, never a seed.
export function step(info: BattleInfo, action: BattleAction): { state: BattleInfo; trace: EffectTrace | null } {
  if (!legalAction(info, action)) throw new Error('Illegal battle action');
  if (info.known.length < 1) throw new Error('Current intent has not been revealed');
  let state = structuredClone(info);
  let trace: EffectTrace | null = null;
  let guarding = false;
  const enemyTurn = () => {
    if (state.status !== 'active') return;
    const intent: Intent | undefined = ENEMIES[state.enemy].intents[state.known[0]!];
    if (!intent) throw new Error('Unknown intent');
    let hit = 0;
    if (!state.stunned) hit = hurt(state.hero, Math.max(0, intent.damage - state.weakness - (guarding ? 4 : 0)));
    state.hero.shield = 0; // shield expires at the next enemy opportunity, even when stunned
    state.weakness = 0;
    state.stunned = false;
    if (state.hero.hp === 0) { state.status = 'lost'; state.casting = null; return; }
    if (state.casting && intent.interrupt && hit > 0) {
      state.hero.mana = Math.min(state.hero.maxMana, state.hero.mana + Math.floor(state.casting.cost / 2));
      state.casting = null;
    }
  };
  const release = (spell: FragmentId[] | 'attack') => {
    const result = evaluate(state, spell);
    state = result.state;
    trace = result.trace;
  };
  if (action.type === 'cast') {
    const spell = state.spells[action.spell]!;
    const turns = castTurns(spell.length);
    if (info.known.length < Math.max(1, turns)) throw new Error('Preview required before commitment');
    state.hero.mana -= spell.length;
    if (turns === 0) { release(spell); enemyTurn(); }
    else {
      state.casting = { spell: action.spell, remaining: turns, cost: spell.length };
      enemyTurn();
      if (state.casting && --state.casting.remaining === 0) {
        state.casting = null;
        release(spell);
      }
    }
  } else if (action.type === 'continue') {
    const spell = state.spells[state.casting!.spell]!;
    enemyTurn();
    if (state.casting && --state.casting.remaining === 0) { state.casting = null; release(spell); }
  } else {
    if (action.type === 'guard') {
      guarding = true;
      state.hero.mana = Math.min(state.hero.maxMana, state.hero.mana + 1);
    } else release('attack');
    enemyTurn();
  }
  state.turn += 1;
  state.known.shift();
  return { state, trace };
}
