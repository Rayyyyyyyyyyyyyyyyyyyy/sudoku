## Context

The repository is a client-only React 18 and Vite SPA with three existing pillars: a deterministic seeded Sudoku with unique-solution verification, a poker roguelike with a serializable PRNG and save-after-action persistence, and a shared game hub. The idiom crossword sits between them: it is a deductive, no-timer, board-is-the-state puzzle like Sudoku, but its difficulty comes from a content corpus rather than from numeric constraints.

Research is recorded in `docs/idiom-crossword-research.md`. Two findings drive this design.

First, "成語填字" names three unrelated games in the market: a crossing lattice, a single-idiom cloze, and a Wordle variant. This change implements the lattice only. The cloze form lacks deductive depth; the Wordle form's entire cost sits in per-character phonetic data and polyphone correctness, which is an ongoing maintenance burden rather than a one-time build.

Second, Traditional Chinese idioms are uniformly four characters. General crossword construction is NP-complete because variable-length words must be fitted into a pre-designed black-and-white grid. Fixed length removes that: the board can be grown from words instead of words fitted into a board, the candidate index is small enough to hold in memory, and backtracking depth equals the number of idioms rather than the number of cells.

The corpus is the Ministry of Education *Idioms Dictionary*, licensed CC BY-ND 3.0 Taiwan. Per the Ministry's own interpretation, recorded in the g0v moedict data repository, the no-derivatives restriction applies to the text itself and does not restrict format conversion or downstream application. That permits shipping the idiom list as generated source data but forbids rewriting any definition text that is displayed.

## Goals / Non-Goals

**Goals:**

- Generate boards deterministically from a seed, so a daily puzzle and a shared link both reproduce exactly.
- Guarantee every shipped puzzle has exactly one solution given its candidate pool.
- Keep the whole board state serializable and save it after every committed move, so a puzzle survives a locked screen and a reclaimed tab.
- Fill cells without an input method editor and without drag, so the game is playable one-handed on a moving vehicle.
- Keep corpus data, difficulty tuning, and engine control flow in separate modules.
- Preserve the existing Sudoku and poker routes, keys, and records unchanged.

**Non-Goals:**

- Phonetic hints, pinyin or zhuyin data, and polyphone handling. Deferred with the Wordle mode.
- Free-text answer entry, clue lists in the style of a newspaper crossword, and variable-length words.
- Accounts, leaderboards, cloud sync, and any backend service.
- Shipping full definition text in the initial bundle.
- Rewriting, abridging, or paraphrasing dictionary text anywhere in the application.

## Decisions

### 1. Grow the lattice from words rather than fill a designed grid

Board construction picks a seed idiom, places it horizontally, and then repeatedly attaches a perpendicular idiom that shares one character with an already-placed run. Each attachment chooses a placed run, a cell within it, and an offset 0–3 naming which position of the new idiom lands on that cell. Candidates come from an index `(character, offset) -> idiom[]` built once from the corpus. Failed attachments backtrack.

This is preferred to the classical approach of designing a symmetric grid pattern and then solving a CSP to fill it. With fixed length four, the grid pattern carries no information the word placement does not already determine, and English black-square symmetry conventions come from newspaper typesetting rather than from anything about the puzzle. The generated board is normalized to the bounding box of its placed cells at the end.

Rejected alternative: precomputing a library of hand-designed lattice shapes. It would bound generation time but would make difficulty tuning discrete and would need a shape set per board size.

### 2. Forbid undeclared character strings

Every maximal string of two or more contiguous cells must be exactly one declared four-cell run. Two same-orientation cells may sit adjacent only when both belong to the same perpendicular declared run — which is what a crossing already is. Without this, the board shows the player vertical character pairs that look like fragments of answers but were never declared, and the solver would have to reason about strings the design never defined.

An earlier draft of this design stated the rule as "parallel runs must be separated by an empty cell". That is too strong and was corrected against the implementation: it would reject a legal and desirable board where one vertical idiom crosses three horizontal idioms placed in consecutive rows, since those horizontal runs then overlap in the crossing column. The declared-run formulation above is the rule that is actually enforced and tested.

This is also why English crossword practice does not transfer. There, every adjacent letter pair must itself form a valid word; here there is no Chinese equivalent of a complete two-character word list whose absence can be checked reliably, so the rule is stated over declared runs instead.

### 3. Verify uniqueness by solving, and fix it by revealing

After blanking cells and assembling the candidate pool, the generator runs a solver over the board whose value domain is the pool, counting solutions with an early exit at two. If more than one solution exists, the generator reveals one additional clue character and re-verifies, repeating until the solution is unique.

This mirrors the approach already proven in `src/lib/sudoku.js` and makes uniqueness a property of the shipped puzzle rather than a claim about the generator. Revealing rather than regenerating keeps the board shape stable across the verification loop, so difficulty parameters stay meaningful.

Rejected alternative: proving uniqueness structurally from crossing density. Crossing density does not imply uniqueness once the pool contains repeated characters, which it routinely does.

### 4. Fill by tapping a cell then tapping a pooled character

The candidate pool sits below the board and holds one entry per blanked cell, including duplicates, plus difficulty-dependent decoys. The player taps a blank cell, then taps a character.

Free text entry was rejected outright: Chinese has no 26-key alphabet, so entry requires an IME, which on a phone is a full-screen modal that covers the board and reveals nothing about difficulty. Drag-and-drop was rejected because a moving vehicle makes precise drags unreliable, and because a drag has no keyboard equivalent.

The pool also makes difficulty legible. A pool with no decoys is a pure assignment problem; adding decoys forces the player to reason about which characters cannot belong.

### 5. Store the board, not only the seed

The persisted snapshot holds the generated board, the pool, the player's fills, the elapsed timer origin, and the assistance counters, under a schema version, following `src/lib/poker/persistence.js`. It does not store only the seed.

Regenerating from a seed would require the generation algorithm to stay bit-identical forever, since any change to placement order or the corpus would silently produce a different board for a save in progress. Storing the board makes corpus updates and generator improvements safe for players mid-puzzle.

### 6. Ship the idiom list, defer the definitions

`src/data/idioms.js` is generated at build time by a script under `scripts/`, following the `import-puzzle-bank.mjs` pattern, and contains idiom surface forms plus a frequency tier. Definitions are excluded from that module.

The list is roughly 20,500 characters, about 60 KB before compression, which is comparable to the existing puzzle bank. Full definitions are orders of magnitude larger and would dominate the offline bundle for a feature that is optional during play. The gameplay UI reserves the place where a definition appears; the data behind it is a later change.

### 7. Frequency tiers rank the Traditional corpus, never extend it

Frequency data comes from a Simplified Chinese lexicon, while the corpus is Traditional. Simplified-to-Traditional mapping is not one-to-one, so a naive conversion can manufacture idioms that do not exist.

The build script therefore uses frequency only to order entries that already exist in the dictionary corpus. Entries that fail to align are assigned the lowest tier rather than dropped, and no entry is ever added from the frequency list. The script reports its alignment rate so the fallback of hand-ranking a common subset can be triggered on evidence.

## Risks / Trade-offs

- **Generation may fail to reach the target idiom count for a given seed.** Mitigation: bound the attempt count, and on exhaustion accept a smaller board rather than looping, recording the shortfall so difficulty tuning can see it.
- **Uniqueness repair can erode difficulty.** Revealing clue characters until the solution is unique can push a level-4 board toward level-2 clue density. Mitigation: cap the number of repair reveals, and discard the seed and try the next one when the cap is hit.
- **Corpus quality is the real difficulty knob.** A board built from correctly-tiered rare idioms is unsolvable regardless of geometry. Mitigation: treat the alignment rate as a task-1 deliverable and gate later tasks on it.
- **The dictionary licence constrains presentation, not just data.** Any UI that abridges a definition to fit a phone screen would be a derivative. Mitigation: definitions render verbatim in a scrollable container, and the constraint is stated in the spec rather than left to reviewer memory.
- **Research citations are unevenly verified.** The session that produced `docs/idiom-crossword-research.md` could only reach GitHub, so several claims rest on search summaries. Those are graded `snippet` in that document. None of the decisions above depend solely on one; the licence finding was read directly.

## Migration Plan

Additive. New modules under `src/lib/idiom/`, new generated data, new routes, and new localStorage keys. The hub gains a third card. No existing key, route, record, or setting changes, so a player who never opens the new game sees no behavioural difference and a downgrade leaves the new keys as inert orphans.

## Resolved Questions

**The daily puzzle uses a fixed difficulty (level 2).** Rotating by weekday would make
the streak unfair — a player who misses the one easy day loses a streak built on
harder days — and would make today's time incomparable to yesterday's. The Sudoku
daily already works this way.

**Assisted completions appear only as an aggregate counter,** not interleaved into
the per-level list. They count toward the completion total and the streak, but never
set a best time. Mixing a revealed run into the same list as an honest one makes the
best-time column meaningless.

**The 9×9 cap stays; the level 3 and 4 idiom targets came down instead** (10→9 and
12→10). The cap is not arbitrary: at 360 CSS px a 9-wide board leaves 36 px per cell,
which is already the accessibility floor, so raising it means panning, and a board
that has to be panned defeats one-handed use on a moving vehicle — the whole point of
the game. Measured shortfall against the shipped corpus fell from 25/60 and 42/60 to
8/120 (6.7%) and 6/120 (5.0%), with the configured floors never breached and the
smallest observed board at 8 runs for both levels. Level 3 and 4 now differ mainly by
clue ratio, decoy ratio and frequency tier rather than by one extra idiom, which is
the more meaningful difficulty axis anyway.

## Open Questions

None outstanding for this change. Definition text remains deferred by decision 6; the
UI reserves its place and says so.
