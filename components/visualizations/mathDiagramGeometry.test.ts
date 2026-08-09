import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildEulerCenterLayout,
  canUseTriangle,
  initialEulerTriangle
} from "./eulerLineGeometry";
import {
  buildMathAngleContract,
  clampPointToDiagramBounds,
  diagramOverflowIndicator,
  groupCoincidentDiagramPoints,
  isCircleInsideDiagramBounds,
  isPointInsideDiagramBounds,
  serializeMathAngleContract,
  svgAngleArcPath,
  svgPointOnRay,
  trianglePixelArea,
  verifyMathAngleContract,
  verifySampledSvgAngleArc
} from "../../lib/mathDiagramGeometry";

const bounds = { left: 10, right: 90, top: 20, bottom: 80 };

test("SVG ray points preserve the declared radius and positive ray direction", () => {
  const vertex = { x: 30, y: 150 };
  const radius = 24;
  for (let degrees = 0; degrees <= 180; degrees += 0.5) {
    const radians = degrees * Math.PI / 180;
    const point = svgPointOnRay(vertex, radius, radians);
    const vector = { x: point.x - vertex.x, y: vertex.y - point.y };
    assert.ok(Math.abs(Math.hypot(vector.x, vector.y) - radius) <= 0.01);
    assert.ok(Math.abs(vector.x * Math.sin(radians) - vector.y * Math.cos(radians)) <= 0.01);
    assert.ok(vector.x * Math.cos(radians) + vector.y * Math.sin(radians) >= 0);
  }
  assert.throws(() => svgPointOnRay(vertex, -1, 0), RangeError);
});

test("angle contracts keep both arc endpoints on their positive defining rays", () => {
  const contract = buildMathAngleContract({
    id: "worked-example-angle",
    origin: { x: 620, y: 405 },
    radius: 75,
    startRay: { x: 1, y: 0 },
    endRay: { x: 190, y: -255 },
    sweepRadians: Math.atan2(255, 190)
  });
  assert.deepEqual(verifyMathAngleContract(contract), []);
  assert.deepEqual(JSON.parse(serializeMathAngleContract(contract)), contract);
  assert.match(svgAngleArcPath(contract), /^M 695 405 A 75 75 0 0 0 /u);

  const invalid = { ...contract, end: { x: 748, y: 306 } };
  assert.ok(verifyMathAngleContract(invalid).some((issue) => issue.includes("end radius error")));
});

test("a full-turn SVG angle uses two arcs instead of collapsing equal endpoints", () => {
  const fullTurn = buildMathAngleContract({
    id: "full-turn",
    origin: { x: 160, y: 160 },
    radius: 26,
    startRay: { x: 1, y: 0 },
    endRay: { x: 1, y: 0 },
    sweepRadians: Math.PI * 2
  });
  assert.deepEqual(verifyMathAngleContract(fullTurn), []);
  assert.equal((svgAngleArcPath(fullTurn).match(/ A /gu) ?? []).length, 2);
});

test("sampled SVG arc validation rejects continuation past a defining ray", () => {
  const contract = buildMathAngleContract({
    id: "strict-painted-angle",
    origin: { x: 20, y: 20 },
    radius: 10,
    startRay: { x: 1, y: 0 },
    endRay: { x: 0, y: -1 },
    sweepRadians: Math.PI / 2
  });
  const samples = Array.from({ length: 65 }, (_, index) => {
    const angle = Math.PI * index / 2 / 64;
    return { x: 20 + 10 * Math.cos(angle), y: 20 - 10 * Math.sin(angle) };
  });
  assert.deepEqual(verifySampledSvgAngleArc(contract, {
    start: samples[0],
    end: samples.at(-1)!,
    pathLength: 10 * Math.PI / 2,
    samples
  }), []);

  const continuedSweep = Math.PI / 2 + 0.3;
  const continuedSamples = Array.from({ length: 65 }, (_, index) => {
    const angle = continuedSweep * index / 64;
    return { x: 20 + 10 * Math.cos(angle), y: 20 - 10 * Math.sin(angle) };
  });
  const continuedIssues = verifySampledSvgAngleArc(contract, {
    start: continuedSamples[0],
    end: continuedSamples.at(-1)!,
    pathLength: 10 * continuedSweep,
    samples: continuedSamples
  });
  assert.ok(continuedIssues.some((issue) => issue.includes("painted path ends")));
  assert.ok(continuedIssues.some((issue) => issue.includes("path length")));
  assert.ok(continuedIssues.some((issue) => issue.includes("signed sweep")));
});

test("angle contract validation reports degenerate rays without throwing", () => {
  const contract = buildMathAngleContract({
    id: "degenerate-input-regression",
    origin: { x: 0, y: 0 },
    radius: 12,
    startRay: { x: 1, y: 0 },
    endRay: { x: 0, y: -1 },
    sweepRadians: Math.PI / 2
  });
  const invalidContract = {
    ...contract,
    startRay: { x: 0, y: 0 },
    endRay: { x: Number.NaN, y: 0 }
  };
  assert.doesNotThrow(() => verifyMathAngleContract(invalidContract));
  assert.ok(verifyMathAngleContract(invalidContract).some((issue) => issue.includes("start ray is degenerate")));
  assert.ok(verifyMathAngleContract(invalidContract).some((issue) => issue.includes("end ray is degenerate")));
});

test("triangle area detects collinear geometry even when all sides are long", () => {
  assert.equal(trianglePixelArea({ x: 0, y: 0 }, { x: 150, y: 0 }, { x: 300, y: 0 }), 0);
  assert.equal(trianglePixelArea({ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 0, y: 6 }), 24);
});

test("diagram points clamp to an inset frame without changing their mathematical source coordinates", () => {
  const source = { x: 130, y: -20 };
  const result = clampPointToDiagramBounds(source, bounds, 5);
  assert.deepEqual(result, { clipped: true, point: { x: 85, y: 25 } });
  assert.deepEqual(source, { x: 130, y: -20 });
  assert.equal(isPointInsideDiagramBounds(result.point, bounds, 5), true);
});

test("edge indicators derive all four directions from the raw-to-bounded overflow vector", () => {
  assert.deepEqual(diagramOverflowIndicator({ x: 50, y: -20 }, { x: 50, y: 25 }), { direction: "up", symbol: "↑" });
  assert.deepEqual(diagramOverflowIndicator({ x: 50, y: 110 }, { x: 50, y: 75 }), { direction: "down", symbol: "↓" });
  assert.deepEqual(diagramOverflowIndicator({ x: -20, y: 50 }, { x: 15, y: 50 }), { direction: "left", symbol: "←" });
  assert.deepEqual(diagramOverflowIndicator({ x: 120, y: 50 }, { x: 85, y: 50 }), { direction: "right", symbol: "→" });
  assert.deepEqual(diagramOverflowIndicator({ x: 120, y: -40 }, { x: 85, y: 25 }), { direction: "up", symbol: "↑" });
  assert.equal(diagramOverflowIndicator({ x: 50, y: 50 }, { x: 50, y: 50 }), null);
});

test("circle containment includes the complete radius and requested plot inset", () => {
  const plotBounds = { left: 30, right: 630, top: 30, bottom: 430 };

  assert.equal(isCircleInsideDiagramBounds({ x: 330, y: 230 }, 150, plotBounds, 14), true);
  assert.equal(isCircleInsideDiagramBounds({ x: 74.8235294118, y: 116 }, 55.5017378699, plotBounds, 14), false);
  assert.equal(isCircleInsideDiagramBounds({ x: 330, y: 230 }, -1, plotBounds, 14), false);
});

test("Euler triangle gate accepts its initial state and rejects triangles whose circles cross the plot inset", () => {
  assert.equal(canUseTriangle(initialEulerTriangle), true);
  assert.equal(canUseTriangle({
    A: { x: 62, y: 62 },
    B: { x: 62, y: 170 },
    C: { x: 130, y: 110 }
  }), false);
});

test("Euler vertex C can follow the focused drag path without crossing the circle boundary gate", () => {
  const target = { x: 480, y: 150 };
  const steps = Array.from({ length: 12 }, (_, index) => {
    const progress = (index + 1) / 12;
    return {
      x: initialEulerTriangle.C.x + (target.x - initialEulerTriangle.C.x) * progress,
      y: initialEulerTriangle.C.y + (target.y - initialEulerTriangle.C.y) * progress
    };
  });

  assert.equal(steps.every((C) => canUseTriangle({ ...initialEulerTriangle, C })), true);
});

test("Euler center layout preserves four exact dots while only the text labels merge", () => {
  const centers = {
    O: { x: 40, y: 40 },
    G: { x: 40.2, y: 39.9 },
    H: { x: 70, y: 70 },
    N: { x: 40.1, y: 40.1 }
  };
  const layout = buildEulerCenterLayout(centers);

  assert.deepEqual(layout.points.map(({ key, point }) => ({ key, point })), [
    { key: "O", point: centers.O },
    { key: "G", point: centers.G },
    { key: "H", point: centers.H },
    { key: "N", point: centers.N }
  ]);
  assert.deepEqual(layout.labels.map((label) => label.keys), ["O,G,N", "H"]);

  const markup = layout.points
    .map((mark) => `data-viz-name="${mark.vizName}" data-viz-center-key="${mark.key}"`)
    .concat(layout.labels.map((label) => `data-viz-name="${label.vizName}" data-viz-center-keys="${label.keys}"`))
    .join(" ");
  assert.equal((markup.match(/data-viz-name="Euler center point"/g) ?? []).length, 4);
  for (const key of ["O", "G", "H", "N"]) {
    assert.match(markup, new RegExp(`data-viz-center-key="${key}"`));
  }
  assert.match(markup, /data-viz-name="Euler center label"/);

  const componentSource = fs.readFileSync("components/visualizations/StembenchEulerLineDemo.tsx", "utf8");
  assert.match(componentSource, /centerLayout\.points\.map[\s\S]*?data-viz-name=\{mark\.vizName\}[\s\S]*?data-viz-center-key=\{mark\.key\}/);
  assert.match(componentSource, /centerLayout\.labels\.map[\s\S]*?data-viz-name=\{mark\.vizName\}[\s\S]*?data-viz-center-keys=\{mark\.keys\}/);
});

test("coincident construction centers collapse into one semantic label group", () => {
  const grouped = groupCoincidentDiagramPoints([
    { key: "O", point: { x: 40, y: 40 } },
    { key: "G", point: { x: 40.2, y: 39.9 } },
    { key: "H", point: { x: 70, y: 70 } }
  ], 1);

  assert.deepEqual(grouped.map((group) => group.map((item) => item.key)), [["O", "G"], ["H"]]);
});
