const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function cellStyle({ fixed, wrong, isSel, peer, same, r, c }) {
  let background = fixed ? '#F1EEE5' : '#FFFFFF';
  if (peer) background = fixed ? '#E9E5DA' : '#F5F3EB';
  if (same) background = '#D7EEE5';
  if (isSel) background = '#B4E5D3';
  if (wrong) background = isSel ? '#F4CDAE' : '#F8E2CE';

  return {
    background,
    color: wrong ? '#B4551A' : fixed ? '#16181D' : '#0E8C6B',
    fontWeight: fixed ? 600 : 500,
    // 每 3 格加粗一條線,畫出九宮格
    borderRight: c % 3 === 2 && c < 8 ? '2px solid #16181D' : c < 8 ? '1px solid #DED9CD' : 'none',
    borderBottom: r % 3 === 2 && r < 8 ? '2px solid #16181D' : r < 8 ? '1px solid #DED9CD' : 'none'
  };
}

export default function Board({ board, values, notes, sel, onSelect, settings }) {
  const selVal = sel >= 0 ? values[sel] : 0;
  const sr = sel >= 0 ? Math.floor(sel / 9) : -1;
  const sc = sel >= 0 ? sel % 9 : -1;
  const sb = sel >= 0 ? Math.floor(sr / 3) * 3 + Math.floor(sc / 3) : -1;

  return (
    <div className="sd-board sd-width">
      {values.map((val, i) => {
        const r = Math.floor(i / 9);
        const c = i % 9;
        const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
        const fixed = !!board.puzzle[i];
        const wrong = settings.showErrors && !!val && val !== board.solution[i];
        const isSel = i === sel;
        const peer =
          settings.highlightPeers && sel >= 0 && !isSel && (r === sr || c === sc || b === sb);
        const same = sel >= 0 && !isSel && !!selVal && val === selVal;
        const cellNotes = notes[i];

        return (
          <button
            key={i}
            type="button"
            className="sd-cell"
            style={cellStyle({ fixed, wrong, isSel, peer, same, r, c })}
            aria-label={`第 ${r + 1} 列第 ${c + 1} 行${val ? ` · ${val}` : ' · 空白'}`}
            onClick={() => onSelect(i)}
          >
            {val ? (
              <span>{val}</span>
            ) : cellNotes.length > 0 ? (
              <div className="sd-cell__notes">
                {DIGITS.map((n) => (
                  <span key={n} className="sd-cell__note">
                    {cellNotes.includes(n) ? n : ''}
                  </span>
                ))}
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
