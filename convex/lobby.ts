import { mutation, query, type MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { requireUser } from './users';
import { battleNFTReferenceSchema } from './schema';
import {
  getFallbackMoves,
  hasTypedMoves,
  withProtectMove,
} from '../lib/battle-utils';

type NFTReference = { collection: string; item: string };

async function validatedRoster(
  ctx: MutationCtx,
  cards: NFTReference[],
  address: string,
  min = 3,
) {
  if (cards.length < min || cards.length > 5) {
    throw new Error('Choose between 3 and 5 NFTs');
  }
  const keys = cards.map(({ collection, item }) =>
    JSON.stringify([collection, item]),
  );
  if (new Set(keys).size !== cards.length)
    throw new Error('Choose distinct NFTs');
  const user = await requireUser(ctx, address);
  return Promise.all(
    cards.map(async ({ collection, item }) => {
      const nft = await ctx.db
        .query('nftItems')
        .withIndex('by_item', (q) =>
          q.eq('collectionId', collection).eq('itemId', item),
        )
        .first();
      if (
        !nft ||
        nft.owner !== address ||
        nft.userAddress !== user._id ||
        !nft.stats
      ) {
        throw new Error(
          'An NFT is not owned by this wallet or has no synced stats',
        );
      }
      return {
        collection,
        item,
        stats: nft.stats,
        // Upgrade old saved moves only for new battle snapshots; existing
        // matches keep their original move rules and names.
        moves: hasTypedMoves(nft.customMoves, nft.stats.nftType)
          ? withProtectMove(nft.customMoves ?? [])
          : getFallbackMoves(nft.stats.nftType),
      };
    }),
  );
}

export const createLobby = mutation({
  args: {
    creatorAddress: v.string(),
    creatorName: v.optional(v.string()),
    isPrivate: v.boolean(),
    maxWaitTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.creatorAddress);

    const lobbyId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const now = Date.now();
    const waitTime = args.maxWaitTime || 10 * 60 * 1000; // 10 minutes default

    const id = await ctx.db.insert('lobbies', {
      lobbyId,
      creatorAddress: args.creatorAddress,
      creatorName: args.creatorName,
      status: 'waiting',
      settings: {
        isPrivate: args.isPrivate,
        maxWaitTime: waitTime,
      },
      playersOnline: [args.creatorAddress],
      lastActivity: now,
      createdAt: now,
      expiresAt: now + waitTime,
    });

    return { lobbyId, _id: id };
  },
});

export const joinLobby = mutation({
  args: {
    lobbyId: v.string(),
    playerAddress: v.string(),
    playerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.playerAddress);

    const lobby = await ctx.db
      .query('lobbies')
      .filter((q) => q.eq(q.field('lobbyId'), args.lobbyId))
      .first();

    if (!lobby) {
      throw new Error('Lobby not found');
    }

    if (lobby.status !== 'waiting') {
      throw new Error('Lobby is not accepting players');
    }

    if (lobby.creatorAddress === args.playerAddress) {
      throw new Error('Cannot join your own lobby');
    }

    if (lobby.joinedPlayerAddress) {
      throw new Error('Lobby is full');
    }

    await ctx.db.patch(lobby._id, {
      joinedPlayerAddress: args.playerAddress,
      joinedPlayerName: args.playerName,
      playersOnline: [lobby.creatorAddress, args.playerAddress],
      lastActivity: Date.now(),
    });

    return { success: true };
  },
});

export const updateLobbyNFT = mutation({
  args: {
    lobbyId: v.string(),
    playerAddress: v.string(),
    nftCollection: v.string(),
    nftItem: v.string(),
    isReady: v.boolean(),
  },
  handler: async (ctx, args) => {
    const lobby = await ctx.db
      .query('lobbies')
      .filter((q) => q.eq(q.field('lobbyId'), args.lobbyId))
      .first();

    if (!lobby) {
      throw new Error('Lobby not found');
    }

    const nftData = {
      collection: args.nftCollection,
      item: args.nftItem,
      isReady: args.isReady,
    };

    if (args.playerAddress === lobby.creatorAddress) {
      await ctx.db.patch(lobby._id, {
        creatorNFT: nftData,
        lastActivity: Date.now(),
      });
    } else if (args.playerAddress === lobby.joinedPlayerAddress) {
      await ctx.db.patch(lobby._id, {
        joinerNFT: nftData,
        lastActivity: Date.now(),
      });
    } else {
      throw new Error('Player not in this lobby');
    }

    const updatedLobby = await ctx.db.get(lobby._id);
    if (updatedLobby?.creatorNFT?.isReady && updatedLobby?.joinerNFT?.isReady) {
      await ctx.db.patch(lobby._id, {
        status: 'ready',
      });
    }

    return { success: true };
  },
});

export const updateLobbyRoster = mutation({
  args: {
    lobbyId: v.string(),
    playerAddress: v.string(),
    cards: v.array(battleNFTReferenceSchema),
    isReady: v.boolean(),
  },
  handler: async (ctx, { lobbyId, playerAddress, cards, isReady }) => {
    const lobby = await ctx.db
      .query('lobbies')
      .filter((q) => q.eq(q.field('lobbyId'), lobbyId))
      .first();
    if (!lobby || (lobby.status !== 'waiting' && lobby.status !== 'ready')) {
      throw new Error('Lobby is not accepting roster changes');
    }
    if (
      playerAddress !== lobby.creatorAddress &&
      playerAddress !== lobby.joinedPlayerAddress
    ) {
      throw new Error('Player not in this lobby');
    }
    if (cards.length > 5) throw new Error('Choose no more than 5 NFTs');
    if (cards.length > 0) await validatedRoster(ctx, cards, playerAddress, 1);
    if (isReady && cards.length < 3) throw new Error('Choose at least 3 NFTs');

    const previous =
      playerAddress === lobby.creatorAddress
        ? lobby.creatorRoster
        : lobby.joinerRoster;
    const changed =
      JSON.stringify(previous?.cards ?? []) !== JSON.stringify(cards);
    const roster = { cards, isReady: isReady && !changed };
    // Selecting a different roster always clears readiness; the next request confirms it.
    const creatorRoster =
      playerAddress === lobby.creatorAddress ? roster : lobby.creatorRoster;
    const joinerRoster =
      playerAddress === lobby.joinedPlayerAddress ? roster : lobby.joinerRoster;
    await ctx.db.patch(lobby._id, {
      ...(playerAddress === lobby.creatorAddress
        ? { creatorRoster: roster }
        : { joinerRoster: roster }),
      status:
        creatorRoster?.isReady && joinerRoster?.isReady ? 'ready' : 'waiting',
      lastActivity: Date.now(),
    });
    return { isReady: roster.isReady };
  },
});

export const startBattleFromLobby = mutation({
  args: {
    lobbyId: v.string(),
    initiatorAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const lobby = await ctx.db
      .query('lobbies')
      .filter((q) => q.eq(q.field('lobbyId'), args.lobbyId))
      .first();

    if (!lobby) {
      throw new Error('Lobby not found');
    }

    if (lobby.status !== 'ready') {
      throw new Error('Lobby is not ready to start battle');
    }

    if (!lobby.joinedPlayerAddress) {
      throw new Error(
        'Lobby is ready but joined player address is missing. This indicates an inconsistent lobby state.',
      );
    }

    if (args.initiatorAddress !== lobby.creatorAddress) {
      throw new Error('Only the lobby creator may start the battle');
    }

    if (!lobby.creatorRoster?.isReady || !lobby.joinerRoster?.isReady) {
      throw new Error('Both players must lock their rosters');
    }

    const battleId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const now = Date.now();

    const player1Roster = await validatedRoster(
      ctx,
      lobby.creatorRoster.cards,
      lobby.creatorAddress,
    );
    const player2Roster = await validatedRoster(
      ctx,
      lobby.joinerRoster.cards,
      lobby.joinedPlayerAddress,
    );
    const player1Stats = player1Roster[0].stats;
    const player2Stats = player2Roster[0].stats;

    const battleDbId = await ctx.db.insert('battles', {
      battleId,
      rulesVersion: 2,
      player1Address: lobby.creatorAddress,
      player2Address: lobby.joinedPlayerAddress,
      player1Name: lobby.creatorName,
      player2Name: lobby.joinedPlayerName,

      player1NFT: player1Roster[0],
      player2NFT: player2Roster[0],
      player1Roster,
      player2Roster,

      gameState: {
        // Placeholder until both players select a starting card; confirmLineup
        // chooses the real first turn from those active cards' speeds.
        currentTurn: lobby.creatorAddress,
        player1Health: player1Stats.maxHealth,
        player2Health: player2Stats.maxHealth,
        player1MaxHealth: player1Stats.maxHealth,
        player2MaxHealth: player2Stats.maxHealth,
        turnNumber: 0,
        roundChoices: {},
        protectStreak1: player1Roster.map(() => 0),
        protectStreak2: player2Roster.map(() => 0),
        player1CardHealth: player1Roster.map((card) => card.stats.maxHealth),
        player2CardHealth: player2Roster.map((card) => card.stats.maxHealth),
        status: 'initializing',
      },

      moves: [],
      playersOnline: [lobby.creatorAddress, lobby.joinedPlayerAddress],
      lastActivity: now,
      createdAt: now,
    });

    await ctx.db.patch(lobby._id, {
      status: 'started',
    });

    return {
      battleId,
      battleDbId,
      player1Stats,
      player2Stats,
    };
  },
});

export const getLobby = query({
  args: { lobbyId: v.string(), viewerAddress: v.string() },
  handler: async (ctx, args) => {
    const lobby = await ctx.db
      .query('lobbies')
      .filter((q) => q.eq(q.field('lobbyId'), args.lobbyId))
      .first();
    if (!lobby) return null;
    if (lobby.creatorRoster?.isReady && lobby.joinerRoster?.isReady)
      return lobby;
    // Do not send the opponent's choices to the ordinary lobby view until both lock.
    return {
      ...lobby,
      creatorRoster:
        args.viewerAddress === lobby.creatorAddress
          ? lobby.creatorRoster
          : lobby.creatorRoster && { ...lobby.creatorRoster, cards: [] },
      joinerRoster:
        args.viewerAddress === lobby.joinedPlayerAddress
          ? lobby.joinerRoster
          : lobby.joinerRoster && { ...lobby.joinerRoster, cards: [] },
    };
  },
});

export const getPublicLobbies = query({
  args: {},
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db
      .query('lobbies')
      .withIndex('by_public')
      .filter((q) =>
        q.and(
          q.eq(q.field('settings.isPrivate'), false),
          q.eq(q.field('status'), 'waiting'),
          q.gt(q.field('expiresAt'), now),
        ),
      )
      .order('desc')
      .take(20);
  },
});

export const getBattleFromLobby = query({
  args: { lobbyId: v.string() },
  handler: async (ctx, args) => {
    const lobby = await ctx.db
      .query('lobbies')
      .filter((q) => q.eq(q.field('lobbyId'), args.lobbyId))
      .first();

    if (!lobby) {
      throw new Error('Lobby not found');
    }

    // if lobby is started, find the associated battle
    if (lobby.status === 'started') {
      const battle = await ctx.db
        .query('battles')
        .filter((q) =>
          q.and(
            q.eq(q.field('player1Address'), lobby.creatorAddress),
            q.eq(q.field('player2Address'), lobby.joinedPlayerAddress),
          ),
        )
        .order('desc')
        .first();

      return battle?.battleId || null;
    }

    return null;
  },
});
