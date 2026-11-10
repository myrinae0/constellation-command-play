// Janice's briefing and squad select (up to 3).

import { h, icon, archMark } from '../dom.js';
import { MISSION_TYPES } from '../../data/missions.js';
import { ENEMIES } from '../../data/enemies.js';
import { classOf } from '../../data/classes.js';
import { districtDef } from '../../systems/city.js';
import { assessOdds, autoSquad, SQUAD_SIZE, validateSquad } from '../../systems/missions.js';
import { isAvailable, unitStatus } from '../../systems/roster.js';
import { deployMission } from '../../systems/game.js';
import { unitSummary } from '../components.js';
import { pickLine, speech } from '../text.js';

export const briefingScreen = {
  tab: 'hub',
  back: 'hub',
  render(app, params) {
    const s = app.state;
    const mission = s.missions.find((m) => m.id === params.missionId);
    if (!mission) {
      return h('div', { class: 'stack' }, h('h1', null, 'Briefing'), h('p', { class: 'empty' }, 'That mission has left the board.'), h('button', { class: 'btn', onclick: () => app.go('hub') }, 'Back to the Stacks'));
    }
    // The chosen squad lives in the screen params so it survives re-renders.
    if (!params.squad) params.squad = autoSquad(s);
    params.squad = params.squad.filter((id) => s.units.some((u) => u.id === id && isAvailable(s, u)));
    const squad = params.squad;
    const d = districtDef(mission.district);
    const type = MISSION_TYPES[mission.type];
    const [who, line] = pickLine(`brief.${mission.type}`, mission.id, { district: d.name });

    const toggle = (id) => {
      const i = squad.indexOf(id);
      if (i >= 0) squad.splice(i, 1);
      else if (squad.length < SQUAD_SIZE) squad.push(id);
      else return app.toast(`A squad is at most ${SQUAD_SIZE}. Tap someone to take them off first.`);
      app.refresh();
    };
    const deploy = () => {
      const result = deployMission(s, mission.id, squad.slice());
      if ('error' in result) return app.toast(result.error);
      app.commit();
      app.go('battle', { battle: result.battle, report: result.report, missionTitle: `${type.name} · ${d.name}` });
    };

    const check = validateSquad(s, squad);
    const odds = squad.length ? assessOdds(s, mission, squad) : null;
    const enemyList = [...new Set(mission.enemies)].map((id) => {
      const e = ENEMIES[id];
      const n = mission.enemies.filter((x) => x === id).length;
      const name = e.boss ? d.boss.name : e.name;
      return h('li', null, h('strong', null, `${name}${n > 1 ? ` ×${n}` : ''}`), h('span', { class: 'muted' }, ` · ${e.boss ? d.boss.blurb : e.blurb}`));
    });

    const units = s.units.slice().sort((a, b) => Number(isAvailable(s, b)) - Number(isAvailable(s, a)));
    return h(
      'div',
      { class: 'stack' },
      h('div', { class: 'row' }, h('button', { class: 'btn ghost icon-only', 'aria-label': 'Back to the Stacks', onclick: () => app.go('hub') }, icon('back')), h('h1', { style: { margin: 0 } }, type.name)),
      h('p', { class: 'muted', style: { margin: 0 } }, `${d.name} · danger ${mission.level}${mission.boss ? ` · ${d.boss.name} is here` : ''}`),
      speech(who, line),
      h('div', { class: 'card' }, h('h3', null, 'In the fog'), h('ul', { class: 'small', style: { margin: 0, paddingLeft: '18px' } }, enemyList), h('p', { class: 'tiny dim', style: { margin: '6px 0 0' } }, rewardHint(mission))),
      h(
        'section',
        null,
        h('div', { class: 'row spread' }, h('h2', { style: { margin: 0 } }, 'Squad'), odds ? h('span', { class: `chip ${odds.tone}` }, `Janice's read: ${odds.label}`) : null),
        h(
          'div',
          { class: 'slots', style: { marginTop: '8px' } },
          Array.from({ length: SQUAD_SIZE }, (_, i) => {
            const u = s.units.find((x) => x.id === squad[i]);
            return u
              ? h('button', { class: 'slot filled btn', onclick: () => toggle(u.id), 'aria-label': `Remove ${u.name} from the squad` }, h('div', null, archMark(u.archetype, u.path), h('div', null, u.name), h('div', { class: 'tiny muted' }, classOf(u.archetype, u.path).name)))
              : h('div', { class: 'slot' }, 'Empty');
          }),
        ),
        squad.length && squad.length < SQUAD_SIZE ? h('p', { class: 'tiny', style: { color: 'var(--thin)', marginTop: '6px' } }, 'Short-handed. Janice would rather send three.') : null,
      ),
      h(
        'div',
        { class: 'list cols' },
        units.map((u) => {
          const chosen = squad.includes(u.id);
          const ready = isAvailable(s, u);
          return h(
            'button',
            { class: 'card tap pick', 'aria-pressed': String(chosen), disabled: !ready, onclick: () => toggle(u.id), 'aria-label': `${chosen ? 'Remove' : 'Add'} ${u.name}${ready ? '' : `, ${unitStatus(s, u)}`}` },
            unitSummary(s, u, { status: !ready }),
            chosen ? h('span', { class: 'chip accent' }, 'In squad') : null,
          );
        }),
      ),
      h(
        'div',
        { class: 'sticky-actions' },
        h('button', { class: 'btn', onclick: () => { params.squad = autoSquad(s); app.refresh(); } }, "Janice's pick"),
        h('button', { class: 'btn primary', disabled: !check.ok, onclick: deploy, 'aria-describedby': 'deploy-why' }, 'Deploy'),
      ),
      !check.ok ? h('p', { id: 'deploy-why', class: 'tiny muted' }, check.reason) : null,
    );
  },
};

function rewardHint(mission) {
  switch (mission.type) {
    case 'push': return mission.boss ? 'Win and this district may clear of fog entirely.' : 'Win to push the fog back and bring home materials.';
    case 'rescue': return 'Win to bring the lost arrivals home.';
    case 'gear': return 'Win to recover a keepsake for Brooklyn to retune.';
    case 'truth': return 'Win to recover a lost Truth for the Archive.';
    default: return '';
  }
}

