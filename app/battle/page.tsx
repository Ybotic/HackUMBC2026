'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { useNFTs } from '@/hooks/useNFTs';
import { getNFTMetadata, getIpfsImageUrl } from '@/lib/utils';
import {
  getPlayerDisplayName,
  getNFTTypeName,
  formatTimeLeft,
} from '@/lib/battle-utils';
import { MintArena, type ArenaFighter } from '@/components/battle/MintArena';
import { PageStateCard } from '@/components/battle/PageStateCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ArrowRight,
  Clock3,
  LockKeyhole,
  Plus,
  Swords,
  Users,
} from 'lucide-react';

export default function BattlePage() {
  const router = useRouter();
  const { selectedAccount, isReady, isInitialized } = useSolana();
  const { nfts } = useNFTs();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const publicLobbies = useQuery(api.lobby.getPublicLobbies);
  const activeBattles = useQuery(
    api.battle.getUserActiveBattles,
    selectedAccount ? { userAddress: selectedAccount.address } : 'skip',
  );
  const history = useQuery(
    api.battle.getUserBattleHistory,
    selectedAccount ? { userAddress: selectedAccount.address } : 'skip',
  );
  const createLobby = useMutation(api.lobby.createLobby);
  const joinLobby = useMutation(api.lobby.joinLobby);

  async function create(isPrivate: boolean) {
    if (!selectedAccount || busy) return;
    setBusy(true);
    try {
      const result = await createLobby({
        creatorAddress: selectedAccount.address,
        creatorName: selectedAccount.meta.name,
        isPrivate,
        maxWaitTime: 600000,
      });
      router.push(`/battle/lobby/${result.lobbyId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not create lobby',
      );
    } finally {
      setBusy(false);
    }
  }

  async function join(lobbyId: string, owner?: string) {
    if (!selectedAccount || busy || !lobbyId.trim()) return;
    const id = lobbyId.trim().toUpperCase();
    if (owner === selectedAccount.address) {
      router.push(`/battle/lobby/${id}`);
      return;
    }
    setBusy(true);
    try {
      await joinLobby({
        lobbyId: id,
        playerAddress: selectedAccount.address,
        playerName: selectedAccount.meta.name,
      });
      router.push(`/battle/lobby/${id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not join lobby',
      );
    } finally {
      setBusy(false);
    }
  }

  if (!isInitialized)
    return <PageStateCard variant="loading" message="Preparing the arena..." />;
  if (!isReady || !selectedAccount)
    return (
      <PageStateCard
        variant="walletConnect"
        message="Connect your wallet to enter the Mint arena."
      />
    );

  const featured = nfts?.[0];
  const metadata = getNFTMetadata(featured?.itemMetadata);
  const fighter: ArenaFighter | undefined = featured
    ? {
        name: metadata?.name || `Card #${featured.item}`,
        image: getIpfsImageUrl(metadata),
        type: featured.stats?.nftType ?? -1,
        owner: 'YOUR COLLECTION',
        description: metadata?.description,
      }
    : undefined;
  const recent = activeBattles?.[0];

  return (
    <main className="min-h-screen bg-black">
      <div className="container mx-auto max-w-[1500px] px-4 py-8">
        <header className="mb-8 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="gap-1.5 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em]"
              >
                <Swords className="size-3.5" /> Battle arena
              </Badge>
              <span className="text-xs text-muted-foreground">
                Mint card duels
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Battle Arena
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
                Pick a card, find a rival, and take your place at the table.
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="w-fit gap-2 px-3 py-1.5 text-xs font-medium"
          >
            <span
              className="size-1.5 rounded-full bg-primary"
              aria-hidden="true"
            />
            {nfts === undefined
              ? 'Loading collection'
              : `${nfts.length} ${nfts.length === 1 ? 'card' : 'cards'} ready`}
          </Badge>
        </header>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.8fr)]">
          <section className="min-w-0" aria-label="Featured card arena">
            <MintArena
              you={fighter}
              turnLabel={
                recent ? `MATCH ${recent.battleId}` : 'READY WHEN YOU ARE'
              }
              compact
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>Featured from your collection</span>
              <Badge variant="outline" className="font-normal">
                Choose your battle card in the lobby
              </Badge>
            </div>
          </section>

          <div className="space-y-4">
            <Card className="gap-0 overflow-hidden py-0 shadow-sm">
              <CardHeader className="gap-3 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <Badge
                    variant="outline"
                    className="font-mono text-[11px] tracking-wider text-muted-foreground"
                  >
                    01 / PLAY
                  </Badge>
                  <Swords className="size-4 text-muted-foreground" />
                </div>
                <div className="space-y-1.5">
                  <CardTitle className="text-xl tracking-tight">
                    Start a match
                  </CardTitle>
                  <CardDescription>
                    Create a table or join a rival with an invite code.
                  </CardDescription>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="space-y-5 p-5 sm:p-6">
                {recent && (
                  <Button
                    asChild
                    variant="secondary"
                    className="w-full justify-between"
                  >
                    <Link href={`/battle/play/${recent.battleId}`}>
                      <span>Continue your active match</span>
                      <ArrowRight />
                    </Link>
                  </Button>
                )}

                <div className="grid gap-2.5">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full justify-between"
                    disabled={busy}
                    onClick={() => create(false)}
                  >
                    <span className="flex items-center gap-2">
                      <Plus />
                      {busy ? 'Creating match…' : 'Create public match'}
                    </span>
                    <ArrowRight />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full justify-start"
                    disabled={busy}
                    onClick={() => create(true)}
                  >
                    <LockKeyhole /> Private match
                  </Button>
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="mint-lobby-code">Have an invite code?</Label>
                  <form
                    className="flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void join(code);
                    }}
                  >
                    <Input
                      id="mint-lobby-code"
                      placeholder="Enter lobby code"
                      value={code}
                      onChange={(event) =>
                        setCode(event.target.value.toUpperCase())
                      }
                      maxLength={12}
                      className="font-mono uppercase tracking-wider"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="icon"
                      disabled={busy || !code.trim()}
                      aria-label="Join lobby by code"
                    >
                      <ArrowRight />
                    </Button>
                  </form>
                </div>

                {nfts?.length === 0 && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                    No cards in your collection yet.{' '}
                    <Link
                      className="font-medium text-primary underline-offset-4 hover:underline"
                      href="/generate"
                    >
                      Create a card
                    </Link>{' '}
                    before readying up in a lobby.
                  </div>
                )}
                {nfts === undefined && (
                  <p className="text-sm text-muted-foreground">
                    Loading your cards…
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="gap-0 overflow-hidden py-0 shadow-sm">
              <CardHeader className="gap-1.5 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">Open lobbies</CardTitle>
                  <Badge variant="outline" className="tabular-nums">
                    {publicLobbies?.length ?? '—'}
                  </Badge>
                </div>
                <CardDescription>
                  Public matches looking for a rival.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="px-5 sm:px-6">
                {publicLobbies === undefined ? (
                  <div className="space-y-3 py-4" aria-label="Finding matches">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-4/5" />
                  </div>
                ) : publicLobbies.length === 0 ? (
                  <div className="py-6 text-center">
                    <Users className="mx-auto mb-2 size-5 text-muted-foreground" />
                    <p className="text-sm font-medium">No open lobbies</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Start a public match and invite a rival.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {publicLobbies.map((lobby) => (
                      <div
                        className="flex items-center justify-between gap-3 py-3 first:pt-4 last:pb-4"
                        key={lobby._id}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <Users className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {getPlayerDisplayName(
                                lobby.creatorAddress,
                                lobby.creatorName,
                              )}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="font-mono">{lobby.lobbyId}</span>
                              <span aria-hidden="true">·</span>
                              <Clock3 className="size-3" />
                              {formatTimeLeft(lobby.expiresAt)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          disabled={busy}
                          onClick={() =>
                            join(lobby.lobbyId, lobby.creatorAddress)
                          }
                        >
                          {lobby.creatorAddress === selectedAccount.address
                            ? 'Enter'
                            : 'Join'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="gap-0 overflow-hidden py-0 shadow-sm">
              <CardHeader className="gap-1.5 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">Your matches</CardTitle>
                  <Badge variant="outline" className="tabular-nums">
                    {activeBattles?.length ?? '—'}
                  </Badge>
                </div>
                <CardDescription>
                  Pick up where your last match left off.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="px-5 sm:px-6">
                {activeBattles === undefined ? (
                  <div className="space-y-3 py-4" aria-label="Loading matches">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-4/5" />
                  </div>
                ) : activeBattles.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No ongoing matches. Your next one starts here.
                  </p>
                ) : (
                  <div className="divide-y">
                    {activeBattles.map((battle) => {
                      const isYourTurn =
                        battle.gameState.currentTurn ===
                        selectedAccount.address;
                      const opponent = getPlayerDisplayName(
                        battle.player1Address === selectedAccount.address
                          ? battle.player2Address
                          : battle.player1Address,
                        battle.player1Address === selectedAccount.address
                          ? battle.player2Name
                          : battle.player1Name,
                      );

                      return (
                        <div
                          className="flex items-center justify-between gap-3 py-3 first:pt-4 last:pb-4"
                          key={battle._id}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium">
                                Turn {battle.gameState.turnNumber}
                              </p>
                              <Badge
                                variant="outline"
                                className="gap-1.5 text-[10px] font-medium"
                              >
                                <span
                                  className={`size-1.5 rounded-full ${isYourTurn ? 'bg-primary' : 'bg-muted-foreground/50'}`}
                                />
                                {isYourTurn ? 'Your turn' : 'Waiting'}
                              </Badge>
                            </div>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              vs {opponent}
                            </p>
                          </div>
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="shrink-0"
                          >
                            <Link href={`/battle/play/${battle.battleId}`}>
                              Continue <ArrowRight />
                            </Link>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mt-6 gap-0 overflow-hidden py-0 shadow-sm">
          <CardHeader className="gap-1.5 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1.5">
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] tracking-wider text-muted-foreground"
                >
                  MATCH ARCHIVE
                </Badge>
                <CardTitle className="text-base">Past battles</CardTitle>
              </div>
              <Badge variant="outline" className="tabular-nums">
                {history?.length ?? '—'}
              </Badge>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="px-5 sm:px-6">
            {history === undefined ? (
              <div className="space-y-3 py-4" aria-label="Loading results">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-4/5" />
              </div>
            ) : history.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Your first result will appear here.
              </p>
            ) : (
              <div className="divide-y">
                {history.map((battle) => {
                  const won =
                    battle.gameState.winner === selectedAccount.address;
                  const opponent = getPlayerDisplayName(
                    battle.player1Address === selectedAccount.address
                      ? battle.player2Address
                      : battle.player1Address,
                    battle.player1Address === selectedAccount.address
                      ? battle.player2Name
                      : battle.player1Name,
                  );
                  const cardType = getNFTTypeName(
                    battle.player1Address === selectedAccount.address
                      ? battle.player1NFT.stats.nftType
                      : battle.player2NFT.stats.nftType,
                  );

                  return (
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-4 last:pb-4"
                      key={battle._id}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Badge
                          variant="outline"
                          className={
                            won
                              ? 'border-primary/30 bg-primary/10 text-primary'
                              : 'text-muted-foreground'
                          }
                        >
                          {won ? 'Victory' : 'Defeat'}
                        </Badge>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            vs {opponent}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {battle.gameState.turnNumber} turns · {cardType}{' '}
                            card
                          </p>
                        </div>
                      </div>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                      >
                        <Link href={`/battle/play/${battle.battleId}`}>
                          View result <ArrowRight />
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
