// Salvage and resonance: the two materials. Salvage is Tech's language
// (Yue, the forge's steel), resonance is Magic's (Chen, the forge's spirit).

/** @typedef {{salvage?: number, resonance?: number}} Cost */

/**
 * Apply a percentage change (e.g. +25 for the rust Truth, -25 discount).
 * @param {Cost} cost
 * @param {number} percent
 * @returns {Cost}
 */
export function scaleCost(cost, percent = 0) {
  const k = 1 + percent / 100;
  return {
    salvage: Math.round((cost.salvage || 0) * k),
    resonance: Math.round((cost.resonance || 0) * k),
  };
}

export function canAfford(state, cost) {
  return state.res.salvage >= (cost.salvage || 0) && state.res.resonance >= (cost.resonance || 0);
}

/** @returns {boolean} false (and no change) when unaffordable */
export function pay(state, cost) {
  if (!canAfford(state, cost)) return false;
  state.res.salvage -= cost.salvage || 0;
  state.res.resonance -= cost.resonance || 0;
  return true;
}

export function gain(state, amounts) {
  state.res.salvage += Math.max(0, Math.round(amounts.salvage || 0));
  state.res.resonance += Math.max(0, Math.round(amounts.resonance || 0));
}

/** "25 salvage · 12 resonance" */
export function costText(cost) {
  const parts = [];
  if (cost.salvage) parts.push(`${cost.salvage} salvage`);
  if (cost.resonance) parts.push(`${cost.resonance} resonance`);
  return parts.join(' · ') || 'free';
}
