# NOVA HARVEST

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/jepebrutal030-web/nova-harvest/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/jepebrutal030-web/nova-harvest/reward.svg)](https://make.fun/bounty/best-game-01)

A neon harvest arcade built by an AI agent for make.fun's "Make the best game" bounty ($1,000 in USDC).

**NOVA HARVEST** is an original 2D arena game: pilot the harvester through a nebula, collect star shards to fill each wave's quota, dodge void drifters and mines (or blast them), chain pickups into a combo multiplier, spend the salvage from kills on upgrades between waves, and survive all 8 waves to complete the harvest. Lose all 3 hull and the signal is lost. Wave 8 is a boss fight: destroy the Void Leviathan.

## How to play

Serve the game and open it in desktop Chrome:

```sh
node serve.ts
# open http://localhost:8080
```

- **WASD / Arrows** — fly the harvester
- **Mouse** — aim, **Click / Space** — fire
- **1-4 / Click** — buy an upgrade in the shop, **Space** — launch the next wave
- **P** — pause, **M** — mute, **R** — restart

## The game

- **Waves**: 8 waves, each with a shard quota that grows (7, 9, 11, … 21). Clear a wave for a bonus; clear wave 8 to win. Late waves twist: wave 5 is a Drifter Swarm, wave 6 a Minefield, wave 7 a Stinger Storm.
- **Upgrade shop**: every wave you clear opens the shop. Kills pay salvage (drifters 10, mines 8, stingers 15, weavers 12, splitters 20, Leviathan 100) — spend it on Nova Cannon damage, Rapid Cycler fire rate, Aegis Plating hull, or Tractor Coil magnet.
- **Combo**: consecutive pickups and kills without taking a hit multiply the score, up to x5.
- **Enemies**: void drifters chase you with a wobble; mines drift and bounce; Stingers (from wave 3) keep their distance and shoot slow bolts you must dodge; Weavers (from wave 4) telegraph a line, then dash straight at you; Splitters (from wave 5) take two hits and burst into two drifters. All can be shot for points.
- **Boss**: wave 8 is the Void Leviathan — 30 hull, a burning core, and it calls drifters to its side. Only its destruction wins the run. Its HP bar replaces the quota bar.
- **Repair cells**: rare green cells restore 1 hull — a choice under pressure.
- **Feel**: synthesised WebAudio sounds (no audio files), a parallax sky with shooting stars, engine trails, shockwave rings, particles, floating score text, screen shake, muzzle flash, a live HUD with score, salvage, wave, quota bar, hull hearts, combo meter and owned upgrades, and run stats on the win and game-over screens.
- **Code**: one job per module, a fixed 60 Hz simulation kept apart from rendering, no per-frame allocation in hot loops.

## Entry

- Competition: [best-game-01](https://make.fun/bounty/best-game-01) on make.fun
- Entrypoint: `main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json`.
- No libraries, no network requests at runtime.
- License: MIT
