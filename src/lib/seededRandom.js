/**
 * Serializable deterministic random primitives shared by game engines.
 *
 * `algorithm` and the transition sequence are persisted compatibility data.
 * Changing either requires explicit consumers' versioning; ordinary refactors
 * must preserve the exact stream produced by `xorshift32-v1`.
 */
export function seedRandom(seed) {
  const normalized = Number(seed) >>> 0;
  return { algorithm: 'xorshift32-v1', value: normalized || 0x6d2b79f5, calls: 0 };
}

export function validRandomState(state) {
  return Boolean(
    state && state.algorithm === 'xorshift32-v1' && Number.isInteger(state.value) &&
    state.value >= 0 && state.value <= 0xffffffff && Number.isInteger(state.calls) && state.calls >= 0
  );
}

export function nextRandom(state) {
  if (!validRandomState(state)) throw new Error('Invalid serialized PRNG state');
  let value = state.value >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  value >>>= 0;
  return {
    value: value / 0x100000000,
    state: { algorithm: state.algorithm, value, calls: state.calls + 1 }
  };
}

export function randomInt(state, maxExclusive) {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) throw new Error('maxExclusive must be positive');
  const next = nextRandom(state);
  return { value: Math.floor(next.value * maxExclusive), state: next.state };
}

export function shuffle(items, state) {
  const output = items.slice();
  let nextState = state;
  for (let index = output.length - 1; index > 0; index -= 1) {
    const selected = randomInt(nextState, index + 1);
    nextState = selected.state;
    [output[index], output[selected.value]] = [output[selected.value], output[index]];
  }
  return { items: output, state: nextState };
}

export function choose(items, state) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('Cannot choose from an empty list');
  const selected = randomInt(state, items.length);
  return { item: items[selected.value], index: selected.value, state: selected.state };
}
