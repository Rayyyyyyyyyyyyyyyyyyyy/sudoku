import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { generatePuzzle } from './index.js';
import {
  charAt,
  createPlayState,
  freePoolSlots,
  idiomPlayReducer,
  isFull,
  isLocked,
  wrongCells
} from './play.js';
import {
  clearIdiomSnapshot,
  loadIdiomSnapshot,
  persistIdiomSnapshot,
  recordIdiomSolve,
  snapshotOf
} from './persistence.js';

/**
 * 一局成語填字的 React 綁定。
 *
 * 規則與存檔都不在這裡：這裡只負責「什麼時候該存」「什麼時候該記一筆」，
 * 狀態轉移全部交給 `play.js` 的純 reducer。
 */
export function useIdiomGame({ level, seed, isDaily = false }) {
  // 同一個 seed 只生成一次；生成是純函式，但盤面偏大，不該每次 render 重算。
  const generated = useMemo(() => generatePuzzle(level, seed), [level, seed]);

  const [state, dispatch] = useReducer(idiomPlayReducer, generated, createPlayState);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [restoredFrom, setRestoredFrom] = useState(null);
  const recorded = useRef(false);

  // 開局時先看有沒有同一題的存檔；有就接著玩，計時也從存下來的秒數續算。
  useEffect(() => {
    const result = loadIdiomSnapshot();
    if (
      result.status === 'ok' &&
      result.snapshot.level === level &&
      result.snapshot.seed === seed &&
      result.snapshot.daily === isDaily
    ) {
      const snapshot = result.snapshot;
      dispatch({
        type: 'restore',
        state: {
          ...createPlayState(snapshot.puzzle),
          assign: snapshot.assign,
          revealed: snapshot.revealed,
          sel: snapshot.sel,
          reveals: snapshot.reveals
        }
      });
      setStartedAt(Date.now() - (snapshot.elapsedMs || 0));
      setRestoredFrom(snapshot);
    }
    recorded.current = false;
    // 換題就是重來一局，不沿用上一題的計時起點。
  }, [level, seed, isDaily]);

  useEffect(() => {
    if (state.solved) return undefined;
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 250);
    return () => clearInterval(id);
  }, [startedAt, state.solved]);

  // 每個 committed transition 都寫一次，通勤中被回收分頁也不掉進度。
  useEffect(() => {
    if (state.solved) {
      clearIdiomSnapshot();
      return;
    }
    persistIdiomSnapshot(
      snapshotOf(state, { level, seed, daily: isDaily, startedAt, elapsedMs: Date.now() - startedAt })
    );
  }, [state, level, seed, isDaily, startedAt]);

  useEffect(() => {
    if (!state.solved || recorded.current) return;
    recorded.current = true; // 完成只記一次，即使 effect 因其他 state 再跑
    recordIdiomSolve({ level, ms: Date.now() - startedAt, reveals: state.reveals, isDaily });
  }, [state.solved, state.reveals, level, startedAt, isDaily]);

  const select = useCallback((cell) => dispatch({ type: 'select', cell }), []);
  const pick = useCallback((slot) => dispatch({ type: 'pick', slot }), []);
  const clear = useCallback((cell) => dispatch({ type: 'clear', cell }), []);
  const reveal = useCallback((cell) => dispatch({ type: 'reveal', cell }), []);

  const free = useMemo(() => new Set(freePoolSlots(state)), [state]);
  const wrong = useMemo(() => new Set(wrongCells(state)), [state]);

  return {
    puzzle: state.puzzle,
    state,
    sel: state.sel,
    reveals: state.reveals,
    solved: state.solved,
    full: isFull(state),
    elapsed: state.solved ? Math.max(elapsed, 0) : elapsed,
    restoredFrom,
    freeSlots: free,
    wrongCells: wrong,
    charAt: (cell) => charAt(state, cell),
    isLocked: (cell) => isLocked(state, cell),
    select,
    pick,
    clear,
    reveal
  };
}
