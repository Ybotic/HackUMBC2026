'use client';

import React, {
  type ElementType,
  type HTMLAttributes,
  useEffect,
  useMemo,
} from 'react';
import type { DOMKeyframesDefinition, AnimationOptions } from 'motion';
import { useAnimate } from 'motion/react';

import { cn } from '@/lib/utils';

interface ImageTrailProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The content to be displayed
   */
  children?: React.ReactNode;

  /**
   * HTML Tag
   */
  as?: ElementType;

  /**
   * How much distance in pixels the mouse has to travel to trigger of an element to appear.
   */
  threshold?: number;

  /**
   * The intensity for the momentum movement after showing the element. The value will be clamped > 0 and <= 1.0. Defaults to 0.3.
   */
  intensity?: number;

  /**
   * Animation Keyframes for defining the animation sequence. Example: { scale: [0, 1, 1, 0] }
   */
  keyframes?: DOMKeyframesDefinition;

  /**
   * Options for the animation/keyframes. Example: { duration: 1, times: [0, 0.1, 0.9, 1] }
   */
  keyframesOptions?: AnimationOptions;

  /**
   * Animation keyframes for the x and y positions after showing the element. Describes how the element should try to arrive at the mouse position.
   */
  trailElementAnimationKeyframes?: {
    x?: AnimationOptions;
    y?: AnimationOptions;
  };

  /**
   * The number of times the children will be repeated. Defaults to 3.
   */
  repeatChildren?: number;

  /**
   * The base zIndex for all elements. Defaults to 0.
   */
  baseZIndex?: number;

  /**
   * Controls stacking order behavior.
   * - "new-on-top": newer elements stack above older ones (default)
   * - "old-on-top": older elements stay visually on top
   */
  zIndexDirection?: 'new-on-top' | 'old-on-top';

  /**
   * Pool of image URLs to cycle through. If provided, will override children images.
   */
  imagePool?: string[];

  /**
   * Maximum number of active trail items. If provided with imagePool, limits active items.
   */
  maxActiveItems?: number;
}

interface ImageTrailItemProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * HTML Tag
   */
  as?: ElementType;

  /**
   * The content to be displayed
   */
  children: React.ReactNode;
}

/**
 * Helper functions
 */
const MathUtils = {
  // linear interpolation
  lerp: (a: number, b: number, n: number) => (1 - n) * a + n * b,
  // distance between two points
  distance: (x1: number, y1: number, x2: number, y2: number) =>
    Math.hypot(x2 - x1, y2 - y1),
};

const ImageTrail = ({
  className,
  as = 'div',
  children,
  threshold = 100,
  intensity = 0.3,
  keyframes,
  keyframesOptions,
  repeatChildren = 3,
  trailElementAnimationKeyframes = {
    x: { duration: 1, type: 'tween', ease: 'easeOut' },
    y: { duration: 1, type: 'tween', ease: 'easeOut' },
  },
  baseZIndex = 0,
  zIndexDirection = 'new-on-top',
  imagePool,
  maxActiveItems,
  ...props
}: ImageTrailProps) => {
  const allImages = React.useRef<NodeListOf<HTMLElement> | null>(null);
  const currentId = React.useRef(0);
  const imagePoolIndex = React.useRef(0);
  const lastMousePos = React.useRef({ x: 0, y: 0 });
  const cachedMousePos = React.useRef({ x: 0, y: 0 });
  const [containerRef, animate] = useAnimate();
  const zIndices = React.useRef<number[]>([]);

  const clampedIntensity = useMemo(
    () => Math.max(0.0001, Math.min(1, intensity)),
    [intensity],
  );

  const effectiveRepeatChildren =
    imagePool && maxActiveItems ? maxActiveItems : repeatChildren;

  useEffect(() => {
    allImages.current = containerRef?.current?.querySelectorAll(
      '.image-trail-item',
    ) as NodeListOf<HTMLElement>;

    zIndices.current = Array.from(
      { length: allImages.current.length },
      (_, index) => index,
    );
  }, [containerRef, allImages]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const containerRect = containerRef?.current?.getBoundingClientRect();
    const mousePos = {
      x: e.clientX - (containerRect?.left || 0),
      y: e.clientY - (containerRect?.top || 0),
    };

    cachedMousePos.current.x = MathUtils.lerp(
      cachedMousePos.current.x || mousePos.x,
      mousePos.x,
      clampedIntensity,
    );

    cachedMousePos.current.y = MathUtils.lerp(
      cachedMousePos.current.y || mousePos.y,
      mousePos.y,
      clampedIntensity,
    );

    const distance = MathUtils.distance(
      mousePos.x,
      mousePos.y,
      lastMousePos.current.x,
      lastMousePos.current.y,
    );

    if (distance > threshold && allImages?.current) {
      const N = allImages.current.length;
      const current = currentId.current;

      // If using image pool, update the image source
      if (imagePool && imagePool.length > 0) {
        const img = allImages.current[current].querySelector('img');
        if (img) {
          img.src = imagePool[imagePoolIndex.current % imagePool.length];
          imagePoolIndex.current =
            (imagePoolIndex.current + 1) % imagePool.length;
        }
      }

      if (zIndexDirection === 'new-on-top') {
        // Shift others down, put current on top
        for (let i = 0; i < N; i++) {
          if (i !== current) {
            zIndices.current[i] -= 1;
          }
        }
        zIndices.current[current] = N - 1;
      } else {
        // Shift others up, put current at bottom
        for (let i = 0; i < N; i++) {
          if (i !== current) {
            zIndices.current[i] += 1;
          }
        }
        zIndices.current[current] = 0;
      }

      allImages.current[current].style.display = 'block';
      allImages.current.forEach((img, index) => {
        img.style.zIndex = String(zIndices.current[index] + baseZIndex);
      });

      animate(
        allImages.current[currentId.current],
        {
          x: [
            cachedMousePos.current.x -
              allImages.current[currentId.current].offsetWidth / 2,
            mousePos.x - allImages.current[currentId.current].offsetWidth / 2,
          ],
          y: [
            cachedMousePos.current.y -
              allImages.current[currentId.current].offsetHeight / 2,
            mousePos.y -
              allImages.current?.[currentId.current].offsetHeight / 2,
          ],
          ...keyframes,
        },
        {
          ...trailElementAnimationKeyframes.x,
          ...trailElementAnimationKeyframes.y,
          ...keyframesOptions,
        },
      );
      currentId.current = (current + 1) % N;
      lastMousePos.current = { x: mousePos.x, y: mousePos.y };
    }
  };

  const ElementTag = as ?? 'div';

  return (
    <ElementTag
      className={cn('h-full w-full relative', className)}
      onMouseMove={handleMouseMove}
      ref={containerRef}
      {...props}
    >
      {imagePool && maxActiveItems
        ? Array.from({ length: maxActiveItems }).map((_, index) => (
            <div
              key={index}
              className="absolute top-0 left-0 will-change-transform hidden image-trail-item"
            >
              <div className="w-40 h-30 sm:w-48 sm:h-36 md:w-60 md:h-45 relative overflow-hidden rounded-2xl shadow-lg">
                <img
                  src={imagePool[0]}
                  alt={`Trail item ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ))
        : Array.from({ length: effectiveRepeatChildren }).map((_, index) => (
            <React.Fragment key={index}>{children}</React.Fragment>
          ))}
    </ElementTag>
  );
};

export const ImageTrailItem = ({
  className,
  children,
  as = 'div',
  ...props
}: ImageTrailItemProps) => {
  const ElementTag = as ?? 'div';
  return (
    <ElementTag
      {...props}
      className={cn(
        'absolute top-0 left-0 will-change-transform hidden',
        className,
        'image-trail-item',
      )}
    >
      {children}
    </ElementTag>
  );
};

export default ImageTrail;
