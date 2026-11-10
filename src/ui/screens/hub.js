// The Stacks: the dock, Janice's board, and the goal.

import { h, icon, bar, archMark } from '../dom.js';
import { BALANCE } from '../../data/missions.js';
import { freeBunks, takeIn } from '../../systems/ships.js';
import { clearedCount } from '../../systems/city.js';
import { pendingTruths } from '../../systems/truths.js';
import { keepWatch } from '../../systems/game.js';
import { isAvailable } from '../../systems/roster.js';
import { reachTutorial } from '../../systems/tutorial.js';
import { isUnlocked } from '../../systems/unlocks.js';
import { classOf } from '../../data/classes.js';
import { announceEvents, missionCard } from '../components.js';
import { pickLine, speech, plural } from '../text.js';
import { openUnit } from './roster.js';

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
  return h(
    'div',
    { class: 'card' },
    h(
      'div',
      { class: 'row spread', style: { marginBottom: '8px' } },
      h('strong', null, s.flags.v1Complete ? 'Morning has come. Hold the line.' : 'Hold the line until morning'),
      h('span', { class: 'small muted' }, `${Math.min(cleared, goal)}/${goal} districts clear`),
    ),
    bar(Math.min(1, cleared / goal), 'gold', 'Districts cleared'),
  );
}

function lettersNotice(app) {
  const n = pendingTruths(app.state).length;
  if (!n || !isUnlocked(app.state, 'archive')) return null;
  return h(
    'button',
    { class: 'card tap warn row spread', onclick: () => app.go('archive') },
    h('strong', null, icon('letter'), ` ${plural(n, 'Truth')} waiting at the Archive`),
    h('span', { class: 'small muted' }, 'Decide'),
  );
}

function dockSection(app) {
  const s = app.state;
  const bunks = freeBunks(s);
  const items = s.dock.map((a, i) => {
    const cls = classOf(a.archetype, a.path);
    const left = a.holdUntil - s.watch;
    return h(
      'div',
      { class: 'card' },
      h(
        'button',
        { class: 'who plain', onclick: () => openUnit(app, a.id), 'aria-label': `${a.name}, details` },
        archMark(a.archetype, a.path),
        h(
          'div',
          { class: 'grow' },
          h('div', { class: 'row spread' }, h('strong', null, a.name), h('span', { class: 'tiny muted' }, `Lv ${a.level}`)),
          h(
            'div',
            { class: 'row spread' },
            h('span', { class: 'small muted' }, cls.name),
            h('span', { class: `chip ${left <= 0 ? 'danger' : 'thin'}` }, left <= 0 ? 'Fading' : `${plural(left + 1, 'watch', 'watches')} left`),
          ),
        ),
      ),
      bunks > 0
        ? h(
            'button',
            {
              class: 'btn primary block',
              style: { marginTop: '8px' },
              'data-tut': i === 0 ? 'take-in' : null,
              onclick: () => {
                const r = takeIn(s, a.id);
                if (!r.ok) return app.toast(r.reason);
                reachTutorial(s, 'board');
                const [, text] = pickLine('takeIn', a.id, { name: a.name });
                app.toast(text);
                app.commit();
              },
            },
            'Bring them up',
          )
        : null,
    );
  });
  return h(
    'section',
    { class: 'section', 'data-tut': 'dock' },
    h('h2', null, icon('bell'), 'The dock', h('span', { class: 'small muted push' }, `Bunks ${s.units.length}/${s.bunks}`)),
    bunks <= 0 && s.dock.length ? h('p', { class: 'small', style: { color: 'var(--thin)' } }, `No free bunk.${isUnlocked(s, 'workshop') ? ' Brooklyn can build more in the Workshop.' : ''}`) : null,
    items.length ? h('div', { class: 'list' }, items) : h('p', { class: 'empty' }, 'No one on the dock. The water is still.'),
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
    h('h2', null, icon('fog'), "Janice's board", h('span', { class: 'small muted push' }, `${ready} ready`)),
    s.missions.length
      ? h('div', { class: 'list' }, s.missions.map((m) => missionCard(s, m, () => app.go('briefing', { missionId: m.id }))))
      : h('p', { class: 'empty' }, 'Nothing on the board. Keep watch.'),
    h('button', { class: 'btn block', style: { marginTop: '10px' }, onclick: watch, title: 'Let a watch pass without sending anyone' }, 'Keep watch'),
  );
}

function logSection(s) {
  const intervals = s.ship.intervals.slice(-4);
  return h(
    'details',
    { class: 'section' },
    h('summary', null, 'Ledger: recent events'),
    intervals.length ? h('p', { class: 'tiny dim' }, `Watches between bells: ${intervals.join(' · ')}.`) : null,
    h('ul', { class: 'log' }, s.log.slice(0, 12).map((l) => h('li', null, h('span', { class: 'w' }, `w${l.w}`), l.text))),
  );
}
