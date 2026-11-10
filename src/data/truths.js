// The Truths. "Everyone who arrives in Nouveau brings something with them.
// Not memories, but a truth." Each one can be recorded by the Archive (the city
// shifts: effects below) or kept sealed by whoever carries it (a personal
// bonus, and the letter holds them together in the fog).
//
// Effect types are handled in systems/truths.js EFFECTS. To add a Truth, add
// an entry; it enters the pool automatically.

/**
 * @typedef {{type: string, [key: string]: any}} Effect
 * @typedef {Object} TruthDef
 * @property {string} id
 * @property {'small'|'heavy'} weight
 * @property {string} district
 * @property {string} text
 * @property {{effects: Effect[], note: string}} record
 * @property {{stats: Partial<import('./classes.js').Stats>, note: string}} seal
 * @property {boolean} [arrivalOnly] only carried by arrivals (never found lying in the fog)
 */

/** @type {TruthDef[]} */
export const TRUTHS = [
  // ---- The Dock ----
  {
    id: 'dock-lamps', weight: 'small', district: 'dock',
    text: "The dock lamps were never broken. Someone has to say the word 'evening' out loud before they'll light.",
    record: { effects: [{ type: 'feature', id: 'dock-lamps' }, { type: 'fog', district: 'dock', amount: -15 }, { type: 'mod', key: 'holdBonus', amount: 1 }], note: 'The dock lamps light. Arrivals hold one watch longer before they fade.' },
    seal: { stats: { spd: 2 }, note: 'Quicker on their feet, as if walking toward a light.' },
  },
  {
    id: 'bell-rope', weight: 'small', district: 'dock',
    text: "The bell isn't rung by the ship. There's a rope, and it runs down into the water.",
    record: { effects: [{ type: 'feature', id: 'bell-rope' }, { type: 'mod', key: 'bellExact', amount: 1 }], note: 'Janice can follow the rope. She knows exactly when the next bell will ring.' },
    seal: { stats: { def: 2, hp: 6 }, note: 'Steadier. They listen for the bell before anyone else.' },
  },
  {
    id: 'empty-ship', weight: 'heavy', district: 'dock',
    text: 'One of the ships that left came back. It docked empty, and no one noticed.',
    record: { effects: [{ type: 'feature', id: 'empty-ship' }, { type: 'mod', key: 'arrivalsBonus', amount: 1 }, { type: 'mod', key: 'fogBreath', amount: 2 }], note: 'Ships carry one more arrival. But the empty ship brought fog with it: every bell, the fog breathes harder.' },
    seal: { stats: { atk: 4, hp: 10 }, note: 'They keep watching the water. Something in them refuses to leave.' },
  },
  // ---- Crane Yards ----
  {
    id: 'crane-cab', weight: 'small', district: 'cranes',
    text: "The tallest crane's cab still has power. The lever on the left swings the whole arm.",
    record: { effects: [{ type: 'feature', id: 'crane-arm' }, { type: 'threat', district: 'cranes', amount: -1 }, { type: 'fog', district: 'cranes', amount: -10 }], note: 'The crane arm swings over to the dock and makes a crossing. The yards get safer.' },
    seal: { stats: { atk: 2, def: 1 }, note: 'Their grip is surer.' },
  },
  {
    id: 'counting-song', weight: 'small', district: 'cranes',
    text: 'The yard workers sang a counting song. Each verse is a container number.',
    record: { effects: [{ type: 'resources', salvage: 40 }, { type: 'income', salvage: 4 }], note: '+40 salvage now, and the containers keep giving: +4 salvage every bell.' },
    seal: { stats: { hp: 10 }, note: 'They hum it under their breath. It seems to help.' },
  },
  {
    id: 'rust', weight: 'heavy', district: 'cranes',
    text: "The rust isn't rust. It's the fog, eating slowly enough to look normal.",
    record: { effects: [{ type: 'fog', district: 'cranes', amount: -35 }, { type: 'mod', key: 'forgeCost', amount: 25 }], note: 'Knowing it, the yards can be scoured: a lot of fog lifts. But Brooklyn has to treat every alloy now: forge costs rise 25%.' },
    seal: { stats: { def: 4, hp: 10 }, note: 'They check their own skin for rust. They never find any.' },
  },
  // ---- Lantern Canals ----
  {
    id: 'canal-lanterns', weight: 'small', district: 'canals',
    text: 'The canal lanterns float back to whoever lit them.',
    record: { effects: [{ type: 'feature', id: 'canal-lanterns' }, { type: 'fog', district: 'canals', amount: -15 }], note: 'Lanterns drift along the canal, and the fog thins around them.' },
    seal: { stats: { spd: 2 }, note: 'They always know the way back.' },
  },
  {
    id: 'ferry-pole', weight: 'small', district: 'canals',
    text: 'There is a ferry pole sunk at the third lock. The ferry still answers.',
    record: { effects: [{ type: 'feature', id: 'ferry' }, { type: 'threat', district: 'sunken', amount: -1 }], note: 'A ferry route opens into the Sunken Quarter. Missions there get safer.' },
    seal: { stats: { atk: 2, spd: 1 }, note: 'They move like someone with a ride waiting.' },
  },
  {
    id: 'ninth-bridge', weight: 'heavy', district: 'canals',
    text: "The Ninth Bridge won't hold. It only stands because no one has said so.",
    record: { effects: [{ type: 'removeFeature', id: 'ninth-bridge' }, { type: 'feature', id: 'ninth-bridge-broken' }, { type: 'fog', district: 'canals', amount: -30 }, { type: 'threat', district: 'sunken', amount: 1 }], note: 'The bridge falls, and its collapse seals a fog channel: much of the canal clears. But the way into the Sunken Quarter is gone, and missions there get harder.' },
    seal: { stats: { def: 4 }, note: 'They cross the bridge every day, carefully, and it holds.' },
  },
  // ---- Undermarket ----
  {
    id: 'hidden-fountain', weight: 'small', district: 'market',
    text: "There is a fountain beneath the market square. You reach it through the fishmonger's cellar.",
    record: { effects: [{ type: 'feature', id: 'market-fountain' }, { type: 'fog', district: 'market', amount: -15 }, { type: 'income', resonance: 4 }], note: 'The fountain runs again. +4 resonance every bell.' },
    seal: { stats: { hp: 10 }, note: 'They drink from it alone, sometimes.' },
  },
  {
    id: 'linden', weight: 'small', district: 'market',
    text: 'The flower that smells like this was called a linden. It still grows in one courtyard.',
    record: { effects: [{ type: 'feature', id: 'linden-courtyard' }, { type: 'mod', key: 'recoveryBonus', amount: 1 }], note: 'A courtyard to rest in. Thinned units recover a watch sooner.' },
    seal: { stats: { hp: 6, spd: 1 }, note: 'They carry the smell with them. People stand closer.' },
  },
  {
    id: 'stallkeepers', weight: 'heavy', district: 'market',
    text: "The stallkeepers didn't leave. They're still here; they just stopped being seen.",
    record: { effects: [{ type: 'fog', district: 'market', amount: -25 }, { type: 'mod', key: 'rescueBonus', amount: 1 }, { type: 'threat', district: 'market', amount: 1 }], note: 'Seen again, some of them can be brought home: rescues bring one more arrival. The unseen do not like being counted: the market gets harder.' },
    seal: { stats: { atk: 3, def: 3 }, note: 'They nod at empty stalls. Sometimes something nods back.' },
  },
  // ---- Sunken Quarter ----
  {
    id: 'dry-stairs', weight: 'small', district: 'sunken',
    text: 'In the Sunken Quarter, every seventh stairwell stays dry all the way down.',
    record: { effects: [{ type: 'feature', id: 'dry-stairs' }, { type: 'threat', district: 'sunken', amount: -1 }, { type: 'fog', district: 'sunken', amount: -10 }], note: 'Safe routes down. Missions in the Sunken Quarter get safer.' },
    seal: { stats: { def: 2, spd: 1 }, note: 'They count steps. They always know where they are.' },
  },
  {
    id: 'drowned-bell', weight: 'small', district: 'sunken',
    text: 'There is a second bell under the water. It rings when a ship leaves.',
    record: { effects: [{ type: 'feature', id: 'drowned-bell' }, { type: 'income', resonance: 3 }, { type: 'fog', district: 'sunken', amount: -10 }], note: 'Chen starts burning incense at the drowned bell too. +3 resonance every bell.' },
    seal: { stats: { hp: 8 }, note: 'They hear it, faintly, when no one else does.' },
  },
  {
    id: 'rain', weight: 'heavy', district: 'sunken',
    text: 'Tomorrow it will rain, and the rain will be clean.',
    record: { effects: [{ type: 'fogAll', amount: -10 }, { type: 'delayBell', amount: 3 }], note: 'The rain washes fog out of every district. But the ships wait it out: the next bell comes three watches late.' },
    seal: { stats: { spd: 3 }, note: 'They keep checking the sky.' },
  },
  // ---- Archive Hill ----
  {
    id: 'humming-stone', weight: 'small', district: 'archive',
    text: 'The Archive stone hums a different note for every Truth it holds. You can tune to it.',
    record: { effects: [{ type: 'feature', id: 'humming-stone' }, { type: 'mod', key: 'trainingDiscount', amount: 25 }, { type: 'fog', district: 'archive', amount: -15 }], note: 'Yue and Chen tune their lessons to the stone. Training costs 25% less.' },
    seal: { stats: { atk: 2, hp: 4 }, note: 'They hum along. They have perfect pitch now.' },
  },
  {
    id: 'second-copy', weight: 'small', district: 'archive',
    text: "The city's copy of every record is kept somewhere. It's under the Stacks.",
    record: { effects: [{ type: 'feature', id: 'under-stacks' }, { type: 'bunks', amount: 2 }], note: 'The rooms under the Stacks open up: +2 bunks.' },
    seal: { stats: { def: 2, hp: 4 }, note: 'They sleep better, knowing.' },
  },
  {
    id: 'first-page', weight: 'heavy', district: 'archive',
    text: "The first keeper wrote down a Truth no one was supposed to read. It's still on the first page.",
    record: { effects: [{ type: 'fog', district: 'archive', amount: -40 }, { type: 'resources', resonance: 60 }, { type: 'openOldestSeal' }], note: 'The hill clears and the ledger warms (+60 resonance). But reading the first page opens the oldest sealed letter in Constellation: it is recorded too.' },
    seal: { stats: { atk: 3, def: 3, hp: 6 }, note: 'They will not say what is on the first page.' },
  },
  // ---- Shifting Streets ----
  {
    id: 'marlow-lane', weight: 'small', district: 'streets',
    text: 'The street between the tailor and the clock shop is called Marlow Lane. It is still there if you call it by name.',
    record: { effects: [{ type: 'feature', id: 'marlow-lane' }, { type: 'threat', district: 'streets', amount: -1 }, { type: 'fog', district: 'streets', amount: -10 }], note: 'Marlow Lane stays put. The Shifting Streets get safer.' },
    seal: { stats: { spd: 2 }, note: 'They say the name under their breath, every corner.' },
  },
  {
    id: 'three-lefts', weight: 'small', district: 'streets',
    text: 'In the Shifting Streets, three left turns always bring you home.',
    record: { effects: [{ type: 'mod', key: 'retreatKeeps', amount: 1 }, { type: 'fog', district: 'streets', amount: -10 }], note: 'Squads that retreat still bring home what they found.' },
    seal: { stats: { def: 2, spd: 1 }, note: 'They never look lost. They sometimes are.' },
  },
  {
    id: 'not-real', weight: 'heavy', district: 'streets', arrivalOnly: true,
    text: "Someone in the Stacks isn't real. It's me.",
    record: { effects: [{ type: 'fog', district: 'streets', amount: -40 }, { type: 'threat', district: 'streets', amount: -1 }, { type: 'departCarrier' }], note: 'Written down, the streets settle and a lot of fog lifts. But the one who carried it walks to the next ship and boards. No one follows.' },
    seal: { stats: { atk: 5, def: 5 }, note: 'They hold on to it so tightly they feel more real than anyone.' },
  },
  // ---- The Glasshouses ----
  {
    id: 'glass-panes', weight: 'small', district: 'glass',
    text: 'Every glasshouse pane faces the lighthouse. They were built to catch its light.',
    record: { effects: [{ type: 'feature', id: 'glass-light' }, { type: 'threat', district: 'glass', amount: -1 }, { type: 'fog', district: 'glass', amount: -10 }], note: 'The panes catch the beam. The Glasshouses get safer.' },
    seal: { stats: { spd: 2, atk: 1 }, note: 'They turn toward light without meaning to.' },
  },
  {
    id: 'seed-drawer', weight: 'small', district: 'glass',
    text: 'There are seeds in the bottom drawer of the potting shed, labeled in my handwriting.',
    record: { effects: [{ type: 'feature', id: 'seed-garden' }, { type: 'income', salvage: 3, resonance: 3 }, { type: 'fog', district: 'glass', amount: -10 }], note: 'Something grows again. +3 salvage and +3 resonance every bell.' },
    seal: { stats: { hp: 12 }, note: 'They keep the seed packet in a pocket and never plant it.' },
  },
  {
    id: 'lamplighter', weight: 'heavy', district: 'glass',
    text: 'Someone climbs the lighthouse every night to light the lamp. No one in Nouveau has ever met them.',
    record: { effects: [{ type: 'feature', id: 'lighthouse-lamp' }, { type: 'mod', key: 'arrivalsBonus', amount: 1 }, { type: 'mod', key: 'holdBonus', amount: -1 }], note: 'The lamp answers. Ships bring one more arrival each, but they come faster than Horizon can greet them: arrivals hold one watch less.' },
    seal: { stats: { atk: 4, spd: 2 }, note: 'They look up at the lighthouse every night.' },
  },
];

/** The player's own letter. Unknown in v1 (an open question in the design doc). */
export const PLAYER_LETTER = {
  text: "Your own Truth. You know it's there, the way you know your hands are there. You can't read it yet.",
};

/**
 * Small procedural Truths for endless play, once the written ones run out.
 * systems/truths.js combines a subject and a detail with a district name.
 */
export const TRUTH_TEMPLATES = {
  subjects: [
    'A blue door', 'The third lamp from the corner', 'A cat with one white ear', 'The clock in the tailor\'s window',
    'A rope ladder', 'A tin roof', 'A painted step', 'A bench with two names carved in it', 'A rain barrel',
    'A hand-cranked radio', 'A row of empty birdcages', 'A cellar door', 'A chalk mark at knee height',
  ],
  details: [
    'still opens if you knock twice', 'was always meant to face the water', 'remembers the old name of the street',
    'stays warm on the coldest nights', 'leads somewhere no map shows', 'was left by someone who meant to come back',
    'hums when the fog is about to thin', 'points toward the Stacks no matter how you turn it',
  ],
};
