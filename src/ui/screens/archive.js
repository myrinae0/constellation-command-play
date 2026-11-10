// The Archive: decide each Truth. Record it (the city changes, permanently)
// or keep it sealed (its carrier is strengthened and held together).

import { h, icon } from '../dom.js';
import { PLAYER_LETTER } from '../../data/truths.js';
import { canRecord, canSeal, pendingTruths, recordTruth, sealTruth, truthDef } from '../../systems/truths.js';
import { truthHeader } from '../components.js';
import { pickLine, speech, plural } from '../text.js';

const STAT_NAMES = { hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD' };
const statText = (stats) => Object.entries(stats).map(([k, v]) => `+${v} ${STAT_NAMES[k]}`).join(', ');

export const archiveScreen = {
  render(app) {
    const s = app.state;
    const pending = pendingTruths(s);
    const sealed = s.truths.filter((t) => t.state === 'sealed');
    const recorded = s.truths.filter((t) => t.state === 'recorded');
    const hidden = s.truths.filter((t) => t.state === 'hidden' && s.units.some((u) => u.id === t.carrierId));
    const [who, line] = pickLine(pending.length ? 'seal' : 'record', s.stats.recorded + s.stats.sealed);

    return h(
      'div',
      { class: 'stack' },
      h('div', { class: 'row spread' }, h('h1', { style: { margin: 0 } }, 'The Archive'), h('span', { class: 'small muted' }, `${s.stats.recorded} spoken · ${sealed.length} kept · ${hidden.length} unremembered`)),
      speech(who, line),
      h(
        'section',
        { class: 'stack' },
        h('h2', null, icon('letter'), ' Waiting for a decision'),
        pending.length ? pending.map((t) => decisionCard(app, t)) : h('p', { class: 'empty' }, 'No letters waiting. Arrivals remember their Truth after their first time in the fog.'),
      ),
      h(
        'section',
        { class: 'section stack' },
        h('h2', null, 'Kept sealed'),
        sealed.length
          ? h('div', { class: 'list cols' }, sealed.map((t) => sealedCard(app, t)))
          : h('p', { class: 'empty' }, 'Constellation carries no sealed letters yet.'),
      ),
      h('details', { class: 'section' }, h('summary', null, 'Your own letter'), h('p', { class: 'quote small' }, PLAYER_LETTER.text)),
      h(
        'details',
        { class: 'section' },
        h('summary', null, `The ledger: ${plural(recorded.length, 'Truth')} recorded`),
        recorded.length
          ? h('ul', { class: 'log' }, recorded.slice().reverse().map((t) => h('li', null, h('span', { class: 'w' }, `w${t.decidedWatch}`), `“${truthDef(t).text}”`)))
          : h('p', { class: 'empty' }, 'Clean paper.'),
      ),
    );
  },
};

function carrierText(s, t) {
  const carrier = s.units.find((u) => u.id === t.carrierId);
  if (!carrier) return 'Its carrier is gone. Someone in the Stacks would carry it.';
  return t.origin === 'arrival' ? `${carrier.name}'s own Truth.` : `Found in the fog. ${carrier.name} carries it.`;
}

function decisionCard(app, t) {
  const s = app.state;
  const def = truthDef(t);
  const heavy = def.weight === 'heavy';
  const carrier = s.units.find((u) => u.id === t.carrierId);
  const doRecord = () => {
    const result = recordTruth(s, t.id);
    if (!result.ok) return app.toast(result.reason);
    app.commit();
    showShift(app, def, result.changes, heavy);
  };
  const record = () => {
    if (!heavy) return doRecord();
    app.openSheet('Record a heavy Truth?', (close) => [
      h('p', { class: 'quote' }, `“${def.text}”`),
      h('p', null, def.record.note),
      h('p', { class: 'small muted' }, 'Once the Archive writes it, it cannot be unspoken.'),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => (close(), doRecord()) }, 'Record it'), h('button', { class: 'btn', onclick: close }, 'Not yet')),
    ]);
  };
  const seal = () => {
    const result = sealTruth(s, t.id);
    if (!result.ok) return app.toast(result.reason);
    const who = s.units.find((u) => u.id === result.carrierId);
    app.toast(`${who ? who.name : 'They'} will carry it like a sealed letter.`);
    app.commit();
  };
  return h(
    'div',
    { class: `card stack ${heavy ? 'heavy' : ''}` },
    truthHeader(t),
    h('p', { class: 'small muted', style: { margin: 0 } }, carrierText(s, t)),
    h(
      'div',
      { class: 'row choice' },
      h('button', { class: 'btn primary grow', disabled: !canRecord(t), onclick: record }, 'Record it'),
      h('button', { class: 'btn grow', disabled: !canSeal(t), onclick: seal }, 'Keep it sealed'),
    ),
    h(
      'details',
      null,
      h('summary', null, 'What each choice does'),
      h('p', { class: 'small' }, h('strong', null, 'Record: '), def.record.note, h('span', { class: 'dim' }, ' Permanent. The city map changes.')),
      h('p', { class: 'small', style: { margin: 0 } }, h('strong', null, 'Keep sealed: '), def.seal.note, h('span', { class: 'dim' }, ` ${carrier ? carrier.name : 'Its carrier'} gets ${statText(def.seal.stats)} and is held together once per battle. You can still record it later.`)),
    ),
  );
}

function sealedCard(app, t) {
  const s = app.state;
  const def = truthDef(t);
  const carrier = s.units.find((u) => u.id === t.carrierId);
  const open = () =>
    app.openSheet('Open a sealed letter?', (close) => [
      h('p', { class: 'quote' }, `“${def.text}”`),
      h('p', null, def.record.note),
      h('p', { class: 'small muted' }, `${carrier ? carrier.name : 'The carrier'} loses the letter's strength. The Archive's record is permanent.`),
      h(
        'div',
        { class: 'row' },
        h('button', {
          class: 'btn primary',
          onclick: () => {
            close();
            const result = recordTruth(s, t.id);
            if (!result.ok) return app.toast(result.reason);
            app.commit();
            showShift(app, def, result.changes, def.weight === 'heavy');
          },
        }, 'Record it now'),
        h('button', { class: 'btn', onclick: close }, 'Keep it sealed'),
      ),
    ]);
  return h(
    'div',
    { class: `card ${def.weight === 'heavy' ? 'heavy' : ''}` },
    h('p', { class: 'quote small', style: { margin: 0 } }, `“${def.text}”`),
    h('div', { class: 'row spread', style: { marginTop: '8px' } }, h('span', { class: 'tiny muted' }, `${carrier ? carrier.name : 'No one'} · ${statText(def.seal.stats)}`), h('button', { class: 'btn', onclick: open }, 'Open it')),
  );
}

/** "The city shifts": what changed, with a way to see it on the map. */
function showShift(app, def, changes, heavy) {
  const [who, line] = pickLine(heavy ? 'recordHeavy' : 'record', def.id);
  app.openSheet('The city shifts', (close) => [
    speech(who, line),
    changes.length ? h('ul', { class: 'small', style: { paddingLeft: '18px', margin: 0 } }, changes.map((c) => h('li', null, c))) : null,
    changes.length ? null : h('p', { class: 'small muted' }, def.record.note),
    h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => (close(), app.go('city', { focus: def.district })) }, icon('map'), 'See the map'), h('button', { class: 'btn', onclick: close }, 'Stay here')),
  ]);
}
