## ADDED Requirements

### Requirement: Every enemy demands an identifiable answer
系統 SHALL 以既有七隻敵人改造，不新增敵人定義。每隻敵人 SHALL 具備一項偏好特定成分或特定節奏的機制，使「帶對殘頁」與「帶錯殘頁」產生可辨識的效率差異，但不得讓尚需永久解鎖的成分成為唯一可勝解：無名怨魂使一般成分只能造成低效率傷害而死語完整生效；織索巨蛛每回合疊加束縛並於上限時判敗；空鎧騎士以高護甲偏好降甲解法但仍須保留低效率傷害路線；鐵脊龍鱷每次玩家行動觸發一次固定、可減免且有上限的反傷；墓地魔狼的攻擊具打斷性；深淵守龍保留未格擋時的額外穿透；加茲納克保留移首破綻與反咒需求。

#### Scenario: Wrong loadout against an incorporeal enemy
- **WHEN** 玩家以不含死語成分的法術對無名怨魂施放
- **THEN** 該法術仍造成低效率傷害，介面說明減免原因為非實體
- **AND** 同一場遭遇在帶有死語成分時產生可量測的效率提升

#### Scenario: Multi-line spell against a reflecting enemy
- **WHEN** 玩家以多行法術攻擊鐵脊龍鱷
- **THEN** 同一行動內各傷害效果層的固定反傷先加總，再套用上限與減免，最後只結算一次
- **AND** 不以法術總行數直接判定反傷較高；非傷害層不增加此反傷加總

### Requirement: Enemy statistics do not scale with player power
敵方生命、護甲與傷害 SHALL NOT 依玩家等級、法術行數、已取得殘頁數或章節進度等比例放大。難度 SHALL 來自章節對應的固定敵人名單與各自的機制需求。

#### Scenario: Early enemies remain easy after growth
- **WHEN** 以章節後期的法術書對照章節前期的敵人名單
- **THEN** 前期敵人明顯較易擊敗，玩家的成長在結果上可被觀察
- **AND** 任何依玩家狀態調整敵方數值的實作不被接受

### Requirement: Reflected damage is flat, capped, mitigable and disclosed
任何反傷效果（鐵脊龍鱷的基礎特性，以及任何具反傷性質的詞綴）SHALL 為固定數值而非玩家傷害的百分比，SHALL 可被玩家的防禦手段減免，且 SHALL 設有以生命上限為基準的單次上限。同一次玩家行動至多 SHALL 結算一次反傷，SHALL NOT 每一段傷害各觸發一次。

鐵脊龍鱷 SHALL 將同一行動內每個造成傷害的效果層所對應固定反傷加總後，再套用單次上限與減免，最後以一次結算呈現。迴響詞綴 SHALL 只在每場遭遇第一個造成傷害的玩家行動觸發一次固定反傷，之後標記為已消耗；其數值 SHALL NOT 隨該行動的傷害段數增加。

反傷的實際數值 SHALL 於玩家承諾該行動之前顯示於意圖揭示中。未標示數值的反傷違反本設計的完全資訊承諾，屬缺陷而非難度。

鐵脊龍鱷 SHALL 以傷害效果層的固定反傷加總表達多傷害層法術的代價，不以法術總行數比較優劣。固定每層反傷、單次上限與減免條件後，增加傷害層 SHALL 使實際反傷不減；達到上限或被減免完全吸收時 SHALL 允許相等，加入非傷害層亦 SHALL NOT 直接增加反傷。上限限制單次傷害，不保證低生命角色不會死亡；確切反傷 SHALL 在承諾前揭示。本需求不依賴外部作品的版本敘述。

#### Scenario: More damaging layers increase crocodile reflection below the cap
- **WHEN** 以相同玩家與敵人狀態比較對鐵脊龍鱷的兩個傷害行動，該敵人不帶迴響或其他反傷來源，每個傷害層的固定反傷相同且大於零，兩個行動都未達上限且沒有反傷減免，其中一個含更多傷害層
- **THEN** 更多傷害層的行動承受較高的反傷，兩者皆只結算一次
- **AND** 兩個數值在玩家承諾前皆已顯示

#### Scenario: Capped crocodile reflection can be equal
- **WHEN** 在相同上限與減免條件下，兩個對鐵脊龍鱷的傷害行動其固定反傷加總皆已達單次上限，且沒有其他反傷來源
- **THEN** 兩者套用上限與減免後的反傷相等，即使傷害層數不同
- **AND** 驗收不要求較多傷害層必須受到更高反傷

#### Scenario: Non-damaging lines do not add crocodile reflection
- **WHEN** 對鐵脊龍鱷的法術增加一個非傷害層，且原傷害層、反傷上限、減免與其他反傷觸發條件皆不變
- **THEN** 龍鱷反傷保持相同
- **AND** 驗收不把法術總行數增加視為反傷必須增加

#### Scenario: Echo reflects the same amount regardless of hit count
- **WHEN** 從同一遭遇進場快照分別施放不同傷害層數或段數的首個傷害行動，敵人僅有迴響反傷，且兩個行動的反傷上限與減免條件相同
- **THEN** 兩個對照中的迴響反傷相等，各觸發一次後標記為已消耗
- **AND** 各自後續的傷害行動均不再觸發迴響

#### Scenario: Reflect is visible before commitment
- **WHEN** 玩家檢視具反傷敵人的意圖
- **THEN** 反傷的觸發條件與確切數值可見
- **AND** 玩家可據此選擇行數

### Requirement: Modifiers are telegraphed on four channels, colour last
詞綴的視覺區分 SHALL NOT 以外框顏色作為主要或唯一通道。細外框顏色是可用通道中最弱的一個：色彩辨識能力隨空間頻率升高而急遽下降，且在足夠小的刺激下**色覺正常者亦會失去辨色能力**（小視野藍黃色盲）；於行進中的手機上，細外框接近最壞情況。

戰鬥畫面中的每一個已疊加詞綴 SHALL 以獨立 badge 同時使用下列通道呈現，優先序由高至低：

1. **常駐文字標籤**（非懸停或展開後才可見）
2. **徽章外形**：六種可辨的外輪廓（圓、三角、方、六角、菱、盾），SHALL NOT 以相同圓形底中的不同圖示區分
3. **badge 線條樣式**：點線、雙線、長虛線、短虛線、粗實線、實線加偏移陰影——六者於純灰階下皆可區分
4. **badge 顏色**：作為辨識加速，取自 Okabe-Ito 色覺通用設計色盤，且所選各色須另有明度差異

badge 線寬 SHALL 不小於 3 邏輯像素。系統 SHALL NOT 以紅對綠承載語意。徽章 SHALL 置於不透明底片上，與敵人圖像及背景皆維持至少 3:1 對比，於淺色與深色主題皆成立。敵人共用外框 MAY 顯示整體危險度，但 SHALL NOT 代表任何單一詞綴。

驗收 SHALL 將完整 badge 集合以紅色盲、綠色盲、藍黃色盲模擬器及純灰階各渲染一次，並要求六者兩兩於四種渲染下皆可區分。戰鬥畫面 SHALL 將全部詞綴名稱常駐顯示；地圖節點 SHALL 使用最多三枚緊湊 badge，焦點或點選後的詳情區 SHALL 顯示完整名稱。系統 SHALL 提供「高對比詞綴標籤」選項。

#### Scenario: Modifiers remain distinguishable without colour
- **WHEN** 將六個詞綴的徽章與外框以純灰階渲染
- **THEN** 六者兩兩可區分
- **AND** 三種色盲模擬渲染下亦同

#### Scenario: Modifier identity is readable at a glance on a moving train
- **WHEN** 玩家在戰鬥畫面檢視敵人
- **THEN** 詞綴名稱以常駐文字呈現，不需展開或懸停
- **AND** 徽章外形與線條樣式在不依賴顏色的情況下即可辨識

### Requirement: Modifiers form canonical, bounded stacks
系統 SHALL 提供可疊加的敵人詞綴，作用於既有七隻敵人之上。詞綴 SHALL 只改變規則，SHALL NOT 要求新的像素圖。每個遭遇的詞綴 SHALL 為不重複、無語意順序的集合，持久化與建立遭遇身分前 SHALL 依固定 enum 排序。

詞綴數量 SHALL 依章節控制：第一章 0–1、第二章 1、第三章 1–2、第四章 2、終章 2–3；精英在章節基礎上 +1，但總上限仍為 3。遭遇身分 SHALL 定義為基礎敵人與排序後詞綴集合，不得以單詞綴的 `7 × 6` 估算可用身分。

`遲滯 + 淬毒` 與 `緘默 + 遲滯` SHALL 列入版本化的 `forbiddenModifierSets`；任何包含已禁止集合的較大集合亦 SHALL 被禁止。其餘組合只可在 Reachable Power Frontier 認證提供具名失敗證據後加入；生成器 SHALL 從已通過認證的 canonical 集合直接選取，不得以無界重抽尋找可用組合。詞綴集合 SHALL 由節點座標 seed 派生並記入章節圖，使章節重來時完全相同。

詞綴 SHALL NOT 產生新的見聞給予點：它提供難度與變化，不是收集目標；若計入給予點，總供給將隨詞綴數量爆增並破壞有界預算。

#### Scenario: The same enemy plays differently with a modifier
- **WHEN** 同一隻敵人分別以無詞綴與「緘默」詞綴出現
- **THEN** 兩場遭遇要求不同的法術配置，且結果可辨識地不同
- **AND** 兩者使用同一張敵人圖，以獨立 badge 區分詞綴

#### Scenario: Canonicalise a stacked identity
- **WHEN** 同一敵人收到內容相同但輸入順序不同的詞綴集合
- **THEN** 驗證後的排序、遭遇身分與 seed key 完全相同
- **AND** 重複詞綴、超過章節上限或命中互斥集合的輸入被拒絕

#### Scenario: Reject a proven impossible pair without rerolling forever
- **WHEN** 生成器為節點選擇詞綴集合
- **THEN** 候選只來自該章已通過認證的 canonical 集合
- **AND** `遲滯 + 淬毒`、`緘默 + 遲滯` 不可生成，流程不以無界重抽達成

#### Scenario: Modifiers survive a chapter rewind unchanged
- **WHEN** 玩家在含詞綴的章節死亡並重來
- **THEN** 詞綴組合與首次進入完全相同
- **AND** 不存在藉由死亡重骰詞綴的序列

#### Scenario: Modifiers grant no insight
- **WHEN** 玩家首次擊敗帶有任一詞綴的敵人
- **THEN** 不因該詞綴給予額外見聞
- **AND** 該敵人本身的首殺給予點若尚未達成則正常給予一次

#### Scenario: No unwinnable modifier combination
- **WHEN** 以認證搜尋掃描每個可達遭遇與其節點入口 Reachable Power Frontier
- **THEN** 不存在任何對某個可達弱勢狀態只能撤離而無法獲勝的詞綴集合
- **AND** 掃描結果可重現並記錄

### Requirement: Intents are telegraphed but not memorisable
每場遭遇 SHALL 由 `hash(runSeed, chapterIndex, generationAttempt, nodeId, "combat")` 建立獨立且可序列化的戰鬥 PRNG，敵方意圖序列由該 PRNG 抽取，SHALL NOT 使用固定輪播或依賴其他節點消耗的全域流。各敵人的意圖數量 SHALL NOT 一律相同。介面 SHALL 在玩家行動前顯示敵方意圖及其是否具打斷性或穿透性，揭示數量依 `rpg-spell-research` 的承諾回合數規則決定。

#### Scenario: The same enemy varies between encounters
- **WHEN** 以 catalog 指定的兩個差異 fixture seed 對同一隻敵人進行遭遇
- **THEN** 兩場的意圖序列不同，且差異可由相同動作前綴重現
- **AND** 每一回合玩家仍能事先看到下一個意圖

#### Scenario: Replay reproduces the same intents
- **WHEN** 以相同 seed、相同起始狀態與相同行動序列重播一場遭遇
- **THEN** 意圖序列、傷害與結算結果完全一致
- **AND** PRNG 的 value 與 calls 與不中斷對照一致
