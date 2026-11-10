// Janice's board: generating missions, checking squads, turning units and
// creatures into fighters, and applying a battle's results.

import { MISSION_TYPES, BALANCE } from '../data/missions.js';
import { DISTRICTS } from '../data/districts.js';
import { ENEMIES } from '../data/enemies.js';
import { KEEPSAKES } from '../data/gear.js';
import { classOf } from '../data/classes.js';
import { addLog, newId } from '../core/state.js';
import { createRng, hashSeed } from '../core/rng.js';
import { simulateBattle } from './battle.js';
import { gainXp, isAvailable, sealedTruthsOf, unitPower, unitStats } from './roster.js';
import { changeFog, checkGoal, districtDef, districtLevel } from './city.js';
import { createTruth, getTruth, pickTruthSource, revealTruth } from './truths.js';
import { freeBunks, makeArrival, takeIn } from './ships.js';
import { gain } from './economy.js';

export const SQUAD_SIZE = 3;
const ROW = { shard: 0, trace: 1, axis: 2, remnant: 2 };

// ------------------------------------------------------------ the board

/**
 * Create one mission. `type` and `district` are chosen if not given.
 * @param {import('../core/rng.js').Rng} rng
 */
export function generateMission(state, rng, opts = {}) {
  const type = opts.type || rng.weighted(Object.keys(MISSION_TYPES), (t) => MISSION_TYPES[t].weight);
  const candidates = DISTRICTS.filter((d) => (type === 'push' ? state.districts[d.id].fog > 0 : true));
  const district =
    opts.district ||
    rng.weighted(candidates.length ? candidates : DISTRICTS, (d) => {
      // Lean toward districts the squad can handle, but keep harder ones in view.
      const lvl = districtLevel(state, d.id);
      return 1 / lvl;
    }).id;
  const def = MISSION_TYPES[type];
  const level = districtLevel(state, district, def.threat);
  const seed = hashSeed(state.seed, 'mission', state.nextId);
  const mrng = createRng(seed);
  const fog = state.districts[district].fog;
  const boss = type === 'push' && fog > 0 && fog <= BALANCE.bossFogBelow;
  const pool = districtDef(district).enemies;
  const count = boss ? 2 : level <= 2 ? mrng.int(2, 3) : level <= 6 ? 3 : mrng.int(3, 4);
  const enemies = Array.from({ length: count }, () => mrng.pick(pool));
  if (boss) enemies.unshift('upright');
  return {
    id: newId(state, 'm'),
    type,
    district,
    level,
    seed,
    enemies,
    boss,
    lostTruthId: opts.lostTruthId || null,
    createdWatch: state.watch,
    expires: state.watch + BALANCE.missionLifetime + (type === 'truth' ? 1 : 0),
  };
}

/** Drop expired missions, brief lost Truths, and fill the board back up. */
export function refreshBoard(state, rng) {
  state.missions = state.missions.filter((m) => m.expires >= state.watch);
  // Missions for lost Truths whose mission expired are re-briefed later.
  for (const lost of state.lostTruths) {
    if (state.missions.some((m) => m.lostTruthId === lost.id)) continue;
    if (state.missions.filter((m) => m.type === 'truth').length >= 2) break;
    state.missions.push(generateMission(state, rng, { type: 'truth', district: lost.district, lostTruthId: lost.id }));
  }
  let guard = 0;
  while (state.missions.filter((m) => m.type !== 'truth').length < BALANCE.boardSize && guard++ < 20) {
    const hasPush = state.missions.some((m) => m.type === 'push');
    const anyFog = DISTRICTS.some((d) => state.districts[d.id].fog > 0);
    const m = generateMission(state, rng, !hasPush && anyFog ? { type: 'push' } : {});
    if (state.missions.some((x) => x.type === m.type && x.district === m.district)) continue;
    state.missions.push(m);
  }
}

// ------------------------------------------------------------ squads

/**
 * Squad rules: 1 to 3 units, no duplicates, everyone ready (not thinned,
 * training or departing).
 * @param {string[]} unitIds
 * @returns {{ok: boolean, reason?: string}}
 */
export function validateSquad(state, unitIds) {
  if (!unitIds.length) return { ok: false, reason: 'Choose at least one unit.' };
  if (unitIds.length > SQUAD_SIZE) return { ok: false, reason: `A squad is at most ${SQUAD_SIZE}.` };
  if (new Set(unitIds).size !== unitIds.length) return { ok: false, reason: 'Someone is listed twice.' };
  for (const id of unitIds) {
    const unit = state.units.find((u) => u.id === id);
    if (!unit) return { ok: false, reason: 'That unit is not in the roster.' };
    if (!isAvailable(state, unit)) return { ok: false, reason: `${unit.name} is not ready.` };
  }
  return { ok: true };
}

/**
 * Janice's pick: a frontliner if possible, a support if possible, then the
 * strongest of the rest.
 */
export function autoSquad(state) {
  const ready = state.units.filter((u) => isAvailable(state, u));
  const power = (u) => unitPower(unitStats(state, u));
  const byPower = ready.slice().sort((a, b) => power(b) - power(a));
  const squad = [];
  for (const arch of ['shard', 'remnant']) {
    const best = byPower.find((u) => u.archetype === arch && !squad.includes(u));
    if (best) squad.push(best);
  }
  for (const u of byPower) if (squad.length < SQUAD_SIZE && !squad.includes(u)) squad.push(u);
  return squad.slice(0, SQUAD_SIZE).map((u) => u.id);
}

// ------------------------------------------------------------ fighters

/** @returns {import('./battle.js').FighterSpec} */
export function allySpec(state, unit) {
  const cls = classOf(unit.archetype, unit.path);
  return {
    id: unit.id,
    side: 'ally',
    name: unit.name,
    stats: unitStats(state, unit),
    crit: cls.crit,
    targeting: cls.targeting,
    skill: cls.skill,
    passive: cls.passive,
    row: ROW[unit.archetype],
    held: sealedTruthsOf(state, unit).length > 0,
    look: { archetype: unit.archetype, path: unit.path, cls: cls.name },
  };
}

/** @returns {import('./battle.js').FighterSpec[]} */
export function enemySpecs(mission) {
  const growth = 1 + BALANCE.enemyGrowth * (mission.level - 1);
  const boss = districtDef(mission.district).boss;
  const seen = {};
  return mission.enemies.map((enemyId, i) => {
    const def = ENEMIES[enemyId];
    seen[enemyId] = (seen[enemyId] || 0) + 1;
    const name = def.boss ? boss.name : seen[enemyId] > 1 || mission.enemies.filter((e) => e === enemyId).length > 1 ? `${def.name} ${seen[enemyId]}` : def.name;
    return {
      id: `e${i}`,
      side: 'enemy',
      name,
      stats: {
        hp: Math.round(def.base.hp * growth * BALANCE.enemyScale.hp),
        atk: Math.round(def.base.atk * growth * BALANCE.enemyScale.atk),
        def: Math.round(def.base.def * growth * BALANCE.enemyScale.def),
        spd: Math.round(def.base.spd * (1 + (growth - 1) * 0.25)),
      },
      crit: def.crit,
      targeting: def.targeting,
      skill: def.skill,
      row: def.row ?? 1,
      look: { shape: def.shape, boss: !!def.boss },
    };
  });
}

/**
 * Janice's read on the odds, from a rough power comparison.
 * @returns {{ratio: number, label: string, tone: 'good'|'even'|'thin'|'grim'}}
 */
export function assessOdds(state, mission, unitIds) {
  const squad = unitIds.map((id) => state.units.find((u) => u.id === id)).filter(Boolean);
  const ours = squad.reduce((sum, u) => sum + unitPower(unitStats(state, u)), 0);
  const theirs = enemySpecs(mission).reduce((sum, e) => sum + unitPower(e.stats), 0) || 1;
  const ratio = ours / theirs;
  if (ratio >= 1.35) return { ratio, label: 'Steady', tone: 'good' };
  if (ratio >= 1.0) return { ratio, label: 'Even', tone: 'even' };
  if (ratio >= 0.75) return { ratio, label: 'Thin margins', tone: 'thin' };
  return { ratio, label: 'Grim', tone: 'grim' };
}

// ------------------------------------------------------------ resolution

/**
 * Reward handlers per mission type, run on victory. Each may add to `report`.
 * @type {Record<string, (state: any, mission: any, report: any, rng: any, squad: any[]) => void>}
 */
export const REWARDS = {
  push(state, mission, report, rng, squad) {
    report.fog = changeFog(state, mission.district, -rng.int(...BALANCE.pushFog));
    // Deep in the fog, someone else's Truth is sometimes lying in the street.
    if (report.fog.before > BALANCE.bossFogBelow && rng.chance(BALANCE.lostTruthChance)) {
      const t = createTruth(state, pickTruthSource(state, rng, { lost: true }), { carrierId: squad[0].id, origin: 'lost', state: 'pending' });
      report.found.truths.push(t.id);
    }
  },
  rescue(state, mission, report, rng) {
    report.fog = changeFog(state, mission.district, -BALANCE.sideFog);
    const count = 1 + (state.mods.rescueBonus || 0);
    for (let i = 0; i < count; i++) {
      const arrival = makeArrival(state, rng, 2);
      state.dock.push(arrival);
      if (freeBunks(state) > 0) takeIn(state, arrival.id);
      report.found.rescued.push(arrival.name);
      state.stats.rescued++;
    }
  },
  gear(state, mission, report, rng) {
    report.fog = changeFog(state, mission.district, -BALANCE.sideFog);
    const owned = new Set(state.keepsakes.map((k) => k.defId));
    const options = KEEPSAKES.filter((k) => !owned.has(k.id));
    if (options.length) {
      const def = rng.pick(options);
      state.keepsakes.push({ id: newId(state, 'k'), defId: def.id, unitId: null });
      report.found.keepsakes.push(def.id);
    } else {
      gain(state, { salvage: 30 });
      report.materials.salvage += 30;
    }
  },
  truth(state, mission, report, rng, squad) {
    report.fog = changeFog(state, mission.district, -BALANCE.sideFog);
    const lost = state.lostTruths.find((l) => l.id === mission.lostTruthId);
    if (!lost) return;
    state.lostTruths = state.lostTruths.filter((l) => l !== lost);
    const source = lost.def ? { def: lost.def } : { defId: lost.defId };
    const t = createTruth(state, source, { carrierId: squad[0].id, origin: 'lost', state: 'pending' });
    report.found.truths.push(t.id);
  },
};

/**
 * Run the battle and apply everything that follows. Does not advance time
 * (systems/game.js does that).
 * @returns {{battle: ReturnType<typeof simulateBattle>, report: any} | {error: string}}
 */
export function resolveMission(state, missionId, unitIds) {
  const mission = state.missions.find((m) => m.id === missionId);
  if (!mission) return { error: 'That mission is no longer on the board.' };
  const check = validateSquad(state, unitIds);
  if (!check.ok) return { error: check.reason };

  const squad = unitIds.map((id) => state.units.find((u) => u.id === id));
  const battle = simulateBattle({
    allies: squad.map((u) => allySpec(state, u)),
    enemies: enemySpecs(mission),
    seed: mission.seed,
  });
  const rng = createRng(hashSeed(mission.seed, 'rewards'));
  const type = MISSION_TYPES[mission.type];
  const victory = battle.outcome === 'victory';
  const report = {
    missionId: mission.id,
    type: mission.type,
    district: mission.district,
    level: mission.level,
    boss: mission.boss,
    outcome: battle.outcome,
    watch: state.watch,
    materials: { salvage: 0, resonance: 0 },
    fog: null,
    found: { truths: [], keepsakes: [], rescued: [] },
    remembered: [],
    squad: [],
    clearedGoal: false,
  };

  // Materials: full on victory; on retreat, half (or all, with "three lefts").
  const share = victory || state.mods.retreatKeeps ? 1 : 0.5;
  report.materials.salvage = Math.round(rng.int(...type.materials.salvage) * share);
  report.materials.resonance = Math.round(rng.int(...type.materials.resonance) * share);
  gain(state, report.materials);

  if (victory) REWARDS[mission.type]?.(state, mission, report, rng, squad);

  // Everyone comes back. Thinned units need time; nobody is lost.
  const recovery = Math.max(1, BALANCE.recoveryWatches - (state.mods.recoveryBonus || 0));
  const xp = Math.round(type.xp * (victory ? 1 : 0.4));
  for (const unit of squad) {
    const fighter = battle.fighters.find((f) => f.id === unit.id);
    const thinned = fighter.down;
    if (thinned) {
      unit.recoverUntil = state.watch + 1 + recovery;
      state.stats.thinnings++;
    }
    unit.missions++;
    const levels = gainXp(unit, xp);
    const own = getTruth(state, unit.truthId);
    if (own && revealTruth(state, own)) report.remembered.push(own.id);
    report.squad.push({ id: unit.id, name: unit.name, thinned, held: fighter.heldUsed, levels, xp });
  }

  state.missions = state.missions.filter((m) => m !== mission);
  state.stats.missions++;
  if (victory) state.stats.victories++;
  else state.stats.retreats++;
  report.clearedGoal = checkGoal(state);
  addLog(
    state,
    victory
      ? `Squad ${MISSION_TYPES[mission.type].verb} ${districtDef(mission.district).name}.`
      : `Squad pulled back from ${districtDef(mission.district).name}. Everyone came back.`,
  );
  state.lastReport = report;
  return { battle, report };
}

