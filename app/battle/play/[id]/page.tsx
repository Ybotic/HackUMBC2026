'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { PageStateCard } from '@/components/battle/PageStateCard';
import { MintArena, type ArenaFighter } from '@/components/battle/MintArena';
import { getPlayerDisplayName, getNFTTypeName } from '@/lib/battle-utils';
import { getNFTMetadata, getIpfsImageUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Swords } from 'lucide-react';

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
  const you: ArenaFighter = {
    name:
      yourMeta?.name || `${getNFTTypeName(yours.stats.nftType)} #${yours.item}`,
    image: getIpfsImageUrl(yourMeta),
    type: yours.stats.nftType,
    health: isPlayer1
      ? battle.gameState.player1Health
      : battle.gameState.player2Health,
    maxHealth: isPlayer1
      ? battle.gameState.player1MaxHealth
      : battle.gameState.player2MaxHealth,
    owner: yourName,
    description: yourMeta?.description,
  };
  const opponent: ArenaFighter = {
    name:
      theirMeta?.name ||
      `${getNFTTypeName(theirs.stats.nftType)} #${theirs.item}`,
    image: getIpfsImageUrl(theirMeta),
    type: theirs.stats.nftType,
    health: isPlayer1
      ? battle.gameState.player2Health
      : battle.gameState.player1Health,
    maxHealth: isPlayer1
      ? battle.gameState.player2MaxHealth
      : battle.gameState.player1MaxHealth,
    owner: opponentName,
    description: theirMeta?.description,
  };
  const finished = battle.gameState.status === 'finished';
  const active = battle.gameState.status === 'active';
  const yourTurn = battle.gameState.currentTurn === selectedAccount.address;
  const canAct =
    active && yourTurn && !battle.gameState.pendingTurn && !executing;
  const moves = yourData?.customMoves ?? [];

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
    <main className="mint-page">
      <div className="mint-shell">
        <header
          className="mint-row"
          style={{ margin: '4px 0 22px', flexWrap: 'wrap' }}
        >
          <div>
            <Link
              href="/battle"
              className="mint-overline"
              style={{ textDecoration: 'none' }}
            >
              <ArrowLeft size={13} style={{ display: 'inline' }} /> BACK TO
              ARENA
            </Link>
            <h1
              style={{
                font: '42px var(--font-garamond), Georgia, serif',
                marginTop: 8,
              }}
            >
              The battle table
            </h1>
            <p className="mint-muted" style={{ fontSize: 12 }}>
              MATCH {battleId} · TURN {battle.gameState.turnNumber}
            </p>
          </div>
          <span className="mint-overline">
            {finished
              ? 'MATCH COMPLETE'
              : yourTurn
                ? 'YOUR TURN'
                : `${opponentName.toUpperCase()}'S TURN`}
          </span>
        </header>
        <div className="mint-play-grid">
          <MintArena
            you={you}
            opponent={opponent}
            turnLabel={
              finished
                ? 'MATCH COMPLETE'
                : yourTurn
                  ? 'YOUR MOVE'
                  : 'OPPONENT’S MOVE'
            }
            impactSide={impact}
          />
          <div className="mint-play-sidebar">
            {finished && (
              <section className="mint-result" role="status">
                <span className="mint-overline">FINAL RESULT</span>
                <h2
                  style={{ font: '40px var(--font-garamond), Georgia, serif' }}
                >
                  {battle.gameState.winner === selectedAccount.address
                    ? 'Victory.'
                    : 'Defeat.'}
                </h2>
                <p>
                  {battle.gameState.winner === selectedAccount.address
                    ? 'Your card held the field.'
                    : `${opponentName} won this match.`}
                </p>
                <Link
                  href="/battle"
                  className="mint-button"
                  style={{ marginTop: 18 }}
                >
                  Return to arena <ArrowRight size={16} />
                </Link>
              </section>
            )}
            <section className="mint-panel">
              <span className="mint-overline">YOUR ACTIONS / {you.name}</span>
              <h2 style={{ fontSize: 24, margin: '10px 0 4px' }}>
                {finished
                  ? 'Match concluded'
                  : yourTurn
                    ? 'Choose your move'
                    : 'Waiting for your rival'}
              </h2>
              <p
                className="mint-muted"
                style={{ fontSize: 13, marginBottom: 18 }}
              >
                Moves are named by your card. Damage is resolved by the battle
                server from card stats.
              </p>
              {moves.length === 0 ? (
                <p className="mint-muted">
                  Move data is unavailable for this card. Return to the arena or
                  try again later.
                </p>
              ) : (
                <div className="mint-moves">
                  {moves.map((move, index) => (
                    <button
                      key={`${move.name}-${index}`}
                      type="button"
                      className="mint-move"
                      aria-pressed={selectedMove === move.name}
                      disabled={!canAct}
                      onClick={() => setSelectedMove(move.name)}
                    >
                      <strong>
                        {String(index + 1).padStart(2, '0')} / {move.name}
                      </strong>
                      <small>{move.description}</small>
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="mint-button"
                style={{ width: '100%', marginTop: 16 }}
                disabled={
                  !canAct ||
                  !selectedMove ||
                  !moves.some((move) => move.name === selectedMove)
                }
                onClick={() => void attack()}
              >
                <Swords size={17} />{' '}
                {executing
                  ? 'Resolving...'
                  : finished
                    ? 'Match complete'
                    : !yourTurn
                      ? 'Opponent’s turn'
                      : selectedMove
                        ? `Use ${selectedMove}`
                        : 'Select a move'}
              </button>
              <p
                role="status"
                aria-live="polite"
                style={{
                  minHeight: 22,
                  marginTop: 12,
                  color: '#c8eac0',
                  fontSize: 13,
                }}
              >
                {message ||
                  (battle.gameState.pendingTurn
                    ? 'A turn is being processed.'
                    : finished
                      ? 'The final result is recorded.'
                      : yourTurn
                        ? 'Your turn to act.'
                        : `Waiting for ${opponentName}.`)}
              </p>
              <button
                type="button"
                className="mint-text-button"
                onClick={() => {
                  setEffectsEnabled(false);
                  setImpact(null);
                }}
                disabled={!effectsEnabled}
              >
                Skip effects
              </button>
            </section>
            <section className="mint-panel">
              <button
                type="button"
                className="mint-row"
                style={{
                  background: 'none',
                  border: 0,
                  color: 'inherit',
                  width: '100%',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onClick={() => setLogOpen(!logOpen)}
                aria-expanded={logOpen}
                aria-controls="mint-battle-log"
              >
                <span className="mint-overline">
                  BATTLE LOG / {battle.moves.length} EVENTS
                </span>
                <span>{logOpen ? '−' : '+'}</span>
              </button>
              {logOpen && (
                <div
                  id="mint-battle-log"
                  className="mint-log"
                  style={{ marginTop: 14 }}
                >
                  {battle.moves.length === 0 ? (
                    <p className="mint-muted">
                      No moves yet. The first strike will appear here.
                    </p>
                  ) : (
                    [...battle.moves].reverse().map((move) => (
                      <div className="mint-log-entry" key={move.turnId}>
                        <strong>
                          TURN {move.turnNumber} ·{' '}
                          {move.player === selectedAccount.address
                            ? 'You'
                            : opponentName}
                        </strong>
                        <div>
                          {move.action} · {move.damage ?? 0} damage{' '}
                          {move.wasCritical ? '· CRITICAL' : ''}
                        </div>
                        <small>
                          {new Date(move.timestamp).toLocaleString()}
                        </small>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
