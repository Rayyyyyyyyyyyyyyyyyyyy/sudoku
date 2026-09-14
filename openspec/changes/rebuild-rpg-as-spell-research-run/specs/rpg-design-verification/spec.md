## ADDED Requirements

### Requirement: No dominant fixed strategy may clear the run
驗收 SHALL 包含一組固定策略（純普攻、純施法、格擋與施法交替、有魔力即施放最高行數，以及每個單一成分的獨用組成），以引擎逐一模擬全部章節。每個固定策略 SHALL 至少在一個章節失敗。此測試 SHALL 為常設測試，不得只在一次驗收中執行。

因永久養成會擴張組合空間，此測試 SHALL 至少在兩種 `profile` 狀態下各執行一次：空 profile 與全解鎖 profile。任一狀態下出現能通關全部章節的固定策略即為驗收失敗。

#### Scenario: The v2 failure mode cannot pass again
- **WHEN** 對本輪內容執行固定策略模擬
- **THEN** 沒有任何固定策略通過全部章節
- **AND** 若任一策略全數通過，驗收失敗且必須調整規則而非調整門檻

#### Scenario: Full unlocks do not collapse into one strategy
- **WHEN** 以全解鎖 profile 重跑固定策略模擬
- **THEN** 仍沒有任何固定策略通過全部章節
- **AND** 報告分別記錄空 profile 與全解鎖 profile 的結果，不以其中一種代表另一種

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

### Requirement: Encounters are certified against a per-chapter power floor
因本輪拒絕等級縮放，敵方強度固定而玩家強度浮動，「這場是否可勝」沒有單一答案，而是每種 build 一個答案。系統 SHALL 為每一章定義 **Power Floor**：玩家沿任一合法路徑進入該章時**保證擁有**的最低生命、法術組成與資源。每一個該章可達的遭遇身分 SHALL 從 Power Floor 起算被認證為可勝。

認證 SHALL 對最弱的合法 build 進行，不得以中位 build 代表。位元級重來使此判定為全稱而非統計：一個對某些 build 不可勝的遭遇，對那些玩家是永久死路而非一次壞運。

#### Scenario: Certify before committing a chapter
- **WHEN** 章節生成完成、尚未交付玩家
- **THEN** 該章每個可達遭遇身分皆已從 Power Floor 認證為可勝
- **AND** 任一身分未通過認證時該章節種子被拒絕並重新產生

#### Scenario: A legal but weak build is not stranded
- **WHEN** 玩家以該章 Power Floor 的組成進入
- **THEN** 每一場遭遇皆存在獲勝路線
- **AND** 認證使用的 Power Floor 定義可被列舉與重現

### Requirement: Static screens reject arithmetically impossible encounters
驗收 SHALL 在任何搜尋之前執行閉式篩檢，於認證流程的最前段拒絕算式上不可能的遭遇：

- **S1**：`ceil(敵人HP / 扣除護甲後的玩家最大DPS) >= floor(玩家HP / (敵人DPS + 每回合流失))` 時失敗。敵方傷害的回合成長須以回合索引的函數代入。
- **S2**：在壓制詠唱的條件下，僅以未被壓制的動作重算玩家最大DPS；結果 `<= 0` 時失敗（零DPS的無限迴圈）。
- **S3**：反彈類效果的數值 `>= Power Floor 的生命` 時失敗。

#### Scenario: Reject a clock-versus-duration dead end
- **WHEN** 某遭遇的擊殺所需回合數不小於存活可能回合數
- **THEN** S1 失敗，該遭遇身分不得出現
- **AND** 失敗訊息指出兩個回合數的實際值

#### Scenario: Reject a zero-damage lock
- **WHEN** 壓制詠唱的條件下玩家所有可用動作的單次傷害皆不超過敵方護甲
- **THEN** S2 失敗
- **AND** 該組合不得出現於任何章節

### Requirement: Winnability is proved by exhaustive search, not sampled
通過靜態篩檢的遭遇 SHALL 以窮舉搜尋證明可勝性。敵方行為為確定且預先揭示，因此該搜尋 SHALL 為單方可達性搜尋，而非對抗式搜尋。狀態 SHALL 編碼為可雜湊的元組（玩家生命、資源、詠唱進度、敵人生命、意圖索引、回合計數、一次性效果是否已用），並以記憶化深度優先搜尋求解；回合上限天然界定搜尋深度。

全部遭遇身分 × Power Floor 狀態包絡的枚舉 SHALL 於 CI 執行，並在每一次內容變更與每一次平衡數值變更後重跑。認證結果 SHALL 可快取：位元級確定性使某一內容版本的判定永久有效。

#### Scenario: Enumerate the whole space in CI
- **WHEN** 任何內容或平衡數值變更
- **THEN** 全部遭遇身分 × Power Floor 包絡被重新認證
- **AND** 出現未認證的遭遇時建置失敗

#### Scenario: Runtime assertion on uncertified content
- **WHEN** 玩家進入一個沒有認證紀錄的遭遇
- **THEN** 此為程式錯誤而非平衡問題，系統以明確失敗呈現
- **AND** 不以靜默降低難度掩蓋

### Requirement: Certification gates on margin, not merely on existence
「存在一條獲勝路線」SHALL NOT 作為通過標準。認證 SHALL 另外要求：

- **M1 生命餘裕**：最佳路線結束時玩家生命 >= 上限的 25%。
- **M2 開局廣度**：>= 3 個不同的合法第一手能通往獲勝路線。
- **M3 寬容度**：以有界深度的貪婪啟發式策略獲勝的路線比例，一般遭遇 >= 0.30，章節首領 >= 0.15。

判定 SHALL 分三級：`IMPOSSIBLE`（建置失敗）、`KNIFE_EDGE`（未達 M1–M3，建置失敗，除非由人以具名註解明確豁免）、`OK`。

M2 存在的理由：在位元級重來的遊戲中，只有唯一解的遭遇對大多數玩家等同死路，即使技術上可勝。

#### Scenario: Reject a single-solution encounter
- **WHEN** 某遭遇僅有一個合法第一手能通往獲勝
- **THEN** 判定為 `KNIFE_EDGE`，建置失敗
- **AND** 報告列出該遭遇與其唯一開局

#### Scenario: Chapter-level verification with carried health
- **WHEN** 以啟發式機器人在多個技巧層級遊玩大量章節種子
- **THEN** 以機器人實際抵達時的生命值計算，該章不含 `IMPOSSIBLE` 或 `KNIFE_EDGE` 遭遇
- **AND** 機器人勝率落在各技巧層級的目標區間

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
