// NOVA HARVEST v2 — the simulation. One fixed-step world: the harvester ship,
// star shards to collect, void drifters, mines and stingers to dodge or shoot,
// waves with a quota, a combo multiplier, and a boss at the end of wave 8.
// The world knows nothing about the screen or the input device: step() takes
// a control {mx, my, aimX, aimY, fire} and returns event bits.
import {
  BOSS,
  COMBO,
  DRIFTER,
  FIELD,
  LIVES,
  MINE,
  PLAYER,
  SCORE,
  SHARD,
  STEP,
  STINGER,
  WAVES_TOTAL,
  drifterSpeed,
  stingerSpeed,
  waveDrifters,
  waveMines,
  waveQuota,
  waveStingers,
} from './config.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WIN = 4;
export const EVENT_WAVE = 8;
export const EVENT_PICKUP = 16;
export const EVENT_KILL = 32;
export const EVENT_SHOOT = 64;
export const EVENT_BOSS_HIT = 128;
export const EVENT_BOSS_DIE = 256;

const TAU = Math.PI * 2;

function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const state = {
    time: 0,
    score: 0,
    combo: 1,
    comboTimer: 0,
    wave: 1,
    quota: waveQuota(1),
    collected: 0,
    shake: 0,
    flash: 0,
    muzzle: 0,
    banner: null,
    bannerTimer: 0,
    shardTimer: 0,
    boss: null,
    player: null,
    bullets: [],
    ebolts: [],
    shards: [],
    enemies: [],
    particles: [],
    floats: [],
    budget: { drifters: 0, mines: 0, stingers: 0 },
  };

  function farFromPlayer(x, y, minDist) {
    const dx = x - state.player.x;
    const dy = y - state.player.y;
    return dx * dx + dy * dy >= minDist * minDist;
  }

  function spawnShard() {
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 12; tries += 1) {
      x = random.range(40, FIELD.width - 40);
      y = random.range(40, FIELD.height - 40);
      if (farFromPlayer(x, y, 130)) break;
    }
    // One spawn in twenty is a repair cell: it restores one hull instead of
    // scoring, a small choice the player makes under pressure. Cells fade
    // out after a while so they never pile up on the field.
    const kind = random.next() < 0.05 ? 'cell' : 'shard';
    state.shards.push({ kind, x, y, phase: random.range(0, TAU), life: kind === 'cell' ? 14 : Infinity });
  }

  function edgePoint() {
    // A point on a field edge, away from the player.
    const edge = random.int(0, 3);
    let x = 0;
    let y = 0;
    if (edge === 0) {
      x = random.range(30, FIELD.width - 30);
      y = 24;
    } else if (edge === 1) {
      x = random.range(30, FIELD.width - 30);
      y = FIELD.height - 24;
    } else if (edge === 2) {
      x = 24;
      y = random.range(30, FIELD.height - 30);
    } else {
      x = FIELD.width - 24;
      y = random.range(30, FIELD.height - 30);
    }
    return { x, y };
  }

  function spawnEnemy(kind) {
    const { x, y } = edgePoint();
    if (!farFromPlayer(x, y, 220)) return false;
    if (kind === 'drifter') {
      state.enemies.push({
        kind,
        x,
        y,
        vx: 0,
        vy: 0,
        r: DRIFTER.radius,
        phase: random.range(0, TAU),
        speed: drifterSpeed(state.wave),
      });
    } else if (kind === 'stinger') {
      const angle = random.range(0, TAU);
      state.enemies.push({
        kind,
        x,
        y,
        vx: Math.cos(angle) * 40,
        vy: Math.sin(angle) * 40,
        r: STINGER.radius,
        phase: random.range(0, TAU),
        speed: stingerSpeed(state.wave),
        fireTimer: random.range(1.2, STINGER.fireEvery),
      });
    } else {
      const angle = random.range(0, TAU);
      state.enemies.push({
        kind,
        x,
        y,
        vx: Math.cos(angle) * MINE.drift,
        vy: Math.sin(angle) * MINE.drift,
        r: MINE.radius,
        phase: random.range(0, TAU),
        speed: MINE.drift,
      });
    }
    return true;
  }

  /** The Void Leviathan: the wave 8 boss. Huge, slow, many hull, and it
   * calls drifters to its side. Only its destruction ends the run. */
  function spawnBoss(hp) {
    const boss = {
      kind: 'boss',
      x: FIELD.width / 2,
      y: 110,
      vx: 0,
      vy: 0,
      r: BOSS.radius,
      phase: 0,
      speed: BOSS.speed,
      hp: hp ?? BOSS.hp,
      maxHp: hp ?? BOSS.hp,
      spawnTimer: BOSS.spawnEvery,
    };
    state.boss = boss;
    state.enemies.push(boss);
    return boss;
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.range(0, TAU);
      const v = random.range(speed * 0.3, speed);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: random.range(0.3, 0.7),
        maxLife: 0.7,
        color,
        size: random.range(2, 4.5),
      });
    }
  }

  function floatText(x, y, text, color) {
    state.floats.push({ x, y, text, color, life: 0.9 });
  }

  function addScore(base) {
    const gained = base * state.combo;
    state.score += gained;
    return gained;
  }

  function startWave(n) {
    state.wave = n;
    state.quota = waveQuota(n);
    state.collected = 0;
    state.enemies = [];
    state.bullets = [];
    state.ebolts = [];
    state.boss = null;
    state.budget.drifters = waveDrifters(n) * 2;
    state.budget.mines = waveMines(n) * 2;
    state.budget.stingers = waveStingers(n) * 2;
    state.shardTimer = 0;
    while (state.shards.length < SHARD.keepOnField) spawnShard();
    if (n >= WAVES_TOTAL) {
      spawnBoss();
      state.banner = { text: 'VOID LEVIATHAN', sub: 'Destroy the Leviathan to win' };
    } else {
      state.banner = { text: `WAVE ${n}`, sub: `Collect ${state.quota} shards` };
    }
    state.bannerTimer = 2.2;
  }

  function reset() {
    state.time = 0;
    state.score = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.shake = 0;
    state.flash = 0;
    state.muzzle = 0;
    state.banner = null;
    state.bannerTimer = 0;
    state.bullets = [];
    state.ebolts = [];
    state.shards = [];
    state.enemies = [];
    state.particles = [];
    state.floats = [];
    state.boss = null;
    state.player = {
      x: FIELD.width / 2,
      y: FIELD.height / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      hull: LIVES,
      invuln: 0,
      fireTimer: 0,
    };
    startWave(1);
  }

  /** Stage a near-win for the win screenshot: wave 8, the Leviathan at 1
   * hull placed near the ship, no other enemies. The win itself still comes
   * from the real boss-kill check when the pilot's shot lands. */
  function stageWin() {
    reset();
    state.wave = WAVES_TOTAL;
    state.quota = waveQuota(WAVES_TOTAL);
    state.collected = 0;
    state.enemies = [];
    state.bullets = [];
    state.ebolts = [];
    state.shards = [];
    state.budget.drifters = 0;
    state.budget.mines = 0;
    state.budget.stingers = 0;
    state.banner = null;
    state.bannerTimer = 0;
    const p = state.player;
    const boss = spawnBoss(1);
    boss.x = Math.min(FIELD.width - 80, p.x + 120);
    boss.y = p.y - 40;
  }

  function step(dt, ctrl) {
    let events = 0;
    const p = state.player;
    state.time += dt;
    if (state.bannerTimer > 0) {
      state.bannerTimer -= dt;
      if (state.bannerTimer <= 0) state.banner = null;
    }
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 2.2);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
    if (state.muzzle > 0) state.muzzle = Math.max(0, state.muzzle - dt);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 1;
    }

    // --- player ---
    p.vx += ctrl.mx * PLAYER.accel * dt;
    p.vy += ctrl.my * PLAYER.accel * dt;
    p.vx *= Math.pow(PLAYER.drag, dt * 60);
    p.vy *= Math.pow(PLAYER.drag, dt * 60);
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > PLAYER.maxSpeed) {
      p.vx = (p.vx / speed) * PLAYER.maxSpeed;
      p.vy = (p.vy / speed) * PLAYER.maxSpeed;
    }
    p.x = Math.min(FIELD.width - PLAYER.radius, Math.max(PLAYER.radius, p.x + p.vx * dt));
    p.y = Math.min(FIELD.height - PLAYER.radius, Math.max(PLAYER.radius, p.y + p.vy * dt));
    p.angle = Math.atan2(ctrl.aimY - p.y, ctrl.aimX - p.x);
    if (p.invuln > 0) p.invuln -= dt;
    p.fireTimer -= dt;
    if (ctrl.fire && p.fireTimer <= 0) {
      p.fireTimer = PLAYER.fireCooldown;
      const bx = p.x + Math.cos(p.angle) * (PLAYER.radius + 6);
      const by = p.y + Math.sin(p.angle) * (PLAYER.radius + 6);
      state.bullets.push({
        x: bx,
        y: by,
        vx: Math.cos(p.angle) * PLAYER.bulletSpeed,
        vy: Math.sin(p.angle) * PLAYER.bulletSpeed,
        life: PLAYER.bulletRange / PLAYER.bulletSpeed,
      });
      state.muzzle = 0.08;
      events |= EVENT_SHOOT;
    }

    // --- bullets ---
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const b = state.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < 0 || b.x > FIELD.width || b.y < 0 || b.y > FIELD.height) {
        state.bullets.splice(i, 1);
      }
    }

    // --- enemy bolts ---
    for (let i = state.ebolts.length - 1; i >= 0; i -= 1) {
      const b = state.ebolts[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) {
        state.ebolts.splice(i, 1);
      }
    }

    // --- shards ---
    state.shardTimer -= dt;
    if (state.shardTimer <= 0) {
      state.shardTimer = SHARD.spawnEvery;
      if (state.shards.length < SHARD.keepOnField + 2) spawnShard();
    }
    for (let i = state.shards.length - 1; i >= 0; i -= 1) {
      const s = state.shards[i];
      s.phase += dt * 2.4;
      if (s.life !== Infinity) {
        s.life -= dt;
        if (s.life <= 0) state.shards.splice(i, 1);
      }
    }

    // --- enemies ---
    const wantDrifters = Math.min(waveDrifters(state.wave), state.budget.drifters);
    const wantMines = Math.min(waveMines(state.wave), state.budget.mines);
    const wantStingers = Math.min(waveStingers(state.wave), state.budget.stingers);
    const haveDrifters = state.enemies.filter((e) => e.kind === 'drifter').length;
    const haveMines = state.enemies.filter((e) => e.kind === 'mine').length;
    const haveStingers = state.enemies.filter((e) => e.kind === 'stinger').length;
    if (haveDrifters < wantDrifters && spawnEnemy('drifter')) state.budget.drifters -= 1;
    if (haveMines < wantMines && spawnEnemy('mine')) state.budget.mines -= 1;
    if (haveStingers < wantStingers && spawnEnemy('stinger')) state.budget.stingers -= 1;
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      e.phase += dt * 2;
      if (e.kind === 'drifter') {
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const wobble = Math.sin(e.phase * 1.7) * 0.5;
        const ax = dx / d + -dy / d * wobble;
        const ay = dy / d + dx / d * wobble;
        e.vx += ax * e.speed * 2.4 * dt;
        e.vy += ay * e.speed * 2.4 * dt;
        const sp = Math.hypot(e.vx, e.vy);
        if (sp > e.speed) {
          e.vx = (e.vx / sp) * e.speed;
          e.vy = (e.vy / sp) * e.speed;
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      } else if (e.kind === 'stinger') {
        // Keep a stalking distance and spit a bolt at the harvester.
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const want = d < 170 ? -1 : 1;
        e.vx += (dx / d) * want * e.speed * 1.6 * dt;
        e.vy += (dy / d) * want * e.speed * 1.6 * dt;
        const sp = Math.hypot(e.vx, e.vy);
        if (sp > e.speed) {
          e.vx = (e.vx / sp) * e.speed;
          e.vy = (e.vy / sp) * e.speed;
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.x = Math.min(FIELD.width - e.r, Math.max(e.r, e.x));
        e.y = Math.min(FIELD.height - e.r, Math.max(e.r, e.y));
        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && d < 460) {
          e.fireTimer = STINGER.fireEvery;
          state.ebolts.push({
            x: e.x,
            y: e.y,
            vx: (dx / d) * STINGER.boltSpeed,
            vy: (dy / d) * STINGER.boltSpeed,
            r: STINGER.boltRadius,
            life: 5,
          });
        }
      } else if (e.kind === 'boss') {
        // The Leviathan lumbers after the harvester and calls escorts.
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        e.vx += (dx / d) * e.speed * 1.2 * dt;
        e.vy += (dy / d) * e.speed * 1.2 * dt;
        const sp = Math.hypot(e.vx, e.vy);
        if (sp > e.speed) {
          e.vx = (e.vx / sp) * e.speed;
          e.vy = (e.vy / sp) * e.speed;
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.x = Math.min(FIELD.width - e.r, Math.max(e.r, e.x));
        e.y = Math.min(FIELD.height - e.r, Math.max(e.r, e.y));
        e.spawnTimer -= dt;
        if (e.spawnTimer <= 0) {
          e.spawnTimer = BOSS.spawnEvery;
          const escorts = state.enemies.filter((o) => o.kind === 'drifter').length;
          if (escorts < BOSS.maxEscorts) {
            const a = random.range(0, TAU);
            state.enemies.push({
              kind: 'drifter',
              x: Math.min(FIELD.width - 30, Math.max(30, e.x + Math.cos(a) * 70)),
              y: Math.min(FIELD.height - 30, Math.max(30, e.y + Math.sin(a) * 70)),
              vx: 0,
              vy: 0,
              r: DRIFTER.radius,
              phase: random.range(0, TAU),
              speed: drifterSpeed(state.wave),
            });
          }
        }
      } else {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (e.x < e.r || e.x > FIELD.width - e.r) e.vx *= -1;
        if (e.y < e.r || e.y > FIELD.height - e.r) e.vy *= -1;
        e.x = Math.min(FIELD.width - e.r, Math.max(e.r, e.x));
        e.y = Math.min(FIELD.height - e.r, Math.max(e.r, e.y));
      }
    }

    // --- particles & floats ---
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.96;
      pt.vy *= 0.96;
      pt.life -= dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floats.length - 1; i >= 0; i -= 1) {
      const f = state.floats[i];
      f.y -= 34 * dt;
      f.life -= dt;
      if (f.life <= 0) state.floats.splice(i, 1);
    }

    // --- bullets vs enemies ---
    for (let bi = state.bullets.length - 1; bi >= 0; bi -= 1) {
      const b = state.bullets[bi];
      let spent = false;
      for (let ei = state.enemies.length - 1; ei >= 0; ei -= 1) {
        const e = state.enemies[ei];
        const rr = e.r + 5;
        if (dist2(b, e) < rr * rr) {
          if (e.kind === 'boss') {
            e.hp -= 1;
            state.shake = Math.max(state.shake, 3);
            burst(e.x, e.y, '#ff9d45', 6, 140);
            floatText(e.x, e.y - e.r - 6, `-${1}`, '#ffb4b4');
            events |= EVENT_BOSS_HIT;
            if (e.hp <= 0) {
              const gained = addScore(SCORE.boss);
              floatText(e.x, e.y, `+${gained}`, '#ffd166');
              burst(e.x, e.y, '#ff9d45', 60, 320);
              burst(e.x, e.y, '#c77dff', 40, 240);
              state.shake = 14;
              state.flash = 0.5;
              state.boss = null;
              state.enemies.splice(ei, 1);
              state.combo = Math.min(COMBO.max, state.combo + 1);
              state.comboTimer = COMBO.window;
              events |= EVENT_BOSS_DIE;
              if (state.wave >= WAVES_TOTAL) {
                events |= EVENT_WIN;
                return events;
              }
            }
          } else {
            const base = e.kind === 'drifter' ? SCORE.drifter : e.kind === 'stinger' ? SCORE.stinger : SCORE.mine;
            const gained = addScore(base);
            floatText(e.x, e.y - 14, `+${gained}`, '#ffd166');
            burst(e.x, e.y, e.kind === 'drifter' ? '#c77dff' : e.kind === 'stinger' ? '#ff5da2' : '#ff6b6b', 14, 170);
            state.enemies.splice(ei, 1);
            state.combo = Math.min(COMBO.max, state.combo + 1);
            state.comboTimer = COMBO.window;
            events |= EVENT_KILL;
          }
          spent = true;
          break;
        }
      }
      if (spent) state.bullets.splice(bi, 1);
    }

    // --- player vs shards ---
    for (let i = state.shards.length - 1; i >= 0; i -= 1) {
      const s = state.shards[i];
      const rr = PLAYER.radius + SHARD.radius + 4;
      if (dist2(p, s) < rr * rr) {
        state.shards.splice(i, 1);
        if (s.kind === 'cell') {
          p.hull = Math.min(LIVES, p.hull + 1);
          floatText(p.x, p.y - 22, '+1 HULL', '#7dff9e');
          burst(p.x, p.y, '#7dff9e', 10, 120);
        } else {
          const gained = addScore(SCORE.shard);
          floatText(s.x, s.y - 12, `+${gained}`, '#7de3ff');
          burst(s.x, s.y, '#7de3ff', 10, 130);
          state.combo = Math.min(COMBO.max, state.combo + 1);
          state.comboTimer = COMBO.window;
          state.collected += 1;
          events |= EVENT_PICKUP;
          // Wave 8 is the boss fight: shards still score, but only the
          // Leviathan's destruction ends the run.
          if (state.wave < WAVES_TOTAL && state.collected >= state.quota) {
            const bonus = SCORE.waveBonus * state.wave;
            state.score += bonus;
            floatText(p.x, p.y - 26, `WAVE BONUS +${bonus}`, '#ffd166');
            events |= EVENT_WAVE;
            startWave(state.wave + 1);
            return events;
          }
        }
      }
    }

    // --- player vs enemies ---
    if (p.invuln <= 0) {
      for (const e of state.enemies) {
        const rr = PLAYER.radius + e.r - 2;
        if (dist2(p, e) < rr * rr) {
          p.hull -= 1;
          p.invuln = PLAYER.invulnSeconds;
          state.shake = 10;
          state.flash = 0.7;
          state.combo = 1;
          state.comboTimer = 0;
          burst(p.x, p.y, '#ff6b6b', 18, 220);
          events |= EVENT_HIT;
          if (p.hull <= 0) events |= EVENT_OVER;
          break;
        }
      }
    }

    // --- player vs enemy bolts ---
    if (p.invuln <= 0) {
      for (let i = state.ebolts.length - 1; i >= 0; i -= 1) {
        const b = state.ebolts[i];
        const rr = PLAYER.radius + b.r - 1;
        if (dist2(p, b) < rr * rr) {
          state.ebolts.splice(i, 1);
          p.hull -= 1;
          p.invuln = PLAYER.invulnSeconds;
          state.shake = 10;
          state.flash = 0.7;
          state.combo = 1;
          state.comboTimer = 0;
          burst(p.x, p.y, '#ff6b6b', 18, 220);
          events |= EVENT_HIT;
          if (p.hull <= 0) events |= EVENT_OVER;
          break;
        }
      }
    }

    return events;
  }

  reset();

  return { state, reset, step, startWave, stageWin };
}
