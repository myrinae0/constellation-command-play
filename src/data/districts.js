// Nouveau, as drawn on the city map. Coordinates are in the map's SVG
// viewBox (0 0 400 500). To add a district: add an entry with a polygon that
// doesn't overlap the others, an enemy pool, and a boss name.

/**
 * @typedef {Object} DistrictDef
 * @property {string} id
 * @property {string} name
 * @property {string} blurb
 * @property {number} fog        starting fog, 0 (clear) to 100
 * @property {number} threat     base danger, 1 to 4
 * @property {string[]} enemies  enemy ids from data/enemies.js
 * @property {{name: string, blurb: string}} boss
 * @property {number[][]} poly   SVG polygon points
 * @property {number[]} label    label anchor [x, y]
 */

/** @type {DistrictDef[]} */
export const DISTRICTS = [
  {
    id: 'dock', name: 'The Dock', fog: 40, threat: 1,
    blurb: 'Horizon Sector meets the ships here. Empty stalls, still stocked. Overturned crates.',
    enemies: ['stooped', 'lurcher'],
    boss: { name: 'The Porter', blurb: 'It still carries a crate no one asked for.' },
    poly: [[140, 265], [262, 260], [270, 390], [150, 385]], label: [205, 300],
  },
  {
    id: 'cranes', name: 'Crane Yards', fog: 100, threat: 1,
    blurb: 'Rusted cranes over the water, arms frozen mid-lift.',
    enemies: ['stooped', 'kneeler', 'lurcher'],
    boss: { name: 'The Long-Armed', blurb: 'It hangs from the crane cables like it was left there to dry.' },
    poly: [[262, 260], [385, 280], [388, 400], [270, 390]], label: [326, 318],
  },
  {
    id: 'canals', name: 'Lantern Canals', fog: 100, threat: 2,
    blurb: 'Narrow canals under low bridges. Lanterns float without anyone lighting them.',
    enemies: ['tidewalker', 'lurcher', 'choir'],
    boss: { name: 'The Lantern-Drinker', blurb: 'Every light it swallows makes it a little more sure of itself.' },
    poly: [[18, 140], [145, 135], [140, 265], [15, 275]], label: [100, 188],
  },
  {
    id: 'market', name: 'Undermarket', fog: 100, threat: 2,
    blurb: 'A covered market square. The stalls are full; the stallkeepers are not.',
    enemies: ['stooped', 'mourner', 'choir'],
    boss: { name: 'The Stallkeeper', blurb: 'It still makes change for no one.' },
    poly: [[255, 125], [382, 150], [385, 280], [262, 260]], label: [322, 176],
  },
  {
    id: 'sunken', name: 'Sunken Quarter', fog: 100, threat: 3,
    blurb: 'Half-sunken buildings, windows at the waterline, stairs that go down and keep going.',
    enemies: ['tidewalker', 'kneeler', 'mourner', 'grasper'],
    boss: { name: 'The Wader', blurb: 'It walks the flooded floors as if the water were a carpet.' },
    poly: [[15, 275], [140, 265], [150, 385], [70, 395], [15, 370]], label: [100, 306],
  },
  {
    id: 'archive', name: 'Archive Hill', fog: 70, threat: 2,
    blurb: 'Pale stone that hums when you speak. The keepers write every Truth twice.',
    enemies: ['choir', 'mourner', 'kneeler'],
    boss: { name: 'The Copyist', blurb: 'It writes on the air with a finger that has no ink.' },
    poly: [[135, 12], [265, 15], [255, 125], [145, 135]], label: [200, 112],
  },
  {
    id: 'streets', name: 'Shifting Streets', fog: 100, threat: 3,
    blurb: 'Streets that are never quite where you left them.',
    enemies: ['lurcher', 'choir', 'grasper'],
    boss: { name: 'The Wayfinder', blurb: 'It is lost too. It is angry about it.' },
    poly: [[265, 15], [385, 20], [382, 150], [255, 125]], label: [322, 52],
  },
  {
    id: 'glass', name: 'The Glasshouses', fog: 100, threat: 4,
    blurb: 'Greenhouses gone white with fog. Something still grows in one of them.',
    enemies: ['grasper', 'mourner', 'kneeler', 'lurcher'],
    boss: { name: 'The Gardener', blurb: 'It prunes things that are not there anymore.' },
    poly: [[15, 15], [135, 12], [145, 135], [18, 140]], label: [76, 40],
  },
];

/** The Stacks: Constellation's towers, always above the fog. */
export const STACKS = { name: 'The Stacks', x: 201, y: 197, poly: [[145, 135], [255, 125], [262, 260], [140, 265]] };

/** Not playable in v1: a landmark that hints at what's above the fog. */
export const LIGHTHOUSE = {
  name: 'Lighthouse Point',
  blurb: 'Its top is hidden in fog. The beam comes from above it. No one has climbed it.',
  x: 52, y: 452,
};

/** The sea along the south edge, where the ships come in. */
export const SEA_POLY = [[0, 368], [15, 370], [70, 395], [150, 385], [270, 390], [388, 400], [400, 400], [400, 500], [0, 500]];

/** The canal through the west districts (an SVG path). */
export const CANAL_PATH = 'M 72 138 C 58 190, 112 215, 88 268 S 60 340, 96 392';

/**
 * Map features a recorded Truth can add (or remove). `draw` is read by
 * ui/cityMap.js; `initial` features exist from the start.
 * @type {Record<string, {label: string, district: string, initial?: boolean, draw: Record<string, any>}>}
 */
export const FEATURES = {
  'ninth-bridge': { label: 'The Ninth Bridge', district: 'canals', initial: true, draw: { kind: 'bridge', x1: 64, y1: 236, x2: 112, y2: 244 } },
  'ninth-bridge-broken': { label: 'The Ninth Bridge (fallen)', district: 'canals', draw: { kind: 'brokenBridge', x1: 64, y1: 236, x2: 112, y2: 244 } },
  'dock-lamps': { label: 'Dock lamps', district: 'dock', draw: { kind: 'lamps', points: [[162, 352], [190, 356], [218, 358], [246, 360]] } },
  'bell-rope': { label: 'The bell rope', district: 'dock', draw: { kind: 'rope', x: 205, y: 336, y2: 440 } },
  'empty-ship': { label: 'The ship that came back', district: 'dock', draw: { kind: 'ship', x: 300, y: 446, ghost: true } },
  'crane-arm': { label: 'The swung crane arm', district: 'cranes', draw: { kind: 'arm', x1: 350, y1: 365, x2: 248, y2: 330 } },
  'canal-lanterns': { label: 'Floating lanterns', district: 'canals', draw: { kind: 'lamps', points: [[70, 166], [92, 206], [82, 222], [80, 186]] } },
  'ferry': { label: 'The ferry route', district: 'sunken', draw: { kind: 'route', d: 'M 88 300 Q 110 400 182 418' } },
  'dry-stairs': { label: 'The dry stairwells', district: 'sunken', draw: { kind: 'stairs', x: 118, y: 342 } },
  'drowned-bell': { label: 'The drowned bell', district: 'sunken', draw: { kind: 'bell', x: 42, y: 352 } },
  'market-fountain': { label: 'The hidden fountain', district: 'market', draw: { kind: 'fountain', x: 318, y: 214 } },
  'linden-courtyard': { label: 'The linden courtyard', district: 'market', draw: { kind: 'garden', x: 352, y: 246 } },
  'marlow-lane': { label: 'Marlow Lane', district: 'streets', draw: { kind: 'street', d: 'M 258 120 L 292 96 L 330 104 L 368 84' } },
  'humming-stone': { label: 'The humming stone', district: 'archive', draw: { kind: 'stone', x: 168, y: 86 } },
  'under-stacks': { label: 'The rooms under the Stacks', district: 'stacks', draw: { kind: 'tower', x: 232, y: 214 } },
  'glass-light': { label: 'Glasshouse panes, catching light', district: 'glass', draw: { kind: 'glint', x: 64, y: 84 } },
  'seed-garden': { label: 'The seed garden', district: 'glass', draw: { kind: 'garden', x: 104, y: 112 } },
  'lighthouse-lamp': { label: 'The lamp, answered', district: 'lighthouse', draw: { kind: 'beam' } },
};
