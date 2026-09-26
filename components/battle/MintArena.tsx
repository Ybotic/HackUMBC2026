'use client';

import { useState } from 'react';
import { ImageOff, X } from 'lucide-react';
import { getNFTTypeName } from '@/lib/battle-utils';
import './mint-arena.css';

export type ArenaFighter = {
  name: string;
  image?: string | null;
  type: number;
  health?: number;
  maxHealth?: number;
  owner: string;
  description?: string;
};

function FighterCard({
  fighter,
  side,
  impact,
}: {
  fighter?: ArenaFighter;
  side: 'you' | 'opponent';
  impact?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const type = fighter ? getNFTTypeName(fighter.type) : 'Unassigned';
  const health = fighter?.health;
  const maxHealth = fighter?.maxHealth;
  const percent =
    health !== undefined && maxHealth
      ? Math.max(0, Math.min(100, (health / maxHealth) * 100))
      : 0;

  return (
    <div
      className={`mint-fighter mint-fighter-${side} ${impact ? 'mint-impact' : ''}`}
    >
      <span className="mint-fighter-tag">
        {side === 'you' ? 'YOUR CARD' : 'OPPONENT CARD'}
      </span>
      {fighter ? (
        <>
          <button
            className={`mint-card mint-card-${type.toLowerCase()}`}
            type="button"
            onClick={() => setInspecting(true)}
            aria-label={`Inspect ${fighter.name}`}
          >
            <span className="mint-card-top">
              <span>{type.toUpperCase()} / MINT ORIGINAL</span>
              <span>✦</span>
            </span>
            <span className="mint-card-art">
              {fighter.image && !imageFailed ? (
                <img
                  src={fighter.image}
                  alt=""
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <span className="mint-card-fallback">
                  <ImageOff size={32} />
                  <small>ART UNAVAILABLE</small>
                </span>
              )}
            </span>
            <span className="mint-card-name">{fighter.name}</span>
            <span className="mint-card-foot">
              <span>{fighter.owner}</span>
              <span>
                {health !== undefined && maxHealth !== undefined
                  ? `${health} / ${maxHealth} HP`
                  : type}
              </span>
            </span>
          </button>
          {health !== undefined && maxHealth !== undefined && (
            <div
              className="mint-health"
              aria-label={`${fighter.name}: ${health} of ${maxHealth} health`}
            >
              <div className="mint-health-label">
                <span>INTEGRITY</span>
                <strong>
                  {health} <small>/ {maxHealth} HP</small>
                </strong>
              </div>
              <div className="mint-health-track">
                <span style={{ width: `${percent}%` }} />
              </div>
            </div>
          )}
          {inspecting && (
            <div className="mint-inspect-backdrop">
              <button
                className="mint-inspect-overlay"
                type="button"
                onClick={() => setInspecting(false)}
                aria-label="Close card details"
              />
              <section
                className="mint-inspect"
                role="dialog"
                aria-modal="true"
                aria-label={`${fighter.name} details`}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setInspecting(false);
                }}
              >
                <button
                  autoFocus
                  className="mint-inspect-close"
                  type="button"
                  onClick={() => setInspecting(false)}
                  aria-label="Close card details"
                >
                  <X size={20} />
                </button>
                <span className="mint-overline">
                  CARD DETAIL / {type.toUpperCase()}
                </span>
                <h2>{fighter.name}</h2>
                <p>
                  {fighter.description ||
                    'An original card from the Mint collection.'}
                </p>
                {health !== undefined && (
                  <p>
                    {health} / {maxHealth} HP remaining
                  </p>
                )}
                <button
                  className="mint-text-button"
                  type="button"
                  onClick={() => setInspecting(false)}
                >
                  Back to arena
                </button>
              </section>
            </div>
          )}
        </>
      ) : (
        <div
          className="mint-empty-card"
          aria-label={`${side === 'you' ? 'Your' : 'Opponent'} card slot is empty`}
        >
          <span>✦</span>
          <strong>
            {side === 'you' ? 'YOUR NEXT CARD' : 'AWAITING RIVAL'}
          </strong>
          <small>
            {side === 'you'
              ? 'Mint a card to enter the arena'
              : 'The opponent appears when a match begins'}
          </small>
        </div>
      )}
    </div>
  );
}

export function MintArena({
  you,
  opponent,
  turnLabel,
  impactSide,
  children,
  compact = false,
}: {
  you?: ArenaFighter;
  opponent?: ArenaFighter;
  turnLabel: string;
  impactSide?: 'you' | 'opponent' | null;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={`mint-arena ${compact ? 'mint-arena-compact' : ''}`}
      aria-label="Mint card battle arena"
    >
      <div className="mint-arena-grid" aria-hidden="true" />
      <div className="mint-arena-center" aria-hidden="true">
        ✦
      </div>
      <div className="mint-arena-top">
        <span>01 / OPPONENT</span>
        <span>MINT · ARENA</span>
      </div>
      <FighterCard
        key={`opponent-${opponent?.image ?? opponent?.name}`}
        fighter={opponent}
        side="opponent"
        impact={impactSide === 'opponent'}
      />
      <div className="mint-arena-divider">
        <i />
        <span>{turnLabel}</span>
        <i />
      </div>
      <FighterCard
        key={`you-${you?.image ?? you?.name}`}
        fighter={you}
        side="you"
        impact={impactSide === 'you'}
      />
      <div className="mint-arena-bottom">
        <span>02 / YOU</span>
        <span>ONE CARD. ONE CHAMPION.</span>
      </div>
      {children}
    </section>
  );
}
