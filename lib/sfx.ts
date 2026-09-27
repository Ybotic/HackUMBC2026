export type Sound =
  | "tick"
  | "pop"
  | "lightsOff"
  | "lightsOn"
  | "bloom"
  | "play"
  | "pause"
  | "chime";

const MASTER_GAIN = 0.8;
const STORAGE_KEY = "sound";
const NOISE_SECONDS = 0.4;
const UNLOCK_EVENTS = [
  "pointerdown",
  "pointerup",
  "mousedown",
  "mouseup",
  "touchend",
  "keydown",
  "keyup",
  "click",
  "contextmenu",
  "auxclick",
  "dblclick",
] as const;
const UNLOCK_OPTIONS = { capture: true, passive: true };

interface AudioState {
  context: AudioContext;
  noise: AudioBuffer | null;
  output: GainNode;
}

let audio: AudioState | null = null;
let muted = false;
let pending: { pitch: number; sound: Sound } | null = null;
const listeners = new Set<(muted: boolean) => void>();

const syncMuted = () => {
  if (typeof window === "undefined") {
    return muted;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY) === "off";
    if (stored !== muted) {
      muted = stored;
    }
  } catch {
    // Ignore storage errors.
  }
  return muted;
};

const createAudio = () => {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") {
    return null;
  }
  if (audio) {
    return audio;
  }

  const context = new AudioContext();
  const output = context.createGain();
  output.gain.value = MASTER_GAIN;
  output.connect(context.destination);
  audio = { context, output, noise: null };
  return audio;
};

const envelope = (
  state: AudioState,
  peak: number,
  attack: number,
  decay: number,
  at: number
) => {
  const gain = state.context.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  gain.connect(state.output);
  return gain;
};

const tone = (
  state: AudioState,
  type: OscillatorType,
  from: number,
  to: number,
  peak: number,
  attack: number,
  decay: number,
  at = state.context.currentTime
) => {
  const oscillator = state.context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, at);
  oscillator.frequency.exponentialRampToValueAtTime(to, at + attack + decay);
  oscillator.connect(envelope(state, peak, attack, decay, at));
  oscillator.start(at);
  oscillator.stop(at + attack + decay + 0.02);
};

const hiss = (
  state: AudioState,
  cutoffFrom: number,
  cutoffTo: number,
  peak: number,
  attack: number,
  decay: number
) => {
  if (!state.noise) {
    const { context } = state;
    state.noise = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * NOISE_SECONDS),
      context.sampleRate
    );
    const data = state.noise.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }
  }

  const at = state.context.currentTime;
  const source = state.context.createBufferSource();
  source.buffer = state.noise;
  const filter = state.context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoffFrom, at);
  filter.frequency.exponentialRampToValueAtTime(cutoffTo, at + attack + decay);
  source.connect(filter);
  filter.connect(envelope(state, peak, attack, decay, at));
  source.start(at);
  source.stop(at + attack + decay + 0.02);
};

type SoundPlayer = (state: AudioState, pitch?: number) => void;

const confirmation = (state: AudioState) => {
  const detune = 1 + (Math.random() - 0.5) * 0.06;
  tone(state, "sine", 520 * detune, 820 * detune, 0.32, 0.008, 0.1);
};

const playSound: Record<Sound, SoundPlayer> = {
  tick: (state, pitch = 720) =>
    tone(
      state,
      "sine",
      Math.max(360, pitch * 0.8),
      pitch * 1.15,
      0.42,
      0.008,
      0.16
    ),
  pop: confirmation,
  lightsOff: (state) => {
    tone(state, "triangle", 320, 160, 0.4, 0.005, 0.13);
    hiss(state, 3000, 400, 0.14, 0.003, 0.05);
  },
  lightsOn: (state) => {
    tone(state, "triangle", 170, 340, 0.4, 0.005, 0.13);
    hiss(state, 400, 3000, 0.14, 0.003, 0.05);
  },
  bloom: (state) => tone(state, "sine", 300, 900, 0.4, 0.01, 0.1),
  play: (state) => {
    tone(state, "sine", 620, 640, 0.25, 0.006, 0.07);
    tone(
      state,
      "sine",
      930,
      960,
      0.25,
      0.006,
      0.1,
      state.context.currentTime + 0.07
    );
  },
  pause: (state) => {
    tone(state, "sine", 930, 900, 0.25, 0.006, 0.07);
    tone(
      state,
      "sine",
      620,
      600,
      0.25,
      0.006,
      0.1,
      state.context.currentTime + 0.07
    );
  },
  chime: (state) => {
    tone(state, "sine", 1320, 1318, 0.2, 0.01, 0.9);
    tone(state, "sine", 1980, 1976, 0.08, 0.01, 0.6);
  },
};

function stopUnlock() {
  for (const event of UNLOCK_EVENTS) {
    window.removeEventListener(event, unlock, UNLOCK_OPTIONS);
  }
}

function flush(state: AudioState) {
  const request = pending;
  pending = null;
  if (request && !syncMuted() && state.context.state === "running") {
    playSound[request.sound](state, request.pitch);
  }
}

function unlock() {
  if (syncMuted()) {
    return;
  }
  const state = audio ?? createAudio();
  if (!state) {
    return;
  }
  if (state.context.state === "running") {
    flush(state);
    stopUnlock();
    return;
  }
  state.context
    .resume()
    .then(() => {
      if (state.context.state === "running") {
        flush(state);
        stopUnlock();
      }
    })
    .catch(() => undefined);
}

export const sfx = (sound: Sound, pitch = 720) => {
  if (syncMuted()) {
    return;
  }
  const state = audio;
  if (!state) {
    pending = { pitch, sound };
    return;
  }
  if (state.context.state === "running") {
    pending = null;
    playSound[sound](state, pitch);
    return;
  }

  pending = { pitch, sound };
  state.context
    .resume()
    .then(() => {
      if (state.context.state === "running") {
        flush(state);
      }
    })
    .catch(() => undefined);
};

export const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];

export const isMuted = () => syncMuted();

export const setMuted = (next: boolean) => {
  muted = next;
  try {
    if (next) {
      localStorage.setItem(STORAGE_KEY, "off");
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors.
  }
  if (next) {
    pending = null;
  } else {
    unlock();
  }
  for (const listener of listeners) {
    listener(next);
  }
};

export const onMuteChange = (listener: (muted: boolean) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

if (typeof window !== "undefined") {
  try {
    muted = localStorage.getItem(STORAGE_KEY) === "off";
  } catch {
    // Ignore storage errors.
  }
  for (const event of UNLOCK_EVENTS) {
    window.addEventListener(event, unlock, UNLOCK_OPTIONS);
  }
}
