# 通勤遊戲櫃

原本是一份 6.1 MB 的單檔 artifact bundle(base64 + gzip 塞在 `<script type="__bundler/manifest">` 裡),
現在改寫成 Vite + React 的離線 SPA。既有數獨玩法、鍵盤操作與 localStorage 格式維持不變，
並新增一套以有限牌庫、牌型計分、效果順序與回合經濟為核心的原創「通勤牌局」。

## 開發

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 產出 dist/
npm run preview  # 預覽 production build
npm test         # 全部 Node engine、資料、持久化與回歸測試
```

## 路由

| 路徑 | 說明 |
| --- | --- |
| `/#/` | 共用遊戲櫃，顯示兩款遊戲與可恢復進度 |
| `/#/sudoku` | 數獨首頁：每日一題、五種難度、個人紀錄、玩法設定 |
| `/#/play/:level?seed=…` | 指定難度的題目(`level` 為 0–4,seed 決定盤面) |
| `/#/daily` | 每日一題(困難難度,seed 取當天日期,同一天永遠同一題) |
| `/#/poker` | 通勤牌局首頁、新局/續玩、規則與紀錄 |
| `/#/poker/play` | 目前牌局、回合、計分、商店與選擇包 |

不認得的路徑會導回 `/`。路由放在 URL hash 中，部署到一般靜態主機不需要額外 rewrite；
手機回收分頁後重新載入，也不會把遊戲路徑當成伺服器檔案而回傳 404。

## 結構

```
src/
  data/puzzles.js   1,000 題離線題庫,保留 Sukaku Explainer 原始評分
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
五級各 200 題，且刻意略過最基礎的 SE 1.2 題目；授權與來源見
[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)。

## 跟原版的差異

- 加了網址路由,可以直接分享 / 收藏某個難度,瀏覽器上一頁也能用。
- 原本寫死在 artifact 編輯器裡的三個參數(標示錯誤、highlight 同列同行同宮、自動清註記)
  變成首頁的「玩法設定」,存在 localStorage。
- 盤面狀態改用 reducer,不再從 closure 讀舊的 `values`,連續快速輸入不會掉格。
- 字體改用 Google Fonts 連結(原版把 woff2 全部 inline 成 base64,佔了那 6 MB 的大半)。

`sudoku-drill-v1` 這個 localStorage key 沒有變,舊的紀錄會直接沿用。
未完成題目的 seed、輸入、註記和計時起點也會保存，完整重載後可接著作答。

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
- 「出牌」計分、「棄牌」換牌；每次計分停在可檢查的 resolving phase，trace 可展開查看籌碼 × 倍率。
- 效果牌依左至右順序觸發；展開任一張即可閱讀效果、目前 counter，並用 44px 以上的左移/右移按鈕排序。
- 商店可購買、刷新、出售與打開選擇包；purchase、choice、sell 與 reroll 均有 transaction guard。
- 每個 committed reducer transition 都會寫入 `sudoku-drill-poker-active-v1`；牌局紀錄另存於 `sudoku-drill-poker-records-v1`。
- 介面在 360 CSS px 使用四欄、兩排手牌，沒有橫向 page scroll；選取與計分狀態不只靠顏色，並支援 `prefers-reduced-motion`。

## 資產與相容性聲明

牌局沒有匯入第三方遊戲角色、卡圖、logo、音訊、字體、UI skin 或 source code。撲克牌只用標準
Unicode rank/suit 與 repository-owned CSS；效果牌使用文字與幾何標記。玩家文案不使用研究對象的品牌化名稱。
研究文件內的名稱與連結只用於 provenance，不會進入 player-facing catalog copy。
