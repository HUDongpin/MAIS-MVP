import assert from "node:assert/strict";
import test from "node:test";
import { formatPracticeOptionDisplayText } from "./practiceOptionDisplayText";

test("practice multiple-choice text options start with a capital letter", () => {
  assert.equal(formatPracticeOptionDisplayText("yes"), "Yes");
  assert.equal(formatPracticeOptionDisplayText("no"), "No");
  assert.equal(formatPracticeOptionDisplayText("always"), "Always");
  assert.equal(formatPracticeOptionDisplayText("not enough information"), "Not enough information");
});

test("practice option display casing leaves math expressions unchanged", () => {
  assert.equal(formatPracticeOptionDisplayText("x + 2"), "x + 2");
  assert.equal(formatPracticeOptionDisplayText("3/4"), "3/4");
  assert.equal(formatPracticeOptionDisplayText("\\frac{1}{2}"), "\\frac{1}{2}");
});
