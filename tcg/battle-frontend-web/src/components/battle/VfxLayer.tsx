'use client';

import { useEffect, type CSSProperties } from 'react';
import type { ActiveEffect, CardPosition } from '@/battle/types';

export default function VfxLayer({
  effects,
  positions,
  onExpire,
  reducedMotion,
}: {
  effects: ActiveEffect[];
  positions: Record<string, CardPosition>;
  onExpire: (id: string) => void;
  reducedMotion: boolean;
}) {
  useEffect(() => {
    const timers = effects.map((effect) =>
      window.setTimeout(
        () => onExpire(effect.id),
        reducedMotion ? 40 : (effect.durationMs ?? 980),
      ),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [effects, onExpire, reducedMotion]);

  return (
    <div className="vfx-layer" aria-hidden="true">
      {effects.map((effect) => {
        const target = positions[effect.targetId] ?? {
          x: 50,
          y: 50,
          scale: 1,
          rotation: 0,
        };
        const source = positions[effect.sourceId] ?? {
          x: 50,
          y: 50,
          scale: 1,
          rotation: 0,
        };
        return (
          <div
            key={effect.id}
            className={`battle-vfx vfx-${effect.effectId.replaceAll('.', '-')}`}
            style={
              {
                left: `${target.x}%`,
                top: `${target.y}%`,
                '--beam-angle': `${Math.atan2(target.y - source.y, target.x - source.x) * (180 / Math.PI)}deg`,
                '--beam-length': `${Math.hypot(target.x - source.x, target.y - source.y) * 1.5}vw`,
              } as CSSProperties
            }
          >
            {effect.effectId === 'attack.fire.large' ? (
              <>
                <span className="fire-burst-halo" />
                <span className="fire-burst-core" />
                <span className="fire-burst-ring" />
                {Array.from({ length: 9 }, (_, index) => (
                  <i
                    className="fire-burst-flare"
                    key={index}
                    style={
                      {
                        '--flare-angle': `${index * 40}deg`,
                        '--flare-delay': `${index * 17}ms`,
                      } as CSSProperties
                    }
                  />
                ))}
                <span className="vfx-star vfx-star-one">✦</span>
                <span className="vfx-star vfx-star-two">✧</span>
                <span className="vfx-star vfx-star-three">✦</span>
              </>
            ) : effect.effectId === 'attack.energy-discard' ? (
              <span className="discarded-energy-pips">
                <i>✦</i>
                <i>✦</i>
              </span>
            ) : effect.effectId === 'damage.reveal' ? (
              <span className="vfx-hit-label">250</span>
            ) : (
              <>
                <span className="vfx-beam" />
                <span className="vfx-ring vfx-ring-outer" />
                <span className="vfx-ring vfx-ring-inner" />
                <span className="vfx-star vfx-star-one">✦</span>
                <span className="vfx-star vfx-star-two">✧</span>
                <span className="vfx-star vfx-star-three">✦</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
