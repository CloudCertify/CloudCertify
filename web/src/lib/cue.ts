import { useSyncExternalStore } from 'react';

/**
 * Sound and haptic cues for an attempt: short synthesized tones, no audio files.
 * One switch per device, remembered across visits. Vibration follows the same switch.
 */
export type Cue = 'select' | 'correct' | 'wrong' | 'streak' | 'finish';

const NOTES: Record<Cue, [frequency: number, startAt: number, length: number][]> = {
  select: [[440, 0, 0.05]],
  correct: [[660, 0, 0.09], [880, 0.09, 0.14]],
  wrong: [[220, 0, 0.12], [175, 0.11, 0.18]],
  streak: [[660, 0, 0.07], [880, 0.07, 0.07], [1175, 0.14, 0.18]],
  finish: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.3]]
};

const BUZZ: Record<Cue, number | number[]> = {
  select: 8,
  correct: 18,
  wrong: [30, 40, 30],
  streak: [15, 30, 15, 30, 40],
  finish: [20, 40, 20, 40, 80]
};

const STORAGE_KEY = 'cloudcertify-sound';
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
const isOn = () => localStorage.getItem(STORAGE_KEY) !== 'off';

/** `[on, toggle]` for the mute control. */
export function useSound() {
  const on = useSyncExternalStore(subscribe, isOn, () => true);
  const toggle = () => {
    if (isOn()) localStorage.setItem(STORAGE_KEY, 'off');
    else localStorage.removeItem(STORAGE_KEY);
    listeners.forEach(listener => listener());
  };
  return [on, toggle] as const;
}

/** A light tick as something passes under the finger. Follows the same switch as sound. */
export function tick() {
  if (typeof window !== 'undefined' && isOn()) navigator.vibrate?.(4);
}

let context: AudioContext | null = null;

/** Play a cue. Browsers only allow audio after a user gesture; before one this is silent. */
export function cue(kind: Cue) {
  if (typeof window === 'undefined' || !isOn()) return;
  // Android only; iOS Safari has no Vibration API.
  navigator.vibrate?.(BUZZ[kind]);
  if (typeof AudioContext === 'undefined') return;
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
