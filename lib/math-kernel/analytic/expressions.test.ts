import assert from "node:assert/strict";
import { test } from "node:test";

import type { Quadratic2D } from "../conics/model";
import { CasSession } from "../cas/computeEngine.server";
import {
  analyticMathJsonOps,
  chordLengthSquaredExpression,
  dotProductExpression,
  lineConicCoefficientExpressions,
  reconstructEndpointSymmetricExpressions,
  triangleAreaExpression,
} from "./expressions";

const ellipse: Quadratic2D<number> = {
  x2: 3,
  xy: 0,
  y2: 4,
  x: 0,
  y: 0,
  constant: -12,
};

test("xFromY derives the frozen ellipse coefficients and Vieta expressions", () => {
  const setup = lineConicCoefficientExpressions(ellipse, {
    orientation: "xFromY",
    through: [1, 0],
    parameter: "m",
  });
  const cas = new CasSession();

  for (const [actual, expected] of [
    [setup.A, ["Add", ["Multiply", 3, ["Power", "m", 2]], 4]],
    [setup.B, ["Multiply", 6, "m"]],
    [setup.C, -9],
    [setup.discriminant, ["Multiply", 144, ["Add", ["Power", "m", 2], 1]]],
    [setup.firstSum, ["Divide", ["Negate", ["Multiply", 6, "m"]], ["Add", ["Multiply", 3, ["Power", "m", 2]], 4]]],
    [setup.firstProduct, ["Divide", -9, ["Add", ["Multiply", 3, ["Power", "m", 2]], 4]]],
  ] as const) {
    const comparison = cas.compareExactMathJson(actual, expected);
    assert.deepEqual(comparison, { ok: true, value: "equal" });
  }
});

test("yFromX swaps dependent and independent coordinates without relabelling inverse slope", () => {
  const setup = lineConicCoefficientExpressions(ellipse, {
    orientation: "yFromX",
    through: [0, 1],
    parameter: "m",
  });
  const cas = new CasSession();
  assert.deepEqual(cas.compareExactMathJson(setup.A, ["Add", ["Multiply", 4, ["Power", "m", 2]], 3]), { ok: true, value: "equal" });
  assert.deepEqual(cas.compareExactMathJson(setup.B, ["Multiply", 8, "m"]), { ok: true, value: "equal" });
  assert.deepEqual(cas.compareExactMathJson(setup.C, -8), { ok: true, value: "equal" });
});

test("both orientations derive the intercept from both coordinates of a nonzero anchor", () => {
  const cas = new CasSession();
  const xFromY = lineConicCoefficientExpressions(ellipse, {
    orientation: "xFromY",
    through: [2, 3],
    parameter: "m",
  });
  const yFromX = lineConicCoefficientExpressions(ellipse, {
    orientation: "yFromX",
    through: [2, 3],
    parameter: "m",
  });
  assert.deepEqual(
    cas.compareExactMathJson(xFromY.intercept, ["Subtract", 2, ["Multiply", 3, "m"]]),
    { ok: true, value: "equal" },
  );
  assert.deepEqual(
    cas.compareExactMathJson(yFromX.intercept, ["Subtract", 3, ["Multiply", 2, "m"]]),
    { ok: true, value: "equal" },
  );
});

test("the low-level exact builder fails closed instead of silently replacing an invalid parameter", () => {
  for (const parameter of [2, ["Add", "t", 1]] as const) {
    assert.throws(
      () => lineConicCoefficientExpressions(ellipse, {
        orientation: "xFromY",
        through: [1, 0],
        parameter,
      } as never),
      /fixed symbol "m"/,
    );
  }
});

test("exact builders reject decimal, unsafe, and non-finite number atoms before folding", () => {
  for (const x2 of [0.1, 1.5, Number.MAX_VALUE, Number.POSITIVE_INFINITY, Number.NaN]) {
    assert.throws(
      () => lineConicCoefficientExpressions(
        { ...ellipse, x2 },
        { orientation: "xFromY", through: [1, 0], parameter: "m" },
      ),
      /safe-integer|Invalid exact MathJSON/,
    );
  }
});

test("exact builders preserve large safe integer factors without overflow or JSON nulls", () => {
  const product = analyticMathJsonOps.mul(
    Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,
  );
  assert.deepEqual(product, [
    "Multiply",
    Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,
  ]);
  const serialized = JSON.stringify(product);
  assert.doesNotMatch(serialized, /null|Infinity|NaN/);
  assert.deepEqual(JSON.parse(serialized), product);
});

test("metric expressions share the Vieta setup instead of hard-coded formulas", () => {
  const setup = lineConicCoefficientExpressions(ellipse, {
    orientation: "xFromY",
    through: [1, 0],
    parameter: "m",
  });
  const symmetric = reconstructEndpointSymmetricExpressions(setup);
  const cas = new CasSession();

  const dot = dotProductExpression(setup, symmetric, [-1, 0]);
  const chordSquared = chordLengthSquaredExpression(setup);
  const area = triangleAreaExpression(setup, [0, 0]);

  assert.deepEqual(cas.compareExactMathJson(dot, ["Add", -3, ["Divide", 19, ["Add", ["Multiply", 3, ["Power", "m", 2]], 4]]]), { ok: true, value: "equal" });
  assert.deepEqual(cas.compareExactMathJson(chordSquared, ["Divide", ["Multiply", 144, ["Power", ["Add", ["Power", "m", 2], 1], 2]], ["Power", ["Add", ["Multiply", 3, ["Power", "m", 2]], 4], 2]]), { ok: true, value: "equal" });
  assert.deepEqual(cas.compareExactMathJson(area, ["Divide", ["Multiply", 6, ["Sqrt", ["Add", ["Power", "m", 2], 1]]], ["Add", ["Multiply", 3, ["Power", "m", 2]], 4]]), { ok: true, value: "equal" });
});
