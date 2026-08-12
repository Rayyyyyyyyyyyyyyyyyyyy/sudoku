# 可散佈的 Sudoku 題庫來源研究

研究日期：2026-08-12

## 結論

建議採用 **Sudoku Exchange Puzzle Bank**，並把來源的 Sukaku Explainer 數值評分映射成專案現有的五級難度。它是三個候選中唯一同時具備下列條件的來源：

- 上游明確把整份資料放入公共領域，可直接挑題、修改格式及隨應用程式散佈。
- 上游明確聲明每題只有一個解。
- 每題都附有 Sukaku Explainer 分數，而不是只用空格數判定難度。
- 893,916 題的規模足以捨棄最低分的 100,000 題，仍保留 793,916 題可分成數量相近的五級。

建議固定使用上游 commit [`d8c8ebaee0c08c412cfba96af1923dfa61c83317`](https://github.com/grantm/sudoku-exchange-puzzle-bank/commit/d8c8ebaee0c08c412cfba96af1923dfa61c83317)，避免未來上游更新讓相同 seed 取得不同題目。

這裡的「真正題庫」是指已發佈、可重現、可批次驗證的題目 corpus；推薦來源的題目是電腦產生並評級、供 Sudoku Exchange 正式網站使用，不是報紙或作者手工創作的題目。[上游 README](https://github.com/grantm/sudoku-exchange-puzzle-bank/blob/d8c8ebaee0c08c412cfba96af1923dfa61c83317/README.md)

## 候選比較

| 來源 | 題量 | 授權與散佈 | 唯一解 | 難度資料 | 對本專案的適合度 |
| --- | ---: | --- | --- | --- | --- |
| [Sudoku Exchange Puzzle Bank](https://github.com/grantm/sudoku-exchange-puzzle-bank) | 893,916 | 公共領域；可複製、修改、出版、販售及散佈 | 上游明示；由 QQWing 產生 | 每題附 Sukaku Explainer 分數；上游已有四個區間 | **最佳**：授權最乾淨，評分可直接映射五級，檔案簡單 |
| [Controlled-bias Sudoku collection](https://github.com/denis-berthier/Controlled-bias_Sudoku_generator_and_collection) | 5,926,343 | GPL-3.0；可以散佈，但須按 GPL-3.0 保留授權並履行相應義務 | 題目是 minimal Sudoku；其定義包含唯一解 | 全集有 W-rating，並提供多種其他 technique-based ratings | 研究品質高，但體積、資料對齊與 copyleft 管理成本較高 |
| [9 Million Sudoku Puzzles and Solutions](https://www.kaggle.com/datasets/rohanrao/sudoku/data) | 9,000,000 | CC0 公共領域 | 資料卡明示每題唯一解，且附 solution | 無難度欄位 | 題量與授權很好，但 1.48 GB 且必須自行重新評級 |

## 推薦方案：Sudoku Exchange Puzzle Bank

### 第一方證據

上游說明題目由 [QQWing](https://github.com/stephenostermiller/qqwing) 產生、每題只有一個解，再由 [Sukaku Explainer](https://github.com/SudokuMonster/SukakuExplainer) 評級。上游原始四級界線為：`< 1.5`、`< 2.5`、`< 5.0`、`>= 5.0`；每筆資料包含 12 字元 hash、81 位題目字串和數值評分。[固定版本 README](https://github.com/grantm/sudoku-exchange-puzzle-bank/blob/d8c8ebaee0c08c412cfba96af1923dfa61c83317/README.md)

授權檔明確允許任何人基於任何商業或非商業目的複製、修改、出版、使用、編譯、販售或散佈資料。[固定版本 LICENSE.txt](https://github.com/grantm/sudoku-exchange-puzzle-bank/blob/d8c8ebaee0c08c412cfba96af1923dfa61c83317/LICENSE.txt)

四個可直接下載的第一方資料檔：

- [`easy.txt`](https://github.com/grantm/sudoku-exchange-puzzle-bank/blob/d8c8ebaee0c08c412cfba96af1923dfa61c83317/easy.txt)
- [`medium.txt`](https://github.com/grantm/sudoku-exchange-puzzle-bank/blob/d8c8ebaee0c08c412cfba96af1923dfa61c83317/medium.txt)
- [`hard.txt`](https://github.com/grantm/sudoku-exchange-puzzle-bank/blob/d8c8ebaee0c08c412cfba96af1923dfa61c83317/hard.txt)
- [`diabolical.txt`](https://github.com/grantm/sudoku-exchange-puzzle-bank/blob/d8c8ebaee0c08c412cfba96af1923dfa61c83317/diabolical.txt)

### 建議的五級映射

以下是專案自己的產品分級，不應說成 Sudoku Exchange 的官方五級。切點保留了上游 `2.5` 與 `5.0` 的主要界線，另外在離散分數 `2.0`、`4.0` 處切開，並移除最低的 `1.2` 分題目，以回應「整體太簡單」：

| 專案等級 | Sukaku Explainer 分數 | 可用題數 | 說明 |
| --- | ---: | ---: | --- |
| 入門 | `1.5 <= r < 2.0` | 176,643 | 不再收錄最低的 1.2 分題 |
| 簡單 | `2.0 <= r < 2.5` | 176,000 | 上游 medium 的較高半段 |
| 中等 | `2.5 <= r < 4.0` | 164,947 | 已進入上游 hard 區間 |
| 困難 | `4.0 <= r < 5.0` | 156,645 | 上游 hard 的高分段 |
| 專家 | `r >= 5.0` | 119,681 | 完整採用上游 diabolical 區間 |

題數與分布是下載上述固定版本四檔後，以每行第三欄實際統計所得；總數 893,916，移除 100,000 題 `r = 1.2` 後留下 793,916 題。這組切點的優點是五級仍各有約 12–18 萬題，不需要把低分題重複或偽裝成高難度。

難度是解題技巧模型的估計，不是所有玩家都會有完全相同的主觀感受。上線後仍應用完成時間、提示次數與放棄率校準顯示名稱，但不要再退回只看空格數；改版前的本地產生器正是依 `holes` 分級，這也是高空格題仍可能很簡單的主要原因。

### 建議匯入方式

1. 從固定 commit 下載四檔，解析每行的 `hash`、`puzzle`、`rating`。
2. 丟棄 `rating < 1.5`，再按上表映射成 0–4 級。
3. 靜態前端不需內嵌全部 79 萬題。用上游 hash 做穩定排序，每級先抽 1,000–2,000 題；10,000 題的原始題目字串約 1 MB，壓縮後會更小。
4. 匯入時自行再跑一次解數檢查，要求恰好一解；這是供應鏈防禦，不代表不信任上游聲明。
5. 上游檔案不附 solution。匯入階段用 solver 算出唯一解並一起輸出，避免瀏覽器每局重算。
6. 保存 `source`、固定 commit、上游 hash 和原始 rating；即使公共領域不強制署名，也應保留 provenance 與授權副本。
7. seed 應索引「固定排序後的本地題庫」，不要對線上檔案即時取樣，才能維持每日題與分享連結的可重現性。

## 備選一：Controlled-bias Sudoku generator and collection

上游提供約六百萬題，README 將 minimal Sudoku 定義為「有唯一解，且移除任何一個 given 後就會有多解」。全集組合後應有 5,926,343 行；每個小集合另有 W、gW、B、gB、SER 等評分檔，且同一資料夾內各檔行數一致，可依行號 join。[第一方 README：唯一解與規模](https://github.com/denis-berthier/Controlled-bias_Sudoku_generator_and_collection#1-introduction)、[第一方 README：評分檔與對齊方式](https://github.com/denis-berthier/Controlled-bias_Sudoku_generator_and_collection#4-the-small-cb-collections-folder-contains-independent-controlled-bias-collections-of-puzzles-generated-by-the-controlled-bias-generator)

這是很好的研究級來源，特別適合要研究 technique-based difficulty 或挑戰極難題的產品。五級可以按 W-rating 門檻或分位數建立。但它不如推薦方案適合目前的輕量 SPA：資料分散在 129 個集合、題目與評分需逐行對齊，而且整個 repository 明示採 [GPL-3.0](https://github.com/denis-berthier/Controlled-bias_Sudoku_generator_and_collection/blob/master/LICENSE)。若採用，應把抽出的資料與授權處理視為 GPL-3.0 發行物；在未確認專案整體授權策略前，不宜作為第一選擇。

## 備選二：Kaggle 9 Million Sudoku Puzzles and Solutions

發佈者的資料卡聲明每題只有一個解，每列含 puzzle 與 solution，並標示為 CC0 Public Domain。單一 `sudoku.csv` 為 1.48 GB、兩欄、九百萬題。[第一方 Kaggle 資料卡](https://www.kaggle.com/datasets/rohanrao/sudoku/data)

它的優點是公共領域且已附答案；缺點是沒有難度欄位，因此不能直接解決本專案「整體難度太低」的問題。要使用它，仍須先用 Sukaku Explainer 或另一個明確、固定版本的 technique-based rater 跑完整批次，再建立五級與挑選子集。相較之下，Sudoku Exchange 已完成這個成本最高的評級步驟。

## 不採用的來源類型

- 只有 solver/generator 程式碼授權、沒有明確說明「生成輸出」授權的專案：程式可散佈不必然等於輸出題庫可直接再授權。
- 報紙、商業網站或 Sudoku API：若沒有題目本身的明確授權，即使技術上可抓取也不應收錄。
- 只按 givens/holes 數量標 difficulty 的資料：可保證版面稀疏，不能可靠代表人類解題技巧難度。

以上是工程上的授權篩選，不是法律意見。
