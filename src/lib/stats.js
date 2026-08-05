const KEY = 'sudoku-drill-v1';

export function emptyStats() {
  return { solved: 0, totalMs: 0, best: {}, count: {}, streak: 0, lastDay: null, daily: {} };
}

export function loadStats() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return Object.assign(emptyStats(), JSON.parse(raw));
  } catch (e) {
    /* localStorage 不可用(無痕/被封鎖)時就當作沒有紀錄 */
  }
  return emptyStats();
}

export function persistStats(st) {
  try {
    localStorage.setItem(KEY, JSON.stringify(st));
  } catch (e) {
    /* 同上,寫不進去就算了 */
  }
  return st;
}

export function dayKey(d) {
  d = d || new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

export function fmt(ms) {
  if (ms == null) return '—';
  const t = Math.floor(ms / 1000);
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
}

/** 記一次完成:更新總數、最佳時間、每日一題與連續天數。 */
export function recordSolve({ level, ms, isDaily }) {
  const prev = loadStats();
  const st = Object.assign({}, prev);
  st.best = Object.assign({}, st.best);
  st.count = Object.assign({}, st.count);
  st.daily = Object.assign({}, st.daily);

  st.solved += 1;
  st.totalMs += ms;
  st.count[level] = (st.count[level] || 0) + 1;
  if (!st.best[level] || ms < st.best[level]) st.best[level] = ms;

  const today = dayKey();
  if (isDaily) st.daily[today] = ms;
  if (st.lastDay !== today) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    st.streak = st.lastDay === dayKey(y) ? (st.streak || 0) + 1 : 1;
    st.lastDay = today;
  } else if (!st.streak) {
    st.streak = 1;
  }
  return persistStats(st);
}
