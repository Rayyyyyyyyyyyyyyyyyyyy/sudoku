import { EVENT_POOLS, STORY } from '../../data/rpg/story.ts';
import { CLASSES, ENEMIES, FLAG_IDS, ITEMS, LOOT_TABLES, SPECIALIZATION_BY_CLASS, TALE_IDS, UPGRADES } from './catalog.ts';
import type { StoryNode } from './types.ts';

/** Authoring check: dangling exits and impossible costs must fail before ship. */
export function validateStory(nodes: StoryNode[] = STORY): string[] {
  const errors: string[] = [];
  const byId = new Map(nodes.map(node => [node.id, node]));
  if (byId.size !== nodes.length) errors.push('duplicate node IDs');
  const choiceCount = nodes.reduce((sum, node) => sum + node.choices.length, 0);
  if (nodes === STORY && nodes.length < 62) errors.push(`content inventory has ${nodes.length} nodes; expected at least 62`);
  if (nodes === STORY && choiceCount < 151) errors.push(`content inventory has ${choiceCount} choices; expected at least 151`);
  for (const node of nodes) {
    if (!node.title || !node.act || !node.paragraphs.length || node.paragraphs.some(p => !p.trim()) || !node.provenance.note) errors.push(`${node.id}: missing text or provenance`);
    if (!['sacnoth', 'original'].includes(node.provenance.source)) errors.push(`${node.id}: invalid provenance`);
    if (node.ending ? node.choices.length !== 0 : node.choices.length === 0) errors.push(`${node.id}: invalid terminal/choices`);
    if (new Set(node.choices.map(c => c.id)).size !== node.choices.length) errors.push(`${node.id}: duplicate choice IDs`);
    for (const choice of node.choices) {
      if (!byId.has(choice.next)) errors.push(`${node.id}/${choice.id}: missing target ${choice.next}`);
      if (!choice.label || !choice.detail) errors.push(`${node.id}/${choice.id}: missing choice text`);
      if (choice.encounter && !Object.hasOwn(ENEMIES, choice.encounter)) errors.push(`${node.id}: unknown enemy`);
      if (choice.eventPool && !Object.hasOwn(EVENT_POOLS, choice.eventPool)) errors.push(`${node.id}/${choice.id}: unknown event pool`);
      for (const requirement of choice.requires ?? []) {
        if (requirement.kind === 'class' && !Object.hasOwn(CLASSES, requirement.value)) errors.push(`${node.id}/${choice.id}: unknown class requirement`);
        if (requirement.kind === 'flag' && !FLAG_IDS.includes(requirement.value)) errors.push(`${node.id}/${choice.id}: unknown flag requirement`);
        if (requirement.kind === 'item' && !Object.hasOwn(ITEMS, requirement.value)) errors.push(`${node.id}/${choice.id}: unknown item requirement`);
        if (requirement.kind === 'upgrade' && !Object.hasOwn(UPGRADES, requirement.value)) errors.push(`${node.id}/${choice.id}: unknown upgrade requirement`);
        if (requirement.kind === 'resource' && (!Number.isInteger(requirement.amount) || requirement.amount <= 0)) errors.push(`${node.id}/${choice.id}: invalid resource requirement`);
      }
      for (const effect of choice.effects ?? []) {
        if (effect.kind === 'loot' && !Object.hasOwn(LOOT_TABLES, effect.table)) errors.push(`${node.id}/${choice.id}: unknown loot table`);
        if (effect.kind === 'flag' && !FLAG_IDS.includes(effect.value)) errors.push(`${node.id}/${choice.id}: unknown flag effect`);
        if ((effect.kind === 'item' || effect.kind === 'consume') && !Object.hasOwn(ITEMS, effect.value)) errors.push(`${node.id}/${choice.id}: unknown item effect`);
        if (effect.kind === 'specialization' && !Object.values(SPECIALIZATION_BY_CLASS).some(pair => Object.hasOwn(pair, effect.value))) errors.push(`${node.id}/${choice.id}: invalid specialization mode`);
        if (effect.kind === 'tale' && !TALE_IDS.includes(effect.value)) errors.push(`${node.id}/${choice.id}: unknown tale effect`);
        if (effect.kind === 'resource' && effect.amount < 0 && effect.resource !== 'hp') {
          const totalCost = -(choice.effects ?? []).filter(e => e.kind === 'resource' && e.resource === effect.resource && e.amount < 0).reduce((sum, e) => sum + (e.kind === 'resource' ? e.amount : 0), 0);
          if (!choice.requires?.some(r => r.kind === 'resource' && r.resource === effect.resource && r.amount >= totalCost)) errors.push(`${node.id}/${choice.id}: cost is not guarded`);
        }
        if (effect.kind === 'consume' && !choice.requires?.some(r => r.kind === 'item' && r.value === effect.value)) errors.push(`${node.id}/${choice.id}: item cost is not guarded`);
      }
    }
  }
  const seen = new Set<string>();
  const visiting = new Set<string>();
  for (const [poolId, pool] of Object.entries(EVENT_POOLS)) {
    if (!pool.length) errors.push(`${poolId}: empty event pool`);
    if (new Set(pool).size !== pool.length) errors.push(`${poolId}: duplicate event node`);
    if (nodes === STORY && pool.length !== 8) errors.push(`${poolId}: expected exactly 8 event nodes`);
    for (const id of pool) if (!byId.has(id)) errors.push(`${poolId}: missing event node ${id}`);
    for (const id of pool) {
      const event = byId.get(id);
      if (event && event.choices.length < 2) errors.push(`${id}: event needs at least two outcomes`);
      const expected = poolId === 'wilds' ? 'marsh' : 'abyss';
      if (event?.choices.some(choice => choice.next !== expected)) errors.push(`${id}: event must rejoin ${expected}`);
    }
  }
  function walk(id: string) {
    if (visiting.has(id)) { errors.push(`${id}: cycle permits repeated scene rewards`); return; }
    if (seen.has(id)) return;
    seen.add(id);
    visiting.add(id);
    for (const choice of byId.get(id)?.choices ?? []) {
      walk(choice.next);
      if (choice.eventPool && Object.hasOwn(EVENT_POOLS, choice.eventPool)) {
        for (const eventId of EVENT_POOLS[choice.eventPool]) if (byId.has(eventId)) walk(eventId);
      }
    }
    visiting.delete(id);
  }
  walk('village');
  for (const node of nodes) if (!seen.has(node.id) && !['retreat', 'defeat'].includes(node.id)) errors.push(`${node.id}: unreachable`);
  for (const id of ['village', 'retreat', 'defeat', 'dawn']) if (!byId.has(id)) errors.push(`missing required node ${id}`);
  return errors;
}
