// Mission types Janice can brief, and the game's tunable numbers.
// To add a mission type: add an entry here and a reward handler in
// systems/missions.js REWARDS.

/**
 * @typedef {Object} MissionTypeDef
 * @property {string} name      label on the board
 * @property {string} verb      short action, used in the log
 * @property {number} weight    how often it appears on the board
 * @property {number} threat    added to the district's danger
 * @property {number} xp        experience for a victory
 * @property {{salvage: [number, number], resonance: [number, number]}} materials
 */

/** @type {Record<string, MissionTypeDef>} */
export const MISSION_TYPES = {
  push: { name: 'Push back the fog', verb: 'pushed back the fog in', weight: 5, threat: 0, xp: 55, materials: { salvage: [12, 20], resonance: [8, 14] } },
  rescue: { name: 'Rescue arrivals', verb: 'rescued arrivals in', weight: 2, threat: 0, xp: 50, materials: { salvage: [6, 10], resonance: [6, 10] } },
  gear: { name: 'Recover gear', verb: 'recovered gear in', weight: 2, threat: 0, xp: 50, materials: { salvage: [20, 30], resonance: [4, 8] } },
  truth: { name: 'Recover a Truth', verb: 'recovered a Truth in', weight: 0, threat: 1, xp: 60, materials: { salvage: [6, 10], resonance: [14, 22] } },
};

/** Tunable numbers in one place (balance.html in tests/ helps tune them). */
export const BALANCE = {
  startBunks: 6,
  boardSize: 3,
  missionLifetime: 3,      // watches before a mission leaves the board
  bellInterval: [3, 5],    // watches between ships
  arrivalsPerShip: [1, 2],
  arrivalHold: [1, 3],     // watches an arrival can stand on the dock before fading
  fogBreath: 2,            // fog every uncleared district gains at each bell
  pushFog: [22, 30],       // fog removed by a successful push
  sideFog: 6,              // fog removed by other successful missions
  recoveryWatches: 2,      // watches a thinned unit needs
  enemyGrowth: 0.17,       // enemy stat growth per level
  enemyScale: { hp: 1.1, atk: 1.35, def: 1 }, // global creature multipliers
  depthEvery: 5,           // victories per +1 global enemy level
  bossFogBelow: 34,        // push missions at or below this fog face the district boss
  lostTruthChance: 0.2,    // chance a push mission finds a lost Truth
  goalDistricts: 4,        // v1 goal: districts cleared of fog
  endlessFogReturn: 0.35,  // after v1, chance per bell that fog returns to a cleared district
  costs: {
    takeIn: 0,
    platform: { salvage: 80 },               // +2 bunks
    forge: { salvage: 25, resonance: 12 },   // per tier, times the tier
    retune: { resonance: 10 },               // equip a keepsake
    mentor: { salvage: 45, resonance: 45 },  // per rank (Yue uses salvage, Chen resonance)
    trainPath: { salvage: 20, resonance: 20 },
    trainHybrid: { salvage: 45, resonance: 45 },
  },
  forgeMaxTier: 5,
  forgeBonus: 0.07,        // stat bonus per forge tier
};
