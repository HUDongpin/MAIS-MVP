import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildAnimatedStreamLineFramePlan,
  buildAnimatedStreamLineFrame,
  buildStreamLines,
  sampleStreamLineSeeds2D,
  summarizeStreamLines
} from "./mathStreamLines";
import type { Vec3 } from "./mathSceneTypes";

function roundedPoints(points: Vec3[]) {
  return points.map((point) => point.map((value) => Number(value.toFixed(3))) as Vec3);
}

test("samples deterministic 2D seed grids for Manim-style StreamLines", () => {
  const seeds = sampleStreamLineSeeds2D({
    id: "rotation-seed",
    xRange: [-1, 1],
    xSteps: 3,
    yRange: [0, 1],
    ySteps: 2,
    z: 0.5
  });

  assert.equal(seeds.length, 6);
  assert.deepEqual(seeds[0], { id: "rotation-seed:seed-0", point: [-1, 0, 0.5] });
  assert.deepEqual(seeds.at(-1), { id: "rotation-seed:seed-5", point: [1, 1, 0.5] });
});

test("builds deterministic flow lines from seed points and vector-field traces", () => {
  const streamLines = buildStreamLines({
    bounds: { x: [-1, 2], y: [-1, 2], z: [-1, 1] },
    conceptId: "constant-flow",
    dt: 0.5,
    field: () => [1, 0, 0],
    id: "flow",
    phaseOffsetStep: 0.25,
    seeds: [
      { id: "seed-a", point: [0, 0, 0] },
      { id: "seed-b", point: [0, 1, 0] }
    ],
    steps: 3
  });
  const summary = summarizeStreamLines(streamLines);

  assert.equal(streamLines.lines.length, 2);
  assert.deepEqual(streamLines.lines[0].points, [
    [0, 0, 0],
    [0.5, 0, 0],
    [1, 0, 0],
    [1.5, 0, 0]
  ]);
  assert.equal(streamLines.lines[0].phaseOffset, 0);
  assert.equal(streamLines.lines[1].phaseOffset, 0.25);
  assert.equal(summary.lineCount, 2);
  assert.equal(summary.totalPointCount, 8);
  assert.equal(summary.completedLineCount, 2);
  assert.equal(summary.stoppedLineCount, 0);
});

test("wraps stream-line phase offsets instead of clamping later lines to one phase", () => {
  const streamLines = buildStreamLines({
    conceptId: "constant-flow",
    dt: 0.5,
    field: () => [1, 0, 0],
    id: "flow",
    phaseOffsetStep: 0.6,
    seeds: [
      { id: "seed-a", point: [0, 0, 0] },
      { id: "seed-b", point: [0, 1, 0] },
      { id: "seed-c", point: [0, 2, 0] }
    ],
    steps: 1
  });

  assert.deepEqual(streamLines.lines.map((line) => line.phaseOffset), [0, 0.6, 0.2]);
});

test("builds a deterministic animated StreamLines frame plan with phase ordering evidence", () => {
  const streamLines = buildStreamLines({
    conceptId: "constant-flow",
    dt: 1,
    field: () => [1, 0, 0],
    id: "flow",
    phaseOffsetStep: 0.6,
    seeds: [
      { id: "seed-a", point: [0, 0, 0] },
      { id: "seed-b", point: [0, 1, 0] },
      { id: "seed-c", point: [0, 2, 0] }
    ],
    steps: 4
  });
  const plan = buildAnimatedStreamLineFramePlan(streamLines, {
    cycleSeconds: 10,
    timeSeconds: 1,
    visibleProgress: 0.25,
    wrap: true
  });

  assert.equal(plan.frameCount, 3);
  assert.equal(plan.visibleLineCount, 3);
  assert.equal(plan.totalSegmentCount, 4);
  assert.equal(plan.finiteVisibleLengthCount, 3);
  assert.equal(plan.visibleLengthRange, "1.000..1.000");
  assert.equal(plan.visibleLengthSummary, "flow:line-0=1.000;flow:line-1=1.000;flow:line-2=1.000");
  assert.deepEqual(plan.frames.map((frame) => frame.lineId), [
    "flow:line-0",
    "flow:line-1",
    "flow:line-2"
  ]);
  assert.deepEqual(plan.phaseOrderLineIds, [
    "flow:line-0",
    "flow:line-2",
    "flow:line-1"
  ]);
  assert.equal(plan.phaseSummary, "flow:line-0=0.100;flow:line-1=0.700;flow:line-2=0.300");
  assert.equal(
    plan.windowRangeSummary,
    "flow:line-0=0.850..1.000+0.000..0.100;flow:line-1=0.450..0.700;flow:line-2=0.050..0.300"
  );
  assert.equal(plan.sourceContract, "StreamLines.framePlan|phase-ordered animated partial path reveal");
  assert.match(plan.summary, /^streamLineFramePlan:frames=3;visible=3;segments=4;points=\d+;phaseOrder=flow:line-0,flow:line-2,flow:line-1$/);
});

test("builds an animated open stream-line reveal window by arc length", () => {
  const streamLines = buildStreamLines({
    conceptId: "constant-flow",
    dt: 1,
    field: () => [1, 0, 0],
    id: "flow",
    seeds: [{ id: "seed", point: [0, 0, 0] }],
    steps: 3
  });
  const frame = buildAnimatedStreamLineFrame(streamLines.lines[0], {
    cycleSeconds: 4,
    timeSeconds: 3,
    visibleProgress: 0.25
  });

  assert.equal(frame.phase, 0.75);
  assert.equal(frame.visibleLength, 0.75);
  assert.equal(frame.partialFrames.length, 1);
  assert.equal(frame.partialFrames[0]?.sourceId, "flow:line-0");
  assert.deepEqual(frame.partialFrames[0]?.normalizedRange, [0.5, 0.75]);
  assert.equal(frame.windowRangeSummary, "0.500..0.750");
  assert.equal(frame.segments.length, 1);
  assert.deepEqual(roundedPoints(frame.segments[0]), [
    [1.5, 0, 0],
    [2, 0, 0],
    [2.25, 0, 0]
  ]);
  assert.equal(frame.pointCount, 3);
});

test("wraps animated stream-line windows for repeating flow effects", () => {
  const streamLines = buildStreamLines({
    conceptId: "constant-flow",
    dt: 1,
    field: () => [1, 0, 0],
    id: "flow",
    seeds: [{ id: "seed", point: [0, 0, 0] }],
    steps: 3
  });
  const frame = buildAnimatedStreamLineFrame(streamLines.lines[0], {
    cycleSeconds: 10,
    timeSeconds: 1,
    visibleProgress: 0.25,
    wrap: true
  });

  assert.equal(frame.phase, 0.1);
  assert.equal(frame.visibleLength, 0.75);
  assert.equal(frame.partialFrames.length, 2);
  assert.deepEqual(frame.partialFrames.map((partialFrame) => partialFrame.normalizedRange), [
    [0.85, 1],
    [0, 0.1]
  ]);
  assert.equal(frame.windowRangeSummary, "0.850..1.000+0.000..0.100");
  assert.equal(frame.segments.length, 2);
  assert.deepEqual(roundedPoints(frame.segments[0]), [
    [2.55, 0, 0],
    [3, 0, 0]
  ]);
  assert.deepEqual(roundedPoints(frame.segments[1]), [
    [0, 0, 0],
    [0.3, 0, 0]
  ]);
});

test("omits zero-length wrapped stream-line windows at exact cycle boundaries", () => {
  const streamLines = buildStreamLines({
    conceptId: "constant-flow",
    dt: 1,
    field: () => [1, 0, 0],
    id: "flow",
    seeds: [{ id: "seed", point: [0, 0, 0] }],
    steps: 3
  });
  const frame = buildAnimatedStreamLineFrame(streamLines.lines[0], {
    cycleSeconds: 10,
    timeSeconds: 10,
    visibleProgress: 0.25,
    wrap: true
  });

  assert.equal(frame.phase, 0);
  assert.equal(frame.partialFrames.length, 1);
  assert.deepEqual(frame.partialFrames.map((partialFrame) => partialFrame.normalizedRange), [
    [0.75, 1]
  ]);
  assert.equal(frame.windowRangeSummary, "0.750..1.000");
  assert.deepEqual(roundedPoints(frame.segments[0]), [
    [2.25, 0, 0],
    [3, 0, 0]
  ]);
  assert.equal(frame.pointCount, 2);
});

test("StreamLines source contract stays pure and reuses vector-field tracing plus curve reveal", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathStreamLines.ts", "utf8");

  assert.match(source, /traceVectorFieldPath/);
  assert.match(source, /pointwiseBecomePartialCurveObject/);
  assert.match(source, /buildAnimatedStreamLineFrame/);
  assert.doesNotMatch(source, /partialCurveByArcRange/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
