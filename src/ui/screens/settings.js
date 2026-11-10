// Settings: sound, motion, battle speed, storage status, reset.

import { h, icon } from '../dom.js';
import { SAVE_VERSION } from '../../core/save.js';

export const settingsScreen = {
  back: 'hub',
  render(app) {
    const s = app.state;
    if (!s) return h('div', { class: 'pad' }, h('h1', null, 'Settings'), h('button', { class: 'btn', onclick: () => app.go('title') }, 'Back'));
    const set = (key, value) => {
      s.settings[key] = value;
      app.commit();
    };
    const seg = (key, options) =>
      h('div', { class: 'seg', role: 'group' }, options.map(([value, label]) => h('button', { class: 'btn', 'aria-pressed': String(s.settings[key] === value), onclick: () => set(key, value) }, label)));
    const reset = () =>
      app.openSheet('Reset progress?', (close) => [
        h('p', null, 'This erases your saved game: the roster, the city, every Truth. It cannot be undone.'),
        h(
          'div',
          { class: 'row' },
          h('button', { class: 'btn danger', onclick: () => { app.saver.clear(); close(); app.store.set(null); app.go('title'); } }, 'Erase and return to title'),
          h('button', { class: 'btn', onclick: close }, 'Cancel'),
        ),
      ]);
    return h(
      'div',
      { class: 'stack' },
      h('div', { class: 'row' }, h('button', { class: 'btn ghost icon-only', 'aria-label': 'Back', onclick: () => app.go('hub') }, icon('back')), h('h1', { style: { margin: 0 } }, 'Settings')),
      h('div', { class: 'card stack' }, h('h2', null, 'Sound'), h('p', { class: 'small muted' }, 'The ship\'s bell.'), seg('sound', [[true, 'On'], [false, 'Off']])),
      h('div', { class: 'card stack' }, h('h2', null, 'Motion'), h('p', { class: 'small muted' }, 'Auto follows your device\'s reduced-motion setting.'), seg('motion', [['auto', 'Auto'], ['reduce', 'Reduced']])),
      h('div', { class: 'card stack' }, h('h2', null, 'Battle speed'), seg('speed', [[1, '1×'], [2, '2×'], [4, '4×']])),
      h(
        'div',
        { class: 'card stack' },
        h('h2', null, 'Progress'),
        h('p', { class: 'small muted' }, app.saver.persistent ? 'Saved automatically in this browser after every action.' : 'Storage is unavailable here, so progress lasts only until you close the page.'),
        h('p', { class: 'tiny dim' }, `Save format v${SAVE_VERSION} · run seed ${s.seed}`),
        h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => app.go('intro') }, 'Replay intro'), h('button', { class: 'btn', onclick: () => app.go('title') }, 'Title screen'), h('button', { class: 'btn danger', onclick: reset }, 'Reset progress')),
      ),
      h('p', { class: 'tiny dim' }, 'Keys: 1–5 switch sections · Esc goes back · in battle, Space pauses, F changes speed, S skips.'),
    );
  },
};
