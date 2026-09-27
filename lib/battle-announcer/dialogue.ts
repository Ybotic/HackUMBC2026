// Stable IDs double as generated clip filenames: <event>-<variation>.mp3.
export const dialogue = {
  battleStart: [
    'The arena is set. Let’s battle.',
    'Cards ready. The match begins.',
    'Two challengers. One arena.',
  ],
  openingAction: ['The opening move is in!', 'It all starts here.'],
  newRound: ['Another round. Another chance.', 'The battle rolls on.'],
  closeMatch: ['This could go either way!', 'Neither side is backing down.'],
  yourHit: ['A clean hit!', 'Direct hit!', 'Nicely played!'],
  opponentHit: ['That one hurt!', 'The rival finds an opening.'],
  yourBigHit: ['What a blow!', 'That shook the whole arena!'],
  opponentBigHit: ['A crushing blow!', 'Your card takes a heavy hit!'],
  yourCritical: [
    'Critical hit! What timing!',
    'That was a devastating strike!',
  ],
  opponentCritical: [
    'Ouch—a critical hit!',
    'The rival lands a crushing blow!',
  ],
  superEffective: [
    'A perfect matchup—super effective!',
    'That element was the right call!',
  ],
  resisted: [
    'Not very effective. Time to rethink that move.',
    'They shrugged that one off.',
  ],
  noEffect: ['No effect! That attack went nowhere.'],
  attackBlocked: ['The guard holds! No damage.', 'The attack meets a wall.'],
  yourProtectSuccess: ['Protected! Not a scratch.', 'Perfect defense!'],
  opponentProtectSuccess: [
    'The rival’s guard holds.',
    'Not getting through that shield.',
  ],
  yourProtectFail: [
    'The shield gives way!',
    'Protect couldn’t hold this time.',
  ],
  opponentProtectFail: ['Their guard falters!', 'An opening!'],
  yourSwitch: ['A tactical switch!', 'New card, new possibilities.'],
  opponentSwitch: [
    'The rival sends in a new card.',
    'A change of tactics from the other side.',
  ],
  forcedReplacement: [
    'Send in your next fighter.',
    'Your card is down. Choose who fights next.',
  ],
  yourHalfHealth: ['Your card is feeling the pressure.'],
  opponentHalfHealth: ['The rival is starting to wear down.'],
  yourLowHealth: [
    'Danger zone! Keep your card alive.',
    'One good hit could end this.',
  ],
  opponentLowHealth: ['They’re on the ropes!', 'The knockout is within reach.'],
  bothLowHealth: [
    'Whoever strikes next could take this!',
    'This round might decide it all.',
  ],
  yourKnockout: [
    'Your card falls—but your team fights on.',
    'Down one card. Stay focused.',
  ],
  opponentKnockout: ['That card is out!', 'One rival card down!'],
  yourLastCard: ['No reserves left. This is the final stand.'],
  opponentLastCard: ['Their final card enters the arena.'],
  yourMatchPoint: ['One knockout from victory!'],
  opponentMatchPoint: ['Your team can’t afford another knockout.'],
  victory: ['That’s the match! You win!', 'The arena has its champion!'],
  defeat: [
    'The rival takes this one.',
    'A tough loss—but the next battle awaits.',
  ],
} as const satisfies Record<string, readonly string[]>;

export type AnnouncerEvent = keyof typeof dialogue;

export const priority: Record<AnnouncerEvent, number> = {
  victory: 100,
  defeat: 100,
  yourKnockout: 90,
  opponentKnockout: 90,
  forcedReplacement: 90,
  yourLastCard: 85,
  opponentLastCard: 85,
  yourMatchPoint: 85,
  opponentMatchPoint: 85,
  yourCritical: 80,
  opponentCritical: 80,
  superEffective: 80,
  resisted: 80,
  noEffect: 80,
  attackBlocked: 80,
  yourLowHealth: 70,
  opponentLowHealth: 70,
  bothLowHealth: 70,
  yourSwitch: 60,
  opponentSwitch: 60,
  yourProtectSuccess: 60,
  opponentProtectSuccess: 60,
  yourProtectFail: 60,
  opponentProtectFail: 60,
  yourBigHit: 50,
  opponentBigHit: 50,
  yourHit: 40,
  opponentHit: 40,
  yourHalfHealth: 35,
  opponentHalfHealth: 35,
  battleStart: 10,
  openingAction: 10,
  newRound: 10,
  closeMatch: 10,
};

export function createLinePicker(random: () => number = Math.random) {
  const previous = new Map<AnnouncerEvent, number>();
  return (event: AnnouncerEvent) => {
    const lines = dialogue[event];
    const last = previous.get(event);
    const count = lines.length - (last === undefined ? 0 : 1);
    const choice = Math.min(
      count - 1,
      Math.max(0, Math.floor(random() * count)),
    );
    const index = last === undefined || choice < last ? choice : choice + 1;
    previous.set(event, index);
    return { id: `${event}-${index + 1}`, text: lines[index] as string, event };
  };
}
