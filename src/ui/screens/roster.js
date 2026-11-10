// The roster: everyone in the Stacks, and a detail sheet per unit.

import { h } from '../dom.js';
import { ARCHETYPES, PATHS, classOf, xpToNext } from '../../data/classes.js';
import { KEEPSAKES } from '../../data/gear.js';
import { unitStatus } from '../../systems/roster.js';
import { getTruth, truthDef } from '../../systems/truths.js';
import { statusChip, unitSummary } from '../components.js';
import { plural } from '../text.js';

const ORDER = { ready: 0, training: 1, thinned: 2, departing: 3 };

export const rosterScreen = {
  render(app) {
    const s = app.state;
    const units = s.units.slice().sort((a, b) => ORDER[unitStatus(s, a)] - ORDER[unitStatus(s, b)] || b.level - a.level);
    const counts = Object.fromEntries(Object.keys(ARCHETYPES).map((a) => [a, s.units.filter((u) => u.archetype === a).length]));
    return h(
      'div',
      { class: 'stack' },
      h('h1', null, 'Roster'),
      h('p', { class: 'small muted' }, `${plural(s.units.length, 'member')} in ${s.bunks} bunks. `, Object.entries(counts).map(([a, n]) => `${ARCHETYPES[a].name} ${n}`).join(' · ')),
      h(
        'div',
        { class: 'list cols cols3' },
        units.map((u) => h('button', { class: 'card tap', onclick: () => openUnit(app, u.id), 'aria-label': `${u.name}, details` }, unitSummary(s, u, { status: true, xp: true }))),
      ),
    );
  },
};

/** The detail sheet for one unit. */
export function openUnit(app, unitId) {
  app.openSheet('Constellation member', () => {
    const s = app.state;
    const u = s.units.find((x) => x.id === unitId);
    if (!u) return [h('p', { class: 'empty' }, 'They are no longer in the Stacks.')];
    const cls = classOf(u.archetype, u.path);
    const keepsake = s.keepsakes.find((k) => k.id === u.keepsakeId);
    const keepsakeDef = keepsake && KEEPSAKES.find((k) => k.id === keepsake.defId);
    const own = getTruth(s, u.truthId);
    const ownText = !own ? 'They carry no Truth of their own.'
      : own.state === 'hidden' ? 'Their own Truth is still unremembered. It surfaces after their first time in the fog.'
        : own.state === 'pending' ? `Remembered, waiting at the Archive: “${truthDef(own).text}”`
          : own.state === 'sealed' ? `Kept sealed: “${truthDef(own).text}”`
            : `Recorded by the Archive: “${truthDef(own).text}”`;
    const carried = s.truths.filter((t) => t.carrierId === u.id && t.state === 'sealed' && t.id !== u.truthId);
    return [
      unitSummary(s, u, { status: false, xp: true }),
      h('div', null, statusChip(s, u)),
      h('p', { class: 'small muted' }, `Named for ${u.noticed}. Level ${u.level} (${u.xp}/${xpToNext(u.level)} xp). ${u.missions ? `${plural(u.missions, 'mission')} so far.` : 'Has not been into the fog yet.'}`),
      h(
        'div',
        { class: 'card' },
        h('h3', null, `${cls.name} · ${ARCHETYPES[u.archetype].name} (${ARCHETYPES[u.archetype].role})`),
        h('p', { class: 'small' }, cls.blurb),
        h('dl', { class: 'kv' },
          h('dt', null, 'Path'), h('dd', null, `${PATHS[u.path].name}: ${PATHS[u.path].blurb}`),
          h('dt', null, 'Weapon'), h('dd', null, `${cls.weapon}${u.forgeTier ? `, forge tier ${u.forgeTier} (tuned by Brooklyn)` : ''}`),
          h('dt', null, 'Skill'), h('dd', null, `${cls.skill.name}: ${cls.skill.text}`),
          h('dt', null, 'Keepsake'), h('dd', null, keepsakeDef ? `${keepsakeDef.name}. ${keepsakeDef.text}` : 'None'),
        ),
      ),
      h('div', { class: 'card' }, h('h3', null, 'Their Truth'), h('p', { class: 'small' }, ownText), carried.length ? h('p', { class: 'small muted' }, `Also carrying ${plural(carried.length, 'sealed letter')} for others.`) : null),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => app.go('workshop', { unitId: u.id }) }, 'Forge and training')),
    ];
  });
}
