## ADDED Requirements

### Requirement: No dominant fixed strategy may clear the run
驗收 SHALL 包含一組固定策略（純普攻、純施法、格擋與施法交替、有魔力即施放最高行數，以及每個單一成分的獨用組成），以引擎逐一模擬全部章節。每個固定策略 SHALL 至少在一個章節失敗。此測試 SHALL 為常設測試，不得只在一次驗收中執行。

#### Scenario: The v2 failure mode cannot pass again
- **WHEN** 對本輪內容執行固定策略模擬
- **THEN** 沒有任何固定策略通過全部章節
- **AND** 若任一策略全數通過，驗收失敗且必須調整規則而非調整門檻

### Requirement: Decisions are computed, not asserted
有效決策 SHALL 由引擎狀態計算：一個戰鬥回合僅在存在兩個以上**結果不同**的合法行動時計為決策回合；一個故事節點僅在其選項通往不同節點、或造成不同旗標／殘頁／資源結果時計為決策節點。純進入戰鬥、純繼續與僅有數值差異的選項 SHALL NOT 計入。系統 SHALL NOT 以人工維護的字串陣列長度代表決策數。

#### Scenario: Reject hand-asserted decision counts
- **WHEN** 驗收報告宣稱某路線的決策數
- **THEN** 該數字由走訪故事圖與戰鬥狀態計算得出，並可被重新計算驗證
- **AND** 以人工清單長度作為來源的報告不被接受

#### Scenario: Meet the decision ratio
- **WHEN** 統計一趟完整遠征的戰鬥回合
- **THEN** 決策回合佔比不低於 60%
- **AND** 統計所用的 seed、章節與配裝一併記錄以供重現

### Requirement: Loadout choice measurably changes outcomes
驗收 SHALL 證明配裝具有意義：每隻敵人 SHALL 存在兩組配裝，其獲勝所需回合數差異不低於 30%；每個章節 SHALL 存在一組配裝失敗而另一組成功的實例。

#### Scenario: Demonstrate loadout differentiation per enemy
- **WHEN** 對每隻敵人以兩組對照配裝於相同 seed 模擬
- **THEN** 兩組的獲勝回合數差異不低於 30%，或其一無法獲勝
- **AND** 差異來自機制需求而非單純的傷害數值高低

#### Scenario: Demonstrate that retrying with a new loadout matters
- **WHEN** 對每個章節提供一組失敗配裝與一組成功配裝
- **THEN** 兩者在相同章節快照下分別重現失敗與成功
- **AND** 該對照與章節重來的位元級一致性不衝突

### Requirement: No playtime claim without evidence
本輪 SHALL NOT 主張任何遊玩時長。v2 的「約三小時」主張與六位參與者門檻 SHALL 隨 `rpg-long-session-validation` 一併撤回。任何時長陳述 SHALL 附實測記錄與樣本數，SHALL NOT 由內容量換算。

#### Scenario: Report without a duration claim
- **WHEN** 本輪驗收完成並撰寫結案說明
- **THEN** 說明僅陳述已驗證的決策指標與離線行為，不含時長主張
- **AND** 若日後補上時長，明記樣本數與測試條件
