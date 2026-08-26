## 1. Compatibility Baseline and Content Data

- [x] 1.1 Create a compatibility matrix for Jimbo's Game on DAVE THE DIVER Windows `v1.0.3.1551`, covering hand size, action counts, independent opponents, stage/round sequences, score targets, rewards, interest, reroll costs, and special rules, marking every value verified, inferred, or unknown.
- [x] 1.2 Add a versioned rules manifest and opponent/stage/round table under `src/data/poker/` with schema validation and tests for required IDs, one-or-more stages, exactly three rounds per stage, and the primary three-stage/nine-round progression.
- [x] 1.3 Inventory the reference modifier cards with stable neutral IDs, trigger timing, typed parameters, price, sale value, rarity, and verification status; document source provenance outside player-facing copy.
- [x] 1.4 Add separate versioned modifier, pack, and special-rule catalogs with validation tests that reject duplicate IDs, invalid handlers, impossible choice counts, and missing display data.
- [x] 1.5 Encode reference examples as compatibility fixtures, distinguishing the verified official flush mid-score observation from inferred straight and wheel baselines, interest boundaries, order-sensitive multipliers, and representative modifier combinations.

## 2. Deterministic Card and Poker Engine

- [x] 2.1 Implement a serializable seeded PRNG and deterministic shuffle utilities, and test identical streams plus save-and-resume continuation.
- [x] 2.2 Implement standard card creation with unique instance IDs and explicit draw, hand, played, and discarded zones.
- [x] 2.3 Add zone-transition helpers and invariant tests proving each card instance exists in exactly one zone after draw, play, discard, refill, and round reset.
- [x] 2.4 Implement poker-hand classification for one to five played cards, contributing-card identification, wheel and broadway straights, and all nine baseline hand classes.
- [x] 2.5 Add exhaustive and representative evaluator tests for ranking conflicts, kickers that do not score, four-card partial hands, and suit/rank edge cases.
- [x] 2.6 Implement baseline chips and multiplier scoring from the rules manifest, including card rank chips and configured integer rounding.

## 3. Ordered Effects and Run State Machine

- [x] 3.1 Implement typed score operations, event contexts, ordered traces, bounded event queues, and trigger-depth protection.
- [x] 3.2 Implement stable handler registries for modifier effects and special round rules, rejecting unknown handler IDs without evaluating catalog code.
- [x] 3.3 Implement additive chip and multiplier handlers plus left-to-right order tests against compatibility fixtures.
- [x] 3.4 Implement multiplicative, per-card, conditional, counter-growth, retrigger, and copy handlers with interaction and termination tests.
- [x] 3.5 Implement the explicit run reducer phases for new run, round introduction, selection, play, discard, resolution, round success, stage advancement, defeat, and final victory.
- [x] 3.6 Implement finite-deck refills, play/discard action limits, early target completion, deck exhaustion behavior, opponent/stage/three-round advancement, and the primary three-stage/nine-round run.
- [x] 3.7 Add deterministic full-run simulations that exercise victory, action-exhaustion defeat, special round rules, and identical same-seed action sequences.

## 4. Economy, Shop, and Catalog Completion

- [x] 4.1 Implement base rewards, one coin per remaining play action, and one-per-five interest capped at five, including modifier and round-rule overrides plus boundary tests.
- [x] 4.2 Implement deterministic shop offers, affordability and inventory checks, the verified initial one-coin reroll plus a catalog-isolated provisional `1, 2, 3, ...` escalation, continue flow, and exactly-once transactions.
- [x] 4.3 Implement pack opening, inspect, choose, skip, and return-to-shop flows while preserving deterministic random state.
- [x] 4.4 Implement six-slot modifier ownership, selling, persistent counters, and tap-accessible left/right reordering in domain state.
- [x] 4.5 Implement and unit-test every modifier in the compatibility catalog by effect family, resolving or explicitly documenting every previously unknown behavior.
- [x] 4.6 Implement and unit-test every researched special round and pack distribution, keeping unverified offer and rarity weights explicitly provisional in the compatibility catalog.
- [x] 4.7 Run all researched score, economy, shop, and round fixtures against the completed engine and reconcile remaining compatibility discrepancies.

## 5. Persistence and Records

- [x] 5.1 Define and validate a versioned poker snapshot schema containing phase, opponent ID, stage and round cursor, PRNG state, card zones, selection, actions, score, modifiers, coins, offers, trace, timers, and completion guards.
- [x] 5.2 Implement separate poker localStorage load, save, clear, and safe-migration functions without changing any existing Sudoku key or format.
- [x] 5.3 Persist after every committed reducer transition and add reload tests for card selection, resolved hands, round and stage transitions, purchases, packs, reorders, defeat, and victory.
- [x] 5.4 Implement incompatible-run recovery that preserves records, reports the version conflict, and lets the user start over deliberately.
- [x] 5.5 Implement idempotent poker statistics for runs started, runs won, highest completed score, and win streak, with duplicate-completion tests.

## 6. Game Hub and Routing

- [x] 6.1 Move the existing Sudoku landing experience to `/sudoku` without changing its settings, statistics, daily puzzle, difficulty actions, or direct `/daily` and `/play/:level` behavior.
- [x] 6.2 Build the shared `/` game hub with Sudoku and poker entries, active-session summaries including opponent/stage/round position, and resume or new-run actions.
- [x] 6.3 Add `/poker` and `/poker/play` routes plus unknown-route recovery, direct-load tests, browser-back behavior, and confirmation before replacing an active run.
- [x] 6.4 Update navigation labels and return destinations so Sudoku and poker return to the correct landing or shared hub context.

## 7. Portrait Poker Experience

- [x] 7.1 Build the poker landing page with new-run, resume, records, rules, and incompatible-save states.
- [x] 7.2 Build the round header showing opponent, stage, round type and rule, score target, current score, coins, draw count, and play/discard counts.
- [x] 7.3 Build accessible standard-card and eight-card hand components with tap selection, contributing-card markers, deterministic ordering, and disabled-action feedback.
- [x] 7.4 Build Play and Discard controls, current-hand preview, compact modifier strip, and inspect sheets for hands, cards, modifiers, round rules, and deck composition.
- [x] 7.5 Render scoring from the engine trace with skippable/reduced-motion presentation and an inspectable chips-by-multiplier explanation.
- [x] 7.6 Build round-success, stage-advance, defeat, victory, and next-round transitions without permitting duplicate rewards or records.
- [x] 7.7 Build the shop, reroll, sell, pack-choice, inventory-capacity, and move-left/move-right interfaces with exactly-once action guards.
- [x] 7.8 Add responsive styles and viewport tests proving complete one-handed play at 360 CSS pixels with 44-pixel targets and no horizontal page scroll.

## 8. Verification and Release Readiness

- [x] 8.1 Add accessible names, focus handling, non-color state markers, keyboard parity, and reduced-motion coverage for all poker interactions.
- [x] 8.2 Run the full Node test suite and production build, fixing poker failures and any regression in existing Sudoku tests.
- [x] 8.3 Verify existing Sudoku deep links, persisted settings, statistics, active games, and daily puzzles against the new hub and routing structure.
- [x] 8.4 Complete manual mobile checks for interruption and recovery at every run phase, long localized text, card inspection, shop decisions, and modifier reordering.
- [x] 8.5 Audit player-facing assets, terminology, and notices to ensure no third-party art, characters, audio, branding, or source code is shipped.
- [x] 8.6 Document the selected build, opponent/stage/round baseline, known deviations and provisional values, persistence versions, controls, and local development workflow in the repository documentation.
