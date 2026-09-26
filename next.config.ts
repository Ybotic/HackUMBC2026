import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'd4izytthgfmbpa4h.public.blob.vercel-storage.com', // vercel blob url
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud', // ipfs gateway url
      },
    ],
  },
};

export default nextConfig;
