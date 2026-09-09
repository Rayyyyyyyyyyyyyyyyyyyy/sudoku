## Why

《夢魘堡壘》已有完整短篇遠征，但 38 節、91 選項、八個種子事件與相近的職業技能，仍不足以支持「飛機上離線玩約三小時」。下一輪應增加有延遲後果的原典支線與可比較的流派選擇，並以真人重玩、存檔續接和實機飛航測試證明差距是否縮小。

## What Changes

- 限定三個內容單元：森林盟約與三日龍鱷圍困、Porte Resonant 後互斥的衛隊／侍者及火眼夢女路線、保留歧義的熱病尾聲；繼續使用西式劍與魔法及 Sacnoth 原典。
- 淨增至少 24 個實質場景、60 個選項，達到至少 62 節、151 選項；兩個既有事件池各由四件增至八件，八個新事件計入上述增量。每條新增主支線須有跨場景後果，不能靠分拆段落湊數。
- 保留三職業，各提供一次互斥的二選一戰術專精，共六個選項；新增兩件具有取捨的遺物，並讓既有守龍與終戰各增加一項需要回應意圖的機制。不新增完整技能樹、職業、永久升級或異象。
- 新增至多六項跨趟敘事見聞，顯示已見版本與未探索方向；不靠強制刷取或數值門檻延長時間。
- **BREAKING**：新規則使用 `schemaVersion: 2`、`contentVersion: nightmare-fortress-2`。已驗證的 v1 存檔經玩家明示確認後保留永久養成、退休舊遠征；不以新規則直接續接舊戰鬥，不默默清除原始存檔。
- 建立可重現路線／流派矩陣，以及六位真人最多 180 分鐘的遊玩測試。分開判定「本輪擴寫通過」與「約三小時主張通過」，不將內容量換算為時數。
- 以正式產物在實際手機／平板瀏覽器及桌面瀏覽器驗收首次在線安裝、飛航冷開、途中關閉續玩與更新；既有離線空白頁觀察須獲得可重現結論。

### Non-goals

不一次用完十項原典素材：四十行咒語組合、Thok／Lunk 拆分與鐵窗囚物留待後續。不加入程序地圖、回訪刷房、完整技能樹、新長篇章節、全面 UI 重做、新美術／音訊管線、雲端存檔、執行時網路或 LLM，也不改其他三款遊戲。此提案 task 僅建立文件，不實作、不 commit、不 push。

## Capabilities

### New Capabilities

- `rpg-expedition-content`: 有範圍上限的原典擴寫、路線後果、內容量、見聞與 provenance。
- `rpg-tactical-replay`: 三職業專精、遺物取捨、意圖回應、種子事件與可重現重玩指標。
- `rpg-content-compatibility`: v2 狀態與驗證、v1 永久養成轉移、原始存檔保留及失敗恢復。
- `rpg-long-session-validation`: 真人內容／重玩評估、三小時主張門檻及 production 飛航續玩證據。

### Modified Capabilities

無。此 repo 沒有 `openspec/specs/` 主規格；以上全部以 ADDED requirements 建立。既有 `enable-reliable-offline-play` 的安裝前提、快取清理範圍仍為約束，不修改或歸檔其他 changes。

## Impact

- 預期實作落點：`src/data/rpg/story.ts`、`src/lib/rpg/{types,catalog,engine,contentValidation,persistence,index}.ts`、`src/pages/RpgGame.jsx` 與必要的 `rpg.css`，以及 RPG／mounted UI 測試。
- `story.ts` 仍為可執行文本唯一來源，`docs/rpg-story.md` 必須由 `npm run rpg:text` 產生；實作時同步原典參照、架構、驗證紀錄與 README 的事實狀態。
- 維持 `sudoku-drill-rpg-v1` 儲存 key、純 TypeScript 引擎、序列化 PRNG 與既有本機圖集；不增加 production dependency，不改其他遊戲 key。共用 service worker 僅在證明是本輪離線阻礙時作最小修正並跑跨遊戲回歸。
- 真人招募及實際裝置是未來驗收資源，不能以模擬玩家或單元測試代替；本次文件完成不代表功能、飛航或遊玩時長已通過。
