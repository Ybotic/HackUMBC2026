'use client';

import { useState } from 'react';
import { PageStateCard } from '@/components/battle/PageStateCard';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AuctionsList } from '@/components/marketplace/AuctionsList';
import { MysteryBoxes } from '@/components/marketplace/MysteryBoxes';
import { CreateAuction } from '@/components/marketplace/CreateAuction';
import { Button } from '@/components/ui/button';
import { Plus, Package, Gavel } from 'lucide-react';

export default function Marketplace() {
  const { isInitialized, isReady, selectedAccount } = useSolana();
  const [activeTab, setActiveTab] = useState('auctions');
  const [showCreateAuction, setShowCreateAuction] = useState(false);

  if (!isInitialized) {
    return (
      <PageStateCard
        variant="loading"
        message="Initializing wallet connection..."
      />
    );
  }

  if (!isReady || !selectedAccount) {
    return (
      <PageStateCard
        variant="walletConnect"
        message="Please connect your wallet to view the marketplace"
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Marketplace</h1>
          <p className="text-muted-foreground">
            Trade NFTs with other players or try your luck with mystery boxes
          </p>
        </div>
        {activeTab === 'auctions' && (
          <Button
            onClick={() => setShowCreateAuction(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Auction
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="auctions" className="flex items-center gap-2">
            <Gavel className="h-4 w-4" />
            User Auctions
          </TabsTrigger>
          <TabsTrigger
            value="mystery-boxes"
            className="flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            Mystery Boxes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="auctions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>NFT Auctions</CardTitle>
              <CardDescription>
                Bid on NFTs from other players. Highest bidder wins when the
                auction ends.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuctionsList userAddress={selectedAccount.address} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mystery-boxes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Mystery Boxes</CardTitle>
              <CardDescription>
                Purchase mystery boxes to get randomly generated NFTs with
                unique stats. Higher tier boxes have better multipliers and more
                powerful NFTs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MysteryBoxes userAddress={selectedAccount.address} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showCreateAuction && (
        <CreateAuction
          userAddress={selectedAccount.address}
          onClose={() => setShowCreateAuction(false)}
        />
      )}
    </div>
  );
}
