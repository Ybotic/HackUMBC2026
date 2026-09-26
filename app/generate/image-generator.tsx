'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import Image from 'next/image';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { z } from 'zod';
import { useSolanaNFT } from '@/lib/providers/SolanaNFTProvider';
import { useSolana } from '@/lib/providers/SolanaProvider';
import type { UserCollection } from '@/lib/solanaNFTManager';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { mintImageAsNFT, getUserCollections } from '@/lib/mintNFT';
import { useNFTs } from '@/hooks/useNFTs';

export function ImageGenerator() {
  const [isLoading, setIsLoading] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [newCollectionName, setNewCollectionName] = useState<string>('');
  const [nftName, setNftName] = useState<string>('');

  const [generatedImage, setGeneratedImage] = useState<{
    url: string | null;
    dimensions: { width: number; height: number };
  }>({
    url: null,
    dimensions: { width: 1024, height: 1024 },
  });

  const [imageGenId, setImageGenId] = useState<Id<'imageGenerations'> | null>(
    null,
  );

  const { nftManager, isInitialized: isSolanaInitialized } = useSolanaNFT();
  const { selectedAccount } = useSolana();
  const { syncFromSolana } = useNFTs();

  const generateImageMutation = useMutation(api.images.generateImage);
  const imageQuery = useQuery(
    api.images.getImageGeneration,
    imageGenId ? { imageGenId } : 'skip',
  );

  const generateImageFormSchema = z.object({
    prompt: z.string().min(1, 'Prompt is required.'),
  });

  type GenerateImageFormInput = z.infer<typeof generateImageFormSchema>;

  useEffect(() => {
    if (!selectedAccount?.address || !isSolanaInitialized) return;
    (async () => {
      const cols = await getUserCollections(
        nftManager,
        selectedAccount.address,
      );
      setCollections(cols);
    })();
  }, [selectedAccount?.address, nftManager, isSolanaInitialized]);

  const handleMint = async () => {
    if (!generatedImage.url || !selectedAccount) return;

    setIsMinting(true);
    const result = await mintImageAsNFT({
      nftManager,
      selectedAccount,
      selectedCollectionId,
      newCollectionName,
      imageUrl: generatedImage.url,
      nftName,
    });

    setIsMinting(false);

    if (result) {
      setShowSuccessAnimation(true);

      setTimeout(() => {
        setGeneratedImage({
          url: null,
          dimensions: { width: 1024, height: 1024 },
        });
        setNftName('');
        setSelectedCollectionId('');
        setNewCollectionName('');
        setShowSuccessAnimation(false);
      }, 3000);

      if (syncFromSolana) {
        try {
          await syncFromSolana();
        } catch (error) {
          console.error('Error syncing after mint:', error);
        }
      }
    }
  };

  const form = useForm<GenerateImageFormInput>({
    resolver: zodResolver(generateImageFormSchema),
    defaultValues: {
      prompt: '',
    },
  });

  const onSubmit: SubmitHandler<GenerateImageFormInput> = async (data) => {
    if (!selectedAccount?.address) {
      toast.error('Wallet not connected');
      return;
    }
    setIsLoading(true);
    setGeneratedImage({ url: null, dimensions: { width: 1024, height: 1024 } });
    setImageGenId(null);
    toast.info('Generating image...');
    try {
      const id = await generateImageMutation({
        userAddress: selectedAccount.address,
        prompt: data.prompt,
      });
      setImageGenId(id);
      setGeneratedImage({
        url: null,
        dimensions: { width: 1024, height: 1024 },
      });
    } catch (err: any) {
      console.error('Error starting image generation:', err);
      toast.error(err.message || 'Error generating image.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (imageQuery?.imageUrl) {
      setGeneratedImage({
        url: imageQuery.imageUrl,
        dimensions: { width: 1024, height: 1024 },
      });
      setIsLoading(false);
    } else if (imageQuery?.status === 'failed') {
      toast.error(imageQuery.error || 'Image generation failed.');
      setIsLoading(false);
    }
  }, [imageQuery]);

  return (
    <div className="p-2">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            AI NFT Generator
          </h1>
          <p className="text-lg text-muted-foreground mx-auto">
            Create stunning AI-generated artwork and mint it directly as NFTs on
            Solana
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start">
          <div className="lg:order-1">
            <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 transition-colors duration-300 backdrop-blur-sm bg-card/80">
              <CardHeader className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-500 p-2 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      <line x1="9" x2="9.01" y1="9" y2="9" />
                      <line x1="15" x2="15.01" y1="9" y2="9" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-xl lg:text-2xl">
                      Create Your Vision
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-0"
                >
                  <CardContent className="space-y-6 lg:space-y-8">
                    <FormField
                      control={form.control}
                      name="prompt"
                      render={({ field }) => (
                        <FormItem className="space-y-3 lg:space-y-4">
                          <FormLabel className="text-base lg:text-lg font-semibold flex items-center space-x-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                            </svg>
                            <span>Describe Your Vision</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="A majestic dragon soaring through clouds at sunset, vibrant colors..."
                                className="h-12 lg:h-16 text-base lg:text-lg px-4 lg:px-6 py-3 lg:py-4 rounded-xl border-2 focus:border-primary transition-all duration-300 placeholder:text-muted-foreground/60 placeholder:opacity-75"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormDescription className="text-sm lg:text-base bg-muted/50 p-3 lg:p-4 rounded-lg border-l-4 border-green-500">
                            💡 <strong>Pro tip:</strong> Be detailed and
                            specific for the best results.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter className="pt-6 lg:pt-8">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 lg:h-14 text-base lg:text-lg font-semibold rounded-lg bg-green-500 hover:bg-green-600 transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl"
                    >
                      {isLoading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
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
                          Creating Magic...
                        </>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mr-2"
                          >
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                            <path d="M5 3v4" />
                            <path d="M19 17v4" />
                            <path d="M3 5h4" />
                            <path d="M17 19h4" />
                          </svg>
                          Generate Image
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </div>

          <div className="lg:order-2 lg:sticky lg:top-8">
            <Card className="w-full max-w-[512px] aspect-square mx-auto flex flex-col border-2 backdrop-blur-sm bg-card/80">
              <CardHeader className="w-full border-b">
                <CardTitle className="text-center text-lg lg:text-xl flex items-center justify-center space-x-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                  <span>Live Preview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center flex-grow p-4 overflow-hidden">
                {showSuccessAnimation && (
                  <div className="flex flex-col items-center text-green-600 animate-in fade-in-0 duration-300">
                    <div className="relative mb-4">
                      <svg
                        className="h-12 w-12 text-green-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-lg font-medium mb-1">
                      NFT Minted Successfully
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your artwork is now minted on Solana
                    </p>
                  </div>
                )}
                {isLoading && !showSuccessAnimation && (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-green-400 rounded-full blur-md opacity-15 animate-pulse" />
                      <svg
                        className="relative animate-spin h-16 w-16 text-green-500"
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
                    </div>
                    <p className="text-base lg:text-lg font-medium">
                      Generating your masterpiece...
                    </p>
                    <p className="text-xs lg:text-sm opacity-70 mt-1">
                      This may take a few moments
                    </p>
                  </div>
                )}
                {!isLoading && !showSuccessAnimation && generatedImage.url && (
                  <div className="relative group">
                    <div className="absolute inset-0 bg-green-400 rounded-2xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity duration-300" />
                    <Image
                      src={generatedImage.url}
                      alt="Generated image"
                      width={1024}
                      height={1024}
                      className="relative rounded-2xl object-contain w-full h-full shadow-2xl"
                      priority
                    />
                  </div>
                )}
                {!isLoading && !showSuccessAnimation && !generatedImage.url && (
                  <div className="text-center text-muted-foreground p-12">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-gradient-to-r from-muted to-muted/50 rounded-full blur-lg opacity-10" />
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="80"
                        height="80"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="relative mx-auto opacity-30"
                      >
                        <rect
                          width="18"
                          height="18"
                          x="3"
                          y="3"
                          rx="2"
                          ry="2"
                        />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    </div>
                    <h3 className="text-lg lg:text-xl font-semibold mb-3">
                      Ready to Create?
                    </h3>
                  </div>
                )}
              </CardContent>
              {generatedImage.url && !showSuccessAnimation && (
                <CardFooter className="pt-4 flex flex-col items-center space-y-4 w-full border-t bg-muted/20">
                  <div className="flex space-x-3 w-full">
                    <Button
                      variant="outline"
                      asChild
                      className="flex-1 h-10 rounded-xl"
                    >
                      <a
                        href={generatedImage.url}
                        download={`ai_generated_${Date.now()}.png`}
                        className="flex items-center justify-center space-x-2"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" x2="12" y1="15" y2="3" />
                        </svg>
                        <span>Download</span>
                      </a>
                    </Button>
                  </div>
                  <div className="w-full space-y-2">
                    <div className="flex items-center space-x-2 text-sm font-medium text-green-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2v20M2 12h20" />
                      </svg>
                      <span>Mint as NFT</span>
                    </div>
                    {collections.length > 0 ? (
                      <Select
                        onValueChange={setSelectedCollectionId}
                        value={selectedCollectionId}
                      >
                        <SelectTrigger className="w-full h-10 rounded-lg">
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
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        className="h-10 rounded-lg"
                      />
                    )}
                    <Input
                      placeholder="Enter NFT name..."
                      value={nftName}
                      onChange={(e) => setNftName(e.target.value)}
                      className="h-10 rounded-lg"
                    />
                    <Button
                      onClick={handleMint}
                      disabled={
                        isMinting ||
                        (!selectedCollectionId && !newCollectionName.trim()) ||
                        !nftName.trim()
                      }
                      className="w-full h-10 rounded-xl bg-green-500 hover:bg-green-600 transition-all duration-300"
                    >
                      {isMinting ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-5 w-5"
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
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mr-2"
                          >
                            <path d="M12 2v20M2 12h20" />
                          </svg>
                          Mint NFT
                        </>
                      )}
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
