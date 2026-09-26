'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  Coins,
  Clock,
  Zap,
  Gavel,
  ImageIcon,
  Sparkles,
  TrendingUp,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DURATION_OPTIONS,
  NFT_TYPE_COLORS,
  NFT_TYPES,
} from '@/lib/constants/marketplace';
import { getNFTMetadata, getIpfsImageUrl } from '@/lib/utils';

interface CreateAuctionProps {
  userAddress: string;
  onClose: () => void;
}

export function CreateAuction({ userAddress, onClose }: CreateAuctionProps) {
  const userNfts = useQuery(api.nft.getUserNFTs, { address: userAddress });
  const createAuctionMutation = useMutation(api.marketplace.createAuction);

  const [selectedNft, setSelectedNft] = useState<any>(null);
  const [minimumPrice, setMinimumPrice] = useState('');
  const [buyoutPrice, setBuyoutPrice] = useState('');
  const [duration, setDuration] = useState<number>(24);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateAuction = async () => {
    if (!selectedNft) {
      toast.error('Please select an NFT to auction');
      return;
    }

    const minPrice = Number(minimumPrice);
    if (!minPrice || minPrice <= 0) {
      toast.error('Please enter a valid minimum price');
      return;
    }

    const buyPrice = buyoutPrice ? Number(buyoutPrice) : undefined;
    if (buyPrice && buyPrice <= minPrice) {
      toast.error('Buyout price must be higher than minimum price');
      return;
    }

    setIsCreating(true);
    try {
      await createAuctionMutation({
        sellerAddress: userAddress,
        nftCollection: selectedNft.collection,
        nftItem: selectedNft.item,
        nftMetadata: selectedNft.itemMetadata,
        nftStats: selectedNft.stats,
        minimumPrice: minPrice,
        buyoutPrice: buyPrice,
        durationHours: duration,
      });

      toast.success('Auction created successfully!');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create auction');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] lg:max-w-[85vw] xl:max-w-7xl max-h-[95vh] overflow-hidden w-full p-0">
        <div className="flex flex-col h-full max-h-[95vh]">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b bg-card">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-1.5 bg-muted rounded-lg">
                <Gavel className="h-5 w-5 text-primary" />
              </div>
              Create NFT Auction
            </DialogTitle>
            <DialogDescription className="text-sm mt-1">
              Transform your NFT into a thrilling auction experience
            </DialogDescription>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {selectedNft ? (
              /* Two Column Layout with Selected NFT */
              <div className="grid grid-cols-1 xl:grid-cols-3 h-full">
                {/* Left: NFT Showcase */}
                <div className="xl:col-span-1 bg-muted/30 p-8 border-r">
                  <div className="space-y-6">
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedNft(null)}
                      className="p-2 h-auto"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Choose Different NFT
                    </Button>

                    <div className="text-center">
                      <div className="relative inline-block">
                        {(() => {
                          const metadata = getNFTMetadata(
                            selectedNft.itemMetadata,
                          );
                          const imageUrl = getIpfsImageUrl(metadata);

                          return (
                            <div className="w-48 h-48 mx-auto border-2 border-border shadow-xl rounded-xl overflow-hidden bg-card">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={
                                    metadata?.name || `NFT ${selectedNft.item}`
                                  }
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-16 w-16 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <div className="absolute -top-3 -right-3">
                          <div
                            className={`w-8 h-8 rounded-full border-3 border-white shadow-lg ${NFT_TYPE_COLORS[selectedNft.stats?.nftType as keyof typeof NFT_TYPE_COLORS] || 'bg-gray-400'}`}
                          />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mt-4">
                        {(() => {
                          const metadata = getNFTMetadata(
                            selectedNft.itemMetadata,
                          );
                          return metadata?.name || `NFT #${selectedNft.item}`;
                        })()}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Collection {selectedNft.collection}
                      </p>
                      {selectedNft.stats && (
                        <Badge variant="secondary" className="mt-2">
                          {NFT_TYPES[selectedNft.stats.nftType]}
                        </Badge>
                      )}
                    </div>

                    {selectedNft.stats && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Combat Stats
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              {
                                label: 'ATK',
                                value: selectedNft.stats.attack,
                                color: 'bg-red-500',
                              },
                              {
                                label: 'DEF',
                                value: selectedNft.stats.defense,
                                color: 'bg-blue-500',
                              },
                              {
                                label: 'INT',
                                value: selectedNft.stats.intelligence,
                                color: 'bg-purple-500',
                              },
                              {
                                label: 'LCK',
                                value: selectedNft.stats.luck,
                                color: 'bg-yellow-500',
                              },
                              {
                                label: 'SPD',
                                value: selectedNft.stats.speed,
                                color: 'bg-green-500',
                              },
                              {
                                label: 'STR',
                                value: selectedNft.stats.strength,
                                color: 'bg-orange-500',
                              },
                            ].map((stat) => (
                              <div
                                key={stat.label}
                                className="flex items-center justify-between p-2 bg-muted/50 rounded"
                              >
                                <span className="text-xs font-medium text-muted-foreground">
                                  {stat.label}
                                </span>
                                <span className="font-bold">{stat.value}</span>
                              </div>
                            ))}
                          </div>
                          <div className="pt-2 border-t">
                            <div className="flex items-center justify-between p-2 bg-muted/50 rounded font-semibold">
                              <span className="text-sm">Max HP</span>
                              <span className="text-primary">
                                {selectedNft.stats.maxHealth}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                {/* Right: Auction Settings */}
                <div className="xl:col-span-2 bg-muted/30 p-8 overflow-y-auto">
                  <div className="max-w-2xl mx-auto space-y-8">
                    <div>
                      <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Auction Configuration
                      </h2>
                      <p className="text-muted-foreground">
                        Set up your auction parameters
                      </p>
                    </div>

                    {/* Auction Form */}
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Coins className="h-4 w-4" />
                            Pricing
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">
                              Starting Price (Credits)
                            </Label>
                            <Input
                              type="number"
                              placeholder="Enter minimum bid amount"
                              value={minimumPrice}
                              onChange={(e) => setMinimumPrice(e.target.value)}
                              min="1"
                              className="mt-2 h-12 text-lg [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                            />
                            <p className="text-sm text-muted-foreground mt-2">
                              The lowest amount bidders can offer
                            </p>
                            {minimumPrice && Number(minimumPrice) < 1 && (
                              <p className="text-sm text-red-500 mt-2">
                                Minimum price must be at least 1 credit
                              </p>
                            )}
                          </div>

                          <div>
                            <Label className="text-sm font-medium flex items-center gap-2">
                              <Zap className="h-4 w-4" />
                              Instant Buy Price (Optional)
                            </Label>
                            <Input
                              type="number"
                              placeholder="Allow instant purchase at this price"
                              value={buyoutPrice}
                              onChange={(e) => setBuyoutPrice(e.target.value)}
                              min={minimumPrice || '1'}
                              className="mt-2 h-12 text-lg [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                            />
                            <p className="text-sm text-muted-foreground mt-2">
                              Set a price for immediate purchase
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Duration
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Label className="text-sm font-medium">
                            Auction Length
                          </Label>
                          <Select
                            value={duration.toString()}
                            onValueChange={(value) =>
                              setDuration(Number(value))
                            }
                          >
                            <SelectTrigger className="mt-2 h-12">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DURATION_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value.toString()}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-muted-foreground mt-2">
                            How long your auction will be active
                          </p>
                        </CardContent>
                      </Card>

                      {/* Action Buttons */}
                      <div className="flex gap-4 pt-2">
                        <Button
                          variant="outline"
                          onClick={onClose}
                          className="flex-1 h-12"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateAuction}
                          disabled={!selectedNft || !minimumPrice || isCreating}
                          className="flex-1 h-12"
                          size="lg"
                        >
                          {isCreating ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2" />
                              Creating Auction...
                            </>
                          ) : (
                            <>
                              <Gavel className="h-4 w-4 mr-2" />
                              Launch Auction
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* NFT Selection View */
              <div className="p-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold mb-2">
                    Choose Your NFT
                  </h2>
                  <p className="text-muted-foreground">
                    Select which NFT you'd like to auction
                  </p>
                </div>

                {userNfts === undefined ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="p-6 h-64">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                          </div>
                          <Skeleton className="h-4 w-32" />
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                            </div>
                            <Skeleton className="h-8 w-full" />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : !userNfts || userNfts.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="bg-muted/30 rounded-xl p-12 max-w-md mx-auto">
                      <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No NFTs Found
                      </h3>
                      <p className="text-muted-foreground">
                        You don't have any NFTs to auction. Purchase mystery
                        boxes or participate in battles to get NFTs!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {userNfts.map((nft: any) => {
                        const metadata = getNFTMetadata(nft.itemMetadata);
                        const imageUrl = getIpfsImageUrl(metadata);

                        return (
                          <Card
                            key={`${nft.collection}-${nft.item}`}
                            className="cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] p-6 h-64 group"
                            onClick={() => setSelectedNft(nft)}
                          >
                            <div className="flex flex-col h-full space-y-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-border bg-card flex-shrink-0">
                                      {imageUrl ? (
                                        <img
                                          src={imageUrl}
                                          alt={
                                            metadata?.name || `NFT ${nft.item}`
                                          }
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.currentTarget.style.display =
                                              'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-lg truncate">
                                        {metadata?.name || `NFT #${nft.item}`}
                                      </h4>
                                      <p className="text-sm text-muted-foreground truncate">
                                        Collection {nft.collection}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                {nft.stats && (
                                  <div className="flex flex-col items-end gap-1">
                                    <div
                                      className={`w-4 h-4 rounded-full ${NFT_TYPE_COLORS[nft.stats.nftType as keyof typeof NFT_TYPE_COLORS]}`}
                                    />
                                    <span className="text-xs font-medium">
                                      {NFT_TYPES[nft.stats.nftType]}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {nft.stats && (
                                <div className="flex-1 space-y-3">
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="text-center p-2 bg-muted/50 rounded group-hover:bg-muted transition-colors">
                                      <div className="text-xs text-muted-foreground">
                                        ATK
                                      </div>
                                      <div className="font-bold">
                                        {nft.stats.attack}
                                      </div>
                                    </div>
                                    <div className="text-center p-2 bg-muted/50 rounded group-hover:bg-muted transition-colors">
                                      <div className="text-xs text-muted-foreground">
                                        DEF
                                      </div>
                                      <div className="font-bold">
                                        {nft.stats.defense}
                                      </div>
                                    </div>
                                    <div className="text-center p-2 bg-muted/50 rounded group-hover:bg-muted transition-colors">
                                      <div className="text-xs text-muted-foreground">
                                        HP
                                      </div>
                                      <div className="font-bold">
                                        {nft.stats.maxHealth}
                                      </div>
                                    </div>
                                  </div>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="text-center p-2 bg-muted/50 rounded group-hover:bg-muted transition-colors cursor-help">
                                        <div className="text-xs text-muted-foreground">
                                          Power Score
                                        </div>
                                        <div className="font-bold text-primary">
                                          {Math.round(
                                            (nft.stats.attack +
                                              nft.stats.defense +
                                              nft.stats.intelligence +
                                              nft.stats.luck +
                                              nft.stats.speed +
                                              nft.stats.strength +
                                              nft.stats.maxHealth) /
                                              7,
                                          )}
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-card border-border text-card-foreground p-3 max-w-none">
                                      <div className="flex items-center gap-2 text-xs">
                                        <span className="text-muted-foreground">
                                          Power Score:
                                        </span>
                                        <span className="text-primary font-medium">
                                          ({nft.stats.attack} +{' '}
                                          {nft.stats.defense} +{' '}
                                          {nft.stats.intelligence} +{' '}
                                          {nft.stats.luck} + {nft.stats.speed} +{' '}
                                          {nft.stats.strength} +{' '}
                                          {nft.stats.maxHealth}) ÷ 7
                                        </span>
                                        <span className="text-muted-foreground">
                                          =
                                        </span>
                                        <span className="font-bold text-foreground">
                                          {Math.round(
                                            (nft.stats.attack +
                                              nft.stats.defense +
                                              nft.stats.intelligence +
                                              nft.stats.luck +
                                              nft.stats.speed +
                                              nft.stats.strength +
                                              nft.stats.maxHealth) /
                                              7,
                                          )}
                                        </span>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
