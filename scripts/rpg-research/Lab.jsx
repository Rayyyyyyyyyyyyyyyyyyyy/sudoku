import React, { useState } from 'react';
import { actions, arrange, canCast, castTurns, COMPONENTS, createBattle, ENEMIES, evaluate, FRAGMENTS, step } from './rules.ts';
import { createLab, NODES, transition } from './run.ts';
import './lab.css';

function effectText(id) {
  const f = FRAGMENTS[id];
  return [f.heal && `回復 ${f.heal}`, f.shield && `護盾 ${f.shield}`,
    f.hits && `${f.pierce ? '穿甲' : ''}傷害 ${f.hits.join(' + ')}`,
    f.opening && `敵人半血以上 +${f.opening}`, f.break && `降甲 ${f.break}`,
    f.weaken && `下次敵方行動減傷 ${f.weaken}`, f.stun && '取消下一次敵方行動'].filter(Boolean).join('；');
}
function forecast(info, spell) {
  if (!canCast(info, spell) || info.known.length < Math.max(1, castTurns(info.spells[spell].length))) return null;
  let result = step(info, { type: 'cast', spell });
  while (result.state.casting) result = step(result.state, { type: 'continue' });
  return result;
}
export default function Lab() {
  const [state, setState] = useState(() => createLab(0));
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('選取殘頁，再點選法術空格即可移動。');
  const node = NODES[state.position.cursor];
  const info = state.battle?.info;
  const effectContext = info ?? createBattle(node?.enemy ?? 'crocodile', node?.modifiers ?? [], state.position.hero,
    state.position.book.map(spell => spell.filter(Boolean)));
  const send = action => {
    const result = transition(state, { ...action, revision: state.revision });
    setState(result.state);
    setMessage(result.accepted ? '操作已完成。' : result.reason);
    if (result.accepted && ['move', 'enter', 'retry', 'restart'].includes(action.type)) setSelected(null);
  };
  const example = enemy => send({ type: 'compose', spells: enemy === 'knight'
    ? [['camel-rend', 'whale-steady'], ['living-heal', 'dead-drain'], ['elephant-stop', 'living-shield']]
    : [['living-shield', 'whale-steady'], ['living-heal', 'whale-opening'], ['camel-rend', 'elephant-stop']] });
  return <main>
    <header><p className="eyebrow">夢魘堡壘 · 規則實驗</p><h1>法術研究</h1>
      <p>十張殘頁，兩場考驗。以不同的組成，找出活著回來的方法。</p>
      <p className="notice">實驗切片・重新整理會重置此頁進度；不讀寫正式遊戲存檔。</p></header>
    <section className="status" aria-label="角色狀態">
      <strong>生命 {state.position.hero.hp} / 40</strong><strong>魔力 {state.position.hero.mana} / 10</strong>
      <span>見聞 {state.profile.insight}</span><span>撤離額度 {state.position.escape ? 1 : 0}</span>
    </section>
    <nav className="map" aria-label="章節路線">{NODES.map((n, i) => <div key={n.id} aria-current={i === state.position.cursor ? 'step' : undefined}>
      <small>{i + 1} / {n.boss ? '首領' : '戰鬥'}</small><strong>{ENEMIES[n.enemy].name}</strong>
      <span>{n.modifiers.includes('silent') ? '▧ 緘默：只能施放 1–2 行' : '◇ 迴響：首次傷害固定反傷 5'}</span>
      {state.position.escaped.includes(n.id) && <b>已撤離 · 獎勵放棄</b>}
    </div>)}</nav>
    {info && <section className="encounter" aria-label="戰鬥">
      <p className="eyebrow">回合 {info.turn + 1} · {info.enemy === 'knight' ? '護甲 5，降甲可加速' : '每傷害層反傷 6，與迴響合計上限 10'}</p>
      <h2>{ENEMIES[info.enemy].name} <small>生命 {info.enemyHp}</small></h2>
      <div className="intents">{info.known.map((id, i) => <p key={i}><b>{i === 0 ? '本回合' : '下回合'}</b> {ENEMIES[info.enemy].intents[id].name} · 傷害 {ENEMIES[info.enemy].intents[id].damage}</p>)}</div>
      {info.casting ? <><p>詠唱剩 {info.casting.remaining} 回合。敵方行動後，若存活且未被打斷，立即完成。</p>
        <button onClick={() => send({ type: 'fight', action: { type: 'continue' } })}>繼續詠唱</button></>
        : <div className="controls">{actions(info).filter(a => a.type !== 'cast').map(action => <button key={action.type} onClick={() => send({ type: 'fight', action })}>
          {action.type === 'attack' ? '普攻 · 4 傷害' : '格擋 · 減傷 4／回魔 1'}</button>)}</div>}
    </section>}
    {state.phase === 'failed' && <section className="ending" role="status"><h2>研究尚未成功</h2><p>可以回到章節基線，重新分配殘頁。撤離將放棄本場收益並建立新的基線。</p>
      <div className="controls"><button onClick={() => send({ type: 'retry' })}>依章節基線重來</button>
      <button disabled={!state.position.escape || node?.boss} onClick={() => send({ type: 'escape' })}>付代價撤離</button></div>
      {node?.boss && <p>首領不能撤離。</p>}</section>}
    {state.phase === 'complete' && <section className="ending" role="status"><h2>切片完成</h2><p>你通過了兩場考驗。完整遠征、正式存檔與離線驗收仍在後續階段。</p></section>}
    <section aria-label="法術書"><div className="section-title"><h2>你的法術書</h2><span>三個法術 · 每個最多五行</span></div>
      {state.position.book.map((spell, i) => {
        const ids = spell.filter(Boolean), turns = castTurns(ids.length), prediction = info ? forecast(info, i) : null;
        const links = evaluate(effectContext, ids).trace.links;
        const addedLinks = evaluate(effectContext, arrange(ids)).trace.links.length - links.length;
        return <article className="spell" key={i}><div className="section-title"><h3>法術 {i + 1} <small>{ids.length} 行／{ids.length} 魔力</small></h3>
          <button disabled={state.phase !== 'research'} onClick={() => send({ type: 'arrange', spell: i })}>整理法術 {i + 1} · 新增 {addedLinks} 條連線</button></div>
          <div className="slots">{spell.map((id, slot) => <button key={slot} className={id && id === selected ? 'selected' : ''}
            disabled={state.phase !== 'research'} aria-label={`法術 ${i + 1} 第 ${slot + 1} 格：${id ? FRAGMENTS[id].name : '空格'}`}
            onClick={() => id ? setSelected(id) : selected && send({ type: 'move', fragment: selected, spell: i, slot })}>
            <small>{slot + 1}</small>{id ? <><b style={{ color: COMPONENTS[FRAGMENTS[id].component].color }}>{COMPONENTS[FRAGMENTS[id].component].symbol}</b><span>{FRAGMENTS[id].name}</span></> : <span>＋</span>}
          </button>)}</div>
          <p>{!ids.length ? '加入殘頁後即可施放。' : turns ? `詠唱 ${turns} 回合，最後一回合敵方行動後完成。` : '即時施放，敵人存活才反擊。'}</p>
          {links.map(link => <p key={link.fragment}>□ 降甲 {link.armorBreak} → △ {FRAGMENTS[link.fragment].name} 傷害 +{link.bonus}</p>)}
          {info && !info.casting && <><p>{prediction ? (prediction.trace
            ? `預計傷害 ${prediction.trace.damage} · 反傷扣血 ${prediction.trace.reflectedHp} · 結算後生命 ${prediction.state.hero.hp}`
            : '這次詠唱會被打斷或在完成前死亡。')
            : canCast(info, i) ? '先預覽完整意圖，再承諾施法。' : '魔力不足，或緘默禁止長詠唱。'}</p>
            <div className="controls"><button disabled={!canCast(info, i) || Math.max(1, turns) <= info.known.length} onClick={() => send({ type: 'preview', spell: i })}>預覽法術 {i + 1}</button>
            <button disabled={!prediction} onClick={() => send({ type: 'fight', action: { type: 'cast', spell: i } })}>施放法術 {i + 1}</button></div></>}
        </article>;
      })}
    </section>
    <section aria-label="持有殘頁"><h2>全部殘頁</h2><p>同一張殘頁只能屬於一個法術。選取後點空格，會直接從原位置移過去。</p>
      <div className="fragments">{state.position.inventory.map(id => {
        const owner = state.position.book.findIndex(spell => spell.includes(id));
        return <button key={id} className={selected === id ? 'selected' : ''} disabled={state.phase !== 'research'} onClick={() => setSelected(id)}>
          <strong>{COMPONENTS[FRAGMENTS[id].component].symbol} {FRAGMENTS[id].name}</strong><span>{effectText(id)}</span><small>{owner < 0 ? '未配置' : `法術 ${owner + 1}`}</small></button>;
      })}</div>
    </section>
    <p className="feedback" role="status">{selected ? `已選取「${FRAGMENTS[selected].name}」，請點法術空格。` : message}</p>
    {state.phase === 'research' && <div className="controls"><button onClick={() => example('knight')}>套用騎士研究示例</button><button onClick={() => example('crocodile')}>套用龍鱷研究示例</button><button className="primary" onClick={() => send({ type: 'enter' })}>進入{ENEMIES[node.enemy].name}</button></div>}
    <footer><button onClick={() => send({ type: 'restart' })}>全部重來 · 保留見聞</button><p>固定種子 0 · 法術研究實驗 v1</p></footer>
  </main>;
}
