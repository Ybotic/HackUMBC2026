export const NFT_TYPE_COLORS = {
  0: 'bg-red-500 text-white',
  1: 'bg-blue-500 text-white',
  2: 'bg-primary text-white',
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

export function getFallbackMoves(_nftType: number, cardDescription = '') {
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

  const description = cardDescription.toLowerCase();

  // The user description takes precedence over the separately assigned game
  // type, especially for cards whose identity is not elemental (like ghosts).
  if (
    /\b(ghost|spirit|phantom|specter|spectre|wraith|haunted|undead)\b/.test(
      description,
    )
  ) {
    return [
      {
        name: 'Spectral Shift',
        description:
          'The spirit slips through a solid blow, then reappears nearby to strike before the opponent can react.',
        iconName: 'Sparkles',
      },
      {
        name: 'Haunting Grasp',
        description:
          'An eerie chill rattles the target’s resolve, opening a brief chance for the ghost to attack again.',
        iconName: 'Heart',
      },
      {
        name: 'Phantom Veil',
        description:
          'The phantom fades from sight, avoiding an incoming hit and returning with a sudden spectral counter.',
        iconName: 'Eye',
      },
      {
        name: 'Ethereal Surge',
        description:
          'The ghost gathers lingering spirits into one forceful strike that disrupts the enemy’s next attack.',
        iconName: 'Zap',
      },
    ];
  }

  if (
    /\b(fire|flame|fiery|ember|inferno|lava|volcano|phoenix)\b/.test(
      description,
    )
  ) {
    return fallbackMoves[0];
  }

  if (
    /\b(water|ocean|sea|wave|tidal|aquatic|river|aqua|hydro)\b/.test(
      description,
    )
  ) {
    return fallbackMoves[1];
  }

  if (
    /\b(grass|plant|forest|leaf|leaves|vine|thorn|nature|flower)\b/.test(
      description,
    )
  ) {
    return fallbackMoves[2];
  }

  // If the description doesn't establish an element, stay neutral instead of
  // inventing one from the NFT's arbitrary game-type assignment.
  return [
    {
      name: 'Focused Strike',
      description:
        'A measured strike targets an opening in the opponent’s guard, creating space for the next move.',
      iconName: 'Target',
    },
    {
      name: 'Swift Feint',
      description:
        'A sudden feint draws out a response, letting the fighter reposition before the opponent can recover.',
      iconName: 'Wind',
    },
    {
      name: 'Guarded Stance',
      description:
        'The card braces for impact, absorbs incoming force, and steadies itself for another exchange.',
      iconName: 'Shield',
    },
    {
      name: 'Power Surge',
      description:
        'A burst of focused energy powers a decisive attack without relying on any particular elemental affinity.',
      iconName: 'Zap',
    },
  ];
}
