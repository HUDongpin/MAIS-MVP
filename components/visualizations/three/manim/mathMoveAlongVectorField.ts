import {
  mapMathVectorToWorldDelta,
  mapWorldPointToMath
} from "./mathCoordinateSpace";
import { resolveOdeSystem } from "./mathOdeTrajectory";
import type { MathSceneRuntimeState, RuntimeRenderState } from "./mathSceneRuntimeState";
import type { MathSceneSpec, MathSceneVectorFieldUpdaterSpec, Vec3 } from "./mathSceneTypes";

export const MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT =
  "Mobject.move_along_vector_field|Updater(dt)|func(center)*dt";

export type MoveAlongVectorFieldStatus = "missing-anchor" | "moved" | "non-finite-vector" | "out-of-bounds";

export type MoveAlongVectorFieldFrame = {
  coordinateMode: "math" | "world";
  deltaSeconds: number;
  displacementMagnitude: number;
  elapsedSeconds: number;
  mathAnchor: Vec3;
  mathDelta: Vec3;
  objectId: string;
  speedScale: number;
  status: MoveAlongVectorFieldStatus;
  updaterId: string;
  vector: Vec3;
  vectorMagnitude: number;
  worldAnchor: Vec3;
  worldDelta: Vec3;
};

export type MoveAlongVectorFieldEvidence = {
  blockedCount: number;
  coordinateModes: string;
  deltaSecondsSummary: string;
  displacementMagnitudeRange: string;
  finiteDisplacementCount: number;
  finiteVectorCount: number;
  movedCount: number;
  objectIds: string;
  speedScaleSummary: string;
  sourceContract: typeof MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT;
  statusSummary: string;
  summary: string;
  updaterCount: number;
  updaterIds: string;
  vectorMagnitudeRange: string;
  version: "mais-manim-move-along-vector-field/v1";
};

export type MoveAlongVectorFieldPayload = MoveAlongVectorFieldEvidence & {
  frames: MoveAlongVectorFieldFrame[];
};

export type EvaluateMoveAlongVectorFieldUpdaterInput = {
  deltaSeconds?: number;
  elapsedSeconds: number;
  scene: MathSceneSpec;
  updater: MathSceneVectorFieldUpdaterSpec;
  worldAnchor?: Vec3 | null;
};

const zeroVec3: Vec3 = [0, 0, 0];

function finite(value: number | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nonNegative(value: number | undefined, fallback = 0) {
  return Math.max(0, finite(value, fallback));
}

function finiteVec3(vector: Vec3) {
  return vector.every(Number.isFinite);
}

function scaleVec3(vector: Vec3, scale: number): Vec3 {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function addVec3(left: Vec3, right: Vec3): Vec3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function magnitude(vector: Vec3) {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function inRange(value: number, range: [number, number] | undefined) {
  if (!range) return true;
  return value >= Math.min(range[0], range[1]) && value <= Math.max(range[0], range[1]);
}

function withinBounds(point: Vec3, updater: MathSceneVectorFieldUpdaterSpec) {
  return inRange(point[0], updater.bounds?.x) && inRange(point[1], updater.bounds?.y) && inRange(point[2], updater.bounds?.z);
}

function formatFixed(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : "NaN";
}

function formatRange(values: number[]) {
  const finiteValues = values.filter(Number.isFinite);
  if (finiteValues.length === 0) return "none";

  return `${formatFixed(Math.min(...finiteValues))}..${formatFixed(Math.max(...finiteValues))}`;
}

function defaultFrame({
  elapsedSeconds,
  scene,
  status,
  updater,
  worldAnchor
}: {
  elapsedSeconds: number;
  scene: MathSceneSpec;
  status: MoveAlongVectorFieldStatus;
  updater: MathSceneVectorFieldUpdaterSpec;
  worldAnchor: Vec3;
}): MoveAlongVectorFieldFrame {
  const coordinateMode = updater.coordinateMode ?? "world";
  const mathAnchor = mapWorldPointToMath(worldAnchor, scene.coordinateSpace);

  return {
    coordinateMode,
    deltaSeconds: 0,
    displacementMagnitude: 0,
    elapsedSeconds,
    mathAnchor,
    mathDelta: zeroVec3,
    objectId: updater.objectId,
    speedScale: finite(updater.speedScale, 1),
    status,
    updaterId: updater.id,
    vector: zeroVec3,
    vectorMagnitude: 0,
    worldAnchor,
    worldDelta: zeroVec3
  };
}

export function evaluateMoveAlongVectorFieldUpdater({
  deltaSeconds,
  elapsedSeconds,
  scene,
  updater,
  worldAnchor
}: EvaluateMoveAlongVectorFieldUpdaterInput): MoveAlongVectorFieldFrame {
  const coordinateMode = updater.coordinateMode ?? "world";
  const safeElapsedSeconds = nonNegative(elapsedSeconds);
  const safeWorldAnchor = worldAnchor ?? null;
  if (!safeWorldAnchor || !finiteVec3(safeWorldAnchor)) {
    return defaultFrame({
      elapsedSeconds: safeElapsedSeconds,
      scene,
      status: "missing-anchor",
      updater,
      worldAnchor: zeroVec3
    });
  }

  const speedScale = finite(updater.speedScale, 1);
  const safeDeltaSeconds = deltaSeconds === undefined ? safeElapsedSeconds : nonNegative(deltaSeconds);
  const scale = safeDeltaSeconds * speedScale;
  const system = resolveOdeSystem(updater.system);
  const mathAnchor = mapWorldPointToMath(safeWorldAnchor, scene.coordinateSpace);
  const evaluationPoint = coordinateMode === "math" ? mathAnchor : safeWorldAnchor;
  const vector = system(evaluationPoint, safeElapsedSeconds);
  const vectorMagnitude = finiteVec3(vector) ? magnitude(vector) : 0;

  if (!finiteVec3(vector)) {
    return {
      ...defaultFrame({
        elapsedSeconds: safeElapsedSeconds,
        scene,
        status: "non-finite-vector",
        updater,
        worldAnchor: safeWorldAnchor
      }),
      coordinateMode,
      deltaSeconds: safeDeltaSeconds
    };
  }

  const mathDelta = coordinateMode === "math" ? scaleVec3(vector, scale) : zeroVec3;
  const worldDelta = coordinateMode === "math"
    ? mapMathVectorToWorldDelta(mathDelta, scene.coordinateSpace)
    : scaleVec3(vector, scale);
  const nextPoint = coordinateMode === "math"
    ? addVec3(mathAnchor, mathDelta)
    : addVec3(safeWorldAnchor, worldDelta);

  if (!finiteVec3(worldDelta) || !finiteVec3(nextPoint)) {
    return {
      ...defaultFrame({
        elapsedSeconds: safeElapsedSeconds,
        scene,
        status: "non-finite-vector",
        updater,
        worldAnchor: safeWorldAnchor
      }),
      coordinateMode,
      deltaSeconds: safeDeltaSeconds,
      vector,
      vectorMagnitude
    };
  }

  if (!withinBounds(nextPoint, updater)) {
    return {
      ...defaultFrame({
        elapsedSeconds: safeElapsedSeconds,
        scene,
        status: "out-of-bounds",
        updater,
        worldAnchor: safeWorldAnchor
      }),
      coordinateMode,
      deltaSeconds: safeDeltaSeconds,
      vector,
      vectorMagnitude
    };
  }

  return {
    coordinateMode,
    deltaSeconds: safeDeltaSeconds,
    displacementMagnitude: magnitude(worldDelta),
    elapsedSeconds: safeElapsedSeconds,
    mathAnchor,
    mathDelta,
    objectId: updater.objectId,
    speedScale,
    status: "moved",
    updaterId: updater.id,
    vector,
    vectorMagnitude,
    worldAnchor: safeWorldAnchor,
    worldDelta
  };
}

function sortedFrames(frames: MoveAlongVectorFieldFrame[]) {
  return [...frames].sort((left, right) => left.updaterId.localeCompare(right.updaterId));
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function escapedJson(value: string) {
  return value.replace(/</g, "\\u003c");
}

function uniqueList(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right)).join(",") || "none";
}

function statusCount(frames: MoveAlongVectorFieldFrame[], status: MoveAlongVectorFieldStatus) {
  return frames.filter((frame) => frame.status === status).length;
}

export function buildMoveAlongVectorFieldEvidence(frames: MoveAlongVectorFieldFrame[]): MoveAlongVectorFieldEvidence {
  const sorted = sortedFrames(frames);
  const movedFrames = sorted.filter((frame) => frame.status === "moved");
  const finiteVectorCount = sorted.filter((frame) => frame.status !== "missing-anchor" && finiteVec3(frame.vector)).length;
  const finiteDisplacementCount = movedFrames.filter((frame) => finiteVec3(frame.worldDelta)).length;
  const updaterIds = sorted.map((frame) => frame.updaterId).join(",") || "none";
  const objectIds = uniqueList(sorted.map((frame) => frame.objectId));
  const coordinateModes = uniqueList(sorted.map((frame) => frame.coordinateMode));
  const deltaSecondsSummary = sorted.map((frame) => `${frame.updaterId}=${formatFixed(frame.deltaSeconds)}s`).join(";") || "none";
  const speedScaleSummary = sorted.map((frame) => `${frame.updaterId}=${formatFixed(frame.speedScale)}`).join(";") || "none";
  const vectorMagnitudeRange = formatRange(sorted.map((frame) => frame.vectorMagnitude));
  const displacementMagnitudeRange = formatRange(movedFrames.map((frame) => frame.displacementMagnitude));
  const movedCount = movedFrames.length;
  const blockedCount = sorted.length - movedCount;
  const statusSummary = [
    `moved=${statusCount(sorted, "moved")}`,
    `missing-anchor=${statusCount(sorted, "missing-anchor")}`,
    `non-finite-vector=${statusCount(sorted, "non-finite-vector")}`,
    `out-of-bounds=${statusCount(sorted, "out-of-bounds")}`
  ].join(";");
  const summary = [
    `moveAlongVectorField:updaters=${sorted.length}`,
    `moved=${movedCount}`,
    `blocked=${blockedCount}`,
    `finiteVectors=${finiteVectorCount}`,
    `finiteDisplacements=${finiteDisplacementCount}`,
    `ids=${updaterIds}`,
    `objects=${objectIds}`,
    `modes=${coordinateModes}`,
    `vector=${vectorMagnitudeRange}`,
    `displacement=${displacementMagnitudeRange}`
  ].join(":");

  return {
    blockedCount,
    coordinateModes,
    deltaSecondsSummary,
    displacementMagnitudeRange,
    finiteDisplacementCount,
    finiteVectorCount,
    movedCount,
    objectIds,
    speedScaleSummary,
    sourceContract: MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT,
    statusSummary,
    summary,
    updaterCount: sorted.length,
    updaterIds,
    vectorMagnitudeRange,
    version: "mais-manim-move-along-vector-field/v1"
  };
}

function averageVec3(points: Vec3[]) {
  const finitePoints = points.filter(finiteVec3);
  if (finitePoints.length === 0) return null;
  const total = finitePoints.reduce<Vec3>(
    (sum, point) => [sum[0] + point[0], sum[1] + point[1], sum[2] + point[2]],
    [0, 0, 0]
  );

  return [total[0] / finitePoints.length, total[1] / finitePoints.length, total[2] / finitePoints.length] as Vec3;
}

function renderStateAnchor(renderState: RuntimeRenderState): Vec3 | null {
  if (renderState.kind === "point") return renderState.position;
  if (renderState.kind === "vector") {
    return [
      (renderState.from[0] + renderState.to[0]) / 2,
      (renderState.from[1] + renderState.to[1]) / 2,
      (renderState.from[2] + renderState.to[2]) / 2
    ];
  }
  if (renderState.kind === "polyline") return averageVec3(renderState.points);
  if (renderState.kind === "surface") return averageVec3(renderState.points);

  return null;
}

function vectorFieldAnchorObject(
  runtimeState: MathSceneRuntimeState,
  previousRuntimeState: MathSceneRuntimeState | undefined,
  objectId: string
) {
  if (previousRuntimeState?.sceneId === runtimeState.sceneId) {
    return previousRuntimeState.objectGraph.byId[objectId] ?? runtimeState.objectGraph.byId[objectId];
  }

  return runtimeState.objectGraph.byId[objectId];
}

export function buildMoveAlongVectorFieldPayload(frames: MoveAlongVectorFieldFrame[]): MoveAlongVectorFieldPayload {
  const sorted = sortedFrames(frames);

  return {
    ...buildMoveAlongVectorFieldEvidence(sorted),
    frames: sorted
  };
}

export function buildMoveAlongVectorFieldPayloadForRuntimeState(
  runtimeState: MathSceneRuntimeState,
  previousRuntimeState: MathSceneRuntimeState | undefined,
  deltaSeconds: number
): MoveAlongVectorFieldPayload {
  return buildMoveAlongVectorFieldPayload(
    (runtimeState.sourceScene.vectorFieldUpdaters ?? []).map((updater) => {
      const object = vectorFieldAnchorObject(runtimeState, previousRuntimeState, updater.objectId);

      return evaluateMoveAlongVectorFieldUpdater({
        deltaSeconds,
        elapsedSeconds: runtimeState.timeline.elapsedSeconds,
        scene: runtimeState.sourceScene,
        updater,
        worldAnchor: object ? renderStateAnchor(object.renderState) : null
      });
    })
  );
}

export function serializeMoveAlongVectorFieldPayload(payload: MoveAlongVectorFieldPayload) {
  return escapedJson(stableSerialize(payload));
}

export function moveAlongVectorFieldEvidenceDataAttributes(evidence: MoveAlongVectorFieldEvidence): Record<string, string> {
  return {
    "data-viz-manim-move-along-vector-field-blocked-count": String(evidence.blockedCount),
    "data-viz-manim-move-along-vector-field-coordinate-modes": evidence.coordinateModes,
    "data-viz-manim-move-along-vector-field-count": String(evidence.updaterCount),
    "data-viz-manim-move-along-vector-field-delta-summary": evidence.deltaSecondsSummary,
    "data-viz-manim-move-along-vector-field-displacement-magnitude-range": evidence.displacementMagnitudeRange,
    "data-viz-manim-move-along-vector-field-finite-displacement-count": String(evidence.finiteDisplacementCount),
    "data-viz-manim-move-along-vector-field-finite-vector-count": String(evidence.finiteVectorCount),
    "data-viz-manim-move-along-vector-field-ids": evidence.updaterIds,
    "data-viz-manim-move-along-vector-field-moved-count": String(evidence.movedCount),
    "data-viz-manim-move-along-vector-field-object-ids": evidence.objectIds,
    "data-viz-manim-move-along-vector-field-speed-summary": evidence.speedScaleSummary,
    "data-viz-manim-move-along-vector-field-source-contract": evidence.sourceContract,
    "data-viz-manim-move-along-vector-field-status-summary": evidence.statusSummary,
    "data-viz-manim-move-along-vector-field-summary": evidence.summary,
    "data-viz-manim-move-along-vector-field-vector-magnitude-range": evidence.vectorMagnitudeRange
  };
}
