// Janice's debrief: outcome, fog, materials, squad, what was found, and what
// happened at the Stacks while the squad was out.

import { h, icon, bar } from '../dom.js';
import { KEEPSAKES } from '../../data/gear.js';
import { MISSION_TYPES } from '../../data/missions.js';
import { districtDef } from '../../systems/city.js';
import { getTruth, truthDef } from '../../systems/truths.js';
import { announceEvents, eventText, materials } from '../components.js';
import { isUnlocked } from '../../systems/unlocks.js';
import { pickLine, speech, plural } from '../text.js';

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
    // One line from the cast: about whoever needs rest, if anyone does.
    const [who, line] = thinned.length && !report.fog?.cleared
      ? pickLine('debrief.thinned', report.missionId, { name: thinned[0].name })
      : pickLine(lineKey, report.missionId, { district: d.name });
    const nUnits = s.units;

    const found = [];
    for (const id of report.found.truths) {
      const t = getTruth(s, id);
      if (!t) continue;
      const carrier = nUnits.find((u) => u.id === t.carrierId);
      found.push(h('li', null, `A lost Truth${carrier ? `, carried home by ${carrier.name}` : ''}.`));
    }
    for (const id of report.found.keepsakes) {
      const k = KEEPSAKES.find((x) => x.id === id);
      found.push(h('li', null, `A keepsake: ${k.name}.`));
    }
    if (report.found.rescued.length) found.push(h('li', null, `Rescued: ${report.found.rescued.join(', ')}.`));
    const remembered = report.remembered.map((id) => getTruth(s, id)).filter(Boolean);
    const lettersOpen = isUnlocked(s, 'archive');
    const anyLetters = (report.found.truths.length || report.remembered.length) && lettersOpen;
    const newLetters = report.found.truths.length + remembered.length;

    return h(
      'div',
      { class: 'stack' },
      h('h1', null, victory ? 'Debrief: the fog gave ground' : 'Debrief: called back'),
      h('p', { class: 'muted', style: { margin: 0 } }, `${MISSION_TYPES[report.type].name} · ${d.name}`),
      speech(who, line),
      h(
        'div',
        { class: 'card stack', 'data-tut': 'outcome' },
        report.fog
          ? h(
              'div',
              null,
              h('div', { class: 'row spread', style: { marginBottom: '6px' } }, h('strong', null, icon('fog'), ` Fog in ${d.name}`), h('span', { class: 'small' }, `${report.fog.before}% → ${report.fog.after}%`)),
              bar(report.fog.after / 100, '', `Fog in ${d.name}`),
              report.fog.cleared ? h('p', { class: 'small', style: { color: 'var(--accent)', margin: '6px 0 0' } }, `${d.name} is clear.`) : null,
            )
          : null,
        materials(report.materials),
      ),
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
              { class: 'row spread' },
              h('span', null, h('strong', { style: { color: 'var(--text)' } }, x.name), ` +${x.xp} xp`),
              h(
                'span',
                { class: 'row' },
                x.levels ? h('span', { class: 'chip good' }, `Level up${x.levels > 1 ? ` ×${x.levels}` : ''}`) : null,
                x.held ? h('span', { class: 'chip accent', title: 'Their sealed letter held them together' }, 'Held') : null,
                x.thinned ? h('span', { class: 'chip thin' }, 'Needs rest') : null,
              ),
            ),
          ),
        ),
      ),
      found.length ? h('div', { class: 'card' }, h('h3', null, 'Found in the fog'), h('ul', { class: 'small', style: { margin: 0, paddingLeft: '18px' } }, found)) : null,
      newLetters && lettersOpen
        ? h(
            'details',
            { class: 'card warn' },
            h('summary', null, icon('letter'), ` ${plural(newLetters, 'Truth')} to decide at the Archive`),
            [...report.found.truths.map((id) => getTruth(s, id)).filter(Boolean), ...remembered].map((t) => {
              const carrier = nUnits.find((u) => u.id === t.carrierId);
              return h('p', { class: 'small', style: { margin: '0 0 8px' } }, h('span', { class: 'muted' }, `${carrier ? carrier.name : 'Someone'}: `), h('span', { class: 'quote' }, `“${truthDef(t).text}”`));
            }),
          )
        : null,
      report.events?.length ? h('details', null, h('summary', null, 'Meanwhile, at the Stacks'), h('ul', { class: 'log' }, report.events.map((e) => h('li', null, eventText(e))))) : null,
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
