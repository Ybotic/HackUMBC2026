import { Icon } from './Icon';

function CardBack({ className = '' }: { className?: string }) {
  return (
    <span className={`card-back ${className}`} aria-hidden="true">
      <span className="back-rim">
        <span className="back-lattice" />
        <span className="back-medallion">
          <i>✦</i>
        </span>
      </span>
    </span>
  );
}

function CardStack({
  label,
  count,
  side,
  faceUp = false,
}: {
  label: string;
  count: number;
  side: 'opponent' | 'player';
  faceUp?: boolean;
}) {
  return (
    <div
      className={`pile pile-${side} pile-${label.toLowerCase().replaceAll(' ', '-')}`}
      aria-label={`${label}, ${count} cards`}
    >
      <div className="pile-cards">
        <CardBack className="pile-shadow pile-shadow-one" />
        <CardBack className="pile-shadow pile-shadow-two" />
        {faceUp ? (
          <span className="mini-face-card">
            <span className="mini-face-sigil">✧</span>
            <span className="mini-face-lines" />
          </span>
        ) : (
          <CardBack />
        )}
      </div>
      <span className="pile-count">{count}</span>
      <span className="pile-label">{label}</span>
    </div>
  );
}

function BenchSlot({
  side,
  number,
}: { side: 'opponent' | 'player'; number: number }) {
  return (
    <div
      className={`empty-slot empty-slot-${side}`}
      style={{ left: `${number * 16}%` }}
      aria-hidden="true"
    >
      <span>{String(number + 1).padStart(2, '0')}</span>
    </div>
  );
}

export default function BattleField({
  deckCount = 0,
  opponentDiscardCount = 0,
  playerDiscardCount = 0,
  playerPrizes = 0,
  opponentPrizes = 0,
  turn,
  handCount = 0,
  opponentHandCount = 0,
  playerName = 'YOU',
  opponentName = 'RIVAL',
  playerSubtitle = 'MINT ARENA',
  opponentSubtitle = 'MINT ARENA',
  turnLabel,
  matchLabel = 'MINT ARENA · NFT DUEL',
  showStacks = true,
  showPrizes = true,
  showOpponentHand = true,
}: {
  deckCount?: number;
  opponentDiscardCount?: number;
  playerDiscardCount?: number;
  playerPrizes?: number;
  opponentPrizes?: number;
  turn: 'player' | 'opponent';
  handCount?: number;
  opponentHandCount?: number;
  playerName?: string;
  opponentName?: string;
  playerSubtitle?: string;
  opponentSubtitle?: string;
  turnLabel?: string;
  matchLabel?: string;
  showStacks?: boolean;
  showPrizes?: boolean;
  showOpponentHand?: boolean;
}) {
  return (
    <div className="battle-field" aria-hidden="true">
      <div className="arena-glow" />
      <div className="board-frame board-frame-top" />
      <div className="board-frame board-frame-bottom" />
      <div className="board-shell">
        <div className="board-rim">
          <div className="board-inset">
            <div className="playmat-grid" />
            <div className="playmat-shine" />
            <div className="field-divider" />
            <div className="center-sigil">
              <span className="sigil-ring sigil-ring-one" />
              <span className="sigil-ring sigil-ring-two" />
              <span className="sigil-mark">✦</span>
            </div>
            <div className="field-zone field-zone-opponent" />
            <div className="field-zone field-zone-player" />
            <div className="bench-slot-row bench-slot-row-opponent">
              {Array.from({ length: 5 }, (_, index) => (
                <BenchSlot
                  key={`opp-${index}`}
                  side="opponent"
                  number={index}
                />
              ))}
            </div>
            <div className="bench-slot-row bench-slot-row-player">
              {Array.from({ length: 5 }, (_, index) => (
                <BenchSlot key={`me-${index}`} side="player" number={index} />
              ))}
            </div>
            <div className="active-slot active-slot-opponent">
              <span>OPPONENT ACTIVE</span>
            </div>
            <div className="active-slot active-slot-player">
              <span>YOUR ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      <div className="opponent-banner">
        <span className="avatar avatar-opponent">
          {opponentName.charAt(0).toUpperCase()}
        </span>
        <span className="banner-copy">
          <b>{opponentName}</b>
          <small>{opponentSubtitle}</small>
        </span>
        <span className="connection-pill">
          <i /> ONLINE
        </span>
      </div>
      <div className="player-banner">
        <span className="avatar avatar-player">
          {playerName.charAt(0).toUpperCase()}
        </span>
        <span className="banner-copy">
          <b>{playerName}</b>
          <small>{playerSubtitle}</small>
        </span>
        <span
          className={`turn-you ${turn === 'opponent' ? 'turn-opponent' : ''}`}
        >
          <Icon name="spark" size={13} />{' '}
          {turnLabel ?? (turn === 'opponent' ? "OPPONENT'S TURN" : 'YOUR TURN')}
        </span>
      </div>

      {showOpponentHand ? (
        <div
          className="opponent-hand"
          aria-label={`Opponent has ${opponentHandCount} cards in hand`}
        >
          <span className="opponent-hand-label">OPPONENT HAND</span>
          {Array.from({ length: opponentHandCount }, (_, index) => (
            <CardBack
              key={index}
              className={`opponent-hand-card opponent-hand-card-${index + 1}`}
            />
          ))}
          <span className="opponent-hand-count">{opponentHandCount}</span>
        </div>
      ) : null}

      {showStacks ? (
        <>
          <CardStack
            label="Discard"
            count={opponentDiscardCount}
            side="opponent"
          />
          <CardStack label="Deck" count={39} side="opponent" />
          <CardStack label="Discard" count={playerDiscardCount} side="player" />
          <CardStack label="Deck" count={deckCount} side="player" faceUp />
        </>
      ) : null}

      {showPrizes ? (
        <>
          <div className="prize-track prize-track-opponent">
            <span className="prize-count">{opponentPrizes}</span>
            <span className="prize-copy">PRIZE CARDS</span>
            <span className="prize-dots">
              {Array.from({ length: opponentPrizes }, (_, index) => (
                <i key={index}>●</i>
              ))}
            </span>
          </div>
          <div className="prize-track prize-track-player">
            <span className="prize-count">{playerPrizes}</span>
            <span className="prize-copy">PRIZE CARDS</span>
            <span className="prize-dots">
              {Array.from({ length: playerPrizes }, (_, index) => (
                <i key={index}>●</i>
              ))}
            </span>
          </div>
        </>
      ) : null}

      <div className="hand-tray" />
      <div className="hand-caption">
        <span>YOUR LINEUP</span>
        <i />{' '}
        <b>
          {handCount} NFT{handCount === 1 ? '' : 'S'}
        </b>
      </div>
      <div className="battle-edge-label">{matchLabel}</div>
    </div>
  );
}
