export const NFT_TYPE_COLORS = {
  0: 'bg-red-500 text-white',
  1: 'bg-blue-500 text-white',
  2: 'bg-green-500 text-white',
};

export function getPlayerDisplayName(address: string, name?: string): string {
  return name || `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export const getNFTTypeName = (nftType: number): string => {
  const types = ['Fire', 'Water', 'Grass'];
  return types[nftType] || 'Unknown';
};

export function getNFTTypeColor(nftType: number): string {
  return (
    NFT_TYPE_COLORS[nftType as keyof typeof NFT_TYPE_COLORS] ||
    'bg-gray-500 text-white'
  );
}

export function formatTimeLeft(expiresAt: number): string {
  const timeLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / 60000));
  return `${timeLeft}m left`;
}

export function getFallbackMoves(nftType: number) {
  const fallbackMoves = {
    0: [
      // Fire
      {
        name: 'Flame Burst',
        description:
          'Releases concentrated fire energy that burns opponents with intense heat damage.',
        iconName: 'Flame',
      },
      {
        name: 'Ember Strike',
        description:
          'Quick fiery attack that deals moderate damage with chance to burn.',
        iconName: 'Zap',
      },
      {
        name: 'Inferno Rage',
        description:
          'Powerful fire blast that engulfs enemies in scorching flames dealing heavy damage.',
        iconName: 'Sun',
      },
      {
        name: 'Solar Flare',
        description:
          'Brilliant flash of fire energy that blinds and damages all nearby enemies.',
        iconName: 'Sparkles',
      },
    ],
    1: [
      // Water
      {
        name: 'Aqua Strike',
        description:
          'Powerful stream of water that crashes into enemies with tremendous crushing force.',
        iconName: 'Zap',
      },
      {
        name: 'Tidal Wave',
        description:
          'Massive wave attack that sweeps across battlefield dealing area water damage.',
        iconName: 'Wind',
      },
      {
        name: 'Hydro Cannon',
        description:
          'High pressure water blast that pierces through enemy defenses with precision.',
        iconName: 'Target',
      },
      {
        name: 'Ocean Wrath',
        description:
          'Summons the fury of the sea to overwhelm opponents with aquatic power.',
        iconName: 'Crown',
      },
    ],
    2: [
      // Grass
      {
        name: 'Leaf Storm',
        description:
          'Whirlwind of razor sharp leaves that slice through enemy defenses with precision.',
        iconName: 'Leaf',
      },
      {
        name: 'Root Strike',
        description:
          'Underground roots emerge to entangle and damage enemies from below surface.',
        iconName: 'Shield',
      },
      {
        name: 'Thorn Barrage',
        description:
          'Launches volley of poisonous thorns that pierce armor and inflict damage.',
        iconName: 'Swords',
      },
      {
        name: 'Nature Fury',
        description:
          'Channels raw power of nature to unleash devastating plant based attacks.',
        iconName: 'Star',
      },
    ],
  };

  return (
    fallbackMoves[nftType as keyof typeof fallbackMoves] || fallbackMoves[0]
  );
}
