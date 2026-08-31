# Jimbo’s Game 相容性研究與素材清單

研究日期：2026-08-25
適用 OpenSpec 變更：`add-poker-roguelike`，task 1.1–1.5

## 結論

目前 OpenSpec 把兩個不同的相容目標混在一起，不能照原文宣稱為忠實重製：

- 正式名稱是 **Jimbo’s Game**，不是「Jinbo’s Game」。它是 2024-10-24 加進《DAVE THE DIVER》的《Balatro》合作小遊戲；官方把它稱為 Jimbo’s Game，PlayStation 官方影片稱它為 Balatro 的 mini-game rendition。[NEXON 官方更新](https://forum.nexon.com/davethediver-jp/board_view?board=4071&thread=2669239)、[PlayStation 官方影片](https://www.youtube.com/watch?v=Wjcmb8tdkww)（**已驗證／第一方**）
- Jimbo 是《Balatro》的教學角色，LocalThunk 的開發時間線也使用「Jimbo」拼法。[LocalThunk 開發時間線](https://localthunk.com/blog/balatro-timeline-3aarh)（**已驗證／第一方**）
- Jimbo’s Game 的流程是「每 stage 3 rounds」；五名村民各 1 stage，Junak 是 3 stages、合計 9 rounds。它**不是** 8×3。[完整實機流程](https://www.youtube.com/watch?v=d7DQLiR42mU)、[玩家資料索引](https://davethediver.net/en/mission/jimbos-game-craze/)（**已驗證／實機逐幀；二手錄影**）
- 「8 Ante，每 Ante 為 Small／Big／Boss 三戰」是完整《Balatro》的傳統 run 結構。[Balatro 官方 FAQ](https://www.playbalatro.com/faq)（**已驗證／第一方**）

因此，task 1.1、1.2、1.4 及後續 3.6 的「eight-by-three」必須先修正。若產品目標仍是 Dave 版 Jimbo’s Game，資料模型應改為可變長度的 `opponent -> stage[] -> round[3]`；若產品刻意要 8×3，則應改稱「Balatro-style 原創模式」，並重新研究完整《Balatro》的五格 Joker、4 hands／3 discards、全商店與 Ante 資料，不能沿用本報告的 Dave 版六格、4／4 與 33 Joker 資料。

## 證據等級

| 標記 | 意義 | 可否直接鎖進 manifest |
| --- | --- | --- |
| **已驗證／第一方** | 官方公告、開發者文章、官方圖片或官方影片直接明示 | 可以；仍需保存 build 與 URL |
| **已驗證／實機逐幀** | 可從未剪接的完整玩家流程直接讀到 UI 數值；來源不是發行者，且影片未證明 depot/build | 可以作本次相容基準，但 manifest provenance 必須標 `observed-secondary-video` |
| **推定** | 社群整理、由畫面或另一版本外推、或計算出的合成案例 | 可先建立 typed provisional data，不可把 task 標成「verified」 |
| **未知** | 公開材料不足，或各來源無法證明精確值與時序 | 不得偷偷補預設值；需實機 capture 或產品決策 |

「第一方」與「二手」是來源層級；「已驗證」表示能否由來源直接觀察該 claim，兩者不是同一概念。例如玩家完整錄影能驗證畫面上的 `4 Hands`，但不能證明那就是所有平台與 patch 的永遠規則。

## 1.1 相容性矩陣

### 建議鎖定的 build

建議規則基準 ID：`dave-win-1.0.3.1551-jimbo`。

| 日期／平台 | 精確版本 | 事實與判定 | 狀態與來源 |
| --- | --- | --- | --- |
| 2024-10-24 Windows | `v1.0.3.1511` | Dave & Friends 合作首發；加入 Jimbo’s Game | **已驗證／第一方公告正文的官方 Steam 發佈**：[官方公告](https://steamcommunity.com/games/1868140/announcements/detail/4658501443526031232)；[可讀的公告轉載](https://www.cinelinx.com/games/game-news/dave-the-diver-patch-notes-dave-friends-collaboration-update/) |
| 2024-10-24 macOS | `v1.0.3.501` | 同上 | **已驗證／第一方公告**：[官方公告](https://steamcommunity.com/games/1868140/announcements/detail/4658501443526031232) |
| 2024-10-24 Switch | `v1.0.3.924` | Dave & Friends 合作首發 | **已驗證／第一方**：[NEXON 官方更新](https://forum.nexon.com/davethediver-jp/board_view?board=4071&thread=2669239) |
| 2024-10-24 PlayStation | `v1.0.2.67` | Dave & Friends 合作首發 | **已驗證／第一方**：[NEXON 官方更新](https://forum.nexon.com/davethediver-jp/board_view?board=4071&thread=2669239) |
| 2024-11-06 Windows／macOS | `v1.0.3.1535`／`v1.0.3.517` | 修正 Jimbo’s Game 無法開始，並因 rating guideline 移除 Hands 說明；公告未列平衡變更 | **已驗證／第一方**：[官方公告](https://steamcommunity.com/games/1868140/announcements/detail/4486241294570488100)、[SteamDB 公告鏡像](https://steamdb.info/patchnotes/16300586/) |
| 2024-12-02 Windows／macOS | `v1.0.3.1551`／`v1.0.3.530` | 修正在特定對話中開始 Jimbo’s Game 會 freeze；公告未列規則變更。這是目前查到最後一個明確提及 Jimbo 的 hotfix | **已驗證／第一方內容鏡像**：[SteamDB patch 16597190](https://steamdb.info/patchnotes/16597190/)、[官方 news endpoint](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1784506359133582) |

選 `1551` 而不是首發 `1511`，是因為前者已修掉兩個已知啟動問題；它不是「latest」的同義詞。若需要 bit-exact RNG，仍須在合法持有的安裝上保留版本畫面、平台、語言、seed 與完整錄影。公開公告只能證明沒有**列出**平衡改動，不能證明此後所有 build 內部完全相同。（**推定**；來源同上）

### 核心常數

| 欄位 | Jimbo’s Game 基準值 | 狀態 | 直接來源 |
| --- | ---: | --- | --- |
| 初始手牌上限 | 8 | **已驗證／實機逐幀**；官方圖片也顯示打出 5 張後為 `3/8` | [完整實機](https://www.youtube.com/watch?v=d7DQLiR42mU)、[官方 UI 圖](https://clan.akamai.steamstatic.com/images/42281449/0b01afb3524b635442567101c8a0e0408a6922cf.png) |
| 每 round 初始 hands | 4 | **已驗證／實機逐幀**；每個 round 開場反覆出現 | [完整實機](https://www.youtube.com/watch?v=d7DQLiR42mU) |
| 每 round 初始 discards | 4 | **已驗證／實機逐幀**；Gumo boss 例外為 0 | [完整實機](https://www.youtube.com/watch?v=d7DQLiR42mU) |
| 初始牌庫 | 標準 52 張 | **已驗證／實機逐幀**；官方圖顯示 `29/52` | [完整實機](https://www.youtube.com/watch?v=d7DQLiR42mU)、[官方 UI 圖](https://clan.akamai.steamstatic.com/images/42281449/0b01afb3524b635442567101c8a0e0408a6922cf.png) |
| 同時持有 Joker 上限 | 6 | **已驗證／實機逐幀**；官方圖顯示 `5/6` | [完整實機](https://www.youtube.com/watch?v=d7DQLiR42mU)、[官方 UI 圖](https://clan.akamai.steamstatic.com/images/42281449/0b01afb3524b635442567101c8a0e0408a6922cf.png) |
| 每 stage rounds | 3 | **已驗證／實機逐幀**；社群文字亦記載 | [完整實機](https://www.youtube.com/watch?v=d7DQLiR42mU)、[玩家資料索引](https://davethediver.net/en/mechanic/jimbos-game/) |
| 一般村民流程 | 每人 1 stage × 3 rounds | **已驗證／實機逐幀** | [完整實機](https://www.youtube.com/watch?v=d7DQLiR42mU) |
| Junak 流程 | 3 stages × 3 rounds = 9 rounds | **已驗證／實機逐幀**；不是 8×3 | [完整實機](https://www.youtube.com/watch?v=d7DQLiR42mU)、[任務資料索引](https://davethediver.net/en/mission/jimbos-game-craze/) |
| 可選牌數 | play／discard 各 1–5 張 | **推定**；與目前 OpenSpec 相符，但本輪研究沒有逐一錄到所有邊界錯誤狀態 | [完整實機](https://www.youtube.com/watch?v=d7DQLiR42mU) |
| deck exhaustion／洗回規則 | 未知 | **未知**；完整流程沒有形成足以證明所有邊界的 capture | [完整實機](https://www.youtube.com/watch?v=d7DQLiR42mU) |

### Encounter 目標、獎勵與 special rules

所有 normal round 的 reward 固定為 Small 3、Big 4、Boss 5；Junak 最終的 Cerulean Bell 也是 5。這些值經完整流程逐幀放大核對；例如 Gumo 商店回顧畫面 08:41 清楚列出 `300/reward 3`、`1050/reward 4`、`2100/reward 5`。（**已驗證／實機逐幀**；[完整實機](https://www.youtube.com/watch?v=d7DQLiR42mU?t=521)）

| 對手／stage | Small `target / reward` | Big `target / reward` | Boss `target / reward` | Boss rule（建議中性 ID） | 狀態／來源 |
| --- | ---: | ---: | ---: | --- | --- |
| Gumo | 300 / 3 | 1050 / 4 | 2100 / 5 | `start-with-zero-discards`：本 round 從 0 discards 開始 | **已驗證／實機逐幀**：[08:41 回顧](https://www.youtube.com/watch?v=d7DQLiR42mU?t=521) |
| Mima | 300 / 3 | 1050 / 4 | 2100 / 5 | `stage-played-cards-debuffed`：本 stage 曾打出的牌被 debuff | **已驗證／實機逐幀**：[11:54](https://www.youtube.com/watch?v=d7DQLiR42mU?t=714) |
| Kazhin | 300 / 3 | 1050 / 4 | 2100 / 5 | `hand-size-minus-one`（The Manacle）：hand size -1 | **已驗證／實機逐幀**：[15:05](https://www.youtube.com/watch?v=d7DQLiR42mU?t=905) |
| Suwam | 300 / 3 | 1050 / 4 | **1050 / 5** | `one-hand-only`（The Needle）：只有 1 hand；因此 boss target 不是一般的 2100 | **已驗證／實機逐幀**：[17:36](https://www.youtube.com/watch?v=d7DQLiR42mU?t=1056) |
| Ramo | 300 / 3 | 1050 / 4 | 2100 / 5 | `hand-type-once`（The Eye）：每種 hand type 本 round 只能出現一次 | **已驗證／實機逐幀**：[21:01](https://www.youtube.com/watch?v=d7DQLiR42mU?t=1261) |
| Junak stage 1 | 300 / 3 | 450 / 4 | 600 / 5 | `face-cards-debuffed`（The Plant）：face cards debuffed | **已驗證／實機逐幀**：[24:40](https://www.youtube.com/watch?v=d7DQLiR42mU?t=1480) |
| Junak stage 2 | 1000 / 3 | 1500 / 4 | 1500 / 5 | `single-hand-type`（The Mouth）：此 round 只能打同一種 hand type | **已驗證／實機逐幀**：[27:40](https://www.youtube.com/watch?v=d7DQLiR42mU?t=1660)；[官方圖直接顯示 stage 2 small 1000/reward 3](https://clan.akamai.steamstatic.com/images/42281449/0b01afb3524b635442567101c8a0e0408a6922cf.png) |
| Junak stage 3 | 5000 / 3 | 7500 / 4 | 10000 / 5 | `forced-selected-card`（Cerulean Bell）：總有 1 張牌被強制選取 | **已驗證／實機逐幀**：[32:51](https://www.youtube.com/watch?v=d7DQLiR42mU?t=1971) |

上表的 Junak stage 3 規則保留為已驗證的 reference behavior；shipping product 刻意不實作額外選牌限制。`docs/poker-compatibility-matrix.md`、versioned catalog（`primary-3-special` 的 `specialRuleId: null`）、deterministic test 與 OpenSpec delta 均記錄同一項產品調整，不能把它誤標成未驗證或遺漏的 reference rule。

這個表描述的是六次獨立對局，不是一次把五名村民與 Junak 串成可保留 token/Joker 的 run；玩家資料指出 token 與 Joker 不能跨對手保留。[Jimbo’s Game 玩家資料](https://davethediver.net/en/mechanic/jimbos-game/)（**推定／二手文字**）

### 經濟、interest、shop 與 reroll

| 規則 | 值 | 狀態／來源 |
| --- | --- | --- |
| round 結算 | `base reward + unused hands + interest`；unused discard 不直接給 token | **推定／二手文字**：[Jimbo’s Game 玩家資料](https://davethediver.net/en/mechanic/jimbos-game/) |
| interest | 每完整持有 5 token 得 1，cap 5；即 `min(floor(tokens/5), 5)` | **推定／二手文字**：[Jimbo’s Game 玩家資料](https://davethediver.net/en/mechanic/jimbos-game/) |
| shop offers | 2 張隨機 Joker + 1 個 booster pack | **推定／二手文字；實機畫面相符**：[Jimbo’s Game 玩家資料](https://davethediver.net/en/mechanic/jimbos-game/)、[完整實機](https://www.youtube.com/watch?v=d7DQLiR42mU) |
| 初始 reroll cost | 1 token | **已驗證／實機逐幀**；本 walkthrough 的所有 shop 初始值皆為 1：[完整實機](https://www.youtube.com/watch?v=d7DQLiR42mU) |
| 後續 reroll | 每次會變貴，但精確序列未知；影片沒有連續 reroll | **未知**；二手文字只說會上升：[Jimbo’s Game 玩家資料](https://davethediver.net/en/mechanic/jimbos-game/) |
| pack reroll | 不能 reroll | **推定／二手文字**：[Jimbo’s Game 玩家資料](https://davethediver.net/en/mechanic/jimbos-game/) |
| 跨對手持有物 | token 與 Joker 不保留；擊敗對手給的是「解鎖進商店池」，不是直接永久持有該張 | **推定／二手文字**：[Jimbo’s Game 玩家資料](https://davethediver.net/en/mechanic/jimbos-game/) |

建議不要在 manifest 猜 `rerollCosts: [1,2,3,…]`。可以先表達 `initialCost: 1`、`escalation: unknown`，並讓 schema 拒絕在 `verificationStatus: unknown` 時進 production compatibility mode。

## 1.3 Modifier／Joker inventory

以下 33 張是 Dave 版社群資料目前列出的完整集合。名稱只用於研究 provenance；玩家端應改用原創名稱與文案。每列的效果與明確價錢來自同一個未官方審核的資料頁，因此整列皆標 **推定**，不能因為表格完整就升格為第一方 verified。[完整社群表](https://davethediver.net/en/mechanic/jimbos-game/)

價錢欄格式為 `buy / sell`。`*` 表示社群頁留白後，按相對應《Balatro》價格與 `floor(buy/2)` 補出的工程候選值；它不是 Jimbo’s Game 的已驗證值。沒有 `*` 的值也仍只有二手來源。

| Neutral ID | 參考名稱 | Trigger／typed effect | 稀有度 | 價錢 | 狀態與直接來源 |
| --- | --- | --- | --- | ---: | --- |
| `owned-joker-mult` | Abstract Joker | `score_independent: add_mult(3 * owned_jokers)` | Common | 4 / 2 | **推定**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `rotating-suit-xmult` | Ancient Joker | `on_scoring_card`: 當牌屬於本 round 隨機 suit，`x_mult(1.5)`；round 結束換 suit | Rare | 8* / 4* | **推定；價錢未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `remaining-discard-chips` | Banner | `score_independent: add_chips(30 * discards_remaining)` | Common | 5 / 2* | **推定；sale 未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `deck-remaining-chips` | Blue Joker | `score_independent: add_chips(2 * cards_in_deck)` | Common | 5* / 2* | **推定；價錢未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `copy-right-effect` | Blueprint | `dispatch`: 複製右側 Joker 的相容能力 | Rare | 10 / 5 | **推定**；社群附註它本身不可再被 Blueprint 複製：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `repeated-hand-xmult` | Card Sharp | `score_independent`: 若本 round 已出過本 hand type，`x_mult(3)` | Uncommon | 6 / 3* | **推定；sale 未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `discard-suit-grow-chips` | Castle | `on_discard_card`: 指定 suit 每棄一張永久 `stored_chips += 8`；每 round 換 suit；計分時加 stored chips | Uncommon | 6* / 3* | **推定；價錢未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `even-rank-mult` | Even Steven | `on_scoring_card`: 10/8/6/4/2 各 `add_mult(4)` | Common | 4 / 2* | **推定；sale 未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `fibonacci-rank-mult` | Fibonacci | `on_scoring_card`: A/2/3/5/8 各 `add_mult(8)` | Uncommon | 7 / 3 | **推定**；Dave 表列 7，不能直接套 Balatro 1.0.1f 的 8：[社群表](https://davethediver.net/en/mechanic/jimbos-game/)、[Balatro 1.0.1f 官方 patch](https://store.steampowered.com/news/posts/?enddate=1714581521&feed=steam_community_announcements) |
| `four-suits-combo` | Flower Pot | `after_scoring_cards`: 至少 4 張 scoring cards 合計涵蓋四 suit 時，`add_chips(50)` 且 `x_mult(3)` | Uncommon | 6* / 3* | **推定；價錢與 chips／xmult 順序未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `four-card-straight-flush` | Four Fingers | `hand_classifier`: Straight／Flush 允許 4 張 | Common | 7* / 3* | **推定；價錢未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `club-card-mult` | Gluttonous Joker | `on_scoring_card`: Club 各 `add_mult(4)` | Common | 5 / 2* | **推定；sale 未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `diamond-card-mult` | Greedy Joker | `on_scoring_card`: Diamond 各 `add_mult(4)` | Common | 5 / 2* | **推定；sale 未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `play-grow-discard-shrink-mult` | Green Joker | `after_play: stored_mult += 3`；`after_discard: stored_mult -= 3`；計分時加 stored mult | Common | 4 / 2* | **推定；sale 與下限行為未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `low-rank-retrigger` | Hack | `retrigger_scoring_card(2,3,4,5)` | Uncommon | 6 / 3* | **推定；sale 未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `small-play-mult` | Half Joker | 打出少於 3 張時 `score_independent: add_mult(20)` | Common | 5 / 2* | **推定；sale 未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `flat-mult` | Joker | `score_independent: add_mult(4)` | Common | 2 / 1* | **推定；sale 未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `heart-card-mult` | Lusty Joker | `on_scoring_card`: Heart 各 `add_mult(4)` | Common | 5 / 2* | **推定；sale 未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `discard-plus-hand-size-minus` | Merry Andy | `round_setup: discards += 3, hand_size -= 1` | Uncommon | 7 / 3* | **推定；sale 未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `random-mult` | Misprint | 顯示與效果皆隨機；需要 `score_independent` RNG handler | Common | 4 / 2 | **推定；隨機範圍與抽樣時點未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `all-face-classifier` | Pareidolia | `card_classifier`: 所有牌視為 face card | Uncommon | 5 / 2* | **推定；sale 未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `first-face-xmult` | Photograph | `on_scoring_card`: 每次 play 第一張 face card `x_mult(2)` | Common | 5 / 2 | **推定**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `face-card-chips` | Scary Face | `on_scoring_card`: face card 各 `add_chips(30)` | Common | 4 / 2 | **推定**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `club-plus-other-xmult` | Seeing Double | scoring cards 同時有 Club 與非 Club 時 `x_mult(2)` | Uncommon | 6 / 3* | **推定；sale 未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `gap-straight-classifier` | Shortcut | `hand_classifier`: Straight 可容許 rank gap 1 | Uncommon | 7 / 3* | **推定；sale 未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `paired-suits-classifier` | Smeared Joker | `card_classifier`: Heart=Diamond、Spade=Club | Uncommon | 7 / 3 | **推定**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `face-card-mult` | Smiley Face | `on_scoring_card`: face card 各 `add_mult(5)` | Common | 4 / 2 | **推定**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `face-card-retrigger` | Sock and Buskin | `retrigger_scoring_card(face)` | Uncommon | 6 / 3* | **推定；sale 未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `all-played-score` | Splash | `scoring_selector`: 每張打出的牌都算 scoring card | Common | 3 / 1 | **推定**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `four-card-grow-chips` | Square Joker | 每次恰打 4 張，`stored_chips += 12`；計分時加 stored chips | Common | 4 / 2* | **推定；sale 與本手先成長或先計分未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `hand-frequency-mult` | Supernova | `score_independent: add_mult(3 * stage_play_count[current_hand_type])` | Uncommon | 5 / 2 | **推定；當前手是否先納入 count 仍需 capture**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `straight-xmult` | The Order | hand 含 Straight 時 `score_independent: x_mult(3)` | Rare | 8 / 4* | **推定；sale 未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `spade-card-mult` | Wrathful Joker | `on_scoring_card`: Spade 各 `add_mult(4)` | Common | 5 / 2* | **推定；sale 未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |

### Handler 與順序要求

至少需要分開 `round_setup`、`hand_classifier`、`card_classifier`、`scoring_selector`、`on_discard_card`、`on_scoring_card`、`retrigger_scoring_card`、`score_independent`、`after_play`、`after_discard`、`dispatch/copy`。把所有能力簡化成「最終加分」會無法表達 Pareidolia → Scary Face、Hack/Sock retrigger、Blueprint 複製、Four Fingers 分類與 Green/Castle/Square 的持久狀態。[33 Joker 效果索引](https://davethediver.net/en/mechanic/jimbos-game/)（**推定／二手**）

玩家實作經驗指出 Joker 由左至右觸發，乘算應放在加算右側；這符合畫面可重排 Joker 的設計，但目前只有玩家敘述，尚無第一方文字規格。[玩家討論](https://www.reddit.com/r/DavetheDiverOfficial/comments/1hfqmn6/how_do_you_play_jimbos_game/)（**推定／不得作唯一驗證依據**）

## 1.4 Pack 與 special-rule catalogs

### Packs

| Neutral ID | 顯示數 N | 可選數 K | Cost | 稀有度／卡池分布 | 狀態與來源 |
| --- | ---: | ---: | ---: | --- | --- |
| `joker-pack-small` | 最多 2 | 1 | 4 | 未知 | N/K/cost **推定**；distribution **未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `joker-pack-jumbo` | 最多 3 | 1 | 6 | 未知 | N/K/cost **推定**；distribution **未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `joker-pack-mega` | 最多 4 | 2 | 8 | 未知 | N/K/cost **推定**；distribution **未知**：[社群表](https://davethediver.net/en/mechanic/jimbos-game/) |

目前完全沒有可信資料證明：pack 三種類型在 shop 的權重、各 rarity 出現率、已持有牌是否可重複、解鎖池如何過濾、同 pack 是否可重複同一 ID，以及 RNG 消耗順序。這些都應是 `unknown`，不能把完整《Balatro》的機率表當成 Dave 版答案。[社群頁只描述 N/K/cost](https://davethediver.net/en/mechanic/jimbos-game/)（**未知**）

### Special-rule schema

上一節八條規則足以開始做 typed handler 與 isolated tests。建議參數如下：

| ID | Handler | Parameters | 必測互動 | 驗證來源 |
| --- | --- | --- | --- | --- |
| `start-with-zero-discards` | `set_round_actions` | `{ discards: 0 }` | Merry Andy 是在 override 前或後套用 | [Gumo 實機](https://www.youtube.com/watch?v=d7DQLiR42mU?t=521)；互動順序 **未知** |
| `stage-played-cards-debuffed` | `debuff_by_stage_history` | `{ history: "played" }` | debuffed card 是否仍供 hand classifier／suit condition | [Mima 實機](https://www.youtube.com/watch?v=d7DQLiR42mU?t=714)；互動 **未知** |
| `hand-size-minus-one` | `adjust_hand_size` | `{ delta: -1 }` | 與 Merry Andy 疊加、低於 1 的下限 | [Kazhin 實機](https://www.youtube.com/watch?v=d7DQLiR42mU?t=905)；邊界 **未知** |
| `one-hand-only` | `set_round_actions` | `{ hands: 1 }` | extra-hand modifier 是否能覆寫 | [Suwam 實機](https://www.youtube.com/watch?v=d7DQLiR42mU?t=1056)；邊界 **未知** |
| `hand-type-once` | `reject_used_hand_type` | `{ scope: "round" }` | 同分級手牌、被 Four Fingers 改判定 | [Ramo 實機](https://www.youtube.com/watch?v=d7DQLiR42mU?t=1261)；互動 **未知** |
| `face-cards-debuffed` | `debuff_by_rank_class` | `{ class: "face" }` | Pareidolia 是否使所有牌被 debuff | [Junak stage 1](https://www.youtube.com/watch?v=d7DQLiR42mU?t=1480)；互動 **未知** |
| `single-hand-type` | `lock_first_hand_type` | `{ scope: "round" }` | 第一個無效 play 是否鎖定、分類 modifier | [Junak stage 2](https://www.youtube.com/watch?v=d7DQLiR42mU?t=1660)；邊界 **未知** |
| `forced-selected-card` | `force_selection` | `{ count: 1 }` | forced card 何時重抽、是否能 discard、selection 上限 | [Junak stage 3](https://www.youtube.com/watch?v=d7DQLiR42mU?t=1971)；邊界 **未知** |

## 1.5 計分與 compatibility fixtures

### 基礎 scoring table

OpenSpec 目前列的基礎值為 High Card `5×1`、Pair `10×2`、Two Pair `20×2`、Three of a Kind `30×3`、Straight `30×4`、Flush `35×4`、Full House `40×4`、Four of a Kind `60×7`、Straight Flush `100×8`；數字牌加 rank、J/Q/K 加 10、A 加 11。`chips × mult` 本身有第一方開發者來源，但除 Flush 與部分牌面 chips 外，本輪沒有第一方公開 Jimbo 表可逐項驗證。[LocalThunk 開發時間線](https://localthunk.com/blog/balatro-timeline-3aarh)、[官方 Jimbo 畫面](https://clan.akamai.steamstatic.com/images/42281449/0b01afb3524b635442567101c8a0e0408a6922cf.png)（**Flush 35、Q/J=10、7=7、6=6 已驗證；其餘值推定**）

官方 Jimbo 圖的 Flush 為 Q♦、J♦、7♦、6♦、3♦。畫面在前四張已計分、3♦ 尚未計分時顯示 `68 × 17`，而 `35 + 10 + 10 + 7 + 6 = 68`，直接驗證 Flush base chips 為 35，並驗證 Q/J/7/6 的牌面 chips；`17` 已被 Joker 改動，不能從該畫面反推 Flush base mult。[官方 UI 圖](https://clan.akamai.steamstatic.com/images/42281449/0b01afb3524b635442567101c8a0e0408a6922cf.png)（**已驗證／第一方畫面**）

### 可立即編碼的 fixtures

| Fixture ID | Input | Expected | 狀態與來源 |
| --- | --- | --- | --- |
| `official-flush-midscore-68` | Flush Q♦ J♦ 7♦ 6♦ 3♦；只處理前四張的 chips | `35 + 10 + 10 + 7 + 6 = 68` | **已驗證／第一方畫面**：[官方 UI 圖](https://clan.akamai.steamstatic.com/images/42281449/0b01afb3524b635442567101c8a0e0408a6922cf.png) |
| `straight-broadway-baseline` | 10/J/Q/K/A、無 modifier，採 OpenSpec table | `(30 + 10 + 10 + 10 + 10 + 11) × 4 = 324` | **推定／合成**；base table 未逐項在 Jimbo 第一方資料驗證：[OpenSpec 所採機制的官方背景](https://localthunk.com/blog/balatro-timeline-3aarh) |
| `straight-wheel-baseline` | A/2/3/4/5、無 modifier，採 OpenSpec table | `(30 + 11 + 2 + 3 + 4 + 5) × 4 = 220` | **推定／合成**：[OpenSpec 所採機制的官方背景](https://localthunk.com/blog/balatro-timeline-3aarh) |
| `interest-boundaries` | holdings 0, 4, 5, 24, 25, 29 | interest 0, 0, 1, 4, 5, 5 | **推定／二手規則**：[Jimbo’s Game 玩家資料](https://davethediver.net/en/mechanic/jimbos-game/) |
| `left-to-right-add-then-x` | 起始 `10 chips × 2 mult`；左 `+4 mult`，右 `×3 mult` | `10 × ((2+4)×3) = 180` | **推定／合成**；左至右只有玩家佐證：[玩家討論](https://www.reddit.com/r/DavetheDiverOfficial/comments/1hfqmn6/how_do_you_play_jimbos_game/) |
| `left-to-right-x-then-add` | 同上但 Joker 位置交換 | `10 × (2×3+4) = 100` | **推定／合成**：[玩家討論](https://www.reddit.com/r/DavetheDiverOfficial/comments/1hfqmn6/how_do_you_play_jimbos_game/) |
| `pareidolia-scary-face` | 5 張 scoring cards + `all-face-classifier` + `face-card-chips` | 每張都被視為 face，各加 30 chips，共 +150；仍需證明 debuff／retrigger 時序 | **推定／由兩張效果組合**：[33 Joker 表](https://davethediver.net/en/mechanic/jimbos-game/) |
| `face-retrigger-stack` | Pareidolia + Scary Face + Blueprint + Ancient + Sock and Buskin + Hack 的 face/low-rank 路徑 | 建立逐事件 trace，不先鎖總分；Blueprint target、retrigger 次數與 Ancient suit 都要由 seed 明示 | **推定；玩家高分 build 僅可作探索索引**：[玩家高分討論](https://www.reddit.com/r/DavetheDiverOfficial/comments/1iqslu1/jimbos_game_dave_the_diver_version_of_balatro/) |

只有第一個 fixture 可標 verified。task 1.5 所稱「documented straight calculation」目前在可公開第一方 Jimbo 資料中找不到；若仍用 324 或 220，測試名稱與 metadata 應明示 `inferredFromOpenSpec`, 不可偽裝成 reference capture。

## 合法可用的視覺／音訊素材與 IP 限制

### 不可直接帶進產品的素材

- Playstack 條款明示網站與 app 的 IP 為其自有或獲授權；商業用途須明示許可，品牌、遊戲名稱、logo、design、slogan 不得未經許可使用，且禁止未獲准的 copy/adapt/modify 與大部分 reverse engineering。[Balatro Terms & Conditions](https://www.playbalatro.com/terms-and-conditions)（**已驗證／官方條款**）
- Balatro press kit 寫的是「Official assets for media use」，不是把圖片、logo、Joker art 或音訊包進另一款遊戲的授權。[Balatro 官方 press kit](https://www.playbalatro.com/press-kit/)（**已驗證／第一方**）
- NEXON 的創作者指南把角色、設定、圖像、BGM、影片等視為 Game IP；UGC 要署名且原則上不得商業化。VOD policy 也禁止抽出並單獨散佈角色、art、voice、music 或 items；合作中的第三方內容還需另行取得權利。[NEXON Game IP Guide](https://playersupport.nexon.com/hc/de/articles/360059079812-Nexon-Game-IP-Guide-for-Content-Creators)、[NEXON VOD policy](https://support-accountblock.nexon.com/hc/en-us/articles/360046059711-Statement-on-Permissible-Uses-of-VOD-and-Streaming)（**已驗證／官方條款**）
- 美國著作權局說明遊戲 idea／method of play 本身不受著作權保護，但規則文字與圖像表達可以受保護；這不處理商標、專利、trade dress、契約或其他司法管轄區問題。[Copyright Office：Games](https://www.copyright.gov/register/tx-games.html)、[Copyright FAQ](https://www.copyright.gov/help/faq/faq-general.html)（**已驗證／官方一般資訊；不是法律意見**）

因此不得從 game binary、wiki、press kit、YouTube 或 Steam 圖片擷取原始卡面、Joker 插圖、Jimbo／Dave 角色、UI skin、字體、動畫、音效或音樂；也不應直接沿用 Jimbo’s Game、Balatro、Blind、Joker 等品牌化玩家文案。研究文件可連結來源，但產品資產必須另做。

### 可合法採用的替代素材

| 類型 | 建議 | 授權／限制 | 來源 |
| --- | --- | --- | --- |
| 撲克牌 | 優先用專案自行生成的 CSS/SVG：普通花色符號、rank 文字與原創背面圖案 | 自有程式與設計；不要仿 Balatro/Dave 版面 | **建議／原創資產** |
| 撲克牌 bitmap/vector | Kenney Playing Cards Pack | 資產頁標 CC0，可商用、可修改、免署名；不可把 Kenney logo 當己方品牌 | [Kenney Playing Cards Pack](https://kenney.nl/assets/playing-cards-pack)、[Kenney 授權 FAQ](https://kenney.nl/support)（**已驗證／作者授權頁**） |
| UI 音效 | Kenney UI Audio，或以 WebAudio 合成短促原創 bleeps | Kenney 頁面資產為 CC0；若自行合成則保存生成參數與原始碼 | [Kenney UI Audio](https://kenney.nl/assets/ui-audio)、[Kenney 授權 FAQ](https://kenney.nl/support)（**已驗證／作者授權頁**） |
| 角色／modifier art | 自行繪製非小丑、非 Jimbo/Dave 角色的抽象符號；或首版只用幾何 icon | 不要用原角色輪廓、配色、名字或卡面 trade dress | **建議／基於官方限制的風險控制**：[Balatro 條款](https://www.playbalatro.com/terms-and-conditions) |

尚未把任何第三方資產下載進 repository。真正採用時要把固定下載 URL、檔案 hash、LICENSE 副本與 attribution policy 一起存入 repo。

## 來源台帳：哪些可驗證、哪些只能找線索

### 第一方／原始來源

- [NEXON Dave & Friends 更新](https://forum.nexon.com/davethediver-jp/board_view?board=4071&thread=2669239)：名稱、合作內容、Switch/PS build。
- [MINTROCKET Steam 首發公告](https://steamcommunity.com/games/1868140/announcements/detail/4658501443526031232)、[11/06 hotfix](https://steamcommunity.com/games/1868140/announcements/detail/4486241294570488100)、[12/02 官方 news endpoint](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1784506359133582)：PC/Mac build 與 Jimbo-specific fixes。
- [官方 Jimbo UI 圖](https://clan.akamai.steamstatic.com/images/42281449/0b01afb3524b635442567101c8a0e0408a6922cf.png)：8 hand size、52 deck、6 Joker slots、stage2 small 1000/reward3、Flush mid-score。
- [PlayStation 官方合作影片](https://www.youtube.com/watch?v=Wjcmb8tdkww)：Jimbo’s Game 是 Balatro rendition。
- [Balatro FAQ](https://www.playbalatro.com/faq)、[LocalThunk timeline](https://localthunk.com/blog/balatro-timeline-3aarh)：用來辨別完整 Balatro 的 8×3 與 Jimbo 名稱，不可拿來填 Dave 版未驗證數值。
- [Balatro 條款](https://www.playbalatro.com/terms-and-conditions)、[NEXON IP Guide](https://playersupport.nexon.com/hc/de/articles/360059079812-Nexon-Game-IP-Guide-for-Content-Creators)、[美國著作權局](https://www.copyright.gov/register/tx-games.html)：素材與工程風險。

### 二手來源：可作 observation／索引，不得單獨升格成官方規格

- [34:36 完整玩家流程](https://www.youtube.com/watch?v=d7DQLiR42mU)：本報告逐幀數值的主要直接畫面證據；影片不是 MINTROCKET 上傳，且未展示 build 畫面。
- [獨立 Dave Wiki：mechanic](https://davethediver.net/en/mechanic/jimbos-game/)、[mission](https://davethediver.net/en/mission/jimbos-game-craze/)：頁面自行標示 independent、needs review；完整 33 Joker 與 pack 表只可先作 provisional catalog。
- [Reddit 左至右順序討論](https://www.reddit.com/r/DavetheDiverOfficial/comments/1hfqmn6/how_do_you_play_jimbos_game/)、[高分 build](https://www.reddit.com/r/DavetheDiverOfficial/comments/1iqslu1/jimbos_game_dave_the_diver_version_of_balatro/)：只可用來設計待驗證測試，不可作 release gate 的唯一證據。
- SteamDB／新聞轉載只在官方正文不可讀時作 mirror；canonical URL 仍應指向官方公告。[SteamDB 11/06](https://steamdb.info/patchnotes/16300586/)、[SteamDB 12/02](https://steamdb.info/patchnotes/16597190/)

## 對 task 1.1–1.5 的交付判定

| Task | 現在可做 | 還不能宣稱完成的部分 |
| --- | --- | --- |
| 1.1 | build、8/4/4/52/6、全部 6 組對手 progression、targets、rewards、8 條 boss rules、initial reroll=1 已有資料 | 原 task 的 8×3 是錯誤相容目標；reroll escalation、deck exhaustion、若干 economy 邊界未知 |
| 1.2 | 可建立 `opponent/stage/round` 可變長 schema 與上表資料 | 必須先改掉 eight-by-three validation；不應用假 24 encounters 填滿 |
| 1.3 | 33 stable neutral IDs、effect families、typed parameters、rarity 與 provisional price/sale 已整理 | 整份 catalog 仍主要是二手；星號價錢、Misprint、Blueprint、scaler/retrigger edge cases 需合法實機 capture |
| 1.4 | 3 pack 的 N/K/cost、8 special-rule handler 可開工 | pack weights／rarity distribution／duplicate policy 與多個 boss×Joker 互動未知 |
| 1.5 | 1 個官方畫面 score fixture、interest 邊界與 order-sensitive 合成 fixtures 可建檔 | straight 不是 reference-verified；左至右順序與代表性高階 combo 沒有 deterministic seed capture |

## 必須先解決的阻塞與建議下一步

1. **先修 OpenSpec 身分與流程。** 把所有「Jinbo」改成 `Jimbo`，把 Dave 版 schema 改成可變 stage；或明確決策改做 `Balatro-style` 原創 8×3，重新建立另一份 baseline。這是 design/spec correction blocker，不是小 typo。
2. **建立合法實機 capture protocol。** 在 Windows `v1.0.3.1551`（若可合法固定 depot）展示 build、語言與完整無剪接流程；逐項錄 reroll 連點、所有 33 Joker 詳情／購售、pack 開啟、手牌 Run Info、retrigger/copy/debuff 排序與 deck exhaustion。若不能取得歷史 build，應把目前合法安裝的精確版本設為新的 baseline，而不是聲稱 1551 bit-exact。
3. **未知值不能擋住引擎骨架，但要擋住 compatibility 標章。** Schema 允許 `verificationStatus` 與 provenance，production manifest 對核心 unknown fail-fast；測試名稱區分 `reference`、`observed`、`synthetic`。
4. **只做原創 presentation。** 首版用 CSS/SVG 標準牌、幾何 modifier icon 與自製/WebAudio 音效；不匯入任何官方或 wiki media。上線前再做商標、trade dress 與目標市場法律審查。

依這份研究，資料模型、核心狀態機、八條 special-rule handler、33 張卡的 effect-family 骨架與 provenance schema 已足以開始；但在修正 8×3 規格、取得 reroll/pack/Joker 邊界 capture 前，不能把整體標成 faithful compatibility complete。
