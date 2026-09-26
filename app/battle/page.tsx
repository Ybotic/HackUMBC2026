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
import { toast } from 'sonner';
import { ArrowRight, LockKeyhole, Plus, Swords } from 'lucide-react';

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
    <main className="mint-page">
      <div className="mint-shell">
        <header style={{ margin: '24px 0 30px' }}>
          <span className="mint-overline">MINT / THE ARENA</span>
          <h1 className="mint-heading" style={{ margin: '10px 0' }}>
            Your cards.
            <br />
            <span style={{ color: '#bafc9c' }}>Your move.</span>
          </h1>
          <p className="mint-muted">
            Face off with an original card from your collection. One card each.
            Every turn counts.
          </p>
        </header>
        <div className="mint-hub-layout">
          <div>
            <MintArena
              you={fighter}
              turnLabel={
                recent ? `MATCH ${recent.battleId}` : 'READY WHEN YOU ARE'
              }
              compact
            />
            <p className="mint-muted" style={{ fontSize: 12, marginTop: 12 }}>
              Featured from your collection · Select your battle card in the
              lobby.
            </p>
          </div>
          <div className="mint-side">
            <section className="mint-panel">
              <span className="mint-overline">01 / PLAY</span>
              <h2 style={{ fontSize: 25, margin: '8px 0 18px' }}>
                Enter the arena
              </h2>
              {recent && (
                <Link
                  href={`/battle/play/${recent.battleId}`}
                  className="mint-button"
                  style={{ width: '100%', marginBottom: 16 }}
                >
                  Continue match <ArrowRight size={17} />
                </Link>
              )}
              <div style={{ display: 'grid', gap: 10 }}>
                <button
                  type="button"
                  className="mint-button"
                  disabled={busy}
                  onClick={() => create(false)}
                >
                  <Plus size={18} />{' '}
                  {busy ? 'Working...' : 'Create public match'}
                </button>
                <button
                  type="button"
                  className="mint-button mint-button-secondary"
                  disabled={busy}
                  onClick={() => create(true)}
                >
                  <LockKeyhole size={17} /> Private match
                </button>
                <label
                  className="mint-overline"
                  htmlFor="mint-lobby-code"
                  style={{ marginTop: 10 }}
                >
                  Have an invite code?
                </label>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void join(code);
                  }}
                  style={{ display: 'flex', gap: 8 }}
                >
                  <input
                    id="mint-lobby-code"
                    className="mint-input"
                    placeholder="LOBBY CODE"
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.toUpperCase())
                    }
                    maxLength={12}
                  />
                  <button
                    type="submit"
                    className="mint-button mint-button-secondary"
                    disabled={busy || !code.trim()}
                    aria-label="Join lobby by code"
                  >
                    <ArrowRight size={18} />
                  </button>
                </form>
              </div>
              {nfts?.length === 0 && (
                <p
                  className="mint-muted"
                  style={{ marginTop: 18, fontSize: 13 }}
                >
                  No cards in your collection yet.{' '}
                  <Link className="mint-text-button" href="/generate">
                    Create a card
                  </Link>{' '}
                  before you ready up in a lobby.
                </p>
              )}
              {nfts === undefined && (
                <p className="mint-muted" style={{ marginTop: 14 }}>
                  Loading your cards...
                </p>
              )}
            </section>
            <section className="mint-panel">
              <div className="mint-row">
                <span className="mint-overline">02 / OPEN LOBBIES</span>
                <span>{publicLobbies?.length ?? '—'}</span>
              </div>
              <div className="mint-list" style={{ marginTop: 16 }}>
                {publicLobbies === undefined ? (
                  <p className="mint-muted">Finding matches...</p>
                ) : publicLobbies.length === 0 ? (
                  <p className="mint-muted">
                    No open tables. Start one and invite a rival.
                  </p>
                ) : (
                  publicLobbies.map((lobby) => (
                    <div className="mint-list-item" key={lobby._id}>
                      <div>
                        <strong>
                          {getPlayerDisplayName(
                            lobby.creatorAddress,
                            lobby.creatorName,
                          )}
                        </strong>
                        <small>
                          {lobby.lobbyId} · {formatTimeLeft(lobby.expiresAt)}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="mint-button mint-button-secondary"
                        disabled={busy}
                        onClick={() =>
                          join(lobby.lobbyId, lobby.creatorAddress)
                        }
                      >
                        {lobby.creatorAddress === selectedAccount.address
                          ? 'Enter'
                          : 'Join'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
            <section className="mint-panel">
              <span className="mint-overline">03 / YOUR MATCHES</span>
              {activeBattles === undefined ? (
                <p className="mint-muted">Loading matches...</p>
              ) : activeBattles.length === 0 ? (
                <p className="mint-muted">No ongoing matches.</p>
              ) : (
                <div className="mint-list" style={{ marginTop: 12 }}>
                  {activeBattles.map((battle) => (
                    <div className="mint-list-item" key={battle._id}>
                      <div>
                        <strong>
                          Turn {battle.gameState.turnNumber} ·{' '}
                          {battle.gameState.currentTurn ===
                          selectedAccount.address
                            ? 'Your turn'
                            : 'Waiting'}
                        </strong>
                        <small>
                          vs{' '}
                          {getPlayerDisplayName(
                            battle.player1Address === selectedAccount.address
                              ? battle.player2Address
                              : battle.player1Address,
                            battle.player1Address === selectedAccount.address
                              ? battle.player2Name
                              : battle.player1Name,
                          )}
                        </small>
                      </div>
                      <Link
                        href={`/battle/play/${battle.battleId}`}
                        className="mint-text-button"
                      >
                        Continue →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
        <section className="mint-panel" style={{ marginTop: 24 }}>
          <div className="mint-row">
            <div>
              <span className="mint-overline">MATCH ARCHIVE</span>
              <h2 style={{ fontSize: 22, marginTop: 5 }}>Past battles</h2>
            </div>
            <Swords size={22} color="#bafc9c" />
          </div>
          {history === undefined ? (
            <p className="mint-muted">Loading results...</p>
          ) : history.length === 0 ? (
            <p className="mint-muted" style={{ marginTop: 12 }}>
              Your first result will appear here.
            </p>
          ) : (
            <div className="mint-list" style={{ marginTop: 16 }}>
              {history.map((battle) => (
                <div className="mint-list-item" key={battle._id}>
                  <div>
                    <strong>
                      {battle.gameState.winner === selectedAccount.address
                        ? 'Victory'
                        : 'Defeat'}{' '}
                      · vs{' '}
                      {getPlayerDisplayName(
                        battle.player1Address === selectedAccount.address
                          ? battle.player2Address
                          : battle.player1Address,
                        battle.player1Address === selectedAccount.address
                          ? battle.player2Name
                          : battle.player1Name,
                      )}
                    </strong>
                    <small>
                      {battle.gameState.turnNumber} turns ·{' '}
                      {getNFTTypeName(
                        battle.player1Address === selectedAccount.address
                          ? battle.player1NFT.stats.nftType
                          : battle.player2NFT.stats.nftType,
                      )}{' '}
                      card
                    </small>
                  </div>
                  <Link
                    href={`/battle/play/${battle.battleId}`}
                    className="mint-text-button"
                  >
                    View result →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
