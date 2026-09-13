## ADDED Requirements

### Requirement: Entering a chapter snapshots the whole run
遠征 SHALL 分為章節。進入章節時系統 SHALL 快照整個 `run`，**包含 `run.random` 的 algorithm、value 與 calls**。快照 SHALL 與 `run` 一同持久化於既有的 `sudoku-drill-rpg-v1` key，並一同通過 canonical validation。

#### Scenario: Snapshot survives a reload
- **WHEN** 玩家進入新章節後關閉並重新載入
- **THEN** `run` 與章節快照皆被還原且通過驗證
- **AND** 兩者的 PRNG 狀態各自保持其記錄值

### Requirement: Death rewinds to the chapter start bit-for-bit
生命歸零時系統 SHALL 以章節快照取代 `run`。重來的章節 SHALL 在敵人、意圖序列、事件與掉落上與首次進入完全相同。系統 SHALL NOT 在重來時讓 PRNG 繼續前進。

#### Scenario: Retrying cannot reroll rewards
- **WHEN** 玩家在章節中取得掉落後死亡並重來，且重複相同的行動序列
- **THEN** 取得的掉落、遭遇與事件與首次完全相同
- **AND** 不存在任何藉由死亡重骰獎勵的序列

#### Scenario: Changing the loadout changes the outcome
- **WHEN** 玩家死亡後重來並改變法術組成
- **THEN** 結果與前一次可辨識地不同
- **AND** 若玩家完全重複前一次的行動與組成，結果與前一次相同

### Requirement: Full restart is always available
系統 SHALL 在遠征進行中的任何時點提供「全部重來」，開始新的一趟。因章節重來為確定性，全部重來 SHALL 被視為必要出口而非便利功能，SHALL NOT 因任何狀態而停用。全部重來 SHALL 保留歷史紀錄（遠征次數、勝利數、已見記錄），SHALL NOT 保留能力、殘頁或法術。

#### Scenario: Escape an unwinnable chapter
- **WHEN** 玩家的配裝無法通過某章且已多次重來
- **THEN** 「全部重來」可用並開始一趟從零開始的新遠征
- **AND** 歷史紀錄被保留，能力與殘頁不被保留

### Requirement: Chapter rewind replaces the cycle-based anti-farming rule
既有 `contentValidation` 以禁止故事圖出現環來防止重複領取場景獎勵。引入章節重來後，該責任 SHALL 由快照回溯承擔：重來為位元級相同，故重複領取在結構上不可能。移除環檢查 SHALL 與快照回溯同時完成，SHALL NOT 單獨移除。

#### Scenario: No repeated reward through deliberate death
- **WHEN** 對每個章節列舉「取得獎勵後死亡並重來」的序列
- **THEN** 沒有任何序列能使同一份獎勵被計入兩次
- **AND** 章節內的見聞、殘頁與掉落各自至多結算一次
