'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimationQueue } from '@/battle/animation/AnimationQueue';
import type {
  ActiveEffect,
  AnimationCommand,
  AnimationSequence,
  BattleCard,
  BattleEvent,
  CardPosition,
} from '@/battle/types';
import {
  arvenSearchCards,
  createMockMatch,
  getCardPosition,
  initialDeckCount,
  initialPrizeCount,
  raihanSearchCards,
} from '@/battle/state/mockMatch';
import BattleCardView from '@/components/battle/BattleCard';
import BattleChoiceOverlay from '@/components/battle/BattleChoiceOverlay';
import BattleField from '@/components/battle/BattleField';
import BattleHud, { type ReplayPhase } from '@/components/battle/BattleHud';
import CardPreview from '@/components/battle/CardPreview';
import PrizeOverlay from '@/components/battle/PrizeOverlay';
import SceneEffects, {
  type SceneEffect,
} from '@/components/battle/SceneEffects';
import VfxLayer from '@/components/battle/VfxLayer';

type SearchRequirement = 'item' | 'tool' | 'any';
type SearchSession = {
  player: 'player' | 'opponent';
  title: string;
  eyebrow: string;
  description: string;
  options: BattleCard[];
  requirements: SearchRequirement[];
  selectedIds: string[];
  pending: boolean;
};

type AttackPresentation = {
  attackerId: string | null;
  targetId: string | null;
  energyCost: number;
  costDiscarded: boolean;
  damageRevealed: boolean;
  knockoutRevealed: boolean;
};

const emptyAttackPresentation: AttackPresentation = {
  attackerId: null,
  targetId: null,
  energyCost: 0,
  costDiscarded: false,
  damageRevealed: false,
  knockoutRevealed: false,
};

const sceneEffectDurations: Record<string, number> = {
  'board.switch-wipe': 850,
  'board.magma-basin': 1500,
  'board.turn-indicator': 1200,
};

export default function BattleClient() {
  const [cards, setCards] = useState<BattleCard[]>(createMockMatch);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingAttachmentId, setPendingAttachmentId] = useState<string | null>(
    null,
  );
  const [phase, setPhase] = useState<ReplayPhase>('ready');
  const [search, setSearch] = useState<SearchSession | null>(null);
  const [selectedPrize, setSelectedPrize] = useState<number | null>(null);
  const [prizeFlying, setPrizeFlying] = useState(false);
  const [deckCount, setDeckCount] = useState(initialDeckCount);
  const [playerDiscardCount, setPlayerDiscardCount] = useState(3);
  const [opponentDiscardCount, setOpponentDiscardCount] = useState(6);
  const [opponentHandCount, setOpponentHandCount] = useState(5);
  const [playerPrizes, setPlayerPrizes] = useState(initialPrizeCount);
  const [opponentPrizes] = useState(initialPrizeCount);
  const [turn, setTurn] = useState<'player' | 'opponent'>('player');
  const [displayTurn, setDisplayTurn] = useState<'player' | 'opponent'>(
    'player',
  );
  const [fieldEnergyVisible, setFieldEnergyVisible] = useState(false);
  const [message, setMessage] = useState(
    'Hover or select a card to inspect it. Focus never commits a play.',
  );
  const [effects, setEffects] = useState<ActiveEffect[]>([]);
  const [sceneEffects, setSceneEffects] = useState<SceneEffect[]>([]);
  const [attackBusy, setAttackBusy] = useState(false);
  const [attackPresentation, setAttackPresentation] =
    useState<AttackPresentation>(emptyAttackPresentation);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [sceneVersion, setSceneVersion] = useState(0);
  const [lastEvent, setLastEvent] = useState<BattleEvent | null>(null);
  const [eventLog, setEventLog] = useState<BattleEvent[]>([]);

  const queues = useRef(new Map<string, AnimationQueue>());
  const sceneQueue = useRef<AnimationQueue | null>(null);
  const latestPositions = useRef<Record<string, CardPosition>>({});
  const reducedMotionRef = useRef(false);
  const soundEnabledRef = useRef(false);
  const phaseRef = useRef<ReplayPhase>(phase);
  const sequenceGeneration = useRef(0);
  const attackResolved = useRef(false);
  const commandHandler = useRef<
    (sourceId: string, command: AnimationCommand) => void
  >(() => {});

  const positions = useMemo(() => {
    const next: Record<string, CardPosition> = {};
    for (const card of cards) next[card.id] = getCardPosition(card, cards);
    return next;
  }, [cards]);
  const visibleCards = useMemo(
    () =>
      cards.filter(
        (card) =>
          card.zone !== 'discard' &&
          card.zone !== 'attached' &&
          !(prizeFlying && card.id.startsWith('prize-fire-energy-')),
      ),
    [cards, prizeFlying],
  );
  const selectedCard =
    cards.find(
      (card) =>
        card.id === selectedId &&
        card.zone !== 'discard' &&
        card.zone !== 'attached',
    ) ?? null;
  const handCount = cards.filter((card) => card.zone === 'hand').length;

  const setReplayPhase = useCallback((next: ReplayPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const recordEvent = useCallback((event: BattleEvent) => {
    setLastEvent(event);
    setEventLog((current) => [...current.slice(-23), event]);
  }, []);

  const triggerSceneEffect = useCallback((effectId: string) => {
    const id = `${effectId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setSceneEffects((current) => [...current, { id, effectId }]);
    window.setTimeout(
      () =>
        setSceneEffects((current) =>
          current.filter((effect) => effect.id !== id),
        ),
      reducedMotionRef.current ? 90 : (sceneEffectDurations[effectId] ?? 1000),
    );
  }, []);

  const triggerCardEffect = useCallback(
    (effectId: string, sourceId: string, targetId: string) => {
      const id = `${effectId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const durationMs =
        effectId === 'attack.fire.large'
          ? 1120
          : effectId === 'damage.reveal'
            ? 950
            : 720;
      setEffects((current) => [
        ...current,
        { id, effectId, sourceId, targetId, createdAt: Date.now(), durationMs },
      ]);
    },
    [],
  );

  const expireEffect = useCallback((id: string) => {
    setEffects((current) => current.filter((effect) => effect.id !== id));
  }, []);

  const beginRaihanReveal = useCallback(() => {
    setOpponentHandCount((current) => Math.max(0, current - 1));
    setCards((current) =>
      current.map((card) =>
        card.id === 'opponent-noctowl'
          ? { ...card, energyAttached: (card.energyAttached ?? 0) + 1 }
          : card,
      ),
    );
    setTurn('opponent');
    setReplayPhase('raihan-reveal');
    setMessage(
      'Raihan is revealed. An Energy attaches, then the opponent’s deck search opens.',
    );
    recordEvent({
      type: 'supporterPlayed',
      cardId: 'opponent-raihan',
      supporter: 'raihan',
    });
    recordEvent({
      type: 'energyAttached',
      cardId: 'opponent-noctowl',
      amount: 1,
    });
    void sceneQueue.current?.enqueue({
      id: 'raihan.deck-search-prompt',
      commands: [
        { kind: 'delay', duration: 1.1 },
        { kind: 'event', name: 'raihan-open-search' },
      ],
    });
  }, [recordEvent, setReplayPhase]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyPreference = (enabled: boolean) => {
      reducedMotionRef.current = enabled;
      setReducedMotion(enabled);
      for (const queue of queues.current.values())
        queue.setReducedMotion(enabled);
      sceneQueue.current?.setReducedMotion(enabled);
      if (enabled) {
        for (const queue of queues.current.values()) queue.finishImmediately();
        sceneQueue.current?.finishImmediately();
      }
    };
    const update = (event: MediaQueryListEvent) =>
      applyPreference(event.matches);
    media.addEventListener('change', update);
    queueMicrotask(() => applyPreference(media.matches));
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    latestPositions.current = positions;
  }, [positions]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    commandHandler.current = (sourceId, command) => {
      if (command.kind === 'effect') {
        if (command.effectId.startsWith('board.')) {
          triggerSceneEffect(command.effectId);
        } else {
          triggerCardEffect(command.effectId, sourceId, command.target);
        }
        return;
      }

      if (command.kind === 'event') {
        switch (command.name) {
          case 'attack-cost-discarded':
            setAttackPresentation((current) => ({
              ...current,
              costDiscarded: true,
            }));
            break;
          case 'attack-damage-revealed':
            setAttackPresentation((current) => ({
              ...current,
              damageRevealed: true,
            }));
            break;
          case 'attack-knockout-revealed':
            setAttackPresentation((current) => ({
              ...current,
              knockoutRevealed: true,
            }));
            break;
          case 'magma-energy-revealed':
            setFieldEnergyVisible(true);
            triggerCardEffect(
              'card.energy-attach',
              'magma-basin',
              'growlithe-bench',
            );
            break;
          case 'turn-wipe-started':
            setDisplayTurn('opponent');
            break;
          case 'raihan-reveal-started':
            beginRaihanReveal();
            break;
          case 'raihan-open-search':
            setReplayPhase('raihan-search');
            setMessage(
              'Raihan’s deck search is pending. This replay ends at 5:20.',
            );
            setSearch({
              player: 'opponent',
              title: 'Choose a card from the deck',
              eyebrow: 'RAIHAN · OPPONENT SEARCH',
              description:
                'The opponent has attached an Energy. The search prompt remains open at the segment cutoff.',
              options: raihanSearchCards,
              requirements: ['any'],
              selectedIds: [],
              pending: true,
            });
            recordEvent({ type: 'searchStarted', player: 'opponent' });
            break;
          default:
            break;
        }
        return;
      }

      if (command.kind === 'sound' && soundEnabledRef.current) {
        setMessage(`Sound cue: ${command.soundId}`);
      }
    };
  }, [
    beginRaihanReveal,
    recordEvent,
    setReplayPhase,
    triggerCardEffect,
    triggerSceneEffect,
  ]);

  const registerCard = useCallback(
    (cardId: string, node: HTMLButtonElement | null) => {
      if (!node) {
        queues.current.get(cardId)?.dispose();
        queues.current.delete(cardId);
        return;
      }
      if (!queues.current.has(cardId)) {
        queues.current.set(
          cardId,
          new AnimationQueue(
            node,
            (command) => commandHandler.current(cardId, command),
            reducedMotionRef.current,
          ),
        );
      }
    },
    [],
  );

  const registerScene = useCallback((node: HTMLSpanElement | null) => {
    if (!node) {
      sceneQueue.current?.dispose();
      sceneQueue.current = null;
      return;
    }
    if (!sceneQueue.current) {
      sceneQueue.current = new AnimationQueue(
        node,
        (command) => commandHandler.current('scene', command),
        reducedMotionRef.current,
      );
    }
  }, []);

  useEffect(
    () => () => {
      for (const queue of queues.current.values()) queue.dispose();
      queues.current.clear();
      sceneQueue.current?.dispose();
      sceneQueue.current = null;
    },
    [],
  );

  const animateCardTravel = useCallback(
    (cardId: string, from: CardPosition, to: CardPosition) =>
      new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          const queue = queues.current.get(cardId);
          if (!queue) {
            resolve();
            return;
          }
          const sequence: AnimationSequence = {
            id: 'card.switch-active',
            commands: [
              {
                kind: 'tween',
                duration: 0.38,
                ease: 'power3.inOut',
                from: {
                  x: from.x,
                  y: from.y,
                  scale: from.scale,
                  rotationZ: from.rotation,
                },
                to: {
                  x: to.x,
                  y: to.y - 1.3,
                  scale: to.scale * 1.08,
                  rotationZ: 0,
                },
              },
              {
                kind: 'tween',
                duration: 0.12,
                ease: 'back.out(2.6)',
                to: {
                  x: to.x,
                  y: to.y,
                  scale: to.scale,
                  rotationZ: to.rotation,
                },
              },
            ],
          };
          void queue.enqueue(sequence).then(resolve);
        });
      }),
    [],
  );

  const startReplay = useCallback(() => {
    if (phaseRef.current !== 'ready') return;
    const arven = cards.find((card) => card.id === 'hand-arven');
    if (arven) {
      setCards((current) =>
        current.map((card) =>
          card.id === arven.id ? { ...card, zone: 'discard' } : card,
        ),
      );
      setPlayerDiscardCount((current) => current + 1);
      recordEvent({
        type: 'supporterPlayed',
        cardId: arven.id,
        supporter: 'arven',
      });
    }
    setSelectedId(null);
    setReplayPhase('arven-search');
    setMessage(
      'Arven is played. Choose one Item and one Pokémon Tool; the replay waits for confirmation.',
    );
    setSearch({
      player: 'player',
      title: 'Choose an Item + Pokémon Tool',
      eyebrow: 'ARVEN · DECK SEARCH',
      description:
        'Select one valid card from each category. The battle board stays in place until you confirm.',
      options: arvenSearchCards,
      requirements: ['item', 'tool'],
      selectedIds: [],
      pending: false,
    });
    recordEvent({ type: 'searchStarted', player: 'player' });
  }, [cards, recordEvent, setReplayPhase]);

  const toggleSearchChoice = useCallback((choice: BattleCard) => {
    setSearch((current) => {
      if (!current) return current;
      const alreadySelected = current.selectedIds.includes(choice.id);
      if (alreadySelected)
        return {
          ...current,
          selectedIds: current.selectedIds.filter((id) => id !== choice.id),
        };

      const selectedOptions = current.options.filter((option) =>
        current.selectedIds.includes(option.id),
      );
      const requirement =
        choice.cardType === 'item'
          ? 'item'
          : choice.cardType === 'tool'
            ? 'tool'
            : 'any';
      if (
        current.requirements.includes('any') &&
        current.requirements.length === 1
      ) {
        return { ...current, selectedIds: [choice.id] };
      }
      const requirementSlot = current.requirements.indexOf(requirement);
      if (requirementSlot >= 0) {
        const existingForRequirement = selectedOptions.find(
          (option) => option.cardType === requirement,
        );
        const selectedIds = existingForRequirement
          ? current.selectedIds.filter((id) => id !== existingForRequirement.id)
          : [...current.selectedIds];
        return { ...current, selectedIds: [...selectedIds, choice.id] };
      }
      return current;
    });
  }, []);

  const confirmArvenSearch = useCallback(() => {
    const currentSearch = search;
    if (
      phaseRef.current !== 'arven-search' ||
      !currentSearch ||
      currentSearch.pending ||
      currentSearch.player !== 'player'
    )
      return;
    const chosen = currentSearch.options.filter((card) =>
      currentSearch.selectedIds.includes(card.id),
    );
    if (
      chosen.length !== 2 ||
      !chosen.some((card) => card.cardType === 'item') ||
      !chosen.some((card) => card.cardType === 'tool')
    )
      return;

    const handStart = cards.filter((card) => card.zone === 'hand').length;
    const newCards = chosen.map((card, index) => ({
      ...card,
      zone: 'hand' as const,
      slot: handStart + index,
    }));
    setCards((current) => [...current, ...newCards]);
    setDeckCount((current) => Math.max(0, current - chosen.length));
    setSearch(null);
    setReplayPhase('switch-choice');
    setMessage(
      'Escape Rope is ready. Choose Arcanine ex from your Bench to switch Active Pokémon.',
    );
    recordEvent({
      type: 'searchResolved',
      player: 'player',
      cardIds: newCards.map((card) => card.id),
    });
    for (const card of newCards)
      recordEvent({
        type: 'cardMoved',
        cardId: card.id,
        from: 'deck',
        to: 'hand',
      });
  }, [cards, recordEvent, search, setReplayPhase]);

  const chooseSwitchTarget = useCallback(
    (chosenCard: BattleCard) => {
      if (
        phaseRef.current !== 'switch-choice' ||
        chosenCard.zone !== 'local-bench' ||
        chosenCard.id !== 'arcanine-ex'
      )
        return;
      const oldPositions = latestPositions.current;
      let nextCards = cards.map((card) => ({ ...card }));
      const oldPlayerActive = nextCards.find(
        (card) => card.zone === 'local-active',
      );
      const selectedBench = nextCards.find((card) => card.id === chosenCard.id);
      const opponentActive = nextCards.find(
        (card) => card.zone === 'opponent-active',
      );
      const opponentBenchTarget = nextCards.find(
        (card) =>
          card.id === 'radiant-charizard' && card.zone === 'opponent-bench',
      );
      if (
        !oldPlayerActive ||
        !selectedBench ||
        !opponentActive ||
        !opponentBenchTarget
      )
        return;

      const selectedLocalSlot = selectedBench.slot;
      const selectedOpponentSlot = opponentBenchTarget.slot;
      nextCards = nextCards.map((card) => {
        if (card.id === oldPlayerActive.id)
          return { ...card, zone: 'local-bench', slot: selectedLocalSlot };
        if (card.id === selectedBench.id)
          return { ...card, zone: 'local-active', slot: 0 };
        if (card.id === opponentActive.id)
          return {
            ...card,
            zone: 'opponent-bench',
            slot: selectedOpponentSlot,
          };
        if (card.id === opponentBenchTarget.id)
          return { ...card, zone: 'opponent-active', slot: 0 };
        return card;
      });

      const escapeRope = nextCards.find(
        (card) => card.id === 'search-escape-rope' && card.zone === 'hand',
      );
      if (!escapeRope) return;
      if (escapeRope)
        nextCards = nextCards.map((card) =>
          card.id === escapeRope.id ? { ...card, zone: 'discard' } : card,
        );
      setCards(nextCards);
      if (escapeRope) setPlayerDiscardCount((current) => current + 1);
      setSearch(null);
      setSelectedId(null);
      setReplayPhase('switch-resolving');
      setMessage(
        'Escape Rope resolves. Arcanine ex and Radiant Charizard move into the Active Spots.',
      );
      recordEvent({
        type: 'activeSwitched',
        playerCardId: selectedBench.id,
        opponentCardId: opponentBenchTarget.id,
      });

      const newPositions: Record<string, CardPosition> = {};
      for (const card of nextCards)
        newPositions[card.id] = getCardPosition(card, nextCards);
      const travel = [
        animateCardTravel(
          oldPlayerActive.id,
          oldPositions[oldPlayerActive.id],
          newPositions[oldPlayerActive.id],
        ),
        animateCardTravel(
          selectedBench.id,
          oldPositions[selectedBench.id],
          newPositions[selectedBench.id],
        ),
        animateCardTravel(
          opponentActive.id,
          oldPositions[opponentActive.id],
          newPositions[opponentActive.id],
        ),
        animateCardTravel(
          opponentBenchTarget.id,
          oldPositions[opponentBenchTarget.id],
          newPositions[opponentBenchTarget.id],
        ),
      ];
      const generation = sequenceGeneration.current;
      const wipe =
        sceneQueue.current?.enqueue({
          id: 'board.switch-wipe',
          commands: [
            { kind: 'effect', effectId: 'board.switch-wipe', target: 'board' },
            { kind: 'delay', duration: 0.7 },
          ],
        }) ?? Promise.resolve();
      void Promise.all([...travel, wipe]).then(() => {
        if (generation !== sequenceGeneration.current) return;
        setReplayPhase('attack-ready');
        setMessage(
          'Arcanine ex is Active. Bright Flame is ready — its two-Energy cost and 250 damage resolve once.',
        );
      });
    },
    [animateCardTravel, cards, recordEvent, setReplayPhase],
  );

  const playAttack = useCallback(() => {
    if (phaseRef.current !== 'attack-ready' || attackResolved.current) return;
    const attacker = cards.find((card) => card.zone === 'local-active');
    const target = cards.find((card) => card.zone === 'opponent-active');
    if (
      !attacker ||
      attacker.id !== 'arcanine-ex' ||
      !target ||
      (attacker.energyAttached ?? 0) < 2
    )
      return;

    attackResolved.current = true;
    const generation = sequenceGeneration.current;
    setAttackBusy(true);
    setSelectedId(null);
    setAttackPresentation({
      attackerId: attacker.id,
      targetId: target.id,
      energyCost: 2,
      costDiscarded: false,
      damageRevealed: false,
      knockoutRevealed: false,
    });
    setCards((current) =>
      current.map((card) => {
        if (card.id === attacker.id)
          return {
            ...card,
            energyAttached: Math.max(0, (card.energyAttached ?? 0) - 2),
          };
        if (card.id === target.id)
          return {
            ...card,
            zone: 'knocked-out',
            knockedOut: true,
            damage: (card.damage ?? 0) + 250,
          };
        return card;
      }),
    );
    setPlayerDiscardCount((current) => current + 2);
    setOpponentDiscardCount((current) => current + 1);
    setReplayPhase('attack-resolving');
    setMessage(
      'Bright Flame erupts across the field. Energy, damage, Knock Out, then prize selection.',
    );
    recordEvent({
      type: 'attackStarted',
      attackerId: attacker.id,
      attackId: 'bright-flame',
    });
    recordEvent({ type: 'damageApplied', targetId: target.id, amount: 250 });
    recordEvent({ type: 'cardKnockedOut', cardId: target.id });

    const attackerPosition = latestPositions.current[attacker.id];
    const cardQueue = queues.current.get(attacker.id);
    const cardSequence =
      cardQueue && attackerPosition
        ? cardQueue.enqueue({
            id: 'attack.bright-flame.card-focus',
            commands: [
              {
                kind: 'tween',
                duration: 0.3,
                ease: 'power3.out',
                to: {
                  y: attackerPosition.y - 0.9,
                  scale: attackerPosition.scale * 1.08,
                  rotationY: -6,
                },
              },
              {
                kind: 'tween',
                duration: 0.22,
                ease: 'back.out(2)',
                to: {
                  x: attackerPosition.x,
                  y: attackerPosition.y,
                  scale: attackerPosition.scale,
                  rotationY: 0,
                  rotationZ: 0,
                },
              },
            ],
          })
        : Promise.resolve();
    const sceneSequence =
      sceneQueue.current?.enqueue({
        id: 'attack.fire.large',
        commands: [
          { kind: 'delay', duration: 0.28 },
          { kind: 'effect', effectId: 'attack.fire.large', target: target.id },
          { kind: 'delay', duration: 0.72 },
          { kind: 'event', name: 'attack-cost-discarded' },
          {
            kind: 'effect',
            effectId: 'attack.energy-discard',
            target: attacker.id,
          },
          { kind: 'delay', duration: 0.34 },
          { kind: 'event', name: 'attack-damage-revealed' },
          { kind: 'effect', effectId: 'damage.reveal', target: target.id },
          { kind: 'delay', duration: 0.44 },
          { kind: 'event', name: 'attack-knockout-revealed' },
          { kind: 'delay', duration: 0.62 },
        ],
      }) ?? Promise.resolve();

    void Promise.all([cardSequence, sceneSequence]).then(() => {
      if (generation !== sequenceGeneration.current) return;
      setAttackBusy(false);
      setSelectedPrize(null);
      setPrizeFlying(false);
      setReplayPhase('prize-selection');
      setMessage(
        'Radiant Charizard is Knocked Out. Choose one face-down prize card.',
      );
    });
  }, [cards, recordEvent, setReplayPhase]);

  const selectPrize = useCallback(
    (index: number) => {
      if (phaseRef.current !== 'prize-selection' || selectedPrize !== null)
        return;
      setSelectedPrize(index);
      setMessage(
        'Fire Energy revealed. Confirm to fly the prize into your hand.',
      );
      recordEvent({ type: 'prizeSelected', prize: 'Fire Energy' });
    },
    [recordEvent, selectedPrize],
  );

  const collectPrize = useCallback(() => {
    if (
      phaseRef.current !== 'prize-selection' ||
      selectedPrize === null ||
      prizeFlying ||
      playerPrizes <= 0
    )
      return;
    const newPrize: BattleCard = {
      id: `prize-fire-energy-${initialPrizeCount - playerPrizes}`,
      name: 'Fire Energy',
      subtitle: 'Basic Energy · Prize',
      category: 'energy',
      cardType: 'basic-energy',
      element: 'flame',
      symbol: '✦',
      ruleText: 'A Fire Energy revealed from your prize cards.',
      zone: 'hand',
      slot: cards.filter((card) => card.zone === 'hand').length,
    };

    // Commit the prize, Stadium Energy, and turn change once. The queues below only animate that result.
    setCards((current) => [
      ...current.map((card) =>
        card.id === 'growlithe-bench'
          ? { ...card, energyAttached: (card.energyAttached ?? 0) + 1 }
          : card,
      ),
      newPrize,
    ]);
    setPlayerPrizes((current) => Math.max(0, current - 1));
    setTurn('opponent');
    setPrizeFlying(true);
    window.setTimeout(
      () => setPrizeFlying(false),
      reducedMotionRef.current ? 120 : 900,
    );
    setReplayPhase('field-effect');
    setMessage(
      'Prize goes to hand. Magma Basin resolves on the Bench before the turn wipe.',
    );
    recordEvent({
      type: 'energyAttached',
      cardId: 'growlithe-bench',
      amount: 1,
    });
    recordEvent({
      type: 'stadiumAbilityResolved',
      cardId: 'magma-basin',
      targetId: 'growlithe-bench',
    });
    recordEvent({ type: 'turnChanged', player: 'opponent' });

    const generation = sequenceGeneration.current;
    const sequence: AnimationSequence = {
      id: 'board.magma-basin-and-turn-change',
      commands: [
        { kind: 'delay', duration: 0.72 },
        {
          kind: 'effect',
          effectId: 'board.magma-basin',
          target: 'magma-basin',
        },
        { kind: 'delay', duration: 0.45 },
        { kind: 'event', name: 'magma-energy-revealed' },
        {
          kind: 'effect',
          effectId: 'card.energy-attach',
          target: 'growlithe-bench',
        },
        { kind: 'delay', duration: 0.84 },
        { kind: 'event', name: 'turn-wipe-started' },
        { kind: 'effect', effectId: 'board.turn-indicator', target: 'board' },
        { kind: 'delay', duration: 0.9 },
        { kind: 'event', name: 'raihan-reveal-started' },
      ],
    };
    const scene = sceneQueue.current?.enqueue(sequence) ?? Promise.resolve();
    void scene.then(() => {
      if (generation !== sequenceGeneration.current) return;
      setFieldEnergyVisible(true);
    });
  }, [
    cards,
    playerPrizes,
    prizeFlying,
    recordEvent,
    selectedPrize,
    setReplayPhase,
  ]);

  const selectCard = useCallback(
    (card: BattleCard) => {
      if (
        card.zone === 'discard' ||
        search ||
        phase === 'prize-selection' ||
        phase === 'switch-choice'
      )
        return;
      if (pendingAttachmentId) {
        const attachment = cards.find(
          (candidate) =>
            candidate.id === pendingAttachmentId && candidate.zone === 'hand',
        );
        const isTool = attachment?.cardType === 'tool';
        const validTarget =
          card.category === 'creature' &&
          (card.zone === 'local-active' || card.zone === 'local-bench') &&
          card.element === 'flame' &&
          (isTool ? !card.toolAttached : attachment?.category === 'energy');
        if (!attachment || !validTarget) {
          setMessage(
            'Choose a highlighted Fire Pokémon on your field for this attachment.',
          );
          return;
        }

        setCards((current) =>
          current.map((candidate) => {
            if (candidate.id === attachment.id)
              return { ...candidate, zone: 'attached' };
            if (candidate.id === card.id) {
              return isTool
                ? { ...candidate, toolAttached: true }
                : {
                    ...candidate,
                    energyAttached: (candidate.energyAttached ?? 0) + 1,
                  };
            }
            return candidate;
          }),
        );
        if (isTool) recordEvent({ type: 'toolAttached', cardId: card.id });
        else
          recordEvent({ type: 'energyAttached', cardId: card.id, amount: 1 });
        setPendingAttachmentId(null);
        setSelectedId(null);
        setMessage(
          `${attachment.name} attached to ${card.name}. Attachment pips updated.`,
        );
        return;
      }
      const wasFocused = selectedId === card.id;
      setSelectedId(wasFocused ? null : card.id);
      setMessage(
        wasFocused
          ? `${card.name} returned to the board.`
          : `${card.name} focused for inspection. No play has been committed.`,
      );
      recordEvent(
        wasFocused
          ? { type: 'cardUnfocused', cardId: card.id }
          : { type: 'cardFocused', cardId: card.id },
      );
    },
    [cards, pendingAttachmentId, phase, recordEvent, search, selectedId],
  );

  const attachSelectedCard = useCallback(() => {
    if (!selectedCard || selectedCard.zone !== 'hand' || phase !== 'ready')
      return;
    if (selectedCard.category !== 'energy' && selectedCard.cardType !== 'tool')
      return;
    if (pendingAttachmentId === selectedCard.id) {
      setPendingAttachmentId(null);
      setMessage('Attachment cancelled. The card remains in your hand.');
      return;
    }
    setPendingAttachmentId(selectedCard.id);
    setMessage(
      `Choose a Fire Pokémon for ${selectedCard.name}. The card stays in hand until you choose a target.`,
    );
  }, [pendingAttachmentId, phase, selectedCard]);

  const skipAnimations = useCallback(() => {
    for (const queue of queues.current.values()) queue.finishImmediately();
    sceneQueue.current?.finishImmediately();
    setEffects([]);
    setSceneEffects([]);
  }, []);

  const toggleReducedMotion = useCallback(() => {
    setReducedMotion((current) => {
      const next = !current;
      reducedMotionRef.current = next;
      for (const queue of queues.current.values()) queue.setReducedMotion(next);
      sceneQueue.current?.setReducedMotion(next);
      if (next) {
        for (const queue of queues.current.values()) queue.finishImmediately();
        sceneQueue.current?.finishImmediately();
      }
      return next;
    });
  }, []);

  const resetMatch = useCallback(() => {
    sequenceGeneration.current += 1;
    attackResolved.current = false;
    for (const queue of queues.current.values()) queue.dispose();
    queues.current.clear();
    sceneQueue.current?.dispose();
    sceneQueue.current = null;
    setCards(createMockMatch());
    setDeckCount(initialDeckCount);
    setPlayerDiscardCount(3);
    setOpponentDiscardCount(6);
    setOpponentHandCount(5);
    setPlayerPrizes(initialPrizeCount);
    setSelectedId(null);
    setPendingAttachmentId(null);
    setPhase('ready');
    phaseRef.current = 'ready';
    setSearch(null);
    setSelectedPrize(null);
    setPrizeFlying(false);
    setAttackBusy(false);
    setAttackPresentation(emptyAttackPresentation);
    setEffects([]);
    setSceneEffects([]);
    setFieldEnergyVisible(false);
    setTurn('player');
    setDisplayTurn('player');
    setEventLog([]);
    setLastEvent(null);
    setMessage(
      'Hover or select a card to inspect it. Focus never commits a play.',
    );
    setSceneVersion((current) => current + 1);
  }, []);

  const expireEffectStable = expireEffect;
  const searchComplete =
    search?.requirements.every((requirement) =>
      search.options.some(
        (option) =>
          search.selectedIds.includes(option.id) &&
          (requirement === 'any' || option.cardType === requirement),
      ),
    ) ?? false;
  const canSkip =
    attackBusy ||
    phase === 'switch-resolving' ||
    phase === 'field-effect' ||
    phase === 'raihan-reveal';
  const visiblePlayerDiscardCount =
    playerDiscardCount -
    (phase === 'attack-resolving' && !attackPresentation.costDiscarded
      ? attackPresentation.energyCost
      : 0);
  const visibleOpponentDiscardCount =
    opponentDiscardCount -
    (phase === 'attack-resolving' && !attackPresentation.knockoutRevealed
      ? 1
      : 0);

  return (
    <main className="battle-client">
      <div
        className={`battle-stage ${sceneEffects.some((effect) => effect.effectId === 'board.magma-basin') ? 'has-magma-effect' : ''} ${reducedMotion ? 'is-reduced-motion' : ''}`}
        key={sceneVersion}
        data-turn={turn}
        data-testid="battle-stage"
        aria-label="Arcanine ex Pokémon TCG gameplay replay"
      >
        <BattleField
          deckCount={deckCount}
          opponentDiscardCount={visibleOpponentDiscardCount}
          playerDiscardCount={visiblePlayerDiscardCount}
          playerPrizes={playerPrizes}
          opponentPrizes={opponentPrizes}
          turn={displayTurn}
          handCount={handCount - (prizeFlying ? 1 : 0)}
          opponentHandCount={opponentHandCount}
        />
        <div className="cards-layer" aria-label="Cards on the battle table">
          {visibleCards.map((card) => {
            const suppressDamage =
              phase === 'attack-resolving' &&
              attackPresentation.targetId === card.id &&
              !attackPresentation.damageRevealed;
            const shownEnergy =
              phase === 'attack-resolving' &&
              attackPresentation.attackerId === card.id &&
              !attackPresentation.costDiscarded
                ? attackPresentation.energyCost
                : card.id === 'growlithe-bench' && !fieldEnergyVisible
                  ? Math.max(0, (card.energyAttached ?? 0) - 1)
                  : (card.energyAttached ?? 0);
            const isAttachmentTarget =
              Boolean(pendingAttachmentId) &&
              card.category === 'creature' &&
              (card.zone === 'local-active' || card.zone === 'local-bench') &&
              card.element === 'flame' &&
              (cards.find((candidate) => candidate.id === pendingAttachmentId)
                ?.cardType !== 'tool' ||
                !card.toolAttached);
            return (
              <BattleCardView
                key={`${sceneVersion}:${card.id}`}
                card={card}
                position={positions[card.id] ?? getCardPosition(card, cards)}
                selected={selectedId === card.id}
                displayDamage={suppressDamage ? null : card.damage}
                displayEnergy={shownEnergy}
                knockedOutPresentation={
                  card.knockedOut && attackPresentation.knockoutRevealed
                }
                targetable={isAttachmentTarget}
                onSelect={selectCard}
                onReady={registerCard}
              />
            );
          })}
        </div>
        <VfxLayer
          effects={effects}
          positions={positions}
          onExpire={expireEffectStable}
          reducedMotion={reducedMotion}
        />
        <SceneEffects effects={sceneEffects} />
        <span
          className="scene-queue-anchor"
          ref={registerScene}
          aria-hidden="true"
        />
        {prizeFlying ? (
          <div className="prize-flight-visual" aria-hidden="true">
            <i>✦</i>
            <span>FIRE ENERGY</span>
          </div>
        ) : null}

        {selectedCard &&
        !search &&
        phase !== 'prize-selection' &&
        phase !== 'switch-choice' ? (
          <CardPreview
            card={selectedCard}
            attachable={
              phase === 'ready' &&
              selectedCard.zone === 'hand' &&
              (selectedCard.category === 'energy' ||
                selectedCard.cardType === 'tool')
            }
            pendingAttachment={pendingAttachmentId === selectedCard.id}
            onAttach={attachSelectedCard}
            onClose={() => {
              setPendingAttachmentId(null);
              selectCard(selectedCard);
            }}
          />
        ) : null}

        {search ? (
          <BattleChoiceOverlay
            mode="search"
            title={search.title}
            eyebrow={search.eyebrow}
            description={search.description}
            player={search.player}
            options={search.options}
            selectedIds={search.selectedIds}
            requirements={search.requirements}
            pending={search.pending}
            onToggle={toggleSearchChoice}
            onConfirm={
              !search.pending && searchComplete ? confirmArvenSearch : undefined
            }
          />
        ) : null}

        {phase === 'switch-choice' && !search ? (
          <BattleChoiceOverlay
            mode="switch"
            title="Choose your new Active Pokémon"
            eyebrow="ESCAPE ROPE · SWITCH"
            description="Move Arcanine ex from your Bench to the Active Spot. Your opponent switches to Radiant Charizard."
            options={cards.filter(
              (card) =>
                card.id === 'arcanine-ex' && card.zone === 'local-bench',
            )}
            onChoose={chooseSwitchTarget}
          />
        ) : null}

        {phase === 'prize-selection' ? (
          <PrizeOverlay
            remainingPrizes={playerPrizes}
            selectedPrize={selectedPrize}
            flying={prizeFlying}
            onSelect={selectPrize}
            onCollect={collectPrize}
          />
        ) : null}

        {phase === 'raihan-reveal' || phase === 'raihan-search' ? (
          <aside
            className="raihan-reveal-card"
            aria-label="Raihan supporter revealed"
          >
            <div className="raihan-art">
              <span>R</span>
              <i>
                CHAMPION&apos;S
                <br />
                PATH
              </i>
            </div>
            <div className="raihan-copy">
              <small>SUPPORTER</small>
              <b>Raihan</b>
              <span>Attach an Energy, then search your deck.</span>
            </div>
            <span className="raihan-reveal-glint" />
          </aside>
        ) : null}

        <BattleHud
          deckCount={deckCount}
          playerPrizes={playerPrizes}
          phase={phase}
          message={message}
          attackBusy={attackBusy}
          soundEnabled={soundEnabled}
          reducedMotion={reducedMotion}
          onStartReplay={startReplay}
          onAttack={playAttack}
          onSkipAnimations={skipAnimations}
          onReset={resetMatch}
          onToggleSound={() => setSoundEnabled((current) => !current)}
          onToggleReducedMotion={toggleReducedMotion}
        />
        <span className="sr-only" aria-live="polite">
          {lastEvent
            ? `Latest battle event: ${lastEvent.type}. ${eventLog.length} events recorded.`
            : 'Battle ready'}
        </span>
        {canSkip ? (
          <button
            className="skip-replay-button"
            type="button"
            onClick={skipAnimations}
          >
            Skip current animations
          </button>
        ) : null}
      </div>
    </main>
  );
}
