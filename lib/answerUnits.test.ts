import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPACT_ANSWER_UNIT_SUFFIXES,
  KNOWN_ANSWER_UNIT_WORDS,
  stripAnswerUnitSuffixPreservingWhitespace
} from "./answerUnits";

test("compact answer-unit suffix fixture preserves mixed-number whitespace", () => {
  for (const suffix of COMPACT_ANSWER_UNIT_SUFFIXES) {
    assert.equal(stripAnswerUnitSuffixPreservingWhitespace(`3  1 / 2${suffix}`), "3  1 / 2", suffix);
    assert.equal(stripAnswerUnitSuffixPreservingWhitespace(`3  1 / 2 ${suffix}`), "3  1 / 2", suffix);
  }
});

test("known word-unit fixture preserves mixed-number whitespace", () => {
  for (const unit of KNOWN_ANSWER_UNIT_WORDS) {
    assert.equal(stripAnswerUnitSuffixPreservingWhitespace(`3  1 / 2 ${unit}`), "3  1 / 2", unit);
  }
});

test("unit stripping is end-anchored and leaves unrelated text unchanged", () => {
  assert.equal(stripAnswerUnitSuffixPreservingWhitespace("recall"), "recall");
  assert.equal(stripAnswerUnitSuffixPreservingWhitespace("3 cm + 2"), "3 cm + 2");
  assert.equal(stripAnswerUnitSuffixPreservingWhitespace("  3 1/2 cm cards  "), "3 1/2");
});
