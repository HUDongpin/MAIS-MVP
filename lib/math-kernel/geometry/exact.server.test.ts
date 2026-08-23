import assert from "node:assert/strict";
import { test } from "node:test";

import { CasSession } from "../cas/computeEngine.server";
import { KERNEL_ERROR_CODES } from "../shared/errors";
import type { ExactValueDto, MathJsonExpr } from "../shared/types";
import {
  boxVolume,
  dihedralCosFromNormals,
  dihedralHalfPlaneCos,
  formatExactVec3Latex,
  isReadableExactVec3,
  lineLineAngleCos,
  linePlaneAngleSin,
  midpoint,
  normalFromPoints,
  pointPlaneDistance,
  primitiveDirectionForDisplay,
  prismVolume,
  pyramidVolume,
  tetrahedronVolume,
  vec3,
} from "./exact.server";
import {
  regularTetrahedronCoordinatesRaw,
} from "./solids";

const SQRT_TWO = ["Sqrt", 2] as const;
const Q_ABOVE_SQRT_TWO = [
  "Rational",
  { num: "1414213562373095048801688724209698078569671875376948073177" },
  { num: "1e+57" },
] as const;

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected a successful exact geometry result.");
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
  value: ExactValueDto,
  expected: MathJsonExpr,
): void {
  assert.equal(unwrap(session.compareExactMathJson(value.mathJson, expected)), "equal");
}

function near(actual: number | null, expected: number): void {
  assert.notEqual(actual, null);
  if (actual === null) return;
  const tolerance = Math.max(1e-12, 1e-10 * Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= tolerance);
}

test("exact vectors preserve fractions and radicals as JSON-safe DTOs", () => {
  const session = new CasSession();
  const vector = unwrap(vec3(["Divide", 1, 3], ["Sqrt", 2], -4, session));
  exactEqual(session, vector.components[0], ["Rational", 1, 3]);
  exactEqual(session, vector.components[1], ["Sqrt", 2]);
  assert.deepEqual(JSON.parse(JSON.stringify(vector)), vector);
  assert.equal(Object.isFrozen(vector), true);
  assert.equal(Object.isFrozen(vector.components), true);

  const middle = unwrap(midpoint(
    [["Rational", 1, 3], ["Sqrt", 2], 0],
    [["Rational", 2, 3], ["Sqrt", 8], 2],
    session,
  ));
  exactEqual(session, middle.components[0], ["Rational", 1, 2]);
  exactEqual(session, middle.components[1], ["Divide", ["Multiply", 3, ["Sqrt", 2]], 2]);
  exactEqual(session, middle.components[2], 1);
  assert.match(unwrap(formatExactVec3Latex(middle)), /^\(.+,.+,.+\)$/);
  assert.equal(unwrap(isReadableExactVec3(middle, session)), true);
});

test("exact geometry reproduces angle, distance, dihedral, and volume goldens", () => {
  const session = new CasSession();
  exactEqual(session, unwrap(linePlaneAngleSin([1, 1, -1], [0, 0, 1], session)), ["Divide", ["Sqrt", 3], 3]);
  exactEqual(session, unwrap(lineLineAngleCos([1, 1, -1], [1, 0, 0], session)), ["Divide", ["Sqrt", 3], 3]);
  exactEqual(session, unwrap(pointPlaneDistance([0, 0, 1], [0, 0, 0], [0, 0, 1], session)), 1);

  const tetra = regularTetrahedronCoordinatesRaw({
    zero: 0,
    fromInteger: (value) => value,
    add: (left, right) => ["Add", left, right],
    sub: (left, right) => ["Subtract", left, right],
    mul: (left, right) => ["Multiply", left, right],
    div: (left, right) => ["Divide", left, right],
    abs: (value) => ["Abs", value],
    sqrt: (value) => ["Sqrt", value],
  }, ["Multiply", 2, ["Sqrt", 2]] as MathJsonExpr);
  exactEqual(session, unwrap(dihedralHalfPlaneCos(tetra.A, tetra.B, tetra.C, tetra.D, session)), ["Rational", 1, 3]);
  exactEqual(session, unwrap(tetrahedronVolume(tetra.A, tetra.B, tetra.C, tetra.D, session)), ["Rational", 8, 3]);

  exactEqual(session, unwrap(boxVolume(2, 3, 4, session)), 24);
  exactEqual(session, unwrap(prismVolume(7, 5, session)), 35);
  exactEqual(session, unwrap(pyramidVolume(4, 3, session)), 4);
  exactEqual(
    session,
    unwrap(tetrahedronVolume([0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], session)),
    0,
  );
});

test("exact and numeric approximations agree within the kernel tolerance", () => {
  const session = new CasSession();
  const cases = [
    unwrap(linePlaneAngleSin([1, 2, 3], [3, -1, 4], session)),
    unwrap(lineLineAngleCos([1, 2, 3], [3, -1, 4], session)),
    unwrap(pointPlaneDistance([2, 3, 5], [1, -1, 0], [3, -1, 4], session)),
    unwrap(dihedralCosFromNormals([1, 2, 3], [3, -1, 4], session)),
  ];
  const expected = [
    Math.abs(13) / (Math.sqrt(14) * Math.sqrt(26)),
    Math.abs(13) / (Math.sqrt(14) * Math.sqrt(26)),
    Math.abs(19) / Math.sqrt(26),
    13 / (Math.sqrt(14) * Math.sqrt(26)),
  ];
  cases.forEach((value, index) => near(value.approx, expected[index]));
});

test("exact norm proofs preserve a close positive radical difference", () => {
  const session = new CasSession();
  const positiveDifference = [
    "Subtract",
    Q_ABOVE_SQRT_TWO,
    SQRT_TWO,
  ] as MathJsonExpr;
  const direction = unwrap(vec3(positiveDifference, 0, 0, session));

  assert.deepEqual(
    direction.components[0].mathJson,
    unwrap(session.boxMathJson(positiveDifference)),
  );
  assert.equal(
    unwrap(session.compareExactOrder(direction.components[0].mathJson, 0)),
    "greater",
  );
  const closeAngle = unwrap(
    lineLineAngleCos([positiveDifference, 0, 0], [1, 0, 0], session),
  );
  exactEqual(session, closeAngle, 1);
  assert.equal(closeAngle.decimal, "1");
  assert.equal(closeAngle.approx, 1);
  exactEqual(
    session,
    unwrap(
      linePlaneAngleSin(
        [positiveDifference, 0, 0],
        [1, 0, 0],
        session,
      ),
    ),
    1,
  );
  const distance = unwrap(
    pointPlaneDistance(
      [positiveDifference, 0, 0],
      [0, 0, 0],
      [1, 1, 0],
      session,
    ),
  );
  exactEqual(
    session,
    distance,
    [
      "Abs",
      ["Multiply", positiveDifference, ["Divide", 1, ["Sqrt", 2]]],
    ],
  );
  assert.ok(direction.components[0].approx !== null);
  assert.ok(distance.approx !== null);
  assert.ok(
    Math.abs(
      (distance.approx ?? 0) -
      (direction.components[0].approx ?? 0) / Math.SQRT2,
    ) <= 1e-72,
  );
});

test("exact display direction has a defined rational primitive substitute", () => {
  const session = new CasSession();
  const direction = unwrap(primitiveDirectionForDisplay([6, -9, 3], session));
  exactEqual(session, direction.components[0], 2);
  exactEqual(session, direction.components[1], -3);
  exactEqual(session, direction.components[2], 1);
  const normal = unwrap(normalFromPoints([0, 0, 0], [1, 0, 0], [0, 1, 0], session));
  exactEqual(session, normal.components[2], 1);
});

test("exact APIs return explicit errors for zero, degenerate, non-real, and unprovable inputs", () => {
  expectError(vec3(["Sqrt", -1], 0, 0), KERNEL_ERROR_CODES.nonRealExpression);
  expectError(midpoint(["x", 0, 0], [0, 0, 0]), KERNEL_ERROR_CODES.nonRealExpression);
  expectError(normalFromPoints([0, 0, 0], [1, 1, 1], [2, 2, 2]), KERNEL_ERROR_CODES.collinearPlanePoints);
  expectError(primitiveDirectionForDisplay([0, 0, 0]), KERNEL_ERROR_CODES.zeroDirection);
  expectError(linePlaneAngleSin([0, 0, 0], [0, 0, 1]), KERNEL_ERROR_CODES.zeroDirection);
  expectError(linePlaneAngleSin([1, 0, 0], [0, 0, 0]), KERNEL_ERROR_CODES.degeneratePlane);
  expectError(lineLineAngleCos([0, 0, 0], [1, 0, 0]), KERNEL_ERROR_CODES.zeroDirection);
  expectError(pointPlaneDistance([1, 2, 3], [0, 0, 0], [0, 0, 0]), KERNEL_ERROR_CODES.degeneratePlane);
  expectError(
    dihedralHalfPlaneCos([0, 0, 0], [0, 0, 0], [1, 0, 0], [0, 1, 0]),
    KERNEL_ERROR_CODES.degenerateEdge,
  );
  expectError(
    dihedralHalfPlaneCos([0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0]),
    KERNEL_ERROR_CODES.degenerateHalfPlane,
  );
  expectError(dihedralCosFromNormals([0, 0, 0], [1, 0, 0]), KERNEL_ERROR_CODES.degenerateHalfPlane);
  expectError(boxVolume(2, -1, 4), KERNEL_ERROR_CODES.nonPositiveDimension);
});
