const hero = { classId: 'warrior', hp: 38, maxHp: 38, mana: 8, maxMana: 8, attack: 7, armor: 3, level: 1, xp: 0, gold: 3, supplies: 2, inventory: ['potion', 'potion'] };
const profile = { insight: 0, victories: 0, expeditions: 1, upgrades: [], discoveries: [] };
const random = { algorithm: 'xorshift32-v1', value: 42, calls: 0 };

function storyRun(nodeId = 'village') {
  return { seed: 42, loadoutUpgrades: [], random: { ...random }, phase: 'story', nodeId, hero: structuredClone(hero), flags: [], visited: ['village', ...(nodeId === 'village' ? [] : [nodeId])], battle: null, log: ['遠征開始。'] };
}

/** Frozen representative saves produced by the v1 contract before schema 2 existed. */
export const V1_FIXTURES = {
  empty: { schemaVersion: 1, contentVersion: 'nightmare-fortress-1', revision: 0, profile: { insight: 0, victories: 0, expeditions: 0, upgrades: [], discoveries: [] }, run: null },
  story: { schemaVersion: 1, contentVersion: 'nightmare-fortress-1', revision: 1, profile: structuredClone(profile), run: storyRun() },
  combat: { schemaVersion: 1, contentVersion: 'nightmare-fortress-1', revision: 8, profile: structuredClone(profile), run: { ...storyRun('crocodile'), phase: 'combat', visited: ['village', 'briefing', 'crossroads', 'camp', 'marsh', 'crocodile'], battle: { enemyId: 'crocodile', hp: 27, round: 1, intent: 0, next: 'forge' } } },
  victory: { schemaVersion: 1, contentVersion: 'nightmare-fortress-1', revision: 40, profile: { insight: 5, victories: 1, expeditions: 1, upgrades: [], discoveries: ['forge', 'gate', 'bells'] }, run: { ...storyRun('dawn'), phase: 'ended', visited: ['village', 'forge', 'gate', 'bells', 'dawn'], hero: { ...hero, inventory: ['potion', 'sacnoth'] } } },
  retreat: { schemaVersion: 1, contentVersion: 'nightmare-fortress-1', revision: 3, profile: structuredClone(profile), run: { ...storyRun('retreat'), phase: 'ended' } },
  defeat: { schemaVersion: 1, contentVersion: 'nightmare-fortress-1', revision: 9, profile: structuredClone(profile), run: { ...storyRun('defeat'), phase: 'ended', hero: { ...hero, hp: 0 } } },
  upgraded: { schemaVersion: 1, contentVersion: 'nightmare-fortress-1', revision: 47, profile: { insight: 4, victories: 2, expeditions: 3, upgrades: ['vigor', 'focus', 'supplies', 'steel', 'alchemy', 'map'], discoveries: ['forge', 'gate', 'bells', 'crypt', 'archive'] }, run: { ...storyRun('retreat'), phase: 'ended', loadoutUpgrades: ['vigor', 'focus', 'supplies', 'steel', 'alchemy', 'map'], hero: { ...hero, hp: 44, maxHp: 44, mana: 12, maxMana: 12, attack: 8, inventory: ['potion', 'potion', 'potion'] } } },
} as const;

export const INVALID_V1_RAWS = {
  corrupt: '{"schemaVersion":1',
  unknownVersion: JSON.stringify({ schemaVersion: 99, contentVersion: 'nightmare-fortress-future' }),
  impossibleProfile: JSON.stringify({ ...V1_FIXTURES.story, profile: { ...profile, victories: 2 } }),
  futureCatalogValue: JSON.stringify({ ...V1_FIXTURES.story, profile: { ...profile, upgrades: ['future-upgrade'] } }),
};
