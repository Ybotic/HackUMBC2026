'use client';

import '@/components/battle/roster.css';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSolana } from '@/lib/providers/SolanaProvider';
import { useNFTs } from '@/hooks/useNFTs';
import { PageStateCard } from '@/components/battle/PageStateCard';
import {
  OpponentRoster,
  RosterSelector,
  type NFTReference,
} from '@/components/battle/RosterSelector';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function LobbyPage() {
  const params = useParams();
  const lobbyId = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');
  const router = useRouter();
  const { selectedAccount, isInitialized, isReady: walletReady } = useSolana();
  const { nfts } = useNFTs();
  const lobby = useQuery(
    api.lobby.getLobby,
    selectedAccount?.address
      ? { lobbyId, viewerAddress: selectedAccount.address }
      : 'skip',
  );
  const battleId = useQuery(
    api.lobby.getBattleFromLobby,
    lobby?.status === 'started' ? { lobbyId } : 'skip',
  );
  const updateRoster = useMutation(api.lobby.updateLobbyRoster);
  const startBattle = useMutation(api.lobby.startBattleFromLobby);
  const joinLobby = useMutation(api.lobby.joinLobby);
  const [busy, setBusy] = useState(false);
  const address = selectedAccount?.address;
  const isCreator = address === lobby?.creatorAddress;
  const isJoiner = address === lobby?.joinedPlayerAddress;
  const own = isCreator ? lobby?.creatorRoster : lobby?.joinerRoster;
  const theirs = isCreator ? lobby?.joinerRoster : lobby?.creatorRoster;
  const bothReady =
    !!lobby?.creatorRoster?.isReady && !!lobby?.joinerRoster?.isReady;

  useEffect(() => {
    if (
      lobby?.status === 'waiting' &&
      address &&
      !isCreator &&
      !isJoiner &&
      !lobby.joinedPlayerAddress
    ) {
      void joinLobby({
        lobbyId,
        playerAddress: address,
        playerName: selectedAccount?.meta.name,
      }).catch((error) => toast.error(String(error)));
    }
  }, [
    lobby?.status,
    lobby?.joinedPlayerAddress,
    address,
    isCreator,
    isJoiner,
    lobbyId,
    joinLobby,
    selectedAccount?.meta.name,
  ]);

  useEffect(() => {
    if (lobby?.status === 'started' && battleId)
      router.push(`/battle/play/${battleId}`);
  }, [lobby?.status, battleId, router]);

  async function save(cards: NFTReference[], isReady: boolean) {
    if (!address || busy) return;
    setBusy(true);
    try {
      await updateRoster({ lobbyId, playerAddress: address, cards, isReady });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not update roster',
      );
    } finally {
      setBusy(false);
    }
  }

  async function begin() {
    if (!address || busy) return;
    setBusy(true);
    try {
      const result = await startBattle({ lobbyId, initiatorAddress: address });
      router.push(`/battle/play/${result.battleId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not start battle',
      );
      setBusy(false);
    }
  }

  if (!isInitialized)
    return (
      <PageStateCard variant="loading" message="Connecting to the lobby..." />
    );
  if (!address)
    return (
      <PageStateCard
        variant="walletConnect"
        message="Connect your wallet to join this lobby."
      />
    );
  if (lobby === undefined)
    return <PageStateCard variant="loading" message="Loading lobby..." />;
  if (!lobby)
    return (
      <PageStateCard
        variant="error"
        title="Lobby not found"
        message="This lobby does not exist."
        redirectTo="/battle"
      />
    );
  if (lobby.status === 'cancelled' || lobby.status === 'expired')
    return (
      <PageStateCard
        title="Lobby closed"
        message="This lobby is no longer available."
        redirectTo="/battle"
      />
    );
  if (lobby.status === 'started')
    return <PageStateCard variant="loading" message="Opening battle..." />;
  if (!isCreator && !isJoiner)
    return lobby.joinedPlayerAddress || lobby.status === 'ready' ? (
      <PageStateCard
        variant="error"
        title="Lobby full"
        message="Only the two participants can join this lobby."
        redirectTo="/battle"
      />
    ) : (
      <PageStateCard variant="loading" message="Joining lobby..." />
    );

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Battle Lobby</h1>
            <p className="text-muted-foreground">
              Lobby {lobbyId} ·{' '}
              {lobby.settings.isPrivate ? 'Private' : 'Public'}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/battle">Back to arena</Link>
          </Button>
        </header>
        <p className="rounded-lg border p-4 text-sm">
          {lobby.joinedPlayerAddress
            ? 'Both players have joined.'
            : 'Waiting for an opponent.'}{' '}
          Choose 3–5 cards and lock your roster. Once both players lock, you can
          inspect the opposing cards before choosing your three fighters.
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border p-5 space-y-4">
            <h2 className="text-xl font-semibold">
              Your roster {own?.isReady ? '· Locked' : ''}
            </h2>
            <RosterSelector
              nfts={nfts ?? []}
              cards={own?.cards ?? []}
              isReady={!!own?.isReady}
              disabled={busy || !walletReady}
              onChange={(cards) => void save(cards, false)}
              onReady={() => void save(own?.cards ?? [], !own?.isReady)}
            />
          </section>
          <section className="rounded-xl border p-5 space-y-4">
            <h2 className="text-xl font-semibold">
              Opponent roster {theirs?.isReady ? '· Locked' : ''}
            </h2>
            <OpponentRoster cards={theirs?.cards ?? []} revealed={bothReady} />
          </section>
        </div>
        <div className="rounded-xl border p-5 space-y-3">
          <p role="status">
            {bothReady
              ? 'Both rosters locked. Start the battle to choose your three cards after reviewing the opponent.'
              : 'Waiting for both players to lock their rosters.'}
          </p>
          {isCreator ? (
            <Button
              onClick={() => void begin()}
              disabled={!bothReady || busy || !walletReady}
            >
              Start battle
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              The lobby creator starts the match once both rosters are locked.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
