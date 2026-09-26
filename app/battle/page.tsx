'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSolana } from '@/lib/providers/SolanaProvider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Swords,
  Users,
  Clock,
  Globe,
  Lock,
  Plus,
  ArrowRight,
  Trophy,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatTimeLeft, getPlayerDisplayName } from '@/lib/battle-utils';
import { PageStateCard } from '@/components/battle/PageStateCard';
import { motion } from 'framer-motion';

export default function BattlePage() {
  const router = useRouter();
  const { selectedAccount, isReady, isInitialized } = useSolana();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [joinLobbyId, setJoinLobbyId] = useState('');

  const publicLobbies = useQuery(api.lobby.getPublicLobbies);
  const activeBattles = useQuery(
    api.battle.getUserActiveBattles,
    selectedAccount ? { userAddress: selectedAccount.address } : 'skip',
  );
  const battleHistory = useQuery(
    api.battle.getUserBattleHistory,
    selectedAccount ? { userAddress: selectedAccount.address } : 'skip',
  );

  const createLobby = useMutation(api.lobby.createLobby);
  const joinLobby = useMutation(api.lobby.joinLobby);

  const handleCreateLobby = async (isPrivate: boolean) => {
    if (!selectedAccount) return;

    try {
      const result = await createLobby({
        creatorAddress: selectedAccount.address,
        creatorName: selectedAccount.meta.name,
        isPrivate,
        maxWaitTime: 10 * 60 * 1000, // 10 minutes
      });

      router.push(`/battle/lobby/${result.lobbyId}`);
    } catch (error: any) {
      console.error('Failed to create lobby:', error);
      toast.error(error.message || 'Failed to create lobby');
    }
  };

  const handleJoinLobby = async (lobbyId: string) => {
    if (!selectedAccount) return;

    try {
      await joinLobby({
        lobbyId,
        playerAddress: selectedAccount.address,
        playerName: selectedAccount.meta.name,
      });

      router.push(`/battle/lobby/${lobbyId}`);
    } catch (error: any) {
      console.error('Failed to join lobby:', error);
      toast.error(error.message || 'Failed to join lobby');
    }
  };

  const handleJoinByCode = async () => {
    if (!joinLobbyId.trim()) return;
    await handleJoinLobby(joinLobbyId.toUpperCase());
  };

  if (!isInitialized) {
    return (
      <PageStateCard
        variant="loading"
        message="Initializing wallet connection..."
      />
    );
  }

  if (!isReady) {
    return (
      <PageStateCard
        variant="walletConnect"
        message="Please connect your wallet to access the battle arena"
      />
    );
  }

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <motion.div
            className="text-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-bold text-foreground">Battle Arena</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Challenge other players to strategic battles with Solana cards
            </p>

            <div className="flex justify-center items-center gap-8 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {publicLobbies?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  Active Lobbies
                </div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {activeBattles?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  Your Battles
                </div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {battleHistory?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-primary/20">
                    <CardContent className="flex flex-col items-center justify-center p-6 space-y-3 min-h-[225px]">
                      <Plus className="h-10 w-10 text-primary" />
                      <h3 className="text-lg font-semibold">Create Battle</h3>
                      <p className="text-sm text-muted-foreground text-center">
                        Start a new battle lobby
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Battle Lobby</DialogTitle>
                  <DialogDescription>
                    Choose how other players can join your battle
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Button
                    onClick={() => handleCreateLobby(false)}
                    className="w-full h-auto p-4 flex flex-col items-start space-y-2"
                    variant="outline"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      <span className="font-semibold">Public Battle</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Anyone can join from the lobby browser
                    </p>
                  </Button>
                  <Button
                    onClick={() => handleCreateLobby(true)}
                    className="w-full h-auto p-4 flex flex-col items-start space-y-2"
                    variant="outline"
                  >
                    <div className="flex items-center gap-2">
                      <Lock className="h-5 w-5" />
                      <span className="font-semibold">Private Battle</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Share the lobby code with friends
                    </p>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <Card className="hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-primary/20">
                <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
                  <div className="space-y-4 w-full">
                    <div className="flex flex-col items-center space-y-3">
                      <Users className="h-10 w-10 text-primary" />
                      <h3 className="text-lg font-semibold">Join by Code</h3>
                    </div>
                    <div className="space-y-3">
                      <Input
                        placeholder="Enter lobby code"
                        value={joinLobbyId}
                        onChange={(e) =>
                          setJoinLobbyId(e.target.value.toUpperCase())
                        }
                        className="text-center"
                      />
                      <Button
                        onClick={handleJoinByCode}
                        disabled={!joinLobbyId.trim()}
                        className="w-full"
                      >
                        Join Battle
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <Card className="hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-primary/20">
                <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
                  <Activity className="h-10 w-10 text-primary" />
                  <h3 className="text-lg font-semibold">Battle Stats</h3>
                  <div className="text-center space-y-2 w-full">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Active:
                      </span>
                      <span className="font-semibold">
                        {activeBattles?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Completed:
                      </span>
                      <span className="font-semibold">
                        {battleHistory?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Lobbies:
                      </span>
                      <span className="font-semibold">
                        {publicLobbies?.length || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Tabs defaultValue="lobbies" className="space-y-6">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
                <TabsTrigger value="lobbies">Public Lobbies</TabsTrigger>
                <TabsTrigger value="active">Active Battles</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="lobbies" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Public Battle Lobbies
                    </CardTitle>
                    <CardDescription>
                      Join an open battle or create your own
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!publicLobbies ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="h-16 bg-muted animate-pulse rounded-lg"
                          />
                        ))}
                      </div>
                    ) : publicLobbies.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold mb-2">
                          No Public Lobbies
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Be the first to create a public battle!
                        </p>
                        <Button onClick={() => handleCreateLobby(false)}>
                          Create Public Battle
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {publicLobbies.map((lobby) => {
                          const isOwnLobby =
                            lobby.creatorAddress === selectedAccount?.address;

                          return (
                            <div
                              key={lobby._id}
                              className={`flex items-center justify-between p-4 border rounded-lg transition-all duration-200 ${
                                isOwnLobby
                                  ? 'bg-primary/5 border-primary/20'
                                  : 'hover:bg-muted/50'
                              }`}
                            >
                              <div className="flex items-center space-x-4">
                                <div
                                  className={`w-2 h-2 rounded-full animate-pulse ${
                                    isOwnLobby ? 'bg-primary' : 'bg-green-500'
                                  }`}
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">
                                      {lobby.creatorName || 'Anonymous'}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {lobby.lobbyId}
                                    </Badge>
                                    {isOwnLobby && (
                                      <Badge
                                        variant="default"
                                        className="text-xs"
                                      >
                                        Your Lobby
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Created{' '}
                                    {formatDistanceToNow(lobby.createdAt, {
                                      addSuffix: true,
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="text-right">
                                  <p className="text-sm">
                                    <Clock className="h-4 w-4 inline mr-1" />
                                    {formatTimeLeft(lobby.expiresAt)}
                                  </p>
                                </div>
                                <Button
                                  onClick={() =>
                                    isOwnLobby
                                      ? router.push(
                                          `/battle/lobby/${lobby.lobbyId}`,
                                        )
                                      : handleJoinLobby(lobby.lobbyId)
                                  }
                                  size="sm"
                                  variant={isOwnLobby ? 'secondary' : 'default'}
                                >
                                  {isOwnLobby ? 'Enter Lobby' : 'Join'}
                                  <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="active" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Swords className="h-5 w-5" />
                      Active Battles
                    </CardTitle>
                    <CardDescription>
                      Continue your ongoing battles
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!activeBattles ? (
                      <div className="space-y-3">
                        {[...Array(2)].map((_, i) => (
                          <div
                            key={i}
                            className="h-16 bg-muted animate-pulse rounded-lg"
                          />
                        ))}
                      </div>
                    ) : activeBattles.length === 0 ? (
                      <div className="text-center py-8">
                        <Swords className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold mb-2">
                          No Active Battles
                        </h3>
                        <p className="text-muted-foreground">
                          Start a new battle to see it here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeBattles.map((battle) => {
                          const isMyTurn =
                            battle.gameState.currentTurn ===
                            selectedAccount?.address;
                          const opponent =
                            battle.player1Address === selectedAccount?.address
                              ? getPlayerDisplayName(
                                  battle.player2Address,
                                  battle.player2Name,
                                )
                              : getPlayerDisplayName(
                                  battle.player1Address,
                                  battle.player1Name,
                                );

                          return (
                            <div
                              key={battle._id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                            >
                              <div className="flex items-center space-x-4">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    isMyTurn
                                      ? 'bg-green-500 animate-pulse'
                                      : 'bg-yellow-500'
                                  }`}
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">
                                      vs {opponent}
                                    </span>
                                    <Badge
                                      variant={
                                        isMyTurn ? 'default' : 'secondary'
                                      }
                                    >
                                      {isMyTurn ? 'Your Turn' : 'Waiting'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Turn {battle.gameState.turnNumber} •{' '}
                                    {formatDistanceToNow(battle.lastActivity, {
                                      addSuffix: true,
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="text-right text-sm">
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                                    <span>
                                      {battle.gameState.player1Health}
                                    </span>
                                    <span className="text-muted-foreground">
                                      vs
                                    </span>
                                    <span>
                                      {battle.gameState.player2Health}
                                    </span>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                  </div>
                                </div>
                                <Button asChild size="sm">
                                  <Link
                                    href={`/battle/play/${battle.battleId}`}
                                  >
                                    Continue
                                    <ArrowRight className="h-4 w-4 ml-1" />
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Battle History
                    </CardTitle>
                    <CardDescription>
                      Your completed battles and results
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!battleHistory ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="h-16 bg-muted animate-pulse rounded-lg"
                          />
                        ))}
                      </div>
                    ) : battleHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold mb-2">
                          No Battle History
                        </h3>
                        <p className="text-muted-foreground">
                          Complete your first battle to see results here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {battleHistory.map((battle) => {
                          const won =
                            battle.gameState.winner ===
                            selectedAccount?.address;
                          const opponent =
                            battle.player1Address === selectedAccount?.address
                              ? getPlayerDisplayName(
                                  battle.player2Address,
                                  battle.player2Name,
                                )
                              : getPlayerDisplayName(
                                  battle.player1Address,
                                  battle.player1Name,
                                );

                          return (
                            <div
                              key={battle._id}
                              className="flex items-center justify-between p-4 border rounded-lg"
                            >
                              <div className="flex items-center space-x-4">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    won ? 'bg-green-500' : 'bg-red-500'
                                  }`}
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">
                                      vs {opponent}
                                    </span>
                                    <Badge
                                      variant={won ? 'default' : 'destructive'}
                                    >
                                      {won ? 'Victory' : 'Defeat'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {battle.gameState.turnNumber} turns •{' '}
                                    {battle.finishedAt
                                      ? formatDistanceToNow(battle.finishedAt, {
                                          addSuffix: true,
                                        })
                                      : 'Pending'}
                                  </p>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" asChild>
                                <Link
                                  href={`/battle/play/${battle.battleId}?replay=true`}
                                >
                                  View Replay
                                </Link>
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
