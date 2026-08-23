import assert from "node:assert/strict";
import { test } from "node:test";

import { KERNEL_ERROR_CODES } from "./errors";
import {
  MATH_JSON_LIMITS,
  validateMathJson,
} from "./mathjson";
import type {
  ExactValueDto,
  IntervalEndpointDto,
  KernelResult,
  SolutionStepDto,
} from "./types";

function nestedMathJson(arrayDepth: number): unknown {
  let value: unknown = 1;
  for (let index = 0; index < arrayDepth; index += 1) {
    value = ["Identity", value];
  }
  return value;
}

test("validates application-constructed MathJSON without changing its JSON shape", () => {
  const input = [
    "Multiply",
    ["Rational", 2, 11],
    ["Sqrt", 22],
  ] as const;

  const result = validateMathJson(input);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value, input);
  assert.deepEqual(JSON.parse(JSON.stringify(result.value)), input);
});

test("accepts exactly the configured MathJSON depth and node budgets", () => {
  const depthAtLimit = validateMathJson(
    nestedMathJson(MATH_JSON_LIMITS.maxDepth - 1),
  );
  const nodesAtLimit = validateMathJson([
    "List",
    ...Array.from({ length: MATH_JSON_LIMITS.maxNodes - 2 }, () => 0),
  ]);

  assert.equal(depthAtLimit.ok, true);
  assert.equal(nodesAtLimit.ok, true);
});

test("rejects MathJSON deeper than 64 levels with a stable error code", () => {
  const result = validateMathJson(nestedMathJson(MATH_JSON_LIMITS.maxDepth));

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, KERNEL_ERROR_CODES.mathJsonDepthLimit);
});

test("rejects MathJSON larger than 2000 nodes with a stable error code", () => {
  const result = validateMathJson([
    "List",
    ...Array.from({ length: MATH_JSON_LIMITS.maxNodes - 1 }, () => 0),
  ]);

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, KERNEL_ERROR_CODES.mathJsonNodeLimit);
});

test("rejects cyclic input rather than recursing or serializing it", () => {
  const cyclic: unknown[] = ["Add", 1];
  cyclic.push(cyclic);

  const result = validateMathJson(cyclic);

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, KERNEL_ERROR_CODES.mathJsonCycle);
});

test("rejects non-JSON values, non-finite numbers, sparse arrays, and class instances", () => {
  const sparse = ["List", 1, 2];
  delete sparse[1];

  const cases: ReadonlyArray<readonly [unknown, string]> = [
    [undefined, KERNEL_ERROR_CODES.mathJsonInvalidType],
    [BigInt(1), KERNEL_ERROR_CODES.mathJsonInvalidType],
    [() => 1, KERNEL_ERROR_CODES.mathJsonInvalidType],
    [Symbol("x"), KERNEL_ERROR_CODES.mathJsonInvalidType],
    [Number.NaN, KERNEL_ERROR_CODES.mathJsonNonFiniteNumber],
    [Number.POSITIVE_INFINITY, KERNEL_ERROR_CODES.mathJsonNonFiniteNumber],
    [sparse, KERNEL_ERROR_CODES.mathJsonInvalidType],
    [new Date(0), KERNEL_ERROR_CODES.mathJsonInvalidType],
  ];

  for (const [input, expectedCode] of cases) {
    const result = validateMathJson(input);
    assert.equal(result.ok, false, `expected rejection for ${String(input)}`);
    if (result.ok) continue;
    assert.equal(result.error.code, expectedCode);
  }
});

test("rejects arrays without a MathJSON operator and unsupported object shapes", () => {
  for (const input of [[], [1, 2], { arbitrary: "object" }]) {
    const result = validateMathJson(input);
    assert.equal(result.ok, false);
    if (result.ok) continue;
    assert.equal(result.error.code, KERNEL_ERROR_CODES.mathJsonInvalidShape);
  }
});

test("shared DTO contracts remain plain JSON data", () => {
  const value: ExactValueDto = {
    schemaVersion: 1,
    mathJson: ["Rational", 1, 3],
    latex: "\\frac{1}{3}",
    decimal: "0.333333333333333333333",
    approx: 1 / 3,
  };
  const step: SolutionStepDto = {
    id: "reduce-fraction",
    title: "Reduce the fraction",
    explanation: "Divide numerator and denominator by their common factor.",
    value,
  };
  const endpoint: IntervalEndpointDto = {
    kind: "finite",
    value,
    closed: true,
    witness: {
      kind: "attained",
      parameters: { m: value },
      note: "The vertical line attains this endpoint.",
    },
  };
  const success: KernelResult<IntervalEndpointDto> = {
    ok: true,
    value: endpoint,
  };

  assert.deepEqual(JSON.parse(JSON.stringify({ step, success })), {
    step,
    success,
  });
});
