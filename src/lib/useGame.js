import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { clearGameSession, loadGameSession, persistGameSession } from './gameSession';
import { generate, peersOf } from './sudoku';
import { recordSolve } from './stats';

const emptyNotes = () => Array.from({ length: 81 }, () => []);

const INITIAL = {
  board: null,
  values: null,
  notes: emptyNotes(),
  sel: -1,
  pencil: false,
  solved: false
};

/**
 * 盤面狀態全部走 reducer,不靠 closure 讀舊值 —— 連續輸入比 render 快時
 * (自動化腳本、狂按鍵盤)才不會用過期的 values 覆蓋掉已填的格子。
 */
function reducer(state, action) {
  switch (action.type) {
    case 'reset':
      return INITIAL;

    case 'board':
      if (action.saved) {
        const values = action.saved.values.map((value, i) => action.board.puzzle[i] || value);
        const notes = action.saved.notes.map((cell, i) =>
          action.board.puzzle[i] || values[i] ? [] : Array.from(new Set(cell))
        );
        return {
          ...INITIAL,
          board: action.board,
          values,
          notes,
          sel: action.saved.sel,
          pencil: action.saved.pencil,
          solved: values.every((value, i) => value === action.board.solution[i])
        };
      }
      return {
        ...INITIAL,
        board: action.board,
        values: action.board.puzzle.slice()
      };

    case 'select':
      return { ...state, sel: action.i };

    case 'move': {
      const s = state.sel < 0 ? 40 : state.sel;
      let r = Math.floor(s / 9);
      let c = s % 9;
      if (action.dir === 'ArrowUp') r = (r + 8) % 9;
      if (action.dir === 'ArrowDown') r = (r + 1) % 9;
      if (action.dir === 'ArrowLeft') c = (c + 8) % 9;
      if (action.dir === 'ArrowRight') c = (c + 1) % 9;
      return { ...state, sel: r * 9 + c };
    }

    case 'pencil':
      return { ...state, pencil: !state.pencil };

    case 'place': {
      const { board, values, sel, pencil, solved } = state;
      if (!board || solved || sel < 0 || board.puzzle[sel]) return state;
      const d = action.digit;

      if (pencil) {
        const notes = state.notes.map((a) => a.slice());
        const at = notes[sel].indexOf(d);
        if (at >= 0) notes[sel].splice(at, 1);
        else notes[sel].push(d);
        return { ...state, notes };
      }

      const next = values.slice();
      next[sel] = next[sel] === d ? 0 : d;

      const notes = state.notes.map((a) => a.slice());
      notes[sel] = [];
      if (action.autoCleanNotes && next[sel]) {
        peersOf(sel).forEach((j) => {
          const at = notes[j].indexOf(d);
          if (at >= 0) notes[j].splice(at, 1);
        });
      }

      return {
        ...state,
        values: next,
        notes,
        solved: next.every((v, k) => v === board.solution[k])
      };
    }

    case 'erase': {
      const { board, values, sel, solved } = state;
      if (!board || solved || sel < 0 || board.puzzle[sel]) return state;
      const next = values.slice();
      next[sel] = 0;
      const notes = state.notes.map((a) => a.slice());
      notes[sel] = [];
      return { ...state, values: next, notes };
    }

    default:
      return state;
  }
}

/**
 * 一局遊戲。level/seed 一變就重新出題;出題是同步的回溯搜尋(專家難度會卡一下),
 * 所以丟到下一個 frame 跑,讓「產生題目中」先畫出來。
 */
export function useGame({ level, seed, isDaily, settings }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const finalMs = useRef(null);
  const recorded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'reset' });
    setElapsed(0);
    finalMs.current = null;
    recorded.current = false;

    const id = setTimeout(() => {
      const board = generate(level, seed);
      if (cancelled) return;
      const saved = loadGameSession({ level, seed, isDaily });
      startedAt.current = saved ? saved.startedAt : Date.now();
      setElapsed(Math.max(0, Date.now() - startedAt.current));
      dispatch({ type: 'board', board, saved });
    }, 16);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [level, seed, isDaily]);

  useEffect(() => {
    if (!state.board || state.solved) return undefined;
    const id = setInterval(() => setElapsed(Date.now() - startedAt.current), 500);
    return () => clearInterval(id);
  }, [state.board, state.solved]);

  // 每次操作後同步保存；seed 可重建盤面，所以只需保存玩家輸入與開始時間。
  useEffect(() => {
    if (!state.board) return;
    if (state.solved) {
      clearGameSession();
      return;
    }
    persistGameSession({
      level,
      seed,
      isDaily,
      values: state.values,
      notes: state.notes,
      sel: state.sel,
      pencil: state.pencil,
      startedAt: startedAt.current
    });
  }, [
    state.board,
    state.values,
    state.notes,
    state.sel,
    state.pencil,
    state.solved,
    level,
    seed,
    isDaily
  ]);

  // 記錄成績是副作用,所以留在 reducer 外面;recorded 擋掉 StrictMode 的重跑。
  useEffect(() => {
    if (!state.solved || recorded.current) return;
    recorded.current = true;
    const ms = Date.now() - startedAt.current;
    finalMs.current = ms;
    setElapsed(ms);
    recordSolve({ level, ms, isDaily });
  }, [state.solved, level, isDaily]);

  const place = useCallback(
    (digit) => dispatch({ type: 'place', digit, autoCleanNotes: settings.autoCleanNotes }),
    [settings.autoCleanNotes]
  );
  const erase = useCallback(() => dispatch({ type: 'erase' }), []);
  const togglePencil = useCallback(() => dispatch({ type: 'pencil' }), []);
  const select = useCallback((i) => dispatch({ type: 'select', i }), []);

  useEffect(() => {
    if (!state.board || state.solved) return undefined;
    const onKey = (e) => {
      const k = e.key;
      if (/^[1-9]$/.test(k)) {
        place(+k);
        e.preventDefault();
      } else if (k === '0' || k === 'Backspace' || k === 'Delete') {
        erase();
        e.preventDefault();
      } else if (k === 'n' || k === 'N') {
        togglePencil();
      } else if (k.startsWith('Arrow')) {
        dispatch({ type: 'move', dir: k });
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [state.board, state.solved, place, erase, togglePencil]);

  return {
    board: state.board,
    values: state.values,
    notes: state.notes,
    sel: state.sel,
    select,
    pencil: state.pencil,
    solved: state.solved,
    togglePencil,
    elapsed,
    finalMs: finalMs.current,
    place,
    erase
  };
}
