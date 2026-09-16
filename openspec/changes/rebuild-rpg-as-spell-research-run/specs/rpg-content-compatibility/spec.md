## ADDED Requirements

### Requirement: Schema 3 is the only accepted live format
系統 SHALL 使用 `schemaVersion: 3` 與 `contentVersion: spell-research-1`。canonical validation SHALL 涵蓋殘頁所有權與獨佔（一張殘頁至多屬於一個法術）、行數不超過已解鎖上限、詠唱狀態與 phase 的一致性、章節索引與目前基線、地圖 `generationAttempt`、排序且不重複的 canonical 詞綴集合、版本化互斥表、戰鬥獨立 PRNG、遭遇進場狀態、撤離額度與 `escaped` 節點。`battle` 與 `failed` phase SHALL 具備遭遇進場狀態，其他 phase SHALL NOT 留存失效副本；只有 `battle` phase SHALL 具備可繼續消耗的戰鬥 PRNG。v2 的 `validGame` 已接受合法非空 profile 搭配 `run: null`；schema 3 SHALL 保留此能力，並以 v3 的 profile 契約驗證退休遠征後的狀態，SHALL NOT 只更動版本字串或放寬凍結的 v1 辨識條件。

#### Scenario: Round-trip a live game
- **WHEN** 合法的 schema 3 狀態經序列化與反序列化
- **THEN** 還原結果與原狀態一致並通過驗證
- **AND** 不合法的組成、詠唱、亂數 domain、詞綴集合、撤離或章節基線狀態被拒絕

#### Scenario: Preserve a valid profile after retiring a run
- **WHEN** 已確認遷移的合法 schema 3 狀態具有歷史紀錄或可用見聞，且 `run: null`
- **THEN** 該狀態可儲存、重新載入並開始新遠征，不要求清空 profile
- **AND** 版本或 profile 欄位不合法時，即使 `run: null` 仍拒絕載入並保留原始資料

#### Scenario: Reject non-canonical modifier and escape state
- **WHEN** 存檔含未排序或重複的詞綴、包含互斥子集的集合、範圍外撤離額度、phase 與遭遇進場狀態不一致，或已撤離節點仍可給予收益
- **THEN** canonical validation 拒絕該狀態並保留原始資料
- **AND** 不以排序、刪除或猜測欄位的方式靜默修復 live state

#### Scenario: Reject a v3 save in an older bundle
- **WHEN** schema 3 存檔被僅接受舊版本的 bundle 讀取
- **THEN** 該存檔被視為不相容並保留原始資料
- **AND** 不進行任何覆寫

### Requirement: Retire v1 and v2 runs and refund spent insight
系統 SHALL 以唯讀方式辨識已知合法的 v1／v2 存檔並提供轉換預覽。玩家明示確認後 SHALL 保留歷史紀錄（遠征次數、勝利數、已見記錄），退休既有 `run`，SHALL NOT 以新規則續接舊戰鬥。

v2 的六項永久升級在 v3 沒有對應能力，系統 SHALL 退休該六項並**全額退還其已花費的見聞**，使玩家可在新的解鎖式養成中重新分配。SHALL NOT 靜默丟棄，SHALL NOT 讓舊升級以無效狀態殘留於 `profile`。

#### Scenario: Preview before converting
- **WHEN** 玩家載入 v2 存檔
- **THEN** 介面顯示將保留的歷史紀錄、將退休的六項升級，以及退還後的見聞餘額
- **AND** 未確認前不寫入任何資料

#### Scenario: Refund is exact and spendable
- **WHEN** 玩家確認轉換
- **THEN** 退還後的見聞餘額等於原餘額加上六項升級已花費的總額
- **AND** 該餘額可立即用於新的解鎖式養成

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
