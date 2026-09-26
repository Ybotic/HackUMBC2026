'use node';

import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { NFT_TYPES } from '../lib/constants/marketplace';
import { nftStatsSchema, tierSchema } from './schema';

const TIER_DESCRIPTIONS = {
  common: 'basic and simple',
  uncommon: 'enhanced with magical auras',
  rare: 'powerful and mystical',
  epic: 'legendary with cosmic powers',
  legendary: 'godlike and reality-bending',
} as const;

const CATEGORIES = [
  'creature',
  'warrior',
  'mage',
  'beast',
  'elemental',
  'spirit',
  'dragon',
  'demon',
  'angel',
  'robot',
  'knight',
  'assassin',
  'necromancer',
  'paladin',
  'shaman',
  'titan',
  'phoenix',
  'golem',
];

const ENVIRONMENTS = [
  'cosmic void',
  'ancient ruins',
  'crystal caverns',
  'floating islands',
  'underwater depths',
  'volcanic landscape',
  'frozen tundra',
  'mystical forest',
  'shadow realm',
  'celestial plane',
  'mechanical citadel',
  'dreamscape',
];

const getRandomElement = (array: string[]) =>
  array[Math.floor(Math.random() * array.length)];

export const generateNFTPrompt = internalAction({
  args: {
    boxId: v.id('mysteryBoxes'),
    tier: tierSchema,
    stats: nftStatsSchema,
    multiplier: v.number(),
    collectionId: v.string(),
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const { google } = await import('@ai-sdk/google');
      const { generateText } = await import('ai');

      const nftType = NFT_TYPES[args.stats.nftType];
      const category = getRandomElement(CATEGORIES);
      const environment = getRandomElement(ENVIRONMENTS);
      const tierDescription = TIER_DESCRIPTIONS[args.tier];

      const prompt = `Generate a unique NFT character description for a ${args.tier} tier mystery box.

Requirements:
- Element: ${nftType} (incorporate heavily)
- Category: ${category}
- Environment: ${environment}
- Quality: ${tierDescription}
- Power Level: ${args.multiplier.toFixed(2)}x multiplier

Create a vivid, 1-2 sentence description that combines all elements uniquely. Be creative and avoid clichés.

Example style: "A ${category} forged from ${nftType.toLowerCase()} essence in the ${environment}, whose power resonates at ${args.multiplier.toFixed(1)}x the normal frequency."

Generate only the character description:`;

      const result = await generateText({
        model: google('gemini-2.0-flash-exp'),
        prompt,
      });

      const generatedPrompt = result.text.trim();

      await ctx.runMutation(internal.marketplace.completeNFTGeneration, {
        boxId: args.boxId,
        prompt: generatedPrompt,
        stats: args.stats,
        multiplier: args.multiplier,
        collectionId: args.collectionId,
        itemId: args.itemId,
        imageUrl: undefined,
      });

      return { prompt: generatedPrompt };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      await ctx.runMutation(internal.marketplace.failNFTGeneration, {
        boxId: args.boxId,
        error: errorMessage,
      });

      throw error;
    }
  },
});
