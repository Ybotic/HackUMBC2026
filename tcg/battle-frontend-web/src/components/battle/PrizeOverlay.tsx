type PrizeOverlayProps = {
  remainingPrizes: number;
  selectedPrize: number | null;
  flying: boolean;
  onSelect: (index: number) => void;
  onCollect: () => void;
};

export default function PrizeOverlay({
  remainingPrizes,
  selectedPrize,
  flying,
  onSelect,
  onCollect,
}: PrizeOverlayProps) {
  return (
    <div className="choice-backdrop prize-backdrop">
      <section
        className={`prize-dialog ${flying ? 'is-flying' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prize-title"
      >
        <span className="choice-kicker">
          <i /> KNOCKOUT · PRIZE {7 - remainingPrizes} OF 6
        </span>
        <h2 id="prize-title">Choose a prize card</h2>
        <p className="choice-description">
          Radiant Charizard is Knocked Out. Pick one face-down card to reveal.
        </p>
        <div className="prize-choice-row">
          {Array.from({ length: remainingPrizes }, (_, index) => (
            <button
              className={`prize-choice-card ${selectedPrize === index ? 'is-revealed' : ''} ${flying && selectedPrize === index ? 'is-prize-flying' : ''}`}
              key={index}
              type="button"
              aria-label={
                selectedPrize === index
                  ? 'Selected prize: Fire Energy'
                  : `Select face-down prize card ${index + 1}`
              }
              aria-pressed={selectedPrize === index}
              disabled={selectedPrize !== null || flying}
              onClick={() => onSelect(index)}
            >
              <span className="prize-card-inner">
                <span className="prize-card-back">
                  <i>✦</i>
                  <b>
                    EMBER
                    <br />
                    ARENA
                  </b>
                </span>
                <span className="prize-card-face">
                  <i>✦</i>
                  <b>FIRE ENERGY</b>
                  <small>BASIC ENERGY</small>
                </span>
              </span>
            </button>
          ))}
          {flying && selectedPrize !== null ? (
            <span className="prize-flight-spark" aria-hidden="true">
              ✦
            </span>
          ) : null}
        </div>
        <div className="prize-dialog-footer">
          <span className="prize-count-label">
            <i /> {remainingPrizes} prize{remainingPrizes === 1 ? '' : 's'}{' '}
            remaining
          </span>
          <button
            className="choice-confirm"
            type="button"
            disabled={selectedPrize === null || flying}
            onClick={onCollect}
          >
            {flying
              ? 'Adding to hand…'
              : selectedPrize === null
                ? 'Select a card'
                : 'Add Fire Energy to hand'}{' '}
            <b>↗</b>
          </button>
        </div>
      </section>
    </div>
  );
}
