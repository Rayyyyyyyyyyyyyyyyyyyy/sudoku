## ADDED Requirements

### Requirement: Consistent game landing hierarchy
The product SHALL present Sudoku, Idiom Crossword, and Poker landing pages with a shared Sudoku-derived page shell and information hierarchy while allowing each game to supply its own labels, progress data, settings, and domain content.

#### Scenario: Player opens any game landing page
- **WHEN** the player opens the landing page for Sudoku, Idiom Crossword, or Poker
- **THEN** the page presents the common brand/header region, primary play or resume action, supporting sections, and footer using the same container, spacing, card, and action hierarchy

#### Scenario: A game has domain-specific landing content
- **WHEN** a game needs statistics, difficulty selection, settings, or mode-specific explanatory content
- **THEN** that content remains available inside the shared hierarchy without creating a separate page-wide layout system

#### Scenario: Player opens the game catalog
- **WHEN** the player opens GameHub
- **THEN** the catalog retains its wide card-grid information architecture while using the neutral application shell and shared global design tokens

### Requirement: Shared play-page frame with domain-specific stages
The product SHALL use one structural play-page frame for all three games, including consistent navigation, status, controls, and outcome placement, while sizing each domain stage according to its content.

#### Scenario: Player enters Sudoku or Idiom Crossword gameplay
- **WHEN** the player opens a board-based game
- **THEN** the board and its primary controls use the shared narrow board column and remain visually aligned

#### Scenario: Player enters Poker gameplay on a wide viewport
- **WHEN** the player opens Poker on a viewport that can accommodate the table
- **THEN** the Poker stage may expand beyond the board column while its topbar, controls, status surfaces, typography, and spacing remain consistent with the shared frame

### Requirement: Responsive layout across supported viewports
The shared layout SHALL separate home content, ordinary play content, board stages, and wide stages into distinct sizing responsibilities. It SHALL remain operable from 320 CSS px wide through desktop widths and SHALL NOT introduce page-level horizontal scrolling, clipped primary content, or overlapping interactive controls.

#### Scenario: A short or landscape viewport displays ordinary content
- **WHEN** a landing section, topbar, status, candidate pool, or control group is rendered in a viewport with limited block size
- **THEN** its inline size is determined by available inline space and its content max-width, not by a board-specific viewport-height constraint

#### Scenario: Narrowest supported viewport
- **WHEN** a landing or gameplay page is rendered at 320×700 CSS px
- **THEN** primary content fits the viewport, actions remain reachable, and no page-level horizontal scroll is required

#### Scenario: Standard phone viewport
- **WHEN** a landing or gameplay page is rendered at 360×800 CSS px
- **THEN** the page preserves its information hierarchy, keeps primary actions within the available width, and does not clip the board, pool, table controls, or status content

#### Scenario: Tablet viewport
- **WHEN** a landing or gameplay page is rendered at 768×1024 CSS px
- **THEN** the layout uses the additional width without stretching text or board controls beyond their intended readable container

#### Scenario: Desktop viewport
- **WHEN** a landing or gameplay page is rendered at 1280×800 CSS px
- **THEN** the page is centered, maintains bounded content widths, and gives the Poker stage its wide variant without changing the common page hierarchy

#### Scenario: Responsive geometry is verified
- **WHEN** an updated route is inspected at a required viewport
- **THEN** the document scroll width does not exceed its client width, primary element bounds remain inside the viewport, and any horizontal scrolling is confined to an explicitly designed local scroller such as a Poker card rail

### Requirement: Consistent page semantics
Each game landing and gameplay route SHALL expose a main landmark and a programmatically identifiable primary heading that matches the page or current Poker phase.

#### Scenario: Assistive technology enters a game route
- **WHEN** a player opens any Sudoku, Idiom Crossword, or Poker landing or gameplay route
- **THEN** the player can identify the main content and its primary page or phase heading without relying on visual styling

### Requirement: Touch target sizing and dense-grid exception
All non-grid interactive controls SHALL provide a touch target of at least 44×44 CSS px. Dense Idiom Crossword grid cells MAY use the bounded exception defined below so the grid can fit without page-level horizontal scrolling.

#### Scenario: Player uses ordinary controls on a phone
- **WHEN** the player uses navigation, primary actions, settings, number or character controls, Poker actions, or other controls outside a dense board
- **THEN** each control exposes a touch target of at least 44×44 CSS px

#### Scenario: Player opens a 9-column idiom board at 360px
- **WHEN** an Idiom Crossword puzzle with nine columns is displayed in a 360 CSS px viewport
- **THEN** every grid cell is at least 36×36 CSS px and the page does not require horizontal scrolling

#### Scenario: Player opens a 9-column idiom board at 320px
- **WHEN** an Idiom Crossword puzzle with nine columns is displayed in a 320 CSS px viewport
- **THEN** the grid may scale cells below 36 CSS px only as needed to fit, while selection remains perceivable and every control outside the grid remains at least 44×44 CSS px

### Requirement: Accessibility behavior survives layout unification
The shared layout SHALL preserve keyboard operation, visible focus, non-color-only state communication, readable zoom behavior, and reduced-motion preferences already provided by each game.

#### Scenario: Keyboard user traverses an updated page
- **WHEN** a player navigates an updated landing or gameplay page using a keyboard
- **THEN** focus order follows the visual hierarchy, every actionable element is reachable, and focus is visibly indicated

#### Scenario: Motion reduction is requested
- **WHEN** the operating system reports `prefers-reduced-motion: reduce`
- **THEN** the unified layout does not reintroduce non-essential game motion that the existing game experience suppresses

#### Scenario: A state is indicated by color
- **WHEN** selected, correct, misplaced, disabled, or error state uses color styling
- **THEN** the state also has text, shape, iconography, pattern, or another non-color cue available to the player

#### Scenario: Player selects a Sudoku cell
- **WHEN** the player selects a Sudoku grid cell
- **THEN** selection is communicated through a visible non-color outline and an ARIA selected state or semantic equivalent in addition to the existing background color

### Requirement: Each game presents only relevant settings
The application SHALL keep one persisted settings owner while each game landing page SHALL present only the settings that affect that game.

#### Scenario: Player opens Sudoku settings
- **WHEN** the player views the Sudoku landing page
- **THEN** the page presents Sudoku error, peer highlighting, and automatic note-cleaning settings without presenting the Idiom Crossword error setting

#### Scenario: Player opens Idiom Crossword settings
- **WHEN** the player views the Idiom Crossword landing page
- **THEN** the page presents the Idiom Crossword error setting without duplicating unrelated Sudoku settings

### Requirement: Gameplay and persistence remain behaviorally compatible
Layout unification SHALL NOT change routing, game rules, scoring, puzzle generation, seeded randomness, session persistence, resume behavior, or offline registration semantics.

#### Scenario: Existing player resumes a game after the layout migration
- **WHEN** a valid saved Sudoku, Idiom Crossword, or Poker session is present
- **THEN** the corresponding landing or gameplay flow resumes the same state under the unified layout

#### Scenario: Player completes a core game flow
- **WHEN** the player starts and operates any of the three games after the migration
- **THEN** the same domain events and outcomes occur as before the layout-only change
