'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import CirclingElements from '@/components/fancy/circling-elements';
import useScreenSize from '@/hooks/use-screen-size';

const heroCirclingImages = Array.from(
  { length: 9 },
  (_, i) => `/hero-circling/${(i + 1).toString().padStart(2, '0')}.png`,
);

export default function AboutSection() {
  const screenSize = useScreenSize();

  return (
    <section id="about" className="min-h-screen bg-background relative">
      <div className="h-screen relative flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <CirclingElements
              radius={screenSize.lessThan('md') ? 140 : 300}
              duration={20}
              pauseOnHover={true}
              easing="ease"
            >
              {heroCirclingImages.map((image, index) => (
                <div
                  key={index}
                  className="w-24 h-24 md:w-56 md:h-56 hover:scale-125 duration-200 ease-out cursor-pointer relative rounded-sm overflow-hidden"
                >
                  <Image
                    src={image}
                    alt={`NFT ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 96px, 224px"
                    className="object-cover"
                  />
                </div>
              ))}
            </CirclingElements>
          </div>
        </div>

        <motion.div
          className="relative z-10 text-center px-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="font-sans font-bold text-[2.5rem] text-white uppercase tracking-[-0.1875rem] leading-[0.8]">
            the best nft
            <br />
            platform ever
          </h2>
        </motion.div>
      </div>
    </section>
  );
}
