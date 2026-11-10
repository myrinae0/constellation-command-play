// Nouveau's state: fog per district, danger, and the features Truths add to
// the map. ui/cityMap.js draws whatever this says.

import { DISTRICTS, FEATURES } from '../data/districts.js';
import { BALANCE } from '../data/missions.js';
import { hashSeed } from '../core/rng.js';
import { addLog } from '../core/state.js';

/** @type {Record<string, import('../data/districts.js').DistrictDef>} */
export const DISTRICT_BY_ID = Object.fromEntries(DISTRICTS.map((d) => [d.id, d]));

export const districtDef = (id) => DISTRICT_BY_ID[id];
export const isCleared = (state, id) => state.districts[id].fog <= 0;
export const clearedCount = (state) => DISTRICTS.filter((d) => isCleared(state, d.id)).length;

/**
 * Change a district's fog by `amount` (negative clears).
 * @returns {{before: number, after: number, cleared: boolean}}
 */
export function changeFog(state, id, amount) {
  const d = state.districts[id];
  if (!d) return { before: 0, after: 0, cleared: false };
  const before = d.fog;
  d.fog = Math.max(0, Math.min(100, Math.round(d.fog + amount)));
  const cleared = before > 0 && d.fog === 0;
  if (cleared) {
    d.clearedWatch = state.watch;
    addLog(state, `${districtDef(id).name} is clear of fog.`);
  }
  if (before === 0 && d.fog > 0) d.clearedWatch = null;
  return { before, after: d.fog, cleared };
}

/**
 * Enemy level for a mission in this district. Deeper fog, a harder district
 * and overall progress all raise it.
 */
export function districtLevel(state, id, extra = 0) {
  const def = districtDef(id);
  const d = state.districts[id];
  const fogTerm = Math.floor(d.fog / 50);
  const depth = Math.floor(state.stats.victories / BALANCE.depthEvery);
  return Math.max(1, def.threat + d.threatMod + fogTerm + depth + extra);
}

export function hasFeature(state, id) {
  return state.city.features.includes(id) || state.city.extra.some((f) => f.id === id);
}

export function addFeature(state, id) {
  if (!FEATURES[id] || state.city.features.includes(id)) return false;
  state.city.features.push(id);
  state.city.fresh.push(id);
  return true;
}

export function removeFeature(state, id) {
  const before = state.city.features.length;
  state.city.features = state.city.features.filter((f) => f !== id);
  return state.city.features.length < before;
}

/**
 * A small generated lamp (endless-mode Truths). Its position is derived from
 * its id, so it stays put across reloads.
 */
export function addLamp(state, districtId, label) {
  const def = districtDef(districtId);
  const id = `lamp-${state.nextId++}`;
  const h = hashSeed(id);
  const x = def.label[0] + ((h % 41) - 20);
  const y = def.label[1] + 18 + ((h >> 8) % 25);
  state.city.extra.push({ id, label, district: districtId, x, y });
  state.city.fresh.push(id);
  return id;
}

/**
 * At each bell the fog breathes back into districts that aren't clear. After
 * the v1 goal (endless play) it can also return to a cleared district.
 * @param {import('../core/rng.js').Rng} rng
 */
export function breathe(state, rng) {
  const amount = BALANCE.fogBreath + (state.mods.fogBreath || 0);
  for (const d of DISTRICTS) {
    if (state.districts[d.id].fog > 0) changeFog(state, d.id, amount);
  }
  if (state.flags.v1Complete && rng.chance(BALANCE.endlessFogReturn)) {
    const cleared = DISTRICTS.filter((d) => isCleared(state, d.id));
    if (cleared.length) {
      const d = rng.pick(cleared);
      changeFog(state, d.id, 30);
      addLog(state, `The fog returns to the edges of ${d.name}.`);
      return d.id;
    }
  }
  return null;
}

/** Marks the v1 goal complete the first time it's reached. */
export function checkGoal(state) {
  if (state.flags.v1Complete || clearedCount(state) < BALANCE.goalDistricts) return false;
  state.flags.v1Complete = true;
  addLog(state, 'Morning comes to Nouveau. The goal is met; the bell keeps ringing.');
  return true;
}
