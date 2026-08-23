import assert from "node:assert/strict";
import { test } from "node:test";

import { KERNEL_ERROR_CODES } from "../shared/errors";
import { toQuadratic2D, type ConicModel, type Point2D } from "./model";
import {
  circleNumeric,
  ellipseNumeric,
  hyperbolaNumeric,
  parabolaNumeric,
  toConicRenderSpec,
} from "./numeric";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected a successful kernel result.");
  return result.value;
}

function expectError(
  result: { ok: true } | { ok: false; error: { code: string } },
  code: string,
): void {
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, code);
}

function near(actual: number, expected: number): void {
  const tolerance = Math.max(1e-12, 1e-10 * Math.abs(expected));
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} is not within ${tolerance} of ${expected}`,
  );
}

function evaluateQuadratic(
  model: ConicModel<number>,
  [x, y]: Point2D<number>,
): number {
  const q = toQuadratic2D(model);
  return (
    q.x2 * x * x +
    q.xy * x * y +
    q.y2 * y * y +
    q.x * x +
    q.y * y +
    q.constant
  );
}

test("ellipse derives foci, vertices, eccentricity, and expanded coefficients", () => {
  const ellipse = unwrap(
    ellipseNumeric({ a: 2, b: Math.sqrt(3), center: [-1, 2] }),
  );

  assert.equal(ellipse.kind, "ellipse");
  assert.equal(ellipse.majorAxis, "x");
  near(ellipse.c, 1);
  near(ellipse.eccentricity, 0.5);
  near(ellipse.foci[0][0], -2);
  near(ellipse.foci[1][0], 0);
  assert.deepEqual(ellipse.foci.map((point) => point[1]), [2, 2]);
  assert.deepEqual(ellipse.directrices.map((line) => line.axis), ["x", "x"]);
  near(ellipse.directrices[0].value, -5);
  near(ellipse.directrices[1].value, 3);
  assert.equal(ellipse.quadratic.xy, 0);
  near(evaluateQuadratic(ellipse, [1, 2]), 0);
});

test("ellipse can derive a y major axis or require an explicit valid override", () => {
  const vertical = unwrap(ellipseNumeric({ a: 2, b: 3 }));
  assert.equal(vertical.majorAxis, "y");
  near(vertical.c * vertical.c, vertical.b * vertical.b - vertical.a * vertical.a);

  expectError(
    ellipseNumeric({ a: 2, b: 3, majorAxis: "x" }),
    KERNEL_ERROR_CODES.invalidMajorAxis,
  );
});

test("translated hyperbolas derive complete geometry for both orientations", () => {
  const horizontal = unwrap(
    hyperbolaNumeric({ a: 2, b: 3, center: [-1, 2], orientation: "x" }),
  );
  near(horizontal.c * horizontal.c, 13);
  near(horizontal.eccentricity, Math.sqrt(13) / 2);
  near(horizontal.directrices[0].value, -1 - 4 / Math.sqrt(13));
  near(horizontal.directrices[1].value, -1 + 4 / Math.sqrt(13));
  near(evaluateQuadratic(horizontal, [1, 2]), 0);

  const vertical = unwrap(
    hyperbolaNumeric({ a: 2, b: 3, center: [4, -2], orientation: "y" }),
  );
  assert.deepEqual(vertical.vertices, [
    [4, -4],
    [4, 0],
  ]);
  near(evaluateQuadratic(vertical, [4, 0]), 0);
});

test("parabola keeps Edulab's 2p convention and unified vertex semantics", () => {
  const horizontal = unwrap(parabolaNumeric({ p: 2 }));
  assert.deepEqual(horizontal.vertex, [0, 0]);
  assert.deepEqual(horizontal.focus, [1, 0]);
  assert.deepEqual(horizontal.directrix, { axis: "x", value: -1 });
  near(evaluateQuadratic(horizontal, [1, 2]), 0);

  const vertical = unwrap(
    parabolaNumeric({ p: -4, vertex: [-2, 3], orientation: "y" }),
  );
  assert.deepEqual(vertical.focus, [-2, 1]);
  assert.deepEqual(vertical.directrix, { axis: "y", value: 5 });
  near(evaluateQuadratic(vertical, [2, 1]), 0);
});

test("parabola samples are equidistant from focus and directrix", () => {
  const parabola = unwrap(
    parabolaNumeric({ p: 3, vertex: [-2, 1], orientation: "x" }),
  );
  const render = unwrap(
    toConicRenderSpec(parabola, { sampleCount: 17, parameterRange: [-4, 4] }),
  );

  assert.equal(render.branches.length, 1);
  for (const [x, y] of render.branches[0].points) {
    near(Math.hypot(x - parabola.focus[0], y - parabola.focus[1]), Math.abs(x - parabola.directrix.value));
  }
});

test("circle samples stay one radius from their translated center", () => {
  const circle = unwrap(circleNumeric({ center: [-3, 4], r: 2 }));
  const render = unwrap(toConicRenderSpec(circle, { sampleCount: 65 }));

  assert.equal(render.branches.length, 1);
  assert.equal(render.branches[0].closed, true);
  for (const [x, y] of render.branches[0].points) {
    near(Math.hypot(x + 3, y - 4), 2);
    near(evaluateQuadratic(circle, [x, y]), 0);
  }
});

test("all render samples are finite and satisfy their implicit quadratic", () => {
  const models = [
    unwrap(ellipseNumeric({ a: 3, b: 2, center: [-1, -2] })),
    unwrap(hyperbolaNumeric({ a: 2, b: 1, center: [3, -4] })),
    unwrap(parabolaNumeric({ p: -2, vertex: [1, -3] })),
    unwrap(circleNumeric({ r: 4, center: [-2, -5] })),
  ];

  for (const model of models) {
    const render = unwrap(
      toConicRenderSpec(model, { sampleCount: 41, parameterRange: [-2, 2] }),
    );
    for (const branch of render.branches) {
      for (const point of branch.points) {
        assert.equal(point.every(Number.isFinite), true);
        near(evaluateQuadratic(model, point), 0);
      }
    }
  }
});

test("hyperbola rendering emits two deterministic branches", () => {
  const hyperbola = unwrap(hyperbolaNumeric({ a: 2, b: 1 }));
  const render = unwrap(
    toConicRenderSpec(hyperbola, { sampleCount: 9, parameterRange: [-1, 1] }),
  );
  assert.deepEqual(render.branches.map((branch) => branch.id), ["negative", "positive"]);
  assert.deepEqual(render.branches.map((branch) => branch.points.length), [9, 9]);
  assert.deepEqual(render.branches.map((branch) => branch.closed), [false, false]);
});

test("numeric constructors reject non-finite, non-positive, degenerate, and invalid inputs", () => {
  expectError(
    ellipseNumeric({ a: Number.NaN, b: 2 }),
    KERNEL_ERROR_CODES.nonFiniteInput,
  );
  expectError(
    ellipseNumeric({ a: 0, b: 2 }),
    KERNEL_ERROR_CODES.nonPositiveDimension,
  );
  expectError(
    ellipseNumeric({ a: 2, b: 2 }),
    KERNEL_ERROR_CODES.degenerateConic,
  );
  expectError(
    hyperbolaNumeric({ a: 2, b: -1 }),
    KERNEL_ERROR_CODES.nonPositiveDimension,
  );
  expectError(
    circleNumeric({ r: 0 }),
    KERNEL_ERROR_CODES.nonPositiveDimension,
  );
  expectError(
    parabolaNumeric({ p: 0 }),
    KERNEL_ERROR_CODES.zeroParabolaParameter,
  );
  expectError(
    hyperbolaNumeric({ a: 1, b: 2, orientation: "z" as "x" }),
    KERNEL_ERROR_CODES.invalidOrientation,
  );
  expectError(
    parabolaNumeric({ p: 2, orientation: "z" as "x" }),
    KERNEL_ERROR_CODES.invalidOrientation,
  );
});

test("numeric constructors reject finite inputs whose derived values overflow", () => {
  const cases = [
    circleNumeric({ r: 1e308 }),
    circleNumeric({ r: 1, center: [1e308, 1e308] }),
    ellipseNumeric({ a: 1e308, b: 1e307 }),
    hyperbolaNumeric({ a: 1e308, b: 1e307 }),
    parabolaNumeric({ p: 1e308 }),
  ];

  for (const result of cases) {
    expectError(result, KERNEL_ERROR_CODES.nonFiniteInput);
  }
});

test("numeric constructors reject non-zero defining quantities that underflow to zero", () => {
  const tiny = Number.MIN_VALUE;
  const cases = [
    circleNumeric({ r: tiny }),
    ellipseNumeric({ a: tiny * 2, b: tiny }),
    hyperbolaNumeric({ a: tiny, b: tiny }),
    parabolaNumeric({ p: tiny }),
    parabolaNumeric({ p: -tiny }),
  ];

  for (const result of cases) {
    expectError(result, KERNEL_ERROR_CODES.nonFiniteInput);
  }
});

test("every successful numeric model contains only finite JSON numbers", () => {
  const models = [
    unwrap(circleNumeric({ r: 3, center: [-2, 5] })),
    unwrap(ellipseNumeric({ a: 4, b: 2, center: [1, -3] })),
    unwrap(hyperbolaNumeric({ a: 2, b: 3, center: [-4, 1] })),
    unwrap(parabolaNumeric({ p: -2, vertex: [3, -1] })),
  ];

  for (const model of models) {
    const serialized = JSON.stringify(model);
    assert.doesNotMatch(serialized, /null/);
    const visit = (value: unknown): void => {
      if (typeof value === "number") assert.equal(Number.isFinite(value), true);
      else if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") Object.values(value).forEach(visit);
    };
    visit(model);
  }
});

test("rendering validates sample counts and finite ascending parameter ranges", () => {
  const ellipse = unwrap(ellipseNumeric({ a: 3, b: 2 }));
  expectError(
    toConicRenderSpec(ellipse, { sampleCount: 2 }),
    KERNEL_ERROR_CODES.invalidInput,
  );
  expectError(
    toConicRenderSpec(ellipse, { parameterRange: [1, 1] }),
    KERNEL_ERROR_CODES.invalidInput,
  );
  expectError(
    toConicRenderSpec(ellipse, { parameterRange: [0, Number.POSITIVE_INFINITY] }),
    KERNEL_ERROR_CODES.nonFiniteInput,
  );
});
