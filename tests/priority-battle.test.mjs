import { describe, expect, test } from 'bun:test';
import {
  changeActiveCard,
  expirePendingRound,
  getBattle,
  getBattleWithNFTData,
  submitRoundAction,
} from '../convex/battle.ts';
import { getFallbackMoves, hasTypedMoves } from '../lib/battle-utils.ts';

function card(owner, index, type, speed, health = 120) {
  return {
    collection: owner,
    item: String(index),
    stats: {
      attack: 35,
      defense: 5,
      strength: 20,
      intelligence: 10,
      luck: 0,
      speed,
      maxHealth: health,
      nftType: type,
      generatedAt: 1,
    },
    moves: getFallbackMoves(type, `${owner}:${index}`),
  };
}

function setup({
  typeA = 1,
  typeB = 0,
  speedA = 50,
  speedB = 10,
  healthB = 120,
} = {}) {
  const a = Array.from({ length: 3 }, (_, i) => card('A', i, typeA, speedA));
  const b = Array.from({ length: 3 }, (_, i) =>
    card('B', i, typeB, speedB, healthB),
  );
  const battle = {
    _id: 'battle',
    battleId: 'TEST',
    rulesVersion: 2,
    player1Address: 'A',
    player2Address: 'B',
    player1Roster: a,
    player2Roster: b,
    player1NFT: a[0],
    player2NFT: b[0],
    moves: [],
    gameState: {
      status: 'active',
      currentTurn: 'A',
      turnNumber: 0,
      roundChoices: {},
      player1Lineup: [0, 1, 2],
      player2Lineup: [0, 1, 2],
      player1Active: 0,
      player2Active: 0,
      player1Health: 120,
      player1MaxHealth: 120,
      player2Health: healthB,
      player2MaxHealth: healthB,
      player1CardHealth: [120, 120, 120],
      player2CardHealth: [healthB, healthB, healthB],
      protectStreak1: [0, 0, 0],
      protectStreak2: [0, 0, 0],
    },
  };
  const scheduled = [];
  const ctx = {
    scheduler: { runAfter: async (_delay, _fn, args) => scheduled.push(args) },
    db: {
      query: () => ({
        filter: () => ({ first: async () => battle }),
        withIndex: () => ({ first: async () => null }),
      }),
      patch: async (_id, updates) => Object.assign(battle, updates),
    },
  };
  const submit = (
    side,
    action,
    cardIndex,
    expectedRound = battle.gameState.turnNumber + 1,
  ) =>
    submitRoundAction._handler(ctx, {
      battleId: 'TEST',
      playerAddress: side,
      expectedRound,
      action,
      ...(cardIndex === undefined ? {} : { cardIndex }),
    });
  const attack = (side, index = 0) =>
    (side === 'A' ? a : b)[index].moves[0].name;
  const utility = (side, index = 0) =>
    (side === 'A' ? a : b)[index].moves[3].name;
  return { battle, ctx, a, b, submit, attack, utility, scheduled };
}

describe('typed moves and priority rounds', () => {
  test('fallback contains three attacks of the card type and one utility move', () => {
    for (const type of [0, 1, 2]) {
      const moves = getFallbackMoves(type, `card-${type}`);
      expect(hasTypedMoves(moves, type)).toBe(true);
      expect(moves.slice(0, 3).every((move) => move.element === type)).toBe(
        true,
      );
      expect(moves[3].element).toBeUndefined();
    }
    expect(() => getFallbackMoves(4)).toThrow('Unknown NFT type');
  });

  test('locks one action per player and resolves attacks in speed order', async () => {
    const { battle, submit, attack, scheduled, ctx } = setup({
      speedA: 5,
      speedB: 60,
    });
    expect((await submit('A', attack('A'))).resolved).toBe(false);
    expect(battle.gameState.roundChoices.player1.action).toBe(attack('A'));
    await expect(submit('A', attack('A'))).rejects.toThrow('already locked');
    expect((await submit('B', attack('B'))).resolved).toBe(true);
    expect(battle.moves.map((move) => move.player)).toEqual(['B', 'A']);
    expect(battle.gameState.roundChoices).toEqual({});
    expect(scheduled).toEqual([{ battleId: 'TEST', round: 1 }]);
    await expirePendingRound._handler(ctx, scheduled[0]);
    expect(battle.gameState.status).toBe('active');
    await expect(submit('A', attack('A'), undefined, 1)).rejects.toThrow(
      'Round changed',
    );
  });

  test('finishes a stalled round once, without winner credits', async () => {
    const { battle, ctx, submit, attack, scheduled } = setup();
    await submit('A', attack('A'));
    battle.gameState.roundDeadline = Date.now() - 1;
    await expirePendingRound._handler(ctx, scheduled[0]);
    expect(battle.gameState.status).toBe('finished');
    expect(battle.gameState.winner).toBe('A');
    expect(battle.gameState.roundChoices).toEqual({});
    await expirePendingRound._handler(ctx, scheduled[0]);
    await expect(submit('B', attack('B'))).rejects.toThrow('not active');
  });

  test('does not reveal an unopposed locked move through battle queries', async () => {
    const { ctx, submit, attack } = setup();
    await submit('A', attack('A'));
    const basic = await getBattle._handler(ctx, { battleId: 'TEST' });
    const withNFTs = await getBattleWithNFTData._handler(ctx, {
      battleId: 'TEST',
    });
    expect(basic.gameState.roundChoices.player1).toEqual({
      action: 'Selected',
    });
    expect(withNFTs.gameState.roundChoices.player1).toEqual({
      action: 'Selected',
    });
  });

  test('uses elemental matchup from the move and applies both directions', async () => {
    for (const [attacker, defender, expected] of [
      [1, 0, 1.5],
      [0, 1, 0.65],
      [0, 2, 1.5],
      [2, 0, 0.65],
      [2, 1, 1.5],
      [1, 2, 0.65],
      [1, 1, 1],
    ]) {
      const { battle, submit, attack } = setup({
        typeA: attacker,
        typeB: defender,
      });
      await submit('A', attack('A'));
      await submit('B', attack('B'));
      expect(
        battle.moves.find((event) => event.player === 'A').effectiveness,
      ).toBe(expected);
    }
  });

  test('rejects forged moves, invalid targets, and old switching shortcut', async () => {
    const { ctx, submit, attack, battle } = setup();
    await expect(submit('A', 'Fake Move')).rejects.toThrow('not available');
    await expect(submit('A', attack('A'), 2)).rejects.toThrow('Only Switchout');
    await expect(
      changeActiveCard._handler(ctx, {
        battleId: 'TEST',
        playerAddress: 'A',
        cardIndex: 1,
      }),
    ).rejects.toThrow('Use the Switchout');
    battle.player1Roster[0].moves[0].element = 2;
    await expect(
      submit('A', battle.player1Roster[0].moves[0].name),
    ).rejects.toThrow('not available');
  });

  test('Protect acts before a faster attack; consecutive odds halve and reset after attacking', async () => {
    const setupResult = setup({ speedA: 1, speedB: 99 });
    const { battle, submit, attack } = setupResult;
    battle.player1Roster[0].moves[3] = {
      name: 'Protect',
      kind: 'protect',
      description: 'Block damage.',
      iconName: 'Shield',
    };
    await submit('B', attack('B'));
    await submit('A', 'Protect');
    expect(battle.moves[0].protectSuccess).toBe(true);
    expect(battle.moves[1].blocked).toBe(true);
    expect(battle.moves[1].damage).toBe(0);
    expect(battle.gameState.player1Health).toBe(120);
    expect(battle.gameState.protectStreak1[0]).toBe(1);
    await submit('A', 'Protect');
    await submit('B', attack('B'));
    expect(battle.gameState.protectStreak1[0]).toBe(2);
    await submit('A', attack('A'));
    await submit('B', attack('B'));
    expect(battle.gameState.protectStreak1[0]).toBe(0);
  });

  test('failed consecutive Protect allows damage and an equal-speed attack tie favors player one', async () => {
    const { battle, submit, attack } = setup({ speedA: 50, speedB: 50 });
    battle.player1Roster[0].moves[3] = {
      name: 'Protect',
      kind: 'protect',
      description: 'Block damage.',
      iconName: 'Shield',
    };
    battle.gameState.protectStreak1[0] = 1;
    await submit('A', 'Protect');
    await submit('B', attack('B'));
    expect(battle.moves[0].protectSuccess).toBe(false);
    expect(battle.moves[1].damage).toBeGreaterThan(0);
    await submit('B', attack('B'));
    await submit('A', attack('A'));
    expect(battle.moves[2].player).toBe('A');
    expect(battle.gameState.protectStreak1[0]).toBe(0);
  });

  test('an early KO cancels the slower action and cannot pay the reward twice', async () => {
    const { battle, submit, attack } = setup({ healthB: 1 });
    battle.gameState.player2CardHealth = [1, 0, 0];
    await submit('B', attack('B'));
    await submit('A', attack('A'));
    expect(battle.moves.map((move) => move.player)).toEqual(['A']);
    expect(battle.gameState.winner).toBe('A');
    await expect(submit('A', attack('A'))).rejects.toThrow('not active');
  });

  test('Switchout precedes attacks; KO cancels slower attack and requires forced replacement', async () => {
    const { battle, ctx, submit, attack, b } = setup({ healthB: 1, speedB: 1 });
    b[0].moves[3] = {
      name: 'Switchout',
      description: 'Switch.',
      iconName: 'Wind',
      kind: 'switchout',
    };
    await expect(submit('B', 'Switchout', 0)).rejects.toThrow(
      'surviving reserve',
    );
    await expect(submit('B', 'Switchout', 3)).rejects.toThrow(
      'surviving reserve',
    );
    await submit('B', 'Switchout', 1);
    await submit('A', attack('A'));
    expect(battle.moves[0].kind).toBe('switch');
    expect(battle.moves[1].targetIndex).toBe(1);
    expect(battle.gameState.player2Active).toBeUndefined();
    await expect(submit('A', attack('A'))).rejects.toThrow('replacement card');
    await changeActiveCard._handler(ctx, {
      battleId: 'TEST',
      playerAddress: 'B',
      cardIndex: 2,
    });
    expect(battle.gameState.player2Active).toBe(2);
    expect(battle.gameState.turnNumber).toBe(1);
  });
});
