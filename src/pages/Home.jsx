import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SettingsList from '../components/SettingsList';
import {
  clearGameSession,
  gameSessionPath,
  loadAnyGameSession
} from '../lib/gameSession';
import { DAILY_LEVEL, LEVELS } from '../lib/sudoku';
import { dayKey, emptyStats, fmt, loadStats, persistStats } from '../lib/stats';
import { SUDOKU_SETTING_KEYS } from '../lib/settings';

export default function Home({ settings, toggleSetting }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(loadStats);
  const activeSession = useMemo(() => loadAnyGameSession(), []);
  const resumePath = activeSession ? gameSessionPath(activeSession) : null;

  const today = dayKey();
  const dailyMs = stats.daily && stats.daily[today];

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
    <main className="game-home">
      <header className="game-home__header">
        <div className="game-brand">
          <span className="sd-diamond" />
          <h1 className="game-title">數獨刷題</h1>
        </div>
        <span className="game-kicker sd-kicker">Sudoku Drill</span>
      </header>
      <button type="button" className="sd-btn sd-back" onClick={() => navigate('/')}>
        ← 遊戲櫃
      </button>

      {activeSession && resumePath && (
        <section className="game-card sd-resume" aria-label="未完成的數獨">
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

      <section className="game-card game-card--primary sd-daily" aria-labelledby="sudoku-daily-title">
        <div className="sd-daily__meta">
          <span className="sd-daily__date">{today.replace(/-/g, ' / ')}</span>
          <h2 className="sd-daily__name" id="sudoku-daily-title">每日一題</h2>
          <span className="sd-daily__status">
            {dailyMs ? '已完成 · ' + fmt(dailyMs) : `${LEVELS[DAILY_LEVEL].name}難度 · 每天換一題`}
          </span>
        </div>
        <button type="button" className="sd-btn sd-btn--primary" onClick={() => startNewGame('/daily')}>
          {dailyMs ? '再挑戰' : '開始'}
        </button>
      </section>

      <section className="game-section" aria-labelledby="sudoku-levels-title">
        <h2 className="game-kicker sd-kicker" id="sudoku-levels-title">選擇難度</h2>
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
      </section>

      <section className="game-section" aria-labelledby="sudoku-stats-title">
        <h2 className="game-kicker sd-kicker" id="sudoku-stats-title">個人紀錄</h2>
        <div className="game-stats">
          <div className="game-stat">
            <strong>{stats.solved || 0}</strong>
            <span>已解題數</span>
          </div>
          <div className="game-stat">
            <strong>
              {stats.solved ? fmt(stats.totalMs / stats.solved) : '—'}
            </strong>
            <span>平均時間</span>
          </div>
          <div className="game-stat">
            <strong className="game-stat__value--accent">{stats.streak || 0}</strong>
            <span>連續天數</span>
          </div>
        </div>
      </section>

      <section className="game-section" aria-labelledby="sudoku-settings-title">
        <h2 className="game-kicker sd-kicker" id="sudoku-settings-title">玩法設定</h2>
        <SettingsList
          settingKeys={SUDOKU_SETTING_KEYS}
          settings={settings}
          toggleSetting={toggleSetting}
        />
      </section>

      <footer className="game-footer sd-foot">
        <span>1,000 題專業評級題庫 · 解唯一</span>
        <button type="button" className="sd-btn sd-foot__reset" onClick={resetStats}>
          清除紀錄
        </button>
      </footer>
    </main>
  );
}
