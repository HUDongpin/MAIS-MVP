import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  strokedPolygonPaintBounds,
  type SvgPaintBounds,
  type SvgPoint
} from "../../../../tests/e2e/svgPolygonPaintGeometry";

const source = readFileSync("components/lesson/ccss/lessons/compose-2d.tsx", "utf8");

function sourceNumber(pattern: RegExp, label: string) {
  const value = source.match(pattern)?.[1];
  assert.ok(value, `${label} must remain explicit in compose-2d.tsx.`);
  return Number(value);
}

function sourcePoints(pattern: RegExp, label: string): SvgPoint[] {
  const value = source.match(pattern)?.[1];
  assert.ok(value, `${label} points must remain explicit in compose-2d.tsx.`);
  return value.trim().split(/\s+/u).map((pair) => {
    const [x, y] = pair.split(",").map(Number);
    assert.ok(Number.isFinite(x) && Number.isFinite(y), `${label} contains an invalid point: ${pair}`);
    return { x, y };
  });
}

function paintedBounds(points: SvgPoint[], translateY: number, strokeWidth: number) {
  return strokedPolygonPaintBounds({
    matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: translateY },
    points,
    strokeLinejoin: "miter",
    strokeMiterLimit: 4,
    strokeWidth
  });
}

function expectInsideViewBox(bounds: SvgPaintBounds, width: number, height: number) {
  assert.ok(bounds.left >= 0, `paint extends ${-bounds.left}px past the left edge`);
  assert.ok(bounds.top >= 0, `paint extends ${-bounds.top}px past the top edge`);
  assert.ok(bounds.right <= width, `paint extends ${bounds.right - width}px past the right edge`);
  assert.ok(bounds.bottom <= height, `paint extends ${bounds.bottom - height}px past the bottom edge`);
}

test("Compose Shapes keeps every separated and joined painted polygon inside its SVG viewBox", () => {
  const [, viewBoxWidth, viewBoxHeight] = source.match(/viewBox="0 0 (\d+) (\d+)"/u)?.map(Number) ?? [];
  assert.ok(Number.isFinite(viewBoxWidth) && Number.isFinite(viewBoxHeight));
  const gap = sourceNumber(/const gap = joined \? 0 : (\d+);/u, "separation gap");
  const strokeWidth = sourceNumber(/strokeWidth="(\d+)"/u, "polygon stroke width");
  const roof = sourcePoints(/roof \(moves down[\s\S]+?<polygon points="([^"]+)"/u, "house roof");
  const topTrapezoid = sourcePoints(/top trapezoid[\s\S]+?<polygon points="([^"]+)"/u, "top trapezoid");
  const bottomTrapezoid = sourcePoints(/bottom trapezoid[\s\S]+?<polygon points="([^"]+)"/u, "bottom trapezoid");

  assert.equal(roof.length, 3, "The separated roof must visibly remain a triangle.");
  assert.match(source, /transform: `translateY\(\$\{-gap\}px\)`/u);
  const separatedRoof = paintedBounds(roof, -gap, strokeWidth);
  const joinedRoof = paintedBounds(roof, 0, strokeWidth);
  expectInsideViewBox(separatedRoof, viewBoxWidth, viewBoxHeight);
  expectInsideViewBox(joinedRoof, viewBoxWidth, viewBoxHeight);
  expectInsideViewBox(paintedBounds(topTrapezoid, 0, strokeWidth), viewBoxWidth, viewBoxHeight);
  expectInsideViewBox(paintedBounds(bottomTrapezoid, gap, strokeWidth), viewBoxWidth, viewBoxHeight);
  expectInsideViewBox(paintedBounds(bottomTrapezoid, 0, strokeWidth), viewBoxWidth, viewBoxHeight);

  assert.ok(
    separatedRoof.top > 0.65 && separatedRoof.top < 0.67,
    "The unjoined roof needs a positive, miter-aware painted clearance above its apex."
  );
  assert.ok(
    Math.abs(joinedRoof.top - separatedRoof.top - gap) < 1e-9,
    "Joining must move the complete painted roof down by the full separation gap."
  );
  const squareTop = sourceNumber(/<rect x="55" y="(\d+)" width="90"/u, "square top");
  assert.equal(Math.max(...roof.map((point) => point.y)), squareTop, "The joined roof must meet the square exactly.");
});
