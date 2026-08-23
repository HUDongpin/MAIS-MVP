import assert from "node:assert/strict";
import { test } from "node:test";

import { CasSession } from "../cas/computeEngine.server";
import { KERNEL_ERROR_CODES } from "../shared/errors";
import type { ExactValueDto, MathJsonExpr } from "../shared/types";
import {
  regularQuadPyramidLinePlaneAngleFormula,
  solveCubeLinePlaneAngle,
  solvePyramidLinePlaneAngle,
  solveRegularQuadPyramidLinePlaneAngle,
} from "./solvers.server";

const SQRT_TWO = ["Sqrt", 2] as const;
const Q_ABOVE_SQRT_TWO = [
  "Rational",
  { num: "1414213562373095048801688724209698078569671875376948073177" },
  { num: "1e+57" },
] as const;
const Q_ABOVE_SQRT_TWO_BEYOND_DISPLAY_PRECISION = [
  "Rational",
  {
    num: "141421356237309504880168872420969807856967187537694807317667973799073247846210703885038753432764157273501384624",
  },
  { num: "1e+110" },
] as const;

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected a successful geometry solution.");
  return result.value;
}

function expectError(
  result: { ok: true } | { ok: false; error: { code: string } },
  code: string,
): void {
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, code);
}

function exactEqual(
  session: CasSession,
  value: ExactValueDto | MathJsonExpr,
  expected: MathJsonExpr,
): void {
  const expression = typeof value === "object" && value !== null && !Array.isArray(value) && "mathJson" in value
    ? (value as ExactValueDto).mathJson
    : value as MathJsonExpr;
  assert.equal(unwrap(session.compareExactMathJson(expression, expected)), "equal");
}

function assertDeepFrozen(value: unknown): void {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child);
}

test("regular pyramid solver keeps exact points, render points, steps, and answer together", () => {
  const session = new CasSession();
  const solution = unwrap(solveRegularQuadPyramidLinePlaneAngle(undefined, session));

  assert.equal(solution.schemaVersion, 1);
  exactEqual(session, solution.answer, ["Divide", ["Multiply", 2, ["Sqrt", 22]], 11]);
  assert.deepEqual(Object.keys(solution.points), ["O", "A", "C", "B", "D", "P", "E"]);
  assert.deepEqual(Object.keys(solution.renderPoints), Object.keys(solution.points));
  assert.equal(solution.points.E.length, 3);
  assert.equal(solution.renderPoints.E.every(Number.isFinite), true);
  assert.equal(solution.intermediates.some((step) => step.id === "sinTheta"), true);
  const answerStep = solution.intermediates.find((step) => step.id === "sinTheta");
  assert.ok(answerStep?.value);
  if (answerStep?.value) exactEqual(session, answerStep.value, solution.answer.mathJson);
  assert.deepEqual(solution.provenance, {
    kernel: "geometry",
    operation: "regularQuadPyramidLinePlaneAngle",
    sourceRevision: "cf0bc1d68b4ea64307f57d7fac64667e6a3148cc",
  });
  assert.deepEqual(JSON.parse(JSON.stringify(solution)), solution);
  assertDeepFrozen(solution);
});

test("general regular pyramid formula is exact and the deprecated solver alias is compatible", () => {
  const session = new CasSession();
  const formula = regularQuadPyramidLinePlaneAngleFormula("a", "h");
  assert.deepEqual(formula, [
    "Divide",
    ["Multiply", 2, "a"],
    ["Sqrt", ["Add", ["Multiply", 5, ["Power", "a", 2]], ["Multiply", 2, ["Power", "h", 2]]]],
  ]);

  const canonical = unwrap(solveRegularQuadPyramidLinePlaneAngle({ baseEdge: 2, height: 1, scale: 1.5 }, session));
  const compatible = unwrap(solvePyramidLinePlaneAngle({ baseEdge: 2, height: 1, scale: 1.5 }, session));
  assert.deepEqual(compatible, canonical);

  for (const [baseEdge, height] of [[3, 4], [5, 2]] as const) {
    const general = unwrap(
      solveRegularQuadPyramidLinePlaneAngle(
        { baseEdge, height },
        session,
      ),
    );
    exactEqual(
      session,
      general.answer,
      regularQuadPyramidLinePlaneAngleFormula(baseEdge, height),
    );
  }
});

test("cube solver reproduces sqrt(3)/3 and finite render coordinates", () => {
  const session = new CasSession();
  const solution = unwrap(solveCubeLinePlaneAngle(undefined, session));
  exactEqual(session, solution.answer, ["Divide", ["Sqrt", 3], 3]);
  assert.deepEqual(Object.keys(solution.points), ["A", "B", "C", "D", "A1", "B1", "C1", "D1"]);
  assert.deepEqual(solution.renderPoints.C1, [2, 2, 2]);
  assert.equal(
    Object.values(solution.renderPoints).flat().every(Number.isFinite),
    true,
  );
  assert.equal(solution.provenance.operation, "cubeLinePlaneAngle");
});

test("solvers reject invalid exact dimensions, scales, and unrenderable approximations", () => {
  expectError(
    solveRegularQuadPyramidLinePlaneAngle({ baseEdge: 0 }),
    KERNEL_ERROR_CODES.nonPositiveDimension,
  );
  expectError(
    solveRegularQuadPyramidLinePlaneAngle({ height: ["Sqrt", -1] }),
    KERNEL_ERROR_CODES.nonRealExpression,
  );
  expectError(
    solveRegularQuadPyramidLinePlaneAngle({ baseEdge: "a" }),
    KERNEL_ERROR_CODES.nonRealExpression,
  );
  expectError(
    solveCubeLinePlaneAngle({ scale: 0 }),
    KERNEL_ERROR_CODES.invalidScale,
  );
  expectError(
    solveCubeLinePlaneAngle({ edge: ["Power", 10, 400] }),
    KERNEL_ERROR_CODES.exactToNumberFailed,
  );
});

test("solver dimension proofs preserve close radicals without DTO approximation ordering", () => {
  const positiveDifference = solveRegularQuadPyramidLinePlaneAngle({
    baseEdge: ["Subtract", Q_ABOVE_SQRT_TWO, SQRT_TWO],
    height: 1,
  });
  const solution = unwrap(positiveDifference);
  assert.equal(
    unwrap(new CasSession().compareExactOrder(solution.points.A[0].mathJson, 0)),
    "greater",
  );
  assert.equal(
    unwrap(new CasSession().compareExactOrder(solution.points.C[0].mathJson, 0)),
    "less",
  );
  assert.ok(solution.points.A[0].decimal !== null);
  assert.ok((solution.points.A[0].approx ?? 0) > 0);
  assert.ok((solution.points.C[0].approx ?? 0) < 0);
  assert.ok(solution.renderPoints.A[0] > 0);
  assert.ok(solution.renderPoints.C[0] < 0);

  expectError(
    solveRegularQuadPyramidLinePlaneAngle({
      baseEdge: [
        "Subtract",
        Q_ABOVE_SQRT_TWO_BEYOND_DISPLAY_PRECISION,
        SQRT_TWO,
      ],
      height: 1,
    }),
    KERNEL_ERROR_CODES.exactToNumberFailed,
  );

  expectError(
    solveRegularQuadPyramidLinePlaneAngle({
      baseEdge: ["Subtract", SQRT_TWO, Q_ABOVE_SQRT_TWO],
      height: 1,
    }),
    KERNEL_ERROR_CODES.nonPositiveDimension,
  );
});
