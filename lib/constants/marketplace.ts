import { Package, Gift, Sparkles, Star, Crown } from 'lucide-react';

export const TIER_PRICES = {
  common: 10, // 2 wins
  uncommon: 25, // 5 wins
  rare: 50, // 10 wins
  epic: 100, // 20 wins
  legendary: 300, // 60 wins
} as const;

export const TIER_MULTIPLIERS = {
  common: 1.0,
  uncommon: 1.2,
  rare: 1.5,
  epic: 2.0,
  legendary: 3.0,
} as const;

export const MYSTERY_BOX_TIERS = {
  common: {
    name: 'Common Box',
    price: TIER_PRICES.common,
    icon: Package,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    multiplier: `${TIER_MULTIPLIERS.common}x`,
    description: 'Basic mystery box with standard NFTs',
  },
  uncommon: {
    name: 'Uncommon Box',
    price: TIER_PRICES.uncommon,
    icon: Gift,
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900',
    multiplier: `${TIER_MULTIPLIERS.uncommon}x`,
    description: 'Enhanced mystery box with improved NFTs',
  },
  rare: {
    name: 'Rare Box',
    price: TIER_PRICES.rare,
    icon: Sparkles,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    multiplier: `${TIER_MULTIPLIERS.rare}x`,
    description: 'Rare mystery box with powerful NFTs',
  },
  epic: {
    name: 'Epic Box',
    price: TIER_PRICES.epic,
    icon: Star,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
    multiplier: `${TIER_MULTIPLIERS.epic}x`,
    description: 'Epic mystery box with exceptional NFTs',
  },
  legendary: {
    name: 'Legendary Box',
    price: TIER_PRICES.legendary,
    icon: Crown,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900',
    multiplier: `${TIER_MULTIPLIERS.legendary}x`,
    description: 'Legendary mystery box with godlike NFTs',
  },
} as const;

export const NFT_TYPES = ['Fire', 'Water', 'Grass'] as const;

export const NFT_TYPE_COLORS = {
  0: 'bg-red-500',
  1: 'bg-blue-500',
  2: 'bg-green-500',
} as const;

export const generateId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export type TierType = keyof typeof TIER_PRICES;

// for auction
export const DURATION_OPTIONS = [
  { label: '1 Hour', value: 1 },
  { label: '6 Hours', value: 6 },
  { label: '12 Hours', value: 12 },
  { label: '1 Day', value: 24 },
  { label: '3 Days', value: 72 },
  { label: '7 Days', value: 168 },
];
