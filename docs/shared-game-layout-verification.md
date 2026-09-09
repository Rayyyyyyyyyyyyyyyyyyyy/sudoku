# Shared game layout verification

## Preserved working-tree baseline

Recorded 2026-09-09 before applying
`unify-game-layouts-and-verify-idiom-research`.

- `src/pages/Home.jsx` already owned Sudoku resume discovery, resume navigation,
  confirmation before replacing an active session, and clearing the old session
  only after confirmation. The layout migration must preserve those callbacks and
  paths.
- `src/pages/GameHub.jsx` already sent an active Sudoku session directly to its
  saved route via `gameSessionPath`. The catalog migration must retain that
  behavior and its session copy.
- `src/styles.css` already replaced remote font-family literals with system font
  custom properties and added the Sudoku resume surface. Shared tokens may rename
  these properties and classes, but must retain the offline-safe font stacks and
  resume presentation.
- The other dirty files belong to the concurrent offline, deterministic random,
  engine, and persistence work. This change does not alter their ownership or
  semantics. In particular, `src/main.jsx`, `src/offline/`, `vite.config.js`,
  seeded-random helpers, storage formats, and engine tests are outside the layout
  migration.

## Viewport geometry

Measured 2026-09-09 in Chromium through the in-app browser against the Vite
development server. Coordinates are CSS pixels in `left, top, width, height`
order. The primary element is the catalog grid, landing-page primary card, or
game board/table. The Idiom play route uses the deterministic level-4 seed 1
board, which is the maximum 9×9 case.

A row passes when document scroll width does not exceed client width, the
primary element stays horizontally inside the viewport, every visible
non-grid control is at least 44×44 CSS px, the page has exactly one visible H1,
and normal-flow top-level sections do not geometrically overlap. Screenshots at
320×700 and 360×800 were also inspected for readable hierarchy, clipping, and
reachable actions; vertical document scrolling is expected on longer pages.

| Viewport | Route | client/scroll | Primary bounds L,T,W,H | H1 | Actions | Result |
| --- | --- | ---: | --- | --- | ---: | --- |
| 320×700 | GameHub | 320/320 | 12.8, 164.3, 294.4, 774 | 通勤遊戲櫃 | 3 | PASS |
| 320×700 | Sudoku home | 320/320 | 12.8, 261.5, 294.4, 206 | 數獨刷題 | 12 | PASS |
| 320×700 | Sudoku play | 320/320 | 12.8, 78.3, 294.4, 294.4 | 入門 · SE 1.5 | 13 | PASS |
| 320×700 | Idiom home | 320/320 | 12.8, 432.7, 294.4, 186.5 | 成語填字 | 10 | PASS |
| 320×700 | Idiom play | 320/320 | 4, 78.2, 312, 312 | 專家 · 9 條 | 38 | PASS |
| 320×700 | Poker home | 320/320 | 12.8, 151.5, 294.4, 344 | 通勤牌局 | 4 | PASS |
| 320×700 | Poker play | 320/320 | 12.8, 442.5, 294.4, 612 | 大型回合 | 4 | PASS |
| 360×800 | GameHub | 360/360 | 14.4, 143.5, 331.2, 774 | 通勤遊戲櫃 | 3 | PASS |
| 360×800 | Sudoku home | 360/360 | 14.4, 261.5, 331.2, 206 | 數獨刷題 | 12 | PASS |
| 360×800 | Sudoku play | 360/360 | 14.4, 78.3, 331.2, 331.2 | 入門 · SE 1.5 | 13 | PASS |
| 360×800 | Idiom home | 360/360 | 14.4, 378.7, 331.2, 186.5 | 成語填字 | 10 | PASS |
| 360×800 | Idiom play | 360/360 | 4, 78.3, 352, 352 | 專家 · 9 條 | 38 | PASS |
| 360×800 | Poker home | 360/360 | 14.4, 151.5, 331.2, 344 | 通勤牌局 | 4 | PASS |
| 360×800 | Poker play | 360/360 | 14.4, 442.5, 331.2, 612 | 大型回合 | 4 | PASS |
| 768×1024 | GameHub | 768/768 | 18, 257, 732, 738 | 通勤遊戲櫃 | 3 | PASS |
| 768×1024 | Sudoku home | 768/768 | 54, 310.9, 660, 154.5 | 數獨刷題 | 12 | PASS |
| 768×1024 | Sudoku play | 768/768 | 124, 98.2, 520, 520 | 入門 · SE 1.5 | 13 | PASS |
| 768×1024 | Idiom home | 768/768 | 54, 414.4, 660, 198.5 | 成語填字 | 10 | PASS |
| 768×1024 | Idiom play | 768/768 | 124, 98.2, 520, 520 | 專家 · 9 條 | 38 | PASS |
| 768×1024 | Poker home | 768/768 | 54, 192.2, 660, 278.7 | 通勤牌局 | 4 | PASS |
| 768×1024 | Poker play | 768/768 | 18, 395.5, 732, 480 | 大型回合 | 4 | PASS |
| 1280×800 | GameHub | 1280/1280 | 120, 318.1, 1040, 738 | 通勤遊戲櫃 | 3 | PASS |
| 1280×800 | Sudoku home | 1280/1280 | 310, 359.2, 660, 154.5 | 數獨刷題 | 12 | PASS |
| 1280×800 | Sudoku play | 1280/1280 | 408, 122.5, 464, 464 | 入門 · SE 1.5 | 13 | PASS |
| 1280×800 | Idiom home | 1280/1280 | 310, 472, 660, 198.5 | 成語填字 | 10 | PASS |
| 1280×800 | Idiom play | 1280/1280 | 408, 122.5, 464, 464 | 專家 · 9 條 | 38 | PASS |
| 1280×800 | Poker home | 1280/1280 | 310, 231.2, 660, 286.8 | 通勤牌局 | 4 | PASS |
| 1280×800 | Poker play | 1280/1280 | 150, 438.2, 980, 480 | 大型回合 | 4 | PASS |

The 360×800 maximum Idiom board rendered 352 px wide with a **37.3 px**
smallest non-void cell, above the required 36 px floor. At 320×700 it rendered
312 px wide with 32.9 px cells; that viewport still has no horizontal page
scroll, while the 36 px cell requirement applies specifically at 360 px.

Poker's transient five-card scoring rail was exercised in a fresh local origin
at 320×700. The rail measured `clientWidth=260`, `scrollWidth=364`, and computed
`overflow-x:auto`, while the document remained `clientWidth=320` and
`scrollWidth=320`. This is intentional local rail scrolling, not page overflow.

## Composition decision

No React layout primitive was extracted. The three games share sizing,
spacing, surface, focus, and frame responsibilities, but their headers, primary
actions, progress states, and gameplay DOM carry different semantics and change
reasons. A shared CSS contract keeps those responsibilities consistent without
forcing unlike behavior through a prop-heavy component. The Sudoku and Idiom
setting rows did meet the extraction threshold—identical semantics, DOM, and
change reason—so they share the small `SettingsList` component.
