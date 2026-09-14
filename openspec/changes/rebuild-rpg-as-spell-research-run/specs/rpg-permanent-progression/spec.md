## ADDED Requirements

### Requirement: Insight is granted once and deduplicated across runs
見聞 SHALL 僅於首次達成時給予，並以 `profile` 層級跨趟去重（延續既有 `profile.discoveries` 的作法）。重玩同一段落、重來同一章節或全部重來後再次經過同一給予點 SHALL NOT 再次給予見聞。系統 SHALL NOT 提供任何可重複賺取的永久貨幣來源。

#### Scenario: Replaying an early chapter earns nothing twice
- **WHEN** 玩家全部重來後再次通過先前已通過的章節
- **THEN** 該章節不再給予見聞
- **AND** 尚未達成過的給予點仍正常給予

#### Scenario: Chapter rewind does not farm insight
- **WHEN** 玩家在章節內取得見聞後死亡並重來，再次到達同一給予點
- **THEN** 見聞不被重複計入
- **AND** `profile` 的見聞餘額與首次達成後相同

### Requirement: Permanent rewards unlock composition space, not flat statistics
永久養成的獎勵 SHALL 作用於法術組成空間：解鎖成分、提高法術行數上限、擴充殘頁持有上限、擴充開局可選的首批殘頁。系統 SHALL NOT 提供僅提高生命、魔力、攻擊或護甲數值的永久養成項目。行數上限 SHALL 由初始值逐步解鎖至決策所定的最大行數。

#### Scenario: Unlock a component and gain new answers
- **WHEN** 玩家以見聞解鎖一項先前未開放的成分
- **THEN** 該成分可用於組成，並使先前無法應對的敵人機制出現可行解
- **AND** 解鎖本身不改變任何既有法術的傷害數值

#### Scenario: Reject a flat-statistic upgrade
- **WHEN** 審視養成清單
- **THEN** 清單中不存在僅提高生命、魔力、攻擊或護甲的項目
- **AND** 每一項皆可被說明為「解鎖了先前做不到的組合或行為」

### Requirement: The currency supply is bounded, enumerated, and priced with slack
因見聞為一次性給予，其總供給 SHALL 為設計時已知的可數值。所有給予點 SHALL 於 catalog 中列舉，且 SHALL NOT 存在未列舉的給予來源。解鎖項目的**總價格 SHALL 不超過總供給的 85%**，使玩家不必取得全部給予點也能解滿。最低價的解鎖項目 SHALL 低於第一趟的期望給予量，使首趟結束即可做出一次解鎖選擇。

#### Scenario: Verify the budget holds
- **WHEN** 對 catalog 執行預算核對
- **THEN** 列舉出的給予點總數與解鎖項目總價格皆被計算，且總價格不超過總供給的 85%
- **AND** 存在未列舉的給予來源時核對失敗

#### Scenario: Afford an unlock after the first run
- **WHEN** 模擬一趟僅通過前兩章即結束的遠征
- **THEN** 該趟取得的見聞足以負擔至少一項解鎖
- **AND** 玩家在返回村莊時有可執行的選擇

#### Scenario: Full unlock is reachable and terminal
- **WHEN** 玩家解鎖全部項目
- **THEN** 後續遠征不再給予新的見聞，遊戲進入無 meta 成長的狀態
- **AND** 此狀態即為驗收所用的「全解鎖 profile」，可被列舉並重現

### Requirement: The profile survives every run-ending path
`profile` SHALL 在死亡、章節重來、全部重來、撤離與勝利後完整保留。SHALL NOT 有任何路徑會扣除已解鎖的養成或已獲得的見聞餘額。

#### Scenario: Profile intact after defeat
- **WHEN** 玩家在最後一章死亡並選擇全部重來
- **THEN** 已解鎖的養成與見聞餘額完全不變
- **AND** 歷史紀錄新增一次遠征結束的記錄
