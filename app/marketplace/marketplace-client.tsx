'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePreloadedQuery, type Preloaded } from 'convex/react';
import { PageStateCard } from '@/components/battle/PageStateCard';
import { NFTHeadingWord } from '@/components/NFTHeadingWord';
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
import type { api } from '@/convex/_generated/api';

type MarketplaceClientProps = {
  address: string | null;
  auctions: Preloaded<typeof api.marketplace.getActiveAuctions>;
  user?: Preloaded<typeof api.users.getUser>;
  boxes?: Preloaded<typeof api.marketplace.getUserMysteryBoxes>;
  nfts?: Preloaded<typeof api.nft.getUserNFTs>;
};

function MarketplaceHeading() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-2">
        <NFTHeadingWord /> Marketplace
      </h1>
      <p className="text-muted-foreground">
        Trade NFTs with other players or try your luck with mystery boxes
      </p>
    </div>
  );
}

export function MarketplaceClient(props: MarketplaceClientProps) {
  const { isInitialized, isReady, selectedAccount } = useSolana();
  const router = useRouter();
  const currentAddress = selectedAccount?.address;

  useEffect(() => {
    if (isReady && currentAddress && currentAddress !== props.address) {
      router.replace(
        `/marketplace?wallet=${encodeURIComponent(currentAddress)}`,
      );
    }
  }, [isReady, currentAddress, props.address, router]);

  if (!isInitialized) {
    return (
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <MarketplaceHeading />
        <PageStateCard
          compact
          variant="loading"
          message="Initializing wallet connection..."
        />
      </main>
    );
  }

  if (!isReady || !currentAddress) {
    return (
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <MarketplaceHeading />
        <PageStateCard
          compact
          variant="walletConnect"
          message="Please connect your wallet to view the marketplace"
        />
      </main>
    );
  }

  if (
    currentAddress !== props.address ||
    !props.user ||
    !props.boxes ||
    !props.nfts
  ) {
    return (
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <MarketplaceHeading />
        <PageStateCard
          compact
          variant="loading"
          message="Preparing marketplace..."
        />
      </main>
    );
  }

  return (
    <LoadedMarketplace
      key={currentAddress}
      address={currentAddress}
      auctions={props.auctions}
      user={props.user}
      boxes={props.boxes}
      nfts={props.nfts}
    />
  );
}

function LoadedMarketplace({
  address,
  auctions,
  user,
  boxes,
  nfts,
}: MarketplaceClientProps & {
  address: string;
  user: NonNullable<MarketplaceClientProps['user']>;
  boxes: NonNullable<MarketplaceClientProps['boxes']>;
  nfts: NonNullable<MarketplaceClientProps['nfts']>;
}) {
  const [activeTab, setActiveTab] = useState('auctions');
  const [showCreateAuction, setShowCreateAuction] = useState(false);
  const userData = usePreloadedQuery(user);
  const userBoxes = usePreloadedQuery(boxes);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <MarketplaceHeading />
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
              <AuctionsList
                userAddress={address}
                preloadedAuctions={auctions}
                userCredits={userData?.credits || 0}
              />
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
              <MysteryBoxes
                userAddress={address}
                userCredits={userData?.credits || 0}
                userBoxes={userBoxes}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showCreateAuction && (
        <CreateAuction
          userAddress={address}
          preloadedNfts={nfts}
          onClose={() => setShowCreateAuction(false)}
        />
      )}
    </div>
  );
}
