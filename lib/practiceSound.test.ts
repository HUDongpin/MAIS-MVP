import { equal, ok } from "node:assert/strict";
import { test } from "node:test";
import {
  practiceSoundNotes,
  practiceSoundStorageKey,
  readPracticeSoundEnabled,
  type PracticeSoundKind
} from "./practiceSound";

test("scopes the sound preference key per user with a guest fallback", () => {
  equal(practiceSoundStorageKey("student-1"), "hk-math-practice-sound:student-1");
  equal(practiceSoundStorageKey(undefined), "hk-math-practice-sound:guest");
  equal(practiceSoundStorageKey(null), "hk-math-practice-sound:guest");
});

test("sound stays off by default and only an explicit opt-in enables it", () => {
  equal(readPracticeSoundEnabled(null), false, "first visit must default to muted");
  equal(readPracticeSoundEnabled("false"), false);
  equal(readPracticeSoundEnabled("garbage"), false);
  equal(readPracticeSoundEnabled("true"), true);
});

test("defines gentle, short chimes for every feedback kind", () => {
  const kinds = Object.keys(practiceSoundNotes) as PracticeSoundKind[];
  for (const kind of kinds) {
    const notes = practiceSoundNotes[kind];
    ok(notes.length > 0, `${kind} needs at least one note`);
    for (const note of notes) {
      ok(note.frequency >= 100 && note.frequency <= 2100, `${kind} frequency should stay in a soft range`);
      ok(note.durationMs >= 40 && note.durationMs <= 600, `${kind} notes should stay short`);
      ok(note.peakGain > 0 && note.peakGain <= 0.2, `${kind} must stay quiet (child-safe volume)`);
      ok(note.startMs >= 0);
    }
  }
});

test("the wrong-answer sound is softer than the correct-answer sound", () => {
  const maxWrongGain = Math.max(...practiceSoundNotes.wrong.map((note) => note.peakGain));
  const maxCorrectGain = Math.max(...practiceSoundNotes.correct.map((note) => note.peakGain));
  ok(maxWrongGain < maxCorrectGain, "misses should never sound louder than successes");
});

test("covers every arcade-game moment the juice kit fires", () => {
  const gameKinds: PracticeSoundKind[] = ["coin", "pickup", "throw", "kill", "combo2", "combo3", "hurt", "gameOver", "fanfare", "splash", "catch", "reel", "escape", "star"];
  for (const kind of gameKinds) {
    ok((practiceSoundNotes[kind]?.length ?? 0) > 0, `${kind} needs a motif`);
  }
});

test("setback sounds stay softer than celebration sounds", () => {
  const maxGain = (kind: PracticeSoundKind) => Math.max(...practiceSoundNotes[kind].map((note) => note.peakGain));
  ok(maxGain("hurt") < maxGain("kill"), "taking damage must sound softer than a win");
  ok(maxGain("gameOver") < maxGain("fanfare"), "defeat must sound softer than triumph");
  ok(maxGain("escape") < maxGain("catch"), "a fish escaping must sound softer than landing one");
});

test("the reel motif ticks upward like a winch", () => {
  const frequencies = practiceSoundNotes.reel.map((note) => note.frequency);
  for (let index = 1; index < frequencies.length; index += 1) {
    ok(frequencies[index] > frequencies[index - 1], "each reel tick should climb");
  }
});

test("combo motifs escalate by rising in pitch", () => {
  const peakFrequency = (kind: PracticeSoundKind) => Math.max(...practiceSoundNotes[kind].map((note) => note.frequency));
  ok(peakFrequency("combo2") > peakFrequency("kill"), "combo2 should climb above the base kill sound");
  ok(peakFrequency("combo3") > peakFrequency("combo2"), "combo3 should climb above combo2");
});
