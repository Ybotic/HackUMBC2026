import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

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
    const isFinished = player1Health === 0 || player2Health === 0;
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

    return { ...battle, player1NFTData, player2NFTData };
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
