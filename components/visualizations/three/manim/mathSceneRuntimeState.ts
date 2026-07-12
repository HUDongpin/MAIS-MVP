import { buildCameraDirectorState, type CameraDirectorState } from "./mathCameraDirector";
import { buildAlwaysRedrawObjectFromFactory } from "./mathAlwaysRedraw";
import { normalizeMobjectUniforms, type RuntimeMobjectUniforms } from "./mathMobjectUniforms";
import { buildCurveObject } from "./mathCurveObject";
import { createCoordinateSystem3D } from "./mathCoordinateSystem3D";
import { type MathSceneRenderBatchPlan } from "./mathSceneRenderBatches";
import { expandSceneOdeTrajectoryObjects } from "./mathOdeTrajectoryObjects";
import { pointsForRuntimeRenderState } from "./mathRuntimeRenderState";
import { buildMathSceneRuntimeGraphFrame } from "./mathSceneRuntimeGraph";
import { buildSurfaceObjectFromGrid, surfaceWireframeCurves } from "./mathSurfaceObject";
import { expandSceneStreamLineObjects } from "./mathStreamLineObjects";
import { expandSceneVectorFieldObjects } from "./mathVectorFieldObjects";
import { buildTimelineState } from "./mathTimeline";
import { buildMathUpdaterRegistry, type MathUpdaterRegistry } from "./mathUpdaterRegistry";
import { buildSceneUpdatePolicy, type MathSceneUpdatePolicy } from "./mathSceneUpdatePolicy";
import { buildSceneValueTrackers, type MathTrackerRegistry, type MathValueTracker } from "./mathValueTracker";
import { buildVMobjectStyle, type VMobjectStyle } from "./mathVMobjectStyle";
import type {
  MathSceneGraphStore,
  MathSceneGraphSummary,
  MathSceneMembershipState,
  MathSceneRenderGroups
} from "./mathSceneGraph";
import type { CoordinateSpaceSpec, MathObjectSpec, MathSceneSpec, TimelineState, Vec3 } from "./mathSceneTypes";

export type RuntimeBoundingBox =
  | { kind: "empty" }
  | { kind: "finite"; center: Vec3; max: Vec3; min: Vec3 };

export type RuntimeRenderState =
  | { kind: "axes"; xAxisPoints: Vec3[]; yAxisPoints: Vec3[]; zAxisPoints: Vec3[] }
  | { kind: "empty" }
  | { kind: "point"; position: Vec3 }
  | { kind: "polyline"; points: Vec3[]; style?: VMobjectStyle }
  | { kind: "surface"; columns: number; points: Vec3[]; rows: number; style?: VMobjectStyle; wireframeColumns: Vec3[][]; wireframeRows: Vec3[][] }
  | { kind: "vector"; from: Vec3; style?: VMobjectStyle; to: Vec3 };

export type RuntimeMathObjectNode = {
  boundingBox: RuntimeBoundingBox;
  childIds: string[];
  colorRole?: string;
  conceptId: string;
  id: string;
  parentId?: string;
  renderState: RuntimeRenderState;
  spec: MathObjectSpec;
  type: MathObjectSpec["type"];
  uniforms?: RuntimeMobjectUniforms;
};

export type MathObjectGraph = {
  byId: Record<string, RuntimeMathObjectNode>;
  rootIds: string[];
};

export type MathTracker = MathValueTracker;

export type MathSceneGraphState = MathSceneGraphStore & {
  membership: MathSceneMembershipState;
  renderBatches: MathSceneRenderBatchPlan;
  renderGroups: MathSceneRenderGroups;
  summary: MathSceneGraphSummary;
};

export type MathSceneRuntimeState = {
  cameraDirector: CameraDirectorState;
  diagnostics: {
    mathObjectCount: number;
    trackerCount: number;
    updaterCount: number;
  };
  objectGraph: MathObjectGraph;
  sceneGraph: MathSceneGraphState;
  sceneId: string;
  sourceScene: MathSceneSpec;
  timeline: TimelineState;
  trackers: MathTrackerRegistry;
  updatePolicy: MathSceneUpdatePolicy;
  updaters: MathUpdaterRegistry;
};

export type MathSceneRuntimeStateOptions = {
  alwaysUpdateMobjects?: boolean;
  forceDraw?: boolean;
  reducedMotion?: boolean;
  skipAnimations?: boolean;
};

function finiteVec3(points: Vec3[]) {
  return points.filter((point) => point.every(Number.isFinite));
}

function boundingBox(points: Vec3[]): RuntimeBoundingBox {
  const finitePoints = finiteVec3(points);
  if (finitePoints.length === 0) return { kind: "empty" };

  const min: Vec3 = [...finitePoints[0]];
  const max: Vec3 = [...finitePoints[0]];

  finitePoints.forEach((point) => {
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

function conceptIdForObject(object: MathObjectSpec) {
  if ("conceptId" in object && object.conceptId) return object.conceptId;
  if (object.type === "trace") return `${object.sourceObjectId}:trace`;
  return object.id;
}

function colorRoleForObject(object: MathObjectSpec) {
  return "colorRole" in object ? object.colorRole : undefined;
}

function parentIdForObject(object: MathObjectSpec) {
  if (object.type === "movingPoint") return object.pathObjectId;
  if (object.type === "trace") return object.sourceObjectId;
  return undefined;
}

function axisRenderState(
  object: Extract<MathObjectSpec, { type: "axis3d" }>,
  coordinateSpace: CoordinateSpaceSpec
): RuntimeRenderState {
  const coordinateSystem = createCoordinateSystem3D(coordinateSpace);

  return {
    kind: "axes",
    xAxisPoints: [
      coordinateSystem.c2p(object.range.x[0], 0, 0),
      coordinateSystem.c2p(object.range.x[1], 0, 0)
    ],
    yAxisPoints: [
      coordinateSystem.c2p(0, object.range.y[0], 0),
      coordinateSystem.c2p(0, object.range.y[1], 0)
    ],
    zAxisPoints: [
      coordinateSystem.c2p(0, 0, object.range.z[0]),
      coordinateSystem.c2p(0, 0, object.range.z[1])
    ]
  };
}

function objectPoints(object: MathObjectSpec, renderState: RuntimeRenderState) {
  if (object.type === "axis3d") return pointsForRuntimeRenderState(renderState);
  if (object.type === "parametricCurve") return object.samples;
  if (object.type === "parametricSurface") return object.samples.flat();
  if (object.type === "vector") return [object.from, object.to];
  return [];
}

function surfaceRenderState(object: Extract<MathObjectSpec, { type: "parametricSurface" }>): RuntimeRenderState {
  const surface = buildSurfaceObjectFromGrid({
    colorRole: object.colorRole,
    conceptId: object.conceptId,
    id: object.id,
    samples: object.samples,
    uRange: object.uRange,
    vRange: object.vRange
  });
  const wireframe = surfaceWireframeCurves(surface);

  return {
    columns: surface.columns,
    kind: "surface",
    points: surface.samples.map((sample) => sample.point),
    rows: surface.rows,
    style: buildVMobjectStyle({
      strokeOpacity: 0.7,
      strokeRole: object.colorRole,
      strokeWidth: 2,
      ...object.style
    }),
    wireframeColumns: wireframe.columns,
    wireframeRows: wireframe.rows
  };
}

function initialRenderState(object: MathObjectSpec, coordinateSpace: CoordinateSpaceSpec): RuntimeRenderState {
  if (object.type === "axis3d") return axisRenderState(object, coordinateSpace);
  if (object.type === "parametricCurve") {
    const curve = buildCurveObject({
      colorRole: object.colorRole,
      conceptId: object.conceptId,
      id: object.id,
      samples: object.samples,
      style: object.style
    });

    return { kind: "polyline", points: object.samples, style: curve.style };
  }
  if (object.type === "parametricSurface") return surfaceRenderState(object);
  if (object.type === "movingPoint") return { kind: "point", position: [0, 0, 0] };
  if (object.type === "trace") {
    return {
      kind: "polyline",
      points: [],
      style: buildVMobjectStyle({
        strokeOpacity: 0.55,
        strokeRole: object.colorRole,
        strokeWidth: 3,
        ...object.style
      })
    };
  }
  if (object.type === "vector") {
    return {
      kind: "vector",
      from: object.from,
      style: buildVMobjectStyle({
        strokeOpacity: 1,
        strokeRole: object.colorRole,
        strokeWidth: 5,
        ...object.style
      }),
      to: object.to
    };
  }
  return { kind: "empty" };
}

function buildObjectGraph(scene: MathSceneSpec): MathObjectGraph {
  const byId = Object.fromEntries(
    scene.objects.map((object) => {
      const parentId = parentIdForObject(object);
      const renderState = initialRenderState(object, scene.coordinateSpace);
      const node: RuntimeMathObjectNode = {
        boundingBox: boundingBox(objectPoints(object, renderState)),
        childIds: [],
        colorRole: colorRoleForObject(object),
        conceptId: conceptIdForObject(object),
        id: object.id,
        parentId,
        renderState,
        spec: object,
        type: object.type,
        uniforms: normalizeMobjectUniforms(object.uniforms)
      };

      return [node.id, node];
    })
  );

  Object.values(byId).forEach((node) => {
    if (!node.parentId || !byId[node.parentId]) return;
    byId[node.parentId].childIds.push(node.id);
  });

  return {
    byId,
    rootIds: scene.objects
      .map((object) => object.id)
      .filter((objectId) => {
        const parentId = byId[objectId]?.parentId;
        return !parentId || !byId[parentId];
      })
  };
}

function applySceneAlwaysRedrawObjects(scene: MathSceneSpec, trackers: MathTrackerRegistry): MathSceneSpec {
  if (!scene.alwaysRedraw?.length) return scene;

  return {
    ...scene,
    objects: scene.objects.map((object) =>
      scene.alwaysRedraw
        ?.filter((plan) => plan.objectId === object.id)
        .reduce((redrawnObject, plan) => buildAlwaysRedrawObjectFromFactory(plan, trackers, redrawnObject), object) ?? object
    )
  };
}

export function buildMathSceneRuntimeState(
  scene: MathSceneSpec,
  elapsedSeconds: number,
  options: MathSceneRuntimeStateOptions = {}
): MathSceneRuntimeState {
  const reducedMotion = options.reducedMotion ?? false;
  const effectiveElapsedSeconds = reducedMotion
    ? buildTimelineState(scene.timeline, elapsedSeconds, options).elapsedSeconds
    : elapsedSeconds;
  const runtimeScene = expandSceneStreamLineObjects(expandSceneVectorFieldObjects(expandSceneOdeTrajectoryObjects(scene)), {
    elapsedSeconds: effectiveElapsedSeconds
  });
  const runtimeTimeline = buildTimelineState(runtimeScene.timeline, effectiveElapsedSeconds, options);
  const trackers = buildSceneValueTrackers(runtimeScene, effectiveElapsedSeconds, options);
  const resolvedRuntimeScene = applySceneAlwaysRedrawObjects(runtimeScene, trackers);
  const updaters = buildMathUpdaterRegistry(
    resolvedRuntimeScene.objects,
    resolvedRuntimeScene.alwaysRedraw,
    resolvedRuntimeScene.vectorFieldUpdaters,
    resolvedRuntimeScene.alwaysMethodUpdaters
  );
  const updatePolicy = buildSceneUpdatePolicy({
    alwaysUpdateMobjects: options.alwaysUpdateMobjects,
    forceDraw: options.forceDraw,
    skipAnimations: options.skipAnimations,
    updaterRegistry: updaters
  });
  const objectGraph = buildObjectGraph(resolvedRuntimeScene);
  const runtimeGraphFrame = buildMathSceneRuntimeGraphFrame({
    objectGraph,
    scene: resolvedRuntimeScene,
    timeline: runtimeTimeline
  });

  return {
    cameraDirector: buildCameraDirectorState(runtimeScene, effectiveElapsedSeconds),
    diagnostics: {
      mathObjectCount: resolvedRuntimeScene.objects.length,
      trackerCount: Object.keys(trackers.byId).length,
      updaterCount: updaters.entries.length
    },
    objectGraph: runtimeGraphFrame.objectGraph,
    sceneGraph: runtimeGraphFrame.sceneGraph,
    sceneId: runtimeScene.sceneId,
    sourceScene: resolvedRuntimeScene,
    timeline: runtimeTimeline,
    trackers,
    updatePolicy,
    updaters
  };
}
