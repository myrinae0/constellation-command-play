// Builds the city map as one SVG string from the game state. Static SVG is
// cheap on phones: it's redrawn only when the state changes, never per frame.
// Feature `draw.kind`s come from data/districts.js FEATURES.

import { DISTRICTS, STACKS, LIGHTHOUSE, SEA_POLY, CANAL_PATH, FEATURES } from '../data/districts.js';
import { createRng, hashSeed } from '../core/rng.js';
import { escapeAttr } from './dom.js';

const pts = (poly) => poly.map(([x, y]) => `${x},${y}`).join(' ');

function inside([x, y], poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Deterministic rooftops for a district, so the map looks like a city. */
function buildings(id, poly, count) {
  const rng = createRng(hashSeed('buildings', id));
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let out = '';
  for (let i = 0, tries = 0; i < count && tries < count * 6; tries++) {
    const w = rng.int(6, 14);
    const hgt = rng.int(5, 11);
    const x = rng.int(minX + 4, maxX - 4 - w);
    const y = rng.int(minY + 4, maxY - 4 - hgt);
    if (!inside([x, y], poly) || !inside([x + w, y + hgt], poly) || !inside([x + w, y], poly) || !inside([x, y + hgt], poly)) continue;
    out += `<rect x="${x}" y="${y}" width="${w}" height="${hgt}" rx="1"/>`;
    i++;
  }
  return out;
}

const KIND = {
  bridge: (d) => `<line x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}" stroke="#c9b48a" stroke-width="5" stroke-linecap="round"/><line x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}" stroke="#5c5140" stroke-width="1.5" stroke-dasharray="2 3"/>`,
  brokenBridge(d) {
    const mx = (k) => d.x1 + (d.x2 - d.x1) * k;
    const my = (k) => d.y1 + (d.y2 - d.y1) * k;
    return `<line x1="${d.x1}" y1="${d.y1}" x2="${mx(0.33)}" y2="${my(0.38)}" stroke="#8a7a5e" stroke-width="5" stroke-linecap="round"/><line x1="${mx(0.66)}" y1="${my(0.62)}" x2="${d.x2}" y2="${d.y2}" stroke="#8a7a5e" stroke-width="5" stroke-linecap="round"/><circle cx="${mx(0.45)}" cy="${my(0.55) + 4}" r="1.6" fill="#8a7a5e"/><circle cx="${mx(0.55)}" cy="${my(0.5) + 6}" r="1.2" fill="#8a7a5e"/>`;
  },
  lamps: (d) => d.points.map(([x, y]) => lamp(x, y)).join(''),
  rope: (d) => `<path d="M${d.x - 4} ${d.y + 4} q4 -10 8 0 z" fill="#e8c77d"/><line x1="${d.x}" y1="${d.y + 4}" x2="${d.x}" y2="${d.y2}" stroke="#c9b48a" stroke-width="1.2" stroke-dasharray="3 2"/>`,
  ship: (d) => ship(d.x, d.y, d.ghost),
  arm: (d) => `<line x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}" stroke="#c98a5a" stroke-width="3.5" stroke-linecap="round"/><line x1="${d.x2 + 8}" y1="${d.y2 + 2}" x2="${d.x2 + 8}" y2="${d.y2 + 14}" stroke="#c9b48a" stroke-width="1"/>`,
  route: (d) => `<path d="${d.d}" fill="none" stroke="#9fd4f0" stroke-width="2" stroke-dasharray="5 4"/>`,
  stairs: (d) => `<path d="M${d.x - 9} ${d.y + 7} h5 v-4 h5 v-4 h5 v-4 h4" fill="none" stroke="#e6ebf2" stroke-width="1.8"/>`,
  bell: (d) => `<circle cx="${d.x}" cy="${d.y}" r="9" fill="none" stroke="#9fd4f0" stroke-width="1" opacity=".6"/><path d="M${d.x - 4} ${d.y + 3} q4 -12 8 0 z" fill="#e8c77d"/>`,
  fountain: (d) => `<circle cx="${d.x}" cy="${d.y}" r="12" fill="url(#glow)"/><circle cx="${d.x}" cy="${d.y}" r="6" fill="#1d3550" stroke="#9fd4f0" stroke-width="1.6"/><circle cx="${d.x}" cy="${d.y}" r="2" fill="#9fd4f0"/>`,
  garden: (d) => [[0, 0], [7, -3], [-6, 4], [4, 6], [-2, -7]].map(([dx, dy]) => `<circle cx="${d.x + dx}" cy="${d.y + dy}" r="3.6" fill="#6fae7e"/>`).join(''),
  street: (d) => `<path d="${d.d}" fill="none" stroke="#c9b48a" stroke-width="3" stroke-linejoin="round"/>${lamp(...d.d.match(/-?\d+/g).slice(-2).map(Number))}`,
  stone: (d) => `<circle cx="${d.x}" cy="${d.y}" r="11" fill="none" stroke="#d8d2c4" stroke-width="1" opacity=".5"/><circle cx="${d.x}" cy="${d.y}" r="5" fill="#d8d2c4"/>`,
  tower: (d) => `<rect x="${d.x - 5}" y="${d.y - 22}" width="10" height="26" fill="#2b3b52" stroke="#c9d3e2" stroke-width="1.2"/><circle cx="${d.x}" cy="${d.y - 16}" r="1.6" fill="#e8c77d"/>`,
  glint: (d) => [[0, 0], [14, 10], [-12, 14], [22, -6]].map(([dx, dy]) => `<path d="M${d.x + dx} ${d.y + dy - 4} l2 4 -2 4 -2 -4 z" fill="#f4ecd0"/>`).join(''),
  beam: () => '', // drawn with the lighthouse
};

const lamp = (x, y) => `<circle cx="${x}" cy="${y}" r="8" fill="url(#glow)"/><circle cx="${x}" cy="${y}" r="2.3" fill="#e8c77d"/>`;

function ship(x, y, ghost) {
  return `<g opacity="${ghost ? 0.5 : 0.95}"><path d="M${x - 28} ${y - 4} h56 l-8 12 h-40 z" fill="${ghost ? '#6b7a90' : '#d6dbe3'}"/><rect x="${x - 14}" y="${y - 14}" width="24" height="10" fill="${ghost ? '#4a5568' : '#aeb7c4'}"/><line x1="${x}" y1="${y - 14}" x2="${x}" y2="${y - 28}" stroke="${ghost ? '#4a5568' : '#aeb7c4'}" stroke-width="1.5"/></g>`;
}

/**
 * @param {any} state
 * @param {{selected?: string|null, reduced?: boolean}} opts
 */
export function cityMapSvg(state, { selected = null, reduced = false } = {}) {
  const fresh = new Set(state.city.fresh);
  const has = new Set(state.city.features);
  const parts = [];
  parts.push(`<svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Map of Nouveau">`);
  parts.push(`<defs><radialGradient id="glow"><stop offset="0" stop-color="#e8c77d" stop-opacity=".55"/><stop offset="1" stop-color="#e8c77d" stop-opacity="0"/></radialGradient><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f2032"/><stop offset="1" stop-color="#0a1420"/></linearGradient></defs>`);
  parts.push(`<rect width="400" height="500" fill="#101925"/>`);
  parts.push(`<polygon points="${pts(SEA_POLY)}" fill="url(#sea)"/>`);
  parts.push(`<g stroke="#2b4560" stroke-width="1" fill="none" opacity=".7"><path d="M20 430 q15 -5 30 0 t30 0"/><path d="M200 470 q15 -5 30 0 t30 0"/><path d="M310 430 q15 -5 30 0 t30 0"/></g>`);

  // District ground + rooftops.
  for (const d of DISTRICTS) {
    const fog = state.districts[d.id].fog;
    parts.push(`<polygon points="${pts(d.poly)}" fill="${fog === 0 ? '#1d2a3b' : '#151f2c'}" stroke="#2a3a52" stroke-width="1"/>`);
    parts.push(`<g fill="${fog === 0 ? '#34465f' : '#243247'}">${buildings(d.id, d.poly, 16)}</g>`);
  }
  // The canal, the cranes, the Archive and the piers are always there.
  parts.push(`<path d="${CANAL_PATH}" fill="none" stroke="#163049" stroke-width="9" stroke-linecap="round"/>`);
  parts.push(`<g stroke="#8a6a4e" stroke-width="2" fill="none"><path d="M300 380 V300 h28"/><path d="M350 385 V292 h-24"/><path d="M370 392 V320 h-18"/></g>`);
  parts.push(`<g fill="#3a4658" stroke="#d8d2c4" stroke-width=".8"><rect x="184" y="34" width="34" height="20"/><path d="M180 34 h42 l-21 -10 z"/></g>`);
  parts.push(`<g stroke="#5c5140" stroke-width="3"><line x1="182" y1="386" x2="182" y2="430"/><line x1="236" y1="390" x2="236" y2="434"/></g>`);

  // The Stacks: towers above the fog.
  parts.push(`<polygon points="${pts(STACKS.poly)}" fill="#18243a" stroke="#2a3a52"/>`);
  parts.push(`<g fill="#2b3b52" stroke="#c9d3e2" stroke-width="1.2"><rect x="176" y="168" width="14" height="52"/><rect x="194" y="150" width="16" height="70"/><rect x="214" y="172" width="13" height="48"/></g><g stroke="#c9d3e2" stroke-width="1"><line x1="190" y1="182" x2="194" y2="182"/><line x1="210" y1="190" x2="214" y2="190"/></g><g fill="#e8c77d"><circle cx="202" cy="160" r="1.8"/><circle cx="183" cy="178" r="1.4"/><circle cx="220" cy="182" r="1.4"/></g>`);
  parts.push(`<text x="${STACKS.x}" y="244" text-anchor="middle" font-size="10" fill="#c9d3e2" font-family="system-ui">The Stacks</text>`);

  // Features from recorded Truths.
  for (const id of has) {
    const f = FEATURES[id];
    if (!f || !KIND[f.draw.kind]) continue;
    parts.push(`<g class="${fresh.has(id) ? 'fresh-feature' : ''}"><title>${escapeAttr(f.label)}</title>${KIND[f.draw.kind](f.draw)}</g>`);
  }
  for (const lampFeature of state.city.extra) {
    parts.push(`<g class="${fresh.has(lampFeature.id) ? 'fresh-feature' : ''}"><title>${escapeAttr(lampFeature.label)}</title>${lamp(lampFeature.x, lampFeature.y)}</g>`);
  }
  // A ship waits at the pier while arrivals stand on the dock.
  if (state.dock.length) parts.push(ship(212, 446, false));

  // Fog, then the clickable district shapes and labels on top.
  for (const d of DISTRICTS) {
    const fog = state.districts[d.id].fog;
    const opacity = fog === 0 ? 0 : 0.18 + (fog / 100) * 0.6;
    const [lx, ly] = d.label;
    parts.push(`<g class="fog-layer" opacity="${opacity.toFixed(2)}" pointer-events="none"><polygon points="${pts(d.poly)}" fill="#8b9bb0"/><ellipse cx="${lx - 10}" cy="${ly + 20}" rx="38" ry="12" fill="#b8c4d4" opacity=".5"/><ellipse cx="${lx + 18}" cy="${ly + 44}" rx="30" ry="9" fill="#b8c4d4" opacity=".4"/></g>`);
  }
  for (const d of DISTRICTS) {
    const fog = state.districts[d.id].fog;
    const [lx, ly] = d.label;
    const label = `${d.name}: ${fog === 0 ? 'clear of fog' : `fog ${fog}%`}`;
    parts.push(
      `<g class="district-shape${selected === d.id ? ' sel' : ''}" data-district="${d.id}" role="button" tabindex="0" aria-label="${escapeAttr(label)}">` +
        `<polygon class="edge" points="${pts(d.poly)}" fill="transparent" stroke="transparent"/>` +
        `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="11" font-weight="600" fill="#e6ebf2" font-family="system-ui" paint-order="stroke" stroke="#0b1018" stroke-width="3">${escapeAttr(d.name)}</text>` +
        `<text x="${lx}" y="${ly + 13}" text-anchor="middle" font-size="9.5" fill="${fog === 0 ? '#e8c77d' : '#a7b6ca'}" font-family="system-ui" paint-order="stroke" stroke="#0b1018" stroke-width="3">${fog === 0 ? '★ clear' : `fog ${fog}%`}</text>` +
        `</g>`,
    );
  }

  // The lighthouse: top hidden in fog, beam from above it.
  const lit = has.has('lighthouse-lamp');
  const { x, y } = LIGHTHOUSE;
  parts.push(
    `<g class="district-shape" data-district="lighthouse" role="button" tabindex="0" aria-label="${escapeAttr(LIGHTHOUSE.name)}">` +
      `<ellipse cx="${x}" cy="${y + 26}" rx="26" ry="8" fill="#26303c"/>` +
      `<path d="M${x - 7} ${y + 24} L${x - 4} ${y - 30} L${x + 4} ${y - 30} L${x + 7} ${y + 24} Z" fill="#c9d3e2"/><path d="M${x - 6} ${y + 6} h12 M${x - 5} ${y - 12} h10" stroke="#b44a3c" stroke-width="4"/>` +
      `<g class="${reduced ? '' : 'beam'}" opacity="${lit ? 0.55 : 0.28}"><path d="M${x} ${y - 40} L${x + 170} ${y - 120} L${x + 170} ${y - 70} Z" fill="${lit ? '#e8c77d' : '#dfe6f0'}"/></g>` +
      `<ellipse cx="${x}" cy="${y - 38}" rx="22" ry="14" fill="#8b9bb0" opacity=".8"/>` +
      `<text x="${x}" y="${y + 44}" text-anchor="middle" font-size="9.5" fill="#a7b6ca" font-family="system-ui">Lighthouse Point</text>` +
      `</g>`,
  );
  parts.push('</svg>');
  return parts.join('');
}
