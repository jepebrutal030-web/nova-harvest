// Synthesised sound: every effect is a small WebAudio patch, so the game
// ships no audio files and never makes a network request. Created lazily on
// the first user gesture (browsers block audio before one).
export function createAudio() {
  let ctx = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  /** A short oscillator blip with a pitch slide and a decay envelope. */
  function blip({ type = 'sine', from = 440, to = 440, seconds = 0.12, volume = 0.5, delay = 0 }) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + seconds);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.02);
  }

  /** Filtered noise burst, for hits and explosions. */
  function noise({ seconds = 0.2, volume = 0.4, cutoff = 1200, delay = 0 }) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const len = Math.max(1, Math.floor(c.sampleRate * seconds));
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = c.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    unlock() {
      ensure();
    },
    setMuted(value) {
      muted = value;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      blip({ type: 'square', from: 880, to: 320, seconds: 0.07, volume: 0.16 });
    },
    pickup(combo) {
      const base = 520 + Math.min(combo, 5) * 90;
      blip({ type: 'sine', from: base, to: base * 1.6, seconds: 0.14, volume: 0.4 });
      blip({ type: 'sine', from: base * 2, to: base * 2.4, seconds: 0.1, volume: 0.18, delay: 0.05 });
    },
    kill() {
      noise({ seconds: 0.18, volume: 0.35, cutoff: 2400 });
      blip({ type: 'sawtooth', from: 220, to: 60, seconds: 0.18, volume: 0.3 });
    },
    /** Each enemy dies with its own voice, so a kill tells you what died. */
    killKind(kind) {
      if (kind === 'drifter') {
        blip({ type: 'sine', from: 660, to: 180, seconds: 0.1, volume: 0.3 });
        noise({ seconds: 0.1, volume: 0.2, cutoff: 3000 });
      } else if (kind === 'mine') {
        noise({ seconds: 0.28, volume: 0.45, cutoff: 800 });
        blip({ type: 'sine', from: 120, to: 40, seconds: 0.25, volume: 0.4 });
      } else if (kind === 'stinger') {
        blip({ type: 'sawtooth', from: 980, to: 240, seconds: 0.12, volume: 0.25 });
        blip({ type: 'square', from: 1400, to: 500, seconds: 0.08, volume: 0.15, delay: 0.04 });
      } else if (kind === 'weaver') {
        blip({ type: 'sawtooth', from: 1400, to: 300, seconds: 0.09, volume: 0.22 });
        noise({ seconds: 0.12, volume: 0.25, cutoff: 4000 });
      } else if (kind === 'splitter') {
        noise({ seconds: 0.2, volume: 0.4, cutoff: 1400 });
        blip({ type: 'triangle', from: 300, to: 90, seconds: 0.16, volume: 0.35 });
        blip({ type: 'triangle', from: 200, to: 60, seconds: 0.14, volume: 0.3, delay: 0.08 });
      } else if (kind === 'boss') {
        this.bossDie();
      } else {
        this.kill();
      }
    },
    /** The Leviathan announces itself: a low rising roar under a noise swell. */
    roar() {
      blip({ type: 'sawtooth', from: 55, to: 140, seconds: 0.9, volume: 0.45 });
      blip({ type: 'sawtooth', from: 82, to: 200, seconds: 0.9, volume: 0.3, delay: 0.08 });
      noise({ seconds: 0.8, volume: 0.25, cutoff: 500 });
    },
    /** The shop opens with a soft two-note chime. */
    shopOpen() {
      blip({ type: 'triangle', from: 784, to: 784, seconds: 0.14, volume: 0.3 });
      blip({ type: 'triangle', from: 1047, to: 1047, seconds: 0.2, volume: 0.3, delay: 0.1 });
    },
    /** A purchase: a bright coin arpeggio. */
    buy() {
      [1047, 1319, 1568].forEach((f, i) => blip({ type: 'sine', from: f, to: f, seconds: 0.1, volume: 0.3, delay: i * 0.06 }));
    },
    /** A low horn when the next wave launches. */
    waveHorn() {
      blip({ type: 'sawtooth', from: 196, to: 196, seconds: 0.25, volume: 0.3 });
      blip({ type: 'sawtooth', from: 294, to: 294, seconds: 0.3, volume: 0.25, delay: 0.12 });
    },
    hit() {
      noise({ seconds: 0.3, volume: 0.5, cutoff: 900 });
      blip({ type: 'sawtooth', from: 160, to: 40, seconds: 0.35, volume: 0.45 });
    },
    bossHit() {
      blip({ type: 'square', from: 110, to: 70, seconds: 0.1, volume: 0.3 });
      noise({ seconds: 0.08, volume: 0.18, cutoff: 700 });
    },
    bossDie() {
      noise({ seconds: 0.7, volume: 0.55, cutoff: 1500 });
      blip({ type: 'sawtooth', from: 220, to: 30, seconds: 0.7, volume: 0.4 });
      [523, 659, 784, 1047, 1319].forEach((f, i) => blip({ type: 'triangle', from: f, to: f, seconds: 0.2, volume: 0.35, delay: 0.35 + i * 0.1 }));
    },
    stingerShoot() {
      blip({ type: 'sawtooth', from: 320, to: 180, seconds: 0.08, volume: 0.1 });
    },
    waveClear() {
      [523, 659, 784, 1047].forEach((f, i) => blip({ type: 'triangle', from: f, to: f, seconds: 0.16, volume: 0.35, delay: i * 0.09 }));
    },
    win() {
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => blip({ type: 'triangle', from: f, to: f, seconds: 0.22, volume: 0.4, delay: i * 0.11 }));
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) => blip({ type: 'sawtooth', from: f, to: f * 0.94, seconds: 0.28, volume: 0.3, delay: i * 0.16 }));
    },
    click() {
      blip({ type: 'sine', from: 660, to: 660, seconds: 0.05, volume: 0.25 });
    },
  };
}
