## ADDED Requirements

### Requirement: One mutually exclusive specialization per class
系統 SHALL 保留三職業，每職業於鍛造時提供一次二選一專精，共六選項，首次遠征即可選。專精 SHALL 鎖定至本趟結束，新趟可重選，且至少一側透過 guard 與下一次 skill 的準備／消耗關係形成取捨；不新增完整技能樹或永久購買要求。

#### Scenario: Commit and restore a specialization
- **WHEN** 玩家選定專精後存檔重開，再嘗試重送原選擇
- **THEN** 同一專精被還原，重送被拒絕且不更改 revision、資源或 PRNG

#### Scenario: Compare tactical alternatives
- **WHEN** 每職業的兩個專精在具名敵方意圖 fixtures 中對照
- **THEN** 至少兩種情境顯示不同的合理操作／資源結果與代價，而非僅名稱或無條件傷害差異

### Requirement: Bounded preparation and relic trade-offs
準備 SHALL 為單一布林、不疊加、於下一次 skill 消耗且戰鬥結束清除。系統 SHALL 新增兩件帶有收益及代價的原創遺物作固定可選支線獎勵，最多裝備其中一件且可不裝備；裝備調整 SHALL 僅在戰鬥外進行、不消耗資源或亂數。效果 SHALL 與既有符文、異象及月石共同由引擎計算，最終魔力成本至少 1、傷害至少 0。

#### Scenario: Prepare and spend an attack
- **WHEN** 符合專精條件的 guard 被接受，隨後執行 skill
- **THEN** 準備先變為有再被消耗，依職業條件獲得對應效果，重複 guard 不疊層
- **AND** 致勝、撤離或下一場戰鬥不帶入前一場準備

#### Scenario: Obtain the second relic
- **WHEN** 玩家已裝備一件新遺物並取得另一件
- **THEN** 原裝備不被自動替換，玩家可在戰鬥外比較收益／代價後選擇其中一件或不裝備

### Requirement: Visible intent-dependent encounters
既有守龍及 Gaznak SHALL 各有至少一項需要回應敵方意圖的條件機制：守龍尾擊額外穿透可由 guard 抵消，Gaznak 移首窗口提供 skill 弱點加成。呈現 SHALL 說明相關意圖、準備、成本、專精及遺物代價，不能僅提高敵人數值。通關 SHALL 不要求永久升級或特定新專精／遺物。

#### Scenario: Respond to the tail feint and exposed wrist
- **WHEN** 玩家分別在守龍重尾擊時 guard、在 Gaznak 移首窗口 skill
- **THEN** 戰鬥結果表現各自的條件機制，且與未回應意圖的對照狀態不同
- **AND** 介面在操作前提供足以理解差異的意圖與規則

### Requirement: Deterministic events and authoritative transitions
相同 v2 內容、seed、完整起始 profile／配置與行動序列 SHALL 產生相同狀態。事件、戰鬥和掉落 SHALL 共用序列化 `run.random`；每池每趟只抽一次，已抽事件 nodeId 與 PRNG SHALL 保存。React SHALL 僅呈現、送行動及處理儲存；所有 gameplay 結算由 TypeScript 引擎擁有，禁止 DOM、網路、時鐘、LLM 或 `Math.random()` 參與規則。

#### Scenario: Resume after an event or loot roll
- **WHEN** 事件／掉落已抽取後重載並送出固定後續行動
- **THEN** 結果、PRNG value/calls、裝備及戰鬥狀態與不中斷對照一致，不重抽

#### Scenario: Reject duplicate and unavailable actions
- **WHEN** 過期 revision、資源不足、戰鬥內換裝或重複專精選擇送入引擎
- **THEN** 狀態及 PRNG 不變；合法行動只使 revision 前進一次

### Requirement: Reproducible route and build coverage
驗收 SHALL 提供至少 12 條完成路線，覆蓋三職業 × 二專精 × 二堡內路線，各以 seeds 0–5 從無永久升級 profile 通關，共至少 72 趟，並覆蓋圍困／快速線、三異象及兩遺物。每條路線 SHALL 至少 12 次有效決策，其中四次有跨場景後果；有效決策必須當下至少兩個合法選項且有不同狀態／情報／路線／結局後果，重複攻防及純繼續不充數。固定 seeds 0–255 的事件掃描 SHALL 提供全部 16 事件的正常引擎可達證人。

#### Scenario: Verify the content and build matrix
- **WHEN** 執行凍結版本的路線與事件覆蓋報告
- **THEN** 72 趟達成完成條件，12 路線符合決策門檻，16 事件皆有 seed／前綴證人
- **AND** 額外 fixtures 覆蓋低資源、圍困失敗、戰敗與撤離，不以測試專用加資源作弊通關
