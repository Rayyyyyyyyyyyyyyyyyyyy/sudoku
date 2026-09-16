import { nextRandom, seedRandom } from '../../src/lib/seededRandom.js';
import { arrange, canCast, castTurns, createBattle, ENEMIES, FRAGMENT_IDS, FRAGMENTS, step } from './rules.ts';
import type { BattleAction, BattleInfo, FragmentId, Hero, Modifier, EnemyId } from './rules.ts';

export const LAB_VERSION = 'spell-research-lab-1';
export const NODES: { id: string; enemy: EnemyId; modifiers: Modifier[]; boss: boolean }[] = [
  { id: 'knight', enemy: 'knight', modifiers: ['silent'], boss: false },
  { id: 'crocodile', enemy: 'crocodile', modifiers: ['echo'], boss: true },
];
export type Book = (FragmentId | null)[][];
export interface Position {
  hero: Hero; inventory: FragmentId[]; book: Book; cursor: number; escape: boolean; escaped: string[];
}
export interface LabState {
  labVersion: typeof LAB_VERSION; revision: number; seed: number;
  profile: { insight: number; discoveries: string[]; victories: number; expeditions: number };
  phase: 'research' | 'battle' | 'failed' | 'complete'; position: Position; baseline: Position;
  entry: Position | null;
  battle: { info: BattleInfo; queue: number[]; random: ReturnType<typeof seedRandom> } | null;
}
export type LabAction = ({ type: 'enter' | 'retry' | 'escape' | 'restart' }
  | { type: 'preview'; spell: number }
  | { type: 'move'; fragment: FragmentId; spell: number; slot: number }
  | { type: 'compose'; spells: FragmentId[][] }
  | { type: 'arrange'; spell: number }
  | { type: 'fight'; action: BattleAction }) & { revision: number };

export function nodeSeed(seed: number, node: string): number {
  // Explicit chapter/attempt/domain even in this one-chapter fixed laboratory.
  const domain = `${LAB_VERSION}|${seed >>> 0}|chapter:0|attempt:0|${node}|combat`;
  let value = 2166136261;
  for (const char of domain) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
  return value;
}
export function initialPosition(): Position {
  const spells: FragmentId[][] = [
    ['camel-rend', 'whale-steady'], ['living-heal', 'dead-drain'],
    ['living-shield', 'dead-pierce', 'whale-opening', 'elephant-roll', 'elephant-stop'],
  ];
  return { hero: { hp: 40, maxHp: 40, mana: 10, maxMana: 10, shield: 0 },
    inventory: [...FRAGMENT_IDS], book: spells.map(spell => [...spell, ...Array(5 - spell.length).fill(null)]),
    cursor: 0, escape: true, escaped: [] };
}
export function createLab(seed = 42): LabState {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid seed');
  const position = initialPosition();
  return { labVersion: LAB_VERSION, revision: 0, seed, profile: { insight: 0, discoveries: [], victories: 0, expeditions: 1 },
    phase: 'research', position, baseline: structuredClone(position), entry: null, battle: null };
}
export function spells(position: Position): FragmentId[][] {
  return position.book.map(spell => spell.filter((id): id is FragmentId => id !== null));
}
function replenish(battle: NonNullable<LabState['battle']>) {
  while (battle.queue.length < 2) {
    const draw = nextRandom(battle.random);
    battle.random = draw.state;
    battle.queue.push(Math.floor(draw.value * ENEMIES[battle.info.enemy].intents.length));
  }
}
function validBook(book: unknown, inventory: FragmentId[]): book is FragmentId[][] {
  if (!Array.isArray(book) || book.length !== 3) return false;
  const ids = book.flat();
  return book.every(spell => Array.isArray(spell) && spell.length <= 5)
    && ids.every(id => typeof id === 'string' && Object.hasOwn(FRAGMENTS, id) && inventory.includes(id as FragmentId))
    && new Set(ids).size === ids.length;
}
export function transition(state: LabState, action: LabAction): { state: LabState; accepted: boolean; reason?: string } {
  const refuse = (reason: string) => ({ state, accepted: false, reason });
  if (action.revision !== state.revision) return refuse('過期操作');
  const next = structuredClone(state);
  const node = NODES[state.position.cursor];
  if (action.type === 'restart') {
    const fresh = createLab(state.seed);
    fresh.profile = { ...structuredClone(state.profile), expeditions: state.profile.expeditions + 1 };
    fresh.revision = state.revision + 1;
    return { state: fresh, accepted: true };
  }
  if (action.type === 'compose' || action.type === 'move' || action.type === 'arrange') {
    if (state.phase !== 'research') return refuse('僅可在戰前研究');
    if (action.type === 'compose') {
      if (!validBook(action.spells, state.position.inventory)) return refuse('非法或重複殘頁');
      next.position.book = action.spells.map(spell => [...spell, ...Array(5 - spell.length).fill(null)]);
    } else if (action.type === 'move') {
      if (!state.position.inventory.includes(action.fragment) || !Number.isInteger(action.spell)
        || !Number.isInteger(action.slot) || action.spell < 0 || action.spell >= 3 || action.slot < 0 || action.slot >= 5) return refuse('非法目的格');
      if (state.position.book[action.spell]![action.slot] === action.fragment) return refuse('位置未變');
      if (state.position.book[action.spell]![action.slot] !== null) return refuse('目的格非空');
      next.position.book = next.position.book.map(spell => spell.map(id => id === action.fragment ? null : id));
      next.position.book[action.spell]![action.slot] = action.fragment;
    } else {
      if (!Number.isInteger(action.spell) || !next.position.book[action.spell]) return refuse('非法法術');
      const ordered = arrange(spells(next.position)[action.spell]!);
      let i = 0;
      next.position.book[action.spell] = next.position.book[action.spell]!.map(id => id === null ? null : ordered[i++]!);
    }
    if (JSON.stringify(next.position.book) === JSON.stringify(state.position.book)) return refuse('配置未變');
  } else if (action.type === 'enter') {
    if (state.phase !== 'research' || !node) return refuse('沒有可進入的遭遇');
    next.entry = structuredClone(state.position);
    const info = createBattle(node.enemy, node.modifiers, state.position.hero, spells(state.position));
    next.battle = { info, queue: [], random: seedRandom(nodeSeed(state.seed, node.id)) };
    replenish(next.battle);
    next.battle.info.known = next.battle.queue.slice(0, 1);
    next.phase = 'battle';
  } else if (action.type === 'preview') {
    if (state.phase !== 'battle' || !next.battle || !canCast(next.battle.info, action.spell)) return refuse('法術目前不可施放');
    const count = Math.max(1, castTurns(next.battle.info.spells[action.spell]!.length));
    if (count <= next.battle.info.known.length) return refuse('意圖已揭示');
    next.battle.info.known = next.battle.queue.slice(0, count);
  } else if (action.type === 'fight') {
    if (state.phase !== 'battle' || !next.battle || !node) return refuse('目前非戰鬥');
    try { next.battle.info = step(next.battle.info, action.action).state; }
    catch (error) { return refuse(error instanceof Error ? error.message : '非法戰鬥操作'); }
    const info = next.battle.info;
    next.position.hero = structuredClone(info.hero);
    if (info.status === 'lost') {
      next.phase = 'failed';
      next.battle = null; // failed holds no consumable PRNG
    } else if (info.status === 'won') {
      next.position.hero.shield = 0;
      next.position.cursor += 1;
      next.entry = null;
      next.battle = null;
      const discovery = `enemy:${node.enemy}`;
      if (!next.profile.discoveries.includes(discovery)) {
        next.profile.discoveries.push(discovery);
        next.profile.insight += 1;
      }
      next.phase = next.position.cursor === NODES.length ? 'complete' : 'research';
      if (next.phase === 'complete') next.profile.victories += 1;
    } else {
      next.battle.queue.shift();
      replenish(next.battle);
      // Previously seen future intents remain; at least the current one is visible.
      next.battle.info.known = next.battle.queue.slice(0, Math.max(1, info.known.length));
    }
  } else if (action.type === 'retry') {
    if (state.phase !== 'failed') return refuse('尚未失敗');
    next.position = structuredClone(state.baseline);
    next.phase = 'research'; next.entry = null; next.battle = null;
  } else if (action.type === 'escape') {
    if (state.phase !== 'failed' || !state.entry || !state.position.escape || !node || node.boss) return refuse('不可撤離');
    next.position = structuredClone(state.entry);
    next.position.escape = false;
    next.position.escaped.push(node.id);
    next.position.cursor += 1;
    next.baseline = structuredClone(next.position);
    next.phase = 'research'; next.entry = null; next.battle = null;
  } else return refuse('未知操作');
  next.revision += 1;
  return { state: next, accepted: true };
}
