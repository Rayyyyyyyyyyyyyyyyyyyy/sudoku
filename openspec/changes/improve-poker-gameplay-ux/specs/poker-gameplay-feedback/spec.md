## ADDED Requirements

### Requirement: Player-facing score explanation
The poker interface SHALL translate score traces into Traditional Chinese explanations that identify the hand base, each scoring card, each modifier or special-rule source, the resulting chips and multiplier, and the final score. Internal event, hand, and catalog identifiers SHALL NOT be shown as the primary player-facing explanation.

#### Scenario: Explain an ordinary scored hand
- **WHEN** score resolution contains a hand base, scoring-card chip additions, modifier operations, and a final total
- **THEN** the score sheet names the localized hand, identifies the contributing card or modifier for each step, and shows the resulting chips, multiplier, and final equation

#### Scenario: Explain a debuffed card
- **WHEN** a special rule prevents a selected scoring card from contributing its rank chips
- **THEN** the card remains identifiable in the trace with an explicit zero-chip debuff explanation and the active rule as its cause

#### Scenario: Read a trace on a narrow phone
- **WHEN** the score sheet is opened at a 360 CSS-pixel viewport
- **THEN** every event source remains available in the row or a stacked detail and is not hidden solely because of viewport width

### Requirement: Actionable special-round constraints
Every special-round description SHALL state its operational effect on selection, hand classification, rank chips, actions, or repeated hand types. The Play control and authoritative reducer SHALL use the same rule validation result, and an invalid selected hand SHALL be disabled with a visible reason before dispatch.

#### Scenario: Locked hand type rejects a different hand
- **WHEN** the round has locked its first played hand type and the player selects cards classified as a different type
- **THEN** Play is disabled and feedback names the locked type and asks the player to select that type

#### Scenario: Hand type cannot repeat
- **WHEN** the active rule permits each hand type once and the selected hand type was already played
- **THEN** Play is disabled and feedback states that the selected localized hand type has already been used

#### Scenario: Face card is debuffed
- **WHEN** the special round debuffs J, Q, and K cards
- **THEN** the pre-round description states that those cards may still form hands but provide no rank chips while other effects continue normally

### Requirement: Phase-specific focus and scroll position
Each transition to round intro, selection or resolution, shop, pack, or terminal state SHALL move keyboard focus and the viewport to a semantic heading that exposes the next decision's essential context. Navigation and headings SHALL remain visible rather than being clipped above the viewport.

#### Scenario: Open a pack from a scrolled shop
- **WHEN** the player buys a pack while the shop is scrolled below its header
- **THEN** focus and scroll move to the pack heading where the pack name and remaining choice count are visible

#### Scenario: Continue to a new round
- **WHEN** the player leaves the shop for the next round
- **THEN** focus and scroll move to the round heading where its target and special rule can be read before play

#### Scenario: Return from a pack
- **WHEN** the player finishes or skips a pack
- **THEN** focus and scroll move to the shop heading rather than retaining the pack's previous scroll position

### Requirement: Economy settlement feedback
After settling a successful round, the shop SHALL show the completed round's base reward, remaining-play reward, interest, total reward, and resulting coin balance using reducer-owned settlement values.

#### Scenario: Show a five-coin settlement
- **WHEN** a round with base reward 3 is settled with two play actions remaining and zero interest
- **THEN** the next shop shows `基本 3 + 剩餘出牌 2 + 利息 0 = 5` and the resulting balance

### Requirement: Actionable defeat feedback
A lost-run terminal SHALL prioritize the failed opponent stage and round, the achieved round score, target, and shortfall before showing cumulative run statistics.

#### Scenario: Lose below a 1500 target
- **WHEN** the player exhausts play actions at 1170 points against a 1500 target
- **THEN** the terminal identifies the failed stage and round, displays `1,170 / 1,500`, and states that 330 additional points were needed

### Requirement: Contextual localized mobile interface
Poker hand names, rarity labels, trace operations, terminal navigation, and empty-state guidance SHALL use consistent player-facing labels. Every interactive poker control SHALL have a touch target of at least 44 by 44 CSS pixels at 360 CSS pixels, and the shared hub SHALL keep both games' primary actions fully discoverable without misleading terminal-session language.

#### Scenario: Show an empty modifier inventory in the shop
- **WHEN** the player owns no modifiers while viewing the shop
- **THEN** the empty state tells the player that modifiers can be obtained from the current shop offers rather than after a future round

#### Scenario: Show a terminal snapshot on the hub
- **WHEN** the saved poker snapshot is won or lost
- **THEN** the hub labels its action as viewing records or entering poker and does not imply that the terminal run is resumable

#### Scenario: Use compact modifier controls
- **WHEN** modifier move and sell controls are shown at a 360 CSS-pixel viewport
- **THEN** each control measures at least 44 by 44 CSS pixels and its label remains readable without a narrow two-line break
