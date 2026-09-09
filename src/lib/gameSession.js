// v2 使用評級題庫；避免把舊生成器的作答進度套到不同盤面。
const KEY = 'sudoku-drill-active-game-v2';

function defaultStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function validDigit(value) {
  return Number.isInteger(value) && value >= 0 && value <= 9;
}

function validNotes(notes) {
  return (
    Array.isArray(notes) &&
    notes.length === 81 &&
    notes.every(
      (cell) =>
        Array.isArray(cell) &&
        cell.every((value) => Number.isInteger(value) && value >= 1 && value <= 9)
    )
  );
}

function validSession(session) {
  return (
    session &&
    Number.isInteger(session.level) &&
    Number.isInteger(session.seed) &&
    typeof session.isDaily === 'boolean' &&
    Array.isArray(session.values) &&
    session.values.length === 81 &&
    session.values.every(validDigit) &&
    validNotes(session.notes) &&
    Number.isInteger(session.sel) &&
    session.sel >= -1 &&
    session.sel < 81 &&
    typeof session.pencil === 'boolean' &&
    Number.isFinite(session.startedAt) &&
    session.startedAt > 0
  );
}

export function loadGameSession({ level, seed, isDaily }, storage = defaultStorage()) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!validSession(session)) return null;
    if (session.level !== level || session.seed !== seed || session.isDaily !== isDaily) return null;
    return session;
  } catch (e) {
    return null;
  }
}

export function loadAnyGameSession(storage = defaultStorage()) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return validSession(session) ? session : null;
  } catch (e) {
    return null;
  }
}

export function gameSessionPath(session) {
  if (!validSession(session)) return null;
  return session.isDaily ? '/daily' : `/play/${session.level}?seed=${session.seed}`;
}

export function persistGameSession(session, storage = defaultStorage()) {
  if (!storage || !validSession(session)) return;
  try {
    storage.setItem(KEY, JSON.stringify(session));
  } catch (e) {
    /* localStorage 不可用(無痕/被封鎖)時不影響遊玩 */
  }
}

export function clearGameSession(storage = defaultStorage()) {
  if (!storage) return;
  try {
    storage.removeItem(KEY);
  } catch (e) {
    /* 同上 */
  }
}
