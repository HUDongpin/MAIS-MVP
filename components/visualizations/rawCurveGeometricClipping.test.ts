import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildCalculusTangentCurvePath,
  buildFunctionModelPath,
  buildQuadraticCurvePath
} from "./rawCurveGeometry";

type PathPoint = { x: number; y: number };

function parsePolylinePath(path: string): PathPoint[] {
  const tokens = path.trim().split(/\s+/);
  assert.equal(tokens.length % 3, 0, "each sampled point must contain a command, x, and y");

  return Array.from({ length: tokens.length / 3 }, (_, index) => {
    const command = tokens[index * 3];
    const x = Number(tokens[index * 3 + 1]);
    const y = Number(tokens[index * 3 + 2]);
    assert.equal(command, index === 0 ? "M" : "L");
    assert.ok(Number.isFinite(x));
    assert.ok(Number.isFinite(y));
    return { x, y };
  });
}

test("quadratic curve preserves raw off-plot geometry for the SVG clip path", () => {
  const points = parsePolylinePath(buildQuadraticCurvePath(3, 0, 8));
  const source = fs.readFileSync("components/visualizations/FunctionGraphExplorer.tsx", "utf8");

  assert.equal(points.length, 180);
  assert.equal(points[0].y, -3270, "y=3(-8)^2+8=200 must map to its raw SVG coordinate");
  assert.ok(points[0].y < 36 && points[1].y < 36, "the first two y coordinates should remain above the plot");
  assert.notEqual(points[0].y, points[1].y, "off-plot samples must not collapse into a false horizontal plateau");
  assert.match(source, /<clipPath id="quadraticPlotClip">[\s\S]*?<rect x=\{padding\} y=\{padding\} width=\{width - padding \* 2\} height=\{height - padding \* 2\} \/>[\s\S]*?<\/clipPath>/);
  assert.match(source, /data-viz-name="quadratic curve"[\s\S]*?clipPath="url\(#quadraticPlotClip\)"/);
});

test("exponential model preserves raw off-plot geometry for the existing SVG clip path", () => {
  const points = parsePolylinePath(buildFunctionModelPath("exponential", 2, 5));
  const source = fs.readFileSync("components/visualizations/FunctionModelComparer.tsx", "utf8");
  const finalPoint = points.at(-1);
  const previousPoint = points.at(-2);

  assert.equal(points.length, 180);
  assert.ok(finalPoint && previousPoint);
  assert.equal(finalPoint.y, -1309.63, "e^(0.44*10)-1+5 must map to its raw SVG coordinate");
  assert.ok(finalPoint.y < 40 && previousPoint.y < 40, "the final two y coordinates should remain above the plot");
  assert.notEqual(finalPoint.y, previousPoint.y, "off-plot samples must not collapse into a false horizontal plateau");
  assert.match(source, /<clipPath id="functionModelPlotClip">[\s\S]*?<rect x=\{padding\} y=\{padding\} width=\{width - padding \* 2\} height=\{height - padding \* 2\} \/>[\s\S]*?<\/clipPath>/);
  assert.match(source, /data-viz-name="model curve"[\s\S]*?clipPath="url\(#functionModelPlotClip\)"/);
});

test("calculus cubic preserves both raw tails for an SVG plot clip", () => {
  const points = parsePolylinePath(buildCalculusTangentCurvePath());
  const source = fs.readFileSync("components/visualizations/CalculusStatsLab.tsx", "utf8");
  const finalPoint = points.at(-1);
  const previousPoint = points.at(-2);

  assert.equal(points.length, 180);
  assert.ok(finalPoint && previousPoint);
  assert.equal(points[0].y, 588.56, "f(-4)=-20.28 must map to its raw SVG coordinate");
  assert.equal(finalPoint.y, -1.31, "f(6)=11.32 must map to its raw SVG coordinate");
  assert.ok(points[0].y > 378 && points[1].y > 378, "the first two y coordinates should remain below the plot");
  assert.notEqual(points[0].y, points[1].y, "the lower off-plot samples must not collapse into a false horizontal plateau");
  assert.ok(finalPoint.y < 42 && previousPoint.y < 42, "the final two y coordinates should remain above the plot");
  assert.notEqual(finalPoint.y, previousPoint.y, "the upper off-plot samples must not collapse into a false horizontal plateau");
  assert.match(source, /<clipPath id="calculusTangentPlotClip">[\s\S]*?<rect x=\{padding\} y=\{padding\} width=\{width - padding \* 2\} height=\{height - padding \* 2\} \/>[\s\S]*?<\/clipPath>/);
  assert.match(source, /data-viz-name="cubic function"[\s\S]*?clipPath="url\(#calculusTangentPlotClip\)"/);
});
