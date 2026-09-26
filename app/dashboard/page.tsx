'use client';

import { useState, useEffect } from 'react';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { useSolanaNFT } from '@/lib/providers/SolanaNFTProvider';
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { useNFTs } from '@/hooks/useNFTs';
import { PageStateCard } from '@/components/battle/PageStateCard';
import { NFTStatsDisplay } from '@/components/battle/NFTStatsDisplay';
import { getNFTMetadata, getIpfsImageUrl } from '@/lib/utils';
import { getNFTTypeName, getNFTTypeColor } from '@/lib/battle-utils';
import { Trash2, RefreshCw, CheckCircle, Clock, Info } from 'lucide-react';

function NFTLoadingSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <CardContent className="p-0">
        <Skeleton className="aspect-square w-full -m-px" />
        <div className="p-6 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SyncStatus({
  lastSyncTime,
  isSyncing,
}: { lastSyncTime: Date | null; isSyncing: boolean }) {
  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>Syncing with Solana...</span>
      </div>
    );
  }

  if (lastSyncTime) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span>
          Last synced {formatDistanceToNow(lastSyncTime, { addSuffix: true })}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="h-4 w-4" />
      <span>Not synced yet</span>
    </div>
  );
}

export default function Dashboard() {
  const {
    isReady,
    selectedAccount,
    isInitialized: isSolanaInitialized,
  } = useSolana();
  const { isInitialized } = useSolanaNFT();
  const [burningItem, setBurningItem] = useState<string | null>(null);
  const [optimisticallyRemovedNFTs, setOptimisticallyRemovedNFTs] = useState<
    string[]
  >([]);

  const {
    nfts: userNFTs,
    lastSyncTime,
    isSyncing,
    syncFromSolana,
    burnNFT,
    initializeUser,
  } = useNFTs();

  useEffect(() => {
    if (isReady && selectedAccount?.address) {
      void initializeUser();
    }
  }, [isReady, selectedAccount?.address, initializeUser]);

  if (!isSolanaInitialized) {
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
        message="Please connect your wallet to view your NFTs"
      />
    );
  }

  const isLoading = userNFTs === undefined;
  const filteredNFTs =
    userNFTs?.filter(
      (nft) =>
        !optimisticallyRemovedNFTs.includes(`${nft.collection}-${nft.item}`),
    ) || [];

  return (
    <TooltipProvider>
      <div className="bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-foreground">
                  My Collection
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  {isLoading
                    ? 'Loading your NFTs...'
                    : `${filteredNFTs.length} ${filteredNFTs.length === 1 ? 'item' : 'items'} in your collection`}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <SyncStatus
                  lastSyncTime={lastSyncTime ? new Date(lastSyncTime) : null}
                  isSyncing={isSyncing}
                />
                <Button
                  variant="outline"
                  onClick={() => syncFromSolana()}
                  disabled={isSyncing || !isInitialized}
                  className="min-w-[140px]"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync NFTs
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => (
                <NFTLoadingSkeleton key={`skeleton-${Date.now()}-${i}`} />
              ))}
            </div>
          ) : filteredNFTs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
              {filteredNFTs.map((nft) => {
                const metadata = getNFTMetadata(nft.itemMetadata);
                const imageUrl = getIpfsImageUrl(metadata);
                const typeName = getNFTTypeName(nft.stats?.nftType || 0);
                const typeColor = getNFTTypeColor(nft.stats?.nftType || 0);

                return (
                  <Card
                    key={`${nft.collection}-${nft.item}`}
                    className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-2 hover:border-primary/20 p-0"
                  >
                    <CardContent className="p-0">
                      <div className="aspect-square bg-muted relative overflow-hidden -m-px">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={metadata?.name || `NFT ${nft.item}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                                <svg
                                  className="w-8 h-8"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                              <p className="text-sm">No Image</p>
                            </div>
                          </div>
                        )}

                        <div className="absolute top-3 right-3">
                          <Badge className={`${typeColor} shadow-lg`}>
                            {typeName}
                          </Badge>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg line-clamp-1 flex-1">
                            {metadata?.name || `Item #${nft.item}`}
                          </CardTitle>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 cursor-help">
                                <Info className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  ID
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p>Collection: {nft.collection}</p>
                                <p>Item: {nft.item}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        <Separator />

                        {nft.stats && (
                          <div className="mb-4">
                            <h4 className="font-semibold text-sm mb-2 text-foreground">
                              Battle Stats
                            </h4>
                            <NFTStatsDisplay stats={nft.stats} />
                          </div>
                        )}

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            const id = `${nft.collection}-${nft.item}`;
                            setBurningItem(id);

                            try {
                              await burnNFT(nft.collection, nft.item);

                              // optimistically remove the NFT from UI
                              setOptimisticallyRemovedNFTs((prev) => [
                                ...prev,
                                id,
                              ]);

                              // sync with Solana to confirm removal
                              await syncFromSolana();
                            } catch (error) {
                              console.error(error);
                            } finally {
                              setBurningItem(null);
                            }
                          }}
                          disabled={
                            burningItem === `${nft.collection}-${nft.item}` ||
                            !isInitialized
                          }
                          className="w-full"
                        >
                          {burningItem === `${nft.collection}-${nft.item}` ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Burning...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Burn NFT
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-16 border-dashed border-2">
              <CardContent>
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <CardTitle className="text-2xl mb-3">No NFTs Found</CardTitle>
                <CardDescription className="text-lg mb-6">
                  This account doesn't have any Metaplex Core cards on Solana
                  yet.
                </CardDescription>
                <Button
                  variant="outline"
                  onClick={() => syncFromSolana()}
                  disabled={isSyncing || !isInitialized}
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Check Again
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
