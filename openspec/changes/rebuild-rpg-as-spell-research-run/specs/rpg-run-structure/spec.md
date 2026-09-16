## ADDED Requirements

### Requirement: A run traverses five finite chapters with a short final chapter
一趟遠征 SHALL 由 5 個章節組成。章節 1–4 SHALL 各有 6 列；每列最多提供 3 個候選節點，玩家每列實際走訪 1 個，第 6 列為單一章節首領。章節 5 SHALL 為 3 列的固定單一路徑終章（聖所 → 精英 → 最終首領）。成功走完整趟時玩家實際走訪 27 個節點；此數字 SHALL NOT 被解讀為五張地圖的候選節點總數。

6 列是基於章節重來成本採用的起始結構，終章縮短則取自多款作品的短收尾形態。任何遊玩分鐘數只可列為待實測假設，不得由節點數換算後宣稱為已驗證時長。

#### Scenario: A chapter forms one resumable segment
- **WHEN** 玩家在章節 1–4 自章節起點連續遊玩至章節首領
- **THEN** 該章為走訪 6 列的完整段落，並於結束時提供明確的停止點
- **AND** 章節邊界同時是存檔點、回復點與敘事斷點

#### Scenario: The final chapter uses its fixed three-row exception
- **WHEN** 系統建立第 5 章
- **THEN** 地圖恰為單一起點、單一路徑的聖所 → 精英 → 最終首領，共 3 列
- **AND** 不套用章節 1–4 的首列戰鬥、第 4–5 列聖所、前兩列特殊節點禁令、特殊節點不得連續或至少兩個起點規則
- **AND** 仍驗證遭遇身分不重複、詞綴合法性、可勝性、章節基線與逐回合持久化

### Requirement: The chapter map is three lanes, fully revealed, with previewed encounters
章節 1–4 的地圖 SHALL 為最多 3 欄 × 6 列，SHALL NOT 橫向捲動；不是每一格都必須有候選節點。3 欄於 360px 寬度下每欄約 100px，可容納 64px 節點與 36px 間距。終章 SHALL 為 1 欄 × 3 列。

進入章節時 SHALL 一次揭示整張地圖，包含每個候選節點的類型。戰鬥節點 SHALL 於進入前預覽其遭遇身分（基礎敵人標記與最多三枚排序後詞綴 badge）；焦點或點選節點後 SHALL 在詳情區顯示全部詞綴名稱。

預覽是本設計的必要條件而非增益：殘頁獨佔使組成成為配置決策，而配置決策必須在知道將面對什麼的前提下才成立。若玩家在不知遭遇內容的情況下組成法術，配置即為擲骰，殘頁獨佔這根支柱隨之失效。全圖揭示同時使重來從重骰變成最佳化謎題——同一張地圖、同樣的敵人，改變路線與配裝。

#### Scenario: Plan a route with full information
- **WHEN** 玩家進入新章節
- **THEN** 整張最多 3×6 的候選圖與每個節點的類型、每個戰鬥節點的遭遇身分皆可見
- **AND** 玩家可在選路前比較不同路徑所需的法術配置

#### Scenario: Rewind preserves the map
- **WHEN** 玩家在章節中死亡並重來
- **THEN** 地圖形狀、節點類型與遭遇身分與首次進入完全相同
- **AND** 玩家可據此改變路線或配裝

### Requirement: Node types follow a forced skeleton plus a weighted remainder
章節 1–4 的第 1 列 SHALL 只提供來自簡單池的普通戰鬥，第 6 列 SHALL 為單一章節首領；每條可達路徑 SHALL 於第 4–5 列之間經過一個聖所（回復與重新組成）。第 5 章 SHALL 使用固定的聖所 → 精英 → 最終首領骨架，不執行節點類型的權重指派，也不要求不存在的第 4–5 列聖所。

章節 1–4 的其餘候選節點 SHALL 依權重指派：戰鬥 50%、精英 18%、事件 16%、聖所 11%、補給 5%。權重適用於候選節點，不代表單一路徑必須精確符合比例。事件比例 SHALL NOT 高於 16%：在無新美術的前提下事件是純文字畫面，較高比例會使行進中的手機閱讀量過重。

節點類型 SHALL 以文字標籤與形狀區分，SHALL NOT 超過 5 種加首領；每增加一種類型即需要一個可辨識的標記，而本輪不產出新美術。

#### Scenario: The first four chapters open gently
- **WHEN** 玩家檢視章節 1–4 任一章的第一列
- **THEN** 所有可選節點皆為簡單池的普通戰鬥
- **AND** 玩家在遭遇更高強度內容前已有一次熱身

#### Scenario: A rest is always reachable before the boss
- **WHEN** 檢視章節 1–4 任一章的地圖
- **THEN** 每條可達路徑在第 4–5 列之間皆經過一個聖所
- **AND** 聖所可位於第 4 或第 5 列，不固定為首領前一格

### Requirement: Placement constraints prevent degenerate maps
地圖生成 SHALL 遵守下列限制；逐條標示章節範圍，第 5 章的固定骨架 SHALL NOT 被章節 1–4 的放置限制拒絕：

- 章節 1–4：精英與聖所 SHALL NOT 出現在第 1–2 列。
- 章節 1–4：精英、補給與聖所 SHALL NOT 沿同一路徑連續出現。
- 章節 1–4：聖所 SHALL NOT 出現在保證聖所的前一格。
- 全部五章：同一個遭遇身分（基礎敵人 + canonical 詞綴集合）SHALL NOT 於同一章節內重複；單一路徑全趟至多重複 2 次。
- 章節 1–4：一個具有兩條以上出口的節點，其去向 SHALL 為不同類型。
- 全部五章：路徑 SHALL NOT 交叉。章節 1–4 另 SHALL 至少有兩條可達路徑由不同的第一列節點出發；第 5 章 SHALL 恰有一個起點。
- 章節 1–4：連續 3 個權重節點皆指派為戰鬥時，下一個權重指派 SHALL 排除戰鬥。

生成 SHALL 設定版本化且有限的 `MAX_GENERATION_ATTEMPTS`。每次拒絕只可增加 `generationAttempt`，不得改變 `runSeed` 或其他章節。嘗試額度耗盡時 SHALL 使用同內容版本的已驗證安全模板，並以具名 `fallback` domain 填入該章已認證的遭遇身分；不得無限重試、卡住主執行緒或接受未通過限制的地圖。

#### Scenario: Reject a special-node cluster
- **WHEN** 章節 1–4 生成的路徑使精英、補給或聖所連續相鄰
- **THEN** 該地圖被拒絕並重新生成
- **AND** 重新生成使用明示的 `generationAttempt + 1` 派生值，不改變其他章節且對同一 run seed 可重現

#### Scenario: Exhaust generation attempts safely
- **WHEN** 同一章的候選地圖連續被拒絕直到 `MAX_GENERATION_ATTEMPTS` 耗盡
- **THEN** 系統使用版本化安全模板與具名 `fallback` domain 產生合法地圖
- **AND** 流程有限、可重現，且不接受未認證遭遇

#### Scenario: No repeated identity within a chapter
- **WHEN** 檢視任一章節的全部候選戰鬥節點
- **THEN** 其遭遇身分兩兩相異
- **AND** 任一可達單一路徑全趟重複的身分不超過 2 個

### Requirement: Progress is saved at every turn, not every node
系統 SHALL 於每一回合結束後持久化狀態，SHALL NOT 僅於節點邊界存檔。5 行法術需要 2 個詠唱回合，玩家可能在詠唱中途離開；恢復 SHALL 還原至該回合的精確狀態，包含詠唱進度。

章節邊界 SHALL 呈現明確的停止建議，使玩家知道何處是自然的離開點。

#### Scenario: Resume mid-cast
- **WHEN** 玩家在詠唱進行中關閉應用程式並於稍後重新開啟
- **THEN** 戰鬥還原至該回合，詠唱進度保留
- **AND** 敵方意圖與揭示深度與離開前一致
