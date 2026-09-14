## ADDED Requirements

### Requirement: Fragments carry exactly one component
系統 SHALL 以咒語殘頁作為唯一的法術素材。每張殘頁 SHALL 具備一個成分（活語、死語、獵鯨呼喊、駱駝詛咒、象鳴），為封閉列舉且於介面上可見。成分 SHALL 同時作為視覺識別（一成分一色），系統 SHALL NOT 依賴新增像素圖來區分殘頁。殘頁 SHALL 由遭遇、章節獎勵與研究取得，不得由重複造訪同一場景取得。

#### Scenario: Inspect a fragment before composing
- **WHEN** 玩家在研究畫面檢視一張殘頁
- **THEN** 介面以其成分的顏色與符號顯示，並說明該成分在法術中的效果取向
- **AND** 不顯示尚未取得的殘頁的效果數值

### Requirement: A fragment belongs to at most one spell
法術 SHALL 由 1–5 張殘頁串接組成。**一張殘頁同時 SHALL 只屬於一個法術**；要用於另一個法術，SHALL 先從原法術拆下。已被占用的殘頁被接入第二個法術的嘗試 SHALL 被拒絕且不改變 revision、資源或 PRNG。組成與拆解 SHALL 僅在戰鬥外進行，不消耗亂數。

殘頁獨佔為本系統唯一的稀缺性來源。若殘頁可同時存在於多個法術，蒐集即為單調累積、組成不含取捨，法術書將退化為只會變長的清單。

#### Scenario: Reject reusing an occupied fragment
- **WHEN** 玩家嘗試把已在法術 A 中的殘頁接入法術 B
- **THEN** 該組合被拒絕並說明該殘頁已被占用
- **AND** 狀態、資源與 PRNG 的 value/calls 均不變

#### Scenario: Detach and reallocate
- **WHEN** 玩家把一張殘頁從法術 A 拆下並接入法術 B
- **THEN** 法術 A 減少一個效果層、法術 B 增加一個效果層，兩者的行數與魔力成本同步更新
- **AND** 該操作不消耗亂數

#### Scenario: Recompose between encounters
- **WHEN** 玩家在兩場遭遇之間重新組成法術
- **THEN** 新組成生效於下一場遭遇
- **AND** 戰鬥中送入的組成或拆解行動被拒絕

### Requirement: Line count is the spell level and each line adds behaviour
法術的行數 SHALL 即為其等級；系統 SHALL NOT 另設獨立的等級數值或傷害倍率欄位。第 N 行 SHALL 貢獻第 N 個效果層並依序結算。提升等級 SHALL 表現為新增一種行為，不得僅表現為既有數值的放大。行數 SHALL NOT 超過 `profile` 目前已解鎖的行數上限。

#### Scenario: Add a line and gain a new behaviour
- **WHEN** 玩家在既有法術後接上一張未被占用的殘頁
- **THEN** 該法術獲得一個新的效果層，且其行為與加線前有可辨識的差異
- **AND** 僅提高既有效果數值而不新增行為的組成不被視為滿足本需求

#### Scenario: Respect the unlocked line cap
- **WHEN** 玩家嘗試組成超出已解鎖行數上限的法術
- **THEN** 該組合被拒絕並說明目前上限
- **AND** 狀態與 PRNG 不變

### Requirement: Long spells cost casting turns and can be interrupted
魔力成本 SHALL 等於行數。1–2 行 SHALL 即時發動；3–4 行 SHALL 需要 1 個詠唱回合；5 行 SHALL 需要 2 個詠唱回合。詠唱期間受到帶 `interrupt` 的敵方意圖命中時，法術 SHALL 失效並退還一半魔力（向下取整）。詠唱狀態 SHALL 於戰鬥結束時清除，不跨遭遇保留。系統 SHALL NOT 使用機率失敗率決定施法成敗。

#### Scenario: Interrupt a long cast
- **WHEN** 玩家起手一個需要詠唱的法術，敵方於詠唱期間使出帶 `interrupt` 的意圖
- **THEN** 法術失效、退還一半魔力（向下取整），且該回合未產生法術效果
- **AND** 該意圖的打斷性在玩家起手前已可見

#### Scenario: Finish a cast unharassed
- **WHEN** 玩家起手詠唱且詠唱期間未被 `interrupt` 命中
- **THEN** 法術於詠唱完成的回合結算其全部效果層
- **AND** 勝利、撤離或下一場戰鬥不帶入前一場的詠唱狀態

### Requirement: Revealed intents match the turns the player commits
介面揭示的敵方意圖數 SHALL 等於玩家被要求承諾的回合數：一回合詠唱揭示 1 個意圖，兩回合詠唱揭示 2 個。系統 SHALL NOT 要求玩家在未揭示的意圖上承諾多回合行動。揭示 SHALL 採漸進方式——預設顯示 1 個，玩家考慮需要詠唱的法術時展開對應數量——以避免常態性的資訊過載。

#### Scenario: Reveal two intents for a two-turn cast
- **WHEN** 玩家將焦點移至一個需要 2 個詠唱回合的法術
- **THEN** 介面顯示接下來 2 個敵方意圖及其打斷性與穿透性
- **AND** 玩家可在完整資訊下決定是否起手

#### Scenario: No hidden-information commitment
- **WHEN** 檢視任何需要多回合承諾的行動
- **THEN** 其涵蓋的每一個敵方意圖在承諾前皆可見
- **AND** 不存在需要玩家賭未揭示意圖的行動

### Requirement: Mana is a real resource
格擋 SHALL 至多恢復 1 點魔力。系統 SHALL NOT 提供任何在戰鬥中無代價且可無限重複的魔力來源。魔力最終成本至少 1，傷害至少 0。

#### Scenario: Guard cannot sustain unlimited casting
- **WHEN** 對照「每回合交替格擋與施法」的固定序列與敵方任一意圖表
- **THEN** 該序列無法無限維持高行數法術的施放
- **AND** 玩家必須在行數、詠唱風險與魔力存量之間取捨
