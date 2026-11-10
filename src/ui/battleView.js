// Draws a battle on one <canvas> by replaying the event list from
// systems/battle.js. Everything is vector shapes; nothing is loaded.
// The loop only runs while something is moving, and stops when hidden.

import { createLoop } from '../core/loop.js';
import { ARCH_PATHS, PATH_COLORS } from './dom.js';

const BASE_EVENT_MS = 720;

/** Creature silhouettes in a 40x48 box (feet at the bottom). */
const SHAPES = {
  stooped: { body: 'M12 47 L15 31 C10 26 11 17 18 15 C24 13 30 17 30 24 L31 33 L28 47 L24 47 L22 36 L18 36 L16 47 Z', head: [27, 12, 5.5] },
  lurcher: { body: 'M8 47 L16 30 C14 22 20 16 28 18 C34 20 36 26 33 31 L28 34 L30 47 L26 47 L24 38 L18 38 L12 47 Z', head: [34, 16, 5] },
  kneeler: { body: 'M6 47 L11 36 C9 28 15 22 22 22 C29 22 32 28 31 34 L37 40 L35 47 Z', head: [21, 16, 6] },
  choir: { body: 'M13 47 L16 21 C16 13 24 13 24 21 L27 47 Z', head: [20, 10, 6], mouths: true },
  tall: { body: 'M12 47 L15 22 C15 14 25 14 25 22 L28 47 L24 47 L20 31 L16 47 Z', head: [20, 10, 5.5], arms: 'M15 24 L5 41 M25 24 L35 41' },
};

const enemyScale = (f) => (f.look?.boss ? 1.8 : 1.3);

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{battle: any, reduced: boolean, speed: number, onEvent: (i: number, e: any) => void, onEnd: () => void}} opts
 */
export function createBattleView(canvas, { battle, reduced, speed, onEvent, onEnd }) {
  const ctx = canvas.getContext('2d');
  const events = battle.events;
  /** Display state per fighter, rebuilt by replaying hits. */
  const view = new Map(
    battle.cast.map((c) => [c.id, { ...c, hp: c.maxHp, shield: 0, down: false, downAt: 0, flashUntil: 0, x: 0, y: 0 }]),
  );
  const floaters = [];
  const paths = {};
  let W = 0;
  let H = 0;
  let fog = null;
  let clock = 0;
  let index = 0;
  let t = 0;
  let applied = false;
  let playing = false;
  let finished = false;

  const loop = createLoop((dt) => {
    clock += dt;
    if (playing) advance(dt * speed);
    updateFloaters(dt);
    draw();
    // Keep running while playing or while something is still moving.
    return playing || floaters.length > 0 || recentDowns();
  });

  function recentDowns() {
    for (const f of view.values()) if (f.down && clock - f.downAt < 700) return true;
    return false;
  }

  function advance(ms) {
    while (ms > 0 && index < events.length) {
      const ev = events[index];
      const dur = ev.type === 'act' ? BASE_EVENT_MS : BASE_EVENT_MS * 0.55;
      const step = Math.min(ms, dur - t);
      t += step;
      ms -= step;
      if (!applied && t >= dur * 0.45) {
        applyEvent(ev, true);
        applied = true;
      }
      if (t >= dur) finishEvent();
    }
  }

  function finishEvent() {
    if (!applied) applyEvent(events[index], false);
    onEvent(index, events[index]);
    index++;
    t = 0;
    applied = false;
    if (index >= events.length) end();
  }

  function end() {
    if (finished) return;
    finished = true;
    playing = false;
    onEnd();
  }

  function applyEvent(ev, animate) {
    for (const hit of ev.hits || []) {
      const f = view.get(hit.target);
      if (!f) continue;
      if (hit.dmg !== undefined) {
        const absorbed = hit.absorbed || 0;
        f.shield = Math.max(0, f.shield - absorbed);
        f.hp = Math.max(0, f.hp - (hit.dmg - absorbed));
        if (hit.held) f.hp = 1;
        if (animate) {
          f.flashUntil = clock + 140;
          float(f, `−${hit.dmg}${hit.crit ? '!' : ''}`, hit.crit ? '#ffd27a' : '#ff9d8c');
        }
      }
      if (hit.heal) {
        f.hp = Math.min(f.maxHp, f.hp + hit.heal);
        if (animate) float(f, `+${hit.heal}`, '#8fd6a4');
      }
      if (hit.shield) {
        f.shield += hit.shield;
        if (animate) float(f, `◈${hit.shield}`, '#9fd4f0');
      }
      if (animate && hit.status === 'stun') float(f, 'stunned', '#e8c77d', 14);
      if (animate && hit.status === 'slow') float(f, 'slowed', '#9fb0c6', 14);
      if (animate && hit.held) float(f, 'held together', '#e8c77d', 16);
      if (hit.down) {
        f.down = true;
        // Skipped events fade instantly; played ones fade over 600 ms.
        f.downAt = animate ? clock : clock - 10000;
        f.hp = 0;
      }
    }
  }

  function float(f, text, color, dy = 0) {
    floaters.push({ x: f.x + (floaters.length % 3) * 6 - 6, y: f.y - 34 - dy, text, color, age: 0 });
  }

  function updateFloaters(dt) {
    for (const fl of floaters) fl.age += dt;
    while (floaters.length && floaters[0].age > 900) floaters.shift();
  }

  // ------------------------------------------------------------ layout

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout();
    fog = makeFog(W, H);
    draw();
  }

  function layout() {
    const allies = [...view.values()].filter((f) => f.side === 'ally');
    allies.forEach((f, i) => {
      f.x = (W * (i + 1)) / (allies.length + 1);
      f.y = H * 0.8;
    });
    const enemies = [...view.values()].filter((f) => f.side === 'enemy');
    for (const row of [0, 1, 2]) {
      const inRow = enemies.filter((f) => (f.row ?? 1) === row);
      inRow.forEach((f, i) => {
        f.x = (W * (i + 1)) / (inRow.length + 1) + (row === 1 ? W * 0.04 : 0);
        f.y = H * (0.47 - row * 0.12);
      });
    }
  }

  // ------------------------------------------------------------ drawing

  function makeFog(w, h) {
    const off = document.createElement('canvas');
    off.width = Math.max(1, Math.round(w));
    off.height = Math.max(1, Math.round(h));
    const g = off.getContext('2d');
    for (let i = 0; i < 7; i++) {
      const x = ((i * 0.37) % 1) * w;
      const y = h * (0.12 + ((i * 0.53) % 1) * 0.7);
      const r = Math.max(w, h) * (0.18 + (i % 3) * 0.06);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(139,155,176,0.16)');
      grad.addColorStop(1, 'rgba(139,155,176,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }
    return off;
  }

  function draw() {
    if (!W) return;
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#0b111b');
    grd.addColorStop(1, '#141e2c');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    // A street edge between the two sides.
    ctx.strokeStyle = 'rgba(167,182,202,0.12)';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.62);
    ctx.lineTo(W, H * 0.6);
    ctx.stroke();
    if (fog) {
      const drift = reduced ? 0 : (clock * 0.012) % W;
      ctx.drawImage(fog, drift, 0, W, H);
      ctx.drawImage(fog, drift - W, 0, W, H);
    }
    const ev = events[index];
    const dur = ev && ev.type === 'act' ? BASE_EVENT_MS : BASE_EVENT_MS * 0.55;
    for (const f of view.values()) drawFighter(f, ev, dur);
    ctx.textAlign = 'center';
    ctx.font = '600 13px system-ui, sans-serif';
    for (const fl of floaters) {
      const p = fl.age / 900;
      ctx.globalAlpha = Math.max(0, 1 - p * p);
      ctx.fillStyle = fl.color;
      ctx.fillText(fl.text, fl.x, fl.y - (reduced ? 0 : p * 22));
    }
    ctx.globalAlpha = 1;
  }

  function drawFighter(f, ev, dur) {
    let { x, y } = f;
    // The actor lunges toward its first target.
    if (!reduced && playing && ev && ev.actor === f.id && ev.hits?.length && t < dur * 0.5) {
      const target = view.get(ev.hits[0].target);
      if (target && target !== f && target.side !== f.side) {
        const k = Math.sin((t / (dur * 0.5)) * Math.PI) * 0.22;
        x += (target.x - x) * k;
        y += (target.y - y) * k;
      }
    }
    let alpha = 1;
    if (f.down) {
      const p = Math.min(1, (clock - f.downAt) / 600);
      // Thinned allies go translucent (like the arrivals on the dock);
      // creatures sink back into the fog.
      alpha = f.side === 'ally' ? 1 - 0.72 * p : 1 - p;
      if (f.side === 'enemy' && !reduced) y += p * 10;
      if (alpha <= 0.01) return;
    }
    ctx.globalAlpha = alpha;
    if (f.side === 'ally') drawAlly(f, x, y);
    else drawEnemy(f, x, y);
    if (f.flashUntil > clock) {
      const k = enemyScale(f);
      ctx.globalAlpha = 0.5 * alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, f.side === 'ally' ? y : y - 24 * k + 8, f.side === 'ally' ? 22 : 20 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
    }
    drawBars(f, x, y);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = f.side === 'ally' ? '#e6ebf2' : '#a7b6ca';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const label = f.down && f.side === 'ally' ? `${f.name} · thinned` : f.name;
    ctx.fillText(label, x, y + (f.side === 'ally' ? 36 : 14));
    ctx.globalAlpha = 1;
  }

  function drawAlly(f, x, y) {
    const color = PATH_COLORS[f.look.path] || PATH_COLORS.none;
    ctx.fillStyle = '#1a2638';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const key = `a:${f.look.archetype}`;
    paths[key] ||= new Path2D(ARCH_PATHS[f.look.archetype] || ARCH_PATHS.shard);
    ctx.save();
    ctx.translate(x - 13, y - 13);
    ctx.scale(26 / 36, 26 / 36);
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    if (f.look.archetype === 'shard' || f.look.archetype === 'trace') {
      ctx.globalAlpha *= 0.85;
      ctx.fill(paths[key]);
    } else ctx.stroke(paths[key]);
    ctx.restore();
    if (f.shield > 0) {
      ctx.strokeStyle = 'rgba(159,212,240,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 27, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawEnemy(f, x, y) {
    const shape = SHAPES[f.look.shape] || SHAPES.stooped;
    const scale = enemyScale(f);
    const key = `e:${f.look.shape}`;
    paths[key] ||= new Path2D(shape.body);
    ctx.save();
    ctx.translate(x - 20 * scale, y - 48 * scale + 8);
    ctx.scale(scale, scale);
    ctx.fillStyle = f.look.boss ? '#2a2733' : '#232b39';
    ctx.strokeStyle = f.look.boss ? '#c9a46a' : '#6b7a90';
    ctx.lineWidth = 1.5;
    ctx.fill(paths[key]);
    ctx.stroke(paths[key]);
    if (shape.arms) {
      paths[`${key}:arms`] ||= new Path2D(shape.arms);
      ctx.lineWidth = 2.5;
      ctx.stroke(paths[`${key}:arms`]);
    }
    const [hx, hy, hr] = shape.head;
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#d8e0ea';
    ctx.fillRect(hx - 2.5, hy - 1, 1.6, 1.6);
    ctx.fillRect(hx + 1, hy - 1, 1.6, 1.6);
    if (shape.mouths) {
      ctx.fillStyle = '#0b1018';
      for (const my of [24, 31, 38]) {
        ctx.beginPath();
        ctx.arc(20, my, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    if (f.shield > 0) {
      ctx.strokeStyle = 'rgba(159,212,240,0.6)';
      ctx.strokeRect(x - 20 * scale - 3, y - 48 * scale + 5, 40 * scale + 6, 48 * scale + 6);
    }
  }

  function drawBars(f, x, y) {
    const w = f.look?.boss ? 64 : 44;
    const top = f.side === 'ally' ? y - 32 : y - 48 * enemyScale(f) + 2;
    const ratio = f.hp / f.maxHp;
    ctx.fillStyle = '#223047';
    ctx.fillRect(x - w / 2, top, w, 4);
    ctx.fillStyle = ratio > 0.5 ? '#8fd6a4' : ratio > 0.25 ? '#f0c46b' : '#f09484';
    ctx.fillRect(x - w / 2, top, w * ratio, 4);
    if (f.shield > 0) {
      ctx.fillStyle = '#9fd4f0';
      ctx.fillRect(x - w / 2, top - 3, Math.min(w, (w * f.shield) / f.maxHp), 2);
    }
  }

  // ------------------------------------------------------------ controls

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(canvas);
  else window.addEventListener('resize', resize);
  resize();

  return {
    get playing() {
      return playing;
    },
    get finished() {
      return finished;
    },
    play() {
      if (finished) return;
      playing = true;
      loop.start();
    },
    pause() {
      playing = false;
    },
    setSpeed(n) {
      speed = n;
    },
    /** Jump to just after event `n` (used by ?debug=battle&at=n). */
    seek(n) {
      while (index < Math.min(n, events.length)) finishEvent();
      draw();
    },
    /** Jump to the end: apply every remaining event at once. */
    skip() {
      while (index < events.length) finishEvent();
      floaters.length = 0;
      draw();
      loop.start();
    },
    destroy() {
      loop.dispose();
      ro?.disconnect();
      window.removeEventListener('resize', resize);
    },
  };
}
