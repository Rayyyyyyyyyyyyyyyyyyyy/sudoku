export const MEDAL_STEPS = Object.freeze([
  Object.freeze({ id: 'bronze', name: '初勝', target: 1, tone: 'bronze' }),
  Object.freeze({ id: 'silver', name: '熟練', target: 5, tone: 'silver' }),
  Object.freeze({ id: 'gold', name: '精通', target: 20, tone: 'gold' })
]);

function counter(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function validTime(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** 徽章只從已儲存的該難度完成數衍生，讀取不會授獎或寫入紀錄。 */
export function medalProgress(stats, level) {
  const count = counter(stats?.count?.[level]);
  const earned = MEDAL_STEPS.filter((medal) => count >= medal.target);
  const next = MEDAL_STEPS.find((medal) => count < medal.target) ?? null;
  return {
    count,
    earned,
    current: earned[earned.length - 1] ?? null,
    next,
    remaining: next ? next.target - count : 0
  };
}

/** 比較記錄完成前後的快照；本函式不負責記錄完成或持久化。 */
export function completionReward({ before, after, level, ms }) {
  const previousCount = counter(before?.count?.[level]);
  const progress = medalProgress(after, level);
  const best = before?.best?.[level];
  const previousBest = validTime(best) ? best : null;
  const newBest = previousBest !== null && validTime(ms) && ms < previousBest;
  return {
    level,
    ms,
    count: progress.count,
    firstClear: previousCount === 0,
    newBest,
    previousBest,
    improvementMs: newBest ? previousBest - ms : 0,
    newMedals: progress.earned.filter((medal) => previousCount < medal.target),
    next: progress.next,
    remaining: progress.remaining,
    totalSolved: counter(after?.solved),
    streak: counter(after?.streak)
  };
}
