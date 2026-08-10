import assert from "node:assert/strict";
import test from "node:test";

import {
  relationForDisplayedValue,
  spokenRelationForDisplayedValue,
} from "./numberPresentation";

test("display relations use equality when the shown decimal preserves the value", () => {
  assert.equal(relationForDisplayedValue(1, "1.00"), "=");
  assert.equal(relationForDisplayedValue(3 / 2, "1.50"), "=");
  assert.equal(relationForDisplayedValue(Math.sin(Math.PI / 6), "0.5"), "=");
  assert.equal(relationForDisplayedValue(Math.cos(Math.PI / 3), "0.5"), "=");
  assert.equal(relationForDisplayedValue(Math.tan(Math.PI / 4), "1"), "=");
  assert.equal(relationForDisplayedValue(1024.8700000000003, "1024.87"), "=");
  assert.equal(spokenRelationForDisplayedValue(Math.tan(Math.PI / 4), 1), "equals");
});

test("display relations use approximation when rounding changes the value", () => {
  assert.equal(relationForDisplayedValue(2 / 3, "0.67"), "≈");
  assert.equal(relationForDisplayedValue(Math.sqrt(2), "1.41"), "≈");
  assert.equal(relationForDisplayedValue(5e-10, 0), "≈");
  assert.equal(relationForDisplayedValue(1 + 5e-10, 1), "≈");
  assert.equal(relationForDisplayedValue(1.000_000_01, 1), "≈");
  assert.equal(spokenRelationForDisplayedValue(2 / 3, "0.67"), "is approximately");
});

test("non-finite values are never silently treated as exact displayed numbers", () => {
  assert.equal(relationForDisplayedValue(Number.NaN, "0"), "≈");
  assert.equal(relationForDisplayedValue(1, Number.POSITIVE_INFINITY), "≈");
});
