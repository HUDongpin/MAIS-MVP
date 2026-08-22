import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_ANSWER_LENGTH,
  MAX_CURATED_ANSWER_LENGTH,
  isAnswerWithinLengthLimit,
  isCuratedAnswerWithinLengthLimit
} from "./answerLimits";

test("learner and curated answer boundaries remain explicit and asymmetric", () => {
  assert.equal(MAX_ANSWER_LENGTH, 500);
  assert.equal(MAX_CURATED_ANSWER_LENGTH, 1024);

  assert.equal(isAnswerWithinLengthLimit("a".repeat(500)), true);
  assert.equal(isAnswerWithinLengthLimit("a".repeat(501)), false);
  assert.equal(isCuratedAnswerWithinLengthLimit("a".repeat(1024)), true);
  assert.equal(isCuratedAnswerWithinLengthLimit("a".repeat(1025)), false);
});
