import assert from "node:assert/strict";
import test from "node:test";
import {
  affineScreenPoint,
  strokedPolygonPaintBounds
} from "./svgPolygonPaintGeometry";

test("miter-aware roof bounds include the apex join beyond the naive half-stroke radius", () => {
  const roof = [
    { x: 55, y: 60 },
    { x: 145, y: 60 },
    { x: 100, y: 20 }
  ];
  const bounds = strokedPolygonPaintBounds({
    matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: -18 },
    points: roof,
    strokeLinejoin: "miter",
    strokeMiterLimit: 4,
    strokeWidth: 2
  });

  const apex = roof[2];
  const left = roof[0];
  const right = roof[1];
  const leftVector = { x: left.x - apex.x, y: left.y - apex.y };
  const rightVector = { x: right.x - apex.x, y: right.y - apex.y };
  const cosine = (
    leftVector.x * rightVector.x + leftVector.y * rightVector.y
  ) / (
    Math.hypot(leftVector.x, leftVector.y) * Math.hypot(rightVector.x, rightVector.y)
  );
  const interiorAngle = Math.acos(cosine);
  const expectedTop = apex.y - 18 - (1 / Math.sin(interiorAngle / 2));

  assert.ok(Math.abs(bounds.top - expectedTop) < 1e-9);
  assert.ok(bounds.top > 0.65 && bounds.top < 0.67);
  assert.notEqual(bounds.top, 1, "A half-stroke expansion misses the default miter apex.");

  const bevelFallback = strokedPolygonPaintBounds({
    matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: -18 },
    points: roof,
    strokeLinejoin: "miter",
    strokeMiterLimit: 1,
    strokeWidth: 2
  });
  assert.ok(
    bevelFallback.top > 1.24 && bevelFallback.top < 1.26,
    "A miter beyond the configured limit must fall back to its bevel endpoints."
  );
});

test("affine screen projection keeps matrix axes in DOMMatrix order under rotation and shear", () => {
  const projected = affineScreenPoint(
    { x: 17, y: 19 },
    { a: 2, b: 3, c: 5, d: 7, e: 11, f: 13 }
  );

  assert.deepEqual(projected, {
    x: 2 * 17 + 5 * 19 + 11,
    y: 3 * 17 + 7 * 19 + 13
  });
});
