// Tiny DOM helpers. Screens build elements with h() instead of a framework.

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Create an element. Props: `class`, `style` (object or string), `on*`
 * listeners, `aria-*`/`data-*`/other attributes, and boolean attributes
 * (`disabled: true`). Children may be strings, nodes, arrays, or falsy.
 * @param {string} tag
 * @param {Record<string, any> | null} [props]
 * @param {...any} children
 * @returns {HTMLElement}
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  applyProps(el, props);
  append(el, children);
  return el;
}

function applyProps(el, props) {
  if (!props) return;
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') el.setAttribute('class', value);
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
}

export function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false || child === '') continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

/** An icon from the SVG sprite in index.html. */
export function icon(name, label) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'icon');
  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

/** Parse trusted SVG markup we generated ourselves into a node. */
export function svgFromString(markup) {
  const tpl = document.createElement('template');
  tpl.innerHTML = markup.trim();
  return /** @type {SVGElement} */ (tpl.content.firstElementChild);
}

export const PATH_COLORS = { none: '#a3afc0', tech: '#7cc8ec', magic: '#f0b26b', hybrid: '#c4a8ff' };

/** SVG path data for each archetype's mark, in a 0..36 box. */
export const ARCH_PATHS = {
  shard: 'M18 4 L30 11 L30 25 L18 32 L6 25 L6 11 Z',
  trace: 'M18 3 L25 18 L18 33 L11 18 Z',
  axis: 'M18 6 A12 12 0 1 1 17.99 6 Z M18 2 V34 M2 18 H34',
  remnant: 'M18 9 A3.5 3.5 0 1 1 17.99 9 Z M9 24 A3.5 3.5 0 1 1 8.99 24 Z M27 24 A3.5 3.5 0 1 1 26.99 24 Z M18 12.5 L9 20.5 M18 12.5 L27 20.5 M12.5 24 H23.5',
};

/** A small badge for a unit: archetype shape, colored by path. */
export function archMark(archetype, path, label) {
  const color = PATH_COLORS[path] || PATH_COLORS.none;
  const filled = archetype === 'shard' || archetype === 'trace';
  return svgFromString(
    `<svg class="mark" viewBox="0 0 36 36" ${label ? `role="img" aria-label="${escapeAttr(label)}"` : 'aria-hidden="true"'}>` +
      `<path d="${ARCH_PATHS[archetype]}" fill="${filled ? color : 'none'}" fill-opacity="${filled ? 0.85 : 0}" stroke="${color}" stroke-width="2.2" stroke-linejoin="round"/>` +
      `</svg>`,
  );
}

export const escapeAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** A thin progress bar; `value` is 0..1. */
export function bar(value, cls = '', label) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return h('div', { class: `bar ${cls}`, role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': label }, h('i', { style: { width: `${pct}%` } }));
}

/** Remove all children. */
export function clear(el) {
  while (el.firstChild) el.firstChild.remove();
  return el;
}
