'use client';

import Link from 'next/link';
import { Link as TransitionLink } from 'next-view-transitions';
import { useRef } from 'react';
import ParticleRose from '@/components/hero/particle-rose';
import { useSolana } from '@/lib/providers/SolanaProvider';

export default function FooterSection() {
  const { selectedAccount } = useSolana();
  const artFadeRef = useRef(0);

  return (
    <footer className="sticky z-0 bottom-0 left-0 w-full h-screen bg-[#1f1f1f] flex justify-center items-center">
      <div className="relative overflow-hidden w-full h-full flex flex-col md:flex-row items-center">
        <div className="w-full h-[30vh] min-h-48 flex items-center justify-center md:h-full md:w-1/2">
          <ParticleRose
            artFadeRef={artFadeRef}
            artUrl="/hero-footer/newgengar.jpg"
            intro={false}
            mode="art"
            className="w-[min(86.4vw,28.8rem)] md:w-[min(48vw,42rem)]"
          />
        </div>

        <div className="w-full flex-1 min-h-0 md:flex-none md:w-1/2 md:h-full flex flex-col justify-center items-center px-4 md:pr-12">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h1 className="text-[80px] sm:text-[60px] md:text-[100px] lg:text-[140px] xl:text-[180px] 2xl:text-[220px] font-garamond font-bold uppercase tracking-tighter text-white leading-none select-none">
              MINT
            </h1>
            <p className="text-white/70 text-2xl sm:text-lg md:text-2xl lg:text-3xl xl:text-4xl font-garamond uppercase tracking-widest mt-2 sm:mt-4 md:mt-8">
              The Ultimate Battle Arena
            </p>
          </div>

          <div className="grid grid-cols-2 md:flex md:flex-wrap justify-center gap-4 sm:gap-6 md:gap-12 lg:gap-16 text-white mb-6 sm:mb-8 md:mb-12 w-full max-w-lg md:max-w-none">
            <TransitionLink
              href="/"
              className="text-3xl sm:text-xl md:text-3xl lg:text-4xl xl:text-5xl font-garamond tracking-tighter uppercase hover:text-[#0086F0] transition-all duration-300 hover:scale-110 text-center"
            >
              Home
            </TransitionLink>
            <TransitionLink
              href="/dashboard"
              className="text-3xl sm:text-xl md:text-3xl lg:text-4xl xl:text-5xl font-garamond tracking-tighter uppercase hover:text-[#0086F0] transition-all duration-300 hover:scale-110 text-center"
            >
              Dashboard
            </TransitionLink>
            <TransitionLink
              href={
                selectedAccount
                  ? `/generate?wallet=${encodeURIComponent(selectedAccount.address)}`
                  : '/generate'
              }
              className="text-3xl sm:text-xl md:text-3xl lg:text-4xl xl:text-5xl font-garamond tracking-tighter uppercase hover:text-[#0086F0] transition-all duration-300 hover:scale-110 text-center"
            >
              Generate
            </TransitionLink>
            <TransitionLink
              href={
                selectedAccount
                  ? `/battle?wallet=${encodeURIComponent(selectedAccount.address)}`
                  : '/battle'
              }
              className="text-3xl sm:text-xl md:text-3xl lg:text-4xl xl:text-5xl font-garamond tracking-tighter uppercase hover:text-[#0086F0] transition-all duration-300 hover:scale-110 text-center"
            >
              Battle
            </TransitionLink>
          </div>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 text-white/60">
            <a
              href="https://github.com/Ybotic/HackUMBC2026"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl sm:text-lg md:text-2xl lg:text-3xl font-garamond uppercase tracking-wider hover:text-white transition-all duration-300 hover:scale-110"
            >
              Github
            </a>
            <a
              href="https://deepwiki.com/Ybotic/HackUMBC2026"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl sm:text-lg md:text-2xl lg:text-3xl font-garamond uppercase tracking-wider hover:text-white transition-all duration-300 hover:scale-110"
            >
              Deepwiki
            </a>
            <Link
              href="#about"
              className="text-xl sm:text-lg md:text-2xl lg:text-3xl font-garamond uppercase tracking-wider hover:text-white transition-all duration-300 hover:scale-110"
            >
              About
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
