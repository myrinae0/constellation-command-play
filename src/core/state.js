// The whole game is one plain, JSON-serializable object. Systems mutate it;
// the store saves it and tells the UI to re-render.

import { DISTRICTS, FEATURES } from '../data/districts.js';
import { BALANCE } from '../data/missions.js';
import { rngOver } from './rng.js';

/**
 * @typedef {Object} Unit
 * @property {string} id
 * @property {string} name
 * @property {string} noticed       what they named themselves after
 * @property {import('../data/classes.js').ArchetypeId} archetype
 * @property {import('../data/classes.js').PathId} path
 * @property {number} level
 * @property {number} xp
 * @property {{hp: number, atk: number, def: number, spd: number}} talent  per-unit multipliers (~0.9 to 1.1)
 * @property {number} forgeTier
 * @property {string|null} keepsakeId
 * @property {number} recoverUntil  watch when a thinned unit is ready again (0 = ready)
 * @property {number} busyUntil     watch when training ends (0 = free)
 * @property {string|null} truthId  the Truth instance they arrived with
 * @property {number} missions
 * @property {number} [holdUntil]   arrivals only: last watch they can stand on the dock
 * @property {string} [truthDefId]  arrivals only: the Truth they will bring
 */

/**
 * @typedef {Object} GameState
 * @property {number} version
 * @property {number} seed
 * @property {number} rngState
 * @property {number} watch
 * @property {number} nextId
 * @property {{salvage: number, resonance: number}} res
 * @property {{salvage: number, resonance: number}} income   per bell
 * @property {number} bunks
 * @property {Unit[]} units
 * @property {Unit[]} dock
 * @property {any[]} missions
 * @property {any[]} truths
 * @property {any[]} lostTruths
 * @property {string[]} usedTruths
 * @property {Record<string, {fog: number, threatMod: number, clearedWatch: number|null}>} districts
 * @property {{features: string[], extra: any[], fresh: string[]}} city
 * @property {Record<string, number>} mods
 * @property {{yue: number, chen: number}} mentors
 * @property {{id: string, defId: string, unitId: string|null}[]} keepsakes
 * @property {{nextBell: number, intervals: number[], lastBell: number, departing: string[]}} ship
 * @property {Record<string, number>} stats
 * @property {Record<string, any>} flags
 * @property {{w: number, text: string}[]} log
 * @property {any} lastReport
 * @property {{sound: boolean, motion: 'auto'|'reduce'|'full', speed: number}} settings
 * @property {{step: number, done: boolean}} tutorial  the guided first run (systems/tutorial.js)
 * @property {string[]} unlocksSeen  unlock intro cards already shown (systems/unlocks.js)
 */

/**
 * A fresh, empty state. systems/game.js newGame() fills in the starting
 * squad, the first ship and the mission board.
 * @param {number} seed
 * @returns {GameState}
 */
export function createNewState(seed = 1) {
  /** @type {GameState['districts']} */
  const districts = {};
  for (const d of DISTRICTS) districts[d.id] = { fog: d.fog, threatMod: 0, clearedWatch: null };
  return {
    version: 2,
    seed: seed >>> 0,
    rngState: seed >>> 0,
    watch: 0,
    nextId: 1,
    res: { salvage: 40, resonance: 30 },
    income: { salvage: 0, resonance: 0 },
    bunks: BALANCE.startBunks,
    units: [],
    dock: [],
    missions: [],
    truths: [],
    lostTruths: [],
    usedTruths: [],
    usedNames: [],
    districts,
    city: {
      features: Object.keys(FEATURES).filter((id) => FEATURES[id].initial),
      extra: [],
      fresh: [],
    },
    mods: {
      holdBonus: 0, recoveryBonus: 0, arrivalsBonus: 0, bellExact: 0, trainingDiscount: 0,
      forgeCost: 0, retreatKeeps: 0, fogBreath: 0, rescueBonus: 0,
    },
    mentors: { yue: 0, chen: 0 },
    keepsakes: [],
    ship: { nextBell: 3, intervals: [], lastBell: 0, departing: [] },
    stats: {
      missions: 0, victories: 0, retreats: 0, rescued: 0, takenIn: 0, faded: 0, incense: 0,
      thinnings: 0, recorded: 0, sealed: 0, bells: 0, departed: 0,
    },
    flags: { introSeen: false, v1Complete: false, endingSeen: false },
    log: [],
    lastReport: null,
    settings: { sound: true, motion: 'auto', speed: 1 },
    // Finished by default; newGame({tutorial: true}) starts it.
    tutorial: { step: 0, done: true },
    unlocksSeen: [],
  };
}

/** The world's random stream; its position is stored in the state. */
export function worldRng(state) {
  return rngOver(state, 'rngState');
}

/** A new unique id like "u12". */
export function newId(state, prefix) {
  return `${prefix}${state.nextId++}`;
}

/** Append a line to the in-game log (kept short). */
export function addLog(state, text) {
  state.log.unshift({ w: state.watch, text });
  if (state.log.length > 40) state.log.length = 40;
}

/**
 * Holds the current state, saves after each change and notifies listeners.
 * @param {{saver: ReturnType<typeof import('./save.js').createSaver>, bus: import('./bus.js').Bus}} deps
 */
export function createStore({ saver, bus }) {
  /** @type {GameState | null} */
  let state = null;
  return {
    get state() {
      return state;
    },
    /** Replace the whole state (new game or load). */
    set(next) {
      state = next;
      bus.emit('state', state);
    },
    /** Call after mutating the state. Saves and re-renders. */
    commit() {
      if (!state) return;
      saver.save(state);
      bus.emit('state', state);
    },
  };
}
