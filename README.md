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
| `/play/:level` | 指定難度開新局(`level` 為 0–4,對應入門～專家) |
| `/daily` | 每日一題(中等難度,seed 取當天日期,同一天永遠同一題) |

不認得的路徑會導回 `/`。因為用的是 History API,部署到靜態主機時要把所有路徑 rewrite 到
`index.html`(Netlify `/* /index.html 200`、Vercel 預設即可、nginx 用 `try_files $uri /index.html`)。

## 結構

```
src/
  lib/sudoku.js     出題:mulberry32 亂數 + 回溯填盤,挖空時檢查唯一解
  lib/stats.js      localStorage 紀錄(key: sudoku-drill-v1),最佳時間 / 連續天數
  lib/settings.js   玩法設定(key: sudoku-drill-settings-v1)
  lib/useGame.js    一局遊戲的 reducer:填數、註記、清除、完成判定、計時、鍵盤
  pages/Home.jsx    首頁
  pages/Game.jsx    遊戲畫面
  components/       Board(9×9 盤面)、NumberPad(數字鍵)
```

出題是同步的回溯搜尋,專家難度會卡一下,所以延後一個 frame 才跑,先讓「產生題目中…」畫出來。

## 跟原版的差異

- 加了網址路由,可以直接分享 / 收藏某個難度,瀏覽器上一頁也能用。
- 原本寫死在 artifact 編輯器裡的三個參數(標示錯誤、highlight 同列同行同宮、自動清註記)
  變成首頁的「玩法設定」,存在 localStorage。
- 盤面狀態改用 reducer,不再從 closure 讀舊的 `values`,連續快速輸入不會掉格。
- 字體改用 Google Fonts 連結(原版把 woff2 全部 inline 成 base64,佔了那 6 MB 的大半)。

`sudoku-drill-v1` 這個 localStorage key 沒有變,舊的紀錄會直接沿用。
