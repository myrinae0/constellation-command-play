// Pieces several screens share: unit rows, status chips, mission cards,
// Truth cards, and announcing what happened when a watch passes.

import { h, icon, archMark, bar } from './dom.js';
import { classOf, ARCHETYPES, PATHS, xpToNext } from '../data/classes.js';
import { MISSION_TYPES } from '../data/missions.js';
import { ENEMIES } from '../data/enemies.js';
import { unitStats, unitStatus, sealedTruthsOf } from '../systems/roster.js';
import { districtDef } from '../systems/city.js';
import { truthDef } from '../systems/truths.js';
import { ringBell } from './audio.js';
import { plural } from './text.js';

/** "Ready" / "Thinned · back at watch 9" / ... */
export function statusChip(state, unit) {
  const status = unitStatus(state, unit);
  if (status === 'ready') return h('span', { class: 'chip good' }, 'Ready');
  if (status === 'thinned') return h('span', { class: 'chip thin' }, `Thinned · ready watch ${unit.recoverUntil}`);
  if (status === 'training') return h('span', { class: 'chip even' }, `Training · ready watch ${unit.busyUntil}`);
  return h('span', { class: 'chip danger' }, 'Boards the next ship');
}

export function statsLine(stats) {
  return h(
    'div',
    { class: 'stats' },
    h('span', null, 'HP ', h('b', null, stats.hp)),
    h('span', null, 'ATK ', h('b', null, stats.atk)),
    h('span', null, 'DEF ', h('b', null, stats.def)),
    h('span', null, 'SPD ', h('b', null, stats.spd)),
  );
}

export function unitLabel(unit) {
  const cls = classOf(unit.archetype, unit.path);
  return `${cls.name} (${ARCHETYPES[unit.archetype].name}${unit.path === 'none' ? '' : `, ${PATHS[unit.path].name}`})`;
}

/**
 * A compact unit summary: mark, name, class, level, optional status.
 * @param {{status?: boolean, xp?: boolean}} [opts]
 */
export function unitSummary(state, unit, opts = { status: true }) {
  const cls = classOf(unit.archetype, unit.path);
  const letters = sealedTruthsOf(state, unit).length;
  return h(
    'div',
    { class: 'who' },
    archMark(unit.archetype, unit.path, `${ARCHETYPES[unit.archetype].name}, ${PATHS[unit.path].name}`),
    h(
      'div',
      { class: 'grow' },
      h('div', { class: 'row spread' }, h('strong', null, unit.name), h('span', { class: 'tiny muted' }, `Lv ${unit.level}`)),
      h('div', { class: 'small muted' }, cls.name, unit.forgeTier ? ` · forge ${unit.forgeTier}` : '', letters ? ` · ${plural(letters, 'sealed letter')}` : ''),
      opts.xp ? bar(unit.xp / xpToNext(unit.level), 'xp', 'Experience') : null,
      statsLine(unitStats(state, unit)),
      opts.status ? h('div', { style: { marginTop: '4px' } }, statusChip(state, unit)) : null,
    ),
  );
}

const TYPE_ICON = { push: 'fog', rescue: 'roster', gear: 'forge', truth: 'letter' };

/** A mission on Janice's board. */
export function missionCard(state, mission, onOpen) {
  const type = MISSION_TYPES[mission.type];
  const d = districtDef(mission.district);
  const enemyNames = [...new Set(mission.enemies.map((e) => (ENEMIES[e].boss ? d.boss.name : ENEMIES[e].name)))];
  const left = mission.expires - state.watch;
  return h(
    'button',
    { class: 'card tap', onclick: onOpen, 'aria-label': `${type.name} in ${d.name}, danger level ${mission.level}` },
    h('div', { class: 'row spread' }, h('strong', null, icon(TYPE_ICON[mission.type]), ' ', type.name), h('span', { class: `chip ${mission.level >= 6 ? 'grim' : mission.level >= 4 ? 'thin' : 'even'}` }, `Danger ${mission.level}`)),
    h('div', { class: 'small', style: { marginTop: '4px' } }, d.name, mission.boss ? h('span', { class: 'chip danger', style: { marginLeft: '6px' } }, d.boss.name) : null),
    h('div', { class: 'tiny muted', style: { marginTop: '4px' } }, `${mission.enemies.length} in the fog: ${enemyNames.join(', ')}`),
    h('div', { class: 'tiny dim', style: { marginTop: '2px' } }, left <= 0 ? 'Leaves the board after this watch' : `On the board for ${plural(left + 1, 'more watch', 'more watches')}`),
  );
}

/** The Truth text with weight and district. */
export function truthHeader(inst) {
  const def = truthDef(inst);
  return h(
    'div',
    null,
    h('div', { class: 'row', style: { marginBottom: '6px' } }, h('span', { class: `chip ${def.weight === 'heavy' ? 'accent' : ''}` }, def.weight === 'heavy' ? 'Heavy Truth' : 'Small Truth'), h('span', { class: 'chip' }, districtDef(def.district).name)),
    h('p', { class: 'quote' }, `“${def.text}”`),
  );
}

/**
 * Announce what happened when a watch passed (from systems/game.js
 * advanceWatch), as toasts. Rings the bell if it rang.
 */
export function announceEvents(app, events) {
  for (const e of events) {
    if (e.type === 'bell') {
      if (app.state.settings.sound) ringBell();
      const parts = ['A bell rings once.'];
      if (e.arrivals.length) parts.push(`On the dock: ${e.arrivals.join(', ')}.`);
      if (e.departed.length) parts.push(`${e.departed.join(', ')} boarded the ship.`);
      app.toast(parts.join(' '), 'bell');
    } else if (e.type === 'faded') app.toast(`${e.name} faded on the dock. Chen lights incense.`);
    else if (e.type === 'recovered') app.toast(`${e.name} has recovered.`);
    else if (e.type === 'trained') app.toast(`${e.name} finished training.`);
  }
}

/** One-line description of a watch event, for the debrief. */
export function eventText(e) {
  if (e.type === 'bell') {
    return `A bell rang.${e.arrivals.length ? ` On the dock: ${e.arrivals.join(', ')}.` : ''}${e.departed.length ? ` ${e.departed.join(', ')} boarded the ship.` : ''}${e.fogReturned ? ` Fog returned to ${districtDef(e.fogReturned).name}.` : ''}`;
  }
  if (e.type === 'faded') return `${e.name} faded on the dock. Their Truth sank into ${districtDef(e.district).name}.`;
  if (e.type === 'recovered') return `${e.name} recovered.`;
  if (e.type === 'trained') return `${e.name} finished training.`;
  return '';
}

/** "+14 salvage · +9 resonance" with colored icons. */
export function materials(m) {
  return h(
    'span',
    { class: 'row', style: { gap: '12px' } },
    h('span', { class: 'res' }, h('span', { class: 'salvage' }, icon('salvage'), ` +${m.salvage || 0} salvage`)),
    h('span', { class: 'res' }, h('span', { class: 'resonance' }, icon('resonance'), ` +${m.resonance || 0} resonance`)),
  );
}

/** Cost label, highlighting what's unaffordable. */
export function costLabel(state, cost) {
  const parts = [];
  if (cost.salvage) parts.push(`${cost.salvage} salvage`);
  if (cost.resonance) parts.push(`${cost.resonance} resonance`);
  return parts.join(' + ') || 'free';
}
