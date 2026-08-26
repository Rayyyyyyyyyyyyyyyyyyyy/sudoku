import { rankLabel, suitSymbol } from '../lib/poker/cards';

export default function PokerCard({ card, selected, contributing, onToggle, disabled = false }) {
  const red = ['diamonds', 'hearts'].includes(card.suit);
  const label = `${rankLabel(card.rank)}${suitSymbol(card.suit)}${selected ? '，已選' : ''}${contributing ? '，參與計分' : ''}`;
  return (
    <button
      type="button"
      className={`pkr-card ${red ? 'pkr-card--red' : ''} ${selected ? 'is-selected' : ''} ${contributing ? 'is-contributing' : ''}`}
      aria-label={label}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onToggle(card.instanceId)}
    >
      <span className="pkr-card__rank">{rankLabel(card.rank)}</span>
      <span className="pkr-card__suit" aria-hidden="true">{suitSymbol(card.suit)}</span>
      <span className="pkr-card__state">{selected ? '已選' : contributing ? '計分' : '　'}</span>
    </button>
  );
}
