export const RULES_VERSION = 'dave-win-1.0.3.1551-jimbo-v1';
export const CATALOG_VERSION = 1;
export const VERIFICATION_STATUSES = ['verified', 'inferred', 'unknown'];

const provenance = {
  officialImage: 'official-ui-image-2024-10',
  observedRun: 'observed-secondary-video-34m36s',
  communityIndex: 'independent-community-mechanics-index',
  openSpec: 'openspec-compatibility-baseline',
  provisional: 'deterministic-product-default-v1'
};

const value = (data, verificationStatus, source) => ({ value: data, verificationStatus, source });

export const POKER_RULES = {
  id: 'compact-poker-v1',
  rulesVersion: RULES_VERSION,
  persistenceVersion: 1,
  displayName: '通勤牌局',
  build: value('Windows v1.0.3.1551', 'verified', 'official-2024-12-02-hotfix'),
  handSize: value(8, 'verified', provenance.officialImage),
  playActions: value(4, 'verified', provenance.observedRun),
  discardActions: value(4, 'verified', provenance.observedRun),
  deckSize: value(52, 'verified', provenance.officialImage),
  modifierCapacity: value(6, 'verified', provenance.officialImage),
  selection: value({ min: 1, max: 5 }, 'inferred', provenance.observedRun),
  interest: value({ coinsPerStep: 1, step: 5, cap: 5 }, 'inferred', provenance.communityIndex),
  rounding: value('floor', 'inferred', provenance.openSpec),
  reroll: {
    initialCost: value(1, 'verified', provenance.observedRun),
    escalation: value('linear-plus-one', 'unknown', provenance.provisional)
  },
  shopDistribution: value(
    { id: 'provisional-uniform-v1', modifierOffers: 2, packOffers: 1, replacement: true },
    'unknown',
    provenance.provisional
  ),
  handValues: {
    'high-card': value({ chips: 5, mult: 1 }, 'inferred', provenance.openSpec),
    pair: value({ chips: 10, mult: 2 }, 'inferred', provenance.openSpec),
    'two-pair': value({ chips: 20, mult: 2 }, 'inferred', provenance.openSpec),
    'three-kind': value({ chips: 30, mult: 3 }, 'inferred', provenance.openSpec),
    straight: value({ chips: 30, mult: 4 }, 'inferred', provenance.openSpec),
    flush: value({ chips: 35, mult: 4 }, 'verified', provenance.officialImage),
    'full-house': value({ chips: 40, mult: 4 }, 'inferred', provenance.openSpec),
    'four-kind': value({ chips: 60, mult: 7 }, 'inferred', provenance.openSpec),
    'straight-flush': value({ chips: 100, mult: 8 }, 'inferred', provenance.openSpec)
  }
};

const round = (id, type, target, reward, specialRuleId = null) => ({
  id,
  type,
  target,
  reward,
  specialRuleId,
  verificationStatus: 'verified',
  provenance: provenance.observedRun
});

const stage = (id, rows) => ({ id, rounds: rows });

export const OPPONENTS = [
  {
    id: 'primary-three-stage',
    display: { name: '三階挑戰者', description: '完整九回合牌局' },
    primary: true,
    verificationStatus: 'verified',
    provenance: provenance.observedRun,
    stages: [
      stage('stage-1', [
        round('primary-1-small', 'small', 300, 3),
        round('primary-1-big', 'big', 450, 4),
        round('primary-1-special', 'special', 600, 5, 'face-cards-debuffed')
      ]),
      stage('stage-2', [
        round('primary-2-small', 'small', 1000, 3),
        round('primary-2-big', 'big', 1500, 4),
        round('primary-2-special', 'special', 1500, 5, 'single-hand-type')
      ]),
      stage('stage-3', [
        round('primary-3-small', 'small', 5000, 3),
        round('primary-3-big', 'big', 7500, 4),
        round('primary-3-special', 'special', 10000, 5, 'forced-selected-card')
      ])
    ]
  },
  ['zero-discard-trial', 2100, 'start-with-zero-discards'],
  ['stage-history-trial', 2100, 'stage-played-cards-debuffed'],
  ['small-hand-trial', 2100, 'hand-size-minus-one'],
  ['single-play-trial', 1050, 'one-hand-only'],
  ['unique-hand-trial', 2100, 'hand-type-once']
].map((entry) => {
  if (!Array.isArray(entry)) return entry;
  const [id, specialTarget, specialRuleId] = entry;
  return {
    id,
    display: { name: '單階挑戰', description: '三回合相容性牌局' },
    primary: false,
    verificationStatus: 'verified',
    provenance: provenance.observedRun,
    stages: [
      stage('stage-1', [
        round(`${id}-small`, 'small', 300, 3),
        round(`${id}-big`, 'big', 1050, 4),
        round(`${id}-special`, 'special', specialTarget, 5, specialRuleId)
      ])
    ]
  };
});

export const MODIFIER_HANDLER_IDS = [
  'owned-count-mult', 'rotating-suit-xmult', 'remaining-discard-chips',
  'deck-remaining-chips', 'copy-right', 'repeated-hand-xmult',
  'discard-suit-grow-chips', 'rank-add-mult', 'four-suits-combo',
  'four-card-straight-flush', 'play-grow-discard-shrink-mult', 'retrigger-ranks',
  'small-play-mult', 'flat-add-mult', 'suit-add-mult', 'adjust-round-actions',
  'random-add-mult', 'all-face', 'first-face-xmult', 'face-add-chips',
  'club-plus-other-xmult', 'gap-straight', 'paired-suits', 'face-add-mult',
  'retrigger-face', 'all-played-score', 'four-card-grow-chips',
  'hand-frequency-mult', 'straight-xmult'
];

const modifier = (id, displayName, trigger, handlerId, params, rarity, price, saleValue, unknown = []) => ({
  id,
  display: { name: displayName, description: neutralDescription(handlerId, params) },
  trigger,
  handlerId,
  params,
  rarity,
  price,
  saleValue,
  compatibilityVersion: CATALOG_VERSION,
  verificationStatus: 'inferred',
  unknownBehavior: unknown,
  provenance: provenance.communityIndex
});

function neutralDescription(handlerId, params) {
  const descriptions = {
    'owned-count-mult': `每張已持有效果牌提供 +${params.amount} 倍率。`,
    'rotating-suit-xmult': `指定花色的計分牌使倍率 ×${params.factor}。`,
    'remaining-discard-chips': `每次剩餘棄牌提供 +${params.amount} 籌碼。`,
    'deck-remaining-chips': `牌庫每張牌提供 +${params.amount} 籌碼。`,
    'copy-right': '複製右側相容的效果。',
    'repeated-hand-xmult': `本回合重複牌型時倍率 ×${params.factor}。`,
    'discard-suit-grow-chips': `棄掉指定花色時永久成長 ${params.amount} 籌碼。`,
    'rank-add-mult': `指定點數的計分牌提供 +${params.amount} 倍率。`,
    'four-suits-combo': `四種花色齊全時 +${params.chips} 籌碼且倍率 ×${params.factor}。`,
    'four-card-straight-flush': '順子與同花可由四張牌組成。',
    'play-grow-discard-shrink-mult': `出牌時成長 +${params.amount} 倍率，棄牌時減少。`,
    'retrigger-ranks': '指定點數的計分牌再觸發一次。',
    'small-play-mult': `打出少於 ${params.lessThan} 張時 +${params.amount} 倍率。`,
    'flat-add-mult': `計分時 +${params.amount} 倍率。`,
    'suit-add-mult': `指定花色每張 +${params.amount} 倍率。`,
    'adjust-round-actions': '調整本回合棄牌與手牌上限。',
    'random-add-mult': `每手隨機 +${params.min}–${params.max} 倍率。`,
    'all-face': '所有牌都視為人頭牌。',
    'first-face-xmult': `第一張人頭計分牌使倍率 ×${params.factor}。`,
    'face-add-chips': `每張人頭計分牌 +${params.amount} 籌碼。`,
    'club-plus-other-xmult': `梅花與非梅花同時計分時倍率 ×${params.factor}。`,
    'gap-straight': '順子可容許一個點數間隔。',
    'paired-suits': '紅色花色互通、黑色花色互通。',
    'face-add-mult': `每張人頭計分牌 +${params.amount} 倍率。`,
    'retrigger-face': '人頭計分牌再觸發一次。',
    'all-played-score': '所有打出的牌都提供點數籌碼。',
    'four-card-grow-chips': `恰好打出四張時永久成長 ${params.amount} 籌碼。`,
    'hand-frequency-mult': `本階段每次打出目前牌型提供 +${params.amount} 倍率。`,
    'straight-xmult': `順子牌型使倍率 ×${params.factor}。`
  };
  return descriptions[handlerId] || '依牌局事件觸發。';
}

export const MODIFIERS = [
  modifier('owned-modifier-mult', '群聚增幅', 'score-independent', 'owned-count-mult', { amount: 3 }, 'common', 4, 2),
  modifier('rotating-suit-xmult', '輪轉花色', 'on-scoring-card', 'rotating-suit-xmult', { factor: 1.5 }, 'rare', 8, 4, ['price', 'rotation-timing']),
  modifier('remaining-discard-chips', '保留籌碼', 'score-independent', 'remaining-discard-chips', { amount: 30 }, 'common', 5, 2, ['sale-value']),
  modifier('deck-remaining-chips', '深牌庫', 'score-independent', 'deck-remaining-chips', { amount: 2 }, 'common', 5, 2, ['price', 'sale-value']),
  modifier('copy-right-effect', '右側鏡像', 'dispatch', 'copy-right', {}, 'rare', 10, 5, ['copy-compatibility']),
  modifier('repeated-hand-xmult', '重複節奏', 'score-independent', 'repeated-hand-xmult', { factor: 3 }, 'uncommon', 6, 3, ['sale-value']),
  modifier('discard-suit-grow-chips', '花色城牆', 'on-discard-card', 'discard-suit-grow-chips', { amount: 8 }, 'uncommon', 6, 3, ['price', 'sale-value', 'rotation-timing']),
  modifier('even-rank-mult', '偶數增幅', 'on-scoring-card', 'rank-add-mult', { ranks: [2, 4, 6, 8, 10], amount: 4 }, 'common', 4, 2, ['sale-value']),
  modifier('fibonacci-rank-mult', '數列增幅', 'on-scoring-card', 'rank-add-mult', { ranks: [14, 2, 3, 5, 8], amount: 8 }, 'uncommon', 7, 3),
  modifier('four-suits-combo', '四色共鳴', 'after-scoring-cards', 'four-suits-combo', { chips: 50, factor: 3 }, 'uncommon', 6, 3, ['operation-order', 'price']),
  modifier('four-card-straight-flush', '四張成形', 'hand-classifier', 'four-card-straight-flush', {}, 'common', 7, 3, ['price']),
  modifier('club-card-mult', '梅花增幅', 'on-scoring-card', 'suit-add-mult', { suit: 'clubs', amount: 4 }, 'common', 5, 2, ['sale-value']),
  modifier('diamond-card-mult', '方塊增幅', 'on-scoring-card', 'suit-add-mult', { suit: 'diamonds', amount: 4 }, 'common', 5, 2, ['sale-value']),
  modifier('play-grow-discard-shrink-mult', '進退計數', 'score-independent', 'play-grow-discard-shrink-mult', { amount: 3, floor: 0 }, 'common', 4, 2, ['sale-value', 'growth-timing']),
  modifier('low-rank-retrigger', '低點回聲', 'retrigger-scoring-card', 'retrigger-ranks', { ranks: [2, 3, 4, 5], repeats: 1 }, 'uncommon', 6, 3, ['sale-value']),
  modifier('small-play-mult', '精簡增幅', 'score-independent', 'small-play-mult', { lessThan: 3, amount: 20 }, 'common', 5, 2, ['sale-value']),
  modifier('flat-mult', '基本增幅', 'score-independent', 'flat-add-mult', { amount: 4 }, 'common', 2, 1, ['sale-value']),
  modifier('heart-card-mult', '紅心增幅', 'on-scoring-card', 'suit-add-mult', { suit: 'hearts', amount: 4 }, 'common', 5, 2, ['sale-value']),
  modifier('discard-plus-hand-size-minus', '大膽取捨', 'round-setup', 'adjust-round-actions', { discards: 3, handSize: -1 }, 'uncommon', 7, 3, ['sale-value', 'special-rule-order']),
  modifier('random-mult', '雜訊增幅', 'score-independent', 'random-add-mult', { min: 0, max: 23, distribution: 'provisional-uniform-inclusive-v1' }, 'common', 4, 2, ['range', 'sampling-timing']),
  modifier('all-face-classifier', '全面具象', 'card-classifier', 'all-face', {}, 'uncommon', 5, 2, ['sale-value', 'debuff-order']),
  modifier('first-face-xmult', '第一印象', 'on-scoring-card', 'first-face-xmult', { factor: 2 }, 'common', 5, 2),
  modifier('face-card-chips', '人頭籌碼', 'on-scoring-card', 'face-add-chips', { amount: 30 }, 'common', 4, 2),
  modifier('club-plus-other-xmult', '雙域增幅', 'score-independent', 'club-plus-other-xmult', { factor: 2 }, 'uncommon', 6, 3, ['sale-value']),
  modifier('gap-straight-classifier', '跳接順子', 'hand-classifier', 'gap-straight', { maxGap: 2 }, 'uncommon', 7, 3, ['sale-value']),
  modifier('paired-suits-classifier', '雙色花色', 'card-classifier', 'paired-suits', {}, 'uncommon', 7, 3),
  modifier('face-card-mult', '笑面增幅', 'on-scoring-card', 'face-add-mult', { amount: 5 }, 'common', 4, 2),
  modifier('face-card-retrigger', '人頭回聲', 'retrigger-scoring-card', 'retrigger-face', { repeats: 1 }, 'uncommon', 6, 3, ['sale-value']),
  modifier('all-played-score', '全員計分', 'scoring-selector', 'all-played-score', {}, 'common', 3, 1),
  modifier('four-card-grow-chips', '方形累積', 'score-independent', 'four-card-grow-chips', { amount: 12 }, 'common', 4, 2, ['sale-value', 'growth-timing']),
  modifier('hand-frequency-mult', '熟練增幅', 'score-independent', 'hand-frequency-mult', { amount: 3 }, 'uncommon', 5, 2, ['count-timing']),
  modifier('straight-xmult', '順序增幅', 'score-independent', 'straight-xmult', { factor: 3 }, 'rare', 8, 4, ['sale-value']),
  modifier('spade-card-mult', '黑桃增幅', 'on-scoring-card', 'suit-add-mult', { suit: 'spades', amount: 4 }, 'common', 5, 2, ['sale-value'])
];

export const SPECIAL_RULE_HANDLER_IDS = [
  'set-round-actions', 'debuff-by-stage-history', 'adjust-hand-size',
  'reject-used-hand-type', 'debuff-by-rank-class', 'lock-first-hand-type', 'force-selection'
];

export const SPECIAL_RULES = [
  ['start-with-zero-discards', '無棄牌回合', 'set-round-actions', { discards: 0 }],
  ['stage-played-cards-debuffed', '舊牌失效', 'debuff-by-stage-history', { history: 'played' }],
  ['hand-size-minus-one', '縮減手牌', 'adjust-hand-size', { delta: -1, minimum: 1 }],
  ['one-hand-only', '單次出牌', 'set-round-actions', { hands: 1 }],
  ['hand-type-once', '牌型不可重複', 'reject-used-hand-type', { scope: 'round' }],
  ['face-cards-debuffed', '人頭牌失效', 'debuff-by-rank-class', { class: 'face' }],
  ['single-hand-type', '鎖定首個牌型', 'lock-first-hand-type', { scope: 'round' }],
  ['forced-selected-card', '單牌出擊', 'force-selection', { count: 1 }]
].map(([id, name, handlerId, params]) => ({
  id,
  display: { name, description: name },
  handlerId,
  params,
  verificationStatus: 'verified',
  compatibilityVersion: CATALOG_VERSION,
  provenance: provenance.observedRun
}));

export const PACKS = [
  ['modifier-pack-small', '小型效果包', 2, 1, 4],
  ['modifier-pack-jumbo', '大型效果包', 3, 1, 6],
  ['modifier-pack-mega', '雙選效果包', 4, 2, 8]
].map(([id, name, revealCount, choiceCount, price]) => ({
  id,
  display: { name, description: `展示 ${revealCount} 張，可選 ${choiceCount} 張。` },
  revealCount,
  choiceCount,
  price,
  canSkip: true,
  distribution: 'provisional-uniform-all-rarities-v1',
  verificationStatus: 'inferred',
  distributionVerificationStatus: 'unknown',
  compatibilityVersion: CATALOG_VERSION,
  provenance: provenance.communityIndex
}));

export const COMPATIBILITY_FIXTURES = {
  officialFlushMidscore68: {
    id: 'official-flush-midscore-68',
    cards: ['QD', 'JD', '7D', '6D'],
    baseChips: 35,
    expectedChips: 68,
    verificationStatus: 'verified',
    provenance: provenance.officialImage
  },
  straightBroadway: { id: 'straight-broadway-baseline', cards: ['10S', 'JH', 'QD', 'KC', 'AS'], expected: 324, verificationStatus: 'inferred' },
  straightWheel: { id: 'straight-wheel-baseline', cards: ['AS', '2H', '3D', '4C', '5S'], expected: 220, verificationStatus: 'inferred' },
  interest: { holdings: [0, 4, 5, 24, 25, 29], expected: [0, 0, 1, 4, 5, 5], verificationStatus: 'inferred' },
  ordered: [
    { id: 'left-to-right-add-then-x', operations: [{ type: 'add-mult', amount: 4 }, { type: 'multiply-mult', factor: 3 }], expected: 180 },
    { id: 'left-to-right-x-then-add', operations: [{ type: 'multiply-mult', factor: 3 }, { type: 'add-mult', amount: 4 }], expected: 100 }
  ],
  combinations: [
    { id: 'all-face-plus-face-chips', modifiers: ['all-face-classifier', 'face-card-chips'], expectedBonusChipsForFive: 150, verificationStatus: 'inferred' },
    { id: 'bounded-face-retrigger-stack', modifiers: ['all-face-classifier', 'face-card-chips', 'copy-right-effect', 'rotating-suit-xmult', 'face-card-retrigger', 'low-rank-retrigger'], verificationStatus: 'unknown', expectation: 'ordered-trace-terminates' }
  ]
};

export function validateCatalogs({ rules = POKER_RULES, opponents = OPPONENTS, modifiers = MODIFIERS, packs = PACKS, specialRules = SPECIAL_RULES } = {}) {
  const errors = [];
  const requireUnique = (items, label) => {
    const seen = new Set();
    items.forEach((item) => {
      if (!item?.id) errors.push(`${label}: missing id`);
      else if (seen.has(item.id)) errors.push(`${label}: duplicate id ${item.id}`);
      seen.add(item?.id);
      if (!item?.display?.name || !item?.display?.description) errors.push(`${label}: missing display data ${item?.id || '?'}`);
    });
  };
  requireUnique(opponents, 'opponent');
  requireUnique(modifiers, 'modifier');
  requireUnique(packs, 'pack');
  requireUnique(specialRules, 'special rule');

  if (!rules?.rulesVersion || !rules?.handValues) errors.push('rules: missing version or hand values');
  const ruleIds = new Set(specialRules.map((item) => item.id));
  opponents.forEach((opponent) => {
    if (!Array.isArray(opponent.stages) || opponent.stages.length < 1) errors.push(`opponent: ${opponent.id} requires stages`);
    opponent.stages?.forEach((candidate, stageIndex) => {
      if (!candidate.id) errors.push(`opponent: ${opponent.id} stage ${stageIndex} missing id`);
      if (!Array.isArray(candidate.rounds) || candidate.rounds.length !== 3) errors.push(`opponent: ${opponent.id} stage ${stageIndex} must have 3 rounds`);
      const expected = ['small', 'big', 'special'];
      candidate.rounds?.forEach((candidateRound, roundIndex) => {
        if (!candidateRound.id || candidateRound.type !== expected[roundIndex]) errors.push(`opponent: ${opponent.id} invalid round ${roundIndex}`);
        if (!Number.isFinite(candidateRound.target) || candidateRound.target <= 0 || !Number.isFinite(candidateRound.reward)) errors.push(`opponent: ${opponent.id} invalid target/reward`);
        if (candidateRound.specialRuleId && !ruleIds.has(candidateRound.specialRuleId)) errors.push(`opponent: ${opponent.id} unknown rule ${candidateRound.specialRuleId}`);
      });
    });
  });
  const primary = opponents.filter((item) => item.primary);
  if (primary.length !== 1 || primary[0].stages.length !== 3 || primary[0].stages.flatMap((item) => item.rounds).length !== 9) errors.push('opponent: primary progression must be 3 stages/9 rounds');

  modifiers.forEach((item) => {
    if (!MODIFIER_HANDLER_IDS.includes(item.handlerId)) errors.push(`modifier: invalid handler ${item.handlerId}`);
    if (!item.trigger || !item.params || !VERIFICATION_STATUSES.includes(item.verificationStatus)) errors.push(`modifier: invalid metadata ${item.id}`);
    if (!Number.isFinite(item.price) || !Number.isFinite(item.saleValue) || item.saleValue < 0) errors.push(`modifier: invalid price ${item.id}`);
  });
  specialRules.forEach((item) => {
    if (!SPECIAL_RULE_HANDLER_IDS.includes(item.handlerId)) errors.push(`special rule: invalid handler ${item.handlerId}`);
  });
  packs.forEach((item) => {
    if (!Number.isInteger(item.revealCount) || !Number.isInteger(item.choiceCount) || item.choiceCount < 1 || item.choiceCount > item.revealCount) errors.push(`pack: impossible choice counts ${item.id}`);
    if (!item.distribution) errors.push(`pack: missing distribution ${item.id}`);
  });
  return { ok: errors.length === 0, errors };
}

export const PRIMARY_OPPONENT_ID = OPPONENTS.find((item) => item.primary).id;
export const modifierById = (id) => MODIFIERS.find((item) => item.id === id);
export const packById = (id) => PACKS.find((item) => item.id === id);
export const specialRuleById = (id) => SPECIAL_RULES.find((item) => item.id === id);
export const opponentById = (id) => OPPONENTS.find((item) => item.id === id);
