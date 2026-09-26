'use client';
import { LayoutGroup } from 'motion/react';
import MediaBetweenText from '@/components/fancy/media-between-text';
import TextRotate from '@/components/fancy/text-rotate';
import ImageTrail from '@/components/fancy/image-trail';
import useScreenSize from '@/hooks/use-screen-size';

const heroTrailImages = Array.from(
  { length: 10 },
  (_, i) => `/hero-trail/${(i + 1).toString().padStart(2, '0')}.png`,
);

export default function TrailSection() {
  const screenSize = useScreenSize();

  return (
    <section
      id="trail"
      className="min-h-screen bg-background relative overflow-hidden"
    >
      <ImageTrail
        className="absolute inset-0 z-30"
        threshold={80}
        keyframes={{ opacity: [0, 1, 1, 0], scale: [1, 1, 2] }}
        keyframesOptions={{
          opacity: { duration: 2, times: [0, 0.001, 0.9, 1] },
          scale: { duration: 2, times: [0, 0.8, 1] },
        }}
        imagePool={heroTrailImages}
        maxActiveItems={3}
      />

      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="relative">
          <LayoutGroup>
            <MediaBetweenText
              firstText="LET'S"
              secondText={
                <TextRotate
                  texts={[
                    'BATTLE!',
                    'FIGHT!',
                    'PLAY!',
                    'DUEL!',
                    'CLASH!',
                    'WIN!',
                  ]}
                  mainClassName="text-white px-8 sm:px-12 md:px-16 bg-[#1e7a44] overflow-hidden py-4 sm:py-6 md:py-8 justify-center rounded-[48px] sm:rounded-[56px] uppercase tracking-tight"
                  staggerFrom="last"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '-120%' }}
                  staggerDuration={0.025}
                  splitLevelClassName="overflow-hidden"
                  transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                  rotationInterval={2500}
                />
              }
              mediaUrl="/hero-trail/betweentext.png"
              mediaType="image"
              triggerType="inView"
              useInViewOptionsProp={{
                once: false,
                amount: 0.3,
                // the -40% controls how far down the user has to scroll to trigger the animation
                margin: '0px 0px -40% 0px',
              }}
              mediaContainerClassName="w-full overflow-hidden mx-2 sm:mx-4 my-6 sm:my-8 rounded-3xl"
              className="text-6xl sm:text-7xl md:text-7xl lg:text-8xl font-bold flex flex-col items-center justify-center text-white uppercase tracking-tight"
              leftTextClassName=""
              rightTextClassName=""
              animationVariants={{
                initial: {
                  width: 0,
                  height: 0,
                  transition: {
                    duration: 0.7,
                    ease: [0.944, 0.008, 0.147, 1.002],
                  },
                },
                animate: {
                  width: screenSize.lessThan('sm')
                    ? '300px'
                    : screenSize.lessThan('lg')
                      ? '400px'
                      : '500px',
                  height: screenSize.lessThan('sm')
                    ? '300px'
                    : screenSize.lessThan('lg')
                      ? '400px'
                      : '500px',
                  transition: {
                    duration: 0.7,
                    ease: [0.944, 0.008, 0.147, 1.002],
                  },
                },
              }}
            />
          </LayoutGroup>
        </div>
      </div>
    </section>
  );
}
