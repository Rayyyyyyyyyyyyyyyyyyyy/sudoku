## Context

The poker engine commits Play and Discard immediately and persists every resulting reducer state. The current React view exposes `resolving` and `round-won` as full static panels with required buttons, while Discard returns directly to the same hand grid. This makes the underlying state transitions visible but removes spatial continuity and forces unnecessary confirmation clicks.

The implementation must preserve deterministic scoring, exactly-once settlement, reload safety, and the existing persistence schema. Motion is presentation feedback, not authoritative state.

## Goals / Non-Goals

**Goals:**

- Make outgoing and newly drawn cards visibly distinct after a discard.
- Keep the table, played cards, modifier order, score equation, and target progress visible during scoring.
- Automatically continue ordinary hands after a short skippable score sequence.
- Turn target completion and reward settlement into one coherent moment with one meaningful CTA.
- Provide equivalent understanding with reduced motion and semantic live-region updates.

**Non-Goals:**

- Changing any poker score, target, reward, modifier, PRNG call, or transaction rule.
- Persisting animation frames, elapsed animation progress, DOM measurements, or timers.
- Adding sound, vibration, canvas rendering, or a third-party animation dependency.
- Reworking the shop, pack, hub, or broader visual identity.

## Decisions

### 1. Enrich committed domain events with presentation identifiers

Discard traces will include both `cardIds` and `drawnCardIds`. Pending score resolution will include ordered `playedCardIds` and `drawnCardIds`. Score operations will preserve the exact owned modifier `instanceId`, plus the copying modifier instance when applicable, instead of relying only on a shared catalog ID. These IDs already belong to committed state and do not change game semantics or random-state consumption.

The UI can therefore identify outgoing, scoring, and fresh cards after the reducer commits. Delaying dispatch until an exit animation completes was rejected because closing the page during that delay could lose an action the player already believed was committed.

### 2. Keep choreography in a local presentation controller

A small React hook will derive transient `discardCue`, `freshCardIds`, active score beats, triggered modifier instances, and score-sequence timing from committed state. It owns cancellable timers and never writes them to localStorage. On reload into `resolving`, the score sequence restarts from its beginning against the already committed result; reload into `round-won` restores the stable settlement view; reload into `selecting` does not replay an old discard or fresh-card animation. The controller ignores historical presentation events on its first selecting-phase observation.

New committed player actions supersede older discard and fresh-card cues. Timer callbacks capture the expected phase and committed action identity, clear on dependency change or unmount, and converge with `略過動畫` on the reducer's existing phase guard. Presentation never disables an otherwise valid next action merely to let an animation finish.

CSS keyframes handle card movement, glow, progress, and beat reveal. React only supplies stable IDs, ordering indexes, and duration custom properties. This is preferred to adding reducer phases such as `discarding-card-2` or `counting-multiplier`, which would make persistence and tests depend on animation frames.

### 3. Resolve scores inside the table and auto-finish ordinary hands

The `resolving` view keeps the modifier strip and table frame. It shows the played cards in a non-interactive scoring rail, a compact sequence of localized trace beats, the exact owned modifier instance associated with the active beat, the final chips × multiplier equation, the gained score, and target progress from the pre-hand score to the committed score.

Beat selection is a pure deterministic transformation. It normalizes retrigger markers into their following contribution, always retains the hand base and final total, and preserves chronological score-changing events. When more than eight visible beats remain, it keeps the first five, inserts one localized `另有 N 次效果` summary, keeps the last score-changing effect, and ends with the final total. The expandable trace remains complete.

Named timing constants make the experience testable: discard cue `700ms`, fresh marker `1200ms`, reduced-motion continuation `240ms`, and non-reduced score timing `clamp(900 + visibleBeatCount × 120, 1100, 1800)` milliseconds. A secondary `略過動畫` control dispatches `FINISH_RESOLUTION` immediately. Otherwise the view dispatches it automatically when the sequence ends. For an ordinary hand this returns directly to selection and marks newly drawn cards; there is no required "完成計分" action.

### 4. Preserve `round-won` as the exactly-once settlement boundary

When the score sequence reaches a target, automatic finish moves the reducer to its existing `round-won` state. The table then shows a target-crossing celebration, excess score, and a projected settlement derived through a pure domain selector using the same economy function as `SETTLE_ROUND`.

One primary CTA says `帶著 N 幣前往補給站` or, on the final round, `收下 N 幣，完成本局`. It dispatches the existing exactly-once settlement action. This removes the low-value score confirmation while retaining a deliberate economy transition and the persisted `round-won` recovery point.

### 5. Design motion as progressive enhancement

Discarded-card chips fade and move toward a discard cue, the deck metric pulses, and fresh cards enter with a short stagger and retain a temporary `新` marker. Scoring cards and triggered modifiers use transform, opacity, outline, and number emphasis rather than layout-dependent coordinate animation.

With `prefers-reduced-motion: reduce`, transforms and staggered delays are removed, final values appear immediately, semantic status text remains, and auto-continuation uses a short bounded delay so focus changes remain understandable.

### 6. Treat focus and semantics as part of the choreography

A persistent live region remains mounted across poker phases and announces committed outcomes: discarded and replacement counts, hand type and gained score, target crossing, loss, and settlement. Visual cards used in discard and scoring rails are non-interactive list items rather than disabled buttons, so they do not enter the tab order or imply an unavailable action.

Automatic ordinary-hand continuation preserves the current scroll position and does not move focus to the round heading. When a user explicitly activates `略過動畫` and that control disappears, focus moves with `preventScroll` to the first usable hand card or the play controls. Round intro, shop, pack, loss, and completed-run transitions may focus their meaningful heading. This replaces the current phase-wide focus-and-scroll effect that would otherwise pull the player away from newly dealt cards.

### 7. Keep presentation behavior testable without a browser clock

Beat normalization, duration calculation, target-progress derivation, settlement preview, and presentation-controller transitions are pure functions covered by Node tests. React owns only timer scheduling, DOM focus, and class application. Browser playthroughs cover the remaining spatial, keyboard, screen-reader-status, reduced-motion, and cleanup behavior.

## Risks / Trade-offs

- **[Automatic continuation feels too fast]** Players may want to inspect a surprising score. → Keep the full trace after continuation, cap the minimum visible duration, and provide a skip rather than a speed-up-only path.
- **[Reload replays a committed score]** The score animation may be seen twice after an interruption. → Treat replay as presentation of the stable committed result; never score or settle twice.
- **[Timers fire after navigation]** A stale callback could dispatch into another phase. → Clear timers on dependency change and rely on reducer phase guards.
- **[Many trace events create a long sequence]** Retriggers can exceed a useful animation duration. → Animate a bounded summary of major beats while preserving every event in the expandable trace.
- **[Fresh-card markers conflict with scoring markers]** Card badges share limited mobile space. → Use separate pseudo-elements and clear fresh state on the next committed player action or timeout.
- **[Duplicate modifiers highlight ambiguously]** Catalog IDs do not identify which owned card fired. → Carry owned instance provenance through score operations and copied effects.
- **[Automatic phase focus breaks table continuity]** The existing phase effect scrolls to headings after every transition. → Use the explicit focus policy and persistent live region instead of phase-wide focus.
- **[Rapid input overlaps presentation]** A second valid action can arrive before a discard cue expires. → Let the newest committed action supersede older cues and cancel their timers without blocking gameplay.
- **[Timer behavior is only manually testable]** Hook-only timing can hide race regressions. → Keep selection and controller transitions pure, then use browser checks only for DOM-specific behavior.

## Migration Plan

1. Add card and owned-modifier identifiers plus pure settlement, beat, duration, and target-progress selectors.
2. Add the local choreography controller with reload suppression, supersession, cleanup, and focus policy.
3. Refactor interactive versus non-interactive card presentation and implement discard/replacement continuity.
4. Replace static resolving and round-won panels with in-table score and settlement stages.
5. Add semantic announcements, responsive motion, reduced-motion behavior, and focused automated tests.
6. Run all tests, production build, strict OpenSpec validation, and browser checks at 360×800 and desktop.

## Open Questions

None. The approved direction uses the default fast pace with tap-to-skip and an immediate reduced-motion path.
