import assert from "node:assert/strict";
import { test } from "node:test";

import {
  vecCross,
  vecDot,
  vecMidpoint,
  type ScalarOps,
  type Vec3,
} from "./core";

const numberOps: ScalarOps<number> = {
  zero: 0,
  fromInteger: (value) => value,
  add: (left, right) => left + right,
  sub: (left, right) => left - right,
  mul: (left, right) => left * right,
  div: (left, right) => left / right,
  abs: Math.abs,
  sqrt: Math.sqrt,
};

test("generic midpoint and dot formulas are symmetric", () => {
  const cases: readonly (readonly [Vec3<number>, Vec3<number>])[] = [
    [[1, 2, 3], [4, -5, 6]],
    [[-2.5, 0, 8], [7, 3.25, -1]],
    [[0, 0, 0], [1e-6, -2e-6, 3e-6]],
  ];

  for (const [left, right] of cases) {
    assert.deepEqual(vecMidpoint(numberOps, left, right), vecMidpoint(numberOps, right, left));
    assert.equal(vecDot(numberOps, left, right), vecDot(numberOps, right, left));
  }
});

test("generic cross product is orthogonal to both input vectors", () => {
  const left: Vec3<number> = [2, -1, 3];
  const right: Vec3<number> = [4, 5, -2];
  const cross = vecCross(numberOps, left, right);

  assert.equal(vecDot(numberOps, cross, left), 0);
  assert.equal(vecDot(numberOps, cross, right), 0);
});
