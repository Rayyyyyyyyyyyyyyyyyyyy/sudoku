import type { EventPoolId, StoryNode } from '../../lib/rpg/types.ts';

export const SOURCE = {
  author: 'Lord Dunsany',
  title: 'The Fortress Unvanquishable, Save for Sacnoth',
  collection: 'The Sword of Welleran and Other Stories',
  url: 'https://www.gutenberg.org/cache/epub/10806/pg10806-images.html',
  edition: 'Project Gutenberg #10806 · updated 2024-11-03',
  notice: '依 Lord Dunsany 原作改編；繁中敘述、角色職業、分支與養成為本專案新寫。',
};

// Narrative order lives in choices, not array position. Each node records which
// motifs are adapted and which connective material was written for this game.
export const STORY: StoryNode[] = [
  {
    id: 'village', act: '序章・無眠之地', title: '第三個沒有夢醒的清晨',
    paragraphs: [
      '阿拉修里昂的鐘響了七次，廣場仍然沒有人。窗板後傳來低低的數數聲；村民靠數到天亮，確認自己還醒著。你在井邊看見一個孩子，緊握著早已熄滅的蠟燭。',
      '北方領主的年輕兒子曾往沼澤尋找一把劍，如今道路封閉，消息斷絕。村中法師把最後一封求援信交給你。蠟封上印著一座不可能存在的白色堡壘。',
      '「別答應我一定回來，」他說。「答應我，進去以前，先弄清楚自己拿的是什麼。」',
    ],
    choices: [{ id: 'listen', label: '聽法師說明夢魘', detail: '了解遠征目標，前往廣場準備。', next: 'briefing' }],
    provenance: { source: 'sacnoth', note: '村莊夢魘與失效的驅夢法術出自原作；玩家、孩子、求援信與失聯前驅為原創。' },
  },
  {
    id: 'briefing', act: '序章・無眠之地', title: '唯一能穿過夢的鋼',
    paragraphs: [
      '法師翻開一本燻黑的書。加茲納克乘著彗星而來，讓人的恐懼替他築城。鋼鐵攻不破他的要塞，尋常咒語也無法喚醒被困在夢裡的人。',
      '只有薩克諾斯。那並非已經掛在某位國王腰間的名劍，而是鐵脊龍鱷背上的一條異鋼。村中鐵匠能將牠的外殼熔去，留下劍身；一隻鋼眼磨出劍鋒，另一隻則嵌進劍柄。',
      '法師攤開兩件東西：一枚縫著銀線的護符，以及裝滿乾糧的布袋。「背包有限，自己選吧。能帶回來的見聞，也會幫到下一個出發的人。」',
    ],
    choices: [
      { id: 'ward', label: '帶上守夜護符', detail: '獲得護符；稍後可換取一條安全通路。', next: 'crossroads', effects: [{ kind: 'item', value: 'ward' }] },
      { id: 'supplies', label: '帶上乾糧與藥', detail: '補給 +2、療傷藥 +1。', next: 'crossroads', effects: [{ kind: 'resource', resource: 'supplies', amount: 2 }, { kind: 'item', value: 'potion' }] },
    ],
    provenance: { source: 'sacnoth', note: '彗星巫師、龍鱷異鋼與兩顆鋼眼依原作；二選一補給為遊戲設計。' },
  },
  {
    id: 'crossroads', act: '第一章・北方沼澤', title: '兩條離村的路',
    paragraphs: [
      '森林在岔路口分開。左邊的木橋通往獵人的營地，橋前停著一輛翻倒的貨車；右邊是被樹根推歪的古老路碑，箭頭指向一座廢棄禮拜堂。',
      '從這裡仍能看見村裡法師塔上的燈。你調整肩帶，給自己留了一條能回家的路。',
    ],
    choices: [
      { id: 'bridge', label: '走木橋，查看貨車', detail: '人物事件：可能交換物資與消息。', next: 'bridge' },
      { id: 'ruins', label: '進入廢棄禮拜堂', detail: '探索事件：尋找符文與古老的記錄。', next: 'ruins' },
    ],
    provenance: { source: 'original', note: '村莊到沼澤間的分支旅途。' },
  },
  {
    id: 'bridge', act: '第一章・北方沼澤', title: '車輪下的銅鈴',
    paragraphs: [
      '商人正試著把斷軸塞回車底。你走近時，他忽然把手中的扳手藏到背後，直到看清你的影子才鬆開肩膀。',
      '「昨夜有個東西，借我的聲音在橋下喊救命。」他敲敲銅鈴，聲音清脆。「這是真的。餓也是真的。若你有吃的，我拿錢和一個消息換。」',
    ],
    choices: [
      { id: 'help', label: '分給他一份乾糧', detail: '消耗補給 1；金幣 +3，記住商人的善緣。', next: 'ferryman', requires: [{ kind: 'resource', resource: 'supplies', amount: 1 }], effects: [{ kind: 'resource', resource: 'supplies', amount: -1 }, { kind: 'resource', resource: 'gold', amount: 3 }, { kind: 'flag', value: 'merchant' }, { kind: 'xp', amount: 2 }] },
      { id: 'trail', label: '沿河找一條安全的小徑', detail: '遊俠專屬：保存補給，獲得 2 經驗。', next: 'camp', requires: [{ kind: 'class', value: 'ranger' }], effects: [{ kind: 'xp', amount: 2 }] },
      { id: 'leave', label: '確認方向後繼續前進', detail: '不消耗資源。', next: 'camp' },
    ],
    provenance: { source: 'original', note: '商人、交換與後續報答均為新寫。' },
  },
  {
    id: 'ferryman', act: '第一章・北方沼澤', title: '擺渡人只收還活著的名字',
    paragraphs: [
      '商人所說的小徑在河邊終止。黑水中央泊著一艘窄船，船夫披一件綴滿魚骨的斗篷。他沒有槳，只把一根白木杖伸進水裡，船便逆著水流靠岸。',
      '船頭還坐著一名赤腳朝聖者，懷裡抱著沒有神像的木龕。她說夢魘來臨後，河會偷走渡客的名字；若沒有人在對岸叫出那個名字，渡客就會跟著倒影繼續往下游走。',
      '擺渡人伸出三根手指。「錢、歌，或一個願意替別人記住名字的人。」他腰間的小銅鈴沒有舌，卻在你注視它時輕響了一聲。',
    ],
    choices: [
      { id: 'ferryman_pay', label: '付兩枚金幣，請他渡你過河', detail: '金幣 -2；得到無舌銅鈴與擺渡人的暗號。', next: 'camp', requires: [{ kind: 'resource', resource: 'gold', amount: 2 }], effects: [{ kind: 'resource', resource: 'gold', amount: -2 }, { kind: 'item', value: 'bell' }, { kind: 'flag', value: 'ferryman' }, { kind: 'xp', amount: 1 }] },
      { id: 'ferryman_name', label: '替朝聖者記住她的名字', detail: '護送她到對岸；取得朝聖者的祝福，但擺渡人收回銅鈴。', next: 'camp', effects: [{ kind: 'flag', value: 'pilgrim' }, { kind: 'flag', value: 'ferryman' }, { kind: 'xp', amount: 2 }] },
      { id: 'ferryman_wade', label: '謝絕交易，沿淺灘涉水', detail: '生命 -3；保存金幣，趕在自己的倒影前上岸。', next: 'camp', effects: [{ kind: 'resource', resource: 'hp', amount: -3 }] },
    ],
    provenance: { source: 'original', note: '擺渡人、無名朝聖者、奪名之河與無舌銅鈴皆為新寫，用以延展沼澤旅程。' },
  },
  {
    id: 'ruins', act: '第一章・北方沼澤', title: '沒有燃料的火盆',
    paragraphs: [
      '禮拜堂的屋頂漏著晨光。祭壇上有一隻冰冷的火盆，盆底的刻線卻仍泛著暗紅。你用刀尖撥開灰，露出一行提醒：火可以帶走，飢餓不能。',
      '牆上畫著一條生滿鐵甲的巨獸。牠每次張嘴，口鼻周圍的刻痕就深一分；最厚的背甲上，反而沒有留下任何刀痕。',
    ],
    choices: [
      { id: 'rune', label: '以魔力讀取餘燼刻紋', detail: '魔力 -2；記下符文、龍鱷弱點，經驗 +2。', next: 'crypt', requires: [{ kind: 'resource', resource: 'mana', amount: 2 }], effects: [{ kind: 'resource', resource: 'mana', amount: -2 }, { kind: 'flag', value: 'rune' }, { kind: 'flag', value: 'weakness' }, { kind: 'xp', amount: 2 }] },
      { id: 'study', label: '抄下壁畫，留下火盆', detail: '辨識龍鱷弱點，不消耗資源。', next: 'crypt', effects: [{ kind: 'flag', value: 'weakness' }] },
    ],
    provenance: { source: 'original', note: '禮拜堂與符文原創；龍鱷的特殊弱點取材自原作。' },
  },
  {
    id: 'crypt', act: '第一章・北方沼澤', title: '月石照著墓中人的臉',
    paragraphs: [
      '祭壇後的石階通往地下。墓室裡沒有棺木，只有十二具披甲遺骸倚牆而坐，像一群等候命令太久的衛兵。第十三張石椅空著，椅背刻著與白色堡壘相同的塔形紋章。',
      '一枚月白色寶石嵌在隊長的眉骨上。你伸手時，空椅裡站起一個半透明的人影；牠沒有臉，胸前卻留著一枚被劍剖開的軍印。牠用死者的聲音問你，究竟替哪一位主人持劍。',
      '劍尚未鑄成，你只能以自己的名字回答。墓室的寒意隨那句回答聚攏，牆上十二具遺骸同時把頭轉向你。',
    ],
    choices: [
      { id: 'crypt_fight', label: '拒絕跪下，迎戰墓室怨靈', detail: '迎戰怨靈；勝利後從倒下的軍印旁離開。', next: 'camp', encounter: 'wraith' },
      { id: 'crypt_seal', label: '補全軍印上的封縛紋', detail: '法師專屬，魔力 -3；取得月石與舊軍印，經驗 +2。', next: 'camp', requires: [{ kind: 'class', value: 'mage' }, { kind: 'resource', resource: 'mana', amount: 3 }], effects: [{ kind: 'resource', resource: 'mana', amount: -3 }, { kind: 'item', value: 'moonstone' }, { kind: 'flag', value: 'sigil' }, { kind: 'xp', amount: 2 }] },
      { id: 'crypt_oath', label: '承諾終結堡壘的徵召', detail: '生命 -3；讓軍印記住你的血，取得月石與通行印記。', next: 'camp', effects: [{ kind: 'resource', resource: 'hp', amount: -3 }, { kind: 'item', value: 'moonstone' }, { kind: 'flag', value: 'sigil' }, { kind: 'xp', amount: 1 }] },
    ],
    provenance: { source: 'original', note: '地下墓室、怨靈軍隊、月石與舊軍印為新寫；堡壘會徵召死者的設定延伸夢築城堡的意象。' },
  },
  {
    id: 'camp', act: '第一章・北方沼澤', title: '獵人留下的灰圈',
    paragraphs: [
      '火堆外有一圈細灰，灰上沒有腳印。營地的主人已經離開，卻把一束乾柴架在石頭上，像是知道還會有人需要它。',
      '沼澤裡傳來鐘一樣的撞擊聲。每隔幾息，地上的水就顫一下。今晚你得決定，身上的力氣究竟要留給趕路，還是留給見到那東西的時候。',
    ],
    choices: [
      { id: 'rest', label: '生火休整後出發', detail: '補給 -1；生命 +12、魔力 +6（不超過上限），途中遭遇一件荒野異事。', next: 'marsh', eventPool: 'wilds', requires: [{ kind: 'resource', resource: 'supplies', amount: 1 }], effects: [{ kind: 'resource', resource: 'supplies', amount: -1 }, { kind: 'resource', resource: 'hp', amount: 12 }, { kind: 'resource', resource: 'mana', amount: 6 }] },
      { id: 'staff', label: '削一根結實的榛木杖', detail: '取得驅獸手段，對龍鱷的攻擊可無視護甲；途中遭遇一件荒野異事。', next: 'marsh', eventPool: 'wilds', effects: [{ kind: 'flag', value: 'staff' }] },
    ],
    provenance: { source: 'sacnoth', note: '榛木杖取自原作；營地休整和戰鬥效果為改編。' },
  },
  {
    id: 'wild-witchfire', act: '荒野異事・北方沼澤', title: '磷火在替死人帶路',
    paragraphs: [
      '離開灰圈不久，三團綠火從蘆葦間升起。它們排成一列，照著一條地圖上沒有的石路；每當你停步，最後一團火便回頭，像在確認你仍跟著。',
      '石路盡頭陷著一輛百年前的郵車。車門內沒有屍骨，只有一只仍繫著封蠟的皮囊。火光貼在鎖孔上，等你決定要不要替這封遲到的信找到收件人。',
    ],
    choices: [
      { id: 'witchfire-open', label: '切開皮囊，取出可用的東西', detail: '生命 -2；抵抗冰冷磷火，從荒野戰利品中取得一件物資。', next: 'marsh', effects: [{ kind: 'resource', resource: 'hp', amount: -2 }, { kind: 'loot', table: 'wilds' }] },
      { id: 'witchfire-mark', label: '抄下收件人的墓碑位置', detail: '辨認亡者的舊路；經驗 +2，讓磷火自行散去。', next: 'marsh', effects: [{ kind: 'xp', amount: 2 }] },
      { id: 'witchfire-ward', label: '以守夜護符遮住鎖孔', detail: '需要守夜護符；不消耗護符，安全取得一份荒野戰利品。', next: 'marsh', requires: [{ kind: 'item', value: 'ward' }], effects: [{ kind: 'loot', table: 'wilds' }] },
    ],
    provenance: { source: 'original', note: '帶路磷火、失事郵車與遲到的亡者書信為原創荒野事件。' },
  },
  {
    id: 'wild-grave-cart', act: '荒野異事・北方沼澤', title: '空棺材比滿棺材更重',
    paragraphs: [
      '一匹沒有騎手的灰馬拖著板車迎面而來。車上綁著一口空棺，輪子每陷進泥裡一次，棺材裡就有人敲一下；繩結已經磨得只剩幾根纖維。',
      '灰馬在你面前低下頭。牠的韁繩掛著一塊木牌：把空位送到北方，讓該躺進去的人知道自己仍會死。',
    ],
    choices: [
      { id: 'cart-rope', label: '重新綁牢棺材', detail: '花力氣修好繩結；生命 -2，取得一份藏在車底的荒野物資。', next: 'marsh', effects: [{ kind: 'resource', resource: 'hp', amount: -2 }, { kind: 'loot', table: 'wilds' }] },
      { id: 'cart-name', label: '刮掉木牌上的自己名字', detail: '拒絕預先寫好的死法；經驗 +2。', next: 'marsh', effects: [{ kind: 'xp', amount: 2 }] },
      { id: 'cart-guide', label: '替灰馬指出北方', detail: '跟著牠走過一段不會下陷的路；魔力 +2。', next: 'marsh', effects: [{ kind: 'resource', resource: 'mana', amount: 2 }] },
    ],
    provenance: { source: 'original', note: '運送空棺的灰馬與預寫死名為原創荒野事件。' },
  },
  {
    id: 'wild-moonwell', act: '荒野異事・北方沼澤', title: '井裡的月亮沒有跟著天亮',
    paragraphs: [
      '一座矮井立在枯樹中央，井繩乾燥，石緣卻結著薄冰。天色已亮，水底仍懸著一輪完整的月；當你俯身時，倒影比你慢了一個呼吸才抬頭。',
      '桶子沉下去，碰到的不是水，而是一層像玻璃的東西。井壁刻著旅人的短句：只拿走月亮願意忘記的東西。',
    ],
    choices: [
      { id: 'moonwell-draw', label: '打碎薄冰，拉起井桶', detail: '生命 -2；寒意割傷手指，取得一份荒野戰利品。', next: 'marsh', effects: [{ kind: 'resource', resource: 'hp', amount: -2 }, { kind: 'loot', table: 'wilds' }] },
      { id: 'moonwell-mana', label: '讓倒影先喝一口', detail: '倒影帶走疲憊；魔力 +4。', next: 'marsh', effects: [{ kind: 'resource', resource: 'mana', amount: 4 }] },
      { id: 'moonwell-pass', label: '在井緣留下一枚石子', detail: '不向井索取任何東西；經驗 +2。', next: 'marsh', effects: [{ kind: 'xp', amount: 2 }] },
    ],
    provenance: { source: 'original', note: '留住夜月的古井與延遲倒影為原創荒野事件。' },
  },
  {
    id: 'wild-white-stag', act: '荒野異事・北方沼澤', title: '白鹿背著一座小教堂',
    paragraphs: [
      '霧裡走出一頭白鹿，兩角之間托著一座巴掌大的石教堂。小窗透出燭光，門內有人影跪坐；你聽見極細的鐘聲，像從很遠的山谷傳來。',
      '白鹿在一株倒木前停下。樹洞裡塞滿旅行者留下的物品，每一件都綁著一小段願望。牠偏過頭，允許你取走一件，也像是在提醒你必須留下什麼。',
    ],
    choices: [
      { id: 'stag-trade', label: '留下一段旅途記憶', detail: '魔力 -2；換取一份荒野戰利品。', next: 'marsh', requires: [{ kind: 'resource', resource: 'mana', amount: 2 }], effects: [{ kind: 'resource', resource: 'mana', amount: -2 }, { kind: 'loot', table: 'wilds' }] },
      { id: 'stag-follow', label: '跟隨白鹿直到鐘聲停止', detail: '走上安全的獸徑；生命 +4。', next: 'marsh', effects: [{ kind: 'resource', resource: 'hp', amount: 4 }] },
      { id: 'stag-bow', label: '向角間的小教堂行禮', detail: '什麼也不拿；經驗 +2。', next: 'marsh', effects: [{ kind: 'xp', amount: 2 }] },
    ],
    provenance: { source: 'original', note: '角負微型教堂的白鹿與願望交換為原創荒野事件。' },
  },
  {
    id: 'marsh', act: '第一章・北方沼澤', title: '會留下犁溝的腳印',
    paragraphs: [
      '蘆葦倒向同一個方向。爪印之間拖著一條深溝，水在裡頭泛出鐵鏽般的顏色。那不是船隻通過的痕跡。',
      '你順著溝走到一座半沉的棚屋。門板上綁著布條，一隻手從縫裡伸出來，急急指向北面。鐘聲停了。',
    ],
    choices: [
      { id: 'rescue', label: '先打開棚屋', detail: '援救事件：付出物資或體力，換取同伴的幫助。', next: 'rescue' },
      { id: 'observe', label: '追蹤巨獸，觀察牠的步態', detail: '掌握弱點；龍鱷戰傷害 +2。', next: 'crocodile', effects: [{ kind: 'flag', value: 'weakness' }] },
    ],
    provenance: { source: 'sacnoth', note: '金屬心跳、尾痕與受威脅村民依原作；棚屋救援原創。' },
  },
  {
    id: 'rescue', act: '第一章・北方沼澤', title: '門後還有兩個人',
    paragraphs: [
      '棚屋裡是一名採藥人和她的弟弟。門梁被巨獸的尾巴砸斷，卡住出口；他們已經在裡頭蹲了一整夜。',
      '「牠用鼻子試探每一扇門，」採藥人說。「打背上沒用。讓牠抬頭，讓牠退。」她把一小包藥根推到門縫下。「你若願意幫忙，這就是我們能給的。」',
    ],
    choices: [
      { id: 'rope', label: '用繩結卸下門梁', detail: '遊俠專屬：救出兩人，獲得療傷藥與弱點情報。', next: 'crocodile', requires: [{ kind: 'class', value: 'ranger' }], effects: [{ kind: 'flag', value: 'rescued' }, { kind: 'flag', value: 'weakness' }, { kind: 'item', value: 'potion' }, { kind: 'xp', amount: 2 }] },
      { id: 'lift', label: '撬開門梁，扶他們出來', detail: '生命 -4；救出兩人，獲得療傷藥與弱點情報。', next: 'crocodile', effects: [{ kind: 'resource', resource: 'hp', amount: -4 }, { kind: 'flag', value: 'rescued' }, { kind: 'flag', value: 'weakness' }, { kind: 'item', value: 'potion' }, { kind: 'xp', amount: 2 }] },
      { id: 'promise', label: '留下水，先引開巨獸', detail: '繼續前進；尚未完成救援。', next: 'crocodile' },
    ],
    provenance: { source: 'original', note: '採藥人與她的弟弟為原創，救援會影響結尾。' },
  },
  {
    id: 'crocodile', act: '第一章・北方沼澤', title: '鐵脊之下',
    paragraphs: [
      '龍鱷伏在淺水裡，身體像一口被遺忘的熔爐。你抬起武器，牠也抬起頭。鼻端沾著鉛灰，眼睛則是兩點冷藍。',
      '你記得法師的囑咐：與這樣的東西交手，蠻力只會消耗自己。先辨認牠準備怎麼動，再決定這一回合要進攻還是守住。',
    ],
    variants: [{ flag: 'staff', text: '榛木杖抵住你的掌心。你已有迫使牠退卻的工具，攻擊能繞開厚甲。' }, { flag: 'weakness', text: '你已辨認吻端與轉身的破綻，本場每次攻擊額外造成 2 傷害。' }],
    choices: [{ id: 'fight', label: '迎戰鐵脊龍鱷', detail: '回合制戰鬥；戰勝後帶回異鋼。格擋可恢復魔力。', next: 'forge', encounter: 'crocodile' }],
    provenance: { source: 'sacnoth', note: '原作以持杖阻止進食三日使龍鱷餓死；此處壓縮成有弱點的回合戰，不宣稱忠實重演。' },
  },
  {
    id: 'forge', act: '第二章・有眼睛的劍', title: '爐火不肯吞下的東西',
    paragraphs: [
      '鐵匠把帶回的金屬推進爐心。雜鐵先軟，外殼逐漸滴落，唯有中央那條異鋼紋絲不動。天將亮時，他用鋼眼磨完最後一道劍鋒。',
      '另一隻眼睛嵌進劍柄。你握住它時，眼珠轉向門口；一個尚未敲門的村民正站在那裡。鐵匠笑了一次，隨即又疲憊地坐下。',
      '「它已經醒了。至於要讓它成為怎樣的劍，現在由你決定。」',
    ],
    choices: [
      { id: 'ember', label: '刻入餘燼符文', detail: '取得魔劍與餘燼符文；技能傷害額外 +3。恢復全部生命與魔力。', next: 'outfitter', requires: [{ kind: 'flag', value: 'rune' }], effects: [{ kind: 'item', value: 'sacnoth' }, { kind: 'item', value: 'ember' }, { kind: 'resource', resource: 'hp', amount: 99 }, { kind: 'resource', resource: 'mana', amount: 99 }] },
      { id: 'iron', label: '加裝鎮鐵護手', detail: '取得魔劍與鎮鐵符文；每次戰鬥受傷 -2。恢復全部生命與魔力。', next: 'outfitter', effects: [{ kind: 'item', value: 'sacnoth' }, { kind: 'item', value: 'iron' }, { kind: 'resource', resource: 'hp', amount: 99 }, { kind: 'resource', resource: 'mana', amount: 99 }] },
    ],
    provenance: { source: 'sacnoth', note: '熔去外殼、磨刃與劍眼取自原作；符文配置原創。' },
  },
  {
    id: 'outfitter', act: '第二章・有眼睛的劍', title: '最後一次有人替你開門',
    paragraphs: [
      '補給鋪只剩一排藥瓶與幾塊硬餅。店主把價牌轉向你，沒有多說話。出村的路上已經有人開始搬運路障，準備抵擋今晚的東西。',
      '你可以買下一份行裝，也可以保留錢。遠處的白色尖塔從樹頂升起，這一次，連清醒的人都看得見。',
    ],
    variants: [{ flag: 'merchant', text: '橋邊的商人送來兩瓶療傷藥。「車修好了，」他說。「換你回來。」' }],
    choices: [
      { id: 'buy', label: '購買遠征行裝', detail: '金幣 -3；療傷藥 +2、補給 +1。', next: 'approach', requires: [{ kind: 'resource', resource: 'gold', amount: 3 }], effects: [{ kind: 'resource', resource: 'gold', amount: -3 }, { kind: 'item', value: 'potion' }, { kind: 'item', value: 'potion' }, { kind: 'resource', resource: 'supplies', amount: 1 }] },
      { id: 'depart', label: '帶現有行裝出發', detail: '保留金幣，前往堡壘。', next: 'approach' },
    ],
    provenance: { source: 'original', note: '村莊整備和商人回報，支援角色配置。' },
  },
  {
    id: 'approach', act: '第二章・有眼睛的劍', title: '堡壘每天換一條路',
    paragraphs: [
      '白色尖塔明明就在正北，通往它的道路卻像活物般挪動。昨夜的溪谷長出荊棘，石堤則從沼水裡浮起，兩旁立著面朝城堡的斷首騎士像。',
      '薩克諾斯的劍眼先看向林間，又轉向石堤，最後停在你背包側袋。它並不替你決定，只把每一條路將索取的代價一一指出。',
      '遠處傳來獵犬的長嗥。城牆上的旗幟沒有風也在飄動，像有人已經知道你站在這裡。',
    ],
    variants: [{ flag: 'ferryman', text: '你記得擺渡人的暗號：夢造的路總在第三個路標後說謊。石堤第二座雕像的影子因此顯得格外可疑。' }],
    choices: [
      { id: 'approach_thorns', label: '穿過低語荊棘林', detail: '路較短，但林中有被夢魘馴服的獵狼。', next: 'thornwood' },
      { id: 'approach_causeway', label: '踏上斷首騎士石堤', detail: '道路穩固；城堡的舊守衛仍在巡行。', next: 'causeway' },
      { id: 'approach_map', label: '依測繪圖找出乾涸暗渠', detail: '需要村莊的測繪桌；避開外圍威脅，直接抵達城門。', next: 'gate', requires: [{ kind: 'upgrade', value: 'map' }], effects: [{ kind: 'xp', amount: 2 }] },
    ],
    provenance: { source: 'original', note: '會移動的道路、荊棘林、石堤與測繪捷徑為新寫，將永久養成帶回敘事分支。' },
  },
  {
    id: 'thornwood', act: '第二章・有眼睛的劍', title: '狼群學會了說晚安',
    paragraphs: [
      '荊棘上的每一片葉子都在低聲說話。它們借用村人的聲音勸你躺下：井水已經打好、門閂已經扣緊、明天再走也不遲。只有劍眼始終望著你身後。',
      '第一頭狼踩著你的舊腳印出現，灰毛間纏著細小銀線。第二頭從樹根下爬出，嘴裡吐出一句屬於孩子的「晚安」。牠們的影子加起來，比狼本身多一頭。',
      '林外就是堡壘前的裸岩。只要讓狼群失去夢魘的節拍，這片林子便攔不住你。',
    ],
    variants: [{ flag: 'pilgrim', text: '朝聖者教你的短禱浮上心頭。狼嘴裡偷來的聲音頓時顯得空洞，不再像真正的呼喚。' }],
    choices: [
      { id: 'thorn_fight', label: '以劍眼盯住多出的影子', detail: '迎戰夢獵狼；勝利後闖出荊棘林。', next: 'gate', encounter: 'wolf' },
      { id: 'thorn_cut', label: '用鎮定的步伐劈出通道', detail: '戰士專屬，生命 -2；不追逐狼群，經驗 +2。', next: 'gate', requires: [{ kind: 'class', value: 'warrior' }], effects: [{ kind: 'resource', resource: 'hp', amount: -2 }, { kind: 'xp', amount: 2 }] },
      { id: 'thorn_bell', label: '搖響無舌銅鈴', detail: '需要銅鈴；打亂狼群聽從的夢中命令，保留銅鈴。', next: 'gate', requires: [{ kind: 'item', value: 'bell' }], effects: [{ kind: 'xp', amount: 2 }] },
    ],
    provenance: { source: 'original', note: '低語荊棘、偷取人聲的狼群與多餘影子為新寫；劍眼警示沿用原作魔劍意象。' },
  },
  {
    id: 'causeway', act: '第二章・有眼睛的劍', title: '石堤上的第十三名騎士',
    paragraphs: [
      '十二座斷首石像分列堤道兩旁。你走過最後一座時，水面浮出第十三個倒影：一名披白甲的騎士正跟在身後，頭盔裡懸著一點彗星般的冷光。',
      '他越過你，把長劍插進石縫。「入城者，報上效忠之人的名字。」聲音從空鎧甲深處傳來。鎧甲上的軍印，與墓室石椅上的紋章一模一樣。',
      '沼水開始漫過堤面。這條路不容人長久思考；騎士也不像仍記得自己生前的答案。',
    ],
    variants: [{ flag: 'sigil', text: '你持有舊軍印。鎧甲胸前的裂紋與它恰好吻合，像一道多年未能合上的傷口。' }, { flag: 'ferryman', text: '第三座路標沒有倒影。擺渡人說得對：石堤正在對你說謊。' }],
    choices: [
      { id: 'causeway_fight', label: '不報主名，迎戰空鎧騎士', detail: '迎戰夢誓騎士；勝利後抵達鐵門。', next: 'gate', encounter: 'knight' },
      { id: 'causeway_sigil', label: '將舊軍印嵌回鎧甲', detail: '需要通行印記；解除騎士的舊誓，經驗 +3。', next: 'gate', requires: [{ kind: 'flag', value: 'sigil' }], effects: [{ kind: 'xp', amount: 3 }] },
      { id: 'causeway_leap', label: '踏著無倒影的石樁繞行', detail: '遊俠專屬；識破假堤，保存體力並獲得 2 經驗。', next: 'gate', requires: [{ kind: 'class', value: 'ranger' }], effects: [{ kind: 'xp', amount: 2 }] },
    ],
    provenance: { source: 'original', note: '空鎧騎士、效忠謎問與會說謊的石堤為新寫；以舊軍印連接墓室支線。' },
  },
  {
    id: 'gate', act: '第三章・夢築的城', title: '會微笑的石像',
    paragraphs: [
      '沼澤的水在腳邊分開。劍柄輕輕牽動你的手，指向一塊看似會沉下去、實際卻很穩的石頭。你照著它走，直到鐵門高高立在面前。',
      '門楣上的怪獸石像逐一露齒。你拔出薩克諾斯，第一聲劍鳴穿過門後的長廊；更深的地方，有龍醒了。',
    ],
    choices: [{ id: 'open', label: '以魔劍切開鐵門', detail: '進入堡壘。劍的力量使普通護衛退避。', next: 'webhall', requires: [{ kind: 'item', value: 'sacnoth' }] }],
    provenance: { source: 'sacnoth', note: '劍眼領路、石像與鐵門依原作；守衛退避被合併為敘述。' },
  },
  {
    id: 'webhall', act: '第三章・夢築的城', title: '織了一整年的繩',
    paragraphs: [
      '銀黑色的繩從天花板垂到地面。你才走進一步，肩上便像披了一件濕重的斗篷。繩後有個聲音問：「誰在拆我的工？」',
      '火把照見一隻比羊還大的蜘蛛。牠正用前足擰一條新索，八隻眼睛裡沒有一隻看向出口。你猜那條新索不是替橋準備的。',
    ],
    choices: [
      { id: 'fight', label: '拔劍，斬開蛛網', detail: '迎戰巨蛛；勝利可獲得經驗與金幣。', next: 'banquet', encounter: 'spider' },
      { id: 'burn', label: '用火焰打開通道', detail: '法師專屬，魔力 -3；避開戰鬥，經驗 +2。', next: 'gallery', requires: [{ kind: 'class', value: 'mage' }, { kind: 'resource', resource: 'mana', amount: 3 }], effects: [{ kind: 'resource', resource: 'mana', amount: -3 }, { kind: 'xp', amount: 2 }] },
      { id: 'sneak', label: '踩著樑影繞過巢穴', detail: '遊俠專屬；避開戰鬥，經驗 +2。', next: 'gallery', requires: [{ kind: 'class', value: 'ranger' }], effects: [{ kind: 'xp', amount: 2 }] },
      { id: 'gallery', label: '沿牆上的狩獵壁畫前進', detail: '不與巨蛛爭奪巢穴，進入側廊調查歌聲。', next: 'gallery' },
    ],
    provenance: { source: 'sacnoth', note: '蛛網與巨蛛取自原作；原作巨蛛退走，交戰及職業替代路線為新增。' },
  },
  {
    id: 'gallery', act: '第三章・夢築的城', title: '壁畫裡的人仍在唱歌',
    paragraphs: [
      '側廊兩壁畫滿狩獵隊伍。畫中的國王騎著白馬，獵犬永遠停在躍起的瞬間；只有隊伍末端的六名歌者會隨你移動嘴唇。你越靠近，走廊前方的門就退得越遠。',
      '歌者沒有聲音，旋律卻直接浮在你的記憶裡。那是一首送葬曲，每一段都少了最後一個音，彷彿他們在等廊外某件樂器替他們唱完。',
      '薩克諾斯的劍眼沒有看那些歌者，而是盯著壁畫上一扇被顏料塗死的小門。門後有人用指節，依照同一支曲子敲牆。',
    ],
    choices: [
      { id: 'gallery_learn', label: '跟著敲擊記住缺少的音', detail: '辨認囚徒合唱的節拍；取得合唱線索與 2 經驗。', next: 'banquet', effects: [{ kind: 'flag', value: 'choir' }, { kind: 'xp', amount: 2 }] },
      { id: 'gallery_bell', label: '以無舌銅鈴補上尾音', detail: '需要銅鈴；喚醒壁畫中的歌者，取得合唱線索。', next: 'banquet', requires: [{ kind: 'item', value: 'bell' }], effects: [{ kind: 'flag', value: 'choir' }, { kind: 'xp', amount: 3 }] },
      { id: 'gallery_door', label: '依劍眼所示切開畫中小門', detail: '生命 -2；抵抗湧出的夢霧，走入宴會廳。', next: 'banquet', effects: [{ kind: 'resource', resource: 'hp', amount: -2 }] },
    ],
    provenance: { source: 'original', note: '會唱歌的壁畫、移動門與牆後敲擊者為新寫；用以鋪陳原作堡壘中的魔法樂師。' },
  },
  {
    id: 'banquet', act: '第三章・夢築的城', title: '沒有影子的宴席',
    paragraphs: [
      '下一個房間亮得刺眼。銀盤、燭臺、王冠，所有東西都等著被讚美。長桌兩側的人停下酒杯，卻沒有看你。',
      '一位戴冠的女人把空椅子推出桌邊。「坐下。你要找的人從不衰老，你何必趕路？」她身後的牆上，燭火有影，酒杯有影，唯獨她沒有。',
    ],
    choices: [
      { id: 'truth', label: '用劍眼照出宴席的真貌', detail: '辨識幻象，經驗 +2；結尾保留真相記錄。', next: 'cells', effects: [{ kind: 'flag', value: 'truth' }, { kind: 'xp', amount: 2 }] },
      { id: 'gold', label: '拿走桌邊的錢袋', detail: '金幣 +4，但幻象灼傷手掌，生命 -3。', next: 'cells', effects: [{ kind: 'resource', resource: 'gold', amount: 4 }, { kind: 'resource', resource: 'hp', amount: -3 }] },
      { id: 'pass', label: '謝絕邀請，沿樂聲前進', detail: '不消耗資源。', next: 'cells' },
    ],
    provenance: { source: 'sacnoth', note: '宴席與夢中女子合併改寫；無影線索、金袋與選項為原創。' },
  },
  {
    id: 'cells', act: '第三章・夢築的城', title: '囚室裡只關著一個醒著的人',
    paragraphs: [
      '宴會廳後的階梯一路向下，酒香逐漸變成潮濕鐵鏽味。每間囚室都鋪著柔軟床褥，睡在裡面的人面帶微笑；他們腕上沒有鎖鏈，夢卻從耳鼻間牽成銀線，沒入牆中。',
      '最深處的囚徒割破了自己的掌心，用疼痛保持清醒。他自稱王城的鐘匠，三年前被帶來替堡壘鑄鐘。每口鐘都混入一名囚徒的夢；只要合唱仍然完整，鐘聲就能替巫師修補城牆。',
      '他的牢門沒有鑰匙孔。門邊只放著一碗永遠冒著熱氣的湯，香味逼得人想起所有錯過的晚餐。',
    ],
    variants: [{ flag: 'pilgrim', text: '鐘匠聽見朝聖者的名字後抬起頭。她曾是最後一批未被捕獲的送鐘人；你帶來的消息讓他相信外界仍有人醒著。' }, { flag: 'truth', text: '劍眼映出鐵門的真貌：牢門只是畫在空氣裡的一層陰影。' }],
    choices: [
      { id: 'cells_feed', label: '把一份補給遞給鐘匠', detail: '補給 -1；他恢復力氣，與你一同離開囚層。', next: 'refuge', requires: [{ kind: 'resource', resource: 'supplies', amount: 1 }], effects: [{ kind: 'resource', resource: 'supplies', amount: -1 }, { kind: 'flag', value: 'prisoner' }, { kind: 'xp', amount: 2 }] },
      { id: 'cells_break', label: '撬開假鎖，背他穿過階梯', detail: '戰士專屬，生命 -3；救出鐘匠，經驗 +2。', next: 'refuge', requires: [{ kind: 'class', value: 'warrior' }], effects: [{ kind: 'resource', resource: 'hp', amount: -3 }, { kind: 'flag', value: 'prisoner' }, { kind: 'xp', amount: 2 }] },
      { id: 'cells_truth', label: '循劍眼所見穿過幻影牢門', detail: '需要看破宴席真相；救出鐘匠，不消耗物資。', next: 'refuge', requires: [{ kind: 'flag', value: 'truth' }], effects: [{ kind: 'flag', value: 'prisoner' }, { kind: 'xp', amount: 3 }] },
      { id: 'cells_leave', label: '記下位置，獨自繼續', detail: '不碰那碗湯，也不冒險驚動囚層。', next: 'refuge' },
    ],
    provenance: { source: 'original', note: '夢囚、清醒的鐘匠、以囚徒之夢鑄鐘皆為新寫，補足堡壘運作與喪鐘來源。' },
  },
  {
    id: 'refuge', act: '第三章・夢築的城', title: '石門背後的一小片安靜',
    paragraphs: [
      '你找到一個沒有樂聲的儲藏間。關上門後，劍眼才第一次慢慢合起來。牆角有舊毯子，足夠讓一個人坐下。',
      '下一段走廊沒有欄杆。你聽見風從下面吹上來，那聲音很遠，遠得不像一座城裡會有的距離。',
    ],
    choices: [
      { id: 'rest', label: '吃一份補給，處理傷口', detail: '補給 -1；生命 +16、魔力 +8，途中遭遇一件夢城異事。', next: 'abyss', eventPool: 'fortress', requires: [{ kind: 'resource', resource: 'supplies', amount: 1 }], effects: [{ kind: 'resource', resource: 'supplies', amount: -1 }, { kind: 'resource', resource: 'hp', amount: 16 }, { kind: 'resource', resource: 'mana', amount: 8 }] },
      { id: 'focus', label: '靠牆調息，隨即動身', detail: '魔力 +3，不消耗補給；途中遭遇一件夢城異事。', next: 'abyss', eventPool: 'fortress', effects: [{ kind: 'resource', resource: 'mana', amount: 3 }] },
    ],
    provenance: { source: 'original', note: '一次性休整節點，避免反覆免費恢復。' },
  },
  {
    id: 'fortress-armory', act: '夢城異事・白色堡壘', title: '軍械庫替每把劍安排主人',
    paragraphs: [
      '石門後整齊掛著數百把武器，每一把的刃口都刻著名字。當你踏進去，最靠近門的一排同時轉動，讓刀尖朝向你；薩克諾斯的劍眼則盯住一只沒有銘牌的舊盾。',
      '盾後藏著一個狹窄壁龕，裡面堆著從戰敗者身上拆下的護符與符文。軍械庫開始低聲念你的名字，試圖替你挑選一種死法。',
    ],
    choices: [
      { id: 'armory-take', label: '在名字念完以前伸手取物', detail: '生命 -3；避開自行揮舞的兵刃，取得一件夢城遺物。', next: 'abyss', effects: [{ kind: 'resource', resource: 'hp', amount: -3 }, { kind: 'loot', table: 'fortress' }] },
      { id: 'armory-break', label: '用薩克諾斯劃掉自己的名字', detail: '讓整排武器失去目標；經驗 +3。', next: 'abyss', effects: [{ kind: 'xp', amount: 3 }] },
      { id: 'armory-listen', label: '記住武器報出的敗者姓名', detail: '不取遺物；把名冊帶回成為見聞，經驗 +2。', next: 'abyss', effects: [{ kind: 'xp', amount: 2 }] },
    ],
    provenance: { source: 'original', note: '會為兵刃分配主人與死法的軍械庫為原創夢城事件。' },
  },
  {
    id: 'fortress-mirror', act: '夢城異事・白色堡壘', title: '鏡中人已經從堡壘回來',
    paragraphs: [
      '轉角立著一面落地銀鏡。鏡中的你穿著破裂鎧甲，背後卻是村莊的井；那個人先你一步抬手，掌心放著一件你還沒見過的遺物。',
      '「別再往前，」倒影說。「我替你贏過一次，所以知道代價。」它的嘴在說話，地板上的影子卻正無聲地寫：鏡子從沒離開過這座城。',
    ],
    choices: [
      { id: 'mirror-reach', label: '把手伸進冰冷鏡面', detail: '生命 -3；拒絕倒影的勸告，取得一件夢城遺物。', next: 'abyss', effects: [{ kind: 'resource', resource: 'hp', amount: -3 }, { kind: 'loot', table: 'fortress' }] },
      { id: 'mirror-question', label: '問倒影哪一道傷最痛', detail: '從它的謊言辨認守城者的招式；經驗 +3。', next: 'abyss', effects: [{ kind: 'xp', amount: 3 }] },
      { id: 'mirror-cover', label: '用舊毯蓋住鏡面', detail: '拒絕觀看預演的歸途；魔力 +3。', next: 'abyss', effects: [{ kind: 'resource', resource: 'mana', amount: 3 }] },
    ],
    provenance: { source: 'original', note: '自稱已歸鄉的未來倒影與影子示警為原創夢城事件。' },
  },
  {
    id: 'fortress-scriptorium', act: '夢城異事・白色堡壘', title: '抄寫室裡只剩羽毛筆醒著',
    paragraphs: [
      '長桌兩旁坐著披灰袍的抄寫員，頭全伏在空白紙上。數十枝羽毛筆仍自行書寫，把同一句話抄滿羊皮紙：來者將忘記自己帶來的火。',
      '墨水瓶底沉著幾塊微光碎片。每當筆尖寫到「火」字，碎片便暗一次；只要改掉一個字，整個房間或許就會記起另一種結局。',
    ],
    choices: [
      { id: 'script-change', label: '把「忘記」改成「帶走」', detail: '魔力 -2；改寫房間的規則，取得一件夢城遺物。', next: 'abyss', requires: [{ kind: 'resource', resource: 'mana', amount: 2 }], effects: [{ kind: 'resource', resource: 'mana', amount: -2 }, { kind: 'loot', table: 'fortress' }] },
      { id: 'script-burn', label: '點燃寫滿預言的羊皮紙', detail: '讓抄寫員從同一句夢話中驚醒；經驗 +3。', next: 'abyss', effects: [{ kind: 'xp', amount: 3 }] },
      { id: 'script-copy', label: '抄下城堡用來改寫記憶的句法', detail: '不驚動羽毛筆；經驗 +2。', next: 'abyss', effects: [{ kind: 'xp', amount: 2 }] },
    ],
    provenance: { source: 'original', note: '自動書寫的抄寫室與可改動的房間規則為原創夢城事件。' },
  },
  {
    id: 'fortress-sleepwalker', act: '夢城異事・白色堡壘', title: '夢遊騎士捧著自己的頭盔',
    paragraphs: [
      '一名披甲騎士從暗廊走來，雙眼緊閉，兩手捧著自己的頭盔。頭盔裡盛著黑水，水面倒映的不是天花板，而是一場仍未結束的圍城。',
      '騎士在你面前單膝跪下，把頭盔高舉。黑水裡漂著一件微光遺物；遠處號角一響，他握劍的手便抽動一下，像隨時會在睡夢中恢復守衛職責。',
    ],
    choices: [
      { id: 'sleepwalker-take', label: '從黑水中取出遺物', detail: '生命 -3；寒水喚醒騎士的劍，仍取得一件夢城遺物。', next: 'abyss', effects: [{ kind: 'resource', resource: 'hp', amount: -3 }, { kind: 'loot', table: 'fortress' }] },
      { id: 'sleepwalker-oath', label: '說出終止徵召的承諾', detail: '若你帶著舊軍印，話語更顯真實；經驗 +3。', next: 'abyss', effects: [{ kind: 'xp', amount: 3 }] },
      { id: 'sleepwalker-pass', label: '扶他靠牆坐下', detail: '不驚醒這名守衛；生命 +4。', next: 'abyss', effects: [{ kind: 'resource', resource: 'hp', amount: 4 }] },
    ],
    provenance: { source: 'original', note: '以頭盔承載圍城夢境的夢遊騎士為原創夢城事件。' },
  },
  {
    id: 'abyss', act: '第三章・夢築的城', title: '星星在腳下',
    paragraphs: [
      '石橋只有一步寬。橋下沒有水，只有一片不屬於這個季節的星空；有東西飛過時，星光就一顆一顆消失，又重新亮起。',
      '一條披甲的龍伏在對岸，尾巴垂進暗處。牠的眼睛半閉著，劍柄上的眼睛卻完全睜開。',
    ],
    choices: [
      { id: 'fight', label: '穩住腳步，迎戰守龍', detail: '擊敗守龍獲得經驗與金幣；注意牠的鉤尾穿刺。', next: 'bells', encounter: 'guardian' },
      { id: 'ward', label: '燃盡守夜護符', detail: '消耗護符，藉銀光繞過守龍；從側門進入禁書庫。', next: 'archive', requires: [{ kind: 'item', value: 'ward' }], effects: [{ kind: 'consume', value: 'ward' }, { kind: 'xp', amount: 2 }] },
      { id: 'moonbridge', label: '讓月石映出橋的另一面', detail: '需要月石；沿倒映在星空裡的階梯進入禁書庫。', next: 'archive', requires: [{ kind: 'item', value: 'moonstone' }], effects: [{ kind: 'xp', amount: 2 }] },
    ],
    provenance: { source: 'sacnoth', note: '深淵星空、橋與尾擊守龍由原作多場景合併；護符路線原創。' },
  },
  {
    id: 'archive', act: '第三章・夢築的城', title: '禁書庫把讀者寫進書裡',
    paragraphs: [
      '側門後沒有書架，只有一冊冊攤開的巨書懸在空中。書頁自行翻動，記錄城堡昨夜夢見的房間：宴會廳、深淵橋，以及一座還未建成、準備安放你名字的墓室。',
      '其中一本寫著喪鐘的鑄法。墨跡仍濕，字句卻故意顛倒：鐘不是為死者而鳴，而是讓活人忘記自己尚未死去。書頁邊緣有一列鐘匠留下的針孔，恰好能拼成樂曲的缺音。',
      '當你讀到自己的名字，羽毛筆從桌上飛起。它停在最後一行，等你替故事補上一個服從巫師的結局。',
    ],
    variants: [{ flag: 'prisoner', text: '獲救鐘匠認出針孔暗記，替你指出哪幾口鐘連著巫師的護甲。那些知識足以把鐘聲變成破綻。' }, { flag: 'choir', text: '你已記住壁畫歌者缺失的尾音。書頁上的針孔不是密碼，而是一份等待完成的樂譜。' }],
    choices: [
      { id: 'archive_moonstone', label: '把月石壓在自己的名字上', detail: '消耗月石；凍結預寫的結局，掌握反咒節奏並獲得 3 經驗。', next: 'bells', requires: [{ kind: 'item', value: 'moonstone' }], effects: [{ kind: 'consume', value: 'moonstone' }, { kind: 'flag', value: 'counterspell' }, { kind: 'xp', amount: 3 }] },
      { id: 'archive_prisoner', label: '依鐘匠暗記撕下鑄鐘頁', detail: '需要救出鐘匠；破壞喪鐘索引，掌握反咒節奏。', next: 'bells', requires: [{ kind: 'flag', value: 'prisoner' }], effects: [{ kind: 'flag', value: 'counterspell' }, { kind: 'xp', amount: 2 }] },
      { id: 'archive_refuse', label: '劃掉名字，拒絕替它寫完', detail: '生命 -4；墨水灼傷手指，但書庫失去預知你的能力。', next: 'bells', effects: [{ kind: 'resource', resource: 'hp', amount: -4 }, { kind: 'xp', amount: 2 }] },
    ],
    provenance: { source: 'original', note: '自寫巨書、預記玩家墓室、鐘匠針孔密碼與羽毛筆為新寫；延伸由夢生成堡壘的核心概念。' },
  },
  {
    id: 'bells', act: '第四章・最後的夢', title: '喪鐘之間的空白',
    paragraphs: [
      '每走過一口鐘，它就為你響一次。你加快腳步，鐘也移得更遠；你停下，所有鐘同時發出不耐煩的聲音。',
      '在鐘聲之間，你聽見琴弦反覆奏著同一句。第四拍之後總有一個空白。那是樂師換氣，還是咒語必須容許的裂縫？',
    ],
    variants: [{ flag: 'choir', text: '壁畫歌者的無聲旋律與琴弦重疊。你現在知道，那個空白不是遺漏，而是在等待有人回答。' }, { flag: 'prisoner', text: '鐘匠指過的第三口鐘藏著一道裂縫。每當它響起，整座城的白牆都會短暫失去光澤。' }],
    choices: [
      { id: 'listen', label: '記住樂聲的停頓', detail: '掌握反咒節奏；最終戰魔法傷害降低 3。', next: 'threshold', effects: [{ kind: 'flag', value: 'counterspell' }] },
      { id: 'recover', label: '閉目行走，保存精神', detail: '魔力 +6，準備正面突破。', next: 'threshold', effects: [{ kind: 'resource', resource: 'mana', amount: 6 }] },
      { id: 'answer_choir', label: '唱出壁畫中缺少的尾音', detail: '需要合唱線索；讓喪鐘彼此抵銷，掌握反咒節奏並獲得 2 經驗。', next: 'threshold', requires: [{ kind: 'flag', value: 'choir' }], effects: [{ kind: 'flag', value: 'counterspell' }, { kind: 'xp', amount: 2 }] },
      { id: 'ring_bell', label: '讓無舌銅鈴替你回答', detail: '消耗銅鈴；打斷堡壘的節拍，掌握反咒節奏並恢復 3 魔力。', next: 'threshold', requires: [{ kind: 'item', value: 'bell' }], effects: [{ kind: 'consume', value: 'bell' }, { kind: 'flag', value: 'counterspell' }, { kind: 'resource', resource: 'mana', amount: 3 }] },
    ],
    provenance: { source: 'sacnoth', note: '移動的喪鐘與樂音依原作；反咒解法為原創。' },
  },
  {
    id: 'threshold', act: '第四章・最後的夢', title: '黑門之前',
    paragraphs: [
      '黑色小門沒有鎖。門縫裡透出冷白的光，你知道跨過去以後，應該不會再有補給鋪，也不會再有人替你指出退路。',
      '你把背包放下，重新繫緊每一條帶子。一路帶來的東西，如今都有了重量。',
    ],
    choices: [
      { id: 'rest', label: '用最後一份補給整備', detail: '補給 -1；生命 +14、魔力 +6。', next: 'throne', requires: [{ kind: 'resource', resource: 'supplies', amount: 1 }], effects: [{ kind: 'resource', resource: 'supplies', amount: -1 }, { kind: 'resource', resource: 'hp', amount: 14 }, { kind: 'resource', resource: 'mana', amount: 6 }] },
      { id: 'enter', label: '推開黑門', detail: '保留物資，前往最終對決。', next: 'throne' },
    ],
    provenance: { source: 'original', note: '終戰前整備，借用原作黑門意象。' },
  },
  {
    id: 'throne', act: '第四章・最後的夢', title: '巫師把夢戴在身上',
    paragraphs: [
      '加茲納克坐在月光裡。露臺、尖塔和無盡階梯正從他的夢中慢慢生長，向深淵流去。樂師們沒有抬頭，琴弦卻同時繃緊。',
      '他睜開眼，拔出一把寒光刺目的劍。鎧甲覆著全身，只有手腕、脖頸和臉留在外面。你的劍眼沒有看他的臉。',
      '「你帶著哪一個人的勇氣來？」他問。你沒有回答。你把自己的腳，往前移了一步。',
    ],
    variants: [{ flag: 'counterspell', text: '你記得第四拍的空白。樂師咒音造成的傷害降低 3。' }],
    choices: [{ id: 'fight', label: '迎戰夢魘巫師', detail: '觀察敵方意圖；抓住換位時護甲失效的回合。', next: 'dawn', encounter: 'gaznak' }],
    provenance: { source: 'sacnoth', note: '夢化建築、樂師、護甲與手腕破綻依原作；對話與回合化規則新寫。' },
  },
  {
    id: 'dawn', act: '終章・歸途', title: '村裡終於有人睡著', ending: 'victory',
    paragraphs: [
      '巫師倒下時，堡壘沒有發出坍塌的聲音。石階鬆開成霧，尖塔像燭煙一樣散掉；最後留在你腳邊的，只是沼澤和一把沉重的劍。',
      '你回到阿拉修里昂，井邊的孩子已經睡著。法師接過你記錄的路線，沒有急著翻。他替你拉出一張椅子，把窗板打開。',
      '這次遠征結束了。你帶回的見聞留在村中，能換成訓練、藏書與更好的出發行裝。下一次穿過森林時，你會知道自己為什麼選那條路。',
    ],
    variants: [
      { flag: 'rescued', text: '採藥人和弟弟在門前等你。桌上放著新烤的麵包，還有一個替你留好的杯子。' },
      { flag: 'truth', text: '你把宴席的真相寫進異聞簿：有些邀請讓人忘記自己原本要去的地方。' },
      { flag: 'pilgrim', text: '那名赤腳朝聖者替每個歸來者叫出名字。河面從此只映照活人的臉，不再把任何人帶往下游。' },
      { flag: 'ferryman', text: '擺渡人的窄船停在井旁，船底沒有沾一滴水。他把白木杖靠在門邊，說這趟渡資已經有人付清。' },
      { flag: 'sigil', text: '舊軍印被掛進法師塔。午夜時，北方墓室的亡者卸下鎧甲，第一次沒有等候任何君王的命令。' },
      { flag: 'prisoner', text: '獲救的鐘匠拆下塔頂那口失眠之鐘。他要把金屬重鑄成一座小鐘，只在真正的清晨響起。' },
      { flag: 'choir', text: '孩子們很快學會那首被補完的歌。這一次，最後一個音落下之後，牆壁沒有移動，影子也都留在原處。' },
    ],
    choices: [], provenance: { source: 'sacnoth', note: '堡壘消失與村民安睡依原作；歸來互動和永久養成新寫。' },
  },
  {
    id: 'retreat', act: '遠征結束', title: '帶著路線回家', ending: 'retreat',
    paragraphs: ['你在還能選擇的時候轉身。森林把遠處的樂聲一層一層擋住，直到只剩下自己的呼吸。', '法師沒有問你為什麼回來。他把地圖攤開，讓你指出走過的地方。這一趟的裝備會卸下，已帶回的見聞與村莊解鎖會留下。'],
    choices: [], provenance: { source: 'original', note: '主動撤退結局；不宣稱原作主角曾多次遠征。' },
  },
  {
    id: 'defeat', act: '遠征結束', title: '醒在最後一盞燈下', ending: 'defeat',
    paragraphs: ['最後記得的是劍眼轉向了黑暗。再睜眼時，你躺在法師塔下，手邊只有一張畫到一半的地圖。', '這趟遠征已經失敗。有人把你拖回了林緣，卻沒能帶回你的行裝。你記住的路與見聞還在，可以先完成村莊養成，再重新出發。'],
    choices: [], provenance: { source: 'original', note: '失敗恢復與永久進度是 roguelite 改編設定。' },
  },
];

export const NODES: Record<string, StoryNode> = Object.fromEntries(STORY.map(node => [node.id, node]));

export const EVENT_POOLS: Record<EventPoolId, string[]> = {
  wilds: ['wild-witchfire', 'wild-grave-cart', 'wild-moonwell', 'wild-white-stag'],
  fortress: ['fortress-armory', 'fortress-mirror', 'fortress-scriptorium', 'fortress-sleepwalker'],
};
