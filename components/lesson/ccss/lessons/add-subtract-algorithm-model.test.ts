import assert from "node:assert/strict";
import test from "node:test";
import { buildSubtractionRegrouping } from "./add-subtract-algorithm-model";

test("subtraction renames one ten as ten ones without changing the minuend", () => {
  const regrouping = buildSubtractionRegrouping(365, 248);

  assert.deepEqual(regrouping.renamedDigits, [3, 5, 15]);
  assert.equal(regrouping.renamedValue, 365);
  assert.equal(regrouping.borrowedAcrossZero, false);
});

test("subtraction can borrow through a zero tens digit", () => {
  const regrouping = buildSubtractionRegrouping(402, 175);

  assert.deepEqual(regrouping.renamedDigits, [3, 9, 12]);
  assert.equal(regrouping.renamedValue, 402);
  assert.equal(regrouping.borrowedAcrossZero, true);
});

test("subtraction renames the hundreds place when only the tens column needs a borrow", () => {
  const regrouping = buildSubtractionRegrouping(302, 191);

  assert.deepEqual(regrouping.renamedDigits, [2, 10, 2]);
  assert.equal(regrouping.renamedValue, 302);
  assert.equal(regrouping.borrowedAcrossZero, false);
});
