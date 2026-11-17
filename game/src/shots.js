// The screenshot scenes behind ?shot=start|play|win|shop. Each one plays the
// real rules forward from a fresh world, steered by an autopilot, so the frame
// is what a short game really looks like and the same seed always gives the
// same frame. The strong pilot dodges, shoots and collects; on wave 8 it
// hunts the Leviathan instead of shards; in the shop it buys the best upgrade
// it can afford, then launches the next wave. The weak pilot chases shards
// blindly and never fires, so it is caught out, as a hurried player is. The
// win scene plays the strong pilot through the waves and, if it falls short,
// stages the Leviathan at 1 hull and lets the pilot finish it through the
// real boss-kill check. The play scene is the boss fight itself: the pilot
// fights through to wave 8 and the frame catches the Leviathan mid-battle.
import { FIELD, LIVES, STEP, UPGRADES } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_SHOP, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_LIMIT_SECONDS = 400;
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

/** Strong pilot: collect shards, keep clear of enemies and their bolts, shoot
 * the nearest threat. When the hull is hurt it detours for a repair cell
 * first. On wave 8 the Leviathan is the target, not the shards. */
function strongPilot(world) {
  const state = world.state;
  const p = state.player;
  const boss = state.boss;
  const cell = p.hull < LIVES ? nearest(state.shards.filter((s) => s.kind === 'cell'), p.x, p.y) : null;
  const shard = cell ?? nearest(state.shards.filter((s) => s.kind === 'shard'), p.x, p.y);
  let mx = 0;
  let my = 0;
  if (boss) {
    // Hunt the Leviathan: close in, but keep out of its crushing radius.
    const dx = boss.x - p.x;
    const dy = boss.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > 260) {
      mx = dx / d;
      my = dy / d;
    } else if (d < 150) {
      mx = -dx / d;
      my = -dy / d;
    }
  } else if (shard) {
    mx = shard.x - p.x;
    my = shard.y - p.y;
  }
  // Repulsion from nearby enemies, stronger the closer they are. Weavers
  // about to dash get extra room.
  for (const e of state.enemies) {
    if (e.kind === 'boss') continue;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const radius = e.kind === 'weaver' && e.mode === 'tele' ? 200 : 150;
    if (d < radius) {
      const w = (radius - d) / radius * 2.2;
      mx += (dx / d) * w;
      my += (dy / d) * w;
    }
  }
  // Repulsion from incoming bolts: step aside, hard, while they are close.
  for (const b of state.ebolts) {
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 110) {
      const w = (110 - d) / 110 * 3.0;
      // Dodge perpendicular to the bolt's path, not just away from it.
      const px = -b.vy;
      const py = b.vx;
      const pl = Math.hypot(px, py) || 1;
      const side = (dx * px + dy * py) / (d * pl) >= 0 ? 1 : -1;
      mx += (px / pl) * w * side + (dx / d) * w * 0.6;
      my += (py / pl) * w * side + (dy / d) * w * 0.6;
    }
  }
  // Keep off the walls.
  if (p.x < 90) mx += 1.2;
  if (p.x > FIELD.width - 90) mx -= 1.2;
  if (p.y < 90) my += 1.2;
  if (p.y > FIELD.height - 90) my -= 1.2;
  const len = Math.hypot(mx, my) || 1;
  const enemy = boss ?? nearest(state.enemies, p.x, p.y);
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

/** The strong pilot's shop visit: one purchase, best value first (damage,
 * then fire rate, then magnet, then hull), then launch the next wave. */
function strongShop(world) {
  const state = world.state;
  const order = ['damage', 'fire', 'magnet', 'shield'];
  for (const id of order) {
    const index = UPGRADES.findIndex((u) => u.id === id);
    const def = UPGRADES[index];
    const level = state.upgrades[id];
    if (level < def.costs.length && state.salvage >= def.costs[level]) {
      world.buyUpgrade(index);
      break;
    }
  }
  world.closeShop();
}

function playFor(world, seconds, pilot, shopHandler) {
  let events = 0;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.state.shop) {
      if (shopHandler) shopHandler(world);
      else world.closeShop();
      continue;
    }
    events = world.step(STEP, pilot(world));
    if (events & (EVENT_OVER | EVENT_WIN)) break;
  }
  return events;
}

/**
 * Set `world` to the named scene (start, play, win, shop or end; any other
 * name is start) and return the screen to draw over it and the best score to
 * show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'win' && name !== 'end' && name !== 'shop') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, { mx: 0, my: 0, aimX: world.state.player.x, aimY: world.state.player.y - 10, fire: false });
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'shop') {
    // Play until the shop before wave 4 opens, buying along the way, so the
    // frame shows a real balance, owned upgrades and affordable cards —
    // not the near-empty till of the first shop.
    const steps = Math.floor(240 / STEP);
    for (let i = 0; i < steps; i += 1) {
      if (world.state.shop && world.state.shop.wave >= 4) break;
      if (world.state.shop) {
        strongShop(world);
        continue;
      }
      const events = world.step(STEP, strongPilot(world));
      if (events & (EVENT_OVER | EVENT_WIN)) break;
    }
    if (!world.state.shop) {
      // The pilot died on the way: retry once, holding the first shop open.
      world.reset();
      const retry = Math.floor(120 / STEP);
      for (let i = 0; i < retry; i += 1) {
        if (world.state.shop) break;
        const events = world.step(STEP, strongPilot(world));
        if (events & (EVENT_OVER | EVENT_WIN)) break;
      }
    }
    return { screen: SCREEN_SHOP, best: world.state.score };
  }
  if (name === 'play') {
    // Fight through to wave 8, then catch the Leviathan mid-battle: stop
    // the moment its hull first drops to 20 or below, so the frame shows
    // the boss hurt but alive, bullets in flight, the HP bar half gone.
    let reached = false;
    const steps = Math.floor(PLAY_LIMIT_SECONDS / STEP);
    for (let i = 0; i < steps; i += 1) {
      if (world.state.shop) {
        strongShop(world);
        continue;
      }
      if (world.state.boss) {
        reached = true;
        break;
      }
      const events = world.step(STEP, strongPilot(world));
      if (events & (EVENT_OVER | EVENT_WIN)) break;
    }
    if (reached) {
      for (let i = 0; i < Math.floor(10 / STEP); i += 1) {
        if (!world.state.boss) break;
        if (world.state.boss.hp <= 20) break;
        const events = world.step(STEP, strongPilot(world));
        if (events & (EVENT_OVER | EVENT_WIN)) break;
      }
    } else {
      // The pilot died early: re-stage a shorter, safer run.
      world.reset();
      playFor(world, 30, strongPilot, strongShop);
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'win') {
    const events = playFor(world, WIN_LIMIT_SECONDS, strongPilot, strongShop);
    if (events & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.score };
    // Fall back: keep the score the pilot earned, stage the Leviathan at 1
    // hull and let the pilot finish it through the real boss-kill check.
    const earned = world.state.score;
    world.stageWin();
    world.state.score = earned;
    playFor(world, 20, strongPilot, strongShop);
    return { screen: SCREEN_WIN, best: world.state.score };
  }
  // end
  playFor(world, END_LIMIT_SECONDS, weakPilot, null);
  return { screen: SCREEN_OVER, best: world.state.score };
}

// Headless tests drive the same pilots through the real world.
export { strongPilot, weakPilot, strongShop, playFor };
