## ADDED Requirements

### Requirement: Ordered modifier inventory
The player SHALL be able to own at most six modifier cards, inspect each effect, reorder owned modifiers, and sell eligible modifiers. Effects SHALL resolve according to their declared trigger and current left-to-right inventory order.

#### Scenario: Inventory limit reached
- **WHEN** the player owns six modifiers and no effect increases capacity
- **THEN** purchasing or taking another modifier is blocked until space is made

#### Scenario: Reorder modifiers
- **WHEN** the player moves a modifier to a different inventory position
- **THEN** subsequent score resolution uses the new left-to-right order

#### Scenario: Sell a modifier
- **WHEN** the player sells an eligible owned modifier
- **THEN** it is removed and its configured sale value is added to the player's coins

### Requirement: Data-driven modifier effects
The original modifier behaviors used by the compatibility target SHALL be represented by stable effect identifiers, typed parameters, trigger timing, rarity, price, sale value, and compatibility version. Runtime content SHALL reference registered effect handlers rather than executable code embedded in data.

#### Scenario: Resolve a modifier trigger
- **WHEN** a game event matches an owned modifier's registered trigger
- **THEN** its typed handler produces deterministic state and score events using the modifier parameters

#### Scenario: Unsupported effect identifier
- **WHEN** saved or catalog data references an unregistered effect identifier
- **THEN** run restoration fails safely with a recoverable incompatibility message instead of executing arbitrary data

### Requirement: Post-round shop
After each successful round defined to open a shop, the game SHALL offer a deterministic selection of purchasable modifiers and packs, a reroll action with its configured cost progression, and an action to continue to the next round.

#### Scenario: Purchase an affordable item
- **WHEN** the player selects an item they can afford and inventory constraints allow it
- **THEN** its cost is deducted exactly once and its purchase effect is applied exactly once

#### Scenario: Reroll the shop
- **WHEN** the player can afford the current reroll cost and activates Reroll
- **THEN** the cost is deducted, a new deterministic offer is generated, and the next reroll cost follows the compatibility catalog; the first reroll costs one coin and later costs use the catalog's explicitly provisional deterministic escalation until verified

#### Scenario: Leave the shop
- **WHEN** the player activates Continue
- **THEN** the current offers expire and the next round begins

### Requirement: Packs and choices
Purchasing a pack SHALL open its configured deterministic set of choices and allow the configured number of choices to be taken before returning to the same shop state.

#### Scenario: Choose from a pack
- **WHEN** a pack reveals `N` items and permits `K` choices
- **THEN** the player can inspect all `N`, take no more than `K`, and then returns to the shop with purchases and random state preserved

#### Scenario: Skip a pack
- **WHEN** the pack permits skipping and the player activates Skip
- **THEN** no offered item is granted and the game returns to the shop

### Requirement: Rewards, remaining hands, and interest
Successful rounds SHALL grant their configured base reward, one coin for each remaining play action, and one interest coin for each complete five coins held at settlement, capped at five interest coins, unless a round rule or modifier overrides that rule.

#### Scenario: Interest is capped
- **WHEN** the player settles a round while holding at least 25 coins and no override is active
- **THEN** exactly five interest coins are added in addition to the base reward and remaining-hand reward

#### Scenario: Partial five earns no interest
- **WHEN** the player settles while holding fewer than five coins
- **THEN** no interest coin is added

### Requirement: Special round rules
Special round rules SHALL be configured by the opponent/stage/round table using registered, deterministic rule identifiers and SHALL be visible before the player commits to the round.

#### Scenario: Enter a special round
- **WHEN** the player reaches the third round of a stage
- **THEN** its target, reward, and special rule are shown before the first hand is played

#### Scenario: Special rule affects play
- **WHEN** the active special rule matches a relevant game event
- **THEN** the registered rule handler alters only the declared actions, cards, scoring, shop, or modifiers and records the alteration in the event trace
