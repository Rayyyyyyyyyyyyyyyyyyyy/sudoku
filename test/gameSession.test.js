import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearGameSession,
  gameSessionPath,
  loadGameSession,
  persistGameSession
} from '../src/lib/gameSession.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key)
  };
}

function session(overrides = {}) {
  return {
    level: 2,
    seed: 123456,
    isDaily: false,
    values: new Array(81).fill(0),
    notes: Array.from({ length: 81 }, () => []),
    sel: 10,
    pencil: false,
    startedAt: 1_700_000_000_000,
    ...overrides
  };
}

test('restores an unfinished game only for the same route identity', () => {
  const storage = memoryStorage();
  const saved = session({ values: [7, ...new Array(80).fill(0)] });
  persistGameSession(saved, storage);

  assert.deepEqual(
    loadGameSession({ level: 2, seed: 123456, isDaily: false }, storage),
    saved
  );
  assert.equal(loadGameSession({ level: 2, seed: 654321, isDaily: false }, storage), null);
});

test('ignores malformed saved data and can clear a completed game', () => {
  const storage = memoryStorage();
  persistGameSession(session({ values: [99, ...new Array(80).fill(0)] }), storage);
  assert.equal(loadGameSession({ level: 2, seed: 123456, isDaily: false }, storage), null);

  persistGameSession(session(), storage);
  clearGameSession(storage);
  assert.equal(loadGameSession({ level: 2, seed: 123456, isDaily: false }, storage), null);
});

test('reconstructs the exact continuation route from a compatible session', () => {
  assert.equal(gameSessionPath(session()), '/play/2?seed=123456');
  assert.equal(gameSessionPath(session({ isDaily: true })), '/daily');
  assert.equal(gameSessionPath({ level: 2, seed: 123456, isDaily: false }), null);
});
