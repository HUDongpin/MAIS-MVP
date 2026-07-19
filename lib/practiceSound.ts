export type PracticeSoundKind = "correct" | "wrong" | "complete";

export type PracticeSoundNote = {
  frequency: number;
  startMs: number;
  durationMs: number;
  peakGain: number;
  oscillatorType: "sine" | "triangle";
};

export const practiceSoundStoragePrefix = "hk-math-practice-sound";

export function practiceSoundStorageKey(userId: string | null | undefined) {
  return `${practiceSoundStoragePrefix}:${userId ?? "guest"}`;
}

export function readPracticeSoundEnabled(value: string | null) {
  return value === "true";
}

export const practiceSoundNotes: Record<PracticeSoundKind, PracticeSoundNote[]> = {
  correct: [
    { frequency: 523.25, startMs: 0, durationMs: 110, peakGain: 0.08, oscillatorType: "triangle" },
    { frequency: 783.99, startMs: 90, durationMs: 170, peakGain: 0.08, oscillatorType: "triangle" }
  ],
  wrong: [
    { frequency: 329.63, startMs: 0, durationMs: 120, peakGain: 0.05, oscillatorType: "sine" },
    { frequency: 261.63, startMs: 110, durationMs: 170, peakGain: 0.05, oscillatorType: "sine" }
  ],
  complete: [
    { frequency: 523.25, startMs: 0, durationMs: 130, peakGain: 0.07, oscillatorType: "triangle" },
    { frequency: 659.25, startMs: 100, durationMs: 130, peakGain: 0.07, oscillatorType: "triangle" },
    { frequency: 783.99, startMs: 200, durationMs: 130, peakGain: 0.07, oscillatorType: "triangle" },
    { frequency: 1046.5, startMs: 300, durationMs: 220, peakGain: 0.08, oscillatorType: "triangle" }
  ]
};

let sharedAudioContext: AudioContext | null = null;

function resolveAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  const AudioContextConstructor =
    window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return null;

  try {
    sharedAudioContext = sharedAudioContext ?? new AudioContextConstructor();
    if (sharedAudioContext.state === "suspended") void sharedAudioContext.resume();
    return sharedAudioContext;
  } catch {
    return null;
  }
}

export function playPracticeSound(kind: PracticeSoundKind) {
  const context = resolveAudioContext();
  if (!context) return false;

  try {
    const now = context.currentTime;
    for (const note of practiceSoundNotes[kind]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = now + note.startMs / 1000;
      const noteEnd = noteStart + note.durationMs / 1000;

      oscillator.type = note.oscillatorType;
      oscillator.frequency.value = note.frequency;
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(note.peakGain, noteStart + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteEnd + 0.03);
    }
    return true;
  } catch {
    return false;
  }
}
