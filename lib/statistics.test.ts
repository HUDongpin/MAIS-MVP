import assert from "node:assert/strict";
import { test } from "node:test";
import { computeRegression, computeStatistics } from "@/lib/statistics";

function approx(actual: number, expected: number, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) < epsilon, `expected ≈ ${expected}, got ${actual}`);
}

test("empty data has no summary", () => {
  assert.equal(computeStatistics([]), null);
});

test("classic data set: mean, sum, and both standard deviations", () => {
  // Wikipedia SD example: population σ = 2, sample s = √(32/7) ≈ 2.13809.
  const summary = computeStatistics([2, 4, 4, 4, 5, 5, 7, 9]);
  assert.ok(summary);
  if (!summary) return;
  assert.equal(summary.count, 8);
  assert.equal(summary.sum, 40);
  assert.equal(summary.mean, 5);
  approx(summary.populationStdDev, 2);
  approx(summary.sampleStdDev, Math.sqrt(32 / 7));
  assert.equal(summary.min, 2);
  assert.equal(summary.max, 9);
});

test("single value: SD is zero (population) and undefined (sample)", () => {
  const summary = computeStatistics([7]);
  assert.ok(summary);
  if (!summary) return;
  assert.equal(summary.count, 1);
  assert.equal(summary.mean, 7);
  assert.equal(summary.populationStdDev, 0);
  assert.ok(Number.isNaN(summary.sampleStdDev));
});

test("handles negative and decimal values", () => {
  const summary = computeStatistics([-2, 0, 2]);
  assert.ok(summary);
  if (!summary) return;
  assert.equal(summary.mean, 0);
  assert.equal(summary.min, -2);
  assert.equal(summary.max, 2);
  approx(summary.populationStdDev, Math.sqrt(8 / 3));
});

test("regression needs at least two points", () => {
  assert.equal(computeRegression([]), null);
  assert.equal(computeRegression([{ x: 1, y: 2 }]), null);
});

test("regression recovers a perfect line y = 1 + 2x with r = 1", () => {
  const reg = computeRegression([{ x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }, { x: 4, y: 9 }]);
  assert.ok(reg);
  if (!reg) return;
  assert.equal(reg.count, 4);
  approx(reg.slope, 2);
  approx(reg.intercept, 1);
  approx(reg.correlation, 1);
});

test("regression handles a noisy, negatively-correlated set", () => {
  // slope/intercept from least squares; r in (-1, 0).
  const reg = computeRegression([{ x: 1, y: 6 }, { x: 2, y: 5 }, { x: 3, y: 7 }, { x: 4, y: 3 }, { x: 5, y: 4 }]);
  assert.ok(reg);
  if (!reg) return;
  approx(reg.slope, -0.6);
  approx(reg.intercept, 6.8);
  assert.ok(reg.correlation < 0 && reg.correlation > -1);
});

test("regression with no spread in x has undefined slope and correlation", () => {
  const reg = computeRegression([{ x: 2, y: 1 }, { x: 2, y: 5 }]);
  assert.ok(reg);
  if (!reg) return;
  assert.ok(Number.isNaN(reg.slope));
  assert.ok(Number.isNaN(reg.correlation));
});
