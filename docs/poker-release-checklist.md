# 通勤牌局 release verification

驗證日期：2026-08-25。測試基準：Vite local development server、Codex in-app browser、360 × 800 CSS px viewport。

## Browser mobile checks

- [x] Shared hub 在 360px 顯示兩個入口，`documentElement.scrollWidth === clientWidth === 360`。
- [x] `/#/daily` 與 `/#/play/2?seed=123456` direct load 原有 Sudoku；未知 hash route 回到 hub。
- [x] `/poker` 新局、`/poker/play` direct reload、browser back 回 landing 並顯示 Resume。
- [x] Round intro 在 interruption/reload 後保留 opponent、stage、round、target、rule 與 actions。
- [x] Selecting 在 interruption/reload 後保留 8-card hand、selection workflow、draw/hands/discards。
- [x] Pair selection 同時呈現 `aria-pressed`、「已選」、「計分」文字與 projected hand，不只靠顏色。
- [x] Discard 後 finite deck 減少且補回 8 張；Play 後停在 inspectable resolving phase。
- [x] Resolving reload 前後保留同一 `+56`、`pair`、`28 × 2` trace，再由明示按鈕完成計分。
- [x] Early target completion 以 Flush `81 × 4` 從 56 達 380/300，停止額外 play。
- [x] Round settlement 進 shop，reward/remaining hands 產生 5 coins；purchase 後 coins 與 inventory 只更新一次。
- [x] Pack 在同一 shop 開啟 2 choices / take 1，選取後返回 shop且 PRNG/inventory 保留。
- [x] 第二張效果牌以 44px 左移/右移 controls 重排，reload 後 order 保留。
- [x] Special round intro 顯示特殊規則；action-exhaustion defeat reload 後仍是 terminal screen 與相同 score/economy。
- [x] Poker gameplay、shop、pack、reorder 與 terminal screens 的所有 button 實測高度至少 44px，mobile overflow 為 0。
- [x] Browser console 無 application error；只有開發期 router future warnings，已透過 HashRouter future flags 消除。

Victory、round/stage boundary、purchase、pack、reorder 與所有可持久化 phase 另外由 deterministic Node simulation 建立 exact snapshot round-trip；相同 seed/action sequence deep-equal。此方式避免手動 QA 依賴隨機抽牌才能抵達 10,000 分 final round。

## Long content and accessibility

- Catalog player copy 全部使用中性繁體中文；effect/pack/rule descriptions 在 360px 單欄或換行，無 horizontal page scroll。
- Native buttons/details 提供 keyboard parity；phase heading 變更後接收 focus。
- 選取、contributing、disabled、success、failure 都有文字或符號標記。
- `prefers-reduced-motion: reduce` 移除 transition/animation duration，selected card 改用 outline，不依賴位移。

## Asset audit

- `src/`、`public/`、`index.html` 無研究對象名稱、角色、品牌化 modifier 名稱或 logo。
- Poker assets 僅標準 Unicode rank/suit、CSS、文字與幾何符號；沒有第三方 bitmap/vector/audio/font/source code。
- 第三方內容仍只有既有 public-domain Sudoku puzzle bank，notice 未變。
- Compatibility research 的來源名稱/URLs 只存在 `docs/` 與 development provenance，不進 player-facing display fields。
