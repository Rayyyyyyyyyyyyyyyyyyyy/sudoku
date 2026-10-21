import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { commitPokerRun } from './persistence.js';
import { pokerRunReducer } from './run.js';

export function usePokerRun(initialState) {
  const [state, dispatch] = useReducer(pokerRunReducer, initialState);
  const [save, setSave] = useState({ persisted: true, recordsStatus: 'ok', newModifierIds: [], retried: false });
  const pendingModifierIds = useRef([]);

  const persist = useCallback((retried = false) => {
    const result = commitPokerRun(state, pendingModifierIds.current);
    pendingModifierIds.current = result.pendingModifierIds;
    setSave((previous) => ({
      persisted: result.persisted,
      recordsStatus: result.recordsStatus,
      newModifierIds: result.newModifierIds,
      retried: retried || (state.lastAction === 'MARK_RECORDS_APPLIED' && previous.retried)
    }));
    if (result.recordsApplied && !state.completion.recordsApplied) {
      dispatch({ type: 'MARK_RECORDS_APPLIED', now: Date.now() });
    }
  }, [state]);

  useEffect(() => { persist(); }, [persist]);

  return [state, dispatch, { ...save, retry: () => persist(true) }];
}
