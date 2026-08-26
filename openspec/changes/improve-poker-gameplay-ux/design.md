## Context

The completed poker engine already preserves deterministic state, restores interrupted selections, and supports the full nine-round progression. A separate browser audit at 360×800 showed that the remaining problems are primarily at the boundary between domain state and player presentation: raw trace IDs are rendered directly, rule validation differs between the reducer and button availability, phase changes reuse one heading focus strategy, and existing settlement data is not surfaced.

The fix must preserve scoring totals, random-state consumption, compatibility data, and the persistence schema. It must also remain usable with keyboard, touch, reduced motion, and narrow portrait layouts.

## Goals / Non-Goals

**Goals:**

- Make every score-changing event understandable in player language, including its card, modifier, or special-rule source.
- Prevent special rules from producing enabled controls that become silent reducer no-ops.
- Put focus and scroll at the information required for each new gameplay phase.
- Teach the economy through settlement feedback and make defeat actionable through target-shortfall feedback.
- Make all poker controls and state labels consistent, localized, and touch accessible at 360 CSS pixels.

**Non-Goals:**

- Changing poker scores, round targets, modifier balance, random distributions, or compatibility provenance.
- Redesigning the visual identity or replacing the current page structure.
- Changing the persistence schema or invalidating active runs.
- Completing a broader internationalization framework; this change provides explicit Traditional Chinese presentation mappings for the current interface.

## Decisions

### 1. Add a player-facing score presentation adapter

A pure presentation helper will map trace event types, hand IDs, card instance IDs, modifier catalog IDs, and special-rule IDs into structured Traditional Chinese rows. `ScoreTrace` will render those rows instead of raw `event.type` and `event.source`. Each row contains a primary explanation, optional source detail, and the resulting chips/multiplier or score.

The scoring engine will emit an explicit `card-debuffed` trace event when a special rule suppresses rank chips. This event changes explanation only and consumes no random state. Mobile will stack source detail below the explanation rather than hiding it.

Keeping translation logic in JSX was rejected because trace semantics need focused unit tests and would remain coupled to layout.

### 2. Use one rule-violation function for controls and reducer execution

The run module will expose a pure helper that evaluates selection limits and the active special rule against the projected hand. `actionAvailability` and the `PLAY` reducer path will call the same helper. Availability returns a player-facing reason for forced-card-count, locked-hand-type, and once-per-hand-type constraints.

The reducer remains authoritative and still rejects invalid actions. Sharing the predicate ensures the button is disabled before dispatch and prevents silent no-op interaction without weakening domain validation.

### 3. Give each phase a semantic focus anchor

Round intro, selection/resolution, shop, pack, and terminal views each expose their own focusable heading reference. On a phase or round cursor change, the active heading receives focus without an initial browser jump and is scrolled into view using `scroll-margin-top`. Reduced-motion users receive immediate scrolling; no essential information depends on animation.

Resetting the whole document to `scrollY=0` was rejected because the meaningful heading can sit below the persistent navigation and because semantic focus is required for keyboard and screen-reader users.

### 4. Render existing settlement and defeat context directly

The shop header will show `base + remainingHands + interest = total` from `state.settlement`; it will not recalculate economy values. A lost-run terminal will identify the opponent stage and round, show `roundScore / target`, and show the nonnegative shortfall before the cumulative score.

Using reducer-owned values avoids presentation drift and preserves exactly-once settlement behavior.

### 5. Centralize small player-facing label maps

Hand types continue to use the existing `handLabel` function. Trace operations, rarity values, rule explanations, and context-sensitive empty states use explicit maps or props close to their presentation boundary. The shop variant of the empty modifier strip tells the player that offers above can provide modifiers; the table variant keeps the post-round guidance.

The hub distinguishes active, terminal, incompatible, and empty poker snapshots before choosing its CTA. Responsive CSS enforces a 44×44 minimum target and keeps both game CTAs fully visible in a 360×800 first viewport where content length permits.

## Risks / Trade-offs

- **[New trace events affect fixtures]** Tests that assert exact trace arrays may fail. → Add the explanatory event only for debuffed cards and update fixtures to assert semantics rather than unrelated array length.
- **[Focus management can cause visible jumps]** Browser focus and scroll behavior differs by engine. → Use `preventScroll`, one explicit anchor per phase, `scroll-margin-top`, and browser checks at both 360×800 and desktop.
- **[Rule descriptions can drift from handlers]** Copy maintained separately from behavior may become inaccurate. → Test every constrained rule ID against both availability and its displayed operational description.
- **[Mobile trace becomes taller]** Preserving sources increases vertical length. → Use compact stacked rows and disclosure, never hide causal information.

## Migration Plan

1. Add pure presentation and rule-validation helpers with unit tests.
2. Update poker views to consume the helpers and existing settlement state.
3. Add phase anchors, responsive adjustments, and UI source assertions.
4. Run all tests, production build, strict OpenSpec validation, and targeted browser checks.
5. Rollback is limited to presentation and helper changes; no persisted state migration is required.

## Open Questions

None. The audit provides reproducible expected behavior and all required domain values already exist in state.
