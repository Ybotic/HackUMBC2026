'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Preloaded } from 'convex/react';
import type { api } from '@/convex/_generated/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageGenerator } from './image-generator';
import { ImageHistory } from './history';
import { PageStateCard } from '@/components/battle/PageStateCard';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { NFTHeadingWord } from '@/components/NFTHeadingWord';

type GenerateClientProps = {
  address: string | null;
  history: Preloaded<typeof api.images.getUserImages> | null;
};

export function GenerateClient({ address, history }: GenerateClientProps) {
  const [activeTab, setActiveTab] = useState('generate');
  const { isInitialized, isReady, selectedAccount } = useSolana();
  const router = useRouter();
  const currentAddress = selectedAccount?.address;
  const historyReady =
    !!currentAddress && currentAddress === address && !!history;

  useEffect(() => {
    if (isReady && currentAddress && currentAddress !== address) {
      router.replace(`/generate?wallet=${encodeURIComponent(currentAddress)}`);
    }
  }, [isReady, currentAddress, address, router]);

  return (
    <div className="container mx-auto p-4 lg:p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          <NFTHeadingWord /> Generator
        </h1>
        <p className="text-lg text-muted-foreground mx-auto">
          Create stunning artwork and mint it directly as NFTs on Solana
        </p>
      </div>
      {!isInitialized ? (
        <PageStateCard
          compact
          variant="loading"
          message="Initializing wallet connection..."
        />
      ) : !isReady ? (
        <PageStateCard
          compact
          variant="walletConnect"
          message="Please connect your wallet to generate images"
        />
      ) : (
        <Tabs
          value={historyReady ? activeTab : 'generate'}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="history" disabled={!historyReady}>
              History
            </TabsTrigger>
          </TabsList>
          <TabsContent value="generate">
            <ImageGenerator />
          </TabsContent>
          <TabsContent value="history">
            {historyReady && (
              <ImageHistory key={currentAddress} preloadedHistory={history} />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
