export type PracticeSoundKind =
  | "correct"
  | "wrong"
  | "complete"
  | "coin"
  | "pickup"
  | "throw"
  | "kill"
  | "combo2"
  | "combo3"
  | "hurt"
  | "gameOver"
  | "fanfare"
  | "splash"
  | "catch"
  | "reel"
  | "escape"
  | "star";

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
  ],
  // Arcade-game kinds below: classic two-to-four note chiptune motifs, kept at
  // the same child-safe gain ceiling as the practice chimes.
  coin: [
    { frequency: 987.77, startMs: 0, durationMs: 60, peakGain: 0.06, oscillatorType: "triangle" },
    { frequency: 1318.51, startMs: 55, durationMs: 130, peakGain: 0.07, oscillatorType: "triangle" }
  ],
  pickup: [
    { frequency: 659.25, startMs: 0, durationMs: 70, peakGain: 0.06, oscillatorType: "triangle" },
    { frequency: 880, startMs: 65, durationMs: 140, peakGain: 0.06, oscillatorType: "triangle" }
  ],
  throw: [
    { frequency: 220, startMs: 0, durationMs: 60, peakGain: 0.05, oscillatorType: "sine" },
    { frequency: 329.63, startMs: 45, durationMs: 90, peakGain: 0.05, oscillatorType: "sine" }
  ],
  kill: [
    { frequency: 130.81, startMs: 0, durationMs: 100, peakGain: 0.09, oscillatorType: "sine" },
    { frequency: 392, startMs: 20, durationMs: 60, peakGain: 0.07, oscillatorType: "triangle" },
    { frequency: 523.25, startMs: 85, durationMs: 140, peakGain: 0.08, oscillatorType: "triangle" }
  ],
  combo2: [
    { frequency: 523.25, startMs: 0, durationMs: 80, peakGain: 0.07, oscillatorType: "triangle" },
    { frequency: 659.25, startMs: 70, durationMs: 80, peakGain: 0.08, oscillatorType: "triangle" },
    { frequency: 783.99, startMs: 140, durationMs: 160, peakGain: 0.08, oscillatorType: "triangle" }
  ],
  combo3: [
    { frequency: 523.25, startMs: 0, durationMs: 60, peakGain: 0.08, oscillatorType: "triangle" },
    { frequency: 659.25, startMs: 55, durationMs: 60, peakGain: 0.08, oscillatorType: "triangle" },
    { frequency: 783.99, startMs: 110, durationMs: 60, peakGain: 0.09, oscillatorType: "triangle" },
    { frequency: 1046.5, startMs: 165, durationMs: 200, peakGain: 0.1, oscillatorType: "triangle" }
  ],
  hurt: [
    { frequency: 196, startMs: 0, durationMs: 100, peakGain: 0.05, oscillatorType: "sine" },
    { frequency: 146.83, startMs: 90, durationMs: 160, peakGain: 0.05, oscillatorType: "sine" }
  ],
  gameOver: [
    { frequency: 392, startMs: 0, durationMs: 160, peakGain: 0.06, oscillatorType: "sine" },
    { frequency: 329.63, startMs: 150, durationMs: 160, peakGain: 0.06, oscillatorType: "sine" },
    { frequency: 261.63, startMs: 300, durationMs: 160, peakGain: 0.06, oscillatorType: "sine" },
    { frequency: 196, startMs: 450, durationMs: 260, peakGain: 0.05, oscillatorType: "sine" }
  ],
  fanfare: [
    { frequency: 523.25, startMs: 0, durationMs: 110, peakGain: 0.08, oscillatorType: "triangle" },
    { frequency: 659.25, startMs: 95, durationMs: 110, peakGain: 0.08, oscillatorType: "triangle" },
    { frequency: 783.99, startMs: 190, durationMs: 110, peakGain: 0.08, oscillatorType: "triangle" },
    { frequency: 1046.5, startMs: 285, durationMs: 150, peakGain: 0.09, oscillatorType: "triangle" },
    { frequency: 1318.51, startMs: 420, durationMs: 260, peakGain: 0.09, oscillatorType: "triangle" }
  ],
  splash: [
    { frequency: 220, startMs: 0, durationMs: 90, peakGain: 0.05, oscillatorType: "sine" },
    { frequency: 164.81, startMs: 70, durationMs: 160, peakGain: 0.05, oscillatorType: "sine" }
  ],
  catch: [
    { frequency: 783.99, startMs: 0, durationMs: 80, peakGain: 0.07, oscillatorType: "triangle" },
    { frequency: 1174.66, startMs: 75, durationMs: 170, peakGain: 0.08, oscillatorType: "triangle" }
  ],
  reel: [
    { frequency: 392, startMs: 0, durationMs: 45, peakGain: 0.05, oscillatorType: "triangle" },
    { frequency: 440, startMs: 90, durationMs: 45, peakGain: 0.05, oscillatorType: "triangle" },
    { frequency: 493.88, startMs: 180, durationMs: 45, peakGain: 0.05, oscillatorType: "triangle" },
    { frequency: 523.25, startMs: 270, durationMs: 45, peakGain: 0.05, oscillatorType: "triangle" },
    { frequency: 587.33, startMs: 360, durationMs: 60, peakGain: 0.05, oscillatorType: "triangle" }
  ],
  escape: [
    { frequency: 523.25, startMs: 0, durationMs: 90, peakGain: 0.05, oscillatorType: "sine" },
    { frequency: 392, startMs: 85, durationMs: 90, peakGain: 0.05, oscillatorType: "sine" },
    { frequency: 293.66, startMs: 170, durationMs: 150, peakGain: 0.04, oscillatorType: "sine" }
  ],
  star: [
    { frequency: 880, startMs: 0, durationMs: 70, peakGain: 0.08, oscillatorType: "triangle" },
    { frequency: 1318.51, startMs: 65, durationMs: 180, peakGain: 0.09, oscillatorType: "triangle" }
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
