'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageGenerator } from './image-generator';
import { ImageHistory } from './history';
import { PageStateCard } from '@/components/battle/PageStateCard';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { NFTHeadingWord } from '@/components/NFTHeadingWord';

export default function GeneratePage() {
  const [activeTab, setActiveTab] = useState('generate');
  const { isInitialized, isReady } = useSolana();

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
          defaultValue="generate"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="generate">
            <ImageGenerator />
          </TabsContent>
          <TabsContent value="history">
            <ImageHistory />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
