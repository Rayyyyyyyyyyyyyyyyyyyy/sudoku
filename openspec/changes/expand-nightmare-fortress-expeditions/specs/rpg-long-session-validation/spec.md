## ADDED Requirements

### Requirement: Human baseline and candidate playtests
驗收 SHALL 邀請至少六位非實作參與者，比較凍結 v1 與候選 v2，各在不同日最多遊玩 180 分鐘，三人先 v1、三人先 v2；至少三位不熟悉本遊戲、三位具文字 RPG／roguelite 經驗，每職業至少兩位先試。玩家 SHALL 可自由停止，不可強迫刷局湊時間。資料 SHALL 記錄版本／SHA、裝置、profile／seed／行動、次序、各趟勝敗與時間、有效決策、新鮮度、重複文字、停止原因、投入度與恢復損失，並明示樣本限制。

#### Scenario: Compare equivalent starting progress
- **WHEN** 同一參與者開始兩版本的測試
- **THEN** 每版本均由獨立空 profile、相同初始職業與預先記錄的 seed 起點開始，各版本內的後續養成自然累積
- **AND** 六人候選結果來自同一凍結 build，影響指標的改動後不得混用舊結果湊門檻

#### Scenario: A participant stops early
- **WHEN** 玩家因無聊、重複、挫折或自認內容耗盡停止
- **THEN** 報告保留實際有效時間及原因，不排除該樣本或計入未遊玩的剩餘時間
- **AND** 沒有真人資料時狀態維持未驗收，不以腳本／agent 模擬代替

### Requirement: Comparable engagement measurements
有效遊玩時間 SHALL 包含閱讀、思考、戰鬥與整備，扣除背景、休息、故障等待以及連續超過兩分鐘且玩家確認離開的閒置；壁鐘時間 SHALL 另列。重玩新內容比例 SHALL 以實際呈現且具新資訊／後果的 `(nodeId, variantId, outcomeId)` 單位首次見到數除以本趟不同敘事單位數；傷害亂數、改 ID、同義或數值換皮 SHALL NOT 算新內容。重複文字比例 SHALL 另計再次顯示的已讀敘事字元／本趟全部敘事字元。紀錄 SHALL 人工或本機收集，不將時鐘帶入引擎或上傳 telemetry。

#### Scenario: Replay a familiar scene with different damage
- **WHEN** 同一因果及文本場景只有傷害數值不同
- **THEN** 該場景不增加新內容單位，已讀文字仍算入重複比例

### Requirement: Expansion acceptance and duration claims are separate
本輪內容與技術門檻之外，擴寫有效驗收 SHALL 同時達成：v2 六人有效遊玩時間中位數至少 120 分鐘、個人 v2 減 v1 差值的中位數至少 30 分鐘、至少 4/6 自願開始第二趟且第二趟新內容比例至少 30%、投入度中位數至少 4/5。約三小時主張 SHALL 額外要求至少 4/6 在 180 分鐘時窗自願有效遊玩至少 150 分鐘、至少 4/6 進入第三趟且第三趟新內容比例至少 20%、最後一趟投入度中位數至少 4/5，以及實機離線驗收通過。節點／字數／測試通過 SHALL NOT 替代時長證據。

#### Scenario: Expansion passes but three-hour evidence fails
- **WHEN** 本輪指標達標而額外的三小時門檻未達
- **THEN** 本 change 可在其他必須驗收皆通過後完成，README 與驗證紀錄仍寫三小時未證明並列下一輪缺口

#### Scenario: Expansion itself fails
- **WHEN** 真人中位數、差值、第二趟新鮮度或投入度任一未達本輪門檻
- **THEN** 對應驗收任務保持未完成，記錄問題並於既定三個單元範圍內迭代，不自動加完整章節或以拖延補時間

### Requirement: Production offline cold-start evidence
離線驗收 SHALL 使用凍結 production build，在預計帶上飛機的手機／平板及至少一種桌面瀏覽器執行，記錄 OS、瀏覽器版本、分頁／主畫面模式、來源網址、SW 控制與 precache 狀態。成功在線安裝並受控後 SHALL 關閉所有網路、完全關閉應用／瀏覽器，從同一 `/#/rpg` 冷開並使用新內容與本機圖集。首次從未載入的站點 SHALL 不被宣稱能離線安裝。

#### Scenario: Cold-open after installation in airplane mode
- **WHEN** 行動裝置飛航模式且 Wi-Fi 關閉，或桌面關閉 Wi-Fi／拔除網路，再冷開已安裝網址
- **THEN** 新故事、互動、專精與本機圖像可用，外部原典頁無法載入也不阻礙遊戲
- **AND** 缺少任一必要資產或出現空白即記為失敗，不以預快取單元測試判成功

### Requirement: Offline interruption and update continuity
驗收 SHALL 在圍困夜間、已抽事件／掉落、專精／遺物選定及守龍準備狀態分別保存、關閉與離線續玩，與不中斷對照比較固定後續動作。至少一次 SHALL 持續斷網 60 分鐘完成遠征、結算及下一趟；至少兩位真人 SHALL 在最多 180 分鐘候選測試全程斷網。v1 更新至 v2 後 SHALL 再離線檢查內容及明示相容性流程，無已提交進度遺失、重抽或重複發獎。

#### Scenario: Close during a prepared encounter
- **WHEN** 玩家 guard 取得準備並保存，關閉後離線重新開啟
- **THEN** 專精、準備、裝備、nodeId、資源、PRNG value/calls 與關閉前一致，後續 skill 與不中斷結果一致

#### Scenario: Install the new version over a v1 save
- **WHEN** 已有 v1 存檔的裝置在線完成 v2 安裝，斷網後重開
- **THEN** 新版提供可離線使用的轉換預覽，未確認前不覆寫，確認後保留 profile 並能開始新內容
- **AND** 更新不清除 localStorage 或同源其他應用 cache

### Requirement: Honest verification ledger
驗證紀錄 SHALL 分開列工程／產物、真人內容、實機離線、三小時主張的通過／失敗／未驗收與證據。先前停止 preview 後空白的觀察 SHALL 以可重現測試得到結論，標記安裝／SW／瀏覽器支援界線，不能在無證據下指定原因。工程交付 SHALL 通過 RPG／完整測試、typecheck、build、生成文本一致性、diff check、strict OpenSpec validation，並檢查 360px／桌面長選項、焦點及恢復畫面。

#### Scenario: The tool browser fails while target devices pass
- **WHEN** 先前空白能在工具容器重現，但目標裝置在完整安裝後通過冷開與續玩
- **THEN** 紀錄列出容器限制及實機證據，只對實際通過的瀏覽器／模式作主張

#### Scenario: An intended flight device fails
- **WHEN** 預計帶上飛機的裝置冷開或續玩失敗
- **THEN** 飛航驗收及約三小時離線主張均不能通過，保留失敗紀錄及修復／複驗任務
