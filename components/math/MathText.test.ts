import assert from "node:assert/strict";
import test from "node:test";

import { toPlainMathText } from "./plainMathText";

test("turns normalized powers into meaningful accessible language", () => {
  assert.equal(toPlainMathText("Evaluate 8^(1/3)."), "Evaluate 8 to the power of 1 over 3.");
  assert.equal(toPlainMathText("Evaluate 9^(3/2)."), "Evaluate 9 to the power of 3 over 2.");
  assert.equal(toPlainMathText("What is i²?"), "What is i to the power of 2?");
  assert.equal(toPlainMathText("For y = 3^x, find y."), "For y = 3 to the power of x, find y.");
  assert.equal(
    toPlainMathText("2³ × 2² = 2^? (give the exponent)"),
    "2 to the power of 3 × 2 to the power of 2 = 2 to the power of unknown (give the exponent)"
  );
});

test("keeps non-power punctuation and ordinary prose unchanged", () => {
  assert.equal(toPlainMathText("2026-08-09"), "2026-08-09");
  assert.equal(toPlainMathText("A left-hand turn"), "A left-hand turn");
  assert.equal(toPlainMathText("3 < 8"), "3 < 8");
  assert.equal(toPlainMathText("1,234"), "1,234");
});
