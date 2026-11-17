// NOVA HARVEST v2 — tuning constants. One place holds every number the game
// balances on, so a tweak here retunes the whole game without touching logic.
// v2 adds the Void Leviathan (wave 8 boss) and Stingers (shooters, wave 3+).
export const STEP = 1 / 60;
export const FIELD = { width: 960, height: 600 };
export const BEST_KEY = 'nova-harvest-best';
export const LIVES = 3;
export const WAVES_TOTAL = 8;

/** Shards to collect to clear wave n (1-based). Wave 8 is the boss fight. */
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
/** Stingers alive at once on wave n. None before wave 3. */
export function waveStingers(wave) {
  if (wave < 3) return 0;
  return 1 + Math.floor((wave - 3) / 2);
}
/** Drifter top speed on wave n. */
export function drifterSpeed(wave) {
  return 62 + wave * 8;
}
/** Stinger top speed on wave n. */
export function stingerSpeed(wave) {
  return 52 + wave * 6;
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
export const STINGER = {
  radius: 13,
  points: 150,
  fireEvery: 2.6,
  boltSpeed: 135,
  boltRadius: 6,
};
/** The Void Leviathan: wave 8 boss. Slow, huge, spawns drifters, and only
 * its destruction ends the run. */
export const BOSS = {
  radius: 44,
  hp: 30,
  points: 2000,
  speed: 42,
  spawnEvery: 7,
  maxEscorts: 3,
};

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
  stinger: 150,
  boss: 2000,
};
