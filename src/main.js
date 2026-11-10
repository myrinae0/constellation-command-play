// Entry point: wire the store, saver and screens together, then show the
// title (or a debug state when the URL has ?debug=<screen>).

import { createBus } from './core/bus.js';
import { createSaver, detectStorage } from './core/save.js';
import { createNewState, createStore } from './core/state.js';
import { createApp } from './ui/app.js';
import { titleScreen } from './ui/screens/title.js';
import { introScreen } from './ui/screens/intro.js';
import { hubScreen } from './ui/screens/hub.js';
import { briefingScreen } from './ui/screens/briefing.js';
import { battleScreen } from './ui/screens/battle.js';
import { debriefScreen } from './ui/screens/debrief.js';
import { archiveScreen } from './ui/screens/archive.js';
import { cityScreen } from './ui/screens/city.js';
import { rosterScreen } from './ui/screens/roster.js';
import { workshopScreen } from './ui/screens/workshop.js';
import { settingsScreen } from './ui/screens/settings.js';
import { endingScreen } from './ui/screens/ending.js';

/** To add a screen: write it in ui/screens and register it here. */
export const SCREENS = {
  title: titleScreen,
  intro: introScreen,
  hub: hubScreen,
  briefing: briefingScreen,
  battle: battleScreen,
  debrief: debriefScreen,
  archive: archiveScreen,
  city: cityScreen,
  roster: rosterScreen,
  workshop: workshopScreen,
  settings: settingsScreen,
  ending: endingScreen,
};

const params = new URLSearchParams(location.search);
const debug = params.get('debug');

const bus = createBus();
// Debug runs keep their state in memory so they never touch a real save.
const saver = createSaver({ storage: debug ? null : detectStorage(window), defaults: () => createNewState(1) });
const store = createStore({ saver, bus });
const app = createApp({ store, bus, saver, screens: SCREENS, debug: !!debug });

if (debug) {
  import('./debug.js')
    .then((m) => m.runDebug(app, debug, Number(params.get('seed')) || 7))
    .catch((err) => window.__reportError?.(`debug: ${err && err.stack}`));
} else {
  app.go('title');
}

// Every action already saves; this covers closing the tab mid-screen.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && store.state) saver.save(store.state);
});
