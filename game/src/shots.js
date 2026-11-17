// The screenshot scenes behind ?shot=start|play|win|end. Each one plays the
// real rules forward from a fresh world, steered by an autopilot, so the frame
// is what a short game really looks like and the same seed always gives the
// same frame. The strong pilot dodges, shoots and collects; the weak pilot
// chases shards blindly and never fires, so it is caught out, as a hurried
// player is. The win scene plays the strong pilot through the waves and,
// if it falls short, stages the last shard of wave 8 and lets the pilot
// collect it through the real quota check.
import { FIELD, LIVES, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
const WIN_LIMIT_SECONDS = 640;

function nearest(list, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const item of list) {
    const dx = item.x - x;
    const dy = item.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = item;
    }
  }
  return best;
}

/** Strong pilot: collect shards, keep clear of enemies, shoot the nearest.
 * When the hull is hurt it detours for a repair cell first. */
function strongPilot(world) {
  const state = world.state;
  const p = state.player;
  const cell = p.hull < LIVES ? nearest(state.shards.filter((s) => s.kind === 'cell'), p.x, p.y) : null;
  const shard = cell ?? nearest(state.shards.filter((s) => s.kind === 'shard'), p.x, p.y);
  let mx = 0;
  let my = 0;
  if (shard) {
    mx = shard.x - p.x;
    my = shard.y - p.y;
  }
  // Repulsion from nearby enemies, stronger the closer they are.
  for (const e of state.enemies) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 150) {
      const w = (150 - d) / 150 * 2.2;
      mx += (dx / d) * w;
      my += (dy / d) * w;
    }
  }
  // Keep off the walls.
  if (p.x < 90) mx += 1.2;
  if (p.x > FIELD.width - 90) mx -= 1.2;
  if (p.y < 90) my += 1.2;
  if (p.y > FIELD.height - 90) my -= 1.2;
  const len = Math.hypot(mx, my) || 1;
  const enemy = nearest(state.enemies, p.x, p.y);
  const enemyD = enemy ? Math.hypot(enemy.x - p.x, enemy.y - p.y) : Infinity;
  return {
    mx: mx / len,
    my: my / len,
    aimX: enemy && enemyD < 430 ? enemy.x : p.x + mx,
    aimY: enemy && enemyD < 430 ? enemy.y : p.y + my,
    fire: enemyD < 420,
  };
}

/** Weak pilot: chase the nearest shard, ignore everything else, never fire. */
function weakPilot(world) {
  const state = world.state;
  const p = state.player;
  const shard = nearest(state.shards, p.x, p.y);
  if (!shard) return { mx: 0, my: 0, aimX: p.x, aimY: p.y - 10, fire: false };
  const dx = shard.x - p.x;
  const dy = shard.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  return { mx: dx / len, my: dy / len, aimX: shard.x, aimY: shard.y, fire: false };
}

function playFor(world, seconds, pilot) {
  let events = 0;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    events = world.step(STEP, pilot(world));
    if (events & (EVENT_OVER | EVENT_WIN)) break;
  }
  return events;
}

/**
 * Set `world` to the named scene (start, play, win or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'win' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, { mx: 0, my: 0, aimX: world.state.player.x, aimY: world.state.player.y - 10, fire: false });
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    const events = playFor(world, PLAY_SECONDS, strongPilot);
    if (events & EVENT_OVER) {
      // The pilot died early: re-stage a shorter, safer run.
      world.reset();
      playFor(world, 12, strongPilot);
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'win') {
    const events = playFor(world, WIN_LIMIT_SECONDS, strongPilot);
    if (events & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.score };
    // Fall back: keep the score the pilot earned, stage the last shard.
    const earned = world.state.score;
    world.stageWin();
    world.state.score = earned;
    playFor(world, 20, strongPilot);
    return { screen: SCREEN_WIN, best: world.state.score };
  }
  // end
  playFor(world, END_LIMIT_SECONDS, weakPilot);
  return { screen: SCREEN_OVER, best: world.state.score };
}
