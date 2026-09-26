import { internalMutation, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { getUserId } from './users';
import {
  TIER_PRICES,
  TIER_MULTIPLIERS,
  generateId,
} from '../lib/constants/marketplace';
import { nftStatsSchema, tierSchema } from './schema';

const validateUserAndCredits = async (
  ctx: any,
  address: string,
  requiredCredits?: number,
) => {
  const userId = await getUserId(ctx, address);
  if (!userId) throw new Error('User not found');

  const user = await ctx.db.get(userId);
  if (!user) throw new Error('User not found');

  if (requiredCredits && (user.credits || 0) < requiredCredits) {
    throw new Error('Insufficient credits');
  }

  return { userId, user };
};

// AUCTION FUNCTIONS
export const createAuction = mutation({
  args: {
    sellerAddress: v.string(),
    nftCollection: v.string(),
    nftItem: v.string(),
    nftMetadata: v.any(),
    nftStats: v.optional(nftStatsSchema),
    minimumPrice: v.number(),
    buyoutPrice: v.optional(v.number()),
    durationHours: v.number(),
  },
  handler: async (ctx, args) => {
    await validateUserAndCredits(ctx, args.sellerAddress);

    const now = Date.now();
    const duration = args.durationHours * 60 * 60 * 1000;

    return await ctx.db.insert('auctions', {
      auctionId: generateId('auction'),
      sellerAddress: args.sellerAddress,
      nft: {
        collection: args.nftCollection,
        item: args.nftItem,
        metadata: args.nftMetadata,
        stats: args.nftStats,
      },
      minimumPrice: args.minimumPrice,
      buyoutPrice: args.buyoutPrice,
      duration,
      status: 'active',
      transferCompleted: false,
      createdAt: now,
      endsAt: now + duration,
    });
  },
});

export const placeBid = mutation({
  args: {
    auctionId: v.id('auctions'),
    bidderAddress: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const auction = await ctx.db.get(args.auctionId);
    if (!auction) throw new Error('Auction not found');
    if (auction.status !== 'active') throw new Error('Auction is not active');
    if (Date.now() > auction.endsAt) throw new Error('Auction has expired');
    if (auction.sellerAddress === args.bidderAddress)
      throw new Error('Cannot bid on your own auction');
    if (args.amount < auction.minimumPrice)
      throw new Error('Bid amount is below minimum price');
    if (auction.currentBid && args.amount <= auction.currentBid.amount) {
      throw new Error('Bid amount must be higher than current bid');
    }

    await validateUserAndCredits(ctx, args.bidderAddress, args.amount);

    // Update previous winning bids
    if (auction.currentBid) {
      const previousBids = await ctx.db
        .query('auctionBids')
        .withIndex('by_winning', (q) =>
          q.eq('auctionId', args.auctionId).eq('isWinning', true),
        )
        .collect();

      await Promise.all(
        previousBids.map((bid) => ctx.db.patch(bid._id, { isWinning: false })),
      );
    }

    // Create new bid and update auction
    await Promise.all([
      ctx.db.insert('auctionBids', {
        auctionId: args.auctionId,
        bidderAddress: args.bidderAddress,
        amount: args.amount,
        timestamp: Date.now(),
        isWinning: true,
        refunded: false,
      }),
      ctx.db.patch(args.auctionId, {
        currentBid: {
          amount: args.amount,
          bidderAddress: args.bidderAddress,
          timestamp: Date.now(),
        },
      }),
    ]);

    // Handle buyout
    if (auction.buyoutPrice && args.amount >= auction.buyoutPrice) {
      await ctx.db.patch(args.auctionId, {
        status: 'completed',
        winner: {
          address: args.bidderAddress,
          finalPrice: args.amount,
        },
        completedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const getActiveAuctions = query({
  handler: async (ctx) => {
    const auctions = await ctx.db
      .query('auctions')
      .withIndex('by_active', (q) => q.eq('status', 'active'))
      .order('desc')
      .take(50);

    const now = Date.now();
    return auctions.filter((auction) => auction.endsAt > now);
  },
});

export const getUserAuctions = query({
  args: { userAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('auctions')
      .withIndex('by_seller', (q) => q.eq('sellerAddress', args.userAddress))
      .order('desc')
      .take(50);
  },
});

export const getAuctionBids = query({
  args: { auctionId: v.id('auctions') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('auctionBids')
      .withIndex('by_auction', (q) => q.eq('auctionId', args.auctionId))
      .order('desc')
      .take(50);
  },
});

export const getCompletedAuctions = query({
  handler: async (ctx) => {
    return await ctx.db
      .query('auctions')
      .withIndex('by_status', (q) => q.eq('status', 'completed'))
      .order('desc')
      .take(20);
  },
});

export const getUserWonAuctions = query({
  args: { userAddress: v.string() },
  handler: async (ctx, args) => {
    const allCompletedAuctions = await ctx.db
      .query('auctions')
      .withIndex('by_status', (q) => q.eq('status', 'completed'))
      .collect();

    return allCompletedAuctions.filter(
      (auction) => auction.winner?.address === args.userAddress,
    );
  },
});

// MYSTERY BOX FUNCTIONS
export const purchaseMysteryBox = mutation({
  args: {
    purchaserAddress: v.string(),
    tier: tierSchema,
  },
  handler: async (ctx, args) => {
    const price = TIER_PRICES[args.tier];
    const { userId } = await validateUserAndCredits(
      ctx,
      args.purchaserAddress,
      price,
    );

    // Deduct credits and create box
    const currentUser = await ctx.db.get(userId);
    await ctx.db.patch(userId, {
      credits: (currentUser?.credits || 0) - price,
    });

    return await ctx.db.insert('mysteryBoxes', {
      boxId: generateId('box'),
      purchaserAddress: args.purchaserAddress,
      tier: args.tier,
      price,
      status: 'unopened',
      purchasedAt: Date.now(),
    });
  },
});

export const openMysteryBox = mutation({
  args: {
    boxId: v.id('mysteryBoxes'),
    purchaserAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const box = await ctx.db.get(args.boxId);
    if (!box) throw new Error('Mystery box not found');
    if (box.purchaserAddress !== args.purchaserAddress)
      throw new Error('Not your mystery box');
    if (box.status !== 'unopened') throw new Error('Box already opened');

    // Generate enhanced stats
    const baseStats = {
      attack: Math.floor(Math.random() * 50) + 25,
      defense: Math.floor(Math.random() * 50) + 25,
      intelligence: Math.floor(Math.random() * 50) + 25,
      luck: Math.floor(Math.random() * 50) + 25,
      speed: Math.floor(Math.random() * 50) + 25,
      strength: Math.floor(Math.random() * 50) + 25,
      nftType: Math.floor(Math.random() * 3),
    };

    const luckMultiplier = 1 + Math.random() * 0.5; // 1.0 to 1.5x
    const finalMultiplier = TIER_MULTIPLIERS[box.tier] * luckMultiplier;

    const enhancedStats = {
      ...baseStats,
      attack: Math.floor(baseStats.attack * finalMultiplier),
      defense: Math.floor(baseStats.defense * finalMultiplier),
      intelligence: Math.floor(baseStats.intelligence * finalMultiplier),
      luck: Math.floor(baseStats.luck * finalMultiplier),
      speed: Math.floor(baseStats.speed * finalMultiplier),
      strength: Math.floor(baseStats.strength * finalMultiplier),
      maxHealth: Math.floor(
        (baseStats.attack + baseStats.defense + baseStats.strength) *
          finalMultiplier *
          0.8,
      ),
      generatedAt: Date.now(),
    };

    // Update box and schedule NFT generation
    await ctx.db.patch(args.boxId, {
      status: 'generating',
      openedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.nftGen.generateNFTPrompt, {
      boxId: args.boxId,
      tier: box.tier,
      stats: enhancedStats,
      multiplier: finalMultiplier,
      collectionId: `mystery_${box.tier}`,
      itemId: generateId('nft'),
    });

    return {
      boxId: args.boxId,
      stats: enhancedStats,
      multiplier: finalMultiplier,
    };
  },
});

export const getUserMysteryBoxes = query({
  args: { userAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('mysteryBoxes')
      .withIndex('by_purchaser', (q) =>
        q.eq('purchaserAddress', args.userAddress),
      )
      .order('desc')
      .take(50);
  },
});

// NFT GENERATION COMPLETION
export const completeNFTGeneration = internalMutation({
  args: {
    boxId: v.id('mysteryBoxes'),
    prompt: v.string(),
    stats: nftStatsSchema,
    multiplier: v.number(),
    collectionId: v.string(),
    itemId: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const box = await ctx.db.get(args.boxId);
    if (!box) throw new Error('Mystery box not found');
    if (box.status !== 'generating')
      throw new Error('Box is not in generating state');

    await ctx.db.patch(args.boxId, {
      status: 'opened',
      generatedNFT: {
        collection: args.collectionId,
        item: args.itemId,
        prompt: args.prompt,
        imageUrl: args.imageUrl,
        stats: args.stats,
        multiplier: args.multiplier,
      },
      openedAt: Date.now(),
    });

    return { success: true };
  },
});

export const failNFTGeneration = internalMutation({
  args: {
    boxId: v.id('mysteryBoxes'),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const box = await ctx.db.get(args.boxId);
    if (!box) throw new Error('Mystery box not found');

    await ctx.db.patch(args.boxId, { status: 'unopened' });
    throw new Error(`NFT generation failed: ${args.error}`);
  },
});

// Internal function to get mystery box for NFT generation
export const getMysteryBox = query({
  args: { boxId: v.id('mysteryBoxes') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.boxId);
  },
});

export const updateMysteryBoxImage = mutation({
  args: {
    boxId: v.id('mysteryBoxes'),
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const box = await ctx.db.get(args.boxId);
    if (!box) throw new Error('Mystery box not found');
    if (!box.generatedNFT) throw new Error('No generated NFT found');

    await ctx.db.patch(args.boxId, {
      generatedNFT: {
        ...box.generatedNFT,
        imageUrl: args.imageUrl,
      },
    });

    return { success: true };
  },
});
