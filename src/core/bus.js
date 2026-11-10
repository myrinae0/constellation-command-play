// A tiny publish/subscribe event bus. Systems stay UI-agnostic: the UI
// listens for events (bell rang, truth recorded) instead of systems calling
// the UI directly.

/**
 * @typedef {Object} Bus
 * @property {(type: string, fn: (payload?: any) => void) => () => void} on  returns an unsubscribe function
 * @property {(type: string, payload?: any) => void} emit
 */

/** @returns {Bus} */
export function createBus() {
  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();
  return {
    on(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
      return () => listeners.get(type)?.delete(fn);
    },
    emit(type, payload) {
      for (const fn of [...(listeners.get(type) || [])]) {
        try {
          fn(payload);
        } catch (err) {
          // One broken listener shouldn't stop the others.
          console.error(`bus listener for "${type}" failed`, err);
        }
      }
    },
  };
}
