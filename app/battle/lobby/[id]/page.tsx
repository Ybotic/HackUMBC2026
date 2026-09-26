'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { Button } from '@/components/ui/button';
import { Users, ImageIcon } from 'lucide-react';
import { PageStateCard } from '@/components/battle/PageStateCard';
import { NFTSelector } from '@/components/battle/NFTSelector';
import { toast } from 'sonner';
import { useNFTs } from '@/hooks/useNFTs';
import { OpponentNFTDisplay } from '@/components/lobby/OpponentNFTDisplay';
import { PlayerCard } from '@/components/lobby/PlayerCard';
import { LobbyStatusCard } from '@/components/lobby/LobbyStatusCard';
import { WaitingPlayerDisplay } from '@/components/lobby/WaitingPlayerDisplay';
import { BattleReadinessCard } from '@/components/lobby/BattleReadinessCard';

interface LobbyPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function LobbyPage({ params }: LobbyPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const {
    selectedAccount,
    isInitialized,
    isReady: isWalletReady,
  } = useSolana();
  const { nfts } = useNFTs();

  const [selectedNFT, setSelectedNFT] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isStartingBattle, setIsStartingBattle] = useState(false);

  const lobbyId = Array.isArray(id) ? id[0] : (id ?? '');
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/battle/lobby/${lobbyId}`
      : '';

  const lobby = useQuery(api.lobby.getLobby, { lobbyId });
  const battleIdFromLobby = useQuery(
    api.lobby.getBattleFromLobby,
    lobby?.status === 'started' ? { lobbyId } : 'skip',
  );
  const updateLobbyNFT = useMutation(api.lobby.updateLobbyNFT);
  const startBattleFromLobby = useMutation(api.lobby.startBattleFromLobby);
  const joinLobby = useMutation(api.lobby.joinLobby);
  const creatorNFTMetadata = useQuery(
    api.nft.getNFTMetadata,
    lobby?.creatorNFT
      ? {
          collection: lobby.creatorNFT.collection,
          item: lobby.creatorNFT.item,
        }
      : 'skip',
  );
  const joinerNFTMetadata = useQuery(
    api.nft.getNFTMetadata,
    lobby?.joinerNFT
      ? {
          collection: lobby.joinerNFT.collection,
          item: lobby.joinerNFT.item,
        }
      : 'skip',
  );

  const isCreator = selectedAccount?.address === lobby?.creatorAddress;
  const isJoiner = selectedAccount?.address === lobby?.joinedPlayerAddress;
  const isInLobby = isCreator || isJoiner;

  useEffect(() => {
    if (lobby && selectedAccount && !isInLobby && lobby.status === 'waiting') {
      joinLobby({
        lobbyId,
        playerAddress: selectedAccount.address,
        playerName: selectedAccount.meta.name,
      }).catch(console.error);
    }
  }, [lobby, selectedAccount, isInLobby]);

  useEffect(() => {
    if (lobby?.status === 'started' && battleIdFromLobby) {
      router.push(`/battle/play/${battleIdFromLobby}`);
    }
  }, [lobby?.status, battleIdFromLobby, router]);

  const handleNFTSelect = async (nft: any) => {
    if (!selectedAccount || !isInLobby) return;

    setSelectedNFT(nft);

    try {
      await updateLobbyNFT({
        lobbyId,
        playerAddress: selectedAccount.address,
        nftCollection: nft.collection,
        nftItem: nft.item,
        isReady: false, // Reset ready state when changing NFT
      });
      setIsReady(false);
    } catch (error) {
      console.error('Failed to update NFT:', error);
      toast.error('Failed to select NFT');
    }
  };

  const handleReadyToggle = async () => {
    if (!selectedAccount || !selectedNFT || !isInLobby) return;

    const newReadyState = !isReady;
    setIsReady(newReadyState);

    try {
      await updateLobbyNFT({
        lobbyId,
        playerAddress: selectedAccount.address,
        nftCollection: selectedNFT.collection,
        nftItem: selectedNFT.item,
        isReady: newReadyState,
      });
    } catch (error) {
      console.error('Failed to update ready state:', error);
      setIsReady(!newReadyState); // Revert on error
      toast.error('Failed to update ready state');
    }
  };

  const handleStartBattle = async () => {
    if (!selectedAccount || !lobby) return;

    setIsStartingBattle(true);

    try {
      const battleData = await startBattleFromLobby({
        lobbyId,
        initiatorAddress: selectedAccount.address,
      });

      toast.success('Battle created successfully!');
      router.push(`/battle/play/${battleData.battleId}`);
    } catch (error: any) {
      console.error('Failed to start battle:', error);
      toast.error(error.message || 'Failed to start battle');
    } finally {
      setIsStartingBattle(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success('Lobby link copied!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  if (!isInitialized) {
    return (
      <PageStateCard
        variant="loading"
        message="Initializing wallet connection..."
      />
    );
  }

  if (!selectedAccount) {
    return (
      <PageStateCard
        variant="walletConnect"
        message="Please connect your wallet to join this lobby."
      />
    );
  }

  if (!lobby) {
    return <PageStateCard variant="loading" message="Loading lobby..." />;
  }

  if (lobby.status === 'expired' || lobby.status === 'cancelled') {
    return (
      <PageStateCard
        title={`Lobby ${lobby.status}`}
        message="This lobby is no longer available."
        buttonText="Back to Battle Arena"
        redirectTo="/battle"
      />
    );
  }

  if (lobby.status === 'started') {
    return (
      <PageStateCard
        variant="loading"
        message="Battle is starting! Redirecting to battle arena..."
      />
    );
  }

  const bothPlayersReady =
    lobby.creatorNFT?.isReady && lobby.joinerNFT?.isReady;
  const canStartBattle = bothPlayersReady && isCreator && isWalletReady;

  // Check if current player can mark themselves as ready
  const canBeReady = isWalletReady;

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Battle Lobby</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Lobby ID: {lobbyId}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/battle">← Back to Arena</Link>
          </Button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <LobbyStatusCard lobby={lobby} shareUrl={shareUrl} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <PlayerCard
              playerNumber={1}
              title="Player 1 (Creator)"
              playerName={lobby.creatorName}
              playerAddress={lobby.creatorAddress}
              isCurrentUser={isCreator}
              nftData={lobby.creatorNFT}
              isJoined={true}
              gradientColor="from-primary/5"
              avatarColors="from-red-500 to-red-600"
            >
              {isCreator ? (
                <NFTSelector
                  nfts={nfts || []}
                  selectedNFT={selectedNFT}
                  onNFTSelect={handleNFTSelect}
                  isReady={isReady}
                  onReadyToggle={handleReadyToggle}
                  canBeReady={canBeReady}
                />
              ) : (
                <div className="space-y-6">
                  {lobby.creatorNFT ? (
                    <OpponentNFTDisplay
                      nftData={lobby.creatorNFT}
                      nftMetadata={creatorNFTMetadata}
                      playerColor="bg-primary"
                    />
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Selecting NFT...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </PlayerCard>

            <PlayerCard
              playerNumber={2}
              title={`Player 2 ${lobby.joinedPlayerAddress ? '(Joined)' : '(Waiting)'}`}
              playerName={lobby.joinedPlayerName}
              playerAddress={lobby.joinedPlayerAddress}
              isCurrentUser={isJoiner}
              nftData={lobby.joinerNFT}
              isJoined={!!lobby.joinedPlayerAddress}
              gradientColor="from-blue-500/5"
              avatarColors="from-blue-500 to-blue-600"
            >
              {lobby.joinedPlayerAddress ? (
                isJoiner ? (
                  <NFTSelector
                    nfts={nfts || []}
                    selectedNFT={selectedNFT}
                    onNFTSelect={handleNFTSelect}
                    isReady={isReady}
                    onReadyToggle={handleReadyToggle}
                    canBeReady={canBeReady}
                  />
                ) : (
                  <div className="space-y-6">
                    {lobby.joinerNFT ? (
                      <OpponentNFTDisplay
                        nftData={lobby.joinerNFT}
                        nftMetadata={joinerNFTMetadata}
                        playerColor="bg-blue-500"
                      />
                    ) : (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Selecting NFT...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <WaitingPlayerDisplay />
              )}
            </PlayerCard>
          </div>

          <BattleReadinessCard
            bothPlayersReady={bothPlayersReady || false}
            isCreator={isCreator}
            canStartBattle={canStartBattle || false}
            isStartingBattle={isStartingBattle}
            onStartBattle={handleStartBattle}
            creatorReady={!!lobby.creatorNFT?.isReady}
            joinerReady={!!lobby.joinerNFT?.isReady}
          />
        </div>
      </main>
    </div>
  );
}
