'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import {
  Clock,
  Coins,
  Gavel,
  User,
  Trophy,
  ImageIcon,
  Sparkles,
  Zap,
  Crown,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { NFT_TYPES } from '@/lib/constants/marketplace';
import { getNFTMetadata, getIpfsImageUrl } from '@/lib/utils';

interface AuctionsListProps {
  userAddress: string;
}

export function AuctionsList({ userAddress }: AuctionsListProps) {
  const auctions = useQuery(api.marketplace.getActiveAuctions);
  const userCredits = useQuery(api.users.getUser, { address: userAddress });
  const placeBidMutation = useMutation(api.marketplace.placeBid);

  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({});

  const handleBid = async (auctionId: string, auction: any) => {
    const bidAmount = Number(bidAmounts[auctionId]);
    if (!bidAmount || bidAmount <= 0) {
      toast.error('Please enter a valid bid amount');
      return;
    }

    if (bidAmount <= (auction.currentBid?.amount || auction.minimumPrice - 1)) {
      toast.error('Bid must be higher than current bid or minimum price');
      return;
    }

    if (!userCredits || (userCredits.credits || 0) < bidAmount) {
      toast.error('Insufficient credits');
      return;
    }

    try {
      await placeBidMutation({
        auctionId: auctionId as any,
        bidderAddress: userAddress,
        amount: bidAmount,
      });

      setBidAmounts((prev) => ({ ...prev, [auctionId]: '' }));

      // Check if this bid meets the buyout price
      if (auction.buyoutPrice && bidAmount >= auction.buyoutPrice) {
        toast.success(
          '🎉 Congratulations! You won the NFT with instant buyout!',
          {
            description: 'The auction has ended and the NFT is now yours.',
            duration: 5000,
          },
        );
      } else {
        toast.success('Bid placed successfully!', {
          description: 'You are now the highest bidder.',
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to place bid');
    }
  };

  const handleBuyout = async (auctionId: string, auction: any) => {
    if (!auction.buyoutPrice) {
      toast.error('No buyout price set for this auction');
      return;
    }

    if (!userCredits || (userCredits.credits || 0) < auction.buyoutPrice) {
      toast.error('Insufficient credits for buyout');
      return;
    }

    try {
      await placeBidMutation({
        auctionId: auctionId as any,
        bidderAddress: userAddress,
        amount: auction.buyoutPrice,
      });

      toast.success('🎉 Purchase successful!', {
        description: 'The NFT is now yours! The auction has ended.',
        duration: 5000,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to purchase NFT');
    }
  };

  const formatTimeLeft = (endsAt: number) => {
    const now = Date.now();
    if (endsAt <= now) return 'Ended';
    return formatDistanceToNow(new Date(endsAt), { addSuffix: true });
  };

  const getMinimumBid = (auction: any) => {
    return auction.currentBid
      ? auction.currentBid.amount + 1
      : auction.minimumPrice;
  };

  if (auctions === undefined) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <Card
            key={i}
            className="overflow-hidden hover:shadow-md transition-shadow p-0"
          >
            <div className="flex">
              <div className="relative w-80 bg-gradient-to-br from-muted/30 to-muted/60 flex-shrink-0 -m-px self-stretch">
                <Skeleton className="w-full h-full rounded-l-lg" />
              </div>
              <div className="flex-1 flex">
                <div className="flex-1 p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <div className="grid grid-cols-3 gap-3">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
                <div className="w-56 p-6 border-l bg-muted/30 flex flex-col justify-center">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!auctions || auctions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-muted/30 rounded-xl p-12 max-w-md mx-auto">
          <Gavel className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Active Auctions</h3>
          <p className="text-muted-foreground">
            There are currently no NFTs up for auction. Check back later or
            create your own auction!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {auctions.map((auction: any) => {
        const timeLeft = formatTimeLeft(auction.endsAt);
        const isExpired = auction.endsAt <= Date.now();
        const minimumBid = getMinimumBid(auction);
        const isOwnAuction = auction.sellerAddress === userAddress;

        const metadata = getNFTMetadata(auction.nft.metadata);
        const imageUrl = getIpfsImageUrl(metadata);
        const nftName = metadata?.name || `NFT #${auction.nft.item}`;

        return (
          <Card
            key={auction._id}
            className="overflow-hidden hover:shadow-md transition-shadow p-0"
          >
            <div className="flex">
              {/* NFT Image */}
              <div className="relative w-80 bg-gradient-to-br from-muted/30 to-muted/60 flex-shrink-0 -m-px self-stretch">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={nftName}
                    className="w-full h-full object-cover rounded-l-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center rounded-l-lg">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}

                {/* NFT Type Badge */}
                {auction.nft.stats && (
                  <div className="absolute top-3 left-3">
                    <Badge
                      variant="secondary"
                      className="text-xs font-semibold"
                    >
                      {NFT_TYPES[auction.nft.stats.nftType]}
                    </Badge>
                  </div>
                )}

                {/* Status Overlay for Ended Auctions */}
                {isExpired && auction.winner && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-l-lg">
                    <div className="text-center text-white">
                      <Crown className="h-6 w-6 mx-auto mb-1 text-yellow-400" />
                      <p className="text-sm font-semibold">SOLD</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 flex">
                {/* Left Content */}
                <div className="flex-1 p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-xl leading-tight">
                        {nftName}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <User className="h-3 w-3" />
                        {auction.sellerAddress.slice(0, 6)}...
                        {auction.sellerAddress.slice(-4)}
                      </p>
                    </div>
                    <Badge
                      variant={isExpired ? 'secondary' : 'default'}
                      className="flex items-center gap-1 text-sm px-3 py-1"
                    >
                      <Clock className="h-4 w-4" />
                      {timeLeft}
                    </Badge>
                  </div>

                  {/* All Stats Display */}
                  {auction.nft.stats && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">
                          Combat Stats
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <div className="text-xs text-red-600 font-medium mb-1">
                            ATK
                          </div>
                          <div className="text-lg font-bold">
                            {auction.nft.stats.attack}
                          </div>
                        </div>
                        <div className="text-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <div className="text-xs text-blue-600 font-medium mb-1">
                            DEF
                          </div>
                          <div className="text-lg font-bold">
                            {auction.nft.stats.defense}
                          </div>
                        </div>
                        <div className="text-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <div className="text-xs text-green-600 font-medium mb-1">
                            HP
                          </div>
                          <div className="text-lg font-bold">
                            {auction.nft.stats.maxHealth}
                          </div>
                        </div>
                        <div className="text-center p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                          <div className="text-xs text-purple-600 font-medium mb-1">
                            INT
                          </div>
                          <div className="text-lg font-bold">
                            {auction.nft.stats.intelligence}
                          </div>
                        </div>
                        <div className="text-center p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <div className="text-xs text-yellow-600 font-medium mb-1">
                            LCK
                          </div>
                          <div className="text-lg font-bold">
                            {auction.nft.stats.luck}
                          </div>
                        </div>
                        <div className="text-center p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                          <div className="text-xs text-orange-600 font-medium mb-1">
                            SPD
                          </div>
                          <div className="text-lg font-bold">
                            {auction.nft.stats.speed}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Price Info */}
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-amber-500" />
                      <span className="text-base font-semibold">
                        {auction.minimumPrice}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        start
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <span className="text-base font-bold">
                        {auction.currentBid
                          ? auction.currentBid.amount
                          : 'No bids'}
                      </span>
                      {auction.currentBid && (
                        <span className="text-sm text-muted-foreground">
                          current
                        </span>
                      )}
                    </div>
                    {auction.buyoutPrice && (
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <span className="text-base font-bold text-primary">
                          {auction.buyoutPrice}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          buyout
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="w-56 p-6 border-l bg-muted/30 flex flex-col justify-center">
                  {!isExpired && !isOwnAuction ? (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          Place Bid (min {minimumBid})
                        </Label>
                        <Input
                          type="number"
                          placeholder={`${minimumBid}`}
                          value={bidAmounts[auction._id] || ''}
                          onChange={(e) =>
                            setBidAmounts((prev) => ({
                              ...prev,
                              [auction._id]: e.target.value,
                            }))
                          }
                          min={minimumBid}
                          className="h-10 text-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                      </div>
                      <Button
                        onClick={() => handleBid(auction._id, auction)}
                        disabled={
                          !bidAmounts[auction._id] ||
                          Number(bidAmounts[auction._id]) < minimumBid
                        }
                        className="w-full h-10"
                        size="sm"
                      >
                        <Gavel className="h-4 w-4 mr-2" />
                        Place Bid
                      </Button>
                      {auction.buyoutPrice && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-10"
                          disabled={
                            (userCredits?.credits || 0) < auction.buyoutPrice
                          }
                          onClick={() => handleBuyout(auction._id, auction)}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Buy Now
                        </Button>
                      )}
                      <p className="text-sm text-muted-foreground text-center">
                        Credits: {userCredits?.credits || 0}
                      </p>
                    </div>
                  ) : isOwnAuction && !isExpired ? (
                    <div className="text-center">
                      <Badge
                        variant="outline"
                        className="border-blue-500 text-blue-600 text-sm px-4 py-2"
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Your Auction
                      </Badge>
                    </div>
                  ) : isExpired && auction.winner ? (
                    <div className="text-center space-y-2">
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800 text-sm px-4 py-2"
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Sold
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {auction.winner.finalPrice} credits
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Badge variant="secondary" className="text-sm px-4 py-2">
                        No Winner
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
