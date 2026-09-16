# 夢魘堡壘：內容與執行邊界

## 法術研究實驗（2026-09-16）

正式 runtime 仍為下述 v2。`scripts/rpg-research/` 是 task 0 的獨立實驗：
`rules.ts` 擁有 evaluator 與回合，`run.ts` 擁有 revision、基線、撤離、獎勵與節點 PRNG；
`combatSearch.ts`／`certify.ts` 只取得已揭示資訊，不得讀 runtime 隱藏佇列或 seed。
React 預測與搜尋共用純規則，不能各自重寫結算。

`rpg-research.html` 只作開發入口，未加入正式 build；不接 StoragePort、不讀寫任何遊戲 key。
`spell-research-lab-1` 不是 schema 3，實驗狀態不能交給正式反序列化器。
先關閉 OpenSpec 的完整語意閘門再搬入 production；不得直接替換 v2 catalog 破壞相容性辨識。
規則、量測與限制見 [切片契約](../openspec/changes/rebuild-rpg-as-spell-research-run/slice-contract.md)。

## 目前正式版本

此版本是 v2 擴寫候選，提供森林三日圍困、兩條互斥堡內路線、專精與歧義尾聲。三小時內容仍須真人實測；
沒有程序生成故事、開放世界、完整職業技能樹或雲端同步。

## 規則與呈現分離

`src/lib/rpg/index.ts` 是介面的入口。TypeScript 引擎擁有行動是否合法、資源變動、戰鬥、
等級、遠征終止與永久獎勵的唯一決策權；React JSX 介面只呈現狀態、送出行動及處理儲存和確認操作。
不要在按鈕處另外扣款、發獎或推進節點，否則快速操作與重載會有兩套真相。

引擎不讀 DOM、localStorage、時鐘或網路，也不使用 `Math.random()`。它沿用既有純 JavaScript
`seededRandom.js` 的 `xorshift32-v1`；新 RPG 規則與資料契約使用 TypeScript，未要求遷移其他遊戲或 JSX。
相同內容版本、起始配置、seed 和行動序列應得到相同結果。存檔保留完整亂數狀態，而非只保留 seed；
目前 seed 影響戰鬥傷害亂數，並從三種固定異象中確定一種當趟規則；它也從兩組各八件的固定事件池
選擇荒野與夢城插曲，再從對應戰利品表抽取獎勵。事件以 seed offset 配合接受行動消耗的一次 PRNG draw，
讓凍結的 0–255 證人範圍可覆蓋兩池；選中後保存 nodeId，呈現、拒絕行動與讀檔都不再抽取。

每個行動帶有畫面讀到的 revision。過期或不合法行動不改狀態、不推進亂數；接受後只推進一次 revision。
這是本機防止重複結算的控制，不是多人交易協定，也不是防作弊保證。

## 內容與擴寫

`src/data/rpg/story.ts` 是可執行劇情的單一來源，段落、選項、條件、效果與目的地共同維護。
每節 `provenance` 區分原典素材與原創橋段，全篇 `SOURCE` 記錄作者、篇名、版本和網址。
所有文字與規則資料經 Vite 打包，不在玩家行動時下載文本或呼叫語言模型；原典外連不是執行依賴。
像素圖鑑位於 `public/assets/rpg-pixel-atlas.png`，由介面以本機 build 路徑載入；職業、異象、敵人與物品
只保存圖集格位，不把圖像判定帶進規則引擎。

事件選項的 `eventPool` 只保存池名。引擎以 `run.seed` 與 `run.random` 選出事件，隨即把事件節點當作一般
`run.nodeId` 保存，因此重載不必重新抽取，也不需要另外保存牌庫。`loot` 效果同樣推進這份亂數狀態；
唯一物品已持有時不會重複塞入背包，整張表都無可用結果時改給 2 枚金幣。

劇情目前是有向無環圖，刻意避免反覆回房刷取一次性獎勵；若要加入可重訪村莊或地圖，
須先定義一次性效果與可重複效果的領取狀態，不能只移除循環檢查。
新增章節時一起維護劇情驗證與可完成路線測試，檢查目的地、敵人、結局、可達性及消耗前置條件。
扣除魔力、金幣、補給或物品的選項必須有對應條件；生命代價則允許導向戰敗。

## 遠征與永久養成

`run` 保存單趟角色、裝備、線索、節點與戰鬥；`profile` 保存跨趟見聞、發現、勝利、升級及至多三種歧義歸鄉記錄。
五個指定里程碑首次抵達才給永久見聞，勝利每趟結算一次。戰敗或撤離保留已取得的永久成果，
但不另發勝利獎勵。升級只在遠征外購買，下趟生效。

`run.loadoutUpgrades` 保存出發時的升級集合。驗證舊遠征能力值時使用這份快照，不能使用後來
購買的新升級，否則正常結算後的存檔會被誤判損毀。

## 儲存與版本

儲存邊界只接收明確傳入的 `StoragePort`，只讀寫 `sudoku-drill-rpg-v1`。
其他遊戲的 key、Cache Storage 和既有格式不在其權限範圍。介面在狀態變動後呼叫儲存；
存取受阻時可繼續記憶體遊玩，但不可宣稱進度已可靠保存。初次讀取受阻時，介面以
`readUnavailable` 保護該次頁面，不再嘗試寫入；重新載入後才重新讀取，避免覆蓋未讀到的舊資料。

新快照分開保存 `schemaVersion: 2` 和 `contentVersion: nightmare-fortress-2`。
前者表示資料形狀，後者界定節點與規則相容性；改變場景 ID、效果或數值而影響進行中遠征時，
須明確決定版本與遷移策略，不可偷偷用新規則解讀舊存檔。

反序列化把本機資料視為未知輸入，檢查版本、列舉值、範圍、角色能力、節點與戰鬥關係。
結構驗證不是完整歷史重播或防竄改。損毀、過大或版本不相容的原始字串會保留，UI 暫停寫入並提供複製；
已知合法 v1 由凍結的 v1 列舉、能力公式、節點及遭遇邊驗證。介面先顯示轉換預覽與原始 JSON；
玩家明示確認後才以一次寫入保留 insight、victories、expeditions、六項 upgrades 與五項 discoveries，
把進行中舊遠征退休、tales 設為空並將 revision 加一。拒絕、損毀、未知版本、讀取或寫入失敗都保留 raw 並停止自動寫入。
v2 不提供自動降版；舊 bundle 必須把 v2 保留為 incompatible，玩家自行保存的 v1 raw 才能自願回復舊進度。

## v2 有限戰術狀態

三職業在 `forge` 各選直接型或準備型專精，合計六個 catalog 項目。`run.specialization` 一趟鎖定；
準備只存在 `battle.prepared`，不疊層，在下一次 skill 或戰鬥結束時消失。盟約繩結與燭淚鏡仍保存於 inventory，
`run.equippedRelic` 只指向其中一件或 null，且只能在 story phase 改變。所有成本、傷害、守龍尾擊穿透與 Gaznak 手腕破綻
由 reducer 計算；React 只顯示 catalog 說明與送出 `equip`／戰鬥行動。

三日圍困用五個不同 nodeId 表示時段，不讀時鐘、不另存 day counter。堡內 `parley-route`／`dream-route` 一次分流後都先回到
既有單向主廊，再於 `abyss` 前匯流；沒有回房邊。`profile.tales` 只保存穩定 ID，實際標題、文本與未探索提示由 `story.ts` 的 `TALES` 提供。

## 驗證範圍

`npm run typecheck` 檢查 RPG TypeScript 範圍；`npm run test:rpg` 檢查劇情與引擎、
跨職業和 seed 路線、存檔續玩、非法行動與重複結算；`npm run test:ui` 包含路由與恢復介面測試。
整合修改另跑 `npm test` 和 `npm run build`。
production service worker 在安裝時預快取完整產物；同源 navigation 先回傳已安裝的 `index.html` app shell，靜態資產同樣 cache-first，快取缺漏時才使用網路。必須先在線成功安裝快取，不能離線首次安裝。
測試與建置成功不代表已證明三小時內容量或所有裝置上的離線體驗。

旅程異象只由 seed 推導，不另存第二份狀態；事件與掉落則使用已序列化的 `run.random`。
物品、養成與異象造成的戰鬥修正仍由引擎計算。
可讀文本以 `npm run rpg:text` 從可執行劇情重新產生，避免手動稿與規則資料分岔。

本次測試證據與離線實測限制見 [`rpg-verification.md`](./rpg-verification.md)。
