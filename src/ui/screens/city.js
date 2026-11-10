// The city map. Recorded Truths show up here: districts clear, bridges fall,
// fountains and streets appear.

import { h, svgFromString, bar, icon } from '../dom.js';
import { DISTRICTS, FEATURES, LIGHTHOUSE } from '../../data/districts.js';
import { districtLevel } from '../../systems/city.js';
import { truthDef } from '../../systems/truths.js';
import { cityMapSvg } from '../cityMap.js';
import { missionCard } from '../components.js';

export const cityScreen = {
  render(app, params) {
    const s = app.state;
    const selected = params.focus || params.selected || null;
    const select = (id) => {
      params.focus = null;
      params.selected = id;
      app.refresh();
    };
    const map = svgFromString(cityMapSvg(s, { selected, reduced: app.reducedMotion() }));
    map.addEventListener('click', (e) => {
      const g = /** @type {Element} */ (e.target).closest('[data-district]');
      if (g) select(g.getAttribute('data-district'));
    });
    map.addEventListener('keydown', (e) => {
      const g = /** @type {Element} */ (e.target).closest('[data-district]');
      if (g && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        select(g.getAttribute('data-district'));
      }
    });
    const fresh = s.city.fresh.length;
    const el = h(
      'div',
      { class: 'stack' },
      h('h1', null, 'Nouveau'),
      h('p', { class: 'small muted' }, 'Tap a district. Fog lifts as squads push it back, and the city changes shape when the Archive records a Truth.'),
      fresh ? h('p', { class: 'notice small' }, 'New on the map since you last looked: highlighted.') : null,
      h('div', { class: 'city-layout' }, h('div', { class: 'map-wrap' }, map), h('div', { class: 'stack' }, detail(app, selected), districtList(s, select))),
    );
    return {
      el,
      // Highlights show once; clear them quietly when leaving the map.
      cleanup(leaving) {
        if (leaving && s.city.fresh.length) {
          s.city.fresh = [];
          app.saver.save(s);
        }
      },
    };
  },
};

function detail(app, id) {
  const s = app.state;
  if (id === 'lighthouse') {
    return h('div', { class: 'card' }, h('h2', null, LIGHTHOUSE.name), h('p', { class: 'small' }, LIGHTHOUSE.blurb), h('p', { class: 'tiny dim' }, 'Not reachable yet.'));
  }
  const d = DISTRICTS.find((x) => x.id === id);
  if (!d) return h('div', { class: 'card small muted' }, 'Select a district for details.');
  const ds = s.districts[id];
  const features = [
    ...s.city.features.filter((f) => FEATURES[f]?.district === id).map((f) => FEATURES[f].label),
    ...s.city.extra.filter((f) => f.district === id).map((f) => `A lamp: ${f.label.toLowerCase()}`),
  ];
  const truths = s.truths.filter((t) => t.state === 'recorded' && truthDef(t).district === id);
  const missions = s.missions.filter((m) => m.district === id);
  return h(
    'div',
    { class: 'card stack' },
    h('div', { class: 'row spread' }, h('h2', { style: { margin: 0 } }, d.name), h('span', { class: `chip ${ds.fog === 0 ? 'accent' : ''}` }, ds.fog === 0 ? '★ Clear' : `Fog ${ds.fog}%`)),
    bar(ds.fog / 100, '', `Fog in ${d.name}`),
    h('p', { class: 'small' }, d.blurb),
    h('p', { class: 'tiny muted' }, `Danger here now: ${districtLevel(s, id)}${ds.threatMod ? ` (${ds.threatMod < 0 ? 'safer' : 'harder'} because of a Truth)` : ''}. Creatures: ${[...new Set(d.enemies)].length} kinds, and ${d.boss.name} at the end.`),
    features.length ? h('div', null, h('h3', null, 'On the map'), h('ul', { class: 'small', style: { margin: 0, paddingLeft: '18px' } }, features.map((f) => h('li', null, f)))) : null,
    truths.length ? h('div', null, h('h3', null, 'Truths recorded here'), truths.map((t) => h('p', { class: 'quote small' }, `“${truthDef(t).text}”`))) : null,
    missions.length ? h('div', { class: 'list' }, h('h3', null, icon('fog'), ' On the board here'), missions.map((m) => missionCard(s, m, () => app.go('briefing', { missionId: m.id })))) : null,
  );
}

function districtList(s, select) {
  return h(
    'details',
    null,
    h('summary', null, 'All districts'),
    h(
      'div',
      { class: 'list' },
      DISTRICTS.map((d) =>
        h('button', { class: 'btn block', style: { justifyContent: 'space-between' }, onclick: () => select(d.id) }, h('span', null, d.name), h('span', { class: 'small muted' }, s.districts[d.id].fog === 0 ? '★ clear' : `fog ${s.districts[d.id].fog}%`)),
      ),
    ),
  );
}
