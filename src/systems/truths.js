// The signature mechanic. Every arrival carries one Truth. Once remembered,
// the player chooses:
//   record -> the Archive writes it twice; the city changes (permanent).
//   seal   -> the carrier keeps it like a sealed letter: a stat bonus, and it
//             holds them together once per battle. A sealed letter can still
//             be recorded later; a recorded one can't be unspoken.

import { TRUTHS, TRUTH_TEMPLATES } from '../data/truths.js';
import { DISTRICTS, FEATURES } from '../data/districts.js';
import { addLog, newId } from '../core/state.js';
import { addFeature, addLamp, changeFog, districtDef, removeFeature } from './city.js';
import { gain } from './economy.js';

/** @type {Record<string, import('../data/truths.js').TruthDef>} */
const TRUTH_BY_ID = Object.fromEntries(TRUTHS.map((t) => [t.id, t]));

/**
 * A Truth instance in the save: {id, defId | def, carrierId, origin, state,
 * district, foundWatch, decidedWatch}. `def` is set for generated Truths.
 * @typedef {Object} TruthInstance
 * @property {string} id
 * @property {string} [defId]
 * @property {import('../data/truths.js').TruthDef} [def]
 * @property {string|null} carrierId
 * @property {'arrival'|'lost'} origin
 * @property {'hidden'|'pending'|'recorded'|'sealed'} state
 * @property {number} foundWatch
 * @property {number|null} decidedWatch
 */

/** @param {{defId?: string, def?: any}} t */
export const truthDef = (t) => t.def || TRUTH_BY_ID[t.defId];

/**
 * Choose an unused written Truth, or generate one when they've run out.
 * @param {import('../core/rng.js').Rng} rng
 * @param {{lost?: boolean}} [opts] lost Truths (found in the fog) skip arrival-only ones
 * @returns {{defId?: string, def?: any}}
 */
export function pickTruthSource(state, rng, opts = {}) {
  const pool = TRUTHS.filter((t) => !state.usedTruths.includes(t.id) && !(opts.lost && t.arrivalOnly));
  if (pool.length) {
    // Prefer Truths about districts that still have fog: they matter more.
    const def = rng.weighted(pool, (t) => (state.districts[t.district]?.fog > 0 ? 3 : 1));
    state.usedTruths.push(def.id);
    return { defId: def.id };
  }
  return { def: generateTruth(state, rng) };
}

/** A small procedural Truth for endless play. */
export function generateTruth(state, rng) {
  const district = rng.pick(DISTRICTS);
  const subject = rng.pick(TRUTH_TEMPLATES.subjects);
  const detail = rng.pick(TRUTH_TEMPLATES.details);
  const stat = rng.pick(['hp', 'atk', 'def', 'spd']);
  return {
    id: `gen-${state.nextId++}`,
    weight: 'small',
    district: district.id,
    text: `${subject} in ${district.name} ${detail}.`,
    record: {
      effects: [{ type: 'fog', district: district.id, amount: -12 }, { type: 'lamp', district: district.id, label: subject }],
      note: `A new lamp in ${district.name}, and the fog there thins.`,
    },
    seal: { stats: { [stat]: stat === 'hp' ? 8 : 2 }, note: 'A small, private certainty.' },
  };
}

/**
 * @param {{defId?: string, def?: any}} source
 * @param {{carrierId: string|null, origin: 'arrival'|'lost', state?: TruthInstance['state']}} opts
 * @returns {TruthInstance}
 */
export function createTruth(state, source, { carrierId, origin, state: initial = 'hidden' }) {
  /** @type {TruthInstance} */
  const inst = {
    id: newId(state, 't'),
    ...source,
    carrierId,
    origin,
    state: initial,
    foundWatch: state.watch,
    decidedWatch: null,
  };
  state.truths.push(inst);
  return inst;
}

export const getTruth = (state, id) => state.truths.find((t) => t.id === id);

/** Out in the fog, a unit remembers the Truth they arrived with. */
export function revealTruth(state, inst) {
  if (inst.state !== 'hidden') return false;
  inst.state = 'pending';
  return true;
}

export const canRecord = (inst) => inst && (inst.state === 'pending' || inst.state === 'sealed');
export const canSeal = (inst) => inst && inst.state === 'pending';

/**
 * Effect handlers for recorded Truths. Each returns a short description of
 * what changed (or null), used for the "the city shifts" summary.
 * @type {Record<string, (state: any, e: any, inst: TruthInstance) => string|null>}
 */
export const EFFECTS = {
  feature: (state, e) => (addFeature(state, e.id) ? `New on the map: ${labelOf(e.id)}` : null),
  removeFeature: (state, e) => (removeFeature(state, e.id) ? `Gone from the map: ${labelOf(e.id)}` : null),
  fog(state, e) {
    const r = changeFog(state, e.district, e.amount);
    const name = districtDef(e.district).name;
    if (r.cleared) return `${name} is clear of fog`;
    return r.before !== r.after ? `Fog in ${name}: ${r.before}% → ${r.after}%` : null;
  },
  fogAll(state, e) {
    for (const d of DISTRICTS) changeFog(state, d.id, e.amount);
    return `Fog thins in every district`;
  },
  threat(state, e) {
    state.districts[e.district].threatMod += e.amount;
    return `${districtDef(e.district).name} gets ${e.amount < 0 ? 'safer' : 'more dangerous'}`;
  },
  bunks(state, e) {
    state.bunks += e.amount;
    return `+${e.amount} bunks in the Stacks`;
  },
  resources(state, e) {
    gain(state, e);
    return [e.salvage && `+${e.salvage} salvage`, e.resonance && `+${e.resonance} resonance`].filter(Boolean).join(', ');
  },
  income(state, e) {
    state.income.salvage += e.salvage || 0;
    state.income.resonance += e.resonance || 0;
    return 'More materials every bell';
  },
  mod(state, e) {
    state.mods[e.key] = (state.mods[e.key] || 0) + e.amount;
    return null; // the Truth's note explains it
  },
  delayBell(state, e) {
    state.ship.nextBell += e.amount;
    return `The next bell is ${e.amount} watches late`;
  },
  departCarrier(state, e, inst) {
    const unit = state.units.find((u) => u.id === inst.carrierId);
    if (!unit) return null;
    if (!state.ship.departing.includes(unit.id)) state.ship.departing.push(unit.id);
    return `${unit.name} will board the next ship`;
  },
  openOldestSeal(state, e, inst) {
    const oldest = state.truths
      .filter((t) => t.state === 'sealed' && t.id !== inst.id)
      .sort((a, b) => (a.decidedWatch ?? 0) - (b.decidedWatch ?? 0))[0];
    if (!oldest) return 'There were no sealed letters to open';
    recordTruth(state, oldest.id);
    return `A sealed letter opens: "${truthDef(oldest).text}"`;
  },
  lamp: (state, e) => (addLamp(state, e.district, e.label) ? `A new lamp in ${districtDef(e.district).name}` : null),
};

const labelOf = (featureId) => FEATURES[featureId]?.label || featureId;

/**
 * Have the Archive record a Truth. Permanent.
 * @returns {{ok: boolean, changes: string[], reason?: string}}
 */
export function recordTruth(state, truthId) {
  const inst = getTruth(state, truthId);
  if (!canRecord(inst)) return { ok: false, changes: [], reason: 'This Truth cannot be recorded.' };
  const def = truthDef(inst);
  inst.state = 'recorded';
  inst.decidedWatch = state.watch;
  state.stats.recorded++;
  const changes = [];
  for (const effect of def.record.effects) {
    const handler = EFFECTS[effect.type];
    if (!handler) continue; // unknown effect types are ignored, not fatal
    const change = handler(state, effect, inst);
    if (change) changes.push(change);
  }
  addLog(state, `The Archive recorded a Truth: "${def.text}"`);
  return { ok: true, changes };
}

/**
 * Keep a Truth sealed. If its carrier is gone, the readiest unit carries it.
 * @returns {{ok: boolean, carrierId?: string, reason?: string}}
 */
export function sealTruth(state, truthId) {
  const inst = getTruth(state, truthId);
  if (!canSeal(inst)) return { ok: false, reason: 'This Truth cannot be sealed.' };
  if (!state.units.some((u) => u.id === inst.carrierId)) {
    const carrier = state.units.find((u) => !state.ship.departing.includes(u.id));
    if (!carrier) return { ok: false, reason: 'No one is here to carry it.' };
    inst.carrierId = carrier.id;
  }
  inst.state = 'sealed';
  inst.decidedWatch = state.watch;
  state.stats.sealed++;
  addLog(state, 'A Truth was sealed and kept.');
  return { ok: true, carrierId: inst.carrierId };
}

export const pendingTruths = (state) => state.truths.filter((t) => t.state === 'pending');
