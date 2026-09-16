import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solveInformationGraph } from './searchProbe.mjs';

const terminal = won => ({ kind: 'terminal', won });
const run = (graph, root = 'root', limits) => solveInformationGraph(root, {
  key: state => state,
  expand: state => {
    assert.ok(Object.hasOwn(graph, state), `Missing node: ${state}`);
    return graph[state];
  },
}, limits);

test('a fixed seed winning branch cannot certify an unobserved commitment', () => {
  // Choose left or right BEFORE observing the next intent: neither is safe.
  assert.equal(run({
    root: { kind: 'OR', children: ['left', 'right'] },
    left: { kind: 'AND', children: ['win', 'lose'] },
    right: { kind: 'AND', children: ['lose', 'win'] },
    win: terminal(true), lose: terminal(false),
  }).verdict, 'LOSE');
});

test('free preview occurs before action choice and permits different responses', () => {
  // The player sees either intent, then chooses the matching short action.
  // Long-cast preview is an observation, not an irrevocable long-cast choice.
  assert.equal(run({
    root: { kind: 'AND', children: ['seen-left', 'seen-right'] },
    'seen-left': { kind: 'OR', children: ['win', 'lose'] },
    'seen-right': { kind: 'OR', children: ['lose', 'win'] },
    win: terminal(true), lose: terminal(false),
  }).verdict, 'WIN');
});

test('remembered observations distinguish otherwise identical resource states', () => {
  const evaluate = () => solveInformationGraph({ hp: 10, observed: null }, {
    key: state => JSON.stringify([state.hp, state.observed]),
    expand: state => state.observed === null
      ? { kind: 'AND', children: [{ hp: 10, observed: 'safe' }, { hp: 10, observed: 'interrupt' }] }
      : terminal(state.observed === 'safe'),
  }).verdict;
  // If the key omitted observed, the cached safe terminal would overwrite the
  // interrupt branch at the same depth and incorrectly certify this root.
  assert.equal(evaluate(), 'LOSE');
});

test('a shared information state is memoized at the same remaining depth', () => {
  const result = run({
    root: { kind: 'AND', children: ['a', 'b'] },
    a: { kind: 'OR', children: ['win'] },
    b: { kind: 'OR', children: ['win'] },
    win: terminal(true),
  });
  assert.equal(result.verdict, 'WIN');
  assert.equal(result.cacheHits, 1);
});

test('cycles terminate as UNKNOWN at the graph horizon, never as gameplay defeat', () => {
  const result = run({ root: { kind: 'OR', children: ['root'] } }, 'root', { maxEdges: 8 });
  assert.equal(result.verdict, 'UNKNOWN');
  assert.equal(result.expanded, 9);
  assert.equal(result.memoEntries, 0);
});

test('node-budget exhaustion is incomplete and cannot produce a certificate', () => {
  const graph = {
    root: { kind: 'AND', children: ['win', 'also-win'] },
    win: terminal(true), 'also-win': terminal(true),
  };
  assert.equal(run(graph, 'root', { maxNodes: 2 }).verdict, 'UNKNOWN');
  assert.equal(run(graph, 'root', { maxNodes: 3 }).verdict, 'WIN');
  assert.equal(run(graph, 'root', { maxNodes: 0 }).expanded, 0);
});

test('terminal nodes are decided at the horizon and the last budget slot', () => {
  assert.equal(run({ root: terminal(true) }, 'root', { maxEdges: 0, maxNodes: 1 }).verdict, 'WIN');
  assert.equal(run({ root: terminal(false) }, 'root', { maxEdges: 0, maxNodes: 1 }).verdict, 'LOSE');
});

test('one counterexample rejects an AND node; one witness proves an OR node', () => {
  const graph = { root: { kind: 'AND', children: ['lose', 'cycle'] },
    cycle: { kind: 'OR', children: ['cycle'] }, lose: terminal(false), win: terminal(true) };
  assert.equal(run(graph).verdict, 'LOSE');
  graph.root = { kind: 'OR', children: ['win', 'cycle'] };
  assert.equal(run(graph).verdict, 'WIN');
});

test('malformed branches and invalid budgets fail rather than silently pass', () => {
  assert.throws(() => run({ root: { kind: 'AND', children: [] } }), /needs children/);
  assert.throws(() => run({ root: terminal(true) }, 'root', { maxNodes: -1 }), /Invalid/);
});
