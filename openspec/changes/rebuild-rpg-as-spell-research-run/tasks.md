## 0. 實作閘門（本檔章節依能力分組，不代表交付順序）

- [ ] 0.1 先完成並嚴格驗證本 change 的全部 OpenSpec 文件；規格仍有孤兒 scenario、跨檔矛盾或未決核心行為時不得進入 production 實作。
- [x] 0.2 第一個可玩垂直切片只使用五成分各 2 張殘頁、2 隻敵人與 2 個詞綴，先驗證 evaluator、配裝差異、章節基線與付代價撤離；未通過決策指標前不得擴寫 60 張殘頁。
- [ ] 0.3 垂直切片通過後才依序擴成 7 隻敵人、6 詞綴與 60 張殘頁，再進行完整地圖、migration、離線與 UI 驗收。

> 0.2 完成範圍為獨立實驗，見 `slice-contract.md` 與 `slice-evidence.json`；0.1 尚未關閉，不代表正式 schema 3 或其餘 production 任務完成。

## 1. 凍結基線與撤回既有主張

- [x] 1.1 以 `baseline.md` 中固定 SHA `e9e738c` 與重現指令核對 v2 現況（64 節、165 選項、7 敵人、3 職業、11,252 文字字元，其中場景與變體為 6,909）；實作前重跑並保存結果，將獨立戰鬥 fixture 與全遠征驗收分開，作為改善前對照（rpg-design-verification）。
- [x] 1.2 在 `docs/rpg-verification.md` 明寫撤回「約三小時」主張與六人真人門檻，說明資源不足的判定，保留 v2 既有結果不刪改（rpg-design-verification）。
- [x] 1.3 盤點 v2 將作廢的產出（故事圖、敘述、三職業六專精、`routeMatrix`、數量門檻、事件匯流規則、六項平面數值升級），確認 `expand-nightmare-fortress-expeditions` 於本 change 通過後才歸檔或撤回（rpg-content-compatibility）。
- [ ] 1.4 逐項以一手來源覆核 design 第 9 節的外部作品版本號、數量與機制描述，記錄連結、存取日期與可支持的精確主張；找不到一手來源者改標為假設或刪除，不得以搜尋摘要作為結案證據（rpg-design-verification）。

## 2. schema 3 契約與持久化邊界

- [ ] 2.1 定義 schema 3／`spell-research-1`：殘頁、原子移動、法術組成、詠唱與 `failed` phase、章節索引與目前基線、`generationAttempt`、canonical 詞綴集合、版本化互斥表、戰鬥獨立 PRNG、遭遇進場狀態、撤離額度、`escaped` 節點與解鎖式 `profile`；保留 `sudoku-drill-rpg-v1` key 與純引擎責任（rpg-content-compatibility）。
- [ ] 2.2 實作 canonical validation，涵蓋殘頁獨佔、行數上限、詠唱與 phase 一致性、seed domain、詞綴排序／去重／互斥、戰鬥 PRNG、遭遇進場狀態、撤離與章節基線；`battle`／`failed` 必須有進場狀態且只有 `battle` 可持有可消耗 PRNG；保留 v2 已有的「合法非空 profile + `run: null`」接受行為，加入 v3 退休遠征狀態的 round-trip 與非法 profile 拒絕案例，不放寬凍結的 v1 辨識條件（rpg-content-compatibility）。
- [ ] 2.3 實作 v1／v2 唯讀辨識與轉換預覽：保留歷史紀錄、退休舊 `run`、退休六項升級並全額退還其已花費的見聞；驗證退還金額精確且可立即使用（rpg-content-compatibility、rpg-permanent-progression）。
- [ ] 2.4 加入取消、重複確認、寫入失敗、讀取受阻、損毀、過大與未知版本的測試，確保不覆寫、不假報成功、不跨遊戲 key（rpg-content-compatibility）。

## 3. 章節與檢查點

- [ ] 3.1 實作章節結構與目前章節基線，包含玩家狀態、地圖 seed domain、撤離額度與 `escaped` 節點；目前 `run` 位於 `battle` 時另存戰鬥獨立 PRNG 與進場狀態，位於 `failed` 時只保留進場狀態，一併持久化並驗證（rpg-chapter-checkpoint）。
- [ ] 3.2 實作可持久化 `failed` phase 與一般死亡回溯：致命結算後停止耗用亂數並保留進場狀態，玩家選擇一般重來時才以目前章節基線取代 `run`；確保地圖、敵人、詞綴集合、意圖序列、事件與掉落可重現（rpg-chapter-checkpoint）。
- [ ] 3.3 實作永遠可用的「全部重來」：從故事起點重新出發，重置 `run` 全部內容並完整保留 `profile`；測試任何狀態下皆不停用、且不扣除任何永久養成（rpg-chapter-checkpoint、rpg-permanent-progression）。
- [ ] 3.4 移除 `contentValidation` 的環檢查，並在同一次變更中以章節基線、`escaped` 節點及一次性給予記錄承接防刷責任；證明兩者不同時缺席（rpg-chapter-checkpoint）。
- [ ] 3.5 實作具名 seed domain：地圖使用 `hash(runSeed, chapterIndex, generationAttempt, purpose)`、節點內容再加入 `nodeId`、戰鬥使用含 `generationAttempt` 的節點獨立序列化 PRNG；測試改走不同路徑時其他節點內容不變（rpg-chapter-checkpoint）。
- [ ] 3.6 實作章節起始生命保底 `max(carriedHp, floor(maxHp/2))`，於建立章節基線之前套用；測試低生命進章不會形成永久死局（rpg-chapter-checkpoint）。
- [ ] 3.7 實作五章 27 個實際走訪節點的骨架：章 1–4 各走訪 6 列且第 6 列為首領，終章走訪 3 列（聖所→精英→最終首領）（rpg-run-structure）。
- [ ] 3.8 實作章 1–4 最多 3 欄 × 6 列的候選圖、終章 1 欄 × 3 列、全圖揭示與遭遇身分預覽；360px 下不得橫向捲動（rpg-run-structure）。
- [ ] 3.9 僅對章節 1–4 的候選節點實作權重（戰鬥 50／精英 18／事件 16／聖所 11／補給 5）與強制骨架（第一列全為簡單池戰鬥、每條路徑於第 4–5 列經過聖所、第 6 列單一首領）（rpg-run-structure）。
- [ ] 3.10 依章節實作放置限制：章節 1–4 禁止前兩列的精英／聖所與連續特殊節點、至少兩個起點，連續三個權重戰鬥後排除戰鬥；全部五章仍禁止交叉路徑與同章重複遭遇身分。加入終章單一路徑「聖所→精英→首領」通過驗證的案例，確認其不套用前四章的放置限制；以版本化 `MAX_GENERATION_ATTEMPTS` 終止重試，耗盡後使用具名 `fallback` domain 與已驗證安全模板（rpg-run-structure）。
- [ ] 3.11 改為逐回合持久化而非逐節點；測試詠唱中途關閉後可還原至同一回合與詠唱進度（rpg-run-structure）。
- [ ] 3.12 實作每章一次的付代價撤離：只在非首領遭遇至少失敗一次後提供，回復遭遇進場狀態、放棄全部收益、標記 `escaped` 並提交新章節基線；測試後續死亡不會復原代價（rpg-chapter-checkpoint）。

## 4. 法術研究系統

- [ ] 4.1 先建立垂直切片 catalog：五種成分各 2 張、各自的效果取向、成分色票與符號；以此凍結 evaluator 契約，未通過 0.2 不擴寫內容（rpg-spell-research）。
- [ ] 4.1a 實作同成分等強度稽核：不存在任何一張在所有敵人與行數配置下皆不劣於同成分其他張；稽核失敗須調整數值而非以稀有度標記迴避（rpg-spell-research）。
- [ ] 4.1b 為死語加入永遠有作用的基礎效果，避免反制型成分在多數遭遇中成為死內容與「垃圾殘頁」（rpg-spell-research）。
- [ ] 4.1c 實作單趟取得 10–14 張、約 12 次三選一、同時呈現不超過 3 個選項；取得與組成僅於遭遇之間開啟（rpg-spell-research）。
- [ ] 4.1d 實作持有上限為可放置格數的 60–75%，並列出各解鎖階段的有效池大小；達上限時開啟並列替換介面而非以「已滿」拒絕（rpg-spell-research、rpg-permanent-progression）。
- [ ] 4.2 實作組成規則：1–5 行、殘頁獨佔與原子移動、行數即等級；活語／死語／象鳴位置中立，每個獵鯨呼喊只要前方至少一個駱駝詛咒即套用合計降甲與一次重擊加成；超出容量或解鎖上限時整筆拒絕（rpg-spell-research）。
- [ ] 4.2a 實作一鍵整理的穩定分組：固定三種中立成分所在格，只把其餘格的駱駝／獵鯨子序列分成駱駝在前、獵鯨在後，兩組內維持相對順序；控制項先顯示將新增的連線數，單次啟動即原子套用且不跳確認，已是 canonical 順序時為 no-op（rpg-spell-research）。
- [ ] 4.3 實作詠唱回合與打斷：1–2 行即時、3–4 行詠唱 1 回合、5 行詠唱 2 回合，被 `interrupt` 命中時失效並退還一半魔力（向下取整），戰鬥結束清除（rpg-spell-research）。
- [ ] 4.4 調整魔力經濟：格擋至多回 1 魔，移除任何無代價且可無限重複的魔力來源；以固定序列測試證明無法無限維持高行數法術（rpg-spell-research）。
- [ ] 4.5 移除戰士與遊俠及六專精，改以首批殘頁選擇作為開局決策；清理相關型別、catalog 與 UI（rpg-spell-research）。
- [ ] 4.6 實作揭示深度規則：介面揭示的意圖數等於承諾回合數（1 回合詠唱揭示 1 個、2 回合揭示 2 個），採漸進揭露；加入「不存在需要賭未揭示意圖的行動」的列舉測試（rpg-spell-research）。
- [ ] 4.7 垂直切片通過後將 catalog 擴至出貨 60 張（每成分 12），稀有度約 常見 50／罕見 33／稀有 17；稀有度調節情境性而非絕對強度（rpg-spell-research）。

## 5. 永久養成與解鎖

- [ ] 5.1 設計解鎖式養成清單（成分、行數上限、殘頁持有上限、開局殘頁範圍），並逐項說明其為何是解鎖而非數值；移除 v2 六項平面數值升級（rpg-permanent-progression）。
- [ ] 5.2 實作行數上限的逐步解鎖，並讓 canonical validation 拒絕超出已解鎖上限的組成（rpg-permanent-progression、rpg-spell-research）。
- [ ] 5.3 實作見聞的一次性給予與 `profile` 層級跨趟去重；加入「全部重來後重玩同段落」與「章節重來後再達同一給予點」皆不重複給予的測試（rpg-permanent-progression）。
- [ ] 5.4 驗證 `profile` 在死亡、章節重來、全部重來、撤離與勝利後皆完整保留，且無任何路徑會扣除已解鎖養成或見聞餘額（rpg-permanent-progression）。
- [ ] 5.5 在 catalog 中列舉全部見聞給予點與解鎖定價，實作預算核對測試：總價格 ≤ 總供給 × 85%、無未列舉的給予來源、最低價項目低於第一趟期望給予量（rpg-permanent-progression）。
- [ ] 5.6 以決策 5b 的起始配置（總供給 22、總價 18）實測節奏，校準個別數字；維持有界模型與三條預算規則不變（rpg-permanent-progression）。
- [ ] 5.7 定義並列舉「全解鎖 profile」狀態供驗收重現，確認解滿後不再給予見聞（rpg-permanent-progression、rpg-design-verification）。

## 6. 敵人改造與意圖

- [ ] 6.1 以既有七隻敵人實作各自的解法需求（怨魂非實體、巨蛛束縛、騎士高護甲、龍鱷反傷、魔狼打斷、守龍穿透、加茲納克綜合），不新增敵人定義（rpg-encounter-counterplay）。
- [ ] 6.2 以節點座標建立並序列化每場戰鬥的獨立 PRNG，由它抽取意圖序列；各敵人意圖數不再一律為 3，揭示數量依 4.6（rpg-encounter-counterplay）。
- [ ] 6.3 移除任何依玩家狀態調整敵方數值的路徑；加入「後期法術書對前期敵人明顯較易」的回歸測試（rpg-encounter-counterplay）。
- [ ] 6.4 驗證相同 seed 與行動序列可完整重播意圖與結算，PRNG value／calls 與不中斷對照一致（rpg-encounter-counterplay）。
- [ ] 6.5 實作六種可疊加詞綴及章節上限（0–1／1／1–2／2／2–3，精英 +1、總上限 3）；詞綴集合去重、依 enum 排序，以「敵人 + canonical 集合」建立身分（rpg-encounter-counterplay）。
- [ ] 6.6 由節點座標 seed 從已認證集合選取詞綴；先禁止 `遲滯 + 淬毒`、`緘默 + 遲滯`，新增互斥組合必須附認證失敗證據，不以無界重抽生成（rpg-encounter-counterplay、rpg-chapter-checkpoint）。
- [ ] 6.7 確認詞綴不產生見聞給予點；枚舉每個章節認證通關策略的 canonical 遭遇身分與其入口 Reachable Power Frontier 配對，證明不存在只能靠撤離前進的組合（rpg-encounter-counterplay、rpg-permanent-progression）。
- [ ] 6.8 重寫反傷：龍鱷將每個傷害層的固定值聚合成每次玩家行動一次結算；迴響只在首個傷害行動觸發一次且不隨段數增加；兩者皆可減免、有單次上限並預先顯示。分別驗證龍鱷未達上限且無減免時更多傷害層反傷較高、皆達上限時相等、加入非傷害層且減免不變時相等，以及僅有迴響的敵人在相同上限／減免下不同段數的首次反傷相等且後續不再觸發；不以法術總行數要求嚴格增傷（rpg-encounter-counterplay）。
- [ ] 6.9 為每個疊加詞綴實作獨立四通道 badge：常駐文字、六種外形、六種線條樣式、Okabe-Ito 顏色為輔；線寬不小於 3 邏輯像素，不以紅綠承載語意（rpg-encounter-counterplay）。
- [ ] 6.10 以紅色盲、綠色盲、藍黃色盲模擬器及純灰階各渲染詞綴標記集合，斷言六者兩兩於四種渲染下皆可區分；提供「高對比詞綴標籤」選項（rpg-encounter-counterplay）。

## 7. 砍除敘述與擴充規則文字

- [ ] 7.1 刪除 `paragraphs` 與 `variants`（6,909 字）及其驗證規則；移除節點數 ≥62、選項數 ≥151 的數量門檻與事件匯流規則（rpg-design-verification）。
- [ ] 7.2 擴充選項與規則文字，使成分、殘頁占用狀態、行數、詠唱、打斷、詞綴與敵人解法在介面上足以支撐配裝判斷；為條件不足的選項提供明確原因（rpg-spell-research）。
- [ ] 7.3 移除或改寫 `npm run rpg:text` 與 `docs/rpg-story.md`，不留下會產生空稿的指令；`provenance` 改為記錄規則素材的原典出處（rpg-content-compatibility）。

## 8. UI 與第一階段美術

- [ ] 8.1 修正圖集 6 處錯配：無名怨魂、空鎧騎士、墓地魔狼、療傷藥、盟約繩結、燭淚鏡；砍除職業後釋出的 2 格一併重新指派（rpg-encounter-counterplay）。
- [ ] 8.2 將戰鬥主視覺由 48px 放大至可辨識尺寸（原圖每格 313×313），第 12 與第 14 格改作章節背景；保留 `image-rendering: pixelated`（rpg-encounter-counterplay）。
- [ ] 8.3 實作研究畫面：殘頁清單、成分色票與符號、占用狀態、明示連線與數值預覽、一鍵整理、已解鎖上限、下一場遭遇的預期代價；組成行動在戰鬥中被拒絕（rpg-spell-research）。
- [ ] 8.4 實作村莊養成畫面：見聞餘額、解鎖清單與各項說明、已解鎖與未解鎖的區別；全部重來的入口與後果說明（rpg-permanent-progression）。
- [ ] 8.5 實作零成本原子移動：拖入已配置殘頁時直接搬移並在原位留下空缺，另提供點按與鍵盤的「選取殘頁→選取目的格」等價操作；同頁呈現全部法術與常駐「未配置」區，無作用配置明示原因（rpg-spell-research）。
- [ ] 8.6 在 360px 與桌面檢查章節地圖、研究畫面、養成畫面、戰鬥主視覺、章節重來與全部重來的觸控、鍵盤焦點與無水平溢出，保留可重現證據（rpg-spell-research、rpg-run-structure）。

## 9. 可計算指標驗收

- [ ] 9.1 實作固定策略模擬（純普攻、純施法、格擋施法交替、貪婪最高行數、各單一成分獨用），證明每個策略至少在一章失敗；**在空 profile 與全解鎖 profile 兩種狀態下各執行一次**並分別記錄；列為常設測試（rpg-design-verification）。
- [ ] 9.2 實作由引擎狀態計算的決策統計，證明決策回合佔比 ≥60%；移除以人工字串陣列長度代表決策數的做法（rpg-design-verification）。
- [ ] 9.3 對每隻敵人提供兩組對照配裝，證明獲勝回合數差異 ≥30% 或其一無法獲勝，且差異來自機制需求（rpg-design-verification）。
- [ ] 9.4 對每個章節提供一組失敗配裝與一組成功配裝，於相同章節基線下分別重現，並確認與一般重來及付代價撤離不衝突（rpg-design-verification、rpg-chapter-checkpoint）。
- [ ] 9.5 為每個章節基線（含撤離後新基線）的通關策略列舉節點入口 Reachable Power Frontier；只有在較強狀態能無代價模擬較弱狀態時才做支配消去，否則保留兩者，並使可達性與消去證據可重現（rpg-design-verification）。
- [ ] 9.6 實作保守靜態篩檢 S1（以完整規則的樂觀傷害上界／承傷下界證明回合死局）、S2（壓制詠唱下 DPS ≤ 0）、S3（最小可減免反彈仍致死）；不得以平均 DPS 簡式誤拒（rpg-design-verification）。
- [ ] 9.7 實作資訊一致的記憶化 AND–OR 搜尋：狀態只含 UI 已揭示意圖，玩家行動為 OR、承諾範圍後所有合法未揭示意圖為 AND；禁止以固定 seed 偷看未來，回合上限界定深度（rpg-design-verification）。
- [ ] 9.8 實作餘裕門檻 M1（生命餘裕 ≥25%）、M2（≥3 個結果不同的獲勝開局）、M3（寬容度一般 ≥0.30／首領 ≥0.15），判定分 `IMPOSSIBLE`／`KNIFE_EDGE`／`OK` 三級並於 CI 阻擋前兩者（rpg-design-verification）。
- [ ] 9.9 於 CI 驗證每份章節基線的完整通關策略，枚舉該策略全部意圖分支的「節點 canonical 遭遇身分 × 入口 Reachable Power Frontier」配對並快取結果；不得與無法抵達該節點的狀態做笛卡兒積，撤離不得算作勝利，進入未認證遭遇視為程式錯誤（rpg-design-verification）。
- [ ] 9.10 執行 `npm test`、`npm run typecheck`、`npm run build`、`git diff --check` 及本 change 的 strict OpenSpec validation，記錄真實結果（rpg-design-verification）。

## 10. 實機離線驗收

- [ ] 10.1 在指定手機／平板與桌面瀏覽器安裝凍結 production build，記錄來源、版本、SW 控制與 precache；完全斷網、關閉並冷開 `/#/rpg`，驗證新規則、圖集與操作（rpg-content-compatibility）。
- [ ] 10.2 在五類狀態（章節開始、詠唱中、研究畫面、養成畫面、撤離後的新章節基線）逐一離線關閉續玩，與不中斷對照狀態及後續行動比較（rpg-chapter-checkpoint）。
- [ ] 10.3 在線執行 v2 → v3 安裝後重新斷網，驗證轉換確認、取消、歷史保留、見聞退還、新內容快取，以及其他遊戲資料與 cache 不受影響（rpg-content-compatibility）。
- [ ] 10.4 重現既有「停止 preview 後空白」觀察，記錄 SW 與安裝狀態；必要時最小修復並跑跨遊戲回歸（rpg-content-compatibility）。

## 11. 第二階段美術（不阻擋本輪驗收）

- [ ] 11.1 確認法術書的色票與符號系統在 360px 與深淺色下皆可辨識，不依賴新增像素圖；僅在敵人與章節背景需要時才評估新圖，並在管道確定前不承諾視覺規格（rpg-spell-research）。
- [ ] 11.2 確認離線快取預算：現有圖集 1.4MB，評估新增圖示對 precache 體積的影響並設定上限（rpg-content-compatibility）。

## 12. 文件與交付界線

- [ ] 12.1 更新 `docs/rpg-architecture.md`、`docs/rpg-source-reference.md`（記錄四十行咒語的成分結構採用方式，以及「韻」評估後未採用的理由）與 README 的事實狀態（rpg-content-compatibility）。
- [ ] 12.2 撰寫結案說明：只陳述已驗證的決策指標與離線行為，不含任何時長主張；若日後補上時長，明記樣本數與條件（rpg-design-verification）。
- [ ] 12.3 對最終內容再次執行適用的 OpenSpec strict 驗證與 diff check；不自動部署、不歸檔其他 changes。
