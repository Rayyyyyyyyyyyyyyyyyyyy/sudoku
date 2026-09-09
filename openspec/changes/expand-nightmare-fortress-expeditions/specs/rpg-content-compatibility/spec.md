## ADDED Requirements

### Requirement: Explicit v2 content boundary
新遊戲 SHALL 使用 `schemaVersion: 2`、`contentVersion: nightmare-fortress-2` 並維持 `sudoku-drill-rpg-v1` key。新版本 SHALL 驗證專精、裝備所有權、準備與 phase 關係、敘事記錄、節點／資源／PRNG 不變條件，允許合法非空 profile 與 `run: null`。舊遠征 SHALL NOT 直接用新規則續接。

#### Scenario: Restore every stable v2 phase
- **WHEN** 故事、圍困、已選專精、事件、戰鬥準備、已結束或有 profile 的遠征外快照被讀取
- **THEN** 合法快照原狀恢復權威狀態，固定後續動作與不中斷結果一致

#### Scenario: Reject an impossible v2 loadout
- **WHEN** 快照指定其他職業專精、未持有的已裝備遺物、戰鬥外準備或錯誤 PRNG
- **THEN** 快照被判 incompatible，原始資料保留且不進入引擎或自動保存

### Requirement: Reviewed legacy profile transfer
已知合法 v1 SHALL 由凍結的 v1 規則驗證，不依新 catalog 猜測是否合法。轉換 SHALL 先呈現可保留成果、舊遠征退休後果與複製 raw 操作，停止自動寫入；只有玩家明示確認 SHALL 將 v1 轉成 v2。轉換 SHALL 原樣保留 insight、victories、expeditions、upgrades、discoveries，設定 tales 為空及 run 為 null，revision 加一；SHALL NOT 發新勝利、撤離或補償獎勵。

#### Scenario: Transfer a known v1 active or completed run
- **WHEN** 合法 v1 故事、戰鬥、已結束或空局快照的使用者確認轉換
- **THEN** 通過 v2 驗證的保留 profile 狀態被一次寫入同一 key，舊遠征不再執行
- **AND** 玩家可從遠征外以保留的永久升級開始 v2 新局

#### Scenario: Cancel or repeat the transfer
- **WHEN** 玩家取消確認或在首次成功後重送確認
- **THEN** 取消時原始值逐字不變且不開始新局；重送時不再次改變 revision、計數或發獎

### Requirement: Preserve raw saves on recovery and storage failures
損毀、過大、未知版本或未通過完整 v1／v2 驗證的資料 SHALL 保留 raw、停止寫入並提供複製及明示重建流程，不從非法片段自動抽取財產。讀取失敗 SHALL 維持該次頁面的禁止寫入保護。轉換寫入失敗 SHALL 保留 pending 與 raw，不顯示轉換成功或由 render 自動覆寫；其他遊戲 key 與 cache SHALL 不受操作影響。

#### Scenario: Fail while persisting a conversion
- **WHEN** 玩家確認轉換但 StoragePort.setItem 失敗
- **THEN** UI 顯示未保存並保留原始 JSON 供複製及明示重試，原 key 仍保持舊值

#### Scenario: Encounter unreadable or unknown storage
- **WHEN** 首次讀取受阻、JSON 損毀或 contentVersion 不受支援
- **THEN** 系統不自動重建／遷移／覆寫；只有適用的明示操作才允許替換 RPG 資料

### Requirement: Safe rollback semantics
交付文件 SHALL 說明 v2 不提供自動降版。回退 bundle SHALL NOT 清除或以 v1 解讀 v2 存檔；玩家自行保存的 v1 raw 是自願回復舊進度的來源，系統 SHALL NOT 承諾合併新舊遠征。

#### Scenario: Open a v2 save in the old build
- **WHEN** 已轉換使用者載入 v1 bundle
- **THEN** 既有版本驗證將 v2 保留為 incompatible，原始值可複製且不被自動覆寫
