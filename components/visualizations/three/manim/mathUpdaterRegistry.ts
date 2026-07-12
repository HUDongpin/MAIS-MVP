import type { MathAnimatePlan } from "./mathAnimationBuilder";
import { applyMathAnimatePlans } from "./mathAnimationRuntime";
import { applyAlwaysMethodUpdater } from "./mathAlwaysMethodUpdater";
import { buildAlwaysRedrawObjectFromFactory } from "./mathAlwaysRedraw";
import { buildCreationPrimitiveFrame, type CreationPrimitiveKind } from "./mathCreationPrimitives";
import { buildCurveObject, pointwiseBecomePartialCurveObject, pointAtArcProgress } from "./mathCurveObject";
import { buildMobjectFamilyIndex } from "./mathMobjectFamily";
import { normalizeMobjectUniforms } from "./mathMobjectUniforms";
import { evaluateMoveAlongVectorFieldUpdater } from "./mathMoveAlongVectorField";
import { mapRuntimeRenderState, pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import { rebuildMathSceneRuntimeGraphState } from "./mathSceneRuntimeGraph";
import { buildSurfaceObjectFromGrid, partialSurfaceWireframe } from "./mathSurfaceObject";
import { buildTracingTailFromPoints } from "./mathTracingTail";
import { buildUpdaterSuspensionPlan } from "./mathUpdaterSuspension";
import { buildVMobjectStyle, type VMobjectStyle } from "./mathVMobjectStyle";
import type {
  MathObjectSpec,
  MathSceneAlwaysMethodUpdaterSpec,
  MathSceneAlwaysRedrawSpec,
  MathSceneVectorFieldUpdaterSpec,
  Vec3
} from "./mathSceneTypes";
import type { MathSceneRuntimeState, RuntimeBoundingBox, RuntimeMathObjectNode, RuntimeRenderState } from "./mathSceneRuntimeState";

export const UPDATER_REGISTRY_SOURCE_CONTRACT =
  "Mobject.add_updater|Mobject.update(dt): recursive child-first updater traversal";

export type MathUpdaterEntry = {
  id: string;
  objectId: string;
  sourceContract: typeof UPDATER_REGISTRY_SOURCE_CONTRACT;
  type:
    | "always-method"
    | "always-redraw"
    | "move-along-path"
    | "move-along-vector-field"
    | "reveal-curve"
    | "reveal-surface"
    | "trace-recent-path";
  updaterId?: string;
};

export type MathUpdaterRegistry = {
  byObjectId: Record<string, string[]>;
  entries: MathUpdaterEntry[];
  sourceContract: typeof UPDATER_REGISTRY_SOURCE_CONTRACT;
};

export type ApplyMathUpdatersOptions = {
  animationPlans?: MathAnimatePlan[];
  deltaSeconds?: number;
  previousRuntimeState?: MathSceneRuntimeState;
};

function pathObject(objects: MathObjectSpec[], objectId: string) {
  return objects.find(
    (object): object is Extract<MathObjectSpec, { type: "parametricCurve" }> => object.type === "parametricCurve" && object.id === objectId
  );
}

function curveObjectForSpec(curve: Extract<MathObjectSpec, { type: "parametricCurve" }>) {
  return buildCurveObject({
    colorRole: curve.colorRole,
    conceptId: curve.conceptId,
    id: curve.id,
    samples: curve.samples,
    style: curve.style
  });
}

function withUpdater(registry: MathUpdaterRegistry, entry: Omit<MathUpdaterEntry, "sourceContract">) {
  const updaterEntry: MathUpdaterEntry = {
    ...entry,
    sourceContract: UPDATER_REGISTRY_SOURCE_CONTRACT
  };

  registry.entries.push(updaterEntry);
  registry.byObjectId[entry.objectId] = [...(registry.byObjectId[entry.objectId] ?? []), entry.type];
}

function groupUpdaterEntriesByObjectId(entries: MathUpdaterEntry[]) {
  return entries.reduce<Record<string, MathUpdaterEntry[]>>((grouped, entry) => {
    grouped[entry.objectId] = [...(grouped[entry.objectId] ?? []), entry];
    return grouped;
  }, {});
}

function postorderObjectIds(
  familyIndex: ReturnType<typeof buildMobjectFamilyIndex>,
  objectId: string,
  recursionSeen = new Set<string>()
): string[] {
  if (recursionSeen.has(objectId) || !familyIndex.byId[objectId]) return [];

  const nextSeen = new Set(recursionSeen);
  nextSeen.add(objectId);
  const childIds = [...familyIndex.byId[objectId].childIds].sort((left, right) => left.localeCompare(right));

  return [
    ...childIds.flatMap((childId) => postorderObjectIds(familyIndex, childId, nextSeen)),
    objectId
  ];
}

function updaterTraversalObjectIds(state: MathSceneRuntimeState) {
  const familyIndex = buildMobjectFamilyIndex(state.objectGraph);
  const orderedRootIds = [
    ...familyIndex.topLevelIds,
    ...Object.keys(familyIndex.byId).sort((left, right) => left.localeCompare(right))
  ];
  const seen = new Set<string>();
  const objectIds: string[] = [];

  orderedRootIds.forEach((rootId) => {
    postorderObjectIds(familyIndex, rootId).forEach((objectId) => {
      if (seen.has(objectId)) return;
      seen.add(objectId);
      objectIds.push(objectId);
    });
  });

  return objectIds;
}

export function buildMathUpdaterRegistry(
  objects: MathObjectSpec[],
  alwaysRedraw: MathSceneAlwaysRedrawSpec[] = [],
  vectorFieldUpdaters: MathSceneVectorFieldUpdaterSpec[] = [],
  alwaysMethodUpdaters: MathSceneAlwaysMethodUpdaterSpec[] = []
): MathUpdaterRegistry {
  const registry: MathUpdaterRegistry = {
    byObjectId: {},
    entries: [],
    sourceContract: UPDATER_REGISTRY_SOURCE_CONTRACT
  };
  const objectIds = new Set(objects.map((object) => object.id));

  objects.forEach((object) => {
    if (object.type === "parametricCurve") {
      withUpdater(registry, { id: `${object.id}:reveal`, objectId: object.id, type: "reveal-curve" });
    }

    if (object.type === "parametricSurface") {
      withUpdater(registry, { id: `${object.id}:reveal`, objectId: object.id, type: "reveal-surface" });
    }

    if (object.type === "movingPoint") {
      withUpdater(registry, { id: `${object.id}:move`, objectId: object.id, type: "move-along-path" });
    }

    if (object.type === "trace") {
      withUpdater(registry, { id: `${object.id}:trace`, objectId: object.id, type: "trace-recent-path" });
    }
  });

  alwaysRedraw.forEach((entry) => {
    withUpdater(registry, { id: entry.id, objectId: entry.objectId, type: "always-redraw" });
  });

  alwaysMethodUpdaters.forEach((entry) => {
    if (!objectIds.has(entry.objectId)) return;
    withUpdater(registry, { id: entry.id, objectId: entry.objectId, type: "always-method", updaterId: entry.id });
  });

  vectorFieldUpdaters.forEach((entry) => {
    if (!objectIds.has(entry.objectId)) return;
    withUpdater(registry, {
      id: entry.id,
      objectId: entry.objectId,
      type: "move-along-vector-field",
      updaterId: entry.id
    });
  });

  return registry;
}

function finiteVec3(vector: Vec3) {
  return vector.every(Number.isFinite);
}

function finitePoints(points: Vec3[]) {
  return points.filter(finiteVec3);
}

function boundingBox(points: Vec3[]): RuntimeBoundingBox {
  const pointsForBox = finitePoints(points);
  if (pointsForBox.length === 0) return { kind: "empty" };

  const min: Vec3 = [...pointsForBox[0]];
  const max: Vec3 = [...pointsForBox[0]];

  pointsForBox.forEach((point) => {
    min[0] = Math.min(min[0], point[0]);
    min[1] = Math.min(min[1], point[1]);
    min[2] = Math.min(min[2], point[2]);
    max[0] = Math.max(max[0], point[0]);
    max[1] = Math.max(max[1], point[1]);
    max[2] = Math.max(max[2], point[2]);
  });

  return {
    center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    kind: "finite",
    max,
    min
  };
}

function addVec3(left: Vec3, right: Vec3): Vec3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function sameVec3(left: Vec3, right: Vec3) {
  return left.every((value, index) => Math.abs(value - right[index]) <= 1e-9);
}

function appendDistinctPoint(points: Vec3[], point: Vec3) {
  const lastPoint = points.at(-1);
  if (lastPoint && sameVec3(lastPoint, point)) return points;
  return [...points, point];
}

function averagePoints(points: Vec3[]): Vec3 | null {
  const finitePoints = points.filter(finiteVec3);
  if (finitePoints.length === 0) return null;

  const sum = finitePoints.reduce<Vec3>((total, point) => addVec3(total, point), [0, 0, 0]);
  return [sum[0] / finitePoints.length, sum[1] / finitePoints.length, sum[2] / finitePoints.length];
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
  if (renderState.kind === "polyline") return averagePoints(renderState.points);
  if (renderState.kind === "surface") return averagePoints(renderState.points);

  return null;
}

function translateRenderState(renderState: RuntimeRenderState, delta: Vec3): RuntimeRenderState {
  return mapRuntimeRenderState(renderState, (point) => addVec3(point, delta));
}

function scalePointAbout(point: Vec3, center: Vec3, scale: number): Vec3 {
  return [
    center[0] + (point[0] - center[0]) * scale,
    center[1] + (point[1] - center[1]) * scale,
    center[2] + (point[2] - center[2]) * scale
  ];
}

function scaleRenderStateFromCenter(renderState: RuntimeRenderState, scale: number): RuntimeRenderState {
  const center = renderStateAnchor(renderState);
  if (!center) return renderState;

  return mapRuntimeRenderState(renderState, (point) => scalePointAbout(point, center, scale));
}

function objectPoints(object: MathObjectSpec) {
  if (object.type === "parametricCurve") return object.samples;
  if (object.type === "parametricSurface") return object.samples.flat();
  if (object.type === "vector") return [object.from, object.to];
  return [];
}

function conceptIdForSpec(object: MathObjectSpec, fallbackId: string) {
  if ("conceptId" in object && object.conceptId) return object.conceptId;
  if (object.type === "trace") return `${object.sourceObjectId}:trace`;
  return fallbackId;
}

function colorRoleForSpec(object: MathObjectSpec) {
  return "colorRole" in object ? object.colorRole : undefined;
}

function styleForRuntimeObject(object: RuntimeMathObjectNode): VMobjectStyle {
  if (
    (object.renderState.kind === "polyline" ||
      object.renderState.kind === "surface" ||
      object.renderState.kind === "vector") &&
    object.renderState.style
  ) {
    return object.renderState.style;
  }

  const specStyle = "style" in object.spec ? object.spec.style : undefined;

  return buildVMobjectStyle({
    strokeRole: colorRoleForSpec(object.spec) ?? "reference",
    ...specStyle
  });
}

function authoredStyleForRuntimeObject(object: RuntimeMathObjectNode): VMobjectStyle {
  const specStyle = "style" in object.spec ? object.spec.style : undefined;

  return buildVMobjectStyle({
    strokeRole: colorRoleForSpec(object.spec) ?? "reference",
    ...specStyle
  });
}

function renderStateForSpec(object: MathObjectSpec, previousRenderState: RuntimeRenderState): RuntimeRenderState {
  if (object.type === "parametricCurve") {
    const curve = curveObjectForSpec(object);
    return { kind: "polyline", points: object.samples, style: curve.style };
  }

  if (object.type === "vector") {
    return {
      ...previousRenderState,
      kind: "vector",
      from: object.from,
      to: object.to
    };
  }

  return previousRenderState;
}

function withObjectSpec(object: RuntimeMathObjectNode, spec: MathObjectSpec): RuntimeMathObjectNode {
  return {
    ...object,
    boundingBox: boundingBox(objectPoints(spec)),
    colorRole: colorRoleForSpec(spec),
    conceptId: conceptIdForSpec(spec, object.id),
    renderState: renderStateForSpec(spec, object.renderState),
    spec,
    type: spec.type,
    uniforms: spec.uniforms === undefined ? object.uniforms : normalizeMobjectUniforms(spec.uniforms)
  };
}

function pathObjectFromState(state: MathSceneRuntimeState, objectId: string) {
  const runtimeObject = state.objectGraph.byId[objectId];
  if (runtimeObject?.spec.type === "parametricCurve") return runtimeObject.spec;
  return pathObject(state.sourceScene.objects, objectId);
}

function applyAlwaysRedrawUpdater(
  state: MathSceneRuntimeState,
  object: RuntimeMathObjectNode,
  entry: MathUpdaterEntry
): RuntimeMathObjectNode {
  if (entry.type !== "always-redraw") return object;

  const plan = state.sourceScene.alwaysRedraw?.find((candidate) => candidate.id === entry.id && candidate.objectId === object.id);
  if (!plan?.factory) return object;

  return withObjectSpec(object, buildAlwaysRedrawObjectFromFactory(plan, state.trackers, object.spec));
}

function applyVectorFieldUpdater(
  state: MathSceneRuntimeState,
  object: RuntimeMathObjectNode,
  entry: MathUpdaterEntry,
  options: ApplyMathUpdatersOptions
): RuntimeMathObjectNode {
  const updater = state.sourceScene.vectorFieldUpdaters?.find((candidate) => candidate.id === entry.updaterId);
  if (!updater || updater.type !== "moveAlongVectorField") return object;

  const previousObject = options.previousRuntimeState?.sceneId === state.sceneId
    ? options.previousRuntimeState.objectGraph.byId[object.id]
    : undefined;
  const frameObject = options.deltaSeconds === undefined || !previousObject
    ? object
    : { ...object, renderState: previousObject.renderState };
  const anchor = renderStateAnchor(frameObject.renderState);
  if (!anchor) return object;

  const frame = evaluateMoveAlongVectorFieldUpdater({
    deltaSeconds: options.deltaSeconds,
    elapsedSeconds: state.timeline.elapsedSeconds,
    scene: state.sourceScene,
    updater,
    worldAnchor: anchor
  });
  if (frame.status !== "moved") return object;

  return {
    ...frameObject,
    renderState: translateRenderState(frameObject.renderState, frame.worldDelta)
  };
}

function applyAlwaysMethodUpdaterEntry(
  state: MathSceneRuntimeState,
  object: RuntimeMathObjectNode,
  entry: MathUpdaterEntry
): RuntimeMathObjectNode {
  const updater = state.sourceScene.alwaysMethodUpdaters?.find((candidate) => candidate.id === entry.updaterId);
  if (!updater) return object;

  return applyAlwaysMethodUpdater({
    elapsedSeconds: state.timeline.elapsedSeconds,
    graph: state.objectGraph.byId,
    object,
    trackers: state.trackers,
    updater
  });
}

function activeFadeGrowKindForObject(state: MathSceneRuntimeState, objectId: string): CreationPrimitiveKind | null {
  const step = state.timeline.activeStep;
  if (!step) return null;
  if (step.type === "fadeInObject" && step.objectId === objectId) return "fadeIn";
  if (step.type === "fadeOutObject" && step.objectId === objectId) return "fadeOut";
  if (step.type === "growFromCenter" && step.objectId === objectId) return "growFromCenter";
  return null;
}

function applyActiveFadeGrowFrame(state: MathSceneRuntimeState, object: RuntimeMathObjectNode): RuntimeMathObjectNode {
  const kind = activeFadeGrowKindForObject(state, object.id);
  if (!kind) return object;

  const progress = state.trackers.byId[`${object.id}:progress`]?.value ?? state.timeline.easedLocalProgress;
  const frame = buildCreationPrimitiveFrame({
    kind,
    objectId: object.id,
    progress,
    style: styleForRuntimeObject(object)
  });
  const uniforms = normalizeMobjectUniforms(object.uniforms);
  const renderState = frame.scale === 1 ? object.renderState : scaleRenderStateFromCenter(object.renderState, frame.scale);

  return {
    ...object,
    boundingBox: boundingBox(pointsForRuntimeRenderState(renderState)),
    renderState,
    uniforms: {
      ...uniforms,
      opacity: uniforms.opacity * frame.opacity
    }
  };
}

function activeDrawBorderThenFillFrame(state: MathSceneRuntimeState, object: RuntimeMathObjectNode) {
  const step = state.timeline.activeStep;
  if (step?.type !== "revealSurface" || step.objectId !== object.id) return null;

  const style = authoredStyleForRuntimeObject(object);
  if (style.fillOpacity <= 0) return null;

  const progress = state.trackers.byId[`${object.id}:progress`]?.value ?? state.timeline.easedLocalProgress;

  return buildCreationPrimitiveFrame({
    kind: "drawBorderThenFill",
    objectId: object.id,
    progress,
    style
  });
}

function previousTracePoints(
  state: MathSceneRuntimeState,
  object: RuntimeMathObjectNode,
  options: ApplyMathUpdatersOptions
) {
  if (options.previousRuntimeState?.sceneId !== state.sceneId) return [];

  const previousObject = options.previousRuntimeState.objectGraph.byId[object.id];
  if (previousObject?.renderState.kind !== "polyline") return [];

  return previousObject.renderState.points;
}

function updateObject(
  state: MathSceneRuntimeState,
  object: RuntimeMathObjectNode,
  options: ApplyMathUpdatersOptions = {}
) {
  if (object.spec.type === "parametricCurve") {
    const progress = state.trackers.byId[`${object.id}:progress`]?.value ?? 1;
    const curve = curveObjectForSpec(object.spec);
    const partialFrame = pointwiseBecomePartialCurveObject(curve, 0, progress);
    return {
      ...object,
      renderState: {
        kind: "polyline" as const,
        points: partialFrame.curve.samples,
        style: partialFrame.curve.style
      }
    };
  }

  if (object.spec.type === "movingPoint") {
    const curve = pathObjectFromState(state, object.spec.pathObjectId);
    const progress = state.trackers.byId[`${object.id}:progress`]?.value ?? 1;
    const curveObject = curve ? curveObjectForSpec(curve) : null;
    const fallbackPosition: Vec3 = [0, 0, 0];
    return {
      ...object,
      renderState: {
        kind: "point" as const,
        position: curveObject ? pointAtArcProgress(curveObject, progress) : fallbackPosition
      }
    };
  }

  if (object.spec.type === "parametricSurface") {
    const progress = state.trackers.byId[`${object.id}:progress`]?.value ?? 1;
    const surface = buildSurfaceObjectFromGrid({
      colorRole: object.spec.colorRole,
      conceptId: object.spec.conceptId,
      id: object.spec.id,
      samples: object.spec.samples,
      uRange: object.spec.uRange,
      vRange: object.spec.vRange
    });
    const creationFrame = activeDrawBorderThenFillFrame(state, object);
    const wireframe = partialSurfaceWireframe(surface, creationFrame?.drawRange[1] ?? progress);

    return {
      ...object,
      renderState: {
        columns: surface.columns,
        kind: "surface" as const,
        points: wireframe.rows.flat(),
        rows: wireframe.rows.length,
        style: creationFrame?.style ?? (object.renderState.kind === "surface" ? object.renderState.style : undefined),
        wireframeColumns: wireframe.columns,
        wireframeRows: wireframe.rows
      }
    };
  }

  if (object.spec.type === "trace") {
    const traceSpec = object.spec;
    const source = state.sourceScene.objects.find(
      (entry): entry is Extract<MathObjectSpec, { type: "movingPoint" }> => entry.type === "movingPoint" && entry.id === traceSpec.sourceObjectId
    );
    const curve = source ? pathObjectFromState(state, source.pathObjectId) : null;
    const progress = source ? state.trackers.byId[`${source.id}:progress`]?.value ?? 1 : 1;
    const curveObject = curve ? curveObjectForSpec(curve) : null;
    const currentPoint = curveObject ? pointAtArcProgress(curveObject, progress) : null;
    const previousPoints = previousTracePoints(state, object, options);
    const startProgress = Math.max(0, progress - 0.18);
    const tracePoints = previousPoints.length > 0
      ? currentPoint
        ? appendDistinctPoint(previousPoints, currentPoint)
        : previousPoints
      : curveObject
        ? pointwiseBecomePartialCurveObject(curveObject, startProgress, progress).curve.samples
        : [];
    const tail = buildTracingTailFromPoints({
      durationSeconds: traceSpec.durationSeconds,
      id: traceSpec.id,
      maxSampleCount: 32,
      nowSeconds: state.timeline.elapsedSeconds,
      points: tracePoints
    });

    return {
      ...object,
      renderState: {
        kind: "polyline" as const,
        points: tail.points,
        style: object.renderState.kind === "polyline" ? object.renderState.style : undefined
      }
    };
  }

  return object;
}

function objectProgressUpdaterTypes(entry: MathUpdaterEntry) {
  return (
    entry.type === "move-along-path" ||
    entry.type === "reveal-curve" ||
    entry.type === "reveal-surface" ||
    entry.type === "trace-recent-path"
  );
}

function stateWithObjectGraphById(
  state: MathSceneRuntimeState,
  byId: Record<string, RuntimeMathObjectNode>
): MathSceneRuntimeState {
  return {
    ...state,
    objectGraph: {
      ...state.objectGraph,
      byId
    }
  };
}

function applyActiveObjectUpdaterEntry(
  state: MathSceneRuntimeState,
  object: RuntimeMathObjectNode,
  entry: MathUpdaterEntry,
  options: ApplyMathUpdatersOptions
): RuntimeMathObjectNode {
  if (objectProgressUpdaterTypes(entry)) return applyActiveFadeGrowFrame(state, updateObject(state, object, options));
  if (entry.type === "always-method") return applyAlwaysMethodUpdaterEntry(state, object, entry);
  if (entry.type === "move-along-vector-field") return applyVectorFieldUpdater(state, object, entry, options);
  return object;
}

export function applyMathUpdaters(
  stateScene: MathSceneRuntimeState["sourceScene"],
  state: MathSceneRuntimeState,
  options: ApplyMathUpdatersOptions = {}
): MathSceneRuntimeState {
  const suspensionPlan = buildUpdaterSuspensionPlan({
    familyIndex: buildMobjectFamilyIndex(state.objectGraph),
    scene: stateScene,
    timeline: state.timeline,
    updaters: state.updaters
  });
  const activeUpdaterIds = new Set(suspensionPlan.activeUpdaterIds);
  const entriesByObjectId = groupUpdaterEntriesByObjectId(state.updaters.entries);
  const alwaysRedrawTraversalIds = updaterTraversalObjectIds(state);
  const alwaysRedrawnById = Object.fromEntries(
    alwaysRedrawTraversalIds.map((objectId) => {
      const object = state.objectGraph.byId[objectId];
      const updaterEntries = entriesByObjectId[object.id] ?? [];
      const activeEntries = updaterEntries.filter((entry) => activeUpdaterIds.has(entry.id));
      const alwaysRedrawn = activeEntries
        .filter((entry) => entry.type === "always-redraw")
        .reduce((nextObject, entry) => applyAlwaysRedrawUpdater(state, nextObject, entry), object);

      return [alwaysRedrawn.id, alwaysRedrawn];
    })
  );
  const stateWithAlwaysRedraw = {
    ...state,
    objectGraph: {
      ...state.objectGraph,
      byId: alwaysRedrawnById
    }
  };
  const objectUpdaterTraversalIds = updaterTraversalObjectIds(stateWithAlwaysRedraw);
  const byId = { ...stateWithAlwaysRedraw.objectGraph.byId };

  objectUpdaterTraversalIds.forEach((objectId) => {
    const object = byId[objectId];
    if (!object) return;

    const updaterEntries = entriesByObjectId[object.id] ?? [];
    const activeEntries = updaterEntries.filter((entry) => activeUpdaterIds.has(entry.id));
    const shouldUpdate = updaterEntries.length === 0 || activeEntries.length > 0;
    let updated = object;

    if (activeEntries.length > 0) {
      activeEntries
        .filter((entry) => entry.type !== "always-redraw")
        .forEach((entry) => {
          const stateForEntry = stateWithObjectGraphById(stateWithAlwaysRedraw, {
            ...byId,
            [updated.id]: updated
          });

          updated = applyActiveObjectUpdaterEntry(stateForEntry, updated, entry, options);
          byId[updated.id] = updated;
        });
    } else if (shouldUpdate) {
      const stateForObject = stateWithObjectGraphById(stateWithAlwaysRedraw, byId);
      updated = applyActiveFadeGrowFrame(stateForObject, updateObject(stateForObject, object, options));
      byId[updated.id] = updated;
    }
  });
  const stateWithObjectUpdaters = {
    ...stateWithAlwaysRedraw,
    objectGraph: {
      ...stateWithAlwaysRedraw.objectGraph,
      byId
    }
  };

  const stateAfterUpdaters = rebuildMathSceneRuntimeGraphState({
    ...state,
    objectGraph: {
      ...state.objectGraph,
      byId: stateWithObjectUpdaters.objectGraph.byId
    },
    sourceScene: stateScene
  });

  return applyMathAnimatePlans(stateAfterUpdaters, options.animationPlans);
}
