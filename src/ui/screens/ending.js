// The v1 goal: morning comes to Nouveau. Then endless play.

import { h } from '../dom.js';
import { LINES } from '../../data/dialogue.js';
import { speech } from '../text.js';
import { BALANCE } from '../../data/missions.js';

export const endingScreen = {
  render(app) {
    const s = app.state;
    const st = s.stats;
    const keeperLine =
      st.recorded >= st.sealed * 2
        ? 'The keepers have filled a new ledger. The city has changed shape around everything you let them write.'
        : st.sealed > st.recorded
          ? 'The keepers notice how many letters Constellation still carries. The Archive does not judge. It remembers what it is given.'
          : 'Spoken and kept, in roughly equal measure. The keepers set out clean paper either way.';
    const close = () => {
      s.flags.endingSeen = true;
      app.commit();
      app.go('hub');
    };
    return h(
      'div',
      { class: 'stack', style: { maxWidth: '640px', margin: '0 auto' } },
      h('h1', null, 'Morning'),
      h('p', { class: 'muted' }, `${BALANCE.goalDistricts} districts of Nouveau are clear of fog.`),
      LINES.ending.map(([who, text]) => speech(who, text)),
      speech('keeper', keeperLine),
      h(
        'div',
        { class: 'card' },
        h(
          'dl',
          { class: 'kv' },
          h('dt', null, 'Missions'), h('dd', null, `${st.missions} (${st.victories} pushed through, ${st.retreats} called back)`),
          h('dt', null, 'Thinned'), h('dd', null, `${st.thinnings} times. Lost: none. Everyone came back.`),
          h('dt', null, 'Truths'), h('dd', null, `${st.recorded} spoken, ${st.sealed} kept sealed`),
          h('dt', null, 'Arrivals'), h('dd', null, `${st.takenIn} brought up, ${st.rescued} rescued, ${st.faded} faded`),
          h('dt', null, 'Incense'), h('dd', null, `${st.incense} sticks burned by the water`),
          h('dt', null, 'Watches'), h('dd', null, `${s.watch}`),
        ),
      ),
      h('p', { class: 'small muted' }, 'The bell keeps ringing. From here the fog can creep back into cleared districts, and the creatures grow stronger the deeper you go. Play on as long as you like.'),
      h('button', { class: 'btn primary block', onclick: close }, 'Keep holding the line'),
    );
  },
};
