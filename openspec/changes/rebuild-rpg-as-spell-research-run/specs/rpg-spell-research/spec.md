## ADDED Requirements

### Requirement: Fragments carry exactly one component
系統 SHALL 以咒語殘頁作為唯一的法術素材。每張殘頁 SHALL 具備一個成分（活語、死語、獵鯨呼喊、駱駝詛咒、象鳴），為封閉列舉且於介面上可見。成分 SHALL 同時作為視覺識別（一成分一色），系統 SHALL NOT 依賴新增像素圖來區分殘頁。殘頁 SHALL 由遭遇、章節獎勵與研究取得，不得由重複造訪同一場景取得。

#### Scenario: Inspect a fragment before composing
- **WHEN** 玩家在研究畫面檢視一張殘頁
- **THEN** 介面以其成分的顏色與符號顯示，並說明該成分在法術中的效果取向
- **AND** 不顯示尚未取得的殘頁的效果數值

### Requirement: A fragment belongs to at most one spell
法術 SHALL 由 1–5 張殘頁串接組成。**一張殘頁同時 SHALL 只屬於一個法術**。把已配置殘頁放入另一個法術時，系統 SHALL 以單一原子 transition 將其由來源移至目的地；不得要求玩家先拆再裝，也不得短暫建立重複占用。目的法術已滿或超出已解鎖行數上限時，整個 transition SHALL 被拒絕且不改變 revision、資源或 PRNG。組成與拆解 SHALL 僅在戰鬥外進行，不消耗亂數。

殘頁獨佔為本系統唯一的稀缺性來源。若殘頁可同時存在於多個法術，蒐集即為單調累積、組成不含取捨，法術書將退化為只會變長的清單。

#### Scenario: Move an occupied fragment atomically
- **WHEN** 玩家把已在法術 A 中的殘頁放入仍有容量的法術 B
- **THEN** 該殘頁由法術 A 移至法術 B，任何可觀察狀態都不存在重複占用
- **AND** 操作不消耗資源或亂數

#### Scenario: Detach and reallocate
- **WHEN** 玩家把一張殘頁從法術 A 拆下並接入法術 B
- **THEN** 法術 A 減少一個效果層、法術 B 增加一個效果層，兩者的行數與魔力成本同步更新
- **AND** 該操作不消耗亂數

#### Scenario: Recompose between encounters
- **WHEN** 玩家在兩場遭遇之間重新組成法術
- **THEN** 新組成生效於下一場遭遇
- **AND** 戰鬥中送入的組成或拆解行動被拒絕

### Requirement: Fragments within a component are near-equal in power
同一成分內的殘頁 SHALL 以附帶條件與適用情境彼此區分，SHALL NOT 以單純的數值大小形成嚴格優劣排序。每個成分 SHALL 通過「最佳殘頁稽核」：不存在一張在所有情境下皆優於同成分其他張的殘頁。

此規則是殘頁獨佔能夠成立的前提。獨佔只有在同成分殘頁強度接近時才構成配置決策；一旦某張嚴格最強，獨佔就從「這張火焰要給哪個法術」退化為「一號法術拿好的、二號法術拿廢的」。本需求因此由可檢查的支配關係成立，不依賴外部作品的版本敘述。

#### Scenario: Audit a component for a strictly dominant fragment
- **WHEN** 對任一成分的全部殘頁執行稽核
- **THEN** 不存在任何一張在所有敵人與所有行數配置下皆不劣於同成分其他張
- **AND** 稽核失敗時該成分的數值須調整，不得以稀有度標記迴避

### Requirement: Counter components improve an answer but never become the only answer
反制型成分 SHALL 對所有敵人具備至少一項基礎效果，並在其目標情境取得顯著優勢；系統 SHALL NOT 讓尚需永久解鎖的成分成為某個可達敵人的唯一傷害來源。死語對一般敵人仍 SHALL 產生基礎效果，對非實體敵人則完整生效並取得額外優勢。

#### Scenario: Face an incorporeal enemy before unlocking death speech
- **WHEN** 玩家尚未解鎖死語但遭遇非實體敵人
- **THEN** 既有法術仍存在低效率但可勝的傷害路線
- **AND** 解鎖死語後，同一遭遇出現可量測的效率提升而非由不可勝變成唯一可勝

### Requirement: Reallocation is free, instant and unlimited outside combat
拆解與重新配置殘頁 SHALL 不消耗任何資源、不需要確認對話、不設冷卻、不限次數，且 SHALL NOT 消耗亂數。把一張已配置於其他法術的殘頁移入新法術 SHALL 直接**移動**它並在原位置留下空缺提示，SHALL NOT 以「該殘頁已被占用」的錯誤中止操作。拖曳不得是唯一操作；觸控與鍵盤 SHALL 提供「選取殘頁 → 選取目的格」的等價流程。

介面 SHALL 在單一畫面同時呈現全部法術與其行，以及一個常駐的「未配置」區；任一持有中的殘頁 SHALL 始終可見於法術或未配置區之一，不得隱藏於需要導覽才能抵達之處。系統 SHALL NOT 讓任何持有中的殘頁處於靜默失效狀態：若其配置位置使其不產生效果，介面 SHALL 明示該情形。

#### Scenario: Move an allocated fragment in one gesture
- **WHEN** 玩家把已配置於法術 A 的殘頁拖入法術 B
- **THEN** 該殘頁移動至法術 B，法術 A 顯示空缺
- **AND** 過程不需先行拆解、不需確認、不消耗資源或亂數

#### Scenario: Inert placement is disclosed
- **WHEN** 某張殘頁因其所在位置而不產生任何效果
- **THEN** 介面於該殘頁上明示其目前無作用及原因
- **AND** 系統不靜默保留無作用的配置

#### Scenario: Reallocate without dragging
- **WHEN** 玩家以鍵盤或點按選取一張殘頁，再選取另一法術的空格
- **THEN** 結果與拖曳移動相同
- **AND** 全流程可在不使用精細拖曳手勢下完成

### Requirement: Pool size and acquisition rate are bounded and staged
出貨的殘頁總數 SHALL 不少於 40 張，目標 60 張（每成分 12 張），v1 上限 75 張。稀有度分布 SHALL 約為常見 50%、罕見 33%、稀有 17%，且稀有度 SHALL 調節情境性與波動幅度，SHALL NOT 調節絕對強度。

單趟取得量 SHALL 為 10–14 張，來自約 12 次「三選一」的取得事件。同時呈現的選項 SHALL NOT 超過 3 個。取得與組成介面 SHALL 僅於遭遇之間開啟，SHALL NOT 於戰鬥中開啟。

持有上限 SHALL 明顯低於可放置格數總和（法術數 × 行數上限），維持在其 60–75%，使玩家無法填滿全部格位。成分解鎖 SHALL 作為有效池的分段閘門並於規格中明列各階段的有效池大小，避免全池於早期即被看盡。

#### Scenario: Hold cap creates allocation pressure
- **WHEN** 玩家在某階段持有達上限的殘頁
- **THEN** 可放置格數總和大於持有上限，玩家無法同時填滿所有法術
- **AND** 新取得時系統開啟與現有持有並列的替換介面，而非以「已滿」拒絕

#### Scenario: Effective pool is staged by unlocks
- **WHEN** 玩家僅解鎖部分成分
- **THEN** 該階段的有效池依規格所列縮減
- **AND** 各階段的有效池與單趟取得量的比值落在規格所定區間

### Requirement: Line count is spell level and position is neutral unless linked
法術的行數 SHALL 即為其等級；系統 SHALL NOT 另設獨立的等級數值或傷害倍率欄位。每一行 SHALL 貢獻一個效果層；提升等級 SHALL 表現為新增一種行為，不得僅表現為既有效果數值的放大。行數 SHALL NOT 超過 `profile` 目前已解鎖的行數上限。

活語、死語與象鳴的效果 SHALL 與所在位置無關。唯一具語意的順序關係 SHALL 為：每一個獵鯨呼喊效果層只要前方存在至少一個駱駝詛咒效果層，即先套用介面所列的合計降甲，再取得一次明示的重擊加成；更多前置駱駝詛咒只依各殘頁明示數值改變合計降甲，不額外倍增重擊加成。該關係 SHALL 以帶實際數值的連線顯示。系統 SHALL NOT 使用「只影響緊鄰下一格」、回繞、洗牌或任何未顯示的求值規則。

#### Scenario: Add a line and gain a new behaviour
- **WHEN** 玩家在既有法術後接上一張未被占用的殘頁
- **THEN** 該法術獲得一個新的效果層，且其行為與加線前有可辨識的差異
- **AND** 僅提高既有效果數值而不新增行為的組成不被視為滿足本需求

#### Scenario: Respect the unlocked line cap
- **WHEN** 玩家嘗試組成超出已解鎖行數上限的法術
- **THEN** 該組合被拒絕並說明目前上限
- **AND** 狀態與 PRNG 不變

#### Scenario: Neutral components keep the same result after reordering
- **WHEN** 玩家只調換活語、死語或象鳴殘頁的相對位置
- **THEN** 法術預覽與實際結算結果不變
- **AND** 介面不暗示不存在的先後差異

#### Scenario: Armour break visibly links to a later heavy strike
- **WHEN** 駱駝詛咒位於獵鯨呼喊之前
- **THEN** 兩者間顯示含降甲與重擊加成數值的連線，實際結算與預覽一致
- **AND** 駱駝詛咒不必緊鄰獵鯨呼喊

### Requirement: Auto-arrange exposes the best explicit ordering without hidden changes
研究畫面 SHALL 提供一鍵「整理」。整理 SHALL 固定活語、死語與象鳴所在格，只對其餘格中的駱駝詛咒／獵鯨呼喊子序列做穩定分組：全部駱駝詛咒置於全部獵鯨呼喊之前，兩組內各自維持原相對順序。「整理」控制項 SHALL 在啟動前顯示將新增的有效重擊連線數；鍵盤焦點或指標懸停 MAY 額外顯示 ghost preview。單次點按、點擊或鍵盤啟動後 SHALL 立即以一個原子 transition 套用，不得再要求確認。整理後的連線與效果差異 SHALL 立即可見。整理 SHALL 不消耗資源或亂數，已處於此 canonical 順序時 SHALL 為 no-op。

#### Scenario: Arrange a spell in one action
- **WHEN** 「整理」顯示將新增的連線數，玩家點按、點擊或以鍵盤啟動一次
- **THEN** 系統不顯示確認對話，立即以單一 transition 套用穩定排序結果
- **AND** 不改變法術成員、中立成分所在格、同組殘頁的相對順序、資源或 PRNG

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
