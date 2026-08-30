# 通勤牌局相容性矩陣

資料基準：Windows `v1.0.3.1551`。`verified` 表示來源直接顯示該值；`inferred` 表示由二手規則或 OpenSpec 基線推定；`unknown` 使用具名、可替換的 deterministic provisional value。完整 provenance 與研究連結見 `poker-compatibility-research.md`，不會顯示在玩家介面。

| 規則 | 值 | 狀態 |
| --- | --- | --- |
| 手牌上限 / play / discard | 8 / 4 / 4 | verified / verified / verified |
| 牌庫 / 效果牌上限 | 52 / 6 | verified / verified |
| 每 stage rounds | small、big、special，共 3 回合 | verified |
| 主要對手 | 3 stages、9 rounds | verified（實機逐幀） |
| 其他五名對手 | 各自獨立 1 stage、3 rounds | verified（實機逐幀） |
| 結算 | base reward + remaining plays + interest | inferred |
| interest | `min(floor(coins / 5), 5)` | inferred |
| 初次 reroll | 1 coin | verified |
| 後續 reroll | `1, 2, 3, ...` | unknown；`linear-plus-one` provisional |
| shop offers | 2 effects + 1 pack | inferred；uniform sampling unknown/provisional |
| deck exhaustion | 不洗回；只能抽到剩餘張數 | unknown；採 finite-deck OpenSpec 行為 |

## 目標與獎勵

| 對手 | Stage | Small | Big | Special | 特殊規則 |
| --- | ---: | ---: | ---: | ---: | --- |
| 主要對手 | 1 | 300/3 | 450/4 | 600/5 | 人頭牌不提供牌面籌碼 |
| 主要對手 | 2 | 1000/3 | 1500/4 | 1500/5 | 鎖定第一個牌型 |
| 主要對手 | 3 | 5000/3 | 7500/4 | 10000/5 | 無額外選牌限制（產品調整） |
| 零棄牌試煉 | 1 | 300/3 | 1050/4 | 2100/5 | 0 discards |
| 歷史牌試煉 | 1 | 300/3 | 1050/4 | 2100/5 | 本 stage 已出牌失效 |
| 小手牌試煉 | 1 | 300/3 | 1050/4 | 2100/5 | hand size -1 |
| 單手試煉 | 1 | 300/3 | 1050/4 | 1050/5 | 1 play |
| 不重複試煉 | 1 | 300/3 | 1050/4 | 2100/5 | 每種牌型至多一次 |

除標示「產品調整」者外，表中 target/reward 與 special rule 均標為 `verified`（二手完整實機逐幀），但未宣稱 bit-exact RNG。33 張效果牌的價格、時序與互動多為 `inferred` 或 `unknown`，詳見 versioned catalog 的 `unknownBehavior`。
