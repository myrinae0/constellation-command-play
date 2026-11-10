// Keepsakes: gear left behind by earlier arrivals, recovered from the fog.
// Brooklyn retunes one to its new owner (one keepsake per unit).
// To add one: add an entry; recover-gear missions draw from this list.

/** @type {Array<{id: string, name: string, stats: Partial<import('./classes.js').Stats>, text: string}>} */
export const KEEPSAKES = [
  { id: 'riot-plate', name: 'Half-melted riot plate', stats: { def: 3 }, text: "From the city's first responders. Still warm, somehow." },
  { id: 'initial-lantern', name: 'Lantern with initials', stats: { spd: 2, hp: 4 }, text: 'The initials are not anyone in the Stacks.' },
  { id: 'salt-coat', name: 'Salt-stiff coat', stats: { def: 2, hp: 6 }, text: 'Someone wore it off a ship and then took it off again.' },
  { id: 'bell-compass', name: 'Compass that points at the bell', stats: { spd: 3 }, text: 'North is the dock. It has always been the dock.' },
  { id: 'whetstone', name: "Farmer's whetstone", stats: { atk: 3 }, text: 'Worn into a curve by a hand that knew what it was doing.' },
  { id: 'mirror-shards', name: 'Twin mirror shards', stats: { atk: 2, spd: 1 }, text: 'The reflections are a half-second late.' },
  { id: 'unspent-flare', name: 'Unspent signal flare', stats: { atk: 4 }, text: 'Whoever carried it decided not to call for help.' },
  { id: 'one-mitten', name: "A child's mitten", stats: { hp: 12 }, text: 'Only the one. Brooklyn holds it for a long time before handing it over.' },
  { id: 'ferry-ticket', name: 'Old ferry ticket', stats: { spd: 2, def: 1 }, text: 'One way. Unpunched.' },
  { id: 'star-patch', name: 'Silver-thread star patch', stats: { hp: 4, atk: 1, def: 1, spd: 1 }, text: 'Constellation stitches stars in silver. Someone wore these before you.' },
  { id: 'tuning-fork', name: 'Tuning fork', stats: { def: 2, atk: 2 }, text: 'It hums near the fog. Chen says it is homesick.' },
  { id: 'pocket-watch', name: 'Pocket watch, stopped at 3:12', stats: { spd: 2, hp: 4 }, text: 'Brooklyn could fix it. He says some things should be left.' },
];
