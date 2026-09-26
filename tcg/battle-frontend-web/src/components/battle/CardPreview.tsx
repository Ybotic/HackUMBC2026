import type { BattleCard } from '@/battle/types';

export default function CardPreview({
  card,
  attachable = false,
  pendingAttachment = false,
  onAttach,
  onClose,
}: {
  card: BattleCard;
  attachable?: boolean;
  pendingAttachment?: boolean;
  onAttach?: () => void;
  onClose: () => void;
}) {
  const remainingHp = Math.max(0, (card.hp ?? 0) - (card.damage ?? 0));
  const label =
    card.cardType === 'supporter'
      ? 'SUPPORTER'
      : card.cardType === 'tool'
        ? 'POKÉMON TOOL'
        : card.cardType === 'stadium'
          ? 'STADIUM'
          : card.cardType === 'item'
            ? 'ITEM'
            : card.category === 'creature'
              ? 'POKÉMON'
              : card.category === 'energy'
                ? 'BASIC ENERGY'
                : 'TRAINER';

  return (
    <aside
      className="card-focus-panel"
      aria-label={`${card.name} card preview`}
    >
      <div className="focus-panel-heading">
        <span>
          <i /> CARD PREVIEW <b>· NOT IN PLAY</b>
        </span>
        <button type="button" aria-label="Close card preview" onClick={onClose}>
          ×
        </button>
      </div>
      <div className={`focus-card-face element-${card.element}`}>
        <div className="focus-card-header">
          <span>{label}</span>
          {card.hp ? (
            <b>
              {remainingHp} <i>✦</i>
            </b>
          ) : null}
        </div>
        <div className={`focus-card-art art-${card.element}`}>
          <span>{card.symbol}</span>
          <i>EMBER ARENA · FIELD STUDY</i>
        </div>
        <div className="focus-card-title">
          <b>{card.name}</b>
          <small>{card.subtitle}</small>
        </div>
        <p>{card.ruleText}</p>
        {card.attack ? (
          <div className="focus-card-attack">
            <span>
              <i>✦</i>
              <i>✦</i>
            </span>
            <b>{card.attack}</b>
            <strong>{card.attackDamage}</strong>
          </div>
        ) : null}
        <div className="focus-card-footer">
          <span>EMBER ARENA</span>
          <span>{card.hp ? `HP ${card.hp}` : label}</span>
        </div>
      </div>
      {attachable && onAttach ? (
        <div className="focus-panel-actions">
          <button type="button" onClick={onAttach}>
            {pendingAttachment ? 'Cancel attachment' : 'Attach to a Pokémon'}
            <b>{pendingAttachment ? '×' : '↗'}</b>
          </button>
          <p>
            {pendingAttachment
              ? 'Choose a highlighted Fire Pokémon on your field.'
              : 'Choose an Energy or Tool, then pick a valid Pokémon.'}
          </p>
        </div>
      ) : (
        <p className="focus-panel-note">
          Inspecting a card doesn’t play or attach it.
        </p>
      )}
    </aside>
  );
}
