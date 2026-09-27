export type CardZone =
  | 'hand'
  | 'local-active'
  | 'opponent-active'
  | 'deck'
  | 'discard';

export type CardElement =
  | 'solar'
  | 'flame'
  | 'tide'
  | 'grove'
  | 'stone'
  | 'neutral';

export type BattleCard = {
  id: string;
  name: string;
  subtitle: string;
  category: 'creature' | 'trainer' | 'energy';
  cardType?:
    | 'item'
    | 'tool'
    | 'supporter'
    | 'stadium'
    | 'basic-energy'
    | 'move';
  element: CardElement;
  symbol: string;
  image?: string | null;
  hp?: number;
  damage?: number;
  attack?: string;
  attackDamage?: number;
  ruleText: string;
  zone: CardZone;
  slot: number;
  energyAttached?: number;
  toolAttached?: boolean;
  status?: 'burn' | 'sleep' | 'poison' | 'paralysis';
};

export type CardPosition = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};
