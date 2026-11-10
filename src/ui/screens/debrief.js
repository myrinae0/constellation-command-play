// Janice's debrief: outcome, fog, materials, squad, what was found, and what
// happened at the Stacks while the squad was out.

import { h, icon, bar } from '../dom.js';
import { KEEPSAKES } from '../../data/gear.js';
import { MISSION_TYPES } from '../../data/missions.js';
import { districtDef } from '../../systems/city.js';
import { getTruth, truthDef } from '../../systems/truths.js';
import { announceEvents, eventText, materials, truthHeader } from '../components.js';
import { pickLine, speech } from '../text.js';

export const debriefScreen = {
  tab: 'hub',
  back: 'hub',
  render(app, params) {
    const s = app.state;
    const report = params.report || s.lastReport;
    if (!report) return h('div', { class: 'stack' }, h('h1', null, 'Debrief'), h('p', { class: 'empty' }, 'No missions yet.'), h('button', { class: 'btn', onclick: () => app.go('hub') }, 'Back'));
    if (!params.announced && report.events) {
      params.announced = true;
      queueMicrotask(() => announceEvents(app, report.events.filter((e) => e.type === 'bell')));
    }
    const d = districtDef(report.district);
    const victory = report.outcome === 'victory';
    const thinned = report.squad.filter((x) => x.thinned);
    const lineKey = report.fog?.cleared ? 'debrief.cleared' : victory ? 'debrief.victory' : 'debrief.retreat';
    const [who, line] = pickLine(lineKey, report.missionId, { district: d.name });
    const nUnits = s.units;

    const found = [];
    for (const id of report.found.truths) {
      const t = getTruth(s, id);
      if (!t) continue;
      const carrier = nUnits.find((u) => u.id === t.carrierId);
      found.push(h('div', { class: `card ${truthDef(t).weight === 'heavy' ? 'heavy' : ''}` }, h('div', { class: 'small muted' }, `A lost Truth, lying in the street.${carrier ? ` ${carrier.name} carried it home.` : ''}`), truthHeader(t)));
    }
    for (const id of report.found.keepsakes) {
      const k = KEEPSAKES.find((x) => x.id === id);
      found.push(h('div', { class: 'card' }, h('strong', null, icon('forge'), ` ${k.name}`), h('p', { class: 'small muted', style: { margin: '4px 0 0' } }, `${k.text} Brooklyn can retune it in the Workshop.`)));
    }
    if (report.found.rescued.length) {
      found.push(h('div', { class: 'card' }, h('strong', null, icon('roster'), ` Rescued: ${report.found.rescued.join(', ')}`), h('p', { class: 'small muted', style: { margin: '4px 0 0' } }, 'Brought up to the Stacks, or waiting on the dock if the bunks are full.')));
    }
    const remembered = report.remembered.map((id) => {
      const t = getTruth(s, id);
      const unit = nUnits.find((u) => u.id === t?.carrierId);
      if (!t) return null;
      const [, text] = pickLine('remembered', id, { name: unit ? unit.name : 'Someone' });
      return h('div', { class: `card ${truthDef(t).weight === 'heavy' ? 'heavy' : ''}` }, h('p', { class: 'small muted' }, text), truthHeader(t));
    });
    const anyLetters = report.found.truths.length || report.remembered.length;

    return h(
      'div',
      { class: 'stack' },
      h('h1', null, victory ? 'Debrief: the fog gave ground' : 'Debrief: called back'),
      h('p', { class: 'muted', style: { margin: 0 } }, `${MISSION_TYPES[report.type].name} · ${d.name}`),
      speech(who, line),
      report.fog
        ? h(
            'div',
            { class: 'card' },
            h('div', { class: 'row spread' }, h('strong', null, icon('fog'), ` Fog in ${d.name}`), h('span', { class: 'small' }, `${report.fog.before}% → ${report.fog.after}%`)),
            bar(report.fog.after / 100, '', `Fog in ${d.name}`),
            report.fog.cleared ? h('p', { class: 'small', style: { color: 'var(--accent)', margin: '6px 0 0' } }, `${d.name} is clear. Look at the city map.`) : null,
          )
        : null,
      h('div', { class: 'card' }, h('h3', null, 'Brought home'), materials(report.materials)),
      h(
        'div',
        { class: 'card' },
        h('h3', null, 'The squad'),
        h(
          'ul',
          { class: 'log' },
          report.squad.map((x) =>
            h(
              'li',
              null,
              h('strong', { style: { color: 'var(--text)' } }, x.name),
              ` +${x.xp} xp`,
              x.levels ? h('span', { class: 'chip good', style: { marginLeft: '6px' } }, `Level up${x.levels > 1 ? ` ×${x.levels}` : ''}`) : null,
              x.held ? ' · their sealed letter held them together' : '',
              x.thinned ? h('span', { class: 'chip thin', style: { marginLeft: '6px' } }, 'Thinned · needs rest') : null,
            ),
          ),
        ),
        thinned.length ? speech(...pickLine('debrief.thinned', report.missionId, { name: thinned[0].name })) : null,
      ),
      found.length ? h('section', { class: 'stack' }, h('h2', null, 'Found in the fog'), found) : null,
      remembered.length ? h('section', { class: 'stack' }, h('h2', null, icon('letter'), ' Remembered'), remembered) : null,
      report.events?.length ? h('details', { open: true }, h('summary', null, 'Meanwhile, at the Stacks'), h('ul', { class: 'log' }, report.events.map((e) => h('li', null, eventText(e))))) : null,
      h(
        'div',
        { class: 'row' },
        report.clearedGoal ? h('button', { class: 'btn primary grow', onclick: () => app.go('ending') }, 'Morning comes') : null,
        anyLetters ? h('button', { class: `btn ${report.clearedGoal ? '' : 'primary'} grow`, onclick: () => app.go('archive') }, icon('letter'), 'To the Archive') : null,
        h('button', { class: `btn grow ${anyLetters || report.clearedGoal ? '' : 'primary'}`, onclick: () => app.go('hub') }, 'Back to the Stacks'),
      ),
    );
  },
};
