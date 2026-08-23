import assert from "node:assert/strict";
import { test } from "node:test";

import { KERNEL_ERROR_CODES } from "./errors";
import {
  MATH_JSON_LIMITS,
  validateMathJson,
} from "./mathjson";
import type {
  ExactEndpointDto,
  ExactIntervalDto,
  ExactValueDto,
  KernelResult,
  MathJsonExpr,
  RangeWitnessDto,
  SolutionStepDto,
} from "./types";
import type {
  KernelErrorDto,
  MathKernelErrorCode,
} from "./errors";

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

test("inspects non-enumerable own properties for unsafe values and cycles", () => {
  const hiddenBigInt = { sym: "x" };
  Object.defineProperty(hiddenBigInt, "hidden", {
    value: BigInt(1),
  });
  const hiddenFunction = { sym: "x" };
  Object.defineProperty(hiddenFunction, "hidden", {
    value: () => 1,
  });
  const hiddenCycle = { sym: "x" } as { sym: string; hidden?: unknown };
  Object.defineProperty(hiddenCycle, "hidden", {
    value: hiddenCycle,
  });

  const cases: ReadonlyArray<readonly [unknown, string]> = [
    [hiddenBigInt, KERNEL_ERROR_CODES.mathJsonInvalidType],
    [hiddenFunction, KERNEL_ERROR_CODES.mathJsonInvalidType],
    [hiddenCycle, KERNEL_ERROR_CODES.mathJsonCycle],
  ];

  for (const [input, expectedCode] of cases) {
    const result = validateMathJson(input);
    assert.equal(result.ok, false);
    if (result.ok) continue;
    assert.equal(result.error.code, expectedCode);
  }
});

test("rejects accessor properties without executing their getters", () => {
  let objectGetterReads = 0;
  const objectWithAccessor = { sym: "x" };
  Object.defineProperty(objectWithAccessor, "hidden", {
    get() {
      objectGetterReads += 1;
      return "unsafe";
    },
  });

  let arrayGetterReads = 0;
  const arrayWithAccessor: unknown[] = ["Add", 1];
  Object.defineProperty(arrayWithAccessor, "1", {
    configurable: true,
    enumerable: true,
    get() {
      arrayGetterReads += 1;
      return 1;
    },
  });

  for (const input of [objectWithAccessor, arrayWithAccessor]) {
    const result = validateMathJson(input);
    assert.equal(result.ok, false);
    if (result.ok) continue;
    assert.equal(result.error.code, KERNEL_ERROR_CODES.mathJsonInvalidType);
  }
  assert.equal(objectGetterReads, 0);
  assert.equal(arrayGetterReads, 0);
});

test("rejects arrays with custom prototypes or non-index own keys", () => {
  class MathJsonArraySubclass extends Array<unknown> {}

  const withNamedProperty = ["Add", 1] as unknown[] & { extra?: unknown };
  withNamedProperty.extra = 2;
  const withHiddenProperty = ["Add", 1];
  Object.defineProperty(withHiddenProperty, "hidden", { value: "metadata" });
  const withCustomPrototype = ["Add", 1];
  Object.setPrototypeOf(withCustomPrototype, Object.create(Array.prototype));
  const subclass = new MathJsonArraySubclass("Add", 1);

  for (const input of [
    withNamedProperty,
    withHiddenProperty,
    withCustomPrototype,
    subclass,
  ]) {
    const result = validateMathJson(input);
    assert.equal(result.ok, false);
    if (result.ok) continue;
    assert.equal(result.error.code, KERNEL_ERROR_CODES.mathJsonInvalidType);
  }
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

test("accepts CE 0.118.1 object-form nodes and DictionaryValue variants", () => {
  const validInputs: readonly unknown[] = [
    { num: "123.45", comment: "exact decimal" },
    { sym: "x", latex: "x" },
    { str: "label", wikidata: "Q1" },
    {
      fn: ["Add", 1, { sym: "x" }],
      sourceOffsets: [0, 4],
    },
    { fn: [{ sym: "Add" }, 1, 2] },
    {
      dict: {
        flag: true,
        count: 2,
        label: "value",
        expression: { sym: "x" },
        values: [false, 3, "text", { num: "4" }, [{ str: "nested" }]],
      },
      documentation: "A typed dictionary",
    },
  ];

  for (const input of validInputs) {
    const result = validateMathJson(input);
    assert.equal(result.ok, true);
  }
});

test("requires object-form fn to be a non-empty function array with a symbol head", () => {
  const invalidFunctions: readonly unknown[] = [
    { fn: "Add" },
    { fn: [] },
    { fn: [1, 2] },
    { fn: [{ num: "1" }, 2] },
    { fn: { sym: "Add" } },
  ];

  for (const input of invalidFunctions) {
    const result = validateMathJson(input);
    assert.equal(result.ok, false);
    if (result.ok) continue;
    assert.equal(result.error.code, KERNEL_ERROR_CODES.mathJsonInvalidShape);
  }
});

test("rejects values outside CE 0.118.1 DictionaryValue", () => {
  const invalidDictionaries: readonly unknown[] = [
    { dict: { invalid: null } },
    { dict: { invalid: { arbitrary: "object" } } },
    { dict: { invalid: [1, null] } },
    { dict: { invalid: { fn: "Add" } } },
  ];

  for (const input of invalidDictionaries) {
    const result = validateMathJson(input);
    assert.equal(result.ok, false);
    if (result.ok) continue;
    assert.equal(result.error.code, KERNEL_ERROR_CODES.mathJsonInvalidShape);
  }
});

test("rejects unknown or ill-typed MathJSON object attributes", () => {
  const invalidAttributes: readonly unknown[] = [
    { sym: "x", comment: 42 },
    { sym: "x", unknownAttribute: "value" },
    { fn: ["Add", 1], sourceOffsets: [0] },
    { dict: {}, latex: null },
  ];

  for (const input of invalidAttributes) {
    const result = validateMathJson(input);
    assert.equal(result.ok, false);
    if (result.ok) continue;
    assert.equal(result.error.code, KERNEL_ERROR_CODES.mathJsonInvalidShape);
  }
});

test("shared DTO contracts remain plain JSON data", () => {
  const jsonSafeExpression: MathJsonExpr = {
    dict: {
      enabled: true,
      optional: null,
      nested: ["value", 1, false],
    },
  };
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
  const witness: RangeWitnessDto = {
    kind: "attained",
    parameters: { m: value },
    note: "The vertical line attains this endpoint.",
  };
  const lower: ExactEndpointDto = {
    kind: "finite",
    value,
    closed: true,
    witnesses: [witness],
  };
  const upper: ExactEndpointDto = {
    kind: "infinity",
    sign: 1,
    closed: false,
  };
  const interval: ExactIntervalDto = {
    lower,
    upper,
  };
  const success: KernelResult<ExactIntervalDto> = {
    ok: true,
    value: interval,
  };
  const errorCode: MathKernelErrorCode =
    KERNEL_ERROR_CODES.mathJsonInvalidShape;
  const error: KernelErrorDto = {
    code: errorCode,
    message: "Invalid expression shape.",
    details: { received: jsonSafeExpression },
  };

  assert.deepEqual(JSON.parse(JSON.stringify({ step, success, error })), {
    step,
    success,
    error,
  });
});
