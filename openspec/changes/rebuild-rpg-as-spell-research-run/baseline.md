# v2 基線與重現證據

## 實作前重跑：2026-09-16

新 worktree HEAD 為 `48d3178`，父提交 `a8bc804`，開始時工作目錄乾淨。
`git diff e9e738c HEAD -- src test package.json package-lock.json` 為空。
以 Node `v22.16.0` 執行下方原始指令成功；保存未刪節 stdout 於
[`baseline-2026-09-16.jsonl`](baseline-2026-09-16.jsonl)，包含純普攻的 33 個失敗 fixture。
本次重跑核對 64 節、165 選項、7 敵人、3 職業、11,252 字元、84/84 與 51/84，
亦核對非空 profile 搭配 `run: null` 被接受。仍然只證明所列獨立戰鬥與靜態盤點。
此 worktree 尚無 `node_modules`；下方「工程驗證」是先前暫存副本的結果，不是本次新跑。

2026-09-16 核對。程式固定基線為 `e9e738c6d46643d9816cb1f7265be3c802758775`；規格分支 `13fe2ec` 與該基線的 `src/`、`test/`、建置及套件檔案相同。本次只修訂 OpenSpec 文件，不實作 v3。

## 量測結果與邊界

| 項目 | 結果 | 可支持的結論 |
| --- | --- | --- |
| 劇情 | 64 節、165 選項 | 151 是舊規格下限，不能當成現況總數 |
| 多選項節點 | 56 個，其中 44 個所有 `next` 相同 | 路線匯流；不代表效果或後續條件相同 |
| 事件 | 16 個、48 選項 | 現有 validator 強制回到指定節點 |
| 敵人意圖 | 七敵人各 3 個，固定循環 | 不由 PRNG 抽取；敵人的吸魔、穿透等效果仍有差異 |
| 技能優先，無魔則格擋 | 84／84 獨立戰鬥獲勝 | 所測初始配置下固定策略適用面廣 |
| 純普攻 | 51／84 獨立戰鬥獲勝 | 在此樣本比技能優先更少獲勝，並非所有狀態下嚴格劣勢 |
| 文字 | 場景 5,997、變體 912、選項標籤與說明 4,343，共 11,252 字元 | Unicode code point 數，含標點與空白；不推導閱讀時間 |
| 合法非空 profile + `run: null` | `validGame` 接受 | v3 要保留既有能力；v1 的嚴格 legacy 辨識是另一條邊界 |

獨立戰鬥 fixture：三職業 × 七敵人 × seeds `[0, 1, 2, 42]`；初始等級 1、無永久升級、無專精、無裝備遺物，沿用新角色生命與魔力。不用藥、不撤離，最多 100 個玩家行動。直接植入敵人以隔離戰鬥規則，**不是合法故事路徑重播，也不證明全遠征可達性或存檔有效性**。兩種策略各自從相同初始狀態開始。

戰士反擊專精未準備時技能仍受護甲影響；法師準備後減耗、遊俠準備後破綻加傷，以及職業限定路線，皆為現有機制。上述無專精 fixture 沒有測到這些情境，不能宣稱六專精皆無差異。

舊稿的 21 場戰鬥、最終戰回合數、事件收益形狀分類、783 字元存檔樣本沒有完整重現條件，本次不將其用作已驗證基線。v3 存檔大小、閱讀行為、時長與可勝性都尚未證明。

## 重現指令

在上述基線或 `src/` 未改動的規格分支根目錄，以 Node 22 的型別移除模式執行；此指令只讀程式並在記憶體中模擬，不讀寫玩家存檔。

```sh
node --experimental-strip-types --input-type=module <<'EOF'
import {createGame, transition, getAvailableActions} from './src/lib/rpg/engine.ts';
import {STORY, EVENT_POOLS} from './src/data/rpg/story.ts';
import {CLASSES, ENEMIES} from './src/lib/rpg/catalog.ts';
import {validGame} from './src/lib/rpg/persistence.ts';
const multi=STORY.filter(n=>n.choices.length>1);
const events=Object.values(EVENT_POOLS).flat().map(id=>STORY.find(n=>n.id===id));
console.log(JSON.stringify({nodes:STORY.length,choices:STORY.reduce((s,n)=>s+n.choices.length,0),multi:multi.length,sameDestination:multi.filter(n=>new Set(n.choices.map(c=>c.next)).size===1).length,events:events.length,eventChoices:events.reduce((s,n)=>s+n.choices.length,0),intentLengths:Object.fromEntries(Object.entries(ENEMIES).map(([k,e])=>[k,e.intents.length]))}));
// Isolated fresh level-1 fixtures: not a claim of legal full-campaign reachability.
for(const policy of ['skill-else-guard','attack']) {
 let wins=0,total=0;const failed=[];
 for(const classId of Object.keys(CLASSES)) for(const enemyId of Object.keys(ENEMIES)) for(const seed of [0,1,2,42]) {
  let game=transition(createGame(),{type:'start',classId,seed,revision:0}).state;
  Object.assign(game.run,{phase:'combat',battle:{enemyId,hp:ENEMIES[enemyId].hp,round:1,intent:0,next:'camp',prepared:false}});
  for(let i=0;i<100 && game.run.phase==='combat';i++) {
   const id=policy==='attack'?'attack':getAvailableActions(game).find(a=>a.id==='skill'&&!a.disabled)?'skill':'guard';
   game=transition(game,{type:'combat',id,revision:game.revision}).state;
  }
  total++;if(game.run.phase==='story') wins++;else failed.push({classId,enemyId,seed});
 }
 console.log(JSON.stringify({policy,wins,total,failed}));
}

const chars=xs=>xs.reduce((n,s)=>n+[...s].length,0);
const paragraphs=chars(STORY.flatMap(n=>n.paragraphs));
const variants=chars(STORY.flatMap(n=>(n.variants??[]).map(v=>v.text)));
const choices=chars(STORY.flatMap(n=>n.choices.flatMap(c=>[c.label,c.detail])));
console.log(JSON.stringify({paragraphs,variants,choices,total:paragraphs+variants+choices}));
const retired=createGame();
Object.assign(retired.profile,{insight:2,expeditions:1});
console.log(JSON.stringify({nonemptyProfileWithNullRunAccepted:validGame(retired)}));
EOF
```

## 工程驗證

2026-09-16 在規格分支的暫存副本（共用本機既有 `node_modules`）執行：`npm run typecheck` 通過；`npm test` 通過 135 個 engine、35 個 RPG、35 個 UI 測試，共 205 個；`npm run build` 通過，帶有 bundle 大小警告。這是本機既有依賴環境的結果，未執行乾淨安裝、瀏覽器離線實測或 v3 遊玩驗收。

文件格式另由 `openspec validate rebuild-rpg-as-spell-research-run --strict --no-interactive` 驗證。格式通過不代表尚未定義的效果時序、可達狀態認證或搜尋效能已解決；tasks 0.1 的實作閘門仍不勾選。
