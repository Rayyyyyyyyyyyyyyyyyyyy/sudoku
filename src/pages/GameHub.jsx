import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { opponentById } from '../data/poker/compatibility';
import { loadAnyGameSession } from '../lib/gameSession';
import { loadPokerSnapshot } from '../lib/poker/persistence';

export default function GameHub() {
  const navigate = useNavigate();
  const sudokuSession = useMemo(() => loadAnyGameSession(), []);
  const pokerSave = useMemo(() => loadPokerSnapshot(), []);
  const poker = pokerSave.status === 'ok' ? pokerSave.state : null;
  const activePoker = poker && !['run-won', 'run-lost'].includes(poker.phase) ? poker : null;
  const terminalPoker = poker && ['run-won', 'run-lost'].includes(poker.phase) ? poker : null;
  const opponent = poker ? opponentById(poker.opponentId) : null;

  return (
    <main className="hub-page">
      <header className="hub-hero">
        <span className="hub-eyebrow">OFFLINE POCKET GAMES</span>
        <h1>通勤遊戲櫃</h1>
        <p>兩種節奏，一個離線入口。進度會留在這台裝置。</p>
      </header>
      <section className="hub-grid" aria-label="選擇遊戲">
        <article className="hub-card hub-card--sudoku">
          <span className="hub-card__mark" aria-hidden="true">◇</span>
          <div><span className="hub-eyebrow">LOGIC</span><h2>數獨刷題</h2></div>
          <p>每日題、五種難度與原有個人紀錄完整保留。</p>
          {sudokuSession && <p className="hub-session"><span>●</span> 有未完成題目 · 難度 {sudokuSession.level + 1}</p>}
          <button className="hub-action" type="button" onClick={() => navigate('/sudoku')}>進入數獨 <span>→</span></button>
        </article>
        <article className="hub-card hub-card--poker">
          <span className="hub-card__mark" aria-hidden="true">♠</span>
          <div><span className="hub-eyebrow">CARDS · ROGUELIKE</span><h2>通勤牌局</h2></div>
          <p>有限牌庫、牌型計分、效果排序與九回合挑戰。</p>
          {activePoker && (
            <p className="hub-session"><span>●</span> {opponent.display.name} · 第 {activePoker.stageIndex + 1} 階 / 第 {activePoker.roundIndex + 1} 回合</p>
          )}
          {terminalPoker && <p className="hub-session">上一局已結束 · 紀錄已保存</p>}
          {pokerSave.status === 'incompatible' && <p className="hub-session hub-session--warning">儲存版本需要處理</p>}
          <button className="hub-action" type="button" onClick={() => navigate('/poker')}>{activePoker ? '繼續牌局' : terminalPoker ? '查看紀錄' : '進入牌局'} <span>→</span></button>
        </article>
      </section>
      <footer className="hub-footer">本機儲存 · 不需登入 · 原創介面與幾何圖像</footer>
    </main>
  );
}
