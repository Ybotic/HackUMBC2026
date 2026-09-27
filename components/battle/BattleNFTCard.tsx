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
  selected,
  entering,
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
  selected?: boolean;
  entering?: boolean;
}) {
  const [imageState, setImageState] = useState<{
    src: string | null;
    ratio: number;
    failed: boolean;
  }>({ src: null, ratio: 1, failed: false });
  const meta = getNFTMetadata(metadata);
  const image = getIpfsImageUrl(meta);
  const failed = imageState.src === image && imageState.failed;
  const loaded = imageState.src === image && !imageState.failed;
  const ratio = imageState.src === image ? imageState.ratio : 1;
  const name = meta?.name || `NFT #${card.item}`;
  const maxHealth = card.stats.maxHealth;
  const healthPercent =
    health === undefined || !maxHealth
      ? null
      : Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const fainted = health !== undefined && health <= 0;
  function recordLoad(element: HTMLImageElement) {
    const { naturalWidth, naturalHeight } = element;
    if (naturalWidth && naturalHeight)
      setImageState({
        src: image,
        ratio: naturalWidth / naturalHeight,
        failed: false,
      });
  }
  const classes = [
    'battle-image-piece',
    className,
    active && 'is-active',
    impact && 'is-impact',
    selected && 'is-selected',
    entering && 'is-entering',
    fainted && 'is-fainted',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={classes}
      style={{ ...style, '--art-ratio': failed ? 1 : ratio } as CSSProperties}
      data-loading={image && !failed && !loaded ? 'true' : undefined}
      onClick={(event) => onInspect(event.currentTarget)}
      aria-label={`Inspect ${name}${health !== undefined ? `, ${health} health` : ''}${fainted ? ', knocked out' : ''}${label ? `, ${label}` : ''}`}
    >
      {image && !failed ? (
        <img
          src={image}
          alt=""
          ref={(element) => {
            // Cached images can finish loading before React attaches onLoad.
            if (!element?.complete || imageState.src === image) return;
            if (element.naturalWidth) recordLoad(element);
            else setImageState({ src: image, ratio: 1, failed: true });
          }}
          onLoad={(event) => recordLoad(event.currentTarget)}
          onError={() => setImageState({ src: image, ratio: 1, failed: true })}
        />
      ) : (
        <span className="battle-image-fallback">Artwork unavailable</span>
      )}
      {healthPercent !== null && (
        <span className="battle-image-hp" aria-hidden="true">
          <i style={{ width: `${healthPercent}%` }} />
        </span>
      )}
      {fainted && (
        <span className="battle-image-ko" aria-hidden="true">
          KO
        </span>
      )}
    </button>
  );
}
