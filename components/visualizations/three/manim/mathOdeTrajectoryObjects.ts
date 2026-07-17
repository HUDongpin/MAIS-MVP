import { mapMathPointToWorld } from "./mathCoordinateSpace";
import { buildSceneOdeTrajectories } from "./mathOdeTrajectory";
import type { MathObjectSpec, MathSceneOdeTrajectorySpec, MathSceneSpec, Vec3 } from "./mathSceneTypes";

export const ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT =
  "ode_solution_points->ParametricCurve|moving state marker|TracingTail runtime MathObjects";

export type OdeTrajectoryRuntimeObjectIds = {
  currentStateId: string;
  pathId: string;
  traceId: string;
};

export type OdeTrajectoryObjectBridgeEvidence = {
  currentStateObjectCount: number;
  objectCount: number;
  objectIds: string;
  pathObjectCount: number;
  sourceContract: typeof ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT;
  summary: string;
  traceObjectCount: number;
  version: "mais-manim-ode-trajectory-object-bridge/v1";
};

export type OdeTrajectoryObjectBridgePayload = OdeTrajectoryObjectBridgeEvidence & {
  objects: MathObjectSpec[];
};

export function odeTrajectoryRuntimeObjectIds(trajectoryId: string): OdeTrajectoryRuntimeObjectIds {
  return {
    currentStateId: `${trajectoryId}:current-state`,
    pathId: `${trajectoryId}:trajectory-path`,
    traceId: `${trajectoryId}:trace-tail`
  };
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

export function odeTrajectoryObjectBridgeDataAttributes(
  sourceContract: string = ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT
): Record<"data-viz-manim-ode-object-source-contract", string> {
  return {
    "data-viz-manim-ode-object-source-contract": sourceContract
  };
}

function pointsFromSamples(
  samples: { point: Vec3 }[],
  scene: MathSceneSpec,
  spec: MathSceneOdeTrajectorySpec | undefined
) {
  const points = samples.map((sample) => sample.point);
  if (spec?.coordinateMode !== "math") return points;

  return points.map((point) => mapMathPointToWorld(point, scene.coordinateSpace));
}

export function buildOdeTrajectoryObjectSpecs(scene: MathSceneSpec): MathObjectSpec[] {
  const authoredIds = new Set(scene.objects.map((object) => object.id));
  const trajectories = buildSceneOdeTrajectories(scene);

  return trajectories.flatMap((trajectory): MathObjectSpec[] => {
    const ids = odeTrajectoryRuntimeObjectIds(trajectory.id);
    const trajectorySpec = scene.odeTrajectories?.find((entry) => entry.id === trajectory.id);

    if ([ids.pathId, ids.currentStateId, ids.traceId].some((id) => authoredIds.has(id))) {
      return [];
    }

    return [
      {
        type: "parametricCurve",
        colorRole: trajectorySpec?.colorRole ?? "function",
        conceptId: trajectory.conceptId,
        id: ids.pathId,
        samples: pointsFromSamples(trajectory.samples, scene, trajectorySpec),
        style: {
          strokeOpacity: 0.45,
          strokeRole: trajectorySpec?.colorRole ?? "function",
          strokeWidth: 3.5
        }
      },
      {
        type: "movingPoint",
        colorRole: "probe",
        conceptId: trajectory.conceptId,
        id: ids.currentStateId,
        pathObjectId: ids.pathId
      },
      {
        type: "trace",
        colorRole: "trace",
        durationSeconds: trajectorySpec?.tailDurationSeconds ?? 0.8,
        id: ids.traceId,
        sourceObjectId: ids.currentStateId,
        style: {
          strokeOpacity: 0.55,
          strokeRole: "trace",
          strokeWidth: 3
        }
      }
    ];
  });
}

export function buildOdeTrajectoryObjectBridgeEvidence(
  objects: MathObjectSpec[]
): OdeTrajectoryObjectBridgeEvidence {
  const objectIds = objects.map((object) => object.id).join(",") || "none";
  const pathObjectCount = objects.filter((object) => object.type === "parametricCurve").length;
  const currentStateObjectCount = objects.filter((object) => object.type === "movingPoint").length;
  const traceObjectCount = objects.filter((object) => object.type === "trace").length;

  return {
    currentStateObjectCount,
    objectCount: objects.length,
    objectIds,
    pathObjectCount,
    sourceContract: ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT,
    summary:
      `odeObjectBridge:objects=${objects.length};paths=${pathObjectCount};markers=${currentStateObjectCount};` +
      `traces=${traceObjectCount};ids=${objectIds}`,
    traceObjectCount,
    version: "mais-manim-ode-trajectory-object-bridge/v1"
  };
}

export function buildOdeTrajectoryObjectBridgeEvidenceForScene(scene: MathSceneSpec) {
  return buildOdeTrajectoryObjectBridgeEvidence(buildOdeTrajectoryObjectSpecs(scene));
}

export function serializeOdeTrajectoryObjectBridgePayload(objects: MathObjectSpec[]) {
  const evidence = buildOdeTrajectoryObjectBridgeEvidence(objects);

  return stableSerialize({
    ...evidence,
    objects
  } satisfies OdeTrajectoryObjectBridgePayload);
}

export function expandSceneOdeTrajectoryObjects(scene: MathSceneSpec): MathSceneSpec {
  const generatedObjects = buildOdeTrajectoryObjectSpecs(scene);
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
