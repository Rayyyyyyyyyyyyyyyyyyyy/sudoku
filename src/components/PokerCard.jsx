import { rankLabel, suitSymbol } from '../lib/poker/cards';

export default function PokerCard({
  card,
  selected = false,
  contributing = false,
  fresh = false,
  presentationIndex = 0,
  onToggle,
  interactive = true
}) {
  const red = ['diamonds', 'hearts'].includes(card.suit);
  const label = `${rankLabel(card.rank)}${suitSymbol(card.suit)}${selected ? '，已選' : ''}${contributing ? '，參與計分' : ''}${fresh ? '，新牌' : ''}`;
  const className = `pkr-card ${red ? 'pkr-card--red' : ''} ${selected ? 'is-selected' : ''} ${contributing ? 'is-contributing' : ''} ${fresh ? 'is-fresh' : ''}`;
  const contents = <>
      <span className="pkr-card__rank">{rankLabel(card.rank)}</span>
      <span className="pkr-card__suit" aria-hidden="true">{suitSymbol(card.suit)}</span>
      <span className="pkr-card__state">{fresh ? '新' : selected ? '已選' : contributing ? '計分' : '　'}</span>
    </>;
  const style = { '--pkr-card-index': presentationIndex };
  if (!interactive) return <li className={`${className} pkr-card--display`} aria-label={label} style={style}>{contents}</li>;
  return <button type="button" className={className} aria-label={label} aria-pressed={selected} onClick={() => onToggle(card.instanceId)} style={style}>{contents}</button>;
}
