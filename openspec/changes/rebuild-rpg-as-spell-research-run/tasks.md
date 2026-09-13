## 1. 凍結基線與撤回既有主張

- [ ] 1.1 記錄實際 baseline SHA 與 v2 現況（64 節、151 選項、7 敵人、3 職業、11,252 字敘述），保存本輪診斷所用的模擬腳本與量測結果，作為改善前對照（rpg-design-verification）。
- [ ] 1.2 在 `docs/rpg-verification.md` 明寫撤回「約三小時」主張與六人真人門檻，說明資源不足的判定，保留 v2 既有結果不刪改（rpg-design-verification）。
- [ ] 1.3 盤點 v2 將作廢的產出（故事圖、敘述、三職業六專精、`routeMatrix`、數量門檻、事件匯流規則、六項平面數值升級），確認 `expand-nightmare-fortress-expeditions` 於本 change 通過後才歸檔或撤回（rpg-content-compatibility）。

## 2. schema 3 契約與持久化邊界

- [ ] 2.1 定義 schema 3／`spell-research-1`：殘頁、成分、韻、法術組成、詠唱狀態、章節索引、章節快照與解鎖式 `profile`；保留 `sudoku-drill-rpg-v1` key 與純引擎責任（rpg-content-compatibility）。
- [ ] 2.2 實作 canonical validation，涵蓋同韻限制、行數上限與已解鎖上限的一致性、詠唱與 phase 一致性、快照合法性，以及 `run` 與快照各自的 PRNG 狀態；改寫「非空 profile + `run: null`」的拒絕條件（rpg-content-compatibility）。
- [ ] 2.3 實作 v1／v2 唯讀辨識與轉換預覽：保留歷史紀錄、退休舊 `run`、退休六項升級並全額退還其已花費的見聞；驗證退還金額精確且可立即使用（rpg-content-compatibility、rpg-permanent-progression）。
- [ ] 2.4 加入取消、重複確認、寫入失敗、讀取受阻、損毀、過大與未知版本的測試，確保不覆寫、不假報成功、不跨遊戲 key（rpg-content-compatibility）。

## 3. 章節與檢查點

- [ ] 3.1 實作章節結構與進入章節時的整個 `run` 快照（含 `run.random` 的 algorithm／value／calls），一併持久化並驗證（rpg-chapter-checkpoint）。
- [ ] 3.2 實作死亡回溯：以快照取代 `run`，確保重來的敵人、意圖序列、事件與掉落位元級相同；加入「取得獎勵後死亡重來」不得重複計入的列舉測試（rpg-chapter-checkpoint）。
- [ ] 3.3 實作永遠可用的「全部重來」：從故事起點重新出發，重置 `run` 全部內容並完整保留 `profile`；測試任何狀態下皆不停用、且不扣除任何永久養成（rpg-chapter-checkpoint、rpg-permanent-progression）。
- [ ] 3.4 移除 `contentValidation` 的環檢查，並在同一次變更中以快照回溯承接防刷責任；證明兩者不同時缺席（rpg-chapter-checkpoint）。

## 4. 法術研究系統

- [ ] 4.1 建立殘頁 catalog：五種成分、三種韻與各自的效果取向；定義取得來源，確保不可由重複造訪取得（rpg-spell-research）。
- [ ] 4.2 實作組成規則：1–5 行、同韻限制、行數即等級、第 N 行貢獻第 N 個效果層；異韻組合被拒絕且不動 revision／資源／PRNG（rpg-spell-research）。
- [ ] 4.3 實作詠唱回合與打斷：1–2 行即時、3–4 行詠唱 1 回合、5 行詠唱 2 回合，被 `interrupt` 命中時失效並退還一半魔力（向下取整），戰鬥結束清除（rpg-spell-research）。
- [ ] 4.4 調整魔力經濟：格擋至多回 1 魔，移除任何無代價且可無限重複的魔力來源；以固定序列測試證明無法無限維持高行數法術（rpg-spell-research）。
- [ ] 4.5 移除戰士與遊俠及六專精，改以首批殘頁選擇作為開局決策；清理相關型別、catalog 與 UI（rpg-spell-research）。

## 5. 永久養成與解鎖

- [ ] 5.1 設計解鎖式養成清單（成分、韻、行數上限、開局殘頁範圍），並逐項說明其為何是解鎖而非數值；移除 v2 六項平面數值升級（rpg-permanent-progression）。
- [ ] 5.2 實作行數上限的逐步解鎖，並讓 canonical validation 拒絕超出已解鎖上限的組成（rpg-permanent-progression、rpg-spell-research）。
- [ ] 5.3 實作見聞的一次性給予與 `profile` 層級跨趟去重；加入「全部重來後重玩同段落」與「章節重來後再達同一給予點」皆不重複給予的測試（rpg-permanent-progression）。
- [ ] 5.4 驗證 `profile` 在死亡、章節重來、全部重來、撤離與勝利後皆完整保留，且無任何路徑會扣除已解鎖養成或見聞餘額（rpg-permanent-progression）。
- [ ] 5.5 決定見聞給予點與各項解鎖定價，實測「第一趟不至於寸步難行、第五趟不至於已解滿」（rpg-permanent-progression）。

## 6. 敵人改造與意圖

- [ ] 6.1 以既有七隻敵人實作各自的解法需求（怨魂非實體、巨蛛束縛、騎士高護甲、龍鱷反傷、魔狼打斷、守龍穿透、加茲納克綜合），不新增敵人定義（rpg-encounter-counterplay）。
- [ ] 6.2 改為由 `run.random` 抽取意圖序列，各敵人意圖數不再一律為 3；介面仍於行動前顯示下一個意圖及其打斷性／穿透性（rpg-encounter-counterplay）。
- [ ] 6.3 移除任何依玩家狀態調整敵方數值的路徑；加入「後期法術書對前期敵人明顯較易」的回歸測試（rpg-encounter-counterplay）。
- [ ] 6.4 驗證相同 seed 與行動序列可完整重播意圖與結算，PRNG value／calls 與不中斷對照一致（rpg-encounter-counterplay）。

## 7. 砍除敘述與擴充規則文字

- [ ] 7.1 刪除 `paragraphs` 與 `variants`（6,909 字）及其驗證規則；移除節點數 ≥62、選項數 ≥151 的數量門檻與事件匯流規則（rpg-design-verification）。
- [ ] 7.2 擴充選項與規則文字，使成分、韻、行數、詠唱、打斷、敵人解法與已解鎖上限在介面上足以支撐配裝判斷；為條件不足的選項提供明確原因（rpg-spell-research）。
- [ ] 7.3 移除或改寫 `npm run rpg:text` 與 `docs/rpg-story.md`，不留下會產生空稿的指令；`provenance` 改為記錄規則素材的原典出處（rpg-content-compatibility）。

## 8. UI 與第一階段美術

- [ ] 8.1 修正圖集 6 處錯配：無名怨魂、空鎧騎士、墓地魔狼、療傷藥、盟約繩結、燭淚鏡；砍除職業後釋出的 2 格一併重新指派（rpg-encounter-counterplay）。
- [ ] 8.2 將戰鬥主視覺由 48px 放大至可辨識尺寸（原圖每格 313×313），第 12 與第 14 格改作章節背景；保留 `image-rendering: pixelated`（rpg-encounter-counterplay）。
- [ ] 8.3 實作研究畫面：殘頁清單、成分與韻的識別記號、組成與拆解、已解鎖上限、下一場遭遇的預期代價；組成行動在戰鬥中被拒絕（rpg-spell-research）。
- [ ] 8.4 實作村莊養成畫面：見聞餘額、解鎖清單與各項說明、已解鎖與未解鎖的區別；全部重來的入口與後果說明（rpg-permanent-progression）。
- [ ] 8.5 在 360px 與桌面檢查研究畫面、養成畫面、戰鬥主視覺、章節重來與全部重來的觸控、鍵盤焦點與無水平溢出，保留可重現證據（rpg-spell-research）。

## 9. 可計算指標驗收

- [ ] 9.1 實作固定策略模擬（純普攻、純施法、格擋施法交替、貪婪最高行數、各單一成分獨用），證明每個策略至少在一章失敗；**在空 profile 與全解鎖 profile 兩種狀態下各執行一次**並分別記錄；列為常設測試（rpg-design-verification）。
- [ ] 9.2 實作由引擎狀態計算的決策統計，證明決策回合佔比 ≥60%；移除以人工字串陣列長度代表決策數的做法（rpg-design-verification）。
- [ ] 9.3 對每隻敵人提供兩組對照配裝，證明獲勝回合數差異 ≥30% 或其一無法獲勝，且差異來自機制需求（rpg-design-verification）。
- [ ] 9.4 對每個章節提供一組失敗配裝與一組成功配裝，於相同章節快照下分別重現，並確認與位元級重來不衝突（rpg-design-verification、rpg-chapter-checkpoint）。
- [ ] 9.5 執行 `npm test`、`npm run typecheck`、`npm run build`、`git diff --check` 及本 change 的 strict OpenSpec validation，記錄真實結果（rpg-design-verification）。

## 10. 實機離線驗收

- [ ] 10.1 在指定手機／平板與桌面瀏覽器安裝凍結 production build，記錄來源、版本、SW 控制與 precache；完全斷網、關閉並冷開 `/#/rpg`，驗證新規則、圖集與操作（rpg-content-compatibility）。
- [ ] 10.2 在四類 checkpoint（章節開始、詠唱中、研究畫面、養成畫面）逐一離線關閉續玩，與不中斷對照狀態及後續行動比較（rpg-chapter-checkpoint）。
- [ ] 10.3 在線執行 v2 → v3 安裝後重新斷網，驗證轉換確認、取消、歷史保留、見聞退還、新內容快取，以及其他遊戲資料與 cache 不受影響（rpg-content-compatibility）。
- [ ] 10.4 重現既有「停止 preview 後空白」觀察，記錄 SW 與安裝狀態；必要時最小修復並跑跨遊戲回歸（rpg-content-compatibility）。

## 11. 第二階段美術（不阻擋本輪驗收）

- [ ] 11.1 列出殘頁圖示需求清單（成分 × 韻的識別、章節背景、狀態圖示、解鎖項目圖示），估算格數與產製方式；在管道確定前不承諾視覺規格（rpg-spell-research）。
- [ ] 11.2 確認離線快取預算：現有圖集 1.4MB，評估新增圖示對 precache 體積的影響並設定上限（rpg-content-compatibility）。

## 12. 文件與交付界線

- [ ] 12.1 更新 `docs/rpg-architecture.md`、`docs/rpg-source-reference.md`（記錄四十行咒語的成分與韻採用方式）與 README 的事實狀態（rpg-content-compatibility）。
- [ ] 12.2 撰寫結案說明：只陳述已驗證的決策指標與離線行為，不含任何時長主張；若日後補上時長，明記樣本數與條件（rpg-design-verification）。
- [ ] 12.3 對最終內容再次執行適用的 OpenSpec strict 驗證與 diff check；不自動部署、不歸檔其他 changes。
