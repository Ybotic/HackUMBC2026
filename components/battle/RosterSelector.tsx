'use client';

import { getIpfsImageUrl, getNFTMetadata } from '@/lib/utils';
import { getNFTTypeName } from '@/lib/battle-utils';
import { Button } from '@/components/ui/button';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export type NFTReference = { collection: string; item: string };
export type SelectableNFT = NFTReference & {
  itemMetadata?: unknown;
  stats?: {
    maxHealth: number;
    attack: number;
    defense: number;
    speed: number;
    nftType: number;
  };
};

export function RosterSelector({
  nfts,
  cards,
  isReady,
  disabled,
  onChange,
  onReady,
}: {
  nfts: SelectableNFT[];
  cards: NFTReference[];
  isReady: boolean;
  disabled: boolean;
  onChange: (cards: NFTReference[]) => void;
  onReady: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Choose your roster ({cards.length}/5)</h3>
        <p className="text-sm text-muted-foreground">
          Select 3–5 owned NFTs. You will pick three to use after seeing your
          opponent's roster.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
        {nfts.map((nft) => {
          const chosen = cards.some(
            (card) =>
              card.collection === nft.collection && card.item === nft.item,
          );
          const meta = getNFTMetadata(nft.itemMetadata);
          const image = getIpfsImageUrl(meta);
          return (
            <button
              key={`${nft.collection}:${nft.item}`}
              type="button"
              aria-pressed={chosen}
              disabled={
                disabled || !nft.stats || (!chosen && cards.length >= 5)
              }
              onClick={() =>
                onChange(
                  chosen
                    ? cards.filter(
                        (card) =>
                          card.collection !== nft.collection ||
                          card.item !== nft.item,
                      )
                    : [
                        ...cards,
                        { collection: nft.collection, item: nft.item },
                      ],
                )
              }
              className={`rounded-lg border-2 p-2 text-left focus-visible:outline-2 focus-visible:outline-primary ${chosen ? 'border-primary' : 'border-border'} disabled:opacity-50`}
            >
              {image ? (
                <img
                  src={image}
                  alt=""
                  className="w-full aspect-square object-contain rounded"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-muted rounded">
                  No artwork
                </div>
              )}
              <span className="block text-sm font-semibold truncate">
                {meta?.name || `NFT #${nft.item}`}
              </span>
              <span className="block text-xs text-muted-foreground">
                {nft.stats
                  ? `${getNFTTypeName(nft.stats.nftType)} · ${nft.stats.maxHealth} HP`
                  : 'Sync stats to use'}
              </span>
            </button>
          );
        })}
      </div>
      {nfts.length < 3 && (
        <p role="status" className="text-sm">
          You need at least three synced NFTs to battle.
        </p>
      )}
      <Button
        onClick={onReady}
        disabled={disabled || cards.length < 3 || cards.length > 5}
        className="w-full"
      >
        {isReady
          ? 'Unlock roster to edit'
          : `Lock roster (${cards.length} cards)`}
      </Button>
    </div>
  );
}

function OpponentRosterCard({
  card,
  index,
}: { card: NFTReference; index: number }) {
  const nft = useQuery(api.nft.getNFTMetadata, card);
  const meta = getNFTMetadata(nft?.itemMetadata);
  const image = getIpfsImageUrl(meta);
  return (
    <article
      className="roster-reveal-card rounded-lg border border-border p-2"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      {image ? (
        <img
          src={image}
          alt=""
          className="w-full aspect-square object-contain rounded"
        />
      ) : (
        <div className="w-full aspect-square flex items-center justify-center bg-muted rounded">
          No artwork
        </div>
      )}
      <b className="block text-sm truncate">
        {meta?.name || `NFT #${card.item}`}
      </b>
      <small className="text-muted-foreground">
        {nft?.stats
          ? `${getNFTTypeName(nft.stats.nftType)} · HP ${nft.stats.maxHealth} · ATK ${nft.stats.attack} · DEF ${nft.stats.defense} · SPD ${nft.stats.speed} · STR ${nft.stats.strength} · INT ${nft.stats.intelligence} · LCK ${nft.stats.luck}`
          : 'Loading stats…'}
      </small>
    </article>
  );
}

export function OpponentRoster({
  cards,
  revealed,
}: { cards: NFTReference[]; revealed: boolean }) {
  if (!revealed)
    return (
      <p className="py-6 text-center text-muted-foreground">
        Opponent roster reveals after both players lock their choices.
      </p>
    );
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {cards.map((card, index) => (
        <OpponentRosterCard
          key={`${card.collection}:${card.item}`}
          card={card}
          index={index}
        />
      ))}
    </div>
  );
}
