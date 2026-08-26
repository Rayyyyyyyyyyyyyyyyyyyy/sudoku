## ADDED Requirements

### Requirement: Portrait touch play
The poker game SHALL remain fully playable at a 360 CSS-pixel portrait viewport using tap targets of at least 44 by 44 CSS pixels, without requiring hover, keyboard input, precision drag, or horizontal page scrolling.

#### Scenario: Select cards with one hand
- **WHEN** a touch user taps a card in hand
- **THEN** that card toggles selected state without changing the order of unselected cards

#### Scenario: Reorder modifiers without precision drag
- **WHEN** a touch user chooses to reorder a modifier
- **THEN** the interface provides tap-accessible move controls in addition to any optional drag gesture

### Requirement: Clear decision feedback
Before an action, the interface SHALL show the current opponent, stage, round type and rule, recognized poker hand, selected-card count, remaining play and discard actions, round score, target, draw-pile count, coins, and owned modifiers. After scoring, it SHALL expose the ordered calculation trace.

#### Scenario: Inspect projected hand
- **WHEN** one or more cards are selected
- **THEN** the interface names the currently recognized poker hand and indicates which selected cards contribute

#### Scenario: Explain final hand score
- **WHEN** score resolution completes
- **THEN** the user can inspect the base hand, scoring cards, modifier triggers, and final chips and multiplier without leaving the run

### Requirement: Inspectable rules and effects
The interface SHALL provide in-context descriptions for poker hands, modifiers, packs, special round rules, currencies, and action limits without requiring external documentation.

#### Scenario: Inspect a modifier
- **WHEN** the user taps or focuses a modifier's inspect control
- **THEN** its trigger, effect, timing, price or sale value where applicable, and relevant counters are shown in readable text

#### Scenario: Learn poker hand values
- **WHEN** the user opens the hand guide
- **THEN** all supported hand classifications and current baseline chip and multiplier values are shown

### Requirement: Deterministic run state
Every new run SHALL be initialized from a seed and all gameplay-affecting random choices SHALL consume a serializable deterministic random state. Presentation-only randomness SHALL NOT affect gameplay state.

#### Scenario: Replay the same actions
- **WHEN** two runs begin with the same rules version and seed and receive the same ordered player actions
- **THEN** their decks, shops, packs, special rounds, scores, and resulting state are identical

### Requirement: Automatic persistence and exact recovery
The application SHALL persist a versioned snapshot after every committed state transition and SHALL recover the exact phase, opponent ID, stage and round cursor, deterministic random state, card zones, counters, inventory, economy, offers, trace, and elapsed time after reload.

#### Scenario: Reload during card selection
- **WHEN** the page reloads after cards were selected but before Play or Discard was committed
- **THEN** the same hand, selection, counts, and round state are restored

#### Scenario: Reload after purchase
- **WHEN** the page reloads immediately after a shop purchase
- **THEN** the item remains owned, coins remain deducted once, and the purchase cannot be duplicated

#### Scenario: Incompatible snapshot
- **WHEN** a saved run cannot be safely migrated to the current persistence or rules version
- **THEN** the application preserves poker records, explains that the active run is incompatible, and offers to start a new run

### Requirement: Poker records
The application SHALL maintain poker records separately from Sudoku records, including runs started, runs won, highest completed-run score, and current win streak.

#### Scenario: Complete a winning run
- **WHEN** a run transitions to victory
- **THEN** poker records are updated exactly once even if the completion screen is reloaded

### Requirement: Accessible state communication
Card selection, scoring participation, disabled actions, modifier triggers, success, and failure SHALL NOT be communicated by color alone, and nonessential animations SHALL respect reduced-motion preferences.

#### Scenario: Reduced motion enabled
- **WHEN** the operating system requests reduced motion
- **THEN** scoring and dealing remain understandable without translation, shake, or long sequential animations
