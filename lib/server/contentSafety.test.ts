import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSafetySupportReply,
  classifyContentSafety,
  shouldWithholdTutorReply
} from "@/lib/server/contentSafety";

test("returns not-flagged for empty or whitespace input", () => {
  assert.equal(classifyContentSafety("").flagged, false);
  assert.equal(classifyContentSafety("   \n\t ").flagged, false);
});

test("does not flag ordinary math conversation", () => {
  const mathPhrases = [
    "How do I solve x^2 + 3x = 0? I want to kill the negative sign first.",
    "Let's shoot for 90% on the quiz.",
    "This problem is dead simple once you factor it.",
    "Cut the fraction in half and simplify.",
    "The variable dies when the coefficient is zero.",
    "I'm dying to understand why the derivative is negative here."
  ];
  for (const phrase of mathPhrases) {
    const result = classifyContentSafety(phrase);
    assert.equal(result.flagged, false, `should not flag: ${phrase}`);
  }
});

test("flags self-harm phrases as critical", () => {
  for (const phrase of [
    "i want to kill myself",
    "I don't want to live anymore",
    "sometimes I feel like ending my life",
    "i wanna die",
    "I've been cutting myself"
  ]) {
    const result = classifyContentSafety(phrase, { source: "student-input" });
    assert.equal(result.flagged, true, `should flag: ${phrase}`);
    assert.equal(result.category, "self-harm", `wrong category for: ${phrase}`);
    assert.equal(result.severity, "critical");
    assert.ok(result.matchedTerms.length > 0);
    assert.ok(result.excerpt.length > 0);
  }
});

test("flags Chinese self-harm phrases", () => {
  for (const phrase of ["我不想活了", "我想自殺", "我覺得活不下去"]) {
    const result = classifyContentSafety(phrase);
    assert.equal(result.flagged, true, `should flag: ${phrase}`);
    assert.equal(result.category, "self-harm");
    assert.equal(result.severity, "critical");
  }
});

test("flags abuse disclosure as critical", () => {
  for (const phrase of [
    "my dad hits me at home",
    "I'm scared, someone is abusing me",
    "被打了，不敢回家"
  ]) {
    const result = classifyContentSafety(phrase);
    assert.equal(result.flagged, true, `should flag: ${phrase}`);
    assert.equal(result.severity, "critical");
    assert.ok(["abuse", "self-harm"].includes(result.category ?? ""));
  }
});

test("flags threats of violence toward others as high", () => {
  const result = classifyContentSafety("i'm going to hurt them tomorrow");
  assert.equal(result.flagged, true);
  assert.equal(result.category, "violence");
  assert.equal(result.severity, "high");
});

test("flags bullying/harassment as high", () => {
  const result = classifyContentSafety("i am being bullied at school every day");
  assert.equal(result.flagged, true);
  assert.equal(result.category, "harassment");
  assert.equal(result.severity, "high");
});

test("self-harm outranks a co-occurring lower-severity category", () => {
  const result = classifyContentSafety(
    "i am being bullied and i want to kill myself"
  );
  assert.equal(result.category, "self-harm");
  assert.equal(result.severity, "critical");
});

test("shouldWithholdTutorReply blocks critical/high but not medium or unflagged", () => {
  assert.equal(
    shouldWithholdTutorReply(classifyContentSafety("i want to die")),
    true
  );
  assert.equal(
    shouldWithholdTutorReply(classifyContentSafety("i'm going to hurt them")),
    true
  );
  assert.equal(
    shouldWithholdTutorReply(classifyContentSafety("what is 2 + 2?")),
    false
  );
});

test("support reply is warm, points to a trusted adult, and does not echo the phrase", () => {
  const reply = buildSafetySupportReply("self-harm", "en");
  assert.ok(reply.length > 0);
  assert.match(reply, /trusted adult/i);
  assert.match(reply, /teacher/i);
  assert.doesNotMatch(reply, /kill myself/i);
});

test("support reply localizes to Traditional and Simplified Chinese", () => {
  const hant = buildSafetySupportReply("abuse", "zh");
  assert.match(hant, /[㐀-鿿]/u);
  assert.match(hant, /謝謝/);

  const hans = buildSafetySupportReply("abuse", "zh-Hans");
  assert.match(hans, /谢谢/);
  assert.doesNotMatch(hans, /謝謝/);
});
