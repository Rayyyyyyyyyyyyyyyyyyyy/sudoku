import { nextRandom, seedRandom } from '../seededRandom.js';
import { EVENT_POOLS, NODES } from '../../data/rpg/story.ts';
import { CLASSES, CLASS_IDS, CONTENT_VERSION, DISCOVERY_IDS, ENEMIES, getOmen, ITEMS, LOOT_TABLES, RELIC_IDS, SPECIALIZATIONS, SPECIALIZATION_BY_CLASS, UPGRADES } from './catalog.ts';
import type { Action, ActionOption, Choice, Effect, GameState, Requirement, Run, TransitionResult } from './types.ts';

export function createGame(): GameState {
  return { schemaVersion: 2, contentVersion: CONTENT_VERSION, revision: 0,
    profile: { insight: 0, victories: 0, expeditions: 0, upgrades: [], discoveries: [], tales: [] }, run: null };
}

function log(run: Run, text: string) {
  run.log = [...run.log, text].slice(-8);
}

function experience(run: Run, amount: number) {
  const hero = run.hero;
  hero.xp += amount;
  while (hero.level < 4 && hero.xp >= hero.level * 6) {
    hero.xp -= hero.level * 6;
    hero.level += 1;
    hero.maxHp += 4;
    hero.maxMana += 2;
    hero.attack += 1;
    hero.hp = Math.min(hero.maxHp, hero.hp + 8);
    hero.mana = Math.min(hero.maxMana, hero.mana + 4);
    log(run, `升至等級 ${hero.level}。生命上限 +4、魔力上限 +2、攻擊 +1，並恢復部分狀態。`);
  }
}

function apply(run: Run, effects: Effect[], game?: GameState) {
  for (const effect of effects) {
    const hero = run.hero;
    if (effect.kind === 'resource') {
      const cap = effect.resource === 'hp' ? hero.maxHp : effect.resource === 'mana' ? hero.maxMana : 999;
      hero[effect.resource] = Math.max(0, Math.min(cap, hero[effect.resource] + effect.amount));
    } else if (effect.kind === 'flag') {
      if (!run.flags.includes(effect.value)) run.flags.push(effect.value);
    } else if (effect.kind === 'item') {
      if (effect.value === 'potion' || !hero.inventory.includes(effect.value)) hero.inventory.push(effect.value);
    } else if (effect.kind === 'consume') {
      const index = hero.inventory.indexOf(effect.value);
      if (index >= 0) hero.inventory.splice(index, 1);
    } else if (effect.kind === 'loot') {
      const table = LOOT_TABLES[effect.table];
      const eligible = table.outcomes.filter(outcome => outcome.effects.every(outcomeEffect =>
        outcomeEffect.kind !== 'item' || outcomeEffect.value === 'potion' || !hero.inventory.includes(outcomeEffect.value)));
      const rolled = nextRandom(run.random);
      run.random = rolled.state;
      if (!eligible.length) {
        hero.gold = Math.min(999, hero.gold + 2);
        log(run, `${table.name}已搜刮一空，改找到 2 枚金幣。`);
      } else {
        const outcome = eligible[Math.floor(rolled.value * eligible.length)]!;
        apply(run, outcome.effects, game);
        log(run, `找到${outcome.name}。`);
      }
    } else if (effect.kind === 'specialization') {
      run.specialization = SPECIALIZATION_BY_CLASS[run.hero.classId][effect.value];
      log(run, `專精鎖定：${SPECIALIZATIONS[run.specialization].name}。`);
    } else if (effect.kind === 'tale') {
      if (game && !game.profile.tales.includes(effect.value)) game.profile.tales.push(effect.value);
    } else {
      experience(run, effect.amount);
    }
  }
}

function resolveDestination(run: Run, choice: Choice): string {
  if (!choice.eventPool) return choice.next;
  const pool = EVENT_POOLS[choice.eventPool];
  const rolled = nextRandom(run.random);
  run.random = rolled.state;
  // Seed offset spreads the frozen 0–255 witness range across the fixed pool;
  // the accepted draw still advances the one serialized PRNG exactly once.
  const destination = pool[(Math.floor(rolled.value * pool.length) + run.seed) % pool.length]!;
  log(run, `遭遇異事：${NODES[destination]!.title}。`);
  return destination;
}

export function unmetRequirement(run: Run, requirement: Requirement): string {
  switch (requirement.kind) {
    case 'class': return run.hero.classId === requirement.value ? '' : `需要${CLASSES[requirement.value].name}職業`;
    case 'flag': return run.flags.includes(requirement.value) ? '' : '尚未取得所需線索';
    case 'item': return run.hero.inventory.includes(requirement.value) ? '' : `需要${ITEMS[requirement.value].name}`;
    case 'upgrade': return run.loadoutUpgrades.includes(requirement.value) ? '' : `需要永久養成：${UPGRADES[requirement.value].name}`;
    case 'resource': {
      const name = { mana: '魔力', gold: '金幣', supplies: '補給' }[requirement.resource];
      return run.hero[requirement.resource] >= requirement.amount ? '' : `${name}不足（需要 ${requirement.amount}）`;
    }
  }
}

function enter(game: GameState, nodeId: string) {
  const run = game.run!;
  const node = NODES[nodeId]!;
  const firstVisit = !run.visited.includes(nodeId);
  run.nodeId = nodeId;
  run.battle = null;
  if (firstVisit) run.visited.push(nodeId);
  run.phase = node.ending ? 'ended' : 'story';
  if (firstVisit && run.flags.includes('alert') && nodeId === 'parley-guard') {
    apply(run, [{ kind: 'resource', resource: 'hp', amount: -3 }], game);
    log(run, '高警戒弩手射下警告，生命 -3。');
  }
  if (firstVisit && run.flags.includes('alert') && nodeId === 'dream-woman') {
    apply(run, [{ kind: 'resource', resource: 'mana', amount: -2 }], game);
    log(run, '夢女藉你宣告的名字抽走 2 魔力。');
  }
  if (run.hero.hp === 0 && nodeId !== 'defeat') { enter(game, 'defeat'); return; }
  // Insight belongs to the campaign, not the run. Revisiting a milestone cannot
  // farm it; terminal actions cannot be replayed after their revision changes.
  if (DISCOVERY_IDS.includes(nodeId) && !game.profile.discoveries.includes(nodeId)) {
    game.profile.discoveries.push(nodeId);
    game.profile.insight += 1;
    log(run, '新見聞已記錄：永久見聞 +1，可於遠征結束後用於村莊養成。');
  }
  if (nodeId === 'outfitter' && firstVisit && run.flags.includes('merchant')) {
    apply(run, [{ kind: 'item', value: 'potion' }, { kind: 'item', value: 'potion' }]);
    log(run, '商人送來療傷藥 ×2。');
  }
  if (node.ending === 'victory' && firstVisit) {
    game.profile.victories += 1;
    game.profile.insight += 2;
    log(run, '夢魘已解除。勝利見聞 +2；本趟結算完成。');
    const tale = nodeId === 'fever-dawn' ? 'fever-account' : nodeId === 'nameless-dawn' ? 'nameless-account' : 'hero-return';
    if (!game.profile.tales.includes(tale)) game.profile.tales.push(tale);
  }
}

export function getAvailableActions(game: GameState): ActionOption[] {
  const run = game.run;
  if (!run || run.phase === 'ended') return [];
  if (run.phase === 'story') {
    return NODES[run.nodeId]!.choices.map(choice => {
      const reason = (choice.requires ?? []).map(r => unmetRequirement(run, r)).find(Boolean) ?? '';
      return { id: choice.id, label: choice.label, detail: choice.detail, disabled: Boolean(reason), reason };
    });
  }
  const spec = CLASSES[run.hero.classId];
  const specialization = run.specialization ? SPECIALIZATIONS[run.specialization] : null;
  const skillCost = Math.max(1, spec.manaCost - (run.hero.inventory.includes('moonstone') ? 1 : 0) +
    (run.equippedRelic === 'candle-mirror' ? 1 : 0) - (run.specialization === 'mage-spellcharge' && run.battle!.prepared ? 1 : 0));
  const potionHealing = 16 + (run.loadoutUpgrades.includes('alchemy') ? 4 : 0) + (getOmen(run.seed).id === 'black-rain' ? 4 : 0);
  return [
    { id: 'attack', label: '普通攻擊', detail: '造成攻擊力 +0～2 傷害，再扣除敵方護甲。', disabled: false, reason: '' },
    { id: 'skill', label: specialization?.name ?? spec.skill, detail: `消耗 ${skillCost} 魔力。${specialization?.description ?? spec.skillDescription}${run.battle!.prepared ? ' 將消耗目前準備。' : ''}`, disabled: run.hero.mana < skillCost, reason: run.hero.mana < skillCost ? '魔力不足，格擋可恢復魔力' : '' },
    { id: 'guard', label: '格擋並調息', detail: `本回合額外減傷 ${(getOmen(run.seed).id === 'still-star' ? 10 : 7) + (run.equippedRelic === 'covenant-knot' ? 3 : 0)}，恢復 3 魔力。${specialization?.prepared ? '承受敵方行動後取得一次準備。' : ''}`, disabled: false, reason: '' },
    { id: 'potion', label: '使用療傷藥', detail: `消耗 1 瓶，恢復 ${potionHealing} 生命。敵人仍會行動。`, disabled: !run.hero.inventory.includes('potion') || run.hero.hp === run.hero.maxHp, reason: !run.hero.inventory.includes('potion') ? '沒有療傷藥' : run.hero.hp === run.hero.maxHp ? '生命已滿' : '' },
    { id: 'flee', label: '撤離遠征', detail: '結束本趟，保留永久見聞與村莊養成。', disabled: false, reason: '' },
  ];
}

function fight(game: GameState, id: string) {
  const run = game.run!;
  const battle = run.battle!;
  const hero = run.hero;
  const enemy = ENEMIES[battle.enemyId];
  const intent = enemy.intents[battle.intent]!;
  const spec = CLASSES[hero.classId];
  const specialization = run.specialization;
  const omen = getOmen(run.seed);
  let mitigation = 0;
  let willPrepare = false;
  if (id === 'flee') { enter(game, 'retreat'); return; }
  if (id === 'guard') {
    hero.mana = Math.min(hero.maxMana, hero.mana + 3);
    mitigation = (omen.id === 'still-star' ? 10 : 7) + (run.equippedRelic === 'covenant-knot' ? 3 : 0);
    willPrepare = Boolean(specialization && SPECIALIZATIONS[specialization].prepared);
    log(run, '你穩住架勢，恢復 3 魔力。');
  } else if (id === 'potion') {
    const healing = 16 + (run.loadoutUpgrades.includes('alchemy') ? 4 : 0) + (omen.id === 'black-rain' ? 4 : 0);
    apply(run, [{ kind: 'consume', value: 'potion' }, { kind: 'resource', resource: 'hp', amount: healing }]);
    log(run, '你喝下療傷藥。');
  } else {
    const rolled = nextRandom(run.random);
    run.random = rolled.state;
    let damage = hero.attack + Math.floor(rolled.value * 3);
    let armor = intent.exposed ? 0 : enemy.armor;
    if (hero.inventory.includes('sacnoth')) damage += 3;
    if (omen.id === 'blood-moon') damage += 2;
    if (id === 'attack' && run.equippedRelic === 'covenant-knot') damage -= 2;
    if (enemy.id === 'crocodile') {
      if (run.flags.includes('staff')) armor = 0;
      if (run.flags.includes('weakness')) damage += 2;
    }
    if (id === 'skill') {
      const wasPrepared = battle.prepared;
      hero.mana -= Math.max(1, spec.manaCost - (hero.inventory.includes('moonstone') ? 1 : 0) +
        (run.equippedRelic === 'candle-mirror' ? 1 : 0) - (specialization === 'mage-spellcharge' && wasPrepared ? 1 : 0));
      damage += hero.classId === 'mage' ? 8 : 5;
      armor = 0;
      if (specialization === 'warrior-riposte') {
        armor = wasPrepared ? 0 : enemy.armor;
        if (wasPrepared) damage += 7;
      }
      if (specialization === 'mage-spellcharge') {
        damage += wasPrepared ? 4 : -2;
      }
      if (specialization === 'ranger-opening' && wasPrepared && intent.exposed) damage += 7;
      if (enemy.id === 'gaznak' && intent.exposed) damage += 4;
      if (run.equippedRelic === 'candle-mirror' && intent.exposed) damage += 4;
      if (enemy.id === 'guardian' && run.flags.includes('guard-intel')) damage += 2;
      if (enemy.id === 'gaznak' && run.flags.includes('dream-intel')) damage += 2;
      if (hero.inventory.includes('ember')) damage += 3;
      mitigation = specialization === 'mage-spellcharge' || specialization === 'ranger-opening' || hero.classId === 'warrior' ? 0 : 3;
      battle.prepared = false;
    }
    damage = Math.max(0, damage - armor);
    battle.hp = Math.max(0, battle.hp - damage);
    log(run, `${id === 'skill' ? spec.skill : '普通攻擊'}造成 ${damage} 傷害。`);
    if (battle.hp === 0) {
      const destination = battle.next;
      log(run, `擊敗${enemy.name}。經驗 +${enemy.xp}、金幣 +${enemy.gold}。`);
      experience(run, enemy.xp);
      hero.gold = Math.min(999, hero.gold + enemy.gold);
      enter(game, destination);
      return;
    }
  }
  if (hero.inventory.includes('iron')) mitigation += 2;
  if (hero.inventory.includes('bell') && (enemy.id === 'wraith' || enemy.id === 'gaznak')) mitigation += 2;
  if (enemy.id === 'gaznak' && intent.drainsMana && run.flags.includes('counterspell')) mitigation += 3;
  const piercing = intent.piercing && id !== 'guard' ? intent.piercing : 0;
  const incoming = Math.max(0, intent.damage + piercing + (omen.id === 'blood-moon' ? 2 : 0) - hero.armor - mitigation);
  hero.hp = Math.max(0, hero.hp - incoming);
  hero.mana = Math.max(0, hero.mana - (intent.drainsMana ?? 0));
  log(run, `${enemy.name}反擊，造成 ${incoming} 傷害${intent.drainsMana ? `，吸取 ${intent.drainsMana} 魔力` : ''}。`);
  if (hero.hp === 0) { enter(game, 'defeat'); return; }
  if (willPrepare) {
    battle.prepared = true;
    log(run, '你取得一次準備；下一次技能會消耗它。');
  }
  battle.round += 1;
  battle.intent = (battle.intent + 1) % enemy.intents.length;
}

/** Every accepted action advances revision once. Invalid/stale inputs are inert. */
export function transition(state: GameState, action: Action): TransitionResult {
  const reject = (reason: string): TransitionResult => ({ state, accepted: false, reason });
  if (!action || action.revision !== state.revision) return reject('畫面已更新，請重新選擇。');
  if (state.contentVersion !== CONTENT_VERSION) return reject('存檔內容版本不相容。');
  const run = state.run;
  const active = run && run.phase !== 'ended';
  if (action.type === 'start') {
    if (active) return reject('請先完成或撤離目前遠征。');
    if (!CLASS_IDS.includes(action.classId) || !Number.isInteger(action.seed) || action.seed < 0 || action.seed > 0xffffffff) return reject('職業或種子不正確。');
  } else if (action.type === 'upgrade') {
    if (active || !Object.hasOwn(UPGRADES, action.id)) return reject('目前無法進行這項養成。');
    if (state.profile.upgrades.includes(action.id) || state.profile.insight < UPGRADES[action.id].cost) return reject('已經解鎖或見聞不足。');
  } else if (action.type === 'choose' || action.type === 'combat') {
    if (!active || run.phase !== (action.type === 'choose' ? 'story' : 'combat')) return reject('目前不能執行這個行動。');
    const option = getAvailableActions(state).find(candidate => candidate.id === action.id);
    if (!option || option.disabled) return reject(option?.reason ?? '找不到這個行動。');
  } else if (action.type === 'equip') {
    if (!active || run.phase !== 'story' || (action.id !== null && (!RELIC_IDS.includes(action.id) || !run.hero.inventory.includes(action.id)))) return reject('只能在戰鬥外裝備已持有的遺物。');
    if (run.equippedRelic === action.id) return reject('遺物裝備沒有變更。');
  } else if (action.type === 'retreat') {
    if (!active) return reject('目前沒有進行中的遠征。');
  } else return reject('不認得的行動。');

  const game: GameState = structuredClone(state);
  game.revision += 1;
  if (action.type === 'start') {
    const stats = CLASSES[action.classId].stats;
    const upgrades = game.profile.upgrades;
    const maxHp = stats.maxHp + (upgrades.includes('vigor') ? 6 : 0);
    const maxMana = stats.maxMana + (upgrades.includes('focus') ? 4 : 0);
    game.profile.expeditions += 1;
    game.run = {
      seed: action.seed, loadoutUpgrades: [...upgrades], random: seedRandom(action.seed), phase: 'story', nodeId: 'village',
      hero: { classId: action.classId, hp: maxHp, maxHp, mana: maxMana, maxMana, attack: stats.attack + (upgrades.includes('steel') ? 1 : 0), armor: stats.armor,
        level: 1, xp: 0, gold: 3, supplies: upgrades.includes('supplies') ? 3 : 2, inventory: upgrades.includes('supplies') ? ['potion', 'potion', 'potion'] : ['potion', 'potion'] },
      flags: [], specialization: null, equippedRelic: null, visited: ['village'], battle: null, log: ['遠征開始。觀察敵方招式，保留補給，帶回見聞。'],
    };
  } else if (action.type === 'upgrade') {
    game.profile.insight -= UPGRADES[action.id].cost;
    game.profile.upgrades.push(action.id);
  } else if (action.type === 'retreat') {
    enter(game, 'retreat');
  } else if (action.type === 'equip') {
    game.run!.equippedRelic = action.id;
    log(game.run!, action.id ? `裝備${ITEMS[action.id].name}。` : '卸下遺物。');
  } else if (action.type === 'combat') {
    fight(game, action.id);
  } else {
    const current = game.run!;
    const choice = NODES[current.nodeId]!.choices.find(c => c.id === action.id)!;
    log(current, choice.label);
    apply(current, choice.effects ?? [], game);
    if (current.hero.hp === 0) enter(game, 'defeat');
    else if (choice.encounter) {
      const destination = resolveDestination(current, choice);
      const enemy = ENEMIES[choice.encounter];
      current.phase = 'combat';
      current.battle = { enemyId: enemy.id, hp: enemy.hp, round: 1, intent: 0, next: destination, prepared: false };
      log(current, `遭遇${enemy.name}。先觀察下一個招式。`);
    } else enter(game, resolveDestination(current, choice));
  }
  return { state: game, accepted: true };
}
