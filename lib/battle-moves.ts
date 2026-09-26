export interface BattleMove {
  name: string;
  description: string;
  power: number;
  iconName: string;
}

export interface NFTStats {
  attack: number;
  defense: number;
  intelligence: number;
  luck: number;
  speed: number;
  strength: number;
  nftType: number;
  maxHealth: number;
  generatedAt: number;
}
