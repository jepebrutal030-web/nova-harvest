// NOVA HARVEST — tuning constants. One place holds every number the game
// balances on, so a tweak here retunes the whole game without touching logic.
export const STEP = 1 / 60;
export const FIELD = { width: 960, height: 600 };
export const BEST_KEY = 'nova-harvest-best';
export const LIVES = 3;
export const WAVES_TOTAL = 8;

/** Shards to collect to clear wave n (1-based). */
export function waveQuota(wave) {
  return 5 + 2 * wave;
}
/** Drifters alive at once on wave n. */
export function waveDrifters(wave) {
  return 2 + wave;
}
/** Mines alive at once on wave n. */
export function waveMines(wave) {
  return 1 + Math.floor(wave / 2);
}
/** Drifter top speed on wave n. */
export function drifterSpeed(wave) {
  return 62 + wave * 8;
}

export const PLAYER = {
  radius: 14,
  accel: 1500,
  maxSpeed: 270,
  drag: 0.86,
  fireCooldown: 0.16,
  bulletSpeed: 540,
  bulletRange: 460,
  invulnSeconds: 1.4,
};

export const SHARD = {
  radius: 10,
  points: 50,
  keepOnField: 6,
  spawnEvery: 0.9,
};

export const DRIFTER = { radius: 16, points: 100 };
export const MINE = { radius: 14, points: 75, drift: 34 };

export const COMBO = {
  window: 3.0,
  max: 5,
  /** Seconds of combo meter shown per pickup. */
  meter: 3.0,
};

export const SCORE = {
  waveBonus: 100,
  shard: 50,
  drifter: 100,
  mine: 75,
};
