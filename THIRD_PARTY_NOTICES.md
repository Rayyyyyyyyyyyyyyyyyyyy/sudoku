# Third-party puzzle data

## Sudoku puzzles

The bundled Sudoku puzzles are a 1,021-puzzle subset of the fixed
[`d8c8eba` version of Sudoku Exchange Puzzle Bank](https://github.com/grantm/sudoku-exchange-puzzle-bank/tree/d8c8ebaee0c08c412cfba96af1923dfa61c83317)
by Grant McLean.

The source repository states that QQWing generated and uniqueness-checked the
puzzles, and Sukaku Explainer assigned each difficulty rating. The data set is
released into the public domain under
[The Unlicense](https://github.com/grantm/sudoku-exchange-puzzle-bank/blob/d8c8ebaee0c08c412cfba96af1923dfa61c83317/LICENSE.txt).

Each bundled record preserves the original 81-digit puzzle and Sukaku Explainer
rating. The original five pools (1,000 puzzles) remain unchanged, preserving
saved level-and-seed mappings. A sixth, separate challenge pool contains all
21 available puzzles rated SE 9.2 or higher from the fixed source's
`diabolical.txt`: 20 rated 9.2 and one rated 9.3. That file contains 119,681
puzzles and has no rating above 9.3, so the app does not claim 200 challenge
puzzles or any higher rating.

To reproduce only the challenge pool, download that fixed `diabolical.txt` and
run `node scripts/import-sudoku-challenges.mjs <path-to-diabolical.txt>`.
The importer verifies its SHA-256 checksum, rejects duplicate puzzles across
pools, independently checks unique solutions, and preserves source order.
It writes only `src/data/sudokuChallengePuzzles.js`; it never regenerates the
original `src/data/puzzles.js`. The test suite also checks every bundled
puzzle for exactly one solution.
