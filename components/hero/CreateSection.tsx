'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { useMousePosition } from '@/hooks/use-mouse-position';
import PixelateSvgFilter from '@/components/fancy/pixelate-svg-filter';
import { motion } from 'motion/react';
import UnderlineToBackground from '@/components/fancy/underline-to-background';
import Link from 'next/link';

export default function CreateSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosition = useMousePosition(containerRef);
  const pixelSize = Math.min(Math.max(mousePosition.x / 100, 1), 30);

  return (
    <section
      id="create"
      className="min-h-screen bg-background relative"
      ref={containerRef}
    >
      <div className="h-screen relative flex items-center justify-center overflow-hidden">
        <div className="flex flex-col justify-center mx-auto">
          <div className="flex items-center flex-wrap md:flex-nowrap">
            <p className="text-6xl sm:text-7xl md:text-9xl lg:text-[15rem] font-bold text-white leading-none tracking-[-0.1rem] lg:tracking-[-0.8rem]">
              CREATE
            </p>
            <PixelateSvgFilter
              id="pixelate-filter"
              size={pixelSize}
              crossLayers
            />
            <div
              className="relative ml-2 sm:ml-4 md:ml-8 -translate-y-0 md:-translate-y-6 mt-2 md:mt-0"
              style={{ filter: 'url(#pixelate-filter)' }}
            >
              <Image
                src="/hero-create/01.png"
                alt="Colorful NFT character"
                width={300}
                height={300}
                style={{ height: 'auto' }}
                className="w-24 h-24 sm:w-40 sm:h-40 md:w-60 md:h-60 lg:w-[300px] lg:h-[300px]"
              />
            </div>
          </div>
          <p className="text-6xl sm:text-7xl md:text-9xl lg:text-[15rem] font-bold text-white leading-none mt-0 md:-mt-4 lg:-mt-9 tracking-[-0.1rem] lg:tracking-[-0.8rem]">
            YOUR OWN
          </p>
          <div className="flex items-center flex-wrap md:flex-nowrap">
            <motion.div
              className="text-6xl sm:text-7xl md:text-9xl lg:text-[15rem] font-bold leading-none mt-0 md:-mt-4 lg:-mt-9 tracking-[-0.1rem] lg:tracking-[-0.8rem]"
              whileHover="target"
            >
              <Link href="/generate">
                <UnderlineToBackground
                  label="NFTs"
                  targetTextColor="#ffffff"
                  className="text-[#22ff88] cursor-pointer inline-block pr-4"
                  underlineHeightRatio={0}
                  underlinePaddingRatio={0}
                  transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                />
              </Link>
            </motion.div>
            <div
              className="relative ml-2 sm:ml-4 md:ml-8 mt-2 md:mt-0"
              style={{ filter: 'url(#pixelate-filter)' }}
            >
              <Image
                src="/hero-create/02.png"
                alt="NFT character with TV head"
                width={300}
                height={300}
                style={{ height: 'auto' }}
                className="w-24 h-24 sm:w-40 sm:h-40 md:w-60 md:h-60 lg:w-[300px] lg:h-[300px]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
