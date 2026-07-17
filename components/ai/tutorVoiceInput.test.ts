import assert from "node:assert/strict";
import test from "node:test";

import { voiceTranscriptMessageInput } from "./tutorVoiceInput";

test("voiceTranscriptMessageInput sends only the transcript when the composer is empty", () => {
  assert.equal(voiceTranscriptMessageInput("", "  explain   fractions  "), "explain fractions");
});

test("voiceTranscriptMessageInput appends the transcript to existing composer text", () => {
  assert.equal(
    voiceTranscriptMessageInput("Use the Pythagorean theorem.", "  show step two  "),
    "Use the Pythagorean theorem. show step two"
  );
});
