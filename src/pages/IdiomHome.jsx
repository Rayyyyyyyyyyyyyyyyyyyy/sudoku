import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IDIOM_DAILY_LEVEL, IDIOM_DIFFICULTY_LEVELS } from '../lib/idiom/index.js';
import {
  clearIdiomSnapshot,
  loadIdiomRecords,
  loadIdiomSnapshot
} from '../lib/idiom/persistence.js';
import { SETTING_LABELS } from '../lib/settings';
import { fmt } from '../lib/stats';

const randomSeed = () => Math.floor(Math.random() * 0xffffffff) >>> 0;

export default function IdiomHome({ settings, toggleSetting }) {
  const navigate = useNavigate();
  const records = useMemo(() => loadIdiomRecords(), []);
  const save = useMemo(() => loadIdiomSnapshot(), []);
  const active = save.status === 'ok' ? save.snapshot : null;

  return (
    <main className="sd-home id-home">
      <div className="sd-game__bar sd-width">
        <button type="button" className="sd-btn sd-back" onClick={() => navigate('/')}>
          ← 遊戲櫃
        </button>
        <div className="sd-game__title">成語填字</div>
      </div>

      <section className="sd-width">
        <p className="id-home__lede">
          縱橫交錯的成語盤面，交叉處共用一個字。點格子，再點下方的候選字填入。
          每一步都會存檔，隨時可以關掉。
        </p>
      </section>

      {active && (
        <section className="sd-width id-resume">
          <div>
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
        <section className="sd-width id-resume id-resume--warning">
          <div>
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

      <section className="sd-width">
        <h2 className="id-h2">每日一題</h2>
        <button
          type="button"
          className="sd-btn sd-btn--primary id-daily"
          onClick={() => navigate('/idiom/daily')}
        >
          今天的題目（{IDIOM_DIFFICULTY_LEVELS[IDIOM_DAILY_LEVEL].name}）
        </button>
      </section>

      <section className="sd-width">
        <h2 className="id-h2">選擇難度</h2>
        <div className="id-levels">
          {IDIOM_DIFFICULTY_LEVELS.map((config) => (
            <button
              key={config.level}
              type="button"
              className="id-level"
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

      <section className="sd-width">
        <h2 className="id-h2">紀錄</h2>
        <p className="id-records">
          完成 {records.solved} 題（其中 {records.assisted} 題用過揭示，不列入最佳時間） ·
          連續 {records.streak} 天
        </p>
      </section>

      <section className="sd-width">
        <h2 className="id-h2">玩法設定</h2>
        <label className="sd-toggle">
          <input
            type="checkbox"
            checked={settings.idiomShowErrors}
            onChange={() => toggleSetting('idiomShowErrors')}
          />
          <span>{SETTING_LABELS.idiomShowErrors}</span>
        </label>
      </section>
    </main>
  );
}
