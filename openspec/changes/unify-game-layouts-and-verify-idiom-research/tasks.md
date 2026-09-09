## 1. Establish Shared Layout Contract

- [ ] 1.1 Review the current dirty diff around the six game pages and `src/styles.css`, recording overlapping user changes that must be preserved during migration.
- [ ] 1.2 Rename the App-level `sd-shell` responsibility to a neutral shell and add separate shared tokens/classes for 660px game homes, 520px ordinary play columns, viewport-aware board stages, 980px Poker wide stages, compact gutters, cards, actions, status surfaces, and focus states.
- [ ] 1.3 Compose pages with the shared CSS contract first; extract a thin React primitive only when at least two consumers share the same semantics, DOM structure, and change reason, and otherwise record that no component extraction was warranted.
- [ ] 1.4 Add or update UI tests that assert the shared landing and play structures without coupling tests to cosmetic implementation details.

## 2. Align Game Landing Pages

- [ ] 2.1 Migrate the Sudoku landing page to the neutral shared contract while preserving its current appearance, start/resume behavior, difficulty controls, statistics, settings, and links as the visual baseline.
- [ ] 2.2 Migrate the Idiom Crossword landing page to the same hierarchy and remove compound spacing caused by mixed `sd-*` and `id-*` page-level rules.
- [ ] 2.3 Migrate the Poker landing page from its independent 980px hero system to the shared 660px landing container and common card, section, action, statistics, and footer hierarchy.
- [ ] 2.4 Define explicit Sudoku and Idiom setting key lists so each landing page shows only settings relevant to that game while preserving the current settings store and storage key.
- [ ] 2.5 Preserve GameHub's 1040px catalog layout, migrate it only as needed for the neutral App shell/tokens, and verify its three game cards and responsive grid do not regress.
- [ ] 2.6 Verify by test that each landing page exposes a main landmark, primary heading, existing actions, relevant settings, progress/session information, and accessible labels.

## 3. Align Gameplay Frames

- [ ] 3.1 Migrate the Sudoku gameplay page to the shared topbar, narrow board stage, controls, and status/outcome structure without changing board input or session behavior.
- [ ] 3.2 Migrate the Idiom Crossword gameplay page to the shared narrow frame, constrain breakout to the board stage at compact viewports, and keep prose, candidate pool, status, and controls independent from board-specific viewport-height sizing.
- [ ] 3.3 Migrate the Poker gameplay page to the shared frame with an explicit wide-stage variant, preserving Poker-specific table, modifier, shop, scoring, animation, and focus behavior.
- [ ] 3.4 Remove or narrow superseded `sd-*`, `id-*`, and `pkr-*` page-shell selectors only after confirming they have no remaining consumers.
- [ ] 3.5 Run focused Sudoku, Idiom Crossword, and Poker UI tests and fix any layout-migration regression in routing, start/resume, controls, or outcomes.

## 4. Complete Responsive and Accessibility Behavior

- [ ] 4.1 Implement compact layout rules so landing cards, section content, control rows, dialogs, and status surfaces fit without page-level horizontal scrolling at 320px and 360px widths; remove reliance on `body { overflow-x: clip }` as an overflow fix.
- [ ] 4.2 Ensure all non-grid controls expose at least 44×44 CSS px touch targets and verify the Idiom Crossword 9-column board reaches at least 36×36 CSS px cells at 360px.
- [ ] 4.3 Give every game landing/play route a main landmark and primary heading, preserve visible `:focus-visible`, logical keyboard order, text zoom tolerance and `prefers-reduced-motion`, and add a non-color outline plus ARIA state for Sudoku cell selection.
- [ ] 4.4 Inspect GameHub and all six game pages in a real browser at 320×700, 360×800, 768×1024, and 1280×800; record document scroll/client widths, primary element bounds, and pass/fail evidence for clipping, overlap, readable hierarchy, and reachable actions, distinguishing intended local Poker rail scrolling from page overflow.
- [ ] 4.5 Update the Poker source-level UI test so it no longer treats `overflow-x: clip` as proof of no page overflow, retaining only assertions that establish durable structural or accessibility contracts.
- [ ] 4.6 Add regression tests for any responsive or accessibility defect found during the viewport matrix inspection when the behavior can be asserted outside a layout engine.

## 5. Verify Idiom Research Sources

- [ ] 5.1 Replace snippet-only App Store and Google Play evidence with direct product-page citations for the criss-cross grid, candidate characters, progressive difficulty, and hint behavior actually stated by those pages.
- [ ] 5.2 Verify the Ministry of Education licensing statement against its official authorization page and record the source URL, access date, supported license terms, and published data version without adding unstated permissions.
- [ ] 5.3 Replace the unsupported exact 28,508-entry claim with the National Academy for Educational Research wording supported by its official FAQ: 5,000+ main entries, 20,000+ appendix entries, and more than 25,000 total.
- [ ] 5.4 Remove or downgrade the unsupported claim that Chinese crosswords are mostly idioms or slang, while retaining only grid-structure claims directly supported by the cited page and noting source limitations.
- [ ] 5.5 Rewrite the complexity section so fixed-grid no-reuse filling is described as NP-hard under strict restrictions, and cite primary papers separately for the CSP and backtracking formulation.
- [ ] 5.6 Verify Handle behavior from its repository source, retaining the supported four-character, ten-try, and exact/misplaced/none result semantics without asserting unverified theme color names.
- [ ] 5.7 Review every remaining `snippet` marker in `docs/idiom-crossword-research.md`, either promote it with direct evidence or mark/remove the unsupported statement, then mark `add-idiom-crossword` task 7.4 complete.

## 6. Final Verification

- [ ] 6.1 Run the full automated test suite and production build, documenting any pre-existing failure separately from failures introduced by this change.
- [ ] 6.2 Confirm saved sessions for all three games resume correctly and that seeded randomness, persistence, routing, and offline registration files have no unintended semantic diff.
- [ ] 6.3 Run OpenSpec validation for `unify-game-layouts-and-verify-idiom-research` and confirm all artifacts and implemented requirements are consistent.
- [ ] 6.4 Review the final git diff for accidental overlap with unrelated user changes and summarize the UI, RWD, accessibility, and research evidence delivered by the change.
