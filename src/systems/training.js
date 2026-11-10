// The Harmonic Division. Yue teaches Tech ("interface"), Chen teaches Magic
// ("commune"). An Unbound unit trains into one path; a Tech or Magic unit can
// cross-train into Hybrid once both mentors are rank 2.
//
// Training takes the unit out of rotation for one watch.

import { BALANCE } from '../data/missions.js';
import { classOf } from '../data/classes.js';
import { addLog } from '../core/state.js';
import { pay, scaleCost } from './economy.js';
import { isAvailable } from './roster.js';

export const MAX_MENTOR_RANK = 3;
export const HYBRID_RANK = 2;
export const PATH_LEVEL = { tech: 2, magic: 2, hybrid: 5 };

/** Yue's lab runs on salvage; Chen's practice on resonance. */
export function mentorCost(state, mentor) {
  const rank = state.mentors[mentor];
  if (rank >= MAX_MENTOR_RANK) return null;
  const key = mentor === 'yue' ? 'salvage' : 'resonance';
  return scaleCost({ [key]: BALANCE.costs.mentor[key] * (rank + 1) }, -(state.mods.trainingDiscount || 0));
}

export function raiseMentor(state, mentor) {
  const cost = mentorCost(state, mentor);
  if (!cost) return { ok: false, reason: 'Already at the highest rank.' };
  if (!pay(state, cost)) return { ok: false, reason: 'Not enough materials.' };
  state.mentors[mentor]++;
  addLog(state, `${mentor === 'yue' ? 'Yue' : 'Chen'}'s training reaches rank ${state.mentors[mentor]}.`);
  return { ok: true };
}

export const harmonicDivision = (state) => state.mentors.yue >= HYBRID_RANK && state.mentors.chen >= HYBRID_RANK;

/**
 * Which paths this unit could train into next, and why not if blocked.
 * @returns {{path: 'tech'|'magic'|'hybrid', name: string, ok: boolean, reason?: string, cost: any}[]}
 */
export function trainingOptions(state, unit) {
  const discount = -(state.mods.trainingDiscount || 0);
  const options = [];
  if (unit.path === 'none') {
    for (const path of /** @type {const} */ (['tech', 'magic'])) {
      const mentor = path === 'tech' ? 'yue' : 'chen';
      const cost = scaleCost(BALANCE.costs.trainPath, discount);
      const reason =
        state.mentors[mentor] < 1 ? `${mentor === 'yue' ? 'Yue' : 'Chen'} needs rank 1 first.`
          : unit.level < PATH_LEVEL[path] ? `Needs level ${PATH_LEVEL[path]}.`
            : null;
      options.push({ path, name: classOf(unit.archetype, path).name, ok: !reason, reason, cost });
    }
  } else if (unit.path === 'tech' || unit.path === 'magic') {
    const cost = scaleCost(BALANCE.costs.trainHybrid, discount);
    const reason = !harmonicDivision(state) ? 'Yue and Chen both need rank 2.'
      : unit.level < PATH_LEVEL.hybrid ? `Needs level ${PATH_LEVEL.hybrid}.`
        : null;
    options.push({ path: 'hybrid', name: classOf(unit.archetype, 'hybrid').name, ok: !reason, reason, cost });
  }
  return options;
}

/** @returns {{ok: boolean, reason?: string}} */
export function train(state, unitId, path) {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return { ok: false, reason: 'No such unit.' };
  if (!isAvailable(state, unit)) return { ok: false, reason: `${unit.name} is not free right now.` };
  const option = trainingOptions(state, unit).find((o) => o.path === path);
  if (!option) return { ok: false, reason: 'That path is not open to them.' };
  if (!option.ok) return { ok: false, reason: option.reason };
  if (!pay(state, option.cost)) return { ok: false, reason: 'Not enough materials.' };
  unit.path = path;
  unit.busyUntil = state.watch + 1;
  addLog(state, `${unit.name} trained as a ${option.name}.`);
  return { ok: true };
}
