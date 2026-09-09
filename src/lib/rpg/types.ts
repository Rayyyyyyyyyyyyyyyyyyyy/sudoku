export type ClassId = 'warrior' | 'mage' | 'ranger';
export type ItemId = 'potion' | 'ward' | 'sacnoth' | 'ember' | 'iron' | 'moonstone' | 'bell';
export type UpgradeId = 'vigor' | 'focus' | 'supplies' | 'steel' | 'alchemy' | 'map';
export type Flag = 'rescued' | 'weakness' | 'staff' | 'merchant' | 'rune' | 'truth' | 'counterspell' |
  'pilgrim' | 'ferryman' | 'sigil' | 'prisoner' | 'choir';
export type EnemyId = 'crocodile' | 'spider' | 'guardian' | 'gaznak' | 'wraith' | 'knight' | 'wolf';
export type OmenId = 'blood-moon' | 'black-rain' | 'still-star';
export type EventPoolId = 'wilds' | 'fortress';
export type LootTableId = 'wilds' | 'fortress';
export type Phase = 'story' | 'combat' | 'ended';

export interface Hero {
  classId: ClassId;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  attack: number;
  armor: number;
  level: number;
  xp: number;
  gold: number;
  supplies: number;
  inventory: ItemId[];
}

export type Requirement =
  | { kind: 'class'; value: ClassId }
  | { kind: 'flag'; value: Flag }
  | { kind: 'item'; value: ItemId }
  | { kind: 'upgrade'; value: UpgradeId }
  | { kind: 'resource'; resource: 'mana' | 'gold' | 'supplies'; amount: number };

export type Effect =
  | { kind: 'resource'; resource: 'hp' | 'mana' | 'gold' | 'supplies'; amount: number }
  | { kind: 'flag'; value: Flag }
  | { kind: 'item'; value: ItemId }
  | { kind: 'consume'; value: ItemId }
  | { kind: 'loot'; table: LootTableId }
  | { kind: 'xp'; amount: number };

export interface Choice {
  id: string;
  label: string;
  detail: string;
  next: string;
  requires?: Requirement[];
  effects?: Effect[];
  encounter?: EnemyId;
  eventPool?: EventPoolId;
}

export interface StoryNode {
  id: string;
  act: string;
  title: string;
  paragraphs: string[];
  variants?: { flag: Flag; text: string }[];
  choices: Choice[];
  ending?: 'victory' | 'retreat' | 'defeat';
  provenance: { source: 'sacnoth' | 'original'; note: string };
}

export interface Enemy {
  id: EnemyId;
  name: string;
  hp: number;
  armor: number;
  xp: number;
  gold: number;
  description: string;
  intents: { label: string; damage: number; exposed?: boolean; drainsMana?: number }[];
}

export interface Battle {
  enemyId: EnemyId;
  hp: number;
  round: number;
  intent: number;
  next: string;
}

export interface Run {
  seed: number;
  loadoutUpgrades: UpgradeId[];
  random: { algorithm: string; value: number; calls: number };
  phase: Phase;
  nodeId: string;
  hero: Hero;
  flags: Flag[];
  visited: string[];
  battle: Battle | null;
  log: string[];
}

export interface GameState {
  schemaVersion: 1;
  contentVersion: string;
  revision: number;
  profile: { insight: number; victories: number; expeditions: number; upgrades: UpgradeId[]; discoveries: string[] };
  run: Run | null;
}

export type Action =
  | { type: 'start'; classId: ClassId; seed: number; revision: number }
  | { type: 'choose'; id: string; revision: number }
  | { type: 'combat'; id: 'attack' | 'skill' | 'guard' | 'potion' | 'flee'; revision: number }
  | { type: 'upgrade'; id: UpgradeId; revision: number }
  | { type: 'retreat'; revision: number };

export interface ActionOption {
  id: string;
  label: string;
  detail: string;
  disabled: boolean;
  reason: string;
}

export interface TransitionResult {
  state: GameState;
  accepted: boolean;
  reason?: string;
}
