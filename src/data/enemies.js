// Creatures of the fog: "humanoid, but twisted in posture and motion. They move
// like beasts that once remembered how to stand."
//
// To add an enemy: add an entry here, then list its id in a district's
// `enemies` pool (data/districts.js). `shape` picks a silhouette in
// ui/battleView.js (stooped | lurcher | kneeler | choir | tall).

/**
 * @typedef {Object} EnemyDef
 * @property {string} name
 * @property {string} blurb
 * @property {import('./classes.js').Stats} base
 * @property {number} crit
 * @property {'front'|'weakest'|'strongest'|'random'} targeting
 * @property {import('./classes.js').SkillDef | null} skill
 * @property {string} shape
 * @property {boolean} [boss]
 * @property {number} row   0 = front, 2 = back
 */

/** @type {Record<string, EnemyDef>} */
export const ENEMIES = {
  stooped: {
    row: 0, name: 'Stooped', blurb: 'It walks like it has forgotten why.',
    base: { hp: 58, atk: 11, def: 3, spd: 9 }, crit: 0.05, targeting: 'front', skill: null, shape: 'stooped',
  },
  lurcher: {
    row: 1, name: 'Lurcher', blurb: 'All forward motion, no balance. It never quite falls.',
    base: { hp: 40, atk: 12, def: 2, spd: 14 }, crit: 0.1, targeting: 'weakest', skill: null, shape: 'lurcher',
  },
  kneeler: {
    row: 0, name: 'Kneeler', blurb: 'It kneels like it is waiting to be told it can rise.',
    base: { hp: 100, atk: 9, def: 7, spd: 6 }, crit: 0.03, targeting: 'front', shape: 'kneeler',
    skill: { kind: 'guard', name: 'Bow', cd: 4, text: 'Draws attacks to itself.', params: { shield: 0.1, taunt: 2 } },
  },
  choir: {
    row: 2, name: 'Hollow Choir', blurb: 'Three mouths, one note, no words.',
    base: { hp: 48, atk: 10, def: 2, spd: 8 }, crit: 0.05, targeting: 'random', shape: 'choir',
    skill: { kind: 'aoe', name: 'Dirge', cd: 3, text: 'A low note that thins everyone.', params: { power: 0.5 } },
  },
  tidewalker: {
    row: 0, name: 'Tidewalker', blurb: 'Canal water runs off it and never stops running.',
    base: { hp: 66, atk: 11, def: 4, spd: 10 }, crit: 0.05, targeting: 'front', shape: 'stooped',
    skill: { kind: 'strike', name: 'Undertow', cd: 3, text: 'Drags a target, slowing it.', params: { power: 1.0, target: 'front', slow: 2 } },
  },
  mourner: {
    row: 2, name: 'Mourner', blurb: 'It tends the others. It does not know why that hurts to watch.',
    base: { hp: 55, atk: 8, def: 3, spd: 9 }, crit: 0.03, targeting: 'random', shape: 'choir',
    skill: { kind: 'heal', name: 'Keening', cd: 3, text: 'Mends the most hurt creature.', params: { power: 2.2, team: false } },
  },
  grasper: {
    row: 1, name: 'Grasper', blurb: 'Long arms. It holds on to things it cannot name.',
    base: { hp: 70, atk: 12, def: 4, spd: 9 }, crit: 0.05, targeting: 'weakest', shape: 'tall',
    skill: { kind: 'strike', name: 'Hold', cd: 4, text: 'Grabs and stuns a target for a turn.', params: { power: 0.8, target: 'weakest', stun: 1 } },
  },
  // The last creature holding a district's fog together. Each district
  // renames it (districts.js `boss`).
  upright: {
    row: 0, name: 'The Upright', blurb: 'It almost remembers how to stand. That is worse.',
    base: { hp: 200, atk: 15, def: 7, spd: 10 }, crit: 0.08, targeting: 'front', shape: 'tall', boss: true,
    skill: { kind: 'aoe', name: 'Recollection', cd: 3, text: 'A wave of half-memory that hits everyone.', params: { power: 0.7 } },
  },
};
