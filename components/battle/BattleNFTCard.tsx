'use client';

import { useState, type CSSProperties } from 'react';
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
  onInspect: (trigger: HTMLButtonElement) => void;
  style?: CSSProperties;
  active?: boolean;
  impact?: boolean;
}) {
  const [imageState, setImageState] = useState<{
    src: string | null;
    ratio: number;
    failed: boolean;
  }>({ src: null, ratio: 1, failed: false });
  const meta = getNFTMetadata(metadata);
  const image = getIpfsImageUrl(meta);
  const failed = imageState.src === image && imageState.failed;
  const ratio = imageState.src === image ? imageState.ratio : 1;
  const name = meta?.name || `NFT #${card.item}`;
  return (
    <button
      type="button"
      className={`battle-image-piece ${className ?? ''} ${active ? 'is-active' : ''} ${impact ? 'is-impact' : ''}`}
      style={{ ...style, '--art-ratio': failed ? 1 : ratio } as CSSProperties}
      onClick={(event) => onInspect(event.currentTarget)}
      aria-label={`Inspect ${name}${health !== undefined ? `, ${health} health` : ''}${label ? `, ${label}` : ''}`}
    >
      {image && !failed ? (
        <img
          src={image}
          alt=""
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            if (naturalWidth && naturalHeight)
              setImageState({
                src: image,
                ratio: naturalWidth / naturalHeight,
                failed: false,
              });
          }}
          onError={() => setImageState({ src: image, ratio: 1, failed: true })}
        />
      ) : (
        <span className="battle-image-fallback">Artwork unavailable</span>
      )}
    </button>
  );
}
