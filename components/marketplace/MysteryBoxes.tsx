'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Coins, Package, Gift, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  MYSTERY_BOX_TIERS,
  NFT_TYPES,
  NFT_TYPE_COLORS,
} from '@/lib/constants/marketplace';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSolanaNFT } from '@/lib/providers/SolanaNFTProvider';
import { useSolana } from '@/lib/providers/SolanaProvider';
import type { UserCollection } from '@/lib/solanaNFTManager';
import { mintImageAsNFT, getUserCollections } from '@/lib/mintNFT';
import { useNFTs } from '@/hooks/useNFTs';
import type { Id } from '@/convex/_generated/dataModel';

interface MysteryBoxesProps {
  userAddress: string;
}

export function MysteryBoxes({ userAddress }: MysteryBoxesProps) {
  const userCredits = useQuery(api.users.getUser, { address: userAddress });
  const userBoxes = useQuery(api.marketplace.getUserMysteryBoxes, {
    userAddress,
  });
  const purchaseBoxMutation = useMutation(api.marketplace.purchaseMysteryBox);
  const openBoxMutation = useMutation(api.marketplace.openMysteryBox);
  const generateImageMutation = useMutation(api.images.generateImage);
  const updateBoxImageMutation = useMutation(
    api.marketplace.updateMysteryBoxImage,
  );

  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(
    new Set(),
  );
  const [mintingBox, setMintingBox] = useState<string | null>(null);
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [newCollectionName, setNewCollectionName] = useState<string>('');
  const [nftName, setNftName] = useState<string>('');
  const [imageGenStates, setImageGenStates] = useState<
    Record<string, Id<'imageGenerations'>>
  >({});

  const { nftManager, isInitialized: isSolanaInitialized } = useSolanaNFT();
  const { selectedAccount } = useSolana();
  const { syncFromSolana } = useNFTs();

  // Watch for active image generations
  const activeImageGenIds = Object.values(imageGenStates);
  const imageGenQueries = useQuery(
    api.images.getMultipleImageGenerations,
    activeImageGenIds.length > 0 ? { imageGenIds: activeImageGenIds } : 'skip',
  );

  // Load user collections
  useEffect(() => {
    if (!selectedAccount?.address || !isSolanaInitialized) return;

    getUserCollections(nftManager, selectedAccount.address)
      .then(setCollections)
      .catch(console.error);
  }, [selectedAccount?.address, nftManager, isSolanaInitialized]);

  // Auto-generate images for opened boxes that don't have them yet
  useEffect(() => {
    if (!userBoxes) return;

    userBoxes.forEach((box: any) => {
      if (
        box.status === 'opened' &&
        box.generatedNFT?.prompt &&
        !box.generatedNFT?.imageUrl &&
        !generatingImages.has(box._id) &&
        !imageGenStates[box._id]
      ) {
        handleGenerateImage(box);
      }
    });
  }, [userBoxes, generatingImages, imageGenStates]);

  // Watch for image generation completion
  useEffect(() => {
    if (!imageGenQueries) return;

    Object.entries(imageGenStates).forEach(([boxId, imageGenId]) => {
      const imageGen = imageGenQueries.find(
        (img: any) => img._id === imageGenId,
      );

      if (imageGen?.imageUrl) {
        // Image is complete, update the box
        updateBoxImageMutation({
          boxId: boxId as any,
          imageUrl: imageGen.imageUrl,
        });

        // Clean up states
        setImageGenStates((prev) => {
          const newState = { ...prev };
          delete newState[boxId];
          return newState;
        });

        setGeneratingImages((prev) => {
          const newSet = new Set(prev);
          newSet.delete(boxId);
          return newSet;
        });

        toast.success('NFT image generated successfully!');
      } else if (imageGen?.status === 'failed') {
        // Generation failed, clean up states
        setImageGenStates((prev) => {
          const newState = { ...prev };
          delete newState[boxId];
          return newState;
        });

        setGeneratingImages((prev) => {
          const newSet = new Set(prev);
          newSet.delete(boxId);
          return newSet;
        });

        toast.error('Failed to generate image for NFT');
      }
    });
  }, [imageGenQueries, imageGenStates, updateBoxImageMutation]);

  const handlePurchase = async (tier: keyof typeof MYSTERY_BOX_TIERS) => {
    const boxInfo = MYSTERY_BOX_TIERS[tier];
    if (!userCredits || (userCredits.credits || 0) < boxInfo.price) {
      toast.error('Insufficient credits');
      return;
    }

    setPurchasing(tier);
    try {
      await purchaseBoxMutation({
        purchaserAddress: userAddress,
        tier,
      });
      toast.success(`${boxInfo.name} purchased successfully!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to purchase mystery box');
    } finally {
      setPurchasing(null);
    }
  };

  const handleOpen = async (boxId: string) => {
    setOpening(boxId);
    try {
      await openBoxMutation({
        boxId: boxId as any,
        purchaserAddress: userAddress,
      });
      toast.success('Mystery box opened! Your new NFT is being generated.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to open mystery box');
    } finally {
      setOpening(null);
    }
  };

  const handleGenerateImage = async (box: any) => {
    if (!box.generatedNFT?.prompt || generatingImages.has(box._id)) return;

    setGeneratingImages((prev) => new Set(prev).add(box._id));

    try {
      const imageGenId = await generateImageMutation({
        userAddress: userAddress,
        prompt: box.generatedNFT.prompt,
      });

      setImageGenStates((prev) => ({
        ...prev,
        [box._id]: imageGenId,
      }));

      toast.success('Generating image from your NFT prompt...');
    } catch (error: any) {
      setGeneratingImages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(box._id);
        return newSet;
      });
      toast.error(error.message || 'Failed to generate image');
    }
  };

  const handleMint = async (box: any) => {
    const imageUrl = box.generatedNFT?.imageUrl;
    if (!imageUrl || !selectedAccount) return;

    setMintingBox(box._id);
    try {
      const result = await mintImageAsNFT({
        nftManager,
        selectedAccount,
        selectedCollectionId,
        newCollectionName,
        imageUrl: imageUrl,
        nftName,
      });

      if (result && syncFromSolana) {
        await syncFromSolana().catch(console.error);
      }
      toast.success('NFT minted successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to mint NFT');
    } finally {
      setMintingBox(null);
    }
  };

  if (userCredits === undefined || userBoxes === undefined) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="w-full">
              <CardHeader>
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const credits = userCredits?.credits || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Purchase Mystery Boxes</h3>
          <p className="text-sm text-muted-foreground">
            Each tier has increasing stat multipliers and better NFT quality
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4" />
          <span className="font-semibold">{credits} Credits</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {(
          Object.entries(MYSTERY_BOX_TIERS) as [
            keyof typeof MYSTERY_BOX_TIERS,
            (typeof MYSTERY_BOX_TIERS)[keyof typeof MYSTERY_BOX_TIERS],
          ][]
        ).map(([tier, info]) => {
          const Icon = info.icon;
          const canAfford = credits >= info.price;
          const isPurchasing = purchasing === tier;

          return (
            <Card
              key={tier}
              className={`${info.bgColor} border-2 transition-all hover:scale-105`}
            >
              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                  <Icon className={`h-8 w-8 ${info.color}`} />
                </div>
                <CardTitle className="text-lg">{info.name}</CardTitle>
                <CardDescription>{info.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1 text-lg font-bold">
                    <Coins className="h-4 w-4" />
                    {info.price}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {info.multiplier} Stats
                  </Badge>
                </div>
                <Button
                  onClick={() => handlePurchase(tier)}
                  disabled={!canAfford || isPurchasing}
                  className="w-full"
                  variant={canAfford ? 'default' : 'secondary'}
                >
                  {isPurchasing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                      Purchasing...
                    </>
                  ) : canAfford ? (
                    'Purchase'
                  ) : (
                    'Insufficient Credits'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Your Mystery Boxes</h3>
        {!userBoxes || userBoxes.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h4 className="text-lg font-semibold mb-2">No Mystery Boxes</h4>
            <p className="text-muted-foreground">
              Purchase a mystery box above to get started!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {userBoxes.map((box: any) => {
              const tierInfo =
                MYSTERY_BOX_TIERS[box.tier as keyof typeof MYSTERY_BOX_TIERS];
              const Icon = tierInfo.icon;
              const isOpening = opening === box._id;
              const hasImage = box.generatedNFT?.imageUrl;
              const isGeneratingImg = generatingImages.has(box._id);
              const isMinting = mintingBox === box._id;

              return (
                <Card key={box._id} className={`${tierInfo.bgColor} border`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-6 w-6 ${tierInfo.color}`} />
                        <div>
                          <CardTitle className="text-base">
                            {tierInfo.name}
                          </CardTitle>
                          <CardDescription>
                            Purchased{' '}
                            {formatDistanceToNow(new Date(box.purchasedAt), {
                              addSuffix: true,
                            })}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant={
                          box.status === 'unopened'
                            ? 'default'
                            : box.status === 'generating'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {box.status === 'unopened'
                          ? 'Ready to Open'
                          : box.status === 'generating'
                            ? 'Generating NFT...'
                            : 'Opened'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {box.status === 'unopened' && (
                      <Button
                        onClick={() => handleOpen(box._id)}
                        disabled={isOpening}
                        className="w-full"
                      >
                        {isOpening ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                            Opening...
                          </>
                        ) : (
                          <>
                            <Gift className="h-4 w-4 mr-2" />
                            Open Box
                          </>
                        )}
                      </Button>
                    )}

                    {box.status === 'generating' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2">
                          <Sparkles className="h-4 w-4 animate-pulse text-yellow-500" />
                          <span className="text-sm font-medium">
                            AI is crafting your unique NFT...
                          </span>
                        </div>
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                      </div>
                    )}

                    {box.status === 'opened' && box.generatedNFT && (
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-sm font-medium text-center mb-2">
                            🎉 Generated NFT
                          </div>
                          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                            {box.generatedNFT.prompt}
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${NFT_TYPE_COLORS[box.generatedNFT.stats.nftType as keyof typeof NFT_TYPE_COLORS]}`}
                          />
                          <span className="text-xs">
                            {NFT_TYPES[box.generatedNFT.stats.nftType]}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {box.generatedNFT.multiplier.toFixed(2)}x
                          </Badge>
                        </div>

                        {/* Image Section */}
                        {!hasImage && isGeneratingImg && (
                          <div className="text-center py-4 bg-muted/30 rounded-lg border-2 border-dashed border-yellow-500/50">
                            <div className="space-y-3">
                              <div className="flex items-center justify-center gap-2">
                                <Sparkles className="h-5 w-5 animate-pulse text-yellow-500" />
                                <span className="text-sm font-medium">
                                  Creating your NFT artwork...
                                </span>
                              </div>
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500 mx-auto" />
                            </div>
                          </div>
                        )}

                        {hasImage && (
                          <div className="space-y-4">
                            <div className="relative aspect-square max-w-xs mx-auto">
                              <Image
                                src={box.generatedNFT.imageUrl}
                                alt="Generated NFT"
                                fill
                                className="object-cover rounded-lg"
                              />
                            </div>

                            {/* Minting Section */}
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-primary flex items-center justify-center gap-2">
                                <Package className="h-4 w-4" />
                                Mint as NFT
                              </div>

                              {collections.length > 0 ? (
                                <Select
                                  onValueChange={setSelectedCollectionId}
                                  value={selectedCollectionId}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a collection" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {collections.map((col) => (
                                      <SelectItem key={col.id} value={col.id}>
                                        {typeof col.metadata?.name === 'string'
                                          ? col.metadata.name
                                          : col.id}
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="new">
                                      ✨ Create new collection
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                                  No collections found. Create a new one below.
                                </p>
                              )}

                              {(selectedCollectionId === 'new' ||
                                collections.length === 0) && (
                                <Input
                                  placeholder="Enter collection name..."
                                  value={newCollectionName}
                                  onChange={(e) =>
                                    setNewCollectionName(e.target.value)
                                  }
                                />
                              )}

                              <Input
                                placeholder="Enter NFT name..."
                                value={nftName}
                                onChange={(e) => setNftName(e.target.value)}
                              />

                              <Button
                                onClick={() => handleMint(box)}
                                disabled={
                                  isMinting ||
                                  (!selectedCollectionId &&
                                    !newCollectionName.trim()) ||
                                  !nftName.trim()
                                }
                                className="w-full"
                              >
                                {isMinting ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                                    Minting...
                                  </>
                                ) : (
                                  <>
                                    <Package className="h-4 w-4 mr-2" />
                                    Mint NFT
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              View Stats
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Generated NFT Stats</DialogTitle>
                              <DialogDescription>
                                {box.generatedNFT.prompt}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              <Badge variant="outline">
                                Attack: {box.generatedNFT.stats.attack}
                              </Badge>
                              <Badge variant="outline">
                                Defense: {box.generatedNFT.stats.defense}
                              </Badge>
                              <Badge variant="outline">
                                Intelligence:{' '}
                                {box.generatedNFT.stats.intelligence}
                              </Badge>
                              <Badge variant="outline">
                                Luck: {box.generatedNFT.stats.luck}
                              </Badge>
                              <Badge variant="outline">
                                Speed: {box.generatedNFT.stats.speed}
                              </Badge>
                              <Badge variant="outline">
                                Strength: {box.generatedNFT.stats.strength}
                              </Badge>
                              <Badge variant="outline">
                                Max Health: {box.generatedNFT.stats.maxHealth}
                              </Badge>
                              <Badge variant="outline">
                                Multiplier:{' '}
                                {box.generatedNFT.multiplier.toFixed(2)}x
                              </Badge>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
