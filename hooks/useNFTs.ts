'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { useSolanaNFT } from '@/lib/providers/SolanaNFTProvider';

type SyncOptions = { expectedItemId?: string };
type SyncResult =
  | { success: false; error: string }
  | { success: true; nftCount: number; collectionCount: number };

const AUTO_SYNC_STALE_AFTER_MS = 5 * 60 * 1000;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toConvexSerializable(value: unknown): unknown {
  if (typeof value === 'bigint') {
    // Solana account fields are often unsigned u64s, while Convex only accepts
    // signed 64-bit integers. Keep the full value as a decimal string.
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(toConvexSerializable);
  }

  if (value instanceof Uint8Array) {
    return Array.from(value);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        toConvexSerializable(nestedValue),
      ]),
    );
  }

  return value;
}

export function useNFTs({ autoSyncIfStale = false } = {}) {
  const { isReady, selectedAccount } = useSolana();
  const { nftManager, isInitialized } = useSolanaNFT();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastAutoSyncAddress, setLastAutoSyncAddress] = useState<string | null>(
    null,
  );
  const syncInFlight = useRef<Promise<SyncResult> | null>(null);

  const createOrGetUser = useMutation(api.users.createOrGetUser);
  const syncUserNFTs = useMutation(api.nft.syncUserNFTs);
  const syncUserCollections = useMutation(api.nft.syncUserCollections);

  const address = selectedAccount?.address;
  const nfts = useQuery(api.nft.getUserNFTs, address ? { address } : 'skip');
  const collections = useQuery(
    api.nft.getUserCollections,
    address ? { address } : 'skip',
  );
  const lastSyncTime = useQuery(
    api.nft.getLastSyncTime,
    address ? { address } : 'skip',
  );

  const initializeUser = useCallback(async () => {
    if (!isReady || !address) return false;
    try {
      await createOrGetUser({ address });
      return true;
    } catch (error) {
      console.error('Error initializing user:', error);
      return false;
    }
  }, [address, createOrGetUser, isReady]);

  const syncFromSolana = useCallback(
    async (options: SyncOptions = {}): Promise<SyncResult> => {
      if (!isReady || !address || !isInitialized) {
        return { success: false, error: 'Not ready to sync' };
      }

      const activeSync = syncInFlight.current;
      if (activeSync) {
        if (!options.expectedItemId) return activeSync;
        await activeSync.catch(() => undefined);
        // A sync that began before mint may have read the pre-mint owner state.
        // Start a fresh pass after it completes instead of dropping this call.
        if (syncInFlight.current) return syncInFlight.current;
      }

      const currentSync: Promise<SyncResult> =
        (async (): Promise<SyncResult> => {
          setIsSyncing(true);
          try {
            const initialized = await initializeUser();
            if (!initialized) {
              throw new Error('Could not initialize the wallet account.');
            }

            const expectedItemId = options.expectedItemId;
            const retryDelays = [750, 1500, 3000];
            let solanaNFTs: Awaited<ReturnType<typeof nftManager.getUserNFTs>> =
              [];

            for (let attempt = 0; ; attempt++) {
              solanaNFTs = await nftManager.getUserNFTs(address, {
                forceRefresh: !!expectedItemId,
              });

              if (
                !expectedItemId ||
                solanaNFTs.some((nft) => nft.item === expectedItemId)
              ) {
                break;
              }

              const delay = retryDelays[attempt];
              if (delay === undefined) {
                return {
                  success: false,
                  error:
                    'Mint confirmed, but the new NFT is not visible to the RPC yet. Try syncing again in a few seconds.',
                };
              }

              await wait(delay);
            }

            const solanaCollections =
              await nftManager.getUserCollections(address);
            const serializableNFTs = solanaNFTs.map((nft) => ({
              ...nft,
              itemDetails: toConvexSerializable(nft.itemDetails),
            }));
            const serializableCollections = solanaCollections.map(
              (collection) => ({
                ...collection,
                details: toConvexSerializable(collection.details),
              }),
            );

            await Promise.all([
              syncUserNFTs({ address, nfts: serializableNFTs }),
              syncUserCollections({
                address,
                collections: serializableCollections,
              }),
            ]);

            return {
              success: true,
              nftCount: solanaNFTs.length,
              collectionCount: solanaCollections.length,
            };
          } catch (error) {
            console.error('Error syncing Solana NFTs:', error);
            return { success: false, error: String(error) };
          }
        })();
      syncInFlight.current = currentSync;
      try {
        return await currentSync;
      } finally {
        if (syncInFlight.current === currentSync) {
          syncInFlight.current = null;
          setIsSyncing(false);
        }
      }
    },
    [
      address,
      initializeUser,
      isInitialized,
      isReady,
      nftManager,
      syncUserCollections,
      syncUserNFTs,
    ],
  );

  useEffect(() => {
    if (
      isReady &&
      address &&
      isInitialized &&
      nfts !== undefined &&
      lastSyncTime !== undefined &&
      !isSyncing &&
      lastAutoSyncAddress !== address
    ) {
      const syncIsStale =
        lastSyncTime === null ||
        (autoSyncIfStale &&
          Date.now() - lastSyncTime > AUTO_SYNC_STALE_AFTER_MS);
      if (syncIsStale) {
        setLastAutoSyncAddress(address);
        void syncFromSolana();
      }
    }
  }, [
    address,
    autoSyncIfStale,
    isInitialized,
    isReady,
    isSyncing,
    lastSyncTime,
    lastAutoSyncAddress,
    nfts,
    syncFromSolana,
  ]);

  const burnNFT = async (_collectionId: string, itemId: string) => {
    if (!isReady || !address || !isInitialized) {
      return { success: false, error: 'Not ready to burn NFT' };
    }
    try {
      const result = await nftManager.burnNFT(itemId);
      await syncFromSolana();
      return { success: true, result };
    } catch (error) {
      console.error('Error burning NFT:', error);
      return { success: false, error: String(error) };
    }
  };

  return {
    nfts,
    collections,
    lastSyncTime,
    isSyncing,
    syncFromSolana,
    burnNFT,
    initializeUser,
  };
}
