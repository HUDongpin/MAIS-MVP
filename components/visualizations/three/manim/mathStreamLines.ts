import { buildCurveObject, pointwiseBecomePartialCurveObject, type CurvePartialFrame } from "./mathCurveObject";
import { traceVectorFieldPath, type MathVectorFieldFunction, type VectorFieldBounds } from "./mathVectorField";
import type { Range2, Vec3 } from "./mathSceneTypes";

export const STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT =
  "StreamLines.framePlan|phase-ordered animated partial path reveal";

export type MathStreamLineSeed = {
  id: string;
  point: Vec3;
};

export type MathStreamLine = {
  conceptId: string;
  id: string;
  phaseOffset: number;
  points: Vec3[];
  seed: MathStreamLineSeed;
  stoppedReason: "completed" | "non-finite-vector" | "out-of-bounds";
};

export type MathStreamLineSet = {
  conceptId: string;
  id: string;
  lines: MathStreamLine[];
};

export type MathStreamLineSummary = {
  completedLineCount: number;
  lineCount: number;
  stoppedLineCount: number;
  totalPointCount: number;
};

export type AnimatedStreamLineFrame = {
  lineId: string;
  partialFrames: CurvePartialFrame[];
  phase: number;
  pointCount: number;
  segments: Vec3[][];
  visibleLength: number;
  visibleProgress: number;
  windowRangeSummary: string;
};

export type AnimatedStreamLineFramePlan = {
  finiteVisibleLengthCount: number;
  frameCount: number;
  frames: AnimatedStreamLineFrame[];
  phaseOrderLineIds: string[];
  phaseSummary: string;
  sourceContract: typeof STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT;
  summary: string;
  totalPointCount: number;
  totalSegmentCount: number;
  visibleLengthRange: string;
  visibleLengthSummary: string;
  visibleLineCount: number;
  windowRangeSummary: string;
};

export type SampleStreamLineSeeds2DInput = {
  id: string;
  xRange: Range2;
  xSteps: number;
  yRange: Range2;
  ySteps: number;
  z?: number;
};

export type BuildStreamLinesInput = {
  bounds?: VectorFieldBounds;
  conceptId: string;
  dt: number;
  field: MathVectorFieldFunction;
  id: string;
  phaseOffsetStep?: number;
  seeds: MathStreamLineSeed[];
  steps: number;
};

export type AnimatedStreamLineFrameInput = {
  cycleSeconds: number;
  timeSeconds: number;
  visibleProgress: number;
  wrap?: boolean;
};

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, finite(value, 0)));
}

function wrapPhaseOffset(value: number) {
  const raw = finite(value, 0);
  const phase = raw - Math.floor(raw);

  return Number(phase.toFixed(6));
}

function sampleRange([start, end]: Range2, steps: number) {
  const safeSteps = Math.max(1, Math.floor(finite(steps, 1)));
  if (safeSteps === 1) return [(start + end) / 2];

  return Array.from({ length: safeSteps }, (_, index) => start + ((end - start) * index) / (safeSteps - 1));
}

function normalizedPhase(timeSeconds: number, cycleSeconds: number, phaseOffset: number) {
  const cycle = Math.max(1e-9, finite(cycleSeconds, 1));
  const raw = finite(timeSeconds, 0) / cycle + finite(phaseOffset, 0);
  const phase = raw - Math.floor(raw);

  return Number(phase.toFixed(6));
}

function formatProgress(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : "NaN";
}

function summarizePartialWindowRanges(partialFrames: CurvePartialFrame[]) {
  return partialFrames
    .map((partialFrame) => `${formatProgress(partialFrame.normalizedRange[0])}..${formatProgress(partialFrame.normalizedRange[1])}`)
    .join("+") || "none";
}

function summarizeFiniteRange(values: number[]) {
  const finiteValues = values.filter(Number.isFinite);
  if (finiteValues.length === 0) return "none";

  return `${formatProgress(Math.min(...finiteValues))}..${formatProgress(Math.max(...finiteValues))}`;
}

export function sampleStreamLineSeeds2D({
  id,
  xRange,
  xSteps,
  yRange,
  ySteps,
  z = 0
}: SampleStreamLineSeeds2DInput): MathStreamLineSeed[] {
  const xs = sampleRange(xRange, xSteps);
  const ys = sampleRange(yRange, ySteps);

  return ys.flatMap((y, rowIndex) =>
    xs.map((x, columnIndex) => ({
      id: `${id}:seed-${xs.length * rowIndex + columnIndex}`,
      point: [x, y, finite(z, 0)] as Vec3
    }))
  );
}

export function buildStreamLines({
  bounds,
  conceptId,
  dt,
  field,
  id,
  phaseOffsetStep = 0,
  seeds,
  steps
}: BuildStreamLinesInput): MathStreamLineSet {
  return {
    conceptId,
    id,
    lines: seeds.map((seed, index) => {
      const trace = traceVectorFieldPath({
        bounds,
        dt,
        field,
        start: seed.point,
        steps
      });

      return {
        conceptId,
        id: `${id}:line-${index}`,
        phaseOffset: wrapPhaseOffset(index * phaseOffsetStep),
        points: trace.points,
        seed,
        stoppedReason: trace.stoppedReason
      };
    })
  };
}

export function summarizeStreamLines(streamLines: MathStreamLineSet): MathStreamLineSummary {
  return {
    completedLineCount: streamLines.lines.filter((line) => line.stoppedReason === "completed").length,
    lineCount: streamLines.lines.length,
    stoppedLineCount: streamLines.lines.filter((line) => line.stoppedReason !== "completed").length,
    totalPointCount: streamLines.lines.reduce((sum, line) => sum + line.points.length, 0)
  };
}

function linePartialFrame(line: MathStreamLine, startProgress: number, endProgress: number): CurvePartialFrame {
  const curve = buildCurveObject({
    colorRole: "trace",
    conceptId: line.conceptId,
    id: line.id,
    samples: line.points
  });

  return pointwiseBecomePartialCurveObject(curve, startProgress, endProgress);
}

export function buildAnimatedStreamLineFrame(
  line: MathStreamLine,
  input: AnimatedStreamLineFrameInput
): AnimatedStreamLineFrame {
  const phase = normalizedPhase(input.timeSeconds, input.cycleSeconds, line.phaseOffset);
  const visibleProgress = clamp01(input.visibleProgress);
  const start = phase - visibleProgress;
  const windowFrames = input.wrap && start < 0
    ? [
        linePartialFrame(line, 1 + start, 1),
        linePartialFrame(line, 0, phase)
      ]
    : [
        linePartialFrame(line, Math.max(0, start), phase)
      ];
  const visibleFrames = windowFrames.filter((frame) => frame.visibleLength > 0);
  const partialFrames = visibleFrames.length > 0 ? visibleFrames : windowFrames.slice(0, 1);
  const segments = partialFrames.map((partialFrame) => partialFrame.curve.samples);
  const visibleLength = Number(partialFrames.reduce((total, partialFrame) => total + partialFrame.visibleLength, 0).toFixed(6));
  const windowRangeSummary = summarizePartialWindowRanges(partialFrames);

  return {
    lineId: line.id,
    partialFrames,
    phase,
    pointCount: segments.reduce((sum, segment) => sum + segment.length, 0),
    segments,
    visibleLength,
    visibleProgress,
    windowRangeSummary
  };
}

export function buildAnimatedStreamLineFramePlan(
  streamLines: MathStreamLineSet,
  input: AnimatedStreamLineFrameInput
): AnimatedStreamLineFramePlan {
  const frames = streamLines.lines.map((line) => buildAnimatedStreamLineFrame(line, input));
  const phaseOrderLineIds = [...frames]
    .sort((left, right) => (left.phase === right.phase ? left.lineId.localeCompare(right.lineId) : left.phase - right.phase))
    .map((frame) => frame.lineId);
  const totalPointCount = frames.reduce((total, frame) => total + frame.pointCount, 0);
  const totalSegmentCount = frames.reduce((total, frame) => total + frame.segments.length, 0);
  const visibleLineCount = frames.filter((frame) => frame.pointCount > 0).length;
  const visibleLengths = frames.map((frame) => frame.visibleLength);
  const finiteVisibleLengthCount = visibleLengths.filter(Number.isFinite).length;
  const phaseSummary = frames.map((frame) => `${frame.lineId}=${frame.phase.toFixed(3)}`).join(";") || "none";
  const visibleLengthRange = summarizeFiniteRange(visibleLengths);
  const visibleLengthSummary = frames.map((frame) => `${frame.lineId}=${formatProgress(frame.visibleLength)}`).join(";") || "none";
  const windowRangeSummary = frames.map((frame) => `${frame.lineId}=${frame.windowRangeSummary}`).join(";") || "none";

  return {
    finiteVisibleLengthCount,
    frameCount: frames.length,
    frames,
    phaseOrderLineIds,
    phaseSummary,
    sourceContract: STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT,
    summary:
      `streamLineFramePlan:frames=${frames.length};visible=${visibleLineCount};segments=${totalSegmentCount};` +
      `points=${totalPointCount};phaseOrder=${phaseOrderLineIds.join(",") || "none"}`,
    totalPointCount,
    totalSegmentCount,
    visibleLengthRange,
    visibleLengthSummary,
    visibleLineCount,
    windowRangeSummary
  };
}
