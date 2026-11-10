// Archetypes, paths and the twelve subclasses (plus an "Unbound" starting
// form per archetype), from Chris's class sheet (04-classes.md).
//
// A unit's class is `${archetype}/${path}`. To add a class, add an entry to
// CLASSES with a skill whose `kind` exists in systems/battle.js SKILLS.

/** @typedef {'shard'|'trace'|'axis'|'remnant'} ArchetypeId */
/** @typedef {'none'|'tech'|'magic'|'hybrid'} PathId */
/** @typedef {{hp: number, atk: number, def: number, spd: number}} Stats */

/**
 * @typedef {Object} SkillDef
 * @property {string} kind      key into battle SKILLS
 * @property {string} name
 * @property {number} cd        own turns between uses
 * @property {string} text      short description for the UI
 * @property {Record<string, any>} [params]
 */

/**
 * @typedef {Object} ClassDef
 * @property {string} name
 * @property {ArchetypeId} archetype
 * @property {PathId} path
 * @property {string} weapon
 * @property {Stats} base       level-1 stats
 * @property {number} crit      crit chance
 * @property {'front'|'weakest'|'strongest'|'random'} targeting  basic-attack target rule
 * @property {SkillDef} skill
 * @property {string} [passive] id of a passive in battle PASSIVES
 * @property {string} blurb
 */

export const ARCHETYPES = {
  shard: {
    name: 'Shard',
    role: 'Frontline',
    theme: 'Form and Resilience',
    blurb: 'Fragments of the old self made solid again. Where others fade, they stand.',
  },
  trace: {
    name: 'Trace',
    role: 'Stealth / Precision',
    theme: 'Absence and Motion',
    blurb: 'The memory of movement. Unseen but exact, carving paths through light.',
  },
  axis: {
    name: 'Axis',
    role: 'Caster / Control',
    theme: 'Control and Alignment',
    blurb: 'The world turns because of the Axis. Stored energy, redirected into balance.',
  },
  remnant: {
    name: 'Remnant',
    role: 'Support / Connection',
    theme: 'Memory and Harmony',
    blurb: 'What remains when all else ends. They weave fragments back into something whole.',
  },
};

export const PATHS = {
  none: { name: 'Unbound', mentor: null, blurb: 'Carrying gear left behind by earlier arrivals.' },
  tech: { name: 'Tech', mentor: 'yue', blurb: 'Interface with the world.' },
  magic: { name: 'Magic', mentor: 'chen', blurb: 'Commune with the world.' },
  hybrid: { name: 'Hybrid', mentor: 'both', blurb: 'Both languages at once.' },
};

/** @type {Record<string, ClassDef>} */
export const CLASSES = {
  // ---- Shard: frontline ----
  'shard/none': {
    name: 'Unbound Shard', archetype: 'shard', path: 'none', weapon: 'A dented riot shield',
    base: { hp: 120, atk: 13, def: 9, spd: 8 }, crit: 0.05, targeting: 'front',
    skill: { kind: 'guard', name: 'Stand', cd: 3, text: 'Draws attacks for 2 turns and braces.', params: { shield: 0.12, taunt: 2 } },
    blurb: 'Gear from the dock, held like it might remember them.',
  },
  'shard/tech': {
    name: 'Firewall', archetype: 'shard', path: 'tech', weapon: 'Gunlance',
    base: { hp: 140, atk: 15, def: 11, spd: 8 }, crit: 0.05, targeting: 'front',
    skill: { kind: 'guard', name: 'Plasma Bloom', cd: 3, text: 'Draws attacks; radiant shields bloom over the whole squad.', params: { shield: 0.1, taunt: 2, team: true } },
    blurb: "Forged for the city's first responders. The last line of defense given human form.",
  },
  'shard/magic': {
    name: 'Vessel', archetype: 'shard', path: 'magic', weapon: 'Curved greatsword',
    base: { hp: 135, atk: 17, def: 10, spd: 8 }, crit: 0.08, targeting: 'front',
    skill: { kind: 'aoe', name: 'Ancestral Sweep', cd: 3, text: 'Sweeps every enemy, guided by those who fought before, and draws their eyes.', params: { power: 0.75, taunt: 1 } },
    blurb: 'A lineage carried not in blood, but in blade.',
  },
  'shard/hybrid': {
    name: 'Breaker', archetype: 'shard', path: 'hybrid', weapon: 'Reactor gauntlets',
    base: { hp: 150, atk: 17, def: 11, spd: 9 }, crit: 0.08, targeting: 'front', passive: 'store',
    skill: { kind: 'discharge', name: 'Radiant Discharge', cd: 3, text: 'Releases stored impact as a burst on every enemy.', params: { power: 0.55, stored: 0.6, taunt: 1 } },
    blurb: 'Every impact is stored. A weapon that speaks only through consequence.',
  },

  // ---- Trace: stealth / precision ----
  'trace/none': {
    name: 'Unbound Trace', archetype: 'trace', path: 'none', weapon: 'A fisher\'s knife',
    base: { hp: 80, atk: 18, def: 4, spd: 13 }, crit: 0.18, targeting: 'weakest',
    skill: { kind: 'strike', name: 'Quickstep', cd: 2, text: 'A fast cut at the weakest enemy.', params: { power: 1.4, target: 'weakest' } },
    blurb: 'Their feet remember a way of moving that their head does not.',
  },
  'trace/tech': {
    name: 'Glitch', archetype: 'trace', path: 'tech', weapon: 'Monowire',
    base: { hp: 88, atk: 21, def: 5, spd: 14 }, crit: 0.2, targeting: 'weakest',
    skill: { kind: 'strike', name: 'Surgical Deletion', cd: 2, text: 'Hits the weakest enemy; double damage below 40% health.', params: { power: 1.4, target: 'weakest', execute: 0.4 } },
    blurb: 'A ghost in the network wearing human skin.',
  },
  'trace/magic': {
    name: 'Daemon', archetype: 'trace', path: 'magic', weapon: 'Scythe',
    base: { hp: 92, atk: 20, def: 5, spd: 13 }, crit: 0.18, targeting: 'weakest', passive: 'harvest',
    skill: { kind: 'strike', name: 'Reap', cd: 2, text: 'Hits the weakest enemy and drinks half the damage. Sharpens with each enemy that falls.', params: { power: 1.3, target: 'weakest', drain: 0.5 } },
    blurb: 'A harvest that never truly ends.',
  },
  'trace/hybrid': {
    name: 'Moonblade', archetype: 'trace', path: 'hybrid', weapon: 'Dual katanas',
    base: { hp: 95, atk: 22, def: 6, spd: 15 }, crit: 0.22, targeting: 'weakest',
    skill: { kind: 'multi', name: 'Mirror Cut', cd: 2, text: 'Splits into mirrored copies: three cuts at the weakest enemy.', params: { power: 0.65, hits: 3, target: 'weakest' } },
    blurb: 'A duel fought between self and shadow.',
  },

  // ---- Axis: caster / control ----
  'axis/none': {
    name: 'Unbound Axis', archetype: 'axis', path: 'none', weapon: 'A signal lamp',
    base: { hp: 75, atk: 16, def: 4, spd: 10 }, crit: 0.1, targeting: 'random',
    skill: { kind: 'aoe', name: 'Flare', cd: 3, text: 'A burst of light on every enemy.', params: { power: 0.55 } },
    blurb: 'They hold the lamp steady. It seems to like them.',
  },
  'axis/tech': {
    name: 'Binary', archetype: 'axis', path: 'tech', weapon: 'Dual pistols',
    base: { hp: 82, atk: 19, def: 5, spd: 11 }, crit: 0.12, targeting: 'random',
    skill: { kind: 'parity', name: 'Parity', cd: 2, text: 'Steel at the strongest, silver at the weakest. Judgment in alternating calibers.', params: { power: 1.05 } },
    blurb: 'Aim calibrated to moral weight rather than distance.',
  },
  'axis/magic': {
    name: 'Catalyst', archetype: 'axis', path: 'magic', weapon: 'Elemental spellbook',
    base: { hp: 80, atk: 20, def: 5, spd: 10 }, crit: 0.1, targeting: 'random',
    skill: { kind: 'rotation', name: 'Rotation', cd: 2, text: 'Fire, ice, thunder, tide, in turn: burn all, slow all, stun one, mend the squad.', params: {} },
    blurb: 'A storm conducted by discipline.',
  },
  'axis/hybrid': {
    name: 'Resonator', archetype: 'axis', path: 'hybrid', weapon: 'Spirit tablet',
    base: { hp: 88, atk: 20, def: 6, spd: 11 }, crit: 0.1, targeting: 'random',
    skill: { kind: 'hymn', name: 'Static Hymn', cd: 3, text: 'Silences the strongest enemy for a turn and hums through the rest.', params: { power: 0.5, stun: 1 } },
    blurb: 'A hymn of the living sung by the dead.',
  },

  // ---- Remnant: support / connection ----
  'remnant/none': {
    name: 'Unbound Remnant', archetype: 'remnant', path: 'none', weapon: 'A bundle of ribbons',
    base: { hp: 85, atk: 10, def: 5, spd: 11 }, crit: 0.05, targeting: 'front',
    skill: { kind: 'heal', name: 'Mend', cd: 2, text: 'Mends the most hurt ally.', params: { power: 2.2, team: false } },
    blurb: 'They tie knots in things to keep them from coming apart.',
  },
  'remnant/tech': {
    name: 'Conductor', archetype: 'remnant', path: 'tech', weapon: 'Neural conduits',
    base: { hp: 92, atk: 12, def: 6, spd: 13 }, crit: 0.05, targeting: 'front',
    skill: { kind: 'sync', name: 'Waveform', cd: 3, text: 'Syncs the squad: everyone acts sooner and hits harder for 2 turns.', params: { haste: 0.35, atkUp: 2 } },
    blurb: 'A symphony of precision led by unseen hands.',
  },
  'remnant/magic': {
    name: 'Medium', archetype: 'remnant', path: 'magic', weapon: 'Omamori',
    base: { hp: 95, atk: 12, def: 6, spd: 12 }, crit: 0.05, targeting: 'front',
    skill: { kind: 'barrier', name: 'Barrier of Memory', cd: 3, text: 'Amulet spirits weave a shield around every ally.', params: { power: 2.4 } },
    blurb: 'The past shielding the present in quiet devotion.',
  },
  'remnant/hybrid': {
    name: 'Oracle', archetype: 'remnant', path: 'hybrid', weapon: 'Harmonizer rods',
    base: { hp: 100, atk: 13, def: 7, spd: 13 }, crit: 0.05, targeting: 'front',
    skill: { kind: 'heal', name: 'Harmony', cd: 3, text: 'Heals the whole squad and clears stuns and slows.', params: { power: 1.5, team: true, cleanse: true } },
    blurb: 'Harmony imposed until it feels like peace.',
  },
};

/** Stat growth per level above 1 (fraction of base). */
export const LEVEL_GROWTH = 0.11;
export const MAX_LEVEL = 30;
/** Experience needed to go from `level` to the next one. */
export const xpToNext = (level) => 80 + 35 * (level - 1);

/**
 * @param {ArchetypeId} archetype
 * @param {PathId} path
 * @returns {ClassDef}
 */
export function classOf(archetype, path) {
  return CLASSES[`${archetype}/${path}`] || CLASSES[`${archetype}/none`];
}
