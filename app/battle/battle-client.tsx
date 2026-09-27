'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Link as TransitionLink } from 'next-view-transitions';
import { useRouter } from 'next/navigation';
import { useMutation, usePreloadedQuery, type Preloaded } from 'convex/react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/convex/_generated/api';
import type { Doc } from '@/convex/_generated/dataModel';
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
  Trophy,
  Users,
} from 'lucide-react';

function BattleHeading() {
  return (
    <div>
      <h1 className="mb-2 text-4xl font-bold">
        <NFTHeadingWord /> Battle Arena
      </h1>
      <p className="text-muted-foreground">
        Bring 3–5 NFTs, find a rival, and choose your three-card team.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-24 rounded-lg border bg-card px-4 py-2.5">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  count,
}: {
  title: string;
  description?: string;
  count?: number;
}) {
  return (
    <CardHeader className="gap-1 px-5 py-4 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {count !== undefined && (
          <Badge
            variant="outline"
            className="tabular-nums text-muted-foreground"
          >
            {count}
          </Badge>
        )}
      </div>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Users;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-6 sm:px-6">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
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

  const wins = history.filter(
    (battle) => battle.gameState.winner === account.address,
  ).length;
  const losses = history.length - wins;
  const winRate = history.length
    ? `${Math.round((wins / history.length) * 100)}%`
    : '—';

  function opponentOf(battle: Doc<'battles'>) {
    const isPlayer1 = battle.player1Address === account.address;
    return getPlayerDisplayName(
      isPlayer1 ? battle.player2Address : battle.player1Address,
      isPlayer1 ? battle.player2Name : battle.player1Name,
    );
  }

  return (
    <main className="container mx-auto max-w-[1500px] px-4 py-8">
      <header className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <BattleHeading />
        <dl className="grid grid-cols-3 gap-2 sm:flex">
          <Stat label="Cards" value={nfts.length} />
          <Stat label="Record" value={`${wins}–${losses}`} />
          <Stat label="Win rate" value={winRate} />
        </dl>
      </header>

      {activeBattles.length > 0 && (
        <section className="mb-6 overflow-hidden rounded-xl border border-primary/40 bg-primary/5">
          <div className="flex items-center gap-2 border-b border-primary/20 px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-primary sm:px-6">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            {activeBattles.length === 1
              ? 'Match in progress'
              : `${activeBattles.length} matches in progress`}
          </div>
          <div className="divide-y divide-primary/15">
            {activeBattles.map((battle) => {
              const status = matchStatus(battle, account.address);
              return (
                <div
                  key={battle._id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Swords className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        vs {opponentOf(battle)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {battle.gameState.status === 'initializing'
                          ? 'Lineup selection'
                          : `Turn ${battle.gameState.turnNumber}`}
                        <span aria-hidden="true"> · </span>
                        <span
                          className={
                            status.needsYou ? 'font-medium text-primary' : ''
                          }
                        >
                          {status.label}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild
                    variant={status.needsYou ? 'default' : 'outline'}
                    className="sm:w-auto"
                  >
                    <Link href={`/battle/play/${battle.battleId}`}>
                      {status.action} <ArrowRight />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <Card className="gap-0 py-0 lg:sticky lg:top-24">
          <SectionHeader
            title="Start a match"
            description="Open a table for anyone, or invite a friend privately."
          />
          <Separator />
          <CardContent className="space-y-5 p-5 sm:p-6">
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
                className="w-full justify-between"
                disabled={busy}
                onClick={() => create(true)}
              >
                <span className="flex items-center gap-2">
                  <LockKeyhole /> Create private match
                </span>
                <ArrowRight className="text-muted-foreground" />
              </Button>
            </div>

            <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
              <Separator className="flex-1" />
              or join with a code
              <Separator className="flex-1" />
            </div>

            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void join(code);
              }}
            >
              <Label htmlFor="mint-lobby-code" className="sr-only">
                Lobby code
              </Label>
              <Input
                id="mint-lobby-code"
                placeholder="LOBBY CODE"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                maxLength={12}
                className="h-10 font-mono uppercase tracking-widest"
              />
              <Button
                type="submit"
                variant="outline"
                className="h-10"
                disabled={busy || !code.trim()}
              >
                Join
              </Button>
            </form>

            {nfts.length < 3 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                You need at least three synced NFTs to ready up.{' '}
                <TransitionLink
                  className="font-medium underline underline-offset-4"
                  href={`/generate?wallet=${encodeURIComponent(account.address)}`}
                >
                  Create a card
                </TransitionLink>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="gap-0 overflow-hidden py-0">
            <SectionHeader
              title="Open lobbies"
              description="Public matches looking for a rival."
              count={publicLobbies.length}
            />
            <Separator />
            {publicLobbies.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No open lobbies right now"
                description="Create a public match and a rival can join you here."
              />
            ) : (
              <div className="max-h-80 divide-y overflow-y-auto">
                {publicLobbies.map((lobby) => {
                  const name = getPlayerDisplayName(
                    lobby.creatorAddress,
                    lobby.creatorName,
                  );
                  const isOwn = lobby.creatorAddress === account.address;
                  return (
                    <div
                      className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6"
                      key={lobby._id}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase text-muted-foreground">
                          {name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 truncate text-sm font-medium">
                            {name}
                            {isOwn && (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-muted-foreground"
                              >
                                You
                              </Badge>
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
                        variant={isOwn ? 'outline' : 'default'}
                        size="sm"
                        className="shrink-0"
                        disabled={busy}
                        onClick={() =>
                          join(lobby.lobbyId, lobby.creatorAddress)
                        }
                      >
                        {isOwn ? 'Enter' : 'Join'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="gap-0 overflow-hidden py-0">
            <SectionHeader
              title="Past battles"
              description="Your most recent results."
              count={history.length}
            />
            <Separator />
            {history.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="No battles yet"
                description="Your results will show up here after your first match."
              />
            ) : (
              <div className="max-h-[26rem] divide-y overflow-y-auto">
                {history.map((battle) => {
                  const won = battle.gameState.winner === account.address;
                  const isPlayer1 = battle.player1Address === account.address;
                  const lineup =
                    battle.player1Roster && battle.player2Roster
                      ? '3-card lineup'
                      : `${getNFTTypeName(
                          isPlayer1
                            ? battle.player1NFT.stats.nftType
                            : battle.player2NFT.stats.nftType,
                        )} card`;

                  return (
                    <Link
                      key={battle._id}
                      href={`/battle/play/${battle.battleId}`}
                      className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/50 sm:px-6"
                    >
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-md border text-sm font-semibold ${
                          won
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                        }`}
                        title={won ? 'Victory' : 'Defeat'}
                      >
                        {won ? 'W' : 'L'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          vs {opponentOf(battle)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {battle.gameState.turnNumber} turns · {lineup}
                        </p>
                      </div>
                      {battle.finishedAt && (
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                          {formatDistanceToNow(battle.finishedAt, {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}

function matchStatus(battle: Doc<'battles'>, address: string) {
  const isPlayer1 = battle.player1Address === address;
  const state = battle.gameState;

  if (state.status === 'abandoned') {
    return { label: 'Abandoned', action: 'View', needsYou: false };
  }
  if (state.status === 'initializing') {
    const lineup = isPlayer1 ? state.player1Lineup : state.player2Lineup;
    return lineup?.length
      ? { label: 'Waiting for rival', action: 'Open', needsYou: false }
      : {
          label: 'Choose your lineup',
          action: 'Choose lineup',
          needsYou: true,
        };
  }

  const yourMove = state.roundChoices
    ? !(isPlayer1 ? state.roundChoices.player1 : state.roundChoices.player2)
    : state.currentTurn === address;
  return yourMove
    ? { label: 'Your move', action: 'Continue', needsYou: true }
    : { label: 'Waiting for rival', action: 'Continue', needsYou: false };
}
