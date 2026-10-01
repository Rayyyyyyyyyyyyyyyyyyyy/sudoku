import { useEffect, useRef } from 'react';
import { LEVELS } from '../lib/sudoku';
import { MEDAL_STEPS, medalProgress } from '../lib/sudokuRewards';
import { fmt } from '../lib/stats';
import './sudokuRewards.css';

function Medal({ tone = 'locked', large = false }) {
  return (
    <svg className={`sd-medal sd-medal--${tone}${large ? ' sd-medal--large' : ''}`} viewBox="0 0 80 92" aria-hidden="true">
      <path className="sd-medal__ribbon" d="M19 54 13 90 31 81 40 90 49 81 67 90 61 54Z" />
      <path d="m40 3 10 6 12 2 6 11 9 9-2 13 2 12-9 9-6 11-12 2-10 6-10-6-12-2-6-11-9-9 2-12-2-13 9-9 6-11 12-2Z" />
      <circle cx="40" cy="43" r="25" />
      <path className="sd-medal__mark" d="m40 23 15 20-15 20-15-20Z" />
      <path className="sd-medal__detail" d="M40 23v40M25 43h30" />
    </svg>
  );
}

export function SudokuTrophies({ stats }) {
  const progress = LEVELS.map((_, level) => medalProgress(stats, level));
  const earned = progress.reduce((sum, entry) => sum + entry.earned.length, 0);
  return (
    <section className="sd-trophies" aria-labelledby="sd-trophies-title">
      <div className="sd-trophies__heading">
        <div><span className="sd-kicker">每一次解開，都留下成果</span><h2 id="sd-trophies-title">你的解題徽章</h2></div>
        <span>{earned} / {LEVELS.length * MEDAL_STEPS.length}</span>
      </div>
      <p className="sd-trophies__intro">每個難度累計完成 1、5、20 題，收下初勝、熟練、精通徽章。既有紀錄也計入。</p>
      <div className="sd-trophies__grid">
        {progress.map((entry, level) => (
          <article className={`sd-trophy${entry.current ? ' is-earned' : ''}`} key={level}>
            <Medal tone={entry.current?.tone} />
            <h3>{LEVELS[level].name}</h3>
            <strong>{entry.current?.name ?? '等待首勝'}</strong>
            <span>{entry.count} 題完成</span>
            <div className="sd-trophy__steps" aria-label={entry.earned.length ? `已獲得${entry.earned.map(medal => medal.name).join('、')}` : '尚未獲得徽章'}>
              {MEDAL_STEPS.map(medal => <i key={medal.id} className={entry.count >= medal.target ? `is-${medal.tone}` : ''} aria-hidden="true" />)}
            </div>
            <small>{entry.next ? `再 ${entry.remaining} 題獲得${entry.next.name}` : '三枚徽章已集齊'}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SudokuCompletion({ reward, rating, daily, onAgain, onHarder, onHome }) {
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const medal = reward.persisted ? reward.newMedals.at(-1) : null;
  const title = medal ? `${LEVELS[reward.level].name}・${medal.name}達成` : reward.persisted && reward.newBest ? '刷新個人最佳！' : '這一題，解開了。';
  return (
    <section className="sd-victory sd-width" aria-labelledby="sd-victory-title">
      <div className="sd-victory__sparks" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ '--spark': i }} />)}</div>
      <Medal tone={medal?.tone ?? 'gold'} large />
      <span className="sd-victory__eyebrow">{daily ? '每日挑戰完成' : 'SUDOKU · CHALLENGE CLEARED'}</span>
      <h2 id="sd-victory-title" ref={heading} tabIndex={-1}>{title}</h2>
      <p>{LEVELS[reward.level].name} · SE {rating}{reward.persisted && ` · 第 ${reward.count} 次完成此難度`}</p>
      <div className={`sd-victory__stats${reward.persisted ? '' : ' sd-victory__stats--unsaved'}`}>
        <div><strong>{fmt(reward.ms)}</strong><span>本次用時</span></div>
        {reward.persisted && <><div><strong>{reward.totalSolved}</strong><span>累計解題</span></div>
        <div><strong>{reward.streak}</strong><span>連續天數</span></div></>}
      </div>
      {!reward.persisted && <p role="status">這一題已完成，但本次紀錄與徽章未存入這台裝置。</p>}
      {reward.persisted && reward.newBest && <p className="sd-victory__record">個人新紀錄 · 比上次最佳快 {fmt(reward.improvementMs)}<small>原紀錄 {fmt(reward.previousBest)}</small></p>}
      {reward.persisted && reward.firstClear && <p className="sd-victory__record">你已跨過「{LEVELS[reward.level].name}」的第一道門檻。</p>}
      {medal && <p className="sd-victory__earned">本次獲得徽章 · {LEVELS[reward.level].name} {medal.name}</p>}
      {reward.persisted && (reward.next ? (
        <div className="sd-victory__next">
          <span>下一個目標：{LEVELS[reward.level].name}・{reward.next.name}</span>
          <progress aria-label={`距離${reward.next.name}徽章的進度`} value={Math.min(reward.count, reward.next.target)} max={reward.next.target} />
          <small>{reward.count} / {reward.next.target} 題 · 再完成 {reward.remaining} 題</small>
        </div>
      ) : <p className="sd-victory__earned">此難度三枚徽章已集齊。下一題，挑戰自己的最佳時間。</p>)}
      <div className="sd-victory__actions">
        {onHarder && <button type="button" className="sd-btn sd-btn--win" onClick={onHarder}>挑戰{LEVELS[reward.level + 1].name} →</button>}
        <button type="button" className={`sd-btn ${onHarder ? 'sd-btn--ghost' : 'sd-btn--win'}`} onClick={onAgain}>再來一題</button>
        <button type="button" className="sd-btn sd-victory__home" onClick={onHome}>{reward.persisted ? '回首頁看徽章' : '回首頁'}</button>
      </div>
    </section>
  );
}
