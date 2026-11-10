// Brooklyn's forge, in the lower levels of the Stacks. Every weapon is tuned
// to its owner: upgrades belong to the unit, and survive a change of path
// ("it remembers you"). Keepsakes recovered from the fog are retuned here.

import { BALANCE } from '../data/missions.js';
import { addLog } from '../core/state.js';
import { pay, scaleCost } from './economy.js';

/** Cost of the next forge tier for this unit (null at max tier). */
export function forgeCost(state, unit) {
  if (unit.forgeTier >= BALANCE.forgeMaxTier) return null;
  const tier = unit.forgeTier + 1;
  const base = BALANCE.costs.forge;
  return scaleCost({ salvage: base.salvage * tier, resonance: base.resonance * tier }, state.mods.forgeCost || 0);
}

/** @returns {{ok: boolean, reason?: string}} */
export function forgeUpgrade(state, unitId) {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return { ok: false, reason: 'No such unit.' };
  const cost = forgeCost(state, unit);
  if (!cost) return { ok: false, reason: 'Brooklyn says it is as good as it gets.' };
  if (!pay(state, cost)) return { ok: false, reason: 'Not enough materials.' };
  unit.forgeTier++;
  addLog(state, `Brooklyn retuned ${unit.name}'s weapon (tier ${unit.forgeTier}).`);
  return { ok: true };
}

export const retuneCost = (state) => scaleCost(BALANCE.costs.retune, state.mods.forgeCost || 0);

/**
 * Give a keepsake to a unit (taking it from whoever had it). Pass
 * keepsakeId = null to take a unit's keepsake off.
 * @returns {{ok: boolean, reason?: string}}
 */
export function retune(state, unitId, keepsakeId) {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return { ok: false, reason: 'No such unit.' };
  if (keepsakeId === null) {
    const current = state.keepsakes.find((k) => k.id === unit.keepsakeId);
    if (current) current.unitId = null;
    unit.keepsakeId = null;
    return { ok: true };
  }
  const keepsake = state.keepsakes.find((k) => k.id === keepsakeId);
  if (!keepsake) return { ok: false, reason: 'No such keepsake.' };
  if (keepsake.unitId === unitId) return { ok: false, reason: 'It is already theirs.' };
  if (!pay(state, retuneCost(state))) return { ok: false, reason: 'Not enough resonance.' };
  const previousOwner = state.units.find((u) => u.id === keepsake.unitId);
  if (previousOwner) previousOwner.keepsakeId = null;
  const old = state.keepsakes.find((k) => k.id === unit.keepsakeId);
  if (old) old.unitId = null;
  keepsake.unitId = unitId;
  unit.keepsakeId = keepsakeId;
  return { ok: true };
}

/** A new platform between the towers: +2 bunks. */
export const platformCost = (state) => scaleCost({ salvage: BALANCE.costs.platform.salvage * (1 + Math.floor(Math.max(0, state.bunks - BALANCE.startBunks) / 2) * 0.5) }, 0);

export function buildPlatform(state) {
  if (!pay(state, platformCost(state))) return { ok: false, reason: 'Not enough salvage.' };
  state.bunks += 2;
  addLog(state, 'Brooklyn bolted a new platform between the towers: +2 bunks.');
  return { ok: true };
}
