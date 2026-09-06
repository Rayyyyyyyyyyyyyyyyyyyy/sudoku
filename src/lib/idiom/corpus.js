/**
 * 成語語料的放置索引。
 *
 * 所有成語一律四字，因此盤面可以「由詞長出」而不是「先畫盤再填詞」。
 * 這個模組只負責把語料轉成查表結構：`(字, 偏移) -> 成語[]`，
 * 偏移 0–3 表示該字在成語中的位置。索引建好之後，接一個新詞條
 * 是 O(1) 查表，回溯深度等於詞條數而不是格數。
 *
 * 語料本身由 `src/data/idioms.js`（build-time 產生）提供，形狀為
 * `[[surface, tier], ...]`，tier 0 最常用、數字越大越冷僻。
 * 本模組不 import 該檔案，語料一律由呼叫端傳入，測試才能用固定的
 * 小語料，而不依賴產生出來的資料檔。
 */

export const IDIOM_LENGTH = 4;

function normalizeEntry(entry, position) {
  const surface = Array.isArray(entry) ? entry[0] : entry?.surface ?? entry?.idiom;
  const tier = Array.isArray(entry) ? entry[1] : entry?.tier;
  if (typeof surface !== 'string' || [...surface].length !== IDIOM_LENGTH) {
    throw new Error(`Corpus entry ${position} is not a four-character idiom: ${JSON.stringify(entry)}`);
  }
  if (!Number.isInteger(tier) || tier < 0) {
    throw new Error(`Corpus entry ${position} has an invalid frequency tier: ${JSON.stringify(entry)}`);
  }
  return { surface, tier };
}

/**
 * 由語料建立放置索引。
 * @param {Array<[string, number]>} entries 語料條目
 * @param {number} [tierCount] 詞頻層數；省略時由資料推得
 */
export function buildPlacementIndex(entries, tierCount) {
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('Corpus must be a non-empty array');

  const idioms = [];
  const tiers = [];
  const tierOf = new Map();
  const byOffset = Array.from({ length: IDIOM_LENGTH }, () => new Map());

  entries.forEach((entry, position) => {
    const { surface, tier } = normalizeEntry(entry, position);
    if (tierOf.has(surface)) throw new Error(`Duplicate corpus entry: ${surface}`);
    tierOf.set(surface, tier);
    idioms.push(surface);
    tiers.push(tier);
    for (let offset = 0; offset < IDIOM_LENGTH; offset += 1) {
      const character = surface[offset];
      const bucket = byOffset[offset].get(character);
      if (bucket) bucket.push(surface);
      else byOffset[offset].set(character, [surface]);
    }
  });

  const maxTier = tiers.reduce((highest, tier) => Math.max(highest, tier), 0);
  const resolvedTierCount = Number.isInteger(tierCount) && tierCount > maxTier ? tierCount : maxTier + 1;

  const byTier = Array.from({ length: resolvedTierCount }, () => []);
  const charactersByTier = Array.from({ length: resolvedTierCount }, () => []);
  const seenPerTier = Array.from({ length: resolvedTierCount }, () => new Set());
  idioms.forEach((surface, position) => {
    const tier = tiers[position];
    byTier[tier].push(surface);
    for (const character of surface) {
      if (seenPerTier[tier].has(character)) continue;
      seenPerTier[tier].add(character);
      charactersByTier[tier].push(character);
    }
  });

  return { idioms, tierOf, byOffset, byTier, charactersByTier, tierCount: resolvedTierCount, size: idioms.length };
}

const EMPTY = Object.freeze([]);

/** 某個字出現在指定偏移的所有成語。查不到時回傳共用的空陣列。 */
export function idiomsAt(index, character, offset) {
  if (offset < 0 || offset >= IDIOM_LENGTH) return EMPTY;
  return index.byOffset[offset].get(character) ?? EMPTY;
}

export function isIdiom(index, surface) {
  return index.tierOf.has(surface);
}

export function tierOf(index, surface) {
  return index.tierOf.get(surface);
}

function normalizeTiers(index, tiers) {
  const list = Array.isArray(tiers) ? tiers : [tiers];
  return list.filter((tier) => Number.isInteger(tier) && tier >= 0 && tier < index.tierCount);
}

/** 指定詞頻層的所有成語，維持語料順序以保證決定性。 */
export function eligibleIdioms(index, tiers) {
  const wanted = new Set(normalizeTiers(index, tiers));
  return index.idioms.filter((surface) => wanted.has(index.tierOf.get(surface)));
}

/** 指定詞頻層出現過的相異字，用來抽干擾字。 */
export function eligibleCharacters(index, tiers) {
  const seen = new Set();
  const output = [];
  normalizeTiers(index, tiers).forEach((tier) => {
    index.charactersByTier[tier].forEach((character) => {
      if (seen.has(character)) return;
      seen.add(character);
      output.push(character);
    });
  });
  return output;
}
