import assert from "node:assert/strict";
import { test } from "node:test";

import { KERNEL_ERROR_CODES } from "../shared/errors";
import type { Vec3 } from "./core";
import {
  correctTriangleWindingForMathZUpToWorldYUp,
  mathNormalToWorldNormal,
  mathZUpToWorldDeterminant,
  mathZUpToWorldYUp,
  reverseTriangleWinding,
  worldYUpToMathZUp,
} from "./coordinates";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected a valid coordinate transform.");
  return result.value;
}

function expectError(
  result: { ok: true } | { ok: false; error: { code: string } },
  code: string,
): void {
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, code);
}

function sub(left: Vec3<number>, right: Vec3<number>): Vec3<number> {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function cross(left: Vec3<number>, right: Vec3<number>): Vec3<number> {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function dot(left: Vec3<number>, right: Vec3<number>): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

test("math z-up maps to world y-up by (x,z,y)*scale and round-trips", () => {
  assert.deepEqual(unwrap(mathZUpToWorldYUp([1, 2, 3], 2)), [2, 6, 4]);
  const cases: readonly (readonly [Vec3<number>, number])[] = [
    [[1, 2, 3], 2],
    [[-4.5, 0, 7.25], 0.5],
    [[1e-6, -2e6, 3], -3],
  ];
  for (const [point, scale] of cases) {
    assert.deepEqual(
      unwrap(worldYUpToMathZUp(unwrap(mathZUpToWorldYUp(point, scale)), scale)),
      point,
    );
  }
});

test("axis swap reverses handedness for positive scale and winding correction aligns normals", () => {
  assert.equal(unwrap(mathZUpToWorldDeterminant(2)), -8);
  assert.equal(unwrap(mathZUpToWorldDeterminant(-2)), 8);

  const mathTriangle = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
  ] as const;
  const worldTriangle = mathTriangle.map((point) =>
    unwrap(mathZUpToWorldYUp(point, 2)),
  ) as unknown as readonly [Vec3<number>, Vec3<number>, Vec3<number>];
  const corrected = reverseTriangleWinding(worldTriangle);
  assert.deepEqual(corrected, [worldTriangle[0], worldTriangle[2], worldTriangle[1]]);

  const faceNormal = cross(sub(corrected[1], corrected[0]), sub(corrected[2], corrected[0]));
  const mappedMathNormal = unwrap(mathNormalToWorldNormal([0, 0, 1], 2));
  assert.ok(dot(faceNormal, mappedMathNormal) > 0);
});

test("scale sign controls full-transform winding and inverse-transpose normal direction", () => {
  const triangle = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
  ] as const;

  assert.deepEqual(
    unwrap(correctTriangleWindingForMathZUpToWorldYUp(triangle, 2)),
    [triangle[0], triangle[2], triangle[1]],
  );
  assert.deepEqual(
    unwrap(correctTriangleWindingForMathZUpToWorldYUp(triangle, -2)),
    triangle,
  );

  const positiveNormal = unwrap(mathNormalToWorldNormal([0, 0, 2], 2));
  const negativeNormal = unwrap(mathNormalToWorldNormal([0, 0, 2], -2));
  assert.ok(positiveNormal[1] > 0);
  assert.ok(negativeNormal[1] < 0);
  assert.equal(positiveNormal[0], 0);
  assert.equal(positiveNormal[2], 0);
  assert.equal(negativeNormal[0], 0);
  assert.equal(negativeNormal[2], 0);

  expectError(
    correctTriangleWindingForMathZUpToWorldYUp(triangle, 0),
    KERNEL_ERROR_CODES.invalidScale,
  );
});

test("coordinate transforms reject invalid scale, non-finite points, and zero normals", () => {
  expectError(mathZUpToWorldYUp([1, 2, 3], 0), KERNEL_ERROR_CODES.invalidScale);
  expectError(worldYUpToMathZUp([1, 2, 3], Number.NaN), KERNEL_ERROR_CODES.invalidScale);
  expectError(mathZUpToWorldDeterminant(Number.POSITIVE_INFINITY), KERNEL_ERROR_CODES.invalidScale);
  expectError(mathZUpToWorldYUp([1, Number.NaN, 3]), KERNEL_ERROR_CODES.nonFiniteInput);
  expectError(
    mathZUpToWorldYUp([Number.MIN_VALUE, 0, 0], 0.5),
    KERNEL_ERROR_CODES.nonFiniteInput,
  );
  expectError(
    worldYUpToMathZUp([Number.MIN_VALUE, 0, 0], 2),
    KERNEL_ERROR_CODES.nonFiniteInput,
  );
  expectError(mathNormalToWorldNormal([0, 0, 0]), KERNEL_ERROR_CODES.zeroDirection);
  expectError(
    mathNormalToWorldNormal([1e-300, 0, 0], 1e200),
    KERNEL_ERROR_CODES.nonFiniteInput,
  );
  expectError(
    mathNormalToWorldNormal([Number.MIN_VALUE, 1, 0], 2),
    KERNEL_ERROR_CODES.nonFiniteInput,
  );
});
