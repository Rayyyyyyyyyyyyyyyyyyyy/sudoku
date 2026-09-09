# 夢魘堡壘 v2 內容清單

## 凍結基線

- Git baseline：`4a91e26b502b67361f28bec89fa0d92525a4d00e`
- v1 契約：`schemaVersion: 1`、`contentVersion: nightmare-fortress-1`、儲存 key `sudoku-drill-rpg-v1`
- 可執行內容：38 節、91 選項；荒野與夢城各 4 件事件，共 8 件
- 固定規則：三職業、七敵人、六永久養成、三異象、兩掉落表；戰鬥／事件／掉落共用 `xorshift32-v1`
- 代表性合法與非法快照：`test/rpg/fixtures/v1.ts`

基線 38 個 ID 為：`village`、`briefing`、`crossroads`、`bridge`、`ferryman`、`ruins`、`crypt`、`camp`、`wild-witchfire`、`wild-grave-cart`、`wild-moonwell`、`wild-white-stag`、`marsh`、`rescue`、`crocodile`、`forge`、`outfitter`、`approach`、`thornwood`、`causeway`、`gate`、`webhall`、`gallery`、`banquet`、`cells`、`refuge`、`fortress-armory`、`fortress-mirror`、`fortress-scriptorium`、`fortress-sleepwalker`、`abyss`、`archive`、`bells`、`threshold`、`throne`、`dawn`、`retreat`、`defeat`。

## 候選盤點

候選共有 64 節、165 選項，淨增 26 個實質節點與 74 個選項。八個新事件包含在 26 個節點內，沒有重複計數。`story.ts` 的 validator 會拒絕低於 62／151、事件池不是各 8 件、事件沒有兩個不同出口選項、未知列舉、無守衛成本、斷邊、循環與不可達節點。

| 新增／改寫 ID | 路線／池 | 前置 | 後續後果 | provenance |
| --- | --- | --- | --- | --- |
| `marsh`（改寫） | 荒野匯流 | 無 | 新增盟約／圍困入口，保留快速戰 | 原典龍鱷主線 + 原創分流 |
| `forest-covenant` | 森林盟約 | `marsh` | `covenant-kept/broken`、盟約繩結、支援差異 | 原典 613–622、639–653 + 原創因果 |
| `siege-day-one`～`siege-day-three`（5 節） | 三日圍困 | 選圍困 | 五時段單向前進；進食／撤離失敗，只有第三日接 `forge` | 原典三日禁食 + 原創時段取捨 |
| `wild-reed-oracle` | wilds | camp 抽取 | `reed-sign` 呼應圍困 | 原創 |
| `wild-herbalists-cache` | wilds | camp 抽取 | `herb-cache` 呼應救援 | 原創 |
| `wild-ash-birds` | wilds | camp 抽取 | `ash-warning` 呼應鋼門龍吠 | 原創 |
| `wild-root-court` | wilds | camp 抽取 | `marsh-oath` 呼應圍困 | 原創 |
| `forge`（改寫） | 鍛造 | 快速戰或圍困成功 | 依職業鎖定直接／準備型專精 | 原典鍛劍 + 原創專精 |
| `gate`（改寫） | Porte Resonant | Sacnoth | 宣名設 `alert`；無聲進入不設 | 原典 654–680 + 原創警戒 |
| `porte-resonant` | 堡內分流 | gate | 互斥設定 `parley-route` 或 `dream-route` | 原典龍吠／人物 + 原創互斥 |
| `parley-guard`～`parley-cistern`（4 節） | 交涉線 | parley | 傳話、骨匙、`guard-intel` 延遲影響守龍 | 原典衛隊／侍者 + 原創傳話玩法 |
| `dream-woman`～`dream-stair`（4 節） | 辨夢線 | dream | 狼名、燭淚鏡、`dream-intel` 延遲影響 Gaznak | 原典火眼夢女／牆中狼 + 原創玩法 |
| `fortress-clock-room` | fortress | refuge 抽取 | `servant-key` 延伸侍者線索 | 原創 |
| `fortress-mouth-door` | fortress | refuge 抽取 | `dream-intel` 延伸終戰提示 | 原創 |
| `fortress-candle-child` | fortress | refuge 抽取 | `candle-sign` 延伸歸鄉歧義 | 原創 |
| `fortress-folded-hall` | fortress | refuge 抽取 | `fortress-map` 保存路線後果 | 原創 |
| `throne`（改寫） | 終戰 | threshold | Gaznak 勝利先到歸鄉記錄 | 原典手腕破綻 + 原創意圖加成 |
| `homecoming-records` | 歸鄉 | Gaznak 勝利 | 選擇保存三個矛盾版本之一 | 原典 786–797 + 原創記錄介面 |
| `fever-dawn`、`nameless-dawn` | 勝利尾聲 | 歸鄉選擇 | 去重保存 tale，不額外發貨幣 | 原典歧義 + 原創具體文本 |
| `dawn`（改寫） | 勝利尾聲 | 歸鄉選擇 | 保存 `hero-return` | 原典堡壘消散 + 原創歸來互動 |

八件新事件都有至少三個不同資源／情報結果；`wild-reed-oracle`、`wild-herbalists-cache`、`wild-ash-birds`、`wild-root-court`、`fortress-clock-room`、`fortress-mouth-door`、`fortress-candle-child`、`fortress-folded-hall` 均至少有一個跨節點旗標後果。
