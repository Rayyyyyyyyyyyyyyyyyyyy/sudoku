# 數獨刷題 · Sudoku Drill

原本是一份 6.1 MB 的單檔 artifact bundle(base64 + gzip 塞在 `<script type="__bundler/manifest">` 裡),
現在改寫成 Vite + React 的 SPA。玩法、配色、鍵盤操作、localStorage 紀錄格式都跟原版一致。

## 開發

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 產出 dist/
npm run preview  # 預覽 production build
```

## 路由

| 路徑 | 說明 |
| --- | --- |
| `/` | 首頁:每日一題、五種難度、個人紀錄、玩法設定 |
| `/#/play/:level?seed=…` | 指定難度的題目(`level` 為 0–4,seed 決定盤面) |
| `/#/daily` | 每日一題(困難難度,seed 取當天日期,同一天永遠同一題) |

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
