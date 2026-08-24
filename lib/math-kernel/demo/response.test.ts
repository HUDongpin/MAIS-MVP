import assert from "node:assert/strict";
import test from "node:test";

import { exactDemoIntersectionForSlopeQuarter } from "./mathKernelDemo.server";
import {
  parseExactDemoIntersection,
  parseExactDemoResponse,
} from "./response";

function validResponseValue(): unknown {
  const result = exactDemoIntersectionForSlopeQuarter(4);
  if (!result.ok) throw new Error(result.error.message);
  assert.equal(result.ok, true);
  return JSON.parse(JSON.stringify(result.value)) as unknown;
}

test("the client response guard restores a complete JSON secant DTO", () => {
  const parsed = parseExactDemoIntersection(validResponseValue());
  assert.ok(parsed);
  assert.equal(parsed.kind, "secant");
  assert.deepEqual(parsed.chordLengthSquared.mathJson, ["Rational", 576, 49]);
});

test("the client response guard correlates an exact response to the requested slope", () => {
  const value = validResponseValue();
  assert.ok(parseExactDemoResponse({ ok: true, slopeQuarter: 4, value }, 4));
  assert.equal(
    parseExactDemoResponse({ ok: true, slopeQuarter: 3, value }, 4),
    null,
  );
  assert.equal(
    parseExactDemoResponse({ ok: true, slopeQuarter: 4, value, extra: true }, 4),
    null,
  );
});

test("the client response guard rejects incomplete, non-finite, and malformed exact values", () => {
  const missingPoint = validResponseValue() as {
    points: unknown[];
  };
  missingPoint.points.pop();
  assert.equal(parseExactDemoIntersection(missingPoint), null);

  const nonFinite = validResponseValue() as {
    chordLengthSquared: { approx: number };
  };
  nonFinite.chordLengthSquared.approx = Number.POSITIVE_INFINITY;
  assert.equal(parseExactDemoIntersection(nonFinite), null);

  const invalidMathJson = validResponseValue() as {
    chordLengthSquared: { mathJson: unknown };
  };
  invalidMathJson.chordLengthSquared.mathJson = [123];
  assert.equal(parseExactDemoIntersection(invalidMathJson), null);

  const extraField = validResponseValue() as Record<string, unknown>;
  extraField.boxedExpression = {};
  assert.equal(parseExactDemoIntersection(extraField), null);
});
