import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('uses a static-host-safe router so reloading a game never requests /play from the server', async () => {
  const entry = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');

  assert.match(entry, /\bHashRouter\b/);
  assert.doesNotMatch(entry, /\bBrowserRouter\b/);
});
