import { useEffect, useMemo, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import PokerCard from '../components/PokerCard';
import { POKER_RULES, modifierById, opponentById, packById, specialRuleById } from '../data/poker/compatibility';
import { rerollCost } from '../lib/poker/economy';
import { handLabel } from '../lib/poker/evaluate';
import { loadPokerSnapshot } from '../lib/poker/persistence';
import { presentScoreTrace, rarityLabel, specialRuleDescription } from '../lib/poker/presentation';
import { actionAvailability, currentRound, projectedHand } from '../lib/poker/run';
import { usePokerRun } from '../lib/poker/usePokerRun';

const ROUND_LABELS = { small: '小型回合', big: '大型回合', special: '特殊回合' };

function ModifierStrip({ state, dispatch, shop = false }) {
  if (state.modifiers.length === 0) return <p className="pkr-empty">{shop ? '尚無效果牌，可從上方商品取得。' : '尚無效果牌，通過回合後可在商店取得。'}</p>;
  return <div className="pkr-modifiers">{state.modifiers.map((owned, index) => {
    const item = modifierById(owned.catalogId);
    return <details className="pkr-mod" key={owned.instanceId}><summary><span>{index + 1}</span><b>{item.display.name}</b></summary><p>{item.display.description}</p>{Object.keys(owned.counters).length > 0 && <p>目前計數：{Object.entries(owned.counters).map(([key, value]) => `${key} ${value}`).join(' · ')}</p>}<div className="pkr-inline-actions"><button type="button" disabled={index === 0} aria-label={`將 ${item.display.name} 左移`} onClick={() => dispatch({ type: 'MOVE_MODIFIER', instanceId: owned.instanceId, direction: -1, now: Date.now() })}>← 左移</button><button type="button" disabled={index === state.modifiers.length - 1} aria-label={`將 ${item.display.name} 右移`} onClick={() => dispatch({ type: 'MOVE_MODIFIER', instanceId: owned.instanceId, direction: 1, now: Date.now() })}>右移 →</button>{shop && <button type="button" onClick={() => dispatch({ type: 'SELL_MODIFIER', instanceId: owned.instanceId, transactionId: `sell-${owned.instanceId}`, now: Date.now() })}>出售 +{item.saleValue}</button>}</div></details>;
  })}</div>;
}

function ScoreTrace({ trace, cards }) {
  const total = [...trace].reverse().find((event) => event.type === 'hand-total');
  const rows = presentScoreTrace(trace, { cards });
  return <details className="pkr-sheet"><summary>查看計分明細{total ? ` · ${total.chips} 籌碼 × ${total.mult} 倍率` : ''}</summary><ol className="pkr-trace">{rows.map((row) => <li key={row.id}><span className="pkr-trace__copy"><b>{row.title}</b>{row.detail && <small>{row.detail}</small>}</span>{row.value && <strong>{row.value}</strong>}</li>)}</ol></details>;
}

function Shop({ state, dispatch, headingRef }) {
  const cost = rerollCost(state.offers.rerollCount);
  return <section className="pkr-shop"><header><span className="pkr-kicker">BETWEEN ROUNDS</span><h2 ref={headingRef} className="pkr-phase-anchor" tabIndex="-1">補給站</h2><p>持有 {state.coins} 幣 · 效果牌 {state.modifiers.length}/{POKER_RULES.modifierCapacity.value}</p>{state.settlement && <div className="pkr-settlement" aria-label="上回合獎勵結算"><span>上回合結算</span><strong>基本 {state.settlement.base} + 剩餘出牌 {state.settlement.remainingHands} + 利息 {state.settlement.interest} = {state.settlement.total} 幣</strong><small>結算後共 {state.settlement.coinsAfter} 幣</small></div>}</header><div className="pkr-offers">{state.offers.items.map((offer) => {
    const item = offer.type === 'modifier' ? modifierById(offer.itemId) : packById(offer.itemId);
    const full = offer.type === 'modifier' && state.modifiers.length >= POKER_RULES.modifierCapacity.value;
    return <article key={offer.offerId} className="pkr-offer"><span>{offer.type === 'modifier' ? '效果牌' : '選擇包'}</span><h3>{item.display.name}</h3><p>{item.display.description}</p><button type="button" disabled={offer.purchased || state.coins < offer.cost || full} onClick={() => dispatch({ type: 'BUY_OFFER', offerId: offer.offerId, transactionId: `buy-${offer.offerId}`, now: Date.now() })}>{offer.purchased ? '已取得' : full ? '欄位已滿' : `${offer.cost} 幣取得`}</button></article>;
  })}</div><ModifierStrip state={state} dispatch={dispatch} shop /><div className="pkr-shop__actions"><button type="button" disabled={state.coins < cost} onClick={() => dispatch({ type: 'REROLL_SHOP', transactionId: `reroll-${currentRound(state).id}-${state.offers.rerollCount}`, now: Date.now() })}>刷新 · {cost} 幣</button><button className="pkr-btn--primary" type="button" onClick={() => dispatch({ type: 'CONTINUE', now: Date.now() })}>下一回合 →</button></div></section>;
}

function Pack({ state, dispatch, headingRef }) {
  const pack = packById(state.packState.packId);
  return <section className="pkr-pack"><span className="pkr-kicker">OPENED</span><h2 ref={headingRef} className="pkr-phase-anchor" tabIndex="-1">{pack.display.name}</h2><p>還可選 {state.packState.choicesRemaining} 張 · 欄位 {state.modifiers.length}/{POKER_RULES.modifierCapacity.value}</p><div className="pkr-offers">{state.packState.choices.map((choice) => { const item = modifierById(choice.itemId); return <article className="pkr-offer" key={choice.choiceId}><span>{rarityLabel(item.rarity)}</span><h3>{item.display.name}</h3><p>{item.display.description}</p><button type="button" disabled={choice.taken || state.modifiers.length >= POKER_RULES.modifierCapacity.value} onClick={() => dispatch({ type: 'TAKE_PACK_CHOICE', choiceId: choice.choiceId, transactionId: `take-${choice.choiceId}`, now: Date.now() })}>{choice.taken ? '已選' : '選這張'}</button></article>; })}</div>{state.packState.canSkip && <button className="pkr-btn pkr-btn--ghost" type="button" onClick={() => dispatch({ type: 'SKIP_PACK', now: Date.now() })}>略過並返回商店</button>}</section>;
}

export default function PokerGame() {
  const navigate = useNavigate();
  const loaded = useMemo(loadPokerSnapshot, []);
  if (loaded.status !== 'ok') return <Navigate to="/poker" replace />;
  return <ActivePokerGame initialState={loaded.state} navigate={navigate} />;
}

function ActivePokerGame({ initialState, navigate }) {
  const [state, dispatch] = usePokerRun(initialState);
  const phaseHeadingRef = useRef(null);
  const phaseRootRef = useRef(null);
  const round = currentRound(state);
  const opponent = opponentById(state.opponentId);
  const rule = specialRuleById(round.specialRuleId);
  const preview = projectedHand(state);
  const availability = actionAvailability(state);

  useEffect(() => {
    const heading = phaseHeadingRef.current;
    const root = phaseRootRef.current;
    if (!heading || !root) return;
    heading.focus({ preventScroll: true });
    root.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [state.phase, state.stageIndex, state.roundIndex]);

  if (state.phase === 'shop') return <main ref={phaseRootRef} className="pkr-game"><TopNav navigate={navigate} /><Shop state={state} dispatch={dispatch} headingRef={phaseHeadingRef} /></main>;
  if (state.phase === 'pack') return <main ref={phaseRootRef} className="pkr-game"><TopNav navigate={navigate} /><Pack state={state} dispatch={dispatch} headingRef={phaseHeadingRef} /></main>;
  if (['run-won', 'run-lost'].includes(state.phase)) {
    const lost = state.phase === 'run-lost';
    const shortfall = Math.max(0, round.target - state.roundScore);
    return <main ref={phaseRootRef} className="pkr-game"><TopNav navigate={navigate} /><section className="pkr-terminal"><span aria-hidden="true">{lost ? '◇' : '◆'}</span><h1 ref={phaseHeadingRef} className="pkr-phase-anchor" tabIndex="-1">{lost ? '本局結束' : '牌局完成'}</h1>{lost ? <><p>第 {state.stageIndex + 1} 階 · {ROUND_LABELS[round.type]}</p><div className="pkr-terminal__result"><strong>{state.roundScore.toLocaleString()} / {round.target.toLocaleString()}</strong><span>還差 {shortfall.toLocaleString()} 分</span></div></> : <p>你完成了三階九回合。</p>}<strong>{state.totalScore.toLocaleString()}</strong><small>累計分數 · {state.coins} 幣</small><button className="pkr-btn pkr-btn--primary" type="button" onClick={() => navigate('/poker')}>查看紀錄</button></section></main>;
  }

  return (
    <main ref={phaseRootRef} className="pkr-game">
      <TopNav navigate={navigate} />
      <header className="pkr-round-head">
        <div><span className="pkr-kicker">{opponent.display.name} · STAGE {state.stageIndex + 1}/{opponent.stages.length}</span><h1 ref={['round-intro', 'selecting'].includes(state.phase) ? phaseHeadingRef : null} className="pkr-phase-anchor" tabIndex="-1">{ROUND_LABELS[round.type]}</h1><p>{rule ? `${rule.display.name}：${specialRuleDescription(rule.id)}` : '標準規則：選擇 1–5 張牌出牌或棄牌，達到目標分數即可過關。'}</p></div>
        <div className="pkr-score"><span>目前 / 目標</span><strong>{state.roundScore.toLocaleString()} <i>/</i> {round.target.toLocaleString()}</strong></div>
      </header>
      <section className="pkr-metrics" aria-label="牌局狀態"><span><b>{state.coins}</b>幣</span><span><b>{state.zones.drawPile.length}</b>牌庫</span><span><b>{state.actions.hands}</b>出牌</span><span><b>{state.actions.discards}</b>棄牌</span></section>
      <section className="pkr-table" aria-label="目前手牌">
        <div className="pkr-section-title"><span>效果順序</span><small>由左至右</small></div><ModifierStrip state={state} dispatch={dispatch} />
        {state.phase === 'round-intro' ? <div className="pkr-intro"><span>{round.type === 'special' ? '特殊規則已啟用' : '準備完成'}</span><h2>{round.target.toLocaleString()} 分達標</h2><p>基本獎勵 {round.reward} 幣；剩餘出牌與利息在回合結算。</p><button className="pkr-btn pkr-btn--primary" type="button" onClick={() => dispatch({ type: 'BEGIN_ROUND', now: Date.now() })}>開始回合</button></div> : state.phase === 'resolving' ? <div className="pkr-intro"><span>計分完成</span><h2 ref={phaseHeadingRef} className="pkr-phase-anchor" tabIndex="-1">+{state.pendingResolution.score.toLocaleString()}</h2><p>{handLabel(state.pendingResolution.handType)} · 詳細籌碼 × 倍率見下方計分明細。</p><button className="pkr-btn pkr-btn--primary" type="button" onClick={() => dispatch({ type: 'FINISH_RESOLUTION', now: Date.now() })}>完成計分</button></div> : state.phase === 'round-won' ? <div className="pkr-intro"><span>目標達成</span><h2 ref={phaseHeadingRef} className="pkr-phase-anchor" tabIndex="-1">{state.roundScore.toLocaleString()} 分</h2><button className="pkr-btn pkr-btn--primary" type="button" onClick={() => dispatch({ type: 'SETTLE_ROUND', now: Date.now() })}>領取獎勵</button></div> : <><div className="pkr-preview" aria-live="polite"><span>{state.selection.length} 張已選</span><strong>{preview?.label || '選擇 1–5 張'}</strong></div><div className="pkr-hand">{state.zones.hand.map((card) => <PokerCard key={card.instanceId} card={card} selected={state.selection.includes(card.instanceId)} contributing={preview?.contributingIds.includes(card.instanceId)} onToggle={(cardId) => dispatch({ type: 'TOGGLE_CARD', cardId, now: Date.now() })} />)}</div><div className="pkr-controls"><button className="pkr-btn pkr-btn--primary" type="button" disabled={!availability.canPlay} onClick={() => dispatch({ type: 'PLAY', now: Date.now() })}>出牌 · {state.actions.hands}</button><button className="pkr-btn pkr-btn--ghost" type="button" disabled={!availability.canDiscard} onClick={() => dispatch({ type: 'DISCARD', now: Date.now() })}>棄牌 · {state.actions.discards}</button></div><p className="pkr-feedback" role="status">{!availability.canPlay && state.selection.length ? availability.playReason : '可點選牌面切換選取；參與目前牌型的牌會標記「計分」。'}</p></>}
      </section>
      {state.trace.length > 0 && <ScoreTrace trace={state.trace} cards={Object.values(state.zones).flat()} />}
      <details className="pkr-sheet"><summary>牌型、牌面與牌庫說明</summary><p>牌庫共 52 張；目前抽牌堆 {state.zones.drawPile.length}、手牌 {state.zones.hand.length}、已出 {state.zones.played.length}、已棄 {state.zones.discarded.length}。</p><p>所選牌：{state.zones.hand.filter((card) => state.selection.includes(card.instanceId)).map((card) => `${card.rank}/${card.suit}`).join('、') || '無'}。高牌、一對、兩對、三條、順子、同花、葫蘆、四條、同花順皆可計分。</p></details>
    </main>
  );
}

function TopNav({ navigate }) {
  return <nav className="pkr-nav"><button type="button" onClick={() => navigate('/poker')}>← 牌局首頁</button><button type="button" onClick={() => navigate('/')}>遊戲櫃</button></nav>;
}
