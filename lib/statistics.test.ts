import assert from "node:assert/strict";
import { test } from "node:test";
import { computeStatistics } from "@/lib/statistics";

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
