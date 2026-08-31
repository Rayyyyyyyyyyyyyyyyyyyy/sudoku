## ADDED Requirements

### Requirement: Standard finite card deck
Each round SHALL begin with a deterministically shuffled standard 52-card deck containing one card for every combination of thirteen ranks and four suits. Drawn, played, or discarded cards SHALL NOT return to the draw pile during that round unless an explicit effect says otherwise.

#### Scenario: Draw pile is finite
- **WHEN** cards are played or discarded during a round
- **THEN** those cards remain unavailable for subsequent draws in that round

#### Scenario: Round deck resets
- **WHEN** the player advances to the next round
- **THEN** the standard deck is reconstructed and shuffled using the run's deterministic random state

### Requirement: Hand selection actions
The baseline rules SHALL deal a hand of eight cards and grant four play actions and four discard actions per round. The player SHALL select between one and five cards for either action, subject to active modifier rules.

#### Scenario: Play selected cards
- **WHEN** the player selects one to five cards and activates Play with a play action remaining
- **THEN** the selected cards are evaluated and scored, one play action is consumed, and replacement cards are drawn when available

#### Scenario: Discard selected cards
- **WHEN** the player selects one to five cards and activates Discard with a discard action remaining
- **THEN** no score is awarded, one discard action is consumed, and replacement cards are drawn when available

#### Scenario: Invalid action is blocked
- **WHEN** no cards are selected, more than five cards are selected, or the relevant action count is zero
- **THEN** the corresponding action is disabled and game state is not advanced

### Requirement: Poker-hand classification
The engine SHALL classify played cards as High Card, Pair, Two Pair, Three of a Kind, Straight, Flush, Full House, Four of a Kind, or Straight Flush using standard five-card poker rules, while allowing A-2-3-4-5 and 10-J-Q-K-A straights. It SHALL identify exactly which played cards contribute to the classified hand.

#### Scenario: Best available hand is selected
- **WHEN** played cards satisfy more than one classification
- **THEN** the engine selects the highest-ranked valid poker hand

#### Scenario: Partial hand scores only its contributing cards
- **WHEN** played cards include cards that do not contribute to the classified hand
- **THEN** only contributing cards provide rank chips unless an active effect makes additional cards score

### Requirement: Baseline chips and multiplier scoring
The engine SHALL calculate a hand as chips multiplied by multiplier. Baseline hand values SHALL be High Card 5x1, Pair 10x2, Two Pair 20x2, Three of a Kind 30x3, Straight 30x4, Flush 35x4, Full House 40x4, Four of a Kind 60x7, and Straight Flush 100x8. Scoring numbered cards SHALL add their rank, J/Q/K SHALL add 10, and A SHALL add 11 chips before modifier effects.

#### Scenario: Score an unmodified hand
- **WHEN** a played hand has no applicable modifier effects
- **THEN** its awarded score equals `(hand chips + contributing card chips) × hand multiplier`

#### Scenario: Score uses integer game values
- **WHEN** additive and multiplicative effects finish resolving
- **THEN** the round score is increased by the resulting nonnegative integer according to the configured rounding rule

### Requirement: Ordered score resolution
The engine SHALL resolve scoring as an ordered event trace covering hand base values, contributing cards from left to right, triggered card effects, and owned modifiers from left to right. Additive chips, additive multiplier, and multiplicative multiplier effects SHALL apply at their declared timing rather than being algebraically reordered.

#### Scenario: Modifier order changes score
- **WHEN** two owned modifiers produce order-sensitive additive and multiplicative effects
- **THEN** changing their left-to-right inventory order changes the result according to the event sequence

#### Scenario: Resolution trace is retained
- **WHEN** a hand finishes scoring
- **THEN** the game state contains an ordered trace of score-changing events sufficient for the interface and tests to explain the result

### Requirement: Opponent, stage, round, and run progression
A compatibility match SHALL belong to one opponent and contain one or more stages. Every stage SHALL contain exactly three ordered rounds: a small round, a big round, and a special round with an optional configured rule. The primary playable run SHALL use the researched Junak progression of three stages and nine total rounds. The five researched villager opponents SHALL remain independent one-stage, three-round compatibility fixtures or tutorial variants and SHALL NOT be concatenated into the primary run. Each round SHALL define its score target, reward, and optional rule through the versioned compatibility catalog.

#### Scenario: Round target reached
- **WHEN** accumulated round score reaches or exceeds the target
- **THEN** the round ends successfully, awards its configured settlement, and advances to the post-round flow without consuming additional play actions

#### Scenario: Actions exhausted below target
- **WHEN** the player has no play actions remaining and the accumulated score is below target
- **THEN** the run ends in defeat

#### Scenario: Stage completed
- **WHEN** the player defeats the special third round of a nonfinal stage
- **THEN** the run advances to the next stage, reconstructs the per-round deck and actions, and preserves coins and modifiers for the same opponent match

#### Scenario: Final round completed
- **WHEN** the player defeats the special round in Junak stage three
- **THEN** the run ends in victory and records the final run score and economy state

#### Scenario: Separate opponent match
- **WHEN** a separate villager compatibility match or tutorial variant is started
- **THEN** its one-stage progression begins with a fresh economy and does not inherit Junak-run coins or modifiers

### Requirement: Selected-build progression table
The compatibility catalog for Windows `v1.0.3.1551` SHALL encode the following researched targets and base rewards. It SHALL preserve the explicitly documented product adjustment for the primary stage-three special round while keeping verified reference-only behavior distinguishable in the research notes. Each tuple is `target/reward`; the first two rounds have no special rule.

| Opponent | Stage | Small | Big | Special | Special rule |
| --- | ---: | ---: | ---: | ---: | --- |
| Junak | 1 | 300/3 | 450/4 | 600/5 | Face cards are debuffed |
| Junak | 2 | 1000/3 | 1500/4 | 1500/5 | Only one poker-hand type may be played |
| Junak | 3 | 5000/3 | 7500/4 | 10000/5 | No additional card-selection restriction (product adjustment) |
| Gumo | 1 | 300/3 | 1050/4 | 2100/5 | Begin the special round with zero discards |
| Mima | 1 | 300/3 | 1050/4 | 2100/5 | Cards played earlier in the stage are debuffed |
| Kazhin | 1 | 300/3 | 1050/4 | 2100/5 | Hand size is reduced by one |
| Suwam | 1 | 300/3 | 1050/4 | 1050/5 | Only one poker hand may be played |
| Ramo | 1 | 300/3 | 1050/4 | 2100/5 | Each poker-hand type may be played at most once |

#### Scenario: Start the primary run
- **WHEN** the player starts the normal poker run
- **THEN** the engine loads Junak stages 1 through 3 in table order for nine total rounds

#### Scenario: Load a compatibility fixture
- **WHEN** a villager opponent fixture or tutorial variant is selected
- **THEN** the engine loads only that opponent's three rounds for stage 1 and applies the configured special rule to its third round

### Requirement: Compatibility rules are versioned data
Opponent definitions, stage and round targets, rewards, action counts, hand values, special rules, and other original-behavior constants SHALL be stored in a versioned compatibility catalog separate from engine logic. Every researched value SHALL carry provenance and a verification status of `verified`, `inferred`, or `unknown`. Unknown values required for play SHALL use explicitly named deterministic provisional defaults that can be replaced without changing engine control flow.

#### Scenario: Correct a researched rule
- **WHEN** a compatibility value is corrected after verification against the reference game
- **THEN** the catalog version changes and the engine consumes the new value without requiring control-flow duplication

#### Scenario: Use a provisional unknown value
- **WHEN** a run requires an unverified reroll escalation or random distribution
- **THEN** the engine uses the catalog's deterministic provisional value and keeps its status distinguishable from verified compatibility data
