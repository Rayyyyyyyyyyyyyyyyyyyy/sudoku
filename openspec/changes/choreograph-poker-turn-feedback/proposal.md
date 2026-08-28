## Why

The poker run is mechanically correct, but its most frequent transitions feel like static state changes rather than a continuous card game. Discarded cards vanish without a clear replacement cue, scoring replaces the table with a rigid confirmation screen, and reaching a target requires two low-value confirmation steps before the shop.

## What Changes

- Choreograph discard feedback so outgoing cards, draw count, and newly dealt cards remain visually connected without delaying the authoritative reducer transition.
- Keep the table visible during score resolution, animate the played cards, score equation, triggered effects, target progress, and final gain, and automatically return to selection for ordinary hands.
- Replace the separate "finish scoring" and "claim reward" gates with a skippable scoring sequence followed by one meaningful round-win action.
- Present target crossing, excess score, reward composition, and resulting coins as a single celebratory settlement moment before entering the shop or completing the run.
- Identify the exact played, drawn, and owned modifier instances responsible for visible feedback, including duplicate and copied modifier effects.
- Provide deterministic bounded presentation timing, tap-to-skip behavior, stable focus and scroll continuity, semantic status updates, and an immediate reduced-motion path without adding animation state to persistence.
- Define reload, rapid-action, timer-cleanup, and animation-supersession behavior so presentation never blocks input or produces a second game transition.

## Capabilities

### New Capabilities

- `poker-turn-choreography`: Visual and interaction continuity for discarding, drawing, scoring, target completion, and round settlement.

### Modified Capabilities

None. Existing poker capabilities remain in unarchived changes, so this follow-up records the choreography contract as a separate capability.

## Impact

- Updates poker traces and pending-resolution metadata with card and owned-modifier instance IDs required for unambiguous presentation, without changing scores, PRNG consumption, or persistence schema version.
- Adds pure presentation selectors, presentation-only React state, explicit focus policy, and cleanup-safe timers around `PokerGame`, plus motion and reduced-motion styles.
- Changes the ordinary scoring flow from a required confirmation click to automatic continuation with an optional skip control.
- Adds reducer and source-level UI tests plus mobile and desktop browser verification.
