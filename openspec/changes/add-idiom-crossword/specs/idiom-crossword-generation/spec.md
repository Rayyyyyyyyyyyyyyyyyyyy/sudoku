## ADDED Requirements

### Requirement: Deterministic board generation
Board generation SHALL consume the repository's serializable seeded PRNG and SHALL NOT call `Math.random()`. The same seed and difficulty level SHALL always produce the same board, pool, and clue set.

#### Scenario: Same seed reproduces the board
- **WHEN** generation runs twice with the same seed and difficulty
- **THEN** the resulting board, blanked cells, clue characters, and candidate pool are identical

#### Scenario: Daily puzzle is stable within a day
- **WHEN** the daily puzzle is opened more than once on the same calendar day
- **THEN** the same board is produced

### Requirement: Lattice construction from four-cell runs
Every idiom SHALL occupy exactly four contiguous cells running left-to-right or top-to-bottom. A new run SHALL be attached to the board only by sharing exactly one cell with an already-placed run of the perpendicular orientation, and the shared cell's character SHALL be identical in both runs. The same idiom SHALL NOT appear twice on one board.

#### Scenario: Runs cross at a shared character
- **WHEN** a vertical run is attached to a horizontal run
- **THEN** they overlap in exactly one cell whose character belongs to both idioms

#### Scenario: Duplicate idioms are rejected
- **WHEN** a candidate idiom already appears on the board
- **THEN** it is not placed

#### Scenario: Board is normalised
- **WHEN** generation completes
- **THEN** the board is cropped to the bounding box of its occupied cells

### Requirement: No undeclared character strings
Every maximal run of two or more orthogonally contiguous occupied cells SHALL be exactly one declared four-cell idiom run. Two cells of the same orientation MAY sit adjacent only when both belong to the same perpendicular declared run, which is what a crossing already is.

This is the rule the board must satisfy; a blanket "parallel runs must be separated by an empty cell" is too strong and would reject a legal and desirable board, such as one where a single vertical idiom crosses three horizontal idioms placed in consecutive rows.

#### Scenario: Unintended string is rejected
- **WHEN** a candidate placement would extend an existing run to five or more contiguous cells, or would put two cells side by side that do not both belong to one perpendicular declared run
- **THEN** the placement is rejected and generation tries another candidate

#### Scenario: A shared crossing column is allowed
- **WHEN** one vertical run crosses horizontal runs placed in adjacent rows, so those horizontal runs overlap in the crossing column
- **THEN** the placement is accepted, because every contiguous string it forms is a declared run

#### Scenario: Whole-board invariant holds
- **WHEN** the generation test suite scans finished boards in both orientations
- **THEN** every maximal string of length two or more is a declared run of exactly four cells

### Requirement: Board size bound
A generated board SHALL NOT exceed nine cells in either dimension, so that every cell renders at no less than 36 CSS px within a 360 CSS px portrait viewport without horizontal page scrolling.

#### Scenario: Oversized placement is rejected
- **WHEN** a candidate placement would extend the bounding box beyond nine cells in either dimension
- **THEN** the placement is rejected

### Requirement: Guaranteed unique solution
Every generated puzzle SHALL have exactly one solution given its board, clue characters, and candidate pool. The generator SHALL verify this by solving with an early exit once a second solution is found. When the solution is not unique, the generator SHALL reveal one additional clue character and re-verify, repeating until the solution is unique or a bounded repair limit is reached.

#### Scenario: Non-unique puzzle is repaired
- **WHEN** verification finds a second solution
- **THEN** an additional clue character is revealed and verification runs again

#### Scenario: Unrepairable seed is discarded
- **WHEN** the repair limit is reached and the solution is still not unique
- **THEN** the board is discarded and generation restarts from the next seed rather than shipping the puzzle

#### Scenario: Shipped puzzles are verified
- **WHEN** the generation test suite runs across a range of seeds and difficulties
- **THEN** every produced puzzle is asserted to have exactly one solution

### Requirement: Candidate pool composition
The candidate pool SHALL contain one entry for every blanked cell, including repeated characters when the same character is blanked more than once. Difficulty MAY add decoy characters drawn from other idioms in the same frequency tier. Decoys SHALL NOT create a second valid solution.

#### Scenario: Repeated characters appear repeatedly
- **WHEN** the same character is blanked in two different cells
- **THEN** the pool contains that character twice

#### Scenario: Decoys preserve uniqueness
- **WHEN** decoy characters are added to the pool
- **THEN** uniqueness verification is run again with the decoys present and the puzzle still has exactly one solution

### Requirement: Difficulty levels
Generation SHALL accept five difficulty levels, numbered 0 to 4, that vary idiom count, crossing count, the proportion of pre-filled clue characters, the proportion of decoys, and the frequency tiers eligible for selection. Higher levels SHALL NOT use lower clue proportions than the level below them.

#### Scenario: Difficulty parameters are monotonic
- **WHEN** the difficulty table is validated
- **THEN** idiom count is non-decreasing and clue proportion is non-increasing as level rises

#### Scenario: Generation shortfall is recorded
- **WHEN** generation cannot reach the target idiom count for a seed within its attempt budget
- **THEN** a smaller board is produced and the shortfall is recorded rather than generation looping indefinitely
