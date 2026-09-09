import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import SettingsList from '../components/SettingsList.jsx';
import { IDIOM_DAILY_LEVEL, IDIOM_DIFFICULTY_LEVELS } from '../lib/idiom/index.js';
import {
  clearIdiomSnapshot,
  loadIdiomRecords,
  loadIdiomSnapshot
} from '../lib/idiom/persistence.js';
import { IDIOM_SETTING_KEYS } from '../lib/settings';
import { fmt } from '../lib/stats';

const randomSeed = () => Math.floor(Math.random() * 0xffffffff) >>> 0;

export default function IdiomHome({ settings, toggleSetting }) {
  const navigate = useNavigate();
  const records = useMemo(() => loadIdiomRecords(), []);
  const save = useMemo(() => loadIdiomSnapshot(), []);
  const active = save.status === 'ok' ? save.snapshot : null;

  return (
    <main className="game-home">
      <header className="game-home__header">
        <div className="game-brand">
          <span className="sd-diamond" />
          <h1 className="game-title">成語填字</h1>
        </div>
        <span className="game-kicker">Idiom Crossword</span>
      </header>
      <nav className="game-column game-home__nav" aria-label="返回遊戲櫃">
        <button type="button" className="sd-btn sd-back" onClick={() => navigate('/')}>
          ← 遊戲櫃
        </button>
      </nav>

      <section className="game-section">
        <p className="id-home__lede">
          縱橫交錯的成語盤面，交叉處共用一個字。點格子，再點下方的候選字填入。
          每一步都會存檔，隨時可以關掉。
        </p>
      </section>

      {active && (
        <section className="game-card id-resume" aria-label="未完成的成語填字">
          <div className="game-card__meta">
            <strong>有未完成的題目</strong>
            <span>
              {IDIOM_DIFFICULTY_LEVELS[active.level]?.name ?? `難度 ${active.level}`}
              {active.daily && ' · 每日一題'} · {fmt(active.elapsedMs)}
            </span>
          </div>
          <div className="id-resume__actions">
            <button
              type="button"
              className="sd-btn sd-btn--primary"
              onClick={() =>
                navigate(
                  active.daily ? '/idiom/daily' : `/idiom/play/${active.level}?seed=${active.seed}`
                )
              }
            >
              繼續
            </button>
            <button
              type="button"
              className="sd-btn"
              onClick={() => {
                clearIdiomSnapshot();
                navigate(0);
              }}
            >
              放棄
            </button>
          </div>
        </section>
      )}

      {save.status === 'incompatible' && (
        <section className="game-card id-resume id-resume--warning" role="alert">
          <div className="game-card__meta">
            <strong>存檔版本需要處理</strong>
            <span>紀錄已保留，進行中的題目無法載入。清除後即可開新題。</span>
          </div>
          <button
            type="button"
            className="sd-btn"
            onClick={() => {
              clearIdiomSnapshot();
              navigate(0);
            }}
          >
            清除存檔
          </button>
        </section>
      )}

      <section className="game-card game-card--primary id-daily-card" aria-labelledby="idiom-daily-title">
        <div className="game-card__meta">
          <span className="game-kicker">Daily</span>
          <h2 id="idiom-daily-title">每日一題</h2>
          <span>{IDIOM_DIFFICULTY_LEVELS[IDIOM_DAILY_LEVEL].name}難度 · 每天換一題</span>
        </div>
        <button
          type="button"
          className="sd-btn sd-btn--primary id-daily"
          onClick={() => navigate('/idiom/daily')}
        >
          開始
        </button>
      </section>

      <section className="game-section" aria-labelledby="idiom-levels-title">
        <h2 className="game-kicker" id="idiom-levels-title">選擇難度</h2>
        <div className="id-levels">
          {IDIOM_DIFFICULTY_LEVELS.map((config) => (
            <button
              key={config.level}
              type="button"
              className="game-card id-level"
              onClick={() => navigate(`/idiom/play/${config.level}?seed=${randomSeed()}`)}
            >
              <span className="id-level__name">{config.name}</span>
              <span className="id-level__desc">{config.desc}</span>
              <span className="id-level__stat">
                最佳 {fmt(records.best[config.level])} · 完成 {records.count[config.level] || 0}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="game-section" aria-labelledby="idiom-records-title">
        <h2 className="game-kicker" id="idiom-records-title">個人紀錄</h2>
        <div className="game-stats">
          <div className="game-stat"><strong>{records.solved}</strong><span>完成題數</span></div>
          <div className="game-stat"><strong>{records.assisted}</strong><span>使用揭示</span></div>
          <div className="game-stat"><strong>{records.streak}</strong><span>連續天數</span></div>
        </div>
      </section>

      <section className="game-section" aria-labelledby="idiom-settings-title">
        <h2 className="game-kicker" id="idiom-settings-title">玩法設定</h2>
        <SettingsList
          settingKeys={IDIOM_SETTING_KEYS}
          settings={settings}
          toggleSetting={toggleSetting}
        />
      </section>
      <footer className="game-footer">交叉共字 · 確定性題盤 · 自動存檔</footer>
    </main>
  );
}
