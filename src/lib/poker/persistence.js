import { POKER_RULES, modifierById, opponentById } from '../../data/poker/compatibility.js';
import { assertZoneInvariant } from './cards.js';
import { POKER_PHASES } from './run.js';
import { validRandomState } from './random.js';

export const POKER_SNAPSHOT_KEY = 'sudoku-drill-poker-active-v1';
export const POKER_RECORDS_KEY = 'sudoku-drill-poker-records-v1';

function defaultStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export function validatePokerSnapshot(snapshot) {
  const errors = [];
  if (!snapshot || typeof snapshot !== 'object') return { ok: false, errors: ['snapshot must be an object'] };
  if (snapshot.schemaVersion !== POKER_RULES.persistenceVersion) errors.push('persistence version mismatch');
  if (snapshot.rulesVersion !== POKER_RULES.rulesVersion) errors.push('rules version mismatch');
  if (!POKER_PHASES.includes(snapshot.phase)) errors.push('invalid phase');
  if (!opponentById(snapshot.opponentId)) errors.push('invalid opponent');
  if (!Number.isInteger(snapshot.stageIndex) || !Number.isInteger(snapshot.roundIndex)) errors.push('invalid progression cursor');
  if (!validRandomState(snapshot.randomState)) errors.push('invalid random state');
  try { assertZoneInvariant(snapshot.zones); } catch (error) { errors.push(error.message); }
  if (!Array.isArray(snapshot.selection) || !snapshot.selection.every((id) => snapshot.zones?.hand?.some((card) => card.instanceId === id))) errors.push('invalid selection');
  if (!snapshot.actions || !['hands', 'discards', 'handSize'].every((key) => Number.isInteger(snapshot.actions[key]) && snapshot.actions[key] >= 0)) errors.push('invalid actions');
  if (!Number.isFinite(snapshot.roundScore) || !Number.isFinite(snapshot.totalScore) || !Number.isFinite(snapshot.coins)) errors.push('invalid score or economy');
  if (!Array.isArray(snapshot.modifiers) || snapshot.modifiers.some((owned) => !owned.instanceId || !modifierById(owned.catalogId) || typeof owned.counters !== 'object')) errors.push('invalid modifiers');
  if (snapshot.modifiers?.length > POKER_RULES.modifierCapacity.value) errors.push('modifier capacity exceeded');
  if (!Array.isArray(snapshot.trace) || !Array.isArray(snapshot.transactionIds)) errors.push('invalid trace or transactions');
  if (!snapshot.timers || !['startedAt', 'elapsedMs', 'lastCommittedAt'].every((key) => Number.isFinite(snapshot.timers[key]))) errors.push('invalid timers');
  if (!snapshot.completion || !Array.isArray(snapshot.completion.settledRoundIds) || typeof snapshot.completion.recordsApplied !== 'boolean') errors.push('invalid completion guards');
  if (snapshot.phase === 'shop' && !Array.isArray(snapshot.offers?.items)) errors.push('shop phase requires offers');
  if (snapshot.phase === 'pack' && !Array.isArray(snapshot.packState?.choices)) errors.push('pack phase requires choices');
  if (snapshot.phase === 'resolving' && (!snapshot.pendingResolution || !POKER_PHASES.includes(snapshot.pendingResolution.nextPhase))) errors.push('resolving phase requires a pending result');
  return { ok: errors.length === 0, errors };
}

export function migratePokerSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return { status: 'incompatible', reason: '儲存資料格式無法辨識。' };
  if (raw.schemaVersion !== POKER_RULES.persistenceVersion) return { status: 'incompatible', reason: `儲存版本 ${raw.schemaVersion ?? 'unknown'} 與目前版本不相容。` };
  if (raw.rulesVersion !== POKER_RULES.rulesVersion) return { status: 'incompatible', reason: '牌局規則已更新，舊牌局無法安全續玩。' };
  const validation = validatePokerSnapshot(raw);
  return validation.ok ? { status: 'ok', state: raw } : { status: 'incompatible', reason: `牌局資料不完整：${validation.errors.join('、')}` };
}

export function loadPokerSnapshot(storage = defaultStorage()) {
  if (!storage) return { status: 'empty' };
  try {
    const raw = storage.getItem(POKER_SNAPSHOT_KEY);
    if (!raw) return { status: 'empty' };
    return migratePokerSnapshot(JSON.parse(raw));
  } catch (error) {
    return { status: 'incompatible', reason: '牌局資料無法解析。' };
  }
}

export function savePokerSnapshot(snapshot, storage = defaultStorage()) {
  const validation = validatePokerSnapshot(snapshot);
  if (!validation.ok) throw new Error(`Refusing invalid poker snapshot: ${validation.errors.join(', ')}`);
  if (!storage) return snapshot;
  try { storage.setItem(POKER_SNAPSHOT_KEY, JSON.stringify(snapshot)); } catch (error) { /* unavailable storage must not break play */ }
  return snapshot;
}

export function clearPokerSnapshot(storage = defaultStorage()) {
  if (!storage) return;
  try { storage.removeItem(POKER_SNAPSHOT_KEY); } catch (error) { /* unavailable storage */ }
}

export function emptyPokerRecords() {
  return { runsStarted: 0, runsWon: 0, highestCompletedScore: 0, winStreak: 0, startedRunIds: [], completedRunIds: [] };
}

export function loadPokerRecords(storage = defaultStorage()) {
  if (!storage) return emptyPokerRecords();
  try {
    const raw = storage.getItem(POKER_RECORDS_KEY);
    if (!raw) return emptyPokerRecords();
    const parsed = JSON.parse(raw);
    return { ...emptyPokerRecords(), ...parsed, startedRunIds: Array.isArray(parsed.startedRunIds) ? parsed.startedRunIds : [], completedRunIds: Array.isArray(parsed.completedRunIds) ? parsed.completedRunIds : [] };
  } catch (error) { return emptyPokerRecords(); }
}

export function savePokerRecords(records, storage = defaultStorage()) {
  if (storage) {
    try { storage.setItem(POKER_RECORDS_KEY, JSON.stringify(records)); } catch (error) { /* unavailable storage */ }
  }
  return records;
}

export function recordPokerRunStarted(runId, storage = defaultStorage()) {
  const records = loadPokerRecords(storage);
  if (records.startedRunIds.includes(runId)) return records;
  return savePokerRecords({ ...records, runsStarted: records.runsStarted + 1, startedRunIds: [...records.startedRunIds, runId] }, storage);
}

export function recordPokerCompletion(state, storage = defaultStorage()) {
  if (!['run-won', 'run-lost'].includes(state.phase)) return loadPokerRecords(storage);
  const records = loadPokerRecords(storage);
  if (records.completedRunIds.includes(state.runId)) return records;
  const won = state.phase === 'run-won';
  return savePokerRecords({
    ...records,
    runsWon: records.runsWon + (won ? 1 : 0),
    highestCompletedScore: Math.max(records.highestCompletedScore, state.totalScore),
    winStreak: won ? records.winStreak + 1 : 0,
    completedRunIds: [...records.completedRunIds, state.runId]
  }, storage);
}
