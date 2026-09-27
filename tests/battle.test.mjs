import { describe, expect, test } from 'bun:test';
import {
  changeActiveCard,
  confirmLineup,
  executeTurn,
} from '../convex/battle.ts';

const stats = (maxHealth, speed) => ({
  attack: 20,
  defense: 5,
  strength: 15,
  intelligence: 10,
  luck: 0,
  speed,
  nftType: 0,
  maxHealth,
  generatedAt: 1,
});
const roster = (owner, hp, speed) =>
  Array.from({ length: 4 }, (_, index) => ({
    collection: owner,
    item: String(index),
    stats: stats(hp, speed),
    moves: [
      { name: 'Strike', description: 'A basic hit.', iconName: 'Swords' },
    ],
  }));

function setup() {
  const battle = {
    _id: 'battle-id',
    battleId: 'BATTLE',
    player1Address: 'A',
    player2Address: 'B',
    player1Roster: roster('A', 100, 10),
    player2Roster: roster('B', 1, 5),
    player1NFT: roster('A', 100, 10)[0],
    player2NFT: roster('B', 1, 5)[0],
    gameState: {
      currentTurn: 'A',
      player1Health: 100,
      player2Health: 1,
      player1MaxHealth: 100,
      player2MaxHealth: 1,
      player1CardHealth: [100, 100, 100, 100],
      player2CardHealth: [1, 1, 1, 1],
      turnNumber: 0,
      status: 'initializing',
      player1Lineup: undefined,
      player2Lineup: undefined,
      player1Active: undefined,
      player2Active: undefined,
    },
    moves: [],
  };
  const ctx = {
    db: {
      query: (table) => ({
        filter: () => ({
          first: async () => (table === 'battles' ? battle : null),
        }),
        withIndex: () => ({ first: async () => null }),
      }),
      patch: async (_id, changes) => Object.assign(battle, changes),
    },
  };
  return { battle, ctx };
}

describe('three-card battles', () => {
  test('requires exactly three distinct roster cards and waits for both lineups', async () => {
    const { battle, ctx } = setup();
    await expect(
      confirmLineup._handler(ctx, {
        battleId: 'BATTLE',
        playerAddress: 'A',
        lineup: [0, 1, 1],
        activeIndex: 0,
      }),
    ).rejects.toThrow('Choose three distinct');
    await expect(
      confirmLineup._handler(ctx, {
        battleId: 'BATTLE',
        playerAddress: 'A',
        lineup: [0, 1, 4],
        activeIndex: 0,
      }),
    ).rejects.toThrow('Choose three distinct');
    await confirmLineup._handler(ctx, {
      battleId: 'BATTLE',
      playerAddress: 'A',
      lineup: [0, 1, 2],
      activeIndex: 1,
    });
    expect(battle.gameState.status).toBe('initializing');
    await confirmLineup._handler(ctx, {
      battleId: 'BATTLE',
      playerAddress: 'B',
      lineup: [0, 1, 2],
      activeIndex: 0,
    });
    expect(battle.gameState.status).toBe('active');
    expect(battle.player1NFT.item).toBe('1');
    expect(battle.gameState.currentTurn).toBe('A');
  });

  test('rejects forged moves and unusable cards; KO requires replacement; all three KOs finish', async () => {
    const { battle, ctx } = setup();
    await confirmLineup._handler(ctx, {
      battleId: 'BATTLE',
      playerAddress: 'A',
      lineup: [0, 1, 2],
      activeIndex: 0,
    });
    await confirmLineup._handler(ctx, {
      battleId: 'BATTLE',
      playerAddress: 'B',
      lineup: [0, 1, 2],
      activeIndex: 0,
    });
    await expect(
      executeTurn._handler(ctx, {
        battleId: 'BATTLE',
        playerAddress: 'A',
        action: 'Fake Move',
      }),
    ).rejects.toThrow('Move is not available');
    await executeTurn._handler(ctx, {
      battleId: 'BATTLE',
      playerAddress: 'A',
      action: 'Strike',
    });
    expect(battle.gameState.player2Active).toBeUndefined();
    await expect(
      executeTurn._handler(ctx, {
        battleId: 'BATTLE',
        playerAddress: 'B',
        action: 'Strike',
      }),
    ).rejects.toThrow('Choose a replacement');
    await expect(
      changeActiveCard._handler(ctx, {
        battleId: 'BATTLE',
        playerAddress: 'B',
        cardIndex: 3,
      }),
    ).rejects.toThrow('surviving reserve');
    await changeActiveCard._handler(ctx, {
      battleId: 'BATTLE',
      playerAddress: 'B',
      cardIndex: 1,
    });
    expect(battle.gameState.turnNumber).toBe(1);
    await executeTurn._handler(ctx, {
      battleId: 'BATTLE',
      playerAddress: 'B',
      action: 'Strike',
    });
    await executeTurn._handler(ctx, {
      battleId: 'BATTLE',
      playerAddress: 'A',
      action: 'Strike',
    });
    await changeActiveCard._handler(ctx, {
      battleId: 'BATTLE',
      playerAddress: 'B',
      cardIndex: 2,
    });
    await executeTurn._handler(ctx, {
      battleId: 'BATTLE',
      playerAddress: 'B',
      action: 'Strike',
    });
    await executeTurn._handler(ctx, {
      battleId: 'BATTLE',
      playerAddress: 'A',
      action: 'Strike',
    });
    expect(battle.gameState.status).toBe('finished');
    expect(battle.gameState.winner).toBe('A');
  });
});
