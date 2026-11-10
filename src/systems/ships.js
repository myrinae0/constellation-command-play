// The ships. "They come out of the fog, ring a bell once at the dock, and
// leave." Arrivals stand on the dock for a few watches; anyone not taken in by
// then fades and leaves with the ship, and their Truth sinks into the fog.

import { BALANCE } from '../data/missions.js';
import { addLog } from '../core/state.js';
import { makeUnit } from './roster.js';
import { breathe, districtDef } from './city.js';
import { createTruth, pickTruthSource, truthDef } from './truths.js';
import { gain } from './economy.js';

const ARCHETYPE_IDS = ['shard', 'trace', 'axis', 'remnant'];

export const freeBunks = (state) => state.bunks - state.units.length;

/**
 * A new arrival. Archetypes the roster is short on are a little more likely,
 * so squads stay buildable.
 * @param {import('../core/rng.js').Rng} rng
 */
export function makeArrival(state, rng, hold = rng.int(...BALANCE.arrivalHold)) {
  const counts = Object.fromEntries(ARCHETYPE_IDS.map((a) => [a, 0]));
  for (const u of [...state.units, ...state.dock]) counts[u.archetype]++;
  const archetype = rng.weighted(ARCHETYPE_IDS, (a) => 6 - Math.min(5, counts[a]));
  const level = Math.max(1, 1 + Math.floor(state.stats.victories / 6) - rng.int(0, 1));
  const unit = makeUnit(state, rng, { archetype, level });
  const source = pickTruthSource(state, rng);
  unit.truthDefId = source.defId;
  if (source.def) unit.truthGen = source.def;
  unit.holdUntil = state.watch + Math.max(0, hold + state.mods.holdBonus);
  return unit;
}

/**
 * The bell rings: income arrives, the fog breathes, anyone departing boards,
 * and new arrivals step onto the dock.
 * @returns {{type: 'bell', arrivals: string[], departed: string[], fogReturned: string|null}}
 */
export function ringBell(state, rng) {
  const ship = state.ship;
  state.stats.bells++;
  const interval = rng.int(...BALANCE.bellInterval);
  ship.intervals.push(interval);
  if (ship.intervals.length > 6) ship.intervals.shift();
  ship.lastBell = state.watch;
  ship.nextBell = state.watch + interval;

  const departed = [];
  for (const id of ship.departing) {
    const unit = state.units.find((u) => u.id === id);
    if (!unit) continue;
    departUnit(state, unit);
    departed.push(unit.name);
  }
  ship.departing = [];

  gain(state, state.income);
  const fogReturned = breathe(state, rng);

  const count = rng.int(...BALANCE.arrivalsPerShip) + state.mods.arrivalsBonus;
  const arrivals = [];
  for (let i = 0; i < count; i++) {
    const a = makeArrival(state, rng);
    state.dock.push(a);
    arrivals.push(a.name);
  }
  addLog(state, `A bell rings once. ${arrivals.length ? `On the dock: ${arrivals.join(', ')}.` : 'No one stands.'}`);
  return { type: 'bell', arrivals, departed, fogReturned };
}

/** Walks to the ship, wordless, and boards. No one follows. */
function departUnit(state, unit) {
  state.units = state.units.filter((u) => u !== unit);
  for (const k of state.keepsakes) if (k.unitId === unit.id) k.unitId = null;
  // Letters they were keeping for others stay behind, unsealed.
  for (const t of state.truths) {
    if (t.carrierId === unit.id && t.state === 'sealed') t.state = 'pending';
    if (t.carrierId === unit.id) t.carrierId = null;
  }
  state.stats.departed++;
  state.stats.incense++;
  addLog(state, `${unit.name} walked to the ship and boarded. Chen burns a stick of incense.`);
}

/**
 * Bring an arrival up to the Stacks. Needs a free bunk.
 * @returns {{ok: boolean, reason?: string, unit?: any}}
 */
export function takeIn(state, arrivalId) {
  const arrival = state.dock.find((a) => a.id === arrivalId);
  if (!arrival) return { ok: false, reason: 'They are no longer on the dock.' };
  if (freeBunks(state) <= 0) return { ok: false, reason: 'No free bunks in the Stacks.' };
  state.dock = state.dock.filter((a) => a !== arrival);
  const unit = toUnit(arrival);
  state.units.push(unit);
  const truth = createTruth(state, arrival.truthGen ? { def: arrival.truthGen } : { defId: arrival.truthDefId }, { carrierId: unit.id, origin: 'arrival' });
  unit.truthId = truth.id;
  state.stats.takenIn++;
  addLog(state, `${unit.name} was brought up to the Stacks.`);
  return { ok: true, unit };
}

/** Strip dock-only fields. */
function toUnit(arrival) {
  const { holdUntil, truthDefId, truthGen, ...unit } = arrival;
  return unit;
}

/** An arrival nobody reached in time. Their Truth sinks into the fog. */
export function fade(state, arrival) {
  state.dock = state.dock.filter((a) => a !== arrival);
  state.stats.faded++;
  state.stats.incense++;
  const source = arrival.truthGen ? { def: arrival.truthGen } : { defId: arrival.truthDefId };
  const def = truthDef(source);
  if (def.arrivalOnly) {
    // It leaves with them; it may come back with someone else.
    state.usedTruths = state.usedTruths.filter((id) => id !== def.id);
  } else {
    state.lostTruths.push({ id: `l${state.nextId++}`, ...source, district: def.district });
  }
  addLog(state, `${arrival.name} faded on the dock. Their Truth sank into ${districtDef(def.district).name}.`);
  return def.district;
}

/**
 * Janice's estimate of the next bell. Exact once the bell rope is recorded.
 * @returns {{exact: boolean, next: number, min: number, max: number}}
 */
export function bellEstimate(state) {
  const { nextBell, lastBell } = state.ship;
  if (state.mods.bellExact) return { exact: true, next: nextBell, min: nextBell, max: nextBell };
  const [lo, hi] = BALANCE.bellInterval;
  return {
    exact: false,
    next: nextBell,
    min: Math.max(state.watch + 1, lastBell + lo),
    max: Math.max(state.watch + 1, lastBell + hi + (nextBell > lastBell + hi ? nextBell - lastBell - hi : 0)),
  };
}
