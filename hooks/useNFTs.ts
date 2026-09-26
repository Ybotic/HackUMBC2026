'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { useSolanaNFT } from '@/lib/providers/SolanaNFTProvider';

export function useNFTs() {
  const { isReady, selectedAccount } = useSolana();
  const { nftManager, isInitialized } = useSolanaNFT();
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasAttemptedInitialSync, setHasAttemptedInitialSync] = useState(false);

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

  const syncFromSolana = useCallback(async () => {
    if (!isReady || !address || !isInitialized || isSyncing) {
      return { success: false, error: 'Not ready to sync' };
    }

    setIsSyncing(true);
    try {
      await initializeUser();
      const solanaNFTs = await nftManager.getUserNFTs(address);
      const solanaCollections = await nftManager.getUserCollections(address);

      await Promise.all([
        syncUserNFTs({ address, nfts: solanaNFTs }),
        syncUserCollections({ address, collections: solanaCollections }),
      ]);

      return {
        success: true,
        nftCount: solanaNFTs.length,
        collectionCount: solanaCollections.length,
      };
    } catch (error) {
      console.error('Error syncing Solana NFTs:', error);
      return { success: false, error: String(error) };
    } finally {
      setIsSyncing(false);
    }
  }, [
    address,
    initializeUser,
    isInitialized,
    isReady,
    isSyncing,
    nftManager,
    syncUserCollections,
    syncUserNFTs,
  ]);

  useEffect(() => {
    if (
      isReady &&
      address &&
      isInitialized &&
      nfts !== undefined &&
      nfts.length === 0 &&
      !lastSyncTime &&
      !isSyncing &&
      !hasAttemptedInitialSync
    ) {
      setHasAttemptedInitialSync(true);
      void syncFromSolana();
    }
  }, [
    address,
    hasAttemptedInitialSync,
    isInitialized,
    isReady,
    isSyncing,
    lastSyncTime,
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
