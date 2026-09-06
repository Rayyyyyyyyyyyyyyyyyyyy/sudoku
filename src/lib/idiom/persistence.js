/**
 * 成語填字的存檔、恢復與紀錄。
 *
 * 兩個決定值得寫下來：
 *
 * 1. **存整個盤面，不只存 seed。** 只存 seed 的話，生成器或語料一改，同一個
 *    seed 就會長出不同的盤，玩到一半的存檔會無聲換題。存盤面讓語料更新對進行
 *    中的局是安全的。
 * 2. **版本不合時不丟資料。** 保留紀錄、不載入進行中的局，等玩家明示清除。
 *    比照 `src/lib/poker/persistence.js`。
 */

import { IDIOM_PLAY_SCHEMA_VERSION } from './play.js';

export const IDIOM_SNAPSHOT_KEY = 'sudoku-drill-idiom-active-v1';
export const IDIOM_RECORDS_KEY = 'sudoku-drill-idiom-records-v1';
export const IDIOM_SNAPSHOT_VERSION = 1;

function storageOf(storage) {
  if (storage) return storage;
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch (error) {
    return null; // 無痕模式或封鎖 cookie 時存取本身就會丟例外
  }
}

function readJSON(storage, key) {
  const store = storageOf(storage);
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function writeJSON(storage, key, value) {
  const store = storageOf(storage);
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false; // 寫不進去不該讓遊戲當掉
  }
}

export function snapshotOf(state, { level, seed, daily = false, startedAt, elapsedMs = 0 }) {
  return {
    version: IDIOM_SNAPSHOT_VERSION,
    playVersion: state.schemaVersion,
    level,
    seed,
    daily,
    startedAt,
    elapsedMs,
    puzzle: state.puzzle,
    assign: state.assign,
    revealed: state.revealed,
    sel: state.sel,
    reveals: state.reveals
  };
}

/** 存檔內容的結構檢查。壞掉的存檔要當成不相容，不能載入到一半才炸。 */
function validSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const { puzzle } = snapshot;
  if (!puzzle || !Array.isArray(puzzle.cells) || !Array.isArray(puzzle.pool)) return false;
  if (!Array.isArray(puzzle.solution) || !Array.isArray(puzzle.clues)) return false;
  if (!Array.isArray(snapshot.assign) || snapshot.assign.length !== puzzle.cells.length) return false;
  if (!Array.isArray(snapshot.revealed) || snapshot.revealed.length !== puzzle.cells.length) return false;
  return snapshot.assign.every((slot) => Number.isInteger(slot) && slot >= -1 && slot < puzzle.pool.length);
}

/**
 * 讀存檔。回傳 `{ status }`：
 *   - `empty`：沒有存檔
 *   - `incompatible`：版本或結構不合，資料保留，等玩家決定
 *   - `ok`：可以接著玩
 */
export function loadIdiomSnapshot(storage) {
  const raw = readJSON(storage, IDIOM_SNAPSHOT_KEY);
  if (!raw) return { status: 'empty' };
  if (raw.version !== IDIOM_SNAPSHOT_VERSION || raw.playVersion !== IDIOM_PLAY_SCHEMA_VERSION) {
    return { status: 'incompatible', reason: 'version', snapshot: raw };
  }
  if (!validSnapshot(raw)) return { status: 'incompatible', reason: 'shape', snapshot: raw };
  return { status: 'ok', snapshot: raw };
}

export function persistIdiomSnapshot(snapshot, storage) {
  return writeJSON(storage, IDIOM_SNAPSHOT_KEY, snapshot);
}

export function clearIdiomSnapshot(storage) {
  const store = storageOf(storage);
  if (!store) return;
  try {
    store.removeItem(IDIOM_SNAPSHOT_KEY);
  } catch (error) {
    /* 清不掉也只能算了 */
  }
}

export function emptyIdiomRecords() {
  return { solved: 0, assisted: 0, totalMs: 0, best: {}, count: {}, streak: 0, lastDay: null, daily: {} };
}

export function loadIdiomRecords(storage) {
  return Object.assign(emptyIdiomRecords(), readJSON(storage, IDIOM_RECORDS_KEY) || {});
}

export function dayKey(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 記一次完成。
 *
 * 用過揭示的完成照樣計數、照樣續連續天數，但**不寫最佳時間**——否則靠揭示
 * 刷出來的秒數會蓋掉真正解出來的紀錄，那個排行榜就沒有意義了。
 */
export function recordIdiomSolve({ level, ms, reveals = 0, isDaily = false, now }, storage) {
  const records = loadIdiomRecords(storage);
  const next = {
    ...records,
    best: { ...records.best },
    count: { ...records.count },
    daily: { ...records.daily }
  };
  const assisted = reveals > 0;

  next.solved += 1;
  next.totalMs += ms;
  next.count[level] = (next.count[level] || 0) + 1;
  if (assisted) next.assisted += 1;
  else if (!next.best[level] || ms < next.best[level]) next.best[level] = ms;

  const today = dayKey(now);
  if (isDaily) next.daily[today] = { ms, assisted };
  if (next.lastDay !== today) {
    const yesterday = new Date(now ? now.getTime() : Date.now());
    yesterday.setDate(yesterday.getDate() - 1);
    next.streak = next.lastDay === dayKey(yesterday) ? (next.streak || 0) + 1 : 1;
    next.lastDay = today;
  } else if (!next.streak) {
    next.streak = 1;
  }

  writeJSON(storage, IDIOM_RECORDS_KEY, next);
  return next;
}
