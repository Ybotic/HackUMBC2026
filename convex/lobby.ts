import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireUser } from './users';

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

    if (!lobby.creatorNFT?.isReady || !lobby.joinerNFT?.isReady) {
      throw new Error('Both players must be ready');
    }

    const battleId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const now = Date.now();

    if (!lobby.creatorNFT || !lobby.joinerNFT) {
      throw new Error('NFT selections are missing');
    }

    const creatorNFT = lobby.creatorNFT;
    const joinerNFT = lobby.joinerNFT;

    const player1NFTData = await ctx.db
      .query('nftItems')
      .withIndex('by_item', (q) =>
        q
          .eq('collectionId', creatorNFT.collection)
          .eq('itemId', creatorNFT.item),
      )
      .first();

    const player2NFTData = await ctx.db
      .query('nftItems')
      .withIndex('by_item', (q) =>
        q.eq('collectionId', joinerNFT.collection).eq('itemId', joinerNFT.item),
      )
      .first();

    if (!player1NFTData?.stats || !player2NFTData?.stats) {
      throw new Error('NFT stats not found. Please ensure NFTs are synced.');
    }

    const player1Stats = player1NFTData.stats;
    const player2Stats = player2NFTData.stats;

    // TODO: correct
    // determine who goes first (higher speed)
    const firstPlayer =
      player1Stats.speed >= player2Stats.speed
        ? lobby.creatorAddress
        : lobby.joinedPlayerAddress;

    const battleDbId = await ctx.db.insert('battles', {
      battleId,
      player1Address: lobby.creatorAddress,
      player2Address: lobby.joinedPlayerAddress,
      player1Name: lobby.creatorName,
      player2Name: lobby.joinedPlayerName,

      player1NFT: {
        collection: lobby.creatorNFT.collection,
        item: lobby.creatorNFT.item,
        stats: player1Stats,
      },
      player2NFT: {
        collection: lobby.joinerNFT.collection,
        item: lobby.joinerNFT.item,
        stats: player2Stats,
      },

      gameState: {
        currentTurn: firstPlayer,
        player1Health: player1Stats.maxHealth,
        player2Health: player2Stats.maxHealth,
        player1MaxHealth: player1Stats.maxHealth,
        player2MaxHealth: player2Stats.maxHealth,
        turnNumber: 0,
        status: 'active',
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
      firstPlayer,
    };
  },
});

export const getLobby = query({
  args: { lobbyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('lobbies')
      .filter((q) => q.eq(q.field('lobbyId'), args.lobbyId))
      .first();
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
