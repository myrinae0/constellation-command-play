// Versioned save/load on localStorage, with a migration hook and a graceful
// in-memory fallback when storage is blocked (private mode, disabled cookies,
// sandboxed iframes).
//
// Adding a field: just add it to createNewState(). Missing fields in older
// saves are filled from defaults on load (fillDefaults), no migration needed.
// Renaming or reshaping a field: bump SAVE_VERSION and add a migration below.

export const SAVE_KEY = 'constellation-command/save';
export const SAVE_VERSION = 1;

/**
 * Migrations from version N to N+1. Each receives the old save and a context
 * with `defaults()` (a fresh state) and returns the upgraded save.
 * @type {Record<number, (save: any, ctx: {defaults: () => any}) => any>}
 */
export const MIGRATIONS = {
  // Version 0 = a save written before versioning (or a hand-edited one).
  // Keep what it has; fillDefaults() supplies the rest.
  0: (save) => ({ ...save, version: 1 }),
};

/**
 * Bring a parsed save up to `target`. Never throws.
 * @param {any} data
 * @param {{defaults: () => any, migrations?: typeof MIGRATIONS, target?: number}} opts
 * @returns {{ok: true, state: any, from: number} | {ok: false, error: string}}
 */
export function migrate(data, { defaults, migrations = MIGRATIONS, target = SAVE_VERSION }) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'not a save object' };
  }
  const from = Number.isInteger(data.version) ? data.version : 0;
  if (from > target) {
    return { ok: false, error: `save is from a newer version (${from} > ${target})` };
  }
  let save = data;
  try {
    for (let v = from; v < target; v++) {
      const step = migrations[v];
      if (!step) return { ok: false, error: `no migration from version ${v}` };
      save = step(save, { defaults });
      save.version = v + 1;
    }
    return { ok: true, state: fillDefaults(save, defaults()), from };
  } catch (err) {
    return { ok: false, error: `migration failed: ${err && err.message}` };
  }
}

/**
 * Recursively copy keys that exist in `defaults` but are missing in `save`.
 * Arrays and non-plain values in the save win as-is.
 * @template T
 * @param {any} save
 * @param {T} defaults
 * @returns {T}
 */
export function fillDefaults(save, defaults) {
  if (!isPlainObject(save) || !isPlainObject(defaults)) return save;
  for (const key of Object.keys(defaults)) {
    if (!(key in save)) save[key] = defaults[key];
    else if (isPlainObject(save[key]) && isPlainObject(defaults[key])) {
      fillDefaults(save[key], defaults[key]);
    }
  }
  return save;
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Return a usable Storage, or null when writing is blocked.
 * @param {any} scope  usually `window`
 * @returns {Storage | null}
 */
export function detectStorage(scope) {
  try {
    const storage = scope.localStorage;
    const probe = '__cc_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/** A Storage-like object kept in memory (used when real storage is blocked). */
export function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
}

/**
 * @param {{storage: Storage | null, defaults: () => any, key?: string}} opts
 */
export function createSaver({ storage, defaults, key = SAVE_KEY }) {
  const persistent = !!storage;
  const store = storage || memoryStorage();
  return {
    /** True when saves survive a reload. */
    persistent,
    hasSave() {
      try {
        return store.getItem(key) !== null;
      } catch {
        return false;
      }
    },
    /** @returns {{ok: true, state: any, from: number} | {ok: false, error: string}} */
    load() {
      let raw;
      try {
        raw = store.getItem(key);
      } catch (err) {
        return { ok: false, error: 'storage read failed' };
      }
      if (raw === null) return { ok: false, error: 'no save' };
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { ok: false, error: 'save is corrupted' };
      }
      return migrate(parsed, { defaults });
    },
    /** @returns {boolean} whether the write succeeded */
    save(state) {
      try {
        store.setItem(key, JSON.stringify({ ...state, version: SAVE_VERSION }));
        return true;
      } catch {
        // Quota exceeded or storage revoked mid-session: keep playing.
        return false;
      }
    },
    clear() {
      try {
        store.removeItem(key);
      } catch {
        /* nothing to clear */
      }
    },
  };
}
