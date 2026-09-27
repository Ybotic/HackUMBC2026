'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getIpfsImageUrl, getNFTMetadata } from '@/lib/utils';
import { getNFTTypeName } from '@/lib/battle-utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type RosterCard = {
  collection: string;
  item: string;
  stats: {
    maxHealth: number;
    attack: number;
    defense: number;
    speed: number;
    strength: number;
    intelligence: number;
    luck: number;
    nftType: number;
  };
};

function RosterTile({
  card,
  metadata,
  selected,
  active,
  onClick,
}: {
  card: RosterCard;
  metadata: unknown;
  selected?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  const meta = getNFTMetadata(metadata);
  const image = getIpfsImageUrl(meta);
  const contents = (
    <>
      {image ? (
        <img
          src={image}
          alt=""
          className="w-full aspect-square object-contain rounded"
        />
      ) : (
        <div className="w-full aspect-square rounded bg-muted flex items-center justify-center">
          No artwork
        </div>
      )}
      <b className="block truncate">{meta?.name || `NFT #${card.item}`}</b>
      <small className="block text-muted-foreground">
        {getNFTTypeName(card.stats.nftType)} · HP {card.stats.maxHealth}
      </small>
      <small className="block text-muted-foreground">
        ATK {card.stats.attack} · DEF {card.stats.defense} · SPD{' '}
        {card.stats.speed} · STR {card.stats.strength} · INT{' '}
        {card.stats.intelligence} · LCK {card.stats.luck}
      </small>
      {active && (
        <strong className="text-xs text-primary">Starting active card</strong>
      )}
    </>
  );
  const classes = `rounded-xl border-2 p-3 text-left w-full ${selected ? 'border-primary' : 'border-border'} focus-visible:outline-2 focus-visible:outline-primary`;
  return onClick ? (
    <button
      type="button"
      aria-pressed={selected}
      className={classes}
      onClick={onClick}
    >
      {contents}
    </button>
  ) : (
    <div className={classes}>{contents}</div>
  );
}

export function BattleLineupSetup({
  battleId,
  address,
  roster,
  rosterData,
  opponentRoster,
  opponentData,
  locked,
}: {
  battleId: string;
  address: string;
  roster: RosterCard[];
  rosterData?: Array<{ itemMetadata: unknown } | null>;
  opponentRoster: RosterCard[];
  opponentData?: Array<{ itemMetadata: unknown } | null>;
  locked: boolean;
}) {
  const confirm = useMutation(api.battle.confirmLineup);
  const [lineup, setLineup] = useState<number[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (lineup.length !== 3 || activeIndex === null || busy) return;
    setBusy(true);
    try {
      await confirm({ battleId, playerAddress: address, lineup, activeIndex });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not lock lineup',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Choose your three fighters</h1>
          <p className="text-muted-foreground">
            Review your opponent's roster, select exactly three of your own
            cards, then choose a starting active card.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border p-5 space-y-4">
            <h2 className="text-xl font-semibold">
              Your roster ·{' '}
              {locked ? 'Lineup locked' : `${lineup.length}/3 selected`}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {roster.map((card, index) => (
                <RosterTile
                  key={`${card.collection}:${card.item}`}
                  card={card}
                  metadata={rosterData?.[index]?.itemMetadata}
                  selected={locked ? undefined : lineup.includes(index)}
                  active={activeIndex === index}
                  onClick={
                    locked
                      ? undefined
                      : () => {
                          if (lineup.includes(index)) {
                            setLineup((current) =>
                              current.filter((value) => value !== index),
                            );
                            if (activeIndex === index) setActiveIndex(null);
                          } else if (lineup.length < 3)
                            setLineup((current) => [...current, index]);
                        }
                  }
                />
              ))}
            </div>
            {!locked && (
              <>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm">Starting card:</span>
                  {lineup.map((index) => (
                    <Button
                      key={index}
                      type="button"
                      variant={activeIndex === index ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveIndex(index)}
                    >
                      {getNFTMetadata(rosterData?.[index]?.itemMetadata)
                        ?.name || `NFT #${roster[index].item}`}
                    </Button>
                  ))}
                </div>
                <Button
                  onClick={() => void submit()}
                  disabled={lineup.length !== 3 || activeIndex === null || busy}
                >
                  Lock three-card lineup
                </Button>
              </>
            )}
            {locked && (
              <p role="status">
                Your lineup is locked. Waiting for your opponent to confirm
                theirs.
              </p>
            )}
          </section>
          <section className="rounded-xl border p-5 space-y-4">
            <h2 className="text-xl font-semibold">Opponent roster</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {opponentRoster.map((card, index) => (
                <RosterTile
                  key={`${card.collection}:${card.item}`}
                  card={card}
                  metadata={opponentData?.[index]?.itemMetadata}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
