"use client";

/**
 * Wissensgipfel — Web Audio sound effect system.
 *
 * All sounds are synthesised at runtime via Web Audio API — no audio files needed.
 * Honours the in-app `sound` preference (checked before each play).
 * Lazily initialised on first user gesture (browser autoplay policy).
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

/** Must be called on first user gesture to unlock audio. */
export function unlockAudio() {
  const ctx = getCtx();
  if (ctx && ctx.state === "suspended") {
    void ctx.resume();
  }
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.3,
  startTime?: number,
) {
  const ctx = getCtx();
  if (!ctx || !soundEnabled) return;
  const t = startTime ?? ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + duration);
}

function playSweep(
  fromFreq: number,
  toFreq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.3,
) {
  const ctx = getCtx();
  if (!ctx || !soundEnabled) return;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(fromFreq, t);
  osc.frequency.exponentialRampToValueAtTime(toFreq, t + duration);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + duration);
}

function playNoise(
  duration: number,
  volume = 0.2,
  filterFreq = 1000,
  filterQ = 1,
) {
  const ctx = getCtx();
  if (!ctx || !soundEnabled) return;
  const t = ctx.currentTime;

  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = filterFreq;
  filter.Q.value = filterQ;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(t);
  noise.stop(t + duration);
}

// ============================================================================
// Sound effects
// ============================================================================

export function sfxSelect() {
  playTone(440, 0.08, "sine", 0.15);
}

export function sfxLockIn() {
  const ctx = getCtx();
  if (!ctx || !soundEnabled) return;
  playTone(523, 0.1, "triangle", 0.2);
  playTone(659, 0.15, "triangle", 0.2, ctx.currentTime + 0.08);
}

export function sfxCorrect() {
  const ctx = getCtx();
  if (!ctx || !soundEnabled) return;
  const t = ctx.currentTime;
  playTone(523, 0.15, "sine", 0.25, t);
  playTone(659, 0.15, "sine", 0.25, t + 0.08);
  playTone(784, 0.15, "sine", 0.25, t + 0.16);
  playTone(1047, 0.3, "sine", 0.25, t + 0.24);
}

export function sfxWrong() {
  const ctx = getCtx();
  if (!ctx || !soundEnabled) return;
  const t = ctx.currentTime;
  playTone(440, 0.15, "sine", 0.2, t);
  playTone(349, 0.3, "sine", 0.2, t + 0.12);
}

export function sfxSafeStation() {
  const ctx = getCtx();
  if (!ctx || !soundEnabled) return;
  const t = ctx.currentTime;
  playTone(523, 0.2, "sine", 0.2, t);
  playTone(659, 0.2, "sine", 0.2, t + 0.1);
  playTone(784, 0.3, "sine", 0.2, t + 0.2);
}

export function sfxFiftyFifty() {
  playNoise(0.3, 0.15, 2000, 2);
}

export function sfxAudience() {
  playNoise(0.8, 0.1, 400, 5);
}

export function sfxPhone() {
  const ctx = getCtx();
  if (!ctx || !soundEnabled) return;
  const t = ctx.currentTime;
  playTone(660, 0.12, "sine", 0.15, t);
  playTone(660, 0.12, "sine", 0.15, t + 0.2);
}

export function sfxSwitch() {
  playSweep(800, 200, 0.3, "sawtooth", 0.15);
}

export function sfxSummit() {
  const ctx = getCtx();
  if (!ctx || !soundEnabled) return;
  const t = ctx.currentTime;
  playTone(523, 0.4, "triangle", 0.2, t);
  playTone(659, 0.4, "triangle", 0.2, t + 0.05);
  playTone(784, 0.4, "triangle", 0.2, t + 0.1);
  playTone(1047, 0.6, "triangle", 0.25, t + 0.15);
}

export function sfxButtonPress() {
  playTone(200, 0.04, "square", 0.08);
}

/** Tick-tack — short click for timer countdown (last 10 seconds). */
export function sfxTickTack(isUrgent = false) {
  // Higher pitch + louder when very urgent (≤3s)
  const freq = isUrgent ? 1200 : 800;
  const vol = isUrgent ? 0.2 : 0.12;
  playTone(freq, 0.03, "square", vol);
}

/** Time's up — buzzer when timer expires. */
export function sfxTimeUp() {
  const ctx = getCtx();
  if (!ctx || !soundEnabled) return;
  const t = ctx.currentTime;
  playTone(300, 0.15, "sawtooth", 0.2, t);
  playTone(250, 0.4, "sawtooth", 0.2, t + 0.1);
}
