import assert from "node:assert/strict";
import test from "node:test";
import {
  SIGNED_REAL_NUMBER_LINE_GEOMETRY_CONTRACT,
  SignedRealNumberLineGeometryError,
  buildSignedRealNumberLineGeometry,
} from "./SignedRealNumberLineGeometry";
import {
  buildSignedRealNumberLineModel,
  type ExactRationalInput,
  type SignedRealNumberLineModel,
} from "./SignedRealNumberLineModel";

function rational(numerator: number, denominator = 1): ExactRationalInput {
  return { kind: "rational", numerator, denominator };
}

function locateRational(
  numerator: number,
  denominator = 1,
  precision = 4,
): SignedRealNumberLineModel {
  return buildSignedRealNumberLineModel({
    labId: "bnu-junior-s1-upper-rational-numbers",
    mode: "locate",
    precision,
    value: rational(numerator, denominator),
  });
}

function locateRadical(
  radicand: number,
  sign: -1 | 1 = 1,
  precision = 4,
): SignedRealNumberLineModel {
  return buildSignedRealNumberLineModel({
    labId: "bnu-junior-s2-upper-real-numbers",
    mode: "locate",
    precision,
    value: { kind: "radical", index: 2, radicand, sign },
  });
}

function assertDeepFrozen(value: unknown, path = "root"): void {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true, `${path} is mutable`);
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertDeepFrozen(child, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assertDeepFrozen(child, `${path}.${key}`);
  }
}

function assertJsonSafe(value: unknown, path = "root"): void {
  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true, `${path} is not finite`);
    assert.equal(Object.is(value, -0), false, `${path} contains -0`);
    return;
  }
  assert.notEqual(typeof value, "bigint", `${path} contains BigInt`);
  assert.notEqual(typeof value, "undefined", `${path} contains undefined`);
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertJsonSafe(child, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      assertJsonSafe(child, `${path}.${key}`);
    }
  }
}

function assertGeometryError(
  callback: () => unknown,
  code: SignedRealNumberLineGeometryError["code"],
) {
  assert.throws(
    callback,
    (error: unknown) =>
      error instanceof SignedRealNumberLineGeometryError && error.code === code,
  );
}

test("G03 geometry contract serializes deterministic axis and SVG bounds", () => {
  assert.deepEqual(SIGNED_REAL_NUMBER_LINE_GEOMETRY_CONTRACT, {
    family: "signed-real-number-line",
    groupId: "G03",
    version: "signed-real-number-line-geometry-v1",
    defaultSvgXMin: 70,
    defaultSvgXMax: 890,
  });
  const geometry = buildSignedRealNumberLineGeometry({
    points: [{ semanticId: "half", model: locateRational(1, 2) }],
  });
  assert.equal(geometry.axisMin, -2);
  assert.equal(geometry.axisMax, 2);
  assert.equal(geometry.svgXMin, 70);
  assert.equal(geometry.svgXMax, 890);
  assert.equal(geometry.pixelsPerUnit, 205);
  assert.equal(geometry.points.length, 1);
  assert.equal(geometry.coverage.candidateCount, 1);
  assert.equal(geometry.coverage.markerOwnerCount, 1);
  assert.match(geometry.stateKey, /^signed-real-number-line-geometry-v1\|/u);
  assertDeepFrozen(geometry);
  assertJsonSafe(geometry);
});

test("rational points use exact identical certified and pixel bounds", () => {
  const geometry = buildSignedRealNumberLineGeometry({
    points: [{ semanticId: "negative-third", model: locateRational(-1, 3, 3) }],
  });
  const point = geometry.points[0];
  assert.deepEqual(point.exactValue, { numerator: -1, denominator: 3 });
  assert.deepEqual(point.certifiedLower, point.exactValue);
  assert.deepEqual(point.certifiedUpper, point.exactValue);
  assert.equal(point.pixelLower, point.pixelUpper);
  assert.equal(point.renderedX, point.pixelLower);
  assert.equal(point.pixelErrorBound, 0);
  assert.equal(point.coLocation.reason, "unique-exact-value");
  assert.equal(point.coLocation.renderMarker, true);
});

test("irrational radicals bind certified lower/upper values to pixel intervals and error bounds", () => {
  const model = locateRadical(2, 1, 4);
  const geometry = buildSignedRealNumberLineGeometry({
    points: [{ semanticId: "sqrt-two", model }],
    svgXMin: 100,
    svgXMax: 900,
  });
  const point = geometry.points[0];
  assert.equal(point.exactValue, null);
  assert.deepEqual(point.certifiedLower, model.approximation.interval.lower);
  assert.deepEqual(point.certifiedUpper, model.approximation.interval.upper);
  assert.ok(point.pixelLower <= point.renderedX);
  assert.ok(point.renderedX <= point.pixelUpper);
  assert.equal(
    point.pixelErrorBound,
    geometry.pixelsPerUnit / 10_000,
  );
  assert.ok(point.pixelUpper - point.pixelLower <= point.pixelErrorBound);
  assert.equal(point.coLocation.reason, "unique-exact-value");
});

test("sqrt four and rational two share one exact co-location owner and one rendered marker", () => {
  const squareRootFour = buildSignedRealNumberLineModel({
    labId: "hjb-junior-s2-upper-real-numbers",
    mode: "square-root",
    precision: 3,
    radicand: 4,
  });
  const rationalTwo = locateRational(2, 1, 3);
  const geometry = buildSignedRealNumberLineGeometry({
    points: [
      { semanticId: "sqrt-four", model: squareRootFour },
      { semanticId: "rational-two", model: rationalTwo },
    ],
  });
  const sqrtPoint = geometry.points.find(
    ({ semanticId }) => semanticId === "sqrt-four",
  );
  const rationalPoint = geometry.points.find(
    ({ semanticId }) => semanticId === "rational-two",
  );
  assert.ok(sqrtPoint);
  assert.ok(rationalPoint);
  assert.equal(sqrtPoint.renderedX, rationalPoint.renderedX);
  assert.equal(sqrtPoint.coLocation.ownerId, "rational-two");
  assert.equal(rationalPoint.coLocation.ownerId, "rational-two");
  assert.equal(sqrtPoint.coLocation.reason, "exact-equality");
  assert.equal(rationalPoint.coLocation.reason, "exact-equality");
  assert.deepEqual(sqrtPoint.coLocation.memberIds, [
    "rational-two",
    "sqrt-four",
  ]);
  assert.equal(
    geometry.points.filter(({ coLocation }) => coLocation.renderMarker).length,
    1,
  );
  assert.equal(geometry.coverage.candidateCount, 2);
  assert.equal(geometry.coverage.markerOwnerCount, 1);
  assert.equal(geometry.coverage.coLocatedGroupCount, 1);
  assert.deepEqual(geometry.coLocationGroups, [
    {
      exactKey: "r:2/1",
      ownerId: "rational-two",
      memberIds: ["rational-two", "sqrt-four"],
      reason: "exact-equality",
    },
  ]);
});

test("overlapping decimal estimates never merge distinct exact values", () => {
  const geometry = buildSignedRealNumberLineGeometry({
    points: [
      { semanticId: "sqrt-two", model: locateRadical(2, 1, 3) },
      { semanticId: "decimal-1414", model: locateRational(1414, 1000, 3) },
    ],
  });
  assert.equal(geometry.coverage.markerOwnerCount, 2);
  assert.equal(geometry.coverage.coLocatedGroupCount, 0);
  assert.ok(geometry.points.every(({ coLocation }) => coLocation.renderMarker));
  assert.ok(
    geometry.points.every(
      ({ coLocation }) => coLocation.reason === "unique-exact-value",
    ),
  );
});

test("bounded exhaustive rational and radical geometry is deterministic and certified", () => {
  let observed = 0;
  for (let numerator = -20; numerator <= 20; numerator += 1) {
    for (let denominator = 1; denominator <= 8; denominator += 1) {
      const model = locateRational(numerator, denominator, 4);
      const first = buildSignedRealNumberLineGeometry({
        points: [{ semanticId: `r-${numerator}-${denominator}`, model }],
      });
      const second = buildSignedRealNumberLineGeometry({
        points: [{ semanticId: `r-${numerator}-${denominator}`, model }],
      });
      assert.deepEqual(first, second);
      const point = first.points[0];
      assert.equal(point.pixelLower, point.renderedX);
      assert.equal(point.pixelUpper, point.renderedX);
      assert.equal(point.pixelErrorBound, 0);
      assertDeepFrozen(first);
      assertJsonSafe(first);
      observed += 1;
    }
  }
  for (const sign of [-1, 1] as const) {
    for (let radicand = 2; radicand <= 200; radicand += 1) {
      const root = Math.round(Math.sqrt(radicand));
      if (root * root === radicand) continue;
      const model = locateRadical(radicand, sign, 5);
      const geometry = buildSignedRealNumberLineGeometry({
        points: [{ semanticId: `d-${sign}-${radicand}`, model }],
      });
      const point = geometry.points[0];
      assert.ok(point.pixelLower <= point.renderedX, geometry.stateKey);
      assert.ok(point.renderedX <= point.pixelUpper, geometry.stateKey);
      assert.ok(
        point.pixelUpper - point.pixelLower <=
          point.pixelErrorBound + Number.EPSILON,
        geometry.stateKey,
      );
      assertDeepFrozen(geometry);
      assertJsonSafe(geometry);
      observed += 1;
    }
  }
  assert.equal(observed, 700);
});

test("invalid geometry bounds, empty candidates, duplicate IDs, and corrupted observations fail closed", () => {
  const point = { semanticId: "one", model: locateRational(1) };
  assertGeometryError(
    () => buildSignedRealNumberLineGeometry({ points: [] }),
    "EMPTY_POINT_SET",
  );
  assertGeometryError(
    () =>
      buildSignedRealNumberLineGeometry({
        points: [point],
        svgXMin: 100,
        svgXMax: 100,
      }),
    "INVALID_SVG_BOUNDS",
  );
  assertGeometryError(
    () =>
      buildSignedRealNumberLineGeometry({
        points: [point, point],
      }),
    "DUPLICATE_SEMANTIC_ID",
  );
  assertGeometryError(
    () =>
      buildSignedRealNumberLineGeometry({
        points: [{ semanticId: "", model: locateRational(1) }],
      }),
    "INVALID_SEMANTIC_ID",
  );
});
