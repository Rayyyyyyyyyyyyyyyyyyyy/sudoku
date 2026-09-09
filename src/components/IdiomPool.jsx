/**
 * 候選字池。
 *
 * 點格子再點這裡的字，**不使用輸入法也不使用拖曳**：中文沒有 26 鍵字母表，
 * 自由輸入得叫出 IME，在手機上是蓋住整個盤面的全螢幕模態；拖曳則在晃動的
 * 車廂裡命中率太低，而且沒有鍵盤等價操作。
 *
 * 用掉的字保留在原位並變灰，不從列表移除——位置一直跳動會讓人找不到字。
 */
export default function IdiomPool({ pool, freeSlots, disabled, onPick }) {
  const remaining = freeSlots.size;

  return (
    <section className="game-column id-pool" aria-label="候選字">
      <div className="id-pool__head">
        <span>候選字</span>
        <span className="id-pool__count">剩 {remaining} / {pool.length}</span>
      </div>
      <div className="id-pool__grid">
        {pool.map((char, slot) => {
          const used = !freeSlots.has(slot);
          return (
            <button
              key={slot}
              type="button"
              className={`id-chip${used ? ' id-chip--used' : ''}`}
              aria-label={`候選字 ${char}${used ? '，已使用' : ''}`}
              disabled={used || disabled}
              onClick={() => onPick(slot)}
            >
              {char}
            </button>
          );
        })}
      </div>
    </section>
  );
}
