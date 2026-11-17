// NOVA HARVEST v3 — everything the player sees. One canvas, one palette: deep
// space, neon cyan and gold against void magenta. The HUD, the title, the
// shop, the win and game-over screens are all drawn here, so a screenshot of
// the canvas is a screenshot of the whole game. v3 adds a parallax sky with
// shooting stars, a richer harvester, Weaver and Splitter enemies, shockwave
// rings, a salvage + upgrade HUD, the between-wave shop, and run stats on
// the win and game-over screens.
import { COMBO, FIELD, LIVES, PLAYER, SHARD, UPGRADES, WAVES_TOTAL } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';
export const SCREEN_SHOP = 'shop';

const TAU = Math.PI * 2;
const INK = '#e8f6ff';
const DIM = '#9db8d6';
const GOLD = '#ffd166';
const CYAN = '#38e1ff';
const MAGENTA = '#c77dff';
const PINK = '#ff5da2';
const RED = '#ff6b6b';
const GREEN = '#7dff9e';
const ORANGE = '#ffa94d';

function font(weight, px) {
  return `${weight} ${px}px "Arial Black", "Segoe UI", Arial, sans-serif`;
}

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** The shop card grid, shared by the draw and the click hit-test. */
const SHOP = {
  x: 72,
  y: 150,
  w: 400,
  h: 112,
  gap: 16,
};

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  // A fixed starfield, seeded once so the sky never flickers between frames.
  // Three parallax layers: faint far dust, mid stars, and a few bright
  // glinting stars up close.
  const stars = [];
  let seed = 1337;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let i = 0; i < 190; i += 1) {
    stars.push({
      x: rnd() * FIELD.width,
      y: rnd() * FIELD.height,
      r: rnd() * 1.6 + 0.4,
      layer: rnd(),
      tw: rnd() * TAU,
    });
  }
  const brightStars = [];
  for (let i = 0; i < 14; i += 1) {
    brightStars.push({ x: rnd() * FIELD.width, y: rnd() * FIELD.height, tw: rnd() * TAU });
  }
  const nebulae = [
    { x: 180, y: 130, r: 260, color: '123,47,190' },
    { x: 780, y: 420, r: 300, color: '13,110,120' },
    { x: 620, y: 90, r: 200, color: '160,20,90' },
    { x: 120, y: 500, r: 190, color: '20,60,140' },
    { x: 480, y: 300, r: 340, color: '90,20,140' },
    { x: 880, y: 120, r: 170, color: '10,90,90' },
  ];
  // Shooting stars: one streaks across every few seconds.
  let nextMeteor = 4;
  const meteors = [];

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    scale = Math.min(w / FIELD.width, h / FIELD.height) * dpr;
    offsetX = (canvas.width - FIELD.width * scale) / 2;
    offsetY = (canvas.height - FIELD.height * scale) / 2;
  }
  resize();
  window.addEventListener('resize', resize);

  /** Convert a canvas CSS-pixel point to field coordinates. */
  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = (clientX - rect.left) * dpr;
    const py = (clientY - rect.top) * dpr;
    return { x: (px - offsetX) / scale, y: (py - offsetY) / scale };
  }

  function drawBackground(time) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, '#070a1d');
    g.addColorStop(0.55, '#0a0f2e');
    g.addColorStop(1, '#120a24');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const n of nebulae) {
      const pulse = 0.16 + 0.05 * Math.sin(time * 0.25 + n.x);
      const rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      rg.addColorStop(0, `rgba(${n.color},${pulse.toFixed(3)})`);
      rg.addColorStop(1, `rgba(${n.color},0)`);
      ctx.fillStyle = rg;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    for (const s of stars) {
      // Far stars barely move, near stars drift: parallax.
      const drift = time * (3 + s.layer * 16);
      const x = ((s.x + drift) % FIELD.width + FIELD.width) % FIELD.width;
      const alpha = 0.3 + 0.4 * Math.abs(Math.sin(time * 0.8 + s.tw));
      ctx.globalAlpha = alpha * (0.4 + s.layer * 0.6);
      ctx.fillStyle = s.layer > 0.66 ? '#cfe9ff' : '#8fb4d8';
      ctx.beginPath();
      ctx.arc(x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    // Bright stars with a cross glint.
    for (const s of brightStars) {
      const a = 0.35 + 0.45 * Math.abs(Math.sin(time * 0.6 + s.tw));
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#dff3ff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(s.x - 7, s.y);
      ctx.lineTo(s.x + 7, s.y);
      ctx.moveTo(s.x, s.y - 7);
      ctx.lineTo(s.x, s.y + 7);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Shooting stars.
    if (time >= nextMeteor) {
      nextMeteor = time + 4 + (nextMeteor * 37 % 3);
      meteors.push({
        x: 120 + ((nextMeteor * 91) % 720),
        y: 40 + ((nextMeteor * 53) % 120),
        vx: -260,
        vy: 150,
        life: 0.8,
      });
    }
    for (let i = meteors.length - 1; i >= 0; i -= 1) {
      const m = meteors[i];
      m.x += m.vx * 0.016;
      m.y += m.vy * 0.016;
      m.life -= 0.016;
      if (m.life <= 0) {
        meteors.splice(i, 1);
        continue;
      }
      const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 0.18, m.y - m.vy * 0.18);
      grad.addColorStop(0, `rgba(255,255,255,${(m.life * 0.9).toFixed(2)})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.vx * 0.18, m.y - m.vy * 0.18);
      ctx.stroke();
    }
  }

  function star4(x, y, r, color, pulse) {
    const rr = r * (1 + 0.18 * Math.sin(pulse));
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -rr);
    ctx.quadraticCurveTo(rr * 0.22, -rr * 0.22, rr, 0);
    ctx.quadraticCurveTo(rr * 0.22, rr * 0.22, 0, rr);
    ctx.quadraticCurveTo(-rr * 0.22, rr * 0.22, -rr, 0);
    ctx.quadraticCurveTo(-rr * 0.22, -rr * 0.22, 0, -rr);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, rr * 0.28, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawShard(s) {
    if (s.kind === 'cell') {
      ctx.save();
      // A cell fades out over its last 3 seconds of life.
      if (s.life < 3) ctx.globalAlpha = Math.max(0.15, s.life / 3);
      ctx.translate(s.x, s.y);
      const pulse = 1 + 0.14 * Math.sin(s.phase);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = GREEN;
      ctx.shadowBlur = 16;
      ctx.fillStyle = GREEN;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#062b12';
      ctx.fillRect(-2.4, -7, 4.8, 14);
      ctx.fillRect(-7, -2.4, 14, 4.8);
      ctx.restore();
      return;
    }
    star4(s.x, s.y, SHARD.radius, GOLD, s.phase);
  }

  function drawBoss(e) {
    // The Void Leviathan: a huge spiked ring around a burning core. The ring
    // turns with its phase and the core pulses faster as its hull drops.
    ctx.save();
    ctx.translate(e.x, e.y);
    const hurt = 1 - e.hp / e.maxHp;
    const spikes = 12;
    ctx.shadowColor = '#ff9d45';
    ctx.shadowBlur = 26;
    ctx.fillStyle = '#2a0a2e';
    ctx.strokeStyle = '#ff9d45';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i += 1) {
      const a = (i / (spikes * 2)) * TAU + e.phase * 0.25;
      const r = i % 2 === 0 ? e.r + 10 : e.r - 6;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Inner ring.
    ctx.strokeStyle = MAGENTA;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, e.r - 16, 0, TAU);
    ctx.stroke();
    // Burning core: brighter and faster as it is hurt.
    const corePulse = 1 + 0.25 * Math.sin(e.phase * (3 + hurt * 6));
    const coreR = 13 * corePulse;
    ctx.shadowColor = hurt > 0.5 ? RED : '#ff9d45';
    ctx.shadowBlur = 22;
    ctx.fillStyle = hurt > 0.5 ? '#ff3b3b' : '#ffb347';
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath();
    ctx.arc(0, 0, coreR * 0.45, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawEnemy(e) {
    if (e.kind === 'boss') {
      drawBoss(e);
      return;
    }
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.kind === 'drifter') {
      const spikes = 8;
      ctx.shadowColor = MAGENTA;
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#3b1155';
      ctx.strokeStyle = MAGENTA;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i += 1) {
        const a = (i / (spikes * 2)) * TAU + e.phase * 0.4;
        const r = i % 2 === 0 ? e.r + 5 : e.r - 3;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f0abfc';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, TAU);
      ctx.fill();
    } else if (e.kind === 'stinger') {
      // A Stinger: a pink dart with a glowing barrel that telegraphs its shot.
      const pulse = 1 + 0.2 * Math.sin(e.phase * 4);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = PINK;
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#3d0a2a';
      ctx.strokeStyle = PINK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -e.r - 4);
      ctx.lineTo(e.r, e.r);
      ctx.lineTo(0, e.r - 5);
      ctx.lineTo(-e.r, e.r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      // The barrel glows as the next shot charges.
      const charge = 1 - Math.max(0, e.fireTimer) / 2.6;
      ctx.fillStyle = charge > 0.7 ? '#ffffff' : PINK;
      ctx.beginPath();
      ctx.arc(0, -2, 3 + charge * 2.5, 0, TAU);
      ctx.fill();
    } else if (e.kind === 'weaver') {
      // A Weaver: an orange arrowhead. While it locks on, a bright ring and
      // a dashed aim line telegraph the dash.
      if (e.mode === 'tele') {
        ctx.save();
        ctx.rotate(Math.atan2(e.dashY, e.dashX) + Math.PI / 2);
        ctx.strokeStyle = 'rgba(255,169,77,0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(0, -e.r);
        ctx.lineTo(0, -150);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        ctx.strokeStyle = ORANGE;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, e.r + 8 + 3 * Math.sin(e.phase * 10), 0, TAU);
        ctx.stroke();
      }
      const pulse = 1 + 0.15 * Math.sin(e.phase * 5);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = ORANGE;
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#3d1c05';
      ctx.strokeStyle = ORANGE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -e.r - 6);
      ctx.lineTo(e.r * 0.8, e.r * 0.6);
      ctx.lineTo(0, e.r * 0.2);
      ctx.lineTo(-e.r * 0.8, e.r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffe8cc';
      ctx.beginPath();
      ctx.arc(0, -3, 3.2, 0, TAU);
      ctx.fill();
    } else if (e.kind === 'splitter') {
      // A Splitter: a big cracked green rock. The cracks glow brighter and
      // the inner core shows as its hull drops.
      const pulse = 1 + 0.1 * Math.sin(e.phase * 2);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = '#8ce99a';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#122b16';
      ctx.strokeStyle = '#8ce99a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * TAU + e.phase * 0.15;
        const px = Math.cos(a) * e.r;
        const py = Math.sin(a) * e.r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Cracks: a star of lines from the centre.
      ctx.strokeStyle = '#d3f9d8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 3; i += 1) {
        const a = (i / 3) * TAU + e.phase * 0.5;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * (e.r - 4), Math.sin(a) * (e.r - 4));
      }
      ctx.stroke();
      // Hull pips: one bright dot per hull left.
      ctx.fillStyle = '#8ce99a';
      for (let i = 0; i < e.hp; i += 1) {
        ctx.beginPath();
        ctx.arc(-5 + i * 10, 0, 3, 0, TAU);
        ctx.fill();
      }
    } else {
      const pulse = 1 + 0.16 * Math.sin(e.phase * 3);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = RED;
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#4a0d0d';
      ctx.strokeStyle = RED;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffb4b4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * TAU + e.phase;
        ctx.moveTo(Math.cos(a) * (e.r - 2), Math.sin(a) * (e.r - 2));
        ctx.lineTo(Math.cos(a) * (e.r + 5), Math.sin(a) * (e.r + 5));
      }
      ctx.stroke();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEbolt(b, time) {
    ctx.save();
    ctx.translate(b.x, b.y);
    const pulse = 1 + 0.3 * Math.sin(time * 12);
    ctx.shadowColor = RED;
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ff3b3b';
    ctx.beginPath();
    ctx.arc(0, 0, b.r * pulse, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffd6d6';
    ctx.beginPath();
    ctx.arc(0, 0, b.r * 0.45, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer(p, state, time) {
    ctx.save();
    ctx.translate(p.x, p.y);
    const blink = p.invuln > 0 && Math.floor(time * 14) % 2 === 0;
    ctx.globalAlpha = blink ? 0.35 : 1;
    // Engine flame, flickering under the hull.
    const flame = 10 + Math.sin(time * 30) * 3;
    ctx.shadowColor = CYAN;
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ff9d45';
    ctx.beginPath();
    ctx.moveTo(-6, 8);
    ctx.lineTo(0, 10 + flame);
    ctx.lineTo(6, 8);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(p.angle + Math.PI / 2);
    // Hull: a swept dart with twin wings, side pods and a glowing canopy.
    ctx.fillStyle = '#0e7490';
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -19);
    ctx.lineTo(8, 2);
    ctx.lineTo(16, 12);
    ctx.lineTo(7, 9);
    ctx.lineTo(0, 6);
    ctx.lineTo(-7, 9);
    ctx.lineTo(-16, 12);
    ctx.lineTo(-8, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Wing stripes.
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-13, 8);
    ctx.lineTo(-7, 3);
    ctx.moveTo(13, 8);
    ctx.lineTo(7, 3);
    ctx.stroke();
    // Canopy.
    ctx.fillStyle = '#ecfeff';
    ctx.beginPath();
    ctx.ellipse(0, -7, 3.6, 6, 0, 0, TAU);
    ctx.fill();
    // Side pods.
    ctx.fillStyle = '#155e75';
    ctx.beginPath();
    ctx.arc(-11, 8, 2.6, 0, TAU);
    ctx.arc(11, 8, 2.6, 0, TAU);
    ctx.fill();
    // Muzzle flash: a bright star at the gun tip while the shot is fresh.
    if (state.muzzle > 0) {
      ctx.globalAlpha = state.muzzle / 0.08;
      ctx.shadowColor = '#fff7ae';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#fff7ae';
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(4, -20);
      ctx.lineTo(0, -22);
      ctx.lineTo(-4, -20);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /** The HUD. In minimal mode (the shop) only the score block and the hull
   * hearts are drawn: the shop panel already shows the wave, the salvage and
   * the upgrades, and the centre bar would sit under its title. */
  function drawHud(state, best, minimal) {
    const pad = 16;
    ctx.textBaseline = 'alphabetic';
    // Top-left: score + salvage.
    ctx.textAlign = 'left';
    ctx.fillStyle = DIM;
    ctx.font = font(400, 13);
    ctx.fillText('SCORE', pad, 26);
    ctx.fillStyle = INK;
    ctx.font = font(900, 26);
    ctx.fillText(String(state.score), pad, 54);
    ctx.fillStyle = GOLD;
    ctx.font = font(900, 15);
    ctx.fillText(`SALVAGE ${state.salvage}`, pad, 76);
    ctx.fillStyle = DIM;
    ctx.font = font(400, 12);
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, pad, 94);
    if (minimal) {
      // Top-right: hull hearts only.
      ctx.textAlign = 'right';
      const maxHull = state.player.maxHull || LIVES;
      for (let i = 0; i < maxHull; i += 1) {
        const x = FIELD.width - pad - i * 30;
        const y = 34;
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = i < state.player.hull ? '#ff5d73' : 'rgba(255,255,255,0.16)';
        ctx.shadowColor = i < state.player.hull ? '#ff5d73' : 'transparent';
        ctx.shadowBlur = i < state.player.hull ? 10 : 0;
        ctx.beginPath();
        ctx.moveTo(0, 8);
        ctx.bezierCurveTo(-11, -2, -7, -11, 0, -5);
        ctx.bezierCurveTo(7, -11, 11, -2, 0, 8);
        ctx.fill();
        ctx.restore();
      }
      return;
    }
    // Top-centre: wave + quota bar, or the boss HP bar on wave 8.
    ctx.textAlign = 'center';
    if (state.boss) {
      ctx.fillStyle = '#ff9d45';
      ctx.font = font(900, 14);
      ctx.fillText('VOID LEVIATHAN', FIELD.width / 2, 26);
      const barW = 260;
      const barX = FIELD.width / 2 - barW / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(barX, 34, barW, 12);
      ctx.fillStyle = state.boss.hp / state.boss.maxHp > 0.5 ? '#ff9d45' : RED;
      ctx.fillRect(barX, 34, barW * Math.max(0, state.boss.hp / state.boss.maxHp), 12);
      ctx.fillStyle = INK;
      ctx.font = font(400, 13);
      ctx.fillText(`${state.boss.hp} / ${state.boss.maxHp} HULL`, FIELD.width / 2, 62);
    } else {
      ctx.fillStyle = DIM;
      ctx.font = font(400, 13);
      ctx.fillText(`WAVE ${state.wave} / ${WAVES_TOTAL}`, FIELD.width / 2, 26);
      const barW = 220;
      const barX = FIELD.width / 2 - barW / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(barX, 34, barW, 10);
      ctx.fillStyle = GOLD;
      ctx.fillRect(barX, 34, barW * Math.min(1, state.collected / state.quota), 10);
      ctx.fillStyle = INK;
      ctx.font = font(400, 13);
      ctx.fillText(`${state.collected} / ${state.quota} SHARDS`, FIELD.width / 2, 62);
      if (state.modifier) {
        ctx.fillStyle = ORANGE;
        ctx.font = font(900, 12);
        ctx.fillText(state.modifier.name, FIELD.width / 2, 80);
      }
    }
    // Top-right: hull hearts (max hull grows with Aegis Plating).
    ctx.textAlign = 'right';
    const maxHull = state.player.maxHull || LIVES;
    for (let i = 0; i < maxHull; i += 1) {
      const x = FIELD.width - pad - i * 30;
      const y = 34;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = i < state.player.hull ? '#ff5d73' : 'rgba(255,255,255,0.16)';
      ctx.shadowColor = i < state.player.hull ? '#ff5d73' : 'transparent';
      ctx.shadowBlur = i < state.player.hull ? 10 : 0;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.bezierCurveTo(-11, -2, -7, -11, 0, -5);
      ctx.bezierCurveTo(7, -11, 11, -2, 0, 8);
      ctx.fill();
      ctx.restore();
    }
    // Combo meter under the score.
    if (state.combo > 1) {
      ctx.textAlign = 'left';
      ctx.fillStyle = GOLD;
      ctx.font = font(900, 18);
      ctx.fillText(`COMBO x${state.combo}`, pad, 120);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(pad, 128, 120, 6);
      ctx.fillStyle = GOLD;
      ctx.fillRect(pad, 128, 120 * Math.max(0, state.comboTimer / COMBO.window), 6);
    }
    // Owned upgrades: small pips under the combo meter.
    const owned = UPGRADES.filter((u) => state.upgrades[u.id] > 0);
    if (owned.length > 0) {
      ctx.textAlign = 'left';
      ctx.font = font(900, 12);
      let oy = state.combo > 1 ? 152 : 120;
      for (const u of owned) {
        ctx.fillStyle = CYAN;
        ctx.fillText(`${u.name} ${'●'.repeat(state.upgrades[u.id])}${'○'.repeat(u.costs.length - state.upgrades[u.id])}`, pad, oy);
        oy += 16;
      }
    }
    // Bottom hint.
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(157,184,214,0.75)';
    ctx.font = font(400, 12);
    ctx.fillText('WASD move  ·  Mouse aim  ·  Click / Space fire  ·  P pause  ·  M mute', FIELD.width / 2, FIELD.height - 12);
  }

  function drawBanner(state) {
    if (!state.banner) return;
    const alpha = Math.min(1, state.bannerTimer / 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    ctx.font = font(900, 44);
    ctx.shadowColor = state.boss ? '#ff9d45' : CYAN;
    ctx.shadowBlur = 24;
    ctx.fillText(state.banner.text, FIELD.width / 2, FIELD.height / 2 - 60);
    ctx.shadowBlur = 0;
    ctx.fillStyle = GOLD;
    ctx.font = font(400, 18);
    ctx.fillText(state.banner.sub, FIELD.width / 2, FIELD.height / 2 - 28);
    ctx.restore();
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(5,8,24,0.82)';
    ctx.strokeStyle = 'rgba(56,225,255,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();
  }

  /** The shop card at field point (x, y), or -1. Shared with drawShop. */
  function shopCardAt(x, y) {
    for (let i = 0; i < UPGRADES.length; i += 1) {
      const cx = SHOP.x + (i % 2) * (SHOP.w + SHOP.gap);
      const cy = SHOP.y + Math.floor(i / 2) * (SHOP.h + SHOP.gap);
      if (x >= cx && x <= cx + SHOP.w && y >= cy && y <= cy + SHOP.h) return i;
    }
    return -1;
  }

  function drawShop(state) {
    ctx.fillStyle = 'rgba(4,6,18,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const cx = FIELD.width / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD;
    ctx.font = font(900, 40);
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 20;
    ctx.fillText('WAVE CLEARED!', cx, 74);
    ctx.shadowBlur = 0;
    ctx.fillStyle = INK;
    ctx.font = font(400, 18);
    ctx.fillText(`Spend your salvage before wave ${state.shop.wave}`, cx, 104);
    ctx.fillStyle = GOLD;
    ctx.font = font(900, 22);
    ctx.fillText(`SALVAGE ${state.salvage}`, cx, 134);
    for (let i = 0; i < UPGRADES.length; i += 1) {
      const u = UPGRADES[i];
      const level = state.upgrades[u.id];
      const maxed = level >= u.costs.length;
      const cost = maxed ? 0 : u.costs[level];
      const afford = !maxed && state.salvage >= cost;
      const x = SHOP.x + (i % 2) * (SHOP.w + SHOP.gap);
      const y = SHOP.y + Math.floor(i / 2) * (SHOP.h + SHOP.gap);
      ctx.save();
      ctx.fillStyle = maxed ? 'rgba(20,40,30,0.9)' : afford ? 'rgba(8,30,44,0.92)' : 'rgba(10,10,24,0.85)';
      ctx.strokeStyle = maxed ? 'rgba(125,255,158,0.6)' : afford ? 'rgba(56,225,255,0.7)' : 'rgba(157,184,214,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, SHOP.w, SHOP.h, 12);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = maxed ? GREEN : afford ? INK : DIM;
      ctx.font = font(900, 18);
      ctx.fillText(`[${u.key}] ${u.name}`, x + 16, y + 32);
      ctx.fillStyle = DIM;
      ctx.font = font(400, 14);
      ctx.fillText(u.desc, x + 16, y + 58);
      // Level pips.
      ctx.font = font(900, 15);
      ctx.fillStyle = CYAN;
      ctx.fillText('●'.repeat(level) + '○'.repeat(u.costs.length - level), x + 16, y + 86);
      // Price.
      ctx.textAlign = 'right';
      if (maxed) {
        ctx.fillStyle = GREEN;
        ctx.font = font(900, 17);
        ctx.fillText('MAXED', x + SHOP.w - 16, y + 86);
      } else {
        ctx.fillStyle = afford ? GOLD : RED;
        ctx.font = font(900, 20);
        ctx.fillText(`${cost} ✦`, x + SHOP.w - 16, y + 86);
      }
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = DIM;
    ctx.font = font(400, 15);
    ctx.fillText('Kills pay salvage — drifters 10, mines 8, stingers 15, weavers 12, splitters 20', cx, 420);
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.fillStyle = CYAN;
    ctx.font = font(900, 20);
    ctx.fillText('PRESS 1-4 TO BUY  ·  SPACE TO LAUNCH THE NEXT WAVE', cx, 458);
    ctx.globalAlpha = 1;
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(4,6,18,0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const cx = FIELD.width / 2;
    ctx.textAlign = 'center';
    // A little harvester flies above the logo.
    ctx.save();
    ctx.translate(cx, 52);
    ctx.rotate(Math.sin(state.time * 0.8) * 0.12);
    ctx.shadowColor = CYAN;
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#0e7490';
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(9, 4);
    ctx.lineTo(17, 12);
    ctx.lineTo(7, 9);
    ctx.lineTo(0, 6);
    ctx.lineTo(-7, 9);
    ctx.lineTo(-17, 12);
    ctx.lineTo(-9, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ecfeff';
    ctx.beginPath();
    ctx.ellipse(0, -5, 3.2, 5.4, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = GOLD;
    ctx.font = font(400, 16);
    ctx.fillText('A NEON HARVEST ARCADE', cx, 108);
    ctx.fillStyle = INK;
    ctx.font = font(900, 72);
    ctx.shadowColor = CYAN;
    ctx.shadowBlur = 30;
    ctx.fillText('NOVA', cx, 182);
    ctx.fillText('HARVEST', cx, 252);
    ctx.shadowBlur = 0;
    ctx.fillStyle = DIM;
    ctx.font = font(400, 17);
    ctx.fillText('Collect the star shards. Dodge the void. Survive all 8 waves.', cx, 292);
    ctx.fillStyle = ORANGE;
    ctx.font = font(900, 15);
    ctx.fillText('NEW: BETWEEN-WAVE UPGRADES  ·  WEAVERS  ·  SPLITTERS  ·  WAVE TWISTS', cx, 316);
    panel(cx - 250, 332, 500, 138);
    ctx.fillStyle = INK;
    ctx.font = font(400, 16);
    ctx.fillText('WASD / Arrows — fly the harvester', cx, 360);
    ctx.fillText('Mouse — aim    Click / Space — fire', cx, 388);
    ctx.fillText('Fill the shard quota, then spend salvage in the shop', cx, 416);
    ctx.fillText('Weavers dash, Splitters burst apart, Stingers shoot back', cx, 444);
    ctx.fillText('Wave 8: destroy the Void Leviathan  ·  P pause  ·  M mute', cx, 466);
    if (best > 0) {
      ctx.fillStyle = GOLD;
      ctx.font = font(900, 18);
      ctx.fillText(`BEST ${best}`, cx, 502);
    }
    // A slow pulse, never fully off: the start prompt must read in a still frame.
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.fillStyle = CYAN;
    ctx.font = font(900, 22);
    ctx.fillText('CLICK OR PRESS SPACE TO START', cx, 548);
    ctx.globalAlpha = 1;
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(4,6,18,0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    ctx.font = font(900, 52);
    ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2 - 8);
    ctx.fillStyle = DIM;
    ctx.font = font(400, 17);
    ctx.fillText('Press P or click to keep flying', FIELD.width / 2, FIELD.height / 2 + 30);
  }

  function drawStats(state, best, cy) {
    const s = state.stats;
    const rows = [
      ['WAVES CLEARED', String(Math.min(state.wave, WAVES_TOTAL))],
      ['ENEMIES DOWN', String(s.kills)],
      ['SHARDS COLLECTED', String(s.pickups)],
      ['MAX COMBO', `x${s.maxCombo}`],
      ['TIME', fmtTime(s.timePlayed)],
      ['SALVAGE EARNED', String(s.salvageEarned)],
    ];
    ctx.textAlign = 'left';
    const x0 = FIELD.width / 2 - 150;
    for (let i = 0; i < rows.length; i += 1) {
      const y = cy + i * 24;
      ctx.fillStyle = DIM;
      ctx.font = font(400, 14);
      ctx.fillText(rows[i][0], x0, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = INK;
      ctx.font = font(900, 14);
      ctx.fillText(rows[i][1], FIELD.width / 2 + 150, y);
      ctx.textAlign = 'left';
    }
  }

  function drawWin(state, best) {
    ctx.fillStyle = 'rgba(4,6,18,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const cx = FIELD.width / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD;
    ctx.font = font(900, 50);
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 26;
    ctx.fillText('HARVEST COMPLETE!', cx, 118);
    ctx.shadowBlur = 0;
    ctx.fillStyle = INK;
    ctx.font = font(400, 18);
    ctx.fillText('All 8 waves cleared. The Leviathan is dust.', cx, 150);
    ctx.fillStyle = DIM;
    ctx.font = font(400, 15);
    ctx.fillText('FINAL SCORE', cx, 190);
    ctx.fillStyle = INK;
    ctx.font = font(900, 52);
    ctx.fillText(String(state.score), cx, 242);
    ctx.fillStyle = best > state.score ? DIM : GOLD;
    ctx.font = font(900, 18);
    ctx.fillText(best > state.score ? `BEST ${best}` : 'NEW BEST!', cx, 276);
    drawStats(state, best, 316);
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.fillStyle = CYAN;
    ctx.font = font(900, 20);
    ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', cx, 500);
    ctx.globalAlpha = 1;
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(20,4,10,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const cx = FIELD.width / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = RED;
    ctx.font = font(900, 50);
    ctx.shadowColor = RED;
    ctx.shadowBlur = 26;
    ctx.fillText('SIGNAL LOST', cx, 118);
    ctx.shadowBlur = 0;
    ctx.fillStyle = INK;
    ctx.font = font(400, 18);
    ctx.fillText(`The void took the harvester on wave ${state.wave}.`, cx, 150);
    ctx.fillStyle = DIM;
    ctx.font = font(400, 15);
    ctx.fillText('SCORE', cx, 190);
    ctx.fillStyle = INK;
    ctx.font = font(900, 52);
    ctx.fillText(String(state.score), cx, 242);
    ctx.fillStyle = DIM;
    ctx.font = font(900, 18);
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, cx, 276);
    drawStats(state, best, 316);
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.fillStyle = CYAN;
    ctx.font = font(900, 20);
    ctx.fillText('PRESS R OR CLICK TO TRY AGAIN', cx, 500);
    ctx.globalAlpha = 1;
  }

  function draw(state, screen, best) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#04050d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawBackground(state.time);
    for (const s of state.shards) drawShard(s);
    for (const e of state.enemies) drawEnemy(e);
    for (const b of state.ebolts) drawEbolt(b, state.time);
    ctx.save();
    ctx.shadowColor = '#a5f3fc';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#d9fbff';
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    if (state.player && screen !== SCREEN_TITLE) drawPlayer(state.player, state, state.time);
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Shockwave rings, expanding and fading.
    for (const r of state.rings) {
      ctx.globalAlpha = Math.max(0, r.life / r.maxLife);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    for (const f of state.floats) {
      ctx.globalAlpha = Math.max(0, f.life / 0.9);
      ctx.fillStyle = f.color;
      ctx.font = font(900, 15);
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);
    else if (screen === SCREEN_SHOP) drawHud(state, best, true);
    drawBanner(state);
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,60,60,${state.flash * 0.28})`;
      ctx.fillRect(-20, -20, FIELD.width + 40, FIELD.height + 40);
    }
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_SHOP) drawShop(state);
    else if (screen === SCREEN_WIN) drawWin(state, best);
    else if (screen === SCREEN_OVER) drawOver(state, best);
    ctx.restore();
  }

  return { draw, toField, shopCardAt };
}
