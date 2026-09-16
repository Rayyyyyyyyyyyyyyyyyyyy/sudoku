# 夢魘堡壘 v2 驗證紀錄

## 2026-09-16：v3 驗收方向更新

`rebuild-rpg-as-spell-research-run` 撤回「約三小時」主張與六位真人參與者門檻。
目前沒有可用的六人招募及交叉遊玩資源；v3 改以可重現的引擎決策、配裝差異與可勝性指標驗收，
不把自動測試當作真人體驗或遊玩時長證據。下方保留 v2 當時的原始結果與未驗收門檻，屬歷史紀錄，
不再作為 v3 結案條件。目標裝置離線驗收仍須另行完成。

本輪在 HEAD `48d3178` 重跑 v2 基線，程式與固定基線 `e9e738c` 無差異：
64 節、165 選項；技能優先 84/84、純普攻 51/84 **獨立戰鬥**獲勝。
完整原始輸出及 fixture 限制見 [v2 基線](../openspec/changes/rebuild-rpg-as-spell-research-run/baseline.md)。
這不是 v3 或全遠征驗收結果。

獨立法術研究切片新增 32 項測試通過；既有應用 205 項、typecheck、build 通過。
十張殘頁／兩敵人／兩詞綴的基線策略與帶入資源通過切片指標；
完整算法、UNKNOWN 與範圍限制見 [切片契約](../openspec/changes/rebuild-rpg-as-spell-research-run/slice-contract.md)。
瀏覽器已走完兩場戰鬥並檢查 360px 版面；這不是正式 v3 存檔、migration、五章或離線驗收。

---

日期：2026-09-09。baseline：`4a91e26b502b67361f28bec89fa0d92525a4d00e`（v1 38 節／91 選項）。候選尚未 commit，contentVersion 為 `nightmare-fortress-2`。

## 工程與產物：通過

- 內容盤點：64 節、165 選項，較 baseline 淨增 26／74；荒野與夢城各八件事件。逐 ID、前置、後果與 provenance 見 [`rpg-expansion-inventory.md`](./rpg-expansion-inventory.md)。
- `npm run test:rpg`：35 項通過。包含 v1 七類合法 fixture 與非法 raw、v2 canonical validation、明示轉換、三日圍困、警戒與互斥路線、六專精意圖對照、兩遺物、守龍尾擊、Gaznak 手腕、tales 去重與序列化續接。
- 12 條具名路線 × seeds 0–5 共 72 趟從空 profile 通關；三職業、六專精配置、兩條堡內路線、快速／圍困、三異象與兩遺物均在矩陣內。每條的決策與四項延遲後果保存在 `test/rpg/routeMatrix.ts`，可用 `npm run rpg:verify-v2` 重跑。
- seeds 0–255 的正常引擎掃描覆蓋兩池全部 16 事件；事件抽取只前進序列化 PRNG 一次並保存 nodeId。掉落耗盡、唯一物品與拒絕行動不前進 PRNG 亦有回歸。實際 seed／路線前綴見 [`rpg-route-evidence.md`](./rpg-route-evidence.md)。
- `npm test`：通過。包含 135 項既有 engine 測試、35 項 RPG 測試與 35 項 UI 測試；UI 覆蓋 v1 預覽、取消不保存、確認後 profile 保留、轉換寫入失敗維持 pending、readUnavailable 不覆寫、incompatible raw、專精、遺物、尾聲與恢復畫面。
- `npm run typecheck`：通過。
- `npm run rpg:text`：由 `story.ts` 產生 64 節／165 選項閱讀稿，專精與 tales 效果可讀。
- `npm run build`：通過，82 modules transformed；主 JS 509.08 kB（gzip 200.55 kB）。Vite 提示主 chunk 超過 500 kB，未造成 build 失敗；本 change 沒有順帶改動既有拆包邊界。
- production build 指紋：`index.html` SHA-256 `e1a7afc9…bc0`、`service-worker.js` `cc53d12d…31d`、主 JS `71d57de3…a41`、CSS `1cf49a48…561`、像素圖 `ed9aec33…b33`。這是候選 build 的本機識別，不代表目標裝置安裝。
- 2026-09-09 本機 in-app Chromium 視覺檢查：以 360 CSS px iframe 實際走完圍困、選擇準備型專精、裝備盟約繩結並通關。鍛劍頁 `clientWidth = scrollWidth = 360`；兩個長專精按鈕各為 324×101 px，遺物長標籤高 51 px。尾聲／恢復頁仍為 `360 = 360`，再次遠征按鈕高 52.5 px。場景切換後焦點位於 `#rpg-scene-title`；按 Tab 後背包 summary 顯示 3 px 實線焦點環。1280×900 桌面 override 為 `clientWidth = scrollWidth = 1280`、內容欄 700 px。兩種寬度皆無水平溢出，長文本換行，觸控目標與鍵盤焦點可見；viewport override 已還原，臨時 iframe harness 已移除。上述狀態亦由 mounted UI test 保存。
- `openspec validate expand-nightmare-fortress-expeditions --strict`：通過（`Change 'expand-nightmare-fortress-expeditions' is valid`）。
- `git diff --check`：通過；新增未追蹤檔案另以尾端空白掃描確認無異常。

## 真人內容評估：未驗收

六位未參與實作者尚未招募，沒有 v1／v2 分日測試、有效時間、停止原因、新鮮度、重複文字或投入度資料。不可用 72 趟腳本或節點數替代。參與者配置、計時規則與逐趟表格見 [`rpg-playtest-protocol.md`](./rpg-playtest-protocol.md)。

因此「v2 中位有效遊玩 ≥120 分鐘、個人差值中位 ≥30 分鐘、4/6 自願第二趟且新內容 ≥30%、投入度中位 ≥4」目前全部是 `未驗收`，本輪擴寫有效門檻尚未通過。

## 本機 production 離線：通過

2026-09-09 以本機 Chrome 一般分頁載入上述 production build，等待 service worker activate 並由同一網址重新載入。接著停止 Vite preview，`curl http://127.0.0.1:4173/` 回傳連線失敗（exit 7）；在伺服器保持停止時以 Chrome 原生重新載入，`/#/rpg` 的文本、像素圖鑑及操作完整出現，並成功按下「開始遠征」、從「第三個沒有夢醒的清晨」推進至「唯一能穿過夢的鋼」。

同一輪診斷確認 worker 已 activated／controlled，Cache Storage 含該 build 的 `index.html`、主 JS、CSS、像素圖及 favicon。自動化 API 的 `goto`／`reload` 在伺服器停止後呈空白，但 Chrome 原生重新載入成功；因此這個空白只證明該自動化導航沒有走到受控頁面的正常重載路徑，不再當作產品離線失敗。worker 的 navigation 改為 app-shell cache-first，單元測試確認已有 shell 時不發出網路 request。

## 目標裝置飛航：未驗收

尚未取得預計帶上飛機的手機／平板、OS、瀏覽器與一般分頁／加入主畫面模式，也沒有指定桌面飛航環境。production build 的 service worker 打包只能證明產物包含快取邏輯，不能證明真正斷網冷開。

仍須在凍結 production build 與實際攜帶裝置完成：online 安裝與 SW controlled／precache 紀錄、完全斷網並完整關閉後冷開 `/#/rpg`、四類 checkpoint 關閉續玩、固定後續行動對照、一次 60 分鐘斷網遠征與新局，以及 v1→v2 更新後離線確認／取消。也須把上述本機結果與目標裝置比較；目標裝置失敗就保持飛航 gate 未通過。

## 約三小時主張：未證明

缺少真人與飛航證據，不能提出約三小時主張。即使工程與內容量門檻通過，也仍需 4/6 自願有效遊玩至少 150 分鐘、4/6 進入第三趟且第三趟新內容至少 20%、最後一趟投入度中位至少 4/5，並通過實機飛航驗收。

本紀錄只證明上述本機 Chrome production server-off 路徑；不宣稱已完成目標裝置飛航、真人時長或部署驗收。
