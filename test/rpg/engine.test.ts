import { describe, expect, it } from 'vitest';
import { createGame, getAvailableActions, transition, unmetRequirement } from '../../src/lib/rpg/engine.ts';
import { CLASSES, ENEMIES, getOmen, OMENS, UPGRADES } from '../../src/lib/rpg/catalog.ts';
import { NODES, STORY } from '../../src/data/rpg/story.ts';
import { validateStory } from '../../src/lib/rpg/contentValidation.ts';
import { deserializeGame, loadGame, saveGame, STORAGE_KEY, validGame } from '../../src/lib/rpg/persistence.ts';
import type { Action, ClassId, GameState } from '../../src/lib/rpg/types.ts';

function act(game: GameState, action: Omit<Action, 'revision'> | Record<string, unknown>) {
  const result = transition(game, { ...action, revision: game.revision } as Action);
  expect(result.accepted, result.reason).toBe(true);
  expect(validGame(result.state), `invalid snapshot after ${JSON.stringify(action)}`).toBe(true);
  return result.state;
}

function start(classId: ClassId = 'warrior', seed = 42) {
  return act(createGame(), { type: 'start', classId, seed });
}

function choose(game: GameState, id: string) { return act(game, { type: 'choose', id }); }

function battleAction(game: GameState): string {
  const run = game.run!;
  const hero = run.hero;
  const enemy = ENEMIES[run.battle!.enemyId];
  const intent = enemy.intents[run.battle!.intent];
  if (hero.hp <= hero.maxHp - 16 && hero.inventory.includes('potion') && intent.damage < 10) return 'potion';
  if (hero.mana >= CLASSES[hero.classId].manaCost) return 'skill';
  if (intent.damage >= 9) return 'guard';
  return 'attack';
}

const mainChoices: Record<string, string> = {
  village: 'listen', briefing: 'supplies', crossroads: 'ruins', ruins: 'rune', bridge: 'help',
  camp: 'staff', marsh: 'rescue', rescue: 'lift', crocodile: 'fight', forge: 'ember',
  outfitter: 'buy', gate: 'open', webhall: 'fight', banquet: 'truth', refuge: 'rest',
  abyss: 'fight', bells: 'listen', threshold: 'rest', throne: 'fight',
};

function play(game: GameState, overrides: Record<string, string> = {}) {
  const states = [game];
  for (let step = 0; step < 150 && game.run!.phase !== 'ended'; step++) {
    const run = game.run!;
    if (run.phase === 'combat') game = act(game, { type: 'combat', id: battleAction(game) });
    else {
      const preferred = overrides[run.nodeId] ?? mainChoices[run.nodeId];
      const options = getAvailableActions(game).filter(a => !a.disabled);
      expect(options.length).toBeGreaterThan(0);
      game = choose(game, options.find(o => o.id === preferred)?.id ?? options[0].id);
    }
    states.push(game);
  }
  expect(game.run!.phase).toBe('ended');
  return states;
}

describe('authored text and story graph', () => {
  it('has complete prose, provenance, reachable endings and guarded costs', () => {
    expect(validateStory()).toEqual([]);
    expect(STORY.length).toBeGreaterThanOrEqual(20);
    expect(STORY.filter(n => n.ending).map(n => n.ending).sort()).toEqual(['defeat', 'retreat', 'victory']);
  });

  it('detects an authoring typo, unguarded cost and reward loop', () => {
    const broken = structuredClone(STORY);
    broken[0].choices[0].next = 'missing';
    broken[1].choices[0].effects = [{ kind: 'resource', resource: 'gold', amount: -9 }];
    expect(validateStory(broken).join(' ')).toMatch(/missing target/);
    expect(validateStory(broken).join(' ')).toMatch(/cost is not guarded/);
    const cycle = structuredClone(STORY);
    cycle.find(n => n.id === 'camp')!.choices[0].next = 'village';
    expect(validateStory(cycle).join(' ')).toMatch(/cycle/);
  });
});

describe('deterministic adventure and progression', () => {
  for (const classId of ['warrior', 'mage', 'ranger'] as const) {
    it(`${classId} can complete the full authored campaign across seeds`, () => {
      for (const seed of [0, 1, 42, 1066, 0xffffffff]) {
        const states = play(start(classId, seed));
        const end = states.at(-1)!;
        expect(end.run!.nodeId).toBe('dawn');
        expect(end.run!.hero.level).toBeGreaterThan(1);
        expect(end.run!.hero.inventory).toContain('sacnoth');
        expect(end.profile.victories).toBe(1);
        expect(end.profile.insight).toBe(end.profile.discoveries.length + 2);
        expect(end.profile.discoveries).toEqual(expect.arrayContaining(['forge', 'gate', 'bells']));
      }
    });
  }

  it('replays identical seeds/actions and resumes a mid-battle save exactly', () => {
    const first = play(start());
    const second = play(start());
    expect(second).toEqual(first);
    const checkpoint = first.findIndex(g => g.run!.phase === 'combat' && g.run!.battle!.round > 1);
    const restored = deserializeGame(JSON.stringify(first[checkpoint]));
    expect(restored.status).toBe('ok');
    if (restored.status !== 'ok') throw new Error('cannot restore checkpoint');
    expect(play(restored.state).at(-1)).toEqual(first.at(-1));
  });

  it('has a different viable route with merchant, defensive rune and class bypass', () => {
    for (const classId of ['mage', 'ranger'] as const) {
      const end = play(start(classId), { crossroads: 'bridge', briefing: 'ward', camp: 'rest',
        marsh: 'observe', forge: 'iron', webhall: classId === 'mage' ? 'burn' : 'sneak', abyss: 'ward' }).at(-1)!;
      expect(end.run!.nodeId).toBe('dawn');
      expect(end.run!.flags).toContain('merchant');
      expect(end.run!.hero.inventory).toContain('iron');
      expect(end.run!.hero.inventory).not.toContain('ward');
      expect(end.run!.flags).not.toContain('rescued');
    }
  });

  it('carries early clues through the new causeway, gallery, cells and archive branches', () => {
    const states = play(start('mage', 2), {
      crypt: 'crypt_seal', approach: 'approach_causeway', causeway: 'causeway_sigil',
      webhall: 'gallery', gallery: 'gallery_learn', banquet: 'truth', cells: 'cells_truth',
      abyss: 'moonbridge', archive: 'archive_prisoner', bells: 'answer_choir',
    });
    const end = states.at(-1)!;
    expect(end.run!.nodeId).toBe('dawn');
    expect(end.run!.visited).toEqual(expect.arrayContaining(['crypt', 'causeway', 'gallery', 'cells', 'archive']));
    expect(end.run!.flags).toEqual(expect.arrayContaining(['sigil', 'choir', 'prisoner', 'counterspell']));
    expect(end.run!.hero.inventory).toContain('moonstone');
    expect(end.profile.discoveries).toEqual(expect.arrayContaining(['crypt', 'archive']));
  });

  it('uses the permanent map upgrade to open a later-run route without an outer combat', () => {
    const won = play(start()).at(-1)!;
    const prepared = structuredClone(won);
    prepared.profile.insight = Math.max(prepared.profile.insight, UPGRADES.map.cost);
    const mapped = act(prepared, { type: 'upgrade', id: 'map' });
    const next = act(mapped, { type: 'start', classId: 'ranger', seed: 4 });
    const states = play(next, { approach: 'approach_map' });
    const gate = states.find(state => state.run!.nodeId === 'gate')!;
    expect(gate.run!.visited).toContain('approach');
    expect(gate.run!.visited).not.toEqual(expect.arrayContaining(['thornwood', 'causeway']));
  });

  it('rejects wrong classes, stale choices and unaffordable actions without mutation or RNG advance', () => {
    let game = start();
    const before = structuredClone(game);
    expect(transition(game, { type: 'choose', id: 'unknown', revision: game.revision }).state).toBe(game);
    expect(game).toEqual(before);
    game = choose(game, 'listen');
    const action = { type: 'choose', id: 'ward', revision: game.revision } as const;
    const accepted = transition(game, action).state;
    expect(transition(accepted, action)).toMatchObject({ accepted: false, state: accepted });
    game = choose(accepted, 'bridge');
    const forbidden = transition(game, { type: 'choose', id: 'trail', revision: game.revision });
    expect(forbidden.accepted).toBe(false);
    expect(forbidden.state).toBe(game);
    const noFood = structuredClone(game);
    noFood.run!.hero.supplies = 0;
    expect(transition(noFood, { type: 'choose', id: 'help', revision: noFood.revision }).accepted).toBe(false);
    expect(transition(game, { type: 'start', classId: 'mage', seed: 1, revision: game.revision }).accepted).toBe(false);
  });

  it('shows a predictable enemy intent, guards damage, restores mana, and spends a potion once', () => {
    const fight = play(start()).find(s => s.run!.phase === 'combat')!;
    const damaged = structuredClone(fight);
    damaged.run!.hero.hp = 10;
    damaged.run!.hero.mana = 0;
    const guarded = act(damaged, { type: 'combat', id: 'guard' });
    expect(guarded.run!.hero.hp).toBe(10);
    expect(guarded.run!.hero.mana).toBe(3);
    expect(guarded.run!.battle!.intent).toBe(1);
    const healed = act(guarded, { type: 'combat', id: 'potion' });
    expect(healed.run!.hero.inventory.filter(i => i === 'potion').length).toBe(guarded.run!.hero.inventory.filter(i => i === 'potion').length - 1);
    expect(healed.run!.hero.hp).toBe(19); // 10 + 16 - (10 - armor 3)
  });

  it('settles defeat, retreat and victory once, and preserves upgrades on the next run', () => {
    const won = play(start()).at(-1)!;
    expect(transition(won, { type: 'combat', id: 'attack', revision: won.revision }).state).toBe(won);
    const upgraded = act(won, { type: 'upgrade', id: 'vigor' });
    expect(upgraded.profile.insight).toBe(won.profile.insight - UPGRADES.vigor.cost);
    expect(transition(upgraded, { type: 'upgrade', id: 'vigor', revision: upgraded.revision }).accepted).toBe(false);
    const next = act(upgraded, { type: 'start', classId: 'warrior', seed: 77 });
    expect(next.run!.hero.maxHp).toBe(CLASSES.warrior.stats.maxHp + 6);
    const secondWin = play(next).at(-1)!;
    expect(secondWin.profile.insight).toBe(upgraded.profile.insight + 2); // no repeated discovery rewards
    const retreat = act(next, { type: 'retreat' });
    expect(retreat.run!.nodeId).toBe('retreat');
    expect(retreat.profile).toEqual(next.profile);
    const battle = structuredClone(play(start()).find(g => g.run!.phase === 'combat')!);
    battle.run!.hero.hp = 1;
    battle.run!.battle!.round = 2;
    battle.run!.battle!.intent = 1;
    const defeat = act(battle, { type: 'combat', id: 'attack' });
    expect(defeat.run!.nodeId).toBe('defeat');
    expect(defeat.run!.hero.hp).toBe(0);
    expect(defeat.run!.battle).toBeNull();
    expect(defeat.profile.victories).toBe(0);
  });
});

describe('omens and expanded systems', () => {
  it('derives one of three deterministic omens from the seed without persisting it', () => {
    expect([getOmen(0).id, getOmen(1).id, getOmen(2).id]).toEqual(['blood-moon', 'black-rain', 'still-star']);
    expect(getOmen(0xffffffff)).toBe(OMENS['blood-moon']);
    const game = start('warrior', 2);
    expect(getOmen(game.run!.seed)).toBe(OMENS['still-star']);
    expect(game.run).not.toHaveProperty('omen');
  });

  it('applies blood-moon risk, black-rain healing and still-star guarding', () => {
    const encounter = play(start('mage', 1)).find(s => s.run!.phase === 'combat')!;

    const blackRain = structuredClone(encounter);
    blackRain.run!.seed = 1;
    blackRain.run!.hero.hp = 1;
    const rainEnemy = ENEMIES[blackRain.run!.battle!.enemyId];
    const rainIntent = rainEnemy.intents[blackRain.run!.battle!.intent];
    const healed = act(blackRain, { type: 'combat', id: 'potion' });
    expect(healed.run!.hero.hp).toBe(Math.min(blackRain.run!.hero.maxHp, 1 + 20) - Math.max(0, rainIntent.damage - blackRain.run!.hero.armor));

    const blackGuard = structuredClone(encounter);
    blackGuard.run!.seed = 1;
    blackGuard.run!.battle!.enemyId = 'knight';
    blackGuard.run!.battle!.hp = ENEMIES.knight.hp;
    blackGuard.run!.battle!.round = 2;
    blackGuard.run!.battle!.intent = 1;
    const starGuard = structuredClone(blackGuard);
    starGuard.run!.seed = 2;
    const ordinary = transition(blackGuard, { type: 'combat', id: 'guard', revision: blackGuard.revision }).state;
    const strengthened = transition(starGuard, { type: 'combat', id: 'guard', revision: starGuard.revision }).state;
    expect(ordinary.run!.hero.hp - strengthened.run!.hero.hp).toBe(-3);

    const normalAttack = structuredClone(encounter);
    normalAttack.run!.seed = 1;
    const bloodAttack = structuredClone(normalAttack);
    bloodAttack.run!.seed = 0;
    const normalAfter = act(normalAttack, { type: 'combat', id: 'attack' });
    const bloodAfter = act(bloodAttack, { type: 'combat', id: 'attack' });
    expect(normalAfter.run!.battle!.hp - bloodAfter.run!.battle!.hp).toBe(2);
    expect(normalAfter.run!.hero.hp - bloodAfter.run!.hero.hp).toBe(2);
  });

  it('applies steel, alchemy and map upgrades from the run loadout', () => {
    const won = play(start()).at(-1)!;
    const prepared = structuredClone(won);
    prepared.profile.insight = 10;
    const steel = act(prepared, { type: 'upgrade', id: 'steel' });
    const alchemy = act(steel, { type: 'upgrade', id: 'alchemy' });
    const mapped = act(alchemy, { type: 'upgrade', id: 'map' });
    const expedition = act(mapped, { type: 'start', classId: 'warrior', seed: 1 });
    expect(expedition.run!.hero.attack).toBe(CLASSES.warrior.stats.attack + 1);
    expect(unmetRequirement(expedition.run!, { kind: 'upgrade', value: 'map' })).toBe('');
    expect(unmetRequirement(start().run!, { kind: 'upgrade', value: 'map' })).toContain(UPGRADES.map.name);

    const encounter = play(expedition).find(s => s.run!.phase === 'combat')!;
    const wounded = structuredClone(encounter);
    wounded.run!.hero.hp = 1;
    const enemy = ENEMIES[wounded.run!.battle!.enemyId];
    const intent = enemy.intents[wounded.run!.battle!.intent];
    const healed = act(wounded, { type: 'combat', id: 'potion' });
    expect(healed.run!.hero.hp).toBe(Math.min(wounded.run!.hero.maxHp, 1 + 24) - Math.max(0, intent.damage - wounded.run!.hero.armor));
  });

  it('supports moonstone skill cost, bell protection and the three new enemy definitions', () => {
    for (const id of ['wraith', 'knight', 'wolf'] as const) {
      expect(ENEMIES[id]).toMatchObject({ id, intents: expect.arrayContaining([expect.objectContaining({ damage: expect.any(Number) })]) });
      expect(ENEMIES[id].intents).toHaveLength(3);
    }
    const encounter = play(start('mage', 1)).find(s => s.run!.phase === 'combat')!;
    const moonstone = structuredClone(encounter);
    moonstone.run!.hero.inventory.push('moonstone');
    const mana = moonstone.run!.hero.mana;
    const afterSkill = act(moonstone, { type: 'combat', id: 'skill' });
    expect(afterSkill.run!.hero.mana).toBe(mana - Math.max(1, CLASSES.mage.manaCost - 1));

    const wraith = structuredClone(encounter);
    wraith.run!.battle!.enemyId = 'wraith';
    wraith.run!.battle!.hp = ENEMIES.wraith.hp;
    const bell = structuredClone(wraith);
    bell.run!.hero.inventory.push('bell');
    const withoutBell = transition(wraith, { type: 'combat', id: 'guard', revision: wraith.revision }).state;
    const withBell = transition(bell, { type: 'combat', id: 'guard', revision: bell.revision }).state;
    expect(withBell.run!.hero.hp - withoutBell.run!.hero.hp).toBe(0); // Guard already absorbs the light opening intent.
    wraith.run!.battle!.round = 2; wraith.run!.battle!.intent = 1;
    bell.run!.battle!.round = 2; bell.run!.battle!.intent = 1;
    const struck = transition(wraith, { type: 'combat', id: 'attack', revision: wraith.revision }).state;
    const warded = transition(bell, { type: 'combat', id: 'attack', revision: bell.revision }).state;
    expect(warded.run!.hero.hp - struck.run!.hero.hp).toBe(2);
  });

  it('loads legacy-shaped snapshots while accepting expanded discoveries and six upgrades', () => {
    const legacy = start();
    const raw = JSON.stringify(legacy);
    const loaded = deserializeGame(raw);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') throw new Error('legacy snapshot rejected');
    expect(loaded.state.run).not.toHaveProperty('omen');

    const expanded = structuredClone(legacy);
    expanded.profile.upgrades = ['vigor', 'focus', 'supplies', 'steel', 'alchemy', 'map'];
    expanded.profile.discoveries = ['forge', 'gate', 'bells', 'crypt', 'archive'];
    expect(validGame(expanded)).toBe(true);
  });

  it('keeps the two v1 in-flight encounter destinations and rejects arbitrary targets', () => {
    const states = play(start());
    const spider = structuredClone(states.find(state => state.run?.battle?.enemyId === 'spider')!);
    spider.run!.battle!.next = 'banquet';
    expect(validGame(spider)).toBe(true);
    spider.run!.battle!.next = 'dawn';
    expect(validGame(spider)).toBe(false);

    const guardian = structuredClone(states.find(state => state.run?.battle?.enemyId === 'guardian')!);
    guardian.run!.battle!.next = 'bells';
    expect(validGame(guardian)).toBe(true);
    guardian.run!.battle!.next = 'village';
    expect(validGame(guardian)).toBe(false);
  });
});

describe('local storage boundary', () => {
  it('round-trips every phase without touching other games', () => {
    const values = new Map([['sudoku-drill-v1', 'original']]);
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    expect(loadGame(storage)).toEqual({ status: 'empty' });
    for (const state of [createGame(), ...play(start('ranger'))]) {
      expect(saveGame(state, storage)).toBe(true);
      expect(loadGame(storage)).toEqual({ status: 'ok', state });
    }
    expect(values.get('sudoku-drill-v1')).toBe('original');
    expect([...values.keys()]).toEqual(['sudoku-drill-v1', STORAGE_KEY]);
  });

  it('preserves corrupt/future saves and refuses impossible HP, inventory and encounter targets', () => {
    const snapshots: unknown[] = [null, {}, { ...start(), contentVersion: 'future' }];
    const hp = structuredClone(start()); hp.run!.hero.hp = 9999; snapshots.push(hp);
    const item = structuredClone(start()); item.run!.hero.inventory.push('unknown' as never); snapshots.push(item);
    const battle = structuredClone(play(start()).find(g => g.run!.phase === 'combat')!);
    battle.run!.battle!.next = 'dawn'; snapshots.push(battle);
    for (const value of snapshots) {
      const raw = JSON.stringify(value);
      expect(deserializeGame(raw)).toEqual({ status: 'incompatible', raw });
    }
    expect(deserializeGame('{')).toEqual({ status: 'incompatible', raw: '{' });
  });

  it('reports storage failures without throwing or pretending persistence succeeded', () => {
    const unavailable = { getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); } };
    expect(loadGame(unavailable).status).toBe('unavailable');
    expect(saveGame(start(), unavailable)).toBe(false);
    expect(saveGame(start(), null)).toBe(false);
  });
});
