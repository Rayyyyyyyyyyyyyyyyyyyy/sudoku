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

### Requirement: A chapter baseline has a certified non-escape completion strategy
系統 SHALL 從每份可交付的章節基線證明存在不靠撤離的完整通關策略。策略可選路、在戰前免費重配及根據已揭示意圖選招；戰鬥中不得重配。一般重來不變更基線，付代價撤離提交的新基線亦 SHALL 有通關證明。新基線的證明從撤離後開始，撤離本身不得被算作擊敗敵人。

**Reachable Power Frontier** 在本 change 中 SHALL 指認證通關策略因全部合法敵方意圖分支所產生的節點入口資產集合（生命、魔力、持有殘頁、解鎖），不再量化玩家任意耗損資源後的全部狀態。每個入口皆需存在合法配裝及符合 M1–M3 的後續勝策；節點間實際生命與魔力必須沿用前一場的證明終點，不得合成滿資源入口或拿其他路徑的殘頁做笛卡兒積。以任意失誤配裝失敗時允許回章節基線重新規劃，不能因此把基線判為死局。

狀態 A 只有在生命及全部資源皆不高於 B、可用行動集合為 B 的子集，且引擎證明 B 能無代價模擬 A 的每個行動時，才可代表 B。無法證明時兩者均保留；不得用數值總分排序配裝。輸出 SHALL 保存基線、策略、所有敵方分支、入口資產與重配證人，不能只提供成功 seed。

#### Scenario: Certify before committing a chapter
- **WHEN** 章節生成完成、尚未交付玩家
- **THEN** 從該章基線存在一個涵蓋全部合法意圖分支且不靠撤離的通關策略
- **AND** 任一必要入口或後續分支未通過時拒絕該候選，有限重試及 fallback 仍須通過相同門檻

#### Scenario: Recompose without replenishing resources
- **WHEN** 認證從前一場的勝利終點繼續至下一場
- **THEN** 可以用當前持有殘頁免費重配，但不回復生命或魔力
- **AND** 配裝失敗／成功對照使用相同資產與相同章節基線

#### Scenario: Preserve incomparable carried states
- **WHEN** 已認證策略的兩個敵方分支產生不可安全互相代表的資產狀態
- **THEN** 下一個節點分別驗證兩個入口
- **AND** 不以較容易的分支代替另一個

#### Scenario: An exhausted deviation can retry rather than invalidate the baseline
- **WHEN** 玩家採取非認證策略的合法操作而以零魔力抵達後續節點
- **THEN** 不聲稱該耗損入口仍有至少三種獲勝開局，也不自動回滿資源
- **AND** 失敗後依既定章節基線重來，已認證的通關策略仍可重現

### Requirement: Static screens reject arithmetically impossible encounters
驗收 SHALL 在任何搜尋之前執行保守的閉式篩檢。篩檢只可用對玩家最有利的傷害上界與對敵人最不利的傷害下界證明「即使樂觀估計仍不可能」，不得以平均 DPS 或忽略多段、詠唱、減甲、打斷與多敵人的簡式誤拒合法遭遇：

- **S1**：以完整規則算出的理論最高傷害上界求最短擊殺回合；以理論最低承傷下界求最長存活回合。只有最早可能擊殺事件仍晚於最晚可能存活事件時才可拒絕；若回合數相等，須依規格結算次序比較回合內事件，不能單憑 `>=` 判為失敗。敵方成長、逐回合流失、護甲、詠唱與多目標皆須納入界限。
- **S2**：在壓制詠唱的條件下，僅以未被壓制的動作重算玩家最大DPS；結果 `<= 0` 時失敗（零DPS的無限迴圈）。
- **S3**：若每個能推進勝利的合法行動都會在擊殺或回復之前觸發反彈，且其最小可減免後數值仍足以致死，則失敗。

#### Scenario: Reject a clock-versus-duration dead end
- **WHEN** 某遭遇即使採樂觀界限，最早可能擊殺事件仍晚於最晚可能存活事件
- **THEN** S1 失敗，該遭遇身分不得出現
- **AND** 失敗訊息指出兩個界限及其回合內事件次序；界限不足以證明時交由搜尋

#### Scenario: Reject a zero-damage lock
- **WHEN** 壓制詠唱的條件下，以傷害保底、破甲、降甲、多段與全部合法非傷害準備效果推導後，樂觀的可達傷害上界仍為 0
- **THEN** S2 失敗
- **AND** 該組合不得出現於任何章節

### Requirement: Winnability is proved by exhaustive search, not sampled
通過靜態篩檢的遭遇 SHALL 以資訊一致的窮舉搜尋證明可勝性。搜尋狀態只可包含該時點 UI 已揭示的敵方意圖，不得讓行動選擇讀取戰鬥 PRNG 或尚未揭示的未來意圖。搜尋 SHALL 形成 AND–OR 可達圖：玩家可選行動為 OR 節點；每次免費預覽或回合推進需要揭示尚未知的意圖時，所有 catalog 允許的揭示結果為 AND 節點，揭示後玩家仍有 OR 選擇（包含改施短法術），且每個分支都必須存在後續勝策。這不是敵人策略性選招的 minimax，但亦不得退化為偷看固定 seed 的單一路徑 DFS。

狀態 SHALL 編碼為可雜湊的資訊元組（玩家生命、資源、詠唱進度、敵人生命、已揭示且尚未消耗的意圖佇列、回合計數、一次性效果是否已用），並以記憶化 AND–OR 搜尋求解；回合上限界定搜尋深度。實際遊玩仍由獨立戰鬥 PRNG 選出其中一個合法分支並持久化，因此相同 seed 與行動序列仍可重現。

全部認證策略可達「節點遭遇身分 × 該節點入口 Reachable Power Frontier 狀態」配對 SHALL 於 CI 執行，並在每一次內容、平衡數值、詞綴互斥表或路徑規則變更後重跑。遭遇身分包含基礎敵人與排序後的 canonical 詞綴集合。認證結果 SHALL 可快取：相同內容版本、seed domain 與 frontier 定義的判定永久有效。

#### Scenario: Enumerate the whole space in CI
- **WHEN** 任何內容或平衡數值變更
- **THEN** 全部章節基線證明及策略入口 Reachable Power Frontier 配對被重新認證
- **AND** 出現未認證的遭遇時建置失敗

#### Scenario: Reject a clairvoyant-only winning line
- **WHEN** 某個第一手只在尚未揭示的下一意圖為特定結果時能獲勝
- **THEN** 搜尋不因固定 fixture seed 恰好命中該結果而把第一手判為安全
- **AND** 只有能為全部合法未揭示分支提供後續勝策的第一手才計入可勝策略

#### Scenario: Runtime assertion on uncertified content
- **WHEN** 玩家進入沒有符合目前規則／內容版本之章節基線認證的內容
- **THEN** 此為程式錯誤而非平衡問題，系統以明確失敗呈現；玩家合法耗損後偏離策略的資產狀態本身不觸發此錯誤
- **AND** 不以靜默降低難度掩蓋

### Requirement: Certification gates on margin, not merely on existence
「存在一條獲勝路線」SHALL NOT 作為通過標準。認證 SHALL 另外要求：

- **M1 生命餘裕**：存在資訊一致的勝策，使所有敵方分支結束時玩家生命 >= 上限的 25%。
- **M2 開局廣度**：在每種可揭示開局下，>= 3 個結果不同的合法第一手能對所有後續意圖分支通往獲勝路線；免費預覽不計為第一手；純 UI 別名或結算等價動作不得重複計數。
- **M3 寬容度**：以有界深度的貪婪啟發式策略獲勝的路線比例，一般遭遇 >= 0.30，章節首領 >= 0.15。

判定 SHALL 分三級：`IMPOSSIBLE`（建置失敗）、`KNIFE_EDGE`（未達 M1–M3，建置失敗，除非由人以具名註解明確豁免）、`OK`。

M2 存在的理由：在位元級重來的遊戲中，只有唯一解的遭遇對大多數玩家等同死路，即使技術上可勝。

#### Scenario: Reject a single-solution encounter
- **WHEN** 某遭遇僅有一個合法第一手能通往獲勝
- **THEN** 判定為 `KNIFE_EDGE`，建置失敗
- **AND** 報告列出該遭遇與其唯一開局

#### Scenario: Chapter-level verification with carried health
- **WHEN** 從已認證章節策略的全部敵方意圖分支計算跨戰鬥資源
- **THEN** 以策略實際抵達時的生命值計算，該策略不含 `IMPOSSIBLE` 或 `KNIFE_EDGE` 遭遇
- **AND** 報告另列有限啟發式策略的寬容度，不用其勝率代替通關證明

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

### Requirement: Search resource exhaustion is never a gameplay verdict
搜尋 SHALL 區分玩法的失敗終點與計算資源不足。深度或節點預算耗盡但尚未得到完整證明時 SHALL 回報 `UNKNOWN`，不得判為 `IMPOSSIBLE` 或 `OK`，亦不得產生可供生成器採用的認證。記憶化鍵 SHALL 包含剩餘搜尋深度、完整資訊狀態與內容／規則版本；未揭示 PRNG 不得納入玩家決策。

#### Scenario: Do not certify an unfinished search
- **WHEN** 搜尋在仍有必要分支尚未完成時達到計算預算
- **THEN** 結果為 `UNKNOWN`，建置認證閘門不通過
- **AND** 報告保存預算、已展開節點數與耗盡原因，不偽稱不存在獲勝策略
