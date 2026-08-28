## 1. Explainable Presentation Data

- [ ] 1.1 Record actual `drawnCardIds` in committed discard traces and ordered `playedCardIds` plus `drawnCardIds` in pending score resolution, including partial draws at deck exhaustion, without changing scores, card order, PRNG consumption, or persistence version.
- [ ] 1.2 Preserve owned modifier instance identity in score operations and localized trace rows (`sourceInstanceId` and copy-source identity where applicable) so duplicate modifiers and copied effects can highlight the exact inventory card that triggered.
- [ ] 1.3 Add a pure round-settlement preview selector shared with `SETTLE_ROUND`, covering base reward, remaining hands, interest, resulting balance, nonfinal shop continuation, and final-run completion without awarding anything.
- [ ] 1.4 Add pure presentation selectors and named constants for major score-beat selection, overflow summarization, non-reduced timing, reduced-motion timing, and pre-hand-to-committed target progress so choreography remains deterministic and independently testable.

## 2. Local Choreography Controller

- [ ] 2.1 Add a local presentation controller that derives discard cues, fresh-card markers, active score beats, triggered modifier instances, and target-progress timing only from committed state; presentation state, timers, DOM measurements, and animation progress must never be persisted.
- [ ] 2.2 Implement mount and reload behavior: restart presentation when mounting into committed `resolving`, restore the stable settlement view when mounting into `round-won`, and suppress historical discard/fresh-card animation when mounting into `selecting` after a reload.
- [ ] 2.3 Make automatic score completion and `略過動畫` converge on one cleanup-safe completion path; cancel timers on phase change or unmount and guard timer/skip races so `FINISH_RESOLUTION` cannot cause a second gameplay transition.
- [ ] 2.4 Let a newly committed player action replace stale discard or fresh-card cues without blocking input, leaving orphaned timers, or replaying visual feedback from an older action.

## 3. Discard and Replacement Continuity

- [ ] 3.1 Refactor poker-card presentation so interactive hand cards and non-interactive discard/scoring cards share one visual language while retaining correct button, focus, tab-order, and screen-reader semantics.
- [ ] 3.2 Show the committed outgoing cards in a compact discard cue, pulse the draw-pile metric with the actual `補 N 張` count, and introduce only the actual replacement cards with a short stagger and temporary visible plus semantic `新` marker.
- [ ] 3.3 Handle zero-card and partial replacement at deck exhaustion without implying cards were drawn, shifting the table unexpectedly, hiding remaining playable cards, or allowing the cue to cover primary controls at 360 CSS pixels.
- [ ] 3.4 Clear outgoing cues after their bounded presentation and clear fresh markers on the next committed player action or timeout, whichever occurs first, while keeping the underlying hand immediately usable.

## 4. In-Table Score Choreography

- [ ] 4.1 Replace the static resolving panel with an in-table scoring stage that keeps the round header, modifier order, table frame, played-card rail, and score context visible throughout resolution.
- [ ] 4.2 Present a bounded localized sequence for hand base, scoring-card contributions, exact triggered modifier instances, copied/retriggered effects, overflow summary, final chips × multiplier equation, and gained score; retain every unabridged event in the expandable trace.
- [ ] 4.3 Animate target progress from the score before the hand to the already committed round score, visibly distinguish target crossing and excess score, and never animate from or display a value inconsistent with authoritative state.
- [ ] 4.4 Automatically finish an ordinary below-target resolution after the bounded sequence, provide a secondary 44px `略過動畫` control, and return directly to the usable hand with replacement cards identified; preserve the completed trace for later inspection.
- [ ] 4.5 Automatically advance exhausted-hands and empty-deck outcomes to the existing loss terminal exactly once, with a semantic result announcement and no transient return to selectable controls.

## 5. Target Completion and Settlement

- [ ] 5.1 Replace the rigid round-won panel with one coherent target-completion stage showing target crossing, excess score, `base + remaining hands + interest = total`, current balance, and resulting balance before settlement is committed.
- [ ] 5.2 Provide exactly one primary contextual CTA—`帶著 N 幣前往補給站` for nonfinal rounds or `收下 N 幣，完成本局` for the final round—and ensure repeated activation cannot duplicate rewards, offers, completion records, or navigation.
- [ ] 5.3 Restore the identical settlement preview and CTA after reload in `round-won`; do not award coins, open the shop, or record victory until the player commits that action.

## 6. Focus, Accessibility, Motion, and Responsive UX

- [ ] 6.1 Replace phase-wide automatic focus/scroll behavior with an explicit policy: automatic ordinary-hand continuation preserves scroll context and does not focus the round heading; after explicit skip, move focus without scrolling to the first usable hand card or action; focus meaningful headings only for round intro, shop, pack, loss, and completed-run transitions.
- [ ] 6.2 Add a persistent semantic status region that announces discard/replacement counts, hand result and gained score, target crossing, loss, and settlement outcome without requiring animation, color, or visual trace inspection.
- [ ] 6.3 Keep all controls keyboard-operable with visible focus, ensure skip and settlement targets remain at least 44×44 CSS pixels, and prevent decorative scoring/discard cards from entering the tab order or being announced as disabled controls.
- [ ] 6.4 Provide a reduced-motion path that removes transforms, pulses, and stagger, shows final state distinctions immediately, uses the named short continuation delay, and preserves skip, focus, status announcements, and exactly-once transitions.
- [ ] 6.5 Add responsive card rails, cues, score stages, progress, reward, and triggered-modifier styles that remain legible at 360×800 and desktop widths without horizontal page overflow, control-moving layout jumps, or animation of layout-triggering properties when transform/opacity will suffice.

## 7. Verification and UX Acceptance

- [ ] 7.1 Extend reducer and persistence tests for ordered played/drawn IDs, partial draws, exact modifier instance provenance, copied effects, settlement-preview parity, unchanged scores/PRNG state, and safe restoration of enriched resolving snapshots under the existing schema version.
- [ ] 7.2 Unit-test the pure beat selector, overflow summary, duration calculation, target-progress derivation, and presentation-controller transitions for reload suppression, resolving replay, rapid consecutive actions, skip/timer races, phase changes, and unmount cleanup.
- [ ] 7.3 Extend source-level UI tests for the in-table score stage, persistent live region, semantic non-interactive cards, 44px skip/settlement controls, single-CTA copy, stable-focus policy, fresh markers, and reduced-motion hooks.
- [ ] 7.4 Run targeted browser playthroughs at 360×800 and desktop for one-card and multi-card discard, deck exhaustion, ordinary scoring, many-event retriggers, duplicate and copied modifiers, target crossing, final victory, manual skip, rapid taps, reload during `resolving`, reload during `round-won`, keyboard-only use, and reduced motion; record any visual or interaction regressions before completion.
- [ ] 7.5 Run the full test suite, production build, strict OpenSpec validation, diff checks, and confirm that no score, target, reward, modifier effect, PRNG result, persistence key/version, shop, pack, hub, or Sudoku behavior changed.
