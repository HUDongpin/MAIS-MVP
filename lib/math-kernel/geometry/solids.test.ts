import assert from "node:assert/strict";
import { test } from "node:test";

import { KERNEL_ERROR_CODES } from "../shared/errors";
import {
  cubeCoordinates,
  cuboidCoordinates,
  regularQuadPyramidCoordinates,
  regularTetrahedronCoordinates,
} from "./solids";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected valid solid coordinates.");
  return result.value;
}

function expectError(
  result: { ok: true } | { ok: false; error: { code: string } },
  code: string,
): void {
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, code);
}

test("solid coordinate builders preserve the Python point order and coordinates", () => {
  const pyramid = unwrap(regularQuadPyramidCoordinates(2, 1));
  assert.deepEqual(Object.keys(pyramid), ["O", "A", "C", "B", "D", "P"]);
  assert.deepEqual(pyramid.O, [0, 0, 0]);
  assert.deepEqual(pyramid.A, [Math.sqrt(2), 0, 0]);
  assert.deepEqual(pyramid.C, [-Math.sqrt(2), 0, 0]);
  assert.deepEqual(pyramid.B, [0, Math.sqrt(2), 0]);
  assert.deepEqual(pyramid.D, [0, -Math.sqrt(2), 0]);
  assert.deepEqual(pyramid.P, [0, 0, 1]);

  const cuboid = unwrap(cuboidCoordinates(2, 3, 4));
  assert.deepEqual(Object.keys(cuboid), ["A", "B", "C", "D", "A1", "B1", "C1", "D1"]);
  assert.deepEqual(cuboid.C1, [2, 3, 4]);
  assert.deepEqual(unwrap(cubeCoordinates(2)), unwrap(cuboidCoordinates(2, 2, 2)));

  const tetra = unwrap(regularTetrahedronCoordinates());
  assert.deepEqual(Object.keys(tetra), ["A", "B", "C", "D"]);
  assert.deepEqual(tetra, {
    A: [1, 1, 1],
    B: [1, -1, -1],
    C: [-1, 1, -1],
    D: [-1, -1, 1],
  });
});

test("solid coordinates are immutable snapshots", () => {
  const cube = unwrap(cubeCoordinates(1));
  assert.equal(Object.isFrozen(cube), true);
  for (const point of Object.values(cube)) assert.equal(Object.isFrozen(point), true);
});

test("solid builders reject non-finite, non-positive, and degenerate dimensions", () => {
  expectError(regularQuadPyramidCoordinates(0, 1), KERNEL_ERROR_CODES.nonPositiveDimension);
  expectError(regularQuadPyramidCoordinates(2, -1), KERNEL_ERROR_CODES.nonPositiveDimension);
  expectError(cuboidCoordinates(1, Number.NaN, 2), KERNEL_ERROR_CODES.nonFiniteInput);
  expectError(cubeCoordinates(Number.POSITIVE_INFINITY), KERNEL_ERROR_CODES.nonFiniteInput);
  expectError(regularTetrahedronCoordinates(0), KERNEL_ERROR_CODES.nonPositiveDimension);
  expectError(regularTetrahedronCoordinates(Number.MIN_VALUE), KERNEL_ERROR_CODES.nonFiniteInput);
});
