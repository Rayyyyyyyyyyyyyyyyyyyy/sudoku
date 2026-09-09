import { STORY } from '../../data/rpg/story.ts';
import { ENEMIES } from './catalog.ts';
import type { StoryNode } from './types.ts';

/** Authoring check: dangling exits and impossible costs must fail before ship. */
export function validateStory(nodes: StoryNode[] = STORY): string[] {
  const errors: string[] = [];
  const byId = new Map(nodes.map(node => [node.id, node]));
  if (byId.size !== nodes.length) errors.push('duplicate node IDs');
  for (const node of nodes) {
    if (!node.title || !node.act || !node.paragraphs.length || node.paragraphs.some(p => !p.trim()) || !node.provenance.note) errors.push(`${node.id}: missing text or provenance`);
    if (!['sacnoth', 'original'].includes(node.provenance.source)) errors.push(`${node.id}: invalid provenance`);
    if (node.ending ? node.choices.length !== 0 : node.choices.length === 0) errors.push(`${node.id}: invalid terminal/choices`);
    if (new Set(node.choices.map(c => c.id)).size !== node.choices.length) errors.push(`${node.id}: duplicate choice IDs`);
    for (const choice of node.choices) {
      if (!byId.has(choice.next)) errors.push(`${node.id}/${choice.id}: missing target ${choice.next}`);
      if (!choice.label || !choice.detail) errors.push(`${node.id}/${choice.id}: missing choice text`);
      if (choice.encounter && !Object.hasOwn(ENEMIES, choice.encounter)) errors.push(`${node.id}: unknown enemy`);
      for (const effect of choice.effects ?? []) {
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
  function walk(id: string) {
    if (visiting.has(id)) { errors.push(`${id}: cycle permits repeated scene rewards`); return; }
    if (seen.has(id)) return;
    seen.add(id);
    visiting.add(id);
    for (const choice of byId.get(id)?.choices ?? []) walk(choice.next);
    visiting.delete(id);
  }
  walk('village');
  for (const node of nodes) if (!seen.has(node.id) && !['retreat', 'defeat'].includes(node.id)) errors.push(`${node.id}: unreachable`);
  for (const id of ['village', 'retreat', 'defeat', 'dawn']) if (!byId.has(id)) errors.push(`missing required node ${id}`);
  return errors;
}
