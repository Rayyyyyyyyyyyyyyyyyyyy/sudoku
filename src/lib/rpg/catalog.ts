import type { ClassId, Enemy, EnemyId, Flag, Hero, ItemId, OmenId, UpgradeId } from './types.ts';

export const CONTENT_VERSION = 'nightmare-fortress-1';
export const CLASS_IDS: ClassId[] = ['warrior', 'mage', 'ranger'];
export const FLAG_IDS: Flag[] = ['rescued', 'weakness', 'staff', 'merchant', 'rune', 'truth', 'counterspell', 'pilgrim', 'ferryman', 'sigil', 'prisoner', 'choir'];
export const DISCOVERY_IDS: string[] = ['forge', 'gate', 'bells', 'crypt', 'archive'];
export const CLASSES: Record<ClassId, { name: string; description: string; skill: string; skillDescription: string; manaCost: number; stats: Pick<Hero, 'maxHp' | 'maxMana' | 'attack' | 'armor'> }> = {
  warrior: { name: '戰士', description: '以護甲與耐力迎戰，重擊能突破堅硬外殼。', skill: '破甲重擊', skillDescription: '造成高傷害並無視護甲。', manaCost: 2, stats: { maxHp: 38, maxMana: 8, attack: 7, armor: 3 } },
  mage: { name: '法師', description: '以魔力焚除障礙，奧術護盾抵擋反擊。', skill: '餘燼之矛', skillDescription: '造成高傷害、無視護甲，並減輕本回合反擊。', manaCost: 3, stats: { maxHp: 29, maxMana: 16, attack: 4, armor: 1 } },
  ranger: { name: '遊俠', description: '善於辨認路徑，瞄準弱點後迅速脫離攻擊。', skill: '穿隙射擊', skillDescription: '造成高傷害並無視護甲，減輕本回合反擊。', manaCost: 2, stats: { maxHp: 33, maxMana: 11, attack: 6, armor: 2 } },
};
export const ITEMS: Record<ItemId, { name: string; description: string }> = {
  potion: { name: '療傷藥', description: '戰鬥中恢復 16 生命，使用後敵人仍會行動。' },
  ward: { name: '守夜護符', description: '可在深淵橋消耗，換取安全通路。' },
  sacnoth: { name: '薩克諾斯', description: '普攻與技能傷害 +3；劍眼能看見身後的威脅。' },
  ember: { name: '餘燼符文', description: '職業技能傷害額外 +3。' },
  iron: { name: '鎮鐵符文', description: '每次受到的戰鬥傷害額外減少 2。' },
  moonstone: { name: '月長石', description: '職業技能的魔力消耗 -1，最低仍為 1。' },
  bell: { name: '送魂鈴', description: '面對怨魂與加茲納克時，每次受到的傷害額外減少 2。' },
};
export const UPGRADES: Record<UpgradeId, { name: string; cost: number; description: string }> = {
  vigor: { name: '守夜人的訓練', cost: 2, description: '以後出發時，生命上限 +6。' },
  focus: { name: '法師的藏書', cost: 2, description: '以後出發時，魔力上限 +4。' },
  supplies: { name: '旅人的補給架', cost: 1, description: '以後出發時，多帶 1 份補給與 1 瓶療傷藥。' },
  steel: { name: '百鍛刃口', cost: 2, description: '以後出發時，攻擊 +1。' },
  alchemy: { name: '黑雨煉金術', cost: 2, description: '療傷藥的恢復量額外 +4。' },
  map: { name: '失落路圖', cost: 2, description: '解鎖需要古地圖知識的故事選項。' },
};

export interface Omen {
  id: OmenId;
  name: string;
  description: string;
}

/** Seed-only campaign modifier: it is derived on demand and never persisted. */
export const OMENS: Record<OmenId, Omen> = {
  'blood-moon': { id: 'blood-moon', name: '血月', description: '你的攻擊傷害 +2，但受到的傷害也 +2。' },
  'black-rain': { id: 'black-rain', name: '黑雨', description: '療傷藥的恢復量額外 +4。' },
  'still-star': { id: 'still-star', name: '靜星', description: '格擋的額外減傷由 7 提升為 10。' },
};

const OMEN_IDS: OmenId[] = ['blood-moon', 'black-rain', 'still-star'];
export function getOmen(seed: number): Omen {
  const normalized = Number.isInteger(seed) ? seed >>> 0 : 0;
  return OMENS[OMEN_IDS[normalized % OMEN_IDS.length]!];
}
export const ENEMIES: Record<EnemyId, Enemy> = {
  crocodile: { id: 'crocodile', name: '鐵脊龍鱷', hp: 27, armor: 4, xp: 6, gold: 3,
    description: '金屬的心跳從腹部傳來。牠轉身笨重，吻端比背甲柔軟。',
    intents: [{ label: '張口蓄勢：下一擊 3 傷害', damage: 3 }, { label: '橫掃尾擊：下一擊 10 傷害', damage: 10 }, { label: '翻身喘息：下一擊 2 傷害，護甲失效', damage: 2, exposed: true }] },
  spider: { id: 'spider', name: '織索巨蛛', hp: 24, armor: 1, xp: 4, gold: 2,
    description: '牠把所有逃路織在同一張網上。絲線震動時，先看牠的前足。',
    intents: [{ label: '收緊蛛絲：下一擊 5 傷害', damage: 5 }, { label: '撲咬：下一擊 9 傷害', damage: 9 }, { label: '重新結網：下一擊 2 傷害，護甲失效', damage: 2, exposed: true }] },
  guardian: { id: 'guardian', name: '深淵守龍', hp: 32, armor: 3, xp: 5, gold: 3,
    description: '牠的嘴朝向你，尾巴卻已繞到石柱後方。劍眼正盯著那裡。',
    intents: [{ label: '佯攻：下一擊 4 傷害', damage: 4 }, { label: '鉤尾穿刺：下一擊 12 傷害', damage: 12 }, { label: '收回尾甲：下一擊 3 傷害，護甲失效', damage: 3, exposed: true }] },
  gaznak: { id: 'gaznak', name: '夢魘巫師・加茲納克', hp: 43, armor: 4, xp: 6, gold: 5,
    description: '他把左手停在頸旁，彷彿知道你下一劍會落在哪裡。',
    intents: [{ label: '樂師咒音：下一擊 6 傷害，失去 1 魔力', damage: 6, drainsMana: 1 }, { label: '裂甲斬：下一擊 13 傷害', damage: 13 }, { label: '移首換位：下一擊 3 傷害，手腕露出破綻', damage: 3, exposed: true }] },
  wraith: { id: 'wraith', name: '無名怨魂', hp: 22, armor: 1, xp: 4, gold: 2,
    description: '它披著自己死去那夜的寒氣，輪廓隨每一次呼吸碎裂又重聚。',
    intents: [{ label: '寒觸：下一擊 5 傷害', damage: 5 }, { label: '哀嚎：下一擊 8 傷害，失去 1 魔力', damage: 8, drainsMana: 1 }, { label: '形體渙散：下一擊 2 傷害，護甲失效', damage: 2, exposed: true }] },
  knight: { id: 'knight', name: '空鎧騎士', hp: 35, armor: 4, xp: 6, gold: 4,
    description: '鎧甲裡沒有肉身，只有一枚被誓言磨亮的漆黑徽記。',
    intents: [{ label: '盾緣推進：下一擊 5 傷害', damage: 5 }, { label: '處刑斬：下一擊 12 傷害', damage: 12 }, { label: '重整架勢：下一擊 3 傷害，護甲失效', damage: 3, exposed: true }] },
  wolf: { id: 'wolf', name: '墓地魔狼', hp: 26, armor: 2, xp: 5, gold: 2,
    description: '牠的皮毛沾著磷火，喉間滾動著不屬於獸類的低語。',
    intents: [{ label: '繞行試探：下一擊 4 傷害', damage: 4 }, { label: '撲喉：下一擊 10 傷害', damage: 10 }, { label: '舔舐傷口：下一擊 3 傷害，護甲失效', damage: 3, exposed: true }] },
};
