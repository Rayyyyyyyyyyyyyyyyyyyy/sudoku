## Context

The poker engine is intentionally deterministic and reducer-owned, but its browser persistence boundary currently checks only a subset of the state shape. A version-compatible snapshot can contain an out-of-range progression cursor, unknown phase data, duplicate inventory entries, or malformed records and still reach page rendering. Once loaded, React consumers assume the state is canonical and dereference the current round, catalog entries, offers, and counters without defensive checks.

Shop offers also persist a `cost` field while both the reducer and UI independently derive the effective price from catalog data and progression. That field is therefore a second, unused representation of the same rule. UI confidence comes mostly from source-pattern assertions rather than mounted React behavior.

The change must preserve the client-only architecture, deterministic engine, storage keys, schema version, existing valid saves, and the current deliberate final-round product rule. Existing unrelated working-tree changes must remain untouched.

## Goals / Non-Goals

**Goals:**

- Establish one parser boundary that turns untrusted browser data into a validated canonical poker run before React or the reducer consumes it.
- Validate phase-dependent and cross-field invariants, not only individual primitive fields.
- Preserve valid schema-v1 runs while normalizing away the non-authoritative offer `cost` field.
- Return recoverable incompatibility results instead of throwing or admitting invalid state.
- Normalize poker records into a safe display and idempotency model.
- Exercise critical poker routes and interactions through mounted React tests.
- Reconcile the stale final-round OpenSpec statement with the implemented product decision.

**Non-Goals:**

- Rebalance poker, change RNG consumption, alter score resolution, or change the final-round gameplay.
- Introduce Redux, a general state-machine library, a schema-validation production dependency, or a generic repository/service layer.
- Change localStorage keys, deliberately invalidate valid runs, or migrate to a new persistence schema version.
- Split global CSS, create a design system, or redesign existing screens.
- Replace deterministic Node tests or source-pattern smoke tests wholesale.

## Decisions

### 1. Parse and normalize at the persistence entry boundary

`persistence.js` will expose focused run and record parsers. Loading will parse JSON, check version compatibility, validate the full domain shape, and return either a canonical model or the existing recoverable `incompatible` result. React pages and the reducer may continue to trust successfully loaded state.

This keeps external data checks at the boundary instead of spreading optional chaining and fallback logic throughout UI components. A production schema library is not justified for one bounded hand-written state model; focused validators also make domain relationships such as phase payloads and catalog membership explicit.

Alternatives considered:

- Defensive checks in every consumer were rejected because they duplicate policy and still allow partially invalid state into the engine.
- A new runtime schema dependency was rejected because the repository has no other schema layer and the relevant cross-field invariants require domain functions regardless.

### 2. Validate relationships as well as fields

The run parser will validate at least:

- the opponent, stage, and round cursor resolves to a real configured round;
- every card has a valid identity, rank, suit, and zone membership, with the existing 52-card invariant preserved;
- selected IDs are unique and belong to the current hand;
- actions, scores, economy, timers, counters, histories, and transaction guards use finite canonical values;
- modifier instance and catalog IDs are valid and unique and capacity is respected;
- `shop`, `pack`, and `resolving` phases carry valid phase-specific payloads and legal next phases;
- offers and choices reference known catalogs, use unique stable IDs, and cannot grant an already-owned modifier;
- completion guards and progression state agree with the current run.

Validators will accumulate useful incompatibility reasons for tests and recovery copy, but player-facing text will remain concise.

### 3. Preserve schema v1 and normalize derived offer prices away

The offer `cost` property is not authoritative: pricing is determined by the versioned item catalog plus the settled-round/shop sequence. Newly generated offers will omit `cost`; the reducer and UI will continue to call the shared pricing function. The parser will tolerate and discard `cost` from older valid schema-v1 snapshots.

This is a safe normalization rather than a semantic migration, so neither the storage key nor persistence schema version changes. Rules-version checks still retire saves when authoritative pricing rules change.

Keeping the persisted price as authoritative was rejected because it would allow stale or corrupted data to override the versioned rules catalog and would require additional consistency validation.

### 4. Normalize records independently from active runs

Poker records remain in their separate storage key and survive active-run incompatibility. Their parser will accept only nonnegative finite integer counters, string run IDs, and unique ID arrays, filling missing or invalid fields from `emptyPokerRecords()` without spreading arbitrary parsed properties into the application model.

Run-started and completion writers will continue using ID arrays as exactly-once guards. This change does not attempt to infer lost historical records or redesign record retention.

### 5. Add a narrow mounted-React test boundary

The deterministic engine suite remains on Node's test runner. A Vite-compatible test runner with jsdom and React Testing Library will cover only behaviors that require rendering, routing, effects, focus, or browser APIs. Configuration will isolate mounted UI tests from the existing Node files, and the default `npm test` command will run both suites.

Initial integration scenarios will cover invalid-save recovery, no-save routing, selecting and resolving a hand, shop/pack duplicate guards, phase-heading or post-skip focus, disabled actions, and reduced-motion handling. Existing source-pattern tests may remain as inexpensive structural checks.

Full browser end-to-end automation was considered but deferred because these flows can be verified at the React boundary without browser installation and deployment complexity.

### 6. Treat code and the compatibility matrix as the current final-round decision

The primary stage-three special round intentionally has no additional selection restriction. The stale `add-poker-roguelike` delta requirement will be corrected before completed poker changes are synchronized or archived. This change documents the reconciliation but does not change runtime behavior.

## Risks / Trade-offs

- **[Over-strict parsing retires valid saves]** A new invariant may reject a state legitimately emitted by the reducer. → Derive accepted shapes from every persisted phase fixture and add exact round-trip coverage before tightening each check.
- **[Normalization changes snapshot equality]** Removing legacy `cost` means a loaded schema-v1 snapshot is semantically equal but not byte-equal. → Update tests to compare canonical state and explicitly verify legacy normalization.
- **[Two test runners increase maintenance]** Contributors may run only one suite. → Make `npm test` run both and provide focused `test:engine` and `test:ui` scripts.
- **[jsdom differs from a real browser]** Layout and animation timing remain approximate. → Keep existing targeted mobile/browser QA for visual layout and use mounted tests for interaction contracts only.
- **[Concurrent completed OpenSpec changes remain confusing]** Correcting one stale requirement does not itself establish main specs. → Reconcile the completed delta before performing the normal sync/archive workflow.

## Migration Plan

1. Add parser tests for every currently persisted phase and representative malformed variants.
2. Implement canonical run and record parsing while keeping storage keys and schema version unchanged.
3. Remove offer `cost` from newly generated state and normalize it away when loading older schema-v1 saves.
4. Add mounted React test configuration and critical recovery/interaction scenarios.
5. Correct the stale final-round OpenSpec requirement and run strict change validation.
6. Run the complete engine/UI suite, production build, and diff checks. Rollback can restore the prior parser and generated offer field because no storage key or authoritative state version changes.

## Open Questions

- Whether the recovery UI should expose detailed validation reasons only in development or keep the current summarized message in all builds.
- Whether source-pattern UI tests should remain in the default suite after equivalent mounted coverage exists; the initial implementation will retain them unless they become redundant or brittle.
