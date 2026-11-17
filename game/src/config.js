// NOVA HARVEST v3 — tuning constants. One place holds every number the game
// balances on, so a tweak here retunes the whole game without touching logic.
// v3 adds the between-wave upgrade shop (salvage currency), two new enemies
// (Weaver chargers, Splitter splitters) and per-wave modifiers.
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
/** Weavers alive at once on wave n. None before wave 4. */
export function waveWeavers(wave) {
  if (wave < 4) return 0;
  return 1 + Math.floor((wave - 4) / 2);
}
/** Splitters alive at once on wave n. None before wave 5. */
export function waveSplitters(wave) {
  if (wave < 5) return 0;
  return 1 + Math.floor((wave - 5) / 3);
}
/** Drifter top speed on wave n. */
export function drifterSpeed(wave) {
  return 62 + wave * 8;
}
/** Stinger top speed on wave n. */
export function stingerSpeed(wave) {
  return 52 + wave * 6;
}
/** Weaver cruise speed on wave n. */
export function weaverSpeed(wave) {
  return 120 + wave * 8;
}
/** Splitter top speed on wave n. */
export function splitterSpeed(wave) {
  return 36 + wave * 3;
}

/** Late-wave twists. Each one changes the spawns or the danger of its wave
 * and is announced in the wave banner and the HUD. */
export function waveModifier(wave) {
  if (wave === 5) return { id: 'swarm', name: 'DRIFTER SWARM', sub: 'Drifters hunt in packs' };
  if (wave === 6) return { id: 'minefield', name: 'MINEFIELD', sub: 'Mines everywhere' };
  if (wave === 7) return { id: 'storm', name: 'STINGER STORM', sub: 'Stingers fire faster' };
  return null;
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
  /** Extra shard pickup reach per magnet level. */
  magnetPerLevel: 55,
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
/** The Weaver: a fast charger. It stalks, flashes a telegraph, then dashes
 * straight at the harvester. One hit kills it, if you see it coming. */
export const WEAVER = {
  radius: 12,
  points: 125,
  telegraph: 0.5,
  dashTime: 0.45,
  dashSpeed: 380,
  cooldown: 1.6,
};
/** The Splitter: a big slow rock with 2 hull. Killing it bursts it into two
 * drifters, so it is a bad idea to shoot it when you are already crowded. */
export const SPLITTER = { radius: 22, points: 200, hp: 2 };
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
  weaver: 125,
  splitter: 200,
  boss: 2000,
};

/** Salvage: the shop currency. Kills pay it; the quota shards do not. */
export const SALVAGE = {
  drifter: 10,
  mine: 8,
  stinger: 15,
  weaver: 12,
  splitter: 20,
  boss: 100,
};

/** The between-wave shop. Four upgrade tracks, each with its own costs.
 * A level is bought at most once per shop visit is not enforced: the player
 * may buy several levels at once if the salvage is there. */
export const UPGRADES = [
  {
    id: 'damage',
    key: '1',
    name: 'NOVA CANNON',
    desc: 'Bullets deal +1 damage',
    costs: [50, 100, 180],
  },
  {
    id: 'fire',
    key: '2',
    name: 'RAPID CYCLER',
    desc: 'Fire rate +33% per level',
    costs: [50, 110],
  },
  {
    id: 'shield',
    key: '3',
    name: 'AEGIS PLATING',
    desc: '+1 max hull, restore 1 hull',
    costs: [70, 140],
  },
  {
    id: 'magnet',
    key: '4',
    name: 'TRACTOR COIL',
    desc: 'Shards pulled from further away',
    costs: [40, 90],
  },
];

/** Bullet damage at damage level n. */
export function bulletDamage(level) {
  return 1 + level;
}
/** Fire cooldown at fire-rate level n. */
export function fireCooldown(level) {
  return [0.16, 0.12, 0.09][level] ?? 0.09;
}
/** Shard pickup reach bonus at magnet level n. */
export function magnetBonus(level) {
  return level * PLAYER.magnetPerLevel;
}
