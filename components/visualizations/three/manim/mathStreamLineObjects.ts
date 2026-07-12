import { mapMathPointToWorld } from "./mathCoordinateSpace";
import { resolveOdeSystem } from "./mathOdeTrajectory";
import {
  buildAnimatedStreamLineFrame,
  buildAnimatedStreamLineFramePlan,
  buildStreamLines,
  sampleStreamLineSeeds2D,
  summarizeStreamLines,
  STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT,
  type MathStreamLineSet
} from "./mathStreamLines";
import type { MathObjectSpec, MathSceneOdeSystemSpec, MathSceneSpec, MathSceneStreamLineSpec, Range2, Vec3 } from "./mathSceneTypes";

export const STREAM_LINE_SOURCE_CONTRACT =
  "StreamLines|AnimatedStreamLines|VectorField flow lines with repeated partial path reveal";

export { STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT };

export type SceneStreamLineSet = {
  spec: MathSceneStreamLineSpec;
  streamLines: MathStreamLineSet;
};

export type SceneStreamLineSummary = {
  animatedWindowCount: number;
  completedLineCount: number;
  coordinateModeSummary: string;
  cycleSecondsSummary: string;
  frameFiniteVisibleLengthCount: number;
  framePhaseOrder: string;
  framePlanSegmentCount: number;
  framePlanSourceContract: typeof STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT;
  framePlanVisibleLineCount: number;
  frameVisibleLengthRange: string;
  frameVisibleLengthSummary: string;
  frameWindowRangeSummary: string;
  integrationStepSummary: string;
  lineCount: number;
  objectCount: number;
  phaseOffsetRange: string;
  revealWindowSummary: string;
  seedGridSummary: string;
  sourceContract: typeof STREAM_LINE_SOURCE_CONTRACT;
  stoppedLineCount: number;
  streamLineIds: string;
  streamLineSetCount: number;
  summary: string;
  systemSummary: string;
  totalPointCount: number;
  visibleProgressSummary: string;
  visiblePointCount: number;
  wrappedWindowCount: number;
};

export type SceneStreamLinePayloadFrame = {
  frame: ReturnType<typeof buildAnimatedStreamLineFrame>;
  lineIndex: number;
  setId: string;
};

export type SceneStreamLinePayload = SceneStreamLineSummary & {
  animatedFrames: SceneStreamLinePayloadFrame[];
  elapsedSeconds: number;
  sets: SceneStreamLineSet[];
  version: "mais-manim-stream-line/v1";
};

export type StreamLineRuntimeOptions = {
  elapsedSeconds?: number;
};

export function streamLineRuntimeObjectId(streamLineSetId: string, lineIndex: number) {
  return `${streamLineSetId}:line-${lineIndex}`;
}

function stableValue(value: unknown): unknown {
  if (typeof value === "function") return "[function]";
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry) ?? null);
  if (!value || typeof value !== "object") return value;

  const stableObject: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (entry !== undefined) stableObject[key] = stableValue(entry);
  }

  return stableObject;
}

function stableSerialize(value: unknown) {
  return JSON.stringify(stableValue(value))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function mapPointForStreamLine(point: Vec3, scene: MathSceneSpec, spec: MathSceneStreamLineSpec): Vec3 {
  if (spec.coordinateMode !== "math") return point;

  return mapMathPointToWorld(point, scene.coordinateSpace);
}

export function buildSceneStreamLines(scene: MathSceneSpec): SceneStreamLineSet[] {
  return (scene.streamLines ?? []).map((spec) => {
    const resolvedSystem = resolveOdeSystem(spec.system);
    const seeds = sampleStreamLineSeeds2D({
      id: spec.id,
      xRange: spec.xRange,
      xSteps: spec.xSteps,
      yRange: spec.yRange,
      ySteps: spec.ySteps,
      z: spec.z
    });
    const streamLines = buildStreamLines({
      bounds: spec.bounds,
      conceptId: spec.conceptId,
      dt: spec.dt,
      field: (point) => resolvedSystem(point, 0),
      id: spec.id,
      phaseOffsetStep: spec.phaseOffsetStep,
      seeds,
      steps: spec.stepCount
    });

    return { spec, streamLines };
  });
}

function animatedStreamLinePoints(
  line: MathStreamLineSet["lines"][number],
  spec: MathSceneStreamLineSpec,
  elapsedSeconds: number
) {
  const frame = buildAnimatedStreamLineFrame(line, {
    cycleSeconds: spec.cycleSeconds ?? 3,
    timeSeconds: elapsedSeconds,
    visibleProgress: spec.visibleProgress ?? 1,
    wrap: true
  });

  return frame.segments.flat();
}

function formatFixed(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : "NaN";
}

function formatRangePair(range: Range2) {
  return `[${formatFixed(range[0])},${formatFixed(range[1])}]`;
}

function formatVec3(vector: Vec3) {
  return `[${vector.map(formatFixed).join(",")}]`;
}

function formatOdeSystem(system: MathSceneOdeSystemSpec) {
  if (system.type === "constantVelocity") return `constantVelocity${formatVec3(system.velocity)}`;
  if (system.type === "lorenz") {
    return `lorenz(sigma=${formatFixed(system.sigma)},rho=${formatFixed(system.rho)},beta=${formatFixed(system.beta)})`;
  }

  return `linear2d[[${system.matrix[0].map(formatFixed).join(",")}],[${system.matrix[1].map(formatFixed).join(",")}]]`;
}

function formatRange(values: number[]) {
  const finiteValues = values.filter(Number.isFinite);
  if (finiteValues.length === 0) return "none";

  return `${formatFixed(Math.min(...finiteValues))}..${formatFixed(Math.max(...finiteValues))}`;
}

function summarizeSeedGrid(spec: MathSceneStreamLineSpec) {
  const coordinateMode = spec.coordinateMode ?? "world";

  return (
    `${spec.id}:${spec.xSteps}x${spec.ySteps}:` +
    `x=${formatRangePair(spec.xRange)}:y=${formatRangePair(spec.yRange)}:` +
    `z=${formatFixed(spec.z ?? 0)}:mode=${coordinateMode}`
  );
}

function summarizeIntegrationStep(spec: MathSceneStreamLineSpec) {
  return `${spec.id}:dt=${formatFixed(spec.dt)}:steps=${spec.stepCount}`;
}

function summarizeRevealWindow(spec: MathSceneStreamLineSpec) {
  return (
    `${spec.id}:cycle=${formatFixed(spec.cycleSeconds ?? 3)}s:` +
    `visible=${formatFixed(spec.visibleProgress ?? 1)}:` +
    `phaseStep=${formatFixed(spec.phaseOffsetStep ?? 0)}:wrap=true`
  );
}

export function summarizeSceneStreamLines(
  sets: SceneStreamLineSet[],
  options: StreamLineRuntimeOptions = {}
): SceneStreamLineSummary {
  const setSummaries = sets.map(({ streamLines }) => summarizeStreamLines(streamLines));
  const streamLineIds = sets.map(({ streamLines }) => streamLines.id).join(",") || "none";
  const lineCount = setSummaries.reduce((total, summary) => total + summary.lineCount, 0);
  const completedLineCount = setSummaries.reduce((total, summary) => total + summary.completedLineCount, 0);
  const stoppedLineCount = setSummaries.reduce((total, summary) => total + summary.stoppedLineCount, 0);
  const totalPointCount = setSummaries.reduce((total, summary) => total + summary.totalPointCount, 0);
  const objectCount = lineCount;
  const framePlans = sets.map(({ spec, streamLines }) => buildAnimatedStreamLineFramePlan(streamLines, {
    cycleSeconds: spec.cycleSeconds ?? 3,
    timeSeconds: options.elapsedSeconds ?? 0,
    visibleProgress: spec.visibleProgress ?? 1,
    wrap: true
  }));
  const animatedFrames = framePlans.flatMap((plan) => plan.frames);
  const visiblePointCount = animatedFrames.reduce((total, frame) => total + frame.pointCount, 0);
  const framePlanSegmentCount = framePlans.reduce((total, plan) => total + plan.totalSegmentCount, 0);
  const framePlanVisibleLineCount = framePlans.reduce((total, plan) => total + plan.visibleLineCount, 0);
  const frameFiniteVisibleLengthCount = framePlans.reduce((total, plan) => total + plan.finiteVisibleLengthCount, 0);
  const framePhaseOrder = framePlans.map((plan) => plan.phaseOrderLineIds.join(",") || "none").join("|") || "none";
  const frameVisibleLengthRange = formatRange(framePlans.flatMap((plan) => plan.frames.map((frame) => frame.visibleLength)));
  const frameVisibleLengthSummary = framePlans.map((plan) => plan.visibleLengthSummary).join("|") || "none";
  const frameWindowRangeSummary = framePlans.map((plan) => plan.windowRangeSummary).join("|") || "none";
  const phaseOffsetRange = formatRange(sets.flatMap(({ streamLines }) => streamLines.lines.map((line) => line.phaseOffset)));
  const cycleSecondsSummary = sets
    .map(({ spec, streamLines }) => `${streamLines.id}=${formatFixed(spec.cycleSeconds ?? 3)}s`)
    .join(";") || "none";
  const mathCoordinateModeCount = sets.filter(({ spec }) => spec.coordinateMode === "math").length;
  const worldCoordinateModeCount = sets.length - mathCoordinateModeCount;
  const coordinateModeSummary = `math=${mathCoordinateModeCount};world=${worldCoordinateModeCount}`;
  const integrationStepSummary = sets.map(({ spec }) => summarizeIntegrationStep(spec)).join(";") || "none";
  const revealWindowSummary = sets.map(({ spec }) => summarizeRevealWindow(spec)).join(";") || "none";
  const seedGridSummary = sets.map(({ spec }) => summarizeSeedGrid(spec)).join("|") || "none";
  const systemSummary = sets.map(({ spec }) => `${spec.id}:${formatOdeSystem(spec.system)}`).join("|") || "none";
  const visibleProgressSummary = sets
    .map(({ spec, streamLines }) => `${streamLines.id}=${formatFixed(spec.visibleProgress ?? 1)}`)
    .join(";") || "none";
  const wrappedWindowCount = animatedFrames.filter((frame) => frame.partialFrames.length > 1).length;

  return {
    animatedWindowCount: animatedFrames.length,
    completedLineCount,
    coordinateModeSummary,
    cycleSecondsSummary,
    frameFiniteVisibleLengthCount,
    framePhaseOrder,
    framePlanSegmentCount,
    framePlanSourceContract: STREAM_LINE_FRAME_PLAN_SOURCE_CONTRACT,
    framePlanVisibleLineCount,
    frameVisibleLengthRange,
    frameVisibleLengthSummary,
    frameWindowRangeSummary,
    integrationStepSummary,
    lineCount,
    objectCount,
    phaseOffsetRange,
    revealWindowSummary,
    seedGridSummary,
    sourceContract: STREAM_LINE_SOURCE_CONTRACT,
    stoppedLineCount,
    streamLineIds,
    streamLineSetCount: sets.length,
    summary:
      `streamLineSets=${sets.length};lines=${lineCount};completed=${completedLineCount};stopped=${stoppedLineCount};` +
      `points=${totalPointCount};visible=${visiblePointCount};objects=${objectCount};ids=${streamLineIds}`,
    systemSummary,
    totalPointCount,
    visibleProgressSummary,
    visiblePointCount,
    wrappedWindowCount
  };
}

export function buildStreamLineEvidenceForScene(
  scene: MathSceneSpec,
  options: StreamLineRuntimeOptions = {}
) {
  return summarizeSceneStreamLines(buildSceneStreamLines(scene), options);
}

export function buildAnimatedStreamLinePayloadFrames(
  sets: SceneStreamLineSet[],
  options: StreamLineRuntimeOptions = {}
): SceneStreamLinePayloadFrame[] {
  const elapsedSeconds = options.elapsedSeconds ?? 0;

  return sets.flatMap(({ spec, streamLines }) =>
    buildAnimatedStreamLineFramePlan(streamLines, {
        cycleSeconds: spec.cycleSeconds ?? 3,
        timeSeconds: elapsedSeconds,
        visibleProgress: spec.visibleProgress ?? 1,
        wrap: true
    }).frames.map((frame, lineIndex) => ({
      frame,
      lineIndex,
      setId: streamLines.id
    }))
  );
}

export function serializeStreamLinePayload(
  sets: SceneStreamLineSet[],
  options: StreamLineRuntimeOptions = {}
) {
  const elapsedSeconds = options.elapsedSeconds ?? 0;
  const evidence = summarizeSceneStreamLines(sets, { elapsedSeconds });

  return stableSerialize({
    ...evidence,
    animatedFrames: buildAnimatedStreamLinePayloadFrames(sets, { elapsedSeconds }),
    elapsedSeconds,
    sets,
    version: "mais-manim-stream-line/v1"
  } satisfies SceneStreamLinePayload);
}

export function streamLineDataAttributes(summary: SceneStreamLineSummary) {
  return {
    "data-viz-manim-stream-line-animated-window-count": String(summary.animatedWindowCount),
    "data-viz-manim-stream-line-completed-line-count": String(summary.completedLineCount),
    "data-viz-manim-stream-line-count": String(summary.lineCount),
    "data-viz-manim-stream-line-coordinate-mode-summary": summary.coordinateModeSummary,
    "data-viz-manim-stream-line-cycle-seconds-summary": summary.cycleSecondsSummary,
    "data-viz-manim-stream-line-frame-phase-order": summary.framePhaseOrder,
    "data-viz-manim-stream-line-frame-finite-visible-length-count": String(summary.frameFiniteVisibleLengthCount),
    "data-viz-manim-stream-line-frame-plan-segment-count": String(summary.framePlanSegmentCount),
    "data-viz-manim-stream-line-frame-plan-source-contract": summary.framePlanSourceContract,
    "data-viz-manim-stream-line-frame-plan-visible-line-count": String(summary.framePlanVisibleLineCount),
    "data-viz-manim-stream-line-frame-visible-length-range": summary.frameVisibleLengthRange,
    "data-viz-manim-stream-line-frame-visible-length-summary": summary.frameVisibleLengthSummary,
    "data-viz-manim-stream-line-frame-window-range-summary": summary.frameWindowRangeSummary,
    "data-viz-manim-stream-line-integration-step-summary": summary.integrationStepSummary,
    "data-viz-manim-stream-line-object-count": String(summary.objectCount),
    "data-viz-manim-stream-line-phase-offset-range": summary.phaseOffsetRange,
    "data-viz-manim-stream-line-point-count": String(summary.totalPointCount),
    "data-viz-manim-stream-line-reveal-window-summary": summary.revealWindowSummary,
    "data-viz-manim-stream-line-seed-grid-summary": summary.seedGridSummary,
    "data-viz-manim-stream-line-source-contract": summary.sourceContract,
    "data-viz-manim-stream-line-set-count": String(summary.streamLineSetCount),
    "data-viz-manim-stream-line-stopped-line-count": String(summary.stoppedLineCount),
    "data-viz-manim-stream-line-summary": summary.summary,
    "data-viz-manim-stream-line-system-summary": summary.systemSummary,
    "data-viz-manim-stream-line-visible-point-count": String(summary.visiblePointCount),
    "data-viz-manim-stream-line-visible-progress-summary": summary.visibleProgressSummary,
    "data-viz-manim-stream-line-wrapped-window-count": String(summary.wrappedWindowCount)
  } as const;
}

export function buildStreamLineObjectSpecs(
  scene: MathSceneSpec,
  options: StreamLineRuntimeOptions = {}
): MathObjectSpec[] {
  const authoredIds = new Set(scene.objects.map((object) => object.id));
  const hasElapsedTime = Number.isFinite(options.elapsedSeconds);

  return buildSceneStreamLines(scene).flatMap(({ spec, streamLines }): MathObjectSpec[] =>
    streamLines.lines.flatMap((line, index): MathObjectSpec[] => {
      const id = streamLineRuntimeObjectId(streamLines.id, index);
      if (authoredIds.has(id)) return [];
      const samples = hasElapsedTime
        ? animatedStreamLinePoints(line, spec, options.elapsedSeconds ?? 0)
        : line.points;

      return [
        {
          colorRole: spec.colorRole ?? "trace",
          conceptId: line.conceptId,
          id,
          samples: samples.map((point) => mapPointForStreamLine(point, scene, spec)),
          style: {
            strokeOpacity: 0.34,
            strokeRole: spec.colorRole ?? "trace",
            strokeWidth: 1.8
          },
          type: "parametricCurve"
        }
      ];
    })
  );
}

export function expandSceneStreamLineObjects(
  scene: MathSceneSpec,
  options: StreamLineRuntimeOptions = {}
): MathSceneSpec {
  const generatedObjects = buildStreamLineObjectSpecs(scene, options);
  if (generatedObjects.length === 0) return scene;

  return {
    ...scene,
    diagnostics: {
      ...scene.diagnostics,
      expectedObjectCount: scene.diagnostics.expectedObjectCount + generatedObjects.length
    },
    objects: [...scene.objects, ...generatedObjects]
  };
}
