import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const CACHE_PREFIX = 'commute-game-cabinet-';

function normalizeBase(base) {
  return base.endsWith('/') ? base : `${base}/`;
}

function toPublicUrl(base, file) {
  const encodedPath = file
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${normalizeBase(base)}${encodedPath}`;
}

async function listFiles(directory, relativeDirectory = '') {
  const entries = await fs.readdir(path.join(directory, relativeDirectory), {
    withFileTypes: true
  });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(directory, relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files.sort();
}

async function buildIdFor(directory, files) {
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update(await fs.readFile(path.join(directory, file)));
  }
  return hash.digest('hex').slice(0, 16);
}

export function createServiceWorkerSource({ base, buildId, files }) {
  const normalizedBase = normalizeBase(base);
  const precacheUrls = files.map((file) => toPublicUrl(normalizedBase, file));
  const shellUrl = toPublicUrl(normalizedBase, 'index.html');

  return `const CACHE_PREFIX = ${JSON.stringify(CACHE_PREFIX)};
const CACHE_NAME = CACHE_PREFIX + ${JSON.stringify(buildId)};
const APP_SHELL_URL = ${JSON.stringify(shellUrl)};
const PRECACHE_URLS = ${JSON.stringify(precacheUrls, null, 2)};
const PRECACHE_URL_SET = new Set(
  PRECACHE_URLS.map((url) => new URL(url, self.registration.scope).href)
);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => (
        caches.open(CACHE_NAME).then((cache) => cache.match(APP_SHELL_URL))
      ))
    );
    return;
  }

  if (PRECACHE_URL_SET.has(url.href)) {
    event.respondWith(
      caches.open(CACHE_NAME)
        .then((cache) => cache.match(request))
        .then((cached) => cached || fetch(request))
    );
  }
});
`;
}

export function offlineServiceWorker() {
  let base = '/';
  let outDir = 'dist';
  let root = process.cwd();

  return {
    name: 'offline-service-worker',
    apply: 'build',
    configResolved(config) {
      base = config.base;
      outDir = config.build.outDir;
      root = config.root;
    },
    async closeBundle() {
      const outputDirectory = path.resolve(root, outDir);
      const files = (await listFiles(outputDirectory))
        .filter((file) => file !== 'service-worker.js');
      const buildId = await buildIdFor(outputDirectory, files);
      const source = createServiceWorkerSource({ base, buildId, files });
      await fs.writeFile(path.join(outputDirectory, 'service-worker.js'), source);
    }
  };
}
