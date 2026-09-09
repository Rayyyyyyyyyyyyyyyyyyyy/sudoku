# 成語填字研究與規則設計

研究日期：2026-09-06；主要來源覆核：2026-09-09
適用 OpenSpec 變更：`add-idiom-crossword`

## 結論

成語填字沒有單一權威規則，市面上的「成語填字」其實是三種不同的遊戲共用一個名字。要先選定是哪一種，否則規格會自相矛盾：

1. **縱橫填字（crossword lattice）**：盤面由縱橫交錯的四格詞條組成，交叉處共用一個字，玩家把散落的候選字填進空格。本次直接查核的 App Store 與 Google Play「成語填填字」產品皆採這種玩法；研究沒有據此推論整體市場占比。
2. **成語填空（cloze）**：單一成語挖掉 1–2 個字，從選項中選出正確的字。題目彼此獨立，沒有交叉限制。
3. **成語 Wordle（漢兜類）**：猜一個四字成語，每次猜完用顏色回報字與讀音的正確程度。

本專案採用第 1 種。它是唯一同時具備「盤面即狀態」「無時間壓力」「隨時可中斷」三個通勤條件，又能像數獨一樣做確定性出題與唯一解驗證的形式。第 2 種太薄、缺乏推理深度；第 3 種的難點全在讀音資料（見下文「為什麼不先做 Wordle 型」）。

## 證據等級

| 標記 | 意義 | 可否直接鎖進實作 |
| --- | --- | --- |
| `verified` | 已直接讀取原始頁面、官方文件、論文或原始碼並確認 | 可 |
| `inferred` | 由二手介紹或同類產品行為推定 | 可，但需標記為可替換 |
| `designed` | 本專案自行決定，外部無對應規則 | 可，需在 spec 說明理由 |

### 來源覆核範圍

2026-09-09 已在可直接讀取原文的環境重新查核關鍵來源。證據只涵蓋各來源明載的內容，不把產品文案、授權條款或演算法論文延伸成未寫出的結論：

| 來源 | 直接來源與存取日 | 本文採用的證據 | 限制 |
| --- | --- | --- | --- |
| Apple App Store、Google Play | [App Store 產品頁](https://apps.apple.com/tw/app/%E6%88%90%E8%AA%9E%E5%A1%AB%E5%A1%AB%E5%AD%97-%E6%88%90%E8%AA%9E%E6%8E%A5%E9%BE%8D%E7%9B%8A%E6%99%BA%E8%A7%A3%E8%AC%8E%E5%B0%8F%E9%81%8A%E6%88%B2/id1466180579)、[Google Play 產品頁](https://play.google.com/store/apps/details?id=com.wordpuzzle.chengyu&hl=zh_TW)，2026-09-09 | 交錯詞格、下方候選字、難度遞增、逐關解鎖、提示／求助 | 只代表這個被查核產品，不代表整體市場占比 |
| 教育部語文成果網 | [公眾授權網](https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/index.html)、[成語典使用說明](https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/idiomsdict_10409.pdf)，2026-09-09 | CC BY-ND 3.0 TW、標示方式、個別條目不得改寫或簡化、發布版本 | 是否能只發布條目的單一欄位未被文件明說，本文不自行擴張授權解釋 |
| 國家教育研究院 | [FAQ 第 2 頁](https://www.naer.edu.tw/PageFaq/go_page?page=2)，2026-09-09 | 正文 5,000 餘條、附錄 20,000 餘條、合計可查詢超過 25,000 條 | 這是官方概數，不用來取代特定下載檔的逐筆量測 |
| 演算法論文 | [Filling Crosswords Is Very Hard](https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.ISAAC.2021.36)、[Conflict-Directed Backjumping Revisited](https://www.cs.cmu.edu/afs/cs/project/jair/pub/volume14/chen01a.pdf)、[Automation Strategies for Unconstrained Crossword Puzzle Generation](https://arxiv.org/abs/2007.04663)，2026-09-09 | 固定盤面不重用詞的 NP-hard 結果、CSP 建模、回溯策略 | 三篇分別支持不同主張，不混為單一複雜度證明 |
| Handle 原始碼 | [constants.ts](https://github.com/antfu/handle/blob/main/src/logic/constants.ts)、[types.ts](https://github.com/antfu/handle/blob/main/src/logic/types.ts)、[utils.ts](https://github.com/antfu/handle/blob/main/src/logic/utils.ts)，2026-09-09 | 四字、十次、exact／misplaced／none 等結果語意 | CSS theme token 不足以證明使用者看見的固定色名 |

**Task 1 的覆核結果（2026-09-06）**：實作 corpus pipeline 時把三個資料來源整個 clone 下來直接讀檔，其中兩項原數字需更正：

| 項目 | 初次記載 | 覆核後（`verified`） |
| --- | --- | --- |
| 成語典正文筆數 | 5,123 條 | **5,450 筆**（四字且不重複者 5,270） |
| THUOCL 成語表授權 | Apache-2.0 | **MIT** |
| THUOCL 成語表筆數 | 8,519 條 | 8,519 行（四字 7,874）— 相符 |

## 一、既有玩法調查

### 縱橫填字型（本專案採用）

「成語填填字」產品頁直接描述：盤面由橫豎空格組成，玩家依已知文字把下方零散候選字填入縱橫交錯的詞語空格；產品並明載難度逐步提高、關卡逐步解鎖，以及提示或好友求助功能。[App Store 成語填填字](https://apps.apple.com/tw/app/%E6%88%90%E8%AA%9E%E5%A1%AB%E5%A1%AB%E5%AD%97-%E6%88%90%E8%AA%9E%E6%8E%A5%E9%BE%8D%E7%9B%8A%E6%99%BA%E8%A7%A3%E8%AC%8E%E5%B0%8F%E9%81%8A%E6%88%B2/id1466180579)、[Google Play 成語填填字](https://play.google.com/store/apps/details?id=com.wordpuzzle.chengyu&hl=zh_TW)（`verified`／2026-09-09 直接查核商店產品頁）

線上題庫型產品會提供橫縱向提示，玩家可自選要顯示哪一格的答案，也可以單字或單詞為單位求助。[線上版成語填字遊戲](https://briian.com/79061/)、[Holyfree 成語填字](https://www.holyfree.net/cw/)（`inferred`／二手介紹）

三項可以直接沿用的設計慣例：

- 候選字放在盤面下方成池，用點選填入，不使用輸入法。
- 難度以關卡遞增，而不是以時間壓力呈現。
- 提示分層：先給單字，再給整個詞條。

### 結構來源的限制

本專案所需的結構證據只取自上列已直接查核的商店產品頁：橫豎詞格彼此交錯、每格容納一個候選字。產品頁不支持對所有中文填字遊戲題材或市場占比的概括，因此原先「中文填字大多使用成語或俚語」的說法已移除。（`verified`／2026-09-09）

英文填字的黑格對稱慣例（180 度旋轉對稱、無孤立白格）源自報紙排版傳統，對成語盤面沒有意義：成語一律四字，盤面是四格線段的網狀連接，不是可變長度的詞彙填充。**不採用對稱慣例。**（`designed`）

### 生成演算法

已知較精確的複雜度結論是：給定固定格局與詞典、每詞不可重用的填字問題，即使格局圖受嚴格結構限制，仍為 **NP-hard**；本文不把它改寫成所有「填字生成」問題皆為 NP-Complete。[Filling Crosswords Is Very Hard](https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.ISAAC.2021.36)（`verified`／ISAAC 2021 原始論文）

工程上可把固定格局填詞建模為 CSP：每個未知詞槽是變數、值域是詞典，二元約束要求交叉字一致，並加上詞不得重用的限制。[Conflict-Directed Backjumping Revisited](https://www.cs.cmu.edu/afs/cs/project/jair/pub/volume14/chen01a.pdf) 第 5.3 節（`verified`／JAIR 原始論文）。回溯是另一個分開的實作策略來源，[Automation Strategies for Unconstrained Crossword Puzzle Generation](https://arxiv.org/abs/2007.04663) 明述以後進先出與貪婪選擇進行 backtracking（`verified`／原始論文）。

**成語盤面比一般填字容易得多**，因為所有詞長固定為 4：

- 不需要先設計黑白格樣式再找詞填入，可以直接由詞長出發長出盤面。
- 索引 `(字, 位置) -> 成語[]` 對 5,000 條成語只有 20,000 筆，全部放記憶體。
- 交叉點的候選集可以 O(1) 查表，回溯深度等於詞條數（4–12），不是格數。

因此本專案採「由詞生盤」而非「由盤填詞」。（`designed`）

## 二、資料來源與授權

### 教育部《成語典》（採用）

**正文實際筆數（task 1.1 覆核，`verified`）**：直接讀取資料檔 `dict_idioms_2020_20240926.xls`（2020 年版，檔案日期 2024-09-26）的既有 JSON 轉換 `database.json`，取自 [`c5b5eae` of jfsblog/Idiom-Search-Engine](https://github.com/jfsblog/Idiom-Search-Engine/tree/c5b5eae731fb3f4e565f802aa91be354cb91bcd9)，得到 **5,450 筆**正文條目。這是特定來源檔的逐筆量測，不是官方網站對所有可查內容的統計。

5,450 筆中字面恰為四字者 **5,271 筆**，其餘 179 筆為三字（124）、五字（23）、六字（11）、七字（7）、九字（13）、十字（1），例如「依樣畫葫蘆」「不入虎穴，焉得虎子」「破天荒」。另有 1 筆重複字面（「含沙射影」）。剔除後入庫 **5,270 條**。

[國家教育研究院 FAQ](https://www.naer.edu.tw/PageFaq/go_page?page=2) 的官方概數為：正文收錄 **5,000 餘條**、附錄收錄 **20,000 餘條**，合計可查詢 **超過 25,000 條**（`verified`／2026-09-09 直接查核）。本文已移除先前無法由原頁支持的精確總數；本專案仍不採用附錄，見「待決事項」。

[教育部國語辭典公眾授權網](https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/index.html) 於 2026-09-09 公布的《成語典》最新版為 **2020_20260625**，授權為 **創用 CC 姓名標示－禁止改作 3.0 臺灣**，允許重製、散布及傳輸（包含商業利用），但不得改作，且須依使用說明標示教育部、辭典名稱、版本與網址。[官方使用說明](https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/idiomsdict_10409.pdf) 另明載個別條目的成語、注音、釋義、典源、書證及用法說明不得修改或簡化；依官方對照表轉換字碼，或不影響完整條目內容的調整，才可能不構成改作（`verified`／2026-09-09）。

本專案目前只發布成語字面與自行計算的 tier。官方文件沒有明說「只發布單一欄位」是否屬允許利用，因此本文不再宣稱可任意篩選欄位；若擴充或重新發布完整資料，應先依官方條款另行確認。g0v 的 JSON 轉換可作工程參考，但不能取代官方授權文字。[g0v/moedict-data](https://github.com/g0v/moedict-data)

**這對實作有三個硬性約束：**

- 可以依官方明載範圍重製、散布與傳輸；格式或字碼調整必須維持個別條目完整內容，本文不推定單欄位摘錄的法律效果。
- **不可以改寫釋義文字**。若要在遊戲內顯示釋義，必須逐字照錄，不可為了排版而濃縮或改寫。
- 必須在 `THIRD_PARTY_NOTICES.md` 依官方格式標示教育部、辭典名稱、版本與網址，比照現有 Sudoku Exchange Puzzle Bank 的作法。

已有第三方完成格式轉換可直接參考：[wastu01/chinese_dictionary_collection](https://github.com/wastu01/chinese_dictionary_collection)（成語典轉 JSON，明列 CC BY-ND 3.0 TW 與 CC0 雙層授權）、[jfsblog/Idiom-Search-Engine](https://github.com/jfsblog/Idiom-Search-Engine)（僅取成語典正文，排除重編國語辭典的四字常用詞；未載明授權）。

### 詞頻分級的問題

5,270 條正文仍包含大量通勤時想不出來的冷僻成語，直接全用會讓難度失控。可用的詞頻來源：

- **THUOCL 成語表**：`data/THUOCL_chengyu.txt`，**8,519 行**（其中四字 7,874 條），附 DF（document frequency）詞頻值。授權為 **MIT**（repo 根目錄 `LICENSE`），不是先前引用的 Apache-2.0；README 的「开源协议」另要求論文引用時聲明使用了清華大學開放中文詞庫。[`a30ce79` of thunlp/THUOCL](https://github.com/thunlp/THUOCL/tree/a30ce79d895d01ab5132a5c74c29703ff7efb4cc)（`verified`／已直接讀取 clone 內的檔案與授權；筆數與授權均已覆核，授權欄位**更正**為 MIT）
- 問題：THUOCL 是簡體，與繁體成語典對齊需要簡繁轉換，而簡繁並非一對一（例：「發」「髮」），轉換錯誤會產生不存在的成語。

**決定**：詞頻分級以 THUOCL 作為排序輸入，但**只用來排序既有的繁體成語典條目**，不從簡體表新增任何條目；無法對齊的條目歸入最低頻層。轉換與分級在 build-time script 完成，產出物進版控並可重現。（`designed`）

#### 對齊方向與實作（task 1.4）

對齊只走**安全方向：繁 → 簡**。繁轉簡是多對一，會遺失資訊但不會憑空造字；反方向（簡 → 繁）會讓一個簡體形展開成數個繁體候選，正是「製造出辭典裡不存在的成語」的來源。

轉換表取自 [`2675388` of BYVoid/OpenCC](https://github.com/BYVoid/OpenCC/tree/26753884f1984add422f3b0249ccee8613deaff6) 的 `data/dictionary/TSCharacters.txt`（Apache-2.0），**只在 build time 比對用，不隨程式發布**。規則：

1. 每個繁體字取其全部簡體候選，展開成候選簡體字串集合。
2. 恰有一個候選命中 THUOCL 才算對齊；零命中或多重命中一律視為未對齊（實測多重命中 0 筆）。
3. 兩條辭典條目收斂到同一個簡體形時（實測 35 組），它們是同一成語的異形（「不修邊幅／不脩邊幅」「一目了然／一目瞭然」），THUOCL 的 DF 是兩者合計。以辭典自己的「編號」裁決：編號小者為主條，取得該 DF；異形條目退回最低層。已逐組驗證 35 組的主條都被異形條目的「參考成語(正文)」欄位指回，裁決與辭典自身的主從關係一致。

**實測對齊率：1,643 / 5,270 = 31.18%**（多重命中 0、異形碰撞讓出 35）。若只用字面完全相同比對（不做任何轉換）只有 8.5%，可見轉換表是必要的。

#### 分層決定（task 1.5）

**決定：維持自動分層，不改為人工標定常用子集。** 依據為 task 1.4 實測的 31.18% 對齊率與下列分佈。

分層規則：對齊的 1,643 條依 DF 由高到低等分為 tier 0–3，未對齊的 3,627 條全部歸 tier 4（最低層）。實測各層筆數：

| tier | 筆數 | 說明 |
| --- | --- | --- |
| 0 | 411 | 最常用，樣本：脫穎而出、實事求是、因地制宜、小心翼翼、不可思議 |
| 1 | 411 | 樣本：胸有成竹、虎視眈眈、化險為夷、按圖索驥 |
| 2 | 411 | 樣本：委曲求全、平步青雲、民不聊生、一日千里 |
| 3 | 410 | 樣本：勢不可當、三人成虎、偷天換日、鷸蚌相爭 |
| 4 | 3,627 | 含全部未對齊條目 |

判斷理由：

- **31% 的對齊率看似低，但誤差方向是安全的。** THUOCL 的語料是現代簡體網路／新聞語料，成語典正文則以典源文言為主；對不上的多半本來就是現代罕用的條目，歸最低層是正確結果而非漏判。抽樣核對 tier 0 全是家喻戶曉的成語，沒有出現冷僻條目被誤判為最常用的情形——這才是會直接毀掉低難度關卡的錯誤類型，實測沒有發生。
- **反向誤判的代價有限。** 少數常用成語（例如「發揚光大」）因不在 THUOCL 表中而落到 tier 4，代價只是低難度關卡少了一點題材變化；因為最高難度本來就吃全部層級，不會造成任何一關無法出題或答案不合理。
- **tier 0 的 411 條足以支撐最簡單的關卡。** 最簡單的關卡只用 4 條成語，411 條的組合空間遠大於每日一題的重複週期，不需要人工擴充。
- 人工標定 1,500 條的成本是數人日，而它能改善的只有「把 tier 4 裡少數常用成語提上來」這一項；以上述代價分析，收益不足以支撐。

**保留的觸發條件**：若日後 tier 0–1 的實際出題觀察顯示題材重複明顯，或玩家回報低難度盤面出現不認識的成語，再以人工標定補正 tier 4 中的常用條目即可——那是一次資料修補，不需要改動 pipeline。

### 不採用的來源

- `pwxcoo/chinese-xinhua`（31,648 條成語）與 `mapull/chinese-dictionary`（近 50,000 條）條目多但是簡體，且收錄門檻寬鬆，不適合作為繁體遊戲的答案庫。

## 三、為什麼不先做 Wordle 型

漢兜（[antfu/handle](https://github.com/antfu/handle)，MIT）的原始碼把答案長度固定為四字、嘗試上限設為十次；比對結果型別包含 `exact`、`misplaced`、`none` 與內部使用的 `deleted`，其中 `exact` 表示同位置命中，`misplaced` 表示仍存在於尚未配對的答案元素，全部為 `exact` 才通過。[constants.ts](https://github.com/antfu/handle/blob/main/src/logic/constants.ts)、[types.ts](https://github.com/antfu/handle/blob/main/src/logic/types.ts)、[utils.ts](https://github.com/antfu/handle/blob/main/src/logic/utils.ts)（`verified`／2026-09-09 直接查核原始碼）。元件以 theme token 呈現狀態，原始碼不足以支持固定的人類色名，故本文不聲稱青色或橙色規則。另一個開源實作 [AllanChain/chinese-wordle](https://github.com/AllanChain/chinese-wordle)（BSD-3-Clause）以聲母韻母為比對單位，並在雙方聲母韻母都被猜中時額外提示組合，答案取自 THUOCL 人工篩選、驗證表取自漢典並以 pypinyin 驗證。

這個玩法本身很適合通勤，但**成本全部集中在讀音資料**：

- 需要逐字的注音／拼音，且必須處理破音字。antfu 的專案為此長期維護一份 `polyphones.json`，並靠社群回報修正讀錯的成語——這是持續性的維護負擔，不是一次性開發。
- 繁體使用者的直覺單位是注音符號而非漢語拼音，聲母韻母的切分要改用注音的聲／介／韻結構，不能直接套用既有簡體專案的資料。
- 答案庫之外還需要一份大得多的「可接受猜測」驗證表，否則玩家打不出任何合法猜測。

**建議**：先做填字，其讀音無關；待 `src/data/idioms.js` 穩定後，Wordle 型可作為第二個模式複用同一份成語資料，屆時再單獨評估注音資料的取得。

## 四、規則設計決議

以下為本專案採用的規則，逐項標記依據。

### 盤面

| 項目 | 決定 | 依據 |
| --- | --- | --- |
| 詞條長度 | 一律 4 格 | `verified`／成語定義 |
| 方向 | 只有向右與向下 | `designed` |
| 交叉 | 兩個垂直詞條共用一格，該格同時屬於一橫一豎 | `verified`／商店產品頁直接描述縱橫交錯詞格 |
| 平行相鄰 | 兩個平行詞條之間至少隔一個空格 | `designed`，避免產生非預期的相鄰字串 |
| 盤面尺寸 | 裁切到內容的外接矩形，最大 9×9 | `designed`，360 CSS px 下每格 ≥ 36px |
| 對稱 | 不要求 | `designed`，見上文 |

### 出題

1. 由詞頻層選一個種子成語，橫向放在原點。
2. 重複：隨機選一個已放置詞條、選其中一格、選垂直方向的偏移 0–3，查 `(字, 偏移) -> 成語[]`，過濾掉幾何衝突與重複詞條後放入；失敗則回溯。
3. 達到目標詞條數與目標交叉數後停止，裁切盤面。
4. 挑選要挖空的格子，其餘作為提示字。
5. **唯一解驗證**：以候選字池為值域跑解題器，計數上限 2；若解不唯一，多揭示一格提示字後重驗，直到唯一。

第 5 步與 `src/lib/sudoku.js` 既有的唯一解驗證是同一個思路，可沿用相同的測試骨架。全程使用既有的 `src/lib/poker/random.js`（xorshift32、狀態可序列化），同一個 seed 必產出同一盤，因此每日一題可比照 `/#/daily` 以日期為 seed。

### 候選字池

- 池中包含所有挖空格的正確字，**允許重複**（同一個字在盤面出現兩次就放兩個）。
- 依難度加入 0%–50% 的干擾字，干擾字取自同層詞頻的其他成語，不得使該盤面產生第二組解。
- 填入方式為「點選空格、再點選池中的字」，**不使用輸入法、不使用拖曳**。這是通勤場景的核心決定：中文沒有 26 鍵字母表，自由輸入需要 IME，在手機上是全螢幕的模態干擾；拖曳在晃動的車廂中命中率低。

### 難度

五級，比照數獨的 0–4，各級調整：詞條數（4→12）、交叉數、提示字比例（50%→15%）、干擾字比例（0%→50%）、詞頻層（最常用→含冷僻）。

### 提示與求助

比照數獨「玩法設定」放在首頁，而非局內購買制：

- 標示錯誤：已填但與答案不符的格子即時標紅（可關閉）。
- 揭示一格：填入目前選取空格的正確答案，計入紀錄。
- 顯示釋義：展開該詞條的教育部釋義，逐字照錄。

### 完成與紀錄

盤面全填且全部正確即完成。紀錄比照 `src/lib/stats.js`：各難度最佳時間、完成數、連續天數；求助次數另計並在紀錄中標示，不與零求助的成績混列。

## 五、與現有架構的對應

| 需要的東西 | 現有可複用 |
| --- | --- |
| 可序列化 PRNG | `src/lib/poker/random.js`（xorshift32-v1） |
| 唯一解驗證 | `src/lib/sudoku.js` 的求解與唯一性檢查骨架 |
| 逐步存檔 | `src/lib/poker/persistence.js` 的 schema version 與 exactly-once guard |
| 每日一題 | `/#/daily` 的日期 seed 作法 |
| 紀錄 | `src/lib/stats.js` 的 localStorage 版本化 key |
| 遊戲入口 | `src/pages/GameHub.jsx` 的卡片與 resume 顯示 |
| build-time 資料產生 | `scripts/import-puzzle-bank.mjs` 的產生器模式 |

資料量實測：5,270 條成語的字面共 21,080 字，UTF-8 約 63 KB；加上 `[["成語",層],…]` 的 JS 陣列語法後，`src/data/idioms.js` 實際為 **102 KB**（gzip 後 37 KB），與既有的 `src/data/puzzles.js` 同一量級，可直接進版控。釋義全文約數 MB，**必須另存並延後載入**，不可與成語表放在同一個 chunk；首版依 design 決議完全不收釋義、注音與拼音。

產生器為 `scripts/import-idiom-dictionary.mjs`，三個輸入路徑由參數或環境變數給定（`IDIOM_DICTIONARY`／`IDIOM_FREQUENCY`／`IDIOM_TS_CHARACTERS`），不綁定任何 checkout 位置。輸出可位元重現：所有排序都是全序、不依賴物件走訪順序，且不寫入任何 wall-clock 時間——標頭的產生日期是 script 裡手動更新的常數。

## 六、待決事項

- 釋義是否納入首版。納入會使離線資源從 102 KB 跳到數 MB，建議首版只做「顯示釋義」的介面位置，資料延後。
- 是否收錄成語典附錄的二萬餘條。建議否：附錄含大量四字常用詞，會稀釋「成語」的定義並使難度分層失準。
- ~~繁體詞頻對齊的失敗率需在實作 task 1 量測後才知道~~ 已於 task 1.4／1.5 結案：對齊率 31.18%，維持自動分層，理由見上文「分層決定（task 1.5）」。
