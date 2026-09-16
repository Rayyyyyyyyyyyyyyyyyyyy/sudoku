import { createInterface } from 'node:readline';
import { COMPONENTS, ENEMIES, FRAGMENT_IDS, FRAGMENTS } from './rules.ts';
import { createLab, NODES, transition } from './run.ts';

let state = createLab(Number(process.argv[2] ?? 42));
const help = () => {
  console.log('法術研究實驗切片：10 殘頁／2 敵人／2 詞綴。記憶體遊玩，不接觸 RPG 存檔。');
  for (const [i, id] of FRAGMENT_IDS.entries()) console.log(`${i + 1}. ${COMPONENTS[FRAGMENTS[id].component].symbol} ${FRAGMENTS[id].name} (${id})`);
  console.log('book 7,5|1,2|3,4 配三個法術；move 殘頁編號 法術編號 格位；arrange 法術編號');
  console.log('enter / preview 法術編號 / cast 法術編號 / attack / guard / continue / retry / escape / restart / help / quit');
};
function show() {
  const hero = state.position.hero;
  console.log(`\n${state.phase}｜生命 ${hero.hp}/${hero.maxHp}｜魔力 ${hero.mana}/${hero.maxMana}｜見聞 ${state.profile.insight}｜撤離 ${state.position.escape ? 1 : 0}`);
  for (const [i, spell] of state.position.book.entries()) console.log(`法術 ${i + 1}：${spell.map(id => id ? FRAGMENTS[id].name : '＿').join(' → ')}`);
  if (state.battle) {
    const info = state.battle.info;
    console.log(`${ENEMIES[info.enemy].name} 生命 ${info.enemyHp}｜詞綴 ${info.modifiers.join(', ')}｜回合 ${info.turn}`);
    console.log(`已知意圖：${info.known.map(id => ENEMIES[info.enemy].intents[id].name).join(' → ')}`);
    if (info.casting) console.log(`詠唱剩 ${info.casting.remaining} 回合；輸入 continue`);
  } else if (NODES[state.position.cursor]) console.log(`下一場：${ENEMIES[NODES[state.position.cursor].enemy].name}`);
}
function parse(line) {
  const [name, ...args] = line.trim().split(/\s+/);
  if (['enter', 'retry', 'escape', 'restart'].includes(name)) return { type: name };
  if (['attack', 'guard', 'continue'].includes(name)) return { type: 'fight', action: { type: name } };
  if (name === 'cast') return { type: 'fight', action: { type: 'cast', spell: Number(args[0]) - 1 } };
  if (['preview', 'arrange'].includes(name)) return { type: name, spell: Number(args[0]) - 1 };
  if (name === 'move') return { type: name, fragment: FRAGMENT_IDS[Number(args[0]) - 1], spell: Number(args[1]) - 1, slot: Number(args[2]) - 1 };
  if (name === 'book') return { type: 'compose', spells: (args[0] ?? '').split('|').map(s => s ? s.split(',').map(n => FRAGMENT_IDS[Number(n) - 1]) : []) };
  return null;
}
help(); show();
const input = createInterface({ input: process.stdin, output: process.stdout });
input.setPrompt('研究> '); input.prompt();
input.on('line', line => {
  if (line.trim() === 'quit') { input.close(); return; }
  if (line.trim() === 'help') help();
  else {
    const action = parse(line);
    if (!action) console.log('未知指令；輸入 help 查看操作。');
    else {
      const result = transition(state, { ...action, revision: state.revision });
      state = result.state;
      if (!result.accepted) console.log(`未執行：${result.reason}`);
    }
  }
  show(); input.prompt();
});
