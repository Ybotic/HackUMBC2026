'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { useSolanaNFT } from '@/lib/providers/SolanaNFTProvider';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { mintImageAsNFT, getUserCollections } from '@/lib/mintNFT';
import type { UserCollection } from '@/lib/solanaNFTManager';
import { useNFTs } from '@/hooks/useNFTs';

type ImageGen = {
  _id: string;
  _creationTime: number;
  prompt: string;
  model: string;
  status: 'pending' | 'completed' | 'failed';
  imageUrl?: string;
  createdAt: number;
  completedAt?: number;
  userAddress: string;
  width?: number;
  height?: number;
};

export function ImageHistory() {
  const { selectedAccount } = useSolana();
  const userAddress = selectedAccount?.address;
  const [searchDate, setSearchDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const images = useQuery(
    api.images.getUserImages,
    userAddress ? { userAddress } : 'skip',
  );

  const filteredImages = useMemo(() => {
    if (!images) return [];

    let filtered = images;

    if (searchDate) {
      const date = new Date(searchDate);
      const start = new Date(date.setHours(0, 0, 0, 0));
      const end = new Date(date.setHours(23, 59, 59, 999));
      filtered = images.filter((img) => {
        const imgDate = new Date(img.createdAt);
        return imgDate >= start && imgDate <= end;
      });
    }

    return [...filtered].sort((a, b) =>
      sortOrder === 'newest'
        ? b.createdAt - a.createdAt
        : a.createdAt - b.createdAt,
    );
  }, [images, searchDate, sortOrder]);

  if (!userAddress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">
          Connect your wallet to view your image history
        </p>
      </div>
    );
  }

  if (!images) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card
              key={i}
              className="overflow-hidden flex flex-col bg-card border-2"
            >
              <CardHeader className="p-4 pb-2">
                <Skeleton className="h-5 w-2/3 mb-1" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="p-4 pt-2 flex-grow">
                <Skeleton className="w-full aspect-[5/7] rounded-lg" />
              </CardContent>
              <CardFooter className="p-4 pt-2 flex justify-center gap-3">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (filteredImages.length === 0 && images?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No images generated yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 items-center">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm font-medium">Search by date:</span>
            <Input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm font-medium">Sort:</span>
            <Select
              value={sortOrder}
              onValueChange={(value: 'newest' | 'oldest') =>
                setSortOrder(value)
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {(searchDate || sortOrder !== 'newest') && (
          <Button
            variant="outline"
            onClick={() => {
              setSearchDate('');
              setSortOrder('newest');
            }}
            className="text-sm"
          >
            Clear filters
          </Button>
        )}
      </div>

      {filteredImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">
            No images found for the selected date
          </p>
        </div>
      ) : (
        <TooltipProvider>
          <div className="w-full max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredImages.map((image) => (
                <ImageCard key={image._id} image={image} />
              ))}
            </div>
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}

function ImageCard({ image }: { image: ImageGen }) {
  const [mintOpen, setMintOpen] = useState(false);
  const { nftManager, isInitialized } = useSolanaNFT();
  const { selectedAccount } = useSolana();
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isInitialized && selectedAccount?.address && nftManager) {
      setLoading(true);
      getUserCollections(nftManager, selectedAccount.address)
        .then(setCollections)
        .finally(() => setLoading(false));
    }
  }, [isInitialized, selectedAccount?.address, nftManager]);

  return (
    <>
      <div className="group relative bg-card rounded-xl overflow-hidden border-2 hover:border-primary/20 hover:shadow-lg transition-all duration-300 ease-out">
        <div className="relative w-full aspect-[5/7] bg-muted/10 p-3">
          <div className="relative w-full h-full rounded-lg overflow-hidden bg-muted/20 ring-1 ring-border/50">
            {image.status === 'completed' && image.imageUrl ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative w-full h-full cursor-pointer">
                    <Image
                      src={image.imageUrl}
                      alt={image.prompt}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-3" side="top">
                  <p className="text-sm leading-relaxed">{image.prompt}</p>
                </TooltipContent>
              </Tooltip>
            ) : image.status === 'pending' ? (
              <div className="flex items-center justify-center w-full h-full">
                <div className="flex flex-col items-center space-y-3">
                  <svg
                    className="animate-spin h-8 w-8 text-primary/60"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <div className="text-center">
                    <span className="text-sm font-medium text-foreground">
                      Processing
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      This may take a few minutes
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <svg
                      className="h-6 w-6 text-destructive"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-destructive font-medium">
                    Generation Failed
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {image.status === 'completed' && image.imageUrl && (
          <div className="p-4 pt-0">
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="default"
                className="flex-1 h-10 hover:bg-muted/50 transition-colors duration-200"
                asChild
              >
                <a
                  href={image.imageUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-sm font-medium">Download</span>
                </a>
              </Button>
              <Button
                variant="default"
                size="default"
                className="flex-1 h-10 bg-primary hover:bg-primary/90 transition-colors duration-200"
                onClick={() => setMintOpen(true)}
                disabled={!isInitialized}
              >
                <svg
                  className="h-4 w-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                  />
                </svg>
                <span className="text-sm font-medium">Mint NFT</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {image.status === 'completed' && image.imageUrl && (
        <MintDialog
          open={mintOpen}
          setOpen={setMintOpen}
          imageUrl={image.imageUrl}
          description={image.prompt}
          nftManager={nftManager}
          isInitialized={isInitialized}
          collections={collections}
          loading={loading}
        />
      )}
    </>
  );
}

function MintDialog({
  open,
  setOpen,
  imageUrl,
  description,
  nftManager,
  isInitialized,
  collections,
  loading,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  imageUrl: string;
  description: string;
  nftManager: any;
  isInitialized: boolean;
  collections: UserCollection[];
  loading: boolean;
}) {
  const { selectedAccount } = useSolana();
  const { syncFromSolana } = useNFTs();
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [newCollectionName, setNewCollectionName] = useState<string>('');
  const [nftName, setNftName] = useState<string>('');
  const [minting, setMinting] = useState(false);

  const handleMint = async () => {
    if (!selectedAccount) return;

    setMinting(true);
    let result: Awaited<ReturnType<typeof mintImageAsNFT>>;
    try {
      result = await mintImageAsNFT({
        nftManager,
        selectedAccount,
        selectedCollectionId: selectedCollection,
        newCollectionName,
        imageUrl,
        nftName,
        description,
      });
    } finally {
      setMinting(false);
    }

    if (result) {
      setOpen(false);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl">Mint as NFT</DialogTitle>
          <DialogDescription className="text-base">
            Mint this image as a Metaplex Core NFT on Solana
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          <div className="relative w-full max-w-sm mx-auto aspect-[5/7] rounded-xl overflow-hidden bg-muted/20 ring-1 ring-border/50">
            <Image
              src={imageUrl}
              alt="Image to mint"
              fill
              sizes="400px"
              className="object-cover"
            />
          </div>

          {loading ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Loading collections...</span>
              </div>
            </div>
          ) : collections.length > 0 ? (
            <Select
              onValueChange={setSelectedCollection}
              value={selectedCollection}
            >
              <SelectTrigger className="w-full h-12">
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
                <SelectItem value="new">Create new collection</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No collections found. Please enter a new collection name below.
            </p>
          )}

          {(selectedCollection === 'new' ||
            (!loading && collections.length === 0)) && (
            <Input
              placeholder="New Collection Name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className="h-12"
            />
          )}

          <Input
            placeholder="NFT Name (e.g., 'My Amazing Artwork')"
            value={nftName}
            onChange={(e) => setNftName(e.target.value)}
            className="h-12"
          />
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="h-10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleMint}
            disabled={
              minting ||
              loading ||
              (!selectedCollection && !newCollectionName.trim()) ||
              !nftName.trim() ||
              !isInitialized
            }
            className="h-10"
          >
            {minting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Minting...
              </>
            ) : (
              'Mint NFT'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
