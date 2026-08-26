import { useEffect, useReducer, useRef } from 'react';
import { recordPokerCompletion, savePokerSnapshot } from './persistence.js';
import { pokerRunReducer } from './run.js';

export function usePokerRun(initialState) {
  const [state, dispatch] = useReducer(pokerRunReducer, initialState);
  const terminalRecorded = useRef(false);

  useEffect(() => {
    savePokerSnapshot(state);
  }, [state]);

  useEffect(() => {
    if (!['run-won', 'run-lost'].includes(state.phase) || state.completion.recordsApplied || terminalRecorded.current) return;
    terminalRecorded.current = true;
    recordPokerCompletion(state);
    dispatch({ type: 'MARK_RECORDS_APPLIED', now: Date.now() });
  }, [state]);

  return [state, dispatch];
}
