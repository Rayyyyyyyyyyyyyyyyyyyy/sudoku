import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import IdiomBoard from '../components/IdiomBoard';
import IdiomPool from '../components/IdiomPool';
import { IDIOM_DAILY_LEVEL, IDIOM_DIFFICULTY_LEVELS, dailyIdiomSeed } from '../lib/idiom/index.js';
import { useIdiomGame } from '../lib/idiom/useIdiomGame.js';
import { dayKey, fmt } from '../lib/stats';

const randomSeed = () => Math.floor(Math.random() * 0xffffffff) >>> 0;

export default function IdiomGame({ daily = false, settings }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { level: levelParam } = useParams();

  const parsed = Number(levelParam);
  const level = daily
    ? IDIOM_DAILY_LEVEL
    : Number.isInteger(parsed) && parsed >= 0 && parsed < IDIOM_DIFFICULTY_LEVELS.length
      ? parsed
      : 0;

  const [fallbackSeed] = useState(randomSeed);
  const rawSeed = new URLSearchParams(location.search).get('seed');
  const querySeed = Number(rawSeed);
  const validQuerySeed =
    rawSeed !== null && Number.isInteger(querySeed) && querySeed >= 0 && querySeed <= 0xffffffff;
  const seed = daily ? dailyIdiomSeed(dayKey()) : validQuerySeed ? querySeed : fallbackSeed;

  // 比照數獨：seed 放進網址，完整重載後才生得出同一題。
  useEffect(() => {
    if (daily) return;
    if (!validQuerySeed) navigate(`/idiom/play/${level}?seed=${seed}`, { replace: true });
  }, [daily, level, navigate, seed, validQuerySeed]);

  const game = useIdiomGame({ level, seed, isDaily: daily });
  const { puzzle, sel, solved, full, elapsed, reveals, freeSlots, wrongCells } = game;
  const [showDefinitions, setShowDefinitions] = useState(false);

  const again = useCallback(() => {
    if (daily) navigate(`/idiom/play/${IDIOM_DAILY_LEVEL}`);
    else navigate(`/idiom/play/${level}?seed=${randomSeed()}`, { replace: true });
  }, [daily, level, navigate]);

  const config = IDIOM_DIFFICULTY_LEVELS[level];
  const marked = settings.idiomShowErrors ? wrongCells : new Set();

  return (
    <div className="sd-game id-game">
      <div className="sd-game__bar sd-width">
        <button type="button" className="sd-btn sd-back" onClick={() => navigate('/idiom')}>
          ← 成語填字
        </button>
        <div className="sd-game__title">
          {daily ? '每日一題' : config.name}
          <span className="id-game__meta">
            {puzzle.runs.length} 條 · {fmt(elapsed)}
            {reveals > 0 && ` · 揭示 ${reveals}`}
          </span>
        </div>
      </div>

      <IdiomBoard
        puzzle={puzzle}
        sel={sel}
        charAt={game.charAt}
        isLocked={game.isLocked}
        wrongCells={marked}
        revealed={game.state.revealed}
        onSelect={game.select}
      />

      <div className="id-actions sd-width">
        <button
          type="button"
          className="sd-btn"
          disabled={sel < 0 || game.isLocked(sel) || !game.charAt(sel)}
          onClick={() => game.clear(sel)}
        >
          清除這格
        </button>
        <button
          type="button"
          className="sd-btn"
          disabled={sel < 0 || game.isLocked(sel)}
          onClick={() => game.reveal(sel)}
        >
          揭示這格
        </button>
        <button type="button" className="sd-btn" onClick={again}>
          換一題
        </button>
      </div>

      <IdiomPool pool={puzzle.pool} freeSlots={freeSlots} disabled={solved} onPick={game.pick} />

      {full && !solved && (
        <p className="id-note sd-width" role="status">
          盤面填滿了，但還有位置不對。
          {!settings.idiomShowErrors && '（可在首頁打開「標示填錯的格子」）'}
        </p>
      )}

      {solved && (
        <div className="id-done sd-width" role="status">
          <strong>完成！</strong> 用時 {fmt(elapsed)}
          {reveals > 0 ? `，揭示 ${reveals} 格（不列入最佳時間）` : '，沒有使用揭示'}
          <button type="button" className="sd-btn" onClick={again}>
            再來一題
          </button>
        </div>
      )}

      <section className="id-runs sd-width">
        <button
          type="button"
          className="id-runs__toggle"
          aria-expanded={showDefinitions}
          onClick={() => setShowDefinitions((v) => !v)}
        >
          盤面上的成語（{puzzle.runs.length}） {showDefinitions ? '▲' : '▼'}
        </button>
        {showDefinitions && (
          <div className="id-runs__body">
            <ul className="id-runs__list">
              {puzzle.runs.map((run) => (
                <li key={run.id}>
                  <span className="id-runs__dir">{run.orientation === 'across' ? '橫' : '直'}</span>
                  {/* 未完成前不透露答案，否則這個面板就是免費的完整解答。 */}
                  <span className="id-runs__word">{solved ? run.idiom : '？？？？'}</span>
                </li>
              ))}
            </ul>
            {/* 釋義資料依 design 決議延後：全文數 MB，不與成語表同一個 chunk。 */}
            <p className="id-runs__pending">釋義尚未收錄於離線資料，之後版本補上。</p>
          </div>
        )}
      </section>
    </div>
  );
}
