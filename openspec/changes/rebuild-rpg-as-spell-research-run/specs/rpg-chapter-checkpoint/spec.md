## ADDED Requirements

### Requirement: Entering a chapter establishes a serializable baseline
遠征 SHALL 分為章節。進入章節時系統 SHALL 建立目前章節基線，包含地圖 seed domain、玩家狀態、法術組成、節點狀態與每章一次的撤離額度。基線 SHALL 與目前 `run` 一同持久化於既有的 `sudoku-drill-rpg-v1` key，並一同通過 canonical validation；`battle` phase SHALL 另存該遭遇的進場狀態與獨立戰鬥 PRNG，`failed` phase SHALL 保留進場狀態但不再持有可消耗的戰鬥 PRNG。章節基線只可在進入章節或明示完成付代價撤離時建立，不得因一般節點完成而前移。

#### Scenario: Snapshot survives a reload
- **WHEN** 玩家進入新章節後關閉並重新載入
- **THEN** `run` 與章節基線皆被還原且通過驗證
- **AND** seed domain、撤離額度與 `escaped` 節點各自保持其記錄值

### Requirement: Content is derived from position, not from a sequential draw
章節地圖 SHALL 由 `hash(runSeed, chapterIndex, generationAttempt, purpose)` 產生；章節內每個節點的內容（遭遇身分、canonical 詞綴集合、事件、掉落）SHALL 由 `hash(runSeed, chapterIndex, generationAttempt, nodeId, purpose)` 的具名 domain 推導。每場戰鬥 SHALL 再由 `hash(runSeed, chapterIndex, generationAttempt, nodeId, "combat")` 建立獨立且可序列化的 PRNG。系統 SHALL NOT 以「玩家走到哪就從單一全域序列流抽下一個」的方式決定節點內容，也 SHALL NOT 只以 `turnIndex` 區分同一回合內的多次隨機事件。

此規則是章節重來能夠成立的前提，不是實作偏好。若內容來自循序消耗的 PRNG 流，玩家在重來時改走另一條路徑就會改變消耗位置，使其後所有節點的內容一併改變——而改變路徑正是重來時預期玩家會做的事。座標推導使「B 節點的內容」與抵達它的路徑無關，位元級一致性因此在重新選路後仍然成立。

所有隨機用途 SHALL 明確歸屬於「章節／節點座標 domain」、「有限嘗試耗盡後的具名 `fallback` domain」或「目前戰鬥 PRNG」。未歸屬的新亂數用途 SHALL 使驗證失敗；不得保留可被任意內容共用的隱性全域流。

#### Scenario: Reroute after death without changing node contents
- **WHEN** 玩家在章節中死亡並重來，這次走一條不同的路徑
- **THEN** 沿途每個節點的遭遇身分、詞綴與掉落與首次生成時相同
- **AND** 先前未造訪過的節點其內容亦與生成時一致，不因抵達順序而改變

#### Scenario: Same route reproduces the same combat rolls
- **WHEN** 玩家重來後重複完全相同的路徑與行動序列
- **THEN** 每一回合的結算與首次完全相同
- **AND** 不存在任何藉由改變路徑而重骰某節點內容的序列

### Requirement: Chapter entry guarantees a survivable state
進入章節時的生命值 SHALL 不低於生命上限的 50%：`chapterStartHp = max(carriedHp, floor(maxHp / 2))`。該保底 SHALL 在建立基線之前套用，使章節基線本身即為可存活狀態。

此規則防止因確定性重來而產生的軟鎖：生命跨章節帶入，若玩家以極低生命進入某章，重來將永遠回到同樣的極低生命，形成無論如何配裝都不可能通過的死局。保底取 50% 而非全補，使章節內的消耗仍具意義。

#### Scenario: Enter a chapter at critical health
- **WHEN** 玩家以低於生命上限 50% 的生命完成前一章
- **THEN** 進入新章節時生命被提升至上限的 50%，且章節基線記錄該值
- **AND** 在未明示提交撤離後新基線前，一般重來皆從此值開始

#### Scenario: High health is not reduced
- **WHEN** 玩家以高於生命上限 50% 的生命完成前一章
- **THEN** 生命值不被更動，章節內的消耗照常延續

### Requirement: Ordinary death rewinds to the current chapter baseline reproducibly
致命結算後系統 SHALL 先進入可持久化的 `failed` phase，保留遭遇進場狀態，且 SHALL NOT 再消耗亂數。玩家選擇一般重來時，系統 SHALL 以目前章節基線取代 `run`。重來的章節 SHALL 在地圖、敵人、canonical 詞綴集合、事件與掉落上保持相同；同一起始狀態與行動序列 SHALL 產生相同戰鬥結果。系統 SHALL NOT 在重來時讓任何戰鬥 PRNG 繼續前進。

若撤離不可用，`failed` phase 仍 SHALL 提供一般重來與全部重來；不得自動覆寫狀態而略過玩家選擇。

#### Scenario: Retrying cannot reroll rewards
- **WHEN** 玩家在章節中取得掉落後死亡並重來，且重複相同的行動序列
- **THEN** 取得的掉落、遭遇與事件與首次完全相同
- **AND** 不存在任何藉由死亡重骰獎勵的序列

#### Scenario: Changing the loadout changes the outcome
- **WHEN** 玩家死亡後重來並改變法術組成
- **THEN** 結果與前一次可辨識地不同
- **AND** 若玩家完全重複前一次的行動與組成，結果與前一次相同

### Requirement: A failed non-boss encounter can be escaped at a persistent cost
每章 SHALL 提供 1 次撤離額度。進入每個戰鬥節點之前，系統 SHALL 保存該遭遇的進場狀態；進行中戰鬥與 `failed` phase 重新載入時皆須能驗證並還原。非首領遭遇第一次或其後任何一次失敗時，若額度仍可用，失敗畫面 SHALL 同時提供「依目前基線重來」與「付代價撤離」。撤離 SHALL 回復該遭遇進場前的玩家與資源狀態、消耗本章撤離額度、放棄該節點全部獎勵與見聞，並把該節點標記為 `escaped` 後視為已通過。撤離 SHALL NOT 適用於章節首領或最終首領。

撤離結果 SHALL 提交為新的章節基線；後續死亡不得復原撤離額度、`escaped` 標記或被放棄的獎勵。撤離是人因安全閥，SHALL NOT 取代 Reachable Power Frontier 認證，也 SHALL NOT 被認證流程視為遭遇可勝的證據。

#### Scenario: Escape after learning an encounter is a dead end
- **WHEN** 玩家在非首領遭遇進入 `failed` phase，且本章撤離額度仍可用
- **THEN** 玩家可撤離並回復至遭遇進場前狀態，該節點標記為 `escaped`
- **AND** 撤離額度歸零、該節點不給予掉落、見聞、首殺或勝利紀錄

#### Scenario: Reload the failure choice without losing either exit
- **WHEN** 玩家在可撤離的 `failed` phase 關閉並重新載入
- **THEN** 一般重來與付代價撤離仍指向各自正確的基線與遭遇進場狀態
- **AND** 重載本身不消耗撤離額度、資源或亂數

#### Scenario: A later rewind preserves the paid consequence
- **WHEN** 玩家撤離後繼續前進並於同章稍後死亡
- **THEN** 回溯至撤離後提交的新章節基線
- **AND** 已消耗的撤離額度、`escaped` 節點與被放棄的獎勵不被復原

#### Scenario: Bosses remain mandatory
- **WHEN** 玩家在章節首領或最終首領失敗
- **THEN** 不提供付代價撤離
- **AND** 仍提供依目前章節基線重來與全部重來

### Requirement: Full restart returns to the story start and keeps the profile
系統 SHALL 在遠征進行中的任何時點提供玩家主動觸發的「全部重來」，從**故事起點**重新出發。因首領不可撤離且每章撤離額度有限，全部重來 SHALL 被視為必要出口而非便利功能，SHALL NOT 因任何狀態而停用。

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
既有 `contentValidation` 以禁止故事圖出現環來防止重複領取場景獎勵。引入章節重來後，該責任 SHALL 由章節基線、`escaped` 節點與一次性給予記錄承擔：一般重來可重現，撤離又明確放棄該節點收益，故重複領取在結構上不可能。移除環檢查 SHALL 與新責任同時完成，SHALL NOT 單獨移除。

#### Scenario: No repeated reward through deliberate death
- **WHEN** 對每個章節列舉「取得獎勵後死亡並重來」的序列
- **THEN** 沒有任何序列能使同一份獎勵被計入兩次
- **AND** 章節內的見聞、殘頁與掉落各自至多結算一次
