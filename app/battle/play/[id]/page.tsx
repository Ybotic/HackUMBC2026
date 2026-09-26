'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, AlertCircle, Loader2 } from 'lucide-react';
import { PageStateCard } from '@/components/battle/PageStateCard';
import { toast } from 'sonner';
import { getNFTTypeName } from '@/lib/battle-utils';
import { getNFTMetadata, getIpfsImageUrl } from '@/lib/utils';
import type { BattleMove } from '@/lib/battle-moves';
import { BattlePlayerPanel } from '@/components/battle/BattlePlayerPanel';
import { BattleArena } from '@/components/battle/BattleArena';
import { BattleMovesPanel } from '@/components/battle/BattleMovesPanel';
import { BattleLogPanel } from '@/components/battle/BattleLogPanel';

export default function BattlePlayPage() {
  const { id } = useParams();
  const { selectedAccount, isInitialized } = useSolana();
  const [isExecutingTurn, setIsExecutingTurn] = useState(false);
  const [selectedMove, setSelectedMove] = useState<BattleMove | null>(null);
  const [isScreenTooSmall, setIsScreenTooSmall] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');

  const battleId = Array.isArray(id) ? id[0] : (id ?? '');

  const [isReplayMode, setIsReplayMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setIsReplayMode(urlParams.get('replay') === 'true');
    }
  }, []);

  const battleData = useQuery(api.battle.getBattleWithNFTData, { battleId });
  const battle = battleData
    ? {
        ...battleData,
        player1NFT: battleData.player1NFT,
        player2NFT: battleData.player2NFT,
      }
    : null;
  const executeTurn = useMutation(api.battle.executeTurn);

  const player1Profile = useQuery(
    api.users.getUser,
    battle ? { address: battle.player1Address } : 'skip',
  );

  const player2Profile = useQuery(
    api.users.getUser,
    battle ? { address: battle.player2Address } : 'skip',
  );

  const isPlayer1 = selectedAccount?.address === battle?.player1Address;
  const isPlayer2 = selectedAccount?.address === battle?.player2Address;
  const isParticipant = isPlayer1 || isPlayer2;
  const isMyTurn = battle?.gameState.currentTurn === selectedAccount?.address;
  const isPending = !!battle?.gameState.pendingTurn;
  const isInitializing = battle?.gameState.status === 'initializing';

  useEffect(() => {
    const checkScreenSize = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      // - Left panel (BattlePlayerPanel): ~320px
      // - Right panel (BattleLogPanel): ~384px (w-96)
      // - Center area minimum: ~400px for arena + moves
      // - Margins/padding: ~400px
      const minRequiredWidth = 320 + 384 + 400 + 400; // 1504px
      const minRequiredHeight = 900;
      setIsScreenTooSmall(
        viewportWidth < minRequiredWidth || viewportHeight < minRequiredHeight,
      );
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleExecuteTurn = async () => {
    if (!selectedAccount || !battle || !isMyTurn || isPending || !selectedMove)
      return;

    setIsExecutingTurn(true);

    try {
      setConnectionStatus('Resolving turn...');
      const result = await executeTurn({
        battleId,
        playerAddress: selectedAccount.address,
        action: selectedMove.name,
      });
      setConnectionStatus(
        `${result.wasCritical ? 'Critical hit! ' : ''}${result.damage} damage dealt.`,
      );

      // Clear selected move after successful execution
      setSelectedMove(null);
    } catch (error: any) {
      console.error('Failed to execute turn:', error);

      setConnectionStatus(`Error: ${error.message}`);
      toast.error(error.message || 'Failed to execute turn');
    } finally {
      setIsExecutingTurn(false);
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
        message="Please connect your wallet to view this battle."
      />
    );
  }

  if (isScreenTooSmall) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold">Screen Space Insufficient</h2>
            <p className="text-muted-foreground">
              The Battle Arena needs more screen space to display all battle
              panels properly. Try zooming out, maximizing your window, or using
              a larger screen.
            </p>
            <div className="space-y-2 text-xs">
              <div className="text-muted-foreground">
                Current: {typeof window !== 'undefined' ? window.innerWidth : 0}
                x{typeof window !== 'undefined' ? window.innerHeight : 0}px
              </div>
              <div className="font-medium">
                Recommended: 1504x600px or larger
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!battle) {
    return <PageStateCard variant="loading" message="Loading battle..." />;
  }

  if (!isParticipant) {
    return (
      <PageStateCard
        icon={<AlertCircle className="size-12 text-yellow-500" />}
        title="Spectator Mode"
        message="You are viewing this battle as a spectator."
        buttonText="Back to Battle Arena"
        redirectTo="/battle"
      />
    );
  }

  const gameFinished = battle.gameState.status === 'finished';
  const winner = battle.gameState.winner;
  const isWinner = winner === selectedAccount.address;

  const player1 = {
    address: battle.player1Address,
    name: battle.player1Name,
    nft: battle.player1NFT,
    nftData: battle.player1NFTData,
    health: battle.gameState.player1Health,
    maxHealth: battle.gameState.player1MaxHealth,
    isCurrentPlayer: isPlayer1,
    profile: player1Profile,
  };

  const player2 = {
    address: battle.player2Address,
    name: battle.player2Name,
    nft: battle.player2NFT,
    nftData: battle.player2NFTData,
    health: battle.gameState.player2Health,
    maxHealth: battle.gameState.player2MaxHealth,
    isCurrentPlayer: isPlayer2,
    profile: player2Profile,
  };

  const currentPlayer = isPlayer1 ? player1 : player2;
  const opponent = isPlayer1 ? player2 : player1;

  const currentPlayerMetadata = getNFTMetadata(
    currentPlayer.nftData?.itemMetadata,
  );
  const opponentMetadata = getNFTMetadata(opponent.nftData?.itemMetadata);

  const currentPlayerImage = getIpfsImageUrl(currentPlayerMetadata);
  const opponentImage = getIpfsImageUrl(opponentMetadata);

  const currentPlayerNFTName =
    currentPlayerMetadata?.name ||
    `${getNFTTypeName(currentPlayer.nft.stats.nftType)} #${currentPlayer.nft.item}`;
  const opponentNFTName =
    opponentMetadata?.name ||
    `${getNFTTypeName(opponent.nft.stats.nftType)} #${opponent.nft.item}`;

  const customMoves = currentPlayer.nftData?.customMoves;
  if (!customMoves || customMoves.length !== 4) {
    throw new Error('Expected exactly 4 custom moves for NFT');
  }

  const availableMoves: BattleMove[] = customMoves.map((move, index) => ({
    name: move.name,
    description: move.description,
    power: Math.floor(
      25 +
        currentPlayer.nft.stats.attack * 0.6 +
        currentPlayer.nft.stats.strength * 0.4 +
        index * 5,
    ),
    iconName: move.iconName,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {gameFinished && !isReplayMode && (
        <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-md flex items-center justify-center">
          <Card className="max-w-md w-full mx-4 border-border/50">
            <CardContent className="p-12 text-center space-y-8">
              <div className="space-y-4">
                <div
                  className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
                    isWinner
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-red-500/10 text-red-500'
                  }`}
                >
                  <Trophy className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                  <h1
                    className={`text-4xl font-bold ${
                      isWinner ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {isWinner ? 'Victory' : 'Defeat'}
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    {isWinner
                      ? 'You emerged victorious from the battle!'
                      : 'Your opponent proved stronger this time.'}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = '/battle';
                  }}
                  className="inline-flex items-center px-8 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Return to Arena
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isInitializing && (
        <div className="absolute inset-0 z-30 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <Card className="border-primary/20">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <div>
                  <h3 className="text-lg font-semibold">Creating Battle</h3>
                  <p className="text-sm text-muted-foreground">
                    Preparing battle state...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex h-screen">
        <BattlePlayerPanel
          player={currentPlayer}
          nftName={currentPlayerNFTName}
          isMyTurn={isMyTurn}
          roomCode={battleId}
        />

        <div className="flex-1 flex flex-col">
          <BattleArena
            currentPlayer={currentPlayer}
            opponent={opponent}
            currentPlayerImage={currentPlayerImage}
            opponentImage={opponentImage}
            currentPlayerNFTName={currentPlayerNFTName}
            opponentNFTName={opponentNFTName}
            currentPlayerNFTType={currentPlayer.nft.stats.nftType}
            opponentNFTType={opponent.nft.stats.nftType}
            turnNumber={battle.gameState.turnNumber}
          />

          <BattleMovesPanel
            moves={availableMoves}
            selectedMove={selectedMove}
            onMoveSelect={setSelectedMove}
            onExecuteTurn={handleExecuteTurn}
            isMyTurn={isMyTurn && !isInitializing}
            isPending={isPending}
            gameFinished={gameFinished}
            isExecutingTurn={isExecutingTurn}
          />
        </div>

        <BattleLogPanel
          moves={battle.moves}
          gameStatus={battle.gameState.status}
          currentTurn={battle.gameState.currentTurn}
          turnNumber={battle.gameState.turnNumber}
          player1Address={battle.player1Address}
          player2Address={battle.player2Address}
          player1Name={battle.player1Name}
          player2Name={battle.player2Name}
          connectionStatus={connectionStatus}
          isPending={isPending}
        />
      </div>
    </div>
  );
}
