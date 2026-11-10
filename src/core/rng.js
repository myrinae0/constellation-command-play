// Deterministic, serializable pseudo-random numbers.
//
// Everything random in the game (arrivals, missions, battles) goes through
// these helpers so a run can be replayed from its seed and tests are exact.

/**
 * @typedef {Object} Rng
 * @property {() => number} next            float in [0, 1)
 * @property {(min: number, max: number) => number} int   integer in [min, max]
 * @property {(min: number, max: number) => number} float float in [min, max)
 * @property {(p: number) => boolean} chance true with probability p
 * @property {<T>(list: T[]) => T} pick      one element (undefined for [])
 * @property {<T>(list: T[], weight: (item: T) => number) => T} weighted
 * @property {<T>(list: T[]) => T[]} shuffle  a shuffled copy
 */

/**
 * An Rng whose 32-bit state lives in `holder[key]`, so it can sit inside the
 * saved game state and continue exactly where it stopped after a reload.
 * Algorithm: mulberry32 (small, fast, good enough for games).
 * @param {Record<string, any>} holder
 * @param {string} key
 * @returns {Rng}
 */
export function rngOver(holder, key) {
  holder[key] = (holder[key] >>> 0);
  const next = () => {
    const s = (holder[key] + 0x6d2b79f5) >>> 0;
    holder[key] = s;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return wrap(next);
}

/**
 * A standalone Rng from a numeric seed.
 * @param {number} seed
 * @returns {Rng & {readonly state: number}}
 */
export function createRng(seed) {
  const box = { s: seed >>> 0 };
  const rng = rngOver(box, 's');
  return Object.defineProperty(rng, 'state', { get: () => box.s });
}

/**
 * Hash any mix of strings and numbers into a 32-bit seed (FNV-1a).
 * Used to derive stable sub-seeds, e.g. one per mission or per district.
 * @param {...(string|number)} parts
 */
export function hashSeed(...parts) {
  let h = 0x811c9dc5;
  const text = parts.join('|');
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** @param {() => number} next @returns {Rng} */
function wrap(next) {
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    float: (min, max) => min + next() * (max - min),
    chance: (p) => next() < p,
    pick: (list) => list[Math.floor(next() * list.length)],
    weighted(list, weight) {
      const total = list.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
      if (total <= 0) return list[0];
      let roll = next() * total;
      for (const item of list) {
        roll -= Math.max(0, weight(item));
        if (roll < 0) return item;
      }
      return list[list.length - 1];
    },
    shuffle(list) {
      const copy = list.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}
