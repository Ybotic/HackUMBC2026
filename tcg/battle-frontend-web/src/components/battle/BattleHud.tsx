import { Icon } from '@/components/battle/Icon';

export type ReplayPhase =
  | 'ready'
  | 'arven-search'
  | 'switch-choice'
  | 'switch-resolving'
  | 'attack-ready'
  | 'attack-resolving'
  | 'prize-selection'
  | 'field-effect'
  | 'raihan-reveal'
  | 'raihan-search';

type BattleHudProps = {
  deckCount: number;
  playerPrizes: number;
  phase: ReplayPhase;
  message: string;
  attackBusy: boolean;
  soundEnabled: boolean;
  reducedMotion: boolean;
  onStartReplay: () => void;
  onAttack: () => void;
  onSkipAnimations: () => void;
  onReset: () => void;
  onToggleSound: () => void;
  onToggleReducedMotion: () => void;
};

export default function BattleHud({
  deckCount,
  playerPrizes,
  phase,
  message,
  attackBusy,
  soundEnabled,
  reducedMotion,
  onStartReplay,
  onAttack,
  onSkipAnimations,
  onReset,
  onToggleSound,
  onToggleReducedMotion,
}: BattleHudProps) {
  const canStart = phase === 'ready';
  const canAttack = phase === 'attack-ready';
  const canSkip =
    attackBusy ||
    phase === 'switch-resolving' ||
    phase === 'field-effect' ||
    phase === 'raihan-reveal';
  const actionLabel = canStart
    ? 'PLAY THE SEQUENCE'
    : canAttack
      ? 'BRIGHT FLAME'
      : canSkip
        ? 'SKIP ANIMATIONS'
        : phase === 'raihan-search'
          ? 'SEARCH PENDING'
          : 'WAITING FOR CHOICE';
  const actionDescription = canStart
    ? 'ARVEN · 4:33 TO 5:20'
    : canAttack
      ? '250 DAMAGE · DISCARD 2 FIRE ENERGY'
      : phase === 'raihan-search'
        ? 'REPLAY ENDS AT 5:20'
        : phase === 'attack-resolving'
          ? 'FINISH VISUALS · KEEP BATTLE RESULT'
          : 'MAKE THE ON-SCREEN SELECTION';

  return (
    <>
      <header className="battle-topbar">
        <div className="brand-lockup">
          <span className="brand-mark">
            <i>✦</i>
          </span>
          <span>
            <b>POKÉMON TCG</b>
            <small>EMBER ARENA</small>
          </span>
          <i className="brand-divider" />
          <span className="topbar-mode">
            GAMEPLAY REPLAY <b>01</b>
          </span>
        </div>
        <div className="match-meta">
          <span className="live-dot" /> ARCANINE EX <i /> 4:15 — 5:20
        </div>
        <div className="topbar-actions">
          <button
            className="icon-button"
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
            title={soundEnabled ? 'Mute sound' : 'Enable sound'}
          >
            <Icon name={soundEnabled ? 'sound' : 'muted'} size={18} />
          </button>
          <button
            className={`icon-button ${reducedMotion ? 'is-active' : ''}`}
            type="button"
            onClick={onToggleReducedMotion}
            aria-label={reducedMotion ? 'Turn animations on' : 'Reduce motion'}
            title={reducedMotion ? 'Animations reduced' : 'Reduce motion'}
          >
            <Icon name="shield" size={17} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={onReset}
            aria-label="Restart replay"
            title="Restart replay"
          >
            <Icon name="refresh" size={17} />
          </button>
        </div>
      </header>

      <aside className="right-rail" aria-label="Prize cards and deck count">
        <div className="rail-section rail-section-opponent">
          <span className="rail-chevron">⌃⌃</span>
          <b className="rail-rank">R</b>
          <span className="rail-timer">
            <Icon name="clock" size={13} /> 20:41
          </span>
          <strong className="rail-score rail-score-red">6</strong>
        </div>
        <div className="rail-divider">
          <i />
        </div>
        <div className="rail-section rail-section-player">
          <strong className="rail-score rail-score-blue">{playerPrizes}</strong>
          <span className="rail-timer">
            <Icon name="clock" size={13} /> {deckCount} DECK
          </span>
          <b className="rail-rank">Y</b>
          <span className="rail-chevron">⌄⌄</span>
        </div>
      </aside>

      <aside className="left-rail" aria-hidden="true">
        <span className="left-rail-line" />
        <span className="left-rail-label">SEGMENT 04:15 — 05:20</span>
      </aside>

      <div className="player-console">
        <div className="console-profile">
          <span className="console-avatar">Y</span>
          <span>
            <b>YOUR FIELD</b>
            <small>ARCANINE EX · 2 ENERGY</small>
          </span>
        </div>
        <div className="console-divider" />
        <div className="console-health">
          <span className="health-pulse" />
          <span>
            <b>REPLAY STATE</b>
            <small>
              {phase === 'raihan-search'
                ? 'PENDING CHOICE'
                : phase.replaceAll('-', ' ').toUpperCase()}
            </small>
          </span>
        </div>
      </div>

      <div
        className={`action-dock ${phase === 'raihan-search' ? 'is-at-end' : ''}`}
      >
        <div className="action-message" aria-live="polite">
          <span className="message-mark">✦</span>
          <span>{message}</span>
        </div>
        <div className="replay-progress" aria-label="Replay timeline">
          <span className={phase !== 'ready' ? 'is-complete' : 'is-current'}>
            4:15 <i />
          </span>
          <span className={phase === 'arven-search' ? 'is-current' : ''}>
            4:33 <i />
          </span>
          <span className={phase === 'switch-choice' ? 'is-current' : ''}>
            4:39 <i />
          </span>
          <span
            className={
              phase === 'attack-ready' || phase === 'attack-resolving'
                ? 'is-current'
                : ''
            }
          >
            4:51 <i />
          </span>
          <span className={phase === 'prize-selection' ? 'is-current' : ''}>
            4:58 <i />
          </span>
          <span className={phase === 'field-effect' ? 'is-current' : ''}>
            5:04 <i />
          </span>
          <span
            className={
              phase === 'raihan-reveal' || phase === 'raihan-search'
                ? 'is-current'
                : ''
            }
          >
            5:20 <i />
          </span>
        </div>
        <div className="action-buttons">
          <button
            className="action-button action-secondary"
            type="button"
            onClick={onToggleReducedMotion}
          >
            <span className="button-icon">
              <Icon name="shield" size={16} />
            </span>
            <span>
              <b>{reducedMotion ? 'MOTION OFF' : 'MOTION'}</b>
              <small>{reducedMotion ? 'REDUCED' : 'NORMAL'}</small>
            </span>
          </button>
          <button
            type="button"
            className={`action-button ${canAttack ? 'action-attack' : 'action-play'} ${canSkip ? 'action-skip' : ''}`}
            onClick={
              canStart
                ? onStartReplay
                : canAttack
                  ? onAttack
                  : canSkip
                    ? onSkipAnimations
                    : undefined
            }
            disabled={!canStart && !canAttack && !canSkip}
          >
            <span className="button-icon">
              <Icon name={canAttack || canSkip ? 'flame' : 'play'} size={16} />
            </span>
            <span>
              <b>{actionLabel}</b>
              <small>{actionDescription}</small>
            </span>
          </button>
        </div>
      </div>

      <div className="stage-footer">
        <span className="footer-status-dot" /> VISUAL REPLAY <i /> PLAYER
        CHOICES PAUSE THE SEQUENCE
      </div>
    </>
  );
}
