import { internalMutation, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getTypeEffectiveness, isElementalType } from '../lib/battle-utils';
import { internal } from './_generated/api';

function eligibleReplacement(lineup: number[], health: number[]) {
  return lineup.filter((index) => health[index] > 0);
}

export const confirmLineup = mutation({
  args: {
    battleId: v.string(),
    playerAddress: v.string(),
    lineup: v.array(v.number()),
    activeIndex: v.number(),
  },
  handler: async (ctx, { battleId, playerAddress, lineup, activeIndex }) => {
    const battle = await ctx.db
      .query('battles')
      .filter((q) => q.eq(q.field('battleId'), battleId))
      .first();
    if (
      !battle ||
      battle.gameState.status !== 'initializing' ||
      !battle.player1Roster ||
      !battle.player2Roster
    ) {
      throw new Error('Battle is not accepting lineups');
    }
    const isPlayer1 = playerAddress === battle.player1Address;
    if (!isPlayer1 && playerAddress !== battle.player2Address)
      throw new Error('Not a player');
    const roster = isPlayer1 ? battle.player1Roster : battle.player2Roster;
    if (
      isPlayer1
        ? battle.gameState.player1Lineup
        : battle.gameState.player2Lineup
    ) {
      throw new Error('Lineup already locked');
    }
    if (
      lineup.length !== 3 ||
      new Set(lineup).size !== 3 ||
      lineup.some(
        (index) =>
          !Number.isInteger(index) || index < 0 || index >= roster.length,
      ) ||
      !lineup.includes(activeIndex)
    ) {
      throw new Error('Choose three distinct roster cards and one active card');
    }
    const next = {
      ...battle.gameState,
      ...(isPlayer1
        ? { player1Lineup: lineup, player1Active: activeIndex }
        : { player2Lineup: lineup, player2Active: activeIndex }),
    };
    if (
      next.player1Lineup &&
      next.player2Lineup &&
      next.player1Active !== undefined &&
      next.player2Active !== undefined
    ) {
      const first = battle.player1Roster[next.player1Active];
      const second = battle.player2Roster[next.player2Active];
      next.status = 'active';
      next.currentTurn =
        first.stats.speed >= second.stats.speed
          ? battle.player1Address
          : battle.player2Address;
      next.player1Health = first.stats.maxHealth;
      next.player2Health = second.stats.maxHealth;
      next.player1MaxHealth = first.stats.maxHealth;
      next.player2MaxHealth = second.stats.maxHealth;
      await ctx.db.patch(battle._id, {
        gameState: next,
        player1NFT: first,
        player2NFT: second,
        lastActivity: Date.now(),
      });
    } else {
      await ctx.db.patch(battle._id, {
        gameState: next,
        lastActivity: Date.now(),
      });
    }
    return { success: true };
  },
});

export const changeActiveCard = mutation({
  args: {
    battleId: v.string(),
    playerAddress: v.string(),
    cardIndex: v.number(),
  },
  handler: async (ctx, { battleId, playerAddress, cardIndex }) => {
    const battle = await ctx.db
      .query('battles')
      .filter((q) => q.eq(q.field('battleId'), battleId))
      .first();
    if (
      !battle ||
      battle.gameState.status !== 'active' ||
      !battle.player1Roster ||
      !battle.player2Roster
    ) {
      throw new Error('Battle is not active');
    }
    const isPlayer1 = playerAddress === battle.player1Address;
    if (!isPlayer1 && playerAddress !== battle.player2Address)
      throw new Error('Not a player');
    const state = battle.gameState;
    if (
      battle.rulesVersion === 2 &&
      state.roundChoices &&
      (state.roundChoices.player1 || state.roundChoices.player2)
    )
      throw new Error('Finish the pending round first');
    if (state.currentTurn !== playerAddress || state.pendingTurn)
      throw new Error('Not your turn');
    const lineup = isPlayer1 ? state.player1Lineup : state.player2Lineup;
    const health = isPlayer1
      ? state.player1CardHealth
      : state.player2CardHealth;
    const activeIndex = isPlayer1 ? state.player1Active : state.player2Active;
    const roster = isPlayer1 ? battle.player1Roster : battle.player2Roster;
    if (
      !lineup ||
      !health ||
      !Number.isInteger(cardIndex) ||
      !lineup.includes(cardIndex) ||
      !(health[cardIndex] > 0) ||
      cardIndex === activeIndex
    ) {
      throw new Error('Choose a surviving reserve card');
    }
    const replacement = roster[cardIndex];
    const forced = activeIndex === undefined;
    if (battle.rulesVersion === 2 && !forced)
      throw new Error('Use the Switchout move to change cards');
    const turnNumber = forced ? state.turnNumber : state.turnNumber + 1;
    const turnId = `${battle.battleId}-${turnNumber}${forced ? '-replacement' : ''}`;
    await ctx.db.patch(battle._id, {
      ...(isPlayer1
        ? { player1NFT: replacement }
        : { player2NFT: replacement }),
      gameState: {
        ...state,
        ...(battle.rulesVersion === 2
          ? {
              ...(isPlayer1
                ? {
                    protectStreak1: state.protectStreak1?.map((value, index) =>
                      index === activeIndex ? 0 : value,
                    ),
                  }
                : {
                    protectStreak2: state.protectStreak2?.map((value, index) =>
                      index === activeIndex ? 0 : value,
                    ),
                  }),
            }
          : {}),
        ...(isPlayer1
          ? {
              player1Active: cardIndex,
              player1Health: health[cardIndex],
              player1MaxHealth: replacement.stats.maxHealth,
            }
          : {
              player2Active: cardIndex,
              player2Health: health[cardIndex],
              player2MaxHealth: replacement.stats.maxHealth,
            }),
        turnNumber,
        currentTurn: forced
          ? playerAddress
          : isPlayer1
            ? battle.player2Address
            : battle.player1Address,
      },
      moves: [
        ...battle.moves,
        {
          kind: 'switch' as const,
          cardIndex,
          turnId,
          turnNumber,
          player: playerAddress,
          action: forced ? 'Replaced card' : 'Switched card',
          timestamp: Date.now(),
        },
      ],
      lastActivity: Date.now(),
    });
    return { turnId };
  },
});

function seededPercent(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 100;
}

// New matches collect both actions before revealing either one. Protect acts
// first, then switches, then attacks in descending active-card speed order.
// Equal speeds favor the lobby creator (player 1). A KO cancels the victim's
// unresolved action; replacements are chosen before the next round.
export const submitRoundAction = mutation({
  args: {
    battleId: v.string(),
    playerAddress: v.string(),
    expectedRound: v.number(),
    action: v.string(),
    cardIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const battle = await ctx.db
      .query('battles')
      .filter((q) => q.eq(q.field('battleId'), args.battleId))
      .first();
    if (
      !battle ||
      battle.rulesVersion !== 2 ||
      battle.gameState.status !== 'active' ||
      !battle.player1Roster ||
      !battle.player2Roster
    )
      throw new Error('Priority battle is not active');
    const side =
      args.playerAddress === battle.player1Address
        ? 0
        : args.playerAddress === battle.player2Address
          ? 1
          : -1;
    if (side < 0) throw new Error('Not a player');
    const state = battle.gameState;
    if (args.expectedRound !== state.turnNumber + 1)
      throw new Error('Round changed; choose a move again');
    if (state.player1Active === undefined || state.player2Active === undefined)
      throw new Error('Choose a replacement card before the next round');
    if (
      !state.player1Lineup ||
      !state.player2Lineup ||
      !state.player1CardHealth ||
      !state.player2CardHealth
    )
      throw new Error('Battle lineup is incomplete');
    const startingActive = [state.player1Active, state.player2Active];
    const active: Array<number | undefined> = [...startingActive];
    const rosters = [battle.player1Roster, battle.player2Roster];
    const lineups = [state.player1Lineup, state.player2Lineup];
    const health = [
      state.player1CardHealth.slice(),
      state.player2CardHealth.slice(),
    ];
    const choices = state.roundChoices ?? {};
    if (side === 0 ? choices.player1 : choices.player2)
      throw new Error('Action already locked for this round');
    const actorIndex = startingActive[side];
    const actor = rosters[side][actorIndex];
    if (
      !actor ||
      !lineups[side]?.includes(actorIndex) ||
      !((health[side]?.[actorIndex] ?? 0) > 0)
    )
      throw new Error('Active card is not available');
    const move = actor.moves?.find((entry) => entry.name === args.action);
    if (
      !move ||
      !move.kind ||
      (move.kind === 'attack' &&
        (!isElementalType(move.element ?? -1) ||
          move.element !== actor.stats.nftType))
    )
      throw new Error('Move is not available to this card');
    if (move.kind === 'switchout') {
      if (
        args.cardIndex === undefined ||
        !Number.isInteger(args.cardIndex) ||
        args.cardIndex === actorIndex ||
        !lineups[side]?.includes(args.cardIndex) ||
        !((health[side]?.[args.cardIndex] ?? 0) > 0)
      )
        throw new Error('Choose a surviving reserve card');
    } else if (args.cardIndex !== undefined) {
      throw new Error('Only Switchout selects a reserve');
    }
    const choice = {
      action: args.action,
      ...(args.cardIndex === undefined ? {} : { cardIndex: args.cardIndex }),
    };
    const updated = {
      player1: side === 0 ? choice : choices.player1,
      player2: side === 1 ? choice : choices.player2,
    };
    if (!updated.player1 || !updated.player2) {
      // If a player disappears after their opponent commits, finish the
      // stalled match without credits. A stale scheduled job cannot affect a
      // subsequent round or a match already resolved by the other player.
      const roundDeadline = Date.now() + 90_000;
      await ctx.db.patch(battle._id, {
        gameState: { ...state, roundChoices: updated, roundDeadline },
        lastActivity: Date.now(),
      });
      await ctx.scheduler.runAfter(90_000, internal.battle.expirePendingRound, {
        battleId: args.battleId,
        round: args.expectedRound,
      });
      return { resolved: false, round: args.expectedRound };
    }

    const selected = [updated.player1, updated.player2];
    const selectedMoves = selected.map((entry, index) => {
      const selectedMove = rosters[index][startingActive[index]].moves?.find(
        (item) => item.name === entry.action,
      );
      if (!selectedMove?.kind)
        throw new Error('Move is not available to this card');
      return selectedMove;
    });
    const streaks = [
      state.protectStreak1?.slice() ?? rosters[0].map(() => 0),
      state.protectStreak2?.slice() ?? rosters[1].map(() => 0),
    ];
    const protectedSide = [false, false];
    const currentNFT = [battle.player1NFT, battle.player2NFT];
    const ordered = [0, 1].sort((a, b) => {
      const priority = (kind: string) =>
        kind === 'protect' ? 2 : kind === 'switchout' ? 1 : 0;
      const difference =
        priority(selectedMoves[b].kind ?? '') -
        priority(selectedMoves[a].kind ?? '');
      return (
        difference ||
        (selectedMoves[a].kind === 'attack' &&
        selectedMoves[b].kind === 'attack'
          ? rosters[b][startingActive[b]].stats.speed -
            rosters[a][startingActive[a]].stats.speed
          : 0) ||
        a - b
      );
    });
    const events: typeof battle.moves = [];
    let winner: string | undefined;
    for (const actingSide of ordered) {
      const target = 1 - actingSide;
      const oldIndex = active[actingSide];
      const targetIndex = active[target];
      if (oldIndex === undefined || targetIndex === undefined) continue;
      const chosen = selected[actingSide];
      const selectedMove = selectedMoves[actingSide];
      const event = {
        turnNumber: args.expectedRound,
        turnId: `${battle.battleId}-r${args.expectedRound}-${events.length + 1}`,
        timestamp: Date.now(),
        player:
          actingSide === 0 ? battle.player1Address : battle.player2Address,
        action: chosen.action,
        cardIndex: oldIndex,
      };
      if (selectedMove.kind === 'protect') {
        const count = streaks[actingSide][oldIndex] ?? 0;
        const chance = 100 / 2 ** count;
        const success =
          seededPercent(
            `${battle.battleId}:${args.expectedRound}:${actingSide}:protect`,
          ) < chance;
        streaks[actingSide][oldIndex] = count + 1;
        protectedSide[actingSide] = success;
        events.push({ ...event, kind: 'protect', protectSuccess: success });
      } else if (selectedMove.kind === 'switchout') {
        if (chosen.cardIndex === undefined)
          throw new Error('Switchout needs a reserve');
        streaks[actingSide][oldIndex] = 0;
        active[actingSide] = chosen.cardIndex;
        currentNFT[actingSide] = rosters[actingSide][chosen.cardIndex];
        events.push({ ...event, kind: 'switch', cardIndex: chosen.cardIndex });
      } else {
        const element = selectedMove.element;
        if (element === undefined || !isElementalType(element))
          throw new Error('Attack has no element');
        streaks[actingSide][oldIndex] = 0;
        const attacker = currentNFT[actingSide].stats;
        const defender = currentNFT[target].stats;
        const roll = seededPercent(
          `${battle.battleId}:${args.expectedRound}:${actingSide}:${chosen.action}`,
        );
        const critical = roll < Math.min(35, 5 + Math.floor(attacker.luck / 5));
        const base = Math.max(
          1,
          Math.floor(
            attacker.attack * 0.34 +
              attacker.strength * 0.18 +
              attacker.intelligence * 0.08 -
              defender.defense * 0.2,
          ),
        );
        const effectiveness = getTypeEffectiveness(element, defender.nftType);
        const damage =
          protectedSide[target] || effectiveness === 0
            ? 0
            : Math.max(
                1,
                Math.floor(
                  base *
                    (0.85 + (roll % 31) / 100) *
                    effectiveness *
                    (critical ? 1.5 : 1),
                ),
              );
        health[target][targetIndex] = Math.max(
          0,
          health[target][targetIndex] - damage,
        );
        events.push({
          ...event,
          kind: 'attack',
          targetIndex,
          moveElement: selectedMove.element,
          effectiveness,
          damage,
          blocked: protectedSide[target],
          wasCritical: !protectedSide[target] && effectiveness > 0 && critical,
          targetHealth: health[target][targetIndex],
        });
        if (health[target][targetIndex] === 0) {
          if (!eligibleReplacement(lineups[target], health[target]).length) {
            winner = event.player;
          } else {
            active[target] = undefined;
          }
        }
      }
      if (winner) break;
    }
    const activeHealth = (index: number) => {
      const cardIndex = active[index];
      return cardIndex === undefined ? 0 : health[index][cardIndex];
    };
    await ctx.db.patch(battle._id, {
      player1NFT: currentNFT[0],
      player2NFT: currentNFT[1],
      gameState: {
        ...state,
        roundChoices: {},
        roundDeadline: undefined,
        protectStreak1: streaks[0],
        protectStreak2: streaks[1],
        player1Active: active[0],
        player2Active: active[1],
        player1CardHealth: health[0],
        player2CardHealth: health[1],
        player1Health: activeHealth(0),
        player2Health: activeHealth(1),
        player1MaxHealth: currentNFT[0].stats.maxHealth,
        player2MaxHealth: currentNFT[1].stats.maxHealth,
        currentTurn:
          active[0] === undefined
            ? battle.player1Address
            : active[1] === undefined
              ? battle.player2Address
              : battle.player1Address,
        turnNumber: args.expectedRound,
        status: winner ? 'finished' : 'active',
        winner,
      },
      moves: [...battle.moves, ...events],
      lastActivity: Date.now(),
      finishedAt: winner ? Date.now() : undefined,
    });
    if (winner) {
      const winningAddress = winner;
      const user = await ctx.db
        .query('users')
        .withIndex('by_address', (q) => q.eq('address', winningAddress))
        .first();
      if (user)
        await ctx.db.patch(user._id, { credits: (user.credits || 0) + 5 });
    }
    return { resolved: true, round: args.expectedRound };
  },
});

export const expirePendingRound = internalMutation({
  args: { battleId: v.string(), round: v.number() },
  handler: async (ctx, { battleId, round }) => {
    const battle = await ctx.db
      .query('battles')
      .filter((q) => q.eq(q.field('battleId'), battleId))
      .first();
    if (
      !battle ||
      battle.rulesVersion !== 2 ||
      battle.gameState.status !== 'active' ||
      battle.gameState.turnNumber + 1 !== round ||
      (battle.gameState.roundDeadline ?? Number.POSITIVE_INFINITY) > Date.now()
    )
      return;
    const choices = battle.gameState.roundChoices;
    const winner =
      choices?.player1 && !choices.player2
        ? battle.player1Address
        : choices?.player2 && !choices.player1
          ? battle.player2Address
          : undefined;
    if (!winner) return;
    await ctx.db.patch(battle._id, {
      gameState: {
        ...battle.gameState,
        status: 'finished',
        winner,
        roundChoices: {},
        roundDeadline: undefined,
      },
      finishedAt: Date.now(),
      lastActivity: Date.now(),
    });
  },
});

export const executeTurn = mutation({
  args: {
    battleId: v.string(),
    playerAddress: v.string(),
    action: v.string(),
  },
  handler: async (ctx, args) => {
    const battle = await ctx.db
      .query('battles')
      .filter((q) => q.eq(q.field('battleId'), args.battleId))
      .first();

    if (!battle) throw new Error('Battle not found');
    if (battle.rulesVersion === 2)
      throw new Error('Use round actions for this battle');
    if (battle.gameState.status !== 'active') {
      throw new Error('Battle is not active');
    }
    if (battle.gameState.currentTurn !== args.playerAddress) {
      throw new Error('Not your turn');
    }

    const isPlayer1 = args.playerAddress === battle.player1Address;
    if (!isPlayer1 && args.playerAddress !== battle.player2Address)
      throw new Error('Not a player');
    if (battle.gameState.pendingTurn)
      throw new Error('A turn is being processed');
    const isRosterBattle = !!battle.player1Roster && !!battle.player2Roster;
    const attackingIndex = isPlayer1
      ? battle.gameState.player1Active
      : battle.gameState.player2Active;
    const defendingIndex = isPlayer1
      ? battle.gameState.player2Active
      : battle.gameState.player1Active;
    if (
      isRosterBattle &&
      (attackingIndex === undefined || defendingIndex === undefined)
    ) {
      throw new Error('Choose a replacement card before attacking');
    }
    if (
      battle.player1Roster &&
      battle.player2Roster &&
      attackingIndex !== undefined
    ) {
      const activeCard = (
        isPlayer1 ? battle.player1Roster : battle.player2Roster
      )[attackingIndex];
      const lineup = isPlayer1
        ? battle.gameState.player1Lineup
        : battle.gameState.player2Lineup;
      const cardHealth = isPlayer1
        ? battle.gameState.player1CardHealth
        : battle.gameState.player2CardHealth;
      if (
        !activeCard ||
        !lineup?.includes(attackingIndex) ||
        !((cardHealth?.[attackingIndex] ?? 0) > 0)
      ) {
        throw new Error('Active card is not available');
      }
      const allowed = activeCard.moves?.length
        ? activeCard.moves.map((move) => move.name)
        : ['Strike'];
      if (!allowed.includes(args.action))
        throw new Error('Move is not available to this card');
    }
    const attacker = isPlayer1
      ? battle.player1NFT.stats
      : battle.player2NFT.stats;
    const defender = isPlayer1
      ? battle.player2NFT.stats
      : battle.player1NFT.stats;
    const roll = seededPercent(
      `${battle.battleId}:${battle.gameState.turnNumber + 1}:${args.action}`,
    );
    const effectiveness = getTypeEffectiveness(
      attacker.nftType,
      defender.nftType,
    );
    const criticalChance = Math.min(35, 5 + Math.floor(attacker.luck / 5));
    const wasCritical = effectiveness > 0 && roll < criticalChance;
    const baseDamage = Math.max(
      1,
      Math.floor(
        attacker.attack * 0.34 +
          attacker.strength * 0.18 +
          attacker.intelligence * 0.08 -
          defender.defense * 0.2,
      ),
    );
    const variance = 0.85 + (roll % 31) / 100;
    const damage =
      effectiveness === 0
        ? 0
        : Math.max(
            1,
            Math.floor(
              baseDamage * variance * effectiveness * (wasCritical ? 1.5 : 1),
            ),
          );

    const player1Health = isPlayer1
      ? battle.gameState.player1Health
      : Math.max(0, battle.gameState.player1Health - damage);
    const player2Health = isPlayer1
      ? Math.max(0, battle.gameState.player2Health - damage)
      : battle.gameState.player2Health;
    const player1CardHealth = battle.gameState.player1CardHealth?.slice();
    const player2CardHealth = battle.gameState.player2CardHealth?.slice();
    if (
      isRosterBattle &&
      isPlayer1 &&
      player2CardHealth &&
      defendingIndex !== undefined
    )
      player2CardHealth[defendingIndex] = player2Health;
    if (
      isRosterBattle &&
      !isPlayer1 &&
      player1CardHealth &&
      defendingIndex !== undefined
    )
      player1CardHealth[defendingIndex] = player1Health;
    const knockedOut = isPlayer1 ? player2Health === 0 : player1Health === 0;
    const defenderLineup = isPlayer1
      ? battle.gameState.player2Lineup
      : battle.gameState.player1Lineup;
    const defenderHealth = isPlayer1 ? player2CardHealth : player1CardHealth;
    const isFinished = isRosterBattle
      ? knockedOut &&
        !!defenderLineup &&
        !!defenderHealth &&
        eligibleReplacement(defenderLineup, defenderHealth).length === 0
      : knockedOut;
    const winner = isFinished ? args.playerAddress : undefined;
    const currentTurn = isPlayer1
      ? battle.player2Address
      : battle.player1Address;
    const turnNumber = battle.gameState.turnNumber + 1;
    const turnId = `${battle.battleId}-${turnNumber}`;

    await ctx.db.patch(battle._id, {
      gameState: {
        ...battle.gameState,
        currentTurn,
        player1Health,
        player2Health,
        ...(isRosterBattle
          ? {
              player1CardHealth,
              player2CardHealth,
              ...(knockedOut && !isFinished
                ? isPlayer1
                  ? { player2Active: undefined }
                  : { player1Active: undefined }
                : {}),
            }
          : {}),
        turnNumber,
        status: isFinished ? 'finished' : 'active',
        winner,
        pendingTurn: undefined,
      },
      moves: [
        ...battle.moves,
        {
          turnNumber,
          player: args.playerAddress,
          action: args.action,
          damage,
          effectiveness,
          wasCritical,
          targetHealth: isPlayer1 ? player2Health : player1Health,
          turnId,
          timestamp: Date.now(),
          ...(isRosterBattle
            ? {
                kind: 'attack' as const,
                cardIndex: attackingIndex,
                targetIndex: defendingIndex,
              }
            : {}),
        },
      ],
      lastActivity: Date.now(),
      finishedAt: isFinished ? Date.now() : undefined,
    });

    if (winner) {
      const winningUser = await ctx.db
        .query('users')
        .withIndex('by_address', (q) => q.eq('address', winner))
        .first();
      if (winningUser) {
        await ctx.db.patch(winningUser._id, {
          credits: (winningUser.credits || 0) + 5,
        });
      }
    }

    return { damage, wasCritical, isFinished, winner, turnId };
  },
});

export const getBattle = query({
  args: { battleId: v.string() },
  handler: async (ctx, { battleId }) => {
    const battle = await ctx.db
      .query('battles')
      .filter((q) => q.eq(q.field('battleId'), battleId))
      .first();
    return battle && hideRoundChoices(battle);
  },
});

function hideRoundChoices<
  T extends {
    rulesVersion?: number;
    gameState: {
      roundChoices?: {
        player1?: { action: string; cardIndex?: number };
        player2?: { action: string; cardIndex?: number };
      };
    };
  },
>(battle: T): T {
  if (battle.rulesVersion !== 2) return battle;
  const choices = battle.gameState.roundChoices;
  return {
    ...battle,
    gameState: {
      ...battle.gameState,
      roundChoices: {
        ...(choices?.player1 ? { player1: { action: 'Selected' } } : {}),
        ...(choices?.player2 ? { player2: { action: 'Selected' } } : {}),
      },
    },
  };
}

export const getBattleWithNFTData = query({
  args: { battleId: v.string() },
  handler: async (ctx, { battleId }) => {
    const battle = await ctx.db
      .query('battles')
      .filter((q) => q.eq(q.field('battleId'), battleId))
      .first();
    if (!battle) return null;

    const [player1NFTData, player2NFTData] = await Promise.all([
      ctx.db
        .query('nftItems')
        .withIndex('by_item', (q) =>
          q
            .eq('collectionId', battle.player1NFT.collection)
            .eq('itemId', battle.player1NFT.item),
        )
        .first(),
      ctx.db
        .query('nftItems')
        .withIndex('by_item', (q) =>
          q
            .eq('collectionId', battle.player2NFT.collection)
            .eq('itemId', battle.player2NFT.item),
        )
        .first(),
    ]);

    const fetchRoster = (roster: typeof battle.player1Roster) =>
      roster
        ? Promise.all(
            roster.map((card) =>
              ctx.db
                .query('nftItems')
                .withIndex('by_item', (q) =>
                  q.eq('collectionId', card.collection).eq('itemId', card.item),
                )
                .first(),
            ),
          )
        : undefined;
    const [player1RosterData, player2RosterData] = await Promise.all([
      fetchRoster(battle.player1Roster),
      fetchRoster(battle.player2Roster),
    ]);
    return {
      ...hideRoundChoices(battle),
      player1NFTData,
      player2NFTData,
      player1RosterData,
      player2RosterData,
    };
  },
});

export const getUserActiveBattles = query({
  args: { userAddress: v.string() },
  handler: async (ctx, { userAddress }) => {
    const [asPlayer1, asPlayer2] = await Promise.all([
      ctx.db
        .query('battles')
        .withIndex('by_player1', (q) => q.eq('player1Address', userAddress))
        .collect(),
      ctx.db
        .query('battles')
        .withIndex('by_player2', (q) => q.eq('player2Address', userAddress))
        .collect(),
    ]);
    return [...asPlayer1, ...asPlayer2]
      .filter((battle) => battle.gameState.status !== 'finished')
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(hideRoundChoices);
  },
});

export const getUserBattleHistory = query({
  args: { userAddress: v.string() },
  handler: async (ctx, { userAddress }) => {
    const [asPlayer1, asPlayer2] = await Promise.all([
      ctx.db
        .query('battles')
        .withIndex('by_player1', (q) => q.eq('player1Address', userAddress))
        .collect(),
      ctx.db
        .query('battles')
        .withIndex('by_player2', (q) => q.eq('player2Address', userAddress))
        .collect(),
    ]);
    return [...asPlayer1, ...asPlayer2]
      .filter((battle) => battle.gameState.status === 'finished')
      .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))
      .slice(0, 50)
      .map(hideRoundChoices);
  },
});
