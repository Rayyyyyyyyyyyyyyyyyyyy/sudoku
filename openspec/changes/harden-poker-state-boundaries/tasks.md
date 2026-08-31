## 1. Persistence Regression Coverage

- [x] 1.1 Extend poker persistence fixtures to cover canonical round-intro, selecting, resolving, round-won, shop, pack, run-lost, and run-won snapshots emitted by the reducer.
- [x] 1.2 Add rejection tests for out-of-range progression cursors, invalid or duplicate card and selection IDs, unknown or duplicate modifiers, malformed transaction guards, and inconsistent phase-specific payloads.
- [x] 1.3 Add record-normalization tests for invalid counters, unsupported properties, duplicate or non-string run IDs, and exactly-once completion after normalization.
- [x] 1.4 Add a schema-v1 compatibility fixture proving that a legacy persisted offer `cost` is removed without changing authoritative shop, random, purchase, or economy state.

## 2. Canonical Persistence Boundary

- [x] 2.1 Implement focused primitive, collection, catalog-reference, progression, card-zone, inventory, timer, completion, and identity validators in the poker persistence boundary.
- [x] 2.2 Implement phase-aware validation for round, resolving, shop, pack, and terminal state, including legal pending next phases and valid offer/choice relationships.
- [x] 2.3 Add a canonical active-run parser that checks persistence and rules versions, accumulates validation errors, normalizes supported legacy fields, and never exposes partially valid state.
- [x] 2.4 Route `loadPokerSnapshot`, `migratePokerSnapshot`, and `savePokerSnapshot` through the canonical parser while preserving the existing storage key, schema version, and recoverable incompatibility result.
- [x] 2.5 Implement canonical poker-record parsing and update record load/write operations to expose only supported normalized fields while retaining exactly-once ID guards.

## 3. Single-Source Shop Pricing

- [x] 3.1 Remove the derived `cost` property from newly generated modifier and pack offers and update deterministic shop fixtures accordingly.
- [x] 3.2 Confirm the reducer and UI use the shared catalog-and-progression pricing function for display, affordability, and coin deduction after both new generation and legacy snapshot recovery.
- [x] 3.3 Add reducer tests proving a stale or forged persisted price cannot change purchase availability or the deducted amount.

## 4. Mounted React Verification

- [x] 4.1 Add isolated Vitest, jsdom, and React Testing Library configuration plus `test:engine` and `test:ui` scripts, with `npm test` running both suites.
- [x] 4.2 Add mounted route tests for empty, malformed, version-incompatible, and valid active-run saves, including recovery copy, redirects, active-run clearing, and poker-record preservation.
- [x] 4.3 Add mounted gameplay tests for card selection, disabled action reasons, committed score resolution, skip/automatic completion convergence, accessible status updates, and intended post-transition focus.
- [x] 4.4 Add mounted shop and pack tests for affordability, inventory capacity, duplicate ownership guards, catalog-derived pricing, and return to the same shop state.
- [x] 4.5 Add reduced-motion media-query coverage that verifies comprehensible status and bounded resolution completion without the full sequential animation.

## 5. Specification Reconciliation

- [x] 5.1 Update the completed `add-poker-roguelike` gameplay delta so the primary stage-three special round matches the implemented and documented product adjustment of no additional card-selection restriction.
- [x] 5.2 Cross-check the compatibility matrix, research notes, catalog, tests, and affected OpenSpec artifacts so verified reference behavior and deliberate product deviations remain explicitly distinguishable.
- [x] 5.3 Confirm the previously completed poker changes are internally consistent and ready for the separate main-spec synchronization and archive workflow.

## 6. Final Verification

- [x] 6.1 Run the complete deterministic engine and mounted UI suites, fixing all regressions without changing scoring or PRNG outcomes.
- [x] 6.2 Run the production build, `git diff --check`, and strict OpenSpec validation for `harden-poker-state-boundaries` and the reconciled completed poker changes.
- [x] 6.3 Verify representative valid and malformed snapshots manually through `/poker`, `/poker/play`, reload, recovery clearing, shop, pack, defeat, and victory flows while confirming Sudoku storage and routes remain unchanged.
