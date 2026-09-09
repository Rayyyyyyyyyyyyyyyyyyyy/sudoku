## Why

數獨、成語填字與 Poker 目前各自使用不同的首頁與遊戲頁版型；成語填字只局部沿用數獨樣式，Poker 則另有一套寬版結構，造成產品視覺不一致，也讓手機、平板與桌面版的 RWD 行為難以共同維護。這次以數獨現有版型作為產品基準，統一三種遊戲的頁面骨架與響應式規則，同時完成先前尚未結案的成語研究來源驗證。

## What Changes

- 將 App 根容器改為中性的全站 shell，建立三種遊戲共用的首頁資訊層級、區塊樣式、主要操作與頁尾版型，視覺與間距以目前數獨首頁為基準；GameHub 保留自己的寬版遊戲目錄版型。
- 建立共用遊戲頁框架，統一頂部導覽、內容容器、控制區、結果／狀態區與焦點樣式；各遊戲保留自己的棋盤、題池或牌桌呈現。
- 分離一般內容欄、棋盤 stage 與 Poker wide stage 的寬度責任；只有棋盤尺寸可受 viewport 高度限制，一般內容與控制不得沿用棋盤的 `vh` 限制。
- 定義 320px、360px、768px 與 1280px 代表性 viewport 的 RWD 驗收條件，以實際 scroll width 與元素邊界證明沒有頁面水平捲動、內容裁切或操作區重疊，而不是以 `overflow-x: clip` 隱藏問題。
- 將一般互動控制維持至少 44px 可觸尺寸；成語 9×9 密集棋盤在 360px viewport 採至少 36px 格子的明確例外，320px 則允許等比例縮放以避免整頁水平捲動。
- 採用基本無障礙一致性範圍：每個遊戲頁提供正確的 `main` 與主要標題語意、盤外控制至少 44px、數獨選取狀態具非色彩外框與 ARIA 狀態，並保留鍵盤、focus-visible、其他非純色彩提示與 reduced-motion 行為。
- 保留共用 settings store 與儲存格式，但讓數獨與成語首頁只呈現各自相關的設定。
- 重新以第一手來源驗證 `docs/idiom-crossword-research.md` 中標為 snippet 或證據不足的引用，修正無法由來源支持的數字與論述，並完成 `add-idiom-crossword` 的 7.4 任務。

## Capabilities

### New Capabilities

- `shared-game-layout`: 規範數獨、成語填字與 Poker 的共用首頁／遊戲頁骨架、內容寬度策略、響應式行為、觸控尺寸與無障礙相容性。

### Modified Capabilities

- 無。目前 repo 尚無已同步至 `openspec/specs/` 的主規格；既有 active changes 的遊戲需求會作為相容性約束，而不是在本 change 中建立不合法的 modified delta。

## Impact

- 主要影響 `src/App.jsx`、`src/pages/Home.jsx`、`src/pages/Game.jsx`、`src/pages/IdiomHome.jsx`、`src/pages/IdiomGame.jsx`、`src/pages/PokerHome.jsx`、`src/pages/PokerGame.jsx`、必要的共用 UI 元件與 `src/styles.css`；`GameHub.jsx` 只在中性 shell 相容或回歸需要時調整，不改其 catalog-wide 資訊架構。
- 會更新相關 UI 測試、RWD 驗證紀錄，以及 `docs/idiom-crossword-research.md` 與 `openspec/changes/add-idiom-crossword/tasks.md`。
- 不改變路由、遊戲引擎、儲存格式、隨機種子契約或離線能力；不導入 Tailwind 或其他 styling framework，也不增加 production dependency。
