'use client';

import { useEffect } from 'react';
import { motion, stagger, useAnimate } from 'motion/react';
import Floating, {
  FloatingElement,
} from '@/components/fancy/parallax-floating';
import useScreenSize from '@/hooks/use-screen-size';

const heroImages = [7, 2, 10, 4, 1, 9, 5, 11, 3, 8, 6].map(
  (imageNumber) => `/hero-parallax/float${imageNumber}.png`,
);

export default function HeroSection() {
  const [scope, animate] = useAnimate();
  const screenSize = useScreenSize();

  useEffect(() => {
    animate(
      'img',
      { opacity: [0, 1] },
      { duration: 0.5, delay: stagger(0.15) },
    );
  }, [animate]);

  const scrollToNext = () => {
    const nextSection = document.getElementById('about');
    if (nextSection) {
      const targetPosition = nextSection.offsetTop;
      const startPosition = window.pageYOffset;
      const distance = targetPosition - startPosition;
      const duration = 1200;
      let start: number | null = null;

      function step(timestamp: number) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const progressRatio = Math.min(progress / duration, 1);

        const easeInOutCubic = (t: number) =>
          t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

        const easedProgress = easeInOutCubic(progressRatio);
        window.scrollTo(0, startPosition + distance * easedProgress);

        if (progress < duration) {
          requestAnimationFrame(step);
        }
      }

      requestAnimationFrame(step);
    }
  };

  return (
    <div
      className="relative min-h-screen bg-background overflow-hidden"
      ref={scope}
    >
      <motion.div
        className="absolute top-[35vh] md:top-[30vh] left-1/2 -translate-x-1/2 w-full z-[1] xl:z-0"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.88, delay: 0.5 }}
      >
        <h1 className="font-garamond text-[7rem] md:text-[15rem] text-white uppercase tracking-tighter text-center leading-[0.8] px-4 md:px-0">
          from jpeg
          <br />
          to k.o.
        </h1>
      </motion.div>

      <Floating
        sensitivity={screenSize.lessThan('md') ? -0.5 : -1}
        className="overflow-hidden"
      >
        {/* Left Column */}
        <FloatingElement depth={2} className="top-[8%] left-[5%] md:left-[11%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={heroImages[0]}
            className="w-20 sm:w-32 md:w-48 aspect-square object-cover hover:scale-105 duration-200 cursor-pointer transition-transform rounded-sm"
            alt="NFT artwork"
          />
        </FloatingElement>
        <FloatingElement depth={1} className="top-[40%] left-[2%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={heroImages[1]}
            className="w-16 sm:w-28 md:w-40 aspect-square object-cover hover:scale-105 duration-200 cursor-pointer transition-transform rounded-sm"
            alt="NFT artwork"
          />
        </FloatingElement>
        <FloatingElement
          depth={4}
          className="top-[73%] left-[8%] md:left-[15%]"
        >
          <motion.img
            initial={{ opacity: 0 }}
            src={heroImages[2]}
            className="w-24 sm:w-40 md:w-52 aspect-[3/4] object-cover hover:scale-105 duration-200 cursor-pointer transition-transform rounded-sm"
            alt="NFT artwork"
          />
        </FloatingElement>

        {/* Center Column */}
        <FloatingElement depth={2} className="top-[5%] left-[40%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={heroImages[3]}
            className="w-20 sm:w-36 md:w-44 aspect-square object-cover hover:scale-105 duration-200 cursor-pointer transition-transform rounded-sm"
            alt="NFT artwork"
          />
        </FloatingElement>
        <FloatingElement depth={1} className="top-[23%] left-[35%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={heroImages[4]}
            className="w-16 sm:w-24 md:w-32 aspect-square object-cover hover:scale-105 duration-200 cursor-pointer transition-transform rounded-sm"
            alt="NFT artwork"
          />
        </FloatingElement>
        <FloatingElement depth={3} className="top-[80%] left-[50%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={heroImages[5]}
            className="w-20 sm:w-32 md:w-40 aspect-square object-cover hover:scale-105 duration-200 cursor-pointer transition-transform rounded-sm"
            alt="NFT artwork"
          />
        </FloatingElement>

        {/* Right Column */}
        <FloatingElement
          depth={2}
          className="top-[2%] left-[70%] md:left-[75%]"
        >
          <motion.img
            initial={{ opacity: 0 }}
            src={heroImages[6]}
            className="w-20 sm:w-36 md:w-48 aspect-[3/4] object-cover hover:scale-105 duration-200 cursor-pointer transition-transform rounded-sm"
            alt="NFT artwork"
          />
        </FloatingElement>
        <FloatingElement
          depth={1}
          className="top-[35%] left-[80%] md:left-[85%]"
        >
          <motion.img
            initial={{ opacity: 0 }}
            src={heroImages[7]}
            className="w-20 sm:w-32 md:w-40 aspect-square object-cover hover:scale-105 duration-200 cursor-pointer transition-transform rounded-sm"
            alt="NFT artwork"
          />
        </FloatingElement>
        <FloatingElement
          depth={3}
          className="top-[60%] left-[75%] md:left-[80%]"
        >
          <motion.img
            initial={{ opacity: 0 }}
            src={heroImages[8]}
            className="w-16 sm:w-28 md:w-36 aspect-square object-cover hover:scale-105 duration-200 cursor-pointer transition-transform rounded-sm"
            alt="NFT artwork"
          />
        </FloatingElement>

        {/* Additional Images */}
        <FloatingElement depth={2} className="top-[15%] left-[60%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={heroImages[9]}
            className="w-16 sm:w-24 md:w-32 aspect-square object-cover hover:scale-105 duration-200 cursor-pointer transition-transform rounded-sm"
            alt="NFT artwork"
          />
        </FloatingElement>
        <FloatingElement depth={1} className="top-[65%] left-[30%]">
          <motion.img
            initial={{ opacity: 0 }}
            src={heroImages[10]}
            className="w-16 sm:w-28 md:w-36 aspect-square object-cover hover:scale-105 duration-200 cursor-pointer transition-transform rounded-sm"
            alt="NFT artwork"
          />
        </FloatingElement>
      </Floating>

      <motion.button
        type="button"
        className="absolute bottom-40 md:bottom-10 left-1/2 -translate-x-1/2 w-40 md:w-52 h-[40px] md:h-[51px] bg-[#1f1f1f] border border-white/10 rounded-full flex items-center justify-center z-50 cursor-pointer transition-all duration-200"
        onClick={scrollToNext}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.5 }}
      >
        <motion.span
          className="text-white uppercase tracking-tight text-lg md:text-base"
          whileHover={{ color: '#ffffff' }}
        >
          check it out
        </motion.span>
      </motion.button>
    </div>
  );
}
