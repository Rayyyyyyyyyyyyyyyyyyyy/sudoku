## ADDED Requirements

### Requirement: Routes
The application SHALL expose hash routes for the idiom crossword home, a puzzle at a chosen difficulty and seed, and a daily puzzle. Unrecognised paths SHALL continue to redirect to the hub.

#### Scenario: Difficulty and seed are addressable
- **WHEN** a puzzle route carrying a difficulty and seed is opened directly
- **THEN** that exact puzzle is generated and shown

#### Scenario: Daily route is seeded by date
- **WHEN** the daily route is opened
- **THEN** the seed is derived from the calendar date so the puzzle is the same for the whole day

### Requirement: Save after every committed move
The application SHALL persist the board, candidate pool, player fills, revealed cells, assistance counters, and timer origin after every committed move, under a versioned localStorage key distinct from the Sudoku and poker keys. The snapshot SHALL store the generated board itself, not only the seed.

#### Scenario: Progress survives a reload
- **WHEN** the tab is reloaded mid-puzzle
- **THEN** the board, fills, pool state, and elapsed time are restored

#### Scenario: Board is restored, not regenerated
- **WHEN** the generation algorithm or corpus changes between sessions
- **THEN** a saved puzzle restores its original board rather than producing a different one

#### Scenario: Existing keys are untouched
- **WHEN** the idiom crossword writes its snapshot
- **THEN** the Sudoku statistics, settings, active-game, and poker keys are unchanged

### Requirement: Incompatible snapshot handling
When a stored snapshot's schema version is not supported, the application SHALL retain records, SHALL NOT load the active puzzle, and SHALL require an explicit player action to clear it.

#### Scenario: Unsupported snapshot is not silently discarded
- **WHEN** a snapshot with an unsupported schema version is found
- **THEN** the player is told it needs handling and the data is retained until they choose to clear it

### Requirement: Records
The application SHALL record, per difficulty, the best completion time, the completion count, and the daily streak. Completions that used a reveal SHALL be recorded distinctly from completions that used none, and SHALL NOT set an unassisted best time.

#### Scenario: Assisted completion does not set a best time
- **WHEN** a puzzle is completed after at least one reveal
- **THEN** the completion is recorded but the unassisted best time is unchanged
