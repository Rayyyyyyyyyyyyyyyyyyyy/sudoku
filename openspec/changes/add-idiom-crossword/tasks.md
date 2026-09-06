## 1. Corpus Pipeline

- [x] 1.1 Download the Ministry of Education *Idioms Dictionary* main text, record its edition and retrieval date, and confirm the entry count against `docs/idiom-crossword-research.md`, which currently cites it from a search summary rather than the file itself.
- [x] 1.2 Add `scripts/import-idiom-dictionary.mjs` producing `src/data/idioms.js` with surface form and frequency tier, following the `import-puzzle-bank.mjs` pattern, and make it byte-reproducible across runs.
- [x] 1.3 Reject non-four-character rows and duplicates in the script, and report rejection counts rather than silently dropping rows.
- [x] 1.4 Align frequency data to the Traditional corpus for tier assignment only, never adding entries, assigning unaligned entries the lowest tier, and reporting the alignment rate.
- [x] 1.5 Decide on the evidence from 1.4 whether to keep automated tiering or fall back to hand-ranking a common subset; record the decision in the research document.
- [x] 1.6 Add corpus tests asserting length four, no duplicates, tier coverage, and a non-empty top tier.
- [x] 1.7 Add the dictionary's author, maintaining institution, edition, and licence to `THIRD_PARTY_NOTICES.md`.

## 2. Board Generation

- [x] 2.1 Build the `(character, offset) -> idiom[]` placement index from the corpus with tests for lookup completeness.
- [x] 2.2 Implement lattice growth from a seed idiom using the existing serializable PRNG, with attachment by a single shared perpendicular cell, and prohibit `Math.random()` in the module.
- [x] 2.3 Implement placement rejection for geometry conflicts, duplicate idioms, undeclared contiguous strings, and the nine-cell bounding box, each with its own test.
- [x] 2.4 Implement bounded attempts, board normalisation to the bounding box, and shortfall recording when the target idiom count is unreachable.
- [x] 2.5 Implement blanking and clue selection driven by the difficulty table.
- [x] 2.6 Implement candidate pool assembly with duplicate characters preserved and difficulty-scaled decoys.

## 3. Solver and Uniqueness

- [x] 3.1 Implement a board solver whose value domain is the candidate pool, counting solutions with an early exit at two.
- [x] 3.2 Implement the uniqueness repair loop: reveal one clue character, re-verify, repeat to a bounded limit, then discard the seed.
- [x] 3.3 Re-verify uniqueness after decoys are added, and reject decoy sets that introduce a second solution.
- [x] 3.4 Add a generation sweep test asserting exactly one solution across a range of seeds for every difficulty level.
- [x] 3.5 Measure whether repair reveals push clue density outside the level's intended band, and tune the repair cap on that evidence.

## 4. Difficulty

- [x] 4.1 Add the five-level difficulty table as data, covering idiom count, crossing count, clue proportion, decoy proportion, and eligible frequency tiers.
- [x] 4.2 Add validation tests asserting monotonic idiom count and clue proportion across levels.
- [x] 4.3 Sample generated boards per level and record observed board size, crossing count, and pool size for tuning.

### Measured results (2026-09-06)

Board statistics over 40 seeds per level against the shipped 5,270-idiom corpus,
independently re-verified outside the suite:

| Level | target idioms | actual avg / min | shortfall | crossings avg | clue ratio avg | pool avg | ms/puzzle |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 4 | 4.0 / 4 | 0/40 | 3.0 | 0.54 | 6.0 | 0.4 |
| 1 | 6 | 6.0 / 6 | 0/40 | 5.0 | 0.42 | 12.9 | 1.1 |
| 2 | 8 | 8.0 / 7 | 1/40 | 7.0 | 0.36 | 19.9 | 2.2 |
| 3 | 10 | 9.8 / 8 | 9/40 | 8.8 | 0.26 | 30.9 | 5.9 |
| 4 | 12 | 11.4 / 8 | 14/40 | 10.4 | 0.20 | 42.3 | 7.4 |

Uniqueness holds on every puzzle (200/200) under an independent solver written
separately from `solve.js`. Clue ratios stay inside their configured bands after
repair, so `repairRevealLimit` is not eroding difficulty. Every maximal string of
two or more contiguous cells is a declared four-cell run (1,564 checked, 0
violations).

**Open: levels 3 and 4 miss their idiom target.** Raising `attemptBudget` from
1,200 to 4,000 and 12,000 does not help (shortfall stays 12-16/40 while time per
puzzle grows to 37 ms), so the limit is geometric rather than a search budget:
the 9x9 cap plus the no-undeclared-string rule bounds how many four-cell runs can
pack in. The floor is never breached and boards stay solvable, so this is a
tuning decision, not a defect. It is the evidence for the board-size open question
in `design.md`: either lower the level-4 target to the achievable 11-12, or raise
the cap and let the board pan. Deferred to the product decision in task 7.3.

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
