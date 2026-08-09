import assert from "node:assert/strict";
import test from "node:test";

import { speechTextForMath, speechTextForMathParts } from "./mathSpeech";

test("speaks a bare comparison symbol that stands alone as an option", () => {
  // Measured: say("<. >") produces a 4,096-byte header and no audio at all,
  // while say("3 < 8") is voiced. Only the isolated option disappears.
  assert.equal(
    speechTextForMathParts(["Which symbol makes it true?  3 __ 8", "<", ">", "=", "+"]),
    "Which symbol makes it true? 3 blank 8. is less than. is greater than. =. +"
  );
  assert.equal(
    speechTextForMathParts(["Compare:  51 __ 57", "<", ">", "=", "+"]),
    "Compare: 51 blank 57. is less than. is greater than. =. +"
  );
});

test("leaves alone the standalone symbols that are already audible", () => {
  // =, +, ×, ÷, π and ≠ were each measured as voiced standing alone.
  assert.equal(speechTextForMathParts(["Pick", "=", "+", "×", "÷", "π", "≠"]), "Pick. =. +. ×. ÷. π. ≠");
});

test("does not rewrite a comparison symbol inside an expression", () => {
  // "3 < 8" is voiced, so it must survive untouched.
  assert.equal(speechTextForMathParts(["Is 3 < 8 true?", "yes", "no"]), "Is 3 < 8 true?. yes. no");
});

test("drops empty parts rather than emitting a bare separator", () => {
  assert.equal(speechTextForMathParts(["Prompt", "", "  ", "answer"]), "Prompt. answer");
});

test("speaks the blank a student is asked to fill", () => {
  assert.equal(speechTextForMath("10 + 8 = ___."), "10 + 8 = blank .");
  assert.equal(speechTextForMath("5 is made of 2 and ___."), "5 is made of 2 and blank .");
  assert.equal(speechTextForMath("Which symbol makes it true?  3 __ 8"), "Which symbol makes it true? 3 blank 8");
  assert.equal(speechTextForMath("The lamp is ___ the table."), "The lamp is blank the table.");
});

test("speaks a spaced binary minus, in either dash character", () => {
  assert.equal(speechTextForMath("80 − 30 = ?"), "80 minus 30 = ?");
  assert.equal(speechTextForMath("80 - 30 = ?"), "80 minus 30 = ?");
  assert.equal(speechTextForMath("63 − 27 = ?"), "63 minus 27 = ?");
  assert.equal(speechTextForMath("(9) − (6)"), "(9) minus (6)");
  assert.equal(speechTextForMath("x − y"), "x minus y");
});

test("leaves alone what the speech engine already voices", () => {
  // Each of these was measured as audible; rewriting them would change output
  // that is already correct.
  for (const s of ["6 + 4 = 10", "9 × 80 = ?", "24 ÷ 6 = ?", "35° and 40°", "3/4", "3⁴ = ?", "8^(1/3)"]) {
    assert.equal(speechTextForMath(s), s, `should not rewrite ${s}`);
  }
});

test("does not touch a hyphen that is not a minus", () => {
  assert.equal(speechTextForMath("twenty-one"), "twenty-one");
  assert.equal(speechTextForMath("a left-hand turn"), "a left-hand turn");
  assert.equal(speechTextForMath("2026-08-09"), "2026-08-09");
  // Attached to its digit, the minus is already voiced as "minus five".
  assert.equal(speechTextForMath("The temperature is −5 degrees"), "The temperature is −5 degrees");
  assert.equal(speechTextForMath("-5"), "-5");
});

test("never changes a number or reverses a comparison", () => {
  assert.equal(speechTextForMath("3 < 8"), "3 < 8");
  assert.equal(speechTextForMath("8 > 3"), "8 > 3");
  assert.equal(speechTextForMath("1,234"), "1,234");
  assert.equal(speechTextForMath("0.5"), "0.5");
});

test("is a no-op on empty input", () => {
  assert.equal(speechTextForMath(""), "");
});
