import { createClient, type ClusterUrl } from '@solana/kit';
import { solanaRpc } from '@solana/kit-plugin-rpc';
import { walletSigner } from '@solana/kit-plugin-wallet';
import { env } from '@/env';

export type SolanaCluster = 'devnet' | 'testnet' | 'mainnet';

export const SOLANA_CLUSTER = env.NEXT_PUBLIC_SOLANA_CLUSTER;
export const SOLANA_RPC_URL = env.NEXT_PUBLIC_SOLANA_RPC_URL;
export const SOLANA_CHAIN = `solana:${SOLANA_CLUSTER}` as const;

export const solanaClient = createClient()
  .use(walletSigner({ chain: SOLANA_CHAIN, autoConnect: true }))
  .use(solanaRpc({ rpcUrl: SOLANA_RPC_URL as ClusterUrl }));

export type SolanaClient = typeof solanaClient;

export function getSolanaExplorerUrl(
  type: 'address' | 'tx',
  value: string,
): string {
  const cluster =
    SOLANA_CLUSTER === 'mainnet' ? '' : `?cluster=${SOLANA_CLUSTER}`;
  return `https://explorer.solana.com/${type}/${value}${cluster}`;
}
