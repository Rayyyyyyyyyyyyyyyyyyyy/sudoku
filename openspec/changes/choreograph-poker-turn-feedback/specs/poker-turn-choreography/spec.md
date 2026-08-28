## ADDED Requirements

### Requirement: Discard and replacement continuity
After a committed discard, the interface SHALL distinguish the cards that left the hand, the number of cards drawn, and every newly dealt card. The authoritative discard SHALL NOT be delayed until presentation motion completes.

#### Scenario: Replace three discarded cards
- **WHEN** the player discards three selected cards and the draw pile has enough replacements
- **THEN** the interface shows a three-card discard cue, pulses the draw-pile metric with `補 3 張`, and gives the three replacement cards a staggered entrance and temporary `新` marker

#### Scenario: Draw fewer cards at deck exhaustion
- **WHEN** the player discards more cards than remain in the draw pile
- **THEN** the cue reports the actual replacement count and marks only the cards that were actually drawn

#### Scenario: Reload after discard
- **WHEN** the page reloads after the discard state was committed
- **THEN** the exact new hand is restored without replaying a historical discard cue or fresh-card animation and without requiring an animation phase to be recovered

#### Scenario: Act before a discard cue expires
- **WHEN** the player commits another valid action while discard or fresh-card feedback is still visible
- **THEN** the new action remains immediately usable, supersedes stale cues, and cannot be affected by an older presentation timer

#### Scenario: Present discarded cards semantically
- **WHEN** outgoing cards are shown after the authoritative discard
- **THEN** they are announced as a discard summary, remain outside the tab order, and are not exposed as disabled hand controls

### Requirement: In-table score choreography
During score resolution, the interface SHALL keep the poker table visible and SHALL present the played cards, localized hand base, card and exact owned-modifier contributions, final chips × multiplier equation, gained score, and target progress as one bounded sequence.

#### Scenario: Resolve an ordinary hand
- **WHEN** a played hand enters the committed resolving phase
- **THEN** its played cards appear in a scoring rail, major trace events reveal in order, the gained score is emphasized, and target progress moves from the pre-hand score to the committed round score

#### Scenario: Skip score motion
- **WHEN** the player activates `略過動畫` during resolution
- **THEN** the final score and trace remain available and the reducer advances exactly once to the pending next phase

#### Scenario: Resolve many trace events
- **WHEN** retriggers or modifiers produce more events than the visible choreography limit
- **THEN** a deterministic selector preserves the hand base, chronological representative effects, an omitted-effect count, and final total within at most eight visible beats while the expandable score trace retains every event

#### Scenario: Trigger duplicate or copied modifiers
- **WHEN** two owned modifiers share one catalog type or a modifier copies another owned modifier
- **THEN** each visible trigger identifies and highlights the exact owned source and copy source without changing operation order or score

#### Scenario: Reload during score resolution
- **WHEN** the page reloads in a committed resolving phase
- **THEN** the bounded presentation restarts from the committed result without rescoring the hand, consuming randomness, or duplicating the pending transition

### Requirement: Automatic ordinary-hand continuation
An ordinary scored hand that does not finish the round SHALL automatically leave resolving after the bounded score sequence, return to card selection, and visibly introduce replacement cards without requiring a `完成計分` confirmation.

#### Scenario: Continue below target
- **WHEN** a score sequence completes below the target and playable cards remain
- **THEN** the interface returns to selection automatically, highlights the newly drawn cards, and keeps the completed score trace available for inspection

#### Scenario: Exhaust hands below target
- **WHEN** the score sequence completes below target with no play actions remaining
- **THEN** automatic continuation advances to the existing run-lost terminal exactly once

#### Scenario: Automatic continuation preserves table context
- **WHEN** an ordinary below-target score sequence finishes automatically
- **THEN** the interface preserves scroll position, does not focus the round heading, announces the result, and returns the player to the newly dealt hand without a context jump

#### Scenario: Skip and timer complete together
- **WHEN** the player activates `略過動畫` at the same time the automatic completion timer becomes eligible
- **THEN** both paths converge safely and the reducer leaves resolving no more than once

### Requirement: Coherent target completion and settlement
When a hand reaches the round target, the interface SHALL show target crossing, excess score, reward composition, and resulting balance before one primary settlement action. It SHALL NOT require a separate score-completion click followed by a reward-claim click.

#### Scenario: Reach a nonfinal target
- **WHEN** the committed round score first reaches or exceeds a nonfinal target
- **THEN** the score sequence advances automatically to a round-win stage showing excess score and `base + remaining hands + interest = total`, with one CTA to take the displayed reward into the shop

#### Scenario: Reach the final target
- **WHEN** the committed round score reaches the final run target
- **THEN** the round-win stage offers one CTA to take the displayed reward and complete the run

#### Scenario: Reload before claiming reward
- **WHEN** the page reloads in the persisted round-won phase
- **THEN** the same settlement preview and single CTA are restored without awarding coins or records until that action is committed

#### Scenario: Activate settlement repeatedly
- **WHEN** the settlement CTA is activated more than once through rapid input or restored UI state
- **THEN** reward, shop offers, final completion, records, and navigation are committed at most once

### Requirement: Accessible bounded motion
All choreography SHALL preserve semantic status announcements, keyboard operation, and deterministic outcomes. Reduced-motion mode SHALL remove spatial transforms and staggered presentation while preserving state distinctions and bounded automatic continuation.

#### Scenario: Reduced motion score resolution
- **WHEN** the operating system requests reduced motion and a hand resolves
- **THEN** final scoring values and status text appear immediately and the reducer advances after a short bounded delay without sequential movement

#### Scenario: Navigate away during a sequence
- **WHEN** the component unmounts or the phase changes before a presentation timer completes
- **THEN** pending presentation timers are cleared and cannot cause an additional gameplay transition

#### Scenario: Hear outcomes without seeing motion
- **WHEN** a discard, score, target crossing, loss, or settlement is committed
- **THEN** a persistent live region announces the outcome once with its relevant card count, score, or reward while decorative animation remains hidden from assistive technology

#### Scenario: Skip with keyboard
- **WHEN** a keyboard user activates `略過動畫` and the control disappears
- **THEN** focus moves without scrolling to the first usable hand card or action control instead of being lost or moved to the page heading

#### Scenario: Preserve minimum touch targets
- **WHEN** skip or settlement controls are displayed at a 360 CSS-pixel viewport
- **THEN** each remains at least 44 by 44 CSS pixels, readable without overlap, and reachable without horizontal page scrolling
