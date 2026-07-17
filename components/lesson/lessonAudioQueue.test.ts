import assert from "node:assert/strict";
import test from "node:test";
import { buildLessonAudioChunks } from "./lessonAudioQueue";

test("buildLessonAudioChunks splits long narration at natural sentence boundaries", () => {
  const text = [
    "First, we compare the two sides of the equation.",
    "Next, we move the constant term and keep the equality balanced.",
    "Finally, we check the solution by substituting it back into the original question.",
    "This lets the first audio segment start quickly while later segments are prepared."
  ].join(" ");

  const chunks = buildLessonAudioChunks(text, {
    maxCharacters: 120,
    minCharacters: 40
  });

  assert.ok(chunks.length >= 2);
  assert.deepEqual(chunks.map((chunk) => chunk.index), chunks.map((_, index) => index));
  assert.equal(chunks.map((chunk) => chunk.text).join(" "), text);
  assert.ok(chunks.slice(0, -1).every((chunk) => chunk.text.length <= 140));
  assert.ok(chunks.every((chunk) => chunk.text.length > 0));
});

test("buildLessonAudioChunks keeps short narration as a single playable first chunk", () => {
  const text = "This lesson introduces equivalent fractions with one worked example.";
  const chunks = buildLessonAudioChunks(text, {
    maxCharacters: 120,
    minCharacters: 40
  });

  assert.equal(chunks.length, 1);
  assert.equal(chunks[0]?.index, 0);
  assert.equal(chunks[0]?.text, text);
});
