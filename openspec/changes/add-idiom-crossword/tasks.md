## 1. Corpus Pipeline

- [ ] 1.1 Download the Ministry of Education *Idioms Dictionary* main text, record its edition and retrieval date, and confirm the entry count against `docs/idiom-crossword-research.md`, which currently cites it from a search summary rather than the file itself.
- [ ] 1.2 Add `scripts/import-idiom-dictionary.mjs` producing `src/data/idioms.js` with surface form and frequency tier, following the `import-puzzle-bank.mjs` pattern, and make it byte-reproducible across runs.
- [ ] 1.3 Reject non-four-character rows and duplicates in the script, and report rejection counts rather than silently dropping rows.
- [ ] 1.4 Align frequency data to the Traditional corpus for tier assignment only, never adding entries, assigning unaligned entries the lowest tier, and reporting the alignment rate.
- [ ] 1.5 Decide on the evidence from 1.4 whether to keep automated tiering or fall back to hand-ranking a common subset; record the decision in the research document.
- [ ] 1.6 Add corpus tests asserting length four, no duplicates, tier coverage, and a non-empty top tier.
- [ ] 1.7 Add the dictionary's author, maintaining institution, edition, and licence to `THIRD_PARTY_NOTICES.md`.

## 2. Board Generation

- [ ] 2.1 Build the `(character, offset) -> idiom[]` placement index from the corpus with tests for lookup completeness.
- [ ] 2.2 Implement lattice growth from a seed idiom using the existing serializable PRNG, with attachment by a single shared perpendicular cell, and prohibit `Math.random()` in the module.
- [ ] 2.3 Implement placement rejection for geometry conflicts, duplicate idioms, adjacent parallel runs, and the nine-cell bounding box, each with its own test.
- [ ] 2.4 Implement bounded attempts, board normalisation to the bounding box, and shortfall recording when the target idiom count is unreachable.
- [ ] 2.5 Implement blanking and clue selection driven by the difficulty table.
- [ ] 2.6 Implement candidate pool assembly with duplicate characters preserved and difficulty-scaled decoys.

## 3. Solver and Uniqueness

- [ ] 3.1 Implement a board solver whose value domain is the candidate pool, counting solutions with an early exit at two.
- [ ] 3.2 Implement the uniqueness repair loop: reveal one clue character, re-verify, repeat to a bounded limit, then discard the seed.
- [ ] 3.3 Re-verify uniqueness after decoys are added, and reject decoy sets that introduce a second solution.
- [ ] 3.4 Add a generation sweep test asserting exactly one solution across a range of seeds for every difficulty level.
- [ ] 3.5 Measure whether repair reveals push clue density outside the level's intended band, and tune the repair cap on that evidence.

## 4. Difficulty

- [ ] 4.1 Add the five-level difficulty table as data, covering idiom count, crossing count, clue proportion, decoy proportion, and eligible frequency tiers.
- [ ] 4.2 Add validation tests asserting monotonic idiom count and clue proportion across levels.
- [ ] 4.3 Sample generated boards per level and record observed board size, crossing count, and pool size for tuning.

## 5. Gameplay

- [ ] 5.1 Implement the play reducer: select cell, place from pool, replace, clear, reveal, and completion detection, following the existing Sudoku reducer approach.
- [ ] 5.2 Enforce clue-cell immutability and pool accounting so a character returns to the pool on replace and clear.
- [ ] 5.3 Implement automatic completion detection with no submit action, and the incomplete-but-full case.
- [ ] 5.4 Implement error marking as a toggleable setting and reveal counting.
- [ ] 5.5 Build the board component at 360 CSS px with 44 px minimum targets, non-colour state indicators, and `prefers-reduced-motion` support.
- [ ] 5.6 Build the candidate pool component with tap-to-fill, no IME, and no drag.
- [ ] 5.7 Add keyboard operation and accessible names for cells and pool characters, with tests driving a fill entirely by keyboard.
- [ ] 5.8 Reserve the definition panel in the UI without shipping definition data, and make its container scroll rather than truncate.

## 6. Session and Persistence

- [ ] 6.1 Add the idiom crossword routes for home, seeded puzzle, and daily, preserving the redirect for unknown paths.
- [ ] 6.2 Derive the daily seed from the calendar date and test stability within a day.
- [ ] 6.3 Implement the versioned snapshot storing the board, pool, fills, reveals, counters, and timer origin, written after every committed move.
- [ ] 6.4 Test that a corpus or generator change does not alter a restored in-progress board.
- [ ] 6.5 Implement incompatible-snapshot handling that retains records and requires an explicit clear.
- [ ] 6.6 Implement records with per-difficulty best time, completion count, and streak, keeping assisted completions out of the unassisted best time.
- [ ] 6.7 Add regression tests asserting the Sudoku and poker localStorage keys are untouched.

## 7. Hub and Documentation

- [ ] 7.1 Add the third hub card with resume state, and test that the Sudoku and poker cards are unaffected whether or not idiom data exists.
- [ ] 7.2 Update `README.md` with the new routes, structure entries, and rules baseline.
- [ ] 7.3 Resolve the open questions in `design.md` on daily difficulty, assisted-record display, and the board-size cap, and record the decisions.
- [ ] 7.4 Re-verify the `snippet`-graded citations in `docs/idiom-crossword-research.md` from primary sources when an environment with wider network egress is available, and upgrade or correct their grades.
