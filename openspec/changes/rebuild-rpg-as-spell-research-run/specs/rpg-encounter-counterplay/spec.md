## ADDED Requirements

### Requirement: Every enemy demands an identifiable answer
系統 SHALL 以既有七隻敵人改造，不新增敵人定義。每隻敵人 SHALL 具備一項要求特定成分或特定節奏的機制，使「帶對殘頁」與「帶錯殘頁」產生可辨識的不同結果：無名怨魂僅受死語成分傷害；織索巨蛛每回合疊加束縛並於上限時判敗；空鎧騎士在未降護甲時使傷害趨近 0；鐵脊龍鱷對每個效果層反彈固定傷害；墓地魔狼的攻擊具打斷性；深淵守龍保留未格擋時的額外穿透；加茲納克保留移首破綻與反咒需求。

#### Scenario: Wrong loadout against an incorporeal enemy
- **WHEN** 玩家以不含死語成分的法術對無名怨魂施放
- **THEN** 該法術不造成傷害，且介面說明原因為非實體
- **AND** 同一場遭遇在帶有死語成分時產生可辨識的不同結果

#### Scenario: Multi-line spell against a reflecting enemy
- **WHEN** 玩家以多行法術攻擊鐵脊龍鱷
- **THEN** 每個效果層各反彈一次固定傷害，使高行數法術在此遭遇中劣於低行數法術
- **AND** 對照的低行數組成在相同 seed 下產生不同的生命結算

### Requirement: Enemy statistics do not scale with player power
敵方生命、護甲與傷害 SHALL NOT 依玩家等級、法術行數、已取得殘頁數或章節進度等比例放大。難度 SHALL 來自章節對應的固定敵人名單與各自的機制需求。

#### Scenario: Early enemies remain easy after growth
- **WHEN** 以章節後期的法術書對照章節前期的敵人名單
- **THEN** 前期敵人明顯較易擊敗，玩家的成長在結果上可被觀察
- **AND** 任何依玩家狀態調整敵方數值的實作不被接受

### Requirement: Modifiers expand encounters without new enemy definitions
系統 SHALL 提供可組合的敵人詞綴，作用於既有七隻敵人之上。詞綴 SHALL 只改變規則，SHALL NOT 要求新的像素圖；視覺區分 SHALL 以外框、角標或色彩達成。詞綴 SHALL 由 `run.random` 於章節生成時決定並記入章節快照，使章節重來時詞綴組合完全相同。

詞綴 SHALL NOT 產生新的見聞給予點：它提供難度與變化，不是收集目標；若計入給予點，總供給將隨詞綴數量爆增並破壞有界預算。

#### Scenario: The same enemy plays differently with a modifier
- **WHEN** 同一隻敵人分別以無詞綴與「緘默」詞綴出現
- **THEN** 兩場遭遇要求不同的法術配置，且結果可辨識地不同
- **AND** 兩者使用同一張敵人圖，僅以外框或角標區分

#### Scenario: Modifiers survive a chapter rewind unchanged
- **WHEN** 玩家在含詞綴的章節死亡並重來
- **THEN** 詞綴組合與首次進入完全相同
- **AND** 不存在藉由死亡重骰詞綴的序列

#### Scenario: Modifiers grant no insight
- **WHEN** 玩家首次擊敗帶有任一詞綴的敵人
- **THEN** 不因該詞綴給予額外見聞
- **AND** 該敵人本身的首殺給予點若尚未達成則正常給予一次

#### Scenario: No unwinnable modifier combination
- **WHEN** 以模擬掃描詞綴與配裝的組合
- **THEN** 不存在任何在已解鎖範圍內無論如何配裝皆不可能獲勝的組合
- **AND** 掃描結果可重現並記錄

### Requirement: Intents are telegraphed but not memorisable
敵方意圖序列 SHALL 由序列化的 `run.random` 抽取，SHALL NOT 使用固定輪播。各敵人的意圖數量 SHALL NOT 一律相同。介面 SHALL 在玩家行動前顯示敵方意圖及其是否具打斷性或穿透性，揭示數量依 `rpg-spell-research` 的承諾回合數規則決定。

#### Scenario: The same enemy varies between encounters
- **WHEN** 以不同 seed 對同一隻敵人進行兩場遭遇
- **THEN** 兩場的意圖序列不同，且固定的行動序列無法在兩場都達到相同結果
- **AND** 每一回合玩家仍能事先看到下一個意圖

#### Scenario: Replay reproduces the same intents
- **WHEN** 以相同 seed、相同起始狀態與相同行動序列重播一場遭遇
- **THEN** 意圖序列、傷害與結算結果完全一致
- **AND** PRNG 的 value 與 calls 與不中斷對照一致
