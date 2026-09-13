## ADDED Requirements

### Requirement: Fragments carry a component and a rhyme
系統 SHALL 以咒語殘頁作為唯一的法術素材。每張殘頁 SHALL 具備一個成分（活語、死語、獵鯨呼喊、駱駝詛咒、象鳴）與一個韻，兩者皆為封閉列舉且於介面上可見。殘頁 SHALL 由遭遇、章節獎勵與研究取得，不得由重複造訪同一場景取得。

#### Scenario: Inspect a fragment before composing
- **WHEN** 玩家在研究畫面檢視一張殘頁
- **THEN** 介面顯示其成分、韻與該成分在法術中的效果取向
- **AND** 不顯示尚未取得的殘頁的效果數值

### Requirement: A spell is same-rhyme fragments in sequence
法術 SHALL 由 1–5 張殘頁串接組成，且**所有殘頁必須同韻**。異韻殘頁的組合 SHALL 被拒絕且不改變 revision、資源或 PRNG。組成與變更 SHALL 僅在戰鬥外進行，不消耗亂數。

#### Scenario: Reject a mixed-rhyme composition
- **WHEN** 玩家嘗試把不同韻的殘頁接入同一個法術
- **THEN** 該組合被拒絕並說明原因為韻不相同
- **AND** 狀態、資源與 PRNG 的 value/calls 均不變

#### Scenario: Recompose between encounters
- **WHEN** 玩家在兩場遭遇之間重新組成法術
- **THEN** 新組成生效於下一場遭遇，且不消耗亂數
- **AND** 戰鬥中送入的組成行動被拒絕

### Requirement: Line count is the spell level and each line adds behaviour
法術的行數 SHALL 即為其等級；系統 SHALL NOT 另設獨立的等級數值或傷害倍率欄位。第 N 行 SHALL 貢獻第 N 個效果層並依序結算。提升等級 SHALL 表現為新增一種行為，不得僅表現為既有數值的放大。

#### Scenario: Add a line and gain a new behaviour
- **WHEN** 玩家在既有法術後接上一張同韻殘頁
- **THEN** 該法術獲得一個新的效果層，且其行為與加線前有可辨識的差異
- **AND** 僅提高既有效果數值而不新增行為的組成不被視為滿足本需求

### Requirement: Long spells cost casting turns and can be interrupted
魔力成本 SHALL 等於行數。1–2 行 SHALL 即時發動；3–4 行 SHALL 需要 1 個詠唱回合；5 行 SHALL 需要 2 個詠唱回合。詠唱期間受到帶 `interrupt` 的敵方意圖命中時，法術 SHALL 失效並退還一半魔力（向下取整）。詠唱狀態 SHALL 於戰鬥結束時清除，不跨遭遇保留。系統 SHALL NOT 使用機率失敗率決定施法成敗。

#### Scenario: Interrupt a long cast
- **WHEN** 玩家起手一個需要詠唱的法術，敵方於詠唱期間使出帶 `interrupt` 的意圖
- **THEN** 法術失效、退還一半魔力（向下取整），且該回合未產生法術效果
- **AND** 介面在起手前已顯示敵方的下一個意圖與其是否具打斷性

#### Scenario: Finish a cast unharassed
- **WHEN** 玩家起手詠唱且詠唱期間未被 `interrupt` 命中
- **THEN** 法術於詠唱完成的回合結算其全部效果層
- **AND** 勝利、撤離或下一場戰鬥不帶入前一場的詠唱狀態

### Requirement: Mana is a real resource
格擋 SHALL 至多恢復 1 點魔力。系統 SHALL NOT 提供任何在戰鬥中無代價且可無限重複的魔力來源。魔力最終成本至少 1，傷害至少 0。

#### Scenario: Guard cannot sustain unlimited casting
- **WHEN** 對照「每回合交替格擋與施法」的固定序列與敵方任一意圖表
- **THEN** 該序列無法無限維持高行數法術的施放
- **AND** 玩家必須在行數、詠唱風險與魔力存量之間取捨
