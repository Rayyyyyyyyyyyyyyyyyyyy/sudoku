import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DISCARD_CUE_DURATION_MS,
  FRESH_CARD_DURATION_MS,
  deriveTargetProgress,
  scoreSequenceDuration,
  selectMajorScoreBeats
} from './presentation.js';
import { handLabel } from './evaluate.js';

export const EMPTY_POKER_PRESENTATION = Object.freeze({
  discardCue: null,
  freshCardIds: [],
  scoreBeats: [],
  activeBeatIndex: -1,
  triggeredModifierIds: [],
  targetProgress: null,
  pendingDrawnCardIds: [],
  focusAfterSkip: false,
  statusMessage: ''
});

export function committedPresentationKey(state) {
  return `${state.timers?.lastCommittedAt ?? 0}:${state.lastAction || 'loaded'}:${state.phase}`;
}

export function completeResolutionOnce(completedKeys, key) {
  const nextKeys = new Set(completedKeys || []);
  if (nextKeys.has(key)) return { accepted: false, completedKeys: nextKeys };
  nextKeys.add(key);
  return { accepted: true, completedKeys: nextKeys };
}

function modifierIdsForBeat(beat) {
  return [beat?.sourceInstanceId, beat?.copySourceInstanceId].filter(Boolean);
}

export function presentationForCommittedState(previous, state, round, { initial = false } = {}) {
  const base = previous || EMPTY_POKER_PRESENTATION;
  if (initial && state.phase === 'selecting') {
    return { ...EMPTY_POKER_PRESENTATION };
  }
  if (state.phase === 'resolving' && state.pendingResolution) {
    const scoreBeats = selectMajorScoreBeats(state.trace);
    return {
      ...EMPTY_POKER_PRESENTATION,
      scoreBeats,
      activeBeatIndex: scoreBeats.length ? 0 : -1,
      triggeredModifierIds: modifierIdsForBeat(scoreBeats[0]),
      targetProgress: deriveTargetProgress({
        roundScore: state.roundScore,
        handScore: state.pendingResolution.score,
        target: round.target
      }),
      pendingDrawnCardIds: state.pendingResolution.drawnCardIds || [],
      statusMessage: `${handLabel(state.pendingResolution.handType)}，本手獲得 ${state.pendingResolution.score.toLocaleString()} 分${state.pendingResolution.nextPhase === 'round-won' ? '，已達成回合目標' : ''}`
    };
  }
  if (state.lastAction === 'DISCARD') {
    const event = state.trace.find((row) => row.type === 'discard');
    if (!event) return { ...base, discardCue: null, freshCardIds: [] };
    return {
      ...EMPTY_POKER_PRESENTATION,
      discardCue: { cardIds: event.cardIds || [], drawnCardIds: event.drawnCardIds || [] },
      freshCardIds: event.drawnCardIds || [],
      statusMessage: `已棄掉 ${event.cardIds?.length || 0} 張牌，補 ${event.drawnCardIds?.length || 0} 張`
    };
  }
  if (state.lastAction === 'FINISH_RESOLUTION') {
    const freshCardIds = state.phase === 'selecting' ? base.pendingDrawnCardIds : [];
    return {
      ...EMPTY_POKER_PRESENTATION,
      freshCardIds,
      statusMessage: state.phase === 'run-lost' ? '出牌次數或牌庫已耗盡，本局結束' : base.statusMessage
    };
  }
  if (state.lastAction === 'SETTLE_ROUND') {
    return {
      ...EMPTY_POKER_PRESENTATION,
      statusMessage: `回合結算完成，獲得 ${state.settlement?.total || 0} 幣，結算後共有 ${state.coins} 幣`
    };
  }
  if (state.phase === 'round-won') return { ...EMPTY_POKER_PRESENTATION };
  if (state.phase === 'run-lost') return { ...EMPTY_POKER_PRESENTATION, statusMessage: '本局結束' };
  if (state.phase === 'run-won') return { ...EMPTY_POKER_PRESENTATION, statusMessage: '牌局完成' };
  if (['TOGGLE_CARD', 'PLAY', 'BEGIN_ROUND'].includes(state.lastAction)) {
    return { ...base, discardCue: null, freshCardIds: [], focusAfterSkip: false };
  }
  return base;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function usePokerPresentation(state, round, dispatch) {
  const [presentation, setPresentation] = useState(EMPTY_POKER_PRESENTATION);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const timersRef = useRef(new Set());
  const mountedRef = useRef(false);
  const processedKeyRef = useRef(null);
  const resolutionDoneRef = useRef(new Set());
  const stateRef = useRef(state);
  stateRef.current = state;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const schedule = useCallback((callback, delay) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  const finishResolution = useCallback((source = 'automatic') => {
    const current = stateRef.current;
    if (current.phase !== 'resolving' || !current.pendingResolution) return false;
    const key = committedPresentationKey(current);
    const claim = completeResolutionOnce(resolutionDoneRef.current, key);
    resolutionDoneRef.current = claim.completedKeys;
    if (!claim.accepted) return false;
    clearTimers();
    if (source === 'skip') setPresentation((value) => ({ ...value, focusAfterSkip: true }));
    dispatch({ type: 'FINISH_RESOLUTION', now: Date.now() });
    return true;
  }, [clearTimers, dispatch]);

  const actionKey = committedPresentationKey(state);
  useEffect(() => {
    const initial = !mountedRef.current;
    mountedRef.current = true;
    const sameCommit = processedKeyRef.current === actionKey;
    if (sameCommit && state.phase !== 'resolving') return undefined;
    processedKeyRef.current = actionKey;
    clearTimers();
    const next = presentationForCommittedState(presentation, state, round, { initial });
    setPresentation(next);

    if (state.phase === 'resolving' && state.pendingResolution) {
      const duration = scoreSequenceDuration(next.scoreBeats.length, reducedMotion);
      if (!reducedMotion && next.scoreBeats.length > 1) {
        const step = duration / next.scoreBeats.length;
        next.scoreBeats.slice(1).forEach((beat, index) => {
          schedule(() => setPresentation((value) => ({
            ...value,
            activeBeatIndex: index + 1,
            triggeredModifierIds: modifierIdsForBeat(beat)
          })), Math.round(step * (index + 1)));
        });
      } else if (next.scoreBeats.length) {
        setPresentation((value) => ({
          ...value,
          activeBeatIndex: next.scoreBeats.length - 1,
          triggeredModifierIds: modifierIdsForBeat(next.scoreBeats.at(-1))
        }));
      }
      schedule(() => finishResolution('automatic'), duration);
    } else if (next.discardCue) {
      schedule(() => setPresentation((value) => ({ ...value, discardCue: null })), DISCARD_CUE_DURATION_MS);
      if (next.freshCardIds.length) schedule(() => setPresentation((value) => ({ ...value, freshCardIds: [] })), FRESH_CARD_DURATION_MS);
    } else if (next.freshCardIds.length) {
      schedule(() => setPresentation((value) => ({ ...value, freshCardIds: [] })), FRESH_CARD_DURATION_MS);
    }
    return clearTimers;
    // Presentation is intentionally derived only when committed state identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionKey, state.phase, reducedMotion]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const acknowledgeSkipFocus = useCallback(() => {
    setPresentation((value) => ({ ...value, focusAfterSkip: false }));
  }, []);

  return useMemo(() => ({
    ...presentation,
    reducedMotion,
    skipResolution: () => finishResolution('skip'),
    acknowledgeSkipFocus
  }), [acknowledgeSkipFocus, finishResolution, presentation, reducedMotion]);
}
