// ?debug=<screen>&seed=<n>: jump straight to a screen with a seeded,
// partly-played game. Used for screenshots and quick checks. The state lives
// in memory only (see main.js), so a real save is never touched.
//
// Screens: title, intro, hub, squad, battle, debrief, city, archive, roster,
// workshop, settings, ending.
// New-player states:
//   tutorial&step=<dock|board|squad|battle|debrief>  the guided first run
//   newgame                       a new game with the tutorial skipped (only the Stacks)
//   unlock&what=<archive|city|roster|workshop>  that section just opened (intro card)

import { newGame, deployMission, keepWatch } from './systems/game.js';
import { autoSquad, assessOdds } from './systems/missions.js';
import { freeBunks, takeIn } from './systems/ships.js';
import { createTruth, pendingTruths, recordTruth, sealTruth } from './systems/truths.js';
import { forgeCost, forgeUpgrade } from './systems/forge.js';
import { mentorCost, raiseMentor, train, trainingOptions } from './systems/training.js';
import { canAfford } from './systems/economy.js';
import { KEEPSAKES } from './data/gear.js';
import { newId } from './core/state.js';
import { TUTORIAL_STEPS, skipTutorial } from './systems/tutorial.js';
import { UNLOCKS } from './systems/unlocks.js';
import { openUnit } from './ui/screens/roster.js';

/** Play `missions` missions with simple choices. */
export function autoplay(state, missions) {
  for (let i = 0, guard = 0; i < missions && guard < 200; guard++) {
    for (const a of [...state.dock]) if (freeBunks(state) > 0) takeIn(state, a.id);
    pendingTruths(state).forEach((t, n) => (n % 3 === 2 ? sealTruth(state, t.id) : recordTruth(state, t.id)));
    for (const m of ['yue', 'chen']) {
      const c = mentorCost(state, m);
      if (c && state.mentors[m] < 1 && canAfford(state, c)) raiseMentor(state, m);
    }
    for (const u of state.units) {
      const o = trainingOptions(state, u).find((x) => x.ok && canAfford(state, x.cost));
      if (o) train(state, u.id, o.path);
    }
    for (const u of state.units) {
      const c = forgeCost(state, u);
      if (c && u.forgeTier < 2 && canAfford(state, c)) forgeUpgrade(state, u.id);
    }
    const squad = autoSquad(state);
    const mission = state.missions.slice().sort((a, b) => assessOdds(state, b, squad).ratio - assessOdds(state, a, squad).ratio)[0];
    if (squad.length < 3 || !mission) {
      keepWatch(state);
      continue;
    }
    deployMission(state, mission.id, squad);
    i++;
  }
  return state;
}

/** Add Truths by id as pending letters (carried by the first unit). */
function letters(state, ids) {
  const have = new Set(state.truths.map((t) => t.defId));
  return ids.filter((defId) => !have.has(defId)).map((defId) => {
    if (!state.usedTruths.includes(defId)) state.usedTruths.push(defId);
    return createTruth(state, { defId }, { carrierId: state.units[0].id, origin: 'lost', state: 'pending' });
  });
}

export function runDebug(app, screen, seed) {
  if (screen === 'title') return app.go('title');
  const params = new URLSearchParams(location.search);
  if (screen === 'tutorial' || screen === 'newgame') return newPlayer(app, screen, seed, params.get('step') || 'dock');
  if (screen === 'unlock') return unlockState(app, seed, params.get('what') || 'archive');
  const state = newGame(seed);
  state.flags.introSeen = true;
  state.settings.sound = false;
  if (screen === 'intro') {
    app.store.set(state);
    return app.go('intro');
  }
  autoplay(state, screen === 'ending' ? 30 : 8);
  state.unlocksSeen = UNLOCKS.map((u) => u.id);
  // A keepsake or two for the forge screen.
  for (const def of KEEPSAKES.slice(0, 2)) {
    if (!state.keepsakes.some((k) => k.defId === def.id)) state.keepsakes.push({ id: newId(state, 'k'), defId: def.id, unitId: null });
  }
  app.store.set(state);

  switch (screen) {
    case 'squad':
    case 'briefing':
      return app.go('briefing', { missionId: state.missions[0].id });
    case 'battle':
    case 'debrief': {
      const squad = autoSquad(state);
      const mission = state.missions.find((m) => m.type === 'push') || state.missions[0];
      const result = deployMission(state, mission.id, squad);
      if ('error' in result) throw new Error(result.error);
      app.store.set(state);
      return screen === 'battle'
        ? app.go('battle', { battle: result.battle, report: result.report, missionTitle: 'Push back the fog', seek: Number(new URLSearchParams(location.search).get('at')) || 0 })
        : app.go('debrief', { report: result.report });
    }
    case 'city': {
      // Record a few Truths so the map visibly changes.
      for (const t of letters(state, ['hidden-fountain', 'ninth-bridge', 'canal-lanterns', 'marlow-lane', 'dock-lamps'])) recordTruth(state, t.id);
      app.store.set(state);
      return app.go('city', { focus: 'canals' });
    }
    case 'archive':
      letters(state, ['ninth-bridge', 'linden']);
      app.store.set(state);
      return app.go('archive');
    case 'ending':
      state.flags.v1Complete = true;
      return app.go('ending');
    case 'roster':
      app.go('roster');
      // ?debug=roster&sheet=1 opens the first member's detail sheet.
      if (new URLSearchParams(location.search).get('sheet')) openUnit(app, app.state.units[0].id);
      return;
    default:
      return app.go(app.screen && screen in { hub: 1, workshop: 1, settings: 1 } ? screen : 'hub');
  }
}

/** A brand-new game, guided (at a given tutorial step) or with the tutorial skipped. */
function newPlayer(app, screen, seed, step) {
  const state = newGame(seed, { tutorial: true });
  state.flags.introSeen = true;
  state.settings.sound = false;
  app.store.set(state);
  if (screen === 'newgame') {
    skipTutorial(state);
    return app.go('hub');
  }
  state.tutorial.step = Math.max(0, TUTORIAL_STEPS.indexOf(step));
  const mission = state.missions.find((m) => m.tutorial) || state.missions[0];
  if (step === 'squad') return app.go('briefing', { missionId: mission.id });
  if (step === 'battle' || step === 'debrief') {
    const result = deployMission(state, mission.id, autoSquad(state));
    if ('error' in result) throw new Error(result.error);
    app.store.set(state);
    return step === 'battle'
      ? app.go('battle', { battle: result.battle, report: result.report, missionTitle: 'Push back the fog · The Dock', seek: Number(params().get('at')) || 0 })
      : app.go('debrief', { report: result.report });
  }
  return app.go('hub');
}

const params = () => new URLSearchParams(location.search);

/** Play just far enough to earn `what`, with its intro card not yet seen. */
function unlockState(app, seed, what) {
  const state = newGame(seed, { tutorial: true });
  state.flags.introSeen = true;
  state.settings.sound = false;
  skipTutorial(state);
  const order = UNLOCKS.map((u) => u.id);
  const missions = { archive: 1, city: 1, roster: 2, workshop: 3 }[what] ?? 1;
  autoplay(state, missions);
  if (what === 'city' && !state.stats.recorded) {
    const t = pendingTruths(state)[0];
    if (t) recordTruth(state, t.id);
  }
  state.unlocksSeen = order.filter((id) => id !== what && UNLOCKS.find((u) => u.id === id).earned(state));
  app.store.set(state);
  return app.go('hub');
}
