import { EVENT_POOLS, NODES } from '../../data/rpg/story.ts';
import { CLASSES, CONTENT_VERSION, DISCOVERY_IDS, ENEMIES, FLAG_IDS, ITEMS, RELIC_IDS, SPECIALIZATIONS, TALE_IDS, UPGRADES } from './catalog.ts';
import type { ClassId, EnemyId, GameState, RelicId, SpecializationId, UpgradeId } from './types.ts';

export const STORAGE_KEY = 'sudoku-drill-rpg-v1';
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; state: GameState }
  | { status: 'legacy'; raw: string; preview: LegacyPreview }
  | { status: 'unavailable' }
  | { status: 'incompatible'; raw: string };
export interface LegacyPreview { insight: number; victories: number; expeditions: number; upgrades: string[]; discoveries: string[]; retiresRun: boolean; nextRevision: number }

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, min = 0, max = 1_000_000): value is number => Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
const member = (value: unknown, catalog: object): value is string => typeof value === 'string' && Object.hasOwn(catalog, value);
const list = (value: unknown, allowed: readonly string[], max: number, unique = true): value is string[] => Array.isArray(value) && value.length <= max && value.every(v => typeof v === 'string' && allowed.includes(v)) && (!unique || new Set(value).size === value.length);

function validProfile(profile: unknown): profile is GameState['profile'] {
  return record(profile) && integer(profile.insight) && integer(profile.victories) && integer(profile.expeditions) && profile.victories <= profile.expeditions &&
    list(profile.upgrades, Object.keys(UPGRADES), Object.keys(UPGRADES).length) && list(profile.discoveries, DISCOVERY_IDS, DISCOVERY_IDS.length) && list(profile.tales, TALE_IDS, TALE_IDS.length);
}

/** A local v2 save is unknown input. Validate it before allowing the engine or autosave to see it. */
export function validGame(value: unknown): value is GameState {
  if (!record(value) || value.schemaVersion !== 2 || value.contentVersion !== CONTENT_VERSION || !integer(value.revision) || !validProfile(value.profile)) return false;
  const p = value.profile;
  if (value.run === null) return true;
  const run = value.run;
  if (!record(run) || !integer(run.seed, 0, 0xffffffff) || !member(run.nodeId, NODES) || !list(run.loadoutUpgrades, p.upgrades, Object.keys(UPGRADES).length) ||
      !list(run.flags, FLAG_IDS, FLAG_IDS.length) || !list(run.visited, Object.keys(NODES), Object.keys(NODES).length) || !run.visited.includes('village') ||
      !run.visited.includes(run.nodeId) || !Array.isArray(run.log) || run.log.length > 8 || !run.log.every(line => typeof line === 'string' && line.length <= 500) || p.expeditions < 1) return false;
  const random = run.random;
  if (!record(random) || random.algorithm !== 'xorshift32-v1' || !integer(random.value, 1, 0xffffffff) || !integer(random.calls)) return false;
  const h = run.hero;
  if (!record(h) || !member(h.classId, CLASSES) || !integer(h.level, 1, 4)) return false;
  const stats = CLASSES[h.classId as ClassId].stats;
  const loadout = run.loadoutUpgrades as UpgradeId[];
  const maxHp = stats.maxHp + (h.level - 1) * 4 + (loadout.includes('vigor') ? 6 : 0);
  const maxMana = stats.maxMana + (h.level - 1) * 2 + (loadout.includes('focus') ? 4 : 0);
  const attack = stats.attack + h.level - 1 + (loadout.includes('steel') ? 1 : 0);
  if (h.maxHp !== maxHp || h.maxMana !== maxMana || h.attack !== attack || h.armor !== stats.armor || !integer(h.hp, 0, maxHp) || !integer(h.mana, 0, maxMana) ||
      !integer(h.xp, 0, h.level < 4 ? h.level * 6 - 1 : 999) || !integer(h.gold, 0, 999) || !integer(h.supplies, 0, 999) || !list(h.inventory, Object.keys(ITEMS), 64, false)) return false;
  const inventory = h.inventory as string[];
  const uniqueItems = inventory.filter(id => id !== 'potion');
  if (new Set(uniqueItems).size !== uniqueItems.length) return false;
  if (run.specialization !== null && (!member(run.specialization, SPECIALIZATIONS) || SPECIALIZATIONS[run.specialization as SpecializationId].classId !== h.classId)) return false;
  if (run.equippedRelic !== null && (!RELIC_IDS.includes(run.equippedRelic as RelicId) || !inventory.includes(run.equippedRelic as string))) return false;
  const node = NODES[run.nodeId as string]!;
  if (run.phase === 'ended') return Boolean(node.ending) && run.battle === null && (node.ending === 'defeat' ? h.hp === 0 : h.hp > 0);
  if (node.ending || h.hp === 0) return false;
  if (run.nodeId === 'gate' && !inventory.includes('sacnoth')) return false;
  if (run.phase === 'story') return run.battle === null;
  const battle = run.battle;
  if (run.phase !== 'combat' || !record(battle) || !member(battle.enemyId, ENEMIES) || !member(battle.next, NODES) || typeof battle.prepared !== 'boolean') return false;
  const enemy = ENEMIES[battle.enemyId as EnemyId];
  return integer(battle.hp, 1, enemy.hp) && integer(battle.round, 1) && integer(battle.intent, 0, enemy.intents.length - 1) && battle.intent === (battle.round - 1) % enemy.intents.length &&
    node.choices.some(choice => choice.encounter === battle.enemyId && (choice.next === battle.next || Boolean(choice.eventPool && EVENT_POOLS[choice.eventPool].includes(battle.next as string))));
}

// Frozen v1 validation data. This does not import v2 story rules or item behavior.
const V1_NODES = 'village briefing crossroads bridge ferryman ruins crypt camp wild-witchfire wild-grave-cart wild-moonwell wild-white-stag marsh rescue crocodile forge outfitter approach thornwood causeway gate webhall gallery banquet cells refuge fortress-armory fortress-mirror fortress-scriptorium fortress-sleepwalker abyss archive bells threshold throne dawn retreat defeat'.split(' ');
const V1_FLAGS = 'rescued weakness staff merchant rune truth counterspell pilgrim ferryman sigil prisoner choir'.split(' ');
const V1_ITEMS = 'potion ward sacnoth ember iron moonstone bell'.split(' ');
const V1_UPGRADES = 'vigor focus supplies steel alchemy map'.split(' ');
const V1_DISCOVERIES = 'forge gate bells crypt archive'.split(' ');
const V1_STATS = { warrior: { maxHp: 38, maxMana: 8, attack: 7, armor: 3 }, mage: { maxHp: 29, maxMana: 16, attack: 4, armor: 1 }, ranger: { maxHp: 33, maxMana: 11, attack: 6, armor: 2 } } as const;
const V1_ENCOUNTERS = { crocodile: { node: 'crocodile', hp: 27, next: 'forge' }, spider: { node: 'webhall', hp: 24, next: 'banquet' }, guardian: { node: 'abyss', hp: 32, next: 'bells' },
  gaznak: { node: 'throne', hp: 43, next: 'dawn' }, wraith: { node: 'crypt', hp: 22, next: 'camp' }, knight: { node: 'causeway', hp: 35, next: 'gate' }, wolf: { node: 'thornwood', hp: 26, next: 'gate' } } as const;

export function validLegacyGame(value: unknown): value is Record<string, unknown> {
  if (!record(value) || value.schemaVersion !== 1 || value.contentVersion !== 'nightmare-fortress-1' || !integer(value.revision)) return false;
  const p = value.profile;
  if (!record(p) || !integer(p.insight) || !integer(p.victories) || !integer(p.expeditions) || p.victories > p.expeditions || !list(p.upgrades, V1_UPGRADES, V1_UPGRADES.length) || !list(p.discoveries, V1_DISCOVERIES, V1_DISCOVERIES.length)) return false;
  if (value.run === null) return p.expeditions === 0 && p.victories === 0 && p.discoveries.length === 0 && p.upgrades.length === 0 && p.insight === 0;
  const run = value.run;
  if (!record(run) || !integer(run.seed, 0, 0xffffffff) || !list(run.loadoutUpgrades, p.upgrades as string[], V1_UPGRADES.length) || !list(run.flags, V1_FLAGS, V1_FLAGS.length) ||
      !list(run.visited, V1_NODES, 38) || !run.visited.includes('village') || typeof run.nodeId !== 'string' || !V1_NODES.includes(run.nodeId) || !run.visited.includes(run.nodeId) ||
      p.expeditions < 1 || !Array.isArray(run.log) || run.log.length > 8 || !run.log.every(line => typeof line === 'string' && line.length <= 500)) return false;
  const random = run.random; const h = run.hero;
  if (!record(random) || random.algorithm !== 'xorshift32-v1' || !integer(random.value, 1, 0xffffffff) || !integer(random.calls) || !record(h) ||
      typeof h.classId !== 'string' || !Object.hasOwn(V1_STATS, h.classId) || !integer(h.level, 1, 4)) return false;
  const stats = V1_STATS[h.classId as ClassId]; const loadout = run.loadoutUpgrades as string[];
  const maxHp = stats.maxHp + (h.level - 1) * 4 + (loadout.includes('vigor') ? 6 : 0);
  const maxMana = stats.maxMana + (h.level - 1) * 2 + (loadout.includes('focus') ? 4 : 0);
  const attack = stats.attack + h.level - 1 + (loadout.includes('steel') ? 1 : 0);
  if (h.maxHp !== maxHp || h.maxMana !== maxMana || h.attack !== attack || h.armor !== stats.armor || !integer(h.hp, 0, maxHp) || !integer(h.mana, 0, maxMana) ||
      !integer(h.xp, 0, h.level < 4 ? h.level * 6 - 1 : 999) || !integer(h.gold, 0, 999) || !integer(h.supplies, 0, 999) || !list(h.inventory, V1_ITEMS, 64, false)) return false;
  const uniqueItems = (h.inventory as string[]).filter(id => id !== 'potion');
  if (new Set(uniqueItems).size !== uniqueItems.length) return false;
  if (run.nodeId === 'gate' && !(h.inventory as string[]).includes('sacnoth')) return false;
  if (run.phase === 'ended') return ['dawn', 'retreat', 'defeat'].includes(run.nodeId) && run.battle === null && (run.nodeId === 'defeat' ? h.hp === 0 : Number(h.hp) > 0);
  if (!['story', 'combat'].includes(run.phase as string) || ['dawn', 'retreat', 'defeat'].includes(run.nodeId) || h.hp === 0) return false;
  if (run.phase === 'story') return run.battle === null;
  const battle = run.battle;
  if (!record(battle) || typeof battle.enemyId !== 'string' || !Object.hasOwn(V1_ENCOUNTERS, battle.enemyId)) return false;
  const encounter = V1_ENCOUNTERS[battle.enemyId as keyof typeof V1_ENCOUNTERS];
  return run.nodeId === encounter.node && battle.next === encounter.next && integer(battle.hp, 1, encounter.hp) && integer(battle.round, 1) &&
    integer(battle.intent, 0, 2) && battle.intent === ((battle.round as number) - 1) % 3;
}

export function previewLegacy(value: Record<string, unknown>): LegacyPreview {
  const profile = value.profile as Record<string, unknown>;
  return { insight: profile.insight as number, victories: profile.victories as number, expeditions: profile.expeditions as number, upgrades: [...profile.upgrades as string[]],
    discoveries: [...profile.discoveries as string[]], retiresRun: value.run !== null, nextRevision: (value.revision as number) + 1 };
}

export function migrateLegacyGame(value: unknown): GameState | null {
  if (!validLegacyGame(value)) return null;
  const profile = value.profile as Record<string, unknown>;
  const migrated: GameState = { schemaVersion: 2, contentVersion: CONTENT_VERSION, revision: (value.revision as number) + 1,
    profile: { insight: profile.insight as number, victories: profile.victories as number, expeditions: profile.expeditions as number,
      upgrades: [...profile.upgrades as UpgradeId[]], discoveries: [...profile.discoveries as string[]], tales: [] }, run: null };
  return validGame(migrated) ? migrated : null;
}
export function migrateLegacyRaw(raw: string): GameState | null {
  if (raw.length > 100_000) return null;
  try { return migrateLegacyGame(JSON.parse(raw)); } catch { return null; }
}
export function deserializeGame(raw: string): LoadResult {
  if (raw.length > 100_000) return { status: 'incompatible', raw };
  try {
    const value: unknown = JSON.parse(raw);
    if (validGame(value)) return { status: 'ok', state: value };
    if (validLegacyGame(value)) return { status: 'legacy', raw, preview: previewLegacy(value) };
    return { status: 'incompatible', raw };
  } catch { return { status: 'incompatible', raw }; }
}
export function loadGame(storage?: StoragePort | null): LoadResult {
  if (!storage) return { status: 'unavailable' };
  try { const raw = storage.getItem(STORAGE_KEY); return raw === null ? { status: 'empty' } : deserializeGame(raw); } catch { return { status: 'unavailable' }; }
}
export function saveGame(state: GameState, storage?: StoragePort | null): boolean {
  if (!storage || !validGame(state)) return false;
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}
