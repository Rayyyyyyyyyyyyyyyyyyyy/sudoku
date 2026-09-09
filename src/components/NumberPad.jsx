const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function NumberPad({ values, pencil, onPlace }) {
  const used = {};
  values.forEach((v) => {
    if (v) used[v] = (used[v] || 0) + 1;
  });

  return (
    <div className="game-controls game-column sd-pad" aria-label="數字鍵盤">
      {DIGITS.map((d) => {
        const left = 9 - (used[d] || 0);
        const out = left <= 0;
        return (
          <button
            key={d}
            type="button"
            className={'sd-btn sd-pad__key' + (!out && pencil ? ' sd-pad__key--pencil' : '')}
            disabled={out}
            onClick={() => onPlace(d)}
          >
            <span className="sd-pad__digit">{d}</span>
            <span className="sd-pad__left">{out ? '✓' : left}</span>
          </button>
        );
      })}
    </div>
  );
}
