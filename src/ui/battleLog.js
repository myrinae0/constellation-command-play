// The battle log under the canvas. Collapsed, it shows only the last few
// lines; tapping it (or the toggle) shows everything. Collapsing only hides
// lines, so the replay and the full text are never changed.

import { h } from './dom.js';

/** @param {{visible?: number}} [opts] */
export function createBattleLog({ visible = 3 } = {}) {
  let expanded = false;
  const list = h('ol', { class: 'battle-log collapsed', role: 'log', 'aria-label': 'Battle log', id: 'battle-log' });
  const toggle = h('button', { class: 'btn ghost log-toggle', 'aria-controls': 'battle-log', 'aria-expanded': 'false', hidden: true });

  function sync() {
    const items = list.children;
    const n = items.length;
    for (let i = 0; i < n; i++) /** @type {HTMLElement} */ (items[i]).hidden = !expanded && i < n - visible;
    list.classList.toggle('collapsed', !expanded);
    toggle.hidden = n <= visible;
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.textContent = expanded ? 'Show less' : `Show full log (${n})`;
  }

  const api = {
    el: h('div', { class: 'battle-log-wrap' }, list, toggle),
    list,
    toggle,
    get expanded() {
      return expanded;
    },
    /** Number of lines logged so far (hidden or not). */
    get count() {
      return list.children.length;
    },
    /** The lines a player can see right now. */
    visibleLines() {
      return [...list.children].filter((li) => !(/** @type {HTMLElement} */ (li).hidden)).map((li) => li.textContent);
    },
    append(text, cls = '') {
      const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
      list.append(h('li', { class: cls }, text));
      sync();
      if (!expanded || nearBottom) list.scrollTop = list.scrollHeight;
    },
    setExpanded(value) {
      expanded = !!value;
      sync();
      list.scrollTop = list.scrollHeight;
    },
  };
  toggle.addEventListener('click', () => api.setExpanded(!expanded));
  list.addEventListener('click', () => !expanded && list.children.length > visible && api.setExpanded(true));
  sync();
  return api;
}
