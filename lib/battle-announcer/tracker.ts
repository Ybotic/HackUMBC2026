import type { Doc } from '../../convex/_generated/dataModel';
import type { AnnouncerEvent } from './dialogue.ts';

export type BattleSnapshot = Pick<
  Doc<'battles'>,
  | 'battleId'
  | 'player1Address'
  | 'player2Address'
  | 'player1NFT'
  | 'player2NFT'
  | 'player1Roster'
  | 'player2Roster'
  | 'gameState'
  | 'moves'
  | 'rulesVersion'
>;

type Side = 0 | 1;
const other = (side: Side): Side => (side === 0 ? 1 : 0);

export class BattleAnnouncerTracker {
  private seen = new Set<string>();
  private hp: [Map<number, number>, Map<number, number>] = [
    new Map(),
    new Map(),
  ];
  private status?: BattleSnapshot['gameState']['status'];
  private round = 0;
  private active: [number | undefined, number | undefined] = [
    undefined,
    undefined,
  ];
  private close = false;
  private bothLow = false;
  private pendingOpponentLastCard = false;
  private readonly battleId: string;
  private readonly address: string;
  constructor(battleId: string, address: string) {
    this.battleId = battleId;
    this.address = address;
  }

  private side(battle: BattleSnapshot): Side {
    return battle.player1Address === this.address ? 0 : 1;
  }

  private lineup(battle: BattleSnapshot, side: Side) {
    return (
      (side === 0
        ? battle.gameState.player1Lineup
        : battle.gameState.player2Lineup) ?? [0]
    );
  }

  private roster(battle: BattleSnapshot, side: Side) {
    return (
      (side === 0 ? battle.player1Roster : battle.player2Roster) ?? [
        side === 0 ? battle.player1NFT : battle.player2NFT,
      ]
    );
  }

  private max(battle: BattleSnapshot, side: Side, index: number) {
    return this.roster(battle, side)[index]?.stats.maxHealth ?? 0;
  }

  private snapshot(battle: BattleSnapshot) {
    const state = battle.gameState;
    for (const side of [0, 1] as const) {
      const health =
        side === 0 ? state.player1CardHealth : state.player2CardHealth;
      const active = side === 0 ? state.player1Active : state.player2Active;
      const current = side === 0 ? state.player1Health : state.player2Health;
      for (const index of this.lineup(battle, side)) {
        this.hp[side].set(
          index,
          health?.[index] ??
            (index === (active ?? 0) ? current : this.max(battle, side, index)),
        );
      }
    }
    this.active = [
      state.player1Active ?? (battle.player1Roster ? undefined : 0),
      state.player2Active ?? (battle.player2Roster ? undefined : 0),
    ];
    this.status = state.status;
    this.round = state.turnNumber;
    this.close = this.isClose(battle);
    this.bothLow = this.isBothLow(battle);
  }

  private survivors(battle: BattleSnapshot, side: Side) {
    return this.lineup(battle, side).filter(
      (index) => (this.hp[side].get(index) ?? 0) > 0,
    ).length;
  }

  private activeRatio(battle: BattleSnapshot, side: Side) {
    const index = side === 0 ? this.active[0] : this.active[1];
    const max = index === undefined ? 0 : this.max(battle, side, index);
    return index !== undefined && max > 0
      ? (this.hp[side].get(index) ?? 0) / max
      : 0;
  }

  private isBothLow(battle: BattleSnapshot) {
    const a = this.activeRatio(battle, 0);
    const b = this.activeRatio(battle, 1);
    return a > 0 && a <= 0.25 && b > 0 && b <= 0.25;
  }

  // A close match requires equal surviving lineups and BOTH active cards in the 25–50% band.
  private isClose(battle: BattleSnapshot) {
    const a = this.activeRatio(battle, 0);
    const b = this.activeRatio(battle, 1);
    return (
      a > 0.25 &&
      a <= 0.5 &&
      b > 0.25 &&
      b <= 0.5 &&
      this.survivors(battle, 0) === this.survivors(battle, 1)
    );
  }

  consume(battle: BattleSnapshot): AnnouncerEvent[] {
    if (
      battle.battleId !== this.battleId ||
      (this.address !== battle.player1Address &&
        this.address !== battle.player2Address)
    )
      return [];
    if (this.status === undefined) {
      battle.moves.forEach((move) => this.seen.add(move.turnId));
      this.snapshot(battle);
      return [];
    }
    const events: AnnouncerEvent[] = [];
    const you = this.side(battle);
    const previousStatus = this.status;
    const previousRound = this.round;
    const wasClose = this.close;
    const wasBothLow = this.bothLow;
    const beforeSurvivors = [
      this.survivors(battle, 0),
      this.survivors(battle, 1),
    ];
    const newMoves = battle.moves.filter((move) => !this.seen.has(move.turnId));
    const result =
      battle.gameState.status === 'finished' &&
      !!battle.gameState.winner &&
      previousStatus !== 'finished';

    for (const move of newMoves) {
      this.seen.add(move.turnId);
      const actor: Side = move.player === battle.player1Address ? 0 : 1;
      const mine = actor === you;
      const kind = move.kind ?? 'attack'; // Legacy pre-typed battles recorded attacks without kind.
      if (kind === 'switch') {
        // A replacement is a free switch after a KO, not a tactical switch.
        if (
          !move.turnId.endsWith('-replacement') &&
          move.action !== 'Replaced card'
        )
          events.push(mine ? 'yourSwitch' : 'opponentSwitch');
        continue;
      }
      if (kind === 'protect') {
        events.push(
          mine
            ? move.protectSuccess
              ? 'yourProtectSuccess'
              : 'yourProtectFail'
            : move.protectSuccess
              ? 'opponentProtectSuccess'
              : 'opponentProtectFail',
        );
        continue;
      }
      const target = other(actor);
      const index =
        move.targetIndex ??
        (this.roster(battle, target).length === 1 ? 0 : this.active[target]);
      const max = index === undefined ? 0 : this.max(battle, target, index);
      const oldHp =
        index === undefined ? undefined : this.hp[target].get(index);
      if (index !== undefined && move.targetHealth !== undefined)
        this.hp[target].set(index, move.targetHealth);
      const ko = move.targetHealth === 0 && oldHp !== undefined && oldHp > 0;
      const crossing =
        oldHp !== undefined &&
        max > 0 &&
        move.targetHealth !== undefined &&
        move.targetHealth > 0 &&
        (move.damage ?? 0) > 0 &&
        !move.blocked;
      let event: AnnouncerEvent;
      if (ko && !result)
        event = target === you ? 'yourKnockout' : 'opponentKnockout';
      else if (move.blocked) event = 'attackBlocked';
      else if (move.effectiveness === 0) event = 'noEffect';
      else if (move.wasCritical)
        event = mine ? 'yourCritical' : 'opponentCritical';
      else if (move.effectiveness !== undefined && move.effectiveness > 1)
        event = 'superEffective';
      else if (move.effectiveness !== undefined && move.effectiveness < 1)
        event = 'resisted';
      else if (
        crossing &&
        oldHp / max > 0.25 &&
        (move.targetHealth ?? 0) / max <= 0.25
      )
        event = target === you ? 'yourLowHealth' : 'opponentLowHealth';
      else if (
        crossing &&
        oldHp / max > 0.5 &&
        (move.targetHealth ?? 0) / max <= 0.5
      )
        event = target === you ? 'yourHalfHealth' : 'opponentHalfHealth';
      else if ((move.damage ?? 0) >= max * 0.3 && max > 0)
        event = mine ? 'yourBigHit' : 'opponentBigHit';
      else if ((move.damage ?? 0) > 0) event = mine ? 'yourHit' : 'opponentHit';
      else continue; // An unrecorded/zero-damage attack is not a hit.
      events.push(event);
    }

    // Reconcile all card health from the authoritative snapshot before contextual lines.
    const afterSurvivors = [0, 1].map((side) => {
      const health =
        side === 0
          ? battle.gameState.player1CardHealth
          : battle.gameState.player2CardHealth;
      return this.lineup(battle, side as Side).filter(
        (index) =>
          (health?.[index] ?? this.hp[side as Side].get(index) ?? 0) > 0,
      ).length;
    });
    this.snapshot(battle);
    if (result)
      events.push(
        battle.gameState.winner === this.address ? 'victory' : 'defeat',
      );
    else if (battle.gameState.status === 'active') {
      if (previousStatus === 'initializing') events.push('battleStart');
      if (
        newMoves.length &&
        previousRound === 0 &&
        battle.gameState.turnNumber > 0
      )
        events.push('openingAction');
      else if (newMoves.length && battle.gameState.turnNumber > previousRound)
        events.push('newRound');
      if (
        newMoves.some(
          (move) => move.targetHealth === 0 && move.player !== this.address,
        ) &&
        this.active[you] === undefined &&
        afterSurvivors[you] > 0
      )
        events.push('forcedReplacement');
      for (const side of [0, 1] as const) {
        if (beforeSurvivors[side] > 1 && afterSurvivors[side] === 1) {
          if (side === you) events.push('yourLastCard');
          else this.pendingOpponentLastCard = true;
          events.push(side === you ? 'opponentMatchPoint' : 'yourMatchPoint');
        }
      }
      if (
        this.pendingOpponentLastCard &&
        this.active[other(you)] !== undefined
      ) {
        events.push('opponentLastCard');
        this.pendingOpponentLastCard = false;
      }
      if (this.bothLow && !wasBothLow) events.push('bothLowHealth');
      else if (this.close && !wasClose) events.push('closeMatch');
    }
    if (result) this.pendingOpponentLastCard = false;
    return events;
  }
}
