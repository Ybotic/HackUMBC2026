'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageGenerator } from './image-generator';
import { ImageHistory } from './history';
import { PageStateCard } from '@/components/battle/PageStateCard';
import { useSolana } from '@/lib/providers/SolanaProvider';

export default function GeneratePage() {
  const [activeTab, setActiveTab] = useState('generate');
  const { isInitialized, isReady } = useSolana();

  if (!isInitialized) {
    return (
      <PageStateCard
        variant="loading"
        message="Initializing wallet connection..."
      />
    );
  }

  if (!isReady) {
    return (
      <PageStateCard
        variant="walletConnect"
        message="Please connect your wallet to generate images"
      />
    );
  }

  return (
    <div className="container mx-auto p-4 lg:p-8">
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
    </div>
  );
}
