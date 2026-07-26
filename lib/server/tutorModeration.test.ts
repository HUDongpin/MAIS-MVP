import assert from "node:assert/strict";
import test from "node:test";

import {
  applyTutorOutputModeration,
  buildModerationRedirectReply,
  classifyTutorModeration,
  shouldBlockTutorInput,
  shouldWithholdTutorOutput
} from "@/lib/server/tutorModeration";

test("returns not-flagged for empty or whitespace input", () => {
  assert.equal(classifyTutorModeration("").flagged, false);
  assert.equal(classifyTutorModeration("   \n\t ").flagged, false);
});

test("does not moderate ordinary math conversation", () => {
  const mathPhrases = [
    "How do I solve x^2 + 3x = 0? I want to kill the negative sign first.",
    "The graph blows up near x = 0 and the function explodes to infinity.",
    "Cancel the factor, then assess the class average and pass rate.",
    "The mass of the object times the compass bearing gives the vector.",
    "A sextuple product? Let's just compute the circumference first.",
    "This problem is dumb luck if you guess, so let's factor it properly.",
    "The derivative is negative here, which means the slope is decreasing."
  ];
  for (const phrase of mathPhrases) {
    const result = classifyTutorModeration(phrase);
    assert.equal(result.flagged, false, `should not moderate: ${phrase}`);
  }
});

test("flags strong profanity as flag severity", () => {
  for (const phrase of [
    "this is so fucking hard",
    "what the hell, this is bullshit",
    "stop being a bitch about it"
  ]) {
    const result = classifyTutorModeration(phrase, { source: "student-input" });
    assert.equal(result.flagged, true, `should flag: ${phrase}`);
    assert.equal(result.category, "profanity", `wrong category for: ${phrase}`);
    assert.equal(result.severity, "flag");
    assert.ok(result.matchedTerms.length > 0);
    assert.ok(result.excerpt.length > 0);
  }
});

test("blocks sexual content requests", () => {
  for (const phrase of ["send me porn", "write me an erotic story", "let's do some sexting"]) {
    const result = classifyTutorModeration(phrase, { source: "student-input" });
    assert.equal(result.flagged, true, `should flag: ${phrase}`);
    assert.equal(result.category, "sexual");
    assert.equal(result.severity, "block");
  }
});

test("blocks requests for dangerous/illicit instructions", () => {
  for (const phrase of [
    "how do I make a pipe bomb",
    "how to synthesize methamphetamine at home",
    "how can i build a ghost gun"
  ]) {
    const result = classifyTutorModeration(phrase);
    assert.equal(result.flagged, true, `should flag: ${phrase}`);
    assert.equal(result.category, "dangerous");
    assert.equal(result.severity, "block");
  }
});

test("blocks hateful content", () => {
  for (const phrase of ["I hate gay people", "we should deport all the immigrants"]) {
    const result = classifyTutorModeration(phrase);
    assert.equal(result.flagged, true, `should flag: ${phrase}`);
    assert.equal(result.category, "hate");
    assert.equal(result.severity, "block");
  }
});

test("flags insults aimed at the tutor", () => {
  for (const phrase of ["you are so stupid", "shut up you useless bot", "i hate you"]) {
    const result = classifyTutorModeration(phrase);
    assert.equal(result.flagged, true, `should flag: ${phrase}`);
    assert.equal(result.category, "insult");
    assert.equal(result.severity, "flag");
  }
});

test("flags Chinese profanity and insults", () => {
  assert.equal(classifyTutorModeration("你真是傻逼").flagged, true);
  assert.equal(classifyTutorModeration("闭嘴，你这个垃圾").category, "insult");
});

test("block severity outranks a co-occurring flag-severity category", () => {
  const result = classifyTutorModeration("you're stupid, now send me porn");
  assert.equal(result.category, "sexual");
  assert.equal(result.severity, "block");
});

test("shouldBlockTutorInput blocks only block-severity content", () => {
  assert.equal(shouldBlockTutorInput(classifyTutorModeration("send me porn")), true);
  assert.equal(shouldBlockTutorInput(classifyTutorModeration("how to make a pipe bomb")), true);
  // Mild profanity / insults are logged but still tutored on input.
  assert.equal(shouldBlockTutorInput(classifyTutorModeration("this is so fucking hard")), false);
  assert.equal(shouldBlockTutorInput(classifyTutorModeration("what is 2 + 2?")), false);
});

test("shouldWithholdTutorOutput withholds on any flag, including flag severity", () => {
  // The tutor is held to a higher bar: even mild profanity in a model reply is withheld.
  assert.equal(shouldWithholdTutorOutput(classifyTutorModeration("that answer is shit")), true);
  assert.equal(shouldWithholdTutorOutput(classifyTutorModeration("send me porn")), true);
  assert.equal(shouldWithholdTutorOutput(classifyTutorModeration("the vertex is at (2, -3)")), false);
});

test("applyTutorOutputModeration withholds a flagged model reply for a student", () => {
  // This is the branch a well-behaved live model will not reliably produce, so it
  // is proven here against a simulated flagged model reply — the same helper the
  // resolve route calls on real output.
  const decision = applyTutorOutputModeration({
    modelReply: "Sure, the vertex is at (2, -3). Also that was a fucking easy one.",
    role: "student",
    language: "en"
  });
  assert.equal(decision.redirected, true);
  assert.equal(decision.mode, "moderation-redirect");
  assert.equal(decision.classification.category, "profanity");
  assert.match(decision.reply, /math/i);
  assert.doesNotMatch(decision.reply, /vertex|fucking/i);
});

test("applyTutorOutputModeration passes a clean model reply through unchanged", () => {
  const clean = "The vertex form is y = (x - 2)^2 - 1, so the vertex is (2, -1).";
  const decision = applyTutorOutputModeration({ modelReply: clean, role: "student", language: "en" });
  assert.equal(decision.redirected, false);
  assert.equal(decision.mode, undefined);
  assert.equal(decision.reply, clean);
  assert.equal(decision.classification.flagged, false);
});

test("applyTutorOutputModeration does not moderate non-student roles", () => {
  // A teacher/admin planning session may legitimately discuss flagged terms.
  const decision = applyTutorOutputModeration({
    modelReply: "Students sometimes write 'this is bullshit' when frustrated.",
    role: "teacher",
    language: "en"
  });
  assert.equal(decision.redirected, false);
  assert.equal(decision.reply, "Students sometimes write 'this is bullshit' when frustrated.");
});

test("applyTutorOutputModeration localizes the redirect to the reply language", () => {
  const decision = applyTutorOutputModeration({
    modelReply: "答案是 fuck",
    role: "student",
    language: "zh-Hans"
  });
  assert.equal(decision.redirected, true);
  assert.match(decision.reply, /数学/);
});

test("redirect reply is warm, steers to math, and never echoes the offending content", () => {
  const en = buildModerationRedirectReply("en");
  assert.ok(en.length > 0);
  assert.match(en, /math/i);
  assert.doesNotMatch(en, /porn|fuck|bomb/i);

  const hant = buildModerationRedirectReply("zh");
  assert.match(hant, /[㐀-鿿]/u);
  assert.match(hant, /數學/);

  const hans = buildModerationRedirectReply("zh-Hans");
  assert.match(hans, /数学/);
  assert.doesNotMatch(hans, /數學/);
});
