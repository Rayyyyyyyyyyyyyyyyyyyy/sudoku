import { EVENT_POOLS } from '../src/data/rpg/story.ts';
import { ENEMIES, getOmen, SPECIALIZATION_BY_CLASS } from '../src/lib/rpg/catalog.ts';
import { createGame, getAvailableActions, transition } from '../src/lib/rpg/engine.ts';
import { validGame } from '../src/lib/rpg/persistence.ts';
import { ROUTE_MATRIX, routeOverrides } from '../test/rpg/routeMatrix.ts';

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function act(game, action) {
  const result = transition(game, { ...action, revision: game.revision });
  invariant(result.accepted, result.reason);
  invariant(validGame(result.state), `invalid snapshot after ${JSON.stringify(action)}`);
  return result.state;
}

function start(classId = 'warrior', seed = 42) {
  return act(createGame(), { type: 'start', classId, seed });
}

function choose(game, id) {
  return act(game, { type: 'choose', id });
}

function battleAction(game) {
  const { hero, battle } = game.run;
  const intent = ENEMIES[battle.enemyId].intents[battle.intent];
  if (hero.hp <= hero.maxHp - 16 && hero.inventory.includes('potion') && intent.damage < 10) return 'potion';
  if (getAvailableActions(game).some(option => option.id === 'skill' && !option.disabled)) return 'skill';
  return intent.damage >= 9 ? 'guard' : 'attack';
}

const mainChoices = {
  village: 'listen', briefing: 'supplies', crossroads: 'ruins', ruins: 'rune', bridge: 'help',
  camp: 'staff', marsh: 'rescue', rescue: 'lift', crocodile: 'fight', forge: 'direct',
  outfitter: 'buy', gate: 'open', 'porte-resonant': 'parley', 'parley-guard': 'name',
  'parley-message': 'short', 'parley-servants': 'key', 'parley-cistern': 'study',
  'dream-woman': 'answer', 'dream-wall': 'cut', 'dream-candles': 'take', 'dream-stair': 'remember',
  webhall: 'fight', banquet: 'truth', refuge: 'rest', abyss: 'fight', bells: 'listen',
  threshold: 'rest', throne: 'fight', 'homecoming-records': 'hero',
};

function play(game, overrides = {}) {
  const states = [game];
  for (let step = 0; step < 150 && game.run.phase !== 'ended'; step += 1) {
    if (game.run.phase === 'combat') game = act(game, { type: 'combat', id: battleAction(game) });
    else {
      const options = getAvailableActions(game).filter(option => !option.disabled);
      invariant(options.length > 0, `no action at ${game.run.nodeId}`);
      const preferred = overrides[game.run.nodeId] ?? mainChoices[game.run.nodeId];
      game = choose(game, options.find(option => option.id === preferred)?.id ?? options[0].id);
    }
    states.push(game);
  }
  invariant(game.run.phase === 'ended', 'route did not terminate');
  return states;
}

function reachWildsEvent(seed) {
  let game = start('warrior', seed);
  for (const id of ['listen', 'supplies', 'bridge', 'leave', 'staff']) game = choose(game, id);
  return game;
}

const firstWitness = values => Object.fromEntries([...values.entries()].sort(([a], [b]) => a.localeCompare(b)));
const wilds = new Map();
const fortress = new Map();

for (let seed = 0; seed <= 255; seed += 1) {
  const wildState = reachWildsEvent(seed);
  if (!wilds.has(wildState.run.nodeId)) wilds.set(wildState.run.nodeId, seed);

  const states = play(start('ranger', seed), {
    ...routeOverrides('direct', 'dream'), camp: 'staff', marsh: 'covenant',
    'forest-covenant': 'keep', 'siege-day-one': 'staff', 'siege-night-one': 'support',
    'siege-day-two': 'shield', 'siege-night-two': 'track', 'siege-day-three': 'temper',
    webhall: 'sneak', refuge: 'focus',
  });
  const event = states.find(state => EVENT_POOLS.fortress.includes(state.run.nodeId));
  if (event && !fortress.has(event.run.nodeId)) fortress.set(event.run.nodeId, seed);
}

invariant(wilds.size === 8, `expected 8 wilds witnesses, got ${wilds.size}`);
invariant(fortress.size === 8, `expected 8 fortress witnesses, got ${fortress.size}`);

const matrix = [];
for (const route of ROUTE_MATRIX) {
  for (const seed of route.seeds) {
    const states = play(start(route.classId, seed), routeOverrides(route.mode, route.route));
    const end = states.at(-1);
    invariant(end.run.nodeId === 'dawn', `${route.name}/${seed} ended at ${end.run.nodeId}`);
    invariant(end.run.specialization === SPECIALIZATION_BY_CLASS[route.classId][route.mode], `${route.name}/${seed} specialization mismatch`);
    matrix.push({ route: route.name, seed, omen: getOmen(seed).id, decisions: route.decisions.length, end: end.run.nodeId });
  }
}

process.stdout.write(`${JSON.stringify({
  generatedBy: 'npm run rpg:verify-v2',
  routeRuns: matrix.length,
  omens: [...new Set(matrix.map(row => row.omen))].sort(),
  routes: ROUTE_MATRIX.map(route => ({ name: route.name, decisions: route.decisions.length, delayedConsequences: route.delayedConsequences })),
  witnesses: {
    wildsPrefix: ['listen', 'supplies', 'bridge', 'leave', 'staff'],
    wilds: firstWitness(wilds),
    fortressPrefix: ['direct', 'dream', 'siege', 'sneak', 'focus'],
    fortress: firstWitness(fortress),
  },
}, null, 2)}\n`);
