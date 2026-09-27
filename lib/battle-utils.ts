// Keep the original Fire/Water/Grass IDs stable for saved NFTs, then append
// the remaining chart types.
export const BATTLE_TYPES = [
  'Fire',
  'Water',
  'Grass',
  'Normal',
  'Electric',
  'Ice',
  'Fighting',
  'Poison',
  'Ground',
  'Flying',
  'Psychic',
  'Bug',
  'Rock',
  'Ghost',
  'Dragon',
  'Dark',
  'Steel',
  'Fairy',
] as const;

export type BattleTypeName = (typeof BATTLE_TYPES)[number];
export type ElementalType =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17;

export const NFT_TYPE_COLORS: Record<ElementalType, string> = {
  0: 'bg-red-500 text-white',
  1: 'bg-blue-500 text-white',
  2: 'bg-primary text-white',
  3: 'bg-stone-500 text-white',
  4: 'bg-yellow-400 text-black',
  5: 'bg-cyan-300 text-slate-900',
  6: 'bg-orange-700 text-white',
  7: 'bg-purple-600 text-white',
  8: 'bg-amber-700 text-white',
  9: 'bg-sky-400 text-white',
  10: 'bg-pink-500 text-white',
  11: 'bg-lime-600 text-white',
  12: 'bg-yellow-700 text-white',
  13: 'bg-indigo-700 text-white',
  14: 'bg-indigo-500 text-white',
  15: 'bg-gray-800 text-white',
  16: 'bg-slate-400 text-slate-900',
  17: 'bg-pink-300 text-slate-900',
};

type TypeMatchups = {
  superEffective: readonly BattleTypeName[];
  notVeryEffective: readonly BattleTypeName[];
  noEffect: readonly BattleTypeName[];
};

const TYPE_CHART: Record<BattleTypeName, TypeMatchups> = {
  Normal: {
    superEffective: [],
    notVeryEffective: ['Rock', 'Steel'],
    noEffect: ['Ghost'],
  },
  Fire: {
    superEffective: ['Grass', 'Ice', 'Bug', 'Steel'],
    notVeryEffective: ['Fire', 'Water', 'Rock', 'Dragon'],
    noEffect: [],
  },
  Water: {
    superEffective: ['Fire', 'Ground', 'Rock'],
    notVeryEffective: ['Water', 'Grass', 'Dragon'],
    noEffect: [],
  },
  Grass: {
    superEffective: ['Water', 'Ground', 'Rock'],
    notVeryEffective: [
      'Fire',
      'Grass',
      'Poison',
      'Flying',
      'Bug',
      'Dragon',
      'Steel',
    ],
    noEffect: [],
  },
  Electric: {
    superEffective: ['Water', 'Flying'],
    notVeryEffective: ['Electric', 'Grass', 'Dragon'],
    noEffect: ['Ground'],
  },
  Ice: {
    superEffective: ['Grass', 'Ground', 'Flying', 'Dragon'],
    notVeryEffective: ['Fire', 'Water', 'Ice', 'Steel'],
    noEffect: [],
  },
  Fighting: {
    superEffective: ['Normal', 'Ice', 'Rock', 'Dark', 'Steel'],
    notVeryEffective: ['Poison', 'Flying', 'Psychic', 'Bug', 'Fairy'],
    noEffect: ['Ghost'],
  },
  Poison: {
    superEffective: ['Grass', 'Fairy'],
    notVeryEffective: ['Poison', 'Ground', 'Rock', 'Ghost'],
    noEffect: ['Steel'],
  },
  Ground: {
    superEffective: ['Fire', 'Electric', 'Poison', 'Rock', 'Steel'],
    notVeryEffective: ['Grass', 'Bug'],
    noEffect: ['Flying'],
  },
  Flying: {
    superEffective: ['Grass', 'Fighting', 'Bug'],
    notVeryEffective: ['Electric', 'Rock', 'Steel'],
    noEffect: [],
  },
  Psychic: {
    superEffective: ['Fighting', 'Poison'],
    notVeryEffective: ['Psychic', 'Steel'],
    noEffect: ['Dark'],
  },
  Bug: {
    superEffective: ['Grass', 'Psychic', 'Dark'],
    notVeryEffective: [
      'Fire',
      'Fighting',
      'Poison',
      'Flying',
      'Dragon',
      'Steel',
      'Fairy',
    ],
    noEffect: [],
  },
  Rock: {
    superEffective: ['Fire', 'Ice', 'Flying', 'Bug'],
    notVeryEffective: ['Fighting', 'Ground', 'Steel'],
    noEffect: [],
  },
  Ghost: {
    superEffective: ['Psychic', 'Ghost'],
    notVeryEffective: ['Dark'],
    noEffect: ['Normal'],
  },
  Dragon: {
    superEffective: ['Dragon'],
    notVeryEffective: ['Steel'],
    noEffect: ['Fairy'],
  },
  Dark: {
    superEffective: ['Psychic', 'Ghost'],
    notVeryEffective: ['Fighting', 'Dark', 'Fairy'],
    noEffect: [],
  },
  Steel: {
    superEffective: ['Ice', 'Rock', 'Fairy'],
    notVeryEffective: ['Fire', 'Water', 'Electric', 'Steel'],
    noEffect: [],
  },
  Fairy: {
    superEffective: ['Fighting', 'Dragon', 'Dark'],
    notVeryEffective: ['Fire', 'Poison', 'Steel'],
    noEffect: [],
  },
};

export function getPlayerDisplayName(address: string, name?: string): string {
  return name || `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export const getNFTTypeName = (nftType: number): string => {
  return BATTLE_TYPES[nftType] || 'Unknown';
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

export type TypedMove = {
  name: string;
  description: string;
  iconName: string;
  kind: 'attack' | 'protect' | 'switchout';
  element?: ElementalType;
};

export function isElementalType(value: number): value is ElementalType {
  return Number.isInteger(value) && value >= 0 && value < BATTLE_TYPES.length;
}

export function getTypeEffectiveness(
  attackerType: number,
  defenderType: number,
): number {
  if (!isElementalType(attackerType) || !isElementalType(defenderType))
    return 1;

  const attacker = BATTLE_TYPES[attackerType];
  const defender = BATTLE_TYPES[defenderType];
  const matchups = TYPE_CHART[attacker];

  if (matchups.noEffect.includes(defender)) return 0;
  if (matchups.superEffective.includes(defender)) return 2;
  if (matchups.notVeryEffective.includes(defender)) return 0.5;
  return 1;
}

export function getFallbackMoves(nftType: number): TypedMove[] {
  if (!isElementalType(nftType)) throw new Error('Unknown NFT type');
  // The assigned NFT type determines combat mechanics.
  const names: Record<BattleTypeName, string[]> = {
    Fire: ['Flame Burst', 'Ember Strike', 'Inferno Rage'],
    Water: ['Aqua Strike', 'Tidal Wave', 'Hydro Cannon'],
    Grass: ['Leaf Storm', 'Root Strike', 'Thorn Barrage'],
    Normal: ['Quick Strike', 'Body Slam', 'Rapid Hit'],
    Electric: ['Volt Strike', 'Static Burst', 'Thunder Crash'],
    Ice: ['Frost Beam', 'Glacier Slam', 'Blizzard Blast'],
    Fighting: ['Combat Strike', 'Power Punch', 'Martial Rush'],
    Poison: ['Toxic Sting', 'Venom Burst', 'Acid Spray'],
    Ground: ['Earthquake Slam', 'Mud Shot', 'Terra Crash'],
    Flying: ['Wing Attack', 'Gale Force', 'Sky Drop'],
    Psychic: ['Mind Blast', 'Psywave Strike', 'Mental Crush'],
    Bug: ['Bug Bite', 'Swarm Strike', 'Chitin Crash'],
    Rock: ['Rock Throw', 'Stone Edge', 'Boulder Bash'],
    Ghost: ['Shadow Ball', 'Phantom Strike', 'Spirit Shred'],
    Dragon: ['Dragon Claw', 'Scale Burst', 'Drake Rush'],
    Dark: ['Night Slash', 'Shadow Strike', 'Dread Burst'],
    Steel: ['Iron Head', 'Metal Claw', 'Steel Crash'],
    Fairy: ['Pixie Dust', 'Charm Burst', 'Moonblast Strike'],
  };
  const icons: Record<BattleTypeName, string> = {
    Fire: 'Flame',
    Water: 'Wind',
    Grass: 'Leaf',
    Normal: 'Swords',
    Electric: 'Zap',
    Ice: 'Sparkles',
    Fighting: 'Swords',
    Poison: 'Eye',
    Ground: 'Target',
    Flying: 'Wind',
    Psychic: 'Brain',
    Bug: 'Leaf',
    Rock: 'Diamond',
    Ghost: 'Eye',
    Dragon: 'Crown',
    Dark: 'Eye',
    Steel: 'Shield',
    Fairy: 'Sparkles',
  };
  const type = BATTLE_TYPES[nftType];
  const attacksNames = names[type];
  const attacks: TypedMove[] = attacksNames.map((name) => ({
    name,
    description: `A ${getNFTTypeName(nftType).toLowerCase()} attack that damages the opposing active card.`,
    iconName: icons[type],
    kind: 'attack',
    element: nftType,
  }));
  return [...attacks, PROTECT_MOVE];
}

export const SWITCH_ACTION = 'Switch';

export const PROTECT_MOVE: TypedMove = {
  name: 'Protect',
  description:
    'Always moves first and blocks all damage this round. Success chance halves with each consecutive use.',
  iconName: 'Shield',
  kind: 'protect',
};

// Switching now lives on the lineup buttons, so every card's utility slot is
// Protect. Older saved moves and battle snapshots may still hold Switchout.
export function withProtectMove<T extends { kind?: string }>(
  moves: readonly T[],
): Array<T | TypedMove> {
  return moves.map((move) => (move.kind === 'switchout' ? PROTECT_MOVE : move));
}

export function protectChance(streak = 0): number {
  return 100 / 2 ** streak;
}

export function hasTypedMoves(
  moves: readonly Partial<TypedMove>[] | undefined,
  nftType: number,
): boolean {
  return (
    !!moves &&
    moves.length === 4 &&
    isElementalType(nftType) &&
    moves.every((move) => !!move.name) &&
    new Set(moves.map((move) => move.name?.toLowerCase())).size === 4 &&
    moves
      .slice(0, 3)
      .every((move) => move.kind === 'attack' && move.element === nftType) &&
    (moves[3].kind === 'protect' || moves[3].kind === 'switchout') &&
    moves[3].element === undefined
  );
}
