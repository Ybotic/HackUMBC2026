import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import type { DatabaseReader } from './_generated/server';

export async function getUserId(
  ctx: { db: DatabaseReader },
  address: string,
): Promise<Id<'users'> | null> {
  if (!address) return null;

  const user = await ctx.db
    .query('users')
    .withIndex('by_address', (q: any) => q.eq('address', address))
    .first();

  return user?._id || null;
}

export const createOrGetUser = mutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_address', (q) => q.eq('address', address))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    const userId = await ctx.db.insert('users', {
      address,
      credits: 0,
    });

    return userId;
  },
});

export const getUser = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    return ctx.db
      .query('users')
      .withIndex('by_address', (q) => q.eq('address', address))
      .first();
  },
});

export const requireUser = async (ctx: any, address: string) => {
  const user = await ctx.db
    .query('users')
    .withIndex('by_address', (q: any) => q.eq('address', address))
    .first();

  if (!user) {
    throw new Error('User not found. Please connect your wallet first.');
  }

  return user;
};

export const updateProfilePicture = mutation({
  args: {
    address: v.string(),
    profilePictureUrl: v.string(),
  },
  handler: async (ctx, { address, profilePictureUrl }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_address', (q) => q.eq('address', address))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    await ctx.db.patch(user._id, {
      profilePicture: profilePictureUrl,
      profilePictureUpdatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const removeProfilePicture = mutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_address', (q) => q.eq('address', address))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    await ctx.db.patch(user._id, {
      profilePicture: undefined,
      profilePictureUpdatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const addCredits = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, { address, amount }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_address', (q) => q.eq('address', address))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    const currentCredits = user.credits || 0;
    const newCredits = currentCredits + amount;

    await ctx.db.patch(user._id, {
      credits: newCredits,
    });

    return { success: true, newBalance: newCredits };
  },
});
