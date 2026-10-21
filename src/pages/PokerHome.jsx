import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PokerCollection from '../components/PokerCollection';
import { POKER_RULES, opponentById } from '../data/poker/compatibility';
import { handLabel } from '../lib/poker/evaluate';
import { clearPokerSnapshot, loadPokerRecords, loadPokerSnapshot, startPokerRun } from '../lib/poker/persistence';

function newSeed() {
  if (globalThis.crypto?.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0];
  return Date.now() >>> 0;
}

export default function PokerHome() {
  const navigate = useNavigate();
  const [save, setSave] = useState(loadPokerSnapshot);
  const [pendingStart, setPendingStart] = useState(null);
  const records = useMemo(() => loadPokerRecords(), [save]);
  const active = save.status === 'ok' && !['run-won', 'run-lost'].includes(save.state.phase) ? save.state : null;
  const pendingCompletion = save.status === 'ok' && ['run-won', 'run-lost'].includes(save.state.phase) && !save.state.completion.recordsApplied;

  const start = () => {
    if (!pendingStart && active && !confirm('目前有可繼續的牌局。確定要以新牌局取代嗎？')) return;
    const options = pendingStart || { seed: newSeed(), now: Date.now() };
    if (!startPokerRun(options).persisted) {
      setPendingStart(options);
      return;
    }
    navigate('/poker/play');
  };

  const discardIncompatible = () => {
    clearPokerSnapshot();
    setSave({ status: 'empty' });
  };

  return (
    <main className="pkr-landing">
      <nav className="pkr-nav"><button type="button" onClick={() => navigate('/')}>← 遊戲櫃</button><span>POCKET TABLE / 01</span></nav>
      <header className="pkr-landing__hero">
        <span className="pkr-kicker">SEE THE HAND. SHAPE THE SCORE.</span>
        <h1>通勤牌局</h1>
        <p>在有限牌庫裡組成牌型，安排效果順序，穿過三階九回合。</p>
        <div className="pkr-landing__actions">
          {active && <button className="pkr-btn pkr-btn--primary" type="button" onClick={() => navigate('/poker/play')}>繼續牌局</button>}
          {pendingCompletion && <button className="pkr-btn pkr-btn--primary" type="button" onClick={() => navigate('/poker/play')}>重試保存牌局紀錄</button>}
          <button className={`pkr-btn ${active || pendingCompletion ? 'pkr-btn--ghost' : 'pkr-btn--primary'}`} type="button" disabled={pendingCompletion} onClick={start}>{active ? '開始新局' : '開始牌局'}</button>
        </div>
        {pendingCompletion && <p className="pkr-resume">上一局紀錄尚未保存，請先重試保存。</p>}
        {pendingStart && <div className="pkr-warning" role="alert"><strong>新局尚未保存</strong><p>原有牌局與紀錄保留。請重試保存後再開始。</p><button type="button" onClick={start}>重試保存</button></div>}
        {active && <p className="pkr-resume">已保存：{opponentById(active.opponentId).display.name} · 第 {active.stageIndex + 1} 階第 {active.roundIndex + 1} 回合 · {active.coins} 幣</p>}
        {save.status === 'incompatible' && (
          <div className="pkr-warning" role="alert"><strong>舊牌局無法安全續玩</strong><p>{save.reason} 個人紀錄仍保留。</p><button type="button" onClick={discardIncompatible}>清除舊牌局，再開始</button></div>
        )}
      </header>
      <PokerCollection records={records} />
      <section className="pkr-records" aria-label="牌局紀錄">
        <div><strong>{records.runsStarted}</strong><span>開始局數</span></div>
        <div><strong>{records.runsWon}</strong><span>獲勝局數</span></div>
        <div><strong>{records.highestCompletedScore}</strong><span>最高總分</span></div>
        <div><strong>{records.winStreak}</strong><span>連勝</span></div>
      </section>
      <details className="pkr-guide"><summary>規則與牌型表</summary><p>每回合抽到最多 {POKER_RULES.handSize.value} 張；每次選 1–5 張出牌或棄牌。計分為籌碼 × 倍率，達標會提早結束回合。</p><div className="pkr-guide__grid">{Object.entries(POKER_RULES.handValues).map(([id, entry]) => <span key={id}><b>{handLabel(id)}</b>{entry.value.chips} × {entry.value.mult}</span>)}</div><p>回合獎勵包含基本獎勵、剩餘出牌次數及每 5 幣 1 幣的利息（最多 5）。所有機制隨牌局自動保存。</p></details>
    </main>
  );
}
