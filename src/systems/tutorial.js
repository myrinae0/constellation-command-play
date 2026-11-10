// The guided first run: one short tip per step, in the order a first mission
// happens. Pure state logic; ui/guide.js shows the tips.
//
// state.tutorial = { step: number, done: boolean }
//   step indexes TUTORIAL_STEPS. Old saves are migrated to done (core/save.js).

/** In play order. `screen` is where the tip shows. */
export const TUTORIAL_STEPS = /** @type {const} */ (['dock', 'board', 'squad', 'battle', 'debrief']);

/** Start (or restart) the tutorial at the first step. */
export function startTutorial(state) {
  state.tutorial = { step: 0, done: false };
}

/** The current step id, or null when the tutorial is finished or skipped. */
export function tutorialStep(state) {
  const t = state.tutorial;
  if (!t || t.done) return null;
  return TUTORIAL_STEPS[t.step] || null;
}

/**
 * Move forward to `step` (never back). Playing ahead of the tips, such as
 * opening a mission before taking anyone in, simply catches the tutorial up.
 * @returns {boolean} whether anything changed
 */
export function reachTutorial(state, step) {
  const t = state.tutorial;
  const target = TUTORIAL_STEPS.indexOf(step);
  if (!t || t.done || target < 0 || target <= t.step) return false;
  t.step = target;
  return true;
}

/** The "Next" / "Got it" button: the following step, or the end. */
export function advanceTutorial(state) {
  const t = state.tutorial;
  if (!t || t.done) return false;
  if (t.step >= TUTORIAL_STEPS.length - 1) return finishTutorial(state);
  t.step++;
  return true;
}

export function finishTutorial(state) {
  if (!state.tutorial || state.tutorial.done) return false;
  state.tutorial.done = true;
  return true;
}

/** "Skip tutorial": same as finishing it. */
export const skipTutorial = finishTutorial;

/** Settings → "Replay tutorial". The tips run again on the current game. */
export const replayTutorial = startTutorial;
