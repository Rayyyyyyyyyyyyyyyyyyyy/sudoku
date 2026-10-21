import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { opponentById } from '../data/poker/compatibility';
import { gameSessionPath, loadAnyGameSession } from '../lib/gameSession';
import { getPokerCollectionProgress, loadPokerRecords, loadPokerSnapshot } from '../lib/poker/persistence';
import { loadStats } from '../lib/stats';
import { LEVELS } from '../lib/sudoku';
import { MEDAL_STEPS, medalProgress } from '../lib/sudokuRewards';
import './hubCollection.css';

export default function GameHub() {
  const navigate = useNavigate();
  const sudokuSession = useMemo(() => loadAnyGameSession(), []);
  const sudokuResumePath = sudokuSession ? gameSessionPath(sudokuSession) : null;
  const pokerSave = useMemo(() => loadPokerSnapshot(), []);
  const poker = pokerSave.status === 'ok' ? pokerSave.state : null;
  const activePoker = poker && !['run-won', 'run-lost'].includes(poker.phase) ? poker : null;
  const terminalPoker = poker && ['run-won', 'run-lost'].includes(poker.phase) ? poker : null;
  const pendingPokerRecords = terminalPoker && !terminalPoker.completion.recordsApplied;
  const opponent = poker ? opponentById(poker.opponentId) : null;
  const sudokuMedals = useMemo(() => {
    const stats = loadStats();
    return LEVELS.reduce((sum, _, level) => sum + medalProgress(stats, level).earned.length, 0);
  }, []);
  const pokerCollection = useMemo(() => getPokerCollectionProgress(loadPokerRecords()), []);

  return (
    <main className="hub-page">
      <header className="hub-hero">
        <span className="hub-eyebrow">OFFLINE POCKET GAMES</span>
        <h1>通勤遊戲櫃</h1>
        <p>解開難題，收下新發現。每次遊玩，都留下自己的收藏。</p>
      </header>
      <section className="hub-grid" aria-label="選擇遊戲">
        <article className="hub-card hub-card--sudoku">
          <span className="hub-card__mark" aria-hidden="true">◇</span>
          <div><span className="hub-eyebrow">LOGIC</span><h2>數獨刷題</h2></div>
          <p>從每日題到極限挑戰，攻克更難的盤面，收下自己的解題徽章。</p>
          <div className="hub-collection"><strong>解題徽章 {sudokuMedals} / {LEVELS.length * MEDAL_STEPS.length}</strong><span>首勝、熟練、精通，記下每個難度的突破。</span></div>
          {sudokuSession && <p className="hub-session"><span>●</span> 有未完成題目 · 難度 {sudokuSession.level + 1}</p>}
          <button
            className="hub-action"
            type="button"
            onClick={() => navigate(sudokuResumePath ?? '/sudoku')}
          >
            {sudokuResumePath ? '繼續數獨' : '進入數獨'} <span>→</span>
          </button>
        </article>
        <article className="hub-card hub-card--poker">
          <span className="hub-card__mark" aria-hidden="true">♠</span>
          <div><span className="hub-eyebrow">CARDS · ROGUELIKE</span><h2>通勤牌局</h2></div>
          <p>有限牌庫、牌型計分、效果排序與九回合挑戰。</p>
          <div className="hub-collection"><strong>效果牌圖鑑 {pokerCollection.collected} / {pokerCollection.total}</strong><span>取得過的效果牌會留下收藏，敗局也保留。</span></div>
          {activePoker && (
            <p className="hub-session"><span>●</span> {opponent.display.name} · 第 {activePoker.stageIndex + 1} 階 / 第 {activePoker.roundIndex + 1} 回合</p>
          )}
          {terminalPoker && <p className="hub-session">{pendingPokerRecords ? '上一局已結束 · 紀錄待保存' : '上一局已結束 · 紀錄已保存'}</p>}
          {pokerSave.status === 'incompatible' && <p className="hub-session hub-session--warning">儲存版本需要處理</p>}
          <button className="hub-action" type="button" onClick={() => navigate(pendingPokerRecords ? '/poker/play' : '/poker')}>{activePoker ? '繼續牌局' : pendingPokerRecords ? '重試保存牌局紀錄' : terminalPoker ? '查看紀錄' : '進入牌局'} <span>→</span></button>
        </article>
      </section>
      <footer className="hub-footer">本機儲存 · 不需登入 · 原創介面與幾何圖像</footer>
    </main>
  );
}
