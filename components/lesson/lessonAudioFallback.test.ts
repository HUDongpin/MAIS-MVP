import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const lessonViewSource = readFileSync("components/lesson/LessonView.tsx", "utf8");

test("dynamic lesson audio starts a bounded speech fallback when provider audio is slow", () => {
  assert.match(lessonViewSource, /const lessonAudioQuickFallbackDelayMs = 2200;/);
  assert.match(lessonViewSource, /const speechFallbackActiveRef = useRef\(false\);/);
  assert.match(lessonViewSource, /function startLessonSpeechFallback\(/);
  assert.match(lessonViewSource, /const speechFallbackPromise = new Promise<boolean>/);
  assert.match(lessonViewSource, /window\.setTimeout\(\(\) => \{/);
  assert.match(lessonViewSource, /abortController\.abort\(\)/);
  assert.match(lessonViewSource, /Promise\.race\(\[remoteAudioPromise, speechFallbackPromise\]\)/);
});
