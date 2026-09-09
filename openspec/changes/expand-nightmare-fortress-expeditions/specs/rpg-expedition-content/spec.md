## ADDED Requirements

### Requirement: Bounded source-derived expansion
系統 SHALL 提供森林盟約與三日龍鱷圍困、鋼門後互斥的交涉／辨夢路線、歧義歸鄉記錄三個擴寫單元，保留 Sacnoth 主線因果與西式劍與魔法題材；本輪 SHALL NOT 增加程序地圖、可回訪刷獎房間或其餘全部原典章節。

#### Scenario: Follow the expanded expedition
- **WHEN** 玩家由村莊出發，選擇圍困並完成任一堡內路線
- **THEN** 玩家可依序取得異鋼、鍛造 Sacnoth、進堡並走到既有巫師終戰及勝利結算
- **AND** 未選專精／遺物的永久解鎖不會成為通關必要條件

### Requirement: Substantive content inventory
內容 SHALL 相較 38 節／91 選項基線淨增至少 24 個實質節點與 60 個選項，總數至少 62／151；每池 SHALL 有八件事件，兩池共 16 件，新八件 SHALL 計入節點增量。實作 SHALL 提供逐 ID 的新增／改寫、事件歸屬、前置、後果與來源清單；拆段、改名、重複或單純數值換皮 SHALL NOT 算新增實質內容。每件新事件 SHALL 有至少兩個不同後果選項，其中至少四件 SHALL 有跨場景後果。

#### Scenario: Audit the authored inventory
- **WHEN** 對照 baseline 與候選 `story.ts` 及內容清單
- **THEN** 統計滿足節點、選項與事件門檻，且八個新增事件未重複加算
- **AND** 每個計入的新節點有可達路徑、新敘事資訊或決策後果，不是空白過場

### Requirement: Three-day survival route
圍困線 SHALL 以三個白晝、兩個中間夜晚的單向時段表達三日禁食；每時段 SHALL 有至少兩種有不同後果的選擇。森林盟約 SHALL 至少在其中一個後續時段改變支援。只有成功持續阻止進食至第三日結束 SHALL 取得異鋼，攻擊降低 HP SHALL NOT 成為本路線殺死龍鱷的方式。

#### Scenario: Complete the fast without using real time
- **WHEN** 玩家完成五個時段並在每次威脅中阻止龍鱷進食
- **THEN** 第三日後龍鱷餓死且可進入鍛造，不需要現實等待
- **AND** 履約與未履約的相同後续選擇產生可辨識的支援差異

#### Scenario: Lose supplies or abandon the siege
- **WHEN** 補給為零、生命不足或玩家允許龍鱷進食
- **THEN** 介面明示可行的生命代價選項或撤離；生命歸零進戰敗，進食使圍困失敗並撤離
- **AND** 失敗不給異鋼、不重設第一日、不重複發永久獎勵

#### Scenario: Choose the existing compressed route
- **WHEN** 玩家選快速遭遇而非三日圍困
- **THEN** 系統保留可完成的快速路線，文本來源說明明示其回合戰是遊戲壓縮改編

### Requirement: Mutually exclusive fortress consequences
Porte Resonant SHALL 呈現龍吠與可理解的警戒後果。交涉線 SHALL 展開駱駝衛隊和兩百侍者，辨夢線 SHALL 展開火眼夢女和牆中狼；每線 SHALL 至少四個實質場景、三次有效決策、一項跨場景後果，並在深淵主線前匯流。每趟 SHALL 只走其中一線，不可同趟取得兩線全部利益。

#### Scenario: Carry information beyond its origin
- **WHEN** 玩家在鋼門宣名並於所選堡內路線取得情報
- **THEN** 後一個場景顯示警戒造成的代價，守龍或終戰亦顯示情報造成的提示／準備差異
- **AND** 切換未選路線的入口不可用，匯流後仍可完成主線

### Requirement: Persistent ambiguous accounts
系統 SHALL 提供至多六項去重的跨趟敘事見聞，至少涵蓋英雄傳說、熱病、人物不存在三種相互矛盾的歸鄉記錄；顯示記錄 SHALL 依已見線索與結果決定，SHALL NOT 裁定唯一真相。見聞 SHALL 保留於戰敗／撤離後並提示未探索方向，不發額外永久貨幣或設計強制刷取門檻。

#### Scenario: Revisit a known ending account
- **WHEN** 已收錄尾聲再次出現或尾聲畫面重新載入
- **THEN** 見聞只保留一個對應 ID，勝利與貨幣不再次結算
- **AND** 未見版本仍以可探索方向呈現，已見版本可在遠征外閱讀

### Requirement: Executable text and provenance remain authoritative
`src/data/rpg/story.ts` SHALL 是劇情、選項、敘事記錄與條件文本的唯一可執行來源；閱讀稿 SHALL 由 `npm run rpg:text` 產生。每個新增／改寫節點 SHALL 有 provenance，混合場景 SHALL 在 note 區分原典意象及原創機制並提供可回查定位；純原創因果 SHALL NOT 偽標成 Sacnoth 原作。

#### Scenario: Review a source-inspired mechanic
- **WHEN** 審閱森林支援、警戒、傳話失真或尾聲選擇規則
- **THEN** provenance 能區分 repo 原典索引中的素材與新增規則，生成閱讀稿與執行文本一致

### Requirement: Feasible acyclic story graph
內容驗證 SHALL 檢查 DAG、事件池邊、目的地／敵人／物品／flag 參照、消耗前置及結局；正常引擎可達狀態 SHALL 有合法前進、撤離或結局出口，禁止負資源及回訪一次性獎勵。

#### Scenario: Exhaust resources before a branch
- **WHEN** 路線測試以可合法抵達的低資源狀態進入新增支線
- **THEN** 不足資源的選項附原因且拒絕時不扣資源，仍存在合法出口或明示戰敗
