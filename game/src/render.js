// NOVA HARVEST — everything the player sees. One canvas, one palette: deep
// space, neon cyan and gold against void magenta. The HUD, the title, the
// win and game-over screens are all drawn here, so a screenshot of the
// canvas is a screenshot of the whole game.
import { COMBO, FIELD, LIVES, PLAYER, SHARD, WAVES_TOTAL } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

const TAU = Math.PI * 2;
const INK = '#e8f6ff';
const DIM = '#9db8d6';
const GOLD = '#ffd166';
const CYAN = '#38e1ff';
const MAGENTA = '#c77dff';
const RED = '#ff6b6b';
const GREEN = '#7dff9e';

function font(weight, px) {
  return `${weight} ${px}px "Arial Black", "Segoe UI", Arial, sans-serif`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  // A fixed starfield, seeded once so the sky never flickers between frames.
  const stars = [];
  let seed = 1337;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let i = 0; i < 130; i += 1) {
    stars.push({
      x: rnd() * FIELD.width,
      y: rnd() * FIELD.height,
      r: rnd() * 1.6 + 0.4,
      layer: rnd(),
      tw: rnd() * TAU,
    });
  }
  const nebulae = [
    { x: 180, y: 130, r: 260, color: '123,47,190' },
    { x: 780, y: 420, r: 300, color: '13,110,120' },
    { x: 620, y: 90, r: 200, color: '160,20,90' },
    { x: 120, y: 500, r: 190, color: '20,60,140' },
  ];

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
      const rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      rg.addColorStop(0, `rgba(${n.color},0.20)`);
      rg.addColorStop(1, `rgba(${n.color},0)`);
      ctx.fillStyle = rg;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    for (const s of stars) {
      const drift = time * (4 + s.layer * 10);
      const x = ((s.x + drift) % FIELD.width + FIELD.width) % FIELD.width;
      const alpha = 0.35 + 0.4 * Math.abs(Math.sin(time * 0.8 + s.tw));
      ctx.globalAlpha = alpha * (0.5 + s.layer * 0.5);
      ctx.fillStyle = s.layer > 0.66 ? '#cfe9ff' : '#8fb4d8';
      ctx.beginPath();
      ctx.arc(x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
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

  function drawEnemy(e) {
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

  function drawPlayer(p, time) {
    ctx.save();
    ctx.translate(p.x, p.y);
    const blink = p.invuln > 0 && Math.floor(time * 14) % 2 === 0;
    ctx.globalAlpha = blink ? 0.35 : 1;
    // Engine flame.
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
    // Hull: a swept dart.
    ctx.fillStyle = '#0e7490';
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(11, 10);
    ctx.lineTo(0, 5);
    ctx.lineTo(-11, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ecfeff';
    ctx.beginPath();
    ctx.arc(0, -4, 3.4, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best) {
    const pad = 16;
    ctx.textBaseline = 'alphabetic';
    // Top-left: score.
    ctx.textAlign = 'left';
    ctx.fillStyle = DIM;
    ctx.font = font(400, 13);
    ctx.fillText('SCORE', pad, 26);
    ctx.fillStyle = INK;
    ctx.font = font(900, 26);
    ctx.fillText(String(state.score), pad, 54);
    ctx.fillStyle = DIM;
    ctx.font = font(400, 12);
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, pad, 74);
    // Top-centre: wave + quota bar.
    ctx.textAlign = 'center';
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
    // Top-right: hull hearts.
    ctx.textAlign = 'right';
    for (let i = 0; i < LIVES; i += 1) {
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
      ctx.fillText(`COMBO x${state.combo}`, pad, 100);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(pad, 108, 120, 6);
      ctx.fillStyle = GOLD;
      ctx.fillRect(pad, 108, 120 * Math.max(0, state.comboTimer / COMBO.window), 6);
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
    ctx.shadowColor = CYAN;
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

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(4,6,18,0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const cx = FIELD.width / 2;
    ctx.textAlign = 'center';
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
    panel(cx - 250, 318, 500, 132);
    ctx.fillStyle = INK;
    ctx.font = font(400, 16);
    ctx.fillText('WASD / Arrows — fly the harvester', cx, 348);
    ctx.fillText('Mouse — aim    Click / Space — fire', cx, 376);
    ctx.fillText('Fill the shard quota to clear each wave', cx, 404);
    ctx.fillText('Green cells repair 1 hull  ·  P pause  ·  M mute', cx, 428);
    if (best > 0) {
      ctx.fillStyle = GOLD;
      ctx.font = font(900, 18);
      ctx.fillText(`BEST ${best}`, cx, 482);
    }
    // A slow pulse, never fully off: the start prompt must read in a still frame.
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.fillStyle = CYAN;
    ctx.font = font(900, 22);
    ctx.fillText('CLICK OR PRESS SPACE TO START', cx, 532);
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

  function drawWin(state, best) {
    ctx.fillStyle = 'rgba(4,6,18,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const cx = FIELD.width / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD;
    ctx.font = font(900, 54);
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 26;
    ctx.fillText('HARVEST COMPLETE!', cx, 190);
    ctx.shadowBlur = 0;
    ctx.fillStyle = INK;
    ctx.font = font(400, 19);
    ctx.fillText('All 8 waves cleared. The nebula is yours.', cx, 228);
    ctx.fillStyle = DIM;
    ctx.font = font(400, 15);
    ctx.fillText('FINAL SCORE', cx, 292);
    ctx.fillStyle = INK;
    ctx.font = font(900, 56);
    ctx.fillText(String(state.score), cx, 348);
    ctx.fillStyle = best > state.score ? DIM : GOLD;
    ctx.font = font(900, 18);
    ctx.fillText(best > state.score ? `BEST ${best}` : 'NEW BEST!', cx, 386);
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.fillStyle = CYAN;
    ctx.font = font(900, 20);
    ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', cx, 452);
    ctx.globalAlpha = 1;
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(20,4,10,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const cx = FIELD.width / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = RED;
    ctx.font = font(900, 54);
    ctx.shadowColor = RED;
    ctx.shadowBlur = 26;
    ctx.fillText('SIGNAL LOST', cx, 190);
    ctx.shadowBlur = 0;
    ctx.fillStyle = INK;
    ctx.font = font(400, 19);
    ctx.fillText(`The void took the harvester on wave ${state.wave}.`, cx, 228);
    ctx.fillStyle = DIM;
    ctx.font = font(400, 15);
    ctx.fillText('SCORE', cx, 292);
    ctx.fillStyle = INK;
    ctx.font = font(900, 56);
    ctx.fillText(String(state.score), cx, 348);
    ctx.fillStyle = DIM;
    ctx.font = font(900, 18);
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, cx, 386);
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.fillStyle = CYAN;
    ctx.font = font(900, 20);
    ctx.fillText('PRESS R OR CLICK TO TRY AGAIN', cx, 452);
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
    if (state.player && screen !== SCREEN_TITLE) drawPlayer(state.player, state.time);
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, TAU);
      ctx.fill();
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
    drawBanner(state);
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,60,60,${state.flash * 0.28})`;
      ctx.fillRect(-20, -20, FIELD.width + 40, FIELD.height + 40);
    }
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_WIN) drawWin(state, best);
    else if (screen === SCREEN_OVER) drawOver(state, best);
    ctx.restore();
  }

  return { draw, toField };
}
