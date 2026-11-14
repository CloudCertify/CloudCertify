// PROTOTYPE: tiny synthesized sound + haptic cues. No assets, no persistence.
import { useSyncExternalStore } from 'react';

// One switch for every screen of an attempt. The real thing would remember it per device.
let soundOn = true;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export function useSound() {
  const on = useSyncExternalStore(subscribe, () => soundOn, () => true);
  const toggle = () => {
    soundOn = !soundOn;
    listeners.forEach(listener => listener());
  };
  return [on, toggle] as const;
}

export type Cue = 'select' | 'correct' | 'wrong' | 'combo' | 'finish';

const NOTES: Record<Cue, [frequency: number, startAt: number, length: number][]> = {
  select: [[440, 0, 0.05]],
  correct: [[660, 0, 0.09], [880, 0.09, 0.14]],
  wrong: [[220, 0, 0.12], [175, 0.11, 0.18]],
  combo: [[660, 0, 0.07], [880, 0.07, 0.07], [1175, 0.14, 0.18]],
  finish: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.3]]
};

const BUZZ: Record<Cue, number | number[]> = {
  select: 8,
  correct: 18,
  wrong: [30, 40, 30],
  combo: [15, 30, 15, 30, 40],
  finish: [20, 40, 20, 40, 80]
};

let context: AudioContext | null = null;

/** Play a cue. Call from a user gesture (click/keydown) so the browser allows audio. */
export function cue(kind: Cue) {
  if (typeof window === 'undefined') return;
  // Android only; iOS Safari has no Vibration API.
  navigator.vibrate?.(BUZZ[kind]);
  if (!soundOn) return;
  context ??= new AudioContext();
  const audio = context;
  void audio.resume();
  for (const [frequency, startAt, length] of NOTES[kind]) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = kind === 'wrong' ? 'sawtooth' : 'triangle';
    oscillator.frequency.value = frequency;
    const start = audio.currentTime + startAt;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(kind === 'wrong' ? 0.05 : 0.12, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + length + 0.02);
  }
}
