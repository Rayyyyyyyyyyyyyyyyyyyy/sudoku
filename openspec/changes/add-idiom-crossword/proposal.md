## Why

The game hub currently covers two long-form sessions: Sudoku demands sustained deductive focus, and the poker roguelike demands a ten-to-twenty minute run with accumulating state. Neither fills the thirty-second to three-minute fragments that dominate an actual commute, and both are grid-staring games that are tiring on a moving vehicle.

An idiom crossword adds a third form of play that is deductive like Sudoku but content-driven rather than purely numeric, scales continuously from one minute to fifteen by puzzle size, and is fully interruptible because the board is the entire state. Traditional Chinese idioms are uniformly four characters, which makes deterministic board generation and unique-solution verification tractable in a way general crossword construction is not.

## What Changes

- Add an idiom crossword game mode whose boards are lattices of four-cell idiom runs crossing at shared characters, generated deterministically from a seed.
- Build the answer corpus from the Ministry of Education *Idioms Dictionary* main text as versioned offline data, with frequency tiers used only to rank existing Traditional Chinese entries.
- Implement seeded board generation by growing the lattice from a seed idiom rather than filling a pre-designed grid, with backtracking, geometric adjacency rules, and a bounded board size that fits a 360 CSS px portrait viewport.
- Verify every generated puzzle has exactly one solution given its candidate character pool, revealing additional clue characters until uniqueness holds.
- Fill blanks by tapping a cell and then tapping a character from a pool below the board; no input method editor and no drag interaction.
- Add five difficulty levels varying run count, crossing count, clue ratio, decoy ratio, and frequency tier, plus a daily puzzle seeded by date.
- Add assistance settings for error marking, revealing a single cell, and showing the dictionary definition, with assisted completions recorded separately from unassisted ones.
- Persist board state after every committed move under a new versioned localStorage key, and surface an in-progress puzzle on the game hub.
- Record the dictionary attribution required by its licence in `THIRD_PARTY_NOTICES.md`, and reproduce definition text verbatim wherever it is displayed.

## Capabilities

### New Capabilities

- `idiom-crossword-corpus`: Versioned offline idiom data, frequency tiering, corpus validation, and licence attribution.
- `idiom-crossword-generation`: Deterministic lattice construction, placement and adjacency rules, blanking, candidate pool assembly, and unique-solution verification.
- `idiom-crossword-gameplay`: Cell selection, pool-based filling, clearing, validation, completion detection, assistance, and portrait touch interaction.
- `idiom-crossword-session`: Routes, daily puzzle, save-after-move persistence, recovery, and idiom-crossword records.

### Modified Capabilities

- `game-hub-navigation`: The hub gains a third game card and must surface a resumable idiom-crossword puzzle alongside the existing Sudoku and poker resume states.

## Impact

- Adds `src/lib/idiom/` engine modules, `src/data/idioms.js` generated corpus data, a build-time corpus script under `scripts/`, new routes and pages, and board and pool components.
- Reuses the existing serializable xorshift32 PRNG and the unique-solution verification approach already used for Sudoku puzzle selection; no new production dependency.
- Adds new versioned localStorage keys without changing the Sudoku statistics, settings, active-game, or poker keys.
- Keeps the application client-only and offline-capable; the corpus ships as generated source data, not a runtime fetch.
- Constrains the corpus pipeline: the dictionary licence permits format conversion and downstream application but prohibits modifying the text, so definitions must be reproduced verbatim and attribution is mandatory.
- Excludes definition full text from the initial bundle because it is orders of magnitude larger than the idiom list itself.
