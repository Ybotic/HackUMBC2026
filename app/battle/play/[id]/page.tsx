'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';
import '@/components/battle/tcg/battle.css';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { PageStateCard } from '@/components/battle/PageStateCard';
import { BattleLineupSetup } from '@/components/battle/BattleLineupSetup';
import { BattleNFTCard } from '@/components/battle/BattleNFTCard';
import { BattleMusicControls } from '@/components/battle/BattleMusicControls';
import BattleField from '@/components/battle/tcg/BattleField';
import { Icon } from '@/components/battle/tcg/Icon';
import {
  SWITCH_ACTION,
  getPlayerDisplayName,
  getNFTTypeName,
  protectChance,
  withProtectMove,
} from '@/lib/battle-utils';
import { getNFTMetadata, getIpfsImageUrl } from '@/lib/utils';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useBattleAnnouncer } from '@/lib/battle-announcer/useBattleAnnouncer';

function InspectionImage({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? (
    <img src={src} alt={name} onError={() => setFailed(true)} />
  ) : (
    <div className="live-inspect-fallback">Artwork unavailable</div>
  );
}

function getEffectivenessLabel(effectiveness?: number): string | null {
  if (effectiveness === undefined || effectiveness === 1) return null;
  if (effectiveness === 0) return 'No effect';
  return effectiveness > 1 ? 'Super effective' : 'Not very effective';
}

const moveIcons = {
  attack: 'flame',
  protect: 'shield',
} as const;

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
  const [confirmSwitch, setConfirmSwitch] = useState<number | null>(null);
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
  const [entering, setEntering] = useState({ you: false, opponent: false });
  const [knockedOut, setKnockedOut] = useState<{
    side: 'you' | 'opponent';
    index: number;
  } | null>(null);
  const inspectTriggerRef = useRef<HTMLButtonElement | null>(null);
  const lastSeenTurn = useRef<string | null>(null);
  const lastBattleId = useRef<string | null>(null);
  const previousStatus = useRef<string | null>(null);
  const previousActive = useRef<{
    battleId: string;
    you?: number;
    opponent?: number;
  } | null>(null);

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
  const announcer = useBattleAnnouncer(battleId, localAddress, battle);
  const localActive =
    selectedAccount?.address === battle?.player1Address
      ? battle?.gameState.player1Active
      : battle?.gameState.player2Active;
  const rivalActive =
    selectedAccount?.address === battle?.player1Address
      ? battle?.gameState.player2Active
      : battle?.gameState.player1Active;
  useEffect(() => {
    setSelectedMove(null);
    setSwitchTarget(null);
    setConfirmSwitch(null);
  }, [localActive, battle?.battleId]);
  // Animate cards entering or leaving the active slots, but never on first load.
  useEffect(() => {
    if (!battle) return;
    const previous = previousActive.current;
    previousActive.current = {
      battleId: battle.battleId,
      you: localActive,
      opponent: rivalActive,
    };
    if (!previous || previous.battleId !== battle.battleId || !effectsEnabled)
      return;
    const you = localActive !== undefined && localActive !== previous.you;
    const opponent =
      rivalActive !== undefined && rivalActive !== previous.opponent;
    const fallen =
      previous.you !== undefined && localActive === undefined
        ? { side: 'you' as const, index: previous.you }
        : previous.opponent !== undefined && rivalActive === undefined
          ? { side: 'opponent' as const, index: previous.opponent }
          : null;
    if (!you && !opponent && !fallen) return;
    setEntering({ you, opponent });
    if (fallen) setKnockedOut(fallen);
    const enterTimer = window.setTimeout(
      () => setEntering({ you: false, opponent: false }),
      560,
    );
    const knockoutTimer = window.setTimeout(() => setKnockedOut(null), 950);
    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(knockoutTimer);
      setEntering({ you: false, opponent: false });
      setKnockedOut(null);
    };
  }, [localActive, rivalActive, battle?.battleId, effectsEnabled]);
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
    ? withProtectMove(moveSource)
    : [{ name: 'Strike', description: 'A basic attack.', iconName: 'Swords' }];
  const yourProtectChance = protectChance(
    yourActiveIndex === undefined
      ? 0
      : (isPlayer1
          ? battle.gameState.protectStreak1
          : battle.gameState.protectStreak2)?.[yourActiveIndex],
  );
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
  const switchAvailable =
    active && !executing && (needsReplacement ? yourTurn : canAct);
  const canSwitchTo = (index: number) =>
    switchAvailable &&
    !!yourRoster[index] &&
    yourLineup.includes(index) &&
    index !== yourActiveIndex &&
    (yourCardHealth[index] ?? 0) > 0;
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
                ? 'Your turn. Tap a move to play it.'
                : `Waiting for ${opponentName}.`);
  const won = battle.gameState.winner === selectedAccount.address;
  const displayTurn = yourTurn ? 'player' : 'opponent';
  const yourCardName = (index: number) =>
    getNFTMetadata(yourRosterData[index]?.itemMetadata)?.name ||
    `NFT #${yourRoster[index]?.item}`;
  const activeCardName =
    yourActiveIndex === undefined ? null : yourCardName(yourActiveIndex);
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
  const knockedOutImage =
    knockedOut &&
    (knockedOut.side === 'you' ? yourActiveIndex : opponentActiveIndex) ===
      undefined
      ? getIpfsImageUrl(
          getNFTMetadata(
            (knockedOut.side === 'you' ? yourRosterData : opponentRosterData)[
              knockedOut.index
            ]?.itemMetadata,
          ),
        )
      : null;
  const eventName = visualEvent
    ? visualEvent.kind === 'protect' && !visualEvent.protectSuccess
      ? 'protect-failed'
      : visualEvent.kind
    : undefined;
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
  // A forced replacement after a knockout is free; any other switch costs the turn.
  function requestSwitch(cardIndex: number) {
    if (!canSwitchTo(cardIndex)) return;
    if (needsReplacement) void switchCard(cardIndex);
    else setConfirmSwitch(cardIndex);
  }

  async function switchCard(cardIndex: number) {
    setConfirmSwitch(null);
    if (!selectedAccount || !canSwitchTo(cardIndex)) return;
    if (priorityBattle && !needsReplacement) {
      void playMove(SWITCH_ACTION, cardIndex);
      return;
    }
    setExecuting(true);
    try {
      await changeActiveCard({
        battleId,
        playerAddress: selectedAccount.address,
        cardIndex,
      });
      setSelectedMove(null);
      setSwitchTarget(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not switch card',
      );
    } finally {
      setExecuting(false);
    }
  }

  async function playMove(moveName: string, cardIndex?: number) {
    if (!battle || !canAct || needsReplacement || !selectedAccount) return;
    setSelectedMove(moveName);
    setSwitchTarget(cardIndex ?? null);
    setExecuting(true);
    setMessage(priorityBattle ? 'Locking action...' : 'Resolving turn...');
    try {
      if (priorityBattle) {
        const result = await submitRoundAction({
          battleId,
          playerAddress: selectedAccount.address,
          expectedRound: battle.gameState.turnNumber + 1,
          action: moveName,
          ...(cardIndex === undefined ? {} : { cardIndex }),
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
          action: moveName,
        });
        setMessage(
          `${result.wasCritical ? 'Critical hit! ' : ''}${result.damage} damage dealt.`,
        );
      }
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Unable to play that move';
      setMessage(detail);
      toast.error(detail);
    } finally {
      setExecuting(false);
      setSelectedMove(null);
      setSwitchTarget(null);
    }
  }

  return (
    <main className="battle-client live-match">
      <div
        className={`battle-stage${effectsEnabled ? '' : ' is-reduced-motion'}`}
        data-turn={displayTurn}
        data-impact={impact ?? undefined}
        data-event={eventName}
        data-event-target={visualEvent?.target}
        data-critical={visualEvent?.critical ? 'true' : undefined}
        data-revealing={revealing ? 'true' : undefined}
        data-testid="battle-stage"
        aria-label={`${yourName} versus ${opponentName} live NFT battle`}
      >
        <BattleMusicControls />
        <div className="live-announcer" aria-label="Battle announcer">
          <button
            type="button"
            aria-pressed={announcer.enabled}
            onClick={announcer.toggle}
          >
            Announcer: {announcer.enabled ? 'On' : 'Off'}
          </button>
          <p
            className="live-announcer-caption"
            aria-label="Announcer caption"
            aria-live="off"
          >
            {announcer.caption ||
              'Announcer captions appear here during the match.'}
          </p>
          {!announcer.hasClips && (
            <small>Captions only — voice clips have not been generated.</small>
          )}
        </div>
        <BattleField
          handCount={yourLineup.length}
          showStacks={false}
          showPrizes={false}
          showOpponentHand={false}
          showHandTray={false}
        />

        <div
          className="cards-layer live-nft-layer"
          aria-label="NFTs on the battle table"
        >
          {opponentActiveIndex !== undefined && (
            <BattleNFTCard
              key={`opponent-active-${opponentActiveIndex}`}
              className="opponent-board-nft"
              card={opponentRoster[opponentActiveIndex]}
              metadata={opponentRosterData[opponentActiveIndex]?.itemMetadata}
              health={opponentHealth}
              label="opponent active"
              style={{ left: '50%', top: '31%' }}
              impact={impact === 'opponent'}
              entering={entering.opponent}
              onInspect={(trigger) =>
                openInspection(trigger, 'opponent', opponentActiveIndex)
              }
            />
          )}
          {yourActiveIndex !== undefined && (
            <div className="active-nft-wrap">
              <BattleNFTCard
                key={`local-active-${yourActiveIndex}`}
                className="local-board-nft"
                card={yourRoster[yourActiveIndex]}
                metadata={yourRosterData[yourActiveIndex]?.itemMetadata}
                health={yourHealth}
                label="your active card"
                impact={impact === 'you'}
                entering={entering.you}
                onInspect={(trigger) =>
                  openInspection(trigger, 'you', yourActiveIndex)
                }
              />
            </div>
          )}
          {yourLineup.map((cardIndex, index) => {
            const lineupOffset = index - (yourLineup.length - 1) / 2;
            const switchable = canSwitchTo(cardIndex);
            return (
              <div
                key={`lineup-${cardIndex}`}
                className="local-lineup-slot"
                style={
                  {
                    left: `${49 + lineupOffset * 14}%`,
                    top: '80%',
                    '--lineup-yaw': `${-lineupOffset * 7}deg`,
                    '--lineup-roll': `${-lineupOffset * 3}deg`,
                  } as CSSProperties
                }
              >
                <BattleNFTCard
                  className={`local-lineup-nft${
                    switchable && needsReplacement ? ' is-choosable' : ''
                  }`}
                  card={yourRoster[cardIndex]}
                  metadata={yourRosterData[cardIndex]?.itemMetadata}
                  health={yourCardHealth[cardIndex]}
                  label={
                    cardIndex === yourActiveIndex
                      ? 'active lineup card'
                      : switchTarget === cardIndex
                        ? 'reserve card, selected for switch'
                        : 'reserve card'
                  }
                  active={cardIndex === yourActiveIndex}
                  selected={
                    switchTarget === cardIndex || confirmSwitch === cardIndex
                  }
                  onInspect={(trigger) =>
                    openInspection(trigger, 'you', cardIndex)
                  }
                />
                {switchable && (
                  <button
                    type="button"
                    className="live-lineup-switch"
                    aria-label={`Switch to ${yourCardName(cardIndex)}`}
                    onClick={() => requestSwitch(cardIndex)}
                  >
                    <Icon name="switch" size={13} />
                    <span>Switch to</span>
                  </button>
                )}
              </div>
            );
          })}
          {rosterBattle && (
            <div className="opponent-lineup-row">
              {opponentLineup.map((cardIndex, index) => {
                const lineupOffset = index - (opponentLineup.length - 1) / 2;
                return (
                  <BattleNFTCard
                    key={`opponent-lineup-${cardIndex}`}
                    className="opponent-lineup-nft"
                    card={opponentRoster[cardIndex]}
                    metadata={opponentRosterData[cardIndex]?.itemMetadata}
                    health={opponentCardHealth[cardIndex]}
                    label="opponent lineup card"
                    active={cardIndex === opponentActiveIndex}
                    style={
                      {
                        left: `${49 + lineupOffset * 14}%`,
                        top: '7%',
                        '--lineup-yaw': `${lineupOffset * 7}deg`,
                        '--lineup-roll': `${lineupOffset * 3}deg`,
                      } as CSSProperties
                    }
                    onInspect={(trigger) =>
                      openInspection(trigger, 'opponent', cardIndex)
                    }
                  />
                );
              })}
            </div>
          )}
          {knockedOut && knockedOutImage && (
            <div
              className={`live-ko-ghost live-ko-ghost-${knockedOut.side}`}
              aria-hidden="true"
            >
              <img src={knockedOutImage} alt="" />
            </div>
          )}
        </div>

        {visualEvent && (
          <div
            className={[
              'live-event-vfx',
              `live-event-${visualEvent.kind}`,
              `live-event-${visualEvent.target}`,
              visualEvent.critical && 'is-critical',
              visualEvent.knockedOut && 'is-ko',
              visualEvent.blocked && 'is-blocked',
              visualEvent.kind === 'protect' &&
                !visualEvent.protectSuccess &&
                'is-failed',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden="true"
          >
            <span className="live-event-beam" />
            <span className="live-event-ring" />
            <span className="live-event-label">
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
            </span>
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
              <b
                style={{
                  width: `${opponentMaxHealth ? (opponentHealth / opponentMaxHealth) * 100 : 0}%`,
                }}
              />
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
              <b
                style={{
                  width: `${yourMaxHealth ? (yourHealth / yourMaxHealth) * 100 : 0}%`,
                }}
              />
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
              <DialogPrimitive.Overlay
                className={`live-inspect-backdrop${effectsEnabled ? '' : ' is-reduced-motion'}`}
              />
              <DialogPrimitive.Content
                className={`live-inspect${effectsEnabled ? '' : ' is-reduced-motion'}`}
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
                  key={`${inspected.side}-${inspected.index}`}
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
                  {withProtectMove(
                    inspectedCard.moves ??
                      inspectedData[inspected.index]?.customMoves ??
                      [],
                  ).map((move, index) => (
                    <p key={`${move.name}-${index}`}>
                      <b>{move.name}</b> ·{' '}
                      {move.kind === 'attack'
                        ? `${getNFTTypeName(move.element ?? inspectedCard.stats.nftType)} attack · `
                        : move.kind === 'protect'
                          ? 'Protect · '
                          : ''}
                      {move.description}
                    </p>
                  ))}
                </div>
                {rosterBattle && (
                  <div
                    className="live-inspect-roster"
                    aria-label="Browse roster cards"
                  >
                    {inspectedRoster.map((card, index) => (
                      <button
                        key={`${card.collection}:${card.item}`}
                        type="button"
                        aria-label={`Inspect NFT ${index + 1}${(inspectedHealth[index] ?? card.stats.maxHealth) <= 0 ? ', knocked out' : ''}`}
                        aria-pressed={index === inspected.index}
                        data-fainted={
                          (inspectedHealth[index] ?? card.stats.maxHealth) <= 0
                            ? 'true'
                            : undefined
                        }
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

        <DialogPrimitive.Root
          open={confirmSwitch !== null}
          onOpenChange={(open) => {
            if (!open) setConfirmSwitch(null);
          }}
        >
          {confirmSwitch !== null && (
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay
                className={`live-confirm-backdrop${effectsEnabled ? '' : ' is-reduced-motion'}`}
              />
              <DialogPrimitive.Content
                className={`live-confirm${effectsEnabled ? '' : ' is-reduced-motion'}`}
              >
                <DialogPrimitive.Title>
                  Switch to {yourCardName(confirmSwitch)}?
                </DialogPrimitive.Title>
                <DialogPrimitive.Description>
                  This will use up your turn.
                </DialogPrimitive.Description>
                <div className="live-confirm-actions">
                  <DialogPrimitive.Close type="button">
                    Cancel
                  </DialogPrimitive.Close>
                  <button
                    type="button"
                    data-variant="confirm"
                    onClick={() => void switchCard(confirmSwitch)}
                  >
                    Switch
                  </button>
                </div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </DialogPrimitive.Root>

        <section
          className="live-moves-panel"
          aria-label="Moves"
          data-ready={canAct && !needsReplacement ? 'true' : undefined}
        >
          <header className="live-panel-heading">
            <span className="live-panel-kicker">
              <i /> MOVES
            </span>
            <b>{activeCardName ?? 'No active card'}</b>
          </header>
          <p className="live-moves-status" role="status" aria-live="polite">
            <span key={statusMessage}>{statusMessage}</span>
          </p>
          <div className="live-move-list">
            {moves.map((move, index) => {
              const kind = move.kind ?? 'attack';
              const pending = executing && selectedMove === move.name;
              return (
                <button
                  key={`${move.name}-${index}`}
                  type="button"
                  className="live-move"
                  data-kind={kind}
                  style={{ '--move-index': index } as CSSProperties}
                  disabled={!canAct || needsReplacement}
                  aria-busy={pending}
                  onClick={() => void playMove(move.name)}
                >
                  <span className="live-move-icon">
                    <Icon
                      name={
                        moveIcons[kind as keyof typeof moveIcons] ?? 'spark'
                      }
                      size={16}
                    />
                  </span>
                  <span className="live-move-copy">
                    <b>{move.name}</b>
                    <small className="live-move-kind">
                      {pending
                        ? priorityBattle
                          ? 'Locking…'
                          : 'Resolving…'
                        : kind === 'protect'
                          ? `Protect · moves first · ${yourProtectChance}% success`
                          : `${getNFTTypeName(move.element ?? activeCard?.stats.nftType ?? -1)} attack`}
                    </small>
                    <small className="live-move-desc">{move.description}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="live-log-panel" aria-label="Battle log">
          <header className="live-panel-heading">
            <span className="live-panel-kicker">
              <i /> BATTLE LOG
            </span>
            <small>
              {battle.moves.length} EVENT{battle.moves.length === 1 ? '' : 'S'}
            </small>
          </header>
          {battle.moves.length === 0 ? (
            <p className="live-log-empty">
              No moves yet. The first strike will appear here.
            </p>
          ) : (
            <ol className="live-log-list">
              {[...battle.moves].reverse().map((move) => {
                const mine = move.player === selectedAccount.address;
                const effectiveness = getEffectivenessLabel(move.effectiveness);
                const notes = [
                  move.blocked && 'Blocked',
                  effectiveness,
                  move.wasCritical && 'Critical',
                ].filter(Boolean);
                return (
                  <li
                    key={move.turnId}
                    className="live-log-row"
                    data-side={mine ? 'you' : 'rival'}
                    data-kind={move.kind ?? 'attack'}
                    title={new Date(move.timestamp).toLocaleTimeString()}
                  >
                    <span className="live-log-copy">
                      <small>
                        {mine ? 'You' : opponentName} ·{' '}
                        {priorityBattle ? 'R' : 'T'}
                        {move.turnNumber}
                      </small>
                      <b>{move.action}</b>
                      {notes.length > 0 && <em>{notes.join(' · ')}</em>}
                    </span>
                    <span className="live-log-result">
                      {move.kind === 'switch'
                        ? 'Switch'
                        : move.kind === 'protect'
                          ? move.protectSuccess
                            ? 'Guard'
                            : 'Failed'
                          : `−${move.damage ?? 0}`}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {finished ? (
          <section
            className="live-result"
            role="status"
            aria-live="polite"
            data-outcome={won ? 'victory' : 'defeat'}
          >
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
