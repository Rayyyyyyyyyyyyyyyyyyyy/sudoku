## ADDED Requirements

### Requirement: Shared game hub
The application SHALL present a shared game hub at `/` that exposes Sudoku and the poker roguelike as distinct playable games without hiding the existing Sudoku difficulty, daily puzzle, statistics, or settings experience.

#### Scenario: Choose the poker roguelike
- **WHEN** a user activates the poker game entry on the shared hub
- **THEN** the application navigates to the poker landing experience

#### Scenario: Choose Sudoku
- **WHEN** a user activates the Sudoku entry on the shared hub
- **THEN** the application navigates to a Sudoku landing experience containing the existing daily puzzle, difficulty choices, statistics, and settings

### Requirement: Stable game routes
The application SHALL provide stable routes for the poker landing page and active poker run while preserving the existing `/daily` and `/play/:level` Sudoku routes.

#### Scenario: Open an existing Sudoku link
- **WHEN** a user opens a previously shared `/daily` or `/play/:level?seed=...` URL
- **THEN** the same Sudoku game behavior loads without requiring navigation through the hub

#### Scenario: Open poker directly
- **WHEN** a user opens the poker landing or poker run URL directly
- **THEN** the requested poker experience loads without first visiting the hub

### Requirement: Active-session navigation
The hub and each game landing page SHALL indicate when that game has a resumable session and SHALL let the user explicitly resume it or start over.

#### Scenario: Poker run is resumable
- **WHEN** a saved nonterminal poker run exists
- **THEN** the poker entry shows a resume action and its current opponent, stage, and round

#### Scenario: Starting over is confirmed
- **WHEN** a user requests a new poker run while a resumable run exists
- **THEN** the application requests confirmation before replacing that run

### Requirement: Unknown-route recovery
The application SHALL recover unknown routes to the shared game hub while leaving recognized direct game routes unchanged.

#### Scenario: Unknown route
- **WHEN** a user opens an unrecognized hash route
- **THEN** the application redirects to the shared game hub
