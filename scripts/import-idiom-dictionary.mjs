import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Build-time generator for src/data/idioms.js.
//
// Inputs are supplied as paths (argv, or the matching env var) so the script
// never depends on a particular checkout location:
//
//   node scripts/import-idiom-dictionary.mjs \
//     <database.json> <THUOCL_chengyu.txt> <TSCharacters.txt> [output]
//
//   IDIOM_DICTIONARY   jfsblog/Idiom-Search-Engine database.json
//                      (教育部《成語典》正文, converted from
//                      dict_idioms_2020_20240926.xls)
//   IDIOM_FREQUENCY    thunlp/THUOCL data/THUOCL_chengyu.txt
//   IDIOM_TS_CHARACTERS BYVoid/OpenCC data/dictionary/TSCharacters.txt
//   IDIOM_OUTPUT       defaults to src/data/idioms.js
//
// The output is byte-reproducible: every sort is total, nothing depends on
// object iteration order, and no wall-clock value is written. GENERATED_ON is
// a constant bumped by hand when the corpus is regenerated, so re-running the
// script against the same inputs cannot change a single byte.

const dictionaryPath = resolve(process.argv[2] || process.env.IDIOM_DICTIONARY || 'database.json');
const frequencyPath = resolve(process.argv[3] || process.env.IDIOM_FREQUENCY || 'THUOCL_chengyu.txt');
const conversionPath = resolve(
  process.argv[4] || process.env.IDIOM_TS_CHARACTERS || 'TSCharacters.txt'
);
const output = resolve(process.argv[5] || process.env.IDIOM_OUTPUT || 'src/data/idioms.js');

const TIER_COUNT = 5;
// Tiers 0-3 are cut from the frequency-aligned entries; tier 4 is the floor
// that also absorbs every entry frequency data could not reach.
const RANKED_TIERS = TIER_COUNT - 1;
const LOWEST_TIER = TIER_COUNT - 1;
const IDIOM_LENGTH = 4;

const DICTIONARY = {
  title: '教育部《成語典》正文',
  edition: '2020 年版，資料檔 dict_idioms_2020_20240926.xls（2024-09-26）',
  author: '中華民國教育部',
  maintainer: '國家教育研究院',
  licence: '創用 CC 姓名標示－禁止改作 3.0 臺灣 (CC BY-ND 3.0 TW)',
  repo: 'https://github.com/jfsblog/Idiom-Search-Engine',
  commit: 'c5b5eae731fb3f4e565f802aa91be354cb91bcd9'
};
const FREQUENCY = {
  title: 'THUOCL 清華大學開放中文詞庫 · 成語詞表',
  licence: 'MIT',
  repo: 'https://github.com/thunlp/THUOCL',
  commit: 'a30ce79d895d01ab5132a5c74c29703ff7efb4cc'
};
const CONVERSION = {
  title: 'OpenCC TSCharacters.txt（繁→簡單字對照表，僅用於比對，未隨程式發布）',
  licence: 'Apache-2.0',
  repo: 'https://github.com/BYVoid/OpenCC',
  commit: '26753884f1984add422f3b0249ccee8613deaff6'
};

// Bumped by hand when the corpus is regenerated. Deliberately not Date.now().
const GENERATED_ON = '2026-09-06';

const characters = (value) => Array.from(String(value));
const isHan = (value) => /^\p{Script=Han}+$/u.test(value);
const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// --- 1. Dictionary: exactly four Han characters, no duplicate surface form ---

const rows = JSON.parse(readFileSync(dictionaryPath, 'utf8'));
if (!Array.isArray(rows)) {
  throw new Error(`Expected a JSON array of dictionary rows in ${dictionaryPath}`);
}

const rejected = { missing: 0, notFourCharacters: 0, nonHan: 0, duplicate: 0 };
const entries = new Map(); // surface -> dictionary serial (編號)

for (const row of rows) {
  const raw = row && row['成語'];
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    rejected.missing += 1;
    continue;
  }
  const surface = String(raw).trim();
  // Count code points, never UTF-16 units, so a non-BMP character cannot
  // sneak a three-character idiom past the length check.
  if (characters(surface).length !== IDIOM_LENGTH) {
    rejected.notFourCharacters += 1;
    continue;
  }
  if (!isHan(surface)) {
    rejected.nonHan += 1;
    continue;
  }
  if (entries.has(surface)) {
    rejected.duplicate += 1;
    continue;
  }
  const serial = Number(row['編號']);
  entries.set(surface, Number.isFinite(serial) ? serial : Number.MAX_SAFE_INTEGER);
}

const surfaces = [...entries.keys()].sort(byCodePoint);
if (surfaces.length === 0) {
  throw new Error(`No four-character entries found in ${dictionaryPath}`);
}

// --- 2. Frequency table (Simplified) ---

const frequency = new Map();
for (const line of readFileSync(frequencyPath, 'utf8').split('\n')) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 2) continue;
  const [word, rawCount] = parts;
  if (characters(word).length !== IDIOM_LENGTH) continue;
  const count = Number(rawCount);
  if (!Number.isFinite(count)) continue;
  // Keep the first occurrence so a duplicated source row cannot reorder tiers.
  if (!frequency.has(word)) frequency.set(word, count);
}
if (frequency.size === 0) {
  throw new Error(`No four-character frequency rows found in ${frequencyPath}`);
}

// --- 3. Traditional -> Simplified character table ---
//
// Alignment runs in the safe direction only. Traditional to Simplified is
// many-to-one, so it can lose information but cannot invent a word. The
// reverse direction would let one Simplified form expand into several
// Traditional candidates and manufacture idioms the dictionary never listed.

const toSimplified = new Map();
for (const line of readFileSync(conversionPath, 'utf8').split('\n')) {
  if (!line || line.startsWith('#')) continue;
  const [key, values] = line.split('\t');
  if (!key || !values) continue;
  const candidates = values.trim().split(' ').filter(Boolean);
  if (candidates.length > 0) toSimplified.set(key, candidates);
}
if (toSimplified.size === 0) {
  throw new Error(`No conversion pairs found in ${conversionPath}`);
}

// A character with several Simplified candidates produces several candidate
// forms. An idiom aligns only when exactly one of them is in the frequency
// table; zero matches or several matches are both treated as "not aligned".
function simplifiedForms(surface) {
  let forms = [''];
  for (const character of characters(surface)) {
    const candidates = toSimplified.get(character) || [character];
    const next = [];
    for (const prefix of forms) {
      for (const candidate of candidates) next.push(prefix + candidate);
    }
    forms = next;
  }
  return [...new Set(forms)];
}

// --- 4. Alignment: rank existing entries, never add one ---

const matchedKey = new Map(); // surface -> simplified key
let ambiguousForm = 0;
for (const surface of surfaces) {
  const hits = simplifiedForms(surface).filter((form) => frequency.has(form));
  if (hits.length === 1) matchedKey.set(surface, hits[0]);
  else if (hits.length > 1) ambiguousForm += 1;
}

// Two dictionary entries can converge on the same Simplified form — they are
// orthographic variants of one idiom (不修邊幅 / 不脩邊幅), and THUOCL counted
// them together. The dictionary's own serial resolves it: the main entry
// carries the low serial and the variant is a cross-reference to it, so the
// count is attributed to the main entry and the variant drops to the floor
// tier rather than borrowing a frequency it did not earn.
const grouped = new Map();
for (const [surface, key] of matchedKey) {
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(surface);
}
let variantCollisions = 0;
const aligned = new Map(); // surface -> document frequency
for (const [key, group] of grouped) {
  const winner = [...group].sort(
    (a, b) => entries.get(a) - entries.get(b) || byCodePoint(a, b)
  )[0];
  variantCollisions += group.length - 1;
  aligned.set(winner, frequency.get(key));
}

const alignmentRate = aligned.size / surfaces.length;

// --- 5. Tiers ---

const ranked = [...aligned.keys()].sort(
  (a, b) =>
    aligned.get(b) - aligned.get(a) ||
    entries.get(a) - entries.get(b) ||
    byCodePoint(a, b)
);
const bucket = Math.ceil(ranked.length / RANKED_TIERS);
const tierOf = new Map();
ranked.forEach((surface, index) => {
  tierOf.set(surface, Math.min(Math.floor(index / bucket), RANKED_TIERS - 1));
});

const corpus = surfaces.map((surface) => [surface, tierOf.has(surface) ? tierOf.get(surface) : LOWEST_TIER]);
const distribution = Array.from({ length: TIER_COUNT }, () => 0);
for (const [, tier] of corpus) distribution[tier] += 1;

// --- 6. Emit ---

const totalRejectedRows =
  rejected.missing + rejected.notFourCharacters + rejected.nonHan + rejected.duplicate;

const header = [
  `// Generated by scripts/import-idiom-dictionary.mjs on ${GENERATED_ON}. Do not edit by hand.`,
  `// Source dictionary: ${DICTIONARY.title}`,
  `// Edition: ${DICTIONARY.edition}`,
  `// Author: ${DICTIONARY.author}; maintained by ${DICTIONARY.maintainer}`,
  `// Licence: ${DICTIONARY.licence}`,
  `// Source repo: ${DICTIONARY.repo}/tree/${DICTIONARY.commit}`,
  `// Frequency tiers ranked from ${FREQUENCY.title} (${FREQUENCY.licence})`,
  `//   ${FREQUENCY.repo}/tree/${FREQUENCY.commit}`,
  `// Alignment used ${CONVERSION.title} (${CONVERSION.licence})`,
  `//   ${CONVERSION.repo}/tree/${CONVERSION.commit}`,
  '//',
  '// Surface forms only. Definitions, 注音 and 漢語拼音 are deliberately excluded:',
  '// they are orders of magnitude larger and are a separate change. The licence',
  '// permits format conversion but not rewriting, so any definition shown later',
  '// must be reproduced verbatim.',
  '//',
  `// ${corpus.length} entries, ${totalRejectedRows} source rows rejected.`,
  `// ${aligned.size} (${(alignmentRate * 100).toFixed(2)}%) aligned to frequency data and cut into`,
  `// tiers 0-${RANKED_TIERS - 1}; everything else sits at tier ${LOWEST_TIER}.`,
  `// Per-tier counts, most common first: ${distribution.join(', ')}.`,
  ''
].join('\n');

// Wrapped a row at a time rather than one entry per line: at 5,000-plus
// entries the per-line overhead is a sixth of the module, and the sort is
// stable so a regenerated file still diffs locally.
const PER_LINE = 8;
const lines = [];
for (let index = 0; index < corpus.length; index += PER_LINE) {
  lines.push(corpus.slice(index, index + PER_LINE).map((entry) => JSON.stringify(entry)).join(','));
}
const body = lines.join(',\n');

const file = `${header}
export const TIER_COUNT = ${TIER_COUNT};

// [surface, tier]; tier 0 = most common ... ${LOWEST_TIER} = rarest.
// Sorted by surface form code point, so regeneration produces a minimal diff.
export const IDIOMS = [
${body}
];
`;

writeFileSync(output, file);

// --- 7. Report ---

const report = [
  `Source rows: ${rows.length}`,
  `Rejected: ${totalRejectedRows} (missing ${rejected.missing}, not four characters ${rejected.notFourCharacters}, non-Han ${rejected.nonHan}, duplicate surface ${rejected.duplicate})`,
  `Corpus entries: ${corpus.length}`,
  `Frequency rows usable: ${frequency.size}`,
  `Aligned: ${aligned.size}/${surfaces.length} = ${(alignmentRate * 100).toFixed(2)}%`,
  `  dropped as ambiguous candidate forms: ${ambiguousForm}`,
  `  dropped as variant collisions: ${variantCollisions}`,
  `Tier sizes (0 = most common): ${distribution.join(', ')}`,
  `Wrote ${corpus.length} idioms to ${output}`
].join('\n');
console.log(report);

if (distribution[0] < 200) {
  console.warn(
    `WARNING: tier 0 holds only ${distribution[0]} idioms, too few to tune the easiest level against.`
  );
}
