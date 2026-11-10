// Parts of the Stacks open step by step so a new game starts small.
// An unlock is earned from progress alone (stats only grow), so old saves
// open whatever they have already earned. Only "has the intro card been
// seen" is stored: state.unlocksSeen.
//
// The beats, in the order they usually happen:
//   1. First mission back  -> the Archive (the squad remembers their Truths)
//   2. First Truth recorded -> the city map (it shows what the Truth changed);
//      a player who only seals gets it after mission 4
//   3. Second mission back -> the Roster
//   4. Third mission back  -> the Workshop (forge and training)
// The Stacks (dock and Janice's board) and Settings are always open.

/** @type {{id: string, label: string, intro: string, earned: (s: any) => boolean}[]} */
export const UNLOCKS = [
  { id: 'archive', label: 'The Archive', intro: 'Your squad came back remembering. At the Archive you decide what each Truth does.', earned: (s) => s.stats.missions >= 1 },
  { id: 'city', label: 'The city map', intro: 'Recorded Truths and pushed-back fog change Nouveau. The map shows it.', earned: (s) => s.stats.recorded >= 1 || s.stats.missions >= 4 },
  { id: 'roster', label: 'The Roster', intro: 'Everyone in the Stacks. Tap a member to see their full stats.', earned: (s) => s.stats.missions >= 2 },
  { id: 'workshop', label: 'The Workshop', intro: 'Spend salvage and resonance here: sharper weapons, more bunks, new paths.', earned: (s) => s.stats.missions >= 3 },
];

const ALWAYS = new Set(['hub', 'settings']);

/** Whether a section (tab id) is open. Unknown ids are open. */
export function isUnlocked(state, id) {
  if (ALWAYS.has(id)) return true;
  const u = UNLOCKS.find((x) => x.id === id);
  return !u || u.earned(state);
}

/** Ids of every earned unlock. */
export function earnedUnlocks(state) {
  return UNLOCKS.filter((u) => u.earned(state)).map((u) => u.id);
}

/** The next earned unlock whose intro card hasn't been seen, or null. */
export function nextUnlockCard(state) {
  const seen = state.unlocksSeen || [];
  return UNLOCKS.find((u) => u.earned(state) && !seen.includes(u.id)) || null;
}

export function markUnlockSeen(state, id) {
  if (!state.unlocksSeen) state.unlocksSeen = [];
  if (!state.unlocksSeen.includes(id)) state.unlocksSeen.push(id);
}
