'use client';

import { useEffect, useRef, useState } from 'react';
import '@/components/battle/tcg/battle.css';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { PageStateCard } from '@/components/battle/PageStateCard';
import BattleCard from '@/components/battle/tcg/BattleCard';
import BattleField from '@/components/battle/tcg/BattleField';
import { Icon } from '@/components/battle/tcg/Icon';
import type {
  BattleCard as BattleCardData,
  CardElement,
  CardPosition,
} from '@/components/battle/tcg/types';
import { getPlayerDisplayName, getNFTTypeName } from '@/lib/battle-utils';
import { getNFTMetadata, getIpfsImageUrl } from '@/lib/utils';
import { toast } from 'sonner';

function getElement(type: number): CardElement {
  switch (type) {
    case 0:
      return 'flame';
    case 1:
      return 'tide';
    case 2:
      return 'grove';
    default:
      return 'neutral';
  }
}

function getElementSymbol(element: CardElement) {
  switch (element) {
    case 'flame':
      return '✦';
    case 'tide':
      return '◉';
    case 'grove':
      return '❋';
    case 'solar':
      return '☼';
    case 'stone':
      return '⬡';
    default:
      return '◇';
  }
}

function getMovePosition(index: number, count: number): CardPosition {
  const centered = index - (count - 1) / 2;
  return {
    x: 49 + centered * Math.min(9, 30 / Math.max(count - 1, 1)),
    y: 79 - Math.abs(centered) * 0.45,
    scale: 0.84,
    rotation: centered * 1.2,
  };
}

export default function BattlePlayPage() {
  const params = useParams();
  const battleId = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');
  const { selectedAccount, isInitialized } = useSolana();
  const battle = useQuery(api.battle.getBattleWithNFTData, { battleId });
  const executeTurn = useMutation(api.battle.executeTurn);
  const [selectedMove, setSelectedMove] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [message, setMessage] = useState('');
  const [impact, setImpact] = useState<'you' | 'opponent' | null>(null);
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const lastSeenTurn = useRef<string | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setEffectsEnabled(!media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const latest = battle?.moves.at(-1);
  const latestId = latest?.turnId;
  const latestPlayer = latest?.player;
  const localAddress = selectedAccount?.address;
  // Subscription updates are the only source of impact effects; never animate a predicted turn.
  useEffect(() => {
    if (!battle || !localAddress) return;
    if (lastSeenTurn.current === null) {
      lastSeenTurn.current = latestId ?? 'none';
      return;
    }
    if (!latestId || !latestPlayer) return;
    if (lastSeenTurn.current === latestId) return;
    lastSeenTurn.current = latestId;
    const target = latestPlayer === localAddress ? 'opponent' : 'you';
    if (!effectsEnabled) return;
    // Reset first so consecutive hits on the same side restart the animation.
    const frame = requestAnimationFrame(() => setImpact(target));
    const timer = window.setTimeout(() => setImpact(null), 600);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [latestId, latestPlayer, battle?.battleId, localAddress, effectsEnabled]);

  if (!isInitialized)
    return (
      <PageStateCard variant="loading" message="Connecting to the arena..." />
    );
  if (!selectedAccount)
    return (
      <PageStateCard
        variant="walletConnect"
        message="Connect your wallet to view this match."
      />
    );
  if (battle === undefined)
    return <PageStateCard variant="loading" message="Loading match..." />;
  if (battle === null)
    return (
      <PageStateCard
        variant="error"
        title="Match not found"
        message="This match does not exist."
        redirectTo="/battle"
        buttonText="Return to arena"
      />
    );

  const isPlayer1 = selectedAccount.address === battle.player1Address;
  const isPlayer2 = selectedAccount.address === battle.player2Address;
  if (!isPlayer1 && !isPlayer2)
    return (
      <PageStateCard
        title="Private match"
        message="Only the two players in this match can view it."
        redirectTo="/battle"
        buttonText="Return to arena"
      />
    );

  const yours = isPlayer1 ? battle.player1NFT : battle.player2NFT;
  const theirs = isPlayer1 ? battle.player2NFT : battle.player1NFT;
  const yourData = isPlayer1 ? battle.player1NFTData : battle.player2NFTData;
  const theirData = isPlayer1 ? battle.player2NFTData : battle.player1NFTData;
  const yourMeta = getNFTMetadata(yourData?.itemMetadata);
  const theirMeta = getNFTMetadata(theirData?.itemMetadata);
  const yourName = getPlayerDisplayName(
    selectedAccount.address,
    isPlayer1 ? battle.player1Name : battle.player2Name,
  );
  const opponentAddress = isPlayer1
    ? battle.player2Address
    : battle.player1Address;
  const opponentName = getPlayerDisplayName(
    opponentAddress,
    isPlayer1 ? battle.player2Name : battle.player1Name,
  );
  const yourHealth = isPlayer1
    ? battle.gameState.player1Health
    : battle.gameState.player2Health;
  const yourMaxHealth = isPlayer1
    ? battle.gameState.player1MaxHealth
    : battle.gameState.player2MaxHealth;
  const opponentHealth = isPlayer1
    ? battle.gameState.player2Health
    : battle.gameState.player1Health;
  const opponentMaxHealth = isPlayer1
    ? battle.gameState.player2MaxHealth
    : battle.gameState.player1MaxHealth;
  const yourType = getNFTTypeName(yours.stats.nftType);
  const opponentType = getNFTTypeName(theirs.stats.nftType);
  const yourMoves = yourData?.customMoves ?? [];
  const opponentMoves = theirData?.customMoves ?? [];
  const yourNameOnCard = yourMeta?.name || `${yourType} #${yours.item}`;
  const opponentNameOnCard =
    theirMeta?.name || `${opponentType} #${theirs.item}`;
  const you: BattleCardData = {
    id: 'player-active',
    name: yourNameOnCard,
    subtitle: `${yourType} NFT · ATK ${yours.stats.attack}`,
    category: 'creature',
    element: getElement(yours.stats.nftType),
    symbol: getElementSymbol(getElement(yours.stats.nftType)),
    image: getIpfsImageUrl(yourMeta),
    hp: yourMaxHealth,
    damage: Math.max(0, yourMaxHealth - yourHealth),
    attack: yourMoves[0]?.name || 'Strike',
    ruleText:
      yourMeta?.description ||
      `${yourName}'s ${yourType.toLowerCase()} card is active in this match.`,
    zone: 'local-active',
    slot: 0,
  };
  const opponent: BattleCardData = {
    id: 'opponent-active',
    name: opponentNameOnCard,
    subtitle: `${opponentType} NFT · ATK ${theirs.stats.attack}`,
    category: 'creature',
    element: getElement(theirs.stats.nftType),
    symbol: getElementSymbol(getElement(theirs.stats.nftType)),
    image: getIpfsImageUrl(theirMeta),
    hp: opponentMaxHealth,
    damage: Math.max(0, opponentMaxHealth - opponentHealth),
    attack: opponentMoves[0]?.name || 'Strike',
    ruleText:
      theirMeta?.description ||
      `${opponentName}'s ${opponentType.toLowerCase()} card is active in this match.`,
    zone: 'opponent-active',
    slot: 0,
  };
  const finished = battle.gameState.status === 'finished';
  const active = battle.gameState.status === 'active';
  const yourTurn = battle.gameState.currentTurn === selectedAccount.address;
  const canAct =
    active && yourTurn && !battle.gameState.pendingTurn && !executing;
  const moves = yourMoves;
  const moveCards: BattleCardData[] = moves.map((move, index) => ({
    id: `move-${index}`,
    name: move.name,
    subtitle: `BATTLE MOVE ${String(index + 1).padStart(2, '0')}`,
    category: 'trainer',
    cardType: 'move',
    element: getElement(yours.stats.nftType),
    symbol: getElementSymbol(getElement(yours.stats.nftType)),
    ruleText: move.description,
    zone: 'hand',
    slot: index,
  }));
  const statusMessage =
    message ||
    (battle.gameState.pendingTurn
      ? 'A turn is being processed.'
      : finished
        ? 'The final result is recorded.'
        : yourTurn
          ? selectedMove
            ? `Ready to use ${selectedMove}. Confirm to resolve the turn.`
            : 'Your turn. Choose a move from your hand.'
          : `Waiting for ${opponentName}.`);
  const won = battle.gameState.winner === selectedAccount.address;
  const displayTurn = yourTurn ? 'player' : 'opponent';
  const selectedMoveIsValid = moves.some((move) => move.name === selectedMove);

  async function attack() {
    if (!selectedMove || !canAct || !selectedAccount) return;
    setExecuting(true);
    setMessage('Resolving turn...');
    try {
      const result = await executeTurn({
        battleId,
        playerAddress: selectedAccount.address,
        action: selectedMove,
      });
      setMessage(
        `${result.wasCritical ? 'Critical hit! ' : ''}${result.damage} damage dealt.`,
      );
      setSelectedMove(null);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Unable to play that move';
      setMessage(detail);
      toast.error(detail);
    } finally {
      setExecuting(false);
    }
  }

  return (
    <main className="battle-client live-match">
      <div
        className="battle-stage"
        data-turn={displayTurn}
        data-impact={impact ?? undefined}
        data-testid="battle-stage"
        aria-label={`${yourName} versus ${opponentName} live NFT battle`}
      >
        <BattleField
          turn={displayTurn}
          handCount={moveCards.length}
          playerName={yourName}
          opponentName={opponentName}
          playerSubtitle={`${yourType.toUpperCase()} · ${yourHealth}/${yourMaxHealth} HP`}
          opponentSubtitle={`${opponentType.toUpperCase()} · ${opponentHealth}/${opponentMaxHealth} HP`}
          turnLabel={
            finished
              ? 'MATCH COMPLETE'
              : yourTurn
                ? 'YOUR TURN'
                : "OPPONENT'S TURN"
          }
          matchLabel={`MINT ARENA · TURN ${battle.gameState.turnNumber}`}
          showStacks={false}
          showPrizes={false}
          showOpponentHand={false}
        />

        <div className="cards-layer" aria-label="Cards on the battle table">
          <BattleCard
            card={opponent}
            position={{ x: 50, y: 34, scale: 0.84, rotation: -1 }}
            selected={false}
            impact={impact === 'opponent'}
            displayDamage={opponent.damage}
            onSelect={() => undefined}
          />
          <BattleCard
            card={you}
            position={{ x: 50, y: 61, scale: 0.9, rotation: 0 }}
            selected={false}
            impact={impact === 'you'}
            displayDamage={you.damage}
            onSelect={() => undefined}
          />
          {moveCards.map((card, index) => (
            <BattleCard
              key={card.id}
              card={card}
              position={getMovePosition(index, moveCards.length)}
              selected={selectedMove === card.name}
              disabled={!canAct}
              onSelect={() =>
                setSelectedMove((current) =>
                  current === card.name ? null : card.name,
                )
              }
            />
          ))}
        </div>

        <header className="battle-topbar">
          <div className="brand-lockup">
            <Link
              href="/battle"
              className="brand-mark"
              aria-label="Back to arena"
            >
              <i>✦</i>
            </Link>
            <span>
              <b>POKÉMON TCG</b>
              <small>MINT ARENA</small>
            </span>
            <i className="brand-divider" />
            <span className="topbar-mode">
              LIVE MATCH <b>#{battleId.slice(-5).toUpperCase()}</b>
            </span>
          </div>
          <div className="match-meta">
            <span className="live-dot" />
            {finished
              ? 'MATCH COMPLETE'
              : yourTurn
                ? 'YOUR MOVE'
                : 'RIVAL MOVE'}
            <i /> TURN {battle.gameState.turnNumber}
          </div>
          <div className="topbar-actions">
            <button
              className={`icon-button ${effectsEnabled ? '' : 'is-active'}`}
              type="button"
              onClick={() => {
                setEffectsEnabled((enabled) => !enabled);
                setImpact(null);
              }}
              aria-label={
                effectsEnabled
                  ? 'Reduce battle effects'
                  : 'Enable battle effects'
              }
              title={
                effectsEnabled
                  ? 'Reduce battle effects'
                  : 'Enable battle effects'
              }
            >
              <Icon name="shield" size={17} />
            </button>
            <button
              className={`icon-button ${logOpen ? 'is-active' : ''}`}
              type="button"
              onClick={() => setLogOpen((open) => !open)}
              aria-expanded={logOpen}
              aria-controls="live-battle-log"
              aria-label={logOpen ? 'Close battle log' : 'Open battle log'}
              title="Battle log"
            >
              <Icon name="chat" size={17} />
            </button>
          </div>
        </header>

        <aside
          className="right-rail live-health-rail"
          aria-label="Match health"
        >
          <div className="rail-section rail-section-opponent">
            <span className="live-rail-name">RIVAL</span>
            <span className="rail-timer">HEALTH</span>
            <strong className="rail-score rail-score-red">
              {opponentHealth}
            </strong>
            <small className="live-rail-max">/ {opponentMaxHealth} HP</small>
            <span className="live-rail-track">
              <i
                style={{
                  width: `${opponentMaxHealth ? (opponentHealth / opponentMaxHealth) * 100 : 0}%`,
                }}
              />
            </span>
          </div>
          <div className="rail-divider">
            <i />
          </div>
          <div className="rail-section rail-section-player">
            <span className="live-rail-name">YOU</span>
            <span className="rail-timer">HEALTH</span>
            <strong className="rail-score rail-score-blue">{yourHealth}</strong>
            <small className="live-rail-max">/ {yourMaxHealth} HP</small>
            <span className="live-rail-track">
              <i
                style={{
                  width: `${yourMaxHealth ? (yourHealth / yourMaxHealth) * 100 : 0}%`,
                }}
              />
            </span>
          </div>
        </aside>

        <aside className="left-rail" aria-hidden="true">
          <span className="left-rail-line" />
          <span className="left-rail-label">LIVE NFT DUEL</span>
        </aside>

        <div className="player-console">
          <div className="console-profile">
            <span className="console-avatar">
              {yourName.charAt(0).toUpperCase()}
            </span>
            <span>
              <b>{yourName}</b>
              <small>{you.name}</small>
            </span>
          </div>
          <div className="console-divider" />
          <div className="console-health">
            <span className="health-pulse" />
            <span>
              <b>{finished ? 'FINAL RESULT' : 'MATCH STATUS'}</b>
              <small>
                {finished
                  ? won
                    ? 'VICTORY'
                    : 'DEFEAT'
                  : `TURN ${battle.gameState.turnNumber}`}
              </small>
            </span>
          </div>
        </div>

        <section
          className="action-dock live-action-dock"
          aria-label="Battle actions"
        >
          <div className="action-message" role="status" aria-live="polite">
            <span className="message-mark">✦</span>
            <span>{statusMessage}</span>
          </div>
          <div className="action-buttons">
            <button
              className="action-button action-secondary"
              type="button"
              onClick={() => setLogOpen((open) => !open)}
              aria-expanded={logOpen}
              aria-controls="live-battle-log"
            >
              <span className="button-icon">
                <Icon name="chat" size={16} />
              </span>
              <span>
                <b>BATTLE LOG</b>
                <small>{battle.moves.length} EVENTS</small>
              </span>
            </button>
            <button
              type="button"
              className="action-button action-attack"
              onClick={() => void attack()}
              disabled={!canAct || !selectedMoveIsValid}
            >
              <span className="button-icon">
                <Icon name="flame" size={16} />
              </span>
              <span>
                <b>
                  {executing
                    ? 'RESOLVING…'
                    : finished
                      ? 'MATCH COMPLETE'
                      : 'PLAY MOVE'}
                </b>
                <small>
                  {executing
                    ? 'WAIT FOR RESULT'
                    : !yourTurn
                      ? 'RIVAL’S TURN'
                      : selectedMoveIsValid
                        ? selectedMove?.toUpperCase()
                        : 'SELECT A CARD'}
                </small>
              </span>
            </button>
          </div>
        </section>

        <div className="stage-footer">
          <span className="footer-status-dot" /> LIVE MATCH <i /> TURN
          SYNCHRONIZED WITH THE ARENA
        </div>

        {logOpen ? (
          <section
            className="live-log-popover"
            id="live-battle-log"
            aria-label="Battle log"
          >
            <div className="live-log-heading">
              <span className="choice-kicker">
                <i /> BATTLE LOG · {battle.moves.length} EVENTS
              </span>
              <button
                type="button"
                className="icon-button"
                onClick={() => setLogOpen(false)}
                aria-label="Close battle log"
              >
                ×
              </button>
            </div>
            <div className="live-log-entries">
              {battle.moves.length === 0 ? (
                <p className="live-log-empty">
                  No moves yet. The first strike will appear here.
                </p>
              ) : (
                [...battle.moves].reverse().map((move) => (
                  <article className="live-log-entry" key={move.turnId}>
                    <small>
                      TURN {move.turnNumber} ·{' '}
                      {move.player === selectedAccount.address
                        ? 'YOU'
                        : opponentName}
                    </small>
                    <b>{move.action}</b>
                    <span>
                      {move.damage ?? 0} DAMAGE
                      {move.wasCritical ? ' · CRITICAL' : ''}
                    </span>
                    <time dateTime={new Date(move.timestamp).toISOString()}>
                      {new Date(move.timestamp).toLocaleTimeString()}
                    </time>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}

        {finished ? (
          <section className="live-result" role="status" aria-live="polite">
            <span className="choice-kicker">
              <i /> MATCH COMPLETE · TURN {battle.gameState.turnNumber}
            </span>
            <h1>{won ? 'Victory.' : 'Defeat.'}</h1>
            <p>
              {won
                ? 'Your card held the field.'
                : `${opponentName} won this match.`}
            </p>
            <Link href="/battle" className="live-result-link">
              Return to arena <b>↗</b>
            </Link>
          </section>
        ) : null}
      </div>
    </main>
  );
}
