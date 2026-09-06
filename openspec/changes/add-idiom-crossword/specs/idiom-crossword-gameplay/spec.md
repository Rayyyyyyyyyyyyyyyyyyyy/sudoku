## ADDED Requirements

### Requirement: Pool-based cell filling
The player SHALL fill a blank cell by selecting the cell and then selecting a character from the candidate pool. The application SHALL NOT require an input method editor, SHALL NOT require free text entry, and SHALL NOT require drag-and-drop for any action needed to complete a puzzle.

#### Scenario: Fill a cell from the pool
- **WHEN** a blank cell is selected and a pool character is activated
- **THEN** that character is placed in the cell and the pool entry becomes unavailable

#### Scenario: Replace a filled cell
- **WHEN** a cell already containing a player-placed character is selected and another pool character is activated
- **THEN** the previous character returns to the pool and the new character is placed

#### Scenario: Clear a cell
- **WHEN** the player clears a filled cell
- **THEN** the cell becomes blank and its character returns to the pool

#### Scenario: Clue cells are immutable
- **WHEN** the player selects a pre-filled clue cell
- **THEN** its character cannot be changed or cleared

### Requirement: Completion detection
A puzzle SHALL be complete when every blanked cell holds the character required by the unique solution. Completion SHALL be detected automatically without a submit action.

#### Scenario: Puzzle completes on last correct fill
- **WHEN** the final blank cell receives its correct character
- **THEN** the puzzle is marked complete, the timer stops, and the completion state is shown

#### Scenario: A full but incorrect board is not complete
- **WHEN** every blank cell is filled but at least one character is wrong
- **THEN** the puzzle is not marked complete

### Requirement: Assistance settings
The application SHALL offer error marking, revealing the selected cell, and showing a run's dictionary definition. Error marking SHALL be toggleable and default to its configured setting. Reveals SHALL be counted.

#### Scenario: Error marking flags wrong cells
- **WHEN** error marking is enabled and a placed character differs from the solution
- **THEN** that cell is shown as incorrect

#### Scenario: Error marking can be disabled
- **WHEN** error marking is disabled
- **THEN** incorrect characters are shown identically to correct ones until completion is attempted

#### Scenario: Reveal fills the selected cell
- **WHEN** the player reveals the selected blank cell
- **THEN** the correct character is placed, becomes immutable, and the reveal counter increments

### Requirement: Portrait touch interaction
The board, pool, and controls SHALL be usable at 360 CSS px width without horizontal page scrolling. Interactive targets SHALL be at least 44 CSS px in their smaller dimension. Selection, correctness, and completion states SHALL be conveyed by more than colour alone, and the interface SHALL respect `prefers-reduced-motion`.

#### Scenario: No horizontal page scroll at 360px
- **WHEN** the game is rendered at 360 CSS px width with the largest supported board
- **THEN** the page does not scroll horizontally

#### Scenario: State is not colour-only
- **WHEN** a cell is selected or marked incorrect
- **THEN** a non-colour indicator also distinguishes it

#### Scenario: Reduced motion is honoured
- **WHEN** the viewer prefers reduced motion
- **THEN** fill and completion transitions are presented without animation

### Requirement: Keyboard and assistive operation
Every cell and every pool character SHALL be reachable and activatable by keyboard, and SHALL expose an accessible name identifying its position or character.

#### Scenario: Keyboard fills a cell
- **WHEN** the player focuses a blank cell, activates it, focuses a pool character, and activates it
- **THEN** the character is placed without pointer input
