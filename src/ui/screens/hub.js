// The Stacks: the bell and the dock, Janice's board, and the goal.

import { h, icon, bar } from '../dom.js';
import { BALANCE } from '../../data/missions.js';
import { bellEstimate, freeBunks, takeIn } from '../../systems/ships.js';
import { clearedCount } from '../../systems/city.js';
import { pendingTruths } from '../../systems/truths.js';
import { keepWatch } from '../../systems/game.js';
import { isAvailable, unitStats } from '../../systems/roster.js';
import { classOf } from '../../data/classes.js';
import { announceEvents, missionCard, statsLine } from '../components.js';
import { archMark } from '../dom.js';
import { pickLine, speech, plural } from '../text.js';

export const hubScreen = {
  render(app) {
    const s = app.state;
    if (s.flags.v1Complete && !s.flags.endingSeen) {
      queueMicrotask(() => app.screen.id === 'hub' && app.go('ending'));
    }
    const [who, line] = pickLine('hub', s.watch);
    return h(
      'div',
      { class: 'stack' },
      h('h1', null, 'The Stacks'),
      speech(who, line),
      goalCard(s),
      lettersNotice(app),
      h('div', { class: 'grid2' }, dockSection(app), boardSection(app)),
      logSection(s),
    );
  },
};

function goalCard(s) {
  const cleared = clearedCount(s);
  const goal = BALANCE.goalDistricts;
  const est = bellEstimate(s);
  const intervals = s.ship.intervals.slice(-4);
  return h(
    'div',
    { class: 'card' },
    h(
      'div',
      { class: 'row spread' },
      h('strong', null, s.flags.v1Complete ? 'Morning has come. Hold the line.' : 'Hold the line until morning'),
      h('span', { class: 'small muted' }, `${Math.min(cleared, goal)}/${goal} districts clear`),
    ),
    bar(Math.min(1, cleared / goal), 'gold', 'Districts cleared'),
    h(
      'p',
      { class: 'small muted', style: { marginTop: '8px', marginBottom: 0 } },
      icon('bell'),
      ' ',
      est.exact
        ? `Janice follows the bell rope: the next bell rings at watch ${est.next}.`
        : `Janice expects the next bell between watch ${est.min} and ${est.max}.`,
      intervals.length ? ` Intervals logged: ${intervals.join(' · ')}.` : '',
    ),
  );
}

function lettersNotice(app) {
  const n = pendingTruths(app.state).length;
  if (!n) return null;
  return h(
    'button',
    { class: 'card tap warn', onclick: () => app.go('archive') },
    h('strong', null, icon('letter'), ` ${plural(n, 'Truth')} waiting at the Archive`),
    h('div', { class: 'small muted' }, 'Record it and the city changes, or keep it sealed. Tap to decide.'),
  );
}

function dockSection(app) {
  const s = app.state;
  const bunks = freeBunks(s);
  const items = s.dock.map((a) => {
    const cls = classOf(a.archetype, a.path);
    const left = a.holdUntil - s.watch;
    return h(
      'div',
      { class: 'card' },
      h(
        'div',
        { class: 'who' },
        archMark(a.archetype, a.path),
        h(
          'div',
          { class: 'grow' },
          h('div', { class: 'row spread' }, h('strong', null, a.name), h('span', { class: 'tiny muted' }, `Lv ${a.level}`)),
          h('div', { class: 'small muted' }, `${cls.name} · named for ${a.noticed}`),
          statsLine(unitStats(s, a)),
          h('div', { class: 'tiny', style: { marginTop: '4px', color: left <= 0 ? 'var(--danger)' : 'var(--thin)' } }, left <= 0 ? 'Fading. This is the last watch they can stand.' : `Can stand for ${plural(left + 1, 'more watch', 'more watches')}.`),
          h('p', { class: 'tiny dim', style: { margin: '2px 0 0' } }, 'Carries a Truth. They do not know how to say it yet.'),
        ),
      ),
      h(
        'button',
        {
          class: 'btn primary block',
          style: { marginTop: '8px' },
          disabled: bunks <= 0,
          onclick: () => {
            const r = takeIn(s, a.id);
            if (!r.ok) return app.toast(r.reason);
            const [, text] = pickLine('takeIn', a.id, { name: a.name });
            app.toast(text);
            app.commit();
          },
        },
        bunks > 0 ? 'Bring them up to the Stacks' : 'No free bunk',
      ),
    );
  });
  return h(
    'section',
    { class: 'section' },
    h('h2', null, icon('bell'), 'The dock'),
    h('p', { class: 'small muted' }, `Bunks: ${s.units.length}/${s.bunks}.`, bunks <= 0 ? ' Brooklyn can bolt on a new platform in the Workshop.' : ''),
    items.length ? h('div', { class: 'list' }, items) : h('p', { class: 'empty' }, 'No one is standing on the dock. The water is still.'),
  );
}

function boardSection(app) {
  const s = app.state;
  const ready = s.units.filter((u) => isAvailable(s, u)).length;
  const watch = () => {
    const events = keepWatch(s);
    app.commit();
    announceEvents(app, events);
  };
  return h(
    'section',
    { class: 'section' },
    h('h2', null, icon('fog'), "Janice's board"),
    h('p', { class: 'small muted' }, `${plural(ready, 'unit')} ready. A watch passes when a squad returns.`),
    s.missions.length
      ? h('div', { class: 'list' }, s.missions.map((m) => missionCard(s, m, () => app.go('briefing', { missionId: m.id }))))
      : h('p', { class: 'empty' }, 'Nothing on the board. Keep watch.'),
    h('button', { class: 'btn block', style: { marginTop: '10px' }, onclick: watch }, 'Keep watch (let a watch pass)'),
  );
}

function logSection(s) {
  return h(
    'details',
    { class: 'section' },
    h('summary', null, 'Ledger: recent events'),
    h('ul', { class: 'log' }, s.log.slice(0, 12).map((l) => h('li', null, h('span', { class: 'w' }, `w${l.w}`), l.text))),
  );
}
