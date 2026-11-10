// The roster: everyone in the Stacks, and a detail sheet per unit.

import { h, bar } from '../dom.js';
import { ARCHETYPES, PATHS, classOf, xpToNext } from '../../data/classes.js';
import { KEEPSAKES } from '../../data/gear.js';
import { unitStatus } from '../../systems/roster.js';
import { getTruth, truthDef } from '../../systems/truths.js';
import { isUnlocked } from '../../systems/unlocks.js';
import { statsLine, statusChip, unitSummary } from '../components.js';
import { plural } from '../text.js';

const ORDER = { ready: 0, training: 1, thinned: 2, departing: 3 };

export const rosterScreen = {
  render(app) {
    const s = app.state;
    const units = s.units.slice().sort((a, b) => ORDER[unitStatus(s, a)] - ORDER[unitStatus(s, b)] || b.level - a.level);
    return h(
      'div',
      { class: 'stack' },
      h('div', { class: 'row spread' }, h('h1', { style: { margin: 0 } }, 'Roster'), h('span', { class: 'small muted' }, `${s.units.length} of ${s.bunks} bunks`)),
      h(
        'div',
        { class: 'list cols cols3' },
        units.map((u) => h('button', { class: 'card tap', onclick: () => openUnit(app, u.id), 'aria-label': `${u.name}, details` }, unitSummary(s, u, { status: true }))),
      ),
    );
  },
};

/** The detail sheet for one unit (or an arrival still on the dock). */
export function openUnit(app, unitId) {
  app.openSheet('Constellation member', () => {
    const s = app.state;
    const u = s.units.find((x) => x.id === unitId) || s.dock.find((x) => x.id === unitId);
    if (!u) return [h('p', { class: 'empty' }, 'They are no longer in the Stacks.')];
    const onDock = s.dock.includes(u);
    const cls = classOf(u.archetype, u.path);
    const keepsake = s.keepsakes.find((k) => k.id === u.keepsakeId);
    const keepsakeDef = keepsake && KEEPSAKES.find((k) => k.id === keepsake.defId);
    const own = getTruth(s, u.truthId);
    const ownText = onDock ? 'Carries a Truth. They do not know how to say it yet.'
      : !own ? 'They carry no Truth of their own.'
        : own.state === 'hidden' ? 'Not remembered yet. It surfaces after their first time in the fog.'
          : own.state === 'pending' ? `Remembered, waiting at the Archive: “${truthDef(own).text}”`
            : own.state === 'sealed' ? `Kept sealed: “${truthDef(own).text}”`
              : `Recorded by the Archive: “${truthDef(own).text}”`;
    const carried = s.truths.filter((t) => t.carrierId === u.id && t.state === 'sealed' && t.id !== u.truthId);
    return [
      unitSummary(s, u, { status: false, full: true }),
      onDock ? null : h('div', { class: 'row spread' }, statusChip(s, u), h('span', { class: 'tiny muted' }, `${u.xp}/${xpToNext(u.level)} xp`)),
      onDock ? null : bar(u.xp / xpToNext(u.level), 'xp', 'Experience'),
      h('p', { class: 'small muted' }, `Named for ${u.noticed}.${onDock ? '' : ` ${u.missions ? `${plural(u.missions, 'mission')} so far.` : 'Has not been into the fog yet.'}`}`),
      h('div', { class: 'card' }, h('h3', null, 'Their Truth'), h('p', { class: 'small', style: { margin: 0 } }, ownText), carried.length ? h('p', { class: 'small muted', style: { margin: '6px 0 0' } }, `Also carrying ${plural(carried.length, 'sealed letter')} for others.`) : null),
      h(
        'details',
        { class: 'card' },
        h('summary', null, `${cls.name}: role, skill and gear`),
        h('p', { class: 'small' }, `${ARCHETYPES[u.archetype].name} (${ARCHETYPES[u.archetype].role}). ${cls.blurb}`),
        h('dl', { class: 'kv' },
          h('dt', null, 'Path'), h('dd', null, `${PATHS[u.path].name}: ${PATHS[u.path].blurb}`),
          h('dt', null, 'Weapon'), h('dd', null, `${cls.weapon}${u.forgeTier ? `, forge tier ${u.forgeTier}` : ''}`),
          h('dt', null, 'Skill'), h('dd', null, `${cls.skill.name}: ${cls.skill.text}`),
          h('dt', null, 'Keepsake'), h('dd', null, keepsakeDef ? `${keepsakeDef.name}. ${keepsakeDef.text}` : 'None'),
        ),
      ),
      !onDock && isUnlocked(s, 'workshop') ? h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => app.go('workshop', { unitId: u.id }) }, 'Forge and training')) : null,
    ];
  });
}
