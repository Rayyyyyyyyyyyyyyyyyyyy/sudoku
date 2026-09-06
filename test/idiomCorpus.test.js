import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { IDIOMS, TIER_COUNT } from '../src/data/idioms.js';

const modulePath = fileURLToPath(new URL('../src/data/idioms.js', import.meta.url));
const source = readFileSync(modulePath, 'utf8');
const header = source.slice(0, source.indexOf('export const'));

test('ships a four-character-only corpus of a usable size', () => {
  assert.equal(TIER_COUNT, 5);
  assert.ok(IDIOMS.length > 5000, `corpus holds only ${IDIOMS.length} idioms`);
  IDIOMS.forEach((entry) => {
    assert.equal(Array.isArray(entry), true);
    assert.equal(entry.length, 2);
    const [surface, tier] = entry;
    assert.equal(typeof surface, 'string');
    // Count code points, not UTF-16 units: a surrogate pair must not read as
    // two characters and let a three-idiom row pass as four.
    assert.equal(Array.from(surface).length, 4, surface);
    assert.match(surface, /^\p{Script=Han}{4}$/u);
    assert.equal(Number.isInteger(tier), true, surface);
    assert.ok(tier >= 0 && tier < TIER_COUNT, `${surface} has tier ${tier}`);
  });
});

test('no duplicate surface form', () => {
  const seen = new Set();
  const duplicates = [];
  IDIOMS.forEach(([surface]) => {
    if (seen.has(surface)) duplicates.push(surface);
    seen.add(surface);
  });
  assert.deepEqual(duplicates, []);
  assert.equal(seen.size, IDIOMS.length);
});

test('every tier is populated and the top tier is large enough to build easy boards from', () => {
  const counts = Array.from({ length: TIER_COUNT }, () => 0);
  IDIOMS.forEach(([, tier]) => {
    counts[tier] += 1;
  });
  counts.forEach((count, tier) => {
    assert.ok(count > 0, `tier ${tier} is empty`);
  });
  // The easiest level draws only from tier 0; a couple of hundred idioms is the
  // floor below which daily boards would start repeating.
  assert.ok(counts[0] >= 200, `tier 0 holds only ${counts[0]} idioms`);
  // The floor tier absorbs every entry frequency data could not reach, so it is
  // expected to be the largest by a wide margin.
  assert.ok(
    counts[TIER_COUNT - 1] > counts[0],
    'the floor tier should absorb the unaligned remainder'
  );
});

test('tier 0 holds idioms in ordinary modern use', () => {
  const tierOf = new Map(IDIOMS);
  ['一勞永逸', '實事求是', '因地制宜', '小心翼翼', '不可思議'].forEach((surface) => {
    assert.equal(tierOf.get(surface), 0, surface);
  });
});

test('the corpus is sorted so regeneration diffs locally', () => {
  const surfaces = IDIOMS.map(([surface]) => surface);
  const sorted = [...surfaces].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  assert.deepEqual(surfaces, sorted);
});

test('the module carries no definition, phonetic, or pinyin payload', () => {
  // Reproducing definitions is licensed but must be verbatim and is deferred;
  // the guard here is that nothing but surface forms and tiers ever lands in
  // this module, which is what keeps it around 100 KB instead of megabytes.
  const bytes = Buffer.byteLength(source, 'utf8');
  assert.ok(bytes < 160 * 1024, `module is ${bytes} bytes`);
  const body = source.slice(source.indexOf('export const IDIOMS'));
  assert.equal(/[，。！？；：、「」『』（）]/.test(body), false);
  assert.equal(/[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(body.replace(/export const IDIOMS = /, '')), false);
  assert.equal(/[ㄅ-ㄯ]/.test(body), false);
});

test('the generated header records source, edition, and licence', () => {
  assert.match(header, /scripts\/import-idiom-dictionary\.mjs/);
  assert.match(header, /成語典/);
  assert.match(header, /2020/);
  assert.match(header, /dict_idioms_2020_20240926\.xls/);
  assert.match(header, /CC BY-ND 3\.0 TW/);
  assert.match(header, /jfsblog\/Idiom-Search-Engine\/tree\/[0-9a-f]{40}/);
  assert.match(header, /thunlp\/THUOCL\/tree\/[0-9a-f]{40}/);
  // A wall-clock timestamp would break byte-reproducible regeneration, so the
  // recorded date must be a fixed constant in the script.
  assert.equal(header.includes(new Date().toISOString().slice(0, 19)), false);
});

test('third-party notices carry the attribution the dictionary licence requires', () => {
  const notices = readFileSync(
    fileURLToPath(new URL('../THIRD_PARTY_NOTICES.md', import.meta.url)),
    'utf8'
  );
  ['教育部', '國家教育研究院', '成語典', 'CC BY-ND 3.0', 'THUOCL'].forEach((needle) => {
    assert.ok(notices.includes(needle), `THIRD_PARTY_NOTICES.md is missing ${needle}`);
  });
});
