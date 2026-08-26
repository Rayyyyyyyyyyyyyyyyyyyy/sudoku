## Context

The repository is a client-only React 18 and Vite SPA. Sudoku currently owns the root landing page, hash routes, reducer-driven play state, deterministic seeded puzzle choice, and versioned localStorage records. The new game introduces a substantially richer state machine: finite card zones, deterministic random decisions, ordered score effects, shops and packs, a modifier inventory, special rounds, and resumable multi-stage runs.

The compatibility target is the documented behavior of Jimbo's Game in DAVE THE DIVER, using Windows build `v1.0.3.1551` as the initial compatibility baseline. A match belongs to one opponent, contains one or more stages, and each stage contains exactly three rounds; it does not use the earlier assumed eight-by-three structure. The primary playable run mirrors Junak's three stages and nine rounds; the five villager matches are independent one-stage, three-round fixtures or tutorial variants and are not concatenated into the same economy run.

Available sources establish the complete target table and the major special rules but do not form a complete machine-readable specification of every random weight or modifier interaction. The design therefore separates verified compatibility data from deterministic provisional defaults so later corrections remain localized. Presentation remains original or neutral even while mechanics initially target faithful behavior.

## Goals / Non-Goals

**Goals:**

- Reproduce the reference game's observable run, scoring, economy, and ordered-effect behavior before custom balancing.
- Make every gameplay transition deterministic, testable, serializable, and safe to resume after interruption.
- Keep rule constants and content catalogs separate from engine control flow.
- Provide a touch-first portrait experience without regressing current Sudoku routes, data, or play.
- Produce score traces that both the UI and automated tests can explain.

**Non-Goals:**

- Importing third-party source code, art, character designs, logos, music, sound, or branded copy.
- Online accounts, leaderboards, cloud sync, multiplayer, purchases, or a backend service.
- Custom rebalancing, new game modes, permanent power progression, or community mod loading in the first compatibility release.
- Evaluating arbitrary JavaScript expressions stored in content data.

## Decisions

### 1. Use a pure deterministic engine behind a reducer

Poker domain logic will live under `src/lib/poker/` as pure modules for cards and zones, hand evaluation, scoring, effect dispatch, shop generation, round and stage progression, seeded randomization, persistence validation, and a top-level run reducer. React components dispatch domain actions and render returned state; they do not calculate authoritative scores or mutate card zones.

The run phase is explicit rather than inferred:

```text
new-run -> round-intro -> selecting -> resolving
                ^              |           |
                |              v           v
                +----------- draw      round-won -> shop -> next round
                                        |
                                        +-> stage-won -> next stage
                                        +-> run-won
                selecting -> no hands below target -> run-lost
```

Each committed action returns the next immutable state and a domain-event trace. This follows the existing Sudoku reducer approach while preventing UI closures from becoming rule state.

Alternatives considered: component-local state is simpler initially but cannot reliably restore mid-shop and mid-resolution states; a general state-machine dependency would add a production dependency without removing the need for domain-specific transition tests.

### 2. Persist the PRNG state, not only the initial seed

All gameplay randomness will use a small repository-owned deterministic PRNG with an explicit serializable state. Deck shuffles, shop offers, pack contents, random modifier values, and any randomized special-round behavior consume that one state through engine functions. `Math.random()` is prohibited in gameplay modules.

Persisting only the seed was rejected because restoring midway would require replaying every prior random call and would make compatibility migrations fragile.

### 3. Model card zones explicitly

Run state will distinguish `drawPile`, `hand`, `played`, and `discarded` zones with unique card instance IDs. Zone transitions validate that every standard card instance occurs in exactly one zone. A new round reconstructs the baseline deck and applies any registered deck changes before shuffling.

This is preferred to keeping one deck plus status flags because unique zones make exhaustion, persistence validation, rendering order, and invariants directly testable.

### 4. Resolve scoring through typed events

The scoring engine will create a context containing hand classification, contributing cards, chips, multiplier, active round rule, modifier order, and trace. It will process typed events such as `hand-start`, `card-score`, `card-scored`, `hand-scored`, and `settlement`. Registered modifier and special-rule handlers can emit typed operations such as `add-chips`, `add-mult`, `multiply-mult`, `repeat-trigger`, or `change-counter`.

Handlers are registered in code by stable IDs; versioned content data supplies parameters and metadata. Data never contains executable expressions. A bounded event queue and trigger-depth limit prevent accidental infinite retrigger loops.

Applying all additive effects and then all multiplicative effects was rejected because the reference behavior is intentionally sensitive to card and modifier order.

### 5. Keep compatibility content in a versioned manifest

`src/data/poker/` will contain a versioned rules manifest, opponent/stage/round table, modifier catalog, and pack catalog. The progression schema is `opponent -> stages[] -> rounds[3]`: it permits one or more stages, requires exactly three ordered round types per stage (`small`, `big`, `special`), and does not encode an eight-stage assumption. The shipping new-run entry points at the researched Junak three-stage/nine-round table. One-stage villager opponents remain separate compatibility fixtures or selectable tutorial variants, and coins or modifiers never carry between separate opponent matches.

Each behavior entry will have a stable internal ID, neutral display copy, typed parameters, provenance, and a verification status (`verified`, `inferred`, or `unknown`) used during development. Fixtures will capture observable reference calculations and economy examples. Unknown values do not block the first implementation: they must be isolated behind explicit deterministic provisional defaults. The initial shop reroll cost is verified as one coin; until escalation is captured, the catalog uses the documented provisional sequence `1, 2, 3, ...`. Unknown offer or pack weights use a named deterministic provisional distribution rather than being implied to be verified.

Correcting a target, price, or effect parameter increments `rulesVersion`. Persistence records both persistence schema version and rules version. Development-only provenance notes can cite research sources without showing third-party branding in the player interface.

Hard-coding each modifier into the main reducer was rejected because it couples compatibility research to phase control and makes effect combinations difficult to test.

### 6. Save stable phase snapshots after every committed transition

Poker uses new localStorage keys, separate from all Sudoku keys. The persisted snapshot includes phase, PRNG state, card zones and ordering, selection, actions remaining, score, `opponentId`, `stageIndex`, `roundIndex`, inventory order and counters, coins, shop or pack offers, scoring trace, seed, rules version, and a completion-recorded flag.

Animated intermediate frames are derived from a stable resolution trace and are not separately persisted. A reload during animation restores the resolved stable state and lets the UI replay or skip the presentation. Purchases and record updates are reducer transitions with idempotency guards.

### 7. Add a hub while preserving direct Sudoku routes

The root route becomes a compact game hub. The current Sudoku landing content moves to `/sudoku`; `/daily` and `/play/:level` retain their current meaning so saved and shared URLs remain valid. Poker uses `/poker` for run setup/resume and `/poker/play` for the active run. Unknown routes return to the hub.

Keeping Sudoku at `/` and placing poker only in a footer was rejected because it does not create a scalable game collection and makes active-session discovery weak.

### 8. Use a portrait-first poker table with progressive disclosure

The active screen prioritizes, from top to bottom: current stage and round rule, target and score, ordered modifier strip, hand, Play/Discard actions, and remaining counts. Coins, deck composition, guides, full effect text, shop detail, and the score trace appear in tap-open sheets. Reordering has explicit move-left/move-right controls; drag is optional enhancement only.

Desktop expands the same regions but does not introduce a different rules workflow. This avoids a dense reproduction of the reference game's landscape layout that would be impractical on a commute phone.

### 9. Test the engine independently from React

Node tests will cover poker classification, card-zone invariants, deterministic shuffles and offers, baseline score tables, ordered effect fixtures, retrigger bounds, economy and interest, stage/round transitions, persistence round trips, migrations, and complete seeded run simulations. React/router tests will cover hub routes, touch-accessible actions, resume/start-over behavior, and critical rendering states.

## Risks / Trade-offs

- **[Incomplete reference rules]** Reroll escalation, random offer or pack weights, and some modifier interactions are not yet publicly verified. → Track confidence and provenance in the compatibility manifest, add fixtures for every verified example, and isolate named deterministic provisional defaults so implementation can proceed without silently presenting them as confirmed.
- **[Compatibility scope expands]** A faithful catalog is much larger than a small custom prototype. → Implement vertical slices in task order but keep catalog completion and compatibility tests within the same change before declaring it complete.
- **[Effect combinations create exponential edge cases]** Retriggers and ordered multiplication can interact unexpectedly. → Use typed events, a bounded queue, deterministic fixtures, and property-style invariants for score and zone safety.
- **[Saved runs become invalid after rule corrections]** Continuing under changed content could produce impossible state. → Store both schema and rules versions, add explicit migrations only when semantics are safe, and preserve records when an active run must be retired.
- **[Mobile cards and modifiers become visually dense]** Six modifiers plus eight hand cards compete for portrait space. → Use compact cards, sheets for descriptions, minimum target sizes, and viewport tests at 360 CSS pixels.
- **[Visual similarity creates IP confusion]** Faithful mechanics can tempt a faithful skin. → Use neutral terminology, original layout, standard playing-card symbols, and repository-owned assets only.

## Migration Plan

1. Add the hub and `/sudoku` route while retaining existing direct Sudoku routes and storage keys.
2. Add poker modules, data, tests, and routes behind the new poker entry; no existing record migration is required.
3. Version the first compatibility catalog and poker persistence schema as `1`.
4. Validate existing Sudoku test fixtures, deep links, and stored sessions before release.
5. Rollback can remove the poker routes and hub entry; untouched Sudoku keys remain usable, and unused poker keys can remain safely ignored.

## Open Questions

- What is the exact reroll escalation after the verified initial one-coin reroll?
- What are the exact shop-offer and pack rarity weights for the selected build?
- Which documented modifier interactions require behavior beyond the initial typed event vocabulary?
- What neutral player-facing name and visual theme will replace reference branding before release?
