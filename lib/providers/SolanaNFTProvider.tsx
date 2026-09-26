'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { SolanaNFTManager } from '@/lib/solanaNFTManager';
import { SOLANA_RPC_URL } from '@/lib/solana/client';

interface SolanaNFTContextValue {
  nftManager: SolanaNFTManager;
  isInitialized: boolean;
}

const SolanaNFTContext = createContext<SolanaNFTContextValue | undefined>(
  undefined,
);

export function SolanaNFTProvider({ children }: { children: ReactNode }) {
  const { signer, isInitialized } = useSolana();
  const nftManager = useMemo(
    () => new SolanaNFTManager(SOLANA_RPC_URL, signer),
    [signer],
  );

  return (
    <SolanaNFTContext.Provider value={{ nftManager, isInitialized }}>
      {children}
    </SolanaNFTContext.Provider>
  );
}

export function useSolanaNFT(): SolanaNFTContextValue {
  const context = useContext(SolanaNFTContext);
  if (!context) {
    throw new Error('useSolanaNFT must be used within a SolanaNFTProvider');
  }
  return context;
}
