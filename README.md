# 通勤遊戲櫃

原本是一份 6.1 MB 的單檔 artifact bundle(base64 + gzip 塞在 `<script type="__bundler/manifest">` 裡),
現在改寫成 Vite + React、具離線快取的 SPA。既有數獨玩法、鍵盤操作與 localStorage 格式維持不變，
並新增一套以有限牌庫、牌型計分、效果順序與回合經濟為核心的原創「通勤牌局」。

## 開發

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 產出 dist/
npm run preview  # 預覽 production build
npm test         # 全部 engine、資料、持久化與 UI 回歸測試
```

## 離線使用

production build 會產生同源的 `service-worker.js`。第一次以網路成功開啟部署完成的網站後，
service worker 會預先快取該版本的 HTML、JavaScript、CSS、題庫與本機靜態資產；安裝完成後，
重新開啟已完成快取的網址即可離線遊玩。開發伺服器不會註冊 service worker。

離線能力以「至少成功載入並安裝過一次」為前提，從未開啟過的部署網址無法在離線時首次安裝。
部署服務必須以 HTTPS（localhost 除外）提供網站，且不能阻擋 `service-worker.js` 或 precache
清單內的檔案。新版 service worker 保留當前及上一份建置，啟用時只清除本應用程式更早的 Cache Storage，
不會清除現行遊戲的 localStorage 進度或同源其他應用程式的 cache。應用程式升級後會移除已下架遊戲的舊本機進度；數獨與牌局紀錄保留。

## 路由

| 路徑 | 說明 |
| --- | --- |
| `/#/` | 共用遊戲櫃，顯示兩款遊戲 |
| `/#/sudoku` | 數獨首頁：每日一題、六種難度、極限挑戰、解題徽章與個人紀錄 |
| `/#/play/:level?seed=…` | 指定難度的題目(`level` 為 0–5,seed 決定盤面) |
| `/#/daily` | 每日一題(困難難度,seed 取當天日期,同一天永遠同一題) |
| `/#/poker` | 通勤牌局首頁、新局/續玩、效果牌圖鑑、規則與紀錄 |
| `/#/poker/play` | 目前牌局、回合、計分、商店與選擇包 |

不認得的路徑會導回 `/`。路由放在 URL hash 中，部署到一般靜態主機不需要額外 rewrite；
手機回收分頁後重新載入，也不會把遊戲路徑當成伺服器檔案而回傳 404。

## 結構

```
src/
  data/puzzles.js   1,000 題離線題庫,保留 Sukaku Explainer 原始評分
  data/sudokuChallengePuzzles.js  21 題 SE 9.2–9.3 的獨立極限題組
  lib/sudoku.js     依 seed 選題 + 最少候選數優先求解與唯一解驗證
  lib/stats.js      localStorage 紀錄(key: sudoku-drill-v1),最佳時間 / 連續天數
  lib/settings.js   玩法設定(key: sudoku-drill-settings-v1)
  lib/gameSession.js 未完成題目(key: sudoku-drill-active-game-v2)
  lib/useGame.js    一局遊戲的 reducer:填數、註記、清除、完成判定、計時、鍵盤
  pages/Home.jsx    首頁
  pages/Game.jsx    遊戲畫面
  components/       Board(9×9 盤面)、NumberPad(數字鍵)
  data/poker/compatibility.js  versioned rules/opponents/modifiers/packs/special rules/fixtures
  lib/poker/random.js          可序列化 xorshift32 PRNG 與 shuffle
  lib/poker/cards.js           52 張牌與 draw/hand/played/discarded zones
  lib/poker/evaluate.js        1–5 張牌型判定與 contributing cards
  lib/poker/effects.js         ordered typed scoring operations、handler registry 與 trace
  lib/poker/economy.js         reward、interest、shop、reroll 與 pack choices
  lib/poker/run.js             明示 phase 的 immutable run reducer
  lib/poker/persistence.js     snapshot migration、獨立牌局紀錄與 exactly-once guards
  pages/GameHub.jsx            共用遊戲入口
  pages/PokerHome.jsx          牌局入口、resume/recovery/records/rules
  pages/PokerGame.jsx          portrait-first 牌桌、商店、pack 與 inspect UI
```

題目來自 public-domain 的
[Sudoku Exchange Puzzle Bank](https://github.com/grantm/sudoku-exchange-puzzle-bank)：
由 QQWing 產生並確認唯一解，再由 Sukaku Explainer 依實際解題技巧評分。應用程式收錄
原五級各 200 題，另加入固定來源中全部 21 題 SE 9.2–9.3 的極限題，總計 1,021 題；授權與來源見
[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)。

## 跟原版的差異

- 加了網址路由,可以直接分享 / 收藏某個難度,瀏覽器上一頁也能用。
- 原本寫死在 artifact 編輯器裡的三個參數(標示錯誤、highlight 同列同行同宮、自動清註記)
  變成首頁的「玩法設定」,存在 localStorage。
- 盤面狀態改用 reducer,不再從 closure 讀舊的 `values`,連續快速輸入不會掉格。
- 字體改用作業系統內建字型堆疊，不需要下載遠端字型（原版把 woff2 全部 inline 成 base64，
  佔了那 6 MB 的大半）。

`sudoku-drill-v1` 這個 localStorage key 沒有變,舊的紀錄會直接沿用。
未完成題目的 seed、輸入、註記和計時起點也會保存，完整重載後可接著作答。

## 數獨挑戰與過關回報

「極限」為新增的 level 5，保留來源的 SE 9.2–9.3 評級；原「專家」題組實際為
SE 6.7–9.1。新題組的每一題都高於原題組最高評級，但 SE 是解題技巧評級，不能保證每位玩家的主觀難度。
固定來源只提供 21 題符合此門檻的題目，不以變形或重複題湊數。
可用 `node scripts/import-sudoku-challenges.mjs <diabolical.txt 路徑>` 重建新增資料；
腳本校驗固定來源雜湊、唯一解及重複題，且不重寫原五級題庫。

數獨存檔只以 level 與 seed 重建盤面，因此原五級的題庫順序和選題算法必須保留。
新難度只可附加，不能插入既有級別中間；若要修改既有題庫，須另行處理進行中的存檔相容性。

每個難度累計完成 1／5／20 題，分別取得初勝／熟練／精通徽章。
徽章直接由既有 `stats.count` 衍生，不另存一份獎勵狀態；舊紀錄自動計入，清除紀錄也會清除這些成果。
此處計的是完成次數，不是不同題目數。過關畫面比較記錄前後的成績，顯示新增徽章、個人最佳突破、
下枚徽章進度與更高難度入口；首頁可回看收藏。完成紀錄仍由遊戲 hook 寫入，展示元件不負責授獎或保存。

## 跨局收藏

遊戲櫃顯示兩款遊戲各自的累積進度；收藏仍由各款遊戲保存，共用首頁只讀取，不建立另一份進度。

| 遊戲 | 收錄時機 | 保存位置與相容性 |
| --- | --- | --- |
| 通勤牌局 | 真正取得效果牌時收錄，出售、落敗與新局仍保留 | 既有 records 的 `discoveredModifierIds`；舊局恢復時補收目前持有的效果牌 |

收藏冊讓玩家回看已發現的內容，並提示下一個數量目標；牌局的收藏不授予下一局額外戰力。
兩款遊戲的進度各自保存，不共用貨幣，也不改動既有新局規則。
收藏隨原本的本機紀錄保存，不另設帳號或雲端資料。

## 通勤牌局規則基線

- Compatibility data ID：`dave-win-1.0.3.1551-jimbo-v1`；這只是開發用 provenance，玩家介面使用中性原創名稱。
- 主要流程是 3 stages × 3 rounds（共 9 回合）；另外五組 1 stage × 3 rounds 的資料只作獨立相容性 fixture。
- 基準手牌 8、每回合 4 次出牌與 4 次棄牌、標準 52 張有限牌庫、最多 6 張效果牌。
- 首次 shop reroll 為已驗證的 1 幣；後續暫採可替換的 `linear-plus-one`（1、2、3…）deterministic provisional escalation。
- Shop/pack 未有可靠精確權重，暫採 catalog 具名的 uniform deterministic provisional distributions；不宣稱為 reference-verified。
- Snapshot schema version 為 `1`，同時保存 rules version 與完整 PRNG state。規則不相容時保留 records、停止載入 active run，必須由玩家明示清除。

更完整的 verified/inferred/unknown 分類見
[`docs/poker-compatibility-matrix.md`](./docs/poker-compatibility-matrix.md)，研究來源見
[`docs/poker-compatibility-research.md`](./docs/poker-compatibility-research.md)。

## 牌局操作與恢復

- 點選 1–5 張牌切換選取；原生 button 同時提供觸控、鍵盤與 focus 操作。
- 遊玩時逐張發牌與補牌，選牌向上抬起、棄牌離場；出牌後牌面與效果牌依計分順序亮起，籌碼與倍率逐步累加，最後顯示得分與目標進度。
- 計分動畫約 1.1–1.8 秒，最後結果保留 450ms 後自動繼續，可按「略過動畫」；完整 trace 仍可展開查看，偏好減少動態效果時直接顯示結果。
- 補給後進入下一回合與整局結束時會顯示約 1.2 秒的全畫面過場，可按「略過過場」立即繼續；偏好減少動態效果時不播放。
- 效果牌依左至右順序觸發；展開任一張即可閱讀效果、目前 counter，並用 44px 以上的左移/右移按鈕排序。
- 商店可購買、刷新、出售與打開選擇包；包內也能查看、排序及出售現有效果牌，滿六張時可先出售再換牌。雙選包中出售已選牌不會退還選取次數；purchase、choice、sell 與 reroll 均有 transaction guard。
- 每個 committed reducer transition 都會嘗試保存到 `sudoku-drill-poker-active-v1`；牌局紀錄另存於 `sudoku-drill-poker-records-v1`。建立新局保存失敗時留在首頁，保留舊局並提供重試。
- 遊玩中保存失敗仍可操作，畫面提示「尚未保存」並提供重試；下一次操作也會再次嘗試。重試會保存最新進度與尚未收錄的收藏，完成紀錄成功寫入後才標記完成。尚未保存的內容只保留在目前牌桌，離開、關閉或重新載入仍可能失去這些內容；已結束但紀錄待保存的牌局可由首頁或遊戲櫃返回補存。
- 專案尚未上線，不保留損壞的歷史紀錄。紀錄 JSON 無法解析時視為空白，下一次正常保存會重建，目前牌局與數獨資料不會被清除；儲存空間暫時無法存取時仍保留原資料並重試。
- 介面在 360 CSS px 使用四欄、兩排手牌，沒有橫向 page scroll；選取與計分狀態不只靠顏色，並支援 `prefers-reduced-motion`。

## 資產與相容性聲明

牌局沒有匯入第三方遊戲角色、卡圖、logo、音訊、字體、UI skin 或 source code。撲克牌只用標準
Unicode rank/suit 與 repository-owned CSS；效果牌使用文字與幾何標記。玩家文案不使用研究對象的品牌化名稱。
研究文件內的名稱與連結只用於 provenance，不會進入 player-facing catalog copy。
