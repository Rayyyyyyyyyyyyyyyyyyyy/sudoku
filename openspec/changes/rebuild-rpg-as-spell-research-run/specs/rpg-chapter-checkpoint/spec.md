## ADDED Requirements

### Requirement: Entering a chapter snapshots the whole run
遠征 SHALL 分為章節。進入章節時系統 SHALL 快照整個 `run`，**包含 `run.random` 的 algorithm、value 與 calls**。快照 SHALL 與 `run` 一同持久化於既有的 `sudoku-drill-rpg-v1` key，並一同通過 canonical validation。

#### Scenario: Snapshot survives a reload
- **WHEN** 玩家進入新章節後關閉並重新載入
- **THEN** `run` 與章節快照皆被還原且通過驗證
- **AND** 兩者的 PRNG 狀態各自保持其記錄值

### Requirement: Content is derived from position, not from a sequential draw
章節內每個節點的內容（遭遇身分、詞綴、事件、掉落）SHALL 由座標推導：`hash(runSeed, chapterIndex, nodeId, purpose)`。戰鬥中的亂數 SHALL 同樣由 `hash(runSeed, chapterIndex, nodeId, turnIndex, purpose)` 推導。系統 SHALL NOT 以「玩家走到哪就從單一序列流抽下一個」的方式決定節點內容。

此規則是章節重來能夠成立的前提，不是實作偏好。若內容來自循序消耗的 PRNG 流，玩家在重來時改走另一條路徑就會改變消耗位置，使其後所有節點的內容一併改變——而改變路徑正是重來時預期玩家會做的事。座標推導使「B 節點的內容」與抵達它的路徑無關，位元級一致性因此在重新選路後仍然成立。

章節快照仍 SHALL 保存 `run.random` 的狀態，供任何未被座標索引的結算使用；兩種機制並存時，座標推導 SHALL 優先用於一切玩家可藉由改變路徑而重新抵達的內容。

#### Scenario: Reroute after death without changing node contents
- **WHEN** 玩家在章節中死亡並重來，這次走一條不同的路徑
- **THEN** 沿途每個節點的遭遇身分、詞綴與掉落與首次生成時相同
- **AND** 先前未造訪過的節點其內容亦與生成時一致，不因抵達順序而改變

#### Scenario: Same route reproduces the same combat rolls
- **WHEN** 玩家重來後重複完全相同的路徑與行動序列
- **THEN** 每一回合的結算與首次完全相同
- **AND** 不存在任何藉由改變路徑而重骰某節點內容的序列

### Requirement: Chapter entry guarantees a survivable state
進入章節時的生命值 SHALL 不低於生命上限的 50%：`chapterStartHp = max(carriedHp, floor(maxHp / 2))`。該保底 SHALL 在快照之前套用，使章節快照本身即為可存活狀態。

此規則防止因確定性重來而產生的軟鎖：生命跨章節帶入，若玩家以極低生命進入某章，重來將永遠回到同樣的極低生命，形成無論如何配裝都不可能通過的死局。保底取 50% 而非全補，使章節內的消耗仍具意義。

#### Scenario: Enter a chapter at critical health
- **WHEN** 玩家以低於生命上限 50% 的生命完成前一章
- **THEN** 進入新章節時生命被提升至上限的 50%，且章節快照記錄該值
- **AND** 該章的每一次重來都從此值開始

#### Scenario: High health is not reduced
- **WHEN** 玩家以高於生命上限 50% 的生命完成前一章
- **THEN** 生命值不被更動，章節內的消耗照常延續

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

### Requirement: Full restart returns to the story start and keeps the profile
系統 SHALL 在遠征進行中的任何時點提供玩家主動觸發的「全部重來」，從**故事起點**重新出發。因章節重來為確定性，全部重來 SHALL 被視為必要出口而非便利功能，SHALL NOT 因任何狀態而停用。

全部重來 SHALL 重置 `run` 的全部內容（殘頁、法術組成、章節進度、英雄狀態、PRNG），並 SHALL 完整保留 `profile`（見聞、已解鎖的養成、歷史紀錄）。SHALL NOT 因全部重來而扣除或重置任何永久養成。

#### Scenario: Escape an unwinnable chapter constructively
- **WHEN** 玩家的配裝無法通過某章且已多次重來
- **THEN** 「全部重來」可用並從故事起點開始新的一趟
- **AND** 已解鎖的養成與見聞餘額完整保留，使玩家能以更寬的組合空間再次挑戰

#### Scenario: Restart does not refund run-scoped progress
- **WHEN** 玩家在取得多張殘頁後選擇全部重來
- **THEN** 該趟取得的殘頁與法術組成不被保留
- **AND** 已於該趟首次達成而給予的見聞仍保留在 `profile`，且不會因重玩同一段落再次給予

### Requirement: Chapter rewind replaces the cycle-based anti-farming rule
既有 `contentValidation` 以禁止故事圖出現環來防止重複領取場景獎勵。引入章節重來後，該責任 SHALL 由快照回溯承擔：重來為位元級相同，故重複領取在結構上不可能。移除環檢查 SHALL 與快照回溯同時完成，SHALL NOT 單獨移除。

#### Scenario: No repeated reward through deliberate death
- **WHEN** 對每個章節列舉「取得獎勵後死亡並重來」的序列
- **THEN** 沒有任何序列能使同一份獎勵被計入兩次
- **AND** 章節內的見聞、殘頁與掉落各自至多結算一次
