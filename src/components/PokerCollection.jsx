import { MODIFIERS } from '../data/poker/compatibility.js';
import { getPokerCollectionProgress, parsePokerRecords } from '../lib/poker/persistence.js';
import './pokerCollection.css';

export default function PokerCollection({ records }) {
  const discoveredIds = new Set(parsePokerRecords(records).discoveredModifierIds);
  const { collected, total } = getPokerCollectionProgress(records);

  return <section className="pkr-collection" aria-labelledby="pkr-collection-title">
    <header className="pkr-collection__header">
      <div><span className="pkr-collection__eyebrow">每一局，都留下新發現</span><h2 id="pkr-collection-title">效果牌收藏</h2></div>
      <strong className="pkr-collection__count">已發現 {collected} / {total}</strong>
    </header>
    <progress aria-label="效果牌收藏進度" value={collected} max={total} />
    <p className="pkr-collection__target">{collected < total
      ? `下一收藏目標：找到第 ${collected + 1} 種效果牌。`
      : '效果牌圖鑑已集齊！下一局試試不同的搭配。'}</p>
    <p className="pkr-collection__copy">在補給站或選擇包取得新效果牌，就會收入圖鑑。即使落敗或賣出，也留下這次發現。</p>
    <p className="pkr-collection__note">收藏跨局保留；每局效果仍於牌局中取得。</p>
    <details className="pkr-collection__album">
      <summary>查看效果牌圖鑑</summary>
      <ul className="pkr-collection__grid">
        {MODIFIERS.map((item, index) => <li key={item.id}>
          {discoveredIds.has(item.id)
            ? <details className="pkr-collection__card pkr-collection__card--discovered">
              <summary><span className="pkr-collection__number">{String(index + 1).padStart(2, '0')} · 已收藏</span><strong>{item.display.name}</strong><span className="pkr-collection__hint">查看效果</span></summary>
              <p>{item.display.description}</p>
            </details>
            : <div className="pkr-collection__card pkr-collection__card--unknown" aria-label={`第 ${index + 1} 張，尚未發現`}>
              <span className="pkr-collection__number">{String(index + 1).padStart(2, '0')}</span><strong aria-hidden="true">?</strong><span>尚未發現</span>
            </div>}
        </li>)}
      </ul>
    </details>
  </section>;
}
