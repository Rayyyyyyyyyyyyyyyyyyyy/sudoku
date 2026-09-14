## ADDED Requirements

### Requirement: A run is five chapters of six nodes with a short final chapter
一趟遠征 SHALL 由 5 個章節組成。章節 1–4 SHALL 各含 6 個節點，其第 6 個節點為該章首領。章節 5 SHALL 為 3 個節點的固定終章（聖所 → 精英 → 最終首領），總計 27 個節點、約 22 場戰鬥。

數字的依據：Slay the Spire 每幕 15 節點 + 首領、三幕約 48 節點、45–70 分鐘，即每節點約 69 秒；縮至 27 節點對應約 28 分鐘，落在 roguelite 公認的 20–30 分鐘區間。終章縮短取自 Slay the Spire 第四幕與 Hades 的 Styx，兩者皆刻意把最後一區壓成腳本化的短收尾。

章節大小 SHALL 由重來成本決定而非由內容量決定：重來 15 個節點令人厭煩，重來 6 個節點仍是可接受的再挑戰。終章的 3 節點同時使最昂貴的一段成為最便宜的重來單位。

#### Scenario: A chapter is one commute-sized session
- **WHEN** 玩家自章節起點連續遊玩至章節首領
- **THEN** 該章為 6 個節點的完整段落，並於結束時提供明確的停止點
- **AND** 章節邊界同時是存檔點、回復點與敘事斷點

### Requirement: The chapter map is three lanes, fully revealed, with previewed encounters
章節地圖 SHALL 為 3 欄 × 6 列，SHALL NOT 橫向捲動。3 欄於 360px 寬度下每欄約 100px，可容納 64px 節點與 36px 間距；Slay the Spire 的 7 欄在該寬度下每欄僅約 45px，不可採用。

進入章節時 SHALL 一次揭示整張地圖，包含每個節點的類型。戰鬥節點 SHALL 於進入前預覽其遭遇身分（基礎敵人標記與詞綴標記）。

預覽是本設計的必要條件而非增益：殘頁獨佔使組成成為配置決策，而配置決策必須在知道將面對什麼的前提下才成立。若玩家在不知遭遇內容的情況下組成法術，配置即為擲骰，殘頁獨佔這根支柱隨之失效。全圖揭示同時使重來從重骰變成最佳化謎題——同一張地圖、同樣的敵人，改變路線與配裝。

#### Scenario: Plan a route with full information
- **WHEN** 玩家進入新章節
- **THEN** 整張 3×6 地圖與每個節點的類型、每個戰鬥節點的遭遇身分皆可見
- **AND** 玩家可在選路前比較不同路徑所需的法術配置

#### Scenario: Rewind preserves the map
- **WHEN** 玩家在章節中死亡並重來
- **THEN** 地圖形狀、節點類型與遭遇身分與首次進入完全相同
- **AND** 玩家可據此改變路線或配裝

### Requirement: Node types follow a forced skeleton plus a weighted remainder
每章的第 1 個節點 SHALL 為來自簡單池的普通戰鬥。章節 1–4 的第 6 個節點 SHALL 為章節首領。每章 SHALL 於第 4–5 個節點之間保證一個聖所（回復與重新組成）。

其餘節點 SHALL 依權重指派：戰鬥 50%、精英 18%、事件 16%、聖所 11%、補給 5%。事件比例 SHALL NOT 高於 16%：在無新美術的前提下事件是純文字畫面，Slay the Spire 的 22% 會使行進中的手機閱讀量過高。

節點類型 SHALL 以文字標籤與形狀區分，SHALL NOT 超過 5 種加首領；每增加一種類型即需要一個可辨識的標記，而本輪不產出新美術。

#### Scenario: Every chapter opens gently
- **WHEN** 玩家進入任一章節的第一個節點
- **THEN** 該節點為簡單池的普通戰鬥
- **AND** 玩家在遭遇更高強度內容前已有一次熱身

#### Scenario: A rest is always reachable before the boss
- **WHEN** 檢視任一章節的地圖
- **THEN** 第 4–5 個節點之間存在至少一個聖所
- **AND** 該聖所並非固定落在首領前一格，位置在窗口內變動

### Requirement: Placement constraints prevent degenerate maps
地圖生成 SHALL 遵守下列限制：

- 精英與聖所 SHALL NOT 出現在任一章節的第 1–2 個節點。
- 精英、補給與聖所 SHALL NOT 沿同一路徑連續出現。
- 聖所 SHALL NOT 出現在保證聖所的前一格。
- 同一個遭遇身分 SHALL NOT 於同一章節內重複；全趟至多重複 2 次。
- 一個具有兩條以上出口的節點，其去向 SHALL 為不同類型。
- 路徑 SHALL NOT 交叉；前兩條路徑 SHALL 由不同的第一列節點出發，使起點恆有兩個以上。
- 連續 3 個權重節點皆指派為戰鬥時，下一個權重指派 SHALL 排除戰鬥。

#### Scenario: Reject a special-node cluster
- **WHEN** 生成的路徑使精英、補給或聖所連續相鄰
- **THEN** 該地圖被拒絕並重新生成
- **AND** 重新生成使用同一章節種子的下一個推導值，不改變其他章節

#### Scenario: No repeated identity within a chapter
- **WHEN** 檢視任一章節的全部戰鬥節點
- **THEN** 其遭遇身分兩兩相異
- **AND** 全趟重複的身分不超過 2 個

### Requirement: Progress is saved at every turn, not every node
系統 SHALL 於每一回合結束後持久化狀態，SHALL NOT 僅於節點邊界存檔。5 行法術需要 2 個詠唱回合，玩家可能在詠唱中途離開；恢復 SHALL 還原至該回合的精確狀態，包含詠唱進度。

章節邊界 SHALL 呈現明確的停止建議，使玩家知道何處是自然的離開點。

#### Scenario: Resume mid-cast
- **WHEN** 玩家在詠唱進行中關閉應用程式並於稍後重新開啟
- **THEN** 戰鬥還原至該回合，詠唱進度保留
- **AND** 敵方意圖與揭示深度與離開前一致
