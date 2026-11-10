// Units: creating them, deriving their stats, and whether they can deploy.
// "Everyone comes back": units are never removed by battles. They get thinned
// and need time to recover.

import { classOf, LEVEL_GROWTH, MAX_LEVEL, xpToNext } from '../data/classes.js';
import { ARRIVAL_NAMES } from '../data/characters.js';
import { KEEPSAKES } from '../data/gear.js';
import { BALANCE } from '../data/missions.js';
import { newId } from '../core/state.js';
import { truthDef } from './truths.js';

const STAT_KEYS = /** @type {const} */ (['hp', 'atk', 'def', 'spd']);

/**
 * Make a unit with a fresh name and slightly varied talent.
 * @param {import('../core/state.js').GameState} state
 * @param {import('../core/rng.js').Rng} rng
 * @param {{archetype?: string, path?: string, level?: number}} [opts]
 * @returns {import('../core/state.js').Unit}
 */
export function makeUnit(state, rng, opts = {}) {
  const archetype = opts.archetype || rng.pick(['shard', 'trace', 'axis', 'remnant']);
  const path = opts.path || rng.weighted(['none', 'tech', 'magic'], (p) => (p === 'none' ? 5 : 2));
  const [name, noticed] = pickName(state, rng);
  const talent = {};
  for (const k of STAT_KEYS) talent[k] = Math.round(rng.float(0.92, 1.08) * 100) / 100;
  return {
    id: newId(state, 'u'),
    name,
    noticed,
    archetype: /** @type {any} */ (archetype),
    path: /** @type {any} */ (path),
    level: opts.level || 1,
    xp: 0,
    talent: /** @type {any} */ (talent),
    forgeTier: 0,
    keepsakeId: null,
    recoverUntil: 0,
    busyUntil: 0,
    truthId: null,
    missions: 0,
  };
}

/** Names are not reused until all of them have been used once. */
function pickName(state, rng) {
  let pool = ARRIVAL_NAMES.filter(([n]) => !state.usedNames.includes(n));
  if (!pool.length) {
    state.usedNames = [];
    pool = ARRIVAL_NAMES;
  }
  const entry = rng.pick(pool);
  state.usedNames.push(entry[0]);
  return entry;
}

/**
 * Full combat stats: class base x talent x level x forge, plus keepsake and
 * any sealed Truths the unit carries.
 * @param {import('../core/state.js').GameState} state
 * @param {import('../core/state.js').Unit} unit
 */
export function unitStats(state, unit) {
  const cls = classOf(unit.archetype, unit.path);
  const levelMul = 1 + LEVEL_GROWTH * (unit.level - 1);
  const forgeMul = 1 + BALANCE.forgeBonus * unit.forgeTier;
  /** @type {Record<string, number>} */
  const stats = {};
  for (const k of STAT_KEYS) {
    // Speed grows slowly; otherwise late-game turn order gets silly.
    const growth = k === 'spd' ? 1 + (levelMul - 1) * 0.25 : levelMul * forgeMul;
    stats[k] = cls.base[k] * unit.talent[k] * growth;
  }
  for (const bonus of bonusesFor(state, unit)) {
    for (const k of STAT_KEYS) stats[k] += bonus[k] || 0;
  }
  for (const k of STAT_KEYS) stats[k] = Math.round(stats[k]);
  return /** @type {{hp: number, atk: number, def: number, spd: number}} */ (stats);
}

/** Flat stat bonuses from the keepsake and sealed Truths. */
function bonusesFor(state, unit) {
  const out = [];
  const keepsake = state.keepsakes.find((k) => k.id === unit.keepsakeId);
  if (keepsake) out.push(KEEPSAKES.find((d) => d.id === keepsake.defId)?.stats || {});
  for (const t of sealedTruthsOf(state, unit)) out.push(truthDef(t).seal.stats);
  return out;
}

/** Sealed letters this unit carries. They also hold the unit together in battle. */
export function sealedTruthsOf(state, unit) {
  return state.truths.filter((t) => t.carrierId === unit.id && t.state === 'sealed');
}

/** A rough single-number strength, used for threat estimates and auto-picks. */
export function unitPower(stats) {
  return stats.hp * 0.25 + stats.atk * 2 + stats.def * 1.5 + stats.spd;
}

/**
 * @returns {'ready'|'thinned'|'training'|'departing'}
 */
export function unitStatus(state, unit) {
  if (state.ship.departing.includes(unit.id)) return 'departing';
  if (unit.recoverUntil > state.watch) return 'thinned';
  if (unit.busyUntil > state.watch) return 'training';
  return 'ready';
}

export const isAvailable = (state, unit) => unitStatus(state, unit) === 'ready';

/**
 * Add experience; returns how many levels were gained.
 * @param {import('../core/state.js').Unit} unit
 */
export function gainXp(unit, amount) {
  let levels = 0;
  unit.xp += amount;
  while (unit.xp >= xpToNext(unit.level) && unit.level < MAX_LEVEL) {
    unit.xp -= xpToNext(unit.level);
    unit.level++;
    levels++;
  }
  if (unit.level >= MAX_LEVEL) unit.xp = 0;
  return levels;
}

/** Display name of a unit's class, e.g. "Firewall". */
export const className = (unit) => classOf(unit.archetype, unit.path).name;

