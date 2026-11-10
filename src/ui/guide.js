// Tutorial tips and unlock cards. Screens mark the elements a tip points at
// with data-tut="<name>"; after each render the guide puts one short card
// next to that element and highlights it. One card at a time: a tutorial
// tip if a step is active here, otherwise the intro card of a new unlock.

import { h } from './dom.js';
import { TUTORIAL_STEPS, advanceTutorial, finishTutorial, reachTutorial, skipTutorial, tutorialStep } from '../systems/tutorial.js';
import { isUnlocked, markUnlockSeen, nextUnlockCard } from '../systems/unlocks.js';

/**
 * Tips per step and screen. `at` is the data-tut anchor (falls back to the
 * next one listed), `place` puts the card before or after it, `also`
 * highlights another element.
 */
const TIPS = {
  dock: { hub: { at: ['take-in', 'dock'], place: 'after', text: 'A ship left someone on the dock. Bring them up to the Stacks before they fade.' } },
  board: { hub: { at: ['mission'], place: 'before', text: "This is Janice's board. Tap the first mission to plan it." } },
  squad: {
    briefing: { at: ['slots'], place: 'after', also: 'deploy', text: 'Janice already picked a squad of three. Tap a name to swap someone, then tap Deploy.' },
    hub: { at: ['mission'], place: 'before', text: 'Tap the first mission to plan it.' },
  },
  battle: { battle: { at: ['controls'], place: 'after', text: 'The fight plays itself. Pause, change the speed, or skip to the end here.' } },
  debrief: { debrief: { at: ['outcome'], place: 'after', text: 'What the squad brought home. No one is ever lost: hurt members just rest for a while.' } },
};

/** Entering these screens moves the tutorial along. */
const ENTRY = { briefing: 'squad', battle: 'battle', debrief: 'debrief' };

/**
 * @param {any} app
 * @param {{screenEl: HTMLElement, tabsEl: HTMLElement}} els
 */
export function createGuide(app, { screenEl, tabsEl }) {
  const save = () => app.saver.save(app.state);

  function clearGuide() {
    for (const el of document.querySelectorAll('.tip')) el.remove();
    for (const el of document.querySelectorAll('.tut-target')) el.classList.remove('tut-target');
  }

  function apply() {
    clearGuide();
    const s = app.state;
    if (!s || !s.tutorial) return;
    const screen = app.screen.id;
    if (ENTRY[screen] && reachTutorial(s, ENTRY[screen])) save();
    // Back at the Stacks after the debrief: the guided run is over.
    if (screen === 'hub' && tutorialStep(s) === 'debrief' && finishTutorial(s)) save();
    const step = tutorialStep(s);
    if (step) {
      const tip = TIPS[step]?.[screen];
      if (tip) showTip(step, tip);
      return;
    }
    const unlock = nextUnlockCard(s);
    if (unlock && !app.screenDef?.full) showUnlock(unlock, screen);
  }

  function anchor(names) {
    for (const n of names) {
      const el = screenEl.querySelector(`[data-tut="${n}"]`);
      if (el) return el;
    }
    return null;
  }

  function showTip(step, tip) {
    const target = anchor(tip.at);
    if (!target) return;
    const s = app.state;
    const n = TUTORIAL_STEPS.indexOf(step);
    const last = n === TUTORIAL_STEPS.length - 1;
    const card = h(
      'div',
      { class: `tip ${tip.place === 'before' ? 'up' : 'down'}`, role: 'note', 'aria-label': 'Tutorial tip' },
      h('div', { class: 'tiny dim' }, `Tip ${n + 1} of ${TUTORIAL_STEPS.length}`),
      h('p', null, tip.text),
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn primary', 'data-tip': 'next', onclick: () => { advanceTutorial(s); save(); apply(); } }, last ? 'Done' : 'Got it'),
        last ? null : h('button', { class: 'btn ghost', 'data-tip': 'skip', onclick: () => { skipTutorial(s); save(); apply(); } }, 'Skip tutorial'),
      ),
    );
    target.classList.add('tut-target');
    if (tip.also) screenEl.querySelector(`[data-tut="${tip.also}"]`)?.classList.add('tut-target');
    target.insertAdjacentElement(tip.place === 'before' ? 'beforebegin' : 'afterend', card);
  }

  function showUnlock(unlock, screen) {
    const s = app.state;
    const done = () => {
      markUnlockSeen(s, unlock.id);
      save();
      app.refresh();
    };
    const card = h(
      'div',
      { class: 'tip unlock', role: 'note', 'aria-label': 'Newly opened' },
      h('p', null, h('strong', null, `New: ${unlock.label}. `), unlock.intro),
      h(
        'div',
        { class: 'row' },
        screen !== unlock.id && isUnlocked(s, unlock.id)
          ? h('button', { class: 'btn primary', onclick: () => { markUnlockSeen(s, unlock.id); save(); app.go(unlock.id); } }, `Open ${unlock.label.replace(/^The /, 'the ')}`)
          : null,
        h('button', { class: `btn ${screen === unlock.id ? 'primary' : 'ghost'}`, 'data-tip': 'next', onclick: done }, 'Got it'),
      ),
    );
    const first = screenEl.firstElementChild;
    const heading = first?.querySelector('h1');
    // Right under the screen's title row.
    const row = heading && heading.parentElement !== first ? heading.parentElement : heading;
    if (row) row.insertAdjacentElement('afterend', card);
    else first?.prepend(card);
    tabsEl.querySelector(`[data-tab="${unlock.id}"]`)?.classList.add('tut-target');
  }

  return { apply };
}
