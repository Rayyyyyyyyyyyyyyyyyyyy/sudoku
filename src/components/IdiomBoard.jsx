/**
 * 盤面。每格是一個原生 button，觸控、鍵盤與 focus 一次到位。
 *
 * 狀態不只靠顏色：選取加外框、提示字用粗體與底色、揭示的格子加一個角標、
 * 填錯的格子加底線。色盲與強光下的車廂都還讀得出來。
 */
export default function IdiomBoard({ puzzle, sel, charAt, isLocked, wrongCells, revealed, onSelect }) {
  const index = new Map(puzzle.cells.map((cell, i) => [`${cell.row},${cell.col}`, i]));
  const rows = Array.from({ length: puzzle.height }, (_, row) => row);
  const cols = Array.from({ length: puzzle.width }, (_, col) => col);

  return (
    <div
      className="id-board"
      role="grid"
      aria-label={`成語填字盤面 ${puzzle.height} 列 ${puzzle.width} 行`}
      style={{ '--id-cols': puzzle.width }}
    >
      {rows.map((row) =>
        cols.map((col) => {
          const i = index.get(`${row},${col}`);
          if (i === undefined) {
            return <span key={`${row}-${col}`} className="id-cell id-cell--void" aria-hidden="true" />;
          }
          const clue = Boolean(puzzle.clues[i]);
          const wasRevealed = revealed[i];
          const char = charAt(i);
          const wrong = wrongCells.has(i);
          const locked = isLocked(i);
          const classes = ['id-cell'];
          if (clue) classes.push('id-cell--clue');
          if (wasRevealed) classes.push('id-cell--revealed');
          if (wrong) classes.push('id-cell--wrong');
          if (i === sel) classes.push('id-cell--sel');
          if (!char) classes.push('id-cell--empty');

          const label = [
            `第 ${row + 1} 列第 ${col + 1} 行`,
            char ? char : '空白',
            clue ? '提示字' : null,
            wasRevealed ? '已揭示' : null,
            wrong ? '填錯' : null
          ]
            .filter(Boolean)
            .join('，');

          return (
            <button
              key={`${row}-${col}`}
              type="button"
              role="gridcell"
              className={classes.join(' ')}
              aria-label={label}
              aria-selected={i === sel}
              aria-readonly={locked || undefined}
              onClick={() => onSelect(i)}
            >
              <span className="id-cell__char">{char || ''}</span>
              {wasRevealed && <span className="id-cell__mark" aria-hidden="true">◤</span>}
            </button>
          );
        })
      )}
    </div>
  );
}
