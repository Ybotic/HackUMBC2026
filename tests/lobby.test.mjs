import { describe, expect, test } from 'bun:test';
import { startBattleFromLobby, updateLobbyRoster } from '../convex/lobby.ts';

const refs = (count) =>
  Array.from({ length: count }, (_, i) => ({
    collection: 'C',
    item: String(i),
  }));

function setup() {
  const lobby = {
    _id: 'lobby-id',
    lobbyId: 'LOBBY',
    creatorAddress: 'A',
    joinedPlayerAddress: 'B',
    creatorRoster: undefined,
    joinerRoster: undefined,
    status: 'waiting',
  };
  const nft = (item) => ({
    owner: 'A',
    userAddress: 'user-A',
    stats: { attack: 1, maxHealth: 20 },
    customMoves: [],
  });
  const ctx = {
    db: {
      query: (table) => ({
        filter: () => ({
          first: async () => (table === 'lobbies' ? lobby : null),
        }),
        withIndex: (_index, useIndex) => {
          let key;
          useIndex?.({
            eq: (_field, value) => {
              key = value;
              return {
                eq: (_other, value2) => {
                  key = value2;
                },
              };
            },
          });
          return {
            first: async () =>
              table === 'users'
                ? { _id: `user-${key}` }
                : table === 'nftItems'
                  ? nft(key)
                  : null,
          };
        },
      }),
      patch: async (_id, changes) => Object.assign(lobby, changes),
    },
  };
  return { lobby, ctx };
}

describe('lobby roster limits', () => {
  test('allows partial edits, requires 3–5 distinct cards to lock, and resets readiness on edit', async () => {
    const { lobby, ctx } = setup();
    await updateLobbyRoster._handler(ctx, {
      lobbyId: 'LOBBY',
      playerAddress: 'A',
      cards: refs(2),
      isReady: false,
    });
    await expect(
      updateLobbyRoster._handler(ctx, {
        lobbyId: 'LOBBY',
        playerAddress: 'A',
        cards: refs(2),
        isReady: true,
      }),
    ).rejects.toThrow('at least 3');
    await expect(
      updateLobbyRoster._handler(ctx, {
        lobbyId: 'LOBBY',
        playerAddress: 'A',
        cards: [...refs(2), refs(2)[0]],
        isReady: false,
      }),
    ).rejects.toThrow('distinct');
    await expect(
      updateLobbyRoster._handler(ctx, {
        lobbyId: 'LOBBY',
        playerAddress: 'A',
        cards: refs(6),
        isReady: false,
      }),
    ).rejects.toThrow('no more than 5');
    await updateLobbyRoster._handler(ctx, {
      lobbyId: 'LOBBY',
      playerAddress: 'A',
      cards: refs(3),
      isReady: false,
    });
    await updateLobbyRoster._handler(ctx, {
      lobbyId: 'LOBBY',
      playerAddress: 'A',
      cards: refs(3),
      isReady: true,
    });
    expect(lobby.creatorRoster.isReady).toBe(true);
    await updateLobbyRoster._handler(ctx, {
      lobbyId: 'LOBBY',
      playerAddress: 'A',
      cards: refs(4),
      isReady: true,
    });
    expect(lobby.creatorRoster.isReady).toBe(false);
    expect(lobby.status).toBe('waiting');
  });

  test('rejects a non-creator starting a match', async () => {
    const { ctx, lobby } = setup();
    lobby.status = 'ready';
    lobby.creatorRoster = { cards: refs(3), isReady: true };
    lobby.joinerRoster = { cards: refs(3), isReady: true };
    await expect(
      startBattleFromLobby._handler(ctx, {
        lobbyId: 'LOBBY',
        initiatorAddress: 'B',
      }),
    ).rejects.toThrow('Only the lobby creator');
  });
});
