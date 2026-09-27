import assert from 'node:assert/strict';
import test from 'node:test';
import { stat } from 'node:fs/promises';
import { BattleAnnouncerTracker } from '../lib/battle-announcer/tracker.ts';
import { AnnouncerPlayback } from '../lib/battle-announcer/playback.ts';
import {
  createLinePicker,
  dialogue,
} from '../lib/battle-announcer/dialogue.ts';
import manifest from '../public/announcer/manifest.json' with { type: 'json' };

test('every dialogue variation has a nonempty generated clip', async () => {
  const ids = Object.entries(dialogue).flatMap(([event, lines]) =>
    lines.map((_, index) => `${event}-${index + 1}`),
  );
  assert.equal(ids.length, 63);
  assert.deepEqual(Object.keys(manifest).sort(), ids.sort());
  for (const id of ids) {
    assert.equal(manifest[id], `/announcer/${id}.mp3`);
    assert.ok(
      (await stat(new URL(`../public/announcer/${id}.mp3`, import.meta.url)))
        .size > 1000,
    );
  }
});

const card = (maxHealth = 100) => ({
  collection: 'c',
  item: '1',
  stats: { maxHealth },
});
function battle() {
  const roster = [card(), card(200), card(80)];
  return {
    battleId: 'battle',
    player1Address: 'alice',
    player2Address: 'bob',
    rulesVersion: 2,
    player1NFT: roster[0],
    player2NFT: roster[0],
    player1Roster: roster,
    player2Roster: roster,
    moves: [],
    gameState: {
      status: 'active',
      turnNumber: 0,
      player1Active: 0,
      player2Active: 0,
      player1Lineup: [0, 1, 2],
      player2Lineup: [0, 1, 2],
      player1CardHealth: [100, 200, 80],
      player2CardHealth: [100, 200, 80],
      player1Health: 100,
      player2Health: 100,
    },
  };
}
const move = (turnId, player, fields = {}) => ({
  turnId,
  player,
  turnNumber: 1,
  timestamp: 1,
  action: 'Strike',
  kind: 'attack',
  damage: 10,
  targetHealth: 90,
  targetIndex: 0,
  ...fields,
});
const next = (b, moves, fields = {}) => ({
  ...b,
  moves,
  gameState: { ...b.gameState, turnNumber: 1, ...fields },
});
function cursor(b, who = 'alice') {
  const t = new BattleAnnouncerTracker('battle', who);
  assert.deepEqual(t.consume(b), []);
  return t;
}

test('refresh skips history and processes every confirmed priority move in order from either side', () => {
  const old = next(battle(), [move('old', 'alice')]);
  const a = cursor(old);
  const b = cursor(old, 'bob');
  const update = next(old, [
    ...old.moves,
    move('one', 'bob', { targetHealth: 80 }),
    move('two', 'alice', { targetHealth: 70 }),
  ]);
  assert.deepEqual(
    a.consume(update).filter((e) => e.endsWith('Hit')),
    ['opponentHit', 'yourHit'],
  );
  assert.deepEqual(
    b.consume(update).filter((e) => e.endsWith('Hit')),
    ['yourHit', 'opponentHit'],
  );
  assert.deepEqual(a.consume(update), []);
});

test('protect, block, immunity, critical, effectiveness and voluntary versus forced switch', () => {
  const base = battle();
  const t = cursor(base);
  const moves = [
    move('protect', 'alice', { kind: 'protect', protectSuccess: true }),
    move('blocked', 'bob', { blocked: true, damage: 0, targetHealth: 100 }),
    move('fail', 'bob', { kind: 'protect', protectSuccess: false }),
    move('switch', 'alice', { kind: 'switch', cardIndex: 1 }),
    move('forced', 'bob', {
      kind: 'switch',
      action: 'Replaced card',
      cardIndex: 1,
    }),
    move('crit', 'alice', { wasCritical: true, damage: 20, targetHealth: 80 }),
    move('effective', 'bob', {
      effectiveness: 2,
      damage: 20,
      targetHealth: 80,
    }),
    move('immune', 'alice', { effectiveness: 0, damage: 0, targetHealth: 80 }),
  ];
  const lines = t.consume(next(base, moves));
  assert.deepEqual(lines.slice(0, 7), [
    'yourProtectSuccess',
    'attackBlocked',
    'opponentProtectFail',
    'yourSwitch',
    'yourCritical',
    'superEffective',
    'noEffect',
  ]);
  assert.ok(!lines.includes('opponentSwitch'));
});

test('per-card thresholds use own max HP and exactly 50% / 25%, not knockout or repeats', () => {
  const base = battle();
  const t = cursor(base);
  const half = next(
    base,
    [move('half', 'bob', { targetHealth: 50, damage: 50 })],
    { player1CardHealth: [50, 200, 80], player1Health: 50 },
  );
  assert.ok(t.consume(half).includes('yourHalfHealth'));
  assert.deepEqual(t.consume(half), []);
  const low = next(
    half,
    [...half.moves, move('low', 'bob', { targetHealth: 25, damage: 25 })],
    { player1CardHealth: [25, 200, 80], player1Health: 25 },
  );
  assert.ok(t.consume(low).includes('yourLowHealth'));
  const switchAndHit = next(
    low,
    [
      ...low.moves,
      move('switch', 'alice', { kind: 'switch', cardIndex: 1 }),
      move('new-card', 'bob', {
        targetIndex: 1,
        damage: 150,
        targetHealth: 50,
      }),
    ],
    { player1Active: 1, player1CardHealth: [25, 50, 80], player1Health: 50 },
  );
  const lines = t.consume(switchAndHit);
  assert.ok(lines.includes('yourLowHealth'));
  assert.ok(!lines.includes('yourHalfHealth'));
  const ko = next(
    switchAndHit,
    [
      ...switchAndHit.moves,
      move('ko', 'bob', { targetIndex: 1, damage: 50, targetHealth: 0 }),
    ],
    {
      player1Active: undefined,
      player1CardHealth: [25, 0, 80],
      player1Health: 0,
    },
  );
  assert.ok(!t.consume(ko).includes('yourLowHealth'));
});

test('KO, forced replacement, match point and final-card entry are authoritative', () => {
  const base = battle();
  base.gameState.player2CardHealth = [100, 0, 80];
  const t = cursor(base);
  const ko = next(
    base,
    [move('ko', 'alice', { damage: 100, targetHealth: 0 })],
    {
      player2CardHealth: [0, 0, 80],
      player2Active: undefined,
      player2Health: 0,
    },
  );
  const lines = t.consume(ko);
  assert.ok(lines.includes('opponentKnockout'));
  assert.ok(lines.includes('yourMatchPoint'));
  assert.ok(!lines.includes('opponentLastCard'));
  const replacement = next(
    ko,
    [
      ...ko.moves,
      move('replacement', 'bob', {
        kind: 'switch',
        cardIndex: 2,
        action: 'Replaced card',
      }),
    ],
    { player2Active: 2, player2Health: 80 },
  );
  assert.ok(t.consume(replacement).includes('opponentLastCard'));
  const mine = cursor(battle(), 'alice');
  const myKo = next(
    battle(),
    [move('mine', 'bob', { damage: 100, targetHealth: 0 })],
    { player1Active: undefined, player1CardHealth: [0, 200, 80] },
  );
  assert.ok(mine.consume(myKo).includes('forcedReplacement'));
});

test('simultaneous KO/result prefers win/loss; abandoned does not narrate defeat', () => {
  const base = battle();
  const a = cursor(base);
  const b = cursor(base, 'bob');
  const final = next(
    base,
    [move('last', 'alice', { damage: 100, targetHealth: 0 })],
    { status: 'finished', winner: 'alice', player2CardHealth: [0, 0, 0] },
  );
  assert.ok(a.consume(final).includes('victory'));
  assert.ok(b.consume(final).includes('defeat'));
  assert.ok(!a.consume(final).includes('opponentKnockout'));
  assert.deepEqual(
    cursor(base).consume(next(base, [], { status: 'abandoned' })),
    [],
  );
});

test('legacy battles, big hits and both-low context require actual HP', () => {
  const base = battle();
  base.rulesVersion = undefined;
  base.player1Roster = base.player2Roster = undefined;
  base.gameState = {
    status: 'active',
    turnNumber: 0,
    player1Health: 100,
    player2Health: 100,
  };
  const t = cursor(base);
  const hit = next(
    base,
    [
      move('legacy', 'alice', {
        kind: undefined,
        targetIndex: undefined,
        damage: 31,
        targetHealth: 69,
      }),
    ],
    { player2Health: 69 },
  );
  assert.ok(t.consume(hit).includes('yourBigHit'));
  const low = next(
    hit,
    [
      ...hit.moves,
      move('low-a', 'bob', {
        kind: undefined,
        targetIndex: undefined,
        targetHealth: 20,
        damage: 80,
      }),
      move('low-b', 'alice', {
        kind: undefined,
        targetIndex: undefined,
        targetHealth: 20,
        damage: 49,
      }),
    ],
    { player1Health: 20, player2Health: 20 },
  );
  assert.ok(t.consume(low).includes('bothLowHealth'));
});

test('close match requires equal surviving cards and both active HP in the 25–50% band', () => {
  const base = battle();
  const t = cursor(base);
  const one = next(
    base,
    [move('one', 'alice', { damage: 55, targetHealth: 45 })],
    { player2CardHealth: [45, 200, 80], player2Health: 45 },
  );
  assert.ok(!t.consume(one).includes('closeMatch'));
  const two = next(
    one,
    [...one.moves, move('two', 'bob', { damage: 55, targetHealth: 45 })],
    { player1CardHealth: [45, 200, 80], player1Health: 45 },
  );
  assert.ok(t.consume(two).includes('closeMatch'));
  assert.deepEqual(t.consume(two), []);
});

test('audio is gated by gesture and global mute; absent clips still caption, no queue of stale clips', () => {
  const captions = [];
  const instances = [];
  const player = new AnnouncerPlayback(
    (text) => captions.push(text),
    () => {
      const audio = {
        onended: null,
        onerror: null,
        src: '',
        paused: false,
        play: async () => {},
        pause() {
          this.paused = true;
        },
      };
      instances.push(audio);
      return audio;
    },
    { 'victory-1': '/victory.mp3', 'victory-2': '/victory.mp3' },
  );
  player.setEnabled(true);
  player.announce(['victory']);
  assert.equal(instances.length, 0);
  player.allowInteraction();
  player.setMuted(true);
  player.announce(['victory']);
  assert.equal(instances.length, 0);
  player.setMuted(false);
  player.announce(['victory']);
  assert.equal(instances.length, 1);
  player.announce(['opponentHit', 'defeat']);
  assert.equal(instances.length, 1); // Higher priority caption, but no asset to play.
  player.setMuted(true);
  assert.equal(instances[0].paused, true);
  player.setMuted(false);
  player.announce(['opponentHit']);
  assert.equal(instances.length, 1);
  assert.ok(captions.length >= 4);
  player.dispose();
  const pick = createLinePicker(() => 0);
  assert.notEqual(pick('yourHit').id, pick('yourHit').id);
});

test('result interrupts a lower-priority clip rather than narrating a stale queue', () => {
  const sounds = [];
  const captions = [];
  const player = new AnnouncerPlayback(
    (line) => captions.push(line),
    () => {
      const clip = {
        src: '',
        onended: null,
        onerror: null,
        paused: false,
        play: async () => {},
        pause() {
          this.paused = true;
        },
      };
      sounds.push(clip);
      return clip;
    },
    {
      'yourHit-1': '/hit.mp3',
      'yourHit-2': '/hit.mp3',
      'yourHit-3': '/hit.mp3',
      'victory-1': '/win.mp3',
      'victory-2': '/win.mp3',
    },
  );
  player.setEnabled(true);
  player.allowInteraction();
  player.announce(['yourHit']);
  player.announce(['victory']);
  assert.equal(sounds.length, 2);
  assert.equal(sounds[0].paused, true);
  assert.equal(sounds[1].paused, false);
  assert.match(captions.at(-1), /match|champion/i);
  player.dispose();
});
