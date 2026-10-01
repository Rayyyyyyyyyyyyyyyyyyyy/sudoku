import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearGameSession,
  gameSessionPath,
  loadAnyGameSession
} from '../lib/gameSession';
import { DAILY_LEVEL, LEVELS, PUZZLE_COUNT, PUZZLE_POOLS } from '../lib/sudoku';
import { SudokuTrophies } from '../components/SudokuRewards';
import { medalProgress } from '../lib/sudokuRewards';
import { dayKey, emptyStats, fmt, loadStats, persistStats } from '../lib/stats';
import { SETTING_LABELS } from '../lib/settings';

export default function Home({ settings, toggleSetting }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(loadStats);
  const activeSession = useMemo(() => loadAnyGameSession(), []);
  const resumePath = activeSession ? gameSessionPath(activeSession) : null;

  const today = dayKey();
  const dailyMs = stats.daily && stats.daily[today];
  const summitLevel = LEVELS.length - 1;
  const summit = medalProgress(stats, summitLevel);

  const resetStats = useCallback(() => {
    if (confirm('清除所有紀錄？')) setStats(persistStats(emptyStats()));
  }, []);

  const startNewGame = useCallback(
    (path) => {
      if (
        activeSession &&
        !confirm('開始新題目會放棄目前未完成的進度。確定要繼續嗎？')
      ) {
        return;
      }
      if (activeSession) clearGameSession();
      navigate(path);
    },
    [activeSession, navigate]
  );

  return (
    <div className="sd-home">
      <div className="sd-header">
        <div className="sd-brand">
          <span className="sd-diamond" />
          <span className="sd-title">數獨刷題</span>
        </div>
        <span className="sd-kicker">Sudoku Drill</span>
      </div>
      <button type="button" className="sd-btn sd-back" onClick={() => navigate('/')}>
        ← 遊戲櫃
      </button>

      {activeSession && resumePath && (
        <section className="sd-resume" aria-label="未完成的數獨">
          <div className="sd-resume__meta">
            <strong>有未完成的題目</strong>
            <span>
              {LEVELS[activeSession.level]?.name ?? `難度 ${activeSession.level + 1}`}
              {activeSession.isDaily && ' · 每日一題'}
            </span>
          </div>
          <button
            type="button"
            className="sd-btn sd-btn--primary"
            onClick={() => navigate(resumePath)}
          >
            繼續
          </button>
        </section>
      )}

      <section className="sd-summit" aria-labelledby="sd-summit-title">
        <span className="sd-summit__label">BEYOND EXPERT · SE {LEVELS[summitLevel].rating}</span>
        <h2 id="sd-summit-title">專家之後，挑戰極限。</h2>
        <p>{PUZZLE_POOLS[summitLevel].length} 題更高評級的獨立挑戰。解開第一題，拿下極限初勝徽章；每次突破都會留在你的收藏。</p>
        <button type="button" className="sd-btn sd-btn--win" onClick={() => startNewGame(`/play/${summitLevel}`)}>挑戰極限 →</button>
        <span className="sd-summit__goal">{summit.next ? `下一枚：極限・${summit.next.name} · 還差 ${summit.remaining} 題` : '極限徽章已集齊 · 挑戰個人最佳時間'}</span>
      </section>

      <div className="sd-daily">
        <div className="sd-daily__meta">
          <span className="sd-daily__date">{today.replace(/-/g, ' / ')}</span>
          <span className="sd-daily__name">每日一題</span>
          <span className="sd-daily__status">
            {dailyMs ? '已完成 · ' + fmt(dailyMs) : `${LEVELS[DAILY_LEVEL].name}難度 · 每天換一題`}
          </span>
        </div>
        <button type="button" className="sd-btn sd-btn--primary" onClick={() => startNewGame('/daily')}>
          {dailyMs ? '再挑戰' : '開始'}
        </button>
      </div>

      <div className="sd-section">
        <span className="sd-kicker">選擇難度</span>
        {LEVELS.map((level, i) => (
          <button
            key={level.name}
            type="button"
            className={'sd-btn sd-level' + (i === LEVELS.length - 1 ? ' sd-level--expert' : '')}
            onClick={() => startNewGame(`/play/${i}`)}
          >
            <span className="sd-level__left">
              <span className="sd-level__name">{level.name}</span>
              <span className="sd-level__desc">{level.desc}</span>
            </span>
            <span className="sd-level__right">
              <span className="sd-level__best">
                {stats.best && stats.best[i] ? fmt(stats.best[i]) : '—'}
              </span>
              <span className="sd-level__count">
                已解 {(stats.count && stats.count[i]) || 0} 題
              </span>
            </span>
          </button>
        ))}
      </div>

      <SudokuTrophies stats={stats} />

      <div className="sd-section">
        <span className="sd-kicker">個人紀錄</span>
        <div className="sd-stats">
          <div className="sd-stat">
            <span className="sd-stat__value">{stats.solved || 0}</span>
            <span className="sd-stat__label">已解題數</span>
          </div>
          <div className="sd-stat">
            <span className="sd-stat__value">
              {stats.solved ? fmt(stats.totalMs / stats.solved) : '—'}
            </span>
            <span className="sd-stat__label">平均時間</span>
          </div>
          <div className="sd-stat">
            <span className="sd-stat__value sd-stat__value--accent">{stats.streak || 0}</span>
            <span className="sd-stat__label">連續天數</span>
          </div>
        </div>
      </div>

      <div className="sd-section">
        <span className="sd-kicker">玩法設定</span>
        <div className="sd-toggles">
          {Object.keys(SETTING_LABELS).map((key) => (
            <button
              key={key}
              type="button"
              className="sd-btn sd-toggle"
              aria-pressed={settings[key]}
              onClick={() => toggleSetting(key)}
            >
              <span>{SETTING_LABELS[key]}</span>
              <span className={'sd-toggle__state' + (settings[key] ? ' sd-toggle__state--on' : '')}>
                {settings[key] ? 'ON' : 'OFF'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="sd-foot">
        <span>{PUZZLE_COUNT.toLocaleString()} 題專業評級題庫 · 解唯一</span>
        <button type="button" className="sd-btn sd-foot__reset" onClick={resetStats}>
          清除紀錄
        </button>
      </div>
    </div>
  );
}
