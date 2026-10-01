import { useEffect, useReducer, useRef, useState } from 'react';
import { recordPokerCollection, recordPokerCompletion, savePokerSnapshot } from './persistence.js';
import { pokerRunReducer } from './run.js';

export function usePokerRun(initialState) {
  const [state, dispatch] = useReducer(pokerRunReducer, initialState);
  const [newModifierIds, setNewModifierIds] = useState([]);
  const terminalRecorded = useRef(false);

  useEffect(() => {
    savePokerSnapshot(state);
    const collection = recordPokerCollection(state);
    setNewModifierIds((previous) => collection.newModifierIds.length ? collection.newModifierIds : previous.length ? [] : previous);
  }, [state]);

  useEffect(() => {
    if (!['run-won', 'run-lost'].includes(state.phase) || state.completion.recordsApplied || terminalRecorded.current) return;
    terminalRecorded.current = true;
    recordPokerCompletion(state);
    dispatch({ type: 'MARK_RECORDS_APPLIED', now: Date.now() });
  }, [state]);

  return [state, dispatch, newModifierIds];
}
