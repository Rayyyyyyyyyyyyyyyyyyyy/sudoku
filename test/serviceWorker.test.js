import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {
  CACHE_PREFIX,
  createServiceWorkerSource
} from '../build/offlineServiceWorker.js';
import { registerServiceWorker } from '../src/offline/registerServiceWorker.js';

function installWorker(source, { fetchImpl = async () => ({ source: 'network' }) } = {}) {
  const listeners = new Map();
  const deleted = [];
  const added = [];
  const matches = [];
  let cacheNames = [];
  let fetchCalls = 0;

  const cache = {
    async addAll(urls) {
      added.push(...urls);
    },
    async match(request) {
      matches.push(request);
      const url = typeof request === 'string' ? request : request.url;
      return { source: 'cache', url };
    }
  };
  const caches = {
    async open() {
      return cache;
    },
    async keys() {
      return cacheNames;
    },
    async delete(name) {
      deleted.push(name);
      return true;
    },
  };
  const self = {
    registration: { scope: 'https://example.test/games/' },
    location: { origin: 'https://example.test' },
    clients: { claim: async () => undefined },
    skipWaiting: async () => undefined,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    }
  };

  vm.runInNewContext(source, {
    self,
    caches,
    URL,
    Promise,
    Set,
    fetch: async (...args) => {
      fetchCalls += 1;
      return fetchImpl(...args);
    }
  });

  return {
    listeners,
    added,
    deleted,
    matches,
    setCacheNames(names) {
      cacheNames = names;
    },
    get fetchCalls() {
      return fetchCalls;
    }
  };
}

function dispatchWaitable(listener) {
  let completion;
  listener({ waitUntil(promise) { completion = promise; } });
  return completion;
}

function dispatchFetch(listener, request) {
  let response;
  listener({ request, respondWith(promise) { response = promise; } });
  return response;
}

const files = ['assets/app-123.js', 'assets/app-456.css', 'favicon.svg', 'index.html'];
const source = createServiceWorkerSource({
  base: '/games/',
  buildId: 'build-123',
  files
});

test('production worker precaches every emitted application file', async () => {
  const worker = installWorker(source);
  await dispatchWaitable(worker.listeners.get('install'));

  assert.deepEqual(worker.added, [
    '/games/assets/app-123.js',
    '/games/assets/app-456.css',
    '/games/favicon.svg',
    '/games/index.html'
  ]);
});

test('activation deletes only obsolete caches owned by this application', async () => {
  const worker = installWorker(source);
  worker.setCacheNames([
    `${CACHE_PREFIX}old-build`,
    `${CACHE_PREFIX}build-123`,
    'another-application-cache'
  ]);

  await dispatchWaitable(worker.listeners.get('activate'));
  assert.deepEqual(worker.deleted, [`${CACHE_PREFIX}old-build`]);
});

test('precache assets are cache-first', async () => {
  const worker = installWorker(source);
  const response = await dispatchFetch(worker.listeners.get('fetch'), {
    method: 'GET',
    mode: 'same-origin',
    url: 'https://example.test/games/assets/app-123.js'
  });

  assert.equal(response.source, 'cache');
  assert.equal(worker.fetchCalls, 0);
});

test('offline navigation falls back to the cached application shell', async () => {
  const worker = installWorker(source, {
    fetchImpl: async () => { throw new Error('offline'); }
  });
  const response = await dispatchFetch(worker.listeners.get('fetch'), {
    method: 'GET',
    mode: 'navigate',
    url: 'https://example.test/games/'
  });

  assert.equal(response.source, 'cache');
  assert.equal(worker.matches.at(-1), '/games/index.html');
});

test('registration uses the configured production base as its scope', async () => {
  const calls = [];
  const registration = { active: true };
  const result = await registerServiceWorker({
    baseUrl: '/games',
    serviceWorker: {
      async register(...args) {
        calls.push(args);
        return registration;
      }
    }
  });

  assert.equal(result, registration);
  assert.deepEqual(calls, [[
    '/games/service-worker.js',
    { scope: '/games/' }
  ]]);
});
