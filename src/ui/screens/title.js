// Title screen: continue, new game, settings.

import { h, svgFromString } from '../dom.js';
import { newGame } from '../../systems/game.js';

export const titleScreen = {
  full: true,
  render(app) {
    const hasSave = app.saver.hasSave();
    const start = () => {
      const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
      app.store.set(newGame(seed, { tutorial: true }));
      app.commit();
      app.go('intro');
    };
    const confirmNew = () =>
      app.openSheet('Start over?', (close) => [
        h('p', null, 'Starting a new game replaces your saved progress. This cannot be undone.'),
        h('div', { class: 'row' }, h('button', { class: 'btn danger', onclick: () => (close(), start()) }, 'Start a new game'), h('button', { class: 'btn', onclick: close }, 'Keep my save')),
      ]);
    const cont = () => {
      const result = app.saver.load();
      if (!result.ok) {
        app.toast(`Couldn't load the save: ${result.error}.`);
        return;
      }
      app.store.set(result.state);
      app.go(result.state.flags.introSeen ? 'hub' : 'intro');
    };
    return h(
      'div',
      { class: 'title-screen' },
      svgFromString('<svg class="logo" viewBox="0 0 512 512" aria-hidden="true"><path d="M188 400V214l28-18v204M240 400V150l32-20v270M296 400V230l28-18v188" fill="none" stroke="#c9d3e2" stroke-width="14" stroke-linejoin="round"/><g fill="#e8c77d"><circle cx="256" cy="92" r="12"/><circle cx="150" cy="132" r="7"/><circle cx="368" cy="122" r="8"/></g><path d="M150 132 256 92 368 122" fill="none" stroke="#e8c77d" stroke-width="3" opacity=".6"/></svg>'),
      h('div', { class: 'sub' }, 'Nouveau · The Stacks'),
      h('h1', null, 'Constellation Command'),
      h('p', { class: 'muted quote' }, 'Everyone comes back.'),
      h(
        'div',
        { class: 'menu' },
        hasSave ? h('button', { class: 'btn primary', onclick: cont }, 'Continue') : null,
        h('button', { class: `btn ${hasSave ? '' : 'primary'}`, onclick: hasSave ? confirmNew : start }, 'New game'),
        hasSave ? h('button', { class: 'btn ghost', onclick: () => app.go('settings') }, 'Settings') : null,
      ),
      !app.saver.persistent && !app.debug
        ? h('p', { class: 'notice small', style: { marginTop: '24px', textAlign: 'left', maxWidth: '360px' } }, 'This browser is blocking storage, so progress will not be saved after you close the page.')
        : null,
    );
  },
};
