import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

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
    const turnNumber = forced ? state.turnNumber : state.turnNumber + 1;
    const turnId = `${battle.battleId}-${turnNumber}${forced ? '-replacement' : ''}`;
    await ctx.db.patch(battle._id, {
      ...(isPlayer1
        ? { player1NFT: replacement }
        : { player2NFT: replacement }),
      gameState: {
        ...state,
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

function typeMultiplier(attackerType: number, defenderType: number): number {
  if (
    (attackerType === 0 && defenderType === 2) ||
    (attackerType === 1 && defenderType === 0) ||
    (attackerType === 2 && defenderType === 1)
  ) {
    return 1.5;
  }
  if (attackerType !== defenderType) return 0.65;
  return 1;
}

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
    const criticalChance = Math.min(35, 5 + Math.floor(attacker.luck / 5));
    const wasCritical = roll < criticalChance;
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
    const damage = Math.max(
      1,
      Math.floor(
        baseDamage *
          variance *
          typeMultiplier(attacker.nftType, defender.nftType) *
          (wasCritical ? 1.5 : 1),
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
  handler: async (ctx, { battleId }) =>
    ctx.db
      .query('battles')
      .filter((q) => q.eq(q.field('battleId'), battleId))
      .first(),
});

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
      ...battle,
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
      .sort((a, b) => b.createdAt - a.createdAt);
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
      .slice(0, 50);
  },
});
