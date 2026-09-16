// Task 0 experiment only. Not imported by the game or a content certificate.
// Nodes represent INFORMATION states. Chance/reveal edges are AND; choices OR.
// maxEdges is a graph depth limit, not a proposed gameplay turn limit.
export function solveInformationGraph(root, { key, expand }, { maxEdges = 64, maxNodes = 10000, collectStrategy = false } = {}) {
  for (const [name, value] of Object.entries({ maxEdges, maxNodes })) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid ${name}`);
  }
  const memo = new Map();
  const choices = new Map();
  let expanded = 0;
  let hits = 0;
  function visit(state, remaining) {
    const cacheKey = JSON.stringify([key(state), remaining]);
    if (memo.has(cacheKey)) {
      hits += 1;
      return memo.get(cacheKey);
    }
    if (expanded >= maxNodes) return 'UNKNOWN';
    expanded += 1;
    const node = expand(state);
    if (node.kind === 'terminal') {
      if (typeof node.won !== 'boolean') throw new Error('Terminal must specify won');
      const result = node.won ? 'WIN' : 'LOSE';
      memo.set(cacheKey, result);
      return result;
    }
    if (!['AND', 'OR'].includes(node.kind) || !Array.isArray(node.children)) {
      throw new Error('Invalid information graph node');
    }
    // Empty outcomes cannot prove universal success. Treat malformed catalogs
    // as errors rather than vacuously certifying an AND node.
    if (!node.children.length) throw new Error('Nonterminal needs children');
    if (remaining === 0) return 'UNKNOWN';
    let unknown = false;
    for (const [index, child] of node.children.entries()) {
      const result = visit(child, remaining - 1);
      if ((node.kind === 'OR' && result === 'WIN') || (node.kind === 'AND' && result === 'LOSE')) {
        memo.set(cacheKey, result);
        if (collectStrategy && node.kind === 'OR' && result === 'WIN') choices.set(cacheKey, index);
        return result;
      }
      unknown ||= result === 'UNKNOWN';
    }
    const result = unknown ? 'UNKNOWN' : node.kind === 'OR' ? 'LOSE' : 'WIN';
    // A resource cutoff is not a durable gameplay conclusion.
    if (result !== 'UNKNOWN') memo.set(cacheKey, result);
    return result;
  }
  const verdict = visit(root, maxEdges);
  return { verdict, expanded, cacheHits: hits, memoEntries: memo.size,
    ...(collectStrategy ? { strategy: Object.fromEntries(choices) } : {}) };
}
