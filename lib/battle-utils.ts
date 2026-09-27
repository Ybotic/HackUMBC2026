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

export type ElementalType = 0 | 1 | 2;
export type TypedMove = {
  name: string;
  description: string;
  iconName: string;
  kind: 'attack' | 'protect' | 'switchout';
  element?: ElementalType;
};

export function isElementalType(value: number): value is ElementalType {
  return value === 0 || value === 1 || value === 2;
}

export function getFallbackMoves(
  nftType: number,
  cardIdentity = '',
): TypedMove[] {
  if (!isElementalType(nftType)) throw new Error('Unknown NFT type');
  // The assigned NFT type determines combat mechanics; text only influences
  // which of the two utility moves the card receives.
  const names = [
    ['Flame Burst', 'Ember Strike', 'Inferno Rage'],
    ['Aqua Strike', 'Tidal Wave', 'Hydro Cannon'],
    ['Leaf Storm', 'Root Strike', 'Thorn Barrage'],
  ][nftType];
  const icons = ['Flame', 'Wind', 'Leaf'];
  const attacks: TypedMove[] = names.map((name) => ({
    name,
    description: `A ${getNFTTypeName(nftType).toLowerCase()} attack that damages the opposing active card.`,
    iconName: icons[nftType],
    kind: 'attack',
    element: nftType,
  }));
  const switchout =
    [...cardIdentity].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2 ===
    1;
  return [
    ...attacks,
    switchout
      ? {
          name: 'Switchout',
          description: 'Switch to a living reserve from your battle lineup.',
          iconName: 'Wind',
          kind: 'switchout',
        }
      : {
          name: 'Protect',
          description:
            'Block attacks this round. Consecutive uses have half the previous success chance.',
          iconName: 'Shield',
          kind: 'protect',
        },
  ];
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
