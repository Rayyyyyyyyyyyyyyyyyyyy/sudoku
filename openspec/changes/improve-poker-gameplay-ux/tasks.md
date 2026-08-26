## 1. Explain Scoring and Rules

- [x] 1.1 Emit explicit debuffed-card trace events without changing score totals or random-state consumption, and add engine coverage.
- [x] 1.2 Add a pure Traditional Chinese score-presentation adapter for hand bases, cards, modifiers, operations, debuffs, and totals with focused unit tests.
- [x] 1.3 Replace raw trace rendering with player-facing rows that retain causal sources at 360 CSS pixels.

## 2. Make Constraints Actionable

- [x] 2.1 Share special-rule violation logic between `actionAvailability` and reducer execution for locked, once-only, and forced-card constraints.
- [x] 2.2 Add localized disabled reasons and operational special-rule descriptions, with tests covering every constrained rule.

## 3. Improve Phase and Outcome Feedback

- [x] 3.1 Add semantic focus and scroll anchors for round, resolution, shop, pack, and terminal phase transitions.
- [x] 3.2 Show reducer-owned settlement composition in the shop and failed-round target, score, and shortfall on the defeat terminal.
- [x] 3.3 Localize rarity and remaining internal labels, correct context-specific empty and terminal CTA copy, and ensure terminal saves are not presented as resumable.
- [x] 3.4 Enforce 44×44 mobile controls, readable modifier actions, visible trace sources, and a more compact 360×800 hub first viewport.

## 4. Verification

- [x] 4.1 Extend run, presentation, and source-level UI tests for the new behavior and regressions.
- [x] 4.2 Run the complete test suite, production build, strict OpenSpec validation, diff checks, and targeted 360×800 plus desktop browser verification.
