import { v } from 'convex/values';
import { mutation, internalMutation, query } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { IMAGE_GENERATION_MODEL } from '../lib/constants/imageGeneration';

// this is a function because it's reused in this file as well
async function insertImageGeneration(
  ctx: any,
  args: {
    userAddress: Id<'users'>;
    prompt: string;
    model: string;
  },
) {
  return await ctx.db.insert('imageGenerations', {
    userAddress: args.userAddress,
    prompt: args.prompt,
    model: args.model,
    status: 'pending',
    createdAt: Date.now(),
  });
}

export const generateImage = mutation({
  args: {
    userAddress: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_address', (q) => q.eq('address', args.userAddress))
      .first();

    const userId: Id<'users'> =
      existingUser?._id ??
      (await ctx.db.insert('users', { address: args.userAddress }));

    const imageGenId = await insertImageGeneration(ctx, {
      userAddress: userId,
      prompt: args.prompt,
      model: IMAGE_GENERATION_MODEL,
    });

    await ctx.scheduler.runAfter(0, internal.imageGen.generateImage, {
      imageGenId,
      prompt: args.prompt,
    });

    return imageGenId;
  },
});

export const saveGeneratedImage = internalMutation({
  args: {
    imageGenId: v.id('imageGenerations'),
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.imageGenId, {
      imageUrl: args.imageUrl,
      status: 'completed',
      completedAt: Date.now(),
    });
  },
});

export const markImageAsFailed = internalMutation({
  args: {
    imageGenId: v.id('imageGenerations'),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.imageGenId, {
      status: 'failed',
      error: args.error,
      completedAt: Date.now(),
    });
  },
});

export const getUserImages = query({
  args: { userAddress: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_address', (q) => q.eq('address', args.userAddress))
      .first();

    if (!user) return [];

    return await ctx.db
      .query('imageGenerations')
      .withIndex('by_user', (q) => q.eq('userAddress', user._id))
      .order('desc')
      .collect();
  },
});

export const getImageGeneration = query({
  args: { imageGenId: v.id('imageGenerations') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.imageGenId);
  },
});

export const updateImageIpfsUrl = mutation({
  args: {
    imageUrl: v.string(),
    ipfsUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const imageGen = await ctx.db
      .query('imageGenerations')
      .filter((q) => q.eq(q.field('imageUrl'), args.imageUrl))
      .first();

    if (!imageGen) {
      throw new Error('Image generation not found');
    }

    await ctx.db.patch(imageGen._id, {
      ipfsUrl: args.ipfsUrl,
    });

    return imageGen._id;
  },
});

export const createImageGeneration = internalMutation({
  args: {
    userAddress: v.id('users'),
    prompt: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    return await insertImageGeneration(ctx, args);
  },
});

export const getMultipleImageGenerations = query({
  args: { imageGenIds: v.array(v.id('imageGenerations')) },
  handler: async (ctx, args) => {
    const results = await Promise.all(
      args.imageGenIds.map((id) => ctx.db.get(id)),
    );
    return results.filter(Boolean);
  },
});
