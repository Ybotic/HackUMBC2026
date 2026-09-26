export type CardZone =
  | 'hand'
  | 'local-active'
  | 'local-bench'
  | 'opponent-active'
  | 'opponent-bench'
  | 'stadium'
  | 'knocked-out'
  | 'discard'
  | 'deck'
  | 'attached';

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
  cardType?: 'item' | 'tool' | 'supporter' | 'stadium' | 'basic-energy';
  element: CardElement;
  symbol: string;
  hp?: number;
  damage?: number;
  attack?: string;
  attackDamage?: number;
  ruleText: string;
  zone: CardZone;
  slot: number;
  energyAttached?: number;
  toolAttached?: boolean;
  knockedOut?: boolean;
  status?: 'burn' | 'sleep' | 'poison' | 'paralysis';
};

export type ScreenTransform = {
  /** Horizontal position as a percentage of the battle stage. */
  x: number;
  /** Vertical position as a percentage of the battle stage. */
  y: number;
  scale: number;
  rotationZ: number;
  rotationX: number;
  rotationY: number;
};

export type AnimationCommand =
  | {
      kind: 'tween';
      duration: number;
      ease?: string;
      from?: Partial<ScreenTransform>;
      to: Partial<ScreenTransform>;
    }
  | {
      kind: 'path';
      duration: number;
      ease?: string;
      points: Array<{ x: number; y: number }>;
    }
  | { kind: 'delay'; duration: number }
  | { kind: 'view'; mode: 'big' | 'icon' | 'hidden'; immediate?: boolean }
  | { kind: 'reparent'; layer: string }
  | { kind: 'effect'; effectId: string; target: string }
  | { kind: 'sound'; soundId: string; delay?: number }
  | { kind: 'event'; name: string };

export type AnimationSequence = {
  id: string;
  commands: AnimationCommand[];
};

export type CardPosition = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type ActiveEffect = {
  id: string;
  effectId: string;
  sourceId: string;
  targetId: string;
  createdAt: number;
  durationMs?: number;
};

export type BattleEvent =
  | { type: 'cardMoved'; cardId: string; from: CardZone; to: CardZone }
  | { type: 'cardFocused'; cardId: string }
  | { type: 'cardUnfocused'; cardId: string }
  | { type: 'energyAttached'; cardId: string; amount: number }
  | { type: 'toolAttached'; cardId: string }
  | { type: 'activeSwitched'; playerCardId: string; opponentCardId: string }
  | { type: 'attackStarted'; attackerId: string; attackId: string }
  | { type: 'damageApplied'; targetId: string; amount: number }
  | { type: 'cardKnockedOut'; cardId: string }
  | { type: 'prizeSelected'; prize: string }
  | { type: 'stadiumAbilityResolved'; cardId: string; targetId: string }
  | { type: 'turnChanged'; player: 'player' | 'opponent' }
  | { type: 'supporterPlayed'; cardId: string; supporter: string }
  | { type: 'searchStarted'; player: 'player' | 'opponent' }
  | { type: 'searchResolved'; player: 'player'; cardIds: string[] }
  | { type: 'cardDrawn'; cardId: string }
  | { type: 'statusApplied'; targetId: string; status: string };
