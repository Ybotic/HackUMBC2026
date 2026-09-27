import { toast } from 'sonner';
import type { SolanaNFTManager, UserCollection } from '@/lib/solanaNFTManager';

async function uploadMetadata(
  imageUrl: string,
  name: string,
  description: string,
): Promise<{ image: string; metadata: string }> {
  const response = await fetch('/api/ipfs/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: imageUrl,
      metadata: {
        name,
        description:
          description.trim() || `${name}, an AI-generated Mint trading card.`,
        attributes: [],
      },
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'IPFS upload failed');
  return { image: data.url, metadata: data.metadataUrl };
}

async function uploadCollectionMetadata(name: string): Promise<string> {
  const response = await fetch('/api/ipfs/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metadataOnly: { name, description: `${name} cards` },
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Collection metadata upload failed');
  }
  return data.metadataUrl;
}

export async function mintImageAsNFT({
  nftManager,
  selectedAccount,
  selectedCollectionId,
  newCollectionName,
  imageUrl,
  nftName,
  description,
}: {
  nftManager: SolanaNFTManager;
  selectedAccount: { address: string };
  selectedCollectionId: string;
  newCollectionName: string;
  imageUrl: string;
  nftName: string;
  description: string;
}) {
  if (!selectedAccount) {
    toast.error('Wallet not connected');
    return null;
  }

  try {
    let collectionId = selectedCollectionId;
    if (collectionId === 'new' || (!collectionId && newCollectionName.trim())) {
      const collectionName = newCollectionName.trim() || 'Mint TCG Cards';
      const collectionUri = await uploadCollectionMetadata(collectionName);
      const collection = await nftManager.createCollection(
        collectionName,
        collectionUri,
      );
      collectionId = collection.id;
    }

    const uploaded = await uploadMetadata(imageUrl, nftName, description);
    const result = await nftManager.mintNFT({
      collectionId: collectionId || undefined,
      name: nftName,
      metadataUri: uploaded.metadata,
    });

    toast.success(`Card minted on Solana: ${result.itemId.slice(0, 8)}…`);
    return result;
  } catch (error) {
    console.error('Minting error:', error);
    toast.error(error instanceof Error ? error.message : 'Error minting NFT');
    return null;
  }
}

export async function getUserCollections(
  nftManager: SolanaNFTManager,
  userAddress: string,
): Promise<UserCollection[]> {
  try {
    const collections = await nftManager.getUserCollections(userAddress);
    return collections.sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    console.error('Error fetching collections:', error);
    return [];
  }
}
