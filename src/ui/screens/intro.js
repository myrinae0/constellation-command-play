// The short, skippable intro: a ship's bell and a few lines.

import { h } from '../dom.js';
import { LINES } from '../../data/dialogue.js';
import { CHARACTERS } from '../../data/characters.js';
import { ringBell } from '../audio.js';

export const introScreen = {
  full: true,
  render(app) {
    let index = 0;
    const beat = h('div', { class: 'beat', 'aria-live': 'polite' });
    const finish = () => {
      document.removeEventListener('keydown', onKey);
      app.state.flags.introSeen = true;
      app.commit();
      app.go('hub');
    };
    const show = () => {
      const [who, text] = LINES.intro[index];
      beat.replaceChildren(
        h('div', { class: app.reducedMotion() ? '' : 'fade-in' }, who !== 'narrator' ? h('span', { class: 'speaker' }, CHARACTERS[who].name) : null, text),
      );
    };
    const next = () => {
      index++;
      if (index >= LINES.intro.length) finish();
      else show();
    };
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'Escape') finish();
    };
    document.addEventListener('keydown', onKey);
    if (app.state.settings.sound) ringBell();
    show();
    const el = h(
      'div',
      { class: 'intro', onclick: (e) => !e.target.closest('.skip') && next() },
      h('h1', { class: 'sr-only' }, 'Intro'),
      h('button', { class: 'btn ghost skip', onclick: finish }, 'Skip'),
      beat,
      h('p', { class: 'hint' }, 'Tap or press Enter to continue.'),
    );
    return { el, cleanup: () => document.removeEventListener('keydown', onKey) };
  },
};
