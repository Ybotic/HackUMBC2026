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
import { formatDistanceToNow } from 'date-fns';
import { Check, Coins, Package, Gift, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  MINT_CLAIM_TTL_MS,
  MYSTERY_BOX_TIERS,
  NFT_TYPES,
  NFT_TYPE_COLORS,
} from '@/lib/constants/marketplace';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import type { FunctionReturnType } from 'convex/server';

interface MysteryBoxesProps {
  userAddress: string;
  userCredits: number;
  userBoxes: FunctionReturnType<typeof api.marketplace.getUserMysteryBoxes>;
}

export function MysteryBoxes({
  userAddress,
  userCredits,
  userBoxes,
}: MysteryBoxesProps) {
  const purchaseBoxMutation = useMutation(api.marketplace.purchaseMysteryBox);
  const openBoxMutation = useMutation(api.marketplace.openMysteryBox);
  const generateImageMutation = useMutation(api.images.generateImage);
  const updateBoxImageMutation = useMutation(
    api.marketplace.updateMysteryBoxImage,
  );
  const claimMintMutation = useMutation(api.marketplace.claimMysteryBoxMint);
  const completeMintMutation = useMutation(
    api.marketplace.completeMysteryBoxMint,
  );
  const releaseMintMutation = useMutation(
    api.marketplace.releaseMysteryBoxMint,
  );

  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(
    new Set(),
  );
  const [mintingBox, setMintingBox] = useState<string | null>(null);
  const [mintDialogBox, setMintDialogBox] = useState<string | null>(null);
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
    if (userCredits < boxInfo.price) {
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
    if (!imageUrl || !selectedAccount || box.mintStatus === 'minted') return;

    setMintingBox(box._id);
    try {
      await claimMintMutation({
        boxId: box._id,
        purchaserAddress: userAddress,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to mint NFT');
      setMintingBox(null);
      return;
    }

    let result: Awaited<ReturnType<typeof mintImageAsNFT>> = null;
    try {
      result = await mintImageAsNFT({
        nftManager,
        selectedAccount,
        selectedCollectionId,
        newCollectionName,
        imageUrl: imageUrl,
        nftName,
        description: box.generatedNFT.prompt,
      });
    } finally {
      if (result) {
        await completeMintMutation({
          boxId: box._id,
          purchaserAddress: userAddress,
          itemId: result.itemId,
        }).catch(console.error);
      } else {
        await releaseMintMutation({
          boxId: box._id,
          purchaserAddress: userAddress,
        }).catch(console.error);
      }
      setMintingBox(null);
    }

    if (!result) return;

    setMintDialogBox(null);
    setNftName('');

    if (syncFromSolana) {
      const syncResult = await syncFromSolana({
        expectedItemId: result.itemId,
      });
      if (!syncResult.success) {
        toast.info(
          'Mint confirmed. Dashboard sync is delayed; use Sync NFTs to retry in a few seconds.',
        );
      }
    }
  };

  const credits = userCredits;

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
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-lg font-semibold">Your Mystery Boxes</h3>
          {userBoxes && userBoxes.length > 0 && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {userBoxes.length}
            </span>
          )}
        </div>
        {!userBoxes || userBoxes.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed">
            <Package
              className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3"
              strokeWidth={1.5}
            />
            <p className="text-sm text-muted-foreground">
              No mystery boxes yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {userBoxes.map((box: any) => {
              const tierInfo =
                MYSTERY_BOX_TIERS[box.tier as keyof typeof MYSTERY_BOX_TIERS];
              const Icon = tierInfo.icon;
              const nft = box.generatedNFT;
              const isOpening = opening === box._id;
              const hasImage = Boolean(nft?.imageUrl);
              const isUnopened = box.status === 'unopened';
              const isPending = !isUnopened && !hasImage;
              const isMinting = mintingBox === box._id;
              const isMinted = box.mintStatus === 'minted';
              const isMintLocked =
                !isMinting &&
                box.mintStatus === 'minting' &&
                Date.now() - (box.mintStartedAt ?? 0) < MINT_CLAIM_TTL_MS;
              const canMint = hasImage && !isMinted && !isMintLocked;

              return (
                <Card
                  key={box._id}
                  className="group overflow-hidden p-0 gap-0 transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-square bg-muted/40 border-b overflow-hidden">
                    {hasImage ? (
                      <Image
                        src={nft.imageUrl}
                        alt={tierInfo.name}
                        fill
                        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : isPending ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Skeleton className="absolute inset-0 rounded-none bg-muted" />
                        <Loader2 className="relative h-5 w-5 animate-spin text-muted-foreground/70" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon
                          className={`h-12 w-12 ${tierInfo.color} opacity-80`}
                          strokeWidth={1.25}
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {tierInfo.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(box.purchasedAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      {nft && (
                        <span className="text-xs font-medium text-muted-foreground tabular-nums">
                          {nft.multiplier.toFixed(2)}x
                        </span>
                      )}
                    </div>

                    {nft?.stats && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span
                              className={`h-2 w-2 rounded-full ${NFT_TYPE_COLORS[nft.stats.nftType as keyof typeof NFT_TYPE_COLORS]}`}
                            />
                            {NFT_TYPES[nft.stats.nftType]}
                          </span>
                          <span className="text-muted-foreground tabular-nums">
                            {nft.stats.maxHealth} HP
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border bg-border text-center">
                          {[
                            ['ATK', nft.stats.attack],
                            ['DEF', nft.stats.defense],
                            ['SPD', nft.stats.speed],
                            ['STR', nft.stats.strength],
                            ['INT', nft.stats.intelligence],
                            ['LCK', nft.stats.luck],
                          ].map(([label, value]) => (
                            <div key={label} className="bg-card py-2">
                              <div className="text-[10px] tracking-wider text-muted-foreground">
                                {label}
                              </div>
                              <div className="text-sm font-medium tabular-nums">
                                {value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isUnopened && (
                      <Button
                        onClick={() => handleOpen(box._id)}
                        disabled={isOpening}
                        className="w-full"
                        size="sm"
                      >
                        {isOpening ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Gift className="h-4 w-4" />
                            Open
                          </>
                        )}
                      </Button>
                    )}

                    {hasImage && isMinted && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        disabled
                      >
                        <Check className="h-4 w-4" />
                        Minted
                      </Button>
                    )}

                    {hasImage && isMintLocked && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        disabled
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Minting
                      </Button>
                    )}

                    {canMint && (
                      <Dialog
                        open={mintDialogBox === box._id}
                        onOpenChange={(open) =>
                          setMintDialogBox(open ? box._id : null)
                        }
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" className="w-full">
                            Mint NFT
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-sm">
                          <DialogHeader>
                            <DialogTitle>Mint NFT</DialogTitle>
                            <DialogDescription>
                              Choose a collection and give it a name.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted/40">
                            <Image
                              src={nft.imageUrl}
                              alt={tierInfo.name}
                              fill
                              sizes="384px"
                              className="object-cover"
                            />
                          </div>

                          <div className="space-y-3">
                            {collections.length > 0 && (
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  Collection
                                </Label>
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
                                      New collection
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {(selectedCollectionId === 'new' ||
                              collections.length === 0) && (
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                  New collection name
                                </Label>
                                <Input
                                  placeholder="My collection"
                                  value={newCollectionName}
                                  onChange={(e) =>
                                    setNewCollectionName(e.target.value)
                                  }
                                />
                              </div>
                            )}

                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">
                                Name
                              </Label>
                              <Input
                                placeholder="NFT name"
                                value={nftName}
                                onChange={(e) => setNftName(e.target.value)}
                              />
                            </div>
                          </div>

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
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Minting
                              </>
                            ) : (
                              'Mint'
                            )}
                          </Button>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
