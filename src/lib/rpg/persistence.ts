import { EVENT_POOLS, NODES } from '../../data/rpg/story.ts';
import { CLASSES, CONTENT_VERSION, DISCOVERY_IDS, ENEMIES, FLAG_IDS, ITEMS, UPGRADES } from './catalog.ts';
import type { ClassId, EnemyId, GameState, UpgradeId } from './types.ts';

export const STORAGE_KEY = 'sudoku-drill-rpg-v1';
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; state: GameState }
  | { status: 'unavailable' }
  | { status: 'incompatible'; raw: string };

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, min = 0, max = 1_000_000): value is number => Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
const member = (value: unknown, catalog: object): value is string => typeof value === 'string' && Object.hasOwn(catalog, value);
const list = (value: unknown, allowed: string[], max: number, unique = true): value is string[] => Array.isArray(value) && value.length <= max && value.every(v => typeof v === 'string' && allowed.includes(v)) && (!unique || new Set(value).size === value.length);

/** A local save is input, not a TypeScript assertion. Validate before returning it. */
export function validGame(value: unknown): value is GameState {
  if (!record(value) || value.schemaVersion !== 1 || value.contentVersion !== CONTENT_VERSION || !integer(value.revision)) return false;
  const p = value.profile;
  if (!record(p) || !integer(p.insight) || !integer(p.victories) || !integer(p.expeditions) || p.victories > p.expeditions ||
      !list(p.upgrades, Object.keys(UPGRADES), Object.keys(UPGRADES).length) || !list(p.discoveries, DISCOVERY_IDS, DISCOVERY_IDS.length)) return false;
  if (value.run === null) return p.expeditions === 0 && p.victories === 0 && p.discoveries.length === 0 && p.upgrades.length === 0 && p.insight === 0;
  const run = value.run;
  if (!record(run) || !integer(run.seed, 0, 0xffffffff) || !member(run.nodeId, NODES) ||
      !list(run.loadoutUpgrades, p.upgrades, Object.keys(UPGRADES).length) || !list(run.flags, FLAG_IDS, FLAG_IDS.length) ||
      !list(run.visited, Object.keys(NODES), Object.keys(NODES).length) || !run.visited.includes('village') || !run.visited.includes(run.nodeId) ||
      !Array.isArray(run.log) || run.log.length > 8 || !run.log.every(line => typeof line === 'string' && line.length <= 500) || p.expeditions < 1) return false;
  const random = run.random;
  if (!record(random) || random.algorithm !== 'xorshift32-v1' || !integer(random.value, 1, 0xffffffff) || !integer(random.calls)) return false;
  const h = run.hero;
  if (!record(h) || !member(h.classId, CLASSES) || !integer(h.level, 1, 4)) return false;
  const spec = CLASSES[h.classId as ClassId].stats;
  const maxHp = spec.maxHp + (h.level - 1) * 4 + (run.loadoutUpgrades.includes('vigor') ? 6 : 0);
  const maxMana = spec.maxMana + (h.level - 1) * 2 + (run.loadoutUpgrades.includes('focus') ? 4 : 0);
  const attack = spec.attack + h.level - 1 + (run.loadoutUpgrades.includes('steel') ? 1 : 0);
  if (h.maxHp !== maxHp || h.maxMana !== maxMana || h.attack !== attack || h.armor !== spec.armor ||
      !integer(h.hp, 0, maxHp) || !integer(h.mana, 0, maxMana) || !integer(h.xp, 0, h.level < 4 ? h.level * 6 - 1 : 999) ||
      !integer(h.gold, 0, 999) || !integer(h.supplies, 0, 999) || !list(h.inventory, Object.keys(ITEMS), 64, false)) return false;
  const uniqueItems = h.inventory.filter(id => id !== 'potion');
  if (new Set(uniqueItems).size !== uniqueItems.length) return false;
  const node = NODES[run.nodeId]!;
  if (run.phase === 'ended') {
    return Boolean(node.ending) && run.battle === null && (node.ending === 'defeat' ? h.hp === 0 : h.hp > 0);
  }
  if (node.ending || h.hp === 0) return false;
  // A future content mismatch must not load a scene with no usable exit.
  if (run.nodeId === 'gate' && !h.inventory.includes('sacnoth')) return false;
  if (run.phase === 'story') return run.battle === null;
  const battle = run.battle;
  if (run.phase !== 'combat' || !record(battle) || !member(battle.enemyId, ENEMIES) || !member(battle.next, NODES)) return false;
  const enemy = ENEMIES[battle.enemyId as EnemyId];
  return integer(battle.hp, 1, enemy.hp) && integer(battle.round, 1) &&
    integer(battle.intent, 0, enemy.intents.length - 1) && battle.intent === (battle.round - 1) % enemy.intents.length &&
    node.choices.some(choice => choice.encounter === battle.enemyId &&
      (choice.next === battle.next || Boolean(choice.eventPool && EVENT_POOLS[choice.eventPool].includes(battle.next as string))));
}

export function deserializeGame(raw: string): LoadResult {
  if (raw.length > 100_000) return { status: 'incompatible', raw };
  try {
    const value: unknown = JSON.parse(raw);
    return validGame(value) ? { status: 'ok', state: value } : { status: 'incompatible', raw };
  } catch { return { status: 'incompatible', raw }; }
}

export function loadGame(storage?: StoragePort | null): LoadResult {
  if (!storage) return { status: 'unavailable' };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw === null ? { status: 'empty' } : deserializeGame(raw);
  } catch { return { status: 'unavailable' }; }
}

export function saveGame(state: GameState, storage?: StoragePort | null): boolean {
  if (!storage || !validGame(state)) return false;
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}
