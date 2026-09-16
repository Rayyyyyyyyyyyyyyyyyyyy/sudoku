# 2026-09-16 規格比對修正

本節更新當前狀態；下方 2026-09-15 記錄保留為歷史，不代表本機目前工具狀態或新的操作授權。

- 使用者本輪同意先修正比對發現的規格問題。已在本機 `claude/offline-gameplay-mechanism-osk20x` 帶入附件補丁；遠端目前仍為 `13fe2ec`，附件所述 `ad898b3`／`5c9fa5a` 尚未出現在該遠端分支。本次未提交或推送。
- 新增 `baseline.md`，固定 v2 SHA、165 選項、文字計數方式與 84 場獨立戰鬥重現指令；修正無代價技能、全職業無機制差異與閱讀行為的過度推論。
- 已同步 proposal／design／tasks／spec：終章固定三列及單一起點，不適用前四章的首列戰鬥、前兩列禁令、特殊節點不得連續及多起點要求；全部五章仍保留可勝性等驗證。
- 已移除要求改寫不存在的 v2 空 run 拒絕條件；改為保留合法非空 profile 搭配 `run: null`，並新增 v3 round-trip 與非法 profile 拒絕 scenario。
- 本機 OpenSpec CLI 可用，已使用正式 Explore skill 並執行 strict validation；現有 v2 型別檢查、205 項測試及建置的環境與限制見 `baseline.md`。
- 本次未實作 production code、v3 migration 或 UI。五成分具體效果、結算時序、Frontier 與戰前重配語意、AND–OR 搜尋終止與效能仍待釐清，實作閘門保持未完成。

---

# RPG 重建交接記錄

## 本次保存範圍

- 日期：2026-09-15。
- 分支：`claude/offline-gameplay-mechanism-osk20x`。
- 規格修正 commit：`ad898b3 docs(rpg): resolve spell run design decisions`。
- 本輪只有 OpenSpec 文件修改；尚未實作 production code、migration 或新 UI。
- 使用者要求保存截至本次對話的進度，並同步目前分支至 origin；不涉及 main、merge、部署或其他 change 歸檔。

## 使用者已確認的方向

1. 敵人詞綴可疊加。
2. 法術採位置中立為主，只保留降甲在重擊之前的明示順序關係。
3. 失敗可付代價逃離。
4. 必須有一鍵整理。

## ad898b3 已記錄的規格

- 區分地圖候選節點與實際走訪：前四章各六列，終章三列，共走訪 27 節點。
- 具名座標亂數 domain、每場獨立 PRNG、有限生成嘗試與安全模板 fallback。
- 可持久化 `failed` phase、遭遇進場狀態、章節基線與撤離後提交新基線。
- 撤離的具體規格為每章一次、非首領限定、放棄該節點收益；這是本輪設計細化，不應誤述為使用者逐項指定。
- 詞綴上限三個、canonical 集合、互斥子集、每詞綴獨立 badge。
- 殘頁原子搬移、免費重配、單一明示連線、一次啟動的整理。
- 死語與降甲不得成為尚未解鎖時的唯一可勝解。
- 龍鱷聚合反傷與迴響一次性反傷分開處理。
- 節點入口 Reachable Power Frontier，以及不偷看未揭示意圖的 AND–OR 認證方案。
- 外部遊戲的精確數量、版本與機制描述降為待一手來源覆核。
- tasks 加入最小垂直切片先行的實作閘門。

以上是已提交的設計文本，不代表玩法、可勝性、搜尋成本或全部跨檔一致性已獲證明。

## 下一步提案：尚未核准實作

建議分階段建立純法術 domain、v3 狀態機、認證測試，最後整合可玩 UI；尚未開始。

目前 tasks 仍指定五成分各兩張殘頁、兩隻敵人、兩個詞綴。對話後續曾提議以空鎧騎士／鐵脊龍鱷測試，並把詞綴改為緘默／迴響／遲滯三個，以覆蓋合法與禁止配對。這只是提案，使用者未確認，未修改 tasks。也可用 validator fixtures 測禁止集合，不必因此擴大可玩內容。

開始實作前仍須討論／核對：

- 五成分的實際效果、條件與數值，而不只是效果取向。
- 詠唱、回復、傷害、反傷、死亡的精確結算時序。
- Frontier 是否涵蓋戰前重配；「所有合法配裝可勝」與「失敗配裝改配後成功」的驗收語意須區分。
- AND–OR 的資訊狀態、合法分支、終止條件與效能，尚無實作證據。
- 終章固定聖所→精英→首領，與通用首列戰鬥／前兩列禁止特殊節點規則的例外範圍仍需覆核。
- 僅有生命 50% 保底不能單獨證明可勝；生成 fallback 也不能替代可勝性證明。
- 凍結 v2 相容性資料後再改 catalog；目前 `validGame` 已接受 `run: null`，不要照舊設計描述重做不存在的限制。

## 驗證的真實狀態

- `git diff --check` 通過。
- 自訂文件結構檢查檢視 delta header、requirement/scenario 結構；不是官方 OpenSpec strict validation，亦不能證明語意一致。
- 先前重複標題檢查使用 `rg -h`，該旗標是 help 而非 no-filename；不能視為有效的重複標題驗證，需以 `rg --no-filename` 重跑。
- OpenSpec CLI 尚未確認安裝成功，官方 strict validation 未執行。
- `npm run typecheck`：缺少 `tsc`。
- `npm run build`：缺少 `vite`。
- `npm test`：engine 階段 128 通過、1 失敗；失敗檔案因缺少 `react` 無法載入。後續 RPG/UI test 階段未執行；不可宣稱全套測試通過。

## OpenSpec Explore 的狀態與工作邊界

使用者指定使用正式 OpenSpec Explore，不接受助手自行改成「依精神模擬」。官方 skill 已透過 GitHub connector 取得並完整讀取：

https://github.com/Fission-AI/OpenSpec/blob/main/skills/openspec-explore/SKILL.md

安裝嘗試未完成：shell 直連 GitHub 逾時；installer 被停止；npm 查詢的後續檢查遭自動審批服務故障，未確認結果。不可宣稱 skill 或 CLI 已安裝，也不可宣稱已完整執行正式 Explore。

使用者其後暫停安裝處理，改要求本次記錄與 origin 同步。恢復 Explore 時應遵守官方指引：只讀調查、逐一釐清決策；討論回答不等於文件寫入授權，不能自行實作或自動把提案改成定案。
