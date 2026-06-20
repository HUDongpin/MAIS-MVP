import { buildCameraDirectorState, type CameraDirectorState } from "./mathCameraDirector";
import { buildTimelineState, timelineObjectProgress } from "./mathTimeline";
import { buildMathUpdaterRegistry, type MathUpdaterRegistry } from "./mathUpdaterRegistry";
import type { MathObjectSpec, MathSceneSpec, TimelineState, Vec3 } from "./mathSceneTypes";

export type RuntimeBoundingBox =
  | { kind: "empty" }
  | { kind: "finite"; center: Vec3; max: Vec3; min: Vec3 };

export type RuntimeRenderState =
  | { kind: "axes" }
  | { kind: "empty" }
  | { kind: "point"; position: Vec3 }
  | { kind: "polyline"; points: Vec3[] }
  | { kind: "vector"; from: Vec3; to: Vec3 };

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
};

export type MathObjectGraph = {
  byId: Record<string, RuntimeMathObjectNode>;
  rootIds: string[];
};

export type MathTracker = {
  id: string;
  max?: number;
  min?: number;
  source: "object" | "scene" | "timeline";
  value: number;
};

export type MathTrackerRegistry = {
  byId: Record<string, MathTracker>;
};

export type MathSceneRuntimeState = {
  cameraDirector: CameraDirectorState;
  diagnostics: {
    mathObjectCount: number;
    trackerCount: number;
    updaterCount: number;
  };
  objectGraph: MathObjectGraph;
  sceneId: string;
  sourceScene: MathSceneSpec;
  timeline: TimelineState;
  trackers: MathTrackerRegistry;
  updaters: MathUpdaterRegistry;
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

function objectPoints(object: MathObjectSpec) {
  if (object.type === "parametricCurve") return object.samples;
  if (object.type === "vector") return [object.from, object.to];
  return [];
}

function initialRenderState(object: MathObjectSpec): RuntimeRenderState {
  if (object.type === "axis3d") return { kind: "axes" };
  if (object.type === "parametricCurve") return { kind: "polyline", points: object.samples };
  if (object.type === "movingPoint") return { kind: "point", position: [0, 0, 0] };
  if (object.type === "trace") return { kind: "polyline", points: [] };
  if (object.type === "vector") return { kind: "vector", from: object.from, to: object.to };
  return { kind: "empty" };
}

function buildObjectGraph(scene: MathSceneSpec): MathObjectGraph {
  const byId = Object.fromEntries(
    scene.objects.map((object) => {
      const parentId = parentIdForObject(object);
      const node: RuntimeMathObjectNode = {
        boundingBox: boundingBox(objectPoints(object)),
        childIds: [],
        colorRole: colorRoleForObject(object),
        conceptId: conceptIdForObject(object),
        id: object.id,
        parentId,
        renderState: initialRenderState(object),
        spec: object,
        type: object.type
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
    rootIds: scene.objects.map((object) => object.id)
  };
}

function buildTrackers(scene: MathSceneSpec, elapsedSeconds: number): MathTrackerRegistry {
  const timeline = buildTimelineState(scene.timeline, elapsedSeconds);
  const entries: MathTracker[] = [
    {
      id: "timeline",
      max: timeline.totalDuration,
      min: 0,
      source: "timeline",
      value: timeline.elapsedSeconds
    },
    {
      id: "timeline:progress",
      max: 1,
      min: 0,
      source: "timeline",
      value: timeline.progress
    }
  ];

  scene.objects.forEach((object) => {
    if (object.type !== "parametricCurve" && object.type !== "movingPoint") return;
    entries.push({
      id: `${object.id}:progress`,
      max: 1,
      min: 0,
      source: "object",
      value: timelineObjectProgress(scene.timeline, elapsedSeconds, object.id)
    });
  });

  return {
    byId: Object.fromEntries(entries.map((tracker) => [tracker.id, tracker]))
  };
}

export function buildMathSceneRuntimeState(scene: MathSceneSpec, elapsedSeconds: number): MathSceneRuntimeState {
  const trackers = buildTrackers(scene, elapsedSeconds);
  const updaters = buildMathUpdaterRegistry(scene.objects);

  return {
    cameraDirector: buildCameraDirectorState(scene, elapsedSeconds),
    diagnostics: {
      mathObjectCount: scene.objects.length,
      trackerCount: Object.keys(trackers.byId).length,
      updaterCount: updaters.entries.length
    },
    objectGraph: buildObjectGraph(scene),
    sceneId: scene.sceneId,
    sourceScene: scene,
    timeline: buildTimelineState(scene.timeline, elapsedSeconds),
    trackers,
    updaters
  };
}
