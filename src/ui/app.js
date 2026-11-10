// The app shell: which screen is showing, the top bar and tabs, modal sheets,
// toasts, and keyboard shortcuts. Screens are plain objects:
//   { render(app, params) -> Element | {el, cleanup}, full?, static?, tab? }
// `full` hides the top bar and tabs; `static` screens manage their own
// updates (the battle) and are not re-rendered on every state change.

import { h, icon, clear } from './dom.js';
import { pendingTruths } from '../systems/truths.js';
import { bellEstimate } from '../systems/ships.js';

export const TABS = [
  { id: 'hub', label: 'Stacks', icon: 'stacks' },
  { id: 'roster', label: 'Roster', icon: 'roster' },
  { id: 'city', label: 'City', icon: 'map' },
  { id: 'archive', label: 'Archive', icon: 'archive' },
  { id: 'workshop', label: 'Workshop', icon: 'forge' },
];

/**
 * @param {{store: any, bus: import('../core/bus.js').Bus, saver: any, screens: Record<string, any>, debug?: boolean}} deps
 */
export function createApp({ store, bus, saver, screens, debug = false }) {
  const root = document.getElementById('app');
  const screenEl = document.getElementById('screen');
  const topbar = document.getElementById('topbar');
  const tabsEl = document.getElementById('tabs');
  const toastsEl = document.getElementById('toasts');
  const sheetRoot = document.getElementById('sheet-root');

  let current = { id: 'title', params: {} };
  let cleanup = null;
  let sheet = null; // {render, title, panel, restoreFocus}

  const app = {
    store,
    bus,
    saver,
    debug,
    get state() {
      return store.state;
    },
    get screen() {
      return current;
    },
    /** Show a screen. */
    go(id, params = {}) {
      if (!screens[id]) throw new Error(`unknown screen ${id}`);
      closeSheet();
      current = { id, params };
      render(false);
      const heading = screenEl.querySelector('h1');
      (heading || screenEl).setAttribute('tabindex', '-1');
      (heading || screenEl).focus({ preventScroll: true });
    },
    /** Re-render the current screen, keeping its scroll position. */
    refresh() {
      render(true);
    },
    /** Save and re-render after a state change. */
    commit() {
      store.commit();
    },
    toast,
    openSheet,
    closeSheet,
    reducedMotion() {
      return store.state?.settings?.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
    },
  };

  bus.on('state', () => {
    applySettings();
    if (!screens[current.id]?.static) render(true);
    else renderChrome();
    if (sheet) renderSheet();
  });

  function applySettings() {
    document.documentElement.classList.toggle('reduce-motion', store.state?.settings?.motion === 'reduce');
  }

  function render(keepScroll) {
    const screen = screens[current.id];
    root.dataset.screen = current.id;
    root.classList.toggle('full', !!screen.full);
    renderChrome();
    const scroll = keepScroll ? screenEl.scrollTop : 0;
    // cleanup(leaving): true when navigating away, false on a re-render.
    cleanup?.(!keepScroll);
    cleanup = null;
    clear(screenEl);
    try {
      const out = screen.render(app, current.params);
      const el = out instanceof Node ? out : out.el;
      cleanup = out instanceof Node ? null : out.cleanup || null;
      screenEl.append(el);
    } catch (err) {
      console.error(err);
      window.__reportError?.(`render ${current.id}: ${err && err.stack}`);
      screenEl.append(h('div', { class: 'pad' }, h('h1', null, 'Something went wrong'), h('p', { class: 'muted' }, String(err && err.message)), h('button', { class: 'btn', onclick: () => app.go('hub') }, 'Back to the Stacks')));
    }
    screenEl.scrollTop = scroll;
  }

  function renderChrome() {
    const state = store.state;
    clear(topbar);
    clear(tabsEl);
    if (!state || screens[current.id]?.full) return;
    const est = bellEstimate(state);
    const bellText = est.exact ? `bell at ${est.next}` : est.min === est.max ? `bell ~${est.min}` : `bell ${est.min}–${est.max}`;
    topbar.append(
      h('div', { class: 'watch' }, `Watch ${state.watch}`),
      h('div', { class: 'tiny dim', title: 'When Janice expects the next ship' }, icon('bell'), ' ', bellText),
      h(
        'div',
        { class: 'res' },
        h('span', { class: 'salvage', title: 'Salvage' }, icon('salvage', 'Salvage'), state.res.salvage),
        h('span', { class: 'resonance', title: 'Resonance' }, icon('resonance', 'Resonance'), state.res.resonance),
      ),
      h('button', { class: 'btn ghost icon-only', 'aria-label': 'Settings', onclick: () => app.go('settings') }, icon('settings')),
    );
    const activeTab = screens[current.id]?.tab || current.id;
    const letters = pendingTruths(state).length;
    for (const tab of TABS) {
      const badge = tab.id === 'archive' && letters ? h('span', { class: 'badge', 'aria-label': `${letters} waiting` }, letters) : null;
      tabsEl.append(
        h(
          'button',
          { class: 'tab', 'aria-current': activeTab === tab.id ? 'page' : null, onclick: () => app.go(tab.id) },
          icon(tab.icon),
          h('span', null, tab.label),
          badge,
        ),
      );
    }
  }

  function toast(text, kind = '') {
    const el = h('div', { class: `toast ${kind}` }, text);
    toastsEl.append(el);
    while (toastsEl.children.length > 3) toastsEl.firstChild.remove();
    setTimeout(() => el.remove(), 4000);
  }

  /**
   * Open a modal sheet. `renderBody(close)` returns its content and is
   * called again when the state changes while it's open.
   */
  function openSheet(title, renderBody) {
    closeSheet();
    const restoreFocus = document.activeElement;
    const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    const backdrop = h('div', { class: 'sheet-backdrop', onclick: (e) => e.target === backdrop && closeSheet() }, panel);
    sheet = { title, renderBody, panel, backdrop, restoreFocus };
    renderSheet();
    sheetRoot.append(backdrop);
    (panel.querySelector('.sheet-body button, .sheet-body select') || panel.querySelector('button'))?.focus();
    return closeSheet;
  }

  function renderSheet() {
    if (!sheet) return;
    const { panel, title, renderBody } = sheet;
    clear(panel);
    panel.append(
      h('div', { class: 'sheet-head' }, h('h2', null, title), h('button', { class: 'btn ghost icon-only', 'aria-label': 'Close', onclick: closeSheet }, icon('close'))),
      h('div', { class: 'sheet-body stack' }, renderBody(closeSheet)),
    );
  }

  function closeSheet() {
    if (!sheet) return;
    sheet.backdrop.remove();
    const focus = sheet.restoreFocus;
    sheet = null;
    if (focus && document.contains(focus)) focus.focus({ preventScroll: true });
  }

  document.addEventListener('keydown', (e) => {
    const tag = /** @type {HTMLElement} */ (e.target).tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape') {
      if (sheet) return closeSheet();
      const back = screens[current.id]?.back;
      if (back) app.go(back);
      return;
    }
    if (!sheet && store.state && !screens[current.id]?.full && /^[1-5]$/.test(e.key)) {
      app.go(TABS[Number(e.key) - 1].id);
    }
  });

  applySettings();
  return app;
}
