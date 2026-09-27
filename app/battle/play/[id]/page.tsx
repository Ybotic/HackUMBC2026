'use client';

import { useEffect, useRef, useState } from 'react';
import '@/components/battle/tcg/battle.css';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { PageStateCard } from '@/components/battle/PageStateCard';
import { BattleLineupSetup } from '@/components/battle/BattleLineupSetup';
import { BattleNFTCard } from '@/components/battle/BattleNFTCard';
import BattleField from '@/components/battle/tcg/BattleField';
import { Icon } from '@/components/battle/tcg/Icon';
import { getPlayerDisplayName, getNFTTypeName } from '@/lib/battle-utils';
import { getNFTMetadata, getIpfsImageUrl } from '@/lib/utils';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';

function InspectionImage({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? (
    <img src={src} alt={name} onError={() => setFailed(true)} />
  ) : (
    <div className="live-inspect-fallback">Artwork unavailable</div>
  );
}

function getEffectivenessLabel(effectiveness?: number): string {
  if (effectiveness === undefined || effectiveness === 1) return '';
  if (effectiveness === 0) return ' · NO EFFECT';
  return effectiveness > 1 ? ' · SUPER EFFECTIVE' : ' · NOT VERY EFFECTIVE';
}

export default function BattlePlayPage() {
  const params = useParams();
  const battleId = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');
  const { selectedAccount, isInitialized } = useSolana();
  const battle = useQuery(api.battle.getBattleWithNFTData, { battleId });
  const executeTurn = useMutation(api.battle.executeTurn);
  const submitRoundAction = useMutation(api.battle.submitRoundAction);
  const changeActiveCard = useMutation(api.battle.changeActiveCard);
  const [selectedMove, setSelectedMove] = useState<string | null>(null);
  const [switchTarget, setSwitchTarget] = useState<number | null>(null);
  const [movePopoverOpen, setMovePopoverOpen] = useState(false);
  const [inspected, setInspected] = useState<{
    side: 'you' | 'opponent';
    index: number;
  } | null>(null);
  const [executing, setExecuting] = useState(false);
  const [message, setMessage] = useState('');
  const [impact, setImpact] = useState<'you' | 'opponent' | null>(null);
  const [visualEvent, setVisualEvent] = useState<{
    kind: 'attack' | 'switch' | 'protect';
    target: 'you' | 'opponent';
    damage?: number;
    critical?: boolean;
    knockedOut?: boolean;
    protectSuccess?: boolean;
    blocked?: boolean;
  } | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const inspectTriggerRef = useRef<HTMLButtonElement | null>(null);
  const lastSeenTurn = useRef<string | null>(null);
  const lastBattleId = useRef<string | null>(null);
  const previousStatus = useRef<string | null>(null);

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
  const latestKind = latest?.kind;
  const latestDamage = latest?.damage;
  const latestCritical = latest?.wasCritical;
  const latestTargetHealth = latest?.targetHealth;
  const latestProtectSuccess = latest?.protectSuccess;
  const latestBlocked = latest?.blocked;
  const localAddress = selectedAccount?.address;
  const localActive =
    selectedAccount?.address === battle?.player1Address
      ? battle?.gameState.player1Active
      : battle?.gameState.player2Active;
  useEffect(() => {
    setSelectedMove(null);
    setSwitchTarget(null);
    setMovePopoverOpen(false);
  }, [localActive, battle?.battleId]);
  useEffect(() => {
    if (!battle) return;
    const wasSetup = previousStatus.current === 'initializing';
    previousStatus.current = battle.gameState.status;
    if (!wasSetup || battle.gameState.status !== 'active' || !effectsEnabled)
      return;
    setRevealing(true);
    const timer = window.setTimeout(() => setRevealing(false), 850);
    return () => window.clearTimeout(timer);
  }, [battle?.gameState.status, battle?.battleId, effectsEnabled]);
  useEffect(() => {
    if (!effectsEnabled) {
      setImpact(null);
      setVisualEvent(null);
      setRevealing(false);
    }
  }, [effectsEnabled]);
  // Subscription updates are the only source of impact effects; never animate a predicted turn.
  useEffect(() => {
    if (!battle || !localAddress) return;
    if (lastBattleId.current !== battle.battleId) {
      lastBattleId.current = battle.battleId;
      lastSeenTurn.current = latestId ?? 'none';
      return;
    }
    if (!latestId || !latestPlayer) return;
    if (lastSeenTurn.current === latestId) return;
    lastSeenTurn.current = latestId;
    setMessage('');
    const target: 'you' | 'opponent' =
      latestPlayer === localAddress ? 'opponent' : 'you';
    if (!effectsEnabled) return;
    const event =
      latestKind === 'switch' || latestKind === 'protect'
        ? {
            kind: latestKind,
            target:
              latestPlayer === localAddress
                ? ('you' as const)
                : ('opponent' as const),
            protectSuccess: latestProtectSuccess,
          }
        : {
            kind: 'attack' as const,
            target,
            damage: latestDamage ?? 0,
            critical: latestCritical ?? false,
            knockedOut: latestTargetHealth === 0,
            blocked: latestBlocked,
          };
    const frame = requestAnimationFrame(() => {
      setVisualEvent(event);
      setImpact(
        latestKind === 'switch' || latestKind === 'protect' ? null : target,
      );
    });
    const timer = window.setTimeout(() => {
      setImpact(null);
      setVisualEvent(null);
    }, 900);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [
    latestId,
    latestPlayer,
    latestKind,
    latestDamage,
    latestCritical,
    latestTargetHealth,
    latestProtectSuccess,
    latestBlocked,
    battle?.battleId,
    localAddress,
    effectsEnabled,
  ]);

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

  if (
    battle.gameState.status === 'initializing' &&
    battle.player1Roster &&
    battle.player2Roster
  ) {
    return (
      <BattleLineupSetup
        battleId={battleId}
        address={selectedAccount.address}
        roster={isPlayer1 ? battle.player1Roster : battle.player2Roster}
        rosterData={
          isPlayer1 ? battle.player1RosterData : battle.player2RosterData
        }
        opponentRoster={isPlayer1 ? battle.player2Roster : battle.player1Roster}
        opponentData={
          isPlayer1 ? battle.player2RosterData : battle.player1RosterData
        }
        locked={
          !!(isPlayer1
            ? battle.gameState.player1Lineup
            : battle.gameState.player2Lineup)
        }
      />
    );
  }

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
  const rosterBattle = !!battle.player1Roster && !!battle.player2Roster;
  const yourRoster = (isPlayer1
    ? battle.player1Roster
    : battle.player2Roster) ?? [yours];
  const opponentRoster = (isPlayer1
    ? battle.player2Roster
    : battle.player1Roster) ?? [theirs];
  const yourRosterData = (isPlayer1
    ? battle.player1RosterData
    : battle.player2RosterData) ?? [yourData];
  const opponentRosterData = (isPlayer1
    ? battle.player2RosterData
    : battle.player1RosterData) ?? [theirData];
  const yourLineup = (isPlayer1
    ? battle.gameState.player1Lineup
    : battle.gameState.player2Lineup) ?? [0];
  const opponentLineup = (isPlayer1
    ? battle.gameState.player2Lineup
    : battle.gameState.player1Lineup) ?? [0];
  const yourActiveIndex = rosterBattle
    ? isPlayer1
      ? battle.gameState.player1Active
      : battle.gameState.player2Active
    : 0;
  const opponentActiveIndex = rosterBattle
    ? isPlayer1
      ? battle.gameState.player2Active
      : battle.gameState.player1Active
    : 0;
  const yourCardHealth = (isPlayer1
    ? battle.gameState.player1CardHealth
    : battle.gameState.player2CardHealth) ?? [yourHealth];
  const opponentCardHealth = (isPlayer1
    ? battle.gameState.player2CardHealth
    : battle.gameState.player1CardHealth) ?? [opponentHealth];
  const activeCard =
    yourActiveIndex === undefined ? undefined : yourRoster[yourActiveIndex];
  const moveSource = activeCard?.moves?.length
    ? activeCard.moves
    : yourRosterData[yourActiveIndex ?? 0]?.customMoves;
  const moves = moveSource?.length
    ? moveSource
    : [{ name: 'Strike', description: 'A basic attack.', iconName: 'Swords' }];
  const finished = battle.gameState.status === 'finished';
  const active = battle.gameState.status === 'active';
  const priorityBattle = battle.rulesVersion === 2;
  const choiceLocked = !!(isPlayer1
    ? battle.gameState.roundChoices?.player1
    : battle.gameState.roundChoices?.player2);
  const yourTurn = priorityBattle
    ? !choiceLocked &&
      (yourActiveIndex === undefined || opponentActiveIndex === undefined
        ? battle.gameState.currentTurn === selectedAccount.address
        : true)
    : battle.gameState.currentTurn === selectedAccount.address;
  const canAct =
    active && yourTurn && !battle.gameState.pendingTurn && !executing;
  const needsReplacement =
    rosterBattle && yourActiveIndex === undefined && active;
  const statusMessage = finished
    ? 'The final result is recorded.'
    : needsReplacement && yourTurn
      ? 'Your card was knocked out. Choose a surviving reserve to continue.'
      : priorityBattle && choiceLocked
        ? 'Action locked. Waiting for the rival to choose.'
        : priorityBattle && !yourTurn
          ? 'Waiting for the rival to choose a replacement.'
          : message ||
            (battle.gameState.pendingTurn
              ? 'A turn is being processed.'
              : yourTurn
                ? selectedMove
                  ? `Ready to use ${selectedMove}. Confirm to resolve the turn.`
                  : 'Your turn. Choose a move from the hover box.'
                : `Waiting for ${opponentName}.`);
  const won = battle.gameState.winner === selectedAccount.address;
  const displayTurn = yourTurn ? 'player' : 'opponent';
  const selectedMoveIsValid = moves.some(
    (move) =>
      move.name === selectedMove &&
      (move.kind !== 'switchout' || switchTarget !== null),
  );
  const inspectedRoster =
    inspected?.side === 'you' ? yourRoster : opponentRoster;
  const inspectedData =
    inspected?.side === 'you' ? yourRosterData : opponentRosterData;
  const inspectedHealth =
    inspected?.side === 'you' ? yourCardHealth : opponentCardHealth;
  const inspectedCard = inspected
    ? inspectedRoster[inspected.index]
    : undefined;
  const inspectedMeta = inspected
    ? getNFTMetadata(inspectedData[inspected.index]?.itemMetadata)
    : null;
  const inspectedImage = getIpfsImageUrl(inspectedMeta);
  function openInspection(
    trigger: HTMLButtonElement,
    side: 'you' | 'opponent',
    index: number,
  ) {
    inspectTriggerRef.current = trigger;
    setInspected({ side, index });
  }
  function closeInspection() {
    setInspected(null);
  }
  const canSwitch =
    inspected?.side === 'you' &&
    active &&
    !executing &&
    (needsReplacement
      ? yourTurn
      : priorityBattle
        ? canAct && moves.some((move) => move.kind === 'switchout')
        : canAct) &&
    inspectedCard &&
    yourLineup.includes(inspected.index) &&
    inspected.index !== yourActiveIndex &&
    (yourCardHealth[inspected.index] ?? 0) > 0;

  async function switchCard() {
    if (!inspected || !selectedAccount || !canSwitch) return;
    if (priorityBattle && !needsReplacement) {
      const switchMove = moves.find((move) => move.kind === 'switchout');
      if (!switchMove) return;
      setSwitchTarget(inspected.index);
      setSelectedMove(switchMove.name);
      closeInspection();
      return;
    }
    setExecuting(true);
    try {
      await changeActiveCard({
        battleId,
        playerAddress: selectedAccount.address,
        cardIndex: inspected.index,
      });
      setSelectedMove(null);
      setSwitchTarget(null);
      setInspected(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not switch card',
      );
    } finally {
      setExecuting(false);
    }
  }

  async function attack() {
    if (
      !battle ||
      !selectedMove ||
      !selectedMoveIsValid ||
      !canAct ||
      needsReplacement ||
      !selectedAccount
    )
      return;
    setExecuting(true);
    setMessage(priorityBattle ? 'Locking action...' : 'Resolving turn...');
    try {
      if (priorityBattle) {
        const result = await submitRoundAction({
          battleId,
          playerAddress: selectedAccount.address,
          expectedRound: battle.gameState.turnNumber + 1,
          action: selectedMove,
          ...(switchTarget === null ? {} : { cardIndex: switchTarget }),
        });
        setMessage(
          result.resolved
            ? 'Round resolved.'
            : 'Action locked. Waiting for the rival.',
        );
      } else {
        const result = await executeTurn({
          battleId,
          playerAddress: selectedAccount.address,
          action: selectedMove,
        });
        setMessage(
          `${result.wasCritical ? 'Critical hit! ' : ''}${result.damage} damage dealt.`,
        );
      }
      setSelectedMove(null);
      setSwitchTarget(null);
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
        data-revealing={revealing ? 'true' : undefined}
        data-testid="battle-stage"
        aria-label={`${yourName} versus ${opponentName} live NFT battle`}
      >
        <BattleField
          handCount={yourLineup.length}
          matchLabel={`MINT ARENA · ${priorityBattle ? 'ROUND' : 'TURN'} ${battle.gameState.turnNumber}`}
          showStacks={false}
          showPrizes={false}
          showOpponentHand={false}
        />

        <div
          className="cards-layer live-nft-layer"
          aria-label="NFTs on the battle table"
        >
          {opponentActiveIndex !== undefined && (
            <BattleNFTCard
              className="opponent-board-nft"
              card={opponentRoster[opponentActiveIndex]}
              metadata={opponentRosterData[opponentActiveIndex]?.itemMetadata}
              health={opponentHealth}
              label="opponent active"
              style={{ left: '50%', top: '31%' }}
              impact={impact === 'opponent'}
              onInspect={(trigger) =>
                openInspection(trigger, 'opponent', opponentActiveIndex)
              }
            />
          )}
          {yourActiveIndex !== undefined && (
            <div
              className={`active-nft-wrap ${movePopoverOpen ? 'moves-open' : ''}`}
            >
              <BattleNFTCard
                className="local-board-nft"
                card={yourRoster[yourActiveIndex]}
                metadata={yourRosterData[yourActiveIndex]?.itemMetadata}
                health={yourHealth}
                label="your active card"
                impact={impact === 'you'}
                onInspect={(trigger) =>
                  openInspection(trigger, 'you', yourActiveIndex)
                }
              />
              <div
                className="live-moves-popover"
                aria-label="Active card moves"
              >
                <strong>
                  Moves ·{' '}
                  {getNFTMetadata(yourRosterData[yourActiveIndex]?.itemMetadata)
                    ?.name || yourRoster[yourActiveIndex].item}
                </strong>
                {moves.map((move, index) => (
                  <button
                    key={`${move.name}-${index}`}
                    type="button"
                    disabled={
                      !canAct ||
                      needsReplacement ||
                      (move.kind === 'switchout' &&
                        !yourLineup.some(
                          (index) =>
                            index !== yourActiveIndex &&
                            (yourCardHealth[index] ?? 0) > 0,
                        ))
                    }
                    aria-pressed={selectedMove === move.name}
                    onClick={(event) => {
                      setSelectedMove(move.name);
                      setSwitchTarget(null);
                      setMovePopoverOpen(false);
                      if (priorityBattle && move.kind === 'switchout') {
                        const reserve = yourLineup.find(
                          (index) =>
                            index !== yourActiveIndex &&
                            (yourCardHealth[index] ?? 0) > 0,
                        );
                        if (reserve !== undefined)
                          openInspection(event.currentTarget, 'you', reserve);
                      }
                    }}
                  >
                    <b>{move.name}</b>
                    <small>
                      {move.kind === 'attack'
                        ? `${getNFTTypeName(move.element ?? activeCard?.stats.nftType ?? -1)} attack`
                        : move.kind === 'protect'
                          ? 'Protect · priority'
                          : move.kind === 'switchout'
                            ? 'Switchout · choose a reserve'
                            : 'Attack'}
                    </small>
                    <small>{move.description}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
          {yourLineup.map((cardIndex, index) => (
            <BattleNFTCard
              key={`lineup-${cardIndex}`}
              className="local-lineup-nft"
              card={yourRoster[cardIndex]}
              metadata={yourRosterData[cardIndex]?.itemMetadata}
              health={yourCardHealth[cardIndex]}
              label={
                cardIndex === yourActiveIndex
                  ? 'active lineup card'
                  : 'reserve card'
              }
              active={cardIndex === yourActiveIndex}
              style={{
                left: `${49 + (index - (yourLineup.length - 1) / 2) * 14}%`,
                top: '80%',
              }}
              onInspect={(trigger) => openInspection(trigger, 'you', cardIndex)}
            />
          ))}
          {rosterBattle &&
            opponentLineup.map((cardIndex, index) => (
              <BattleNFTCard
                key={`opponent-lineup-${cardIndex}`}
                className="opponent-lineup-nft"
                card={opponentRoster[cardIndex]}
                metadata={opponentRosterData[cardIndex]?.itemMetadata}
                health={opponentCardHealth[cardIndex]}
                label="opponent lineup card"
                active={cardIndex === opponentActiveIndex}
                style={{
                  left: `${49 + (index - (opponentLineup.length - 1) / 2) * 14}%`,
                  top: '13%',
                }}
                onInspect={(trigger) =>
                  openInspection(trigger, 'opponent', cardIndex)
                }
              />
            ))}
        </div>

        {visualEvent && (
          <div
            className={`live-event-vfx live-event-${visualEvent.kind} live-event-${visualEvent.target}`}
            aria-hidden="true"
          >
            <span className="live-event-beam" />
            <span className="live-event-ring" />
            <strong>
              {visualEvent.kind === 'protect'
                ? visualEvent.protectSuccess
                  ? 'PROTECTED'
                  : 'PROTECT FAILED'
                : visualEvent.kind === 'switch'
                  ? 'SWITCH'
                  : visualEvent.knockedOut
                    ? 'KNOCKOUT'
                    : visualEvent.blocked
                      ? 'BLOCKED'
                      : visualEvent.critical
                        ? 'CRITICAL HIT'
                        : 'HIT'}
            </strong>
            {visualEvent.kind === 'attack' && (
              <b>
                {visualEvent.blocked
                  ? 'NO DAMAGE'
                  : `${visualEvent.damage} DAMAGE`}
              </b>
            )}
          </div>
        )}

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

        <DialogPrimitive.Root
          open={!!inspectedCard}
          onOpenChange={(open) => {
            if (!open) closeInspection();
          }}
        >
          {inspectedCard && inspected && (
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="live-inspect-backdrop" />
              <DialogPrimitive.Content
                className="live-inspect"
                aria-describedby="live-inspect-subtitle"
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  if (inspectTriggerRef.current?.isConnected)
                    inspectTriggerRef.current.focus();
                }}
              >
                <div className="live-inspect-heading">
                  <span>
                    CARD INSPECT ·{' '}
                    {inspected.side === 'you'
                      ? 'YOUR COLLECTION'
                      : 'RIVAL COLLECTION'}
                  </span>
                  <DialogPrimitive.Close
                    type="button"
                    aria-label="Close card inspection"
                  >
                    ×
                  </DialogPrimitive.Close>
                </div>
                <InspectionImage
                  src={inspectedImage}
                  name={inspectedMeta?.name || 'NFT artwork'}
                />
                <DialogPrimitive.Title>
                  {inspectedMeta?.name || `NFT #${inspectedCard.item}`}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description id="live-inspect-subtitle">
                  {getNFTTypeName(inspectedCard.stats.nftType)} ·{' '}
                  {inspected.side === 'you' ? 'Your NFT' : 'Opponent NFT'}
                </DialogPrimitive.Description>
                <dl className="live-inspect-stats">
                  <div>
                    <dt>HP</dt>
                    <dd>
                      {inspectedHealth[inspected.index] ??
                        inspectedCard.stats.maxHealth}
                      /{inspectedCard.stats.maxHealth}
                    </dd>
                  </div>
                  {(
                    [
                      'attack',
                      'defense',
                      'speed',
                      'strength',
                      'intelligence',
                      'luck',
                    ] as const
                  ).map((stat) => (
                    <div key={stat}>
                      <dt>{stat}</dt>
                      <dd>{inspectedCard.stats[stat]}</dd>
                    </div>
                  ))}
                </dl>
                {inspectedMeta?.description && (
                  <p>{inspectedMeta.description}</p>
                )}
                <div className="live-inspect-moves">
                  {(
                    inspectedCard.moves ??
                    inspectedData[inspected.index]?.customMoves ??
                    []
                  ).map((move, index) => (
                    <p key={`${move.name}-${index}`}>
                      <b>{move.name}</b> ·{' '}
                      {move.kind === 'attack'
                        ? `${getNFTTypeName(move.element ?? inspectedCard.stats.nftType)} attack · `
                        : move.kind === 'protect'
                          ? 'Protect · '
                          : move.kind === 'switchout'
                            ? 'Switchout · '
                            : ''}
                      {move.description}
                    </p>
                  ))}
                </div>
                {canSwitch && (
                  <button
                    className="live-inspect-switch"
                    type="button"
                    onClick={() => void switchCard()}
                  >
                    {needsReplacement
                      ? 'Choose replacement'
                      : priorityBattle
                        ? 'Select for Switchout'
                        : 'Switch to this card (uses turn)'}
                  </button>
                )}
                {rosterBattle && (
                  <div
                    className="live-inspect-roster"
                    aria-label="Browse roster cards"
                  >
                    {inspectedRoster.map((card, index) => (
                      <button
                        key={`${card.collection}:${card.item}`}
                        type="button"
                        aria-label={`Inspect NFT ${index + 1}`}
                        aria-pressed={index === inspected.index}
                        onClick={() =>
                          setInspected({ side: inspected.side, index })
                        }
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                )}
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </DialogPrimitive.Root>

        <div className="player-console">
          <div className="console-profile">
            <span className="console-avatar">
              {yourName.charAt(0).toUpperCase()}
            </span>
            <span>
              <b>{yourName}</b>
              <small>{yourMeta?.name || `NFT #${yours.item}`}</small>
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
                  : `${priorityBattle ? 'ROUND' : 'TURN'} ${battle.gameState.turnNumber}`}
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
          <div className="live-quick-controls">
            <Link
              href="/battle"
              className="live-arena-link"
              aria-label="Return to arena"
            >
              ← Arena
            </Link>
            <button
              className="live-effects-toggle"
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
              aria-pressed={!effectsEnabled}
            >
              <Icon name="shield" size={16} />
            </button>
          </div>
          <div className="action-buttons">
            <button
              type="button"
              className="action-button action-secondary live-moves-toggle"
              onClick={() => setMovePopoverOpen((open) => !open)}
              disabled={
                !canAct || needsReplacement || yourActiveIndex === undefined
              }
              aria-expanded={movePopoverOpen}
              aria-label="Choose an active card move"
            >
              <span>
                <b>CHOOSE MOVE</b>
                <small>
                  {selectedMove
                    ? `${selectedMove}${switchTarget !== null ? ` → NFT ${switchTarget + 1}` : ''}`
                    : 'VIEW MOVES'}
                </small>
              </span>
            </button>
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
                      : priorityBattle
                        ? 'LOCK ACTION'
                        : 'PLAY MOVE'}
                </b>
                <small>
                  {executing
                    ? 'WAIT FOR RESULT'
                    : !yourTurn
                      ? 'RIVAL’S TURN'
                      : selectedMoveIsValid
                        ? selectedMove?.toUpperCase()
                        : 'SELECT A MOVE'}
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
                      {priorityBattle ? 'ROUND' : 'TURN'} {move.turnNumber} ·{' '}
                      {move.player === selectedAccount.address
                        ? 'YOU'
                        : opponentName}
                    </small>
                    <b>{move.action}</b>
                    <span>
                      {move.kind === 'switch'
                        ? 'CARD CHANGE'
                        : move.kind === 'protect'
                          ? move.protectSuccess
                            ? 'PROTECTED'
                            : 'PROTECT FAILED'
                          : `${move.damage ?? 0} DAMAGE${move.blocked ? ' · BLOCKED' : ''}${getEffectivenessLabel(move.effectiveness)}${move.wasCritical ? ' · CRITICAL' : ''}`}
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
