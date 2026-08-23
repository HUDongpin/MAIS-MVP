import assert from "node:assert/strict";
import { test } from "node:test";

import { KERNEL_ERROR_CODES } from "../shared/errors";
import { vecCross, vecDot, type Vec3 } from "./core";
import {
  boxVolume,
  dihedralCos,
  dihedralCosFromNormals,
  dihedralHalfPlaneCos,
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
} from "./numeric";
import {
  cubeCoordinates,
  regularQuadPyramidCoordinates,
  regularTetrahedronCoordinates,
} from "./solids";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected a successful geometry result.");
  return result.value;
}

function expectError(
  result: { ok: true } | { ok: false; error: { code: string } },
  code: string,
): void {
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, code);
}

function near(actual: number, expected: number): void {
  const tolerance = Math.max(1e-12, 1e-10 * Math.abs(expected));
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} is not within ${tolerance} of ${expected}`,
  );
}

test("numeric vector construction, midpoint, normal, and display direction are deterministic", () => {
  assert.deepEqual(unwrap(vec3(1, 2, 3)), [1, 2, 3]);
  assert.deepEqual(unwrap(midpoint([1, 2, 3], [5, 8, 13])), [3, 5, 8]);
  assert.deepEqual(
    unwrap(normalFromPoints([0, 0, 0], [1, 0, 0], [0, 1, 0])),
    [0, 0, 1],
  );
  assert.deepEqual(unwrap(primitiveDirectionForDisplay([6, -9, 3])), [2, -3, 1]);
  assert.deepEqual(
    unwrap(primitiveDirectionForDisplay([Math.sqrt(2), 0, Math.sqrt(3)])),
    [Math.sqrt(2), 0, Math.sqrt(3)],
  );
});

test("numeric goldens reproduce line-plane, line-line, point-plane, and dihedral results", () => {
  const cube = unwrap(cubeCoordinates(1));
  const a1c = unwrap(vec3(
    cube.C[0] - cube.A1[0],
    cube.C[1] - cube.A1[1],
    cube.C[2] - cube.A1[2],
  ));
  const ab = unwrap(vec3(
    cube.B[0] - cube.A[0],
    cube.B[1] - cube.A[1],
    cube.B[2] - cube.A[2],
  ));
  const baseNormal = unwrap(normalFromPoints(cube.A, cube.B, cube.D));

  near(unwrap(linePlaneAngleSin(a1c, baseNormal)), Math.sqrt(3) / 3);
  near(unwrap(lineLineAngleCos(a1c, ab)), Math.sqrt(3) / 3);
  near(unwrap(pointPlaneDistance(cube.A1, cube.A, baseNormal)), 1);

  const tetra = unwrap(regularTetrahedronCoordinates());
  near(unwrap(dihedralHalfPlaneCos(tetra.A, tetra.B, tetra.C, tetra.D)), 1 / 3);
  near(unwrap(dihedralCos(tetra.A, tetra.B, tetra.C, tetra.D)), 1 / 3);
  near(
    unwrap(
      dihedralCosFromNormals(
        unwrap(normalFromPoints(tetra.A, tetra.B, tetra.C)),
        unwrap(normalFromPoints(tetra.A, tetra.B, tetra.D)),
      ),
    ),
    1 / 3,
  );
});

test("regular pyramid line-plane geometry matches the default and general formula", () => {
  for (const [baseEdge, height] of [[2, 1], [3, 4], [Math.sqrt(2), 2.5]] as const) {
    const points = unwrap(regularQuadPyramidCoordinates(baseEdge, height));
    const e = unwrap(midpoint(points.P, points.C));
    const be: Vec3<number> = [
      e[0] - points.B[0],
      e[1] - points.B[1],
      e[2] - points.B[2],
    ];
    const normal = unwrap(normalFromPoints(points.P, points.A, points.C));
    const actual = unwrap(linePlaneAngleSin(be, normal));
    const expected = (2 * baseEdge) / Math.sqrt(5 * baseEdge * baseEdge + 2 * height * height);
    near(actual, expected);
  }

  const defaults = unwrap(regularQuadPyramidCoordinates(2, 1));
  const e = unwrap(midpoint(defaults.P, defaults.C));
  near(
    unwrap(linePlaneAngleSin(
      [e[0] - defaults.B[0], e[1] - defaults.B[1], e[2] - defaults.B[2]],
      unwrap(normalFromPoints(defaults.P, defaults.A, defaults.C)),
    )),
    (2 * Math.sqrt(22)) / 11,
  );
});

test("numeric volumes reproduce goldens and remain nonnegative", () => {
  assert.equal(unwrap(boxVolume(2, 3, 4)), 24);
  assert.equal(unwrap(prismVolume(7, 5)), 35);
  assert.equal(unwrap(pyramidVolume(4, 3)), 4);

  const tetra = unwrap(regularTetrahedronCoordinates());
  assert.equal(unwrap(tetrahedronVolume(tetra.A, tetra.B, tetra.C, tetra.D)), 8 / 3);
  assert.equal(
    unwrap(tetrahedronVolume([0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0])),
    0,
  );
  assert.equal(
    unwrap(
      tetrahedronVolume(
        [0, 0, 0],
        [1, 2, 3],
        [4, 5, 6],
        [5, 7, 9],
      ),
    ),
    0,
  );

  const cases = [
    unwrap(tetrahedronVolume([0, 0, 0], [2, 0, 0], [0, 3, 0], [0, 0, -4])),
    unwrap(pointPlaneDistance([0, 0, -5], [0, 0, 0], [0, 0, 2])),
  ];
  for (const value of cases) assert.ok(value >= 0);
});

test("positive nonzero volumes that underflow do not silently become zero", () => {
  expectError(boxVolume(Number.MIN_VALUE, 0.5, 1), KERNEL_ERROR_CODES.nonFiniteInput);
  expectError(prismVolume(Number.MIN_VALUE, 0.5), KERNEL_ERROR_CODES.nonFiniteInput);
  expectError(pyramidVolume(Number.MIN_VALUE, 1), KERNEL_ERROR_CODES.nonFiniteInput);
  expectError(
    tetrahedronVolume(
      [0, 0, 0],
      [1e-200, 0, 0],
      [0, 1e-200, 0],
      [0, 0, 1e-200],
    ),
    KERNEL_ERROR_CODES.nonFiniteInput,
  );
  expectError(
    tetrahedronVolume(
      [0, 0, 0],
      [1e-200, 0, 0],
      [0, 1e-200, 0],
      [0, 0, 1],
    ),
    KERNEL_ERROR_CODES.nonFiniteInput,
  );
});

test("unit-interval clamping accepts rounding noise and normalized subnormal ratios", () => {
  assert.equal(unwrap(lineLineAngleCos([1, 1, 1], [1, 1, 1])), 1);
  const first: Vec3<number> = [
    1.500183790922165e-162,
    -1.8540558265522123e-162,
    2.4466676358133556e-162,
  ];
  const second: Vec3<number> = [
    1.812811717856482e-162,
    -1.361636628530331e-162,
    1.4252131470584995e-162,
  ];
  near(
    unwrap(lineLineAngleCos(first, second)),
    unwrap(
      lineLineAngleCos(
        first.map((value) => value / 1e-162) as unknown as Vec3<number>,
        second.map((value) => value / 1e-162) as unknown as Vec3<number>,
      ),
    ),
  );
});

test("angle and distance ratios remain accurate for representable subnormal directions", () => {
  const tiny = 2e-162;
  const axis: Vec3<number> = [tiny, 0, 0];
  const diagonal: Vec3<number> = [tiny, tiny, 0];
  const expectedCosine = Math.SQRT1_2;

  near(unwrap(lineLineAngleCos(axis, diagonal)), expectedCosine);
  near(unwrap(linePlaneAngleSin(axis, diagonal)), expectedCosine);
  near(unwrap(dihedralCosFromNormals(axis, diagonal)), expectedCosine);
  near(
    unwrap(
      dihedralHalfPlaneCos(
        [0, 0, 0],
        [0, 0, 1],
        axis,
        diagonal,
      ),
    ),
    expectedCosine,
  );
  near(
    unwrap(pointPlaneDistance([1, 1, 0], [0, 0, 0], diagonal)),
    Math.SQRT2,
  );
});

test("subnormal derived geometry never masquerades as exact degeneracy or zero", () => {
  expectError(
    normalFromPoints(
      [0, 0, 0],
      [1e-200, 0, 0],
      [0, 1e-200, 0],
    ),
    KERNEL_ERROR_CODES.nonFiniteInput,
  );
  expectError(
    pointPlaneDistance(
      [0, Number.MIN_VALUE, 0],
      [0, 0, 0],
      [2, 1, 0],
    ),
    KERNEL_ERROR_CODES.nonFiniteInput,
  );

  const edgeStart: Vec3<number> = [0, 0, 0];
  const edgeEnd: Vec3<number> = [2, 1, 0];
  const secondHalfPlanePoint: Vec3<number> = [0, 0, 1];
  near(
    unwrap(
      dihedralHalfPlaneCos(
        edgeStart,
        edgeEnd,
        [
          -8 * Number.MIN_VALUE,
          -6 * Number.MIN_VALUE,
          Number.MIN_VALUE,
        ],
        secondHalfPlanePoint,
      ),
    ),
    unwrap(
      dihedralHalfPlaneCos(
        edgeStart,
        edgeEnd,
        [-8, -6, 1],
        secondHalfPlanePoint,
      ),
    ),
  );
});

test("numeric vector properties use the shared generic algebra", () => {
  const ops = {
    zero: 0,
    fromInteger: (value: number) => value,
    add: (left: number, right: number) => left + right,
    sub: (left: number, right: number) => left - right,
    mul: (left: number, right: number) => left * right,
    div: (left: number, right: number) => left / right,
    abs: Math.abs,
    sqrt: Math.sqrt,
  };
  const left: Vec3<number> = [3, -2, 5];
  const right: Vec3<number> = [-7, 4, 1];
  const cross = vecCross(ops, left, right);
  assert.equal(vecDot(ops, left, right), vecDot(ops, right, left));
  assert.equal(vecDot(ops, cross, left), 0);
  assert.equal(vecDot(ops, cross, right), 0);
});

test("numeric APIs return stable errors instead of NaN or Infinity", () => {
  expectError(vec3(Number.NaN, 0, 0), KERNEL_ERROR_CODES.nonFiniteInput);
  expectError(midpoint([Number.POSITIVE_INFINITY, 0, 0], [0, 0, 0]), KERNEL_ERROR_CODES.nonFiniteInput);
  expectError(
    normalFromPoints([0, 0, 0], [1, 1, 1], [2, 2, 2]),
    KERNEL_ERROR_CODES.collinearPlanePoints,
  );
  expectError(primitiveDirectionForDisplay([0, 0, 0]), KERNEL_ERROR_CODES.zeroDirection);
  expectError(
    primitiveDirectionForDisplay([Number.MIN_VALUE, 0, 0]),
    KERNEL_ERROR_CODES.nonFiniteInput,
  );
  expectError(linePlaneAngleSin([0, 0, 0], [0, 0, 1]), KERNEL_ERROR_CODES.zeroDirection);
  expectError(linePlaneAngleSin([1, 0, 0], [0, 0, 0]), KERNEL_ERROR_CODES.degeneratePlane);
  expectError(lineLineAngleCos([1, 0, 0], [0, 0, 0]), KERNEL_ERROR_CODES.zeroDirection);
  expectError(pointPlaneDistance([0, 0, 1], [0, 0, 0], [0, 0, 0]), KERNEL_ERROR_CODES.degeneratePlane);
  expectError(
    dihedralHalfPlaneCos([0, 0, 0], [0, 0, 0], [1, 0, 0], [0, 1, 0]),
    KERNEL_ERROR_CODES.degenerateEdge,
  );
  expectError(
    dihedralHalfPlaneCos([0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0]),
    KERNEL_ERROR_CODES.degenerateHalfPlane,
  );
  expectError(dihedralCosFromNormals([0, 0, 0], [0, 1, 0]), KERNEL_ERROR_CODES.degenerateHalfPlane);
  expectError(boxVolume(1, 0, 2), KERNEL_ERROR_CODES.nonPositiveDimension);
  expectError(prismVolume(-1, 2), KERNEL_ERROR_CODES.nonPositiveDimension);
  expectError(pyramidVolume(4, Number.MAX_VALUE), KERNEL_ERROR_CODES.nonFiniteInput);
  expectError(
    tetrahedronVolume([0, 0, 0], [Number.NaN, 0, 0], [0, 1, 0], [0, 0, 1]),
    KERNEL_ERROR_CODES.nonFiniteInput,
  );
});
