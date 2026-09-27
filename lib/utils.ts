import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getNFTMetadata = (metadata: unknown) => {
  if (!metadata || typeof metadata !== 'object') return null;
  return metadata as { name?: string; image?: string; description?: string };
};

export const getIpfsImageUrl = (metadata: unknown): string | null => {
  if (!metadata || typeof metadata !== 'object' || !('image' in metadata)) {
    return null;
  }

  const image = metadata.image;
  if (typeof image !== 'string' || !image.trim()) return null;

  const normalizedImage = image.trim();
  const ipfsUri = normalizedImage.match(/^ipfs:\/\/(?:ipfs\/)?(.+)$/i);
  if (ipfsUri) {
    return `https://gateway.pinata.cloud/ipfs/${ipfsUri[1]}`;
  }

  // Keep complete URLs (Pinata, Arweave, and other gateways) intact.
  if (/^[a-z][a-z\d+.-]*:/i.test(normalizedImage)) return normalizedImage;
  if (normalizedImage.startsWith('//')) return `https:${normalizedImage}`;
  if (normalizedImage.startsWith('/')) return normalizedImage;

  // Older metadata may contain only an IPFS CID or CID/path.
  return `https://gateway.pinata.cloud/ipfs/${normalizedImage.replace(/^ipfs\//i, '')}`;
};
