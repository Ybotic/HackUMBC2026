'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { getIpfsImageUrl, getNFTMetadata } from '@/lib/utils';

export type LiveNFT = {
  collection: string;
  item: string;
  stats: {
    attack: number;
    defense: number;
    intelligence: number;
    luck: number;
    speed: number;
    strength: number;
    nftType: number;
    maxHealth: number;
  };
  moves?: Array<{ name: string; description: string; iconName: string }>;
};

export function BattleNFTCard({
  card,
  metadata,
  health,
  label,
  className,
  onInspect,
  style,
  active,
  impact,
}: {
  card: LiveNFT;
  metadata?: unknown;
  health?: number;
  label?: string;
  className?: string;
  onInspect: () => void;
  style?: CSSProperties;
  active?: boolean;
  impact?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const meta = getNFTMetadata(metadata);
  const image = getIpfsImageUrl(meta);
  useEffect(() => setFailed(false), [image]);
  const name = meta?.name || `NFT #${card.item}`;
  return (
    <button
      type="button"
      className={`battle-image-piece ${className ?? ''} ${active ? 'is-active' : ''} ${impact ? 'is-impact' : ''}`}
      style={style}
      onClick={onInspect}
      aria-label={`Inspect ${name}${health !== undefined ? `, ${health} health` : ''}${label ? `, ${label}` : ''}`}
    >
      {image && !failed ? (
        <img src={image} alt="" onError={() => setFailed(true)} />
      ) : (
        <span className="battle-image-fallback">Artwork unavailable</span>
      )}
    </button>
  );
}
