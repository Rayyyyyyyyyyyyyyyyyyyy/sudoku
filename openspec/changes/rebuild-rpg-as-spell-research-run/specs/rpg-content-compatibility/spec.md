## ADDED Requirements

### Requirement: Schema 3 is the only accepted live format
系統 SHALL 使用 `schemaVersion: 3` 與 `contentVersion: spell-research-1`。canonical validation SHALL 涵蓋殘頁所有權、法術組成的同韻限制與行數上限、詠唱狀態與 phase 的一致性、章節索引與快照的合法性，以及 `run` 與快照兩者的 PRNG 狀態。既有「非空 profile 搭配 `run: null`」的拒絕條件 SHALL 被明確改寫以容許退休遠征後的狀態，SHALL NOT 只更動版本字串。

#### Scenario: Round-trip a live game
- **WHEN** 合法的 schema 3 狀態經序列化與反序列化
- **THEN** 還原結果與原狀態一致並通過驗證
- **AND** 不合法的組成、詠唱或快照狀態被拒絕

#### Scenario: Reject a v3 save in an older bundle
- **WHEN** schema 3 存檔被僅接受舊版本的 bundle 讀取
- **THEN** 該存檔被視為不相容並保留原始資料
- **AND** 不進行任何覆寫

### Requirement: Retire v1 and v2 runs without destroying history
系統 SHALL 以唯讀方式辨識已知合法的 v1／v2 存檔並提供轉換預覽。玩家明示確認後 SHALL 保留歷史紀錄（遠征次數、勝利數、已見記錄），退休既有 `run`，SHALL NOT 以新規則續接舊戰鬥。v2 的永久升級在本輪無對應能力，系統 SHALL 於預覽中明示其不再生效，SHALL NOT 靜默丟棄。

#### Scenario: Preview before converting
- **WHEN** 玩家載入 v2 存檔
- **THEN** 介面顯示將保留與將失效的項目，並明示永久升級不再生效
- **AND** 未確認前不寫入任何資料

#### Scenario: Cancel leaves the original intact
- **WHEN** 玩家在轉換預覽中取消
- **THEN** 原始存檔位元不變且可再次預覽
- **AND** 不觸及其他遊戲的 key

### Requirement: Failure never overwrites
取消、重複確認、寫入失敗、讀取受阻、損毀、過大與未知版本 SHALL 不覆寫原始資料，且 SHALL NOT 假報成功。系統 SHALL 沿用 `sudoku-drill-rpg-v1` key，SHALL NOT 讀寫其他遊戲的 key。

#### Scenario: Write failure is reported honestly
- **WHEN** 儲存寫入失敗
- **THEN** 介面說明未儲存，遊戲仍可繼續進行
- **AND** 原始資料保持可讀且未被截斷
