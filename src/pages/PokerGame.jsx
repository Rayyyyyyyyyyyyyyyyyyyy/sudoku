import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import PokerCard from '../components/PokerCard';
import '../components/pokerCollection.css';
import { POKER_RULES, modifierById, opponentById, packById, specialRuleById } from '../data/poker/compatibility';
import { sortCardsForDisplay } from '../lib/poker/cards';
import { rerollCost, shopOfferCost } from '../lib/poker/economy';
import { handLabel } from '../lib/poker/evaluate';
import { loadPokerSnapshot } from '../lib/poker/persistence';
import { presentScoreTrace, rarityLabel, scoreFrameForBeat, specialRuleDescription } from '../lib/poker/presentation';
import { actionAvailability, currentRound, projectedHand, roundSettlementPreview } from '../lib/poker/run';
import { usePokerPresentation } from '../lib/poker/usePokerPresentation';
import { usePokerRun } from '../lib/poker/usePokerRun';

const ROUND_LABELS = { small: '小型回合', big: '大型回合', special: '特殊回合' };
const CHAPTER_TRANSITION_MS = 1200;

function transitionForPhase(state, round) {
  switch (state.phase) {
    case 'round-intro': return { eyebrow: `STAGE ${state.stageIndex + 1} · ROUND ${state.roundIndex + 1}`, title: ROUND_LABELS[round.type], detail: `目標 ${round.target.toLocaleString()} 分`, mark: '♠' };
    case 'run-won': return { eyebrow: 'RUN COMPLETE', title: '牌局完成', detail: `${state.totalScore.toLocaleString()} 分`, mark: '◆' };
    case 'run-lost': return { eyebrow: 'RUN ENDED', title: '本局結束', detail: `${state.totalScore.toLocaleString()} 分`, mark: '◇' };
    default: return null;
  }
}

function ChapterTransition({ transition, onSkip, skipRef }) {
  if (!transition) return null;
  return <div
    className="pkr-chapter-transition"
    role="dialog"
    aria-modal="true"
    aria-labelledby="pkr-chapter-transition-title"
    onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onSkip();
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        skipRef.current?.focus();
      }
    }}
    key={transition.key}
  >
    <div className="pkr-chapter-transition__card">
      <i aria-hidden="true">{transition.mark}</i>
      <span>{transition.eyebrow}</span>
      <strong id="pkr-chapter-transition-title">{transition.title}</strong>
      <small>{transition.detail}</small>
      <button ref={skipRef} type="button" onClick={onSkip}>略過過場</button>
    </div>
  </div>;
}

function ModifierStrip({ state, dispatch, shop = false, triggeredModifierIds = [] }) {
  if (state.modifiers.length === 0) return <p className="pkr-empty">{shop ? '尚無效果牌，可從上方商品取得。' : '尚無效果牌，通過回合後可在商店取得。'}</p>;
  return <div className="pkr-modifiers">{state.modifiers.map((owned, index) => {
    const item = modifierById(owned.catalogId);
    const triggered = triggeredModifierIds.includes(owned.instanceId);
    return <article className={`pkr-mod ${triggered ? 'is-triggered' : ''}`} key={owned.instanceId} data-instance-id={owned.instanceId}>
      <header><span>{index + 1}</span><b>{item.display.name}</b>{triggered && <em>觸發</em>}</header>
      <p>{item.display.description}</p>
      {Object.keys(owned.counters).length > 0 && <p>目前計數：{Object.entries(owned.counters).map(([key, value]) => `${key} ${value}`).join(' · ')}</p>}
      <div className="pkr-inline-actions">
        <button type="button" disabled={index === 0} aria-label={`將 ${item.display.name} 左移`} onClick={() => dispatch({ type: 'MOVE_MODIFIER', instanceId: owned.instanceId, direction: -1, now: Date.now() })}>← 左移</button>
        <button type="button" disabled={index === state.modifiers.length - 1} aria-label={`將 ${item.display.name} 右移`} onClick={() => dispatch({ type: 'MOVE_MODIFIER', instanceId: owned.instanceId, direction: 1, now: Date.now() })}>右移 →</button>
        {shop && <button type="button" onClick={() => dispatch({ type: 'SELL_MODIFIER', instanceId: owned.instanceId, transactionId: `sell-${owned.instanceId}`, now: Date.now() })}>出售 +{item.saleValue}</button>}
      </div>
    </article>;
  })}</div>;
}

function ScoreTrace({ trace, cards }) {
  const total = [...trace].reverse().find((event) => event.type === 'hand-total');
  const rows = presentScoreTrace(trace, { cards });
  return <details className="pkr-sheet"><summary>查看計分明細{total ? ` · ${total.chips} 籌碼 × ${total.mult} 倍率` : ''}</summary><ol className="pkr-trace">{rows.map((row) => <li key={row.id}><span className="pkr-trace__copy"><b>{row.title}</b>{row.detail && <small>{row.detail}</small>}</span>{row.value && <strong>{row.value}</strong>}</li>)}</ol></details>;
}

function PokerCardRail({ cards, label, className = '', contributingIds = [], scoringCardId = null }) {
  return <ul className={`pkr-card-rail ${className}`} aria-label={label}>{cards.map((card, index) => <PokerCard key={card.instanceId} card={card} contributing={contributingIds.includes(card.instanceId)} scoring={card.instanceId === scoringCardId} presentationIndex={index} interactive={false} />)}</ul>;
}

function DiscardCue({ cue, cards }) {
  if (!cue) return null;
  const outgoing = cue.cardIds.map((id) => cards.find((card) => card.instanceId === id)).filter(Boolean);
  return <aside className="pkr-discard-cue" role="status" aria-label={`已棄掉 ${cue.cardIds.length} 張牌，補 ${cue.drawnCardIds.length} 張`}>
    <span>棄 {cue.cardIds.length} 張</span>
    <ul className="pkr-card-rail pkr-card-rail--discard" aria-hidden="true">{outgoing.map((card, index) => <PokerCard key={card.instanceId} card={card} presentationIndex={index} interactive={false} />)}</ul>
    <strong>{cue.drawnCardIds.length ? `補 ${cue.drawnCardIds.length} 張` : '牌庫已空，未補牌'}</strong>
  </aside>;
}

function TargetProgress({ progress, animated = false }) {
  if (!progress) return null;
  const width = animated ? progress.endPercent : progress.startPercent;
  return <section className={`pkr-target-progress ${progress.crossedTarget ? 'is-crossed' : ''}`} aria-label="回合目標進度">
    <div className="pkr-target-progress__copy"><span>出牌前 {progress.before.toLocaleString()}</span><strong>{progress.committed.toLocaleString()} / {progress.target.toLocaleString()}</strong></div>
    <div className="pkr-target-progress__track" role="progressbar" aria-valuemin="0" aria-valuemax={progress.target} aria-valuenow={Math.min(progress.committed, progress.target)}><i style={{ width: `${width}%` }} /></div>
    {progress.crossedTarget && animated && <b>目標突破{progress.excess > 0 ? ` · 超出 ${progress.excess.toLocaleString()} 分` : ''}</b>}
  </section>;
}

function ScoreStage({ state, presentation }) {
  const pending = state.pendingResolution;
  const allCards = Object.values(state.zones).flat();
  const playedCards = (pending.playedCardIds || []).map((id) => allCards.find((card) => card.instanceId === id)).filter(Boolean);
  const total = [...state.trace].reverse().find((event) => event.type === 'hand-total');
  const frame = scoreFrameForBeat(state.trace, presentation.scoreBeats, presentation.activeBeatIndex);
  const complete = presentation.reducedMotion || frame.complete;
  const chips = presentation.reducedMotion ? total?.chips : frame.chips;
  const mult = presentation.reducedMotion ? total?.mult : frame.mult;
  return <section className="pkr-score-stage" aria-labelledby="pkr-score-stage-title">
    <header><span>本手計分</span><h2 id="pkr-score-stage-title">{handLabel(pending.handType)}</h2></header>
    <PokerCardRail cards={playedCards} label="本手打出的牌" className="pkr-card-rail--scoring" scoringCardId={frame.source} />
    <ol className="pkr-score-beats" aria-label="主要計分效果">{presentation.scoreBeats.map((beat, index) => {
      const row = beat.type === 'overflow-summary' ? beat : presentScoreTrace([beat], { cards: allCards })[0];
      const revealed = presentation.reducedMotion || index <= presentation.activeBeatIndex;
      const active = index === presentation.activeBeatIndex;
      return <li key={`${beat.type}-${beat.originalIndex ?? index}`} className={`${revealed ? 'is-revealed' : ''} ${active ? 'is-active' : ''}`} style={{ '--pkr-beat-index': index }}>
        <span>{row.title}</span>{row.detail && <small>{row.detail}</small>}
        {beat.copySourceInstanceId && <em>由左側複製效果牌觸發</em>}
      </li>;
    })}</ol>
    {total && <div className={`pkr-equation ${complete ? 'is-complete' : ''}`}>
      <span>{complete ? '最終計算' : '計分中'}</span>
      <strong><em key={`chips-${chips}`} className="pkr-count pkr-count--chips">{(chips ?? 0).toLocaleString()}</em> 籌碼 × <em key={`mult-${mult}`} className="pkr-count pkr-count--mult">{(mult ?? 0).toLocaleString()}</em> 倍率</strong>
      <b key={complete ? 'total' : 'counting'}>{complete ? `+${pending.score.toLocaleString()} 分` : '⋯'}</b>
    </div>}
    <TargetProgress progress={presentation.targetProgress} animated={complete} />
    <button className="pkr-btn pkr-btn--ghost pkr-skip" type="button" onClick={presentation.skipResolution}>略過動畫</button>
  </section>;
}

function SettlementStage({ state, preview, onSettle }) {
  const round = currentRound(state);
  const excess = Math.max(0, state.roundScore - round.target);
  const cta = preview.isFinal ? `收下 ${preview.total} 幣，完成本局` : `帶著 ${preview.total} 幣前往補給站`;
  return <section className="pkr-reward-stage" aria-labelledby="pkr-reward-title">
    <span>目標達成</span>
    <h2 id="pkr-reward-title">{state.roundScore.toLocaleString()} 分</h2>
    <p>{round.target.toLocaleString()} 分目標已突破{excess ? `，超出 ${excess.toLocaleString()} 分` : ''}</p>
    <div className="pkr-reward-equation" aria-label="回合獎勵明細">
      <span><small>基本</small><b>{preview.base}</b></span><i>+</i>
      <span><small>剩餘出牌</small><b>{preview.remainingHands}</b></span><i>+</i>
      <span><small>利息</small><b>{preview.interest}</b></span><i>=</i>
      <span><small>本回合</small><b>{preview.total} 幣</b></span>
    </div>
    <p className="pkr-balance">目前 {preview.currentBalance} 幣 → 結算後 <strong>{preview.resultingBalance} 幣</strong></p>
    <button className="pkr-btn pkr-btn--primary pkr-settle-cta" type="button" onClick={onSettle}>{cta}</button>
  </section>;
}

function PokerStatus({ message }) {
  return <div className="pkr-live-status" role="status" aria-live="polite" aria-atomic="true">{message}</div>;
}

function PokerSaveNotice({ save }) {
  const savedRef = useRef(null);
  useEffect(() => {
    if (save.persisted && save.retried) savedRef.current?.focus({ preventScroll: true });
  }, [save.persisted, save.retried]);
  if (save.persisted) return save.retried ? <p ref={savedRef} tabIndex="-1" role="status">已保存</p> : null;
  return <div className="pkr-warning" role="alert"><strong>尚未保存</strong><p>目前牌局與待保存的成果仍保留在此頁。離開或重新載入可能失去尚未保存的內容。請重試保存。</p><button type="button" onClick={save.retry}>重試保存</button></div>;
}

function Shop({ state, dispatch, headingRef }) {
  const cost = rerollCost(state.offers.rerollCount);
  return <section className="pkr-shop"><header><span className="pkr-kicker">BETWEEN ROUNDS</span><h2 ref={headingRef} className="pkr-phase-anchor" tabIndex="-1">補給站</h2><p>持有 {state.coins} 幣 · 效果牌 {state.modifiers.length}/{POKER_RULES.modifierCapacity.value}</p>{state.settlement && <div className="pkr-settlement" aria-label="上回合獎勵結算"><span>上回合結算</span><strong>基本 {state.settlement.base} + 剩餘出牌 {state.settlement.remainingHands} + 利息 {state.settlement.interest} = {state.settlement.total} 幣</strong><small>結算後共 {state.settlement.coinsAfter} 幣</small></div>}</header><div className="pkr-offers">{state.offers.items.map((offer) => {
    const item = offer.type === 'modifier' ? modifierById(offer.itemId) : packById(offer.itemId);
    const offerCost = shopOfferCost(offer, state.completion.settledRoundIds.length);
    const full = offer.type === 'modifier' && state.modifiers.length >= POKER_RULES.modifierCapacity.value;
    const alreadyOwned = offer.type === 'modifier' && state.modifiers.some((owned) => owned.catalogId === offer.itemId);
    return <article key={offer.offerId} className="pkr-offer"><span>{offer.type === 'modifier' ? '效果牌' : '選擇包'}</span><h3>{item.display.name}</h3><p>{item.display.description}</p><button type="button" disabled={offer.purchased || alreadyOwned || state.coins < offerCost || full} onClick={() => dispatch({ type: 'BUY_OFFER', offerId: offer.offerId, transactionId: `buy-${offer.offerId}`, now: Date.now() })}>{offer.purchased ? '已取得' : alreadyOwned ? '已持有' : full ? '欄位已滿' : `${offerCost} 幣取得`}</button></article>;
  })}</div><ModifierStrip state={state} dispatch={dispatch} shop /><div className="pkr-shop__actions"><button type="button" disabled={state.coins < cost} onClick={() => dispatch({ type: 'REROLL_SHOP', transactionId: `reroll-${currentRound(state).id}-${state.offers.rerollCount}`, now: Date.now() })}>刷新 · {cost} 幣</button><button className="pkr-btn--primary" type="button" onClick={() => dispatch({ type: 'CONTINUE', now: Date.now() })}>下一回合 →</button></div></section>;
}

function Pack({ state, dispatch, headingRef }) {
  const pack = packById(state.packState.packId);
  const full = state.modifiers.length >= POKER_RULES.modifierCapacity.value;
  return <section className="pkr-pack">
    <span className="pkr-kicker">OPENED</span>
    <h2 ref={headingRef} className="pkr-phase-anchor" tabIndex="-1">{pack.display.name}</h2>
    <p>還可選 {state.packState.choicesRemaining} 張 · 欄位 {state.modifiers.length}/{POKER_RULES.modifierCapacity.value} · 持有 {state.coins} 幣</p>
    {full && <p>效果牌欄位已滿，可先在下方出售現有牌，再選取效果包中的新牌。</p>}
    <div className="pkr-offers">{state.packState.choices.map((choice) => {
      const item = modifierById(choice.itemId);
      const alreadyOwned = state.modifiers.some((owned) => owned.catalogId === choice.itemId);
      return <article className="pkr-offer" key={choice.choiceId}>
        <span>{rarityLabel(item.rarity)}</span><h3>{item.display.name}</h3><p>{item.display.description}</p>
        <button type="button" disabled={choice.taken || alreadyOwned || full} onClick={() => dispatch({ type: 'TAKE_PACK_CHOICE', choiceId: choice.choiceId, transactionId: `take-${choice.choiceId}`, now: Date.now() })}>{choice.taken ? '已選' : alreadyOwned ? '已持有' : full ? '欄位已滿' : '選這張'}</button>
      </article>;
    })}</div>
    <section aria-label="現有效果牌">
      <div className="pkr-section-title"><span>現有效果牌</span><small>可出售、調整順序</small></div>
      <ModifierStrip state={state} dispatch={dispatch} shop />
    </section>
    {state.packState.canSkip && <button className="pkr-btn pkr-btn--ghost" type="button" onClick={() => dispatch({ type: 'SKIP_PACK', now: Date.now() })}>略過並返回商店</button>}
  </section>;
}

export default function PokerGame() {
  const navigate = useNavigate();
  const loaded = useMemo(loadPokerSnapshot, []);
  if (loaded.status !== 'ok') return <Navigate to="/poker" replace />;
  return <ActivePokerGame initialState={loaded.state} navigate={navigate} />;
}

function ActivePokerGame({ initialState, navigate }) {
  const [state, dispatch, save] = usePokerRun(initialState);
  const newModifierIds = save.newModifierIds;
  const saveNotice = <PokerSaveNotice save={save} />;
  const leave = (path) => {
    if (save.persisted || confirm('目前進度尚未保存，離開會失去未保存的進度。確定離開？')) navigate(path);
  };
  const phaseHeadingRef = useRef(null);
  const handRootRef = useRef(null);
  const previousPhaseRef = useRef(null);
  const transitionSkipRef = useRef(null);
  const transitionWasVisibleRef = useRef(false);
  const [chapterTransition, setChapterTransition] = useState(null);
  const round = currentRound(state);
  const opponent = opponentById(state.opponentId);
  const rule = specialRuleById(round.specialRuleId);
  const preview = projectedHand(state);
  const availability = actionAvailability(state);
  const presentation = usePokerPresentation(state, round, dispatch);
  const settlementPreview = state.phase === 'round-won' ? roundSettlementPreview(state) : null;
  const allCards = Object.values(state.zones).flat();
  const sortedHand = useMemo(() => sortCardsForDisplay(state.zones.hand), [state.zones.hand]);

  useEffect(() => {
    const previous = previousPhaseRef.current;
    previousPhaseRef.current = state.phase;
    if (previous !== null && previous !== state.phase && !presentation.reducedMotion) {
      const chapter = transitionForPhase(state, round);
      if (chapter) setChapterTransition({ ...chapter, key: `${state.stageIndex}-${state.roundIndex}-${state.phase}` });
    }
    if (previous === state.phase || !['round-intro', 'shop', 'pack', 'run-lost', 'run-won'].includes(state.phase)) return;
    phaseHeadingRef.current?.focus({ preventScroll: true });
  }, [state.phase, state.stageIndex, state.roundIndex, presentation.reducedMotion]);

  useEffect(() => {
    if (!chapterTransition) {
      if (transitionWasVisibleRef.current) {
        transitionWasVisibleRef.current = false;
        phaseHeadingRef.current?.focus({ preventScroll: true });
      }
      return undefined;
    }
    transitionWasVisibleRef.current = true;
    transitionSkipRef.current?.focus({ preventScroll: true });
    const timeout = setTimeout(() => setChapterTransition(null), CHAPTER_TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [chapterTransition, state.phase]);

  useEffect(() => {
    if (presentation.reducedMotion) setChapterTransition(null);
  }, [presentation.reducedMotion]);

  useEffect(() => {
    if (!presentation.focusAfterSkip || state.phase !== 'selecting') return;
    const target = handRootRef.current?.querySelector('button:not([disabled])') || document.querySelector('.pkr-controls button:not([disabled])');
    target?.focus({ preventScroll: true });
    presentation.acknowledgeSkipFocus();
  }, [presentation, state.phase]);

  const settleRound = () => dispatch({ type: 'SETTLE_ROUND', now: Date.now() });
  const phaseStatus = presentation.statusMessage
    || (state.phase === 'round-won' ? `目標達成，目前 ${state.roundScore.toLocaleString()} 分，結算可獲得 ${settlementPreview.total} 幣` : '')
    || (state.phase === 'run-lost' ? '本局結束' : state.phase === 'run-won' ? '牌局完成' : '');
  const actionFeedback = state.selection.length === 0
    ? '請先選擇 1–5 張牌。'
    : !availability.canPlay
      ? availability.playReason
      : !availability.canDiscard
        ? availability.discardReason
        : '可點選牌面切換選取；參與目前牌型的牌會標記「計分」。';
  const collectionNotice = newModifierIds.length > 0 && <aside className="pkr-collection-notice" role="status">
    <strong>圖鑑新增：{newModifierIds.map((id) => modifierById(id).display.name).join('、')}</strong>
    <span>這次發現已收藏，落敗或賣出也會保留。</span>
  </aside>;
  const chapterCue = <ChapterTransition transition={chapterTransition} onSkip={() => setChapterTransition(null)} skipRef={transitionSkipRef} />;

  if (state.phase === 'shop') return <main className="pkr-game">{chapterCue}<TopNav navigate={leave} />{saveNotice}{collectionNotice}<PokerStatus message={phaseStatus} /><Shop state={state} dispatch={dispatch} headingRef={phaseHeadingRef} /></main>;
  if (state.phase === 'pack') return <main className="pkr-game">{chapterCue}<TopNav navigate={leave} />{saveNotice}{collectionNotice}<PokerStatus message={phaseStatus} /><Pack state={state} dispatch={dispatch} headingRef={phaseHeadingRef} /></main>;
  if (['run-won', 'run-lost'].includes(state.phase)) {
    const lost = state.phase === 'run-lost';
    const shortfall = Math.max(0, round.target - state.roundScore);
    return <main className="pkr-game">{chapterCue}<TopNav navigate={leave} />{saveNotice}<PokerStatus message={phaseStatus} /><section className="pkr-terminal"><span aria-hidden="true">{lost ? '◇' : '◆'}</span><h1 ref={phaseHeadingRef} className="pkr-phase-anchor" tabIndex="-1">{lost ? '本局結束' : '牌局完成'}</h1>{lost ? <><p>第 {state.stageIndex + 1} 階 · {ROUND_LABELS[round.type]}</p><div className="pkr-terminal__result"><strong>{state.roundScore.toLocaleString()} / {round.target.toLocaleString()}</strong><span>還差 {shortfall.toLocaleString()} 分</span></div></> : <p>你完成了三階九回合。</p>}<strong>{state.totalScore.toLocaleString()}</strong><small>累計分數 · {state.coins} 幣</small><button className="pkr-btn pkr-btn--primary" type="button" onClick={() => leave('/poker')}>查看紀錄</button></section></main>;
  }

  return <main className={`pkr-game ${presentation.reducedMotion ? 'is-reduced-motion' : ''}`}>
    {chapterCue}
    <TopNav navigate={leave} />
    {saveNotice}
    {collectionNotice}
    <PokerStatus message={phaseStatus} />
    <header className="pkr-round-head">
      <div><span className="pkr-kicker">{opponent.display.name} · STAGE {state.stageIndex + 1}/{opponent.stages.length}</span><h1 ref={state.phase === 'round-intro' ? phaseHeadingRef : null} className="pkr-phase-anchor" tabIndex="-1">{ROUND_LABELS[round.type]}</h1><p>{rule ? `${rule.display.name}：${specialRuleDescription(rule.id)}` : '標準規則：選擇 1–5 張牌出牌或棄牌，達到目標分數即可過關。'}</p></div>
      <div className="pkr-score"><span>目前 / 目標</span><strong>{state.roundScore.toLocaleString()} <i>/</i> {round.target.toLocaleString()}</strong></div>
    </header>
    <section className="pkr-metrics" aria-label="牌局狀態"><span><b>{state.coins}</b>幣</span><span className={presentation.discardCue ? 'is-drawing' : ''}><b>{state.zones.drawPile.length}</b>牌庫{presentation.discardCue && <small>補 {presentation.discardCue.drawnCardIds.length} 張</small>}</span><span><b>{state.actions.hands}</b>出牌</span><span><b>{state.actions.discards}</b>棄牌</span></section>
    <section className="pkr-table" aria-label="撲克牌桌">
      <div className="pkr-section-title"><span>效果順序</span><small>由左至右</small></div>
      <ModifierStrip state={state} dispatch={dispatch} triggeredModifierIds={presentation.triggeredModifierIds} />
      {state.phase === 'round-intro' && <div className="pkr-intro"><span>{rule ? '特殊規則已啟用' : '準備完成'}</span><h2>{round.target.toLocaleString()} 分達標</h2><p>基本獎勵 {round.reward} 幣；剩餘出牌與利息在回合結算。</p><button className="pkr-btn pkr-btn--primary" type="button" onClick={() => dispatch({ type: 'BEGIN_ROUND', now: Date.now() })}>開始回合</button></div>}
      {state.phase === 'resolving' && <ScoreStage state={state} presentation={presentation} />}
      {state.phase === 'round-won' && <SettlementStage state={state} preview={settlementPreview} onSettle={settleRound} />}
      {state.phase === 'selecting' && <>
        <div className="pkr-discard-slot"><DiscardCue cue={presentation.discardCue} cards={allCards} /></div>
        <div className="pkr-preview" aria-live="polite"><span>{state.selection.length} 張已選</span><strong>{preview?.label || '選擇 1–5 張'}</strong></div>
        <div className="pkr-hand" ref={handRootRef}>{sortedHand.map((card, index) => <PokerCard key={card.instanceId} card={card} selected={state.selection.includes(card.instanceId)} contributing={preview?.contributingIds.includes(card.instanceId)} fresh={presentation.freshCardIds.includes(card.instanceId)} presentationIndex={index} onToggle={(cardId) => dispatch({ type: 'TOGGLE_CARD', cardId, now: Date.now() })} />)}</div>
        <div className="pkr-controls"><button className="pkr-btn pkr-btn--primary" type="button" disabled={!availability.canPlay} aria-describedby="pkr-action-feedback" onClick={() => dispatch({ type: 'PLAY', now: Date.now() })}>出牌 · {state.actions.hands}</button><button className="pkr-btn pkr-btn--ghost" type="button" disabled={!availability.canDiscard} aria-describedby="pkr-action-feedback" onClick={() => dispatch({ type: 'DISCARD', now: Date.now() })}>棄牌 · {state.actions.discards}</button></div>
        <p className="pkr-feedback" id="pkr-action-feedback">{actionFeedback}</p>
      </>}
    </section>
    {state.trace.length > 0 && <ScoreTrace trace={state.trace} cards={allCards} />}
    <details className="pkr-sheet"><summary>牌型、牌面與牌庫說明</summary><p>牌庫共 52 張；目前抽牌堆 {state.zones.drawPile.length}、手牌 {state.zones.hand.length}、已出 {state.zones.played.length}、已棄 {state.zones.discarded.length}。</p><p>所選牌：{state.zones.hand.filter((card) => state.selection.includes(card.instanceId)).map((card) => `${card.rank}/${card.suit}`).join('、') || '無'}。高牌、一對、兩對、三條、順子、同花、葫蘆、四條、同花順皆可計分。</p></details>
  </main>;
}

function TopNav({ navigate }) {
  return <nav className="pkr-nav"><button type="button" onClick={() => navigate('/poker')}>← 牌局首頁</button><button type="button" onClick={() => navigate('/')}>遊戲櫃</button></nav>;
}
