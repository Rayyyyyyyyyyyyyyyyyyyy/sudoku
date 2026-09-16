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

### Requirement: Encounters are certified against the reachable power frontier
因本輪拒絕等級縮放，敵方強度固定而玩家強度浮動，「這場是否可勝」是每種 build 一個答案。生命、資源與可用解法之間不存在可代表所有 build 的單一「最弱狀態」，系統 SHALL 因此為每個戰鬥節點列舉其 **Reachable Power Frontier**：所有能沿合法路徑抵達該節點入口的狀態，再安全消去可由另一個不更強狀態代表者後留下的弱勢狀態集合。

狀態 A 只有在生命與全部資源皆不高於狀態 B、可用行動集合為 B 的子集，且至少一項嚴格較弱時，才可作為 B 的弱勢代表；引擎另 SHALL 證明 B 能無代價模擬 A 的每個行動。無法證明此單調關係時不得消去任一狀態，而須保留兩者接受認證。

每個節點的遭遇身分 SHALL 對其入口 frontier 的每個狀態認證，不得把無法走到該節點的狀態做笛卡兒積，也不得以中位 build、單一官方弱勢 build 或只含最低數值的合成狀態代表。一般重來的可重現性使此判定為全稱而非統計：一個對某個可達 frontier 狀態不可勝的遭遇，對該玩家是永久死路而非一次壞運。付代價撤離是人因安全閥，不得作為通過認證的獲勝路線。

#### Scenario: Certify before committing a chapter
- **WHEN** 章節生成完成、尚未交付玩家
- **THEN** 該章每個戰鬥節點的遭遇身分皆已對其入口 Reachable Power Frontier 的每個狀態認證為可勝
- **AND** 任一身分未通過認證時，以明示的 `generationAttempt + 1` 重新產生，對同一 run seed 可重現

#### Scenario: A legal but incomparable weak build is not stranded
- **WHEN** 玩家以某節點入口 Reachable Power Frontier 的任一狀態進入該遭遇
- **THEN** 該遭遇存在不含撤離的獲勝路線
- **AND** frontier 的產生、支配消去與認證結果可被列舉與重現

#### Scenario: Preserve states when dominance is not provable
- **WHEN** 兩個可達狀態各自在生命、資源或可用行動上有優劣，或較強狀態無法無代價模擬較弱狀態
- **THEN** 兩個狀態皆保留於認證輸入
- **AND** 系統不以數值總分或主觀 build 排名消去其中之一

### Requirement: Static screens reject arithmetically impossible encounters
驗收 SHALL 在任何搜尋之前執行保守的閉式篩檢。篩檢只可用對玩家最有利的傷害上界與對敵人最不利的傷害下界證明「即使樂觀估計仍不可能」，不得以平均 DPS 或忽略多段、詠唱、減甲、打斷與多敵人的簡式誤拒合法遭遇：

- **S1**：以完整規則算出的理論最高傷害上界求最短擊殺回合；以理論最低承傷下界求最長存活回合。最短擊殺回合仍不小於最長存活回合時失敗。敵方成長、逐回合流失、護甲、詠唱與多目標皆須納入界限。
- **S2**：在壓制詠唱的條件下，僅以未被壓制的動作重算玩家最大DPS；結果 `<= 0` 時失敗（零DPS的無限迴圈）。
- **S3**：若每個能推進勝利的合法行動都會在擊殺或回復之前觸發反彈，且其最小可減免後數值仍足以致死，則失敗。

#### Scenario: Reject a clock-versus-duration dead end
- **WHEN** 某遭遇的擊殺所需回合數不小於存活可能回合數
- **THEN** S1 失敗，該遭遇身分不得出現
- **AND** 失敗訊息指出兩個回合數的實際值

#### Scenario: Reject a zero-damage lock
- **WHEN** 壓制詠唱的條件下玩家所有可用動作的單次傷害皆不超過敵方護甲
- **THEN** S2 失敗
- **AND** 該組合不得出現於任何章節

### Requirement: Winnability is proved by exhaustive search, not sampled
通過靜態篩檢的遭遇 SHALL 以資訊一致的窮舉搜尋證明可勝性。搜尋狀態只可包含該時點 UI 已揭示的敵方意圖，不得讓行動選擇讀取戰鬥 PRNG 或尚未揭示的未來意圖。搜尋 SHALL 形成 AND–OR 可達圖：玩家可選行動為 OR 節點；目前承諾範圍結束後所有 catalog 允許的下一意圖為 AND 節點，且每個分支都必須存在後續勝策。這不是敵人策略性選招的 minimax，但亦不得退化為偷看固定 seed 的單一路徑 DFS。

狀態 SHALL 編碼為可雜湊的資訊元組（玩家生命、資源、詠唱進度、敵人生命、已揭示意圖、回合計數、一次性效果是否已用），並以記憶化 AND–OR 搜尋求解；回合上限界定搜尋深度。實際遊玩仍由獨立戰鬥 PRNG 選出其中一個合法分支並持久化，因此相同 seed 與行動序列仍可重現。

全部可達「節點遭遇身分 × 該節點入口 Reachable Power Frontier 狀態」配對 SHALL 於 CI 執行，並在每一次內容、平衡數值、詞綴互斥表或路徑規則變更後重跑。遭遇身分包含基礎敵人與排序後的 canonical 詞綴集合。認證結果 SHALL 可快取：相同內容版本、seed domain 與 frontier 定義的判定永久有效。

#### Scenario: Enumerate the whole space in CI
- **WHEN** 任何內容或平衡數值變更
- **THEN** 全部可達的節點遭遇身分與其入口 Reachable Power Frontier 配對被重新認證
- **AND** 出現未認證的遭遇時建置失敗

#### Scenario: Reject a clairvoyant-only winning line
- **WHEN** 某個第一手只在尚未揭示的下一意圖為特定結果時能獲勝
- **THEN** 搜尋不因固定 fixture seed 恰好命中該結果而把第一手判為安全
- **AND** 只有能為全部合法未揭示分支提供後續勝策的第一手才計入可勝策略

#### Scenario: Runtime assertion on uncertified content
- **WHEN** 玩家進入一個沒有認證紀錄的遭遇
- **THEN** 此為程式錯誤而非平衡問題，系統以明確失敗呈現
- **AND** 不以靜默降低難度掩蓋

### Requirement: Certification gates on margin, not merely on existence
「存在一條獲勝路線」SHALL NOT 作為通過標準。認證 SHALL 另外要求：

- **M1 生命餘裕**：最佳路線結束時玩家生命 >= 上限的 25%。
- **M2 開局廣度**：>= 3 個結果不同的合法第一手能通往獲勝路線；純 UI 別名或結算等價動作不得重複計數。
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

### Requirement: Modifier exclusions are evidence-driven and escape is not proof
驗收 SHALL 枚舉每章可生成的 canonical 詞綴集合。`遲滯 + 淬毒` 與 `緘默 + 遲滯` 為已知禁止集合；新增禁止集合 SHALL 附上失敗的敵人、frontier 狀態與認證輸出，不得只以主觀難度列入。任何只靠付代價撤離才能前進的遭遇 SHALL 仍判定為 `IMPOSSIBLE` 或 `KNIFE_EDGE`，撤離成功不得改寫認證結果。

#### Scenario: Record evidence before expanding the exclusion table
- **WHEN** 某詞綴集合首次導致認證失敗
- **THEN** 報告保存敵人、canonical 詞綴集合、frontier 狀態與失敗原因
- **AND** 只有具名證據可讓該集合加入版本化互斥表

### Requirement: Loadout choice measurably changes outcomes
驗收 SHALL 證明配裝具有意義：每隻敵人 SHALL 存在兩組配裝，其獲勝所需回合數差異不低於 30%；每個章節 SHALL 存在一組配裝失敗而另一組成功的實例。

#### Scenario: Demonstrate loadout differentiation per enemy
- **WHEN** 對每隻敵人以兩組對照配裝於相同 seed 模擬
- **THEN** 兩組的獲勝回合數差異不低於 30%，或其一無法獲勝
- **AND** 差異來自機制需求而非單純的傷害數值高低

#### Scenario: Demonstrate that retrying with a new loadout matters
- **WHEN** 對每個章節提供一組失敗配裝與一組成功配裝
- **THEN** 兩者在相同章節基線下分別重現失敗與成功
- **AND** 該對照與章節重來的位元級一致性不衝突

### Requirement: No playtime claim without evidence
本輪 SHALL NOT 主張任何遊玩時長。v2 的「約三小時」主張與六位參與者門檻 SHALL 隨 `rpg-long-session-validation` 一併撤回。任何時長陳述 SHALL 附實測記錄與樣本數，SHALL NOT 由內容量換算。

#### Scenario: Report without a duration claim
- **WHEN** 本輪驗收完成並撰寫結案說明
- **THEN** 說明僅陳述已驗證的決策指標與離線行為，不含時長主張
- **AND** 若日後補上時長，明記樣本數與測試條件
