## MODIFIED Requirements

### Requirement: Game hub entry points
The hub SHALL present a card for each available game and SHALL surface resumable progress for each. It now covers three games rather than two.

#### Scenario: Idiom crossword card is present
- **WHEN** the hub is opened
- **THEN** a card for the idiom crossword is shown alongside Sudoku and the poker roguelike

#### Scenario: In-progress puzzle is surfaced
- **WHEN** a saved idiom crossword puzzle exists and is not complete
- **THEN** the hub shows its difficulty and progress, and its action resumes that puzzle

#### Scenario: Existing games are unaffected
- **WHEN** the hub renders with idiom crossword data present or absent
- **THEN** the Sudoku and poker cards behave exactly as before
