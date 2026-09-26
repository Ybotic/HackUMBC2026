import type { BattleCard } from '@/battle/types';

type SearchRequirement = 'item' | 'tool' | 'any';

type SearchOverlayProps = {
  mode: 'search';
  title: string;
  eyebrow: string;
  description: string;
  player: 'player' | 'opponent';
  options: BattleCard[];
  selectedIds: string[];
  requirements: SearchRequirement[];
  pending: boolean;
  onToggle: (card: BattleCard) => void;
  onConfirm?: () => void;
};

type SwitchOverlayProps = {
  mode: 'switch';
  title: string;
  eyebrow: string;
  description: string;
  options: BattleCard[];
  onChoose: (card: BattleCard) => void;
};

type BattleChoiceOverlayProps = SearchOverlayProps | SwitchOverlayProps;

function ChoiceCard({
  card,
  selected,
  detail,
  onClick,
}: {
  card: BattleCard;
  selected?: boolean;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`choice-card element-${card.element} ${selected ? 'is-picked' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="choice-card-art" aria-hidden="true">
        <i>{card.symbol}</i>
      </span>
      <span className="choice-card-copy">
        <small>{detail}</small>
        <b>{card.name}</b>
        <span>{card.subtitle}</span>
      </span>
      <span className="choice-check" aria-hidden="true">
        {selected ? '✓' : '+'}
      </span>
    </button>
  );
}

export default function BattleChoiceOverlay(props: BattleChoiceOverlayProps) {
  return (
    <div className="choice-backdrop">
      <section
        className={`choice-dialog ${props.mode === 'search' && props.pending ? 'is-pending' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="choice-title"
      >
        <div className="choice-dialog-topline">
          <span className="choice-kicker">
            <i /> {props.eyebrow}
          </span>
          {props.mode === 'search' && props.pending ? (
            <span className="pending-pill">PENDING</span>
          ) : null}
        </div>
        <h2 id="choice-title">{props.title}</h2>
        <p className="choice-description">{props.description}</p>

        {props.mode === 'search' ? (
          <>
            <div
              className="choice-requirements"
              aria-label="Search requirements"
            >
              {props.requirements.map((requirement, index) => {
                const selected = props.options.find(
                  (option) =>
                    props.selectedIds.includes(option.id) &&
                    (requirement === 'any' || option.cardType === requirement),
                );
                return (
                  <span
                    className={selected ? 'is-requirement-met' : ''}
                    key={`${requirement}-${index}`}
                  >
                    <i>{selected ? '✓' : String(index + 1).padStart(2, '0')}</i>
                    {requirement === 'any'
                      ? 'Choose one card'
                      : requirement === 'item'
                        ? 'Choose an Item'
                        : 'Choose a Pokémon Tool'}
                  </span>
                );
              })}
            </div>
            <div className="choice-card-grid">
              {props.options.map((card) => (
                <ChoiceCard
                  key={card.id}
                  card={card}
                  selected={props.selectedIds.includes(card.id)}
                  detail={
                    card.cardType === 'basic-energy'
                      ? 'ENERGY'
                      : (card.cardType ?? 'CARD').toUpperCase()
                  }
                  onClick={() => props.onToggle(card)}
                />
              ))}
            </div>
            {props.pending ? (
              <div className="pending-note">
                <span>Ⅱ</span>
                <span>
                  <b>Replay pauses here</b>
                  <small>
                    The opponent’s search is still unresolved at 5:20. No card
                    has been revealed or added.
                  </small>
                </span>
              </div>
            ) : (
              <div className="choice-footer">
                <span>
                  {props.selectedIds.length} selected <i>·</i> confirm when each
                  requirement is met
                </span>
                <button
                  type="button"
                  className="choice-confirm"
                  disabled={!props.onConfirm || !isSearchComplete(props)}
                  onClick={props.onConfirm}
                >
                  Confirm selection <b>↗</b>
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="switch-choice-list">
              {props.options.map((card) => (
                <ChoiceCard
                  key={card.id}
                  card={card}
                  detail={`${card.hp ?? '—'} HP · BENCH`}
                  onClick={() => props.onChoose(card)}
                />
              ))}
            </div>
            <div className="choice-footnote">
              <span>ESCAPE ROPE</span>
              <i /> The opponent will switch automatically.
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function isSearchComplete(props: SearchOverlayProps) {
  return props.requirements.every((requirement) =>
    props.options.some(
      (option) =>
        props.selectedIds.includes(option.id) &&
        (requirement === 'any' || option.cardType === requirement),
    ),
  );
}
