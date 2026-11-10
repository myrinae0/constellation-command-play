// Character lines and small text helpers for the UI.

import { CHARACTERS } from '../data/characters.js';
import { LINES } from '../data/dialogue.js';
import { hashSeed } from '../core/rng.js';
import { h } from './dom.js';

/** Replace {tokens} in a line. */
export function fill(text, vars = {}) {
  return text.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? vars[key] : m));
}

/**
 * Pick a line for a moment. Stable for the same `salt`, so re-renders don't
 * shuffle what a character just said.
 * @returns {[string, string]} [characterId, text]
 */
export function pickLine(key, salt = 0, vars = {}) {
  const list = LINES[key] || [];
  if (!list.length) return ['narrator', ''];
  const [who, text] = list[hashSeed(key, salt) % list.length];
  return [who, fill(text, vars)];
}

/** A portrait badge for a cast member. */
export function portrait(who) {
  const c = CHARACTERS[who];
  if (!c) return h('div', { class: 'portrait', style: { background: '#3a4a60', color: '#e6ebf2' }, 'aria-hidden': 'true' }, '·');
  return h('div', { class: 'portrait', style: { background: c.color }, 'aria-hidden': 'true' }, c.glyph);
}

/** A speaker line block: portrait, name, text. */
export function speech(who, text) {
  const c = CHARACTERS[who];
  return h(
    'div',
    { class: 'line' },
    portrait(who),
    h('div', { class: 'grow' }, c ? h('div', { class: 'speaker' }, `${c.name} · ${c.title}`) : null, h('p', null, text)),
  );
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
