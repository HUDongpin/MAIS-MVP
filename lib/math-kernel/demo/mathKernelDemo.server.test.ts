import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMathKernelDemoPayload,
  exactDemoIntersectionForSlopeQuarter,
} from "./mathKernelDemo.server";

test("the server demo payload is JSON safe and derives both scenes from exact DTOs", () => {
  const payload = buildMathKernelDemoPayload();
  assert.equal(payload.ok, true);
  if (!payload.ok) return;
  assert.deepEqual(JSON.parse(JSON.stringify(payload.value)), payload.value);
  assert.equal(payload.value.geometry.solution.answer.mathJson !== null, true);
  assert.equal(payload.value.geometry.renderEdgeLength, 2);
  assert.equal(payload.value.analytic.solution.intervalLatex, "[3,\\ 4]");
  assert.equal(payload.value.analytic.initialSlopeQuarter, 0);
  assert.equal(payload.value.analytic.exactIntersection.kind, "secant");

  const cached = buildMathKernelDemoPayload();
  assert.equal(cached.ok, true);
  if (cached.ok) assert.equal(cached.value, payload.value);
});

test("the constrained exact endpoint accepts only quarter-step demo slopes", () => {
  const exactIntersection = exactDemoIntersectionForSlopeQuarter(0);
  assert.equal(exactIntersection.ok, true);
  if (exactIntersection.ok && exactIntersection.value.kind === "secant") {
    assert.equal(exactIntersection.value.chordLengthSquared.mathJson, 9);
  }

  for (const invalid of [0.5, 9, -9, "0", null]) {
    const rejected = exactDemoIntersectionForSlopeQuarter(invalid);
    assert.equal(rejected.ok, false);
    if (!rejected.ok) assert.equal(rejected.error.code, "INVALID_INPUT");
  }
});

test("nonzero quarter steps stay exact and serializable", () => {
  const result = exactDemoIntersectionForSlopeQuarter(1);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.kind, "secant");
  assert.deepEqual(JSON.parse(JSON.stringify(result.value)), result.value);

  const cached = exactDemoIntersectionForSlopeQuarter(1);
  assert.equal(cached.ok, true);
  if (cached.ok) assert.equal(cached.value, result.value);
});

test("the exact endpoint includes both allowed boundary slopes", () => {
  for (const slopeQuarter of [-8, 8]) {
    const result = exactDemoIntersectionForSlopeQuarter(slopeQuarter);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.kind, "secant");
  }
});
