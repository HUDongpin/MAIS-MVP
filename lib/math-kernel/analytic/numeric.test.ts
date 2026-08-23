import assert from "node:assert/strict";
import { test } from "node:test";

import type { Quadratic2D } from "../conics/model";
import { KERNEL_ERROR_CODES } from "../shared/errors";
import {
  intersectLineConicNumeric,
  numericDotProductForSecant,
  numericTriangleAreaForSecant,
} from "./numeric";

const ellipse: Quadratic2D<number> = {
  x2: 3,
  xy: 0,
  y2: 4,
  x: 0,
  y: 0,
  constant: -12,
};

function close(actual: number, expected: number): void {
  const tolerance = Math.max(1e-12, 1e-10 * Math.max(Math.abs(actual), Math.abs(expected)));
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

test("numeric intersection exposes two endpoints and metrics only for a secant", () => {
  const result = intersectLineConicNumeric(ellipse, {
    orientation: "xFromY",
    through: [1, 0],
    parameter: 0,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.kind, "secant");
  if (result.value.kind !== "secant") return;
  assert.deepEqual(result.value.points, [[1, -1.5], [1, 1.5]]);
  close(result.value.chordLengthSquared, 9);
  const dot = numericDotProductForSecant(result.value, [-1, 0]);
  assert.equal(dot.ok, true);
  if (dot.ok) close(dot.value, 1.75);
  const area = numericTriangleAreaForSecant(result.value, [0, 0]);
  assert.equal(area.ok, true);
  if (area.ok) close(area.value, 1.5);
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.points), true);
});

test("numeric state machine distinguishes tangent, linear, disjoint, and invalid", () => {
  const tangent = intersectLineConicNumeric(ellipse, {
    orientation: "xFromY",
    through: [2, 0],
    parameter: 0,
  });
  assert.equal(tangent.ok && tangent.value.kind, "tangent");

  const linear = intersectLineConicNumeric(
    { x2: 1, xy: 0, y2: -1, x: 0, y: 0, constant: -1 },
    { orientation: "xFromY", through: [1, 0], parameter: 1 },
  );
  assert.equal(linear.ok && linear.value.kind, "linear-degenerate");

  const disjoint = intersectLineConicNumeric(ellipse, {
    orientation: "xFromY",
    through: [3, 0],
    parameter: 0,
  });
  assert.equal(disjoint.ok && disjoint.value.kind, "disjoint");

  const invalid = intersectLineConicNumeric(
    { x2: 0, xy: 0, y2: 0, x: 0, y: 0, constant: 0 },
    { orientation: "xFromY", through: [0, 0], parameter: 0 },
  );
  assert.equal(invalid.ok && invalid.value.kind, "invalid");
});

test("numeric kernel rejects nonfinite and unrepresentable arithmetic rather than leaking NaN", () => {
  const nonFinite = intersectLineConicNumeric(ellipse, {
    orientation: "xFromY",
    through: [0, 0],
    parameter: Number.POSITIVE_INFINITY,
  });
  assert.equal(nonFinite.ok, false);
  if (!nonFinite.ok) assert.equal(nonFinite.error.code, KERNEL_ERROR_CODES.nonFiniteInput);

  const overflow = intersectLineConicNumeric(
    { x2: Number.MAX_VALUE, xy: Number.MAX_VALUE, y2: Number.MAX_VALUE, x: Number.MAX_VALUE, y: Number.MAX_VALUE, constant: Number.MAX_VALUE },
    { orientation: "xFromY", through: [Number.MAX_VALUE, 0], parameter: Number.MAX_VALUE },
  );
  assert.equal(overflow.ok, false);
  if (!overflow.ok) assert.equal(overflow.error.code, KERNEL_ERROR_CODES.nonFiniteInput);
  assert.equal(JSON.stringify(overflow).includes("null"), false);
});

test("numeric nonzero anchors preserve the chosen point for both line orientations", () => {
  for (const line of [
    { orientation: "xFromY" as const, through: [1, 0.5] as const, parameter: 0.25 },
    { orientation: "yFromX" as const, through: [0.5, 1] as const, parameter: 0.25 },
  ]) {
    const result = intersectLineConicNumeric(ellipse, line);
    assert.equal(result.ok, true);
    if (!result.ok || result.value.kind !== "secant") continue;
    const intercept = line.orientation === "xFromY"
      ? line.through[0] - line.parameter * line.through[1]
      : line.through[1] - line.parameter * line.through[0];
    for (const [x, y] of result.value.points) {
      close(
        line.orientation === "xFromY" ? x : y,
        line.parameter * (line.orientation === "xFromY" ? y : x) + intercept,
      );
    }
  }
});

test("numeric coefficients publish the true unscaled discriminant", () => {
  const result = intersectLineConicNumeric(ellipse, {
    orientation: "xFromY",
    through: [1, 0],
    parameter: 0,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value.coefficients, {
    A: 4,
    B: 0,
    C: -9,
    discriminant: 144,
  });

  const scaled = intersectLineConicNumeric(
    { x2: -6, xy: 0, y2: -8, x: 0, y: 0, constant: 24 },
    { orientation: "xFromY", through: [1, 0], parameter: 0 },
  );
  assert.equal(scaled.ok, true);
  if (!scaled.ok) return;
  assert.equal(scaled.value.kind, result.value.kind);
  assert.deepEqual(scaled.value.coefficients, {
    A: -8,
    B: 0,
    C: 18,
    discriminant: 576,
  });
});

test("safe-integer arithmetic certifies a discriminant hidden by cancellation", () => {
  const coefficient = 100_000_001;
  const constant = 2_500_000_050_000_000;
  const result = intersectLineConicNumeric(
    { x2: 0, xy: 0, y2: 1, x: 0, y: coefficient, constant },
    { orientation: "xFromY", through: [0, 0], parameter: 0 },
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.kind, "secant");
  assert.equal(result.value.coefficients.discriminant, 1);
});

test("binary64 dyadic arithmetic certifies a non-integer discriminant cancellation", () => {
  const result = intersectLineConicNumeric(
    {
      x2: 0,
      xy: 0,
      y2: 1,
      x: 0,
      y: 100_000_001,
      constant: 2_500_000_050_000_000.5,
    },
    { orientation: "xFromY", through: [0, 0], parameter: 0 },
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.kind, "disjoint");
    assert.equal(result.value.coefficients.discriminant, -1);
  }
});

test("numeric secant metrics use exact safe-integer cancellation when available", () => {
  const n = 100_000_001;
  const synthetic = {
    schemaVersion: 1 as const,
    kind: "secant" as const,
    points: [[n, n - 1], [n + 1, n]] as const,
    chordLengthSquared: 2,
    coefficients: { A: 1, B: 0, C: -1, discriminant: 4 },
  };
  const area = numericTriangleAreaForSecant(synthetic, [0, 0]);
  assert.equal(area.ok, true);
  if (area.ok) assert.equal(area.value, 0.5);

  const dot = numericDotProductForSecant(
    { ...synthetic, points: [[n, n], [n, -n]] },
    [0, 0],
  );
  assert.equal(dot.ok, true);
  if (dot.ok) assert.equal(dot.value, 0);
});

test("numeric secant metrics exactly certify binary64 non-integer cancellation", () => {
  const n = 100_000_001;
  const synthetic = {
    schemaVersion: 1 as const,
    kind: "secant" as const,
    points: [[n + 0.5, n], [n, n - 0.5]] as const,
    chordLengthSquared: 2,
    coefficients: { A: 1, B: 0, C: -1, discriminant: 4 },
  };
  const area = numericTriangleAreaForSecant(synthetic, [0, 0]);
  assert.equal(area.ok, true);
  if (area.ok) assert.equal(area.value, 0.125);
});

function scaledConic(
  source: Quadratic2D<number>,
  factor: number,
): Quadratic2D<number> {
  return {
    x2: source.x2 * factor,
    xy: source.xy * factor,
    y2: source.y2 * factor,
    x: source.x * factor,
    y: source.y * factor,
    constant: source.constant * factor,
  };
}

test("all five numeric states are invariant under representable nonzero binary scaling", () => {
  const cases = [
    [ellipse, { orientation: "xFromY" as const, through: [1, 0] as const, parameter: 0 }, "secant"],
    [ellipse, { orientation: "xFromY" as const, through: [2, 0] as const, parameter: 0 }, "tangent"],
    [
      { x2: 1, xy: 0, y2: -1, x: 0, y: 0, constant: -1 },
      { orientation: "xFromY" as const, through: [1, 0] as const, parameter: 1 },
      "linear-degenerate",
    ],
    [ellipse, { orientation: "xFromY" as const, through: [3, 0] as const, parameter: 0 }, "disjoint"],
    [
      { x2: 0, xy: 0, y2: 0, x: 0, y: 0, constant: 0 },
      { orientation: "xFromY" as const, through: [0, 0] as const, parameter: 0 },
      "invalid",
    ],
  ] as const;
  for (const factor of [0.5, -0.5, 2 ** -500, 2 ** 500]) {
    for (const [conic, line, kind] of cases) {
      const result = intersectLineConicNumeric(scaledConic(conic, factor), line);
      assert.equal(result.ok, true, `factor=${factor}, expected=${kind}`);
      if (result.ok) assert.equal(result.value.kind, kind);
    }
  }
});

test("unscaled public discriminant fails when its true value cannot fit in number", () => {
  for (const factor of [1e-200, 1e200, -1e200]) {
    const result = intersectLineConicNumeric(scaledConic(ellipse, factor), {
      orientation: "xFromY",
      through: [1, 0],
      parameter: 0,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, KERNEL_ERROR_CODES.nonFiniteInput);
  }
});

test("dyadic discriminant proof preserves the three critical states", () => {
  for (const [constant, kind] of [
    [1 - Number.EPSILON, "secant"],
    [1, "tangent"],
    [1 + Number.EPSILON, "disjoint"],
  ] as const) {
    const result = intersectLineConicNumeric(
      { x2: 0, xy: 0, y2: 1, x: 0, y: 2, constant },
      { orientation: "xFromY", through: [0, 0], parameter: 0 },
    );
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.kind, kind);
  }

  const delta = 2 ** -51;
  const hidden = intersectLineConicNumeric(
    { x2: 0, xy: 0, y2: 1, x: 0, y: 2 + delta, constant: 1 + delta },
    { orientation: "xFromY", through: [0, 0], parameter: 0 },
  );
  assert.equal(hidden.ok, true);
  if (hidden.ok) {
    assert.equal(hidden.value.kind, "secant");
    assert.equal(hidden.value.coefficients.discriminant, 2 ** -102);
  }
});

test("stable q-formula retains large, small, and exact zero roots", () => {
  const dynamic = intersectLineConicNumeric(
    { x2: 0, xy: 0, y2: 1, x: 0, y: 1e16, constant: 1 },
    { orientation: "xFromY", through: [0, 0], parameter: 0 },
  );
  assert.equal(dynamic.ok, true);
  if (dynamic.ok && dynamic.value.kind === "secant") {
    const roots = dynamic.value.points.map((point) => point[1]);
    close(roots[0], -1e16);
    close(roots[1], -1e-16);
    assert.notEqual(roots[1], 0);
  }

  const zeroRoot = intersectLineConicNumeric(
    { x2: 0, xy: 0, y2: 1, x: 0, y: 3, constant: 0 },
    { orientation: "xFromY", through: [0, 0], parameter: 0 },
  );
  assert.equal(zeroRoot.ok, true);
  if (zeroRoot.ok && zeroRoot.value.kind === "secant") {
    assert.equal(zeroRoot.value.points.some((point) => point[1] === 0), true);
  }
});

test("dyadic secant metrics handle huge cancellation, mixed scales, overflow, and underflow", () => {
  const dto = (points: readonly [readonly [number, number], readonly [number, number]]) => ({
    schemaVersion: 1 as const,
    kind: "secant" as const,
    points,
    chordLengthSquared: 1,
    coefficients: { A: 1, B: 0, C: -1, discriminant: 4 },
  });
  const hugeDot = numericDotProductForSecant(
    dto([[1e200, 1e200], [1e200, -1e200]]),
    [0, 0],
  );
  assert.deepEqual(hugeDot, { ok: true, value: 0 });

  const hugeCollinearArea = numericTriangleAreaForSecant(
    dto([[1e200, 1e200], [5e199, 5e199]]),
    [0, 0],
  );
  assert.deepEqual(hugeCollinearArea, { ok: true, value: 0 });

  const mixedArea = numericTriangleAreaForSecant(
    dto([[1e200, 0], [0, 1e-200]]),
    [0, 0],
  );
  assert.equal(mixedArea.ok, true);
  if (mixedArea.ok) close(mixedArea.value, 0.5);

  const overflow = numericDotProductForSecant(
    dto([[1e200, 1e200], [1e200, 1e200]]),
    [0, 0],
  );
  assert.equal(overflow.ok, false);
  const underflow = numericDotProductForSecant(
    dto([[1e-200, 0], [1e-200, 0]]),
    [0, 0],
  );
  assert.equal(underflow.ok, false);
});

test("numeric metric boundaries reject malformed secant DTOs without throwing", () => {
  for (const malformed of [
    null,
    {},
    { schemaVersion: 1, kind: "secant" },
    { schemaVersion: 2, kind: "secant", points: [] },
    {
      schemaVersion: 1,
      kind: "secant",
      points: [[0, 0], [Number.NaN, 1]],
      chordLengthSquared: 1,
      coefficients: { A: 1, B: 0, C: -1, discriminant: 4 },
    },
  ]) {
    const dot = numericDotProductForSecant(
      malformed as unknown as Parameters<typeof numericDotProductForSecant>[0],
      [0, 0],
    );
    const area = numericTriangleAreaForSecant(
      malformed as unknown as Parameters<typeof numericTriangleAreaForSecant>[0],
      [0, 0],
    );
    assert.equal(dot.ok, false);
    assert.equal(area.ok, false);
    if (!dot.ok) assert.equal(dot.error.code, KERNEL_ERROR_CODES.invalidInput);
    if (!area.ok) assert.equal(area.error.code, KERNEL_ERROR_CODES.invalidInput);
  }
});
