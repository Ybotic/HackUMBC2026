import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const elementalTypeSchema = v.union(
  v.literal(0),
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(4),
  v.literal(5),
  v.literal(6),
  v.literal(7),
  v.literal(8),
  v.literal(9),
  v.literal(10),
  v.literal(11),
  v.literal(12),
  v.literal(13),
  v.literal(14),
  v.literal(15),
  v.literal(16),
  v.literal(17),
);

export const nftStatsSchema = v.object({
  attack: v.number(),
  defense: v.number(),
  intelligence: v.number(),
  luck: v.number(),
  speed: v.number(),
  strength: v.number(),
  nftType: elementalTypeSchema,
  maxHealth: v.number(),
  generatedAt: v.number(),
});

export const nftMoveSchema = v.object({
  name: v.string(), // exactly 2 words
  description: v.string(), // 15-20 words max, simple language
  iconName: v.string(), // lucide react icon name
  // Optional so existing saved NFTs and battle snapshots remain readable.
  kind: v.optional(
    v.union(v.literal('attack'), v.literal('protect'), v.literal('switchout')),
  ),
  element: v.optional(elementalTypeSchema),
});

export const battleNFTReferenceSchema = v.object({
  collection: v.string(),
  item: v.string(),
});

export const battleNFTSchema = v.object({
  collection: v.string(),
  item: v.string(),
  stats: nftStatsSchema,
  moves: v.optional(v.array(nftMoveSchema)),
});

export const tierSchema = v.union(
  v.literal('common'),
  v.literal('uncommon'),
  v.literal('rare'),
  v.literal('epic'),
  v.literal('legendary'),
);

export default defineSchema({
  users: defineTable({
    address: v.string(), // Solana wallet address (primary)
    profilePicture: v.optional(v.string()), // URL to profile picture stored in Vercel blob
    profilePictureUpdatedAt: v.optional(v.number()),
    credits: v.optional(v.number()), // user's credit balance, defaults to 0
  }).index('by_address', ['address']),

  imageGenerations: defineTable({
    userAddress: v.id('users'),
    prompt: v.string(),
    model: v.string(),
    imageUrl: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('completed'),
      v.literal('failed'),
    ),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    ipfsUrl: v.optional(v.string()),
  }).index('by_user', ['userAddress']),

  lobbies: defineTable({
    lobbyId: v.string(),
    creatorAddress: v.string(),
    creatorName: v.optional(v.string()),

    status: v.union(
      v.literal('waiting'), // waiting for opponent
      v.literal('ready'), // both players joined, waiting for game start
      v.literal('started'), // battle has begun
      v.literal('cancelled'), // creator cancelled
      v.literal('expired'), // auto-expired after timeout
    ),

    settings: v.object({
      isPrivate: v.boolean(), // private = invite only, public = anyone can join
      maxWaitTime: v.number(), // auto-expire after X minutes
    }),

    // Opponent info (when someone joins)
    joinedPlayerAddress: v.optional(v.string()),
    joinedPlayerName: v.optional(v.string()),

    // NFT selections (can change until both ready)
    creatorNFT: v.optional(
      v.object({
        collection: v.string(),
        item: v.string(),
        isReady: v.boolean(),
      }),
    ),
    joinerNFT: v.optional(
      v.object({
        collection: v.string(),
        item: v.string(),
        isReady: v.boolean(),
      }),
    ),

    creatorRoster: v.optional(
      v.object({
        cards: v.array(battleNFTReferenceSchema),
        isReady: v.boolean(),
      }),
    ),
    joinerRoster: v.optional(
      v.object({
        cards: v.array(battleNFTReferenceSchema),
        isReady: v.boolean(),
      }),
    ),

    // Real-time presence
    playersOnline: v.array(v.string()),
    lastActivity: v.number(),

    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index('by_status', ['status'])
    .index('by_creator', ['creatorAddress'])
    .index('by_public', ['settings.isPrivate', 'status']),

  battles: defineTable({
    battleId: v.string(),
    rulesVersion: v.optional(v.number()), // 2 = typed moves and priority rounds

    // Players
    player1Address: v.string(),
    player2Address: v.string(),
    player1Name: v.optional(v.string()),
    player2Name: v.optional(v.string()),

    // NFTs locked in at battle start
    player1NFT: battleNFTSchema,
    player2NFT: battleNFTSchema,
    // Optional for pre-roster battles. Indices in gameState refer to these snapshots.
    player1Roster: v.optional(v.array(battleNFTSchema)),
    player2Roster: v.optional(v.array(battleNFTSchema)),

    // Authoritative server-side game state
    gameState: v.object({
      currentTurn: v.string(), // player address whose turn it is
      player1Health: v.number(),
      player2Health: v.number(),
      player1MaxHealth: v.number(),
      player2MaxHealth: v.number(),
      player1Lineup: v.optional(v.array(v.number())),
      player2Lineup: v.optional(v.array(v.number())),
      player1Active: v.optional(v.number()),
      player2Active: v.optional(v.number()),
      player1CardHealth: v.optional(v.array(v.number())),
      player2CardHealth: v.optional(v.array(v.number())),
      turnNumber: v.number(),
      roundDeadline: v.optional(v.number()),
      roundChoices: v.optional(
        v.object({
          player1: v.optional(
            v.object({ action: v.string(), cardIndex: v.optional(v.number()) }),
          ),
          player2: v.optional(
            v.object({ action: v.string(), cardIndex: v.optional(v.number()) }),
          ),
        }),
      ),
      protectStreak1: v.optional(v.array(v.number())),
      protectStreak2: v.optional(v.array(v.number())),

      status: v.union(
        v.literal('initializing'), // battle setup in progress
        v.literal('active'), // battle is live
        v.literal('finished'), // battle completed
        v.literal('abandoned'), // player disconnected too long
      ),

      winner: v.optional(v.string()),

      // Track a pending turn action
      pendingTurn: v.optional(
        v.object({
          player: v.string(),
          timestamp: v.number(),
          action: v.string(), // "attack", "createBattle", etc.
        }),
      ),
    }),

    // Move history (for replay/analysis)
    moves: v.array(
      v.object({
        turnNumber: v.number(),
        player: v.string(),
        action: v.string(),
        damage: v.optional(v.number()),
        wasCritical: v.optional(v.boolean()),
        targetHealth: v.optional(v.number()),
        turnId: v.string(),
        timestamp: v.number(),
        kind: v.optional(
          v.union(
            v.literal('attack'),
            v.literal('switch'),
            v.literal('protect'),
          ),
        ),
        cardIndex: v.optional(v.number()),
        targetIndex: v.optional(v.number()),
        moveElement: v.optional(elementalTypeSchema),
        effectiveness: v.optional(v.number()),
        protectSuccess: v.optional(v.boolean()),
        blocked: v.optional(v.boolean()),
      }),
    ),

    // Real-time connection tracking
    playersOnline: v.array(v.string()),
    lastActivity: v.number(),

    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  })
    .index('by_player1', ['player1Address'])
    .index('by_player2', ['player2Address'])
    .index('by_status', ['gameState.status']),

  nftCollections: defineTable({
    collectionId: v.string(),
    owner: v.string(),
    userAddress: v.id('users'),
    details: v.any(),
    metadata: v.any(),
    lastSynced: v.number(),
  })
    .index('by_user', ['userAddress'])
    .index('by_collection_id', ['collectionId']),

  nftItems: defineTable({
    collectionId: v.string(),
    itemId: v.string(),
    owner: v.string(),
    userAddress: v.id('users'),
    itemDetails: v.any(),
    itemMetadata: v.any(),
    stats: v.optional(nftStatsSchema),
    customMoves: v.optional(v.array(nftMoveSchema)),
    lastSynced: v.number(),
  })
    .index('by_user', ['userAddress'])
    .index('by_collection', ['collectionId'])
    .index('by_item', ['collectionId', 'itemId']),

  // MARKETPLACE TABLES
  auctions: defineTable({
    auctionId: v.string(),
    sellerAddress: v.string(),

    // NFT being auctioned
    nft: v.object({
      collection: v.string(),
      item: v.string(),
      metadata: v.any(),
      stats: v.optional(nftStatsSchema),
    }),

    // Auction settings
    minimumPrice: v.number(), // in credits
    buyoutPrice: v.optional(v.number()), // instant buy price
    duration: v.number(), // in milliseconds

    status: v.union(
      v.literal('active'),
      v.literal('completed'),
      v.literal('cancelled'),
      v.literal('expired'),
    ),

    // Current highest bid
    currentBid: v.optional(
      v.object({
        amount: v.number(),
        bidderAddress: v.string(),
        timestamp: v.number(),
      }),
    ),

    // Winner info (when auction ends)
    winner: v.optional(
      v.object({
        address: v.string(),
        finalPrice: v.number(),
      }),
    ),

    // Transfer status
    transferCompleted: v.boolean(),
    transferTxHash: v.optional(v.string()),

    createdAt: v.number(),
    endsAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_seller', ['sellerAddress'])
    .index('by_status', ['status'])
    .index('by_active', ['status', 'endsAt']),

  auctionBids: defineTable({
    auctionId: v.id('auctions'),
    bidderAddress: v.string(),
    amount: v.number(),
    timestamp: v.number(),
    isWinning: v.boolean(), // true for current highest bid
    refunded: v.boolean(), // true if bid was refunded
  })
    .index('by_auction', ['auctionId'])
    .index('by_bidder', ['bidderAddress'])
    .index('by_winning', ['auctionId', 'isWinning']),

  mysteryBoxes: defineTable({
    boxId: v.string(),
    purchaserAddress: v.string(),
    tier: tierSchema,
    price: v.number(), // in credits

    status: v.union(
      v.literal('unopened'),
      v.literal('opened'),
      v.literal('generating'), // NFT generation in progress
    ),

    // Generated NFT (when opened)
    generatedNFT: v.optional(
      v.object({
        collection: v.string(),
        item: v.string(),
        prompt: v.string(),
        imageUrl: v.optional(v.string()),
        stats: nftStatsSchema,
        multiplier: v.number(), // luck-based multiplier applied to stats
      }),
    ),

    purchasedAt: v.number(),
    openedAt: v.optional(v.number()),
  })
    .index('by_purchaser', ['purchaserAddress'])
    .index('by_status', ['status'])
    .index('by_tier', ['tier']),
});
