## Why

The game cabinet persists progress locally and describes itself as offline, but Sudoku exposes that a save exists without a continuation route. The production shell also depends on remote fonts and has no application-owned offline cache, so a previously visited deployment cannot reliably cold-start without a network connection.

## What Changes

- Add a visible Sudoku continuation path using the stored route identity, with deliberate replacement behavior preserved.
- Move seeded random primitives to a neutral shared boundary while keeping poker deterministic outputs compatible.
- Make the production application shell and bundled game data available after a successful online visit, without runtime third-party requests.
- Add focused persistence, route, service-worker, and production-package verification.

## Impact

- Runtime: React route/home flows, shared deterministic random utilities, service-worker registration and cache lifecycle.
- Persistence: Sudoku and poker localStorage keys and snapshot versions remain unchanged.
- Deployment: static hosting must serve the generated service worker from the application root. Offline availability begins after one successful online load and service-worker installation.
- Dependencies: use browser and Vite capabilities already present; do not add a production runtime dependency.
