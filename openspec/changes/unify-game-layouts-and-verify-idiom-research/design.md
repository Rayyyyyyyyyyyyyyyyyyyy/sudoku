## Context

目前三種遊戲的畫面不是單純換主題，而是三套不同的版型契約。數獨首頁以約 660px 的置中欄位、固定資訊層級與卡片／清單構成；成語填字局部沿用 `sd-*` 樣式，但又疊加自己的標題間距與全 breakpoint 負 margin 棋盤；Poker 則使用約 980px 的獨立首頁、巨型 hero、獨立統計與按鈕系統。這些差異使同一產品在導覽、節奏與手機操作上缺乏一致性，也讓任何 RWD 修正需要重複維護。

此變更會碰觸六個頁面與全域 CSS，且目前 worktree 同時含有離線能力等未完成修改。實作必須以小步遷移方式保留使用者現有變更，並把版型責任與遊戲引擎、session、隨機性、資料來源分離。

既有 active changes 已定義成語填字和 Poker 的觸控、鍵盤、focus、狀態與動畫約束。本 change 不覆寫那些行為；它只新增跨遊戲版型契約。研究文件工作則將較早因網路限制留下的 snippet 證據，更新為目前可直接檢查的第一手來源。

## Goals / Non-Goals

**Goals:**

- 以數獨現有視覺節奏為基準，讓三種遊戲首頁具有相同的品牌列、主要卡片、次要區段、統計／設定與頁尾結構。
- 讓三種遊戲頁共用頂部導覽、主內容欄、控制區與結果／狀態區的版型規則。
- 將一般內容欄、棋盤 stage 與 Poker wide stage 分成獨立的尺寸責任，避免一般內容被棋盤的 viewport-height 限制壓窄。
- 讓 320px 至寬桌面 viewport 都沒有頁面級水平捲動或控制區互相遮擋。
- 保留棋盤與牌桌所需的不同內容寬度，並建立一致的頁面語意、44px 盤外觸控尺寸與數獨非色彩選取提示。
- 用第一手來源修正成語研究文件，關閉舊 change 的最後一項研究任務。

**Non-Goals:**

- 不重新設計遊戲規則、難度、題庫、計分、商店、存檔或隨機種子。
- 不要求 Poker 牌桌在桌面上縮成數獨棋盤的 520px 寬度。
- 不把 GameHub 的遊戲目錄壓成 660px 遊戲首頁；它保留 catalog-wide 版型。
- 不以單一大型 React 元件承載三種遊戲的 domain-specific UI。
- 不要求一定產生共用 React layout 元件；只有實際重複的語意與 DOM 結構才抽取。
- 不引入新的 production UI framework，也不在此 change 內重做品牌視覺或圖像資產。
- 不導入 Tailwind；未來若要遷移 styling architecture，應另開 change 處理混用期與完整遷移策略。
- 不宣稱研究來源能支持其實未明示的精確數字、顏色名稱或市場慣例。

## Decisions

### 1. 共用結構契約，而非共用遊戲內容

先建立語意化的 CSS class 契約，例如首頁容器／頁首／主卡片／section，以及遊戲頁 topbar／stage／controls／status。數獨、成語填字與 Poker 將相同層級資料放入相同結構，但棋盤、字池與牌桌仍由各自頁面和元件擁有。

React 元件遵循 Reuse → Compose → Extract → Abstract：允許少量相同 wrapper JSX 暫時重複；只有至少兩個 consumer 具有相同語意、DOM 結構與變更原因時，才抽出如 `GameTopBar` 的薄元件。選擇這個方式是因為真正需要一致的是資訊層級、寬度、間距與操作位置，不是遊戲狀態模型。替代方案是先造出高度參數化的萬用 layout 元件，但那會讓 Poker 的複雜區塊反向污染數獨和成語頁面。

### 2. 從數獨外觀抽出中性 token 與 class

數獨目前的 660px 首頁欄位、520px 遊戲內容寬度、圓角卡片、按鈕層級與垂直節奏作為視覺 reference。實作時把 App 的 `.sd-shell`、可共享值與結構抽成中性 CSS custom properties 及 `game-*` class；`sd-*` 只保留數獨專屬樣式，避免讓其他遊戲永久依賴錯誤的 domain 名稱。GameHub 只改用中性全站 token，仍由 `hub-*` 擁有自己的 1040px catalog layout。

替代方案是直接讓成語與 Poker 大量套用 `sd-*` class。這雖然改動較小，但會延續目前「部分共用、部分覆蓋」造成的 compound spacing 與 selector 耦合。

### 3. 首頁、一般內容與 stage 採不同尺寸責任

三個遊戲首頁都使用相同的 660px 內容欄與 gutter。遊戲頁外殼一致，但尺寸 class 不共用同一條 width 公式：

- `game-home`：最高約 660px，只依 inline viewport 縮放。
- `game-column`：一般遊戲資訊、topbar 與控制，最高約 520px，只依 inline viewport 縮放。
- `game-stage--board`：數獨與成語棋盤，最高約 520px，只有這一層可同時參考 viewport block size 以維持完整方形盤面。
- `game-stage--wide`：Poker 牌桌可在桌面擴展至約 980px，但 topbar、section 樣式、按鈕與狀態呈現仍遵守共用契約。

成語填字只有在小螢幕且盤面需要時才能讓 `game-stage--board` 使用受控 breakout；負 margin 不再無條件套用於整個遊戲頁或所有 breakpoint。文字、候選字與控制不得繼承棋盤的 `vh` 限制。這比把所有遊戲鎖在同一 max-width 或繼續用單一 `.sd-width` 更能兼顧一致性與資訊密度。

### 4. 以內容約束定義 RWD，並明確處理密集棋盤例外

共用 gutter 使用可縮放 token；主要卡片與 CTA 在 compact viewport 佔滿可用寬度，桌面保持合理行長。驗收 viewport 為 320×700、360×800、768×1024、1280×800，至少涵蓋最窄支援寬度、主要手機、平板和桌面。

一般按鈕、連結式控制與輸入控制的觸控區 MUST 至少 44×44 CSS px。成語 9×9 盤面不可能在 360px 內同時滿足每格 44px 與無水平捲動，因此它被定義為密集網格例外：360px viewport 每格至少 36px；320px viewport 可再等比例縮小，但不得造成整頁水平捲動。鍵盤焦點與文字／圖形狀態補充其較小點擊尺寸。

`body { overflow-x: clip }` 不得作為 RWD 正確性的證據。實作應先消除非預期溢位，再以 `document.documentElement.scrollWidth <= document.documentElement.clientWidth`、主要元素 bounding rect 未超出 viewport，以及沒有裁切／重疊來驗收。只有明確設計的區域（例如 Poker card rail）可以保留局部水平捲動。

### 5. 採用基本一致的頁面語意與選取提示

每個遊戲 landing／play route 使用 `main` landmark 與可辨識的主要標題。既有 focus、鍵盤與 reduced-motion 契約不得退化；所有盤外互動控制至少 44×44 CSS px。數獨棋盤的選取狀態除了既有背景色，增加可見外框與 `aria-selected`（或語意等價狀態），但本 change 不擴張成完整的全站 accessibility audit。

這個中間範圍能讓三種版型達到一致的基本操作品質，又不把 RWD 工作擴張成對所有 contrast、screen-reader 文案與互動模式的全面重做。

### 6. 版型遷移不得改變 domain 與 session 邊界

頁面重構只搬移 JSX 結構與 class，既有 hook、事件 callback、路由、local storage/session、seeded random、遊戲 reducer 與離線註冊邏輯維持原本所有權。測試需證明核心流程仍可開始、續玩、操作與完成。

替代方案是趁機整理遊戲狀態，但這會擴大回歸面，也會與目前其他 active changes 互相干擾。

### 7. 共用設定儲存，各遊戲自行選擇顯示項目

`useSettings` 與既有 localStorage key 維持為唯一設定 owner，不新增 Context、store 或 persistence migration。數獨首頁只列出 `showErrors`、`highlightPeers`、`autoCleanNotes`；成語首頁只列出 `idiomShowErrors`；Poker 目前不顯示設定。顯示清單使用明確的 domain key 集合，避免數獨頁面因遍歷整個 `SETTING_LABELS` 而顯示成語設定。

### 8. 研究引用只保留來源能直接支持的敘述

`docs/idiom-crossword-research.md` 將優先引用官方或原始資料：教育部授權頁、國家教育研究院 FAQ、App Store／Google Play 產品頁、原始論文與開源專案原始碼。具體修正原則如下：

- 教育部資料只描述官方頁面明示的授權條件與版本，不推論未明示權利。
- 詞條規模使用官方可支持的「正文 5,000 餘、附錄 20,000 餘、總計 25,000 餘」，不保留無直接證據的精確 28,508。
- 中文填字的版面規則可引用現有頁面，但未被來源支持的「多以成語／俗語為主」市場概括需移除或降級。
- 複雜度敘述改成「固定格局、不可重複用詞的填字問題即使在嚴格限制下仍為 NP-hard」，並將 CSP／backtracking 描述分別綁定到能直接支持的論文。
- Handle 只記錄程式碼可驗證的四字、十次機會與 exact／misplaced／none 類型，不在未確認 theme token 前斷言確切色名。

每個已驗證項目要記錄 URL、存取日期、來源層級與它實際支持的句子。完成後再勾選 `add-idiom-crossword` task 7.4。

## Risks / Trade-offs

- [全域 CSS 遷移可能改到未預期頁面] → 先建立中性 token／結構 class，再逐頁遷移；每一階段執行 UI 測試與代表性 viewport 檢查。
- [目前 worktree 有其他未提交變更] → 實作前比對現有 diff，避免整檔覆寫，僅以小型 patch 修改相關區段。
- [Poker 內容較寬，視覺不會與數獨完全相同] → 對齊外殼、層級與元件語言，保留明確的 `wide` stage 變體。
- [320px 的 9×9 棋盤格低於一般觸控尺寸] → 將密集網格列為明確例外，維持鍵盤支援、選取狀態與非純色彩提示，且所有盤外控制仍保持 44px。
- [jsdom 無法證明真實 CSS 幾何] → 自動測試負責結構與互動回歸，另以實際 browser viewport 矩陣記錄 scroll width、主要元素 bounding rect、裁切與重疊結果；不得用 `overflow-x: clip` 的存在代替證據。
- [過早抽取共用元件會製造 variant 複雜度] → 先完成中性 CSS contract 與頁面 composition；沒有兩個語意一致的 consumer 就不建立 React abstraction。
- [外部來源內容未來可能更新] → 文件記錄存取日期與可直接支持的最小敘述，不把搜尋摘要當證據。

## Migration Plan

1. 建立共用 layout token 與結構 class，將 App shell 中性化；只有出現實際語意重複時才建立薄元件，不移動任何遊戲狀態。
2. 先把數獨映射到新契約並做基準回歸，再依序遷移成語填字與 Poker 首頁。
3. 遷移三個遊戲頁外殼，加入 board／wide stage 變體並移除已無使用者的重複 selector。
4. 分離各遊戲設定顯示清單，逐一驗證互動測試、production build、基本無障礙狀態與四個 viewport 的實際幾何。
5. 更新研究文件與舊 task 狀態，執行 OpenSpec 驗證。

若需回復，可逐頁恢復舊 class mapping；共用 token 和薄元件在沒有 consumer 時可獨立移除，不涉及資料 migration。

## Open Questions

- 無阻擋實作的問題。精確 spacing/token 名稱可在以數獨畫面做 browser 對照時微調，但不得改變本規格的寬度、觸控與無障礙條件。
