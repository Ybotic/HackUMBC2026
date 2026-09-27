import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const optionalEnvString = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().min(1).optional(),
);

export const env = createEnv({
  server: {
    PINATA_JWT: z.string().min(1),
    CONVEX_DEPLOYMENT: optionalEnvString,
    // necessary only for prod on vercel
    CONVEX_DEPLOY_KEY: optionalEnvString,
    // Set automatically when a Vercel Blob store is connected to this project.
    BLOB_STORE_ID: optionalEnvString,
    // Optional custom variable names for the Mint Blob store configuration.
    MINT_STORE_ID: optionalEnvString,
    MINT_READ_WRITE_TOKEN: optionalEnvString,
    // Fallback for non-Vercel runtimes (including the Convex image generation action).
    BLOB_READ_WRITE_TOKEN: optionalEnvString,
  },
  client: {
    NEXT_PUBLIC_GATEWAY_URL: z.string().min(1),
    NEXT_PUBLIC_CONVEX_URL: z.string().min(1),
    NEXT_PUBLIC_SOLANA_RPC_URL: z
      .string()
      .url()
      .default('https://api.devnet.solana.com'),
    NEXT_PUBLIC_SOLANA_CLUSTER: z
      .enum(['devnet', 'testnet', 'mainnet'])
      .default('devnet'),
  },
  runtimeEnv: {
    PINATA_JWT: process.env.PINATA_JWT,
    CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
    CONVEX_DEPLOY_KEY: process.env.CONVEX_DEPLOY_KEY,
    NEXT_PUBLIC_GATEWAY_URL: process.env.NEXT_PUBLIC_GATEWAY_URL,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    NEXT_PUBLIC_SOLANA_CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER,
    BLOB_STORE_ID: process.env.BLOB_STORE_ID,
    MINT_STORE_ID: process.env.MINT_STORE_ID,
    MINT_READ_WRITE_TOKEN: process.env.MINT_READ_WRITE_TOKEN,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  },
});
