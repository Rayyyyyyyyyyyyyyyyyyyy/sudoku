import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Board from '../components/Board';
import NumberPad from '../components/NumberPad';
import { DAILY_LEVEL, LEVELS, dailySeed, randomSeed } from '../lib/sudoku';
import { dayKey, fmt } from '../lib/stats';
import { useGame } from '../lib/useGame';

export default function Game({ daily = false, settings }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { level: levelParam } = useParams();

  const parsed = Number(levelParam);
  const level = daily
    ? DAILY_LEVEL
    : Number.isInteger(parsed) && parsed >= 0 && parsed < LEVELS.length
      ? parsed
      : 0;

  const [fallbackSeed] = useState(randomSeed);
  const rawSeed = new URLSearchParams(location.search).get('seed');
  const querySeed = Number(rawSeed);
  const validQuerySeed =
    rawSeed !== null && Number.isInteger(querySeed) && querySeed >= 0 && querySeed <= 0xffffffff;
  const seed = daily ? dailySeed(dayKey()) : validQuerySeed ? querySeed : fallbackSeed;

  // seed 放進網址，完整重載後才能生成同一題；replace 避免留下沒有 seed 的歷史紀錄。
  useEffect(() => {
    if (daily) return;
    if (!validQuerySeed) navigate(`/play/${level}?seed=${seed}`, { replace: true });
  }, [daily, level, navigate, seed, validQuerySeed]);

  const game = useGame({ level, seed, isDaily: daily, settings });
  const { board, values, notes, sel, select, pencil, togglePencil, solved, elapsed } = game;

  // 每日一題重玩時換成同難度的隨機題,和原本的行為一致。
  const again = useCallback(() => {
    if (daily) navigate(`/play/${DAILY_LEVEL}`);
    else navigate(`/play/${level}?seed=${randomSeed()}`, { replace: true });
  }, [daily, level, navigate]);

  return (
    <main className="game-frame">
      <header className="game-topbar game-column">
        <button type="button" className="sd-btn sd-back" onClick={() => navigate('/sudoku')}>
          ← 數獨首頁
        </button>
        <h1 className="game-heading">
          {LEVELS[level].name}
          {board ? ` · SE ${board.rating}` : ''}
          {daily ? ' · 每日一題' : ''} · {fmt(elapsed)}
        </h1>
      </header>

      <section className="game-stage game-stage--board sd-board-wrap" aria-label="數獨盤面">
        {board && values ? (
          <Board
            board={board}
            values={values}
            notes={notes}
            sel={sel}
            onSelect={select}
            settings={settings}
          />
        ) : (
          <div className="sd-loading">產生題目中…</div>
        )}

        {solved && (
          <div className="sd-win">
            <span className="sd-diamond" style={{ width: 15, height: 15 }} />
            <span className="sd-win__title">完成</span>
            <span className="sd-win__time">
              {LEVELS[level].name} · {fmt(game.finalMs ?? elapsed)}
            </span>
            <div className="sd-win__actions">
              <button type="button" className="sd-btn sd-btn--win" onClick={again}>
                再來一題
              </button>
              <button type="button" className="sd-btn sd-btn--ghost" onClick={() => navigate('/sudoku')}>
                回數獨首頁
              </button>
            </div>
          </div>
        )}
      </section>

      {values && <NumberPad values={values} pencil={pencil} onPlace={game.place} />}

      <div className="game-controls game-column sd-tools">
        <button
          type="button"
          className={'sd-btn sd-tool' + (pencil ? ' sd-tool--on' : '')}
          onClick={togglePencil}
        >
          鉛筆註記 <span className="sd-tool__state">{pencil ? 'ON' : 'OFF'}</span>
        </button>
        <button type="button" className="sd-btn sd-tool" onClick={game.erase}>
          清除
        </button>
        <button type="button" className="sd-btn sd-tool" onClick={again}>
          新題目
        </button>
      </div>

      <div className="game-status game-column sd-hint">鍵盤：1–9 填入 · 0/Backspace 清除 · 方向鍵移動 · N 切換註記</div>
    </main>
  );
}
