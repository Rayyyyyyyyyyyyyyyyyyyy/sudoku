## 1. Reliable resume paths

- [x] 1.1 Restore idiom gameplay from the persisted puzzle and add a regression test across generator drift.
- [x] 1.2 Add Sudoku continuation navigation for saved daily and seeded sessions, including rendered route coverage.

## 2. Stable shared infrastructure

- [x] 2.1 Move seeded random primitives to a neutral shared module while preserving compatibility imports and exact output vectors.
- [x] 2.2 Remove runtime third-party font requests and preserve readable system font fallbacks.

## 3. Offline application shell

- [x] 3.1 Emit and register a production service worker that precaches the complete built application and supports cached navigation.
- [x] 3.2 Scope cache cleanup to this application and document first-visit/install/update behavior.

## 4. Verification

- [x] 4.1 Run focused resume, deterministic RNG, and service-worker/package tests.
- [x] 4.2 Run the complete engine and mounted UI suites, production build, OpenSpec validation, and diff checks.
