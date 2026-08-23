import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import type { Quadratic2D } from "../conics/model";
import { CasSession } from "../cas/computeEngine.server";
import { KERNEL_ERROR_CODES } from "../shared/errors";
import type { MathJsonExpr } from "../shared/types";
import {
  centralConicSlopeProduct,
  eccentricityRangeFromFocalRatio,
  intersectLineConicExact,
  intervalToLatex,
  isConstantInParameter,
  rangeOverLineFamily,
  setupLineConicIntersection,
} from "./analyticKernel.server";
import { intersectLineConicNumeric } from "./numeric";

const ellipseFractional: Quadratic2D<MathJsonExpr> = {
  x2: ["Divide", 1, 4],
  xy: 0,
  y2: ["Divide", 1, 3],
  x: 0,
  y: 0,
  constant: -1,
};

const ellipseCleared: Quadratic2D<number> = {
  x2: 3,
  xy: 0,
  y2: 4,
  x: 0,
  y: 0,
  constant: -12,
};

function assertExact(actual: unknown, expected: unknown): void {
  const comparison = new CasSession().compareExactMathJson(actual, expected);
  assert.deepEqual(comparison, { ok: true, value: "equal" });
}

test("exact setup clears common rational denominators and is JSON-safe", () => {
  const result = setupLineConicIntersection({
    conic: ellipseFractional,
    line: { orientation: "xFromY", through: [1, 0] },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assertExact(result.value.A.mathJson, ["Add", ["Multiply", 3, ["Power", "m", 2]], 4]);
  assertExact(result.value.B.mathJson, ["Multiply", 6, "m"]);
  assertExact(result.value.C.mathJson, -9);
  assertExact(result.value.discriminant.mathJson, ["Multiply", 144, ["Add", ["Power", "m", 2], 1]]);
  assertExact(result.value.firstSum.mathJson, ["Divide", ["Negate", ["Multiply", 6, "m"]], ["Add", ["Multiply", 3, ["Power", "m", 2]], 4]]);
  assertExact(result.value.firstProduct.mathJson, ["Divide", -9, ["Add", ["Multiply", 3, ["Power", "m", 2]], 4]]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.value)), result.value);
  assert.equal(Object.isFrozen(result.value), true);
});

test("decimal exact inputs fail closed inside a bounded child process", { timeout: 7_000 }, () => {
  const moduleUrl = pathToFileURL(
    resolve(process.cwd(), "lib/math-kernel/analytic/analyticKernel.server.ts"),
  ).href;
  const casModuleUrl = pathToFileURL(
    resolve(process.cwd(), "lib/math-kernel/cas/computeEngine.server.ts"),
  ).href;
  const child = spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "--input-type=module",
      "--eval",
      `const { setupLineConicIntersection } = await import(${JSON.stringify(moduleUrl)});
       const { CasSession } = await import(${JSON.stringify(casModuleUrl)});
       const dangerous = new CasSession().toExactValueDto([
         "Divide",
         ["Multiply", -3, "m"],
         ["Add", ["Multiply", 1.5, ["Square", "m"]], 2]
       ]);
       if (dangerous.ok || dangerous.error.code !== "INVALID_INPUT") {
         throw new Error(JSON.stringify(dangerous));
       }
       const inputs = [
         { x2: 1.5, xy: 0, y2: 2, x: 0, y: 0, constant: -6 },
         { x2: ["Divide", 1.5, 1], xy: 0, y2: 2, x: 0, y: 0, constant: -6 },
         { x2: { num: "1.5" }, xy: 0, y2: 2, x: 0, y: 0, constant: -6 }
       ];
       for (const conic of inputs) {
         const result = setupLineConicIntersection({
           conic,
           line: { orientation: "xFromY", through: [1, 0] }
         });
         if (result.ok || result.error.code !== "INVALID_INPUT") {
           throw new Error(JSON.stringify(result));
         }
       }`,
    ],
    {
      encoding: "utf8",
      killSignal: "SIGKILL",
      maxBuffer: 1024 * 1024,
      timeout: 5_000,
    },
  );

  assert.notEqual(
    (child.error as NodeJS.ErrnoException | undefined)?.code,
    "ETIMEDOUT",
    "decimal exact setup must not hang",
  );
  assert.equal(child.signal, null);
  assert.equal(child.status, 0, child.stderr || child.stdout);
});

test("flagship exact ranges include endpoint topology, finite witnesses, and projective geometry", () => {
  const requests = [
    {
      metric: { kind: "dot-product" as const, vertex: [-1, 0] as const },
      lower: -3,
      upper: ["Divide", 7, 4],
      lowerClosed: true,
      upperClosed: true,
    },
    {
      metric: { kind: "chord-length" as const },
      lower: 3,
      upper: 4,
      lowerClosed: true,
      upperClosed: true,
    },
    {
      metric: { kind: "triangle-area" as const, vertex: [0, 0] as const, excludeDegenerate: true },
      lower: 0,
      upper: ["Divide", 3, 2],
      lowerClosed: false,
      upperClosed: true,
    },
  ];
  for (const expected of requests) {
    const result = rangeOverLineFamily({
      conic: ellipseCleared,
      line: { orientation: "xFromY", through: [1, 0] },
      metric: expected.metric,
    });
    assert.equal(result.ok, true);
    if (!result.ok) continue;
    assert.equal(result.value.interval.lower.kind, "finite");
    assert.equal(result.value.interval.upper.kind, "finite");
    if (result.value.interval.lower.kind !== "finite" || result.value.interval.upper.kind !== "finite") continue;
    assertExact(result.value.interval.lower.value.mathJson, expected.lower);
    assertExact(result.value.interval.upper.value.mathJson, expected.upper);
    assert.equal(result.value.interval.lower.closed, expected.lowerClosed);
    assert.equal(result.value.interval.upper.closed, expected.upperClosed);
    assert.equal(result.value.proof.checkedPositiveInfinity, true);
    assert.equal(result.value.proof.checkedNegativeInfinity, true);
    assert.equal(result.value.domain.discriminantConstraint.length > 0, true);
    assert.equal(result.value.domain.denominatorExclusions.length >= 0, true);
    assert.equal(result.value.domain.projectiveEndpoint.line, "horizontal");
    assert.equal(result.value.domain.projectiveEndpoint.hasRealGeometryWitness, true);
    assert.deepEqual(JSON.parse(JSON.stringify(result.value)), result.value);
  }
});

test("dot, chord squared, and area expressions match exact goldens", () => {
  for (const [kind, expected] of [
    ["dot-product", ["Add", -3, ["Divide", 19, ["Add", ["Multiply", 3, ["Power", "m", 2]], 4]]]],
    ["chord-length-squared", ["Divide", ["Multiply", 144, ["Power", ["Add", ["Power", "m", 2], 1], 2]], ["Power", ["Add", ["Multiply", 3, ["Power", "m", 2]], 4], 2]]],
    ["triangle-area", ["Divide", ["Multiply", 6, ["Sqrt", ["Add", ["Power", "m", 2], 1]]], ["Add", ["Multiply", 3, ["Power", "m", 2]], 4]]],
  ] as const) {
    const metric = kind === "dot-product"
      ? { kind, vertex: [-1, 0] as const }
      : kind === "triangle-area"
        ? { kind, vertex: [0, 0] as const, excludeDegenerate: true }
        : { kind };
    const result = rangeOverLineFamily({ conic: ellipseCleared, line: { orientation: "xFromY", through: [1, 0] }, metric });
    assert.equal(result.ok, true);
    if (result.ok) assertExact(result.value.expression.mathJson, expected);
  }
});

test("parabola focal-chord dot product is exactly constant -3", () => {
  const parabola: Quadratic2D<number> = { x2: 0, xy: 0, y2: 1, x: -4, y: 0, constant: 0 };
  const ranged = rangeOverLineFamily({
    conic: parabola,
    line: { orientation: "xFromY", through: [1, 0] },
    metric: { kind: "dot-product", vertex: [0, 0] },
  });
  assert.equal(ranged.ok, true);
  if (!ranged.ok) return;
  assertExact(ranged.value.expression.mathJson, -3);
  const constant = isConstantInParameter(ranged.value.expression.mathJson);
  assert.deepEqual(constant.ok && constant.value.constant, true);
  if (constant.ok) assertExact(constant.value.value.mathJson, -3);
});

test("hyperbola records real-domain exclusions and denominator poles deterministically", () => {
  const hyperbola: Quadratic2D<number> = { x2: 3, xy: 0, y2: -4, x: 0, y: 0, constant: -12 };
  const result = rangeOverLineFamily({
    conic: hyperbola,
    line: { orientation: "xFromY", through: [2, 0] },
    metric: { kind: "chord-length-squared" },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.domain.denominatorExclusions.length, 2);
  assert.equal(result.value.domain.discriminantConstraint.includes("> 0"), true);
  assert.equal(result.value.proof.checkedPoles, true);
});

test("unsupported nonsymmetric range profiles fail closed", () => {
  const result = rangeOverLineFamily({
    conic: { ...ellipseCleared, xy: 1 },
    line: { orientation: "xFromY", through: [1, 0] },
    metric: { kind: "chord-length" },
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, KERNEL_ERROR_CODES.unsupportedExpression);
});

test("central ellipse theorem validates the point and returns -b^2/a^2", () => {
  const result = centralConicSlopeProduct({ a: 2, b: ["Sqrt", 3], center: [0, 0], point: [2, 0] });
  assert.equal(result.ok, true);
  if (result.ok) assertExact(result.value.mathJson, ["Divide", -3, 4]);

  const offCurve = centralConicSlopeProduct({ a: 2, b: ["Sqrt", 3], center: [0, 0], point: [0, 0] });
  assert.equal(offCurve.ok, false);
  if (!offCurve.ok) assert.equal(offCurve.error.code, KERNEL_ERROR_CODES.invalidInput);
});

test("focal-ratio eccentricity returns (1,2] for k=3 and rejects k<=1", () => {
  const result = eccentricityRangeFromFocalRatio(3);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.interval.lower.kind, "finite");
  assert.equal(result.value.interval.upper.kind, "finite");
  if (result.value.interval.lower.kind === "finite" && result.value.interval.upper.kind === "finite") {
    assertExact(result.value.interval.lower.value.mathJson, 1);
    assert.equal(result.value.interval.lower.closed, false);
    assertExact(result.value.interval.upper.value.mathJson, 2);
    assert.equal(result.value.interval.upper.closed, true);
  }
  assert.deepEqual(intervalToLatex(result.value.interval), {
    ok: true,
    value: "(1,\\ 2]",
  });

  const invalid = eccentricityRangeFromFocalRatio(1);
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.error.code, KERNEL_ERROR_CODES.invalidInput);
});

test("exact intersections preserve all five states and expose endpoints only for secants", () => {
  const secant = intersectLineConicExact({
    conic: ellipseCleared,
    line: { orientation: "xFromY", through: [1, 0], parameter: 0 },
  });
  assert.equal(secant.ok && secant.value.kind, "secant");
  if (secant.ok && secant.value.kind === "secant") {
    assertExact(secant.value.chordLengthSquared.mathJson, 9);
    assertExact(secant.value.points[0][0].mathJson, 1);
    assertExact(secant.value.points[0][1].mathJson, ["Divide", -3, 2]);
    assertExact(secant.value.points[1][1].mathJson, ["Divide", 3, 2]);
    assert.equal(Object.isFrozen(secant.value), true);
    assert.deepEqual(JSON.parse(JSON.stringify(secant.value)), secant.value);
  }

  const tangent = intersectLineConicExact({
    conic: ellipseCleared,
    line: { orientation: "xFromY", through: [2, 0], parameter: 0 },
  });
  assert.equal(tangent.ok && tangent.value.kind, "tangent");

  const disjoint = intersectLineConicExact({
    conic: ellipseCleared,
    line: { orientation: "xFromY", through: [3, 0], parameter: 0 },
  });
  assert.equal(disjoint.ok && disjoint.value.kind, "disjoint");

  const linear = intersectLineConicExact({
    conic: { x2: 1, xy: 0, y2: -1, x: 0, y: 0, constant: -1 },
    line: { orientation: "xFromY", through: [1, 0], parameter: 1 },
  });
  assert.equal(linear.ok && linear.value.kind, "linear-degenerate");

  const invalid = intersectLineConicExact({
    conic: { x2: 1, xy: 0, y2: -1, x: 0, y: 0, constant: 0 },
    line: { orientation: "xFromY", through: [0, 0], parameter: 1 },
  });
  assert.equal(invalid.ok && invalid.value.kind, "invalid");
});

test("range proofs are invariant under conic scale and under the symmetric yFromX orientation", () => {
  const requests = [
    { conic: ellipseCleared, line: { orientation: "xFromY" as const, through: [1, 0] as const } },
    { conic: { x2: -6, xy: 0, y2: -8, x: 0, y: 0, constant: 24 }, line: { orientation: "xFromY" as const, through: [1, 0] as const } },
    { conic: { x2: 4, xy: 0, y2: 3, x: 0, y: 0, constant: -12 }, line: { orientation: "yFromX" as const, through: [0, 1] as const } },
  ];
  for (const request of requests) {
    const result = rangeOverLineFamily({
      ...request,
      metric: { kind: "chord-length" },
    });
    assert.equal(result.ok, true);
    if (!result.ok || result.value.interval.lower.kind !== "finite" || result.value.interval.upper.kind !== "finite") continue;
    assertExact(result.value.interval.lower.value.mathJson, 3);
    assertExact(result.value.interval.upper.value.mathJson, 4);
    assert.equal(result.value.domain.projectiveEndpoint.line, request.line.orientation === "xFromY" ? "horizontal" : "vertical");
  }
});

test("range proof records both exact hyperbola poles and an open projective area limit", () => {
  const hyperbola = rangeOverLineFamily({
    conic: { x2: 3, xy: 0, y2: -4, x: 0, y: 0, constant: -12 },
    line: { orientation: "xFromY", through: [2, 0] },
    metric: { kind: "chord-length-squared" },
  });
  assert.equal(hyperbola.ok, true);
  if (hyperbola.ok) {
    assert.equal(hyperbola.value.domain.denominatorExclusions.length, 2);
    assertExact(hyperbola.value.domain.denominatorExclusions[0].mathJson, ["Negate", ["Divide", 2, ["Sqrt", 3]]]);
    assertExact(hyperbola.value.domain.denominatorExclusions[1].mathJson, ["Divide", 2, ["Sqrt", 3]]);
  }

  const area = rangeOverLineFamily({
    conic: ellipseCleared,
    line: { orientation: "xFromY", through: [1, 0] },
    metric: { kind: "triangle-area", vertex: [0, 0], excludeDegenerate: true },
  });
  assert.equal(area.ok, true);
  if (area.ok && area.value.interval.lower.kind === "finite") {
    assert.equal(area.value.interval.lower.closed, false);
    assert.equal(area.value.interval.lower.witnesses.some((witness) => witness.kind === "limit"), true);
    assert.equal(area.value.domain.projectiveEndpoint.included, false);
  }
});

test("excludeDegenerate removes finite zero-area witnesses and rejects an all-degenerate family", () => {
  const finiteDegenerate = rangeOverLineFamily({
    conic: ellipseCleared,
    line: { orientation: "xFromY", through: [1, 0] },
    metric: {
      kind: "triangle-area",
      vertex: [1, 1],
      excludeDegenerate: true,
    },
  });
  assert.equal(finiteDegenerate.ok, true);
  if (
    finiteDegenerate.ok &&
    finiteDegenerate.value.interval.lower.kind === "finite"
  ) {
    assertExact(finiteDegenerate.value.interval.lower.value.mathJson, 0);
    assert.equal(finiteDegenerate.value.interval.lower.closed, false);
    assert.equal(
      finiteDegenerate.value.interval.lower.witnesses.some(
        (witness) => witness.kind === "excluded",
      ),
      true,
    );
  }

  const allDegenerate = rangeOverLineFamily({
    conic: ellipseCleared,
    line: { orientation: "xFromY", through: [1, 0] },
    metric: {
      kind: "triangle-area",
      vertex: [1, 0],
      excludeDegenerate: true,
    },
  });
  assert.equal(allDegenerate.ok, false);
  if (!allDegenerate.ok) {
    assert.equal(allDegenerate.error.code, KERNEL_ERROR_CODES.emptyRealDomain);
  }

  const allDegenerateHyperbola = rangeOverLineFamily({
    conic: { x2: 3, xy: 0, y2: -4, x: 0, y: 0, constant: -12 },
    line: { orientation: "xFromY", through: [2, 0] },
    metric: {
      kind: "triangle-area",
      vertex: [2, 0],
      excludeDegenerate: true,
    },
  });
  assert.equal(allDegenerateHyperbola.ok, false);
  if (!allDegenerateHyperbola.ok) {
    assert.equal(
      allDegenerateHyperbola.error.code,
      KERNEL_ERROR_CODES.emptyRealDomain,
    );
  }
});

test("range metrics reject unknown fields and non-boolean exclusion flags", () => {
  const base = {
    conic: ellipseCleared,
    line: { orientation: "xFromY" as const, through: [1, 0] as const },
  };
  for (const metric of [
    { kind: "chord-length", unexpected: "accepted" },
    { kind: "triangle-area", vertex: [0, 0], excludeDegenerate: "true" },
    { kind: "triangle-area", vertex: [0, 0], excludeDegenerate: 1 },
    { kind: "triangle-area", vertex: [0, 0], excludeDegenerate: null },
  ]) {
    const result = rangeOverLineFamily({ ...base, metric } as never);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, KERNEL_ERROR_CODES.invalidInput);
    }
  }
});

test("intervalToLatex ignores forged display strings and serializes authoritative MathJSON", () => {
  const forged = intervalToLatex({
    lower: {
      kind: "finite",
      value: {
        schemaVersion: 1,
        mathJson: 1,
        latex: "FORGED",
        decimal: "999",
        approx: 999,
      },
      closed: true,
      witnesses: [],
    },
    upper: {
      kind: "finite",
      value: {
        schemaVersion: 1,
        mathJson: 2,
        latex: "ALSO FORGED",
        decimal: "-999",
        approx: -999,
      },
      closed: false,
      witnesses: [],
    },
  });
  assert.deepEqual(forged, { ok: true, value: "[1,\\ 2)" });
});

test("intervalToLatex rejects reversed, non-finite, and impossible endpoint topology", () => {
  const exact = (mathJson: MathJsonExpr) => ({
    schemaVersion: 1 as const,
    mathJson,
    latex: "forged",
    decimal: null,
    approx: null,
  });
  const finite = (mathJson: MathJsonExpr, closed = true) => ({
    kind: "finite" as const,
    value: exact(mathJson),
    closed,
    witnesses: [],
  });
  const invalidIntervals = [
    { lower: finite(2), upper: finite(1) },
    { lower: finite(1, false), upper: finite(1) },
    {
      lower: { kind: "infinity" as const, sign: 1 as const, closed: false as const },
      upper: { kind: "infinity" as const, sign: -1 as const, closed: false as const },
    },
    { lower: finite("Infinity"), upper: finite(1) },
  ];
  for (const interval of invalidIntervals) {
    const result = intervalToLatex(interval);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, KERNEL_ERROR_CODES.invalidInput);
    }
  }
});

test("public exact boundaries reject arbitrary parameters and report undefined slopes", () => {
  const arbitraryParameter = setupLineConicIntersection({
    conic: ellipseCleared,
    line: { orientation: "xFromY", through: [1, 0], parameter: "q" },
  } as never);
  assert.equal(arbitraryParameter.ok, false);
  if (!arbitraryParameter.ok) assert.equal(arbitraryParameter.error.code, KERNEL_ERROR_CODES.invalidInput);

  const undefinedSlope = centralConicSlopeProduct({
    a: 2,
    b: ["Sqrt", 3],
    center: [0, 0],
    point: [2, 0],
    movingPoint: [2, 0],
  });
  assert.equal(undefinedSlope.ok, false);
  if (!undefinedSlope.ok) assert.equal(undefinedSlope.error.code, KERNEL_ERROR_CODES.undefinedSlope);
});

test("browser numeric intersections agree with exact DTO approximations", () => {
  for (const [parameter, exactParameter] of [
    [-2, -2],
    [-0.5, ["Rational", -1, 2]],
    [0, 0],
    [0.75, ["Rational", 3, 4]],
    [2, 2],
  ] as const) {
    const numeric = intersectLineConicNumeric(ellipseCleared, {
      orientation: "xFromY",
      through: [1, 0],
      parameter,
    });
    const exact = intersectLineConicExact({
      conic: ellipseCleared,
      line: {
        orientation: "xFromY",
        through: [1, 0],
        parameter: exactParameter,
      },
    });
    assert.equal(numeric.ok, true);
    assert.equal(exact.ok, true);
    if (
      !numeric.ok ||
      !exact.ok ||
      numeric.value.kind !== "secant" ||
      exact.value.kind !== "secant"
    ) continue;
    for (let pointIndex = 0; pointIndex < 2; pointIndex += 1) {
      for (let coordinateIndex = 0; coordinateIndex < 2; coordinateIndex += 1) {
        const approximation = exact.value.points[pointIndex][coordinateIndex].approx;
        assert.notEqual(approximation, null);
        if (approximation !== null) {
          const tolerance = Math.max(
            1e-12,
            1e-10 * Math.max(
              Math.abs(approximation),
              Math.abs(numeric.value.points[pointIndex][coordinateIndex]),
            ),
          );
          assert.ok(
            Math.abs(
              approximation - numeric.value.points[pointIndex][coordinateIndex],
            ) <= tolerance,
          );
        }
      }
    }
    assert.notEqual(exact.value.chordLengthSquared.approx, null);
    if (exact.value.chordLengthSquared.approx !== null) {
      const tolerance = Math.max(
        1e-12,
        1e-10 * Math.max(
          exact.value.chordLengthSquared.approx,
          numeric.value.chordLengthSquared,
        ),
      );
      assert.ok(
        Math.abs(
          exact.value.chordLengthSquared.approx -
            numeric.value.chordLengthSquared
        ) <= tolerance,
      );
    }
  }
});

test("exact secant endpoints keep ascending independent-coordinate order under irrational negative scale", () => {
  const exact = intersectLineConicExact({
    conic: {
      x2: ["Multiply", -3, ["Sqrt", 2]],
      xy: 0,
      y2: ["Multiply", -4, ["Sqrt", 2]],
      x: 0,
      y: 0,
      constant: ["Multiply", 12, ["Sqrt", 2]],
    },
    line: { orientation: "xFromY", through: [1, 0], parameter: 0 },
  });
  assert.equal(exact.ok, true);
  if (!exact.ok || exact.value.kind !== "secant") return;
  assertExact(exact.value.points[0][1].mathJson, ["Divide", -3, 2]);
  assertExact(exact.value.points[1][1].mathJson, ["Divide", 3, 2]);
});
