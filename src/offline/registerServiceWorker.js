export function registerServiceWorker({
  serviceWorker = globalThis.navigator?.serviceWorker,
  baseUrl = '/'
} = {}) {
  if (!serviceWorker) return Promise.resolve(undefined);

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return serviceWorker.register(`${normalizedBase}service-worker.js`, {
    scope: normalizedBase
  });
}
