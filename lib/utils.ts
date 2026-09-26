import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getNFTMetadata = (metadata: unknown) => {
  if (!metadata || typeof metadata !== 'object') return null;
  return metadata as { name?: string; image?: string; description?: string };
};

export const getIpfsImageUrl = (metadata: any) => {
  if (!metadata?.image) return null;
  const { image } = metadata;
  if (image.startsWith('ipfs://')) {
    return `https://gateway.pinata.cloud/ipfs/${image.replace('ipfs://', '')}`;
  }
  if (typeof image === 'string' && image.length > 40) {
    return `https://gateway.pinata.cloud/ipfs/${image}`;
  }
  return image;
};
