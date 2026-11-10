// The auto-battle, replayed on a canvas with a text log beside it.
// The result is already applied to the save before this screen opens, so
// leaving or skipping never changes the outcome.

import { h, icon } from '../dom.js';
import { createBattleView } from '../battleView.js';

const SPEEDS = [1, 2, 4];

export const battleScreen = {
  full: true,
  static: true,
  render(app, params) {
    const { battle, report, missionTitle } = params;
    if (!battle) {
      queueMicrotask(() => app.go('hub'));
      return h('div', { class: 'pad' }, h('h1', null, 'No battle in progress'));
    }
    const sides = new Map(battle.cast.map((c) => [c.id, c.side]));
    let speed = SPEEDS.includes(app.state.settings.speed) ? app.state.settings.speed : 1;

    const canvas = h('canvas', { role: 'img', 'aria-label': 'The squad and the creatures in the fog. The log below describes each action.' });
    const log = h('ol', { class: 'battle-log', role: 'log', 'aria-label': 'Battle log' });
    const playBtn = h('button', { class: 'btn icon-only', 'aria-label': 'Pause' }, icon('pause'));
    const speedBtn = h('button', { class: 'btn', 'aria-label': 'Change speed' }, `${speed}×`);
    const skipBtn = h('button', { class: 'btn' }, icon('skip'), 'Skip');
    const debriefBtn = h('button', { class: 'btn primary block', hidden: true, onclick: () => app.go('debrief', { report }) }, 'Debrief with Janice');

    const view = createBattleView(canvas, {
      battle,
      reduced: app.reducedMotion(),
      speed,
      onEvent(i, ev) {
        const cls = ev.type === 'end' ? 'end' : sides.get(ev.actor) === 'ally' ? 'ally' : '';
        const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
        log.append(h('li', { class: cls }, ev.text));
        if (nearBottom) log.scrollTop = log.scrollHeight;
      },
      onEnd() {
        playBtn.disabled = true;
        skipBtn.disabled = true;
        debriefBtn.hidden = false;
        debriefBtn.focus({ preventScroll: true });
      },
    });

    const togglePlay = () => {
      if (view.finished) return;
      if (view.playing) view.pause();
      else view.play();
      playBtn.replaceChildren(icon(view.playing ? 'pause' : 'play'));
      playBtn.setAttribute('aria-label', view.playing ? 'Pause' : 'Play');
    };
    const cycleSpeed = () => {
      speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
      view.setSpeed(speed);
      speedBtn.textContent = `${speed}×`;
      app.state.settings.speed = speed;
      app.saver.save(app.state);
    };
    const skip = () => view.skip();
    playBtn.addEventListener('click', togglePlay);
    speedBtn.addEventListener('click', cycleSpeed);
    skipBtn.addEventListener('click', skip);

    const onKey = (e) => {
      if (e.target.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return; // let buttons work
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'f' || e.key === 'F') cycleSpeed();
      else if (e.key === 's' || e.key === 'S') skip();
      else if (e.key === 'Enter' && view.finished) app.go('debrief', { report });
    };
    document.addEventListener('keydown', onKey);
    if (params.seek) {
      // Debug: show a fixed moment of the battle, paused.
      view.seek(params.seek);
      playBtn.replaceChildren(icon('play'));
      playBtn.setAttribute('aria-label', 'Play');
    } else queueMicrotask(() => view.play());

    const el = h(
      'div',
      { class: 'battle' },
      h('div', { class: 'head' }, h('h1', { style: { fontSize: '1rem', margin: 0 }, class: 'grow' }, missionTitle || 'Into the fog'), h('span', { class: 'chip' }, `Danger ${report.level}`)),
      canvas,
      h('div', { class: 'controls' }, playBtn, speedBtn, skipBtn, h('span', { class: 'tiny dim grow', style: { textAlign: 'right' } }, 'Everyone comes back.')),
      log,
      h('div', { class: 'foot' }, debriefBtn),
    );
    return {
      el,
      cleanup() {
        document.removeEventListener('keydown', onKey);
        view.destroy();
      },
    };
  },
};
