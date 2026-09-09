import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { STORY, SOURCE } from '../src/data/rpg/story.ts';
import { CLASSES, ENEMIES, ITEMS, UPGRADES } from '../src/lib/rpg/catalog.ts';

const target = fileURLToPath(new URL('../docs/rpg-story.md', import.meta.url));
const resources = { hp: '生命', mana: '魔力', gold: '金幣', supplies: '補給' };

function requirement(value) {
  if (value.kind === 'class') return `職業：${CLASSES[value.value].name}`;
  if (value.kind === 'flag') return `線索：${value.value}`;
  if (value.kind === 'item') return `物品：${ITEMS[value.value].name}`;
  if (value.kind === 'upgrade') return `村莊養成：${UPGRADES[value.value].name}`;
  return `${resources[value.resource]}至少 ${value.amount}`;
}

function effect(value) {
  if (value.kind === 'resource') return `${resources[value.resource]} ${value.amount >= 0 ? '+' : ''}${value.amount}`;
  if (value.kind === 'flag') return `取得線索：${value.value}`;
  if (value.kind === 'item') return `取得物品：${ITEMS[value.value].name}`;
  if (value.kind === 'consume') return `消耗物品：${ITEMS[value.value].name}`;
  return `經驗 +${value.amount}`;
}

const choiceCount = STORY.reduce((total, node) => total + node.choices.length, 0);
const lines = [
  '# 夢魘堡壘：文本稿',
  '',
  `此稿由 \`src/data/rpg/story.ts\` 自動產生，供閱讀與審閱；TS 是唯一維護來源。目前包含 ${STORY.length} 節、${choiceCount} 個選項；全部分支不代表單趟會讀到所有內容，也尚未驗證三小時遊玩量。`,
  '',
  `原作：${SOURCE.author}，*${SOURCE.title}*，收於 *${SOURCE.collection}*。`,
  '',
  `[英文原典](${SOURCE.url})；${SOURCE.edition}。${SOURCE.notice}`,
  '',
];

for (const node of STORY) {
  lines.push(`## ${node.act}｜${node.title}`, '', `節點：\`${node.id}\`${node.ending ? `；結局：\`${node.ending}\`` : ''}。`, '');
  for (const paragraph of node.paragraphs) lines.push(paragraph, '');
  if (node.variants?.length) {
    lines.push('條件段落：', '');
    for (const variant of node.variants) lines.push(`- 線索 \`${variant.flag}\`：${variant.text}`);
    lines.push('');
  }
  if (node.choices.length) {
    lines.push('選項：', '');
    for (const choice of node.choices) {
      const notes = [];
      if (choice.requires?.length) notes.push(`條件：${choice.requires.map(requirement).join('、')}`);
      if (choice.effects?.length) notes.push(`效果：${choice.effects.map(effect).join('、')}`);
      if (choice.encounter) notes.push(`遭遇：${ENEMIES[choice.encounter].name}`);
      lines.push(`- **${choice.label}**：${choice.detail} → \`${choice.next}\`${notes.length ? `；${notes.join('；')}` : ''}`);
    }
    lines.push('');
  }
  lines.push(`改編來源（${node.provenance.source}）：${node.provenance.note}`, '');
}

await writeFile(target, `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote ${target}: ${STORY.length} nodes, ${choiceCount} choices.`);
