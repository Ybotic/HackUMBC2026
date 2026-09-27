'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { BattleCard as BattleCardData, CardPosition } from './types';

type BattleCardProps = {
  card: BattleCardData;
  position: CardPosition;
  selected: boolean;
  displayDamage?: number | null;
  displayEnergy?: number;
  knockedOutPresentation?: boolean;
  targetable?: boolean;
  disabled?: boolean;
  impact?: boolean;
  onSelect: (card: BattleCardData) => void;
  onReady?: (cardId: string, node: HTMLButtonElement | null) => void;
};

export default function BattleCard({
  card,
  position,
  selected,
  displayDamage,
  displayEnergy,
  knockedOutPresentation = false,
  targetable = false,
  disabled = false,
  impact = false,
  onSelect,
  onReady,
}: BattleCardProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    onReady?.(card.id, buttonRef.current);
    return () => onReady?.(card.id, null);
  }, [card.id, onReady]);

  const positionStyle = {
    left: `${position.x}%`,
    top: `${position.y}%`,
    '--piece-scale': position.scale,
    '--piece-rotation': `${position.rotation}deg`,
  } as CSSProperties;

  const isOnHand = card.zone === 'hand';
  const hpDamage =
    displayDamage === undefined ? (card.damage ?? 0) : (displayDamage ?? 0);
  const remainingHp = Math.max(0, (card.hp ?? 0) - hpDamage);
  const damage =
    displayDamage === undefined ? (card.damage ?? 0) : displayDamage;
  const attachedEnergy = displayEnergy ?? card.energyAttached ?? 0;
  const categoryLabel =
    card.cardType === 'move'
      ? 'BATTLE MOVE'
      : card.cardType === 'supporter'
        ? 'SUPPORTER'
        : card.cardType === 'tool'
          ? 'POKÉMON TOOL'
          : card.cardType === 'stadium'
            ? 'STADIUM'
            : card.cardType === 'item'
              ? 'ITEM'
              : card.category === 'creature'
                ? 'POKÉMON'
                : card.category === 'trainer'
                  ? 'TRAINER'
                  : 'ENERGY';

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`card-piece ${isOnHand ? 'is-in-hand' : 'is-on-board'} ${selected ? 'is-selected' : ''} ${knockedOutPresentation ? 'is-knocked-out' : ''} ${targetable ? 'is-targetable' : ''} ${impact ? 'is-impact' : ''}`}
      style={positionStyle}
      data-card-id={card.id}
      data-zone={card.zone}
      aria-label={`${card.name}${card.hp ? `, ${remainingHp} health` : ''}${isOnHand ? ', in hand' : ''}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect(card)}
    >
      <span
        className={`card-face element-${card.element} category-${card.category}`}
      >
        <span className="card-topline">
          <span className="card-category">{categoryLabel}</span>
          {card.hp ? (
            <span className="card-hp">
              <span>{remainingHp}</span>
              <span className="hp-orb">{elementGlyph[card.element]}</span>
            </span>
          ) : null}
        </span>
        <span
          className={`card-illustration art-${card.element}`}
          aria-hidden="true"
        >
          {card.image && !imageFailed ? (
            <img
              className="card-art-image"
              src={card.image}
              alt=""
              onError={() => setImageFailed(true)}
            />
          ) : (
            <>
              <span className="art-sun" />
              <span className="art-rings" />
              <span className="art-shape art-shape-back" />
              <span className="art-shape art-shape-front">{card.symbol}</span>
              <span className="art-spark art-spark-one">✦</span>
              <span className="art-spark art-spark-two">✧</span>
              <span className="art-caption">
                EMBER ARENA · {card.element.toUpperCase()}
              </span>
            </>
          )}
        </span>
        <span className="card-nameplate">
          <span className="card-name">{card.name}</span>
          <span className="card-subtitle">{card.subtitle}</span>
        </span>
        <span className="card-ruletext">{card.ruleText}</span>
        {card.attack ? (
          <span className="card-attack">
            <span className="energy-pips" aria-hidden="true">
              {Array.from(
                { length: Math.max(1, card.attackDamage ? 2 : 1) },
                (_, index) => (
                  <i key={index}>{elementGlyph[card.element]}</i>
                ),
              )}
            </span>
            <span className="attack-name">{card.attack}</span>
            <b>{card.attackDamage}</b>
          </span>
        ) : null}
        <span className="card-footer">
          <span>EMBER ARENA</span>
          <span>
            {card.category === 'creature'
              ? 'NO. 014'
              : card.cardType === 'move'
                ? 'MOVE'
                : card.category === 'trainer'
                  ? 'ITEM'
                  : 'BASIC'}
          </span>
        </span>
        {damage !== null && damage > 0 ? (
          <span className="damage-counter" aria-label={`${damage} damage`}>
            <b>{damage}</b>
            <small>DMG</small>
          </span>
        ) : null}
        {card.status ? (
          <span className={`status-marker status-${card.status}`}>
            {card.status}
          </span>
        ) : null}
        {attachedEnergy > 0 || card.toolAttached ? (
          <span
            className="card-attachments"
            aria-label={`${attachedEnergy} attached Fire Energy${card.toolAttached ? ' and Pokémon Tool' : ''}`}
          >
            {Array.from({ length: attachedEnergy }, (_, index) => (
              <i className="attachment-energy" key={`energy-${index}`}>
                ✦
              </i>
            ))}
            {card.toolAttached ? (
              <i className="attachment-tool" title="Pokémon Tool">
                ◇
              </i>
            ) : null}
          </span>
        ) : null}
      </span>
    </button>
  );
}

const elementGlyph: Record<BattleCardData['element'], string> = {
  solar: '☼',
  flame: '✦',
  tide: '◉',
  grove: '❋',
  stone: '⬡',
  neutral: '◇',
};
