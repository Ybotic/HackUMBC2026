'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Link as TransitionLink } from 'next-view-transitions';
import { useRouter } from 'next/navigation';
import { useMutation, usePreloadedQuery, type Preloaded } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSolana } from '@/lib/providers/SolanaProvider';
import {
  getPlayerDisplayName,
  getNFTTypeName,
  formatTimeLeft,
} from '@/lib/battle-utils';
import { PageStateCard } from '@/components/battle/PageStateCard';
import { NFTHeadingWord } from '@/components/NFTHeadingWord';
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
import { toast } from 'sonner';
import {
  ArrowRight,
  Clock3,
  LockKeyhole,
  Plus,
  Swords,
  Users,
} from 'lucide-react';

function BattleHeading() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        <NFTHeadingWord /> Battle Arena
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
        Bring 3–5 NFTs, find a rival, and choose your three-card team.
      </p>
    </div>
  );
}

type BattleClientProps = {
  address: string | null;
  publicLobbies: Preloaded<typeof api.lobby.getPublicLobbies>;
  activeBattles?: Preloaded<typeof api.battle.getUserActiveBattles>;
  history?: Preloaded<typeof api.battle.getUserBattleHistory>;
  nfts?: Preloaded<typeof api.nft.getUserNFTs>;
};

export function BattleClient(props: BattleClientProps) {
  const { selectedAccount, isReady, isInitialized } = useSolana();
  const router = useRouter();
  const address = selectedAccount?.address;

  useEffect(() => {
    if (isReady && address && address !== props.address) {
      router.replace(`/battle?wallet=${encodeURIComponent(address)}`);
    }
  }, [isReady, address, props.address, router]);

  if (!isInitialized) {
    return (
      <main className="container mx-auto max-w-[1500px] px-4 py-8">
        <BattleHeading />
        <PageStateCard
          compact
          variant="loading"
          message="Preparing the arena..."
        />
      </main>
    );
  }

  if (!isReady || !selectedAccount) {
    return (
      <main className="container mx-auto max-w-[1500px] px-4 py-8">
        <BattleHeading />
        <PageStateCard
          compact
          variant="walletConnect"
          message="Connect your wallet to enter the Mint arena."
        />
      </main>
    );
  }

  if (
    address !== props.address ||
    !props.activeBattles ||
    !props.history ||
    !props.nfts
  ) {
    return (
      <main className="container mx-auto max-w-[1500px] px-4 py-8">
        <BattleHeading />
        <PageStateCard
          compact
          variant="loading"
          message="Preparing your battles and NFT roster..."
        />
      </main>
    );
  }

  return (
    <LoadedBattlePage
      key={selectedAccount.address}
      account={selectedAccount}
      publicLobbies={props.publicLobbies}
      activeBattles={props.activeBattles}
      history={props.history}
      nfts={props.nfts}
    />
  );
}

function LoadedBattlePage({
  account,
  publicLobbies: preloadedPublicLobbies,
  activeBattles: preloadedActiveBattles,
  history: preloadedHistory,
  nfts: preloadedNFTs,
}: {
  account: NonNullable<ReturnType<typeof useSolana>['selectedAccount']>;
  publicLobbies: Preloaded<typeof api.lobby.getPublicLobbies>;
  activeBattles: Preloaded<typeof api.battle.getUserActiveBattles>;
  history: Preloaded<typeof api.battle.getUserBattleHistory>;
  nfts: Preloaded<typeof api.nft.getUserNFTs>;
}) {
  const publicLobbies = usePreloadedQuery(preloadedPublicLobbies);
  const activeBattles = usePreloadedQuery(preloadedActiveBattles);
  const history = usePreloadedQuery(preloadedHistory);
  const nfts = usePreloadedQuery(preloadedNFTs);
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const createLobby = useMutation(api.lobby.createLobby);
  const joinLobby = useMutation(api.lobby.joinLobby);

  async function create(isPrivate: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await createLobby({
        creatorAddress: account.address,
        creatorName: account.meta.name,
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
    if (busy || !lobbyId.trim()) return;
    const id = lobbyId.trim().toUpperCase();
    if (owner === account.address) {
      router.push(`/battle/lobby/${id}`);
      return;
    }
    setBusy(true);
    try {
      await joinLobby({
        lobbyId: id,
        playerAddress: account.address,
        playerName: account.meta.name,
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

  const recent = activeBattles[0];

  return (
    <main className="min-h-screen bg-background">
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
            <BattleHeading />
          </div>
          <Badge
            variant="outline"
            className="w-fit gap-2 px-3 py-1.5 text-xs font-medium"
          >
            <span
              className="size-1.5 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            {`${nfts.length} ${nfts.length === 1 ? 'card' : 'cards'} ready`}
          </Badge>
        </header>

        <div className="grid items-stretch gap-6 lg:grid-cols-2">
          <Card className="h-full gap-0 overflow-hidden py-0 shadow-sm">
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
            <CardContent className="flex-1 space-y-5 p-5 sm:p-6">
              {recent && (
                <Button
                  asChild
                  variant="secondary"
                  className="w-full justify-between"
                >
                  <Link href={`/battle/play/${recent.battleId}`}>
                    <span>
                      {recent.gameState.status === 'initializing'
                        ? 'Choose your battle lineup'
                        : 'Continue your active match'}
                    </span>
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

              {nfts.length < 3 && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  You need at least three synced NFTs to ready up.{' '}
                  <TransitionLink
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    href={`/generate?wallet=${encodeURIComponent(account.address)}`}
                  >
                    Create a card
                  </TransitionLink>{' '}
                  before readying up in a lobby.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="h-full gap-0 overflow-hidden py-0 shadow-sm">
            <CardHeader className="gap-1.5 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Open lobbies</CardTitle>
                <Badge variant="outline" className="tabular-nums">
                  {publicLobbies.length}
                </Badge>
              </div>
              <CardDescription>
                Public matches looking for a rival.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="flex-1 px-5 sm:px-6">
              {publicLobbies.length === 0 ? (
                <div className="py-6 text-center">
                  <Users className="mx-auto mb-2 size-5 text-muted-foreground" />
                  <p className="text-sm font-medium">No open lobbies</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Start a public match and invite a rival.
                  </p>
                </div>
              ) : (
                <div className="max-h-80 divide-y overflow-y-auto">
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
                        {lobby.creatorAddress === account.address
                          ? 'Enter'
                          : 'Join'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="h-full gap-0 overflow-hidden py-0 shadow-sm">
            <CardHeader className="gap-1.5 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Your matches</CardTitle>
                <Badge variant="outline" className="tabular-nums">
                  {activeBattles.length}
                </Badge>
              </div>
              <CardDescription>
                Pick up where your last match left off.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="flex-1 px-5 sm:px-6">
              {activeBattles.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No ongoing matches. Your next one starts here.
                </p>
              ) : (
                <div className="max-h-80 divide-y overflow-y-auto">
                  {activeBattles.map((battle) => {
                    const isYourTurn =
                      battle.gameState.currentTurn === account.address;
                    const opponent = getPlayerDisplayName(
                      battle.player1Address === account.address
                        ? battle.player2Address
                        : battle.player1Address,
                      battle.player1Address === account.address
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
                                className={`size-1.5 rounded-full ${isYourTurn ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`}
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
          <Card className="h-full gap-0 overflow-hidden py-0 shadow-sm">
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
                  {history.length}
                </Badge>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="flex-1 px-5 sm:px-6">
              {history.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Your first result will appear here.
                </p>
              ) : (
                <div className="max-h-80 divide-y overflow-y-auto">
                  {history.map((battle) => {
                    const won = battle.gameState.winner === account.address;
                    const opponent = getPlayerDisplayName(
                      battle.player1Address === account.address
                        ? battle.player2Address
                        : battle.player1Address,
                      battle.player1Address === account.address
                        ? battle.player2Name
                        : battle.player1Name,
                    );
                    const cardType = getNFTTypeName(
                      battle.player1Address === account.address
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
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
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
                              {battle.gameState.turnNumber} turns ·{' '}
                              {battle.player1Roster && battle.player2Roster
                                ? '3-card lineup'
                                : `${cardType} card`}
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
      </div>
    </main>
  );
}
