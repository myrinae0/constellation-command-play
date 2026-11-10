// Game-level actions that span several systems: starting a run, the passing
// of a watch, and deploying a squad. The UI calls these.
//
// Time is measured in watches. A watch passes when a squad comes back from
// the fog or when you choose to keep watch.

import { createNewState, addLog, worldRng } from '../core/state.js';
import { makeUnit } from './roster.js';
import { createTruth } from './truths.js';
import { fade, ringBell } from './ships.js';
import { refreshBoard, resolveMission } from './missions.js';
import { pickTruthSource } from './truths.js';

/**
 * A new run: four Constellation members (one per archetype), a ship at the
 * dock, and Janice's first board.
 * @param {number} seed
 */
export function newGame(seed) {
  const state = createNewState(seed);
  const rng = worldRng(state);
  for (const archetype of ['shard', 'trace', 'axis', 'remnant']) {
    const unit = makeUnit(state, rng, { archetype, path: 'none' });
    state.units.push(unit);
    unit.truthId = createTruth(state, pickTruthSource(state, rng), { carrierId: unit.id, origin: 'arrival' }).id;
  }
  ringBell(state, rng); // the bell from the intro
  refreshBoard(state, rng);
  addLog(state, 'You took up the ledger in the Stacks.');
  return state;
}

/**
 * One watch passes: the thinned recover, training ends, arrivals who were
 * not taken in fade, the bell may ring, and the board refreshes.
 * @returns {Array<{type: string, [k: string]: any}>} what happened, for the UI
 */
export function advanceWatch(state) {
  const rng = worldRng(state);
  state.watch++;
  const events = [];
  for (const u of state.units) {
    if (u.recoverUntil && u.recoverUntil <= state.watch) {
      u.recoverUntil = 0;
      events.push({ type: 'recovered', name: u.name });
    }
    if (u.busyUntil && u.busyUntil <= state.watch) {
      u.busyUntil = 0;
      events.push({ type: 'trained', name: u.name });
    }
  }
  for (const arrival of [...state.dock]) {
    if (arrival.holdUntil < state.watch) events.push({ type: 'faded', name: arrival.name, district: fade(state, arrival) });
  }
  if (state.watch >= state.ship.nextBell) events.push(ringBell(state, rng));
  refreshBoard(state, rng);
  return events;
}

/** Wait a watch without deploying anyone. */
export function keepWatch(state) {
  addLog(state, 'You kept watch from the Stacks.');
  return advanceWatch(state);
}

/**
 * Deploy a squad: resolve the battle and its results, then a watch passes.
 * @returns {{battle: any, report: any, events: any[]} | {error: string}}
 */
export function deployMission(state, missionId, unitIds) {
  const result = resolveMission(state, missionId, unitIds);
  if ('error' in result) return result;
  const events = advanceWatch(state);
  result.report.events = events;
  return { ...result, events };
}
