## Why

The application currently offers only Sudoku, while the desired commuting game is the short-decision, high-replay poker roguelike represented by Jimbo's Game. Adding a faithful rules implementation creates a second, materially different form of play centered on hand selection, probability, scoring order, economy, and build synergy while remaining usable in short mobile sessions.

## What Changes

- Add a poker-roguelike game mode that follows the documented Jimbo's Game rules and its compact opponent, stage, and three-round structure before attempting any custom rebalancing.
- Implement a finite 52-card draw pile, poker-hand recognition, hand and discard limits, score targets, chip/multiplier scoring, ordered modifier resolution, round modifiers, and win/loss transitions.
- Add a between-round economy with coins, interest, rerolls, individual modifier cards, packs, selling, and a six-modifier inventory whose left-to-right order affects scoring.
- Represent the original card effects, prices, opponent definitions, stage and round targets, and progression as versioned game data so compatibility corrections do not require rewriting the game engine.
- Add a game hub and routes that preserve the existing Sudoku experience while exposing the new game and resumable run.
- Add touch-first portrait play, automatic hand classification and score feedback, inspectable effect text, and save-after-action recovery for interrupted commutes.
- Use original or neutral presentation assets and copy; do not import third-party game art, character assets, audio, branding, or source code.

## Capabilities

### New Capabilities

- `game-hub-navigation`: A shared landing experience and stable routes for choosing Sudoku or the poker roguelike and resuming active sessions.
- `poker-run-gameplay`: Card drawing, selection, poker-hand evaluation, play/discard actions, score calculation, target rounds, finite-deck behavior, and run completion.
- `poker-modifier-economy`: Ordered modifier effects, coins and interest, shop rerolls, card and pack purchases, selling, inventory limits, and special round rules.
- `poker-session-experience`: Portrait touch interaction, rules and score explanations, deterministic run state, automatic persistence, recovery, and poker-specific records.

### Modified Capabilities

None. There are no existing main specs; the current Sudoku behavior remains compatible.

## Impact

- Adds new React routes, pages, mobile components, game-state reducers, deterministic randomization, poker evaluation, effect resolution, shop logic, persistence, and tests.
- Changes the current Sudoku-only home page into a game hub while retaining direct Sudoku and daily-puzzle routes.
- Adds new versioned localStorage records without changing the existing Sudoku statistics, settings, or active-game keys.
- Keeps the application client-only and offline-capable and introduces no server API or production dependency requirement.
- Requires a documented compatibility dataset for original mechanics and careful separation between reusable rule data and copyrighted presentation assets.
