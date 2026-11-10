// The lower levels: Brooklyn's forge, and the Harmonic Division (Yue and Chen).

import { h, icon } from '../dom.js';
import { KEEPSAKES } from '../../data/gear.js';
import { BALANCE } from '../../data/missions.js';
import { canAfford, costText } from '../../systems/economy.js';
import { buildPlatform, forgeCost, forgeUpgrade, platformCost, retune, retuneCost } from '../../systems/forge.js';
import { harmonicDivision, HYBRID_RANK, MAX_MENTOR_RANK, mentorCost, PATH_LEVEL, raiseMentor, train, trainingOptions } from '../../systems/training.js';
import { isAvailable } from '../../systems/roster.js';
import { unitSummary } from '../components.js';
import { pickLine, speech } from '../text.js';

const STAT_NAMES = { hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD' };

export const workshopScreen = {
  render(app, params) {
    const s = app.state;
    const view = params.view || 'forge';
    const setView = (v) => {
      params.view = v;
      app.refresh();
    };
    return h(
      'div',
      { class: 'stack' },
      h('h1', null, 'Workshop'),
      h('div', { class: 'seg', role: 'tablist' },
        h('button', { class: 'btn', role: 'tab', 'aria-selected': String(view === 'forge'), 'aria-pressed': String(view === 'forge'), onclick: () => setView('forge') }, icon('forge'), 'Forge'),
        h('button', { class: 'btn', role: 'tab', 'aria-selected': String(view === 'train'), 'aria-pressed': String(view === 'train'), onclick: () => setView('train') }, icon('moon'), 'Training'),
      ),
      view === 'forge' ? forgeView(app, params) : trainingView(app, params),
    );
  },
};

/** Run an action; toast its failure reason or commit. */
const act = (app, fn, success) => {
  const r = fn();
  if (!r.ok) return app.toast(r.reason);
  if (success) app.toast(success);
  app.commit();
};

function forgeView(app, params) {
  const s = app.state;
  const [who, line] = pickLine('forge', s.watch);
  const pc = platformCost(s);
  const stash = s.keepsakes;
  const units = orderUnits(s, params.unitId);
  return h(
    'div',
    { class: 'stack' },
    speech(who, line),
    s.mods.forgeCost ? h('p', { class: 'tiny', style: { color: 'var(--thin)' } }, `Forge costs are ${s.mods.forgeCost > 0 ? 'up' : 'down'} ${Math.abs(s.mods.forgeCost)}% because of a Truth.`) : null,
    h(
      'div',
      { class: 'card row spread' },
      h('div', null, h('strong', null, 'A new platform'), h('div', { class: 'small muted' }, `+2 bunks (now ${s.units.length}/${s.bunks}). ${costText(pc)}.`)),
      h('button', { class: 'btn', disabled: !canAfford(s, pc), onclick: () => act(app, () => buildPlatform(s), '+2 bunks.') }, 'Build'),
    ),
    h('h2', null, 'Weapons, tuned to their owners'),
    h('p', { class: 'small muted' }, `Each tier adds ${Math.round(BALANCE.forgeBonus * 100)}% HP, ATK and DEF, up to tier ${BALANCE.forgeMaxTier}. The tuning stays when they change path.`),
    h(
      'div',
      { class: 'list cols' },
      units.map((u) => {
        const cost = forgeCost(s, u);
        return h(
          'div',
          { class: 'card stack' },
          unitSummary(s, u, { status: false }),
          h(
            'div',
            { class: 'row spread' },
            h('span', { class: 'small muted' }, cost ? `Tier ${u.forgeTier} → ${u.forgeTier + 1}: ${costText(cost)}` : 'Tier 5. As good as it gets.'),
            cost ? h('button', { class: 'btn', disabled: !canAfford(s, cost), onclick: () => act(app, () => forgeUpgrade(s, u.id), `Brooklyn retuned ${u.name}'s weapon.`) }, 'Retune') : null,
          ),
        );
      }),
    ),
    h('h2', null, 'Keepsakes'),
    h('p', { class: 'small muted' }, `Gear left behind by earlier arrivals. Retuning one to a new owner costs ${costText(retuneCost(s))}. One each.`),
    stash.length
      ? h('div', { class: 'list cols' }, stash.map((k) => keepsakeCard(app, k)))
      : h('p', { class: 'empty' }, 'Nothing yet. Recover-gear missions bring keepsakes home.'),
  );
}

function keepsakeCard(app, k) {
  const s = app.state;
  const def = KEEPSAKES.find((d) => d.id === k.defId);
  const owner = s.units.find((u) => u.id === k.unitId);
  const give = () =>
    app.openSheet(`Give: ${def.name}`, (close) => [
      h('p', { class: 'small muted' }, `${statText(def.stats)}. ${costText(retuneCost(s))} to retune.`),
      h(
        'div',
        { class: 'list' },
        s.units.filter((u) => u.id !== k.unitId).map((u) =>
          h('button', { class: 'card tap', disabled: !canAfford(s, retuneCost(s)), onclick: () => { close(); act(app, () => retune(s, u.id, k.id), `${def.name} is ${u.name}'s now.`); } }, unitSummary(s, u, { status: false })),
        ),
      ),
    ]);
  return h(
    'div',
    { class: 'card' },
    h('strong', null, def.name),
    h('p', { class: 'small muted', style: { margin: '4px 0' } }, def.text),
    h('p', { class: 'tiny' }, statText(def.stats), owner ? ` · with ${owner.name}` : ' · unclaimed'),
    h('div', { class: 'row' }, h('button', { class: 'btn', onclick: give }, owner ? 'Give to someone else' : 'Give to…'), owner ? h('button', { class: 'btn ghost', onclick: () => act(app, () => retune(s, owner.id, null)) }, 'Take back') : null),
  );
}

function trainingView(app, params) {
  const s = app.state;
  const harmonic = harmonicDivision(s);
  const [yw, yl] = pickLine('yue', s.watch);
  const [cw, cl] = pickLine('chen', s.watch);
  const units = orderUnits(s, params.unitId).filter((u) => u.path !== 'hybrid');
  const mentor = (id, name, iconName, line, who) => {
    const cost = mentorCost(s, id);
    return h(
      'div',
      { class: 'card stack' },
      h('div', { class: 'row spread' }, h('strong', null, icon(iconName), ` ${name}`), h('span', { class: 'chip' }, `Rank ${s.mentors[id]}/${MAX_MENTOR_RANK}`)),
      speech(who, line),
      cost
        ? h('button', { class: 'btn block', disabled: !canAfford(s, cost), onclick: () => act(app, () => raiseMentor(s, id), `${name}'s training improves.`) }, `${s.mentors[id] ? 'Deepen' : 'Open'} training: ${costText(cost)}`)
        : h('p', { class: 'small muted' }, 'Fully trained.'),
    );
  };
  return h(
    'div',
    { class: 'stack' },
    h('p', { class: 'small muted' }, `Yue teaches how to interface with the world (Tech). Chen teaches how to commune with it (Magic). Unbound members train into a path at level ${PATH_LEVEL.tech}; at rank ${HYBRID_RANK} each, the two teach together and Tech or Magic members can cross-train into Hybrid at level ${PATH_LEVEL.hybrid}.`),
    h('div', { class: 'grid2' }, mentor('yue', 'Yue 月', 'moon', yl, yw), mentor('chen', 'Chen 晨', 'sun', cl, cw)),
    harmonic ? speech(...pickLine('hybrid', 0)) : h('p', { class: 'notice small' }, `Harmonic Division: Yue and Chen both need rank ${HYBRID_RANK} to teach Hybrid paths.`),
    h('h2', null, 'Training'),
    units.length
      ? h('div', { class: 'list cols' }, units.map((u) => trainingCard(app, u)))
      : h('p', { class: 'empty' }, 'Everyone has found their path.'),
  );
}

function trainingCard(app, u) {
  const s = app.state;
  const options = trainingOptions(s, u);
  const free = isAvailable(s, u);
  return h(
    'div',
    { class: 'card stack' },
    unitSummary(s, u, { status: !free }),
    options.map((o) =>
      h(
        'div',
        { class: 'row spread' },
        h('span', { class: 'small' }, h('strong', null, o.name), h('span', { class: 'muted' }, ` · ${o.path === 'hybrid' ? 'Hybrid' : o.path === 'tech' ? 'Tech' : 'Magic'} · ${o.ok ? costText(o.cost) : o.reason}`)),
        h('button', { class: 'btn', disabled: !o.ok || !free || !canAfford(s, o.cost), onclick: () => act(app, () => train(s, u.id, o.path), `${u.name} begins training. Back in a watch.`) }, 'Train'),
      ),
    ),
  );
}

/** Put the unit the player came from first. */
function orderUnits(s, firstId) {
  return s.units.slice().sort((a, b) => (b.id === firstId) - (a.id === firstId) || b.level - a.level);
}

const statText = (stats) => Object.entries(stats).map(([k, v]) => `+${v} ${STAT_NAMES[k]}`).join(', ');
