// NOVA HARVEST — boot and the one loop. Input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast
// one), and the renderer paints what is there. The game moves between six
// screens: title, play, shop, paused, win and game over.
//
// ?seed=N fixes the field's pattern. ?shot=start|play|win|shop (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BOSS_DIE, EVENT_BOSS_HIT, EVENT_BUY, EVENT_HIT, EVENT_KILL, EVENT_OVER, EVENT_PICKUP, EVENT_SHOOT, EVENT_SHOP_OPEN, EVENT_STINGER_SHOT, EVENT_WAVE, EVENT_WIN } from './world.js';
import { ACTION_BUY_1, ACTION_BUY_2, ACTION_BUY_3, ACTION_BUY_4, ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_SHOP, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    audio.click();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Collect the shards to clear the wave.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) {
      audio.win();
      announce(`Harvest complete. Score ${world.state.score}. Best ${best}.`);
    } else {
      audio.lose();
      announce(`Game over. Score ${world.state.score}. Best ${best}.`);
    }
  }

  function launchWave() {
    world.closeShop();
    audio.waveHorn();
    if (world.state.wave >= 8) audio.roar();
    screen = SCREEN_PLAY;
    announce(`Wave ${world.state.wave}. Collect the shards to clear the wave.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      audio.setMuted(!audio.isMuted());
      announce(audio.isMuted() ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_SHOP) {
      // Shop keys 1-4 buy; a click on a card buys it too.
      const buys = [
        [ACTION_BUY_1, 0],
        [ACTION_BUY_2, 1],
        [ACTION_BUY_3, 2],
        [ACTION_BUY_4, 3],
      ];
      for (const [bit, index] of buys) {
        if (actions & bit) {
          if (world.buyUpgrade(index)) {
            audio.buy();
            announce('Upgrade bought.');
          } else {
            audio.click();
          }
        }
      }
      if (actions & ACTION_CONFIRM) {
        const mouse = input.mouse();
        const field = renderer.toField(mouse.x, mouse.y);
        const card = renderer.shopCardAt(field.x, field.y);
        if (card >= 0) {
          if (world.buyUpgrade(card)) {
            audio.buy();
            announce('Upgrade bought.');
          } else {
            audio.click();
          }
          return;
        }
        launchWave();
      }
      return;
    }
    if (actions & ACTION_RESTART && (screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function playSounds(events) {
    if (events & EVENT_SHOOT) audio.shoot();
    if (events & EVENT_PICKUP) audio.pickup(world.state.combo);
    if (events & EVENT_KILL) audio.killKind(world.state.lastKill);
    if (events & EVENT_HIT) audio.hit();
    if (events & EVENT_WAVE) audio.waveClear();
    if (events & EVENT_BOSS_HIT) audio.bossHit();
    if (events & EVENT_BOSS_DIE) audio.bossDie();
    if (events & EVENT_BUY) audio.buy();
    if (events & EVENT_STINGER_SHOT) audio.stingerShoot();
    if (events & EVENT_SHOP_OPEN) {
      audio.shopOpen();
      if (world.state.shop?.wave >= 8) audio.roar();
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // The title screen lives: shards drift and the field simmers behind it.
      world.step(STEP, { mx: 0, my: 0, aimX: world.state.player.x, aimY: world.state.player.y - 10, fire: false });
      return;
    }
    if (screen === SCREEN_SHOP) {
      // The shop simmers: the world only advances its ambience.
      world.step(STEP, { mx: 0, my: 0, aimX: world.state.player.x, aimY: world.state.player.y - 10, fire: false });
      return;
    }
    const mouse = input.mouse();
    const aim = renderer.toField(mouse.x, mouse.y);
    const dir = input.direction();
    const events = world.step(STEP, { mx: dir.x, my: dir.y, aimX: aim.x, aimY: aim.y, fire: input.firing() });
    playSounds(events);
    if (world.state.shop) {
      screen = SCREEN_SHOP;
      // Drop the click that cleared the wave: it must not launch the next
      // wave before the player has seen the shop.
      input.takeActions();
      announce(`Wave cleared. Upgrade shop open. Salvage ${world.state.salvage}.`);
      return;
    }
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
    else if (events & EVENT_HIT) {
      announce(world.state.player.hull === 1 ? 'Hit. 1 hull left.' : `Hit. ${world.state.player.hull} hull left.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY || screen === SCREEN_SHOP) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY || screen === SCREEN_SHOP)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting drifters close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Nova Harvest. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
