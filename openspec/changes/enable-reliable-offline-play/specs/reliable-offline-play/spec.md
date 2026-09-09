## ADDED Requirements

### Requirement: Persisted games have a complete return path

The application SHALL provide a visible continuation path for every compatible active game and SHALL restore the authoritative state represented by that save.

#### Scenario: Resume a stored idiom board after generator drift

- **GIVEN** a compatible idiom snapshot containing a board and player progress
- **WHEN** current generation for the route would produce different puzzle data
- **THEN** gameplay uses the stored board, pool, progress, reveal state, and elapsed time

#### Scenario: Resume a stored Sudoku route

- **GIVEN** a compatible active Sudoku session
- **WHEN** the player chooses to continue it
- **THEN** the application opens its exact daily route or seeded difficulty route

### Requirement: Installed application works without network access

After one successful production load and service-worker installation, the application SHALL be able to load its route shell and bundled game data without network access and SHALL make no required third-party runtime request.

#### Scenario: Reopen while offline

- **GIVEN** the production application completed service-worker installation during an online visit
- **WHEN** the player later navigates to the application while offline
- **THEN** cached HTML, JavaScript, CSS, local assets, and game data load the game cabinet

#### Scenario: Update the cached application

- **WHEN** a newly built service worker activates
- **THEN** it removes only obsolete caches owned by this application and preserves localStorage progress and unrelated origin caches

### Requirement: Seed compatibility survives ownership cleanup

Moving deterministic random helpers SHALL NOT change poker PRNG streams or idiom puzzle output for an existing seed and difficulty.

#### Scenario: Generate with an existing seed after extraction

- **GIVEN** an existing poker PRNG seed or idiom puzzle seed and difficulty
- **WHEN** the same input is evaluated through the neutral random boundary
- **THEN** it produces the same serialized random stream and deterministic puzzle output as before extraction
