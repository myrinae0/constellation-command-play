// Deterministic auto-battle. Given the same fighters and seed it always
// produces the same event list, which the UI then replays (and can skip).
// No DOM here, so it runs in tests and the balance tool as-is.
//
// Turn order: each fighter's next action time is 100 / speed. The fighter
// with the smallest time acts, then schedules its next turn.

import { createRng } from '../core/rng.js';

/**
 * @typedef {Object} FighterSpec
 * @property {string} id
 * @property {'ally'|'enemy'} side
 * @property {string} name
 * @property {{hp: number, atk: number, def: number, spd: number}} stats
 * @property {number} crit
 * @property {'front'|'weakest'|'strongest'|'random'} targeting
 * @property {import('../data/classes.js').SkillDef | null} skill
 * @property {string} [passive]
 * @property {number} row        0 = front, 2 = back (who "front" targeting hits first)
 * @property {boolean} [held]    carries a sealed letter: survives one lethal hit
 * @property {Record<string, any>} [look] drawing hints for the UI
 */

/**
 * @typedef {Object} Hit
 * @property {string} target
 * @property {number} [dmg]
 * @property {number} [absorbed]
 * @property {number} [heal]
 * @property {number} [shield]
 * @property {boolean} [crit]
 * @property {string} [status]   e.g. 'stun', 'slow', 'taunt', 'haste'
 * @property {boolean} [down]
 * @property {boolean} [held]
 */

/**
 * @typedef {Object} BattleEvent
 * @property {'act'|'skip'|'end'} type
 * @property {string} [actor]
 * @property {string|null} [skill]
 * @property {Hit[]} [hits]
 * @property {string} text
 * @property {string} [outcome]
 */

/** Outcome when actions run out: Janice calls the squad back. */
export const MAX_ACTIONS = 140;

/** Global damage multiplier: higher = shorter, more dangerous fights. */
export const DAMAGE_SCALE = 1.4;

const FALL_LINES = [
  'lies still, as if it finally remembered how.',
  'folds back into the fog.',
  'stops, and forgets to start again.',
  'kneels, and stays down.',
];

/** @param {FighterSpec} spec */
export function makeFighter(spec) {
  return {
    ...spec,
    maxHp: spec.stats.hp,
    hp: spec.stats.hp,
    atk: spec.stats.atk,
    def: spec.stats.def,
    spd: spec.stats.spd,
    cd: 1, // ticks to 0 on the first turn, so everyone opens with their skill
    t: 0,
    status: { stun: 0, slow: 0, taunt: 0, atkUp: 0 },
    shield: 0,
    stored: 0,
    bonusAtk: 0,
    rot: 0,
    heldUsed: false,
    down: false,
  };
}

/**
 * @param {{allies: FighterSpec[], enemies: FighterSpec[], seed: number, maxActions?: number}} input
 * @returns {{outcome: 'victory'|'retreat', events: BattleEvent[], fighters: ReturnType<typeof makeFighter>[], cast: any[], actions: number}}
 */
export function simulateBattle({ allies, enemies, seed, maxActions = MAX_ACTIONS }) {
  const rng = createRng(seed);
  const fighters = [...allies, ...enemies].map(makeFighter);
  for (const f of fighters) f.t = (100 / f.spd) * rng.float(0.75, 1);
  // The starting line-up, so the UI can replay the events from the top.
  const cast = fighters.map((f) => ({ id: f.id, side: f.side, name: f.name, maxHp: f.maxHp, row: f.row, look: f.look || {} }));

  /** @type {BattleEvent[]} */
  const events = [];
  const ctx = { rng, fighters, now: 0, actions: 0 };
  let outcome = /** @type {'victory'|'retreat'} */ ('retreat');

  for (; ctx.actions < maxActions; ctx.actions++) {
    if (!alive(fighters, 'enemy').length) {
      outcome = 'victory';
      break;
    }
    if (!alive(fighters, 'ally').length) break;
    const actor = nextActor(fighters);
    ctx.now = actor.t;
    events.push(takeTurn(ctx, actor));
    actor.t = ctx.now + 100 / effSpd(actor);
  }
  if (!alive(fighters, 'enemy').length) outcome = 'victory';

  const endText =
    outcome === 'victory'
      ? 'The fog thins. The squad stands in a quiet street.'
      : alive(fighters, 'ally').length
        ? 'Janice calls them back before the fog closes. Everyone comes back.'
        : 'The squad is thinned. Constellation pulls everyone out. Everyone comes back.';
  events.push({ type: 'end', outcome, text: endText });
  return { outcome, events, fighters, cast, actions: ctx.actions };
}

// ---------------------------------------------------------------- turn logic

function takeTurn(ctx, actor) {
  const s = actor.status;
  // Statuses tick down on the owner's turn.
  if (s.taunt > 0) s.taunt--;
  if (s.atkUp > 0) s.atkUp--;
  if (s.slow > 0) s.slow--;
  if (s.stun > 0) {
    s.stun--;
    return { type: 'skip', actor: actor.id, text: `${actor.name} is held fast and loses a turn.` };
  }
  if (actor.cd > 0) actor.cd--;

  const skill = actor.skill;
  const handler = skill && SKILLS[skill.kind];
  if (skill && handler && actor.cd === 0 && (!handler.when || handler.when(ctx, actor, skill.params || {}))) {
    actor.cd = skill.cd;
    const hits = handler.run(ctx, actor, skill.params || {});
    const label = actor.skillLabel || skill.name;
    delete actor.skillLabel;
    return { type: 'act', actor: actor.id, skill: label, hits, text: describe(ctx, actor, label, hits) };
  }
  const target = pickTarget(ctx, actor, foesOf(ctx, actor), actor.targeting);
  const hits = target ? [hitFor(ctx, actor, target, 1)] : [];
  return { type: 'act', actor: actor.id, skill: null, hits, text: describe(ctx, actor, null, hits) };
}

/**
 * Skill behaviours by `kind`. `run` returns the hits it caused; `when`
 * (optional) says whether it's worth using now. Add a kind here to give a
 * class or enemy a new kind of skill.
 * @type {Record<string, {run: (ctx: any, actor: any, p: any) => Hit[], when?: (ctx: any, actor: any, p: any) => boolean}>}
 */
export const SKILLS = {
  guard: {
    run(ctx, actor, p) {
      actor.status.taunt = Math.max(actor.status.taunt, p.taunt || 2);
      const amount = Math.round(actor.maxHp * (p.shield || 0.1));
      const targets = p.team ? alive(ctx.fighters, actor.side) : [actor];
      return targets.map((t) => {
        const value = t === actor ? amount : Math.round(amount * 0.6);
        t.shield += value;
        return { target: t.id, shield: value, status: t === actor ? 'taunt' : undefined };
      });
    },
  },
  aoe: {
    run(ctx, actor, p) {
      const hits = alive(ctx.fighters, other(actor.side)).map((t) => hitFor(ctx, actor, t, p.power));
      if (p.taunt) actor.status.taunt = Math.max(actor.status.taunt, p.taunt);
      return hits;
    },
  },
  discharge: {
    run(ctx, actor, p) {
      const foes = alive(ctx.fighters, other(actor.side));
      const bonus = (actor.stored * p.stored) / Math.max(1, foes.length);
      actor.stored = 0;
      if (p.taunt) actor.status.taunt = Math.max(actor.status.taunt, p.taunt);
      return foes.map((t) => hitFor(ctx, actor, t, p.power, { flat: bonus }));
    },
  },
  strike: {
    run(ctx, actor, p) {
      const target = pickTarget(ctx, actor, foesOf(ctx, actor), p.target || 'front', p.target === 'weakest');
      if (!target) return [];
      const hit = hitFor(ctx, actor, target, p.power, { execute: p.execute });
      if (p.drain && hit.dmg) {
        const healed = healUnit(actor, Math.round(hit.dmg * p.drain));
        if (healed) hit.drain = healed;
      }
      if (!hit.down) {
        if (p.slow) applyStatus(target, 'slow', p.slow, hit);
        if (p.stun) applyStatus(target, 'stun', p.stun, hit);
      }
      return [hit];
    },
  },
  multi: {
    run(ctx, actor, p) {
      const hits = [];
      for (let i = 0; i < (p.hits || 2); i++) {
        const target = pickTarget(ctx, actor, foesOf(ctx, actor), p.target || 'weakest', true);
        if (!target) break;
        hits.push(hitFor(ctx, actor, target, p.power));
      }
      return hits;
    },
  },
  parity: {
    // Steel for the strongest, silver for the weakest.
    run(ctx, actor, p) {
      const hits = [];
      for (const rule of ['strongest', 'weakest']) {
        const target = pickTarget(ctx, actor, foesOf(ctx, actor), rule, true);
        if (target) hits.push(hitFor(ctx, actor, target, p.power));
      }
      return hits;
    },
  },
  rotation: {
    // Fire, ice, thunder, tide, in order.
    run(ctx, actor) {
      const element = ['Fire', 'Ice', 'Thunder', 'Tide'][actor.rot % 4];
      actor.rot++;
      actor.skillLabel = `Rotation: ${element}`;
      const foes = alive(ctx.fighters, other(actor.side));
      if (element === 'Fire') return foes.map((t) => hitFor(ctx, actor, t, 0.8));
      if (element === 'Ice') {
        return foes.map((t) => {
          const hit = hitFor(ctx, actor, t, 0.4);
          if (!hit.down) applyStatus(t, 'slow', 2, hit);
          return hit;
        });
      }
      if (element === 'Thunder') {
        const target = pickTarget(ctx, actor, foes, 'strongest', true);
        if (!target) return [];
        const hit = hitFor(ctx, actor, target, 1.2);
        if (!hit.down) applyStatus(target, 'stun', 1, hit);
        return [hit];
      }
      return alive(ctx.fighters, actor.side).map((t) => ({ target: t.id, heal: healUnit(t, Math.round(effAtk(actor) * 1.0)) }));
    },
  },
  hymn: {
    run(ctx, actor, p) {
      const foes = alive(ctx.fighters, other(actor.side));
      const strongest = pickTarget(ctx, actor, foes, 'strongest', true);
      const hits = foes.map((t) => hitFor(ctx, actor, t, p.power));
      const hit = hits.find((h) => strongest && h.target === strongest.id);
      if (hit && !hit.down) applyStatus(strongest, 'stun', p.stun || 1, hit);
      return hits;
    },
  },
  heal: {
    when: (ctx, actor, p) => alive(ctx.fighters, actor.side).some((f) => f.hp < f.maxHp * (p.team ? 0.8 : 0.7)),
    run(ctx, actor, p) {
      const team = alive(ctx.fighters, actor.side);
      const targets = p.team ? team : [team.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]];
      return targets.map((t) => {
        if (p.cleanse) {
          t.status.stun = 0;
          t.status.slow = 0;
        }
        return { target: t.id, heal: healUnit(t, Math.round(effAtk(actor) * p.power)) };
      });
    },
  },
  sync: {
    run(ctx, actor, p) {
      return alive(ctx.fighters, actor.side).map((t) => {
        if (t !== actor) t.t = ctx.now + (t.t - ctx.now) * (1 - p.haste);
        t.status.atkUp = Math.max(t.status.atkUp, p.atkUp || 2);
        return { target: t.id, status: 'haste' };
      });
    },
  },
  barrier: {
    run(ctx, actor, p) {
      const amount = Math.round(effAtk(actor) * p.power);
      return alive(ctx.fighters, actor.side).map((t) => {
        t.shield += amount;
        return { target: t.id, shield: amount };
      });
    },
  },
};

/** Passives keyed by id (on the fighter spec). */
const PASSIVES = {
  store: { onHurt: (f, dmg) => void (f.stored += dmg) },
  harvest: { onKill: (f) => void (f.bonusAtk += 2) },
};

// ---------------------------------------------------------------- helpers

function hitFor(ctx, actor, target, power, opts = {}) {
  let raw = effAtk(actor) * power * DAMAGE_SCALE * ctx.rng.float(0.9, 1.1) + (opts.flat || 0);
  if (opts.execute && target.hp / target.maxHp < opts.execute) raw *= 2;
  const crit = ctx.rng.chance(actor.crit);
  if (crit) raw *= 1.5;
  // Defense mitigates a share, never all of it.
  const dmg = Math.max(1, Math.round(raw * (1 - target.def / (target.def + 25))));
  /** @type {Hit} */
  const hit = { target: target.id, dmg };
  if (crit) hit.crit = true;
  const absorbed = Math.min(target.shield, dmg);
  if (absorbed) {
    target.shield -= absorbed;
    hit.absorbed = absorbed;
  }
  target.hp -= dmg - absorbed;
  PASSIVES[target.passive]?.onHurt?.(target, dmg - absorbed);
  if (target.hp <= 0) {
    if (target.held && !target.heldUsed) {
      // A sealed letter holds its carrier together, once per battle.
      target.heldUsed = true;
      target.hp = 1;
      hit.held = true;
    } else {
      target.hp = 0;
      target.down = true;
      hit.down = true;
      PASSIVES[actor.passive]?.onKill?.(actor);
    }
  }
  return hit;
}

function healUnit(f, amount) {
  const before = f.hp;
  f.hp = Math.min(f.maxHp, f.hp + Math.max(0, amount));
  return f.hp - before;
}

function applyStatus(target, key, turns, hit) {
  target.status[key] = Math.max(target.status[key], turns);
  hit.status = key;
}

/**
 * @param {boolean} [ignoreTaunt] precise skills (Trace, Binary) slip past taunts
 */
function pickTarget(ctx, actor, foes, rule, ignoreTaunt = false) {
  if (!foes.length) return null;
  if (!ignoreTaunt) {
    const taunting = foes.filter((f) => f.status.taunt > 0);
    if (taunting.length) return taunting.sort((a, b) => b.hp - a.hp)[0];
  }
  if (rule === 'weakest') return foes.slice().sort((a, b) => a.hp - b.hp)[0];
  if (rule === 'strongest') return foes.slice().sort((a, b) => b.hp - a.hp)[0];
  if (rule === 'random') return ctx.rng.pick(foes);
  const frontRow = Math.min(...foes.map((f) => f.row));
  return ctx.rng.pick(foes.filter((f) => f.row === frontRow));
}

const other = (side) => (side === 'ally' ? 'enemy' : 'ally');
const alive = (fighters, side) => fighters.filter((f) => f.side === side && !f.down);
const foesOf = (ctx, actor) => alive(ctx.fighters, other(actor.side));
const effAtk = (f) => (f.atk + f.bonusAtk) * (f.status.atkUp > 0 ? 1.25 : 1);
const effSpd = (f) => f.spd * (f.status.slow > 0 ? 0.6 : 1);

function nextActor(fighters) {
  let best = null;
  for (const f of fighters) if (!f.down && (!best || f.t < best.t)) best = f;
  return best;
}

/** Plain-language log line for an action. */
function describe(ctx, actor, skillName, hits) {
  const byId = (id) => ctx.fighters.find((f) => f.id === id);
  const parts = [];
  for (const h of hits) {
    const t = byId(h.target);
    if (h.dmg !== undefined) parts.push(`${t.name} −${h.dmg}${h.crit ? ' (critical)' : ''}${h.absorbed ? ` (shield took ${h.absorbed})` : ''}`);
    if (h.heal) parts.push(`${t.name} +${h.heal}`);
    if (h.shield) parts.push(`shield ${h.shield} on ${t.name}`);
    if (h.status === 'stun') parts.push(`${t.name} stunned`);
    if (h.status === 'slow') parts.push(`${t.name} slowed`);
  }
  const head = skillName ? `${actor.name} uses ${skillName}` : `${actor.name} attacks`;
  let text = parts.length ? `${head}: ${parts.join(', ')}.` : `${head}.`;
  if (hits.some((h) => h.status === 'haste')) text = `${head}: the squad moves as one.`;
  for (const h of hits) {
    const t = byId(h.target);
    if (h.held) text += ` ${t.name}'s sealed letter holds them together.`;
    if (h.down && t.side === 'enemy') text += ` ${t.name} ${FALL_LINES[ctx.actions % FALL_LINES.length]}`;
    if (h.down && t.side === 'ally') text += ` ${t.name} is thinned. Constellation pulls them back.`;
  }
  return text;
}
