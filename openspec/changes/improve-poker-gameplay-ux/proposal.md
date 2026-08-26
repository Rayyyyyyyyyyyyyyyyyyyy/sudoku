## Why

The poker roguelike is functionally playable, but an independent 360×800 gameplay audit found that players cannot reliably explain scoring, understand special-rule constraints before acting, or keep their place when the interface changes phase. These gaps make successful play depend on trial and error even though the engine state and recovery behavior are sound.

## What Changes

- Translate scoring results and event traces from internal identifiers into localized, player-facing explanations that retain each card or effect source on mobile.
- Explain special-round rules in operational terms and use the same validation for action availability and reducer execution so invalid plays are disabled with a reason instead of silently ignored.
- Give each gameplay phase an intentional focus and scroll destination so round intros, packs, shops, and terminal states begin at the information needed for the next decision.
- Show round settlement composition and defeat context, including base reward, remaining-hand reward, interest, current round score, target, and shortfall.
- Correct undersized touch targets, context-dependent empty-state and terminal navigation copy, hub first-viewport density, and remaining internal English labels.

## Capabilities

### New Capabilities

- `poker-gameplay-feedback`: Player-facing scoring explanations, actionable rule constraints, phase focus behavior, economy and defeat feedback, localized labels, and mobile interaction requirements.

### Modified Capabilities

None. The original poker change has not yet been archived into main specs, so this follow-up records its UX refinements as a separate capability.

## Impact

- Updates poker presentation mapping, action-availability metadata, round settlement events, phase-transition focus behavior, and responsive styling.
- Affects `src/pages/PokerGame.jsx`, `src/pages/PokerHome.jsx`, `src/pages/GameHub.jsx`, poker run/effect helpers, and poker UI/run tests.
- Does not change compatibility targets, poker scoring totals, deterministic random streams, persisted Sudoku data, or production dependencies.
